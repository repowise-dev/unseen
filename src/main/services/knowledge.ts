import { app, dialog } from 'electron';
import { isAbsolute, join, basename } from 'path';
import { readFileSync, readdirSync, statSync, existsSync, mkdirSync, copyFileSync } from 'fs';
import type { Namespace, Profile, WatchedSource } from '../../shared/types';
import { KNOWLEDGE_FILE_MAX_BYTES } from '../../shared/constants';
import { factsDir } from './paths';
import { renderFactsBlock, type Fact } from './memory/core';
import { settings } from './settings';

export interface KnowledgeFile {
  name: string;
  text: string;
}

/** Default location for user knowledge files referenced by relative path. */
export function knowledgeDir(): string {
  const dir = join(app.getPath('userData'), 'knowledge');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

/** Native file picker → copy the chosen docs into the knowledge dir, return
 *  the stored names (what a profile's knowledge.files entries should hold). */
export async function importKnowledgeFiles(): Promise<string[]> {
  const res = await dialog.showOpenDialog({
    title: 'Attach knowledge files',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Text / Markdown', extensions: ['md', 'markdown', 'txt'] }],
  });
  if (res.canceled) return [];
  const names: string[] = [];
  for (const src of res.filePaths) {
    const name = basename(src);
    try {
      copyFileSync(src, join(knowledgeDir(), name));
      names.push(name);
    } catch (err) {
      console.error('[knowledge] import failed for', src, err);
    }
  }
  return names;
}

/**
 * Load distilled memory facts for the given namespaces as knowledge blocks —
 * one block per namespace, the accumulating fact set across all days, deduped
 * by stable id (latest lastSeen wins). This is how the "graph" feeds prompts.
 */
export function loadMemoryFacts(namespaces: Namespace[]): KnowledgeFile[] {
  const out: KnowledgeFile[] = [];
  for (const ns of namespaces) {
    const dir = factsDir(ns);
    let files: string[];
    try {
      files = readdirSync(dir)
        .filter((f) => f.endsWith('.json'))
        .sort();
    } catch {
      continue;
    }
    const byId = new Map<string, Fact>();
    for (const file of files) {
      try {
        const parsed = JSON.parse(readFileSync(join(dir, file), 'utf8'));
        if (!Array.isArray(parsed)) continue;
        for (const f of parsed as Fact[]) {
          const prev = byId.get(f.id);
          if (!prev || f.lastSeen > prev.lastSeen) byId.set(f.id, f);
        }
      } catch {
        /* skip malformed facts file */
      }
    }
    if (byId.size === 0) continue;
    const text = renderFactsBlock([...byId.values()]).slice(0, KNOWLEDGE_FILE_MAX_BYTES);
    out.push({ name: ns, text });
  }
  return out;
}

/**
 * Read watched markdown sources (6.2) for the given namespaces straight in —
 * a single file, or every *.md/*.markdown in a folder. Already markdown, so no
 * OCR. Each file becomes one knowledge block, capped at the per-file limit.
 */
export function loadWatchedMarkdown(namespaces: Namespace[]): KnowledgeFile[] {
  const sources: WatchedSource[] = settings()
    .get()
    .memory.sources.filter((s) => namespaces.includes(s.ns));
  const out: KnowledgeFile[] = [];
  for (const src of sources) {
    let files: string[];
    try {
      const st = statSync(src.path);
      if (st.isDirectory()) {
        files = readdirSync(src.path)
          .filter((f) => /\.(md|markdown)$/i.test(f))
          .sort()
          .map((f) => join(src.path, f));
      } else {
        files = [src.path];
      }
    } catch {
      console.warn(`[memory] watched source unavailable: ${src.path}`);
      continue;
    }
    for (const file of files) {
      try {
        const text = readFileSync(file, 'utf8').slice(0, KNOWLEDGE_FILE_MAX_BYTES);
        out.push({ name: `${src.ns}/${basename(file)}`, text });
      } catch {
        /* skip unreadable file */
      }
    }
  }
  return out;
}

export function loadKnowledge(profile: Profile): KnowledgeFile[] {
  const out: KnowledgeFile[] = [];
  for (const ref of profile.knowledge.files) {
    const path = isAbsolute(ref) ? ref : join(knowledgeDir(), ref);
    try {
      const size = statSync(path).size;
      if (size > KNOWLEDGE_FILE_MAX_BYTES) {
        console.warn(`[knowledge] ${ref} is ${size}B, truncating to ${KNOWLEDGE_FILE_MAX_BYTES}B`);
      }
      const text = readFileSync(path, 'utf8').slice(0, KNOWLEDGE_FILE_MAX_BYTES);
      out.push({ name: basename(path), text });
    } catch {
      console.warn(`[knowledge] cannot read ${path} (referenced by profile ${profile.id})`);
    }
  }
  return out;
}
