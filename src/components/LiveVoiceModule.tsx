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

import React, { useEffect, useState } from 'react';
import {
  Mic,
  MicOff,
  Radio,
  Send,
  BookmarkPlus,
  Check,
  Brain,
  Volume2,
  VolumeX,
  Wrench,
  PhoneOff,
  MessageSquare
} from 'lucide-react';
import type { ModuleType } from '../types';
import type { LiveVoicePersona, TalkTranscriptEntry } from './PersistentTalkDock';

export interface LiveVoiceModuleProps {
  onSaveToVault?: (
    type: 'voice',
    title: string,
    prompt: string,
    model: string,
    mediaUrl?: string,
    metadataJson?: string
  ) => void;
  onSelectModule?: (module: ModuleType) => void;
}

const VOICES: Array<{ id: LiveVoicePersona; label: string; character: string }> = [
  { id: 'Zephyr', label: 'Zephyr', character: 'Natural Peer' },
  { id: 'Puck', label: 'Puck', character: 'Quick & Sharp' },
  { id: 'Charon', label: 'Charon', character: 'Calm Analytical' },
  { id: 'Kore', label: 'Kore', character: 'Clear Studio' },
  { id: 'Fenrir', label: 'Fenrir', character: 'Deep Direct' }
];

/**
 * Unified Persistent Voice Chat Control Center.
 * Mirrors and controls the single global PersistentTalkDock session so there are
 * never duplicate WebSockets, competing microphones, or API key gate conflicts.
 */
