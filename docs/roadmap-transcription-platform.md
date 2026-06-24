# Engram → Personal Transcription & Memory Platform

**Status:** Phases 1–4 implemented (branch `feat/transcription-platform`); Phase 5 deferred (separate project)
**Author:** brainstormed 2026-06-24

> **Implementation status (2026-06-24)**
> - **Phase 1 — dictation:** done. Hotkey toggle, non-focusing HUD, single-speaker STT,
>   LLM cleanup pass, clipboard-paste insertion + manual-paste fallback, Accessibility
>   gate, per-app exclude, wizard card. Runtime acceptance (paste into real apps,
>   clipboard restore) needs a GUI session + mic + Deepgram key + Accessibility to verify.
> - **Phase 2 — log + distillation:** done + unit-tested (idempotent merge). Daily JSONL
>   log, distill job, fact injection via the knowledge layer, "Distill now" UI.
> - **Phase 3 — namespaces + Notes:** done in code. Namespaces/combine, watched MD sources,
>   Apple Notes ingestion (JXA typed text + Media PNG handwriting), swappable offline OCR
>   seam (weights not vendored — see `docs/ocr-sidecar.md`), health notifications,
>   self-installing LaunchAgent + `--sync` headless entry. Notes/OCR/LaunchAgent need a
>   real macOS session to verify end-to-end.
> - **Phase 4 — iCloud sync:** done. Configurable `dataDir` (+ migration), append-only
>   log merge (sort+dedupe) and single-distiller lock, both unit-tested; frozen layout in
>   `docs/data-layout.md`. Cross-device propagation needs two Macs to verify.
> - **Phase 5 — native iOS:** deferred by design (separate SwiftUI project); unblocked now
>   that the on-disk format is frozen.
**Scope:** Extend Engram from a meeting assistant into a default, system-wide
transcription tool with a personal/work memory layer, Apple Notes ingestion,
and cross-device sync.

---

## 1. Vision

Engram becomes a transcription **engine** with three surfaces sharing one
STT + LLM + storage core:

1. **Dictation mode** — tap a global hotkey, talk into *any* text field in *any*
   app, get cleaned text inserted at the cursor.
2. **Meeting mode** — the existing overlay assistant.
3. **Memory layer** — every dictation and meeting feeds a per-day log; a
   distillation job turns logs into a structured, accumulating knowledge base
   ("the graph") split into **personal** and **work** namespaces, combinable on
   demand. Apple Notes (incl. handwriting) is ingested into memory automatically.

All data is local-first, stored in **iCloud** so a second Mac "just works" after
cloning. iPhone/iPad is a future **native** client (separate codebase) reading
the same iCloud data.

---

## 2. Locked decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Dictation text insertion | **Clipboard-paste with save/restore** via synthesized ⌘V. (This is what Wispr Flow actually does; char-by-char typing mangles autocomplete/IME/non-QWERTY.) |
| 2 | Dictation trigger | **Tap-to-start / tap-to-stop** toggle. Live interim text in a HUD; on stop, run cleanup pass → paste. |
| 3 | Hotkey mechanism | Electron `globalShortcut` (dedicated chord). **No low-level `CGEventTap`** — avoids the stuck-modifier class of bugs. |
| 4 | "Graph" | **Knowledge base first** (distilled facts → injected context). Visual node/edge graph (Graphiti/Graphify-style) parked for later — the substrate feeds it cleanly when wanted. |
| 5 | Memory namespaces | `personal` + `work`, with a **combine** flag. Rides on existing profile→knowledge model. |
| 6 | Apple Notes extraction | **Hybrid, app-driven, update-resilient:** AppleScript/JXA for typed text + metadata (official, stable API); read Apple's **pre-rendered drawing PNGs** from the `Media/` folder for handwriting. **Never decode the gzipped protobuf** (the brittle part). |
| 7 | OCR | **Open-source, local, vendored.** PaddleOCR-VL-1.5 (runs on Apple Metal) as default; TrOCR-large-handwritten as fallback. No cloud, no Claude OCR. |
| 8 | Scheduling | App **installs its own LaunchAgent** (no manual Shortcuts setup). Health-check + notify-on-anomaly for graceful degradation. |
| 9 | Sync | Data dir → **iCloud Drive** folder. Append-friendly JSONL. Eventual consistency (not real-time). |
| 10 | Privacy | **Minimal** (single user): pause + per-app exclude list. No auto-redaction. |
| 11 | iPhone/iPad | **Phase 5** — native SwiftUI app + custom keyboard extension reading the same iCloud data. Separate project. |

