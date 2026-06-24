import React, { useEffect, useState } from 'react';
import type { DistillResult, Namespace } from '../../../shared/types';
import type { TabProps } from '../App';

const NAMESPACES: Namespace[] = ['personal', 'work'];

export function MemoryTab({ settings, update }: TabProps): React.JSX.Element {
  const [distilling, setDistilling] = useState(false);
  const [result, setResult] = useState<DistillResult[] | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [agentInstalled, setAgentInstalled] = useState(false);
  const [dataDir, setDataDir] = useState<{
    current: string;
    isDefault: boolean;
    local: string;
    iCloud: string;
  } | null>(null);
  const d = settings.dictation;
  const notes = settings.memory.notes;

  useEffect(() => {
    void window.unseen.launchAgentStatus().then((s) => setAgentInstalled(s.installed));
    void window.unseen.dataDirInfo().then(setDataDir);
  }, []);

  const switchDataDir = async (target: string): Promise<void> => {
    await window.unseen.dataDirSet(target);
    setDataDir(await window.unseen.dataDirInfo());
  };

  const distill = async (): Promise<void> => {
    setDistilling(true);
    setResult(null);
    try {
      setResult(await window.unseen.memoryDistill());
    } finally {
      setDistilling(false);
    }
  };

  const syncNotes = async (): Promise<void> => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const r = await window.unseen.notesSyncNow();
      setSyncMsg(
        `Ingested ${r.typed} typed note(s), ${r.handwritten} handwritten` +
          (r.skippedNoOcr ? ` (${r.skippedNoOcr} skipped — no OCR engine installed)` : ''),
      );
    } finally {
      setSyncing(false);
    }
  };

  const toggleAgent = async (): Promise<void> => {
    const res = agentInstalled
      ? await window.unseen.launchAgentUninstall()
      : await window.unseen.launchAgentInstall();
    if (res.ok) setAgentInstalled(!agentInstalled);
    else setSyncMsg(res.error ?? 'Failed.');
  };

  return (
    <div>
      <h2>Memory & Dictation</h2>

      <div className="field">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={d.enabled}
            onChange={(e) => update({ dictation: { enabled: e.target.checked } })}
          />
          Enable system-wide dictation (⌘⇧D)
        </label>
        <div className="hint">
          Tap the hotkey in any app to dictate; tap again to insert cleaned text at the cursor.
        </div>
      </div>

      <div className="field">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={d.cleanup}
            onChange={(e) => update({ dictation: { cleanup: e.target.checked } })}
          />
          Clean up dictation with AI (filler removal, punctuation)
        </label>
        <div className="hint">
          Off = insert your words verbatim, instantly. On = an LLM tidies the text first (slower,
          can occasionally overcorrect).
        </div>
      </div>
      {d.cleanup && (
        <div className="field">
          <label>Cleanup model</label>
          <input
            value={d.model}
            onChange={(e) => update({ dictation: { model: e.target.value } })}
          />
          <div className="hint">
            Fast model used to clean up dictated speech (runs on your active LLM provider).
          </div>
        </div>
      )}

      <div className="field">
        <label>Excluded apps</label>
        <input
          value={d.excludeApps.join(', ')}
          placeholder="e.g. 1Password, Messages"
          onChange={(e) =>
            update({
              dictation: {
                excludeApps: e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              },
            })
          }
        />
        <div className="hint">
          When one of these is the front app, dictation skips both insertion and logging.
        </div>
      </div>

      <div className="field">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={d.logToMemory}
            onChange={(e) => update({ dictation: { logToMemory: e.target.checked } })}
          />
          Log dictation to the daily memory log
        </label>
        <div className="hint">
          Everything transcribed feeds a per-day log that distillation turns into structured facts.
        </div>
      </div>

      <div className="field">
        <label>Distillation</label>
        <button className="btn" onClick={() => void distill()} disabled={distilling}>
          {distilling ? 'Distilling…' : 'Distill now'}
        </button>
        <div className="hint">
          Turn today&apos;s log into deduped facts. Runs end-of-day automatically once the scheduler
          (Phase 3) is set up; safe to run repeatedly — it never duplicates.
        </div>
        {result && (
          <div className="verify ok" style={{ marginTop: 8 }}>
            {result.every((r) => r.events === 0)
              ? 'Nothing logged yet today.'
              : result
                  .filter((r) => r.events > 0)
                  .map((r) => `${r.ns}: ${r.added} new fact(s), ${r.total} total`)
                  .join(' · ')}
          </div>
        )}
      </div>

      <h2 style={{ marginTop: 24 }}>Knowledge sources</h2>
      {NAMESPACES.map((ns) => (
        <div className="field" key={ns}>
          <label style={{ textTransform: 'capitalize' }}>{ns} markdown</label>
          {settings.memory.sources
            .filter((s) => s.ns === ns)
            .map((s) => (
              <div className="row" key={s.path} style={{ alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, wordBreak: 'break-all', flex: 1 }}>{s.path}</span>
                <button
                  className="btn secondary"
                  onClick={() =>
                    void window.unseen.memoryRemoveSource(s.path, ns).then(() => undefined)
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          <button className="btn secondary" onClick={() => void window.unseen.memoryAddSource(ns)}>
            Add {ns} file/folder…
          </button>
        </div>
      ))}
      <div className="hint">
        Markdown files/folders (work notes, an Obsidian vault) are read straight into a namespace —
        a profile with that namespace in its <code>memory.namespaces</code> injects them.
      </div>

      <h2 style={{ marginTop: 24 }}>Apple Notes</h2>
      <div className="field">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={notes.enabled}
            onChange={(e) => update({ memory: { notes: { enabled: e.target.checked } } })}
          />
          Ingest Apple Notes into memory
        </label>
        <div className="hint">
          Typed notes are read via the official scripting API; handwriting uses Apple&apos;s
          pre-rendered images + a local OCR engine (offline). macOS only; needs Automation
          permission for Notes.
        </div>
      </div>
      <div className="field">
        <label>Default namespace for notes</label>
        <select
          value={notes.defaultNs}
          onChange={(e) => update({ memory: { notes: { defaultNs: e.target.value as Namespace } } })}
        >
          {NAMESPACES.map((ns) => (
            <option key={ns} value={ns}>
              {ns}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <button className="btn" onClick={() => void syncNotes()} disabled={syncing || !notes.enabled}>
          {syncing ? 'Syncing…' : 'Sync notes now'}
        </button>
        {syncMsg && (
          <div className="verify ok" style={{ marginTop: 8 }}>
            {syncMsg}
          </div>
        )}
      </div>

      <h2 style={{ marginTop: 24 }}>Background sync</h2>
      <div className="field">
        <label className="checkbox">
          <input type="checkbox" checked={agentInstalled} onChange={() => void toggleAgent()} />
          Run notes ingestion + distillation on a schedule
        </label>
        <div className="hint">
          Installs a macOS LaunchAgent that runs hourly and at 23:30 — even when the app window is
          closed. No manual setup.
        </div>
      </div>

      <h2 style={{ marginTop: 24 }}>Data location & sync</h2>
      <div className="field">
        <label>Where your data lives</label>
        <div className="hint" style={{ marginBottom: 8 }}>
          Storing data in iCloud Drive lets a second Mac see the same logs and memory after cloning.
          Switching copies your existing data across. Secrets always stay local.
        </div>
        {dataDir && (
          <>
            <div style={{ fontSize: 12, wordBreak: 'break-all', marginBottom: 8 }}>
              Current: <code>{dataDir.current}</code>
              {dataDir.isDefault ? ' (local)' : ' (custom)'}
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button
                className="btn"
                disabled={dataDir.current === dataDir.iCloud}
                onClick={() => void switchDataDir(dataDir.iCloud)}
              >
                Store data in iCloud
              </button>
              <button
                className="btn secondary"
                disabled={dataDir.isDefault}
                onClick={() => void switchDataDir('')}
              >
                Use local storage
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
