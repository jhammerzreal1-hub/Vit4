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
  { model: 'gemini-4-hydrogen', tier: 'flagship', supportsTools: true, supportsThinking: true },
  { model: 'gemini-3.1-flash-lite', tier: 'flagship', supportsTools: true, supportsThinking: true },
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

  private spokeStats = new Map<string, SpokeStats>();
  private spokeCredentials = new Map<string, SpokeCredential>();
  private geminiClientCache = new Map<string, GoogleGenAI>();
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
      for (const entry of pool.slice(0, 2)) {
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
          if (discovered.size > 0) break;
        } catch {
          // Try next key in pool cleanly
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
        if (inst !== this.instanceId && (r.ok || r.status === 503)) {
          llama8080Alive = true;
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

  private getOrCreateGeminiClient(apiKey: string): GoogleGenAI {
    let client = this.geminiClientCache.get(apiKey);
    if (!client) {
      client = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
      this.geminiClientCache.set(apiKey, client);
    }
    return client;
  }

  public getGeminiClientForSpoke(spokeId: string): GoogleGenAI | null {
    const cred = this.spokeCredentials.get(spokeId);
    if (!cred || cred.provider !== 'gemini' || !cred.apiKey) return null;
    return this.getOrCreateGeminiClient(cred.apiKey);
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
    const count = Math.max(1, spokesCount ?? this.buildWheelSpokes().length);
    const next = this.wheelCursor + 1;
    if (next >= count) {
      this.wheelCursor = 0;
      this.totalRotations += 1;
    } else {
      this.wheelCursor = next;
    }
    return this.wheelCursor;
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
        const proven = tierSpokes
          .filter((s) => s.successes > 0)
          .sort((a, b) => (a.avgMs || 9999) - (b.avgMs || 9999));
        const unprobedVerified = tierSpokes.filter((s) => s.successes === 0 && s.failures === 0 && isDiscoveredOrVerified(s));
        const unprobedFallback = tierSpokes.filter((s) => s.successes === 0 && s.failures === 0 && !isDiscoveredOrVerified(s));
        const previouslyFailed = tierSpokes.filter((s) => s.successes === 0 && s.failures > 0);
        const orderedTier = [...proven, ...unprobedVerified, ...unprobedFallback, ...previouslyFailed];

        // Rotate across distinct keySlots when multiple keys exist without ever demoting proven-healthy slots behind unprobed/failing slots
        const distinctSlots = Array.from(new Set(orderedTier.map((s) => s.keySlot)));
        if (distinctSlots.length > 1) {
          const rotatedSlots = rotateArray(distinctSlots, cursor);
          const slotRank = new Map(rotatedSlots.map((slot, i) => [slot, i]));
          orderedTier.sort((a, b) => {
            if (a.model === b.model) {
              const aProven = a.successes > 0 ? 1 : 0;
              const bProven = b.successes > 0 ? 1 : 0;
              if (aProven !== bProven) return bProven - aProven;
              if (a.keySlot === 'slot-0' && b.successes === 0 && a.failures === 0) return -1;
              if (b.keySlot === 'slot-0' && a.successes === 0 && b.failures === 0) return 1;
              return (slotRank.get(a.keySlot) ?? 0) - (slotRank.get(b.keySlot) ?? 0);
            }
            return 0;
          });
        }
        orderedReady.push(...orderedTier);
      }
    }

    // Prioritize matching preferredModel at the front while keeping full wheel behind it
    if (pref) {
      const exactMatches = orderedReady.filter(prefMatches);
      const rest = orderedReady.filter((s) => !prefMatches(s));
      orderedReady = [...exactMatches, ...rest];
    }

    if (opts?.includeCoolingFallback !== false) {
      const cooling = allSpokes
        .filter((s) => s.status === 'COOLDOWN' && s.cooldownReason !== 'MODEL_NOT_FOUND_404' && s.cooldownReason !== 'auth_rejected')
        .sort((a, b) => a.cooldownUntil - b.cooldownUntil)
        .slice(0, Math.max(2, this.config.maxRotations * 2));
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
    this.pushHistory({
      timestamp: new Date().toISOString(),
      spokeId,
      provider: cred?.provider || 'gemini',
      model: cred?.model || spokeId,
      keySlot: spokeId.split(':')[1] || 'slot-0',
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

    let cooldownMs = Math.min(300_000, this.config.cooldownBaseMs * Math.pow(2, Math.min(4, nextConsecutive - 1)));
    let reason = `err_${status || 'sdk'}`;

    if (is429) {
      const retryMatch = rawMsg.match(/"retryDelay"\s*:\s*"(\d+)s"/i) || rawMsg.match(/retry in\s+(\d+(?:\.\d+)?)s/i);
      if (retryMatch) {
        const secs = Math.ceil(parseFloat(retryMatch[1]));
        cooldownMs = Math.min(Math.max(secs * 1000, 15_000), 600_000);
      } else {
        cooldownMs = lower.includes('perday') ? 600_000 : 45_000;
      }
      reason = '429_rate_limit';
    } else if (
      status === 401 ||
      status === 403 ||
      lower.includes('api key not valid') ||
      lower.includes('invalid api key') ||
      lower.includes('permission denied') ||
      lower.includes('permission_denied') ||
      lower.includes('unauthenticated') ||
      lower.includes('api_key_invalid')
    ) {
      cooldownMs = 1_800_000;
      reason = 'auth_rejected';
    } else if (
      status === 404 ||
      lower.includes('not found') ||
      lower.includes('no longer available') ||
      lower.includes('not supported for generatecontent') ||
      lower.includes('does not exist')
    ) {
      cooldownMs = 3_600_000;
      reason = 'MODEL_NOT_FOUND_404';
    } else if (err?.isTimeout || status === 504 || lower.includes('timed out') || lower.includes('timeout')) {
      cooldownMs = 90_000;
      reason = 'timeout';
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

    // If an entire API key slot failed authentication (401/403), cool down sibling models on that exact same provider:keySlot
    if (reason === 'auth_rejected') {
      const parts = spokeId.split(':');
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
              cooldownReason: 'auth_rejected',
              lastError: cleanMsg
            });
          }
        }
      }
    }

    const cred = this.spokeCredentials.get(spokeId);
    this.pushHistory({
      timestamp: new Date().toISOString(),
      spokeId,
      provider: cred?.provider || 'gemini',
      model: cred?.model || spokeId,
      keySlot: spokeId.split(':')[1] || 'slot-0',
      status: is429 ? '429_COOLDOWN' : 'ERR',
      latencyMs: Math.max(0, Math.round(latencyMs)),
      note: cleanMsg
    });
  }

  public resetAllCooldowns(): number {
    let cleared = 0;
    for (const [id, stats] of this.spokeStats.entries()) {
      if (stats.cooldownUntil > 0 || stats.consecutiveFailures > 0) {
        cleared++;
        this.spokeStats.set(id, {
          ...stats,
          cooldownUntil: 0,
          cooldownReason: undefined,
          consecutiveFailures: 0
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
    const geminiPoolCount = internalSecretsHandler.getSecretPool('GEMINI_API_KEY', 'GEMINI_API_KEYS').length;
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
      geminiKeySlots: geminiPoolCount,
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
