# Contributing to Unseen

Thanks for helping! The codebase is deliberately modular — most contributions
touch exactly one file plus a registry entry.

## Dev setup

```bash
npm install
cp .env.example .env   # optional: dev keys; users normally use the keychain
npm run dev            # electron-vite with HMR
```

Checks (CI runs all of these):

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Repo map

```
src/main/               Electron main: windows, IPC, hotkeys
src/main/services/llm/  LLM providers (anthropic, openai, gemini, ollama, openai-compatible)
src/main/services/stt/  STT providers (connection descriptors; keys stay in main)
src/main/services/      profiles, prompt-builder, knowledge, settings, secrets
src/preload/            typed contextBridge API (window.unseen)
src/renderer/overlay/   the floating copilot: transcript store, trigger engine,
                        STT client (reconnect machine), React UI
src/renderer/settings/  settings window
src/shared/             types, IPC channel names, profile schema, template engine
profiles/               built-in profile YAMLs
tests/                  vitest unit tests for the pure modules
```

## Easiest contributions, in order

1. **A new profile** — one YAML in `profiles/`, no code. Schema: `docs/profiles.md`.
2. **Price table updates** — `src/main/services/llm/prices.ts`.
3. **A trigger detector** — pure function in
   `src/renderer/overlay/trigger-engine/detectors.ts` + name in
   `src/shared/profile-schema.ts` + tests.
4. **An LLM provider** — implement `LlmProvider` in one file, register it in
   `registry.ts`. Guide: `docs/extending/llm-provider.md`.
5. **An STT provider** — main-side descriptor + renderer-side parser. Guide:
   `docs/extending/stt-provider.md`.

## Rules of the road

- TypeScript strict; `npm run lint` and `npm test` must pass.
- Pure logic (triggers, transcript, prompt building, parsers) gets unit tests.
- No telemetry, no network calls beyond the user's chosen providers.
- API keys never leave the main process; never log them.
- Keep PRs focused; one change per PR.
