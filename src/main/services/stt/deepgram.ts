import type { Settings, SttDescriptor, VerifyResult } from '../../../shared/types';
import type { SttProvider } from './provider';
import { getSecret } from '../secrets';

export const deepgramProvider: SttProvider = {
  id: 'deepgram',
  displayName: 'Deepgram (nova-3)',
  needsApiKey: true,

  descriptor(settings: Settings): SttDescriptor {
    const key = getSecret('deepgram');
    if (!key) throw new Error('No Deepgram API key — set one in Settings → Providers.');
    const params = new URLSearchParams({
      model: 'nova-3',
      smart_format: 'true',
      interim_results: 'true',
      punctuate: 'true',
      diarize: String(settings.stt.diarize),
      endpointing: String(settings.stt.endpointingMs),
    });
    if (settings.stt.language && settings.stt.language !== 'auto') {
      params.set('language', settings.stt.language);
    }
    return {
      providerId: 'deepgram',
      wsUrl: `wss://api.deepgram.com/v1/listen?${params}`,
      protocols: ['token', key],
      // Deepgram closes 1011/NET-0001 without audio or KeepAlive in a 10s
      // window; docs recommend 3-5s pings. Must be a TEXT frame.
      keepAlive: { intervalMs: 5000, payload: JSON.stringify({ type: 'KeepAlive' }) },
    };
  },

  async verify(): Promise<VerifyResult> {
    const key = getSecret('deepgram');
    if (!key) return { ok: false, message: 'No API key set.' };
    try {
      const res = await fetch('https://api.deepgram.com/v1/auth/token', {
        headers: { Authorization: `Token ${key}` },
      });
      if (res.status === 401) return { ok: false, message: 'Invalid API key.' };
      if (!res.ok) return { ok: false, message: `HTTP ${res.status}` };
      return { ok: true };
    } catch (err) {
      return { ok: false, message: `Network error: ${String(err)}` };
    }
  },
};
