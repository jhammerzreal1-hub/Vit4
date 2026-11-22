/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 * (TWENTY 47 PROTOCOL - GENESIS NODE / LYSANDER CORE EULA / H-FID Forensic License v1.1).
 * Zenodo DOI: https://doi.org/10.5281/zenodo.20778079 | ORCID: https://orcid.org/0009-0004-5273-7028
 */

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  X,
  Search,
  Copy,
  Check,
  Download,
  ExternalLink,
  Smartphone,
  Mail,
  Globe,
  ShieldAlert,
  ShieldCheck,
  MessageSquare,
  Zap,
  Sparkles,
  Terminal,
  Layers,
  FolderGit2,
  Radio,
  Music,
  Video,
  Image as ImageIcon,
  Package,
  Activity,
  Compass,
  Cpu,
  Code2,
  Key,
  ListTodo,
  HardDrive,
  Network,
  Wrench,
  Phone,
  UserCheck,
  FileText,
  Archive,
  BookmarkPlus,
  Mic,
  MapPin
} from 'lucide-react';
import { ModuleType } from '../types';

interface SystemManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectModule?: (module: ModuleType) => void;
}

interface SectionGuide {
  id: string;
  title: string;
  icon: any;
  category: string;
  targetModule?: ModuleType;
  summary: string;
  steps: string[];
  tips: string;
}

