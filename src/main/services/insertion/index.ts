import { clipboard, Notification } from 'electron';
import { pasteKeystroke } from './paste-macos';

const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export interface InsertResult {
  /** true if the ⌘V keystroke was synthesized into the target app. */
  pasted: boolean;
  /** Set when we couldn't paste; text is left on the clipboard as a fallback. */
  reason?: string;
}

/**
 * Insert text at the cursor in whatever app has focus. Decision #1: stage on
 * the clipboard, synthesize ⌘V, then restore the previous clipboard so we don't
 * clobber the user's copy buffer. If paste fails (e.g. an app rejects synthetic
 * events) we leave the cleaned text on the clipboard and notify — the user can
 * paste manually (Wispr Flow's fallback).
 */
export async function insertText(text: string): Promise<InsertResult> {
  if (!text) return { pasted: false, reason: 'empty' };

  const prev = clipboard.readText();
  clipboard.writeText(text);
  try {
    await pasteKeystroke();
    await delay(120); // let the target app consume the paste before we restore
    clipboard.writeText(prev);
    return { pasted: true };
  } catch (err) {
    // Leave `text` on the clipboard (do NOT restore) so manual paste works.
    const reason = String((err as Error)?.message ?? err);
    new Notification({
      title: 'Engram — dictation',
      body: 'Could not paste automatically. The cleaned text is on your clipboard — press ⌘V.',
    }).show();
    return { pasted: false, reason };
  }
}
