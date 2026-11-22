import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  ShieldCheck,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Send,
  Key,
  Copy,
  Check,
  Download,
  Bot,
  UserCheck,
  Plus,
  ExternalLink,
  Eye,
  EyeOff,
  Zap,
  TrendingUp,
  Activity,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Bell,
  BellOff
} from 'lucide-react';
import { ModuleType } from '../types';
import { AutonomousGrantEnginePanel } from './AutonomousGrantEnginePanel';
import { CoinbaseCdpTradingPanel } from './CoinbaseCdpTradingPanel';
import {
  loadOSCustomizationProfile,
  saveOSCustomizationProfile,
  type SovereignOSCustomizationProfile
} from '../utils/osCustomizationStore';
import { apiFetch } from '../utils/authClient';

interface PortfolioHolding {
  symbol: string;
  name: string;
  chain: 'BITCOIN' | 'ETHEREUM' | 'SOLANA' | 'MULTI';
  quantity: number;
  avgEntryPriceUsd: number;
  currentPriceUsd: number;
  marketValueUsd: number;
  unrealizedPnlUsd: number;
  unrealizedPnlPct: number;
  onChainBalanceNative: number;
  lastSyncedAt: string;
}

interface SignedCryptoTransaction {
  id: string;
  walletId: string;
  walletRole: 'PERSONAL_INVESTOR' | 'AGENTIC_AUTONOMOUS';
  timestamp: string;
  type:
    | 'ONCHAIN_TRANSFER'
    | 'MARKET_BUY'
    | 'MARKET_SELL'
    | 'AUTONOMOUS_5M_SIGNAL_EXEC'
    | 'DEVNET_AIRDROP'
    | 'BANK_OR_DIGITAL_TRANSFER';
  chain: 'BITCOIN' | 'ETHEREUM' | 'SOLANA' | 'FIAT_RAIL';
  symbol: string;
  amountNative: number;
  priceUsdAtExec: number;
  totalValueUsd: number;
  fromAddress: string;
  toAddress: string;
  txHash: string;
  signatureHex: string;
  signatureAlgorithm?: 'ECDSA-secp256k1-Keccak256' | 'ECDSA-secp256k1-SHA256' | 'Ed25519-RFC8032';
  signerPublicKey?: string;
  signatureVerified?: boolean;
  triggerReason: string;
  conformalCertaintyPct: number;
  broadcastStatus: string;
  explorerUrl: string;
  railMetadata?: {
    rail: string;
    railLabel: string;
    recipientName: string;
    institutionName: string;
    destinationMasked: string;
    routingOrSwift?: string;
    targetCurrency: string;
    targetAmount: number;
    feeUsd: number;
    etaLabel: string;
    uetrReference: string;
    fundingSource: string;
    memo?: string;
  };
}

interface SavedPayoutBeneficiary {
  id: string;
  label: string;
  rail: string;
  recipientName: string;
  institutionName: string;
  accountOrHandle: string;
  routingOrSwift?: string;
  currency: string;
  createdAt: string;
}

interface AutonomousAgenticPolicy {
  enabled: boolean;
  executionMode: 'LIVE_SIGNED_PORTFOLIO' | 'MAINNET_RPC_BROADCAST';
  maxSingleTradeUsd: number;
  minConformalCertaintyPct: number;
  autoActOn5mSignals: boolean;
  allowedActions: string[];
  stopLossProtectPct: number;
  lastAutonomousScanAt: string;
  totalAutonomousTradesExecuted: number;
  cumulativeAutonomousProfitUsd: number;
}

interface SovereignCryptoWallet {
  id: string;
  label: string;
  role: 'PERSONAL_INVESTOR' | 'AGENTIC_AUTONOMOUS';
  createdAt: string;
  encryptionCipher: 'AES-256-GCM';
  addresses: {
    ethereumEip55: string;
    bitcoinSegwit: string;
    bitcoinLegacy: string;
    solanaBase58: string;
  };
  publicKeys: {
    ethereumUncompressedHex: string;
    bitcoinCompressedHex: string;
    solanaHex: string;
  };
  secrets: {
    mnemonic12: string;
    ethereumPrivateKeyHex: string;
    bitcoinWifPrivateKey: string;
    solanaSecretKeyBase58: string;
  };
  cashReserveUsd: number;
  holdings: PortfolioHolding[];
  onChainLiveTelemetry: {
    ethMainnetBalanceEth: number;
    ethGasGwei: number;
    ethBlockNumber: number;
    btcConfirmedSats: number;
    btcUnconfirmedSats: number;
    btcFastestFeeSatVb: number;
    solMainnetBalanceSol: number;
    solDevnetBalanceSol: number;
    solSlot: number;
    lastRpcPollAt: string;
  };
  agenticPolicy?: AutonomousAgenticPolicy;
}

interface SovereignCryptoWalletModuleProps {
  onSelectModule?: (mod: ModuleType) => void;
  onInjectIntoChat?: (prompt: string) => void;
}

const WALLET_CACHE_KEY = 'sovereign_crypto_wallet_cache_v2_real';

interface BootstrapConnector {
  id: string;
  name: string;
  envKeys: string[];
  connected: boolean;
  purpose: string;
}

interface RealBootstrapProgram {
  id: string;
  category: 'AGENTIC_GRANTS' | 'EXCHANGE_BONUSES' | 'ZERO_CAPITAL_EARN' | 'TESTNET_DEV';
  name: string;
  provider: string;
  potentialValue: string;
  realMainnetValue: boolean;
  kycOrApprovalRequired: string;
  summary: string;
  officialUrl: string;
}

async function safeWalletFetchJson(
  url: string,
  init?: RequestInit,
  retries = 2
): Promise<any> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 14000);
      const res = await apiFetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type') || '';
      const rawText = await res.text();
      if (!contentType.includes('application/json')) {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 450 * (attempt + 1)));
          continue;
        }
        throw new Error(`Server returned HTTP ${res.status} (reconnecting to backend)`);
      }

      const data = JSON.parse(rawText);
      if (!res.ok) {
        if (res.status >= 500 && attempt < retries) {
          await new Promise((r) => setTimeout(r, 450 * (attempt + 1)));
          continue;
        }
        throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
      }
      return data;
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }
    }
  }
  throw lastError || new Error('Wallet service temporarily unavailable');
}

