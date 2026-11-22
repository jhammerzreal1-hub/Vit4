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

/**
 * 🎙️ AUDIOSWARM MODULE (SINGLETON PATTERN + INFINITE-LENGTH STREAMING)
 * Enforces Mutex Lock on Audio Output, Prevents Chromium SpeechSynthesis GC Cutoffs,
 * Automatically Extracts Coherent Oral Narrative (No Code/Line-Number Noise),
 * and Streams Infinite-Length Responses Across Sentence-Aligned Chunks.
 */

import { dev_null } from './devNullLogger';
import {
  selectBestSystemVoice,
  extractCoherentOralNarrative,
  splitIntoCoherentSpeechChunks
} from './voiceEngine';

export interface AudioRequest {
  id: string;
  text?: string;
  audioUrl?: string;
  audioBuffer?: AudioBuffer;
  rate?: number;
  pitch?: number;
  personaId?: string;
  appendToQueue?: boolean;
  skipSanitize?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

export class AudioSwarm {
  private static instance: AudioSwarm | null = null;

  // Mutex lock & FIFO chunk queue
  private isLocked: boolean = false;
  private queue: AudioRequest[] = [];

  // Track current active sound instances (retained strongly to prevent Chromium GC mid-speech)
  private activeAudioElements: HTMLAudioElement[] = [];
  private activeAudioContexts: AudioContext[] = [];
  private activeUtterances: SpeechSynthesisUtterance[] = [];
  private lockedVoice: SpeechSynthesisVoice | null = null;
  private lockedPersonaId: string | null = null;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  private chunkWatchdogTimer: ReturnType<typeof setTimeout> | null = null;

  // State sync flag with Memory Swarm
  private isMemoryStateResolved: boolean = true;