---

## 3. How this maps onto the existing codebase

The leverage is high — most of the hard primitives already exist.

| New capability | Reuses |
|----------------|--------|
| Dictation HUD | overlay window machinery (`windows/overlay.ts`), `SttClient` (`renderer/overlay/stt/client.ts`), `transcript-store.ts` |
| Filler cleanup | profiles-as-data + `llm/run-answer.ts` orchestration + prompt caching |
| Daily log | `services/sessions.ts` JSONL pattern, generalized to a day-scoped event log |
| Graph/distillation | `services/knowledge.ts` + `services/prompt-builder.ts` (cacheable blocks) |
| Namespaces / combine | profile → knowledge-file references (`profile-schema.ts`) |
| Hotkey | `main/shortcuts.ts` (`globalShortcut`) |
| Settings/secrets | `services/settings.ts`, `services/secrets.ts` |

**Net-new code:** text insertion service, dictation controller/HUD, distillation
job, notes-ingestion service + OSS-OCR sidecar, LaunchAgent installer,
iCloud data-dir setting.

> **Data dir note:** today storage is `app.getPath('userData')` (macOS:
> `~/Library/Application Support/Engram`). Phases below introduce a configurable
> `dataDir` so it can point at iCloud. All services must route through one helper
> (`paths.ts`) instead of calling `app.getPath('userData')` directly.

---

## 4. Phase 1 — System-wide dictation

**Goal:** Tap hotkey anywhere → talk → cleaned text appears at the cursor.

### 4.1 New / changed files

```
src/main/
  services/
    insertion/
      index.ts            # insertText(text): save clipboard → write → ⌘V → restore
      paste-macos.ts      # CGEvent ⌘V via a tiny native/AppleScript helper
    dictation/
      cleanup-profile.ts  # loads built-in "dictation-cleanup" profile
  windows/
    dictation-hud.ts      # small frameless always-on-top HUD (mirrors overlay.ts)
  permissions.ts          # checks/prompts macOS Accessibility permission
src/renderer/
  dictation/              # NEW renderer (3rd entry in electron.vite.config.ts)
    index.html
    main.tsx
    Hud.tsx               # mic state + live interim text
    controller.ts         # STT(single-speaker) → interim → on-stop cleanup → IPC insert
    store.ts              # zustand: idle | listening | cleaning | inserting
profiles/
  dictation-cleanup.yaml  # NEW built-in profile
```

### 4.2 Hotkey

Add to `DEFAULT_SETTINGS.hotkeys` in `src/shared/constants.ts`:

```ts
dictation: 'CommandOrControl+Shift+D',
```

Register in `src/main/shortcuts.ts` — a **toggle**:

```ts
[hk.dictation, toggleDictation],   // start if idle, stop+insert if listening
```

`toggleDictation()` shows/focuses the HUD and sends a start/stop event to the
dictation renderer (new IPC events `evDictationStart` / `evDictationStop`).

### 4.3 STT reuse (single-speaker)

`renderer/dictation/controller.ts` reuses `SttClient` exactly like the overlay,
but:
- `diarize: false` (one speaker),
- shorter endpointing for snappier finalization,
- accumulates finals into a single buffer (no rolling retention window).

It calls the same `IPC.sttDescriptor` to get the Deepgram WebSocket descriptor.

### 4.4 Cleanup pass

New built-in profile `profiles/dictation-cleanup.yaml`:

```yaml
id: dictation-cleanup
name: Dictation Cleanup
system: |
  You clean up dictated speech for insertion into a text field.
  Remove filler words (um, uh, like, you know), false starts, and stutters.
  Fix punctuation and capitalization. Keep the user's wording and meaning.
  Output ONLY the cleaned text — no preamble, no quotes, no commentary.
style: raw
maxTokens: 1000
```

