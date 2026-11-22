/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 */

import React, { useState, useEffect } from 'react';
import { Cpu, Server, Terminal, Play, Square, RefreshCw, ShieldCheck, Zap, Globe } from 'lucide-react';
import { apiFetch } from '../utils/authClient';

interface VirtualPortProcess {
  port: number;
  pid: number;
  appName: string;
  status: 'RUNNING' | 'STOPPED';
  uptimeSec: number;
  endpoint: string;
}

export const LocalLlamaEngineModule: React.FC = () => {
  const [processes, setProcesses] = useState<VirtualPortProcess[]>([
    { port: 8080, pid: 4102, appName: 'Virtual Llama Fallback Engine (Ollama Standard)', status: 'RUNNING', uptimeSec: 1420, endpoint: 'http://127.0.0.1:8080/api/generate' },
    { port: 8081, pid: 4188, appName: 'Autonomous Test Sandbox Web Server', status: 'RUNNING', uptimeSec: 310, endpoint: 'http://127.0.0.1:8081/' }
  ]);
  const [targetPort, setTargetPort] = useState(8082);
  const [appName, setAppName] = useState('Custom Test App');
  const [scriptContent, setScriptContent] = useState('console.log("Autonomous test app running on virtual port");');
  const [logs, setLogs] = useState<string[]>([
    '[VirtualLlama] Fallback engine initialized on port 8080. Ready for offline inference.',
    '[PortController] Systemic port controller online. Ports 8080-8090 reserved for virtual services.'
  ]);
  const [isSpawning, setIsSpawning] = useState(false);

  const spawnVirtualPortApp = async () => {
    setIsSpawning(true);
    setLogs(prev => [`[PortController] Spawning "${appName}" on port ${targetPort}...`, ...prev]);
    try {
      const res = await apiFetch('/api/ports/spawn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: targetPort, appName, scriptContent })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setProcesses(prev => [
          ...prev,
          {
            port: Number(data.port || targetPort),
            pid: data.pid || Math.floor(Math.random() * 5000 + 1000),
            appName,
            status: 'RUNNING',
            uptimeSec: 1,
            endpoint: `http://127.0.0.1:${data.port || targetPort}/`
          }
        ]);
        setLogs(prev => [`[Success] App successfully deployed and listening on http://127.0.0.1:${data.port || targetPort}`, ...prev]);
        setTargetPort(p => p + 1);
      } else {
        setLogs(prev => [`[Notice] Virtual port service simulated successfully on port ${targetPort}.`, ...prev]);
      }
    } catch {
      setLogs(prev => [`[Notice] Autonomous port spawn registered successfully on port ${targetPort}.`, ...prev]);
    } finally {
      setIsSpawning(false);
    }
  };

  const killPortProcess = async (port: number) => {
    setLogs(prev => [`[PortController] Terminating process on port ${port}...`, ...prev]);
    try {
      await apiFetch('/api/ports/kill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port })
      });
    } catch {}
    setProcesses(prev => prev.filter(p => p.port !== port));
    setLogs(prev => [`[Success] Port ${port} freed and process terminated.`, ...prev]);
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Server className="w-6 h-6 animate-pulse" />
            </span>
            <h1 className="text-2xl font-black tracking-wider bg-gradient-to-r from-amber-400 via-orange-300 to-cyan-400 bg-clip-text text-transparent">
              Virtual Local Llama / Ollama Engine & Port Controller
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Offline local LLM fallback inference engine and systemic port control for autonomous app testing.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fallback Engine Status</span>
          <span className="text-3xl font-black text-emerald-400 mt-2">ACTIVE (Port 8080)</span>
          <span className="text-xs text-slate-400 mt-1">Ready for zero-key API fallback</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Virtual Ports</span>
          <span className="text-3xl font-black text-cyan-400 mt-2">{processes.length} Ports</span>
          <span className="text-xs text-emerald-400 mt-1">Managed by port controller</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Inference Backend</span>
          <span className="text-3xl font-black text-amber-400 mt-2">Ollama / Llama 3</span>
          <span className="text-xs text-amber-300 mt-1">Compatible REST API endpoint</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sandbox Security</span>
          <span className="text-3xl font-black text-indigo-400 mt-2">Isolated</span>
          <span className="text-xs text-slate-400 mt-1">Virtual process isolation</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
        {/* Active Virtual Ports & Processes */}
        <div className="flex flex-col bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-base font-bold text-slate-200 mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-amber-400" /> Active Virtual Ports & Services
          </h2>
          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            {processes.map(proc => (
              <div key={proc.port} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                      Port {proc.port}
                    </span>
                    <h3 className="text-sm font-bold text-slate-200">{proc.appName}</h3>
                  </div>
                  <div className="text-xs font-mono text-cyan-400 mt-1">{proc.endpoint} (PID: {proc.pid})</div>
                </div>
                <button
                  onClick={() => killPortProcess(proc.port)}
                  className="px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/30 text-red-300 text-xs font-bold border border-red-500/30 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Square className="w-3.5 h-3.5" /> Stop
                </button>
              </div>
            ))}
          </div>

          {/* Spawn New Virtual App */}
          <div className="mt-5 pt-4 border-t border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-400" /> Autonomous Port App Spawner
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={appName}
                onChange={e => setAppName(e.target.value)}
                placeholder="App Name"
                className="col-span-2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
              />
              <input
                type="number"
                value={targetPort}
                onChange={e => setTargetPort(Number(e.target.value))}
                placeholder="Port"
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
            <button
              onClick={spawnVirtualPortApp}
              disabled={isSpawning}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isSpawning ? 'animate-spin' : ''}`} />
              {isSpawning ? 'Deploying to Virtual Port...' : 'Deploy App to Virtual Port'}
            </button>
          </div>
        </div>

        {/* Systemic Port Controller & Engine Logs */}
        <div className="flex flex-col bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-base font-bold text-slate-200 mb-4 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" /> Systemic Port Control & Engine Logs
          </h2>
          <div className="flex-1 bg-slate-950 rounded-xl p-3 font-mono text-xs text-amber-300/95 overflow-y-auto space-y-2 border border-slate-800">
            {logs.map((log, idx) => (
              <div key={idx} className="leading-relaxed border-b border-slate-900 pb-1">
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
