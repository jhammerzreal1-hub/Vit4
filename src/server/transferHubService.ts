import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as esbuild from 'esbuild';
import { ZipArchiveBuilder } from '../utils/zipBuilder';

const PROJECT_ROOT = process.cwd();
const DATA_DIR = path.resolve(PROJECT_ROOT, 'data');
const BACKUPS_ROOT = path.resolve(DATA_DIR, 'module-backups');
const HISTORY_FILE = path.resolve(DATA_DIR, 'transfer-hub-history.json');

export interface ModuleFileRecord {
  relativePath: string;
  role: 'ui' | 'server' | 'engine' | 'config';
  exists: boolean;
  sizeBytes: number;
  lineCount: number;
  sha256: string;
  modifiedAt: string;
}

export interface OrchestratorModuleSpec {
  id: string;
  name: string;
  category:
    | 'Core & Autonomy'
    | 'Cloud & Workspace'
    | 'Intelligence & Web'
    | 'Creative & Gaming'
    | 'Files, Finance & System'
    | 'Engines & Kernel';
  description: string;
  whatItDoes: string;
  sourceModuleId?: string;
  files: ModuleFileRecord[];
  totalBytes: number;
  totalLines: number;
  bundleHash: string;
  backupCount: number;
  lastModifiedAt: string;
}

export interface UnifiedDownloadItem {
  id: string;
  title: string;
  sourceSection: string;
  sourceModuleId: string;
  category:
    | 'Host Bridges & Files'
    | 'OS Packages & Installers'
    | 'AI Model Weights'
    | 'Edge & Mobile'
    | 'Core Configs & Profiles';
  format: string;
  whatItDoes: string;
  downloadUrl?: string;
  downloadFilename?: string;
  method?: 'GET' | 'CLIENT_EXPORT';
  clientAction?: 'export-os-profile';
  curlCommand?: string;
  available: boolean;
  sizeHint: string;
}

export interface ModuleBackupRecord {
  backupId: string;
  moduleId: string;
  moduleName: string;
  createdAt: string;
  reason: string;
  files: Array<{ relativePath: string; sizeBytes: number; sha256: string }>;
}

export interface TransferHistoryEntry {
  id: string;
  timestamp: string;
  direction: 'download' | 'upload' | 'replace' | 'rollback';
  category: 'module' | 'os-download' | 'file-upload' | 'profile';
  targetId: string;
  label: string;
  detail: string;
  sizeBytes?: number;
  sha256?: string;
  status: 'ok' | 'error';
}

export interface ModuleUploadFileInput {
  relativePath: string;
  content: string;
}

export interface ModuleInspectFileResult {
  relativePath: string;
  allowed: boolean;
  syntaxValid: boolean;
  syntaxError?: string;
  changed: boolean;
  oldBytes: number;
  newBytes: number;
  oldLines: number;
  newLines: number;
  addedLines: number;
  removedLines: number;
  oldSha256: string;
  newSha256: string;
}

export interface ModuleInspectResult {
  moduleId: string;
  moduleName: string;
  allAllowed: boolean;
  allSyntaxValid: boolean;
  hasAnyChange: boolean;
  files: ModuleInspectFileResult[];
}

interface CuratedModuleDef {
  id: string;
  name: string;
  category: OrchestratorModuleSpec['category'];
  description: string;
  whatItDoes: string;
  sourceModuleId?: string;
  files: Array<{ relativePath: string; role: ModuleFileRecord['role'] }>;
}

