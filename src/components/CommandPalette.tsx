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

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  Command, 
  Globe, 
  ShieldAlert, 
  MessageSquare, 
  Music, 
  Video, 
  Image as ImageIcon, 
  MapPin, 
  Mic, 
  Radio, 
  Archive, 
  FolderGit2, 
  Cpu, 
  ExternalLink, 
  Sparkles, 
  ArrowRight, 
  Check, 
  Copy, 
  Play, 
  Download, 
  Shield, 
  Flame, 
  Zap, 
  Terminal, 
  X,
  Code,
  FileText,
  UserCheck,
  Smartphone,
  Mail,
  BookOpen,
  HardDrive,
  Network,
  Wrench,
  Activity,
  Phone,
  ListTodo,
  Key,
  Package,
  ShieldCheck,
  BookmarkPlus,
  Award,
  Layers,
  Folder,
  Settings,
  ArrowUpDown
} from 'lucide-react';
import type { ModuleType, Artifact } from '../types';
import { SoSMeshIcon } from './SoSMeshIcon';
import { AdminCommandIcon } from './AdminCommandIcon';
import { canAccessAdminCommandCenter, type AuthUserPublic } from '../types/auth';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectModule: (module: ModuleType) => void;
  artifacts: Artifact[];
  onNavigateUrlInBrowser: (url: string) => void;
  onTriggerEngineeringEngine?: () => void;
  userId?: string;
  authUser?: AuthUserPublic | null;
}

interface CommandItem {
  id: string;
  category: 'Modules' | 'Vault Artifacts' | 'GitHub Repositories' | 'Browser & Media' | 'Sovereign Actions';
  title: string;
  description: string;
  icon: any;
  color?: string;
  badge?: string;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectModule,
  artifacts,
  onNavigateUrlInBrowser,
  onTriggerEngineeringEngine,
  userId,
  authUser = null
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // GitHub Repositories for instant navigation
  const githubRepos = useMemo(() => [
    { name: 'jhammerz.github.io', desc: 'Sovereign Personal Hub & Web Root', url: 'https://jhammerz.github.io', stars: 24 },
    { name: 'Sovereign-JHam-Core', desc: 'Core-Level Zero-Volatility Consensus Substrate', url: 'https://github.com/JHammerZ/Sovereign-JHam-Core', stars: 142 },
    { name: 'JHAMMERZ_OS', desc: 'Bare-Metal AI Orchestration Kernel', url: 'https://github.com/JHammerZ/JHAMMERZ_OS', stars: 89 },
    { name: 'Aurelius-Matrix-Orchestrator', desc: 'Autonomous Agent Edge Swarm Engine', url: 'https://github.com/JHammerZ', stars: 67 },
    { name: 'System--Verified', desc: 'Cryptographic Provenance Record & Spec', url: 'https://doi.org/Local-System-Integrity-Proof', stars: 310 },
    { name: 'GuitarAOKE-Factory', desc: 'Acoustic Signal Processing & Wave Synthesis', url: 'https://github.com/JHammerZ', stars: 53 }
  ], []);

  // Construct comprehensive command items pool
  const allCommands: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [];

