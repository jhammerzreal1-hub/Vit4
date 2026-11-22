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

import React, { useEffect } from 'react';
import { Play, Globe, Download, Gamepad2, Sparkles, FolderGit2, ArrowLeft } from 'lucide-react';

interface WorldLoadStartScreenProps {
  onBack?: () => void;
  onEnterWorld: () => void;
  onOpenEmulator: () => void;
  onOpenModder: () => void;
  onDownloadVault: () => void;
}

export const WorldLoadStartScreen: React.FC<WorldLoadStartScreenProps> = ({
  onBack,
  onEnterWorld,
  onOpenEmulator,
  onOpenModder,
  onDownloadVault
}) => {
  useEffect(() => {
    if (!onBack) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);

  return (
    <div className="relative flex flex-col items-center justify-start sm:justify-center min-h-full w-full bg-zinc-950 text-zinc-100 overflow-y-auto px-4 py-14 sm:p-6">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="fixed sm:absolute top-14 lg:top-4 left-3 sm:left-4 z-30 px-3 py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-md cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
          <span>Back to Workspace</span>
        </button>
      )}
      {/* Background Cinematic Aura */}
      <div className="absolute inset-0 bg-gradient-to-tr from-fuchsia-950/40 via-zinc-950 to-amber-950/30 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.15)_0,transparent_70%)] pointer-events-none" />

      <div className="relative z-10 max-w-3xl w-full text-center space-y-6 sm:space-y-8 my-auto">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-500/15 border border-fuchsia-500/40 text-fuchsia-300 font-mono text-xs shadow-lg shadow-fuchsia-950/60 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Unreal Engine 6 Beta · Nanite & Neural Radiance Caches Active</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight bg-gradient-to-r from-fuchsia-300 via-amber-200 to-cyan-300 bg-clip-text text-transparent">
            AETHERION ETERNAL
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 font-mono max-w-xl mx-auto">
            The World's Most Complex Autonomous MMORPG, Universal Game Emulator, and Cross-Game Modding Nexus.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-left text-xs font-mono">
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-fuchsia-300 font-bold">
              <Globe className="w-4 h-4 text-fuchsia-400" />
              <span>Living MMORPG World</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              51 Dungeons, 6 Races, 6 Classes, 1-of-1 Truly Evolving Skills, and Fully Autonomous Entities.
            </p>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <Gamepad2 className="w-4 h-4 text-amber-400" />
              <span>Universal Emulator Hub</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Multi-system ROM emulation with online multiplayer, gamepad controller support, and touch controls.
            </p>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-cyan-300 font-bold">
              <FolderGit2 className="w-4 h-4 text-cyan-400" />
              <span>Universal Game Modder</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Mod any game on disk (like OSRS, RuneScape, or custom engines) with zero downtime hot-injection.
            </p>
          </div>
        </div>

        {/* Action Launch Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <button
            type="button"
            onClick={onEnterWorld}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-amber-600 hover:from-fuchsia-500 hover:to-amber-500 text-white font-bold text-sm flex items-center gap-2.5 shadow-xl shadow-fuchsia-950/60 cursor-pointer transition-transform hover:scale-105"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Launch Aetherion MMORPG World</span>
          </button>

          <button
            type="button"
            onClick={onOpenEmulator}
            className="px-5 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-bold text-sm flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Gamepad2 className="w-4 h-4 text-amber-400" />
            <span>Universal Emulator & ROMs</span>
          </button>

          <button
            type="button"
            onClick={onOpenModder}
            className="px-5 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-bold text-sm flex items-center gap-2 cursor-pointer transition-colors"
          >
            <FolderGit2 className="w-4 h-4 text-cyan-400" />
            <span>Universal Game Modder</span>
          </button>

          <button
            type="button"
            onClick={onDownloadVault}
            className="px-4 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold text-sm flex items-center gap-2 cursor-pointer transition-colors"
            title="Download All Artifacts & Source Files as ZIP"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Download All Files</span>
          </button>
        </div>
      </div>
    </div>
  );
};
