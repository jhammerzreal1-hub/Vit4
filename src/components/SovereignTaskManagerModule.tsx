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

import React, { useState, useEffect } from 'react';
import { Activity, Cpu, HardDrive, Network, RefreshCw, Shield, XCircle, Wrench } from 'lucide-react';

interface ProcessRecord {
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

export const SovereignTaskManagerModule: React.FC = () => {
  const [runtime, setRuntime] = useState<any>(null);
  const [processes, setProcesses] = useState<ProcessRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'processes' | 'network' | 'toolchains'>('processes');
  const [filter, setFilter] = useState<string>('');
  const [notice, setNotice] = useState<string>('');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [rtRes, procRes] = await Promise.all([
        fetch('/api/os/runtime-info'),
        fetch('/api/os/processes?limit=100')
      ]);
      if (rtRes.ok) setRuntime(await rtRes.json());
      if (procRes.ok) {
        const pd = await procRes.json();
        setProcesses(Array.isArray(pd.processes) ? pd.processes : []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    const timer = setInterval(loadAll, 8000);
    return () => clearInterval(timer);
  }, []);

  const handleSignal = async (pid: number, signal: 'SIGTERM' | 'SIGKILL') => {
    setNotice('');
    try {
      const res = await fetch('/api/os/process/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pid, signal })
      });
      const data = await res.json();
      if (data.success) {
        setNotice(`Sent ${signal} to PID ${pid}`);
        loadAll();
      } else {
        setNotice(data.error || `Failed to signal PID ${pid}`);
      }
    } catch (err: any) {
      setNotice(err?.message || 'Signal error');
    }
  };

  const filteredProcs = processes.filter(
    (p) =>
      !filter.trim() ||
      p.command.toLowerCase().includes(filter.trim().toLowerCase()) ||
      String(p.pid).includes(filter.trim()) ||
      p.user.toLowerCase().includes(filter.trim().toLowerCase())
  );

