import { describe, it, expect } from 'vitest';
import {
  dayKey,
  factKey,
  isLockStale,
  mapNamespace,
  mergeFacts,
  mergeLogEvents,
  parseFactsJson,
  parseLogLine,
  renderFactsBlock,
  type Fact,
  type LogEvent,
  type RawFact,
} from '../src/main/services/memory/core';

describe('dayKey', () => {
  it('formats local YYYY-MM-DD', () => {
    // Build a local date so the assertion is timezone-independent.
    const d = new Date(2026, 5, 24, 13, 30); // June 24 2026, local
    expect(dayKey(d.getTime())).toBe('2026-06-24');
  });
});

describe('factKey', () => {
  it('normalizes case and whitespace so equivalent facts collide', () => {
    expect(factKey('person', 'Ada  Lovelace', 'Writes code')).toBe(
      factKey('person', 'ada lovelace', 'writes code'),
    );
  });
});

describe('parseLogLine', () => {
  it('parses a valid event and rejects malformed/incomplete lines', () => {
    const ev = parseLogLine('{"t":1,"kind":"dictation","ns":"personal","text":"hi"}');
    expect(ev).toMatchObject({ t: 1, kind: 'dictation', ns: 'personal', text: 'hi' });
    expect(parseLogLine('')).toBeNull();
    expect(parseLogLine('not json')).toBeNull();
    expect(parseLogLine('{"t":1,"kind":"dictation"}')).toBeNull(); // missing text/ns
  });
});

describe('parseFactsJson', () => {
  const expected: RawFact[] = [{ type: 'person', subject: 'Ada', value: 'is a colleague' }];

  it('parses a bare JSON array', () => {
    expect(parseFactsJson('[{"type":"person","subject":"Ada","value":"is a colleague"}]')).toEqual(
      expected,
    );
  });

  it('strips a ```json fence and surrounding prose', () => {
    const text = 'Here you go:\n```json\n[{"type":"person","subject":"Ada","value":"is a colleague"}]\n```';
    expect(parseFactsJson(text)).toEqual(expected);
  });

  it('drops items with unknown type or empty fields, and bad JSON → []', () => {
    const text =
      '[{"type":"alien","subject":"x","value":"y"},{"type":"topic","subject":"","value":"z"},{"type":"topic","subject":"AI","value":"matters"}]';
    expect(parseFactsJson(text)).toEqual([{ type: 'topic', subject: 'AI', value: 'matters' }]);
    expect(parseFactsJson('totally not json')).toEqual([]);
  });
});

describe('mergeFacts (idempotency)', () => {
  const raw: RawFact[] = [
    { type: 'person', subject: 'Ada', value: 'is a colleague' },
    { type: 'topic', subject: 'Unseen', value: 'is the project' },
  ];

  it('adds new facts with provenance', () => {
    const merged = mergeFacts([], raw, 1000);
    expect(merged).toHaveLength(2);
    expect(merged[0]).toMatchObject({ sources: 1, firstSeen: 1000, lastSeen: 1000 });
  });

  it('re-running the same facts does NOT duplicate (the sync-safety guarantee)', () => {
    const first = mergeFacts([], raw, 1000);
    const second = mergeFacts(first, raw, 2000);
    expect(second).toHaveLength(2); // no growth
    // provenance updated in place
    expect(second.every((f) => f.sources === 2)).toBe(true);
    expect(second.every((f) => f.lastSeen === 2000 && f.firstSeen === 1000)).toBe(true);
  });

  it('merges new facts alongside existing ones', () => {
    const first = mergeFacts([], raw, 1000);
    const merged = mergeFacts(first, [{ type: 'decision', subject: 'DB', value: 'use SQLite' }], 3000);
    expect(merged).toHaveLength(3);
  });

  it('does not mutate the existing array', () => {
    const existing = mergeFacts([], raw, 1000);
    const snapshot = JSON.parse(JSON.stringify(existing));
    mergeFacts(existing, raw, 9999);
    expect(existing).toEqual(snapshot);
  });
});

describe('mergeLogEvents (cross-device sync)', () => {
  const ev = (t: number, text: string): LogEvent => ({ t, kind: 'dictation', ns: 'personal', text });

  it('sorts by timestamp and dedupes identical (t,kind,text) lines', () => {
    const merged = mergeLogEvents([ev(3, 'c'), ev(1, 'a'), ev(1, 'a'), ev(2, 'b')]);
    expect(merged.map((e) => e.text)).toEqual(['a', 'b', 'c']);
  });

  it('keeps same-timestamp events that differ in text', () => {
    const merged = mergeLogEvents([ev(1, 'a'), ev(1, 'b')]);
    expect(merged).toHaveLength(2);
  });

  it('is idempotent — merging an already-merged log is a no-op', () => {
    const once = mergeLogEvents([ev(2, 'b'), ev(1, 'a'), ev(2, 'b')]);
    expect(mergeLogEvents(once)).toEqual(once);
  });
});

describe('isLockStale', () => {
  it('honors a fresh lock and reclaims an expired one', () => {
    expect(isLockStale(1_000_000, 1_000_000 + 60_000)).toBe(false); // 1 min < 1h ttl
    expect(isLockStale(1_000_000, 1_000_000 + 2 * 60 * 60 * 1000)).toBe(true); // 2h > 1h
  });
});

describe('mapNamespace', () => {
  const map = [{ folder: 'Work', ns: 'work' as const }];
  it('maps a matched folder (case-insensitive) and falls back to default', () => {
    expect(mapNamespace('work', map, 'personal')).toBe('work');
    expect(mapNamespace('Personal Stuff', map, 'personal')).toBe('personal');
    expect(mapNamespace(undefined, map, 'personal')).toBe('personal');
  });
});

describe('renderFactsBlock', () => {
  it('groups facts by type with headers', () => {
    const facts: Fact[] = [
      { id: 'a', type: 'person', subject: 'Ada', value: 'colleague', firstSeen: 1, lastSeen: 1, sources: 1 },
      { id: 'b', type: 'topic', subject: 'Unseen', value: 'the project', firstSeen: 1, lastSeen: 1, sources: 1 },
    ];
    const text = renderFactsBlock(facts);
    expect(text).toContain('PERSON:');
    expect(text).toContain('- Ada: colleague');
    expect(text).toContain('TOPIC:');
  });
});
