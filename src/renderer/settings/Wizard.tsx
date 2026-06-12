import React, { useEffect, useState } from 'react';
import type { ProfileSummary, ProviderInfo, VerifyResult } from '../../shared/types';
import type { TabProps } from './App';

type Step = 'welcome' | 'stt' | 'llm' | 'profile' | 'done';
const ORDER: Step[] = ['welcome', 'stt', 'llm', 'profile', 'done'];

export function Wizard({ settings, update }: TabProps): React.JSX.Element {
  const [step, setStep] = useState<Step>('welcome');
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [dgKey, setDgKey] = useState('');
  const [llmKey, setLlmKey] = useState('');
  const [verify, setVerify] = useState<VerifyResult | null>(null);
  const [micState, setMicState] = useState<'untested' | 'ok' | 'denied'>('untested');

  useEffect(() => {
    void window.sotto.providersList().then((p) => setProviders(p.llm));
    void window.sotto.profilesList().then(setProfiles);
  }, []);

  const llmId = settings.llm.provider;
  const llmProvider = providers.find((p) => p.id === llmId);

  const next = (): void => {
    setVerify(null);
    setStep(ORDER[ORDER.indexOf(step) + 1] ?? 'done');
  };

  const finish = (): void => update({ onboarded: true });

  const testMic = async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicState('ok');
    } catch {
      setMicState('denied');
    }
  };

  return (
    <div className="wizard">
      <div className="wizard-card">
        <div className="wizard-steps">
          {ORDER.map((s, i) => (
            <span key={s} className={`wizard-dot ${ORDER.indexOf(step) >= i ? 'on' : ''}`} />
          ))}
        </div>

        {step === 'welcome' && (
          <>
            <h2>Welcome to Sotto 👋</h2>
            <p>
              Sotto listens to your conversations, transcribes them live, and surfaces answers and
              notes in a floating panel. Setup takes about a minute: a transcription key, an AI
              provider, and a profile.
            </p>
            <p className="hint" style={{ marginTop: 10 }}>
              Everything stays on your machine — transcripts, answers, keys (OS keychain). No
              telemetry. One ask: recording-consent laws vary, so tell people before transcribing
              them.
            </p>
            <div className="row wizard-nav">
              <button className="btn" onClick={next}>Get started →</button>
              <button className="btn secondary" onClick={finish}>Skip setup</button>
            </div>
          </>
        )}

        {step === 'stt' && (
          <>
            <h2>1 · Transcription</h2>
            <p className="hint">
              Sotto uses Deepgram for live speech-to-text (generous free tier). Grab a key at{' '}
              <b>console.deepgram.com</b> → API Keys.
            </p>
            <div className="field" style={{ marginTop: 12 }}>
              <label>Deepgram API key</label>
              <div className="row">
                <input
                  type="password"
                  value={dgKey}
                  placeholder="paste key"
                  onChange={(e) => setDgKey(e.target.value)}
                />
                <button
                  className="btn"
                  disabled={!dgKey}
                  onClick={async () => {
                    await window.sotto.secretsSet('deepgram', dgKey);
                    setVerify(await window.sotto.providerVerify('stt', 'deepgram'));
                  }}
                >
                  Save & test
                </button>
              </div>
              {verify && (
                <div className={`verify ${verify.ok ? 'ok' : 'bad'}`}>
                  {verify.ok ? '✓ Transcription ready' : `✗ ${verify.message}`}
                </div>
              )}
            </div>
            <div className="row wizard-nav">
              <button className="btn" onClick={next} disabled={!verify?.ok}>Next →</button>
              <button className="btn secondary" onClick={next}>Do this later</button>
            </div>
          </>
        )}

        {step === 'llm' && (
          <>
            <h2>2 · Answers (AI provider)</h2>
            <div className="field">
              <label>Provider</label>
              <select
                value={llmId}
                onChange={(e) => {
                  setVerify(null);
                  update({ llm: { provider: e.target.value } });
                }}
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>{p.displayName}</option>
                ))}
              </select>
              {llmId === 'ollama' && (
                <div className="hint">
                  No account needed — install from ollama.com, run `ollama pull llama3.2`, then test.
                </div>
              )}
            </div>
            {llmProvider?.needsApiKey && (
              <div className="field">
                <label>API key</label>
                <div className="row">
                  <input
                    type="password"
                    value={llmKey}
                    placeholder="paste key"
                    onChange={(e) => setLlmKey(e.target.value)}
                  />
                  <button
                    className="btn secondary"
                    disabled={!llmKey}
                    onClick={async () => {
                      await window.sotto.secretsSet(llmId, llmKey);
                      setLlmKey('');
                      setVerify(await window.sotto.providerVerify('llm', llmId));
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
            <div className="field">
              <button
                className="btn"
                onClick={async () => setVerify(await window.sotto.providerVerify('llm', llmId))}
              >
                Test connection
              </button>
              {verify && (
                <div className={`verify ${verify.ok ? 'ok' : 'bad'}`}>
                  {verify.ok ? '✓ Connected' : `✗ ${verify.message}`}
                </div>
              )}
            </div>
            <div className="row wizard-nav">
              <button className="btn" onClick={next} disabled={!verify?.ok}>Next →</button>
              <button className="btn secondary" onClick={next}>Do this later</button>
            </div>
          </>
        )}

        {step === 'profile' && (
          <>
            <h2>3 · Pick a starting profile</h2>
            <p className="hint">This decides how the copilot behaves. Switch anytime from the overlay.</p>
            <div style={{ marginTop: 10, maxHeight: 300, overflowY: 'auto' }}>
              {profiles.map((p) => (
                <div
                  key={p.id}
                  className={`profile-card ${p.id === settings.activeProfile ? 'active' : ''}`}
                  onClick={() => update({ activeProfile: p.id })}
                >
                  <span className="icon">{p.icon}</span>
                  <div>
                    <div className="name">{p.name}</div>
                    <div className="desc">{p.description}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="row wizard-nav">
              <button className="btn" onClick={next}>Next →</button>
            </div>
          </>
        )}

        {step === 'done' && (
          <>
            <h2>Ready 🎉</h2>
            <div className="field">
              <button className="btn secondary" onClick={() => void testMic()}>
                {micState === 'ok' ? '✓ Microphone working' : 'Test microphone access'}
              </button>
              {micState === 'denied' && (
                <div className="verify bad">
                  ✗ Mic blocked — allow it in System Settings → Privacy → Microphone, the app
                  reconnects automatically.
                </div>
              )}
            </div>
            <p className="hint">
              The floating panel is already running. Useful keys:{' '}
              <kbd>⌘⇧\</kbd> hide · <kbd>⌘⇧Space</kbd> ask now · <kbd>⌘⇧P</kbd> pause ·{' '}
              <kbd>⌘⇧H</kbd> privacy mode. The 🙈 icon means the panel is invisible to screen
              shares.
            </p>
            <div className="row wizard-nav">
              <button className="btn" onClick={finish}>Start using Sotto</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
