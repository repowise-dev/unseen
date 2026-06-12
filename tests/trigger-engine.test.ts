import { describe, it, expect } from 'vitest';
import { evaluateTriggers } from '../src/renderer/overlay/trigger-engine/engine';
import type { TriggerConfig } from '../src/renderer/overlay/trigger-engine/engine';

const base: TriggerConfig = {
  auto: true,
  detectors: ['question', 'request'],
  keywords: [],
  min_chars: 8,
};

const input = (newText: string, recentText = newText) => ({ newText, recentText });

describe('question detector', () => {
  it('fires on explicit question marks', () => {
    expect(evaluateTriggers(base, input('So how would you scale this?')).fire).toBe(true);
  });
  it('fires on interrogative shape without a question mark', () => {
    expect(evaluateTriggers(base, input('tell us what about caching here')).fire).toBe(true);
  });
  it('fires when a question is buried mid-segment', () => {
    expect(
      evaluateTriggers(base, input('can you walk us through the design. Okay so I think'))
        .fire,
    ).toBe(true);
  });
  it('does not fire on plain statements', () => {
    expect(evaluateTriggers(base, input('we shipped the release yesterday evening')).fire).toBe(
      false,
    );
  });
});

describe('request detector', () => {
  it('fires on imperatives', () => {
    expect(evaluateTriggers(base, input('walk me through the architecture please')).fire).toBe(
      true,
    );
  });
});

describe('code-request detection', () => {
  const cfg = { ...base, detectors: ['question', 'request', 'code-request'] };
  it('fires with codeMode on "write the code"', () => {
    const r = evaluateTriggers(cfg, input('okay now write the code for that'));
    expect(r.fire).toBe(true);
    expect(r.codeMode).toBe(true);
  });
  it('fires with codeMode on language mentions', () => {
    const r = evaluateTriggers(cfg, input('can you implement this in python'));
    expect(r.fire).toBe(true);
    expect(r.codeMode).toBe(true);
  });
  it('plain questions do not set codeMode', () => {
    const r = evaluateTriggers(cfg, input('why use a b-tree here?'));
    expect(r.fire).toBe(true);
    expect(r.codeMode).toBe(false);
  });
});

describe('keyword detector', () => {
  const cfg: TriggerConfig = { ...base, detectors: ['keyword'], keywords: ['pricing', 'recap'] };
  it('fires on configured keywords, case-insensitive', () => {
    expect(evaluateTriggers(cfg, input('what does the Pricing look like for teams')).fire).toBe(
      true,
    );
  });
  it('does not fire without keywords present', () => {
    expect(evaluateTriggers(cfg, input('let us move to the next agenda item')).fire).toBe(false);
  });
});

describe('gates', () => {
  it('respects min_chars', () => {
    expect(evaluateTriggers(base, input('why?')).fire).toBe(false);
  });
  it('does nothing when auto is off', () => {
    expect(evaluateTriggers({ ...base, auto: false }, input('how would you do it?')).fire).toBe(
      false,
    );
  });
});
