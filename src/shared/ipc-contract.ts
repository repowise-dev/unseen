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
  sttDescriptorDictation: 'stt:descriptor-dictation',
  answerStart: 'answer:start',
  answerCancel: 'answer:cancel',
  openSettings: 'window:open-settings',
  setPrivacyMode: 'overlay:set-privacy',
  appInfo: 'app:info',
  quit: 'app:quit',

  // dictation (renderer → main)
  dictationCleanup: 'dictation:cleanup', // raw text → start cleanup stream
  dictationInsert: 'dictation:insert', // cleaned text → paste at cursor
  dictationCancel: 'dictation:cancel', // abort session, hide HUD
  permAccessibility: 'perm:accessibility', // check/prompt macOS Accessibility

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

  // dictation events (main → dictation renderer)
  evDictationStart: 'dictation:start', // begin listening
  evDictationStop: 'dictation:stop', // stop listening → cleanup → insert
  evDictationCleanupDelta: 'dictation:cleanup-delta',
  evDictationCleanupDone: 'dictation:cleanup-done',
  evDictationCleanupError: 'dictation:cleanup-error',
} as const;

export type IpcChannel = (typeof IPC)[keyof typeof IPC];
