import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Download,
  Upload,
  Package,
  RefreshCw,
  Search,
  FileCode2,
  FolderArchive,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowUpRight,
  HardDrive,
  History,
  Copy,
  Check,
  Globe,
  FileJson,
  FileText,
  Layers,
  ShieldCheck,
  Code2,
  X
} from 'lucide-react';
import type { ModuleType } from '../types';
import {
  loadOSCustomizationProfile,
  importOSCustomizationProfile
} from '../utils/osCustomizationStore';
import { apiFetch } from '../utils/authClient';

interface TransferHubModuleProps {
  onNavigateModule?: (moduleId: ModuleType) => void;
}

interface UnifiedDownloadItem {
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

interface ModuleFileRecord {
  relativePath: string;
  role: 'ui' | 'server' | 'engine' | 'config';
  exists: boolean;
  sizeBytes: number;
  lineCount: number;
  sha256: string;
  modifiedAt: string;
}

interface OrchestratorModuleSpec {
  id: string;
  name: string;
  category: string;
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

interface ModuleInspectFileResult {
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

interface ModuleInspectResult {
  moduleId: string;
  moduleName: string;
  allAllowed: boolean;
  allSyntaxValid: boolean;
  hasAnyChange: boolean;
  files: ModuleInspectFileResult[];
}

interface ModuleBackupRecord {
  backupId: string;
  moduleId: string;
  moduleName: string;
  createdAt: string;
  reason: string;
  files: Array<{ relativePath: string; sizeBytes: number; sha256: string }>;
}

interface TransferHistoryEntry {
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

interface OsDownloadFile {
  name: string;
  path: string;
  size: number;
  modifiedAt?: string;
  rootLabel?: string;
}

interface GrantApplicationSummary {
  id: string;
  grantTitle: string;
  funder: string;
  awardAmount?: string;
  createdAt?: string;
  fullMarkdown?: string;
}

type HubTab = 'downloads' | 'module-lab' | 'uploader' | 'vault';
type UploadDestination = 'auto-module' | 'os-downloads' | 'os-desktop' | 'os-profile';

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let idx = 0;
  let val = bytes;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx++;
  }
  return `${val >= 100 || idx === 0 ? val.toFixed(0) : val.toFixed(1)} ${units[idx]}`;
}

function formatDateShort(iso?: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return iso;
  }
}

function extractFilenameFromHeader(disposition: string | null, fallback: string): string {
  if (!disposition) return fallback;
  const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
  if (match && match[1]) {
    try {
      return decodeURIComponent(match[1].trim());
    } catch {
      return match[1].trim();
    }
  }
  return fallback;
}

export const TransferHubModule: React.FC<TransferHubModuleProps> = ({ onNavigateModule }) => {
  const [activeTab, setActiveTab] = useState<HubTab>('module-lab');
  const [loading, setLoading] = useState<boolean>(true);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  // Unified Downloads Catalog
  const [catalog, setCatalog] = useState<UnifiedDownloadItem[]>([]);
  const [grantPackets, setGrantPackets] = useState<GrantApplicationSummary[]>([]);
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [catalogCategory, setCatalogCategory] = useState<string>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Direct URL downloader
  const [remoteUrl, setRemoteUrl] = useState<string>('');
  const [remoteFilename, setRemoteFilename] = useState<string>('');
  const [fetchingRemote, setFetchingRemote] = useState<boolean>(false);

  // Orchestrator Module Lab
  const [modules, setModules] = useState<OrchestratorModuleSpec[]>([]);
  const [moduleSearch, setModuleSearch] = useState<string>('');
  const [moduleCategory, setModuleCategory] = useState<string>('All');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('chat');
  const [moduleDropActive, setModuleDropActive] = useState<boolean>(false);

  // Inline source viewer/editor for testing & direct editing
  const [sourceEditorOpen, setSourceEditorOpen] = useState<boolean>(false);
  const [loadingSource, setLoadingSource] = useState<boolean>(false);
  const [sourceFiles, setSourceFiles] = useState<Array<{ relativePath: string; role: string; content: string }>>([]);
  const [activeSourceFilePath, setActiveSourceFilePath] = useState<string>('');

  // Staged module upload & diff inspection
  const [stagedFiles, setStagedFiles] = useState<Array<{ relativePath: string; content: string }>>([]);
  const [inspection, setInspection] = useState<ModuleInspectResult | null>(null);
  const [inspecting, setInspecting] = useState<boolean>(false);
  const [replacing, setReplacing] = useState<boolean>(false);
  const [replaceReason, setReplaceReason] = useState<string>('Tested edited module build');
  const [targetFileForSingleUpload, setTargetFileForSingleUpload] = useState<string>('');

  // Universal Uploader
  const [uploadDest, setUploadDest] = useState<UploadDestination>('auto-module');
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [places, setPlaces] = useState<Array<{ id: string; label: string; path: string }>>([]);

  // Vault: OS Downloads files, Backups, History
  const [osDownloadFiles, setOsDownloadFiles] = useState<OsDownloadFile[]>([]);
  const [backups, setBackups] = useState<ModuleBackupRecord[]>([]);
  const [history, setHistory] = useState<TransferHistoryEntry[]>([]);
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);

  const moduleFileInputRef = useRef<HTMLInputElement>(null);
  const universalFileInputRef = useRef<HTMLInputElement>(null);

