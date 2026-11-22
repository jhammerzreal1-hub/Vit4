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
  Square,
  Zap,
  NotebookPen,
  ListTodo
} from 'lucide-react';
import type { ModuleType } from '../types';
import type { LiveVoicePersona, TalkTranscriptEntry } from './PersistentTalkDock';
import { PRESET_VOICE_PERSONAS } from '../utils/voiceEngine';

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

const VOICES = PRESET_VOICE_PERSONAS.map((p) => ({
  id: p.id as LiveVoicePersona,
  label: p.name,
  badge: p.badge,
  isDistilled: Boolean(p.isDistilled)
}));

/**
 * Unified Persistent Voice Chat Control Center.
 * Decoupled from Text Chat: mirrors and controls the global PersistentTalkDock session,
 * impersonal OS acoustic timbres, dedicated Voice Scratchpad, and non-blocking Background Tasks.
 */
export const LiveVoiceModule: React.FC<LiveVoiceModuleProps> = ({
  onSaveToVault
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
    voiceName: 'distilled-core-01',
    activeToolName: null,
    transcripts: []
  });
  const [nudgeText, setNudgeText] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);
  const [activeTab, setActiveTab] = useState<'log' | 'scratchpad'>('log');
  const [scratchpad, setScratchpad] = useState<string>(() => {
    try {
      return localStorage.getItem('sovereign_voice_scratchpad_v1') || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('sovereign_voice_scratchpad_v1', scratchpad);
    } catch {}
  }, [scratchpad]);

  useEffect(() => {
    const onState = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail) {
        setTalkState((prev) => ({ ...prev, ...detail }));
      }
    };
    window.addEventListener('sovereign_persistent_talk_state', onState);
    window.dispatchEvent(new CustomEvent('sovereign_persistent_talk_control', { detail: { action: 'query' } }));
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

  const handleDispatchBgTask = () => {
    const cleaned = nudgeText.trim();
    if (!cleaned) return;
    if (!talkState.active) {
      toggleVoiceChat(true);
    }
    sendControl({ action: 'bgTask', text: cleaned });
    setNudgeText('');
  };

  const handleArchive = () => {
    sendControl({ action: 'archive' });
    if (onSaveToVault && talkState.transcripts.length > 0) {
      const text = talkState.transcripts
        .map((t) => `[${t.timestamp}] ${t.role.toUpperCase()}: ${t.text}`)
        .join('\n');
      onSaveToVault('voice', `OS Voice Log (${talkState.voiceName})`, text, 'sovereign-persistent-voice');
    }
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  const activeVoice = VOICES.find((v) => v.id === talkState.voiceName);

  return (
    <div className="flex flex-col h-full min-h-0 p-2.5 sm:p-4 bg-zinc-950 text-zinc-100 gap-3 overflow-hidden">
      {/* Header */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
              talkState.active
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400'
            }`}
          >
            <Radio className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-zinc-100 truncate">
              Autonomous Sovereign OS Voice Channel
            </h2>
            <p className="text-[11px] font-mono text-zinc-400 truncate">
              {talkState.active
                ? talkState.speaking
                  ? `Speaking (${activeVoice?.label || talkState.voiceName}) · instant barge-in active`
                  : talkState.connecting
                  ? 'Connecting studio voice channel...'
                  : `Live full-duplex · ${activeVoice?.label || talkState.voiceName} · decoupled from Text Chat`
                : 'Impersonal studio voice output · decoupled scratchpad & async background tasks'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => toggleVoiceChat()}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 cursor-pointer transition-colors ${
              talkState.active
                ? 'bg-rose-950/60 hover:bg-rose-600 border-rose-500/50 text-rose-200 hover:text-white'
                : 'bg-emerald-500 hover:bg-emerald-400 border-emerald-400 text-zinc-950'
            }`}
          >
            {talkState.active ? <PhoneOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            <span>{talkState.active ? 'End Voice' : 'Start Voice'}</span>
          </button>

          {talkState.active && (
            <>
              {talkState.speaking && (
                <button
                  type="button"
                  onClick={() => sendControl({ action: 'interrupt' })}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/60 text-amber-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  title="Interrupt speech immediately"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Interrupt</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => sendControl({ action: 'mute' })}
                className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
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
                className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
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
        </div>
      </div>

      {/* Impersonal Acoustic Timbre Selector (Distilled Sovereign Cores + Gemini Native Audio) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 shrink-0 max-h-36 overflow-y-auto">
        {VOICES.map((v) => {
          const selected = talkState.voiceName === v.id;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => sendControl({ action: 'voice', voice: v.id })}
              className={`p-2 rounded-xl border text-left transition-colors cursor-pointer ${
                selected
                  ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-100'
                  : 'bg-zinc-900/70 hover:bg-zinc-900 border-zinc-800 text-zinc-300'
              }`}
            >
              <div className="text-[11px] font-semibold truncate">{v.label}</div>
              <div className="text-[9px] font-mono text-zinc-400 mt-0.5 truncate">{v.badge}</div>
            </button>
          );
        })}
      </div>

      {/* Decoupled Live Voice Log & Scratchpad */}
      <div className="flex-1 min-h-0 bg-zinc-900/70 border border-zinc-800 rounded-xl flex flex-col overflow-hidden">
        <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('log')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                activeTab === 'log'
                  ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ListTodo className="w-3 h-3" />
              <span>Voice Log</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('scratchpad')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                activeTab === 'scratchpad'
                  ? 'bg-sky-500/20 text-sky-200 border border-sky-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <NotebookPen className="w-3 h-3" />
              <span>Scratchpad</span>
            </button>
          </div>
          <button
            type="button"
            onClick={handleArchive}
            disabled={talkState.transcripts.length === 0}
            className="px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-[11px] text-cyan-300 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            {savedFlash ? <Check className="w-3 h-3 text-emerald-400" /> : <BookmarkPlus className="w-3 h-3" />}
            <span>{savedFlash ? 'Archived' : 'Archive'}</span>
          </button>
        </div>

        {activeTab === 'log' ? (
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {talkState.transcripts.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center text-xs text-zinc-500 px-6">
                Start Voice to talk hands-free using impersonal Distilled Sovereign Cores or Gemini native audio. Voice transcripts stay isolated here and in your Scratchpad — never cluttering Text Chat.
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
                        ? 'OS Reasoning'
                        : entry.role === 'tool'
                        ? 'OS Action'
                        : 'OS Voice'}
                    </span>
                    <span className="tabular-nums">{entry.timestamp}</span>
                  </div>
                  <div>{entry.text}</div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="flex-1 p-3 flex flex-col min-h-0">
            <textarea
              value={scratchpad}
              onChange={(e) => setScratchpad(e.target.value)}
              placeholder="Dedicated voice session scratchpad (synced with floating Voice Dock, separate from Text Chat)..."
              className="flex-1 w-full bg-zinc-950 border border-zinc-800 focus:border-sky-500/60 rounded-xl p-3 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none"
            />
          </div>
        )}

        <form onSubmit={handleSendNudge} className="p-2.5 border-t border-zinc-800 flex items-center gap-1.5 shrink-0">
          <input
            type="text"
            value={nudgeText}
            onChange={(e) => setNudgeText(e.target.value)}
            placeholder="Interject live or dispatch a background task..."
            className="flex-1 min-w-0 bg-zinc-950 border border-zinc-800 focus:border-emerald-500/60 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleDispatchBgTask}
            disabled={!nudgeText.trim()}
            className="px-2.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-amber-500/40 text-amber-300 font-semibold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-40 shrink-0"
            title="Run as non-blocking background task"
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bg Task</span>
          </button>
          <button
            type="submit"
            disabled={!nudgeText.trim()}
            className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Interject</span>
          </button>
        </form>
      </div>
    </div>
  );
};
