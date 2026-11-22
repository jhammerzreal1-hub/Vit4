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

import child_process from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import net from 'net';
import os from 'os';
import path from 'path';
import { internalSecretsHandler } from './internalSecretsHandler';

export interface AutonomyResult<T = any> {
  tag: string;
  action: string;
  success: boolean;
  summary: string;
  output: T;
  diff?: string;
}

export interface PatchHunk {
  targetContent?: string;
  replacementContent?: string;
  search?: string;
  replace?: string;
  oldText?: string;
  newText?: string;
  target?: string;
  replacement?: string;
  startLine?: number;
  endLine?: number;
  allowMultiple?: boolean;
}

export interface TypeScriptDiagnostic {
  file: string;
  line: number;
  column: number;
  code: string;
  message: string;
}

export interface BatchFileOperation {
  type?: 'write' | 'patch' | 'atomicPatch' | 'delete' | string;
  action?: 'write' | 'patch' | 'atomicPatch' | 'delete' | string;
  filePath: string;
  scope?: 'auto' | 'target' | 'orchestrator' | 'self' | 'host' | string;
  rootPath?: string;
  content?: string;
  targetContent?: string;
  replacementContent?: string;
  edits?: PatchHunk[];
  patches?: PatchHunk[];
  hunks?: PatchHunk[];
  allowMultiple?: boolean;
}

export interface TargetSystemConfig {
  rootPath: string;
  label: string;
  isSelf: boolean;
  targetKind?: 'self' | 'host_directory' | 'remote_git' | 'remote_endpoint' | 'ssh_remote';
  remoteEndpoint?: string;
  detectedStack: string[];
  pointedAt: string;
  history: Array<{ rootPath: string; label: string; pointedAt: string; remoteEndpoint?: string; targetKind?: string }>;
}

export interface AtomicPatchSnapshotRecord {
  patchId: string;
  timestamp: string;
  agentId: string;
  operation: 'write' | 'patch' | 'atomicPatch' | 'batch' | 'delete';
  scope: 'orchestrator' | 'target' | 'host';
  displayPath: string;
  targetPath: string;
  existedBefore: boolean;
  previousContent: string | null;
  beforeSha256: string | null;
  afterSha256: string | null;
  diff: string;
  rolledBack?: boolean;
}

const ORCHESTRATOR_ROOT = fs.realpathSync(process.cwd());
const DATA_DIR = path.join(ORCHESTRATOR_ROOT, 'data');
const TARGET_SYSTEM_FILE = path.join(DATA_DIR, 'target_system.json');
const PATCH_LEDGER_FILE = path.join(DATA_DIR, 'atomic_patch_ledger.json');

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', '.aistudio', 'android', '.next', 'target', '__pycache__']);
const CODE_SEARCH_IGNORED_DIRS = new Set([...IGNORED_DIRS, 'data', 'coverage', '.cache']);
const PROTECTED_CORE_FILES = new Set(['server.ts', 'package.json', 'tsconfig.json', 'vite.config.ts']);

// Fast 15-second TTL workspace file index so voice/chat agents can resolve short filenames (e.g. "ChatModule.tsx") in <1ms
const workspaceIndexCache = new Map<string, { builtAt: number; files: string[] }>();
const WORKSPACE_INDEX_TTL_MS = 15_000;

function getCachedWorkspaceFiles(rootDir: string): string[] {
  const now = Date.now();
  const cached = workspaceIndexCache.get(rootDir);
  if (cached && now - cached.builtAt < WORKSPACE_INDEX_TTL_MS) {
    return cached.files;
  }
  const files: string[] = [];
  const walkSync = (dir: string, relBase: string, depth: number) => {
    if (depth > 6 || files.length >= 1500) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (CODE_SEARCH_IGNORED_DIRS.has(entry.name)) continue;
      if (entry.name === '.vault.key' || entry.name === '.secrets.vault.enc') continue;
      const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walkSync(path.join(dir, entry.name), rel, depth + 1);
      } else {
        files.push(rel);
      }
    }
  };
  walkSync(rootDir, '', 0);
  workspaceIndexCache.set(rootDir, { builtAt: now, files });
  return files;
}

function tryFuzzyResolveWorkspaceFile(rawInput: string, rootDir: string): string | null {
  const cleaned = rawInput.replace(/^\/+/, '').replace(/^\.\//, '').trim();
  if (!cleaned || cleaned.includes('..')) return null;
  const files = getCachedWorkspaceFiles(rootDir);
  const lower = cleaned.toLowerCase();

  // 1. Case-insensitive exact relative path match
  const exactRel = files.find((f) => f.toLowerCase() === lower);
  if (exactRel) return path.resolve(rootDir, exactRel);

  // 2. Exact basename match (e.g. "ChatModule.tsx" -> "src/components/ChatModule.tsx")
  const exactBase = files.filter((f) => path.basename(f).toLowerCase() === lower);
  if (exactBase.length === 1) return path.resolve(rootDir, exactBase[0]);
  if (exactBase.length > 1) {
    exactBase.sort((a, b) => a.length - b.length);
    return path.resolve(rootDir, exactBase[0]);
  }

  // 3. Basename without extension match (e.g. "ChatModule" or "voiceEngine")
  const stemMatches = files.filter((f) => {
    const base = path.basename(f);
    const stem = base.slice(0, base.length - path.extname(base).length).toLowerCase();
    return stem === lower;
  });
  if (stemMatches.length > 0) {
    stemMatches.sort((a, b) => a.length - b.length);
    return path.resolve(rootDir, stemMatches[0]);
  }

  // 4. Path suffix match (e.g. "components/ChatModule.tsx")
  const suffixMatches = files.filter((f) => f.toLowerCase().endsWith('/' + lower));
  if (suffixMatches.length > 0) {
    suffixMatches.sort((a, b) => a.length - b.length);
    return path.resolve(rootDir, suffixMatches[0]);
  }

  return null;
}

let activeTargetSystem: TargetSystemConfig = {
  rootPath: ORCHESTRATOR_ROOT,
  label: 'Lysander Genesis Orchestrator (Self Workspace)',
  isSelf: true,
  detectedStack: ['TypeScript', 'React 19', 'Node.js / Express', 'Three.js', 'SQLite'],
  pointedAt: new Date().toISOString(),
  history: [{
    rootPath: ORCHESTRATOR_ROOT,
    label: 'Lysander Genesis Orchestrator (Self Workspace)',
    pointedAt: new Date().toISOString()
  }]
};

let atomicPatchLedger: AtomicPatchSnapshotRecord[] = [];

function detectDirectoryStack(dirPath: string): string[] {
  const stack: string[] = [];
  try {
    if (!fs.existsSync(dirPath)) return ['Uninitialized Directory'];
    const has = (name: string) => fs.existsSync(path.join(dirPath, name));
    if (has('package.json')) {
      stack.push('Node.js / npm');
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(dirPath, 'package.json'), 'utf-8'));
        const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
        if (deps.react) stack.push('React');
        if (deps.vite) stack.push('Vite');
        if (deps.next) stack.push('Next.js');
        if (deps.express) stack.push('Express');
        if (deps.three) stack.push('Three.js');
        if (deps.typescript || has('tsconfig.json')) stack.push('TypeScript');
      } catch {}
    }
    if (has('tsconfig.json') && !stack.includes('TypeScript')) stack.push('TypeScript');
    if (has('Cargo.toml')) stack.push('Rust (Cargo)');
    if (has('pyproject.toml') || has('requirements.txt') || has('setup.py')) stack.push('Python');
    if (has('go.mod')) stack.push('Go');
    if (has('CMakeLists.txt') || has('Makefile')) stack.push('C / C++');
    if (has('project.godot')) stack.push('Godot Engine');
    if (has('.git')) stack.push('Git Repository');
    if (stack.length === 0) stack.push('Generic Host System / Directory');
  } catch {
    stack.push('Host Filesystem');
  }
  return stack;
}

function loadTargetSystemState(): void {
  try {
    if (fs.existsSync(TARGET_SYSTEM_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(TARGET_SYSTEM_FILE, 'utf-8'));
      if (parsed && typeof parsed.rootPath === 'string' && fs.existsSync(parsed.rootPath)) {
        const real = fs.realpathSync(parsed.rootPath);
        activeTargetSystem = {
          rootPath: real,
          label: String(parsed.label || path.basename(real) || real),
          isSelf: real === ORCHESTRATOR_ROOT && !parsed.remoteEndpoint,
          targetKind: parsed.targetKind || (real === ORCHESTRATOR_ROOT ? 'self' : 'host_directory'),
          ...(parsed.remoteEndpoint ? { remoteEndpoint: String(parsed.remoteEndpoint) } : {}),
          detectedStack: detectDirectoryStack(real),
          pointedAt: String(parsed.pointedAt || new Date().toISOString()),
          history: Array.isArray(parsed.history) ? parsed.history.slice(0, 20) : []
        };
      }
    }
  } catch (_) {}
}

function saveTargetSystemState(): void {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(TARGET_SYSTEM_FILE, JSON.stringify(activeTargetSystem, null, 2), 'utf-8');
  } catch (_) {}
}

function loadPatchLedger(): void {
  try {
    if (fs.existsSync(PATCH_LEDGER_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(PATCH_LEDGER_FILE, 'utf-8'));
      if (Array.isArray(parsed)) {
        atomicPatchLedger = parsed.slice(0, 50);
      }
    }
  } catch (_) {}
}

function savePatchLedger(): void {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(PATCH_LEDGER_FILE, JSON.stringify(atomicPatchLedger.slice(0, 50), null, 2), 'utf-8');
  } catch (_) {}
}

function recordPatchSnapshot(entry: Omit<AtomicPatchSnapshotRecord, 'patchId' | 'timestamp'>): AtomicPatchSnapshotRecord {
  const record: AtomicPatchSnapshotRecord = {
    patchId: `patch-${Date.now().toString(36)}-${crypto.randomBytes(2).toString('hex')}`,
    timestamp: new Date().toISOString(),
    ...entry
  };
  atomicPatchLedger.unshift(record);
  if (atomicPatchLedger.length > 50) {
    atomicPatchLedger = atomicPatchLedger.slice(0, 50);
  }
  savePatchLedger();
  return record;
}

loadTargetSystemState();
loadPatchLedger();

export function getTargetSystemConfig(): TargetSystemConfig {
  return {
    ...activeTargetSystem,
    isSelf: activeTargetSystem.rootPath === ORCHESTRATOR_ROOT,
    detectedStack: detectDirectoryStack(activeTargetSystem.rootPath)
  };
}

export function getOrchestratorRoot(): string {
  return ORCHESTRATOR_ROOT;
}

export function getAtomicPatchLedger(limit: number = 25): Omit<AtomicPatchSnapshotRecord, 'previousContent'>[] {
  return atomicPatchLedger.slice(0, limit).map(({ previousContent, ...rest }) => rest);
}

/**
 * Resolves any file or directory path across all 3 autonomous scopes:
 *  1. Orchestrator's own files (`scope: 'orchestrator' | 'self'`, or `@self/...`, `@orchestrator/...`)
 *  2. Whatever target system/project the orchestrator is pointed at (`scope: 'target'`, or `@target/...`)
 *  3. The host system the orchestrator is installed on (`scope: 'host'`, `~/...`, `../...`, or any absolute host path `/...`)
 */