On **stop**, controller sends the raw buffer through the existing answer path
(`IPC.answerStart` / `llm/run-answer.ts`) using this profile, model = a fast one
(e.g. `claude-haiku-4-5`). Streams into the HUD so the user sees cleanup happen,
then the final text goes to insertion.

> Latency model: HUD shows live interim while talking; ~300–800ms cleanup delay
> after stop, then paste. Acceptable and matches Superwhisper/Wispr feel.

### 4.5 Text insertion (the net-new bit)

`services/insertion/index.ts`:

```ts
export async function insertText(text: string): Promise<void> {
  const prev = clipboard.readText();          // save
  clipboard.writeText(text);                  // stage
  await pasteKeystroke();                      // synth ⌘V (CGEvent)
  await delay(120);                            // let target app consume paste
  clipboard.writeText(prev);                   // restore
}
```

`pasteKeystroke()` options (decide at impl time):
- **Preferred:** a tiny bundled Swift/ObjC helper that posts a `CGEvent` ⌘V
  (most reliable, what Wispr does).
- **Quick start:** AppleScript `tell application "System Events" to keystroke "v" using command down`.

Both need **Accessibility permission**.

### 4.6 Permissions onboarding

`main/permissions.ts`: on first dictation use, check
`systemPreferences.isTrustedAccessibilityClient(true)` (prompts the user).
Add a card to the existing first-run `Wizard.tsx` explaining mic + Accessibility.

### 4.7 New IPC

Add to `src/shared/ipc-contract.ts`:

```ts
// dictation
dictationInsert: 'dictation:insert',     // renderer → main: insert cleaned text
evDictationStart: 'dictation:start',     // main → dictation renderer
evDictationStop: 'dictation:stop',
permAccessibility: 'perm:accessibility', // check/prompt
```

### 4.8 Settings additions

```ts
dictation: {
  enabled: true,
  model: 'claude-haiku-4-5',   // cleanup model
  excludeApps: [] as string[], // per-app exclusion (Phase 1 privacy)
  logToMemory: true,           // wired in Phase 2
}
```

### 4.9 Phase 1 acceptance

- [ ] Hotkey toggles HUD from any app.
- [ ] Speech appears as live interim, finalizes on stop.
- [ ] Cleaned text is inserted at the cursor in TextEdit, Chrome, Slack, VS Code.
- [ ] Clipboard contents are unchanged afterward.
- [ ] Accessibility permission flow works from a clean machine.
- [ ] Excluded apps (front app in `excludeApps`) skip insertion + logging.

---

## 5. Phase 2 — Daily log + distillation

**Goal:** Everything transcribed feeds a per-day log; an LLM job distills it into
structured facts.

### 5.1 Daily log

Generalize `services/sessions.ts` into a day-scoped **event log**:

```
<dataDir>/memory/log/2026-06-24.jsonl
```

Each line:

```jsonc
{ "t": 1750000000000, "kind": "dictation|meeting|note",
  "ns": "personal|work", "app": "Slack", "text": "...", "sessionId": "..." }
```

- Dictation controller appends a `dictation` event after each insertion
  (respecting `excludeApps` and `logToMemory`).
- Meeting `final` events also append (with `kind: "meeting"`).
- Append-only → naturally sync/merge-friendly (Phase 4).

New file: `services/memory/log.ts` (`appendLogEvent`, `readDay`, `dayPath`).

### 5.2 Distillation job

`services/memory/distill.ts`:

- Input: a day's log (or a range).
- Uses existing `llm/run-answer.ts` with a built-in `memory-distill` profile.
- Output: structured facts — entities, people, topics, decisions, preferences,
  recurring phrases — as JSON, written to:

```
<dataDir>/memory/facts/<ns>/<YYYY-MM-DD>.json
```

- **Idempotent merge:** dedupe facts by a stable key (e.g. normalized
  subject+predicate) so re-running or syncing two devices doesn't duplicate.

Trigger: end-of-day via the LaunchAgent (Phase 3) **and** an on-demand
"Distill now" button in Settings.

### 5.3 Feeding the knowledge base

