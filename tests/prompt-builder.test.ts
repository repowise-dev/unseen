import { describe, it, expect } from 'vitest';
import { buildAnswerRequest } from '../src/main/services/prompt-builder';
import type { Profile, Settings } from '../src/shared/types';
import { DEFAULT_SETTINGS } from '../src/shared/constants';

const profile: Profile = {
  id: 'test',
  name: 'Test',
  description: '',
  icon: '🧪',
  prompt: {
    system: 'You help {{user_speaker}}.{{#knowledge}} Use the docs.{{/knowledge}}',
    response_style: 'spoken',
    language: 'auto',
  },
  knowledge: { prompt_label: 'DOCS', files: [] },
  triggers: { auto: true, detectors: ['question'], keywords: [], debounce_ms: 1500, min_chars: 8 },
};

const settings: Settings = DEFAULT_SETTINGS;

const baseOpts = {
  profile,
  knowledge: [],
  settings,
  fullTranscript: '[S0] hello',
  newSegment: '[S1] what is x?',
  userSpeaker: 0,
  forced: false,
  codeMode: false,
};

describe('buildAnswerRequest', () => {
  it('renders the user speaker and drops the knowledge section without files', () => {
    const req = buildAnswerRequest(baseOpts);
    expect(req.system[0].text).toContain('You help [S0].');
    expect(req.system[0].text).not.toContain('Use the docs.');
    expect(req.system).toHaveLength(1);
  });

  it('includes knowledge blocks as cacheable system blocks', () => {
    const req = buildAnswerRequest({
      ...baseOpts,
      knowledge: [{ name: 'guide.md', text: 'the answer is 42' }],
    });
    expect(req.system[0].text).toContain('Use the docs.');
    expect(req.system).toHaveLength(2);
    expect(req.system[1].text).toContain('DOCS — guide.md:');
    expect(req.system[1].cacheable).toBe(true);
  });

  it('puts transcript and segment in the user message, not the system prompt', () => {
    const req = buildAnswerRequest(baseOpts);
    expect(req.messages[0].content).toContain('[S0] hello');
    expect(req.messages[0].content).toContain('[S1] what is x?');
    expect(req.system[0].text).not.toContain('[S1] what is x?');
  });

  it('forced mode changes the directive and never allows SKIP', () => {
    const req = buildAnswerRequest({ ...baseOpts, forced: true });
    expect(req.messages[0].content).toContain('Do NOT skip');
  });

  it('code mode appends the code directive', () => {
    const req = buildAnswerRequest({ ...baseOpts, codeMode: true });
    expect(req.messages[0].content).toContain('CODE MODE');
  });

  it('profile llm overrides beat global settings', () => {
    const req = buildAnswerRequest({
      ...baseOpts,
      profile: { ...profile, llm: { model: 'claude-haiku-4-5', maxTokens: 500 } },
    });
    expect(req.model).toBe('claude-haiku-4-5');
    expect(req.maxTokens).toBe(500);
    const req2 = buildAnswerRequest(baseOpts);
    expect(req2.model).toBe(settings.llm.model);
  });

  it('adds a language line for non-auto profile language', () => {
    const req = buildAnswerRequest({
      ...baseOpts,
      profile: { ...profile, prompt: { ...profile.prompt, language: 'German' } },
    });
    expect(req.system[0].text).toContain('Always answer in German.');
  });
});
