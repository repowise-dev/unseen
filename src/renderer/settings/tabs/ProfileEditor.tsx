import React, { useState } from 'react';
import type { Profile, ResponseStyle } from '../../../shared/types';
import { KNOWN_DETECTORS } from '../../../shared/profile-schema';

const STYLES: { value: ResponseStyle; label: string }[] = [
  { value: 'spoken', label: 'Spoken — lines your user reads aloud' },
  { value: 'notes', label: 'Notes — terse bullets, decisions, action items' },
  { value: 'code-first', label: 'Code-first — complete runnable code blocks' },
];

const DETECTOR_HELP: Record<string, string> = {
  question: 'someone asks a question',
  request: 'an imperative request ("walk me through…")',
  'code-request': 'code is asked for (answers switch to code mode)',
  keyword: 'one of the keywords below is said',
};

export function ProfileEditor({
  initial,
  isNew,
  onClose,
}: {
  initial: Profile;
  isNew: boolean;
  onClose: () => void;
}): React.JSX.Element {
  const [p, setP] = useState<Profile>(initial);
  // Free-text fields are kept as strings and parsed on save, so typing is never fought.
  const [keywords, setKeywords] = useState(initial.triggers.keywords.join(', '));
  const [model, setModel] = useState(initial.llm?.model ?? '');
  const [maxTokens, setMaxTokens] = useState(initial.llm?.maxTokens?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);

  const wasBuiltin = initial.builtin && !isNew;

  const toggleDetector = (name: string): void => {
    const has = p.triggers.detectors.includes(name);
    setP({
      ...p,
      triggers: {
        ...p.triggers,
        detectors: has
          ? p.triggers.detectors.filter((d) => d !== name)
          : [...p.triggers.detectors, name],
      },
    });
  };

  const attachFiles = async (): Promise<void> => {
    const names = await window.unseen.knowledgeImport();
    if (names.length) {
      setP({
        ...p,
        knowledge: {
          ...p.knowledge,
          files: [...new Set([...p.knowledge.files, ...names])],
        },
      });
    }
  };

  const save = async (): Promise<void> => {
    setError(null);
    const llm: Profile['llm'] = {};
    if (model.trim()) llm.model = model.trim();
    if (maxTokens.trim()) llm.maxTokens = Number(maxTokens);
    const profile: Profile = {
      ...p,
      llm: Object.keys(llm).length ? llm : undefined,
      triggers: {
        ...p.triggers,
        keywords: keywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
      },
    };
    const res = await window.unseen.profilesSave(profile);
    if (!res.ok) setError(res.error ?? 'Unknown error');
    else onClose();
  };

  const remove = async (): Promise<void> => {
    const res = await window.unseen.profilesDelete(p.id);
    if (!res.ok) setError(res.error ?? 'Unknown error');
    else onClose();
  };

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', maxWidth: 620 }}>
        <h2>
          {isNew ? 'New profile' : `Edit: ${initial.name}`}
        </h2>
        <button className="btn secondary" onClick={onClose}>
          ← Back
        </button>
      </div>
      {wasBuiltin && (
        <p className="hint" style={{ marginBottom: 12 }}>
          This is a built-in profile — saving creates your own editable copy that overrides it.
          Deleting your copy later restores the original.
        </p>
      )}

      <div className="row" style={{ maxWidth: 620 }}>
        <div className="field" style={{ width: 90 }}>
          <label>Icon</label>
          <input value={p.icon} onChange={(e) => setP({ ...p, icon: e.target.value })} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>Name</label>
          <input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} />
        </div>
        <div className="field" style={{ width: 200 }}>
          <label>ID {!isNew && '(fixed)'}</label>
          <input
            value={p.id}
            disabled={!isNew}
            onChange={(e) => setP({ ...p, id: e.target.value })}
          />
        </div>
      </div>
      <div className="field" style={{ maxWidth: 620 }}>
        <label>Description</label>
        <input
          value={p.description}
          onChange={(e) => setP({ ...p, description: e.target.value })}
        />
      </div>

      <h3>System prompt</h3>
      <div className="field" style={{ maxWidth: 620 }}>
        <textarea
          rows={14}
          value={p.prompt.system}
          onChange={(e) => setP({ ...p, prompt: { ...p.prompt, system: e.target.value } })}
        />
        <div className="hint">
          Placeholders: <code>{'{{user_speaker}}'}</code> → your user's speaker tag;{' '}
          <code>{'{{#knowledge}}…{{/knowledge}}'}</code> → included only when files are attached
          below. End with the SKIP rule so the copilot stays quiet when there's nothing to say.
        </div>
      </div>
      <div className="field" style={{ maxWidth: 620 }}>
        <label>Output style</label>
        <select
          value={p.prompt.response_style}
          onChange={(e) =>
            setP({ ...p, prompt: { ...p.prompt, response_style: e.target.value as ResponseStyle } })
          }
        >
          {STYLES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <h3>Knowledge files</h3>
      <div className="field" style={{ maxWidth: 620 }}>
        <div className="hint" style={{ marginBottom: 8 }}>
          Markdown/text docs injected into the prompt (product docs, battlecards, prep notes…).
          With Anthropic these are cached — repeated answers pay ~10% for them.
        </div>
        {p.knowledge.files.map((f) => (
          <div className="file-row" key={f}>
            <span>📄 {f}</span>
            <button
              className="btn secondary"
              onClick={() =>
                setP({
                  ...p,
                  knowledge: {
                    ...p.knowledge,
                    files: p.knowledge.files.filter((x) => x !== f),
                  },
                })
              }
            >
              remove
            </button>
          </div>
        ))}
        <button className="btn secondary" onClick={() => void attachFiles()}>
          + Attach files…
        </button>
      </div>

      <h3>When should it speak up?</h3>
      <div className="field" style={{ maxWidth: 620 }}>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={p.triggers.auto}
            onChange={(e) =>
              setP({ ...p, triggers: { ...p.triggers, auto: e.target.checked } })
            }
          />
          Answer automatically (otherwise only via “Ask now” / hotkey)
        </label>
      </div>
      {p.triggers.auto && (
        <>
          <div className="field" style={{ maxWidth: 620 }}>
            {KNOWN_DETECTORS.map((d) => (
              <label className="checkbox" key={d}>
                <input
                  type="checkbox"
                  checked={p.triggers.detectors.includes(d)}
                  onChange={() => toggleDetector(d)}
                />
                <b>{d}</b>&nbsp;— {DETECTOR_HELP[d]}
              </label>
            ))}
          </div>
          {p.triggers.detectors.includes('keyword') && (
            <div className="field" style={{ maxWidth: 620 }}>
              <label>Keywords (comma-separated)</label>
              <input
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="pricing, competitor, recap"
              />
            </div>
          )}
          <div className="row" style={{ maxWidth: 620 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Min gap between answers (ms)</label>
              <input
                type="number"
                value={p.triggers.debounce_ms}
                onChange={(e) =>
                  setP({
                    ...p,
                    triggers: { ...p.triggers, debounce_ms: Number(e.target.value) || 0 },
                  })
                }
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Ignore fragments shorter than (chars)</label>
              <input
                type="number"
                value={p.triggers.min_chars}
                onChange={(e) =>
                  setP({
                    ...p,
                    triggers: { ...p.triggers, min_chars: Number(e.target.value) || 0 },
                  })
                }
              />
            </div>
          </div>
        </>
      )}

      <h3>Model override (optional)</h3>
      <div className="row" style={{ maxWidth: 620 }}>
        <div className="field" style={{ flex: 2 }}>
          <label>Model (empty = use global setting)</label>
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g. claude-haiku-4-5 for cheap/fast notes"
          />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>Max tokens</label>
          <input
            type="number"
            value={maxTokens}
            onChange={(e) => setMaxTokens(e.target.value)}
            placeholder="global"
          />
        </div>
      </div>

      {error && <div className="verify bad">✗ {error}</div>}
      <div className="row" style={{ marginTop: 16, maxWidth: 620 }}>
        <button className="btn" onClick={() => void save()}>
          Save profile
        </button>
        <button className="btn secondary" onClick={onClose}>
          Cancel
        </button>
        <div className="spacer" style={{ flex: 1 }} />
        {!isNew && !initial.builtin && (
          <button className="btn secondary" onClick={() => void remove()}>
            Delete{/* restores the built-in if this was an override */}
          </button>
        )}
      </div>
    </div>
  );
}
