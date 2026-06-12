import 'dotenv/config';
import { app, BrowserWindow } from 'electron';
import { registerIpc } from './ipc';
import { registerShortcuts, unregisterShortcuts } from './shortcuts';
import { createOverlay } from './windows/overlay';
import { openSettingsWindow } from './windows/settings';
import { initProfiles, disposeProfiles } from './services/profiles';
import { getSecret } from './services/secrets';

app.whenReady().then(() => {
  initProfiles();
  registerIpc();
  createOverlay();
  registerShortcuts();

  // First run (or missing transcription key): take the user straight to setup.
  if (!getSecret('deepgram')) openSettingsWindow();

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