`services/knowledge.ts` is extended to load auto-generated fact files (per
namespace) as cacheable blocks, alongside hand-imported files. The accumulating
fact set per namespace **is** "the graph" v1.

### 5.4 Phase 2 acceptance

- [ ] Each dictation/meeting appends to today's log JSONL.
- [ ] "Distill now" produces a deduped facts file.
- [ ] Re-running distillation does not duplicate facts.
- [ ] Distilled facts are injectable into prompts via knowledge layer.

---

## 6. Phase 3 — Memory namespaces + Apple Notes ingestion

### 6.1 Namespaces

- Folder layout: `memory/{log,facts}/{personal,work}/`.
- `work` is seeded by pointing at a folder of work MDs (and individual MDs).
- Profiles gain a `memory` field:

```yaml
memory:
  namespaces: [work]      # or [personal] or [personal, work] to COMBINE
```

`prompt-builder.ts` includes the fact blocks for the listed namespaces. "Combine
when needed" = a profile (or a runtime toggle) listing both.

### 6.2 "Point it at a specific MD"

Settings UI (new **Memory** tab) lets you:
- Add watched folders per namespace (work MD folder, Obsidian vault, etc.).
- Pin individual MD files into a namespace.

These are read straight in (already markdown — no OCR).

### 6.3 Apple Notes ingestion (app-driven, update-resilient)

New file: `services/notes/apple-notes.ts`. Two **stable** surfaces only:

1. **Typed text + metadata** → AppleScript/JXA (official Notes scripting API).
   Enumerate notes modified since last run; pull title, folder, body text,
   dates.
2. **Handwriting** → read Apple's **pre-rendered PNGs** from
   `~/Library/Group Containers/group.com.apple.notes/.../Media/`
   (addressed via attachment `ZIDENTIFIER`). **No protobuf decode.**

OCR step: `services/notes/ocr-sidecar.ts` shells out to a **vendored OSS OCR**
process (PaddleOCR-VL-1.5 on Metal; TrOCR-handwritten fallback). PNG → text.

Pipeline:

```
changed notes → typed text (AppleScript) + handwriting PNGs (Media/)
             → OCR PNGs (local OSS sidecar)
             → append to memory/log (kind: "note", ns from note folder mapping)
             → next distill picks them up
```

Namespace mapping: a settings rule maps Notes folders → `personal`/`work`
(default `personal`).

### 6.4 Scheduler (LaunchAgent the app installs)

`main/launch-agent.ts`:
- On first run (with consent), write a LaunchAgent plist to
  `~/Library/LaunchAgents/ai.unseen.sync.plist` that runs a bundled sync script
  on a schedule (e.g. hourly + at a fixed end-of-day time).
- The script runs: notes ingestion → distillation. Independent of the main
  window being open.
- **No manual Shortcuts setup.**

### 6.5 Resilience (graceful degradation)

`services/notes/health.ts`:
- After each run, if AppleScript returns 0 notes when notes exist, or the
  `Media/` path is missing/changed → log an anomaly and **post a native
  notification** ("Notes sync found nothing — Engram may need an update").
- Worst case after a macOS update = a heads-up, not silent data loss.

### 6.6 Vendoring the OCR sidecar

- Bundle a self-contained OCR runtime (model weights + minimal Python/binary) so
  it depends on nothing in macOS → update-proof.
- Document footprint (hundreds of MB) in `docs/`.
- Sidecar contract: stdin/path-in → JSON `{ text }` out, so the engine can be
  swapped (Paddle ↔ TrOCR) without touching callers.

### 6.7 Phase 3 acceptance

- [ ] Work/personal namespaces load independently; a "combine" profile loads both.
- [ ] Pointing at a work MD folder ingests those files.
- [ ] Typed Apple Notes appear in memory automatically.
- [ ] Handwritten Apple Notes are OCR'd locally and appear in memory.
- [ ] OCR runs fully offline (no network).
- [ ] LaunchAgent runs the sync without the app window open.
- [ ] Simulated extraction failure produces a notification, not a silent drop.

---

## 7. Phase 4 — iCloud cross-device sync

**Goal:** Clone Engram on a second Mac → same logs/graph for the day.

### 7.1 Configurable data dir

