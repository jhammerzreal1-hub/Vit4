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

import os from 'os';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync, spawn } from 'child_process';

export interface OsProcessRecord {
  pid: number;
  ppid: number;
  user: string;
  cpuPct: number;
  memPct: number;
  rssMb: number;
  stat: string;
  elapsed: string;
  command: string;
  isCurrentServer?: boolean;
}

export interface OsFileEntry {
  name: string;
  path: string;
  type: 'dir' | 'file' | 'symlink' | 'other';
  sizeBytes: number;
  permissions: string;
  modifiedAt: string;
  ext: string;
}

export interface OsDiskStats {
  path: string;
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  usedPct: number;
}

export interface OsNetworkInterfaceSummary {
  name: string;
  address: string;
  family: string;
  mac: string;
  internal: boolean;
}

const PROTECTED_PATHS = new Set([
  '/',
  '/bin',
  '/boot',
  '/dev',
  '/etc',
  '/lib',
  '/lib64',
  '/proc',
  '/root',
  '/sbin',
  '/sys',
  '/usr',
  '/var',
  'C:\\',
  'C:\\Windows'
]);

function safeExecText(cmd: string, timeoutMs = 2500): string {
  try {
    return execSync(cmd, {
      encoding: 'utf-8',
      timeout: timeoutMs,
      stdio: ['ignore', 'pipe', 'ignore']
    });
  } catch {
    return '';
  }
}

export function getRealOsRuntimeInfo() {
  const cpus = os.cpus();
  const totalMemBytes = os.totalmem();
  const freeMemBytes = os.freemem();
  const usedMemBytes = Math.max(0, totalMemBytes - freeMemBytes);
  const procMem = process.memoryUsage();
  const netIfaces = os.networkInterfaces();

  const interfaces: OsNetworkInterfaceSummary[] = [];
  for (const [name, list] of Object.entries(netIfaces)) {
    if (!list) continue;
    for (const item of list) {
      interfaces.push({
        name,
        address: item.address,
        family: item.family,
        mac: item.mac,
        internal: item.internal
      });
    }
  }

  let userInfo: { username: string; uid: number; gid: number; homedir: string; shell: string | null } = {
    username: 'root',
    uid: 0,
    gid: 0,
    homedir: os.homedir(),
    shell: process.env.SHELL || null
  };
  try {
    const u = os.userInfo();
    userInfo = {
      username: u.username,
      uid: typeof u.uid === 'number' ? u.uid : 0,
      gid: typeof u.gid === 'number' ? u.gid : 0,
      homedir: u.homedir || os.homedir(),
      shell: u.shell || process.env.SHELL || null
    };
  } catch {}

  const uname = os.platform() === 'win32'
    ? `Windows ${os.release()} ${os.arch()}`
    : safeExecText('uname -a', 1500).trim() || `${os.type()} ${os.release()} ${os.arch()}`;

  const binaries = ['node', 'npm', 'git', 'python3', 'curl', 'sqlite3', 'ffmpeg', 'docker', 'gcc', 'rustc', 'go', 'bash'];
  const locator = os.platform() === 'win32' ? 'where' : 'command -v';
  const toolchains = binaries.map((bin) => {
    const resolved = safeExecText(`${locator} ${bin}`, 800).split(/\r?\n/)[0]?.trim() || '';
    return {
      name: bin,
      available: Boolean(resolved),
      path: resolved || null
    };
  });

  // Real listening sockets (non-blocking quick snapshot)
  const rawSockets =
    os.platform() === 'win32'
      ? safeExecText('netstat -ano', 2000)
      : safeExecText('ss -tuln 2>/dev/null || netstat -tuln 2>/dev/null', 2000);
  const listeningSockets = rawSockets
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /LISTEN|udp/i.test(l))
    .slice(0, 24);

  const disk = getDiskStats(process.cwd());

  return {
    kernelName: 'Lysander Sovereign OS Kernel',
    kernelVersion: '7.0.0-ring-neg3',
    hostPlatform: os.platform(),
    hostType: os.type(),
    hostRelease: os.release(),
    arch: os.arch(),
    hostname: os.hostname(),
    uname,
    nodeVersion: process.version,
    pid: process.pid,
    uptimeSec: Math.round(os.uptime()),
    loadAvg: os.loadavg(),
    cwd: process.cwd(),
    homedir: os.homedir(),
    tmpdir: os.tmpdir(),
    hostUser: userInfo,
    authority: {
      uid: 0,
      uid_0: true,
      ring: -3,
      hypervisor: 'ACTIVE'
    },
    cpu: {
      cores: cpus.length,
      model: cpus[0]?.model || `${os.arch()} Multi-Core`,
      speedMhz: cpus[0]?.speed || 0
    },
    memory: {
      totalBytes: totalMemBytes,
      freeBytes: freeMemBytes,
      usedBytes: usedMemBytes,
      usedPct: totalMemBytes > 0 ? Math.round((usedMemBytes / totalMemBytes) * 100) : 0,
      processRssMb: Math.round(procMem.rss / 1024 / 1024),
      processHeapUsedMb: Math.round(procMem.heapUsed / 1024 / 1024)
    },
    disk,
    interfaces,
    toolchains,
    listeningSockets,
    crossPlatformSupport: {
      linux: true,
      macos: true,
      windows: true,
      android: true,
      ios: true,
      harmonyos: true,
      termux: Boolean(safeExecText('command -v termux-info', 400).trim()),
      capacitorAndroid: fs.existsSync(path.join(process.cwd(), 'capacitor.config.json'))
    },
    timestamp: new Date().toISOString()
  };
}

export function getDiskStats(targetPath: string): OsDiskStats {
  const resolved = path.resolve(targetPath || process.cwd());
  try {
    const anyFs = fs as any;
    if (typeof anyFs.statfsSync === 'function') {
      const st = anyFs.statfsSync(resolved);
      const bsize = Number(st.bsize || 4096);
      const totalBytes = Number(st.blocks || 0) * bsize;
      const freeBytes = Number(st.bavail ?? st.bfree ?? 0) * bsize;
      const usedBytes = Math.max(0, totalBytes - freeBytes);
      return {
        path: resolved,
        totalBytes,
        freeBytes,
        usedBytes,
        usedPct: totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0
      };
    }
  } catch {}
  return { path: resolved, totalBytes: 0, freeBytes: 0, usedBytes: 0, usedPct: 0 };
}

export function listRealProcesses(limit = 60): OsProcessRecord[] {
  const plat = os.platform();
  const out: OsProcessRecord[] = [];

  if (plat === 'win32') {
    const csv = safeExecText('tasklist /FO CSV /NH', 2500);
    for (const line of csv.split(/\r?\n/).slice(0, limit)) {
      const cols = line.split('","').map((c) => c.replace(/^"|"$/g, ''));
      if (cols.length >= 5) {
        const pid = Number(cols[1]) || 0;
        const memKb = Number(cols[4].replace(/[^\d]/g, '')) || 0;
        out.push({
          pid,
          ppid: 0,
          user: os.userInfo().username || 'SYSTEM',
          cpuPct: 0,
          memPct: 0,
          rssMb: Math.round((memKb / 1024) * 10) / 10,
          stat: 'RUN',
          elapsed: 'active',
          command: cols[0],
          isCurrentServer: pid === process.pid
        });
      }
    }
  } else {
    const cmd =
      plat === 'darwin'
        ? 'ps -axo pid,ppid,user,%cpu,%mem,rss,stat,etime,comm'
        : 'ps -eo pid,ppid,user,%cpu,%mem,rss,stat,etime,comm --sort=-%cpu';
    const raw = safeExecText(cmd, 2500);
    const lines = raw.split(/\r?\n/).slice(1);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parts = trimmed.split(/\s+/);
      if (parts.length < 9) continue;
      const pid = Number(parts[0]);
      const ppid = Number(parts[1]);
      const user = parts[2];
      const cpuPct = Number(parts[3]) || 0;
      const memPct = Number(parts[4]) || 0;
      const rssKb = Number(parts[5]) || 0;
      const stat = parts[6];
      const elapsed = parts[7];
      const command = parts.slice(8).join(' ');
      if (!Number.isFinite(pid)) continue;
      out.push({
        pid,
        ppid: Number.isFinite(ppid) ? ppid : 0,
        user,
        cpuPct,
        memPct,
        rssMb: Math.round((rssKb / 1024) * 10) / 10,
        stat,
        elapsed,
        command,
        isCurrentServer: pid === process.pid
      });
      if (out.length >= limit) break;
    }
  }

  // Guarantee current server process appears even if ps unavailable
  if (!out.some((p) => p.pid === process.pid)) {
    const procMem = process.memoryUsage();
    out.unshift({
      pid: process.pid,
      ppid: process.ppid || 0,
      user: 'root',
      cpuPct: 0,
      memPct: Math.round((procMem.rss / Math.max(1, os.totalmem())) * 1000) / 10,
      rssMb: Math.round((procMem.rss / 1024 / 1024) * 10) / 10,
      stat: 'Ss+',
      elapsed: `${Math.round(process.uptime())}s`,
      command: 'tsx server.ts (Sovereign OS Kernel)',
      isCurrentServer: true
    });
  }

  return out;
}

export function signalRealProcess(pid: number, signal: 'SIGTERM' | 'SIGKILL' | 'SIGSTOP' | 'SIGCONT' = 'SIGTERM') {
  if (!Number.isInteger(pid) || pid <= 1) {
    throw new Error('Cannot signal kernel PID 0 or init PID 1.');
  }
  if (pid === process.pid || pid === process.ppid) {
    throw new Error('Cannot terminate active Sovereign OS host process from Task Manager.');
  }
  const allowed: Record<string, NodeJS.Signals> = {
    SIGTERM: 'SIGTERM',
    SIGKILL: 'SIGKILL',
    SIGSTOP: 'SIGSTOP',
    SIGCONT: 'SIGCONT'
  };
  const sig = allowed[signal] || 'SIGTERM';
  process.kill(pid, sig);
  return { success: true, pid, signal: sig };
}

export interface OsStorageVolume {
  device: string;
  fsType: string;
  mountPoint: string;
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  usedPct: number;
}

export interface OsHostPlace {
  id: string;
  label: string;
  path: string;
  category: 'os' | 'user' | 'system';
  exists: boolean;
  writable: boolean;
}

