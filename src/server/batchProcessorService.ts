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
import type { GoogleGenAI } from '@google/genai';
import { getKernelDb } from './kernelDb';
import {
  autonomyReadFile,
  autonomyWriteFile,
  autonomyRollbackPatch,
  resolveUniversalPath
} from './workspaceAutonomy';
import { executeDynamicToolCode, touchAutonomyActivity } from './autonomyEngine';
import { userSqlMemoryService } from './userSqlMemoryService';
import { sovereignQuantumKernel } from '../utils/sovereignQuantumKernel';
import type { AuthUserPublic } from '../types/auth';

export type BatchJobPriority = 'critical' | 'high' | 'normal' | 'low';
export type BatchJobStatus = 'queued' | 'running' | 'paused' | 'completed' | 'completed_with_errors' | 'failed' | 'cancelled';
export type BatchTaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export type BatchOperationType =
  | 'file_regex_replace'
  | 'file_format_normalize'
  | 'file_convert_projection'
  | 'file_hash_manifest'
  | 'file_ai_transform'
  | 'data_json_csv_etl'
  | 'data_js_transform'
  | 'data_ai_process';

export interface BatchOperationConfig {
  // File regex / search-replace
  searchPattern?: string;
  replaceWith?: string;
  isRegex?: boolean;
  regexFlags?: string;
  dryRun?: boolean;
  verifyCompile?: boolean;

  // Format & normalization
  normalizeLineEndings?: boolean;
  trimTrailingWhitespace?: boolean;
  collapseBlankLines?: boolean;
  jsonMode?: 'none' | 'pretty' | 'minify';
  headerBanner?: string;

  // File conversion / output projection
  targetFormat?: 'json' | 'csv' | 'ndjson' | 'tsv' | 'html' | 'md' | 'txt';
  outputDir?: string;
  outputSuffix?: string;
  inPlace?: boolean;
  manifestOutputPath?: string;

  // ETL parameters
  inputFormat?: 'auto' | 'json' | 'csv' | 'ndjson' | 'tsv';
  outputFormat?: 'json' | 'csv' | 'ndjson' | 'tsv' | 'text' | 'markdown';
  selectFields?: string[];
  filterField?: string;
  filterOp?: 'eq' | 'neq' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte' | 'exists';
  filterValue?: string;
  dedupeKey?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';

  // JS Sandbox
  jsCode?: string;

  // AI Transform / Data Process
  instruction?: string;
  preferredModel?: string;

  // Scope
  scope?: 'auto' | 'orchestrator' | 'target' | 'host';
}

export interface BatchTaskInput {
  label?: string;
  filePath?: string;
  outputPath?: string;
  inputData?: string;
  operationOverride?: BatchOperationType;
  configOverride?: Partial<BatchOperationConfig>;
}

export interface BatchTaskRecord {
  id: string;
  jobId: string;
  seq: number;
  label: string;
  operation: BatchOperationType;
  status: BatchTaskStatus;
  filePath: string | null;
  outputPath: string | null;
  inputPreview: string;
  inputPayload: string;
  config: BatchOperationConfig;
  attempts: number;
  maxRetries: number;
  bytesProcessed: number;
  recordsProcessed: number;
  patchId: string | null;
  diff: string | null;
  outputSummary: string | null;
  outputData: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  elapsedMs: number;
}

export interface BatchJobRecord {
  id: string;
  name: string;
  description: string;
  category: 'file_transformation' | 'data_processing' | 'hybrid';
  operation: BatchOperationType;
  priority: BatchJobPriority;
  status: BatchJobStatus;
  config: BatchOperationConfig;
  ownerUserId: string;
  ownerUsername: string;
  isSandboxed: boolean;
  workspaceRoot: string;
  maxRetries: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  cancelledTasks: number;
  runningTasks: number;
  queuedTasks: number;
  progressPct: number;
  bytesProcessed: number;
  recordsProcessed: number;
  patchIds: string[];
  manifestPath: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  elapsedMs: number;
}

export interface CreateBatchJobInput {
  name: string;
  description?: string;
  operation: BatchOperationType;
  priority?: BatchJobPriority;
  config?: BatchOperationConfig;
  tasks?: BatchTaskInput[];
  // Optional directory discovery shortcut when creating a job directly
  scanDir?: {
    dirPath: string;
    extensions?: string[];
    namePattern?: string;
    recursive?: boolean;
    maxFiles?: number;
  };
  maxRetries?: number;
  startPaused?: boolean;
}

export interface BatchProcessorDeps {
  getAiClient: () => GoogleGenAI;
  hasGeminiKey: () => boolean;
  getCascadeModels: (preferred?: string) => string[];
  onBatchEvent?: (event: { type: string; jobId?: string; taskId?: string; summary: string }) => void;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const FALLBACK_DB_FILE = path.join(DATA_DIR, 'kernel_production.db');

const IGNORED_SCAN_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  '.aistudio',
  '.next',
  'coverage',
  '.cache',
  '__pycache__'
]);

const PRIORITY_WEIGHT: Record<BatchJobPriority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1
};

function nowIso(): string {
  return new Date().toISOString();
}

function sha256Hex(content: string | Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function sha512Hex(content: string | Buffer): string {
  return crypto.createHash('sha512').update(content).digest('hex');
}

function computeShannonEntropy(text: string): number {
  const buf = Buffer.from(text, 'utf-8');
  if (buf.length === 0) return 0;
  const freq = new Array<number>(256).fill(0);
  for (let i = 0; i < buf.length; i++) {
    freq[buf[i]]++;
  }
  let entropy = 0;
  const len = buf.length;
  for (let i = 0; i < 256; i++) {
    if (freq[i] > 0) {
      const p = freq[i] / len;
      entropy -= p * Math.log2(p);
    }
  }
  return Number(entropy.toFixed(4));
}

function parseDelimitedText(raw: string, delimiter: string): Array<Record<string, any>> {
  const normalized = raw.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    const next = normalized[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentCell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentCell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (ch === '\n') {
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += ch;
      }
    }
  }
  currentRow.push(currentCell.trim());
  if (currentRow.some((c) => c.length > 0)) {
    rows.push(currentRow);
  }

  if (rows.length === 0) return [];
  const headers = rows[0].map((h, idx) => h || `col_${idx + 1}`);
  const objects: Array<Record<string, any>> = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const obj: Record<string, any> = {};
    for (let c = 0; c < headers.length; c++) {
      const rawVal = row[c] ?? '';
      if (rawVal !== '' && !Number.isNaN(Number(rawVal)) && /^-?\d+(\.\d+)?$/.test(rawVal)) {
        obj[headers[c]] = Number(rawVal);
      } else if (rawVal.toLowerCase() === 'true') {
        obj[headers[c]] = true;
      } else if (rawVal.toLowerCase() === 'false') {
        obj[headers[c]] = false;
      } else {
        obj[headers[c]] = rawVal;
      }
    }
    objects.push(obj);
  }
  return objects;
}

function serializeDelimitedRecords(records: Array<Record<string, any>>, delimiter: string): string {
  if (records.length === 0) return '';
  const headerSet = new Set<string>();
  for (const rec of records) {
    if (rec && typeof rec === 'object') {
      Object.keys(rec).forEach((k) => headerSet.add(k));
    }
  }
  const headers = Array.from(headerSet);
  const escapeCell = (val: any): string => {
    const s = val === null || val === undefined
      ? ''
      : typeof val === 'object'
        ? JSON.stringify(val)
        : String(val);
    if (s.includes(delimiter) || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [headers.map(escapeCell).join(delimiter)];
  for (const rec of records) {
    lines.push(headers.map((h) => escapeCell(rec?.[h])).join(delimiter));
  }
  return lines.join('\n');
}

function parseRecordsAuto(raw: string, format: BatchOperationConfig['inputFormat'] = 'auto'): Array<Record<string, any>> {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const effectiveFormat = (() => {
    if (format && format !== 'auto') return format;
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length > 1 && lines.every((l) => l.startsWith('{') && l.endsWith('}'))) {
        return 'ndjson';
      }
      return 'json';
    }
    const firstLine = trimmed.split('\n')[0] || '';
    if (firstLine.includes('\t') && !firstLine.includes(',')) return 'tsv';
    return 'csv';
  })();

  if (effectiveFormat === 'json') {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => (item && typeof item === 'object' ? item : { value: item }));
    }
    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.records)) return parsed.records;
      if (Array.isArray(parsed.items)) return parsed.items;
      if (Array.isArray(parsed.data)) return parsed.data;
      return [parsed];
    }
    return [{ value: parsed }];
  }

  if (effectiveFormat === 'ndjson') {
    return trimmed
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }

  if (effectiveFormat === 'tsv') {
    return parseDelimitedText(trimmed, '\t');
  }

  return parseDelimitedText(trimmed, ',');
}

function serializeRecords(records: Array<Record<string, any>>, format: BatchOperationConfig['outputFormat'] = 'json'): string {
  if (format === 'csv') return serializeDelimitedRecords(records, ',');
  if (format === 'tsv') return serializeDelimitedRecords(records, '\t');
  if (format === 'ndjson') return records.map((r) => JSON.stringify(r)).join('\n');
  if (format === 'markdown') {
    if (records.length === 0) return '_No records matched._';
    const headers = Object.keys(records[0]);
    const sep = headers.map(() => '---');
    const body = records.slice(0, 200).map((r) => headers.map((h) => String(r[h] ?? '').replace(/\|/g, '\\|')).join(' | '));
    return [
      `| ${headers.join(' | ')} |`,
      `| ${sep.join(' | ')} |`,
      ...body.map((row) => `| ${row} |`)
    ].join('\n');
  }
  return JSON.stringify(records, null, 2);
}

