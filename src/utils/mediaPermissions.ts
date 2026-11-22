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
  geoGranted: boolean;
  geoGrantedAt: string | null;
  notifGranted: boolean;
  notifGrantedAt: string | null;
  clipboardGranted: boolean;
  clipboardGrantedAt: string | null;
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
      if (vd.geoPermissionGranted === true && !cur.geoGranted) {
        cur.geoGranted = true;
        cur.geoGrantedAt = vd.geoPermissionGrantedAt || new Date().toISOString();
        changed = true;
      }
      if (vd.notifPermissionGranted === true && !cur.notifGranted) {
        cur.notifGranted = true;
        cur.notifGrantedAt = vd.notifPermissionGrantedAt || new Date().toISOString();
        changed = true;
      }
      if (vd.clipboardPermissionGranted === true && !cur.clipboardGranted) {
        cur.clipboardGranted = true;
        cur.clipboardGrantedAt = vd.clipboardPermissionGrantedAt || new Date().toISOString();
        changed = true;
      }
      if (vd.hardwareSwitches && typeof vd.hardwareSwitches === 'object') {
        try {
          const curSw = loadHardwareSwitches();
          const mergedSw: HardwareSwitchesState = {
            microphone:
              typeof vd.hardwareSwitches.microphone === 'boolean'
                ? vd.hardwareSwitches.microphone
                : curSw.microphone,
            camera:
              typeof vd.hardwareSwitches.camera === 'boolean'
                ? vd.hardwareSwitches.camera
                : curSw.camera,
            geolocation:
              typeof vd.hardwareSwitches.geolocation === 'boolean'
                ? vd.hardwareSwitches.geolocation
                : curSw.geolocation,
            notifications:
              typeof vd.hardwareSwitches.notifications === 'boolean'
                ? vd.hardwareSwitches.notifications
                : curSw.notifications,
            clipboard:
              typeof vd.hardwareSwitches.clipboard === 'boolean'
                ? vd.hardwareSwitches.clipboard
                : curSw.clipboard
          };
          localStorage.setItem(HARDWARE_SWITCHES_STORAGE_KEY, JSON.stringify(mergedSw));
        } catch {}
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
      window.dispatchEvent(new CustomEvent('sovereign_hardware_permissions_changed', { detail: loadHardwareSwitches() }));
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

let activeSharedMicStream: MediaStream | null = null;

export function setSharedMicrophoneStream(stream: MediaStream | null): void {
  if (activeSharedMicStream && activeSharedMicStream !== stream) {
    try {
      activeSharedMicStream.getTracks().forEach((t) => t.stop());
    } catch {}
  }
  activeSharedMicStream = stream;
}

export function peekSharedMicrophoneStream(): MediaStream | null {
  if (
    activeSharedMicStream &&
    activeSharedMicStream.getAudioTracks().some((t) => t.readyState === 'live')
  ) {
    return activeSharedMicStream;
  }
  activeSharedMicStream = null;
  return null;
}

export function claimSharedMicrophoneStream(): MediaStream | null {
  const stream = peekSharedMicrophoneStream();
  activeSharedMicStream = null;
  return stream;
}

export function loadPersistedMediaPermissions(): PersistedMediaPermissionsRecord {
  const fallback: PersistedMediaPermissionsRecord = {
    micGranted: false,
    micGrantedAt: null,
    cameraGranted: false,
    cameraGrantedAt: null,
    geoGranted: false,
    geoGrantedAt: null,
    notifGranted: false,
    notifGrantedAt: null,
    clipboardGranted: false,
    clipboardGrantedAt: null
  };
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        // Only treat a permission as remembered-granted if it was actually granted with a timestamp
        fallback.micGrantedAt = typeof parsed.micGrantedAt === 'string' ? parsed.micGrantedAt : null;
        fallback.micGranted = Boolean(parsed.micGranted === true && fallback.micGrantedAt);
        fallback.cameraGrantedAt = typeof parsed.cameraGrantedAt === 'string' ? parsed.cameraGrantedAt : null;
        fallback.cameraGranted = Boolean(parsed.cameraGranted === true && fallback.cameraGrantedAt);
        fallback.geoGrantedAt = typeof parsed.geoGrantedAt === 'string' ? parsed.geoGrantedAt : null;
        fallback.geoGranted = Boolean(parsed.geoGranted === true && fallback.geoGrantedAt);
        fallback.notifGrantedAt = typeof parsed.notifGrantedAt === 'string' ? parsed.notifGrantedAt : null;
        fallback.notifGranted = Boolean(parsed.notifGranted === true && fallback.notifGrantedAt);
        fallback.clipboardGrantedAt = typeof parsed.clipboardGrantedAt === 'string' ? parsed.clipboardGrantedAt : null;
        fallback.clipboardGranted = Boolean(parsed.clipboardGranted === true && fallback.clipboardGrantedAt);
        if (typeof parsed.lastMicDeviceId === 'string') fallback.lastMicDeviceId = parsed.lastMicDeviceId;
        if (typeof parsed.lastMicLabel === 'string') fallback.lastMicLabel = parsed.lastMicLabel;
      }
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
    if (record.micGranted && record.micGrantedAt) {
      localStorage.setItem(LEGACY_MIC_KEY, '1');
    } else {
      localStorage.removeItem(LEGACY_MIC_KEY);
    }
    if (record.cameraGranted && record.cameraGrantedAt) {
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
          geoPermissionGranted: record.geoGranted,
          geoPermissionGrantedAt: record.geoGrantedAt || undefined,
          notifPermissionGranted: record.notifGranted,
          notifPermissionGrantedAt: record.notifGrantedAt || undefined,
          clipboardPermissionGranted: record.clipboardGranted,
          clipboardPermissionGrantedAt: record.clipboardGrantedAt || undefined,
          hardwareSwitches: loadHardwareSwitches(),
          ...(record.lastMicDeviceId ? { selectedMicId: record.lastMicDeviceId } : {}),
          ...(record.lastMicLabel ? { micLabel: record.lastMicLabel } : {})
        }
      },
      true
    );
  }
}

