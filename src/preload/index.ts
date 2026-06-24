import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/ipc-contract';
import type {
  AnswerDone,
  AnswerPayload,
  AppInfo,
  DeepPartial,
  ModelInfo,
  Profile,
  ProfileSummary,
  ProviderInfo,
  SessionMeta,
  Settings,
  SttDescriptor,
  VerifyResult,
} from '../shared/types';

const api = {
  settingsGet: (): Promise<Settings> => ipcRenderer.invoke(IPC.settingsGet),
  settingsSet: (patch: DeepPartial<Settings>): Promise<Settings> =>
    ipcRenderer.invoke(IPC.settingsSet, patch),

  secretsSet: (id: string, value: string): Promise<Record<string, boolean>> =>
    ipcRenderer.invoke(IPC.secretsSet, id, value),
  secretsStatus: (): Promise<Record<string, boolean>> => ipcRenderer.invoke(IPC.secretsStatus),

  profilesList: (): Promise<ProfileSummary[]> => ipcRenderer.invoke(IPC.profilesList),
  profilesGet: (id: string): Promise<Profile | null> => ipcRenderer.invoke(IPC.profilesGet, id),
  profilesGetActive: (): Promise<Profile> => ipcRenderer.invoke(IPC.profilesGetActive),
  profilesSetActive: (id: string): Promise<Profile> =>
    ipcRenderer.invoke(IPC.profilesSetActive, id),
  profilesSave: (profile: Profile): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(IPC.profilesSave, profile),
  profilesDelete: (id: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(IPC.profilesDelete, id),
  profilesOpenFolder: (): Promise<void> => ipcRenderer.invoke(IPC.profilesOpenFolder),
  knowledgeImport: (): Promise<string[]> => ipcRenderer.invoke(IPC.knowledgeImport),

  providersList: (): Promise<{ llm: ProviderInfo[]; stt: ProviderInfo[] }> =>
    ipcRenderer.invoke(IPC.providersList),
  modelsList: (providerId: string): Promise<ModelInfo[]> =>
    ipcRenderer.invoke(IPC.modelsList, providerId),
  providerVerify: (kind: 'llm' | 'stt', providerId: string): Promise<VerifyResult> =>
    ipcRenderer.invoke(IPC.providerVerify, kind, providerId),

  sttDescriptor: (): Promise<SttDescriptor> => ipcRenderer.invoke(IPC.sttDescriptor),
  sttDescriptorDictation: (): Promise<SttDescriptor> =>
    ipcRenderer.invoke(IPC.sttDescriptorDictation),

  answerStart: (payload: AnswerPayload): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke(IPC.answerStart, payload),
  answerCancel: (): Promise<void> => ipcRenderer.invoke(IPC.answerCancel),

  // dictation
  dictationCleanup: (rawText: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke(IPC.dictationCleanup, rawText),
  dictationInsert: (text: string): Promise<{ pasted: boolean; reason?: string }> =>
    ipcRenderer.invoke(IPC.dictationInsert, text),
  dictationCancel: (): Promise<void> => ipcRenderer.invoke(IPC.dictationCancel),
  permAccessibility: (): Promise<boolean> => ipcRenderer.invoke(IPC.permAccessibility),
  onDictationStart: (cb: () => void) => ipcRenderer.on(IPC.evDictationStart, () => cb()),
  onDictationStop: (cb: () => void) => ipcRenderer.on(IPC.evDictationStop, () => cb()),
  onDictationCleanupDelta: (cb: (text: string) => void) =>
    ipcRenderer.on(IPC.evDictationCleanupDelta, (_e, t: string) => cb(t)),
  onDictationCleanupDone: (cb: (done: { text: string }) => void) =>
    ipcRenderer.on(IPC.evDictationCleanupDone, (_e, d: { text: string }) => cb(d)),
  onDictationCleanupError: (cb: (err: string) => void) =>
    ipcRenderer.on(IPC.evDictationCleanupError, (_e, err: string) => cb(err)),

  openSettings: (): Promise<void> => ipcRenderer.invoke(IPC.openSettings),
  setPrivacyMode: (on: boolean): Promise<void> => ipcRenderer.invoke(IPC.setPrivacyMode, on),
  appInfo: (): Promise<AppInfo> => ipcRenderer.invoke(IPC.appInfo),
  quit: (): Promise<void> => ipcRenderer.invoke(IPC.quit),

  sessionRecordFinal: (ev: { text: string; speaker: number }): void =>
    ipcRenderer.send(IPC.sessionFinal, ev),
  sessionsList: (): Promise<SessionMeta[]> => ipcRenderer.invoke(IPC.sessionsList),
  sessionsExport: (id: string): Promise<{ ok: boolean; path?: string }> =>
    ipcRenderer.invoke(IPC.sessionsExport, id),
  sessionsDelete: (id: string): Promise<void> => ipcRenderer.invoke(IPC.sessionsDelete, id),
  sessionsOpenFolder: (): Promise<void> => ipcRenderer.invoke(IPC.sessionsOpenFolder),

  onAnswerDelta: (cb: (text: string) => void) =>
    ipcRenderer.on(IPC.evAnswerDelta, (_e, t: string) => cb(t)),
  onAnswerDone: (cb: (done: AnswerDone) => void) =>
    ipcRenderer.on(IPC.evAnswerDone, (_e, d: AnswerDone) => cb(d)),
  onAnswerError: (cb: (err: string) => void) =>
    ipcRenderer.on(IPC.evAnswerError, (_e, err: string) => cb(err)),
  onForceAnswer: (cb: () => void) => ipcRenderer.on(IPC.evForceAnswer, () => cb()),
  onTogglePause: (cb: () => void) => ipcRenderer.on(IPC.evTogglePause, () => cb()),
  onSettingsChanged: (cb: (s: Settings) => void) =>
    ipcRenderer.on(IPC.evSettingsChanged, (_e, s: Settings) => cb(s)),
  onProfilesChanged: (cb: (p: ProfileSummary[]) => void) =>
    ipcRenderer.on(IPC.evProfilesChanged, (_e, p: ProfileSummary[]) => cb(p)),
};

export type UnseenApi = typeof api;

contextBridge.exposeInMainWorld('unseen', api);