const CURATED_MODULES: CuratedModuleDef[] = [
  // === CORE & AUTONOMY ===
  {
    id: 'chat',
    name: 'Sovereign Chat & Orchestrator Core',
    category: 'Core & Autonomy',
    sourceModuleId: 'chat',
    description: 'Primary autonomous orchestrator chat, multi-model AI dispatcher, and resident runtime.',
    whatItDoes: 'Coordinates multi-agent reasoning, autonomous tool execution, streaming responses, and resident subsystem state.',
    files: [
      { relativePath: 'src/components/ChatModule.tsx', role: 'ui' },
      { relativePath: 'src/utils/OrchestratorRuntime.ts', role: 'engine' },
      { relativePath: 'src/utils/sovereignAiDispatcher.ts', role: 'engine' },
      { relativePath: 'src/utils/bakedNeuralEngine.ts', role: 'engine' },
      { relativePath: 'src/utils/thoughtGenerator.ts', role: 'engine' }
    ]
  },
  {
    id: 'ai-genesis-distillery',
    name: 'AI Genesis & Molecular Distillery',
    category: 'Core & Autonomy',
    sourceModuleId: 'ai-genesis-distillery',
    description: 'Custom AI agent builder, model weight distillation, and training pipeline.',
    whatItDoes: 'Creates custom agent architectures, exports weights/configs, and runs iterative distillation workflows.',
    files: [
      { relativePath: 'src/components/AIGenesisDistilleryModule.tsx', role: 'ui' },
      { relativePath: 'src/server/aiGenesisDistillery.ts', role: 'server' }
    ]
  },
  {
    id: 'batch-processor',
    name: 'Autonomous Batch Processor',
    category: 'Core & Autonomy',
    sourceModuleId: 'batch-processor',
    description: 'Background queue daemon for multi-file transformations and data processing pipelines.',
    whatItDoes: 'Queues and executes multi-file regex/normalization/conversion/AI transforms and CSV/JSON/JS/AI ETL tasks asynchronously in SQLite.',
    files: [
      { relativePath: 'src/components/BatchProcessorModule.tsx', role: 'ui' },
      { relativePath: 'src/server/batchProcessorService.ts', role: 'server' }
    ]
  },
  {
    id: 'agent-dev-kit',
    name: 'Agent Dev Kit & Engine Builder',
    category: 'Core & Autonomy',
    sourceModuleId: 'agent-dev-kit',
    description: 'Autonomously forge tools, synthesize workflows, and build orchestrator capabilities.',
    whatItDoes: 'Provides agent development tooling, code synthesis, and automated testing harnesses inside the OS.',
    files: [
      { relativePath: 'src/components/AgentDevKitModule.tsx', role: 'ui' }
    ]
  },
  {
    id: 'autonomy-supervisor',
    name: 'Autonomy Supervisor & Workspace Daemon',
    category: 'Core & Autonomy',
    sourceModuleId: 'autonomy-supervisor',
    description: 'Background autonomous supervisor, self-improvement loop, and workspace daemon.',
    whatItDoes: 'Orchestrates autonomous tasks, live evolutive learning, and background workspace directives.',
    files: [
      { relativePath: 'src/components/AutonomySupervisorModule.tsx', role: 'ui' },
      { relativePath: 'src/server/autonomyEngine.ts', role: 'server' },
      { relativePath: 'src/server/workspaceAutonomy.ts', role: 'server' },
      { relativePath: 'src/utils/autonomousSelfImprovement.ts', role: 'engine' },
      { relativePath: 'src/utils/liveEvolutiveLearning.ts', role: 'engine' }
    ]
  },
  {
    id: 'war-room',
    name: 'PC War Room Cockpit',
    category: 'Core & Autonomy',
    sourceModuleId: 'war-room',
    description: 'Multi-node operational cockpit for swarm coordination and live mission reports.',
    whatItDoes: 'Monitors active nodes, dispatches multi-agent directives, and exports mission dossiers.',
    files: [
      { relativePath: 'src/components/WarRoomModule.tsx', role: 'ui' }
    ]
  },
  {
    id: 'hitl',
    name: 'HITL Workflows (Human-in-the-Loop)',
    category: 'Core & Autonomy',
    sourceModuleId: 'hitl',
    description: 'Approval gatekeeper for sensitive autonomous directives and workflow mutations.',
    whatItDoes: 'Queues proposed agent actions for human review, mutation, approval, or rejection.',
    files: [
      { relativePath: 'src/components/HITLWorkflowModule.tsx', role: 'ui' }
    ]
  },
  {
    id: 'tool-shed',
    name: 'Dynamic Micro-Tool Shed',
    category: 'Core & Autonomy',
    sourceModuleId: 'tool-shed',
    description: 'On-the-fly AI micro-tool generator and client sandbox runner.',
    whatItDoes: 'Generates, stores, and runs custom utility scripts directly inside a safe browser sandbox.',
    files: [
      { relativePath: 'src/components/ToolShedModule.tsx', role: 'ui' }
    ]
  },
  {
    id: 'functions',
    name: 'Function Deck & Toolbelt',
    category: 'Core & Autonomy',
    sourceModuleId: 'functions',
    description: 'Instant developer utilities and conversational tool dispatcher engine.',
    whatItDoes: 'Runs Base64, JSON, Regex, Hash, UUID, password generators, and autonomous tool invocations.',
    files: [
      { relativePath: 'src/components/FunctionDeckModule.tsx', role: 'ui' },
      { relativePath: 'src/utils/functionEngine.ts', role: 'engine' }
    ]
  },
  {
    id: 'presets',
    name: 'Prompt Presets',
    category: 'Core & Autonomy',
    sourceModuleId: 'presets',
    description: 'Curated architectural directives, code reviews, and reusable prompt templates.',
    whatItDoes: 'Manages and injects structured system and task prompts directly into Sovereign Chat.',
    files: [
      { relativePath: 'src/components/PromptPresetsModule.tsx', role: 'ui' }
    ]
  },
  {
    id: 'download-models',
    name: 'Model Wardrobe & Weights Bridge',
    category: 'Core & Autonomy',
    sourceModuleId: 'download-models',
    description: 'Internal proxy bridge for downloading local GGUF LLM weights and offline runtimes.',
    whatItDoes: 'Streams large GGUF model files through the OS proxy and binds local models to orchestrator agents.',
    files: [
      { relativePath: 'src/components/DownloadModelsModule.tsx', role: 'ui' },
      { relativePath: 'src/utils/localLlmEngine.ts', role: 'engine' }
    ]
  },

  // === FILES, FINANCE & SYSTEM ===
  {
    id: 'transfer-hub',
    name: 'Downloads, Uploads & Module Lab',
    category: 'Files, Finance & System',
    sourceModuleId: 'transfer-hub',
    description: 'Centralized cross-OS download catalog, universal uploader, and live module export/hot-swap engine.',
    whatItDoes: 'Hosts all OS downloads, packages individual orchestrator modules for testing, validates syntax, and performs backed-up hot replacements.',
    files: [
      { relativePath: 'src/components/TransferHubModule.tsx', role: 'ui' },
      { relativePath: 'src/server/transferHubService.ts', role: 'server' },
      { relativePath: 'src/utils/zipBuilder.ts', role: 'engine' }
    ]
  },
  {
    id: 'crypto-wallet',
    name: 'Sovereign Crypto Wallets',
    category: 'Files, Finance & System',
    sourceModuleId: 'crypto-wallet',
    description: 'Real mainnet BTC/ETH/SOL wallet custody, on-chain balances, transfers, and seed-funding discovery.',
    whatItDoes: 'Manages real BIP39/HD mainnet wallets, live RPC balance verification, outgoing transfers, and autonomous crypto flows.',
    files: [
      { relativePath: 'src/components/SovereignCryptoWalletModule.tsx', role: 'ui' },
      { relativePath: 'src/server/cryptoWalletService.ts', role: 'server' }
    ]
  },
  {
    id: 'grant-hunter',
    name: 'Grant Hunter (0% Equity)',
    category: 'Files, Finance & System',
    sourceModuleId: 'grant-hunter',
    description: 'Finds non-reciprocal federal/foundation grants and drafts submission-ready funding packages.',
    whatItDoes: 'Queries live Grants.gov and open web grant programs, builds provenance cover sheets, and exports applications to Desktop.',
    files: [
      { relativePath: 'src/components/AutonomousGrantEnginePanel.tsx', role: 'ui' },
      { relativePath: 'src/server/grantApplicationService.ts', role: 'server' }
    ]
  },
  {
    id: 'macro-telemetry',
    name: 'Macro-Telemetry & Capital Flows',
    category: 'Files, Finance & System',
    sourceModuleId: 'macro-telemetry',
    description: 'Live market macro-telemetry, liquidity velocity tracking, and autonomous capital signal engine.',
    whatItDoes: 'Streams real market indicators, cross-asset flows, and anomaly signals into the autonomous wallet & orchestrator loop.',
    files: [
      { relativePath: 'src/components/MacroTelemetryModule.tsx', role: 'ui' },
      { relativePath: 'src/server/macroTelemetryService.ts', role: 'server' },
      { relativePath: 'src/utils/macroTelemetryEngine.ts', role: 'engine' }
    ]
  },
  {
    id: 'file-manager',
    name: 'Sovereign Files (OS Explorer)',
    category: 'Files, Finance & System',
    sourceModuleId: 'file-manager',
    description: 'Full OS filesystem explorer, binary uploader, downloads root scanner, and host bridge connector.',
    whatItDoes: 'Reads, writes, renames, deletes, searches, and streams files across local OS storage and connected host bridges.',
    files: [
      { relativePath: 'src/components/SovereignFilesModule.tsx', role: 'ui' },
      { relativePath: 'src/server/sovereignOsKernel.ts', role: 'server' }
    ]
  },
  {
    id: 'terminal',
    name: 'Root Terminal (UID 0 Shell)',
    category: 'Files, Finance & System',
    sourceModuleId: 'terminal',
    description: 'Interactive shell terminal connected directly to the OS kernel runtime.',
    whatItDoes: 'Executes live shell commands, scripts, and build tools inside the OS workspace.',
    files: [
      { relativePath: 'src/components/SovereignTerminalModule.tsx', role: 'ui' }
    ]
  },
  {
    id: 'task-manager',
    name: 'Process & Kernel Monitor (Task Manager)',
    category: 'Files, Finance & System',
    sourceModuleId: 'task-manager',
    description: 'Live process, memory, CPU, and active OS window monitor.',
    whatItDoes: 'Displays real host telemetry, running processes, and active module resource usage.',
    files: [
      { relativePath: 'src/components/SovereignTaskManagerModule.tsx', role: 'ui' }
    ]
  },
  {
    id: 'os-settings',
    name: 'OS Control Center & Customization',
    category: 'Files, Finance & System',
    sourceModuleId: 'os-settings',
    description: 'Full OS appearance customization, desktop icon management, dotfiles CSS, and profile import/export.',
    whatItDoes: 'Customizes wallpapers, themes, window opacity, desktop shortcuts, custom icons, and JSON profile backups.',
    files: [
      { relativePath: 'src/components/SovereignOSSettingsModule.tsx', role: 'ui' },
      { relativePath: 'src/utils/osCustomizationStore.ts', role: 'engine' }
    ]
  },
  {
    id: 'packager',
    name: 'APK, Bootloader & Standalone Packager',
    category: 'Files, Finance & System',
    sourceModuleId: 'packager',
    description: 'Builds Android APK binaries, single-file HTML/CJS bundles, and Termux bootloader scripts.',
    whatItDoes: 'Packages the entire OS for offline deployment, Android WebAPK/APK installation, and one-shot shell bootstrapping.',
    files: [
      { relativePath: 'src/components/PackagerModule.tsx', role: 'ui' },
      { relativePath: 'src/data/oneShotInstallerScript.ts', role: 'config' }
    ]
  },
  {
    id: 'audit',
    name: 'Forensic Audit Ledger',
    category: 'Files, Finance & System',
    sourceModuleId: 'audit',
    description: 'Cryptographic forensic ledger and execution provenance verifier.',
    whatItDoes: 'Records tamper-evident SHA-256 execution logs and generates downloadable forensic audit reports.',
    files: [
      { relativePath: 'src/components/AuditLedgerModule.tsx', role: 'ui' },
      { relativePath: 'src/server/forensicAuditService.ts', role: 'server' }
    ]
  },
  {
    id: 'swarm-test',
    name: 'Forensic Audit, Diagnostics & Manual',
    category: 'Files, Finance & System',
    sourceModuleId: 'swarm-test',
    description: 'Deep SHA-256 file forensics, system health dashboard, hardware diagnostics, and technical manual.',
    whatItDoes: 'Runs integrity audits, hardware benchmarks, live system diagnostics, and displays the full OS manual.',
    files: [
      { relativePath: 'src/components/SwarmDiagnosticModule.tsx', role: 'ui' },
      { relativePath: 'src/components/SystemHealthDashboard.tsx', role: 'ui' },
      { relativePath: 'src/components/HardwareDiagnosticUtility.tsx', role: 'ui' },
      { relativePath: 'src/components/SystemManualModal.tsx', role: 'ui' },
      { relativePath: 'src/server/osSupremacyService.ts', role: 'server' }
    ]
  },

  // === INTELLIGENCE & WEB ===
  {
    id: 'browser',
    name: 'Open-Web Browser',
    category: 'Intelligence & Web',
    sourceModuleId: 'browser',
    description: 'Full open-internet web browser with live multi-engine search, proxy/direct modes, and WAF recovery.',
    whatItDoes: 'Handles full web browsing, Bing/Google News open-web search, link rewriting, proxy rendering, and media playback.',
    files: [
      { relativePath: 'src/components/SovereignBrowser.tsx', role: 'ui' },
      { relativePath: 'src/server/sovereignBrowserEngine.ts', role: 'server' }
    ]
  },
  {
    id: 'grounding',
    name: 'Search & Maps Grounding',
    category: 'Intelligence & Web',
    sourceModuleId: 'search',
    description: 'Live web search verification and spatial Google Maps grounding.',
    whatItDoes: 'Verifies live facts with web citations and resolves spatial coordinates, places, and geographic data.',
    files: [
      { relativePath: 'src/components/GroundingModule.tsx', role: 'ui' }
    ]
  },
  {
    id: 'knowledge-graph',
    name: 'Knowledge Graph',
    category: 'Intelligence & Web',
    sourceModuleId: 'knowledge-graph',
    description: 'Interactive autonomous memory topology and session consolidation graph.',
    whatItDoes: 'Visualizes and links persistent concepts, entities, and session knowledge across the orchestrator.',
    files: [
      { relativePath: 'src/components/KnowledgeGraphModule.tsx', role: 'ui' }
    ]
  },
  {
    id: 'osint',
    name: 'OSINT & Attack Surface Deck',
    category: 'Intelligence & Web',
    sourceModuleId: 'osint',
    description: 'Passive external perimeter reconnaissance, DNS/TLS inspection, and report exporter.',
    whatItDoes: 'Inspects DNS records, headers, certificates, and exports structured reconnaissance dossiers.',
    files: [
      { relativePath: 'src/components/OSINTModule.tsx', role: 'ui' },
      { relativePath: 'src/components/OSINTForgeWorkbench.tsx', role: 'ui' }
    ]
  },
  {
    id: 'burner-mail',
    name: 'Burner Mail Matrix',
    category: 'Intelligence & Web',
    sourceModuleId: 'burner-mail',
    description: 'Disposable inbox generator with live incoming mail polling and OTP code extraction.',
    whatItDoes: 'Creates real temporary email addresses, polls incoming verification emails, and extracts confirmation links/OTPs.',
    files: [
      { relativePath: 'src/components/BurnerMailModule.tsx', role: 'ui' },
      { relativePath: 'src/server/burnerMailVault.ts', role: 'server' }
    ]
  },
  {
    id: 'infinite-sim',
    name: 'Infinite SIM & Burner Numbers',
    category: 'Intelligence & Web',
    sourceModuleId: 'infinite-sim',
    description: 'Virtual eSIM LPA QR generator, ICCID manager, and SMS/OTP routing panel.',
    whatItDoes: 'Generates virtual eSIM provisioning profiles and exports downloadable configuration cards.',
    files: [
      { relativePath: 'src/components/InfiniteSimModule.tsx', role: 'ui' }
    ]
  },
  {
    id: 'scratchpad',
    name: 'Infinite Memory Scratchpad',
    category: 'Intelligence & Web',
    sourceModuleId: 'scratchpad',
    description: 'Permanent working memory, directives, and code drafts with zero tokens burned.',
    whatItDoes: 'Stores searchable notes, semantic caches, and draft specifications across sessions.',
    files: [
      { relativePath: 'src/components/ScratchpadModule.tsx', role: 'ui' }
    ]
  },

  // === CLOUD & WORKSPACE ===
  {
    id: 'projects',
    name: 'Unified Projects Orchestrator',
    category: 'Cloud & Workspace',
    sourceModuleId: 'projects',
    description: 'Consolidate repositories, workspace builds, and project pipelines.',
    whatItDoes: 'Tracks multi-repo projects, builds, and unified codebase operations.',
    files: [
      { relativePath: 'src/components/UnifiedProjectsModule.tsx', role: 'ui' }
    ]
  },
  {
    id: 'integrations',
    name: 'Sovereign Integrations Hub',
    category: 'Cloud & Workspace',
    sourceModuleId: 'integrations',
    description: 'Unified live probe and control plane across all connected add-ons and gateways.',
    whatItDoes: 'Monitors integration health, OAuth scopes, and external service bridges.',
    files: [
      { relativePath: 'src/components/SovereignIntegrationsHub.tsx', role: 'ui' },
      { relativePath: 'src/utils/googleWorkspace.ts', role: 'engine' }
    ]
  },
  {
    id: 'drive',
    name: 'Google Drive Storage',
    category: 'Cloud & Workspace',
    sourceModuleId: 'drive',
    description: 'Browse, create, upload, and manage files in Google Drive via OAuth 2.0.',
    whatItDoes: 'Connects directly to your Google Drive to sync documents and workspace files.',
    files: [
      { relativePath: 'src/components/GoogleDriveModule.tsx', role: 'ui' },
      { relativePath: 'src/utils/googleDrive.ts', role: 'engine' }
    ]
  },
  {
    id: 'tasks',
    name: 'Google Tasks Sync',
    category: 'Cloud & Workspace',
    sourceModuleId: 'tasks',
    description: 'Create, organize, and complete Google Tasks and lists with confirmation gates.',
    whatItDoes: 'Synchronizes task lists and action items between the OS and Google Tasks.',
    files: [
      { relativePath: 'src/components/GoogleTasksModule.tsx', role: 'ui' }
    ]
  },
  {
    id: 'github',
    name: 'GitHub Sovereign Matrix',
    category: 'Cloud & Workspace',
    sourceModuleId: 'github',
    description: 'Repository monitor, commit telemetry, and GitHub ingestion controls.',
    whatItDoes: 'Tracks repository status, commits, and endpoint latency across connected GitHub projects.',
    files: [
      { relativePath: 'src/components/GitHubModule.tsx', role: 'ui' }
    ]
  },
  {
    id: 'api-secrets',
    name: 'API Keys & Secrets Vault (AES-256-GCM)',
    category: 'Cloud & Workspace',
    sourceModuleId: 'api-secrets',
    description: 'Encrypted server-side secrets storage and proxy request gateway.',
    whatItDoes: 'Encrypts API credentials using AES-256-GCM on the server and injects them safely into outbound proxy calls.',
    files: [
      { relativePath: 'src/components/ApiSecretsModule.tsx', role: 'ui' },
      { relativePath: 'src/server/internalSecretsHandler.ts', role: 'server' }
    ]
  },
  {
    id: 'vault',
    name: 'Vault Storage & Backup Engine',
    category: 'Cloud & Workspace',
    sourceModuleId: 'vault',
    description: 'Real-time artifacts, dossiers, encrypted memory store, and vault backup tools.',
    whatItDoes: 'Stores, indexes, backs up, and restores generated artifacts and persistent OS records.',
    files: [
      { relativePath: 'src/components/VaultModule.tsx', role: 'ui' },
      { relativePath: 'src/utils/vaultMemoryStore.ts', role: 'engine' },
      { relativePath: 'src/utils/vaultBackup.ts', role: 'engine' }
    ]
  },

  // === CREATIVE & GAMING ===
  {
    id: 'universal-installer',
    name: 'Universal App, Steam & Controller Store',
    category: 'Creative & Gaming',
    sourceModuleId: 'universal-installer',
    description: 'Universal software catalog, Steam/Proton game runner, universal controller deck, and compatibility matrix.',
    whatItDoes: 'Installs desktop/gaming apps, downloads packages from URLs, manages gamepad/touch/KB+M mapping, and pins Steam games to Desktop.',
    files: [
      { relativePath: 'src/components/UniversalInstallerModule.tsx', role: 'ui' },
      { relativePath: 'src/components/UniversalControllerDeck.tsx', role: 'ui' },
      { relativePath: 'src/components/UniversalCompatMatrixPanel.tsx', role: 'ui' },
      { relativePath: 'src/utils/universalInputEngine.ts', role: 'engine' },
      { relativePath: 'src/server/osPackageManager.ts', role: 'server' }
    ]
  },
  {
    id: 'emulator-modder',
    name: 'Emulator & Game Modder Hub',
    category: 'Creative & Gaming',
    sourceModuleId: 'emulator-modder',
    description: 'Multi-system ROM emulator with gamepad support and zero-downtime game modder.',
    whatItDoes: 'Runs game ROMs with controller support and builds/applies real game mod patches on the server.',
    files: [
      { relativePath: 'src/components/UniversalEmulatorModderModule.tsx', role: 'ui' },
      { relativePath: 'src/server/gameModEngine.ts', role: 'server' }
    ]
  },
  {
    id: 'spatial-arena',
    name: 'Spatial Arena 3D Engine (Three.js)',
    category: 'Creative & Gaming',
    sourceModuleId: 'spatial-arena',
    description: 'Full 3D WebGL spatial arena with physics engine, procedural models, materials, and audio synth.',
    whatItDoes: 'Renders interactive 3D worlds, hyperdimensional physics simulations, and procedural 3D scenes.',
    files: [
      { relativePath: 'src/components/three/SpatialArenaModule.tsx', role: 'ui' },
      { relativePath: 'src/components/three/hyperdimensionalPhysicsEngine.ts', role: 'engine' },
      { relativePath: 'src/components/three/unrealNextGenCore.ts', role: 'engine' },
      { relativePath: 'src/components/three/proceduralModels.ts', role: 'engine' },
      { relativePath: 'src/components/three/sceneMaterials.ts', role: 'engine' },
      { relativePath: 'src/components/three/audioSynth.ts', role: 'engine' },
      { relativePath: 'src/components/three/spatialEngineTypes.ts', role: 'config' }
    ]
  },
  {
    id: 'world-start',
    name: 'World Load & Cinematic Start',
    category: 'Creative & Gaming',
    sourceModuleId: 'world-start',
    description: 'Cinematic world loading screen, direct engine launcher, and artifact quick-start.',
    whatItDoes: 'Launches world environments and bootstraps interactive spatial experiences.',
    files: [
      { relativePath: 'src/components/WorldLoadStartScreen.tsx', role: 'ui' }
    ]
  },
  {
    id: 'termux',
    name: 'Android Termux Edge Node',
    category: 'Creative & Gaming',
    sourceModuleId: 'termux',
    description: 'Android Termux hardware bridge for battery, Wi-Fi, RF, TTS, notifications, and edge sync.',
    whatItDoes: 'Connects Android Termux devices to the OS with native hardware hooks and downloadable one-shot installer scripts.',
    files: [
      { relativePath: 'src/components/TermuxEdgeModule.tsx', role: 'ui' }
    ]
  },
  {
    id: 'image',
    name: 'Visual Studio (Image Generation)',
    category: 'Creative & Gaming',
    sourceModuleId: 'image',
    description: 'High-resolution image synthesis, editing, and visual blueprint studio.',
    whatItDoes: 'Generates, transforms, and exports visual assets inside the OS.',
    files: [
      { relativePath: 'src/components/ImageModule.tsx', role: 'ui' }
    ]
  },
  {
    id: 'music',
    name: 'Lyria Music Studio',
    category: 'Creative & Gaming',
    sourceModuleId: 'music',
    description: 'Acoustic waveform synthesis, musical arrangement, and audio swarm playback.',
    whatItDoes: 'Composes and exports synthesized music tracks and real-time audio.',
    files: [
      { relativePath: 'src/components/MusicModule.tsx', role: 'ui' },
      { relativePath: 'src/utils/AudioSwarm.ts', role: 'engine' }
    ]
  },
  {
    id: 'video',
    name: 'Veo Motion & Ultra Video Studio',
    category: 'Creative & Gaming',
    sourceModuleId: 'video',
    description: 'Cinematic video generation and native high-performance media player.',
    whatItDoes: 'Generates motion video clips and plays high-bitrate video streams.',
    files: [
      { relativePath: 'src/components/VideoModule.tsx', role: 'ui' },
      { relativePath: 'src/components/UltraVideoPlayer.tsx', role: 'ui' }
    ]
  },
  {
    id: 'live',
    name: 'Live Voice & Voice Engine',
    category: 'Creative & Gaming',
    sourceModuleId: 'live',
    description: 'Low-latency bidirectional voice conversation modal and speech synthesis engine.',
    whatItDoes: 'Streams real-time voice sessions and manages voice personas and audio output queues.',
    files: [
      { relativePath: 'src/components/LiveVoiceModule.tsx', role: 'ui' },
      { relativePath: 'src/components/GeminiLiveVoiceModal.tsx', role: 'ui' },
      { relativePath: 'src/utils/voiceEngine.ts', role: 'engine' }
    ]
  },
  {
    id: 'transcribe',
    name: 'Acoustic Transcribe Engine',
    category: 'Creative & Gaming',
    sourceModuleId: 'transcribe',
    description: 'Speech-to-text audio transcription and transcript export workbench.',
    whatItDoes: 'Records or uploads audio clips and transcribes them into downloadable text.',
    files: [
      { relativePath: 'src/components/TranscribeModule.tsx', role: 'ui' }
    ]
  },

  // === ENGINES & KERNEL ===
  {
    id: 'os-window-shell',
    name: 'Sovereign Desktop, Window Shell & Navigation',
    category: 'Engines & Kernel',
    description: 'Desktop icon grid, draggable floating/tiled windows, top bar, command palette, and sidebar navigation.',
    whatItDoes: 'Renders the customizable OS desktop, taskbar, window frames, right-click menus, and Ctrl+K launcher.',
    files: [
      { relativePath: 'src/components/SovereignOSWindowFrame.tsx', role: 'ui' },
      { relativePath: 'src/components/SovereignOSBar.tsx', role: 'ui' },
      { relativePath: 'src/components/Navigation.tsx', role: 'ui' },
      { relativePath: 'src/components/Header.tsx', role: 'ui' },
      { relativePath: 'src/components/CommandPalette.tsx', role: 'ui' }
    ]
  },
  {
    id: 'app-orchestrator-shell',
    name: 'Root Application & Orchestrator Hook (App.tsx)',
    category: 'Engines & Kernel',
    description: 'Root React application router, window state manager, global types, and orchestrator state hook.',
    whatItDoes: 'Boots the entire OS shell, mounts all modules, coordinates global state, and manages taskbar pinning.',
    files: [
      { relativePath: 'src/App.tsx', role: 'ui' },
      { relativePath: 'src/hooks/useOrchestrator.ts', role: 'engine' },
      { relativePath: 'src/types/index.ts', role: 'config' },
      { relativePath: 'src/main.tsx', role: 'config' }
    ]
  },
  {
    id: 'quantum-kernel-janus',
    name: 'Quantum Kernel, Janus Gate & Safety Substrate',
    category: 'Engines & Kernel',
    description: 'Core client/server quantum kernel, Janus execution gate, proxy loop wheel, and database layer.',
    whatItDoes: 'Provides consensus memory, safety checks, proxy rotation, and local SQLite/JSON persistence.',
    files: [
      { relativePath: 'src/utils/sovereignQuantumKernel.ts', role: 'engine' },
      { relativePath: 'src/utils/janusGate.ts', role: 'engine' },
      { relativePath: 'src/utils/janusUtils.ts', role: 'engine' },
      { relativePath: 'src/utils/safety.ts', role: 'engine' },
      { relativePath: 'src/server/kernelDb.ts', role: 'server' },
      { relativePath: 'src/server/proxyLoopWheel.ts', role: 'server' }
    ]
  },
  {
    id: 'knowledge-compendiums',
    name: 'Orchestrator Knowledge Compendiums & Data',
    category: 'Engines & Kernel',
    description: 'Built-in master knowledge bases, coding references, and sovereign compendiums.',
    whatItDoes: 'Supplies offline reference knowledge and architectural context to orchestrator agents.',
    files: [
      { relativePath: 'src/data/orchestratorMasterKnowledge.ts', role: 'config' },
      { relativePath: 'src/data/codingKnowledgeBase.ts', role: 'config' },
      { relativePath: 'src/utils/sovereignCompendium.ts', role: 'engine' },
      { relativePath: 'src/utils/quantumMonolithCompendium.ts', role: 'engine' }
    ]
  },
  {
    id: 'core-express-server',
    name: 'Core Express Server Entry (server.ts)',
    category: 'Engines & Kernel',
    description: 'Master Node.js/Express backend server mounting all API routes and Vite middleware.',
    whatItDoes: 'Serves the entire OS frontend and exposes every backend API endpoint on port 3000.',
    files: [
      { relativePath: 'server.ts', role: 'server' }
    ]
  }
];

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(BACKUPS_ROOT)) fs.mkdirSync(BACKUPS_ROOT, { recursive: true });
}