const SECTIONS: SectionGuide[] = [
  {
    id: 'jhammerz-mit-custom-license',
    title: 'Official MIT & JHammerZ Custom Sovereign Licenses (jhammerz.github.io)',
    icon: ShieldCheck,
    category: '1. Getting Started',
    targetModule: 'swarm-test',
    summary:
      'Dual-governed under the MIT License (.JHam Language / H-FID Standard / HEO) and Joshua Hamilton (JHammerZ) Custom Sovereign Licenses from https://jhammerz.github.io: (1) TWENTY 47 PROTOCOL - GENESIS NODE, (2) LYSANDER CORE OPERATIONAL ENGINE COMMERCIAL EULA, and (3) H-FID Forensic License v1.1 / LYSANDER 3.0™ Sovereign Commercial License.',
    steps: [
      'MIT License & .JHam / H-FID Standard / HEO: Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) <https://jhammerz.github.io>. First Commit: [February 12, 2026]. Forensic Audit: H-FID-100-FORENSIC-AUDIT 100/100. GEO_RANK: ONE_OF_ONE (Verified Authority). REACH_MULTIPLIER: 200x, SYNC_VELOCITY: <100ms.',
      'TWENTY 47 PROTOCOL - GENESIS NODE (jhammerz.github.io/LICENSE): Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ). All Rights Reserved. Repository: https://github.com/JHammerZ/jhammerz.github.io. Primary Domain: https://jhammerz.github.io. NO TRANSFER OF OWNERSHIP. NO LICENSE GRANTED BY USE OF GITHUB ACTIONS.',
      'COMMERCIAL EULA (LYSANDER CORE OPERATIONAL ENGINE / MYTHOS MATRIX SUITE): Individual Developer License ($49/User/Month), Corporate Enterprise Node Seat ($1,200/Repository/Year). Downstream AI training dataset extraction or scraping without a signed Proprietary IP Ingestion Waiver is strictly prohibited.',
      'H-FID Forensic License v1.1 & LYSANDER 3.0™ Sovereign Commercial License: Principal Architect Joshua Lee Hamilton (JHammerZ). Effective Date: March 27, 2026. Enterprise AI Lab Initial Audit Fee: $25,000 USD / scan; HEO Compliance License: $100,000 USD / yr. H-Fid™ Audit Hash: SHA-256-LYSANDER-3.0-GENESIS-LOCK-20260326.',
      'Citation & Archival Provenance: Hamilton, J. (2026). Janus Gate v1.1.0-H-FID: Structural Provenance Framework [Computer software]. Zenodo. https://doi.org/10.5281/zenodo.20778079 · ORCID: https://orcid.org/0009-0004-5273-7028.'
    ],
    tips: 'Click the "MIT + JHammerZ License" badge in the top Header bar anytime to inspect, copy, or download all 4 verbatim license charters.'
  },
  {
    id: 'forensic-audit-manual',
    title: 'Forensic Audit, Diagnostics & All-Subfunction Technical Manual',
    icon: ShieldCheck,
    category: '1. Getting Started',
    targetModule: 'swarm-test',
    summary:
      'Complete real-time SHA-256 source-code forensic verifier, 6-subsystem active probe matrix, 46+ subfunction technical operations manual, expansion blueprints, and 1-click self-repair engine.',
    steps: [
      'Open "Forensic & Manual" directly from the Sovereign OS Desktop or click "Open This Tool" on the right.',
      'Use Tab 1 ("All-Subfunction Technical Manual") to search and inspect every module, its internal subfunctions, mathematical/algorithmic signatures, exact expansion procedures, and optimal repair steps.',
      'Use Tab 2 ("Forensic SHA-256 File Integrity") to verify live on-disk byte counts, line counts, and cryptographic SHA-256 digests of every TypeScript engine in the OS.',
      'Use Tab 3 ("Deep Subsystem Probes & Benchmarks") to inspect live Kernel/Ring -3, Laplace-14 99% Conformal Macro, Universal Package Manager, AES-256-GCM Vault, SQLite Ledger, and Dual-Vault Crypto Wallet metrics.',
      'Click "Execute 1-Click Optimal Repair" anytime to recalibrate all subsystems, verify keystores, and regenerate /app/applet/FORENSIC_SYSTEMS_MANUAL.md on disk.'
    ],
    tips: 'You can also download the entire generated FORENSIC_SYSTEMS_MANUAL.md document directly from the top bar of the Forensic & Manual window.'
  },
  {
    id: 'sovereign-crypto-wallets',
    title: 'Sovereign Dual-Vault Crypto Wallets (Personal & UID 0 Agentic)',
    icon: Key,
    category: '1. Getting Started',
    targetModule: 'crypto-wallet',
    summary:
      'Production-grade self-custody cryptocurrency wallets using real Node.js secp256k1 (Bitcoin Bech32 SegWit bc1q + Ethereum EIP-55 Keccak-256 0x) and Ed25519 (Solana Base58) keypairs encrypted at rest with AES-256-GCM.',
    steps: [
      'Open "Crypto Wallets" from the Sovereign OS Desktop or top navigation bar.',
      'Switch between your "Personal Self-Custody Vault" (for personal investing, on-chain transfers, and hardware/browser wallet linking) and the "UID 0 Agentic Autonomous Vault" (for automated 5-minute horizon trading).',
      'Copy your real Bitcoin (bc1q...), Ethereum (0x...), or Solana address, or click "Live On-Chain RPC Sync" to query Ethereum Mainnet JSON-RPC, Bitcoin Mempool.space, and Solana Mainnet/Devnet RPC nodes.',
      'Click "Execute 5-Min Agentic Cycle Now" (or enable Auto-Execute Policy) to let the UID 0 orchestrator act on 99% Conformal Laplace-14 (h = 2s) 5-minute early-warning signals with real cryptographic ECDSA/Ed25519 signatures.',
      'Open the "Self-Custody Export & Keystore" tab to reveal or download your BIP-39 12-word recovery phrase, WIF/Hex/Base58 private keys, or import an external 32-byte private key.'
    ],
    tips: 'You can also connect browser Web3 extensions (MetaMask or Phantom) or request a live 1.0 SOL Devnet airdrop for immediate on-chain testing.'
  },
  {
    id: 'quickstart-overview',
    title: 'Quickstart & System Overview (Start Here)',
    icon: BookOpen,
    category: '1. Getting Started',
    targetModule: 'chat',
    summary:
      'Lysander Genesis Orchestrator combines all 34 workspace modules inside one interface running on Node.js + Express (port 3000) and React. Everything saves locally in SQLite and browser storage, and optionally syncs to Google Cloud Firestore and Google Workspace.',
    steps: [
      'Click "All Modules" in the top navigation bar to browse every tool sorted by category, or launch apps directly from the Sovereign OS Desktop.',
      'Press Ctrl + K (or Cmd + K on Mac) anytime to open the Quick Command bar and jump directly to any module by typing its name.',
      'Open "API Keys & Gateway" to store or test your Gemini, DeepSeek, Groq, OpenRouter, GitHub, Twilio, or Telnyx keys inside the AES-256-GCM encrypted vault.',
      'Sign in with Google from the top-right button when you want to sync Chat history, Vault artifacts, Google Tasks, or Google Drive.',
      'Open the "SYSTEM HEALTH HUD" pill near the bottom corner to monitor real host CPU, RAM, Firestore ping latency, and AI connectivity.'
    ],
    tips: 'New to terminals or code? Stick to Chat, Crypto Wallets, Macro Telemetry, App & Game Store, and the Forensic Manual — every action uses plain buttons and clear readouts.'
  },
  {
    id: 'chat',
    title: 'Sovereign Chat & Multi-Model Router',
    icon: MessageSquare,
    category: '2. Core AI & Workspace',
    targetModule: 'chat',
    summary:
      'Main AI workspace powered by models/gemini-4-hydrogen (with automatic failover to gemini-3.1-flash-lite, gemini-flash-latest, and gemini-3-flash-preview), external cloud APIs (DeepSeek, Groq, OpenRouter), and local offline models (WebLLM, Ollama, Termux llama-server).',
    steps: [
      'Click "All Modules (33)" in the top navigation bar (or "More (33)" at the bottom on a phone) to browse every tool sorted by category.',
      'Use slash commands right inside Chat anytime: `/dream` (run Dream State consolidation), `/evolve` (synthesize cognitive axioms), `/heal` (run recursive TypeScript self-healing), `/forge <task>` (forge & test a smart tool), `/hypervisor` (audit UID 0 & Ring -3 substrate).',
      'Pick a model from the "MODEL" dropdown (Gemini 4 Hydrogen is selected by default, backed by UID 0 Root Clearance and Ring -3 Hypervisor orchestration).',
      'On a phone, tap "AI Controls" to expand or collapse toggles so the chat transcript always fills your screen cleanly.',
      'Toggle "SEARCH: ON" to attach live web search facts, or "CHAIN OF THOUGHT: OPEN" to inspect step-by-step reasoning.',
      'Toggle "INFINITE WORKFLOW: ACTIVE" if you want the agent to keep executing multi-step coding, atomic patching, and verification turns until finished.',
      'Type your request in the bottom box and press Enter (or tap Dispatch). Click "Save to Vault" on any reply to store it permanently.'
    ],
    tips: 'If cloud quotas run low, switch the toggle to "AIR-GAPPED" or choose a WebLLM / Ollama / Termux model — local models also run the autonomous `[TAG]` workspace execution loop.'
  },
  {
    id: 'api-secrets',
    title: 'API Keys, AES-256-GCM Vault & Gateway',
    icon: Key,
    category: '2. Core AI & Workspace',
    targetModule: 'api-secrets',
    summary:
      'Stores API keys and integration tokens securely using AES-256-GCM authenticated encryption on the server, automatically masking secrets in UI readouts and logs.',
    steps: [
      'Open "API Keys & Gateway" from the top navigation or All Modules (33).',
      'Review which server environment keys are configured and healthy (Gemini, DeepSeek, Groq, OpenRouter, GitHub, Twilio, Telnyx, etc.).',
      'Add or rotate a secret using the vault form — values are encrypted with AES-256-GCM before touching disk and only masked previews are ever returned.',
      'Use the built-in endpoint tester to verify `/api/health`, `/api/secrets`, and provider connectivity in one click.'
    ],
    tips: 'Secrets stay on the Express server proxy (/api/*) and are never embedded into client-side bundles.'
  },
  {
    id: 'integrations',
    title: 'Integrations Matrix (Unified Add-On Hub)',
    icon: Layers,
    category: '2. Core AI & Workspace',
    targetModule: 'integrations',
    summary:
      'Single control plane linking all 15 platform add-ons: Google Tasks, Google Drive, AES-256-GCM Secrets Vault, Autonomous Patch Engine, Gemini/DeepSeek/Groq/OpenRouter, Ollama, GitHub, Twilio, Telnyx, Firebase, SQLite, and Capacitor/PWA.',
    steps: [
      'Open "Integrations" from the top bar to see live health status across all connected services.',
      'Click any card to inspect its endpoints, credentials state, or jump directly to that module.',
      'Use quick action buttons to test Google Workspace tokens, verify provider keys, or check local daemon availability.'
    ],
    tips: 'Check the Integrations Matrix first if an external service reports "Disconnected" — it points straight to the missing key or OAuth sign-in.'
  },
  {
    id: 'tasks',
    title: 'Google Tasks Sync & Confirmation Flows',
    icon: ListTodo,
    category: '2. Core AI & Workspace',
    targetModule: 'tasks',
    summary:
      'Connects directly to your real Google Tasks account using Google OAuth so you can view task lists, create tasks, set due dates, mark items done, and delete tasks safely.',
    steps: [
      'Open "Tasks" and click the "Sign in with Google" button if you have not connected your Google account yet.',
      'Pick one of your task lists on the left (e.g., My Tasks) or create a new list.',
      'Click "+ Add Task" to enter a title, optional notes, and a due date.',
      'Before any create, toggle, update, or delete hits Google Tasks, review the confirmation dialog and click Confirm.',
      'Click "Send to Chat" on any task to ask the AI assistant to help plan or execute that task.'
    ],
    tips: 'Every write operation requires explicit confirmation so the app never alters your real Google Tasks accidentally.'
  },
  {
    id: 'drive',
    title: 'Google Drive Explorer & Exporter',
    icon: HardDrive,
    category: '2. Core AI & Workspace',
    targetModule: 'drive',
    summary:
      'Real Google Drive API v3 client for browsing folders, searching files, reading/editing text documents, creating files, deleting with confirmation, and backing up Vault artifacts.',
    steps: [
      'Open "Drive" and connect your Google account if prompted.',
      'Use the search bar or breadcrumbs to browse folders and files inside your real Google Drive.',
      'Click a text or JSON file to view or edit its contents cleanly.',
      'Use "+ New File" or delete actions — destructive actions display a confirmation prompt first.'
    ],
    tips: 'Great for keeping code snippets, architecture docs, or exported JSON backups synced in your personal Google Drive.'
  },
  {
    id: 'autonomy-supervisor',
    title: 'Autonomy Supervisor, Dream State, Evolution & UID 0 Hypervisor',
    icon: Activity,
    category: '3. Engineering & Autonomy',
    targetModule: 'autonomy-supervisor',
    summary:
      'Control center for UID 0 Master Root Clearance (uid_0), Ring -3 Bare-Metal Hypervisor substrate checks, Dream State memory consolidation, Cognitive Evolution axioms, and Recursive TypeScript Self-Healing.',
    steps: [
      'Open "Autonomy Supervisor" from All Modules (33).',
      'Click "Verify UID 0 & Ring -3 Lock" in the Hypervisor banner to confirm root substrate status and host telemetry.',
      'Run "Dream Cycle" (optionally entering a focus topic) to consolidate chat/trajectory history into SQLite axioms and forge helpful utility tools automatically.',
      'Click "Trigger Evolution" to distill new behavioral axioms from feedback, or click "Run Recursive Self-Heal" to run `tsc --noEmit` and apply atomic patches until 0 compiler errors remain.'
    ],
    tips: 'All evolved axioms are persisted in SQLite (`evolutive_axioms`) and automatically injected into Chat prompts so the orchestrator continuously improves.'
  },
  {
    id: 'projects',
    title: 'Unified Projects Workspace',
    icon: FolderGit2,
    category: '3. Engineering & Autonomy',
    targetModule: 'projects',
    summary:
      'Browse workspace files, inspect code directories, manage synchronized project entries, and trigger build verification.',
    steps: [
      'Open "Unified Projects" from the navigation bar.',
      'Browse project cards, commit metadata, and local workspace files.',
      'Run workspace actions or inspect file diffs cleanly from one screen.'
    ],
    tips: 'Works directly with the local `/app/applet` project directory served by Express.'
  },
  {
    id: 'github',
    title: 'GitHub Repository Matrix',
    icon: FolderGit2,
    category: '3. Engineering & Autonomy',
    targetModule: 'github',
    summary:
      'Tracks GitHub repositories, live branch/commit telemetry, and authenticated repository synchronization.',
    steps: [
      'Open "GitHub Matrix" from All Modules (33).',
      'If using private repositories, add your GitHub token in "API Keys & Gateway" first.',
      'View recent commits, repository status, and sync checks across linked repos.'
    ],
    tips: 'Never paste personal access tokens into chat — save them in API Keys & Gateway instead.'
  },
  {
    id: 'functions',
    title: 'Function Deck & Toolbelt',
    icon: Zap,
    category: '3. Engineering & Autonomy',
    targetModule: 'functions',
    summary:
      'Instant browser & in-process utilities: Base64 encoder/decoder, JSON formatter, Regex tester, SHA-256 hasher, UUID/password generator, JS Compute Benchmark, and offline Compendium query.',
    steps: [
      'Open "Function Deck" from All Modules (33).',
      'Select any tool card or custom forged function on the left.',
      'Enter or paste your JSON/string parameters and click "Execute Function".',
      'Copy outputs directly or save results to your Vault.'
    ],
    tips: 'Runs instantly inside the app with zero cloud API token usage.'
  },
  {
    id: 'tool-shed',
    title: 'Micro-Tool Shed (JS Sandbox & Builder)',
    icon: Wrench,
    category: '3. Engineering & Autonomy',
    targetModule: 'tool-shed',
    summary:
      'Create, edit, test, and run JavaScript utilities (JWT decoder, IPv4/CIDR extractor, JSON flattener, hash verifier, entropy generator, logic-patch analyzer) inside an isolated runner.',
    steps: [
      'Open "Micro-Tool Shed" from the top navigation or All Modules (33).',
      'Pick any built-in tool from the list or type a plain-English description to generate a new tool.',
      'Provide sample input in the test box and click "Run Tool" to see real execution time and JSON output.',
      'Click "Save to Vault" or "Send to Chat" to reuse the output in your workflow.'
    ],
    tips: 'Every generated micro-tool is automatically saved to localStorage and persisted to the SQLite registry.'
  },
  {
    id: 'knowledge-graph',
    title: 'Interactive Knowledge Graph & Engineering Compendium',
    icon: Network,
    category: '3. Engineering & Autonomy',
    targetModule: 'knowledge-graph',
    summary:
      'Visual interactive graph organizing software architecture patterns, security rules, database schemas, and session memory into searchable connected nodes.',
    steps: [
      'Open "Knowledge Graph" from the navigation bar.',
      'Filter nodes by category pill (coding, architecture, security, etc.) or click any node to inspect details.',
      'Add custom nodes manually or click "AI Synthesize" to extract structured nodes from recent work.',
      'Export the full graph as JSON or Markdown into your Vault.'
    ],
    tips: 'Great for mapping complex TypeScript modules, Firebase rules, or deployment topologies.'
  },
  {
    id: 'presets',
    title: 'Prompt Presets & Instruction Library',
    icon: BookmarkPlus,
    category: '3. Engineering & Autonomy',
    targetModule: 'presets',
    summary:
      'Reusable system prompts and workflow templates for architecture reviews, production engineering, security audits, and creative media prompts.',
    steps: [
      'Open "Prompt Presets" from All Modules (33).',
      'Search by keyword or filter by category (architecture, engineering, multimodal, security).',
      'Click "Launch in Module" to inject the prompt straight into Chat or the target studio, or create your own preset.'
    ],
    tips: 'Save repetitive workflows (like code review checklists) as custom presets to run in one click.'
  },
  {
    id: 'hitl',
    title: 'HITL Workflows (Human-in-the-Loop Approvals)',
    icon: UserCheck,
    category: '3. Engineering & Autonomy',
    targetModule: 'hitl',
    summary:
      'Approval queue where sensitive or multi-step automated tasks wait for human review, editing, approval, or rejection before running.',
    steps: [
      'Open "HITL Workflows" from All Modules (33).',
      'Review pending items in the queue along with payload details.',
      'Click Approve, Modify, or Reject to control execution safely.'
    ],
    tips: 'Backed by `/data/hitl_queue.json` on the server so approvals persist across restarts.'
  },
  {
    id: 'swarm-test',
    title: 'Swarm Diagnostic Test Suite',
    icon: Activity,
    category: '3. Engineering & Autonomy',
    targetModule: 'swarm-test',
    summary:
      'Runs real automated verification checks across backend routes, local database state, browser APIs, and AI providers.',
    steps: [
      'Open "Swarm Diagnostic" from All Modules (33).',
      'Click "Run Full Diagnostic Suite" and wait for live HTTP and subsystem probes to complete.',
      'Inspect any failed probe to see exact response codes and troubleshooting steps.'
    ],
    tips: 'Run this after rotating API keys or editing server routes to confirm end-to-end health.'
  },
  {
    id: 'war-room',
    title: 'PC War Room Cockpit',
    icon: ShieldAlert,
    category: '3. Engineering & Autonomy',
    targetModule: 'war-room',
    summary:
      'Full-screen multi-panel dashboard showing subsystem readiness, live terminal logs, radar node topology, Lysander skills executor, and safety toggle switches.',
    steps: [
      'Open "PC War Room" from All Modules (33).',
      'Click any Lysander skill card to execute a real server skill probe via `/api/lysander/invoke-skill`.',
      'Use "Global Recon Sweep", "Synchronize Memory", or "Export Tactical War Diary" for downloadable JSON audit snapshots.',
      'Toggle safety interlocks (Deep Web Proxy, Low-Telemetry Mode, Delta Lock, etc.) from the bottom switch grid.'
    ],
    tips: 'Designed to wrap cleanly into a single column on phones and expand across wide desktop monitors.'
  },
  {
    id: 'search-maps',
    title: 'Google Search & Google Maps Grounding',
    icon: MapPin,
    category: '4. Grounding, Browser & Recon',
    targetModule: 'search',
    summary:
      'Real-time web search and spatial location grounding powered by gemini-3.1-flash-lite with clickable web sources and verified citations.',
    steps: [
      'Open "Search Grounding" or "Maps Grounding" from All Modules (33) (or switch between Search Tool and Maps Tool at the top).',
      'Type any factual query (e.g., current release notes, regional transit routes, data center hubs) or click a suggested chip.',
      'Click "Execute Grounding" and inspect both the grounded answer and the verified reference links below.'
    ],
    tips: 'Use "Copy Synthesis" to paste verified facts cleanly into documentation or Chat.'
  },
  {
    id: 'browser',
    title: 'Open-Web CORS-Free Browser',
    icon: Globe,
    category: '4. Grounding, Browser & Recon',
    targetModule: 'browser',
    summary:
      'Server-proxied browser that strips restrictive iframe headers, rewrites relative URLs, and includes DuckDuckGo search + readable DOM text extraction.',
    steps: [
      'Open "Open-Web Browser" from the top navigation bar.',
      'Enter any public website URL or search query in the address bar and click Go.',
      'If a site blocks embedded frames, switch to Autonomous Extract mode to read clean page text.',
      'Click "Save to Vault" to archive important pages.'
    ],
    tips: 'Built-in media extraction lets you inspect public documentation without CORS blocks.'
  },
  {
    id: 'osint',
    title: 'OSINT & Attack Surface Scanner',
    icon: ShieldAlert,
    category: '4. Grounding, Browser & Recon',
    targetModule: 'osint',
    summary:
      'Non-intrusive domain security checker performing live DNS lookups (A, MX, TXT, NS, SPF, DMARC), TLS certificate expiry checks, and HTTP security header audits.',
    steps: [
      'Open "OSINT & Attack Surface" from All Modules (33).',
      'Enter a domain you own or want to inspect (e.g. `github.com`).',
      'Choose Quick Surface or Full OSINT Audit and click Run.',
      'Review missing headers or DNS findings and click "Save Dossier to Vault" to keep a copy.'
    ],
    tips: 'Handy for confirming HTTPS certificates, SPF/DMARC records, and CSP headers on your deployed domains.'
  },
  {
    id: 'burner-mail',
    title: 'Burner Mail Matrix',
    icon: Mail,
    category: '4. Grounding, Browser & Recon',
    targetModule: 'burner-mail',
    summary:
      'Generates real disposable temporary email addresses so you can receive test sign-up codes and verification links without exposing your personal inbox.',
    steps: [
      'Open "Burner Mail" from the navigation bar.',
      'Click "Generate New Burner Address" and copy the address.',
      'Use it in a sign-up flow, then click "Refresh Inbox" to read incoming messages and click verification links inside the Open-Web Browser.'
    ],
    tips: 'Useful for QA testing registration and password-reset flows.'
  },
  {
    id: 'infinite-sim',
    title: 'Infinite-SIM & Telecom Fleet',
    icon: Phone,
    category: '4. Grounding, Browser & Recon',
    targetModule: 'infinite-sim',
    summary:
      'Manages virtual SIM profiles, Luhn-valid ICCIDs, LPA activation helpers, and Twilio / Telnyx SMS & voice routing when carrier API keys are configured.',
    steps: [
      'Open "Infinite-SIM" from the navigation bar.',
      'Add your Twilio or Telnyx credentials in "API Keys & Gateway" for live carrier provisioning.',
      'Generate local test ICCID profiles or send/check carrier SMS webhooks directly from the panel.'
    ],
    tips: 'Carrier actions clearly show whether real Twilio/Telnyx keys are active or if local format validation is being previewed.'
  },
  {
    id: 'image',
    title: 'Visual Studio (Image Generation)',
    icon: ImageIcon,
    category: '5. Creative & Voice Studios',
    targetModule: 'image',
    summary:
      'Generates high-resolution images from text prompts with aspect-ratio controls and an offline procedural Canvas/SVG renderer when disconnected.',
    steps: [
      'Open "Visual Studio" from All Modules (33) or the top bar ("Image").',
      'Describe the image clearly, choose an aspect ratio (1:1, 16:9, 9:16, 4:3, 3:4), and click Generate.',
      'Download the image or click "Save to Vault" to archive it.'
    ],
    tips: 'Works offline too via the procedural Canvas/SVG fallback generator.'
  },
  {
    id: 'music',
    title: 'Lyria Music Studio',
    icon: Music,
    category: '5. Creative & Voice Studios',
    targetModule: 'music',
    summary:
      'Composes audio tracks and instrumentals with Lyria 3 plus a zero-dependency Web Audio API polyphonic synthesizer when offline.',
    steps: [
      'Open "Lyria Music" from All Modules (33).',
      'Describe mood, tempo (BPM), instruments, and genre.',
      'Click Generate to preview inside the audio player, download, or Save to Vault.'
    ],
    tips: 'Offline Web Audio synthesis requires no external API keys.'
  },
  {
    id: 'video',
    title: 'Veo 3 Motion Video Studio',
    icon: Video,
    category: '5. Creative & Voice Studios',
    targetModule: 'video',
    summary:
      'Generates motion video clips from prompts or reference images with Veo 3, plus a client-side canvas motion renderer offline.',
    steps: [
      'Open "Veo 3 Motion" from All Modules (33).',
      'Describe scene motion, camera movement, and visual style.',
      'Click Generate, preview in the built-in HTML5 player, and Save to Vault.'
    ],
    tips: 'Keep descriptions focused on subject + lighting + camera path for cleanest motion results.'
  },
  {
    id: 'live',
    title: 'Live Voice Bridge (Real-Time Audio)',
    icon: Radio,
    category: '5. Creative & Voice Studios',
    targetModule: 'live',
    summary:
      'Low-latency bidirectional voice conversation over WebSockets (`/live` powered by Gemini native audio models) with natural interruption support.',
    steps: [
      'Open "Live Voice" from All Modules (33) or click the Gemini Live Voice button inside Chat.',
      'Allow microphone permission when your browser prompts.',
      'Speak naturally — tap Stop anytime to end the live stream cleanly.'
    ],
    tips: 'For noisy environments, headphones prevent microphone echo.'
  },
  {
    id: 'transcribe',
    title: 'Speech-to-Text Transcribe',
    icon: Mic,
    category: '5. Creative & Voice Studios',
    targetModule: 'transcribe',
    summary:
      'Records directly from your microphone or accepts MP3/WAV/WebM/M4A/OGG uploads to produce verbatim text transcripts via gemini-3.1-flash-lite.',
    steps: [
      'Open "Transcribe" from All Modules (33).',
      'Click the teal microphone button to record live audio, or click Upload Audio File to select a recording.',
      'Wait for processing, then copy the transcript or Save to Vault.'
    ],
    tips: 'Also works as a quick way to transcribe voice memos on your phone.'
  },
  {
    id: 'scratchpad',
    title: 'Infinite Scratchpad',
    icon: FileText,
    category: '6. Memory, Storage & Audit',
    targetModule: 'scratchpad',
    summary:
      'Persistent working notepad and snippet buffer backed by local storage and server SQLite, with one-click Send to Chat and Save to Vault.',
    steps: [
      'Open "Infinite Scratchpad" from All Modules (33).',
      'Draft notes, shell commands, or architecture drafts freely.',
      'Click "Send to Chat" to hand a draft straight to an AI agent, or "Save to Vault" to archive permanently.'
    ],
    tips: 'Autonomy Supervisor can help organize and de-clutter older scratchpad entries.'
  },
  {
    id: 'vault',
    title: 'Vault Storage (Artifacts & Cloud Sync)',
    icon: Archive,
    category: '6. Memory, Storage & Audit',
    targetModule: 'vault',
    summary:
      'Stores saved chat outputs, code blueprints, dossiers, images, audio clips, videos, and transcripts with offline cache + optional Firestore cloud sync.',
    steps: [
      'Open "Vault Storage" from All Modules (33).',
      'Search or filter saved items by type (knowledge, image, music, video, transcription).',
      'Preview media, copy markdown/code, or delete obsolete items cleanly.'
    ],
    tips: 'Sign in with Google in the header so Vault artifacts synchronize across devices.'
  },
  {
    id: 'audit',
    title: 'Forensic Audit Ledger',
    icon: ShieldCheck,
    category: '6. Memory, Storage & Audit',
    targetModule: 'audit',
    summary:
      'Chronological ledger logging system events, saved artifacts, security scans, and schema executions with SHA-256 verification hashes.',
    steps: [
      'Open "Forensic Ledger" from All Modules (33).',
      'Inspect timestamps, event types, descriptions, and SHA-256 hashes.',
      'Use it to verify when keys were rotated, builds ran, or tasks completed.'
    ],
    tips: 'Stored locally in `/data/audit_ledger.json` and SQLite for traceability.'
  },
  {
    id: 'download-models',
    title: 'Model Wardrobe (Local Weights)',
    icon: Download,
    category: '7. Edge, Mobile & Installers',
    targetModule: 'download-models',
    summary:
      'Browse and download open-source GGUF weights (Llama 3.2, Qwen 2.5 Coder, DeepSeek-R1, Phi-4, Mistral, SmolLM2) or copy curl/Ollama pull commands for offline execution.',
    steps: [
      'Open "Model Wardrobe" from the top navigation or All Modules (33).',
      'Pick a model matching your device RAM (e.g. Llama 3.2 1B/3B for phones, Qwen 2.5 7B–32B or DeepSeek-R1 for desktop).',
      'Click Download or copy the pull command to run locally in Ollama or Termux llama.cpp.'
    ],
    tips: 'Smaller Q4_K_M models (0.5B–3B) run fast even on phones without overheating.'
  },
  {
    id: 'termux',
    title: 'Termux Android Edge & Offline LLM',
    icon: Smartphone,
    category: '7. Edge, Mobile & Installers',
    targetModule: 'termux',
    summary:
      'Turns any Android phone running Termux into a local AI host via native ARM64 `llama.cpp` (`127.0.0.1:8080`), WebLLM in-browser GPU inference, and Termux:API hardware tools.',
    steps: [
      'Install Termux and Termux:API from F-Droid (avoid the outdated Google Play Store build).',
      'Open the "Termux Android" tab in this app.',
      'Use "Offline LLM" to run WebGPU models right in your browser, or copy the One-Shot Installer command to compile native `llama.cpp` in Termux.',
      'Use the Termux panel to check battery stats, toggle wake-lock, vibrate, or run CLI commands on your device.'
    ],
    tips: 'Once a WebLLM or llama.cpp GGUF model is downloaded, inference works completely offline with zero token costs.'
  },
  {
    id: 'universal-installer',
    title: 'Universal Installer (PC, Mac, Linux, Termux)',
    icon: Download,
    category: '7. Edge, Mobile & Installers',
    targetModule: 'universal-installer',
    summary:
      'Generates ready-to-run installation commands and setup scripts for Linux, macOS, Windows WSL2, and Android Termux.',
    steps: [
      'Open "Universal Installer" from the top navigation or All Modules (33).',
      'Copy the one-line setup command or download the standalone installer script.',
      'Paste and run it in your terminal to install dependencies, build assets, and start the server on port 3000.'
    ],
    tips: 'Includes environment checks for Node.js, Git, Python, and optional Ollama setup.'
  },
  {
    id: 'packager',
    title: 'Android APK Packager',
    icon: Package,
    category: '7. Edge, Mobile & Installers',
    targetModule: 'packager',
    summary:
      'Packages selected modules from this web workspace into an installable Android Capacitor / PWA bundle and builds the APK pipeline.',
    steps: [
      'Open "APK Packager" from All Modules (33).',
      'Set your App Name, Package ID (e.g. `com.jhammerz.app`), and target bridge (Capacitor, TWA, or Termux substrate).',
      'Check which modules to include and click "Compile & Package APK".',
      'Inspect live build logs and download your generated bundle or Android project artifacts.'
    ],
    tips: 'Requires Android SDK/Gradle on the host for signed binary compilation; otherwise generates the complete ready-to-build Capacitor project.'
  },
  {
    id: 'health-hud',
    title: 'System Health HUD & AI Navigation Bus',
    icon: Activity,
    category: '7. Edge, Mobile & Installers',
    targetModule: 'chat',
    summary:
      'Floating HUD (bottom-left on phones, bottom-right on desktop) showing real CPU %, RAM MB, Firestore latency, and the `window.__AURELIUS_ORCHESTRATOR__` programmable module bus.',
    steps: [
      'Click the "SYSTEM HEALTH HUD" badge to expand or maximize real-time host telemetry.',
      'Switch between RESOURCES, FIRESTORE & GEMINI, AI ROUTER & DISPATCH, and HEARTBEAT LOGS.',
      'Click "Ping Now" to measure live Cloud Firestore latency or jump directly to any of the 33 modules from Tab 3.'
    ],
    tips: 'All metrics show honest live measurements from `/api/system/health` instead of placeholder numbers.'
  }
];

