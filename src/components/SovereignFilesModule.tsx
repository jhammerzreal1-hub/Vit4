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

import React, { useState, useEffect, useRef } from 'react';
import {
  Folder,
  FileText,
  ArrowUp,
  RefreshCw,
  Plus,
  FolderPlus,
  Download,
  Trash2,
  Save,
  HardDrive,
  Search,
  ChevronRight,
  X,
  Upload,
  Check,
  Terminal,
  Laptop,
  Server,
  Cpu,
  Edit3,
  Copy,
  Link2,
  FolderOpen,
  Shield,
  ArrowRightLeft
} from 'lucide-react';
import type { ModuleType } from '../types';
import type { AuthUserPublic } from '../types/auth';
import { apiFetch } from '../utils/authClient';

interface FileEntry {
  name: string;
  path: string;
  type: 'dir' | 'file' | 'symlink' | 'other';
  sizeBytes: number;
  permissions: string;
  modifiedAt: string;
  ext: string;
  sourceLabel?: string;
}

interface DiskStats {
  path: string;
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  usedPct: number;
}

interface StorageVolume {
  device: string;
  fsType: string;
  mountPoint: string;
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  usedPct: number;
}

interface HostPlace {
  id: string;
  label: string;
  path: string;
  category: 'os' | 'user' | 'system';
  exists: boolean;
  writable: boolean;
}

interface DownloadItem {
  name: string;
  path: string;
  source: string;
  sourceLabel: string;
  type: 'dir' | 'file' | 'symlink' | 'other';
  sizeBytes: number;
  permissions: string;
  modifiedAt: string;
  ext: string;
}

interface MountedDeviceFile {
  name: string;
  relativePath: string;
  sizeBytes: number;
  modifiedAt: string;
  fileObj?: File;
  fileHandle?: any;
  isDir: boolean;
}

interface MountedDeviceRoot {
  id: string;
  label: string;
  mode: 'fsa-handle' | 'webkit-tree';
  dirHandle?: any;
  filesMap?: Map<string, MountedDeviceFile>;
  fileCount: number;
}

interface BridgeHostInfo {
  hostname: string;
  platform: string;
  type: string;
  release: string;
  arch: string;
  homedir: string;
  username: string;
  cpuModel: string;
  cpuCores: number;
  totalMemBytes: number;
  freeMemBytes: number;
  volumes: StorageVolume[];
  places: HostPlace[];
}

interface SovereignFilesModuleProps {
  authUser?: AuthUserPublic | null;
  onSelectModule?: (mod: ModuleType) => void;
  onInjectToChat?: (content: string, immediate?: boolean) => void;
}

type StorageSourceMode = 'runtime-host' | 'physical-device' | 'host-bridge';
type CenterViewMode = 'browser' | 'downloads' | 'search' | 'system-info';

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
}