export const LiveVoiceModule: React.FC<LiveVoiceModuleProps> = ({
  onSaveToVault,
  onSelectModule
}) => {
  const [talkState, setTalkState] = useState<{
    active: boolean;
    connected: boolean;
    connecting: boolean;
    muted: boolean;
    speakerMuted: boolean;
    speaking: boolean;
    transport: string;
    voiceName: LiveVoicePersona;
    activeToolName: string | null;
    transcripts: TalkTranscriptEntry[];
  }>({
    active: false,
    connected: false,
    connecting: false,
    muted: false,
    speakerMuted: false,
    speaking: false,
    transport: 'sovereign-duplex-relay',
    voiceName: 'Zephyr',
    activeToolName: null,
    transcripts: []
  });
  const [nudgeText, setNudgeText] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    const onState = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail) {
        setTalkState((prev) => ({ ...prev, ...detail }));
      }
    };
    window.addEventListener('sovereign_persistent_talk_state', onState);
    return () => window.removeEventListener('sovereign_persistent_talk_state', onState);
  }, []);

  const toggleVoiceChat = (force?: boolean) => {
    window.dispatchEvent(
      new CustomEvent('sovereign_toggle_persistent_talk', {
        detail: typeof force === 'boolean' ? { active: force } : undefined
      })
    );
  };

  const sendControl = (payload: Record<string, any>) => {
    window.dispatchEvent(new CustomEvent('sovereign_persistent_talk_control', { detail: payload }));
  };

  const handleSendNudge = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = nudgeText.trim();
    if (!cleaned) return;
    if (!talkState.active) {
      toggleVoiceChat(true);
    }
    sendControl({ action: 'nudge', text: cleaned });
    setNudgeText('');
  };

  const handleArchive = () => {
    sendControl({ action: 'archive' });
    if (onSaveToVault && talkState.transcripts.length > 0) {
      const text = talkState.transcripts
        .map((t) => `[${t.timestamp}] ${t.role.toUpperCase()}: ${t.text}`)
        .join('\n');
      onSaveToVault('voice', `Persistent Voice Log (${talkState.voiceName})`, text, 'sovereign-persistent-voice');
    }
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  return (
    <div className="flex flex-col h-full min-h-0 p-3 sm:p-4 bg-zinc-950 text-zinc-100 gap-3 overflow-hidden">
      {/* Header */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
              talkState.active
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400'
            }`}
          >
            <Radio className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-zinc-100 truncate">
              Unified Persistent Voice Chat
            </h2>
            <p className="text-[11px] font-mono text-zinc-400 truncate">
              {talkState.active
                ? talkState.speaking
                  ? `Lyrailius Omega speaking (${talkState.voiceName} voice) · barge-in ready · full OS autonomy`
                  : talkState.connecting
                  ? 'Connecting zero-gate voice channel...'
                  : `Live hands-free · Lyrailius Omega (${talkState.voiceName} voice) · synced with Chat & Memory Vault`
                : 'Single hands-free voice session across all OS windows · zero API key blocks'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => toggleVoiceChat()}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold border flex items-center gap-2 cursor-pointer transition-colors ${
              talkState.active
                ? 'bg-rose-950/60 hover:bg-rose-600 border-rose-500/50 text-rose-200 hover:text-white'
                : 'bg-emerald-500 hover:bg-emerald-400 border-emerald-400 text-zinc-950'
            }`}
          >
            {talkState.active ? <PhoneOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            <span>{talkState.active ? 'End Voice Chat' : 'Start Voice Chat'}</span>
          </button>

          {talkState.active && (
            <>
              <button
                type="button"
                onClick={() => sendControl({ action: 'mute' })}
                className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                  talkState.muted
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-zinc-950 hover:bg-zinc-800 border-zinc-700 text-emerald-300'
                }`}
                title={talkState.muted ? 'Unmute Mic' : 'Mute Mic'}
              >
                {talkState.muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => sendControl({ action: 'speakerMute' })}
                className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                  talkState.speakerMuted
                    ? 'bg-zinc-800 border-zinc-600 text-zinc-400'
                    : 'bg-zinc-950 hover:bg-zinc-800 border-zinc-700 text-sky-300'
                }`}
                title={talkState.speakerMuted ? 'Unmute Voice Output' : 'Mute Voice Output'}
              >
                {talkState.speakerMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </>
          )}

          {onSelectModule && (
            <button
              type="button"
              onClick={() => onSelectModule('chat')}
              className="px-3 py-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-200 flex items-center gap-1.5 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              <span>Open Chat</span>
            </button>
          )}
        </div>
      </div>

      {/* Voice Persona Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 shrink-0">
        {VOICES.map((v) => {
          const selected = talkState.voiceName === v.id;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => sendControl({ action: 'voice', voice: v.id })}
              className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                selected
                  ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-100'
                  : 'bg-zinc-900/70 hover:bg-zinc-900 border-zinc-800 text-zinc-300'
              }`}
            >
              <div className="text-xs font-semibold">{v.label}</div>
              <div className="text-[10px] font-mono text-zinc-400 mt-0.5">{v.character}</div>
            </button>
          );
        })}
      </div>

      {/* Shared Live Transcript & Chain-of-Thought Feed */}
      <div className="flex-1 min-h-0 bg-zinc-900/70 border border-zinc-800 rounded-xl flex flex-col overflow-hidden">
        <div className="px-3.5 py-2 border-b border-zinc-800 flex items-center justify-between text-xs shrink-0">
          <span className="font-semibold text-zinc-200">
            Live Transcript, Agent Chain-of-Thought & Autonomous Actions
          </span>
          <button
            type="button"
            onClick={handleArchive}
            disabled={talkState.transcripts.length === 0}
            className="px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-[11px] text-cyan-300 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            {savedFlash ? <Check className="w-3 h-3 text-emerald-400" /> : <BookmarkPlus className="w-3 h-3" />}
            <span>{savedFlash ? 'Archived to Vault' : 'Archive to Vault'}</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {talkState.transcripts.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center text-xs text-zinc-500 px-6">
              Click Start Voice Chat (or Voice Chat on the taskbar) to talk hands-free across every window. Every turn, thought trace, and autonomous code edit writes live into Chat and archives to the Memory Vault.
            </div>
          ) : (
            talkState.transcripts.map((entry) => (
              <div
                key={entry.id}
                className={`p-2.5 rounded-lg text-xs leading-relaxed ${
                  entry.role === 'user'
                    ? 'bg-zinc-800/80 text-zinc-100'
                    : entry.role === 'thought'
                    ? 'bg-cyan-950/35 border border-cyan-500/30 text-cyan-200 font-mono text-[11px]'
                    : entry.role === 'tool'
                    ? 'bg-sky-950/35 border border-sky-500/25 text-sky-300 font-mono text-[11px]'
                    : 'bg-emerald-950/25 border border-emerald-500/20 text-emerald-100'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-1">
                  <span className="flex items-center gap-1 font-semibold">
                    {entry.role === 'thought' && <Brain className="w-3 h-3 text-cyan-400" />}
                    {entry.role === 'tool' && <Wrench className="w-3 h-3 text-sky-400" />}
                    {entry.role === 'user'
                      ? 'You'
                      : entry.role === 'thought'
                      ? 'Lyrailius Omega · Chain-of-Thought'
                      : entry.role === 'tool'
                      ? 'Autonomous Tool'
                      : 'Lyrailius Omega'}
                  </span>
                  <span className="tabular-nums">{entry.timestamp}</span>
                </div>
                <div>{entry.text}</div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSendNudge} className="p-2.5 border-t border-zinc-800 flex items-center gap-2 shrink-0">
          <input
            type="text"
            value={nudgeText}
            onChange={(e) => setNudgeText(e.target.value)}
            placeholder="Optional: type a directive into the active Voice Chat session..."
            className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-emerald-500/60 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!nudgeText.trim()}
            className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
