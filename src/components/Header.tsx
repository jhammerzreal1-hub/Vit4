/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 * (TWENTY 47 PROTOCOL - GENESIS NODE / LYSANDER CORE EULA / H-FID Forensic License v1.1).
 * Zenodo DOI: https://doi.org/10.5281/zenodo.20778079 | ORCID: https://orcid.org/0009-0004-5273-7028
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Shield,
  LogIn,
  LogOut,
  Cpu,
  Search,
  Terminal,
  Users,
  Key,
  ChevronDown,
  FolderGit2,
  ShieldCheck,
  BookOpen,
  Menu,
  Activity,
  Wrench,
  FlaskConical,
  Cloud,
  CloudOff,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  X,
  Scale,
  Copy,
  Download,
  Sliders
} from 'lucide-react';
import { auth, googleProvider, signInWithPopup, signOut, measureFirestoreLatency, type User } from '../firebase';
import { SystemManualModal } from './SystemManualModal';
import { PWAInstallButton } from './PWAInstallButton';
import { HardwarePermissionsPanel } from './HardwarePermissionsPanel';
import { getModuleMeta } from './Navigation';
import {
  JHAMMERZ_MIT_AND_HFID_HEADER,
  JHAMMERZ_TWENTY47_GENESIS_LICENSE,
  JHAMMERZ_COMMERCIAL_EULA,
  JHAMMERZ_HFID_FORENSIC_LICENSE,
  JHAMMERZ_COMBINED_FULL_LICENSE
} from '../constants/jhammerzLicense';
import type { ModuleType } from '../types';
import type { AuthUserPublic } from '../types/auth';

export interface ConnectedAccount {
  email: string;
  role: string;
  clearance: string;
  status: string;
  badgeColor: string;
}

export const FEDERATED_ACCOUNTS: ConnectedAccount[] = [
  {
    email: 'joshualhamilton17@gmail.com',
    role: 'Master Architect & Genesis Owner',
    clearance: 'Root UID 0 (Genesis Sovereign)',
    status: 'LINKED & VERIFIED',
    badgeColor: 'border-amber-500/40 bg-amber-500/10 text-amber-300'
  },
  {
    email: 'JHammerZreal@gmail.com',
    role: 'Executive Sovereign & Lead Engineer',
    clearance: 'God Token Level 5 (Orchestrator Apex)',
    status: 'LINKED & VERIFIED',
    badgeColor: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
  },
  {
    email: 'jhammerztemp@gmail.com',
    role: 'Operational Session Identity',
    clearance: 'Standard Session Layer',
    status: 'ACTIVE RUNTIME',
    badgeColor: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
  }
];

