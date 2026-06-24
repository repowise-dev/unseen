import { useDictationStore } from './store';

export function Hud() {
  const { state, status, interim, finals, cleaned, error } = useDictationStore();

  const dotClass =
    state === 'listening'
      ? 'live'
      : state === 'cleaning' || state === 'inserting'
        ? 'thinking'
        : state === 'error'
          ? 'error'
          : '';

  const label =
    state === 'listening'
      ? status || 'listening'
      : state === 'cleaning'
        ? 'cleaning up…'
        : state === 'inserting'
          ? 'inserting…'
          : state === 'error'
            ? 'error'
            : '';

  // While listening show live transcript; during cleanup show the streaming
  // cleaned text (falling back to the raw buffer until the first token).
  const body =
    state === 'cleaning' || state === 'inserting'
      ? cleaned || finals
      : error || [finals, interim].filter(Boolean).join(' ');

  return (
    <div id="hud" className={`state-${state}`}>
      <div className="hud-bar">
        <span className={`dot ${dotClass}`} />
        <span className="hud-label">{label}</span>
        {state === 'listening' && <span className="hud-hint">⌘⇧D to finish</span>}
      </div>
      <div className="hud-body">
        {body || <span className="hud-placeholder">Speak now…</span>}
      </div>
    </div>
  );
}
