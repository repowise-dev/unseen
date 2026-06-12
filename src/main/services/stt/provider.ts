import type { Settings, SttDescriptor, VerifyResult } from '../../../shared/types';

// Audio capture must run in the renderer (getUserMedia); API keys live in
// main. So an STT provider's main-process half only builds a connection
// descriptor; the renderer's generic streaming client (overlay/stt-client.ts)
// opens the socket and a renderer-side parser (overlay/stt/parsers/) maps
// vendor messages to TranscriptEvents.

export interface SttProvider {
  readonly id: string;
  readonly displayName: string;
  readonly needsApiKey: boolean;
  descriptor(settings: Settings): SttDescriptor;
  verify(settings: Settings): Promise<VerifyResult>;
}
