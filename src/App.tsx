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

import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { lazyWithRetry } from './utils/lazyWithRetry';
import { 
  auth, 
  db, 
  onAuthStateChanged, 
  type User, 
  collection, 
  onSnapshot, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  doc, 
  query,
  orderBy,
  OperationType,
  handleFirestoreError,
  measureFirestoreLatency
} from './firebase';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import type { AutonomousMarketAlert } from './components/MacroTelemetryModule';
import type { OSShellViewMode } from './components/SovereignOSSettingsModule';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SovereignOSBar } from './components/SovereignOSBar';
import {
  SovereignOSWindowFrame,
  SovereignDesktopCanvas,
  clampWindowGeometry,
  createDefaultWindowGeometry,
  type OSWindowGeometry
} from './components/SovereignOSWindowFrame';
import { localLlmManager } from './utils/localLlmEngine';
import { autonomousSelfImprovement } from './utils/autonomousSelfImprovement';
import { orchestratorRuntime } from './utils/OrchestratorRuntime';
import { useOrchestrator } from './hooks/useOrchestrator';
import {
  loadOSCustomizationProfile,
  saveOSCustomizationProfile,
  hydrateOSCustomizationFromRemote,
  setActiveCustomizationUserScope
} from './utils/osCustomizationStore';
import {
  pushContinuitySettingsPatch,
  flushContinuityBeacon,
  updateLocalBeaconSnapshot,
  fetchServerContinuityState,
  loadOrchestratorStateFromFirestore,
  saveOrchestratorStateToFirestore
} from './utils/continuityClient';
import { markVoiceUserGesture } from './utils/mediaPermissions';
import { AuthGateModal } from './components/AuthGateModal';
import { PersistentTalkDock } from './components/PersistentTalkDock';
import {
  apiFetch,
  fetchAuthSession,
  loginWithGoogleToken,
  logoutSession
} from './utils/authClient';
import {
  COLLABORATOR_PRIVILEGES,
  canUserAccessModule,
  isExecutiveArchitectUser,
  type AuthPolicySettings,
  type AuthSessionResponse,
  type AuthUserPublic
} from './types/auth';
import { signOut } from './firebase';
import type { ModuleType, Artifact, AuditLedgerItem } from './types';

// Lazy-loaded OS Applications with automatic retry & stale-chunk recovery
const ChatModule = lazyWithRetry(() => import('./components/ChatModule').then(m => ({ default: m.ChatModule })), 'ChatModule');
const GroundingModule = lazyWithRetry(() => import('./components/GroundingModule').then(m => ({ default: m.GroundingModule })), 'GroundingModule');
const MusicModule = lazyWithRetry(() => import('./components/MusicModule').then(m => ({ default: m.MusicModule })), 'MusicModule');
const ImageModule = lazyWithRetry(() => import('./components/ImageModule').then(m => ({ default: m.ImageModule })), 'ImageModule');
const VideoModule = lazyWithRetry(() => import('./components/VideoModule').then(m => ({ default: m.VideoModule })), 'VideoModule');
const TranscribeModule = lazyWithRetry(() => import('./components/TranscribeModule').then(m => ({ default: m.TranscribeModule })), 'TranscribeModule');
const LiveVoiceModule = lazyWithRetry(() => import('./components/LiveVoiceModule').then(m => ({ default: m.LiveVoiceModule })), 'LiveVoiceModule');
const VaultModule = lazyWithRetry(() => import('./components/VaultModule').then(m => ({ default: m.VaultModule })), 'VaultModule');
const GitHubModule = lazyWithRetry(() => import('./components/GitHubModule').then(m => ({ default: m.GitHubModule })), 'GitHubModule');
const WarRoomModule = lazyWithRetry(() => import('./components/WarRoomModule').then(m => ({ default: m.WarRoomModule })), 'WarRoomModule');
const SovereignBrowser = lazyWithRetry(() => import('./components/SovereignBrowser').then(m => ({ default: m.SovereignBrowser })), 'SovereignBrowser');
const ScratchpadModule = lazyWithRetry(() => import('./components/ScratchpadModule').then(m => ({ default: m.ScratchpadModule })), 'ScratchpadModule');
const HITLWorkflowModule = lazyWithRetry(() => import('./components/HITLWorkflowModule').then(m => ({ default: m.HITLWorkflowModule })), 'HITLWorkflowModule');
const TermuxEdgeModule = lazyWithRetry(() => import('./components/TermuxEdgeModule').then(m => ({ default: m.TermuxEdgeModule })), 'TermuxEdgeModule');
const OSINTModule = lazyWithRetry(() => import('./components/OSINTModule').then(m => ({ default: m.OSINTModule })), 'OSINTModule');
const BurnerMailModule = lazyWithRetry(() => import('./components/BurnerMailModule').then(m => ({ default: m.BurnerMailModule })), 'BurnerMailModule');
const InfiniteSimModule = lazyWithRetry(() => import('./components/InfiniteSimModule').then(m => ({ default: m.InfiniteSimModule })), 'InfiniteSimModule');
const FunctionDeckModule = lazyWithRetry(() => import('./components/FunctionDeckModule').then(m => ({ default: m.FunctionDeckModule })), 'FunctionDeckModule');
const UnifiedProjectsModule = lazyWithRetry(() => import('./components/UnifiedProjectsModule').then(m => ({ default: m.UnifiedProjectsModule })), 'UnifiedProjectsModule');
const PromptPresetsModule = lazyWithRetry(() => import('./components/PromptPresetsModule').then(m => ({ default: m.PromptPresetsModule })), 'PromptPresetsModule');
const AuditLedgerModule = lazyWithRetry(() => import('./components/AuditLedgerModule').then(m => ({ default: m.AuditLedgerModule })), 'AuditLedgerModule');
const SwarmDiagnosticModule = lazyWithRetry(() => import('./components/SwarmDiagnosticModule').then(m => ({ default: m.SwarmDiagnosticModule })), 'SwarmDiagnosticModule');
const PackagerModule = lazyWithRetry(() => import('./components/PackagerModule').then(m => ({ default: m.PackagerModule })), 'PackagerModule');
const GoogleDriveModule = lazyWithRetry(() => import('./components/GoogleDriveModule').then(m => ({ default: m.GoogleDriveModule })), 'GoogleDriveModule');
const GoogleTasksModule = lazyWithRetry(() => import('./components/GoogleTasksModule').then(m => ({ default: m.GoogleTasksModule })), 'GoogleTasksModule');
const KnowledgeGraphModule = lazyWithRetry(() => import('./components/KnowledgeGraphModule').then(m => ({ default: m.KnowledgeGraphModule })), 'KnowledgeGraphModule');
const ToolShedModule = lazyWithRetry(() => import('./components/ToolShedModule').then(m => ({ default: m.ToolShedModule })), 'ToolShedModule');
const AutonomySupervisorModule = lazyWithRetry(() => import('./components/AutonomySupervisorModule').then(m => ({ default: m.AutonomySupervisorModule })), 'AutonomySupervisorModule');
const AgentDevKitModule = lazyWithRetry(() => import('./components/AgentDevKitModule').then(m => ({ default: m.AgentDevKitModule })), 'AgentDevKitModule');
const AIGenesisDistilleryModule = lazyWithRetry(() => import('./components/AIGenesisDistilleryModule').then(m => ({ default: m.AIGenesisDistilleryModule })), 'AIGenesisDistilleryModule');
const WorldLoadStartScreen = lazyWithRetry(() => import('./components/WorldLoadStartScreen').then(m => ({ default: m.WorldLoadStartScreen })), 'WorldLoadStartScreen');
const UniversalEmulatorModderModule = lazyWithRetry(() => import('./components/UniversalEmulatorModderModule').then(m => ({ default: m.UniversalEmulatorModderModule })), 'UniversalEmulatorModderModule');
const MacroTelemetryModule = lazyWithRetry(() => import('./components/MacroTelemetryModule').then(m => ({ default: m.MacroTelemetryModule })), 'MacroTelemetryModule');
const SovereignFilesModule = lazyWithRetry(() => import('./components/SovereignFilesModule').then(m => ({ default: m.SovereignFilesModule })), 'SovereignFilesModule');
const SovereignTerminalModule = lazyWithRetry(() => import('./components/SovereignTerminalModule').then(m => ({ default: m.SovereignTerminalModule })), 'SovereignTerminalModule');
const SovereignTaskManagerModule = lazyWithRetry(() => import('./components/SovereignTaskManagerModule').then(m => ({ default: m.SovereignTaskManagerModule })), 'SovereignTaskManagerModule');
const SovereignOSSettingsModule = lazyWithRetry(() => import('./components/SovereignOSSettingsModule').then(m => ({ default: m.SovereignOSSettingsModule })), 'SovereignOSSettingsModule');
const DownloadModelsModule = lazyWithRetry(() => import('./components/DownloadModelsModule').then(m => ({ default: m.DownloadModelsModule })), 'DownloadModelsModule');
const UniversalInstallerModule = lazyWithRetry(() => import('./components/UniversalInstallerModule').then(m => ({ default: m.UniversalInstallerModule })), 'UniversalInstallerModule');
const SovereignCryptoWalletModule = lazyWithRetry(() => import('./components/SovereignCryptoWalletModule').then(m => ({ default: m.SovereignCryptoWalletModule })), 'SovereignCryptoWalletModule');
const AutonomousGrantEnginePanel = lazyWithRetry(() => import('./components/AutonomousGrantEnginePanel').then(m => ({ default: m.AutonomousGrantEnginePanel })), 'AutonomousGrantEnginePanel');
const TransferHubModule = lazyWithRetry(() => import('./components/TransferHubModule').then(m => ({ default: m.TransferHubModule })), 'TransferHubModule');
const BatchProcessorModule = lazyWithRetry(() => import('./components/BatchProcessorModule').then(m => ({ default: m.BatchProcessorModule })), 'BatchProcessorModule');
const ApiSecretsModule = lazyWithRetry(() => import('./components/ApiSecretsModule').then(m => ({ default: m.ApiSecretsModule })), 'ApiSecretsModule');
const SovereignIntegrationsHub = lazyWithRetry(() => import('./components/SovereignIntegrationsHub').then(m => ({ default: m.SovereignIntegrationsHub })), 'SovereignIntegrationsHub');
const SpatialArenaModule = lazyWithRetry(() => import('./components/three/SpatialArenaModule').then(m => ({ default: m.SpatialArenaModule })), 'SpatialArenaModule');
const LoRaMeshChatModule = lazyWithRetry(() => import('./components/LoRaMeshChatModule').then(m => ({ default: m.LoRaMeshChatModule })), 'LoRaMeshChatModule');
const AdminSovereignCommandCenter = lazyWithRetry(() => import('./components/AdminSovereignCommandCenter').then(m => ({ default: m.AdminSovereignCommandCenter })), 'AdminSovereignCommandCenter');
const FloatingTouchGamepadOverlay = lazyWithRetry(() => import('./components/UniversalControllerDeck').then(m => ({ default: m.FloatingTouchGamepadOverlay })), 'FloatingTouchGamepadOverlay');
const CommandPalette = lazyWithRetry(() => import('./components/CommandPalette').then(m => ({ default: m.CommandPalette })), 'CommandPalette');
const SystemHealthDashboard = lazyWithRetry(() => import('./components/SystemHealthDashboard').then(m => ({ default: m.SystemHealthDashboard })), 'SystemHealthDashboard');
const UserPrivilegesManagerModal = lazyWithRetry(() => import('./components/UserPrivilegesManagerModal').then(m => ({ default: m.UserPrivilegesManagerModal })), 'UserPrivilegesManagerModal');

const ModuleLoadingFallback: React.FC<{ label?: string }> = ({ label = 'Loading module...' }) => (
  <div className="flex-1 min-h-[220px] flex flex-col items-center justify-center gap-3 p-8 bg-zinc-950/90 text-zinc-400 font-mono text-xs">
    <div className="w-7 h-7 rounded-lg border-2 border-amber-500/30 border-t-amber-400 animate-spin" />
    <span>{label}</span>
  </div>
);

interface MemoChatPaneProps {
  onSaveToVault: (title: string, content: string, model: string) => void;
  onSelectModule: (mod: ModuleType) => void;
  pendingInput: { content: string; immediate?: boolean } | null;
  onClearPendingInput: () => void;
  userId?: string;
  authUser?: AuthUserPublic | null;
  isDetached: boolean;
  onToggleDetach: () => void;
}

const MemoChatPane: React.FC<MemoChatPaneProps> = React.memo(({
  onSaveToVault,
  onSelectModule,
  pendingInput,
  onClearPendingInput,
  userId,
  authUser,
  isDetached,
  onToggleDetach
}) => (
  <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
    <ErrorBoundary key="persistent-chat-eb">
      <Suspense fallback={<ModuleLoadingFallback label="Loading Sovereign Chat..." />}>
        <ChatModule
          onSaveToVault={onSaveToVault}
          onSelectModule={onSelectModule}
          pendingInput={pendingInput}
          onClearPendingInput={onClearPendingInput}
          userId={userId}
          authUser={authUser}
          isDetached={isDetached}
          onToggleDetach={onToggleDetach}
        />
      </Suspense>
    </ErrorBoundary>
  </div>
));

