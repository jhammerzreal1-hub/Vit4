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

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface SecretSpec {
  id: string;
  name: string;
  envVar: string;
  category: 'LLM & AI' | 'Database & Storage' | 'Cloud & Search' | 'Telecom & eSIM' | 'Custom';
  proxyEndpoint: string;
  description: string;
  isPublicEndpoint?: boolean;
  quotaPolicy?: string;
}

export interface SecretTelemetry {
  id: string;
  name: string;
  envVar: string;
  category: string;
  status: 'INJECTED' | 'NOT_CONFIGURED';
  configured: boolean;
  source: 'vault' | 'env' | 'unset';
  maskedValue: string;
  fingerprint: string | null;
  length: number;
  proxyEndpoint: string;
  description: string;
  quotaPolicy?: string;
  updatedAt?: string;
}

interface VaultEntry {
  iv: string;
  tag: string;
  ciphertext: string;
  updatedAt: string;
  label?: string;
  category?: SecretSpec['category'];
  description?: string;
}

interface EncryptedVaultFile {
  version: number;
  algorithm: 'aes-256-gcm';
  updatedAt: string;
  entries: Record<string, VaultEntry>;
}

const WORKSPACE_ROOT = process.cwd();
const DATA_DIR = path.join(WORKSPACE_ROOT, 'data');
const VAULT_KEY_PATH = path.join(DATA_DIR, '.vault.key');
const VAULT_ENC_PATH = path.join(DATA_DIR, '.secrets.vault.enc');

