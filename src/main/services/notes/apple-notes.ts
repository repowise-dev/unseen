import { execFile } from 'child_process';
import { promisify } from 'util';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readdirSync, statSync } from 'fs';

const run = promisify(execFile);

// Apple Notes ingestion — the two STABLE, update-resilient surfaces only
// (decision #6). We NEVER decode the gzipped protobuf (the brittle part).
//
//  1. Typed text + metadata → the official Notes scripting API, driven via JXA
//     (osascript -l JavaScript). Enumerate notes modified since the last run.
//  2. Handwriting → Apple's OWN pre-rendered drawing PNGs in the Notes group
//     container's Media/ folders. We scan for PNGs touched since the last run
//     and OCR them; we deliberately don't try to attribute each PNG back to a
//     specific note (that requires the protobuf), so handwriting lands in the
//     default namespace.
//
// macOS-only; callers guard on process.platform.

export interface AppleNote {
  id: string;
  title: string;
  folder: string;
  body: string;
  /** epoch ms */
  modified: number;
}

/** Notes group container root (where Apple keeps the SQLite store + Media). */
function notesContainer(): string {
  return join(homedir(), 'Library', 'Group Containers', 'group.com.apple.notes');
}

/**
 * Enumerate notes modified since `sinceMs` via JXA. Returns title, folder,
 * plaintext body and modification time. Throws if osascript fails (caller maps
 * that to a health anomaly).
 */
export async function enumerateNotes(sinceMs: number): Promise<AppleNote[]> {
  if (process.platform !== 'darwin') return [];
  // JXA: walk every note, keep those modified after `since`. plaintext() is the
  // documented, stable accessor — no protobuf, no rendering assumptions.
  const jxa = `
    function run(argv) {
      const since = parseInt(argv[0], 10);
      const Notes = Application('Notes');
      const out = [];
      const notes = Notes.notes();
      for (let i = 0; i < notes.length; i++) {
        const n = notes[i];
        let m;
        try { m = n.modificationDate().getTime(); } catch (e) { m = 0; }
        if (m <= since) continue;
        let folder = '';
        try { folder = n.container().name(); } catch (e) {}
        let body = '';
        try { body = n.plaintext(); } catch (e) {}
        let title = '';
        try { title = n.name(); } catch (e) {}
        let id = '';
        try { id = n.id(); } catch (e) {}
        out.push({ id: id, title: title, folder: folder, body: body, modified: m });
      }
      return JSON.stringify(out);
    }`;
  const { stdout } = await run('osascript', ['-l', 'JavaScript', '-e', jxa, String(sinceMs)], {
    maxBuffer: 64 * 1024 * 1024,
  });
  const parsed = JSON.parse(stdout || '[]') as AppleNote[];
  return parsed;
}

/** True if at least one note exists at all (used to detect "returned 0 but notes exist"). */
export async function notesAccountHasAny(): Promise<boolean> {
  if (process.platform !== 'darwin') return false;
  try {
    const { stdout } = await run('osascript', [
      '-l',
      'JavaScript',
      '-e',
      `function run(){ return String(Application('Notes').notes().length > 0); }`,
    ]);
    return stdout.trim() === 'true';
  } catch {
    return false;
  }
}

/** Locate Apple's pre-rendered Media/ directories (handwriting PNGs live here). */
export function findMediaDirs(): string[] {
  const root = notesContainer();
  const out: string[] = [];
  const search = (dir: string, depth: number): void => {
    if (depth > 4 || !existsSync(dir)) return;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(dir, e);
      let isDir: boolean;
      try {
        isDir = statSync(p).isDirectory();
      } catch {
        continue;
      }
      if (!isDir) continue;
      if (e === 'Media') out.push(p);
      else search(p, depth + 1);
    }
  };
  search(root, 0);
  return out;
}

/** PNGs under any Media/ dir modified since `sinceMs` (handwriting renders). */
export function handwritingPngs(sinceMs: number): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(dir, e);
      let st;
      try {
        st = statSync(p);
      } catch {
        continue;
      }
      if (st.isDirectory()) walk(p);
      else if (/\.png$/i.test(e) && st.mtimeMs > sinceMs) out.push(p);
    }
  };
  for (const media of findMediaDirs()) walk(media);
  return out;
}

/** Does the Notes container (and its Media surface) still look as expected? */
export function mediaSurfaceExists(): boolean {
  return existsSync(notesContainer());
}
