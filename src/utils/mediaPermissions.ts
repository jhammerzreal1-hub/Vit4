/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 * (TWENTY 47 PROTOCOL - GENESIS NODE / LYSANDER CORE EULA / H-FID Forensic License v1.1).
 */

import { pushContinuitySettingsPatch } from './continuityClient';

export type MediaKind = 'microphone' | 'camera';
export type ResolvedBrowserPermissionState = 'granted' | 'prompt' | 'denied' | 'unknown';

export interface PersistedMediaPermissionsRecord {
  micGranted: boolean;
  micGrantedAt: string | null;
  cameraGranted: boolean;
  cameraGrantedAt: string | null;
  lastMicDeviceId?: string;
  lastMicLabel?: string;
}

export interface MediaPermissionProbe {
  kind: MediaKind;
  browserState: ResolvedBrowserPermissionState;
  hasLabeledHardwareDevice: boolean;
  rememberedGrant: boolean;
  canAcquireSilently: boolean;
}

const STORAGE_KEY = 'sovereign_media_permissions_v1';
const LEGACY_MIC_KEY = 'sovereign_voice_mic_permission_granted';
const LEGACY_CAM_KEY = 'sovereign_voice_camera_permission_granted';
const LEGACY_MIC_LABEL_KEY = 'sovereign_voice_mic_label';
const LEGACY_MIC_ID_KEY = 'sovereign_voice_mic_device_id';
const CONTINUITY_TS_KEY = 'sovereign_continuity_local_updated_at_v1';

let lastUserGestureAt = 0;
let gestureListenersInstalled = false;
let continuityListenerInstalled = false;
let micAcquireInFlight: Promise<{
  stream: MediaStream | null;
  status: 'granted' | 'needs-gesture' | 'denied' | 'unavailable';
  error?: any;
}> | null = null;
let cameraAcquireInFlight: Promise<{
  stream: MediaStream | null;
  status: 'granted' | 'needs-gesture' | 'denied' | 'unavailable';
  error?: any;
}> | null = null;

function installGlobalListenersOnce() {
  if (typeof window === 'undefined') return;

  if (!gestureListenersInstalled) {
    gestureListenersInstalled = true;
    const recordInteraction = (ev: Event) => {
      if ((ev as any).isTrusted !== false) {
        lastUserGestureAt = Date.now();
      }
    };
    window.addEventListener('pointerdown', recordInteraction, { capture: true, passive: true });
    window.addEventListener('keydown', recordInteraction, { capture: true, passive: true });
    window.addEventListener('touchstart', recordInteraction, { capture: true, passive: true });
  }

  if (!continuityListenerInstalled) {
    continuityListenerInstalled = true;
    window.addEventListener('sovereign_continuity_hydrated', (ev: Event) => {
      const detail = (ev as CustomEvent)?.detail;
      const vd = detail?.settings?.voiceDock;
      if (!vd || typeof vd !== 'object') return;
      const cur = loadPersistedMediaPermissions();
      let changed = false;
      if (vd.micPermissionGranted === true && !cur.micGranted) {
        cur.micGranted = true;
        cur.micGrantedAt = vd.micPermissionGrantedAt || new Date().toISOString();
        changed = true;
      }
      if (vd.cameraPermissionGranted === true && !cur.cameraGranted) {
        cur.cameraGranted = true;
        cur.cameraGrantedAt = vd.cameraPermissionGrantedAt || new Date().toISOString();
        changed = true;
      }
      if (typeof vd.selectedMicId === 'string' && vd.selectedMicId && !cur.lastMicDeviceId) {
        cur.lastMicDeviceId = vd.selectedMicId;
        changed = true;
      }
      if (typeof vd.micLabel === 'string' && vd.micLabel && !cur.lastMicLabel) {
        cur.lastMicLabel = vd.micLabel;
        changed = true;
      }
      if (changed) {
        savePersistedMediaPermissions(cur, false);
      }
    });
  }
}

installGlobalListenersOnce();

export function markVoiceUserGesture(): void {
  lastUserGestureAt = Date.now();
}

export function hasRecentUserActivation(maxAgeMs = 3000): boolean {
  installGlobalListenersOnce();
  if (typeof navigator !== 'undefined' && (navigator as any).userActivation?.isActive) {
    return true;
  }
  return lastUserGestureAt > 0 && Date.now() - lastUserGestureAt <= maxAgeMs;
}

