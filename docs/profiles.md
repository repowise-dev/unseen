# Profiles

A profile is one YAML file that defines how the copilot behaves. Built-ins ship
with the app; your own live in the user profiles folder (Settings → Profiles →
"Open profiles folder"). Files hot-reload on save. A user profile with the same
`id` as a built-in overrides it.

## Full schema

```yaml
id: my-profile            # kebab-case, unique
name: My Profile
description: One line shown in pickers.
icon: 🎙️

llm:                      # optional — overrides Settings → Providers for this profile
  model: claude-haiku-4-5
  maxTokens: 1200
  temperature: 0.7

prompt:
  system: |               # the heart of the profile. Template features:
    You assist {{user_speaker}}.        # {{user_speaker}} → e.g. "[S0]"
    {{#knowledge}}Ground answers in the docs below.{{/knowledge}}
                          # {{#knowledge}}...{{/knowledge}} included only when
                          # knowledge files are attached
  response_style: spoken  # spoken | notes | code-first (appends a shared style suffix)
  language: auto          # or a language name → "Always answer in X."

knowledge:
  prompt_label: PRODUCT DOCS    # heading used when injecting files
  files:                        # absolute paths, or relative to <userData>/knowledge/
    - battlecards.md

triggers:
  auto: true                    # evaluate detectors on new speech at all?
  detectors: [question, request, code-request, keyword]
  keywords: ["pricing"]         # used by the keyword detector
  debounce_ms: 1500             # min gap between auto-answers
  min_chars: 8                  # ignore tiny fragments

transcript:                     # optional overrides of global settings
  window_chars: 4000            # how much transcript the LLM sees
  retention_min: 3              # rolling window kept in memory
```

## Detectors

| Name | Fires when |
|---|---|
| `question` | a question is asked ("?", interrogative phrasing) |
| `request` | an imperative request ("walk me through…", "explain…") |
| `code-request` | code is asked for — also switches the answer to code mode |
| `keyword` | any of `triggers.keywords` appears |

"Ask now" (button or hotkey) bypasses all triggers and always answers the latest
thing said.

## The SKIP convention

Profiles instruct the model to reply exactly `SKIP` when there's nothing useful
to say; the UI silently discards those answers. Keep that rule in custom
prompts or the panel gets chatty.

## Tips

- Start by duplicating the built-in closest to your use case.
- Keep system prompts speakable if `response_style: spoken` — the user reads
  your output aloud.
- Knowledge files are injected as cacheable blocks: with Anthropic, repeated
  calls pay ~0.1× for them after the first.
