// Pure rolling-transcript model — no DOM, no Electron. Unit-tested.

export interface FinalSegment {
  t: number; // epoch ms
  text: string;
  speaker: number;
}

export interface TranscriptTurn {
  speaker: number;
  text: string;
}

export class TranscriptStore {
  finals: FinalSegment[] = [];
  interim = '';
  /** Index into `finals` up to which answers have already been generated, so
   *  the same question doesn't re-fire as the transcript scrolls. */
  answeredUpTo = 0;

  constructor(
    private opts: { windowChars: number; retentionMin: number } = {
      windowChars: 4000,
      retentionMin: 3,
    },
  ) {}

  configure(opts: { windowChars?: number; retentionMin?: number }): void {
    this.opts = { ...this.opts, ...opts };
  }

  addFinal(seg: FinalSegment): void {
    this.finals.push(seg);
    this.interim = '';
    const cutoff = seg.t - this.opts.retentionMin * 60 * 1000;
    let trimmed = 0;
    while (this.finals.length && this.finals[0].t < cutoff) {
      this.finals.shift();
      trimmed++;
    }
    this.answeredUpTo = Math.max(0, this.answeredUpTo - trimmed);
  }

  setInterim(text: string): void {
    this.interim = text;
  }

  /** Consecutive same-speaker finals grouped into turns. */
  turns(): TranscriptTurn[] {
    const turns: TranscriptTurn[] = [];
    for (const f of this.finals) {
      const last = turns[turns.length - 1];
      if (last && last.speaker === f.speaker) last.text += ' ' + f.text;
      else turns.push({ speaker: f.speaker, text: f.text });
    }
    return turns;
  }

  fullTranscript(): string {
    return this.turns()
      .map((t) => `[S${t.speaker}] ${t.text}`)
      .join('\n')
      .slice(-this.opts.windowChars);
  }

  /** Unanswered finals (plus slight overlap for context), speaker-tagged. */
  newSegment(overlap = 2): string {
    return this.finals
      .slice(Math.max(0, this.answeredUpTo - overlap))
      .map((f) => `[S${f.speaker}] ${f.text}`)
      .join('\n');
  }

  newText(): string {
    return this.finals
      .slice(this.answeredUpTo)
      .map((f) => f.text)
      .join(' ')
      .trim();
  }

  recentText(lastN = 3): string {
    return this.finals
      .slice(-lastN)
      .map((f) => f.text)
      .join(' ');
  }

  markAnswered(): void {
    this.answeredUpTo = this.finals.length;
  }

  /** The most-talkative speaker over the last windowMs is assumed to be the
   *  app's user. Falls back to 0. */
  userSpeaker(now: number, windowMs = 60_000): number {
    const cutoff = now - windowMs;
    const counts: Record<number, number> = {};
    for (const f of this.finals) {
      if (f.t < cutoff) continue;
      counts[f.speaker] = (counts[f.speaker] ?? 0) + f.text.length;
    }
    let best = 0;
    let bestN = -1;
    for (const [s, n] of Object.entries(counts)) {
      if (n > bestN) {
        bestN = n;
        best = Number(s);
      }
    }
    return best;
  }
}