    // 1. App Modules (12 Total)
    const modulesConfig: Array<{ id: ModuleType; title: string; desc: string; icon: any; color: string; badge: string }> = [
      ...(canAccessAdminCommandCenter(authUser)
        ? [
            {
              id: 'admin-command' as ModuleType,
              title: 'Administrative Sovereign Command Center',
              desc: 'Executive Architect JHammerZ lock-in, users, sessions, Entity Intelligence charter & lockdown',
              icon: AdminCommandIcon,
              color: 'text-amber-400',
              badge: 'Admin Only'
            }
          ]
        : []),
      { id: 'lora-mesh', title: 'SoS Mesh (LoRa Social & Voice/Video)', desc: 'Discord-style LoRa Mesh chat, social feed for all 10 OS agents & unlimited voice/camera calls', icon: SoSMeshIcon, color: 'text-cyan-400', badge: 'SoS Mesh' },
      { id: 'war-room', title: 'PC War Room Cockpit', desc: 'Lysander 4.0 Cockpit, Alpha-14 swarm & sovereign nodes', icon: ShieldAlert, color: 'text-amber-400', badge: 'Core-Level' },
      { id: 'browser', title: 'Sovereign Web Browser v126', desc: 'Bare-metal anonymous browser, media player & 0-token crawler', icon: Globe, color: 'text-sky-400', badge: 'Tor-Mesh' },
      { id: 'termux', title: 'Android Termux Edge Module', desc: 'Node-09 CBP Edge coordinator, native haptics, TTS, battery & wake-lock', icon: Smartphone, color: 'text-emerald-400', badge: 'Android' },
      { id: 'chat', title: 'Sovereign Core Chat', desc: 'Continuous turn memory, Gemini 3.1 Pro & autonomous engine', icon: MessageSquare, color: 'text-amber-300', badge: 'Permanent' },
      { id: 'music', title: 'Lyria 3 Music Studio', desc: 'Acoustic waveform synthesis, arrangement & WAV export', icon: Music, color: 'text-fuchsia-400', badge: 'Audio' },
      { id: 'video', title: 'Veo 3.1 Motion Studio', desc: 'Cinematic video synthesis & HD camera motion controls', icon: Video, color: 'text-rose-400', badge: 'Video' },
      { id: 'image', title: 'Nano Banana 2.1 Visual Studio', desc: 'Vector blueprints, 4K diffusion & image transformation', icon: ImageIcon, color: 'text-purple-400', badge: 'Visual' },
      { id: 'search', title: 'Search Grounding Engine', desc: 'Real-time Google search verification & citations', icon: Search, color: 'text-sky-400', badge: 'Live Facts' },
      { id: 'maps', title: 'Maps Spatial Grounding', desc: 'Global geodata, coordinates triangulation & spatial vectors', icon: MapPin, color: 'text-emerald-400', badge: 'Spatial' },
      { id: 'transcribe', title: 'Acoustic Transcribe Engine', desc: 'Speech-to-text decoding with zero floor noise filtering', icon: Mic, color: 'text-teal-400', badge: 'Decoders' },
      { id: 'live', title: 'Gemini 3.8 Live Voice', desc: 'Low-latency bidirectional WebSocket voice conversation', icon: Radio, color: 'text-red-400', badge: 'WebSockets' },
      { id: 'vault', title: 'Firestore Sovereign Vault', desc: 'Real-time artifacts, media records, dossiers & provenance', icon: Archive, color: 'text-zinc-300', badge: `${artifacts.length} Items` },
      { id: 'scratchpad', title: 'Infinite Memory Scratchpad', desc: 'Permanent working memory & semantic vector cache with zero tokens burned', icon: FileText, color: 'text-teal-400', badge: 'Infinite' },
      { id: 'hitl', title: 'Human-In-The-Loop Workflows', desc: 'Live governance from JHammerZ.github.io governed by UID 0 & HFID', icon: UserCheck, color: 'text-amber-400', badge: 'Gatekeeper' },
      { id: 'github', title: 'GitHub Sovereign Ingestion', desc: 'Repositories status, endpoints latency monitor & commits', icon: FolderGit2, color: 'text-amber-400', badge: 'Active' },
      { id: 'osint', title: 'OSINT & Attack Surface Deck', desc: 'Passive external perimeter reconnaissance, DNS/mail defense, TLS SANs & RFC 9116 audit', icon: Search, color: 'text-cyan-400', badge: 'OWASP' },
      { id: 'burner-mail', title: 'Sovereign Burner Email Matrix', desc: 'Unlimited real disposable inboxes, instant OTP extraction, and automated link verification', icon: Mail, color: 'text-amber-400', badge: 'Burner' },
      { id: 'infinite-sim', title: 'Infinite SIM & Burner Numbers', desc: 'Unlimited virtual eSIM profiles, Luhn ICCIDs, LPA QR provisioning & infinite burner phone numbers with SMS/OTP routing', icon: Phone, color: 'text-emerald-400', badge: 'Infinite SIM' },
      { id: 'projects', title: 'Unified Projects Orchestrator', desc: 'Consolidate and merge all 8 sovereign repositories under Joshua Hamilton with Immutable seals', icon: FolderGit2, color: 'text-amber-400', badge: '17.8k Commits' },
      { id: 'functions', title: 'Function Deck & Toolbelt', desc: '12+ instant browser utilities (Base64, JSON, Regex, Hash, Passwords, UUIDs)', icon: Zap, color: 'text-rose-400', badge: '12 Tools' },
      { id: 'drive', title: 'Google Drive Storage', desc: 'Browse, view, create, and manage files in Google Drive with OAuth 2.0', icon: HardDrive, color: 'text-amber-400', badge: 'Drive' },
      { id: 'integrations', title: 'Sovereign Integration Control Plane', desc: 'Unified live probe & bridge across all 15+ add-ons, OAuth Workspace & LLM gateways', icon: Layers, color: 'text-amber-400', badge: 'All Add-Ons' },
      { id: 'tasks', title: 'Google Tasks Sync', desc: 'Create, organize, complete, and manage Google Tasks & lists with confirmation gates', icon: ListTodo, color: 'text-emerald-400', badge: 'Tasks' },
      { id: 'api-secrets', title: 'Internal Secrets Vault & Gateway', desc: 'AES-256-GCM encrypted server secrets handler, dynamic masking & proxy workbench', icon: Key, color: 'text-emerald-400', badge: 'AES-256-GCM' },
      { id: 'presets', title: 'Prompt Presets', desc: 'Curated architectural directives, code reviews & creative templates', icon: BookmarkPlus, color: 'text-amber-400', badge: 'Templates' },
      { id: 'audit', title: 'Forensic Audit Ledger', desc: 'Immutable execution audit trail & cryptographic proof hashes', icon: ShieldCheck, color: 'text-emerald-400', badge: 'WORM' },
      { id: 'swarm-test', title: 'Forensic Audit, Diagnostics & All-Detail Manual', desc: 'Deep SHA-256 file forensics, 46+ subfunction technical manual, expansion blueprints & 1-click self-repair', icon: Activity, color: 'text-amber-400', badge: 'Forensic' },
      { id: 'crypto-wallet', title: 'Sovereign Dual-Vault Crypto Wallets', desc: 'Real secp256k1 & Ed25519 BTC/ETH/SOL wallets for Personal Investing & UID 0 Autonomous 5-Min Execution', icon: Key, color: 'text-emerald-400', badge: 'BTC·ETH·SOL' },
      { id: 'grant-hunter', title: 'Autonomous Non-Reciprocal Grant Hunter (0% Equity)', desc: 'Live Grants.gov API + foundation grants + submission-ready applications with real mainnet payout addresses', icon: Award, color: 'text-emerald-300', badge: '0% Equity' },
      { id: 'transfer-hub', title: 'Downloads, Uploads & Module Lab', desc: 'All OS downloads in one catalog, universal file uploader, and individual module export & hot-swap replacement with rollback', icon: ArrowUpDown, color: 'text-sky-400', badge: 'Transfer Hub' },
      { id: 'macro-telemetry', title: 'Macro-Telemetry Laplace-14 (h=2s) 99% Engine', desc: '20 global equities & crypto overlapped canvas, 99% conformal band & 5-minute early-warning alerts', icon: Activity, color: 'text-rose-400', badge: '99% Cert' },
      { id: 'packager', title: 'Android APK Packager', desc: 'Package orchestrator modules into Capacitor Android builds', icon: Package, color: 'text-amber-400', badge: 'APK' },
      { id: 'download-models', title: 'Model Wardrobe', desc: 'Offline model downloads & quantized engine management', icon: Download, color: 'text-amber-400', badge: 'GGUF' },
      { id: 'universal-installer', title: 'Universal Software Center & Game Launcher', desc: 'Install games, Steam, Discord, OBS, VLC, apt/brew/winget/npm/pip & direct URL binaries', icon: Download, color: 'text-amber-400', badge: 'Store' },
      { id: 'knowledge-graph', title: 'Autonomous Memory Knowledge Graph', desc: 'Living interactive knowledge topology & session consolidation', icon: Network, color: 'text-amber-400', badge: 'Graph' },
      { id: 'tool-shed', title: 'Dynamic Micro-Tool Shed', desc: 'On-the-fly AI tool generator & client JS sandbox runner', icon: Wrench, color: 'text-emerald-400', badge: 'Sandbox' },
      { id: 'autonomy-supervisor', title: 'Expanded Runtime Autonomy Supervisor', desc: 'Proactive background scratchpad & substrate diagnostics', icon: Activity, color: 'text-cyan-400', badge: 'Autonomy' },
      { id: 'file-manager', title: 'Sovereign Files (OS Explorer)', desc: 'Real filesystem browser, file editor, SHA-256 verification & downloads', icon: Folder, color: 'text-amber-400', badge: 'Real FS' },
      { id: 'terminal', title: 'Root Terminal (UID 0 Shell)', desc: 'Interactive native host command shell with cwd & Ring -3 environment', icon: Terminal, color: 'text-emerald-400', badge: 'UID 0' },
      { id: 'task-manager', title: 'Process & Kernel Monitor', desc: 'Real host processes, PID signals, listening sockets & CPU/RAM metrics', icon: Activity, color: 'text-sky-400', badge: 'Ring -3' },
      { id: 'os-settings', title: 'OS Control Center & Multi-OS', desc: 'Windows, macOS & Linux standalone launchers, desktop mode & hypervisor settings', icon: Settings, color: 'text-zinc-200', badge: 'Cross-OS' },
    ];

