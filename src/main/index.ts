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

app.whenReady().then(() => {
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
