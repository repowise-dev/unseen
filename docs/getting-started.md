# Getting started

## Run from source

```bash
git clone https://github.com/repowise-dev/sotto && cd sotto
npm install
npm run dev
```

## First-time setup

1. The floating overlay appears top-left. Click **⚙** to open Settings.
2. **Providers → Transcription**: paste a [Deepgram](https://deepgram.com) API key
   (free tier is plenty) and hit **Test**.
3. **Providers → Answers**: pick your LLM:
   - **Anthropic** (default) / **OpenAI** / **Gemini** — paste a key, **Test**.
   - **Ollama** — no key; install from [ollama.com](https://ollama.com), `ollama pull llama3.2`,
     pick the model from the dropdown.
   - **OpenAI-compatible** — set the base URL (LM Studio: `http://localhost:1234/v1`,
     OpenRouter: `https://openrouter.ai/api/v1`, …) and a key if the service needs one.
4. Grant microphone permission when the overlay asks.
5. Pick a profile from the dropdown in the overlay header and start talking.

Keys are stored encrypted in your OS keychain. For development you can instead
put them in `.env` (see `.env.example`) — stored keys win over env vars.

## Daily use

- The transcript pane shows what's being heard (with speaker tags).
- Answers stream in when the active profile's triggers fire.
- **Ask now** (or ⌘⇧Space) answers the latest thing said, always.
- ⏸ pauses listening; 🙈 toggles Privacy Mode (hidden from screen capture).

## Troubleshooting

- **"missing key" status** — set the Deepgram key in Settings → Providers.
- **No transcript** — check mic permission (System Settings → Privacy → Microphone)
  and the selected device in Settings → Audio.
- **`ollama: cannot reach the API`** — start Ollama (`ollama serve`) and confirm
  the endpoint in Settings → Providers.
- **Answers cut off mid-stream** — the 15s stall watchdog fired; usually a network
  blip. Hit Ask now again.
