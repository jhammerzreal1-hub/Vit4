/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 */

import React, { useEffect, useState } from 'react';
import { Server, Play, Square, RefreshCw, Activity, Send, Cpu, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../utils/authClient';

interface ListeningSocketInfo {
  port: number;
  address: string;
  protocol: 'tcp' | 'tcp6';
  managedByController: boolean;
  appName: string;
  pid: number | null;
  status: 'RUNNING' | 'LISTENING';
  uptimeSec: number | null;
  requestCount: number;
  endpoint: string;
}

interface LocalLlmStatus {
  ollama: {
    reachable: boolean;
    endpoint: string;
    models: Array<{ name: string; sizeGb: number; modifiedAt: string }>;
    error?: string;
  };
  hardware: {
    hostname: string;
    platform: string;
    nodeVersion: string;
    cpuCount: number;
    cpuModel: string;
    loadAvg1m: number;
    totalMemGb: number;
    usedMemGb: number;
    freeMemGb: number;
    processRssMb: number;
    uptimeSec: number;
  };
  serverAiFallbackReady: boolean;
}

export const LocalLlamaEngineModule: React.FC = () => {
  const [status, setStatus] = useState<LocalLlmStatus | null>(null);
  const [ports, setPorts] = useState<ListeningSocketInfo[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [targetPort, setTargetPort] = useState(8082);
  const [appName, setAppName] = useState('Sovereign API Sandbox');
  const [isSpawning, setIsSpawning] = useState(false);

  const [prompt, setPrompt] = useState('Summarize the health and architecture of this Sovereign OS environment in 3 bullet points.');
  const [selectedModel, setSelectedModel] = useState('llama3.2');
  const [allowFallback, setAllowFallback] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [inferenceResult, setInferenceResult] = useState<{
    engine: string;
    model: string;
    latencyMs: number;
    text: string;
    note?: string;
  } | null>(null);

  const [logs, setLogs] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const appendLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 60));
  };

  const refreshAll = async () => {
    setIsRefreshing(true);
    setErrorMsg(null);
    try {
      const [stRes, portsRes] = await Promise.all([
        apiFetch('/api/local-llama/status'),
        apiFetch('/api/ports/list')
      ]);
      const stData = await stRes.json().catch(() => ({}));
      const portsData = await portsRes.json().catch(() => ({}));

      if (stRes.ok && stData.success) {
        setStatus({
          ollama: stData.ollama,
          hardware: stData.hardware,
          serverAiFallbackReady: stData.serverAiFallbackReady
        });
        if (stData.ollama?.models?.length > 0) {
          setSelectedModel((prev) => prev || stData.ollama.models[0].name);
        }
      }
      if (portsRes.ok && portsData.success) {
        setPorts(portsData.ports || []);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to query local engine and OS sockets.');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const spawnRealPort = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSpawning(true);
    setErrorMsg(null);
    try {
      const res = await apiFetch('/api/ports/spawn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: targetPort, appName })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Failed to bind port ${targetPort}`);
      }
      appendLog(`Bound real HTTP loopback server "${appName}" on http://127.0.0.1:${data.port}/ (PID ${data.pid})`);
      setTargetPort((p) => (p < 9999 ? p + 1 : 8082));
      await refreshAll();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to bind loopback port.');
      appendLog(`Error: ${err?.message || 'Port bind failed'}`);
    } finally {
      setIsSpawning(false);
    }
  };

  const probePort = async (port: number) => {
    setErrorMsg(null);
    try {
      const res = await apiFetch('/api/ports/probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Probe failed');
      const p = data.probe;
      appendLog(
        `Probe 127.0.0.1:${port} -> ${p.reachable ? `HTTP ${p.statusCode} in ${p.latencyMs}ms` : 'Unreachable'} | ${p.bodyPreview.slice(0, 120)}`
      );
      await refreshAll();
    } catch (err: any) {
      appendLog(`Probe 127.0.0.1:${port} error: ${err?.message || 'failed'}`);
    }
  };

  const stopManagedPort = async (port: number) => {
    setErrorMsg(null);
    try {
      const res = await apiFetch('/api/ports/kill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Stop failed');
      appendLog(`Closed real HTTP listener on 127.0.0.1:${port} and released socket.`);
      await refreshAll();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to stop listener.');
    }
  };

  const runInference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const res = await apiFetch('/api/local-llama/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: selectedModel,
          allowCloudFallback: allowFallback
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Inference failed.');
      }
      setInferenceResult({
        engine: data.engine,
        model: data.model,
        latencyMs: data.latencyMs,
        text: data.response,
        note: data.note
      });
      appendLog(`Inference complete via ${data.engine} (${data.model}) in ${data.latencyMs}ms.`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Inference error.');
      appendLog(`Inference error: ${err?.message || 'failed'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const managedCount = ports.filter((p) => p.managedByController).length;

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-y-auto">
      <div className="px-6 py-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-50 tracking-tight">
            Local LLM & Live Loopback Port Controller
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span>Real Ollama daemon probe (127.0.0.1:11434)</span>
            <span aria-hidden="true">·</span>
            <span>Live /proc/net/tcp socket scanner</span>
            <span aria-hidden="true">·</span>
            <span>Real Node HTTP loopback sandbox (8000–9999)</span>
          </div>
        </div>
        <button
          onClick={refreshAll}
          disabled={isRefreshing}
          className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Telemetry
        </button>
      </div>

      <div className="p-6 space-y-6 flex-1">
        {errorMsg && (
          <div className="p-3.5 rounded-lg bg-red-950/60 border border-red-800/70 text-red-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Real Hardware & Daemon KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="text-xs text-slate-400">Local Ollama Daemon</div>
            <div className={`mt-2 text-xl font-semibold ${status?.ollama.reachable ? 'text-emerald-400' : 'text-amber-400'}`}>
              {status ? (status.ollama.reachable ? 'Online' : 'Not Detected') : '—'}
            </div>
            <div className="mt-1 text-xs text-slate-400 font-mono tabular-nums">
              {status?.ollama.reachable
                ? `${status.ollama.models.length} local model(s) ready`
                : status?.serverAiFallbackReady
                ? 'Server AI fallback available'
                : 'Start with `ollama serve`'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="text-xs text-slate-400">Listening TCP Sockets</div>
            <div className="mt-2 text-xl font-semibold font-mono tabular-nums text-cyan-400">
              {ports.length}
            </div>
            <div className="mt-1 text-xs text-slate-400 font-mono tabular-nums">
              {managedCount} managed sandbox listener(s)
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="text-xs text-slate-400">Host Compute</div>
            <div className="mt-2 text-xl font-semibold font-mono tabular-nums text-slate-100">
              {status ? `${status.hardware.cpuCount} Cores` : '—'}
            </div>
            <div className="mt-1 text-xs text-slate-400 font-mono tabular-nums">
              {status ? `Load 1m: ${status.hardware.loadAvg1m} · ${status.hardware.nodeVersion}` : 'Reading host…'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="text-xs text-slate-400">Host Memory & Process RSS</div>
            <div className="mt-2 text-xl font-semibold font-mono tabular-nums text-slate-100">
              {status ? `${status.hardware.usedMemGb}/${status.hardware.totalMemGb} GB` : '—'}
            </div>
            <div className="mt-1 text-xs text-slate-400 font-mono tabular-nums">
              {status ? `OS Process RSS: ${status.hardware.processRssMb} MB` : 'Measuring…'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Real Port Scanner & Loopback Spawner */}
          <div className="rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Server className="w-4 h-4 text-amber-400" />
                Live OS Listening Sockets & Loopback Sandboxes
              </div>
              <span className="text-xs font-mono text-slate-400">127.0.0.1</span>
            </div>

            <div className="divide-y divide-slate-800/70 max-h-80 overflow-y-auto">
              {ports.length === 0 ? (
                <div className="p-6 text-xs text-slate-400 text-center">No active TCP sockets detected.</div>
              ) : (
                ports.map((p) => (
                  <div key={`${p.protocol}-${p.port}`} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-900">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-semibold tabular-nums text-amber-300">:{p.port}</span>
                        <span className="text-slate-100 font-medium truncate">{p.appName}</span>
                      </div>
                      <div className="text-xs font-mono text-slate-400 mt-0.5 tabular-nums">
                        {p.address} · {p.protocol.toUpperCase()}
                        {p.pid ? ` · PID ${p.pid}` : ''}
                        {p.managedByController ? ` · ${p.requestCount} reqs` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => probePort(p.port)}
                        className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 whitespace-nowrap cursor-pointer"
                      >
                        <Activity className="w-3 h-3 text-cyan-400" />
                        Probe
                      </button>
                      {p.managedByController && (
                        <button
                          onClick={() => stopManagedPort(p.port)}
                          className="px-2.5 py-1 rounded-md bg-red-950 hover:bg-red-900 border border-red-800/70 text-red-200 text-xs flex items-center gap-1 whitespace-nowrap cursor-pointer"
                        >
                          <Square className="w-3 h-3" />
                          Stop
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Real Sandbox Spawner */}
            <form onSubmit={spawnRealPort} className="p-4 border-t border-slate-800 space-y-3 mt-auto">
              <div className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                Bind Real Local HTTP Sandbox (Ports 8000–9999)
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="Service name"
                  className="col-span-2 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
                <input
                  type="number"
                  min={8000}
                  max={9999}
                  value={targetPort}
                  onChange={(e) => setTargetPort(Number(e.target.value))}
                  className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono tabular-nums text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <button
                type="submit"
                disabled={isSpawning}
                className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isSpawning ? 'Binding 127.0.0.1 Socket…' : 'Bind Live Loopback Service'}
              </button>
            </form>
          </div>

          {/* Live Hybrid Inference Console + Event Log */}
          <div className="flex flex-col gap-6">
            <form onSubmit={runInference} className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  Live Local / Hybrid Inference Console
                </div>
                <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowFallback}
                    onChange={(e) => setAllowFallback(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950"
                  />
                  Fallback to Server AI if Ollama offline
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  placeholder="Ollama model (e.g. llama3.2)"
                  className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                />
                <div className="sm:col-span-2 flex items-center text-xs text-slate-400 px-2">
                  {status?.ollama.models.length
                    ? `Installed: ${status.ollama.models.map((m) => m.name).join(', ')}`
                    : 'Ollama offline on 127.0.0.1:11434 — will transparently report or use Server AI fallback.'}
                </div>
              </div>

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="Enter prompt to test local Ollama or Server AI cascade…"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />

              <button
                type="submit"
                disabled={isGenerating}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                {isGenerating ? 'Running Inference…' : 'Execute Live Inference'}
              </button>

              {inferenceResult && (
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400">
                    <span>Engine: {inferenceResult.engine} · Model: {inferenceResult.model}</span>
                    <span className="tabular-nums text-emerald-400">{inferenceResult.latencyMs}ms</span>
                  </div>
                  {inferenceResult.note && (
                    <div className="text-xs text-amber-300/90">{inferenceResult.note}</div>
                  )}
                  <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {inferenceResult.text}
                  </div>
                </div>
              )}
            </form>

            <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 flex-1 flex flex-col">
              <div className="text-xs font-semibold text-slate-200 mb-2">Live Controller Activity</div>
              <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-300 space-y-1.5 max-h-44 overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="text-slate-500">Bind a loopback port, probe a socket, or execute inference to inspect live output.</div>
                ) : (
                  logs.map((line, i) => <div key={i} className="leading-relaxed">{line}</div>)
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
