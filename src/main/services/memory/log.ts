import { join } from 'path';
import { appendFileSync, readFileSync, existsSync } from 'fs';
import { logDir } from '../paths';
import { dayKey, parseLogLine, type LogEvent } from './core';

// Append-only daily event log. Every dictation / meeting final / ingested note
// becomes one JSONL line in the day's file. Append-only is the whole point:
// two devices writing the same day rarely truly conflict, and a merge is just
// sort-by-t + dedupe (Phase 4).

export function dayPath(day: string): string {
  return join(logDir(), `${day}.jsonl`);
}

/** Append an event to its day's log (day derived from event.t). */
export function appendLogEvent(ev: LogEvent): void {
  try {
    appendFileSync(dayPath(dayKey(ev.t)), JSON.stringify(ev) + '\n');
  } catch (err) {
    console.error('[memory] append failed', err);
  }
}

/** Read and parse all events for a day (malformed lines skipped). */
export function readDay(day: string): LogEvent[] {
  const path = dayPath(day);
  if (!existsSync(path)) return [];
  const out: LogEvent[] = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const ev = parseLogLine(line);
    if (ev) out.push(ev);
  }
  return out;
}
