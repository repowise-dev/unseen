import type { ProviderInfo } from '../../../shared/types';
import type { SttProvider } from './provider';
import { deepgramProvider } from './deepgram';

// To add an STT vendor: implement SttProvider here (main half) plus a message
// parser in src/renderer/overlay/stt/parsers/ (renderer half), and register
// both. See docs/extending/stt-provider.md.
const providers: SttProvider[] = [deepgramProvider];

export function getSttProvider(id: string): SttProvider {
  const p = providers.find((p) => p.id === id);
  if (!p) throw new Error(`Unknown STT provider: ${id}`);
  return p;
}

export function listSttProviders(): ProviderInfo[] {
  return providers.map(({ id, displayName, needsApiKey }) => ({ id, displayName, needsApiKey }));
}