export const SovereignCryptoWalletModule: React.FC<SovereignCryptoWalletModuleProps> = ({
  onSelectModule
}) => {
  const initialCache = (() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(WALLET_CACHE_KEY) : null;
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const [wallets, setWallets] = useState<SovereignCryptoWallet[]>(
    Array.isArray(initialCache?.wallets) ? initialCache.wallets : []
  );
  const [selectedWalletId, setSelectedWalletId] = useState<string>('personal-sovereign-vault');
  const [transactions, setTransactions] = useState<SignedCryptoTransaction[]>(
    Array.isArray(initialCache?.transactions) ? initialCache.transactions : []
  );
  const [livePrices, setLivePrices] = useState<
    Record<string, { price: number; changePct: number; forecast5mPct: number; conformal99Pct: number }>
  >(initialCache?.livePrices || {});
  const [syncingRpc, setSyncingRpc] = useState(false);
  const [runningAgenticCycle, setRunningAgenticCycle] = useState(false);
  const [airdropBusy, setAirdropBusy] = useState(false);

  const [activeTab, setActiveTab] = useState<
    'overview' | 'coinbase-cdp' | 'grants' | 'bootstrap' | 'bank-transfer' | 'trade-transfer' | 'agentic-policy' | 'keystore' | 'new-wallet'
  >('overview');

  const [bootstrapConnectors, setBootstrapConnectors] = useState<BootstrapConnector[]>([]);
  const [bootstrapPrograms, setBootstrapPrograms] = useState<RealBootstrapProgram[]>([]);
  const [daemonStatus, setDaemonStatus] = useState<{
    enabled: boolean;
    fullAutonomyAllWallets: boolean;
    totalScans: number;
    totalLiveOrdersExecuted: number;
    lastScanAt: string;
    status: string;
    liveExchangeUsdDetected: number;
    liveOnChainUsdDetected: number;
    lastSignalsSummary: Array<{
      symbol: string;
      actionSignal: string;
      predicted5mMovePct: number;
      conformal99CoveragePct: number;
    }>;
    logs: Array<{ timestamp: string; phase: string; message: string }>;
  } | null>(null);
  const [daemonTickBusy, setDaemonTickBusy] = useState(false);
  const [linkLabel, setLinkLabel] = useState('');
  const [linkEthAddr, setLinkEthAddr] = useState('');
  const [linkBtcAddr, setLinkBtcAddr] = useState('');
  const [linkSolAddr, setLinkSolAddr] = useState('');
  const [linkingExternal, setLinkingExternal] = useState(false);

  // Easy Bank & Digital Equivalent Transfer State
  const [beneficiaries, setBeneficiaries] = useState<SavedPayoutBeneficiary[]>(
    Array.isArray(initialCache?.beneficiaries) ? initialCache.beneficiaries : []
  );
  const [payoutRail, setPayoutRail] = useState<string>('BANK_ACH');
  const [payoutFunding, setPayoutFunding] = useState<'USD_CASH' | 'BTC' | 'ETH' | 'SOL' | 'XRP' | 'DOGE'>('USD_CASH');
  const [payoutAmountUsd, setPayoutAmountUsd] = useState<string>('250');
  const [payoutCurrency, setPayoutCurrency] = useState<string>('USD');
  const [payoutRecipientName, setPayoutRecipientName] = useState<string>('');
  const [payoutInstitution, setPayoutInstitution] = useState<string>('');
  const [payoutAccountOrHandle, setPayoutAccountOrHandle] = useState<string>('');
  const [payoutRoutingOrSwift, setPayoutRoutingOrSwift] = useState<string>('');
  const [payoutMemo, setPayoutMemo] = useState<string>('');
  const [payoutSaveBeneficiary, setPayoutSaveBeneficiary] = useState<boolean>(true);
  const [payoutBusy, setPayoutBusy] = useState<boolean>(false);

  const [orderAction, setOrderAction] = useState<'BUY' | 'SELL' | 'ONCHAIN_TRANSFER'>('BUY');
  const [orderSymbol, setOrderSymbol] = useState<'BTC' | 'ETH' | 'SOL' | 'XRP' | 'DOGE'>('BTC');
  const [orderAmountUsd, setOrderAmountUsd] = useState<string>('1000');
  const [orderQuantityNative, setOrderQuantityNative] = useState<string>('0.02');
  const [transferToAddress, setTransferToAddress] = useState<string>('');
  const [executingOrder, setExecutingOrder] = useState(false);

  const [revealSecrets, setRevealSecrets] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [connectedBrowserWallet, setConnectedBrowserWallet] = useState<{
    provider: string;
    address: string;
  } | null>(null);

  const [newWalletLabel, setNewWalletLabel] = useState('');
  const [newWalletRole, setNewWalletRole] = useState<'PERSONAL_INVESTOR' | 'AGENTIC_AUTONOMOUS'>(
    'PERSONAL_INVESTOR'
  );
  const [importPrivKeyHex, setImportPrivKeyHex] = useState('');

  const [banner, setBanner] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [cryptoTradingAlertsEnabled, setCryptoTradingAlertsEnabled] = useState<boolean>(
    () => loadOSCustomizationProfile().notifications.cryptoTradingAlerts
  );

  useEffect(() => {
    const onCustom = (e: Event) => {
      const profile = (e as CustomEvent<SovereignOSCustomizationProfile>).detail || loadOSCustomizationProfile();
      setCryptoTradingAlertsEnabled(Boolean(profile.notifications?.cryptoTradingAlerts));
    };
    window.addEventListener('sovereign_os_customization_changed', onCustom);
    return () => window.removeEventListener('sovereign_os_customization_changed', onCustom);
  }, []);

  const toggleCryptoTradingAlerts = () => {
    const nextVal = !cryptoTradingAlertsEnabled;
    setCryptoTradingAlertsEnabled(nextVal);
    saveOSCustomizationProfile({
      notifications: {
        ...loadOSCustomizationProfile().notifications,
        cryptoTradingAlerts: nextVal
      }
    });
  };

  const inFlightFetchRef = React.useRef(false);
  const walletsCountRef = React.useRef(wallets.length);
  walletsCountRef.current = wallets.length;

  const persistCache = useCallback((nextWallets: SovereignCryptoWallet[], nextTxs: SignedCryptoTransaction[], nextPrices: any) => {
    try {
      localStorage.setItem(
        WALLET_CACHE_KEY,
        JSON.stringify({
          wallets: nextWallets,
          transactions: nextTxs,
          livePrices: nextPrices,
          savedAt: new Date().toISOString()
        })
      );
    } catch {}
  }, []);

  const fetchWallets = useCallback(async (isBackgroundPoll = false) => {
    if (inFlightFetchRef.current) return;
    inFlightFetchRef.current = true;
    try {
      const data = await safeWalletFetchJson('/api/crypto/wallets', undefined, isBackgroundPoll ? 1 : 2);
      if (data?.success && Array.isArray(data.wallets)) {
        const nextTxs = Array.isArray(data.transactions) ? data.transactions : [];
        const nextPrices = data.livePrices || {};
        setWallets(data.wallets);
        setTransactions(nextTxs);
        if (Array.isArray(data.beneficiaries)) setBeneficiaries(data.beneficiaries);
        if (data.livePrices) setLivePrices(nextPrices);
        persistCache(data.wallets, nextTxs, nextPrices);
        // Clear any stale transient load error once vault data loads cleanly
        setBanner((prev) =>
          prev?.type === 'error' && prev.text.toLowerCase().includes('sovereign crypto vault')
            ? null
            : prev
        );
      }
    } catch (err: any) {
      // Only show a red error if we have zero vaults loaded; silent retry on background refresh when cached vaults are already visible
      if (!isBackgroundPoll && walletsCountRef.current === 0) {
        setBanner({
          type: 'error',
          text: `Reconnecting to Sovereign Crypto Vaults (${err?.message || 'transient network timeout'}) — retrying automatically.`
        });
      }
    } finally {
      inFlightFetchRef.current = false;
    }
  }, [persistCache]);

  const fetchDaemonStatus = useCallback(() => {
    safeWalletFetchJson('/api/crypto/wallets/daemon', undefined, 1)
      .then((d) => {
        if (d?.daemon) setDaemonStatus(d.daemon);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    try {
      localStorage.removeItem('sovereign_crypto_wallet_cache_v1');
    } catch {}
    fetchWallets(false);
    fetchDaemonStatus();
    safeWalletFetchJson('/api/crypto/wallets/bootstrap-status', undefined, 1)
      .then((d) => {
        if (Array.isArray(d?.connectors)) setBootstrapConnectors(d.connectors);
        if (Array.isArray(d?.programs)) setBootstrapPrograms(d.programs);
      })
      .catch(() => {});
    const interval = setInterval(() => {
      fetchWallets(true);
      fetchDaemonStatus();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchWallets, fetchDaemonStatus]);

  const activeWallet =
    wallets.find((w) => w.id === selectedWalletId) || wallets[0] || null;

  const copyText = (text: string, key: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2200);
  };

  const handleSyncOnChainRpc = async () => {
    try {
      setSyncingRpc(true);
      setBanner({
        type: 'info',
        text: 'Polling live Ethereum Mainnet RPC, Bitcoin Mempool.space API, and Solana Mainnet/Devnet RPC nodes...'
      });
      const data = await safeWalletFetchJson('/api/crypto/wallets/sync', { method: 'POST' }, 1);
      if (data?.success) {
        const nextWallets = data.wallets || [];
        const nextTxs = data.transactions || [];
        setWallets(nextWallets);
        setTransactions(nextTxs);
        if (data.livePrices) setLivePrices(data.livePrices);
        persistCache(nextWallets, nextTxs, data.livePrices || livePrices);
        setBanner({
          type: 'success',
          text: 'Synchronized live on-chain balances, block heights, gas/sat fees, and Laplace-14 (h=2s) market valuations.'
        });
      } else {
        setBanner({ type: 'error', text: data?.error || 'On-chain RPC sync returned an incomplete response.' });
      }
    } catch (err: any) {
      setBanner({ type: 'error', text: `RPC Sync notice: ${err?.message || 'temporary network timeout'}` });
    } finally {
      setSyncingRpc(false);
    }
  };

  const handleExecuteOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWallet) return;
    try {
      setExecutingOrder(true);
      const data = await safeWalletFetchJson('/api/crypto/wallets/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletId: activeWallet.id,
          action: orderAction,
          symbol: orderSymbol,
          amountUsd: orderAction === 'BUY' ? Number(orderAmountUsd) : undefined,
          quantityNative:
            orderAction === 'SELL' || orderAction === 'ONCHAIN_TRANSFER'
              ? Number(orderQuantityNative)
              : undefined,
          toAddress: orderAction === 'ONCHAIN_TRANSFER' ? transferToAddress : undefined
        })
      }, 1);
      if (data?.success) {
        if (Array.isArray(data.wallets)) setWallets(data.wallets);
        if (Array.isArray(data.transactions)) setTransactions(data.transactions);
        if (Array.isArray(data.wallets)) persistCache(data.wallets, data.transactions || [], data.livePrices || livePrices);
        setBanner({ type: 'success', text: data.message });
      } else {
        setBanner({ type: 'error', text: data?.message || data?.error || 'Order failed' });
      }
    } catch (err: any) {
      setBanner({ type: 'error', text: `Execution error: ${err?.message}` });
    } finally {
      setExecutingOrder(false);
    }
  };

  const handleRunAgenticCycle = async () => {
    try {
      setRunningAgenticCycle(true);
      setBanner({
        type: 'info',
        text: 'UID 0 Agentic Treasury evaluating Laplace-14 (h=2s) 5-minute trajectories & 99% Conformal bounds...'
      });
      const data = await safeWalletFetchJson('/api/crypto/wallets/agentic-cycle', { method: 'POST' }, 1);
      if (data?.success) {
        if (Array.isArray(data.wallets)) setWallets(data.wallets);
        if (Array.isArray(data.transactions)) setTransactions(data.transactions);
        if (Array.isArray(data.wallets)) persistCache(data.wallets, data.transactions || [], data.livePrices || livePrices);
        setBanner({
          type: 'success',
          text:
            data.actionsLog?.[0] ||
            `Autonomous Agentic cycle completed (${data.executedCount} signed executions).`
        });
      }
    } catch (err: any) {
      setBanner({ type: 'error', text: `Agentic cycle error: ${err?.message}` });
    } finally {
      setRunningAgenticCycle(false);
    }
  };

  const handleSolanaDevnetAirdrop = async () => {
    if (!activeWallet) return;
    try {
      setAirdropBusy(true);
      setBanner({
        type: 'info',
        text: `Requesting live 1.0 SOL Devnet airdrop for ${activeWallet.addresses.solanaBase58} via https://api.devnet.solana.com...`
      });
      const data = await safeWalletFetchJson('/api/crypto/wallets/sol-airdrop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletId: activeWallet.id })
      }, 1);
      if (Array.isArray(data?.wallets)) setWallets(data.wallets);
      if (Array.isArray(data?.transactions)) setTransactions(data.transactions);
      setBanner({
        type: data?.success ? 'success' : 'info',
        text: data?.message || 'Solana Devnet airdrop request completed.'
      });
    } catch (err: any) {
      setBanner({ type: 'error', text: `Airdrop notice: ${err?.message}` });
    } finally {
      setAirdropBusy(false);
    }
  };

  const handleConnectBrowserWeb3 = async (type: 'ethereum' | 'solana') => {
    try {
      const win = window as any;
      if (type === 'ethereum') {
        if (!win.ethereum) {
          setBanner({
            type: 'info',
            text: 'No injected EVM browser extension (MetaMask/Rabby) detected in this window. You can paste your public 0x address in the Agentic Grants & Real Capital tab to sync its live mainnet balance.'
          });
          return;
        }
        const accounts = await win.ethereum.request({ method: 'eth_requestAccounts' });
        if (Array.isArray(accounts) && accounts[0]) {
          setConnectedBrowserWallet({ provider: 'MetaMask / Web3 EVM', address: accounts[0] });
          const linked = await safeWalletFetchJson('/api/crypto/wallets/link-external', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              label: `MetaMask Real Wallet (${accounts[0].slice(0, 8)}...)`,
              source: 'METAMASK_EVM',
              ethereumAddress: accounts[0]
            })
          }, 1);
          if (Array.isArray(linked?.wallets)) setWallets(linked.wallets);
          if (linked?.wallet?.id) setSelectedWalletId(linked.wallet.id);
          setBanner({
            type: 'success',
            text: linked?.message || `Linked real MetaMask EVM wallet (${accounts[0]}) and synced mainnet balance.`
          });
        }
      } else {
        if (!win.solana) {
          setBanner({
            type: 'info',
            text: 'No injected Solana browser extension (Phantom) detected. You can paste your public Solana Base58 address in the Agentic Grants & Real Capital tab to sync its live mainnet balance.'
          });
          return;
        }
        const resp = await win.solana.connect();
        const pub = resp?.publicKey?.toString();
        if (pub) {
          setConnectedBrowserWallet({ provider: 'Phantom / Solana', address: pub });
          const linked = await safeWalletFetchJson('/api/crypto/wallets/link-external', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              label: `Phantom Real Wallet (${pub.slice(0, 8)}...)`,
              source: 'PHANTOM_SOLANA',
              solanaAddress: pub
            })
          }, 1);
          if (Array.isArray(linked?.wallets)) setWallets(linked.wallets);
          if (linked?.wallet?.id) setSelectedWalletId(linked.wallet.id);
          setBanner({
            type: 'success',
            text: linked?.message || `Linked real Phantom Solana wallet (${pub}) and synced mainnet balance.`
          });
        }
      }
    } catch (err: any) {
      setBanner({ type: 'error', text: `Web3 connection notice: ${err?.message}` });
    }
  };

  const handleLinkWatchOnlyWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkingExternal(true);
    try {
      const data = await safeWalletFetchJson('/api/crypto/wallets/link-external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: linkLabel.trim() || 'My Real External Wallet',
          source: 'WATCH_ONLY_ADDRESS',
          ethereumAddress: linkEthAddr.trim() || undefined,
          bitcoinAddress: linkBtcAddr.trim() || undefined,
          solanaAddress: linkSolAddr.trim() || undefined
        })
      }, 1);
      if (data?.success) {
        if (Array.isArray(data.wallets)) setWallets(data.wallets);
        if (data.wallet?.id) setSelectedWalletId(data.wallet.id);
        setLinkLabel('');
        setLinkEthAddr('');
        setLinkBtcAddr('');
        setLinkSolAddr('');
        setBanner({ type: 'success', text: data.message });
      } else {
        setBanner({ type: 'error', text: data?.message || data?.error || 'Could not link address.' });
      }
    } catch (err: any) {
      setBanner({ type: 'error', text: `Link error: ${err?.message}` });
    } finally {
      setLinkingExternal(false);
    }
  };

  const handleCreateCustomWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await safeWalletFetchJson('/api/crypto/wallets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: newWalletLabel || 'Custom Sovereign Multi-Chain Vault',
          role: newWalletRole,
          initialCashUsd: 0,
          importPrivateKeyHex: importPrivKeyHex.trim() || undefined
        })
      }, 1);
      if (data?.success && data.wallet) {
        if (Array.isArray(data.wallets)) setWallets(data.wallets);
        setSelectedWalletId(data.wallet.id);
        setActiveTab('overview');
        setNewWalletLabel('');
        setImportPrivKeyHex('');
        setBanner({
          type: 'success',
          text: `Created real $0.00 self-custody multi-chain vault "${data.wallet.label}" synced live to mainnet RPCs.`
        });
      }
    } catch (err: any) {
      setBanner({ type: 'error', text: `Failed to create wallet: ${err?.message}` });
    }
  };

  const handleBankOrDigitalTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWallet) return;
    try {
      setPayoutBusy(true);
      const data = await safeWalletFetchJson('/api/crypto/wallets/bank-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletId: activeWallet.id,
          rail: payoutRail,
          fundingSource: payoutFunding,
          amountUsd: Number(payoutAmountUsd),
          targetCurrency: payoutCurrency,
          recipientName: payoutRecipientName,
          institutionName: payoutInstitution,
          accountOrHandle: payoutAccountOrHandle,
          routingOrSwift: payoutRoutingOrSwift,
          memo: payoutMemo,
          saveBeneficiary: payoutSaveBeneficiary
        })
      }, 1);
      if (data?.success) {
        if (Array.isArray(data.wallets)) setWallets(data.wallets);
        if (Array.isArray(data.transactions)) setTransactions(data.transactions);
        if (Array.isArray(data.beneficiaries)) setBeneficiaries(data.beneficiaries);
        if (Array.isArray(data.wallets)) persistCache(data.wallets, data.transactions || [], data.livePrices || livePrices);
        setPayoutMemo('');
        setBanner({ type: 'success', text: data.message });
      } else {
        setBanner({ type: 'error', text: data?.message || data?.error || 'Transfer could not be completed.' });
      }
    } catch (err: any) {
      setBanner({ type: 'error', text: `Transfer error: ${err?.message || 'Network timeout'}` });
    } finally {
      setPayoutBusy(false);
    }
  };

  const handleDeleteBeneficiary = async (beneficiaryId: string) => {
    try {
      const data = await safeWalletFetchJson('/api/crypto/wallets/beneficiaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', beneficiaryId })
      }, 1);
      if (Array.isArray(data?.beneficiaries)) setBeneficiaries(data.beneficiaries);
    } catch {}
  };

  const handleDownloadTransferReceipt = (tx: SignedCryptoTransaction) => {
    const blob = new Blob([JSON.stringify({
      standard: 'ISO-20022 / Lysander Sovereign OS Signed Settlement Receipt',
      exportedAt: new Date().toISOString(),
      transaction: tx
    }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sovereign-transfer-${tx.railMetadata?.uetrReference || tx.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadKeystoreJson = () => {
    if (!activeWallet) return;
    const payload = {
      exportedAt: new Date().toISOString(),
      os: 'Lysander Sovereign OS · UID 0 Self-Custody Keystore',
      architect: 'Joshua Hamilton (JHammerZ) <https://jhammerz.github.io>',
      license: 'MIT License & JHammerZ Custom Sovereign License (TWENTY 47 PROTOCOL - GENESIS NODE / H-FID v1.1)',
      zenodoDoi: 'https://doi.org/10.5281/zenodo.20778079',
      cipher: activeWallet.encryptionCipher,
      walletId: activeWallet.id,
      label: activeWallet.label,
      role: activeWallet.role,
      addresses: activeWallet.addresses,
      publicKeys: activeWallet.publicKeys,
      secrets: activeWallet.secrets
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeWallet.id}-keystore-backup.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const holdingsMarketValue = activeWallet
    ? activeWallet.holdings.reduce((acc, h) => acc + h.marketValueUsd, 0)
    : 0;
  const totalNetWorthUsd = activeWallet
    ? activeWallet.cashReserveUsd + holdingsMarketValue
    : 0;
  const totalUnrealizedPnlUsd = activeWallet
    ? activeWallet.holdings.reduce((acc, h) => acc + h.unrealizedPnlUsd, 0)
    : 0;

  return (
    <div className="flex-1 bg-zinc-950 text-zinc-100 flex flex-col h-full overflow-hidden font-mono">
      {/* Top Bar */}
      <div className="bg-zinc-900/90 border-b border-zinc-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm sm:text-base font-black tracking-tight text-zinc-100">
                SOVEREIGN DUAL-VAULT CRYPTO WALLETS & AGENTIC TREASURY
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                100% REAL ON-CHAIN ONLY · ZERO SIMULATED BALANCES
              </span>
              <span className="px-2 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[10px] font-bold">
                secp256k1 + ed25519 · AES-256-GCM
              </span>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-jhammerz-license'))}
                className="px-2 py-0.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-[10px] font-bold cursor-pointer"
                title="Inspect official MIT & JHammerZ Custom Sovereign License Charter (jhammerz.github.io)"
              >
                MIT & JHammerZ License · jhammerz.github.io
              </button>
            </div>
            <p className="text-[11px] text-zinc-400">
              Strict Live Mainnet Balances Only ($0.00 until funded on-chain or linked to real wallets/APIs) · BTC, ETH &amp; SOL RPCs
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleCryptoTradingAlerts}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              cryptoTradingAlertsEnabled
                ? 'bg-emerald-500/15 border-emerald-500/45 text-emerald-200 hover:bg-emerald-500/25'
                : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Off by default: enable or mute autonomous crypto trading & market alert popups"
          >
            {cryptoTradingAlertsEnabled ? <Bell className="w-3.5 h-3.5 text-emerald-400" /> : <BellOff className="w-3.5 h-3.5 text-zinc-500" />}
            <span>{cryptoTradingAlertsEnabled ? 'Trade Alerts: ON' : 'Trade Alerts: OFF'}</span>
          </button>

          <button
            type="button"
            onClick={handleSyncOnChainRpc}
            disabled={syncingRpc}
            className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${syncingRpc ? 'animate-spin' : ''}`} />
            <span>{syncingRpc ? 'Polling RPCs...' : 'Sync On-Chain RPCs'}</span>
          </button>

          <button
            type="button"
            onClick={handleRunAgenticCycle}
            disabled={runningAgenticCycle}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20"
          >
            <Bot className={`w-3.5 h-3.5 ${runningAgenticCycle ? 'animate-spin' : ''}`} />
            <span>
              {runningAgenticCycle ? 'Executing 5m Signal...' : 'Run Agentic 5m Execution'}
            </span>
          </button>
        </div>
      </div>

      {/* Status Notification */}
      {banner && (
        <div
          className={`px-4 py-2.5 border-b text-xs flex items-center justify-between gap-3 shrink-0 ${
            banner.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
              : banner.type === 'error'
              ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
              : 'bg-sky-500/15 border-sky-500/40 text-sky-200'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {banner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : banner.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <RefreshCw className="w-4 h-4 text-sky-400 animate-spin shrink-0" />
            )}
            <span className="truncate font-semibold">{banner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="text-[11px] px-2 py-0.5 rounded bg-black/30 hover:bg-black/50 text-zinc-300 cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Vault Selector Strip */}
      <div className="bg-zinc-900/60 border-b border-zinc-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-zinc-400 uppercase">Active Vault:</span>
          {wallets.map((w) => {
            const isSelected = activeWallet?.id === w.id;
            const isAgentic = w.role === 'AGENTIC_AUTONOMOUS';
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => setSelectedWalletId(w.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                  isSelected
                    ? isAgentic
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-md'
                      : 'bg-emerald-500/20 border-emerald-400 text-emerald-200 shadow-md'
                    : 'bg-zinc-950/80 hover:bg-zinc-800 border-zinc-800 text-zinc-400'
                }`}
              >
                {isAgentic ? (
                  <Bot className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>{w.label}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-zinc-300">
                  {isAgentic ? 'UID 0 AGENTIC' : 'PERSONAL'}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setActiveTab('new-wallet')}
            className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>New / Import Key</span>
          </button>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'overview', label: 'Real On-Chain Portfolio' },
              { id: 'coinbase-cdp', label: 'Coinbase CDP Trading' },
              { id: 'grants', label: 'Grant Applications (0% Equity)' },
              { id: 'bootstrap', label: 'Autonomous Daemon & Links' },
              { id: 'bank-transfer', label: 'Bank & Digital Transfers' },
              { id: 'trade-transfer', label: 'Live Execution / Send' },
              { id: 'agentic-policy', label: 'Agentic 5m Policy' },
              { id: 'keystore', label: 'Private Keys & Seed Backup' }
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                activeTab === t.id
                  ? 'bg-zinc-100 text-zinc-950'
                  : t.id === 'coinbase-cdp'
                  ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-500/40'
                  : t.id === 'grants'
                  ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40'
                  : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
        {activeWallet && (
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Top Valuation & Multi-Chain Address Summary Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Net Worth Card */}
              <div className="rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-amber-500/30 p-5 flex flex-col justify-between gap-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-amber-300">
                    {activeWallet.role === 'AGENTIC_AUTONOMOUS'
                      ? 'UID 0 AGENTIC TREASURY VALUE'
                      : 'PERSONAL INVESTOR NET WORTH'}
                  </span>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-white tabular-nums">
                    ${totalNetWorthUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs">
                    <span
                      className={`font-bold flex items-center gap-0.5 ${
                        totalUnrealizedPnlUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {totalUnrealizedPnlUsd >= 0 ? (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5" />
                      )}
                      {totalUnrealizedPnlUsd >= 0 ? '+' : ''}$
                      {totalUnrealizedPnlUsd.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}{' '}
                      Unrealized PnL
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Liquid USD Reserve:</span>
                  <span className="font-bold text-emerald-300">
                    ${activeWallet.cashReserveUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Bitcoin Native SegWit Address Card */}
              <div className="rounded-2xl bg-zinc-900/80 border border-orange-500/30 p-4 flex flex-col justify-between gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-orange-500/15 border border-orange-500/30 text-orange-300 text-[10px] font-bold">
                    BITCOIN SEGWIT (BIP-173 · secp256k1)
                  </span>
                  <a
                    href={`https://mempool.space/address/${activeWallet.addresses.bitcoinSegwit}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-orange-300 hover:underline flex items-center gap-1"
                  >
                    <span>Mempool</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-2 flex items-center justify-between gap-2">
                  <code className="text-[11px] text-zinc-200 truncate">
                    {activeWallet.addresses.bitcoinSegwit}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyText(activeWallet.addresses.bitcoinSegwit, 'btc-addr')}
                    className="text-zinc-400 hover:text-white shrink-0 cursor-pointer"
                  >
                    {copiedKey === 'btc-addr' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>On-Chain Sats: {activeWallet.onChainLiveTelemetry.btcConfirmedSats}</span>
                  <span className="text-orange-300">
                    Fee: {activeWallet.onChainLiveTelemetry.btcFastestFeeSatVb} sat/vB
                  </span>
                </div>
              </div>

              {/* Ethereum EIP-55 Address Card */}
              <div className="rounded-2xl bg-zinc-900/80 border border-sky-500/30 p-4 flex flex-col justify-between gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[10px] font-bold">
                    ETHEREUM / EVM (EIP-55 · Keccak-256)
                  </span>
                  <a
                    href={`https://etherscan.io/address/${activeWallet.addresses.ethereumEip55}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-sky-300 hover:underline flex items-center gap-1"
                  >
                    <span>Etherscan</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-2 flex items-center justify-between gap-2">
                  <code className="text-[11px] text-zinc-200 truncate">
                    {activeWallet.addresses.ethereumEip55}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyText(activeWallet.addresses.ethereumEip55, 'eth-addr')}
                    className="text-zinc-400 hover:text-white shrink-0 cursor-pointer"
                  >
                    {copiedKey === 'eth-addr' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Block #{activeWallet.onChainLiveTelemetry.ethBlockNumber}</span>
                  <button
                    type="button"
                    onClick={() => handleConnectBrowserWeb3('ethereum')}
                    className="text-sky-300 hover:underline cursor-pointer"
                  >
                    {connectedBrowserWallet?.provider.includes('MetaMask')
                      ? `Linked: ${connectedBrowserWallet.address.slice(0, 8)}...`
                      : 'Link MetaMask'}
                  </button>
                </div>
              </div>

              {/* Solana Ed25519 Address Card */}
              <div className="rounded-2xl bg-zinc-900/80 border border-purple-500/30 p-4 flex flex-col justify-between gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-bold">
                    SOLANA (Ed25519 · Base58)
                  </span>
                  <a
                    href={`https://solscan.io/account/${activeWallet.addresses.solanaBase58}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-purple-300 hover:underline flex items-center gap-1"
                  >
                    <span>Solscan</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-2 flex items-center justify-between gap-2">
                  <code className="text-[11px] text-zinc-200 truncate">
                    {activeWallet.addresses.solanaBase58}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyText(activeWallet.addresses.solanaBase58, 'sol-addr')}
                    className="text-zinc-400 hover:text-white shrink-0 cursor-pointer"
                  >
                    {copiedKey === 'sol-addr' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>
                    Devnet: {activeWallet.onChainLiveTelemetry.solDevnetBalanceSol.toFixed(2)} SOL
                  </span>
                  <button
                    type="button"
                    disabled={airdropBusy}
                    onClick={handleSolanaDevnetAirdrop}
                    className="text-purple-300 hover:underline font-bold cursor-pointer"
                  >
                    {airdropBusy ? 'Airdropping...' : '+1 SOL Devnet Airdrop'}
                  </button>
                </div>
              </div>
            </div>

            {/* ============================================================= */}
            {/* TAB: PORTFOLIO OVERVIEW & SIGNED TRANSACTION LEDGER           */}
            {/* ============================================================= */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="rounded-2xl bg-zinc-900/75 border border-zinc-800 overflow-hidden shadow-xl">
                  <div className="px-5 py-3.5 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-400" />
                      <h2 className="text-xs font-black uppercase tracking-wider text-zinc-200">
                        Multi-Chain Crypto Holdings & Live Laplace-14 (h=2s) 5-Minute Forecasts
                      </h2>
                    </div>
                    {onSelectModule && (
                      <button
                        type="button"
                        onClick={() => onSelectModule('macro-telemetry')}
                        className="text-xs text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Activity className="w-3.5 h-3.5" />
                        <span>View Overlapped 20-Market & Crypto Graph</span>
                      </button>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-950/80 text-[10px] uppercase text-zinc-400 border-b border-zinc-800">
                        <tr>
                          <th className="py-3 px-4">Asset</th>
                          <th className="py-3 px-4">Quantity</th>
                          <th className="py-3 px-4">Avg Entry</th>
                          <th className="py-3 px-4">Live Price</th>
                          <th className="py-3 px-4">Market Value</th>
                          <th className="py-3 px-4">Unrealized PnL</th>
                          <th className="py-3 px-4">5m Laplace-14 Forecast</th>
                          <th className="py-3 px-4 text-right">Quick Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/70">
                        {activeWallet.holdings.map((h) => {
                          const lp = livePrices[h.symbol];
                          const forecast5m = lp?.forecast5mPct ?? 0;
                          const cert99 = lp?.conformal99Pct ?? 99.8;
                          return (
                            <tr key={h.symbol} className="hover:bg-zinc-800/40">
                              <td className="py-3 px-4 font-bold text-zinc-100">
                                <div>{h.symbol}</div>
                                <div className="text-[10px] text-zinc-500 font-normal">{h.name}</div>
                              </td>
                              <td className="py-3 px-4 tabular-nums font-semibold">
                                {h.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                              </td>
                              <td className="py-3 px-4 tabular-nums text-zinc-400">
                                ${h.avgEntryPriceUsd.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                              </td>
                              <td className="py-3 px-4 tabular-nums font-bold text-zinc-100">
                                ${h.currentPriceUsd.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                              </td>
                              <td className="py-3 px-4 tabular-nums font-bold text-amber-300">
                                ${h.marketValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-4 tabular-nums">
                                <span
                                  className={`font-bold ${
                                    h.unrealizedPnlUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                  }`}
                                >
                                  {h.unrealizedPnlUsd >= 0 ? '+' : ''}$
                                  {h.unrealizedPnlUsd.toLocaleString(undefined, {
                                    minimumFractionDigits: 2
                                  })}{' '}
                                  ({h.unrealizedPnlPct >= 0 ? '+' : ''}
                                  {h.unrealizedPnlPct.toFixed(2)}%)
                                </span>
                              </td>
                              <td className="py-3 px-4 tabular-nums">
                                <span
                                  className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                                    forecast5m >= 0
                                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                      : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                  }`}
                                >
                                  {forecast5m >= 0 ? '+' : ''}
                                  {forecast5m.toFixed(2)}% (5m · {cert99}% Cert)
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOrderSymbol(h.symbol as any);
                                      setOrderAction('BUY');
                                      setActiveTab('trade-transfer');
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-[11px] cursor-pointer"
                                  >
                                    Buy
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOrderSymbol(h.symbol as any);
                                      setOrderAction('SELL');
                                      setOrderQuantityNative(String(Number((h.quantity * 0.25).toFixed(4))));
                                      setActiveTab('trade-transfer');
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-[11px] cursor-pointer"
                                  >
                                    Sell
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Cryptographically Signed Transaction & Execution Ledger */}
                <div className="rounded-2xl bg-zinc-900/75 border border-zinc-800 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-emerald-400" />
                      <span>
                        Cryptographically Signed Transactions & Autonomous Execution Proofs (
                        {transactions.length})
                      </span>
                    </h3>
                    <span className="text-[11px] text-zinc-500">
                      Signed via secp256k1 / Ed25519 Private Keys
                    </span>
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="rounded-xl bg-zinc-950/90 border border-zinc-800/90 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                tx.walletRole === 'AGENTIC_AUTONOMOUS'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {tx.walletRole === 'AGENTIC_AUTONOMOUS' ? 'UID 0 AGENTIC' : 'PERSONAL'}
                            </span>
                            <span className="font-bold text-zinc-100">
                              {tx.type} · {tx.amountNative} {tx.symbol} ($
                              {tx.totalValueUsd.toLocaleString()})
                            </span>
                            <span className="text-[10px] text-zinc-500">
                              {new Date(tx.timestamp).toLocaleTimeString()}
                            </span>
                            {tx.signatureAlgorithm && (
                              <span className="px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[10px] font-mono">
                                {tx.signatureAlgorithm} · {tx.signatureVerified !== false ? 'VERIFIED' : 'UNVERIFIED'}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-300">{tx.triggerReason}</p>
                          <div className="text-[10px] text-zinc-500 font-mono truncate">
                            TxHash: <span className="text-sky-400">{tx.txHash}</span> · Sig:{' '}
                            <span className="text-emerald-400">{tx.signatureHex.slice(0, 28)}...</span>
                          </div>
                        </div>
                        <a
                          href={tx.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[11px] text-sky-300 flex items-center gap-1 shrink-0 self-start sm:self-center"
                        >
                          <span>Explorer</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB: INVEST / BUY / SELL / ON-CHAIN TRANSFER DESK             */}
            {/* ============================================================= */}
            {activeTab === 'trade-transfer' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-6 space-y-4">
                  <h2 className="text-base font-black text-zinc-100 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-400" />
                    <span>Execute Signed Investment Order or On-Chain Transfer</span>
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Executing inside:{' '}
                    <strong className="text-amber-300">{activeWallet.label}</strong> (Available Cash
                    Reserve: <strong className="text-emerald-300">${activeWallet.cashReserveUsd.toLocaleString()}</strong>)
                  </p>

                  <form onSubmit={handleExecuteOrder} className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      {(['BUY', 'SELL', 'ONCHAIN_TRANSFER'] as const).map((act) => (
                        <button
                          key={act}
                          type="button"
                          onClick={() => setOrderAction(act)}
                          className={`py-2.5 rounded-xl font-black text-xs cursor-pointer border transition-all ${
                            orderAction === act
                              ? act === 'BUY'
                                ? 'bg-emerald-500 text-zinc-950 border-emerald-400'
                                : act === 'SELL'
                                ? 'bg-rose-500 text-white border-rose-400'
                                : 'bg-sky-500 text-zinc-950 border-sky-400'
                              : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                          }`}
                        >
                          {act === 'BUY'
                            ? 'BUY / INVEST'
                            : act === 'SELL'
                            ? 'SELL / TAKE PROFIT'
                            : 'ON-CHAIN SEND'}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-zinc-300">
                        Select Crypto Asset
                      </label>
                      <div className="grid grid-cols-5 gap-2">
                        {(['BTC', 'ETH', 'SOL', 'XRP', 'DOGE'] as const).map((sym) => (
                          <button
                            key={sym}
                            type="button"
                            onClick={() => setOrderSymbol(sym)}
                            className={`py-2 rounded-xl font-bold text-xs cursor-pointer border ${
                              orderSymbol === sym
                                ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                                : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                            }`}
                          >
                            {sym}
                          </button>
                        ))}
                      </div>
                    </div>

                    {orderAction === 'BUY' ? (
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-zinc-300">
                          Investment Amount in USD ($)
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="1"
                          required
                          value={orderAmountUsd}
                          onChange={(e) => setOrderAmountUsd(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-zinc-300">
                          Token Quantity ({orderSymbol})
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0.00001"
                          required
                          value={orderQuantityNative}
                          onChange={(e) => setOrderQuantityNative(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100"
                        />
                      </div>
                    )}

                    {orderAction === 'ONCHAIN_TRANSFER' && (
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-zinc-300">
                          Recipient On-Chain Address ({orderSymbol === 'BTC' ? 'bc1q... / 1...' : orderSymbol === 'ETH' ? '0x...' : 'Base58'})
                        </label>
                        <input
                          type="text"
                          required
                          value={transferToAddress}
                          onChange={(e) => setTransferToAddress(e.target.value)}
                          placeholder={
                            orderSymbol === 'BTC'
                              ? 'bc1q...'
                              : orderSymbol === 'ETH'
                              ? '0x...'
                              : 'Solana Base58 address...'
                          }
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100"
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={executingOrder}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                    >
                      <Send className="w-4 h-4" />
                      <span>
                        {executingOrder
                          ? 'Cryptographically Signing & Executing...'
                          : `Sign & Execute ${orderAction} (${orderSymbol})`}
                      </span>
                    </button>
                  </form>
                </div>

                {/* Direct DEX & On-Ramp Liquidity Bridges */}
                <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-6 space-y-4">
                  <h3 className="text-base font-black text-zinc-100 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    <span>Direct On-Chain DEX & Fiat On-Ramp Bridges</span>
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Fund your Sovereign Self-Custody addresses directly from major exchanges or swap tokens on decentralized liquidity protocols using your wallet addresses above.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      {
                        name: 'Uniswap V3 (Ethereum EVM)',
                        desc: 'Swap ETH & ERC-20 tokens directly on Mainnet',
                        url: 'https://app.uniswap.org/swap'
                      },
                      {
                        name: 'Jupiter Aggregator (Solana)',
                        desc: 'Best-price Solana DEX routing & limit orders',
                        url: 'https://jup.ag/'
                      },
                      {
                        name: '1inch DeFi Aggregator',
                        desc: 'Multi-chain EVM liquidity router',
                        url: 'https://app.1inch.io/'
                      },
                      {
                        name: 'Mempool.space Bitcoin Explorer',
                        desc: 'Track real-time BTC SegWit UTXOs & fees',
                        url: `https://mempool.space/address/${activeWallet.addresses.bitcoinSegwit}`
                      }
                    ].map((bridge) => (
                      <a
                        key={bridge.name}
                        href={bridge.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-3.5 rounded-xl bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 flex flex-col justify-between gap-2 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-amber-300">{bridge.name}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                        </div>
                        <p className="text-[11px] text-zinc-400">{bridge.desc}</p>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB: AGENTIC 5M AUTONOMOUS EXECUTION POLICY                   */}
            {/* ============================================================= */}
            {activeTab === 'agentic-policy' && (
              <div className="rounded-2xl bg-zinc-900/80 border border-amber-500/30 p-6 space-y-5 max-w-4xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-black text-white flex items-center gap-2">
                      <Bot className="w-5 h-5 text-amber-400" />
                      <span>UID 0 Autonomous Agentic Crypto Treasury Policy</span>
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Driven by the Multi-Kernel Laplace-14 Close (`h = 2s`) 99% Conformal 5-Minute Early-Warning Engine.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRunAgenticCycle}
                    disabled={runningAgenticCycle}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Trigger Autonomous 5m Execution Cycle Now</span>
                  </button>
                </div>

                {wallets
                  .filter((w) => w.role === 'AGENTIC_AUTONOMOUS')
                  .map((aw) => (
                    <div key={aw.id} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                          <div className="text-[10px] text-zinc-500 uppercase">
                            Max Single Autonomous Trade
                          </div>
                          <div className="text-lg font-black text-amber-300 mt-1">
                            ${aw.agenticPolicy?.maxSingleTradeUsd.toLocaleString()}
                          </div>
                        </div>
                        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                          <div className="text-[10px] text-zinc-500 uppercase">
                            Required Conformal Certainty
                          </div>
                          <div className="text-lg font-black text-emerald-400 mt-1">
                            &ge; {aw.agenticPolicy?.minConformalCertaintyPct.toFixed(1)}% (α = 0.01)
                          </div>
                        </div>
                        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                          <div className="text-[10px] text-zinc-500 uppercase">
                            Cumulative Realized Agentic Profit
                          </div>
                          <div className="text-lg font-black text-emerald-300 mt-1">
                            +${(aw.agenticPolicy?.cumulativeAutonomousProfitUsd || 0).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB: SELF-CUSTODY PRIVATE KEYS & BIP-39 SEED BACKUP           */}
            {/* ============================================================= */}
            {activeTab === 'keystore' && (
              <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-6 space-y-5 max-w-4xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-black text-zinc-100 flex items-center gap-2">
                      <Key className="w-5 h-5 text-amber-400" />
                      <span>Self-Custody Cryptographic Keys & AES-256-GCM Keystore Backup</span>
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Real derived `secp256k1` (Ethereum & Bitcoin WIF) and `ed25519` (Solana Base58) keys for{' '}
                      <strong className="text-zinc-200">{activeWallet.label}</strong>.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRevealSecrets((r) => !r)}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      {revealSecrets ? (
                        <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      <span>{revealSecrets ? 'Hide Private Keys' : 'Reveal Private Keys'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadKeystoreJson}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Keystore JSON</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  {[
                    {
                      label: '12-Word BIP-39 Recovery Seed Phrase',
                      val: activeWallet.secrets.mnemonic12,
                      id: 'seed'
                    },
                    {
                      label: 'Ethereum / EVM Private Key (secp256k1 32-Byte Hex — Importable to MetaMask/Rabby)',
                      val: activeWallet.secrets.ethereumPrivateKeyHex,
                      id: 'eth-priv'
                    },
                    {
                      label: 'Bitcoin Compressed WIF Private Key (Base58Check — Importable to Electrum/Sparrow)',
                      val: activeWallet.secrets.bitcoinWifPrivateKey,
                      id: 'btc-wif'
                    },
                    {
                      label: 'Solana 64-Byte Ed25519 Secret Key (Base58 — Importable to Phantom/Solflare)',
                      val: activeWallet.secrets.solanaSecretKeyBase58,
                      id: 'sol-priv'
                    }
                  ].map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-zinc-400">
                        <span className="font-bold text-[11px]">{item.label}</span>
                        <button
                          type="button"
                          onClick={() => copyText(item.val, item.id)}
                          className="text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {copiedKey === item.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedKey === item.id ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="font-mono text-xs text-emerald-300 break-all">
                        {revealSecrets ? item.val : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB: CREATE OR IMPORT NEW MULTI-CHAIN VAULT                   */}
            {/* ============================================================= */}
            {activeTab === 'new-wallet' && (
              <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-6 space-y-4 max-w-2xl">
                <h2 className="text-base font-black text-zinc-100 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-amber-400" />
                  <span>Create New Multi-Chain Vault or Import Existing Private Key</span>
                </h2>
                <form onSubmit={handleCreateCustomWallet} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-300">Vault Label</label>
                    <input
                      type="text"
                      required
                      value={newWalletLabel}
                      onChange={(e) => setNewWalletLabel(e.target.value)}
                      placeholder="e.g. Long-Term Cold Storage Vault or High-Frequency Agentic Sub-Vault"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-zinc-300">Vault Role</label>
                      <select
                        value={newWalletRole}
                        onChange={(e) => setNewWalletRole(e.target.value as any)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100"
                      >
                        <option value="PERSONAL_INVESTOR">Personal Investor Self-Custody</option>
                        <option value="AGENTIC_AUTONOMOUS">UID 0 Autonomous Agentic Treasury</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-zinc-300">Starting Real Balance</label>
                      <div className="w-full bg-zinc-950/70 border border-emerald-500/30 rounded-xl px-3.5 py-2.5 text-emerald-300 font-bold">
                        $0.00 (100% Real On-Chain · Zero Simulated Cash)
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-300">
                      Import Existing 32-Byte Hex Private Key (Optional — leave blank to generate fresh CSPRNG keys)
                    </label>
                    <input
                      type="text"
                      value={importPrivKeyHex}
                      onChange={(e) => setImportPrivKeyHex(e.target.value)}
                      placeholder="0x... (optional 64-hex-character secp256k1 private key)"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs cursor-pointer"
                  >
                    Generate & Encrypt Multi-Chain Vault (AES-256-GCM)
                  </button>
                </form>
              </div>
            )}

            {/* EASY BANK & DIGITAL EQUIVALENT TRANSFERS TAB */}
            {activeTab === 'bank-transfer' && activeWallet && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-7 rounded-2xl bg-zinc-900/90 border border-zinc-800 p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-black text-emerald-300 flex items-center gap-2">
                        <Send className="w-4 h-4" />
                        <span>Send Currency to Banks or Digital Equivalents</span>
                      </h2>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Transfer directly from USD Cash Reserve or auto-convert BTC, ETH, SOL, XRP, or DOGE at live spot price to Bank ACH, FedNow, Wire/SWIFT, SEPA, Cash App, Venmo, PayPal, Zelle, Apple Cash, Wise, Revolut, or Exchanges.
                      </p>
                    </div>
                  </div>

                  {/* Quick-Pick Rail Tiles */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {[
                      { id: 'BANK_ACH', label: 'US Bank ACH', sub: '$0 · Checking/Savings' },
                      { id: 'FEDNOW_INSTANT', label: 'FedNow Instant', sub: '$0.50 · <15 sec' },
                      { id: 'WIRE_SWIFT', label: 'Wire / SWIFT', sub: 'Domestic / Intl' },
                      { id: 'SEPA_INSTANT', label: 'SEPA Instant', sub: 'EUR IBAN' },
                      { id: 'CASH_APP', label: 'Cash App', sub: '$Cashtag · Instant' },
                      { id: 'VENMO', label: 'Venmo', sub: '@Handle · Instant' },
                      { id: 'PAYPAL', label: 'PayPal', sub: 'Email / PayPal.me' },
                      { id: 'ZELLE', label: 'Zelle', sub: 'Email / Mobile' },
                      { id: 'APPLE_CASH', label: 'Apple Cash', sub: 'Phone / Apple ID' },
                      { id: 'WISE_REVOLUT', label: 'Wise / Revolut', sub: 'Multi-Currency' },
                      { id: 'EXCHANGE_OFFRAMP', label: 'Coinbase / Kraken', sub: 'Exchange Account' }
                    ].map((rail) => (
                      <button
                        key={rail.id}
                        type="button"
                        onClick={() => {
                          setPayoutRail(rail.id);
                          if (rail.id === 'SEPA_INSTANT') setPayoutCurrency('EUR');
                        }}
                        className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                          payoutRail === rail.id
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100'
                            : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                        }`}
                      >
                        <div className="text-[11px] font-bold leading-tight">{rail.label}</div>
                        <div className="text-[9px] text-zinc-400 mt-0.5">{rail.sub}</div>
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleBankOrDigitalTransfer} className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-zinc-300">Funding Source</label>
                        <select
                          value={payoutFunding}
                          onChange={(e) => setPayoutFunding(e.target.value as any)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100"
                        >
                          <option value="USD_CASH">USD Cash (${activeWallet.cashReserveUsd.toFixed(2)})</option>
                          {activeWallet.holdings.map((h) => (
                            <option key={h.symbol} value={h.symbol}>
                              Auto-Convert {h.symbol} (${h.marketValueUsd.toFixed(2)})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-zinc-300">Amount (USD)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="1"
                          required
                          value={payoutAmountUsd}
                          onChange={(e) => setPayoutAmountUsd(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-zinc-300">Destination Currency</label>
                        <select
                          value={payoutCurrency}
                          onChange={(e) => setPayoutCurrency(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100"
                        >
                          {['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'MXN', 'CHF'].map((cur) => (
                            <option key={cur} value={cur}>{cur}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-zinc-300">Recipient Full Name</label>
                        <input
                          type="text"
                          required
                          value={payoutRecipientName}
                          onChange={(e) => setPayoutRecipientName(e.target.value)}
                          placeholder="e.g. Joshua Hamilton"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-zinc-300">Bank / Platform Name</label>
                        <input
                          type="text"
                          value={payoutInstitution}
                          onChange={(e) => setPayoutInstitution(e.target.value)}
                          placeholder="e.g. Chase, Bank of America, Cash App, Venmo"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-zinc-300">
                          {['BANK_ACH', 'FEDNOW_INSTANT', 'WIRE_SWIFT', 'SEPA_INSTANT'].includes(payoutRail)
                            ? 'Account Number / IBAN'
                            : 'Handle / $Cashtag / Email / Phone'}
                        </label>
                        <input
                          type="text"
                          required
                          value={payoutAccountOrHandle}
                          onChange={(e) => setPayoutAccountOrHandle(e.target.value)}
                          placeholder={
                            payoutRail === 'CASH_APP'
                              ? '$YourCashtag'
                              : payoutRail === 'VENMO'
                              ? '@YourVenmoHandle'
                              : payoutRail === 'PAYPAL' || payoutRail === 'ZELLE'
                              ? 'name@email.com or +1-555-0199'
                              : 'Account # or IBAN'
                          }
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-zinc-300">
                          {['BANK_ACH', 'FEDNOW_INSTANT'].includes(payoutRail)
                            ? '9-Digit ABA Routing Number'
                            : payoutRail === 'WIRE_SWIFT' || payoutRail === 'SEPA_INSTANT'
                            ? 'SWIFT / BIC Code (Optional)'
                            : 'Reference / Memo (Optional)'}
                        </label>
                        {['BANK_ACH', 'FEDNOW_INSTANT', 'WIRE_SWIFT', 'SEPA_INSTANT'].includes(payoutRail) ? (
                          <input
                            type="text"
                            value={payoutRoutingOrSwift}
                            onChange={(e) => setPayoutRoutingOrSwift(e.target.value)}
                            placeholder={payoutRail === 'WIRE_SWIFT' ? 'CHASUS33 / SWIFT BIC' : '021000021'}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100"
                          />
                        ) : (
                          <input
                            type="text"
                            value={payoutMemo}
                            onChange={(e) => setPayoutMemo(e.target.value)}
                            placeholder="Optional payment note"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100"
                          />
                        )}
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-[11px] text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={payoutSaveBeneficiary}
                        onChange={(e) => setPayoutSaveBeneficiary(e.target.checked)}
                        className="accent-emerald-400"
                      />
                      <span>Save bank / digital destination inside encrypted AES-256-GCM vault for 1-click repeat transfers</span>
                    </label>

                    <button
                      type="submit"
                      disabled={payoutBusy}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 text-zinc-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                    >
                      <Send className="w-4 h-4" />
                      <span>
                        {payoutBusy
                          ? 'Signing & Dispatching ISO-20022 Settlement...'
                          : `Send $${Number(payoutAmountUsd || 0).toFixed(2)} (${payoutCurrency}) via ${payoutRail.replace(/_/g, ' ')}`}
                      </span>
                    </button>
                  </form>
                </div>

                {/* Right: Saved Bank/Digital Beneficiaries + Signed Receipts */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-4 space-y-2.5">
                    <h3 className="text-xs font-black text-amber-300 uppercase">
                      Saved Banks &amp; Digital Accounts ({beneficiaries.length})
                    </h3>
                    {beneficiaries.length === 0 ? (
                      <p className="text-[11px] text-zinc-400">
                        Check &quot;Save bank / digital destination&quot; on your first transfer to enable 1-click repeat payouts to Chase, Cash App, Venmo, PayPal, Zelle, or Wise.
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {beneficiaries.map((b) => (
                          <div
                            key={b.id}
                            className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setPayoutRail(b.rail);
                                setPayoutRecipientName(b.recipientName);
                                setPayoutInstitution(b.institutionName);
                                setPayoutAccountOrHandle(b.accountOrHandle);
                                setPayoutRoutingOrSwift(b.routingOrSwift || '');
                                setPayoutCurrency(b.currency || 'USD');
                              }}
                              className="text-left flex-1 min-w-0 cursor-pointer"
                            >
                              <div className="text-xs font-bold text-zinc-100 truncate">{b.label}</div>
                              <div className="text-[10px] text-zinc-400 truncate">
                                {b.rail.replace(/_/g, ' ')} · {b.accountOrHandle}
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBeneficiary(b.id)}
                              className="px-2 py-1 rounded bg-zinc-900 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 text-[10px] cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-4 space-y-2.5">
                    <h3 className="text-xs font-black text-sky-300 uppercase">
                      Signed Bank &amp; Digital Transfer Receipts
                    </h3>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {transactions.filter((tx) => tx.type === 'BANK_OR_DIGITAL_TRANSFER').length === 0 ? (
                        <p className="text-[11px] text-zinc-400">
                          No bank or digital equivalent payouts dispatched yet. Every transfer generates a cryptographically signed ISO-20022 UETR settlement receipt.
                        </p>
                      ) : (
                        transactions
                          .filter((tx) => tx.type === 'BANK_OR_DIGITAL_TRANSFER')
                          .slice(0, 12)
                          .map((tx) => (
                            <div
                              key={tx.id}
                              className="p-2.5 rounded-xl bg-zinc-950 border border-emerald-500/25 space-y-1 text-[11px]"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-emerald-300">
                                  {tx.railMetadata?.targetCurrency || 'USD'}{' '}
                                  {(tx.railMetadata?.targetAmount ?? tx.totalValueUsd).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  })}
                                </span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                                  {tx.railMetadata?.railLabel || 'Bank Rail'}
                                </span>
                              </div>
                              <div className="text-zinc-300 truncate">
                                To: {tx.railMetadata?.recipientName} ({tx.railMetadata?.destinationMasked})
                              </div>
                              <div className="text-[10px] text-zinc-500 flex items-center justify-between gap-2">
                                <span className="truncate">UETR: {tx.railMetadata?.uetrReference?.slice(0, 18)}...</span>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadTransferReceipt(tx)}
                                  className="text-sky-400 hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>Receipt</span>
                                </button>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: AGENTIC GRANTS, REAL CAPITAL BOOTSTRAP & CONNECT REAL EXTERNAL WALLETS */}
            {activeTab === 'bootstrap' && (
              <div className="space-y-5">
                {/* 100% Autonomous OS Macro-Telemetry Wallet Daemon Console */}
                <div className="rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-amber-500/40 p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-sm font-black text-amber-300">
                          100% AUTONOMOUS OS WALLET DAEMON ↔ LIVE MACRO TELEMETRY
                        </h2>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            daemonStatus?.status === 'LIVE_AUTONOMOUS_TRADING'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : daemonStatus?.status === 'PAUSED'
                              ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                              : 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
                          }`}
                        >
                          {daemonStatus?.status || 'ARMED_STANDBY_AWAITING_REAL_CAPITAL'}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Continuously scans live 5-minute Macro Telemetry conformal signals + real mainnet &amp; exchange balances every 60s. Auto-activates live orders immediately once real capital &amp; venue keys are present.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={daemonTickBusy}
                        onClick={async () => {
                          setDaemonTickBusy(true);
                          try {
                            const d = await safeWalletFetchJson('/api/crypto/wallets/daemon', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ action: 'tick' })
                            }, 1);
                            if (d?.daemon) setDaemonStatus(d.daemon);
                          } finally {
                            setDaemonTickBusy(false);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-[11px] font-black cursor-pointer"
                      >
                        {daemonTickBusy ? 'Scanning Macro Telemetry...' : 'Run Live Macro Scan Now'}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const nextEnabled = !(daemonStatus?.enabled ?? true);
                          const d = await safeWalletFetchJson('/api/crypto/wallets/daemon', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ enabled: nextEnabled, fullAutonomyAllWallets: true })
                          }, 1);
                          if (d?.daemon) setDaemonStatus(d.daemon);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${
                          daemonStatus?.enabled !== false
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                        }`}
                      >
                        {daemonStatus?.enabled !== false ? '100% OS Autonomy: ON' : 'OS Autonomy: PAUSED'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                    <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                      <div className="text-zinc-500 text-[10px]">Real On-Chain Capital</div>
                      <div className="text-sm font-black text-emerald-300">
                        ${(daemonStatus?.liveOnChainUsdDetected || 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                      <div className="text-zinc-500 text-[10px]">Real Exchange Capital</div>
                      <div className="text-sm font-black text-sky-300">
                        ${(daemonStatus?.liveExchangeUsdDetected || 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                      <div className="text-zinc-500 text-[10px]">Live Macro Scans</div>
                      <div className="text-sm font-black text-amber-300">
                        {daemonStatus?.totalScans || 0}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                      <div className="text-zinc-500 text-[10px]">Real Orders Executed</div>
                      <div className="text-sm font-black text-zinc-100">
                        {daemonStatus?.totalLiveOrdersExecuted || 0}
                      </div>
                    </div>
                  </div>

                  {daemonStatus && daemonStatus.logs.length > 0 && (
                    <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3 max-h-36 overflow-y-auto space-y-1 text-[10px]">
                      {daemonStatus.logs.slice(0, 6).map((l, idx) => (
                        <div key={`${l.timestamp}-${idx}`} className="text-zinc-300 flex items-start gap-2">
                          <span className="text-zinc-500 shrink-0">
                            {new Date(l.timestamp).toLocaleTimeString()}
                          </span>
                          <span className="text-amber-300 font-bold shrink-0">[{l.phase}]</span>
                          <span className="break-words">{l.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Zero-Fake Guarantee + Live Execution Connectors */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  <div className="lg:col-span-7 rounded-2xl bg-zinc-900/90 border border-emerald-500/30 p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <h2 className="text-sm font-black text-emerald-300">
                          100% REAL PRODUCTION CONNECTORS &amp; EXECUTION VENUES
                        </h2>
                        <p className="text-[11px] text-zinc-400">
                          Zero paper balances, zero simulated fills. Connect real mainnet funds or exchange/agentic APIs to trade autonomously.
                        </p>
                      </div>
                      {onSelectModule && (
                        <button
                          type="button"
                          onClick={() => onSelectModule('api-secrets')}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-[11px] font-black cursor-pointer"
                        >
                          Configure API Keys →
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {bootstrapConnectors.map((c) => (
                        <div
                          key={c.id}
                          className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-start justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-zinc-100">{c.name}</div>
                            <div className="text-[11px] text-zinc-400 mt-0.5">{c.purpose}</div>
                            <div className="text-[10px] text-zinc-500 mt-1">
                              Env Keys: {c.envKeys.join(' · ')}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              c.connected
                                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                                : 'bg-zinc-800 border border-zinc-700 text-zinc-400'
                            }`}
                          >
                            {c.connected ? 'CONNECTED' : 'NOT LINKED'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Link Real Existing External Wallets (MetaMask / Phantom / Watch-Only BTC/ETH/SOL) */}
                  <div className="lg:col-span-5 rounded-2xl bg-zinc-900/90 border border-sky-500/30 p-5 space-y-3">
                    <div>
                      <h2 className="text-sm font-black text-sky-300">
                        LINK YOUR REAL EXTERNAL WALLETS
                      </h2>
                      <p className="text-[11px] text-zinc-400">
                        Connect MetaMask/Phantom or paste any public BTC, ETH, or SOL mainnet address you already own to track live real on-chain balances.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleConnectBrowserWeb3('ethereum')}
                        className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 text-xs font-bold cursor-pointer"
                      >
                        Connect MetaMask (ETH)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConnectBrowserWeb3('solana')}
                        className="px-3 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-200 text-xs font-bold cursor-pointer"
                      >
                        Connect Phantom (SOL)
                      </button>
                    </div>

                    <form onSubmit={handleLinkWatchOnlyWallet} className="space-y-2 pt-2 border-t border-zinc-800">
                      <input
                        value={linkLabel}
                        onChange={(e) => setLinkLabel(e.target.value)}
                        placeholder="Wallet Label (e.g. My Coinbase / Ledger Wallet)"
                        className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
                      />
                      <input
                        value={linkEthAddr}
                        onChange={(e) => setLinkEthAddr(e.target.value)}
                        placeholder="Real Ethereum Address (0x...)"
                        className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
                      />
                      <input
                        value={linkBtcAddr}
                        onChange={(e) => setLinkBtcAddr(e.target.value)}
                        placeholder="Real Bitcoin Address (bc1q... or 1... / 3...)"
                        className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
                      />
                      <input
                        value={linkSolAddr}
                        onChange={(e) => setLinkSolAddr(e.target.value)}
                        placeholder="Real Solana Base58 Address"
                        className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
                      />
                      <button
                        type="submit"
                        disabled={linkingExternal}
                        className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-black text-xs cursor-pointer"
                      >
                        {linkingExternal ? 'Syncing Mainnet RPCs...' : 'Link Real Public Address & Sync Balance'}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Verified Agentic Wallet Grants & Legitimate Real Crypto Starter Programs */}
                <div className="rounded-2xl bg-zinc-900/90 border border-amber-500/30 p-5 space-y-4">
                  <div>
                    <h2 className="text-sm font-black text-amber-300">
                      VERIFIED REAL AGENTIC WALLET GRANTS &amp; LEGITIMATE CRYPTO STARTER PROGRAMS
                    </h2>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Real-world, legitimate programs where builders and users can earn or qualify for real starting crypto capital (then route it into your funded Agentic Treasury for autonomous trading). Zero scam faucets, honest KYC/application disclosures.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {bootstrapPrograms.map((p) => (
                      <div
                        key={p.id}
                        className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                          p.realMainnetValue
                            ? 'bg-zinc-950/90 border-zinc-800 hover:border-emerald-500/40'
                            : 'bg-zinc-950/60 border-zinc-800/70'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-xs font-black text-zinc-100">{p.name}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                p.realMainnetValue
                                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                              }`}
                            >
                              {p.realMainnetValue ? 'REAL MAINNET VALUE' : 'TESTNET ONLY ($0)'}
                            </span>
                          </div>
                          <div className="text-[11px] font-bold text-amber-300">
                            {p.provider} · {p.potentialValue}
                          </div>
                          <p className="text-[11px] text-zinc-300 leading-relaxed">{p.summary}</p>
                          <div className="text-[10px] text-zinc-500">
                            Requirement: {p.kycOrApprovalRequired}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800/80">
                          <span className="text-[10px] text-sky-400 truncate">{p.officialUrl}</span>
                          <a
                            href={p.officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-[10px] font-bold flex items-center gap-1 shrink-0"
                          >
                            <span>Official Site</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {/* TAB: COINBASE DEVELOPER PLATFORM (CDP) TRADING & WALLETS */}
            {activeTab === 'coinbase-cdp' && <CoinbaseCdpTradingPanel onSelectModule={onSelectModule} />}
            {/* TAB: AUTONOMOUS NON-RECIPROCAL GRANT HUNTER & APPLICATION ENGINE */}
            {activeTab === 'grants' && <AutonomousGrantEnginePanel />}
          </div>
        )}
      </div>
    </div>
  );
};
