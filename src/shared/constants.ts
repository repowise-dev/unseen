import type { Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  llm: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    maxTokens: 2000,
    temperature: null,
    fallbacks: [],
    endpoints: {
      ollama: 'http://localhost:11434',
      openaiCompatible: { baseURL: '', label: 'OpenAI-compatible' },
    },
  },
  stt: {
    provider: 'deepgram',
    language: 'en',
    diarize: true,
    endpointingMs: 300,
    micDeviceId: 'default',
  },
  overlay: {
    privacyMode: true,
    alwaysOnTop: true,
    opacity: 1,
    fontSize: 13,
  },
  hotkeys: {
    toggleVisibility: 'CommandOrControl+Shift+\\',
    askNow: 'CommandOrControl+Shift+Space',
    pause: 'CommandOrControl+Shift+P',
    cycleProfile: 'CommandOrControl+Shift+]',
    privacyMode: 'CommandOrControl+Shift+H',
    dictation: 'CommandOrControl+Shift+D',
  },
  dictation: {
    enabled: true,
    model: 'claude-haiku-4-5',
    excludeApps: [],
    logToMemory: true,
  },
  memory: {
    sources: [],
    notes: {
      enabled: false,
      defaultNs: 'personal',
      folderMap: [],
      lastRunAt: 0,
    },
  },
  transcript: {
    windowChars: 4000,
    retentionMin: 3,
  },
  sessions: {
    autoSave: true,
  },
  activeProfile: 'qa-overlay',
  dataDir: '',
  onboarded: false,
};

/** Max bytes of a single knowledge file injected into the prompt. */
export const KNOWLEDGE_FILE_MAX_BYTES = 200 * 1024;

/** Abort an LLM stream if no event arrives for this long. */
export const LLM_STALL_TIMEOUT_MS = 15_000;
