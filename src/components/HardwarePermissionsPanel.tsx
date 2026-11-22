/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 * (TWENTY 47 PROTOCOL - GENESIS NODE / LYSANDER CORE EULA / H-FID Forensic License v1.1).
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Mic,
  Camera,
  MapPin,
  Bell,
  Clipboard,
  Sliders,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import {
  enableAllHardwarePermissionsOnGesture,
  loadHardwareSwitches,
  loadPersistedMediaPermissions,
  probeAllHardwarePermissionsSilent,
  subscribeBrowserPermissionChanges,
  toggleHardwarePermissionSlider,
  type HardwarePermissionKey,
  type HardwarePermissionStatusItem
} from '../utils/mediaPermissions';

interface HardwarePermissionsPanelProps {
  variant?: 'popover' | 'embedded';
  onClose?: () => void;
}

const HARDWARE_ITEMS: Array<{
  key: HardwarePermissionKey;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    key: 'microphone',
    label: 'Microphone',
    subtitle: 'Voice chat & speech input',
    icon: Mic
  },
  {
    key: 'camera',
    label: 'Camera',
    subtitle: 'Video calls & live vision',
    icon: Camera
  },
  {
    key: 'geolocation',
    label: 'Location',
    subtitle: 'Maps & local grounding',
    icon: MapPin
  },
  {
    key: 'notifications',
    label: 'Notifications',
    subtitle: 'System & mesh call alerts',
    icon: Bell
  },
  {
    key: 'clipboard',
    label: 'Clipboard',
    subtitle: 'Copy & paste integration',
    icon: Clipboard
  }
];