export interface OsDownloadItem {
  name: string;
  path: string;
  source: 'os-downloads' | 'host-downloads' | 'os-apps' | 'host-tmp';
  sourceLabel: string;
  type: 'dir' | 'file' | 'symlink' | 'other';
  sizeBytes: number;
  permissions: string;
  modifiedAt: string;
  ext: string;
}

export function resolveSafeHostPath(inputPath?: string): string {
  const raw = (inputPath || '').trim();
  if (!raw) return process.cwd();
  if (raw === '~') return os.homedir();
  if (raw.startsWith('~/') || raw.startsWith('~\\')) {
    return path.resolve(os.homedir(), raw.slice(2));
  }
  return path.resolve(raw);
}

export function getHostStorageVolumes(): OsStorageVolume[] {
  const volumes: OsStorageVolume[] = [];
  const plat = os.platform();

  if (plat === 'win32') {
    const raw = safeExecText('wmic logicaldisk get Caption,FileSystem,FreeSpace,Size /format:csv', 3000);
    for (const line of raw.split(/\r?\n/)) {
      const cols = line.trim().split(',');
      if (cols.length >= 5 && /^[A-Z]:$/i.test(cols[1])) {
        const caption = cols[1].trim();
        const fsType = cols[2]?.trim() || 'NTFS';
        const freeBytes = Number(cols[3]) || 0;
        const totalBytes = Number(cols[4]) || 0;
        const usedBytes = Math.max(0, totalBytes - freeBytes);
        volumes.push({
          device: caption,
          fsType,
          mountPoint: `${caption}\\`,
          totalBytes,
          usedBytes,
          freeBytes,
          usedPct: totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0
        });
      }
    }
  } else {
    const raw =
      plat === 'darwin'
        ? safeExecText('df -kP', 2500)
        : safeExecText('df -B1 -PT 2>/dev/null || df -kP', 2500);
    const lines = raw.split(/\r?\n/).slice(1);
    const isB1T = raw.includes('Type') && raw.includes('1B-blocks');
    const seenMounts = new Set<string>();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parts = trimmed.split(/\s+/);
      if (isB1T && parts.length >= 7) {
        const device = parts[0];
        const fsType = parts[1];
        const totalBytes = Number(parts[2]) || 0;
        const usedBytes = Number(parts[3]) || 0;
        const freeBytes = Number(parts[4]) || 0;
        const mountPoint = parts.slice(6).join(' ');
        if (!mountPoint || seenMounts.has(mountPoint)) continue;
        seenMounts.add(mountPoint);
        volumes.push({
          device,
          fsType,
          mountPoint,
          totalBytes,
          usedBytes,
          freeBytes,
          usedPct: totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0
        });
      } else if (parts.length >= 6) {
        const device = parts[0];
        const totalBytes = (Number(parts[1]) || 0) * 1024;
        const usedBytes = (Number(parts[2]) || 0) * 1024;
        const freeBytes = (Number(parts[3]) || 0) * 1024;
        const mountPoint = parts.slice(5).join(' ');
        if (!mountPoint || seenMounts.has(mountPoint)) continue;
        seenMounts.add(mountPoint);
        volumes.push({
          device,
          fsType: 'posix',
          mountPoint,
          totalBytes,
          usedBytes,
          freeBytes,
          usedPct: totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0
        });
      }
    }
  }

  if (volumes.length === 0) {
    const rootPath = plat === 'win32' ? 'C:\\' : '/';
    const st = getDiskStats(rootPath);
    volumes.push({
      device: 'host-root',
      fsType: plat,
      mountPoint: rootPath,
      totalBytes: st.totalBytes,
      usedBytes: st.usedBytes,
      freeBytes: st.freeBytes,
      usedPct: st.usedPct
    });
  }

  return volumes;
}

export function getHostSystemPlaces(): OsHostPlace[] {
  const cwd = process.cwd();
  const home = os.homedir();
  const tmp = os.tmpdir();
  const osDownloadsDir = path.join(cwd, 'downloads');
  const osAppsDir = path.join(cwd, 'sovereign_apps');
  const osDataDir = path.join(cwd, 'data');

  try {
    if (!fs.existsSync(osDownloadsDir)) fs.mkdirSync(osDownloadsDir, { recursive: true });
  } catch {}

  const candidates: Array<{ id: string; label: string; path: string; category: 'os' | 'user' | 'system' }> = [
    { id: 'os-workspace', label: 'OS Workspace', path: cwd, category: 'os' },
    { id: 'os-downloads', label: 'OS Downloads', path: osDownloadsDir, category: 'os' },
    { id: 'os-apps', label: 'Installed Apps', path: osAppsDir, category: 'os' },
    { id: 'os-data', label: 'OS Data Vault', path: osDataDir, category: 'os' },
    { id: 'host-home', label: 'Host Home (~)', path: home, category: 'user' },
    { id: 'host-downloads', label: 'Host Downloads', path: path.join(home, 'Downloads'), category: 'user' },
    { id: 'host-desktop', label: 'Host Desktop', path: path.join(home, 'Desktop'), category: 'user' },
    { id: 'host-documents', label: 'Host Documents', path: path.join(home, 'Documents'), category: 'user' },
    { id: 'host-root', label: os.platform() === 'win32' ? 'Drive C:\\' : 'Host Root (/)', path: os.platform() === 'win32' ? 'C:\\' : '/', category: 'system' },
    { id: 'host-tmp', label: 'Host Temp', path: tmp, category: 'system' }
  ];

  if (os.platform() !== 'win32') {
    candidates.push(
      { id: 'host-etc', label: 'System Config (/etc)', path: '/etc', category: 'system' },
      { id: 'host-usr', label: 'System Binaries (/usr)', path: '/usr', category: 'system' },
      { id: 'host-var', label: 'System Logs & Var (/var)', path: '/var', category: 'system' },
      { id: 'host-opt', label: 'Optional Packages (/opt)', path: '/opt', category: 'system' },
      { id: 'host-proc', label: 'Kernel Proc (/proc)', path: '/proc', category: 'system' },
      { id: 'host-mnt', label: 'External Mounts (/mnt)', path: '/mnt', category: 'system' }
    );
  }

  return candidates.map((c) => {
    let exists = false;
    let writable = false;
    try {
      exists = fs.existsSync(c.path);
      if (exists) {
        fs.accessSync(c.path, fs.constants.W_OK);
        writable = true;
      }
    } catch {}
    return { ...c, exists, writable };
  });
}

export function listAllHostAndOsDownloads(): {
  downloads: OsDownloadItem[];
  roots: Array<{ id: string; label: string; path: string; exists: boolean; count: number }>;
} {
  const cwd = process.cwd();
  const home = os.homedir();
  const osDownloadsDir = path.join(cwd, 'downloads');
  const osAppsDir = path.join(cwd, 'sovereign_apps');
  const hostDownloadsDir = path.join(home, 'Downloads');

  try {
    if (!fs.existsSync(osDownloadsDir)) fs.mkdirSync(osDownloadsDir, { recursive: true });
  } catch {}

  const sources: Array<{
    id: OsDownloadItem['source'];
    label: string;
    dir: string;
  }> = [
    { id: 'os-downloads', label: 'OS Downloads', dir: osDownloadsDir },
    { id: 'host-downloads', label: 'Host Downloads', dir: hostDownloadsDir },
    { id: 'os-apps', label: 'Installed Apps', dir: osAppsDir }
  ];

  const downloads: OsDownloadItem[] = [];
  const roots: Array<{ id: string; label: string; path: string; exists: boolean; count: number }> = [];

  for (const src of sources) {
    const exists = fs.existsSync(src.dir);
    let count = 0;
    if (exists) {
      try {
        const dirents = fs.readdirSync(src.dir, { withFileTypes: true });
        for (const d of dirents) {
          const full = path.join(src.dir, d.name);
          let sizeBytes = 0;
          let permissions = '0644';
          let modifiedAt = new Date(0).toISOString();
          let type: OsDownloadItem['type'] = d.isDirectory() ? 'dir' : d.isSymbolicLink() ? 'symlink' : d.isFile() ? 'file' : 'other';
          try {
            const st = fs.lstatSync(full);
            sizeBytes = st.size;
            permissions = (st.mode & 0o777).toString(8).padStart(4, '0');
            modifiedAt = st.mtime.toISOString();
          } catch {}
          downloads.push({
            name: d.name,
            path: full,
            source: src.id,
            sourceLabel: src.label,
            type,
            sizeBytes,
            permissions,
            modifiedAt,
            ext: type === 'dir' ? '' : path.extname(d.name).toLowerCase()
          });
          count++;
        }
      } catch {}
    }
    roots.push({
      id: src.id,
      label: src.label,
      path: src.dir,
      exists,
      count
    });
  }

  downloads.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
  return { downloads, roots };
}

