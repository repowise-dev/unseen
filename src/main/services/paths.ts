import { app } from 'electron';
import { join } from 'path';
import { homedir } from 'os';
import { mkdirSync, existsSync, cpSync } from 'fs';
import type { Namespace } from './memory/core';
import { settings } from './settings';

// Single source of truth for on-disk storage locations. The root is
// configurable (Phase 4): empty = OS userData (local); otherwise an iCloud
// Drive folder so a second Mac "just works" after cloning.
//
// IMPORTANT: settings.json and secrets.json deliberately do NOT live under here
// — secrets must never leave the local keychain-backed store, and settings has
// a bootstrap chicken-and-egg (we must read it to learn dataDir). Only synced
// data — memory/, knowledge/, sessions/ — routes through dataDir().

function ensure(dir: string): string {
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** Local OS userData dir — always available, holds settings + secrets. */
export function userDataDir(): string {
  return app.getPath('userData');
}

/** Canonical iCloud Drive location offered in Settings. */
export function iCloudDir(): string {
  return join(homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'Engram');
}

/** Root for synced data. settings.dataDir when set, else local userData. */
export function dataDir(): string {
  const configured = settings().get().dataDir;
  return configured ? ensure(configured) : userDataDir();
}

export function memoryDir(): string {
  return ensure(join(dataDir(), 'memory'));
}

/** Daily event logs: <dataDir>/memory/log/<YYYY-MM-DD>.jsonl */
export function logDir(): string {
  return ensure(join(memoryDir(), 'log'));
}

/** Distilled facts per namespace: <dataDir>/memory/facts/<ns>/<YYYY-MM-DD>.json */
export function factsDir(ns: Namespace): string {
  return ensure(join(memoryDir(), 'facts', ns));
}

/**
 * One-time migration when the user switches data dir: copy existing synced
 * subtrees (memory/knowledge/sessions) from the current root into the target,
 * without overwriting files already there (iCloud may have synced them first).
 * Returns the list of subtrees copied.
 */
export function migrateDataDir(from: string, to: string): string[] {
  const copied: string[] = [];
  for (const sub of ['memory', 'knowledge', 'sessions']) {
    const src = join(from, sub);
    if (!existsSync(src)) continue;
    const dest = join(to, sub);
    try {
      cpSync(src, dest, { recursive: true, force: false, errorOnExist: false });
      copied.push(sub);
    } catch (err) {
      console.error(`[paths] migrate ${sub} failed`, err);
    }
  }
  return copied;
}
