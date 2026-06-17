# Unseen

**An open-source, on-screen AI copilot for live conversations.** Unseen listens to your meeting, transcribes it in real time, and surfaces answers, notes, and talking points in a floating panel — one that (optionally) never shows up in your screen share.

Bring your own AI: **Anthropic Claude, OpenAI, Google Gemini, Ollama (fully local), or any OpenAI-compatible endpoint** (LM Studio, Groq, OpenRouter, vLLM, …).

> The copilot only you can see — your notes, answers, and prompts stay out of your screen share and on your machine.
<table> <tr> <td width="110" valign="top">
<img width="98" height="98" alt="Screenshot 2026-06-07 at 4 11 50 PM" src="https://github.com/user-attachments/assets/58c6a45f-7ce8-4c5c-8cdb-3f77603d855a" />
</td> <td valign="top">
Built with ❤️ using Repowise

Unseen was built with Repowise, an open-source code intelligence platform that continuously maps your codebase into structured knowledge for both humans and AI coding agents. 

Beyond documentation, Repowise continuously monitors **code health**, highlighting architectural hotspots, files likely to become bug-prone, and refactoring opportunities before they slow development.

⭐ If you're building AI-powered software, check out Repowise: https://github.com/repowise-dev/repowise
</td> </tr> </table>

## What it does

```
mic → streaming STT (Deepgram nova-3, diarized)
    → rolling transcript with speaker turns
    → trigger engine (questions, requests, code asks, keywords — per profile)
    → your chosen LLM (streaming, prompt-cached)
    → live answer feed in a floating, capture-invisible overlay
```

Behavior is driven by **profiles** — plain YAML files that define the prompt, when the copilot speaks up, and how it answers:

| Profile | What it does |
|---|---|
| 📝 Meeting Notes | Silent minute-taker: decisions, action items, open questions on demand |
| 💬 Q&A Overlay | Answers any question asked in the room, instantly |
| 📈 Sales Call Assistant | Objection handling grounded in your product docs |
| 🛟 Support Agent | Answers grounded in your documentation, diagnostic steps |
| 🎓 Lecture Companion | Explains jargon and concepts as you listen |
| 🎯 Interview Practice | Mock-interview coach: staged design walkthroughs, real code |
| 💡 Brainstorm Scribe | Clusters ideas, tracks threads, suggests unexplored angles |

Adding your own use case = writing one YAML file. No code.

## Install

**Download an installer** from [Releases](https://github.com/repowise-dev/unseen/releases) — dmg (macOS), exe (Windows), AppImage/deb (Linux).

> Builds are not yet code-signed: on macOS right-click the app → **Open** the first time; on Windows click "More info → Run anyway" in SmartScreen.

**Or run from source:**

```bash
git clone https://github.com/repowise-dev/unseen && cd unseen
npm install
npm run dev
```

`npm run dist` builds the installer for your platform into `release/`.

First run: open Settings (⚙ in the overlay) → Providers → pick your LLM, paste keys (stored in your OS keychain), Test, done. You need:

- a **Deepgram** API key for transcription (generous free tier), and
- an LLM: an **Anthropic / OpenAI / Gemini** key — or **no key at all** with [Ollama](https://ollama.com) running locally.


## Hotkeys

| Default | Action |
|---|---|
| ⌘⇧\\ | show / hide the overlay |
| ⌘⇧Space | answer the latest thing said ("Ask now") |
| ⌘⇧P | pause / resume listening |
| ⌘⇧] | cycle profile |
| ⌘⇧H | toggle Privacy Mode |

All remappable via `hotkeys` in settings.json (`Ctrl` on Windows/Linux).

## Privacy Mode

The overlay is excluded from OS-level screen capture (`NSWindow.sharingType = .none` on macOS, `WDA_EXCLUDEFROMCAPTURE` on Windows): your notes don't leak into your screen share. It's a visible toggle (🙈/👁) and you can turn it off. Use it responsibly — see [ETHICS.md](ETHICS.md).

## Privacy & data

- Transcripts and answers stay **on your machine**. No telemetry, ever.
- API keys are stored **encrypted in your OS keychain** (Electron `safeStorage`).
- Recording-consent laws vary by jurisdiction — **get consent before transcribing other people**. See [docs/privacy-and-consent.md](docs/privacy-and-consent.md).

## Extending

| Want to add… | Touch | Docs |
|---|---|---|
| A use case | 1 YAML file in your profiles folder | [docs/profiles.md](docs/profiles.md) |
| An LLM vendor | one `LlmProvider` implementation | [docs/extending/llm-provider.md](docs/extending/llm-provider.md) |
| An STT vendor | one `SttProvider` + one parser | [docs/extending/stt-provider.md](docs/extending/stt-provider.md) |
| A trigger detector | one pure function | [docs/extending/detector.md](docs/extending/detector.md) |

Architecture overview: [docs/architecture.md](docs/architecture.md).

## Capturing the other side of the call

The default pipeline captures your mic. To transcribe the other participants too, route system audio into a virtual device and pick it in Settings → Audio — guide: [docs/system-audio.md](docs/system-audio.md).

## Contributing

PRs welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). Good first contributions: a new profile, a trigger detector, price-table updates, a new provider.

## License

[MIT](LICENSE)
