import { describe, it, expect } from 'vitest';
import { parseDeepgram } from '../src/renderer/overlay/stt/parsers/deepgram';

describe('parseDeepgram', () => {
  it('maps interim results', () => {
    const e = parseDeepgram({
      is_final: false,
      channel: { alternatives: [{ transcript: 'hello wor' }] },
    });
    expect(e).toEqual({ type: 'interim', text: 'hello wor' });
  });

  it('assigns the majority word speaker to finals', () => {
    const e = parseDeepgram({
      is_final: true,
      channel: {
        alternatives: [
          {
            transcript: 'hello world again',
            words: [
              { word: 'hello', start: 0, end: 1, speaker: 1 },
              { word: 'world', start: 1, end: 2, speaker: 1 },
              { word: 'again', start: 2, end: 3, speaker: 0 },
            ],
          },
        ],
      },
    });
    expect(e?.type).toBe('final');
    if (e?.type === 'final') expect(e.speaker).toBe(1);
  });

  it('returns null for empty transcripts', () => {
    expect(
      parseDeepgram({ is_final: true, channel: { alternatives: [{ transcript: '' }] } }),
    ).toBeNull();
    expect(parseDeepgram({})).toBeNull();
  });
});
