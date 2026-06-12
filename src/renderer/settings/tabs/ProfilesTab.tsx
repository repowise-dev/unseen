import React, { useEffect, useState } from 'react';
import type { ProfileSummary, Settings } from '../../../shared/types';

export function ProfilesTab({ settings }: { settings: Settings }): React.JSX.Element {
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);

  useEffect(() => {
    void window.sotto.profilesList().then(setProfiles);
    window.sotto.onProfilesChanged(setProfiles);
  }, []);

  return (
    <div>
      <h2>Profiles</h2>
      <p style={{ color: '#888', fontSize: 12, marginBottom: 14, maxWidth: 560 }}>
        Profiles define how the copilot behaves — its prompt, when it speaks up, and its output
        style. They are plain YAML files: duplicate one into your profiles folder to customize, and
        changes hot-reload.
      </p>
      {profiles.map((p) => (
        <div
          key={p.id}
          className={`profile-card ${p.id === settings.activeProfile ? 'active' : ''}`}
          onClick={() => void window.sotto.profilesSetActive(p.id)}
        >
          <span className="icon">{p.icon}</span>
          <div>
            <div className="name">
              {p.name}{' '}
              {p.builtin && <span className="badge">built-in</span>}
            </div>
            <div className="desc">{p.description}</div>
          </div>
          <div className="spacer" />
          {p.id === settings.activeProfile && <span className="badge set">active</span>}
        </div>
      ))}
      <button className="btn secondary" onClick={() => void window.sotto.profilesOpenFolder()}>
        Open profiles folder…
      </button>
    </div>
  );
}
