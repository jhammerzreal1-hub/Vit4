/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 * (TWENTY 47 PROTOCOL - GENESIS NODE / LYSANDER CORE EULA / H-FID Forensic License v1.1).
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { internalSecretsHandler } from './internalSecretsHandler';

export type CdpEnvironmentMode = 'sandbox' | 'live';
export type CdpEvmNetwork = 'base' | 'base-sepolia' | 'ethereum';

export interface CdpStoredConfig {
  environment: CdpEnvironmentMode;
  defaultNetwork: CdpEvmNetwork;
  defaultAccountName: string;
  updatedAt: string;
}

export interface CdpEvmAccountSummary {
  address: string;
  name?: string;
  network?: string;
  createdAt?: string;
}

export interface CdpTokenInfo {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
}

export const CDP_BASE_TOKENS: Record<string, CdpTokenInfo> = {
  ETH: {
    symbol: 'ETH',
    name: 'Ether (Native)',
    address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    decimals: 18
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin (Base)',
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    decimals: 6
  },
  cbBTC: {
    symbol: 'cbBTC',
    name: 'Coinbase Wrapped BTC',
    address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
    decimals: 8
  },
  WETH: {
    symbol: 'WETH',
    name: 'Wrapped Ether (Base)',
    address: '0x4200000000000000000000000000000000000006',
    decimals: 18
  },
  AERO: {
    symbol: 'AERO',
    name: 'Aerodrome Finance',
    address: '0x940181a94A35A4569E4529A3CDfB74e38FD98631',
    decimals: 18
  }
};

export const CDP_ETH_TOKENS: Record<string, CdpTokenInfo> = {
  ETH: {
    symbol: 'ETH',
    name: 'Ether (Native)',
    address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    decimals: 18
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin (Ethereum)',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    decimals: 6
  },
  WBTC: {
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    decimals: 8
  },
  cbBTC: {
    symbol: 'cbBTC',
    name: 'Coinbase Wrapped BTC',
    address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
    decimals: 8
  }
};

const CDP_API_HOST = 'api.cdp.coinbase.com';
const CDP_SANDBOX_HOST = 'sandbox.cdp.coinbase.com';
const CONFIG_FILE = path.join(process.cwd(), 'data', 'cdp_config.json');

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function loadConfig(): CdpStoredConfig {
  const envDefault: CdpEnvironmentMode =
    String(internalSecretsHandler.getSecret('CDP_ENV') || process.env.CDP_ENV || 'sandbox')
      .trim()
      .toLowerCase() === 'live'
      ? 'live'
      : 'sandbox';
  const fallback: CdpStoredConfig = {
    environment: envDefault,
    defaultNetwork: envDefault === 'live' ? 'base' : 'base-sepolia',
    defaultAccountName: 'sovereign-trader',
    updatedAt: new Date().toISOString()
  };
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      if (parsed && typeof parsed === 'object') {
        return {
          environment: parsed.environment === 'live' ? 'live' : 'sandbox',
          defaultNetwork:
            parsed.defaultNetwork === 'base' ||
            parsed.defaultNetwork === 'ethereum' ||
            parsed.defaultNetwork === 'base-sepolia'
              ? parsed.defaultNetwork
              : fallback.defaultNetwork,
          defaultAccountName:
            typeof parsed.defaultAccountName === 'string' && parsed.defaultAccountName.trim()
              ? parsed.defaultAccountName.trim().slice(0, 48)
              : fallback.defaultAccountName,
          updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : fallback.updatedAt
        };
      }
    }
  } catch {}
  return fallback;
}

