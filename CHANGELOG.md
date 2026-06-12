# Changelog

## Unreleased

- Full TypeScript + electron-vite + React rewrite of the original prototype.
- Provider system: Anthropic (default, prompt-cached), OpenAI, Google Gemini,
  Ollama (local), and any OpenAI-compatible endpoint — switchable in Settings.
- Profile system: behavior defined in hot-reloaded YAML files; 7 built-ins
  (meeting notes, Q&A, sales, support, lecture, interview practice, brainstorm).
- Trigger engine with pluggable detectors (question, request, code-request, keyword).
- Settings window: provider/model/key management (OS keychain), audio devices,
  profile switcher.
- Privacy Mode toggle (capture-invisible overlay) with visible state.
- Per-session token + estimated cost display; provider fallback chain.
