/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 * (TWENTY 47 PROTOCOL - GENESIS NODE / LYSANDER CORE EULA / H-FID Forensic License v1.1).
 * Zenodo DOI: https://doi.org/10.5281/zenodo.20778079 | ORCID: https://orcid.org/0009-0004-5273-7028
 */

import type React from 'react';
import { pushContinuitySettingsPatch } from './continuityClient';

export type SovereignThemeId =
  | 'aurelius-gold'
  | 'hyprland-matrix'
  | 'macos-sequoia'
  | 'win11-mica'
  | 'qubes-crimson'
  | 'solarized-quantum'
  | 'tokyo-night'
  | 'custom-wallpaper';

export type SovereignAccentColor = 'amber' | 'emerald' | 'sky' | 'violet' | 'rose' | 'cyan';

export interface ClipboardRingEntry {
  id: string;
  text: string;
  label: string;
  timestamp: string;
  pinned?: boolean;
}

export interface CustomDesktopShortcut {
  id: string;
  label: string;
  subtitle: string;
  kind: 'url' | 'steam' | 'command' | 'module';
  target: string;
  accent: string;
  badge?: string;
}

export type ControllerGlyphFamily = 'auto' | 'xbox' | 'playstation' | 'nintendo' | 'steam';

export interface SovereignOSCustomizationProfile {
  themeId: SovereignThemeId;
  customWallpaperUrl: string;
  wallpaperOpacityPct: number;
  wallpaperBlurPx: number;
  accentColor: SovereignAccentColor;
  windowBlurPx: number;
  windowOpacityPct: number;
  windowRadiusPx: number;
  borderGlowIntensity: 'subtle' | 'high' | 'neon';
  iconSize: 'compact' | 'standard' | 'large';
  fontScalePct: number;
  showTacticalGrid: boolean;
  showCrtScanlines: boolean;
  showDesktopFiles: boolean;
  hiddenDesktopIcons: string[];
  customIconLabels: Record<string, string>;
  customDesktopShortcuts: CustomDesktopShortcut[];
  desktopIconOrder: string[];
  enableGamepadOsNav: boolean;
  showTouchControllerOverlay: boolean;
  controllerGlyphStyle: ControllerGlyphFamily;
  activeWorkspace: 1 | 2 | 3 | 4;
  workspaceNames: [string, string, string, string];
  desktopWidgets: {
    showKernelHud: boolean;
    showMarketTickerHud: boolean;
    showCryptoVaultHud: boolean;
    showClipboardHud: boolean;
  };
  notifications: {
    telemetryPopupAlerts: boolean;
    cryptoTradingAlerts: boolean;
    telemetryAudioChime: boolean;
  };
  hotkeys: {
    launcher: string;
    splitMode: string;
    tileWindows: string;
    detachChat: string;
    workspace1: string;
    workspace2: string;
    workspace3: string;
    workspace4: string;
    openTerminal: string;
    openWallets: string;
    openMarkets: string;
    openDiagnostics: string;
  };
  customCss: string;
  clipboardHistory: ClipboardRingEntry[];
}

export interface SovereignThemePreset {
  id: SovereignThemeId;
  name: string;
  inspiredBy: string;
  description: string;
  wallpaperCss: string;
  accentColor: SovereignAccentColor;
  windowBlurPx: number;
  windowOpacityPct: number;
  windowRadiusPx: number;
  borderGlowIntensity: 'subtle' | 'high' | 'neon';
  showTacticalGrid: boolean;
}