function sha256Text(content: string | Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function normalizeRelPath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\/+/, '');
}

function resolveSafeProjectFile(relativePath: string): string {
  const clean = normalizeRelPath(relativePath);
  if (clean.includes('..') || path.isAbsolute(clean)) {
    throw new Error(`Unsafe path rejected: ${relativePath}`);
  }
  const abs = path.resolve(PROJECT_ROOT, clean);
  if (!abs.startsWith(PROJECT_ROOT + path.sep) && abs !== path.resolve(PROJECT_ROOT, 'server.ts')) {
    throw new Error(`Path escapes project root: ${relativePath}`);
  }
  return abs;
}

function statModuleFile(relativePath: string, role: ModuleFileRecord['role']): ModuleFileRecord {
  const clean = normalizeRelPath(relativePath);
  const abs = resolveSafeProjectFile(clean);
  if (!fs.existsSync(abs)) {
    return {
      relativePath: clean,
      role,
      exists: false,
      sizeBytes: 0,
      lineCount: 0,
      sha256: '',
      modifiedAt: ''
    };
  }
  const stat = fs.statSync(abs);
  const raw = fs.readFileSync(abs, 'utf8');
  return {
    relativePath: clean,
    role,
    exists: true,
    sizeBytes: stat.size,
    lineCount: raw.split('\n').length,
    sha256: sha256Text(raw),
    modifiedAt: stat.mtime.toISOString()
  };
}