function saveConfig(next: CdpStoredConfig): CdpStoredConfig {
  try {
    fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
    const tmp = `${CONFIG_FILE}.tmp.${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify(next, null, 2), { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(tmp, CONFIG_FILE);
  } catch {}
  return next;
}

function getCdpCredentials() {
  const apiKeyId = (internalSecretsHandler.getSecret('CDP_API_KEY_ID') || '').trim();
  const apiKeySecretRaw = (internalSecretsHandler.getSecret('CDP_API_KEY_SECRET') || '').trim();
  const walletSecretRaw = (internalSecretsHandler.getSecret('CDP_WALLET_SECRET') || '').trim();

  // Support escaped newlines in PEM keys pasted into env/secrets
  const apiKeySecret = apiKeySecretRaw.includes('\\n')
    ? apiKeySecretRaw.replace(/\\n/g, '\n')
    : apiKeySecretRaw;
  const walletSecret = walletSecretRaw.includes('\\n')
    ? walletSecretRaw.replace(/\\n/g, '\n')
    : walletSecretRaw;

  return {
    apiKeyId,
    apiKeySecret,
    walletSecret,
    hasApiKey: Boolean(apiKeyId && apiKeySecret),
    hasWalletSecret: Boolean(walletSecret)
  };
}

function detectKeyAlgorithm(apiKeySecret: string): 'ECDSA (ES256)' | 'Ed25519 (EdDSA)' | 'UNKNOWN' {
  if (!apiKeySecret) return 'UNKNOWN';
  if (apiKeySecret.includes('BEGIN ') && apiKeySecret.includes('PRIVATE KEY')) {
    try {
      const keyObj = crypto.createPrivateKey(apiKeySecret);
      if (keyObj.asymmetricKeyType === 'ed25519') return 'Ed25519 (EdDSA)';
      if (keyObj.asymmetricKeyType === 'ec') return 'ECDSA (ES256)';
    } catch {
      return 'ECDSA (ES256)';
    }
  }
  try {
    const raw = Buffer.from(apiKeySecret, 'base64');
    if (raw.length === 64 || raw.length === 32) return 'Ed25519 (EdDSA)';
  } catch {}
  return 'UNKNOWN';
}

/**
 * Generates a short-lived (120s) Coinbase CDP / Advanced Trade API Bearer JWT.
 * Automatically supports:
 *  - Ed25519 (EdDSA) base64 64-byte keypair or 32-byte seed (CDP Portal default)
 *  - Ed25519 (EdDSA) PKCS#8 PEM private keys
 *  - ECDSA (ES256 / P-256) SEC1 or PKCS#8 PEM private keys (legacy / Advanced Trade SDK)
 */
function buildCdpApiJwt(
  method: string,
  requestPath: string,
  apiKeyId: string,
  apiKeySecret: string,
  host: string = CDP_API_HOST,
  useSingleUriClaim = false
): string {
  const now = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomBytes(16).toString('hex');
  const cleanPath = requestPath.split('?')[0];
  const uri = `${method.toUpperCase()} ${host}${cleanPath}`;

  const payload: Record<string, unknown> = {
    sub: apiKeyId,
    iss: 'cdp',
    aud: ['cdp_service'],
    nbf: now,
    exp: now + 120,
    ...(useSingleUriClaim ? { uri } : { uri, uris: [uri] })
  };

  const isPem = apiKeySecret.includes('BEGIN ') && apiKeySecret.includes('PRIVATE KEY');

  if (isPem) {
    const keyObj = crypto.createPrivateKey(apiKeySecret);
    if (keyObj.asymmetricKeyType === 'ed25519') {
      const header = { alg: 'EdDSA', kid: apiKeyId, typ: 'JWT', nonce };
      const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
      const sig = crypto.sign(null, Buffer.from(signingInput, 'utf8'), keyObj);
      return `${signingInput}.${base64UrlEncode(sig)}`;
    }
    const header = { alg: 'ES256', kid: apiKeyId, typ: 'JWT', nonce };
    const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
    const signature = crypto.sign('sha256', Buffer.from(signingInput, 'utf8'), {
      key: keyObj,
      dsaEncoding: 'ieee-p1363'
    });
    return `${signingInput}.${base64UrlEncode(signature)}`;
  }

  // Ed25519 base64 secret key format (64 bytes: 32-byte seed + 32-byte pubkey, or 32-byte seed)
  const rawBytes = Buffer.from(apiKeySecret, 'base64');
  if (rawBytes.length !== 64 && rawBytes.length !== 32) {
    throw new Error(
      'Unrecognized CDP API Key Secret format. Provide either an Ed25519 base64 secret key (default) or an ECDSA/Ed25519 PEM private key.'
    );
  }
  const seed = rawBytes.subarray(0, 32);
  // Wrap 32-byte Ed25519 seed in PKCS#8 DER header: 30 2e 02 01 00 30 05 06 03 2b 65 70 04 22 04 20
  const pkcs8Prefix = Buffer.from('302e020100300506032b657004220420', 'hex');
  const pkcs8Der = Buffer.concat([pkcs8Prefix, seed]);
  const keyObj = crypto.createPrivateKey({ key: pkcs8Der, format: 'der', type: 'pkcs8' });

  const header = { alg: 'EdDSA', kid: apiKeyId, typ: 'JWT', nonce };
  const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
  const sig = crypto.sign(null, Buffer.from(signingInput, 'utf8'), keyObj);
  return `${signingInput}.${base64UrlEncode(sig)}`;
}

async function advancedTradeApiRequest<T>(
  method: 'GET' | 'POST',
  requestPath: string,
  body?: Record<string, unknown>
): Promise<T> {
  const creds = getCdpCredentials();
  if (!creds.hasApiKey) {
    throw new Error(
      'Coinbase CDP Secret API Key is not configured yet. Add CDP_API_KEY_ID and CDP_API_KEY_SECRET in Settings -> Secrets or the API Keys Vault.'
    );
  }
  const jwt = buildCdpApiJwt(method, requestPath, creds.apiKeyId, creds.apiKeySecret, 'api.coinbase.com', true);
  const res = await fetch(`https://api.coinbase.com${requestPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let parsed: any = {};
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { raw: text };
  }
  if (!res.ok) {
    throw new Error(parsed?.message || parsed?.error_details || parsed?.error || `Advanced Trade API HTTP ${res.status}`);
  }
  return parsed as T;
}

