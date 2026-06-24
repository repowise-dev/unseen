import { systemPreferences } from 'electron';

// macOS Accessibility permission is required to synthesize the ⌘V paste used
// for dictation insertion. isTrustedAccessibilityClient(true) prompts the user
// (opens System Settings → Privacy & Security → Accessibility) the first time.

/**
 * @param prompt if true, show the system prompt when not yet trusted.
 * @returns whether the app is currently a trusted Accessibility client.
 */
export function isAccessibilityTrusted(prompt: boolean): boolean {
  if (process.platform !== 'darwin') return true;
  return systemPreferences.isTrustedAccessibilityClient(prompt);
}
