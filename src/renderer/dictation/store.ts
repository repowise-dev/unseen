import { create } from 'zustand';

// State machine for the dictation HUD (decision #2):
//   idle → listening → cleaning → inserting → idle
// plus a transient error surface.
export type DictationState = 'idle' | 'listening' | 'cleaning' | 'inserting' | 'error';

interface DictationStore {
  state: DictationState;
  /** STT connection status text shown while listening. */
  status: string;
  /** Live interim transcript (replaced each partial). */
  interim: string;
  /** Accumulated final transcript so far. */
  finals: string;
  /** Streaming cleaned text during the cleanup pass. */
  cleaned: string;
  error: string;

  setState(s: DictationState): void;
  setStatus(text: string): void;
  setInterim(text: string): void;
  addFinal(text: string): void;
  appendCleaned(delta: string): void;
  setError(msg: string): void;
  reset(): void;
}

export const useDictationStore = create<DictationStore>((set) => ({
  state: 'idle',
  status: '',
  interim: '',
  finals: '',
  cleaned: '',
  error: '',

  setState: (state) => set({ state }),
  setStatus: (status) => set({ status }),
  setInterim: (interim) => set({ interim }),
  addFinal: (text) =>
    set((s) => ({ finals: s.finals ? `${s.finals} ${text}` : text, interim: '' })),
  appendCleaned: (delta) => set((s) => ({ cleaned: s.cleaned + delta })),
  setError: (error) => set({ state: 'error', error }),
  reset: () => set({ state: 'idle', status: '', interim: '', finals: '', cleaned: '', error: '' }),
}));
