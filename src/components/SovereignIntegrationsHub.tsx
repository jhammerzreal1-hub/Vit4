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

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Layers,
  ShieldCheck,
  RefreshCw,
  ArrowUpRight,
  Key,
  Cpu,
  Database,
  Globe,
  HardDrive,
  Phone,
  Smartphone,
  Terminal,
  CheckCircle2,
  AlertCircle,
  Zap,
  Sparkles,
  Search
} from 'lucide-react';
import type { ModuleType } from '../types';

interface IntegrationNode {
  id: string;
  name: string;
  category: string;
  status: string;
  configured: boolean;
  module: ModuleType;
  endpoint: string;
  capabilities: string[];
}

interface SovereignIntegrationsHubProps {
  onSelectModule: (module: ModuleType) => void;
  onInjectIntoChat?: (content: string, immediate?: boolean) => void;
}

export const SovereignIntegrationsHub: React.FC<SovereignIntegrationsHubProps> = ({
  onSelectModule,
  onInjectIntoChat
}) => {
  const [integrations, setIntegrations] = useState<IntegrationNode[]>([]);
  const [vault, setVault] = useState<any>(null);
  const [modulesCount, setModulesCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [probingId, setProbingId] = useState<string | null>(null);
  const [probeResults, setProbeResults] = useState<Record<string, { ok: boolean; latencyMs: number; label: string }>>({});

  const fetchMatrix = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/integrations/matrix');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setIntegrations(Array.isArray(data.integrations) ? data.integrations : []);
      setVault(data.vault || null);
      setModulesCount(data.modulesCount || 0);
    } catch (e: any) {
      setError(e?.message || 'Failed to load sovereign integrations matrix');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatrix();
  }, [fetchMatrix]);

  const categories = useMemo(() => {
    const s = new Set<string>(['ALL']);
    integrations.forEach((i) => s.add(i.category));
    return Array.from(s);
  }, [integrations]);

  const filtered = useMemo(() => {
    return integrations.filter((item) => {
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.capabilities.some((c) => c.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [integrations, categoryFilter, searchQuery]);

  const probeEndpoint = async (node: IntegrationNode) => {
    if (!node.endpoint.startsWith('/api/')) {
      setProbeResults((prev) => ({
        ...prev,
        [node.id]: { ok: true, latencyMs: 1, label: 'Client OAuth / Browser API' }
      }));
      return;
    }
    setProbingId(node.id);
    const t0 = performance.now();
    try {
      const isPost = node.endpoint.includes('/chat') || node.endpoint.includes('/functions/execute');
      const res = await fetch(node.endpoint, {
        method: isPost ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: isPost
          ? JSON.stringify(
              node.endpoint.includes('/functions/execute')
                ? { functionId: 'listDirectory', args: { dirPath: 'src' }, agentId: 'integrations-hub' }
                : { prompt: 'ping', zeroTokenMode: false }
            )
          : undefined
      });
      const ms = Math.round(performance.now() - t0);
      setProbeResults((prev) => ({
        ...prev,
        [node.id]: {
          ok: res.ok,
          latencyMs: ms,
          label: `HTTP ${res.status} (${ms}ms)`
        }
      }));
    } catch (e: any) {
      setProbeResults((prev) => ({
        ...prev,
        [node.id]: {
          ok: false,
          latencyMs: Math.round(performance.now() - t0),
          label: e?.message || 'Unreachable'
        }
      }));
    } finally {
      setProbingId(null);
    }
  };

  const getCategoryIcon = (category: string) => {
    if (category.includes('Google')) return HardDrive;
    if (category.includes('Security')) return Key;
    if (category.includes('LLM')) return Cpu;
    if (category.includes('Developer')) return Terminal;
    if (category.includes('Telecom')) return Phone;
    if (category.includes('Persistence')) return Database;
    if (category.includes('Edge')) return Smartphone;
    return Globe;
  };

  const configuredTotal = integrations.filter((i) => i.configured).length;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 font-mono">
      {/* Header Banner */}
      <div className="bg-zinc-900/80 border border-amber-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-emerald-500 to-cyan-500" />
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Layers className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-zinc-100">Sovereign Integration &amp; Add-On Control Plane</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                  {configuredTotal}/{integrations.length} INTEGRATIONS READY
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold">
                  {modulesCount} MODULES UNIFIED
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-sans mt-1 max-w-3xl">
                Unified control fabric linking Google Workspace (Tasks &amp; Drive), AES-256-GCM Secrets Vault, Autonomous Workspace IDE, Multi-LLM Mesh (Gemini, DeepSeek, Groq, OpenRouter, Ollama), GitHub, Carrier Telecom, Firebase Firestore, SQLite Kernel, and Edge Runtimes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {onInjectIntoChat && (
              <button
                onClick={() =>
                  onInjectIntoChat(
                    `Inspect active integrations across our Sovereign Orchestrator (${configuredTotal}/${integrations.length} active, ${vault?.configuredCount ?? 0}/${vault?.totalTracked ?? 0} vault secrets configured) and recommend cross-addon automations we can execute immediately.`,
                    false
                  )
                }
                className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Orchestrate via Chat</span>
              </button>
            )}
            <button
              onClick={fetchMatrix}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
              <span>Refresh Matrix</span>
            </button>
          </div>
        </div>

        {/* Summary Telemetry Strip */}
        {vault && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-zinc-800/80 text-xs">
            <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800">
              <div className="text-[10px] text-zinc-500">AES-256-GCM VAULT</div>
              <div className="text-emerald-300 font-bold mt-0.5">
                {vault.configuredCount} / {vault.totalTracked} Keys Active
              </div>
            </div>
            <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800">
              <div className="text-[10px] text-zinc-500">GOOGLE WORKSPACE</div>
              <div className="text-sky-300 font-bold mt-0.5">Tasks v1 + Drive v3</div>
            </div>
            <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800">
              <div className="text-[10px] text-zinc-500">AUTONOMOUS LOOP</div>
              <div className="text-amber-300 font-bold mt-0.5">Gemini + OpenAI Providers</div>
            </div>
            <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800">
              <div className="text-[10px] text-zinc-500">PERSISTENCE LAYER</div>
              <div className="text-purple-300 font-bold mt-0.5">Firestore + SQLite + IDB</div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border whitespace-nowrap cursor-pointer transition ${
                categoryFilter === cat
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative sm:w-72">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter add-ons or capabilities..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((node) => {
          const Icon = getCategoryIcon(node.category);
          const probe = probeResults[node.id];
          return (
            <div
              key={node.id}
              className="bg-zinc-900/50 border border-zinc-800 hover:border-amber-500/40 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-amber-400 shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-zinc-100 truncate">{node.name}</h3>
                      <div className="text-[10px] text-zinc-500">{node.category}</div>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full border font-bold shrink-0 ${
                      node.configured
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                        : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                    }`}
                  >
                    {node.status}
                  </span>
                </div>

                <div className="text-[10px] text-cyan-300 bg-zinc-950 px-2.5 py-1.5 rounded-lg border border-zinc-800 truncate">
                  {node.endpoint}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {node.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-950/90 border border-zinc-800 text-zinc-300"
                    >
                      {cap}
                    </span>
                  ))}
                </div>

                {probe && (
                  <div
                    className={`p-2 rounded-xl text-[10px] font-bold flex items-center gap-1.5 ${
                      probe.ok
                        ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-950/40 border border-rose-500/30 text-rose-300'
                    }`}
                  >
                    {probe.ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                    <span>{probe.label}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => probeEndpoint(node)}
                  disabled={probingId === node.id}
                  className="px-3 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Zap className={`w-3 h-3 text-amber-400 ${probingId === node.id ? 'animate-spin' : ''}`} />
                  <span>{probingId === node.id ? 'Probing...' : 'Probe'}</span>
                </button>

                <div className="flex items-center gap-1.5">
                  {!node.configured && (
                    <button
                      onClick={() => onSelectModule('api-secrets')}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold cursor-pointer"
                    >
                      Set Key
                    </button>
                  )}
                  <button
                    onClick={() => onSelectModule(node.module)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Open</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
