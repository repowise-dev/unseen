import { app, safeStorage } from 'electron';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

// API keys, encrypted with the OS keychain via safeStorage. Falls back to
// process.env (dev .env) when no stored key exists. Raw keys never cross IPC —
// the renderer only ever sees boolean status.

const ENV_FALLBACK: Record<string, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  gemini: 'GEMINI_API_KEY',
  deepgram: 'DEEPGRAM_API_KEY',
  'openai-compatible': 'OPENAI_COMPATIBLE_API_KEY',
};

interface VaultFile {
  encrypted: boolean;
  entries: Record<string, string>; // base64
}

function vaultPath(): string {
  return join(app.getPath('userData'), 'secrets.json');
}

function readVault(): VaultFile {
  try {
    if (existsSync(vaultPath())) {
      return JSON.parse(readFileSync(vaultPath(), 'utf8'));
    }
  } catch (err) {
    console.error('[secrets] corrupt vault, starting empty:', err);
  }
  return { encrypted: safeStorage.isEncryptionAvailable(), entries: {} };
}

export function setSecret(id: string, value: string): void {
  const vault = readVault();
  if (!value) {
    delete vault.entries[id];
  } else if (safeStorage.isEncryptionAvailable()) {
    vault.encrypted = true;
    vault.entries[id] = safeStorage.encryptString(value).toString('base64');
  } else {
    // Headless Linux without a keyring — store obfuscated-only and say so.
    console.warn('[secrets] OS encryption unavailable; storing key without encryption');
    vault.encrypted = false;
    vault.entries[id] = Buffer.from(value, 'utf8').toString('base64');
  }
  writeFileSync(vaultPath(), JSON.stringify(vault, null, 2), { mode: 0o600 });
}

export function getSecret(id: string): string | null {
  const vault = readVault();
  const stored = vault.entries[id];
  if (stored) {
    try {
      const buf = Buffer.from(stored, 'base64');
      return vault.encrypted ? safeStorage.decryptString(buf) : buf.toString('utf8');
    } catch (err) {
      console.error(`[secrets] failed to decrypt key for ${id}:`, err);
    }
  }
  const envName = ENV_FALLBACK[id];
  return (envName && process.env[envName]) || null;
}

/** Which providers have a usable key (stored or env). Safe to send to renderer. */
export function secretsStatus(): Record<string, boolean> {
  const status: Record<string, boolean> = {};
  for (const id of Object.keys(ENV_FALLBACK)) {
    status[id] = getSecret(id) !== null;
  }
  return status;
}
