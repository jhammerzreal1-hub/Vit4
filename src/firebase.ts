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

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  type User 
} from 'firebase/auth';
import { 
  getFirestore,
  initializeFirestore,
  enableNetwork,
  setLogLevel,
  doc, 
  getDoc,
  getDocFromServer,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  setDoc,
  addDoc,
  deleteDoc,
  type Unsubscribe
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Suppress noisy WebChannel transport reconnect messages
try {
  setLogLevel('silent');
} catch (_) {}

// Initialize Firestore using dedicated database ID and auto-detect long polling for iframe/proxy compatibility
const configuredDatabaseId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;
export const db = (() => {
  try {
    return configuredDatabaseId
      ? initializeFirestore(app, { experimentalAutoDetectLongPolling: true }, configuredDatabaseId)
      : initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
  } catch (_) {
    return configuredDatabaseId ? getFirestore(app, configuredDatabaseId) : getFirestore(app);
  }
})();

// Ensure network transport is explicitly enabled
enableNetwork(db).catch(() => {});

function isFirestoreServerResponseError(error: unknown): boolean {
  const code = (error as any)?.code || '';
  const msg = error instanceof Error ? error.message : String(error || '');
  // A permission-denied, not-found, or unauthenticated error from Firestore proves the live Cloud Firestore server responded over the network
  return (
    code === 'permission-denied' ||
    code === 'not-found' ||
    code === 'unauthenticated' ||
    /Missing or insufficient permissions|permission-denied|PERMISSION_DENIED/i.test(msg)
  );
}

// Validate Connection to Firestore as specified in firebase-integration-rpc
export async function testFirestoreConnection(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }
  try {
    await enableNetwork(db).catch(() => {});
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 4500));
    await Promise.race([getDocFromServer(doc(db, 'test', 'connection')), timeoutPromise]);
    return true;
  } catch (error) {
    if (isFirestoreServerResponseError(error)) {
      return true;
    }
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore client is offline or reconnecting.");
    }
    return false;
  }
}
testFirestoreConnection().catch(() => {});

/**
 * Measure live round-trip latency to Cloud Firestore in milliseconds
 */
export async function measureFirestoreLatency(): Promise<{ connected: boolean; latencyMs: number; authenticated?: boolean; error?: string }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { connected: false, latencyMs: 0, authenticated: !!auth.currentUser, error: 'Device Offline' };
  }
  
  const start = performance.now();
  try {
    await enableNetwork(db).catch(() => {});
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 4500));
    await Promise.race([getDocFromServer(doc(db, 'test', 'connection')), timeoutPromise]);
    const latencyMs = Math.max(1, Math.round(performance.now() - start));
    return { connected: true, latencyMs, authenticated: !!auth.currentUser };
  } catch (error: any) {
    const latencyMs = Math.max(1, Math.round(performance.now() - start));
    if (isFirestoreServerResponseError(error)) {
      // Cloud Firestore server responded live and evaluated security rules
      return { connected: true, latencyMs, authenticated: !!auth.currentUser };
    }
    const msg = String(error?.message || '');
    const isExplicitlyOffline =
      error?.code === 'unavailable' ||
      /the client is offline|Failed to get document because the client is offline/i.test(msg);
    if (!isExplicitlyOffline && typeof navigator !== 'undefined' && navigator.onLine) {
      // Verify server connectivity if WebChannel is still negotiating long-polling
      try {
        const healthStart = performance.now();
        const res = await fetch('/api/health', { cache: 'no-store' });
        if (res.ok) {
          const fallbackLatency = Math.max(1, Math.round(performance.now() - healthStart));
          return { connected: true, latencyMs: fallbackLatency, authenticated: !!auth.currentUser };
        }
      } catch (_) {}
    }
    return { connected: false, latencyMs, authenticated: !!auth.currentUser, error: error?.message || 'Connecting' };
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  type User,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  setDoc,
  addDoc,
  deleteDoc,
  doc
};