function markdownToHtmlDocument(md: string, title: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const htmlLines: string[] = [];
  let inCode = false;
  let inList = false;

  const escapeHtml = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const formatInline = (s: string) =>
    escapeHtml(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (inList) {
        htmlLines.push('</ul>');
        inList = false;
      }
      if (!inCode) {
        htmlLines.push('<pre><code>');
        inCode = true;
      } else {
        htmlLines.push('</code></pre>');
        inCode = false;
      }
      continue;
    }
    if (inCode) {
      htmlLines.push(escapeHtml(line));
      continue;
    }
    const trimmed = line.trim();
    if (!trimmed) {
      if (inList) {
        htmlLines.push('</ul>');
        inList = false;
      }
      continue;
    }
    if (trimmed.startsWith('### ')) {
      if (inList) { htmlLines.push('</ul>'); inList = false; }
      htmlLines.push(`<h3>${formatInline(trimmed.slice(4))}</h3>`);
    } else if (trimmed.startsWith('## ')) {
      if (inList) { htmlLines.push('</ul>'); inList = false; }
      htmlLines.push(`<h2>${formatInline(trimmed.slice(3))}</h2>`);
    } else if (trimmed.startsWith('# ')) {
      if (inList) { htmlLines.push('</ul>'); inList = false; }
      htmlLines.push(`<h1>${formatInline(trimmed.slice(2))}</h1>`);
    } else if (/^[-*]\s+/.test(trimmed)) {
      if (!inList) {
        htmlLines.push('<ul>');
        inList = true;
      }
      htmlLines.push(`<li>${formatInline(trimmed.replace(/^[-*]\s+/, ''))}</li>`);
    } else {
      if (inList) { htmlLines.push('</ul>'); inList = false; }
      htmlLines.push(`<p>${formatInline(trimmed)}</p>`);
    }
  }
  if (inList) htmlLines.push('</ul>');
  if (inCode) htmlLines.push('</code></pre>');

  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8" />',
    `  <title>${escapeHtml(title)}</title>`,
    '</head>',
    '<body>',
    ...htmlLines.map((l) => `  ${l}`),
    '</body>',
    '</html>'
  ].join('\n');
}

function stripOuterMarkdownCodeFence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```[a-zA-Z0-9_-]*\r?\n([\s\S]*?)\r?\n```$/);
  return match ? match[1] : trimmed;
}

class AutonomousBatchProcessorService {
  private db: any = null;
  private deps: BatchProcessorDeps | null = null;
  private initialized = false;
  private isPaused = false;
  private concurrency = 3;
  private activeTaskIds = new Set<string>();
  private cancelledJobIds = new Set<string>();
  private pumpScheduled = false;
  private totalTasksExecutedSinceBoot = 0;

  public async init(deps: BatchProcessorDeps): Promise<void> {
    this.deps = deps;
    if (this.initialized && this.db) return;

    fs.mkdirSync(DATA_DIR, { recursive: true });
    let db = getKernelDb();
    if (!db) {
      try {
        const sqliteMod: any = await import('node:sqlite' as any);
        if (sqliteMod?.DatabaseSync) {
          db = new sqliteMod.DatabaseSync(FALLBACK_DB_FILE);
          db.exec('PRAGMA journal_mode = WAL;');
        }
      } catch (err: any) {
        console.warn('[BatchProcessor] SQLite open warning:', err?.message || err);
      }
    }

    if (db) {
      this.db = db;
      this.ensureTables();
      this.recoverInterruptedWork();
    }
    this.initialized = true;
    this.schedulePump();
  }

  private getDb(): any {
    if (!this.db) {
      const kdb = getKernelDb();
      if (kdb) {
        this.db = kdb;
        this.ensureTables();
      }
    }
    if (!this.db) {
      throw new Error('Batch Processor SQLite database is not initialized.');
    }
    return this.db;
  }

  private ensureTables(): void {
    const db = this.db;
    if (!db) return;
    db.exec(`
      CREATE TABLE IF NOT EXISTS batch_jobs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL DEFAULT 'file_transformation',
        operation TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'normal',
        priority_weight INTEGER NOT NULL DEFAULT 2,
        status TEXT NOT NULL DEFAULT 'queued',
        config_json TEXT NOT NULL DEFAULT '{}',
        owner_user_id TEXT NOT NULL DEFAULT 'uid_0',
        owner_username TEXT NOT NULL DEFAULT 'Lyrailius Omega',
        is_sandboxed INTEGER NOT NULL DEFAULT 0,
        workspace_root TEXT NOT NULL DEFAULT '',
        max_retries INTEGER NOT NULL DEFAULT 1,
        total_tasks INTEGER NOT NULL DEFAULT 0,
        completed_tasks INTEGER NOT NULL DEFAULT 0,
        failed_tasks INTEGER NOT NULL DEFAULT 0,
        cancelled_tasks INTEGER NOT NULL DEFAULT 0,
        bytes_processed INTEGER NOT NULL DEFAULT 0,
        records_processed INTEGER NOT NULL DEFAULT 0,
        patch_ids_json TEXT NOT NULL DEFAULT '[]',
        manifest_path TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        started_at TEXT,
        completed_at TEXT,
        elapsed_ms INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS batch_tasks (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        seq INTEGER NOT NULL DEFAULT 0,
        label TEXT NOT NULL,
        operation TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'queued',
        file_path TEXT,
        output_path TEXT,
        input_preview TEXT NOT NULL DEFAULT '',
        input_payload TEXT NOT NULL DEFAULT '',
        config_json TEXT NOT NULL DEFAULT '{}',
        attempts INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 1,
        bytes_processed INTEGER NOT NULL DEFAULT 0,
        records_processed INTEGER NOT NULL DEFAULT 0,
        patch_id TEXT,
        diff TEXT,
        output_summary TEXT,
        output_data TEXT,
        error_message TEXT,
        started_at TEXT,
        completed_at TEXT,
        elapsed_ms INTEGER NOT NULL DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_batch_tasks_job_seq ON batch_tasks(job_id, seq);
      CREATE INDEX IF NOT EXISTS idx_batch_tasks_status ON batch_tasks(status);
      CREATE INDEX IF NOT EXISTS idx_batch_jobs_status_prio ON batch_jobs(status, priority_weight DESC, created_at ASC);
    `);
  }

  private recoverInterruptedWork(): void {
    const db = this.db;
    if (!db) return;
    const ts = nowIso();
    db.prepare(`UPDATE batch_tasks SET status = 'queued' WHERE status = 'running'`).run();
    db.prepare(`UPDATE batch_jobs SET status = 'queued', updated_at = ? WHERE status = 'running'`).run(ts);
  }

  private inferCategory(op: BatchOperationType): 'file_transformation' | 'data_processing' | 'hybrid' {
    if (op.startsWith('file_')) return 'file_transformation';
    if (op.startsWith('data_')) return 'data_processing';
    return 'hybrid';
  }

  private resolveActorContext(actor?: AuthUserPublic | null): {
    ownerUserId: string;
    ownerUsername: string;
    isSandboxed: boolean;
    workspaceRoot: string;
  } {
    if (actor && !userSqlMemoryService.isFullHostAccessUser(actor)) {
      const workspaceRoot = userSqlMemoryService.getUserWorkspaceRoot(actor);
      return {
        ownerUserId: actor.id,
        ownerUsername: actor.username || actor.displayName || 'operator',
        isSandboxed: true,
        workspaceRoot
      };
    }
    return {
      ownerUserId: actor?.id || 'uid_0',
      ownerUsername: actor?.username || actor?.displayName || 'JHammerZ (UID 0)',
      isSandboxed: false,
      workspaceRoot: process.cwd()
    };
  }

  private enforcePathAccess(
    rawPath: string,
    mode: 'read' | 'write' | 'list',
    job: { isSandboxed: boolean; workspaceRoot: string; config: BatchOperationConfig }
  ): { resolvedPath: string; displayPath: string; scope: 'orchestrator' | 'target' | 'host' } {
    if (job.isSandboxed) {
      const root = path.resolve(job.workspaceRoot);
      fs.mkdirSync(root, { recursive: true });
      const cleanedRel = String(rawPath || '').replace(/^\/+/, '').trim();
      const candidate = path.resolve(root, cleanedRel || '.');
      if (candidate !== root && !candidate.startsWith(root + path.sep)) {
        throw new Error(`Access denied: "${rawPath}" is outside your isolated workspace.`);
      }
      const rel = path.relative(root, candidate).split(path.sep).join('/') || '.';
      return { resolvedPath: candidate, displayPath: rel, scope: 'target' };
    }

    const uni = resolveUniversalPath(rawPath, mode, { scope: job.config?.scope || 'auto' });
    return {
      resolvedPath: uni.targetPath,
      displayPath: uni.cleaned,
      scope: uni.scope
    };
  }