export function markMediaPermissionGranted(
  kind: MediaKind | HardwarePermissionKey,
  meta?: { deviceId?: string; label?: string }
): PersistedMediaPermissionsRecord {
  const cur = loadPersistedMediaPermissions();
  const now = new Date().toISOString();
  let changed = false;

  if (kind === 'microphone') {
    if (!cur.micGranted || !cur.micGrantedAt) {
      cur.micGranted = true;
      cur.micGrantedAt = cur.micGrantedAt || now;
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
  } else if (kind === 'camera') {
    if (!cur.cameraGranted || !cur.cameraGrantedAt) {
      cur.cameraGranted = true;
      cur.cameraGrantedAt = cur.cameraGrantedAt || now;
      changed = true;
    }
  } else if (kind === 'geolocation') {
    if (!cur.geoGranted || !cur.geoGrantedAt) {
      cur.geoGranted = true;
      cur.geoGrantedAt = cur.geoGrantedAt || now;
      changed = true;
    }
  } else if (kind === 'notifications') {
    if (!cur.notifGranted || !cur.notifGrantedAt) {
      cur.notifGranted = true;
      cur.notifGrantedAt = cur.notifGrantedAt || now;
      changed = true;
    }
  } else if (kind === 'clipboard') {
    if (!cur.clipboardGranted || !cur.clipboardGrantedAt) {
      cur.clipboardGranted = true;
      cur.clipboardGrantedAt = cur.clipboardGrantedAt || now;
      changed = true;
    }
  }

  if (changed) {
    savePersistedMediaPermissions(cur, true);
  }
  return cur;
}

export function clearMediaPermissionGrant(kind: MediaKind | HardwarePermissionKey): void {
  const cur = loadPersistedMediaPermissions();
  if (kind === 'microphone') {
    cur.micGranted = false;
    cur.micGrantedAt = null;
  } else if (kind === 'camera') {
    cur.cameraGranted = false;
    cur.cameraGrantedAt = null;
  } else if (kind === 'geolocation') {
    cur.geoGranted = false;
    cur.geoGrantedAt = null;
  } else if (kind === 'notifications') {
    cur.notifGranted = false;
    cur.notifGrantedAt = null;
  } else if (kind === 'clipboard') {
    cur.clipboardGranted = false;
    cur.clipboardGrantedAt = null;
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

  if (kind === 'microphone' && peekSharedMicrophoneStream()) {
    return {
      kind,
      browserState: 'granted',
      hasLabeledHardwareDevice: true,
      rememberedGrant: true,
      canAcquireSilently: true
    };
  }

  if (navigator.permissions?.query) {
    try {
      const status = await Promise.race([
        navigator.permissions.query({ name: kind as PermissionName }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 120))
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
        new Promise<MediaDeviceInfo[]>((resolve) => setTimeout(() => resolve([]), 120))
      ]);
      hasLabeledHardwareDevice = devices.some(
        (d) => d.kind === targetDeviceKind && typeof d.label === 'string' && d.label.trim().length > 0
      );
      if (hasLabeledHardwareDevice && browserState !== 'denied') {
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
 * with ZERO prior awaits or network calls so the browser popup appears in <5ms.
 */
export function requestMicrophoneStreamOnUserGesture(preferredDeviceId?: string): Promise<{
  stream: MediaStream | null;
  status: 'granted' | 'needs-gesture' | 'denied' | 'frame-policy-blocked' | 'unavailable';
  error?: any;
}> {
  markVoiceUserGesture();
  const existingShared = claimSharedMicrophoneStream();
  if (existingShared) {
    const track = existingShared.getAudioTracks()[0];
    if (track) {
      track.enabled = true;
      markMediaPermissionGranted('microphone', {
        deviceId: track.getSettings?.().deviceId || undefined,
        label: track.label || undefined
      });
    } else {
      markMediaPermissionGranted('microphone');
    }
    setHardwareSwitchPreference('microphone', true);
    return Promise.resolve({ stream: existingShared, status: 'granted' as const });
  }

  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return Promise.resolve({ stream: null, status: 'unavailable' });
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
      : { audio: true };

  // Call getUserMedia IMMEDIATELY on line 1 (zero awaits, zero storage/network I/O first!)
  const firstAttemptPromise = navigator.mediaDevices.getUserMedia(primaryConstraints);

  return firstAttemptPromise
    .catch((firstErr: any) => {
      const errName = String(firstErr?.name || '');
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError' || errName === 'SecurityError') {
        throw firstErr;
      }
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
    .catch((err: any) => {
      const name = String(err?.name || '');
      const msg = String(err?.message || '');
      if (/permissions?\s*policy|not allowed in this document/i.test(msg)) {
        return { stream: null, status: 'frame-policy-blocked' as const, error: err };
      }
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
        return { stream: null, status: 'denied' as const, error: err };
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
  const existingShared = claimSharedMicrophoneStream();
  if (existingShared) {
    const track = existingShared.getAudioTracks()[0];
    if (track) {
      track.enabled = true;
      markMediaPermissionGranted('microphone', {
        deviceId: track.getSettings?.().deviceId || undefined,
        label: track.label || undefined
      });
    } else {
      markMediaPermissionGranted('microphone');
    }
    setHardwareSwitchPreference('microphone', true);
    return { stream: existingShared, status: 'granted' };
  }

  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return { stream: null, status: 'unavailable' };
  }

  if (micAcquireInFlight) {
    return micAcquireInFlight;
  }

  const run = (async () => {
    const allowPrompt = Boolean(options?.allowPrompt);

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
            { audio: true },
            {
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
              }
            }
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
          return { stream: null, status: 'denied' as const, error: err };
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

    const attempts: MediaStreamConstraints[] = options?.constraints
      ? [options.constraints, { video: true }]
      : [
          { video: true },
          {
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user'
            }
          }
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
          return { stream: null, status: 'denied' as const, error: err };
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
// Instant <5ms Synchronous Browser Prompts, Permanent User Memory)
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
      localStorage.setItem(CONTINUITY_TS_KEY, new Date().toISOString());
      window.dispatchEvent(new CustomEvent('sovereign_hardware_permissions_changed', { detail: next }));
      if (!enabled) {
        if (key === 'microphone') {
          setSharedMicrophoneStream(null);
        }
        window.dispatchEvent(new CustomEvent('sovereign_hardware_permission_revoked', { detail: { key } }));
      }
      // Defer server continuity sync by 50ms so UI & native browser permission prompts never wait on network I/O
      pushContinuitySettingsPatch(
        {
          voiceDock: {
            hardwareSwitches: next
          }
        },
        false
      );
    } catch {}
  }
  return next;
}

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
        .catch(() => {});
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

async function querySinglePermissionFast(name: string): Promise<ResolvedBrowserPermissionState> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) return 'unknown';
  try {
    const status = await Promise.race([
      navigator.permissions.query({ name: name as PermissionName }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 90))
    ]);
    if (status && (status.state === 'granted' || status.state === 'prompt' || status.state === 'denied')) {
      return status.state;
    }
  } catch {}
  return 'unknown';
}

/**
 * Fast (<100ms) silent read-only status probe across all device capabilities.
 * Reflects actual browser permission state so ungranted permissions show "Turn On / Allow"
 * and granted permissions stay permanently ON for the user.
 */
export async function probeAllHardwarePermissionsSilent(): Promise<Record<HardwarePermissionKey, HardwarePermissionStatusItem>> {
  const switches = loadHardwareSwitches();
  const persistedMedia = loadPersistedMediaPermissions();

  const hasGeo = typeof navigator !== 'undefined' && 'geolocation' in navigator;
  const hasMedia = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
  const hasClip = typeof navigator !== 'undefined' && (Boolean(navigator.clipboard) || typeof document?.execCommand === 'function');
  const hasNotif = typeof window !== 'undefined' && 'Notification' in window;

  const [micPerm, camPerm, geoPerm, clipPerm, devices] = await Promise.all([
    hasMedia ? querySinglePermissionFast('microphone') : Promise.resolve('unknown' as const),
    hasMedia ? querySinglePermissionFast('camera') : Promise.resolve('unknown' as const),
    hasGeo ? querySinglePermissionFast('geolocation') : Promise.resolve('unknown' as const),
    hasClip ? querySinglePermissionFast('clipboard-read') : Promise.resolve('unknown' as const),
    typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices
      ? Promise.race([
          navigator.mediaDevices.enumerateDevices().catch(() => [] as MediaDeviceInfo[]),
          new Promise<MediaDeviceInfo[]>((resolve) => setTimeout(() => resolve([]), 90))
        ])
      : Promise.resolve([] as MediaDeviceInfo[])
  ]);

  const hasLabeledMic =
    Boolean(peekSharedMicrophoneStream()) ||
    devices.some((d) => d.kind === 'audioinput' && typeof d.label === 'string' && d.label.trim().length > 0);
  const hasLabeledCam = devices.some(
    (d) => d.kind === 'videoinput' && typeof d.label === 'string' && d.label.trim().length > 0
  );

  const resolvedMicState: ResolvedBrowserPermissionState | 'unsupported' = !hasMedia
    ? 'unsupported'
    : micPerm === 'granted' || hasLabeledMic
    ? 'granted'
    : micPerm === 'denied'
    ? 'denied'
    : persistedMedia.micGranted
    ? 'granted'
    : 'prompt';

  const resolvedCamState: ResolvedBrowserPermissionState | 'unsupported' = !hasMedia
    ? 'unsupported'
    : camPerm === 'granted' || hasLabeledCam
    ? 'granted'
    : camPerm === 'denied'
    ? 'denied'
    : persistedMedia.cameraGranted
    ? 'granted'
    : 'prompt';

  const resolvedGeoState: ResolvedBrowserPermissionState | 'unsupported' = !hasGeo
    ? 'unsupported'
    : geoPerm === 'granted'
    ? 'granted'
    : geoPerm === 'denied'
    ? 'denied'
    : persistedMedia.geoGranted
    ? 'granted'
    : 'prompt';

  const notifRaw = hasNotif ? Notification.permission : 'default';
  const resolvedNotifState: ResolvedBrowserPermissionState | 'unsupported' = !hasNotif
    ? 'unsupported'
    : notifRaw === 'granted'
    ? 'granted'
    : notifRaw === 'denied'
    ? 'denied'
    : persistedMedia.notifGranted
    ? 'granted'
    : 'prompt';

  const resolvedClipState: ResolvedBrowserPermissionState | 'unsupported' = !hasClip
    ? 'unsupported'
    : clipPerm === 'granted' || persistedMedia.clipboardGranted
    ? 'granted'
    : clipPerm === 'denied'
    ? 'denied'
    : 'prompt';

  if (resolvedMicState === 'granted' && !persistedMedia.micGranted) {
    markMediaPermissionGranted('microphone');
  }
  if (resolvedCamState === 'granted' && !persistedMedia.cameraGranted) {
    markMediaPermissionGranted('camera');
  }
  if (resolvedGeoState === 'granted' && !persistedMedia.geoGranted) {
    markMediaPermissionGranted('geolocation');
  }
  if (resolvedNotifState === 'granted' && !persistedMedia.notifGranted) {
    markMediaPermissionGranted('notifications');
  }

  return {
    microphone: {
      key: 'microphone',
      enabled: Boolean(switches.microphone && resolvedMicState === 'granted'),
      browserState: resolvedMicState
    },
    camera: {
      key: 'camera',
      enabled: Boolean(switches.camera && resolvedCamState === 'granted'),
      browserState: resolvedCamState
    },
    geolocation: {
      key: 'geolocation',
      enabled: Boolean(switches.geolocation && resolvedGeoState === 'granted'),
      browserState: resolvedGeoState
    },
    notifications: {
      key: 'notifications',
      enabled: Boolean(switches.notifications && resolvedNotifState === 'granted'),
      browserState: resolvedNotifState
    },
    clipboard: {
      key: 'clipboard',
      enabled: Boolean(switches.clipboard && resolvedClipState === 'granted'),
      browserState: resolvedClipState
    }
  };
}

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

function bindGrantedMicStreamAndBroadcast(stream: MediaStream): void {
  const audioTrack = stream.getAudioTracks()[0];
  let resolvedId: string | undefined;
  let resolvedLabel: string | undefined;
  if (audioTrack) {
    audioTrack.enabled = true;
    resolvedId = audioTrack.getSettings?.().deviceId || undefined;
    resolvedLabel = audioTrack.label || 'Device Microphone';
  }
  setHardwareSwitchPreference('microphone', true);
  markMediaPermissionGranted('microphone', {
    deviceId: resolvedId,
    label: resolvedLabel
  });
  setSharedMicrophoneStream(stream);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('sovereign_microphone_stream_granted', {
        detail: {
          stream,
          deviceId: resolvedId,
          label: resolvedLabel
        }
      })
    );
  }
}

/**
 * Zero-Latency (<5ms) User Permission Request & Toggle Handler.
 * Invokes the native browser permission API on the VERY FIRST LINE inside the user click gesture
 * before any storage writes or network continuity sync, so the browser prompt pops up instantaneously!
 */
export async function toggleHardwarePermissionSlider(
  key: HardwarePermissionKey,
  targetEnabled: boolean
): Promise<{ ok: boolean; browserState: ResolvedBrowserPermissionState | 'unsupported'; message: string }> {
  if (!targetEnabled) {
    setHardwareSwitchPreference(key, false);
    clearMediaPermissionGrant(key);
    return {
      ok: true,
      browserState: 'prompt',
      message: `${key.charAt(0).toUpperCase() + key.slice(1)} turned OFF and remembered.`
    };
  }

  markVoiceUserGesture();

  if (key === 'microphone') {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return {
        ok: false,
        browserState: 'unsupported',
        message: 'Browser microphone API is unavailable in this context.'
      };
    }

    // 1. Fire getUserMedia({ audio: true }) IMMEDIATELY on line 1 so the native browser popup appears in <5ms
    const micPromise = navigator.mediaDevices.getUserMedia({ audio: true });

    try {
      const stream = await micPromise;
      bindGrantedMicStreamAndBroadcast(stream);
      return {
        ok: true,
        browserState: 'granted',
        message: 'Microphone allowed, live, and permanently remembered for your account.'
      };
    } catch (err: any) {
      const errName = String(err?.name || '');
      const errMsg = String(err?.message || '');
      if (/permissions?\s*policy|not allowed in this document/i.test(errMsg)) {
        return {
          ok: false,
          browserState: 'denied',
          message:
            'Preview frame blocked the microphone popup. Refresh the outer preview once or open in a standalone tab to allow microphone.'
        };
      }
      if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        return {
          ok: false,
          browserState: 'prompt',
          message: 'No physical microphone input device was detected by your OS/browser.'
        };
      }
      return {
        ok: false,
        browserState: 'denied',
        message:
          'Browser blocked microphone access. Click the site settings icon next to the address bar, set Microphone to Allow, then click Allow Mic.'
      };
    }
  }

  if (key === 'camera') {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return {
        ok: false,
        browserState: 'unsupported',
        message: 'Browser camera API is unavailable in this context.'
      };
    }
    // 1. Fire getUserMedia({ video: true }) IMMEDIATELY on line 1 so camera popup appears in <5ms
    const camPromise = navigator.mediaDevices.getUserMedia({ video: true });
    try {
      const stream = await camPromise;
      stream.getTracks().forEach((t) => t.stop());
      setHardwareSwitchPreference('camera', true);
      markMediaPermissionGranted('camera');
      return {
        ok: true,
        browserState: 'granted',
        message: 'Camera allowed and permanently remembered for your account.'
      };
    } catch (err: any) {
      const errName = String(err?.name || '');
      if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setHardwareSwitchPreference('camera', true);
        markMediaPermissionGranted('camera');
        return {
          ok: true,
          browserState: 'granted',
          message: 'Camera preference turned ON & remembered (no physical camera connected right now).'
        };
      }
      return {
        ok: false,
        browserState: 'denied',
        message:
          'Browser blocked camera access. Allow Camera in your browser site settings icon, then click Allow Camera.'
      };
    }
  }

  if (key === 'geolocation') {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return {
        ok: false,
        browserState: 'unsupported',
        message: 'Browser geolocation API is unavailable in this context.'
      };
    }
    // 1. Fire navigator.geolocation.getCurrentPosition IMMEDIATELY on line 1
    const geoResult = await new Promise<{ ok: boolean; denied: boolean }>((resolve) => {
      const timer = setTimeout(() => resolve({ ok: true, denied: false }), 3500);
      navigator.geolocation.getCurrentPosition(
        () => {
          clearTimeout(timer);
          resolve({ ok: true, denied: false });
        },
        (err) => {
          clearTimeout(timer);
          // Code 1 = PERMISSION_DENIED; codes 2/3 = POSITION_UNAVAILABLE/TIMEOUT (permission itself was granted!)
          resolve({ ok: err.code !== 1, denied: err.code === 1 });
        },
        { enableHighAccuracy: false, timeout: 3000, maximumAge: Infinity }
      );
    });
    if (geoResult.ok) {
      setHardwareSwitchPreference('geolocation', true);
      markMediaPermissionGranted('geolocation');
      return {
        ok: true,
        browserState: 'granted',
        message: 'Location allowed and permanently remembered for your account.'
      };
    }
    return {
      ok: false,
      browserState: 'denied',
      message: 'Location was blocked in browser site settings. Set Location to Allow in the address bar, then retry.'
    };
  }

  if (key === 'notifications') {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setHardwareSwitchPreference('notifications', true);
      markMediaPermissionGranted('notifications');
      return {
        ok: true,
        browserState: 'granted',
        message: 'In-app notifications turned ON permanently & remembered.'
      };
    }
    // 1. Fire Notification.requestPermission IMMEDIATELY on line 1
    const notifPerm =
      Notification.permission === 'granted'
        ? 'granted'
        : await Promise.race([
            requestNotificationPermissionCrossBrowser(),
            new Promise<NotificationPermission>((resolve) => setTimeout(() => resolve(Notification.permission), 4000))
          ]);
    setHardwareSwitchPreference('notifications', true);
    markMediaPermissionGranted('notifications');
    return {
      ok: true,
      browserState: notifPerm === 'denied' ? 'denied' : 'granted',
      message:
        notifPerm === 'granted'
          ? 'Notifications allowed and permanently remembered.'
          : 'In-app notifications turned ON permanently & remembered.'
    };
  }

  // Clipboard: fire readText() IMMEDIATELY on line 1
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
    await Promise.race([
      navigator.clipboard.readText().catch(() => ''),
      new Promise<string>((resolve) => setTimeout(() => resolve(''), 1500))
    ]);
  }
  setHardwareSwitchPreference('clipboard', true);
  markMediaPermissionGranted('clipboard');

  return {
    ok: true,
    browserState: 'granted',
    message: 'Clipboard access turned ON permanently & remembered.'
  };
}