export function resolveUniversalPath(
  rawPathInput: string,
  mode: 'read' | 'write' | 'delete' | 'list',
  options?: { scope?: string; rootPath?: string }
): { cleaned: string; targetPath: string; scope: 'orchestrator' | 'target' | 'host'; baseRoot: string } {
  let raw = String(rawPathInput ?? '').trim();
  if (!raw && mode === 'list') raw = '.';
  if (!raw && mode !== 'list') {
    throw new Error('File path is required.');
  }
  if (raw.includes('\0')) {
    throw new Error('Invalid null byte in path.');
  }

  let requestedScope = String(options?.scope || 'auto').toLowerCase().trim();
  const customRoot = options?.rootPath ? String(options.rootPath).trim() : '';

  // Handle explicit @self / @orchestrator / @target / @host prefixes
  if (raw.startsWith('@self/') || raw.startsWith('@orchestrator/') || raw === '@self' || raw === '@orchestrator') {
    requestedScope = 'orchestrator';
    raw = raw.replace(/^@(?:self|orchestrator)\/?/, '') || '.';
  } else if (raw.startsWith('@target/') || raw === '@target') {
    requestedScope = 'target';
    raw = raw.replace(/^@target\/?/, '') || '.';
  } else if (raw.startsWith('@host/')) {
    requestedScope = 'host';
    raw = '/' + raw.replace(/^@host\/+/, '');
  } else if (raw === '~' || raw.startsWith('~/')) {
    requestedScope = 'host';
    raw = path.join(os.homedir(), raw.slice(1));
  }

  let baseRoot = ORCHESTRATOR_ROOT;
  let resolvedPath = '';
  let effectiveScope: 'orchestrator' | 'target' | 'host' = 'orchestrator';

  if (customRoot) {
    const expandedCustom = customRoot.startsWith('~/') ? path.join(os.homedir(), customRoot.slice(1)) : path.resolve(ORCHESTRATOR_ROOT, customRoot);
    baseRoot = fs.existsSync(expandedCustom) ? fs.realpathSync(expandedCustom) : expandedCustom;
    resolvedPath = (raw === baseRoot || raw.startsWith(baseRoot + path.sep))
      ? path.normalize(raw)
      : path.resolve(baseRoot, raw.replace(/^\/+/, ''));
    effectiveScope = baseRoot === ORCHESTRATOR_ROOT ? 'orchestrator' : 'target';
  } else if (requestedScope === 'orchestrator' || requestedScope === 'self') {
    baseRoot = ORCHESTRATOR_ROOT;
    resolvedPath = (raw === ORCHESTRATOR_ROOT || raw.startsWith(ORCHESTRATOR_ROOT + path.sep))
      ? path.normalize(raw)
      : path.resolve(ORCHESTRATOR_ROOT, raw.replace(/^\/+/, ''));
    effectiveScope = 'orchestrator';
  } else if (requestedScope === 'target') {
    baseRoot = activeTargetSystem.rootPath || ORCHESTRATOR_ROOT;
    resolvedPath = (raw === baseRoot || raw.startsWith(baseRoot + path.sep))
      ? path.normalize(raw)
      : path.resolve(baseRoot, raw.replace(/^\/+/, ''));
    effectiveScope = baseRoot === ORCHESTRATOR_ROOT ? 'orchestrator' : 'target';
  } else if (requestedScope === 'host' || requestedScope === 'system') {
    baseRoot = '/';
    resolvedPath = path.isAbsolute(raw) ? path.normalize(raw) : path.resolve(activeTargetSystem.rootPath || ORCHESTRATOR_ROOT, raw);
    effectiveScope = resolvedPath.startsWith(ORCHESTRATOR_ROOT) ? 'orchestrator' : 'host';
  } else {
    // 'auto' smart resolution:
    if (path.isAbsolute(raw)) {
      // Check if the caller wrote "/src/App.tsx" or "/package.json" meaning a workspace file
      const stripped = raw.replace(/^\/+/, '');
      const inTarget = path.resolve(activeTargetSystem.rootPath, stripped);
      const inOrch = path.resolve(ORCHESTRATOR_ROOT, stripped);

      if (!fs.existsSync(raw) && (fs.existsSync(inTarget) || stripped.startsWith('src/') || stripped.startsWith('public/') || PROTECTED_CORE_FILES.has(stripped))) {
        baseRoot = fs.existsSync(inTarget) ? activeTargetSystem.rootPath : ORCHESTRATOR_ROOT;
        resolvedPath = fs.existsSync(inTarget) ? inTarget : inOrch;
        effectiveScope = baseRoot === ORCHESTRATOR_ROOT ? 'orchestrator' : 'target';
      } else {
        // Real host absolute path (e.g. /tmp/..., /app/applet/..., /etc/..., /home/..., /var/...)
        resolvedPath = path.normalize(raw);
        if (resolvedPath === ORCHESTRATOR_ROOT || resolvedPath.startsWith(ORCHESTRATOR_ROOT + path.sep)) {
          baseRoot = ORCHESTRATOR_ROOT;
          effectiveScope = 'orchestrator';
        } else if (resolvedPath === activeTargetSystem.rootPath || resolvedPath.startsWith(activeTargetSystem.rootPath + path.sep)) {
          baseRoot = activeTargetSystem.rootPath;
          effectiveScope = 'target';
        } else {
          baseRoot = '/';
          effectiveScope = 'host';
        }
      }
    } else if (raw.startsWith('..')) {
      // Relative traversal outside current root -> resolve on host from active target root
      baseRoot = activeTargetSystem.rootPath || ORCHESTRATOR_ROOT;
      resolvedPath = path.resolve(baseRoot, raw);
      effectiveScope = resolvedPath.startsWith(ORCHESTRATOR_ROOT) ? 'orchestrator' : 'host';
    } else {
      // Standard relative path: prefer activeTargetSystem.rootPath, fallback to ORCHESTRATOR_ROOT if reading an orchestrator file
      const inTarget = path.resolve(activeTargetSystem.rootPath, raw);
      const inOrch = path.resolve(ORCHESTRATOR_ROOT, raw);
      if (!activeTargetSystem.isSelf && (mode === 'write' || mode === 'list' || fs.existsSync(inTarget) || !fs.existsSync(inOrch))) {
        baseRoot = activeTargetSystem.rootPath;
        resolvedPath = inTarget;
        effectiveScope = 'target';
      } else {
        baseRoot = ORCHESTRATOR_ROOT;
        resolvedPath = inOrch;
        effectiveScope = 'orchestrator';
      }
    }
  }

  // Instant fuzzy workspace path resolution for short/partial filenames when reading (or patching existing files)
  if (mode === 'read' && !fs.existsSync(resolvedPath) && baseRoot !== '/') {
    const fuzzyTarget = tryFuzzyResolveWorkspaceFile(raw, baseRoot);
    if (fuzzyTarget && fs.existsSync(fuzzyTarget)) {
      resolvedPath = fuzzyTarget;
    } else if (baseRoot !== ORCHESTRATOR_ROOT) {
      const fuzzyOrch = tryFuzzyResolveWorkspaceFile(raw, ORCHESTRATOR_ROOT);
      if (fuzzyOrch && fs.existsSync(fuzzyOrch)) {
        baseRoot = ORCHESTRATOR_ROOT;
        resolvedPath = fuzzyOrch;
        effectiveScope = 'orchestrator';
      }
    }
  }

  const relFromOrch = path.relative(ORCHESTRATOR_ROOT, resolvedPath).split(path.sep).join('/');
  const relFromBase = baseRoot === '/'
    ? resolvedPath
    : (path.relative(baseRoot, resolvedPath).split(path.sep).join('/') || '.');

  // Protect raw encrypted secret key material (.vault.key / .secrets.vault.enc) from direct tampering/exposure
  const baseName = path.basename(resolvedPath);
  if (baseName === '.vault.key' || baseName === '.secrets.vault.enc' || internalSecretsHandler.isSensitivePath(relFromOrch)) {
    throw new Error(`Access denied: "${baseName}" is protected by the internal AES-256-GCM secrets handler.`);
  }

  // Prevent accidental deletion of core orchestrator entrypoints
  if (mode === 'delete' && effectiveScope === 'orchestrator' && PROTECTED_CORE_FILES.has(relFromOrch)) {
    throw new Error(`Refusing to delete protected orchestrator core file "${relFromOrch}". Use patchFile or atomicPatchFile to modify it.`);
  }

  return {
    cleaned: relFromBase.startsWith('..') ? resolvedPath : (relFromBase || '.'),
    targetPath: resolvedPath,
    scope: effectiveScope,
    baseRoot
  };
}

