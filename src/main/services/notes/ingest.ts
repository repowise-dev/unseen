import { settings } from '../settings';
import { appendLogEvent } from '../memory/log';
import { mapNamespace } from '../memory/core';
import {
  enumerateNotes,
  handwritingPngs,
  notesAccountHasAny,
  mediaSurfaceExists,
} from './apple-notes';
import { ocrImage, ocrAvailable } from './ocr-sidecar';
import { checkNotesHealth, reportNotesAnomaly } from './health';

// Pipeline (plan 6.3):
//   changed notes → typed text (JXA) + handwriting PNGs (Media/)
//                → OCR PNGs (offline OSS sidecar)
//                → append to memory/log (kind: "note", ns from folder mapping)
//                → next distill picks them up
//
// Incremental: only notes/PNGs modified since notes.lastRunAt. Idempotent at
// the distill layer (mergeFacts), and re-ingesting the same window only adds
// duplicate log lines for unchanged notes if the clock is rewound — the
// since-watermark prevents that in normal operation.

export interface IngestResult {
  typed: number;
  handwritten: number;
  skippedNoOcr: number;
}

export async function ingestNotes(): Promise<IngestResult> {
  const result: IngestResult = { typed: 0, handwritten: 0, skippedNoOcr: 0 };
  if (process.platform !== 'darwin') return result;
  const cfg = settings().get();
  if (!cfg.memory.notes.enabled) return result;

  const since = cfg.memory.notes.lastRunAt;
  const { defaultNs, folderMap } = cfg.memory.notes;
  const now = Date.now();

  // 1. Typed text + metadata via the official scripting API.
  let typedNotes;
  try {
    typedNotes = await enumerateNotes(since);
  } catch (err) {
    reportNotesAnomaly(`Notes enumeration failed: ${String((err as Error).message ?? err)}`);
    return result;
  }
  for (const note of typedNotes) {
    const text = [note.title, note.body].filter(Boolean).join('\n').trim();
    if (!text) continue;
    appendLogEvent({
      t: note.modified || now,
      kind: 'note',
      ns: mapNamespace(note.folder, folderMap, defaultNs),
      text,
      sessionId: note.id || undefined,
    });
    result.typed++;
  }

  // 2. Handwriting → Apple's pre-rendered PNGs → offline OCR.
  const pngs = handwritingPngs(since);
  if (pngs.length > 0 && !ocrAvailable()) {
    result.skippedNoOcr = pngs.length;
  } else {
    for (const png of pngs) {
      const text = (await ocrImage(png)).trim();
      if (!text) continue;
      appendLogEvent({ t: now, kind: 'note', ns: defaultNs, text });
      result.handwritten++;
    }
  }

  // 3. Health: detect surface changes after a macOS update.
  checkNotesHealth({
    notesFound: typedNotes.length,
    accountHasAny: typedNotes.length > 0 ? true : await notesAccountHasAny(),
    mediaExists: mediaSurfaceExists(),
  });

  // 4. Advance the watermark.
  settings().set({ memory: { notes: { lastRunAt: now } } });
  return result;
}
