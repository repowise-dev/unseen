import { IPC } from '../shared/ipc-contract';
import { settings } from './services/settings';
import { showDictationHud, hideDictationHud, getDictationHud } from './windows/dictation-hud';
import { isAccessibilityTrusted } from './permissions';
import { cancelDictationCleanup } from './services/dictation/cleanup';

// Main-side state machine for the dictation hotkey toggle (decision #2).
//
//   idle ──tap──▶ listening ──tap──▶ finishing ──(renderer inserts/cancels)──▶ idle
//
// The renderer owns STT + cleanup + insertion; main owns the window and the
// toggle so a second hotkey tap during cleanup can't start a new session.

type State = 'idle' | 'listening' | 'finishing';
let state: State = 'idle';

export function toggleDictation(): void {
  if (!settings().get().dictation.enabled) return;

  if (state === 'idle') {
    // Prompt for Accessibility up front; insertion will fail silently without it.
    isAccessibilityTrusted(true);
    showDictationHud();
    getDictationHud()?.webContents.send(IPC.evDictationStart);
    state = 'listening';
  } else if (state === 'listening') {
    getDictationHud()?.webContents.send(IPC.evDictationStop);
    state = 'finishing';
  }
  // state === 'finishing': ignore taps until the renderer reports done.
}

/** Renderer signals the session is fully done (inserted or cancelled). */
export function finishDictation(): void {
  cancelDictationCleanup();
  hideDictationHud();
  state = 'idle';
}
