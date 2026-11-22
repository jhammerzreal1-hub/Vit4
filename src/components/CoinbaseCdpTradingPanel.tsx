/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 * (TWENTY 47 PROTOCOL - GENESIS NODE / LYSANDER CORE EULA / H-FID Forensic License v1.1).
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  ArrowRightLeft,
  RefreshCw,
  Plus,
  Droplets,
  ShieldCheck,
  Terminal,
  Copy,
  Check,
  Key,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Zap
} from 'lucide-react';
import { buildAuthHeaders } from '../utils/authClient';
import type { ModuleType } from '../types';

interface CoinbaseCdpTradingPanelProps {
  onSelectModule?: (mod: ModuleType) => void;
}

interface CdpStatusData {
  configured: boolean;
  hasApiKey: boolean;
  hasWalletSecret: boolean;
  keyAlgorithm?: string | null;
  apiKeyIdPreview: string | null;
  environment: 'sandbox' | 'live';
  activeApiHost?: string;
  defaultNetwork: 'base' | 'base-sepolia' | 'ethereum';
  defaultAccountName: string;
  capabilities: {
    nonCustodialWallets: boolean;
    tradeApiSwaps: boolean;
    advancedTradeApi?: boolean;
    onchainData: boolean;
    testnetFaucet: boolean;
    x402Payments: boolean;
    publicMarketSpot: boolean;
  };
  agentMcpTools?: {
    coinbaseMcp: { name: string; endpoint: string; cliPackage: string | null; command: string; scope: string };
    walletMcp: { name: string; endpoint: string; cliPackage: string | null; command: string; scope: string };
    cdpMcp: { name: string; endpoint: string; cliPackage: string | null; command: string; scope: string };
  };
  cliQuickstart: {
    install: string;
    configureKey: string;
    configureWalletSecret: string;
    createAccount: string;
    fundTestnet: string;
    mcpServer: string;
  };
}

interface CdpAccount {
  address: string;
  name?: string;
  createdAt?: string;
}

