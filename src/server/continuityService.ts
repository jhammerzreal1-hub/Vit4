import fs from 'fs';
import path from 'path';
import { getKernelDb } from './kernelDb';

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'orchestrator_settings.json');
const VOICE_CONTINUITY_FILE = path.join(DATA_DIR, 'voice_continuity.json');

export interface OrchestratorShellSettings {
  activeModule?: string;
  shellViewMode?: 'desktop' | 'workspace';
  openModules?: string[];
  pinnedModules?: string[];
  windowStates?: Record<string, any>;
  isSplitMode?: boolean;
  secondaryModule?: string;
  splitPct?: number;
  isChatDetached?: boolean;
  detachedExtraModules?: string[];
  chatPipMinimized?: boolean;
  pipMinimizedExtras?: Record<string, boolean>;
  devMode?: boolean;
  activeAccountEmail?: string;
  agentInternetAllowed?: boolean;
  persistentTalkActive?: boolean;
  uiMutationCss?: string;
}

export interface OrchestratorChatSettings {
  model?: string;
  selectedRoleId?: string;
  customSystemInstruction?: string;
  activePermitId?: string;
  zeroTokenMode?: boolean;
  chainOfThoughtEnabled?: boolean;
  deepthinkMode?: boolean;
  liveSearchEnabled?: boolean;
  showOperationalConsole?: boolean;
  showQuickLaunchers?: boolean;
  isSovereignBuilding?: boolean;
  autoReadAloud?: boolean;
  selectedVoiceName?: string;
  ttsEngine?: string;
  speechPitch?: number;
  speechWarmth?: number;
  speechResonance?: number;
  speechFormant?: number;
  workflowGoal?: string;
  infiniteWorkflowActive?: boolean;
  workflowCycle?: number;
  workflowActiveAction?: string;
  workflowAccomplished?: boolean;
  workflowAccomplishedSummary?: string;
  workflowActionLog?: any[];
  buildSteps?: any[];
  workflowPoppedOut?: boolean;
  workflowWindowOpen?: boolean;
  workflowWindowMinimized?: boolean;
  workflowWindowGeom?: { x: number; y: number; width: number; height: number };
}

export interface OrchestratorVoiceDockSettings {
  voiceName?: string;
  voiceAccent?: 'en-US' | 'en-GB';
  captureMode?: 'hybrid' | 'vad' | 'browser-stt';
  selectedMicId?: string;
  micLabel?: string;
  micPermissionGranted?: boolean;
  micPermissionGrantedAt?: string;
  cameraPermissionGranted?: boolean;
  cameraPermissionGrantedAt?: string;
  peerExploreEnabled?: boolean;
  autoArchiveVault?: boolean;
  expanded?: boolean;
  dockPos?: { x: number; y: number } | null;
}

export interface OrchestratorSettingsSnapshot {
  revision: number;
  updatedAt: string;
  shell: OrchestratorShellSettings;
  osCustomization: Record<string, any>;
  chat: OrchestratorChatSettings;
  voiceDock: OrchestratorVoiceDockSettings;
}

export interface VoiceTranscriptRecord {
  id: string;
  role: 'user' | 'model' | 'thought' | 'tool';
  text: string;
  timestamp: string;
}

export interface VoiceContinuitySnapshot {
  sessionId: string;
  updatedAt: string;
  activeModule: string;
  activeModulesList: string[];
  relayHistory: Array<{ role: 'user' | 'model'; text: string; timestamp?: string }>;
  transcripts: VoiceTranscriptRecord[];
}

const DEFAULT_SETTINGS: OrchestratorSettingsSnapshot = {
  revision: 0,
  updatedAt: new Date(0).toISOString(),
  shell: {},
  osCustomization: {},
  chat: {},
  voiceDock: {}
};

const DEFAULT_VOICE_CONTINUITY: VoiceContinuitySnapshot = {
  sessionId: `live-persistent`,
  updatedAt: new Date(0).toISOString(),
  activeModule: 'chat',
  activeModulesList: ['chat', 'browser', 'file-manager', 'terminal'],
  relayHistory: [],
  transcripts: []
};

function writeJsonAtomic(filePath: string, payload: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2), 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

