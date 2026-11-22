/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 * (TWENTY 47 PROTOCOL - GENESIS NODE / LYSANDER CORE EULA / H-FID Forensic License v1.1).
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Plus,
  FolderSearch,
  Download,
  Send,
  RefreshCw,
  CheckSquare,
  Square,
  X,
  Undo2,
  Search,
  FileCode,
  Database
} from 'lucide-react';
import { apiFetch } from '../utils/authClient';
import type { ModuleType } from '../types';

type BatchJobPriority = 'critical' | 'high' | 'normal' | 'low';
type BatchJobStatus = 'queued' | 'running' | 'paused' | 'completed' | 'completed_with_errors' | 'failed' | 'cancelled';
type BatchTaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

type BatchOperationType =
  | 'file_regex_replace'
  | 'file_format_normalize'
  | 'file_convert_projection'
  | 'file_hash_manifest'
  | 'file_ai_transform'
  | 'data_json_csv_etl'
  | 'data_js_transform'
  | 'data_ai_process';

interface StagedTaskItem {
  uid: string;
  label: string;
  filePath?: string;
  outputPath?: string;
  inputData?: string;
}

interface DiscoveredFileItem {
  path: string;
  sizeBytes: number;
  ext: string;
  modifiedAt: string;
}

interface BatchTaskRecord {
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

interface BatchJobRecord {
  id: string;
  name: string;
  description: string;
  category: 'file_transformation' | 'data_processing' | 'hybrid';
  operation: BatchOperationType;
  priority: BatchJobPriority;
  status: BatchJobStatus;
  ownerUsername: string;
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

interface RunnerStatusResponse {
  success: boolean;
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
}

export interface BatchProcessorModuleProps {
  onSelectModule?: (mod: ModuleType) => void;
  onInjectIntoChat?: (text: string) => void;
}

const OPERATION_CATALOG: Array<{
  id: BatchOperationType;
  label: string;
  mode: 'file' | 'data';
  summary: string;
}> = [
  {
    id: 'file_hash_manifest',
    label: 'Cryptographic File Hash & Entropy Audit',
    mode: 'file',
    summary: 'Computes SHA-256, SHA-512, byte count, line count, and Shannon entropy across queued files with optional JSON manifest output.'
  },
  {
    id: 'file_format_normalize',
    label: 'Format, Whitespace & Header Normalizer',
    mode: 'file',
    summary: 'Normalizes CRLF line endings, trims trailing whitespace, formats/minifies JSON, or injects header banners with rollback snapshots.'
  },
  {
    id: 'file_regex_replace',
    label: 'Multi-File Search & Regex Replace',
    mode: 'file',
    summary: 'Applies literal or RegExp pattern transformations across multiple files with diff tracking, optional TypeScript compile gate, and 1-click rollback.'
  },
  {
    id: 'file_convert_projection',
    label: 'Structured File Format Converter',
    mode: 'file',
    summary: 'Converts files across CSV, JSON, NDJSON, TSV, and Markdown-to-HTML/JSON sections.'
  },
  {
    id: 'file_ai_transform',
    label: 'AI Code & Document Transformer',
    mode: 'file',
    summary: 'Executes server-side Gemini 4 Hydrogen file transformations (refactoring, JSDoc/type enrichment, migration) across queued files.'
  },
  {
    id: 'data_json_csv_etl',
    label: 'Tabular & JSON Dataset ETL Pipeline',
    mode: 'data',
    summary: 'Parses CSV, TSV, JSON, or NDJSON datasets; filters rows, deduplicates keys, projects columns, sorts, and converts output formats.'
  },
  {
    id: 'data_js_transform',
    label: 'Async JS Sandbox Record Mapper',
    mode: 'data',
    summary: 'Runs custom asynchronous JavaScript transformation code across each queued data payload or source file.'
  },
  {
    id: 'data_ai_process',
    label: 'AI Structured Data Extraction & Tagging',
    mode: 'data',
    summary: 'Dispatches server-side Gemini 4 Hydrogen across queued dataset records or text items for structured JSON or text extraction.'
  }
];

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0 ms';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)} s`;
  const mins = Math.floor(ms / 60_000);
  const secs = Math.round((ms % 60_000) / 1000);
  return `${mins}m ${secs}s`;
}

function getStatusLabelAndColor(status: BatchJobStatus | BatchTaskStatus): { label: string; textClass: string } {
  switch (status) {
    case 'running':
      return { label: 'Running', textClass: 'text-sky-400' };
    case 'queued':
      return { label: 'Queued', textClass: 'text-amber-300' };
    case 'paused':
      return { label: 'Paused', textClass: 'text-amber-400' };
    case 'completed':
      return { label: 'Completed', textClass: 'text-emerald-400' };
    case 'completed_with_errors':
      return { label: 'Completed (Partial)', textClass: 'text-amber-400' };
    case 'failed':
      return { label: 'Failed', textClass: 'text-rose-400' };
    case 'cancelled':
      return { label: 'Cancelled', textClass: 'text-zinc-400' };
    default:
      return { label: String(status), textClass: 'text-zinc-300' };
  }
}

export const BatchProcessorModule: React.FC<BatchProcessorModuleProps> = ({
  onInjectIntoChat
}) => {
  // Queue & Runner State
  const [runnerStatus, setRunnerStatus] = useState<RunnerStatusResponse | null>(null);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  // Active Workspace View ('monitor' | 'builder')
  const [workspaceTab, setWorkspaceTab] = useState<'monitor' | 'builder'>('monitor');

  // Job Filter & Selection
  const [jobStatusFilter, setJobStatusFilter] = useState<'all' | 'active' | 'completed' | 'failed'>('all');
  const [jobSearch, setJobSearch] = useState<string>('');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJobDetail, setSelectedJobDetail] = useState<{ job: BatchJobRecord; tasks: BatchTaskRecord[] } | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'output' | 'diff' | 'input'>('output');

  // Builder Form State
  const [jobName, setJobName] = useState<string>('Workspace Source SHA-256 Audit');
  const [jobDescription, setJobDescription] = useState<string>('Background cryptographic integrity and entropy scan across utility modules.');
  const [operation, setOperation] = useState<BatchOperationType>('file_hash_manifest');
  const [priority, setPriority] = useState<BatchJobPriority>('normal');
  const [maxRetries, setMaxRetries] = useState<number>(1);
  const [startPaused, setStartPaused] = useState<boolean>(false);

  // Operation Config Fields
  const [searchPattern, setSearchPattern] = useState<string>('');
  const [replaceWith, setReplaceWith] = useState<string>('');
  const [isRegex, setIsRegex] = useState<boolean>(false);
  const [regexFlags, setRegexFlags] = useState<string>('g');
  const [dryRun, setDryRun] = useState<boolean>(false);
  const [verifyCompile, setVerifyCompile] = useState<boolean>(false);

  const [trimTrailingWhitespace, setTrimTrailingWhitespace] = useState<boolean>(true);
  const [collapseBlankLines, setCollapseBlankLines] = useState<boolean>(false);
  const [jsonMode, setJsonMode] = useState<'none' | 'pretty' | 'minify'>('pretty');
  const [headerBanner, setHeaderBanner] = useState<string>('');

