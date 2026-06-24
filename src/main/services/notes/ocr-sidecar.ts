import { execFile } from 'child_process';
import { promisify } from 'util';

const run = promisify(execFile);

// OCR sidecar contract (decision #7, plan 6.6). Handwriting PNGs are turned
// into text by a VENDORED, fully-offline OSS OCR process — PaddleOCR-VL-1.5 on
// Apple Metal by default, TrOCR-large-handwritten as a fallback. The engine is
// swappable WITHOUT touching callers because the contract is dead simple:
//
//     <command> <png-path>   →   stdout JSON { "text": "..." }   (or plain text)
//
// The runtime + model weights are hundreds of MB and are NOT checked into the
// repo; they are bundled at package time (see docs/ocr-sidecar.md) and the
// command is resolved below. When no engine is configured, OCR yields "" so the
// rest of Notes ingestion (typed text) still works — handwriting is just skipped.

/** Path/command of the OCR sidecar, or null when none is installed. */
function ocrCommand(): string | null {
  // Resolution order: explicit env override → (future) bundled resource path.
  return process.env.UNSEEN_OCR_CMD || null;
}

export function ocrAvailable(): boolean {
  return ocrCommand() !== null;
}

/** PNG path → recognized text. Fully offline. "" when no engine / on failure. */
export async function ocrImage(pngPath: string): Promise<string> {
  const cmd = ocrCommand();
  if (!cmd) return '';
  try {
    const { stdout } = await run(cmd, [pngPath], { maxBuffer: 8 * 1024 * 1024 });
    try {
      const parsed = JSON.parse(stdout) as { text?: unknown };
      return typeof parsed.text === 'string' ? parsed.text : '';
    } catch {
      // Engine printed plain text rather than JSON — accept it.
      return stdout.trim();
    }
  } catch (err) {
    console.error('[notes] OCR sidecar failed for', pngPath, err);
    return '';
  }
}