export function loadPersistedMediaPermissions(): PersistedMediaPermissionsRecord {
  const fallback: PersistedMediaPermissionsRecord = {
    micGranted: false,
    micGrantedAt: null,
    cameraGranted: false,
    cameraGrantedAt: null
  };
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        fallback.micGranted = Boolean(parsed.micGranted);
        fallback.micGrantedAt = typeof parsed.micGrantedAt === 'string' ? parsed.micGrantedAt : null;
        fallback.cameraGranted = Boolean(parsed.cameraGranted);
        fallback.cameraGrantedAt = typeof parsed.cameraGrantedAt === 'string' ? parsed.cameraGrantedAt : null;
        if (typeof parsed.lastMicDeviceId === 'string') fallback.lastMicDeviceId = parsed.lastMicDeviceId;
        if (typeof parsed.lastMicLabel === 'string') fallback.lastMicLabel = parsed.lastMicLabel;
      }
    }
    if (!fallback.micGranted && localStorage.getItem(LEGACY_MIC_KEY) === '1') {
      fallback.micGranted = true;
      fallback.micGrantedAt = fallback.micGrantedAt || new Date().toISOString();
    }
    if (!fallback.cameraGranted && localStorage.getItem(LEGACY_CAM_KEY) === '1') {
      fallback.cameraGranted = true;
      fallback.cameraGrantedAt = fallback.cameraGrantedAt || new Date().toISOString();
    }
    if (!fallback.lastMicLabel) {
      const lbl = localStorage.getItem(LEGACY_MIC_LABEL_KEY);
      if (lbl) fallback.lastMicLabel = lbl;
    }
    if (!fallback.lastMicDeviceId) {
      const id = localStorage.getItem(LEGACY_MIC_ID_KEY);
      if (id) fallback.lastMicDeviceId = id;
    }
  } catch {}

  return fallback;
}

function savePersistedMediaPermissions(record: PersistedMediaPermissionsRecord, syncRemote = true): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    if (record.micGranted) {
      localStorage.setItem(LEGACY_MIC_KEY, '1');
    } else {
      localStorage.removeItem(LEGACY_MIC_KEY);
    }
    if (record.cameraGranted) {
      localStorage.setItem(LEGACY_CAM_KEY, '1');
    } else {
      localStorage.removeItem(LEGACY_CAM_KEY);
    }
    if (record.lastMicLabel) {
      localStorage.setItem(LEGACY_MIC_LABEL_KEY, record.lastMicLabel);
    }
    if (record.lastMicDeviceId) {
      localStorage.setItem(LEGACY_MIC_ID_KEY, record.lastMicDeviceId);
    }
    if (syncRemote) {
      localStorage.setItem(CONTINUITY_TS_KEY, new Date().toISOString());
    }
  } catch {}

  if (syncRemote) {
    pushContinuitySettingsPatch(
      {
        voiceDock: {
          micPermissionGranted: record.micGranted,
          micPermissionGrantedAt: record.micGrantedAt || undefined,
          cameraPermissionGranted: record.cameraGranted,
          cameraPermissionGrantedAt: record.cameraGrantedAt || undefined,
          ...(record.lastMicDeviceId ? { selectedMicId: record.lastMicDeviceId } : {}),
          ...(record.lastMicLabel ? { micLabel: record.lastMicLabel } : {})
        }
      },
      true
    );
  }
}

export function markMediaPermissionGranted(
  kind: MediaKind,
  meta?: { deviceId?: string; label?: string }
): PersistedMediaPermissionsRecord {
  const cur = loadPersistedMediaPermissions();
  const now = new Date().toISOString();
  let changed = false;

  if (kind === 'microphone') {
    if (!cur.micGranted) {
      cur.micGranted = true;
      cur.micGrantedAt = now;
      changed = true;
    }
    if (meta?.deviceId && meta.deviceId !== cur.lastMicDeviceId) {
      cur.lastMicDeviceId = meta.deviceId;
      changed = true;
    }
    if (meta?.label && meta.label !== cur.lastMicLabel) {
      cur.lastMicLabel = meta.label;
      changed = true;
    }
  } else {
    if (!cur.cameraGranted) {
      cur.cameraGranted = true;
      cur.cameraGrantedAt = now;
      changed = true;
    }
  }

  if (changed) {
    savePersistedMediaPermissions(cur, true);
  }
  return cur;
}

