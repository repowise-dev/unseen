// Orchestrates STT → transcript → triggers → answer IPC → store updates.
// All the timing/in-flight rules ported from the original app live here.

import type { Usage } from '../../shared/types';
import { TranscriptStore } from './transcript-store';
import { evaluateTriggers } from './trigger-engine/engine';
import { SttClient } from './stt/client';
import { useOverlayStore } from './store';

const MIN_GAP_MS = 1500; // debounce between auto-answers (profile can raise)
const INFLIGHT_TIMEOUT_MS = 30_000; // reset a stuck in-flight answer

const transcript = new TranscriptStore();
let client: SttClient | null = null;

let inFlight = false;
let inFlightSince = 0;
let lastQueryAt = 0;
let pendingRetry = false;
let answerSeq = 0;
let currentAnswerId: number | null = null;

function store() {
  return useOverlayStore.getState();
}

function pushTranscript(): void {
  store().setTranscript(transcript.turns(), transcript.interim);
}

async function maybeAnswer(opts: { force?: boolean; codeMode?: boolean } = {}): Promise<void> {
  const { force = false, codeMode = false } = opts;
  const profile = store().activeProfile;
  if (!profile) return;

  if (inFlight) {
    if (force) {
      // Ask Now always forces through: abandon the previous answer.
      await window.sotto.answerCancel();
      if (currentAnswerId !== null) {
        store().finishAnswer(currentAnswerId, { discard: true });
        currentAnswerId = null;
      }
      inFlight = false;
    } else if (Date.now() - inFlightSince > INFLIGHT_TIMEOUT_MS) {
      inFlight = false;
      currentAnswerId = null;
      store().setStatus(client?.paused ? 'paused' : 'live', client?.paused ? 'paused' : 'listening');
    } else {
      pendingRetry = true;
      return;
    }
  }

  const now = Date.now();
  const debounce = Math.max(MIN_GAP_MS, profile.triggers.debounce_ms);
  if (!force && now - lastQueryAt < debounce) return;

  let effectiveCodeMode = codeMode;
  if (!force) {
    const result = evaluateTriggers(profile.triggers, {
      newText: transcript.newText(),
      recentText: transcript.recentText(),
    });
    if (!result.fire) return;
    effectiveCodeMode = result.codeMode;
  }

  const fullTranscript = transcript.fullTranscript();
  if (!fullTranscript || fullTranscript.length < 15) return;
  const newSegment = transcript.newSegment();

  // Advance the pointer NOW so repeated Ask Now clicks don't resend the window.
  transcript.markAnswered();

  inFlight = true;
  inFlightSince = now;
  lastQueryAt = now;
  store().setStatus('thinking', 'thinking');

  currentAnswerId = ++answerSeq;
  store().beginAnswer(currentAnswerId);

  try {
    await window.sotto.answerStart({
      fullTranscript,
      newSegment,
      forced: force,
      codeMode: effectiveCodeMode,
      userSpeaker: transcript.userSpeaker(Date.now()),
    });
  } catch (err) {
    console.error('[overlay] answerStart failed', err);
    if (currentAnswerId !== null) {
      store().finishAnswer(currentAnswerId, { error: String(err) });
      currentAnswerId = null;
    }
    inFlight = false;
    store().setStatus('live', 'listening');
  }
}

function settleAnswer(opts: { error?: string; usage?: Usage | null }): void {
  inFlight = false;
  const paused = client?.paused ?? false;
  store().setStatus(paused ? 'paused' : 'live', paused ? 'paused' : 'listening');

  if (currentAnswerId !== null) {
    const item = store().answers.find((a) => a.id === currentAnswerId);
    const trimmed = (item?.text ?? '').trim();
    const wasSkip = trimmed.toUpperCase() === 'SKIP';
    store().finishAnswer(currentAnswerId, {
      discard: wasSkip && !opts.error,
      error: opts.error,
      usage: opts.usage,
    });
    currentAnswerId = null;
  }
  if (pendingRetry) {
    pendingRetry = false;
    setTimeout(() => void maybeAnswer(), 100);
  }
}

export function askNow(): void {
  void maybeAnswer({ force: true });
}

export function togglePause(): boolean {
  const paused = client?.togglePause() ?? false;
  return paused;
}

export async function initController(): Promise<void> {
  const s = useOverlayStore.getState();

  const [settings, profiles, active] = await Promise.all([
    window.sotto.settingsGet(),
    window.sotto.profilesList(),
    window.sotto.profilesGetActive(),
  ]);
  s.setSettings(settings);
  s.setProfiles(profiles);
  s.setActiveProfile(active);
  transcript.configure({
    windowChars: active.transcript?.window_chars ?? settings.transcript.windowChars,
    retentionMin: active.transcript?.retention_min ?? settings.transcript.retentionMin,
  });

  let lastSttConfig = JSON.stringify(settings.stt);
  window.sotto.onSettingsChanged(async (next) => {
    store().setSettings(next);
    const profile = await window.sotto.profilesGetActive();
    store().setActiveProfile(profile);
    transcript.configure({
      windowChars: profile.transcript?.window_chars ?? next.transcript.windowChars,
      retentionMin: profile.transcript?.retention_min ?? next.transcript.retentionMin,
    });
    // Mic device, language, diarization, or STT provider changed → reconnect.
    const sttConfig = JSON.stringify(next.stt);
    if (sttConfig !== lastSttConfig) {
      lastSttConfig = sttConfig;
      client?.stop();
      await client?.start();
    }
  });
  window.sotto.onProfilesChanged((list) => store().setProfiles(list));

  window.sotto.onAnswerDelta((delta) => {
    if (currentAnswerId !== null) store().appendAnswer(currentAnswerId, delta);
  });
  window.sotto.onAnswerDone(({ usage }) => settleAnswer({ usage }));
  window.sotto.onAnswerError((err) => settleAnswer({ error: err }));
  window.sotto.onForceAnswer(() => askNow());
  window.sotto.onTogglePause(() => {
    togglePause();
  });

  client = new SttClient({
    getDescriptor: () => window.sotto.sttDescriptor(),
    getMicDeviceId: () => store().settings?.stt.micDeviceId ?? 'default',
    onStatus: (status) => {
      switch (status.state) {
        case 'connecting':
          store().setStatus('idle', 'connecting…');
          break;
        case 'live':
          store().setStatus('live', 'listening');
          break;
        case 'paused':
          store().setStatus('paused', 'paused');
          break;
        case 'reconnecting':
          store().setStatus('idle', 'reconnecting…');
          break;
        case 'error':
          store().setStatus('error', status.message);
          break;
      }
    },
    onEvent: (event) => {
      if (event.type === 'interim') {
        transcript.setInterim(event.text);
        pushTranscript();
        return;
      }
      transcript.addFinal({ t: Date.now(), text: event.text, speaker: event.speaker });
      pushTranscript();
      void maybeAnswer();
    },
  });
  await client.start();
}
