import React, { useCallback, useEffect, useState } from 'react';
import type { DeepPartial, Settings } from '../../shared/types';
import { deepMerge } from '../../shared/merge';
import { ProvidersTab } from './tabs/ProvidersTab';
import { AudioTab } from './tabs/AudioTab';
import { ProfilesTab } from './tabs/ProfilesTab';
import { SessionsTab } from './tabs/SessionsTab';
import { MemoryTab } from './tabs/MemoryTab';
import { AboutTab } from './tabs/AboutTab';
import { Wizard } from './Wizard';

const TABS = ['Providers', 'Audio', 'Profiles', 'Sessions', 'Memory', 'About'] as const;
type Tab = (typeof TABS)[number];

export interface TabProps {
  settings: Settings;
  /** Applies the patch to local state immediately (optimistic) and persists it. */
  update: (patch: DeepPartial<Settings>) => void;
}

export function App(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('Providers');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    window.unseen
      .settingsGet()
      .then(setSettings)
      .catch((err) => setLoadError(String(err)));
    // Sync changes made elsewhere (overlay toggles, hotkeys, other windows).
    window.unseen.onSettingsChanged(setSettings);
  }, []);

  const update = useCallback((patch: DeepPartial<Settings>): void => {
    // Optimistic: the UI must never wait on the IPC round trip.
    setSettings((prev) => (prev ? deepMerge(prev, patch) : prev));
    void window.unseen.settingsSet(patch);
  }, []);

  if (loadError) {
    return (
      <div className="layout">
        <main>
          <h2>Settings failed to load</h2>
          <p style={{ color: '#f87171', fontSize: 12 }}>{loadError}</p>
          <p style={{ color: '#888', fontSize: 12, marginTop: 8 }}>
            Try closing this window and reopening Settings from the overlay (⚙).
          </p>
        </main>
      </div>
    );
  }
  if (!settings) return <div className="layout" />;

  if (!settings.onboarded) {
    return <Wizard settings={settings} update={update} />;
  }

  return (
    <div className="layout">
      <nav>
        {TABS.map((t) => (
          <button key={t} className={t === tab ? 'active' : ''} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>
      <main>
        {tab === 'Providers' && <ProvidersTab settings={settings} update={update} />}
        {tab === 'Audio' && <AudioTab settings={settings} update={update} />}
        {tab === 'Profiles' && <ProfilesTab settings={settings} update={update} />}
        {tab === 'Sessions' && <SessionsTab settings={settings} update={update} />}
        {tab === 'Memory' && <MemoryTab settings={settings} update={update} />}
        {tab === 'About' && <AboutTab settings={settings} />}
      </main>
    </div>
  );
}
