import React, { useState } from 'react';
import type { DistillResult } from '../../../shared/types';
import type { TabProps } from '../App';

export function MemoryTab({ settings, update }: TabProps): React.JSX.Element {
  const [distilling, setDistilling] = useState(false);
  const [result, setResult] = useState<DistillResult[] | null>(null);
  const d = settings.dictation;

  const distill = async (): Promise<void> => {
    setDistilling(true);
    setResult(null);
    try {
      setResult(await window.unseen.memoryDistill());
    } finally {
      setDistilling(false);
    }
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
        <label>Cleanup model</label>
        <input
          value={d.model}
          onChange={(e) => update({ dictation: { model: e.target.value } })}
        />
        <div className="hint">
          Fast model used to clean up dictated speech (runs on your active LLM provider). Default:
          claude-haiku-4-5.
        </div>
      </div>

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
    </div>
  );
}
