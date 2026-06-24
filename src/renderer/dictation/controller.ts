// Dictation HUD controller: STT (single speaker) → live interim → on-stop
// cleanup pass → insert at cursor. Reuses the overlay's battle-tested SttClient
// exactly; only the descriptor (diarize:false, short endpointing) and the
// post-stop flow differ.

import { SttClient } from '../overlay/stt/client';
import { useDictationStore } from './store';

let client: SttClient | null = null;

function store() {
  return useDictationStore.getState();
}

/** Snapshot everything said this session: finalized text + any trailing interim. */
function buffer(): string {
  const s = store();
  return [s.finals, s.interim].filter(Boolean).join(' ').trim();
}

async function start(): Promise<void> {
  store().reset();
  store().setState('listening');
  store().setStatus('connecting…');

  if (!client) {
    client = new SttClient({
      getDescriptor: () => window.unseen.sttDescriptorDictation(),
      getMicDeviceId: () => 'default',
      onStatus: (status) => {
        switch (status.state) {
          case 'connecting':
            store().setStatus('connecting…');
            break;
          case 'live':
            store().setStatus('listening');
            break;
          case 'reconnecting':
            store().setStatus('reconnecting…');
            break;
          case 'error':
            store().setError(status.message);
            break;
        }
      },
      onEvent: (event) => {
        if (store().state !== 'listening') return;
        if (event.type === 'interim') store().setInterim(event.text);
        else store().addFinal(event.text);
      },
    });
  }
  await client.start();
}

async function stop(): Promise<void> {
  client?.stop();
  const raw = buffer();
  if (!raw) {
    // Nothing said — just dismiss.
    await finish();
    return;
  }
  store().setState('cleaning');
  await window.unseen.dictationCleanup(raw);
}

async function insertAndFinish(text: string): Promise<void> {
  store().setState('inserting');
  try {
    await window.unseen.dictationInsert(text);
  } catch (err) {
    console.error('[dictation] insert failed', err);
  }
  await finish();
}

/** Tell main the session is fully done; it hides the HUD and resets state. */
async function finish(): Promise<void> {
  await window.unseen.dictationCancel();
  store().reset();
}

export function initDictationController(): void {
  window.unseen.onDictationStart(() => void start());
  window.unseen.onDictationStop(() => void stop());

  window.unseen.onDictationCleanupDelta((delta) => store().appendCleaned(delta));
  window.unseen.onDictationCleanupDone(({ text }) => void insertAndFinish(text));
  window.unseen.onDictationCleanupError(() => {
    // Cleanup failed → insert the raw transcript so nothing is lost.
    void insertAndFinish(buffer());
  });
}
