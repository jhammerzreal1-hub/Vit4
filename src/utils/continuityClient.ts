/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 * (TWENTY 47 PROTOCOL - GENESIS NODE / LYSANDER CORE EULA / H-FID Forensic License v1.1).
 * Sovereign Author: Joshua Lee Hamilton (JHammerZ) | First Commit: [February 12, 2026]
 * Zenodo DOI: https://doi.org/10.5281/zenodo.20778079 | ORCID: https://orcid.org/0009-0004-5273-7028
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { apiFetch, getAuthBearerToken } from './authClient';

export interface ClientSettingsPatch {
  shell?: Record<string, any>;
  osCustomization?: Record<string, any>;
  chat?: Record<string, any>;
  voiceDock?: Record<string, any>;
}

export interface ContinuityTaskRecord {
  id: string;
  description: string;
  status: 'active' | 'completed' | 'interrupted';
  createdAt?: string;
  updatedAt?: string;
  agentId?: string;
  agentName?: string;
  goal?: string;
  cycle?: number;
  lastAction?: string;
  progressNotes?: string;
  source?: 'chat' | 'voice' | 'workflow' | 'autonomous';
  sessionId?: string;
  actionLog?: any[];
  checkpointJson?: string;
}

export interface ContinuityStateResponse {
  success: boolean;
  timestamp: string;
  orphanedTasksInterruptedAtBoot?: number;
  settings: {
    revision: number;
    updatedAt: string;
    shell: Record<string, any>;
    osCustomization: Record<string, any>;
    chat: Record<string, any>;
    voiceDock: Record<string, any>;
  };
  tasks: ContinuityTaskRecord[];
  interruptedTasks: ContinuityTaskRecord[];
  voice: {
    sessionId: string;
    updatedAt: string;
    activeModule: string;
    activeModulesList: string[];
    relayHistory: Array<{ role: 'user' | 'model'; text: string; timestamp?: string }>;
    transcripts: Array<{ id: string; role: 'user' | 'model' | 'thought' | 'tool'; text: string; timestamp: string }>;
  };
}

let pendingSettingsPatch: ClientSettingsPatch = {};
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let lastKnownSnapshot: {
  settings: ClientSettingsPatch;
  voice?: Record<string, any>;
  activeTask?: ContinuityTaskRecord | null;
} = { settings: {} };

const firestoreMetaCache = new Map<string, { exists: boolean; createdAt: string; revision: number }>();

function mergePatches(base: ClientSettingsPatch, next: ClientSettingsPatch): ClientSettingsPatch {
  return {
    shell: next.shell ? { ...(base.shell || {}), ...next.shell } : base.shell,
    osCustomization: next.osCustomization
      ? { ...(base.osCustomization || {}), ...next.osCustomization }
      : base.osCustomization,
    chat: next.chat ? { ...(base.chat || {}), ...next.chat } : base.chat,
    voiceDock: next.voiceDock ? { ...(base.voiceDock || {}), ...next.voiceDock } : base.voiceDock
  };
}

export function updateLocalBeaconSnapshot(partial: {
  settings?: ClientSettingsPatch;
  voice?: Record<string, any>;
  activeTask?: ContinuityTaskRecord | null;
}): void {
  if (partial.settings) {
    lastKnownSnapshot.settings = mergePatches(lastKnownSnapshot.settings, partial.settings);
  }
  if (partial.voice !== undefined) {
    lastKnownSnapshot.voice = partial.voice;
  }
  if (partial.activeTask !== undefined) {
    lastKnownSnapshot.activeTask = partial.activeTask;
  }
}

export async function flushPendingContinuityPatch(): Promise<void> {
  const payload = pendingSettingsPatch;
  pendingSettingsPatch = {};
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (!payload.shell && !payload.osCustomization && !payload.chat && !payload.voiceDock) {
    return;
  }
  try {
    await apiFetch('/api/continuity/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    });
  } catch (_) {}
}

export function pushContinuitySettingsPatch(patch: ClientSettingsPatch, immediate = false): void {
  pendingSettingsPatch = mergePatches(pendingSettingsPatch, patch);
  lastKnownSnapshot.settings = mergePatches(lastKnownSnapshot.settings, patch);

  if (immediate) {
    flushPendingContinuityPatch().catch(() => {});
    return;
  }

  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushPendingContinuityPatch().catch(() => {});
  }, 450);
}

export function flushContinuityBeacon(): void {
  if (typeof navigator === 'undefined') return;
  const combinedSettings = mergePatches(lastKnownSnapshot.settings, pendingSettingsPatch);
  pendingSettingsPatch = {};
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  const beaconPayload: Record<string, any> = {};
  if (combinedSettings.shell || combinedSettings.osCustomization || combinedSettings.chat || combinedSettings.voiceDock) {
    beaconPayload.settings = combinedSettings;
  }
  if (lastKnownSnapshot.activeTask) {
    beaconPayload.task = lastKnownSnapshot.activeTask;
  }
  if (lastKnownSnapshot.voice) {
    beaconPayload.voice = lastKnownSnapshot.voice;
  }
  if (Object.keys(beaconPayload).length === 0) return;

  try {
    const serialized = JSON.stringify(beaconPayload);
    const tok = getAuthBearerToken();
    const beaconUrl = tok ? `/api/continuity/beacon?token=${encodeURIComponent(tok)}` : '/api/continuity/beacon';
    if (typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([serialized], { type: 'text/plain;charset=UTF-8' });
      navigator.sendBeacon(beaconUrl, blob);
    } else {
      apiFetch(beaconUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: serialized,
        keepalive: true
      }).catch(() => {});
    }
  } catch (_) {}
}

