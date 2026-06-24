import 'dotenv/config';
import { app, BrowserWindow } from 'electron';
import { registerIpc } from './ipc';
import { registerShortcuts, unregisterShortcuts } from './shortcuts';
import { createOverlay } from './windows/overlay';
import { createDictationHud } from './windows/dictation-hud';
import { openSettingsWindow } from './windows/settings';
import { initProfiles, disposeProfiles } from './services/profiles';
import { getSecret } from './services/secrets';
import { settings } from './services/settings';
import { ingestNotes } from './services/notes/ingest';
import { distillToday } from './services/memory/distill';

// Headless scheduler entry: the LaunchAgent relaunches us with `--sync` to run
// Notes ingestion + distillation without opening any window, then quit.
const SYNC_MODE = process.argv.includes('--sync');

async function runHeadlessSync(): Promise<void> {
  try {
    await ingestNotes();
    await distillToday();
  } catch (err) {
    console.error('[sync] headless run failed', err);
  }
}

app.whenReady().then(async () => {
  if (SYNC_MODE) {
    await runHeadlessSync();
    app.quit();
    return;
  }

  initProfiles();
  registerIpc();
  createOverlay();
  // Create the dictation HUD hidden at startup so its controller is already
  // listening when the hotkey fires (no renderer-load race).
  createDictationHud();
  registerShortcuts();

  // First run (wizard not completed) or missing transcription key:
  // take the user straight to setup.
  if (!settings().get().onboarded || !getSecret('deepgram')) openSettingsWindow();

  // macOS dock click with no windows → recreate the overlay.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createOverlay();
  });
});

app.on('will-quit', () => {
  unregisterShortcuts();
  disposeProfiles();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