function mirrorToKernelSqlite(key: string, payload: unknown): void {
  const db = getKernelDb();
  if (!db) return;
  try {
    db.prepare('INSERT OR REPLACE INTO kernel_state (key, value) VALUES (?, ?)').run(
      key,
      JSON.stringify(payload)
    );
  } catch (_) {}
}

function readFromKernelSqlite<T>(key: string): T | null {
  const db = getKernelDb();
  if (!db) return null;
  try {
    const row = db.prepare('SELECT value FROM kernel_state WHERE key = ?').get(key) as { value?: string } | undefined;
    if (row?.value) {
      return JSON.parse(row.value) as T;
    }
  } catch (_) {}
  return null;
}

export function loadOrchestratorSettings(): OrchestratorSettingsSnapshot {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      if (parsed && typeof parsed === 'object') {
        return {
          revision: Number(parsed.revision || 0),
          updatedAt: String(parsed.updatedAt || new Date().toISOString()),
          shell: parsed.shell && typeof parsed.shell === 'object' ? parsed.shell : {},
          osCustomization:
            parsed.osCustomization && typeof parsed.osCustomization === 'object' ? parsed.osCustomization : {},
          chat: parsed.chat && typeof parsed.chat === 'object' ? parsed.chat : {},
          voiceDock: parsed.voiceDock && typeof parsed.voiceDock === 'object' ? parsed.voiceDock : {}
        };
      }
    }
  } catch (_) {}

  const sqliteFallback = readFromKernelSqlite<OrchestratorSettingsSnapshot>('orchestrator_settings');
  if (sqliteFallback) return sqliteFallback;

  return { ...DEFAULT_SETTINGS, shell: {}, osCustomization: {}, chat: {}, voiceDock: {} };
}

export function mergeOrchestratorSettings(patch: {
  shell?: Partial<OrchestratorShellSettings>;
  osCustomization?: Record<string, any>;
  chat?: Partial<OrchestratorChatSettings>;
  voiceDock?: Partial<OrchestratorVoiceDockSettings>;
}): OrchestratorSettingsSnapshot {
  const current = loadOrchestratorSettings();
  const next: OrchestratorSettingsSnapshot = {
    revision: current.revision + 1,
    updatedAt: new Date().toISOString(),
    shell: patch.shell ? { ...current.shell, ...patch.shell } : current.shell,
    osCustomization: patch.osCustomization
      ? {
          ...current.osCustomization,
          ...patch.osCustomization,
          widgets: {
            ...(current.osCustomization?.widgets || {}),
            ...(patch.osCustomization.widgets || {})
          },
          notifications: {
            ...(current.osCustomization?.notifications || {}),
            ...(patch.osCustomization.notifications || {})
          },
          hotkeys: {
            ...(current.osCustomization?.hotkeys || {}),
            ...(patch.osCustomization.hotkeys || {})
          }
        }
      : current.osCustomization,
    chat: patch.chat ? { ...current.chat, ...patch.chat } : current.chat,
    voiceDock: patch.voiceDock ? { ...current.voiceDock, ...patch.voiceDock } : current.voiceDock
  };

  if (Array.isArray(next.chat.workflowActionLog)) {
    next.chat.workflowActionLog = next.chat.workflowActionLog.slice(-60);
  }
  if (Array.isArray(next.chat.buildSteps)) {
    next.chat.buildSteps = next.chat.buildSteps.slice(-40);
  }

  try {
    writeJsonAtomic(SETTINGS_FILE, next);
  } catch (err) {
    console.warn('[Continuity] Failed to write orchestrator_settings.json:', err);
  }
  mirrorToKernelSqlite('orchestrator_settings', next);
  return next;
}