  const [targetFormat, setTargetFormat] = useState<'json' | 'csv' | 'ndjson' | 'tsv' | 'html' | 'md'>('json');
  const [outputDir, setOutputDir] = useState<string>('');
  const [inPlace, setInPlace] = useState<boolean>(true);
  const [manifestOutputPath, setManifestOutputPath] = useState<string>('data/batch_manifests/latest_manifest.json');

  const [inputFormat, setInputFormat] = useState<'auto' | 'json' | 'csv' | 'ndjson' | 'tsv'>('auto');
  const [outputFormat, setOutputFormat] = useState<'json' | 'csv' | 'ndjson' | 'tsv' | 'markdown'>('json');
  const [selectFieldsRaw, setSelectFieldsRaw] = useState<string>('');
  const [filterField, setFilterField] = useState<string>('');
  const [filterOp, setFilterOp] = useState<'eq' | 'neq' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte' | 'exists'>('gt');
  const [filterValue, setFilterValue] = useState<string>('');
  const [dedupeKey, setDedupeKey] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [jsCode, setJsCode] = useState<string>(
    `const rows = Array.isArray(input) ? input : [input];\nreturn rows.map((item, idx) => ({\n  index: idx + 1,\n  processedAt: new Date().toISOString(),\n  payload: item\n}));`
  );
  const [aiInstruction, setAiInstruction] = useState<string>(
    'Extract key structured entities, technical metrics, and a concise summary.'
  );

  // Directory Discovery & Staged Tasks
  const [scanDirPath, setScanDirPath] = useState<string>('src/utils');
  const [scanExtensions, setScanExtensions] = useState<string>('.ts');
  const [scanNamePattern, setScanNamePattern] = useState<string>('');
  const [scanningFiles, setScanningFiles] = useState<boolean>(false);
  const [discoveredFiles, setDiscoveredFiles] = useState<DiscoveredFileItem[]>([]);
  const [selectedDiscoveredPaths, setSelectedDiscoveredPaths] = useState<Set<string>>(new Set());

  const [manualFilePath, setManualFilePath] = useState<string>('');
  const [manualOutputPath, setManualOutputPath] = useState<string>('');
  const [manualDataLabel, setManualDataLabel] = useState<string>('Dataset Batch #1');
  const [manualDataPayload, setManualDataPayload] = useState<string>('');

  const [stagedTasks, setStagedTasks] = useState<StagedTaskItem[]>([]);
  const [submittingJob, setSubmittingJob] = useState<boolean>(false);