  return (
    <div className="flex flex-col h-full min-h-0 bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="px-4 py-3 bg-zinc-900/90 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-sky-400" />
          <h2 className="text-sm font-bold text-zinc-100">Kernel & Activity Monitor</h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
            UID 0 · Ring -3 Hypervisor
          </span>
        </div>

        <button
          type="button"
          onClick={loadAll}
          className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-400' : ''}`} />
          <span>Refresh Live Telemetry</span>
        </button>
      </div>

      {/* Live Metrics Strip */}
      {runtime && (
        <div className="p-3 sm:p-4 grid grid-cols-2 lg:grid-cols-4 gap-3 border-b border-zinc-800/80 shrink-0">
          <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
            <div className="text-[10px] font-mono uppercase text-zinc-500 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              <span>CPU Cores & Load</span>
            </div>
            <div className="text-sm font-bold text-zinc-100 mt-1 tabular-nums">
              {runtime.cpu?.cores} Cores · Load {runtime.loadAvg?.[0]?.toFixed(2) ?? '0.00'}
            </div>
            <div className="text-[10px] text-zinc-400 truncate mt-0.5">{runtime.cpu?.model}</div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
            <div className="text-[10px] font-mono uppercase text-zinc-500 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              <span>Physical RAM</span>
            </div>
            <div className="text-sm font-bold text-zinc-100 mt-1 tabular-nums">
              {runtime.memory?.usedPct}% Used ({Math.round((runtime.memory?.usedBytes || 0) / 1024 / 1024)} MB)
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5 tabular-nums">
              Kernel Heap: {runtime.memory?.processHeapUsedMb} MB · RSS: {runtime.memory?.processRssMb} MB
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
            <div className="text-[10px] font-mono uppercase text-zinc-500 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Host Kernel</span>
            </div>
            <div className="text-sm font-bold text-zinc-100 mt-1 truncate">
              {runtime.hostPlatform} · {runtime.arch}
            </div>
            <div className="text-[10px] text-zinc-400 truncate mt-0.5">
              {runtime.hostname} · PID {runtime.pid}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
            <div className="text-[10px] font-mono uppercase text-zinc-500 flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5 text-violet-400" />
              <span>Processes & Disk</span>
            </div>
            <div className="text-sm font-bold text-zinc-100 mt-1 tabular-nums">
              {processes.length} Live PIDs
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5 tabular-nums">
              Disk Used: {runtime.disk?.usedPct ?? 0}% · Node {runtime.nodeVersion}
            </div>
          </div>
        </div>
      )}

      {/* Subtabs + Filter */}
      <div className="px-4 py-2 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2 shrink-0 bg-zinc-900/40">
        <div className="flex items-center gap-1.5">
          {([
            { id: 'processes', label: `Live Processes (${processes.length})` },
            { id: 'network', label: `Interfaces & Ports (${runtime?.listeningSockets?.length || 0})` },
            { id: 'toolchains', label: 'Host Toolchains' }
          ] as const).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                activeTab === t.id
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'processes' && (
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter PID, user, command..."
            className="bg-zinc-900 border border-zinc-800 focus:border-sky-500 rounded-lg px-3 py-1 text-xs text-zinc-200 focus:outline-none w-full sm:w-56"
          />
        )}
      </div>

      {notice && (
        <div className="mx-4 mt-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-amber-300 shrink-0">
          {notice}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        {activeTab === 'processes' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse min-w-[600px]">
              <thead>
                <tr className="text-[10px] text-zinc-500 border-b border-zinc-800 uppercase">
                  <th className="py-2 pr-3">PID</th>
                  <th className="py-2 pr-3">User</th>
                  <th className="py-2 pr-3">CPU%</th>
                  <th className="py-2 pr-3">RSS MB</th>
                  <th className="py-2 pr-3">State</th>
                  <th className="py-2 pr-3">Command</th>
                  <th className="py-2 text-right">Signal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 tabular-nums">
                {filteredProcs.map((p) => (
                  <tr key={p.pid} className="hover:bg-zinc-900/60">
                    <td className="py-1.5 pr-3 text-sky-400 font-bold">{p.pid}</td>
                    <td className="py-1.5 pr-3 text-zinc-300">{p.user}</td>
                    <td className="py-1.5 pr-3 text-amber-300">{p.cpuPct.toFixed(1)}%</td>
                    <td className="py-1.5 pr-3 text-emerald-300">{p.rssMb.toFixed(1)}</td>
                    <td className="py-1.5 pr-3 text-zinc-400">{p.stat}</td>
                    <td className="py-1.5 pr-3 text-zinc-200 max-w-[260px] truncate" title={p.command}>
                      {p.command} {p.isCurrentServer ? ' [KERNEL]' : ''}
                    </td>
                    <td className="py-1.5 text-right">
                      {!p.isCurrentServer && p.pid > 1 ? (
                        <button
                          type="button"
                          onClick={() => handleSignal(p.pid, 'SIGTERM')}
                          className="px-2 py-0.5 rounded bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-[10px] text-rose-300 cursor-pointer inline-flex items-center gap-1"
                        >
                          <XCircle className="w-3 h-3" />
                          <span>TERM</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-zinc-600">LOCKED</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'network' && runtime && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-zinc-300 mb-2">Host Network Interfaces</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {(runtime.interfaces || []).map((iface: any, idx: number) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800 font-mono text-xs flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sky-300 font-bold">{iface.name} ({iface.family})</div>
                      <div className="text-zinc-300">{iface.address}</div>
                    </div>
                    <span className="text-[10px] text-zinc-500">{iface.mac}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-zinc-300 mb-2">Active Listening Sockets</h3>
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 font-mono text-[11px] space-y-1">
                {(runtime.listeningSockets || []).length === 0 ? (
                  <div className="text-zinc-500">No external socket table returned by host utility.</div>
                ) : (
                  runtime.listeningSockets.map((line: string, i: number) => (
                    <div key={i} className="text-zinc-300 truncate">{line}</div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'toolchains' && runtime && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {(runtime.toolchains || []).map((tc: any) => (
              <div key={tc.name} className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-amber-400" />
                    <span>{tc.name}</span>
                  </div>
                  <div className="text-[10px] font-mono text-zinc-500 truncate mt-0.5">
                    {tc.path || 'Not installed on host PATH'}
                  </div>
                </div>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    tc.available
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {tc.available ? 'READY' : 'ABSENT'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