function countBackupsForModule(moduleId: string): number {
  const dir = path.join(BACKUPS_ROOT, moduleId);
  if (!fs.existsSync(dir)) return 0;
  try {
    return fs.readdirSync(dir).filter((name) => {
      const full = path.join(dir, name);
      return fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, 'backup-meta.json'));
    }).length;
  } catch {
    return 0;
  }
}

export function appendTransferHistory(entry: Omit<TransferHistoryEntry, 'id' | 'timestamp'>): TransferHistoryEntry {
  ensureDirs();
  const full: TransferHistoryEntry = {
    id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...entry
  };
  let list: TransferHistoryEntry[] = [];
  if (fs.existsSync(HISTORY_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
      if (Array.isArray(parsed)) list = parsed;
    } catch {
      list = [];
    }
  }
  list.unshift(full);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(list.slice(0, 200), null, 2), 'utf8');
  return full;
}

export function getTransferHistory(limit = 80): TransferHistoryEntry[] {
  ensureDirs();
  if (!fs.existsSync(HISTORY_FILE)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, limit);
  } catch {
    return [];
  }
}

function scanSourceFilesRecursive(dirAbs: string, relPrefix: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dirAbs)) return out;
  for (const entry of fs.readdirSync(dirAbs, { withFileTypes: true })) {
    const nextRel = `${relPrefix}/${entry.name}`;
    const nextAbs = path.join(dirAbs, entry.name);
    if (entry.isDirectory()) {
      out.push(...scanSourceFilesRecursive(nextAbs, nextRel));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(nextRel);
    }
  }
  return out.sort();
}

