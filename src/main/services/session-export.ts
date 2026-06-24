// Pure session → Markdown rendering (no Electron imports). Unit-tested.

import type { SessionEvent } from '../../shared/types';

function hhmm(t: number): string {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function sessionToMarkdown(events: SessionEvent[]): string {
  const start = events[0]?.t;
  const end = events[events.length - 1]?.t;
  const finals = events.filter((e) => e.type === 'final').length;
  const answers = events.filter((e) => e.type === 'answer').length;

  const lines: string[] = [];
  lines.push(`# Engram session — ${start ? new Date(start).toLocaleString() : 'empty'}`);
  lines.push('');
  if (start && end && end > start) {
    lines.push(`*${Math.round((end - start) / 60_000)} min · ${finals} transcript segments · ${answers} answers*`);
    lines.push('');
  }
  lines.push('---');
  lines.push('');

  // Interleave chronologically; group consecutive same-speaker finals.
  let speakerOpen: number | null = null;
  let speakerText: string[] = [];
  let speakerAt = 0;

  const flushSpeaker = (): void => {
    if (speakerOpen === null) return;
    lines.push(`**[${hhmm(speakerAt)}] S${speakerOpen}:** ${speakerText.join(' ')}`);
    lines.push('');
    speakerOpen = null;
    speakerText = [];
  };

  for (const ev of events) {
    if (ev.type === 'final') {
      if (speakerOpen !== ev.speaker) {
        flushSpeaker();
        speakerOpen = ev.speaker;
        speakerAt = ev.t;
      }
      speakerText.push(ev.text);
    } else if (ev.type === 'answer') {
      flushSpeaker();
      lines.push(`> **🤖 ${hhmm(ev.t)}** *(${ev.profileId}${ev.forced ? ', asked' : ''})*`);
      lines.push('>');
      for (const l of ev.text.split('\n')) lines.push(`> ${l}`);
      lines.push('');
    }
  }
  flushSpeaker();

  return lines.join('\n');
}