export const CoinbaseCdpTradingPanel: React.FC<CoinbaseCdpTradingPanelProps> = ({ onSelectModule }) => {
  const [status, setStatus] = useState<CdpStatusData | null>(null);
  const [accounts, setAccounts] = useState<CdpAccount[]>([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string; txUrl?: string | null } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Create Account form
  const [newAccountName, setNewAccountName] = useState('sovereign-trader');

  // Trade / Swap desk state
  const [network, setNetwork] = useState<'base' | 'base-sepolia' | 'ethereum'>('base-sepolia');
  const [fromSymbol, setFromSymbol] = useState('ETH');
  const [toSymbol, setToSymbol] = useState('USDC');
  const [fromAmount, setFromAmount] = useState('0.05');
  const [slippageBps, setSlippageBps] = useState(100);
  const [quote, setQuote] = useState<any | null>(null);

  // Coinbase Advanced Trade v3 desk state
  const [advAccounts, setAdvAccounts] = useState<
    Array<{ uuid: string; name: string; currency: string; availableBalance: string; holdBalance: string }>
  >([]);
  const [advProductId, setAdvProductId] = useState('BTC-USD');
  const [advSide, setAdvSide] = useState<'BUY' | 'SELL'>('BUY');
  const [advOrderType, setAdvOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [advQuoteUsd, setAdvQuoteUsd] = useState('25');
  const [advBaseSize, setAdvBaseSize] = useState('0.001');
  const [advLimitPrice, setAdvLimitPrice] = useState('');

  const cdpFetch = useCallback(async (url: string, init?: RequestInit) => {
    const res = await fetch(url, {
      ...init,
      credentials: 'include',
      headers: buildAuthHeaders({
        'Content-Type': 'application/json',
        ...(init?.headers as Record<string, string> | undefined)
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.success === false) {
      throw new Error(data?.error || `Request failed (${res.status})`);
    }
    return data;
  }, []);

  const loadStatusAndAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const st = await cdpFetch('/api/cdp/status', { method: 'GET' });
      setStatus(st.status);
      if (st.status?.defaultNetwork) {
        setNetwork(st.status.defaultNetwork);
      }
      if (st.status?.configured) {
        try {
          const accRes = await cdpFetch('/api/cdp/accounts', { method: 'GET' });
          const list: CdpAccount[] = accRes.accounts || [];
          setAccounts(list);
          setSelectedAddress((prev) => prev || list[0]?.address || '');
        } catch (accErr: any) {
          setFeedback({ ok: false, text: accErr?.message || 'Unable to load CDP accounts yet.' });
        }
      }
    } catch (err: any) {
      setFeedback({ ok: false, text: err?.message || 'Failed to reach Coinbase CDP service.' });
    } finally {
      setLoading(false);
    }
  }, [cdpFetch]);

  useEffect(() => {
    loadStatusAndAccounts();
  }, [loadStatusAndAccounts]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedKey(id);
    setTimeout(() => setCopiedKey((cur) => (cur === id ? null : cur)), 1800);
  };

  const handleSwitchEnvironment = async (env: 'sandbox' | 'live') => {
    setBusyAction('env');
    setFeedback(null);
    try {
      const nextNet = env === 'live' ? 'base' : 'base-sepolia';
      const res = await cdpFetch('/api/cdp/config', {
        method: 'PATCH',
        body: JSON.stringify({ environment: env, defaultNetwork: nextNet })
      });
      setStatus((prev) =>
        prev ? { ...prev, environment: res.config.environment, defaultNetwork: res.config.defaultNetwork } : prev
      );
      setNetwork(nextNet);
      setFeedback({
        ok: true,
        text: `Switched CDP mode to ${env.toUpperCase()} (${nextNet}).`
      });
    } catch (err: any) {
      setFeedback({ ok: false, text: err?.message || 'Failed to switch CDP environment.' });
    } finally {
      setBusyAction(null);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyAction('create-account');
    setFeedback(null);
    try {
      const res = await cdpFetch('/api/cdp/accounts', {
        method: 'POST',
        body: JSON.stringify({ name: newAccountName.trim() || undefined })
      });
      const created: CdpAccount = res.account;
      setAccounts((prev) => [created, ...prev]);
      setSelectedAddress(created.address);
      setFeedback({ ok: true, text: `Created CDP EVM wallet ${created.name || created.address}.` });
    } catch (err: any) {
      setFeedback({ ok: false, text: err?.message || 'Failed to create CDP wallet.' });
    } finally {
      setBusyAction(null);
    }
  };

  const handleRequestFaucet = async (token: 'eth' | 'usdc') => {
    if (!selectedAddress) {
      setFeedback({ ok: false, text: 'Create or select a 0x CDP wallet address first.' });
      return;
    }
    setBusyAction(`faucet-${token}`);
    setFeedback(null);
    try {
      const res = await cdpFetch('/api/cdp/faucet', {
        method: 'POST',
        body: JSON.stringify({
          address: selectedAddress,
          network: 'base-sepolia',
          token
        })
      });
      setFeedback({
        ok: true,
        text: `Requested Base Sepolia testnet ${token.toUpperCase()} for ${selectedAddress.slice(0, 10)}...`,
        txUrl: res.result?.explorerUrl || null
      });
    } catch (err: any) {
      setFeedback({ ok: false, text: err?.message || 'Faucet request failed.' });
    } finally {
      setBusyAction(null);
    }
  };

  const handleLoadBalances = async () => {
    if (!selectedAddress) return;
    setBusyAction('balances');
    setFeedback(null);
    try {
      const res = await cdpFetch(`/api/cdp/balances/${network}/${selectedAddress}`, { method: 'GET' });
      setBalances(res.data?.balances || []);
      setFeedback({ ok: true, text: `Loaded live ${network} onchain balances.` });
    } catch (err: any) {
      setFeedback({ ok: false, text: err?.message || 'Failed to load onchain balances.' });
    } finally {
      setBusyAction(null);
    }
  };

  const handleGetQuote = async () => {
    setBusyAction('quote');
    setFeedback(null);
    try {
      const res = await cdpFetch('/api/cdp/trade/quote', {
        method: 'POST',
        body: JSON.stringify({
          network,
          fromSymbol,
          toSymbol,
          fromAmount,
          takerAddress: selectedAddress || undefined,
          slippageBps
        })
      });
      setQuote(res.quote);
    } catch (err: any) {
      setFeedback({ ok: false, text: err?.message || 'Failed to fetch quote.' });
    } finally {
      setBusyAction(null);
    }
  };

  const handleExecuteSwap = async () => {
    if (network === 'base-sepolia') {
      setFeedback({
        ok: false,
        text: 'CDP Swap execution runs on Base Mainnet or Ethereum Mainnet. Switch to Live / Base Mainnet when ready.'
      });
      return;
    }
    if (!selectedAddress) {
      setFeedback({ ok: false, text: 'Select a CDP EVM wallet account before executing a trade.' });
      return;
    }
    setBusyAction('execute');
    setFeedback(null);
    try {
      const res = await cdpFetch('/api/cdp/trade/execute', {
        method: 'POST',
        body: JSON.stringify({
          network,
          accountAddress: selectedAddress,
          fromSymbol,
          toSymbol,
          fromAmount,
          slippageBps
        })
      });
      setFeedback({
        ok: true,
        text: `Trade broadcast on ${network}: ${fromAmount} ${fromSymbol} -> ${toSymbol}`,
        txUrl: res.trade?.explorerUrl || null
      });
    } catch (err: any) {
      setFeedback({ ok: false, text: err?.message || 'Trade execution failed.' });
    } finally {
      setBusyAction(null);
    }
  };

  const handleLoadAdvancedAccounts = async () => {
    setBusyAction('adv-accounts');
    setFeedback(null);
    try {
      const res = await cdpFetch('/api/cdp/advanced-trade/accounts', { method: 'GET' });
      const list = Array.isArray(res.accounts) ? res.accounts : [];
      setAdvAccounts(list);
      setFeedback({ ok: true, text: `Loaded ${list.length} Coinbase Advanced Trade brokerage account(s).` });
    } catch (err: any) {
      setFeedback({ ok: false, text: err?.message || 'Failed to load Coinbase Advanced Trade accounts.' });
    } finally {
      setBusyAction(null);
    }
  };

  const handlePlaceAdvancedOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyAction('adv-order');
    setFeedback(null);
    try {
      const res = await cdpFetch('/api/cdp/advanced-trade/order', {
        method: 'POST',
        body: JSON.stringify({
          productId: advProductId.trim().toUpperCase(),
          side: advSide,
          orderType: advOrderType,
          quoteSizeUsd: advOrderType === 'MARKET' && advSide === 'BUY' ? advQuoteUsd : undefined,
          baseSize: advOrderType === 'LIMIT' || advSide === 'SELL' ? advBaseSize : undefined,
          limitPrice: advOrderType === 'LIMIT' ? advLimitPrice : undefined
        })
      });
      setFeedback({
        ok: true,
        text: `Advanced Trade ${advOrderType} ${advSide} order placed on ${advProductId} (Order ID: ${res.order?.orderId || 'confirmed'}).`
      });
    } catch (err: any) {
      setFeedback({ ok: false, text: err?.message || 'Advanced Trade order failed.' });
    } finally {
      setBusyAction(null);
    }
  };

  const tokenOptions = network === 'ethereum' ? ['ETH', 'USDC', 'WBTC', 'cbBTC'] : ['ETH', 'USDC', 'cbBTC', 'WETH', 'AERO'];

  return (
    <div className="space-y-4">
      {/* Top Status & Mode Header */}
      <div className="rounded-xl bg-zinc-950/90 border border-zinc-800 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/35 flex items-center justify-center text-blue-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100">
                Coinbase Developer Platform (CDP) — Trading, Wallets &amp; x402
              </h3>
              <p className="text-xs text-zinc-400">
                Non-custodial EVM wallets, Base/Ethereum Trade API swaps, onchain balances &amp; testnet faucet
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg bg-zinc-900 border border-zinc-800 p-0.5 text-[11px] font-semibold">
              <button
                type="button"
                disabled={busyAction === 'env'}
                onClick={() => handleSwitchEnvironment('sandbox')}
                className={`px-2.5 py-1 rounded-md cursor-pointer ${
                  status?.environment !== 'live'
                    ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Sandbox (Testnet)
              </button>
              <button
                type="button"
                disabled={busyAction === 'env'}
                onClick={() => handleSwitchEnvironment('live')}
                className={`px-2.5 py-1 rounded-md cursor-pointer ${
                  status?.environment === 'live'
                    ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Live Mainnet
              </button>
            </div>

            <button
              type="button"
              onClick={loadStatusAndAccounts}
              className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 cursor-pointer"
              title="Refresh CDP status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Credential Readiness */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 rounded-lg bg-zinc-900/70 border border-zinc-800 flex items-center justify-between gap-2">
            <span className="text-zinc-400">Secret API Key</span>
            <span className={status?.hasApiKey ? 'text-emerald-400 font-mono font-bold truncate' : 'text-amber-400 font-mono'}>
              {status?.hasApiKey ? `LINKED (${status.apiKeyIdPreview})` : 'NOT SET'}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-zinc-900/70 border border-zinc-800 flex items-center justify-between gap-2">
            <span className="text-zinc-400">JWT Signing Alg</span>
            <span className={status?.keyAlgorithm && status.keyAlgorithm !== 'UNKNOWN' ? 'text-cyan-300 font-mono font-bold' : 'text-zinc-500 font-mono'}>
              {status?.keyAlgorithm ? `${status.keyAlgorithm} • 120s` : 'Ed25519 / ECDSA'}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-zinc-900/70 border border-zinc-800 flex items-center justify-between gap-2">
            <span className="text-zinc-400">Wallet Secret</span>
            <span className={status?.hasWalletSecret ? 'text-emerald-400 font-mono font-bold' : 'text-amber-400 font-mono'}>
              {status?.hasWalletSecret ? 'ARMED' : 'NOT SET'}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-zinc-900/70 border border-zinc-800 flex items-center justify-between gap-2">
            <span className="text-zinc-400">Vault Setup</span>
            {onSelectModule ? (
              <button
                type="button"
                onClick={() => onSelectModule('api-secrets')}
                className="flex items-center gap-1 text-amber-300 hover:text-amber-200 font-semibold cursor-pointer"
              >
                <Key className="w-3 h-3" />
                <span>Open Secrets Vault</span>
              </button>
            ) : (
              <span className="text-zinc-300 font-mono">Settings → Secrets</span>
            )}
          </div>
        </div>

        {!status?.configured && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-100 flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Connect your Coinbase CDP keys to unlock live wallets &amp; onchain swaps</span>
              </div>
              <p className="text-[11px] text-amber-200/80">
                Create a Secret API Key &amp; Wallet Secret at{' '}
                <span className="font-mono underline">portal.cdp.coinbase.com</span> and save{' '}
                <span className="font-mono">CDP_API_KEY_ID</span>,{' '}
                <span className="font-mono">CDP_API_KEY_SECRET</span>, and{' '}
                <span className="font-mono">CDP_WALLET_SECRET</span> in your server Secrets Vault.
              </p>
            </div>
            {onSelectModule && (
              <button
                type="button"
                onClick={() => onSelectModule('api-secrets')}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs cursor-pointer"
              >
                Configure Keys
              </button>
            )}
          </div>
        )}
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
            feedback.ok
              ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-200'
              : 'bg-rose-500/10 border-rose-500/35 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.ok ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          {feedback.txUrl && (
            <a
              href={feedback.txUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 font-mono text-[11px] underline text-cyan-300 shrink-0"
            >
              <span>Explorer</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* Grid: Trade Desk + Wallets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Live Trade / Swap Desk */}
        <div className="rounded-xl bg-zinc-950/90 border border-zinc-800 p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                CDP Onchain Trade / Swap Desk
              </h4>
            </div>
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value as any)}
              aria-label="Select trading network"
              className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 cursor-pointer"
            >
              <option value="base-sepolia">Base Sepolia (Testnet)</option>
              <option value="base">Base Mainnet</option>
              <option value="ethereum">Ethereum Mainnet</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Sell Token</label>
              <select
                value={fromSymbol}
                onChange={(e) => setFromSymbol(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100"
              >
                {tokenOptions.map((sym) => (
                  <option key={sym} value={sym}>
                    {sym}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Buy Token</label>
              <select
                value={toSymbol}
                onChange={(e) => setToSymbol(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100"
              >
                {tokenOptions.map((sym) => (
                  <option key={sym} value={sym}>
                    {sym}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Amount ({fromSymbol})</label>
              <input
                type="number"
                step="any"
                min="0"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Max Slippage (bps)</label>
              <input
                type="number"
                min={10}
                max={500}
                step={10}
                value={slippageBps}
                onChange={(e) => setSlippageBps(Number(e.target.value) || 100)}
                className="w-full px-2.5 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGetQuote}
              disabled={busyAction === 'quote'}
              className="flex-1 py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-100 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {busyAction === 'quote' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span>Get Live Quote</span>
            </button>

            <button
              type="button"
              onClick={handleExecuteSwap}
              disabled={busyAction === 'execute' || !status?.capabilities.tradeApiSwaps}
              className="flex-1 py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busyAction === 'execute' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              <span>Execute Swap</span>
            </button>
          </div>

          {quote && (
            <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Estimated Output</span>
                <span className="font-mono font-bold text-emerald-300">
                  {quote.estimatedToAmount} {quote.toToken?.symbol || toSymbol}
                </span>
              </div>
              {quote.minToAmount && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-500">Min Received ({quote.slippageBps / 100}% slip)</span>
                  <span className="font-mono text-zinc-300">
                    {quote.minToAmount} {quote.toToken?.symbol || toSymbol}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-500">Quote Source</span>
                <span className="font-mono text-cyan-300">
                  {quote.source === 'CDP_LIVE_SWAP_API' ? 'CDP Live Swap API' : 'Coinbase Live Spot Preview'}
                </span>
              </div>
              {quote.note && <p className="text-[11px] text-amber-300/90 pt-1">{quote.note}</p>}
            </div>
          )}
        </div>

        {/* Non-Custodial EVM Accounts & Testnet Faucet */}
        <div className="rounded-xl bg-zinc-950/90 border border-zinc-800 p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                CDP EVM Wallets &amp; Testnet Faucet
              </h4>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">{accounts.length} wallets</span>
          </div>

          <form onSubmit={handleCreateAccount} className="flex items-center gap-2">
            <input
              type="text"
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              placeholder="wallet-name (e.g. sovereign-trader)"
              className="flex-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 font-mono"
            />
            <button
              type="submit"
              disabled={busyAction === 'create-account' || !status?.capabilities.nonCustodialWallets}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-40"
            >
              {busyAction === 'create-account' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>Create Wallet</span>
            </button>
          </form>

          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {accounts.length === 0 ? (
              <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/80 text-[11px] text-zinc-400">
                No CDP EVM accounts loaded yet. Connect your CDP keys and click Create Wallet, or paste an address below.
              </div>
            ) : (
              accounts.map((acc) => (
                <button
                  key={acc.address}
                  type="button"
                  onClick={() => setSelectedAddress(acc.address)}
                  className={`w-full p-2 rounded-lg border text-left text-xs flex items-center justify-between gap-2 cursor-pointer ${
                    selectedAddress === acc.address
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-100'
                      : 'bg-zinc-900/70 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{acc.name || 'Unnamed CDP Wallet'}</div>
                    <div className="font-mono text-[10px] text-zinc-400 truncate">{acc.address}</div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-zinc-800/80">
            <input
              type="text"
              value={selectedAddress}
              onChange={(e) => setSelectedAddress(e.target.value)}
              placeholder="Active 0x EVM Address"
              className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-200"
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleRequestFaucet('eth')}
                disabled={!selectedAddress || !status?.capabilities.testnetFaucet || busyAction === 'faucet-eth'}
                className="px-2.5 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/35 text-blue-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                <Droplets className="w-3 h-3" />
                <span>Faucet Base Sepolia ETH</span>
              </button>
              <button
                type="button"
                onClick={() => handleRequestFaucet('usdc')}
                disabled={!selectedAddress || !status?.capabilities.testnetFaucet || busyAction === 'faucet-usdc'}
                className="px-2.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/35 text-cyan-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                <Droplets className="w-3 h-3" />
                <span>Faucet USDC</span>
              </button>
              <button
                type="button"
                onClick={handleLoadBalances}
                disabled={!selectedAddress || !status?.capabilities.onchainData || busyAction === 'balances'}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-[11px] font-semibold cursor-pointer disabled:opacity-40"
              >
                Check Balances
              </button>
            </div>
            {balances.length > 0 && (
              <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1 text-[11px] font-mono">
                {balances.slice(0, 6).map((b: any, i: number) => (
                  <div key={i} className="flex justify-between text-zinc-300">
                    <span>{b?.token?.symbol || 'TOKEN'}</span>
                    <span className="text-emerald-300">{b?.amount?.amount || '0'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Coinbase Advanced Trade API v3 (Exchange Order Desk — Ed25519 & ECDSA JWT) */}
      <div className="rounded-xl bg-zinc-950/90 border border-zinc-800 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <div>
              <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                Coinbase Advanced Trade API v3 — Exchange Order Desk
              </h4>
              <p className="text-[11px] text-zinc-400">
                Direct JWT-authenticated brokerage orders (<span className="font-mono">api.coinbase.com/api/v3/brokerage</span>) using your Ed25519 or ECDSA Secret API Key
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLoadAdvancedAccounts}
            disabled={!status?.hasApiKey || busyAction === 'adv-accounts'}
            className="px-3 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/35 text-blue-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            {busyAction === 'adv-accounts' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            <span>Load Coinbase Accounts</span>
          </button>
        </div>

        <form onSubmit={handlePlaceAdvancedOrder} className="grid grid-cols-1 md:grid-cols-6 gap-2.5 items-end">
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">Market Pair</label>
            <input
              type="text"
              value={advProductId}
              onChange={(e) => setAdvProductId(e.target.value)}
              placeholder="BTC-USD"
              className="w-full px-2.5 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 font-mono uppercase"
            />
          </div>
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">Side</label>
            <select
              value={advSide}
              onChange={(e) => setAdvSide(e.target.value as 'BUY' | 'SELL')}
              className="w-full px-2.5 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100"
            >
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">Order Type</label>
            <select
              value={advOrderType}
              onChange={(e) => setAdvOrderType(e.target.value as 'MARKET' | 'LIMIT')}
              className="w-full px-2.5 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100"
            >
              <option value="MARKET">MARKET (IOC)</option>
              <option value="LIMIT">LIMIT (GTC)</option>
            </select>
          </div>
          {advOrderType === 'MARKET' && advSide === 'BUY' ? (
            <div className="md:col-span-2">
              <label className="block text-[11px] text-zinc-400 mb-1">Spend Amount (USD)</label>
              <input
                type="number"
                step="any"
                min="1"
                value={advQuoteUsd}
                onChange={(e) => setAdvQuoteUsd(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 font-mono"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Base Size</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={advBaseSize}
                  onChange={(e) => setAdvBaseSize(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">
                  {advOrderType === 'LIMIT' ? 'Limit Price (USD)' : 'Execution'}
                </label>
                {advOrderType === 'LIMIT' ? (
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={advLimitPrice}
                    onChange={(e) => setAdvLimitPrice(e.target.value)}
                    placeholder="e.g. 95000"
                    className="w-full px-2.5 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 font-mono"
                  />
                ) : (
                  <div className="px-2.5 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800 text-[11px] text-zinc-400 font-mono">
                    Spot Market
                  </div>
                )}
              </div>
            </>
          )}
          <button
            type="submit"
            disabled={!status?.hasApiKey || busyAction === 'adv-order'}
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              advSide === 'BUY'
                ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950'
                : 'bg-rose-500 hover:bg-rose-400 text-zinc-950'
            }`}
          >
            {busyAction === 'adv-order' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
            <span>Place {advSide}</span>
          </button>
        </form>

        {advAccounts.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {advAccounts
              .filter((a) => parseFloat(a.availableBalance) > 0 || ['USD', 'USDC', 'BTC', 'ETH', 'SOL'].includes(a.currency))
              .slice(0, 8)
              .map((acc) => (
                <div key={acc.uuid} className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs">
                  <div className="text-[10px] text-zinc-400 font-semibold">{acc.currency}</div>
                  <div className="font-mono font-bold text-zinc-100 truncate">{acc.availableBalance}</div>
                  {parseFloat(acc.holdBalance) > 0 && (
                    <div className="text-[10px] font-mono text-amber-300">Hold: {acc.holdBalance}</div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Coinbase Agent MCP Matrix (Coinbase MCP, Wallet MCP, CDP MCP) & CLI Quickstart */}
      {status?.cliQuickstart && (
        <div className="rounded-xl bg-zinc-950/90 border border-zinc-800 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                Coinbase Agent MCP Bridges &amp; CDP CLI Quickstart
              </h4>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">
              Host: <span className="text-cyan-300">{status.activeApiHost || 'api.cdp.coinbase.com'}</span>
            </span>
          </div>

          {status.agentMcpTools && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
              {(
                [
                  { id: 'mcp-coinbase', badge: 'TRADING (RECOMMENDED)', data: status.agentMcpTools.coinbaseMcp },
                  { id: 'mcp-wallet', badge: 'SELF-CUSTODY DEFI', data: status.agentMcpTools.walletMcp },
                  { id: 'mcp-cdp', badge: 'BUILDER / SERVER WALLETS', data: status.agentMcpTools.cdpMcp }
                ] as const
              ).map((tool) => (
                <div
                  key={tool.id}
                  className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between gap-2"
                >
                  <div>
                    <div className="text-[9px] font-mono text-amber-300/90 tracking-wider">{tool.badge}</div>
                    <div className="font-bold text-zinc-100 mt-0.5">{tool.data.name}</div>
                    <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">{tool.data.scope}</p>
                  </div>
                  <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-zinc-800/80">
                    <code className="text-[10px] text-cyan-200 truncate">{tool.data.endpoint}</code>
                    <button
                      type="button"
                      onClick={() => handleCopy(tool.id, tool.data.endpoint)}
                      className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 shrink-0 cursor-pointer"
                      title={`Copy ${tool.data.name} endpoint`}
                    >
                      {copiedKey === tool.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
            {[
              { id: 'install', label: '1. Install CDP CLI (Node 22+)', cmd: status.cliQuickstart.install },
              {
                id: 'key',
                label: status.environment === 'sandbox' ? '2. Load Sandbox API Key' : '2. Load Live API Key',
                cmd: status.cliQuickstart.configureKey
              },
              {
                id: 'wallet',
                label: status.environment === 'sandbox' ? '3. List Sandbox Accounts' : '3. Load Wallet Secret',
                cmd: status.cliQuickstart.configureWalletSecret
              },
              { id: 'mcp', label: '4. Start CDP MCP Server', cmd: status.cliQuickstart.mcpServer }
            ].map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-[10px] text-zinc-400 font-sans">{item.label}</div>
                  <div className="text-cyan-200 truncate">{item.cmd}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(item.id, item.cmd)}
                  className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 shrink-0 cursor-pointer"
                  title="Copy command"
                >
                  {copiedKey === item.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
