import { create } from 'zustand';
import type { Profile, ProfileSummary, Settings, Usage } from '../../shared/types';
import type { TranscriptTurn } from './transcript-store';

export interface AnswerItem {
  id: number;
  ts: string;
  text: string;
  done: boolean;
  error?: string;
}

export type StatusKind = 'idle' | 'live' | 'thinking' | 'paused' | 'error';

interface OverlayState {
  status: { kind: StatusKind; text: string };
  turns: TranscriptTurn[];
  interim: string;
  answers: AnswerItem[];
  usage: Usage | null;
  sessionCost: number;
  settings: Settings | null;
  profiles: ProfileSummary[];
  activeProfile: Profile | null;

  setStatus(kind: StatusKind, text: string): void;
  setTranscript(turns: TranscriptTurn[], interim: string): void;
  beginAnswer(id: number): void;
  appendAnswer(id: number, delta: string): void;
  finishAnswer(id: number, opts: { discard?: boolean; error?: string; usage?: Usage | null }): void;
  setSettings(s: Settings): void;
  setProfiles(p: ProfileSummary[]): void;
  setActiveProfile(p: Profile): void;
}

export const useOverlayStore = create<OverlayState>((set) => ({
  status: { kind: 'idle', text: 'starting…' },
  turns: [],
  interim: '',
  answers: [],
  usage: null,
  sessionCost: 0,
  settings: null,
  profiles: [],
  activeProfile: null,

  setStatus: (kind, text) => set({ status: { kind, text } }),
  setTranscript: (turns, interim) => set({ turns, interim }),

  beginAnswer: (id) =>
    set((s) => ({
      answers: [
        ...s.answers,
        {
          id,
          ts: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          text: '',
          done: false,
        },
      ],
    })),

  appendAnswer: (id, delta) =>
    set((s) => ({
      answers: s.answers.map((a) => (a.id === id ? { ...a, text: a.text + delta } : a)),
    })),

  finishAnswer: (id, { discard, error, usage }) =>
    set((s) => ({
      answers: discard
        ? s.answers.filter((a) => a.id !== id)
        : s.answers.map((a) => (a.id === id ? { ...a, done: true, error } : a)),
      usage: usage ?? s.usage,
      sessionCost: s.sessionCost + (usage?.estimatedCost ?? 0),
    })),

  setSettings: (settings) => set({ settings }),
  setProfiles: (profiles) => set({ profiles }),
  setActiveProfile: (activeProfile) => set({ activeProfile }),
}));
