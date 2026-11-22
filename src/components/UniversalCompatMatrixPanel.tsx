/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 * (TWENTY 47 PROTOCOL - GENESIS NODE / LYSANDER CORE EULA / H-FID Forensic License v1.1).
 * Zenodo DOI: https://doi.org/10.5281/zenodo.20778079 | ORCID: https://orcid.org/0009-0004-5273-7028
 */

import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Cpu,
  Layers,
  RefreshCw,
  ShieldCheck,
  Terminal,
  AlertCircle,
  Sparkles,
  Play
} from 'lucide-react';
import { apiFetch } from '../utils/authClient';

interface UniversalCompatCapability {
  id: string;
  category:
    | 'windows-parity'
    | 'linux-native'
    | 'android-mobile'
    | 'macos-darwin'
    | 'cross-arch-wasm'
    | 'beyond-windows-kernel';
  name: string;
  formats: string[];
  available: boolean;
  versionOrPath: string;
  windowsComparison: string;
  installOrRunCommand: string;
}

interface ProbeResponse {
  hostPlatform: string;
  arch: string;
  kernelRelease: string;
  totalCapabilities: number;
  activeCount: number;
  capabilities: UniversalCompatCapability[];
}

const CATEGORY_META: Record<
  UniversalCompatCapability['category'],
  { label: string; color: string; desc: string }
> = {
  'windows-parity': {
    label: 'Windows Full Parity (.EXE / DirectX / Steam)',
    color: 'text-sky-300 bg-sky-500/15 border-sky-500/40',
    desc: 'Everything Windows runs — Win32/Win64 PE, DirectX 9–12 (DXVK/VKD3D), Valve Steam, Discord, PowerShell.'
  },
  'linux-native': {
    label: 'Native Linux & Containers (Beyond Windows)',
    color: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/40',
    desc: 'Zero-VM native ELF64, AppImage, Flatpak, APT/Nix/Pacman, and native kernel OCI/Docker/Distrobox.'
  },
  'android-mobile': {
    label: 'Android APK / Waydroid / ADB (Killed on Windows)',
    color: 'text-lime-300 bg-lime-500/15 border-lime-500/40',
    desc: 'Microsoft discontinued Windows Subsystem for Android (WSA) — Lysander supports native Waydroid + ADB.'
  },
  'macos-darwin': {
    label: 'macOS / Darwin Translation & KVM (Beyond Windows)',
    color: 'text-violet-300 bg-violet-500/15 border-violet-500/40',
    desc: 'Mach-O / .app / .dmg translation via Darling & bare-metal KVM/QEMU virtualization.'
  },
  'cross-arch-wasm': {
    label: 'Cross-Architecture & Polyglot WASM (x86_64 / ARM64 / RISC-V)',
    color: 'text-amber-300 bg-amber-500/15 border-amber-500/40',
    desc: 'Execute x86_64, ARM64, RISC-V, WebAssembly/WASI, Python, Node.js, Rust, Go & C/C++ side-by-side.'
  },
  'beyond-windows-kernel': {
    label: 'UID 0 Bare-Metal Freedom & Unlimited Customization',
    color: 'text-rose-300 bg-rose-500/15 border-rose-500/40',
    desc: 'Unrestricted /proc & /sys kernel control, zero forced updates/telemetry/TPM lockouts, live CSS & UI source sovereignty.'
  }
};