export async function fetchServerContinuityState(): Promise<ContinuityStateResponse | null> {
  try {
    const res = await apiFetch('/api/continuity/state', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as ContinuityStateResponse;
    if (data?.success && data.settings) {
      lastKnownSnapshot.settings = mergePatches(
        {
          shell: data.settings.shell,
          osCustomization: data.settings.osCustomization,
          chat: data.settings.chat,
          voiceDock: data.settings.voiceDock
        },
        lastKnownSnapshot.settings
      );
      return data;
    }
  } catch (_) {}
  return null;
}

export async function upsertTaskCheckpointToServer(
  task: Partial<ContinuityTaskRecord> & { id: string }
): Promise<ContinuityTaskRecord | null> {
  try {
    lastKnownSnapshot.activeTask = task as ContinuityTaskRecord;
    const res = await apiFetch('/api/continuity/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
      keepalive: true
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.task || null;
  } catch (_) {
    return null;
  }
}

export async function fetchVoiceContinuityFromServer() {
  try {
    const res = await apiFetch('/api/continuity/voice', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.voice || null;
  } catch (_) {
    return null;
  }
}

export async function saveVoiceContinuityToServer(patch: {
  sessionId?: string;
  activeModule?: string;
  activeModulesList?: string[];
  relayHistory?: any[];
  transcripts?: any[];
}): Promise<void> {
  lastKnownSnapshot.voice = {
    ...(lastKnownSnapshot.voice || {}),
    ...patch
  };
  try {
    await apiFetch('/api/continuity/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
      keepalive: true
    });
  } catch (_) {}
}

function buildCompactContinuityJson(payload: Record<string, any>): string {
  let clone = { ...payload };
  let serialized = JSON.stringify(clone);
  if (serialized.length <= 185000) return serialized;

  if (clone.chat && Array.isArray(clone.chat.workflowActionLog)) {
    clone = {
      ...clone,
      chat: { ...clone.chat, workflowActionLog: clone.chat.workflowActionLog.slice(-25) }
    };
  }
  if (clone.voice && Array.isArray(clone.voice.transcripts)) {
    clone = {
      ...clone,
      voice: { ...clone.voice, transcripts: clone.voice.transcripts.slice(-40) }
    };
  }
  serialized = JSON.stringify(clone);
  if (serialized.length <= 185000) return serialized;

  return JSON.stringify({
    updatedAt: clone.updatedAt || new Date().toISOString(),
    shell: clone.shell || {},
    chat: {
      ...(clone.chat || {}),
      workflowActionLog: [],
      buildSteps: []
    },
    voiceDock: clone.voiceDock || {}
  }).slice(0, 195000);
}

export async function loadOrchestratorStateFromFirestore(userId: string): Promise<{
  revision: number;
  updatedAt: string;
  snapshot: Record<string, any>;
} | null> {
  if (!userId || !auth.currentUser || !auth.currentUser.emailVerified) return null;
  const path = `users/${userId}/orchestrator_state/main`;
  try {
    const ref = doc(db, 'users', userId, 'orchestrator_state', 'main');
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      firestoreMetaCache.set(userId, { exists: false, createdAt: new Date().toISOString(), revision: 0 });
      return null;
    }
    const data = snap.data() || {};
    const rev = typeof data.revision === 'number' ? data.revision : 0;
    const createdAt = typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString();
    firestoreMetaCache.set(userId, { exists: true, createdAt, revision: rev });

    let parsed: Record<string, any> = {};
    if (typeof data.continuityJson === 'string' && data.continuityJson.trim()) {
      parsed = JSON.parse(data.continuityJson);
    }
    return {
      revision: rev,
      updatedAt: String(data.updatedAt || ''),
      snapshot: parsed
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return null;
  }
}

export async function saveOrchestratorStateToFirestore(
  userId: string,
  snapshot: Record<string, any>
): Promise<void> {
  if (!userId || !auth.currentUser || !auth.currentUser.emailVerified) return;
  const path = `users/${userId}/orchestrator_state/main`;
  try {
    const ref = doc(db, 'users', userId, 'orchestrator_state', 'main');
    let meta = firestoreMetaCache.get(userId);
    if (!meta) {
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const existing = snap.data() || {};
        meta = {
          exists: true,
          createdAt: typeof existing.createdAt === 'string' ? existing.createdAt : new Date().toISOString(),
          revision: typeof existing.revision === 'number' ? existing.revision : 0
        };
      } else {
        meta = {
          exists: false,
          createdAt: new Date().toISOString(),
          revision: 0
        };
      }
    }

    const nextRevision = Math.min(100000000, Math.max(1, (meta.revision || 0) + 1));
    const nowIso = new Date().toISOString();
    const compactJson = buildCompactContinuityJson({
      ...snapshot,
      updatedAt: nowIso
    });

    await setDoc(
      ref,
      {
        userId,
        stateKey: 'main',
        continuityJson: compactJson,
        revision: nextRevision,
        createdAt: meta.createdAt,
        updatedAt: nowIso
      },
      { merge: true }
    );

    firestoreMetaCache.set(userId, {
      exists: true,
      createdAt: meta.createdAt,
      revision: nextRevision
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}
