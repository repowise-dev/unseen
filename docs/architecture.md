# Architecture

```
┌────────────────────── renderer (overlay) ──────────────────────┐
│ mic (getUserMedia) → MediaRecorder → SttClient ── WS ──────────┼──► STT vendor
│                                        │ parser (per provider)  │
│                                        ▼                        │
│                                TranscriptStore                  │
│                                        │ new finals             │
│                                        ▼                        │
│                               trigger-engine ── fire ──┐        │
│                                                        ▼        │
│ AnswerFeed ◄── answer:delta events ◄────────── answerStart IPC  │
└─────────────────────────────────────────────────────────────────┘
                                                         │
┌───────────────────────── main process ─────────────────▼────────┐
│ profiles.ts (YAML, hot-reload)   knowledge.ts (files)            │
│        └────────► prompt-builder ◄────────┘                      │
│                        │ LlmRequest                              │
│                        ▼                                         │
│ run-answer.ts: watchdog · abort · usage/cost · fallback chain    │
│                        │                                         │
│        llm/registry → anthropic | openai | gemini | ollama | …  ─┼──► LLM vendor
│                                                                  │
│ settings.ts (JSON)   secrets.ts (safeStorage)   stt/registry     │
└──────────────────────────────────────────────────────────────────┘
```

## Process split

- **Main** owns everything secret or privileged: API keys, settings, profile
  loading, LLM streaming, window management, global hotkeys.
- **Renderer (overlay)** owns audio capture (getUserMedia must run there), the
  transcript model, trigger evaluation, and rendering. It receives a
  *connection descriptor* for STT (URL + ephemeral token) — never stored keys.
- **Preload** exposes the typed `window.unseen` API; channel names live in
  `src/shared/ipc-contract.ts` so main and preload can't drift.

## Key flows

**Answer flow**: renderer detects a trigger → `answerStart` IPC with transcript
context → main builds the request (profile prompt + knowledge as cacheable
system blocks; transcript in the user message) → provider streams → deltas
forwarded as `answer:delta` events → renderer renders streaming markdown.
A new request aborts the previous one; a 15s stall trips the watchdog; if the
primary provider dies before first token, the fallback chain is tried.

**STT flow**: renderer asks main for a descriptor (key stays in main, token
rides the WS subprotocol) → generic `SttClient` runs the connection with
keepalive + single-path reconnect → per-provider parser normalizes messages →
`TranscriptStore` keeps a rolling, diarized window with an `answeredUpTo`
pointer so the same question never re-fires.

## Design rules

1. Behavior is data: anything use-case-specific belongs in a profile YAML, not code.
2. Vendors are plugins: one interface, one file, one registry line.
3. Pure logic stays pure: trigger engine, transcript store, prompt builder,
   markdown, and parsers have no Electron/DOM imports and are unit-tested.
4. Secrets stay in main.
