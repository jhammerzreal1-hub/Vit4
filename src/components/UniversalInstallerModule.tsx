/**
 * @license
 * Copyright (c) 2026 JHammerZ (https://jhammerz.github.io)
 *
 * Official MIT License (.JHam Language / H-FID Standard / HEO) &
 * JHammerZ Custom Sovereign Licenses:
 * - TWENTY 47 PROTOCOL - GENESIS NODE (Hardware-Locked Ring -3 Sovereign Execution)
 * - LYSANDER CORE EULA (100% Autonomous Full-Control Kernel Authority)
 * - H-FID Forensic License v1.1 (Cryptographic Merkle & Conformal Forensics)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software under the combined terms of the MIT License and the JHammerZ
 * Sovereign Genesis Protocol at https://jhammerz.github.io.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Download,
  Terminal,
  Gamepad2,
  MessageSquare,
  HardDrive,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Play,
  Trash2,
  ExternalLink,
  Search,
  Package,
  ShieldCheck,
  Laptop,
  Apple,
  Server,
  Globe,
  FolderOpen,
  Sparkles,
  Wrench,
  Layers,
  FileCode2,
  Send,
  Users,
  Radio,
  Binary,
  Pin
} from 'lucide-react';
import { UniversalControllerDeck } from './UniversalControllerDeck';
import { UniversalCompatMatrixPanel } from './UniversalCompatMatrixPanel';
import { pinSteamGameToDesktop } from '../utils/osCustomizationStore';
import { apiFetch } from '../utils/authClient';

interface CatalogApp {
  id: string;
  name: string;
  vendor?: string;
  publisher?: string;
  category: 'Gaming' | 'Communication' | 'Development' | 'Media & Streaming' | 'System & Virtualization' | 'Creative';
  version: string;
  sizeLabel: string;
  description: string;
  platforms: ('windows' | 'macos' | 'linux' | 'in_os' | 'android')[];
  launchMode: string;
  protocolUri?: string;
  cliInstallCmds?: {
    linux?: string;
    macos?: string;
    windows?: string;
  };
  nativeDownloadUrls?: {
    windows?: string;
    macos?: string;
    linux?: string;
    android?: string;
  };
  nativeInstallers?: {
    windows?: string;
    macos?: string;
    linux?: string;
  };
  features: string[];
  accentColor: string;
  installed?: boolean;
  installedMeta?: InstalledAppRecord | null;
}

interface InstalledAppRecord {
  id: string;
  name: string;
  category: string;
  version: string;
  installedAt: string;
  installPath: string;
  launchUrl?: string;
  binaryOrEntryPath?: string;
  protocolUri?: string;
  launchMode: string;
  platform: string;
  sizeBytes: number;
  sha256: string;
  status: 'READY' | 'RUNNING' | 'UPDATING';
}

interface HostCapabilities {
  platform: string;
  arch: string;
  release: string;
  hostname: string;
  cpus: number;
  totalMemGb: number;
  freeMemGb: number;
  managers: Record<string, boolean>;
  downloadsDir: string;
  appsDir: string;
  winePrefixDir?: string;
}

interface DownloadedFile {
  name: string;
  path: string;
  sizeBytes: number;
  modifiedAt: string;
  sha256?: string;
}

interface SteamGameSummary {
  id: number;
  name: string;
  discounted: boolean;
  discount_percent: number;
  original_price: number | null;
  final_price: number | null;
  currency: string;
  header_image: string;
  windows_available: boolean;
  mac_available: boolean;
  linux_available: boolean;
  controller_support?: string;
  steam_protocol_run: string;
  steam_protocol_install: string;
  store_url: string;
}

interface SteamAppDetails {
  appid: number;
  name: string;
  type: string;
  is_free: boolean;
  short_description: string;
  developers: string[];
  publishers: string[];
  header_image: string;
  website: string | null;
  current_players: number;
  platforms: { windows: boolean; mac: boolean; linux: boolean };
  price_overview: any;
  genres: string[];
  categories: string[];
  release_date: { coming_soon: boolean; date: string };
  pc_requirements: { minimum?: string; recommended?: string };
  screenshots: { id: number; path_thumbnail: string; path_full: string }[];
  movies: { id: number; name: string; thumbnail: string; webm_480?: string; mp4_480?: string }[];
  steam_protocol_run: string;
  steam_protocol_install: string;
  steam_protocol_store: string;
  steamcmd_install: string;
}

interface PeBinaryAnalysis {
  validPe: boolean;
  filePath: string;
  fileName: string;
  fileSizeBytes: number;
  sha256: string;
  dosHeader: {
    e_magic: string;
    e_lfanew: string;
  };
  coffHeader?: {
    signature: string;
    machineHex: string;
    machineArchitecture: string;
    numberOfSections: number;
    timeDateStamp: string;
    characteristicsHex: string;
    characteristicsFlags: string[];
  };
  optionalHeader?: {
    magicHex: string;
    peFormat: 'PE32 (32-bit Windows)' | 'PE32+ (64-bit Windows)' | 'ROM / Unknown';
    linkerVersion: string;
    sizeOfCode: number;
    addressOfEntryPoint: string;
    imageBase: string;
    subsystemHex: string;
    subsystemName: string;
    dllCharacteristicsFlags: string[];
  };
  sections: {
    name: string;
    virtualSize: number;
    virtualAddress: string;
    rawSize: number;
    characteristicsHex: string;
  }[];
  error?: string;
}

interface WinePrefixState {
  prefixPath: string;
  driveCPath: string;
  system32Path: string;
  programFilesPath: string;
  windowsVersion: string;
  architecture: 'win64' | 'win32';
  dxvkEnabled: boolean;
  vkd3dProtonEnabled: boolean;
  vcrunInstalled: boolean;
  dotnetInstalled: boolean;
  hostRuntimes: {
    wine64: boolean;
    wine: boolean;
    proton: boolean;
    box64: boolean;
    nativeWin32: boolean;
  };
  installedExesInDriveC: { name: string; path: string; sizeBytes: number }[];
  registrySummary: string[];
}

export interface UniversalInstallerModuleProps {
  onSelectModule?: (mod: any) => void;
  onOpenUrlInBrowser?: (url: string) => void;
}

export const UniversalInstallerModule: React.FC<UniversalInstallerModuleProps> = ({
  onOpenUrlInBrowser
}) => {
  const [activeTab, setActiveTab] = useState<
    | 'store'
    | 'steam-live'
    | 'controllers'
    | 'universal-compat'
    | 'discord-live'
    | 'windows-pe'
    | 'cli'
    | 'direct-url'
    | 'os-deploy'
  >('store');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [targetOsFilter, setTargetOsFilter] = useState<'ALL' | 'windows' | 'macos' | 'linux'>('ALL');

  const [catalog, setCatalog] = useState<CatalogApp[]>([]);
  const [installedApps, setInstalledApps] = useState<InstalledAppRecord[]>([]);
  const [hostInfo, setHostInfo] = useState<HostCapabilities | null>(null);
  const [downloadedFiles, setDownloadedFiles] = useState<DownloadedFile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [busyAppId, setBusyAppId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'info' | 'success' | 'error'; text: string } | null>(null);

  // Live Steam Hub State
  const [steamFeatured, setSteamFeatured] = useState<SteamGameSummary[]>([]);
  const [steamTopSellers, setSteamTopSellers] = useState<SteamGameSummary[]>([]);
  const [steamSearchTerm, setSteamSearchTerm] = useState<string>('');
  const [steamSearchResults, setSteamSearchResults] = useState<any[]>([]);
  const [steamLoading, setSteamLoading] = useState<boolean>(false);
  const [selectedSteamApp, setSelectedSteamApp] = useState<SteamAppDetails | null>(null);
  const [steamDetailsLoading, setSteamDetailsLoading] = useState<boolean>(false);
  const [steamActionBusy, setSteamActionBusy] = useState<boolean>(false);
  const [steamActionLog, setSteamActionLog] = useState<string>('');
  const [localSteamPath, setLocalSteamPath] = useState<string>('');
  const [localSteamGames, setLocalSteamGames] = useState<any[]>([]);
  const [localSteamMeta, setLocalSteamMeta] = useState<{
    existingLibraries: string[];
    steamBinaryAvailable: boolean;
    steamCmdAvailable: boolean;
    protonVersions: string[];
    source: string;
  } | null>(null);
  const [localSteamScanning, setLocalSteamScanning] = useState<boolean>(false);
  const [steamRunnerMode, setSteamRunnerMode] = useState<
    'native-steam' | 'proton-ge' | 'gamescope-hdr' | 'wine-dxvk' | 'steamcmd-install'
  >('proton-ge');
  const [steamUseGamemode, setSteamUseGamemode] = useState<boolean>(true);
  const [steamUseMangoHud, setSteamUseMangoHud] = useState<boolean>(true);
  const [steamUniversalLaunchInfo, setSteamUniversalLaunchInfo] = useState<any>(null);

  // Live Discord Hub State
  const [discordGuildId, setDiscordGuildId] = useState<string>('804856221118169138'); // Public community widget fallback or custom
  const [discordWidgetData, setDiscordWidgetData] = useState<any>(null);
  const [discordWidgetLoading, setDiscordWidgetLoading] = useState<boolean>(false);
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState<string>('');
  const [discordWebhookUsername, setDiscordWebhookUsername] = useState<string>('Lysander Sovereign OS (UID 0)');
  const [discordWebhookContent, setDiscordWebhookContent] = useState<string>(
    'Sovereign Ring -3 Kernel Telemetry Dispatch: All 20 global + crypto markets & Ed25519/secp256k1 wallets online.'
  );
  const [discordWebhookTitle, setDiscordWebhookTitle] = useState<string>('TWENTY 47 PROTOCOL · GENESIS NODE');
  const [discordWebhookBusy, setDiscordWebhookBusy] = useState<boolean>(false);
  const [discordWebhookResult, setDiscordWebhookResult] = useState<any>(null);

  const [discordBotToken, setDiscordBotToken] = useState<string>('');
  const [discordApiAction, setDiscordApiAction] = useState<
    'get_me' | 'get_guilds' | 'get_channels' | 'get_messages' | 'send_message'
  >('get_me');
  const [discordTargetId, setDiscordTargetId] = useState<string>('');
  const [discordApiMessage, setDiscordApiMessage] = useState<string>('');
  const [discordApiResult, setDiscordApiResult] = useState<any>(null);
  const [discordApiBusy, setDiscordApiBusy] = useState<boolean>(false);

  // Windows PE32+ / Wine / Proton Hub State
  const [winePrefix, setWinePrefix] = useState<WinePrefixState | null>(null);
  const [peTargetFile, setPeTargetFile] = useState<string>('');
  const [peAnalysis, setPeAnalysis] = useState<PeBinaryAnalysis | null>(null);
  const [peExecutionLog, setPeExecutionLog] = useState<string>('');
  const [peBusy, setPeBusy] = useState<boolean>(false);

  // CLI Package Manager State
  const [cliManager, setCliManager] = useState<'apt' | 'brew' | 'winget' | 'flatpak' | 'npm' | 'pip' | 'git' | 'custom'>('npm');
  const [cliAction, setCliAction] = useState<'install' | 'uninstall' | 'search' | 'update'>('install');
  const [cliPackages, setCliPackages] = useState<string>('');
  const [cliBusy, setCliBusy] = useState<boolean>(false);
  const [cliLogs, setCliLogs] = useState<{ cmd: string; output: string; code: number; time: string }[]>([]);

  // Direct URL Binary Downloader State
  const [directUrl, setDirectUrl] = useState<string>('');
  const [directFileName, setDirectFileName] = useState<string>('');
  const [directDownloading, setDirectDownloading] = useState<boolean>(false);

  const fetchPackageOverview = useCallback(async () => {
    try {
      const res = await apiFetch('/api/os/packages/overview');
      const data = await res.json();
      if (data.ok) {
        setCatalog(data.catalog || []);
        setInstalledApps(data.installed || []);
        setHostInfo(data.host || null);
        setDownloadedFiles(data.downloadedFiles || []);
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Failed to query Sovereign Package Daemon: ${err.message}` });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLiveSteamStore = useCallback(async () => {
    setSteamLoading(true);
    try {
      const res = await apiFetch('/api/os/steam/featured');
      const data = await res.json();
      if (data.ok) {
        setSteamFeatured(data.featured_win || []);
        setSteamTopSellers(data.top_sellers || []);
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Steam Web API query failed: ${err.message}` });
    } finally {
      setSteamLoading(false);
    }
  }, []);

  const fetchSteamGameDetails = useCallback(async (appId: number) => {
    setSteamDetailsLoading(true);
    try {
      const res = await apiFetch(`/api/os/steam/appdetails?appid=${appId}`);
      const data = await res.json();
      if (data.ok && data.details) {
        setSelectedSteamApp(data.details);
      } else {
        setStatusMessage({ type: 'error', text: data.error || `Failed to load Steam AppID ${appId}` });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Steam AppDetails error: ${err.message}` });
    } finally {
      setSteamDetailsLoading(false);
    }
  }, []);

  const fetchWinePrefixStatus = useCallback(async () => {
    try {
      const res = await apiFetch('/api/os/windows/wineprefix');
      const data = await res.json();
      if (data.ok && data.winePrefix) {
        setWinePrefix(data.winePrefix);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchPackageOverview();
    fetchLiveSteamStore();
    fetchWinePrefixStatus();
  }, [fetchPackageOverview, fetchLiveSteamStore, fetchWinePrefixStatus]);

  const handleInstallCatalogApp = async (app: CatalogApp, downloadNativePlatform?: 'windows' | 'macos' | 'linux') => {
    setBusyAppId(app.id);
    setStatusMessage({
      type: 'info',
      text: downloadNativePlatform
        ? `Downloading official ${app.name} (${downloadNativePlatform.toUpperCase()}) binary to local disk & inspecting PE32+/ELF headers...`
        : `Provisioning ${app.name} (${app.version}) native OS launcher & manifest...`
    });
    try {
      const res = await apiFetch('/api/os/packages/install-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId: app.id, downloadNativePlatform })
      });
      const data = await res.json();
      if (data.ok) {
        const dlText = data.nativeDownloadResult?.ok
          ? ` | Official Binary Saved: ${data.nativeDownloadResult.path} (SHA-256: ${data.nativeDownloadResult.sha256.slice(0, 12)}...)`
          : '';
        setStatusMessage({
          type: 'success',
          text: `${app.name} v${app.version} installed at ${data.record.installPath}${dlText}`
        });
        await fetchPackageOverview();
        window.dispatchEvent(new CustomEvent('sovereign_apps_updated'));
        if (data.nativeDownloadResult?.path && data.nativeDownloadResult.path.endsWith('.exe')) {
          setPeTargetFile(data.nativeDownloadResult.path);
          handleInspectPeBinary(data.nativeDownloadResult.path);
        }
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Installation failed' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setBusyAppId(null);
    }
  };

  const handleUninstallApp = async (appId: string, name: string) => {
    setBusyAppId(appId);
    try {
      const res = await apiFetch('/api/os/packages/uninstall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId })
      });
      const data = await res.json();
      if (data.ok) {
        setStatusMessage({ type: 'info', text: `Uninstalled ${name} and purged package directory.` });
        await fetchPackageOverview();
        window.dispatchEvent(new CustomEvent('sovereign_apps_updated'));
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setBusyAppId(null);
    }
  };

  const handleScanLocalSteamLibrary = useCallback(async (overridePath?: string) => {
    setLocalSteamScanning(true);
    const targetPath = (overridePath ?? localSteamPath).trim();
    try {
      // First try Physical Host Bridge (127.0.0.1:4747) if user is running it on their physical gaming PC
      let bridgeGames: any[] = [];
      let bridgeLibs: string[] = [];
      try {
        const bridgeRes = await fetch(
          `http://127.0.0.1:4747/host/steam/games${targetPath ? `?path=${encodeURIComponent(targetPath)}` : ''}`,
          { signal: AbortSignal.timeout(1500) }
        );
        if (bridgeRes.ok) {
          const bData = await bridgeRes.json();
          if (bData?.success && Array.isArray(bData.games)) {
            bridgeGames = bData.games;
            bridgeLibs = bData.scannedLibraries || [];
          }
        }
      } catch {}

      const res = await apiFetch(
        `/api/os/steam/local-library${targetPath ? `?path=${encodeURIComponent(targetPath)}` : ''}`
      );
      const data = await res.json();
      const mergedGames = [...bridgeGames, ...(Array.isArray(data?.games) ? data.games : [])];
      const uniqueGames = Array.from(new Map(mergedGames.map((g) => [g.appid, g])).values());
      setLocalSteamGames(uniqueGames);
      setLocalSteamMeta({
        existingLibraries: [...bridgeLibs, ...(data?.existingLibraries || [])],
        steamBinaryAvailable: Boolean(data?.steamBinaryAvailable || bridgeGames.length > 0),
        steamCmdAvailable: Boolean(data?.steamCmdAvailable),
        protonVersions: data?.protonVersions || [],
        source: bridgeGames.length > 0 ? 'Physical Gaming PC Bridge (127.0.0.1:4747) + OS Host' : 'OS Host Filesystem'
      });
    } catch {
      setLocalSteamGames([]);
    } finally {
      setLocalSteamScanning(false);
    }
  }, [localSteamPath]);

  const handleUniversalSteamLaunch = async (appId: number, gameName: string) => {
    setSteamActionBusy(true);
    setSteamUniversalLaunchInfo(null);
    try {
      // Attempt Physical Host Bridge native GPU launch first if active
      let bridgeLaunched = false;
      try {
        const bRes = await fetch('http://127.0.0.1:4747/host/steam/launch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appId, gameName }),
          signal: AbortSignal.timeout(1800)
        });
        if (bRes.ok) {
          const bData = await bRes.json();
          if (bData?.launched) {
            bridgeLaunched = true;
            setStatusMessage({
              type: 'success',
              text: `Launched ${gameName} (#${appId}) on Physical Host GPU via ${bData.method}`
            });
          }
        }
      } catch {}

      const res = await apiFetch('/api/os/steam/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId,
          gameName,
          runner: steamRunnerMode,
          enableControllerInput: true,
          enableGamemode: steamUseGamemode,
          enableMangoHud: steamUseMangoHud
        })
      });
      const data = await res.json();
      setSteamUniversalLaunchInfo(data);
      if (!bridgeLaunched) {
        setStatusMessage({
          type: 'success',
          text: data.executionNote || `Prepared Universal Steam/Proton launcher for ${gameName} (#${appId}).`
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Steam launch failed' });
    } finally {
      setSteamActionBusy(false);
    }
  };

  useEffect(() => {
    const onOpenTab = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      if (detail.tab) setActiveTab(detail.tab);
    };
    const onLaunchSteam = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const id = Number(detail.appId || 0);
      if (id > 0) {
        setActiveTab('steam-live');
        apiFetch(`/api/os/steam/appdetails?appid=${id}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (d?.ok && d.details) setSelectedSteamApp(d.details);
          })
          .catch(() => {});
      }
    };
    window.addEventListener('sovereign_open_installer_tab', onOpenTab);
    window.addEventListener('sovereign_launch_steam_game', onLaunchSteam);
    return () => {
      window.removeEventListener('sovereign_open_installer_tab', onOpenTab);
      window.removeEventListener('sovereign_launch_steam_game', onLaunchSteam);
    };
  }, []);

  const handleOpenRealSubsystem = (appId: string, protocolUri?: string) => {
    if (appId === 'steam') {
      setActiveTab('steam-live');
      return;
    }
    if (appId === 'discord') {
      setActiveTab('discord-live');
      return;
    }
    if (protocolUri) {
      const a = document.createElement('a');
      a.href = protocolUri;
      a.click();
    }
    setActiveTab('windows-pe');
  };

  const handleSteamSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!steamSearchTerm.trim()) return;
    setSteamLoading(true);
    try {
      const res = await apiFetch(`/api/os/steam/search?q=${encodeURIComponent(steamSearchTerm)}`);
      const data = await res.json();
      if (data.ok) {
        setSteamSearchResults(data.items || []);
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Steam search failed: ${err.message}` });
    } finally {
      setSteamLoading(false);
    }
  };

  const handleSteamNativeAction = async (
    action: 'download_steam_setup_exe' | 'download_steamcmd_linux' | 'run_steamcmd' | 'launch_steam_protocol',
    appId?: number
  ) => {
    setSteamActionBusy(true);
    setSteamActionLog(`Executing Valve Steam operation [${action}]...`);
    try {
      if (action === 'launch_steam_protocol' && appId) {
        const a = document.createElement('a');
        a.href = `steam://run/${appId}`;
        a.click();
      }
      const res = await apiFetch('/api/os/steam/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, appId })
      });
      const data = await res.json();
      setSteamActionLog(JSON.stringify(data, null, 2));
      if (data.filePath) {
        await fetchPackageOverview();
        setPeTargetFile(data.filePath);
        if (data.peAnalysis) {
          setPeAnalysis(data.peAnalysis);
        }
      }
      setStatusMessage({
        type: data.ok ? 'success' : 'error',
        text: data.output || data.error || 'Steam action completed.'
      });
    } catch (err: any) {
      setSteamActionLog(`Error: ${err.message}`);
    } finally {
      setSteamActionBusy(false);
    }
  };

  const handleFetchDiscordWidget = async (customGuildId?: string) => {
    const targetGuild = (customGuildId ?? discordGuildId).trim();
    if (!targetGuild) return;
    setDiscordWidgetLoading(true);
    try {
      const res = await apiFetch(`/api/os/discord/widget?guildId=${encodeURIComponent(targetGuild)}`);
      const data = await res.json();
      setDiscordWidgetData(data);
      if (data.ok) {
        setStatusMessage({
          type: 'success',
          text: `Connected to live Discord Guild "${data.guildName}" (${data.presenceCount} members currently online).`
        });
      }
    } catch (err: any) {
      setDiscordWidgetData({ ok: false, error: err.message });
    } finally {
      setDiscordWidgetLoading(false);
    }
  };

  const handleSendDiscordWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discordWebhookUrl.trim()) return;
    setDiscordWebhookBusy(true);
    try {
      const res = await apiFetch('/api/os/discord/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: discordWebhookUrl.trim(),
          username: discordWebhookUsername.trim(),
          content: discordWebhookContent.trim(),
          embedTitle: discordWebhookTitle.trim(),
          embedDescription: `Dispatched from Lysander Sovereign OS (Ring -3 Bare-Metal Hypervisor · UID 0) at ${new Date().toISOString()}`,
          embedColor: 0x06b6d4
        })
      });
      const data = await res.json();
      setDiscordWebhookResult(data);
      setStatusMessage({
        type: data.ok ? 'success' : 'error',
        text: data.ok
          ? `Discord Webhook Message ID ${data.messageId} delivered to channel ${data.channelId}!`
          : `Discord Webhook Error: ${data.error}`
      });
    } catch (err: any) {
      setDiscordWebhookResult({ ok: false, error: err.message });
    } finally {
      setDiscordWebhookBusy(false);
    }
  };

  const handleExecuteDiscordApiV10 = async (e: React.FormEvent) => {
    e.preventDefault();
    setDiscordApiBusy(true);
    try {
      const res = await apiFetch('/api/os/discord/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: discordBotToken.trim() || undefined,
          action: discordApiAction,
          guildId: discordTargetId.trim() || undefined,
          channelId: discordTargetId.trim() || undefined,
          content: discordApiMessage.trim() || undefined
        })
      });
      const data = await res.json();
      setDiscordApiResult(data);
      setStatusMessage({
        type: data.ok ? 'success' : 'error',
        text: data.ok ? `Discord API v10 (${discordApiAction}) succeeded.` : `Discord API v10 Error: ${data.error}`
      });
    } catch (err: any) {
      setDiscordApiResult({ ok: false, error: err.message });
    } finally {
      setDiscordApiBusy(false);
    }
  };

  const handleInspectPeBinary = async (filePathToInspect?: string) => {
    const target = (filePathToInspect ?? peTargetFile).trim();
    if (!target) return;
    setPeBusy(true);
    try {
      const res = await apiFetch('/api/os/windows/inspect-pe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: target })
      });
      const data = await res.json();
      if (data.analysis) {
        setPeAnalysis(data.analysis);
        setStatusMessage({
          type: data.analysis.validPe ? 'success' : 'info',
          text: data.analysis.validPe
            ? `Verified Windows ${data.analysis.optionalHeader?.peFormat} (${data.analysis.coffHeader?.machineArchitecture}) — EntryPoint ${data.analysis.optionalHeader?.addressOfEntryPoint}`
            : data.analysis.error || 'Binary inspected'
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setPeBusy(false);
    }
  };

  const handleExecutePeBinary = async (filePathToRun?: string) => {
    const target = (filePathToRun ?? peTargetFile).trim();
    if (!target) return;
    setPeBusy(true);
    setPeExecutionLog(`Loading Windows PE binary [${target}] into WINEPREFIX / Win32 Subsystem...`);
    try {
      const res = await apiFetch('/api/os/windows/execute-pe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: target })
      });
      const data = await res.json();
      if (data.peAnalysis) {
        setPeAnalysis(data.peAnalysis);
      }
      setPeExecutionLog(
        `[Execution Mode: ${data.executionMode}]\n[Command: ${data.command}]\n\n${data.output || ''}`
      );
      await fetchWinePrefixStatus();
    } catch (err: any) {
      setPeExecutionLog(`Execution error: ${err.message}`);
    } finally {
      setPeBusy(false);
    }
  };

  const handleUpdateWinePrefix = async (patch: Partial<WinePrefixState>) => {
    try {
      const res = await apiFetch('/api/os/windows/wineprefix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      });
      const data = await res.json();
      if (data.ok && data.winePrefix) {
        setWinePrefix(data.winePrefix);
        setStatusMessage({
          type: 'success',
          text: `Updated WINEPREFIX registry hive (${data.winePrefix.windowsVersion.toUpperCase()}, DXVK=${data.winePrefix.dxvkEnabled}, VKD3D=${data.winePrefix.vkd3dProtonEnabled})`
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  const handleRunCliPackageCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliPackages.trim() && cliAction !== 'update') return;
    setCliBusy(true);
    setStatusMessage({
      type: 'info',
      text: `Executing [${cliManager} ${cliAction} ${cliPackages}] on host kernel...`
    });
    try {
      const res = await apiFetch('/api/os/packages/cli-execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manager: cliManager,
          action: cliAction,
          packages: cliPackages.trim()
        })
      });
      const data = await res.json();
      setCliLogs((prev) => [
        {
          cmd: data.command || `${cliManager} ${cliAction} ${cliPackages}`,
          output: data.output || data.error || 'No stdout returned.',
          code: data.exitCode ?? (data.ok ? 0 : 1),
          time: new Date().toLocaleTimeString()
        },
        ...prev
      ]);
      setStatusMessage({
        type: data.ok ? 'success' : 'error',
        text: data.ok
          ? `CLI Package Operation [${data.command}] completed (Exit Code 0).`
          : `CLI Operation exited with code ${data.exitCode}: check console log below.`
      });
      await fetchPackageOverview();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setCliBusy(false);
    }
  };

  const handleDirectUrlDownload = async (e: React.FormEvent, presetUrl?: string, presetName?: string) => {
    if (e) e.preventDefault();
    const targetUrl = (presetUrl ?? directUrl).trim();
    const targetName = (presetName ?? directFileName).trim();
    if (!targetUrl) return;
    setDirectDownloading(true);
    setStatusMessage({ type: 'info', text: `Streaming binary from ${targetUrl} into local OS filesystem...` });
    try {
      const res = await apiFetch('/api/os/packages/download-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetUrl,
          fileName: targetName || undefined
        })
      });
      const data = await res.json();
      if (data.ok) {
        setStatusMessage({
          type: 'success',
          text: `Saved ${data.fileName} (${(data.sizeBytes / 1024 / 1024).toFixed(2)} MB) · SHA-256: ${data.sha256.slice(0, 16)}...`
        });
        setDirectUrl('');
        setDirectFileName('');
        await fetchPackageOverview();
        if (data.path && (data.path.endsWith('.exe') || data.path.endsWith('.msi'))) {
          setPeTargetFile(data.path);
          await handleInspectPeBinary(data.path);
        }
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Download failed' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setDirectDownloading(false);
    }
  };

  const filteredCatalog = catalog.filter((item) => {
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    const publisherOrVendor = item.vendor || item.publisher || '';
    const matchesSearch =
      !searchQuery.trim() ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      publisherOrVendor.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOs = targetOsFilter === 'ALL' || item.platforms.includes(targetOsFilter);
    return matchesCategory && matchesSearch && matchesOs;
  });

  const categories = [
    'ALL',
    'Gaming',
    'Communication',
    'Development',
    'Media & Streaming',
    'System & Virtualization',
    'Creative'
  ];

  return (
    <div className="h-full flex flex-col bg-[#05070B] text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Header Banner */}
      <div className="px-6 py-4 bg-gradient-to-r from-[#0B111E] via-[#0F172A] to-[#090D16] border-b border-cyan-500/20 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-wide text-white">
                SOVEREIGN UNIVERSAL SOFTWARE, STEAM, DISCORD &amp; WIN32 PE32+ ENGINE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded">
                PC · MAC · LINUX · WIN32 PE32+ · STEAM API · DISCORD v10
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Live Valve Steam Web API &amp; Proton Bridge, Real Discord API v10 / Webhook / Guild Widget Engine, Native Windows PE32/PE32+ (.EXE/.MSI) Binary Inspector &amp; Wine/Proton Prefix Subsystem.
            </p>
          </div>
        </div>

        {/* Host Hardware Summary */}
        {hostInfo && (
          <div className="flex items-center gap-4 bg-slate-900/80 border border-slate-800 px-3.5 py-2 rounded-lg text-xs font-mono">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <Cpu className="w-3.5 h-3.5" />
              <span>
                {hostInfo.platform.toUpperCase()} / {hostInfo.arch} ({hostInfo.cpus} Cores)
              </span>
            </div>
            <div className="h-3 w-[1px] bg-slate-800" />
            <div className="flex items-center gap-1.5 text-emerald-400">
              <HardDrive className="w-3.5 h-3.5" />
              <span>
                {hostInfo.freeMemGb} GB Free / {hostInfo.totalMemGb} GB RAM
              </span>
            </div>
            <div className="h-3 w-[1px] bg-slate-800" />
            <div className="text-amber-400">{installedApps.length} Packages Installed</div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="px-6 pt-2.5 bg-[#080C14] border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('store')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'store'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            App &amp; Game Store ({catalog.length})
          </button>

          <button
            onClick={() => {
              setActiveTab('steam-live');
              if (!localSteamMeta) handleScanLocalSteamLibrary();
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'steam-live'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            Live Valve Steam Client &amp; Proton
          </button>

          <button
            onClick={() => setActiveTab('controllers')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'controllers'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            All Controllers, KB+M &amp; Touch
          </button>

          <button
            onClick={() => setActiveTab('universal-compat')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'universal-compat'
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Beyond-Windows Universal OS Matrix
          </button>

          <button
            onClick={() => {
              setActiveTab('discord-live');
              if (!discordWidgetData) handleFetchDiscordWidget('804856221118169138');
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'discord-live'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Live Discord API v10 &amp; Webhooks
          </button>

          <button
            onClick={() => {
              setActiveTab('windows-pe');
              fetchWinePrefixStatus();
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'windows-pe'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Binary className="w-3.5 h-3.5" />
            Windows Win32 / PE32+ (.EXE) &amp; Wine
          </button>

          <button
            onClick={() => setActiveTab('cli')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'cli'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            CLI Package Manager (apt/brew/winget/npm/pip)
          </button>

          <button
            onClick={() => setActiveTab('direct-url')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'direct-url'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Direct Binary Installer ({downloadedFiles.length})
          </button>

          <button
            onClick={() => setActiveTab('os-deploy')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'os-deploy'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            Sovereign OS Bootloader
          </button>
        </div>

        <button
          onClick={fetchPackageOverview}
          className="px-2.5 py-1.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 mb-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Sync Registry
        </button>
      </div>

      {/* Status Notification Bar */}
      {statusMessage && (
        <div
          className={`px-6 py-2 text-xs font-mono flex items-center justify-between border-b ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
              : statusMessage.type === 'error'
              ? 'bg-rose-950/60 text-rose-300 border-rose-500/30'
              : 'bg-cyan-950/60 text-cyan-300 border-cyan-500/30'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : statusMessage.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* TAB 1: UNIVERSAL APP & GAME STORE */}
        {activeTab === 'store' && (
          <div className="space-y-6">
            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
              <div className="flex items-center gap-1.5 flex-wrap">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedCategory === cat
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-slate-800/70 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Target OS Filter */}
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
                  {(['ALL', 'windows', 'macos', 'linux'] as const).map((osKey) => (
                    <button
                      key={osKey}
                      onClick={() => setTargetOsFilter(osKey)}
                      className={`px-2.5 py-1 rounded-md uppercase font-mono text-[10px] transition-all ${
                        targetOsFilter === osKey
                          ? 'bg-slate-800 text-cyan-400 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {osKey === 'ALL' ? 'All OS' : osKey}
                    </button>
                  ))}
                </div>

                {/* Search Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Steam, Discord, Wine, Blender, Docker..."
                    className="bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white w-64 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Catalog Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredCatalog.map((app) => {
                const isBusy = busyAppId === app.id;
                const vendorName = app.vendor || app.publisher || 'Official Release';
                const nativeUrls = app.nativeDownloadUrls || app.nativeInstallers || {};
                return (
                  <div
                    key={app.id}
                    className="bg-slate-900/70 border border-slate-800/90 hover:border-cyan-500/40 rounded-xl p-5 flex flex-col justify-between transition-all shadow-lg"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white text-base shadow-md shrink-0"
                            style={{
                              background: `linear-gradient(135deg, ${app.accentColor}, #0f172a)`,
                              border: `1px solid ${app.accentColor}66`
                            }}
                          >
                            {app.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-sm text-white">{app.name}</h3>
                              {app.installed && (
                                <span className="px-1.5 py-0.5 text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded">
                                  INSTALLED
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400">
                              {vendorName} · v{app.version} · {app.sizeLabel}
                            </p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] font-mono bg-slate-800 text-cyan-300 rounded border border-slate-700">
                          {app.category}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed mb-3">{app.description}</p>

                      {/* Feature Tags */}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {app.features.map((feat, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 text-[10px] font-mono bg-slate-950/90 text-slate-300 border border-slate-800 rounded"
                          >
                            {feat}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                      {/* Supported Platforms Row */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-mono uppercase text-[10px]">Target Architectures:</span>
                        <div className="flex items-center gap-1.5">
                          {app.platforms.includes('windows') && (
                            <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-300 border border-blue-500/30 rounded text-[10px]">
                              Win64 (.EXE)
                            </span>
                          )}
                          {app.platforms.includes('macos') && (
                            <span className="px-1.5 py-0.5 bg-slate-700/40 text-slate-200 border border-slate-600 rounded text-[10px]">
                              macOS (.DMG)
                            </span>
                          )}
                          {app.platforms.includes('linux') && (
                            <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded text-[10px]">
                              Linux (ELF)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Primary Action Buttons */}
                      <div className="flex items-center gap-2">
                        {app.id === 'steam' || app.id === 'discord' ? (
                          <button
                            onClick={() => handleOpenRealSubsystem(app.id, app.protocolUri)}
                            className="flex-1 py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 transition-all"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            {app.id === 'steam'
                              ? 'Open Live Valve Steam Store & Proton Hub'
                              : 'Open Live Discord API v10 & Webhook Hub'}
                          </button>
                        ) : app.installed ? (
                          <>
                            <button
                              onClick={() => handleOpenRealSubsystem(app.id, app.protocolUri)}
                              className="flex-1 py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 transition-all"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              {app.protocolUri ? `Launch Native (${app.protocolUri})` : 'Inspect & Run in Win32 / Host'}
                            </button>
                            <button
                              onClick={() => handleUninstallApp(app.id, app.name)}
                              disabled={isBusy}
                              className="p-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-all"
                              title="Uninstall Application"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleInstallCatalogApp(app)}
                            disabled={isBusy}
                            className="flex-1 py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/10 transition-all"
                          >
                            {isBusy ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                Provisioning Package...
                              </>
                            ) : (
                              <>
                                <Download className="w-3.5 h-3.5" />
                                Provision Native OS Package
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Direct Native OS Binary Downloaders (Windows / macOS / Linux) */}
                      {(nativeUrls.windows || nativeUrls.macos || nativeUrls.linux) && (
                        <div className="pt-1.5 flex items-center justify-between gap-1.5">
                          <span className="text-[10px] font-mono text-slate-400">Pull Official Vendor Binary:</span>
                          <div className="flex items-center gap-1">
                            {nativeUrls.windows && (
                              <button
                                onClick={() => handleInstallCatalogApp(app, 'windows')}
                                disabled={isBusy}
                                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-blue-300 border border-slate-700"
                                title={`Download official Windows installer (${nativeUrls.windows}) to host disk`}
                              >
                                ↓ Win .EXE
                              </button>
                            )}
                            {nativeUrls.macos && (
                              <button
                                onClick={() => handleInstallCatalogApp(app, 'macos')}
                                disabled={isBusy}
                                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-200 border border-slate-700"
                                title={`Download official macOS installer (${nativeUrls.macos}) to host disk`}
                              >
                                ↓ Mac .DMG
                              </button>
                            )}
                            {nativeUrls.linux && (
                              <button
                                onClick={() => handleInstallCatalogApp(app, 'linux')}
                                disabled={isBusy}
                                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-amber-300 border border-slate-700"
                                title={`Download official Linux package (${nativeUrls.linux}) to host disk`}
                              >
                                ↓ Linux
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: LIVE VALVE STEAM CLIENT & PROTON HUB */}
        {activeTab === 'steam-live' && (
          <div className="space-y-6">
            {/* Top Valve Steam Control Bar */}
            <div className="bg-gradient-to-r from-[#171a21] via-[#1b2838] to-[#0f172a] border border-sky-500/30 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-sky-500/20 text-sky-300 border border-sky-500/40 rounded">
                    LIVE VALVE STEAM WEB API · STEAMCMD · STEAM:// PROTOCOL
                  </span>
                  <span className="text-xs font-mono text-emerald-400">
                    ● Connected to store.steampowered.com &amp; api.steampowered.com
                  </span>
                </div>
                <h2 className="text-base font-bold text-white mt-1">
                  Valve Steam Store, Live Concurrent Player Telemetry, Native Protocol &amp; SteamSetup.exe / SteamCMD Bridge
                </h2>
                <p className="text-xs text-slate-300">
                  Search any game on Steam in real time, inspect live player counts &amp; official Valve CDN trailers, trigger native <code className="text-sky-300">steam://run/&lt;appid&gt;</code> handoff, or download official <code className="text-sky-300">SteamSetup.exe</code> / <code className="text-sky-300">steamcmd</code> to disk.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleSteamNativeAction('download_steam_setup_exe')}
                  disabled={steamActionBusy}
                  className="px-3 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Official SteamSetup.exe (PE32)
                </button>
                <button
                  onClick={() => handleSteamNativeAction('download_steamcmd_linux')}
                  disabled={steamActionBusy}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/30 font-semibold text-xs flex items-center gap-1.5"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  Download Official Valve SteamCMD (Linux)
                </button>
                <a
                  href="steam://open/main"
                  className="px-3 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-semibold text-xs flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Launch Desktop Steam (steam://open/main)
                </a>
              </div>
            </div>

            {steamActionLog && (
              <pre className="bg-slate-950 border border-sky-500/30 rounded-xl p-3.5 text-[11px] font-mono text-sky-300 overflow-x-auto max-h-44">
                {steamActionLog}
              </pre>
            )}

            {/* Live Steam Catalog Search */}
            <form onSubmit={handleSteamSearch} className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={steamSearchTerm}
                  onChange={(e) => setSteamSearchTerm(e.target.value)}
                  placeholder="Search live Valve Steam catalog (e.g., Counter-Strike 2, Elden Ring, Cyberpunk 2077, Baldur's Gate 3, Dota 2)..."
                  className="w-full bg-slate-900 border border-slate-700 focus:border-sky-400 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={steamLoading}
                className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-2"
              >
                {steamLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                Search Live Steam Store
              </button>
            </form>

            {/* Selected Steam Game Deep Inspector */}
            {selectedSteamApp && (
              <div className="bg-[#101826] border border-sky-500/40 rounded-2xl p-5 space-y-4 shadow-xl">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <img
                      src={selectedSteamApp.header_image}
                      alt={selectedSteamApp.name}
                      className="w-48 h-24 object-cover rounded-lg border border-slate-700"
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-white">{selectedSteamApp.name}</h3>
                        <span className="px-2 py-0.5 text-[10px] font-mono bg-sky-500/20 text-sky-300 border border-sky-500/40 rounded">
                          AppID: {selectedSteamApp.appid}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded">
                          ● {selectedSteamApp.current_players.toLocaleString()} Live Players In-Game Now
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Developer: {selectedSteamApp.developers.join(', ')} · Publisher: {selectedSteamApp.publishers.join(', ')} · Released: {selectedSteamApp.release_date?.date}
                      </p>
                      <p className="text-xs text-slate-200 mt-2 max-w-3xl leading-relaxed">
                        {selectedSteamApp.short_description}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedSteamApp(null)}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
                  >
                    Close Inspector
                  </button>
                </div>

                {/* Universal Proton/DXVK/Gamescope/Host-Bridge & Controller Runner Bar */}
                <div className="rounded-xl bg-slate-950/90 border border-slate-800 p-3 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sky-300 font-bold">RUNNER STACK:</span>
                      <select
                        value={steamRunnerMode}
                        onChange={(e) => setSteamRunnerMode(e.target.value as any)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                      >
                        <option value="proton-ge">Proton GE / Valve Proton + DXVK + VKD3D-Proton</option>
                        <option value="native-steam">Native Steam Client (Windows / Linux / macOS)</option>
                        <option value="gamescope-hdr">Gamescope Micro-Compositor (FSR/HDR + Fullscreen)</option>
                        <option value="wine-dxvk">Wine64 + DXVK Standalone Prefix</option>
                        <option value="steamcmd-install">SteamCMD Direct Depot Download &amp; Verify</option>
                      </select>
                      <label className="flex items-center gap-1 text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={steamUseGamemode}
                          onChange={(e) => setSteamUseGamemode(e.target.checked)}
                          className="accent-emerald-400"
                        />
                        <span>GameMode</span>
                      </label>
                      <label className="flex items-center gap-1 text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={steamUseMangoHud}
                          onChange={(e) => setSteamUseMangoHud(e.target.checked)}
                          className="accent-amber-400"
                        />
                        <span>MangoHud FPS</span>
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('controllers')}
                      className="text-emerald-300 hover:underline font-mono text-[10px] cursor-pointer"
                    >
                      Xbox · DualSense · Switch · KB+M · Touch Controller Ready →
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={steamActionBusy}
                      onClick={() => handleUniversalSteamLaunch(selectedSteamApp.appid, selectedSteamApp.name)}
                      className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Launch via Universal Proton / Host Bridge
                    </button>
                    <a
                      href={selectedSteamApp.steam_protocol_run}
                      className="px-3 py-2 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 font-semibold text-xs flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      steam://rungameid/{selectedSteamApp.appid}
                    </a>
                    <a
                      href={selectedSteamApp.steam_protocol_install}
                      className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Install via Steam
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        pinSteamGameToDesktop(selectedSteamApp.appid, selectedSteamApp.name);
                        setStatusMessage({
                          type: 'success',
                          text: `Pinned "${selectedSteamApp.name}" (Steam #${selectedSteamApp.appid}) directly to your Sovereign OS Desktop!`
                        });
                      }}
                      className="px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Pin className="w-3.5 h-3.5" />
                      Pin Game to Desktop
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSteamNativeAction('run_steamcmd', selectedSteamApp.appid)}
                      className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 text-[11px] font-mono cursor-pointer"
                    >
                      SteamCMD Depot Sync
                    </button>
                    {onOpenUrlInBrowser && (
                      <button
                        type="button"
                        onClick={() => onOpenUrlInBrowser(`https://play.geforcenow.com/mall/#/layout/games`)}
                        className="px-3 py-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-xs font-semibold cursor-pointer"
                      >
                        Cloud GPU Play (GeForce NOW)
                      </button>
                    )}
                  </div>

                  {steamUniversalLaunchInfo && (
                    <div className="rounded-lg bg-black/80 border border-emerald-500/30 p-2.5 font-mono text-[10px] text-emerald-300 space-y-1">
                      <div>{steamUniversalLaunchInfo.executionNote}</div>
                      <div className="text-slate-400 break-all">
                        Script: {steamUniversalLaunchInfo.scriptPath}
                      </div>
                      <div className="text-sky-300 break-all">
                        CMD: {steamUniversalLaunchInfo.launchCommand}
                      </div>
                    </div>
                  )}
                </div>

                {/* Official Valve CDN Trailer Video + Screenshots */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
                  {selectedSteamApp.movies && selectedSteamApp.movies.length > 0 && (
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                      <div className="text-[11px] font-mono text-sky-400 mb-2">
                        OFFICIAL VALVE CDN STREAMING TRAILER — {selectedSteamApp.movies[0].name}
                      </div>
                      <video
                        controls
                        poster={selectedSteamApp.movies[0].thumbnail}
                        className="w-full rounded-lg max-h-60 bg-black"
                      >
                        {selectedSteamApp.movies[0].mp4_480 && (
                          <source src={selectedSteamApp.movies[0].mp4_480} type="video/mp4" />
                        )}
                        {selectedSteamApp.movies[0].webm_480 && (
                          <source src={selectedSteamApp.movies[0].webm_480} type="video/webm" />
                        )}
                      </video>
                    </div>
                  )}

                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                    <div className="text-[11px] font-mono text-emerald-400 mb-2">
                      HIGH-RESOLUTION IN-GAME SCREENSHOTS &amp; GENRES ({selectedSteamApp.genres.join(' · ')})
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedSteamApp.screenshots.slice(0, 4).map((shot) => (
                        <img
                          key={shot.id}
                          src={shot.path_thumbnail}
                          alt="Screenshot"
                          className="w-full h-24 object-cover rounded border border-slate-800"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Search Results Section (if active) */}
            {steamSearchResults.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-sky-400">
                  Live Valve Store Search Results ({steamSearchResults.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {steamSearchResults.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => fetchSteamGameDetails(item.id)}
                      className="bg-slate-900/90 border border-slate-800 hover:border-sky-500/50 rounded-xl p-3 cursor-pointer transition-all flex flex-col justify-between"
                    >
                      <div>
                        <img
                          src={item.tiny_image}
                          alt={item.name}
                          className="w-full h-28 object-cover rounded-lg mb-2.5 border border-slate-800"
                        />
                        <h4 className="font-bold text-xs text-white line-clamp-1">{item.name}</h4>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                          AppID: {item.id} · {item.price ? `$${(item.price.final / 100).toFixed(2)}` : 'Free / Live'}
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-sky-400">Inspect Live Players &amp; Trailer →</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live Featured & Top Sellers Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono uppercase tracking-wider text-emerald-400">
                  Live Valve Steam Featured &amp; Top Selling PC Titles (Click any title for real-time player count &amp; native launch)
                </h3>
                {steamDetailsLoading && (
                  <span className="text-xs font-mono text-sky-400 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Querying Valve AppDetails &amp; ISteamUserStats...
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...steamFeatured, ...steamTopSellers].slice(0, 16).map((game, idx) => (
                  <div
                    key={`${game.id}-${idx}`}
                    onClick={() => fetchSteamGameDetails(game.id)}
                    className="bg-[#121a28] border border-slate-800 hover:border-sky-400/60 rounded-xl overflow-hidden cursor-pointer transition-all flex flex-col justify-between shadow-md"
                  >
                    <div>
                      <img src={game.header_image} alt={game.name} className="w-full h-28 object-cover" />
                      <div className="p-3">
                        <h4 className="font-bold text-xs text-white line-clamp-1">{game.name}</h4>
                        <div className="flex items-center justify-between mt-1.5 text-[11px] font-mono">
                          <span className="text-slate-400">AppID {game.id}</span>
                          <span className="text-emerald-400 font-bold">
                            {game.final_price === 0
                              ? 'Free to Play'
                              : game.final_price
                              ? `$${(game.final_price / 100).toFixed(2)}`
                              : 'Live on Steam'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="px-3 py-2 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        {game.windows_available && <span>WIN</span>}
                        {game.mac_available && <span>· MAC</span>}
                        {game.linux_available && <span>· LINUX</span>}
                      </div>
                      <span className="text-sky-400">steam://run/{game.id}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Real Local Steam Library VDF / ACF Scanner */}
            <div className="bg-slate-900/90 border border-sky-500/30 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4" />
                    <span>Local Installed Steam Library Scanner (VDF / ACF · Host + Physical PC Bridge)</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Scans <code className="text-slate-300">libraryfolders.vdf</code> &amp; <code className="text-slate-300">appmanifest_*.acf</code> across Linux, macOS, Windows (C:\Program Files (x86)\Steam), WSL, and Physical Host Bridge (<code className="text-emerald-300">127.0.0.1:4747</code>).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={localSteamPath}
                    onChange={(e) => setLocalSteamPath(e.target.value)}
                    placeholder="Optional custom steamapps path..."
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white w-56"
                  />
                  <button
                    type="button"
                    disabled={localSteamScanning}
                    onClick={() => handleScanLocalSteamLibrary()}
                    className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${localSteamScanning ? 'animate-spin' : ''}`} />
                    <span>Scan Steam Libraries</span>
                  </button>
                </div>
              </div>

              {localSteamMeta && (
                <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-slate-400">
                  <span>Source: <strong className="text-sky-300">{localSteamMeta.source}</strong></span>
                  <span>Libraries Found: <strong className="text-emerald-300">{localSteamMeta.existingLibraries.length}</strong></span>
                  <span>Installed Titles: <strong className="text-amber-300">{localSteamGames.length}</strong></span>
                  <span>Steam Binary: <strong className={localSteamMeta.steamBinaryAvailable ? 'text-emerald-300' : 'text-slate-400'}>{localSteamMeta.steamBinaryAvailable ? 'Detected' : 'Use Physical Host Bridge'}</strong></span>
                </div>
              )}

              {localSteamGames.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {localSteamGames.map((g) => (
                    <div
                      key={g.appid}
                      className="rounded-lg bg-slate-950 border border-slate-800 p-3 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{g.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          AppID {g.appid} · {g.sizeOnDisk ? `${(g.sizeOnDisk / 1024 / 1024 / 1024).toFixed(1)} GB` : 'Installed'}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUniversalSteamLaunch(g.appid, g.name)}
                          className="px-2 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-bold cursor-pointer"
                        >
                          Play
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            pinSteamGameToDesktop(g.appid, g.name);
                            setStatusMessage({ type: 'success', text: `Pinned ${g.name} to Desktop.` });
                          }}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] cursor-pointer"
                          title="Pin to Desktop"
                        >
                          Pin
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 bg-slate-950/70 border border-slate-800/80 rounded-lg p-3">
                  No local <code className="text-slate-300">appmanifest_*.acf</code> files found on this cloud container yet. To scan &amp; play every game installed on your physical Windows/Linux/macOS PC GPU directly from Lysander OS, launch the Physical Host Bridge (<code className="text-emerald-300">127.0.0.1:4747</code>) from <strong>This PC → Physical Host Bridge</strong>, or search &amp; launch any Steam AppID above!
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: UNIVERSAL MULTI-CONTROLLER, KEYBOARD/MOUSE & MULTI-TOUCH ENGINE */}
        {activeTab === 'controllers' && <UniversalControllerDeck />}

        {/* TAB: BEYOND-WINDOWS UNIVERSAL COMPATIBILITY MATRIX */}
        {activeTab === 'universal-compat' && <UniversalCompatMatrixPanel />}

        {/* TAB 3: LIVE DISCORD API v10, WEBHOOKS & GUILD WIDGET HUB */}
        {activeTab === 'discord-live' && (
          <div className="space-y-6">
            {/* Top Discord Header */}
            <div className="bg-gradient-to-r from-[#1e1f38] via-[#2b2d5c] to-[#111526] border border-indigo-500/40 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded">
                    DISCORD REST API v10 · LIVE WEBHOOK DISPATCHER · PUBLIC GUILD PRESENCE
                  </span>
                </div>
                <h2 className="text-base font-bold text-white mt-1">
                  Real Discord API v10 Client, Live Webhook Embed Dispatcher &amp; Server Presence Inspector
                </h2>
                <p className="text-xs text-slate-300">
                  Dispatch real messages &amp; embeds to any Discord channel via Webhook, query live Discord servers via <code className="text-indigo-300">discord.com/api/v10</code>, or trigger the native <code className="text-indigo-300">discord://</code> desktop protocol.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {onOpenUrlInBrowser && (
                  <button
                    onClick={() => onOpenUrlInBrowser('https://discord.com/app')}
                    className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Open discord.com/app in Sovereign Browser
                  </button>
                )}
                <a
                  href="discord://"
                  className="px-3.5 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Launch Desktop Discord App (discord://)
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Column 1: Real Discord Webhook Dispatcher */}
              <form
                onSubmit={handleSendDiscordWebhook}
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Send className="w-4 h-4 text-indigo-400" />
                    Live Discord Webhook Message &amp; Embed Dispatcher
                  </h3>
                  <span className="text-[10px] font-mono text-emerald-400">POST ?wait=true</span>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                    Discord Channel Webhook URL (https://discord.com/api/webhooks/...)
                  </label>
                  <input
                    type="url"
                    value={discordWebhookUrl}
                    onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                    placeholder="https://discord.com/api/webhooks/1234567890/abcdef..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                      Bot / Override Username
                    </label>
                    <input
                      type="text"
                      value={discordWebhookUsername}
                      onChange={(e) => setDiscordWebhookUsername(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                      Rich Embed Title
                    </label>
                    <input
                      type="text"
                      value={discordWebhookTitle}
                      onChange={(e) => setDiscordWebhookTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Message Payload</label>
                  <textarea
                    rows={3}
                    value={discordWebhookContent}
                    onChange={(e) => setDiscordWebhookContent(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={discordWebhookBusy}
                  className="w-full py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs flex items-center justify-center gap-2"
                >
                  {discordWebhookBusy ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Dispatch Real Webhook Payload to Discord
                </button>

                {discordWebhookResult && (
                  <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-[11px] font-mono text-indigo-300 overflow-x-auto max-h-40">
                    {JSON.stringify(discordWebhookResult, null, 2)}
                  </pre>
                )}
              </form>

              {/* Column 2: Real Discord REST API v10 Client */}
              <form
                onSubmit={handleExecuteDiscordApiV10}
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Radio className="w-4 h-4 text-cyan-400" />
                    Discord REST API v10 Direct Client (Bot / User Token)
                  </h3>
                  <span className="text-[10px] font-mono text-cyan-400">https://discord.com/api/v10</span>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                    Discord Bot Token (or leave blank to use DISCORD_BOT_TOKEN from AES-256-GCM Vault)
                  </label>
                  <input
                    type="password"
                    value={discordBotToken}
                    onChange={(e) => setDiscordBotToken(e.target.value)}
                    placeholder="Bot MT..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">API v10 Endpoint</label>
                    <select
                      value={discordApiAction}
                      onChange={(e) => setDiscordApiAction(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none"
                    >
                      <option value="get_me">GET /users/@me (Verify Identity)</option>
                      <option value="get_guilds">GET /users/@me/guilds (List Servers)</option>
                      <option value="get_channels">GET /guilds/:id/channels (List Channels)</option>
                      <option value="get_messages">GET /channels/:id/messages (Read Chat)</option>
                      <option value="send_message">POST /channels/:id/messages (Send Chat)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                      Target Guild ID or Channel ID
                    </label>
                    <input
                      type="text"
                      value={discordTargetId}
                      onChange={(e) => setDiscordTargetId(e.target.value)}
                      placeholder="Required for channels / messages"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none"
                    />
                  </div>
                </div>

                {discordApiAction === 'send_message' && (
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                      Channel Message Content
                    </label>
                    <input
                      type="text"
                      value={discordApiMessage}
                      onChange={(e) => setDiscordApiMessage(e.target.value)}
                      placeholder="Enter live message to post to Discord channel..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={discordApiBusy}
                  className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2"
                >
                  {discordApiBusy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Terminal className="w-4 h-4" />}
                  Execute Live Discord API v10 Call
                </button>

                {discordApiResult && (
                  <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-44">
                    {JSON.stringify(discordApiResult, null, 2)}
                  </pre>
                )}
              </form>
            </div>

            {/* Public Discord Server Live Widget Inspector */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    Live Public Discord Server Presence &amp; Voice Channel Widget Inspector
                  </h3>
                  <p className="text-xs text-slate-400">
                    Queries <code className="text-indigo-300">https://discord.com/api/guilds/:guildId/widget.json</code> for real-time online member presence, active games, and voice channels.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={discordGuildId}
                    onChange={(e) => setDiscordGuildId(e.target.value)}
                    placeholder="Discord Guild ID"
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono w-52 outline-none"
                  />
                  <button
                    onClick={() => handleFetchDiscordWidget()}
                    disabled={discordWidgetLoading}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
                  >
                    {discordWidgetLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    Inspect Live Guild
                  </button>
                </div>
              </div>

              {discordWidgetData && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  {discordWidgetData.ok ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-bold text-white">{discordWidgetData.guildName}</h4>
                          <p className="text-xs text-emerald-400 font-mono">
                            ● {discordWidgetData.presenceCount} Members Online Right Now (Guild ID: {discordWidgetData.guildId})
                          </p>
                        </div>
                        {discordWidgetData.instantInvite && (
                          <a
                            href={discordWidgetData.instantInvite}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-mono"
                          >
                            Join Invite: {discordWidgetData.instantInvite}
                          </a>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-2">
                        {(discordWidgetData.members || []).slice(0, 18).map((m: any) => (
                          <div
                            key={m.id}
                            className="bg-slate-900 border border-slate-800 rounded-lg p-2 flex items-center gap-2"
                          >
                            {m.avatar_url && (
                              <img src={m.avatar_url} alt={m.username} className="w-6 h-6 rounded-full" />
                            )}
                            <div className="overflow-hidden">
                              <div className="text-[11px] font-semibold text-white truncate">{m.username}</div>
                              <div className="text-[9px] font-mono text-emerald-400 truncate">
                                {m.game ? m.game.name : m.status}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs font-mono text-amber-300">
                      Guild response: {discordWidgetData.error} (Enter any Discord Guild ID with Server Widget enabled in Server Settings → Widget).
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: WINDOWS WIN32 / PE32+ (.EXE / .MSI) BINARY LOADER & WINE / PROTON SUBSYSTEM */}
        {activeTab === 'windows-pe' && (
          <div className="space-y-6">
            {/* Top Banner */}
            <div className="bg-gradient-to-r from-[#071a16] via-[#0b2520] to-[#09121d] border border-emerald-500/30 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded">
                    WINDOWS WIN32 / PE32+ (.EXE / .MSI) LOADER · WINEPREFIX · DXVK DIRECTX 11/12
                  </span>
                </div>
                <h2 className="text-base font-bold text-white mt-1">
                  Real Windows PE32/PE32+ Binary Header Dissector &amp; Wine / Proton Execution Environment
                </h2>
                <p className="text-xs text-slate-300">
                  Download any real Windows <code className="text-emerald-300">.exe</code> or <code className="text-emerald-300">.msi</code> application, parse its real binary DOS <code className="text-emerald-300">MZ (0x5A4D)</code> header, COFF <code className="text-emerald-300">PE\0\0 (0x00004550)</code> architecture, EntryPoint RVA, ImageBase, and Section Table (<code className="text-emerald-300">.text</code>, <code className="text-emerald-300">.rdata</code>, <code className="text-emerald-300">.data</code>, <code className="text-emerald-300">.rsrc</code>), and execute it via the Sovereign <code className="text-emerald-300">WINEPREFIX</code>.
                </p>
              </div>

              {/* Quick 1-Click Real Windows .EXE Downloads for Instant Inspection */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={(e) =>
                    handleDirectUrlDownload(
                      e as any,
                      'https://www.7-zip.org/a/7z2408-x64.exe',
                      '7z2408-x64.exe'
                    )
                  }
                  disabled={directDownloading}
                  className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Pull &amp; Inspect 7-Zip Win64 (7z2408-x64.exe)
                </button>
                <button
                  onClick={(e) =>
                    handleDirectUrlDownload(
                      e as any,
                      'https://the.earth.li/~sgtatham/putty/latest/w64/putty.exe',
                      'putty-win64.exe'
                    )
                  }
                  disabled={directDownloading}
                  className="px-3 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Pull &amp; Inspect PuTTY Win64 (putty-win64.exe)
                </button>
                <button
                  onClick={() => handleSteamNativeAction('download_steam_setup_exe')}
                  disabled={steamActionBusy}
                  className="px-3 py-2 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 font-semibold text-xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Pull &amp; Inspect Valve SteamSetup.exe
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Column 1: WINEPREFIX & DirectX / Proton Configurator */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    Sovereign WINEPREFIX &amp; DirectX 11/12 (DXVK / VKD3D) Subsystem
                  </h3>
                  <span className="text-[10px] font-mono text-emerald-400">
                    {winePrefix?.prefixPath || '/app/applet/wineprefix'}
                  </span>
                </div>

                {winePrefix && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                      <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg">
                        <div className="text-[10px] text-slate-400">WINDOWS ABI MODE</div>
                        <div className="text-emerald-400 font-bold uppercase mt-0.5">{winePrefix.windowsVersion}</div>
                      </div>
                      <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg">
                        <div className="text-[10px] text-slate-400">PE ARCHITECTURE</div>
                        <div className="text-cyan-400 font-bold uppercase mt-0.5">{winePrefix.architecture} (PE32+)</div>
                      </div>
                      <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg">
                        <div className="text-[10px] text-slate-400">DRIVE_C EXECUTABLES</div>
                        <div className="text-amber-400 font-bold mt-0.5">
                          {winePrefix.installedExesInDriveC.length} .EXE Binaries
                        </div>
                      </div>
                    </div>

                    {/* Toggle Controls for Wine Registry Hive */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        onClick={() =>
                          handleUpdateWinePrefix({
                            windowsVersion: winePrefix.windowsVersion === 'win11' ? 'win10' : 'win11'
                          })
                        }
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-white border border-slate-700"
                      >
                        Switch OS Version ({winePrefix.windowsVersion === 'win11' ? 'Win11 → Win10' : 'Win10 → Win11'})
                      </button>

                      <button
                        onClick={() => handleUpdateWinePrefix({ dxvkEnabled: !winePrefix.dxvkEnabled })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono border ${
                          winePrefix.dxvkEnabled
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        DXVK (D3D11→Vulkan): {winePrefix.dxvkEnabled ? 'ON' : 'OFF'}
                      </button>

                      <button
                        onClick={() => handleUpdateWinePrefix({ vkd3dProtonEnabled: !winePrefix.vkd3dProtonEnabled })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono border ${
                          winePrefix.vkd3dProtonEnabled
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        VKD3D-Proton (D3D12→Vulkan): {winePrefix.vkd3dProtonEnabled ? 'ON' : 'OFF'}
                      </button>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1">
                      <div className="text-[10px] font-mono text-slate-400 uppercase">
                        Active Wine Registry Hive (user.reg):
                      </div>
                      {winePrefix.registrySummary.map((line, i) => (
                        <div key={i} className="text-[11px] font-mono text-emerald-300">
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Column 2: Windows PE32 / PE32+ Binary Inspector & Loader */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileCode2 className="w-4 h-4 text-cyan-400" />
                  Inspect &amp; Execute Local Windows .EXE / .MSI Binary
                </h3>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={peTargetFile}
                    onChange={(e) => setPeTargetFile(e.target.value)}
                    placeholder="Path or filename in /app/applet/downloads (e.g., 7z2408-x64.exe)"
                    className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none"
                  />
                  <button
                    onClick={() => handleInspectPeBinary()}
                    disabled={peBusy}
                    className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
                  >
                    Inspect PE32+
                  </button>
                  <button
                    onClick={() => handleExecutePeBinary()}
                    disabled={peBusy}
                    className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Execute .EXE
                  </button>
                </div>

                {/* Quick Select from Downloaded Binaries */}
                {downloadedFiles.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-mono text-slate-400 uppercase">
                      Downloaded Binaries on Host Disk (Click to Inspect PE Header):
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {downloadedFiles.map((f, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setPeTargetFile(f.path);
                            handleInspectPeBinary(f.path);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 text-[11px] font-mono text-cyan-300 border border-slate-800"
                        >
                          {f.name} ({(f.sizeBytes / 1024).toFixed(0)} KB)
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {peExecutionLog && (
                  <pre className="bg-slate-950 border border-emerald-500/30 rounded-lg p-3 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-40">
                    {peExecutionLog}
                  </pre>
                )}
              </div>
            </div>

            {/* Detailed PE32 / PE32+ Header Dissection Table */}
            {peAnalysis && (
              <div className="bg-slate-900/90 border border-emerald-500/40 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Forensic PE32/PE32+ Executable Dissection: <span className="text-emerald-400">{peAnalysis.fileName}</span>
                    </h3>
                    <p className="text-xs font-mono text-slate-400">
                      Path: {peAnalysis.filePath} · Size: {peAnalysis.fileSizeBytes.toLocaleString()} bytes · SHA-256: {peAnalysis.sha256}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                      peAnalysis.validPe
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {peAnalysis.validPe ? peAnalysis.optionalHeader?.peFormat : peAnalysis.error || 'Non-PE Binary'}
                  </span>
                </div>

                {peAnalysis.validPe && peAnalysis.coffHeader && peAnalysis.optionalHeader && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1">
                      <div className="text-cyan-400 font-bold mb-1">DOS &amp; COFF FILE HEADER</div>
                      <div>DOS e_magic: <span className="text-white">{peAnalysis.dosHeader.e_magic}</span></div>
                      <div>PE Offset (e_lfanew): <span className="text-white">{peAnalysis.dosHeader.e_lfanew}</span></div>
                      <div>Signature: <span className="text-emerald-400">{peAnalysis.coffHeader.signature}</span></div>
                      <div>Architecture: <span className="text-white">{peAnalysis.coffHeader.machineArchitecture}</span></div>
                      <div>Compiled Timestamp: <span className="text-slate-300">{peAnalysis.coffHeader.timeDateStamp}</span></div>
                      <div>Flags: <span className="text-amber-300">{peAnalysis.coffHeader.characteristicsFlags.join(', ')}</span></div>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1">
                      <div className="text-emerald-400 font-bold mb-1">OPTIONAL HEADER ({peAnalysis.optionalHeader.magicHex})</div>
                      <div>Format: <span className="text-white">{peAnalysis.optionalHeader.peFormat}</span></div>
                      <div>EntryPoint RVA: <span className="text-emerald-300">{peAnalysis.optionalHeader.addressOfEntryPoint}</span></div>
                      <div>ImageBase: <span className="text-cyan-300">{peAnalysis.optionalHeader.imageBase}</span></div>
                      <div>Size of Code: <span className="text-white">{peAnalysis.optionalHeader.sizeOfCode.toLocaleString()} bytes</span></div>
                      <div>Subsystem: <span className="text-white">{peAnalysis.optionalHeader.subsystemName}</span></div>
                      <div>Security: <span className="text-amber-300">{peAnalysis.optionalHeader.dllCharacteristicsFlags.join(', ')}</span></div>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1">
                      <div className="text-amber-400 font-bold mb-1">
                        PE SECTION TABLE ({peAnalysis.sections.length} Sections)
                      </div>
                      {peAnalysis.sections.map((sec, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[11px] border-b border-slate-900 py-0.5">
                          <span className="text-white font-bold">{sec.name}</span>
                          <span className="text-slate-400">VA {sec.virtualAddress}</span>
                          <span className="text-emerald-400">{sec.rawSize.toLocaleString()} B</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: CLI PACKAGE MANAGER (apt / brew / winget / flatpak / npm / pip / git) */}
        {activeTab === 'cli' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2.5">
                <Terminal className="w-5 h-5 text-amber-400" />
                <h2 className="text-sm font-bold text-white">Universal CLI Package Bridge</h2>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Install or manage any package across Linux (<code className="text-cyan-300">apt</code>,{' '}
                <code className="text-cyan-300">flatpak</code>), macOS (<code className="text-cyan-300">brew</code>),
                Windows (<code className="text-cyan-300">winget</code>), or language ecosystems (
                <code className="text-cyan-300">npm</code>, <code className="text-cyan-300">pip</code>,{' '}
                <code className="text-cyan-300">git clone</code>).
              </p>

              <form onSubmit={handleRunCliPackageCommand} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
                    Package Manager / Runtime
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['npm', 'pip', 'git', 'apt', 'brew', 'winget', 'flatpak', 'custom'] as const).map((mgr) => {
                      const available = hostInfo?.managers?.[mgr];
                      return (
                        <button
                          type="button"
                          key={mgr}
                          onClick={() => setCliManager(mgr)}
                          className={`py-1.5 px-2 rounded-lg text-xs font-mono uppercase border text-center transition-all ${
                            cliManager === mgr
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                          }`}
                        >
                          {mgr}
                          {available && <span className="ml-1 text-emerald-400">●</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">Operation</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['install', 'uninstall', 'search', 'update'] as const).map((act) => (
                      <button
                        type="button"
                        key={act}
                        onClick={() => setCliAction(act)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-mono uppercase border transition-all ${
                          cliAction === act
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {act}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
                    {cliManager === 'git'
                      ? 'Repository URL'
                      : cliManager === 'custom'
                      ? 'Shell Command'
                      : 'Package Name(s)'}
                  </label>
                  <input
                    type="text"
                    value={cliPackages}
                    onChange={(e) => setCliPackages(e.target.value)}
                    placeholder={
                      cliManager === 'winget'
                        ? 'Valve.Steam or Discord.Discord'
                        : cliManager === 'brew'
                        ? '--cask steam discord obs'
                        : cliManager === 'apt'
                        ? 'steam-installer vlc obs-studio'
                        : cliManager === 'git'
                        ? 'https://github.com/user/repo.git'
                        : 'three @types/three'
                    }
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-lg px-3 py-2 text-xs font-mono text-white outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={cliBusy}
                  className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10"
                >
                  {cliBusy ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Executing on Host Kernel...
                    </>
                  ) : (
                    <>
                      <Terminal className="w-4 h-4" />
                      Execute {cliManager.toUpperCase()} {cliAction.toUpperCase()}
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Right Column: Live Terminal Output Stream */}
            <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col h-[560px]">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-mono text-slate-300">
                    SOVEREIGN PACKAGE EXECUTION STREAM (UID 0 PRIVILEGED SHELL)
                  </span>
                </div>
                <button
                  onClick={() => setCliLogs([])}
                  className="text-[11px] font-mono text-slate-400 hover:text-white"
                >
                  Clear Output
                </button>
              </div>

              <div className="flex-1 overflow-y-auto font-mono text-xs space-y-4">
                {cliLogs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center">
                    <Terminal className="w-8 h-8 mb-2 opacity-40" />
                    <p>No CLI package jobs executed yet in this session.</p>
                  </div>
                ) : (
                  cliLogs.map((entry, idx) => (
                    <div key={idx} className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                        <span className="text-cyan-400 font-bold">$ {entry.cmd}</span>
                        <div className="flex items-center gap-2">
                          <span>{entry.time}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              entry.code === 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            EXIT {entry.code}
                          </span>
                        </div>
                      </div>
                      <pre className="text-[11px] text-slate-200 whitespace-pre-wrap break-all max-h-64 overflow-y-auto">
                        {entry.output}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: DIRECT URL BINARY INSTALLER (.exe, .dmg, .AppImage, .deb, .tar.gz) */}
        {activeTab === 'direct-url' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2.5">
                <Download className="w-5 h-5 text-purple-400" />
                <h2 className="text-sm font-bold text-white">Direct URL Binary Pull &amp; SHA-256 Verifier</h2>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Download any standalone Windows (<code className="text-purple-300">.exe / .msi</code>), macOS (
                <code className="text-purple-300">.dmg / .pkg</code>), or Linux (
                <code className="text-purple-300">.AppImage / .deb / .tar.gz</code>) binary directly to the Sovereign OS filesystem with automatic SHA-256 checksum &amp; PE32+ verification.
              </p>

              <form onSubmit={(e) => handleDirectUrlDownload(e)} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
                    Direct Binary / Installer URL
                  </label>
                  <input
                    type="url"
                    required
                    value={directUrl}
                    onChange={(e) => setDirectUrl(e.target.value)}
                    placeholder="https://cdn.fastly.steamstatic.com/client/installer/SteamSetup.exe"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-lg px-3 py-2 text-xs font-mono text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
                    Save As Filename (Optional)
                  </label>
                  <input
                    type="text"
                    value={directFileName}
                    onChange={(e) => setDirectFileName(e.target.value)}
                    placeholder="SteamSetup.exe"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-lg px-3 py-2 text-xs font-mono text-white outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={directDownloading}
                  className="w-full py-2.5 px-4 rounded-lg bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-500/10"
                >
                  {directDownloading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Streaming Binary to Disk...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Download &amp; Verify SHA-256 / PE32+
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-bold text-white">
                    Downloaded Native Installers &amp; Binaries ({hostInfo?.downloadsDir || '/app/applet/downloads'})
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-400">{downloadedFiles.length} Files on Disk</span>
              </div>

              {downloadedFiles.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs font-mono">
                  <HardDrive className="w-8 h-8 mb-2 opacity-40" />
                  <p>No standalone binaries downloaded yet.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {downloadedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white font-mono">{file.name}</span>
                          <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Verified on Disk
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                          Path: {file.path} · Size: {(file.sizeBytes / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setPeTargetFile(file.path);
                          setActiveTab('windows-pe');
                          handleInspectPeBinary(file.path);
                        }}
                        className="px-3 py-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono"
                      >
                        Inspect PE32+ / Execute →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: SOVEREIGN OS BOOTLOADER (Bare-Metal PC / Mac / Linux Deployment) */}
        {activeTab === 'os-deploy' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border border-rose-500/30 rounded-xl p-5">
              <h2 className="text-base font-bold text-white mb-1">
                Deploy Lysander Sovereign OS Natively on Any PC (Windows), Mac (Apple Silicon / Intel), or Linux Workstation
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Run these one-line bootstrap commands on your local machine to launch Lysander Sovereign OS with full bare-metal GPU acceleration, native Docker/QEMU virtualization, local Steam/Proton execution, and direct hardware access.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                  <Laptop className="w-4 h-4" />
                  Windows 10 / 11 (PowerShell Admin)
                </div>
                <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-[11px] font-mono text-blue-300 overflow-x-auto">
{`winget install OpenJS.NodeJS.LTS Git.Git Valve.Steam Discord.Discord
git clone https://github.com/sovereign-os/lysander-genesis.git
cd lysander-genesis
npm install
npm run dev`}
                </pre>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
                  <Apple className="w-4 h-4" />
                  macOS Apple Silicon (M1/M2/M3/M4) &amp; Intel
                </div>
                <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-[11px] font-mono text-slate-200 overflow-x-auto">
{`brew install node git
brew install --cask steam discord obs vlc blender
git clone https://github.com/sovereign-os/lysander-genesis.git
cd lysander-genesis && npm install && npm run dev`}
                </pre>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <Server className="w-4 h-4" />
                  Linux (Ubuntu / Debian / Arch / Fedora)
                </div>
                <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-[11px] font-mono text-amber-300 overflow-x-auto">
{`sudo apt update && sudo apt install -y nodejs npm git wine64 steam-installer flatpak
flatpak install -y flathub com.discordapp.Discord com.obsproject.Studio
git clone https://github.com/sovereign-os/lysander-genesis.git
cd lysander-genesis && npm install && npm run dev`}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UniversalInstallerModule;
