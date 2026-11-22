/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 * (TWENTY 47 PROTOCOL - GENESIS NODE / LYSANDER CORE EULA / H-FID Forensic License v1.1).
 * Zenodo DOI: https://doi.org/10.5281/zenodo.20778079 | ORCID: https://orcid.org/0009-0004-5273-7028
 */

import React, { useState, useEffect, useCallback } from 'react';
import { safeCopyToClipboard } from '../utils/clipboard.js';
import {
  FolderGit2,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  Code2,
  Users,
  Key,
  Check,
  Copy,
  FileCode2,
  FolderOpen,
  Search,
  Save,
  Play,
  AlertCircle,
  Trash2,
  ChevronRight,
  GitBranch
} from 'lucide-react';
import { executeSovereignFunction } from '../utils/functionEngine';

interface ProjectRecord {
  id: string;
  name: string;
  code: string;
  repo: string;
  category: 'Core Orchestrator' | 'Multi-Agent Mesh' | 'Creative Engine' | 'Edge Runtime' | 'Security Infrastructure';
  status: 'MERGED_ACTIVE' | 'SYNCHRONIZED' | 'STANDBY';
  commits: number;
  leadArchitect: string;
  accounts: string[];
  description: string;
  artifactsCount: number;
  wormSeal: string;
}

const INITIAL_PROJECTS: ProjectRecord[] = [
  {
    id: 'proj-aurelius-core',
    name: 'Aurelius Sovereign Core',
    code: 'AUR-APEX-01',
    repo: 'github.com/JHammerZ/aurelius-sovereign-core',
    category: 'Core Orchestrator',
    status: 'MERGED_ACTIVE',
    commits: 1420,
    leadArchitect: 'Joshua Hamilton (JHammerZ)',
    accounts: ['joshualhamilton17@gmail.com', 'JHammerZreal@gmail.com'],
    description: 'Central computational apex orchestrator with multi-provider routing and atomic workspace autonomy.',
    artifactsCount: 48,
    wormSeal: '7f38fa8ce4910b89e'
  },
  {
    id: 'proj-lysander-cbp',
    name: 'Lysander 3.0 / 4.0 CBP Engine',
    code: 'LYS-CBP-15',
    repo: 'github.com/JHammerZ/lysander-crossbridge-protocol',
    category: 'Multi-Agent Mesh',
    status: 'MERGED_ACTIVE',
    commits: 2150,
    leadArchitect: 'Joshua Hamilton (JHammerZ)',
    accounts: ['joshualhamilton17@gmail.com', 'JHammerZreal@gmail.com'],
    description: 'Cross-Bridge Protocol unifying multi-agent execution pipelines and synchronized repositories.',
    artifactsCount: 64,
    wormSeal: '8836e9c98a21e4cb1'
  },
  {
    id: 'proj-guitaraoke',
    name: 'GuitarAOKE Factory',
    code: 'GAOKE-AUDIO-03',
    repo: 'github.com/JHammerZ/guitaraoke-factory',
    category: 'Creative Engine',
    status: 'MERGED_ACTIVE',
    commits: 884,
    leadArchitect: 'Joshua Hamilton (JHammerZ)',
    accounts: ['joshualhamilton17@gmail.com', 'JHammerZreal@gmail.com'],
    description: 'Sovereign audio-visual synthesis, Lyria arrangement, and real-time audio stem pipeline.',
    artifactsCount: 32,
    wormSeal: 'e9b0c01c518b0f2a9'
  },
  {
    id: 'proj-termux-edge',
    name: 'Termux S23+ Edge Substrate',
    code: 'TMX-EDGE-09',
    repo: 'github.com/JHammerZ/termux-sovereign-edge',
    category: 'Edge Runtime',
    status: 'MERGED_ACTIVE',
    commits: 720,
    leadArchitect: 'Joshua Hamilton (JHammerZ)',
    accounts: ['joshualhamilton17@gmail.com', 'JHammerZreal@gmail.com'],
    description: 'Local offline Llama / Qwen GGUF runtime on ARM64 Android & host gateways.',
    artifactsCount: 19,
    wormSeal: '464b523b81109dc01'
  }
];