  public previewTargetFiles(
    params: {
      dirPath?: string;
      extensions?: string[];
      namePattern?: string;
      recursive?: boolean;
      maxFiles?: number;
      scope?: 'auto' | 'orchestrator' | 'target' | 'host';
    },
    actor?: AuthUserPublic | null
  ): {
    rootResolved: string;
    matchedFiles: Array<{ path: string; sizeBytes: number; ext: string; modifiedAt: string }>;
    truncated: boolean;
  } {
    const actorCtx = this.resolveActorContext(actor);
    const dirInput = String(params.dirPath || (actorCtx.isSandboxed ? '.' : 'src/utils')).trim() || '.';
    const { resolvedPath: baseDir } = this.enforcePathAccess(dirInput, 'list', {
      isSandboxed: actorCtx.isSandboxed,
      workspaceRoot: actorCtx.workspaceRoot,
      config: { scope: params.scope || 'auto' }
    });

    if (!fs.existsSync(baseDir)) {
      throw new Error(`Directory not found: ${dirInput}`);
    }
    const stat = fs.statSync(baseDir);
    if (!stat.isDirectory()) {
      const relSingle = actorCtx.isSandboxed
        ? path.relative(actorCtx.workspaceRoot, baseDir).split(path.sep).join('/')
        : path.relative(process.cwd(), baseDir).split(path.sep).join('/');
      return {
        rootResolved: baseDir,
        matchedFiles: [{
          path: relSingle.startsWith('..') ? baseDir : relSingle,
          sizeBytes: stat.size,
          ext: path.extname(baseDir).toLowerCase(),
          modifiedAt: stat.mtime.toISOString()
        }],
        truncated: false
      };
    }

    const normalizedExts = (Array.isArray(params.extensions) ? params.extensions : [])
      .map((e) => String(e).trim().toLowerCase())
      .filter(Boolean)
      .map((e) => (e.startsWith('.') ? e : `.${e}`));

    const rawPattern = String(params.namePattern || '').trim();
    let regexFilter: RegExp | null = null;
    if (rawPattern) {
      try {
        if (rawPattern.includes('*') && !rawPattern.startsWith('^')) {
          const globEscaped = rawPattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&')
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');
          regexFilter = new RegExp(globEscaped, 'i');
        } else {
          regexFilter = new RegExp(rawPattern, 'i');
        }
      } catch {
        regexFilter = new RegExp(rawPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      }
    }

    const recursive = params.recursive !== false;
    const maxFiles = Math.max(1, Math.min(250, Number(params.maxFiles) || 60));
    const matchedFiles: Array<{ path: string; sizeBytes: number; ext: string; modifiedAt: string }> = [];
    let truncated = false;

    const walk = (dir: string, depth: number) => {
      if (depth > 8 || truncated) return;
      let entries: fs.Dirent[] = [];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      entries.sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of entries) {
        if (truncated) break;
        if (entry.name === '.vault.key' || entry.name === '.secrets.vault.enc') continue;
        if (entry.isDirectory()) {
          if (IGNORED_SCAN_DIRS.has(entry.name)) continue;
          if (recursive) {
            walk(path.join(dir, entry.name), depth + 1);
          }
          continue;
        }
        if (!entry.isFile()) continue;

        const fullPath = path.join(dir, entry.name);
        const ext = path.extname(entry.name).toLowerCase();
        if (normalizedExts.length > 0 && !normalizedExts.includes(ext)) continue;

        const relDisplay = actorCtx.isSandboxed
          ? path.relative(actorCtx.workspaceRoot, fullPath).split(path.sep).join('/')
          : path.relative(process.cwd(), fullPath).split(path.sep).join('/');
        const cleanRel = relDisplay.startsWith('..') ? fullPath : relDisplay;

        if (regexFilter && !regexFilter.test(cleanRel) && !regexFilter.test(entry.name)) {
          continue;
        }

        let fStat: fs.Stats;
        try {
          fStat = fs.statSync(fullPath);
        } catch {
          continue;
        }
        if (fStat.size > 8 * 1024 * 1024) continue; // skip >8MB binary blobs in text batch discovery

        if (matchedFiles.length >= maxFiles) {
          truncated = true;
          return;
        }
        matchedFiles.push({
          path: cleanRel,
          sizeBytes: fStat.size,
          ext,
          modifiedAt: fStat.mtime.toISOString()
        });
      }
    };

    walk(baseDir, 0);
    return { rootResolved: baseDir, matchedFiles, truncated };
  }