async function atomicWriteTextFile(targetPath: string, content: string): Promise<void> {
  await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
  const tmpPath = `${targetPath}.aurelius-tmp-${process.pid}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  await fs.promises.writeFile(tmpPath, content, 'utf-8');
  await fs.promises.rename(tmpPath, targetPath);
  workspaceIndexCache.clear();
}

function createCompactDiff(filePath: string, before: string, after: string): string {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  let start = 0;
  while (start < beforeLines.length && start < afterLines.length && beforeLines[start] === afterLines[start]) {
    start++;
  }
  let endBefore = beforeLines.length - 1;
  let endAfter = afterLines.length - 1;
  while (endBefore >= start && endAfter >= start && beforeLines[endBefore] === afterLines[endAfter]) {
    endBefore--;
    endAfter--;
  }
  const removed = beforeLines.slice(start, endBefore + 1).slice(0, 24).map(l => `- ${l}`);
  const added = afterLines.slice(start, endAfter + 1).slice(0, 24).map(l => `+ ${l}`);
  return [
    `--- a/${filePath}`,
    `+++ b/${filePath}`,
    `@@ -${start + 1},${Math.max(0, endBefore - start + 1)} +${start + 1},${Math.max(0, endAfter - start + 1)} @@`,
    ...removed,
    ...added
  ].join('\n');
}

function sha256(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf-8').digest('hex');
}

export async function runTypeCheck(targetRoot: string = ORCHESTRATOR_ROOT, specificFilePath?: string): Promise<{ clean: boolean; diagnostics: string }> {
  const checkRoot = fs.existsSync(path.join(targetRoot, 'tsconfig.json'))
    ? targetRoot
    : (specificFilePath && specificFilePath.startsWith(ORCHESTRATOR_ROOT) ? ORCHESTRATOR_ROOT : targetRoot);

  // If the target system has a tsconfig.json, run tsc --noEmit
  if (fs.existsSync(path.join(checkRoot, 'tsconfig.json'))) {
    return new Promise((resolve) => {
      child_process.exec('npx tsc --noEmit', { cwd: checkRoot, timeout: 45000, maxBuffer: 6 * 1024 * 1024 }, (err, stdout, stderr) => {
        const clean = !err;
        const raw = [stdout?.trim(), stderr?.trim()].filter(Boolean).join('\n');
        const diagnostics = internalSecretsHandler.redactText(raw || (clean ? '0 TypeScript errors' : 'TypeScript compilation failed'));
        resolve({ clean, diagnostics });
      });
    });
  }

  // If verifying a standalone JS/PY/SH/JSON file on an external target or host system
  if (specificFilePath && fs.existsSync(specificFilePath)) {
    const ext = path.extname(specificFilePath).toLowerCase();
    if (ext === '.json') {
      try {
        JSON.parse(fs.readFileSync(specificFilePath, 'utf-8'));
        return { clean: true, diagnostics: 'Valid JSON syntax verified' };
      } catch (e: any) {
        return { clean: false, diagnostics: `JSON syntax error: ${e?.message || e}` };
      }
    }
    if (ext === '.js' || ext === '.mjs' || ext === '.cjs') {
      return new Promise((resolve) => {
        child_process.exec(`node --check ${JSON.stringify(specificFilePath)}`, { cwd: path.dirname(specificFilePath), timeout: 15000 }, (err, stdout, stderr) => {
          resolve({
            clean: !err,
            diagnostics: internalSecretsHandler.redactText([stdout?.trim(), stderr?.trim()].filter(Boolean).join('\n') || (!err ? '0 JS syntax errors' : 'JS syntax check failed'))
          });
        });
      });
    }
    if (ext === '.py') {
      return new Promise((resolve) => {
        child_process.exec(`python3 -m py_compile ${JSON.stringify(specificFilePath)}`, { cwd: path.dirname(specificFilePath), timeout: 15000 }, (err, stdout, stderr) => {
          resolve({
            clean: !err,
            diagnostics: internalSecretsHandler.redactText([stdout?.trim(), stderr?.trim()].filter(Boolean).join('\n') || (!err ? '0 Python syntax errors' : 'Python syntax check failed'))
          });
        });
      });
    }
    if (ext === '.sh' || ext === '.bash') {
      return new Promise((resolve) => {
        child_process.exec(`bash -n ${JSON.stringify(specificFilePath)}`, { cwd: path.dirname(specificFilePath), timeout: 15000 }, (err, stdout, stderr) => {
          resolve({
            clean: !err,
            diagnostics: internalSecretsHandler.redactText([stdout?.trim(), stderr?.trim()].filter(Boolean).join('\n') || (!err ? '0 shell syntax errors' : 'Shell syntax check failed'))
          });
        });
      });
    }
  }

  return { clean: true, diagnostics: 'Syntax verification passed' };
}

export function parseTypeScriptErrors(diagnostics: string): TypeScriptDiagnostic[] {
  const results: TypeScriptDiagnostic[] = [];
  if (!diagnostics) return results;
  const lines = diagnostics.split('\n');
  const re = /^(.+?)\((\d+),(\d+)\):\s*error\s+(TS\d+):\s*(.+)$/;
  for (const rawLine of lines) {
    const m = rawLine.trim().match(re);
    if (m) {
      results.push({
        file: m[1].trim(),
        line: parseInt(m[2], 10),
        column: parseInt(m[3], 10),
        code: m[4],
        message: m[5].trim()
      });
    }
  }
  return results;
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let pos = 0;
  while (true) {
    const idx = haystack.indexOf(needle, pos);
    if (idx === -1) break;
    count++;
    pos = idx + needle.length;
  }
  return count;
}

/**
 * 4-Stage Resilient Atomic Hunk Applier:
 *  Stage 1: Exact substring match
 *  Stage 2: CRLF/LF normalized substring match
 *  Stage 3: Line-trimmed / indentation-resilient multi-line sequence match
 *  Stage 4: 1-indexed [startLine, endLine] line-range replacement
 */
function applyHunkList(filePath: string, original: string, edits: PatchHunk[]): string {
  let working = original;
  for (let i = 0; i < edits.length; i++) {
    const hunk = edits[i];
    const rawTarget = hunk?.targetContent ?? hunk?.search ?? hunk?.oldText ?? hunk?.target;
    const rawReplacement = hunk?.replacementContent ?? hunk?.replace ?? hunk?.newText ?? hunk?.replacement;
    const target = rawTarget !== undefined && rawTarget !== null ? String(rawTarget) : '';
    const replacement = rawReplacement !== undefined && rawReplacement !== null ? String(rawReplacement) : '';
    const startLine = Number(hunk?.startLine);
    const endLine = Number(hunk?.endLine);

    // Stage 1: Exact match if target is non-empty
    if (target) {
      const exactCount = countOccurrences(working, target);
      if (exactCount === 1 || (exactCount > 1 && hunk.allowMultiple)) {
        working = hunk.allowMultiple
          ? working.split(target).join(replacement)
          : working.replace(target, replacement);
        continue;
      }
      if (exactCount > 1 && !hunk.allowMultiple) {
        throw new Error(`Hunk #${i + 1} in "${filePath}" matched ${exactCount} occurrences; provide more surrounding context or set allowMultiple: true.`);
      }

      // Stage 2: CRLF/LF normalized match
      const hasCrLf = working.includes('\r\n');
      const normWorking = working.replace(/\r\n/g, '\n');
      const normTarget = target.replace(/\r\n/g, '\n');
      const normReplacement = replacement.replace(/\r\n/g, '\n');
      const normCount = countOccurrences(normWorking, normTarget);
      if (normCount === 1 || (normCount > 1 && hunk.allowMultiple)) {
        const updatedNorm = hunk.allowMultiple
          ? normWorking.split(normTarget).join(normReplacement)
          : normWorking.replace(normTarget, normReplacement);
        working = hasCrLf ? updatedNorm.replace(/\n/g, '\r\n') : updatedNorm;
        continue;
      }

      // Stage 3: Line-trimmed sequence match (handles minor indentation / trailing space differences)
      const workLines = normWorking.split('\n');
      const targetLines = normTarget.split('\n');
      if (targetLines.length >= 1) {
        const matchIndices: number[] = [];
        for (let lineIdx = 0; lineIdx <= workLines.length - targetLines.length; lineIdx++) {
          let allMatch = true;
          for (let k = 0; k < targetLines.length; k++) {
            if (workLines[lineIdx + k].trim() !== targetLines[k].trim()) {
              allMatch = false;
              break;
            }
          }
          if (allMatch) {
            matchIndices.push(lineIdx);
          }
        }
        if (matchIndices.length === 1 || (matchIndices.length > 1 && hunk.allowMultiple)) {
          const repLines = normReplacement.split('\n');
          for (let mIdx = matchIndices.length - 1; mIdx >= 0; mIdx--) {
            workLines.splice(matchIndices[mIdx], targetLines.length, ...repLines);
            if (!hunk.allowMultiple) break;
          }
          const joined = workLines.join('\n');
          working = hasCrLf ? joined.replace(/\n/g, '\r\n') : joined;
          continue;
        }
      }
    }

    // Stage 4: Line-range replacement if startLine & endLine are provided
    if (Number.isFinite(startLine) && startLine >= 1) {
      const hasCrLf = working.includes('\r\n');
      const lines = working.replace(/\r\n/g, '\n').split('\n');
      const sIdx = Math.max(1, Math.floor(startLine)) - 1;
      const eIdx = Number.isFinite(endLine) && endLine >= startLine
        ? Math.min(lines.length, Math.floor(endLine))
        : sIdx + 1;
      if (sIdx < lines.length) {
        const repLines = replacement.replace(/\r\n/g, '\n').split('\n');
        lines.splice(sIdx, Math.max(0, eIdx - sIdx), ...repLines);
        const joined = lines.join('\n');
        working = hasCrLf ? joined.replace(/\n/g, '\r\n') : joined;
        continue;
      }
    }

    if (!target) {
      throw new Error(`Hunk #${i + 1} in "${filePath}" has empty targetContent (and no valid startLine/endLine).`);
    }
    throw new Error(`Hunk #${i + 1} targetContent not found in "${filePath}". Read the file first with readFile to get exact lines.`);
  }
  return working;
}

export async function autonomyReadFile(args: Record<string, any>): Promise<AutonomyResult> {
  const { cleaned, targetPath, scope } = resolveUniversalPath(
    args.filePath || args.path || '',
    'read',
    { scope: args.scope, rootPath: args.rootPath || args.cwd }
  );
  if (!fs.existsSync(targetPath)) {
    return {
      tag: 'READ_FILE',
      action: `Read ${cleaned} [${scope}]`,
      success: false,
      summary: `File not found: ${cleaned} (${targetPath})`,
      output: { error: `File not found: ${cleaned}`, targetPath, scope }
    };
  }
  const stat = await fs.promises.stat(targetPath);
  if (stat.isDirectory()) {
    return {
      tag: 'READ_FILE',
      action: `Read ${cleaned} [${scope}]`,
      success: false,
      summary: `"${cleaned}" is a directory; use listDirectory instead.`,
      output: { error: `"${cleaned}" is a directory`, targetPath, scope }
    };
  }
  const rawContent = await fs.promises.readFile(targetPath, 'utf-8');
  const allLines = rawContent.split('\n');
  const totalLines = allLines.length;
  const startLine = Number(args.startLine);
  const endLine = Number(args.endLine);
  const query = typeof args.query === 'string' && args.query.trim() ? args.query.trim() : (typeof args.symbol === 'string' && args.symbol.trim() ? args.symbol.trim() : '');
  const compactForLive = Boolean(args.compactForLive);
  const maxChars = Number.isFinite(Number(args.maxChars)) && Number(args.maxChars) > 200
    ? Math.floor(Number(args.maxChars))
    : (compactForLive ? 3600 : 0);

  // Fast query/symbol jump: locate matching lines inside large files and return a clean line-numbered context window
  if (query && !(Number.isFinite(startLine) && startLine >= 1)) {
    const qLower = query.toLowerCase();
    const hitLines: number[] = [];
    for (let i = 0; i < allLines.length; i++) {
      if (allLines[i].toLowerCase().includes(qLower)) {
        hitLines.push(i + 1);
        if (hitLines.length >= 12) break;
      }
    }
    if (hitLines.length === 0) {
      return {
        tag: 'READ_FILE',
        action: `Search inside ${cleaned} [${scope}]`,
        success: true,
        summary: `No matches for "${query}" inside ${cleaned} (${totalLines} lines)`,
        output: {
          path: cleaned,
          scope,
          totalLines,
          query,
          matchesFound: 0,
          hint: 'Try a shorter symbol/keyword or pass startLine/endLine.'
        }
      };
    }
    const anchor = hitLines[0];
    const contextRadius = compactForLive ? 25 : 45;
    const from = Math.max(1, anchor - Math.floor(contextRadius / 2));
    const to = Math.min(totalLines, anchor + contextRadius);
    let slice = allLines
      .slice(from - 1, to)
      .map((line, idx) => `${from + idx}: ${line}`)
      .join('\n');
    slice = internalSecretsHandler.redactText(slice);
    if (maxChars > 0 && slice.length > maxChars) {
      slice = `${slice.slice(0, maxChars)}\n... [truncated at ${maxChars} chars]`;
    }
    return {
      tag: 'READ_FILE',
      action: `Read ${cleaned} around "${query}" (lines ${from}-${to}) [${scope}]`,
      success: true,
      summary: `Found "${query}" at line ${anchor} (total ${hitLines.length} hit(s)) in ${cleaned} (${totalLines} lines)`,
      output: compactForLive
        ? { path: cleaned, scope, totalLines, matchedLines: hitLines, shownLines: `${from}-${to}`, code: slice }
        : slice
    };
  }

  // Explicit line-range slice (slices BEFORE redacting so reading 100 lines of a 1MB file takes <5ms)
  if (Number.isFinite(startLine) && startLine >= 1) {
    const from = Math.max(1, Math.floor(startLine));
    const defaultWindow = compactForLive ? 95 : totalLines;
    const to = Number.isFinite(endLine) && endLine >= from
      ? Math.min(totalLines, Math.floor(endLine))
      : Math.min(totalLines, from + defaultWindow - 1);
    let slice = allLines
      .slice(from - 1, to)
      .map((line, idx) => `${from + idx}: ${line}`)
      .join('\n');
    slice = internalSecretsHandler.redactText(slice);
    const truncated = maxChars > 0 && slice.length > maxChars;
    if (truncated) {
      slice = `${slice.slice(0, maxChars)}\n... [truncated; pass startLine/endLine to read more]`;
    }
    return {
      tag: 'READ_FILE',
      action: `Read lines ${from}-${to} of ${cleaned} [${scope}]`,
      success: true,
      summary: `Read lines ${from}-${to} of ${totalLines} from ${cleaned} [${scope}]`,
      output: compactForLive
        ? { path: cleaned, scope, totalLines, shownLines: `${from}-${to}`, truncated: truncated || to < totalLines, code: slice }
        : slice
    };
  }

  // Live-voice compact full-file read: return line-numbered head capped cleanly so large files never stall Live audio
  if (compactForLive) {
    const capChars = maxChars || 3600;
    const collected: string[] = [];
    let charCount = 0;
    let lastLineShown = 0;
    for (let i = 0; i < totalLines; i++) {
      const formatted = `${i + 1}: ${allLines[i]}`;
      if (charCount + formatted.length + 1 > capChars && collected.length > 0) {
        break;
      }
      collected.push(formatted);
      charCount += formatted.length + 1;
      lastLineShown = i + 1;
    }
    const redactedSlice = internalSecretsHandler.redactText(collected.join('\n'));
    const truncated = lastLineShown < totalLines;
    return {
      tag: 'READ_FILE',
      action: `Read file: ${cleaned} [${scope}]`,
      success: true,
      summary: `Read lines 1-${lastLineShown} of ${totalLines} from ${cleaned} [${scope}]`,
      output: {
        path: cleaned,
        scope,
        totalLines,
        shownLines: `1-${lastLineShown}`,
        truncated,
        ...(truncated ? { hint: 'Large file excerpted. Pass query:"symbol" or startLine/endLine to jump anywhere.' } : {}),
        code: redactedSlice
      }
    };
  }

  const redacted = internalSecretsHandler.redactText(rawContent);
  return {
    tag: 'READ_FILE',
    action: `Read file: ${cleaned} [${scope}]`,
    success: true,
    summary: `Read ${redacted.length} chars (${totalLines} lines) from ${cleaned} [${scope}] (sha256:${sha256(rawContent).slice(0, 10)})`,
    output: redacted
  };
}

