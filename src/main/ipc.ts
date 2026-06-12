import { app, ipcMain } from 'electron';
import { IPC } from '../shared/ipc-contract';
import type { AnswerPayload, DeepPartial, Settings } from '../shared/types';
import { settings } from './services/settings';
import { setSecret, secretsStatus } from './services/secrets';
import {
  listProfiles,
  getActiveProfile,
  openProfilesFolder,
} from './services/profiles';
import { getLlmProvider, listLlmProviders, providerContext } from './services/llm/registry';
import { runAnswer, cancelAnswer } from './services/llm/run-answer';
import { getSttProvider, listSttProviders } from './services/stt/registry';
import { openSettingsWindow } from './windows/settings';
import { setPrivacyMode } from './windows/overlay';

export function registerIpc(): void {
  ipcMain.handle(IPC.settingsGet, () => settings().get());
  ipcMain.handle(IPC.settingsSet, (_e, patch: DeepPartial<Settings>) => settings().set(patch));

  ipcMain.handle(IPC.secretsSet, (_e, id: string, value: string) => {
    setSecret(id, value);
    return secretsStatus();
  });
  ipcMain.handle(IPC.secretsStatus, () => secretsStatus());

  ipcMain.handle(IPC.profilesList, () => listProfiles());
  ipcMain.handle(IPC.profilesGetActive, () => getActiveProfile());
  ipcMain.handle(IPC.profilesSetActive, (_e, id: string) => {
    settings().set({ activeProfile: id });
    return getActiveProfile();
  });
  ipcMain.handle(IPC.profilesOpenFolder, () => openProfilesFolder());

  ipcMain.handle(IPC.providersList, () => ({
    llm: listLlmProviders(),
    stt: listSttProviders(),
  }));

  ipcMain.handle(IPC.modelsList, async (_e, providerId: string) => {
    const cfg = settings().get();
    return getLlmProvider(providerId).listModels(providerContext(providerId, cfg));
  });

  ipcMain.handle(IPC.providerVerify, async (_e, kind: 'llm' | 'stt', providerId: string) => {
    const cfg = settings().get();
    if (kind === 'stt') return getSttProvider(providerId).verify(cfg);
    return getLlmProvider(providerId).verify(providerContext(providerId, cfg));
  });

  ipcMain.handle(IPC.sttDescriptor, () => {
    const cfg = settings().get();
    return getSttProvider(cfg.stt.provider).descriptor(cfg);
  });

  ipcMain.handle(IPC.answerStart, (event, payload: AnswerPayload) => {
    // Fire and forget; results stream back as events to the caller.
    void runAnswer(event.sender, payload);
    return { ok: true };
  });
  ipcMain.handle(IPC.answerCancel, () => cancelAnswer());

  ipcMain.handle(IPC.openSettings, () => openSettingsWindow());
  ipcMain.handle(IPC.setPrivacyMode, (_e, on: boolean) => setPrivacyMode(on));

  ipcMain.handle(IPC.appInfo, () => ({ version: app.getVersion(), platform: process.platform }));
}