export const SovereignFilesModule: React.FC<SovereignFilesModuleProps> = ({
  authUser,
  onSelectModule,
  onInjectToChat
}) => {
  const [sourceMode, setSourceMode] = useState<StorageSourceMode>('runtime-host');
  const [centerView, setCenterView] = useState<CenterViewMode>('browser');

  // Active directory & entries state
  const [currentPath, setCurrentPath] = useState<string>('');
  const [pathInput, setPathInput] = useState<string>('');
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [disk, setDisk] = useState<DiskStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [statusNotice, setStatusNotice] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Host Volumes, Places, All Downloads & Full System Profile
  const [volumes, setVolumes] = useState<StorageVolume[]>([]);
  const [places, setPlaces] = useState<HostPlace[]>([]);
  const [allDownloads, setAllDownloads] = useState<DownloadItem[]>([]);
  const [downloadRoots, setDownloadRoots] = useState<Array<{ id: string; label: string; path: string; exists: boolean; count: number }>>([]);
  const [hostSystemProfile, setHostSystemProfile] = useState<any>(null);

  // Global Recursive Host Search
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');
  const [globalSearchRoot, setGlobalSearchRoot] = useState<string>(authUser?.workspaceRoot || '/');
  const [globalSearchResults, setGlobalSearchResults] = useState<FileEntry[]>([]);
  const [globalSearchMeta, setGlobalSearchMeta] = useState<string>('');
  const [searchingGlobal, setSearchingGlobal] = useState<boolean>(false);

  // Physical Device Direct Mount (Browser File System Access API + webkitdirectory fallback)
  const [mountedDevices, setMountedDevices] = useState<MountedDeviceRoot[]>([]);
  const [activeMountId, setActiveMountId] = useState<string | null>(null);
  const [activeDeviceSubPath, setActiveDeviceSubPath] = useState<string>('');
  const [deviceEntries, setDeviceEntries] = useState<MountedDeviceFile[]>([]);
  const [activeDeviceHandleStack, setActiveDeviceHandleStack] = useState<Array<{ name: string; handle: any }>>([]);
  const webkitFolderInputRef = useRef<HTMLInputElement>(null);

  // Native Physical Host Bridge Daemon (127.0.0.1:4747)
  const [bridgeUrl, setBridgeUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('lysander_host_bridge_url') || 'http://127.0.0.1:4747';
    } catch {
      return 'http://127.0.0.1:4747';
    }
  });
  const [bridgeToken, setBridgeToken] = useState<string>(() => {
    try {
      return localStorage.getItem('lysander_host_bridge_token') || '';
    } catch {
      return '';
    }
  });
  const [bridgeConnected, setBridgeConnected] = useState<boolean>(false);
  const [bridgeInfo, setBridgeInfo] = useState<BridgeHostInfo | null>(null);
  const [probingBridge, setProbingBridge] = useState<boolean>(false);

  // File Inspector / Editor State
  const [selectedFile, setSelectedFile] = useState<{
    path: string;
    name: string;
    sizeBytes: number;
    truncated: boolean;
    isBinary: boolean;
    permissions: string;
    sha256: string;
    content: string;
    originSource: StorageSourceMode;
    localFileHandle?: any;
    localFileObj?: File;
  } | null>(null);
  const [editorText, setEditorText] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [saveNotice, setSaveNotice] = useState<string>('');

  // Inline Create / Rename / Confirm Delete Modals
  const [createModalType, setCreateModalType] = useState<'file' | 'folder' | null>(null);
  const [newItemName, setNewItemName] = useState<string>('');
  const [renameTarget, setRenameTarget] = useState<FileEntry | null>(null);
  const [renameDraft, setRenameDraft] = useState<string>('');
  const [confirmDeleteEntry, setConfirmDeleteEntry] = useState<FileEntry | null>(null);

  const getApiBase = (mode: StorageSourceMode = sourceMode) => {
    if (mode === 'host-bridge') {
      return `${bridgeUrl.replace(/\/+$/, '')}/host`;
    }
    return '/api/os';
  };

  const getBridgeHeaders = (mode: StorageSourceMode = sourceMode): Record<string, string> => {
    const h: Record<string, string> = {};
    if (mode === 'host-bridge' && bridgeToken.trim()) {
      h['X-Lysander-Token'] = bridgeToken.trim();
    }
    return h;
  };

  const fetchForMode = (mode: StorageSourceMode, url: string, init?: RequestInit) =>
    mode === 'host-bridge' ? fetch(url, init) : apiFetch(url, init);

  const loadHostMetadata = async () => {
    try {
      const [sysRes, dlRes] = await Promise.all([
        apiFetch('/api/os/host/system-access'),
        apiFetch('/api/os/fs/downloads')
      ]);
      if (sysRes.ok) {
        const sysData = await sysRes.json();
        if (sysData.success) {
          setHostSystemProfile(sysData);
          if (Array.isArray(sysData.volumes)) setVolumes(sysData.volumes);
          if (Array.isArray(sysData.places)) setPlaces(sysData.places);
        }
      }
      if (dlRes.ok) {
        const dlData = await dlRes.json();
        if (dlData.success) {
          setAllDownloads(Array.isArray(dlData.downloads) ? dlData.downloads : []);
          setDownloadRoots(Array.isArray(dlData.roots) ? dlData.roots : []);
        }
      }
    } catch {}
  };

  const probePhysicalHostBridge = async (overrideUrl?: string, silent = false) => {
    const target = (overrideUrl || bridgeUrl).replace(/\/+$/, '');
    if (!silent) setProbingBridge(true);
    try {
      const headers: Record<string, string> = {};
      if (bridgeToken.trim()) headers['X-Lysander-Token'] = bridgeToken.trim();
      const res = await fetch(`${target}/host/info`, {
        headers,
        signal: AbortSignal.timeout(2200)
      });
      if (!res.ok) throw new Error(`Bridge HTTP ${res.status}`);
      const data = await res.json();
      if (data?.success) {
        setBridgeConnected(true);
        setBridgeInfo(data);
        try {
          localStorage.setItem('lysander_host_bridge_url', target);
          localStorage.setItem('lysander_host_bridge_token', bridgeToken.trim());
        } catch {}
        if (!silent) {
          setStatusNotice(`Connected to Physical Host: ${data.hostname} (${data.type} ${data.arch})`);
        }
        return data as BridgeHostInfo;
      }
    } catch {
      setBridgeConnected(false);
      setBridgeInfo(null);
    } finally {
      if (!silent) setProbingBridge(false);
    }
    return null;
  };

  const loadDirectory = async (target?: string, modeOverride?: StorageSourceMode) => {
    const mode = modeOverride || sourceMode;
    if (mode === 'physical-device') return;
    setLoading(true);
    setErrorMsg('');
    setCenterView('browser');
    try {
      const base = getApiBase(mode);
      const qs = target ? `?path=${encodeURIComponent(target)}` : '';
      const res = await fetchForMode(mode, `${base}/fs/list${qs}`, {
        headers: getBridgeHeaders(mode)
      });
      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.error || 'Failed to read directory');
        return;
      }
      setCurrentPath(data.path);
      setPathInput(data.path);
      setParentPath(data.parent);
      setEntries(Array.isArray(data.entries) ? data.entries : []);
      setDisk(data.disk || null);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Host filesystem error');
    } finally {
      setLoading(false);
    }
  };

  const loadBridgeDownloads = async () => {
    if (!bridgeConnected) return;
    try {
      const res = await fetch(`${getApiBase('host-bridge')}/fs/downloads`, {
        headers: getBridgeHeaders('host-bridge')
      });
      const data = await res.json();
      if (data?.success) {
        setAllDownloads(Array.isArray(data.downloads) ? data.downloads : []);
        setDownloadRoots(Array.isArray(data.roots) ? data.roots : []);
      }
    } catch {}
  };

  const openFile = async (entry: FileEntry, modeOverride?: StorageSourceMode) => {
    const mode = modeOverride || sourceMode;
    if (entry.type === 'dir') {
      loadDirectory(entry.path, mode);
      return;
    }
    setErrorMsg('');
    try {
      const base = getApiBase(mode);
      const res = await fetchForMode(mode, `${base}/fs/read?path=${encodeURIComponent(entry.path)}`, {
        headers: getBridgeHeaders(mode)
      });
      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.error || 'Unable to open file');
        return;
      }
      setSelectedFile({ ...data, originSource: mode });
      setEditorText(data.content || '');
      setSaveNotice('');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to read file');
    }
  };

  useEffect(() => {
    setSelectedFile(null);
    setGlobalSearchRoot(authUser?.workspaceRoot || '/');
    loadDirectory(authUser?.workspaceRoot || undefined, 'runtime-host');
    loadHostMetadata();
    probePhysicalHostBridge(undefined, true);
  }, [authUser?.id, authUser?.workspaceRoot]);

  const fileHandlersRef = useRef<{
    loadDirectory: (target?: string) => Promise<void>;
    openFile: (entry: FileEntry) => Promise<void>;
  }>({ loadDirectory, openFile });
  fileHandlersRef.current = { loadDirectory, openFile };

  useEffect(() => {
    const onOsCommand = async (e: Event) => {
      const detail = (e as CustomEvent<any>)?.detail;
      if (!detail || detail.action !== 'files_open_path' || !detail.path) return;
      const targetPath = String(detail.path).trim();
      if (!targetPath) return;
      setSourceMode('runtime-host');
      setCenterView('browser');
      try {
        const readRes = await apiFetch(`/api/os/fs/read?path=${encodeURIComponent(targetPath)}`);
        const readData = await readRes.json();
        if (readData.success) {
          setSelectedFile({ ...readData, originSource: 'runtime-host' });
          setEditorText(readData.content || '');
          setSaveNotice('');
          const slashIdx = targetPath.lastIndexOf('/');
          if (slashIdx > 0) {
            await fileHandlersRef.current.loadDirectory(targetPath.slice(0, slashIdx));
          }
          return;
        }
      } catch {}
      await fileHandlersRef.current.loadDirectory(targetPath);
    };
    window.addEventListener('sovereign_os_command', onOsCommand);
    return () => window.removeEventListener('sovereign_os_command', onOsCommand);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmDeleteEntry) setConfirmDeleteEntry(null);
        else if (renameTarget) setRenameTarget(null);
        else if (createModalType) setCreateModalType(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmDeleteEntry, createModalType, renameTarget]);

  // --- PHYSICAL DEVICE DIRECT MOUNT (Browser File System Access API + webkitdirectory fallback) ---
  const readFsaDirectoryEntries = async (dirHandle: any, prefixPath: string) => {
    const list: MountedDeviceFile[] = [];
    for await (const [name, handle] of dirHandle.entries()) {
      const rel = prefixPath ? `${prefixPath}/${name}` : name;
      if (handle.kind === 'directory') {
        list.push({
          name,
          relativePath: rel,
          sizeBytes: 0,
          modifiedAt: '',
          fileHandle: handle,
          isDir: true
        });
      } else {
        let sizeBytes = 0;
        let modifiedAt = '';
        try {
          const f = await handle.getFile();
          sizeBytes = f.size;
          modifiedAt = new Date(f.lastModified).toISOString();
        } catch {}
        list.push({
          name,
          relativePath: rel,
          sizeBytes,
          modifiedAt,
          fileHandle: handle,
          isDir: false
        });
      }
    }
    list.sort((a, b) => (a.isDir && !b.isDir ? -1 : !a.isDir && b.isDir ? 1 : a.name.localeCompare(b.name)));
    setDeviceEntries(list);
  };

  const renderWebkitSubPath = (root: MountedDeviceRoot, subPath: string) => {
    const filesMap = root.filesMap;
    if (!filesMap) return;
    const prefix = subPath ? `${subPath}/` : '';
    const dirs = new Set<string>();
    const files: MountedDeviceFile[] = [];

    for (const [rel, item] of filesMap.entries()) {
      if (!rel.startsWith(prefix)) continue;
      const rest = rel.slice(prefix.length);
      if (!rest) continue;
      const slash = rest.indexOf('/');
      if (slash !== -1) {
        const dirName = rest.slice(0, slash);
        dirs.add(dirName);
      } else {
        files.push(item);
      }
    }

    const dirItems: MountedDeviceFile[] = Array.from(dirs)
      .sort()
      .map((name) => ({
        name,
        relativePath: prefix ? `${prefix}${name}` : name,
        sizeBytes: 0,
        modifiedAt: '',
        isDir: true
      }));
    files.sort((a, b) => a.name.localeCompare(b.name));
    setDeviceEntries([...dirItems, ...files]);
  };

  const handleMountLocalDeviceFolder = async () => {
    setErrorMsg('');
    const win = window as any;
    if (typeof win.showDirectoryPicker === 'function') {
      try {
        const dirHandle = await win.showDirectoryPicker({ mode: 'readwrite' });
        const mountId = `dev-${Date.now()}`;
        const newRoot: MountedDeviceRoot = {
          id: mountId,
          label: dirHandle.name || 'Mounted Host Folder',
          mode: 'fsa-handle',
          dirHandle,
          fileCount: 0
        };
        setMountedDevices((prev) => [newRoot, ...prev]);
        setActiveMountId(mountId);
        setActiveDeviceSubPath('');
        setActiveDeviceHandleStack([{ name: newRoot.label, handle: dirHandle }]);
        setSourceMode('physical-device');
        setCenterView('browser');
        await readFsaDirectoryEntries(dirHandle, '');
        setStatusNotice(`Mounted physical folder "${newRoot.label}" with direct read/write access.`);
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        // Cross-origin iframe SecurityError -> seamlessly fall back to native webkitdirectory folder picker
      }
    }
    webkitFolderInputRef.current?.click();
  };

  const handleWebkitFolderSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const filesMap = new Map<string, MountedDeviceFile>();
    let rootFolderName = 'Mounted Device Folder';

    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      const webkitRel = (f as any).webkitRelativePath || f.name;
      const parts = webkitRel.split('/').filter(Boolean);
      if (i === 0 && parts.length > 1) {
        rootFolderName = parts[0];
      }
      const subRel = parts.length > 1 ? parts.slice(1).join('/') : f.name;
      filesMap.set(subRel, {
        name: f.name,
        relativePath: subRel,
        sizeBytes: f.size,
        modifiedAt: new Date(f.lastModified).toISOString(),
        fileObj: f,
        isDir: false
      });
    }

    const mountId = `dev-wk-${Date.now()}`;
    const newRoot: MountedDeviceRoot = {
      id: mountId,
      label: rootFolderName,
      mode: 'webkit-tree',
      filesMap,
      fileCount: filesMap.size
    };
    setMountedDevices((prev) => [newRoot, ...prev]);
    setActiveMountId(mountId);
    setActiveDeviceSubPath('');
    setActiveDeviceHandleStack([]);
    setSourceMode('physical-device');
    setCenterView('browser');
    renderWebkitSubPath(newRoot, '');
    setStatusNotice(`Mounted physical host folder "${rootFolderName}" (${filesMap.size} files accessible).`);
    e.target.value = '';
  };

  const selectMountedDevice = async (root: MountedDeviceRoot) => {
    setActiveMountId(root.id);
    setActiveDeviceSubPath('');
    setSourceMode('physical-device');
    setCenterView('browser');
    if (root.mode === 'fsa-handle' && root.dirHandle) {
      setActiveDeviceHandleStack([{ name: root.label, handle: root.dirHandle }]);
      await readFsaDirectoryEntries(root.dirHandle, '');
    } else {
      setActiveDeviceHandleStack([]);
      renderWebkitSubPath(root, '');
    }
  };

  const openMountedDeviceEntry = async (item: MountedDeviceFile) => {
    const activeRoot = mountedDevices.find((m) => m.id === activeMountId);
    if (!activeRoot) return;

    if (item.isDir) {
      setActiveDeviceSubPath(item.relativePath);
      if (activeRoot.mode === 'fsa-handle' && item.fileHandle) {
        setActiveDeviceHandleStack((prev) => [...prev, { name: item.name, handle: item.fileHandle }]);
        await readFsaDirectoryEntries(item.fileHandle, item.relativePath);
      } else {
        renderWebkitSubPath(activeRoot, item.relativePath);
      }
      return;
    }

    try {
      const fileObj: File = item.fileObj || (item.fileHandle ? await item.fileHandle.getFile() : null);
      if (!fileObj) return;
      const slice = fileObj.slice(0, 262144);
      const buf = await slice.arrayBuffer();
      const u8 = new Uint8Array(buf);
      let isBinary = false;
      for (let i = 0; i < Math.min(u8.length, 4096); i++) {
        if (u8[i] === 0) {
          isBinary = true;
          break;
        }
      }
      const content = isBinary
        ? Array.from(u8.slice(0, 1024))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')
            .match(/.{1,32}/g)
            ?.join('\n') || ''
        : new TextDecoder('utf-8', { fatal: false }).decode(u8);

      setSelectedFile({
        path: `${activeRoot.label}/${item.relativePath}`,
        name: item.name,
        sizeBytes: fileObj.size,
        truncated: fileObj.size > 262144,
        isBinary,
        permissions: activeRoot.mode === 'fsa-handle' ? 'rw-disk' : 'ro-tree',
        sha256: `local-${fileObj.lastModified.toString(16)}`,
        content,
        originSource: 'physical-device',
        localFileHandle: item.fileHandle,
        localFileObj: fileObj
      });
      setEditorText(content);
      setSaveNotice('');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to read mounted device file');
    }
  };

  const navigateUpMountedDevice = async () => {
    const activeRoot = mountedDevices.find((m) => m.id === activeMountId);
    if (!activeRoot || !activeDeviceSubPath) return;
    const parts = activeDeviceSubPath.split('/').filter(Boolean);
    parts.pop();
    const nextSub = parts.join('/');
    setActiveDeviceSubPath(nextSub);
    if (activeRoot.mode === 'fsa-handle') {
      const nextStack = activeDeviceHandleStack.slice(0, Math.max(1, activeDeviceHandleStack.length - 1));
      setActiveDeviceHandleStack(nextStack);
      const top = nextStack[nextStack.length - 1];
      if (top?.handle) await readFsaDirectoryEntries(top.handle, nextSub);
    } else {
      renderWebkitSubPath(activeRoot, nextSub);
    }
  };

  const handleSyncPhysicalFileToOsDownloads = async (fileObj: File) => {
    try {
      setSaving(true);
      const buf = await fileObj.arrayBuffer();
      const base64 = arrayBufferToBase64(buf);
      const osDlPlace = places.find((p) => p.id === 'os-downloads');
      const targetDir = osDlPlace?.path || 'downloads';
      const targetPath = `${targetDir.replace(/[\\/]+$/, '')}/${fileObj.name}`;
      const res = await apiFetch('/api/os/fs/write-base64', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: targetPath, base64 })
      });
      const data = await res.json();
      if (data.success) {
        setStatusNotice(`Copied "${fileObj.name}" (${formatBytes(data.sizeBytes)}) directly into OS Downloads (${data.path})`);
        loadHostMetadata();
      } else {
        setErrorMsg(data.error || 'Sync to OS failed');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Sync to OS failed');
    } finally {
      setSaving(false);
    }
  };

  // --- GLOBAL RECURSIVE HOST SEARCH ---
  const handleRunGlobalSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = globalSearchQuery.trim();
    if (!q) return;
    setSearchingGlobal(true);
    setCenterView('search');
    setErrorMsg('');
    try {
      const mode = sourceMode === 'host-bridge' && bridgeConnected ? 'host-bridge' : 'runtime-host';
      const base = getApiBase(mode);
      const res = await fetchForMode(
        mode,
        `${base}/fs/search?root=${encodeURIComponent(globalSearchRoot || '/')}&q=${encodeURIComponent(q)}&maxResults=120`,
        { headers: getBridgeHeaders(mode) }
      );
      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.error || 'Search failed');
      } else {
        setGlobalSearchResults(Array.isArray(data.results) ? data.results : []);
        setGlobalSearchMeta(
          `${(data.results || []).length} matches across ${data.scannedDirs || 0} directories in ${data.root} (${data.elapsedMs || 0}ms)`
        );
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Host search error');
    } finally {
      setSearchingGlobal(false);
    }
  };

  // --- SAVE / CREATE / RENAME / COPY / DELETE / BINARY UPLOAD ---
  const handleSaveFile = async () => {
    if (!selectedFile || selectedFile.isBinary) return;
    setSaving(true);
    setSaveNotice('');
    try {
      if (selectedFile.originSource === 'physical-device' && selectedFile.localFileHandle) {
        const writable = await selectedFile.localFileHandle.createWritable();
        await writable.write(editorText);
        await writable.close();
        setSaveNotice(`Saved directly to physical host disk (${editorText.length} chars)`);
        return;
      }

      const mode = selectedFile.originSource === 'host-bridge' ? 'host-bridge' : 'runtime-host';
      const base = getApiBase(mode);
      const res = await fetchForMode(mode, `${base}/fs/write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getBridgeHeaders(mode) },
        body: JSON.stringify({ path: selectedFile.path, content: editorText })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedFile((prev) =>
          prev ? { ...prev, sizeBytes: data.sizeBytes, sha256: data.sha256 || prev.sha256, content: editorText } : null
        );
        setSaveNotice(`Saved (${data.sizeBytes} B · SHA-256 ${String(data.sha256 || '').slice(0, 10)})`);
        loadDirectory(currentPath, mode);
      } else {
        setErrorMsg(data.error || 'Failed to save file');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newItemName.trim();
    if (!clean || !currentPath) return;
    const sep = currentPath.includes('\\') ? '\\' : '/';
    const fullPath = `${currentPath.replace(/[\\/]+$/, '')}${sep}${clean}`;
    const mode = sourceMode === 'host-bridge' ? 'host-bridge' : 'runtime-host';
    const base = getApiBase(mode);

    try {
      const endpoint = createModalType === 'folder' ? `${base}/fs/mkdir` : `${base}/fs/write`;
      const body = createModalType === 'folder' ? { path: fullPath } : { path: fullPath, content: '' };
      const res = await fetchForMode(mode, endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getBridgeHeaders(mode) },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.error || 'Creation failed');
      } else {
        setCreateModalType(null);
        setNewItemName('');
        loadDirectory(currentPath, mode);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Creation failed');
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget || !renameDraft.trim()) return;
    const sep = renameTarget.path.includes('\\') ? '\\' : '/';
    const lastSep = renameTarget.path.lastIndexOf(sep);
    const parent = lastSep > 0 ? renameTarget.path.slice(0, lastSep) : '';
    const newPath = `${parent}${sep}${renameDraft.trim()}`;
    const mode = sourceMode === 'host-bridge' ? 'host-bridge' : 'runtime-host';
    const base = getApiBase(mode);

    try {
      const res = await fetchForMode(mode, `${base}/fs/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getBridgeHeaders(mode) },
        body: JSON.stringify({ oldPath: renameTarget.path, newPath })
      });
      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.error || 'Rename failed');
      } else {
        setRenameTarget(null);
        setRenameDraft('');
        loadDirectory(currentPath, mode);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Rename failed');
    }
  };

  const handleDuplicateEntry = async (entry: FileEntry) => {
    if (sourceMode !== 'runtime-host') return;
    const dstPath = `${entry.path}.copy`;
    try {
      const res = await apiFetch('/api/os/fs/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ srcPath: entry.path, dstPath })
      });
      const data = await res.json();
      if (data.success) {
        setStatusNotice(`Copied to ${dstPath}`);
        loadDirectory(currentPath);
      } else {
        setErrorMsg(data.error || 'Copy failed');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Copy failed');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDeleteEntry) return;
    const mode = sourceMode === 'host-bridge' ? 'host-bridge' : 'runtime-host';
    const base = getApiBase(mode);
    try {
      const res = await fetchForMode(mode, `${base}/fs/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getBridgeHeaders(mode) },
        body: JSON.stringify({ path: confirmDeleteEntry.path })
      });
      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.error || 'Delete failed');
      } else {
        if (selectedFile?.path === confirmDeleteEntry.path) setSelectedFile(null);
        setConfirmDeleteEntry(null);
        loadDirectory(currentPath, mode);
        loadHostMetadata();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Delete failed');
    }
  };

  const handleBinaryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !currentPath) return;
    const mode = sourceMode === 'host-bridge' ? 'host-bridge' : 'runtime-host';
    const base = getApiBase(mode);
    const sep = currentPath.includes('\\') ? '\\' : '/';
    let uploaded = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const buf = await file.arrayBuffer();
        const base64 = arrayBufferToBase64(buf);
        const targetPath = `${currentPath.replace(/[\\/]+$/, '')}${sep}${file.name}`;
        const res = await fetchForMode(mode, `${base}/fs/write-base64`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getBridgeHeaders(mode) },
          body: JSON.stringify({ path: targetPath, base64 })
        });
        const data = await res.json();
        if (data.success) uploaded++;
        else setErrorMsg(data.error || `Upload failed for ${file.name}`);
      }
      if (uploaded > 0) {
        setStatusNotice(`Uploaded ${uploaded} file${uploaded > 1 ? 's' : ''} losslessly into ${currentPath}`);
        loadDirectory(currentPath, mode);
        loadHostMetadata();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Binary upload failed');
    }
    e.target.value = '';
  };

  const handleSwitchSource = async (next: StorageSourceMode) => {
    setSourceMode(next);
    setErrorMsg('');
    setCenterView('browser');
    if (next === 'runtime-host') {
      loadDirectory(undefined, 'runtime-host');
      loadHostMetadata();
    } else if (next === 'host-bridge') {
      const info = await probePhysicalHostBridge(undefined, false);
      if (info) {
        loadDirectory(info.homedir, 'host-bridge');
        loadBridgeDownloads();
      }
    }
  };

  const activePlaces = sourceMode === 'host-bridge' && bridgeInfo ? bridgeInfo.places : places;
  const activeVolumes = sourceMode === 'host-bridge' && bridgeInfo ? bridgeInfo.volumes : volumes;

  const filteredEntries = entries.filter(
    (en) => !searchFilter.trim() || en.name.toLowerCase().includes(searchFilter.trim().toLowerCase())
  );

  const filteredDeviceEntries = deviceEntries.filter(
    (en) => !searchFilter.trim() || en.name.toLowerCase().includes(searchFilter.trim().toLowerCase())
  );

  const activeMountRoot = mountedDevices.find((m) => m.id === activeMountId) || null;
  const isWinPath = /^[A-Za-z]:\\/.test(currentPath);
  const breadcrumbs = currentPath.split(/[\\/]/).filter(Boolean);

  return (
    <div className="flex flex-col h-full min-h-0 bg-zinc-950 text-zinc-100">
      {/* Hidden webkitdirectory fallback input for universal physical folder mounting */}
      <input
        ref={webkitFolderInputRef}
        type="file"
        multiple
        // @ts-ignore non-standard webkitdirectory attribute for folder tree mount
        webkitdirectory=""
        directory=""
        onChange={handleWebkitFolderSelected}
        className="hidden"
      />

      {/* Top OS Explorer & Storage Source Switcher Bar */}
      <div className="px-3 sm:px-4 py-2.5 bg-zinc-900/95 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <Folder className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs sm:text-sm font-bold text-zinc-100 whitespace-nowrap">
            Sovereign Files
          </span>

          {/* 3-Layer Full Host System Switcher */}
          <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => handleSwitchSource('runtime-host')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-semibold cursor-pointer transition-colors ${
                sourceMode === 'runtime-host'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>Host System (/)</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchSource('physical-device')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-semibold cursor-pointer transition-colors ${
                sourceMode === 'physical-device'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>My Device ({mountedDevices.length})</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchSource('host-bridge')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-semibold cursor-pointer transition-colors ${
                sourceMode === 'host-bridge'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Physical Host Bridge</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  bridgeConnected ? 'bg-emerald-400' : 'bg-zinc-600'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={handleMountLocalDeviceFolder}
            className="px-2.5 py-1 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-xs text-sky-200 font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
            title="Mount any folder or drive (Downloads, Desktop, C:\, /Users) directly from your computer"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Mount Local Folder</span>
          </button>

          {sourceMode !== 'physical-device' && (
            <>
              <button
                type="button"
                onClick={() => parentPath && loadDirectory(parentPath)}
                disabled={!parentPath || loading}
                className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-xs text-zinc-200 flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <ArrowUp className="w-3.5 h-3.5" />
                <span>Up</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  loadDirectory(currentPath);
                  loadHostMetadata();
                }}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
                title="Refresh directory"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewItemName('');
                  setCreateModalType('file');
                }}
                className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5 text-sky-400" />
                <span>File</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewItemName('');
                  setCreateModalType('folder');
                }}
                className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
                <span>Folder</span>
              </button>
              <label className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 flex items-center gap-1 cursor-pointer whitespace-nowrap">
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>Upload</span>
                <input type="file" multiple onChange={handleBinaryUpload} className="hidden" />
              </label>
            </>
          )}

          {onSelectModule && (
            <button
              type="button"
              onClick={() => onSelectModule('terminal')}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Shell</span>
            </button>
          )}
        </div>
      </div>

      {/* Address Bar + Direct Path Jump + Filter / Recursive Search Bar */}
      {sourceMode !== 'physical-device' && (
        <div className="px-3 sm:px-4 py-2 bg-zinc-950 border-b border-zinc-800/80 flex flex-col lg:flex-row lg:items-center gap-2 shrink-0">
          {/* Interactive Direct Path Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (pathInput.trim()) loadDirectory(pathInput.trim());
            }}
            className="flex items-center gap-1.5 flex-1 min-w-0"
          >
            <button
              type="button"
              onClick={() => loadDirectory(isWinPath ? 'C:\\' : '/')}
              className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-amber-400 text-xs font-mono cursor-pointer shrink-0"
              title="Jump to filesystem root"
            >
              {isWinPath ? 'C:\\' : '/'}
            </button>
            <input
              type="text"
              value={pathInput}
              onChange={(e) => setPathInput(e.target.value)}
              placeholder="Enter any host path (e.g. /, /etc, ~/Downloads, /app/applet/downloads, C:\Users)..."
              className="flex-1 min-w-0 bg-zinc-900 border border-zinc-800 focus:border-amber-500 rounded-lg px-2.5 py-1 text-xs font-mono text-zinc-200 focus:outline-none"
            />
            <button
              type="submit"
              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 font-semibold cursor-pointer shrink-0"
            >
              Go
            </button>
          </form>

          {/* Breadcrumb quick chips on wider screens */}
          <div className="hidden xl:flex items-center gap-0.5 max-w-[280px] overflow-x-auto scrollbar-none text-[11px] font-mono">
            {breadcrumbs.slice(-3).map((seg, idx, arr) => {
              const fullIdx = breadcrumbs.length - arr.length + idx;
              const target = isWinPath
                ? breadcrumbs.slice(0, fullIdx + 1).join('\\') + (fullIdx === 0 ? '\\' : '')
                : '/' + breadcrumbs.slice(0, fullIdx + 1).join('/');
              return (
                <React.Fragment key={target}>
                  <ChevronRight className="w-3 h-3 text-zinc-600 shrink-0" />
                  <button
                    type="button"
                    onClick={() => loadDirectory(target)}
                    className="px-1.5 py-0.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white truncate max-w-[90px] cursor-pointer shrink-0"
                  >
                    {seg}
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          {/* Filter & Global Host Search */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="relative w-40 sm:w-44">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter folder..."
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 rounded-lg pl-8 pr-2 py-1 text-xs text-zinc-200 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setGlobalSearchRoot(currentPath || '/');
                setCenterView(centerView === 'search' ? 'browser' : 'search');
              }}
              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer whitespace-nowrap ${
                centerView === 'search'
                  ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              Deep Search
            </button>
          </div>
        </div>
      )}

      {/* Alerts / Notices */}
      {errorMsg && (
        <div className="mx-3 mt-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center justify-between gap-2 shrink-0">
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg('')} className="p-0.5 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {statusNotice && (
        <div className="mx-3 mt-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between gap-2 shrink-0">
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>{statusNotice}</span>
          </span>
          <button type="button" onClick={() => setStatusNotice('')} className="p-0.5 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Split Body */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Navigation Rail: Places, All Downloads, Mounted Host Volumes & Device Mounts */}
        <div className="lg:w-56 bg-zinc-900/45 border-b lg:border-b-0 lg:border-r border-zinc-800 p-2 flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-y-auto shrink-0">
          {/* Special Views */}
          <div className="flex lg:flex-col gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                setCenterView('downloads');
                if (sourceMode === 'host-bridge' && bridgeConnected) loadBridgeDownloads();
                else loadHostMetadata();
              }}
              className={`px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between gap-2 whitespace-nowrap cursor-pointer ${
                centerView === 'downloads'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                  : 'bg-zinc-900/70 hover:bg-zinc-800 text-zinc-200'
              }`}
            >
              <span className="flex items-center gap-2">
                <Download className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>All Downloads</span>
              </span>
              <span className="text-[10px] font-mono text-zinc-400">{allDownloads.length}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCenterView('system-info');
                loadHostMetadata();
              }}
              className={`px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                centerView === 'system-info'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                  : 'bg-zinc-900/70 hover:bg-zinc-800 text-zinc-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Entire Host System</span>
            </button>
          </div>

          {/* Host Places */}
          {sourceMode !== 'physical-device' && (
            <>
              <div className="hidden lg:block pt-2 px-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                OS & Host Places
              </div>
              <div className="flex lg:flex-col gap-1 shrink-0">
                {activePlaces
                  .filter((p) => p.exists)
                  .map((loc) => (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => loadDirectory(loc.path)}
                      className={`px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0 ${
                        centerView === 'browser' && currentPath === loc.path
                          ? 'bg-zinc-800 text-white border border-zinc-700 font-semibold'
                          : 'bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300 hover:text-white'
                      }`}
                      title={loc.path}
                    >
                      <Folder
                        className={`w-3.5 h-3.5 shrink-0 ${
                          loc.category === 'os'
                            ? 'text-emerald-400'
                            : loc.category === 'user'
                            ? 'text-sky-400'
                            : 'text-amber-400'
                        }`}
                      />
                      <span className="truncate">{loc.label}</span>
                    </button>
                  ))}
              </div>

              {/* Mounted Host Storage Volumes (df / Logical Disks) */}
              {activeVolumes.length > 0 && (
                <>
                  <div className="hidden lg:block pt-2 px-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                    Host Drives & Mounts ({activeVolumes.length})
                  </div>
                  <div className="hidden lg:flex flex-col gap-1">
                    {activeVolumes.slice(0, 12).map((vol) => (
                      <button
                        key={`${vol.device}-${vol.mountPoint}`}
                        type="button"
                        onClick={() => loadDirectory(vol.mountPoint)}
                        className="p-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800/80 text-left cursor-pointer space-y-1"
                        title={`${vol.device} (${vol.fsType}) mounted at ${vol.mountPoint}`}
                      >
                        <div className="flex items-center justify-between gap-1 text-[11px] font-mono">
                          <span className="text-zinc-200 font-semibold truncate">{vol.mountPoint}</span>
                          <span className="text-zinc-500 shrink-0">{vol.usedPct}%</span>
                        </div>
                        <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${vol.usedPct > 85 ? 'bg-rose-400' : 'bg-amber-400'}`}
                            style={{ width: `${Math.min(100, vol.usedPct)}%` }}
                          />
                        </div>
                        <div className="text-[10px] font-mono text-zinc-500 truncate">
                          {vol.fsType} · {formatBytes(vol.freeBytes)} free
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* Mounted Physical Device Roots */}
          {sourceMode === 'physical-device' && (
            <div className="flex lg:flex-col gap-1.5 shrink-0">
              <div className="hidden lg:block pt-1 px-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                Mounted Local Folders
              </div>
              {mountedDevices.length === 0 ? (
                <div className="p-2 text-[11px] text-zinc-500">
                  No local folders mounted yet. Click &ldquo;Mount Local Folder&rdquo; to access your PC/Mac/Android Downloads or drives.
                </div>
              ) : (
                mountedDevices.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => selectMountedDevice(m)}
                    className={`px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between gap-2 cursor-pointer ${
                      activeMountId === m.id
                        ? 'bg-sky-500/20 text-sky-200 border border-sky-500/40 font-semibold'
                        : 'bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <HardDrive className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span className="truncate">{m.label}</span>
                    </span>
                    <span className="text-[9px] font-mono text-zinc-400">
                      {m.mode === 'fsa-handle' ? 'RW' : `${m.fileCount}`}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Active Disk Capacity Card */}
          {disk && disk.totalBytes > 0 && sourceMode !== 'physical-device' && (
            <div className="hidden lg:block mt-auto p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-[10px] font-mono text-zinc-400 space-y-1.5">
              <div className="flex items-center justify-between">
                <span>Active Volume</span>
                <span className="text-zinc-200 font-bold tabular-nums">{disk.usedPct}%</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400" style={{ width: `${Math.min(100, disk.usedPct)}%` }} />
              </div>
              <div className="text-zinc-500 truncate">
                {formatBytes(disk.freeBytes)} free / {formatBytes(disk.totalBytes)}
              </div>
            </div>
          )}
        </div>

        {/* Center Content Pane */}
        <div
          className={`flex-1 min-w-0 min-h-0 overflow-y-auto ${
            selectedFile ? 'lg:max-w-[50%] lg:border-r lg:border-zinc-800' : ''
          }`}
        >
          {/* PANEL 1: PHYSICAL HOST BRIDGE CONNECTION / INSTALL PANEL (When not connected yet) */}
          {sourceMode === 'host-bridge' && !bridgeConnected && (
            <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4">
              <div className="p-4 rounded-2xl bg-zinc-900/90 border border-amber-500/30 space-y-3">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <Link2 className="w-4 h-4" />
                  <span>Connect Entire Physical Host Machine (Windows · macOS · Linux · Android Termux)</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Give Lysander Sovereign OS unrestricted access to <strong>all drives (C:\, D:\, /), Downloads, Desktop, Documents, system processes, and native shell</strong> on the physical computer hosting your browser by running our zero-dependency local Host Bridge daemon on <code className="text-amber-300">127.0.0.1:4747</code>.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <a
                    href="/api/os/host-bridge/download?format=windows"
                    className="px-3 py-2 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-xs font-bold text-sky-200 flex items-center justify-between"
                  >
                    <span>Windows 1-Click Bridge (.bat)</span>
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href="/api/os/host-bridge/download?format=macos"
                    className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-bold text-zinc-100 flex items-center justify-between"
                  >
                    <span>macOS 1-Click Bridge (.command)</span>
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href="/api/os/host-bridge/download?format=linux"
                    className="px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-xs font-bold text-emerald-200 flex items-center justify-between"
                  >
                    <span>Linux / Termux Bridge (.sh)</span>
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href="/api/os/host-bridge/download?format=mjs"
                    className="px-3 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-xs font-bold text-amber-200 flex items-center justify-between"
                  >
                    <span>Raw Node Daemon (.mjs)</span>
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-zinc-300">
                  Run locally: <span className="text-emerald-400">node lysander-host-bridge.mjs</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <input
                    type="text"
                    value={bridgeUrl}
                    onChange={(e) => setBridgeUrl(e.target.value)}
                    placeholder="http://127.0.0.1:4747"
                    className="sm:col-span-2 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-100"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const info = await probePhysicalHostBridge(bridgeUrl, false);
                      if (info) loadDirectory(info.homedir, 'host-bridge');
                      else setErrorMsg(`Could not reach Host Bridge at ${bridgeUrl}. Launch lysander-host-bridge.mjs on your machine first.`);
                    }}
                    disabled={probingBridge}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white cursor-pointer disabled:opacity-50"
                  >
                    {probingBridge ? 'Connecting...' : 'Connect Bridge'}
                  </button>
                </div>

                <input
                  type="password"
                  value={bridgeToken}
                  onChange={(e) => setBridgeToken(e.target.value)}
                  placeholder="Optional LYSANDER_BRIDGE_TOKEN (leave blank if unset)"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-300"
                />

                <div className="pt-2 border-t border-zinc-800 flex items-center justify-between gap-2 text-xs text-zinc-400">
                  <span>Want zero-install instant folder access right inside the browser?</span>
                  <button
                    type="button"
                    onClick={handleMountLocalDeviceFolder}
                    className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer shrink-0"
                  >
                    Mount Local Folder Now
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PANEL 2: PHYSICAL DEVICE DIRECT MOUNT FILE EXPLORER */}
          {sourceMode === 'physical-device' && centerView === 'browser' && (
            <div className="flex flex-col h-full">
              {!activeMountRoot ? (
                <div className="p-8 text-center space-y-4 max-w-md mx-auto my-auto">
                  <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center mx-auto">
                    <Laptop className="w-6 h-6 text-sky-400" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-100">Mount Your Physical Device Files & Downloads</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Select your computer&rsquo;s <strong>Downloads</strong>, <strong>Desktop</strong>, <strong>Documents</strong>, or any drive folder to inspect, edit, and transfer files directly between your physical machine and Lysander Sovereign OS.
                  </p>
                  <button
                    type="button"
                    onClick={handleMountLocalDeviceFolder}
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white cursor-pointer"
                  >
                    Select Physical Folder / Drive
                  </button>
                </div>
              ) : (
                <>
                  <div className="px-3 py-2 bg-zinc-900/70 border-b border-zinc-800 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0 font-mono">
                      <button
                        type="button"
                        onClick={navigateUpMountedDevice}
                        disabled={!activeDeviceSubPath}
                        className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 cursor-pointer"
                      >
                        Up
                      </button>
                      <span className="text-sky-300 truncate">
                        {activeMountRoot.label}/{activeDeviceSubPath}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 shrink-0">
                      {activeMountRoot.mode === 'fsa-handle' ? 'DIRECT DISK RW' : 'LOCAL TREE MOUNT'}
                    </span>
                  </div>
                  <div className="divide-y divide-zinc-900 text-xs">
                    {filteredDeviceEntries.map((item) => (
                      <div
                        key={item.relativePath}
                        className="px-3 py-2 flex items-center justify-between gap-2 hover:bg-zinc-900/80"
                      >
                        <button
                          type="button"
                          onClick={() => openMountedDeviceEntry(item)}
                          className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer"
                        >
                          {item.isDir ? (
                            <Folder className="w-4 h-4 text-sky-400 shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-zinc-300 shrink-0" />
                          )}
                          <span className="truncate font-medium text-zinc-200">{item.name}</span>
                        </button>
                        <div className="flex items-center gap-2 shrink-0 font-mono text-[10px] text-zinc-500">
                          <span>{item.isDir ? '<DIR>' : formatBytes(item.sizeBytes)}</span>
                          {!item.isDir && (
                            <button
                              type="button"
                              onClick={async () => {
                                const f = item.fileObj || (item.fileHandle ? await item.fileHandle.getFile() : null);
                                if (f) handleSyncPhysicalFileToOsDownloads(f);
                              }}
                              className="px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 cursor-pointer flex items-center gap-1"
                              title="Copy file directly into Sovereign OS Downloads"
                            >
                              <ArrowRightLeft className="w-3 h-3" />
                              <span>Copy to OS</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* PANEL 3: ALL DOWNLOADS AGGREGATOR (OS Downloads + Host Downloads + Installed Apps) */}
          {centerView === 'downloads' && (
            <div className="p-3 sm:p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">Unified OS & Host Downloads Center</h3>
                  <p className="text-[11px] text-zinc-400">
                    All downloaded installers, packages, binaries, and files across Lysander OS and the hosting system.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => (sourceMode === 'host-bridge' && bridgeConnected ? loadBridgeDownloads() : loadHostMetadata())}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Rescan</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {downloadRoots.map((rt) => (
                  <button
                    key={rt.id}
                    type="button"
                    onClick={() => rt.exists && loadDirectory(rt.path)}
                    className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 text-left cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-zinc-200">
                      <span>{rt.label}</span>
                      <span className="font-mono text-amber-400">{rt.count}</span>
                    </div>
                    <div className="text-[10px] font-mono text-zinc-500 truncate mt-1">{rt.path}</div>
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-zinc-800 divide-y divide-zinc-900 text-xs bg-zinc-950">
                {allDownloads.length === 0 ? (
                  <div className="p-6 text-center text-zinc-500">
                    No files in Downloads yet. Download any app or upload files to see them here.
                  </div>
                ) : (
                  allDownloads.map((item) => (
                    <div
                      key={item.path}
                      className="px-3 py-2 flex items-center justify-between gap-2 hover:bg-zinc-900/80"
                    >
                      <button
                        type="button"
                        onClick={() => openFile(item)}
                        className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer"
                      >
                        {item.type === 'dir' ? (
                          <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="truncate font-medium text-zinc-200">{item.name}</div>
                          <div className="text-[10px] font-mono text-zinc-500 truncate">{item.path}</div>
                        </div>
                      </button>
                      <div className="flex items-center gap-2 shrink-0 font-mono text-[10px]">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-amber-300">
                          {item.sourceLabel}
                        </span>
                        <span className="text-zinc-400 w-16 text-right">
                          {item.type === 'dir' ? '<DIR>' : formatBytes(item.sizeBytes)}
                        </span>
                        {item.type !== 'dir' && (
                          <a
                            href={`${getApiBase()}/fs/download?path=${encodeURIComponent(item.path)}`}
                            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-sky-300"
                            title="Download file"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* PANEL 4: RECURSIVE DEEP HOST SEARCH */}
          {centerView === 'search' && (
            <div className="p-3 sm:p-4 space-y-3">
              <form onSubmit={handleRunGlobalSearch} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <input
                  type="text"
                  value={globalSearchRoot}
                  onChange={(e) => setGlobalSearchRoot(e.target.value)}
                  placeholder="Root path (e.g. /, ~, /etc)"
                  className="sm:col-span-4 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-zinc-200"
                />
                <input
                  type="text"
                  value={globalSearchQuery}
                  onChange={(e) => setGlobalSearchQuery(e.target.value)}
                  placeholder="Search filename across entire host system (e.g. .conf, steam, .json, .env)..."
                  autoFocus
                  className="sm:col-span-6 bg-zinc-900 border border-zinc-800 focus:border-sky-500 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={searchingGlobal}
                  className="sm:col-span-2 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white cursor-pointer disabled:opacity-50"
                >
                  {searchingGlobal ? 'Scanning...' : 'Search'}
                </button>
              </form>

              {globalSearchMeta && (
                <div className="text-[11px] font-mono text-sky-300">{globalSearchMeta}</div>
              )}

              <div className="rounded-xl border border-zinc-800 divide-y divide-zinc-900 text-xs">
                {globalSearchResults.map((en) => (
                  <div
                    key={en.path}
                    className="px-3 py-2 flex items-center justify-between gap-2 hover:bg-zinc-900/80"
                  >
                    <button
                      type="button"
                      onClick={() => openFile(en)}
                      className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer"
                    >
                      {en.type === 'dir' ? (
                        <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="truncate font-medium text-zinc-200">{en.name}</div>
                        <div className="text-[10px] font-mono text-zinc-500 truncate">{en.path}</div>
                      </div>
                    </button>
                    <span className="font-mono text-[10px] text-zinc-500 shrink-0">
                      {en.type === 'dir' ? '<DIR>' : formatBytes(en.sizeBytes)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PANEL 5: ENTIRE HOST SYSTEM INSPECTOR */}
          {centerView === 'system-info' && hostSystemProfile && (
            <div className="p-3 sm:p-4 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-zinc-100">Entire Host System Telemetry & Access</h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  UID {hostSystemProfile.runtime?.authority?.uid ?? 0} · RING -3 HYPERVISOR
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono text-[11px]">
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                  <div className="text-zinc-400">Host OS & Kernel</div>
                  <div className="text-zinc-100 font-bold break-all">{hostSystemProfile.runtime?.uname}</div>
                  <div className="text-zinc-400">
                    Hostname: {hostSystemProfile.runtime?.hostname} · User: {hostSystemProfile.runtime?.hostUser?.username}
                  </div>
                  <div className="text-zinc-400">Home: {hostSystemProfile.runtime?.homedir}</div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                  <div className="text-zinc-400">Compute & Memory</div>
                  <div className="text-zinc-100 font-bold">
                    {hostSystemProfile.runtime?.cpu?.cores} Cores · {hostSystemProfile.runtime?.cpu?.model}
                  </div>
                  <div className="text-zinc-400">
                    RAM: {formatBytes(hostSystemProfile.runtime?.memory?.usedBytes)} /{' '}
                    {formatBytes(hostSystemProfile.runtime?.memory?.totalBytes)} ({hostSystemProfile.runtime?.memory?.usedPct}%)
                  </div>
                  <div className="text-zinc-400">Node {hostSystemProfile.runtime?.nodeVersion} · PID {hostSystemProfile.runtime?.pid}</div>
                </div>
              </div>

              {/* Mounted Volumes Table */}
              <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
                <div className="px-3 py-2 border-b border-zinc-800 font-bold text-zinc-200">
                  Mounted Host Filesystems & Drives ({volumes.length})
                </div>
                <div className="divide-y divide-zinc-800/70 font-mono text-[11px]">
                  {volumes.map((v) => (
                    <div
                      key={`${v.device}-${v.mountPoint}`}
                      onClick={() => loadDirectory(v.mountPoint)}
                      className="px-3 py-2 flex items-center justify-between gap-2 hover:bg-zinc-800/60 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <span className="text-amber-300 font-bold">{v.mountPoint}</span>
                        <span className="text-zinc-500 ml-2">({v.device} · {v.fsType})</span>
                      </div>
                      <span className="text-zinc-300 shrink-0">
                        {formatBytes(v.usedBytes)} / {formatBytes(v.totalBytes)} ({v.usedPct}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Block Devices / Mount Table */}
              {hostSystemProfile.blockDevices && (
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 space-y-1.5">
                  <div className="font-bold text-zinc-200">Block Devices & Mount Table</div>
                  <pre className="text-[10px] font-mono text-zinc-300 whitespace-pre-wrap overflow-x-auto">
                    {hostSystemProfile.blockDevices}
                  </pre>
                </div>
              )}

              {/* Host Environment Variables */}
              {hostSystemProfile.environment && (
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 space-y-1.5">
                  <div className="font-bold text-zinc-200">
                    Host Environment Variables ({hostSystemProfile.environmentCount})
                  </div>
                  <div className="max-h-56 overflow-y-auto font-mono text-[10px] divide-y divide-zinc-800/60">
                    {Object.entries(hostSystemProfile.environment).map(([k, v]) => (
                      <div key={k} className="py-1 flex gap-2">
                        <span className="text-sky-300 shrink-0">{k}=</span>
                        <span className="text-zinc-400 break-all">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PANEL 6: STANDARD DIRECTORY LISTING (Runtime Host OR Physical Host Bridge) */}
          {centerView === 'browser' &&
            (sourceMode === 'runtime-host' || (sourceMode === 'host-bridge' && bridgeConnected)) && (
              <div className="divide-y divide-zinc-900 text-xs">
                {sourceMode === 'host-bridge' && bridgeInfo && (
                  <div className="px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-[11px] font-mono text-amber-200">
                    <span>
                      PHYSICAL HOST BRIDGE · {bridgeInfo.hostname} ({bridgeInfo.type} {bridgeInfo.arch})
                    </span>
                    <span>{bridgeInfo.username}</span>
                  </div>
                )}

                {filteredEntries.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500">
                    {loading ? 'Reading host directory...' : 'Directory is empty or no matches.'}
                  </div>
                ) : (
                  filteredEntries.map((en) => (
                    <div
                      key={en.path}
                      className={`px-3 py-2 flex items-center justify-between gap-2 hover:bg-zinc-900/80 transition-colors ${
                        selectedFile?.path === en.path ? 'bg-zinc-900 border-l-2 border-amber-400' : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => openFile(en)}
                        className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer"
                      >
                        {en.type === 'dir' ? (
                          <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                        )}
                        <span className="truncate font-medium text-zinc-200">{en.name}</span>
                      </button>

                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 font-mono text-[10px] text-zinc-500 tabular-nums">
                        <span className="hidden sm:inline">{en.permissions}</span>
                        <span className="w-16 text-right">{en.type === 'dir' ? '<DIR>' : formatBytes(en.sizeBytes)}</span>
                        {en.type !== 'dir' && (
                          <a
                            href={`${getApiBase()}/fs/download?path=${encodeURIComponent(en.path)}`}
                            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-sky-300"
                            title="Download file"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setRenameTarget(en);
                            setRenameDraft(en.name);
                          }}
                          className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-amber-300 cursor-pointer"
                          title="Rename"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {sourceMode === 'runtime-host' && (
                          <button
                            type="button"
                            onClick={() => handleDuplicateEntry(en)}
                            className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-emerald-300 cursor-pointer"
                            title="Duplicate / Copy"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteEntry(en)}
                          className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-rose-400 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
        </div>

        {/* Right File Viewer / Live Editor */}
        {selectedFile && (
          <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-zinc-950 border-t lg:border-t-0 border-zinc-800">
            <div className="px-3 py-2 bg-zinc-900/90 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="min-w-0">
                <div className="text-xs font-bold text-zinc-100 truncate">{selectedFile.name}</div>
                <div className="text-[10px] font-mono text-zinc-400 truncate">
                  {formatBytes(selectedFile.sizeBytes)} · mode {selectedFile.permissions} · sha256 {selectedFile.sha256.slice(0, 12)}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                {selectedFile.originSource === 'physical-device' && selectedFile.localFileObj && (
                  <button
                    type="button"
                    onClick={() => handleSyncPhysicalFileToOsDownloads(selectedFile.localFileObj!)}
                    disabled={saving}
                    className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Copy to OS</span>
                  </button>
                )}
                {!selectedFile.isBinary &&
                  (selectedFile.originSource !== 'physical-device' || Boolean(selectedFile.localFileHandle)) && (
                    <button
                      type="button"
                      onClick={handleSaveFile}
                      disabled={saving}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{saving ? 'Saving...' : 'Save'}</span>
                    </button>
                  )}
                {onInjectToChat && !selectedFile.isBinary && (
                  <button
                    type="button"
                    onClick={() => {
                      onInjectToChat(
                        `[Host File · ${selectedFile.path}]\n\`\`\`\n${editorText.slice(0, 4000)}\n\`\`\``,
                        false
                      );
                      if (onSelectModule) onSelectModule('chat');
                    }}
                    className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-xs font-semibold cursor-pointer"
                  >
                    Send to Chat
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  aria-label="Close File Inspector"
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {saveNotice && (
              <div className="px-3 py-1 bg-emerald-500/10 border-b border-emerald-500/30 text-[11px] font-mono text-emerald-300 flex items-center gap-1.5 shrink-0">
                <Check className="w-3.5 h-3.5" />
                <span>{saveNotice}</span>
              </div>
            )}

            <textarea
              value={editorText}
              readOnly={
                selectedFile.isBinary ||
                (selectedFile.originSource === 'physical-device' && !selectedFile.localFileHandle)
              }
              onChange={(e) => setEditorText(e.target.value)}
              spellCheck={false}
              className="flex-1 w-full p-3 bg-zinc-950 text-zinc-200 font-mono text-xs leading-relaxed resize-none focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Create File / Folder Modal */}
      {createModalType && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setCreateModalType(null);
          }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3"
        >
          <form onSubmit={handleCreateSubmit} className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-sm w-full p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-100">
                {createModalType === 'folder' ? 'Create Directory' : 'Create File'}
              </h3>
              <button type="button" onClick={() => setCreateModalType(null)} className="p-1 rounded bg-zinc-800 text-zinc-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder={createModalType === 'folder' ? 'new-folder' : 'notes.txt'}
              autoFocus
              required
              className="w-full bg-zinc-950 border border-zinc-700 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCreateModalType(null)} className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-300 cursor-pointer">
                Cancel
              </button>
              <button type="submit" className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white cursor-pointer">
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rename Modal */}
      {renameTarget && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setRenameTarget(null);
          }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3"
        >
          <form onSubmit={handleRenameSubmit} className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-sm w-full p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-100">Rename Item</h3>
              <button type="button" onClick={() => setRenameTarget(null)} className="p-1 rounded bg-zinc-800 text-zinc-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value)}
              autoFocus
              required
              className="w-full bg-zinc-950 border border-zinc-700 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setRenameTarget(null)} className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-300 cursor-pointer">
                Cancel
              </button>
              <button type="submit" className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white cursor-pointer">
                Rename
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDeleteEntry && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmDeleteEntry(null);
          }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3"
        >
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-sm w-full p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-rose-300">Confirm Deletion</h3>
              <button type="button" onClick={() => setConfirmDeleteEntry(null)} className="p-1 rounded bg-zinc-800 text-zinc-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-300 break-all">
              Delete <strong>{confirmDeleteEntry.path}</strong> from the host filesystem?
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmDeleteEntry(null)} className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-300 cursor-pointer">
                Cancel
              </button>
              <button type="button" onClick={handleDeleteConfirm} className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white cursor-pointer">
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
