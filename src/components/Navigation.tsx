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
  MessageSquare,
  Search,
  MapPin,
  Music,
  Image as ImageIcon,
  Video,
  Mic,
  Radio,
  Archive,
  FolderGit2,
  ShieldAlert,
  ShieldCheck,
  Globe,
  FileText,
  UserCheck,
  Eye,
  Cpu,
  Database,
  Terminal,
  Activity,
  Layers,
  Zap,
  Smartphone,
  Mail,
  Grid,
  X,
  ChevronRight,
  ChevronLeft,
  BookmarkPlus,
  Package,
  HardDrive,
  Network,
  Wrench,
  Download,
  Key,
  Phone,
  ListTodo,
  Box,
  Play,
  Gamepad2,
  FlaskConical,
  TrendingUp,
  Folder,
  Settings,
  Wallet,
  Award,
  ArrowUpDown
} from 'lucide-react';
import type { ModuleType } from '../types';
import { SoSMeshIcon } from './SoSMeshIcon';
import { AdminCommandIcon } from './AdminCommandIcon';
import { canAccessAdminCommandCenter, type AuthUserPublic } from '../types/auth';

export type WorkspaceGroupId = 'core' | 'workspace' | 'intelligence' | 'creative' | 'system';

export interface SubAgentStatus {
  id: 'vision' | 'logic' | 'memory' | 'audio' | 'grounding' | 'kernel';
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'IDLE' | 'PROCESSING' | 'SYNCHRONIZED' | 'STANDBY';
  currentTask: string;
  loadPct: number;
  color: string;
  bgColor: string;
  borderColor: string;
}

export interface ModuleRegistryItem {
  id: ModuleType;
  label: string;
  shortLabel?: string;
  group: WorkspaceGroupId;
  category: 'command' | 'creative' | 'intelligence' | 'data';
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  activeBg: string;
  description: string;
  adminOnly?: boolean;
}

export const WORKSPACE_GROUPS: Array<{ id: WorkspaceGroupId; label: string }> = [
  { id: 'core', label: 'Core & Autonomy' },
  { id: 'workspace', label: 'Cloud & Workspace' },
  { id: 'intelligence', label: 'Intelligence & Web' },
  { id: 'creative', label: 'Creative Studio' },
  { id: 'system', label: 'Edge & Security' }
];