function buildAllModuleDefs(): CuratedModuleDef[] {
  const defs: CuratedModuleDef[] = [...CURATED_MODULES];
  const coveredFiles = new Set<string>();
  for (const d of defs) {
    for (const f of d.files) coveredFiles.add(normalizeRelPath(f.relativePath));
  }

  // Dynamically expose EVERY remaining .ts/.tsx file under src/ (components, server, utils, hooks, data, constants, firebase)
  const allSrcFiles = scanSourceFilesRecursive(path.resolve(PROJECT_ROOT, 'src'), 'src');
  for (const rel of allSrcFiles) {
    if (coveredFiles.has(rel)) continue;
    const fileName = path.basename(rel);
    const base = fileName.replace(/\.(tsx|ts)$/, '');
    const dirTag = rel.split('/')[1] || 'src';
    const slug = `${dirTag}-${base
      .replace(/Module$/, '')
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .toLowerCase()}`;
    const friendly = base
      .replace(/Module$/, '')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2');
    const role: ModuleFileRecord['role'] =
      dirTag === 'server'
        ? 'server'
        : dirTag === 'components'
        ? 'ui'
        : dirTag === 'utils' || dirTag === 'hooks'
        ? 'engine'
        : 'config';

    defs.push({
      id: slug,
      name: `${friendly} (${dirTag})`,
      category: 'Engines & Kernel',
      description: `Standalone orchestrator ${role} file (${rel}) ready for isolated export, testing, and hot replacement.`,
      whatItDoes: `Provides the ${friendly} subsystem from ${rel}.`,
      files: [{ relativePath: rel, role }]
    });
    coveredFiles.add(rel);
  }

  return defs;
}

export function listOrchestratorModules(): OrchestratorModuleSpec[] {
  ensureDirs();
  const defs = buildAllModuleDefs();
  return defs.map((def) => {
    const files = def.files.map((f) => statModuleFile(f.relativePath, f.role));
    const existing = files.filter((f) => f.exists);
    const totalBytes = existing.reduce((sum, f) => sum + f.sizeBytes, 0);
    const totalLines = existing.reduce((sum, f) => sum + f.lineCount, 0);
    const bundleHash = sha256Text(existing.map((f) => `${f.relativePath}:${f.sha256}`).join('|')).slice(0, 16);
    const lastModifiedAt =
      existing
        .map((f) => f.modifiedAt)
        .filter(Boolean)
        .sort()
        .pop() || '';
    return {
      id: def.id,
      name: def.name,
      category: def.category,
      description: def.description,
      whatItDoes: def.whatItDoes,
      sourceModuleId: def.sourceModuleId,
      files,
      totalBytes,
      totalLines,
      bundleHash,
      backupCount: countBackupsForModule(def.id),
      lastModifiedAt
    };
  });
}

export function getOrchestratorModule(moduleId: string): OrchestratorModuleSpec | null {
  return listOrchestratorModules().find((m) => m.id === moduleId) || null;
}

export function getModuleSourcePayload(moduleId: string): {
  moduleId: string;
  moduleName: string;
  files: Array<{ relativePath: string; role: string; sha256: string; content: string }>;
} {
  const mod = getOrchestratorModule(moduleId);
  if (!mod) throw new Error(`Module not found: ${moduleId}`);
  const files: Array<{ relativePath: string; role: string; sha256: string; content: string }> = [];
  for (const f of mod.files) {
    if (!f.exists) continue;
    const abs = resolveSafeProjectFile(f.relativePath);
    const content = fs.readFileSync(abs, 'utf8');
    files.push({
      relativePath: f.relativePath,
      role: f.role,
      sha256: sha256Text(content).slice(0, 16),
      content
    });
  }
  return { moduleId: mod.id, moduleName: mod.name, files };
}

export function buildModuleTestBundleJson(moduleId: string): {
  filename: string;
  jsonString: string;
  sizeBytes: number;
  sha256: string;
} {
  const mod = getOrchestratorModule(moduleId);
  if (!mod) throw new Error(`Module not found: ${moduleId}`);

  const fileContents: Record<string, { role: string; sha256: string; content: string }> = {};
  for (const f of mod.files) {
    if (!f.exists) continue;
    const abs = resolveSafeProjectFile(f.relativePath);
    const content = fs.readFileSync(abs, 'utf8');
    fileContents[f.relativePath] = {
      role: f.role,
      sha256: sha256Text(content),
      content
    };
  }

  const bundle = {
    schema: 'lysander-orchestrator-module-v1',
    moduleId: mod.id,
    moduleName: mod.name,
    category: mod.category,
    exportedAt: new Date().toISOString(),
    bundleHash: mod.bundleHash,
    instructions:
      'Edit any source file under "files[path].content" during external testing, then upload this .lysander-module.json file back into Downloads, Uploads & Module Lab to validate syntax, preview diff, snapshot a backup, and replace it into the live OS.',
    files: fileContents
  };

  const jsonString = JSON.stringify(bundle, null, 2);
  const filename = `${mod.id}.lysander-module.json`;
  const sizeBytes = Buffer.byteLength(jsonString, 'utf8');
  const sha256 = sha256Text(jsonString);

  appendTransferHistory({
    direction: 'download',
    category: 'module',
    targetId: mod.id,
    label: `${mod.name} (Test Bundle JSON)`,
    detail: `Exported ${Object.keys(fileContents).length} source file(s) as ${filename}`,
    sizeBytes,
    sha256: sha256.slice(0, 16),
    status: 'ok'
  });

  return { filename, jsonString, sizeBytes, sha256 };
}

export async function buildModuleZipArchive(moduleId: string): Promise<{
  filename: string;
  bytes: Uint8Array;
  sha256: string;
}> {
  const mod = getOrchestratorModule(moduleId);
  if (!mod) throw new Error(`Module not found: ${moduleId}`);

  const zip = new ZipArchiveBuilder();
  const manifestFiles: Array<{ relativePath: string; role: string; sha256: string; sizeBytes: number }> = [];

  for (const f of mod.files) {
    if (!f.exists) continue;
    const abs = resolveSafeProjectFile(f.relativePath);
    const content = fs.readFileSync(abs, 'utf8');
    zip.addTextFile(f.relativePath, content);
    manifestFiles.push({
      relativePath: f.relativePath,
      role: f.role,
      sha256: sha256Text(content),
      sizeBytes: Buffer.byteLength(content, 'utf8')
    });
  }

  const manifest = {
    schema: 'lysander-orchestrator-module-v1',
    moduleId: mod.id,
    moduleName: mod.name,
    exportedAt: new Date().toISOString(),
    files: manifestFiles
  };
  zip.addTextFile('module-manifest.json', JSON.stringify(manifest, null, 2));
  zip.addTextFile(
    'README_TESTING.txt',
    [
      `Lysander Sovereign OS — Individual Module Test Package`,
      `Module: ${mod.name} (${mod.id})`,
      `Exported: ${manifest.exportedAt}`,
      ``,
      `Files included:`,
      ...manifestFiles.map(
        (f) => `  - ${f.relativePath} (${f.role}, ${f.sizeBytes} bytes, sha256:${f.sha256.slice(0, 12)})`
      ),
      ``,
      `How to re-upload edited versions into the OS:`,
      `  1. Edit any included .ts/.tsx file locally and test it.`,
      `  2. Open "Downloads & Uploads" -> "Orchestrator Module Lab" (or "Universal Uploader").`,
      `  3. Upload the edited .ts/.tsx file directly (or upload a .lysander-module.json bundle).`,
      `  4. Review the automatic TypeScript syntax check & line diff, then click "Backup & Replace in OS".`,
      `  5. A timestamped backup is automatically saved so you can roll back in one click at any time.`
    ].join('\n')
  );

  const bytes = await zip.buildUint8Array();
  const filename = `${mod.id}-module-package.zip`;
  const sha256 = sha256Text(Buffer.from(bytes));

  appendTransferHistory({
    direction: 'download',
    category: 'module',
    targetId: mod.id,
    label: `${mod.name} (ZIP Package)`,
    detail: `Exported ${manifestFiles.length} source file(s) + manifest as ${filename}`,
    sizeBytes: bytes.byteLength,
    sha256: sha256.slice(0, 16),
    status: 'ok'
  });

  return { filename, bytes, sha256 };
}

