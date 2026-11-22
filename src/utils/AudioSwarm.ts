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
 * 🎙️ AUDIOSWARM MODULE (SINGLETON STUDIO VOICE QUEUE — ZERO ROBOT FALLBACK)
 * Routes all acoustic playback strictly through Sovereign Distilled Studio & Gemini 3.8 TTS
 * (/api/tts -> 24kHz WAV) or pre-rendered audio buffers/URLs.
 * Never reverts to legacy browser window.speechSynthesis robot voices.
 */

import { dev_null } from './devNullLogger';
import { apiFetch } from './authClient';
import {
  extractCoherentOralNarrative,
  splitIntoCoherentSpeechChunks,
  normalizeVoicePresetId
} from './voiceEngine';

export interface AudioRequest {
  id: string;
  text?: string;
  audioUrl?: string;
  audioBuffer?: AudioBuffer;
  rate?: number;
  pitch?: number;
  personaId?: string;
  accent?: 'en-US' | 'en-GB';
  appendToQueue?: boolean;
  skipSanitize?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

export class AudioSwarm {
  private static instance: AudioSwarm | null = null;

  private isLocked: boolean = false;
  private queue: AudioRequest[] = [];
  private activeAudioElements: HTMLAudioElement[] = [];
  private activeAudioContexts: AudioContext[] = [];
  private activeFetchControllers: Set<AbortController> = new Set();
  private generationEpoch: number = 0;

  private isMemoryStateResolved: boolean = true;