export const ALL_MODULES: ModuleRegistryItem[] = [
  {
    id: 'chat',
    label: 'Sovereign Chat',
    group: 'core',
    category: 'command',
    icon: MessageSquare,
    accentColor: 'text-amber-400',
    activeBg: 'bg-amber-500/12 border-amber-500/35 text-amber-200',
    description: 'Primary autonomous orchestrator chat with multi-model cascade, agent wardrobe & live workspace tools'
  },
  {
    id: 'ai-genesis-distillery',
    label: 'AI Genesis & Molecular Distillery',
    shortLabel: 'AI Distillery',
    group: 'core',
    category: 'command',
    icon: FlaskConical,
    accentColor: 'text-cyan-400',
    activeBg: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200',
    description: 'Create custom AI & autonomous agents, forge neural weights (.safetensors), run autonomous training & molecularly distill ideal agent states'
  },
  {
    id: 'macro-telemetry',
    label: 'Macro-Telemetry & Capital Flows',
    shortLabel: 'Macro Telemetry',
    group: 'core',
    category: 'command',
    icon: TrendingUp,
    accentColor: 'text-amber-400',
    activeBg: 'bg-amber-500/15 border-amber-500/40 text-amber-200',
    description: 'Real-time mapping of capital flight, liquidity velocity, geopolitical friction, and structural anomalies.'
  },
  {
    id: 'agent-dev-kit',
    label: 'Agent Dev Kit & Engine Builder',
    group: 'core',
    category: 'command',
    icon: Cpu,
    accentColor: 'text-fuchsia-400',
    activeBg: 'bg-fuchsia-500/12 border-fuchsia-500/35 text-fuchsia-200',
    description: 'Autonomously control games, forge tools, synthesize infinite quests & build orchestrator features'
  },
  {
    id: 'world-start',
    label: 'World Load & Cinematic Start',
    group: 'core',
    category: 'command',
    icon: Play,
    accentColor: 'text-emerald-400',
    activeBg: 'bg-emerald-500/12 border-emerald-500/35 text-emerald-200',
    description: 'Cinematic world loading screen, direct engine launcher, and universal artifact file download'
  },
  {
    id: 'emulator-modder',
    label: 'Emulator & Game Modder Hub',
    group: 'creative',
    category: 'creative',
    icon: Gamepad2,
    accentColor: 'text-amber-400',
    activeBg: 'bg-amber-500/12 border-amber-500/35 text-amber-200',
    description: 'Universal ROM emulator with multiplayer & gamepad support, plus zero-downtime modder for OSRS, RuneScape, etc.'
  },
  {
    id: 'autonomy-supervisor',
    label: 'Autonomy Supervisor',
    group: 'core',
    category: 'command',
    icon: Activity,
    accentColor: 'text-cyan-400',
    activeBg: 'bg-cyan-500/12 border-cyan-500/35 text-cyan-200',
    description: 'Dream state cycles, recursive self-healing, continuous evolution & runtime autonomy diagnostics'
  },
  {
    id: 'batch-processor',
    label: 'Autonomous Batch Processor',
    shortLabel: 'Batch Queue',
    group: 'core',
    category: 'command',
    icon: Layers,
    accentColor: 'text-amber-400',
    activeBg: 'bg-amber-500/15 border-amber-500/40 text-amber-200',
    description: 'Queue multi-file code/document transformations & CSV/JSON/JS/AI data processing pipelines in the background'
  },
  {
    id: 'projects',
    label: 'Unified Projects',
    group: 'core',
    category: 'command',
    icon: FolderGit2,
    accentColor: 'text-cyan-400',
    activeBg: 'bg-cyan-500/12 border-cyan-500/35 text-cyan-200',
    description: 'Workspace files, multi-file code editor, and repository consolidation'
  },
  {
    id: 'file-manager',
    label: 'Sovereign Files (OS Explorer)',
    shortLabel: 'OS Files',
    group: 'system',
    category: 'data',
    icon: Folder,
    accentColor: 'text-amber-400',
    activeBg: 'bg-amber-500/12 border-amber-500/35 text-amber-200',
    description: 'Real host filesystem explorer, editor, upload/download, permissions & disk inspector'
  },
  {
    id: 'terminal',
    label: 'Root Terminal (UID 0 Shell)',
    shortLabel: 'Terminal',
    group: 'system',
    category: 'command',
    icon: Terminal,
    accentColor: 'text-emerald-400',
    activeBg: 'bg-emerald-500/12 border-emerald-500/35 text-emerald-200',
    description: 'Native stateful host OS bash/PowerShell command terminal with UID 0 & Ring -3 environment'
  },
  {
    id: 'task-manager',
    label: 'Process & Kernel Monitor',
    shortLabel: 'Activity Monitor',
    group: 'system',
    category: 'command',
    icon: Activity,
    accentColor: 'text-sky-400',
    activeBg: 'bg-sky-500/12 border-sky-500/35 text-sky-200',
    description: 'Live OS PIDs, CPU/RAM utilization, network ports, toolchains & signal controls'
  },
  {
    id: 'os-settings',
    label: 'OS Control Center & Multi-OS',
    shortLabel: 'OS Settings',
    group: 'system',
    category: 'command',
    icon: Settings,
    accentColor: 'text-zinc-300',
    activeBg: 'bg-zinc-700/30 border-zinc-500/40 text-zinc-100',
    description: 'Desktop window mode, wallpaper themes, Windows/macOS/Linux native app launchers & Ring -3 controls'
  },
  {
    id: 'tool-shed',
    label: 'Tool Shed',
    group: 'core',
    category: 'command',
    icon: Wrench,
    accentColor: 'text-emerald-400',
    activeBg: 'bg-emerald-500/12 border-emerald-500/35 text-emerald-200',
    description: 'Dynamic AI micro-tool generator, sandbox runner & OSINT utilities'
  },
  {
    id: 'functions',
    label: 'Function Deck',
    group: 'core',
    category: 'command',
    icon: Zap,
    accentColor: 'text-amber-400',
    activeBg: 'bg-amber-500/12 border-amber-500/35 text-amber-200',
    description: 'Zero-token utilities (hash, regex, JSON, UUID, transforms) & toolbelt'
  },
  {
    id: 'presets',
    label: 'Prompt Presets',
    group: 'core',
    category: 'command',
    icon: BookmarkPlus,
    accentColor: 'text-amber-400',
    activeBg: 'bg-amber-500/12 border-amber-500/35 text-amber-200',
    description: 'Curated architectural directives, code reviews & instruction templates'
  },
  {
    id: 'war-room',
    label: 'PC War Room',
    group: 'core',
    category: 'command',
    icon: ShieldAlert,
    accentColor: 'text-amber-400',
    activeBg: 'bg-amber-500/12 border-amber-500/35 text-amber-200',
    description: 'Multi-screen operational cockpit & swarm coordination overview'
  },
  {
    id: 'hitl',
    label: 'HITL Workflows',
    group: 'core',
    category: 'command',
    icon: UserCheck,
    accentColor: 'text-indigo-400',
    activeBg: 'bg-indigo-500/12 border-indigo-500/35 text-indigo-200',
    description: 'Human-in-the-loop validation gates & confirmation checkpoints'
  },
  {
    id: 'integrations',
    label: 'Integrations Hub',
    group: 'workspace',
    category: 'command',
    icon: Layers,
    accentColor: 'text-amber-400',
    activeBg: 'bg-amber-500/12 border-amber-500/35 text-amber-200',
    description: 'Unified control plane across Google Workspace, Vault, LLM gateways & carriers'
  },
  {
    id: 'tasks',
    label: 'Google Tasks',
    group: 'workspace',
    category: 'data',
    icon: ListTodo,
    accentColor: 'text-emerald-400',
    activeBg: 'bg-emerald-500/12 border-emerald-500/35 text-emerald-200',
    description: 'Google Tasks lists, due dates & confirmation-gated task synchronization'
  },
  {
    id: 'drive',
    label: 'Google Drive',
    group: 'workspace',
    category: 'data',
    icon: HardDrive,
    accentColor: 'text-amber-400',
    activeBg: 'bg-amber-500/12 border-amber-500/35 text-amber-200',
    description: 'Cloud file management, document browsing, editing & artifact export'
  },
  {
    id: 'github',
    label: 'GitHub Matrix',
    group: 'workspace',
    category: 'data',
    icon: FolderGit2,
    accentColor: 'text-orange-400',
    activeBg: 'bg-orange-500/12 border-orange-500/35 text-orange-200',
    description: 'Repository telemetry, commits, branches & provenance inspection'
  },
  {
    id: 'api-secrets',
    label: 'API Keys & Secrets',
    group: 'workspace',
    category: 'command',
    icon: Key,
    accentColor: 'text-emerald-400',
    activeBg: 'bg-emerald-500/12 border-emerald-500/35 text-emerald-200',
    description: 'AES-256-GCM encrypted server secrets handler, dynamic masking & proxy tests'
  },
  {
    id: 'admin-command',
    label: 'Sovereign Command',
    shortLabel: 'Admin Cmd',
    group: 'core',
    category: 'command',
    icon: AdminCommandIcon,
    accentColor: 'text-amber-400',
    activeBg: 'bg-amber-500/15 border-amber-400/45 text-amber-200',
    description: 'Administrative Sovereign Command Center — Permanent Executive Architect JHammerZ & System Governance',
    adminOnly: true
  },
  {
    id: 'lora-mesh',
    label: 'SoS Mesh',
    shortLabel: 'SoS Mesh',
    group: 'core',
    category: 'command',
    icon: SoSMeshIcon,
    accentColor: 'text-cyan-400',
    activeBg: 'bg-cyan-500/12 border-cyan-500/35 text-cyan-200',
    description: 'Discord-style LoRa Mesh social network, unlimited multi-party voice/camera calls & all 10 OS agents'
  },
  {
    id: 'browser',
    label: 'Open-Web Browser',
    group: 'intelligence',
    category: 'command',
    icon: Globe,
    accentColor: 'text-sky-400',
    activeBg: 'bg-sky-500/12 border-sky-500/35 text-sky-200',
    description: 'Open-web search, headless fetching & autonomous agent learning'
  },
  {
    id: 'knowledge-graph',
    label: 'Knowledge Graph',
    group: 'intelligence',
    category: 'intelligence',
    icon: Network,
    accentColor: 'text-amber-400',
    activeBg: 'bg-amber-500/12 border-amber-500/35 text-amber-200',
    description: 'Session memory consolidation & interactive architectural topology'
  },
  {
    id: 'search',
    label: 'Search Grounding',
    group: 'intelligence',
    category: 'intelligence',
    icon: Search,
    accentColor: 'text-sky-400',
    activeBg: 'bg-sky-500/12 border-sky-500/35 text-sky-200',
    description: 'Live web search grounding with verified source citations'
  },
  {
    id: 'maps',
    label: 'Maps Grounding',
    group: 'intelligence',
    category: 'intelligence',
    icon: MapPin,
    accentColor: 'text-emerald-400',
    activeBg: 'bg-emerald-500/12 border-emerald-500/35 text-emerald-200',
    description: 'Spatial & geospatial place intelligence grounding'
  },
  {
    id: 'osint',
    label: 'OSINT Surface',
    group: 'intelligence',
    category: 'command',
    icon: ShieldAlert,
    accentColor: 'text-rose-400',
    activeBg: 'bg-rose-500/12 border-rose-500/35 text-rose-200',
    description: 'External perimeter scanning, DNS/TLS defense & security posture'
  },
  {
    id: 'live',
    label: 'Live Voice',
    group: 'intelligence',
    category: 'intelligence',
    icon: Radio,
    accentColor: 'text-red-400',
    activeBg: 'bg-red-500/12 border-red-500/35 text-red-200',
    description: 'Bidirectional real-time voice streaming bridge'
  },
  {
    id: 'transcribe',
    label: 'Transcribe',
    group: 'intelligence',
    category: 'intelligence',
    icon: Mic,
    accentColor: 'text-teal-400',
    activeBg: 'bg-teal-500/12 border-teal-500/35 text-teal-200',
    description: 'Speech transcription and audio intake pipeline'
  },
  {
    id: 'image',
    label: 'Visual Studio',
    group: 'creative',
    category: 'creative',
    icon: ImageIcon,
    accentColor: 'text-purple-400',
    activeBg: 'bg-purple-500/12 border-purple-500/35 text-purple-200',
    description: 'Image generation with offline procedural Canvas synthesis fallback'
  },
  {
    id: 'music',
    label: 'Lyria Music',
    group: 'creative',
    category: 'creative',
    icon: Music,
    accentColor: 'text-fuchsia-400',
    activeBg: 'bg-fuchsia-500/12 border-fuchsia-500/35 text-fuchsia-200',
    description: 'Music & soundtrack composer with offline Web Audio synthesizer'
  },
  {
    id: 'video',
    label: 'Veo 3 Motion',
    group: 'creative',
    category: 'creative',
    icon: Video,
    accentColor: 'text-rose-400',
    activeBg: 'bg-rose-500/12 border-rose-500/35 text-rose-200',
    description: 'Video motion generator with procedural offline canvas render'
  },
  {
    id: 'spatial-arena',
    label: 'Spatial Arena 3D',
    group: 'creative',
    category: 'creative',
    icon: Box,
    accentColor: 'text-amber-400',
    activeBg: 'bg-amber-500/12 border-amber-500/35 text-amber-200',
    description: 'Aegis Skylane procedural 3D canyon game & interactive PBR scene studio'
  },
  {
    id: 'termux',
    label: 'Termux Android',
    group: 'system',
    category: 'command',
    icon: Smartphone,
    accentColor: 'text-emerald-400',
    activeBg: 'bg-emerald-500/12 border-emerald-500/35 text-emerald-200',
    description: 'Mobile installer script & local llama-server edge bridge'
  },
  {
    id: 'infinite-sim',
    label: 'Infinite-SIM',
    group: 'system',
    category: 'command',
    icon: Phone,
    accentColor: 'text-emerald-400',
    activeBg: 'bg-emerald-500/12 border-emerald-500/35 text-emerald-200',
    description: 'Virtual eSIM profiles, Luhn ICCIDs, LPA activation & burner numbers'
  },
  {
    id: 'burner-mail',
    label: 'Burner Mail',
    group: 'system',
    category: 'command',
    icon: Mail,
    accentColor: 'text-teal-400',
    activeBg: 'bg-teal-500/12 border-teal-500/35 text-teal-200',
    description: 'Disposable temporary email inboxes with instant OTP capture'
  },
  {
    id: 'scratchpad',
    label: 'Scratchpad',
    group: 'system',
    category: 'data',
    icon: FileText,
    accentColor: 'text-teal-400',
    activeBg: 'bg-teal-500/12 border-teal-500/35 text-teal-200',
    description: 'Working memory notes, semantic cache & architectural scratchpad'
  },
  {
    id: 'vault',
    label: 'Vault Storage',
    group: 'system',
    category: 'data',
    icon: Archive,
    accentColor: 'text-emerald-400',
    activeBg: 'bg-emerald-500/12 border-emerald-500/35 text-emerald-200',
    description: 'Persistent encrypted artifact storage & session history'
  },
  {
    id: 'audit',
    label: 'Forensic Ledger',
    group: 'system',
    category: 'data',
    icon: ShieldCheck,
    accentColor: 'text-emerald-400',
    activeBg: 'bg-emerald-500/12 border-emerald-500/35 text-emerald-200',
    description: 'Immutable execution audit trail & cryptographic proof records'
  },
  {
    id: 'swarm-test',
    label: 'Forensic Audit & Manual',
    shortLabel: 'Forensic Manual',
    group: 'system',
    category: 'command',
    icon: Activity,
    accentColor: 'text-amber-400',
    activeBg: 'bg-amber-500/12 border-amber-500/35 text-amber-200',
    description: 'Deep SHA-256 forensic audit, 46+ subfunction technical manual, and 1-click self-repair'
  },
  {
    id: 'crypto-wallet',
    label: 'Sovereign Crypto Wallets',
    shortLabel: 'Crypto Wallets',
    group: 'core',
    category: 'command',
    icon: Wallet,
    accentColor: 'text-emerald-400',
    activeBg: 'bg-emerald-500/12 border-emerald-500/35 text-emerald-200',
    description: 'Real secp256k1 & Ed25519 BTC/ETH/SOL wallets for personal investing & UID 0 autonomous trading'
  },
  {
    id: 'grant-hunter',
    label: 'Grant Hunter (0% Equity)',
    shortLabel: 'Grant Hunter',
    group: 'core',
    category: 'command',
    icon: Award,
    accentColor: 'text-emerald-300',
    activeBg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200',
    description: 'Autonomous non-reciprocal (0% equity, non-repayable) Grants.gov & foundation grant discovery + auto-application packet builder'
  },
  {
    id: 'transfer-hub',
    label: 'Downloads, Uploads & Module Lab',
    shortLabel: 'Downloads & Uploads',
    group: 'core',
    category: 'command',
    icon: ArrowUpDown,
    accentColor: 'text-sky-400',
    activeBg: 'bg-sky-500/15 border-sky-500/40 text-sky-200',
    description: 'Centralized cross-OS downloads catalog, universal uploader, and individual orchestrator module export, syntax check, and hot-swap replacement'
  },
  {
    id: 'packager',
    label: 'APK Packager',
    group: 'system',
    category: 'command',
    icon: Package,
    accentColor: 'text-amber-400',
    activeBg: 'bg-amber-500/12 border-amber-500/35 text-amber-200',
    description: 'Package modules into standalone Android APK builds'
  },
  {
    id: 'download-models',
    label: 'Model Wardrobe',
    group: 'system',
    category: 'data',
    icon: Download,
    accentColor: 'text-amber-400',
    activeBg: 'bg-amber-500/12 border-amber-500/35 text-amber-200',
    description: 'Manage local model manifests, WebGPU weights & offline packages'
  },
  {
    id: 'universal-installer',
    label: 'Universal App & Game Store',
    shortLabel: 'App Store',
    group: 'system',
    category: 'command',
    icon: Download,
    accentColor: 'text-amber-400',
    activeBg: 'bg-amber-500/12 border-amber-500/35 text-amber-200',
    description: 'Install games, Steam, Discord, native software, apt/brew/winget/npm/pip & direct URL binaries'
  }
];

