/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 */

import React, { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, Plus, Play } from 'lucide-react';
import { apiFetch } from '../utils/authClient';

interface AutonomousGoalRecord {
  id: string;
  title: string;
  objective: string;
  category: 'security' | 'architecture' | 'performance' | 'mesh' | 'reliability';
  probeType: string;
  status: 'FORMULATING' | 'TESTING' | 'VERIFIED' | 'NEEDS_WORK';
  confidence: number;
  empiricalMetric: string;
  lastEvidence: string;
  createdAt: string;
  updatedAt: string;
}

export const AutonomousGoalEngineModule: React.FC = () => {
  const [goals, setGoals] = useState<AutonomousGoalRecord[]>([]);
  const [isFormulating, setIsFormulating] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customObjective, setCustomObjective] = useState('');
  const [customCategory, setCustomCategory] = useState<AutonomousGoalRecord['category']>('security');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadGoals = async () => {
    try {
      const res = await apiFetch('/api/singularity/goals');
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setGoals(data.goals || []);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to load persisted goals.');
    }
  };

  useEffect(() => {
    loadGoals();
  }, []);

  const formulateFromTelemetry = async () => {
    setIsFormulating(true);
    setErrorMsg(null);
    try {
      const res = await apiFetch('/api/singularity/goals/formulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Goal formulation failed.');
      setGoals(data.goals || []);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to formulate goal.');
    } finally {
      setIsFormulating(false);
    }
  };

  const createCustomGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;
    setIsFormulating(true);
    setErrorMsg(null);
    try {
      const res = await apiFetch('/api/singularity/goals/formulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: customTitle,
          objective: customObjective,
          category: customCategory
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Goal creation failed.');
      setGoals(data.goals || []);
      setCustomTitle('');
      setCustomObjective('');
      setShowCreate(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save custom goal.');
    } finally {
      setIsFormulating(false);
    }
  };

  const verifyGoal = async (id: string) => {
    setVerifyingId(id);
    setErrorMsg(null);
    try {
      const res = await apiFetch(`/api/singularity/goals/${encodeURIComponent(id)}/verify`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Verification failed.');
      setGoals(data.goals || []);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to verify goal.');
    } finally {
      setVerifyingId(null);
    }
  };

  const verifiedCount = goals.filter((g) => g.status === 'VERIFIED').length;
  const needsWorkCount = goals.filter((g) => g.status === 'NEEDS_WORK').length;
  const avgConfidence = goals.length
    ? ((goals.reduce((acc, g) => acc + g.confidence, 0) / goals.length) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-y-auto">
      <div className="px-6 py-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-50 tracking-tight">
            Autonomous Goal & Empirical Verification Engine
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span>SQLite persisted engineering objectives</span>
            <span aria-hidden="true">·</span>
            <span>Live telemetry-derived goal generation</span>
            <span aria-hidden="true">·</span>
            <span>Automated OS probe verification</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Custom Goal
          </button>
          <button
            onClick={formulateFromTelemetry}
            disabled={isFormulating}
            className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFormulating ? 'animate-spin' : ''}`} />
            {isFormulating ? 'Deriving Goal…' : 'Derive Goal from Telemetry'}
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
            <div className="text-xs text-slate-400">Tracked Goals</div>
            <div className="mt-2 text-2xl font-semibold font-mono tabular-nums text-teal-400">{goals.length}</div>
            <div className="mt-1 text-xs text-slate-400">Stored in kernel SQLite</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="text-xs text-slate-400">Empirically Verified</div>
            <div className="mt-2 text-2xl font-semibold font-mono tabular-nums text-emerald-400">{verifiedCount}</div>
            <div className="mt-1 text-xs text-slate-400">Passed live OS probes</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="text-xs text-slate-400">Action Needed</div>
            <div className="mt-2 text-2xl font-semibold font-mono tabular-nums text-amber-400">{needsWorkCount}</div>
            <div className="mt-1 text-xs text-slate-400">Open hardening targets</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="text-xs text-slate-400">Mean Confidence</div>
            <div className="mt-2 text-2xl font-semibold font-mono tabular-nums text-slate-100">{avgConfidence}%</div>
            <div className="mt-1 text-xs text-slate-400">Computed from live probes</div>
          </div>
        </div>

        {showCreate && (
          <form onSubmit={createCustomGoal} className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-100">Create Engineering Goal</span>
              <button type="button" onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-200 cursor-pointer">
                Cancel
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                required
                placeholder="Goal title"
                className="md:col-span-2 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
              />
              <select
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value as any)}
                className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
              >
                <option value="security">Security</option>
                <option value="architecture">Architecture</option>
                <option value="performance">Performance</option>
                <option value="mesh">Mesh</option>
                <option value="reliability">Reliability</option>
              </select>
            </div>
            <textarea
              value={customObjective}
              onChange={(e) => setCustomObjective(e.target.value)}
              rows={2}
              placeholder="Objective & measurable acceptance criteria"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isFormulating}
                className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium cursor-pointer"
              >
                Save Goal
              </button>
            </div>
          </form>
        )}

        <div className="rounded-xl bg-slate-900/60 border border-slate-800 divide-y divide-slate-800/80">
          {goals.map((goal) => (
            <div key={goal.id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-900">
              <div className="space-y-1 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="capitalize text-slate-300">{goal.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{goal.empiricalMetric}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{(goal.confidence * 100).toFixed(0)}% confidence</span>
                </div>
                <h3 className="text-sm font-semibold text-slate-100">{goal.title}</h3>
                <p className="text-xs text-slate-400">{goal.objective}</p>
                <div className="text-xs font-mono text-slate-500 pt-0.5">{goal.lastEvidence}</div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`text-xs font-medium flex items-center gap-1 ${
                    goal.status === 'VERIFIED'
                      ? 'text-emerald-400'
                      : goal.status === 'NEEDS_WORK'
                      ? 'text-amber-400'
                      : 'text-cyan-400'
                  }`}
                >
                  {goal.status === 'VERIFIED' ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                  {goal.status === 'VERIFIED'
                    ? 'Verified'
                    : goal.status === 'NEEDS_WORK'
                    ? 'Needs Work'
                    : goal.status === 'TESTING'
                    ? 'Testing'
                    : 'Formulating'}
                </span>
                <button
                  onClick={() => verifyGoal(goal.id)}
                  disabled={verifyingId === goal.id}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50 cursor-pointer"
                >
                  <Play className="w-3 h-3 text-teal-400" />
                  {verifyingId === goal.id ? 'Checking…' : 'Verify Goal'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
