import React, { useEffect, useState } from 'react';
import type { Profile, ProfileSummary } from '../../../shared/types';
import type { TabProps } from '../App';
import { ProfileEditor } from './ProfileEditor';

const NEW_PROFILE: Profile = {
  id: 'my-profile',
  name: 'My Profile',
  description: 'Describe when to use this profile.',
  icon: '🎙️',
  prompt: {
    system:
      'You are a discreet real-time assistant watching a live conversation.\n' +
      'The speaker marked {{user_speaker}} is your user.\n' +
      '{{#knowledge}}Ground your answers in the reference knowledge below.{{/knowledge}}\n' +
      'Lead with the most useful thing to say next. Reply SKIP when there is nothing actionable.',
    response_style: 'spoken',
    language: 'auto',
  },
  knowledge: { prompt_label: 'REFERENCE KNOWLEDGE', files: [] },
  triggers: {
    auto: true,
    detectors: ['question', 'request'],
    keywords: [],
    debounce_ms: 1500,
    min_chars: 8,
  },
};

export function ProfilesTab({ settings, update }: TabProps): React.JSX.Element {
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [editing, setEditing] = useState<{ profile: Profile; isNew: boolean } | null>(null);

  useEffect(() => {
    void window.sotto.profilesList().then(setProfiles);
    window.sotto.onProfilesChanged(setProfiles);
  }, []);

  const edit = async (id: string): Promise<void> => {
    const profile = await window.sotto.profilesGet(id);
    if (profile) setEditing({ profile, isNew: false });
  };

  const duplicate = async (id: string): Promise<void> => {
    const profile = await window.sotto.profilesGet(id);
    if (profile) {
      setEditing({
        profile: { ...profile, id: `${profile.id}-copy`, name: `${profile.name} (copy)` },
        isNew: true,
      });
    }
  };

  if (editing) {
    return (
      <ProfileEditor
        initial={editing.profile}
        isNew={editing.isNew}
        onClose={() => setEditing(null)}
      />
    );
  }

  return (
    <div>
      <h2>Profiles</h2>
      <p style={{ color: '#888', fontSize: 12, marginBottom: 14, maxWidth: 560 }}>
        Profiles define how the copilot behaves — its prompt, when it speaks up, its output style,
        and which of your documents it knows. Click a card to activate; <b>Edit</b> to change the
        prompt, triggers, or attached docs.
      </p>
      {profiles.map((p) => (
        <div
          key={p.id}
          className={`profile-card ${p.id === settings.activeProfile ? 'active' : ''}`}
          onClick={() => update({ activeProfile: p.id })}
        >
          <span className="icon">{p.icon}</span>
          <div>
            <div className="name">
              {p.name} {p.builtin && <span className="badge">built-in</span>}
            </div>
            <div className="desc">{p.description}</div>
          </div>
          <div className="spacer" />
          {p.id === settings.activeProfile && <span className="badge set">active</span>}
          <button
            className="btn secondary"
            onClick={(e) => {
              e.stopPropagation();
              void edit(p.id);
            }}
          >
            Edit
          </button>
          <button
            className="btn secondary"
            title="Create a copy to customize"
            onClick={(e) => {
              e.stopPropagation();
              void duplicate(p.id);
            }}
          >
            ⧉
          </button>
        </div>
      ))}
      <div className="row" style={{ marginTop: 12 }}>
        <button
          className="btn"
          onClick={() => setEditing({ profile: NEW_PROFILE, isNew: true })}
        >
          + New profile
        </button>
        <button className="btn secondary" onClick={() => void window.sotto.profilesOpenFolder()}>
          Open profiles folder…
        </button>
      </div>
    </div>
  );
}
