# Adding an LLM provider

One file + one registry line. ~150 lines for a typical vendor.

1. Create `src/main/services/llm/<vendor>.ts` implementing `LlmProvider`
   (`src/main/services/llm/provider.ts`):

```ts
import type { LlmEvent, LlmRequest, ModelInfo, VerifyResult } from '../../../shared/types';
import type { LlmProvider, ProviderContext } from './provider';

export const myVendorProvider: LlmProvider = {
  id: 'my-vendor',          // also the keychain id for its API key
  displayName: 'My Vendor',
  needsApiKey: true,

  async listModels(ctx) { /* hit the vendor's list endpoint; static fallback */ },
  async verify(ctx)     { /* cheap authenticated GET; map 401 → friendly msg */ },

  async *stream(req: LlmRequest, ctx: ProviderContext): AsyncIterable<LlmEvent> {
    // 1. map req.system (SystemBlock[]) + req.messages to the vendor format
    // 2. open the streaming call, honoring ctx.signal for cancellation
    // 3. yield {type:'delta', text} per token
    // 4. yield {type:'usage', inputTokens, outputTokens} then {type:'done'}
  },
};
```

2. Register it in `src/main/services/llm/registry.ts` (import + add to the array).
   If the vendor's API key should fall back to an env var in dev, add the
   mapping in `src/main/services/secrets.ts`.

3. If the API is OpenAI-compatible, skip all of the above — point the built-in
   **OpenAI-compatible** provider at its base URL instead. Only write a provider
   for genuinely different APIs.

Notes:
- Don't implement watchdogs, retries, or cost accounting — `run-answer.ts`
  owns those for every provider.
- `req.system` blocks with `cacheable: true` map to prompt caching if your
  vendor has it; otherwise just join the texts.
- Throw on failure; `run-answer.ts` converts errors to friendly messages and
  drives the fallback chain.