export function clearMediaPermissionGrant(kind: MediaKind): void {
  const cur = loadPersistedMediaPermissions();
  if (kind === 'microphone') {
    if (!cur.micGranted) return;
    cur.micGranted = false;
    cur.micGrantedAt = null;
  } else {
    if (!cur.cameraGranted) return;
    cur.cameraGranted = false;
    cur.cameraGrantedAt = null;
  }
  savePersistedMediaPermissions(cur, true);
}

/**
 * Safely checks whether the browser ALREADY grants microphone or camera permission
 * WITHOUT triggering any getUserMedia() prompt dialog.
 */
export async function probeMediaPermission(kind: MediaKind): Promise<MediaPermissionProbe> {
  const persisted = loadPersistedMediaPermissions();
  const rememberedGrant = kind === 'microphone' ? persisted.micGranted : persisted.cameraGranted;
  const targetDeviceKind = kind === 'microphone' ? 'audioinput' : 'videoinput';

  let browserState: ResolvedBrowserPermissionState = 'unknown';
  let hasLabeledHardwareDevice = false;

  if (typeof navigator === 'undefined') {
    return {
      kind,
      browserState: 'unknown',
      hasLabeledHardwareDevice: false,
      rememberedGrant,
      canAcquireSilently: false
    };
  }

  if (navigator.permissions?.query) {
    try {
      const status = await Promise.race([
        navigator.permissions.query({ name: kind as PermissionName }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 650))
      ]);
      if (status && (status.state === 'granted' || status.state === 'prompt' || status.state === 'denied')) {
        browserState = status.state;
      }
    } catch {}
  }

  if (navigator.mediaDevices?.enumerateDevices) {
    try {
      const devices = await Promise.race([
        navigator.mediaDevices.enumerateDevices(),
        new Promise<MediaDeviceInfo[]>((resolve) => setTimeout(() => resolve([]), 650))
      ]);
      hasLabeledHardwareDevice = devices.some(
        (d) => d.kind === targetDeviceKind && typeof d.label === 'string' && d.label.trim().length > 0
      );
      if (hasLabeledHardwareDevice && browserState === 'unknown') {
        browserState = 'granted';
      }
    } catch {}
  }

  if (browserState === 'granted' || hasLabeledHardwareDevice) {
    if (!rememberedGrant) {
      markMediaPermissionGranted(kind);
    }
  } else if (browserState === 'denied' && rememberedGrant) {
    clearMediaPermissionGrant(kind);
  }

  // Only acquire silently on boot when Chromium/browser actively confirms permission is granted
  // (never trigger an unprompted native Allow dialog if browserState is 'prompt' or 'unknown').
  const canAcquireSilently = browserState === 'granted' || hasLabeledHardwareDevice;

  return {
    kind,
    browserState,
    hasLabeledHardwareDevice,
    rememberedGrant: canAcquireSilently ? true : rememberedGrant,
    canAcquireSilently
  };
}

export function isMicrophoneBlockedByFramePolicy(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  try {
    const inIframe = window.self !== window.top;
    if (!inIframe) return false;
    const policy = (document as any).permissionsPolicy || (document as any).featurePolicy;
    if (policy && typeof policy.allowsFeature === 'function') {
      return policy.allowsFeature('microphone') === false;
    }
  } catch {
    // Cross-origin frame access check is expected; rely on permissionsPolicy if present
    try {
      const policy = (document as any).permissionsPolicy || (document as any).featurePolicy;
      if (policy && typeof policy.allowsFeature === 'function') {
        return policy.allowsFeature('microphone') === false;
      }
    } catch {}
  }
  return false;
}

/**
 * Synchronous-first getUserMedia call designed to run directly inside a user click handler
 * with ZERO prior awaits so transient user activation is never lost in Chrome/Safari/Firefox/Edge.
 */