    for (const m of modulesConfig) {
      list.push({
        id: `mod-${m.id}`,
        category: 'Modules',
        title: m.title,
        description: m.desc,
        icon: m.icon,
        color: m.color,
        badge: m.badge,
        action: () => {
          onSelectModule(m.id);
          onClose();
        }
      });
    }

    // 2. Sovereign Actions & Autonomous Self-Continuity Engine
    list.push({
      id: 'act-open-system-manual',
      category: 'Sovereign Actions',
      title: 'Open System Manual & README (Step-by-Step Guide)',
      description: 'Complete user guide explaining every function, how to use it, and beginner-proof instructions',
      icon: BookOpen,
      color: 'text-amber-300 font-bold',
      badge: 'Manual',
      action: () => {
        onClose();
        window.dispatchEvent(new CustomEvent('open-system-manual'));
      }
    });

    list.push({
      id: 'act-super-agent-teraflop',
      category: 'Sovereign Actions',
      title: 'Engage Strategic Coordinator Matrix',
      description: 'Structured orchestrator routing, workspace schema execution, and live Gemini cascade synthesis',
      icon: Zap,
      color: 'text-amber-400 font-bold',
      badge: 'Core Agent',
      action: () => {
        onSelectModule('chat');
        onClose();
      }
    });

