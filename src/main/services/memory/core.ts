// Pure memory primitives — NO electron/fs imports so they're unit-testable in
// a plain node environment. File IO lives in log.ts / distill.ts, which build
// on these. This is where the sync-safety guarantees live: a stable day key,
// stable fact keys, and an idempotent merge so re-distilling a day (or two
// devices distilling the same day) never duplicates facts.

import type { Namespace } from '../../../shared/types';
export type { Namespace };
export const NAMESPACES: readonly Namespace[] = ['personal', 'work'] as const;

export type LogKind = 'dictation' | 'meeting' | 'note';

export interface LogEvent {
  /** epoch ms */
  t: number;
  kind: LogKind;
  ns: Namespace;
  /** front app at capture time (dictation), if known */
  app?: string;
  text: string;
  sessionId?: string;
}

export type FactType =
  | 'entity'
  | 'person'
  | 'topic'
  | 'decision'
  | 'preference'
  | 'phrase';

export const FACT_TYPES: readonly FactType[] = [
  'entity',
  'person',
  'topic',
  'decision',
  'preference',
  'phrase',
];

/** What the distillation LLM is asked to emit per item. */
export interface RawFact {
  type: FactType;
  subject: string;
  value: string;
}

/** A stored fact: a RawFact plus provenance for merge/idempotency. */
export interface Fact extends RawFact {
  id: string;
  firstSeen: number;
  lastSeen: number;
  /** how many distillation passes have produced this fact */
  sources: number;
}

/** Local YYYY-MM-DD for an epoch-ms timestamp (the daily-log file key). */
export function dayKey(t: number): string {
  const d = new Date(t);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function normalizeKey(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Stable dedupe key for a fact (normalized type|subject|value). */
export function factKey(type: string, subject: string, value: string): string {
  return `${type}|${normalizeKey(subject)}|${normalizeKey(value)}`;
}

/** Parse one JSONL log line; returns null on malformed/incomplete lines so a
 *  single bad line never breaks reading a day (sync robustness). */
export function parseLogLine(line: string): LogEvent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    const o = JSON.parse(trimmed) as Partial<LogEvent>;
    if (typeof o.t !== 'number' || typeof o.text !== 'string' || !o.kind || !o.ns) return null;
    return {
      t: o.t,
      kind: o.kind,
      ns: o.ns,
      text: o.text,
      app: o.app,
      sessionId: o.sessionId,
    };
  } catch {
    return null;
  }
}

/**
 * Merge newly-distilled raw facts into the existing set. Idempotent: a fact
 * with the same stable key updates lastSeen / sources rather than duplicating.
 * Returns a new array; does not mutate `existing`.
 */
export function mergeFacts(existing: Fact[], incoming: RawFact[], now: number): Fact[] {
  const map = new Map<string, Fact>(existing.map((f) => [f.id, { ...f }]));
  for (const r of incoming) {
    if (!r || !r.subject || !r.value || !FACT_TYPES.includes(r.type)) continue;
    const id = factKey(r.type, r.subject, r.value);
    const cur = map.get(id);
    if (cur) {
      cur.lastSeen = now;
      cur.sources += 1;
    } else {
      map.set(id, {
        id,
        type: r.type,
        subject: r.subject.trim(),
        value: r.value.trim(),
        firstSeen: now,
        lastSeen: now,
        sources: 1,
      });
    }
  }
  return [...map.values()];
}

/**
 * Extract a RawFact[] from an LLM response. Tolerates ```json fences and
 * leading/trailing prose; drops items that don't match the shape.
 */
export function parseFactsJson(text: string): RawFact[] {
  let body = text.trim();
  // Strip a fenced code block if present.
  const fence = body.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) body = fence[1].trim();
  // Fall back to the first [...] span.
  if (!body.startsWith('[')) {
    const start = body.indexOf('[');
    const end = body.lastIndexOf(']');
    if (start !== -1 && end > start) body = body.slice(start, end + 1);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out: RawFact[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const type = o.type as FactType;
    const subject = typeof o.subject === 'string' ? o.subject : '';
    const value = typeof o.value === 'string' ? o.value : '';
    if (!FACT_TYPES.includes(type) || !subject.trim() || !value.trim()) continue;
    out.push({ type, subject: subject.trim(), value: value.trim() });
  }
  return out;
}

/** Map an Apple Notes folder name to a namespace via the user's rules. */
export function mapNamespace(
  folder: string | undefined,
  folderMap: { folder: string; ns: Namespace }[],
  defaultNs: Namespace,
): Namespace {
  if (folder) {
    const hit = folderMap.find((m) => m.folder.toLowerCase() === folder.toLowerCase());
    if (hit) return hit.ns;
  }
  return defaultNs;
}

/** Render a namespace's facts as a compact knowledge block body. */
export function renderFactsBlock(facts: Fact[]): string {
  const byType = new Map<FactType, Fact[]>();
  for (const f of facts) {
    const arr = byType.get(f.type) ?? [];
    arr.push(f);
    byType.set(f.type, arr);
  }
  const lines: string[] = [];
  for (const type of FACT_TYPES) {
    const arr = byType.get(type);
    if (!arr || arr.length === 0) continue;
    lines.push(`${type.toUpperCase()}:`);
    for (const f of arr) lines.push(`- ${f.subject}: ${f.value}`);
  }
  return lines.join('\n');
}
