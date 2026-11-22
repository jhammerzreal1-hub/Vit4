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

import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutGrid,
  Columns2,
  X,
  Search,
  ArrowLeftRight,
  Pin,
  Terminal,
  Shield,
  Layers,
  Monitor,
  Archive,
  Grid2x2,
  EyeOff,
  PictureInPicture2,
  PanelLeft,
  Send,
  Globe,
  Folder,
  Settings,
  Cpu,
  Mic,
  Radio,
  Bell,
  BellOff
} from 'lucide-react';
import { ALL_MODULES, WORKSPACE_GROUPS, type WorkspaceGroupId } from './Navigation';
import type { ModuleType, Artifact } from '../types';
import type { OSShellViewMode } from './SovereignOSSettingsModule';
import {
  loadOSCustomizationProfile,
  saveOSCustomizationProfile,
  type SovereignOSCustomizationProfile
} from '../utils/osCustomizationStore';

interface SovereignOSBarProps {
  activeModule: ModuleType;
  openModules: ModuleType[];
  minimizedModules?: ModuleType[];
  pinnedModules: ModuleType[];
  shellViewMode?: OSShellViewMode;
  onChangeShellViewMode?: (mode: OSShellViewMode) => void;
  onSelectModule: (mod: ModuleType) => void;
  onCloseOpenModule: (mod: ModuleType) => void;
  onTogglePinModule: (mod: ModuleType) => void;
  isSplitMode: boolean;
  secondaryModule: ModuleType;
  splitRatio: '50-50' | '60-40';
  onToggleSplitMode: (force?: boolean) => void;
  onSetSecondaryModule: (mod: ModuleType) => void;
  onSwapSplitPanes: () => void;
  onToggleSplitRatio: () => void;
  onLaunchSplitPreset: (primary: ModuleType, secondary: ModuleType) => void;
  onTileWindows?: () => void;
  onCascadeWindows?: () => void;
  onMinimizeAllWindows?: () => void;
  isChatDetached?: boolean;
  onToggleDetachChat?: () => void;
  persistentTalkActive?: boolean;
  persistentTalkSpeaking?: boolean;
  onTogglePersistentTalk?: () => void;
  onInjectToChat?: (content: string, immediate?: boolean) => void;
  showDesktopSidebar?: boolean;
  onToggleDesktopSidebar?: () => void;
  isLauncherOpen: boolean;
  onSetLauncherOpen: (open: boolean) => void;
  artifacts: Artifact[];
  variant?: 'top' | 'bottom-windows';
}

