import { app } from 'electron';
import { isAbsolute, join, basename } from 'path';
import { readFileSync, statSync, existsSync, mkdirSync } from 'fs';
import type { Profile } from '../../shared/types';
import { KNOWLEDGE_FILE_MAX_BYTES } from '../../shared/constants';

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
