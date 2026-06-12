# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for security problems. Use GitHub's
private vulnerability reporting ("Report a vulnerability" under the Security
tab) on this repository. We aim to respond within a week.

## Scope notes

- API keys are stored via Electron `safeStorage` (OS keychain). If you find a
  path where a key reaches the renderer, a log, or disk in plaintext, that's a
  vulnerability — report it.
- The renderer never receives raw provider credentials except the short-lived
  STT websocket token needed to open the audio stream.
- All transcript/answer data is local; anything that exfiltrates it is a bug.
