import React, { useEffect, useState } from 'react';
import type { TabProps } from '../App';

export function AudioTab({ settings, update }: TabProps): React.JSX.Element {
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    // Device labels need a granted mic permission; the overlay normally asks
    // first. Enumerate regardless and show ids as a fallback.
    void navigator.mediaDevices
      .enumerateDevices()
      .then((all) => setMics(all.filter((d) => d.kind === 'audioinput')));
  }, []);

  const set = update;

  return (
    <div>
      <h2>Audio</h2>
      <div className="field">
        <label>Microphone</label>
        <select
          value={settings.stt.micDeviceId}
          onChange={(e) => set({ stt: { micDeviceId: e.target.value } })}
        >
          <option value="default">System default</option>
          {mics.map((m) => (
            <option key={m.deviceId} value={m.deviceId}>
              {m.label || m.deviceId}
            </option>
          ))}
        </select>
        <div className="hint">
          To also capture the other side of the call, route system audio into a virtual device
          (BlackHole on macOS) and select it here — see docs/system-audio.md.
        </div>
      </div>
      <div className="field">
        <label>Language</label>
        <input
          value={settings.stt.language}
          onChange={(e) => set({ stt: { language: e.target.value } })}
        />
        <div className="hint">BCP-47 code, e.g. en, de, hi — or "multi" for Deepgram multilingual.</div>
      </div>
      <div className="field">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={settings.stt.diarize}
            onChange={(e) => set({ stt: { diarize: e.target.checked } })}
          />
          Speaker diarization (who said what)
        </label>
      </div>
    </div>
  );
}
