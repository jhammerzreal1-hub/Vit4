/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 */

import React, { useEffect, useState } from 'react';
import { RefreshCw, GitMerge, Database, CheckCircle2, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../utils/authClient';

interface SwarmWorkerResult {
  id: string;
  name: string;
  subsystem: string;
  task: string;
  status: 'COMPLETED' | 'CONSOLIDATED';
  durationMs: number;
  metricsSummary: string;
  extractedAxiom: string;
  weightDelta: number;
}

interface ConsolidationRun {
  id: string;
  cycle: number;
  timestamp: string;
  workersCount: number;
  axiomsPersisted: number;
  ledgerHash: string;
  summary: string;
}

interface DbStats {
  sqliteActive: boolean;
  trajectories: number;
  agenticMemory: number;
  evolutiveAxioms: number;
  consolidationRuns: number;
}

export const SwarmConsolidationModule: React.FC = () => {
  const [workers, setWorkers] = useState<SwarmWorkerResult[]>([]);
  const [runs, setRuns] = useState<ConsolidationRun[]>([]);
  const [cycle, setCycle] = useState(0);
  const [dbStats, setDbStats] = useState<DbStats | null>(null);
  const [objective, setObjective] = useState('Cross-subsystem forensic, security & memory integrity sweep');
  const [isReplicating, setIsReplicating] = useState(false);
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadState = async () => {
    try {
      const res = await apiFetch('/api/singularity/swarm/state');
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setCycle(data.cycle || 0);
        setRuns(data.runs || []);
        setWorkers(data.workers || []);
        setDbStats(data.dbStats || null);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to load swarm consolidation state.');
    }
  };

  useEffect(() => {
    loadState();
  }, []);

  const runParallelWorkers = async () => {
    setIsReplicating(true);
    setErrorMsg(null);
    try {
      const res = await apiFetch('/api/singularity/replicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objective })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Parallel worker sweep failed.');
      setWorkers(data.workers || []);
      setDbStats(data.dbStats || null);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Worker sweep failed.');
    } finally {
      setIsReplicating(false);
    }
  };

  const consolidateIntoKernel = async () => {
    setIsConsolidating(true);
    setErrorMsg(null);
    try {
      const res = await apiFetch('/api/singularity/consolidate', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Consolidation failed.');
      setWorkers(data.workers || []);
      setRuns(data.runs || []);
      setCycle(data.run?.cycle || cycle + 1);
      setDbStats(data.dbStats || null);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Consolidation failed.');
    } finally {
      setIsConsolidating(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-y-auto">
      <div className="px-6 py-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-50 tracking-tight">
            Parallel Swarm Workers & Kernel Memory Consolidation
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span>Executes parallel OS diagnostic workers</span>
            <span aria-hidden="true">·</span>
            <span>Commits verified findings & axioms into SQLite kernelDb</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runParallelWorkers}
            disabled={isReplicating}
            className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReplicating ? 'animate-spin' : ''}`} />
            {isReplicating ? 'Running Workers…' : 'Run Parallel Workers'}
          </button>
          <button
            onClick={consolidateIntoKernel}
            disabled={isConsolidating}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
          >
            <GitMerge className={`w-3.5 h-3.5 ${isConsolidating ? 'animate-spin' : ''}`} />
            {isConsolidating ? 'Consolidating…' : 'Consolidate to Kernel'}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6 flex-1">
        {errorMsg && (
          <div className="p-3.5 rounded-lg bg-red-950/60 border border-red-800/70 text-red-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="text-xs text-slate-400">Consolidation Cycle</div>
            <div className="mt-2 text-2xl font-semibold font-mono tabular-nums text-purple-400">Cycle {cycle}</div>
            <div className="mt-1 text-xs text-slate-400">{dbStats?.sqliteActive ? 'SQLite WAL persisted' : 'Disk ledger'}</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="text-xs text-slate-400">Persisted Axioms</div>
            <div className="mt-2 text-2xl font-semibold font-mono tabular-nums text-cyan-400">
              {dbStats ? dbStats.evolutiveAxioms : '—'}
            </div>
            <div className="mt-1 text-xs text-slate-400">Rows in evolutive_axioms</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="text-xs text-slate-400">Agentic Memory Rows</div>
            <div className="mt-2 text-2xl font-semibold font-mono tabular-nums text-emerald-400">
              {dbStats ? dbStats.agenticMemory : '—'}
            </div>
            <div className="mt-1 text-xs text-slate-400">Rows in agentic_memory</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="text-xs text-slate-400">Last Worker Sweep</div>
            <div className="mt-2 text-2xl font-semibold font-mono tabular-nums text-slate-100">{workers.length}</div>
            <div className="mt-1 text-xs text-slate-400">Parallel OS subsystem probes</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Diagnostic sweep objective…"
            className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-xl bg-slate-900/60 border border-slate-800 divide-y divide-slate-800/80">
            <div className="p-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-100">Parallel Subsystem Worker Findings</span>
              <span className="text-xs font-mono text-slate-400">{workers.length} workers</span>
            </div>
            {workers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Click "Run Parallel Workers" to inspect Merkle integrity, cyber defense posture, SQLite memory, and host/mesh telemetry simultaneously.
              </div>
            ) : (
              workers.map((w) => (
                <div key={w.id} className="p-4 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-100">{w.name}</span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="font-mono text-slate-400">{w.subsystem}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono tabular-nums">
                      <span className="text-slate-400">{w.durationMs}ms</span>
                      <span className={w.status === 'CONSOLIDATED' ? 'text-emerald-400 flex items-center gap-1' : 'text-cyan-400'}>
                        {w.status === 'CONSOLIDATED' ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                        {w.status === 'CONSOLIDATED' ? 'Consolidated' : 'Completed'}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">{w.metricsSummary}</div>
                  <div className="text-xs font-mono text-purple-200/90 bg-slate-950 border border-slate-800 rounded-lg p-2.5">
                    {w.extractedAxiom}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="rounded-xl bg-slate-900/60 border border-slate-800 divide-y divide-slate-800/80">
            <div className="p-4 flex items-center gap-2 text-sm font-semibold text-slate-100">
              <Database className="w-4 h-4 text-purple-400" />
              Consolidation Ledger
            </div>
            {runs.length === 0 ? (
              <div className="p-6 text-xs text-slate-400">No consolidations committed yet.</div>
            ) : (
              runs.map((r) => (
                <div key={r.id} className="p-3.5 space-y-1 text-xs">
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-purple-300 font-semibold">Cycle {r.cycle}</span>
                    <span className="text-slate-400 tabular-nums">{r.axiomsPersisted} persisted</span>
                  </div>
                  <div className="text-slate-300">{r.summary}</div>
                  <div className="font-mono text-slate-500">
                    {new Date(r.timestamp).toLocaleString()} · {r.ledgerHash.slice(0, 12)}…
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