export const CANONICAL_SECRET_SPECS: SecretSpec[] = [
  {
    id: 'gemini',
    name: 'Google Gemini Developer API',
    envVar: 'GEMINI_API_KEY',
    category: 'LLM & AI',
    proxyEndpoint: '/api/gemini/chat',
    quotaPolicy: 'SERVER_SIDE_PROXY',
    description: 'Server-side Gemini API key for chat, tool calling, grounding, and multimodal synthesis'
  },
  {
    id: 'all_key',
    name: 'All Key (Universal Fallback API Key)',
    envVar: 'ALL_KEY',
    category: 'LLM & AI',
    proxyEndpoint: '/api/chat',
    quotaPolicy: 'UNIVERSAL_FALLBACK_WHEEL',
    description: 'Universal fallback API key ("all key" / ALL_KEY) automatically activated whenever GEMINI_API_KEY or provider keys are unlinked, missing, or rate-limited'
  },
  {
    id: 'gemini_pool',
    name: 'Gemini Key Rotation Pool (Comma/Newline)',
    envVar: 'GEMINI_API_KEYS',
    category: 'LLM & AI',
    proxyEndpoint: '/api/proxy-wheel/status',
    quotaPolicy: 'PROXY_LOOP_WHEEL',
    description: 'Comma or newline separated pool of Gemini Developer API keys for automatic wheel rotation'
  },
  {
    id: 'openai',
    name: 'OpenAI Native API',
    envVar: 'OPENAI_API_KEY',
    category: 'LLM & AI',
    proxyEndpoint: '/api/v1/chat/completions',
    description: 'OpenAI API key routed into the Proxy Loop Wheel'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek Native API',
    envVar: 'DEEPSEEK_API_KEY',
    category: 'LLM & AI',
    proxyEndpoint: '/api/deepseek/chat',
    description: 'Native DeepSeek R1 and V3 reasoning API key'
  },
  {
    id: 'deepseek_pool',
    name: 'DeepSeek Key Pool',
    envVar: 'DEEPSEEK_API_KEYS',
    category: 'LLM & AI',
    proxyEndpoint: '/api/proxy-wheel/status',
    description: 'Comma or newline separated DeepSeek API key rotation pool'
  },
  {
    id: 'groq',
    name: 'Groq LPU Acceleration',
    envVar: 'GROQ_API_KEY',
    category: 'LLM & AI',
    proxyEndpoint: '/api/groq/chat',
    description: 'Groq LPU inference API key for Llama and Qwen models'
  },
  {
    id: 'groq_pool',
    name: 'Groq Key Pool',
    envVar: 'GROQ_API_KEYS',
    category: 'LLM & AI',
    proxyEndpoint: '/api/proxy-wheel/status',
    description: 'Comma or newline separated Groq API key rotation pool'
  },
  {
    id: 'openrouter',
    name: 'OpenRouter MoE Matrix',
    envVar: 'OPENROUTER_API_KEY',
    category: 'LLM & AI',
    proxyEndpoint: '/api/openrouter/chat',
    description: 'Universal OpenRouter API key for open and frontier models'
  },
  {
    id: 'openrouter_pool',
    name: 'OpenRouter Key Pool',
    envVar: 'OPENROUTER_API_KEYS',
    category: 'LLM & AI',
    proxyEndpoint: '/api/proxy-wheel/status',
    description: 'Comma or newline separated OpenRouter API key rotation pool'
  },
  {
    id: 'custom_proxy_url',
    name: 'Custom OpenAI-Compatible Proxy URL(s)',
    envVar: 'CUSTOM_PROXY_URL',
    category: 'LLM & AI',
    proxyEndpoint: '/api/proxy-wheel/status',
    isPublicEndpoint: true,
    description: 'One or more OpenAI-compatible upstream /v1 proxy base URLs (comma/newline separated)'
  },
  {
    id: 'custom_proxy_key',
    name: 'Custom Proxy Bearer Key',
    envVar: 'CUSTOM_PROXY_KEY',
    category: 'LLM & AI',
    proxyEndpoint: '/api/proxy-wheel/status',
    description: 'Bearer API key sent to configured CUSTOM_PROXY_URL spokes'
  },
  {
    id: 'ollama',
    name: 'Ollama Host Daemon',
    envVar: 'OLLAMA_HOST',
    category: 'LLM & AI',
    proxyEndpoint: '/api/ollama/chat',
    isPublicEndpoint: true,
    description: 'Local or remote Ollama daemon endpoint URL (e.g. http://127.0.0.1:11434)'
  },
  {
    id: 'firebase',
    name: 'Firebase Web / Admin API Key',
    envVar: 'FIREBASE_API_KEY',
    category: 'Database & Storage',
    proxyEndpoint: '/api/health',
    description: 'Firebase project API credential for auth & Firestore synchronization'
  },
  {
    id: 'github',
    name: 'GitHub Personal Access Token',
    envVar: 'GITHUB_TOKEN',
    category: 'Cloud & Search',
    proxyEndpoint: '/api/github/status',
    description: 'Authenticated GitHub API token for live repository & profile telemetry'
  },
  {
    id: 'twilio_sid',
    name: 'Twilio Account SID',
    envVar: 'TWILIO_ACCOUNT_SID',
    category: 'Telecom & eSIM',
    proxyEndpoint: '/api/sim/carrier/status',
    description: 'Twilio Account SID for PSTN numbers and SMS/Voice webhooks'
  },
  {
    id: 'twilio_token',
    name: 'Twilio Auth Token',
    envVar: 'TWILIO_AUTH_TOKEN',
    category: 'Telecom & eSIM',
    proxyEndpoint: '/api/sim/carrier/status',
    description: 'Twilio Auth Token paired with Account SID for authenticated carrier requests'
  },
  {
    id: 'twilio_supersim',
    name: 'Twilio Super SIM Fleet SID',
    envVar: 'TWILIO_SUPERSIM_FLEET_SID',
    category: 'Telecom & eSIM',
    proxyEndpoint: '/api/sim/carrier/status',
    description: 'Twilio Super SIM Fleet SID for hardware eSIM provisioning'
  },
  {
    id: 'telnyx_key',
    name: 'Telnyx Programmable API Key',
    envVar: 'TELNYX_API_KEY',
    category: 'Telecom & eSIM',
    proxyEndpoint: '/api/sim/carrier/status',
    description: 'Telnyx V2 API key for global PSTN DIDs, SMS, and programmable voice'
  },
  {
    id: 'telnyx_messaging',
    name: 'Telnyx Messaging Profile ID',
    envVar: 'TELNYX_MESSAGING_PROFILE_ID',
    category: 'Telecom & eSIM',
    proxyEndpoint: '/api/sim/carrier/status',
    description: 'Telnyx Messaging Profile UUID for inbound/outbound SMS routing'
  },
  {
    id: 'telnyx_sim_group',
    name: 'Telnyx eSIM Group ID',
    envVar: 'TELNYX_SIM_GROUP_ID',
    category: 'Telecom & eSIM',
    proxyEndpoint: '/api/sim/carrier/status',
    description: 'Telnyx SIM Card Group ID for programmatic carrier eSIM orchestration'
  },
  {
    id: 'cdp_api_key_id',
    name: 'Coinbase CDP API Key ID',
    envVar: 'CDP_API_KEY_ID',
    category: 'Cloud & Search',
    proxyEndpoint: '/api/cdp/status',
    description: 'Coinbase Developer Platform Secret API Key ID from portal.cdp.coinbase.com'
  },
  {
    id: 'cdp_api_key_secret',
    name: 'Coinbase CDP API Key Secret',
    envVar: 'CDP_API_KEY_SECRET',
    category: 'Cloud & Search',
    proxyEndpoint: '/api/cdp/status',
    description: 'Coinbase CDP private signing key (ECDSA PEM or Ed25519 base64 secret)'
  },
  {
    id: 'cdp_wallet_secret',
    name: 'Coinbase CDP Wallet Secret',
    envVar: 'CDP_WALLET_SECRET',
    category: 'Cloud & Search',
    proxyEndpoint: '/api/cdp/status',
    description: 'Coinbase CDP Wallet Secret required for creating EVM wallets and signing trades/x402'
  },
  {
    id: 'cdp_env',
    name: 'Coinbase CDP Environment (sandbox | live)',
    envVar: 'CDP_ENV',
    category: 'Cloud & Search',
    proxyEndpoint: '/api/cdp/status',
    isPublicEndpoint: true,
    description: 'Default Coinbase CDP environment mode: sandbox (Base Sepolia) or live (Base/Ethereum Mainnet)'
  }
];

