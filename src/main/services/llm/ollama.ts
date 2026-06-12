import type { LlmEvent, LlmRequest, ModelInfo, VerifyResult } from '../../../shared/types';
import { joinSystem, type LlmProvider, type ProviderContext } from './provider';

// Local Ollama server — no API key, fully offline. Streams NDJSON from /api/chat.

const DEFAULT_URL = 'http://localhost:11434';

export const ollamaProvider: LlmProvider = {
  id: 'ollama',
  displayName: 'Ollama (local)',
  needsApiKey: false,

  async listModels(ctx): Promise<ModelInfo[]> {
    try {
      const res = await fetch(`${ctx.baseURL ?? DEFAULT_URL}/api/tags`);
      if (!res.ok) return [];
      const body = (await res.json()) as { models?: { name: string }[] };
      return (body.models ?? []).map((m) => ({ id: m.name }));
    } catch {
      return [];
    }
  },

  async verify(ctx): Promise<VerifyResult> {
    const url = ctx.baseURL ?? DEFAULT_URL;
    try {
      const res = await fetch(`${url}/api/version`);
      if (!res.ok) return { ok: false, message: `Ollama responded HTTP ${res.status}` };
      const body = (await res.json()) as { version?: string };
      return { ok: true, message: `Ollama ${body.version ?? ''} at ${url}` };
    } catch {
      return {
        ok: false,
        message: `Cannot reach Ollama at ${url}. Is it running? Install: https://ollama.com — then \`ollama pull llama3.2\`.`,
      };
    }
  },

  async *stream(req: LlmRequest, ctx: ProviderContext): AsyncIterable<LlmEvent> {
    const url = ctx.baseURL ?? DEFAULT_URL;
    const res = await fetch(`${url}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: ctx.signal,
      body: JSON.stringify({
        model: req.model,
        stream: true,
        messages: [{ role: 'system', content: joinSystem(req) }, ...req.messages],
        options: {
          num_predict: req.maxTokens,
          ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
        },
      }),
    });
    if (!res.ok || !res.body) {
      throw new Error(`Ollama HTTP ${res.status} — is the model pulled? (ollama pull ${req.model})`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let inputTokens = 0;
    let outputTokens = 0;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        const j = JSON.parse(line) as {
          message?: { content?: string };
          done?: boolean;
          prompt_eval_count?: number;
          eval_count?: number;
        };
        if (j.message?.content) yield { type: 'delta', text: j.message.content };
        if (j.done) {
          inputTokens = j.prompt_eval_count ?? 0;
          outputTokens = j.eval_count ?? 0;
        }
      }
    }
    yield { type: 'usage', inputTokens, outputTokens };
    yield { type: 'done' };
  },
};
