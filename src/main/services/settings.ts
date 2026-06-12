import { app, webContents } from 'electron';
import { join, dirname } from 'path';
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'fs';
import type { DeepPartial, Settings } from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/constants';
import { deepMerge } from '../../shared/merge';
import { IPC } from '../../shared/ipc-contract';

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
    mkdirSync(dirname(this.path), { recursive: true });
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
