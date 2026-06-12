import type { SttDescriptor, TranscriptEvent } from '../../../shared/types';
import { getParser } from './parsers';

// Generic streaming STT client: mic → MediaRecorder → vendor WebSocket.
// Provider-agnostic; vendor specifics come from the descriptor (built in main,
// so keys stay there) and the registered parser. Ports the battle-tested
// reconnect/keepalive/pause behavior from the original app:
//  - a single scheduleReconnect() path so a transient failure can never leave
//    us permanently silent, and reconnects never stack
//  - keepalive pings (Deepgram closes 1011 without audio in a ~10s window)
//  - the mic stream is released before reconnecting (a held device makes the
//    next getUserMedia throw → permanent silence)
//  - onerror never reconnects: onclose always follows and owns recovery

export type SttStatus =
  | { state: 'connecting' }
  | { state: 'live' }
  | { state: 'paused' }
  | { state: 'reconnecting' }
  | { state: 'error'; message: string };

export interface SttClientOpts {
  getDescriptor: () => Promise<SttDescriptor>;
  getMicDeviceId: () => string;
  onEvent: (e: TranscriptEvent) => void;
  onStatus: (s: SttStatus) => void;
}

export class SttClient {
  private ws: WebSocket | null = null;
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  private _paused = false;
  private stopped = false;

  constructor(private opts: SttClientOpts) {}

  get paused(): boolean {
    return this._paused;
  }

  async start(): Promise<void> {
    this.stopped = false;
    await this.connect();
  }

  stop(): void {
    this.stopped = true;
    this.cleanup();
  }

  togglePause(): boolean {
    this._paused = !this._paused;
    if (this._paused) {
      this.opts.onStatus({ state: 'paused' });
    } else if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.opts.onStatus({ state: 'reconnecting' });
      try {
        if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop();
      } catch {
        /* already stopped */
      }
      void this.connect();
    } else {
      this.opts.onStatus({ state: 'live' });
    }
    return this._paused;
  }

  private cleanup(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
    try {
      if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop();
    } catch {
      /* already stopped */
    }
    this.recorder = null;
    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop();
      this.stream = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      try {
        this.ws.close();
      } catch {
        /* already closed */
      }
      this.ws = null;
    }
  }

  private scheduleReconnect(delay: number): void {
    if (this.stopped || this._paused || this.reconnectTimer) return;
    this.opts.onStatus({ state: 'reconnecting' });
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, delay);
  }

  private async connect(): Promise<void> {
    if (this.stopped) return;
    this.cleanup();
    this.opts.onStatus({ state: 'connecting' });

    let descriptor: SttDescriptor;
    try {
      descriptor = await this.opts.getDescriptor();
    } catch (err) {
      // Config error (e.g. missing key) — retrying won't help.
      this.opts.onStatus({ state: 'error', message: String((err as Error).message ?? err) });
      return;
    }
    const parse = getParser(descriptor.providerId);

    try {
      const deviceId = this.opts.getMicDeviceId();
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          ...(deviceId && deviceId !== 'default' ? { deviceId: { exact: deviceId } } : {}),
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
        },
      });
    } catch {
      // Transient (device busy) or denial — retry either way; if the user
      // denied, this self-heals the moment they grant access.
      this.scheduleReconnect(3000);
      return;
    }

    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';
    const recorder = new MediaRecorder(this.stream, { mimeType: mime });
    this.recorder = recorder;

    const ws = new WebSocket(descriptor.wsUrl, descriptor.protocols);
    ws.binaryType = 'arraybuffer';
    this.ws = ws;

    ws.onopen = () => {
      if (!this._paused) this.opts.onStatus({ state: 'live' });
      recorder.start(250);
      recorder.ondataavailable = (e) => {
        if (this._paused) return;
        if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          void e.data.arrayBuffer().then((buf) => ws.send(buf));
        }
      };
    };

    ws.onmessage = (event) => {
      try {
        const parsed = parse(JSON.parse(event.data as string));
        if (parsed) this.opts.onEvent(parsed);
      } catch (err) {
        console.error('[stt] parse error', err);
      }
    };

    ws.onerror = () => {
      // onclose always follows and owns recovery — avoid double reconnects.
    };
    ws.onclose = () => {
      try {
        recorder.stop();
      } catch {
        /* already stopped */
      }
      if (this._paused) this.opts.onStatus({ state: 'paused' });
      else this.scheduleReconnect(2000);
    };

    if (descriptor.keepAlive) {
      const { intervalMs, payload } = descriptor.keepAlive;
      this.keepAliveTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(payload);
      }, intervalMs);
    }
  }
}
