# Privacy & consent

## Your data

- **Transcripts and answers never leave your machine** except as API calls to
  the STT/LLM providers *you* configured.
- **No telemetry.** Unseen phones home to no one. Verify it: grep the source for
  network calls — you'll find only the provider clients.
- **API keys** are encrypted via your OS keychain (Electron `safeStorage`).

## Recording consent

Transcribing a conversation is recording it. Consent law varies:

- Some jurisdictions (e.g. several US states, Germany) require **all-party
  consent**; others require only one party's consent.
- Work meetings may additionally be covered by employer policy.

**Our recommendation: tell people.** "I'm running a note-taker" is normal in
2026, and it keeps you on the right side of both the law and your colleagues.
You are responsible for compliance in your jurisdiction.

## Privacy Mode

Privacy Mode (`setContentProtection`) keeps the overlay out of screen captures —
macOS `NSWindow.sharingType = .none`, Windows `WDA_EXCLUDEFROMCAPTURE`. It
protects *your notes* from leaking into *your screen share*. It does not make
audio capture invisible, and it isn't meant to hide tool use from people
entitled to know — see [ETHICS.md](../ETHICS.md).
