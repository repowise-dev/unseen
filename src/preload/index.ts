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
  profilesGetActive: (): Promise<Profile> => ipcRenderer.invoke(IPC.profilesGetActive),
  profilesSetActive: (id: string): Promise<Profile> =>
    ipcRenderer.invoke(IPC.profilesSetActive, id),
  profilesOpenFolder: (): Promise<void> => ipcRenderer.invoke(IPC.profilesOpenFolder),

  providersList: (): Promise<{ llm: ProviderInfo[]; stt: ProviderInfo[] }> =>
    ipcRenderer.invoke(IPC.providersList),
  modelsList: (providerId: string): Promise<ModelInfo[]> =>
    ipcRenderer.invoke(IPC.modelsList, providerId),
  providerVerify: (kind: 'llm' | 'stt', providerId: string): Promise<VerifyResult> =>
    ipcRenderer.invoke(IPC.providerVerify, kind, providerId),

  sttDescriptor: (): Promise<SttDescriptor> => ipcRenderer.invoke(IPC.sttDescriptor),

  answerStart: (payload: AnswerPayload): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke(IPC.answerStart, payload),
  answerCancel: (): Promise<void> => ipcRenderer.invoke(IPC.answerCancel),

  openSettings: (): Promise<void> => ipcRenderer.invoke(IPC.openSettings),
  setPrivacyMode: (on: boolean): Promise<void> => ipcRenderer.invoke(IPC.setPrivacyMode, on),
  appInfo: (): Promise<AppInfo> => ipcRenderer.invoke(IPC.appInfo),

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

export type SottoApi = typeof api;

contextBridge.exposeInMainWorld('sotto', api);