/**
 * Generates Coinbase CDP X-Wallet-Auth JWT for signing wallet mutations & trade execution.
 */
function buildCdpWalletAuthJwt(
  method: string,
  requestPath: string,
  walletSecret: string,
  requestBody?: Record<string, unknown>,
  host: string = CDP_API_HOST
): string {
  const now = Math.floor(Date.now() / 1000);
  const jti = crypto.randomUUID();
  const cleanPath = requestPath.split('?')[0];
  const uri = `${method.toUpperCase()} ${host}${cleanPath}`;

  const payload: Record<string, unknown> = {
    iat: now,
    nbf: now,
    exp: now + 120,
    jti,
    uris: [uri]
  };

  if (requestBody && Object.keys(requestBody).length > 0) {
    // Deterministic sorted keys SHA-256 request body hash per CDP wallet auth spec
    const sorted = JSON.stringify(sortObjectKeys(requestBody));
    payload.reqHash = crypto.createHash('sha256').update(sorted).digest('hex');
  }

  let privateKey: crypto.KeyObject;
  if (walletSecret.includes('BEGIN ')) {
    privateKey = crypto.createPrivateKey(walletSecret);
  } else {
    const der = Buffer.from(walletSecret, 'base64');
    privateKey = crypto.createPrivateKey({ key: der, format: 'der', type: 'pkcs8' });
  }

  const header = { alg: 'ES256', typ: 'JWT' };
  const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
  const signature = crypto.sign('sha256', Buffer.from(signingInput, 'utf8'), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363'
  });
  return `${signingInput}.${base64UrlEncode(signature)}`;
}

function sortObjectKeys(val: unknown): unknown {
  if (Array.isArray(val)) return val.map(sortObjectKeys);
  if (val && typeof val === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(val as Record<string, unknown>).sort()) {
      out[key] = sortObjectKeys((val as Record<string, unknown>)[key]);
    }
    return out;
  }
  return val;
}

