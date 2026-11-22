/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 * (TWENTY 47 PROTOCOL - GENESIS NODE / LYSANDER CORE EULA / H-FID Forensic License v1.1).
 * Zenodo DOI: https://doi.org/10.5281/zenodo.20778079 | ORCID: https://orcid.org/0009-0004-5273-7028
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Monitor,
  Download,
  ShieldCheck,
  Layers,
  CheckCircle2,
  Laptop,
  Globe,
  Smartphone,
  Cpu,
  Palette,
  Sliders,
  Keyboard,
  Activity,
  History,
  Play,
  RefreshCw,
  Copy,
  Check,
  Sparkles,
  Plus,
  RotateCcw,
  Clipboard
} from 'lucide-react';
import { PWAInstallButton, detectMobileDeviceProfile, type MobileDeviceProfile } from './PWAInstallButton';
import { HardwarePermissionsPanel } from './HardwarePermissionsPanel';
import type { ModuleType } from '../types';
import {
  SOVEREIGN_THEME_PRESETS,
  DEFAULT_CUSTOMIZATION_PROFILE,
  loadOSCustomizationProfile,
  saveOSCustomizationProfile,
  pushToOSClipboardRing,
  restoreDesktopIcon,
  restoreAllDesktopIcons,
  importOSCustomizationProfile,
  type SovereignOSCustomizationProfile,
  type SovereignThemeId,
  type SovereignAccentColor
} from '../utils/osCustomizationStore';
import { apiFetch } from '../utils/authClient';

export type OSShellViewMode = 'desktop' | 'workspace';

interface SovereignOSSettingsModuleProps {
  shellViewMode: OSShellViewMode;
  onChangeShellViewMode: (mode: OSShellViewMode) => void;
  onSelectModule?: (mod: ModuleType) => void;
}