export function requestMicrophoneStreamOnUserGesture(preferredDeviceId?: string): Promise<{
  stream: MediaStream | null;
  status: 'granted' | 'needs-gesture' | 'denied' | 'frame-policy-blocked' | 'unavailable';
  error?: any;
}> {
  markVoiceUserGesture();
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return Promise.resolve({ stream: null, status: 'unavailable' });
  }
  if (isMicrophoneBlockedByFramePolicy()) {
    return Promise.resolve({
      stream: null,
      status: 'frame-policy-blocked',
      error: new Error('Iframe Permissions-Policy blocks microphone in embedded preview frame.')
    });
  }

  const primaryConstraints: MediaStreamConstraints =
    preferredDeviceId && preferredDeviceId !== 'default'
      ? {
          audio: {
            deviceId: { ideal: preferredDeviceId },
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        }
      : {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        };

  // Call getUserMedia IMMEDIATELY (synchronously before any await!) to preserve browser user activation
  const firstAttemptPromise = navigator.mediaDevices.getUserMedia(primaryConstraints);

  return firstAttemptPromise
    .catch((firstErr: any) => {
      const errName = String(firstErr?.name || '');
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError' || errName === 'SecurityError') {
        throw firstErr;
      }
      // Hardware constraint mismatch fallback
      return navigator.mediaDevices.getUserMedia({ audio: true });
    })
    .then((stream) => {
      const track = stream.getAudioTracks()[0];
      if (track) {
        track.enabled = true;
        const resolvedId = track.getSettings?.().deviceId;
        markMediaPermissionGranted('microphone', {
          deviceId: resolvedId || undefined,
          label: track.label || undefined
        });
      } else {
        markMediaPermissionGranted('microphone');
      }
      setHardwareSwitchPreference('microphone', true);
      return { stream, status: 'granted' as const };
    })
    .catch(async (err: any) => {
      const name = String(err?.name || '');
      const msg = String(err?.message || '');
      if (/permissions?\s*policy|not allowed in this document/i.test(msg) || isMicrophoneBlockedByFramePolicy()) {
        return { stream: null, status: 'frame-policy-blocked' as const, error: err };
      }
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
        const postProbe = await probeMediaPermission('microphone').catch(() => null);
        if (postProbe?.browserState === 'denied') {
          clearMediaPermissionGrant('microphone');
          return { stream: null, status: 'denied' as const, error: err };
        }
        return { stream: null, status: 'needs-gesture' as const, error: err };
      }
      return { stream: null, status: 'unavailable' as const, error: err };
    });
}

export async function requestMicrophoneStream(options?: {
  allowPrompt?: boolean;
  constraintsList?: MediaStreamConstraints[];
}): Promise<{
  stream: MediaStream | null;
  status: 'granted' | 'needs-gesture' | 'denied' | 'unavailable';
  error?: any;
}> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return { stream: null, status: 'unavailable' };
  }

  if (micAcquireInFlight) {
    return micAcquireInFlight;
  }

  const run = (async () => {
    const allowPrompt = Boolean(options?.allowPrompt);

    // IMPORTANT: When allowPrompt is true (explicit user click on slider or Join Voice),
    // call getUserMedia IMMEDIATELY without awaiting probeMediaPermission first,
    // so Safari / Firefox / mobile browsers preserve the synchronous user gesture activation!
    if (!allowPrompt) {
      const probe = await probeMediaPermission('microphone');
      if (probe.browserState === 'denied') {
        return { stream: null, status: 'denied' as const };
      }
      if (!probe.canAcquireSilently) {
        return { stream: null, status: 'needs-gesture' as const };
      }
    }

    const attempts: MediaStreamConstraints[] =
      options?.constraintsList && options.constraintsList.length > 0
        ? options.constraintsList
        : [
            {
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
              }
            },
            { audio: true }
          ];

    let lastErr: any = null;
    for (const constraints of attempts) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        const track = stream.getAudioTracks()[0];
        if (track) {
          track.enabled = true;
          const resolvedId = track.getSettings?.().deviceId;
          markMediaPermissionGranted('microphone', {
            deviceId: resolvedId || undefined,
            label: track.label || undefined
          });
        } else {
          markMediaPermissionGranted('microphone');
        }
        setHardwareSwitchPreference('microphone', true);
        return { stream, status: 'granted' as const };
      } catch (err: any) {
        lastErr = err;
        const name = String(err?.name || '');
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
          const postProbe = await probeMediaPermission('microphone').catch(() => null);
          if (postProbe?.browserState === 'denied') {
            clearMediaPermissionGrant('microphone');
            return { stream: null, status: 'denied' as const, error: err };
          }
          return { stream: null, status: 'needs-gesture' as const, error: err };
        }
      }
    }

    const errName = String(lastErr?.name || '');
    if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError' || errName === 'SecurityError') {
      return { stream: null, status: 'denied' as const, error: lastErr };
    }
    return { stream: null, status: 'unavailable' as const, error: lastErr };
  })();

  micAcquireInFlight = run;
  try {
    return await run;
  } finally {
    if (micAcquireInFlight === run) {
      micAcquireInFlight = null;
    }
  }
}