const PROVIDER_TO_ENV: Record<string, string> = {
  gemini: 'GEMINI_API_KEY',
  google: 'GEMINI_API_KEY',
  all_key: 'ALL_KEY',
  'all key': 'ALL_KEY',
  allkey: 'ALL_KEY',
  'all-key': 'ALL_KEY',
  all_keys: 'ALL_KEY',
  api_universal: 'API_UNIVERSAL',
  gemini_pool: 'GEMINI_API_KEYS',
  openai: 'OPENAI_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  deepseek_pool: 'DEEPSEEK_API_KEYS',
  groq: 'GROQ_API_KEY',
  groq_pool: 'GROQ_API_KEYS',
  openrouter: 'OPENROUTER_API_KEY',
  openrouter_pool: 'OPENROUTER_API_KEYS',
  custom_proxy_url: 'CUSTOM_PROXY_URL',
  custom_proxy_key: 'CUSTOM_PROXY_KEY',
  ollama: 'OLLAMA_HOST',
  firebase: 'FIREBASE_API_KEY',
  github: 'GITHUB_TOKEN',
  twilio: 'TWILIO_ACCOUNT_SID',
  twilio_sid: 'TWILIO_ACCOUNT_SID',
  twilio_token: 'TWILIO_AUTH_TOKEN',
  twilio_supersim: 'TWILIO_SUPERSIM_FLEET_SID',
  telnyx: 'TELNYX_API_KEY',
  telnyx_key: 'TELNYX_API_KEY',
  telnyx_messaging: 'TELNYX_MESSAGING_PROFILE_ID',
  cdp_api_key_id: 'CDP_API_KEY_ID',
  cdp_api_key_secret: 'CDP_API_KEY_SECRET',
  cdp_wallet_secret: 'CDP_WALLET_SECRET',
  cdp_env: 'CDP_ENV',
  telnyx_sim_group: 'TELNYX_SIM_GROUP_ID'
};

const SENSITIVE_RELATIVE_PATHS = new Set([
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  'data/.vault.key',
  'data/.secrets.vault.enc',
  '.vault.key',
  '.secrets.vault.enc'
]);

const ENV_KEY_PATTERN = /^[A-Z][A-Z0-9_]{1,95}$/;

const PLACEHOLDER_SECRET_VALUES = new Set([
  'my_gemini_api_key',
  'your_gemini_api_key',
  'your_api_key',
  'your_api_key_here',
  'replace_me',
  'changeme',
  'unlinked',
  'not_linked',
  'not_configured',
  'none',
  'null',
  'undefined',
  'todo'
]);

function isUsableSecretValue(raw: unknown): raw is string {
  if (typeof raw !== 'string') return false;
  const trimmed = raw.trim();
  if (trimmed.length < 8) return false;
  const lower = trimmed.toLowerCase();
  if (PLACEHOLDER_SECRET_VALUES.has(lower)) return false;
  if (/^<[^>]+>$/.test(trimmed)) return false;
  return true;
}

function isNonSecretSystemEnvKey(key: string): boolean {
  if (!key) return true;
  if (/^(?:npm_|YARN_|NODE_|K_|CLOUD_RUN_|VITE_|XDG_|DBUS_|SSH_AUTH_SOCK$|GPG_)/i.test(key)) {
    return true;
  }
  if (
    key === 'LC_ALL' ||
    key === 'LANG' ||
    key === 'LANGUAGE' ||
    key === 'GOOGLE_RUNTIME' ||
    key === 'GOOGLE_CLOUD_PROJECT' ||
    key === 'PATH' ||
    key === 'HOME' ||
    key === 'PWD' ||
    key === 'OLDPWD' ||
    key === 'INIT_CWD' ||
    key === 'SHELL' ||
    key === 'USER' ||
    key === 'LOGNAME' ||
    key === 'HOSTNAME' ||
    key === 'TERM' ||
    key === 'PORT'
  ) {
    return true;
  }
  return /(?:_CWD|_DIR|_PATH|_PATHS|_HOST|_HOSTS|_PORT|_URL|_URLS|_ORIGIN|_DOMAIN|_VERSION|_BIN)$/i.test(key) &&
    key !== 'CUSTOM_PROXY_URL' &&
    key !== 'OLLAMA_HOST';
}

