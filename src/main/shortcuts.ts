import { globalShortcut } from 'electron';
import { IPC } from '../shared/ipc-contract';
import { settings } from './services/settings';
import { listProfiles } from './services/profiles';
import { getOverlay, setPrivacyMode, toggleOverlayVisibility } from './windows/overlay';

function cycleProfile(): void {
  const profiles = listProfiles();
  if (profiles.length === 0) return;
  const currentId = settings().get().activeProfile;
  const idx = profiles.findIndex((p) => p.id === currentId);
  const next = profiles[(idx + 1) % profiles.length];
  settings().set({ activeProfile: next.id });
}

export function registerShortcuts(): void {
  globalShortcut.unregisterAll();
  const hk = settings().get().hotkeys;
  const bindings: [string, () => void][] = [
    [hk.toggleVisibility, toggleOverlayVisibility],
    [hk.askNow, () => getOverlay()?.webContents.send(IPC.evForceAnswer)],
    [hk.pause, () => getOverlay()?.webContents.send(IPC.evTogglePause)],
    [hk.cycleProfile, cycleProfile],
    [hk.privacyMode, () => setPrivacyMode(!settings().get().overlay.privacyMode)],
  ];
  for (const [accelerator, handler] of bindings) {
    if (!accelerator) continue;
    try {
      if (!globalShortcut.register(accelerator, handler)) {
        console.warn(`[shortcuts] could not register ${accelerator} (in use by another app?)`);
      }
    } catch (err) {
      console.error(`[shortcuts] invalid accelerator ${accelerator}:`, err);
    }
  }
}

export function unregisterShortcuts(): void {
  globalShortcut.unregisterAll();
}