  const fetchStatus = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setStatusError(null);
      const res = await apiFetch('/api/batch/status');
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load batch processor status');
      }
      setRunnerStatus(data);
      setSelectedJobId((prev) => {
        if (prev && data.jobs.some((j: BatchJobRecord) => j.id === prev)) return prev;
        return data.jobs.length > 0 ? data.jobs[0].id : null;
      });
    } catch (err: any) {
      if (!quiet) setStatusError(err?.message || 'Unable to reach batch processor service');
    } finally {
      setLoadingInitial(false);
    }
  }, []);

  const fetchJobDetail = useCallback(async (jobId: string) => {
    try {
      const res = await apiFetch(`/api/batch/jobs/${encodeURIComponent(jobId)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedJobDetail({ job: data.job, tasks: data.tasks });
        setSelectedTaskId((prev) => {
          if (prev && data.tasks.some((t: BatchTaskRecord) => t.id === prev)) return prev;
          return data.tasks.length > 0 ? data.tasks[0].id : null;
        });
      }
    } catch {}
  }, []);

  useEffect(() => {
    void fetchStatus(false);
  }, [fetchStatus]);

  useEffect(() => {
    if (selectedJobId) {
      void fetchJobDetail(selectedJobId);
    } else {
      setSelectedJobDetail(null);
      setSelectedTaskId(null);
    }
  }, [selectedJobId, fetchJobDetail]);

  const hasActiveWork = useMemo(() => {
    if (!runnerStatus) return false;
    return runnerStatus.counts.runningJobs > 0 || runnerStatus.counts.queuedJobs > 0 || runnerStatus.activeWorkers > 0;
  }, [runnerStatus]);

  useEffect(() => {
    const intervalMs = hasActiveWork ? 1200 : 5000;
    const timer = setInterval(() => {
      void fetchStatus(true);
      if (selectedJobId) {
        void fetchJobDetail(selectedJobId);
      }
    }, intervalMs);
    return () => clearInterval(timer);
  }, [hasActiveWork, selectedJobId, fetchStatus, fetchJobDetail]);

  const filteredJobs = useMemo(() => {
    const list = runnerStatus?.jobs || [];
    const q = jobSearch.trim().toLowerCase();
    return list.filter((j) => {
      if (jobStatusFilter === 'active' && !['queued', 'running', 'paused'].includes(j.status)) return false;
      if (jobStatusFilter === 'completed' && !['completed', 'completed_with_errors'].includes(j.status)) return false;
      if (jobStatusFilter === 'failed' && !['failed', 'cancelled'].includes(j.status)) return false;
      if (q && !j.name.toLowerCase().includes(q) && !j.operation.toLowerCase().includes(q) && !j.id.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [runnerStatus, jobStatusFilter, jobSearch]);

  const activeTask = useMemo(() => {
    if (!selectedJobDetail || !selectedTaskId) return null;
    return selectedJobDetail.tasks.find((t) => t.id === selectedTaskId) || selectedJobDetail.tasks[0] || null;
  }, [selectedJobDetail, selectedTaskId]);

  const currentOperationMeta = useMemo(
    () => OPERATION_CATALOG.find((o) => o.id === operation) || OPERATION_CATALOG[0],
    [operation]
  );

  const handleRunnerControl = async (action: 'pause' | 'resume' | 'set_concurrency' | 'clear_completed', value?: number) => {
    try {
      const res = await apiFetch('/api/batch/runner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, concurrency: value })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Runner command failed');
      setRunnerStatus(data);
      if (action === 'clear_completed') {
        setBannerNotice('Cleared finished jobs from batch history.');
      }
    } catch (err: any) {
      setStatusError(err?.message || 'Failed to update runner');
    }
  };

  const handleJobAction = async (jobId: string, action: 'pause' | 'resume' | 'cancel' | 'retry_failed' | 'rollback' | 'delete') => {
    try {
      const res = await apiFetch(`/api/batch/jobs/${encodeURIComponent(jobId)}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (!res.ok && !data.message) {
        throw new Error(data.error || `Failed to ${action} job`);
      }
      if (data.message) setBannerNotice(data.message);
      if (action === 'delete' && selectedJobId === jobId) {
        setSelectedJobId(null);
      }
      await fetchStatus(true);
      if (action !== 'delete' && selectedJobId === jobId) {
        await fetchJobDetail(jobId);
      }
    } catch (err: any) {
      setStatusError(err?.message || `Action ${action} failed`);
    }
  };

  const handleScanDirectory = async () => {
    setScanningFiles(true);
    setStatusError(null);
    try {
      const exts = scanExtensions
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await apiFetch('/api/batch/preview-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dirPath: scanDirPath.trim() || '.',
          extensions: exts,
          namePattern: scanNamePattern.trim() || undefined,
          recursive: true,
          maxFiles: 80
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Directory scan failed');
      }
      setDiscoveredFiles(data.matchedFiles || []);
      setSelectedDiscoveredPaths(new Set((data.matchedFiles || []).slice(0, 12).map((f: DiscoveredFileItem) => f.path)));
    } catch (err: any) {
      setStatusError(err?.message || 'Failed to scan directory');
    } finally {
      setScanningFiles(false);
    }
  };

  const handleStageDiscoveredFiles = () => {
    const existingPaths = new Set(stagedTasks.map((t) => t.filePath).filter(Boolean));
    const additions: StagedTaskItem[] = [];
    for (const f of discoveredFiles) {
      if (selectedDiscoveredPaths.has(f.path) && !existingPaths.has(f.path)) {
        additions.push({
          uid: `st-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          label: f.path.split('/').pop() || f.path,
          filePath: f.path
        });
      }
    }
    if (additions.length > 0) {
      setStagedTasks((prev) => [...prev, ...additions]);
      setBannerNotice(`Added ${additions.length} file target(s) to staged batch queue.`);
    }
  };

  const handleAddManualFileTask = () => {
    const fp = manualFilePath.trim();
    if (!fp) return;
    setStagedTasks((prev) => [
      ...prev,
      {
        uid: `st-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        label: fp.split('/').pop() || fp,
        filePath: fp,
        outputPath: manualOutputPath.trim() || undefined
      }
    ]);
    setManualFilePath('');
    setManualOutputPath('');
  };

  const handleAddManualDataTask = () => {
    const payload = manualDataPayload.trim();
    if (!payload) return;
    const lbl = manualDataLabel.trim() || `Data Chunk #${stagedTasks.length + 1}`;
    setStagedTasks((prev) => [
      ...prev,
      {
        uid: `st-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        label: lbl,
        inputData: payload,
        outputPath: manualOutputPath.trim() || undefined
      }
    ]);
    setManualDataLabel(`Dataset Batch #${stagedTasks.length + 2}`);
    setManualDataPayload('');
    setManualOutputPath('');
  };

  const applyPreset = (presetId: 'hash_audit' | 'csv_etl' | 'js_sandbox' | 'format_clean') => {
    setStatusError(null);
    if (presetId === 'hash_audit') {
      setJobName('Workspace Utility SHA-256 & Entropy Manifest');
      setJobDescription('Computes SHA-256, SHA-512, line counts, and byte entropy across core utility files.');
      setOperation('file_hash_manifest');
      setPriority('high');
      setManifestOutputPath('data/batch_manifests/utils_sha256_manifest.json');
      setStagedTasks([
        { uid: 'p1', label: 'OrchestratorRuntime.ts', filePath: 'src/utils/OrchestratorRuntime.ts' },
        { uid: 'p2', label: 'functionEngine.ts', filePath: 'src/utils/functionEngine.ts' },
        { uid: 'p3', label: 'sovereignQuantumKernel.ts', filePath: 'src/utils/sovereignQuantumKernel.ts' },
        { uid: 'p4', label: 'autonomousSelfImprovement.ts', filePath: 'src/utils/autonomousSelfImprovement.ts' }
      ]);
      setBannerNotice('Loaded 4-file SHA-256 & Entropy Manifest preset.');
    } else if (presetId === 'csv_etl') {
      setJobName('Multi-Region Telemetry CSV -> JSON ETL');
      setJobDescription('Parses 3 regional CSV telemetry shards, filters latency_ms > 20, deduplicates by node_id, and sorts descending.');
      setOperation('data_json_csv_etl');
      setPriority('high');
      setInputFormat('csv');
      setOutputFormat('json');
      setFilterField('latency_ms');
      setFilterOp('gt');
      setFilterValue('20');
      setDedupeKey('node_id');
      setSelectFieldsRaw('node_id,region,latency_ms,throughput_rps');
      setSortBy('throughput_rps');
      setSortOrder('desc');
      setStagedTasks([
        {
          uid: 'etl1',
          label: 'us-west-shard.csv',
          outputPath: 'data/batch_outputs/us_west_normalized.json',
          inputData: 'node_id,region,latency_ms,throughput_rps\nn-101,us-west,42,1840\nn-102,us-west,14,910\nn-101,us-west,42,1840\nn-103,us-west,67,2420'
        },
        {
          uid: 'etl2',
          label: 'eu-central-shard.csv',
          outputPath: 'data/batch_outputs/eu_central_normalized.json',
          inputData: 'node_id,region,latency_ms,throughput_rps\nn-201,eu-central,31,1590\nn-202,eu-central,11,640\nn-203,eu-central,55,3120'
        },
        {
          uid: 'etl3',
          label: 'ap-northeast-shard.csv',
          outputPath: 'data/batch_outputs/ap_northeast_normalized.json',
          inputData: 'node_id,region,latency_ms,throughput_rps\nn-301,ap-northeast,28,2190\nn-302,ap-northeast,84,1290\nn-303,ap-northeast,16,800'
        }
      ]);
      setBannerNotice('Loaded 3-shard CSV -> JSON ETL pipeline preset.');
    } else if (presetId === 'js_sandbox') {
      setJobName('Batch Cryptographic & Statistical Record Transform');
      setJobDescription('Executes custom async JS statistical & SHA-256 enrichment across 3 JSON payload batches.');
      setOperation('data_js_transform');
      setPriority('normal');
      setJsCode(
        `const items = Array.isArray(input) ? input : [input];\nconst values = items.map(x => Number(x.amount || 0));\nconst total = values.reduce((a, b) => a + b, 0);\nconst mean = values.length ? Number((total / values.length).toFixed(2)) : 0;\nconst digest = crypto.createHash('sha256').update(JSON.stringify(items)).digest('hex').slice(0, 24);\nreturn { batchLabel: args.label, count: items.length, total, mean, sha256: digest, items };`
      );
      setStagedTasks([
        {
          uid: 'js1',
          label: 'Ledger Window A',
          inputData: JSON.stringify([{ id: 'tx_1', amount: 420.5 }, { id: 'tx_2', amount: 980.0 }, { id: 'tx_3', amount: 315.25 }])
        },
        {
          uid: 'js2',
          label: 'Ledger Window B',
          inputData: JSON.stringify([{ id: 'tx_4', amount: 1250.0 }, { id: 'tx_5', amount: 640.75 }])
        },
        {
          uid: 'js3',
          label: 'Ledger Window C',
          inputData: JSON.stringify([{ id: 'tx_6', amount: 88.4 }, { id: 'tx_7', amount: 512.6 }, { id: 'tx_8', amount: 730.0 }])
        }
      ]);
      setBannerNotice('Loaded 3-batch Async JS Sandbox transform preset.');
    } else if (presetId === 'format_clean') {
      setJobName('Dry-Run Whitespace & Line-Ending Normalization');
      setJobDescription('Previews CRLF and trailing whitespace normalization across selected workspace files without mutating disk.');
      setOperation('file_format_normalize');
      setDryRun(true);
      setTrimTrailingWhitespace(true);
      setCollapseBlankLines(false);
      setStagedTasks([
        { uid: 'fc1', label: 'metadata.json', filePath: 'metadata.json' },
        { uid: 'fc2', label: 'src/types/index.ts', filePath: 'src/types/index.ts' }
      ]);
      setBannerNotice('Loaded Dry-Run Format Normalization preset.');
    }
  };

  const handleEnqueueJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stagedTasks.length === 0) {
      setStatusError('Stage at least one file or data item in the queue list before starting the batch job.');
      return;
    }
    setSubmittingJob(true);
    setStatusError(null);
    try {
      const selectFields = selectFieldsRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const config = {
        searchPattern: searchPattern || undefined,
        replaceWith,
        isRegex,
        regexFlags: regexFlags || 'g',
        dryRun,
        verifyCompile,
        normalizeLineEndings: true,
        trimTrailingWhitespace,
        collapseBlankLines,
        jsonMode,
        headerBanner: headerBanner.trim() || undefined,
        targetFormat,
        outputDir: outputDir.trim() || undefined,
        inPlace,
        manifestOutputPath: operation === 'file_hash_manifest' && manifestOutputPath.trim() ? manifestOutputPath.trim() : undefined,
        inputFormat,
        outputFormat,
        selectFields: selectFields.length > 0 ? selectFields : undefined,
        filterField: filterField.trim() || undefined,
        filterOp,
        filterValue: filterValue || undefined,
        dedupeKey: dedupeKey.trim() || undefined,
        sortBy: sortBy.trim() || undefined,
        sortOrder,
        jsCode: operation === 'data_js_transform' ? jsCode : undefined,
        instruction: operation === 'file_ai_transform' || operation === 'data_ai_process' ? aiInstruction : undefined
      };

      const res = await apiFetch('/api/batch/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: jobName.trim() || `${operation} (${stagedTasks.length} items)`,
          description: jobDescription.trim(),
          operation,
          priority,
          maxRetries,
          startPaused,
          config,
          tasks: stagedTasks.map((t) => ({
            label: t.label,
            filePath: t.filePath,
            outputPath: t.outputPath,
            inputData: t.inputData
          }))
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to enqueue batch job');
      }

      setBannerNotice(`Enqueued "${data.job.name}" with ${data.job.totalTasks} background task(s).`);
      setSelectedJobId(data.job.id);
      setSelectedJobDetail({ job: data.job, tasks: data.tasks || [] });
      if (data.tasks?.length) setSelectedTaskId(data.tasks[0].id);
      setWorkspaceTab('monitor');
      await fetchStatus(true);
    } catch (err: any) {
      setStatusError(err?.message || 'Failed to enqueue batch job');
    } finally {
      setSubmittingJob(false);
    }
  };

  const handleExportJobReport = (format: 'json' | 'csv') => {
    if (!selectedJobDetail) return;
    const { job, tasks } = selectedJobDetail;
    let content = '';
    let mime = 'application/json';
    let ext = 'json';

    if (format === 'json') {
      content = JSON.stringify({ exportedAt: new Date().toISOString(), job, tasks }, null, 2);
    } else {
      mime = 'text/csv';
      ext = 'csv';
      const esc = (v: any) => {
        const s = v === null || v === undefined ? '' : String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const lines = [
        ['seq', 'label', 'operation', 'status', 'filePath', 'outputPath', 'bytesProcessed', 'recordsProcessed', 'elapsedMs', 'summary', 'error'].join(',')
      ];
      for (const t of tasks) {
        lines.push([
          t.seq,
          esc(t.label),
          esc(t.operation),
          esc(t.status),
          esc(t.filePath),
          esc(t.outputPath),
          t.bytesProcessed,
          t.recordsProcessed,
          t.elapsedMs,
          esc(t.outputSummary),
          esc(t.errorMessage)
        ].join(','));
      }
      content = lines.join('\n');
    }

    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${job.id}-report.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSendJobSummaryToChat = () => {
    if (!selectedJobDetail || !onInjectIntoChat) return;
    const { job, tasks } = selectedJobDetail;
    const taskLines = tasks
      .slice(0, 12)
      .map((t) => `- [${t.status.toUpperCase()}] ${t.label}: ${t.outputSummary || t.errorMessage || 'Pending'} (${t.elapsedMs} ms)`)
      .join('\n');
    const summaryPrompt = [
      `Inspect completed Autonomous Batch Processor job "${job.name}" (${job.id}):`,
      `Operation: ${job.operation} · Status: ${job.status} · Completed: ${job.completedTasks}/${job.totalTasks} · Bytes: ${formatBytes(job.bytesProcessed)} · Elapsed: ${formatDuration(job.elapsedMs)}`,
      job.manifestPath ? `Manifest File: ${job.manifestPath}` : '',
      'Task Breakdown:',
      taskLines
    ].filter(Boolean).join('\n');
    onInjectIntoChat(summaryPrompt);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Top Workspace Header & Runner Controls */}
      <div className="px-5 py-3.5 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4 shrink-0 bg-zinc-950">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-zinc-100 tracking-tight truncate">
            Autonomous Batch Processor
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 mt-0.5 font-mono tabular-nums">
            <span className={runnerStatus?.isPaused ? 'text-amber-400' : 'text-emerald-400'}>
              {runnerStatus?.isPaused ? 'Queue Paused' : 'Queue Active'}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Workers {runnerStatus?.activeWorkers ?? 0}/{runnerStatus?.concurrency ?? 3}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {runnerStatus?.counts.runningJobs ?? 0} running / {runnerStatus?.counts.queuedJobs ?? 0} queued / {runnerStatus?.counts.completedJobs ?? 0} completed
            </span>
          </div>
        </div>

        {/* Interactive Mode Switch & Runner Toolbar */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg">
            <button
              type="button"
              onClick={() => setWorkspaceTab('monitor')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                workspaceTab === 'monitor'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Queue Monitor ({runnerStatus?.counts.totalJobs ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setWorkspaceTab('builder')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                workspaceTab === 'builder'
                  ? 'bg-amber-500 text-zinc-950 font-semibold'
                  : 'text-zinc-300 hover:text-zinc-100'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Batch Pipeline</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <label className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5">
              <span className="whitespace-nowrap">Concurrency</span>
              <select
                value={runnerStatus?.concurrency ?? 3}
                onChange={(e) => handleRunnerControl('set_concurrency', Number(e.target.value))}
                className="bg-transparent text-zinc-100 font-mono tabular-nums focus:outline-none cursor-pointer"
                aria-label="Worker concurrency"
              >
                {[1, 2, 3, 4, 6, 8].map((n) => (
                  <option key={n} value={n} className="bg-zinc-900 text-zinc-100">
                    {n}x
                  </option>
                ))}
              </select>
            </label>

            {runnerStatus?.isPaused ? (
              <button
                type="button"
                onClick={() => handleRunnerControl('resume')}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Resume Queue</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleRunnerControl('pause')}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Pause className="w-3.5 h-3.5 text-amber-400" />
                <span>Pause Queue</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => fetchStatus(false)}
              className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-zinc-100 transition-colors cursor-pointer shrink-0"
              title="Refresh queue state"
              aria-label="Refresh queue state"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {(statusError || bannerNotice) && (
        <div
          className={`px-5 py-2.5 border-b flex items-center justify-between gap-3 text-xs shrink-0 ${
            statusError
              ? 'bg-rose-950/40 border-rose-800/60 text-rose-200'
              : 'bg-zinc-900/90 border-zinc-800 text-zinc-200'
          }`}
        >
          <span className="truncate">{statusError || bannerNotice}</span>
          <button
            type="button"
            onClick={() => {
              setStatusError(null);
              setBannerNotice(null);
            }}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 cursor-pointer shrink-0"
            aria-label="Dismiss message"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Content Body */}
      {workspaceTab === 'builder' ? (
        <div className="flex-1 overflow-y-auto p-5">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Quick-Load Real Templates */}
            <div className="border border-zinc-800 rounded-xl p-4 bg-zinc-900/30 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">Quick-Load Pipeline Templates</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Populate real multi-file or multi-dataset batch configurations ready to enqueue immediately.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset('hash_audit')}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs text-zinc-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  SHA-256 Workspace Manifest
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('csv_etl')}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs text-zinc-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  3-Shard CSV to JSON ETL
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('js_sandbox')}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs text-zinc-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  JS Statistical & Hash Mapper
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('format_clean')}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs text-zinc-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Dry-Run Format Normalizer
                </button>
              </div>
            </div>

            <form onSubmit={handleEnqueueJob} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Pipeline Definition & Operation Parameters */}
              <div className="lg:col-span-6 border border-zinc-800 rounded-xl p-5 bg-zinc-900/20 space-y-4">
                <h3 className="text-sm font-semibold text-zinc-100">01. Pipeline Operation & Parameters</h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-zinc-400 mb-1">Batch Job Name</label>
                    <input
                      type="text"
                      required
                      value={jobName}
                      onChange={(e) => setJobName(e.target.value)}
                      placeholder="e.g. Normalize TypeScript Headers"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500/60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Queue Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as BatchJobPriority)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500/60"
                    >
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="normal">Normal</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Transformation / Data Processing Engine</label>
                  <select
                    value={operation}
                    onChange={(e) => setOperation(e.target.value as BatchOperationType)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500/60"
                  >
                    <optgroup label="File Transformations">
                      {OPERATION_CATALOG.filter((o) => o.mode === 'file').map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Data Processing Pipelines">
                      {OPERATION_CATALOG.filter((o) => o.mode === 'data').map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                    {currentOperationMeta.summary}
                  </p>
                </div>

                {/* Dynamic Operation Settings */}
                {operation === 'file_regex_replace' && (
                  <div className="pt-2 border-t border-zinc-800/80 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Search Pattern</label>
                        <input
                          type="text"
                          value={searchPattern}
                          onChange={(e) => setSearchPattern(e.target.value)}
                          placeholder="Literal text or RegExp"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Replacement Content</label>
                        <input
                          type="text"
                          value={replaceWith}
                          onChange={(e) => setReplaceWith(e.target.value)}
                          placeholder="Replacement string ($1 supported)"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-300">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={isRegex} onChange={(e) => setIsRegex(e.target.checked)} />
                        <span>Regular Expression</span>
                      </label>
                      {isRegex && (
                        <input
                          type="text"
                          value={regexFlags}
                          onChange={(e) => setRegexFlags(e.target.value)}
                          placeholder="Flags (gim)"
                          className="w-20 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs font-mono"
                        />
                      )}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
                        <span>Dry Run Only</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={verifyCompile} onChange={(e) => setVerifyCompile(e.target.checked)} />
                        <span>Verify TypeScript Compile</span>
                      </label>
                    </div>
                  </div>
                )}

                {operation === 'file_format_normalize' && (
                  <div className="pt-2 border-t border-zinc-800/80 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">JSON Formatting Mode</label>
                        <select
                          value={jsonMode}
                          onChange={(e) => setJsonMode(e.target.value as 'none' | 'pretty' | 'minify')}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100"
                        >
                          <option value="pretty">Pretty-Print JSON (2 spaces)</option>
                          <option value="minify">Minify JSON</option>
                          <option value="none">Leave JSON Unchanged</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Optional Output Directory</label>
                        <input
                          type="text"
                          value={outputDir}
                          onChange={(e) => setOutputDir(e.target.value)}
                          placeholder="Blank = update in-place"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Optional Header Banner (for .ts/.tsx/.js/.css)</label>
                      <input
                        type="text"
                        value={headerBanner}
                        onChange={(e) => setHeaderBanner(e.target.value)}
                        placeholder="Optional comment banner to prepend if absent"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-300">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={trimTrailingWhitespace} onChange={(e) => setTrimTrailingWhitespace(e.target.checked)} />
                        <span>Trim Trailing Spaces</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={collapseBlankLines} onChange={(e) => setCollapseBlankLines(e.target.checked)} />
                        <span>Collapse 3+ Blank Lines</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
                        <span>Dry Run Preview</span>
                      </label>
                    </div>
                  </div>
                )}

                {operation === 'file_convert_projection' && (
                  <div className="pt-2 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Target File Format</label>
                      <select
                        value={targetFormat}
                        onChange={(e) => setTargetFormat(e.target.value as any)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100"
                      >
                        <option value="json">JSON (.json)</option>
                        <option value="csv">CSV (.csv)</option>
                        <option value="ndjson">NDJSON (.ndjson)</option>
                        <option value="tsv">TSV (.tsv)</option>
                        <option value="html">HTML Document (.html from Markdown)</option>
                        <option value="md">Markdown Table (.md)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Output Directory</label>
                      <input
                        type="text"
                        value={outputDir}
                        onChange={(e) => setOutputDir(e.target.value)}
                        placeholder="e.g. data/converted"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100"
                      />
                    </div>
                  </div>
                )}

                {operation === 'file_hash_manifest' && (
                  <div className="pt-2 border-t border-zinc-800/80">
                    <label className="block text-xs text-zinc-400 mb-1">Consolidated Manifest JSON Output Path (Optional)</label>
                    <input
                      type="text"
                      value={manifestOutputPath}
                      onChange={(e) => setManifestOutputPath(e.target.value)}
                      placeholder="data/batch_manifests/audit_manifest.json"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100"
                    />
                  </div>
                )}

                {(operation === 'file_ai_transform' || operation === 'data_ai_process') && (
                  <div className="pt-2 border-t border-zinc-800/80 space-y-3">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Gemini 4 Hydrogen Transformation Directive</label>
                      <textarea
                        rows={3}
                        value={aiInstruction}
                        onChange={(e) => setAiInstruction(e.target.value)}
                        placeholder="Describe exact code transformation, refactoring, or structured data extraction..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100"
                      />
                    </div>
                    {operation === 'file_ai_transform' && (
                      <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-300">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={inPlace} onChange={(e) => setInPlace(e.target.checked)} />
                          <span>Write In-Place (creates rollback snapshot)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={verifyCompile} onChange={(e) => setVerifyCompile(e.target.checked)} />
                          <span>Verify TypeScript Compile</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
                          <span>Dry Run Only</span>
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {operation === 'data_json_csv_etl' && (
                  <div className="pt-2 border-t border-zinc-800/80 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Input Format</label>
                        <select
                          value={inputFormat}
                          onChange={(e) => setInputFormat(e.target.value as any)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-2 text-xs text-zinc-100"
                        >
                          <option value="auto">Auto-Detect</option>
                          <option value="csv">CSV</option>
                          <option value="json">JSON</option>
                          <option value="ndjson">NDJSON</option>
                          <option value="tsv">TSV</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Output Format</label>
                        <select
                          value={outputFormat}
                          onChange={(e) => setOutputFormat(e.target.value as any)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-2 text-xs text-zinc-100"
                        >
                          <option value="json">JSON</option>
                          <option value="csv">CSV</option>
                          <option value="ndjson">NDJSON</option>
                          <option value="tsv">TSV</option>
                          <option value="markdown">Markdown Table</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Dedupe Key</label>
                        <input
                          type="text"
                          value={dedupeKey}
                          onChange={(e) => setDedupeKey(e.target.value)}
                          placeholder="e.g. id"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-2 text-xs font-mono text-zinc-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={filterField}
                        onChange={(e) => setFilterField(e.target.value)}
                        placeholder="Filter column"
                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-2 text-xs font-mono text-zinc-100"
                      />
                      <select
                        value={filterOp}
                        onChange={(e) => setFilterOp(e.target.value as any)}
                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-2 text-xs text-zinc-100"
                      >
                        <option value="eq">Equals (=)</option>
                        <option value="neq">Not Equal (!=)</option>
                        <option value="contains">Contains</option>
                        <option value="gt">Greater Than (&gt;)</option>
                        <option value="gte">Greater or Equal (&gt;=)</option>
                        <option value="lt">Less Than (&lt;)</option>
                        <option value="lte">Less or Equal (&lt;=)</option>
                        <option value="exists">Non-Empty</option>
                      </select>
                      <input
                        type="text"
                        value={filterValue}
                        onChange={(e) => setFilterValue(e.target.value)}
                        placeholder="Filter value"
                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-2 text-xs font-mono text-zinc-100"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={selectFieldsRaw}
                        onChange={(e) => setSelectFieldsRaw(e.target.value)}
                        placeholder="Select fields (comma-sep)"
                        className="sm:col-span-2 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-2 text-xs font-mono text-zinc-100"
                      />
                      <input
                        type="text"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        placeholder="Sort column"
                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-2 text-xs font-mono text-zinc-100"
                      />
                    </div>
                  </div>
                )}

                {operation === 'data_js_transform' && (
                  <div className="pt-2 border-t border-zinc-800/80">
                    <label className="block text-xs text-zinc-400 mb-1">
                      Async JavaScript Transform Body (receives <code className="text-amber-300">input</code>, <code className="text-amber-300">args</code>, <code className="text-amber-300">crypto</code>)
                    </label>
                    <textarea
                      rows={5}
                      value={jsCode}
                      onChange={(e) => setJsCode(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100"
                    />
                  </div>
                )}

                <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-4 text-xs text-zinc-300">
                    <label className="flex items-center gap-1.5">
                      <span>Max Retries</span>
                      <select
                        value={maxRetries}
                        onChange={(e) => setMaxRetries(Number(e.target.value))}
                        className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 font-mono tabular-nums"
                      >
                        {[0, 1, 2, 3].map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={startPaused} onChange={(e) => setStartPaused(e.target.checked)} />
                      <span>Enqueue Paused</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingJob || stagedTasks.length === 0}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {submittingJob ? 'Enqueuing...' : `Start Batch Job (${stagedTasks.length} Items)`}
                  </button>
                </div>
              </div>

              {/* Right Column: Multi-File Discovery & Data Item Stager */}
              <div className="lg:col-span-6 border border-zinc-800 rounded-xl p-5 bg-zinc-900/20 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-zinc-100">02. Queue Target Files or Data Chunks</h3>
                  <span className="text-xs font-mono tabular-nums text-zinc-400">
                    {stagedTasks.length} staged
                  </span>
                </div>

                {/* Directory Discovery Box */}
                <div className="space-y-2.5 pb-4 border-b border-zinc-800/80">
                  <div className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                    <FolderSearch className="w-3.5 h-3.5 text-amber-400" />
                    <span>Scan Workspace Directory for Multi-File Batching</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <input
                      type="text"
                      value={scanDirPath}
                      onChange={(e) => setScanDirPath(e.target.value)}
                      placeholder="Directory (e.g. src/utils)"
                      className="sm:col-span-5 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-zinc-100"
                    />
                    <input
                      type="text"
                      value={scanExtensions}
                      onChange={(e) => setScanExtensions(e.target.value)}
                      placeholder="Exts (.ts,.json)"
                      className="sm:col-span-3 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-zinc-100"
                    />
                    <input
                      type="text"
                      value={scanNamePattern}
                      onChange={(e) => setScanNamePattern(e.target.value)}
                      placeholder="Filter pattern"
                      className="sm:col-span-2 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-zinc-100"
                    />
                    <button
                      type="button"
                      onClick={handleScanDirectory}
                      disabled={scanningFiles}
                      className="sm:col-span-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {scanningFiles ? 'Scanning...' : 'Scan'}
                    </button>
                  </div>

                  {discoveredFiles.length > 0 && (
                    <div className="border border-zinc-800 rounded-lg bg-zinc-950 p-2.5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400 font-mono tabular-nums">
                          Matched {discoveredFiles.length} file(s) · {selectedDiscoveredPaths.size} selected
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedDiscoveredPaths(new Set(discoveredFiles.map((f) => f.path)))}
                            className="text-zinc-300 hover:text-white underline cursor-pointer"
                          >
                            Select All
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedDiscoveredPaths(new Set())}
                            className="text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
                          >
                            None
                          </button>
                          <button
                            type="button"
                            onClick={handleStageDiscoveredFiles}
                            disabled={selectedDiscoveredPaths.size === 0}
                            className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-medium disabled:opacity-40 cursor-pointer whitespace-nowrap"
                          >
                            Add Selected ({selectedDiscoveredPaths.size})
                          </button>
                        </div>
                      </div>
                      <div className="max-h-36 overflow-y-auto divide-y divide-zinc-900">
                        {discoveredFiles.map((f) => {
                          const checked = selectedDiscoveredPaths.has(f.path);
                          return (
                            <button
                              key={f.path}
                              type="button"
                              onClick={() => {
                                setSelectedDiscoveredPaths((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(f.path)) next.delete(f.path);
                                  else next.add(f.path);
                                  return next;
                                });
                              }}
                              className="w-full py-1.5 px-1.5 flex items-center justify-between gap-2 text-left text-xs hover:bg-zinc-900/70 cursor-pointer"
                            >
                              <span className="flex items-center gap-2 min-w-0">
                                {checked ? (
                                  <CheckSquare className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                ) : (
                                  <Square className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                                )}
                                <span className="font-mono text-zinc-200 truncate">{f.path}</span>
                              </span>
                              <span className="font-mono tabular-nums text-zinc-500 shrink-0">
                                {formatBytes(f.sizeBytes)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Add Single File or Inline Dataset Item */}
                <div className="space-y-3 pb-4 border-b border-zinc-800/80">
                  {currentOperationMeta.mode === 'file' ? (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                        <FileCode className="w-3.5 h-3.5 text-sky-400" />
                        <span>Add Individual File Path</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <input
                          type="text"
                          value={manualFilePath}
                          onChange={(e) => setManualFilePath(e.target.value)}
                          placeholder="Source path (e.g. src/types/index.ts)"
                          className="sm:col-span-5 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-zinc-100"
                        />
                        <input
                          type="text"
                          value={manualOutputPath}
                          onChange={(e) => setManualOutputPath(e.target.value)}
                          placeholder="Optional output path"
                          className="sm:col-span-5 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-zinc-100"
                        />
                        <button
                          type="button"
                          onClick={handleAddManualFileTask}
                          className="sm:col-span-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-medium cursor-pointer whitespace-nowrap"
                        >
                          Add File
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Add Inline Dataset Chunk (CSV / JSON / NDJSON / Text) or File</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={manualDataLabel}
                          onChange={(e) => setManualDataLabel(e.target.value)}
                          placeholder="Batch item label"
                          className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100"
                        />
                        <input
                          type="text"
                          value={manualOutputPath}
                          onChange={(e) => setManualOutputPath(e.target.value)}
                          placeholder="Optional output file (e.g. data/out.json)"
                          className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-zinc-100"
                        />
                      </div>
                      <textarea
                        rows={3}
                        value={manualDataPayload}
                        onChange={(e) => setManualDataPayload(e.target.value)}
                        placeholder="Paste CSV rows, JSON array, NDJSON lines, or raw text..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-2 text-xs font-mono text-zinc-100"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleAddManualDataTask}
                          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-medium cursor-pointer whitespace-nowrap"
                        >
                          Add Data Item to Queue
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Staged Queue Items Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-300">Staged Task Queue</span>
                    {stagedTasks.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setStagedTasks([])}
                        className="text-zinc-400 hover:text-rose-400 cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {stagedTasks.length === 0 ? (
                    <div className="py-8 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
                      No tasks staged yet. Scan a workspace directory, add a file/dataset, or click a Pipeline Template above.
                    </div>
                  ) : (
                    <div className="max-h-56 overflow-y-auto divide-y divide-zinc-800/70 border border-zinc-800 rounded-lg bg-zinc-950">
                      {stagedTasks.map((item, idx) => (
                        <div key={item.uid} className="px-3 py-2 flex items-center justify-between gap-3 text-xs">
                          <div className="min-w-0 flex items-center gap-2.5">
                            <span className="font-mono tabular-nums text-zinc-500 w-5 shrink-0">
                              {idx + 1}.
                            </span>
                            <div className="min-w-0">
                              <div className="font-medium text-zinc-200 truncate">{item.label}</div>
                              <div className="text-[11px] text-zinc-500 font-mono truncate">
                                {item.filePath
                                  ? `${item.filePath}${item.outputPath ? ` -> ${item.outputPath}` : ''}`
                                  : `${(item.inputData || '').slice(0, 70)}${(item.inputData || '').length > 70 ? '…' : ''}`}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setStagedTasks((prev) => prev.filter((x) => x.uid !== item.uid))}
                            className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 cursor-pointer shrink-0"
                            aria-label="Remove staged item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* Queue Monitor & Master-Detail Task Inspector */
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800 overflow-hidden">
          {/* Left Pane: Batch Jobs List */}
          <div className="lg:col-span-5 flex flex-col min-h-0 overflow-hidden">
            <div className="p-3.5 border-b border-zinc-800 space-y-2.5 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="relative flex-1 min-w-0">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={jobSearch}
                    onChange={(e) => setJobSearch(e.target.value)}
                    placeholder="Filter jobs by name or operation..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                {(runnerStatus?.counts.completedJobs ?? 0) + (runnerStatus?.counts.failedJobs ?? 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => handleRunnerControl('clear_completed')}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Clear Finished
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-lg overflow-x-auto scrollbar-none">
                {([
                  { id: 'all', label: 'All Jobs' },
                  { id: 'active', label: 'Active & Queued' },
                  { id: 'completed', label: 'Completed' },
                  { id: 'failed', label: 'Failed' }
                ] as const).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setJobStatusFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      jobStatusFilter === tab.id
                        ? 'bg-zinc-800 text-zinc-100'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/70">
              {loadingInitial ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map((k) => (
                    <div key={k} className="h-16 rounded-lg bg-zinc-900/60 animate-pulse" />
                  ))}
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <p className="text-sm font-medium text-zinc-300">No Batch Jobs in Queue</p>
                  <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed">
                    Queue multi-file code/document transformations or multi-dataset ETL jobs to process asynchronously in the background.
                  </p>
                  <button
                    type="button"
                    onClick={() => setWorkspaceTab('builder')}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Create First Batch Job
                  </button>
                </div>
              ) : (
                filteredJobs.map((job) => {
                  const st = getStatusLabelAndColor(job.status);
                  const selected = job.id === selectedJobId;
                  return (
                    <button
                      key={job.id}
                      type="button"
                      onClick={() => setSelectedJobId(job.id)}
                      className={`w-full px-4 py-3.5 text-left transition-colors cursor-pointer ${
                        selected ? 'bg-zinc-900/90' : 'hover:bg-zinc-900/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-zinc-100 truncate">
                          {job.name}
                        </span>
                        <span className={`text-xs font-medium shrink-0 ${st.textClass}`}>
                          {st.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-400 mt-1 font-mono tabular-nums">
                        <span>{job.operation}</span>
                        <span aria-hidden="true">·</span>
                        <span>Priority {job.priority}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {job.completedTasks}/{job.totalTasks} done
                        </span>
                        {job.failedTasks > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-rose-400">{job.failedTasks} failed</span>
                          </>
                        )}
                      </div>

                      <div className="mt-2.5 flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-opacity duration-150 ${
                              job.status === 'failed'
                                ? 'bg-rose-500'
                                : job.status === 'running'
                                  ? 'bg-sky-400'
                                  : 'bg-emerald-500'
                            }`}
                            style={{ width: `${job.progressPct}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono tabular-nums text-zinc-400 w-10 text-right shrink-0">
                          {job.progressPct}%
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Pane: Selected Job Controls, Task Data Grid & Output Inspector */}
          <div className="lg:col-span-7 flex flex-col min-h-0 overflow-hidden">
            {!selectedJobDetail ? (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-xs text-zinc-500">
                Select a batch job on the left to inspect per-task progress, unified diffs, and processed outputs.
              </div>
            ) : (
              <>
                {/* Selected Job Summary & Actions */}
                <div className="p-4 border-b border-zinc-800 space-y-3 shrink-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-zinc-100 truncate">
                        {selectedJobDetail.job.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 mt-0.5 font-mono tabular-nums">
                        <span className={getStatusLabelAndColor(selectedJobDetail.job.status).textClass}>
                          {getStatusLabelAndColor(selectedJobDetail.job.status).label}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{formatBytes(selectedJobDetail.job.bytesProcessed)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{selectedJobDetail.job.recordsProcessed} records</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatDuration(selectedJobDetail.job.elapsedMs)}</span>
                        {selectedJobDetail.job.manifestPath && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-amber-300 truncate">
                              Manifest: {selectedJobDetail.job.manifestPath}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      {selectedJobDetail.job.status === 'paused' ? (
                        <button
                          type="button"
                          onClick={() => handleJobAction(selectedJobDetail.job.id, 'resume')}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Resume</span>
                        </button>
                      ) : ['queued', 'running'].includes(selectedJobDetail.job.status) ? (
                        <button
                          type="button"
                          onClick={() => handleJobAction(selectedJobDetail.job.id, 'pause')}
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          <Pause className="w-3.5 h-3.5 text-amber-400" />
                          <span>Pause</span>
                        </button>
                      ) : null}

                      {['queued', 'running', 'paused'].includes(selectedJobDetail.job.status) && (
                        <button
                          type="button"
                          onClick={() => handleJobAction(selectedJobDetail.job.id, 'cancel')}
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-rose-300 text-xs font-medium cursor-pointer whitespace-nowrap"
                        >
                          Cancel
                        </button>
                      )}

                      {(selectedJobDetail.job.failedTasks > 0 || selectedJobDetail.job.cancelledTasks > 0) && (
                        <button
                          type="button"
                          onClick={() => handleJobAction(selectedJobDetail.job.id, 'retry_failed')}
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-amber-300 text-xs font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Retry Failed</span>
                        </button>
                      )}

                      {selectedJobDetail.job.patchIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleJobAction(selectedJobDetail.job.id, 'rollback')}
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-amber-200 text-xs font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap"
                          title="Revert all file mutations recorded during this batch job"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                          <span>Rollback ({selectedJobDetail.job.patchIds.length})</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleExportJobReport('json')}
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>JSON</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExportJobReport('csv')}
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>CSV</span>
                      </button>

                      {onInjectIntoChat && (
                        <button
                          type="button"
                          onClick={handleSendJobSummaryToChat}
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-amber-300 text-xs font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Send to Chat</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleJobAction(selectedJobDetail.job.id, 'delete')}
                        className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-rose-400 cursor-pointer"
                        title="Delete batch job"
                        aria-label="Delete batch job"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* High-Density Task Execution Grid */}
                <div className="max-h-56 overflow-y-auto border-b border-zinc-800 shrink-0">
                  <table className="w-full text-xs border-collapse">
                    <thead className="bg-zinc-900/80 text-zinc-400 sticky top-0">
                      <tr className="border-b border-zinc-800">
                        <th className="py-2 px-3 text-left font-medium w-10">#</th>
                        <th className="py-2 px-3 text-left font-medium">Task Item</th>
                        <th className="py-2 px-3 text-left font-medium">Status</th>
                        <th className="py-2 px-3 text-right font-medium">Bytes</th>
                        <th className="py-2 px-3 text-right font-medium">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {selectedJobDetail.tasks.map((task) => {
                        const tst = getStatusLabelAndColor(task.status);
                        const isRowSelected = activeTask?.id === task.id;
                        return (
                          <tr
                            key={task.id}
                            onClick={() => setSelectedTaskId(task.id)}
                            className={`cursor-pointer transition-colors ${
                              isRowSelected ? 'bg-zinc-900' : 'hover:bg-zinc-900/50'
                            }`}
                          >
                            <td className="py-2 px-3 font-mono tabular-nums text-zinc-500">
                              {task.seq}
                            </td>
                            <td className="py-2 px-3 max-w-[240px]">
                              <div className="font-medium text-zinc-200 truncate">{task.label}</div>
                              <div className="text-[11px] text-zinc-500 truncate">
                                {task.outputSummary || task.errorMessage || task.inputPreview}
                              </div>
                            </td>
                            <td className={`py-2 px-3 font-medium whitespace-nowrap ${tst.textClass}`}>
                              {tst.label}
                            </td>
                            <td className="py-2 px-3 text-right font-mono tabular-nums text-zinc-300 whitespace-nowrap">
                              {formatBytes(task.bytesProcessed)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono tabular-nums text-zinc-400 whitespace-nowrap">
                              {formatDuration(task.elapsedMs)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Selected Task Output / Unified Diff / Input Payload Viewer */}
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-zinc-950">
                  <div className="px-4 py-2 border-b border-zinc-800 flex items-center justify-between gap-2 shrink-0">
                    <span className="text-xs font-medium text-zinc-300 truncate">
                      {activeTask ? `Task #${activeTask.seq}: ${activeTask.label}` : 'Task Inspector'}
                    </span>
                    <div className="flex items-center gap-1 p-0.5 bg-zinc-900 rounded-md shrink-0">
                      <button
                        type="button"
                        onClick={() => setInspectorTab('output')}
                        className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer whitespace-nowrap ${
                          inspectorTab === 'output' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Output
                      </button>
                      <button
                        type="button"
                        onClick={() => setInspectorTab('diff')}
                        className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer whitespace-nowrap ${
                          inspectorTab === 'diff' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Diff {activeTask?.diff ? '(Available)' : ''}
                      </button>
                      <button
                        type="button"
                        onClick={() => setInspectorTab('input')}
                        className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer whitespace-nowrap ${
                          inspectorTab === 'input' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Input Source
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-zinc-200 whitespace-pre-wrap break-words leading-relaxed">
                    {!activeTask ? (
                      <span className="text-zinc-500">Select a task row above to inspect its execution details.</span>
                    ) : inspectorTab === 'output' ? (
                      activeTask.errorMessage ? (
                        <div className="text-rose-300">Error: {activeTask.errorMessage}</div>
                      ) : (
                        activeTask.outputData || activeTask.outputSummary || 'Task queued or running...'
                      )
                    ) : inspectorTab === 'diff' ? (
                      activeTask.diff || 'No file mutation diff recorded for this task.'
                    ) : (
                      activeTask.filePath
                        ? `Source File Path: ${activeTask.filePath}${activeTask.outputPath ? `\nOutput File Path: ${activeTask.outputPath}` : ''}`
                        : activeTask.inputPayload || activeTask.inputPreview
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
