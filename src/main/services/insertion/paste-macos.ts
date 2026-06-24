import { execFile } from 'child_process';
import { promisify } from 'util';

const run = promisify(execFile);

// macOS text insertion + front-app detection via AppleScript / System Events.
// The plan's "quick start" path (no native helper to build). A synthesized ⌘V
// is the only reliable way to insert into arbitrary apps; both calls require
// Accessibility permission, which permissions.ts gates.

/** Synthesize ⌘V into whatever app currently has key focus. */
export async function pasteKeystroke(): Promise<void> {
  if (process.platform !== 'darwin') {
    throw new Error('Dictation insertion is only implemented on macOS.');
  }
  await run('osascript', [
    '-e',
    'tell application "System Events" to keystroke "v" using command down',
  ]);
}

/** Name of the frontmost app process (for the per-app exclude list). */
export async function frontmostApp(): Promise<string | null> {
  if (process.platform !== 'darwin') return null;
  try {
    const { stdout } = await run('osascript', [
      '-e',
      'tell application "System Events" to get name of first application process whose frontmost is true',
    ]);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}