export const SOVEREIGN_THEME_PRESETS: SovereignThemePreset[] = [
  {
    id: 'aurelius-gold',
    name: 'Aurelius Sovereign Gold (Ring -3 Default)',
    inspiredBy: 'Lysander Genesis Node · UID 0 Bare-Metal',
    description: 'Deep obsidian carbon substrate with gold/emerald telemetry accents and tactical coordinates grid.',
    wallpaperCss:
      'radial-gradient(circle at 18% 18%, rgba(245,158,11,0.14), transparent 38%), radial-gradient(circle at 82% 24%, rgba(56,189,248,0.12), transparent 42%), radial-gradient(circle at 50% 82%, rgba(16,185,129,0.10), transparent 48%), linear-gradient(160deg, #05070b 0%, #090d16 55%, #05070b 100%)',
    accentColor: 'amber',
    windowBlurPx: 18,
    windowOpacityPct: 95,
    windowRadiusPx: 16,
    borderGlowIntensity: 'high',
    showTacticalGrid: true
  },
  {
    id: 'hyprland-matrix',
    name: 'Hyprland Cyber-Emerald Tiling Rice',
    inspiredBy: 'Arch Linux + Hyprland Wayland Compositor',
    description: 'Ultra-crisp neon emerald active borders, sharp 6px tiling geometry, and high-contrast terminal clarity.',
    wallpaperCss:
      'radial-gradient(circle at 20% 25%, rgba(16,185,129,0.22), transparent 40%), radial-gradient(circle at 80% 75%, rgba(6,182,212,0.18), transparent 45%), linear-gradient(135deg, #020806 0%, #04130e 50%, #020609 100%)',
    accentColor: 'emerald',
    windowBlurPx: 22,
    windowOpacityPct: 90,
    windowRadiusPx: 6,
    borderGlowIntensity: 'neon',
    showTacticalGrid: true
  },
  {
    id: 'macos-sequoia',
    name: 'Sequoia Midnight Frosted Glass',
    inspiredBy: 'macOS Sequoia / Aqua Quartz Compositor',
    description: 'Deep frosted acrylic blur (28px), smooth 20px window corners, and midnight sapphire ambiance.',
    wallpaperCss:
      'radial-gradient(circle at 25% 20%, rgba(59,130,246,0.28), transparent 45%), radial-gradient(circle at 75% 30%, rgba(139,92,246,0.24), transparent 48%), radial-gradient(circle at 50% 85%, rgba(14,165,233,0.18), transparent 50%), linear-gradient(160deg, #070b19 0%, #0f172a 55%, #090d16 100%)',
    accentColor: 'sky',
    windowBlurPx: 28,
    windowOpacityPct: 88,
    windowRadiusPx: 20,
    borderGlowIntensity: 'subtle',
    showTacticalGrid: false
  },
  {
    id: 'win11-mica',
    name: 'Fluent Mica Obsidian Pro',
    inspiredBy: 'Windows 11 Pro Workstation Acrylic Mica',
    description: 'Balanced 12px workstation geometry, high-density slate mica surfaces, and cyan focus highlights.',
    wallpaperCss:
      'radial-gradient(circle at 50% 35%, rgba(14,165,233,0.22), transparent 42%), radial-gradient(circle at 30% 70%, rgba(37,99,235,0.18), transparent 48%), linear-gradient(180deg, #080c14 0%, #0b1320 60%, #06090f 100%)',
    accentColor: 'cyan',
    windowBlurPx: 16,
    windowOpacityPct: 94,
    windowRadiusPx: 12,
    borderGlowIntensity: 'high',
    showTacticalGrid: false
  },
  {
    id: 'qubes-crimson',
    name: 'Qubes Air-Gapped Tactical Vault',
    inspiredBy: 'Qubes OS Xen Hypervisor Security Domains',
    description: 'Zero-distraction air-gapped crimson domain borders with high-opacity isolated compartments.',
    wallpaperCss:
      'radial-gradient(circle at 15% 20%, rgba(244,63,94,0.20), transparent 40%), radial-gradient(circle at 85% 80%, rgba(245,158,11,0.14), transparent 42%), linear-gradient(145deg, #0c0407 0%, #14070b 55%, #060305 100%)',
    accentColor: 'rose',
    windowBlurPx: 12,
    windowOpacityPct: 97,
    windowRadiusPx: 8,
    borderGlowIntensity: 'neon',
    showTacticalGrid: true
  },
  {
    id: 'solarized-quantum',
    name: 'Solarized Quantum Telemetry',
    inspiredBy: 'Ethan Schoonover Solarized Dark / Scientific Workstations',
    description: 'Precision optical contrast engineered for zero eye fatigue during 24/7 quantitative market & code auditing.',
    wallpaperCss:
      'radial-gradient(circle at 75% 20%, rgba(42,161,152,0.22), transparent 45%), radial-gradient(circle at 20% 80%, rgba(181,137,0,0.16), transparent 45%), linear-gradient(160deg, #00141a 0%, #002b36 60%, #001b22 100%)',
    accentColor: 'cyan',
    windowBlurPx: 16,
    windowOpacityPct: 95,
    windowRadiusPx: 12,
    borderGlowIntensity: 'high',
    showTacticalGrid: true
  },
  {
    id: 'tokyo-night',
    name: 'Tokyo Night Neural Hypervisor',
    inspiredBy: 'Tokyo Night / Neovim & Wayland Developer Suite',
    description: 'Deep indigo-violet nocturnal glow paired with electric purple/cyan syntax accents.',
    wallpaperCss:
      'radial-gradient(circle at 22% 24%, rgba(168,85,247,0.24), transparent 42%), radial-gradient(circle at 80% 70%, rgba(56,189,248,0.18), transparent 45%), linear-gradient(155deg, #0b0c16 0%, #161626 55%, #0a0b12 100%)',
    accentColor: 'violet',
    windowBlurPx: 24,
    windowOpacityPct: 91,
    windowRadiusPx: 16,
    borderGlowIntensity: 'neon',
    showTacticalGrid: true
  },
  {
    id: 'custom-wallpaper',
    name: 'Custom Sovereign Wallpaper & CSS',
    inspiredBy: 'User-Defined Image / Shader & Custom Dotfiles',
    description: 'Uses your custom background image URL and custom CSS rules.',
    wallpaperCss:
      'linear-gradient(160deg, #05070b 0%, #0f172a 100%)',
    accentColor: 'amber',
    windowBlurPx: 20,
    windowOpacityPct: 92,
    windowRadiusPx: 16,
    borderGlowIntensity: 'high',
    showTacticalGrid: false
  }
];