  private constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.destroyAll());
      window.addEventListener('unload', () => this.destroyAll());
    }
  }

  /**
   * Singleton Accessor
   */
  public static getInstance(): AudioSwarm {
    if (!AudioSwarm.instance) {
      AudioSwarm.instance = new AudioSwarm();
    }
    return AudioSwarm.instance;
  }

  private clearTimers(): void {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
    if (this.chunkWatchdogTimer) {
      clearTimeout(this.chunkWatchdogTimer);
      this.chunkWatchdogTimer = null;
    }
  }

  /**
   * Hard stop and destroy all existing audio instances and queued chunks
   */
  public stopAll(): void {
    if (typeof window === 'undefined') return;

    this.clearTimers();
    this.queue = [];

    // 1. Stop Speech Synthesis
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch (e) {
      dev_null('SpeechSynthesis cancel note:', e);
    }
    this.activeUtterances = [];

    // 2. Stop & pause HTMLAudioElements
    for (const audio of this.activeAudioElements) {
      try {
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
        audio.currentTime = 0;
        audio.src = '';
        audio.load();
      } catch (e) {
        dev_null('Audio element pause note:', e);
      }
    }
    this.activeAudioElements = [];

    // 3. Close AudioContexts
    const contextsToClose = this.activeAudioContexts.splice(0, this.activeAudioContexts.length);
    for (const ctx of contextsToClose) {
      try {
        if (ctx && ctx.state !== 'closed') {
          Promise.resolve(ctx.close()).catch(dev_null);
        }
      } catch (e) {
        dev_null('AudioContext close note:', e);
      }
    }

    this.isLocked = false;
  }

  /**
   * Alias for stopAll and complete cleanup
   */
  public destroyAll(): void {
    this.stopAll();
  }

  /**
   * State-Sync Verification: Flag memory state resolution
   */
  public setMemoryStateResolved(resolved: boolean): void {
    this.isMemoryStateResolved = resolved;
    if (resolved) {
      this.processQueue();
    }
  }

  /**
   * Convenience speak helper
   */
  public speak(params: {
    text: string;
    personaId?: string;
    chunkIndex?: number;
    rate?: number;
    pitch?: number;
    onStart?: () => void;
    onEnd?: () => void;
  }): void {
    this.enqueue({
      id: `speak-${Date.now()}-${params.chunkIndex ?? 0}`,
      text: params.text,
      personaId: params.personaId || 'DEFAULT',
      rate: params.rate,
      pitch: params.pitch,
      appendToQueue: (params.chunkIndex ?? 0) > 0,
      onStart: params.onStart,
      onEnd: params.onEnd
    });
  }

  /**
   * Public API to dispatch audio play request.
   * Automatically extracts coherent oral narrative and splits arbitrarily long text
   * into infinite-length sequential sentence chunks.
   */
  public enqueue(request: AudioRequest): void {
    // 1. Unless explicitly appending a subsequent stream chunk, stop previous playback
    if (!request.appendToQueue) {
      this.stopAll();
    }

    // 2. If this is an audioUrl playback request, push directly to queue
    if (request.audioUrl) {
      this.queue.push(request);
      this.processQueue();
      return;
    }

    // 3. For text speech synthesis, sanitize for oral coherence and split into infinite-length chunks
    if (request.text) {
      const oralNarrative = request.skipSanitize
        ? request.text.trim()
        : extractCoherentOralNarrative(request.text);

      if (!oralNarrative) {
        if (request.onEnd) request.onEnd();
        return;
      }

      const chunks = splitIntoCoherentSpeechChunks(oralNarrative, 195);
      if (chunks.length === 0) {
        if (request.onEnd) request.onEnd();
        return;
      }

      chunks.forEach((chunkText, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === chunks.length - 1;
        this.queue.push({
          id: `${request.id}-chunk-${idx}`,
          text: chunkText,
          rate: request.rate,
          pitch: request.pitch,
          personaId: request.personaId,
          skipSanitize: true,
          appendToQueue: true,
          onStart: isFirst ? request.onStart : undefined,
          onEnd: isLast ? request.onEnd : undefined,
          onError: isLast ? request.onError : undefined
        });
      });

      this.processQueue();
    }
  }

  /**
   * Process single-instance FIFO queue with seamless multi-chunk continuation
   */
  private async processQueue(): Promise<void> {
    if (this.isLocked || !this.isMemoryStateResolved || this.queue.length === 0 || typeof window === 'undefined') {
      return;
    }

    const request = this.queue.shift();
    if (!request) return;

    this.isLocked = true;

    try {
      if (request.audioUrl) {
        const audio = new Audio(request.audioUrl);
        if (request.rate) audio.playbackRate = Math.max(0.5, Math.min(2.0, request.rate));
        this.activeAudioElements.push(audio);

        audio.onplay = () => {
          if (request.onStart) request.onStart();
        };

        let settled = false;
        const releaseAndNext = () => {
          if (settled) return;
          settled = true;
          this.activeAudioElements = this.activeAudioElements.filter((a) => a !== audio);
          this.isLocked = false;
          if (request.onEnd) request.onEnd();
          this.processQueue();
        };

        audio.onended = releaseAndNext;
        audio.onerror = (err) => {
          dev_null('[AudioSwarm] Audio element error, falling back to speechSynthesis if text available:', err);
          this.activeAudioElements = this.activeAudioElements.filter((a) => a !== audio);
          this.isLocked = false;
          if (request.text) {
            // Re-enqueue as Web Speech fallback for this chunk
            this.queue.unshift({
              ...request,
              audioUrl: undefined
            });
            this.processQueue();
            return;
          }
          if (request.onError) request.onError(err);
          this.processQueue();
        };

        await audio.play().catch((e) => {
          dev_null('[AudioSwarm] Play error, routing to speechSynthesis fallback:', e);
          if (request.text) {
            settled = true;
            this.activeAudioElements = this.activeAudioElements.filter((a) => a !== audio);
            this.isLocked = false;
            this.queue.unshift({
              ...request,
              audioUrl: undefined
            });
            this.processQueue();
          } else {
            releaseAndNext();
          }
        });
      } else if (request.text) {
        const synth = window.speechSynthesis;
        if (!synth) {
          this.isLocked = false;
          if (request.onEnd) request.onEnd();
          this.processQueue();
          return;
        }

        if (synth.paused) {
          synth.resume();
        }

        const utterance = new SpeechSynthesisUtterance(request.text);
        utterance.rate = Math.max(0.75, Math.min(1.6, request.rate || 1.0));
        utterance.pitch = Math.max(0.5, Math.min(1.8, request.pitch || 1.0));
        utterance.lang = 'en-US';

        const voices = synth.getVoices();
        const personaKey = request.personaId || 'DEFAULT';
        if (!this.lockedVoice || this.lockedPersonaId !== personaKey) {
          this.lockedVoice = selectBestSystemVoice(voices, request.personaId, undefined, 'en-US');
          this.lockedPersonaId = personaKey;
        }
        if (!this.lockedVoice) {
          // Never allow browser default to fall back to a foreign or foreign-accented voice
          this.isLocked = false;
          if (request.onEnd) request.onEnd();
          this.processQueue();
          return;
        }
        utterance.voice = this.lockedVoice;
        const vLang = (this.lockedVoice.lang || 'en-US').replace('_', '-');
        utterance.lang = /^en-(US|GB|CA|AU|NZ|IE)$/i.test(vLang) ? vLang : 'en-US';

        // Strongly retain utterance reference in class array so Chromium GC never collects it mid-sentence
        this.activeUtterances.push(utterance);

        let settled = false;
        const releaseAndNext = () => {
          if (settled) return;
          settled = true;
          this.clearTimers();
          this.activeUtterances = this.activeUtterances.filter((u) => u !== utterance);
          this.isLocked = false;
          if (request.onEnd) request.onEnd();
          this.processQueue();
        };

        utterance.onstart = () => {
          if (request.onStart) request.onStart();
        };

        utterance.onend = releaseAndNext;
        utterance.onerror = (err: any) => {
          // Ignore 'interrupted' or 'canceled' when stopAll was intentionally invoked
          if (err?.error === 'interrupted' || err?.error === 'canceled') {
            return;
          }
          dev_null('[AudioSwarm] SpeechSynthesis chunk notice:', err);
          releaseAndNext();
        };

        // Chromium keep-alive heartbeat (prevents the 14-second Web Speech freeze on long sessions)
        this.keepAliveTimer = setInterval(() => {
          try {
            if (synth.speaking && synth.paused) {
              synth.resume();
            }
          } catch {}
        }, 4000);

        // Per-chunk watchdog timer (estimates max speaking duration + buffer so stuck browser drivers never hang the queue)
        const estimatedMs = Math.max(8000, Math.ceil((request.text.length / 10) * 1000) + 6000);
        this.chunkWatchdogTimer = setTimeout(() => {
          if (!settled && !synth.speaking) {
            releaseAndNext();
          }
        }, estimatedMs);

        setTimeout(() => {
          try {
            if (synth.paused) synth.resume();
            synth.speak(utterance);
          } catch (speakErr) {
            dev_null('[AudioSwarm] synth.speak error:', speakErr);
            releaseAndNext();
          }
        }, 25);
      } else {
        this.isLocked = false;
        this.processQueue();
      }
    } catch (e) {
      dev_null('[AudioSwarm] Execution exception:', e);
      this.isLocked = false;
      this.processQueue();
    }
  }

  public registerAudioContext(ctx: AudioContext): void {
    this.activeAudioContexts.push(ctx);
  }
}

export const audioSwarm = AudioSwarm.getInstance();
