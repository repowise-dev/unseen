import { BrowserWindow } from 'electron';
import { join } from 'path';
import { settings } from '../services/settings';

let overlay: BrowserWindow | null = null;

export function getOverlay(): BrowserWindow | null {
  return overlay;
}

export function createOverlay(): BrowserWindow {
  const cfg = settings().get();
  overlay = new BrowserWindow({
    width: 520,
    height: 720,
    x: 40,
    y: 40,
    frame: false,
    transparent: true,
    alwaysOnTop: cfg.overlay.alwaysOnTop,
    skipTaskbar: true,
    resizable: true,
    hasShadow: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Privacy Mode: exclude the window from OS screen capture
  // (macOS NSWindow.sharingType=.none, Windows WDA_EXCLUDEFROMCAPTURE).
  overlay.setContentProtection(cfg.overlay.privacyMode);
  if (cfg.overlay.alwaysOnTop) overlay.setAlwaysOnTop(true, 'screen-saver');
  overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  if (cfg.overlay.opacity < 1) overlay.setOpacity(cfg.overlay.opacity);

  if (process.env.ELECTRON_RENDERER_URL) {
    void overlay.loadURL(`${process.env.ELECTRON_RENDERER_URL}/overlay/index.html`);
  } else {
    void overlay.loadFile(join(__dirname, '../renderer/overlay/index.html'));
  }

  overlay.on('closed', () => {
    overlay = null;
  });
  return overlay;
}

export function setPrivacyMode(on: boolean): void {
  overlay?.setContentProtection(on);
  settings().set({ overlay: { privacyMode: on } });
}

export function toggleOverlayVisibility(): void {
  if (!overlay) return;
  if (overlay.isVisible()) overlay.hide();
  else overlay.show();
}