export function loadVoiceContinuity(): VoiceContinuitySnapshot {
  try {
    if (fs.existsSync(VOICE_CONTINUITY_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(VOICE_CONTINUITY_FILE, 'utf-8'));
      if (parsed && typeof parsed === 'object') {
        return {
          sessionId: String(parsed.sessionId || 'live-persistent'),
          updatedAt: String(parsed.updatedAt || new Date().toISOString()),
          activeModule: String(parsed.activeModule || 'chat'),
          activeModulesList: Array.isArray(parsed.activeModulesList)
            ? parsed.activeModulesList.map(String)
            : [...DEFAULT_VOICE_CONTINUITY.activeModulesList],
          relayHistory: Array.isArray(parsed.relayHistory) ? parsed.relayHistory.slice(-40) : [],
          transcripts: Array.isArray(parsed.transcripts) ? parsed.transcripts.slice(-120) : []
        };
      }
    }
  } catch (_) {}

  const sqliteFallback = readFromKernelSqlite<VoiceContinuitySnapshot>('voice_continuity');
  if (sqliteFallback) return sqliteFallback;

  return {
    ...DEFAULT_VOICE_CONTINUITY,
    activeModulesList: [...DEFAULT_VOICE_CONTINUITY.activeModulesList],
    relayHistory: [],
    transcripts: []
  };
}

export function saveVoiceContinuity(patch: Partial<VoiceContinuitySnapshot>): VoiceContinuitySnapshot {
  const current = loadVoiceContinuity();
  const next: VoiceContinuitySnapshot = {
    sessionId: patch.sessionId || current.sessionId || 'live-persistent',
    updatedAt: new Date().toISOString(),
    activeModule: patch.activeModule || current.activeModule || 'chat',
    activeModulesList: Array.isArray(patch.activeModulesList)
      ? patch.activeModulesList.map(String)
      : current.activeModulesList,
    relayHistory: Array.isArray(patch.relayHistory)
      ? patch.relayHistory.slice(-40)
      : current.relayHistory,
    transcripts: Array.isArray(patch.transcripts)
      ? patch.transcripts.slice(-120)
      : current.transcripts
  };

  try {
    writeJsonAtomic(VOICE_CONTINUITY_FILE, next);
  } catch (err) {
    console.warn('[Continuity] Failed to write voice_continuity.json:', err);
  }
  mirrorToKernelSqlite('voice_continuity', next);
  return next;
}

export function appendVoiceContinuityTurn(
  role: 'user' | 'model' | 'thought' | 'tool',
  text: string,
  opts: { sessionId?: string; activeModule?: string } = {}
): VoiceContinuitySnapshot {
  const cleaned = String(text || '').trim();
  if (!cleaned) return loadVoiceContinuity();

  const current = loadVoiceContinuity();
  const nowIso = new Date().toISOString();
  const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const relayHistory = [...current.relayHistory];
  if (role === 'user' || role === 'model') {
    const lastRelay = relayHistory[relayHistory.length - 1];
    if (lastRelay && lastRelay.role === role) {
      relayHistory[relayHistory.length - 1] = {
        ...lastRelay,
        text: `${lastRelay.text} ${cleaned}`.replace(/\s+/g, ' ').slice(0, 4000),
        timestamp: nowIso
      };
    } else {
      relayHistory.push({ role, text: cleaned.slice(0, 4000), timestamp: nowIso });
    }
  }

  const transcripts = [...current.transcripts];
  const lastTr = transcripts[transcripts.length - 1];
  if (lastTr && lastTr.role === role && role !== 'tool') {
    transcripts[transcripts.length - 1] = {
      ...lastTr,
      text: `${lastTr.text} ${cleaned}`.replace(/\s+/g, ' ').slice(0, 5000),
      timestamp: ts
    };
  } else {
    transcripts.push({
      id: `pt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role,
      text: cleaned.slice(0, 5000),
      timestamp: ts
    });
  }

  return saveVoiceContinuity({
    sessionId: opts.sessionId || current.sessionId,
    activeModule: opts.activeModule || current.activeModule,
    relayHistory: relayHistory.slice(-40),
    transcripts: transcripts.slice(-120)
  });
}

export function getVoiceResumeContextSummary(limitTurns = 10): string {
  const voice = loadVoiceContinuity();
  const recent = voice.relayHistory.slice(-limitTurns);
  if (recent.length === 0) return '';
  const lines = recent.map(
    (h) => `- ${h.role === 'user' ? 'Joshua' : 'Lyrailius Omega'}: ${String(h.text).slice(0, 260)}`
  );
  return `RECENT LIVE VOICE & PEER CONTINUITY (SESSION ${voice.sessionId}, LAST ACTIVE MODULE: ${voice.activeModule}):\n${lines.join('\n')}`;
}
