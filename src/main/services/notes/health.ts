import { Notification } from 'electron';

// Graceful degradation (plan 6.5). Apple can change the Notes surfaces on an OS
// update. Rather than fail silently (data loss), we detect the tell-tale signs
// and surface a native heads-up: worst case after an update is a notification,
// not a silent drop.

export function reportNotesAnomaly(message: string): void {
  console.warn('[notes] anomaly:', message);
  try {
    new Notification({
      title: 'Engram — Notes sync',
      body: message,
    }).show();
  } catch {
    /* notifications unavailable (headless sync run) — the console log stands */
  }
}

/**
 * @param notesFound notes returned by enumeration this run
 * @param accountHasAny whether the Notes account has any notes at all
 * @param mediaExists whether the Media/ container surface still exists
 */
export function checkNotesHealth(opts: {
  notesFound: number;
  accountHasAny: boolean;
  mediaExists: boolean;
}): void {
  if (opts.notesFound === 0 && opts.accountHasAny) {
    reportNotesAnomaly(
      'Notes sync found nothing although notes exist — Engram may need an update.',
    );
  }
  if (!opts.mediaExists) {
    reportNotesAnomaly(
      'Notes media folder is missing or moved — handwriting capture may be broken.',
    );
  }
}