const ALL_KEY_ENV_ALIASES = [
  'ALL_KEY',
  'All_Key',
  'all_key',
  'ALLKEY',
  'AllKey',
  'allkey',
  'ALL_KEYS',
  'ALL_API_KEY',
  'all key',
  'All Key',
  'API_Universal',
  'API_UNIVERSAL',
  'UNIVERSAL_KEY',
  'UNIVERSAL_API_KEY',
  'GOOGLE_API_KEY',
  'API_KEY'
];

const CANONICAL_ENV_SET = new Set(CANONICAL_SECRET_SPECS.map((s) => s.envVar));
const ALL_KEY_LOWER_SET = new Set(ALL_KEY_ENV_ALIASES.map((a) => a.toLowerCase()));

export class InternalSecretsHandler {
  private masterKey: Buffer | null = null;
  private vaultCache: EncryptedVaultFile | null = null;
  private plaintextSecrets = new Map<string, string>();
  private initialEnvKeys = new Set<string>();
  private initialized = false;

  public init(): void {
    if (this.initialized) return;
    fs.mkdirSync(DATA_DIR, { recursive: true });
    this.loadOrCreateMasterKey();
    this.loadVaultFromDisk();

    // Capture only genuine secret / API key / canonical provider env vars (never OS/npm paths like INIT_CWD or SHELL)
    for (const [k, v] of Object.entries(process.env)) {
      if (typeof v !== 'string' || v.trim().length === 0) continue;
      const trimmed = v.trim();
      const isCanonical = CANONICAL_ENV_SET.has(k);
      const isAllKeyAlias = ALL_KEY_LOWER_SET.has(k.trim().toLowerCase());
      if (!isCanonical && !isAllKeyAlias) {
        if (isNonSecretSystemEnvKey(k)) continue;
        if (trimmed.startsWith('/')) continue;
        if (!/(?:SECRET|KEY|TOKEN|PASS|SID|CREDENTIAL|BEARER|PRIVATE|UNIVERSAL)/i.test(k)) continue;
      }
      if (k === 'GEMINI_API_KEY' && !isUsableSecretValue(trimmed)) {
        continue;
      }
      this.initialEnvKeys.add(k);
      this.plaintextSecrets.set(k, trimmed);
    }

    // Decrypt vault entries into memory & hydrate process.env
    if (this.vaultCache && this.masterKey) {
      for (const [envVar, entry] of Object.entries(this.vaultCache.entries)) {
        try {
          const decrypted = this.decryptEntry(entry);
          if (decrypted && isUsableSecretValue(decrypted)) {
            this.plaintextSecrets.set(envVar, decrypted.trim());
            process.env[envVar] = decrypted.trim();
          }
        } catch {
          // Skip corrupted entry cleanly without crashing startup
        }
      }
    }

    this.bridgeUniversalEnvAliases();
    this.initialized = true;
  }

  public collectUniversalFallbackEntries(): Array<{ source: string; value: string }> {
    const found: Array<{ source: string; value: string }> = [];
    const seen = new Set<string>();

    const addEntry = (source: string, raw: unknown) => {
      if (!isUsableSecretValue(raw)) return;
      for (const part of raw.split(/[\r\n,;]+/).map((s) => s.trim()).filter(Boolean)) {
        if (!isUsableSecretValue(part) || seen.has(part)) continue;
        seen.add(part);
        found.push({ source, value: part });
      }
    };

    // 1. Explicit "all key" / ALL_KEY / API_Universal aliases in vault & process.env (in priority order)
    for (const alias of ALL_KEY_ENV_ALIASES) {
      addEntry(alias, this.plaintextSecrets.get(alias) ?? process.env[alias]);
    }

    // 2. Any vault entry whose label or envVar normalizes to "allkey" / "universal"
    if (this.vaultCache) {
      for (const [envVar, entry] of Object.entries(this.vaultCache.entries)) {
        const normName = `${envVar} ${entry.label || ''}`.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normName.includes('allkey') || normName.includes('universalkey') || normName.includes('apiuniversal')) {
          addEntry(envVar, this.plaintextSecrets.get(envVar) ?? process.env[envVar]);
        }
      }
    }