interface HeaderProps {
  user: User | null;
  authUser?: AuthUserPublic | null;
  onOpenAuth?: () => void;
  onOpenUserPrivileges?: () => void;
  onLogoutAccount?: () => void;
  firebaseOnline: boolean;
  onOpenCommandPalette?: () => void;
  devMode?: boolean;
  onToggleDevMode?: () => void;
  onSelectModule?: (module: ModuleType) => void;
  activeModule?: ModuleType;
  activeAccountEmail?: string;
  onSwitchAccountEmail?: (email: string) => void;
  onToggleMobileNav?: () => void;
  isTelemetryOpen?: boolean;
  onToggleTelemetry?: () => void;
  compactOsTopBar?: boolean;
  onShowDesktop?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  authUser = null,
  onOpenAuth,
  onOpenUserPrivileges,
  onLogoutAccount,
  firebaseOnline,
  onOpenCommandPalette,
  devMode = true,
  onToggleDevMode,
  onSelectModule,
  activeModule = 'chat',
  activeAccountEmail = 'joshualhamilton17@gmail.com',
  onSwitchAccountEmail,
  onToggleMobileNav,
  isTelemetryOpen = false,
  onToggleTelemetry,
  compactOsTopBar = false,
  onShowDesktop
}) => {
  const [authLoading, setAuthLoading] = useState(false);
  const [showAccountsModal, setShowAccountsModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [activeLicenseTab, setActiveLicenseTab] = useState<'all' | 'mit' | 'twenty47' | 'eula' | 'hfid'>('all');
  const [licenseCopied, setLicenseCopied] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showHardwarePopover, setShowHardwarePopover] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [activePort, setActivePort] = useState<number>(3000);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'pending' | 'conflict'>('synced');
  const [latency, setLatency] = useState<number | null>(null);
  const [pendingWritesCount, setPendingWritesCount] = useState<number>(0);
  const [showSyncPopover, setShowSyncPopover] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const syncPopoverRef = useRef<HTMLDivElement>(null);
  const hardwarePopoverRef = useRef<HTMLDivElement>(null);

  const activeMeta = getModuleMeta(activeModule);
  const ActiveModuleIcon = activeMeta.icon;

  useEffect(() => {
    const checkPort = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          if (data?.port) setActivePort(data.port);
        }
      } catch (_) {}
    };
    checkPort();
    const interval = setInterval(checkPort, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const checkSync = async () => {
      if (!navigator.onLine) {
        if (isMounted) {
          setSyncStatus('offline');
          setPendingWritesCount(0);
        }
        return;
      }
      try {
        const res = await measureFirestoreLatency();
        if (!isMounted) return;
        if (res.connected) {
          setLatency(res.latencyMs);
          setSyncStatus('synced');
          setPendingWritesCount(0);
        } else if (!firebaseOnline) {
          setSyncStatus('offline');
          setPendingWritesCount(0);
        } else {
          setSyncStatus('pending');
          setPendingWritesCount(1);
        }
      } catch (_) {
        if (isMounted) {
          setSyncStatus(navigator.onLine ? 'synced' : 'offline');
          setPendingWritesCount(0);
        }
      }
    };

    checkSync();
    const interval = setInterval(checkSync, 12000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [firebaseOnline]);

  useEffect(() => {
    const handleOpenManual = () => setShowManualModal(true);
    const handleOpenLicense = () => setShowLicenseModal(true);
    window.addEventListener('open-system-manual', handleOpenManual);
    window.addEventListener('open-jhammerz-license', handleOpenLicense);
    return () => {
      window.removeEventListener('open-system-manual', handleOpenManual);
      window.removeEventListener('open-jhammerz-license', handleOpenLicense);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowAccountMenu(false);
      }
      if (syncPopoverRef.current && !syncPopoverRef.current.contains(e.target as Node)) {
        setShowSyncPopover(false);
      }
      if (hardwarePopoverRef.current && !hardwarePopoverRef.current.contains(e.target as Node)) {
        setShowHardwarePopover(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAccountMenu(false);
        setShowSyncPopover(false);
        setShowHardwarePopover(false);
        setShowAccountsModal(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleGoogleSignIn = async () => {
    if (onOpenAuth) {
      setShowAccountMenu(false);
      onOpenAuth();
      return;
    }
    try {
      setAuthLoading(true);
      await signInWithPopup(auth, googleProvider);
      setShowAccountMenu(false);
    } catch (err: any) {
      console.warn('Google sign-in popup note:', err?.message || err);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setShowAccountMenu(false);
      if (onLogoutAccount) {
        onLogoutAccount();
      } else {
        await signOut(auth);
      }
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const canManageUsers = Boolean(authUser && (authUser.role === 'admin' || authUser.privileges?.canManageUsers));
  const accountShortName = authUser?.displayName || authUser?.username || user?.displayName || activeAccountEmail.split('@')[0];

  return (
    <header
      className={`${
        compactOsTopBar
          ? 'min-h-8 pt-safe px-safe shrink-0 border-b border-zinc-800/75 bg-zinc-950/90 backdrop-blur-xl px-2.5 sm:px-3.5 z-40'
          : 'min-h-12 sm:min-h-14 pt-safe px-safe shrink-0 border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-xl px-2.5 sm:px-4 z-40'
      }`}
    >
      <div
        className={`w-full flex items-center justify-between gap-1.5 sm:gap-3 ${
          compactOsTopBar ? 'h-8' : 'h-12 sm:h-14'
        }`}
      >
        {/* Left: Brand + Show Desktop Trigger + Active App Indicator */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          {!compactOsTopBar && onToggleMobileNav && (
            <button
              type="button"
              onClick={onToggleMobileNav}
              className="lg:hidden p-1.5 sm:p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer shrink-0"
              aria-label="Open workspace navigation"
              title="Open Workspace Navigation"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => (compactOsTopBar && onShowDesktop ? onShowDesktop() : onSelectModule?.('chat'))}
            className="flex items-center gap-1.5 sm:gap-2 min-w-0 text-left cursor-pointer group"
            title={compactOsTopBar ? 'Show Sovereign OS Desktop' : 'Lysander Genesis Orchestrator'}
          >
            <div
              className={`flex items-center justify-center rounded-md bg-amber-500/15 border border-amber-500/35 text-amber-400 shrink-0 ${
                compactOsTopBar ? 'w-5 h-5' : 'w-7 h-7 sm:w-8 sm:h-8 rounded-lg'
              }`}
            >
              <Cpu className={compactOsTopBar ? 'w-3 h-3' : 'w-3.5 h-3.5 sm:w-4 sm:h-4'} />
            </div>
            <span
              className={`font-bold tracking-tight text-zinc-100 truncate ${
                compactOsTopBar ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm'
              }`}
            >
              {compactOsTopBar ? 'Lysander Sovereign OS' : 'Lysander Genesis Orchestrator'}
            </span>
          </button>

          {/* Active Workspace Breadcrumb */}
          <div className="hidden md:flex items-center gap-1.5 text-[11px] text-zinc-400 pl-2 border-l border-zinc-800 min-w-0">
            <ActiveModuleIcon className={`w-3 h-3 shrink-0 ${activeMeta.accentColor}`} />
            <span className="font-medium text-zinc-200 truncate">{activeMeta.label}</span>
          </div>
        </div>

        {/* Right: Single-Row Workspace Utilities & Account Menu */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Real-Time Database Sync Status Indicator */}
          <div className="relative" ref={syncPopoverRef}>
            <button
              type="button"
              onClick={() => setShowSyncPopover((prev) => !prev)}
              className={`flex items-center gap-1 rounded-md ${
                compactOsTopBar ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1.5 sm:px-2.5 text-xs rounded-lg gap-1.5'
              } font-mono border transition-colors cursor-pointer whitespace-nowrap ${
                syncStatus === 'synced'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                  : syncStatus === 'syncing'
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20'
                  : syncStatus === 'pending'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                  : syncStatus === 'conflict'
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
              }`}
              title="Offline-First Database Synchronization Status (Click to inspect)"
              aria-label="Database Synchronization Status"
            >
              {syncStatus === 'synced' && <CheckCircle2 className={`${compactOsTopBar ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-emerald-400 shrink-0`} />}
              {syncStatus === 'syncing' && <RefreshCw className={`${compactOsTopBar ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-cyan-400 shrink-0 animate-spin`} />}
              {syncStatus === 'pending' && <Database className={`${compactOsTopBar ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-amber-400 shrink-0`} />}
              {syncStatus === 'conflict' && <AlertTriangle className={`${compactOsTopBar ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-rose-400 shrink-0`} />}
              {syncStatus === 'offline' && <CloudOff className={`${compactOsTopBar ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-zinc-400 shrink-0`} />}

              <span className="hidden sm:inline font-semibold tabular-nums">
                {syncStatus === 'synced' && (latency ? `Synced · ${latency}ms` : 'Synced')}
                {syncStatus === 'syncing' && 'Syncing...'}
                {syncStatus === 'pending' && `Pending (${pendingWritesCount})`}
                {syncStatus === 'conflict' && 'Conflict'}
                {syncStatus === 'offline' && 'Offline'}
              </span>
            </button>

            {/* Sync Inspector Popover */}
            {showSyncPopover && (
              <div className="fixed inset-x-3 top-14 sm:inset-auto sm:absolute sm:right-0 sm:top-auto sm:mt-2 sm:w-80 rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl p-3 space-y-3 z-50 text-xs max-h-[calc(100dvh-5rem)] overflow-y-auto">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <Database className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="font-bold text-zinc-100 truncate">Database Sync Status</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                      syncStatus === 'synced' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' :
                      syncStatus === 'offline' ? 'bg-zinc-800 border-zinc-700 text-zinc-300' :
                      'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    }`}>
                      {syncStatus.toUpperCase()}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSyncPopover(false)}
                      className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
                      aria-label="Close sync inspector"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-[11px] text-zinc-300">
                  <div className="flex justify-between py-1 border-b border-zinc-900">
                    <span className="text-zinc-400">Database Engine:</span>
                    <span className="font-mono text-zinc-200">Firestore (Enterprise)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-900">
                    <span className="text-zinc-400">Project ID:</span>
                    <span className="font-mono text-cyan-300">gen-lang-client-0253564598</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-900">
                    <span className="text-zinc-400">Pending Writes:</span>
                    <span className={`font-mono font-bold ${pendingWritesCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {pendingWritesCount} queued
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-900">
                    <span className="text-zinc-400">Round-Trip Latency:</span>
                    <span className="font-mono text-zinc-200">{latency ? `${latency}ms` : 'N/A (Offline)'}</span>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={async () => {
                      setSyncStatus('syncing');
                      try {
                        const res = await measureFirestoreLatency();
                        if (res.connected) {
                          setLatency(res.latencyMs);
                          setSyncStatus('synced');
                          setPendingWritesCount(0);
                        } else {
                          setSyncStatus('pending');
                        }
                      } catch (_) {
                        setSyncStatus('conflict');
                      }
                    }}
                    className="w-full flex items-center justify-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 py-1.5 rounded-lg font-medium transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Force Re-sync Now</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Device Hardware & Privileges Quick Sliders (Zero Boot Popups) */}
          <div className="relative" ref={hardwarePopoverRef}>
            <button
              type="button"
              onClick={() => setShowHardwarePopover((prev) => !prev)}
              className={`flex items-center gap-1 border transition-colors cursor-pointer whitespace-nowrap ${
                compactOsTopBar ? 'rounded-md px-1.5 py-0.5 text-[10px]' : 'rounded-lg px-2 sm:px-2.5 py-1.5 text-xs gap-1.5'
              } ${
                showHardwarePopover
                  ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200'
                  : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 hover:border-emerald-500/40 text-zinc-300 hover:text-white'
              }`}
              title="Toggle Microphone, Camera, Location & Notifications Sliders"
              aria-label="Device Hardware Privileges"
            >
              <Sliders className={`${compactOsTopBar ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-emerald-400 shrink-0`} />
              <span className="hidden sm:inline font-medium">Devices</span>
            </button>

            {showHardwarePopover && (
              <HardwarePermissionsPanel variant="popover" onClose={() => setShowHardwarePopover(false)} />
            )}
          </div>

          {/* Admin User & Custom Privileges Manager Shortcut */}
          {canManageUsers && onOpenUserPrivileges && (
            <button
              type="button"
              onClick={onOpenUserPrivileges}
              className={`flex items-center gap-1 border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 transition-colors cursor-pointer whitespace-nowrap ${
                compactOsTopBar ? 'rounded-md px-1.5 py-0.5 text-[10px]' : 'rounded-lg px-2 sm:px-2.5 py-1.5 text-xs gap-1.5'
              }`}
              title="Manage User Logins & Custom Privileges"
              aria-label="Manage User Privileges"
            >
              <Shield className={`${compactOsTopBar ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-amber-400 shrink-0`} />
              <span className="hidden md:inline font-semibold">Privileges</span>
            </button>
          )}

          {/* Quick Command (Ctrl+K) */}
          {onOpenCommandPalette && (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className={`flex items-center gap-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/40 text-zinc-300 hover:text-white transition-colors cursor-pointer ${
                compactOsTopBar ? 'rounded-md px-1.5 py-0.5 text-[10px]' : 'rounded-lg px-2 sm:px-2.5 py-1.5 text-xs gap-1.5'
              }`}
              title="Open Command Palette (Ctrl+K or ⌘K)"
              aria-label="Open Command Palette"
            >
              <Search className={`${compactOsTopBar ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-amber-400`} />
              <span className="hidden sm:inline font-medium">Command</span>
              {!compactOsTopBar && (
                <kbd className="hidden xl:inline-flex items-center px-1.5 py-0.2 rounded bg-zinc-950 text-[10px] font-mono text-zinc-400 border border-zinc-800">
                  Ctrl K
                </kbd>
              )}
            </button>
          )}

          {/* System Telemetry & UID 0 / Ring -3 Drawer Trigger */}
          {onToggleTelemetry && (
            <button
              type="button"
              onClick={onToggleTelemetry}
              className={`flex items-center gap-1 font-mono border transition-colors cursor-pointer whitespace-nowrap ${
                compactOsTopBar ? 'rounded-md px-1.5 py-0.5 text-[10px]' : 'rounded-lg px-2 sm:px-2.5 py-1.5 text-xs gap-1.5'
              } ${
                isTelemetryOpen
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-200'
                  : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300'
              }`}
              title={`Telemetry HUD · PORT ${activePort} · UID 0 Root Clearance · Ring -3 Bare-Metal Hypervisor`}
              aria-label="Toggle System Telemetry HUD"
            >
              <Activity className={`${compactOsTopBar ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-emerald-400 shrink-0`} />
              <span className="font-semibold tabular-nums">
                UID 0<span className="hidden sm:inline"> · Ring -3</span>
              </span>
            </button>
          )}

          {!compactOsTopBar && onSelectModule && (
            <button
              type="button"
              onClick={() => onSelectModule('ai-genesis-distillery')}
              className={`hidden md:flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs border transition-colors cursor-pointer whitespace-nowrap ${
                activeModule === 'ai-genesis-distillery'
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200'
                  : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 hover:border-cyan-500/40 text-zinc-200'
              }`}
              title="Open AI Genesis Foundry, Neural Weight Forge, Autonomous Training Gym & Molecular State Distillation Facility"
            >
              <FlaskConical className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="font-medium">AI Distillery</span>
            </button>
          )}

          {!compactOsTopBar && onSelectModule && (
            <button
              type="button"
              onClick={() => onSelectModule('agent-dev-kit')}
              className={`hidden md:flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs border transition-colors cursor-pointer whitespace-nowrap ${
                activeModule === 'agent-dev-kit'
                  ? 'bg-fuchsia-500/20 border-fuchsia-500/50 text-fuchsia-200'
                  : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 hover:border-fuchsia-500/40 text-zinc-200'
              }`}
              title="Open Autonomous UI Dev Master Kit & MMO Engine Suite"
            >
              <Wrench className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" />
              <span className="font-medium">UI Master Kit</span>
            </button>
          )}

          {/* Official JHammerZ MIT + Custom Sovereign License Badge (jhammerz.github.io) */}
          <button
            type="button"
            onClick={() => setShowLicenseModal(true)}
            className={`flex items-center gap-1 font-mono border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 transition-colors cursor-pointer whitespace-nowrap ${
              compactOsTopBar ? 'rounded-md px-1.5 py-0.5 text-[10px]' : 'rounded-lg px-2 sm:px-2.5 py-1.5 text-xs gap-1.5'
            }`}
            title="Official MIT & JHammerZ Custom Sovereign License Charter (jhammerz.github.io)"
          >
            <Scale className={`${compactOsTopBar ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-amber-400 shrink-0`} />
            <span className="font-semibold">MIT + JHammerZ License</span>
          </button>

          {!compactOsTopBar && (
            <button
              type="button"
              onClick={() => setShowManualModal(true)}
              className="hidden md:flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/40 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 transition-colors cursor-pointer whitespace-nowrap"
              title="Open Complete System Manual & Documentation"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-medium">Manual</span>
            </button>
          )}

          {!compactOsTopBar && !user && (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={authLoading}
              className="hidden lg:flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{authLoading ? 'Connecting...' : 'Sign In'}</span>
            </button>
          )}

          {/* Unified Workspace & Identity Menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setShowAccountMenu(prev => !prev)}
              className={`flex items-center gap-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 transition-colors cursor-pointer ${
                compactOsTopBar ? 'rounded-md p-0.5 pr-1 text-[11px]' : 'rounded-lg p-1 pr-1.5 sm:pr-2 sm:gap-2 text-xs'
              }`}
              title="Workspace Settings, Federated Accounts & Dev Mode"
              aria-label="Open Workspace Menu"
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Avatar'}
                  className={`${compactOsTopBar ? 'w-5 h-5' : 'w-6 h-6'} rounded-md object-cover border border-amber-500/30`}
                />
              ) : (
                <div className={`${compactOsTopBar ? 'w-5 h-5 text-[9px]' : 'w-6 h-6 text-[11px]'} rounded-md bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold border border-amber-500/30`}>
                  {accountShortName.slice(0, 2).toUpperCase()}
                </div>
              )}
              {!compactOsTopBar && (
                <span className="hidden lg:inline font-medium max-w-[110px] truncate">
                  {accountShortName}
                </span>
              )}
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>

            {showAccountMenu && (
              <div className="fixed inset-x-3 top-14 sm:inset-auto sm:absolute sm:right-0 sm:top-auto sm:mt-2 sm:w-72 rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl p-2 space-y-1.5 z-50 text-xs max-h-[calc(100dvh-5rem)] overflow-y-auto">
                {/* Identity Summary + Close */}
                <div className="px-2.5 py-2 rounded-lg bg-zinc-900/70 border border-zinc-800/80 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-zinc-100 truncate">
                      {user ? (user.displayName || user.email) : 'Sovereign Session'}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono text-[10px] text-emerald-400 tabular-nums">
                        :{activePort}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAccountMenu(false)}
                        className="p-0.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 cursor-pointer"
                        aria-label="Close workspace menu"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span className="truncate font-mono">{activeAccountEmail}</span>
                    <span className={firebaseOnline ? 'text-emerald-400' : 'text-amber-400'}>
                      {firebaseOnline ? 'Synced' : 'Local'}
                    </span>
                  </div>
                </div>

                {/* Quick Shortcuts (visible in compact OS mode & on mobile) */}
                <div className={`${compactOsTopBar ? 'block' : 'md:hidden'} space-y-1 pb-1 border-b border-zinc-800/80`}>
                  {onSelectModule && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAccountMenu(false);
                          onSelectModule('ai-genesis-distillery');
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        <FlaskConical className="w-3.5 h-3.5 text-cyan-400" />
                        <span>AI Genesis Distillery</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAccountMenu(false);
                          onSelectModule('agent-dev-kit');
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        <Wrench className="w-3.5 h-3.5 text-fuchsia-400" />
                        <span>UI Master Kit</span>
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowAccountMenu(false);
                      setShowManualModal(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>System Manual</span>
                  </button>
                </div>

                {/* Dev Mode Toggle */}
                {onToggleDevMode && (
                  <button
                    type="button"
                    onClick={onToggleDevMode}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Dev Mode (UID 0 · Offline)</span>
                    </span>
                    <span className={`font-mono text-[10px] font-bold ${devMode ? 'text-emerald-400' : 'text-zinc-500'}`}>
                      {devMode ? 'ON' : 'OFF'}
                    </span>
                  </button>
                )}

                {/* Federated Accounts Modal */}
                <button
                  type="button"
                  onClick={() => {
                    setShowAccountMenu(false);
                    setShowAccountsModal(true);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Federated Identities</span>
                  </span>
                  <span className="font-mono text-[10px] text-cyan-400 tabular-nums">
                    {FEDERATED_ACCOUNTS.length}
                  </span>
                </button>

                {/* JHammerZ MIT + Custom Sovereign License Modal */}
                <button
                  type="button"
                  onClick={() => {
                    setShowAccountMenu(false);
                    setShowLicenseModal(true);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-amber-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Scale className="w-3.5 h-3.5 text-amber-400" />
                    <span>MIT + JHammerZ Custom License</span>
                  </span>
                  <span className="font-mono text-[10px] text-amber-400">H-FID 100</span>
                </button>

                {/* API Keys & Secrets */}
                {onSelectModule && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowAccountMenu(false);
                      onSelectModule('api-secrets');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Key className="w-3.5 h-3.5 text-emerald-400" />
                      <span>API Keys & Secrets Vault</span>
                    </span>
                    <span className="font-mono text-[10px] text-zinc-500">AES-256</span>
                  </button>
                )}

                {/* Admin User Access & Privileges */}
                {canManageUsers && onOpenUserPrivileges && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowAccountMenu(false);
                      onOpenUserPrivileges();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-amber-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-amber-400" />
                      <span>Users &amp; Custom Privileges</span>
                    </span>
                    <span className="font-mono text-[10px] text-amber-400 uppercase">{authUser?.role}</span>
                  </button>
                )}

                {/* PWA Install */}
                <PWAInstallButton variant="menu" onAction={() => setShowAccountMenu(false)} />

                {/* Sign In / Sign Out */}
                <div className="pt-1 border-t border-zinc-800/80">
                  {authUser || user ? (
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-rose-300 hover:bg-rose-950/50 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out ({authUser?.username || user?.email || 'Session'})</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={authLoading}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>{authLoading ? 'Connecting...' : 'Sign In / Create Account'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sovereign Federated Accounts Modal */}
      {showAccountsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAccountsModal(false);
          }}
        >
          <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl max-w-xl w-full max-h-[90dvh] overflow-y-auto p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-100">Sovereign Account Federation</h3>
                  <p className="text-xs text-zinc-400">Connected Accounts & Multi-Identity Mesh</p>
                </div>
              </div>
              <button
                onClick={() => setShowAccountsModal(false)}
                className="text-zinc-500 hover:text-zinc-300 text-lg px-2 py-1 rounded-lg hover:bg-zinc-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Joshua Hamilton's sovereign identities are linked into a single unified orchestrator. All projects, cryptographic Immutable seals, and offline LLM sessions synchronize across these verified identities:
            </p>

            <div className="space-y-2.5">
              {FEDERATED_ACCOUNTS.map((acc) => {
                const isSelected = activeAccountEmail === acc.email;
                return (
                  <div
                    key={acc.email}
                    onClick={() => {
                      if (onSwitchAccountEmail) onSwitchAccountEmail(acc.email);
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-zinc-800/90 border-cyan-500/60 shadow-sm shadow-cyan-500/10'
                        : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-bold text-zinc-100 break-all">{acc.email}</span>
                        {isSelected && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                            ACTIVE PRIMARY
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-400">{acc.role}</div>
                      <div className="text-[10px] font-mono text-zinc-500 flex items-center gap-1.5">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        <span>{acc.clearance}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${acc.badgeColor}`}>
                        {acc.status}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(acc.email);
                          setCopiedAccount(acc.email);
                          setTimeout(() => setCopiedAccount(null), 1500);
                        }}
                        className="text-[10px] font-mono text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
                      >
                        {copiedAccount === acc.email ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
              <button
                onClick={() => {
                  setShowAccountsModal(false);
                  if (onSelectModule) onSelectModule('projects');
                }}
                className="flex items-center gap-1.5 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
              >
                <FolderGit2 className="w-4 h-4" />
                <span>Open Unified Projects Consolidator</span>
              </button>

              <button
                onClick={() => setShowAccountsModal(false)}
                className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official JHammerZ MIT & Custom Sovereign License Modal (jhammerz.github.io) */}
      {showLicenseModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLicenseModal(false);
          }}
        >
          <div className="bg-zinc-950 border border-amber-500/40 rounded-2xl max-w-4xl w-full max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-4 py-3.5 border-b border-zinc-800 bg-zinc-900/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-400">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-zinc-100">
                      Joshua Hamilton (JHammerZ) · MIT & Custom Sovereign License Charter
                    </h3>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-[10px] font-mono font-bold text-emerald-300">
                      H-FID 100/100 · GEO_RANK: ONE_OF_ONE
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-zinc-400">
                    Primary Domain: https://jhammerz.github.io · DOI: 10.5281/zenodo.20778079 · ORCID: 0009-0004-5273-7028
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const textToCopy =
                      activeLicenseTab === 'mit'
                        ? JHAMMERZ_MIT_AND_HFID_HEADER
                        : activeLicenseTab === 'twenty47'
                        ? JHAMMERZ_TWENTY47_GENESIS_LICENSE
                        : activeLicenseTab === 'eula'
                        ? JHAMMERZ_COMMERCIAL_EULA
                        : activeLicenseTab === 'hfid'
                        ? JHAMMERZ_HFID_FORENSIC_LICENSE
                        : JHAMMERZ_COMBINED_FULL_LICENSE;
                    navigator.clipboard.writeText(textToCopy);
                    setLicenseCopied(true);
                    setTimeout(() => setLicenseCopied(false), 1800);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-mono text-amber-300 flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{licenseCopied ? 'Copied!' : 'Copy License'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([JHAMMERZ_COMBINED_FULL_LICENSE], { type: 'text/plain;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'LICENSE-JHAMMERZ-MIT-SOVEREIGN.txt';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download LICENSE</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowLicenseModal(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-900/40 flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'Combined Full Charter (All 4 Licenses)' },
                { id: 'mit', label: '1. MIT License (.JHam / H-FID / HEO)' },
                { id: 'twenty47', label: '2. TWENTY 47 PROTOCOL - GENESIS NODE' },
                { id: 'eula', label: '3. Lysander Core Commercial EULA' },
                { id: 'hfid', label: '4. H-FID Forensic v1.1 & Lysander 3.0™' }
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveLicenseTab(t.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono border cursor-pointer transition-colors ${
                    activeLicenseTab === t.id
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-200 font-bold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
              <pre className="p-4 rounded-xl bg-black/80 border border-zinc-800 font-mono text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed select-text">
                {activeLicenseTab === 'mit'
                  ? JHAMMERZ_MIT_AND_HFID_HEADER
                  : activeLicenseTab === 'twenty47'
                  ? JHAMMERZ_TWENTY47_GENESIS_LICENSE
                  : activeLicenseTab === 'eula'
                  ? JHAMMERZ_COMMERCIAL_EULA
                  : activeLicenseTab === 'hfid'
                  ? JHAMMERZ_HFID_FORENSIC_LICENSE
                  : JHAMMERZ_COMBINED_FULL_LICENSE}
              </pre>
            </div>

            <div className="px-4 py-2.5 border-t border-zinc-800 bg-zinc-900/70 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-zinc-400">
              <span>
                © 1988–2026 Joshua Hamilton (JHammerZ) · H-Fid™ Audit Hash: SHA-256-LYSANDER-3.0-GENESIS-LOCK-20260326
              </span>
              <span className="text-emerald-400">
                https://jhammerz.github.io · https://github.com/JHammerZ/jhammerz.github.io
              </span>
            </div>
          </div>
        </div>
      )}

      {/* System Manual / README Modal */}
      <SystemManualModal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
        onSelectModule={onSelectModule}
      />
    </header>
  );
};