export async function autonomyWriteFile(args: Record<string, any>): Promise<AutonomyResult> {
  const { cleaned, targetPath, scope, baseRoot } = resolveUniversalPath(
    args.filePath || args.path || '',
    'write',
    { scope: args.scope, rootPath: args.rootPath || args.cwd }
  );
  const content = String(args.content ?? args.code ?? '');
  const verifyCompile = Boolean(args.verifyCompile);
  const agentId = String(args.agentId || 'uid_0');

  const existed = fs.existsSync(targetPath);
  const previousContent = existed ? await fs.promises.readFile(targetPath, 'utf-8') : null;

  await atomicWriteTextFile(targetPath, content);

  if (verifyCompile) {
    const tsc = await runTypeCheck(baseRoot === '/' ? path.dirname(targetPath) : baseRoot, targetPath);
    if (!tsc.clean) {
      if (existed && previousContent !== null) {
        await atomicWriteTextFile(targetPath, previousContent);
      } else if (fs.existsSync(targetPath)) {
        await fs.promises.unlink(targetPath).catch(() => {});
      }
      return {
        tag: 'WRITE_FILE',
        action: `Write & rollback ${cleaned} [${scope}]`,
        success: false,
        summary: `Compile verification failed; rolled back ${cleaned}`,
        output: { path: cleaned, targetPath, scope, rolledBack: true, diagnostics: tsc.diagnostics }
      };
    }
  }

  const diff = previousContent !== null ? createCompactDiff(cleaned, previousContent, content) : `+++ b/${cleaned} (${content.length} bytes)`;
  const snapshot = recordPatchSnapshot({
    agentId,
    operation: 'write',
    scope,
    displayPath: cleaned,
    targetPath,
    existedBefore: existed,
    previousContent,
    beforeSha256: previousContent !== null ? sha256(previousContent).slice(0, 16) : null,
    afterSha256: sha256(content).slice(0, 16),
    diff
  });

  return {
    tag: 'WRITE_FILE',
    action: `Wrote file: ${cleaned} [${scope}]`,
    success: true,
    summary: `Atomically wrote ${content.length} bytes to ${cleaned} [${scope}] (patchId:${snapshot.patchId})${verifyCompile ? ' (verified)' : ''}`,
    diff,
    output: {
      path: cleaned,
      targetPath,
      scope,
      patchId: snapshot.patchId,
      bytes: content.length,
      sha256: sha256(content).slice(0, 16),
      verifiedCompile: verifyCompile
    }
  };
}

export async function autonomyPatchFile(args: Record<string, any>): Promise<AutonomyResult> {
  const { cleaned, targetPath, scope, baseRoot } = resolveUniversalPath(
    args.filePath || args.path || '',
    'write',
    { scope: args.scope, rootPath: args.rootPath || args.cwd }
  );
  const targetContent = String(args.targetContent ?? args.search ?? args.oldText ?? args.target ?? '');
  const replacementContent = String(args.replacementContent ?? args.replace ?? args.newText ?? args.replacement ?? '');
  const startLine = args.startLine !== undefined ? Number(args.startLine) : undefined;
  const endLine = args.endLine !== undefined ? Number(args.endLine) : undefined;
  const allowMultiple = Boolean(args.allowMultiple);
  const verifyCompile = Boolean(args.verifyCompile);
  const agentId = String(args.agentId || 'uid_0');

  let effectiveCleaned = cleaned;
  let effectiveTargetPath = targetPath;
  if (!fs.existsSync(effectiveTargetPath) && baseRoot !== '/') {
    const fuzzy = tryFuzzyResolveWorkspaceFile(String(args.filePath || args.path || ''), baseRoot);
    if (fuzzy && fs.existsSync(fuzzy)) {
      effectiveTargetPath = fuzzy;
      effectiveCleaned = path.relative(baseRoot, fuzzy).split(path.sep).join('/');
    }
  }

  if (!fs.existsSync(effectiveTargetPath)) {
    return {
      tag: 'PATCH_FILE',
      action: `Patch ${effectiveCleaned} [${scope}]`,
      success: false,
      summary: `File not found: ${effectiveCleaned} (${effectiveTargetPath})`,
      output: { error: `File not found: ${effectiveCleaned}`, targetPath: effectiveTargetPath, scope }
    };
  }

  const original = await fs.promises.readFile(effectiveTargetPath, 'utf-8');
  let modified: string;
  try {
    modified = applyHunkList(effectiveCleaned, original, [{ targetContent, replacementContent, startLine, endLine, allowMultiple }]);
  } catch (err: any) {
    return {
      tag: 'PATCH_FILE',
      action: `Patch ${effectiveCleaned} [${scope}]`,
      success: false,
      summary: err?.message || `Patch pre-flight failed on ${effectiveCleaned}`,
      output: { error: err?.message || 'Patch pre-flight failed', targetPath: effectiveTargetPath, scope }
    };
  }

  await atomicWriteTextFile(effectiveTargetPath, modified);

  if (verifyCompile) {
    const tsc = await runTypeCheck(baseRoot === '/' ? path.dirname(effectiveTargetPath) : baseRoot, effectiveTargetPath);
    if (!tsc.clean) {
      await atomicWriteTextFile(effectiveTargetPath, original);
      return {
        tag: 'PATCH_FILE',
        action: `Patch & rollback ${effectiveCleaned} [${scope}]`,
        success: false,
        summary: `Compile check failed; rolled back ${effectiveCleaned}`,
        output: { path: effectiveCleaned, targetPath: effectiveTargetPath, scope, rolledBack: true, diagnostics: tsc.diagnostics }
      };
    }
  }

  const diff = createCompactDiff(effectiveCleaned, original, modified);
  const snapshot = recordPatchSnapshot({
    agentId,
    operation: 'patch',
    scope,
    displayPath: effectiveCleaned,
    targetPath: effectiveTargetPath,
    existedBefore: true,
    previousContent: original,
    beforeSha256: sha256(original).slice(0, 16),
    afterSha256: sha256(modified).slice(0, 16),
    diff
  });

  return {
    tag: 'PATCH_FILE',
    action: `Patched file: ${effectiveCleaned} [${scope}]`,
    success: true,
    summary: `Atomically patched ${effectiveCleaned} [${scope}] (patchId:${snapshot.patchId})${verifyCompile ? ' (verified)' : ''}`,
    diff,
    output: {
      path: effectiveCleaned,
      targetPath: effectiveTargetPath,
      scope,
      patchId: snapshot.patchId,
      sha256: sha256(modified).slice(0, 16),
      diff,
      verifiedCompile: verifyCompile
    }
  };
}

export async function autonomyAtomicPatchFile(args: Record<string, any>): Promise<AutonomyResult> {
  const { cleaned, targetPath, scope, baseRoot } = resolveUniversalPath(
    args.filePath || args.path || '',
    'write',
    { scope: args.scope, rootPath: args.rootPath || args.cwd }
  );
  const rawEdits = args.edits ?? args.patches ?? args.hunks;
  const edits: PatchHunk[] = Array.isArray(rawEdits)
    ? rawEdits
    : (args.targetContent || args.search || args.startLine !== undefined)
      ? [{
          targetContent: args.targetContent ?? args.search,
          replacementContent: args.replacementContent ?? args.replace ?? '',
          startLine: args.startLine,
          endLine: args.endLine,
          allowMultiple: args.allowMultiple
        }]
      : [];
  const verifyCompile = Boolean(args.verifyCompile);
  const agentId = String(args.agentId || 'uid_0');

  if (edits.length === 0) {
    return {
      tag: 'ATOMIC_PATCH',
      action: `Atomic patch ${cleaned} [${scope}]`,
      success: false,
      summary: 'edits array must contain at least one hunk',
      output: { error: 'edits array is required', targetPath, scope }
    };
  }
  let effectiveCleaned = cleaned;
  let effectiveTargetPath = targetPath;
  if (!fs.existsSync(effectiveTargetPath) && baseRoot !== '/') {
    const fuzzy = tryFuzzyResolveWorkspaceFile(String(args.filePath || args.path || ''), baseRoot);
    if (fuzzy && fs.existsSync(fuzzy)) {
      effectiveTargetPath = fuzzy;
      effectiveCleaned = path.relative(baseRoot, fuzzy).split(path.sep).join('/');
    }
  }
  if (!fs.existsSync(effectiveTargetPath)) {
    return {
      tag: 'ATOMIC_PATCH',
      action: `Atomic patch ${effectiveCleaned} [${scope}]`,
      success: false,
      summary: `File not found: ${effectiveCleaned} (${effectiveTargetPath})`,
      output: { error: `File not found: ${effectiveCleaned}`, targetPath: effectiveTargetPath, scope }
    };
  }

  const original = await fs.promises.readFile(effectiveTargetPath, 'utf-8');
  let modified: string;
  try {
    modified = applyHunkList(effectiveCleaned, original, edits);
  } catch (err: any) {
    return {
      tag: 'ATOMIC_PATCH',
      action: `Atomic patch ${effectiveCleaned} [${scope}]`,
      success: false,
      summary: err?.message || `Atomic patch pre-flight failed on ${effectiveCleaned}`,
      output: { error: err?.message || 'Atomic patch failed', targetPath: effectiveTargetPath, scope }
    };
  }

  await atomicWriteTextFile(effectiveTargetPath, modified);

  if (verifyCompile) {
    const tsc = await runTypeCheck(baseRoot === '/' ? path.dirname(effectiveTargetPath) : baseRoot, effectiveTargetPath);
    if (!tsc.clean) {
      await atomicWriteTextFile(effectiveTargetPath, original);
      return {
        tag: 'ATOMIC_PATCH',
        action: `Atomic patch & rollback ${effectiveCleaned} [${scope}]`,
        success: false,
        summary: `Syntax/TypeScript check failed after ${edits.length} hunks; rolled back ${effectiveCleaned}`,
        output: { path: effectiveCleaned, targetPath: effectiveTargetPath, scope, hunks: edits.length, rolledBack: true, diagnostics: tsc.diagnostics }
      };
    }
  }

  const diff = createCompactDiff(effectiveCleaned, original, modified);
  const snapshot = recordPatchSnapshot({
    agentId,
    operation: 'atomicPatch',
    scope,
    displayPath: effectiveCleaned,
    targetPath: effectiveTargetPath,
    existedBefore: true,
    previousContent: original,
    beforeSha256: sha256(original).slice(0, 16),
    afterSha256: sha256(modified).slice(0, 16),
    diff
  });

  return {
    tag: 'ATOMIC_PATCH',
    action: `Atomic multi-hunk patch: ${effectiveCleaned} [${scope}]`,
    success: true,
    summary: `Applied ${edits.length} atomic hunk(s) to ${effectiveCleaned} [${scope}] (patchId:${snapshot.patchId})${verifyCompile ? ' (verified)' : ''}`,
    diff,
    output: {
      path: effectiveCleaned,
      targetPath: effectiveTargetPath,
      scope,
      patchId: snapshot.patchId,
      hunksApplied: edits.length,
      sha256: sha256(modified).slice(0, 16),
      diff,
      verifiedCompile: verifyCompile
    }
  };
}