export async function requestCameraStream(options?: {
  allowPrompt?: boolean;
  constraints?: MediaStreamConstraints;
}): Promise<{
  stream: MediaStream | null;
  status: 'granted' | 'needs-gesture' | 'denied' | 'unavailable';
  error?: any;
}> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return { stream: null, status: 'unavailable' };
  }

  if (cameraAcquireInFlight) {
    return cameraAcquireInFlight;
  }

  const run = (async () => {
    const allowPrompt = Boolean(options?.allowPrompt);

    // Preserve user gesture activation for Safari / Firefox / Edge / Chrome when allowPrompt is true
    if (!allowPrompt) {
      const probe = await probeMediaPermission('camera');
      const switchEnabled = isHardwareSwitchEnabled('camera');
      if (probe.browserState === 'denied') {
        return { stream: null, status: 'denied' as const };
      }
      if (!switchEnabled || !probe.canAcquireSilently) {
        return { stream: null, status: 'needs-gesture' as const };
      }
    }

    // Try standard cross-browser webcam constraints first (never fail desktop cameras with rear-only facingMode)
    const attempts: MediaStreamConstraints[] = options?.constraints
      ? [options.constraints, { video: true }]
      : [
          {
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user'
            }
          },
          { video: true }
        ];

    let lastErr: any = null;
    for (const constraints of attempts) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        markMediaPermissionGranted('camera');
        setHardwareSwitchPreference('camera', true);
        return { stream, status: 'granted' as const };
      } catch (err: any) {
        lastErr = err;
        const name = String(err?.name || '');
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
          const postProbe = await probeMediaPermission('camera').catch(() => null);
          if (postProbe?.browserState === 'denied') {
            clearMediaPermissionGrant('camera');
            return { stream: null, status: 'denied' as const, error: err };
          }
          return { stream: null, status: 'needs-gesture' as const, error: err };
        }
      }
    }

    const errName = String(lastErr?.name || '');
    if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError' || errName === 'SecurityError') {
      return { stream: null, status: 'denied' as const, error: lastErr };
    }
    return { stream: null, status: 'unavailable' as const, error: lastErr };
  })();

  cameraAcquireInFlight = run;
  try {
    return await run;
  } finally {
    if (cameraAcquireInFlight === run) {
      cameraAcquireInFlight = null;
    }
  }
}

// ============================================================================
// Unified Hardware & Device Privilege Sliders (Zero Intrusive Boot Popups,
// Full Cross-Browser Permission Binding: Chrome, Firefox, Safari, Edge, Brave)
// ============================================================================

export type HardwarePermissionKey = 'microphone' | 'camera' | 'geolocation' | 'notifications' | 'clipboard';

export interface HardwareSwitchesState {
  microphone: boolean;
  camera: boolean;
  geolocation: boolean;
  notifications: boolean;
  clipboard: boolean;
}

export interface HardwarePermissionStatusItem {
  key: HardwarePermissionKey;
  enabled: boolean;
  browserState: ResolvedBrowserPermissionState | 'unsupported';
}

const HARDWARE_SWITCHES_STORAGE_KEY = 'sovereign_hardware_switches_v2';

// All permissions stay permanently ON by default unless explicitly toggled OFF by the user
const DEFAULT_HARDWARE_SWITCHES: HardwareSwitchesState = {
  microphone: true,
  camera: true,
  geolocation: true,
  notifications: true,
  clipboard: true
};

