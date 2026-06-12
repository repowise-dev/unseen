import OpenAI from 'openai';
import type { LlmEvent, LlmRequest, ModelInfo, VerifyResult } from '../../../shared/types';
import { joinSystem, type LlmProvider, type ProviderContext } from './provider';

// Factory shared by the real OpenAI provider and the generic
// "openai-compatible" provider (LM Studio, Groq, OpenRouter, vLLM, ...).

export function makeOpenAiLike(opts: {
  id: string;
  displayName: string;
  needsApiKey: boolean;
  /** Real OpenAI rejects max_tokens on newer models; compatibles often
   *  don't know max_completion_tokens or stream_options yet. */
  strictOpenAi: boolean;
  staticModels?: ModelInfo[];
}): LlmProvider {
  const client = (ctx: { apiKey: string | null; baseURL?: string }): OpenAI =>
    new OpenAI({ apiKey: ctx.apiKey ?? 'not-needed', baseURL: ctx.baseURL });

  return {
    id: opts.id,
    displayName: opts.displayName,
    needsApiKey: opts.needsApiKey,

    async listModels(ctx): Promise<ModelInfo[]> {
      try {
        const models = await client(ctx).models.list();
        const ids = models.data.map((m) => ({ id: m.id }));
        return ids.length ? ids : (opts.staticModels ?? []);
      } catch {
        return opts.staticModels ?? [];
      }
    },

    async verify(ctx): Promise<VerifyResult> {
      if (opts.needsApiKey && !ctx.apiKey) return { ok: false, message: 'No API key set.' };
      if (!opts.strictOpenAi && !ctx.baseURL) {
        return { ok: false, message: 'No base URL configured.' };
      }
      try {
        await client(ctx).models.list();
        return { ok: true };
      } catch (err) {
        const status = (err as { status?: number }).status;
        if (status === 401) return { ok: false, message: 'Invalid API key.' };
        return { ok: false, message: String((err as Error).message ?? err) };
      }
    },

    async *stream(req: LlmRequest, ctx: ProviderContext): AsyncIterable<LlmEvent> {
      const tokenParam = opts.strictOpenAi
        ? { max_completion_tokens: req.maxTokens }
        : { max_tokens: req.maxTokens };
      const stream = await client(ctx).chat.completions.create(
        {
          model: req.model,
          stream: true,
          temperature: req.temperature,
          ...(opts.strictOpenAi ? { stream_options: { include_usage: true } } : {}),
          ...tokenParam,
          messages: [{ role: 'system' as const, content: joinSystem(req) }, ...req.messages],
        },
        { signal: ctx.signal },
      );

      let inputTokens = 0;
      let outputTokens = 0;
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) yield { type: 'delta', text: delta };
        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens ?? 0;
          outputTokens = chunk.usage.completion_tokens ?? 0;
        }
      }
      yield { type: 'usage', inputTokens, outputTokens };
      yield { type: 'done' };
    },
  };
}

export const openaiProvider = makeOpenAiLike({
  id: 'openai',
  displayName: 'OpenAI',
  needsApiKey: true,
  strictOpenAi: true,
  staticModels: [
    { id: 'gpt-5.4', label: 'GPT-5.4' },
    { id: 'gpt-5.4-mini', label: 'GPT-5.4 mini (fast/cheap)' },
  ],
});

export const openaiCompatibleProvider = makeOpenAiLike({
  id: 'openai-compatible',
  displayName: 'OpenAI-compatible endpoint',
  needsApiKey: false,
  strictOpenAi: false,
});
