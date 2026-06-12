import type { ProviderInfo, Settings } from '../../../shared/types';
import type { LlmProvider, ProviderContext } from './provider';
import { anthropicProvider } from './anthropic';
import { openaiProvider, openaiCompatibleProvider } from './openai-like';
import { geminiProvider } from './gemini';
import { ollamaProvider } from './ollama';
import { getSecret } from '../secrets';

// To add an LLM vendor: implement LlmProvider in one file, add it here.
// See docs/extending/llm-provider.md.
const providers: LlmProvider[] = [
  anthropicProvider,
  openaiProvider,
  geminiProvider,
  ollamaProvider,
  openaiCompatibleProvider,
];

export function getLlmProvider(id: string): LlmProvider {
  const p = providers.find((p) => p.id === id);
  if (!p) throw new Error(`Unknown LLM provider: ${id}`);
  return p;
}

export function listLlmProviders(): ProviderInfo[] {
  return providers.map(({ id, displayName, needsApiKey }) => ({ id, displayName, needsApiKey }));
}

/** Resolve the per-provider context (key + endpoint) from settings/keychain. */
export function providerContext(id: string, settings: Settings): Omit<ProviderContext, 'signal'> {
  const baseURL =
    id === 'ollama'
      ? settings.llm.endpoints.ollama
      : id === 'openai-compatible'
        ? settings.llm.endpoints.openaiCompatible.baseURL || undefined
        : undefined;
  return { apiKey: getSecret(id), baseURL };
}