export function loadHardwareSwitches(): HardwareSwitchesState {
  if (typeof window === 'undefined') return { ...DEFAULT_HARDWARE_SWITCHES };
  try {
    const raw = localStorage.getItem(HARDWARE_SWITCHES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          microphone: typeof parsed.microphone === 'boolean' ? parsed.microphone : true,
          camera: typeof parsed.camera === 'boolean' ? parsed.camera : true,
          geolocation: typeof parsed.geolocation === 'boolean' ? parsed.geolocation : true,
          notifications: typeof parsed.notifications === 'boolean' ? parsed.notifications : true,
          clipboard: typeof parsed.clipboard === 'boolean' ? parsed.clipboard : true
        };
      }
    }
  } catch {}
  return { ...DEFAULT_HARDWARE_SWITCHES };
}

export function isHardwareSwitchEnabled(key: HardwarePermissionKey): boolean {
  return Boolean(loadHardwareSwitches()[key]);
}

export function setHardwareSwitchPreference(key: HardwarePermissionKey, enabled: boolean): HardwareSwitchesState {
  const next = {
    ...loadHardwareSwitches(),
    [key]: enabled
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(HARDWARE_SWITCHES_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('sovereign_hardware_permissions_changed', { detail: next }));
      if (!enabled) {
        window.dispatchEvent(new CustomEvent('sovereign_hardware_permission_revoked', { detail: { key } }));
      }
    } catch {}
  }
  return next;
}

/**
 * Subscribe to live browser permission changes (e.g., when a user flips permissions
 * in Chrome/Edge/Firefox/Safari site settings). Safe across all browsers.
 */
export function subscribeBrowserPermissionChanges(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const cleanups: Array<() => void> = [];

  const handleFocus = () => onChange();
  const handleVis = () => {
    if (document.visibilityState === 'visible') onChange();
  };
  window.addEventListener('focus', handleFocus);
  document.addEventListener('visibilitychange', handleVis);
  cleanups.push(() => {
    window.removeEventListener('focus', handleFocus);
    document.removeEventListener('visibilitychange', handleVis);
  });

  if (typeof navigator !== 'undefined' && navigator.mediaDevices?.addEventListener) {
    const onDev = () => onChange();
    navigator.mediaDevices.addEventListener('devicechange', onDev);
    cleanups.push(() => navigator.mediaDevices.removeEventListener('devicechange', onDev));
  }

  if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
    const names = ['microphone', 'camera', 'geolocation', 'notifications', 'clipboard-read', 'clipboard-write'];
    for (const name of names) {
      navigator.permissions
        .query({ name: name as PermissionName })
        .then((status) => {
          const handler = () => onChange();
          status.addEventListener?.('change', handler);
          cleanups.push(() => status.removeEventListener?.('change', handler));
        })
        .catch(() => {
          // Expected in Firefox/Safari for unsupported descriptor names
        });
    }
  }

  return () => {
    cleanups.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
  };
}

/**
 * 100% Silent, read-only status probe across all device capabilities for all browsers.
 * NEVER triggers any native browser permission dialog.
 */