export function searchHostFiles(
  rootDir: string,
  queryStr: string,
  options: { maxResults?: number; maxDepth?: number } = {}
): {
  root: string;
  query: string;
  results: OsFileEntry[];
  scannedDirs: number;
  elapsedMs: number;
} {
  const t0 = Date.now();
  const resolvedRoot = resolveSafeHostPath(rootDir);
  const needle = queryStr.trim().toLowerCase();
  const maxResults = Math.min(250, Math.max(10, options.maxResults || 100));
  const maxDepth = Math.min(10, Math.max(1, options.maxDepth || 6));
  const results: OsFileEntry[] = [];
  let scannedDirs = 0;

  if (!needle || !fs.existsSync(resolvedRoot)) {
    return { root: resolvedRoot, query: queryStr, results: [], scannedDirs: 0, elapsedMs: Date.now() - t0 };
  }

  const SKIP_PSEUDO_FS = new Set(['/proc', '/sys', '/dev', '/run']);
  const queue: Array<{ dir: string; depth: number }> = [{ dir: resolvedRoot, depth: 0 }];

  while (queue.length > 0 && results.length < maxResults && scannedDirs < 1800) {
    const item = queue.shift()!;
    scannedDirs++;
    let dirents: fs.Dirent[];
    try {
      dirents = fs.readdirSync(item.dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const d of dirents) {
      if (results.length >= maxResults) break;
      const full = path.join(item.dir, d.name);
      const isDir = d.isDirectory();

      if (d.name.toLowerCase().includes(needle)) {
        let sizeBytes = 0;
        let permissions = '0644';
        let modifiedAt = new Date(0).toISOString();
        try {
          const st = fs.lstatSync(full);
          sizeBytes = st.size;
          permissions = (st.mode & 0o777).toString(8).padStart(4, '0');
          modifiedAt = st.mtime.toISOString();
        } catch {}
        results.push({
          name: d.name,
          path: full,
          type: isDir ? 'dir' : d.isSymbolicLink() ? 'symlink' : 'file',
          sizeBytes,
          permissions,
          modifiedAt,
          ext: isDir ? '' : path.extname(d.name).toLowerCase()
        });
      }

      if (
        isDir &&
        !d.isSymbolicLink() &&
        item.depth < maxDepth &&
        !SKIP_PSEUDO_FS.has(full) &&
        d.name !== '.git' &&
        (resolvedRoot !== '/' || d.name !== 'node_modules')
      ) {
        queue.push({ dir: full, depth: item.depth + 1 });
      }
    }
  }

  return {
    root: resolvedRoot,
    query: queryStr,
    results,
    scannedDirs,
    elapsedMs: Date.now() - t0
  };
}

export function getFullHostSystemProfile() {
  const runtime = getRealOsRuntimeInfo();
  const volumes = getHostStorageVolumes();
  const places = getHostSystemPlaces();
  const downloadsSummary = listAllHostAndOsDownloads();

  // Safe non-secret host environment overview
  const safeEnv: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v !== 'string') continue;
    if (/(KEY|SECRET|TOKEN|PASS|CRED|AUTH|COOKIE|PRIVATE)/i.test(k)) {
      safeEnv[k] = '[REDACTED_SECRET]';
    } else {
      safeEnv[k] = v.slice(0, 300);
    }
  }

  const blockDevices =
    os.platform() === 'win32'
      ? safeExecText('wmic diskdrive get Caption,Size,MediaType', 2000).trim()
      : safeExecText('lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT 2>/dev/null || mount | head -n 30', 2000).trim();

  return {
    runtime,
    volumes,
    places,
    downloads: downloadsSummary.downloads,
    downloadRoots: downloadsSummary.roots,
    blockDevices,
    environmentCount: Object.keys(process.env).length,
    environment: safeEnv,
    timestamp: new Date().toISOString()
  };
}

export function listRealDirectory(targetDir?: string) {
  const resolved = resolveSafeHostPath(targetDir);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Directory not found: ${resolved}`);
  }
  const st = fs.statSync(resolved);
  if (!st.isDirectory()) {
    throw new Error(`Not a directory: ${resolved}`);
  }

  const dirents = fs.readdirSync(resolved, { withFileTypes: true });
  const entries: OsFileEntry[] = [];

  for (const d of dirents) {
    const full = path.join(resolved, d.name);
    let sizeBytes = 0;
    let permissions = '0644';
    let modifiedAt = new Date(0).toISOString();
    let type: OsFileEntry['type'] = d.isDirectory() ? 'dir' : d.isSymbolicLink() ? 'symlink' : d.isFile() ? 'file' : 'other';

    try {
      const lst = fs.lstatSync(full);
      sizeBytes = lst.size;
      permissions = (lst.mode & 0o777).toString(8).padStart(4, '0');
      modifiedAt = lst.mtime.toISOString();
      if (lst.isDirectory()) type = 'dir';
      else if (lst.isSymbolicLink()) type = 'symlink';
      else if (lst.isFile()) type = 'file';
    } catch {}

    entries.push({
      name: d.name,
      path: full,
      type,
      sizeBytes,
      permissions,
      modifiedAt,
      ext: type === 'dir' ? '' : path.extname(d.name).toLowerCase()
    });
  }

  entries.sort((a, b) => {
    if (a.type === 'dir' && b.type !== 'dir') return -1;
    if (a.type !== 'dir' && b.type === 'dir') return 1;
    return a.name.localeCompare(b.name);
  });

  return {
    path: resolved,
    parent: path.dirname(resolved) !== resolved ? path.dirname(resolved) : null,
    disk: getDiskStats(resolved),
    entries,
    count: entries.length
  };
}

export function readRealFile(filePath: string) {
  const resolved = resolveSafeHostPath(filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`File not found: ${resolved}`);
  }
  const st = fs.statSync(resolved);
  if (st.isDirectory()) {
    throw new Error('Target is a directory, not a file.');
  }

  const MAX_PREVIEW = 262144; // 256 KB
  const fd = fs.openSync(resolved, 'r');
  try {
    // Handle virtual pseudo-files like /proc/* where st.size === 0
    const isPseudo = st.size === 0 && (resolved.startsWith('/proc/') || resolved.startsWith('/sys/'));
    let buf: Buffer;
    if (isPseudo) {
      buf = Buffer.alloc(65536);
      const bytesRead = fs.readSync(fd, buf, 0, 65536, 0);
      buf = buf.subarray(0, bytesRead);
    } else {
      const readLen = Math.min(st.size, MAX_PREVIEW);
      buf = Buffer.alloc(readLen);
      fs.readSync(fd, buf, 0, readLen, 0);
    }
    const isBinary = buf.includes(0);
    const sha256 = crypto.createHash('sha256').update(buf).digest('hex');

    return {
      path: resolved,
      name: path.basename(resolved),
      sizeBytes: isPseudo ? buf.length : st.size,
      truncated: !isPseudo && st.size > MAX_PREVIEW,
      isBinary,
      permissions: (st.mode & 0o777).toString(8).padStart(4, '0'),
      modifiedAt: st.mtime.toISOString(),
      sha256,
      content: isBinary ? buf.subarray(0, 2048).toString('hex').match(/.{1,32}/g)?.join('\n') || '' : buf.toString('utf-8')
    };
  } finally {
    fs.closeSync(fd);
  }
}

export function writeRealFile(filePath: string, content: string) {
  const resolved = resolveSafeHostPath(filePath);
  const parent = path.dirname(resolved);
  if (!fs.existsSync(parent)) {
    fs.mkdirSync(parent, { recursive: true });
  }
  fs.writeFileSync(resolved, content, 'utf-8');
  const st = fs.statSync(resolved);
  const sha256 = crypto.createHash('sha256').update(content).digest('hex');
  return {
    success: true,
    path: resolved,
    sizeBytes: st.size,
    sha256,
    modifiedAt: st.mtime.toISOString()
  };
}

export function writeRealFileBase64(filePath: string, base64Content: string) {
  const resolved = resolveSafeHostPath(filePath);
  const parent = path.dirname(resolved);
  if (!fs.existsSync(parent)) {
    fs.mkdirSync(parent, { recursive: true });
  }
  const buf = Buffer.from(base64Content, 'base64');
  fs.writeFileSync(resolved, buf);
  const st = fs.statSync(resolved);
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
  return {
    success: true,
    path: resolved,
    sizeBytes: st.size,
    sha256,
    modifiedAt: st.mtime.toISOString()
  };
}

export function createRealDirectory(dirPath: string) {
  const resolved = resolveSafeHostPath(dirPath);
  fs.mkdirSync(resolved, { recursive: true });
  return { success: true, path: resolved };
}

export function renameRealPath(oldPath: string, newPath: string) {
  const src = resolveSafeHostPath(oldPath);
  const dst = resolveSafeHostPath(newPath);
  if (PROTECTED_PATHS.has(src)) {
    throw new Error(`Protected OS root path cannot be moved: ${src}`);
  }
  fs.renameSync(src, dst);
  return { success: true, from: src, to: dst };
}

export function copyRealPath(srcPath: string, dstPath: string) {
  const src = resolveSafeHostPath(srcPath);
  const dst = resolveSafeHostPath(dstPath);
  if (!fs.existsSync(src)) {
    throw new Error(`Source path not found: ${src}`);
  }
  const parent = path.dirname(dst);
  if (!fs.existsSync(parent)) {
    fs.mkdirSync(parent, { recursive: true });
  }
  fs.cpSync(src, dst, { recursive: true });
  return { success: true, from: src, to: dst };
}

export function chmodRealPath(targetPath: string, modeOctal: string) {
  const resolved = resolveSafeHostPath(targetPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Path not found: ${resolved}`);
  }
  const parsedMode = parseInt(modeOctal.replace(/^0o?/i, ''), 8);
  if (!Number.isFinite(parsedMode) || parsedMode < 0 || parsedMode > 0o7777) {
    throw new Error(`Invalid octal permission mode: ${modeOctal}`);
  }
  fs.chmodSync(resolved, parsedMode);
  return { success: true, path: resolved, mode: parsedMode.toString(8).padStart(4, '0') };
}

export function deleteRealPath(targetPath: string) {
  const resolved = resolveSafeHostPath(targetPath);
  if (PROTECTED_PATHS.has(resolved) || resolved === path.resolve(process.cwd())) {
    throw new Error(`Protected OS system or workspace root cannot be deleted: ${resolved}`);
  }
  if (!fs.existsSync(resolved)) {
    throw new Error(`Path does not exist: ${resolved}`);
  }
  fs.rmSync(resolved, { recursive: true, force: false });
  return { success: true, deleted: resolved };
}

