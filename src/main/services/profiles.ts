import { app, shell, webContents } from 'electron';
import { join, basename } from 'path';
import {
  readFileSync,
  readdirSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  watch,
  type FSWatcher,
} from 'fs';
import { load as parseYaml, dump as dumpYaml } from 'js-yaml';
import { ProfileSchema } from '../../shared/profile-schema';
import type { Profile, ProfileSummary } from '../../shared/types';
import { IPC } from '../../shared/ipc-contract';
import { settings } from './settings';

// Profiles are YAML files. Built-ins ship with the app (read-only); user
// profiles live in <userData>/profiles and override built-ins by id.

let cache: Map<string, Profile> | null = null;
const watchers: FSWatcher[] = [];

function builtinDir(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'profiles')
    : join(app.getAppPath(), 'profiles');
}

export function userDir(): string {
  const dir = join(app.getPath('userData'), 'profiles');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function loadDir(dir: string, builtin: boolean, into: Map<string, Profile>): void {
  if (!existsSync(dir)) return;
  for (const file of readdirSync(dir)) {
    if (!/\.ya?ml$/.test(file)) continue;
    const path = join(dir, file);
    try {
      const raw = parseYaml(readFileSync(path, 'utf8'));
      const parsed = ProfileSchema.safeParse(raw);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        console.error(
          `[profiles] ${basename(path)}: ${issue.path.join('.') || '(root)'} — ${issue.message}`,
        );
        continue;
      }
      into.set(parsed.data.id, { ...parsed.data, builtin });
    } catch (err) {
      console.error(`[profiles] failed to load ${basename(path)}:`, err);
    }
  }
}

function loadAll(): Map<string, Profile> {
  const map = new Map<string, Profile>();
  loadDir(builtinDir(), true, map);
  loadDir(userDir(), false, map); // user profiles override built-ins by id
  return map;
}

function broadcastChange(): void {
  cache = loadAll();
  for (const wc of webContents.getAllWebContents()) {
    wc.send(IPC.evProfilesChanged, listProfiles());
  }
}

export function initProfiles(): void {
  cache = loadAll();
  for (const dir of [builtinDir(), userDir()]) {
    if (!existsSync(dir)) continue;
    try {
      let timer: NodeJS.Timeout | null = null;
      watchers.push(
        watch(dir, () => {
          // Debounce bursts of fs events from a single save.
          if (timer) clearTimeout(timer);
          timer = setTimeout(broadcastChange, 200);
        }),
      );
    } catch (err) {
      console.error('[profiles] watch failed for', dir, err);
    }
  }
}

export function listProfiles(): ProfileSummary[] {
  if (!cache) cache = loadAll();
  return [...cache.values()].map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    icon: p.icon,
    builtin: !!p.builtin,
  }));
}

export function getProfile(id: string): Profile | null {
  if (!cache) cache = loadAll();
  return cache.get(id) ?? null;
}

export function getActiveProfile(): Profile {
  const active = getProfile(settings().get().activeProfile);
  if (active) return active;
  const first = listProfiles()[0];
  const fallback = first && getProfile(first.id);
  if (fallback) return fallback;
  throw new Error('No profiles found — reinstall or add a profile YAML.');
}

/** Validate and write a profile YAML into the user dir. Saving with a
 *  built-in's id creates the user's editable override of that built-in. */
export function saveProfile(raw: unknown): { ok: boolean; error?: string } {
  const parsed = ProfileSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: `${issue.path.join('.') || '(root)'} — ${issue.message}` };
  }
  writeFileSync(join(userDir(), `${parsed.data.id}.yaml`), dumpYaml(parsed.data, { lineWidth: 100 }));
  broadcastChange();
  return { ok: true };
}

/** Delete a user profile file. If it shadowed a built-in, the built-in
 *  reappears; built-ins themselves cannot be deleted. */
export function deleteProfile(id: string): { ok: boolean; error?: string } {
  const path = join(userDir(), `${id}.yaml`);
  const alt = join(userDir(), `${id}.yml`);
  if (!existsSync(path) && !existsSync(alt)) {
    return { ok: false, error: 'Built-in profiles cannot be deleted — they can only be overridden.' };
  }
  rmSync(existsSync(path) ? path : alt);
  broadcastChange();
  if (!getProfile(settings().get().activeProfile)) {
    const first = listProfiles()[0];
    if (first) settings().set({ activeProfile: first.id });
  }
  return { ok: true };
}

export function openProfilesFolder(): void {
  void shell.openPath(userDir());
}

export function disposeProfiles(): void {
  for (const w of watchers) w.close();
  watchers.length = 0;
}