export async function probeAllHardwarePermissionsSilent(): Promise<Record<HardwarePermissionKey, HardwarePermissionStatusItem>> {
  const switches = loadHardwareSwitches();

  const queryPerm = async (name: string): Promise<ResolvedBrowserPermissionState> => {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return 'unknown';
    try {
      const status = await Promise.race([
        navigator.permissions.query({ name: name as PermissionName }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 500))
      ]);
      if (status && (status.state === 'granted' || status.state === 'prompt' || status.state === 'denied')) {
        return status.state;
      }
    } catch {}
    return 'unknown';
  };

  const [micProbe, camProbe, geoState, clipReadState, clipWriteState] = await Promise.all([
    probeMediaPermission('microphone').catch(() => ({
      browserState: 'unknown' as ResolvedBrowserPermissionState,
      canAcquireSilently: false
    })),
    probeMediaPermission('camera').catch(() => ({
      browserState: 'unknown' as ResolvedBrowserPermissionState,
      canAcquireSilently: false
    })),
    queryPerm('geolocation'),
    queryPerm('clipboard-read'),
    queryPerm('clipboard-write')
  ]);

  let notifState: ResolvedBrowserPermissionState | 'unsupported' = 'unsupported';
  if (typeof window !== 'undefined' && 'Notification' in window) {
    const p = Notification.permission;
    notifState = p === 'granted' ? 'granted' : p === 'denied' ? 'denied' : 'prompt';
  }

  const hasGeo = typeof navigator !== 'undefined' && 'geolocation' in navigator;
  const hasMedia = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
  const hasClip = typeof navigator !== 'undefined' && (Boolean(navigator.clipboard) || typeof document?.execCommand === 'function');

  // Resolve combined clipboard browser state (Firefox & Safari throw on clipboard-write query -> 'unknown', which is allowed on gesture)
  let resolvedClipState: ResolvedBrowserPermissionState | 'unsupported' = 'unsupported';
  if (hasClip) {
    if (clipReadState === 'denied' && clipWriteState === 'denied') {
      resolvedClipState = 'denied';
    } else if (clipReadState === 'granted' || clipWriteState === 'granted') {
      resolvedClipState = 'granted';
    } else if (clipReadState === 'prompt' || clipWriteState === 'prompt') {
      resolvedClipState = 'prompt';
    } else {
      resolvedClipState = 'prompt';
    }
  }

  return {
    microphone: {
      key: 'microphone',
      enabled: switches.microphone,
      browserState: hasMedia ? micProbe.browserState : 'unsupported'
    },
    camera: {
      key: 'camera',
      enabled: switches.camera,
      browserState: hasMedia ? camProbe.browserState : 'unsupported'
    },
    geolocation: {
      key: 'geolocation',
      enabled: switches.geolocation,
      browserState: hasGeo ? geoState : 'unsupported'
    },
    notifications: {
      key: 'notifications',
      enabled: switches.notifications,
      browserState: notifState
    },
    clipboard: {
      key: 'clipboard',
      enabled: switches.clipboard,
      browserState: resolvedClipState
    }
  };
}

/**
 * Request browser Notification permission safely across Chrome, Edge, Firefox, and legacy Safari.
 */
function requestNotificationPermissionCrossBrowser(): Promise<NotificationPermission> {
  return new Promise((resolve) => {
    try {
      const maybePromise = Notification.requestPermission((legacyResult) => {
        resolve(legacyResult);
      });
      if (maybePromise && typeof (maybePromise as Promise<NotificationPermission>).then === 'function') {
        (maybePromise as Promise<NotificationPermission>).then(resolve).catch(() => resolve(Notification.permission));
      }
    } catch {
      resolve(Notification.permission);
    }
  });
}

/**
 * Explicit user slider toggle handler.
 * Turning ON immediately calls the native browser permission API inside the click gesture
 * (so Chrome, Firefox, Safari, Edge, and Brave all present their real browser permission prompt);
 * Turning OFF immediately revokes/disables usage inside the OS without prompting.
 */
