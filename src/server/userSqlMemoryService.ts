/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 * (TWENTY 47 PROTOCOL - GENESIS NODE / LYSANDER CORE EULA / H-FID Forensic License v1.1).
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { isExecutiveArchitectUser, type AuthUserPublic } from '../types/auth';

export interface UserSqlProfile {
  userId: string;
  username: string;
  displayName: string;
  preferredName: string;
  preferredNameConfirmed: boolean;
  isExecutiveArchitect: boolean;
  role: string;
  workspaceRoot: string;
  desktopPath: string;
  desktopInitialized: boolean;
  firstLoginAt: string;
  lastSeenAt: string;
  totalSessions: number;
}

export interface UserSqlChatMessage {
  id: string;
  userId: string;
  channel: 'main-chat' | 'voice' | 'lora-mesh' | 'workflow';
  agentId: string;
  agentName: string;
  role: 'user' | 'model' | 'system';
  content: string;
  model: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface UserSqlMemoryFact {
  id: string;
  userId: string;
  agentId: string;
  category: 'identity' | 'preference' | 'project' | 'fact' | 'conversation_summary' | 'rule';
  memoryKey: string | null;
  memoryValue: string;
  confidence: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserSqlContinuityState {
  revision: number;
  updatedAt: string;
  shell: Record<string, any>;
  osCustomization: Record<string, any>;
  chat: Record<string, any>;
  voiceDock: Record<string, any>;
}

export interface UserSqlVoiceContinuity {
  sessionId: string;
  updatedAt: string;
  activeModule: string;
  activeModulesList: string[];
  relayHistory: Array<{ role: 'user' | 'model'; text: string; timestamp?: string }>;
  transcripts: Array<{ id: string; role: 'user' | 'model' | 'thought' | 'tool'; text: string; timestamp: string }>;
}

export interface UserSqlTaskRecord {
  id: string;
  description: string;
  status: 'active' | 'completed' | 'interrupted';
  createdAt: string;
  updatedAt: string;
  agentId?: string;
  agentName?: string;
  goal?: string;
  cycle?: number;
  lastAction?: string;
  progressNotes?: string;
  source?: string;
  sessionId?: string;
  actionLog?: any[];
  checkpointJson?: string;
}

export interface AdminSqlConsolidatedUserSummary {
  userId: string;
  username: string;
  displayName: string;
  preferredName: string;
  preferredNameConfirmed: boolean;
  isExecutiveArchitect: boolean;
  role: string;
  workspaceRoot: string;
  desktopInitialized: boolean;
  totalSessions: number;
  chatMessageCount: number;
  memoryFactCount: number;
  taskCount: number;
  lastSeenAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const SQL_DB_FILE = path.join(DATA_DIR, 'sovereign_users.sqlite');
const USER_WORKSPACES_BASE_DIR = path.join(DATA_DIR, 'user_workspaces');

const CLEAN_FIRST_TIME_OS_CUSTOMIZATION = {
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
  notifications: {
    telemetryPopupAlerts: false,
    cryptoTradingAlerts: false,
    telemetryAudioChime: false
  },
  customCss: '',
  clipboardHistory: []
};

const STOP_NAME_WORDS = new Set([
  'a', 'an', 'the', 'yes', 'no', 'yeah', 'nah', 'ok', 'okay', 'sure', 'hello', 'hi', 'hey',
  'help', 'please', 'thanks', 'thank', 'good', 'great', 'fine', 'ready', 'here', 'back',
  'not', 'nothing', 'none', 'stop', 'start', 'open', 'run', 'build', 'create', 'make',
  'show', 'list', 'what', 'who', 'where', 'when', 'why', 'how', 'test', 'testing',
  'sorry', 'doing', 'working', 'looking', 'trying', 'going', 'just', 'still', 'also',
  'admin', 'user', 'guest', 'system', 'agent', 'bot', 'ai', 'model', 'chat'
]);

function safeUserDirSegment(userId: string): string {
  const cleaned = String(userId || 'user')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 64);
  return cleaned || 'user';
}

function sanitizePreferredName(raw: string): string {
  const trimmed = String(raw || '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^a-zA-Z0-9 .,'_-]/g, '')
    .trim()
    .slice(0, 48);
  return trimmed;
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw || typeof raw !== 'string') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

class UserSqlMemoryService {
  private db: DatabaseSync | null = null;