export const SovereignOSSettingsModule: React.FC<SovereignOSSettingsModuleProps> = ({
  shellViewMode,
  onChangeShellViewMode,
  onSelectModule
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'compositor-themes' | 'workspaces-widgets' | 'hotkeys-clipboard' | 'daemons-benchmark' | 'nixos-snapshots'
  >('overview');

  const [runtime, setRuntime] = useState<any>(null);
  const [uid0Status, setUid0Status] = useState<string>('');
  const [verifying, setVerifying] = useState<boolean>(false);
  const [deviceProfile, setDeviceProfile] = useState<MobileDeviceProfile>(() => detectMobileDeviceProfile());

  const [profile, setProfile] = useState<SovereignOSCustomizationProfile>(() =>
    loadOSCustomizationProfile()
  );
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Daemons, Benchmark & Snapshots state
  const [daemons, setDaemons] = useState<any[]>([]);
  const [daemonBusyId, setDaemonBusyId] = useState<string | null>(null);
  const [benchmarkResult, setBenchmarkResult] = useState<any | null>(null);
  const [runningBenchmark, setRunningBenchmark] = useState(false);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [snapshotLabelInput, setSnapshotLabelInput] = useState('');
  const [creatingSnapshot, setCreatingSnapshot] = useState(false);
  const [newClipText, setNewClipText] = useState('');
  const [newClipLabel, setNewClipLabel] = useState('');

  const showToast = (msg: string) => {
    setStatusBanner(msg);
    setTimeout(() => {
      setStatusBanner((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const fetchSupremacyBackendData = useCallback(async () => {
    try {
      const res = await apiFetch('/api/os/supremacy-audit');
      const data = await res.json();
      if (data?.success) {
        if (Array.isArray(data.daemons)) setDaemons(data.daemons);
        if (Array.isArray(data.snapshots)) setSnapshots(data.snapshots);
      }
    } catch {}
  }, []);

  useEffect(() => {
    apiFetch('/api/os/runtime-info')
      .then((r) => r.json())
      .then((d) => setRuntime(d))
      .catch(() => {});

    fetchSupremacyBackendData();

    const onResize = () => setDeviceProfile(detectMobileDeviceProfile());
    const onCustomChanged = (e: Event) => {
      const ce = e as CustomEvent<SovereignOSCustomizationProfile>;
      if (ce.detail) setProfile(ce.detail);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('sovereign_os_customization_changed', onCustomChanged);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('sovereign_os_customization_changed', onCustomChanged);
    };
  }, [fetchSupremacyBackendData]);

  const updateProfile = (patch: Partial<SovereignOSCustomizationProfile>, toastMsg?: string) => {
    const next = saveOSCustomizationProfile(patch);
    setProfile(next);
    if (toastMsg) showToast(toastMsg);
  };

  const handleApplyThemePreset = (presetId: SovereignThemeId) => {
    const preset = SOVEREIGN_THEME_PRESETS.find((t) => t.id === presetId);
    if (!preset) return;
    updateProfile(
      {
        themeId: preset.id,
        accentColor: preset.accentColor,
        windowBlurPx: preset.windowBlurPx,
        windowOpacityPct: preset.windowOpacityPct,
        windowRadiusPx: preset.windowRadiusPx,
        borderGlowIntensity: preset.borderGlowIntensity,
        showTacticalGrid: preset.showTacticalGrid
      },
      `Applied OS Compositor Theme: ${preset.name}`
    );
  };

  const verifyUid0Lock = async () => {
    setVerifying(true);
    try {
      const res = await apiFetch('/api/hypervisor/uid0', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: 'RING_-3_DIRECT', action: 'LOCK_UID_0' })
      });
      const data = await res.json();
      setUid0Status(`Verified UID ${data.uid} (uid_0=${String(data.uid_0)}) · Ring ${data.hypervisor?.ring} · Proof ${data.proofHash}`);
    } catch {
      setUid0Status('Unable to reach Ring -3 hypervisor endpoint');
    } finally {
      setVerifying(false);
    }
  };

  const downloadLauncher = (platform: 'windows' | 'macos' | 'linux' | 'android' | 'ios') => {
    const origin = encodeURIComponent(window.location.origin);
    window.location.href = `/api/os/launcher/${platform}?origin=${origin}`;
  };

  const handleRunHardwareBenchmark = async () => {
    setRunningBenchmark(true);
    try {
      const res = await apiFetch('/api/os/benchmark', { method: 'POST' });
      const data = await res.json();
      if (data?.success && data.benchmark) {
        setBenchmarkResult(data.benchmark);
        showToast(
          `Hardware Benchmark Complete: ${data.benchmark.sha256ThroughputMbPerSec} MB/s SHA-256 · ${data.benchmark.ed25519SignVerifyOpsPerSec} Ed25519 Sign+Verify/sec`
        );
      }
    } catch {} finally {
      setRunningBenchmark(false);
    }
  };

  const handleToggleDaemon = async (daemonId: string, enabled: boolean) => {
    setDaemonBusyId(daemonId);
    try {
      const res = await apiFetch('/api/os/daemons/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daemonId, enabled })
      });
      const data = await res.json();
      if (data?.success && Array.isArray(data.daemons)) {
        setDaemons(data.daemons);
        showToast(`Daemon ${daemonId} ${enabled ? 'ENABLED' : 'PAUSED'}.`);
      }
    } catch {} finally {
      setDaemonBusyId(null);
    }
  };

  const handleTriggerDaemonCycle = async (daemonId: string) => {
    setDaemonBusyId(daemonId);
    try {
      const res = await apiFetch('/api/os/daemons/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daemonId })
      });
      const data = await res.json();
      if (data?.success) {
        if (Array.isArray(data.daemons)) setDaemons(data.daemons);
        showToast(data.executionSummary || 'Daemon cycle executed.');
      }
    } catch {} finally {
      setDaemonBusyId(null);
    }
  };

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingSnapshot(true);
    try {
      const res = await apiFetch('/api/os/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: snapshotLabelInput.trim() || `Declarative Generation (${profile.themeId})`,
          customizationProfile: profile
        })
      });
      const data = await res.json();
      if (data?.success) {
        if (Array.isArray(data.snapshots)) setSnapshots(data.snapshots);
        setSnapshotLabelInput('');
        showToast(`Created Declarative Atomic Snapshot [${data.snapshot?.id}]`);
      }
    } catch {} finally {
      setCreatingSnapshot(false);
    }
  };

  const handleRestoreSnapshot = async (snap: any) => {
    try {
      const res = await apiFetch('/api/os/snapshots/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId: snap.id })
      });
      const data = await res.json();
      if (data?.success && snap.customizationProfile) {
        updateProfile(snap.customizationProfile, data.message || 'Restored OS snapshot.');
      }
    } catch {}
  };

  const handleExportDotfiles = () => {
    const blob = new Blob([JSON.stringify(profile, null, 2)], {
      type: 'application/json;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lysander-sovereign-dotfiles-${profile.themeId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported Sovereign OS Dotfiles (.json)');
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-950 text-zinc-100 space-y-5 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-lg font-black text-zinc-100 flex items-center gap-2">
            <Monitor className="w-5 h-5 text-amber-400" />
            <span>Sovereign OS Control Center, Compositor Studio & Device Deployer</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Outperforming Windows 11, macOS Sequoia, Arch/Hyprland & NixOS in Capability & Customization · UID 0 Ring -3 Hypervisor.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-jhammerz-license'))}
            className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-[11px] font-mono text-amber-300 cursor-pointer"
          >
            © 1988–2026 Joshua Hamilton (JHammerZ) · MIT &amp; TWENTY 47 / H-FID License
          </button>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-mono text-emerald-300">
            UID 0 · Ring -3 ACTIVE
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 bg-zinc-900/80 p-1.5 rounded-2xl border border-zinc-800">
        {(
          [
            { id: 'overview', label: 'Device & Shell Deployer', icon: Laptop },
            { id: 'compositor-themes', label: 'Themes & Glass Compositor', icon: Palette },
            { id: 'workspaces-widgets', label: 'Virtual Desktops (1–4) & HUDs', icon: Layers },
            { id: 'hotkeys-clipboard', label: 'Hotkeys & Clipboard Ring', icon: Keyboard },
            { id: 'daemons-benchmark', label: 'Systemd Daemons & Benchmark', icon: Activity },
            { id: 'nixos-snapshots', label: 'NixOS Atomic Snapshots & Dotfiles', icon: History }
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                active
                  ? 'bg-amber-500 text-zinc-950 shadow-md'
                  : 'text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {statusBanner && (
        <div className="px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center justify-between">
          <span>{statusBanner}</span>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-[10px] underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 1: OVERVIEW, SHELL ENVIRONMENT & CROSS-PLATFORM LAUNCHERS       */}
      {/* =================================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Manual Device Hardware & Browser Privileges Sliders (Zero Boot Popups) */}
          <HardwarePermissionsPanel variant="embedded" />

          {/* Live Client Device & Mobile OEM Hardware Detection */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-100">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Connected Device & Mobile Brand Profile</span>
              </div>
              <PWAInstallButton variant="button" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                <div className="text-[10px] text-zinc-500">OS FAMILY</div>
                <div className="text-zinc-100 truncate">{deviceProfile.osFamily}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                <div className="text-[10px] text-zinc-500">OEM / HARDWARE</div>
                <div className="text-amber-300 truncate">{deviceProfile.oemBrand}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                <div className="text-[10px] text-zinc-500">ENGINE</div>
                <div className="text-sky-300 truncate">{deviceProfile.browserEngine}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                <div className="text-[10px] text-zinc-500">SCREEN / TOUCH</div>
                <div className="text-emerald-300 truncate">
                  {deviceProfile.viewport} · {deviceProfile.pixelRatio}x · {deviceProfile.touchPoints}pt
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Window Manager Mode */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-zinc-100">
              <Layers className="w-4 h-4 text-sky-400" />
              <span>Operating System Shell Environment</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onChangeShellViewMode('desktop')}
                className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                  shellViewMode === 'desktop'
                    ? 'bg-amber-500/15 border-amber-500/40'
                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-100">Multi-Window Floating Desktop OS</span>
                  {shellViewMode === 'desktop' && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Full windowed OS desktop on large screens & Samsung DeX/tablets with draggable/8-way-resizable app windows, 4 virtual workspaces, desktop HUD widgets, and auto-adaptive single-pane touch shell on phones.
                </p>
              </button>

              <button
                type="button"
                onClick={() => onChangeShellViewMode('workspace')}
                className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                  shellViewMode === 'workspace'
                    ? 'bg-sky-500/15 border-sky-500/40'
                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-100">Tiled Split-Pane Workspace OS</span>
                  {shellViewMode === 'workspace' && <CheckCircle2 className="w-4 h-4 text-sky-400" />}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Streamlined full-viewport or 50/50 & 60/40 side-by-side split multitasking across any paired apps.
                </p>
              </button>
            </div>
          </div>

          {/* Cross-Platform Native Standalone OS Launchers (Desktop + Mobile) */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-zinc-100">
              <Laptop className="w-4 h-4 text-emerald-400" />
              <span>Run Natively on Android, iOS, Windows, macOS & Linux</span>
            </div>
            <p className="text-xs text-zinc-400">
              Export real platform-native standalone launchers and mobile installation profiles that boot Lysander Sovereign OS directly without browser address bars.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { id: 'android' as const, title: 'Android / Termux (.sh)', desc: 'Universal Android WebAPK / Termux wake-lock & Intent launcher (Samsung, Pixel, OnePlus, Xiaomi, Motorola, Sony, Nothing)' },
                { id: 'ios' as const, title: 'iPhone / iPad (.mobileconfig)', desc: 'Apple full-screen Home Screen WebClip configuration profile for Safari iOS & iPadOS' },
                { id: 'windows' as const, title: 'Windows (.bat)', desc: 'Edge / Chrome native --app window launcher for Windows 10/11 & ARM64' },
                { id: 'macos' as const, title: 'macOS (.command)', desc: 'macOS native app-window launcher for Apple Silicon & Intel Macs' },
                { id: 'linux' as const, title: 'Linux (.desktop)', desc: 'XDG desktop application entry for Ubuntu, Arch, Fedora, Debian & SteamOS' }
              ].map((item) => (
                <div key={item.id} className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-zinc-100">{item.title}</div>
                    <div className="text-[11px] text-zinc-400 mt-1">{item.desc}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadLauncher(item.id)}
                    className="w-full py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>Download Launcher</span>
                  </button>
                </div>
              ))}

              {onSelectModule && (
                <div className="p-3.5 rounded-xl bg-zinc-950 border border-emerald-500/30 flex flex-col justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5" />
                      <span>Capacitor APK & Termux Node</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-1">
                      Build signed Android APK (`com.aurelius.sovereign.swarm`) or pair native Termux hardware APIs.
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectModule('packager')}
                      className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                    >
                      APK Builder
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectModule('termux')}
                      className="flex-1 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-bold cursor-pointer"
                    >
                      Termux Bridge
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Ring -3 & Host Kernel Verification */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-100">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>UID 0 & Ring -3 Hypervisor Kernel Audit</span>
              </div>
              <button
                type="button"
                onClick={verifyUid0Lock}
                disabled={verifying}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {verifying ? 'Verifying...' : 'Verify UID 0 / Ring -3 Lock'}
              </button>
            </div>

            {uid0Status && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-300">
                {uid0Status}
              </div>
            )}

            {runtime && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono pt-1">
                <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                  <div className="text-[10px] text-zinc-500">HOST KERNEL</div>
                  <div className="text-zinc-200 truncate">{runtime.hostPlatform} ({runtime.arch})</div>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                  <div className="text-[10px] text-zinc-500">OS IDENTITY</div>
                  <div className="text-zinc-200 truncate">{runtime.kernelName}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                  <div className="text-[10px] text-zinc-500">ACTIVE SHELL USER</div>
                  <div className="text-emerald-300 truncate">{runtime.hostUser?.username} (uid={runtime.authority?.uid})</div>
                </div>
              </div>
            )}

            {onSelectModule && (
              <div className="pt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => onSelectModule('terminal')} className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-emerald-300 cursor-pointer">
                  Open Root Terminal
                </button>
                <button type="button" onClick={() => onSelectModule('file-manager')} className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-amber-300 cursor-pointer">
                  Open Sovereign Files
                </button>
                <button type="button" onClick={() => onSelectModule('task-manager')} className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-sky-300 cursor-pointer">
                  Open Process Monitor
                </button>
                <button type="button" onClick={() => onSelectModule('browser')} className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-sky-300 flex items-center gap-1 cursor-pointer">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Open Google Chrome</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: THEMES, WALLPAPERS & GLASS WINDOW COMPOSITOR STUDIO          */}
      {/* =================================================================== */}
      {activeTab === 'compositor-themes' && (
        <div className="space-y-6">
          <div className="bg-zinc-900/75 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-zinc-100 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-amber-400" />
                  <span>Sovereign OS Architectural Theme & Rice Presets (8 Master Profiles)</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Instant 60FPS desktop wallpaper, acrylic glass blur, border glow, and tiling geometry switching.
                </p>
              </div>
              <button
                type="button"
                onClick={() => updateProfile(DEFAULT_CUSTOMIZATION_PROFILE, 'Reset OS Compositor to Genesis Defaults')}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Reset Defaults</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {SOVEREIGN_THEME_PRESETS.map((preset) => {
                const isSelected = profile.themeId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyThemePreset(preset.id)}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between gap-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400 shadow-lg'
                        : 'bg-zinc-950/90 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="space-y-2">
                      <div
                        className="h-14 w-full rounded-lg border border-white/10 flex items-end p-2"
                        style={{ backgroundImage: preset.wallpaperCss }}
                      >
                        <span className="px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-zinc-200">
                          Blur {preset.windowBlurPx}px · Radius {preset.windowRadiusPx}px
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-zinc-100">{preset.name}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />}
                      </div>
                      <div className="text-[10px] font-mono text-amber-300/90">{preset.inspiredBy}</div>
                      <p className="text-[11px] text-zinc-400 leading-snug">{preset.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Window Glass & Physics Sliders */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-zinc-900/75 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-200 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-400" />
                <span>Window Compositor & Acrylic Glass Physics</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-zinc-300 font-semibold">Acrylic Backdrop Blur</span>
                    <span className="font-mono text-amber-300">{profile.windowBlurPx}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={32}
                    value={profile.windowBlurPx}
                    onChange={(e) => updateProfile({ windowBlurPx: Number(e.target.value) })}
                    className="w-full accent-amber-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-zinc-300 font-semibold">Window Surface Opacity</span>
                    <span className="font-mono text-amber-300">{profile.windowOpacityPct}%</span>
                  </div>
                  <input
                    type="range"
                    min={75}
                    max={100}
                    value={profile.windowOpacityPct}
                    onChange={(e) => updateProfile({ windowOpacityPct: Number(e.target.value) })}
                    className="w-full accent-amber-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-zinc-300 font-semibold">Window Corner Radius (0px Tiling → 24px Curved)</span>
                    <span className="font-mono text-amber-300">{profile.windowRadiusPx}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={24}
                    value={profile.windowRadiusPx}
                    onChange={(e) => updateProfile({ windowRadiusPx: Number(e.target.value) })}
                    className="w-full accent-amber-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">Active Accent Color</label>
                    <select
                      value={profile.accentColor}
                      onChange={(e) =>
                        updateProfile(
                          { accentColor: e.target.value as SovereignAccentColor },
                          `Accent switched to ${e.target.value}`
                        )
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100"
                    >
                      <option value="amber">Sovereign Amber Gold</option>
                      <option value="emerald">Hyprland Matrix Emerald</option>
                      <option value="sky">Sequoia Sapphire Sky</option>
                      <option value="cyan">Fluent Mica Cyan</option>
                      <option value="violet">Tokyo Night Violet</option>
                      <option value="rose">Qubes Tactical Crimson</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">Desktop Icon Grid Size</label>
                    <select
                      value={profile.iconSize}
                      onChange={(e) =>
                        updateProfile({ iconSize: e.target.value as 'compact' | 'standard' | 'large' })
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100"
                    >
                      <option value="compact">Compact (High-Density)</option>
                      <option value="standard">Standard Workstation</option>
                      <option value="large">Large Touch / DeX</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile.showTacticalGrid}
                      onChange={(e) => updateProfile({ showTacticalGrid: e.target.checked })}
                      className="accent-amber-400"
                    />
                    <span>Show Tactical Coordinate Grid</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile.showCrtScanlines}
                      onChange={(e) => updateProfile({ showCrtScanlines: e.target.checked })}
                      className="accent-amber-400"
                    />
                    <span>Enable Subtle CRT Scanline Shader</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Custom Wallpaper URL & Live Custom CSS Dotfiles Injector */}
            <div className="bg-zinc-900/75 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Custom Wallpaper Image URL & Live CSS Rice Injector</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">
                    Custom Desktop Wallpaper URL or Local File Upload (4K PNG / JPG / WebP)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={profile.customWallpaperUrl}
                      onChange={(e) =>
                        updateProfile({
                          customWallpaperUrl: e.target.value,
                          themeId: e.target.value.trim() ? 'custom-wallpaper' : profile.themeId
                        })
                      }
                      placeholder="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1920&q=80"
                      className="flex-1 min-w-[200px] bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100"
                    />
                    <label className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-bold cursor-pointer shrink-0">
                      Upload Image
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (typeof reader.result === 'string') {
                              updateProfile({
                                customWallpaperUrl: reader.result,
                                themeId: 'custom-wallpaper'
                              });
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-zinc-400">
                    <span>Wallpaper Brightness: {profile.wallpaperOpacityPct ?? 68}%</span>
                    <input
                      type="range"
                      min={15}
                      max={95}
                      value={profile.wallpaperOpacityPct ?? 68}
                      onChange={(e) => updateProfile({ wallpaperOpacityPct: Number(e.target.value) })}
                      className="flex-1 accent-amber-400"
                    />
                  </div>
                </div>

                {/* Desktop Icon Manager + Controller & Touch Toggles */}
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-sky-300">
                      Desktop Icons, Real Desktop Files &amp; Universal Input
                    </span>
                    {(profile.hiddenDesktopIcons?.length || 0) > 0 && (
                      <button
                        type="button"
                        onClick={() => setProfile(restoreAllDesktopIcons())}
                        className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold cursor-pointer"
                      >
                        Restore All {profile.hiddenDesktopIcons.length} Deleted Icons
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 text-[11px]">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profile.showDesktopFiles !== false}
                        onChange={(e) => updateProfile({ showDesktopFiles: e.target.checked })}
                        className="accent-amber-400"
                      />
                      <span>Show Real Desktop Files &amp; Folders</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profile.showTouchControllerOverlay}
                        onChange={(e) => updateProfile({ showTouchControllerOverlay: e.target.checked })}
                        className="accent-sky-400"
                      />
                      <span>Multi-Touch Virtual Gamepad Overlay</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profile.enableGamepadOsNav}
                        onChange={(e) => updateProfile({ enableGamepadOsNav: e.target.checked })}
                        className="accent-emerald-400"
                      />
                      <span>Hardware Controller OS Navigation</span>
                    </label>
                  </div>
                  {(profile.hiddenDesktopIcons?.length || 0) > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {profile.hiddenDesktopIcons.map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setProfile(restoreDesktopIcon(id))}
                          className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-[10px] text-zinc-300 hover:border-emerald-400 cursor-pointer"
                        >
                          + Restore {id}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">
                    Live Custom CSS Override (`#sovereign-custom-dotfiles-css`)
                  </label>
                  <textarea
                    rows={5}
                    value={profile.customCss}
                    onChange={(e) => updateProfile({ customCss: e.target.value })}
                    placeholder={`/* Live CSS Rice Override — applies immediately across the entire OS */\n/* Example: .sovereign-window { box-shadow: 0 0 35px rgba(16,185,129,0.25); } */`}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 font-mono text-[11px] text-emerald-300"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: VIRTUAL DESKTOPS (1–4) & LIVE DESKTOP HUD WIDGETS            */}
      {/* =================================================================== */}
      {activeTab === 'workspaces-widgets' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-zinc-900/75 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-black text-zinc-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-400" />
              <span>Multi-Workspace Virtual Desktops (Workspaces 1–4)</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Switch workspaces via the top/bottom OS taskbar or `Alt+1` through `Alt+4`. Detached PiP windows remain omnipresent across all 4 workspaces.
            </p>

            <div className="space-y-3">
              {([1, 2, 3, 4] as const).map((wsNum, idx) => {
                const isActive = profile.activeWorkspace === wsNum;
                return (
                  <div
                    key={wsNum}
                    className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                      isActive
                        ? 'bg-amber-500/15 border-amber-400'
                        : 'bg-zinc-950 border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
                      <span className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-xs font-mono font-bold text-amber-300">
                        WS {wsNum}
                      </span>
                      <input
                        type="text"
                        value={profile.workspaceNames[idx]}
                        onChange={(e) => {
                          const nextNames = [...profile.workspaceNames] as [string, string, string, string];
                          nextNames[idx] = e.target.value;
                          updateProfile({ workspaceNames: nextNames });
                        }}
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateProfile(
                          { activeWorkspace: wsNum },
                          `Switched to Virtual Workspace ${wsNum} (${profile.workspaceNames[idx]})`
                        )
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                        isActive
                          ? 'bg-amber-500 text-zinc-950'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                      }`}
                    >
                      {isActive ? 'Active Desktop' : `Switch to WS ${wsNum}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-zinc-900/75 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-black text-zinc-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Desktop Canvas Live Telemetry HUD Widgets</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Pin real-time glass telemetry HUD cards directly onto the Sovereign Desktop wallpaper canvas.
            </p>

            <div className="space-y-3 text-xs">
              {[
                {
                  key: 'showKernelHud' as const,
                  title: 'Ring -3 Kernel, CPU Load & 128-Byte Binary MMIO Bus HUD',
                  desc: 'Displays live host CPU cores, RAM utilization, UID 0 clearance, and active virtual desktop status.'
                },
                {
                  key: 'showMarketTickerHud' as const,
                  title: 'Laplace-14 (h=2s) 5-Minute Market & Crypto Early-Warning HUD',
                  desc: 'Streams live 5-minute conformal predictions and BUY/SELL/PROFIT/LOSS signals on the desktop.'
                },
                {
                  key: 'showCryptoVaultHud' as const,
                  title: 'Dual-Vault Crypto Net Worth & UID 0 Agentic Treasury HUD',
                  desc: 'Displays live Personal Investor + Agentic Autonomous vault valuation and quick launch buttons.'
                },
                {
                  key: 'showClipboardHud' as const,
                  title: 'Universal Multi-Slot OS Clipboard Ring HUD',
                  desc: 'Provides 1-click copy access to your pinned and recent OS clipboard items from the desktop.'
                }
              ].map((w) => (
                <label
                  key={w.key}
                  className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-start justify-between gap-3 cursor-pointer"
                >
                  <div>
                    <div className="font-bold text-zinc-100">{w.title}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">{w.desc}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile.desktopWidgets[w.key]}
                    onChange={(e) =>
                      updateProfile({
                        desktopWidgets: {
                          ...profile.desktopWidgets,
                          [w.key]: e.target.checked
                        }
                      })
                    }
                    className="mt-1 accent-amber-400"
                  />
                </label>
              ))}
            </div>

            {/* Opt-In Telemetry & Crypto Notification Controls (Strictly OFF by default) */}
            <div className="pt-4 mt-4 border-t border-zinc-800 space-y-3">
              <div>
                <h4 className="text-xs font-bold text-zinc-100">
                  Telemetry &amp; Crypto Trading Notifications (Off by Default)
                </h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  All floating market, telemetry, and crypto trading popups and chimes remain muted unless explicitly turned on here or from the taskbar.
                </p>
              </div>
              <div className="space-y-2 text-xs">
                {[
                  {
                    key: 'telemetryPopupAlerts' as const,
                    title: 'Macro Telemetry 5-Minute Popup Alerts',
                    desc: 'Show floating OS popup banners for 5-minute macro market early-warning signals.'
                  },
                  {
                    key: 'cryptoTradingAlerts' as const,
                    title: 'Crypto Trading & Autonomous Execution Alerts',
                    desc: 'Show floating OS popup alerts for BTC/ETH/SOL trading signals and autonomous trade activity.'
                  },
                  {
                    key: 'telemetryAudioChime' as const,
                    title: 'Critical Signal Audio Chime',
                    desc: 'Play a Web Audio chime inside Macro Telemetry when critical 5-minute alerts fire.'
                  }
                ].map((n) => (
                  <label
                    key={n.key}
                    className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-start justify-between gap-3 cursor-pointer"
                  >
                    <div>
                      <div className="font-semibold text-zinc-100">{n.title}</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">{n.desc}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(profile.notifications?.[n.key])}
                      onChange={(e) =>
                        updateProfile(
                          {
                            notifications: {
                              ...profile.notifications,
                              [n.key]: e.target.checked
                            }
                          },
                          `${n.title}: ${e.target.checked ? 'ON' : 'OFF'}`
                        )
                      }
                      className="mt-1 accent-emerald-400"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: PROGRAMMABLE GLOBAL HOTKEYS & UNIVERSAL OS CLIPBOARD RING    */}
      {/* =================================================================== */}
      {activeTab === 'hotkeys-clipboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-zinc-900/75 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-black text-zinc-100 flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-amber-400" />
              <span>Global OS Keybindings & Quick Dispatcher</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {Object.entries(profile.hotkeys).map(([key, combo]) => (
                <div
                  key={key}
                  className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2"
                >
                  <span className="text-zinc-300 font-semibold capitalize">
                    {key.replace(/([A-Z0-9])/g, ' $1')}
                  </span>
                  <input
                    type="text"
                    value={combo}
                    onChange={(e) =>
                      updateProfile({
                        hotkeys: {
                          ...profile.hotkeys,
                          [key]: e.target.value
                        }
                      })
                    }
                    className="w-24 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-center font-mono text-[11px] text-amber-300"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900/75 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-black text-zinc-100 flex items-center gap-2">
              <Clipboard className="w-4 h-4 text-emerald-400" />
              <span>Universal Multi-Slot OS Clipboard Ring ({profile.clipboardHistory.length})</span>
            </h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newClipText.trim()) return;
                const next = pushToOSClipboardRing(
                  newClipText.trim(),
                  newClipLabel.trim() || 'User Snippet'
                );
                setProfile(next);
                setNewClipText('');
                setNewClipLabel('');
                showToast('Added snippet to OS Clipboard Ring & copied to system clipboard.');
              }}
              className="flex flex-col sm:flex-row gap-2"
            >
              <input
                type="text"
                value={newClipLabel}
                onChange={(e) => setNewClipLabel(e.target.value)}
                placeholder="Label (e.g. BTC Address)"
                className="sm:w-36 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100"
              />
              <input
                type="text"
                value={newClipText}
                onChange={(e) => setNewClipText(e.target.value)}
                placeholder="Paste command, key, or snippet to store in OS ring..."
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {profile.clipboardHistory.map((clip) => (
                <div
                  key={clip.id}
                  className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-amber-300 text-[11px]">{clip.label}</div>
                    <div className="font-mono text-zinc-200 truncate">{clip.text}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(clip.text, clip.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    {copiedId === clip.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 5: SYSTEMD BACKGROUND DAEMON SUPERVISOR & HARDWARE BENCHMARK    */}
      {/* =================================================================== */}
      {activeTab === 'daemons-benchmark' && (
        <div className="space-y-6">
          {/* Hardware & Cryptographic Kernel Benchmark Suite */}
          <div className="bg-zinc-900/75 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-zinc-100 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-amber-400" />
                  <span>Real Hardware & Cryptographic Kernel Benchmark Suite</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Measures live SHA-256 hashing MB/s, AES-256-GCM authenticated encryption MB/s, Ed25519 asymmetric sign+verify ops/sec, Ring -3 128-byte binary MMIO bus IOPS, and Laplace-14 matrix latency.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRunHardwareBenchmark}
                disabled={runningBenchmark}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-lg"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{runningBenchmark ? 'Running Kernel Benchmark...' : 'Run Live Hardware Benchmark'}</span>
              </button>
            </div>

            {benchmarkResult && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs font-mono">
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <div className="text-[10px] text-zinc-500">SHA-256 THROUGHPUT</div>
                  <div className="text-base font-black text-emerald-400">
                    {benchmarkResult.sha256ThroughputMbPerSec} MB/s
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <div className="text-[10px] text-zinc-500">AES-256-GCM CIPHER</div>
                  <div className="text-base font-black text-sky-400">
                    {benchmarkResult.aes256GcmThroughputMbPerSec} MB/s
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <div className="text-[10px] text-zinc-500">ED25519 SIGN+VERIFY</div>
                  <div className="text-base font-black text-amber-300">
                    {benchmarkResult.ed25519SignVerifyOpsPerSec}/sec
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <div className="text-[10px] text-zinc-500">MMIO BINARY BUS I/O</div>
                  <div className="text-base font-black text-violet-300">
                    {benchmarkResult.mmioBinaryBusOpsPerSec} IOPS
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <div className="text-[10px] text-zinc-500">LAPLACE-14 (20 MKTS)</div>
                  <div className="text-base font-black text-cyan-300">
                    {benchmarkResult.laplace14ConformalLatencyMs} ms
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40">
                  <div className="text-[10px] text-emerald-300">SUPREMACY INDEX</div>
                  <div className="text-base font-black text-white">
                    {benchmarkResult.compositeSupremacyScore}/100
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sovereign Systemd / Launchd Background Daemons */}
          <div className="bg-zinc-900/75 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-black text-zinc-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Sovereign Systemd / Launchd Autonomous Background Daemon Supervisor</span>
            </h3>

            <div className="space-y-3">
              {daemons.map((d) => (
                <div
                  key={d.id}
                  className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-amber-300">{d.unitName}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          d.enabled
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {d.status}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        Cycles: {d.cyclesCompleted} · Interval: {d.intervalSeconds}s
                      </span>
                    </div>
                    <div className="text-xs font-bold text-zinc-100">{d.title}</div>
                    <p className="text-[11px] text-zinc-400">{d.description}</p>
                    <div className="text-[11px] font-mono text-sky-300">
                      Last Output: {d.lastResultSummary}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleTriggerDaemonCycle(d.id)}
                      disabled={daemonBusyId === d.id}
                      className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${daemonBusyId === d.id ? 'animate-spin' : ''}`} />
                      <span>Execute Cycle Now</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleDaemon(d.id, !d.enabled)}
                      disabled={daemonBusyId === d.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                        d.enabled
                          ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                          : 'bg-emerald-500 text-zinc-950'
                      }`}
                    >
                      {d.enabled ? 'Pause' : 'Enable'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 6: NIXOS DECLARATIVE ATOMIC SNAPSHOTS & DOTFILES EXPORT         */}
      {/* =================================================================== */}
      {activeTab === 'nixos-snapshots' && (
        <div className="space-y-6">
          <div className="bg-zinc-900/75 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-zinc-100 flex items-center gap-2">
                  <History className="w-4 h-4 text-amber-400" />
                  <span>NixOS-Style Declarative Atomic OS Generations & 1-Click Rollback</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Capture your entire OS state (installed apps, Merkle root, daemons, themes, virtual desktops, and dotfiles) into a SHA-256 attested generation with instant rollback.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="px-3.5 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-xs font-bold text-sky-200 flex items-center gap-1.5 cursor-pointer">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Import Dotfiles (.json)</span>
                  <input
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === 'string') {
                          const res = importOSCustomizationProfile(reader.result);
                          if (res.ok && res.profile) setProfile(res.profile);
                        }
                      };
                      reader.readAsText(file);
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={handleExportDotfiles}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-bold text-amber-300 flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Dotfiles (.json)</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateSnapshot} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={snapshotLabelInput}
                onChange={(e) => setSnapshotLabelInput(e.target.value)}
                placeholder="Snapshot label (e.g. Production Hyprland Rice + Dual Crypto Vaults)..."
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100"
              />
              <button
                type="submit"
                disabled={creatingSnapshot}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>{creatingSnapshot ? 'Creating Generation...' : 'Create Atomic OS Snapshot'}</span>
              </button>
            </form>

            <div className="space-y-2.5">
              {snapshots.map((snap, idx) => (
                <div
                  key={snap.id}
                  className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[10px] font-bold">
                        GEN #{snapshots.length - idx}
                      </span>
                      <span className="text-xs font-bold text-zinc-100">{snap.label}</span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {new Date(snap.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-zinc-400 truncate">
                      Merkle Root: <span className="text-emerald-400">{snap.merkleRootSha256?.slice(0, 24)}...</span> · Apps: {snap.installedAppsCount} · Daemons: {snap.activeDaemonsCount} · Wallets: {snap.walletsCount}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRestoreSnapshot(snap)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Rollback to Gen</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
