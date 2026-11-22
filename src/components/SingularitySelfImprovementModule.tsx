/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 */

import React, { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, FileCode2, Database } from 'lucide-react';
import { apiFetch } from '../utils/authClient';

interface EvolutionCycleRecord {
  id: string;
  generation: number;
  timestamp: string;
  depth: number;
  targetFile: string;
  targetSha256: string;
  filesScanned: number;
  totalLines: number;
  emptyCatchCount: number;
  todoCount: number;
  findingsSummary: string;
  recommendations: string[];
  merkleRoot: string;
  status: 'VERIFIED' | 'ACTION_NEEDED';
}

interface DbStats {
  sqliteActive: boolean;
  evolutiveAxioms: number;
  agenticMemory: number;
  trajectories: number;
  evolutionCycles: number;
}

export const SingularitySelfImprovementModule: React.FC = () => {
  const [cycles, setCycles] = useState<EvolutionCycleRecord[]>([]);
  const [generation, setGeneration] = useState(0);
  const [depth, setDepth] = useState(3);
  const [merkleRoot, setMerkleRoot] = useState('');
  const [totalFilesHashed, setTotalFilesHashed] = useState(0);
  const [dbStats, setDbStats] = useState<DbStats | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadState = async () => {
    try {
      const res = await apiFetch('/api/singularity/self-improve/state');
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setGeneration(data.generation || 0);
        setCycles(data.cycles || []);
        setMerkleRoot(data.merkleRoot || '');
        setTotalFilesHashed(data.totalFilesHashed || 0);
        setDbStats(data.dbStats || null);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to load diagnostic state.');
    }
  };

  useEffect(() => {
    loadState();
  }, []);

  const runDiagnosticCycle = async () => {
    setIsRunning(true);
    setErrorMsg(null);
    try {
      const res = await apiFetch('/api/singularity/self-improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ depth })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Diagnostic cycle failed.');
      setGeneration(data.generation);
      setCycles(data.cycles || []);
      setDbStats(data.dbStats || null);
      if (data.cycle?.merkleRoot) setMerkleRoot(data.cycle.merkleRoot);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Self-improvement diagnostic failed.');
    } finally {
      setIsRunning(false);
    }
  };

  const latest = cycles[0] || null;

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-y-auto">
      <div className="px-6 py-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-50 tracking-tight">
            Autonomous Codebase Diagnostics & Self-Improvement Engine
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span>Live workspace complexity & integrity scanner</span>
            <span aria-hidden="true">·</span>
            <span>SQLite persisted generations</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{merkleRoot ? `Merkle ${merkleRoot.slice(0, 14)}…` : 'Reading tree…'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 flex items-center gap-2">
            Target Rank
            <input
              type="number"
              min={1}
              max={12}
              value={depth}
              onChange={(e) => setDepth(Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
              className="w-16 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono tabular-nums text-slate-100"
            />
          </label>
          <button
            onClick={runDiagnosticCycle}
            disabled={isRunning}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Auditing Workspace…' : 'Run Diagnostic Cycle'}
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
            <div className="text-xs text-slate-400">Persisted Generation</div>
            <div className="mt-2 text-2xl font-semibold font-mono tabular-nums text-cyan-400">
              Gen {generation}
            </div>
            <div className="mt-1 text-xs text-slate-400 font-mono tabular-nums">
              {dbStats?.sqliteActive ? 'SQLite WAL persisted' : 'Disk JSON persisted'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="text-xs text-slate-400">Workspace Footprint</div>
            <div className="mt-2 text-2xl font-semibold font-mono tabular-nums text-slate-100">
              {latest ? latest.totalLines.toLocaleString() : totalFilesHashed.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-slate-400 font-mono tabular-nums">
              {latest ? `lines across ${latest.filesScanned} source files` : 'files hashed in Merkle tree'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="text-xs text-slate-400">Code Hygiene Signals</div>
            <div className="mt-2 text-2xl font-semibold font-mono tabular-nums text-amber-400">
              {latest ? latest.emptyCatchCount : '—'}
            </div>
            <div className="mt-1 text-xs text-slate-400 font-mono tabular-nums">
              {latest ? `silent catch blocks · ${latest.todoCount} TODO/FIXME` : 'Run a cycle to measure'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="text-xs text-slate-400">Kernel Axiom Ledger</div>
            <div className="mt-2 text-2xl font-semibold font-mono tabular-nums text-emerald-400">
              {dbStats ? dbStats.evolutiveAxioms : '—'}
            </div>
            <div className="mt-1 text-xs text-slate-400 font-mono tabular-nums">
              {dbStats ? `${dbStats.agenticMemory} memories · ${dbStats.trajectories} trajectories` : 'Connecting to kernelDb…'}
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-slate-900/60 border border-slate-800 divide-y divide-slate-800/80">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <Database className="w-4 h-4 text-cyan-400" />
              Persisted Diagnostic Cycles & Target Analysis
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-400">{cycles.length} recorded</span>
          </div>

          {cycles.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <div className="text-sm font-medium text-slate-200">No Diagnostic Cycles Recorded Yet</div>
              <div className="text-xs text-slate-400">
                Click "Run Diagnostic Cycle" to scan your live codebase, hash the largest target module, and record recommendations into SQLite.
              </div>
            </div>
          ) : (
            cycles.map((c) => (
              <div key={c.id} className="p-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-semibold text-cyan-400">Gen {c.generation}</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="font-mono text-slate-200 flex items-center gap-1">
                      <FileCode2 className="w-3.5 h-3.5 text-slate-400" />
                      {c.targetFile}
                    </span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="font-mono text-slate-400">SHA-256 {c.targetSha256}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-slate-400">
                    <span>{new Date(c.timestamp).toLocaleString()}</span>
                    {c.status === 'VERIFIED' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    )}
                  </div>
                </div>
                <div className="text-xs text-slate-300">{c.findingsSummary}</div>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-emerald-300/90 space-y-1">
                  {c.recommendations.map((rec, i) => (
                    <div key={i}>+ {rec}</div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