async function cdpApiRequest<T>(
  method: 'GET' | 'POST',
  requestPath: string,
  options?: { body?: Record<string, unknown>; requiresWalletAuth?: boolean; useSandboxHost?: boolean }
): Promise<T> {
  const creds = getCdpCredentials();
  if (!creds.hasApiKey) {
    throw new Error(
      'Coinbase CDP API credentials are not configured yet. Add CDP_API_KEY_ID and CDP_API_KEY_SECRET in Settings -> Secrets or the API Keys Vault.'
    );
  }

  const cfg = loadConfig();
  const targetHost =
    options?.useSandboxHost === true
      ? CDP_SANDBOX_HOST
      : options?.useSandboxHost === false
        ? CDP_API_HOST
        : cfg.environment === 'sandbox' && !requestPath.startsWith('/platform/v2/evm/')
          ? CDP_SANDBOX_HOST
          : CDP_API_HOST;

  const bearerJwt = buildCdpApiJwt(method, requestPath, creds.apiKeyId, creds.apiKeySecret, targetHost);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${bearerJwt}`,
    'Content-Type': 'application/json',
    Accept: 'application/json'
  };

  if (options?.requiresWalletAuth) {
    if (!creds.hasWalletSecret) {
      throw new Error(
        'CDP_WALLET_SECRET is required to create wallets or execute trades. Add CDP_WALLET_SECRET in Settings -> Secrets or the API Keys Vault.'
      );
    }
    headers['X-Wallet-Auth'] = buildCdpWalletAuthJwt(
      method,
      requestPath,
      creds.walletSecret,
      options.body,
      targetHost
    );
  }

  const res = await fetch(`https://${targetHost}${requestPath}`, {
    method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined
  });

  const text = await res.text();
  let parsed: any = {};
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { raw: text };
  }

  if (!res.ok) {
    const msg =
      parsed?.errorMessage ||
      parsed?.message ||
      parsed?.error ||
      `Coinbase CDP API returned HTTP ${res.status}`;
    throw new Error(msg);
  }

  return parsed as T;
}