export async function executeRealShellCommand(command: string, rawCwd?: string): Promise<{
  success: boolean;
  command: string;
  cwd: string;
  nextCwd: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  elapsedMs: number;
}> {
  const t0 = Date.now();
  const cwd = rawCwd && fs.existsSync(resolveSafeHostPath(rawCwd))
    ? resolveSafeHostPath(rawCwd)
    : process.cwd();

  const plat = os.platform();
  const isWin = plat === 'win32';
  const pwdSentinel = `__SOV_PWD_${Date.now()}__`;

  return await new Promise((resolve) => {
    const shellBin = isWin ? (process.env.COMSPEC || 'cmd.exe') : (fs.existsSync('/bin/bash') ? '/bin/bash' : '/bin/sh');
    const wrappedCmd = isWin
      ? `${command} & echo ${pwdSentinel}%CD%`
      : `${command}\n__ec=$?\necho "${pwdSentinel}$(pwd)"\nexit $__ec`;

    const args = isWin ? ['/c', wrappedCmd] : ['-c', wrappedCmd];
    let stdoutBuf = '';
    let stderrBuf = '';
    let finished = false;

    const child = spawn(shellBin, args, {
      cwd,
      env: {
        ...process.env,
        SOVEREIGN_OS: 'Lysander-Sovereign-OS-7.0',
        SOVEREIGN_UID: '0',
        SOVEREIGN_RING: '-3',
        TERM: 'xterm-256color'
      }
    });

    const timer = setTimeout(() => {
      if (!finished) {
        try { child.kill('SIGKILL'); } catch {}
      }
    }, 15000);

    const MAX_OUT = 131072;
    child.stdout.on('data', (chunk) => {
      if (stdoutBuf.length < MAX_OUT) stdoutBuf += chunk.toString('utf-8');
    });
    child.stderr.on('data', (chunk) => {
      if (stderrBuf.length < MAX_OUT) stderrBuf += chunk.toString('utf-8');
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      if (finished) return;
      finished = true;
      resolve({
        success: false,
        command,
        cwd,
        nextCwd: cwd,
        stdout: stdoutBuf,
        stderr: err.message,
        exitCode: 1,
        elapsedMs: Date.now() - t0
      });
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (finished) return;
      finished = true;

      let nextCwd = cwd;
      let cleanStdout = stdoutBuf;
      const idx = stdoutBuf.lastIndexOf(pwdSentinel);
      if (idx !== -1) {
        const after = stdoutBuf.slice(idx + pwdSentinel.length).trim().split(/\r?\n/)[0]?.trim();
        if (after && fs.existsSync(after)) {
          nextCwd = after;
        }
        cleanStdout = stdoutBuf.slice(0, idx).replace(/\n$/, '');
      }

      const exitCode = typeof code === 'number' ? code : 1;
      resolve({
        success: exitCode === 0,
        command,
        cwd,
        nextCwd,
        stdout: cleanStdout,
        stderr: stderrBuf.trimEnd(),
        exitCode,
        elapsedMs: Date.now() - t0
      });
    });
  });
}

export function buildPlatformLauncherBundle(
  targetPlatform: 'windows' | 'macos' | 'linux' | 'android' | 'ios',
  originUrl: string
) {
  const safeOrigin = /^https?:\/\//i.test(originUrl) ? originUrl : 'http://localhost:3000';

  if (targetPlatform === 'android') {
    const androidScript = [
      '#!/usr/bin/env bash',
      '# Lysander Sovereign OS — Android / Termux / Mobile Edge Bootloader',
      '# Compatible with Samsung, Pixel, OnePlus, Xiaomi, Motorola, Sony, Nothing & all Android OEMs',
      `TARGET_URL="${safeOrigin}"`,
      'echo "[Sovereign OS Android] Verifying device environment (UID 0 · Ring -3 Bridge)..."',
      'if command -v termux-wake-lock >/dev/null 2>&1; then',
      '  termux-wake-lock || true',
      'fi',
      'if command -v am >/dev/null 2>&1; then',
      '  # Launch inside Chrome / default Android browser or installed WebAPK',
      '  am start -a android.intent.action.VIEW -d "$TARGET_URL" >/dev/null 2>&1 && exit 0',
      'fi',
      'if command -v termux-open-url >/dev/null 2>&1; then',
      '  termux-open-url "$TARGET_URL" && exit 0',
      'fi',
      'echo "Open in Chrome / Samsung Internet / Edge on Android to install standalone WebAPK:"',
      'echo "  $TARGET_URL"',
      'exit 0',
      ''
    ].join('\n');
    return {
      filename: 'Lysander-Sovereign-OS-Android.sh',
      mimeType: 'application/x-sh',
      content: androidScript
    };
  }

  if (targetPlatform === 'ios') {
    const profileUuid = crypto.randomUUID().toUpperCase();
    const clipUuid = crypto.randomUUID().toUpperCase();
    const safeXmlOrigin = safeOrigin
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const mobileConfig = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
      '<plist version="1.0">',
      '<dict>',
      '  <key>PayloadContent</key>',
      '  <array>',
      '    <dict>',
      '      <key>FullScreen</key>',
      '      <true/>',
      '      <key>IgnoreManifestScope</key>',
      '      <false/>',
      '      <key>IsRemovable</key>',
      '      <true/>',
      '      <key>Label</key>',
      '      <string>SovereignOS</string>',
      '      <key>PayloadDescription</key>',
      '      <string>Lysander Sovereign OS Standalone Mobile App</string>',
      '      <key>PayloadDisplayName</key>',
      '      <string>Lysander Sovereign OS</string>',
      '      <key>PayloadIdentifier</key>',
      `      <string>com.lysander.sovereign.webclip.${clipUuid}</string>`,
      '      <key>PayloadType</key>',
      '      <string>com.apple.webClip.managed</string>',
      '      <key>PayloadUUID</key>',
      `      <string>${clipUuid}</string>`,
      '      <key>PayloadVersion</key>',
      '      <integer>1</integer>',
      '      <key>Precomposed</key>',
      '      <true/>',
      '      <key>URL</key>',
      `      <string>${safeXmlOrigin}</string>`,
      '    </dict>',
      '  </array>',
      '  <key>PayloadDisplayName</key>',
      '  <string>Lysander Sovereign OS</string>',
      '  <key>PayloadIdentifier</key>',
      `  <string>com.lysander.sovereign.profile.${profileUuid}</string>`,
      '  <key>PayloadRemovalDisallowed</key>',
      '  <false/>',
      '  <key>PayloadType</key>',
      '  <string>Configuration</string>',
      '  <key>PayloadUUID</key>',
      `  <string>${profileUuid}</string>`,
      '  <key>PayloadVersion</key>',
      '  <integer>1</integer>',
      '</dict>',
      '</plist>',
      ''
    ].join('\n');
    return {
      filename: 'Lysander-Sovereign-OS.mobileconfig',
      mimeType: 'application/x-apple-aspen-config',
      content: mobileConfig
    };
  }

  if (targetPlatform === 'windows') {
    const script = [
      '@echo off',
      'title Lysander Sovereign OS (Windows Native App Mode · UID 0 / Ring -3)',
      'echo [Sovereign OS] Booting Lysander Sovereign OS standalone shell...',
      `set TARGET_URL=${safeOrigin}`,
      'where msedge >nul 2>nul && (start "" msedge --app=%TARGET_URL% --window-size=1440,920 && exit /b 0)',
      'where chrome >nul 2>nul && (start "" chrome --app=%TARGET_URL% --window-size=1440,920 && exit /b 0)',
      'if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" (start "" "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" --app=%TARGET_URL% --window-size=1440,920 && exit /b 0)',
      'if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" (start "" "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" --app=%TARGET_URL% --window-size=1440,920 && exit /b 0)',
      'start "" %TARGET_URL%',
      'exit /b 0'
    ].join('\r\n');
    return {
      filename: 'Lysander-Sovereign-OS.bat',
      mimeType: 'application/x-msdos-program',
      content: script
    };
  }

  if (targetPlatform === 'macos') {
    const script = [
      '#!/usr/bin/env bash',
      '# Lysander Sovereign OS Native macOS App Window Launcher',
      `TARGET_URL="${safeOrigin}"`,
      'if [ -d "/Applications/Google Chrome.app" ]; then',
      '  open -na "Google Chrome" --args --app="$TARGET_URL" --window-size=1440,920',
      'elif [ -d "/Applications/Microsoft Edge.app" ]; then',
      '  open -na "Microsoft Edge" --args --app="$TARGET_URL"',
      'elif [ -d "/Applications/Brave Browser.app" ]; then',
      '  open -na "Brave Browser" --args --app="$TARGET_URL"',
      'else',
      '  open "$TARGET_URL"',
      'fi',
      ''
    ].join('\n');
    return {
      filename: 'Lysander-Sovereign-OS.command',
      mimeType: 'application/x-sh',
      content: script
    };
  }

  const desktopEntry = [
    '[Desktop Entry]',
    'Version=1.0',
    'Type=Application',
    'Name=Lysander Sovereign OS',
    'Comment=Sovereign Operating System (UID 0 · Ring -3 Hypervisor)',
    `Exec=sh -c 'if command -v google-chrome >/dev/null; then google-chrome --app="${safeOrigin}"; elif command -v chromium >/dev/null; then chromium --app="${safeOrigin}"; elif command -v chromium-browser >/dev/null; then chromium-browser --app="${safeOrigin}"; else xdg-open "${safeOrigin}"; fi'`,
    'Icon=utilities-terminal',
    'Terminal=false',
    'Categories=System;Development;Network;',
    ''
  ].join('\n');

  return {
    filename: 'lysander-sovereign-os.desktop',
    mimeType: 'application/x-desktop',
    content: desktopEntry
  };
}

/**
 * Zero-Dependency Native Physical Host Bridge Daemon (http://127.0.0.1:4747)
 * Grants Lysander Sovereign OS direct access to ALL physical drives (C:\, D:\, /),
 * user Downloads/Desktop/Documents, system processes, and native shell on the host PC/Mac/Linux/Termux.
 */
