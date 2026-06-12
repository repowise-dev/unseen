import type { TranscriptEvent } from '../../../../shared/types';
import { parseDeepgram } from './deepgram';

// Renderer half of an STT provider: vendor WS message → TranscriptEvent.
// The main-process half (connection descriptor) lives in
// src/main/services/stt/. Register new parsers here by provider id.

export type SttParser = (raw: unknown) => TranscriptEvent | null;

const parsers: Record<string, SttParser> = {
  deepgram: parseDeepgram,
};

export function getParser(providerId: string): SttParser {
  const p = parsers[providerId];
  if (!p) throw new Error(`No STT parser registered for provider: ${providerId}`);
  return p;
}
