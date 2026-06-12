# Adding an STT provider

An STT provider has two halves, because audio capture must run in the renderer
while API keys must stay in main:

## 1. Main half — connection descriptor

`src/main/services/stt/<vendor>.ts` implementing `SttProvider`:

```ts
export const mySttProvider: SttProvider = {
  id: 'my-stt',
  displayName: 'My STT',
  needsApiKey: true,
  descriptor(settings) {
    // Build the websocket URL + auth (subprotocol token, query param, …)
    // from settings + getSecret('my-stt'). Include keepAlive if the vendor
    // needs pings.
    return { providerId: 'my-stt', wsUrl, protocols, keepAlive };
  },
  async verify(settings) { /* cheap authenticated request */ },
};
```

Register in `src/main/services/stt/registry.ts`.

## 2. Renderer half — message parser

`src/renderer/overlay/stt/parsers/<vendor>.ts`:

```ts
export function parseMyStt(raw: unknown): TranscriptEvent | null {
  // vendor message → {type:'interim', text}
  //                | {type:'final', text, speaker, words?}
  //                | null (ignore)
}
```

Register in `src/renderer/overlay/stt/parsers/index.ts` under the same id.

The generic `SttClient` handles everything else: mic capture, MediaRecorder
chunks, reconnect with backoff, keepalive, pause. You never touch sockets.

Add parser unit tests (see `tests/deepgram-parser.test.ts`).