export const HardwarePermissionsPanel: React.FC<HardwarePermissionsPanelProps> = ({
  variant = 'embedded',
  onClose
}) => {
  const [statuses, setStatuses] = useState<Record<HardwarePermissionKey, HardwarePermissionStatusItem>>(() => {
    const sw = loadHardwareSwitches();
    const persisted = loadPersistedMediaPermissions();
    return {
      microphone: {
        key: 'microphone',
        enabled: Boolean(sw.microphone && persisted.micGranted),
        browserState: persisted.micGranted ? 'granted' : 'prompt'
      },
      camera: {
        key: 'camera',
        enabled: Boolean(sw.camera && persisted.cameraGranted),
        browserState: persisted.cameraGranted ? 'granted' : 'prompt'
      },
      geolocation: {
        key: 'geolocation',
        enabled: Boolean(sw.geolocation && persisted.geoGranted),
        browserState: persisted.geoGranted ? 'granted' : 'prompt'
      },
      notifications: {
        key: 'notifications',
        enabled: Boolean(sw.notifications && persisted.notifGranted),
        browserState: persisted.notifGranted ? 'granted' : 'prompt'
      },
      clipboard: {
        key: 'clipboard',
        enabled: Boolean(sw.clipboard && persisted.clipboardGranted),
        browserState: persisted.clipboardGranted ? 'granted' : 'prompt'
      }
    };
  });
  const [busyKey, setBusyKey] = useState<HardwarePermissionKey | 'all' | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const refreshSilent = useCallback(async () => {
    const result = await probeAllHardwarePermissionsSilent();
    setStatuses(result);
  }, []);

  useEffect(() => {
    refreshSilent();
    const onChanged = () => {
      refreshSilent();
    };
    window.addEventListener('sovereign_hardware_permissions_changed', onChanged);
    window.addEventListener('sovereign_microphone_stream_granted', onChanged);
    const unsubBrowser = subscribeBrowserPermissionChanges(onChanged);
    return () => {
      window.removeEventListener('sovereign_hardware_permissions_changed', onChanged);
      window.removeEventListener('sovereign_microphone_stream_granted', onChanged);
      unsubBrowser();
    };
  }, [refreshSilent]);

  const handleSetPermission = async (key: HardwarePermissionKey, targetEnabled: boolean) => {
    // Call toggleHardwarePermissionSlider on line 1 before setState so native browser getUserMedia/permission popup fires in <1ms!
    const promise = toggleHardwarePermissionSlider(key, targetEnabled);
    setBusyKey(key);
    setFeedback(null);
    try {
      const res = await promise;
      setFeedback({ ok: res.ok, text: res.message });
      await refreshSilent();
    } finally {
      setBusyKey(null);
    }
  };

  const handleToggle = async (key: HardwarePermissionKey) => {
    const current = statuses[key];
    // If currently not granted or disabled, clicking the switch requests permission and turns it ON
    const nextTarget = !(current.enabled && current.browserState === 'granted');
    await handleSetPermission(key, nextTarget);
  };

  const handleEnableAll = async () => {
    // Call enableAllHardwarePermissionsOnGesture on line 1 before setState so combined audio+video popup opens synchronously!
    const allPromise = enableAllHardwarePermissionsOnGesture();
    setBusyKey('all');
    setFeedback(null);
    try {
      const res = await allPromise;
      await refreshSilent();
      setFeedback({
        ok: res.ok,
        text: res.message
      });
    } finally {
      setBusyKey(null);
    }
  };

  const renderRows = () => (
    <div className="divide-y divide-zinc-800/70">
      {HARDWARE_ITEMS.map((item) => {
        const Icon = item.icon;
        const st = statuses[item.key];
        const isBusy = busyKey === item.key || busyKey === 'all';
        const isUnsupported = st.browserState === 'unsupported';
        const isBlockedInBrowser = st.browserState === 'denied';
        const isOn = Boolean(st.enabled && st.browserState === 'granted');

        return (
          <div key={item.key} className="flex items-center justify-between gap-2.5 py-2.5 first:pt-1 last:pb-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                  isOn
                    ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                    : isBlockedInBrowser
                    ? 'bg-amber-500/15 border-amber-500/35 text-amber-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-zinc-100 truncate">{item.label}</span>
                  <span
                    className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                      isOn
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : isBlockedInBrowser
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        : isUnsupported
                        ? 'bg-zinc-900 border-zinc-800 text-zinc-500'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    {isUnsupported ? 'N/A' : isOn ? 'On (Saved)' : isBlockedInBrowser ? 'Blocked' : 'Needs Allow'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 truncate">{item.subtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {!isUnsupported && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleSetPermission(item.key, true)}
                  className={`px-2 py-1 rounded-md border text-[10px] font-semibold cursor-pointer disabled:opacity-40 transition-colors ${
                    isOn
                      ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-emerald-300'
                      : 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-400/50 text-emerald-200'
                  }`}
                  title={
                    isOn
                      ? `Re-verify browser ${item.label} permission`
                      : `Open browser ${item.label} permission popup & turn ON permanently`
                  }
                >
                  {isOn ? 'Re-Verify' : `Allow ${item.label === 'Microphone' ? 'Mic' : item.label}`}
                </button>
              )}
              <button
                type="button"
                role="switch"
                aria-checked={isOn}
                aria-label={`Toggle ${item.label} access`}
                disabled={isBusy || isUnsupported}
                onClick={() => handleToggle(item.key)}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  isOn
                    ? 'bg-emerald-500 border-emerald-400'
                    : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                }`}
              >
                {isBusy ? (
                  <Loader2 className="w-3 h-3 text-white animate-spin mx-auto" />
                ) : (
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                      isOn ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  if (variant === 'popover') {
    return (
      <div className="fixed inset-x-3 top-14 sm:inset-auto sm:absolute sm:right-0 sm:top-auto sm:mt-2 sm:w-88 rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl p-3 space-y-2.5 z-50 text-xs max-h-[calc(100dvh-5rem)] overflow-y-auto">
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2 min-w-0">
            <Sliders className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <div className="font-bold text-zinc-100 truncate">Device Permissions</div>
              <div className="text-[10px] text-zinc-400 truncate">Click Turn On or toggle any permission</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              disabled={Boolean(busyKey)}
              onClick={handleEnableAll}
              className="px-2 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-[10px] cursor-pointer disabled:opacity-40 transition-colors"
            >
              Turn All On
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 cursor-pointer"
                aria-label="Close device privileges"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {renderRows()}

        {feedback && (
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] ${
              feedback.ok
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
            }`}
          >
            {feedback.ok ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            )}
            <span className="leading-snug">{feedback.text}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-zinc-950/90 border border-zinc-800 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Device Hardware &amp; Browser Privileges</h3>
            <p className="text-xs text-zinc-400">
              Turn on microphone, camera, location, notifications, and clipboard anytime.
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={Boolean(busyKey)}
          onClick={handleEnableAll}
          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs cursor-pointer disabled:opacity-40 transition-colors"
        >
          Turn All On
        </button>
      </div>

      {renderRows()}

      {feedback && (
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
            feedback.ok
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
          }`}
        >
          {feedback.ok ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}
    </div>
  );
};