  public createJob(input: CreateBatchJobInput, actor?: AuthUserPublic | null): {
    job: BatchJobRecord;
    tasks: BatchTaskRecord[];
  } {
    const db = this.getDb();
    const actorCtx = this.resolveActorContext(actor);
    const normalizeOpConfig = (rawCfg?: Record<string, any>): BatchOperationConfig => {
      if (!rawCfg || typeof rawCfg !== 'object') return {};
      const next: BatchOperationConfig = { ...rawCfg };
      if (next.searchPattern === undefined && typeof rawCfg.pattern === 'string') {
        next.searchPattern = rawCfg.pattern;
        if (next.isRegex === undefined) next.isRegex = true;
      }
      if (next.searchPattern === undefined && typeof rawCfg.find === 'string') {
        next.searchPattern = rawCfg.find;
      }
      if (next.replaceWith === undefined && typeof rawCfg.replacement === 'string') {
        next.replaceWith = rawCfg.replacement;
      }
      if (next.regexFlags === undefined && typeof rawCfg.flags === 'string') {
        next.regexFlags = rawCfg.flags;
      }
      if (next.jsCode === undefined && typeof rawCfg.expression === 'string') {
        next.jsCode = `return (${rawCfg.expression});`;
      }
      if (next.jsCode === undefined && typeof rawCfg.code === 'string') {
        next.jsCode = rawCfg.code;
      }
      return next;
    };

    const rawFirstTask = Array.isArray(input.tasks) && input.tasks.length > 0 ? (input.tasks[0] as any) : null;
    const operation: BatchOperationType =
      input.operation ||
      (input as any).kind ||
      rawFirstTask?.operationOverride ||
      rawFirstTask?.operation ||
      rawFirstTask?.kind ||
      'file_format_normalize';
    const priority: BatchJobPriority =
      input.priority && PRIORITY_WEIGHT[input.priority] ? input.priority : 'normal';
    const config: BatchOperationConfig = normalizeOpConfig(input.config as any);
    const maxRetries = Math.max(0, Math.min(5, Number(input.maxRetries ?? 1)));

    const rawTasks: BatchTaskInput[] = Array.isArray(input.tasks)
      ? input.tasks.map((rawItem: any) => ({
          ...rawItem,
          filePath: rawItem.filePath ?? rawItem.targetPath ?? rawItem.sourcePath ?? rawItem.path,
          operationOverride: rawItem.operationOverride ?? rawItem.operation ?? rawItem.kind,
          configOverride: normalizeOpConfig(rawItem.configOverride ?? rawItem.config)
        }))
      : [];

    // Expand directory scan if provided
    if (input.scanDir && input.scanDir.dirPath) {
      const discovered = this.previewTargetFiles(
        {
          dirPath: input.scanDir.dirPath,
          extensions: input.scanDir.extensions,
          namePattern: input.scanDir.namePattern,
          recursive: input.scanDir.recursive,
          maxFiles: input.scanDir.maxFiles,
          scope: config.scope
        },
        actor
      );
      for (const f of discovered.matchedFiles) {
        if (!rawTasks.some((t) => t.filePath === f.path)) {
          rawTasks.push({
            label: path.basename(f.path),
            filePath: f.path
          });
        }
      }
    }

    if (rawTasks.length === 0) {
      throw new Error('At least one file target or data processing task item is required to enqueue a batch job.');
    }

    const jobId = `batch-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
    const createdAt = nowIso();
    const initialStatus: BatchJobStatus = input.startPaused ? 'paused' : 'queued';
    const hasMixedOps = rawTasks.some((t) => t.operationOverride && t.operationOverride !== operation);
    const jobName = String(input.name || `${operation} (${rawTasks.length} items)`).trim();
    const jobDesc = String(input.description || '').trim();
    const category = hasMixedOps ? 'hybrid' : this.inferCategory(operation);

    db.prepare(`
      INSERT INTO batch_jobs (
        id, name, description, category, operation, priority, priority_weight,
        status, config_json, owner_user_id, owner_username, is_sandboxed, workspace_root,
        max_retries, total_tasks, completed_tasks, failed_tasks, cancelled_tasks,
        bytes_processed, records_processed, patch_ids_json, manifest_path,
        created_at, updated_at, started_at, completed_at, elapsed_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, '[]', NULL, ?, ?, NULL, NULL, 0)
    `).run(
      jobId,
      jobName,
      jobDesc,
      category,
      operation,
      priority,
      PRIORITY_WEIGHT[priority],
      initialStatus,
      JSON.stringify(config),
      actorCtx.ownerUserId,
      actorCtx.ownerUsername,
      actorCtx.isSandboxed ? 1 : 0,
      actorCtx.workspaceRoot,
      maxRetries,
      rawTasks.length,
      createdAt,
      createdAt
    );

    const insertTaskStmt = db.prepare(`
      INSERT INTO batch_tasks (
        id, job_id, seq, label, operation, status, file_path, output_path,
        input_preview, input_payload, config_json, attempts, max_retries
      ) VALUES (?, ?, ?, ?, ?, 'queued', ?, ?, ?, ?, ?, 0, ?)
    `);

    rawTasks.forEach((t, idx) => {
      const taskId = `btask-${Date.now().toString(36)}-${idx}-${crypto.randomBytes(2).toString('hex')}`;
      const taskOp = t.operationOverride || operation;
      const mergedTaskConfig: BatchOperationConfig = {
        ...config,
        ...(t.configOverride || {})
      };
      const filePath = t.filePath ? String(t.filePath).trim() : null;
      const outputPath = t.outputPath ? String(t.outputPath).trim() : null;
      const payload = t.inputData !== undefined ? String(t.inputData) : '';
      const preview = filePath
        ? filePath
        : payload.length > 140
          ? `${payload.slice(0, 140)}...`
          : payload || `Item #${idx + 1}`;
      const label = String(t.label || (filePath ? path.basename(filePath) : `Task #${idx + 1}`)).trim();

      insertTaskStmt.run(
        taskId,
        jobId,
        idx + 1,
        label,
        taskOp,
        filePath,
        outputPath,
        preview,
        payload,
        JSON.stringify(mergedTaskConfig),
        maxRetries
      );
    });

    if (!input.startPaused) {
      this.schedulePump();
    }

    this.deps?.onBatchEvent?.({
      type: 'job_enqueued',
      jobId,
      summary: `Enqueued batch job "${jobName}" with ${rawTasks.length} task(s)`
    });

    const detail = this.getJobDetail(jobId, actor);
    if (!detail) {
      throw new Error('Failed to load newly created batch job.');
    }
    return detail;
  }

  private mapJobRow(row: any, taskCounts?: Record<string, number>): BatchJobRecord {
    const total = Number(row.total_tasks) || 0;
    const completed = taskCounts?.completed ?? (Number(row.completed_tasks) || 0);
    const failed = taskCounts?.failed ?? (Number(row.failed_tasks) || 0);
    const cancelled = taskCounts?.cancelled ?? (Number(row.cancelled_tasks) || 0);
    const running = taskCounts?.running ?? 0;
    const queued = taskCounts?.queued ?? Math.max(0, total - completed - failed - cancelled - running);
    const terminalCount = completed + failed + cancelled;
    const progressPct = total > 0 ? Math.min(100, Math.round((terminalCount / total) * 100)) : 0;

    let parsedConfig: BatchOperationConfig = {};
    try {
      parsedConfig = JSON.parse(row.config_json || '{}');
    } catch {}

    let patchIds: string[] = [];
    try {
      const p = JSON.parse(row.patch_ids_json || '[]');
      if (Array.isArray(p)) patchIds = p;
    } catch {}

    let elapsedMs = Number(row.elapsed_ms) || 0;
    if (row.status === 'running' && row.started_at && !row.completed_at) {
      const startedMs = Date.parse(row.started_at);
      if (Number.isFinite(startedMs)) {
        elapsedMs = Math.max(elapsedMs, Date.now() - startedMs);
      }
    }

    return {
      id: String(row.id),
      name: String(row.name),
      description: String(row.description || ''),
      category: (row.category || 'file_transformation') as BatchJobRecord['category'],
      operation: row.operation as BatchOperationType,
      priority: (row.priority || 'normal') as BatchJobPriority,
      status: row.status as BatchJobStatus,
      config: parsedConfig,
      ownerUserId: String(row.owner_user_id || 'uid_0'),
      ownerUsername: String(row.owner_username || 'UID 0'),
      isSandboxed: Boolean(row.is_sandboxed),
      workspaceRoot: String(row.workspace_root || process.cwd()),
      maxRetries: Number(row.max_retries) || 0,
      totalTasks: total,
      completedTasks: completed,
      failedTasks: failed,
      cancelledTasks: cancelled,
      runningTasks: running,
      queuedTasks: queued,
      progressPct,
      bytesProcessed: Number(row.bytes_processed) || 0,
      recordsProcessed: Number(row.records_processed) || 0,
      patchIds,
      manifestPath: row.manifest_path ? String(row.manifest_path) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      startedAt: row.started_at ? String(row.started_at) : null,
      completedAt: row.completed_at ? String(row.completed_at) : null,
      elapsedMs
    };
  }

  private mapTaskRow(row: any): BatchTaskRecord {
    let parsedConfig: BatchOperationConfig = {};
    try {
      parsedConfig = JSON.parse(row.config_json || '{}');
    } catch {}
    return {
      id: String(row.id),
      jobId: String(row.job_id),
      seq: Number(row.seq) || 0,
      label: String(row.label || ''),
      operation: row.operation as BatchOperationType,
      status: row.status as BatchTaskStatus,
      filePath: row.file_path ? String(row.file_path) : null,
      outputPath: row.output_path ? String(row.output_path) : null,
      inputPreview: String(row.input_preview || ''),
      inputPayload: String(row.input_payload || ''),
      config: parsedConfig,
      attempts: Number(row.attempts) || 0,
      maxRetries: Number(row.max_retries) || 0,
      bytesProcessed: Number(row.bytes_processed) || 0,
      recordsProcessed: Number(row.records_processed) || 0,
      patchId: row.patch_id ? String(row.patch_id) : null,
      diff: row.diff ? String(row.diff) : null,
      outputSummary: row.output_summary ? String(row.output_summary) : null,
      outputData: row.output_data ? String(row.output_data) : null,
      errorMessage: row.error_message ? String(row.error_message) : null,
      startedAt: row.started_at ? String(row.started_at) : null,
      completedAt: row.completed_at ? String(row.completed_at) : null,
      elapsedMs: Number(row.elapsed_ms) || 0
    };
  }

  private canActorInspectJob(row: any, actor?: AuthUserPublic | null): boolean {
    if (!actor || userSqlMemoryService.isFullHostAccessUser(actor)) return true;
    return String(row.owner_user_id) === actor.id;
  }

  public listJobs(actor?: AuthUserPublic | null, limit = 50): BatchJobRecord[] {
    const db = this.getDb();
    const safeLimit = Math.max(1, Math.min(200, Number(limit) || 50));
    const isFullAccess = !actor || userSqlMemoryService.isFullHostAccessUser(actor);

    const rows = isFullAccess
      ? db.prepare(`SELECT * FROM batch_jobs ORDER BY created_at DESC LIMIT ?`).all(safeLimit)
      : db.prepare(`SELECT * FROM batch_jobs WHERE owner_user_id = ? ORDER BY created_at DESC LIMIT ?`).all(actor!.id, safeLimit);

    const countStmt = db.prepare(`
      SELECT status, COUNT(*) as cnt
      FROM batch_tasks
      WHERE job_id = ?
      GROUP BY status
    `);

    return rows.map((r: any) => {
      const counts: Record<string, number> = { queued: 0, running: 0, completed: 0, failed: 0, cancelled: 0 };
      for (const c of countStmt.all(r.id) as any[]) {
        counts[String(c.status)] = Number(c.cnt) || 0;
      }
      return this.mapJobRow(r, counts);
    });
  }

  public getJobDetail(jobId: string, actor?: AuthUserPublic | null): { job: BatchJobRecord; tasks: BatchTaskRecord[] } | null {
    const db = this.getDb();
    const jobRow = db.prepare(`SELECT * FROM batch_jobs WHERE id = ?`).get(jobId);
    if (!jobRow) return null;
    if (!this.canActorInspectJob(jobRow, actor)) {
      throw new Error('Access denied to batch job.');
    }

    const taskRows = db.prepare(`SELECT * FROM batch_tasks WHERE job_id = ? ORDER BY seq ASC`).all(jobId);
    const counts: Record<string, number> = { queued: 0, running: 0, completed: 0, failed: 0, cancelled: 0 };
    const tasks = taskRows.map((tr: any) => {
      const mapped = this.mapTaskRow(tr);
      counts[mapped.status] = (counts[mapped.status] || 0) + 1;
      return mapped;
    });

    return {
      job: this.mapJobRow(jobRow, counts),
      tasks
    };
  }

  public getRunnerStatus(actor?: AuthUserPublic | null): {
    isPaused: boolean;
    concurrency: number;
    activeWorkers: number;
    totalTasksExecutedSinceBoot: number;
    counts: {
      totalJobs: number;
      queuedJobs: number;
      runningJobs: number;
      pausedJobs: number;
      completedJobs: number;
      failedJobs: number;
    };
    jobs: BatchJobRecord[];
  } {
    const jobs = this.listJobs(actor, 60);
    const counts = {
      totalJobs: jobs.length,
      queuedJobs: jobs.filter((j) => j.status === 'queued').length,
      runningJobs: jobs.filter((j) => j.status === 'running').length,
      pausedJobs: jobs.filter((j) => j.status === 'paused').length,
      completedJobs: jobs.filter((j) => j.status === 'completed' || j.status === 'completed_with_errors').length,
      failedJobs: jobs.filter((j) => j.status === 'failed').length
    };
    return {
      isPaused: this.isPaused,
      concurrency: this.concurrency,
      activeWorkers: this.activeTaskIds.size,
      totalTasksExecutedSinceBoot: this.totalTasksExecutedSinceBoot,
      counts,
      jobs
    };
  }

  public controlRunner(action: 'pause' | 'resume' | 'set_concurrency' | 'clear_completed', value?: number, actor?: AuthUserPublic | null) {
    const db = this.getDb();
    if (action === 'pause') {
      this.isPaused = true;
    } else if (action === 'resume') {
      this.isPaused = false;
      this.schedulePump();
    } else if (action === 'set_concurrency') {
      const next = Math.max(1, Math.min(8, Math.floor(Number(value) || 3)));
      this.concurrency = next;
      this.schedulePump();
    } else if (action === 'clear_completed') {
      const isFullAccess = !actor || userSqlMemoryService.isFullHostAccessUser(actor);
      const targetJobs = isFullAccess
        ? db.prepare(`SELECT id FROM batch_jobs WHERE status IN ('completed', 'completed_with_errors', 'cancelled', 'failed')`).all()
        : db.prepare(`SELECT id FROM batch_jobs WHERE owner_user_id = ? AND status IN ('completed', 'completed_with_errors', 'cancelled', 'failed')`).all(actor!.id);
      const delTasks = db.prepare(`DELETE FROM batch_tasks WHERE job_id = ?`);
      const delJob = db.prepare(`DELETE FROM batch_jobs WHERE id = ?`);
      for (const jr of targetJobs as any[]) {
        delTasks.run(jr.id);
        delJob.run(jr.id);
      }
    }
    return this.getRunnerStatus(actor);
  }

  public async performJobAction(
    jobId: string,
    action: 'pause' | 'resume' | 'cancel' | 'retry_failed' | 'rollback' | 'delete',
    actor?: AuthUserPublic | null
  ): Promise<{ success: boolean; message: string; job?: BatchJobRecord; rolledBackCount?: number }> {
    const db = this.getDb();
    const jobRow = db.prepare(`SELECT * FROM batch_jobs WHERE id = ?`).get(jobId);
    if (!jobRow) {
      throw new Error(`Batch job "${jobId}" not found.`);
    }
    if (!this.canActorInspectJob(jobRow, actor)) {
      throw new Error('Access denied to batch job.');
    }

    const ts = nowIso();

    if (action === 'pause') {
      db.prepare(`UPDATE batch_jobs SET status = 'paused', updated_at = ? WHERE id = ? AND status IN ('queued', 'running')`).run(ts, jobId);
      const detail = this.getJobDetail(jobId, actor);
      return { success: true, message: `Paused job "${jobRow.name}".`, job: detail?.job };
    }

    if (action === 'resume') {
      this.cancelledJobIds.delete(jobId);
      db.prepare(`UPDATE batch_jobs SET status = 'queued', updated_at = ? WHERE id = ? AND status = 'paused'`).run(ts, jobId);
      this.schedulePump();
      const detail = this.getJobDetail(jobId, actor);
      return { success: true, message: `Resumed job "${jobRow.name}".`, job: detail?.job };
    }

    if (action === 'cancel') {
      this.cancelledJobIds.add(jobId);
      db.prepare(`UPDATE batch_tasks SET status = 'cancelled', completed_at = ? WHERE job_id = ? AND status IN ('queued', 'running')`).run(ts, jobId);
      this.reconcileJobAggregates(jobId, 'cancelled');
      const detail = this.getJobDetail(jobId, actor);
      return { success: true, message: `Cancelled job "${jobRow.name}".`, job: detail?.job };
    }

    if (action === 'retry_failed') {
      this.cancelledJobIds.delete(jobId);
      const res = db.prepare(`
        UPDATE batch_tasks
        SET status = 'queued', error_message = NULL, started_at = NULL, completed_at = NULL, elapsed_ms = 0
        WHERE job_id = ? AND status IN ('failed', 'cancelled')
      `).run(jobId);
      db.prepare(`UPDATE batch_jobs SET status = 'queued', completed_at = NULL, updated_at = ? WHERE id = ?`).run(ts, jobId);
      this.reconcileJobAggregates(jobId);
      this.schedulePump();
      const detail = this.getJobDetail(jobId, actor);
      return {
        success: true,
        message: `Re-queued ${Number(res?.changes || 0)} failed/cancelled task(s) for "${jobRow.name}".`,
        job: detail?.job
      };
    }

    if (action === 'rollback') {
      const detail = this.getJobDetail(jobId, actor);
      const patchIds = [...(detail?.job.patchIds || [])].reverse();
      if (patchIds.length === 0) {
        return { success: false, message: 'No file mutation snapshots recorded on this batch job to roll back.', job: detail?.job, rolledBackCount: 0 };
      }
      let rolledBackCount = 0;
      for (const pid of patchIds) {
        const rb = await autonomyRollbackPatch({ patchId: pid });
        if (rb.success) rolledBackCount++;
      }
      db.prepare(`UPDATE batch_jobs SET patch_ids_json = '[]', updated_at = ? WHERE id = ?`).run(ts, jobId);
      const refreshed = this.getJobDetail(jobId, actor);
      return {
        success: rolledBackCount > 0,
        message: `Rolled back ${rolledBackCount} of ${patchIds.length} file mutation snapshot(s) for "${jobRow.name}".`,
        job: refreshed?.job,
        rolledBackCount
      };
    }

    if (action === 'delete') {
      this.cancelledJobIds.add(jobId);
      db.prepare(`DELETE FROM batch_tasks WHERE job_id = ?`).run(jobId);
      db.prepare(`DELETE FROM batch_jobs WHERE id = ?`).run(jobId);
      return { success: true, message: `Deleted batch job "${jobRow.name}".` };
    }

    throw new Error(`Unsupported job action: ${action}`);
  }

  private schedulePump(): void {
    if (this.pumpScheduled || this.isPaused) return;
    this.pumpScheduled = true;
    setImmediate(() => {
      this.pumpScheduled = false;
      void this.pumpQueue();
    });
  }

  private async pumpQueue(): Promise<void> {
    if (this.isPaused || !this.db) return;

    while (!this.isPaused && this.activeTaskIds.size < this.concurrency) {
      const nextCandidate = this.claimNextRunnableTask();
      if (!nextCandidate) break;

      this.activeTaskIds.add(nextCandidate.task.id);
      void this.executeClaimedTask(nextCandidate.jobRow, nextCandidate.task).finally(() => {
        this.activeTaskIds.delete(nextCandidate.task.id);
        this.schedulePump();
      });
    }
  }

  private claimNextRunnableTask(): { jobRow: any; task: BatchTaskRecord } | null {
    const db = this.getDb();
    const row = db.prepare(`
      SELECT
        t.*,
        j.priority_weight
      FROM batch_tasks t
      INNER JOIN batch_jobs j ON j.id = t.job_id
      WHERE t.status = 'queued'
        AND j.status IN ('queued', 'running')
      ORDER BY j.priority_weight DESC, j.created_at ASC, t.seq ASC
      LIMIT 1
    `).get();

    if (!row) return null;

    const jobRow = db.prepare(`SELECT * FROM batch_jobs WHERE id = ?`).get(row.job_id);
    if (!jobRow) return null;

    const ts = nowIso();
    db.prepare(`
      UPDATE batch_tasks
      SET status = 'running', attempts = attempts + 1, started_at = ?, error_message = NULL
      WHERE id = ?
    `).run(ts, row.id);

    if (jobRow.status === 'queued') {
      db.prepare(`
        UPDATE batch_jobs
        SET status = 'running', started_at = COALESCE(started_at, ?), updated_at = ?
        WHERE id = ?
      `).run(ts, ts, jobRow.id);
    }

    const updatedTaskRow = db.prepare(`SELECT * FROM batch_tasks WHERE id = ?`).get(row.id);
    return {
      jobRow: db.prepare(`SELECT * FROM batch_jobs WHERE id = ?`).get(row.job_id),
      task: this.mapTaskRow(updatedTaskRow)
    };
  }

  private async executeClaimedTask(jobRow: any, task: BatchTaskRecord): Promise<void> {
    const db = this.getDb();
    const t0 = performance.now();
    touchAutonomyActivity();

    let jobConfig: BatchOperationConfig = {};
    try {
      jobConfig = JSON.parse(jobRow.config_json || '{}');
    } catch {}
    const mergedConfig: BatchOperationConfig = {
      ...jobConfig,
      ...(task.config || {})
    };
    const jobCtx = {
      isSandboxed: Boolean(jobRow.is_sandboxed),
      workspaceRoot: String(jobRow.workspace_root || process.cwd()),
      config: mergedConfig
    };

    try {
      if (this.cancelledJobIds.has(task.jobId)) {
        throw new Error('Cancelled by user');
      }

      const result = await this.runSingleTaskOperation(task, mergedConfig, jobCtx, String(jobRow.owner_user_id || 'uid_0'));

      if (this.cancelledJobIds.has(task.jobId)) {
        const tsCancel = nowIso();
        db.prepare(`
          UPDATE batch_tasks
          SET status = 'cancelled', completed_at = ?, elapsed_ms = ?
          WHERE id = ?
        `).run(tsCancel, Math.round(performance.now() - t0), task.id);
        this.reconcileJobAggregates(task.jobId);
        return;
      }

      const elapsedMs = Math.max(1, Math.round(performance.now() - t0));
      const completedAt = nowIso();
      const cappedOutput = result.outputData && result.outputData.length > 64000
        ? `${result.outputData.slice(0, 64000)}\n... [truncated ${result.outputData.length - 64000} chars]`
        : (result.outputData ?? null);

      db.prepare(`
        UPDATE batch_tasks
        SET status = 'completed',
            output_path = COALESCE(?, output_path),
            bytes_processed = ?,
            records_processed = ?,
            patch_id = ?,
            diff = ?,
            output_summary = ?,
            output_data = ?,
            error_message = NULL,
            completed_at = ?,
            elapsed_ms = ?
        WHERE id = ?
      `).run(
        result.outputPath || null,
        result.bytesProcessed,
        result.recordsProcessed,
        result.patchId || null,
        result.diff || null,
        result.summary,
        cappedOutput,
        completedAt,
        elapsedMs,
        task.id
      );

      this.totalTasksExecutedSinceBoot += 1;
      this.reconcileJobAggregates(task.jobId);
    } catch (err: any) {
      const elapsedMs = Math.max(1, Math.round(performance.now() - t0));
      const errMsg = String(err?.message || err || 'Task execution failed');
      const currentRow = db.prepare(`SELECT attempts, max_retries, status FROM batch_tasks WHERE id = ?`).get(task.id);
      const attempts = Number(currentRow?.attempts || task.attempts || 1);
      const maxRetries = Number(currentRow?.max_retries ?? task.maxRetries ?? 0);

      if (!this.cancelledJobIds.has(task.jobId) && attempts <= maxRetries) {
        db.prepare(`
          UPDATE batch_tasks
          SET status = 'queued', error_message = ?, elapsed_ms = ?
          WHERE id = ?
        `).run(`Retry ${attempts}/${maxRetries}: ${errMsg}`, elapsedMs, task.id);
      } else {
        const finalStatus: BatchTaskStatus = this.cancelledJobIds.has(task.jobId) ? 'cancelled' : 'failed';
        db.prepare(`
          UPDATE batch_tasks
          SET status = ?, error_message = ?, completed_at = ?, elapsed_ms = ?
          WHERE id = ?
        `).run(finalStatus, errMsg, nowIso(), elapsedMs, task.id);
      }

      this.reconcileJobAggregates(task.jobId);
    }
  }

  private computeTargetOutputPath(
    sourceDisplayPath: string,
    taskOutputPath: string | null,
    cfg: BatchOperationConfig,
    newExt?: string
  ): string {
    if (taskOutputPath && taskOutputPath.trim()) {
      return taskOutputPath.trim();
    }
    if (cfg.outputDir && cfg.outputDir.trim()) {
      const parsed = path.posix.parse(sourceDisplayPath.split(path.sep).join('/'));
      const suffix = cfg.outputSuffix ? String(cfg.outputSuffix) : '';
      const ext = newExt || parsed.ext;
      return path.posix.join(cfg.outputDir.trim(), `${parsed.name}${suffix}${ext}`);
    }
    if (cfg.inPlace === false || newExt) {
      const parsed = path.posix.parse(sourceDisplayPath.split(path.sep).join('/'));
      const suffix = cfg.outputSuffix || (newExt && newExt !== parsed.ext ? '' : '.transformed');
      const ext = newExt || parsed.ext;
      return path.posix.join(parsed.dir, `${parsed.name}${suffix}${ext}`);
    }
    return sourceDisplayPath;
  }

  private async runSingleTaskOperation(
    task: BatchTaskRecord,
    cfg: BatchOperationConfig,
    jobCtx: { isSandboxed: boolean; workspaceRoot: string; config: BatchOperationConfig },
    agentId: string
  ): Promise<{
    summary: string;
    outputData?: string;
    outputPath?: string | null;
    bytesProcessed: number;
    recordsProcessed: number;
    patchId?: string | null;
    diff?: string | null;
  }> {
    const op = task.operation;

    // 1. Multi-File Search / Regex Replacement
    if (op === 'file_regex_replace') {
      if (!task.filePath) {
        throw new Error('filePath is required for file_regex_replace task.');
      }
      const { resolvedPath, displayPath, scope } = this.enforcePathAccess(task.filePath, 'read', jobCtx);
      if (!fs.existsSync(resolvedPath)) {
        throw new Error(`File not found: ${displayPath}`);
      }
      const original = await fs.promises.readFile(resolvedPath, 'utf-8');
      const searchStr = String(cfg.searchPattern ?? '');
      if (!searchStr) {
        throw new Error('searchPattern is required for file_regex_replace.');
      }
      const replacement = String(cfg.replaceWith ?? '');

      let matchCount = 0;
      let transformed = original;
      if (cfg.isRegex) {
        const flags = cfg.regexFlags
          ? (cfg.regexFlags.includes('g') ? cfg.regexFlags : `${cfg.regexFlags}g`)
          : 'g';
        const rx = new RegExp(searchStr, flags);
        const matches = original.match(rx);
        matchCount = matches ? matches.length : 0;
        if (matchCount > 0) {
          transformed = original.replace(rx, replacement);
        }
      } else {
        let pos = 0;
        while (true) {
          const idx = original.indexOf(searchStr, pos);
          if (idx === -1) break;
          matchCount++;
          pos = idx + searchStr.length;
        }
        if (matchCount > 0) {
          transformed = original.split(searchStr).join(replacement);
        }
      }

      if (matchCount === 0) {
        return {
          summary: `0 matches in ${displayPath} (unchanged)`,
          outputData: JSON.stringify({ file: displayPath, matchCount: 0, modified: false }, null, 2),
          bytesProcessed: Buffer.byteLength(original, 'utf-8'),
          recordsProcessed: original.split('\n').length
        };
      }

      if (cfg.dryRun) {
        return {
          summary: `[Dry Run] ${matchCount} match(es) previewed in ${displayPath}`,
          outputData: transformed.slice(0, 8000),
          bytesProcessed: Buffer.byteLength(original, 'utf-8'),
          recordsProcessed: matchCount
        };
      }

      const outTargetRel = this.computeTargetOutputPath(displayPath, task.outputPath, cfg);
      const { resolvedPath: outResolved } = this.enforcePathAccess(outTargetRel, 'write', jobCtx);
      const writeRes = await autonomyWriteFile({
        filePath: outResolved,
        scope: jobCtx.isSandboxed ? 'host' : scope,
        content: transformed,
        verifyCompile: Boolean(cfg.verifyCompile),
        agentId
      });
      if (!writeRes.success) {
        throw new Error(writeRes.summary || 'Failed writing transformed file');
      }

      return {
        summary: `Replaced ${matchCount} occurrence(s) -> ${outTargetRel}`,
        outputPath: outTargetRel,
        outputData: JSON.stringify({
          file: displayPath,
          outputPath: outTargetRel,
          matchCount,
          beforeSha256: sha256Hex(original).slice(0, 16),
          afterSha256: sha256Hex(transformed).slice(0, 16),
          patchId: writeRes.output?.patchId || null
        }, null, 2),
        bytesProcessed: Buffer.byteLength(transformed, 'utf-8'),
        recordsProcessed: matchCount,
        patchId: writeRes.output?.patchId || null,
        diff: writeRes.diff || null
      };
    }

    // 2. File Formatting, Whitespace Normalization, JSON Pretty/Minify & License Header Injection
    if (op === 'file_format_normalize') {
      if (!task.filePath) {
        throw new Error('filePath is required for file_format_normalize task.');
      }
      const { resolvedPath, displayPath, scope } = this.enforcePathAccess(task.filePath, 'read', jobCtx);
      if (!fs.existsSync(resolvedPath)) {
        throw new Error(`File not found: ${displayPath}`);
      }
      const original = await fs.promises.readFile(resolvedPath, 'utf-8');
      let working = original;
      const ext = path.extname(resolvedPath).toLowerCase();

      if (cfg.normalizeLineEndings !== false) {
        working = working.replace(/\r\n/g, '\n');
      }
      if (cfg.trimTrailingWhitespace !== false) {
        working = working
          .split('\n')
          .map((line) => line.replace(/[ \t]+$/g, ''))
          .join('\n');
      }
      if (cfg.collapseBlankLines) {
        working = working.replace(/\n{3,}/g, '\n\n');
      }
      if (ext === '.json' && cfg.jsonMode && cfg.jsonMode !== 'none') {
        const parsed = JSON.parse(working);
        working = cfg.jsonMode === 'minify'
          ? JSON.stringify(parsed)
          : `${JSON.stringify(parsed, null, 2)}\n`;
      }
      if (cfg.headerBanner && cfg.headerBanner.trim() && ['.ts', '.tsx', '.js', '.jsx', '.css'].includes(ext)) {
        const bannerText = cfg.headerBanner.trim();
        if (!working.includes(bannerText)) {
          const formattedBanner = bannerText.startsWith('/*') || bannerText.startsWith('//')
            ? bannerText
            : `/**\n * ${bannerText.split('\n').join('\n * ')}\n */`;
          working = `${formattedBanner}\n\n${working}`;
        }
      }

      const outTargetRel = this.computeTargetOutputPath(displayPath, task.outputPath, cfg);
      if (working === original && outTargetRel === displayPath) {
        return {
          summary: `${displayPath} already normalized (0 byte delta)`,
          outputData: JSON.stringify({ file: displayPath, modified: false, bytes: Buffer.byteLength(original, 'utf-8') }, null, 2),
          bytesProcessed: Buffer.byteLength(original, 'utf-8'),
          recordsProcessed: original.split('\n').length
        };
      }

      if (cfg.dryRun) {
        return {
          summary: `[Dry Run] Normalized ${displayPath} (${original.length} -> ${working.length} chars)`,
          outputData: working.slice(0, 8000),
          bytesProcessed: Buffer.byteLength(working, 'utf-8'),
          recordsProcessed: working.split('\n').length
        };
      }

      const { resolvedPath: outResolved } = this.enforcePathAccess(outTargetRel, 'write', jobCtx);
      const writeRes = await autonomyWriteFile({
        filePath: outResolved,
        scope: jobCtx.isSandboxed ? 'host' : scope,
        content: working,
        verifyCompile: Boolean(cfg.verifyCompile),
        agentId
      });
      if (!writeRes.success) {
        throw new Error(writeRes.summary || 'Failed writing normalized file');
      }

      return {
        summary: `Normalized ${displayPath} -> ${outTargetRel} (${Buffer.byteLength(working, 'utf-8')} B)`,
        outputPath: outTargetRel,
        outputData: JSON.stringify({
          file: displayPath,
          outputPath: outTargetRel,
          beforeBytes: Buffer.byteLength(original, 'utf-8'),
          afterBytes: Buffer.byteLength(working, 'utf-8'),
          patchId: writeRes.output?.patchId || null
        }, null, 2),
        bytesProcessed: Buffer.byteLength(working, 'utf-8'),
        recordsProcessed: working.split('\n').length,
        patchId: writeRes.output?.patchId || null,
        diff: writeRes.diff || null
      };
    }

    // 3. Structured File Format Conversion (CSV <-> JSON <-> NDJSON <-> TSV, Markdown -> HTML/JSON)
    if (op === 'file_convert_projection') {
      if (!task.filePath) {
        throw new Error('filePath is required for file_convert_projection task.');
      }
      const { resolvedPath, displayPath, scope } = this.enforcePathAccess(task.filePath, 'read', jobCtx);
      if (!fs.existsSync(resolvedPath)) {
        throw new Error(`File not found: ${displayPath}`);
      }
      const rawContent = await fs.promises.readFile(resolvedPath, 'utf-8');
      const srcExt = path.extname(resolvedPath).toLowerCase();
      const targetFmt = cfg.targetFormat || (srcExt === '.csv' ? 'json' : srcExt === '.md' ? 'html' : 'csv');

      let converted = '';
      let recordCount = 1;

      if (srcExt === '.md' || srcExt === '.markdown') {
        if (targetFmt === 'html') {
          converted = markdownToHtmlDocument(rawContent, path.basename(displayPath, srcExt));
          recordCount = rawContent.split('\n').length;
        } else if (targetFmt === 'json') {
          const sections = rawContent.split(/^#{1,3}\s+/m).filter(Boolean).map((block, idx) => {
            const firstNl = block.indexOf('\n');
            const heading = firstNl >= 0 ? block.slice(0, firstNl).trim() : `Section ${idx + 1}`;
            const body = firstNl >= 0 ? block.slice(firstNl + 1).trim() : block.trim();
            return { index: idx + 1, heading, body, charCount: body.length };
          });
          recordCount = sections.length;
          converted = JSON.stringify({ source: displayPath, sections }, null, 2);
        } else {
          converted = rawContent;
        }
      } else {
        const records = parseRecordsAuto(
          rawContent,
          srcExt === '.tsv' ? 'tsv' : srcExt === '.csv' ? 'csv' : srcExt === '.ndjson' ? 'ndjson' : 'auto'
        );
        recordCount = records.length;
        converted = serializeRecords(records, targetFmt === 'md' ? 'markdown' : (targetFmt as any));
      }

      const outTargetRel = this.computeTargetOutputPath(displayPath, task.outputPath, { ...cfg, inPlace: false }, `.${targetFmt}`);
      const { resolvedPath: outResolved } = this.enforcePathAccess(outTargetRel, 'write', jobCtx);
      const writeRes = await autonomyWriteFile({
        filePath: outResolved,
        scope: jobCtx.isSandboxed ? 'host' : scope,
        content: converted,
        agentId
      });
      if (!writeRes.success) {
        throw new Error(writeRes.summary || 'Failed writing converted file');
      }

      return {
        summary: `Converted ${displayPath} -> ${outTargetRel} (${recordCount} item(s))`,
        outputPath: outTargetRel,
        outputData: converted.slice(0, 12000),
        bytesProcessed: Buffer.byteLength(converted, 'utf-8'),
        recordsProcessed: recordCount,
        patchId: writeRes.output?.patchId || null,
        diff: writeRes.diff || null
      };
    }

    // 4. Cryptographic File Integrity & Entropy Audit Manifest
    if (op === 'file_hash_manifest') {
      const content = task.filePath
        ? await (async () => {
            const { resolvedPath, displayPath } = this.enforcePathAccess(task.filePath!, 'read', jobCtx);
            if (!fs.existsSync(resolvedPath)) throw new Error(`File not found: ${displayPath}`);
            return fs.promises.readFile(resolvedPath, 'utf-8');
          })()
        : task.inputPayload;

      const bytes = Buffer.byteLength(content, 'utf-8');
      const lines = content ? content.split('\n').length : 0;
      const digest256 = sha256Hex(content);
      const digest512 = sha512Hex(content);
      const entropy = computeShannonEntropy(content);
      const record = {
        target: task.filePath || task.label,
        bytes,
        lines,
        entropyBitsPerByte: entropy,
        sha256: digest256,
        sha512: digest512.slice(0, 64),
        auditedAt: nowIso()
      };

      return {
        summary: `SHA-256 ${digest256.slice(0, 16)}… (${bytes} B · ${lines} lines · H=${entropy})`,
        outputData: JSON.stringify(record, null, 2),
        bytesProcessed: bytes,
        recordsProcessed: 1
      };
    }

    // 5. AI File Transformation (Gemini-4-Hydrogen server-side code/doc transformation)
    if (op === 'file_ai_transform') {
      if (!task.filePath) {
        throw new Error('filePath is required for file_ai_transform task.');
      }
      if (!this.deps || !this.deps.hasGeminiKey()) {
        throw new Error('Active server-side Gemini API key is required for file_ai_transform.');
      }
      const { resolvedPath, displayPath, scope } = this.enforcePathAccess(task.filePath, 'read', jobCtx);
      if (!fs.existsSync(resolvedPath)) {
        throw new Error(`File not found: ${displayPath}`);
      }
      const sourceText = await fs.promises.readFile(resolvedPath, 'utf-8');
      const instruction = String(cfg.instruction || 'Improve code clarity, add concise TypeScript types/JSDoc where missing, and preserve all existing exports and behavior.').trim();
      const outTargetRel = this.computeTargetOutputPath(displayPath, task.outputPath, cfg);

      const ai = this.deps.getAiClient();
      const models = this.deps.getCascadeModels(cfg.preferredModel || 'gemini-4-hydrogen');
      let generated = '';
      let lastErr: any = null;

      for (const modelName of models) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [
              `SOURCE FILE PATH: ${displayPath}`,
              `OUTPUT FILE PATH: ${outTargetRel}`,
              `TRANSFORMATION INSTRUCTION: ${instruction}`,
              '',
              'Return ONLY the complete transformed file content without conversational commentary or wrapping markdown code fences.',
              '',
              '--- BEGIN SOURCE FILE ---',
              sourceText,
              '--- END SOURCE FILE ---'
            ].join('\n')
          });
          const txt = (response.text || '').trim();
          if (txt) {
            generated = stripOuterMarkdownCodeFence(txt);
            break;
          }
        } catch (err: any) {
          lastErr = err;
        }
      }

      if (!generated) {
        throw new Error(lastErr?.message || 'AI model returned empty file transformation output.');
      }

      if (cfg.dryRun) {
        return {
          summary: `[Dry Run] AI transformed ${displayPath} (${generated.length} chars)`,
          outputData: generated.slice(0, 12000),
          bytesProcessed: Buffer.byteLength(generated, 'utf-8'),
          recordsProcessed: generated.split('\n').length
        };
      }

      const { resolvedPath: outResolved } = this.enforcePathAccess(outTargetRel, 'write', jobCtx);
      const writeRes = await autonomyWriteFile({
        filePath: outResolved,
        scope: jobCtx.isSandboxed ? 'host' : scope,
        content: generated,
        verifyCompile: Boolean(cfg.verifyCompile),
        agentId
      });
      if (!writeRes.success) {
        throw new Error(writeRes.summary || 'AI transformation failed compile/write verification and was rolled back.');
      }

      return {
        summary: `AI transformed ${displayPath} -> ${outTargetRel}`,
        outputPath: outTargetRel,
        outputData: generated.slice(0, 12000),
        bytesProcessed: Buffer.byteLength(generated, 'utf-8'),
        recordsProcessed: generated.split('\n').length,
        patchId: writeRes.output?.patchId || null,
        diff: writeRes.diff || null
      };
    }

    // 6. Tabular / JSON Dataset ETL Pipeline
    if (op === 'data_json_csv_etl') {
      let rawPayload = task.inputPayload;
      let displaySource = task.label;
      let sourceScope: 'orchestrator' | 'target' | 'host' = 'orchestrator';
      if (task.filePath) {
        const resolved = this.enforcePathAccess(task.filePath, 'read', jobCtx);
        if (!fs.existsSync(resolved.resolvedPath)) {
          throw new Error(`Input dataset file not found: ${resolved.displayPath}`);
        }
        rawPayload = await fs.promises.readFile(resolved.resolvedPath, 'utf-8');
        displaySource = resolved.displayPath;
        sourceScope = resolved.scope;
      }

      let records = parseRecordsAuto(rawPayload, cfg.inputFormat || 'auto');
      const initialCount = records.length;

      // Filter
      if (cfg.filterField && cfg.filterField.trim()) {
        const field = cfg.filterField.trim();
        const fOp = cfg.filterOp || 'eq';
        const targetVal = cfg.filterValue ?? '';
        records = records.filter((rec) => {
          const val = rec?.[field];
          if (fOp === 'exists') return val !== undefined && val !== null && val !== '';
          const valNum = Number(val);
          const targetNum = Number(targetVal);
          if (fOp === 'gt') return Number.isFinite(valNum) && Number.isFinite(targetNum) && valNum > targetNum;
          if (fOp === 'gte') return Number.isFinite(valNum) && Number.isFinite(targetNum) && valNum >= targetNum;
          if (fOp === 'lt') return Number.isFinite(valNum) && Number.isFinite(targetNum) && valNum < targetNum;
          if (fOp === 'lte') return Number.isFinite(valNum) && Number.isFinite(targetNum) && valNum <= targetNum;
          if (fOp === 'contains') return String(val ?? '').toLowerCase().includes(String(targetVal).toLowerCase());
          if (fOp === 'neq') return String(val ?? '') !== String(targetVal);
          return String(val ?? '') === String(targetVal);
        });
      }

      // Deduplicate
      if (cfg.dedupeKey && cfg.dedupeKey.trim()) {
        const dk = cfg.dedupeKey.trim();
        const seen = new Set<string>();
        records = records.filter((rec) => {
          const k = JSON.stringify(rec?.[dk]);
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
      }

      // Select projection
      if (Array.isArray(cfg.selectFields) && cfg.selectFields.length > 0) {
        const fields = cfg.selectFields.map((f) => f.trim()).filter(Boolean);
        if (fields.length > 0) {
          records = records.map((rec) => {
            const projected: Record<string, any> = {};
            for (const f of fields) {
              projected[f] = rec?.[f] ?? null;
            }
            return projected;
          });
        }
      }

      // Sort
      if (cfg.sortBy && cfg.sortBy.trim()) {
        const sk = cfg.sortBy.trim();
        const dir = cfg.sortOrder === 'desc' ? -1 : 1;
        records = [...records].sort((a, b) => {
          const va = a?.[sk];
          const vb = b?.[sk];
          if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
          return String(va ?? '').localeCompare(String(vb ?? '')) * dir;
        });
      }

      const outFmt = cfg.outputFormat || 'json';
      const serialized = serializeRecords(records, outFmt);
      let writtenOutputPath: string | null = null;
      let patchId: string | null = null;

      if (task.outputPath && task.outputPath.trim()) {
        const outTarget = task.outputPath.trim();
        const { resolvedPath: outResolved } = this.enforcePathAccess(outTarget, 'write', jobCtx);
        const writeRes = await autonomyWriteFile({
          filePath: outResolved,
          scope: jobCtx.isSandboxed ? 'host' : sourceScope,
          content: serialized,
          agentId
        });
        if (!writeRes.success) {
          throw new Error(writeRes.summary || 'Failed writing ETL output file');
        }
        writtenOutputPath = outTarget;
        patchId = writeRes.output?.patchId || null;
      }

      return {
        summary: `ETL ${displaySource}: ${initialCount} -> ${records.length} record(s) (${outFmt.toUpperCase()})${writtenOutputPath ? ` -> ${writtenOutputPath}` : ''}`,
        outputPath: writtenOutputPath,
        outputData: serialized,
        bytesProcessed: Buffer.byteLength(rawPayload, 'utf-8'),
        recordsProcessed: records.length,
        patchId
      };
    }

    // 7. Custom Async JavaScript Sandbox Transform
    if (op === 'data_js_transform') {
      const jsCode = String(cfg.jsCode || 'return { item: input, length: typeof input === "string" ? input.length : JSON.stringify(input).length };').trim();
      let rawText = task.inputPayload;
      let sourceScope: 'orchestrator' | 'target' | 'host' = 'orchestrator';
      if (task.filePath) {
        const resolved = this.enforcePathAccess(task.filePath, 'read', jobCtx);
        if (!fs.existsSync(resolved.resolvedPath)) {
          throw new Error(`Input file not found: ${resolved.displayPath}`);
        }
        rawText = await fs.promises.readFile(resolved.resolvedPath, 'utf-8');
        sourceScope = resolved.scope;
      }

      let parsedInput: any = rawText;
      try {
        if (rawText.trim().startsWith('{') || rawText.trim().startsWith('[')) {
          parsedInput = JSON.parse(rawText);
        }
      } catch {}

      const sandboxResult = await executeDynamicToolCode(
        `const input = args.input; const data = args.data;\n${jsCode}`,
        {
          input: parsedInput,
          data: parsedInput,
          rawText,
          filePath: task.filePath,
          label: task.label,
          seq: task.seq
        }
      );

      const serialized = typeof sandboxResult === 'string'
        ? sandboxResult
        : JSON.stringify(sandboxResult, null, 2);

      let writtenOutputPath: string | null = null;
      let patchId: string | null = null;
      if (task.outputPath && task.outputPath.trim()) {
        const outTarget = task.outputPath.trim();
        const { resolvedPath: outResolved } = this.enforcePathAccess(outTarget, 'write', jobCtx);
        const writeRes = await autonomyWriteFile({
          filePath: outResolved,
          scope: jobCtx.isSandboxed ? 'host' : sourceScope,
          content: serialized,
          agentId
        });
        if (!writeRes.success) throw new Error(writeRes.summary || 'Failed writing JS transform output');
        writtenOutputPath = outTarget;
        patchId = writeRes.output?.patchId || null;
      }

      const recCount = Array.isArray(sandboxResult) ? sandboxResult.length : 1;
      return {
        summary: `JS transform completed on ${task.label} (${Buffer.byteLength(serialized, 'utf-8')} B output)`,
        outputPath: writtenOutputPath,
        outputData: serialized,
        bytesProcessed: Buffer.byteLength(rawText || serialized, 'utf-8'),
        recordsProcessed: recCount,
        patchId
      };
    }

    // 8. AI Batch Data Extraction / Classification / Synthesis
    if (op === 'data_ai_process') {
      if (!this.deps || !this.deps.hasGeminiKey()) {
        throw new Error('Active server-side Gemini API key is required for data_ai_process.');
      }
      let rawText = task.inputPayload;
      let sourceScope: 'orchestrator' | 'target' | 'host' = 'orchestrator';
      if (task.filePath) {
        const resolved = this.enforcePathAccess(task.filePath, 'read', jobCtx);
        if (!fs.existsSync(resolved.resolvedPath)) {
          throw new Error(`Input file not found: ${resolved.displayPath}`);
        }
        rawText = await fs.promises.readFile(resolved.resolvedPath, 'utf-8');
        sourceScope = resolved.scope;
      }

      const instruction = String(cfg.instruction || 'Extract key structured fields, entities, and concise actionable metrics from this item.').trim();
      const wantJson = (cfg.outputFormat || 'json') === 'json';
      const ai = this.deps.getAiClient();
      const models = this.deps.getCascadeModels(cfg.preferredModel || 'gemini-4-hydrogen');

      let aiOut = '';
      let lastErr: any = null;
      for (const modelName of models) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [
              `BATCH ITEM: ${task.label}`,
              `PROCESSING DIRECTIVE: ${instruction}`,
              wantJson ? 'Respond strictly with valid JSON.' : 'Respond directly with clean structured output and zero filler.',
              '',
              '--- INPUT DATA ---',
              rawText
            ].join('\n'),
            config: wantJson ? { responseMimeType: 'application/json' } : undefined
          });
          const txt = (response.text || '').trim();
          if (txt) {
            aiOut = txt;
            break;
          }
        } catch (err: any) {
          lastErr = err;
        }
      }

      if (!aiOut) {
        throw new Error(lastErr?.message || 'AI batch processor returned empty output.');
      }

      let writtenOutputPath: string | null = null;
      let patchId: string | null = null;
      if (task.outputPath && task.outputPath.trim()) {
        const outTarget = task.outputPath.trim();
        const { resolvedPath: outResolved } = this.enforcePathAccess(outTarget, 'write', jobCtx);
        const writeRes = await autonomyWriteFile({
          filePath: outResolved,
          scope: jobCtx.isSandboxed ? 'host' : sourceScope,
          content: aiOut,
          agentId
        });
        if (!writeRes.success) throw new Error(writeRes.summary || 'Failed writing AI batch output');
        writtenOutputPath = outTarget;
        patchId = writeRes.output?.patchId || null;
      }

      return {
        summary: `AI processed ${task.label} (${Buffer.byteLength(aiOut, 'utf-8')} B)`,
        outputPath: writtenOutputPath,
        outputData: aiOut,
        bytesProcessed: Buffer.byteLength(rawText, 'utf-8'),
        recordsProcessed: 1,
        patchId
      };
    }

    throw new Error(`Unsupported batch operation: ${op}`);
  }

  private reconcileJobAggregates(jobId: string, forcedTerminalStatus?: BatchJobStatus): void {
    const db = this.getDb();
    const jobRow = db.prepare(`SELECT * FROM batch_jobs WHERE id = ?`).get(jobId);
    if (!jobRow) return;

    const taskRows = db.prepare(`SELECT * FROM batch_tasks WHERE job_id = ? ORDER BY seq ASC`).all(jobId) as any[];
    let completed = 0;
    let failed = 0;
    let cancelled = 0;
    let running = 0;
    let queued = 0;
    let bytesProcessed = 0;
    let recordsProcessed = 0;
    const patchIds: string[] = [];

    for (const t of taskRows) {
      if (t.status === 'completed') completed++;
      else if (t.status === 'failed') failed++;
      else if (t.status === 'cancelled') cancelled++;
      else if (t.status === 'running') running++;
      else queued++;

      bytesProcessed += Number(t.bytes_processed) || 0;
      recordsProcessed += Number(t.records_processed) || 0;
      if (t.patch_id && !patchIds.includes(String(t.patch_id))) {
        patchIds.push(String(t.patch_id));
      }
    }

    const total = taskRows.length;
    const ts = nowIso();
    let nextStatus: BatchJobStatus = jobRow.status as BatchJobStatus;
    let completedAt: string | null = jobRow.completed_at ? String(jobRow.completed_at) : null;
    let manifestPath: string | null = jobRow.manifest_path ? String(jobRow.manifest_path) : null;

    if (forcedTerminalStatus) {
      nextStatus = forcedTerminalStatus;
      completedAt = ts;
    } else if (jobRow.status === 'paused' && running === 0) {
      nextStatus = 'paused';
    } else if (queued === 0 && running === 0) {
      if (cancelled === total && total > 0) {
        nextStatus = 'cancelled';
      } else if (failed === total && total > 0) {
        nextStatus = 'failed';
      } else if (failed > 0) {
        nextStatus = 'completed_with_errors';
      } else {
        nextStatus = 'completed';
      }
      if (!completedAt) {
        completedAt = ts;
      }
    } else if (running > 0) {
      nextStatus = 'running';
    } else {
      nextStatus = 'queued';
    }

    let elapsedMs = Number(jobRow.elapsed_ms) || 0;
    if (jobRow.started_at) {
      const endMs = completedAt ? Date.parse(completedAt) : Date.now();
      const startMs = Date.parse(jobRow.started_at);
      if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs) {
        elapsedMs = endMs - startMs;
      }
    }

    // Write consolidated manifest if configured and newly completed
    const wasAlreadyFinished = Boolean(jobRow.completed_at);
    if (!wasAlreadyFinished && (nextStatus === 'completed' || nextStatus === 'completed_with_errors')) {
      try {
        const cfg: BatchOperationConfig = JSON.parse(jobRow.config_json || '{}');
        if (cfg.manifestOutputPath && cfg.manifestOutputPath.trim()) {
          const { resolvedPath, displayPath } = this.enforcePathAccess(cfg.manifestOutputPath.trim(), 'write', {
            isSandboxed: Boolean(jobRow.is_sandboxed),
            workspaceRoot: String(jobRow.workspace_root || process.cwd()),
            config: cfg
          });
          const manifestEntries = taskRows.map((tr) => {
            let parsedOut: any = tr.output_data;
            try {
              if (typeof tr.output_data === 'string' && tr.output_data.trim().startsWith('{')) {
                parsedOut = JSON.parse(tr.output_data);
              }
            } catch {}
            return {
              seq: tr.seq,
              label: tr.label,
              filePath: tr.file_path,
              outputPath: tr.output_path,
              status: tr.status,
              bytesProcessed: tr.bytes_processed,
              recordsProcessed: tr.records_processed,
              elapsedMs: tr.elapsed_ms,
              result: parsedOut,
              error: tr.error_message || undefined
            };
          });
          fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
          fs.writeFileSync(
            resolvedPath,
            JSON.stringify(
              {
                jobId,
                name: jobRow.name,
                operation: jobRow.operation,
                completedAt,
                totalTasks: total,
                completedTasks: completed,
                failedTasks: failed,
                bytesProcessed,
                recordsProcessed,
                items: manifestEntries
              },
              null,
              2
            ),
            'utf-8'
          );
          manifestPath = displayPath;
        }
      } catch (manifestErr: any) {
        console.warn('[BatchProcessor] Manifest write warning:', manifestErr?.message || manifestErr);
      }

      // Record into Infinite Memory Continuity so Sovereign Agents recall background batch completions
      try {
        (sovereignQuantumKernel as any).recordAgenticMemory?.(
          'system',
          `[Autonomous Batch Processor] Job "${jobRow.name}" (${jobId}, op=${jobRow.operation}) finished with status=${nextStatus}: ${completed}/${total} tasks succeeded, ${failed} failed, ${bytesProcessed} bytes & ${recordsProcessed} records processed in ${elapsedMs}ms.`,
          'batch-processor-daemon'
        );
      } catch {}

      this.deps?.onBatchEvent?.({
        type: 'job_completed',
        jobId,
        summary: `Batch job "${jobRow.name}" ${nextStatus} (${completed}/${total} tasks, ${elapsedMs}ms)`
      });
    }

    db.prepare(`
      UPDATE batch_jobs
      SET status = ?,
          total_tasks = ?,
          completed_tasks = ?,
          failed_tasks = ?,
          cancelled_tasks = ?,
          bytes_processed = ?,
          records_processed = ?,
          patch_ids_json = ?,
          manifest_path = ?,
          updated_at = ?,
          completed_at = ?,
          elapsed_ms = ?
      WHERE id = ?
    `).run(
      nextStatus,
      total,
      completed,
      failed,
      cancelled,
      bytesProcessed,
      recordsProcessed,
      JSON.stringify(patchIds),
      manifestPath,
      ts,
      completedAt,
      elapsedMs,
      jobId
    );
  }
}

export const batchProcessorService = new AutonomousBatchProcessorService();