export const SovereignOSBar: React.FC<SovereignOSBarProps> = ({
  activeModule,
  openModules,
  minimizedModules = [],
  pinnedModules,
  shellViewMode = 'desktop',
  onChangeShellViewMode,
  onSelectModule,
  onCloseOpenModule,
  onTogglePinModule,
  isSplitMode,
  secondaryModule,
  splitRatio,
  onToggleSplitMode,
  onSetSecondaryModule,
  onSwapSplitPanes,
  onToggleSplitRatio,
  onLaunchSplitPreset,
  onTileWindows,
  onCascadeWindows,
  onMinimizeAllWindows,
  isChatDetached = false,
  onToggleDetachChat,
  persistentTalkActive = false,
  persistentTalkSpeaking = false,
  onTogglePersistentTalk,
  onInjectToChat,
  showDesktopSidebar = false,
  onToggleDesktopSidebar,
  isLauncherOpen,
  onSetLauncherOpen,
  artifacts,
  variant = 'top'
}) => {
  const [launcherSearch, setLauncherSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<'all' | WorkspaceGroupId>('all');
  const [alertsMenuOpen, setAlertsMenuOpen] = useState(false);
  const [nowClock, setNowClock] = useState<Date>(() => new Date());
  const [customProfile, setCustomProfile] = useState<SovereignOSCustomizationProfile>(() =>
    loadOSCustomizationProfile()
  );

  useEffect(() => {
    const t = setInterval(() => setNowClock(new Date()), 15000);
    const onCustom = (e: Event) => {
      const ce = e as CustomEvent<SovereignOSCustomizationProfile>;
      if (ce.detail) setCustomProfile(ce.detail);
    };
    window.addEventListener('sovereign_os_customization_changed', onCustom);
    return () => {
      clearInterval(t);
      window.removeEventListener('sovereign_os_customization_changed', onCustom);
    };
  }, []);

  useEffect(() => {
    if (!isLauncherOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onSetLauncherOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isLauncherOpen, onSetLauncherOpen]);

  const moduleMap = useMemo(() => {
    const m = new Map<ModuleType, (typeof ALL_MODULES)[number]>();
    for (const item of ALL_MODULES) {
      m.set(item.id, item);
    }
    return m;
  }, []);

  const filteredModules = useMemo(() => {
    const q = launcherSearch.trim().toLowerCase();
    return ALL_MODULES.filter((m) => {
      const groupOk = selectedGroup === 'all' || m.group === selectedGroup;
      if (!groupOk) return false;
      if (!q) return true;
      return (
        m.label.toLowerCase().includes(q) ||
        (m.shortLabel && m.shortLabel.toLowerCase().includes(q)) ||
        m.description.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q)
      );
    });
  }, [launcherSearch, selectedGroup]);

  const handleSmartStartSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = launcherSearch.trim();
    if (!q) return;
    if (/^https?:\/\//i.test(q) || /^[a-z0-9-]+\.[a-z]{2,}/i.test(q)) {
      window.dispatchEvent(new CustomEvent('sovereign_os_command', {
        detail: { action: 'browser_navigate', targetModule: 'browser', url: q }
      }));
      onSetLauncherOpen(false);
      return;
    }
    if (q.startsWith('$ ') || q.startsWith('> ')) {
      const cmd = q.slice(2).trim();
      if (cmd) {
        onSelectModule('terminal');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('sovereign_os_command', {
            detail: { action: 'terminal_exec', targetModule: 'terminal', command: cmd }
          }));
        }, 80);
        onSetLauncherOpen(false);
        return;
      }
    }
    if (filteredModules.length > 0 && (filteredModules.length === 1 || q.startsWith('/'))) {
      onSelectModule(filteredModules[0].id);
      onSetLauncherOpen(false);
      return;
    }
    if (onInjectToChat) {
      onInjectToChat(q, true);
      onSetLauncherOpen(false);
    }
  };

  const isBottomWindows = variant === 'bottom-windows';
  const taskbarModules = useMemo(() => {
    const set = new Set<ModuleType>(openModules);
    if (isBottomWindows) {
      for (const p of pinnedModules.slice(0, 6)) set.add(p);
    }
    return Array.from(set);
  }, [openModules, pinnedModules, isBottomWindows]);

  const formattedTime = nowClock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formattedDate = nowClock.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <>
      {/* SOVEREIGN OS WINDOW TASKBAR STRIP */}
      <div
        className={`${
          isBottomWindows
            ? 'min-h-11 pb-safe-nav bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/90 px-2 sm:px-3 z-30'
            : 'h-9 bg-zinc-950/95 border-b border-zinc-800/80 px-2 sm:px-3 z-20'
        } flex items-center justify-between gap-1.5 sm:gap-2 shrink-0 select-none`}
      >
        {/* Left: Start / OS Apps Button + Running & Pinned Taskbar Icons */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => onSetLauncherOpen(!isLauncherOpen)}
            className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              isLauncherOpen
                ? 'bg-sky-500/20 border-sky-400/60 text-sky-200'
                : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700/80 hover:border-amber-500/40 text-zinc-100'
            }`}
            title="Open Sovereign OS Start Menu & App Launcher (Alt+L)"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>{isBottomWindows ? 'Start' : 'OS Apps'}</span>
          </button>

          {onToggleDesktopSidebar && isBottomWindows && (
            <button
              type="button"
              onClick={onToggleDesktopSidebar}
              className={`hidden lg:flex px-2 py-1.5 rounded-lg border text-[11px] font-medium items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                showDesktopSidebar
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                  : 'bg-zinc-900/70 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-zinc-100'
              }`}
              title="Toggle Classic Sidebar Rail"
            >
              <PanelLeft className="w-3.5 h-3.5" />
            </button>
          )}

          {onToggleDetachChat && (
            <button
              type="button"
              onClick={onToggleDetachChat}
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                isChatDetached
                  ? 'bg-amber-500/20 border-amber-400/60 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                  : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-amber-300'
              }`}
              title={isChatDetached ? 'Re-Dock Orchestrator Chat' : 'Detach Chat as Always-On-Top Floating PiP (Navigate OS Freely)'}
            >
              <PictureInPicture2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">{isChatDetached ? 'Chat Detached' : 'Detach Chat'}</span>
            </button>
          )}

          {onTogglePersistentTalk && (
            <button
              type="button"
              onClick={onTogglePersistentTalk}
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                persistentTalkSpeaking
                  ? 'bg-sky-500/25 border-sky-400/70 text-sky-100'
                  : persistentTalkActive
                  ? 'bg-emerald-500/20 border-emerald-400/65 text-emerald-200'
                  : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 hover:border-emerald-500/40 text-emerald-300'
              }`}
              title={
                persistentTalkActive
                  ? 'Persistent Voice Chat Active (Click to End)'
                  : 'Start Unified Persistent Hands-Free Voice Chat Across All Windows'
              }
            >
              {persistentTalkActive ? (
                <Radio className={`w-3.5 h-3.5 shrink-0 ${persistentTalkSpeaking ? 'text-sky-300' : 'text-emerald-400'}`} />
              ) : (
                <Mic className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}
              <span className="hidden sm:inline">
                {persistentTalkSpeaking ? 'Voice Speaking' : persistentTalkActive ? 'Voice Live' : 'Voice Chat'}
              </span>
            </button>
          )}

          <div className="h-4 w-px bg-zinc-800 shrink-0" />

          {/* Multi-Workspace Virtual Desktops Switcher (WS 1-4) */}
          <div
            className="hidden sm:flex items-center gap-0.5 bg-zinc-900/90 border border-zinc-800 rounded-lg p-0.5 shrink-0"
            title="Virtual Desktops (Alt+1..4)"
          >
            {([1, 2, 3, 4] as const).map((wsNum, idx) => {
              const isWsActive = customProfile.activeWorkspace === wsNum;
              return (
                <button
                  key={wsNum}
                  type="button"
                  onClick={() => {
                    const next = saveOSCustomizationProfile({ activeWorkspace: wsNum });
                    setCustomProfile(next);
                  }}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition-all ${
                    isWsActive
                      ? 'bg-amber-500 text-zinc-950 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                  }`}
                  title={`Virtual Desktop ${wsNum}: ${customProfile.workspaceNames[idx]}`}
                >
                  {wsNum}
                </button>
              );
            })}
          </div>

          <div className="h-4 w-px bg-zinc-800 shrink-0 hidden sm:block" />

          {/* Running & Pinned Taskbar Windows */}
          <div className="flex items-center gap-1 min-w-0">
            {taskbarModules.map((modId) => {
              const meta = moduleMap.get(modId);
              if (!meta) return null;
              const Icon = meta.icon;
              const isOpen = openModules.includes(modId);
              const isMinimized = shellViewMode === 'desktop' && minimizedModules.includes(modId);
              const isPrimary = activeModule === modId && isOpen && !isMinimized;
              const isSecondary = shellViewMode === 'workspace' && isSplitMode && secondaryModule === modId;

              return (
                <div
                  key={modId}
                  onClick={() => onSelectModule(modId)}
                  className={`relative group flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-lg text-[11px] cursor-pointer whitespace-nowrap shrink-0 border transition-colors ${
                    isPrimary
                      ? 'bg-zinc-800/95 border-amber-500/50 text-zinc-100 font-semibold shadow-sm'
                      : isSecondary
                      ? 'bg-zinc-900 border-sky-500/40 text-sky-200 font-medium'
                      : isOpen && !isMinimized
                      ? 'bg-zinc-900/90 border-zinc-700/80 text-zinc-200 hover:bg-zinc-800'
                      : isOpen && isMinimized
                      ? 'bg-zinc-950 border-zinc-800/70 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                      : 'bg-transparent border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  }`}
                  title={
                    !isOpen
                      ? `Launch ${meta.label}`
                      : isMinimized
                      ? `Restore ${meta.label}`
                      : `Focus ${meta.label}`
                  }
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${meta.accentColor} ${isMinimized ? 'opacity-65' : ''}`} />
                  <span className="max-w-[115px] truncate">{meta.shortLabel || meta.label}</span>
                  {shellViewMode === 'workspace' && isSplitMode && (isPrimary || isSecondary) && (
                    <span
                      className={`text-[9px] font-mono px-1 rounded ${
                        isPrimary ? 'bg-amber-500/20 text-amber-300' : 'bg-sky-500/20 text-sky-300'
                      }`}
                    >
                      {isPrimary ? 'L' : 'R'}
                    </span>
                  )}
                  {isOpen && (openModules.length > 1 || shellViewMode === 'desktop') && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseOpenModule(modId);
                      }}
                      aria-label={`Close ${meta.label} window`}
                      className="ml-1.5 p-1 rounded-md opacity-60 group-hover:opacity-100 hover:bg-rose-500/25 text-zinc-400 hover:text-rose-300 transition-colors cursor-pointer"
                      title="Close window"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  {/* Active / Running Taskbar Bottom Indicator Bar */}
                  {isOpen && (
                    <span
                      className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] rounded-full transition-all ${
                        isPrimary
                          ? 'w-6 bg-amber-400'
                          : isMinimized
                          ? 'w-2 bg-zinc-500'
                          : 'w-3.5 bg-sky-400/80'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Shell Mode Switch + Window Manager + System Tray Clock & Show Desktop Sliver */}
        <div className="flex items-center gap-1.5 shrink-0">
          {!isBottomWindows && !openModules.includes('terminal') && (
            <button
              type="button"
              onClick={() => onSelectModule('terminal')}
              className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-mono text-emerald-300 whitespace-nowrap cursor-pointer"
              title="Open Root Terminal"
            >
              <Terminal className="w-3 h-3" />
              <span>Shell</span>
            </button>
          )}
          {!isBottomWindows && activeModule !== 'browser' && (
            <button
              type="button"
              onClick={() => onSelectModule('browser')}
              className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-mono text-sky-300 whitespace-nowrap cursor-pointer"
              title="Open Sovereign Google Chrome (Alt+B)"
            >
              <span>Chrome</span>
            </button>
          )}

          {onChangeShellViewMode && shellViewMode === 'workspace' && (
            <button
              type="button"
              onClick={() => onChangeShellViewMode('desktop')}
              className="lg:hidden flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/15 border border-amber-500/40 text-[10px] font-semibold text-amber-300 cursor-pointer whitespace-nowrap"
              title="Switch to Sovereign OS Desktop"
            >
              <Monitor className="w-3 h-3" />
              <span>OS Desktop</span>
            </button>
          )}

          {/* Desktop OS Window Manager Controls (Desktop lg+) */}
          <div className="hidden lg:flex items-center gap-1">
            {onChangeShellViewMode && (
              <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-md p-0.5">
                <button
                  type="button"
                  onClick={() => onChangeShellViewMode('desktop')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                    shellViewMode === 'desktop'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                  title="Multi-Window Floating Desktop OS"
                >
                  <Monitor className="w-3 h-3" />
                  <span>Desktop</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChangeShellViewMode('workspace')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                    shellViewMode === 'workspace'
                      ? 'bg-sky-500/20 text-sky-300'
                      : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                  title="Full / Split Workspace Mode"
                >
                  <Columns2 className="w-3 h-3" />
                  <span>Workspace</span>
                </button>
              </div>
            )}

            {shellViewMode === 'desktop' ? (
              <>
                {onTileWindows && (
                  <button
                    type="button"
                    onClick={onTileWindows}
                    className="px-2 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-300 flex items-center gap-1 cursor-pointer"
                    title="Tile Open Windows"
                  >
                    <Grid2x2 className="w-3 h-3 text-sky-400" />
                    <span>Tile</span>
                  </button>
                )}
                {onCascadeWindows && (
                  <button
                    type="button"
                    onClick={onCascadeWindows}
                    className="px-2 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-300 flex items-center gap-1 cursor-pointer"
                    title="Cascade Open Windows"
                  >
                    <Layers className="w-3 h-3 text-amber-400" />
                    <span>Cascade</span>
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onToggleSplitMode()}
                  className={`px-2 py-1 rounded-md border text-[11px] font-medium flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                    isSplitMode
                      ? 'bg-sky-500/15 border-sky-500/40 text-sky-200'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                  }`}
                  title="Toggle Dual-Pane Split Desktop (Alt+/)"
                >
                  <Columns2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>{isSplitMode ? 'Split On' : 'Split View'}</span>
                </button>

                {isSplitMode && (
                  <>
                    <select
                      value={secondaryModule}
                      onChange={(e) => onSetSecondaryModule(e.target.value as ModuleType)}
                      aria-label="Right Split Pane App"
                      className="bg-zinc-900 border border-zinc-700 rounded-md px-2 py-1 text-[11px] text-zinc-200 focus:outline-none focus:border-sky-500 max-w-[140px]"
                    >
                      {ALL_MODULES.filter((m) => m.id !== activeModule).map((m) => (
                        <option key={m.id} value={m.id}>
                          Right: {m.shortLabel || m.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={onSwapSplitPanes}
                      className="p-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 cursor-pointer"
                      title="Swap Left & Right Windows"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={onToggleSplitRatio}
                      className="px-2 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-mono text-zinc-300 cursor-pointer whitespace-nowrap"
                      title="Toggle Split Ratio"
                    >
                      {splitRatio === '50-50' ? '50/50' : '60/40'}
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleSplitMode(false)}
                      aria-label="Exit Split Screen"
                      className="p-1 rounded-md bg-zinc-900 hover:bg-rose-500/20 border border-zinc-800 text-zinc-400 hover:text-rose-300 cursor-pointer"
                      title="Close Split View"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </>
            )}
          </div>

          <div className="hidden xl:flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-900/70 border border-zinc-800/80 text-[10px] font-mono text-amber-300 whitespace-nowrap">
            <Shield className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>UID 0 · Ring -3 OS</span>
          </div>

          {/* Unobtrusive Alerts Tray Popover (Telemetry & Crypto Alerts OFF by default) */}
          {(() => {
            const notif = customProfile.notifications;
            const anyAlertsOn = Boolean(
              notif?.telemetryPopupAlerts || notif?.cryptoTradingAlerts || notif?.telemetryAudioChime
            );
            const toggleNotif = (key: 'telemetryPopupAlerts' | 'cryptoTradingAlerts' | 'telemetryAudioChime') => {
              const next = saveOSCustomizationProfile({
                notifications: {
                  ...notif,
                  [key]: !notif[key]
                }
              });
              setCustomProfile(next);
            };
            return (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAlertsMenuOpen((v) => !v)}
                  className={`h-8 px-2 rounded-lg border text-[10px] font-medium flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                    anyAlertsOn
                      ? 'bg-amber-500/15 border-amber-500/45 text-amber-200'
                      : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                  title={
                    anyAlertsOn
                      ? 'Telemetry or crypto alerts enabled — click to manage'
                      : 'Telemetry & crypto notifications are silenced (OFF) — click to configure'
                  }
                >
                  {anyAlertsOn ? <Bell className="w-3.5 h-3.5 text-amber-400" /> : <BellOff className="w-3.5 h-3.5" />}
                  <span className="hidden md:inline">{anyAlertsOn ? 'Alerts On' : 'Alerts Off'}</span>
                </button>

                {alertsMenuOpen && (
                  <div
                    className={`absolute right-0 ${
                      isBottomWindows ? 'bottom-11' : 'top-10'
                    } w-64 p-3 rounded-xl bg-zinc-950/95 border border-zinc-700/90 shadow-2xl backdrop-blur-xl z-50 space-y-2.5 text-xs`}
                  >
                    <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800">
                      <span className="font-semibold text-zinc-100">Notifications</span>
                      <button
                        type="button"
                        onClick={() => setAlertsMenuOpen(false)}
                        className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 cursor-pointer"
                        aria-label="Close notifications menu"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-snug">
                      Telemetry and crypto alerts stay off unless explicitly turned on.
                    </p>
                    <div className="space-y-1.5">
                      {[
                        { key: 'telemetryPopupAlerts' as const, label: 'Telemetry 5m Popups' },
                        { key: 'cryptoTradingAlerts' as const, label: 'Crypto Trade Alerts' },
                        { key: 'telemetryAudioChime' as const, label: 'Signal Audio Chime' }
                      ].map((row) => {
                        const on = Boolean(notif?.[row.key]);
                        return (
                          <button
                            key={row.key}
                            type="button"
                            onClick={() => toggleNotif(row.key)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-between text-left cursor-pointer"
                          >
                            <span className="text-[11px] text-zinc-200">{row.label}</span>
                            <span
                              className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                                on ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-800 text-zinc-400'
                              }`}
                            >
                              {on ? 'ON' : 'OFF'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {isBottomWindows && (
            <>
              <div className="hidden md:flex flex-col items-end leading-tight px-1.5 text-[10px] font-mono text-zinc-300 tabular-nums">
                <span>{formattedTime}</span>
                <span className="text-[9px] text-zinc-500">{formattedDate}</span>
              </div>
              {onMinimizeAllWindows && (
                <button
                  type="button"
                  onClick={onMinimizeAllWindows}
                  className="h-8 px-2 sm:w-7 sm:px-0 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-amber-300 flex items-center justify-center gap-1 text-[10px] font-semibold transition-all cursor-pointer"
                  title="Show Desktop (Minimize All Windows)"
                  aria-label="Show Desktop"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span className="sm:hidden">Desktop</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* WINDOWS-STYLE START MENU & SOVEREIGN OS APP LAUNCHER MODAL */}
      {isLauncherOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) onSetLauncherOpen(false);
          }}
          className={`fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex p-2.5 sm:p-4 ${
            isBottomWindows ? 'items-end justify-start pb-14' : 'items-center justify-center'
          }`}
        >
          <div className="bg-zinc-950/95 border border-zinc-700/90 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[86dvh] flex flex-col overflow-hidden">
            {/* Start Menu Top Bar */}
            <div className="px-4 py-3 bg-zinc-900/90 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <Monitor className="w-5 h-5 text-sky-400 shrink-0" />
                <div>
                  <h2 className="text-sm font-bold text-zinc-100">
                    Lysander Sovereign OS — Start Menu & App Launcher
                  </h2>
                  <p className="text-[11px] font-mono text-zinc-400">
                    UID 0 · Ring -3 Bare-Metal Hypervisor · {ALL_MODULES.length} Subsystems Online
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onToggleDetachChat && (
                  <button
                    type="button"
                    onClick={() => {
                      onToggleDetachChat();
                      onSetLauncherOpen(false);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border cursor-pointer ${
                      isChatDetached
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                        : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-amber-300'
                    }`}
                  >
                    <PictureInPicture2 className="w-3.5 h-3.5" />
                    <span>{isChatDetached ? 'Re-Dock Chat' : 'Detach Floating Chat'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onSetLauncherOpen(false)}
                  aria-label="Close Start Menu"
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Smart Search / Ask Orchestrator / Launch URL or Command */}
            <div className="p-3 sm:p-4 border-b border-zinc-800/80 space-y-3 shrink-0 bg-zinc-950">
              <form onSubmit={handleSmartStartSubmit} className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <div className="relative flex-1 flex items-center">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={launcherSearch}
                    onChange={(e) => setLauncherSearch(e.target.value)}
                    placeholder={`Search ${ALL_MODULES.length} apps, type a URL, "$ shell cmd", or ask Orchestrator AI...`}
                    autoFocus
                    className="w-full bg-zinc-900 border border-zinc-700 focus:border-sky-500 rounded-xl pl-9 pr-24 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
                  />
                  {launcherSearch.trim() && onInjectToChat && (
                    <button
                      type="button"
                      onClick={() => {
                        onInjectToChat(launcherSearch.trim(), true);
                        onSetLauncherOpen(false);
                      }}
                      className="absolute right-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-[10px] font-semibold text-amber-200 flex items-center gap-1 cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      <span>Ask AI</span>
                    </button>
                  )}
                </div>

                {/* Group Filter Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setSelectedGroup('all')}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap cursor-pointer ${
                      selectedGroup === 'all'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                    }`}
                  >
                    All ({ALL_MODULES.length})
                  </button>
                  {WORKSPACE_GROUPS.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setSelectedGroup(g.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap cursor-pointer ${
                        selectedGroup === g.id
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </form>

              {/* Quick System Shortcuts & Split Presets */}
              <div className="hidden lg:flex items-center gap-2 overflow-x-auto scrollbar-none pt-1">
                <span className="text-[10px] font-mono uppercase text-zinc-500 shrink-0 flex items-center gap-1">
                  <Columns2 className="w-3 h-3 text-sky-400" />
                  <span>Quick Layouts:</span>
                </span>
                {[
                  { label: 'Chat + Google Chrome', left: 'chat' as ModuleType, right: 'browser' as ModuleType },
                  { label: 'Root Shell + Sovereign Files', left: 'terminal' as ModuleType, right: 'file-manager' as ModuleType },
                  { label: 'Macro Telemetry + Chrome', left: 'macro-telemetry' as ModuleType, right: 'browser' as ModuleType },
                  { label: 'AI Distillery + Chat', left: 'ai-genesis-distillery' as ModuleType, right: 'chat' as ModuleType },
                  { label: 'Batch Queue + Chat', left: 'batch-processor' as ModuleType, right: 'chat' as ModuleType },
                  { label: 'Activity Monitor + OS Settings', left: 'task-manager' as ModuleType, right: 'os-settings' as ModuleType }
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      onLaunchSplitPreset(preset.left, preset.right);
                      onSetLauncherOpen(false);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-sky-500/40 text-[11px] text-zinc-200 whitespace-nowrap cursor-pointer shrink-0"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pinned Apps + Full Subsystem Grid */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-5">
              {pinnedModules.length > 0 && !launcherSearch.trim() && selectedGroup === 'all' && (
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
                    <Pin className="w-3 h-3 text-amber-400" />
                    <span>Pinned OS Start Apps</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {pinnedModules.map((id) => {
                      const m = moduleMap.get(id);
                      if (!m) return null;
                      const Icon = m.icon;
                      return (
                        <button
                          key={`pin-${id}`}
                          type="button"
                          onClick={() => {
                            onSelectModule(id);
                            onSetLauncherOpen(false);
                          }}
                          className="p-2.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/40 flex flex-col items-start gap-1.5 text-left cursor-pointer transition-colors"
                        >
                          <Icon className={`w-4 h-4 ${m.accentColor}`} />
                          <span className="text-xs font-semibold text-zinc-100 truncate w-full">
                            {m.shortLabel || m.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-sky-400" />
                  <span>All OS Applications ({filteredModules.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {filteredModules.map((m) => {
                    const Icon = m.icon;
                    const isPinned = pinnedModules.includes(m.id);
                    const isActive = activeModule === m.id;
                    return (
                      <div
                        key={m.id}
                        className={`p-3 rounded-xl border flex flex-col justify-between gap-2 transition-colors ${
                          isActive
                            ? 'bg-zinc-900 border-amber-500/40'
                            : 'bg-zinc-900/60 border-zinc-800/90 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectModule(m.id);
                              onSetLauncherOpen(false);
                            }}
                            className="flex items-start gap-2.5 text-left flex-1 min-w-0 cursor-pointer"
                          >
                            <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 shrink-0">
                              <Icon className={`w-4 h-4 ${m.accentColor}`} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-zinc-100 truncate">
                                {m.label}
                              </div>
                              <div className="text-[11px] text-zinc-400 line-clamp-2 mt-0.5 leading-snug">
                                {m.description}
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => onTogglePinModule(m.id)}
                            className={`p-1 rounded hover:bg-zinc-800 shrink-0 cursor-pointer ${
                              isPinned ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                            title={isPinned ? 'Unpin from Start & Taskbar' : 'Pin to Start & Taskbar'}
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-800/60 text-[10px]">
                          <span className="font-mono uppercase text-zinc-500">{m.group}</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                onSelectModule(m.id);
                                onSetLauncherOpen(false);
                              }}
                              className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold cursor-pointer"
                            >
                              Launch
                            </button>
                            {m.id !== activeModule && (
                              <button
                                type="button"
                                onClick={() => {
                                  onSetSecondaryModule(m.id);
                                  onToggleSplitMode(true);
                                  onSetLauncherOpen(false);
                                }}
                                className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 font-semibold cursor-pointer"
                              >
                                <Columns2 className="w-3 h-3" />
                                <span>Split</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {artifacts.length > 0 && (
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
                    <Archive className="w-3 h-3 text-emerald-400" />
                    <span>Recent Sovereign Vault Files ({artifacts.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {artifacts.slice(0, 3).map((art) => (
                      <button
                        key={art.id}
                        type="button"
                        onClick={() => {
                          onSelectModule('vault');
                          onSetLauncherOpen(false);
                        }}
                        className="p-2.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 text-left cursor-pointer"
                      >
                        <div className="text-xs font-semibold text-zinc-200 truncate">{art.title}</div>
                        <div className="text-[10px] font-mono text-zinc-500 mt-0.5 truncate">
                          {art.type} · {art.model}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Start Menu Windows-Style Footer */}
            <div className="px-4 py-2.5 bg-zinc-900/95 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-[11px] shrink-0">
              <div className="flex items-center gap-2 font-mono text-zinc-300">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>UID 0 · Ring -3 Bare-Metal Hypervisor</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    onSelectModule('file-manager');
                    onSetLauncherOpen(false);
                  }}
                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 flex items-center gap-1 cursor-pointer"
                >
                  <Folder className="w-3 h-3" />
                  <span>Files</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelectModule('browser');
                    onSetLauncherOpen(false);
                  }}
                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-sky-300 flex items-center gap-1 cursor-pointer"
                >
                  <Globe className="w-3 h-3" />
                  <span>Chrome</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelectModule('terminal');
                    onSetLauncherOpen(false);
                  }}
                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-emerald-300 flex items-center gap-1 cursor-pointer"
                >
                  <Terminal className="w-3 h-3" />
                  <span>Shell</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelectModule('task-manager');
                    onSetLauncherOpen(false);
                  }}
                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-cyan-300 flex items-center gap-1 cursor-pointer"
                >
                  <Cpu className="w-3 h-3" />
                  <span>Tasks</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelectModule('os-settings');
                    onSetLauncherOpen(false);
                  }}
                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center gap-1 cursor-pointer"
                >
                  <Settings className="w-3 h-3" />
                  <span>Settings</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
