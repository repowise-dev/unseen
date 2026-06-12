// Single source of truth for IPC channel names. Both preload and main import
// from here so a typo'd channel is impossible.

export const IPC = {
  // invoke (renderer → main)
  settingsGet: 'settings:get',
  settingsSet: 'settings:set',
  secretsSet: 'secrets:set',
  secretsStatus: 'secrets:status',
  profilesList: 'profiles:list',
  profilesGet: 'profiles:get',
  profilesGetActive: 'profiles:get-active',
  profilesSetActive: 'profiles:set-active',
  profilesSave: 'profiles:save',
  profilesDelete: 'profiles:delete',
  profilesOpenFolder: 'profiles:open-folder',
  knowledgeImport: 'knowledge:import',
  providersList: 'providers:list',
  modelsList: 'models:list',
  providerVerify: 'provider:verify',
  sttDescriptor: 'stt:descriptor',
  answerStart: 'answer:start',
  answerCancel: 'answer:cancel',
  openSettings: 'window:open-settings',
  setPrivacyMode: 'overlay:set-privacy',
  appInfo: 'app:info',
  quit: 'app:quit',

  // sessions
  sessionFinal: 'session:final', // fire-and-forget (ipcRenderer.send)
  sessionsList: 'sessions:list',
  sessionsExport: 'sessions:export',
  sessionsDelete: 'sessions:delete',
  sessionsOpenFolder: 'sessions:open-folder',

  // events (main → renderer)
  evAnswerDelta: 'answer:delta',
  evAnswerDone: 'answer:done',
  evAnswerError: 'answer:error',
  evForceAnswer: 'hotkey:force-answer',
  evTogglePause: 'hotkey:toggle-pause',
  evSettingsChanged: 'settings:changed',
  evProfilesChanged: 'profiles:changed',
} as const;

export type IpcChannel = (typeof IPC)[keyof typeof IPC];
