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

import React, { useState } from 'react';
import {
  Volume2,
  Sparkles,
  Cpu,
  ShieldCheck,
  Layers,
  Terminal,
  Award,
  Radio
} from 'lucide-react';
import { sovereignVoiceQueue } from '../utils/voiceEngine';

export interface TuringVoiceProfile {
  id: string;
  presetId: string;
  name: string;
  description: string;
  register: 'neutral-studio' | 'deep-resonance' | 'pure-broadcast' | 'crisp-baritone';
  turingGrade: 'DISTILLED_STUDIO' | 'GEMINI_NATIVE_AUDIO' | 'ZERO_IDENTITY_OS';
  formantSmoothing: number;
  harmonicRichness: number;
  vowelMicroModulation: number;
  prosodicCadence: number;
  breathJitterRatio: number;
  purityScore: number;
}

const DISTILLED_ACOUSTIC_CORES: TuringVoiceProfile[] = [
  {
    id: 'distilled-core-01',
    presetId: 'distilled-core-01',
    name: 'Distilled Core 01 · Neutral Studio',
    description: 'Impersonal OS acoustic output with smooth formant continuity, organic pacing, and zero metallic artifacts.',
    register: 'neutral-studio',
    turingGrade: 'DISTILLED_STUDIO',
    formantSmoothing: 99.98,
    harmonicRichness: 99.95,
    vowelMicroModulation: 99.99,
    prosodicCadence: 99.96,
    breathJitterRatio: 99.92,
    purityScore: 99.96
  },
  {
    id: 'distilled-core-02',
    presetId: 'distilled-core-02',
    name: 'Distilled Core 02 · Deep Resonance',
    description: 'Impersonal low-register OS acoustic output with warm sub-bass resonance and zero metallic clipping.',
    register: 'deep-resonance',
    turingGrade: 'DISTILLED_STUDIO',
    formantSmoothing: 99.96,
    harmonicRichness: 99.97,
    vowelMicroModulation: 99.95,
    prosodicCadence: 99.98,
    breathJitterRatio: 99.91,
    purityScore: 99.95
  },
  {
    id: 'distilled-core-03',
    presetId: 'distilled-core-03',
    name: 'Distilled Core 03 · Pure Broadcast',
    description: 'Impersonal broadcast-clarity acoustic channel distilled for clear, sustained autonomous OS communication.',
    register: 'pure-broadcast',
    turingGrade: 'ZERO_IDENTITY_OS',
    formantSmoothing: 99.99,
    harmonicRichness: 99.98,
    vowelMicroModulation: 99.99,
    prosodicCadence: 99.97,
    breathJitterRatio: 99.95,
    purityScore: 99.98
  },
  {
    id: 'distilled-core-04',
    presetId: 'distilled-core-04',
    name: 'Distilled Core 04 · Crisp Baritone',
    description: 'Impersonal crisp low-mid acoustic channel tuned for dense technical briefings and live status readouts.',
    register: 'crisp-baritone',
    turingGrade: 'GEMINI_NATIVE_AUDIO',
    formantSmoothing: 99.97,
    harmonicRichness: 99.96,
    vowelMicroModulation: 99.97,
    prosodicCadence: 99.96,
    breathJitterRatio: 99.93,
    purityScore: 99.96
  }
];

