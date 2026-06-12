import Anthropic from '@anthropic-ai/sdk';
import type { LlmEvent, LlmRequest, ModelInfo, VerifyResult } from '../../../shared/types';
import type { LlmProvider, ProviderContext } from './provider';

const STATIC_MODELS: ModelInfo[] = [
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (recommended)' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (fast/cheap)' },
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8 (deepest)' },
];

export const anthropicProvider: LlmProvider = {
  id: 'anthropic',
  displayName: 'Anthropic (Claude)',
  needsApiKey: true,

  async listModels(ctx) {
    if (!ctx.apiKey) return STATIC_MODELS;
    try {
      const res = await fetch('https://api.anthropic.com/v1/models?limit=50', {
        headers: { 'x-api-key': ctx.apiKey, 'anthropic-version': '2023-06-01' },
      });
      if (!res.ok) return STATIC_MODELS;
      const body = (await res.json()) as { data: { id: string; display_name?: string }[] };
      return body.data.map((m) => ({ id: m.id, label: m.display_name }));
    } catch {
      return STATIC_MODELS;
    }
  },

  async verify(ctx): Promise<VerifyResult> {
    if (!ctx.apiKey) return { ok: false, message: 'No API key set.' };
    try {
      const res = await fetch('https://api.anthropic.com/v1/models?limit=1', {
        headers: { 'x-api-key': ctx.apiKey, 'anthropic-version': '2023-06-01' },
      });
      if (res.status === 401) return { ok: false, message: 'Invalid API key.' };
      if (!res.ok) return { ok: false, message: `HTTP ${res.status}` };
      return { ok: true };
    } catch (err) {
      return { ok: false, message: `Network error: ${String(err)}` };
    }
  },

  async *stream(req: LlmRequest, ctx: ProviderContext): AsyncIterable<LlmEvent> {
    const client = new Anthropic({ apiKey: ctx.apiKey ?? '' });
    let inputTokens = 0;
    let outputTokens = 0;
    let cacheReadTokens = 0;

    const stream = await client.messages.create(
      {
        model: req.model,
        max_tokens: req.maxTokens,
        temperature: req.temperature,
        system: req.system.map((b) => ({
          type: 'text' as const,
          text: b.text,
          ...(b.cacheable ? { cache_control: { type: 'ephemeral' as const } } : {}),
        })),
        messages: req.messages,
        stream: true,
      },
      { signal: ctx.signal },
    );

    for await (const event of stream) {
      if (event.type === 'message_start') {
        inputTokens = event.message.usage.input_tokens;
        cacheReadTokens = event.message.usage.cache_read_input_tokens ?? 0;
      } else if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield { type: 'delta', text: event.delta.text };
      } else if (event.type === 'message_delta') {
        outputTokens = event.usage.output_tokens;
      }
    }
    yield { type: 'usage', inputTokens, outputTokens, cacheReadTokens };
    yield { type: 'done' };
  },
};