async function fetchPublicSpotPriceUsd(symbol: string): Promise<number | null> {
  const sym = symbol.toUpperCase();
  if (sym === 'USDC' || sym === 'USDT' || sym === 'USD') return 1;
  const pairMap: Record<string, string> = {
    ETH: 'ETH-USD',
    WETH: 'ETH-USD',
    BTC: 'BTC-USD',
    WBTC: 'BTC-USD',
    CBBTC: 'BTC-USD',
    SOL: 'SOL-USD',
    AERO: 'AERO-USD'
  };
  const pair = pairMap[sym];
  if (!pair) return null;
  try {
    const res = await fetch(`https://api.coinbase.com/v2/prices/${pair}/spot`, {
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const amount = parseFloat(data?.data?.amount);
    return Number.isFinite(amount) && amount > 0 ? amount : null;
  } catch {
    return null;
  }
}

function toBaseUnits(amountDecimal: string, decimals: number): string {
  const clean = String(amountDecimal || '0').trim();
  if (!/^\d+(\.\d+)?$/.test(clean)) {
    throw new Error('Invalid trade amount format.');
  }
  const [whole, frac = ''] = clean.split('.');
  const paddedFrac = (frac + '0'.repeat(decimals)).slice(0, decimals);
  const combined = `${whole}${paddedFrac}`.replace(/^0+/, '') || '0';
  return combined;
}

function fromBaseUnits(rawUnits: string, decimals: number): string {
  const digits = String(rawUnits || '0').replace(/\D/g, '') || '0';
  if (decimals <= 0) return digits;
  const padded = digits.padStart(decimals + 1, '0');
  const whole = padded.slice(0, -decimals);
  const frac = padded.slice(-decimals).replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole;
}

class CoinbaseCdpService {
  public getStatus() {
    const cfg = loadConfig();
    const creds = getCdpCredentials();
    return {
      configured: creds.hasApiKey,
      hasApiKey: creds.hasApiKey,
      hasWalletSecret: creds.hasWalletSecret,
      keyAlgorithm: creds.hasApiKey ? detectKeyAlgorithm(creds.apiKeySecret) : null,
      apiKeyIdPreview: creds.apiKeyId
        ? `${creds.apiKeyId.slice(0, 6)}...${creds.apiKeyId.slice(-4)}`
        : null,
      environment: cfg.environment,
      activeApiHost: cfg.environment === 'sandbox' ? CDP_SANDBOX_HOST : CDP_API_HOST,
      evmApiHost: CDP_API_HOST,
      advancedTradeHost: 'api.coinbase.com',
      defaultNetwork: cfg.defaultNetwork,
      defaultAccountName: cfg.defaultAccountName,
      capabilities: {
        nonCustodialWallets: creds.hasApiKey && creds.hasWalletSecret,
        tradeApiSwaps: creds.hasApiKey && creds.hasWalletSecret,
        advancedTradeApi: creds.hasApiKey,
        onchainData: creds.hasApiKey,
        testnetFaucet: creds.hasApiKey,
        x402Payments: creds.hasApiKey && creds.hasWalletSecret,
        publicMarketSpot: true
      },
      networks: [
        { id: 'base-sepolia', label: 'Base Sepolia (Testnet)', mode: 'sandbox' },
        { id: 'base', label: 'Base Mainnet', mode: 'live' },
        { id: 'ethereum', label: 'Ethereum Mainnet', mode: 'live' }
      ],
      tokens: {
        base: Object.values(CDP_BASE_TOKENS),
        'base-sepolia': Object.values(CDP_BASE_TOKENS),
        ethereum: Object.values(CDP_ETH_TOKENS)
      },
      agentMcpTools: {
        coinbaseMcp: {
          name: 'Coinbase MCP (Trading)',
          endpoint: 'https://agents.coinbase.com/mcp',
          cliPackage: 'npm install -g @coinbase/coinbase-cli',
          command: 'coinbase',
          scope: 'Trade 900+ crypto pairs, US equities & derivatives on Coinbase'
        },
        walletMcp: {
          name: 'Wallet MCP (Self-Custody DeFi)',
          endpoint: 'https://wallet-mcp.coinbase.com',
          cliPackage: null,
          command: 'https://wallet-mcp.coinbase.com',
          scope: 'DeFi swaps, balances, message signing & x402 payments via Coinbase Wallet'
        },
        cdpMcp: {
          name: 'CDP MCP (Builder & Server Wallets)',
          endpoint: 'cdp mcp',
          cliPackage: 'npm install -g @coinbase/cdp-cli',
          command: 'cdp mcp',
          scope: 'Server wallets, onchain data, smart accounts & x402 APIs'
        }
      },
      cliQuickstart: {
        install: 'npm install -g @coinbase/cdp-cli',
        configureKey:
          cfg.environment === 'sandbox'
            ? 'cdp env sandbox --key-file ~/Downloads/cdp_api_key.json'
            : 'cdp env live --key-file ./cdp_api_key.json',
        configureWalletSecret:
          cfg.environment === 'sandbox'
            ? 'cdp accounts list'
            : 'cdp env live --wallet-secret-file ./cdp_wallet_secret.txt',
        createAccount: `cdp evm accounts create name=${cfg.defaultAccountName}`,
        fundTestnet: 'cdp evm faucet address=<ACCOUNT_ADDRESS> network=base-sepolia token=eth',
        mcpServer: 'cdp mcp'
      }
    };
  }

  public updateConfig(patch: Partial<CdpStoredConfig>): CdpStoredConfig {
    const cur = loadConfig();
    const next: CdpStoredConfig = {
      environment: patch.environment === 'live' ? 'live' : patch.environment === 'sandbox' ? 'sandbox' : cur.environment,
      defaultNetwork:
        patch.defaultNetwork === 'base' ||
        patch.defaultNetwork === 'ethereum' ||
        patch.defaultNetwork === 'base-sepolia'
          ? patch.defaultNetwork
          : cur.defaultNetwork,
      defaultAccountName:
        typeof patch.defaultAccountName === 'string' && /^[a-zA-Z0-9-]{2,36}$/.test(patch.defaultAccountName.trim())
          ? patch.defaultAccountName.trim()
          : cur.defaultAccountName,
      updatedAt: new Date().toISOString()
    };
    return saveConfig(next);
  }

  public async listEvmAccounts(): Promise<CdpEvmAccountSummary[]> {
    const data = await cdpApiRequest<{ accounts?: any[] }>('GET', '/platform/v2/evm/accounts');
    const raw = Array.isArray(data?.accounts) ? data.accounts : [];
    return raw.map((a) => ({
      address: String(a.address || ''),
      name: typeof a.name === 'string' ? a.name : undefined,
      createdAt: typeof a.createdAt === 'string' ? a.createdAt : undefined
    }));
  }

  public async createEvmAccount(name?: string): Promise<CdpEvmAccountSummary> {
    const cleanName = typeof name === 'string' ? name.trim().replace(/[^a-zA-Z0-9-]/g, '-').slice(0, 36) : '';
    const body: Record<string, unknown> = cleanName ? { name: cleanName } : {};
    const created = await cdpApiRequest<any>('POST', '/platform/v2/evm/accounts', {
      body,
      requiresWalletAuth: true
    });
    return {
      address: String(created?.address || ''),
      name: typeof created?.name === 'string' ? created.name : cleanName || undefined,
      createdAt: new Date().toISOString()
    };
  }

  public async requestTestnetFaucet(input: {
    address: string;
    network?: 'base-sepolia' | 'ethereum-sepolia';
    token?: 'eth' | 'usdc';
  }) {
    const address = String(input.address || '').trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new Error('Valid 0x EVM wallet address is required for faucet funding.');
    }
    const network = input.network === 'ethereum-sepolia' ? 'ethereum-sepolia' : 'base-sepolia';
    const token = input.token === 'usdc' ? 'usdc' : 'eth';
    const data = await cdpApiRequest<any>('POST', '/platform/v2/evm/faucet', {
      body: { address, network, token }
    });
    return {
      transactionHash: data?.transactionHash || data?.txHash || null,
      network,
      token,
      address,
      explorerUrl: data?.transactionHash
        ? `https://sepolia.basescan.org/tx/${data.transactionHash}`
        : null
    };
  }

  public async getTokenBalances(network: CdpEvmNetwork, address: string) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new Error('Valid 0x EVM address is required.');
    }
    const safeNet = network === 'ethereum' ? 'ethereum' : network === 'base' ? 'base' : 'base-sepolia';
    const data = await cdpApiRequest<any>('GET', `/platform/v2/evm/token-balances/${safeNet}/${address}`);
    return {
      network: safeNet,
      address,
      balances: Array.isArray(data?.balances) ? data.balances : []
    };
  }

  public async getTradeQuote(input: {
    network: CdpEvmNetwork;
    fromSymbol: string;
    toSymbol: string;
    fromAmount: string;
    takerAddress?: string;
    slippageBps?: number;
  }) {
    const net: CdpEvmNetwork =
      input.network === 'ethereum' ? 'ethereum' : input.network === 'base' ? 'base' : 'base-sepolia';
    const tokenTable = net === 'ethereum' ? CDP_ETH_TOKENS : CDP_BASE_TOKENS;
    const fromToken = tokenTable[input.fromSymbol] || tokenTable.ETH;
    const toToken = tokenTable[input.toSymbol] || tokenTable.USDC;
    if (fromToken.symbol === toToken.symbol) {
      throw new Error('Select two different tokens to quote a swap.');
    }
    const amountNum = parseFloat(String(input.fromAmount || '0'));
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      throw new Error('Trade amount must be greater than zero.');
    }

    const creds = getCdpCredentials();
    const fromAmountBase = toBaseUnits(String(input.fromAmount), fromToken.decimals);
    const slippageBps = Math.min(500, Math.max(10, Number(input.slippageBps || 100)));

    // Use real Coinbase CDP Swap Quote API when configured on a supported mainnet with a taker address
    if (
      creds.hasApiKey &&
      (net === 'base' || net === 'ethereum') &&
      input.takerAddress &&
      /^0x[a-fA-F0-9]{40}$/.test(input.takerAddress)
    ) {
      try {
        const quote = await cdpApiRequest<any>('POST', '/platform/v2/evm/swaps/quote', {
          body: {
            network: net,
            fromToken: fromToken.address,
            toToken: toToken.address,
            fromAmount: fromAmountBase,
            taker: input.takerAddress,
            slippageBps
          }
        });
        const toAmountFormatted = quote?.toAmount
          ? fromBaseUnits(String(quote.toAmount), toToken.decimals)
          : null;
        return {
          source: 'CDP_LIVE_SWAP_API' as const,
          network: net,
          fromToken,
          toToken,
          fromAmount: String(input.fromAmount),
          estimatedToAmount: toAmountFormatted || '0',
          minToAmount: quote?.minToAmount
            ? fromBaseUnits(String(quote.minToAmount), toToken.decimals)
            : null,
          slippageBps,
          liquidityAvailable: quote?.liquidityAvailable !== false,
          rawQuote: quote
        };
      } catch (cdpErr: any) {
        // Fall through to live Coinbase public spot preview while surfacing the CDP note
        const [fromUsd, toUsd] = await Promise.all([
          fetchPublicSpotPriceUsd(fromToken.symbol),
          fetchPublicSpotPriceUsd(toToken.symbol)
        ]);
        if (fromUsd && toUsd) {
          const est = (amountNum * fromUsd) / toUsd;
          return {
            source: 'COINBASE_PUBLIC_SPOT_PREVIEW' as const,
            network: net,
            fromToken,
            toToken,
            fromAmount: String(input.fromAmount),
            estimatedToAmount: est.toFixed(toToken.decimals <= 6 ? 4 : 6),
            minToAmount: (est * (1 - slippageBps / 10000)).toFixed(toToken.decimals <= 6 ? 4 : 6),
            slippageBps,
            fromPriceUsd: fromUsd,
            toPriceUsd: toUsd,
            note: `Live CDP swap API returned: ${cdpErr?.message || 'unavailable'}. Showing real Coinbase spot rate preview.`
          };
        }
        throw cdpErr;
      }
    }

    // Real Coinbase public spot price preview (when in sandbox/testnet or before CDP keys are saved)
    const [fromUsd, toUsd] = await Promise.all([
      fetchPublicSpotPriceUsd(fromToken.symbol),
      fetchPublicSpotPriceUsd(toToken.symbol)
    ]);
    if (!fromUsd || !toUsd) {
      throw new Error('Unable to fetch live Coinbase spot prices for the selected pair right now.');
    }
    const est = (amountNum * fromUsd) / toUsd;
    return {
      source: 'COINBASE_PUBLIC_SPOT_PREVIEW' as const,
      network: net,
      fromToken,
      toToken,
      fromAmount: String(input.fromAmount),
      estimatedToAmount: est.toFixed(toToken.decimals <= 6 ? 4 : 6),
      minToAmount: (est * (1 - slippageBps / 10000)).toFixed(toToken.decimals <= 6 ? 4 : 6),
      slippageBps,
      fromPriceUsd: fromUsd,
      toPriceUsd: toUsd,
      note: creds.hasApiKey
        ? 'Select Base or Ethereum Mainnet and a CDP account address for an executable CDP Swap Quote.'
        : 'Showing real Coinbase Spot market rate. Add CDP_API_KEY_ID, CDP_API_KEY_SECRET & CDP_WALLET_SECRET to execute onchain trades.'
    };
  }

  public async executeTradeSwap(input: {
    network: 'base' | 'ethereum';
    accountAddress: string;
    fromSymbol: string;
    toSymbol: string;
    fromAmount: string;
    slippageBps?: number;
  }) {
    const net = input.network === 'ethereum' ? 'ethereum' : 'base';
    if (!/^0x[a-fA-F0-9]{40}$/.test(String(input.accountAddress || '').trim())) {
      throw new Error('Valid 0x CDP EVM account address is required to execute a trade.');
    }
    const tokenTable = net === 'ethereum' ? CDP_ETH_TOKENS : CDP_BASE_TOKENS;
    const fromToken = tokenTable[input.fromSymbol];
    const toToken = tokenTable[input.toSymbol];
    if (!fromToken || !toToken || fromToken.symbol === toToken.symbol) {
      throw new Error('Invalid token swap pair.');
    }
    const fromAmountBase = toBaseUnits(String(input.fromAmount), fromToken.decimals);
    const slippageBps = Math.min(500, Math.max(10, Number(input.slippageBps || 100)));

    // Step 1: Request executable swap transaction from Coinbase CDP Trade API
    const swapOrder = await cdpApiRequest<any>('POST', '/platform/v2/evm/swaps', {
      body: {
        network: net,
        fromToken: fromToken.address,
        toToken: toToken.address,
        fromAmount: fromAmountBase,
        taker: input.accountAddress,
        slippageBps
      },
      requiresWalletAuth: true
    });

    const tx = swapOrder?.transaction;
    if (!tx?.to || !tx?.data) {
      throw new Error('CDP Swap API did not return an executable transaction payload (check liquidity or token allowance).');
    }

    // Step 2: Sign & broadcast via CDP EVM Account send transaction endpoint
    const sent = await cdpApiRequest<any>(
      'POST',
      `/platform/v2/evm/accounts/${input.accountAddress}/send/transaction`,
      {
        body: {
          network: net,
          transaction: {
            to: tx.to,
            data: tx.data,
            value: tx.value || '0'
          }
        },
        requiresWalletAuth: true
      }
    );

    const txHash = sent?.transactionHash || sent?.txHash || null;
    const explorerBase = net === 'ethereum' ? 'https://etherscan.io/tx/' : 'https://basescan.org/tx/';
    return {
      network: net,
      accountAddress: input.accountAddress,
      fromSymbol: fromToken.symbol,
      toSymbol: toToken.symbol,
      fromAmount: input.fromAmount,
      estimatedToAmount: swapOrder?.toAmount
        ? fromBaseUnits(String(swapOrder.toAmount), toToken.decimals)
        : null,
      transactionHash: txHash,
      explorerUrl: txHash ? `${explorerBase}${txHash}` : null
    };
  }

  public async listAdvancedTradeAccounts() {
    const data = await advancedTradeApiRequest<{ accounts?: any[] }>('GET', '/api/v3/brokerage/accounts?limit=50');
    const raw = Array.isArray(data?.accounts) ? data.accounts : [];
    return raw.map((a) => ({
      uuid: String(a.uuid || ''),
      name: String(a.name || a.currency || ''),
      currency: String(a.currency || ''),
      availableBalance: String(a?.available_balance?.value || '0'),
      holdBalance: String(a?.hold?.value || '0'),
      type: String(a.type || 'ACCOUNT_TYPE_CRYPTO')
    }));
  }

  public async placeAdvancedTradeOrder(input: {
    productId: string;
    side: 'BUY' | 'SELL';
    orderType: 'MARKET' | 'LIMIT';
    quoteSizeUsd?: string;
    baseSize?: string;
    limitPrice?: string;
  }) {
    const productId = String(input.productId || 'BTC-USD').trim().toUpperCase();
    if (!/^[A-Z0-9]{2,12}-[A-Z0-9]{2,12}$/.test(productId)) {
      throw new Error('Invalid Advanced Trade product ID (expected format like BTC-USD or ETH-USD).');
    }
    const side = input.side === 'SELL' ? 'SELL' : 'BUY';
    const orderType = input.orderType === 'LIMIT' ? 'LIMIT' : 'MARKET';
    const clientOrderId = `sov-${crypto.randomUUID()}`;

    let orderConfiguration: Record<string, unknown>;
    if (orderType === 'LIMIT') {
      const baseSize = String(input.baseSize || '').trim();
      const limitPrice = String(input.limitPrice || '').trim();
      if (!/^\d+(\.\d+)?$/.test(baseSize) || !/^\d+(\.\d+)?$/.test(limitPrice)) {
        throw new Error('Valid baseSize and limitPrice are required for LIMIT orders.');
      }
      orderConfiguration = {
        limit_limit_gtc: {
          base_size: baseSize,
          limit_price: limitPrice,
          post_only: false
        }
      };
    } else if (side === 'BUY') {
      const quoteSize = String(input.quoteSizeUsd || '').trim();
      if (!/^\d+(\.\d+)?$/.test(quoteSize) || parseFloat(quoteSize) <= 0) {
        throw new Error('Valid quoteSizeUsd (> 0) is required for MARKET BUY orders.');
      }
      orderConfiguration = {
        market_market_ioc: {
          quote_size: quoteSize
        }
      };
    } else {
      const baseSize = String(input.baseSize || '').trim();
      if (!/^\d+(\.\d+)?$/.test(baseSize) || parseFloat(baseSize) <= 0) {
        throw new Error('Valid baseSize (> 0) is required for MARKET SELL orders.');
      }
      orderConfiguration = {
        market_market_ioc: {
          base_size: baseSize
        }
      };
    }

    const result = await advancedTradeApiRequest<any>('POST', '/api/v3/brokerage/orders', {
      client_order_id: clientOrderId,
      product_id: productId,
      side,
      order_configuration: orderConfiguration
    });

    if (result?.success === false) {
      throw new Error(
        result?.error_response?.message ||
          result?.error_response?.preview_failure_reason ||
          'Coinbase Advanced Trade rejected the order.'
      );
    }

    return {
      orderId: result?.success_response?.order_id || result?.order_id || clientOrderId,
      productId,
      side,
      orderType,
      clientOrderId,
      raw: result
    };
  }
}

export const coinbaseCdpService = new CoinbaseCdpService();