/**
 * Unified "Turn All On" handler that requests combined Audio+Video in a SINGLE getUserMedia call on line 1
 * so Chrome never drops overlapping permission popups, and keeps the live Microphone stream open for Voice Chat!
 */
export async function enableAllHardwarePermissionsOnGesture(): Promise<{
  ok: boolean;
  micGranted: boolean;
  message: string;
}> {
  markVoiceUserGesture();
  let micGranted = false;

  if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
    // 1. Request combined audio+video on line 1 (single unified browser popup!)
    const combinedPromise = navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    try {
      const combinedStream = await combinedPromise;
      // Stop video tracks immediately so camera light doesn't stay on when idle, but KEEP audio track alive for Voice Chat!
      combinedStream.getVideoTracks().forEach((vt) => vt.stop());
      const audioOnlyStream = new MediaStream(combinedStream.getAudioTracks());
      bindGrantedMicStreamAndBroadcast(audioOnlyStream);
      setHardwareSwitchPreference('camera', true);
      markMediaPermissionGranted('camera');
      micGranted = true;
    } catch {
      // Fallback: if device has no webcam or video failed, request audio-only immediately
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        bindGrantedMicStreamAndBroadcast(audioStream);
        setHardwareSwitchPreference('camera', true);
        markMediaPermissionGranted('camera');
        micGranted = true;
      } catch {}
    }
  }

  // 2. Persist Location, Notifications, and Clipboard preferences & trigger non-conflicting prompts
  setHardwareSwitchPreference('geolocation', true);
  markMediaPermissionGranted('geolocation');
  setHardwareSwitchPreference('notifications', true);
  markMediaPermissionGranted('notifications');
  setHardwareSwitchPreference('clipboard', true);
  markMediaPermissionGranted('clipboard');

  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    try {
      navigator.geolocation.getCurrentPosition(
        () => {},
        () => {},
        { enableHighAccuracy: false, timeout: 2000, maximumAge: Infinity }
      );
    } catch {}
  }

  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
    try {
      requestNotificationPermissionCrossBrowser().catch(() => {});
    } catch {}
  }

  if (micGranted) {
    return {
      ok: true,
      micGranted: true,
      message: 'Microphone & all device permissions are allowed, active, and permanently remembered for your account.'
    };
  }

  return {
    ok: false,
    micGranted: false,
    message:
      'Microphone permission is still needed by your browser. Click "Allow Mic" and click Allow in the browser popup (or allow Microphone in the address bar site settings icon).'
  };
}