const LEGACY_STORAGE_KEY = 'sovereign_os_customization_profile_v1';
let activeCustomizationUserId: string | null = null;
let activeCustomizationIsArchitect = true;

function getActiveStorageKey(): string {
  if (!activeCustomizationUserId) return LEGACY_STORAGE_KEY;
  return `sovereign_os_customization_profile_v2_${activeCustomizationUserId}`;
}

export const DEFAULT_CUSTOMIZATION_PROFILE: SovereignOSCustomizationProfile = {
  themeId: 'aurelius-gold',
  customWallpaperUrl: '',
  wallpaperOpacityPct: 68,
  wallpaperBlurPx: 0,
  accentColor: 'amber',
  windowBlurPx: 18,
  windowOpacityPct: 95,
  windowRadiusPx: 16,
  borderGlowIntensity: 'high',
  iconSize: 'standard',
  fontScalePct: 100,
  showTacticalGrid: true,
  showCrtScanlines: false,
  showDesktopFiles: true,
  hiddenDesktopIcons: [],
  customIconLabels: {},
  customDesktopShortcuts: [],
  desktopIconOrder: [],
  enableGamepadOsNav: true,
  showTouchControllerOverlay: false,
  controllerGlyphStyle: 'auto',
  activeWorkspace: 1,
  workspaceNames: [
    '1: Command & AI',
    '2: Markets & Crypto',
    '3: Root Dev & Files',
    '4: Games & Media'
  ],
  desktopWidgets: {
    showKernelHud: true,
    showMarketTickerHud: true,
    showCryptoVaultHud: true,
    showClipboardHud: false
  },
  notifications: {
    telemetryPopupAlerts: false,
    cryptoTradingAlerts: false,
    telemetryAudioChime: false
  },
  hotkeys: {
    launcher: 'Alt+L',
    splitMode: 'Alt+/',
    tileWindows: 'Alt+T',
    detachChat: 'Alt+C',
    workspace1: 'Alt+1',
    workspace2: 'Alt+2',
    workspace3: 'Alt+3',
    workspace4: 'Alt+4',
    openTerminal: 'Alt+`',
    openWallets: 'Alt+W',
    openMarkets: 'Alt+M',
    openDiagnostics: 'Alt+D'
  },
  customCss: '',
  clipboardHistory: [
    {
      id: 'clip-genesis-1',
      label: 'JHammerZ Provenance & DOI',
      text: 'https://jhammerz.github.io | DOI: https://doi.org/10.5281/zenodo.20778079',
      timestamp: new Date().toISOString(),
      pinned: true
    },
    {
      id: 'clip-genesis-2',
      label: 'Forensic Audit CLI Check',
      text: 'curl -s http://127.0.0.1:3000/api/os/forensic-audit | jq .overallHealthScore',
      timestamp: new Date().toISOString(),
      pinned: true
    }
  ]
};

export const CLEAN_PERSONAL_CUSTOMIZATION_PROFILE: SovereignOSCustomizationProfile = {
  ...DEFAULT_CUSTOMIZATION_PROFILE,
  workspaceNames: [
    '1: Personal Home',
    '2: Build & Projects',
    '3: Chat & Social',
    '4: Play & Media'
  ],
  desktopWidgets: {
    showKernelHud: false,
    showMarketTickerHud: false,
    showCryptoVaultHud: false,
    showClipboardHud: false
  },
  clipboardHistory: []
};

function getBaseDefaultProfile(): SovereignOSCustomizationProfile {
  return activeCustomizationIsArchitect ? DEFAULT_CUSTOMIZATION_PROFILE : CLEAN_PERSONAL_CUSTOMIZATION_PROFILE;
}