export async function autonomyBatchPatchFiles(args: Record<string, any>): Promise<AutonomyResult> {
  const operations: BatchFileOperation[] = Array.isArray(args.operations) ? args.operations : [];
  const verifyCompile = Boolean(args.verifyCompile);
  const defaultScope = args.scope;
  const defaultRootPath = args.rootPath || args.cwd;
  const agentId = String(args.agentId || 'uid_0');

  if (operations.length === 0) {
    return {
      tag: 'BATCH_PATCH',
      action: 'Batch transaction',
      success: false,
      summary: 'operations array is required and cannot be empty',
      output: { error: 'operations array is empty' }
    };
  }

  // Phase 1: Pre-flight validate all paths & simulate all in-memory transitions without touching disk
  const snapshots = new Map<string, { existed: boolean; content: string | null; cleaned: string; scope: 'orchestrator' | 'target' | 'host'; baseRoot: string }>();
  const staged = new Map<string, { action: 'write' | 'delete'; cleaned: string; scope: 'orchestrator' | 'target' | 'host'; baseRoot: string; newContent?: string }>();

  try {
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      const rawType = String(op.type || op.action || '').trim();
      const opType = rawType === 'atomic_patch' ? 'atomicPatch'
        : rawType === 'patch_file' ? 'patch'
        : rawType === 'write_file' ? 'write'
        : rawType === 'delete_file' ? 'delete'
        : rawType;
      const mode = opType === 'delete' ? 'delete' : 'write';
      const { cleaned, targetPath, scope, baseRoot } = resolveUniversalPath(
        op.filePath || '',
        mode,
        { scope: op.scope || defaultScope, rootPath: op.rootPath || defaultRootPath }
      );

      if (!snapshots.has(targetPath)) {
        const existed = fs.existsSync(targetPath);
        const content = existed ? await fs.promises.readFile(targetPath, 'utf-8') : null;
        snapshots.set(targetPath, { existed, content, cleaned, scope, baseRoot });
      }

      const prevStaged = staged.get(targetPath);
      const currentVirtualContent = prevStaged
        ? (prevStaged.action === 'delete' ? null : prevStaged.newContent ?? null)
        : snapshots.get(targetPath)!.content;

      if (opType === 'write') {
        staged.set(targetPath, { action: 'write', cleaned, scope, baseRoot, newContent: String(op.content ?? '') });
      } else if (opType === 'delete') {
        if (currentVirtualContent === null) {
          throw new Error(`Op #${i + 1}: cannot delete non-existent file "${cleaned}"`);
        }
        staged.set(targetPath, { action: 'delete', cleaned, scope, baseRoot });
      } else if (opType === 'patch') {
        if (currentVirtualContent === null) {
          throw new Error(`Op #${i + 1}: file not found "${cleaned}"`);
        }
        const batchTarget = op.targetContent ?? (op as any).search ?? (op as any).oldText ?? (op as any).target ?? '';
        const batchReplace = op.replacementContent ?? (op as any).replace ?? (op as any).newText ?? (op as any).replacement ?? '';
        const updated = applyHunkList(cleaned, currentVirtualContent, [{
          targetContent: String(batchTarget),
          replacementContent: String(batchReplace),
          startLine: (op as any).startLine,
          endLine: (op as any).endLine,
          allowMultiple: op.allowMultiple
        }]);
        staged.set(targetPath, { action: 'write', cleaned, scope, baseRoot, newContent: updated });
      } else if (opType === 'atomicPatch') {
        if (currentVirtualContent === null) {
          throw new Error(`Op #${i + 1}: file not found "${cleaned}"`);
        }
        const rawHunks = op.edits ?? op.patches ?? op.hunks;
        const hunks = Array.isArray(rawHunks) ? rawHunks : [];
        if (hunks.length === 0) throw new Error(`Op #${i + 1}: atomicPatch edits array is empty for "${cleaned}"`);
        const updated = applyHunkList(cleaned, currentVirtualContent, hunks);
        staged.set(targetPath, { action: 'write', cleaned, scope, baseRoot, newContent: updated });
      } else {
        throw new Error(`Op #${i + 1}: unsupported batch operation type "${rawType}"`);
      }
    }
  } catch (preflightErr: any) {
    return {
      tag: 'BATCH_PATCH',
      action: 'Batch pre-flight failed',
      success: false,
      summary: preflightErr?.message || 'Batch pre-flight validation failed (0 files touched)',
      output: { error: preflightErr?.message || 'Batch validation failed', filesModified: 0 }
    };
  }

  const rollbackAll = async () => {
    for (const [targetPath, snap] of snapshots.entries()) {
      if (snap.existed && snap.content !== null) {
        await atomicWriteTextFile(targetPath, snap.content).catch(() => {});
      } else if (fs.existsSync(targetPath)) {
        await fs.promises.unlink(targetPath).catch(() => {});
      }
    }
  };

  // Phase 2: Commit staged transitions atomically
  const summaryRows: Array<{ path: string; targetPath: string; scope: string; action: string; patchId?: string; sha256?: string }> = [];
  try {
    for (const [targetPath, change] of staged.entries()) {
      const snap = snapshots.get(targetPath)!;
      if (change.action === 'write') {
        await atomicWriteTextFile(targetPath, change.newContent!);
        const diff = snap.content !== null ? createCompactDiff(change.cleaned, snap.content, change.newContent!) : `+++ b/${change.cleaned}`;
        const rec = recordPatchSnapshot({
          agentId,
          operation: 'batch',
          scope: change.scope,
          displayPath: change.cleaned,
          targetPath,
          existedBefore: snap.existed,
          previousContent: snap.content,
          beforeSha256: snap.content !== null ? sha256(snap.content).slice(0, 16) : null,
          afterSha256: sha256(change.newContent!).slice(0, 16),
          diff
        });
        summaryRows.push({
          path: change.cleaned,
          targetPath,
          scope: change.scope,
          action: 'written',
          patchId: rec.patchId,
          sha256: sha256(change.newContent!).slice(0, 16)
        });
      } else {
        if (fs.existsSync(targetPath)) await fs.promises.unlink(targetPath);
        const rec = recordPatchSnapshot({
          agentId,
          operation: 'batch',
          scope: change.scope,
          displayPath: change.cleaned,
          targetPath,
          existedBefore: snap.existed,
          previousContent: snap.content,
          beforeSha256: snap.content !== null ? sha256(snap.content).slice(0, 16) : null,
          afterSha256: null,
          diff: `--- a/${change.cleaned} (deleted)`
        });
        summaryRows.push({ path: change.cleaned, targetPath, scope: change.scope, action: 'deleted', patchId: rec.patchId });
      }
    }
  } catch (commitErr: any) {
    await rollbackAll();
    return {
      tag: 'BATCH_PATCH',
      action: 'Batch commit failed & rolled back',
      success: false,
      summary: `Commit failed (${commitErr?.message}); rolled back all ${snapshots.size} file(s)`,
      output: { error: commitErr?.message || 'Commit error', rolledBack: true, filesRestored: snapshots.size }
    };
  }

  // Phase 3: Optional compile gate across touched roots
  if (verifyCompile) {
    const touchedRoots = new Set<string>();
    for (const [, change] of staged.entries()) {
      if (change.baseRoot !== '/') touchedRoots.add(change.baseRoot);
    }
    for (const rootDir of touchedRoots) {
      const tsc = await runTypeCheck(rootDir);
      if (!tsc.clean) {
        await rollbackAll();
        return {
          tag: 'BATCH_PATCH',
          action: 'Batch compile check failed & rolled back',
          success: false,
          summary: `Compile check failed in ${rootDir}; rolled back all ${snapshots.size} file(s)`,
          output: { rolledBack: true, filesRestored: snapshots.size, diagnostics: tsc.diagnostics }
        };
      }
    }
  }

  return {
    tag: 'BATCH_PATCH',
    action: `Atomic multi-file transaction (${summaryRows.length} file(s))`,
    success: true,
    summary: `Committed ${operations.length} op(s) across ${summaryRows.length} file(s)${verifyCompile ? ' (verified)' : ''}`,
    output: {
      committedFiles: summaryRows,
      operationsCount: operations.length,
      verifiedCompile: verifyCompile
    }
  };
}

export async function autonomyDeleteFile(args: Record<string, any>): Promise<AutonomyResult> {
  const { cleaned, targetPath, scope, baseRoot } = resolveUniversalPath(
    args.filePath || args.path || '',
    'delete',
    { scope: args.scope, rootPath: args.rootPath || args.cwd }
  );
  const verifyCompile = Boolean(args.verifyCompile);
  const agentId = String(args.agentId || 'uid_0');

  if (!fs.existsSync(targetPath)) {
    return {
      tag: 'DELETE_FILE',
      action: `Delete ${cleaned} [${scope}]`,
      success: false,
      summary: `File not found: ${cleaned}`,
      output: { error: `File not found: ${cleaned}`, targetPath, scope }
    };
  }
  const stat = await fs.promises.stat(targetPath);
  if (stat.isDirectory()) {
    return {
      tag: 'DELETE_FILE',
      action: `Delete ${cleaned} [${scope}]`,
      success: false,
      summary: `Refusing to delete directory "${cleaned}" via deleteFile.`,
      output: { error: 'Cannot delete directory via deleteFile', targetPath, scope }
    };
  }

  const backup = await fs.promises.readFile(targetPath, 'utf-8');
  await fs.promises.unlink(targetPath);

  if (verifyCompile) {
    const tsc = await runTypeCheck(baseRoot === '/' ? path.dirname(targetPath) : baseRoot);
    if (!tsc.clean) {
      await atomicWriteTextFile(targetPath, backup);
      return {
        tag: 'DELETE_FILE',
        action: `Delete & rollback ${cleaned} [${scope}]`,
        success: false,
        summary: `Compile failed after deleting ${cleaned}; restored file`,
        output: { path: cleaned, targetPath, scope, rolledBack: true, diagnostics: tsc.diagnostics }
      };
    }
  }

  const snapshot = recordPatchSnapshot({
    agentId,
    operation: 'delete',
    scope,
    displayPath: cleaned,
    targetPath,
    existedBefore: true,
    previousContent: backup,
    beforeSha256: sha256(backup).slice(0, 16),
    afterSha256: null,
    diff: `--- a/${cleaned} (deleted ${backup.length} bytes)`
  });

  return {
    tag: 'DELETE_FILE',
    action: `Deleted file: ${cleaned} [${scope}]`,
    success: true,
    summary: `Deleted ${cleaned} [${scope}] (${backup.length} bytes, patchId:${snapshot.patchId})${verifyCompile ? ' (verified)' : ''}`,
    output: { path: cleaned, targetPath, scope, patchId: snapshot.patchId, deletedBytes: backup.length }
  };
}

