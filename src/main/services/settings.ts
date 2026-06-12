import { app, webContents } from 'electron';
import { join } from 'path';
import { readFileSync, writeFileSync, renameSync, existsSync } from 'fs';
import type { DeepPartial, Settings } from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/constants';
import { IPC } from '../../shared/ipc-contract';

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function deepMerge<T>(base: T, patch: DeepPartial<T> | undefined): T {
  if (patch === undefined) return base;
  if (!isObject(base) || !isObject(patch)) return patch as T;
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    out[k] = k in base ? deepMerge((base as Record<string, unknown>)[k], v as never) : v;
  }
  return out as T;
}

class SettingsStore {
  private path = join(app.getPath('userData'), 'settings.json');
  private cache: Settings;

  constructor() {
    let stored: DeepPartial<Settings> = {};
    try {
      if (existsSync(this.path)) {
        stored = JSON.parse(readFileSync(this.path, 'utf8'));
      }
    } catch (err) {
      console.error('[settings] corrupt settings.json, using defaults:', err);
    }
    // Merging over defaults doubles as a migration: new keys appear with
    // their default values, unknown stored keys are carried along harmlessly.
    this.cache = deepMerge(DEFAULT_SETTINGS, stored);
  }

  get(): Settings {
    return this.cache;
  }

  set(patch: DeepPartial<Settings>): Settings {
    this.cache = deepMerge(this.cache, patch);
    const tmp = this.path + '.tmp';
    writeFileSync(tmp, JSON.stringify(this.cache, null, 2));
    renameSync(tmp, this.path);
    for (const wc of webContents.getAllWebContents()) {
      wc.send(IPC.evSettingsChanged, this.cache);
    }
    return this.cache;
  }
}

let store: SettingsStore | null = null;

export function settings(): SettingsStore {
  if (!store) store = new SettingsStore();
  return store;
}
