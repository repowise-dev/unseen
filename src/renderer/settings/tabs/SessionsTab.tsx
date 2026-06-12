import React, { useEffect, useState } from 'react';
import type { SessionMeta } from '../../../shared/types';
import type { TabProps } from '../App';

function fmtDate(t: number): string {
  return new Date(t).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtDuration(meta: SessionMeta): string {
  const min = Math.round((meta.endedAt - meta.startedAt) / 60_000);
  return min < 1 ? '<1 min' : `${min} min`;
}

export function SessionsTab({ settings, update }: TabProps): React.JSX.Element {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [exported, setExported] = useState<string | null>(null);

  const refresh = (): void => {
    void window.sotto.sessionsList().then(setSessions);
  };
  useEffect(refresh, []);

  return (
    <div>
      <h2>Sessions</h2>
      <div className="field">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={settings.sessions.autoSave}
            onChange={(e) => update({ sessions: { autoSave: e.target.checked } })}
          />
          Record sessions (transcript + answers, stored only on this machine)
        </label>
      </div>

      {exported && <div className="verify ok">✓ Exported to {exported}</div>}

      {sessions.length === 0 ? (
        <p style={{ color: '#888', fontSize: 12, marginTop: 12 }}>
          No recorded sessions yet. Once the copilot hears speech, a session file starts
          automatically (when recording is on).
        </p>
      ) : (
        sessions.map((s) => (
          <div className="profile-card" key={s.id} style={{ cursor: 'default' }}>
            <span className="icon">🗒️</span>
            <div>
              <div className="name">{fmtDate(s.startedAt)}</div>
              <div className="desc">
                {fmtDuration(s)} · {s.finals} transcript segments · {s.answers} answers
              </div>
            </div>
            <div className="spacer" />
            <button
              className="btn secondary"
              onClick={async () => {
                const res = await window.sotto.sessionsExport(s.id);
                if (res.ok && res.path) setExported(res.path);
              }}
            >
              Export .md
            </button>
            <button
              className="btn secondary"
              onClick={async () => {
                await window.sotto.sessionsDelete(s.id);
                refresh();
              }}
            >
              Delete
            </button>
          </div>
        ))
      )}

      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn secondary" onClick={() => void window.sotto.sessionsOpenFolder()}>
          Open sessions folder…
        </button>
        <button className="btn secondary" onClick={refresh}>
          ↻ Refresh
        </button>
      </div>
    </div>
  );
}
