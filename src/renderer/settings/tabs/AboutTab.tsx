import React, { useEffect, useState } from 'react';
import type { AppInfo, Settings } from '../../../shared/types';

export function AboutTab({ settings }: { settings: Settings }): React.JSX.Element {
  const [info, setInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    void window.unseen.appInfo().then(setInfo);
  }, []);

  const hk = settings.hotkeys;
  const pretty = (accel: string): string =>
    accel.replace('CommandOrControl', info?.platform === 'darwin' ? '⌘' : 'Ctrl');

  return (
    <div className="about">
      <h2>Unseen {info ? `v${info.version}` : ''}</h2>
      <p>Your photographic memory — open-source, local-first.</p>
      <p>
        <a href="https://github.com/repowise-dev/unseen" target="_blank" rel="noreferrer">
          github.com/repowise-dev/unseen
        </a>
      </p>

      <h3>Global hotkeys</h3>
      <table className="hotkeys">
        <tbody>
          <tr><td><kbd>{pretty(hk.toggleVisibility)}</kbd></td><td>show / hide overlay</td></tr>
          <tr><td><kbd>{pretty(hk.askNow)}</kbd></td><td>answer the latest thing said</td></tr>
          <tr><td><kbd>{pretty(hk.pause)}</kbd></td><td>pause / resume listening</td></tr>
          <tr><td><kbd>{pretty(hk.cycleProfile)}</kbd></td><td>next profile</td></tr>
          <tr><td><kbd>{pretty(hk.privacyMode)}</kbd></td><td>toggle Privacy Mode</td></tr>
        </tbody>
      </table>
      <p style={{ marginTop: 10, fontSize: 12 }}>
        Remap by editing <code>hotkeys</code> in settings.json (Electron accelerator syntax).
      </p>

      <h3>Privacy</h3>
      <p style={{ fontSize: 12 }}>
        Transcripts and answers stay on this machine. API keys live in your OS keychain. No
        telemetry, ever. Recording-consent laws vary by jurisdiction — get consent before
        transcribing other people.
      </p>
    </div>
  );
}