- Add `dataDir` setting; introduce `services/paths.ts` as the single source for
  all storage paths. Migrate every `app.getPath('userData')` call to route
  through it.
- Default option in Settings: **"Store data in iCloud"** →
  `~/Library/Mobile Documents/com~apple~CloudDocs/Engram/`.
- One-time migration: copy existing `userData` contents into the chosen dir.

### 7.2 Sync mechanics

- iCloud Drive handles file sync; eventual consistency (not real-time).
- JSONL logs are **append-only** → concurrent edits from two Macs rarely truly
  conflict; merge = sort lines by `t` + dedupe by `(t, kind, text)`.
- Facts files: distillation merge is idempotent (Phase 2) → safe to run on
  either device.
- **Single distiller rule:** to avoid two Macs distilling the same day twice,
  use a lightweight per-day lock file (`facts/<ns>/<date>.lock` with device id +
  timestamp) or designate a primary device in settings.

### 7.3 Folder contract (so the future iOS app slots in)

Freeze the on-disk layout now:

```
Engram/
  memory/
    log/<YYYY-MM-DD>.jsonl
    facts/{personal,work}/<YYYY-MM-DD>.json
  knowledge/            # hand-imported + pinned MDs
  sessions/             # meeting JSONL (existing)
  settings.json
  # secrets.json stays in userData (keychain-encrypted), NOT iCloud
```

> Secrets never go to iCloud — keep `secrets.json` in local `userData`.

### 7.4 Phase 4 acceptance

- [ ] Switching data dir to iCloud migrates existing data.
- [ ] A dictation on Mac A appears in the day's log on Mac B after sync.
- [ ] Two devices appending the same day produce a clean merged log.
- [ ] Distillation does not double-run across devices.
- [ ] Secrets are not synced.

---

## 8. Phase 5 — Native iPhone/iPad client (future, separate project)

**Why separate:** iOS can't run Electron, and **system-wide text insertion is
forbidden** — the only sanctioned "dictate into any field" mechanism is a
**custom keyboard extension** (this is exactly how Wispr Flow's iOS app works).

- **App:** SwiftUI client reading the same iCloud folder (use a single known
  iCloud Drive folder, not an app-private container, so it matches what the
  Electron app writes).
- **Dictation:** custom keyboard extension → mic → STT → cleanup → insert into
  focused field.
- **Memory:** read-only or read/write against the same `memory/` layout.
- Build only after the on-disk format (Phase 4) is stable, to avoid maintaining
  two clients against a moving target.

---

## 9. Cross-cutting concerns

### Privacy (minimal, single-user)
- Pause hotkey suppresses logging.
- Per-app exclude list (`dictation.excludeApps`): skip insertion + logging when
  the front app matches.
- No auto-redaction in v1 (revisit if ever multi-user).
- Secrets stay local + keychain-encrypted, never in iCloud.

### New dependencies
- OSS OCR runtime + model weights (vendored, ~hundreds of MB).
- Optional tiny Swift/ObjC helper for `CGEvent` paste.
- No new cloud services (iCloud only; no backend).

### Key risks
| Risk | Mitigation |
|------|-----------|
| Apple Notes surfaces change on OS update | Stand only on AppleScript + `Media/` PNGs; health-check + notify; never touch protobuf. |
| Paste insertion fails in some app | Fallback: leave text on clipboard + notify (like Wispr's manual-paste fallback). |
| iCloud sync conflicts | Append-only JSONL + idempotent fact merge + single-distiller lock. |
| OCR accuracy on user's handwriting | Default PaddleOCR-VL; swap to TrOCR-handwritten via sidecar contract; it's one writer, so tunable. |
| Cleanup adds latency | Fast model (Haiku) + stream into HUD so it feels responsive. |

---

## 10. Suggested sequencing

1. **Phase 1** (dictation) — highest daily value, mostly recombination.
2. **Phase 2** (log + distillation) — turns usage into memory.
3. **Phase 3** (namespaces + Notes ingestion) — the differentiator.
4. **Phase 4** (iCloud sync) — second Mac.
5. **Phase 5** (native iOS) — only after the data format is frozen.

Ship Phase 1 end-to-end before starting Phase 2; each phase is independently
useful.