export function getModuleMeta(id: ModuleType): ModuleRegistryItem {
  return ALL_MODULES.find(m => m.id === id) || ALL_MODULES[0];
}

interface NavigationProps {
  activeModule: ModuleType;
  onSelectModule: (module: ModuleType) => void;
  artifactCount?: number;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  hiddenOnDesktop?: boolean;
  hideMobileDock?: boolean;
  authUser?: AuthUserPublic | null;
}

type CategoryType = 'all' | 'command' | 'creative' | 'intelligence' | 'data';

export const Navigation: React.FC<NavigationProps> = ({
  activeModule,
  onSelectModule,
  artifactCount = 0,
  mobileOpen = false,
  onCloseMobile,
  hiddenOnDesktop = false,
  hideMobileDock = false,
  authUser = null
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('aurelius_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [railFilter, setRailFilter] = useState<string>('');
  const [showAllModulesModal, setShowAllModulesModal] = useState<boolean>(false);
  const [showTelemetryModal, setShowTelemetryModal] = useState<boolean>(false);
  const [moduleSearchQuery, setModuleSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all');
  const [tick, setTick] = useState<number>(0);

  useEffect(() => {
    try {
      localStorage.setItem('aurelius_sidebar_collapsed', String(sidebarCollapsed));
    } catch {}
  }, [sidebarCollapsed]);

  const [subAgents, setSubAgents] = useState<SubAgentStatus[]>([
    {
      id: 'vision',
      name: 'Vision Sub-Agent',
      icon: Eye,
      status: 'IDLE',
      currentTask: 'Spatial stream observer',
      loadPct: 12,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30'
    },
    {
      id: 'logic',
      name: 'Logic Sub-Agent',
      icon: Cpu,
      status: 'SYNCHRONIZED',
      currentTask: 'Swarm consensus nominal',
      loadPct: 48,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30'
    },
    {
      id: 'memory',
      name: 'Memory Sub-Agent',
      icon: Database,
      status: 'SYNCHRONIZED',
      currentTask: 'Immutable provenance sealed',
      loadPct: 24,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/30'
    },
    {
      id: 'audio',
      name: 'Audio Sub-Agent',
      icon: Radio,
      status: 'IDLE',
      currentTask: 'Acoustic pipeline armed',
      loadPct: 8,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/30'
    },
    {
      id: 'grounding',
      name: 'Grounding Sub-Agent',
      icon: Search,
      status: 'IDLE',
      currentTask: 'Open-web proxy ready',
      loadPct: 16,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30'
    },
    {
      id: 'kernel',
      name: 'Kernel Hypervisor',
      icon: Terminal,
      status: 'SYNCHRONIZED',
      currentTask: 'UID 0 · Ring -3 Bare-Metal',
      loadPct: 35,
      color: 'text-teal-400',
      bgColor: 'bg-teal-500/10',
      borderColor: 'border-teal-500/30'
    }
  ]);

  useEffect(() => {
    if (!showTelemetryModal) return;
    const timer = setInterval(() => setTick(t => t + 1), 4000);
    return () => clearInterval(timer);
  }, [showTelemetryModal]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAllModulesModal) setShowAllModulesModal(false);
        if (showTelemetryModal) setShowTelemetryModal(false);
        if (mobileOpen && onCloseMobile) onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAllModulesModal, showTelemetryModal, mobileOpen, onCloseMobile]);

  useEffect(() => {
    setSubAgents(prev =>
      prev.map(agent => {
        let task = agent.currentTask;
        let status: SubAgentStatus['status'] = 'SYNCHRONIZED';
        let load = 18 + ((tick * 3 + agent.id.length * 5) % 14);

        if (agent.id === 'vision') {
          if (activeModule === 'image' || activeModule === 'video') {
            status = 'PROCESSING';
            task = 'Veo / Imagen synthesis active';
            load = 88;
          } else if (activeModule === 'browser') {
            status = 'PROCESSING';
            task = 'DOM & visual inspection';
            load = 64;
          } else {
            status = 'STANDBY';
            task = 'Spatial stream standby';
            load = 22;
          }
        } else if (agent.id === 'logic') {
          if (activeModule === 'war-room' || activeModule === 'chat' || activeModule === 'hitl') {
            status = 'PROCESSING';
            task = 'Orchestration & tool reasoning';
            load = 92;
          } else {
            status = 'SYNCHRONIZED';
            task = 'Reasoning cascade nominal';
            load = 34;
          }
        } else if (agent.id === 'memory') {
          if (activeModule === 'vault' || activeModule === 'scratchpad' || activeModule === 'github' || activeModule === 'tasks') {
            status = 'PROCESSING';
            task = 'Axiom & Workspace sync';
            load = 82;
          } else {
            status = 'SYNCHRONIZED';
            task = 'SQLite + Firestore synced';
            load = 28;
          }
        } else if (agent.id === 'audio') {
          if (activeModule === 'music' || activeModule === 'transcribe' || activeModule === 'live') {
            status = 'PROCESSING';
            task = 'Lyria & PCM stream active';
            load = 76;
          } else {
            status = 'STANDBY';
            task = 'Audio pipeline standby';
            load = 18;
          }
        } else if (agent.id === 'grounding') {
          if (activeModule === 'search' || activeModule === 'maps' || activeModule === 'browser') {
            status = 'PROCESSING';
            task = 'Live web grounding';
            load = 74;
          } else {
            status = 'STANDBY';
            task = 'Web proxy standby';
            load = 20;
          }
        } else if (agent.id === 'kernel') {
          status = 'SYNCHRONIZED';
          task = 'UID 0 · Ring -3 Hypervisor';
          load = 32;
        }

        return { ...agent, status, currentTask: task, loadPct: load };
      })
    );
  }, [activeModule, tick]);

  const canSeeAdminModules = canAccessAdminCommandCenter(authUser);
  const visibleModules = useMemo(
    () => ALL_MODULES.filter((m) => !m.adminOnly || canSeeAdminModules),
    [canSeeAdminModules]
  );

  const filteredModalTabs = useMemo(() => {
    const q = moduleSearchQuery.toLowerCase().trim();
    return visibleModules.filter(tab => {
      const matchesCategory = selectedCategory === 'all' || tab.category === selectedCategory;
      const matchesSearch =
        !q ||
        tab.label.toLowerCase().includes(q) ||
        tab.description.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [visibleModules, moduleSearchQuery, selectedCategory]);

  const filteredSidebarModules = useMemo(() => {
    const q = railFilter.toLowerCase().trim();
    if (!q) return visibleModules;
    return visibleModules.filter(
      m => m.label.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)
    );
  }, [visibleModules, railFilter]);

  const handleSelect = (id: ModuleType) => {
    onSelectModule(id);
    if (onCloseMobile) onCloseMobile();
  };

  const renderSidebarContent = (isDrawer = false) => {
    const compact = !isDrawer && sidebarCollapsed;
    return (
      <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800/80 select-none">
        {/* Sidebar Header / Search & Collapse */}
        <div className={`p-2.5 border-b border-zinc-800/70 flex items-center ${compact ? 'justify-center' : 'justify-between gap-2'}`}>
          {!compact && (
            <div className="relative flex-1 min-w-0">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={railFilter}
                onChange={(e) => setRailFilter(e.target.value)}
                placeholder="Filter modules..."
                className="w-full bg-zinc-900/90 border border-zinc-800 rounded-lg pl-8 pr-7 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 transition-colors"
              />
              {railFilter && (
                <button
                  onClick={() => setRailFilter('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  title="Clear filter"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {isDrawer ? (
            <button
              onClick={onCloseMobile}
              className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors shrink-0"
              aria-label="Close navigation drawer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors shrink-0 cursor-pointer"
              title={sidebarCollapsed ? 'Expand Workspace Sidebar' : 'Collapse Workspace Sidebar'}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Grouped Module Tree */}
        <div className="flex-1 overflow-y-auto px-2 py-2.5 space-y-4">
          {WORKSPACE_GROUPS.map(group => {
            const groupItems = filteredSidebarModules.filter(m => m.group === group.id);
            if (groupItems.length === 0) return null;

            return (
              <div key={group.id} className="space-y-1">
                {!compact && (
                  <div className="px-2.5 pb-0.5 text-[11px] font-medium text-zinc-500 flex items-center justify-between">
                    <span>{group.label}</span>
                    <span className="font-mono text-[10px] text-zinc-600 tabular-nums">{groupItems.length}</span>
                  </div>
                )}
                <div className="space-y-0.5">
                  {groupItems.map(item => {
                    const Icon = item.icon;
                    const isActive = activeModule === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item.id)}
                        title={compact ? `${item.label} — ${item.description}` : item.description}
                        className={`w-full flex items-center ${compact ? 'justify-center px-0 py-2' : 'justify-between gap-2 px-2.5 py-2'} rounded-lg text-xs transition-colors cursor-pointer border ${
                          isActive
                            ? `${item.activeBg} font-semibold`
                            : 'border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80'
                        }`}
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? item.accentColor : 'text-zinc-500'}`} />
                          {!compact && <span className="truncate">{item.label}</span>}
                        </span>
                        {!compact && item.id === 'vault' && artifactCount > 0 && (
                          <span className="font-mono text-[10px] text-emerald-400 tabular-nums shrink-0">
                            {artifactCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filteredSidebarModules.length === 0 && !compact && (
            <div className="px-3 py-6 text-center text-xs text-zinc-500">
              No matching modules.
            </div>
          )}
        </div>

        {/* Bottom Workspace Utilities */}
        <div className="p-2 border-t border-zinc-800/70 space-y-1.5 bg-zinc-950">
          <button
            onClick={() => {
              if (isDrawer && onCloseMobile) onCloseMobile();
              setShowAllModulesModal(true);
            }}
            className={`w-full flex items-center ${compact ? 'justify-center px-0 py-2' : 'justify-between px-2.5 py-2'} rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-amber-300 transition-colors cursor-pointer`}
            title={`Browse all ${ALL_MODULES.length} Modules`}
          >
            <span className="flex items-center gap-2">
              <Grid className="w-4 h-4 text-amber-400 shrink-0" />
              {!compact && <span>All Modules</span>}
            </span>
            {!compact && (
              <span className="font-mono text-[11px] text-zinc-400 tabular-nums">{ALL_MODULES.length}</span>
            )}
          </button>

          <button
            onClick={() => {
              if (isDrawer && onCloseMobile) onCloseMobile();
              setShowTelemetryModal(true);
            }}
            className={`w-full flex items-center ${compact ? 'justify-center px-0 py-2' : 'justify-between px-2.5 py-2'} rounded-lg bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800/70 text-xs text-zinc-300 transition-colors cursor-pointer`}
            title="Inspect 6 Swarm Sub-Agents"
          >
            <span className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
              {!compact && <span>Swarm Agents</span>}
            </span>
            {!compact && (
              <span className="font-mono text-[11px] text-emerald-400 tabular-nums">6</span>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Persistent Collapsible Workspace Sidebar */}
      {!hiddenOnDesktop && (
        <aside
          className={`hidden lg:flex flex-col shrink-0 transition-[width] duration-150 ${
            sidebarCollapsed ? 'w-[64px]' : 'w-[244px]'
          }`}
        >
          {renderSidebarContent(false)}
        </aside>
      )}

      {/* Mobile & Tablet Slide-Over Navigation Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 w-[280px] max-w-[85vw] h-full shadow-2xl">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}

      {/* Mobile Compact Bottom Thumb Dock (<= 48px + safe-area, fits all Android & iOS phones) */}
      {!hideMobileDock && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 min-h-12 bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-800/80 px-1 pb-safe-nav flex items-center justify-around text-[10px] font-medium">
          <button
            onClick={() => handleSelect('chat')}
            className={`flex flex-col items-center justify-center min-h-[42px] flex-1 max-w-[84px] gap-0.5 px-1 rounded-lg transition-colors ${
              activeModule === 'chat' ? 'text-amber-400 font-semibold' : 'text-zinc-500 hover:text-zinc-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="whitespace-nowrap">Chat</span>
          </button>

          <button
            onClick={() => handleSelect('file-manager')}
            className={`flex flex-col items-center justify-center min-h-[42px] flex-1 max-w-[84px] gap-0.5 px-1 rounded-lg transition-colors ${
              activeModule === 'file-manager' ? 'text-amber-300 font-semibold' : 'text-zinc-500 hover:text-zinc-200'
            }`}
          >
            <Folder className="w-4 h-4" />
            <span className="whitespace-nowrap">Files</span>
          </button>

          <button
            onClick={() => handleSelect('terminal')}
            className={`flex flex-col items-center justify-center min-h-[42px] flex-1 max-w-[84px] gap-0.5 px-1 rounded-lg transition-colors ${
              activeModule === 'terminal' ? 'text-emerald-400 font-semibold' : 'text-zinc-500 hover:text-zinc-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span className="whitespace-nowrap">Shell</span>
          </button>

          <button
            onClick={() => handleSelect('browser')}
            className={`flex flex-col items-center justify-center min-h-[42px] flex-1 max-w-[84px] gap-0.5 px-1 rounded-lg transition-colors ${
              activeModule === 'browser' ? 'text-sky-400 font-semibold' : 'text-zinc-500 hover:text-zinc-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span className="whitespace-nowrap">Chrome</span>
          </button>

          <button
            onClick={() => setShowAllModulesModal(true)}
            className="flex flex-col items-center justify-center min-h-[42px] flex-1 max-w-[84px] gap-0.5 px-1 rounded-lg text-amber-300 font-semibold"
          >
            <Grid className="w-4 h-4 text-amber-400" />
            <span className="whitespace-nowrap tabular-nums">All ({ALL_MODULES.length})</span>
          </button>
        </nav>
      )}

      {/* Full Modules Directory Modal */}
      {showAllModulesModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAllModulesModal(false);
          }}
        >
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-6xl w-full max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden text-xs">
            <div className="p-3.5 sm:p-5 border-b border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-900/70 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center text-amber-400 shrink-0">
                    <Grid className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-zinc-100 text-sm truncate">
                      Operational Modules Directory
                    </h3>
                    <p className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5 truncate">
                      <span className="tabular-nums">{ALL_MODULES.length} Active Subsystems</span>
                      <span aria-hidden="true" className="hidden sm:inline">·</span>
                      <span className="hidden sm:inline">Switch workspace view instantly</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAllModulesModal(false)}
                  className="sm:hidden p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors cursor-pointer shrink-0"
                  aria-label="Close directory"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={moduleSearchQuery}
                    onChange={(e) => setModuleSearchQuery(e.target.value)}
                    placeholder="Search modules..."
                    autoFocus
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl pl-8 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowAllModulesModal(false)}
                  className="hidden sm:inline-flex p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer shrink-0"
                  aria-label="Close directory"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="px-4 sm:px-6 py-2.5 border-b border-zinc-800/70 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
              {(['all', 'command', 'creative', 'intelligence', 'data'] as CategoryType[]).map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 border ${
                    selectedCategory === cat
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                      : 'bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-800'
                  }`}
                >
                  {cat === 'all'
                    ? `All (${ALL_MODULES.length})`
                    : cat === 'command'
                    ? 'Command & Autonomy'
                    : cat === 'creative'
                    ? 'Creative Studio'
                    : cat === 'intelligence'
                    ? 'Intelligence & Web'
                    : 'Storage & Workspace'}
                </button>
              ))}
            </div>

            <div className="p-3.5 sm:p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 flex-1 min-h-0">
              {filteredModalTabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeModule === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      handleSelect(tab.id);
                      setShowAllModulesModal(false);
                    }}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-colors cursor-pointer ${
                      isActive
                        ? `${tab.activeBg}`
                        : 'bg-zinc-900/50 hover:bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-zinc-950 flex items-center justify-center border border-zinc-800 shrink-0">
                          <Icon className={`w-4 h-4 ${tab.accentColor}`} />
                        </div>
                        <span className="font-semibold text-zinc-100 text-xs truncate">{tab.label}</span>
                      </div>
                      {tab.id === 'vault' && artifactCount > 0 && (
                        <span className="font-mono text-[11px] text-emerald-400 tabular-nums shrink-0">
                          {artifactCount} items
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                      {tab.description}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500 border-t border-zinc-800/60 pt-2">
                      <span className="capitalize">{tab.category}</span>
                      <span className="text-amber-400 font-medium flex items-center gap-1">
                        Open <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="px-4 py-2.5 border-t border-zinc-800 bg-zinc-900/70 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-zinc-500 font-mono">
                Showing {filteredModalTabs.length} of {ALL_MODULES.length} modules
              </span>
              <button
                type="button"
                onClick={() => setShowAllModulesModal(false)}
                className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold text-xs transition-colors cursor-pointer"
              >
                Close Directory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Agent Telemetry Modal */}
      {showTelemetryModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowTelemetryModal(false);
          }}
        >
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-3xl w-full max-h-[85dvh] flex flex-col shadow-2xl overflow-hidden text-xs">
            <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <Activity className="w-4 h-4 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">Sub-Agent Telemetry Matrix</h3>
                  <p className="text-xs text-zinc-400">6 concurrent subsystem coordinators</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTelemetryModal(false)}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                aria-label="Close telemetry"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {subAgents.map(agent => {
                const Icon = agent.icon;
                return (
                  <div key={agent.id} className={`p-3.5 rounded-xl border ${agent.bgColor} ${agent.borderColor} space-y-2`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${agent.color}`} />
                        <span className="font-semibold text-zinc-100 truncate">{agent.name}</span>
                      </div>
                      <span className="font-mono text-[10px] text-zinc-300 shrink-0">{agent.status}</span>
                    </div>

                    <div className="text-[11px] text-zinc-300">
                      {agent.currentTask}
                    </div>

                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[11px] text-zinc-400 font-mono tabular-nums">
                        <span>Workload</span>
                        <span>{agent.loadPct}%</span>
                      </div>
                      <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${agent.loadPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-zinc-800 flex justify-end bg-zinc-900/60">
              <button
                onClick={() => setShowTelemetryModal(false)}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
