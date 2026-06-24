import { BrowserWindow, screen } from 'electron';
import { join } from 'path';

// Small frameless always-on-top HUD for system-wide dictation. Mirrors
// overlay.ts but is NON-FOCUSABLE: it must never steal key focus, otherwise
// the synthesized ⌘V would paste into the HUD instead of the app the user was
// typing in. Created hidden at startup so its renderer/controller is already
// listening for the start event when the hotkey fires (no load race).

let hud: BrowserWindow | null = null;

export function getDictationHud(): BrowserWindow | null {
  return hud;
}

export function createDictationHud(): BrowserWindow {
  const width = 420;
  const height = 120;
  const display = screen.getPrimaryDisplay().workAreaSize;
  hud = new BrowserWindow({
    width,
    height,
    // Bottom-center, where dictation/voice HUDs conventionally sit.
    x: Math.round((display.width - width) / 2),
    y: display.height - height - 80,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: true,
    hasShadow: false,
    focusable: false, // never take key focus — paste must hit the target app
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  hud.setAlwaysOnTop(true, 'screen-saver');
  hud.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // Keep the HUD out of screen recordings, like the overlay.
  hud.setContentProtection(true);

  if (process.env.ELECTRON_RENDERER_URL) {
    void hud.loadURL(`${process.env.ELECTRON_RENDERER_URL}/dictation/index.html`);
  } else {
    void hud.loadFile(join(__dirname, '../renderer/dictation/index.html'));
  }

  hud.on('closed', () => {
    hud = null;
  });
  return hud;
}

/** Show without activating, so the previously-focused app keeps key focus. */
export function showDictationHud(): void {
  if (!hud || hud.isDestroyed()) createDictationHud();
  hud!.showInactive();
}

export function hideDictationHud(): void {
  if (hud && !hud.isDestroyed() && hud.isVisible()) hud.hide();
}
