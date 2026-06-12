// Core types shared between main, preload, and renderer.

export interface Settings {
  llm: {
    provider: string;
    model: string;
    maxTokens: number;
    temperature: number | null;
    /** Provider ids tried in order if the primary fails before first token. */
    fallbacks: string[];
    endpoints: {
      ollama: string;
      openaiCompatible: { baseURL: string; label: string };
    };
  };
  stt: {
    provider: string;
    language: string;
    diarize: boolean;
    endpointingMs: number;
    micDeviceId: string;
  };
  overlay: {
    privacyMode: boolean;
    alwaysOnTop: boolean;
    opacity: number;
    fontSize: number;
  };
  hotkeys: {
    toggleVisibility: string;
    askNow: string;
    pause: string;
    cycleProfile: string;
    privacyMode: string;
  };
  transcript: {
    windowChars: number;
    retentionMin: number;
  };
  sessions: {
    autoSave: boolean;
  };
  activeProfile: string;
  /** First-run wizard completed. */
  onboarded: boolean;
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

// ---- LLM ----

export interface SystemBlock {
  text: string;
  /** Maps to Anthropic prompt caching; ignored by providers without it. */
  cacheable?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LlmRequest {
  system: SystemBlock[];
  messages: ChatMessage[];
  model: string;
  maxTokens: number;
  temperature?: number;
}

export type LlmEvent =
  | { type: 'delta'; text: string }
  | { type: 'usage'; inputTokens: number; outputTokens: number; cacheReadTokens?: number }
  | { type: 'done' };

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  /** Estimated USD for this call; null when the model isn't in the price table. */
  estimatedCost: number | null;
}

export interface ModelInfo {
  id: string;
  label?: string;
}

export interface ProviderInfo {
  id: string;
  displayName: string;
  needsApiKey: boolean;
}

export interface VerifyResult {
  ok: boolean;
  message?: string;
}

// ---- STT ----

export interface SttDescriptor {
  providerId: string;
  wsUrl: string;
  protocols?: string[];
  keepAlive?: { intervalMs: number; payload: string };
}

export interface WordTiming {
  word: string;
  start: number;
  end: number;
  speaker?: number;
}

export type TranscriptEvent =
  | { type: 'interim'; text: string }
  | { type: 'final'; text: string; speaker: number; words?: WordTiming[] };

// ---- Answer flow ----

export interface AnswerPayload {
  fullTranscript: string;
  newSegment: string;
  forced: boolean;
  codeMode: boolean;
  userSpeaker: number;
}

export interface AnswerDone {
  usage: Usage | null;
}

// ---- Profiles (validated shape; schema lives in profile-schema.ts) ----

export type ResponseStyle = 'spoken' | 'notes' | 'code-first';

export interface Profile {
  id: string;
  name: string;
  description: string;
  icon: string;
  builtin?: boolean;
  llm?: { model?: string; maxTokens?: number; temperature?: number };
  prompt: {
    system: string;
    response_style: ResponseStyle;
    language: string;
  };
  knowledge: {
    prompt_label: string;
    files: string[];
  };
  triggers: {
    auto: boolean;
    detectors: string[];
    keywords: string[];
    debounce_ms: number;
    min_chars: number;
  };
  transcript?: { window_chars?: number; retention_min?: number };
}

export interface ProfileSummary {
  id: string;
  name: string;
  description: string;
  icon: string;
  builtin: boolean;
}

export interface AppInfo {
  version: string;
  platform: string;
}

// ---- Sessions ----

export type SessionEvent =
  | { t: number; type: 'start'; version: string }
  | { t: number; type: 'final'; text: string; speaker: number }
  | {
      t: number;
      type: 'answer';
      text: string;
      profileId: string;
      forced: boolean;
      usage?: Usage | null;
    };

export interface SessionMeta {
  id: string; // filename without extension
  startedAt: number;
  endedAt: number;
  finals: number;
  answers: number;
}