export const UniversalCompatMatrixPanel: React.FC = () => {
  const [probe, setProbe] = useState<ProbeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterCat, setFilterCat] = useState<string>('all');
  const [execOutput, setExecOutput] = useState<string>('');
  const [runningId, setRunningId] = useState<string | null>(null);

  const runProbe = async () => {
    setLoading(true);
    try {
      const r = await apiFetch('/api/os/compatibility/probe');
      const data = await r.json();
      if (data?.success) {
        setProbe(data);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    runProbe();
  }, []);

  const handleRunCommand = async (cap: UniversalCompatCapability) => {
    setRunningId(cap.id);
    setExecOutput(`$ ${cap.installOrRunCommand}\nRunning live on host kernel...`);
    try {
      const r = await apiFetch('/api/os/shell/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cap.installOrRunCommand })
      });
      const data = await r.json();
      const out = [data.stdout, data.stderr].filter(Boolean).join('\n').trim();
      setExecOutput(
        `$ ${cap.installOrRunCommand}\n[exit ${data.exitCode ?? (data.success ? 0 : 1)}]\n${out || '(completed with no output)'}`
      );
      runProbe();
    } catch (err: any) {
      setExecOutput(`Error executing command: ${err?.message || 'unknown error'}`);
    } finally {
      setRunningId(null);
    }
  };

  const capabilities = probe?.capabilities || [];
  const filtered =
    filterCat === 'all' ? capabilities : capabilities.filter((c) => c.category === filterCat);

  return (
    <div className="space-y-4 text-xs text-slate-200">
      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-950/70 via-slate-900 to-emerald-950/60 border border-indigo-500/30 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">
              Beyond-Windows Universal Runtime &amp; Multi-OS Compatibility Engine
            </h3>
          </div>
          <p className="text-xs text-slate-300 max-w-3xl">
            Full Windows parity (Win32/Win64 <code className="text-sky-300">.exe/.msi</code>, DirectX 9–12, Steam + Proton, Discord, PowerShell) <strong>PLUS</strong> everything Windows restricts or cannot natively run: Linux ELF/AppImage/Flatpak/Nix, native OCI/Docker/Distrobox, Android APK/Waydroid/ADB, macOS Mach-O/Darling/KVM, Cross-Arch ARM64/RISC-V/WASM, and unrestricted <code className="text-emerald-300">UID 0</code> kernel &amp; UI sovereignty.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {probe && (
            <div className="px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800 font-mono text-[11px]">
              <span className="text-emerald-400 font-bold">
                {probe.activeCount}/{probe.totalCapabilities}
              </span>{' '}
              <span className="text-slate-400">
                Active Live · {probe.hostPlatform}/{probe.arch}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={runProbe}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Re-Probe Host Kernel</span>
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setFilterCat('all')}
          className={`px-3 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer ${
            filterCat === 'all'
              ? 'bg-amber-500/20 border-amber-400 text-amber-200'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          All Ecosystems ({capabilities.length})
        </button>
        {(Object.keys(CATEGORY_META) as Array<UniversalCompatCapability['category']>).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilterCat(cat)}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium cursor-pointer ${
              filterCat === cat
                ? CATEGORY_META[cat].color
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {CATEGORY_META[cat].label.split(' (')[0]}
          </button>
        ))}
      </div>

      {/* Live Capability Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {filtered.map((cap) => {
          const catMeta = CATEGORY_META[cap.category];
          return (
            <div
              key={cap.id}
              className={`rounded-xl border p-4 flex flex-col justify-between gap-3 ${
                cap.available
                  ? 'bg-[#0e1726] border-emerald-500/30'
                  : 'bg-[#0d121d] border-slate-800'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`inline-block px-2 py-0.5 rounded border text-[9px] font-mono mb-1 ${catMeta.color}`}>
                      {catMeta.label}
                    </span>
                    <h4 className="text-sm font-bold text-white leading-snug">{cap.name}</h4>
                  </div>
                  {cap.available ? (
                    <span className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      ACTIVE LIVE
                    </span>
                  ) : (
                    <span className="shrink-0 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 text-[10px] font-mono flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      BRIDGE / INSTALL
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1">
                  {cap.formats.map((fmt) => (
                    <span
                      key={fmt}
                      className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-[10px] text-sky-300"
                    >
                      {fmt}
                    </span>
                  ))}
                </div>

                <div className="text-[11px] font-mono text-slate-400 bg-slate-950/70 border border-slate-800/80 rounded-lg px-2.5 py-1.5 break-all">
                  <Cpu className="w-3 h-3 inline mr-1.5 text-emerald-400" />
                  {cap.versionOrPath}
                </div>

                <div className="text-[11px] text-slate-300 flex items-start gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>{cap.windowsComparison}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <code className="text-[10px] font-mono text-slate-400 truncate max-w-[68%]">
                  $ {cap.installOrRunCommand}
                </code>
                <button
                  type="button"
                  disabled={runningId === cap.id}
                  onClick={() => handleRunCommand(cap)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 text-[10px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  {runningId === cap.id ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Play className="w-3 h-3" />
                  )}
                  <span>{cap.available ? 'Verify Live' : 'Run / Setup'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Execution Console */}
      {execOutput && (
        <div className="rounded-xl bg-black/90 border border-emerald-500/30 p-3 font-mono text-[11px] text-emerald-300 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              LIVE KERNEL COMPATIBILITY EXECUTION LOG
            </span>
            <button
              type="button"
              onClick={() => setExecOutput('')}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              Clear
            </button>
          </div>
          <pre className="whitespace-pre-wrap break-words max-h-48 overflow-y-auto">{execOutput}</pre>
        </div>
      )}

      {/* Why Lysander Outperforms Windows Summary Strip */}
      <div className="rounded-xl bg-slate-950/90 border border-slate-800 p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
        <div className="space-y-1">
          <div className="font-bold text-amber-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            <span>Hyper-Customization Beyond Windows</span>
          </div>
          <p className="text-slate-400">
            Delete/hide any desktop icon, create real files/folders/Steam shortcuts directly on Desktop, inject live CSS dotfiles, customize blur/opacity/radius, upload local wallpapers, and export/import full OS profiles.
          </p>
        </div>
        <div className="space-y-1">
          <div className="font-bold text-sky-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Zero Artificial OS Lockouts</span>
          </div>
          <p className="text-slate-400">
            No forced Microsoft accounts, no TPM 2.0 hardware blocks, no background telemetry, no forced restarts, and direct full-host filesystem + UID 0 terminal + Physical Host Bridge access.
          </p>
        </div>
        <div className="space-y-1">
          <div className="font-bold text-emerald-300 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Play Every Steam Game, Any Input</span>
          </div>
          <p className="text-slate-400">
            Live Valve Steam catalog + local VDF/ACF library scanner + Proton/DXVK/Gamescope/Host-Bridge runner + full Xbox, PlayStation DualSense, Nintendo Switch, Steam Deck, Keyboard/Mouse &amp; Multi-Touch Virtual Controller support.
          </p>
        </div>
      </div>
    </div>
  );
};