export function readSingleModuleFile(
  moduleId: string,
  requestedPath: string
): {
  filename: string;
  relativePath: string;
  content: string;
} {
  const mod = getOrchestratorModule(moduleId);
  if (!mod) throw new Error(`Module not found: ${moduleId}`);
  const norm = normalizeRelPath(requestedPath);
  const owned = mod.files.find((f) => f.relativePath === norm && f.exists);
  if (!owned) throw new Error(`File "${norm}" does not belong to module "${moduleId}"`);

  const abs = resolveSafeProjectFile(owned.relativePath);
  const content = fs.readFileSync(abs, 'utf8');
  const filename = path.basename(owned.relativePath);

  appendTransferHistory({
    direction: 'download',
    category: 'module',
    targetId: mod.id,
    label: `${filename} (Raw Source)`,
    detail: `Downloaded single source file ${owned.relativePath}`,
    sizeBytes: Buffer.byteLength(content, 'utf8'),
    sha256: sha256Text(content).slice(0, 16),
    status: 'ok'
  });

  return { filename, relativePath: owned.relativePath, content };
}

function computeLineDiffStats(oldText: string, newText: string): { addedLines: number; removedLines: number } {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const oldCounts = new Map<string, number>();
  for (const line of oldLines) {
    oldCounts.set(line, (oldCounts.get(line) || 0) + 1);
  }
  let addedLines = 0;
  for (const line of newLines) {
    const count = oldCounts.get(line) || 0;
    if (count > 0) {
      oldCounts.set(line, count - 1);
    } else {
      addedLines++;
    }
  }
  let removedLines = 0;
  for (const rem of oldCounts.values()) {
    removedLines += rem;
  }
  return { addedLines, removedLines };
}

async function validateTypeScriptSyntax(
  relativePath: string,
  content: string
): Promise<{ valid: boolean; error?: string }> {
  const ext = path.extname(relativePath).toLowerCase();
  if (ext !== '.ts' && ext !== '.tsx' && ext !== '.js' && ext !== '.jsx') {
    return { valid: true };
  }
  const loader: esbuild.Loader =
    ext === '.tsx' ? 'tsx' : ext === '.ts' ? 'ts' : ext === '.jsx' ? 'jsx' : 'js';
  try {
    await esbuild.transform(content, {
      loader,
      sourcefile: relativePath,
      target: 'es2022'
    });
    return { valid: true };
  } catch (err: any) {
    const firstErr = Array.isArray(err?.errors) && err.errors[0];
    if (firstErr) {
      const loc = firstErr.location
        ? `Line ${firstErr.location.line}, Col ${firstErr.location.column}: `
        : '';
      return { valid: false, error: `${loc}${firstErr.text}` };
    }
    return { valid: false, error: err?.message || 'Syntax validation failed' };
  }
}

export async function inspectModuleReplacement(
  moduleId: string,
  incomingFiles: ModuleUploadFileInput[]
): Promise<ModuleInspectResult> {
  const mod = getOrchestratorModule(moduleId);
  if (!mod) throw new Error(`Module not found: ${moduleId}`);
  if (!Array.isArray(incomingFiles) || incomingFiles.length === 0) {
    throw new Error('No source files supplied for inspection.');
  }

  const allowedSet = new Set(mod.files.map((f) => f.relativePath));
  const results: ModuleInspectFileResult[] = [];

  for (const item of incomingFiles) {
    const norm = normalizeRelPath(item.relativePath || '');
    const allowed = allowedSet.has(norm);
    const content = typeof item.content === 'string' ? item.content : '';
    let oldText = '';
    if (allowed) {
      const abs = resolveSafeProjectFile(norm);
      if (fs.existsSync(abs)) {
        oldText = fs.readFileSync(abs, 'utf8');
      }
    }
    const syntax = allowed
      ? await validateTypeScriptSyntax(norm, content)
      : { valid: false, error: `File "${norm}" is not owned by module "${moduleId}".` };

    const oldSha = sha256Text(oldText);
    const newSha = sha256Text(content);
    const { addedLines, removedLines } = computeLineDiffStats(oldText, content);

    results.push({
      relativePath: norm,
      allowed,
      syntaxValid: syntax.valid,
      syntaxError: syntax.error,
      changed: oldSha !== newSha,
      oldBytes: Buffer.byteLength(oldText, 'utf8'),
      newBytes: Buffer.byteLength(content, 'utf8'),
      oldLines: oldText ? oldText.split('\n').length : 0,
      newLines: content ? content.split('\n').length : 0,
      addedLines,
      removedLines,
      oldSha256: oldSha.slice(0, 16),
      newSha256: newSha.slice(0, 16)
    });
  }

  return {
    moduleId: mod.id,
    moduleName: mod.name,
    allAllowed: results.every((r) => r.allowed),
    allSyntaxValid: results.every((r) => r.syntaxValid),
    hasAnyChange: results.some((r) => r.changed),
    files: results
  };
}