interface WorkspaceEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  sizeBytes?: number;
}

export const UnifiedProjectsModule: React.FC = () => {
  const [projects] = useState<ProjectRecord[]>(INITIAL_PROJECTS);
  const [selectedProject, setSelectedProject] = useState<ProjectRecord>(INITIAL_PROJECTS[0]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Live GitHub Telemetry
  const [githubStatus, setGithubStatus] = useState<any>(null);
  const [githubRepos, setGithubRepos] = useState<any[]>([]);
  const [loadingGithub, setLoadingGithub] = useState<boolean>(false);

  // Live Workspace File Explorer & Atomic Editor
  const [currentDir, setCurrentDir] = useState<string>('src');
  const [dirEntries, setDirEntries] = useState<WorkspaceEntry[]>([]);
  const [loadingDir, setLoadingDir] = useState<boolean>(false);
  const [searchPattern, setSearchPattern] = useState<string>('');
  const [searchMatches, setSearchMatches] = useState<any[] | null>(null);
  const [activeFilePath, setActiveFilePath] = useState<string>('package.json');
  const [fileContent, setFileContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [verifyCompileOnSave, setVerifyCompileOnSave] = useState<boolean>(true);
  const [editorStatus, setEditorStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [savingFile, setSavingFile] = useState<boolean>(false);
  const [lintResult, setLintResult] = useState<{ clean: boolean; output: string } | null>(null);
  const [runningLint, setRunningLint] = useState<boolean>(false);
  const [merging, setMerging] = useState<boolean>(false);
  const [mergeNotice, setMergeNotice] = useState<string | null>(null);

  const loadDirectory = useCallback(async (dirPath: string) => {
    setLoadingDir(true);
    try {
      const res = await executeSovereignFunction('listDirectory', { dirPath }, 'unified-projects');
      const rawEntries = Array.isArray(res.output)
        ? res.output
        : res.output && typeof res.output === 'object' && Array.isArray((res.output as any).entries)
        ? (res.output as any).entries
        : null;
      if (res.success && rawEntries) {
        const normalized: WorkspaceEntry[] = rawEntries.map((entry: any) => ({
          name: String(entry?.name || ''),
          path: String(entry?.path || entry?.name || ''),
          isDirectory:
            typeof entry?.isDirectory === 'boolean'
              ? entry.isDirectory
              : entry?.type === 'directory' || entry?.type === 'dir',
          sizeBytes:
            typeof entry?.sizeBytes === 'number'
              ? entry.sizeBytes
              : typeof entry?.size === 'number'
              ? entry.size
              : undefined
        }));
        setDirEntries(normalized);
        setCurrentDir(dirPath);
      } else if (!res.success) {
        setEditorStatus({ ok: false, msg: res.error || `Failed to list ${dirPath}` });
      }
    } catch (err: any) {
      setEditorStatus({ ok: false, msg: err?.message || `Failed to list ${dirPath}` });
    } finally {
      setLoadingDir(false);
    }
  }, []);

  const loadFile = useCallback(async (filePath: string) => {
    setEditorStatus(null);
    try {
      const res = await executeSovereignFunction('readFile', { filePath }, 'unified-projects');
      if (res.success) {
        const text = typeof res.output === 'string'
          ? res.output
          : typeof res.output?.content === 'string'
          ? res.output.content
          : JSON.stringify(res.output, null, 2);
        setActiveFilePath(filePath);
        setFileContent(text);
        setOriginalContent(text);
      } else {
        setEditorStatus({ ok: false, msg: res.error || `Failed to read ${filePath}` });
      }
    } catch (err: any) {
      setEditorStatus({ ok: false, msg: err?.message || `Failed to read ${filePath}` });
    }
  }, []);

  const loadGithubTelemetry = useCallback(async () => {
    setLoadingGithub(true);
    try {
      const [statusData, reposData] = await Promise.all([
        fetch('/api/github/status').then((r) => r.json()).catch(() => null),
        fetch('/api/github/repos').then((r) => r.json()).catch(() => null)
      ]);
      if (statusData) setGithubStatus(statusData);
      if (reposData && Array.isArray(reposData.repos)) setGithubRepos(reposData.repos);
    } finally {
      setLoadingGithub(false);
    }
  }, []);

  useEffect(() => {
    loadDirectory('src');
    loadFile('package.json');
    loadGithubTelemetry();
  }, [loadDirectory, loadFile, loadGithubTelemetry]);

  const handleSaveFile = async () => {
    if (!activeFilePath) return;
    setSavingFile(true);
    setEditorStatus(null);
    try {
      const res = await executeSovereignFunction(
        'writeFile',
        { filePath: activeFilePath, content: fileContent, verifyCompile: verifyCompileOnSave },
        'unified-projects'
      );
      if (res.success) {
        setOriginalContent(fileContent);
        setEditorStatus({
          ok: true,
          msg: `Saved ${activeFilePath} cleanly${verifyCompileOnSave ? ' (tsc --noEmit passed)' : ''}.`
        });
      } else {
        setEditorStatus({ ok: false, msg: res.error || 'Write rejected or rolled back on compile error.' });
      }
    } finally {
      setSavingFile(false);
    }
  };

  const handleSearchWorkspace = async () => {
    if (!searchPattern.trim()) {
      setSearchMatches(null);
      return;
    }
    const res = await executeSovereignFunction('searchCode', { pattern: searchPattern.trim(), dirPath: '.' }, 'unified-projects');
    if (res.success && Array.isArray(res.output?.matches)) {
      setSearchMatches(res.output.matches);
    } else {
      setSearchMatches([]);
    }
  };

  const handleRunLint = async () => {
    setRunningLint(true);
    try {
      const res = await executeSovereignFunction('runLint', {}, 'unified-projects');
      setLintResult({
        clean: res.success,
        output: typeof res.output === 'string' ? res.output : JSON.stringify(res.output || res.error, null, 2)
      });
    } finally {
      setRunningLint(false);
    }
  };

  const handleConsolidateAndMerge = async () => {
    setMerging(true);
    setMergeNotice(null);
    try {
      const res = await fetch('/api/projects/consolidate-merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          architect: 'Joshua Hamilton (JHammerZ)',
          accounts: ['joshualhamilton17@gmail.com', 'JHammerZreal@gmail.com'],
          timestamp: new Date().toISOString()
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setMergeNotice(data.message || 'Project workspace consolidation verified.');
      } else {
        setMergeNotice(`Consolidation failed: ${data.error || `HTTP ${res.status}`}`);
      }
    } catch (e: any) {
      setMergeNotice(`Consolidation error: ${e?.message || e}`);
    } finally {
      setMerging(false);
    }
  };

  const handleCopy = async (text: string, id: string) => {
    await safeCopyToClipboard(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isDirty = fileContent !== originalContent;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2 flex-wrap">
                <span>Unified Workspace &amp; Repository IDE</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  ATOMIC TRANSACTIONS ACTIVE
                </span>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('open-jhammerz-license'))}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 cursor-pointer"
                >
                  MIT &amp; JHammerZ TWENTY 47 / H-FID License · jhammerz.github.io
                </button>
                {githubStatus?.user?.login && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    GitHub: {githubStatus.user.login} ({githubStatus.user.publicRepos} repos)
                  </span>
                )}
              </h1>
              <p className="text-xs text-zinc-400 mt-1">
                Browse live repository files, search workspace code, apply atomic rollback-protected edits, run <code className="text-amber-300">tsc --noEmit</code>, and inspect live GitHub telemetry.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={handleRunLint}
              disabled={runningLint}
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-emerald-300 font-bold text-xs font-mono flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${runningLint ? 'animate-spin' : ''}`} />
              <span>{runningLint ? 'Typechecking...' : 'Run tsc --noEmit'}</span>
            </button>
            <button
              onClick={handleConsolidateAndMerge}
              disabled={merging}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs font-mono flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${merging ? 'animate-spin' : ''}`} />
              <span>{merging ? 'Consolidating...' : 'Sync Workspace Matrix'}</span>
            </button>
          </div>
        </div>

        {mergeNotice && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{mergeNotice}</span>
          </div>
        )}

        {lintResult && (
          <div
            className={`mt-4 p-3 rounded-xl border text-xs font-mono space-y-1 ${
              lintResult.clean
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
            }`}
          >
            <div className="font-bold flex items-center gap-2">
              {lintResult.clean ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{lintResult.clean ? 'TypeScript Compiler Clean (0 errors)' : 'TypeScript Compiler Errors Detected'}</span>
            </div>
            <pre className="text-[11px] max-h-32 overflow-y-auto whitespace-pre-wrap text-zinc-300">{lintResult.output}</pre>
          </div>
        )}
      </div>

      {/* Live Workspace File Browser + Atomic Code Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Explorer & Code Search */}
        <div className="lg:col-span-4 bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-4 font-mono text-xs flex flex-col">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
            <span className="font-bold text-zinc-200 flex items-center gap-1.5">
              <FolderOpen className="w-4 h-4 text-amber-400" />
              <span>Workspace Explorer</span>
            </span>
            <div className="flex items-center gap-1">
              {currentDir !== '.' && (
                <button
                  onClick={() => {
                    const parts = currentDir.split('/').filter(Boolean);
                    parts.pop();
                    loadDirectory(parts.length ? parts.join('/') : '.');
                  }}
                  className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                >
                  ..
                </button>
              )}
              <button
                onClick={() => loadDirectory(currentDir)}
                className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-amber-300 cursor-pointer"
                title="Refresh folder"
              >
                <RefreshCw className={`w-3 h-3 ${loadingDir ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="text-[10px] text-amber-300 bg-zinc-900/70 px-2.5 py-1.5 rounded-lg border border-zinc-800 truncate">
            /{currentDir}
          </div>

          {/* Workspace Code Search */}
          <div className="flex gap-1.5">
            <input
              type="text"
              value={searchPattern}
              onChange={(e) => setSearchPattern(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchWorkspace()}
              placeholder="Grep pattern across workspace..."
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-100 focus:outline-none focus:border-amber-500"
            />
            <button
              onClick={handleSearchWorkspace}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 cursor-pointer"
              title="Search Code"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
            {searchMatches !== null && (
              <button
                onClick={() => {
                  setSearchPattern('');
                  setSearchMatches(null);
                }}
                className="px-2 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                title="Clear search"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Matches or Directory Listing */}
          <div className="flex-1 max-h-[380px] overflow-y-auto space-y-1 pr-1">
            {searchMatches !== null ? (
              searchMatches.length === 0 ? (
                <div className="text-zinc-500 text-center py-6">No matches found.</div>
              ) : (
                searchMatches.slice(0, 60).map((m: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => loadFile(m.file)}
                    className="w-full text-left p-2 rounded-lg bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 space-y-0.5 cursor-pointer"
                  >
                    <div className="text-[10px] text-amber-300 font-bold truncate">
                      {m.file}:{m.line}
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate">{m.text}</div>
                  </button>
                ))
              )
            ) : (
              dirEntries.map((entry) => {
                const entryPath = currentDir === '.' ? entry.name : `${currentDir}/${entry.name}`;
                return (
                  <button
                    key={entryPath}
                    onClick={() => (entry.isDirectory ? loadDirectory(entryPath) : loadFile(entryPath))}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between gap-2 transition cursor-pointer ${
                      activeFilePath === entryPath
                        ? 'bg-amber-500/15 border border-amber-500/40 text-amber-200'
                        : 'hover:bg-zinc-900 text-zinc-300 border border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      {entry.isDirectory ? (
                        <FolderGit2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      ) : (
                        <FileCode2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      )}
                      <span className="truncate">{entry.name}</span>
                    </span>
                    {entry.isDirectory && <ChevronRight className="w-3 h-3 text-zinc-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right File Viewer & Atomic Editor */}
        <div className="lg:col-span-8 bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-3 font-mono text-xs flex flex-col">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-zinc-800 pb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <Code2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold text-zinc-100 truncate">{activeFilePath}</span>
              {isDirty && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  UNSAVED
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <label className="flex items-center gap-1.5 text-[10px] text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={verifyCompileOnSave}
                  onChange={(e) => setVerifyCompileOnSave(e.target.checked)}
                  className="accent-emerald-500"
                />
                <span>Verify tsc + rollback on error</span>
              </label>

              <button
                onClick={handleSaveFile}
                disabled={savingFile || !isDirty}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-[11px] flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingFile ? 'Committing...' : 'Save Atomically'}</span>
              </button>
            </div>
          </div>

          {editorStatus && (
            <div
              className={`p-2.5 rounded-xl border text-[11px] flex items-center gap-2 ${
                editorStatus.ok
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
              }`}
            >
              {editorStatus.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{editorStatus.msg}</span>
            </div>
          )}

          <textarea
            value={fileContent}
            onChange={(e) => setFileContent(e.target.value)}
            spellCheck={false}
            rows={18}
            className="w-full flex-1 bg-black/70 border border-zinc-800 rounded-xl p-3 text-[11px] leading-relaxed text-zinc-200 focus:outline-none focus:border-amber-500 font-mono resize-y"
          />
        </div>
      </div>

      {/* Live GitHub Repositories & Project Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-2.5">
          <div className="text-xs font-mono text-zinc-400 flex items-center justify-between px-1">
            <span>PROJECT MATRIX</span>
            <span>{githubRepos.length > 0 ? `${githubRepos.length} Live GitHub Repos` : `${projects.length} Tracks`}</span>
          </div>

          {projects.map((p) => {
            const isSelected = selectedProject.id === p.id;
            return (
              <div
                key={p.id}
                onClick={() => setSelectedProject(p)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer font-mono text-xs ${
                  isSelected
                    ? 'bg-zinc-900 border-amber-500/60 shadow-md shadow-amber-500/10'
                    : 'bg-zinc-950 hover:bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-zinc-100 truncate">{p.name}</span>
                  <span className="text-[10px] text-amber-400 shrink-0 font-bold px-1.5 py-0.5 rounded bg-amber-500/10">
                    {p.code}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 font-sans line-clamp-1 mt-1">{p.description}</p>
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-7 bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-zinc-100 font-mono">
                {githubRepos.length > 0 ? 'Live GitHub Repository Feed' : selectedProject.name}
              </h2>
            </div>
            <button
              onClick={loadGithubTelemetry}
              disabled={loadingGithub}
              className="text-xs font-mono text-zinc-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingGithub ? 'animate-spin' : ''}`} />
              <span>Sync GitHub</span>
            </button>
          </div>

          {githubRepos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1 font-mono text-xs">
              {githubRepos.slice(0, 8).map((r: any) => (
                <div key={r.name} className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-cyan-300 truncate">{r.name}</span>
                    <span className="text-[10px] text-amber-300 shrink-0">{r.language || 'TypeScript'}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-sans line-clamp-1">{r.description || 'Repository module'}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3.5 bg-zinc-900/70 border border-zinc-800 rounded-xl font-mono text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>{selectedProject.repo}</span>
                </span>
                <button
                  onClick={() => handleCopy(selectedProject.wormSeal, 'seal')}
                  className="text-[11px] text-cyan-300 hover:text-cyan-200 flex items-center gap-1 cursor-pointer"
                >
                  {copiedId === 'seal' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copy Seal</span>
                </button>
              </div>
              <div className="p-2 bg-zinc-950 rounded border border-zinc-800 text-[11px] text-amber-300 break-all">
                sha256:{selectedProject.wormSeal} · {selectedProject.accounts.join(', ')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