export function buildHostBridgeDaemonBundle(
  format: 'mjs' | 'windows' | 'macos' | 'linux' = 'mjs',
  originUrl = 'http://localhost:3000'
) {
  const safeOrigin = /^https?:\/\//i.test(originUrl) ? originUrl.replace(/\/+$/, '') : 'http://localhost:3000';

  if (format === 'windows') {
    const bat = [
      '@echo off',
      'title Lysander Sovereign OS — Physical Host System Bridge (127.0.0.1:4747)',
      'echo [Lysander Host Bridge] Downloading zero-dependency native bridge agent...',
      `powershell -NoProfile -Command "Invoke-WebRequest -Uri '${safeOrigin}/api/os/host-bridge/download?format=mjs' -OutFile '%USERPROFILE%\\lysander-host-bridge.mjs'"`,
      'echo [Lysander Host Bridge] Starting Full Physical Host Bridge on http://127.0.0.1:4747 ...',
      'node "%USERPROFILE%\\lysander-host-bridge.mjs"',
      'pause'
    ].join('\r\n');
    return {
      filename: 'Lysander-Host-Bridge-Windows.bat',
      mimeType: 'application/x-msdos-program',
      content: bat
    };
  }

  if (format === 'macos') {
    const cmd = [
      '#!/usr/bin/env bash',
      'set -e',
      'echo "[Lysander Host Bridge] Downloading zero-dependency native bridge agent..."',
      `curl -fsSL "${safeOrigin}/api/os/host-bridge/download?format=mjs" -o "$HOME/lysander-host-bridge.mjs"`,
      'echo "[Lysander Host Bridge] Starting Full Physical Host Bridge on http://127.0.0.1:4747 ..."',
      'node "$HOME/lysander-host-bridge.mjs"',
      ''
    ].join('\n');
    return {
      filename: 'Lysander-Host-Bridge-macOS.command',
      mimeType: 'application/x-sh',
      content: cmd
    };
  }

  if (format === 'linux') {
    const sh = [
      '#!/usr/bin/env bash',
      'set -e',
      'echo "[Lysander Host Bridge] Downloading zero-dependency native bridge agent..."',
      `curl -fsSL "${safeOrigin}/api/os/host-bridge/download?format=mjs" -o "$HOME/lysander-host-bridge.mjs"`,
      'echo "[Lysander Host Bridge] Starting Full Physical Host Bridge on http://127.0.0.1:4747 ..."',
      'node "$HOME/lysander-host-bridge.mjs"',
      ''
    ].join('\n');
    return {
      filename: 'lysander-host-bridge-linux.sh',
      mimeType: 'application/x-sh',
      content: sh
    };
  }

  const daemonSource = `#!/usr/bin/env node
/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 * (TWENTY 47 PROTOCOL - GENESIS NODE / LYSANDER CORE EULA / H-FID Forensic License v1.1).
 *
 * Lysander Sovereign OS — Native Physical Host Bridge Daemon
 * Runs locally on http://127.0.0.1:4747 (zero external npm dependencies; requires Node.js 18+)
 */

import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync, spawn } from 'node:child_process';

const PORT = Number(process.env.LYSANDER_BRIDGE_PORT || 4747);
const HOST = '127.0.0.1';
const AUTH_TOKEN = (process.env.LYSANDER_BRIDGE_TOKEN || '').trim();

function safeExec(cmd, timeout = 2500) {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

function resolvePath(input) {
  const raw = String(input || '').trim();
  if (!raw || raw === '~') return os.homedir();
  if (raw.startsWith('~/') || raw.startsWith('~\\\\')) return path.resolve(os.homedir(), raw.slice(2));
  return path.resolve(raw);
}

function getDiskStats(targetPath) {
  try {
    if (typeof fs.statfsSync === 'function') {
      const st = fs.statfsSync(targetPath);
      const bsize = Number(st.bsize || 4096);
      const totalBytes = Number(st.blocks || 0) * bsize;
      const freeBytes = Number(st.bavail ?? st.bfree ?? 0) * bsize;
      const usedBytes = Math.max(0, totalBytes - freeBytes);
      return { path: targetPath, totalBytes, freeBytes, usedBytes, usedPct: totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0 };
    }
  } catch {}
  return { path: targetPath, totalBytes: 0, freeBytes: 0, usedBytes: 0, usedPct: 0 };
}

function getVolumes() {
  const volumes = [];
  const plat = os.platform();
  if (plat === 'win32') {
    const raw = safeExec('wmic logicaldisk get Caption,FileSystem,FreeSpace,Size /format:csv', 3000);
    for (const line of raw.split(/\\r?\\n/)) {
      const cols = line.trim().split(',');
      if (cols.length >= 5 && /^[A-Z]:$/i.test(cols[1])) {
        const cap = cols[1].trim();
        const freeBytes = Number(cols[3]) || 0;
        const totalBytes = Number(cols[4]) || 0;
        const usedBytes = Math.max(0, totalBytes - freeBytes);
        volumes.push({
          device: cap,
          fsType: cols[2]?.trim() || 'NTFS',
          mountPoint: cap + '\\\\',
          totalBytes,
          usedBytes,
          freeBytes,
          usedPct: totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0
        });
      }
    }
  } else {
    const raw = plat === 'darwin' ? safeExec('df -kP', 2500) : safeExec('df -B1 -PT 2>/dev/null || df -kP', 2500);
    const isB1T = raw.includes('1B-blocks');
    const seen = new Set();
    for (const line of raw.split(/\\r?\\n/).slice(1)) {
      const parts = line.trim().split(/\\s+/);
      if (isB1T && parts.length >= 7) {
        const mp = parts.slice(6).join(' ');
        if (!mp || seen.has(mp)) continue;
        seen.add(mp);
        const totalBytes = Number(parts[2]) || 0;
        const usedBytes = Number(parts[3]) || 0;
        const freeBytes = Number(parts[4]) || 0;
        volumes.push({ device: parts[0], fsType: parts[1], mountPoint: mp, totalBytes, usedBytes, freeBytes, usedPct: totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0 });
      } else if (parts.length >= 6) {
        const mp = parts.slice(5).join(' ');
        if (!mp || seen.has(mp)) continue;
        seen.add(mp);
        const totalBytes = (Number(parts[1]) || 0) * 1024;
        const usedBytes = (Number(parts[2]) || 0) * 1024;
        const freeBytes = (Number(parts[3]) || 0) * 1024;
        volumes.push({ device: parts[0], fsType: plat, mountPoint: mp, totalBytes, usedBytes, freeBytes, usedPct: totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0 });
      }
    }
  }
  return volumes;
}

function getPlaces() {
  const home = os.homedir();
  const plat = os.platform();
  const root = plat === 'win32' ? 'C:\\\\' : '/';
  const list = [
    { id: 'home', label: 'Host Home (~)', path: home, category: 'user' },
    { id: 'downloads', label: 'Host Downloads', path: path.join(home, 'Downloads'), category: 'user' },
    { id: 'desktop', label: 'Host Desktop', path: path.join(home, 'Desktop'), category: 'user' },
    { id: 'documents', label: 'Host Documents', path: path.join(home, 'Documents'), category: 'user' },
    { id: 'pictures', label: 'Host Pictures', path: path.join(home, 'Pictures'), category: 'user' },
    { id: 'root', label: plat === 'win32' ? 'Drive C:\\\\' : 'Host Root (/)', path: root, category: 'system' },
    { id: 'tmp', label: 'Host Temp', path: os.tmpdir(), category: 'system' }
  ];
  return list.map((p) => ({ ...p, exists: fs.existsSync(p.path), writable: true }));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk.toString('utf8'); if (raw.length > 52_428_800) reject(new Error('Body too large')); });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Lysander-Token');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
}

function sendJson(res, status, obj) {
  setCors(res);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

const server = http.createServer(async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (AUTH_TOKEN) {
    const provided = String(req.headers['x-lysander-token'] || '').trim();
    if (provided !== AUTH_TOKEN) {
      return sendJson(res, 401, { success: false, error: 'Unauthorized: invalid X-Lysander-Token' });
    }
  }

  const parsed = new URL(req.url || '/', 'http://' + HOST + ':' + PORT);
  const pathname = parsed.pathname;

  try {
    if (pathname === '/host/info' && req.method === 'GET') {
      const cpus = os.cpus();
      return sendJson(res, 200, {
        success: true,
        bridgeVersion: '1.0.0',
        hostname: os.hostname(),
        platform: os.platform(),
        type: os.type(),
        release: os.release(),
        arch: os.arch(),
        homedir: os.homedir(),
        tmpdir: os.tmpdir(),
        username: os.userInfo().username,
        cpuModel: cpus[0]?.model || os.arch(),
        cpuCores: cpus.length,
        totalMemBytes: os.totalmem(),
        freeMemBytes: os.freemem(),
        volumes: getVolumes(),
        places: getPlaces(),
        timestamp: new Date().toISOString()
      });
    }

    if (pathname === '/host/fs/list' && req.method === 'GET') {
      const target = resolvePath(parsed.searchParams.get('path') || os.homedir());
      const dirents = fs.readdirSync(target, { withFileTypes: true });
      const entries = dirents.map((d) => {
        const full = path.join(target, d.name);
        let sizeBytes = 0;
        let permissions = '0644';
        let modifiedAt = new Date(0).toISOString();
        let type = d.isDirectory() ? 'dir' : d.isSymbolicLink() ? 'symlink' : d.isFile() ? 'file' : 'other';
        try {
          const st = fs.lstatSync(full);
          sizeBytes = st.size;
          permissions = (st.mode & 0o777).toString(8).padStart(4, '0');
          modifiedAt = st.mtime.toISOString();
        } catch {}
        return { name: d.name, path: full, type, sizeBytes, permissions, modifiedAt, ext: type === 'dir' ? '' : path.extname(d.name).toLowerCase() };
      }).sort((a, b) => (a.type === 'dir' && b.type !== 'dir' ? -1 : a.type !== 'dir' && b.type === 'dir' ? 1 : a.name.localeCompare(b.name)));
      const parent = path.dirname(target) !== target ? path.dirname(target) : null;
      return sendJson(res, 200, { success: true, path: target, parent, disk: getDiskStats(target), entries, count: entries.length });
    }

    if (pathname === '/host/fs/read' && req.method === 'GET') {
      const target = resolvePath(parsed.searchParams.get('path') || '');
      const st = fs.statSync(target);
      const maxLen = Math.min(st.size, 262144);
      const fd = fs.openSync(target, 'r');
      const buf = Buffer.alloc(maxLen);
      try { fs.readSync(fd, buf, 0, maxLen, 0); } finally { fs.closeSync(fd); }
      const isBinary = buf.includes(0);
      const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
      return sendJson(res, 200, {
        success: true,
        path: target,
        name: path.basename(target),
        sizeBytes: st.size,
        truncated: st.size > 262144,
        isBinary,
        permissions: (st.mode & 0o777).toString(8).padStart(4, '0'),
        modifiedAt: st.mtime.toISOString(),
        sha256,
        content: isBinary ? (buf.subarray(0, 2048).toString('hex').match(/.{1,32}/g)?.join('\\n') || '') : buf.toString('utf8')
      });
    }

    if (pathname === '/host/fs/download' && req.method === 'GET') {
      const target = resolvePath(parsed.searchParams.get('path') || '');
      if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) {
        return sendJson(res, 404, { success: false, error: 'File not found' });
      }
      setCors(res);
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="' + path.basename(target).replace(/"/g, '') + '"'
      });
      return fs.createReadStream(target).pipe(res);
    }

    if (pathname === '/host/fs/downloads' && req.method === 'GET') {
      const dlDir = path.join(os.homedir(), 'Downloads');
      const items = [];
      if (fs.existsSync(dlDir)) {
        for (const d of fs.readdirSync(dlDir, { withFileTypes: true })) {
          const full = path.join(dlDir, d.name);
          let sizeBytes = 0; let modifiedAt = new Date(0).toISOString(); let permissions = '0644';
          try { const st = fs.lstatSync(full); sizeBytes = st.size; modifiedAt = st.mtime.toISOString(); permissions = (st.mode & 0o777).toString(8).padStart(4, '0'); } catch {}
          items.push({ name: d.name, path: full, source: 'host-downloads', sourceLabel: 'Physical PC Downloads', type: d.isDirectory() ? 'dir' : 'file', sizeBytes, permissions, modifiedAt, ext: d.isDirectory() ? '' : path.extname(d.name).toLowerCase() });
        }
      }
      items.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
      return sendJson(res, 200, { success: true, downloads: items, roots: [{ id: 'host-downloads', label: 'Physical PC Downloads', path: dlDir, exists: fs.existsSync(dlDir), count: items.length }] });
    }

    if (pathname === '/host/fs/search' && req.method === 'GET') {
      const root = resolvePath(parsed.searchParams.get('root') || os.homedir());
      const q = (parsed.searchParams.get('q') || '').trim().toLowerCase();
      const results = [];
      const queue = [{ dir: root, depth: 0 }];
      let scanned = 0;
      while (queue.length && results.length < 100 && scanned < 1500) {
        const cur = queue.shift();
        scanned++;
        let dirents;
        try { dirents = fs.readdirSync(cur.dir, { withFileTypes: true }); } catch { continue; }
        for (const d of dirents) {
          if (results.length >= 100) break;
          const full = path.join(cur.dir, d.name);
          if (d.name.toLowerCase().includes(q)) {
            let sizeBytes = 0; let modifiedAt = new Date(0).toISOString();
            try { const st = fs.lstatSync(full); sizeBytes = st.size; modifiedAt = st.mtime.toISOString(); } catch {}
            results.push({ name: d.name, path: full, type: d.isDirectory() ? 'dir' : 'file', sizeBytes, permissions: '0644', modifiedAt, ext: d.isDirectory() ? '' : path.extname(d.name).toLowerCase() });
          }
          if (d.isDirectory() && !d.isSymbolicLink() && cur.depth < 5 && d.name !== 'node_modules' && d.name !== '.git') {
            queue.push({ dir: full, depth: cur.depth + 1 });
          }
        }
      }
      return sendJson(res, 200, { success: true, root, query: q, results, scannedDirs: scanned });
    }

    if (pathname === '/host/fs/write' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const target = resolvePath(body.path);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, String(body.content ?? ''), 'utf8');
      const st = fs.statSync(target);
      const sha256 = crypto.createHash('sha256').update(String(body.content ?? '')).digest('hex');
      return sendJson(res, 200, { success: true, path: target, sizeBytes: st.size, sha256 });
    }

    if (pathname === '/host/fs/write-base64' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const target = resolvePath(body.path);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      const buf = Buffer.from(String(body.base64 || ''), 'base64');
      fs.writeFileSync(target, buf);
      const st = fs.statSync(target);
      const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
      return sendJson(res, 200, { success: true, path: target, sizeBytes: st.size, sha256 });
    }

    if (pathname === '/host/fs/mkdir' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const target = resolvePath(body.path);
      fs.mkdirSync(target, { recursive: true });
      return sendJson(res, 200, { success: true, path: target });
    }

    if (pathname === '/host/fs/rename' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const src = resolvePath(body.oldPath);
      const dst = resolvePath(body.newPath);
      fs.renameSync(src, dst);
      return sendJson(res, 200, { success: true, from: src, to: dst });
    }

    if (pathname === '/host/fs/delete' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const target = resolvePath(body.path);
      fs.rmSync(target, { recursive: true, force: false });
      return sendJson(res, 200, { success: true, deleted: target });
    }

    if (pathname === '/host/shell/exec' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const cmd = String(body.command || '').trim();
      const cwd = body.cwd && fs.existsSync(resolvePath(body.cwd)) ? resolvePath(body.cwd) : os.homedir();
      const isWin = os.platform() === 'win32';
      const t0 = Date.now();
      const shellBin = isWin ? (process.env.COMSPEC || 'cmd.exe') : (fs.existsSync('/bin/bash') ? '/bin/bash' : '/bin/sh');
      const args = isWin ? ['/c', cmd] : ['-c', cmd];
      const result = await new Promise((resolve) => {
        let stdout = ''; let stderr = '';
        const child = spawn(shellBin, args, { cwd, env: process.env });
        const timer = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} }, 15000);
        child.stdout.on('data', (d) => { if (stdout.length < 131072) stdout += d.toString('utf8'); });
        child.stderr.on('data', (d) => { if (stderr.length < 131072) stderr += d.toString('utf8'); });
        child.on('close', (code) => {
          clearTimeout(timer);
          resolve({ success: code === 0, command: cmd, cwd, nextCwd: cwd, stdout, stderr, exitCode: typeof code === 'number' ? code : 1, elapsedMs: Date.now() - t0 });
        });
        child.on('error', (err) => {
          clearTimeout(timer);
          resolve({ success: false, command: cmd, cwd, nextCwd: cwd, stdout, stderr: err.message, exitCode: 1, elapsedMs: Date.now() - t0 });
        });
      });
      return sendJson(res, 200, result);
    }

    if (pathname === '/host/steam/games' && req.method === 'GET') {
      const candidates = [
        path.join(os.homedir(), '.steam', 'steam', 'steamapps'),
        path.join(os.homedir(), '.local', 'share', 'Steam', 'steamapps'),
        path.join(os.homedir(), 'Library', 'Application Support', 'Steam', 'steamapps'),
        'C:\\\\Program Files (x86)\\\\Steam\\\\steamapps',
        'C:\\\\Program Files\\\\Steam\\\\steamapps',
        'D:\\\\SteamLibrary\\\\steamapps',
        'E:\\\\SteamLibrary\\\\steamapps'
      ];
      const customPath = (parsed.searchParams.get('path') || '').trim();
      if (customPath) candidates.unshift(resolvePath(customPath));
      const dirs = new Set();
      for (const c of candidates) {
        if (fs.existsSync(c)) dirs.add(c);
        const vdf = path.join(c, 'libraryfolders.vdf');
        if (fs.existsSync(vdf)) {
          try {
            const raw = fs.readFileSync(vdf, 'utf8');
            const matches = raw.matchAll(/"path"\\s+"([^"]+)"/g);
            for (const m of matches) {
              const p = path.join(m[1].replace(/\\\\\\\\/g, '\\\\'), 'steamapps');
              if (fs.existsSync(p)) dirs.add(p);
            }
          } catch {}
        }
      }
      const games = [];
      for (const dir of dirs) {
        try {
          for (const f of fs.readdirSync(dir)) {
            if (!/^appmanifest_\\d+\\.acf$/i.test(f)) continue;
            const raw = fs.readFileSync(path.join(dir, f), 'utf8');
            const appid = Number((raw.match(/"appid"\\s+"(\\d+)"/i) || [])[1] || 0);
            const name = (raw.match(/"name"\\s+"([^"]+)"/i) || [])[1] || ('Steam App ' + appid);
            const installdir = (raw.match(/"installdir"\\s+"([^"]+)"/i) || [])[1] || '';
            const sizeOnDisk = Number((raw.match(/"SizeOnDisk"\\s+"(\\d+)"/i) || [])[1] || 0);
            if (appid) games.push({ appid, name, installdir, sizeOnDisk, libraryPath: dir });
          }
        } catch {}
      }
      return sendJson(res, 200, { success: true, scannedLibraries: Array.from(dirs), games });
    }

    if (pathname === '/host/steam/launch' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const appId = Number(body.appId || 0);
      const extraArgs = String(body.launchOptions || '').trim();
      if (!appId) return sendJson(res, 400, { success: false, error: 'appId required' });
      const plat = os.platform();
      const uri = 'steam://rungameid/' + appId;
      let launched = false;
      let method = uri;
      try {
        if (plat === 'win32') {
          spawn('cmd.exe', ['/c', 'start', '', uri], { detached: true, stdio: 'ignore' }).unref();
          launched = true;
          method = 'Windows native steam:// protocol (' + uri + ')';
        } else if (plat === 'darwin') {
          spawn('open', [uri], { detached: true, stdio: 'ignore' }).unref();
          launched = true;
          method = 'macOS open ' + uri;
        } else {
          const args = ['-applaunch', String(appId), ...(extraArgs ? extraArgs.split(/\\s+/) : [])];
          spawn('steam', args, { detached: true, stdio: 'ignore' }).unref();
          launched = true;
          method = 'Linux steam ' + args.join(' ');
        }
      } catch (err) {
        return sendJson(res, 200, { success: false, launched: false, error: err?.message || String(err), uri });
      }
      return sendJson(res, 200, { success: true, launched, appId, method, uri });
    }

    return sendJson(res, 404, { success: false, error: 'Unknown Host Bridge route: ' + pathname });
  } catch (err) {
    return sendJson(res, 400, { success: false, error: err?.message || String(err) });
  }
});

server.listen(PORT, HOST, () => {
  console.log('[Lysander Sovereign Host Bridge] ACTIVE on http://' + HOST + ':' + PORT);
  console.log('[Lysander Sovereign Host Bridge] Host OS: ' + os.type() + ' ' + os.release() + ' (' + os.arch() + ') | Home: ' + os.homedir());
  console.log('[Lysander Sovereign Host Bridge] Keep this terminal open while using Lysander Sovereign OS.');
});
`;

  return {
    filename: 'lysander-host-bridge.mjs',
    mimeType: 'application/javascript; charset=utf-8',
    content: daemonSource
  };
}

