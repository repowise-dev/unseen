import type { LlmEvent, LlmRequest, ModelInfo, VerifyResult } from '../../../shared/types';

/** Per-call context a provider needs beyond the request itself. */
export interface ProviderContext {
  apiKey: string | null;
  /** Base endpoint for self-hosted providers (ollama, openai-compatible). */
  baseURL?: string;
  signal: AbortSignal;
}

export interface LlmProvider {
  readonly id: string;
  readonly displayName: string;
  readonly needsApiKey: boolean;
  /** Models for the settings dropdown. May hit the network; callers cache. */
  listModels(ctx: Omit<ProviderContext, 'signal'>): Promise<ModelInfo[]>;
  /** Cheap key/connectivity check for the settings "Test" button. */
  verify(ctx: Omit<ProviderContext, 'signal'>): Promise<VerifyResult>;
  stream(req: LlmRequest, ctx: ProviderContext): AsyncIterable<LlmEvent>;
}

export function joinSystem(req: LlmRequest): string {
  return req.system.map((b) => b.text).join('\n\n');
}
