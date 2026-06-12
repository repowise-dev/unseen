import { BrowserWindow } from 'electron';
import { join } from 'path';
import { getOverlay } from './overlay';
import { settings } from '../services/settings';

let win: BrowserWindow | null = null;

export function openSettingsWindow(): void {
  if (win && !win.isDestroyed()) {
    win.focus();
    return;
  }
  win = new BrowserWindow({
    width: 760,
    height: 640,
    title: 'Settings',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // The overlay floats at screen-saver level so it stays over meeting apps —
  // but that would also cover THIS window and steal its clicks. Drop the
  // overlay's always-on-top while settings is open; restore on close.
  getOverlay()?.setAlwaysOnTop(false);

  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/settings/index.html`);
  } else {
    void win.loadFile(join(__dirname, '../renderer/settings/index.html'));
  }
  win.focus();
  win.on('closed', () => {
    win = null;
    if (settings().get().overlay.alwaysOnTop) {
      getOverlay()?.setAlwaysOnTop(true, 'screen-saver');
    }
  });
}
