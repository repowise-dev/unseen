import React, { useState } from 'react';
import { useOverlayStore } from './store';
import { askNow, togglePause } from './controller';
import { Transcript } from './components/Transcript';
import { AnswerFeed } from './components/AnswerFeed';

export function App(): React.JSX.Element {
  const status = useOverlayStore((s) => s.status);
  const profiles = useOverlayStore((s) => s.profiles);
  const activeProfile = useOverlayStore((s) => s.activeProfile);
  const usage = useOverlayStore((s) => s.usage);
  const sessionCost = useOverlayStore((s) => s.sessionCost);
  const settings = useOverlayStore((s) => s.settings);
  const setActiveProfile = useOverlayStore((s) => s.setActiveProfile);
  const [paused, setPaused] = useState(false);

  const privacyOn = settings?.overlay.privacyMode ?? true;
  const fontSize = settings?.overlay.fontSize ?? 13;

  const onProfileChange = async (id: string): Promise<void> => {
    const profile = await window.unseen.profilesSetActive(id);
    setActiveProfile(profile);
  };

  return (
    <div id="app" style={{ ['--answer-font-size' as never]: `${fontSize + 0.5}px` }}>
      <header>
        <select
          className="profile-picker"
          value={activeProfile?.id ?? ''}
          onChange={(e) => void onProfileChange(e.target.value)}
          title={activeProfile?.description}
        >
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.icon} {p.name}
            </option>
          ))}
        </select>
        <div className="status">
          <span className={`dot ${status.kind === 'idle' ? '' : status.kind}`} />
          <span className="status-text" title={status.text}>
            {status.text}
          </span>
          <button
            className={`ghost-btn ${privacyOn ? 'active' : ''}`}
            title={
              privacyOn
                ? 'Privacy Mode ON — this window is hidden from screen capture'
                : 'Privacy Mode OFF — this window is visible in screen shares'
            }
            onClick={() => void window.unseen.setPrivacyMode(!privacyOn)}
          >
            {privacyOn ? '🙈' : '👁'}
          </button>
          <button
            className="ghost-btn"
            title="Pause/resume listening"
            onClick={() => setPaused(togglePause())}
          >
            {paused ? '▶' : '⏸'}
          </button>
          <button className="ghost-btn" title="Answer the latest thing said" onClick={askNow}>
            Ask now
          </button>
          <button
            className="ghost-btn"
            title="Settings"
            onClick={() => void window.unseen.openSettings()}
          >
            ⚙
          </button>
          <button
            className="ghost-btn"
            title="Quit Unseen"
            onClick={() => void window.unseen.quit()}
          >
            ✕
          </button>
        </div>
      </header>

      <div className="section-label">Transcript</div>
      <Transcript />

      <div className="section-label">Answers</div>
      <AnswerFeed />

      <footer>
        <span>
          {settings
            ? `${settings.hotkeys.toggleVisibility.replace('CommandOrControl', '⌘')} hide · ${settings.hotkeys.askNow.replace('CommandOrControl', '⌘')} ask`
            : ''}
        </span>
        <span className="cost">
          {usage
            ? `in ${usage.inputTokens} · out ${usage.outputTokens}${
                sessionCost > 0 ? ` · ~$${sessionCost.toFixed(4)}` : ''
              }`
            : '—'}
        </span>
      </footer>
    </div>
  );
}
