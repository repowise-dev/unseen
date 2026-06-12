import { describe, it, expect } from 'vitest';
import { sessionToMarkdown } from '../src/main/services/session-export';
import type { SessionEvent } from '../src/shared/types';

const T0 = new Date('2026-06-12T10:00:00').getTime();

const events: SessionEvent[] = [
  { t: T0, type: 'start', version: '0.1.0' },
  { t: T0 + 1000, type: 'final', text: 'so how does pricing work', speaker: 1 },
  { t: T0 + 2000, type: 'final', text: 'for the team plan', speaker: 1 },
  {
    t: T0 + 3000,
    type: 'answer',
    text: 'Team plan is per-seat.\nAnnual saves 20%.',
    profileId: 'sales-assistant',
    forced: false,
  },
  { t: T0 + 60_000, type: 'final', text: 'great thanks', speaker: 0 },
];

describe('sessionToMarkdown', () => {
  it('groups consecutive same-speaker finals into one line', () => {
    const md = sessionToMarkdown(events);
    expect(md).toContain('S1:** so how does pricing work for the team plan');
  });

  it('renders answers as blockquotes with profile attribution', () => {
    const md = sessionToMarkdown(events);
    expect(md).toContain('*(sales-assistant)*');
    expect(md).toContain('> Team plan is per-seat.');
    expect(md).toContain('> Annual saves 20%.');
  });

  it('keeps chronological order (answer between speaker turns)', () => {
    const md = sessionToMarkdown(events);
    const q = md.indexOf('pricing work');
    const a = md.indexOf('per-seat');
    const thanks = md.indexOf('great thanks');
    expect(q).toBeLessThan(a);
    expect(a).toBeLessThan(thanks);
  });

  it('includes duration and counts in the header', () => {
    const md = sessionToMarkdown(events);
    expect(md).toContain('3 transcript segments');
    expect(md).toContain('1 answers');
  });

  it('handles an empty session', () => {
    expect(sessionToMarkdown([])).toContain('empty');
  });
});
