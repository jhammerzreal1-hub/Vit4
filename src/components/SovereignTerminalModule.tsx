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
import { Terminal, Trash2, Copy, Check, RefreshCw, Play, Folder, Link2, Server } from 'lucide-react';
import type { ModuleType } from '../types';
import { apiFetch } from '../utils/authClient';

interface ShellEntry {
  id: string;
  cwd: string;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  elapsedMs: number;
  target?: 'runtime' | 'physical-bridge';
}

interface SovereignTerminalModuleProps {
  onSelectModule?: (mod: ModuleType) => void;
  onInjectToChat?: (content: string, immediate?: boolean) => void;
}

export const SovereignTerminalModule: React.FC<SovereignTerminalModuleProps> = ({
  onSelectModule,
  onInjectToChat
}) => {
  const [cwd, setCwd] = useState<string>('');
  const [commandInput, setCommandInput] = useState<string>('');
  const [entries, setEntries] = useState<ShellEntry[]>([]);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyCursor, setHistoryCursor] = useState<number>(-1);
  const [running, setRunning] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [platformLabel, setPlatformLabel] = useState<string>('Linux/POSIX');
  const [shellTarget, setShellTarget] = useState<'runtime' | 'physical-bridge'>('runtime');
  const [bridgeAvailable, setBridgeAvailable] = useState<boolean>(false);
  const [bridgeLabel, setBridgeLabel] = useState<string>('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const getBridgeConfig = () => {
    try {
      return {
        url: (localStorage.getItem('lysander_host_bridge_url') || 'http://127.0.0.1:4747').replace(/\/+$/, ''),
        token: (localStorage.getItem('lysander_host_bridge_token') || '').trim()
      };
    } catch {
      return { url: 'http://127.0.0.1:4747', token: '' };
    }
  };

  useEffect(() => {
    apiFetch('/api/os/runtime-info')
      .then((r) => r.json())
      .then((d) => {
        if (d.cwd) setCwd(d.cwd);
        if (d.uname) setPlatformLabel(d.uname);
      })
      .catch(() => {});

    const cfg = getBridgeConfig();
    const headers: Record<string, string> = {};
    if (cfg.token) headers['X-Lysander-Token'] = cfg.token;
    fetch(`${cfg.url}/host/info`, { headers, signal: AbortSignal.timeout(1800) })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.success) {
          setBridgeAvailable(true);
          setBridgeLabel(`${d.hostname} (${d.type} ${d.arch})`);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  const runCommand = async (rawCmd?: string) => {
    const cmd = (rawCmd ?? commandInput).trim();
    if (!cmd || running) return;
    if (!rawCmd) setCommandInput('');

    setCmdHistory((prev) => [cmd, ...prev.slice(0, 99)]);
    setHistoryCursor(-1);
    setRunning(true);

    try {
      const cfg = getBridgeConfig();
      const endpoint =
        shellTarget === 'physical-bridge'
          ? `${cfg.url}/host/shell/exec`
          : '/api/os/shell/exec';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (shellTarget === 'physical-bridge' && cfg.token) {
        headers['X-Lysander-Token'] = cfg.token;
      }

      const fetcher = shellTarget === 'physical-bridge' ? fetch : apiFetch;
      const res = await fetcher(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ command: cmd, cwd: cwd || undefined })
      });
      const data = await res.json();
      const entry: ShellEntry = {
        id: `sh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        cwd: data.cwd || cwd || '~',
        command: cmd,
        stdout: data.stdout || '',
        stderr: data.stderr || (data.error || ''),
        exitCode: typeof data.exitCode === 'number' ? data.exitCode : (data.success ? 0 : 1),
        elapsedMs: data.elapsedMs || 0,
        target: shellTarget
      };
      if (data.nextCwd) setCwd(data.nextCwd);
      setEntries((prev) => [...prev, entry]);
    } catch (err: any) {
      setEntries((prev) => [
        ...prev,
        {
          id: `sh-err-${Date.now()}`,
          cwd: cwd || '~',
          command: cmd,
          stdout: '',
          stderr:
            shellTarget === 'physical-bridge'
              ? `Physical Host Bridge unreachable (${err?.message || 'offline'}). Start lysander-host-bridge.mjs from Sovereign Files -> Physical Host Bridge.`
              : err?.message || 'Shell endpoint error',
          exitCode: 1,
          elapsedMs: 0,
          target: shellTarget
        }
      ]);
    } finally {
      setRunning(false);
    }
  };

  const runCommandRef = useRef(runCommand);
  runCommandRef.current = runCommand;

  useEffect(() => {
    const onOsCommand = (e: Event) => {
      const detail = (e as CustomEvent<any>)?.detail;
      if (!detail || detail.action !== 'terminal_exec' || !detail.command) return;
      runCommandRef.current(String(detail.command));
    };
    window.addEventListener('sovereign_os_command', onOsCommand);
    return () => window.removeEventListener('sovereign_os_command', onOsCommand);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const nextIdx = Math.min(cmdHistory.length - 1, historyCursor + 1);
      setHistoryCursor(nextIdx);
      setCommandInput(cmdHistory[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyCursor <= 0) {
        setHistoryCursor(-1);
        setCommandInput('');
      } else {
        const nextIdx = historyCursor - 1;
        setHistoryCursor(nextIdx);
        setCommandInput(cmdHistory[nextIdx]);
      }
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'l' || e.key === 'L')) {
      e.preventDefault();
      setEntries([]);
    }
  };

  const copyEntry = (entry: ShellEntry) => {
    const txt = `$ ${entry.command}\n${entry.stdout}${entry.stderr ? `\n${entry.stderr}` : ''}`;
    navigator.clipboard.writeText(txt).catch(() => {});
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-zinc-950 text-zinc-100 font-mono">
      {/* Terminal Top Bar */}
      <div className="px-3 sm:px-4 py-2 bg-zinc-900 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold text-zinc-100 whitespace-nowrap">
            root@sovereign-os
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
            UID 0 · Ring -3
          </span>

          {/* Target Host Switcher */}
          <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-lg p-0.5 text-[10px]">
            <button
              type="button"
              onClick={() => setShellTarget('runtime')}
              className={`px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer ${
                shellTarget === 'runtime'
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Server className="w-3 h-3" />
              <span>Runtime Host</span>
            </button>
            <button
              type="button"
              onClick={() => setShellTarget('physical-bridge')}
              className={`px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer ${
                shellTarget === 'physical-bridge'
                  ? 'bg-amber-500/20 text-amber-300 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Execute native shell commands directly on your physical host computer via lysander-host-bridge.mjs"
            >
              <Link2 className="w-3 h-3" />
              <span>Physical PC</span>
              <span className={`w-1.5 h-1.5 rounded-full ${bridgeAvailable ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
            </button>
          </div>

          <span className="hidden lg:inline text-[10px] text-zinc-400 truncate max-w-[260px]">
            {shellTarget === 'physical-bridge' ? (bridgeLabel || 'Bridge 127.0.0.1:4747') : platformLabel}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onSelectModule && (
            <button
              type="button"
              onClick={() => onSelectModule('file-manager')}
              className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] text-amber-300 flex items-center gap-1 cursor-pointer"
            >
              <Folder className="w-3.5 h-3.5" />
              <span>Files</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setEntries([])}
            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300 flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Quick Host Diagnostic Commands */}
      <div className="px-3 py-1.5 bg-zinc-900/40 border-b border-zinc-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
        {[
          'uname -a && id',
          'pwd && ls -la',
          'df -h',
          'free -m',
          'ps aux | head -n 15',
          'git status -s',
          'node -v && npm -v'
        ].map((q) => (
          <button
            key={q}
            type="button"
            disabled={running}
            onClick={() => runCommand(q)}
            className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-300 hover:text-emerald-300 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Output Stream */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 text-xs">
        {entries.length === 0 && (
          <div className="text-zinc-500 space-y-1">
            <div className="text-emerald-400 font-bold">Lysander Sovereign OS Root Shell (UID 0 · Ring -3 Hypervisor)</div>
            <div>Working Directory: {cwd || 'loading...'}</div>
            <div>Type any native host OS command below or pick a diagnostic preset above.</div>
          </div>
        )}

        {entries.map((entry) => (
          <div key={entry.id} className="rounded-xl bg-zinc-900/50 border border-zinc-800/80 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-emerald-400 font-bold shrink-0">root@sovereign</span>
                <span className="text-sky-400 truncate max-w-[200px]">{entry.cwd}</span>
                <span className="text-zinc-500">$</span>
                <span className="text-zinc-100 font-semibold break-all">{entry.command}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 text-[10px] tabular-nums">
                <span className={entry.exitCode === 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  exit {entry.exitCode}
                </span>
                <span className="text-zinc-500">{entry.elapsedMs}ms</span>
                <button
                  type="button"
                  onClick={() => copyEntry(entry)}
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                  title="Copy command output"
                >
                  {copiedId === entry.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
                {onInjectToChat && (
                  <button
                    type="button"
                    onClick={() => {
                      onInjectToChat(`[Shell Output · ${entry.command}]\n\`\`\`\n${(entry.stdout || entry.stderr).slice(0, 3500)}\n\`\`\``, false);
                      if (onSelectModule) onSelectModule('chat');
                    }}
                    className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 cursor-pointer"
                  >
                    Ask AI
                  </button>
                )}
              </div>
            </div>

            {entry.stdout && (
              <pre className="text-[11px] text-zinc-200 whitespace-pre-wrap break-words leading-relaxed overflow-x-auto">
                {entry.stdout}
              </pre>
            )}
            {entry.stderr && (
              <pre className="text-[11px] text-rose-300 whitespace-pre-wrap break-words leading-relaxed overflow-x-auto">
                {entry.stderr}
              </pre>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Command Prompt Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runCommand();
        }}
        className="px-3 py-2.5 bg-zinc-900 border-t border-zinc-800 flex items-center gap-2 shrink-0"
      >
        <span className="text-emerald-400 text-xs font-bold shrink-0">uid0#</span>
        <input
          type="text"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Execute shell command (cd, ls, ps, curl, python3, git...)..."
          autoFocus
          className="flex-1 min-w-0 bg-zinc-950 border border-zinc-700 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={running || !commandInput.trim()}
          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
        >
          {running ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          <span>{running ? 'Running' : 'Run'}</span>
        </button>
      </form>
    </div>
  );
};
