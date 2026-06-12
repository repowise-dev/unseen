import type { TranscriptEvent } from '../../../../shared/types';

// Deepgram /v1/listen message → normalized TranscriptEvent.
// Speaker of a final = majority speaker across its words (diarized).

export function parseDeepgram(raw: unknown): TranscriptEvent | null {
  const msg = raw as {
    is_final?: boolean;
    channel?: {
      alternatives?: {
        transcript?: string;
        words?: { word: string; start: number; end: number; speaker?: number }[];
      }[];
    };
  };
  const alt = msg.channel?.alternatives?.[0];
  const text = alt?.transcript;
  if (!text) return null;

  if (!msg.is_final) return { type: 'interim', text };

  const counts: Record<number, number> = {};
  for (const w of alt?.words ?? []) {
    const s = w.speaker ?? 0;
    counts[s] = (counts[s] ?? 0) + 1;
  }
  let speaker = 0;
  let best = -1;
  for (const [s, n] of Object.entries(counts)) {
    if (n > best) {
      best = n;
      speaker = Number(s);
    }
  }
  return { type: 'final', text, speaker, words: alt?.words };
}
