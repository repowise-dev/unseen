import { describe, it, expect } from 'vitest';
import { TranscriptStore } from '../src/renderer/overlay/transcript-store';

const T0 = 1_000_000;

describe('TranscriptStore', () => {
  it('groups consecutive same-speaker finals into turns', () => {
    const s = new TranscriptStore();
    s.addFinal({ t: T0, text: 'hello there', speaker: 0 });
    s.addFinal({ t: T0 + 1000, text: 'how are you', speaker: 0 });
    s.addFinal({ t: T0 + 2000, text: 'good thanks', speaker: 1 });
    expect(s.turns()).toEqual([
      { speaker: 0, text: 'hello there how are you' },
      { speaker: 1, text: 'good thanks' },
    ]);
    expect(s.fullTranscript()).toBe('[S0] hello there how are you\n[S1] good thanks');
  });

  it('trims finals older than retention and adjusts answeredUpTo', () => {
    const s = new TranscriptStore({ windowChars: 4000, retentionMin: 3 });
    s.addFinal({ t: T0, text: 'old', speaker: 0 });
    s.addFinal({ t: T0 + 1000, text: 'also old', speaker: 0 });
    s.markAnswered();
    expect(s.answeredUpTo).toBe(2);
    // 4 minutes later, both old finals fall out of the window.
    s.addFinal({ t: T0 + 4 * 60 * 1000, text: 'new question?', speaker: 1 });
    expect(s.finals.map((f) => f.text)).toEqual(['new question?']);
    expect(s.answeredUpTo).toBe(0);
    expect(s.newText()).toBe('new question?');
  });

  it('limits fullTranscript to windowChars from the tail', () => {
    const s = new TranscriptStore({ windowChars: 20, retentionMin: 3 });
    s.addFinal({ t: T0, text: 'aaaaaaaaaaaaaaaaaaaa', speaker: 0 });
    s.addFinal({ t: T0 + 1, text: 'tail', speaker: 1 });
    expect(s.fullTranscript().length).toBeLessThanOrEqual(20);
    expect(s.fullTranscript().endsWith('tail')).toBe(true);
  });

  it('newSegment includes slight overlap before answeredUpTo', () => {
    const s = new TranscriptStore();
    s.addFinal({ t: T0, text: 'one', speaker: 0 });
    s.addFinal({ t: T0 + 1, text: 'two', speaker: 0 });
    s.markAnswered();
    s.addFinal({ t: T0 + 2, text: 'three', speaker: 1 });
    expect(s.newSegment(2)).toBe('[S0] one\n[S0] two\n[S1] three');
    expect(s.newText()).toBe('three');
  });

  it('picks the most-talkative recent speaker as the user', () => {
    const s = new TranscriptStore();
    s.addFinal({ t: T0, text: 'short', speaker: 1 });
    s.addFinal({ t: T0 + 1000, text: 'a much longer stretch of talking from speaker zero', speaker: 0 });
    expect(s.userSpeaker(T0 + 2000)).toBe(0);
  });

  it('ignores speakers outside the recency window for user detection', () => {
    const s = new TranscriptStore();
    s.addFinal({ t: T0, text: 'a very long monologue from long ago by speaker two', speaker: 2 });
    s.addFinal({ t: T0 + 120_000, text: 'recent words', speaker: 1 });
    expect(s.userSpeaker(T0 + 121_000)).toBe(1);
  });
});