    // 3. Case-insensitive scan of process.env for any variant of "all key" / "all_key" / custom AIza... key
    for (const [k, v] of Object.entries(process.env)) {
      if (k === 'GEMINI_API_KEY' || k === 'FIREBASE_API_KEY' || k.startsWith('VITE_FIREBASE')) continue;
      const normKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normKey === 'allkey' || normKey === 'allkeys' || normKey === 'allapikey' || normKey === 'apiuniversal') {
        addEntry(k, v);
      } else if (typeof v === 'string' && /^AIza[0-9A-Za-z\-_]{25,}$/.test(v.trim())) {
        addEntry(k, v);
      }
    }

    return found;
  }

  private bridgeUniversalEnvAliases(): void {
    const universalEntries = this.collectUniversalFallbackEntries();

    // Populate canonical ALL_KEY in memory if provided under a case/space alias like "All_Key" or "all key"
    if (!isUsableSecretValue(this.plaintextSecrets.get('ALL_KEY'))) {
      const explicitAllKey = universalEntries.find((e) =>
        e.source.toLowerCase().replace(/[^a-z0-9]/g, '').startsWith('all')
      );
      if (explicitAllKey) {
        this.plaintextSecrets.set('ALL_KEY', explicitAllKey.value);
        if (!isUsableSecretValue(process.env.ALL_KEY)) {
          process.env.ALL_KEY = explicitAllKey.value;
        }
      }
    }

    const currentGemini = this.plaintextSecrets.get('GEMINI_API_KEY') ?? process.env.GEMINI_API_KEY;
    const geminiLinked = isUsableSecretValue(currentGemini);

    for (const { value: candidate } of universalEntries) {
      if (candidate.startsWith('sk-or-')) {
        if (!isUsableSecretValue(this.plaintextSecrets.get('OPENROUTER_API_KEY'))) {
          this.plaintextSecrets.set('OPENROUTER_API_KEY', candidate);
        }
        if (!isUsableSecretValue(process.env.OPENROUTER_API_KEY)) {
          process.env.OPENROUTER_API_KEY = candidate;
        }
      } else if (candidate.startsWith('gsk_')) {
        if (!isUsableSecretValue(this.plaintextSecrets.get('GROQ_API_KEY'))) {
          this.plaintextSecrets.set('GROQ_API_KEY', candidate);
        }
        if (!isUsableSecretValue(process.env.GROQ_API_KEY)) {
          process.env.GROQ_API_KEY = candidate;
        }
      } else if (candidate.startsWith('sk-')) {
        if (!isUsableSecretValue(this.plaintextSecrets.get('OPENAI_API_KEY'))) {
          this.plaintextSecrets.set('OPENAI_API_KEY', candidate);
        }
        if (!isUsableSecretValue(process.env.OPENAI_API_KEY)) {
          process.env.OPENAI_API_KEY = candidate;
        }
      } else {
        // AIza..., AQ...., or custom Gemini-compatible key: activate immediately if GEMINI_API_KEY isn't linked
        if (!geminiLinked && !isUsableSecretValue(this.plaintextSecrets.get('GEMINI_API_KEY'))) {
          this.plaintextSecrets.set('GEMINI_API_KEY', candidate);
        }
        if (!isUsableSecretValue(process.env.GEMINI_API_KEY)) {
          process.env.GEMINI_API_KEY = candidate;
        }
      }
    }
  }

  private ensureInit(): void {
    if (!this.initialized) this.init();
  }

  private loadOrCreateMasterKey(): void {
    if (this.masterKey) return;
    if (fs.existsSync(VAULT_KEY_PATH)) {
      const hex = fs.readFileSync(VAULT_KEY_PATH, 'utf-8').trim();
      const buf = Buffer.from(hex, 'hex');
      if (buf.length === 32) {
        this.masterKey = buf;
        try { fs.chmodSync(VAULT_KEY_PATH, 0o600); } catch {}
        return;
      }
    }
    const freshKey = crypto.randomBytes(32);
    const tmpKey = `${VAULT_KEY_PATH}.tmp-${process.pid}-${Date.now()}`;
    fs.writeFileSync(tmpKey, freshKey.toString('hex'), { mode: 0o600 });
    fs.renameSync(tmpKey, VAULT_KEY_PATH);
    try { fs.chmodSync(VAULT_KEY_PATH, 0o600); } catch {}
    this.masterKey = freshKey;
  }

  private loadVaultFromDisk(): void {
    if (fs.existsSync(VAULT_ENC_PATH)) {
      try {
        const raw = fs.readFileSync(VAULT_ENC_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.entries && typeof parsed.entries === 'object') {
          this.vaultCache = parsed as EncryptedVaultFile;
          return;
        }
      } catch {
        // Fall through to empty vault
      }
    }
    this.vaultCache = {
      version: 1,
      algorithm: 'aes-256-gcm',
      updatedAt: new Date().toISOString(),
      entries: {}
    };
  }

  private persistVaultAtomic(): void {
    if (!this.vaultCache) return;
    fs.mkdirSync(DATA_DIR, { recursive: true });
    this.vaultCache.updatedAt = new Date().toISOString();
    const tmpPath = `${VAULT_ENC_PATH}.tmp-${process.pid}-${Date.now()}`;
    fs.writeFileSync(tmpPath, JSON.stringify(this.vaultCache, null, 2), { mode: 0o600 });
    fs.renameSync(tmpPath, VAULT_ENC_PATH);
    try { fs.chmodSync(VAULT_ENC_PATH, 0o600); } catch {}
  }

  private encryptValue(plaintext: string, meta?: { label?: string; category?: SecretSpec['category']; description?: string }): VaultEntry {
    this.loadOrCreateMasterKey();
    if (!this.masterKey) throw new Error('Vault master key unavailable');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      ciphertext: encrypted.toString('hex'),
      updatedAt: new Date().toISOString(),
      ...(meta?.label ? { label: meta.label } : {}),
      ...(meta?.category ? { category: meta.category } : {}),
      ...(meta?.description ? { description: meta.description } : {})
    };
  }

  private decryptEntry(entry: VaultEntry): string {
    if (!this.masterKey) return '';
    const iv = Buffer.from(entry.iv, 'hex');
    const tag = Buffer.from(entry.tag, 'hex');
    const ciphertext = Buffer.from(entry.ciphertext, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }

  public resolveEnvVarName(keyOrProvider: string): string {
    const trimmed = String(keyOrProvider || '').trim();
    const lower = trimmed.toLowerCase();
    if (PROVIDER_TO_ENV[lower]) return PROVIDER_TO_ENV[lower];
    const upper = trimmed.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    return upper;
  }

  public maskSecret(value?: string | null, opts?: { isPublicEndpoint?: boolean }): string {
    if (!value || !value.trim()) return 'Not Configured';
    const v = value.trim();

    if (opts?.isPublicEndpoint) {
      // Mask embedded credentials if URL has user:pass@, otherwise return host cleanly
      try {
        const parsed = new URL(v);
        if (parsed.username || parsed.password) {
          parsed.username = '***';
          parsed.password = '***';
          return parsed.toString();
        }
        return parsed.toString().replace(/\/$/, '');
      } catch {
        return v;
      }
    }

    if (v.length <= 4) return '••••';
    if (v.length <= 10) return `${v.slice(0, 2)}••••${v.slice(-2)}`;
    const prefixLen = Math.min(4, Math.floor(v.length / 4));
    const suffixLen = Math.min(4, Math.floor(v.length / 4));
    const hiddenCount = Math.max(6, Math.min(16, v.length - prefixLen - suffixLen));
    return `${v.slice(0, prefixLen)}${'•'.repeat(hiddenCount)}${v.slice(-suffixLen)}`;
  }

  public fingerprintSecret(value?: string | null): string | null {
    if (!value || !value.trim()) return null;
    return `sha256:${crypto.createHash('sha256').update(value.trim()).digest('hex').slice(0, 12)}`;
  }

  public getSecret(envVarOrProvider: string): string | undefined {
    this.ensureInit();
    const envVar = this.resolveEnvVarName(envVarOrProvider);
    let val = this.plaintextSecrets.get(envVar) ?? process.env[envVar];
    if (!isUsableSecretValue(val)) {
      this.bridgeUniversalEnvAliases();
      val = this.plaintextSecrets.get(envVar) ?? process.env[envVar];
      if (!isUsableSecretValue(val) && envVar === 'ALL_KEY') {
        const anyUniversal = this.collectUniversalFallbackEntries()[0];
        if (anyUniversal) val = anyUniversal.value;
      }
      if (!isUsableSecretValue(val) && envVar === 'GEMINI_API_KEY') {
        const geminiFallback = this.collectUniversalFallbackEntries().find(
          (e) => !e.value.startsWith('sk-') && !e.value.startsWith('gsk_')
        );
        if (geminiFallback) val = geminiFallback.value;
      }
    }
    return isUsableSecretValue(val) ? val.trim() : undefined;
  }

  public getSecretPool(
    primaryEnvVar: string,
    poolEnvVar?: string,
    numberedPrefix?: string,
    opts?: { isPublicEndpoint?: boolean }
  ): Array<{ slot: string; masked: string; value: string; envSource: string }> {
    this.ensureInit();
    const seenValues = new Set<string>();
    const results: Array<{ slot: string; masked: string; value: string; envSource: string }> = [];

    const pushCandidate = (raw: string | undefined, envSource: string) => {
      if (!raw || typeof raw !== 'string') return;
      const parts = raw
        .split(/[\r\n,;]+/)
        .map((s) => s.trim())
        .filter((s) => (opts?.isPublicEndpoint ? s.length > 0 : isUsableSecretValue(s)));
      for (const item of parts) {
        if (seenValues.has(item)) continue;
        seenValues.add(item);
        results.push({
          slot: `slot-${results.length}`,
          masked: this.maskSecret(item, opts),
          value: item,
          envSource
        });
      }
    };

    pushCandidate(this.getSecret(primaryEnvVar), primaryEnvVar);
    if (poolEnvVar) {
      pushCandidate(this.getSecret(poolEnvVar), poolEnvVar);
    }
    const prefix = numberedPrefix || `${primaryEnvVar}_`;
    for (let i = 1; i <= 12; i++) {
      const k = `${prefix}${i}`;
      pushCandidate(this.getSecret(k), k);
    }

    // Automatically append "all key" (ALL_KEY) and universal fallback keys into the active provider wheel pool
    // so if GEMINI_API_KEY isn't linked, expires, or returns 401/403/429, ALL_KEY seamlessly takes over!
    if (!opts?.isPublicEndpoint) {
      const universalFallbacks = this.collectUniversalFallbackEntries();
      for (const fb of universalFallbacks) {
        if (primaryEnvVar === 'GEMINI_API_KEY') {
          if (!fb.value.startsWith('sk-') && !fb.value.startsWith('gsk_')) {
            pushCandidate(fb.value, fb.source);
          }
        } else if (primaryEnvVar === 'OPENROUTER_API_KEY') {
          if (fb.value.startsWith('sk-or-')) {
            pushCandidate(fb.value, fb.source);
          }
        } else if (primaryEnvVar === 'GROQ_API_KEY') {
          if (fb.value.startsWith('gsk_')) {
            pushCandidate(fb.value, fb.source);
          }
        } else if (primaryEnvVar === 'OPENAI_API_KEY' || primaryEnvVar === 'DEEPSEEK_API_KEY') {
          if (fb.value.startsWith('sk-') && !fb.value.startsWith('sk-or-')) {
            pushCandidate(fb.value, fb.source);
          }
        }
      }
    }

    return results;
  }

  public setSecret(
    envVarOrProvider: string,
    rawValue: string,
    meta?: { label?: string; category?: SecretSpec['category']; description?: string }
  ): SecretTelemetry {
    this.ensureInit();
    const envVar = this.resolveEnvVarName(envVarOrProvider);
    if (!ENV_KEY_PATTERN.test(envVar)) {
      throw new Error(`Invalid environment variable name "${envVar}". Use uppercase letters, digits, and underscores (2-96 chars).`);
    }
    const cleanVal = String(rawValue ?? '').trim();
    if (!cleanVal) {
      throw new Error(`Secret value for ${envVar} cannot be empty. Use DELETE to remove a secret.`);
    }

    const entry = this.encryptValue(cleanVal, meta);
    if (!this.vaultCache) this.loadVaultFromDisk();
    this.vaultCache!.entries[envVar] = entry;
    this.persistVaultAtomic();

    this.plaintextSecrets.set(envVar, cleanVal);
    process.env[envVar] = cleanVal;
    this.bridgeUniversalEnvAliases();

    return this.getTelemetryForEnvVar(envVar);
  }

  public deleteSecret(envVarOrProvider: string): { deleted: boolean; envVar: string } {
    this.ensureInit();
    const envVar = this.resolveEnvVarName(envVarOrProvider);
    let existed = false;
    if (this.vaultCache && this.vaultCache.entries[envVar]) {
      delete this.vaultCache.entries[envVar];
      this.persistVaultAtomic();
      existed = true;
    }
    if (this.plaintextSecrets.has(envVar)) {
      this.plaintextSecrets.delete(envVar);
      existed = true;
    }
    if (process.env[envVar] !== undefined) {
      delete process.env[envVar];
      existed = true;
    }
    return { deleted: existed, envVar };
  }

  public isSensitivePath(relOrAbsPath: string): boolean {
    const normalized = String(relOrAbsPath || '').replace(/\\/g, '/').replace(/^\/+/, '');
    const base = path.posix.basename(normalized);
    if (SENSITIVE_RELATIVE_PATHS.has(normalized) || SENSITIVE_RELATIVE_PATHS.has(base)) {
      return true;
    }
    if (/^\.env(\..+)?$/i.test(base) && base !== '.env.example') {
      return true;
    }
    if (base.endsWith('.pem') || base.endsWith('.key') || base === '.vault.key' || base === '.secrets.vault.enc') {
      return true;
    }
    return false;
  }

  public redactText(input: string): string {
    this.ensureInit();
    if (!input || typeof input !== 'string') return input;
    let out = input;

    // 1. Scrub all live secret values >= 6 chars currently tracked (including pooled sub-keys)
    const entries: Array<[string, string]> = [];
    const pushSecretForRedaction = (envVar: string, rawVal: string | undefined) => {
      if (!rawVal) return;
      const spec = CANONICAL_SECRET_SPECS.find(s => s.envVar === envVar);
      if (spec?.isPublicEndpoint) return;
      if (rawVal.length >= 6) entries.push([envVar, rawVal]);
      if (envVar.endsWith('_KEYS') || rawVal.includes(',') || rawVal.includes('\n')) {
        for (const sub of rawVal.split(/[\r\n,;]+/).map(s => s.trim()).filter(s => s.length >= 6)) {
          entries.push([envVar, sub]);
        }
      }
    };
    for (const [envVar, val] of this.plaintextSecrets.entries()) {
      pushSecretForRedaction(envVar, val);
    }
    for (const spec of CANONICAL_SECRET_SPECS) {
      pushSecretForRedaction(spec.envVar, process.env[spec.envVar]);
    }

    // Replace longest secrets first to prevent partial remnants
    entries.sort((a, b) => b[1].length - a[1].length);
    for (const [envVar, secretVal] of entries) {
      if (out.includes(secretVal)) {
        out = out.split(secretVal).join(`[REDACTED:${envVar}]`);
      }
    }

    // 2. Scrub recognizable token shapes even if external to vault
    out = out
      .replace(/AIza[0-9A-Za-z\-_]{25,}/g, '[REDACTED:GOOGLE_API_KEY]')
      .replace(/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g, '[REDACTED:GITHUB_TOKEN]')
      .replace(/\bgithub_pat_[A-Za-z0-9_]{20,}\b/g, '[REDACTED:GITHUB_TOKEN]')
      .replace(/\bsk-(?:or-v1-|proj-)?[A-Za-z0-9\-_]{20,}\b/g, '[REDACTED:API_KEY]')
      .replace(/\bgsk_[A-Za-z0-9]{20,}\b/g, '[REDACTED:GROQ_API_KEY]')
      .replace(/\bKEY[A-Za-z0-9_]{24,}\b/g, '[REDACTED:TELNYX_KEY]');

    return out;
  }

  public redactObject<T>(value: T): T {
    if (typeof value === 'string') {
      return this.redactText(value) as unknown as T;
    }
    if (Array.isArray(value)) {
      return value.map(item => this.redactObject(item)) as unknown as T;
    }
    if (value && typeof value === 'object') {
      const result: Record<string, any> = {};
      for (const [k, v] of Object.entries(value as Record<string, any>)) {
        result[k] = this.redactObject(v);
      }
      return result as T;
    }
    return value;
  }

  public getTelemetryForEnvVar(envVar: string): SecretTelemetry {
    this.ensureInit();
    const spec = CANONICAL_SECRET_SPECS.find(s => s.envVar === envVar);
    const vaultEntry = this.vaultCache?.entries[envVar];
    const currentValue = this.getSecret(envVar);
    const configured = !!currentValue;
    const source: SecretTelemetry['source'] = !configured
      ? 'unset'
      : vaultEntry
        ? 'vault'
        : 'env';

    return {
      id: spec?.id || `custom_${envVar.toLowerCase()}`,
      name: spec?.name || vaultEntry?.label || envVar,
      envVar,
      category: spec?.category || vaultEntry?.category || 'Custom',
      status: configured ? 'INJECTED' : 'NOT_CONFIGURED',
      configured,
      source,
      maskedValue: configured ? this.maskSecret(currentValue, { isPublicEndpoint: spec?.isPublicEndpoint }) : 'Not Configured',
      fingerprint: configured ? this.fingerprintSecret(currentValue) : null,
      length: configured ? currentValue!.length : 0,
      proxyEndpoint: spec?.proxyEndpoint || '/api/secrets',
      description: spec?.description || vaultEntry?.description || `Encrypted custom environment secret (${envVar})`,
      ...(spec?.quotaPolicy ? { quotaPolicy: spec.quotaPolicy } : {}),
      ...(vaultEntry?.updatedAt ? { updatedAt: vaultEntry.updatedAt } : {})
    };
  }

  public listSecretTelemetry(): SecretTelemetry[] {
    this.ensureInit();
    const seen = new Set<string>();
    const list: SecretTelemetry[] = [];

    for (const spec of CANONICAL_SECRET_SPECS) {
      seen.add(spec.envVar);
      list.push(this.getTelemetryForEnvVar(spec.envVar));
    }

    if (this.vaultCache) {
      for (const envVar of Object.keys(this.vaultCache.entries)) {
        if (!seen.has(envVar)) {
          seen.add(envVar);
          list.push(this.getTelemetryForEnvVar(envVar));
        }
      }
    }

    for (const envKey of this.initialEnvKeys) {
      const resolved = this.resolveEnvVarName(envKey);
      if (!seen.has(envKey) && !seen.has(resolved) && /KEY|SECRET|TOKEN|UNIVERSAL/i.test(envKey)) {
        seen.add(envKey);
        list.push(this.getTelemetryForEnvVar(envKey));
      }
    }

    return list;
  }

  public getVaultHealth() {
    this.ensureInit();
    const all = this.listSecretTelemetry();
    return {
      algorithm: 'AES-256-GCM',
      vaultFileExists: fs.existsSync(VAULT_ENC_PATH),
      masterKeyProtected: fs.existsSync(VAULT_KEY_PATH),
      totalTracked: all.length,
      configuredCount: all.filter(s => s.configured).length,
      vaultStoredCount: all.filter(s => s.source === 'vault').length,
      envInjectedCount: all.filter(s => s.source === 'env').length
    };
  }
}

export const internalSecretsHandler = new InternalSecretsHandler();