export async function replaceOrchestratorModule(
  moduleId: string,
  incomingFiles: ModuleUploadFileInput[],
  reason = 'Edited module upload'
): Promise<{
  success: boolean;
  moduleId: string;
  moduleName: string;
  backupId: string;
  replacedFiles: string[];
  serverCodeModified: boolean;
  inspection: ModuleInspectResult;
}> {
  ensureDirs();
  const inspection = await inspectModuleReplacement(moduleId, incomingFiles);
  if (!inspection.allAllowed) {
    throw new Error('Upload contains files outside this module boundary and was rejected.');
  }
  if (!inspection.allSyntaxValid) {
    const firstBad = inspection.files.find((f) => !f.syntaxValid);
    throw new Error(
      `Syntax check failed in ${firstBad?.relativePath || 'module'}: ${firstBad?.syntaxError || 'invalid syntax'}`
    );
  }

  const mod = getOrchestratorModule(moduleId);
  if (!mod) throw new Error(`Module not found: ${moduleId}`);

  // 1. Save automatic backup snapshot before writing anything
  const backupId = `bkp-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const backupDir = path.join(BACKUPS_ROOT, mod.id, backupId);
  fs.mkdirSync(backupDir, { recursive: true });

  const backupMetaFiles: ModuleBackupRecord['files'] = [];
  for (const item of incomingFiles) {
    const norm = normalizeRelPath(item.relativePath);
    const abs = resolveSafeProjectFile(norm);
    if (fs.existsSync(abs)) {
      const prevContent = fs.readFileSync(abs, 'utf8');
      const targetBackupPath = path.join(backupDir, norm);
      fs.mkdirSync(path.dirname(targetBackupPath), { recursive: true });
      fs.writeFileSync(targetBackupPath, prevContent, 'utf8');
      backupMetaFiles.push({
        relativePath: norm,
        sizeBytes: Buffer.byteLength(prevContent, 'utf8'),
        sha256: sha256Text(prevContent).slice(0, 16)
      });
    }
  }

  const backupMeta: ModuleBackupRecord = {
    backupId,
    moduleId: mod.id,
    moduleName: mod.name,
    createdAt: new Date().toISOString(),
    reason,
    files: backupMetaFiles
  };
  fs.writeFileSync(path.join(backupDir, 'backup-meta.json'), JSON.stringify(backupMeta, null, 2), 'utf8');

  // 2. Write validated files atomically
  const replacedFiles: string[] = [];
  let serverCodeModified = false;
  let totalBytes = 0;

  for (const item of incomingFiles) {
    const norm = normalizeRelPath(item.relativePath);
    const abs = resolveSafeProjectFile(norm);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    const tmpPath = `${abs}.tmp-${Date.now()}`;
    fs.writeFileSync(tmpPath, item.content, 'utf8');
    fs.renameSync(tmpPath, abs);
    replacedFiles.push(norm);
    totalBytes += Buffer.byteLength(item.content, 'utf8');
    if (norm.startsWith('src/server/') || norm === 'server.ts') {
      serverCodeModified = true;
    }
  }

  appendTransferHistory({
    direction: 'replace',
    category: 'module',
    targetId: mod.id,
    label: `${mod.name} (Hot-Replaced)`,
    detail: `Replaced ${replacedFiles.join(', ')} · Backup ${backupId} saved`,
    sizeBytes: totalBytes,
    status: 'ok'
  });

  return {
    success: true,
    moduleId: mod.id,
    moduleName: mod.name,
    backupId,
    replacedFiles,
    serverCodeModified,
    inspection
  };
}

export function listModuleBackups(moduleId?: string): ModuleBackupRecord[] {
  ensureDirs();
  const out: ModuleBackupRecord[] = [];
  if (!fs.existsSync(BACKUPS_ROOT)) return out;

  const moduleDirs = moduleId
    ? [moduleId]
    : fs.readdirSync(BACKUPS_ROOT).filter((d) => fs.statSync(path.join(BACKUPS_ROOT, d)).isDirectory());

  for (const mId of moduleDirs) {
    const modDir = path.join(BACKUPS_ROOT, mId);
    if (!fs.existsSync(modDir)) continue;
    for (const bId of fs.readdirSync(modDir)) {
      const metaPath = path.join(modDir, bId, 'backup-meta.json');
      if (!fs.existsSync(metaPath)) continue;
      try {
        const parsed = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as ModuleBackupRecord;
        out.push(parsed);
      } catch {
        // skip corrupted meta
      }
    }
  }

  return out.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export function rollbackModuleBackup(
  moduleId: string,
  backupId: string
): {
  success: boolean;
  moduleId: string;
  backupId: string;
  restoredFiles: string[];
} {
  ensureDirs();
  if (moduleId.includes('..') || backupId.includes('..')) {
    throw new Error('Invalid rollback parameters.');
  }
  const backupDir = path.join(BACKUPS_ROOT, moduleId, backupId);
  const metaPath = path.join(backupDir, 'backup-meta.json');
  if (!fs.existsSync(metaPath)) {
    throw new Error(`Backup ${backupId} not found for module ${moduleId}.`);
  }
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as ModuleBackupRecord;
  const restoredFiles: string[] = [];

  for (const f of meta.files) {
    const srcPath = path.join(backupDir, f.relativePath);
    if (!fs.existsSync(srcPath)) continue;
    const destPath = resolveSafeProjectFile(f.relativePath);
    const content = fs.readFileSync(srcPath, 'utf8');
    fs.writeFileSync(destPath, content, 'utf8');
    restoredFiles.push(f.relativePath);
  }

  appendTransferHistory({
    direction: 'rollback',
    category: 'module',
    targetId: moduleId,
    label: `${meta.moduleName || moduleId} (Rolled Back)`,
    detail: `Restored ${restoredFiles.join(', ')} from snapshot ${backupId}`,
    status: 'ok'
  });

  return {
    success: true,
    moduleId,
    backupId,
    restoredFiles
  };
}

export function getUnifiedDownloadsCatalog(): UnifiedDownloadItem[] {
  const exists = (...parts: string[]) => fs.existsSync(path.resolve(PROJECT_ROOT, ...parts));
  const apkExists =
    exists('data', 'build-apk-temp', 'aurelius-sovereign-v1.apk') ||
    exists('build-apk-temp', 'aurelius-sovereign-v1.apk');
  const htmlExists = exists('dist', 'aurelius-standalone-app.html') || exists('dist', 'index.html');
  const cjsExists =
    exists('dist', 'aurelius-standalone.cjs') ||
    exists('dist', 'aurelius-app-bundle.cjs') ||
    exists('bin', 'aurelius.cjs');

  return [
    {
      id: 'host-bridge-windows',
      title: 'Windows Host Filesystem Bridge (.bat)',
      sourceSection: 'OS File Manager',
      sourceModuleId: 'file-manager',
      category: 'Host Bridges & Files',
      format: 'BAT Script',
      whatItDoes: 'Connects your local Windows PC drives and Downloads folder directly to the OS File Manager over a local authenticated bridge.',
      downloadUrl: '/api/os/host-bridge/download?format=windows',
      downloadFilename: 'lysander-host-bridge-windows.bat',
      method: 'GET',
      available: true,
      sizeHint: '~14 KB'
    },
    {
      id: 'host-bridge-macos',
      title: 'macOS Host Filesystem Bridge (.command)',
      sourceSection: 'OS File Manager',
      sourceModuleId: 'file-manager',
      category: 'Host Bridges & Files',
      format: 'macOS Command',
      whatItDoes: 'Double-click launcher for macOS that exposes local Finder directories and native Downloads to Lysander Sovereign OS.',
      downloadUrl: '/api/os/host-bridge/download?format=macos',
      downloadFilename: 'lysander-host-bridge-macos.command',
      method: 'GET',
      available: true,
      sizeHint: '~14 KB'
    },
    {
      id: 'host-bridge-linux',
      title: 'Linux Host Filesystem Bridge (.sh)',
      sourceSection: 'OS File Manager',
      sourceModuleId: 'file-manager',
      category: 'Host Bridges & Files',
      format: 'Shell Script',
      whatItDoes: 'Starts the local filesystem bridge on Linux desktops or servers so you can browse, upload, and launch native binaries.',
      downloadUrl: '/api/os/host-bridge/download?format=linux',
      downloadFilename: 'lysander-host-bridge-linux.sh',
      method: 'GET',
      available: true,
      sizeHint: '~14 KB'
    },
    {
      id: 'host-bridge-node',
      title: 'Cross-Platform Node Bridge Daemon (.mjs)',
      sourceSection: 'OS File Manager',
      sourceModuleId: 'file-manager',
      category: 'Host Bridges & Files',
      format: 'Node ESM',
      whatItDoes: 'Standalone zero-dependency Node.js bridge daemon runnable via "node lysander-host-bridge.mjs" on any OS.',
      downloadUrl: '/api/os/host-bridge/download?format=mjs',
      downloadFilename: 'lysander-host-bridge.mjs',
      method: 'GET',
      available: true,
      sizeHint: '~13 KB'
    },
    {
      id: 'sovereign-sync-tarball',
      title: 'Full 1:1 Orchestrator Sync Archive (.tar.gz)',
      sourceSection: 'APK & Bundle Packager',
      sourceModuleId: 'packager',
      category: 'OS Packages & Installers',
      format: 'TAR.GZ Archive',
      whatItDoes: 'Packages the complete 1:1 Lysander Orchestrator runtime for offline backup, localhost migration, or Termux deployment.',
      downloadUrl: '/api/sovereign/sync-package',
      downloadFilename: 'aurelius-orchestrator-1to1.tar.gz',
      method: 'GET',
      available: true,
      sizeHint: 'Live Stream'
    },
    {
      id: 'sovereign-turnkey-archive',
      title: 'Full Source Code Workspace Archive (.tar.gz)',
      sourceSection: 'APK & Bundle Packager',
      sourceModuleId: 'packager',
      category: 'OS Packages & Installers',
      format: 'TAR.GZ Source',
      whatItDoes: 'Streams a fresh compressed snapshot of the entire project workspace (excluding node_modules and git history).',
      downloadUrl: '/api/sovereign/download-archive',
      downloadFilename: 'aurelius-sovereign-matrix-v7.0.tar.gz',
      method: 'GET',
      available: true,
      sizeHint: 'Live Tarball'
    },
    {
      id: 'single-file-html',
      title: 'Standalone Single-File Web App (.html)',
      sourceSection: 'APK & Bundle Packager',
      sourceModuleId: 'packager',
      category: 'OS Packages & Installers',
      format: 'HTML Bundle',
      whatItDoes: 'Compiled client entry HTML generated by Vite build / Single-File Packager for offline local preview.',
      downloadUrl: '/api/package/single-file-download?format=html',
      downloadFilename: 'aurelius-standalone-app.html',
      method: 'GET',
      available: htmlExists,
      sizeHint: htmlExists ? 'Ready' : 'Build in Packager'
    },
    {
      id: 'single-file-cjs',
      title: 'Standalone Node CLI / Runtime Bundle (.cjs)',
      sourceSection: 'APK & Bundle Packager',
      sourceModuleId: 'packager',
      category: 'OS Packages & Installers',
      format: 'CommonJS CLI',
      whatItDoes: 'Executable CommonJS CLI bundle for launching the orchestrator directly from terminal environments.',
      downloadUrl: '/api/package/single-file-download?format=cjs',
      downloadFilename: 'aurelius-standalone.cjs',
      method: 'GET',
      available: cjsExists,
      sizeHint: cjsExists ? 'Ready' : 'Build in Packager'
    },
    {
      id: 'android-master-apk',
      title: 'Android Master APK Package (.apk)',
      sourceSection: 'APK & Bundle Packager',
      sourceModuleId: 'packager',
      category: 'Edge & Mobile',
      format: 'Android APK',
      whatItDoes: 'Compiled Android installation binary for sideloading the Sovereign OS directly onto Android phones and tablets.',
      downloadUrl: '/api/package/download?file=aurelius-sovereign-v1.apk',
      downloadFilename: 'aurelius-sovereign-v1.apk',
      method: 'GET',
      available: apkExists,
      sizeHint: apkExists ? 'Compiled' : 'Compile in Packager'
    },
    {
      id: 'termux-oneshot-installer',
      title: 'Termux One-Shot Edge Installer (.sh)',
      sourceSection: 'Android Termux Edge',
      sourceModuleId: 'termux',
      category: 'Edge & Mobile',
      format: 'Bash Script',
      whatItDoes: 'Installs Node, Git, and the Lysander Edge server automatically inside Android Termux with hardware API hooks.',
      downloadUrl: '/api/termux/installer-script',
      downloadFilename: 'termux_one_shot_installer.sh',
      method: 'GET',
      available: true,
      sizeHint: 'Live Script'
    },
    {
      id: 'oneshot-bootloader',
      title: 'One-Shot Universal Bootloader (.sh)',
      sourceSection: 'APK & Bundle Packager',
      sourceModuleId: 'packager',
      category: 'Edge & Mobile',
      format: 'Bash Script',
      whatItDoes: 'Downloads, extracts, installs dependencies, and boots the orchestrator automatically on Linux/Termux hosts.',
      downloadUrl: '/one_shot_bootloader.sh',
      downloadFilename: 'one_shot_bootloader.sh',
      method: 'GET',
      available: exists('public', 'one_shot_bootloader.sh') || exists('one_shot_bootloader.sh'),
      sizeHint: 'Shell Script'
    },
    {
      id: 'termux-apk-builder',
      title: 'Termux On-Device APK Builder Script (.sh)',
      sourceSection: 'APK & Bundle Packager',
      sourceModuleId: 'packager',
      category: 'Edge & Mobile',
      format: 'Bash Script',
      whatItDoes: 'Compiles and signs an Android APK locally on an Android device running Termux without needing Android Studio.',
      downloadUrl: '/api/package/termux-apk-builder',
      downloadFilename: 'build-apk-termux.sh',
      method: 'GET',
      available: exists('scripts', 'build-apk-termux.sh'),
      sizeHint: 'Build Script'
    },
    {
      id: 'model-lyrailius-omega',
      title: 'Lyrailius Omega Sovereign MoE (Q4_K_M .gguf)',
      sourceSection: 'Model Weights Bridge',
      sourceModuleId: 'download-models',
      category: 'AI Model Weights',
      format: 'GGUF Weights',
      whatItDoes: 'Streams flagship 32B reasoning GGUF weights through the internal OS proxy for offline Ollama / llama.cpp execution.',
      downloadUrl: '/api/models/download/Lyrailius-Omega-Ultimate-Sovereign-MoE',
      downloadFilename: 'lyrailius_omega_zenith_moe.gguf',
      curlCommand: 'curl -L -o lyrailius_omega_zenith_moe.gguf "{{ORIGIN}}/api/models/download/Lyrailius-Omega-Ultimate-Sovereign-MoE"',
      method: 'GET',
      available: true,
      sizeHint: '~19.8 GB'
    },
    {
      id: 'model-qwen-coder-32b',
      title: 'Qwen 2.5 Coder 32B Instruct (Q4_K_M .gguf)',
      sourceSection: 'Model Weights Bridge',
      sourceModuleId: 'download-models',
      category: 'AI Model Weights',
      format: 'GGUF Weights',
      whatItDoes: 'Dedicated local software engineering and code-synthesis model weights streamed via the OS model proxy.',
      downloadUrl: '/api/models/download/Qwen2.5-Coder-32B-Instruct',
      downloadFilename: 'qwen_coder_32b.gguf',
      curlCommand: 'curl -L -o qwen_coder_32b.gguf "{{ORIGIN}}/api/models/download/Qwen2.5-Coder-32B-Instruct"',
      method: 'GET',
      available: true,
      sizeHint: '~19.9 GB'
    },
    {
      id: 'model-llama-33-70b',
      title: 'Llama 3.3 70B Instruct (Q4_K_M .gguf)',
      sourceSection: 'Model Weights Bridge',
      sourceModuleId: 'download-models',
      category: 'AI Model Weights',
      format: 'GGUF Weights',
      whatItDoes: 'High-capacity general reasoning local LLM weights proxied directly from HuggingFace through the OS server.',
      downloadUrl: '/api/models/download/Llama-3.3-70B-Instruct-GGUF',
      downloadFilename: 'llama_3.3_70b.gguf',
      curlCommand: 'curl -L -o llama_3.3_70b.gguf "{{ORIGIN}}/api/models/download/Llama-3.3-70B-Instruct-GGUF"',
      method: 'GET',
      available: true,
      sizeHint: '~42.5 GB'
    },
    {
      id: 'model-deepseek-8b',
      title: 'DeepSeek-R1 Distill Llama 8B (Q4_K_M .gguf)',
      sourceSection: 'Model Weights Bridge',
      sourceModuleId: 'download-models',
      category: 'AI Model Weights',
      format: 'GGUF Weights',
      whatItDoes: 'Lightweight edge-friendly reasoning model ideal for laptops, phones, and fast local testing.',
      downloadUrl: '/api/models/download/DeepSeek-R1-Distill-Llama-8B-GGUF',
      downloadFilename: 'deepseek_r1_llama_8b.gguf',
      curlCommand: 'curl -L -o deepseek_r1_llama_8b.gguf "{{ORIGIN}}/api/models/download/DeepSeek-R1-Distill-Llama-8B-GGUF"',
      method: 'GET',
      available: true,
      sizeHint: '~4.9 GB'
    },
    {
      id: 'model-qwen-coder-7b',
      title: 'Qwen 2.5 Coder 7B Instruct (Q4_K_M .gguf)',
      sourceSection: 'Model Weights Bridge',
      sourceModuleId: 'download-models',
      category: 'AI Model Weights',
      format: 'GGUF Weights',
      whatItDoes: 'Fast local coding model suitable for 8GB RAM laptops and mobile Termux deployments.',
      downloadUrl: '/api/models/download/Qwen2.5-Coder-7B-Instruct-GGUF',
      downloadFilename: 'qwen_coder_7b.gguf',
      curlCommand: 'curl -L -o qwen_coder_7b.gguf "{{ORIGIN}}/api/models/download/Qwen2.5-Coder-7B-Instruct-GGUF"',
      method: 'GET',
      available: true,
      sizeHint: '~4.7 GB'
    },
    {
      id: 'os-customization-profile',
      title: 'Full OS Customization & Desktop Profile (.json)',
      sourceSection: 'OS Settings',
      sourceModuleId: 'os-settings',
      category: 'Core Configs & Profiles',
      format: 'JSON Profile',
      whatItDoes: 'Exports all desktop icons, custom shortcuts, Steam pins, wallpapers, theme colors, and live CSS dotfiles for instant restore.',
      method: 'CLIENT_EXPORT',
      clientAction: 'export-os-profile',
      downloadFilename: 'lysander-os-profile.json',
      available: true,
      sizeHint: 'Live State'
    },
    {
      id: 'raw-server-ts',
      title: 'Core Express Orchestrator Server (server.ts)',
      sourceSection: 'Core Kernel',
      sourceModuleId: 'terminal',
      category: 'Core Configs & Profiles',
      format: 'TypeScript',
      whatItDoes: 'Raw backend server entry point containing all Express API routes, Vite middleware, and subsystem wiring.',
      downloadUrl: '/api/raw/server.ts',
      downloadFilename: 'server.ts',
      method: 'GET',
      available: exists('server.ts'),
      sizeHint: 'Live Source'
    },
    {
      id: 'raw-package-json',
      title: 'Project Manifest & Scripts (package.json)',
      sourceSection: 'Core Kernel',
      sourceModuleId: 'terminal',
      category: 'Core Configs & Profiles',
      format: 'JSON',
      whatItDoes: 'Exact npm dependencies, start/build scripts, and CLI binary declarations for replicating the workspace.',
      downloadUrl: '/api/raw/package.json',
      downloadFilename: 'package.json',
      method: 'GET',
      available: exists('package.json'),
      sizeHint: '~2 KB'
    }
  ];
}