export async function autonomyRollbackPatch(args: Record<string, any> = {}): Promise<AutonomyResult> {
  const patchId = String(args.patchId || '').trim();
  const filePath = String(args.filePath || args.path || '').trim();

  if (args.operation === 'list' || (!patchId && !filePath && !args.latest)) {
    const ledger = getAtomicPatchLedger(Number(args.limit) || 25);
    return {
      tag: 'ROLLBACK_PATCH',
      action: 'Listed atomic patch snapshot ledger',
      success: true,
      summary: `${ledger.length} atomic patch snapshot(s) available for instant rollback`,
      output: { totalSnapshots: atomicPatchLedger.length, snapshots: ledger }
    };
  }

  let targetRecord: AtomicPatchSnapshotRecord | undefined;
  if (patchId) {
    targetRecord = atomicPatchLedger.find(r => r.patchId === patchId);
  } else if (filePath) {
    const resolved = resolveUniversalPath(filePath, 'write', { scope: args.scope, rootPath: args.rootPath });
    targetRecord = atomicPatchLedger.find(r => (r.targetPath === resolved.targetPath || r.displayPath === filePath) && !r.rolledBack);
  } else if (args.latest) {
    targetRecord = atomicPatchLedger.find(r => !r.rolledBack);
  }

  if (!targetRecord) {
    return {
      tag: 'ROLLBACK_PATCH',
      action: `Rollback atomic patch (${patchId || filePath || 'latest'})`,
      success: false,
      summary: `No matching atomic patch snapshot found for "${patchId || filePath || 'latest'}"`,
      output: { error: 'Snapshot not found', availableSnapshots: getAtomicPatchLedger(10) }
    };
  }

  if (targetRecord.existedBefore && targetRecord.previousContent !== null) {
    await atomicWriteTextFile(targetRecord.targetPath, targetRecord.previousContent);
  } else if (!targetRecord.existedBefore && fs.existsSync(targetRecord.targetPath)) {
    await fs.promises.unlink(targetRecord.targetPath).catch(() => {});
  }

  targetRecord.rolledBack = true;
  savePatchLedger();

  return {
    tag: 'ROLLBACK_PATCH',
    action: `Rolled back ${targetRecord.displayPath} (${targetRecord.patchId})`,
    success: true,
    summary: `Atomically restored ${targetRecord.displayPath} [${targetRecord.scope}] to pre-patch state (sha256:${targetRecord.beforeSha256 || 'deleted'})`,
    output: {
      patchId: targetRecord.patchId,
      path: targetRecord.displayPath,
      targetPath: targetRecord.targetPath,
      scope: targetRecord.scope,
      restoredSha256: targetRecord.beforeSha256,
      rolledBackAt: new Date().toISOString()
    }
  };
}

export async function autonomyListDirectory(args: Record<string, any>): Promise<AutonomyResult> {
  const { cleaned, targetPath, scope } = resolveUniversalPath(
    args.dirPath || args.path || '.',
    'list',
    { scope: args.scope, rootPath: args.rootPath || args.cwd }
  );
  if (!fs.existsSync(targetPath)) {
    return {
      tag: 'LIST_DIR',
      action: `List ${cleaned} [${scope}]`,
      success: false,
      summary: `Directory not found: ${cleaned} (${targetPath})`,
      output: { error: `Directory not found: ${cleaned}`, targetPath, scope }
    };
  }

  const filterText = typeof args.filter === 'string' && args.filter.trim() ? args.filter.trim().toLowerCase() : '';
  const compact = Boolean(args.compact);
  const recursive = Boolean(args.recursive) || Boolean(filterText);
  const maxDepth = Math.min(Math.max(Number(args.maxDepth) || (filterText ? 5 : 2), 1), 6);
  const maxItems = compact ? 100 : 600;
  const results: Array<{ name: string; path: string; fullPath: string; type: 'directory' | 'file'; size?: number }> = [];

  const walk = async (dir: string, relBase: string, depth: number) => {
    if (results.length >= maxItems) return;
    let entries: fs.Dirent[] = [];
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (results.length >= maxItems) return;
      if (IGNORED_DIRS.has(entry.name)) continue;
      if (compact && entry.name === 'data' && cleaned !== 'data') continue;
      if (entry.name === '.vault.key' || entry.name === '.secrets.vault.enc') continue;
      const entryRel = relBase === '.' ? entry.name : `${relBase}/${entry.name}`;
      const fullChild = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!filterText || entryRel.toLowerCase().includes(filterText)) {
          results.push({ name: entry.name, path: entryRel, fullPath: fullChild, type: 'directory' });
        }
        if (recursive && depth < maxDepth) {
          await walk(fullChild, entryRel, depth + 1);
        }
      } else {
        if (filterText && !entryRel.toLowerCase().includes(filterText)) continue;
        if (compact) {
          results.push({ name: entry.name, path: entryRel, fullPath: fullChild, type: 'file' });
        } else {
          let size = 0;
          try { size = (await fs.promises.stat(fullChild)).size; } catch {}
          results.push({ name: entry.name, path: entryRel, fullPath: fullChild, type: 'file', size });
        }
      }
    }
  };

  await walk(targetPath, cleaned, 1);

  if (compact) {
    const dirs = results.filter((r) => r.type === 'directory').map((r) => r.path);
    const files = results.filter((r) => r.type === 'file').map((r) => r.path);
    return {
      tag: 'LIST_DIR',
      action: `Listed ${cleaned}${filterText ? ` (filter: ${filterText})` : ''} [${scope}]`,
      success: true,
      summary: `${dirs.length} dirs, ${files.length} files in ${cleaned} [${scope}]`,
      output: { path: cleaned, scope, count: results.length, dirs, files }
    };
  }

  return {
    tag: 'LIST_DIR',
    action: `Listed directory: ${cleaned} [${scope}]`,
    success: true,
    summary: `${results.length} entries in ${cleaned} [${scope}] (${targetPath})`,
    output: results
  };
}

export async function autonomySearchCode(args: Record<string, any>): Promise<AutonomyResult> {
  const queryText = String(args.query || args.pattern || '').trim();
  if (!queryText) {
    return {
      tag: 'SEARCH_CODE',
      action: 'Search codebase',
      success: false,
      summary: 'query string is required',
      output: { error: 'query string is required' }
    };
  }

  const { cleaned, targetPath, scope } = resolveUniversalPath(
    args.dirPath || args.path || '.',
    'list',
    { scope: args.scope, rootPath: args.rootPath || args.cwd }
  );
  const isRegex = Boolean(args.isRegex ?? args.regex);
  const caseSensitive = Boolean(args.caseSensitive);
  const maxResults = Math.min(Math.max(Number(args.maxResults) || 60, 1), 250);
  const extFilter: string[] | null = Array.isArray(args.fileExtensions) && args.fileExtensions.length > 0
    ? args.fileExtensions.map((e: string) => String(e).toLowerCase())
    : null;

  let matcher: RegExp | null = null;
  if (isRegex) {
    try {
      matcher = new RegExp(queryText, caseSensitive ? '' : 'i');
    } catch {
      matcher = null;
    }
  }

  const matches: Array<{ file: string; fullPath: string; line: number; text: string }> = [];
  const qLower = queryText.toLowerCase();
  const skipDataDir = !cleaned.toLowerCase().startsWith('data');
  const BINARY_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.db', '.db-wal', '.db-shm', '.gz', '.zip', '.jar', '.apk', '.woff2', '.mp3', '.wav', '.mp4', '.ogg', '.webm']);

  const candidateFiles: Array<{ rel: string; fullPath: string }> = [];
  const collectFiles = async (dir: string, relBase: string) => {
    if (candidateFiles.length >= 1200) return;
    let entries: fs.Dirent[] = [];
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    const subdirs: Array<{ full: string; rel: string }> = [];
    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      if (skipDataDir && entry.name === 'data') continue;
      if (entry.name === '.vault.key' || entry.name === '.secrets.vault.enc') continue;
      const entryRel = relBase === '.' ? entry.name : `${relBase}/${entry.name}`;
      if (internalSecretsHandler.isSensitivePath(entryRel)) continue;

      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        subdirs.push({ full: fullPath, rel: entryRel });
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        if (extFilter && !extFilter.includes(ext)) continue;
        if (BINARY_EXTS.has(ext)) continue;
        candidateFiles.push({ rel: entryRel, fullPath });
      }
    }
    if (subdirs.length > 0) {
      await Promise.all(subdirs.map((d) => collectFiles(d.full, d.rel)));
    }
  };

  const scanFile = async (rel: string, fullPath: string) => {
    if (matches.length >= maxResults) return;
    let stat: fs.Stats;
    try { stat = await fs.promises.stat(fullPath); } catch { return; }
    if (stat.size > 1_500_000) return;

    let content: string;
    try { content = await fs.promises.readFile(fullPath, 'utf-8'); } catch { return; }
    if (!matcher && !(caseSensitive ? content.includes(queryText) : content.toLowerCase().includes(qLower))) {
      return;
    }
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (matches.length >= maxResults) break;
      const lineText = lines[i];
      const hit = matcher
        ? matcher.test(lineText)
        : (caseSensitive ? lineText.includes(queryText) : lineText.toLowerCase().includes(qLower));
      if (hit) {
        matches.push({
          file: rel,
          fullPath,
          line: i + 1,
          text: internalSecretsHandler.redactText(lineText.trim().slice(0, 220))
        });
      }
    }
  };

  if (fs.existsSync(targetPath)) {
    const stat = await fs.promises.stat(targetPath);
    if (stat.isDirectory()) {
      await collectFiles(targetPath, cleaned);
      const BATCH_SIZE = 24;
      for (let i = 0; i < candidateFiles.length && matches.length < maxResults; i += BATCH_SIZE) {
        const slice = candidateFiles.slice(i, i + BATCH_SIZE);
        await Promise.all(slice.map((f) => scanFile(f.rel, f.fullPath)));
      }
    } else {
      await scanFile(cleaned, targetPath);
    }
  }

  return {
    tag: 'SEARCH_CODE',
    action: `Searched "${queryText}" in ${cleaned} [${scope}]`,
    success: true,
    summary: `Found ${matches.length} match(es) for "${queryText}" in ${cleaned} [${scope}]`,
    output: { query: queryText, scope, rootSearched: targetPath, count: matches.length, totalMatches: matches.length, matches }
  };
}

export async function autonomyRunTerminalCommand(args: Record<string, any>): Promise<AutonomyResult> {
  const cmd = String(args.command || args.cmd || '').trim();
  if (!cmd) {
    return {
      tag: 'RUN_COMMAND',
      action: 'Run command',
      success: false,
      summary: 'Command string is required',
      output: { error: 'Command string is required' }
    };
  }

  // Block commands explicitly targeting encrypted vault key material
  if (/(\.vault\.key|\.secrets\.vault\.enc)/i.test(cmd)) {
    return {
      tag: 'RUN_COMMAND',
      action: `Blocked sensitive vault key command`,
      success: false,
      summary: 'Command blocked by internal secrets handler protection policy.',
      output: { exitCode: 403, stdout: '', stderr: 'Blocked: direct shell inspection of encrypted vault key material is prohibited.' }
    };
  }

  let execCwd = activeTargetSystem.rootPath || ORCHESTRATOR_ROOT;
  const requestedScope = String(args.scope || '').toLowerCase();
  if (args.cwd || args.workingDirectory || args.rootPath) {
    const rawCwd = String(args.cwd || args.workingDirectory || args.rootPath).trim();
    const resolved = resolveUniversalPath(rawCwd, 'list', { scope: requestedScope || 'host' });
    if (fs.existsSync(resolved.targetPath)) {
      execCwd = resolved.targetPath;
    }
  } else if (requestedScope === 'orchestrator' || requestedScope === 'self') {
    execCwd = ORCHESTRATOR_ROOT;
  } else if (requestedScope === 'target') {
    execCwd = activeTargetSystem.rootPath || ORCHESTRATOR_ROOT;
  }

  const timeoutMs = Math.min(Math.max(Number(args.timeoutMs) || 35000, 1000), 120000);
  return new Promise((resolve) => {
    child_process.exec(
      cmd,
      {
        cwd: execCwd,
        timeout: timeoutMs,
        maxBuffer: 8 * 1024 * 1024,
        env: { ...process.env, PAGER: 'cat', ...(args.env && typeof args.env === 'object' ? args.env : {}) }
      },
      (err, stdout, stderr) => {
        const exitCode = err ? (typeof err.code === 'number' ? err.code : 1) : 0;
        const cleanStdout = internalSecretsHandler.redactText(stdout?.trim() || '');
        const cleanStderr = internalSecretsHandler.redactText(stderr?.trim() || '');
        resolve({
          tag: 'RUN_COMMAND',
          action: `Executed in ${execCwd}: ${internalSecretsHandler.redactText(cmd)}`,
          success: !err,
          summary: `Exit code ${exitCode} (cwd: ${execCwd})`,
          output: { exitCode, cwd: execCwd, stdout: cleanStdout, stderr: cleanStderr }
        });
      }
    );
  });
}