    list.push({
      id: 'act-heo-orchestrate',
      category: 'Sovereign Actions',
      title: 'Execute HEO Schema (High Efficiency Orchestration v4.2)',
      description: 'Zero-overhead task dispatch and state transition validation across edge nodes',
      icon: Terminal,
      color: 'text-amber-300 font-semibold',
      badge: 'Modular Architecture',
      action: () => {
        fetch('/api/super-agent/schema-execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ protocol: 'HEO', action: 'PALETTE_ORCHESTRATE' })
        }).catch(() => {});
        onSelectModule('chat');
        onClose();
      }
    });

    list.push({
      id: 'act-hfid-attest',
      category: 'Sovereign Actions',
      title: 'Execute HFID Schema (Zero-Volatility Consensus 100/100)',
      description: 'UID 0 root provenance, Immutable hash ledger and System Proof attestation',
      icon: ShieldAlert,
      color: 'text-emerald-400 font-semibold',
      badge: 'HFID Attest',
      action: () => {
        fetch('/api/super-agent/schema-execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ protocol: 'HFID', action: 'PALETTE_PROVENANCE' })
        }).catch(() => {});
        onSelectModule('chat');
        onClose();
      }
    });

    list.push({
      id: 'act-eng-continuity',
      category: 'Sovereign Actions',
      title: 'Engage Autonomous Sovereign Engineering Core',
      description: 'Zero-token self-continuity engine: performs static audits, code generation & tasks without blocking',
      icon: Cpu,
      color: 'text-amber-400 font-bold',
      badge: '0-Tokens Unlimited',
      action: () => {
        if (onTriggerEngineeringEngine) onTriggerEngineeringEngine();
        onSelectModule('war-room');
        onClose();
      }
    });

    list.push({
      id: 'act-new-ghost-tab',
      category: 'Browser & Media',
      title: 'Launch Ghost / Stealth Browser Tab',
      description: 'Zero cookie footprint, randomized canvas fingerprint & Tor-style proxy routing',
      icon: Shield,
      color: 'text-emerald-400',
      badge: 'Anonymous',
      action: () => {
        onSelectModule('browser');
        onNavigateUrlInBrowser('sovereign://newtab');
        onClose();
      }
    });

    list.push({
      id: 'act-lofi-stream',
      category: 'Browser & Media',
      title: 'Play 24/7 Lofi Stream in Sovereign Player',
      description: 'Continuous background HD audio & video playback pipeline',
      icon: Play,
      color: 'text-red-400',
      badge: 'Ultra Video',
      action: () => {
        onSelectModule('browser');
        onNavigateUrlInBrowser('https://www.youtube.com/watch?v=jfKfPfyJRdk');
        onClose();
      }
    });

    list.push({
      id: 'act-synth-radio',
      category: 'Browser & Media',
      title: 'Stream DEFCON Cyber Radio',
      description: 'High-fidelity 24/7 stream (Music for Hackers) directly through audio engine',
      icon: Music,
      color: 'text-fuchsia-400',
      badge: 'Stereo Stream',
      action: () => {
        onSelectModule('browser');
        onNavigateUrlInBrowser('https://ice1.somafm.com/defcon-128-mp3');
        onClose();
      }
    });

    // 3. Vault Artifacts (User's real stored items)
    for (const art of artifacts) {
      list.push({
        id: `art-${art.id}`,
        category: 'Vault Artifacts',
        title: art.title || 'Untitled Artifact',
        description: `${art.type.toUpperCase()} • ${art.model || 'Aurelius'} • ${art.prompt.slice(0, 80)}`,
        icon: art.type === 'music' ? Music : art.type === 'video' ? Video : art.type === 'image' ? ImageIcon : FileTextIcon,
        color: 'text-amber-300',
        badge: art.type.toUpperCase(),
        action: () => {
          onSelectModule('vault');
          onClose();
        }
      });
    }

    // 4. GitHub Repositories
    for (const repo of githubRepos) {
      list.push({
        id: `repo-${repo.name}`,
        category: 'GitHub Repositories',
        title: repo.name,
        description: `${repo.desc} (${repo.stars} ⭐)`,
        icon: FolderGit2,
        color: 'text-sky-300',
        badge: 'GitHub',
        action: () => {
          onSelectModule('browser');
          onNavigateUrlInBrowser(repo.url);
          onClose();
        }
      });
    }

    return list;
  }, [artifacts, githubRepos, onSelectModule, onClose, onNavigateUrlInBrowser, onTriggerEngineeringEngine]);

  // Filter commands by query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return allCommands;
    const q = query.toLowerCase().trim();
    return allCommands.filter(c => 
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      (c.badge && c.badge.toLowerCase().includes(q))
    );
  }, [allCommands, query]);

  // Reset selectedIndex when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation inside palette
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  // Group filtered results by Category
  const groupedCategories = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    for (const item of filteredCommands) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return groups;
  }, [filteredCommands]);

  if (!isOpen) return null;

  let flatCounter = -1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 sm:pt-16 pb-4 px-3 sm:px-4 bg-zinc-950/80 backdrop-blur-md transition-all animate-fadeIn">
      {/* Backdrop click to dismiss */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Main Command Modal Card */}
      <div 
        className="relative w-full max-w-2xl bg-zinc-900/95 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85dvh] z-10 text-zinc-100 ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-2 px-3.5 sm:px-4 py-3 border-b border-zinc-800 bg-zinc-950/70 shrink-0">
          <Search className="w-5 h-5 text-amber-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search modules, artifacts, repos, or commands..."
            className="flex-1 min-w-0 bg-transparent border-none text-sm sm:text-base text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="px-2 py-1 rounded-md hover:bg-zinc-800 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 shrink-0 cursor-pointer"
              title="Clear search"
            >
              Clear
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800/80 text-[10px] font-mono text-zinc-400 border border-zinc-700 shrink-0">
            ESC
          </kbd>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors shrink-0 cursor-pointer"
            aria-label="Close command palette"
            title="Close Command Palette"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div 
          ref={listRef}
          className="flex-1 min-h-0 overflow-y-auto p-2 space-y-4 scrollbar-thin scrollbar-thumb-zinc-700"
        >
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center px-4">
              <Command className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-zinc-300">No matching commands, artifacts, or repositories found.</p>
              <p className="text-xs text-zinc-500 mt-1">Try searching for "browser", "war room", "youtube", "zenodo", or "image".</p>
            </div>
          ) : (
            Object.entries(groupedCategories || {}).map(([categoryName, items]) => (
              <div key={categoryName} className="space-y-1">
                <div className="px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-semibold flex items-center justify-between">
                  <span>{categoryName}</span>
                  <span className="text-[10px] bg-zinc-800/60 px-1.5 py-0.5 rounded text-zinc-400">{items.length}</span>
                </div>

                <div className="space-y-1">
                  {items.map((item) => {
                    flatCounter++;
                    const currentFlatIndex = flatCounter;
                    const isSelected = currentFlatIndex === selectedIndex;
                    const IconComponent = item.icon || Sparkles;

                    return (
                      <div
                        key={item.id}
                        onClick={item.action}
                        onMouseEnter={() => setSelectedIndex(currentFlatIndex)}
                        className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-amber-500/15 border border-amber-500/30 text-white shadow-sm' 
                            : 'hover:bg-zinc-800/70 border border-transparent text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <div className={`p-2 rounded-lg bg-zinc-800/90 ${item.color || 'text-zinc-300'} shrink-0 group-hover:scale-105 transition-transform`}>
                            <IconComponent className="w-4 h-4" />
                          </div>

                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-semibold truncate flex items-center gap-2">
                              <span className="truncate">{item.title}</span>
                              {item.badge && (
                                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-medium shrink-0 ${
                                  isSelected 
                                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' 
                                    : 'bg-zinc-800 text-zinc-400'
                                }`}>
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                              {item.description}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          {isSelected && (
                            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-amber-400 font-mono font-medium">
                              <span>Select</span>
                              <ArrowRight className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Command Palette Footer */}
        <div className="px-3.5 sm:px-4 py-2 bg-zinc-950/80 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-zinc-500 shrink-0">
          <div className="hidden sm:flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">↵</kbd> Execute
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">ESC</kbd> Close
            </span>
          </div>

          <div className="flex items-center gap-1 text-amber-400/80">
            <Sparkles className="w-3 h-3" />
            <span>AURELIUS UNIFIED INDEX</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="sm:hidden px-3 py-1 rounded-lg bg-zinc-800 text-zinc-200 font-sans font-semibold text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Fallback icon helper
function FileTextIcon(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}