export function setActiveCustomizationUserScope(userId: string | null, isArchitect = true): SovereignOSCustomizationProfile {
  activeCustomizationUserId = userId;
  activeCustomizationIsArchitect = isArchitect;
  const loaded = loadOSCustomizationProfile();
  if (typeof window !== 'undefined') {
    applyOSCustomizationToDOM(loaded);
    window.dispatchEvent(new CustomEvent('sovereign_os_customization_changed', { detail: loaded }));
  }
  return loaded;
}

export function loadOSCustomizationProfile(): SovereignOSCustomizationProfile {
  const baseDefault = getBaseDefaultProfile();
  if (typeof window === 'undefined') return baseDefault;
  try {
    const key = getActiveStorageKey();
    const raw = localStorage.getItem(key) ?? (activeCustomizationIsArchitect ? localStorage.getItem(LEGACY_STORAGE_KEY) : null);
    if (!raw) return baseDefault;
    const parsed = JSON.parse(raw);
    return {
      ...baseDefault,
      ...parsed,
      desktopWidgets: {
        ...baseDefault.desktopWidgets,
        ...(parsed.desktopWidgets || {})
      },
      notifications: {
        ...baseDefault.notifications,
        ...(parsed.notifications || {})
      },
      hotkeys: {
        ...baseDefault.hotkeys,
        ...(parsed.hotkeys || {})
      },
      hiddenDesktopIcons: Array.isArray(parsed.hiddenDesktopIcons)
        ? parsed.hiddenDesktopIcons
        : [],
      customIconLabels:
        parsed.customIconLabels && typeof parsed.customIconLabels === 'object'
          ? parsed.customIconLabels
          : {},
      customDesktopShortcuts: Array.isArray(parsed.customDesktopShortcuts)
        ? parsed.customDesktopShortcuts
        : [],
      desktopIconOrder: Array.isArray(parsed.desktopIconOrder)
        ? parsed.desktopIconOrder
        : [],
      workspaceNames:
        Array.isArray(parsed.workspaceNames) && parsed.workspaceNames.length === 4
          ? (parsed.workspaceNames as [string, string, string, string])
          : baseDefault.workspaceNames,
      clipboardHistory: Array.isArray(parsed.clipboardHistory)
        ? parsed.clipboardHistory
        : baseDefault.clipboardHistory
    };
  } catch {
    return baseDefault;
  }
}

export function applyOSCustomizationToDOM(profile: SovereignOSCustomizationProfile): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--sovereign-window-blur', `${profile.windowBlurPx}px`);
  root.style.setProperty('--sovereign-window-opacity', `${(profile.windowOpacityPct / 100).toFixed(2)}`);
  root.style.setProperty('--sovereign-window-radius', `${profile.windowRadiusPx}px`);
  root.style.setProperty('--sovereign-font-scale', `${profile.fontScalePct}%`);

  let styleTag = document.getElementById('sovereign-custom-dotfiles-css') as HTMLStyleElement | null;
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = 'sovereign-custom-dotfiles-css';
    document.head.appendChild(styleTag);
  }
  styleTag.textContent = profile.customCss || '';
}

export function saveOSCustomizationProfile(
  next: Partial<SovereignOSCustomizationProfile>,
  opts: { skipRemoteSync?: boolean } = {}
): SovereignOSCustomizationProfile {
  const current = loadOSCustomizationProfile();
  const merged: SovereignOSCustomizationProfile = {
    ...current,
    ...next,
    desktopWidgets: {
      ...current.desktopWidgets,
      ...(next.desktopWidgets || {})
    },
    notifications: {
      ...current.notifications,
      ...(next.notifications || {})
    },
    hotkeys: {
      ...current.hotkeys,
      ...(next.hotkeys || {})
    },
    customIconLabels: next.customIconLabels ?? current.customIconLabels,
    hiddenDesktopIcons: next.hiddenDesktopIcons ?? current.hiddenDesktopIcons,
    customDesktopShortcuts: next.customDesktopShortcuts ?? current.customDesktopShortcuts,
    desktopIconOrder: next.desktopIconOrder ?? current.desktopIconOrder
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(getActiveStorageKey(), JSON.stringify(merged));
    } catch {}
    applyOSCustomizationToDOM(merged);
    window.dispatchEvent(
      new CustomEvent('sovereign_os_customization_changed', { detail: merged })
    );
    if (!opts.skipRemoteSync) {
      pushContinuitySettingsPatch({ osCustomization: merged });
    }
  }
  return merged;
}

export function hydrateOSCustomizationFromRemote(
  remote: Partial<SovereignOSCustomizationProfile> | null | undefined
): SovereignOSCustomizationProfile {
  if (!remote || typeof remote !== 'object') {
    return loadOSCustomizationProfile();
  }
  return saveOSCustomizationProfile(remote, { skipRemoteSync: true });
}

