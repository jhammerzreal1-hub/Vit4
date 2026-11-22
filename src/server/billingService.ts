/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Sovereign Monetization & Billing Engine
 * Real Fiat Checkout (Stripe API + HMAC-SHA256 Webhook Verification) &
 * Real On-Chain EVM Crypto Settlement Verification (USDC & ETH via JSON-RPC)
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type {
  AuthUserPublic,
  BillingConfigPublic,
  BillingLedgerRecord,
  CryptoPaymentInvoice,
  SupporterBoardEntry,
  SupporterBoardSummary,
  SupporterFeedbackSentiment,
  SupportedBillingChain,
  SupportedBillingCryptoToken,
  TierBadgeColor,
  UserTierDefinition
} from '../types/auth';
import { internalSecretsHandler } from './internalSecretsHandler';

interface ChainMeta {
  chain: SupportedBillingChain;
  chainId: number;
  label: string;
  usdcContract: string;
  usdcDecimals: number;
  rpcUrls: string[];
  explorerTxBase: string;
}

export const BILLING_CHAIN_REGISTRY: Record<SupportedBillingChain, ChainMeta> = {
  base: {
    chain: 'base',
    chainId: 8453,
    label: 'Base Mainnet',
    usdcContract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    usdcDecimals: 6,
    rpcUrls: ['https://mainnet.base.org', 'https://base.llamarpc.com', 'https://1rpc.io/base'],
    explorerTxBase: 'https://basescan.org/tx/'
  },
  ethereum: {
    chain: 'ethereum',
    chainId: 1,
    label: 'Ethereum Mainnet',
    usdcContract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    usdcDecimals: 6,
    rpcUrls: ['https://eth.llamarpc.com', 'https://rpc.ankr.com/eth', 'https://1rpc.io/eth'],
    explorerTxBase: 'https://etherscan.io/tx/'
  },
  polygon: {
    chain: 'polygon',
    chainId: 137,
    label: 'Polygon PoS',
    usdcContract: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    usdcDecimals: 6,
    rpcUrls: ['https://polygon-rpc.com', 'https://polygon.llamarpc.com', 'https://1rpc.io/matic'],
    explorerTxBase: 'https://polygonscan.com/tx/'
  },
  arbitrum: {
    chain: 'arbitrum',
    chainId: 42161,
    label: 'Arbitrum One',
    usdcContract: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    usdcDecimals: 6,
    rpcUrls: ['https://arb1.arbitrum.io/rpc', 'https://arbitrum.llamarpc.com', 'https://1rpc.io/arb'],
    explorerTxBase: 'https://arbiscan.io/tx/'
  },
  'base-sepolia': {
    chain: 'base-sepolia',
    chainId: 84532,
    label: 'Base Sepolia (Testnet)',
    usdcContract: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    usdcDecimals: 6,
    rpcUrls: ['https://sepolia.base.org', 'https://base-sepolia-rpc.publicnode.com'],
    explorerTxBase: 'https://sepolia.basescan.org/tx/'
  }
};

const ERC20_TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

interface BillingConfigStore {
  version: number;
  fiatStripeEnabled: boolean;
  cryptoEnabled: boolean;
  treasuryEvmAddress: string;
  enabledChains: SupportedBillingChain[];
  enabledTokens: SupportedBillingCryptoToken[];
  updatedAt: string;
}

interface StripeSubscriptionBinding {
  userId: string;
  tierId: string;
  sessionId: string;
  billingCycle: 'monthly' | 'one-time';
  paymentIntentId?: string;
}

interface BillingLedgerStore {
  version: number;
  invoices: CryptoPaymentInvoice[];
  records: BillingLedgerRecord[];
  redeemedTxHashes: string[];
  settledStripeSessionIds: string[];
  processedStripeEventIds: string[];
  stripeSubscriptions: Record<string, StripeSubscriptionBinding>;
  updatedAt: string;
}

interface StoredSupporterBoardEntry extends SupporterBoardEntry {
  _userId?: string | null;
}

