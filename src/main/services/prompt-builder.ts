// Pure module (no Electron imports) — turns a profile + knowledge + transcript
// into a provider-agnostic LlmRequest. Unit-tested in tests/prompt-builder.test.ts.

import type { LlmRequest, Profile, Settings, SystemBlock } from '../../shared/types';
import { renderTemplate } from '../../shared/template';

export interface KnowledgeInput {
  name: string;
  text: string;
}

export interface BuildAnswerOpts {
  profile: Profile;
  knowledge: KnowledgeInput[];
  /** Distilled memory facts per namespace; injected as cacheable blocks. */
  memory?: KnowledgeInput[];
  settings: Settings;
  fullTranscript: string;
  newSegment: string;
  userSpeaker: number;
  forced: boolean;
  codeMode: boolean;
}

const STYLE_SUFFIX: Record<Profile['prompt']['response_style'], string> = {
  spoken: `
OUTPUT STYLE — SPOKEN:
- Every word must be natural to read aloud. Lead with the direct answer in the first line; no throat-clearing.
- Short phrases, one thought per line. Max ~120 words for talking answers (code/diagrams excepted).
- Never output meta-commentary like "Here's what to say" — everything you write IS what the human says.
- Reply with exactly SKIP if there is nothing actionable in the new segment.`,
  notes: `
OUTPUT STYLE — NOTES:
- Output terse bullet notes, not prose. Group under short bold headers when useful.
- Capture decisions, action items (with owners if stated), open questions, and key facts.
- Reply with exactly SKIP if there is nothing new worth noting.`,
  'code-first': `
OUTPUT STYLE — CODE-FIRST:
- When code is asked for, output complete, runnable code in a fenced block with the language tag — real types, imports, no pseudocode, no TODO stubs.
- Use the language requested in the conversation; if none is named, use the language most natural to the discussion so far.
- Keep surrounding explanation to 1-2 short lines.
- Reply with exactly SKIP if there is nothing actionable.`,
};

export function buildAnswerRequest(opts: BuildAnswerOpts): LlmRequest {
  const { profile, knowledge, settings, fullTranscript, newSegment } = opts;

  const renderedSystem = renderTemplate(
    profile.prompt.system,
    { user_speaker: `[S${opts.userSpeaker}]` },
    { knowledge: knowledge.length > 0 },
  );

  const languageLine =
    profile.prompt.language !== 'auto'
      ? `\nAlways answer in ${profile.prompt.language}.`
      : '';

  // Static blocks first and marked cacheable so Anthropic prompt caching gets
  // a stable prefix; the moving transcript goes in the user message instead.
  const system: SystemBlock[] = [
    {
      text: renderedSystem + STYLE_SUFFIX[profile.prompt.response_style] + languageLine,
      cacheable: true,
    },
    ...knowledge.map((k) => ({
      text: `${profile.knowledge.prompt_label} — ${k.name}:\n${k.text}`,
      cacheable: true,
    })),
    ...(opts.memory ?? []).map((m) => ({
      text: `MEMORY (${m.name}) — distilled facts about the user:\n${m.text}`,
      cacheable: true,
    })),
  ];

  const codeModeLine = opts.codeMode
    ? '\nCODE MODE: the latest request asks for code. Output a complete, working fenced code block; keep explanation to 1-2 lines.'
    : '';

  const directive = opts.forced
    ? 'The user explicitly requested help RIGHT NOW. Respond to the very LAST thing said in the conversation. Do NOT skip. Do NOT re-answer old questions.'
    : 'Look at the NEW SEGMENT. If it contains any question, request, or prompt directed at your user — even if they have already started responding — answer it now. Only reply SKIP if the new segment is purely acknowledgments with zero questions or requests.';

  const messages: LlmRequest['messages'] = [
    {
      role: 'user',
      content: `FULL CONVERSATION SO FAR:\n${fullTranscript}\n\nNEW SEGMENT TO ANSWER:\n${newSegment}\n\n${directive}${codeModeLine}`,
    },
  ];

  return {
    system,
    messages,
    model: profile.llm?.model ?? settings.llm.model,
    maxTokens: profile.llm?.maxTokens ?? settings.llm.maxTokens,
    temperature: profile.llm?.temperature ?? settings.llm.temperature ?? undefined,
  };
}