  private constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.destroyAll());
      window.addEventListener('unload', () => this.destroyAll());
    }
  }

  public static getInstance(): AudioSwarm {
    if (!AudioSwarm.instance) {
      AudioSwarm.instance = new AudioSwarm();
    }
    return AudioSwarm.instance;
  }

  /**
   * Immediately halts all playback, cancels any in-flight studio TTS synthesis, and clears queued chunks.
   */
  public stopAll(): void {
    if (typeof window === 'undefined') return;

    this.generationEpoch += 1;
    this.queue = [];

    // 1. Abort all in-flight /api/tts fetches
    for (const ctrl of Array.from(this.activeFetchControllers)) {
      try {
        ctrl.abort();
      } catch (e) {
        dev_null('AbortController abort note:', e);
      }
    }
    this.activeFetchControllers.clear();

    // 2. Hard-stop any browser speechSynthesis that another subsystem might have started
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch {}

    // 3. Stop & pause HTMLAudioElements
    for (const audio of this.activeAudioElements) {
      try {
        audio.onplay = null;
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

    // 4. Close AudioContexts
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

  public destroyAll(): void {
    this.stopAll();
  }

  public setMemoryStateResolved(resolved: boolean): void {
    this.isMemoryStateResolved = resolved;
    if (resolved) {
      this.processQueue();
    }
  }

  public speak(params: {
    text: string;
    personaId?: string;
    accent?: 'en-US' | 'en-GB';
    chunkIndex?: number;
    rate?: number;
    pitch?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }): void {
    this.enqueue({
      id: `speak-${Date.now()}-${params.chunkIndex ?? 0}`,
      text: params.text,
      personaId: normalizeVoicePresetId(params.personaId),
      accent: params.accent,
      rate: params.rate,
      pitch: params.pitch,
      appendToQueue: (params.chunkIndex ?? 0) > 0,
      onStart: params.onStart,
      onEnd: params.onEnd,
      onError: params.onError
    });
  }

  public enqueue(request: AudioRequest): void {
    if (!request.appendToQueue) {
      this.stopAll();
    }

    if (request.audioUrl) {
      this.queue.push(request);
      this.processQueue();
      return;
    }

    if (request.text) {
      const oralNarrative = request.skipSanitize
        ? request.text.trim()
        : extractCoherentOralNarrative(request.text);

      if (!oralNarrative) {
        if (request.onEnd) request.onEnd();
        return;
      }

      const chunks = splitIntoCoherentSpeechChunks(oralNarrative, 420);
      if (chunks.length === 0) {
        if (request.onEnd) request.onEnd();
        return;
      }

      const normalizedVoice = normalizeVoicePresetId(request.personaId);

      chunks.forEach((chunkText, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === chunks.length - 1;
        this.queue.push({
          id: `${request.id}-chunk-${idx}`,
          text: chunkText,
          rate: request.rate,
          pitch: request.pitch,
          personaId: normalizedVoice,
          accent: request.accent,
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

  private async playAudioUrl(
    audioUrl: string,
    request: AudioRequest,
    epoch: number
  ): Promise<void> {
    if (epoch !== this.generationEpoch) return;

    await new Promise<void>((resolve) => {
      const audio = new Audio(audioUrl);
      if (request.rate) {
        audio.playbackRate = Math.max(0.65, Math.min(1.85, request.rate));
      }
      this.activeAudioElements.push(audio);

      let settled = false;
      const finish = (err?: any) => {
        if (settled) return;
        settled = true;
        audio.onplay = null;
        audio.onended = null;
        audio.onerror = null;
        this.activeAudioElements = this.activeAudioElements.filter((a) => a !== audio);
        if (err && request.onError && epoch === this.generationEpoch) {
          request.onError(err);
        }
        resolve();
      };

      audio.onplay = () => {
        if (epoch === this.generationEpoch && request.onStart) {
          request.onStart();
        }
      };
      audio.onended = () => finish();
      audio.onerror = (err) => {
        dev_null('[AudioSwarm] Studio audio playback error:', err);
        finish(err);
      };

      audio.play().catch((playErr) => {
        dev_null('[AudioSwarm] Audio play() rejected:', playErr);
        finish(playErr);
      });
    });
  }

  private async synthesizeStudioUrl(
    text: string,
    voiceId: string,
    accent: 'en-US' | 'en-GB' | undefined,
    epoch: number
  ): Promise<string | null> {
    if (epoch !== this.generationEpoch) return null;
    const ctrl = new AbortController();
    this.activeFetchControllers.add(ctrl);
    try {
      const res = await apiFetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: normalizeVoicePresetId(voiceId),
          accent: accent || 'en-US',
          lockedEngine: 'gemini'
        }),
        signal: ctrl.signal
      });
      if (!res.ok) return null;
      const data = await res.json().catch(() => null);
      if (epoch !== this.generationEpoch) return null;
      if (data?.success && typeof data.audioUrl === 'string' && data.audioUrl.startsWith('data:audio/')) {
        return data.audioUrl;
      }
      return null;
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        dev_null('[AudioSwarm] Studio TTS fetch error:', e);
      }
      return null;
    } finally {
      this.activeFetchControllers.delete(ctrl);
    }
  }

  private async processQueue(): Promise<void> {
    if (
      this.isLocked ||
      !this.isMemoryStateResolved ||
      this.queue.length === 0 ||
      typeof window === 'undefined'
    ) {
      return;
    }

    const request = this.queue.shift();
    if (!request) return;

    this.isLocked = true;
    const epoch = this.generationEpoch;

    try {
      if (request.audioUrl) {
        await this.playAudioUrl(request.audioUrl, request, epoch);
      } else if (request.text) {
        const audioUrl = await this.synthesizeStudioUrl(
          request.text,
          request.personaId || 'distilled-core-01',
          request.accent,
          epoch
        );
        if (epoch !== this.generationEpoch) return;
        if (audioUrl) {
          await this.playAudioUrl(audioUrl, request, epoch);
        } else {
          if (request.onError) {
            request.onError(new Error('Studio voice engine unavailable (robot fallback disabled).'));
          }
        }
      }
    } catch (e) {
      dev_null('[AudioSwarm] Execution exception:', e);
      if (epoch === this.generationEpoch && request.onError) {
        request.onError(e);
      }
    } finally {
      if (epoch === this.generationEpoch) {
        this.isLocked = false;
        if (request.onEnd) request.onEnd();
        this.processQueue();
      }
    }
  }

  public registerAudioContext(ctx: AudioContext): void {
    this.activeAudioContexts.push(ctx);
  }
}

export const audioSwarm = AudioSwarm.getInstance();
