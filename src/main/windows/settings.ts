import { BrowserWindow } from 'electron';
import { join } from 'path';

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
  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/settings/index.html`);
  } else {
    void win.loadFile(join(__dirname, '../renderer/settings/index.html'));
  }
  win.on('closed', () => {
    win = null;
  });
}
