import { app } from 'electron';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';

const run = promisify(execFile);

// The app installs its OWN LaunchAgent (decision #8) — no manual Shortcuts
// setup. The agent relaunches Unseen with `--sync`, which runs Notes ingestion
// + distillation headlessly (no window) and quits. Scheduled hourly plus a
// fixed end-of-day run, so memory accumulates whether or not the app is open.

const LABEL = 'ai.unseen.sync';

function plistPath(): string {
  return join(homedir(), 'Library', 'LaunchAgents', `${LABEL}.plist`);
}

export function launchAgentInstalled(): boolean {
  return existsSync(plistPath());
}

function plistContents(): string {
  const exe = app.getPath('exe');
  // Hourly (StartInterval) + a fixed 23:30 end-of-day pass (StartCalendarInterval).
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${exe}</string>
    <string>--sync</string>
  </array>
  <key>StartInterval</key><integer>3600</integer>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key><integer>23</integer>
    <key>Minute</key><integer>30</integer>
  </dict>
  <key>ProcessType</key><string>Background</string>
  <key>RunAtLoad</key><false/>
</dict>
</plist>
`;
}

export async function installLaunchAgent(): Promise<{ ok: boolean; error?: string }> {
  if (process.platform !== 'darwin') return { ok: false, error: 'macOS only.' };
  try {
    const path = plistPath();
    mkdirSync(join(homedir(), 'Library', 'LaunchAgents'), { recursive: true });
    writeFileSync(path, plistContents());
    // Reload if already loaded, then load.
    await run('launchctl', ['unload', path]).catch(() => undefined);
    await run('launchctl', ['load', path]);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String((err as Error).message ?? err) };
  }
}

export async function uninstallLaunchAgent(): Promise<{ ok: boolean; error?: string }> {
  if (process.platform !== 'darwin') return { ok: false, error: 'macOS only.' };
  try {
    const path = plistPath();
    if (existsSync(path)) {
      await run('launchctl', ['unload', path]).catch(() => undefined);
      rmSync(path);
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String((err as Error).message ?? err) };
  }
}
