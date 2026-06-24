import { join, dirname } from 'path';
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
} from 'fs';
import { hostname } from 'os';
import type { DistillResult, LlmRequest } from '../../../shared/types';
import { LLM_STALL_TIMEOUT_MS } from '../../../shared/constants';
import { settings } from '../settings';
import { getLlmProvider, providerContext } from '../llm/registry';
import { factsDir } from '../paths';
import { readDay } from './log';
import {
  dayKey,
  isLockStale,
  mergeFacts,
  parseFactsJson,
  type Fact,
  type Namespace,
  NAMESPACES,
} from './core';

// Distillation: turn a day's raw log into structured, accumulating facts.
// Idempotent (mergeFacts dedupes by stable key) so re-running a day or syncing
// two devices never duplicates — the accumulating fact set per namespace IS
// "the graph" v1.

const DISTILL_SYSTEM = `You distill a day's transcribed speech (dictation + meetings + notes) into durable, structured facts about the user and their world.

Extract only stable, reusable knowledge — not transient chatter. Output a JSON array; each item:
{ "type": "entity|person|topic|decision|preference|phrase", "subject": "<short noun phrase>", "value": "<the fact, one sentence>" }

Guidance:
- person: people mentioned and their role/relationship.
- entity: projects, products, companies, tools, places.
- topic: recurring subjects the user works on.
- decision: choices made ("decided to ...").
- preference: how the user likes things done.
- phrase: distinctive terminology/jargon the user uses.

Be conservative: skip anything you wouldn't want to remember next month. Use the user's own terminology. Output ONLY the JSON array — no prose, no code fence.`;

function factsPath(ns: Namespace, day: string): string {
  return join(factsDir(ns), `${day}.json`);
}

function lockPath(ns: Namespace, day: string): string {
  return join(factsDir(ns), `${day}.lock`);
}

/**
 * Single-distiller rule (Phase 4): acquire a per-day lock so two synced Macs
 * don't distill the same day at once. Honors a stale lock (crashed distiller).
 * Returns false if another live device holds it.
 */
function acquireLock(ns: Namespace, day: string): boolean {
  const path = lockPath(ns, day);
  if (existsSync(path)) {
    try {
      const lock = JSON.parse(readFileSync(path, 'utf8')) as { device: string; t: number };
      if (lock.device !== hostname() && !isLockStale(lock.t, Date.now())) return false;
    } catch {
      /* unreadable lock → treat as stale and reclaim */
    }
  }
  writeFileSync(path, JSON.stringify({ device: hostname(), t: Date.now() }));
  return true;
}

function releaseLock(ns: Namespace, day: string): void {
  try {
    rmSync(lockPath(ns, day));
  } catch {
    /* already gone */
  }
}

function readFacts(ns: Namespace, day: string): Fact[] {
  const path = factsPath(ns, day);
  if (!existsSync(path)) return [];
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    return Array.isArray(parsed) ? (parsed as Fact[]) : [];
  } catch {
    return [];
  }
}

function writeFacts(ns: Namespace, day: string, facts: Fact[]): void {
  const path = factsPath(ns, day);
  mkdirSync(dirname(path), { recursive: true });
  const tmp = path + '.tmp';
  writeFileSync(tmp, JSON.stringify(facts, null, 2));
  renameSync(tmp, path);
}

async function callLlm(text: string): Promise<string> {
  const cfg = settings().get();
  const providerId = cfg.llm.provider;
  const request: LlmRequest = {
    system: [{ text: DISTILL_SYSTEM, cacheable: true }],
    messages: [{ role: 'user', content: text }],
    model: cfg.llm.model,
    maxTokens: 2000,
  };
  const controller = new AbortController();
  let lastEventAt = Date.now();
  const watchdog = setInterval(() => {
    if (Date.now() - lastEventAt > LLM_STALL_TIMEOUT_MS) controller.abort();
  }, 3000);
  try {
    const provider = getLlmProvider(providerId);
    const ctx = { ...providerContext(providerId, cfg), signal: controller.signal };
    let out = '';
    for await (const event of provider.stream(request, ctx)) {
      lastEventAt = Date.now();
      if (event.type === 'delta') out += event.text;
    }
    return out;
  } finally {
    clearInterval(watchdog);
  }
}

/** Distill one namespace's events for a day, merging into that day's facts. */
export async function distillDay(day: string, ns: Namespace): Promise<DistillResult> {
  const events = readDay(day).filter((e) => e.ns === ns);
  if (events.length === 0) return { ns, day, events: 0, added: 0, total: readFacts(ns, day).length };

  // Single-distiller rule: bail if another device is distilling this day.
  if (!acquireLock(ns, day)) {
    console.log(`[memory] ${ns} ${day} locked by another device — skipping`);
    return { ns, day, events: events.length, added: 0, total: readFacts(ns, day).length };
  }
  try {
    const text = events.map((e) => `[${e.kind}] ${e.text}`).join('\n');
    const raw = parseFactsJson(await callLlm(text));

    const before = readFacts(ns, day);
    const beforeCount = before.length;
    const merged = mergeFacts(before, raw, Date.now());
    writeFacts(ns, day, merged);
    return {
      ns,
      day,
      events: events.length,
      added: merged.length - beforeCount,
      total: merged.length,
    };
  } finally {
    releaseLock(ns, day);
  }
}

/** Distill today across all namespaces (on-demand "Distill now" + scheduler). */
export async function distillToday(): Promise<DistillResult[]> {
  const day = dayKey(Date.now());
  const results: DistillResult[] = [];
  for (const ns of NAMESPACES) {
    try {
      results.push(await distillDay(day, ns));
    } catch (err) {
      console.error(`[memory] distill ${ns} ${day} failed`, err);
      results.push({ ns, day, events: 0, added: 0, total: 0 });
    }
  }
  return results;
}
