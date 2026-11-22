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

import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { internalSecretsHandler } from './internalSecretsHandler';

export type WheelRoutingMode = 'capable-first' | 'balanced-wheel' | 'fastest-first' | 'round-robin';
export type WheelProviderKind =
  | 'gemini'
  | 'openrouter'
  | 'groq'
  | 'deepseek'
  | 'openai'
  | 'custom-proxy'
  | 'ollama'
  | 'llama-server';

export type WheelTier = 'flagship' | 'capable' | 'fast' | 'local';

export interface CustomProxyNode {
  id: string;
  label: string;
  baseUrl: string;
  model: string;
  tier: WheelTier;
  enabled: boolean;
}

export interface ProxyWheelConfig {
  enabled: boolean;
  mode: WheelRoutingMode;
  maxRotations: number;
  cooldownBaseMs: number;
  customNodes: CustomProxyNode[];
}

export interface WheelSpokePublic {
  id: string;
  provider: WheelProviderKind;
  providerLabel: string;
  model: string;
  tier: WheelTier;
  keySlot: string;
  maskedKey: string;
  envSource: string;
  baseUrl?: string;
  supportsTools: boolean;
  supportsThinking: boolean;
  status: 'READY' | 'COOLDOWN';
  cooldownUntil: number;
  cooldownRemainingSec: number;
  cooldownReason?: string;
  consecutiveFailures: number;
  avgMs: number;
  successes: number;
  failures: number;
  lastError?: string;
}

export interface WheelHopEvent {
  timestamp: string;
  spokeId: string;
  provider: WheelProviderKind;
  model: string;
  keySlot: string;
  status: 'OK' | '429_COOLDOWN' | 'COOLDOWN' | 'ERR';
  latencyMs: number;
  note?: string;
}

interface SpokeStats {
  avgMs: number;
  successes: number;
  failures: number;
  consecutiveFailures: number;
  cooldownUntil: number;
  cooldownReason?: string;
  lastError?: string;
}

interface SpokeCredential {
  provider: WheelProviderKind;
  apiKey?: string;
  baseUrl?: string;
  model: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const WHEEL_CONFIG_PATH = path.join(DATA_DIR, '.proxy_wheel_config.json');

const CAPABLE_GEMINI_BASELINE: Array<{ model: string; tier: WheelTier; supportsTools: boolean; supportsThinking: boolean }> = [
  { model: 'gemini-2.5-flash', tier: 'flagship', supportsTools: true, supportsThinking: true },
  { model: 'gemini-2.5-flash-lite', tier: 'flagship', supportsTools: true, supportsThinking: false },
  { model: 'gemini-2.5-pro', tier: 'flagship', supportsTools: true, supportsThinking: true },
  { model: 'gemini-3-flash-preview', tier: 'capable', supportsTools: true, supportsThinking: true },
  { model: 'gemini-3.1-flash-lite-preview', tier: 'capable', supportsTools: true, supportsThinking: true },
  { model: 'gemini-flash-latest', tier: 'capable', supportsTools: true, supportsThinking: true },
  { model: 'gemini-flash-lite-latest', tier: 'fast', supportsTools: true, supportsThinking: false },
  { model: 'gemini-4-hydrogen', tier: 'capable', supportsTools: true, supportsThinking: true },
  { model: 'gemini-4-neon', tier: 'capable', supportsTools: true, supportsThinking: true },
  { model: 'gemini-4-argon', tier: 'capable', supportsTools: true, supportsThinking: true },
  { model: 'gemini-4-carbon', tier: 'capable', supportsTools: true, supportsThinking: true },
  { model: 'gemma-4-31b-it', tier: 'fast', supportsTools: false, supportsThinking: false },
  { model: 'gemma-4-26b-a4b-it', tier: 'fast', supportsTools: false, supportsThinking: false }
];

const OPENROUTER_MODELS: Array<{ model: string; tier: WheelTier }> = [
  { model: 'google/gemini-3-flash-preview', tier: 'flagship' },
  { model: 'deepseek/deepseek-r1', tier: 'flagship' },
  { model: 'qwen/qwen-2.5-coder-32b-instruct', tier: 'capable' },
  { model: 'meta-llama/llama-3.3-70b-instruct:free', tier: 'fast' }
];

const GROQ_MODELS: Array<{ model: string; tier: WheelTier }> = [
  { model: 'llama-3.3-70b-versatile', tier: 'capable' },
  { model: 'deepseek-r1-distill-llama-70b', tier: 'capable' }
];

const DEEPSEEK_MODELS: Array<{ model: string; tier: WheelTier }> = [
  { model: 'deepseek-chat', tier: 'flagship' },
  { model: 'deepseek-reasoner', tier: 'flagship' }
];

const OPENAI_MODELS: Array<{ model: string; tier: WheelTier }> = [
  { model: 'gpt-4o', tier: 'flagship' },
  { model: 'gpt-4o-mini', tier: 'fast' }
];

const TIER_RANK: Record<WheelTier, number> = {
  flagship: 0,
  capable: 1,
  fast: 2,
  local: 3
};

class ProxyLoopWheelManager {
  private instanceId = `wheel-${process.pid}`;
  private port = 3000;

  private config: ProxyWheelConfig = {
    enabled: true,
    mode: 'capable-first',
    maxRotations: 3,
    cooldownBaseMs: 15_000,
    customNodes: []
  };

  private wheelCursor = 0;
  private totalRotations = 0;
  private totalDispatches = 0;
  private pinnedSpokeId: string | null = null;

  private spokeStats = new Map<string, SpokeStats>();
  private spokeCredentials = new Map<string, SpokeCredential>();
  private geminiClientCache = new Map<string, GoogleGenAI>();
  private keySlotStats = new Map<string, {
    requestTimestamps60s: number[];
    lastUsedAt: number;
    successes: number;
    failures: number;
    rateLimitHits: number;
    serviceDeniedModels: Set<string>;
    quarantinedUntil: number;
    quarantineReason?: string;
  }>();
  private geminiKeyRotationCursor = 0;
  private discoveredGeminiModels: string[] = [];
  private lastModelDiscoveryAt = 0;
  private discoveryInFlight: Promise<string[]> | null = null;

  private localDaemonCache: {
    checkedAt: number;
    ollamaAlive: boolean;
    ollamaModels: string[];
    llama8080Alive: boolean;
  } = {
    checkedAt: 0,
    ollamaAlive: false,
    ollamaModels: [],
    llama8080Alive: false
  };

  private wheelHistory: WheelHopEvent[] = [];

  public init(opts: { instanceId: string; port: number }): void {
    this.instanceId = opts.instanceId;
    this.port = opts.port || 3000;
    this.loadConfigFromDisk();
    this.refreshDaemonReachability().catch(() => {});
  }

  public getConfig(): ProxyWheelConfig {
    return {
      ...this.config,
      customNodes: [...this.config.customNodes]
    };
  }

  private loadConfigFromDisk(): void {
    try {
      if (fs.existsSync(WHEEL_CONFIG_PATH)) {
        const raw = fs.readFileSync(WHEEL_CONFIG_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (typeof parsed.enabled === 'boolean') this.config.enabled = parsed.enabled;
          if (['capable-first', 'balanced-wheel', 'fastest-first', 'round-robin'].includes(parsed.mode)) {
            this.config.mode = parsed.mode;
          }
          if (typeof parsed.maxRotations === 'number') {
            this.config.maxRotations = Math.min(10, Math.max(1, Math.round(parsed.maxRotations)));
          }
          if (typeof parsed.cooldownBaseMs === 'number') {
            this.config.cooldownBaseMs = Math.min(120_000, Math.max(5_000, Math.round(parsed.cooldownBaseMs)));
          }
          if (Array.isArray(parsed.customNodes)) {
            this.config.customNodes = parsed.customNodes
              .filter((n: any) => n && typeof n.baseUrl === 'string' && !this.isSelfLoopUrl(n.baseUrl))
              .map((n: any, idx: number) => ({
                id: String(n.id || `custom-${idx + 1}`),
                label: String(n.label || n.baseUrl),
                baseUrl: String(n.baseUrl).trim().replace(/\/+$/, ''),
                model: String(n.model || 'gpt-4o-mini'),
                tier: (['flagship', 'capable', 'fast', 'local'].includes(n.tier) ? n.tier : 'capable') as WheelTier,
                enabled: n.enabled !== false
              }));
          }
        }
      }
    } catch {
      // Keep safe defaults
    }
  }

