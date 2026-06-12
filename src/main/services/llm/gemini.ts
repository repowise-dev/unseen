import { GoogleGenAI } from '@google/genai';
import type { LlmEvent, LlmRequest, ModelInfo, VerifyResult } from '../../../shared/types';
import { joinSystem, type LlmProvider, type ProviderContext } from './provider';

const STATIC_MODELS: ModelInfo[] = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (fast)' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
];

export const geminiProvider: LlmProvider = {
  id: 'gemini',
  displayName: 'Google (Gemini)',
  needsApiKey: true,

  async listModels(ctx) {
    if (!ctx.apiKey) return STATIC_MODELS;
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?pageSize=50&key=${encodeURIComponent(ctx.apiKey)}`,
      );
      if (!res.ok) return STATIC_MODELS;
      const body = (await res.json()) as {
        models?: { name: string; displayName?: string; supportedGenerationMethods?: string[] }[];
      };
      const models = (body.models ?? [])
        .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m) => ({ id: m.name.replace(/^models\//, ''), label: m.displayName }));
      return models.length ? models : STATIC_MODELS;
    } catch {
      return STATIC_MODELS;
    }
  },

  async verify(ctx): Promise<VerifyResult> {
    if (!ctx.apiKey) return { ok: false, message: 'No API key set.' };
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1&key=${encodeURIComponent(ctx.apiKey)}`,
      );
      if (res.status === 400 || res.status === 403) {
        return { ok: false, message: 'Invalid API key.' };
      }
      if (!res.ok) return { ok: false, message: `HTTP ${res.status}` };
      return { ok: true };
    } catch (err) {
      return { ok: false, message: `Network error: ${String(err)}` };
    }
  },

  async *stream(req: LlmRequest, ctx: ProviderContext): AsyncIterable<LlmEvent> {
    const ai = new GoogleGenAI({ apiKey: ctx.apiKey ?? '' });
    const stream = await ai.models.generateContentStream({
      model: req.model,
      contents: req.messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      config: {
        systemInstruction: joinSystem(req),
        maxOutputTokens: req.maxTokens,
        temperature: req.temperature,
        abortSignal: ctx.signal,
      },
    });

    let inputTokens = 0;
    let outputTokens = 0;
    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) yield { type: 'delta', text };
      if (chunk.usageMetadata) {
        inputTokens = chunk.usageMetadata.promptTokenCount ?? 0;
        outputTokens = chunk.usageMetadata.candidatesTokenCount ?? 0;
      }
    }
    yield { type: 'usage', inputTokens, outputTokens };
    yield { type: 'done' };
  },
};
