# Engram — your photographic memory

**Engram is the part of your memory that never forgets.** An open-source, local-first transcription engine with a memory that compounds: dictate into any app, capture every meeting, ingest your notes — and it quietly distills all of it into a private, structured knowledge base that you *and* your AI can draw on.

<sub>*engram (n.)* — the physical trace a memory leaves in the brain.</sub>

Bring your own AI: **Anthropic Claude, OpenAI, Google Gemini, Ollama (fully local), or any OpenAI-compatible endpoint** (LM Studio, Groq, OpenRouter, vLLM, …).

> Everything stays on your machine. Talk to it all day; forget nothing.

<table> <tr> <td width="110" valign="top">
<img width="98" height="98" alt="Screenshot 2026-06-07 at 4 11 50 PM" src="https://github.com/user-attachments/assets/58c6a45f-7ce8-4c5c-8cdb-3f77603d855a" />
</td> <td valign="top">
Built with ❤️ using Repowise

Engram was built with Repowise, an open-source code intelligence platform that continuously maps your codebase into structured knowledge for both humans and AI coding agents. 

Beyond documentation, Repowise continuously monitors **code health**, highlighting architectural hotspots, files likely to become bug-prone, and refactoring opportunities before they slow development.

⭐ If you're building AI-powered software, check out Repowise: https://github.com/repowise-dev/repowise
</td> </tr> </table>

## Three surfaces, one memory

Engram is one STT + LLM + storage core wearing three hats:

1. **🎙 Dictation** — tap a hotkey in *any* app, talk into *any* text field, get cleaned-up text inserted at your cursor. Filler words, false starts, and stray punctuation are stripped by a fast LLM pass before the text lands.
2. **💬 Meeting copilot** — the floating, capture-invisible overlay that transcribes live and surfaces answers, notes, and talking points on demand.
3. **🧠 Memory** — every dictation, meeting, and note feeds a per-day log that a distillation job turns into an accumulating, structured knowledge base — split into **personal** and **work**, combinable on demand. That memory is injected back into your prompts, so the more you use Engram, the more context your AI has.

```
dictation ┐
meetings  ├─→ daily log (append-only JSONL) ─→ distill ─→ personal / work facts
notes     ┘                                                      │
                                                                 ▼
                                              injected as context into your prompts
```

## How the copilot works

```
mic → streaming STT (Deepgram nova-3, diarized)
    → rolling transcript with speaker turns
    → trigger engine (questions, requests, code asks, keywords — per profile)
    → your chosen LLM (streaming, prompt-cached, with your distilled memory)
    → live answer feed in a floating, capture-invisible overlay
```

Behavior is driven by **profiles** — plain YAML files that define the prompt, when the copilot speaks up, how it answers, and which memory namespaces it can see:

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

## Dictation

Press **⌘⇧D** in any app to start, talk, and press it again to stop. A small HUD shows your words live; on stop, a fast model cleans them up (streamed so you watch it happen) and the result is pasted at your cursor — clipboard contents restored afterward. If a paste ever fails, the cleaned text is left on your clipboard so you can paste it manually.

- Works in any text field (uses clipboard-paste, not fragile keystroke synthesis).
- macOS needs **Accessibility** permission once (the first-run wizard walks you through it).
- Per-app exclude list: name apps where dictation should never paste or log.

## Memory that writes itself

Everything transcribed accrues into a private knowledge base — no filing, no manual notes:

- **Daily log** — dictations, meeting finals, and ingested notes are appended to `memory/log/<date>.jsonl`.
- **Distillation** — on demand ("Distill now" in Settings → Memory) or on a schedule, an LLM turns the day's log into deduped, structured facts (people, projects, decisions, preferences, recurring terms). Re-running never duplicates.
- **Namespaces** — facts are split into **personal** and **work**; a profile picks which to inject (`memory.namespaces: [work]`, or `[personal, work]` to combine).
- **Watched sources** — point a namespace at markdown files or a folder (work docs, an Obsidian vault) and they're read straight in.
- **Apple Notes** *(macOS)* — typed notes are ingested via the official scripting API; handwriting is read from Apple's pre-rendered images and OCR'd locally and offline (swappable engine; see [docs/ocr-sidecar.md](docs/ocr-sidecar.md)).
- **Background sync** *(macOS)* — Engram can install its own LaunchAgent to run ingestion + distillation on a schedule, even when the window is closed. No manual setup.

## Local-first, with optional iCloud sync

Your data lives on your machine by default. Flip Settings → Memory → **Store data in iCloud** and Engram moves `memory/`, `knowledge/`, and `sessions/` into your iCloud Drive — so a second Mac sees the same logs and memory after cloning. Append-only logs merge cleanly across devices and a per-day lock keeps two Macs from distilling the same day twice. API keys and settings always stay local. The on-disk format is frozen — see [docs/data-layout.md](docs/data-layout.md).

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

On macOS, dictation also asks for **Accessibility** permission so it can paste for you.

## Hotkeys

| Default | Action |
|---|---|
| ⌘⇧D | start / stop dictation (talk into any app) |
| ⌘⇧\\ | show / hide the overlay |
| ⌘⇧Space | answer the latest thing said ("Ask now") |
| ⌘⇧P | pause / resume listening |
| ⌘⇧] | cycle profile |
| ⌘⇧H | toggle Privacy Mode |

All remappable via `hotkeys` in settings.json (`Ctrl` on Windows/Linux).

## Privacy Mode

The overlay is excluded from OS-level screen capture (`NSWindow.sharingType = .none` on macOS, `WDA_EXCLUDEFROMCAPTURE` on Windows): your notes don't leak into your screen share. It's a visible toggle (🙈/👁) and you can turn it off. Use it responsibly — see [ETHICS.md](ETHICS.md).

## Privacy & data

- Transcripts, answers, and your distilled memory stay **on your machine** (or your own iCloud). No telemetry, ever.
- API keys are stored **encrypted in your OS keychain** (Electron `safeStorage`) and **never** sync to iCloud.
- Handwriting OCR runs **fully offline** — no cloud, no Claude OCR.
- Pause and a per-app exclude list let you keep specific apps and moments out of memory entirely.
- Recording-consent laws vary by jurisdiction — **get consent before transcribing other people**. See [docs/privacy-and-consent.md](docs/privacy-and-consent.md).

## Extending

| Want to add… | Touch | Docs |
|---|---|---|
| A use case | 1 YAML file in your profiles folder | [docs/profiles.md](docs/profiles.md) |
| An LLM vendor | one `LlmProvider` implementation | [docs/extending/llm-provider.md](docs/extending/llm-provider.md) |
| An STT vendor | one `SttProvider` + one parser | [docs/extending/stt-provider.md](docs/extending/stt-provider.md) |
| A trigger detector | one pure function | [docs/extending/detector.md](docs/extending/detector.md) |
| An OCR engine | one stdin/path → `{ text }` command | [docs/ocr-sidecar.md](docs/ocr-sidecar.md) |

Architecture overview: [docs/architecture.md](docs/architecture.md).

## Capturing the other side of the call

The default pipeline captures your mic. To transcribe the other participants too, route system audio into a virtual device and pick it in Settings → Audio — guide: [docs/system-audio.md](docs/system-audio.md).

## Contributing

PRs welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). Good first contributions: a new profile, a trigger detector, price-table updates, a new provider.

## License

[MIT](LICENSE)