export function hideDesktopIcon(iconId: string): SovereignOSCustomizationProfile {
  const cur = loadOSCustomizationProfile();
  const set = new Set(cur.hiddenDesktopIcons || []);
  set.add(iconId);
  return saveOSCustomizationProfile({ hiddenDesktopIcons: Array.from(set) });
}

export function restoreDesktopIcon(iconId: string): SovereignOSCustomizationProfile {
  const cur = loadOSCustomizationProfile();
  return saveOSCustomizationProfile({
    hiddenDesktopIcons: (cur.hiddenDesktopIcons || []).filter((id) => id !== iconId)
  });
}

export function restoreAllDesktopIcons(): SovereignOSCustomizationProfile {
  return saveOSCustomizationProfile({ hiddenDesktopIcons: [], customIconLabels: {} });
}

export function renameDesktopIcon(iconId: string, newLabel: string): SovereignOSCustomizationProfile {
  const cur = loadOSCustomizationProfile();
  const nextLabels = { ...(cur.customIconLabels || {}) };
  if (newLabel.trim()) {
    nextLabels[iconId] = newLabel.trim();
  } else {
    delete nextLabels[iconId];
  }
  return saveOSCustomizationProfile({ customIconLabels: nextLabels });
}

export function addCustomDesktopShortcut(
  shortcut: Omit<CustomDesktopShortcut, 'id'> & { id?: string }
): SovereignOSCustomizationProfile {
  const cur = loadOSCustomizationProfile();
  const id = shortcut.id || `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const filtered = (cur.customDesktopShortcuts || []).filter((s) => s.id !== id);
  return saveOSCustomizationProfile({
    customDesktopShortcuts: [...filtered, { ...shortcut, id }]
  });
}

export function removeCustomDesktopShortcut(shortcutId: string): SovereignOSCustomizationProfile {
  const cur = loadOSCustomizationProfile();
  return saveOSCustomizationProfile({
    customDesktopShortcuts: (cur.customDesktopShortcuts || []).filter((s) => s.id !== shortcutId)
  });
}

export function pinSteamGameToDesktop(appId: number, gameName: string): SovereignOSCustomizationProfile {
  return addCustomDesktopShortcut({
    id: `steam-game-${appId}`,
    label: gameName.slice(0, 26),
    subtitle: `Steam #${appId}`,
    kind: 'steam',
    target: String(appId),
    accent: 'text-sky-400',
    badge: 'STEAM'
  });
}

export function importOSCustomizationProfile(rawJson: string): {
  ok: boolean;
  profile?: SovereignOSCustomizationProfile;
  error?: string;
} {
  try {
    const parsed = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, error: 'Invalid JSON profile object.' };
    }
    const saved = saveOSCustomizationProfile(parsed as Partial<SovereignOSCustomizationProfile>);
    return { ok: true, profile: saved };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to parse customization JSON.' };
  }
}

export function pushToOSClipboardRing(text: string, label = 'OS Clipboard'): SovereignOSCustomizationProfile {
  const clean = text.trim();
  if (!clean) return loadOSCustomizationProfile();
  const current = loadOSCustomizationProfile();
  const existing = current.clipboardHistory.filter((c) => c.text !== clean);
  const entry: ClipboardRingEntry = {
    id: `clip-${Date.now().toString(36)}`,
    text: clean,
    label,
    timestamp: new Date().toISOString()
  };
  const updated = [entry, ...existing].slice(0, 24);
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(clean).catch(() => {});
  }
  return saveOSCustomizationProfile({ clipboardHistory: updated });
}

export function getActiveThemeWallpaperStyle(profile: SovereignOSCustomizationProfile): React.CSSProperties {
  if (profile.themeId === 'custom-wallpaper' && profile.customWallpaperUrl.trim()) {
    const darkAlphaTop = Math.max(0.05, Math.min(0.92, (100 - (profile.wallpaperOpacityPct ?? 68)) / 100));
    const darkAlphaBot = Math.min(0.95, darkAlphaTop + 0.18);
    return {
      backgroundImage: `linear-gradient(rgba(5,7,11,${darkAlphaTop.toFixed(2)}), rgba(5,7,11,${darkAlphaBot.toFixed(2)})), url("${profile.customWallpaperUrl.trim()}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    };
  }
  const preset =
    SOVEREIGN_THEME_PRESETS.find((t) => t.id === profile.themeId) ||
    SOVEREIGN_THEME_PRESETS[0];
  return {
    backgroundImage: preset.wallpaperCss
  };
}