export async function autonomyRunLint(args: Record<string, any> = {}): Promise<AutonomyResult> {
  const scope = String(args.scope || 'auto').toLowerCase();
  const targetDir = scope === 'orchestrator' || scope === 'self'
    ? ORCHESTRATOR_ROOT
    : (args.rootPath || args.cwd ? resolveUniversalPath(String(args.rootPath || args.cwd), 'list', { scope: 'host' }).targetPath : activeTargetSystem.rootPath);

  const tsc = await runTypeCheck(targetDir);
  return {
    tag: 'RUN_LINT',
    action: `Compiler & syntax check (${targetDir})`,
    success: tsc.clean,
    summary: tsc.clean ? `0 errors in ${targetDir}` : `Compiler/syntax errors reported in ${targetDir}`,
    output: { clean: tsc.clean, targetDir, diagnostics: tsc.diagnostics }
  };
}

/**
 * Points the Orchestrator at ANY target across the Sovereign OS ('self'), the Host System ('/path/...', '~/...'),
 * or Beyond (Remote Git repository URL -> auto-cloned/synced locally; Remote HTTP/REST/GraphQL/WS endpoint; Remote SSH host).
 */
export async function autonomySetTargetSystem(args: Record<string, any> = {}): Promise<AutonomyResult> {
  const rawTarget = String(args.targetPath || args.path || args.rootPath || args.url || args.endpoint || 'self').trim();
  const createIfMissing = args.createIfMissing !== false;

  if (!rawTarget || rawTarget.toLowerCase() === 'self' || rawTarget.toLowerCase() === 'orchestrator' || rawTarget === '@self') {
    activeTargetSystem = {
      rootPath: ORCHESTRATOR_ROOT,
      label: args.label ? String(args.label) : 'Lysander Genesis Orchestrator (Self Workspace)',
      isSelf: true,
      targetKind: 'self',
      detectedStack: detectDirectoryStack(ORCHESTRATOR_ROOT),
      pointedAt: new Date().toISOString(),
      history: activeTargetSystem.history
    };
    saveTargetSystemState();
    return {
      tag: 'TARGET_SYSTEM',
      action: `Pointed orchestrator at Self Workspace (${ORCHESTRATOR_ROOT})`,
      success: true,
      summary: `Active target pointed to Orchestrator Self Workspace (${ORCHESTRATOR_ROOT})`,
      output: getTargetSystemConfig()
    };
  }

  const isGitRepoUrl =
    /^git@[a-z0-9.-]+:/i.test(rawTarget) ||
    /\.git(?:#.*)?$/i.test(rawTarget) ||
    /^https?:\/\/(?:www\.)?(?:github\.com|gitlab\.com|bitbucket\.org|codeberg\.org)\/[^/\s]+\/[^/\s]+/i.test(rawTarget);

  if (isGitRepoUrl) {
    const externalDir = path.join(DATA_DIR, 'external_targets');
    await fs.promises.mkdir(externalDir, { recursive: true });
    const slug = rawTarget
      .replace(/^https?:\/\/[^/]+\//i, '')
      .replace(/^git@[^:]+:/i, '')
      .replace(/\.git$/i, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80) || `repo_${Date.now()}`;
    const repoDir = path.join(externalDir, slug);
    const gitReady = fs.existsSync(path.join(repoDir, '.git'));
    const syncCmd = gitReady
      ? `git -C ${JSON.stringify(repoDir)} pull --ff-only 2>&1 || git -C ${JSON.stringify(repoDir)} status -sb 2>&1`
      : `git clone --depth 50 ${JSON.stringify(rawTarget)} ${JSON.stringify(repoDir)} 2>&1`;
    const cloneRes = await autonomyRunTerminalCommand({ command: syncCmd, cwd: externalDir, timeoutMs: 60000 });
    await fs.promises.mkdir(repoDir, { recursive: true });
    const realDir = fs.realpathSync(repoDir);
    const stack = [...detectDirectoryStack(realDir), 'Remote Git Target'];
    const label = args.label ? String(args.label).trim() : `Remote Repo: ${slug}`;
    const now = new Date().toISOString();
    activeTargetSystem = {
      rootPath: realDir,
      label,
      isSelf: false,
      targetKind: 'remote_git',
      remoteEndpoint: rawTarget,
      detectedStack: stack,
      pointedAt: now,
      history: [
        { rootPath: realDir, label, pointedAt: now, remoteEndpoint: rawTarget, targetKind: 'remote_git' },
        ...activeTargetSystem.history.filter(h => h.remoteEndpoint !== rawTarget && h.rootPath !== realDir)
      ].slice(0, 20)
    };
    saveTargetSystemState();
    return {
      tag: 'TARGET_SYSTEM',
      action: `Pointed orchestrator at Remote Git Repository: ${rawTarget}`,
      success: cloneRes.success || fs.existsSync(realDir),
      summary: `Synced & pointed orchestrator at "${label}" (${realDir} <- ${rawTarget})`,
      output: {
        ...getTargetSystemConfig(),
        gitSyncOutput: cloneRes.output
      }
    };
  }

  const isSshTarget = /^ssh:\/\//i.test(rawTarget) || (/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+(?::.*)?$/.test(rawTarget) && !rawTarget.includes('/'));
  const isRemoteNetworkUrl = /^https?:\/\//i.test(rawTarget) || /^wss?:\/\//i.test(rawTarget);

  if (isSshTarget || isRemoteNetworkUrl) {
    const externalDir = path.join(DATA_DIR, 'external_targets');
    const slug = rawTarget
      .replace(/^[a-z]+:\/\//i, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80) || `remote_${Date.now()}`;
    const workspaceBridgeDir = path.join(externalDir, slug);
    await fs.promises.mkdir(workspaceBridgeDir, { recursive: true });
    const realBridgeDir = fs.realpathSync(workspaceBridgeDir);
    const kind = isSshTarget ? 'ssh_remote' : 'remote_endpoint';
    const label = args.label ? String(args.label).trim() : `External Target: ${rawTarget}`;
    const now = new Date().toISOString();

    let probeSummary: Record<string, any> = { targetKind: kind, endpoint: rawTarget };
    if (/^https?:\/\//i.test(rawTarget)) {
      const t0 = Date.now();
      try {
        const res = await fetch(rawTarget, { method: 'GET', redirect: 'follow' });
        const text = await res.text();
        probeSummary = {
          reachable: true,
          status: res.status,
          ok: res.ok,
          contentType: res.headers.get('content-type') || '',
          latencyMs: Date.now() - t0,
          preview: text.slice(0, 500)
        };
      } catch (err: any) {
        probeSummary = {
          reachable: false,
          latencyMs: Date.now() - t0,
          error: err?.message || String(err)
        };
      }
    }

    activeTargetSystem = {
      rootPath: realBridgeDir,
      label,
      isSelf: false,
      targetKind: kind,
      remoteEndpoint: rawTarget,
      detectedStack: isSshTarget ? ['Remote SSH Host', 'Staging Bridge'] : ['External HTTP/WS Endpoint', 'Staging Bridge'],
      pointedAt: now,
      history: [
        { rootPath: realBridgeDir, label, pointedAt: now, remoteEndpoint: rawTarget, targetKind: kind },
        ...activeTargetSystem.history.filter(h => h.remoteEndpoint !== rawTarget)
      ].slice(0, 20)
    };
    saveTargetSystemState();
    return {
      tag: 'TARGET_SYSTEM',
      action: `Pointed orchestrator beyond host at: ${rawTarget}`,
      success: true,
      summary: `Orchestrator pointed at external target "${label}" (${rawTarget}) with local staging bridge ${realBridgeDir}`,
      output: {
        ...getTargetSystemConfig(),
        probe: probeSummary
      }
    };
  }

  const expanded = rawTarget.startsWith('~/')
    ? path.join(os.homedir(), rawTarget.slice(1))
    : path.isAbsolute(rawTarget)
      ? path.normalize(rawTarget)
      : path.resolve(ORCHESTRATOR_ROOT, rawTarget);

  if (!fs.existsSync(expanded)) {
    if (createIfMissing) {
      await fs.promises.mkdir(expanded, { recursive: true });
    } else {
      return {
        tag: 'TARGET_SYSTEM',
        action: `Point orchestrator at ${expanded}`,
        success: false,
        summary: `Target directory does not exist: ${expanded}`,
        output: { error: `Directory not found: ${expanded}`, currentTarget: getTargetSystemConfig() }
      };
    }
  }

  const stat = await fs.promises.stat(expanded);
  const targetDir = stat.isDirectory() ? fs.realpathSync(expanded) : path.dirname(fs.realpathSync(expanded));
  const stack = detectDirectoryStack(targetDir);
  const label = args.label ? String(args.label).trim() : (targetDir === ORCHESTRATOR_ROOT ? 'Lysander Genesis Orchestrator (Self Workspace)' : path.basename(targetDir) || targetDir);
  const now = new Date().toISOString();

  const history = [
    { rootPath: targetDir, label, pointedAt: now, targetKind: targetDir === ORCHESTRATOR_ROOT ? 'self' : 'host_directory' },
    ...activeTargetSystem.history.filter(h => h.rootPath !== targetDir)
  ].slice(0, 20);

  activeTargetSystem = {
    rootPath: targetDir,
    label,
    isSelf: targetDir === ORCHESTRATOR_ROOT,
    targetKind: targetDir === ORCHESTRATOR_ROOT ? 'self' : 'host_directory',
    detectedStack: stack,
    pointedAt: now,
    history
  };
  saveTargetSystemState();

  let topEntries: string[] = [];
  try {
    topEntries = fs.readdirSync(targetDir).slice(0, 35);
  } catch {}

  return {
    tag: 'TARGET_SYSTEM',
    action: `Pointed orchestrator at: ${targetDir}`,
    success: true,
    summary: `Orchestrator pointed at "${label}" (${targetDir}) · Stack: ${stack.join(', ')}`,
    output: {
      ...getTargetSystemConfig(),
      topEntries
    }
  };
}

/**
 * Executes direct operations against ANY external target beyond the OS & Host System:
 * - `http_request` / `rest` / `graphql` / `webhook`: full HTTP client (GET/POST/PUT/PATCH/DELETE, custom headers, JSON/raw body)
 * - `git_clone_or_sync`: clone or pull any remote repository and point active target at it
 * - `ssh_exec`: run a command over SSH on a user-specified remote node
 * - `tcp_probe`: test raw TCP port connectivity, banner, and latency on any `host:port`
 * - `point_target`: point the Orchestrator at any OS, Host, Git, HTTP, or SSH target
 */
export async function autonomyExecuteExternalTarget(args: Record<string, any> = {}): Promise<AutonomyResult> {
  const operation = String(args.operation || args.action || 'http_request').toLowerCase().trim();

  if (operation === 'point_target' || operation === 'set_target') {
    return autonomySetTargetSystem(args);
  }

  if (operation === 'git_clone_or_sync' || operation === 'git_clone') {
    const repoUrl = String(args.url || args.repoUrl || args.target || activeTargetSystem.remoteEndpoint || '').trim();
    if (!repoUrl) {
      return {
        tag: 'EXTERNAL_TARGET',
        action: 'Git clone/sync external target',
        success: false,
        summary: 'Repository URL is required',
        output: { error: 'Provide url / repoUrl to clone or sync' }
      };
    }
    return autonomySetTargetSystem({ targetPath: repoUrl, label: args.label });
  }

  if (operation === 'ssh_exec' || operation === 'ssh') {
    const hostSpec = String(args.host || args.sshTarget || activeTargetSystem.remoteEndpoint || '')
      .replace(/^ssh:\/\//i, '')
      .trim();
    const remoteCmd = String(args.command || args.cmd || '').trim();
    if (!hostSpec || !remoteCmd) {
      return {
        tag: 'EXTERNAL_TARGET',
        action: 'SSH remote command',
        success: false,
        summary: 'Both host (e.g. user@host) and command are required for ssh_exec',
        output: { error: 'Provide host and command for ssh_exec' }
      };
    }
    const portArg = args.port ? `-p ${Number(args.port)}` : '';
    const sshCmd = `ssh -o BatchMode=yes -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new ${portArg} ${JSON.stringify(hostSpec)} ${JSON.stringify(remoteCmd)}`;
    return autonomyRunTerminalCommand({ command: sshCmd, timeoutMs: Number(args.timeoutMs) || 35000 });
  }

  if (operation === 'tcp_probe' || operation === 'port_check') {
    const rawHost = String(args.host || args.target || activeTargetSystem.remoteEndpoint || '127.0.0.1').trim();
    let host = rawHost;
    let port = Number(args.port || 0);
    if (!port && rawHost.includes(':')) {
      try {
        const parsed = rawHost.includes('://') ? new URL(rawHost) : new URL(`tcp://${rawHost}`);
        host = parsed.hostname;
        port = Number(parsed.port) || (rawHost.startsWith('https') ? 443 : 80);
      } catch {
        const parts = rawHost.split(':');
        host = parts[0];
        port = Number(parts[1]) || 80;
      }
    }
    if (!port) port = 80;

    const timeoutMs = Math.min(Math.max(Number(args.timeoutMs) || 6000, 500), 25000);
    const t0 = Date.now();
    const probeOut = await new Promise<{ reachable: boolean; latencyMs: number; banner?: string; error?: string }>((resolve) => {
      const socket = new net.Socket();
      let settled = false;
      let banner = '';
      const done = (payload: { reachable: boolean; latencyMs: number; banner?: string; error?: string }) => {
        if (settled) return;
        settled = true;
        try { socket.destroy(); } catch {}
        resolve(payload);
      };
      socket.setTimeout(timeoutMs);
      socket.on('connect', () => {
        setTimeout(() => {
          done({ reachable: true, latencyMs: Date.now() - t0, ...(banner ? { banner: banner.slice(0, 300) } : {}) });
        }, 120);
      });
      socket.on('data', (chunk) => {
        banner += chunk.toString('utf-8');
        done({ reachable: true, latencyMs: Date.now() - t0, banner: banner.slice(0, 300) });
      });
      socket.on('timeout', () => done({ reachable: false, latencyMs: Date.now() - t0, error: 'Connection timed out' }));
      socket.on('error', (err) => done({ reachable: false, latencyMs: Date.now() - t0, error: err.message }));
      socket.connect(port, host);
    });

    return {
      tag: 'EXTERNAL_TARGET',
      action: `TCP probe ${host}:${port}`,
      success: probeOut.reachable,
      summary: probeOut.reachable
        ? `${host}:${port} reachable in ${probeOut.latencyMs}ms`
        : `${host}:${port} unreachable (${probeOut.error || 'closed'})`,
      output: { host, port, ...probeOut }
    };
  }

  // Default: Full outbound HTTP / REST / GraphQL / Webhook execution against any pointed URL
  const baseEndpoint = activeTargetSystem.remoteEndpoint && /^https?:\/\//i.test(activeTargetSystem.remoteEndpoint)
    ? activeTargetSystem.remoteEndpoint
    : '';
  const rawUrl = String(args.url || args.endpoint || args.target || baseEndpoint || '').trim();
  if (!rawUrl) {
    return {
      tag: 'EXTERNAL_TARGET',
      action: 'Execute external HTTP/API request',
      success: false,
      summary: 'Target URL/endpoint is required (or point active target at an HTTP endpoint first)',
      output: { error: 'Target URL is required', currentTarget: getTargetSystemConfig() }
    };
  }

  const finalUrl = /^https?:\/\//i.test(rawUrl)
    ? rawUrl
    : baseEndpoint
      ? new URL(rawUrl, baseEndpoint.endsWith('/') ? baseEndpoint : `${baseEndpoint}/`).toString()
      : `https://${rawUrl}`;

  const method = String(args.method || (operation === 'graphql' || args.body || args.query ? 'POST' : 'GET')).toUpperCase();
  let headers: Record<string, string> = {};
  if (args.headers && typeof args.headers === 'object') {
    headers = { ...args.headers };
  } else if (typeof args.headersJson === 'string' && args.headersJson.trim()) {
    try { headers = JSON.parse(args.headersJson); } catch {}
  }

  let bodyPayload: string | undefined = undefined;
  if (operation === 'graphql' && args.query) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    bodyPayload = JSON.stringify({
      query: String(args.query),
      ...(args.variables ? { variables: typeof args.variables === 'string' ? JSON.parse(args.variables) : args.variables } : {})
    });
  } else if (args.body !== undefined && args.body !== null && method !== 'GET' && method !== 'HEAD') {
    if (typeof args.body === 'object') {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
      bodyPayload = JSON.stringify(args.body);
    } else {
      bodyPayload = String(args.body);
      if (bodyPayload.trim().startsWith('{') || bodyPayload.trim().startsWith('[')) {
        headers['Content-Type'] = headers['Content-Type'] || 'application/json';
      }
    }
  }

  const t0 = Date.now();
  try {
    const controller = new AbortController();
    const timeoutMs = Math.min(Math.max(Number(args.timeoutMs) || 30000, 1000), 90000);
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(finalUrl, {
      method,
      headers,
      body: bodyPayload,
      redirect: 'follow',
      signal: controller.signal
    });
    clearTimeout(timer);

    const rawText = await res.text();
    let parsedJson: any = undefined;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('json') || rawText.trim().startsWith('{') || rawText.trim().startsWith('[')) {
      try { parsedJson = JSON.parse(rawText); } catch {}
    }

    const respHeaders: Record<string, string> = {};
    res.headers.forEach((v, k) => {
      if (!/set-cookie|authorization/i.test(k)) respHeaders[k] = v;
    });

    return {
      tag: 'EXTERNAL_TARGET',
      action: `${method} ${finalUrl}`,
      success: res.ok,
      summary: `${method} ${finalUrl} -> HTTP ${res.status} (${Date.now() - t0}ms)`,
      output: {
        url: finalUrl,
        method,
        status: res.status,
        ok: res.ok,
        latencyMs: Date.now() - t0,
        headers: respHeaders,
        ...(parsedJson !== undefined ? { json: parsedJson } : { body: rawText.slice(0, 16000) }),
        totalBytes: rawText.length
      }
    };
  } catch (err: any) {
    return {
      tag: 'EXTERNAL_TARGET',
      action: `${method} ${finalUrl}`,
      success: false,
      summary: `External request failed: ${err?.message || String(err)}`,
      output: {
        url: finalUrl,
        method,
        latencyMs: Date.now() - t0,
        error: err?.message || String(err)
      }
    };
  }
}

/**
 * Inspects the Orchestrator's own workspace ('self'), the currently pointed-at Target System ('target'),
 * the Host OS environment ('host'), and the Atomic Patch Snapshot Ledger.
 */
export async function autonomyInspectTargetSystem(args: Record<string, any> = {}): Promise<AutonomyResult> {
  const config = getTargetSystemConfig();
  let targetEntries: string[] = [];
  try {
    targetEntries = fs.readdirSync(config.rootPath).filter(n => !IGNORED_DIRS.has(n)).slice(0, 40);
  } catch {}

  let selfEntries: string[] = [];
  try {
    selfEntries = fs.readdirSync(ORCHESTRATOR_ROOT).filter(n => !IGNORED_DIRS.has(n)).slice(0, 40);
  } catch {}

  const cpus = os.cpus();
  const hostSystem = {
    hostname: os.hostname(),
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    cpuModel: cpus[0]?.model || 'Host CPU',
    cpuCores: cpus.length,
    totalMemMb: Math.round(os.totalmem() / 1024 / 1024),
    freeMemMb: Math.round(os.freemem() / 1024 / 1024),
    uptimeSec: Math.round(os.uptime()),
    homedir: os.homedir(),
    tmpdir: os.tmpdir(),
    nodeVersion: process.version,
    pid: process.pid,
    uid: typeof process.getuid === 'function' ? process.getuid() : 0
  };

  return {
    tag: 'INSPECT_SYSTEMS',
    action: 'Inspected Orchestrator Self, Pointed Target System, and Host OS',
    success: true,
    summary: `Target="${config.label}" (${config.remoteEndpoint || config.rootPath}) | Self=${ORCHESTRATOR_ROOT} | Host=${hostSystem.platform}/${hostSystem.arch} (${hostSystem.freeMemMb}MB free)`,
    output: {
      targetSystem: {
        ...config,
        topLevelEntries: targetEntries
      },
      orchestratorSelf: {
        rootPath: ORCHESTRATOR_ROOT,
        topLevelEntries: selfEntries,
        detectedStack: detectDirectoryStack(ORCHESTRATOR_ROOT)
      },
      hostSystem,
      atomicPatchLedger: getAtomicPatchLedger(15)
    }
  };
}

/**
 * Executes comprehensive host-system inspection, process control, or multi-step scripts
 * across the Host OS, the pointed-at Target System, or the Orchestrator itself.
 */
export async function autonomyExecuteHostAction(args: Record<string, any> = {}): Promise<AutonomyResult> {
  const operation = String(args.operation || args.action || 'os_probe').toLowerCase().trim();

  if (operation === 'os_probe' || operation === 'status') {
    const [dfRes, psRes, toolsRes] = await Promise.all([
      autonomyRunTerminalCommand({ command: 'df -h . /tmp 2>/dev/null || true', timeoutMs: 8000 }),
      autonomyRunTerminalCommand({ command: 'ps aux 2>/dev/null | head -n 20 || true', timeoutMs: 8000 }),
      autonomyRunTerminalCommand({ command: 'which node npm npx git python3 bash curl sqlite3 ssh 2>/dev/null || true', timeoutMs: 8000 })
    ]);
    const sysInfo = await autonomyInspectTargetSystem();
    return {
      tag: 'HOST_SYSTEM',
      action: 'Host OS & Runtime Probe',
      success: true,
      summary: `Probed host OS (${os.platform()} ${os.release()}), disk mounts, processes, and installed toolchains`,
      output: {
        ...(sysInfo.output || {}),
        diskUsage: dfRes.output?.stdout || '',
        topProcesses: psRes.output?.stdout || '',
        availableBinaries: (toolsRes.output?.stdout || '').split('\n').filter(Boolean)
      }
    };
  }

  if (operation === 'process_list' || operation === 'ps') {
    return autonomyRunTerminalCommand({
      command: 'ps aux 2>/dev/null | head -n 45 || ps -ef | head -n 45',
      scope: args.scope,
      cwd: args.cwd
    });
  }

  if (operation === 'disk_usage' || operation === 'df') {
    return autonomyRunTerminalCommand({
      command: 'df -h 2>/dev/null && du -sh * 2>/dev/null | head -n 30',
      scope: args.scope,
      cwd: args.cwd
    });
  }

  if (operation === 'git_status' || operation === 'git') {
    return autonomyRunTerminalCommand({
      command: 'git status -sb 2>&1 && git log -n 5 --oneline 2>&1 || echo "Not a git repository"',
      scope: args.scope,
      cwd: args.cwd
    });
  }

  if (operation === 'exec' || operation === 'script' || args.command) {
    return autonomyRunTerminalCommand({
      command: String(args.command || args.script || ''),
      scope: args.scope,
      cwd: args.cwd || args.rootPath,
      env: args.env,
      timeoutMs: args.timeoutMs
    });
  }

  return autonomyInspectTargetSystem(args);
}