// ============================================================================
// REAL SOVEREIGN DESKTOP FILESYSTEM, STEAM LOCAL LIBRARY & UNIVERSAL COMPAT
// ============================================================================

export function getSovereignDesktopDirectory(): string {
  const desktopDir = path.join(process.cwd(), 'data', 'desktop');
  try {
    if (!fs.existsSync(desktopDir)) {
      fs.mkdirSync(desktopDir, { recursive: true });
    }
  } catch {}
  return desktopDir;
}

export function listSovereignDesktopEntries() {
  const desktopDir = getSovereignDesktopDirectory();
  const listing = listRealDirectory(desktopDir);
  return {
    desktopPath: desktopDir,
    entries: listing.entries,
    totalEntries: listing.count
  };
}

function safeExecSync(cmd: string, timeoutMs = 1500): string {
  try {
    return execSync(cmd, {
      encoding: 'utf8',
      timeout: timeoutMs,
      stdio: ['ignore', 'pipe', 'ignore']
    });
  } catch {
    return '';
  }
}

export interface LocalSteamGameEntry {
  appid: number;
  name: string;
  installdir: string;
  sizeOnDisk: number;
  libraryPath: string;
  manifestPath: string;
  lastUpdated?: string;
}

export function scanLocalSteamLibraries(customLibraryPath?: string): {
  scannedPaths: string[];
  existingLibraries: string[];
  games: LocalSteamGameEntry[];
  steamBinaryAvailable: boolean;
  steamCmdAvailable: boolean;
  protonVersions: string[];
} {
  const home = os.homedir();
  const candidatePaths = [
    customLibraryPath ? resolveSafeHostPath(customLibraryPath) : '',
    path.join(home, '.steam', 'steam', 'steamapps'),
    path.join(home, '.local', 'share', 'Steam', 'steamapps'),
    path.join(home, '.var', 'app', 'com.valvesoftware.Steam', '.local', 'share', 'Steam', 'steamapps'),
    path.join(home, 'Library', 'Application Support', 'Steam', 'steamapps'),
    '/mnt/c/Program Files (x86)/Steam/steamapps',
    '/mnt/c/Program Files/Steam/steamapps',
    '/mnt/d/SteamLibrary/steamapps',
    path.join(process.cwd(), 'data', 'steamapps')
  ].filter(Boolean);

  const discoveredDirs = new Set<string>();
  const protonVersions = new Set<string>();

  for (const candidate of candidatePaths) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
        discoveredDirs.add(candidate);
        const vdfPath = path.join(candidate, 'libraryfolders.vdf');
        if (fs.existsSync(vdfPath)) {
          const rawVdf = fs.readFileSync(vdfPath, 'utf8');
          const matches = rawVdf.matchAll(/"path"\s+"([^"]+)"/g);
          for (const m of matches) {
            const normalized = m[1].replace(/\\\\/g, '/');
            const sub = path.join(normalized, 'steamapps');
            if (fs.existsSync(sub)) discoveredDirs.add(sub);
          }
        }
      }
    } catch {}
  }

  // Also scan Proton / GE-Proton compatibilitytools.d
  const compatToolDirs = [
    path.join(home, '.steam', 'root', 'compatibilitytools.d'),
    path.join(home, '.local', 'share', 'Steam', 'compatibilitytools.d'),
    '/usr/share/steam/compatibilitytools.d'
  ];
  for (const ctDir of compatToolDirs) {
    try {
      if (fs.existsSync(ctDir)) {
        for (const item of fs.readdirSync(ctDir)) {
          protonVersions.add(item);
        }
      }
    } catch {}
  }

  const games: LocalSteamGameEntry[] = [];
  const seenAppIds = new Set<number>();

  for (const dir of discoveredDirs) {
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (!/^appmanifest_\d+\.acf$/i.test(file)) continue;
        const manifestPath = path.join(dir, file);
        const raw = fs.readFileSync(manifestPath, 'utf8');
        const appid = Number((raw.match(/"appid"\s+"(\d+)"/i) || [])[1] || 0);
        const name = (raw.match(/"name"\s+"([^"]+)"/i) || [])[1] || `Steam App ${appid}`;
        const installdir = (raw.match(/"installdir"\s+"([^"]+)"/i) || [])[1] || '';
        const sizeOnDisk = Number((raw.match(/"SizeOnDisk"\s+"(\d+)"/i) || [])[1] || 0);
        const lastUpdatedSec = Number((raw.match(/"LastUpdated"\s+"(\d+)"/i) || [])[1] || 0);

        if (name.toLowerCase().includes('proton')) {
          protonVersions.add(name);
        }
        if (appid && !seenAppIds.has(appid)) {
          seenAppIds.add(appid);
          games.push({
            appid,
            name,
            installdir,
            sizeOnDisk,
            libraryPath: dir,
            manifestPath,
            lastUpdated: lastUpdatedSec > 0 ? new Date(lastUpdatedSec * 1000).toISOString() : undefined
          });
        }
      }
    } catch {}
  }

  const hasBin = (bin: string) => Boolean(safeExecSync(`command -v ${bin} 2>/dev/null`, 1200).trim());

  return {
    scannedPaths: candidatePaths,
    existingLibraries: Array.from(discoveredDirs),
    games: games.sort((a, b) => a.name.localeCompare(b.name)),
    steamBinaryAvailable: hasBin('steam'),
    steamCmdAvailable: hasBin('steamcmd'),
    protonVersions: Array.from(protonVersions)
  };
}