interface SupporterBoardStore {
  version: number;
  entries: StoredSupporterBoardEntry[];
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIG_PATH = path.join(DATA_DIR, 'billing_config.json');
const LEDGER_PATH = path.join(DATA_DIR, 'billing_ledger.json');
const SUPPORTER_BOARD_PATH = path.join(DATA_DIR, 'supporter_board.json');
const INVOICE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const EVM_TX_HASH_RE = /^0x[a-fA-F0-9]{64}$/;

const VALID_FEEDBACK_SENTIMENTS = new Set<SupporterFeedbackSentiment>(['praise', 'critique', 'suggestion', 'note']);

function sanitizeFeedbackSentiment(raw: unknown): SupporterFeedbackSentiment {
  const s = String(raw || '').trim().toLowerCase() as SupporterFeedbackSentiment;
  return VALID_FEEDBACK_SENTIMENTS.has(s) ? s : 'note';
}

function sanitizeBoardText(raw: unknown, maxLen: number): string {
  return String(raw || '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
    .slice(0, maxLen);
}

function readSupporterBoard(): SupporterBoardStore {
  if (!fs.existsSync(SUPPORTER_BOARD_PATH)) {
    const fresh: SupporterBoardStore = {
      version: 1,
      entries: [],
      updatedAt: new Date().toISOString()
    };
    atomicWriteJson(SUPPORTER_BOARD_PATH, fresh);
    return fresh;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(SUPPORTER_BOARD_PATH, 'utf8')) as Partial<SupporterBoardStore>;
    return {
      version: 1,
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      updatedAt: parsed.updatedAt || new Date().toISOString()
    };
  } catch {
    return { version: 1, entries: [], updatedAt: new Date().toISOString() };
  }
}

function writeSupporterBoard(board: SupporterBoardStore): void {
  board.updatedAt = new Date().toISOString();
  if (board.entries.length > 2000) {
    board.entries = board.entries.slice(-2000);
  }
  atomicWriteJson(SUPPORTER_BOARD_PATH, board);
}

function toPublicBoardEntry(entry: StoredSupporterBoardEntry, viewerUserId?: string): SupporterBoardEntry {
  const { _userId, ...rest } = entry;
  const isOwner = Boolean(viewerUserId && _userId && _userId === viewerUserId);
  return {
    ...rest,
    authorDisplayName: rest.isAnonymous ? 'Anonymous Backer' : rest.authorDisplayName || 'Project Backer',
    isOwnEntry: isOwner
  };
}

function atomicWriteJson(filePath: string, payload: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
  const tmpPath = `${filePath}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2), { mode: 0o600 });
  fs.renameSync(tmpPath, filePath);
}

function getStripeSecretKey(): string {
  return (internalSecretsHandler.getSecret('STRIPE_SECRET_KEY') || process.env.STRIPE_SECRET_KEY || '').trim();
}

function getStripeWebhookSecret(): string {
  return (internalSecretsHandler.getSecret('STRIPE_WEBHOOK_SECRET') || process.env.STRIPE_WEBHOOK_SECRET || '').trim();
}

function getEnvTreasuryAddress(): string {
  return (
    internalSecretsHandler.getSecret('BILLING_TREASURY_EVM_ADDRESS') ||
    process.env.BILLING_TREASURY_EVM_ADDRESS ||
    ''
  ).trim();
}

function defaultConfig(): BillingConfigStore {
  const envTreasury = getEnvTreasuryAddress();
  const validTreasury = EVM_ADDRESS_RE.test(envTreasury) ? envTreasury : '';
  return {
    version: 1,
    fiatStripeEnabled: Boolean(getStripeSecretKey()),
    cryptoEnabled: Boolean(validTreasury),
    treasuryEvmAddress: validTreasury,
    enabledChains: ['base', 'ethereum', 'polygon', 'arbitrum'],
    enabledTokens: ['USDC', 'ETH'],
    updatedAt: new Date().toISOString()
  };
}

function readConfig(): BillingConfigStore {
  if (!fs.existsSync(CONFIG_PATH)) {
    const cfg = defaultConfig();
    atomicWriteJson(CONFIG_PATH, cfg);
    return cfg;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) as Partial<BillingConfigStore>;
    const fallback = defaultConfig();
    const treasury =
      parsed.treasuryEvmAddress && EVM_ADDRESS_RE.test(parsed.treasuryEvmAddress)
        ? parsed.treasuryEvmAddress
        : fallback.treasuryEvmAddress;
    const validChains = (Array.isArray(parsed.enabledChains) ? parsed.enabledChains : fallback.enabledChains).filter(
      (c): c is SupportedBillingChain => c in BILLING_CHAIN_REGISTRY
    );
    const validTokens = (Array.isArray(parsed.enabledTokens) ? parsed.enabledTokens : fallback.enabledTokens).filter(
      (t): t is SupportedBillingCryptoToken => t === 'USDC' || t === 'ETH'
    );
    return {
      version: 1,
      fiatStripeEnabled:
        typeof parsed.fiatStripeEnabled === 'boolean' ? parsed.fiatStripeEnabled : fallback.fiatStripeEnabled,
      cryptoEnabled: typeof parsed.cryptoEnabled === 'boolean' ? parsed.cryptoEnabled : Boolean(treasury),
      treasuryEvmAddress: treasury,
      enabledChains: validChains.length > 0 ? validChains : ['base', 'ethereum', 'polygon', 'arbitrum'],
      enabledTokens: validTokens.length > 0 ? validTokens : ['USDC', 'ETH'],
      updatedAt: parsed.updatedAt || new Date().toISOString()
    };
  } catch {
    return defaultConfig();
  }
}

function readLedger(): BillingLedgerStore {
  if (!fs.existsSync(LEDGER_PATH)) {
    const fresh: BillingLedgerStore = {
      version: 2,
      invoices: [],
      records: [],
      redeemedTxHashes: [],
      settledStripeSessionIds: [],
      processedStripeEventIds: [],
      stripeSubscriptions: {},
      updatedAt: new Date().toISOString()
    };
    atomicWriteJson(LEDGER_PATH, fresh);
    return fresh;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8')) as Partial<BillingLedgerStore>;
    return {
      version: 2,
      invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
      records: Array.isArray(parsed.records) ? parsed.records : [],
      redeemedTxHashes: Array.isArray(parsed.redeemedTxHashes) ? parsed.redeemedTxHashes : [],
      settledStripeSessionIds: Array.isArray(parsed.settledStripeSessionIds) ? parsed.settledStripeSessionIds : [],
      processedStripeEventIds: Array.isArray(parsed.processedStripeEventIds) ? parsed.processedStripeEventIds : [],
      stripeSubscriptions:
        parsed.stripeSubscriptions && typeof parsed.stripeSubscriptions === 'object' ? parsed.stripeSubscriptions : {},
      updatedAt: parsed.updatedAt || new Date().toISOString()
    };
  } catch {
    return {
      version: 2,
      invoices: [],
      records: [],
      redeemedTxHashes: [],
      settledStripeSessionIds: [],
      processedStripeEventIds: [],
      stripeSubscriptions: {},
      updatedAt: new Date().toISOString()
    };
  }
}

function writeLedger(ledger: BillingLedgerStore): void {
  ledger.updatedAt = new Date().toISOString();
  if (ledger.invoices.length > 500) {
    ledger.invoices = ledger.invoices.slice(-500);
  }
  if (ledger.records.length > 1000) {
    ledger.records = ledger.records.slice(-1000);
  }
  if (ledger.processedStripeEventIds.length > 1000) {
    ledger.processedStripeEventIds = ledger.processedStripeEventIds.slice(-1000);
  }
  atomicWriteJson(LEDGER_PATH, ledger);
}

async function fetchLiveEthSpotUsd(): Promise<number> {
  try {
    const resp = await fetch('https://api.coinbase.com/v2/prices/ETH-USD/spot', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(7000)
    });
    if (resp.ok) {
      const data = (await resp.json()) as { data?: { amount?: string } };
      const parsed = Number(data?.data?.amount);
      if (Number.isFinite(parsed) && parsed > 100) return parsed;
    }
  } catch {
    // Fallback below
  }

  try {
    const resp = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(7000)
    });
    if (resp.ok) {
      const data = (await resp.json()) as { ethereum?: { usd?: number } };
      const parsed = Number(data?.ethereum?.usd);
      if (Number.isFinite(parsed) && parsed > 100) return parsed;
    }
  } catch {
    // Throw below
  }

  throw new Error('Unable to fetch live ETH/USD spot price right now. Please retry or pay with USDC.');
}

async function jsonRpcCall(rpcUrls: string[], method: string, params: unknown[]): Promise<any> {
  let lastError = 'RPC unavailable';
  for (const url of rpcUrls) {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal: AbortSignal.timeout(10000)
      });
      if (!resp.ok) {
        lastError = `HTTP ${resp.status} from ${url}`;
        continue;
      }
      const json = (await resp.json()) as { result?: any; error?: { message?: string } };
      if (json.error) {
        lastError = json.error.message || 'RPC error';
        continue;
      }
      return json.result;
    } catch (err: any) {
      lastError = err?.message || 'RPC timeout';
    }
  }
  throw new Error(`Blockchain RPC verification failed: ${lastError}`);
}

function parseHexBigInt(hexValue: unknown): bigint {
  if (typeof hexValue !== 'string' || !hexValue.startsWith('0x')) return 0n;
  try {
    return BigInt(hexValue);
  } catch {
    return 0n;
  }
}

function normalizeEvmAddress(addr: unknown): string {
  if (typeof addr !== 'string') return '';
  return addr.trim().toLowerCase();
}

function normalizeTopicAddress(topic: unknown): string {
  if (typeof topic !== 'string' || !topic.startsWith('0x') || topic.length < 42) return '';
  return `0x${topic.slice(-40).toLowerCase()}`;
}

function computeTierExpiry(billingCycle: 'monthly' | 'one-time'): {
  subscriptionStatus: 'active' | 'lifetime';
  tierExpiresAt: string | null;
} {
  if (billingCycle === 'one-time') {
    return { subscriptionStatus: 'lifetime', tierExpiresAt: null };
  }
  const expires = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);
  return { subscriptionStatus: 'active', tierExpiresAt: expires.toISOString() };
}

function assertBillingCycleAllowed(tier: UserTierDefinition, billingCycle: 'monthly' | 'one-time'): void {
  const mode = tier.pricing.billingMode;
  if (!tier.isMonetized || mode === 'free') {
    throw new Error(`Tier "${tier.name}" is free and does not require checkout.`);
  }
  if (billingCycle === 'monthly' && mode === 'one-time') {
    throw new Error(`Tier "${tier.name}" is only available as a one-time lifetime unlock.`);
  }
  if (billingCycle === 'one-time' && mode === 'monthly') {
    throw new Error(`Tier "${tier.name}" is only available as a monthly subscription.`);
  }
}

function buildEip681Uri(params: {
  chainId: number;
  treasuryAddress: string;
  token: SupportedBillingCryptoToken;
  tokenContractAddress: string | null;
  expectedAmountUnits: bigint;
}): string {
  if (params.token === 'ETH' || !params.tokenContractAddress) {
    return `ethereum:${params.treasuryAddress}@${params.chainId}?value=${params.expectedAmountUnits.toString()}`;
  }
  return `ethereum:${params.tokenContractAddress}@${params.chainId}/transfer?address=${params.treasuryAddress}&uint256=${params.expectedAmountUnits.toString()}`;
}

export type StripeWebhookLifecycleResult =
  | {
      action: 'grant';
      eventId: string;
      eventType: string;
      settlement: {
        entryType: 'tier' | 'donation';
        alreadySettled: boolean;
        userId: string;
        username: string;
        tierId: string;
        tierName: string;
        billingCycle: 'monthly' | 'one-time';
        amountUsd: number;
        subscriptionStatus: 'active' | 'lifetime';
        tierExpiresAt: string | null;
        record: BillingLedgerRecord;
        supporterEntry?: SupporterBoardEntry;
      };
    }
  | {
      action: 'downgrade';
      eventId: string;
      eventType: string;
      userId: string;
      reason: string;
      subscriptionStatus: 'expired' | 'free';
    }
  | {
      action: 'noop';
      eventId: string;
      eventType: string;
    };

class BillingService {
  private inFlightTxHashes = new Set<string>();
  private inFlightInvoiceIds = new Set<string>();
  private inFlightStripeSessionIds = new Set<string>();
  private inFlightStripeEventIds = new Set<string>();

  getPublicConfig(): BillingConfigPublic {
    const cfg = readConfig();
    const stripeSecretConfigured = Boolean(getStripeSecretKey());
    const stripeWebhookSecretConfigured = Boolean(getStripeWebhookSecret());
    return {
      fiatStripeEnabled: Boolean(cfg.fiatStripeEnabled && stripeSecretConfigured),
      stripeSecretConfigured,
      stripeWebhookSecretConfigured,
      cryptoEnabled: Boolean(cfg.cryptoEnabled && EVM_ADDRESS_RE.test(cfg.treasuryEvmAddress)),
      treasuryEvmAddress: cfg.treasuryEvmAddress,
      enabledChains: cfg.enabledChains,
      enabledTokens: cfg.enabledTokens,
      updatedAt: cfg.updatedAt
    };
  }

  updateConfig(input: {
    fiatStripeEnabled?: boolean;
    cryptoEnabled?: boolean;
    treasuryEvmAddress?: string;
    enabledChains?: SupportedBillingChain[];
    enabledTokens?: SupportedBillingCryptoToken[];
    stripeSecretKey?: string;
    stripeWebhookSecret?: string;
  }): BillingConfigPublic {
    const cfg = readConfig();

    if (typeof input.stripeSecretKey === 'string' && input.stripeSecretKey.trim()) {
      const cleanKey = input.stripeSecretKey.trim();
      if (!/^(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{12,}$/.test(cleanKey)) {
        throw new Error('Stripe Secret Key must start with sk_live_, sk_test_, rk_live_, or rk_test_.');
      }
      internalSecretsHandler.setSecret('STRIPE_SECRET_KEY', cleanKey, {
        label: 'Stripe Secret API Key',
        category: 'Billing & Payments',
        description: 'Stripe server-side API key saved via Admin Monetization & Billing'
      });
    }

    if (typeof input.stripeWebhookSecret === 'string' && input.stripeWebhookSecret.trim()) {
      const cleanWh = input.stripeWebhookSecret.trim();
      if (!/^whsec_[A-Za-z0-9\-_]{12,}$/.test(cleanWh)) {
        throw new Error('Stripe Webhook Secret must start with whsec_.');
      }
      internalSecretsHandler.setSecret('STRIPE_WEBHOOK_SECRET', cleanWh, {
        label: 'Stripe Webhook Signing Secret',
        category: 'Billing & Payments',
        description: 'Stripe HMAC-SHA256 webhook signing secret saved via Admin Monetization & Billing'
      });
    }

    if (typeof input.treasuryEvmAddress === 'string') {
      const trimmed = input.treasuryEvmAddress.trim();
      if (trimmed && !EVM_ADDRESS_RE.test(trimmed)) {
        throw new Error('Treasury EVM address must be a valid 0x-prefixed 40-hex-character wallet address.');
      }
      cfg.treasuryEvmAddress = trimmed;
      if (trimmed) {
        internalSecretsHandler.setSecret('BILLING_TREASURY_EVM_ADDRESS', trimmed, {
          label: 'Billing Treasury EVM Address',
          category: 'Billing & Payments'
        });
      }
    }

    if (typeof input.fiatStripeEnabled === 'boolean') {
      if (input.fiatStripeEnabled && !getStripeSecretKey()) {
        throw new Error('Configure STRIPE_SECRET_KEY in Vault or Environment before enabling Stripe card payments.');
      }
      cfg.fiatStripeEnabled = input.fiatStripeEnabled;
    }
    if (typeof input.cryptoEnabled === 'boolean') {
      if (input.cryptoEnabled && !EVM_ADDRESS_RE.test(cfg.treasuryEvmAddress)) {
        throw new Error('Set a valid EVM Treasury Wallet Address before enabling real crypto payments.');
      }
      cfg.cryptoEnabled = input.cryptoEnabled;
    }
    if (Array.isArray(input.enabledChains)) {
      const filtered = input.enabledChains.filter((c): c is SupportedBillingChain => c in BILLING_CHAIN_REGISTRY);
      if (filtered.length === 0) throw new Error('Select at least one supported blockchain network.');
      cfg.enabledChains = filtered;
    }
    if (Array.isArray(input.enabledTokens)) {
      const filtered = input.enabledTokens.filter((t): t is SupportedBillingCryptoToken => t === 'USDC' || t === 'ETH');
      if (filtered.length === 0) throw new Error('Select at least one supported crypto token (USDC or ETH).');
      cfg.enabledTokens = filtered;
    }

    cfg.updatedAt = new Date().toISOString();
    atomicWriteJson(CONFIG_PATH, cfg);
    return this.getPublicConfig();
  }

  // -------------------------------------------------------------------------
  // STRIPE REAL FIAT CHECKOUT & WEBHOOK VERIFICATION
  // -------------------------------------------------------------------------
  async createStripeCheckoutSession(params: {
    user: AuthUserPublic;
    tier: UserTierDefinition;
    billingCycle: 'monthly' | 'one-time';
    originUrl: string;
  }): Promise<{ checkoutUrl: string; sessionId: string }> {
    const stripeKey = getStripeSecretKey();
    const cfg = readConfig();
    if (!stripeKey || !cfg.fiatStripeEnabled) {
      throw new Error(
        'Stripe card payments are not configured on this server yet. Add STRIPE_SECRET_KEY in Admin → Monetization & Billing and enable Stripe.'
      );
    }

    assertBillingCycleAllowed(params.tier, params.billingCycle);

    const amountCents =
      params.billingCycle === 'monthly'
        ? params.tier.pricing.monthlyUsdCents
        : params.tier.pricing.oneTimeUsdCents;

    if (
      !(params.billingCycle === 'monthly' && params.tier.pricing.stripePriceId) &&
      (!Number.isFinite(amountCents) || amountCents < 50)
    ) {
      throw new Error(
        `Tier "${params.tier.name}" does not have a valid ${params.billingCycle} USD price configured (minimum $0.50).`
      );
    }

    const safeOrigin = params.originUrl.replace(/\/+$/, '');
    const form = new URLSearchParams();
    form.set('mode', params.billingCycle === 'monthly' ? 'subscription' : 'payment');
    form.set('success_url', `${safeOrigin}/?billing_session_id={CHECKOUT_SESSION_ID}&billing_status=success`);
    form.set('cancel_url', `${safeOrigin}/?billing_status=cancelled`);
    form.set('client_reference_id', params.user.id);
    if (params.user.email && params.user.email.includes('@')) {
      form.set('customer_email', params.user.email);
    }

    form.set('metadata[userId]', params.user.id);
    form.set('metadata[username]', params.user.username);
    form.set('metadata[tierId]', params.tier.id);
    form.set('metadata[tierName]', params.tier.name);
    form.set('metadata[billingCycle]', params.billingCycle);

    if (params.billingCycle === 'monthly') {
      form.set('subscription_data[metadata][userId]', params.user.id);
      form.set('subscription_data[metadata][username]', params.user.username);
      form.set('subscription_data[metadata][tierId]', params.tier.id);
      form.set('subscription_data[metadata][tierName]', params.tier.name);
      form.set('subscription_data[metadata][billingCycle]', 'monthly');
    } else {
      form.set('payment_intent_data[metadata][userId]', params.user.id);
      form.set('payment_intent_data[metadata][username]', params.user.username);
      form.set('payment_intent_data[metadata][tierId]', params.tier.id);
      form.set('payment_intent_data[metadata][tierName]', params.tier.name);
      form.set('payment_intent_data[metadata][billingCycle]', 'one-time');
    }

    if (params.billingCycle === 'monthly' && params.tier.pricing.stripePriceId) {
      form.set('line_items[0][price]', params.tier.pricing.stripePriceId.trim());
      form.set('line_items[0][quantity]', '1');
    } else {
      form.set('line_items[0][quantity]', '1');
      form.set('line_items[0][price_data][currency]', 'usd');
      form.set('line_items[0][price_data][unit_amount]', String(Math.round(amountCents)));
      form.set('line_items[0][price_data][product_data][name]', `${params.tier.name} — Sovereign OS Access`);
      form.set(
        'line_items[0][price_data][product_data][description]',
        params.tier.tagline || params.tier.description || `Tiered OS orchestrator access (${params.billingCycle})`
      );
      if (params.billingCycle === 'monthly') {
        form.set('line_items[0][price_data][recurring][interval]', 'month');
      }
    }

    const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: form.toString(),
      signal: AbortSignal.timeout(15000)
    });

    const data = (await resp.json()) as any;
    if (!resp.ok || !data?.url || !data?.id) {
      const msg = data?.error?.message || `Stripe Checkout failed (HTTP ${resp.status})`;
      throw new Error(msg);
    }

    return {
      checkoutUrl: String(data.url),
      sessionId: String(data.id)
    };
  }

  async createDonationStripeCheckoutSession(params: {
    user: AuthUserPublic;
    amountUsd: number;
    isAnonymous: boolean;
    authorName?: string;
    feedbackCategory: SupporterFeedbackSentiment;
    message?: string;
    originUrl: string;
  }): Promise<{ checkoutUrl: string; sessionId: string }> {
    const stripeKey = getStripeSecretKey();
    const cfg = readConfig();
    if (!stripeKey || !cfg.fiatStripeEnabled) {
      throw new Error(
        'Stripe card payments are not configured on this server yet. Add STRIPE_SECRET_KEY in Admin → Monetization & Billing and enable Stripe.'
      );
    }

    const cleanUsd = Math.round(Number(params.amountUsd) * 100) / 100;
    if (!Number.isFinite(cleanUsd) || cleanUsd < 2 || cleanUsd > 25000) {
      throw new Error('Donation amount must be between $2.00 and $25,000.00 USD.');
    }
    const amountCents = Math.round(cleanUsd * 100);
    const isAnonymous = Boolean(params.isAnonymous);
    const authorName = isAnonymous
      ? 'Anonymous Backer'
      : sanitizeBoardText(params.authorName || params.user.displayName || params.user.username, 48) ||
        'Project Backer';
    const feedbackCategory = sanitizeFeedbackSentiment(params.feedbackCategory);
    const message = sanitizeBoardText(params.message || '', 450);

    const safeOrigin = params.originUrl.replace(/\/+$/, '');
    const form = new URLSearchParams();
    form.set('mode', 'payment');
    form.set('success_url', `${safeOrigin}/?billing_session_id={CHECKOUT_SESSION_ID}&billing_status=success`);
    form.set('cancel_url', `${safeOrigin}/?billing_status=cancelled`);
    form.set('client_reference_id', params.user.id);
    if (params.user.email && params.user.email.includes('@')) {
      form.set('customer_email', params.user.email);
    }

    form.set('metadata[kind]', 'donation');
    form.set('metadata[userId]', params.user.id);
    form.set('metadata[username]', params.user.username);
    form.set('metadata[tierId]', 'donation');
    form.set('metadata[tierName]', 'Project Continuation Donation');
    form.set('metadata[billingCycle]', 'one-time');
    form.set('metadata[isAnonymous]', isAnonymous ? 'true' : 'false');
    form.set('metadata[authorName]', authorName);
    form.set('metadata[feedbackCategory]', feedbackCategory);
    if (message) {
      form.set('metadata[message]', message);
    }

    form.set('payment_intent_data[metadata][kind]', 'donation');
    form.set('payment_intent_data[metadata][userId]', params.user.id);
    form.set('payment_intent_data[metadata][isAnonymous]', isAnonymous ? 'true' : 'false');

    form.set('line_items[0][quantity]', '1');
    form.set('line_items[0][price_data][currency]', 'usd');
    form.set('line_items[0][price_data][unit_amount]', String(amountCents));
    form.set('line_items[0][price_data][product_data][name]', 'Project Continuation & Supporter Wall Donation');
    form.set(
      'line_items[0][price_data][product_data][description]',
      isAnonymous
        ? 'Anonymous contribution with permanent timestamped receipt on the Supporter & Founder Wall'
        : `Attributed contribution (${authorName}) on the Supporter & Founder Wall`
    );

    const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: form.toString(),
      signal: AbortSignal.timeout(15000)
    });

    const data = (await resp.json()) as any;
    if (!resp.ok || !data?.url || !data?.id) {
      const msg = data?.error?.message || `Stripe Checkout failed (HTTP ${resp.status})`;
      throw new Error(msg);
    }

    return {
      checkoutUrl: String(data.url),
      sessionId: String(data.id)
    };
  }

  verifyStripeWebhookSignature(rawBody: Buffer, signatureHeader: string): any {
    const webhookSecret = getStripeWebhookSecret();
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured on the server.');
    }
    if (!signatureHeader) {
      throw new Error('Missing Stripe-Signature header.');
    }
    if (!Buffer.isBuffer(rawBody) || rawBody.length === 0) {
      throw new Error('Stripe webhook requires an unmodified raw request body.');
    }

    const parts = signatureHeader.split(',').reduce<Record<string, string[]>>((acc, item) => {
      const [k, v] = item.split('=');
      if (k && v) {
        const key = k.trim();
        acc[key] = acc[key] || [];
        acc[key].push(v.trim());
      }
      return acc;
    }, {});

    const timestamp = parts['t']?.[0];
    const signatures = parts['v1'] || [];
    if (!timestamp || signatures.length === 0) {
      throw new Error('Malformed Stripe-Signature header.');
    }

    const tsNum = Number(timestamp);
    if (!Number.isFinite(tsNum) || Math.abs(Math.floor(Date.now() / 1000) - tsNum) > 300) {
      throw new Error('Stripe webhook timestamp outside replay tolerance window.');
    }

    const signedPayload = `${timestamp}.${rawBody.toString('utf8')}`;
    const expectedSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(signedPayload, 'utf8')
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSig, 'hex');
    const matched = signatures.some((sig) => {
      try {
        const sigBuf = Buffer.from(sig, 'hex');
        return sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf);
      } catch {
        return false;
      }
    });

    if (!matched) {
      throw new Error('Stripe webhook signature verification failed.');
    }

    return JSON.parse(rawBody.toString('utf8'));
  }

  async verifyStripeCheckoutSession(sessionId: string, expectedUserId?: string): Promise<{
    entryType: 'tier' | 'donation';
    alreadySettled: boolean;
    userId: string;
    username: string;
    tierId: string;
    tierName: string;
    billingCycle: 'monthly' | 'one-time';
    amountUsd: number;
    subscriptionStatus: 'active' | 'lifetime';
    tierExpiresAt: string | null;
    record: BillingLedgerRecord;
    supporterEntry?: SupporterBoardEntry;
  }> {
    const cleanId = String(sessionId || '').trim();
    if (!cleanId.startsWith('cs_')) {
      throw new Error('Invalid Stripe checkout session ID.');
    }
    const stripeKey = getStripeSecretKey();
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured.');
    }
    if (this.inFlightStripeSessionIds.has(cleanId)) {
      throw new Error('Stripe session verification already in progress.');
    }
    this.inFlightStripeSessionIds.add(cleanId);
    try {
      const resp = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(cleanId)}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${stripeKey}` },
        signal: AbortSignal.timeout(12000)
      });
      const session = (await resp.json()) as any;
      if (!resp.ok || !session?.id) {
        throw new Error(session?.error?.message || `Unable to retrieve Stripe session (HTTP ${resp.status}).`);
      }

      return this.settleStripeSessionObject(session, expectedUserId);
    } finally {
      this.inFlightStripeSessionIds.delete(cleanId);
    }
  }

  settleStripeSessionObject(session: any, expectedUserId?: string): {
    entryType: 'tier' | 'donation';
    alreadySettled: boolean;
    userId: string;
    username: string;
    tierId: string;
    tierName: string;
    billingCycle: 'monthly' | 'one-time';
    amountUsd: number;
    subscriptionStatus: 'active' | 'lifetime';
    tierExpiresAt: string | null;
    record: BillingLedgerRecord;
    supporterEntry?: SupporterBoardEntry;
  } {
    const sessionId = String(session?.id || '');
    const paymentStatus = String(session?.payment_status || '');
    if (paymentStatus !== 'paid') {
      throw new Error(`Stripe checkout session is not paid yet (payment_status=${paymentStatus || 'unknown'}).`);
    }

    const meta = session?.metadata || {};
    const entryType: 'tier' | 'donation' = meta.kind === 'donation' ? 'donation' : 'tier';
    const userId = String(meta.userId || session?.client_reference_id || '').trim();
    const username = String(meta.username || 'user').trim();
    const tierId = String(meta.tierId || (entryType === 'donation' ? 'donation' : '')).trim();
    const tierName = String(meta.tierName || (entryType === 'donation' ? 'Project Support Donation' : tierId)).trim();
    const billingCycle: 'monthly' | 'one-time' =
      entryType === 'donation' || meta.billingCycle === 'one-time' ? 'one-time' : 'monthly';

    if (!userId || !tierId) {
      throw new Error('Stripe session metadata missing userId or tierId.');
    }
    if (expectedUserId && userId !== expectedUserId) {
      throw new Error('Stripe checkout session does not belong to the signed-in user.');
    }

    const ledger = readLedger();
    const existingRecord = ledger.records.find((r) => r.referenceId === sessionId);
    const { subscriptionStatus, tierExpiresAt } = computeTierExpiry(billingCycle);

    const subscriptionId = typeof session?.subscription === 'string' ? session.subscription.trim() : '';
    const paymentIntentId = typeof session?.payment_intent === 'string' ? session.payment_intent.trim() : '';
    if (entryType === 'tier' && subscriptionId) {
      ledger.stripeSubscriptions[subscriptionId] = {
        userId,
        tierId,
        sessionId,
        billingCycle,
        ...(paymentIntentId ? { paymentIntentId } : {})
      };
    }

    if (existingRecord || ledger.settledStripeSessionIds.includes(sessionId)) {
      if (entryType === 'tier' && subscriptionId) writeLedger(ledger);
      const fallbackRec: BillingLedgerRecord = existingRecord || {
        id: `led-${crypto.randomBytes(6).toString('hex')}`,
        entryType,
        userId,
        username,
        tierId,
        tierName,
        method: 'stripe-card',
        billingCycle,
        amountUsd: Number(session?.amount_total || 0) / 100,
        currency: String(session?.currency || 'usd').toUpperCase(),
        referenceId: sessionId,
        status: 'settled',
        createdAt: new Date().toISOString()
      };
      const board = readSupporterBoard();
      const refHash = `stripe-${crypto.createHash('sha256').update(sessionId).digest('hex').slice(0, 12)}`;
      const existingBoardEntry = board.entries.find((e) => e.referenceId === refHash);
      return {
        entryType,
        alreadySettled: true,
        userId,
        username,
        tierId,
        tierName,
        billingCycle,
        amountUsd: fallbackRec.amountUsd,
        subscriptionStatus,
        tierExpiresAt,
        record: fallbackRec,
        ...(existingBoardEntry ? { supporterEntry: toPublicBoardEntry(existingBoardEntry, userId) } : {})
      };
    }

    const amountUsd = Math.round((Number(session?.amount_total || 0) / 100) * 100) / 100;
    const nowIso = new Date().toISOString();
    const record: BillingLedgerRecord = {
      id: `led-${crypto.randomBytes(6).toString('hex')}`,
      entryType,
      userId,
      username,
      tierId,
      tierName,
      method: 'stripe-card',
      billingCycle,
      amountUsd,
      currency: String(session?.currency || 'usd').toUpperCase(),
      referenceId: sessionId,
      status: 'settled',
      createdAt: nowIso
    };

    ledger.settledStripeSessionIds.push(sessionId);
    ledger.records.push(record);
    writeLedger(ledger);

    let supporterEntry: SupporterBoardEntry | undefined;
    if (entryType === 'donation') {
      const isAnonymous = String(meta.isAnonymous || 'false') === 'true';
      const authorDisplayName = isAnonymous
        ? 'Anonymous Backer'
        : sanitizeBoardText(meta.authorName || username, 48) || 'Project Backer';
      const feedbackCategory = sanitizeFeedbackSentiment(meta.feedbackCategory);
      const message = sanitizeBoardText(meta.message || '', 500);
      const refProof = `stripe-${crypto.createHash('sha256').update(sessionId).digest('hex').slice(0, 12)}`;

      const board = readSupporterBoard();
      const storedEntry: StoredSupporterBoardEntry = {
        id: `sup-${crypto.randomBytes(6).toString('hex')}`,
        _userId: userId,
        entryKind: 'donation',
        isAnonymous,
        authorDisplayName,
        tierId: 'donation',
        tierName: 'Project Donation',
        tierBadgeColor: 'emerald',
        amountUsd,
        currency: String(session?.currency || 'usd').toUpperCase(),
        paymentMethod: 'stripe-card',
        feedbackCategory,
        message,
        referenceId: refProof,
        verified: true,
        createdAt: nowIso
      };
      board.entries.push(storedEntry);
      writeSupporterBoard(board);
      supporterEntry = toPublicBoardEntry(storedEntry, userId);
    }

    return {
      entryType,
      alreadySettled: false,
      userId,
      username,
      tierId,
      tierName,
      billingCycle,
      amountUsd,
      subscriptionStatus,
      tierExpiresAt,
      record,
      ...(supporterEntry ? { supporterEntry } : {})
    };
  }

  handleStripeWebhookLifecycleEvent(event: any): StripeWebhookLifecycleResult {
    const eventId = String(event?.id || '').trim();
    const eventType = String(event?.type || '').trim();
    if (!eventId || !eventType) {
      throw new Error('Malformed Stripe webhook event payload.');
    }

    if (this.inFlightStripeEventIds.has(eventId)) {
      return { action: 'noop', eventId, eventType };
    }
    this.inFlightStripeEventIds.add(eventId);

    try {
      const ledger = readLedger();
      if (ledger.processedStripeEventIds.includes(eventId)) {
        return { action: 'noop', eventId, eventType };
      }

      if (
        eventType === 'checkout.session.completed' ||
        eventType === 'checkout.session.async_payment_succeeded'
      ) {
        const sessionObj = event?.data?.object;
        if (sessionObj?.payment_status === 'paid') {
          const settlement = this.settleStripeSessionObject(sessionObj);
          const refreshed = readLedger();
          if (!refreshed.processedStripeEventIds.includes(eventId)) {
            refreshed.processedStripeEventIds.push(eventId);
            writeLedger(refreshed);
          }
          return { action: 'grant', eventId, eventType, settlement };
        }
        ledger.processedStripeEventIds.push(eventId);
        writeLedger(ledger);
        return { action: 'noop', eventId, eventType };
      }

      const obj = event?.data?.object || {};
      const shouldRevoke =
        eventType === 'customer.subscription.deleted' ||
        (eventType === 'customer.subscription.updated' &&
          ['canceled', 'unpaid', 'incomplete_expired'].includes(String(obj?.status || ''))) ||
        eventType === 'invoice.payment_failed' ||
        (eventType === 'charge.refunded' && Boolean(obj?.refunded));

      if (!shouldRevoke) {
        ledger.processedStripeEventIds.push(eventId);
        writeLedger(ledger);
        return { action: 'noop', eventId, eventType };
      }

      const subscriptionId =
        typeof obj?.id === 'string' && eventType.startsWith('customer.subscription.')
          ? obj.id
          : typeof obj?.subscription === 'string'
            ? obj.subscription
            : '';
      const paymentIntentId = typeof obj?.payment_intent === 'string' ? obj.payment_intent : '';

      const bound = subscriptionId ? ledger.stripeSubscriptions[subscriptionId] : undefined;
      const matchedRecord = bound
        ? ledger.records.find((r) => r.referenceId === bound.sessionId)
        : paymentIntentId
          ? Object.values(ledger.stripeSubscriptions).find((b) => b.paymentIntentId === paymentIntentId)
            ? ledger.records.find(
                (r) =>
                  r.referenceId ===
                  Object.values(ledger.stripeSubscriptions).find((b) => b.paymentIntentId === paymentIntentId)?.sessionId
              )
            : undefined
          : undefined;

      const userId = String(
        obj?.metadata?.userId ||
          obj?.subscription_details?.metadata?.userId ||
          bound?.userId ||
          matchedRecord?.userId ||
          ''
      ).trim();

      if (matchedRecord && eventType === 'charge.refunded') {
        matchedRecord.status = 'refunded';
      } else if (matchedRecord && eventType === 'customer.subscription.deleted') {
        matchedRecord.status = 'cancelled';
      }

      ledger.processedStripeEventIds.push(eventId);
      writeLedger(ledger);

      if (!userId) {
        return { action: 'noop', eventId, eventType };
      }

      return {
        action: 'downgrade',
        eventId,
        eventType,
        userId,
        reason: `Stripe ${eventType}`,
        subscriptionStatus: eventType === 'charge.refunded' ? 'free' : 'expired'
      };
    } finally {
      this.inFlightStripeEventIds.delete(eventId);
    }
  }

  // -------------------------------------------------------------------------
  // REAL ON-CHAIN EVM CRYPTO INVOICING & RECEIPT VERIFICATION
  // -------------------------------------------------------------------------
  async createCryptoInvoice(params: {
    user: AuthUserPublic;
    tier: UserTierDefinition;
    chain: SupportedBillingChain;
    token: SupportedBillingCryptoToken;
    billingCycle: 'monthly' | 'one-time';
  }): Promise<CryptoPaymentInvoice> {
    const cfg = readConfig();
    if (!cfg.cryptoEnabled || !EVM_ADDRESS_RE.test(cfg.treasuryEvmAddress)) {
      throw new Error(
        'Real crypto payments are not enabled yet. The Administrator must configure a valid EVM Treasury Wallet Address in Admin → Monetization & Billing.'
      );
    }

    assertBillingCycleAllowed(params.tier, params.billingCycle);

    if (!cfg.enabledChains.includes(params.chain)) {
      throw new Error(`Chain "${params.chain}" is not enabled for billing.`);
    }
    if (!cfg.enabledTokens.includes(params.token)) {
      throw new Error(`Token "${params.token}" is not enabled for billing.`);
    }
    if (
      Array.isArray(params.tier.pricing.acceptedCryptoChains) &&
      params.tier.pricing.acceptedCryptoChains.length > 0 &&
      !params.tier.pricing.acceptedCryptoChains.includes(params.chain)
    ) {
      throw new Error(`Tier "${params.tier.name}" does not accept crypto payments on ${params.chain}.`);
    }
    if (
      Array.isArray(params.tier.pricing.acceptedCryptoTokens) &&
      params.tier.pricing.acceptedCryptoTokens.length > 0 &&
      !params.tier.pricing.acceptedCryptoTokens.includes(params.token)
    ) {
      throw new Error(`Tier "${params.tier.name}" does not accept ${params.token}.`);
    }

    const chainMeta = BILLING_CHAIN_REGISTRY[params.chain];
    if (!chainMeta) {
      throw new Error(`Unsupported blockchain network: ${params.chain}`);
    }

    const usdFromCycle =
      params.billingCycle === 'one-time' && params.tier.pricing.oneTimeUsdCents > 0
        ? params.tier.pricing.oneTimeUsdCents / 100
        : params.billingCycle === 'monthly' && params.tier.pricing.monthlyUsdCents > 0
          ? params.tier.pricing.monthlyUsdCents / 100
          : params.tier.pricing.cryptoUsdAmount;

    const usdAmount = Math.round(usdFromCycle * 100) / 100;
    if (!Number.isFinite(usdAmount) || usdAmount <= 0) {
      throw new Error(`Tier "${params.tier.name}" has no valid USD amount configured for ${params.billingCycle}.`);
    }

    let expectedAmountUnits: bigint;
    let expectedAmountDisplay: string;
    let ethSpotPriceUsd: number | undefined;
    let tokenContractAddress: string | null = null;
    let tokenDecimals = 18;

    if (params.token === 'USDC') {
      tokenContractAddress = chainMeta.usdcContract;
      tokenDecimals = chainMeta.usdcDecimals;
      expectedAmountUnits = BigInt(Math.round(usdAmount * 10 ** tokenDecimals));
      expectedAmountDisplay = `${usdAmount.toFixed(2)} USDC`;
    } else {
      ethSpotPriceUsd = await fetchLiveEthSpotUsd();
      const ethAmount = usdAmount / ethSpotPriceUsd;
      const gwei = BigInt(Math.ceil(ethAmount * 1e9));
      expectedAmountUnits = gwei * 1_000_000_000n;
      expectedAmountDisplay = `${ethAmount.toFixed(6)} ETH`;
    }

    // 0.5% tolerance for rounding/spot delta
    const expectedMinUnits = (expectedAmountUnits * 995n) / 1000n;
    const now = Date.now();
    const eip681Uri = buildEip681Uri({
      chainId: chainMeta.chainId,
      treasuryAddress: cfg.treasuryEvmAddress,
      token: params.token,
      tokenContractAddress,
      expectedAmountUnits
    });

    const invoice: CryptoPaymentInvoice = {
      id: `inv-${crypto.randomBytes(6).toString('hex')}`,
      invoiceKind: 'tier',
      userId: params.user.id,
      username: params.user.username,
      tierId: params.tier.id,
      tierName: params.tier.name,
      billingCycle: params.billingCycle,
      chain: params.chain,
      chainId: chainMeta.chainId,
      chainLabel: chainMeta.label,
      token: params.token,
      tokenContractAddress,
      tokenDecimals,
      treasuryAddress: cfg.treasuryEvmAddress,
      usdAmount,
      ethSpotPriceUsd,
      expectedAmountDisplay,
      expectedAmountUnits: expectedAmountUnits.toString(),
      expectedMinUnits: expectedMinUnits.toString(),
      eip681Uri,
      status: 'pending',
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + INVOICE_TTL_MS).toISOString()
    };

    const ledger = readLedger();
    ledger.invoices.push(invoice);
    writeLedger(ledger);
    return invoice;
  }

  async createDonationCryptoInvoice(params: {
    user: AuthUserPublic;
    amountUsd: number;
    chain: SupportedBillingChain;
    token: SupportedBillingCryptoToken;
    isAnonymous: boolean;
    authorName?: string;
    feedbackCategory: SupporterFeedbackSentiment;
    message?: string;
  }): Promise<CryptoPaymentInvoice> {
    const cfg = readConfig();
    if (!cfg.cryptoEnabled || !EVM_ADDRESS_RE.test(cfg.treasuryEvmAddress)) {
      throw new Error(
        'Real crypto payments are not enabled yet. The Administrator must configure a valid EVM Treasury Wallet Address in Admin → Monetization & Billing.'
      );
    }
    if (!cfg.enabledChains.includes(params.chain)) {
      throw new Error(`Chain "${params.chain}" is not enabled for billing.`);
    }
    if (!cfg.enabledTokens.includes(params.token)) {
      throw new Error(`Token "${params.token}" is not enabled for billing.`);
    }
    const chainMeta = BILLING_CHAIN_REGISTRY[params.chain];
    if (!chainMeta) {
      throw new Error(`Unsupported blockchain network: ${params.chain}`);
    }

    const usdAmount = Math.round(Number(params.amountUsd) * 100) / 100;
    if (!Number.isFinite(usdAmount) || usdAmount < 2 || usdAmount > 25000) {
      throw new Error('Donation amount must be between $2.00 and $25,000.00 USD.');
    }

    let expectedAmountUnits: bigint;
    let expectedAmountDisplay: string;
    let ethSpotPriceUsd: number | undefined;
    let tokenContractAddress: string | null = null;
    let tokenDecimals = 18;

    if (params.token === 'USDC') {
      tokenContractAddress = chainMeta.usdcContract;
      tokenDecimals = chainMeta.usdcDecimals;
      expectedAmountUnits = BigInt(Math.round(usdAmount * 10 ** tokenDecimals));
      expectedAmountDisplay = `${usdAmount.toFixed(2)} USDC`;
    } else {
      ethSpotPriceUsd = await fetchLiveEthSpotUsd();
      const ethAmount = usdAmount / ethSpotPriceUsd;
      const gwei = BigInt(Math.ceil(ethAmount * 1e9));
      expectedAmountUnits = gwei * 1_000_000_000n;
      expectedAmountDisplay = `${ethAmount.toFixed(6)} ETH`;
    }

    const expectedMinUnits = (expectedAmountUnits * 995n) / 1000n;
    const now = Date.now();
    const eip681Uri = buildEip681Uri({
      chainId: chainMeta.chainId,
      treasuryAddress: cfg.treasuryEvmAddress,
      token: params.token,
      tokenContractAddress,
      expectedAmountUnits
    });

    const isAnonymous = Boolean(params.isAnonymous);
    const donationAuthorName = isAnonymous
      ? 'Anonymous Backer'
      : sanitizeBoardText(params.authorName || params.user.displayName || params.user.username, 48) ||
        'Project Backer';
    const donationFeedbackCategory = sanitizeFeedbackSentiment(params.feedbackCategory);
    const donationMessage = sanitizeBoardText(params.message || '', 500);

    const invoice: CryptoPaymentInvoice = {
      id: `inv-${crypto.randomBytes(6).toString('hex')}`,
      invoiceKind: 'donation',
      userId: params.user.id,
      username: params.user.username,
      tierId: 'donation',
      tierName: 'Project Support Donation',
      billingCycle: 'one-time',
      chain: params.chain,
      chainId: chainMeta.chainId,
      chainLabel: chainMeta.label,
      token: params.token,
      tokenContractAddress,
      tokenDecimals,
      treasuryAddress: cfg.treasuryEvmAddress,
      usdAmount,
      ethSpotPriceUsd,
      expectedAmountDisplay,
      expectedAmountUnits: expectedAmountUnits.toString(),
      expectedMinUnits: expectedMinUnits.toString(),
      eip681Uri,
      status: 'pending',
      donationIsAnonymous: isAnonymous,
      donationAuthorName,
      donationFeedbackCategory,
      donationMessage,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + INVOICE_TTL_MS).toISOString()
    };

    const ledger = readLedger();
    ledger.invoices.push(invoice);
    writeLedger(ledger);
    return invoice;
  }

  cancelCryptoInvoice(userId: string, invoiceId: string): CryptoPaymentInvoice {
    const cleanId = String(invoiceId || '').trim();
    const ledger = readLedger();
    const invoice = ledger.invoices.find((i) => i.id === cleanId && i.userId === userId);
    if (!invoice) {
      throw new Error('Crypto payment invoice not found for your account.');
    }
    if (invoice.status === 'settled') {
      throw new Error('Settled invoices cannot be cancelled.');
    }
    invoice.status = 'cancelled';
    writeLedger(ledger);
    return invoice;
  }

  async verifyCryptoInvoicePayment(params: {
    userId: string;
    invoiceId: string;
    txHash: string;
  }): Promise<{
    entryType: 'tier' | 'donation';
    invoice: CryptoPaymentInvoice;
    record: BillingLedgerRecord;
    subscriptionStatus: 'active' | 'lifetime';
    tierExpiresAt: string | null;
    supporterEntry?: SupporterBoardEntry;
  }> {
    const cleanTx = String(params.txHash || '').trim();
    if (!EVM_TX_HASH_RE.test(cleanTx)) {
      throw new Error('Transaction hash must be a valid 0x-prefixed 64-hex-character EVM transaction hash.');
    }
    const normalizedTx = cleanTx.toLowerCase();
    const cleanInvoiceId = String(params.invoiceId || '').trim();

    if (this.inFlightInvoiceIds.has(cleanInvoiceId) || this.inFlightTxHashes.has(normalizedTx)) {
      throw new Error('Verification for this invoice or transaction hash is already running.');
    }

    this.inFlightInvoiceIds.add(cleanInvoiceId);
    this.inFlightTxHashes.add(normalizedTx);

    try {
      const initialLedger = readLedger();
      const initialInvoice = initialLedger.invoices.find(
        (i) => i.id === cleanInvoiceId && i.userId === params.userId
      );
      if (!initialInvoice) {
        throw new Error('Crypto payment invoice not found for your account.');
      }
      if (initialInvoice.status === 'settled') {
        throw new Error('This invoice has already been settled.');
      }
      if (initialInvoice.status === 'cancelled') {
        throw new Error('This invoice was cancelled. Create a new invoice to continue.');
      }
      if (Date.now() > Date.parse(initialInvoice.expiresAt)) {
        initialInvoice.status = 'expired';
        writeLedger(initialLedger);
        throw new Error('This invoice has expired. Generate a fresh crypto invoice to get updated pricing.');
      }
      if (initialLedger.redeemedTxHashes.includes(normalizedTx)) {
        throw new Error('This transaction hash has already been redeemed for another payment.');
      }

      const chainMeta = BILLING_CHAIN_REGISTRY[initialInvoice.chain];
      if (!chainMeta) {
        throw new Error('Invoice references an unsupported blockchain network.');
      }

      const [receipt, tx, latestBlockHex] = await Promise.all([
        jsonRpcCall(chainMeta.rpcUrls, 'eth_getTransactionReceipt', [cleanTx]),
        jsonRpcCall(chainMeta.rpcUrls, 'eth_getTransactionByHash', [cleanTx]),
        jsonRpcCall(chainMeta.rpcUrls, 'eth_blockNumber', []).catch(() => null)
      ]);

      if (!receipt || !tx || !receipt.blockNumber) {
        throw new Error(
          `Transaction ${cleanTx.slice(0, 12)}... is not confirmed on ${chainMeta.label} yet. Wait a few seconds for block confirmation and click Verify again.`
        );
      }

      if (String(receipt.status || '').toLowerCase() !== '0x1') {
        throw new Error(`On-chain transaction reverted or failed on ${chainMeta.label} (status=${receipt.status}).`);
      }

      const txBlock = parseHexBigInt(receipt.blockNumber);
      const latestBlock = parseHexBigInt(latestBlockHex);
      const confirmations =
        txBlock > 0n && latestBlock >= txBlock ? Math.max(1, Number(latestBlock - txBlock + 1n)) : 1;

      const treasuryLower = normalizeEvmAddress(initialInvoice.treasuryAddress);
      const minUnits = BigInt(initialInvoice.expectedMinUnits);
      let verifiedUnits = 0n;

      if (initialInvoice.token === 'ETH') {
        const txTo = normalizeEvmAddress(tx.to);
        const txValue = parseHexBigInt(tx.value);
        if (txTo !== treasuryLower) {
          throw new Error(
            `Transaction recipient (${tx.to || 'unknown'}) does not match the Sovereign OS Treasury address (${initialInvoice.treasuryAddress}).`
          );
        }
        if (txValue < minUnits) {
          throw new Error(
            `Confirmed ETH transfer amount is below the required invoice minimum (${initialInvoice.expectedAmountDisplay}).`
          );
        }
        verifiedUnits = txValue;
      } else {
        const contractLower = normalizeEvmAddress(initialInvoice.tokenContractAddress);
        const logs: any[] = Array.isArray(receipt.logs) ? receipt.logs : [];
        for (const log of logs) {
          if (normalizeEvmAddress(log.address) !== contractLower) continue;
          const topics: unknown[] = Array.isArray(log.topics) ? log.topics : [];
          if (topics.length < 3) continue;
          if (String(topics[0]).toLowerCase() !== ERC20_TRANSFER_TOPIC) continue;
          const toAddr = normalizeTopicAddress(topics[2]);
          if (toAddr !== treasuryLower) continue;
          verifiedUnits += parseHexBigInt(log.data);
        }

        if (verifiedUnits < minUnits) {
          throw new Error(
            `No confirmed ${initialInvoice.token} Transfer to Treasury (${initialInvoice.treasuryAddress}) meeting ${initialInvoice.expectedAmountDisplay} was found in this transaction on ${chainMeta.label}.`
          );
        }
      }

      // Critical atomic re-read check before committing settlement
      const ledger = readLedger();
      if (ledger.redeemedTxHashes.includes(normalizedTx)) {
        throw new Error('This transaction hash has already been redeemed.');
      }
      const invoice = ledger.invoices.find((i) => i.id === cleanInvoiceId && i.userId === params.userId);
      if (!invoice || invoice.status !== 'pending') {
        throw new Error('Invoice state changed while verifying. Please refresh billing status.');
      }

      const nowIso = new Date().toISOString();
      const explorerUrl = `${chainMeta.explorerTxBase}${cleanTx}`;
      invoice.status = 'settled';
      invoice.txHash = cleanTx;
      invoice.explorerUrl = explorerUrl;
      invoice.confirmations = confirmations;
      invoice.settledAt = nowIso;

      const entryType: 'tier' | 'donation' = invoice.invoiceKind === 'donation' ? 'donation' : 'tier';
      const { subscriptionStatus, tierExpiresAt } = computeTierExpiry(invoice.billingCycle);
      const record: BillingLedgerRecord = {
        id: `led-${crypto.randomBytes(6).toString('hex')}`,
        entryType,
        userId: invoice.userId,
        username: invoice.username,
        tierId: invoice.tierId,
        tierName: invoice.tierName,
        method: 'crypto-onchain',
        billingCycle: invoice.billingCycle,
        amountUsd: invoice.usdAmount,
        currency: invoice.token,
        nativeAmount: invoice.expectedAmountDisplay,
        chain: invoice.chain,
        referenceId: cleanTx,
        explorerUrl,
        status: 'settled',
        createdAt: nowIso
      };

      ledger.redeemedTxHashes.push(normalizedTx);
      ledger.records.push(record);
      writeLedger(ledger);

      let supporterEntry: SupporterBoardEntry | undefined;
      if (entryType === 'donation') {
        const isAnonymous = Boolean(invoice.donationIsAnonymous);
        const authorDisplayName = isAnonymous
          ? 'Anonymous Backer'
          : sanitizeBoardText(invoice.donationAuthorName || invoice.username, 48) || 'Project Backer';
        const feedbackCategory = sanitizeFeedbackSentiment(invoice.donationFeedbackCategory);
        const message = sanitizeBoardText(invoice.donationMessage || '', 500);
        const board = readSupporterBoard();
        const storedEntry: StoredSupporterBoardEntry = {
          id: `sup-${crypto.randomBytes(6).toString('hex')}`,
          _userId: invoice.userId,
          entryKind: 'donation',
          isAnonymous,
          authorDisplayName,
          tierId: 'donation',
          tierName: 'Project Donation',
          tierBadgeColor: 'amber',
          amountUsd: invoice.usdAmount,
          currency: invoice.token,
          nativeAmount: invoice.expectedAmountDisplay,
          chain: invoice.chain,
          paymentMethod: 'crypto-onchain',
          feedbackCategory,
          message,
          referenceId: cleanTx,
          explorerUrl,
          verified: true,
          createdAt: nowIso
        };
        board.entries.push(storedEntry);
        writeSupporterBoard(board);
        supporterEntry = toPublicBoardEntry(storedEntry, invoice.userId);
      }

      return {
        entryType,
        invoice,
        record,
        subscriptionStatus,
        tierExpiresAt,
        ...(supporterEntry ? { supporterEntry } : {})
      };
    } finally {
      this.inFlightInvoiceIds.delete(cleanInvoiceId);
      this.inFlightTxHashes.delete(normalizedTx);
    }
  }

  recordAdminGrant(params: {
    userId: string;
    username: string;
    tierId: string;
    tierName: string;
    actorUsername: string;
  }): BillingLedgerRecord {
    const ledger = readLedger();
    const record: BillingLedgerRecord = {
      id: `led-${crypto.randomBytes(6).toString('hex')}`,
      userId: params.userId,
      username: params.username,
      tierId: params.tierId,
      tierName: params.tierName,
      method: 'admin-grant',
      billingCycle: 'grant',
      amountUsd: 0,
      currency: 'USD',
      referenceId: `admin-grant:${params.actorUsername}`,
      status: 'settled',
      createdAt: new Date().toISOString()
    };
    ledger.records.push(record);
    writeLedger(ledger);
    return record;
  }

  getUserBillingHistory(userId: string): {
    invoices: CryptoPaymentInvoice[];
    records: BillingLedgerRecord[];
  } {
    const ledger = readLedger();
    const now = Date.now();
    const invoices = ledger.invoices
      .filter((i) => i.userId === userId)
      .map((i) => ({
        ...i,
        status: i.status === 'pending' && now > Date.parse(i.expiresAt) ? ('expired' as const) : i.status
      }))
      .slice(-20)
      .reverse();
    const records = ledger.records
      .filter((r) => r.userId === userId)
      .slice(-30)
      .reverse();
    return { invoices, records };
  }

  getAdminLedgerSummary(): {
    totalRevenueUsd: number;
    fiatRevenueUsd: number;
    cryptoRevenueUsd: number;
    settledCount: number;
    pendingInvoicesCount: number;
    records: BillingLedgerRecord[];
    recentInvoices: CryptoPaymentInvoice[];
  } {
    const ledger = readLedger();
    const now = Date.now();
    let totalRevenueUsd = 0;
    let fiatRevenueUsd = 0;
    let cryptoRevenueUsd = 0;
    let settledCount = 0;

    for (const r of ledger.records) {
      if (r.status === 'refunded' || r.status === 'cancelled') continue;
      settledCount++;
      totalRevenueUsd += r.amountUsd;
      if (r.method === 'stripe-card') fiatRevenueUsd += r.amountUsd;
      if (r.method === 'crypto-onchain') cryptoRevenueUsd += r.amountUsd;
    }

    const pendingInvoicesCount = ledger.invoices.filter(
      (i) => i.status === 'pending' && now <= Date.parse(i.expiresAt)
    ).length;

    return {
      totalRevenueUsd: Math.round(totalRevenueUsd * 100) / 100,
      fiatRevenueUsd: Math.round(fiatRevenueUsd * 100) / 100,
      cryptoRevenueUsd: Math.round(cryptoRevenueUsd * 100) / 100,
      settledCount,
      pendingInvoicesCount,
      records: [...ledger.records].reverse().slice(0, 100),
      recentInvoices: [...ledger.invoices].reverse().slice(0, 50)
    };
  }

  // -------------------------------------------------------------------------
  // SUPPORTER & FOUNDER MESSAGE BOARD (PERMANENT TIMESTAMPS + FEEDBACK)
  // -------------------------------------------------------------------------
  postFounderBoardEntry(params: {
    user: AuthUserPublic;
    tierName?: string;
    tierBadgeColor?: TierBadgeColor;
    isAnonymous: boolean;
    authorName?: string;
    feedbackCategory: SupporterFeedbackSentiment;
    message: string;
  }): SupporterBoardEntry {
    const cleanMsg = sanitizeBoardText(params.message, 500);
    if (cleanMsg.length < 2) {
      throw new Error('Please write at least 2 characters for your Founder Wall message or feedback.');
    }
    const isAnonymous = Boolean(params.isAnonymous);
    const authorDisplayName = isAnonymous
      ? 'Anonymous Backer'
      : sanitizeBoardText(params.authorName || params.user.displayName || params.user.username, 48) ||
        'Founder Backer';
    const feedbackCategory = sanitizeFeedbackSentiment(params.feedbackCategory);
    const nowIso = new Date().toISOString();

    const board = readSupporterBoard();
    const existing = board.entries.find(
      (e) => e.entryKind === 'founder-tier' && e._userId === params.user.id
    );

    if (existing) {
      // Keep original permanent createdAt timestamp immutable as proof of early backing
      existing.isAnonymous = isAnonymous;
      existing.authorDisplayName = authorDisplayName;
      existing.tierId = params.user.tierId;
      existing.tierName = params.tierName || params.user.tierName || 'Sovereign Founder';
      existing.tierBadgeColor = params.tierBadgeColor || params.user.tierBadgeColor || 'amber';
      existing.feedbackCategory = feedbackCategory;
      existing.message = cleanMsg;
      existing.updatedAt = nowIso;
      writeSupporterBoard(board);
      return toPublicBoardEntry(existing, params.user.id);
    }

    const ledger = readLedger();
    const paidTierRecord = [...ledger.records]
      .reverse()
      .find(
        (r) =>
          r.userId === params.user.id &&
          r.entryType !== 'donation' &&
          r.status === 'settled' &&
          r.amountUsd > 0
      );

    const created: StoredSupporterBoardEntry = {
      id: `fnd-${crypto.randomBytes(6).toString('hex')}`,
      _userId: params.user.id,
      entryKind: 'founder-tier',
      isAnonymous,
      authorDisplayName,
      tierId: params.user.tierId,
      tierName: params.tierName || params.user.tierName || 'Sovereign Founder',
      tierBadgeColor: params.tierBadgeColor || params.user.tierBadgeColor || 'amber',
      amountUsd: paidTierRecord?.amountUsd || 0,
      currency: paidTierRecord?.currency || 'USD',
      ...(paidTierRecord?.nativeAmount ? { nativeAmount: paidTierRecord.nativeAmount } : {}),
      ...(paidTierRecord?.chain ? { chain: paidTierRecord.chain } : {}),
      paymentMethod:
        paidTierRecord?.method === 'crypto-onchain'
          ? 'crypto-onchain'
          : paidTierRecord?.method === 'stripe-card'
            ? 'stripe-card'
            : 'tier-membership',
      feedbackCategory,
      message: cleanMsg,
      ...(paidTierRecord?.explorerUrl ? { explorerUrl: paidTierRecord.explorerUrl } : {}),
      verified: true,
      createdAt: nowIso
    };
    board.entries.push(created);
    writeSupporterBoard(board);
    return toPublicBoardEntry(created, params.user.id);
  }

  listSupporterBoard(viewerUserId?: string): {
    entries: SupporterBoardEntry[];
    summary: SupporterBoardSummary;
  } {
    const board = readSupporterBoard();
    let totalDonationsUsd = 0;
    let donationCount = 0;
    let founderCount = 0;
    let critiqueCount = 0;
    let praiseCount = 0;
    let suggestionCount = 0;

    for (const item of board.entries) {
      if (item.entryKind === 'donation') {
        donationCount++;
        totalDonationsUsd += Number(item.amountUsd || 0);
      } else {
        founderCount++;
      }
      if (item.feedbackCategory === 'critique') critiqueCount++;
      else if (item.feedbackCategory === 'praise') praiseCount++;
      else if (item.feedbackCategory === 'suggestion') suggestionCount++;
    }

    const entries = [...board.entries]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 300)
      .map((item) => toPublicBoardEntry(item, viewerUserId));

    return {
      entries,
      summary: {
        totalEntries: board.entries.length,
        totalDonationsUsd: Math.round(totalDonationsUsd * 100) / 100,
        donationCount,
        founderCount,
        critiqueCount,
        praiseCount,
        suggestionCount
      }
    };
  }

  deleteSupporterBoardEntry(entryId: string): boolean {
    const cleanId = String(entryId || '').trim();
    const board = readSupporterBoard();
    const before = board.entries.length;
    board.entries = board.entries.filter((e) => e.id !== cleanId);
    if (board.entries.length === before) return false;
    writeSupporterBoard(board);
    return true;
  }
}

export const billingService = new BillingService();
