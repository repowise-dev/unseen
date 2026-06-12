import React, { useEffect, useState } from 'react';
import type { Settings } from '../../shared/types';
import { ProvidersTab } from './tabs/ProvidersTab';
import { AudioTab } from './tabs/AudioTab';
import { ProfilesTab } from './tabs/ProfilesTab';
import { AboutTab } from './tabs/AboutTab';

const TABS = ['Providers', 'Audio', 'Profiles', 'About'] as const;
type Tab = (typeof TABS)[number];

export function App(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('Providers');
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    void window.sotto.settingsGet().then(setSettings);
    window.sotto.onSettingsChanged(setSettings);
  }, []);

  if (!settings) return <div className="layout" />;

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
        {tab === 'Providers' && <ProvidersTab settings={settings} />}
        {tab === 'Audio' && <AudioTab settings={settings} />}
        {tab === 'Profiles' && <ProfilesTab settings={settings} />}
        {tab === 'About' && <AboutTab settings={settings} />}
      </main>
    </div>
  );
}