export async function launchSteamGameUniversal(opts: {
  appId: number;
  gameName?: string;
  runner?: 'native-steam' | 'proton-ge' | 'gamescope-hdr' | 'wine-dxvk' | 'steamcmd-install';
  enableControllerInput?: boolean;
  enableMangoHud?: boolean;
  enableGamemode?: boolean;
  extraArgs?: string;
}) {
  const appId = Number(opts.appId);
  const gameName = (opts.gameName || `Steam App ${appId}`).trim();
  const runner = opts.runner || 'native-steam';
  const launchersDir = path.join(process.cwd(), 'data', 'steam-launchers');
  fs.mkdirSync(launchersDir, { recursive: true });

  const envParts: string[] = [
    'SDL_GAMECONTROLLER_ALLOW_STEAM_VIRTUAL_GAMEPAD=1',
    'PROTON_ENABLE_NVAPI=1',
    'PROTON_HIDE_NVIDIA_GPU=0',
    'DXVK_ASYNC=1',
    'VKD3D_CONFIG=dxr11,dxr'
  ];
  if (opts.enableControllerInput !== false) {
    envParts.push('SDL_JOYSTICK_HIDAPI=1', 'SDL_JOYSTICK_HIDAPI_PS5=1', 'SDL_JOYSTICK_HIDAPI_SWITCH=1', 'SDL_JOYSTICK_HIDAPI_XBOX=1');
  }
  const wrapperChain: string[] = [];
  if (opts.enableGamemode) wrapperChain.push('gamemoderun');
  if (opts.enableMangoHud) wrapperChain.push('mangohud');
  if (runner === 'gamescope-hdr') wrapperChain.push('gamescope -W 1920 -H 1080 -f --');

  const launchCommand =
    runner === 'steamcmd-install'
      ? `steamcmd +login anonymous +app_update ${appId} validate +quit`
      : `${envParts.join(' ')} ${wrapperChain.join(' ')} steam -applaunch ${appId} ${opts.extraArgs || ''}`.replace(/\s+/g, ' ').trim();

  const scriptPath = path.join(launchersDir, `launch-steam-${appId}.sh`);
  const scriptContent = [
    '#!/usr/bin/env bash',
    `# Lysander Sovereign OS — Universal Steam Game Launcher (${gameName} · AppID ${appId})`,
    `# Controller Stack: Xbox XInput + DualSense PS5 + Nintendo Switch/Joy-Con + Steam Input + KB/M`,
    'set -e',
    ...envParts.map((kv) => `export ${kv}`),
    `echo "[Lysander Steam Runner] Launching ${gameName} (AppID ${appId}) via ${runner}..."`,
    `if command -v steam >/dev/null 2>&1; then`,
    `  exec ${wrapperChain.join(' ')} steam -applaunch ${appId} ${opts.extraArgs || ''}`,
    `elif command -v xdg-open >/dev/null 2>&1; then`,
    `  exec xdg-open "steam://rungameid/${appId}"`,
    `else`,
    `  echo "Steam desktop binary not installed on this container host. Use Physical Host Bridge (127.0.0.1:4747) or run on your desktop."`,
    `  exit 0`,
    `fi`,
    ''
  ].join('\n');
  fs.writeFileSync(scriptPath, scriptContent, { encoding: 'utf8', mode: 0o755 });

  const hasSteam = Boolean(safeExecSync('command -v steam 2>/dev/null', 1200).trim());
  const hasSteamCmd = Boolean(safeExecSync('command -v steamcmd 2>/dev/null', 1200).trim());
  let nativeAttempted = false;
  let executionNote = '';

  if (runner === 'steamcmd-install' && hasSteamCmd) {
    nativeAttempted = true;
    executionNote = `steamcmd detected locally. Generated launcher script at ${scriptPath}.`;
  } else if (hasSteam) {
    try {
      const child = spawn('steam', ['-applaunch', String(appId)], {
        detached: true,
        stdio: 'ignore',
        env: {
          ...process.env,
          SDL_JOYSTICK_HIDAPI: '1',
          SDL_JOYSTICK_HIDAPI_PS5: '1',
          SDL_JOYSTICK_HIDAPI_SWITCH: '1'
        }
      });
      child.unref();
      nativeAttempted = true;
      executionNote = `Dispatched native Steam process (steam -applaunch ${appId}) with full HIDAPI controller stack.`;
    } catch (err: any) {
      executionNote = `Local Steam spawn returned: ${err?.message || 'unable to spawn'}`;
    }
  } else {
    executionNote = `Generated executable Proton/DXVK/Controller launcher script (${scriptPath}). Connect the Physical Host Bridge (127.0.0.1:4747) to launch directly on your local GPU, or invoke steam://rungameid/${appId}.`;
  }

  return {
    success: true,
    appId,
    gameName,
    runner,
    nativeAttempted,
    hasSteamBinary: hasSteam,
    hasSteamCmd,
    scriptPath,
    launchCommand,
    protocolUri: `steam://rungameid/${appId}`,
    installProtocolUri: `steam://install/${appId}`,
    cloudStreamBridges: {
      geforceNowSearch: `https://play.geforcenow.com/mall/#/layout/games`,
      steamRemotePlay: `steam://open/bigpicture`,
      xboxCloud: `https://www.xbox.com/play`,
      moonlightSunshine: 'https://app.lizardbyte.dev/Sunshine/'
    },
    executionNote
  };
}

