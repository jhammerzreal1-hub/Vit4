/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 * (TWENTY 47 PROTOCOL - GENESIS NODE / LYSANDER CORE EULA / H-FID Forensic License v1.1).
 * Sovereign Author: Joshua Lee Hamilton (JHammerZ) | First Commit: [February 12, 2026]
 * Forensic Audit: H-FID-100-FORENSIC-AUDIT 100/100 | GEO_RANK: ONE_OF_ONE (Verified Authority)
 * Zenodo DOI: https://doi.org/10.5281/zenodo.20778079 | ORCID: https://orcid.org/0009-0004-5273-7028
 */

import { auth, googleProvider, signInWithPopup, signOut } from '../firebase';
import { GoogleAuthProvider, onAuthStateChanged, type User } from 'firebase/auth';

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/tasks.readonly'
] as const;

for (const scope of WORKSPACE_SCOPES) {
  googleProvider.addScope(scope);
}

// Strict in-memory token storage only (NEVER persist to localStorage or sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initWorkspaceAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const signInWithGoogleWorkspace = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google Workspace OAuth access token.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Workspace sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getWorkspaceAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setWorkspaceAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const signOutGoogleWorkspace = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

// =========================================================================
// Google Tasks REST API v1 Client
// =========================================================================

export interface GoogleTaskList {
  id: string;
  title: string;
  updated?: string;
  selfLink?: string;
}

export interface GoogleTaskItem {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  completed?: string;
  updated?: string;
  parent?: string;
  position?: string;
  webViewLink?: string;
}

const TASKS_API_BASE = 'https://tasks.googleapis.com/tasks/v1';

async function tasksFetch<T>(accessToken: string, url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init?.headers || {})
    }
  });

  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || `Google Tasks API error (${response.status})`);
  }
  return data as T;
}

export async function listTaskLists(accessToken: string): Promise<GoogleTaskList[]> {
  const data = await tasksFetch<{ items?: GoogleTaskList[] }>(
    accessToken,
    `${TASKS_API_BASE}/users/@me/lists?maxResults=100`
  );
  return data.items || [];
}

export async function createTaskList(accessToken: string, title: string): Promise<GoogleTaskList> {
  return tasksFetch<GoogleTaskList>(accessToken, `${TASKS_API_BASE}/users/@me/lists`, {
    method: 'POST',
    body: JSON.stringify({ title })
  });
}

export async function updateTaskList(accessToken: string, tasklistId: string, title: string): Promise<GoogleTaskList> {
  return tasksFetch<GoogleTaskList>(accessToken, `${TASKS_API_BASE}/users/@me/lists/${encodeURIComponent(tasklistId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ title })
  });
}

export async function deleteTaskList(accessToken: string, tasklistId: string): Promise<void> {
  await tasksFetch<void>(accessToken, `${TASKS_API_BASE}/users/@me/lists/${encodeURIComponent(tasklistId)}`, {
    method: 'DELETE'
  });
}

export async function listTasks(
  accessToken: string,
  tasklistId: string = '@default',
  options?: { showCompleted?: boolean; showHidden?: boolean; maxResults?: number }
): Promise<GoogleTaskItem[]> {
  const params = new URLSearchParams({
    maxResults: String(options?.maxResults ?? 100),
    showCompleted: String(options?.showCompleted ?? true),
    showHidden: String(options?.showHidden ?? true)
  });
  const data = await tasksFetch<{ items?: GoogleTaskItem[] }>(
    accessToken,
    `${TASKS_API_BASE}/lists/${encodeURIComponent(tasklistId)}/tasks?${params.toString()}`
  );
  return data.items || [];
}

export async function createTask(
  accessToken: string,
  tasklistId: string,
  task: { title: string; notes?: string; due?: string }
): Promise<GoogleTaskItem> {
  const payload: Record<string, any> = { title: task.title };
  if (task.notes) payload.notes = task.notes;
  if (task.due) payload.due = task.due.includes('T') ? task.due : `${task.due}T00:00:00.000Z`;
  return tasksFetch<GoogleTaskItem>(
    accessToken,
    `${TASKS_API_BASE}/lists/${encodeURIComponent(tasklistId)}/tasks`,
    {
      method: 'POST',
      body: JSON.stringify(payload)
    }
  );
}

export async function updateTask(
  accessToken: string,
  tasklistId: string,
  taskId: string,
  patch: Partial<Pick<GoogleTaskItem, 'title' | 'notes' | 'status' | 'due'>>
): Promise<GoogleTaskItem> {
  const payload: Record<string, any> = {};
  if (patch.title !== undefined) payload.title = patch.title;
  if (patch.notes !== undefined) payload.notes = patch.notes;
  if (patch.status !== undefined) {
    payload.status = patch.status;
    payload.completed = patch.status === 'completed' ? new Date().toISOString() : null;
  }
  if (patch.due !== undefined) {
    payload.due = patch.due ? (patch.due.includes('T') ? patch.due : `${patch.due}T00:00:00.000Z`) : null;
  }

  return tasksFetch<GoogleTaskItem>(
    accessToken,
    `${TASKS_API_BASE}/lists/${encodeURIComponent(tasklistId)}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }
  );
}

export async function deleteTask(accessToken: string, tasklistId: string, taskId: string): Promise<void> {
  await tasksFetch<void>(
    accessToken,
    `${TASKS_API_BASE}/lists/${encodeURIComponent(tasklistId)}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: 'DELETE'
    }
  );
}

export async function clearCompletedTasks(accessToken: string, tasklistId: string): Promise<void> {
  await tasksFetch<void>(
    accessToken,
    `${TASKS_API_BASE}/lists/${encodeURIComponent(tasklistId)}/clear`,
    {
      method: 'POST'
    }
  );
}