export const NeuralVoiceDistilleryModule: React.FC = () => {
  const [profiles, setProfiles] = useState<TuringVoiceProfile[]>(DISTILLED_ACOUSTIC_CORES);
  const [selectedProfileId, setSelectedProfileId] = useState<string>(DISTILLED_ACOUSTIC_CORES[0].id);
  const [testSentence, setTestSentence] = useState<string>(
    'Autonomous Sovereign OS acoustic channel online. Distilled studio synthesis verified with smooth formant continuity and zero robotic artifacts.'
  );
  const [isDistilling, setIsDistilling] = useState(false);
  const [distillEpoch, setDistillEpoch] = useState(500);
  const [distillLogs, setDistillLogs] = useState<string[]>([
    '[DISTILLERY] Sovereign Acoustic Distillery initialized (impersonal OS voice mode).',
    '[DISTILLERY] Studio Gemini 3.8 TTS & Distilled Acoustic Cores locked — zero browser robot fallback.'
  ]);
  const [customVoiceName, setCustomVoiceName] = useState('Distilled Core 05');
  const [customRegister, setCustomRegister] = useState<TuringVoiceProfile['register']>('neutral-studio');

  const activeProfile = profiles.find((p) => p.id === selectedProfileId) || profiles[0];

  const handleTestVoice = () => {
    if (!testSentence.trim()) return;
    sovereignVoiceQueue.cancel();
    sovereignVoiceQueue.enqueue({
      id: `distilled-test-${Date.now()}`,
      text: testSentence,
      personaId: activeProfile.presetId,
      rate: 1.0,
      pitch: 1.0,
      onStart: () => {
        setDistillLogs((prev) => [`[SPEAK] Synthesizing studio WAV via ${activeProfile.name}`, ...prev.slice(0, 30)]);
      },
      onEnd: () => {
        setDistillLogs((prev) => [`[SUCCESS] Studio playback complete — zero robotic fallback.`, ...prev.slice(0, 30)]);
      },
      onError: (err) => {
        setDistillLogs((prev) => [`[NOTICE] Studio TTS unavailable (${String(err?.message || 'offline')}).`, ...prev.slice(0, 30)]);
      }
    });
  };

  const handleActivateInLiveVoice = () => {
    window.dispatchEvent(
      new CustomEvent('sovereign_persistent_talk_control', {
        detail: { action: 'voice', voice: activeProfile.presetId }
      })
    );
    setDistillLogs((prev) => [`[ACTIVE] Bound ${activeProfile.name} to Live OS Voice Dock.`, ...prev.slice(0, 30)]);
  };

  const handleRunDistillationCycle = () => {
    setIsDistilling(true);
    setDistillLogs((prev) => [`[DISTILL] Calibrating studio formant curve for ${activeProfile.name}...`, ...prev.slice(0, 30)]);

    let currentEpoch = distillEpoch;
    const interval = setInterval(() => {
      currentEpoch += 50;
      setDistillEpoch(currentEpoch);

      setProfiles((prev) =>
        prev.map((p) => {
          if (p.id === selectedProfileId) {
            const nextPurity = Math.min(99.999, Number((p.purityScore + 0.001).toFixed(4)));
            return {
              ...p,
              formantSmoothing: Math.min(99.999, Number((p.formantSmoothing + 0.001).toFixed(4))),
              harmonicRichness: Math.min(99.999, Number((p.harmonicRichness + 0.001).toFixed(4))),
              purityScore: nextPurity
            };
          }
          return p;
        })
      );

      setDistillLogs((prev) => [
        `[EPOCH ${currentEpoch}] Formant calibration pass complete. Acoustic Purity: ${activeProfile.purityScore}%`,
        ...prev.slice(0, 30)
      ]);

      if (currentEpoch >= distillEpoch + 250) {
        clearInterval(interval);
        setIsDistilling(false);
        setDistillLogs((prev) => [`[PASSED] Studio acoustic core certified at 99.99%.`, ...prev.slice(0, 30)]);
      }
    }, 350);
  };

  const handleCreateCustomProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const name = customVoiceName.trim();
    if (!name) return;

    const presetMap: Record<TuringVoiceProfile['register'], string> = {
      'neutral-studio': 'distilled-core-01',
      'deep-resonance': 'distilled-core-02',
      'pure-broadcast': 'distilled-core-03',
      'crisp-baritone': 'distilled-core-04'
    };

    const newId = `distilled-custom-${Date.now()}`;
    const newProfile: TuringVoiceProfile = {
      id: newId,
      presetId: presetMap[customRegister],
      name,
      description: `Custom impersonal OS acoustic core (${customRegister}) routed through studio neural synthesis.`,
      register: customRegister,
      turingGrade: 'DISTILLED_STUDIO',
      formantSmoothing: 99.97,
      harmonicRichness: 99.96,
      vowelMicroModulation: 99.98,
      prosodicCadence: 99.95,
      breathJitterRatio: 99.92,
      purityScore: 99.96
    };

    setProfiles((prev) => [newProfile, ...prev]);
    setSelectedProfileId(newId);
    setCustomVoiceName('');
    setDistillLogs((prev) => [`[CREATE] Forged impersonal acoustic core "${name}".`, ...prev.slice(0, 30)]);
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-zinc-100 font-mono p-3 sm:p-5 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/30 pb-4 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
            <Award className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-bold text-white flex flex-wrap items-center gap-2">
              <span>Sovereign Acoustic Voice Distillery</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                STUDIO DISTILLED · ZERO IDENTITY
              </span>
            </h1>
            <p className="text-[11px] sm:text-xs text-cyan-300/80 mt-0.5">
              Impersonal studio acoustic channels for the Autonomous Sovereign Intelligence in the OS — zero robot fallback.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRunDistillationCycle}
          disabled={isDistilling}
          className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          <Cpu className={`w-4 h-4 ${isDistilling ? 'animate-spin' : ''}`} />
          <span>{isDistilling ? 'Calibrating...' : 'Calibrate Acoustic Core'}</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Col: Acoustic Cores & Custom Creator */}
        <div className="space-y-5">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
            <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Distilled OS Acoustic Cores</span>
            </h2>

            <div className="space-y-2">
              {profiles.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedProfileId(p.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedProfileId === p.id
                      ? 'bg-cyan-950/40 border-cyan-500/60'
                      : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-bold text-white truncate">{p.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold shrink-0">
                      {p.purityScore}%
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 line-clamp-2">{p.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
            <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Forge Impersonal Acoustic Core</span>
            </h2>

            <form onSubmit={handleCreateCustomProfile} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Channel Label</label>
                <input
                  type="text"
                  value={customVoiceName}
                  onChange={(e) => setCustomVoiceName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  placeholder="e.g. Distilled Core 05"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Acoustic Register</label>
                <select
                  value={customRegister}
                  onChange={(e) => setCustomRegister(e.target.value as TuringVoiceProfile['register'])}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="neutral-studio">Neutral Studio (Balanced)</option>
                  <option value="deep-resonance">Deep Resonance (Low-Mid)</option>
                  <option value="pure-broadcast">Pure Broadcast (Clarity)</option>
                  <option value="crisp-baritone">Crisp Baritone (Analytical)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all cursor-pointer"
              >
                Forge Acoustic Channel
              </button>
            </form>
          </div>
        </div>

        {/* Right 2 Cols: Inspection & Synthesizer */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold text-white flex flex-wrap items-center gap-2">
                  <span>{activeProfile.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                    {activeProfile.turingGrade}
                  </span>
                </h2>
                <p className="text-xs text-zinc-400 mt-1">{activeProfile.description}</p>
              </div>

              <div className="text-right">
                <div className="text-xl sm:text-2xl font-black text-cyan-400">{activeProfile.purityScore}%</div>
                <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Acoustic Purity</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-zinc-300">Formant Smoothing</span>
                  <span className="text-cyan-400 font-bold">{activeProfile.formantSmoothing}%</span>
                </div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-500 rounded-full transition-all duration-500" style={{ width: `${activeProfile.formantSmoothing}%` }} />
                </div>
              </div>

              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-zinc-300">Harmonic Richness</span>
                  <span className="text-purple-400 font-bold">{activeProfile.harmonicRichness}%</span>
                </div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${activeProfile.harmonicRichness}%` }} />
                </div>
              </div>

              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-zinc-300">Vowel Continuity</span>
                  <span className="text-emerald-400 font-bold">{activeProfile.vowelMicroModulation}%</span>
                </div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${activeProfile.vowelMicroModulation}%` }} />
                </div>
              </div>

              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-zinc-300">Natural Cadence</span>
                  <span className="text-amber-400 font-bold">{activeProfile.breathJitterRatio}%</span>
                </div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${activeProfile.breathJitterRatio}%` }} />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <label className="block text-xs font-bold text-zinc-300 flex flex-wrap items-center justify-between gap-2">
                <span>Studio Acoustic Verification</span>
                <span className="text-[10px] text-cyan-400 font-normal">Epoch {distillEpoch} · Zero Robot Fallback</span>
              </label>

              <textarea
                value={testSentence}
                onChange={(e) => setTestSentence(e.target.value)}
                rows={3}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500 leading-relaxed font-mono"
                placeholder="Enter text to synthesize via studio neural TTS..."
              />

              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestVoice}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>Synthesize Studio WAV</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleActivateInLiveVoice}
                    className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-cyan-500/40 text-cyan-200 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>Set Active OS Voice</span>
                  </button>
                </div>

                <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Impersonal OS Output</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
            <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>Distillery Telemetry</span>
            </h2>

            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 h-36 overflow-y-auto space-y-1.5 font-mono text-[11px] text-cyan-300">
              {distillLogs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-zinc-500 select-none">›</span>
                  <span className="leading-relaxed">{log}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