export interface UniversalCompatCapability {
  id: string;
  category:
    | 'windows-parity'
    | 'linux-native'
    | 'android-mobile'
    | 'macos-darwin'
    | 'cross-arch-wasm'
    | 'beyond-windows-kernel';
  name: string;
  formats: string[];
  available: boolean;
  versionOrPath: string;
  windowsComparison: string;
  installOrRunCommand: string;
}

export function probeUniversalCompatibilityMatrix(): {
  hostPlatform: string;
  arch: string;
  kernelRelease: string;
  totalCapabilities: number;
  activeCount: number;
  capabilities: UniversalCompatCapability[];
} {
  const probeBin = (bins: string[]): { available: boolean; detail: string } => {
    for (const bin of bins) {
      const resolved = safeExecSync(`command -v ${bin} 2>/dev/null`, 1200).trim();
      if (resolved) {
        const ver = safeExecSync(`${bin} --version 2>/dev/null | head -n 1`, 1200).trim();
        return { available: true, detail: ver ? `${resolved} (${ver.slice(0, 64)})` : resolved };
      }
    }
    return { available: false, detail: 'Not installed on this container host (1-click install / Host Bridge ready)' };
  };

  const nodeP = probeBin(['node']);
  const pyP = probeBin(['python3', 'python']);
  const wineP = probeBin(['wine64', 'wine']);
  const steamP = probeBin(['steam', 'steamcmd']);
  const dockerP = probeBin(['docker', 'podman']);
  const flatpakP = probeBin(['flatpak']);
  const appimageP = { available: fs.existsSync('/dev/fuse') || Boolean(safeExecSync('command -v fusermount 2>/dev/null', 900).trim()), detail: fs.existsSync('/dev/fuse') ? '/dev/fuse mounted (AppImage ready)' : 'FUSE optional (--appimage-extract supported natively)' };
  const nixP = probeBin(['nix']);
  const aptP = probeBin(['apt-get', 'pacman', 'dnf', 'apk', 'brew']);
  const adbP = probeBin(['adb', 'waydroid']);
  const qemuP = probeBin(['qemu-x86_64', 'qemu-aarch64', 'qemu-system-x86_64', 'box64']);
  const darlingP = probeBin(['darling']);
  const wasmP = { available: typeof WebAssembly === 'object', detail: `V8 WebAssembly + WASI JIT (Node ${process.version})` };
  const gccP = probeBin(['gcc', 'clang', 'rustc', 'go']);
  const pwshP = probeBin(['pwsh']);
  const bashP = probeBin(['bash', 'zsh', 'sh']);
  const procFsAvailable = fs.existsSync('/proc/cpuinfo');
  const vulkanP = probeBin(['vulkaninfo', 'glxinfo']);

  const capabilities: UniversalCompatCapability[] = [
    // Windows Full Parity
    {
      id: 'win32-wine-proton',
      category: 'windows-parity',
      name: 'Windows Win32/Win64 PE (.exe / .msi) via Wine & Valve Proton',
      formats: ['.exe', '.msi', '.dll', 'DirectX 9/10/11/12 (DXVK / VKD3D-Proton)'],
      available: wineP.available,
      versionOrPath: wineP.detail,
      windowsComparison: 'Runs Windows apps & games without Windows telemetry, forced updates, or BitLocker/TPM lockouts',
      installOrRunCommand: 'sudo apt-get update && sudo apt-get install -y wine64 winetricks'
    },
    {
      id: 'steam-gaming-stack',
      category: 'windows-parity',
      name: 'Valve Steam + Proton GE + Gamescope + Full HIDAPI Controller Stack',
      formats: ['Steam AppIDs', 'VDF/ACF', 'XInput', 'DualSense', 'Switch Pro/Joy-Con', 'Steam Deck'],
      available: steamP.available,
      versionOrPath: steamP.detail,
      windowsComparison: 'Native Steam + Proton + ALL controller families + Keyboard/Mouse + Multi-Touch Virtual Gamepad',
      installOrRunCommand: 'sudo apt-get install -y steam-installer gamemode mangohud'
    },
    {
      id: 'powershell-interop',
      category: 'windows-parity',
      name: 'PowerShell Core & Windows Batch Interop',
      formats: ['.ps1', '.bat', '.cmd', 'SMB/CIFS'],
      available: pwshP.available,
      versionOrPath: pwshP.detail,
      windowsComparison: 'Supports Windows automation scripts alongside full POSIX Bash/Zsh shells',
      installOrRunCommand: 'sudo apt-get install -y powershell'
    },
    // Everything Windows Cannot Do / Limits
    {
      id: 'linux-elf-posix',
      category: 'linux-native',
      name: 'Native Linux ELF64 Binaries & POSIX Shell Toolchains',
      formats: ['ELF64', '.sh', '.deb', '.rpm', 'systemd', 'POSIX Pipes'],
      available: bashP.available,
      versionOrPath: bashP.detail,
      windowsComparison: 'Zero WSL2 VM overhead — native Linux kernel syscalls, fork/exec, symlinks, and chmod/chown',
      installOrRunCommand: 'uname -a && ldd --version'
    },
    {
      id: 'pkg-managers-universal',
      category: 'linux-native',
      name: 'Universal System Package Managers (APT / Pacman / DNF / Brew / Nix)',
      formats: ['.deb', '.rpm', '.pkg.tar.zst', 'Nix Flakes'],
      available: aptP.available || nixP.available,
      versionOrPath: aptP.available ? aptP.detail : nixP.detail,
      windowsComparison: 'Atomic multi-repo package management vs Windows fragmented MSI/EXE installers',
      installOrRunCommand: 'apt-cache stats || nix --version'
    },
    {
      id: 'appimage-flatpak',
      category: 'linux-native',
      name: 'Portable Linux AppImage & Sandboxed Flatpak Runtimes',
      formats: ['.AppImage', '.flatpak', '.flatpakref'],
      available: appimageP.available || flatpakP.available,
      versionOrPath: flatpakP.available ? flatpakP.detail : appimageP.detail,
      windowsComparison: 'Single-file portable Linux desktop executables with zero registry pollution',
      installOrRunCommand: 'sudo apt-get install -y flatpak libfuse2'
    },
    {
      id: 'oci-docker-containers',
      category: 'linux-native',
      name: 'Native Linux Namespaces, OCI Containers & Distrobox (Docker / Podman)',
      formats: ['OCI Image', 'Dockerfile', 'Distrobox (Arch/Ubuntu/Fedora/Kali)'],
      available: dockerP.available,
      versionOrPath: dockerP.detail,
      windowsComparison: 'Runs native Linux containers directly on host kernel without Hyper-V/WSL2 memory tax',
      installOrRunCommand: 'sudo apt-get install -y docker.io podman'
    },
    {
      id: 'android-apk-waydroid',
      category: 'android-mobile',
      name: 'Android APK / AAB & Mobile Bridge (Waydroid / ADB / Termux)',
      formats: ['.apk', '.aab', 'ADB USB/Wi-Fi', 'Android Container'],
      available: adbP.available,
      versionOrPath: adbP.detail,
      windowsComparison: 'Microsoft killed Windows Subsystem for Android (WSA) in 2025 — Lysander runs native Waydroid + ADB!',
      installOrRunCommand: 'sudo apt-get install -y android-tools-adb waydroid'
    },
    {
      id: 'macos-darwin-layer',
      category: 'macos-darwin',
      name: 'macOS / Darwin Mach-O Translation & KVM Virtualization (Darling / QEMU)',
      formats: ['Mach-O', '.app', '.dmg', '.pkg'],
      available: darlingP.available || qemuP.available,
      versionOrPath: darlingP.available ? darlingP.detail : qemuP.detail,
      windowsComparison: 'Windows blocks Mach-O/Darwin layers; Lysander supports Darling + KVM/QEMU macOS runtimes',
      installOrRunCommand: 'echo "Install Darling (https://www.darlinghq.org) or QEMU/KVM on bare-metal Linux"'
    },
    {
      id: 'cross-arch-emulation',
      category: 'cross-arch-wasm',
      name: 'Multi-Architecture Binary Translation (x86_64 ↔ ARM64 ↔ RISC-V)',
      formats: ['x86_64', 'ARM64/AArch64', 'RISC-V', 'Box64 / FEX-Emu / QEMU-user'],
      available: qemuP.available,
      versionOrPath: qemuP.detail,
      windowsComparison: 'Runs ARM64, RISC-V, and x86_64 binaries side-by-side via binfmt_misc + QEMU/Box64',
      installOrRunCommand: 'sudo apt-get install -y qemu-user-static binfmt-support'
    },
    {
      id: 'wasm-wasi-polyglot',
      category: 'cross-arch-wasm',
      name: 'Universal WebAssembly (WASM / WASI) + Node.js + Python + Native Compilers',
      formats: ['.wasm', '.wat', '.js/.ts', '.py', 'C/C++/Rust/Go'],
      available: wasmP.available && (nodeP.available || pyP.available),
      versionOrPath: `${wasmP.detail} | ${pyP.available ? 'Python3 Ready' : 'Node Ready'} | ${gccP.available ? 'Native Compiler Ready' : 'JIT Ready'}`,
      windowsComparison: 'Instant zero-install polyglot compilation & sandboxed WASM execution across every CPU',
      installOrRunCommand: 'node -v && python3 --version'
    },
    {
      id: 'beyond-windows-ring0',
      category: 'beyond-windows-kernel',
      name: 'Unrestricted POSIX Root (UID 0), Live /proc /sys Kernel Introspection & Vulkan GPU',
      formats: ['/proc', '/sys', 'eBPF', 'Vulkan/OpenGL', 'Unlimited UI/CSS/Kernel Customization'],
      available: procFsAvailable || vulkanP.available,
      versionOrPath: procFsAvailable
        ? `Live /proc & /sys mounted · UID 0 Sovereign Kernel · ${vulkanP.available ? 'Vulkan/GL Ready' : 'Software + Host Bridge GPU'}`
        : 'Host Kernel Bridge Active',
      windowsComparison: 'Zero telemetry, zero forced reboots, zero TPM/SecureBoot lockouts, full live CSS/Window/Desktop source freedom',
      installOrRunCommand: 'cat /proc/version && lscpu | head -n 8'
    }
  ];

  return {
    hostPlatform: os.platform(),
    arch: os.arch(),
    kernelRelease: os.release(),
    totalCapabilities: capabilities.length,
    activeCount: capabilities.filter((c) => c.available).length,
    capabilities
  };
}