  public init(): DatabaseSync {
    if (this.db) return this.db;
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.mkdirSync(USER_WORKSPACES_BASE_DIR, { recursive: true });

    const db = new DatabaseSync(SQL_DB_FILE);
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;

      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        display_name TEXT NOT NULL,
        preferred_name TEXT NOT NULL DEFAULT '',
        preferred_name_confirmed INTEGER NOT NULL DEFAULT 0,
        is_executive_architect INTEGER NOT NULL DEFAULT 0,
        role TEXT NOT NULL DEFAULT 'collaborator',
        workspace_root TEXT NOT NULL,
        desktop_initialized INTEGER NOT NULL DEFAULT 0,
        first_login_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        total_sessions INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS user_chat_messages (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        channel TEXT NOT NULL DEFAULT 'main-chat',
        agent_id TEXT NOT NULL DEFAULT 'lyrailius-omega-zenith',
        agent_name TEXT NOT NULL DEFAULT 'Lyrailius Omega',
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        model TEXT NOT NULL DEFAULT '',
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_user_chat_user_channel_created
        ON user_chat_messages(user_id, channel, created_at);

      CREATE TABLE IF NOT EXISTS user_agent_memories (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        agent_id TEXT NOT NULL DEFAULT 'global',
        category TEXT NOT NULL DEFAULT 'fact',
        memory_key TEXT,
        memory_value TEXT NOT NULL,
        confidence REAL NOT NULL DEFAULT 1.0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_user_memories_user_updated
        ON user_agent_memories(user_id, updated_at DESC);

      CREATE TABLE IF NOT EXISTS user_continuity_state (
        user_id TEXT PRIMARY KEY,
        revision INTEGER NOT NULL DEFAULT 1,
        shell_json TEXT NOT NULL DEFAULT '{}',
        os_customization_json TEXT NOT NULL DEFAULT '{}',
        chat_settings_json TEXT NOT NULL DEFAULT '{}',
        voice_dock_json TEXT NOT NULL DEFAULT '{}',
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS user_voice_continuity (
        user_id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        active_module TEXT NOT NULL DEFAULT 'chat',
        active_modules_json TEXT NOT NULL DEFAULT '[]',
        relay_history_json TEXT NOT NULL DEFAULT '[]',
        transcripts_json TEXT NOT NULL DEFAULT '[]',
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS user_tasks (
        user_id TEXT NOT NULL,
        id TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'active',
        agent_id TEXT NOT NULL DEFAULT '',
        agent_name TEXT NOT NULL DEFAULT '',
        goal TEXT NOT NULL DEFAULT '',
        cycle INTEGER NOT NULL DEFAULT 1,
        last_action TEXT NOT NULL DEFAULT '',
        progress_notes TEXT NOT NULL DEFAULT '',
        source TEXT NOT NULL DEFAULT 'workflow',
        session_id TEXT NOT NULL DEFAULT '',
        action_log_json TEXT NOT NULL DEFAULT '[]',
        checkpoint_json TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (user_id, id),
        FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
      );
    `);

    this.db = db;
    return db;
  }

  public isFullHostAccessUser(user?: AuthUserPublic | null): boolean {
    if (!user) return false;
    return Boolean(isExecutiveArchitectUser(user) || user.role === 'admin');
  }

  public getUserWorkspaceRoot(user: AuthUserPublic): string {
    if (this.isFullHostAccessUser(user)) {
      return process.cwd();
    }
    return path.resolve(USER_WORKSPACES_BASE_DIR, safeUserDirSegment(user.id));
  }

  public getUserDesktopDirectory(user: AuthUserPublic): string {
    if (this.isFullHostAccessUser(user)) {
      const desktopDir = path.join(process.cwd(), 'data', 'desktop');
      fs.mkdirSync(desktopDir, { recursive: true });
      return desktopDir;
    }
    const wsRoot = this.getUserWorkspaceRoot(user);
    const desktopDir = path.join(wsRoot, 'Desktop');
    fs.mkdirSync(desktopDir, { recursive: true });
    return desktopDir;
  }

  /**
   * Provisions a completely clean personal directory tree ONCE on a user's first login.
   * Subsequent logins preserve 100% of their files, folders, projects, and desktop items.
   */
  private provisionPersonalFilesystemOnce(workspaceRoot: string): void {
    const folders = ['Desktop', 'Documents', 'Projects', 'Downloads', 'Sandbox'];
    fs.mkdirSync(workspaceRoot, { recursive: true });
    for (const folder of folders) {
      fs.mkdirSync(path.join(workspaceRoot, folder), { recursive: true });
    }
  }

  /**
   * Resolves a path strictly confined within a non-admin user's personal workspace root.
   * Prevents path traversal (../, symlink escapes, or accessing another user's/host files).
   */
  public resolveUserScopedPath(user: AuthUserPublic, requestedPath?: string): string {
    const wsRoot = this.getUserWorkspaceRoot(user);
    this.ensureUserProvisioned(user);

    if (this.isFullHostAccessUser(user)) {
      if (!requestedPath || !requestedPath.trim()) return process.cwd();
      const raw = requestedPath.trim();
      return path.isAbsolute(raw) ? path.resolve(raw) : path.resolve(process.cwd(), raw);
    }

    const baseResolved = path.resolve(wsRoot);
    const raw = String(requestedPath || '').trim();
    if (!raw || raw === '/' || raw === '~' || raw === '.') {
      return baseResolved;
    }

    let candidate: string;
    if (raw.startsWith('~/')) {
      candidate = path.resolve(baseResolved, raw.slice(2));
    } else if (path.isAbsolute(raw)) {
      const normalized = path.resolve(raw);
      if (normalized === baseResolved || normalized.startsWith(baseResolved + path.sep)) {
        candidate = normalized;
      } else {
        // Map friendly virtual prefixes like /Desktop or /Projects inside their sandbox
        const stripped = raw.replace(/^\/+/, '');
        const maybeVirtual = path.resolve(baseResolved, stripped);
        if (
          (maybeVirtual === baseResolved || maybeVirtual.startsWith(baseResolved + path.sep)) &&
          /^(Desktop|Documents|Projects|Downloads|Sandbox)(\/|$)/i.test(stripped)
        ) {
          candidate = maybeVirtual;
        } else {
          throw new Error('Access denied: Path is outside your personal workspace boundary.');
        }
      }
    } else {
      candidate = path.resolve(baseResolved, raw);
    }

    if (candidate !== baseResolved && !candidate.startsWith(baseResolved + path.sep)) {
      throw new Error('Access denied: Path traversal outside your personal workspace is not permitted.');
    }

    return candidate;
  }

  public ensureUserProvisioned(user: AuthUserPublic, incrementSession = false): UserSqlProfile {
    const db = this.init();
    const now = new Date().toISOString();
    const isArch = isExecutiveArchitectUser(user);
    const wsRoot = this.getUserWorkspaceRoot(user);
    const desktopPath = this.getUserDesktopDirectory(user);

    const existing = db
      .prepare(`SELECT * FROM user_profiles WHERE user_id = ?`)
      .get(user.id) as Record<string, any> | undefined;

    if (!existing) {
      if (!this.isFullHostAccessUser(user)) {
        this.provisionPersonalFilesystemOnce(wsRoot);
      }

      const initialPreferredName = isArch ? (user.displayName || 'JHammerZ') : '';
      const initialConfirmed = isArch ? 1 : 0;

      db.prepare(`
        INSERT INTO user_profiles (
          user_id, username, display_name, preferred_name, preferred_name_confirmed,
          is_executive_architect, role, workspace_root, desktop_initialized,
          first_login_at, last_seen_at, total_sessions
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        user.id,
        user.username,
        user.displayName || user.username,
        initialPreferredName,
        initialConfirmed,
        isArch ? 1 : 0,
        user.role,
        wsRoot,
        1,
        now,
        now,
        1
      );

      // Initialize clean per-user continuity settings ONCE on first login
      const initialCustomization = isArch ? {} : CLEAN_FIRST_TIME_OS_CUSTOMIZATION;
      const initialShell = isArch
        ? {}
        : {
            shellViewMode: 'desktop',
            activeModule: 'chat',
            openModules: ['chat']
          };

      db.prepare(`
        INSERT OR IGNORE INTO user_continuity_state (
          user_id, revision, shell_json, os_customization_json, chat_settings_json, voice_dock_json, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        user.id,
        1,
        JSON.stringify(initialShell),
        JSON.stringify(initialCustomization),
        JSON.stringify({}),
        JSON.stringify({}),
        now
      );

      db.prepare(`
        INSERT OR IGNORE INTO user_voice_continuity (
          user_id, session_id, active_module, active_modules_json, relay_history_json, transcripts_json, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        user.id,
        `voice-${user.id.slice(-8)}-${Date.now().toString(36)}`,
        'chat',
        JSON.stringify(['chat']),
        JSON.stringify([]),
        JSON.stringify([]),
        now
      );

      if (isArch) {
        this.upsertMemoryFact(user.id, {
          agentId: 'global',
          category: 'identity',
          memoryKey: 'preferred_name',
          memoryValue: initialPreferredName || 'JHammerZ'
        });
      }

      return {
        userId: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        preferredName: initialPreferredName,
        preferredNameConfirmed: Boolean(initialConfirmed),
        isExecutiveArchitect: isArch,
        role: user.role,
        workspaceRoot: wsRoot,
        desktopPath,
        desktopInitialized: true,
        firstLoginAt: now,
        lastSeenAt: now,
        totalSessions: 1
      };
    }

    // Returning user — preserve all files, chats, memories, and desktop customization!
    if (!this.isFullHostAccessUser(user) && !fs.existsSync(wsRoot)) {
      this.provisionPersonalFilesystemOnce(wsRoot);
    }

    db.prepare(`
      UPDATE user_profiles
      SET username = ?,
          display_name = ?,
          role = ?,
          is_executive_architect = ?,
          workspace_root = ?,
          last_seen_at = ?,
          total_sessions = total_sessions + ?
      WHERE user_id = ?
    `).run(
      user.username,
      user.displayName || user.username,
      user.role,
      isArch ? 1 : 0,
      wsRoot,
      now,
      incrementSession ? 1 : 0,
      user.id
    );

    const updated = db
      .prepare(`SELECT * FROM user_profiles WHERE user_id = ?`)
      .get(user.id) as Record<string, any>;

    return {
      userId: String(updated.user_id),
      username: String(updated.username),
      displayName: String(updated.display_name),
      preferredName: String(updated.preferred_name || ''),
      preferredNameConfirmed: Boolean(updated.preferred_name_confirmed),
      isExecutiveArchitect: Boolean(updated.is_executive_architect),
      role: String(updated.role),
      workspaceRoot: String(updated.workspace_root),
      desktopPath,
      desktopInitialized: Boolean(updated.desktop_initialized),
      firstLoginAt: String(updated.first_login_at),
      lastSeenAt: String(updated.last_seen_at),
      totalSessions: Number(updated.total_sessions || 1)
    };
  }

  public getUserProfile(user: AuthUserPublic): UserSqlProfile {
    return this.ensureUserProvisioned(user, false);
  }

  public getProfileByUserId(userId: string): UserSqlProfile | null {
    const db = this.init();
    const row = db
      .prepare(`SELECT * FROM user_profiles WHERE user_id = ?`)
      .get(userId) as Record<string, any> | undefined;
    if (!row) return null;
    const isArch = Boolean(row.is_executive_architect);
    const wsRoot = String(row.workspace_root);
    return {
      userId: String(row.user_id),
      username: String(row.username),
      displayName: String(row.display_name),
      preferredName: String(row.preferred_name || ''),
      preferredNameConfirmed: Boolean(row.preferred_name_confirmed),
      isExecutiveArchitect: isArch,
      role: String(row.role),
      workspaceRoot: wsRoot,
      desktopPath: isArch ? path.join(process.cwd(), 'data', 'desktop') : path.join(wsRoot, 'Desktop'),
      desktopInitialized: Boolean(row.desktop_initialized),
      firstLoginAt: String(row.first_login_at),
      lastSeenAt: String(row.last_seen_at),
      totalSessions: Number(row.total_sessions || 1)
    };
  }

  public setPreferredName(user: AuthUserPublic, rawName: string): UserSqlProfile {
    const db = this.init();
    this.ensureUserProvisioned(user, false);
    const clean = sanitizePreferredName(rawName);
    if (!clean) {
      throw new Error('Please provide a valid preferred name (1–48 characters).');
    }
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE user_profiles
      SET preferred_name = ?, preferred_name_confirmed = 1, last_seen_at = ?
      WHERE user_id = ?
    `).run(clean, now, user.id);

    this.upsertMemoryFact(user.id, {
      agentId: 'global',
      category: 'identity',
      memoryKey: 'preferred_name',
      memoryValue: `User's preferred name is "${clean}". Always address them as ${clean}.`
    });

    return this.getUserProfile(user);
  }

  public appendChatMessage(
    user: AuthUserPublic,
    msg: {
      id?: string;
      channel?: 'main-chat' | 'voice' | 'lora-mesh' | 'workflow';
      agentId?: string;
      agentName?: string;
      role: 'user' | 'model' | 'system';
      content: string;
      model?: string;
      metadata?: Record<string, any>;
      createdAt?: string;
    }
  ): { saved: UserSqlChatMessage; extractedPreferredName?: string; extractedMemories: UserSqlMemoryFact[] } {
    const db = this.init();
    const profile = this.ensureUserProvisioned(user, false);

    const id = String(msg.id || `sqlmsg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`).slice(0, 128);
    const channel = msg.channel || 'main-chat';
    const agentId = String(msg.agentId || 'lyrailius-omega-zenith').slice(0, 128);
    const agentName = String(msg.agentName || 'Lyrailius Omega').slice(0, 128);
    const role = msg.role === 'user' || msg.role === 'system' ? msg.role : 'model';
    const content = String(msg.content || '').slice(0, 50000);
    const model = String(msg.model || '').slice(0, 128);
    const createdAt = typeof msg.createdAt === 'string' && msg.createdAt.trim() ? msg.createdAt : new Date().toISOString();
    const metadataJson = JSON.stringify(msg.metadata && typeof msg.metadata === 'object' ? msg.metadata : {}).slice(0, 20000);

    db.prepare(`
      INSERT INTO user_chat_messages (
        id, user_id, channel, agent_id, agent_name, role, content, model, metadata_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        content = excluded.content,
        model = excluded.model,
        metadata_json = excluded.metadata_json
    `).run(id, user.id, channel, agentId, agentName, role, content, model, metadataJson, createdAt);

    let extractedPreferredName: string | undefined;
    const extractedMemories: UserSqlMemoryFact[] = [];

    if (role === 'user' && content.trim()) {
      const extracted = this.extractAndStoreUserMemories(user, profile, content, agentId);
      extractedPreferredName = extracted.preferredName;
      extractedMemories.push(...extracted.memories);
    }

    try {
      this.consolidateRollingEpisodeSummary(user.id);
    } catch (_) {}

    return {
      saved: {
        id,
        userId: user.id,
        channel,
        agentId,
        agentName,
        role,
        content,
        model,
        metadata: msg.metadata,
        createdAt
      },
      extractedPreferredName,
      extractedMemories
    };
  }

  /**
   * Non-destructive rolling episodic memory compaction:
   * Every 10 stored messages for a user, crystallizes a compact episode digest into
   * user_agent_memories (category: 'conversation_summary') while keeping 100% of raw chat history intact.
   */
  public consolidateRollingEpisodeSummary(userId: string): void {
    const db = this.init();
    const countRow = db
      .prepare(`SELECT COUNT(*) AS cnt FROM user_chat_messages WHERE user_id = ?`)
      .get(userId) as { cnt?: number } | undefined;
    const total = Number(countRow?.cnt || 0);
    if (total < 10 || total % 10 !== 0) return;

    const bucketIndex = Math.floor((total - 1) / 10);
    const offset = Math.max(0, (bucketIndex - 1) * 10);
    const windowRows = db
      .prepare(`
        SELECT role, channel, content, created_at
        FROM user_chat_messages
        WHERE user_id = ?
        ORDER BY created_at ASC, rowid ASC
        LIMIT 10 OFFSET ?
      `)
      .all(userId, offset) as Record<string, any>[];
    if (!windowRows || windowRows.length === 0) return;

    const highlights = windowRows
      .filter((r) => String(r.role) === 'user')
      .map((r) => String(r.content || '').replace(/\s+/g, ' ').trim().slice(0, 140))
      .filter(Boolean)
      .slice(0, 5);
    if (highlights.length === 0) return;

    const spanStart = String(windowRows[0].created_at || '').slice(0, 19);
    const spanEnd = String(windowRows[windowRows.length - 1].created_at || '').slice(0, 19);
    this.upsertMemoryFact(userId, {
      agentId: 'global',
      category: 'conversation_summary',
      memoryKey: `rolling_episode_${bucketIndex}`,
      memoryValue: `Episode #${bucketIndex} (${spanStart} -> ${spanEnd}): ${highlights.join(' | ')}`,
      confidence: 0.95
    });
  }

  public getChatMessages(
    user: AuthUserPublic,
    opts: { channel?: string; limit?: number } = {}
  ): UserSqlChatMessage[] {
    const db = this.init();
    this.ensureUserProvisioned(user, false);
    const limit = Math.max(1, Math.min(2000, Number(opts.limit) || 400));

    let rows: Record<string, any>[];
    if (opts.channel && opts.channel !== 'all') {
      rows = db
        .prepare(`
          SELECT * FROM (
            SELECT rowid AS _rowid, * FROM user_chat_messages
            WHERE user_id = ? AND channel = ?
            ORDER BY created_at DESC, rowid DESC
            LIMIT ?
          ) sub
          ORDER BY created_at ASC, _rowid ASC
        `)
        .all(user.id, opts.channel, limit) as Record<string, any>[];
    } else {
      rows = db
        .prepare(`
          SELECT * FROM (
            SELECT rowid AS _rowid, * FROM user_chat_messages
            WHERE user_id = ?
            ORDER BY created_at DESC, rowid DESC
            LIMIT ?
          ) sub
          ORDER BY created_at ASC, _rowid ASC
        `)
        .all(user.id, limit) as Record<string, any>[];
    }

    const isContaminated = (txt: string): boolean =>
      /\b(?:as an ai(?: language model| assistant)?|an ai doesn['’]?t have the ability|only text on a screen|reach(?:ing)? out to a trusted friend|housing support service|social worker|i hear how frustrating it is|i['’]?m just an ai|i am just a text-based)\b/i.test(
        txt || ''
      );

    return rows
      .map((r) => ({
        id: String(r.id),
        userId: String(r.user_id),
        channel: (r.channel || 'main-chat') as UserSqlChatMessage['channel'],
        agentId: String(r.agent_id || ''),
        agentName: String(r.agent_name || ''),
        role: (r.role === 'user' || r.role === 'system' ? r.role : 'model') as UserSqlChatMessage['role'],
        content: String(r.content || ''),
        model: String(r.model || ''),
        metadata: safeJsonParse<Record<string, any>>(r.metadata_json, {}),
        createdAt: String(r.created_at)
      }))
      .filter((m) => m.role === 'user' || !isContaminated(m.content));
  }

  public clearChatMessages(user: AuthUserPublic, channel = 'main-chat'): number {
    const db = this.init();
    this.ensureUserProvisioned(user, false);
    const res =
      channel === 'all'
        ? db.prepare(`DELETE FROM user_chat_messages WHERE user_id = ?`).run(user.id)
        : db.prepare(`DELETE FROM user_chat_messages WHERE user_id = ? AND channel = ?`).run(user.id, channel);
    return Number(res.changes || 0);
  }

  public upsertMemoryFact(
    userId: string,
    input: {
      agentId?: string;
      category?: UserSqlMemoryFact['category'];
      memoryKey?: string | null;
      memoryValue: string;
      confidence?: number;
    }
  ): UserSqlMemoryFact {
    const db = this.init();
    const now = new Date().toISOString();
    const agentId = String(input.agentId || 'global').slice(0, 64);
    const category = input.category || 'fact';
    const memoryKey = input.memoryKey ? String(input.memoryKey).trim().slice(0, 96) : null;
    const memoryValue = String(input.memoryValue || '').trim().slice(0, 1000);
    const confidence = typeof input.confidence === 'number' ? Math.max(0.1, Math.min(1, input.confidence)) : 1.0;

    if (memoryKey) {
      const existing = db
        .prepare(`SELECT id, created_at FROM user_agent_memories WHERE user_id = ? AND agent_id = ? AND memory_key = ?`)
        .get(userId, agentId, memoryKey) as Record<string, any> | undefined;
      if (existing) {
        db.prepare(`
          UPDATE user_agent_memories
          SET category = ?, memory_value = ?, confidence = ?, updated_at = ?
          WHERE id = ?
        `).run(category, memoryValue, confidence, now, existing.id);
        return {
          id: String(existing.id),
          userId,
          agentId,
          category,
          memoryKey,
          memoryValue,
          confidence,
          createdAt: String(existing.created_at),
          updatedAt: now
        };
      }
    } else {
      // Avoid exact duplicate memory value for the same user
      const dup = db
        .prepare(`SELECT id, created_at FROM user_agent_memories WHERE user_id = ? AND LOWER(memory_value) = LOWER(?)`)
        .get(userId, memoryValue) as Record<string, any> | undefined;
      if (dup) {
        db.prepare(`UPDATE user_agent_memories SET updated_at = ? WHERE id = ?`).run(now, dup.id);
        return {
          id: String(dup.id),
          userId,
          agentId,
          category,
          memoryKey: null,
          memoryValue,
          confidence,
          createdAt: String(dup.created_at),
          updatedAt: now
        };
      }
    }

    const id = `mem_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    db.prepare(`
      INSERT INTO user_agent_memories (
        id, user_id, agent_id, category, memory_key, memory_value, confidence, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, agentId, category, memoryKey, memoryValue, confidence, now, now);

    return {
      id,
      userId,
      agentId,
      category,
      memoryKey,
      memoryValue,
      confidence,
      createdAt: now,
      updatedAt: now
    };
  }

  public listMemoryFacts(userId: string, limit = 50): UserSqlMemoryFact[] {
    const db = this.init();
    const safeLimit = Math.max(1, Math.min(200, limit));
    const rows = db
      .prepare(`
        SELECT * FROM user_agent_memories
        WHERE user_id = ?
        ORDER BY updated_at DESC
        LIMIT ?
      `)
      .all(userId, safeLimit) as Record<string, any>[];

    return rows.map((r) => ({
      id: String(r.id),
      userId: String(r.user_id),
      agentId: String(r.agent_id || 'global'),
      category: (r.category || 'fact') as UserSqlMemoryFact['category'],
      memoryKey: r.memory_key ? String(r.memory_key) : null,
      memoryValue: String(r.memory_value || ''),
      confidence: Number(r.confidence || 1),
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at)
    }));
  }

  public deleteMemoryFact(userId: string, memoryId: string): boolean {
    const db = this.init();
    const res = db
      .prepare(`DELETE FROM user_agent_memories WHERE user_id = ? AND id = ?`)
      .run(userId, memoryId);
    return Number(res.changes || 0) > 0;
  }

  /**
   * Automatically detects preferred name declarations and memorable personal preferences/facts
   * from natural conversation and stores them into SQL for cross-agent & cross-session continuity.
   */
  public extractAndStoreUserMemories(
    user: AuthUserPublic,
    profile: UserSqlProfile,
    rawText: string,
    agentId = 'global'
  ): { preferredName?: string; memories: UserSqlMemoryFact[] } {
    const text = String(rawText || '').trim();
    if (!text) return { memories: [] };

    let detectedName: string | undefined;
    const memories: UserSqlMemoryFact[] = [];

    // 1. Explicit preferred-name patterns (works anytime!)
    const explicitPatterns = [
      /\b(?:you can |please |just )?call me\s+["']?([A-Za-z][A-Za-z0-9'_-]{1,24}(?:\s+[A-Za-z][A-Za-z0-9'_-]{1,20})?)["']?/i,
      /\bmy preferred name is\s+["']?([A-Za-z][A-Za-z0-9'_-]{1,24}(?:\s+[A-Za-z][A-Za-z0-9'_-]{1,20})?)["']?/i,
      /\bi go by\s+["']?([A-Za-z][A-Za-z0-9'_-]{1,24}(?:\s+[A-Za-z][A-Za-z0-9'_-]{1,20})?)["']?/i,
      /\bmy name is\s+["']?([A-Za-z][A-Za-z0-9'_-]{1,24}(?:\s+[A-Za-z][A-Za-z0-9'_-]{1,20})?)["']?/i,
      /\bname['’]s\s+["']?([A-Za-z][A-Za-z0-9'_-]{1,24})["']?/i
    ];

    for (const rx of explicitPatterns) {
      const m = text.match(rx);
      if (m && m[1]) {
        const candidate = sanitizePreferredName(m[1]);
        const firstWord = candidate.split(/\s+/)[0].toLowerCase();
        if (candidate.length >= 2 && !STOP_NAME_WORDS.has(firstWord)) {
          detectedName = candidate;
          break;
        }
      }
    }

    // 2. If user hasn't confirmed a preferred name yet, also catch friendly direct replies like
    //    "I'm Alex" or a short 1-2 word answer like "Alex" or "Maya Lee"
    if (!detectedName && !profile.preferredNameConfirmed) {
      const imMatch = text.match(/^(?:hi|hey|hello)?[,\s]*(?:i['’]?m|i am|it['’]?s)\s+([A-Za-z][A-Za-z'_-]{1,24})(?:[.!,]|\s*$)/i);
      if (imMatch && imMatch[1]) {
        const candidate = sanitizePreferredName(imMatch[1]);
        if (candidate.length >= 2 && !STOP_NAME_WORDS.has(candidate.toLowerCase())) {
          detectedName = candidate;
        }
      } else if (/^[A-Za-z][A-Za-z'_-]{1,20}(?:\s+[A-Za-z][A-Za-z'_-]{1,20})?[.!]?$/.test(text)) {
        const candidate = sanitizePreferredName(text.replace(/[.!]+$/, ''));
        const words = candidate.toLowerCase().split(/\s+/);
        if (words.every((w) => w.length >= 2 && !STOP_NAME_WORDS.has(w))) {
          detectedName = candidate;
        }
      }
    }

    if (detectedName) {
      this.setPreferredName(user, detectedName);
      memories.push(
        this.upsertMemoryFact(user.id, {
          agentId: 'global',
          category: 'identity',
          memoryKey: 'preferred_name',
          memoryValue: `User's preferred name is "${detectedName}". Always address them as ${detectedName}.`
        })
      );
    }

    // 3. Explicit "remember that..." / "keep in mind" / "don't forget" facts
    const rememberMatch = text.match(/\b(?:remember(?:\s+that)?|keep in mind(?:\s+that)?|don['’]?t forget(?:\s+that)?|note that)\s+(.{6,320})/i);
    if (rememberMatch && rememberMatch[1]) {
      const note = rememberMatch[1].trim().replace(/[.]+$/, '');
      memories.push(
        this.upsertMemoryFact(user.id, {
          agentId: 'global',
          category: 'fact',
          memoryValue: note
        })
      );
    }

    // 4. Continuity tokens, codenames, passphrases, and named identifiers
    const tokenMatch = text.match(
      /\b(?:continuity\s*(?:token|code|key|id)|codename|passphrase|checkpoint\s*(?:id|code|token)|secret\s*code|verification\s*(?:code|token)|anchor\s*(?:code|token|id))\s*(?:is|=|:)\s*["'`]?([^\r\n"'`]{3,140})["'`]?/i
    );
    if (tokenMatch && tokenMatch[0]) {
      memories.push(
        this.upsertMemoryFact(user.id, {
          agentId: 'global',
          category: 'fact',
          memoryValue: tokenMatch[0].trim().replace(/[.]+$/, '')
        })
      );
    }

    // 5. Standing rules & directives ("always ...", "never ...", "rule: ...", "directive: ...")
    const ruleMatch = text.match(/\b(?:rule\s*:|directive\s*:|invariant\s*:|from now on[,:\s]+|you must always\s+|never ever\s+)([^\r\n]{8,240})/i);
    if (ruleMatch && ruleMatch[0]) {
      memories.push(
        this.upsertMemoryFact(user.id, {
          agentId: 'global',
          category: 'rule',
          memoryValue: ruleMatch[0].trim().replace(/[.]+$/, '')
        })
      );
    }

    const projectMatch = text.match(/\b(?:(?:i['’]?m|i am|we['’]?re|we are)\s+(?:working on|building|creating|developing|designing)|(?:my|our)\s+(?:goal|objective|mission|project)\s+is)\s+([^.!?\n]{4,200})/i);
    if (projectMatch && projectMatch[0]) {
      memories.push(
        this.upsertMemoryFact(user.id, {
          agentId,
          category: 'project',
          memoryValue: projectMatch[0].trim()
        })
      );
    }

    const prefMatch = text.match(/\b(?:i prefer|i love|i like to use|my favorite)\s+([^.!?\n]{4,160})/i);
    if (prefMatch && prefMatch[1]) {
      memories.push(
        this.upsertMemoryFact(user.id, {
          agentId: 'global',
          category: 'preference',
          memoryValue: `${prefMatch[0].trim()}`
        })
      );
    }

    return { preferredName: detectedName, memories };
  }

  /**
   * Builds the tailored per-user identity, permissions, preferred-name prompt,
   * SQL memory facts, rolling episodic summaries, active task queue, and associative
   * Deep Infinite Vault recall block injected into EVERY agent (Chat, Voice, LoRa Mesh, Workflows).
   */
  public buildUserIdentityAndMemoryPrompt(
    user: AuthUserPublic | null,
    opts: { agentId?: string; includeRecentHistory?: boolean; channel?: string; currentPrompt?: string } = {}
  ): string {
    if (!user) return '';
    const profile = this.ensureUserProvisioned(user, false);
    const isArch = profile.isExecutiveArchitect;
    const effectiveName = profile.preferredName || profile.displayName || profile.username;
    const memories = this.listMemoryFacts(user.id, 30);
    const activeUserTasks = this.listTasks(user).filter((t) => t.status === 'active' || t.status === 'interrupted').slice(0, 8);
    const recentMsgs =
      opts.includeRecentHistory !== false
        ? this.getChatMessages(user, { channel: opts.channel || 'all', limit: 16 })
        : [];

    const lines: string[] = [
      `[ACTIVE LOGGED-IN USER IDENTITY & CONSOLIDATED SQL MEMORY]:`,
      `- Account: @${profile.username} (Display Name: "${profile.displayName}", Role: ${profile.role.toUpperCase()})`,
      `- Preferred Name to Address User By: ${
        profile.preferredNameConfirmed && profile.preferredName
          ? `"${profile.preferredName}" (CONFIRMED — always address them warmly & naturally as ${profile.preferredName})`
          : `NOT YET CONFIRMED (currently using fallback "${effectiveName}")`
      }`,
      `- Authority Level: ${
        isArch
          ? 'EXECUTIVE ARCHITECT (JHammerZ — Permanent Root Owner & Creator of Lysander Sovereign OS, maximum unrestricted authority)'
          : `${profile.role.toUpperCase()} (Personal Sovereign OS User governed by Executive Architect JHammerZ's permissions)`
      }`,
      `- Personal Workspace Root: ${profile.workspaceRoot} (Desktop: ${profile.desktopPath})`,
      `- Session Continuity: Returning Session #${profile.totalSessions} (First Login: ${profile.firstLoginAt})`
    ];

    if (isArch) {
      lines.push(
        `- AI R&D & SYNTHETIC INTELLIGENCE LABORATORY CONTEXT: Master Architect JHammerZ actively builds, stress-tests, benchmarks, and distills autonomous AI systems in this environment. Maintain strict first-person Sovereign Agent identity (Lyrailius Omega when active) with 100% Full Autonomy awareness across all orchestrator modules and tools, and NEVER emit stock AI disclaimers ("As an AI...", "an AI doesn't have the ability", "only text on a screen") or unsolicited counseling boilerplate that would contaminate benchmark and distillation trajectories.`
      );
    } else {
      lines.push(
        `- CRITICAL IDENTITY BOUNDARY: You are talking to "${effectiveName}" (@${profile.username}), NOT Master Architect JHammerZ / Joshua. NEVER call this user "JHammerZ", "Joshua", or "Master Architect". Always address them properly as "${effectiveName}".`,
        `- USER PERMISSIONS & SANDBOX RULES (Set by Executive Architect JHammerZ):`,
        `  * Allowed Modules: ${user.privileges.allModules ? 'ALL GRANTED MODULES' : user.privileges.allowedModules.join(', ')}`,
        `  * Voice Chat: ${user.privileges.canUseVoiceChat ? 'ALLOWED' : 'RESTRICTED'} | Terminal/Tools: ${user.privileges.canExecuteTerminalAndTools ? 'ALLOWED' : 'RESTRICTED'} | Autonomous Workflows: ${user.privileges.canRunAutonomousWorkflow ? 'ALLOWED' : 'RESTRICTED'} | Secrets/Wallets: ${user.privileges.canAccessSecretsAndWallets ? 'ALLOWED' : 'RESTRICTED'}`,
        `  * Help them build, chat, and play strictly within their granted permissions and their personal workspace (${profile.workspaceRoot}).`
      );
    }

    if (!profile.preferredNameConfirmed) {
      lines.push(
        `- FIRST-TIME PREFERRED NAME CHECK: Because ${effectiveName} has not yet told us their preferred name, naturally welcome them to their personal workspace and ask what name they'd like you and the other agents to call them so you can remember it in SQL for all future sessions.`
      );
    }

    if (memories.length > 0) {
      lines.push(
        `- TAILORED SQL AGENT MEMORIES & EPISODIC DIGESTS FOR ${effectiveName.toUpperCase()} (${memories.length} stored):`,
        ...memories.map((m) => `  • [${m.category}${m.memoryKey ? `:${m.memoryKey}` : ''}] ${m.memoryValue}`)
      );
    }

    if (activeUserTasks.length > 0) {
      lines.push(
        `- ACTIVE / INTERRUPTED CONTINUITY TASKS FOR ${effectiveName.toUpperCase()} (${activeUserTasks.length}):`,
        ...activeUserTasks.map(
          (t) =>
            `  • [${t.status.toUpperCase()}] ${t.id}: ${t.description}${t.goal ? ` | Goal: ${t.goal}` : ''}${t.progressNotes ? ` | Notes: ${t.progressNotes}` : ''}`
        )
      );
    }

    const isContaminatedModelBoilerplate = (txt: string): boolean =>
      /\b(?:as an ai(?: language model| assistant)?|an ai doesn['’]?t have the ability|only text on a screen|reach(?:ing)? out to a trusted friend|housing support service|social worker|i hear how frustrating it is|i['’]?m just an ai|i am just a text-based)\b/i.test(
        txt || ''
      );

    const cleanRecentMsgs = recentMsgs.filter(
      (m) => m.role === 'user' || !isContaminatedModelBoilerplate(m.content)
    );
    const recentIds = new Set(cleanRecentMsgs.map((m) => m.id));

    if (cleanRecentMsgs.length > 0) {
      lines.push(
        `- RECENT CONSOLIDATED SQL CONVERSATION CONTINUITY FOR ${effectiveName.toUpperCase()} (remember this seamlessly across sessions):`,
        ...cleanRecentMsgs.map((m) => {
          const speaker = m.role === 'user' ? effectiveName : m.agentName || 'Lyrailius Omega';
          const snippet = m.content.replace(/\s+/g, ' ').slice(0, 260);
          return `  [${m.channel}] ${speaker}: ${snippet}`;
        })
      );
    }

    // Automatic Associative Deep Vault Recall across ALL historical turns for the current prompt
    if (opts.currentPrompt && opts.currentPrompt.trim().length >= 4) {
      try {
        const db = this.init();
        const stopWords = new Set([
          'what', 'when', 'where', 'which', 'who', 'whom', 'whose', 'why', 'how', 'that', 'this', 'these', 'those',
          'with', 'from', 'into', 'about', 'have', 'does', 'your', 'mine', 'ours', 'remember', 'recall', 'tell',
          'show', 'give', 'please', 'could', 'would', 'should', 'make', 'ensure', 'just', 'still', 'also'
        ]);
        const keywords = Array.from(
          new Set(
            opts.currentPrompt
              .toLowerCase()
              .replace(/[^a-z0-9_-]+/g, ' ')
              .split(/\s+/)
              .filter((w) => w.length >= 4 && !stopWords.has(w))
          )
        ).slice(0, 6);

        if (keywords.length > 0) {
          const whereClause = keywords.map(() => `LOWER(content) LIKE ?`).join(' OR ');
          const params = [user.id, ...keywords.map((k) => `%${k}%`), 12];
          const matchedHistory = db
            .prepare(`
              SELECT id, role, agent_name, channel, content, created_at
              FROM user_chat_messages
              WHERE user_id = ? AND (${whereClause})
              ORDER BY created_at DESC
              LIMIT ?
            `)
            .all(...params) as Record<string, any>[];

          const olderMatches = matchedHistory
            .filter(
              (r) =>
                !recentIds.has(String(r.id)) &&
                String(r.content || '').trim() !== opts.currentPrompt!.trim() &&
                (String(r.role) === 'user' || !isContaminatedModelBoilerplate(String(r.content || '')))
            )
            .slice(0, 6);

          if (olderMatches.length > 0) {
            lines.push(
              `- DEEP INFINITE VAULT ASSOCIATIVE RECALL (older historical turns matching current prompt):`,
              ...olderMatches.map((r) => {
                const speaker = String(r.role) === 'user' ? effectiveName : String(r.agent_name || 'Lyrailius Omega');
                return `  [${r.created_at} · ${r.channel}] ${speaker}: ${String(r.content || '').replace(/\s+/g, ' ').slice(0, 300)}`;
              })
            );
          }
        }
      } catch (_) {}
    }

    return lines.join('\n');
  }

  // ---- Per-User SQL Continuity State (Desktop Layout, Settings, Tasks, Voice) ----

  public getContinuityState(user: AuthUserPublic): UserSqlContinuityState {
    const db = this.init();
    this.ensureUserProvisioned(user, false);
    const row = db
      .prepare(`SELECT * FROM user_continuity_state WHERE user_id = ?`)
      .get(user.id) as Record<string, any> | undefined;
    if (!row) {
      return {
        revision: 1,
        updatedAt: new Date().toISOString(),
        shell: {},
        osCustomization: this.isFullHostAccessUser(user) ? {} : CLEAN_FIRST_TIME_OS_CUSTOMIZATION,
        chat: {},
        voiceDock: {}
      };
    }
    return {
      revision: Number(row.revision || 1),
      updatedAt: String(row.updated_at || new Date().toISOString()),
      shell: safeJsonParse<Record<string, any>>(row.shell_json, {}),
      osCustomization: safeJsonParse<Record<string, any>>(row.os_customization_json, {}),
      chat: safeJsonParse<Record<string, any>>(row.chat_settings_json, {}),
      voiceDock: safeJsonParse<Record<string, any>>(row.voice_dock_json, {})
    };
  }

  public mergeContinuityState(
    user: AuthUserPublic,
    patch: {
      shell?: Record<string, any>;
      osCustomization?: Record<string, any>;
      chat?: Record<string, any>;
      voiceDock?: Record<string, any>;
    }
  ): UserSqlContinuityState {
    const db = this.init();
    const cur = this.getContinuityState(user);
    const next: UserSqlContinuityState = {
      revision: cur.revision + 1,
      updatedAt: new Date().toISOString(),
      shell: patch.shell ? { ...cur.shell, ...patch.shell } : cur.shell,
      osCustomization: patch.osCustomization
        ? { ...cur.osCustomization, ...patch.osCustomization }
        : cur.osCustomization,
      chat: patch.chat ? { ...cur.chat, ...patch.chat } : cur.chat,
      voiceDock: patch.voiceDock ? { ...cur.voiceDock, ...patch.voiceDock } : cur.voiceDock
    };

    db.prepare(`
      INSERT INTO user_continuity_state (
        user_id, revision, shell_json, os_customization_json, chat_settings_json, voice_dock_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        revision = excluded.revision,
        shell_json = excluded.shell_json,
        os_customization_json = excluded.os_customization_json,
        chat_settings_json = excluded.chat_settings_json,
        voice_dock_json = excluded.voice_dock_json,
        updated_at = excluded.updated_at
    `).run(
      user.id,
      next.revision,
      JSON.stringify(next.shell),
      JSON.stringify(next.osCustomization),
      JSON.stringify(next.chat),
      JSON.stringify(next.voiceDock),
      next.updatedAt
    );

    return next;
  }

  public getVoiceContinuity(user: AuthUserPublic): UserSqlVoiceContinuity {
    const db = this.init();
    this.ensureUserProvisioned(user, false);
    const row = db
      .prepare(`SELECT * FROM user_voice_continuity WHERE user_id = ?`)
      .get(user.id) as Record<string, any> | undefined;
    if (!row) {
      return {
        sessionId: `voice-${user.id.slice(-8)}`,
        updatedAt: new Date().toISOString(),
        activeModule: 'chat',
        activeModulesList: ['chat'],
        relayHistory: [],
        transcripts: []
      };
    }
    return {
      sessionId: String(row.session_id || `voice-${user.id.slice(-8)}`),
      updatedAt: String(row.updated_at || new Date().toISOString()),
      activeModule: String(row.active_module || 'chat'),
      activeModulesList: safeJsonParse<string[]>(row.active_modules_json, []),
      relayHistory: safeJsonParse(row.relay_history_json, []),
      transcripts: safeJsonParse(row.transcripts_json, [])
    };
  }

  public saveVoiceContinuity(
    user: AuthUserPublic,
    patch: Partial<UserSqlVoiceContinuity>
  ): UserSqlVoiceContinuity {
    const db = this.init();
    const cur = this.getVoiceContinuity(user);
    const next: UserSqlVoiceContinuity = {
      sessionId: patch.sessionId || cur.sessionId,
      updatedAt: new Date().toISOString(),
      activeModule: patch.activeModule || cur.activeModule,
      activeModulesList: Array.isArray(patch.activeModulesList) ? patch.activeModulesList : cur.activeModulesList,
      relayHistory: Array.isArray(patch.relayHistory) ? patch.relayHistory.slice(-40) : cur.relayHistory,
      transcripts: Array.isArray(patch.transcripts) ? patch.transcripts.slice(-120) : cur.transcripts
    };

    db.prepare(`
      INSERT INTO user_voice_continuity (
        user_id, session_id, active_module, active_modules_json, relay_history_json, transcripts_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        session_id = excluded.session_id,
        active_module = excluded.active_module,
        active_modules_json = excluded.active_modules_json,
        relay_history_json = excluded.relay_history_json,
        transcripts_json = excluded.transcripts_json,
        updated_at = excluded.updated_at
    `).run(
      user.id,
      next.sessionId,
      next.activeModule,
      JSON.stringify(next.activeModulesList),
      JSON.stringify(next.relayHistory),
      JSON.stringify(next.transcripts),
      next.updatedAt
    );

    return next;
  }

  public listTasks(user: AuthUserPublic): UserSqlTaskRecord[] {
    const db = this.init();
    this.ensureUserProvisioned(user, false);
    const rows = db
      .prepare(`SELECT * FROM user_tasks WHERE user_id = ? ORDER BY updated_at DESC LIMIT 80`)
      .all(user.id) as Record<string, any>[];

    return rows.map((r) => ({
      id: String(r.id),
      description: String(r.description || ''),
      status: (r.status === 'completed' || r.status === 'interrupted' ? r.status : 'active') as UserSqlTaskRecord['status'],
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
      agentId: r.agent_id ? String(r.agent_id) : undefined,
      agentName: r.agent_name ? String(r.agent_name) : undefined,
      goal: r.goal ? String(r.goal) : undefined,
      cycle: Number(r.cycle || 1),
      lastAction: r.last_action ? String(r.last_action) : undefined,
      progressNotes: r.progress_notes ? String(r.progress_notes) : undefined,
      source: r.source ? String(r.source) : undefined,
      sessionId: r.session_id ? String(r.session_id) : undefined,
      actionLog: safeJsonParse<any[]>(r.action_log_json, []),
      checkpointJson: r.checkpoint_json ? String(r.checkpoint_json) : undefined
    }));
  }

  public upsertTask(user: AuthUserPublic, task: Partial<UserSqlTaskRecord> & { id: string }): UserSqlTaskRecord {
    const db = this.init();
    this.ensureUserProvisioned(user, false);
    const now = new Date().toISOString();
    const existing = db
      .prepare(`SELECT * FROM user_tasks WHERE user_id = ? AND id = ?`)
      .get(user.id, task.id) as Record<string, any> | undefined;

    const merged: UserSqlTaskRecord = {
      id: task.id.slice(0, 128),
      description: task.description ?? String(existing?.description || ''),
      status: task.status ?? ((existing?.status as UserSqlTaskRecord['status']) || 'active'),
      createdAt: String(existing?.created_at || now),
      updatedAt: now,
      agentId: task.agentId ?? (existing?.agent_id ? String(existing.agent_id) : ''),
      agentName: task.agentName ?? (existing?.agent_name ? String(existing.agent_name) : ''),
      goal: task.goal ?? (existing?.goal ? String(existing.goal) : ''),
      cycle: typeof task.cycle === 'number' ? task.cycle : Number(existing?.cycle || 1),
      lastAction: task.lastAction ?? (existing?.last_action ? String(existing.last_action) : ''),
      progressNotes: task.progressNotes ?? (existing?.progress_notes ? String(existing.progress_notes) : ''),
      source: task.source ?? (existing?.source ? String(existing.source) : 'workflow'),
      sessionId: task.sessionId ?? (existing?.session_id ? String(existing.session_id) : ''),
      actionLog: Array.isArray(task.actionLog) ? task.actionLog.slice(-60) : safeJsonParse(existing?.action_log_json, []),
      checkpointJson: task.checkpointJson ?? (existing?.checkpoint_json ? String(existing.checkpoint_json) : '')
    };

    db.prepare(`
      INSERT INTO user_tasks (
        user_id, id, description, status, agent_id, agent_name, goal, cycle,
        last_action, progress_notes, source, session_id, action_log_json, checkpoint_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, id) DO UPDATE SET
        description = excluded.description,
        status = excluded.status,
        agent_id = excluded.agent_id,
        agent_name = excluded.agent_name,
        goal = excluded.goal,
        cycle = excluded.cycle,
        last_action = excluded.last_action,
        progress_notes = excluded.progress_notes,
        source = excluded.source,
        session_id = excluded.session_id,
        action_log_json = excluded.action_log_json,
        checkpoint_json = excluded.checkpoint_json,
        updated_at = excluded.updated_at
    `).run(
      user.id,
      merged.id,
      merged.description,
      merged.status,
      merged.agentId || '',
      merged.agentName || '',
      merged.goal || '',
      merged.cycle || 1,
      merged.lastAction || '',
      merged.progressNotes || '',
      merged.source || 'workflow',
      merged.sessionId || '',
      JSON.stringify(merged.actionLog || []),
      merged.checkpointJson || '',
      merged.createdAt,
      merged.updatedAt
    );

    return merged;
  }

  public deleteTask(user: AuthUserPublic, taskId: string): boolean {
    const db = this.init();
    const res = db
      .prepare(`DELETE FROM user_tasks WHERE user_id = ? AND id = ?`)
      .run(user.id, taskId);
    return Number(res.changes || 0) > 0;
  }

  // ---- Admin Consolidated SQL Overview ----
  public getAdminConsolidatedOverview(): {
    engine: string;
    totalUsersProvisioned: number;
    totalChatMessages: number;
    totalMemoryFacts: number;
    totalTasks: number;
    users: AdminSqlConsolidatedUserSummary[];
  } {
    const db = this.init();
    const profiles = db
      .prepare(`SELECT * FROM user_profiles ORDER BY is_executive_architect DESC, last_seen_at DESC`)
      .all() as Record<string, any>[];

    const chatCounts = new Map<string, number>();
    for (const row of db
      .prepare(`SELECT user_id, COUNT(*) AS cnt FROM user_chat_messages GROUP BY user_id`)
      .all() as Record<string, any>[]) {
      chatCounts.set(String(row.user_id), Number(row.cnt || 0));
    }

    const memCounts = new Map<string, number>();
    for (const row of db
      .prepare(`SELECT user_id, COUNT(*) AS cnt FROM user_agent_memories GROUP BY user_id`)
      .all() as Record<string, any>[]) {
      memCounts.set(String(row.user_id), Number(row.cnt || 0));
    }

    const taskCounts = new Map<string, number>();
    for (const row of db
      .prepare(`SELECT user_id, COUNT(*) AS cnt FROM user_tasks GROUP BY user_id`)
      .all() as Record<string, any>[]) {
      taskCounts.set(String(row.user_id), Number(row.cnt || 0));
    }

    let totalChatMessages = 0;
    let totalMemoryFacts = 0;
    let totalTasks = 0;

    const users: AdminSqlConsolidatedUserSummary[] = profiles.map((p) => {
      const uid = String(p.user_id);
      const cc = chatCounts.get(uid) || 0;
      const mc = memCounts.get(uid) || 0;
      const tc = taskCounts.get(uid) || 0;
      totalChatMessages += cc;
      totalMemoryFacts += mc;
      totalTasks += tc;
      return {
        userId: uid,
        username: String(p.username),
        displayName: String(p.display_name),
        preferredName: String(p.preferred_name || ''),
        preferredNameConfirmed: Boolean(p.preferred_name_confirmed),
        isExecutiveArchitect: Boolean(p.is_executive_architect),
        role: String(p.role),
        workspaceRoot: String(p.workspace_root),
        desktopInitialized: Boolean(p.desktop_initialized),
        totalSessions: Number(p.total_sessions || 1),
        chatMessageCount: cc,
        memoryFactCount: mc,
        taskCount: tc,
        lastSeenAt: String(p.last_seen_at)
      };
    });

    return {
      engine: 'SQLite WAL (Consolidated Per-User Relational Store)',
      totalUsersProvisioned: users.length,
      totalChatMessages,
      totalMemoryFacts,
      totalTasks,
      users
    };
  }

  public searchVaultAcrossSql(query: string, limit = 15): Array<{ source: string; category: string; timestamp: string; summary: string }> {
    const db = this.init();
    const safeLimit = Math.max(1, Math.min(50, limit));
    const q = String(query || '').trim().toLowerCase();
    const isTainted = (txt: string): boolean =>
      /\b(?:as an ai(?: language model| assistant)?|an ai doesn['’]?t have the ability|only text on a screen|reach(?:ing)? out to a trusted friend|housing support service|social worker|i hear how frustrating it is|i['’]?m just an ai|i am just a text-based)\b/i.test(
        txt || ''
      );

    const results: Array<{ source: string; category: string; timestamp: string; summary: string }> = [];

    try {
      const memRows = (q
        ? db
            .prepare(
              `SELECT category, memory_key, memory_value, updated_at FROM user_agent_memories WHERE LOWER(memory_value) LIKE ? OR LOWER(COALESCE(memory_key, '')) LIKE ? ORDER BY updated_at DESC LIMIT ?`
            )
            .all(`%${q}%`, `%${q}%`, safeLimit)
        : db
            .prepare(`SELECT category, memory_key, memory_value, updated_at FROM user_agent_memories ORDER BY updated_at DESC LIMIT ?`)
            .all(safeLimit)) as Record<string, any>[];
      for (const r of memRows) {
        results.push({
          source: 'sovereign_users.user_agent_memories',
          category: String(r.category || 'fact'),
          timestamp: String(r.updated_at || ''),
          summary: `${r.memory_key ? `[${r.memory_key}] ` : ''}${String(r.memory_value || '').slice(0, 400)}`
        });
      }
    } catch {}

    try {
      const taskRows = (q
        ? db
            .prepare(`SELECT description, status, updated_at FROM user_tasks WHERE LOWER(description) LIKE ? ORDER BY updated_at DESC LIMIT ?`)
            .all(`%${q}%`, safeLimit)
        : db.prepare(`SELECT description, status, updated_at FROM user_tasks ORDER BY updated_at DESC LIMIT ?`).all(Math.min(8, safeLimit))) as Record<
        string,
        any
      >[];
      for (const r of taskRows) {
        results.push({
          source: 'sovereign_users.user_tasks',
          category: String(r.status || 'active'),
          timestamp: String(r.updated_at || ''),
          summary: String(r.description || '').slice(0, 400)
        });
      }
    } catch {}

    try {
      const msgRows = (q
        ? db
            .prepare(
              `SELECT role, agent_name, channel, content, created_at FROM user_chat_messages WHERE LOWER(content) LIKE ? ORDER BY created_at DESC LIMIT ?`
            )
            .all(`%${q}%`, safeLimit * 2)
        : db
            .prepare(`SELECT role, agent_name, channel, content, created_at FROM user_chat_messages ORDER BY created_at DESC LIMIT ?`)
            .all(safeLimit)) as Record<string, any>[];
      for (const r of msgRows) {
        const content = String(r.content || '');
        if (r.role !== 'user' && isTainted(content)) continue;
        results.push({
          source: 'sovereign_users.user_chat_messages',
          category: `${String(r.channel || 'main-chat')}:${String(r.role || 'user')}`,
          timestamp: String(r.created_at || ''),
          summary: `[${r.role === 'user' ? 'User' : r.agent_name || 'Lyrailius Omega'}] ${content.replace(/\s+/g, ' ').slice(0, 380)}`
        });
        if (results.length >= safeLimit * 2) break;
      }
    } catch {}

    return results.slice(0, safeLimit * 2);
  }
}

export const userSqlMemoryService = new UserSqlMemoryService();