  private persistConfigAtomic(): void {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const tmp = `${WHEEL_CONFIG_PATH}.tmp-${process.pid}-${Date.now()}`;
      fs.writeFileSync(tmp, JSON.stringify(this.config, null, 2), 'utf-8');
      fs.renameSync(tmp, WHEEL_CONFIG_PATH);
    } catch {
      // Non-fatal persistence warning
    }
  }

  public isSelfLoopUrl(rawUrl: string): boolean {
    if (!rawUrl || typeof rawUrl !== 'string') return true;
    const trimmed = rawUrl.trim();
    if (!/^https?:\/\//i.test(trimmed)) return true;
    try {
      const u = new URL(trimmed);
      const host = u.hostname.toLowerCase();
      const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1' || host === '[::1]';
      const resolvedPort = u.port ? parseInt(u.port, 10) : (u.protocol === 'https:' ? 443 : 80);
      if (isLocalHost && resolvedPort === this.port) {
        return true;
      }
      if (u.pathname.includes('/api/v1') && isLocalHost) {
        return true;
      }
      return false;
    } catch {
      return true;
    }
  }

  public updateConfig(patch: Partial<ProxyWheelConfig>): ProxyWheelConfig {
    if (typeof patch.enabled === 'boolean') this.config.enabled = patch.enabled;
    if (patch.mode && ['capable-first', 'balanced-wheel', 'fastest-first', 'round-robin'].includes(patch.mode)) {
      this.config.mode = patch.mode;
    }
    if (typeof patch.maxRotations === 'number' && !Number.isNaN(patch.maxRotations)) {
      this.config.maxRotations = Math.min(10, Math.max(1, Math.round(patch.maxRotations)));
    }
    if (typeof patch.cooldownBaseMs === 'number' && !Number.isNaN(patch.cooldownBaseMs)) {
      this.config.cooldownBaseMs = Math.min(120_000, Math.max(5_000, Math.round(patch.cooldownBaseMs)));
    }
    if (Array.isArray(patch.customNodes)) {
      const cleaned: CustomProxyNode[] = [];
      for (let i = 0; i < patch.customNodes.length; i++) {
        const n = patch.customNodes[i];
        if (!n || typeof n.baseUrl !== 'string') continue;
        const cleanUrl = n.baseUrl.trim().replace(/\/+$/, '');
        if (this.isSelfLoopUrl(cleanUrl)) {
          throw new Error(`Rejected custom proxy URL "${cleanUrl}": matches self-proxy loopback guard.`);
        }
        cleaned.push({
          id: String(n.id || `custom-${Date.now()}-${i}`),
          label: String(n.label || cleanUrl).slice(0, 64),
          baseUrl: cleanUrl,
          model: String(n.model || 'gpt-4o-mini').trim(),
          tier: (['flagship', 'capable', 'fast', 'local'].includes(n.tier) ? n.tier : 'capable') as WheelTier,
          enabled: n.enabled !== false
        });
      }
      this.config.customNodes = cleaned;
    }
    this.persistConfigAtomic();
    return this.getConfig();
  }

  public refresh(): void {
    this.geminiClientCache.clear();
    this.lastModelDiscoveryAt = 0;
    this.localDaemonCache.checkedAt = 0;
    this.discoverCapableGeminiModels(true).catch(() => {});
    this.refreshDaemonReachability(true).catch(() => {});
  }

  private isCapableGeminiModelName(name: string): boolean {
    const lower = name.toLowerCase();
    if (!lower.startsWith('gemini-') && !lower.startsWith('gemma-4')) return false;
    if (
      lower.includes('embedding') ||
      lower.includes('aqa') ||
      lower.includes('imagen') ||
      lower.includes('veo') ||
      lower.includes('lyria') ||
      lower.includes('-tts') ||
      lower.includes('native-audio') ||
      lower.includes('robotics') ||
      lower.includes('computer-use') ||
      lower.includes('-image') ||
      lower.includes('-live') ||
      lower.includes('transcribe') ||
      lower.includes('omni') ||
      lower.includes('nano-banana') ||
      lower.includes('decision') ||
      lower.includes('translate') ||
      lower.includes('3.6') ||
      lower.includes('3.7') ||
      lower.includes('3.8') ||
      lower.includes('gemini-1.') ||
      lower.includes('gemini-2.0') ||
      lower === 'gemini-pro'
    ) {
      return false;
    }
    return true;
  }

  public async discoverCapableGeminiModels(force = false): Promise<string[]> {
    const now = Date.now();
    if (!force && this.discoveredGeminiModels.length > 0 && now - this.lastModelDiscoveryAt < 300_000) {
      return this.discoveredGeminiModels;
    }
    if (this.discoveryInFlight) return this.discoveryInFlight;

    const pool = internalSecretsHandler.getSecretPool('GEMINI_API_KEY', 'GEMINI_API_KEYS');
    if (pool.length === 0) {
      this.discoveredGeminiModels = [];
      return [];
    }

    this.discoveryInFlight = (async () => {
      const discovered = new Set<string>();
      for (const entry of pool) {
        // Vertex AI Express Mode keys (AQ.*) do not expose models.list() on generativelanguage; use CAPABLE_GEMINI_BASELINE directly.
        if (entry.value.trim().startsWith('AQ.')) {
          continue;
        }
        try {
          const client = this.getOrCreateGeminiClient(entry.value);
          const pager = await Promise.race([
            client.models.list({ config: { pageSize: 50 } }),
            new Promise<never>((_, rej) => setTimeout(() => rej(new Error('list_timeout')), 4500))
          ]);
          for await (const m of pager as any) {
            const shortName = String(m?.name || '').replace(/^models\//, '');
            const methods: string[] = Array.isArray(m?.supportedGenerationMethods) ? m.supportedGenerationMethods : [];
            const supportsGen = methods.length === 0 || methods.includes('generateContent');
            if (supportsGen && this.isCapableGeminiModelName(shortName)) {
              discovered.add(shortName);
            }
          }
        } catch (err: any) {
          const msg = String(err?.message || err || '');
          // Only quarantine keys explicitly reported as invalid/expired — NEVER quarantine on 403 PERMISSION_DENIED from models.list()
          // because scoped Vertex/AI Studio Express keys (e.g. AQ.A...) can invoke generateContent even when models.list() is restricted.
          if (/API_KEY_INVALID|API key not valid|API key expired/i.test(msg)) {
            internalSecretsHandler.markSecretValueRejected(entry.value, msg.slice(0, 140));
          }
        }
      }
      const list = Array.from(discovered);
      this.discoveredGeminiModels = list;
      this.lastModelDiscoveryAt = Date.now();
      return list;
    })().finally(() => {
      this.discoveryInFlight = null;
    });

    return this.discoveryInFlight;
  }

  public async refreshDaemonReachability(force = false): Promise<void> {
    const now = Date.now();
    if (!force && now - this.localDaemonCache.checkedAt < 25_000) return;
    this.localDaemonCache.checkedAt = now;

    // 1. Check external Ollama daemon
    const ollamaHost = (internalSecretsHandler.getSecret('OLLAMA_HOST') || 'http://127.0.0.1:11434').replace(/\/+$/, '');
    let ollamaAlive = false;
    const ollamaModels: string[] = [];
    if (!this.isSelfLoopUrl(ollamaHost)) {
      try {
        const res = await fetch(`${ollamaHost}/api/tags`, {
          headers: { 'x-aurelius-loop-guard': this.instanceId },
          signal: AbortSignal.timeout(700)
        });
        if (res.ok) {
          const data: any = await res.json().catch(() => null);
          ollamaAlive = true;
          if (Array.isArray(data?.models)) {
            for (const m of data.models) {
              if (m?.name) ollamaModels.push(String(m.name));
            }
          }
        }
      } catch {
        ollamaAlive = false;
      }
    }

    // 2. Check non-self Termux/local llama-server on 8080
    let llama8080Alive = false;
    if (this.port !== 8080) {
      try {
        const r = await fetch('http://127.0.0.1:8080/health', {
          headers: { 'x-aurelius-loop-guard': this.instanceId },
          signal: AbortSignal.timeout(500)
        });
        const inst = r.headers.get('x-aurelius-instance');
        const ct = (r.headers.get('content-type') || '').toLowerCase();
        if (!inst && !ct.includes('text/html') && (r.ok || r.status === 503)) {
          const bodyText = await r.text().catch(() => '');
          if (bodyText && !/^\s*<!doctype|^\s*<html/i.test(bodyText)) {
            llama8080Alive = true;
          }
        }
      } catch {
        llama8080Alive = false;
      }
    }

    this.localDaemonCache = {
      checkedAt: Date.now(),
      ollamaAlive,
      ollamaModels,
      llama8080Alive
    };
  }

  private getOrCreateGeminiClient(apiKey: string, modeOverride?: 'vertex' | 'dev'): GoogleGenAI {
    const trimmed = apiKey.trim();
    const useVertex = modeOverride ? modeOverride === 'vertex' : trimmed.startsWith('AQ.');
    const cacheKey = `${trimmed}::${useVertex ? 'vertex' : 'dev'}`;
    let client = this.geminiClientCache.get(cacheKey);
    if (!client) {
      client = new GoogleGenAI({
        apiKey: trimmed,
        ...(useVertex ? { vertexai: true } : {}),
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
      this.geminiClientCache.set(cacheKey, client);
    }
    return client;
  }

  public getGeminiClientForSpoke(spokeId: string): GoogleGenAI | null {
    const cred = this.spokeCredentials.get(spokeId);
    if (!cred || cred.provider !== 'gemini' || !cred.apiKey) return null;
    return this.getOrCreateGeminiClient(cred.apiKey);
  }

  public getAlternateGeminiClientForSpoke(spokeId: string): GoogleGenAI | null {
    const cred = this.spokeCredentials.get(spokeId);
    if (!cred || cred.provider !== 'gemini' || !cred.apiKey) return null;
    const isAq = cred.apiKey.trim().startsWith('AQ.');
    return this.getOrCreateGeminiClient(cred.apiKey, isAq ? 'dev' : 'vertex');
  }

  private getOrInitKeySlotStats(slotKey: string) {
    let s = this.keySlotStats.get(slotKey);
    if (!s) {
      s = {
        requestTimestamps60s: [],
        lastUsedAt: 0,
        successes: 0,
        failures: 0,
        rateLimitHits: 0,
        serviceDeniedModels: new Set<string>(),
        quarantinedUntil: 0
      };
      this.keySlotStats.set(slotKey, s);
    }
    const cutoff = Date.now() - 60_000;
    if (s.requestTimestamps60s.length > 0 && s.requestTimestamps60s[0] < cutoff) {
      s.requestTimestamps60s = s.requestTimestamps60s.filter((ts) => ts >= cutoff);
    }
    if (s.quarantinedUntil > 0 && Date.now() >= s.quarantinedUntil) {
      s.quarantinedUntil = 0;
      s.quarantineReason = undefined;
      s.serviceDeniedModels.clear();
    }
    return s;
  }

  private getSlotRpm60s(slotKey: string): number {
    return this.getOrInitKeySlotStats(slotKey).requestTimestamps60s.length;
  }

  private isKeySlotQuarantined(slotKey: string): boolean {
    const s = this.getOrInitKeySlotStats(slotKey);
    return s.quarantinedUntil > Date.now();
  }

  /**
   * Returns all healthy, non-rejected, non-quarantined Gemini keys ordered by
   * lowest 60s RPM -> least-recently-used -> round-robin cursor to prevent single-key dehydration.
   */
  public getHealthyGeminiCredentialsOrdered(): Array<{
    slot: string;
    envSource: string;
    masked: string;
    apiKey: string;
    rpm60s: number;
    lastUsedAt: number;
    client: GoogleGenAI;
  }> {
    const pool = internalSecretsHandler.getSecretPool('GEMINI_API_KEY', 'GEMINI_API_KEYS');
    if (pool.length === 0) return [];
    const active = pool.filter((entry) => !this.isKeySlotQuarantined(`gemini:${entry.slot}`));
    const candidates = active.length > 0 ? active : pool;
    const enriched = candidates.map((entry, idx) => {
      const slotKey = `gemini:${entry.slot}`;
      const st = this.getOrInitKeySlotStats(slotKey);
      return {
        slot: entry.slot,
        envSource: entry.envSource,
        masked: entry.masked,
        apiKey: entry.value,
        rpm60s: st.requestTimestamps60s.length,
        lastUsedAt: st.lastUsedAt,
        rrIndex: (idx - (this.geminiKeyRotationCursor % Math.max(1, candidates.length)) + candidates.length) % Math.max(1, candidates.length),
        client: this.getOrCreateGeminiClient(entry.value)
      };
    });
    enriched.sort((a, b) => {
      if (a.rpm60s !== b.rpm60s) return a.rpm60s - b.rpm60s;
      if (a.lastUsedAt !== b.lastUsedAt) return a.lastUsedAt - b.lastUsedAt;
      return a.rrIndex - b.rrIndex;
    });
    return enriched.map(({ rrIndex: _rr, ...rest }) => rest);
  }

  public getNextRotatingGeminiCredential(advance = true): {
    slot: string;
    envSource: string;
    masked: string;
    apiKey: string;
    client: GoogleGenAI;
  } | null {
    const ordered = this.getHealthyGeminiCredentialsOrdered();
    if (ordered.length === 0) return null;
    const picked = ordered[0];
    if (advance) {
      this.geminiKeyRotationCursor = (this.geminiKeyRotationCursor + 1) % Math.max(1, ordered.length);
      const st = this.getOrInitKeySlotStats(`gemini:${picked.slot}`);
      st.lastUsedAt = Date.now();
      st.requestTimestamps60s.push(Date.now());
    }
    return picked;
  }

  public recordDirectKeyFailure(apiKey: string | undefined | null, err: any): void {
    if (!apiKey) return;
    const rawMsg = String(err?.message || err || '');
    const status = Number(err?.status || err?.code || 0);
    const lower = rawMsg.toLowerCase();
    const isDeadKey =
      /api_key_invalid|api key not valid|invalid api key|api key expired|api_key_not_found|api_key_service_blocked|bound service account is deleted or disabled|service account bound to the api key|access_token_type_unsupported|credentials_missing/i.test(lower);
    if (isDeadKey) {
      internalSecretsHandler.markSecretValueRejected(apiKey, internalSecretsHandler.redactText(rawMsg).slice(0, 140), 30 * 60_000);
    } else if (status === 403 && /permission denied on the service|has not been used in project|service_disabled/i.test(lower)) {
      internalSecretsHandler.markSecretValueRejected(apiKey, internalSecretsHandler.redactText(rawMsg).slice(0, 140), 10 * 60_000);
    }
  }

  public getOpenAiClientForSpoke(spokeId: string): OpenAI | null {
    const cred = this.spokeCredentials.get(spokeId);
    if (!cred || cred.provider === 'gemini') return null;

    if (cred.provider === 'openrouter') {
      return new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: cred.apiKey || '',
        defaultHeaders: {
          'HTTP-Referer': 'https://aurelius-sovereign.local',
          'X-Title': 'Aurelius Sovereign Orchestrator'
        }
      });
    }
    if (cred.provider === 'groq') {
      return new OpenAI({
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: cred.apiKey || ''
      });
    }
    if (cred.provider === 'deepseek') {
      return new OpenAI({
        baseURL: 'https://api.deepseek.com',
        apiKey: cred.apiKey || ''
      });
    }
    if (cred.provider === 'openai') {
      return new OpenAI({
        apiKey: cred.apiKey || ''
      });
    }
    if (cred.provider === 'custom-proxy' && cred.baseUrl) {
      return new OpenAI({
        baseURL: cred.baseUrl,
        apiKey: cred.apiKey || 'sk-proxy-wheel',
        defaultHeaders: {
          'x-aurelius-loop-guard': this.instanceId
        }
      });
    }
    if (cred.provider === 'ollama') {
      const host = (cred.baseUrl || 'http://127.0.0.1:11434').replace(/\/+$/, '');
      return new OpenAI({
        baseURL: `${host}/v1`,
        apiKey: 'ollama',
        defaultHeaders: {
          'x-aurelius-loop-guard': this.instanceId
        }
      });
    }
    if (cred.provider === 'llama-server') {
      return new OpenAI({
        baseURL: 'http://127.0.0.1:8080/v1',
        apiKey: 'llama-local',
        defaultHeaders: {
          'x-aurelius-loop-guard': this.instanceId
        }
      });
    }
    return null;
  }

  public getSpokeMeta(spokeId: string): WheelSpokePublic | undefined {
    return this.buildWheelSpokes().find((s) => s.id === spokeId);
  }

  public buildWheelSpokes(): WheelSpokePublic[] {
    const now = Date.now();
    const spokes: WheelSpokePublic[] = [];

    const pushSpoke = (
      spoke: Omit<WheelSpokePublic, 'status' | 'cooldownUntil' | 'cooldownRemainingSec' | 'consecutiveFailures' | 'avgMs' | 'successes' | 'failures' | 'lastError' | 'cooldownReason'>,
      cred: SpokeCredential
    ) => {
      this.spokeCredentials.set(spoke.id, cred);
      let stats = this.spokeStats.get(spoke.id);
      if (stats && stats.cooldownUntil > 0 && now >= stats.cooldownUntil) {
        stats.cooldownUntil = 0;
        stats.cooldownReason = undefined;
      }
      const inCooldown = Boolean(stats && stats.cooldownUntil > now);
      spokes.push({
        ...spoke,
        status: inCooldown ? 'COOLDOWN' : 'READY',
        cooldownUntil: inCooldown ? stats!.cooldownUntil : 0,
        cooldownRemainingSec: inCooldown ? Math.max(1, Math.ceil((stats!.cooldownUntil - now) / 1000)) : 0,
        ...(inCooldown && stats?.cooldownReason ? { cooldownReason: stats.cooldownReason } : {}),
        consecutiveFailures: stats?.consecutiveFailures || 0,
        avgMs: stats?.avgMs || 0,
        successes: stats?.successes || 0,
        failures: stats?.failures || 0,
        ...(stats?.lastError ? { lastError: stats.lastError } : {})
      });
    };

    // 1. Gemini Developer API key pool × capable models
    const geminiPool = internalSecretsHandler.getSecretPool('GEMINI_API_KEY', 'GEMINI_API_KEYS');
    if (geminiPool.length > 0) {
      const capableCatalog = [...CAPABLE_GEMINI_BASELINE];
      for (const dModel of this.discoveredGeminiModels) {
        if (!capableCatalog.some((c) => c.model === dModel)) {
          const isGemma = dModel.startsWith('gemma-');
          const tier: WheelTier = dModel.includes('lite') ? 'fast' : 'capable';
          capableCatalog.push({
            model: dModel,
            tier,
            supportsTools: !isGemma,
            supportsThinking: !isGemma && (dModel.includes('gemini-3') || dModel.includes('gemini-2.5') || dModel.includes('gemini-4'))
          });
        }
      }

      for (const spec of capableCatalog) {
        for (const keyEntry of geminiPool) {
          pushSpoke(
            {
              id: `gemini:${keyEntry.slot}:${spec.model}`,
              provider: 'gemini',
              providerLabel: 'Google Gemini API',
              model: spec.model,
              tier: spec.tier,
              keySlot: keyEntry.slot,
              maskedKey: keyEntry.masked,
              envSource: keyEntry.envSource,
              supportsTools: spec.supportsTools,
              supportsThinking: spec.supportsThinking
            },
            {
              provider: 'gemini',
              apiKey: keyEntry.value,
              model: spec.model
            }
          );
        }
      }
    }

    // 2. OpenRouter key pool
    const orPool = internalSecretsHandler.getSecretPool('OPENROUTER_API_KEY', 'OPENROUTER_API_KEYS');
    for (const keyEntry of orPool) {
      for (const spec of OPENROUTER_MODELS) {
        pushSpoke(
          {
            id: `openrouter:${keyEntry.slot}:${spec.model}`,
            provider: 'openrouter',
            providerLabel: 'OpenRouter MoE',
            model: spec.model,
            tier: spec.tier,
            keySlot: keyEntry.slot,
            maskedKey: keyEntry.masked,
            envSource: keyEntry.envSource,
            baseUrl: 'https://openrouter.ai/api/v1',
            supportsTools: !spec.model.includes('r1'),
            supportsThinking: spec.model.includes('r1')
          },
          {
            provider: 'openrouter',
            apiKey: keyEntry.value,
            baseUrl: 'https://openrouter.ai/api/v1',
            model: spec.model
          }
        );
      }
    }

    // 3. Groq LPU key pool
    const groqPool = internalSecretsHandler.getSecretPool('GROQ_API_KEY', 'GROQ_API_KEYS');
    for (const keyEntry of groqPool) {
      for (const spec of GROQ_MODELS) {
        pushSpoke(
          {
            id: `groq:${keyEntry.slot}:${spec.model}`,
            provider: 'groq',
            providerLabel: 'Groq LPU',
            model: spec.model,
            tier: spec.tier,
            keySlot: keyEntry.slot,
            maskedKey: keyEntry.masked,
            envSource: keyEntry.envSource,
            baseUrl: 'https://api.groq.com/openai/v1',
            supportsTools: !spec.model.includes('r1'),
            supportsThinking: spec.model.includes('r1')
          },
          {
            provider: 'groq',
            apiKey: keyEntry.value,
            baseUrl: 'https://api.groq.com/openai/v1',
            model: spec.model
          }
        );
      }
    }

    // 4. DeepSeek key pool
    const dsPool = internalSecretsHandler.getSecretPool('DEEPSEEK_API_KEY', 'DEEPSEEK_API_KEYS');
    for (const keyEntry of dsPool) {
      for (const spec of DEEPSEEK_MODELS) {
        pushSpoke(
          {
            id: `deepseek:${keyEntry.slot}:${spec.model}`,
            provider: 'deepseek',
            providerLabel: 'DeepSeek Native',
            model: spec.model,
            tier: spec.tier,
            keySlot: keyEntry.slot,
            maskedKey: keyEntry.masked,
            envSource: keyEntry.envSource,
            baseUrl: 'https://api.deepseek.com',
            supportsTools: spec.model === 'deepseek-chat',
            supportsThinking: spec.model === 'deepseek-reasoner'
          },
          {
            provider: 'deepseek',
            apiKey: keyEntry.value,
            baseUrl: 'https://api.deepseek.com',
            model: spec.model
          }
        );
      }
    }

    // 5. OpenAI Native pool
    const openaiPool = internalSecretsHandler.getSecretPool('OPENAI_API_KEY', 'OPENAI_API_KEYS');
    for (const keyEntry of openaiPool) {
      for (const spec of OPENAI_MODELS) {
        pushSpoke(
          {
            id: `openai:${keyEntry.slot}:${spec.model}`,
            provider: 'openai',
            providerLabel: 'OpenAI API',
            model: spec.model,
            tier: spec.tier,
            keySlot: keyEntry.slot,
            maskedKey: keyEntry.masked,
            envSource: keyEntry.envSource,
            baseUrl: 'https://api.openai.com/v1',
            supportsTools: true,
            supportsThinking: false
          },
          {
            provider: 'openai',
            apiKey: keyEntry.value,
            baseUrl: 'https://api.openai.com/v1',
            model: spec.model
          }
        );
      }
    }

    // 6. Custom OpenAI-Compatible Proxy Spokes (via CUSTOM_PROXY_URL env/vault + persistent customNodes)
    const customProxyUrls = internalSecretsHandler.getSecretPool('CUSTOM_PROXY_URL', 'CUSTOM_PROXY_URLS', undefined, {
      isPublicEndpoint: true
    });
    const customProxyKeys = internalSecretsHandler.getSecretPool('CUSTOM_PROXY_KEY', 'CUSTOM_PROXY_KEYS');
    const primaryCustomKey = customProxyKeys[0];

    customProxyUrls.forEach((urlEntry, idx) => {
      const cleanUrl = urlEntry.value.replace(/\/+$/, '');
      if (this.isSelfLoopUrl(cleanUrl)) return;
      const matchedKey = customProxyKeys[idx] || primaryCustomKey;
      pushSpoke(
        {
          id: `custom-env:${urlEntry.slot}:${cleanUrl}`,
          provider: 'custom-proxy',
          providerLabel: `Dev Proxy (${new URL(cleanUrl).host})`,
          model: process.env.CUSTOM_PROXY_MODEL || 'gpt-4o-mini',
          tier: 'capable',
          keySlot: matchedKey ? matchedKey.slot : 'open',
          maskedKey: matchedKey ? matchedKey.masked : 'no-bearer',
          envSource: urlEntry.envSource,
          baseUrl: cleanUrl,
          supportsTools: true,
          supportsThinking: false
        },
        {
          provider: 'custom-proxy',
          apiKey: matchedKey?.value || 'sk-proxy-wheel',
          baseUrl: cleanUrl,
          model: process.env.CUSTOM_PROXY_MODEL || 'gpt-4o-mini'
        }
      );
    });

    for (const node of this.config.customNodes) {
      if (!node.enabled || this.isSelfLoopUrl(node.baseUrl)) continue;
      let hostLabel = node.label;
      try {
        hostLabel = node.label || new URL(node.baseUrl).host;
      } catch {}
      pushSpoke(
        {
          id: `custom-node:${node.id}`,
          provider: 'custom-proxy',
          providerLabel: `Proxy Node (${hostLabel})`,
          model: node.model || 'gpt-4o-mini',
          tier: node.tier || 'capable',
          keySlot: primaryCustomKey ? primaryCustomKey.slot : 'node',
          maskedKey: primaryCustomKey ? primaryCustomKey.masked : 'custom-node',
          envSource: 'CUSTOM_NODES',
          baseUrl: node.baseUrl,
          supportsTools: true,
          supportsThinking: false
        },
        {
          provider: 'custom-proxy',
          apiKey: primaryCustomKey?.value || 'sk-proxy-wheel',
          baseUrl: node.baseUrl,
          model: node.model || 'gpt-4o-mini'
        }
      );
    }

    // 7. Verified External Local Daemons (Ollama & non-self llama-server)
    if (this.localDaemonCache.ollamaAlive) {
      const ollamaHost = (internalSecretsHandler.getSecret('OLLAMA_HOST') || 'http://127.0.0.1:11434').replace(/\/+$/, '');
      const localModel = this.localDaemonCache.ollamaModels[0] || 'llama3.2:latest';
      pushSpoke(
        {
          id: `ollama:local:${localModel}`,
          provider: 'ollama',
          providerLabel: 'Ollama Daemon',
          model: localModel,
          tier: 'local',
          keySlot: 'local-11434',
          maskedKey: ollamaHost,
          envSource: 'OLLAMA_HOST',
          baseUrl: `${ollamaHost}/v1`,
          supportsTools: false,
          supportsThinking: localModel.toLowerCase().includes('deepseek')
        },
        {
          provider: 'ollama',
          baseUrl: ollamaHost,
          model: localModel
        }
      );
    }

    if (this.localDaemonCache.llama8080Alive) {
      pushSpoke(
        {
          id: 'llama-server:local:8080',
          provider: 'llama-server',
          providerLabel: 'llama-server (8080)',
          model: 'local-gguf',
          tier: 'local',
          keySlot: 'local-8080',
          maskedKey: 'http://127.0.0.1:8080',
          envSource: 'LOCAL_8080',
          baseUrl: 'http://127.0.0.1:8080/v1',
          supportsTools: false,
          supportsThinking: false
        },
        {
          provider: 'llama-server',
          baseUrl: 'http://127.0.0.1:8080',
          model: 'local-gguf'
        }
      );
    }

    return spokes;
  }

  public stepCursor(spokesCount?: number): number {
    const spokes = this.buildWheelSpokes();
    const count = Math.max(1, spokesCount ?? spokes.length);
    const next = (this.wheelCursor + 1) % count;
    this.wheelCursor = next;
    this.totalRotations += 1;
    this.geminiKeyRotationCursor += 1;
    const landed = spokes[this.wheelCursor % Math.max(1, spokes.length)];
    if (landed && landed.status === 'READY') {
      this.pinnedSpokeId = landed.id;
    }
    return this.wheelCursor;
  }

  /**
   * Fully rehydrates all dehydrated/cooled/quarantined spokes & rejected keys,
   * resets RPM pressure and failure penalties, clears cached clients, and rotates
   * cleanly onto the next READY spoke (preferring a fresh key slot when available).
   */
  public rehydrateAndRotate(): {
    clearedCooldowns: number;
    cursor: number;
    totalRotations: number;
    activeSpoke: WheelSpokePublic | null;
  } {
    const prevSpokes = this.buildWheelSpokes();
    const prevIndex = prevSpokes.length > 0 ? this.wheelCursor % prevSpokes.length : 0;
    const prevSpoke = prevSpokes[prevIndex] || null;

    const clearedCooldowns = this.resetAllCooldowns();
    const freshSpokes = this.buildWheelSpokes();

    if (freshSpokes.length === 0) {
      this.wheelCursor = 0;
      this.pinnedSpokeId = null;
      this.totalRotations += 1;
      return {
        clearedCooldowns,
        cursor: 0,
        totalRotations: this.totalRotations,
        activeSpoke: null
      };
    }

    // Advance cursor to next READY spoke; if multiple key slots exist on the wheel,
    // advance cleanly across spokes so both model/slot and backup keys rotate visibly.
    let nextIndex = (prevIndex + 1) % freshSpokes.length;
    if (prevSpoke) {
      const distinctSlots = new Set(freshSpokes.map((s) => `${s.provider}:${s.keySlot}`));
      if (distinctSlots.size > 1) {
        // Find next ready spoke with a different keySlot or provider first if adjacent spoke shares slot
        const candidateIdx = freshSpokes.findIndex(
          (s, i) =>
            i !== prevIndex &&
            s.status === 'READY' &&
            `${s.provider}:${s.keySlot}` !== `${prevSpoke.provider}:${prevSpoke.keySlot}` &&
            i > prevIndex
        );
        if (candidateIdx >= 0) {
          nextIndex = candidateIdx;
        }
      }
      if (freshSpokes[nextIndex]?.status !== 'READY') {
        const readyIdx = freshSpokes.findIndex((s) => s.status === 'READY');
        if (readyIdx >= 0) nextIndex = readyIdx;
      }
    }

    this.wheelCursor = nextIndex;
    this.totalRotations += 1;
    this.geminiKeyRotationCursor += 1;
    const activeSpoke = freshSpokes[nextIndex] || null;
    this.pinnedSpokeId = activeSpoke?.id || null;

    if (activeSpoke) {
      this.pushHistory({
        timestamp: new Date().toISOString(),
        spokeId: activeSpoke.id,
        provider: activeSpoke.provider,
        model: activeSpoke.model,
        keySlot: activeSpoke.keySlot,
        status: 'OK',
        latencyMs: 1,
        note: `Rehydrated wheel (${clearedCooldowns} spoke(s) restored) -> rotated to ${activeSpoke.model} (${activeSpoke.keySlot})`
      });
    }

    return {
      clearedCooldowns,
      cursor: this.wheelCursor,
      totalRotations: this.totalRotations,
      activeSpoke
    };
  }

  public selectOrderedSpokes(opts?: {
    preferredModel?: string;
    requireTools?: boolean;
    includeCoolingFallback?: boolean;
    advanceCursor?: boolean;
  }): WheelSpokePublic[] {
    const allSpokes = this.buildWheelSpokes();
    if (allSpokes.length === 0) return [];

    const cursor = this.wheelCursor % allSpokes.length;
    if (opts?.advanceCursor !== false) {
      this.totalDispatches += 1;
      this.stepCursor(allSpokes.length);
    }

    let ready = allSpokes.filter((s) => s.status === 'READY');
    if (opts?.requireTools) {
      const toolReady = ready.filter((s) => s.supportsTools);
      if (toolReady.length > 0) ready = toolReady;
    }

    const pref = (opts?.preferredModel || '').trim().toLowerCase();
    const prefMatches = (s: WheelSpokePublic): boolean => {
      if (
        !pref ||
        pref === 'auto' ||
        pref === 'default' ||
        pref === 'proxy-wheel' ||
        pref === 'lyrailius-omega-ultimate-sovereign-moe' ||
        pref === 'aurelius-omega-universal-supermodel' ||
        pref === 'lysander-genesis-supermodel-intelligence'
      ) {
        return false;
      }
      const sm = s.model.toLowerCase();
      if (sm === pref || sm.includes(pref) || pref.includes(sm)) return true;
      if ((pref === 'argon' || pref.includes('argon')) && sm === 'gemini-4-argon') return true;
      if ((pref === 'neon' || pref.includes('neon') || pref === 'yourself') && sm === 'gemini-4-neon') return true;
      if ((pref === 'carbon' || pref.includes('carbon')) && sm === 'gemini-4-carbon') return true;
      if ((pref === 'hydrogen' || pref.includes('hydrogen')) && sm === 'gemini-4-hydrogen') return true;
      if (pref.includes('flash-lite') && sm.includes('flash-lite')) return true;
      if (pref.includes('deepseek') && sm.includes('deepseek')) return true;
      if (pref.includes('qwen') && sm.includes('qwen')) return true;
      if (pref.includes('llama') && sm.includes('llama')) return true;
      return false;
    };

    const rotateArray = <T>(arr: T[], offset: number): T[] => {
      if (arr.length <= 1) return arr;
      const k = ((offset % arr.length) + arr.length) % arr.length;
      return [...arr.slice(k), ...arr.slice(0, k)];
    };

    let orderedReady: WheelSpokePublic[] = [];

    if (this.config.mode === 'round-robin') {
      orderedReady = rotateArray(ready, cursor);
    } else if (this.config.mode === 'fastest-first') {
      const proven = ready
        .filter((s) => s.successes > 0 && s.avgMs > 0)
        .sort((a, b) => a.avgMs - b.avgMs);
      const unprobed = rotateArray(
        ready.filter((s) => !(s.successes > 0 && s.avgMs > 0)),
        cursor
      );
      orderedReady = [...proven, ...unprobed];
    } else if (this.config.mode === 'balanced-wheel') {
      // Interleave providers by grouping by provider + keySlot and taking 1 spoke per bucket round-robin
      const buckets = new Map<string, WheelSpokePublic[]>();
      for (const s of ready) {
        const key = `${s.provider}:${s.keySlot}`;
        const arr = buckets.get(key) || [];
        arr.push(s);
        buckets.set(key, arr);
      }
      const bucketList = rotateArray(Array.from(buckets.values()), cursor);
      let idx = 0;
      while (orderedReady.length < ready.length) {
        let added = false;
        for (const bucket of bucketList) {
          if (idx < bucket.length) {
            orderedReady.push(bucket[idx]);
            added = true;
          }
        }
        if (!added) break;
        idx++;
      }
    } else {
      // 'capable-first': prioritize flagship -> capable -> fast -> local; within each tier preserve model ranking,
      // boost proven healthy spokes and discovered live Gemini models first, and rotate across multi-key slots via cursor!
      const discoveredSet = new Set(this.discoveredGeminiModels);
      const isDiscoveredOrVerified = (s: WheelSpokePublic) =>
        s.provider !== 'gemini' ||
        discoveredSet.size === 0 ||
        discoveredSet.has(s.model) ||
        s.model === 'gemini-4-hydrogen' ||
        s.model === 'gemini-4-neon' ||
        s.model === 'gemini-4-argon' ||
        s.model === 'gemini-4-carbon' ||
        s.model === 'gemini-3.1-flash-lite';

      const tiers: WheelTier[] = ['flagship', 'capable', 'fast', 'local'];
      for (const tier of tiers) {
        const tierSpokes = ready.filter((s) => s.tier === tier);
        // Group spokes by model preserving CAPABLE_GEMINI_BASELINE order, then rotate healthy backup keySlots
        // evenly across requests (lowest 60s RPM -> least-recently-used -> round-robin cursor) to prevent dehydration!
        const modelGroups = new Map<string, WheelSpokePublic[]>();
        for (const s of tierSpokes) {
          const arr = modelGroups.get(s.model) || [];
          arr.push(s);
          modelGroups.set(s.model, arr);
        }

        const modelKeys = Array.from(modelGroups.keys()).sort((mA, mB) => {
          const spA = modelGroups.get(mA)!;
          const spB = modelGroups.get(mB)!;
          const aVerified = spA.some((s) => s.successes > 0 || isDiscoveredOrVerified(s)) ? 1 : 0;
          const bVerified = spB.some((s) => s.successes > 0 || isDiscoveredOrVerified(s)) ? 1 : 0;
          if (aVerified !== bVerified) return bVerified - aVerified;
          const aHealthy = spA.some((s) => s.failures === 0 || s.successes > 0) ? 1 : 0;
          const bHealthy = spB.some((s) => s.failures === 0 || s.successes > 0) ? 1 : 0;
          if (aHealthy !== bHealthy) return bHealthy - aHealthy;
          return 0;
        });

        for (const mKey of modelKeys) {
          const group = modelGroups.get(mKey)!;
          const distinctSlots = Array.from(new Set(group.map((s) => `${s.provider}:${s.keySlot}`)));
          const rotatedSlots = rotateArray(distinctSlots, cursor);
          const slotRank = new Map(rotatedSlots.map((slot, i) => [slot, i]));

          group.sort((a, b) => {
            const aKey = `${a.provider}:${a.keySlot}`;
            const bKey = `${b.provider}:${b.keySlot}`;
            const aUnhealthy = a.successes === 0 && a.failures > 0 ? 1 : 0;
            const bUnhealthy = b.successes === 0 && b.failures > 0 ? 1 : 0;
            if (aUnhealthy !== bUnhealthy) return aUnhealthy - bUnhealthy;
            // Anti-dehydration: spread load across all healthy key slots by lowest 60s RPM & least-recently-used first!
            const aRpm = this.getSlotRpm60s(aKey);
            const bRpm = this.getSlotRpm60s(bKey);
            if (aRpm !== bRpm) return aRpm - bRpm;
            const aLast = this.getOrInitKeySlotStats(aKey).lastUsedAt;
            const bLast = this.getOrInitKeySlotStats(bKey).lastUsedAt;
            if (aLast !== bLast) return aLast - bLast;
            return (slotRank.get(aKey) ?? 0) - (slotRank.get(bKey) ?? 0);
          });

          orderedReady.push(...group);
        }
      }
    }

    // Prioritize matching preferredModel at the front ONLY if those matching spokes are healthy (no unrecovered failures),
    // while keeping proven-healthy spokes ahead of failing spokes
    if (pref) {
      const healthyExactMatches = orderedReady.filter((s) => prefMatches(s) && (s.failures === 0 || s.successes > 0));
      if (healthyExactMatches.length > 0) {
        const rest = orderedReady.filter((s) => !healthyExactMatches.includes(s));
        orderedReady = [...healthyExactMatches, ...rest];
      }
    }

    // Honor a manually rotated spoke at the front of the dispatch list so clicking "Rotate Spoke"
    // immediately routes the next turn through the rotated spoke instead of snapping back to spoke #0.
    if (this.pinnedSpokeId) {
      const pinnedIdx = orderedReady.findIndex((s) => s.id === this.pinnedSpokeId);
      if (pinnedIdx > 0) {
        const [pinned] = orderedReady.splice(pinnedIdx, 1);
        orderedReady.unshift(pinned);
      }
      if (opts?.advanceCursor !== false) {
        this.pinnedSpokeId = null;
      }
    }

    if (opts?.includeCoolingFallback !== false || orderedReady.length === 0) {
      const cooling = allSpokes
        .filter(
          (s) =>
            s.status === 'COOLDOWN' &&
            s.cooldownReason !== 'MODEL_NOT_FOUND_404' &&
            s.cooldownReason !== 'auth_invalid_key' &&
            s.cooldownReason !== 'auth_service_disabled'
        )
        .sort((a, b) => a.cooldownUntil - b.cooldownUntil)
        .slice(0, Math.max(4, this.config.maxRotations * 2));
      if (orderedReady.length === 0 && cooling.length === 0) {
        // Only return non-dead spokes as last-resort probe so deleted/invalid keys are never spammed repeatedly
        const nonDead = allSpokes.filter(
          (s) => s.cooldownReason !== 'auth_invalid_key' && s.cooldownReason !== 'auth_service_disabled'
        );
        return (nonDead.length > 0 ? nonDead : [])
          .filter((s) => s.tier === 'flagship' || s.provider !== 'gemini')
          .slice(0, 4);
      }
      return [...orderedReady, ...cooling];
    }

    return orderedReady;
  }

  public recordSpokeSuccess(spokeId: string, latencyMs: number, note?: string): void {
    const prev = this.spokeStats.get(spokeId) || {
      avgMs: latencyMs,
      successes: 0,
      failures: 0,
      consecutiveFailures: 0,
      cooldownUntil: 0
    };
    const nextAvg = prev.successes === 0 ? latencyMs : Math.round(prev.avgMs * 0.7 + latencyMs * 0.3);
    this.spokeStats.set(spokeId, {
      avgMs: Math.max(1, nextAvg),
      successes: prev.successes + 1,
      failures: prev.failures,
      consecutiveFailures: 0,
      cooldownUntil: 0
    });
    const cred = this.spokeCredentials.get(spokeId);
    const parts = spokeId.split(':');
    const slotKey = parts.length >= 2 ? `${parts[0]}:${parts[1]}` : `gemini:slot-0`;
    const slotStats = this.getOrInitKeySlotStats(slotKey);
    const now = Date.now();
    slotStats.lastUsedAt = now;
    slotStats.requestTimestamps60s.push(now);
    slotStats.successes += 1;
    slotStats.quarantinedUntil = 0;
    slotStats.quarantineReason = undefined;
    slotStats.serviceDeniedModels.clear();

    this.pushHistory({
      timestamp: new Date().toISOString(),
      spokeId,
      provider: cred?.provider || 'gemini',
      model: cred?.model || spokeId,
      keySlot: parts[1] || 'slot-0',
      status: 'OK',
      latencyMs: Math.max(1, Math.round(latencyMs)),
      ...(note ? { note: internalSecretsHandler.redactText(note).slice(0, 140) } : {})
    });
  }

  public recordSpokeFailure(spokeId: string, err: any, latencyMs = 0): void {
    const status = Number(err?.status || err?.code || 0);
    const rawMsg = String(err?.message || err || 'Spoke error');
    const cleanMsg = internalSecretsHandler.redactText(rawMsg).slice(0, 160);
    const lower = rawMsg.toLowerCase();
    const is429 = status === 429 || lower.includes('resource_exhausted') || lower.includes('quota exceeded') || lower.includes('"code":429') || lower.includes('rate limit');

    const prev = this.spokeStats.get(spokeId) || {
      avgMs: 0,
      successes: 0,
      failures: 0,
      consecutiveFailures: 0,
      cooldownUntil: 0
    };
    const nextConsecutive = prev.consecutiveFailures + 1;

    const parts = spokeId.split(':');
    const slotKey = parts.length >= 2 ? `${parts[0]}:${parts[1]}` : `gemini:slot-0`;
    const slotStats = this.getOrInitKeySlotStats(slotKey);
    const now = Date.now();
    slotStats.lastUsedAt = now;
    slotStats.requestTimestamps60s.push(now);
    slotStats.failures += 1;

    let cooldownMs = Math.min(90_000, this.config.cooldownBaseMs * Math.pow(2, Math.min(3, nextConsecutive - 1)));
    let reason = `err_${status || 'sdk'}`;
    let quarantineWholeSlot = false;

    const isDeadCredentialMsg =
      /api_key_invalid|api key not valid|invalid api key|api key expired|api_key_not_found|api_key_service_blocked|bound service account is deleted or disabled|service account bound to the api key|access_token_type_unsupported|credentials_missing/i.test(lower);
    const isServiceDeniedMsg =
      /permission denied on the service|has not been used in project|service_disabled|api has not been used|consumer .* has been suspended/i.test(lower);

    if (is429) {
      slotStats.rateLimitHits += 1;
      const retryMatch = rawMsg.match(/"retryDelay"\s*:\s*"(\d+)s"/i) || rawMsg.match(/retry in\s+(\d+(?:\.\d+)?)s/i);
      if (retryMatch) {
        const secs = Math.ceil(parseFloat(retryMatch[1]));
        cooldownMs = Math.min(Math.max(secs * 1000, 10_000), 180_000);
      } else {
        cooldownMs = lower.includes('perday') ? 300_000 : 30_000;
      }
      reason = '429_rate_limit';
    } else if (isDeadCredentialMsg) {
      cooldownMs = 1_800_000; // 30 minutes quarantine for deleted service accounts / invalid keys
      reason = 'auth_invalid_key';
      quarantineWholeSlot = true;
    } else if (isServiceDeniedMsg) {
      const modelPart = parts.slice(2).join(':') || spokeId;
      slotStats.serviceDeniedModels.add(modelPart);
      if (slotStats.serviceDeniedModels.size >= 2 || modelPart === 'gemini-2.5-flash') {
        cooldownMs = 600_000; // 10 minutes quarantine when entire service is disabled on this key
        reason = 'auth_service_disabled';
        quarantineWholeSlot = true;
      } else {
        cooldownMs = 180_000;
        reason = 'auth_rejected';
      }
    } else if (
      status === 401 ||
      status === 403 ||
      lower.includes('permission denied') ||
      lower.includes('permission_denied') ||
      lower.includes('unauthenticated')
    ) {
      cooldownMs = status === 401 ? 600_000 : 120_000;
      reason = status === 401 ? 'auth_invalid_key' : 'auth_rejected';
      if (status === 401) quarantineWholeSlot = true;
    } else if (
      status === 404 ||
      lower.includes('not found') ||
      lower.includes('no longer available') ||
      lower.includes('not supported for generatecontent') ||
      lower.includes('does not exist')
    ) {
      cooldownMs = 600_000;
      reason = 'MODEL_NOT_FOUND_404';
    } else if (status === 400 || lower.includes('invalid_argument')) {
      cooldownMs = 20_000;
      reason = '400_invalid_arg';
    } else if (err?.isTimeout || status === 504 || lower.includes('timed out') || lower.includes('timeout')) {
      cooldownMs = 60_000;
      reason = 'timeout';
    } else if (status === 503 || lower.includes('high demand') || lower.includes('unavailable') || lower.includes('overloaded')) {
      cooldownMs = 45_000;
      reason = '503_high_demand';
    }

    const cooldownUntilTs = Date.now() + cooldownMs;
    this.spokeStats.set(spokeId, {
      avgMs: prev.avgMs,
      successes: prev.successes,
      failures: prev.failures + 1,
      consecutiveFailures: nextConsecutive,
      cooldownUntil: cooldownUntilTs,
      cooldownReason: reason,
      lastError: cleanMsg
    });

    const cred = this.spokeCredentials.get(spokeId);

    // Immediately quarantine dead/disabled-service keys across ALL sibling model spokes on that slot
    // so the wheel instantly rotates to healthy backup keys instead of hammering 13 models on a broken key!
    if (quarantineWholeSlot) {
      slotStats.quarantinedUntil = cooldownUntilTs;
      slotStats.quarantineReason = reason;
      if (cred?.apiKey) {
        internalSecretsHandler.markSecretValueRejected(cred.apiKey, cleanMsg, cooldownMs);
      }
      if (parts.length >= 2) {
        const slotPrefix = `${parts[0]}:${parts[1]}:`;
        for (const siblingId of this.spokeCredentials.keys()) {
          if (siblingId !== spokeId && siblingId.startsWith(slotPrefix)) {
            const sibPrev = this.spokeStats.get(siblingId);
            this.spokeStats.set(siblingId, {
              avgMs: sibPrev?.avgMs || 0,
              successes: sibPrev?.successes || 0,
              failures: (sibPrev?.failures || 0) + 1,
              consecutiveFailures: (sibPrev?.consecutiveFailures || 0) + 1,
              cooldownUntil: cooldownUntilTs,
              cooldownReason: reason,
              lastError: cleanMsg
            });
          }
        }
      }
    }
    if (this.pinnedSpokeId === spokeId) {
      this.pinnedSpokeId = null;
    }
    this.pushHistory({
      timestamp: new Date().toISOString(),
      spokeId,
      provider: cred?.provider || 'gemini',
      model: cred?.model || spokeId,
      keySlot: parts[1] || 'slot-0',
      status: is429 ? '429_COOLDOWN' : 'ERR',
      latencyMs: Math.max(0, Math.round(latencyMs)),
      note: cleanMsg
    });
  }

  public resetAllCooldowns(): number {
    const rejectedBefore = internalSecretsHandler.getRejectedSecretTelemetry().length;
    internalSecretsHandler.rehydrate();
    this.keySlotStats.clear();
    this.geminiClientCache.clear();
    this.pinnedSpokeId = null;
    let cleared = rejectedBefore;
    for (const [id, stats] of this.spokeStats.entries()) {
      if (stats.cooldownUntil > 0 || stats.consecutiveFailures > 0 || stats.failures > 0 || stats.lastError) {
        cleared++;
        this.spokeStats.set(id, {
          ...stats,
          cooldownUntil: 0,
          cooldownReason: undefined,
          consecutiveFailures: 0,
          failures: 0,
          lastError: undefined
        });
      }
    }
    return cleared;
  }

  private pushHistory(event: WheelHopEvent): void {
    this.wheelHistory.unshift(event);
    if (this.wheelHistory.length > 60) {
      this.wheelHistory.length = 60;
    }
  }

  public getStatusSnapshot() {
    const spokes = this.buildWheelSpokes();
    const readyCount = spokes.filter((s) => s.status === 'READY').length;
    const cooldownCount = spokes.filter((s) => s.status === 'COOLDOWN').length;
    const allGeminiKeys = internalSecretsHandler.getSecretPool('GEMINI_API_KEY', 'GEMINI_API_KEYS', undefined, {
      includeRejected: true
    });
    const healthyGeminiKeys = allGeminiKeys.filter((k) => !k.rejected && !this.isKeySlotQuarantined(`gemini:${k.slot}`));
    const quarantinedGeminiKeys = allGeminiKeys.filter((k) => k.rejected || this.isKeySlotQuarantined(`gemini:${k.slot}`));

    const providerSummary: Record<string, { total: number; ready: number; cooldown: number }> = {};

    for (const s of spokes) {
      if (!providerSummary[s.provider]) {
        providerSummary[s.provider] = { total: 0, ready: 0, cooldown: 0 };
      }
      providerSummary[s.provider].total += 1;
      if (s.status === 'READY') providerSummary[s.provider].ready += 1;
      else providerSummary[s.provider].cooldown += 1;
    }

    const activeIndex = spokes.length > 0 ? this.wheelCursor % spokes.length : 0;
    const activeSpoke = spokes[activeIndex] || null;

    const slotTelemetry = allGeminiKeys.map((entry) => {
      const st = this.getOrInitKeySlotStats(`gemini:${entry.slot}`);
      const isQuarantined = Boolean(entry.rejected) || st.quarantinedUntil > Date.now();
      return {
        keySlot: entry.slot,
        envSource: entry.envSource,
        maskedKey: entry.masked,
        status: isQuarantined ? 'QUARANTINED' : 'HEALTHY',
        rpm60s: st.requestTimestamps60s.length,
        successes: st.successes,
        failures: st.failures,
        rateLimitHits: st.rateLimitHits,
        quarantineReason: st.quarantineReason || (entry.rejected ? 'auth_rejected' : null)
      };
    });

    return {
      success: true,
      enabled: this.config.enabled,
      mode: this.config.mode,
      maxRotations: this.config.maxRotations,
      cooldownBaseMs: this.config.cooldownBaseMs,
      cursor: activeIndex,
      totalRotations: this.totalRotations,
      totalDispatches: this.totalDispatches,
      totalSpokes: spokes.length,
      readySpokes: readyCount,
      cooldownSpokes: cooldownCount,
      geminiKeySlots: healthyGeminiKeys.length,
      keyPoolSummary: {
        totalConfiguredGeminiKeys: allGeminiKeys.length,
        healthyGeminiKeys: healthyGeminiKeys.length,
        quarantinedGeminiKeys: quarantinedGeminiKeys.length,
        rotationPolicy: 'anti-dehydration-lru-rpm-round-robin',
        supportedBackupEnvVars: [
          'GEMINI_API_KEY',
          'GEMINI_API_KEYS',
          'GEMINI_BACKUP_KEY_1..6',
          'GEMINI_API_KEY_1..12',
          'ALL_KEY',
          'OPENROUTER_API_KEYS',
          'GROQ_API_KEYS',
          'DEEPSEEK_API_KEYS',
          'OPENAI_API_KEYS'
        ],
        slots: slotTelemetry,
        rejectedSecrets: internalSecretsHandler.getRejectedSecretTelemetry()
      },
      discoveredGeminiModels: this.discoveredGeminiModels,
      customNodes: this.config.customNodes,
      activeSpoke: activeSpoke
        ? {
            id: activeSpoke.id,
            provider: activeSpoke.provider,
            providerLabel: activeSpoke.providerLabel,
            model: activeSpoke.model,
            keySlot: activeSpoke.keySlot,
            status: activeSpoke.status
          }
        : null,
      providerSummary,
      localDaemons: {
        ollamaAlive: this.localDaemonCache.ollamaAlive,
        ollamaModels: this.localDaemonCache.ollamaModels,
        llama8080Alive: this.localDaemonCache.llama8080Alive
      },
      spokes,
      history: this.wheelHistory.slice(0, 25),
      devProxyEndpoints: {
        openaiCompat: '/api/v1/chat/completions',
        proxyWheelChat: '/api/proxy-wheel/chat',
        universalChat: '/api/chat',
        controlPlane: '/api/proxy-wheel/status'
      },
      timestamp: new Date().toISOString()
    };
  }
}

export const proxyLoopWheel = new ProxyLoopWheelManager();