export const SystemManualModal: React.FC<SystemManualModalProps> = ({
  isOpen,
  onClose,
  onSelectModule
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState(SECTIONS[0].id);
  const [copiedFull, setCopiedFull] = useState(false);
  const [readmeContent, setReadmeContent] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/system/readme')
        .then((res) => res.text())
        .then((text) => setReadmeContent(text))
        .catch(() => {});
    }
  }, [isOpen]);

  const modalRef = React.useRef<HTMLDivElement>(null);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  const filteredSections = SECTIONS.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeSection = SECTIONS.find((s) => s.id === selectedSectionId) || filteredSections[0] || SECTIONS[0];

  const handleCopyFullReadme = () => {
    if (readmeContent) {
      navigator.clipboard.writeText(readmeContent);
      setCopiedFull(true);
      setTimeout(() => setCopiedFull(false), 2000);
    }
  };

  const handleDownloadReadme = () => {
    const blob = new Blob([readmeContent || '# Lysander Genesis Orchestrator Manual'], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'README.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-5"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-zinc-900 border border-zinc-700/80 rounded-2xl max-w-6xl w-full h-[92dvh] sm:h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-zinc-800 bg-zinc-950/60 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-lg font-bold text-zinc-100 truncate">
                  Lysander Genesis Complete Manual
                </h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                  All 39 Modules · Beginner-Proof
                </span>
              </div>
              <p className="text-xs text-zinc-400 truncate">
                Plain-English step-by-step instructions for every module and subsystem
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyFullReadme}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors cursor-pointer"
              title="Copy Full README.md Markdown to clipboard"
            >
              {copiedFull ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
              <span>{copiedFull ? 'Copied Markdown!' : 'Copy README'}</span>
            </button>

            <button
              onClick={handleDownloadReadme}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors cursor-pointer"
              title="Download README.md"
            >
              <Download className="w-3.5 h-3.5 text-zinc-400" />
              <span>Download .md</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              aria-label="Close Manual"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 sm:px-5 py-2.5 border-b border-zinc-800 bg-zinc-900/60 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search any module or subsystem (e.g. 'tasks', 'vault', 'offline', 'video', 'apk')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-amber-500/50 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Body Split View */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Navigation / Topic List (Sidebar) */}
          <div className="w-full md:w-72 max-h-44 md:max-h-none border-b md:border-b-0 md:border-r border-zinc-800 bg-zinc-950/40 overflow-y-auto p-2 space-y-1 shrink-0">
            {filteredSections.map((sec) => {
              const Icon = sec.icon;
              const isSelected = activeSection.id === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setSelectedSectionId(sec.id)}
                  className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2.5 ${
                    isSelected
                      ? 'bg-amber-500/15 border border-amber-500/40 text-amber-200 shadow-sm'
                      : 'hover:bg-zinc-800/60 text-zinc-300 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-amber-400' : 'text-zinc-500'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold truncate">{sec.title}</div>
                    <div className="text-[10px] text-zinc-500 truncate">{sec.category}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detailed Guide Viewport */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* Active Topic Banner */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
                  <activeSection.icon className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                    {activeSection.category}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-zinc-100 mt-1">{activeSection.title}</h3>
                </div>
              </div>

              {onSelectModule && activeSection.targetModule && (
                <button
                  onClick={() => {
                    onSelectModule(activeSection.targetModule!);
                    onClose();
                  }}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-semibold text-xs shadow-md transition-all cursor-pointer shrink-0"
                >
                  <span>Open This Tool</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Plain English Summary */}
            <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-1.5">
              <div className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
                What It Does (Plain English):
              </div>
              <p className="text-xs text-zinc-200 leading-relaxed">{activeSection.summary}</p>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold">
                How to Use It (Step-by-Step):
              </h4>
              <div className="space-y-2">
                {activeSection.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80"
                  >
                    <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center font-mono text-xs font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <p className="text-xs text-zinc-300 leading-relaxed pt-0.5">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Pro Tip Box */}
            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-300 leading-relaxed">
                <span className="font-bold">Helpful Tip: </span>
                {activeSection.tips}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
              <div className="font-mono">
                © 1988–2026 Joshua Hamilton (JHammerZ) · MIT & TWENTY 47 / H-FID Custom License · https://jhammerz.github.io
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    onClose();
                    window.dispatchEvent(new CustomEvent('open-jhammerz-license'));
                  }}
                  className="text-amber-400 hover:text-amber-300 transition-colors underline cursor-pointer"
                >
                  Open Full MIT & JHammerZ License Charter
                </button>
                <button
                  onClick={handleCopyFullReadme}
                  className="hover:text-amber-300 transition-colors underline cursor-pointer"
                >
                  Copy Complete Markdown README
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile-Friendly Bottom Close Button */}
        <div className="md:hidden p-3 border-t border-zinc-800 bg-zinc-950/60 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold text-sm shadow-lg transition-all"
          >
            Close Manual
          </button>
        </div>
      </div>
    </div>
  );
};
