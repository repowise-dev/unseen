import { app, ipcMain } from 'electron';
import { IPC } from '../shared/ipc-contract';
import type { AnswerPayload, DeepPartial, Settings } from '../shared/types';
import { settings } from './services/settings';
import { setSecret, secretsStatus } from './services/secrets';
import {
  listProfiles,
  getProfile,
  getActiveProfile,
  saveProfile,
  deleteProfile,
  openProfilesFolder,
} from './services/profiles';
import { importKnowledgeFiles } from './services/knowledge';
import {
  recordEvent,
  listSessions,
  exportSession,
  deleteSession,
  openSessionsFolder,
} from './services/sessions';
import { getLlmProvider, listLlmProviders, providerContext } from './services/llm/registry';
import { runAnswer, cancelAnswer } from './services/llm/run-answer';
import { getSttProvider, listSttProviders } from './services/stt/registry';
import { openSettingsWindow } from './windows/settings';
import { setPrivacyMode } from './windows/overlay';
import { runDictationCleanup } from './services/dictation/cleanup';
import { insertText, isFrontAppExcluded } from './services/insertion';
import { isAccessibilityTrusted } from './permissions';
import { finishDictation } from './dictation';

export function registerIpc(): void {
  ipcMain.handle(IPC.settingsGet, () => settings().get());
  ipcMain.handle(IPC.settingsSet, (_e, patch: DeepPartial<Settings>) => settings().set(patch));

  ipcMain.handle(IPC.secretsSet, (_e, id: string, value: string) => {
    setSecret(id, value);
    return secretsStatus();
  });
  ipcMain.handle(IPC.secretsStatus, () => secretsStatus());

  ipcMain.handle(IPC.profilesList, () => listProfiles());
  ipcMain.handle(IPC.profilesGet, (_e, id: string) => getProfile(id));
  ipcMain.handle(IPC.profilesGetActive, () => getActiveProfile());
  ipcMain.handle(IPC.profilesSave, (_e, profile: unknown) => saveProfile(profile));
  ipcMain.handle(IPC.profilesDelete, (_e, id: string) => deleteProfile(id));
  ipcMain.handle(IPC.knowledgeImport, () => importKnowledgeFiles());
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

  // Dictation STT: single speaker (no diarization) + snappier endpointing so
  // finals land fast after the user stops talking.
  ipcMain.handle(IPC.sttDescriptorDictation, () => {
    const cfg = settings().get();
    return getSttProvider(cfg.stt.provider).descriptor({
      ...cfg,
      stt: { ...cfg.stt, diarize: false, endpointingMs: Math.min(cfg.stt.endpointingMs, 150) },
    });
  });

  ipcMain.handle(IPC.answerStart, (event, payload: AnswerPayload) => {
    // Fire and forget; results stream back as events to the caller.
    void runAnswer(event.sender, payload);
    return { ok: true };
  });
  ipcMain.handle(IPC.answerCancel, () => cancelAnswer());

  // Dictation: renderer streams the raw STT buffer here for the cleanup pass.
  ipcMain.handle(IPC.dictationCleanup, (event, rawText: string) => {
    void runDictationCleanup(event.sender, rawText);
    return { ok: true };
  });
  // Insert cleaned text at the cursor (skips excluded front apps). After this,
  // the renderer reports done via dictationCancel to reset state + hide HUD.
  ipcMain.handle(IPC.dictationInsert, async (_e, text: string) => {
    const { excludeApps } = settings().get().dictation;
    if (await isFrontAppExcluded(excludeApps)) {
      return { pasted: false, reason: 'excluded-app' };
    }
    if (!isAccessibilityTrusted(false)) {
      isAccessibilityTrusted(true); // prompt
      return { pasted: false, reason: 'no-accessibility' };
    }
    return insertText(text);
  });
  ipcMain.handle(IPC.dictationCancel, () => finishDictation());
  ipcMain.handle(IPC.permAccessibility, () => isAccessibilityTrusted(true));

  ipcMain.handle(IPC.openSettings, () => openSettingsWindow());
  ipcMain.handle(IPC.setPrivacyMode, (_e, on: boolean) => setPrivacyMode(on));

  ipcMain.handle(IPC.appInfo, () => ({ version: app.getVersion(), platform: process.platform }));
  ipcMain.handle(IPC.quit, () => app.quit());

  // Sessions: transcript finals arrive fire-and-forget from the overlay.
  ipcMain.on(IPC.sessionFinal, (_e, ev: { text: string; speaker: number }) => {
    recordEvent({ t: Date.now(), type: 'final', text: ev.text, speaker: ev.speaker });
  });
  ipcMain.handle(IPC.sessionsList, () => listSessions());
  ipcMain.handle(IPC.sessionsExport, (_e, id: string) => exportSession(id));
  ipcMain.handle(IPC.sessionsDelete, (_e, id: string) => deleteSession(id));
  ipcMain.handle(IPC.sessionsOpenFolder, () => openSessionsFolder());
}
