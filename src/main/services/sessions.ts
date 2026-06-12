import { app, dialog, shell } from 'electron';
import { join } from 'path';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'fs';
import type { SessionEvent, SessionMeta } from '../../shared/types';
import { settings } from './settings';
import { sessionToMarkdown } from './session-export';

// One JSONL file per app run, created lazily on the first recorded event so
// silent launches don't litter the sessions folder. Local-only, plain text —
// the user can read, grep, or delete everything.

let currentFile: string | null = null;

export function sessionsDir(): string {
  const dir = join(app.getPath('userData'), 'sessions');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export function recordEvent(ev: SessionEvent): void {
  if (!settings().get().sessions.autoSave) return;
  try {
    if (!currentFile) {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      currentFile = join(sessionsDir(), `${stamp}.jsonl`);
      appendFileSync(
        currentFile,
        JSON.stringify({ t: Date.now(), type: 'start', version: app.getVersion() }) + '\n',
      );
    }
    appendFileSync(currentFile, JSON.stringify(ev) + '\n');
  } catch (err) {
    console.error('[sessions] record failed:', err);
  }
}

export function readSession(id: string): SessionEvent[] {
  const path = join(sessionsDir(), `${id}.jsonl`);
  const events: SessionEvent[] = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line) as SessionEvent);
    } catch {
      /* skip torn line (e.g. crash mid-write) */
    }
  }
  return events;
}

export function listSessions(): SessionMeta[] {
  const metas: SessionMeta[] = [];
  for (const file of readdirSync(sessionsDir())) {
    if (!file.endsWith('.jsonl')) continue;
    const id = file.replace(/\.jsonl$/, '');
    try {
      const events = readSession(id);
      if (events.length === 0) continue;
      metas.push({
        id,
        startedAt: events[0].t,
        endedAt: events[events.length - 1].t,
        finals: events.filter((e) => e.type === 'final').length,
        answers: events.filter((e) => e.type === 'answer').length,
      });
    } catch (err) {
      console.error('[sessions] cannot read', file, err);
    }
  }
  return metas.sort((a, b) => b.startedAt - a.startedAt);
}

export async function exportSession(id: string): Promise<{ ok: boolean; path?: string }> {
  const md = sessionToMarkdown(readSession(id));
  const res = await dialog.showSaveDialog({
    title: 'Export session as Markdown',
    defaultPath: join(app.getPath('documents'), `unseen-session-${id}.md`),
    filters: [{ name: 'Markdown', extensions: ['md'] }],
  });
  if (res.canceled || !res.filePath) return { ok: false };
  writeFileSync(res.filePath, md);
  return { ok: true, path: res.filePath };
}

export function deleteSession(id: string): void {
  const path = join(sessionsDir(), `${id}.jsonl`);
  if (existsSync(path)) rmSync(path);
  if (currentFile === path) currentFile = null;
}

export function openSessionsFolder(): void {
  void shell.openPath(sessionsDir());
}