export async function toggleHardwarePermissionSlider(
  key: HardwarePermissionKey,
  targetEnabled: boolean
): Promise<{ ok: boolean; browserState: ResolvedBrowserPermissionState | 'unsupported'; message: string }> {
  if (!targetEnabled) {
    setHardwareSwitchPreference(key, false);
    if (key === 'microphone') clearMediaPermissionGrant('microphone');
    if (key === 'camera') clearMediaPermissionGrant('camera');
    return {
      ok: true,
      browserState: 'prompt',
      message: `${key.charAt(0).toUpperCase() + key.slice(1)} turned off in Sovereign OS.`
    };
  }

  markVoiceUserGesture();

  if (key === 'microphone') {
    const res = await requestMicrophoneStream({ allowPrompt: true });
    if (res.stream) {
      // Immediately release test probe tracks so mic hardware indicator stays off until actually used
      res.stream.getTracks().forEach((t) => t.stop());
      setHardwareSwitchPreference('microphone', true);
      return { ok: true, browserState: 'granted', message: 'Browser Microphone permission granted & linked.' };
    }
    setHardwareSwitchPreference('microphone', false);
    return {
      ok: false,
      browserState: res.status === 'denied' ? 'denied' : 'prompt',
      message:
        res.status === 'denied'
          ? 'Microphone is blocked in your browser. Click the site lock/settings icon in the address bar → Allow Microphone, then slide ON.'
          : res.status === 'unavailable'
          ? 'No microphone hardware was detected by this browser.'
          : 'Microphone prompt was dismissed. Click the slider again and choose Allow.'
    };
  }

  if (key === 'camera') {
    const res = await requestCameraStream({ allowPrompt: true });
    if (res.stream) {
      res.stream.getTracks().forEach((t) => t.stop());
      setHardwareSwitchPreference('camera', true);
      return { ok: true, browserState: 'granted', message: 'Browser Camera permission granted & linked.' };
    }
    setHardwareSwitchPreference('camera', false);
    return {
      ok: false,
      browserState: res.status === 'denied' ? 'denied' : 'prompt',
      message:
        res.status === 'denied'
          ? 'Camera is blocked in your browser. Click the site lock/settings icon in the address bar → Allow Camera, then slide ON.'
          : res.status === 'unavailable'
          ? 'No camera device was detected by this browser.'
          : 'Camera prompt was dismissed. Click the slider again and choose Allow.'
    };
  }

  if (key === 'geolocation') {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return { ok: false, browserState: 'unsupported', message: 'Geolocation API is not supported in this browser.' };
    }
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => {
          setHardwareSwitchPreference('geolocation', true);
          resolve({ ok: true, browserState: 'granted', message: 'Browser Location permission granted & linked.' });
        },
        (err) => {
          // Only err.code === 1 (PERMISSION_DENIED) is an actual browser permission block.
          // Codes 2 (POSITION_UNAVAILABLE) & 3 (TIMEOUT) mean browser permission succeeded, just no GPS fix yet!
          if (err?.code === 2 || err?.code === 3) {
            setHardwareSwitchPreference('geolocation', true);
            resolve({
              ok: true,
              browserState: 'granted',
              message: 'Browser Location access enabled (waiting on device GPS/network fix).'
            });
            return;
          }
          setHardwareSwitchPreference('geolocation', false);
          resolve({
            ok: false,
            browserState: 'denied',
            message:
              'Location is blocked in your browser. Click the site lock/settings icon in the address bar → Allow Location, then slide ON.'
          });
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
      );
    });
  }

  if (key === 'notifications') {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return { ok: false, browserState: 'unsupported', message: 'Browser Notifications are not supported here.' };
    }
    if (Notification.permission === 'granted') {
      setHardwareSwitchPreference('notifications', true);
      return { ok: true, browserState: 'granted', message: 'Browser Notifications enabled.' };
    }
    try {
      const perm = await requestNotificationPermissionCrossBrowser();
      if (perm === 'granted') {
        setHardwareSwitchPreference('notifications', true);
        return { ok: true, browserState: 'granted', message: 'Browser Notifications permission granted & linked.' };
      }
      if (perm === 'denied') {
        setHardwareSwitchPreference('notifications', false);
        return {
          ok: false,
          browserState: 'denied',
          message:
            'Notifications are blocked in your browser. Open the address-bar Site Settings → Allow Notifications, then slide ON.'
        };
      }
      // Some cross-origin iframes suppress the native Notification prompt and return 'default'
      setHardwareSwitchPreference('notifications', true);
      return {
        ok: true,
        browserState: 'prompt',
        message: 'In-OS notifications enabled (open in top-level browser tab for native OS push popups).'
      };
    } catch {
      setHardwareSwitchPreference('notifications', false);
      return { ok: false, browserState: 'prompt', message: 'Browser notification request was dismissed.' };
    }
  }

  // Clipboard: actively trigger/verify browser clipboard capability on user gesture across Chrome/Edge/Firefox/Safari
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      if (typeof navigator.clipboard.readText === 'function') {
        // In Chromium browsers, readText() triggers the native "See text and images copied to the clipboard" prompt
        await navigator.clipboard.readText().catch((err: any) => {
          const name = String(err?.name || '');
          // Firefox & Safari restrict readText() to paste events or throw NotAllowedError only when explicitly denied
          if (name === 'NotAllowedError' && /denied/i.test(String(err?.message || ''))) {
            throw err;
          }
        });
      }
      setHardwareSwitchPreference('clipboard', true);
      return { ok: true, browserState: 'granted', message: 'Browser Clipboard access enabled & linked.' };
    } catch {
      // Even if read-clipboard is restricted in Firefox/Safari/iframe, write-clipboard still works on user gesture
      setHardwareSwitchPreference('clipboard', true);
      return {
        ok: true,
        browserState: 'granted',
        message: 'Clipboard copy enabled (browser manages paste prompts automatically).'
      };
    }
  }

  setHardwareSwitchPreference('clipboard', true);
  return { ok: true, browserState: 'granted', message: 'Clipboard access enabled.' };
}