export default function App() {
  const {
    state: orchestratorState,
    deferredActiveModule,
    setActiveModule,
    setPendingChatInput,
    injectIntoChat,
    toggleInternet,
    setDevMode,
    switchAccountEmail,
    setUiMutation,
    coordinateSubsystem,
    getResidentState
  } = useOrchestrator({
    activeModule: (() => {
      try {
        const saved = localStorage.getItem('sovereign_os_active_module_v1') as ModuleType | null;
        if (saved && saved.trim()) return saved;
      } catch {}
      return 'chat';
    })(),
    pendingChatInput: null,
    agentInternetAllowed: true,
    devMode: (() => {
      const saved = localStorage.getItem('aurelius_dev_mode');
      return saved !== null ? saved === 'true' : true;
    })(),
    activeAccountEmail: localStorage.getItem('aurelius_active_account') || 'joshualhamilton17@gmail.com',
    uiMutation: (() => {
      try {
        const saved = localStorage.getItem('sovereign_ui_mutation_v1');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed.css === 'string') return parsed;
        }
      } catch {}
      return { css: '' };
    })(),
    lamportClock: 1
  });

  const { activeModule, pendingChatInput, agentInternetAllowed, devMode, activeAccountEmail, uiMutation } = orchestratorState;

  const [authLoaded, setAuthLoaded] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUserPublic | null>(null);
  const [authAdminClaimed, setAuthAdminClaimed] = useState(true);
  const [authEnvAdminConfigured, setAuthEnvAdminConfigured] = useState(false);
  const [authPolicy, setAuthPolicy] = useState<AuthPolicySettings>({
    requireLoginOnBoot: true,
    allowSelfRegistration: true,
    newUsersRequireApproval: false,
    defaultRole: 'collaborator',
    defaultPrivileges: COLLABORATOR_PRIVILEGES
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUserPrivilegesModal, setShowUserPrivilegesModal] = useState(false);
  const authUserRef = useRef<AuthUserPublic | null>(null);
  authUserRef.current = authUser;

  const applyAuthSessionResponse = useCallback((res: AuthSessionResponse) => {
    setAuthUser(res.user || null);
    setAuthAdminClaimed(res.adminClaimed !== false);
    setAuthEnvAdminConfigured(Boolean(res.envAdminConfigured));
    if (res.policy) setAuthPolicy(res.policy);
    setAuthLoaded(true);
    if (res.user && res.user.status === 'active') {
      setShowLoginModal(false);
    }
  }, []);

  const refreshAuthSession = useCallback(async () => {
    try {
      const res = await fetchAuthSession();
      applyAuthSessionResponse(res);
    } catch {
      setAuthLoaded(true);
    }
  }, [applyAuthSessionResponse]);

  const handleLogoutAccount = useCallback(async () => {
    await logoutSession().catch(() => {});
    await signOut(auth).catch(() => {});
    setAuthUser(null);
    setShowUserPrivilegesModal(false);
    await refreshAuthSession();
  }, [refreshAuthSession]);

  useEffect(() => {
    refreshAuthSession();
  }, [refreshAuthSession]);

  // Scope desktop customization profile & hydrate per-user SQL continuity whenever logged-in user changes
  useEffect(() => {
    const isAdminOrArch = Boolean(
      authUser && (isExecutiveArchitectUser(authUser) || authUser.role === 'admin')
    );
    setActiveCustomizationUserScope(authUser?.id || null, isAdminOrArch);
    if (!authUser?.id) return;
    let cancelled = false;
    fetchServerContinuityState()
      .then((remote) => {
        if (cancelled) return;
        if (remote?.settings?.osCustomization) {
          hydrateOSCustomizationFromRemote(remote.settings.osCustomization);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [authUser?.id, authUser?.role]);

  // Live-sync preferredName across the entire OS whenever Chat, Voice, Desktop, or SoS Mesh updates it
  useEffect(() => {
    const onPreferredNameUpdated = (e: Event) => {
      const detail = (e as CustomEvent<{ userId?: string; preferredName?: string }>)?.detail;
      if (!detail?.preferredName) return;
      setAuthUser((prev) => {
        if (!prev) return prev;
        if (detail.userId && detail.userId !== prev.id) return prev;
        return {
          ...prev,
          preferredName: detail.preferredName,
          preferredNameConfirmed: true
        };
      });
    };
    window.addEventListener('sovereign_preferred_name_updated', onPreferredNameUpdated);
    return () => window.removeEventListener('sovereign_preferred_name_updated', onPreferredNameUpdated);
  }, []);

  useEffect(() => {
    // Signal to index.html boot watchdog IMMEDIATELY after React mounts App
    (window as any).__SOVEREIGN_BOOT_MOUNTED__ = true;
    if (localStorage.getItem('aurelius_dev_mode') === null) {
      localStorage.setItem('aurelius_dev_mode', 'true');
    }
  }, []);

  // Defer heavy background offline substrate & autonomous learning until user is authenticated
  useEffect(() => {
    const isAuthenticatedActive =
      !authPolicy.requireLoginOnBoot || Boolean(authUser && authUser.status === 'active');
    if (!authLoaded || !isAuthenticatedActive) return;
    const timer = window.setTimeout(() => {
      localLlmManager.autoInitializeOfflineSubstrate().catch(() => {});
      autonomousSelfImprovement.start();
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [authLoaded, authPolicy.requireLoginOnBoot, authUser?.id, authUser?.status]);

  const showOsToast = (msg: string) => {
    setOsActionToast(msg);
    setTimeout(() => {
      setOsActionToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const handleToggleDetachChat = (force?: boolean) => {
    setIsChatDetached((prev) => {
      const next = typeof force === 'boolean' ? force : !prev;
      try {
        localStorage.setItem('sovereign_os_chat_detached_v1', String(next));
      } catch {}
      if (next) {
        setOpenModules((mods) => (mods.includes('chat') ? mods : [...mods, 'chat']));
        setChatPipMinimized(false);
        const pipWidth = Math.min(460, Math.max(280, Math.round(desktopSize.width * 0.42)));
        const pipHeight = Math.min(560, Math.max(260, desktopSize.height - 24));
        setWindowStates((ws) => ({
          ...ws,
          chat: {
            x: Math.max(6, desktopSize.width - pipWidth - 10),
            y: 10,
            width: pipWidth,
            height: pipHeight,
            zIndex: ++topZRef.current + 18,
            minimized: false,
            maximized: false
          }
        }));
        if (!desktopActive && activeModule === 'chat') {
          const fallbackApp = openModules.find((m) => m !== 'chat') || 'browser';
          setActiveModule(fallbackApp);
        }
        showOsToast('Chat Detached: Resizable Always-On-Top Copilot Active');
      } else {
        showOsToast('Chat Re-Docked into OS Workspace');
      }
      return next;
    });
  };

  const handleToggleDetachModule = (mod: ModuleType, force?: boolean) => {
    if (mod === 'chat') {
      handleToggleDetachChat(force);
      return;
    }
    setDetachedExtraModules((prev) => {
      const currentlyDetached = prev.includes(mod);
      const nextDetached = typeof force === 'boolean' ? force : !currentlyDetached;
      const nextList = nextDetached
        ? currentlyDetached
          ? prev
          : [...prev, mod]
        : prev.filter((m) => m !== mod);
      try {
        localStorage.setItem('sovereign_os_detached_extras_v1', JSON.stringify(nextList));
      } catch {}
      if (nextDetached) {
        setOpenModules((mods) => (mods.includes(mod) ? mods : [...mods, mod]));
        setPipMinimizedExtras((p) => ({ ...p, [mod]: false }));
        const pipWidth = Math.min(540, Math.max(290, Math.round(desktopSize.width * 0.46)));
        const pipHeight = Math.min(540, Math.max(260, desktopSize.height - 28));
        setWindowStates((ws) => {
          const existing = ws[mod];
          const useExisting =
            existing &&
            !existing.minimized &&
            existing.width <= desktopSize.width - 8 &&
            existing.height <= desktopSize.height - 8;
          return {
            ...ws,
            [mod]: useExisting
              ? { ...existing, zIndex: ++topZRef.current + 18, maximized: false }
              : {
                  x: Math.max(6, Math.round((desktopSize.width - pipWidth) / 2)),
                  y: 14,
                  width: pipWidth,
                  height: pipHeight,
                  zIndex: ++topZRef.current + 18,
                  minimized: false,
                  maximized: false
                }
          };
        });
        if (!desktopActive && activeModule === mod) {
          const fallbackApp = openModules.find((m) => m !== mod && !nextList.includes(m)) || 'chat';
          setActiveModule(fallbackApp);
        }
        showOsToast(`${mod} Detached: Resizable Always-On-Top Window Active`);
      } else {
        setPipMinimizedExtras((p) => ({ ...p, [mod]: false }));
        showOsToast(`${mod} Re-Docked into OS`);
      }
      return nextList;
    });
  };

  const handleInjectIntoChat = (content: string, immediate = false) => {
    injectIntoChat(content, immediate, false);
    setOpenModules((prev) => (prev.includes('chat') ? prev : [...prev, 'chat']));
    setChatPipMinimized(false);
    if (desktopActive) {
      setWindowStates((prev) => {
        const base = prev.chat || getOrCreateWindowGeometry('chat', 0);
        return { ...prev, chat: { ...base, minimized: false, zIndex: isChatDetached ? 48 : ++topZRef.current } };
      });
    } else if (activeModule !== 'chat' && !(isSplitMode && secondaryModule === 'chat')) {
      if (!isChatDetached) {
        handleToggleDetachChat(true);
      }
    }
  };
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Apply global CSS mutation
    const styleId = 'sovereign-ui-mutation';
    let styleTag = document.getElementById(styleId);
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = uiMutation.css;
  }, [uiMutation]);

  useEffect(() => {
    (window as any).__SOVEREIGN_UI_MUTATOR__ = (css: string, htmlPatch?: string) => {
      setUiMutation({ css, htmlPatch });
      return { success: true, timestamp: Date.now() };
    };
  }, [setUiMutation]);
  const [firebaseOnline, setFirebaseOnline] = useState<boolean>(true);
  const [ledger, setLedger] = useState<AuditLedgerItem[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>(() => {
    try {
      const saved = localStorage.getItem('aurelius_vault_artifacts_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('aurelius_vault_artifacts_v1', JSON.stringify(artifacts));
    } catch (_) {}
  }, [artifacts]);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState<boolean>(false);
  const [browserTargetUrl, setBrowserTargetUrl] = useState<string | undefined>(undefined);
  const [browserNavRequest, setBrowserNavRequest] = useState<{
    seq: number;
    action: 'navigate' | 'newtab' | 'search';
    url?: string;
    query?: string;
  } | undefined>(undefined);
  const browserNavSeqRef = useRef<number>(0);

  // Sovereign OS Multi-Window Taskbar, Desktop Window Manager & Split-Screen State
  const mainAreaRef = useRef<HTMLDivElement>(null);
  const [desktopSize, setDesktopSize] = useState<{ width: number; height: number }>({
    width: 1200,
    height: 680
  });
  const [shellViewMode, setShellViewMode] = useState<OSShellViewMode>(() => {
    try {
      const saved = localStorage.getItem('sovereign_os_shell_mode_v1');
      if (saved === 'workspace' || saved === 'desktop') return saved;
    } catch {}
    return 'desktop';
  });
  const desktopActive = shellViewMode === 'desktop';

  const [isChatDetached, setIsChatDetached] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sovereign_os_chat_detached_v1') === 'true';
    } catch {
      return false;
    }
  });
  const [chatPipMinimized, setChatPipMinimized] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sovereign_os_chat_pip_minimized_v1') === 'true';
    } catch {
      return false;
    }
  });
  const [detachedExtraModules, setDetachedExtraModules] = useState<ModuleType[]>(() => {
    try {
      const saved = localStorage.getItem('sovereign_os_detached_extras_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter((m) => m !== 'chat');
      }
    } catch {}
    return [];
  });
  const [pipMinimizedExtras, setPipMinimizedExtras] = useState<Partial<Record<ModuleType, boolean>>>(() => {
    try {
      const saved = localStorage.getItem('sovereign_os_pip_minimized_extras_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}
    return {};
  });
  const [showDesktopSidebar, setShowDesktopSidebar] = useState<boolean>(false);
  const [osActionToast, setOsActionToast] = useState<string | null>(null);
  const [osMarketAlert, setOsMarketAlert] = useState<AutonomousMarketAlert | null>(null);
  const [dismissedMarketSymbols, setDismissedMarketSymbols] = useState<Record<string, number>>({});
  const [showTouchControllerOverlay, setShowTouchControllerOverlay] = useState<boolean>(
    () => loadOSCustomizationProfile().showTouchControllerOverlay
  );
  const [enableGamepadOsNav, setEnableGamepadOsNav] = useState<boolean>(
    () => loadOSCustomizationProfile().enableGamepadOsNav
  );
  const [notificationPrefs, setNotificationPrefs] = useState(
    () => loadOSCustomizationProfile().notifications
  );
  // Never auto-start live microphone capture on boot; activate only when user clicks Voice Chat
  const [persistentTalkActive, setPersistentTalkActive] = useState<boolean>(false);
  const [persistentTalkStatus, setPersistentTalkStatus] = useState<{
    connected: boolean;
    connecting: boolean;
    muted: boolean;
    speaking: boolean;
    exploringTool: string | null;
  }>({ connected: false, connecting: false, muted: false, speaking: false, exploringTool: null });

  useEffect(() => {
    const syncCustom = (e: Event) => {
      const profile = (e as CustomEvent).detail || loadOSCustomizationProfile();
      setShowTouchControllerOverlay(Boolean(profile.showTouchControllerOverlay));
      setEnableGamepadOsNav(Boolean(profile.enableGamepadOsNav));
      if (profile.notifications) {
        setNotificationPrefs({
          telemetryPopupAlerts: Boolean(profile.notifications.telemetryPopupAlerts),
          cryptoTradingAlerts: Boolean(profile.notifications.cryptoTradingAlerts),
          telemetryAudioChime: Boolean(profile.notifications.telemetryAudioChime)
        });
      }
    };
    const onToggleTalk = (e: Event) => {
      markVoiceUserGesture();
      try {
        localStorage.setItem('sovereign_continuity_local_updated_at_v1', new Date().toISOString());
      } catch {}
      const detail = (e as CustomEvent)?.detail;
      if (detail && typeof detail.active === 'boolean') {
        setPersistentTalkActive(detail.active);
      } else {
        setPersistentTalkActive((prev) => !prev);
      }
    };
    window.addEventListener('sovereign_os_customization_changed', syncCustom);
    window.addEventListener('sovereign_toggle_persistent_talk', onToggleTalk);
    return () => {
      window.removeEventListener('sovereign_os_customization_changed', syncCustom);
      window.removeEventListener('sovereign_toggle_persistent_talk', onToggleTalk);
    };
  }, []);

  // Event-gated Global Hardware Controller OS Navigation (Xbox, PlayStation, Switch, Steam Deck, 8BitDo, HOTAS, HID)
  useEffect(() => {
    if (!enableGamepadOsNav || typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') {
      return;
    }
    let rafId = 0;
    let active = false;
    const prevPressed: Record<number, boolean> = {};

    const hasConnectedPad = () => {
      try {
        return Array.from(navigator.getGamepads() || []).some((p) => Boolean(p && p.connected));
      } catch {
        return false;
      }
    };

    const tick = () => {
      if (!active) return;
      const pads = Array.from(navigator.getGamepads() || []).filter((p): p is Gamepad => Boolean(p && p.connected));
      if (pads.length === 0) {
        active = false;
        return;
      }
      const pad = pads[0];
      const checkEdge = (idx: number, onDown: () => void) => {
        const down = Boolean(pad.buttons[idx]?.pressed);
        if (down && !prevPressed[idx]) {
          onDown();
        }
        prevPressed[idx] = down;
      };

      // Guide (16) or Start/Options (9) toggles OS Command Palette / Launcher
      checkEdge(16, () => setIsCommandPaletteOpen((prev) => !prev));
      checkEdge(9, () => setIsCommandPaletteOpen((prev) => !prev));
      // D-Pad navigation + A/B confirm/back
      const dispatchKey = (key: string, code: string) => {
        const target = document.activeElement || window;
        target.dispatchEvent(new KeyboardEvent('keydown', { key, code, bubbles: true, cancelable: true }));
      };
      checkEdge(12, () => dispatchKey('ArrowUp', 'ArrowUp'));
      checkEdge(13, () => dispatchKey('ArrowDown', 'ArrowDown'));
      checkEdge(14, () => dispatchKey('ArrowLeft', 'ArrowLeft'));
      checkEdge(15, () => dispatchKey('ArrowRight', 'ArrowRight'));
      checkEdge(0, () => dispatchKey('Enter', 'Enter'));
      checkEdge(1, () => dispatchKey('Escape', 'Escape'));

      rafId = requestAnimationFrame(tick);
    };

    const startIfConnected = () => {
      if (!active && hasConnectedPad()) {
        active = true;
        rafId = requestAnimationFrame(tick);
      }
    };

    const onConnected = (e: Event) => {
      const gp = (e as GamepadEvent).gamepad;
      showOsToast(`Controller Connected: ${gp?.id?.slice(0, 42) || 'Universal Gamepad'} — OS Nav Active`);
      startIfConnected();
    };
    const onDisconnected = () => {
      if (!hasConnectedPad()) {
        active = false;
        cancelAnimationFrame(rafId);
      }
    };

    window.addEventListener('gamepadconnected', onConnected);
    window.addEventListener('gamepaddisconnected', onDisconnected);
    startIfConnected();

    return () => {
      active = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener('gamepadconnected', onConnected);
      window.removeEventListener('gamepaddisconnected', onDisconnected);
    };
  }, [enableGamepadOsNav]);

  // Telemetry & crypto trading popup alerts are OFF by default unless explicitly opted in by the user
  useEffect(() => {
    if (!notificationPrefs.telemetryPopupAlerts && !notificationPrefs.cryptoTradingAlerts) {
      setOsMarketAlert(null);
      return;
    }
    let active = true;
    const isCryptoAlert = (a: AutonomousMarketAlert) => {
      const sym = String(a.symbol || '').toUpperCase();
      const cls = String((a as any).assetClass || '').toLowerCase();
      return (
        cls === 'crypto' ||
        /^(BTC|ETH|SOL|XRP|DOGE|BNB|AVAX|LINK|ADA|MATIC|ARB|OP|SUI|DOT|ATOM|LTC|SHIB|PEPE|UNI|AAVE)([-/_]USD|USDT)?$/.test(sym) ||
        sym.endsWith('-USD')
      );
    };
    const checkMarketAlerts = async () => {
      try {
        const res = await apiFetch('/api/macro/live-telemetry?mode=fast2s');
        if (!res.ok || !active) return;
        const data = await res.json();
        const alerts: AutonomousMarketAlert[] = data?.multiKernelTelemetry?.autonomousAlerts || [];
        if (alerts.length > 0 && active) {
          const now = Date.now();
          const top = alerts.find((a) => {
            const crypto = isCryptoAlert(a);
            if (crypto && !notificationPrefs.cryptoTradingAlerts) return false;
            if (!crypto && !notificationPrefs.telemetryPopupAlerts) return false;
            return (
              (a.actionSignal === 'STRONG_BUY' || a.actionSignal === 'URGENT_STOP_LOSS_SELL' || a.urgencyScore >= 55) &&
              (!dismissedMarketSymbols[a.symbol] || now - dismissedMarketSymbols[a.symbol] > 90000)
            );
          });
          if (top) {
            setOsMarketAlert(top);
          }
        }
      } catch (_) {}
    };
    const initTimer = setTimeout(checkMarketAlerts, 3500);
    const interval = setInterval(checkMarketAlerts, 15000);
    return () => {
      active = false;
      clearTimeout(initTimer);
      clearInterval(interval);
    };
  }, [dismissedMarketSymbols, notificationPrefs.telemetryPopupAlerts, notificationPrefs.cryptoTradingAlerts]);

  const [openModules, setOpenModules] = useState<ModuleType[]>(() => {
    try {
      const saved = localStorage.getItem('sovereign_os_open_modules_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return ['chat', 'browser', 'file-manager', 'terminal'];
  });
  const [pinnedModules, setPinnedModules] = useState<ModuleType[]>(() => {
    try {
      const saved = localStorage.getItem('sovereign_os_pinned_modules_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const next = [...parsed] as ModuleType[];
          if (!localStorage.getItem('sovereign_os_pinned_grants_v1')) {
            localStorage.setItem('sovereign_os_pinned_grants_v1', '1');
            if (!next.includes('crypto-wallet')) next.push('crypto-wallet');
            if (!next.includes('grant-hunter')) next.push('grant-hunter');
          }
          if (!localStorage.getItem('sovereign_os_pinned_transfer_v1')) {
            localStorage.setItem('sovereign_os_pinned_transfer_v1', '1');
            if (!next.includes('transfer-hub')) next.push('transfer-hub');
          }
          if (!localStorage.getItem('sovereign_os_pinned_sos_mesh_v1')) {
            localStorage.setItem('sovereign_os_pinned_sos_mesh_v1', '1');
            if (!next.includes('lora-mesh')) next.splice(1, 0, 'lora-mesh');
          }
          return next;
        }
      }
    } catch {}
    return ['chat', 'lora-mesh', 'browser', 'file-manager', 'transfer-hub', 'terminal', 'crypto-wallet', 'grant-hunter', 'macro-telemetry', 'projects', 'os-settings'];
  });
  const [windowStates, setWindowStates] = useState<Partial<Record<ModuleType, OSWindowGeometry>>>(() => {
    try {
      const saved = localStorage.getItem('sovereign_os_window_states_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}
    return {
      chat: { x: 248, y: 18, width: 660, height: 530, zIndex: 24, minimized: true, maximized: false },
      terminal: { x: 460, y: 52, width: 580, height: 420, zIndex: 21, minimized: true, maximized: false },
      browser: { x: 200, y: 36, width: 760, height: 520, zIndex: 20, minimized: true, maximized: false },
      'file-manager': { x: 260, y: 64, width: 720, height: 500, zIndex: 19, minimized: true, maximized: false }
    };
  });
  const topZRef = useRef<number>(30);

  const [isSplitMode, setIsSplitMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sovereign_os_split_mode_v1') === 'true';
    } catch {
      return false;
    }
  });
  const [secondaryModule, setSecondaryModule] = useState<ModuleType>(() => {
    try {
      const saved = localStorage.getItem('sovereign_os_secondary_module_v1') as ModuleType | null;
      return saved || 'browser';
    } catch {
      return 'browser';
    }
  });
  const [splitRatio, setSplitRatio] = useState<'50-50' | '60-40'>('50-50');
  const [splitPct, setSplitPct] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem('sovereign_os_split_pct_v1'));
      if (Number.isFinite(saved) && saved >= 20 && saved <= 80) return saved;
    } catch {}
    return 50;
  });
  const [isDraggingSplit, setIsDraggingSplit] = useState<boolean>(false);
  const [isOSLauncherOpen, setIsOSLauncherOpen] = useState<boolean>(false);

  const shellHydratedRef = useRef<boolean>(false);
  const applyingRemoteShellRef = useRef<boolean>(false);
  const firestoreSyncTimerRef = useRef<number | null>(null);
  const shellPersistTimerRef = useRef<number | null>(null);
  const latestRemoteChatRef = useRef<Record<string, any> | undefined>(undefined);
  const latestRemoteVoiceDockRef = useRef<Record<string, any> | undefined>(undefined);
  const userRef = useRef<User | null>(null);
  userRef.current = user;

  // Track window.visualViewport so touch keyboards on mobile/iFrame shrink the OS cleanly instead of hiding chat input
  useEffect(() => {
    const root = document.documentElement;
    let rafId = 0;
    let lastHeightPx = -1;
    let lastKbOpen: boolean | null = null;
    const syncViewportMetrics = () => {
      rafId = 0;
      const vv = window.visualViewport;
      const layoutH = window.innerHeight || root.clientHeight || 720;
      const visibleH = vv ? vv.height : layoutH;
      const offsetTop = vv ? vv.offsetTop : 0;
      const nextHeightPx = Math.max(240, Math.round(visibleH));
      if (nextHeightPx !== lastHeightPx) {
        lastHeightPx = nextHeightPx;
        root.style.setProperty('--sovereign-app-height', `${nextHeightPx}px`);
      }
      const activeTag = document.activeElement?.tagName;
      const isEditable =
        activeTag === 'TEXTAREA' ||
        activeTag === 'INPUT' ||
        (document.activeElement as HTMLElement | null)?.isContentEditable === true;
      const kbOpen = layoutH - visibleH > 90 || (isEditable && visibleH < 500 && layoutH > visibleH + 40);
      if (kbOpen !== lastKbOpen) {
        lastKbOpen = kbOpen;
        if (kbOpen) {
          root.setAttribute('data-keyboard-open', 'true');
        } else {
          root.removeAttribute('data-keyboard-open');
        }
      }
      if (offsetTop > 0 && window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    };

    const scheduleSync = () => {
      if (!rafId) rafId = requestAnimationFrame(syncViewportMetrics);
    };

    syncViewportMetrics();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', scheduleSync);
    vv?.addEventListener('scroll', scheduleSync);
    window.addEventListener('resize', scheduleSync);
    document.addEventListener('focusin', scheduleSync, true);
    document.addEventListener('focusout', scheduleSync, true);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      vv?.removeEventListener('resize', scheduleSync);
      vv?.removeEventListener('scroll', scheduleSync);
      window.removeEventListener('resize', scheduleSync);
      document.removeEventListener('focusin', scheduleSync, true);
      document.removeEventListener('focusout', scheduleSync, true);
      root.removeAttribute('data-keyboard-open');
    };
  }, []);

  useEffect(() => {
    const el = mainAreaRef.current;
    if (!el) return;
    let rafId = 0;
    const applySize = () => {
      rafId = 0;
      const nextWidth = Math.max(el.clientWidth, 300);
      const nextHeight = Math.max(el.clientHeight, 220);
      const activeTag = document.activeElement?.tagName;
      const isEditableFocused =
        activeTag === 'TEXTAREA' ||
        activeTag === 'INPUT' ||
        (document.activeElement as HTMLElement | null)?.isContentEditable === true;
      const vv = window.visualViewport;
      const kbAnimatingOrOpen =
        document.documentElement.hasAttribute('data-keyboard-open') ||
        Boolean(isEditableFocused && vv && Math.abs((window.innerHeight || 0) - vv.height) > 8);
      setDesktopSize((prev) => {
        if (kbAnimatingOrOpen && prev.width === nextWidth && prev.width > 0) {
          return prev;
        }
        return prev.width === nextWidth && prev.height === nextHeight
          ? prev
          : { width: nextWidth, height: nextHeight };
      });
    };
    const updateSize = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(applySize);
    };
    applySize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    const el = mainAreaRef.current;
    if (!el) return;
    el.style.setProperty('--split-left', `${splitPct}%`);
    el.style.setProperty('--split-right', `${100 - splitPct}%`);
  }, [splitPct, isSplitMode, desktopActive]);

  const buildShellSnapshot = () => ({
    activeModule,
    shellViewMode,
    openModules,
    pinnedModules,
    windowStates,
    isSplitMode,
    secondaryModule,
    splitPct,
    isChatDetached,
    detachedExtraModules,
    chatPipMinimized,
    pipMinimizedExtras,
    devMode,
    activeAccountEmail,
    persistentTalkActive,
    uiMutation
  });

  const scheduleFirestoreContinuityWrite = () => {
    const u = userRef.current;
    if (!u?.uid || !u.emailVerified) return;
    if (firestoreSyncTimerRef.current !== null) {
      window.clearTimeout(firestoreSyncTimerRef.current);
    }
    firestoreSyncTimerRef.current = window.setTimeout(() => {
      firestoreSyncTimerRef.current = null;
      const activeUser = userRef.current;
      if (!activeUser?.uid || !activeUser.emailVerified) return;
      saveOrchestratorStateToFirestore(activeUser.uid, {
        shell: buildShellSnapshot(),
        osCustomization: loadOSCustomizationProfile(),
        ...(latestRemoteChatRef.current ? { chat: latestRemoteChatRef.current } : {}),
        ...(latestRemoteVoiceDockRef.current ? { voiceDock: latestRemoteVoiceDockRef.current } : {})
      }).catch(() => {});
    }, 1800);
  };

  const flushShellLocalPersistence = useCallback(() => {
    try {
      localStorage.setItem('sovereign_os_active_module_v1', activeModule);
      localStorage.setItem('sovereign_os_shell_mode_v1', shellViewMode);
      localStorage.setItem('sovereign_os_window_states_v2', JSON.stringify(windowStates));
      localStorage.setItem('sovereign_os_open_modules_v1', JSON.stringify(openModules));
      localStorage.setItem('sovereign_os_pinned_modules_v1', JSON.stringify(pinnedModules));
      localStorage.setItem('sovereign_os_split_mode_v1', String(isSplitMode));
      localStorage.setItem('sovereign_os_secondary_module_v1', secondaryModule);
      localStorage.setItem('sovereign_os_split_pct_v1', String(splitPct));
      localStorage.setItem('sovereign_os_chat_detached_v1', String(isChatDetached));
      localStorage.setItem('sovereign_os_detached_extras_v1', JSON.stringify(detachedExtraModules));
      localStorage.setItem('sovereign_os_chat_pip_minimized_v1', String(chatPipMinimized));
      localStorage.setItem('sovereign_os_pip_minimized_extras_v1', JSON.stringify(pipMinimizedExtras));
      localStorage.setItem('aurelius_dev_mode', String(devMode));
      localStorage.setItem('aurelius_active_account', activeAccountEmail);
      localStorage.setItem('sovereign_persistent_talk_active_v1', String(persistentTalkActive));
      localStorage.setItem('sovereign_ui_mutation_v1', JSON.stringify(uiMutation));
    } catch {}

    const shellSnapshot = buildShellSnapshot();
    updateLocalBeaconSnapshot({
      settings: {
        shell: shellSnapshot
      }
    });

    if (applyingRemoteShellRef.current || !shellHydratedRef.current) return;
    try {
      localStorage.setItem('sovereign_continuity_local_updated_at_v1', new Date().toISOString());
    } catch {}
    pushContinuitySettingsPatch({ shell: shellSnapshot });
    scheduleFirestoreContinuityWrite();
  }, [
    activeModule,
    shellViewMode,
    openModules,
    pinnedModules,
    windowStates,
    isSplitMode,
    secondaryModule,
    splitPct,
    isChatDetached,
    detachedExtraModules,
    chatPipMinimized,
    pipMinimizedExtras,
    devMode,
    activeAccountEmail,
    persistentTalkActive,
    uiMutation
  ]);

  const flushShellLocalPersistenceRef = useRef(flushShellLocalPersistence);
  flushShellLocalPersistenceRef.current = flushShellLocalPersistence;

  useEffect(() => {
    if (shellPersistTimerRef.current !== null) {
      window.clearTimeout(shellPersistTimerRef.current);
    }
    shellPersistTimerRef.current = window.setTimeout(() => {
      shellPersistTimerRef.current = null;
      flushShellLocalPersistenceRef.current();
    }, 900);

    return () => {
      if (shellPersistTimerRef.current !== null) {
        window.clearTimeout(shellPersistTimerRef.current);
        shellPersistTimerRef.current = null;
      }
    };
  }, [flushShellLocalPersistence]);

  // Flush unsaved settings, active agent task checkpoint, and voice transcript on tab refresh / close / disconnect
  useEffect(() => {
    const onUnloadFlush = () => {
      if (shellPersistTimerRef.current !== null) {
        window.clearTimeout(shellPersistTimerRef.current);
        shellPersistTimerRef.current = null;
        flushShellLocalPersistenceRef.current();
      }
      flushContinuityBeacon();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        onUnloadFlush();
      }
    };
    const onSubSettingsUpdated = (ev: Event) => {
      const detail = (ev as CustomEvent)?.detail;
      if (detail?.chat && typeof detail.chat === 'object') {
        latestRemoteChatRef.current = detail.chat;
      }
      if (detail?.voiceDock && typeof detail.voiceDock === 'object') {
        latestRemoteVoiceDockRef.current = detail.voiceDock;
      }
      scheduleFirestoreContinuityWrite();
    };
    window.addEventListener('pagehide', onUnloadFlush);
    window.addEventListener('beforeunload', onUnloadFlush);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('sovereign_os_customization_changed', onSubSettingsUpdated);
    window.addEventListener('sovereign_continuity_subsettings_changed', onSubSettingsUpdated);
    return () => {
      window.removeEventListener('pagehide', onUnloadFlush);
      window.removeEventListener('beforeunload', onUnloadFlush);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('sovereign_os_customization_changed', onSubSettingsUpdated);
      window.removeEventListener('sovereign_continuity_subsettings_changed', onSubSettingsUpdated);
      if (firestoreSyncTimerRef.current !== null) {
        window.clearTimeout(firestoreSyncTimerRef.current);
        firestoreSyncTimerRef.current = null;
      }
    };
  }, []);

  const applyRemoteShellSettings = (shell: Record<string, any> | undefined, hydratedAt?: string) => {
    if (!shell || typeof shell !== 'object') return;
    applyingRemoteShellRef.current = true;
    try {
      if (hydratedAt) {
        try {
          localStorage.setItem('sovereign_continuity_local_updated_at_v1', hydratedAt);
        } catch {}
      }
      if (typeof shell.activeModule === 'string' && shell.activeModule && shell.activeModule !== activeModule) {
        setActiveModule(shell.activeModule as ModuleType);
      }
      if ((shell.shellViewMode === 'desktop' || shell.shellViewMode === 'workspace') && shell.shellViewMode !== shellViewMode) {
        setShellViewMode(shell.shellViewMode);
      }
      if (Array.isArray(shell.openModules) && shell.openModules.length > 0) {
        setOpenModules((prev) =>
          prev.length === shell.openModules.length && prev.every((v, i) => v === shell.openModules[i])
            ? prev
            : (shell.openModules as ModuleType[])
        );
      }
      if (Array.isArray(shell.pinnedModules)) {
        setPinnedModules((prev) =>
          prev.length === shell.pinnedModules.length && prev.every((v, i) => v === shell.pinnedModules[i])
            ? prev
            : (shell.pinnedModules as ModuleType[])
        );
      }
      if (shell.windowStates && typeof shell.windowStates === 'object') {
        setWindowStates(shell.windowStates);
      }
      if (typeof shell.isSplitMode === 'boolean' && shell.isSplitMode !== isSplitMode) {
        setIsSplitMode(shell.isSplitMode);
      }
      if (typeof shell.secondaryModule === 'string' && shell.secondaryModule && shell.secondaryModule !== secondaryModule) {
        setSecondaryModule(shell.secondaryModule as ModuleType);
      }
      if (typeof shell.splitPct === 'number' && shell.splitPct >= 20 && shell.splitPct <= 80 && shell.splitPct !== splitPct) {
        setSplitPct(shell.splitPct);
      }
      if (typeof shell.isChatDetached === 'boolean' && shell.isChatDetached !== isChatDetached) {
        setIsChatDetached(shell.isChatDetached);
      }
      if (Array.isArray(shell.detachedExtraModules)) {
        setDetachedExtraModules((prev) =>
          prev.length === shell.detachedExtraModules.length && prev.every((v, i) => v === shell.detachedExtraModules[i])
            ? prev
            : (shell.detachedExtraModules as ModuleType[])
        );
      }
      if (typeof shell.chatPipMinimized === 'boolean' && shell.chatPipMinimized !== chatPipMinimized) {
        setChatPipMinimized(shell.chatPipMinimized);
      }
      if (shell.pipMinimizedExtras && typeof shell.pipMinimizedExtras === 'object') {
        setPipMinimizedExtras(shell.pipMinimizedExtras);
      }
      if (typeof shell.devMode === 'boolean' && shell.devMode !== devMode) {
        setDevMode(shell.devMode);
      }
      if (typeof shell.activeAccountEmail === 'string' && shell.activeAccountEmail && shell.activeAccountEmail !== activeAccountEmail) {
        switchAccountEmail(shell.activeAccountEmail);
      }
      // Intentionally do not auto-activate persistentTalkActive on boot hydration (zero boot mic popups)
      if (shell.uiMutation && typeof shell.uiMutation.css === 'string' && shell.uiMutation.css !== uiMutation.css) {
        setUiMutation(shell.uiMutation);
      }
    } finally {
      window.setTimeout(() => {
        applyingRemoteShellRef.current = false;
      }, 0);
    }
  };

  // Initial server continuity hydration on boot (atomic disk + SQLite -> client state & subcomponents)
  useEffect(() => {
    let active = true;
    fetchServerContinuityState()
      .then((remote) => {
        if (!active) return;
        if (remote?.settings) {
          if (remote.settings.chat) latestRemoteChatRef.current = remote.settings.chat;
          if (remote.settings.voiceDock) latestRemoteVoiceDockRef.current = remote.settings.voiceDock;
          let localTs = 0;
          try {
            localTs = Date.parse(localStorage.getItem('sovereign_continuity_local_updated_at_v1') || '') || 0;
          } catch {}
          const remoteTs = Date.parse(remote.settings.updatedAt || '') || 0;
          if (!localTs || remoteTs > localTs) {
            if (remote.settings.shell && Object.keys(remote.settings.shell).length > 0) {
              applyRemoteShellSettings(remote.settings.shell, remote.settings.updatedAt);
            }
            if (remote.settings.osCustomization && Object.keys(remote.settings.osCustomization).length > 0) {
              hydrateOSCustomizationFromRemote(remote.settings.osCustomization);
            }
          } else if (localTs > remoteTs) {
            pushContinuitySettingsPatch({
              shell: buildShellSnapshot(),
              osCustomization: loadOSCustomizationProfile()
            });
          }
          window.dispatchEvent(new CustomEvent('sovereign_continuity_hydrated', { detail: remote }));
        }
        shellHydratedRef.current = true;
      })
      .catch(() => {
        shellHydratedRef.current = true;
      });
    return () => {
      active = false;
    };
  }, []);

  const getOrCreateWindowGeometry = (mod: ModuleType, indexHint = 0): OSWindowGeometry => {
    const existing = windowStates[mod];
    if (existing) {
      return clampWindowGeometry(existing, desktopSize.width, desktopSize.height);
    }
    const base = createDefaultWindowGeometry(indexHint, desktopSize.width, desktopSize.height, ++topZRef.current);
    return clampWindowGeometry(
      { ...base, x: Math.min(base.x + 110, Math.max(12, desktopSize.width - base.width - 12)) },
      desktopSize.width,
      desktopSize.height
    );
  };

  const focusDesktopWindow = (mod: ModuleType) => {
    setWindowStates((prev) => {
      const existing = prev[mod];
      if (existing && !existing.minimized && existing.zIndex >= topZRef.current) {
        return prev;
      }
      topZRef.current += 1;
      const nextZ = topZRef.current;
      const base = existing
        ? clampWindowGeometry(existing, desktopSize.width, desktopSize.height)
        : getOrCreateWindowGeometry(mod, Object.keys(prev).length);
      return {
        ...prev,
        [mod]: { ...base, zIndex: nextZ, minimized: false }
      };
    });
  };

  const handleMinimizeWindow = (mod: ModuleType) => {
    setWindowStates((prev) => {
      const base = prev[mod] || getOrCreateWindowGeometry(mod);
      return { ...prev, [mod]: { ...base, minimized: true } };
    });
    if (activeModule === mod) {
      const fallback = openModules.find((m) => m !== mod && !windowStates[m]?.minimized);
      if (fallback) setActiveModule(fallback);
    }
  };

  const handleToggleMaximizeWindow = (mod: ModuleType) => {
    topZRef.current += 1;
    const nextZ = topZRef.current;
    setWindowStates((prev) => {
      const base = prev[mod] || getOrCreateWindowGeometry(mod);
      return {
        ...prev,
        [mod]: { ...base, maximized: !base.maximized, minimized: false, zIndex: nextZ }
      };
    });
    setActiveModule(mod);
  };

  const handleSnapWindow = (mod: ModuleType, side: 'left' | 'right') => {
    topZRef.current += 1;
    const nextZ = topZRef.current;
    const halfW = Math.max(420, Math.floor((desktopSize.width - 18) / 2));
    const fullH = Math.max(320, desktopSize.height - 12);
    const x = side === 'left' ? 6 : Math.max(6, desktopSize.width - halfW - 6);
    setWindowStates((prev) => ({
      ...prev,
      [mod]: {
        x,
        y: 6,
        width: halfW,
        height: fullH,
        zIndex: nextZ,
        minimized: false,
        maximized: false
      }
    }));
    setActiveModule(mod);
  };

  const handleMoveResizeWindow = (mod: ModuleType, next: Partial<OSWindowGeometry>) => {
    setWindowStates((prev) => {
      const base = prev[mod] || getOrCreateWindowGeometry(mod);
      return {
        ...prev,
        [mod]: { ...base, ...next }
      };
    });
  };

  const handleTileWindows = () => {
    if (openModules.length === 0) return;
    const visible = openModules.filter((m) => !windowStates[m]?.minimized);
    const targets = visible.length > 0 ? visible : openModules;
    const count = targets.length;
    const cols = count <= 1 ? 1 : count <= 4 ? 2 : 3;
    const rows = Math.ceil(count / cols);
    const gap = 8;
    const usableW = Math.max(480, desktopSize.width - gap * (cols + 1));
    const usableH = Math.max(360, desktopSize.height - gap * (rows + 1));
    const cellW = Math.floor(usableW / cols);
    const cellH = Math.floor(usableH / rows);

    setWindowStates((prev) => {
      const next = { ...prev };
      targets.forEach((mod, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        topZRef.current += 1;
        next[mod] = {
          x: gap + col * (cellW + gap),
          y: gap + row * (cellH + gap),
          width: cellW,
          height: cellH,
          zIndex: topZRef.current,
          minimized: false,
          maximized: false
        };
      });
      return next;
    });
  };

  const handleCascadeWindows = () => {
    if (openModules.length === 0) return;
    setWindowStates((prev) => {
      const next = { ...prev };
      openModules.forEach((mod, idx) => {
        topZRef.current += 1;
        const base = createDefaultWindowGeometry(idx, desktopSize.width, desktopSize.height, topZRef.current);
        next[mod] = clampWindowGeometry(
          { ...base, x: Math.min(130 + (idx % 6) * 32, Math.max(12, desktopSize.width - base.width - 12)) },
          desktopSize.width,
          desktopSize.height
        );
      });
      return next;
    });
  };

  const handleMinimizeAllWindows = () => {
    setWindowStates((prev) => {
      const next = { ...prev };
      openModules.forEach((mod, idx) => {
        if ((mod === 'chat' && isChatDetached) || detachedExtraModules.includes(mod)) return;
        const base = next[mod] || getOrCreateWindowGeometry(mod, idx);
        next[mod] = { ...base, minimized: true };
      });
      return next;
    });
  };

  const [hasActivatedChat, setHasActivatedChat] = useState<boolean>(() => {
    try {
      return (
        localStorage.getItem('aurelius_infinite_workflow_active') === 'true' ||
        localStorage.getItem('sovereign_workflow_window_open_v1') === 'true'
      );
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (isChatDetached || !desktopActive || (openModules.includes('chat') && !windowStates.chat?.minimized)) {
      setHasActivatedChat(true);
    }
  }, [isChatDetached, desktopActive, openModules, windowStates.chat?.minimized]);

  useEffect(() => {
    const onWorkflowOpen = () => setHasActivatedChat(true);
    window.addEventListener('sovereign_workflow_open', onWorkflowOpen);
    return () => window.removeEventListener('sovereign_workflow_open', onWorkflowOpen);
  }, []);

  // Silently pre-warm Sovereign Chat during idle time once past login so the composer DOM is immediately ready on first tap
  useEffect(() => {
    if (hasActivatedChat || !authLoaded) return;
    if (authPolicy.requireLoginOnBoot && (!authUser || authUser.status !== 'active')) return;
    let cancelled = false;
    const warm = () => {
      if (!cancelled) setHasActivatedChat(true);
    };
    const w = window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof w.requestIdleCallback === 'function') {
      const idleId = w.requestIdleCallback(warm, { timeout: 700 });
      return () => {
        cancelled = true;
        w.cancelIdleCallback?.(idleId);
      };
    }
    const timer = window.setTimeout(warm, 380);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [hasActivatedChat, authLoaded, authPolicy.requireLoginOnBoot, authUser]);

  const restoreAndFocusChatComposerSync = useCallback((focusInput = true) => {
    setHasActivatedChat(true);
    if (typeof document === 'undefined') return;
    const winEl = document.getElementById('sovereign-window-chat');
    if (winEl && winEl.classList.contains('hidden')) {
      winEl.classList.remove('hidden');
      winEl.removeAttribute('aria-hidden');
    }
    if (!focusInput) return;
    const focusNow = () => {
      const inputEl = document.getElementById('sovereign-chat-composer-input') as HTMLTextAreaElement | null;
      if (inputEl && document.activeElement !== inputEl) {
        try {
          inputEl.focus({ preventScroll: true });
        } catch {
          inputEl.focus();
        }
      }
    };
    focusNow();
    requestAnimationFrame(focusNow);
  }, []);

  const handleSelectOSModule = (mod: ModuleType) => {
    if (authUser && !canUserAccessModule(authUser, mod)) {
      showOsToast(`Access restricted: your account does not have permission for "${mod}".`);
      return;
    }
    if (mod === 'chat') {
      restoreAndFocusChatComposerSync(true);
    }
    setOpenModules((prev) => (prev.includes(mod) ? prev : [...prev, mod]));
    if (mod === 'chat' && isChatDetached) {
      setChatPipMinimized((cur) => (cur ? false : cur));
    } else if (detachedExtraModules.includes(mod)) {
      setPipMinimizedExtras((p) => (p[mod] ? { ...p, [mod]: false } : p));
    }
    if (!desktopActive && isSplitMode && mod === secondaryModule) {
      setSecondaryModule(activeModule);
    }
    focusDesktopWindow(mod);
    if (!((isChatDetached && !desktopActive && mod === 'chat') || (!desktopActive && detachedExtraModules.includes(mod)))) {
      if (activeModule !== mod) {
        setActiveModule(mod);
      }
    }
  };

  const handleCloseOpenModule = (mod: ModuleType) => {
    if (mod === 'chat' && isChatDetached) {
      handleToggleDetachChat(false);
      return;
    }
    if (detachedExtraModules.includes(mod)) {
      handleToggleDetachModule(mod, false);
      return;
    }
    if (!desktopActive && openModules.length <= 1) return;
    const nextOpen = openModules.filter((m) => m !== mod);
    setOpenModules(nextOpen);
    if (activeModule === mod && nextOpen[0]) {
      setActiveModule(nextOpen[0]);
    }
    if (!desktopActive && isSplitMode && secondaryModule === mod) {
      const fallback = nextOpen.find((m) => m !== activeModule) || 'chat';
      if (fallback === activeModule) setIsSplitMode(false);
      else setSecondaryModule(fallback);
    }
  };

  const handleTogglePinModule = (mod: ModuleType) => {
    setPinnedModules((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    );
  };

  const handleToggleSplitMode = (force?: boolean) => {
    const next = typeof force === 'boolean' ? force : !isSplitMode;
    if (next) {
      setShellViewMode('workspace');
      const pickedSecondary =
        secondaryModule !== activeModule
          ? secondaryModule
          : activeModule === 'chat'
          ? 'browser'
          : 'chat';
      setSecondaryModule(pickedSecondary);
      setOpenModules((prev) => {
        const nextList = [...prev];
        if (!nextList.includes(activeModule)) nextList.push(activeModule);
        if (!nextList.includes(pickedSecondary)) nextList.push(pickedSecondary);
        return nextList;
      });
    }
    setIsSplitMode(next);
  };

  const handleSetSecondaryModule = (mod: ModuleType) => {
    if (mod === activeModule) return;
    setOpenModules((prev) => (prev.includes(mod) ? prev : [...prev, mod]));
    setSecondaryModule(mod);
  };

  const handleSwapSplitPanes = () => {
    if (!isSplitMode) return;
    const prevPrimary = activeModule;
    setActiveModule(secondaryModule);
    setSecondaryModule(prevPrimary);
  };

  const handleLaunchSplitPreset = (primary: ModuleType, secondary: ModuleType) => {
    setOpenModules((prev) => {
      const next = [...prev];
      if (!next.includes(primary)) next.push(primary);
      if (!next.includes(secondary)) next.push(secondary);
      return next;
    });
    setActiveModule(primary);
    setSecondaryModule(secondary);
    setShellViewMode('workspace');
    setIsSplitMode(true);
  };

  const handleToggleDevMode = () => {
    const next = !devMode;
    setDevMode(next);
    localStorage.setItem('aurelius_dev_mode', String(next));
  };

  const handleSwitchAccountEmail = (email: string) => {
    switchAccountEmail(email);
    localStorage.setItem('aurelius_active_account', email);
  };

  // Global Keyboard Shortcuts: Ctrl+K Command Palette + Sovereign OS Hotkeys (Alt+1..4 Workspaces, Alt+/, Alt+B, Alt+L, Alt+D, Alt+P/C, Alt+T, Alt+W, Alt+M, Alt+`)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      } else if (e.altKey && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        const wsNum = Number(e.key) as 1 | 2 | 3 | 4;
        import('./utils/osCustomizationStore').then(({ saveOSCustomizationProfile }) => {
          const updated = saveOSCustomizationProfile({ activeWorkspace: wsNum });
          showOsToast(`Virtual Desktop ${wsNum}: ${updated.workspaceNames[wsNum - 1]}`);
        });
      } else if (e.altKey && e.key === '/') {
        e.preventDefault();
        handleToggleSplitMode();
      } else if (e.altKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        handleTileWindows();
        showOsToast('Tiled Open Windows Grid');
      } else if (e.altKey && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        handleSelectOSModule('browser');
      } else if (e.altKey && (e.key === 'w' || e.key === 'W')) {
        e.preventDefault();
        handleSelectOSModule('crypto-wallet');
      } else if (e.altKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        handleSelectOSModule('macro-telemetry');
      } else if (e.altKey && e.key === '`') {
        e.preventDefault();
        handleSelectOSModule('terminal');
      } else if (e.altKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        setIsOSLauncherOpen(prev => !prev);
      } else if (e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        setShellViewMode('desktop');
        handleMinimizeAllWindows();
      } else if (e.altKey && (e.key === 'p' || e.key === 'P' || e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        handleToggleDetachChat();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activeModule, secondaryModule, isSplitMode]);

  const handleNavigateUrlInBrowser = (url: string) => {
    const clean = String(url || '').trim();
    if (!clean) return;
    const seq = ++browserNavSeqRef.current;
    setBrowserTargetUrl(clean);
    setBrowserNavRequest({ seq, action: 'navigate', url: clean });
    handleSelectOSModule('browser');
  };

  const handleTriggerEngineeringEngine = async () => {
    try {
      await apiFetch('/api/sovereign-engineer/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'audit-codebase', directive: 'Sovereign Self-Continuity Audit' })
      });
    } catch (e) {
      console.warn('Engineering engine notice:', e);
    }
  };

  // Sync authenticated Firebase user profile cleanly and monitor Cloud Firestore connectivity
  useEffect(() => {
    let active = true;

    const verifyFirestoreReachability = async () => {
      const status = await measureFirestoreLatency();
      if (active) {
        setFirebaseOnline(status.connected);
      }
    };

    verifyFirestoreReachability();
    const heartbeat = setInterval(verifyFirestoreReachability, 15000);
    const handleOnline = () => verifyFirestoreReachability();
    const handleOffline = () => {
      if (active) setFirebaseOnline(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        await verifyFirestoreReachability();
        return;
      }

      // Bridge verified Google Firebase Auth user into our server RBAC session seamlessly
      if (currentUser.emailVerified) {
        const curServerUser = authUserRef.current;
        if (!curServerUser || (curServerUser.authProvider === 'google' && curServerUser.firebaseUid !== currentUser.uid)) {
          try {
            const idToken = await currentUser.getIdToken();
            const sessionRes = await loginWithGoogleToken(idToken);
            if (active) applyAuthSessionResponse(sessionRes);
          } catch (bridgeErr) {
            console.warn('[Auth] Google Authority sync note:', bridgeErr instanceof Error ? bridgeErr.message : String(bridgeErr));
          }
        }
      }

      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const { getDoc } = await import('firebase/firestore');
        const existingSnap = await getDoc(userRef);
        const existingData = existingSnap.exists() ? existingSnap.data() : null;
        await setDoc(userRef, {
          uid: currentUser.uid,
          email: currentUser.email || '',
          displayName: currentUser.displayName || currentUser.email || 'Sovereign Architect',
          photoURL: currentUser.photoURL || '',
          role: existingData?.role === 'admin' ? 'admin' : 'user',
          updatedAt: new Date().toISOString(),
          createdAt: existingData?.createdAt || currentUser.metadata?.creationTime || new Date().toISOString()
        }, { merge: true });
        if (active) setFirebaseOnline(true);

        if (currentUser.emailVerified) {
          try {
            const remoteCloud = await loadOrchestratorStateFromFirestore(currentUser.uid);
            let localTs = 0;
            try {
              localTs = Date.parse(localStorage.getItem('sovereign_continuity_local_updated_at_v1') || '') || 0;
            } catch {}
            const cloudTs = remoteCloud?.updatedAt ? Date.parse(remoteCloud.updatedAt) || 0 : 0;

            if (remoteCloud?.snapshot && (!localTs || cloudTs > localTs)) {
              if (remoteCloud.snapshot.shell) {
                applyRemoteShellSettings(remoteCloud.snapshot.shell, remoteCloud.updatedAt);
              }
              if (remoteCloud.snapshot.osCustomization) {
                hydrateOSCustomizationFromRemote(remoteCloud.snapshot.osCustomization);
              }
              pushContinuitySettingsPatch({
                shell: remoteCloud.snapshot.shell,
                osCustomization: remoteCloud.snapshot.osCustomization,
                chat: remoteCloud.snapshot.chat,
                voiceDock: remoteCloud.snapshot.voiceDock
              });
              window.dispatchEvent(
                new CustomEvent('sovereign_continuity_hydrated', {
                  detail: {
                    settings: {
                      updatedAt: remoteCloud.updatedAt,
                      shell: remoteCloud.snapshot.shell || {},
                      osCustomization: remoteCloud.snapshot.osCustomization || {},
                      chat: remoteCloud.snapshot.chat || {},
                      voiceDock: remoteCloud.snapshot.voiceDock || {}
                    }
                  }
                })
              );
            } else {
              await saveOrchestratorStateToFirestore(currentUser.uid, {
                shell: buildShellSnapshot(),
                osCustomization: loadOSCustomizationProfile(),
                ...(latestRemoteChatRef.current ? { chat: latestRemoteChatRef.current } : {}),
                ...(latestRemoteVoiceDockRef.current ? { voiceDock: latestRemoteVoiceDockRef.current } : {})
              });
            }
          } catch (cloudErr) {
            console.warn(
              '[Firestore] Orchestrator continuity sync note:',
              cloudErr instanceof Error ? cloudErr.message : String(cloudErr)
            );
          }
        }
      } catch (err) {
        await verifyFirestoreReachability();
        console.warn('[Firestore] Profile sync deferred:', err instanceof Error ? err.message : String(err));
      }
    });

    return () => {
      active = false;
      clearInterval(heartbeat);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  // Listen to authenticated User's Firestore artifacts collection in real-time
  useEffect(() => {
    if (!user?.uid) return;

    const artifactsRef = collection(db, 'users', user.uid, 'artifacts');
    const unsubscribe = onSnapshot(artifactsRef, (snapshot) => {
      const loaded: Artifact[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        let parsedMetadata: any = undefined;
        if (data.metadataJson) {
          if (typeof data.metadataJson === 'object') {
            parsedMetadata = data.metadataJson;
          } else if (typeof data.metadataJson === 'string') {
            try { parsedMetadata = JSON.parse(data.metadataJson); } catch (_) { parsedMetadata = undefined; }
          }
        }
        loaded.push({
          id: docSnap.id,
          type: data.type,
          title: data.title,
          prompt: data.prompt,
          model: data.model,
          mediaUrl: data.mediaUrl,
          metadata: parsedMetadata,
          createdAt: data.createdAt || new Date().toLocaleDateString()
        });
      });
      setArtifacts(loaded);
      setFirebaseOnline(true);
    }, (err) => {
      setFirebaseOnline(false);
      console.warn('[Firestore] Artifact listener error:', err?.message || err);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Listen to authenticated User's Firestore ledger collection
  useEffect(() => {
    if (!user?.uid) return;
    const ledgerRef = collection(db, 'users', user.uid, 'audit_ledger');
    const unsubscribe = onSnapshot(query(ledgerRef, orderBy('timestamp', 'desc')), (snapshot) => {
      const loaded: AuditLedgerItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        loaded.push({
          id: docSnap.id,
          timestamp: data.timestamp,
          subsystem: data.subsystem,
          action: data.action,
          payload: data.payload,
          result: data.result,
          proofHash: data.proofHash,
          status: data.status
        });
      });
      setLedger(loaded);
    }, (err) => {
      console.warn('[Firestore] Ledger listener error:', err?.message || err);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  // Unified save-to-vault action
  const handleSaveToVault = async (
    type: 'music' | 'image' | 'video' | 'transcription' | 'voice' | 'spatial' | 'knowledge' | 'dossier',
    title: string,
    prompt: string,
    model: string,
    mediaUrl?: string,
    metadataJson?: string
  ) => {
    const newArtifact: Artifact = {
      id: `art-${Date.now()}`,
      type,
      title,
      prompt,
      model,
      mediaUrl,
      createdAt: new Date().toLocaleString()
    };

    setArtifacts(prev => [newArtifact, ...prev]);

    if (user) {
      try {
        const artifactsRef = collection(db, 'users', user.uid, 'artifacts');
        await addDoc(artifactsRef, {
          userId: user.uid,
          type,
          title,
          prompt,
          model,
          mediaUrl: mediaUrl || '',
          metadataJson: metadataJson || JSON.stringify({ savedAt: new Date().toISOString() }),
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/artifacts`);
      }
    }
  };

  const handleDeleteArtifact = async (id: string) => {
    setArtifacts(prev => prev.filter(a => a.id !== id));
    if (user) {
      try {
        const docRef = doc(db, 'users', user.uid, 'artifacts', id);
        await deleteDoc(docRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/artifacts/${id}`);
      }
    }
  };

  // Sync live OS desktop/window telemetry into OrchestratorRuntime for every AI turn
  useEffect(() => {
    const minList = openModules.filter((m) => windowStates[m]?.minimized);
    orchestratorRuntime.syncContext({
      openModules,
      minimizedModules: minList,
      isChatDetached,
      shellViewMode
    });
  }, [openModules, windowStates, isChatDetached, shellViewMode]);

  const osCommandRef = useRef<(detail: any) => void>(() => {});
  osCommandRef.current = (detail: any) => {
    if (!detail || !detail.action) return;
    const action = String(detail.action).trim();
    const resolveModuleAlias = (raw?: any): ModuleType | undefined => {
      if (!raw) return undefined;
      const k = String(raw).trim().toLowerCase().replace(/\s+/g, '-');
      const map: Record<string, ModuleType> = {
        chrome: 'browser',
        'sovereign-browser': 'browser',
        'sovereign-chrome': 'browser',
        web: 'browser',
        internet: 'browser',
        files: 'file-manager',
        explorer: 'file-manager',
        'file-explorer': 'file-manager',
        file_manager: 'file-manager',
        shell: 'terminal',
        cli: 'terminal',
        console: 'terminal',
        research: 'search',
        'web-search': 'search',
        tools: 'tool-shed',
        forge: 'tool-shed',
        telemetry: 'macro-telemetry',
        wallets: 'crypto-wallet',
        wallet: 'crypto-wallet',
        spatial: 'spatial-arena',
        arena: 'spatial-arena',
        distillery: 'ai-genesis-distillery',
        genesis: 'ai-genesis-distillery',
        sos: 'lora-mesh',
        'sos-mesh': 'lora-mesh',
        sosmesh: 'lora-mesh',
        lora: 'lora-mesh',
        mesh: 'lora-mesh',
        discord: 'lora-mesh',
        admin: 'admin-command',
        'admin-command': 'admin-command',
        'command-center': 'admin-command',
        'sovereign-command': 'admin-command',
        batch: 'batch-processor',
        'batch-processor': 'batch-processor',
        queue: 'batch-processor'
      };
      return map[k] || (String(raw).trim() as ModuleType);
    };
    const targetMod = resolveModuleAlias(detail.targetModule || detail.module);
    const secMod = resolveModuleAlias(detail.secondaryModule);

    switch (action) {
      case 'open_window':
      case 'restore_window': {
        if (targetMod) {
          handleSelectOSModule(targetMod);
          showOsToast(`OS Opened: ${targetMod}`);
        }
        break;
      }
      case 'close_window': {
        if (targetMod) {
          handleCloseOpenModule(targetMod);
          showOsToast(`OS Closed: ${targetMod}`);
        }
        break;
      }
      case 'minimize_window': {
        if (targetMod) {
          if (targetMod === 'chat' && isChatDetached) setChatPipMinimized(true);
          else handleMinimizeWindow(targetMod);
          showOsToast(`OS Minimized: ${targetMod}`);
        }
        break;
      }
      case 'maximize_window': {
        if (targetMod) {
          setOpenModules((prev) => (prev.includes(targetMod) ? prev : [...prev, targetMod]));
          handleToggleMaximizeWindow(targetMod);
          showOsToast(`OS Maximized: ${targetMod}`);
        }
        break;
      }
      case 'snap_left':
      case 'snap_right': {
        if (targetMod) {
          setShellViewMode('desktop');
          setOpenModules((prev) => (prev.includes(targetMod) ? prev : [...prev, targetMod]));
          handleSnapWindow(targetMod, action === 'snap_left' ? 'left' : 'right');
          showOsToast(`OS Snapped ${action === 'snap_left' ? 'Left' : 'Right'}: ${targetMod}`);
        }
        break;
      }
      case 'tile_windows':
        setShellViewMode('desktop');
        setTimeout(() => handleTileWindows(), 20);
        showOsToast('OS Windows Tiled');
        break;
      case 'cascade_windows':
        setShellViewMode('desktop');
        setTimeout(() => handleCascadeWindows(), 20);
        showOsToast('OS Windows Cascaded');
        break;
      case 'show_desktop':
        setShellViewMode('desktop');
        handleMinimizeAllWindows();
        showOsToast('Show Desktop');
        break;
      case 'detach_chat':
        handleToggleDetachChat(true);
        break;
      case 'dock_chat':
        handleToggleDetachChat(false);
        break;
      case 'set_shell_mode':
        if (detail.shellMode === 'desktop' || detail.shellMode === 'workspace') {
          setShellViewMode(detail.shellMode);
          showOsToast(`OS Mode: ${detail.shellMode}`);
        }
        break;
      case 'open_split':
        handleLaunchSplitPreset(targetMod || activeModule, secMod || 'browser');
        showOsToast(`OS Split: ${(targetMod || activeModule)} + ${(secMod || 'browser')}`);
        break;
      case 'close_split':
        setIsSplitMode(false);
        break;
      case 'open_start_menu':
        setIsOSLauncherOpen(true);
        break;
      case 'close_start_menu':
        setIsOSLauncherOpen(false);
        break;
      case 'browser_navigate':
      case 'browser_new_tab':
      case 'browser_search': {
        const navUrl = detail.url ? String(detail.url).trim() : undefined;
        const navQuery = detail.query
          ? String(detail.query).trim()
          : (!navUrl && detail.command ? String(detail.command).trim() : undefined);
        const navTarget =
          action === 'browser_search' && navQuery && !/^https?:\/\//i.test(navQuery)
            ? `https://www.google.com/search?q=${encodeURIComponent(navQuery)}`
            : navUrl || navQuery;
        const seq = ++browserNavSeqRef.current;
        if (navTarget) {
          setBrowserTargetUrl(navTarget);
        }
        setBrowserNavRequest({
          seq,
          action:
            action === 'browser_new_tab'
              ? 'newtab'
              : action === 'browser_search'
              ? 'search'
              : 'navigate',
          url: navTarget,
          query: navQuery
        });
        handleSelectOSModule('browser');
        if (isChatDetached) setChatPipMinimized(false);
        showOsToast(`Chrome -> ${navQuery || navTarget || 'New Tab'}`);
        break;
      }
      case 'files_open_path':
        handleSelectOSModule('file-manager');
        if (isChatDetached) setChatPipMinimized(false);
        showOsToast(`Files -> ${detail.path || 'Workspace'}`);
        break;
      case 'terminal_exec':
        handleSelectOSModule('terminal');
        if (isChatDetached) setChatPipMinimized(false);
        showOsToast(`Shell $ ${detail.command || ''}`);
        break;
      default:
        break;
    }
  };

  // 🔓 Permanent Resident Coordinator Navigation & Autonomous OS Control Bus
  useEffect(() => {
    const handleCoordinateNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<{ module?: ModuleType }>;
      if (customEvent?.detail?.module) {
        handleSelectOSModule(customEvent.detail.module);
      }
    };
    const handleMutateUi = (e: Event) => {
      const customEvent = e as CustomEvent<{ css?: string; htmlPatch?: string }>;
      if (customEvent?.detail) {
        setUiMutation({
          css: customEvent.detail.css || '',
          htmlPatch: customEvent.detail.htmlPatch
        });
      }
    };
    const handleOsCommand = (e: Event) => {
      const detail = (e as CustomEvent<any>)?.detail;
      osCommandRef.current(detail);
    };
    window.addEventListener('aurelius_coordinate_navigate', handleCoordinateNavigate);
    window.addEventListener('aurelius_mutate_ui', handleMutateUi);
    window.addEventListener('sovereign_os_command', handleOsCommand);

    (window as any).__SOVEREIGN_OS__ = {
      executeCommand: (cmd: Record<string, any>) => osCommandRef.current(cmd),
      detachChat: (enable = true) => handleToggleDetachChat(enable),
      openWindow: (mod: ModuleType) => handleSelectOSModule(mod),
      closeWindow: (mod: ModuleType) => handleCloseOpenModule(mod),
      minimizeWindow: (mod: ModuleType) => handleMinimizeWindow(mod),
      maximizeWindow: (mod: ModuleType) => handleToggleMaximizeWindow(mod),
      snapWindow: (mod: ModuleType, side: 'left' | 'right') => handleSnapWindow(mod, side),
      tileWindows: handleTileWindows,
      cascadeWindows: handleCascadeWindows,
      showDesktop: handleMinimizeAllWindows,
      setShellMode: (mode: OSShellViewMode) => setShellViewMode(mode),
      getState: () => ({ activeModule, openModules, isChatDetached, shellViewMode, isSplitMode, secondaryModule })
    };

    (window as any).__AURELIUS_ORCHESTRATOR__ = {
      residentBrain: 'Lyrailius Omega (gemini-4-hydrogen)',
      fullAutonomy: true,
      autonomyAlwaysOn: true,
      tokenLimitersRemoved: true,
      navigate: (mod: ModuleType) => handleSelectOSModule(mod),
      mutateUi: (css: string, htmlPatch?: string) => setUiMutation({ css, htmlPatch }),
      coordinate: coordinateSubsystem,
      controlOS: (cmd: Record<string, any>) => osCommandRef.current(cmd),
      orchestrate: async (directive: string, targetModule?: ModuleType) => {
        const res = await apiFetch('/api/orchestrator/dispatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'orchestrate',
            module: targetModule || activeModule,
            command: directive
          })
        });
        return res.json();
      },
      dispatchBatch: (actions: Array<{ action: string; module?: string; command?: string; options?: any; payload?: any }>) =>
        orchestratorRuntime.dispatchBatch(actions),
      runDreamCycle: (focusTopic?: string, forgeIfHelpful: boolean = true) =>
        orchestratorRuntime.runDreamCycle(focusTopic, forgeIfHelpful),
      runSelfHeal: (maxRounds: number = 6) =>
        orchestratorRuntime.runSelfHeal(maxRounds),
      forgeTool: (prompt: string, name?: string, category?: string) =>
        orchestratorRuntime.forgeTool(prompt, name, category),
      executeTool: (toolIdOrName: string, args: Record<string, any> = {}) =>
        orchestratorRuntime.executeTool(toolIdOrName, args),
      runAutonomyAudit: () =>
        orchestratorRuntime.runAutonomyAudit(),
      runFullAutonomyPipeline: () =>
        autonomousSelfImprovement.runFullAutonomyPipeline(),
      getResidentBrainState: getResidentState,
      getActiveModule: () => activeModule,
      getAllModules: () => getResidentState().registeredSubsystems,
      getOpenWindows: () => ({ openModules, activeModule, isSplitMode, secondaryModule, isChatDetached, shellViewMode }),
      openSplit: (primary: ModuleType, secondary: ModuleType) => handleLaunchSplitPreset(primary, secondary),
      closeSplit: () => setIsSplitMode(false),
      executeOnDevice: async (command: string) => {
        const res = await apiFetch('/api/orchestrator/dispatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'system-exec', command })
        });
        return res.json();
      },
      triggerHardware: async (type: string, payload?: any) => {
        const res = await apiFetch('/api/orchestrator/dispatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'hardware', options: { type, payload } })
        });
        return res.json();
      }
    };

    return () => {
      window.removeEventListener('aurelius_coordinate_navigate', handleCoordinateNavigate);
      window.removeEventListener('aurelius_mutate_ui', handleMutateUi);
      window.removeEventListener('sovereign_os_command', handleOsCommand);
    };
  }, [activeModule, openModules, isChatDetached, shellViewMode, setActiveModule, setUiMutation, coordinateSubsystem, getResidentState]);

  const renderStandardModuleContent = (mod: ModuleType) => {
    switch (mod) {
      case 'search':
        return <GroundingModule initialMode="search" onSaveToVault={handleSaveToVault} />;
      case 'maps':
        return <GroundingModule initialMode="maps" onSaveToVault={handleSaveToVault} />;
      case 'music':
        return (
          <MusicModule
            onSaveToVault={(title, prompt, model, audioUrl) =>
              handleSaveToVault('music', title, prompt, model, audioUrl)
            }
          />
        );
      case 'image':
        return (
          <ImageModule
            onSaveToVault={(title, prompt, model, mediaUrl) =>
              handleSaveToVault('image', title, prompt, model, mediaUrl)
            }
          />
        );
      case 'video':
        return (
          <VideoModule
            onSaveToVault={(title, prompt, model, mediaUrl) =>
              handleSaveToVault('video', title, prompt, model, mediaUrl)
            }
          />
        );
      case 'spatial-arena':
        return <SpatialArenaModule userId={user?.uid} onSaveToVault={handleSaveToVault} />;
      case 'transcribe':
        return (
          <TranscribeModule
            onSaveToVault={(title, prompt, model, transcript) =>
              handleSaveToVault('transcription', title, prompt, model, transcript)
            }
          />
        );
      case 'live':
        return <LiveVoiceModule onSaveToVault={handleSaveToVault} onSelectModule={handleSelectOSModule} />;
      case 'vault':
        return <VaultModule artifacts={artifacts} onDeleteArtifact={handleDeleteArtifact} userId={user?.uid} />;
      case 'audit':
        return <AuditLedgerModule ledger={ledger} />;
      case 'github':
        return <GitHubModule />;
      case 'war-room':
        return <WarRoomModule />;
      case 'scratchpad':
        return (
          <ScratchpadModule
            onInjectIntoChat={handleInjectIntoChat}
            onSaveToVault={(title, content, model) =>
              handleSaveToVault('knowledge', title, content, model, undefined, JSON.stringify({ category: 'scratchpad' }))
            }
          />
        );
      case 'hitl':
        return <HITLWorkflowModule />;
      case 'termux':
        return <TermuxEdgeModule />;
      case 'osint':
        return (
          <OSINTModule
            userId={user?.uid}
            onSaveToVault={(artifact) =>
              handleSaveToVault((artifact.type as any) || 'knowledge', artifact.title, artifact.prompt, artifact.model, undefined, artifact.metadataJson)
            }
            onInjectIntoChat={handleInjectIntoChat}
            onNavigateToModule={handleSelectOSModule}
          />
        );
      case 'burner-mail':
        return (
          <BurnerMailModule
            userId={user?.uid}
            onSaveToVault={(type, title, prompt, model, mediaUrl, metadataJson) =>
              handleSaveToVault(type, title, prompt, model, mediaUrl, metadataJson)
            }
            onNavigateUrlInBrowser={handleNavigateUrlInBrowser}
          />
        );
      case 'infinite-sim':
        return (
          <InfiniteSimModule
            onSaveToVault={(type, title, prompt, model, mediaUrl, metadataJson) =>
              handleSaveToVault(type, title, prompt, model, mediaUrl, metadataJson)
            }
            onInjectToChat={handleInjectIntoChat}
            onNavigateUrlInBrowser={handleNavigateUrlInBrowser}
          />
        );
      case 'functions':
        return (
          <FunctionDeckModule
            onSaveToVault={(title, content, model) => handleSaveToVault('knowledge', title, content, model)}
          />
        );
      case 'projects':
        return <UnifiedProjectsModule />;
      case 'presets':
        return (
          <PromptPresetsModule
            onSelectModule={handleSelectOSModule}
            onInjectPromptToChat={handleInjectIntoChat}
          />
        );
      case 'swarm-test':
        return <SwarmDiagnosticModule onSelectModule={handleSelectOSModule} />;
      case 'crypto-wallet':
        return (
          <SovereignCryptoWalletModule
            onSelectModule={handleSelectOSModule}
            onInjectIntoChat={handleInjectIntoChat}
          />
        );
      case 'grant-hunter':
        return (
          <div className="flex-1 h-full overflow-y-auto bg-zinc-950 p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-800/80">
                <div className="text-xs font-mono text-zinc-400">
                  Standalone Non-Reciprocal Grant Hunter · Linked to your Real Agentic Treasury Mainnet Addresses
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectOSModule('crypto-wallet')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold cursor-pointer"
                >
                  Open Crypto Wallets →
                </button>
              </div>
              <AutonomousGrantEnginePanel />
            </div>
          </div>
        );
      case 'transfer-hub':
        return <TransferHubModule onNavigateModule={handleSelectOSModule} />;
      case 'batch-processor':
        return <BatchProcessorModule onSelectModule={handleSelectOSModule} onInjectIntoChat={handleInjectIntoChat} />;
      case 'packager':
        return <PackagerModule />;
      case 'drive':
        return <GoogleDriveModule />;
      case 'tasks':
        return <GoogleTasksModule onInjectIntoChat={handleInjectIntoChat} />;
      case 'integrations':
        return <SovereignIntegrationsHub onSelectModule={handleSelectOSModule} onInjectIntoChat={handleInjectIntoChat} />;
      case 'api-secrets':
        return <ApiSecretsModule />;
      case 'knowledge-graph':
        return (
          <KnowledgeGraphModule
            onSaveToVault={(title, content, model) => handleSaveToVault('knowledge', title, content, model)}
            onInjectIntoChat={handleInjectIntoChat}
          />
        );
      case 'tool-shed':
        return (
          <ToolShedModule
            onSaveToVault={(title, content, model) => handleSaveToVault('knowledge', title, content, model)}
            onInjectIntoChat={handleInjectIntoChat}
          />
        );
      case 'autonomy-supervisor':
        return <AutonomySupervisorModule onSelectModule={handleSelectOSModule} onInjectIntoChat={handleInjectIntoChat} />;
      case 'agent-dev-kit':
        return <AgentDevKitModule onSelectModule={handleSelectOSModule} onInjectIntoChat={handleInjectIntoChat} />;
      case 'ai-genesis-distillery':
        return (
          <AIGenesisDistilleryModule
            onSelectModule={handleSelectOSModule}
            onInjectIntoChat={handleInjectIntoChat}
            onSaveToVault={handleSaveToVault}
          />
        );
      case 'world-start':
        return (
          <WorldLoadStartScreen
            onBack={() => handleSelectOSModule('chat')}
            onEnterWorld={() => handleSelectOSModule('spatial-arena')}
            onOpenEmulator={() => handleSelectOSModule('emulator-modder')}
            onOpenModder={() => handleSelectOSModule('emulator-modder')}
            onDownloadVault={() => {
              const link = document.createElement('a');
              link.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ applet: 'Aetherion Eternal', exportedAt: new Date().toISOString() }, null, 2));
              link.download = 'aetherion_eternal_world_backup.json';
              link.click();
            }}
          />
        );
      case 'emulator-modder':
        return <UniversalEmulatorModderModule onSelectModule={handleSelectOSModule} onInjectIntoChat={handleInjectIntoChat} />;
      case 'macro-telemetry':
        return <MacroTelemetryModule onSelectModule={handleSelectOSModule} onInjectIntoChat={handleInjectIntoChat} />;
      case 'file-manager':
        return <SovereignFilesModule authUser={authUser} onSelectModule={handleSelectOSModule} onInjectToChat={handleInjectIntoChat} />;
      case 'terminal':
        return <SovereignTerminalModule onSelectModule={handleSelectOSModule} onInjectToChat={handleInjectIntoChat} />;
      case 'task-manager':
        return <SovereignTaskManagerModule />;
      case 'os-settings':
        return (
          <SovereignOSSettingsModule
            shellViewMode={shellViewMode}
            onChangeShellViewMode={setShellViewMode}
            onSelectModule={handleSelectOSModule}
          />
        );
      case 'download-models':
        return <DownloadModelsModule />;
      case 'universal-installer':
        return (
          <UniversalInstallerModule
            onSelectModule={handleSelectOSModule}
            onOpenUrlInBrowser={handleNavigateUrlInBrowser}
          />
        );
      case 'lora-mesh':
        return <LoRaMeshChatModule currentUser={authUser} />;
      case 'admin-command':
        return (
          <AdminSovereignCommandCenter
            currentUser={authUser}
            onSelectModule={handleSelectOSModule}
            onRefreshSession={refreshAuthSession}
          />
        );
      default:
        return null;
    }
  };

  const startSplitDividerDrag = (e: React.PointerEvent) => {
    if (e.button !== 0 || !mainAreaRef.current) return;
    e.preventDefault();
    setIsDraggingSplit(true);
    const rect = mainAreaRef.current.getBoundingClientRect();

    const onMove = (moveEvt: PointerEvent) => {
      if (!rect.width) return;
      const pct = Math.round(((moveEvt.clientX - rect.left) / rect.width) * 100);
      setSplitPct(Math.max(25, Math.min(75, pct)));
    };

    const onUp = () => {
      setIsDraggingSplit(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const getPaneSizingClass = (paneRole: 'primary' | 'secondary') => {
    if (!isSplitMode) {
      return paneRole === 'primary' ? 'flex flex-1 min-w-0 min-h-0 flex-col' : 'hidden';
    }
    if (paneRole === 'primary') {
      return 'flex flex-col min-w-0 min-h-0 flex-1 lg:flex-none lg:w-[var(--split-left,50%)]';
    }
    return 'hidden lg:flex flex-col min-w-0 min-h-0 lg:flex-1';
  };

  const isChatVisible = activeModule === 'chat' || (isSplitMode && secondaryModule === 'chat');
  const chatRole: 'primary' | 'secondary' = activeModule === 'chat' ? 'primary' : 'secondary';
  const isBrowserDetached = detachedExtraModules.includes('browser');
  const isBrowserMounted = openModules.includes('browser') || activeModule === 'browser' || (isSplitMode && secondaryModule === 'browser') || isBrowserDetached;
  const isBrowserVisible = activeModule === 'browser' || (isSplitMode && secondaryModule === 'browser');
  const browserRole: 'primary' | 'secondary' = activeModule === 'browser' ? 'primary' : 'secondary';

  const minimizedModules = openModules.filter((m) => windowStates[m]?.minimized);
  const nonPersistentOpenModules = openModules.filter((m) => m !== 'chat' && m !== 'browser');

  const osBarNode = (
    <SovereignOSBar
      activeModule={activeModule}
      openModules={openModules}
      minimizedModules={minimizedModules}
      pinnedModules={pinnedModules}
      shellViewMode={shellViewMode}
      onChangeShellViewMode={(mode) => {
        setShellViewMode(mode);
        if (mode === 'workspace' && openModules.length > 0 && !openModules.includes(activeModule)) {
          setActiveModule(openModules[0]);
        }
      }}
      onSelectModule={handleSelectOSModule}
      onCloseOpenModule={handleCloseOpenModule}
      onTogglePinModule={handleTogglePinModule}
      isSplitMode={isSplitMode}
      secondaryModule={secondaryModule}
      splitRatio={splitRatio}
      onToggleSplitMode={handleToggleSplitMode}
      onSetSecondaryModule={handleSetSecondaryModule}
      onSwapSplitPanes={handleSwapSplitPanes}
      onToggleSplitRatio={() => {
        setSplitRatio((prev) => {
          const next = prev === '50-50' ? '60-40' : '50-50';
          setSplitPct(next === '50-50' ? 50 : 60);
          return next;
        });
      }}
      onLaunchSplitPreset={handleLaunchSplitPreset}
      onTileWindows={handleTileWindows}
      onCascadeWindows={handleCascadeWindows}
      onMinimizeAllWindows={handleMinimizeAllWindows}
      isChatDetached={isChatDetached}
      onToggleDetachChat={() => handleToggleDetachChat()}
      persistentTalkActive={persistentTalkActive}
      persistentTalkSpeaking={persistentTalkStatus.speaking}
      onTogglePersistentTalk={() => {
        markVoiceUserGesture();
        try {
          localStorage.setItem('sovereign_continuity_local_updated_at_v1', new Date().toISOString());
        } catch {}
        setPersistentTalkActive((prev) => !prev);
      }}
      onInjectToChat={handleInjectIntoChat}
      showDesktopSidebar={showDesktopSidebar}
      onToggleDesktopSidebar={() => setShowDesktopSidebar((prev) => !prev)}
      isLauncherOpen={isOSLauncherOpen}
      onSetLauncherOpen={setIsOSLauncherOpen}
      artifacts={artifacts}
      variant={desktopActive ? 'bottom-windows' : 'top'}
    />
  );

  const stableSaveToVaultRef = useRef(handleSaveToVault);
  stableSaveToVaultRef.current = handleSaveToVault;
  const stableSelectOSModuleRef = useRef(handleSelectOSModule);
  stableSelectOSModuleRef.current = handleSelectOSModule;
  const stableToggleDetachChatRef = useRef(handleToggleDetachChat);
  stableToggleDetachChatRef.current = handleToggleDetachChat;

  const stableChatSaveToVault = useCallback((title: string, content: string, model: string) => {
    stableSaveToVaultRef.current('knowledge', title, content, model);
  }, []);
  const stableChatSelectModule = useCallback((mod: ModuleType) => {
    stableSelectOSModuleRef.current(mod);
  }, []);
  const stableClearPendingChatInput = useCallback(() => {
    setPendingChatInput(null);
  }, [setPendingChatInput]);
  const stableToggleDetachChat = useCallback(() => {
    stableToggleDetachChatRef.current();
  }, []);

  // Fast-path Auth Gate: before session check finishes or before user logs in,
  // render ONLY the lightweight boot splash or Login Gate — NEVER mount heavy Desktop/Chat/Voice modules behind it!
  if (!authLoaded) {
    return (
      <div className="h-[var(--sovereign-app-height,100dvh)] w-full bg-zinc-950 text-zinc-200 flex flex-col items-center justify-center gap-3 font-sans">
        <div className="w-8 h-8 rounded-xl border-2 border-amber-500/30 border-t-amber-400 animate-spin" />
        <div className="text-xs font-mono text-zinc-400">Initializing Lysander Sovereign OS...</div>
      </div>
    );
  }

  const requiresLoginGate = authPolicy.requireLoginOnBoot && (!authUser || authUser.status !== 'active');
  if (requiresLoginGate) {
    return (
      <div className="h-[var(--sovereign-app-height,100dvh)] w-full bg-zinc-950 text-zinc-100 font-sans">
        <AuthGateModal
          mode="gate"
          currentUser={authUser}
          adminClaimed={authAdminClaimed}
          envAdminConfigured={authEnvAdminConfigured}
          policy={authPolicy}
          onAuthenticated={applyAuthSessionResponse}
          onSignedOut={handleLogoutAccount}
        />
      </div>
    );
  }

  return (
    <div className="h-[var(--sovereign-app-height,100dvh)] w-full overflow-hidden bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-200">
      {/* Sovereign UI HTML Mutation Patch Container */}
      {uiMutation.htmlPatch && (
        <div dangerouslySetInnerHTML={{ __html: uiMutation.htmlPatch }} />
      )}

      <Header
        user={user}
        authUser={authUser}
        onOpenAuth={() => setShowLoginModal(true)}
        onOpenUserPrivileges={() => setShowUserPrivilegesModal(true)}
        onLogoutAccount={handleLogoutAccount}
        firebaseOnline={firebaseOnline}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        devMode={devMode}
        onToggleDevMode={handleToggleDevMode}
        onSelectModule={handleSelectOSModule}
        activeModule={activeModule}
        activeAccountEmail={authUser?.email || activeAccountEmail}
        onSwitchAccountEmail={handleSwitchAccountEmail}
        onToggleMobileNav={() => setMobileNavOpen(true)}
        isTelemetryOpen={isTelemetryOpen}
        onToggleTelemetry={() => setIsTelemetryOpen(prev => !prev)}
        compactOsTopBar={desktopActive}
        onShowDesktop={handleMinimizeAllWindows}
      />

      {!desktopActive && osBarNode}

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <Navigation
          activeModule={activeModule}
          onSelectModule={handleSelectOSModule}
          artifactCount={artifacts.length}
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
          hiddenOnDesktop={desktopActive && !showDesktopSidebar}
          hideMobileDock={desktopActive}
          authUser={authUser}
        />

        <main
          ref={mainAreaRef}
          className={`relative flex-1 min-w-0 min-h-0 flex flex-col lg:flex-row overflow-hidden ${
            desktopActive ? 'pb-0' : 'pb-[calc(3.25rem+env(safe-area-inset-bottom))] lg:pb-0'
          } px-safe`}
        >
          {/* Sovereign Desktop Backdrop & App Icons (OS Desktop First Across All Viewports) */}
          {desktopActive && (
            <SovereignDesktopCanvas
              openModules={openModules}
              isChatDetached={isChatDetached}
              onOpenModule={handleSelectOSModule}
              onToggleDetachChat={() => handleToggleDetachChat()}
              onLaunchChatPrompt={(prompt) => handleInjectIntoChat(prompt, true)}
              onOpenStartMenu={() => setIsOSLauncherOpen(true)}
              onTileWindows={handleTileWindows}
              onCascadeWindows={handleCascadeWindows}
              onMinimizeAll={handleMinimizeAllWindows}
              onSwitchWorkspaceMode={() => setShellViewMode('workspace')}
              authUser={authUser}
            />
          )}

          {/* Persistent Sovereign Chat Window (ZERO-Unmount Keep-Alive once opened; avoids eager download while minimized at boot) */}
          {(hasActivatedChat || isChatDetached || !desktopActive || (openModules.includes('chat') && !windowStates.chat?.minimized)) && (
            <SovereignOSWindowFrame
              moduleId="chat"
              mode={isChatDetached ? 'pip' : desktopActive ? 'floating' : 'tiled'}
              visible={isChatDetached ? true : desktopActive ? openModules.includes('chat') : isChatVisible}
              tiledClassName={`${getPaneSizingClass(chatRole)} ${
                chatRole === 'primary' ? 'lg:order-1' : 'lg:order-3'
              } overflow-hidden`}
              geometry={getOrCreateWindowGeometry('chat', 0)}
              isFocused={activeModule === 'chat' || isChatDetached}
              alwaysOnTop={isChatDetached}
              isDetached={isChatDetached}
              pipMinimized={chatPipMinimized}
              containerSize={desktopSize}
              onFocus={() => {
                if (isChatDetached) {
                  if (chatPipMinimized) setChatPipMinimized(false);
                  const curZ = windowStates.chat?.zIndex || 0;
                  if (curZ < topZRef.current + 16) {
                    handleMoveResizeWindow('chat', { zIndex: ++topZRef.current + 16 });
                  }
                } else {
                  setOpenModules((prev) => (prev.includes('chat') ? prev : [...prev, 'chat']));
                  focusDesktopWindow('chat');
                  if (activeModule !== 'chat') {
                    setActiveModule('chat');
                  }
                }
              }}
              onMinimize={() => {
                if (isChatDetached) {
                  setChatPipMinimized(true);
                } else {
                  handleMinimizeWindow('chat');
                }
              }}
              onToggleMaximize={() => handleToggleMaximizeWindow('chat')}
              onSnapLeft={() => handleSnapWindow('chat', 'left')}
              onSnapRight={() => handleSnapWindow('chat', 'right')}
              onToggleDetach={() => handleToggleDetachChat()}
              onRestorePip={() => {
                setChatPipMinimized(false);
                restoreAndFocusChatComposerSync(true);
              }}
              onClose={() => handleCloseOpenModule('chat')}
              onMoveResize={(next) => handleMoveResizeWindow('chat', next)}
            >
              <MemoChatPane
                onSaveToVault={stableChatSaveToVault}
                onSelectModule={stableChatSelectModule}
                pendingInput={pendingChatInput}
                onClearPendingInput={stableClearPendingChatInput}
                userId={user?.uid}
                authUser={authUser}
                isDetached={isChatDetached}
                onToggleDetach={stableToggleDetachChat}
              />
            </SovereignOSWindowFrame>
          )}

          {/* Persistent Sovereign Google Chrome Browser Window (ZERO-Unmount Keep-Alive once opened) */}
          {isBrowserMounted && (
            <SovereignOSWindowFrame
              moduleId="browser"
              mode={isBrowserDetached ? 'pip' : desktopActive ? 'floating' : 'tiled'}
              visible={isBrowserDetached ? true : desktopActive ? openModules.includes('browser') : isBrowserVisible}
              tiledClassName={`${getPaneSizingClass(browserRole)} ${
                browserRole === 'primary' ? 'lg:order-1' : 'lg:order-3'
              } overflow-hidden`}
              geometry={getOrCreateWindowGeometry('browser', 1)}
              isFocused={activeModule === 'browser' || isBrowserDetached}
              alwaysOnTop={isBrowserDetached}
              isDetached={isBrowserDetached}
              pipMinimized={Boolean(pipMinimizedExtras.browser)}
              containerSize={desktopSize}
              onFocus={() => {
                if (isBrowserDetached) {
                  if (pipMinimizedExtras.browser) {
                    setPipMinimizedExtras((p) => ({ ...p, browser: false }));
                  }
                  const curZ = windowStates.browser?.zIndex || 0;
                  if (curZ < topZRef.current + 16) {
                    handleMoveResizeWindow('browser', { zIndex: ++topZRef.current + 16 });
                  }
                } else {
                  handleSelectOSModule('browser');
                }
              }}
              onMinimize={() => {
                if (isBrowserDetached) {
                  setPipMinimizedExtras((p) => ({ ...p, browser: true }));
                } else {
                  handleMinimizeWindow('browser');
                }
              }}
              onToggleMaximize={() => handleToggleMaximizeWindow('browser')}
              onSnapLeft={() => handleSnapWindow('browser', 'left')}
              onSnapRight={() => handleSnapWindow('browser', 'right')}
              onToggleDetach={() => handleToggleDetachModule('browser')}
              onRestorePip={() => setPipMinimizedExtras((p) => ({ ...p, browser: false }))}
              onClose={() => handleCloseOpenModule('browser')}
              onMoveResize={(next) => handleMoveResizeWindow('browser', next)}
            >
              <div className="flex-1 min-h-0 flex flex-col p-2 sm:p-3 overflow-hidden">
                <ErrorBoundary key="persistent-browser-eb">
                  <Suspense fallback={<ModuleLoadingFallback label="Loading Sovereign Browser..." />}>
                    <SovereignBrowser
                      agentInternetAllowed={agentInternetAllowed}
                      onToggleAgentInternet={toggleInternet}
                      userId={user?.uid}
                      initialUrl={browserTargetUrl}
                      pendingNavCommand={browserNavRequest}
                      onInjectToChat={handleInjectIntoChat}
                      onSelectModule={handleSelectOSModule}
                      onSaveToVault={(artifact) =>
                        handleSaveToVault((artifact.type as any) || 'knowledge', artifact.title, artifact.prompt, artifact.model, undefined, artifact.metadataJson)
                      }
                    />
                  </Suspense>
                </ErrorBoundary>
              </div>
            </SovereignOSWindowFrame>
          )}

          {/* Multi-Window Floating & Detached Always-On-Top App Windows (100% Resizable Everywhere) */}
          {nonPersistentOpenModules
            .filter((mod) => {
              const isDetached = detachedExtraModules.includes(mod);
              if (isDetached) return true;
              return desktopActive && !windowStates[mod]?.minimized;
            })
            .map((mod, idx) => {
              const isModDetached = detachedExtraModules.includes(mod);
              return (
                <SovereignOSWindowFrame
                  key={`desktop-win-${mod}`}
                  moduleId={mod}
                  mode={isModDetached ? 'pip' : 'floating'}
                  visible={true}
                  geometry={getOrCreateWindowGeometry(mod, idx + 2)}
                  isFocused={activeModule === mod || isModDetached}
                  alwaysOnTop={isModDetached}
                  isDetached={isModDetached}
                  pipMinimized={Boolean(pipMinimizedExtras[mod])}
                  containerSize={desktopSize}
                  onFocus={() => {
                    if (isModDetached) {
                      if (pipMinimizedExtras[mod]) {
                        setPipMinimizedExtras((p) => ({ ...p, [mod]: false }));
                      }
                      const curZ = windowStates[mod]?.zIndex || 0;
                      if (curZ < topZRef.current + 16) {
                        handleMoveResizeWindow(mod, { zIndex: ++topZRef.current + 16 });
                      }
                    } else {
                      handleSelectOSModule(mod);
                    }
                  }}
                  onMinimize={() => {
                    if (isModDetached) {
                      setPipMinimizedExtras((p) => ({ ...p, [mod]: true }));
                    } else {
                      handleMinimizeWindow(mod);
                    }
                  }}
                  onToggleMaximize={() => handleToggleMaximizeWindow(mod)}
                  onSnapLeft={() => handleSnapWindow(mod, 'left')}
                  onSnapRight={() => handleSnapWindow(mod, 'right')}
                  onToggleDetach={() => handleToggleDetachModule(mod)}
                  onRestorePip={() => setPipMinimizedExtras((p) => ({ ...p, [mod]: false }))}
                  onClose={() => handleCloseOpenModule(mod)}
                  onMoveResize={(next) => handleMoveResizeWindow(mod, next)}
                >
                  <ErrorBoundary key={`desktop-eb-${mod}`}>
                    <div className="flex-1 min-h-0 flex flex-col overflow-y-auto overflow-x-clip">
                      <Suspense fallback={<ModuleLoadingFallback label={`Loading ${mod}...`} />}>
                        {renderStandardModuleContent(mod)}
                      </Suspense>
                    </div>
                  </ErrorBoundary>
                </SovereignOSWindowFrame>
              );
            })}

          {/* Workspace / Mobile Tiled Primary Non-Persistent Pane */}
          {!desktopActive && activeModule !== 'chat' && activeModule !== 'browser' && !detachedExtraModules.includes(activeModule) && (
            <div className={`${getPaneSizingClass('primary')} lg:order-1 overflow-y-auto overflow-x-clip`}>
              <ErrorBoundary key={`primary-${activeModule}`}>
                <Suspense fallback={<ModuleLoadingFallback label={`Loading ${activeModule}...`} />}>
                  {renderStandardModuleContent(activeModule)}
                </Suspense>
              </ErrorBoundary>
            </div>
          )}

          {/* Draggable Resizable Workspace Split-Pane Divider (lg+) */}
          {!desktopActive && isSplitMode && (
            <div
              onPointerDown={startSplitDividerDrag}
              onDoubleClick={() => setSplitPct(50)}
              title="Drag to resize split panes (Double-click to reset 50/50)"
              className={`hidden lg:flex lg:order-2 w-1.5 shrink-0 cursor-col-resize items-center justify-center transition-colors select-none touch-none ${
                isDraggingSplit ? 'bg-amber-500/70' : 'bg-zinc-800/90 hover:bg-amber-500/50'
              }`}
            >
              <div className="w-0.5 h-10 rounded-full bg-zinc-500/60" />
            </div>
          )}

          {/* Workspace Dual-Pane Secondary Non-Persistent Pane (Desktop lg+) */}
          {!desktopActive && isSplitMode && secondaryModule !== 'chat' && secondaryModule !== 'browser' && secondaryModule !== activeModule && !detachedExtraModules.includes(secondaryModule) && (
            <div className={`${getPaneSizingClass('secondary')} lg:order-3 overflow-y-auto overflow-x-clip`}>
              <ErrorBoundary key={`secondary-${secondaryModule}`}>
                <Suspense fallback={<ModuleLoadingFallback label={`Loading ${secondaryModule}...`} />}>
                  {renderStandardModuleContent(secondaryModule)}
                </Suspense>
              </ErrorBoundary>
            </div>
          )}

          {/* Live OS Autonomous Action Toast */}
          {osActionToast && (
            <div className="pointer-events-none fixed bottom-16 lg:bottom-14 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-full bg-zinc-900/95 border border-amber-500/50 text-xs font-mono text-amber-200 shadow-2xl">
              {osActionToast}
            </div>
          )}

          {/* Opt-In Sovereign OS 5-Minute Market & Crypto Alert Toast (Off by Default; Positioned Clear of Window Controls) */}
          {osMarketAlert && (notificationPrefs.telemetryPopupAlerts || notificationPrefs.cryptoTradingAlerts) && (
            <div
              className={`fixed bottom-16 right-4 z-40 w-[340px] max-w-[calc(100vw-2rem)] p-3.5 rounded-xl border shadow-2xl transition-all ${
                osMarketAlert.actionSignal === 'STRONG_BUY' || osMarketAlert.actionSignal === 'BUY_ACCUMULATE'
                  ? 'bg-zinc-950/96 border-emerald-500/55 text-zinc-100'
                  : 'bg-zinc-950/96 border-rose-500/55 text-zinc-100'
              }`}
            >
              <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-zinc-800">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    osMarketAlert.actionSignal === 'STRONG_BUY' || osMarketAlert.actionSignal === 'BUY_ACCUMULATE'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {osMarketAlert.actionSignal === 'STRONG_BUY'
                    ? '5m PROFIT SURGE · STRONG BUY'
                    : osMarketAlert.actionSignal === 'BUY_ACCUMULATE'
                    ? '5m BUY / ACCUMULATE'
                    : '5m LOSS PREVENTION · SELL WARNING'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDismissedMarketSymbols((prev) => ({ ...prev, [osMarketAlert.symbol]: Date.now() }));
                    setOsMarketAlert(null);
                  }}
                  className="text-xs font-mono text-zinc-400 hover:text-zinc-100 px-1.5 cursor-pointer"
                  aria-label="Dismiss alert"
                >
                  ✕
                </button>
              </div>
              <div className="py-2 space-y-1">
                <div className="flex items-baseline justify-between font-mono text-xs tabular-nums">
                  <span className="font-bold text-sm text-zinc-100">
                    {osMarketAlert.symbol} <span className="text-zinc-400 font-normal text-xs">({osMarketAlert.name})</span>
                  </span>
                  <span
                    className={`font-bold ${
                      osMarketAlert.predicted5mMovePct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {osMarketAlert.predicted5mMovePct >= 0 ? '+' : ''}
                    {osMarketAlert.predicted5mMovePct.toFixed(3)}% in 5m
                  </span>
                </div>
                <div className="text-[11px] font-mono text-zinc-300 tabular-nums">
                  Spot: {osMarketAlert.spotPrice} → 5m Target: <strong className="text-amber-300">{osMarketAlert.target5mPrice}</strong> (±{osMarketAlert.conformal99Band5mPct}% @ {osMarketAlert.conformal99CoveragePct}%)
                </div>
                <p className="text-[11px] text-zinc-400 line-clamp-2 leading-snug">
                  {osMarketAlert.recommendation}
                </p>
              </div>
              <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-2 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => {
                    saveOSCustomizationProfile({
                      notifications: {
                        telemetryPopupAlerts: false,
                        cryptoTradingAlerts: false,
                        telemetryAudioChime: false
                      }
                    });
                    setOsMarketAlert(null);
                  }}
                  className="text-[10px] text-zinc-400 hover:text-rose-300 underline underline-offset-2 cursor-pointer"
                  title="Disable all telemetry & crypto trading popups"
                >
                  Turn Off Alerts
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectOSModule('crypto-wallet');
                      setDismissedMarketSymbols((prev) => ({ ...prev, [osMarketAlert.symbol]: Date.now() }));
                      setOsMarketAlert(null);
                    }}
                    className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-200 font-semibold cursor-pointer"
                  >
                    Wallet
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectOSModule('macro-telemetry');
                      setDismissedMarketSymbols((prev) => ({ ...prev, [osMarketAlert.symbol]: Date.now() }));
                      setOsMarketAlert(null);
                    }}
                    className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold cursor-pointer"
                  >
                    Open Graph
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {desktopActive && osBarNode}

      {isCommandPaletteOpen && (
        <Suspense fallback={null}>
          <CommandPalette
            isOpen={isCommandPaletteOpen}
            onClose={() => setIsCommandPaletteOpen(false)}
            onSelectModule={handleSelectOSModule}
            artifacts={artifacts}
            onNavigateUrlInBrowser={handleNavigateUrlInBrowser}
            onTriggerEngineeringEngine={handleTriggerEngineeringEngine}
            userId={user?.uid}
            authUser={authUser}
          />
        </Suspense>
      )}

      {/* Real-Time System Health & Latency Telemetry Drawer (Triggered from Header) */}
      {isTelemetryOpen && (
        <Suspense fallback={null}>
          <SystemHealthDashboard
            isOpen={isTelemetryOpen}
            onToggleOpen={() => setIsTelemetryOpen(prev => !prev)}
            onSelectModule={handleSelectOSModule}
            activeModule={activeModule}
          />
        </Suspense>
      )}

      {showTouchControllerOverlay && (
        <Suspense fallback={null}>
          <FloatingTouchGamepadOverlay
            onClose={() => saveOSCustomizationProfile({ showTouchControllerOverlay: false })}
          />
        </Suspense>
      )}

      {/* Global Persistent Voice & Read-Aloud Engine (Always mounted when authenticated so Read Out Loud works 24/7; live mic/WS activates only when persistentTalkActive=true) */}
      {authUser &&
        authUser.status === 'active' &&
        (authUser.role === 'admin' || authUser.privileges.canUseVoiceChat) && (
          <PersistentTalkDock
            isActive={persistentTalkActive}
            onDeactivate={() => setPersistentTalkActive(false)}
            activeModule={activeModule}
            openModules={openModules}
            onSelectModule={handleSelectOSModule}
            onNavigateBrowserUrl={handleNavigateUrlInBrowser}
            onSaveToVault={(title, content, model, metadataJson) =>
              handleSaveToVault('transcription', title, content, model, undefined, metadataJson)
            }
            onStatusChange={setPersistentTalkStatus}
          />
        )}

      {/* Sovereign OS Account Switcher Modal */}
      {showLoginModal && (
        <AuthGateModal
          mode="modal"
          currentUser={authUser}
          adminClaimed={authAdminClaimed}
          envAdminConfigured={authEnvAdminConfigured}
          policy={authPolicy}
          onAuthenticated={applyAuthSessionResponse}
          onSignedOut={handleLogoutAccount}
          onClose={() => setShowLoginModal(false)}
        />
      )}

      {/* Admin Custom User Privileges & Login Policy Console */}
      {showUserPrivilegesModal &&
        authUser &&
        (authUser.role === 'admin' || authUser.privileges.canManageUsers) && (
          <Suspense fallback={null}>
            <UserPrivilegesManagerModal
              isOpen={showUserPrivilegesModal}
              currentUser={authUser}
              onClose={() => setShowUserPrivilegesModal(false)}
              onPolicyOrSelfUpdated={refreshAuthSession}
            />
          </Suspense>
        )}

      <OfflineIndicator />
    </div>
  );
}