  const flash = useCallback((kind: 'success' | 'error' | 'info', text: string) => {
    setNotice({ kind, text });
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, modRes, bkpRes, histRes, dlRes, volRes, grantsRes] = await Promise.allSettled([
        apiFetch('/api/transfer/catalog').then((r) => r.json()),
        apiFetch('/api/transfer/modules').then((r) => r.json()),
        apiFetch('/api/transfer/backups').then((r) => r.json()),
        apiFetch('/api/transfer/history?limit=100').then((r) => r.json()),
        apiFetch('/api/os/fs/downloads').then((r) => r.json()),
        apiFetch('/api/os/fs/volumes').then((r) => r.json()),
        apiFetch('/api/grants/state').then((r) => r.json())
      ]);

      if (catRes.status === 'fulfilled' && Array.isArray(catRes.value?.items)) {
        setCatalog(catRes.value.items);
      }
      if (modRes.status === 'fulfilled' && Array.isArray(modRes.value?.modules)) {
        setModules(modRes.value.modules);
      }
      if (bkpRes.status === 'fulfilled' && Array.isArray(bkpRes.value?.backups)) {
        setBackups(bkpRes.value.backups);
      }
      if (histRes.status === 'fulfilled' && Array.isArray(histRes.value?.history)) {
        setHistory(histRes.value.history);
      }
      if (dlRes.status === 'fulfilled' && Array.isArray(dlRes.value?.downloads)) {
        setOsDownloadFiles(dlRes.value.downloads);
      }
      if (volRes.status === 'fulfilled' && Array.isArray(volRes.value?.places)) {
        setPlaces(volRes.value.places);
      }
      if (grantsRes.status === 'fulfilled' && Array.isArray(grantsRes.value?.state?.applications)) {
        setGrantPackets(grantsRes.value.state.applications);
      }
    } catch (err: any) {
      flash('error', err?.message || 'Failed to refresh transfer hub state');
    } finally {
      setLoading(false);
    }
  }, [flash]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const selectedModule = useMemo(
    () => modules.find((m) => m.id === selectedModuleId) || modules[0] || null,
    [modules, selectedModuleId]
  );

  const totalIndexedFiles = useMemo(
    () => modules.reduce((acc, m) => acc + m.files.filter((f) => f.exists).length, 0),
    [modules]
  );

  useEffect(() => {
    if (selectedModule && selectedModule.files.length > 0) {
      setTargetFileForSingleUpload(selectedModule.files[0].relativePath);
    }
    setStagedFiles([]);
    setInspection(null);
    setSourceEditorOpen(false);
    setSourceFiles([]);
    setActiveSourceFilePath('');
  }, [selectedModuleId, selectedModule?.files.length]);

  const logHistoryEvent = async (payload: {
    direction: 'download' | 'upload' | 'replace' | 'rollback';
    category: 'module' | 'os-download' | 'file-upload' | 'profile';
    targetId: string;
    label: string;
    detail: string;
    sizeBytes?: number;
  }) => {
    try {
      await apiFetch('/api/transfer/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch {
      // non-fatal
    }
  };

  /**
   * Reliable Blob-based file download that works cleanly inside sandboxed preview iframes
   * (prevents iframe navigation interception or proxy .html suffixing).
   */
  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
  };

  const downloadViaFetchBlob = async (
    url: string,
    fallbackFilename: string,
    busyKey: string,
    mimeOverride?: string
  ): Promise<{ filename: string; sizeBytes: number }> => {
    setDownloadingKey(busyKey);
    try {
      const res = await (url.startsWith('/api/') ? apiFetch(url) : fetch(url));
      if (!res.ok) {
        let errText = `Server returned HTTP ${res.status}`;
        try {
          const maybeJson = await res.json();
          if (maybeJson?.error) errText = maybeJson.error;
        } catch {
          try {
            const raw = await res.text();
            if (raw && raw.length < 240) errText = raw;
          } catch {}
        }
        throw new Error(errText);
      }
      const rawBlob = await res.blob();
      const finalBlob = mimeOverride ? new Blob([rawBlob], { type: mimeOverride }) : rawBlob;
      const filename = extractFilenameFromHeader(res.headers.get('Content-Disposition'), fallbackFilename);
      triggerBlobDownload(finalBlob, filename);
      return { filename, sizeBytes: finalBlob.size };
    } finally {
      setDownloadingKey((curr) => (curr === busyKey ? null : curr));
    }
  };

  const handleCatalogDownload = async (item: UnifiedDownloadItem) => {
    if (item.method === 'CLIENT_EXPORT' && item.clientAction === 'export-os-profile') {
      const profile = loadOSCustomizationProfile();
      const json = JSON.stringify(profile, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const fname = item.downloadFilename || 'lysander-os-profile.json';
      triggerBlobDownload(blob, fname);
      await logHistoryEvent({
        direction: 'download',
        category: 'profile',
        targetId: item.id,
        label: item.title,
        detail: 'Exported live OS customization, desktop shortcuts, theme & CSS dotfiles',
        sizeBytes: blob.size
      });
      flash('success', `Downloaded ${fname} (${formatBytes(blob.size)})`);
      refreshAll();
      return;
    }

    if (!item.downloadUrl) return;

    // Multi-GB GGUF model streams cannot be buffered into browser Blob RAM — stream directly via anchor
    if (item.category === 'AI Model Weights') {
      const a = document.createElement('a');
      a.href = item.downloadUrl;
      if (item.downloadFilename) a.download = item.downloadFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      await logHistoryEvent({
        direction: 'download',
        category: 'os-download',
        targetId: item.id,
        label: item.title,
        detail: `Started streaming GGUF weights from ${item.sourceSection}`
      });
      flash('info', `Started streaming ${item.title}. For huge GGUF files, you can also use the curl command.`);
      return;
    }

    try {
      const { filename, sizeBytes } = await downloadViaFetchBlob(
        item.downloadUrl,
        item.downloadFilename || `${item.id}.bin`,
        `cat-${item.id}`
      );
      await logHistoryEvent({
        direction: 'download',
        category: 'os-download',
        targetId: item.id,
        label: item.title,
        detail: `Downloaded ${filename} from ${item.sourceSection}`,
        sizeBytes
      });
      flash('success', `Downloaded ${filename} (${formatBytes(sizeBytes)})`);
      refreshAll();
    } catch (err: any) {
      flash('error', `Download failed for ${item.title}: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleDownloadGrantPacket = async (app: GrantApplicationSummary) => {
    const md = app.fullMarkdown || `# ${app.grantTitle}\nFunder: ${app.funder}\nAward: ${app.awardAmount || 'N/A'}\n`;
    const safeName = `${app.grantTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48)}.md`;
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    triggerBlobDownload(blob, safeName);
    await logHistoryEvent({
      direction: 'download',
      category: 'os-download',
      targetId: app.id,
      label: `Grant Packet: ${app.grantTitle}`,
      detail: `Downloaded markdown grant application for ${app.funder}`,
      sizeBytes: blob.size
    });
    flash('success', `Downloaded grant application: ${safeName}`);
  };

  const handleCopyCurl = async (item: UnifiedDownloadItem) => {
    if (!item.curlCommand) return;
    const cmd = item.curlCommand.replace('{{ORIGIN}}', window.location.origin);
    try {
      await navigator.clipboard.writeText(cmd);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      flash('error', 'Clipboard access was blocked by the browser.');
    }
  };

  const handleRemoteUrlFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remoteUrl.trim()) return;
    setFetchingRemote(true);
    try {
      const res = await apiFetch('/api/os/packages/download-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: remoteUrl.trim(),
          fileName: remoteFilename.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
      await logHistoryEvent({
        direction: 'download',
        category: 'os-download',
        targetId: data.fileName || remoteUrl.trim(),
        label: `URL Fetch: ${data.fileName || remoteUrl.trim()}`,
        detail: `Saved remote file into ${data.path || 'OS Downloads'}`
      });
      flash('success', `Saved ${data.fileName || 'file'} into OS Downloads.`);
      setRemoteUrl('');
      setRemoteFilename('');
      refreshAll();
    } catch (err: any) {
      flash('error', err?.message || 'Failed to download remote URL.');
    } finally {
      setFetchingRemote(false);
    }
  };

  // Guaranteed Blob-based Module Export actions
  const handleDownloadModule = async (
    moduleId: string,
    format: 'json' | 'zip' | 'file',
    filePath?: string
  ) => {
    const qs =
      format === 'file' && filePath
        ? `?format=file&path=${encodeURIComponent(filePath)}`
        : `?format=${format}`;
    const url = `/api/transfer/modules/${encodeURIComponent(moduleId)}/download${qs}`;
    const fallbackName =
      format === 'zip'
        ? `${moduleId}-module-package.zip`
        : format === 'file' && filePath
        ? filePath.split('/').pop() || `${moduleId}.ts`
        : `${moduleId}.lysander-module.json`;
    const mime =
      format === 'zip'
        ? 'application/zip'
        : format === 'file'
        ? 'text/plain;charset=utf-8'
        : 'application/json;charset=utf-8';

    try {
      const { filename, sizeBytes } = await downloadViaFetchBlob(
        url,
        fallbackName,
        `mod-${moduleId}-${format}-${filePath || ''}`,
        mime
      );
      flash(
        'success',
        `Downloaded ${filename} (${formatBytes(sizeBytes)}). Edit it in testing, then re-upload below to validate and replace it into the OS.`
      );
      refreshAll();
    } catch (err: any) {
      flash('error', `Failed to download module "${moduleId}": ${err?.message || 'Network error'}`);
    }
  };

  const handleCopyModuleBundle = async (moduleId: string) => {
    try {
      const res = await apiFetch(`/api/transfer/modules/${encodeURIComponent(moduleId)}/download?format=json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopiedId(`bundle-${moduleId}`);
      setTimeout(() => setCopiedId(null), 2000);
      flash('success', `Copied ${moduleId}.lysander-module.json bundle (${formatBytes(text.length)}) to clipboard.`);
    } catch (err: any) {
      flash('error', `Failed to copy bundle: ${err?.message || 'Clipboard blocked'}`);
    }
  };

  // Open inline source inspector / editor for testing right in the Lab
  const handleToggleSourceEditor = async () => {
    if (!selectedModule) return;
    if (sourceEditorOpen) {
      setSourceEditorOpen(false);
      return;
    }
    setLoadingSource(true);
    try {
      const res = await apiFetch(`/api/transfer/modules/${encodeURIComponent(selectedModule.id)}/source`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
      const loaded = Array.isArray(data.files) ? data.files : [];
      setSourceFiles(loaded);
      setActiveSourceFilePath(loaded[0]?.relativePath || '');
      setSourceEditorOpen(true);
    } catch (err: any) {
      flash('error', err?.message || 'Failed to load live module source');
    } finally {
      setLoadingSource(false);
    }
  };

  const handleStageInlineEdits = async () => {
    if (!selectedModule || sourceFiles.length === 0) return;
    const payload = sourceFiles.map((f) => ({ relativePath: f.relativePath, content: f.content }));
    setStagedFiles(payload);
    await runInspection(selectedModule.id, payload);
  };

  const handleDownloadActiveSourceCopy = () => {
    const active = sourceFiles.find((f) => f.relativePath === activeSourceFilePath);
    if (!active) return;
    const fname = active.relativePath.split('/').pop() || 'module.ts';
    const blob = new Blob([active.content], { type: 'text/plain;charset=utf-8' });
    triggerBlobDownload(blob, fname);
    flash('success', `Downloaded ${fname} (${formatBytes(blob.size)}) from editor.`);
  };

  // Inspect staged files for module hot-swap
  const runInspection = async (
    targetModId: string,
    files: Array<{ relativePath: string; content: string }>
  ) => {
    setInspecting(true);
    try {
      const res = await apiFetch(`/api/transfer/modules/${encodeURIComponent(targetModId)}/inspect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Inspection failed (HTTP ${res.status})`);
      }
      setInspection(data.inspection);
      if (!data.inspection.allSyntaxValid) {
        flash('error', 'Syntax error detected in uploaded module. Fix highlighted issues before replacing.');
      } else if (!data.inspection.hasAnyChange) {
        flash('info', 'Uploaded source matches the live module identically (no changes detected).');
      } else {
        flash('success', 'Syntax passed cleanly. Review the diff summary and click Backup & Replace in OS.');
      }
    } catch (err: any) {
      flash('error', err?.message || 'Failed to inspect uploaded module.');
    } finally {
      setInspecting(false);
    }
  };

  const parseUploadedModuleFile = async (file: File, forcedModule?: OrchestratorModuleSpec | null) => {
    const rawText = await file.text();

    // Case 1: Full .lysander-module.json bundle
    if (file.name.endsWith('.json')) {
      try {
        const parsed = JSON.parse(rawText);
        if (parsed?.schema === 'lysander-orchestrator-module-v1' && parsed?.files && typeof parsed.files === 'object') {
          const detectedModId = String(parsed.moduleId || forcedModule?.id || '').trim();
          const matchedMod = modules.find((m) => m.id === detectedModId) || forcedModule;
          if (!matchedMod) {
            throw new Error(`Bundle references unknown module "${detectedModId}".`);
          }
          const extracted: Array<{ relativePath: string; content: string }> = [];
          for (const [relPath, entry] of Object.entries<any>(parsed.files)) {
            const content = typeof entry === 'string' ? entry : entry?.content;
            if (typeof content === 'string') {
              extracted.push({ relativePath: relPath, content });
            }
          }
          if (extracted.length === 0) {
            throw new Error('Bundle JSON contains no valid file contents.');
          }
          setSelectedModuleId(matchedMod.id);
          setActiveTab('module-lab');
          setStagedFiles(extracted);
          await runInspection(matchedMod.id, extracted);
          return;
        }
      } catch (err: any) {
        flash('error', err?.message || 'Invalid JSON bundle format.');
        return;
      }
    }

    // Case 2: Raw .tsx / .ts source file matched by filename or explicitly targeted
    if (/\.(tsx|ts|jsx|js)$/i.test(file.name)) {
      let targetMod = forcedModule || null;
      let matchedRelPath = '';

      if (targetMod) {
        const exact = targetMod.files.find(
          (f) => f.relativePath.endsWith(`/${file.name}`) || f.relativePath === file.name
        );
        matchedRelPath = exact?.relativePath || targetFileForSingleUpload || targetMod.files[0]?.relativePath || '';
      } else {
        for (const m of modules) {
          const exact = m.files.find(
            (f) => f.relativePath.endsWith(`/${file.name}`) || f.relativePath === file.name
          );
          if (exact) {
            targetMod = m;
            matchedRelPath = exact.relativePath;
            break;
          }
        }
      }

      if (!targetMod || !matchedRelPath) {
        flash(
          'error',
          `Could not auto-match "${file.name}" to an orchestrator module. Select the target module in Module Lab first.`
        );
        return;
      }

      const staged = [{ relativePath: matchedRelPath, content: rawText }];
      setSelectedModuleId(targetMod.id);
      setActiveTab('module-lab');
      setStagedFiles(staged);
      await runInspection(targetMod.id, staged);
      return;
    }

    flash('error', 'Upload a .lysander-module.json bundle or an edited .ts / .tsx source file.');
  };

  const handleModuleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await parseUploadedModuleFile(file, selectedModule);
  };

  const handleConfirmReplaceModule = async () => {
    if (!selectedModule || stagedFiles.length === 0 || !inspection?.allSyntaxValid || !inspection?.allAllowed) {
      return;
    }
    setReplacing(true);
    try {
      const res = await apiFetch(`/api/transfer/modules/${encodeURIComponent(selectedModule.id)}/replace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: stagedFiles,
          reason: replaceReason.trim() || 'Edited module uploaded via Transfer Hub'
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Replacement failed (HTTP ${res.status})`);
      }
      flash(
        'success',
        `Replaced ${data.replacedFiles.length} file(s) in ${data.moduleName}. Automatic backup ${data.backupId} saved.${
          data.serverCodeModified ? ' Restart server to activate backend edits.' : ' Refresh the app to load updated UI.'
        }`
      );
      setStagedFiles([]);
      setInspection(null);
      await refreshAll();
    } catch (err: any) {
      flash('error', err?.message || 'Module replacement failed.');
    } finally {
      setReplacing(false);
    }
  };

  const handleRollback = async (moduleId: string, backupId: string) => {
    setRollingBackId(backupId);
    try {
      const res = await apiFetch(`/api/transfer/modules/${encodeURIComponent(moduleId)}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupId })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Rollback failed');
      }
      flash('success', `Restored ${data.restoredFiles.join(', ')} from backup ${backupId}.`);
      await refreshAll();
    } catch (err: any) {
      flash('error', err?.message || 'Rollback failed.');
    } finally {
      setRollingBackId(null);
    }
  };

  // Universal Uploader handler
  const uploadBinaryToOsDir = async (file: File, dirPath: string): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const base64 = btoa(binary);
    const cleanDir = dirPath.replace(/\/+$/, '');
    const fullPath = `${cleanDir}/${file.name}`;
    const res = await apiFetch('/api/os/fs/write-base64', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: fullPath, base64 })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || `Failed to upload ${file.name}`);
    }
    return data.path || fullPath;
  };

  const handleUniversalFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setUploading(true);
    try {
      if (uploadDest === 'auto-module') {
        await parseUploadedModuleFile(files[0], null);
        return;
      }

      if (uploadDest === 'os-profile') {
        const text = await files[0].text();
        const result = importOSCustomizationProfile(text);
        if (!result.ok) {
          throw new Error(result.error || 'Invalid OS customization profile JSON');
        }
        await logHistoryEvent({
          direction: 'upload',
          category: 'profile',
          targetId: files[0].name,
          label: `Imported OS Profile (${files[0].name})`,
          detail: 'Applied desktop icons, themes, wallpaper, and CSS dotfiles from uploaded JSON',
          sizeBytes: files[0].size
        });
        flash('success', `Imported and applied OS profile from ${files[0].name}.`);
        await refreshAll();
        return;
      }

      const downloadsPlace = places.find((p) => p.id === 'os-downloads');
      const desktopPlace = places.find((p) => p.id === 'os-desktop');
      const targetDir =
        uploadDest === 'os-desktop'
          ? desktopPlace?.path || 'data/os-desktop'
          : downloadsPlace?.path || 'downloads';

      let uploadedCount = 0;
      for (const f of files) {
        const writtenPath = await uploadBinaryToOsDir(f, targetDir);
        uploadedCount++;
        await logHistoryEvent({
          direction: 'upload',
          category: 'file-upload',
          targetId: writtenPath,
          label: f.name,
          detail: `Uploaded into ${uploadDest === 'os-desktop' ? 'OS Desktop' : 'OS Downloads'} (${writtenPath})`,
          sizeBytes: f.size
        });
      }
      flash(
        'success',
        `Uploaded ${uploadedCount} file${uploadedCount > 1 ? 's' : ''} into ${
          uploadDest === 'os-desktop' ? 'OS Desktop' : 'OS Downloads'
        }.`
      );
      await refreshAll();
    } catch (err: any) {
      flash('error', err?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  // Filtered lists
  const catalogCategories = useMemo(
    () => [
      'All',
      'Host Bridges & Files',
      'OS Packages & Installers',
      'AI Model Weights',
      'Edge & Mobile',
      'Core Configs & Profiles'
    ],
    []
  );

  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return catalog.filter((item) => {
      if (catalogCategory !== 'All' && item.category !== catalogCategory) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.sourceSection.toLowerCase().includes(q) ||
        item.whatItDoes.toLowerCase().includes(q) ||
        item.format.toLowerCase().includes(q)
      );
    });
  }, [catalog, catalogSearch, catalogCategory]);

  const moduleCategories = useMemo(() => {
    const cats = new Set<string>(['All']);
    modules.forEach((m) => cats.add(m.category));
    return Array.from(cats);
  }, [modules]);

  const filteredModules = useMemo(() => {
    const q = moduleSearch.trim().toLowerCase();
    return modules.filter((m) => {
      if (moduleCategory !== 'All' && m.category !== moduleCategory) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.whatItDoes.toLowerCase().includes(q) ||
        m.files.some((f) => f.relativePath.toLowerCase().includes(q))
      );
    });
  }, [modules, moduleSearch, moduleCategory]);

  const selectedModuleBackups = useMemo(
    () => (selectedModule ? backups.filter((b) => b.moduleId === selectedModule.id) : []),
    [backups, selectedModule]
  );

  const activeSourceFile = useMemo(
    () => sourceFiles.find((f) => f.relativePath === activeSourceFilePath) || sourceFiles[0] || null,
    [sourceFiles, activeSourceFilePath]
  );

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Top Workspace Header */}
      <div className="shrink-0 px-6 py-4 border-b border-zinc-800/90 bg-zinc-950 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100">
            Downloads, Uploads &amp; Module Lab
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Every OS download in one catalog, universal file upload, and full export &amp; hot-swap replacement for all {modules.length} orchestrator modules ({totalIndexedFiles} source files).
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-3 text-xs text-zinc-400 tabular-nums font-mono">
            <span>{catalog.length} OS Downloads</span>
            <span aria-hidden="true">·</span>
            <span>{modules.length} Modules</span>
            <span aria-hidden="true">·</span>
            <span>{backups.length} Backups</span>
          </div>
          <button
            type="button"
            onClick={refreshAll}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-xs font-medium text-zinc-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Primary Section Tabs */}
      <div className="shrink-0 px-6 py-2.5 border-b border-zinc-800/70 bg-zinc-900/40 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab('downloads')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'downloads'
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Unified OS Downloads ({catalog.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('module-lab')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'module-lab'
                ? 'bg-emerald-500/20 text-emerald-200'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            Orchestrator Module Lab ({modules.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('uploader')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'uploader'
                ? 'bg-sky-500/20 text-sky-200'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Universal Uploader
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('vault')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'vault'
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Files, Backups &amp; History
          </button>
        </div>
      </div>

      {/* Inline Action Feedback Banner */}
      {notice && (
        <div
          className={`shrink-0 px-6 py-2.5 border-b text-xs flex items-center justify-between gap-4 ${
            notice.kind === 'error'
              ? 'bg-red-950/50 border-red-900/60 text-red-200'
              : notice.kind === 'success'
              ? 'bg-emerald-950/40 border-emerald-900/60 text-emerald-200'
              : 'bg-sky-950/40 border-sky-900/60 text-sky-200'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {notice.kind === 'error' ? (
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            )}
            <span className="break-words">{notice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-zinc-400 hover:text-zinc-100 text-xs shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Area — Module Lab uses independent split scroll panes */}
      <div className={`flex-1 min-h-0 ${activeTab === 'module-lab' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {/* ============================================================
            TAB 1: UNIFIED OS DOWNLOADS
            ============================================================ */}
        {activeTab === 'downloads' && (
          <div className="max-w-7xl mx-auto p-6 space-y-6">
            {/* Direct Web URL -> OS Downloads Bar */}
            <form
              onSubmit={handleRemoteUrlFetch}
              className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col lg:flex-row items-stretch lg:items-center gap-3"
            >
              <div className="flex items-center gap-2 text-xs text-zinc-300 shrink-0">
                <Globe className="w-4 h-4 text-sky-400" />
                <span className="font-medium">Direct URL Download</span>
              </div>
              <input
                type="url"
                value={remoteUrl}
                onChange={(e) => setRemoteUrl(e.target.value)}
                placeholder="Paste any direct file URL (https://...) to download straight into OS Downloads"
                className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500/60"
              />
              <input
                type="text"
                value={remoteFilename}
                onChange={(e) => setRemoteFilename(e.target.value)}
                placeholder="Optional filename"
                className="w-full lg:w-44 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500/60"
              />
              <button
                type="submit"
                disabled={fetchingRemote || !remoteUrl.trim()}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-xs font-medium text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                {fetchingRemote ? 'Downloading...' : 'Save to OS'}
              </button>
            </form>

            {/* Filter & Search Row */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Search downloads by name, section, format, or purpose..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-900/70 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
                {catalogCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCatalogCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      catalogCategory === cat
                        ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                        : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Unified Downloads Table */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-xs text-zinc-400 bg-zinc-900/70">
                      <th className="py-3 px-4 font-medium">Download &amp; Format</th>
                      <th className="py-3 px-4 font-medium">Hosted From</th>
                      <th className="py-3 px-4 font-medium">What It Does</th>
                      <th className="py-3 px-4 font-medium text-right">Size / State</th>
                      <th className="py-3 px-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/70 text-xs">
                    {filteredCatalog.map((item) => {
                      const isBusy = downloadingKey === `cat-${item.id}`;
                      return (
                        <tr key={item.id} className="hover:bg-zinc-800/35 transition-colors">
                          <td className="py-3.5 px-4 align-top">
                            <div className="font-medium text-zinc-100">{item.title}</div>
                            <div className="text-zinc-500 mt-0.5 font-mono tabular-nums">
                              {item.format} · {item.category}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 align-top whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => onNavigateModule?.(item.sourceModuleId as ModuleType)}
                              className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 hover:underline cursor-pointer"
                              title={`Open ${item.sourceSection}`}
                            >
                              {item.sourceSection}
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                          </td>
                          <td className="py-3.5 px-4 align-top text-zinc-300 leading-relaxed max-w-md">
                            {item.whatItDoes}
                          </td>
                          <td className="py-3.5 px-4 align-top text-right whitespace-nowrap font-mono tabular-nums">
                            <span className={item.available ? 'text-emerald-400' : 'text-amber-400'}>
                              {item.sizeHint}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-2">
                              {item.curlCommand && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyCurl(item)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 transition-colors cursor-pointer"
                                  title="Copy terminal curl download command"
                                >
                                  {copiedId === item.id ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                      Copied
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      curl
                                    </>
                                  )}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleCatalogDownload(item)}
                                disabled={!item.available || isBusy}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium transition-colors cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" />
                                {isBusy ? 'Downloading...' : item.available ? 'Download' : 'Build First'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredCatalog.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-zinc-500">
                          No downloads match &ldquo;{catalogSearch}&rdquo;.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Saved Grant Applications (from Grant Hunter) */}
            {grantPackets.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-100">
                      Saved Grant Application Packets
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Drafted non-reciprocal grant applications hosted from Autonomous Grant Hunter, ready to download as Markdown.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateModule?.('grant-hunter')}
                    className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer"
                  >
                    Open Grant Hunter
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-800/70">
                  {grantPackets.map((app) => (
                    <div
                      key={app.id}
                      className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-zinc-100 truncate">{app.grantTitle}</div>
                        <div className="text-zinc-400 mt-0.5">
                          {app.funder}
                          {app.awardAmount ? ` · ${app.awardAmount}` : ''}
                          {app.createdAt ? ` · ${formatDateShort(app.createdAt)}` : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadGrantPacket(app)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium transition-colors cursor-pointer shrink-0"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Download Markdown
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            TAB 2: ORCHESTRATOR MODULE LAB (EXPORT FOR TESTING & HOT-SWAP)
            ============================================================ */}
        {activeTab === 'module-lab' && (
          <div className="h-full flex flex-col lg:flex-row min-h-0">
            {/* Left Sidebar: Complete Directory of ALL Orchestrator Modules */}
            <div className="w-full lg:w-80 xl:w-96 shrink-0 border-b lg:border-b-0 lg:border-r border-zinc-800 bg-zinc-900/30 flex flex-col min-h-0 max-h-[38vh] lg:max-h-full">
              <div className="p-4 border-b border-zinc-800 space-y-2.5 shrink-0">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-200">
                    All Orchestrator Modules ({filteredModules.length}/{modules.length})
                  </span>
                  <span className="font-mono tabular-nums text-zinc-500">
                    {totalIndexedFiles} files
                  </span>
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={moduleSearch}
                    onChange={(e) => setModuleSearch(e.target.value)}
                    placeholder="Search any module or filename..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/60"
                  />
                </div>
                <select
                  value={moduleCategory}
                  onChange={(e) => setModuleCategory(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/60"
                >
                  {moduleCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-zinc-800/60">
                {filteredModules.map((mod) => {
                  const isActive = selectedModule?.id === mod.id;
                  const rowBusy = downloadingKey === `mod-${mod.id}-json-`;
                  return (
                    <div
                      key={mod.id}
                      onClick={() => setSelectedModuleId(mod.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedModuleId(mod.id);
                        }
                      }}
                      className={`w-full text-left px-4 py-3 transition-colors cursor-pointer flex items-start justify-between gap-2 ${
                        isActive ? 'bg-emerald-500/12 text-zinc-100' : 'hover:bg-zinc-800/40 text-zinc-300'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold truncate">{mod.name}</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">
                          {mod.category}
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono tabular-nums mt-1 flex items-center gap-1.5">
                          <span>{mod.files.filter((f) => f.exists).length} files</span>
                          <span>·</span>
                          <span>{formatBytes(mod.totalBytes)}</span>
                          <span>·</span>
                          <span>{mod.totalLines.toLocaleString()}L</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={rowBusy}
                        title={`Download ${mod.name} (.lysander-module.json)`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedModuleId(mod.id);
                          handleDownloadModule(mod.id, 'json');
                        }}
                        className="p-1.5 rounded-md bg-zinc-900 hover:bg-emerald-600/30 border border-zinc-700/80 hover:border-emerald-500/50 text-zinc-300 hover:text-emerald-200 transition-colors shrink-0 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
                {filteredModules.length === 0 && (
                  <div className="p-6 text-center text-xs text-zinc-500">
                    No modules match &ldquo;{moduleSearch}&rdquo;.
                  </div>
                )}
              </div>
            </div>

            {/* Right Pane: Selected Module Export, Inline Testing Editor, Upload Diff & Replace */}
            <div className="flex-1 min-w-0 min-h-0 overflow-y-auto p-6 space-y-6">
              {selectedModule ? (
                <>
                  {/* Module Summary Header + Direct Download Buttons */}
                  <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4 pb-5 border-b border-zinc-800">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 font-mono">
                        <span>{selectedModule.category}</span>
                        <span>·</span>
                        <span>id: {selectedModule.id}</span>
                        <span>·</span>
                        <span>sha256: {selectedModule.bundleHash}</span>
                      </div>
                      <h2 className="text-xl font-semibold text-zinc-100">{selectedModule.name}</h2>
                      <p className="text-xs text-zinc-300 leading-relaxed max-w-2xl">
                        {selectedModule.whatItDoes}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={downloadingKey === `mod-${selectedModule.id}-json-`}
                        onClick={() => handleDownloadModule(selectedModule.id, 'json')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-medium text-white transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <FileJson className="w-3.5 h-3.5" />
                        {downloadingKey === `mod-${selectedModule.id}-json-`
                          ? 'Packaging JSON...'
                          : 'Download Test Bundle (.json)'}
                      </button>
                      <button
                        type="button"
                        disabled={downloadingKey === `mod-${selectedModule.id}-zip-`}
                        onClick={() => handleDownloadModule(selectedModule.id, 'zip')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 border border-zinc-700 text-xs font-medium text-zinc-100 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <FolderArchive className="w-3.5 h-3.5" />
                        {downloadingKey === `mod-${selectedModule.id}-zip-`
                          ? 'Building ZIP...'
                          : 'Download ZIP (.zip)'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyModuleBundle(selectedModule.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-200 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        {copiedId === `bundle-${selectedModule.id}` ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            Copied Bundle
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy Bundle
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleToggleSourceEditor}
                        disabled={loadingSource}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-medium text-sky-300 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <Code2 className="w-3.5 h-3.5" />
                        {loadingSource
                          ? 'Loading Source...'
                          : sourceEditorOpen
                          ? 'Hide Source Editor'
                          : 'Inspect / Edit Source'}
                      </button>
                      {selectedModule.sourceModuleId && (
                        <button
                          type="button"
                          onClick={() => onNavigateModule?.(selectedModule.sourceModuleId as ModuleType)}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-zinc-100 transition-colors whitespace-nowrap cursor-pointer"
                        >
                          Open App
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Optional Inline Source Viewer & Live Test Editor */}
                  {sourceEditorOpen && activeSourceFile && (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-900 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 overflow-x-auto">
                          {sourceFiles.map((sf) => (
                            <button
                              key={sf.relativePath}
                              type="button"
                              onClick={() => setActiveSourceFilePath(sf.relativePath)}
                              className={`px-2.5 py-1 rounded text-xs font-mono whitespace-nowrap cursor-pointer ${
                                activeSourceFile.relativePath === sf.relativePath
                                  ? 'bg-zinc-800 text-emerald-300'
                                  : 'text-zinc-400 hover:text-zinc-200'
                              }`}
                            >
                              {sf.relativePath.split('/').pop()}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={handleDownloadActiveSourceCopy}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                            Save File Copy
                          </button>
                          <button
                            type="button"
                            onClick={handleStageInlineEdits}
                            disabled={inspecting}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-xs font-medium text-white cursor-pointer"
                          >
                            <ShieldCheck className="w-3 h-3" />
                            {inspecting ? 'Checking...' : 'Validate & Stage Edits'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSourceEditorOpen(false)}
                            className="p-1 text-zinc-400 hover:text-zinc-100 cursor-pointer"
                            title="Close editor"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={activeSourceFile.content}
                        onChange={(e) => {
                          const nextVal = e.target.value;
                          setSourceFiles((prev) =>
                            prev.map((f) =>
                              f.relativePath === activeSourceFile.relativePath
                                ? { ...f, content: nextVal }
                                : f
                            )
                          );
                        }}
                        spellCheck={false}
                        className="w-full h-80 p-4 bg-zinc-950 text-zinc-200 font-mono text-xs leading-relaxed focus:outline-none resize-y"
                      />
                    </div>
                  )}

                  {/* Included Source Files Table */}
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-semibold text-zinc-300">
                      Module Source Files ({selectedModule.files.filter((f) => f.exists).length})
                    </h3>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-zinc-800 bg-zinc-900/70 text-zinc-400">
                              <th className="py-2.5 px-4 font-medium">File Path</th>
                              <th className="py-2.5 px-4 font-medium">Layer</th>
                              <th className="py-2.5 px-4 font-medium text-right">Size</th>
                              <th className="py-2.5 px-4 font-medium text-right">Lines</th>
                              <th className="py-2.5 px-4 font-medium text-right">SHA-256</th>
                              <th className="py-2.5 px-4 font-medium text-right">Download</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/70 font-mono tabular-nums">
                            {selectedModule.files.map((f) => {
                              const fileBusy =
                                downloadingKey === `mod-${selectedModule.id}-file-${f.relativePath}`;
                              return (
                                <tr key={f.relativePath} className="hover:bg-zinc-800/30">
                                  <td className="py-2.5 px-4 text-zinc-200">{f.relativePath}</td>
                                  <td className="py-2.5 px-4 text-zinc-400 font-sans capitalize">{f.role}</td>
                                  <td className="py-2.5 px-4 text-right text-zinc-300">
                                    {formatBytes(f.sizeBytes)}
                                  </td>
                                  <td className="py-2.5 px-4 text-right text-zinc-300">
                                    {f.lineCount.toLocaleString()}
                                  </td>
                                  <td className="py-2.5 px-4 text-right text-zinc-500">
                                    {f.sha256 ? f.sha256.slice(0, 12) : 'missing'}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-sans">
                                    <button
                                      type="button"
                                      disabled={!f.exists || fileBusy}
                                      onClick={() =>
                                        handleDownloadModule(selectedModule.id, 'file', f.relativePath)
                                      }
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs cursor-pointer disabled:opacity-40 whitespace-nowrap"
                                    >
                                      <Download className="w-3 h-3" />
                                      {fileBusy ? 'Saving...' : 'Download File'}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Re-Upload Edited Version & Hot-Swap Dropzone Panel */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setModuleDropActive(true);
                    }}
                    onDragLeave={() => setModuleDropActive(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setModuleDropActive(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) parseUploadedModuleFile(file, selectedModule);
                    }}
                    className={`p-5 rounded-xl border transition-colors space-y-4 ${
                      moduleDropActive
                        ? 'border-sky-400 bg-sky-500/10'
                        : 'border-zinc-800 bg-zinc-900/40'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-100">
                          Re-Upload Edited Version &amp; Replace into OS
                        </h3>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Drop or browse your modified{' '}
                          <span className="font-mono text-zinc-300">.lysander-module.json</span> bundle or edited{' '}
                          <span className="font-mono text-zinc-300">.tsx / .ts</span> file here. Every upload is syntax-checked via esbuild and backed up before replacement.
                        </p>
                      </div>
                      <input
                        ref={moduleFileInputRef}
                        type="file"
                        accept=".json,.ts,.tsx,.js,.jsx"
                        onChange={handleModuleFileInput}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => moduleFileInputRef.current?.click()}
                        disabled={inspecting}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-medium text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {inspecting ? 'Validating...' : 'Upload Edited Module'}
                      </button>
                    </div>

                    {selectedModule.files.length > 1 && (
                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                        <span>Target file when uploading a single .ts/.tsx file:</span>
                        <select
                          value={targetFileForSingleUpload}
                          onChange={(e) => setTargetFileForSingleUpload(e.target.value)}
                          className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-zinc-200 font-mono text-xs"
                        >
                          {selectedModule.files.map((f) => (
                            <option key={f.relativePath} value={f.relativePath}>
                              {f.relativePath}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Validation & Diff Preview Result */}
                    {inspection && (
                      <div className="pt-4 border-t border-zinc-800 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-xs font-medium">
                            {inspection.allSyntaxValid && inspection.allAllowed ? (
                              <>
                                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                <span className="text-emerald-300">
                                  TypeScript syntax verified · Module boundary verified
                                </span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-4 h-4 text-red-400" />
                                <span className="text-red-300">
                                  Validation failed — replacement blocked to protect OS stability
                                </span>
                              </>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setStagedFiles([]);
                              setInspection(null);
                            }}
                            className="text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
                          >
                            Clear Staged Upload
                          </button>
                        </div>

                        <div className="rounded-lg border border-zinc-800 overflow-hidden">
                          <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
                            <thead>
                              <tr className="border-b border-zinc-800 bg-zinc-950/70 text-zinc-400 font-sans">
                                <th className="py-2 px-3 font-medium">Target File</th>
                                <th className="py-2 px-3 font-medium">Syntax</th>
                                <th className="py-2 px-3 font-medium text-right">Line Diff</th>
                                <th className="py-2 px-3 font-medium text-right">Size Change</th>
                                <th className="py-2 px-3 font-medium text-right">New Hash</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/70">
                              {inspection.files.map((f) => (
                                <tr key={f.relativePath}>
                                  <td className="py-2 px-3 text-zinc-200">
                                    <div>{f.relativePath}</div>
                                    {f.syntaxError && (
                                      <div className="text-red-400 font-sans mt-1">{f.syntaxError}</div>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 font-sans">
                                    {f.syntaxValid && f.allowed ? (
                                      <span className="text-emerald-400">Valid</span>
                                    ) : (
                                      <span className="text-red-400">Error</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-right whitespace-nowrap">
                                    {f.changed ? (
                                      <span>
                                        <span className="text-emerald-400">+{f.addedLines}</span>{' '}
                                        <span className="text-red-400">-{f.removedLines}</span>
                                      </span>
                                    ) : (
                                      <span className="text-zinc-500">Unchanged</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-right whitespace-nowrap text-zinc-300">
                                    {formatBytes(f.oldBytes)} → {formatBytes(f.newBytes)}
                                  </td>
                                  <td className="py-2 px-3 text-right text-zinc-400">{f.newSha256}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                          <input
                            type="text"
                            value={replaceReason}
                            onChange={(e) => setReplaceReason(e.target.value)}
                            placeholder="Change note saved with automatic backup..."
                            className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-500"
                          />
                          <button
                            type="button"
                            onClick={handleConfirmReplaceModule}
                            disabled={
                              replacing ||
                              !inspection.allSyntaxValid ||
                              !inspection.allAllowed ||
                              !inspection.hasAnyChange
                            }
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs font-medium text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <Layers className="w-3.5 h-3.5" />
                            {replacing ? 'Replacing Module...' : 'Backup & Replace in OS'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Module-Specific Backups & Rollback */}
                  {selectedModuleBackups.length > 0 && (
                    <div className="space-y-2.5">
                      <h3 className="text-xs font-semibold text-zinc-300">
                        Automatic Rollback Snapshots for {selectedModule.name} ({selectedModuleBackups.length})
                      </h3>
                      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-800/70">
                        {selectedModuleBackups.map((b) => (
                          <div
                            key={b.backupId}
                            className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                          >
                            <div>
                              <div className="font-mono text-zinc-200">{b.backupId}</div>
                              <div className="text-zinc-400 mt-0.5">
                                {formatDateShort(b.createdAt)} · {b.reason} · {b.files.length} file(s)
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={rollingBackId === b.backupId}
                              onClick={() => handleRollback(b.moduleId, b.backupId)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-200 font-medium cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              {rollingBackId === b.backupId ? 'Restoring...' : 'Restore Backup'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-12 text-center text-xs text-zinc-500">
                  Select an orchestrator module on the left to export or hot-replace it.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 3: UNIVERSAL UPLOADER
            ============================================================ */}
        {activeTab === 'uploader' && (
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Universal Upload Router</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Choose where uploaded files go: auto-detect and hot-replace edited orchestrator modules, save files to OS Downloads or Desktop, or apply an OS customization profile.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  id: 'auto-module' as const,
                  title: 'Module Hot-Swap',
                  desc: 'Edited .lysander-module.json or .tsx/.ts source'
                },
                {
                  id: 'os-downloads' as const,
                  title: 'OS Downloads Folder',
                  desc: 'Any archive, binary, script, media, or document'
                },
                {
                  id: 'os-desktop' as const,
                  title: 'OS Desktop',
                  desc: 'Places uploaded files directly onto Desktop'
                },
                {
                  id: 'os-profile' as const,
                  title: 'OS Profile Import',
                  desc: 'Apply exported lysander-os-profile.json'
                }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setUploadDest(opt.id)}
                  className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                    uploadDest === opt.id
                      ? 'bg-sky-500/15 border-sky-500/50 text-zinc-100'
                      : 'bg-zinc-900/50 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <div className="text-xs font-semibold">{opt.title}</div>
                  <div className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{opt.desc}</div>
                </button>
              ))}
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files?.length) {
                  handleUniversalFiles(e.dataTransfer.files);
                }
              }}
              className={`p-10 rounded-2xl border-2 border-dashed transition-colors flex flex-col items-center justify-center text-center gap-3 ${
                dragActive
                  ? 'border-sky-400 bg-sky-500/10'
                  : 'border-zinc-700 bg-zinc-900/40 hover:border-zinc-600'
              }`}
            >
              <Upload className="w-8 h-8 text-sky-400" />
              <div className="space-y-1">
                <div className="text-sm font-medium text-zinc-100">
                  {uploading ? 'Processing upload...' : 'Drop files here or choose from your device'}
                </div>
                <div className="text-xs text-zinc-400">
                  {uploadDest === 'auto-module' &&
                    'Automatically matches edited .lysander-module.json bundles or .ts/.tsx files, checks syntax, and opens diff preview.'}
                  {uploadDest === 'os-downloads' &&
                    'Uploads any file losslessly into the Lysander OS Downloads directory.'}
                  {uploadDest === 'os-desktop' &&
                    'Uploads directly into the live OS Desktop folder so it appears immediately.'}
                  {uploadDest === 'os-profile' &&
                    'Validates and restores desktop icons, wallpaper, themes, and CSS dotfiles from JSON.'}
                </div>
              </div>
              <input
                ref={universalFileInputRef}
                type="file"
                multiple={uploadDest === 'os-downloads' || uploadDest === 'os-desktop'}
                onChange={(e) => {
                  if (e.target.files?.length) {
                    handleUniversalFiles(e.target.files);
                  }
                  e.target.value = '';
                }}
                className="hidden"
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => universalFileInputRef.current?.click()}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-xs font-medium text-white transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                Select File{uploadDest === 'os-downloads' || uploadDest === 'os-desktop' ? 's' : ''}
              </button>
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 4: FILES, BACKUPS & TRANSFER HISTORY
            ============================================================ */}
        {activeTab === 'vault' && (
          <div className="max-w-7xl mx-auto p-6 space-y-8">
            {/* Local OS Downloads Folder */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-sky-400" />
                  <h2 className="text-sm font-semibold text-zinc-100">
                    OS Downloads Directory ({osDownloadFiles.length})
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateModule?.('file-manager')}
                  className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 hover:underline cursor-pointer"
                >
                  Open File Manager
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
                {osDownloadFiles.length > 0 ? (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-zinc-900/70 text-zinc-400">
                        <th className="py-2.5 px-4 font-medium">File Name</th>
                        <th className="py-2.5 px-4 font-medium">Location</th>
                        <th className="py-2.5 px-4 font-medium text-right">Size</th>
                        <th className="py-2.5 px-4 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/70">
                      {osDownloadFiles.slice(0, 40).map((f) => (
                        <tr key={f.path} className="hover:bg-zinc-800/30">
                          <td className="py-2.5 px-4 font-medium text-zinc-100">{f.name}</td>
                          <td className="py-2.5 px-4 text-zinc-400 font-mono truncate max-w-sm">
                            {f.rootLabel || f.path}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums text-zinc-300">
                            {formatBytes(f.size)}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <button
                              type="button"
                              disabled={downloadingKey === `fs-${f.path}`}
                              onClick={() =>
                                downloadViaFetchBlob(
                                  `/api/os/fs/download?path=${encodeURIComponent(f.path)}`,
                                  f.name,
                                  `fs-${f.path}`
                                )
                                  .then(({ filename, sizeBytes }) =>
                                    flash('success', `Downloaded ${filename} (${formatBytes(sizeBytes)})`)
                                  )
                                  .catch((err) => flash('error', err?.message || 'Download failed'))
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 cursor-pointer"
                            >
                              <Download className="w-3 h-3" />
                              {downloadingKey === `fs-${f.path}` ? 'Saving...' : 'Download'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    No files saved in OS Downloads yet. Upload files or fetch a remote URL to populate this folder.
                  </div>
                )}
              </div>
            </div>

            {/* All Module Replacement Backups */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-zinc-100">
                  Module Hot-Swap Backups ({backups.length})
                </h2>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-800/70">
                {backups.length > 0 ? (
                  backups.map((b) => (
                    <div
                      key={`${b.moduleId}-${b.backupId}`}
                      className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-medium text-zinc-100">
                          {b.moduleName}{' '}
                          <span className="font-mono text-zinc-500">({b.backupId})</span>
                        </div>
                        <div className="text-zinc-400 mt-0.5">
                          {formatDateShort(b.createdAt)} · {b.reason} ·{' '}
                          {b.files.map((f) => f.relativePath).join(', ')}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={rollingBackId === b.backupId}
                        onClick={() => handleRollback(b.moduleId, b.backupId)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-200 font-medium cursor-pointer shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {rollingBackId === b.backupId ? 'Restoring...' : 'Restore Backup'}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    No module backups yet. Whenever you replace an edited module in Module Lab, a rollback snapshot is saved here automatically.
                  </div>
                )}
              </div>
            </div>

            {/* Persistent Transfer History */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-zinc-100">
                  Transfer Audit Log ({history.length})
                </h2>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
                {history.length > 0 ? (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-zinc-900/70 text-zinc-400">
                        <th className="py-2.5 px-4 font-medium">Time</th>
                        <th className="py-2.5 px-4 font-medium">Action</th>
                        <th className="py-2.5 px-4 font-medium">Item</th>
                        <th className="py-2.5 px-4 font-medium">Details</th>
                        <th className="py-2.5 px-4 font-medium text-right">Size</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/70">
                      {history.map((h) => (
                        <tr key={h.id} className="hover:bg-zinc-800/30">
                          <td className="py-2.5 px-4 whitespace-nowrap font-mono tabular-nums text-zinc-400">
                            {formatDateShort(h.timestamp)}
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap capitalize font-medium">
                            <span
                              className={
                                h.direction === 'replace'
                                  ? 'text-emerald-400'
                                  : h.direction === 'rollback'
                                  ? 'text-amber-400'
                                  : h.direction === 'upload'
                                  ? 'text-sky-400'
                                  : 'text-zinc-200'
                              }
                            >
                              {h.direction}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-medium text-zinc-100">{h.label}</td>
                          <td className="py-2.5 px-4 text-zinc-400">{h.detail}</td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums text-zinc-400">
                            {h.sizeBytes ? formatBytes(h.sizeBytes) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    Transfer events will appear here as you download packages, upload files, or replace modules.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
