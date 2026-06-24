import { app } from 'electron';
import { join } from 'path';
import { mkdirSync } from 'fs';
import type { Namespace } from './memory/core';

// Single source of truth for on-disk storage locations. Phase 4 will make the
// root configurable (point it at iCloud Drive); for now it is the OS userData
// dir. Every service should resolve memory/knowledge/session paths through here
// rather than calling app.getPath('userData') directly, so the migration is a
// one-line change.

function ensure(dir: string): string {
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** Root data directory. Phase 4: read from settings.dataDir when set. */
export function dataDir(): string {
  return app.getPath('userData');
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
