/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  HeartHandshake,
  Layers,
  Loader2,
  MessageSquarePlus,
  Receipt,
  ShieldCheck,
  Sparkles,
  Wallet,
  X
} from 'lucide-react';
import type {
  AuthUserPublic,
  BillingConfigPublic,
  BillingLedgerRecord,
  CryptoPaymentInvoice,
  DailyAiQuotaUsage,
  SupporterBoardEntry,
  SupporterBoardSummary,
  SupporterFeedbackSentiment,
  SupportedBillingChain,
  SupportedBillingCryptoToken,
  UserPrivileges,
  UserTierDefinition
} from '../types/auth';
import {
  cancelCryptoInvoice,
  createCryptoInvoice,
  createDonationCryptoInvoice,
  createDonationStripeCheckout,
  createStripeCheckout,
  fetchBillingStatus,
  postFounderSupporterNote,
  verifyCryptoPayment
} from '../utils/authClient';

interface BillingUpgradeModalProps {
  isOpen: boolean;
  currentUser: AuthUserPublic | null;
  onClose: () => void;
  onUpgraded?: () => void;
  highlightModule?: string | null;
  initialTab?: 'tiers' | 'donate' | 'wall';
}

const CHAIN_LABELS: Record<SupportedBillingChain, { name: string; hexId: string }> = {
  base: { name: 'Base Mainnet', hexId: '0x2105' },
  ethereum: { name: 'Ethereum Mainnet', hexId: '0x1' },
  polygon: { name: 'Polygon PoS', hexId: '0x89' },
  arbitrum: { name: 'Arbitrum One', hexId: '0xa4b1' },
  'base-sepolia': { name: 'Base Sepolia (Testnet)', hexId: '0x14a34' }
};

const FEEDBACK_CATEGORIES: Array<{
  value: SupporterFeedbackSentiment;
  label: string;
  shortLabel: string;
  textClass: string;
  hint: string;
}> = [
  {
    value: 'critique',
    label: 'Honest Critique / Bug / Hard Feedback',
    shortLabel: 'Critique & Issue',
    textClass: 'text-rose-300',
    hint: 'Unfiltered criticism helps expose flaws and drive real fixes.'
  },
  {
    value: 'suggestion',
    label: 'Feature Request / Architecture Suggestion',
    shortLabel: 'Suggestion',
    textClass: 'text-cyan-300',
    hint: 'Propose capabilities, ergonomics, or integrations you want prioritized.'
  },
  {
    value: 'praise',
    label: 'Support & Positive Note',
    shortLabel: 'Praise & Support',
    textClass: 'text-emerald-300',
    hint: 'Share what is working well or why you backed the project.'
  },
  {
    value: 'note',
    label: 'General Timestamped Sign-Off',
    shortLabel: 'Note',
    textClass: 'text-zinc-300',
    hint: 'Leave a permanent timestamped mark alongside your contribution.'
  }
];

const DONATION_PRESETS_USD = [5, 15, 25, 50, 100, 250];

const PERMISSION_MATRIX_ROWS: Array<{
  key: keyof Pick<
    UserPrivileges,
    | 'canUseChat'
    | 'canUseVoiceChat'
    | 'canRunAutonomousWorkflow'
    | 'canExecuteTerminalAndTools'
    | 'canAccessSecretsAndWallets'
    | 'canBringOwnKeys'
    | 'canUseBurnerMail'
    | 'canUseInfiniteSim'
    | 'canAccessGrantHunter'
    | 'canModifyOSSettings'
  >;
  label: string;
  desc: string;
}> = [
  { key: 'canUseChat', label: 'AI Orchestrator Chat', desc: 'Interactive resident model & compendium dispatch' },
  { key: 'canUseVoiceChat', label: 'Voice & SoS Duplex', desc: 'Hands-free speech synthesis & voice calls' },
  { key: 'canRunAutonomousWorkflow', label: 'Autonomous Workflows', desc: 'Multi-step loops, batch runner & Spatial Arena' },
  { key: 'canExecuteTerminalAndTools', label: 'Sandboxed Terminal & Tools', desc: 'Isolated shell execution & Tool Shed' },
  { key: 'canAccessSecretsAndWallets', label: 'Crypto Wallet Vault & CDP', desc: 'Personal non-custodial wallets & Coinbase CDP' },
  { key: 'canBringOwnKeys', label: 'Personal API Key Vault', desc: 'Encrypt & store your own Gemini/OpenRouter/Groq keys' },
  { key: 'canUseBurnerMail', label: 'Real Burner Mail Vault', desc: 'Isolated temporary email addresses & OTP parsing' },
  { key: 'canUseInfiniteSim', label: 'Infinite SIM & eSIM', desc: 'Programmable carrier numbers, SMS & voice triage' },
  { key: 'canAccessGrantHunter', label: 'Grant Hunter Engine', desc: 'Automated grant discovery & drafting workspace' },
  { key: 'canModifyOSSettings', label: 'OS & Workspace Preferences', desc: 'Desktop themes, shell layout & continuity state' }
];

function formatUsd(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

function encodeErc20TransferData(toAddress: string, amountUnitsStr: string): string {
  const selector = 'a9059cbb';
  const cleanAddr = toAddress.replace(/^0x/i, '').toLowerCase().padStart(64, '0');
  const amountHex = BigInt(amountUnitsStr).toString(16).padStart(64, '0');
  return `0x${selector}${cleanAddr}${amountHex}`;
}

function safeHttpsUrl(url?: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  return trimmed.startsWith('https://') ? trimmed : null;
}

export const BillingUpgradeModal: React.FC<BillingUpgradeModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onUpgraded,
  highlightModule,
  initialTab = 'tiers'
}) => {
  const [activeTab, setActiveTab] = useState<'tiers' | 'donate' | 'wall'>(initialTab);
  const [loading, setLoading] = useState(true);
  const [tiers, setTiers] = useState<UserTierDefinition[]>([]);
  const [billing, setBilling] = useState<BillingConfigPublic | null>(null);
  const [usage, setUsage] = useState<DailyAiQuotaUsage | null>(null);
  const [ledger, setLedger] = useState<BillingLedgerRecord[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<CryptoPaymentInvoice[]>([]);
  const [founderEligible, setFounderEligible] = useState(false);
  const [supporterBoard, setSupporterBoard] = useState<SupporterBoardEntry[]>([]);
  const [boardSummary, setBoardSummary] = useState<SupporterBoardSummary>({
    totalEntries: 0,
    totalDonationsUsd: 0,
    donationCount: 0,
    founderCount: 0,
    critiqueCount: 0,
    praiseCount: 0,
    suggestionCount: 0
  });

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'one-time'>('monthly');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Crypto checkout drawer state (supports both tier upgrades & donations)
  const [cryptoMode, setCryptoMode] = useState<'tier' | 'donation' | null>(null);
  const [cryptoTier, setCryptoTier] = useState<UserTierDefinition | null>(null);
  const [selectedChain, setSelectedChain] = useState<SupportedBillingChain>('base');
  const [selectedToken, setSelectedToken] = useState<SupportedBillingCryptoToken>('USDC');
  const [activeInvoice, setActiveInvoice] = useState<CryptoPaymentInvoice | null>(null);
  const [txHashInput, setTxHashInput] = useState('');
  const [copiedKey, setCopiedKey] = useState<'addr' | 'uri' | null>(null);

  // Direct Donation form state
  const [donateUsdInput, setDonateUsdInput] = useState<string>('25');
  const [donateAnonymous, setDonateAnonymous] = useState<boolean>(false);
  const [donateAuthorName, setDonateAuthorName] = useState<string>(currentUser?.displayName || '');
  const [donateCategory, setDonateCategory] = useState<SupporterFeedbackSentiment>('critique');
  const [donateMessage, setDonateMessage] = useState<string>('');

  // Founder Wall note composer state
  const [founderAnonymous, setFounderAnonymous] = useState<boolean>(false);
  const [founderAuthorName, setFounderAuthorName] = useState<string>(currentUser?.displayName || '');
  const [founderCategory, setFounderCategory] = useState<SupporterFeedbackSentiment>('critique');
  const [founderMessage, setFounderMessage] = useState<string>('');
  const [wallFilter, setWallFilter] = useState<'all' | 'critique' | 'suggestion' | 'praise' | 'donation' | 'founder-tier'>('all');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (currentUser?.displayName) {
      setDonateAuthorName((prev) => prev || currentUser.displayName);
      setFounderAuthorName((prev) => prev || currentUser.displayName);
    }
  }, [currentUser?.displayName]);

  const loadBilling = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchBillingStatus();
      setTiers(res.tiers || []);
      setBilling(res.billing);
      setUsage(res.usage || null);
      setLedger(res.ledger || []);
      setPendingInvoices(res.pendingInvoices || []);
      setFounderEligible(Boolean(res.founderEligible));
      setSupporterBoard(res.supporterBoard || []);
      if (res.supporterBoardSummary) {
        setBoardSummary(res.supporterBoardSummary);
      }
      if (res.billing?.enabledChains?.length) {
        setSelectedChain((prev) =>
          res.billing.enabledChains.includes(prev) ? prev : res.billing.enabledChains[0]
        );
      }
      if (res.billing?.enabledTokens?.length) {
        setSelectedToken((prev) =>
          res.billing.enabledTokens.includes(prev) ? prev : res.billing.enabledTokens[0]
        );
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to load plans, donations & billing status.');
    } finally {
      setLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  const sortedTiers = useMemo(
    () => [...tiers].sort((a, b) => (a.rank || 0) - (b.rank || 0)),
    [tiers]
  );

  const openPendingInvoices = useMemo(
    () => pendingInvoices.filter((inv) => inv.status === 'pending'),
    [pendingInvoices]
  );

  const allowedCryptoChains = useMemo(() => {
    const globalChains = billing?.enabledChains || ['base', 'ethereum', 'polygon', 'arbitrum'];
    if (cryptoMode === 'donation' || !cryptoTier?.pricing?.acceptedCryptoChains?.length) return globalChains;
    const intersected = globalChains.filter((c) => cryptoTier.pricing.acceptedCryptoChains.includes(c));
    return intersected.length > 0 ? intersected : globalChains;
  }, [billing?.enabledChains, cryptoTier, cryptoMode]);

  const allowedCryptoTokens = useMemo(() => {
    const globalTokens = billing?.enabledTokens || ['USDC', 'ETH'];
    if (cryptoMode === 'donation' || !cryptoTier?.pricing?.acceptedCryptoTokens?.length) return globalTokens;
    const intersected = globalTokens.filter((t) => cryptoTier.pricing.acceptedCryptoTokens.includes(t));
    return intersected.length > 0 ? intersected : globalTokens;
  }, [billing?.enabledTokens, cryptoTier, cryptoMode]);

  const filteredWallEntries = useMemo(() => {
    if (wallFilter === 'all') return supporterBoard;
    if (wallFilter === 'donation' || wallFilter === 'founder-tier') {
      return supporterBoard.filter((e) => e.entryKind === wallFilter);
    }
    return supporterBoard.filter((e) => e.feedbackCategory === wallFilter);
  }, [supporterBoard, wallFilter]);

  if (!isOpen) return null;

  const copyText = (kind: 'addr' | 'uri', value: string) => {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopiedKey(kind);
    window.setTimeout(() => setCopiedKey(null), 1800);
  };

  const resolveCycleForTier = (tier: UserTierDefinition): 'monthly' | 'one-time' => {
    if (tier.pricing.billingMode === 'one-time') return 'one-time';
    if (tier.pricing.billingMode === 'monthly') return 'monthly';
    return billingCycle;
  };

  const handleStripeCheckout = async (tier: UserTierDefinition) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setBusyAction(`stripe:${tier.id}`);
    try {
      const cycleToUse = resolveCycleForTier(tier);
      const res = await createStripeCheckout({
        tierId: tier.id,
        billingCycle: cycleToUse
      });
      if (res.url) {
        window.location.href = res.url;
      } else {
        throw new Error('Stripe did not return a checkout URL.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not start Stripe Checkout.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleOpenCryptoFlowForTier = (tier: UserTierDefinition) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setCryptoMode('tier');
    setCryptoTier(tier);
    setActiveInvoice(null);
    setTxHashInput('');
    const globalChains = billing?.enabledChains || ['base'];
    const tierChains = tier.pricing.acceptedCryptoChains?.length
      ? globalChains.filter((c) => tier.pricing.acceptedCryptoChains.includes(c))
      : globalChains;
    const globalTokens = billing?.enabledTokens || ['USDC'];
    const tierTokens = tier.pricing.acceptedCryptoTokens?.length
      ? globalTokens.filter((t) => tier.pricing.acceptedCryptoTokens.includes(t))
      : globalTokens;
    setSelectedChain((tierChains[0] || globalChains[0] || 'base') as SupportedBillingChain);
    setSelectedToken((tierTokens[0] || globalTokens[0] || 'USDC') as SupportedBillingCryptoToken);
  };

  const parsedDonateAmount = (() => {
    const n = Number.parseFloat(donateUsdInput);
    if (!Number.isFinite(n)) return 0;
    return Math.round(n * 100) / 100;
  })();

  const handleDonationStripeCheckout = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (parsedDonateAmount < 2 || parsedDonateAmount > 25000) {
      setErrorMsg('Please enter a donation amount between $2.00 and $25,000.00 USD.');
      return;
    }
    setBusyAction('donate-stripe');
    try {
      const res = await createDonationStripeCheckout({
        amountUsd: parsedDonateAmount,
        isAnonymous: donateAnonymous,
        authorName: donateAnonymous ? undefined : donateAuthorName.trim() || undefined,
        feedbackCategory: donateCategory,
        message: donateMessage.trim()
      });
      if (res.url) {
        window.location.href = res.url;
      } else {
        throw new Error('Stripe did not return a checkout URL.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not start Stripe donation checkout.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleOpenCryptoFlowForDonation = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (parsedDonateAmount < 2 || parsedDonateAmount > 25000) {
      setErrorMsg('Please enter a donation amount between $2.00 and $25,000.00 USD.');
      return;
    }
    const defaultChain = billing?.enabledChains?.[0] || 'base';
    const defaultToken = billing?.enabledTokens?.[0] || 'USDC';
    setCryptoMode('donation');
    setCryptoTier(null);
    setSelectedChain(defaultChain);
    setSelectedToken(defaultToken);
    setActiveInvoice(null);
    setTxHashInput('');
    setBusyAction('generate-invoice');
    try {
      const res = await createDonationCryptoInvoice({
        amountUsd: parsedDonateAmount,
        chain: defaultChain,
        token: defaultToken,
        isAnonymous: donateAnonymous,
        authorName: donateAnonymous ? undefined : donateAuthorName.trim() || undefined,
        feedbackCategory: donateCategory,
        message: donateMessage.trim()
      });
      setActiveInvoice(res.invoice);
      setPendingInvoices((prev) => [res.invoice, ...prev]);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to generate on-chain donation invoice.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleResumeInvoice = (inv: CryptoPaymentInvoice) => {
    if (inv.invoiceKind === 'donation') {
      setCryptoMode('donation');
      setCryptoTier(null);
      setActiveTab('donate');
    } else {
      const matchedTier = sortedTiers.find((t) => t.id === inv.tierId) || null;
      setCryptoMode('tier');
      setCryptoTier(matchedTier);
      setActiveTab('tiers');
    }
    setSelectedChain(inv.chain);
    setSelectedToken(inv.token);
    setActiveInvoice(inv);
    setTxHashInput('');
    setErrorMsg(null);
  };

  const handleCancelInvoice = async (invoiceId: string) => {
    setBusyAction(`cancel:${invoiceId}`);
    setErrorMsg(null);
    try {
      await cancelCryptoInvoice(invoiceId);
      if (activeInvoice?.id === invoiceId) {
        setActiveInvoice(null);
      }
      await loadBilling();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to cancel invoice.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleGenerateCryptoInvoice = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setBusyAction('generate-invoice');
    try {
      if (cryptoMode === 'donation') {
        if (parsedDonateAmount < 2 || parsedDonateAmount > 25000) {
          throw new Error('Donation amount must be between $2.00 and $25,000.00 USD.');
        }
        const res = await createDonationCryptoInvoice({
          amountUsd: parsedDonateAmount,
          chain: selectedChain,
          token: selectedToken,
          isAnonymous: donateAnonymous,
          authorName: donateAnonymous ? undefined : donateAuthorName.trim() || undefined,
          feedbackCategory: donateCategory,
          message: donateMessage.trim()
        });
        setActiveInvoice(res.invoice);
        setPendingInvoices((prev) => [res.invoice, ...prev]);
      } else if (cryptoTier) {
        const cycleToUse = resolveCycleForTier(cryptoTier);
        const res = await createCryptoInvoice({
          tierId: cryptoTier.id,
          billingCycle: cycleToUse,
          chain: selectedChain,
          token: selectedToken
        });
        setActiveInvoice(res.invoice);
        setPendingInvoices((prev) => [res.invoice, ...prev]);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to generate on-chain crypto invoice.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleSendViaInjectedWallet = async () => {
    if (!activeInvoice) return;
    const eth = (window as any).ethereum;
    if (!eth || typeof eth.request !== 'function') {
      setErrorMsg('No browser Web3 wallet detected (MetaMask / Rabby). Send the exact amount manually and paste your transaction hash below.');
      return;
    }
    setErrorMsg(null);
    setBusyAction('wallet-send');
    try {
      const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[];
      const from = accounts?.[0];
      if (!from) throw new Error('No wallet account authorized.');

      const targetHexChain = CHAIN_LABELS[activeInvoice.chain]?.hexId;
      if (targetHexChain) {
        try {
          await eth.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: targetHexChain }]
          });
        } catch {
          // User may already be on network or can switch manually
        }
      }

      let txHash: string;
      if (activeInvoice.token === 'ETH') {
        const weiHex = `0x${BigInt(activeInvoice.expectedAmountUnits).toString(16)}`;
        txHash = await eth.request({
          method: 'eth_sendTransaction',
          params: [
            {
              from,
              to: activeInvoice.treasuryAddress,
              value: weiHex
            }
          ]
        });
      } else {
        if (!activeInvoice.tokenContractAddress) {
          throw new Error('Missing USDC token contract address for this network.');
        }
        const data = encodeErc20TransferData(
          activeInvoice.treasuryAddress,
          activeInvoice.expectedAmountUnits
        );
        txHash = await eth.request({
          method: 'eth_sendTransaction',
          params: [
            {
              from,
              to: activeInvoice.tokenContractAddress,
              data
            }
          ]
        });
      }

      if (txHash) {
        setTxHashInput(txHash);
        setSuccessMsg('Transaction broadcast! Wait a few seconds for block confirmation, then click Verify On-Chain.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Wallet transaction request was cancelled or failed.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleVerifyCryptoTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInvoice || !txHashInput.trim()) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setBusyAction('verify-crypto');
    try {
      const res = await verifyCryptoPayment({
        invoiceId: activeInvoice.id,
        txHash: txHashInput.trim()
      });
      setActiveInvoice(res.invoice);
      if (res.entryType === 'donation') {
        setSuccessMsg(
          `Verified on-chain donation on ${res.invoice.chainLabel}! Permanent UTC receipt recorded at ${
            res.supporterEntry?.createdAt || new Date().toISOString()
          } on the Supporter Wall.`
        );
        setDonateMessage('');
        setCryptoMode(null);
        setActiveInvoice(null);
        setActiveTab('wall');
      } else {
        setSuccessMsg(
          `Verified on-chain settlement on ${res.invoice.chainLabel}${
            res.invoice.confirmations ? ` (${res.invoice.confirmations} block conf)` : ''
          }! Thank you for investing in the project — your account is now upgraded to ${res.invoice.tierName}.`
        );
      }
      await loadBilling();
      onUpgraded?.();
    } catch (err: any) {
      setErrorMsg(err?.message || 'On-chain transaction could not be verified yet.');
    } finally {
      setBusyAction(null);
    }
  };

  const handlePostFounderNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    if (founderMessage.trim().length < 2) {
      setErrorMsg('Please enter at least 2 characters for your Founder Wall message or critique.');
      return;
    }
    setBusyAction('founder-post');
    try {
      const res = await postFounderSupporterNote({
        isAnonymous: founderAnonymous,
        authorName: founderAnonymous ? undefined : founderAuthorName.trim() || undefined,
        feedbackCategory: founderCategory,
        message: founderMessage.trim()
      });
      setFounderMessage('');
      setSuccessMsg(
        `Founder Wall entry published with permanent UTC timestamp ${new Date(res.entry.createdAt).toUTCString()}.`
      );
      await loadBilling();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to publish Founder Wall entry.');
    } finally {
      setBusyAction(null);
    }
  };

  const quotaPct =
    usage && usage.dailyLimit > 0 ? Math.min(100, Math.round((usage.usedToday / usage.dailyLimit) * 100)) : 0;

  const renderCryptoDrawer = () => {
    if (!cryptoMode) return null;
    const isDonation = cryptoMode === 'donation';
    return (
      <div className="rounded-xl bg-zinc-900 border border-amber-500/40 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-800">
          <div>
            <h3 className="text-sm font-bold text-white">
              {isDonation
                ? `On-Chain Project Donation · $${parsedDonateAmount.toFixed(2)} USD`
                : `On-Chain Project Investment · ${cryptoTier?.name || 'Tier'}`}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Real JSON-RPC transaction &amp; ERC-20 transfer log verification before unlocking access or publishing proof.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setCryptoMode(null);
              setCryptoTier(null);
              setActiveInvoice(null);
            }}
            className="text-xs text-zinc-400 hover:text-white cursor-pointer"
          >
            Close Crypto Checkout
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Network</label>
              <select
                value={selectedChain}
                onChange={(e) => {
                  setSelectedChain(e.target.value as SupportedBillingChain);
                  setActiveInvoice(null);
                }}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
              >
                {allowedCryptoChains.map((ch) => (
                  <option key={ch} value={ch}>
                    {CHAIN_LABELS[ch]?.name || ch}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Asset</label>
              <div className="flex items-center gap-2">
                {allowedCryptoTokens.map((tok) => (
                  <button
                    key={tok}
                    type="button"
                    onClick={() => {
                      setSelectedToken(tok);
                      setActiveInvoice(null);
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border cursor-pointer ${
                      selectedToken === tok
                        ? 'bg-zinc-100 text-zinc-950 border-zinc-100'
                        : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {tok}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateCryptoInvoice}
              disabled={busyAction === 'generate-invoice'}
              className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {busyAction === 'generate-invoice'
                ? 'Generating Exact Quote...'
                : activeInvoice
                ? 'Refresh Invoice Quote'
                : 'Generate Payment Invoice'}
            </button>
          </div>

          <div className="space-y-3">
            {!activeInvoice ? (
              <div className="h-full rounded-lg bg-zinc-950 border border-zinc-800 p-4 flex items-center justify-center text-center text-xs text-zinc-400">
                Select your network and token, then generate a payment invoice to lock in your exact USDC or ETH amount.
              </div>
            ) : (
              <form onSubmit={handleVerifyCryptoTx} className="space-y-3">
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Send Exact Amount</span>
                    <span className="font-mono tabular-nums font-bold text-emerald-300">
                      {activeInvoice.expectedAmountDisplay}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Network &amp; Settlement</span>
                    <span className="font-mono text-zinc-200">
                      {activeInvoice.chainLabel} · {activeInvoice.invoiceKind === 'donation' ? 'Direct Donation' : activeInvoice.billingCycle}
                    </span>
                  </div>
                  {activeInvoice.invoiceKind === 'donation' && (
                    <div className="text-[11px] text-zinc-400 flex items-center justify-between gap-2">
                      <span>Wall Attribution</span>
                      <span className="font-mono text-zinc-200 truncate">
                        {activeInvoice.donationIsAnonymous
                          ? 'Anonymous Backer'
                          : activeInvoice.donationAuthorName || 'Public Backer'}
                      </span>
                    </div>
                  )}
                  {activeInvoice.tokenContractAddress && (
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 gap-2">
                      <span>Token Contract</span>
                      <span className="font-mono text-zinc-300 truncate max-w-[210px]">
                        {activeInvoice.tokenContractAddress}
                      </span>
                    </div>
                  )}
                  {activeInvoice.ethSpotPriceUsd && (
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span>Live ETH Reference</span>
                      <span className="font-mono tabular-nums text-zinc-200">
                        ${activeInvoice.ethSpotPriceUsd.toLocaleString()} USD
                      </span>
                    </div>
                  )}
                  <div className="pt-1 border-t border-zinc-800 space-y-1">
                    <div className="text-[11px] text-zinc-400">Treasury Address</div>
                    <div className="flex items-center justify-between gap-2">
                      <code className="font-mono text-[11px] text-amber-300 break-all">
                        {activeInvoice.treasuryAddress}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyText('addr', activeInvoice.treasuryAddress)}
                        className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[11px] text-zinc-200 shrink-0 flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedKey === 'addr' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    {activeInvoice.eip681Uri && (
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="text-[10px] text-zinc-500 font-mono truncate">
                          EIP-681 Deep Link Ready
                        </span>
                        <button
                          type="button"
                          onClick={() => copyText('uri', activeInvoice.eip681Uri!)}
                          className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-300 shrink-0 flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-2.5 h-2.5" />
                          <span>{copiedKey === 'uri' ? 'Copied URI' : 'Copy Pay URI'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {(window as any).ethereum && (
                  <button
                    type="button"
                    onClick={handleSendViaInjectedWallet}
                    disabled={busyAction === 'wallet-send'}
                    className="w-full py-2 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-100 cursor-pointer"
                  >
                    {busyAction === 'wallet-send'
                      ? 'Waiting for Wallet Signature...'
                      : 'Send Directly with Connected Web3 Wallet'}
                  </button>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs text-zinc-400">
                    Paste Confirmed Transaction Hash (0x...)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      value={txHashInput}
                      onChange={(e) => setTxHashInput(e.target.value)}
                      placeholder="0x..."
                      className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-xs text-white"
                    />
                    <button
                      type="submit"
                      disabled={busyAction === 'verify-crypto' || !txHashInput.trim()}
                      className="py-2 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold whitespace-nowrap cursor-pointer disabled:opacity-50"
                    >
                      {busyAction === 'verify-crypto' ? 'Verifying...' : 'Verify On-Chain'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-6xl w-full max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden text-zinc-100">
        {/* Top Bar */}
        <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-900/70 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400 shrink-0" />
              <h2 className="text-base font-bold text-white truncate">
                Invest in the Project, Direct Donations &amp; Supporter Wall
              </h2>
            </div>
            <div className="text-xs text-zinc-400 mt-0.5 flex flex-wrap items-center gap-2">
              <span>
                Current Plan: <strong className="text-zinc-100">{currentUser?.tierName || 'Explorer Free'}</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-[11px] uppercase">
                {currentUser?.subscriptionStatus || 'free'}
              </span>
              {currentUser?.tierExpiresAt && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums text-[11px]">
                    Renews {new Date(currentUser.tierExpiresAt).toLocaleDateString()}
                  </span>
                </>
              )}
              {usage && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums text-[11px] text-cyan-300">
                    AI Requests Today: {usage.usedToday}
                    {usage.dailyLimit > 0 ? ` / ${usage.dailyLimit}` : ' / ∞'}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Primary Section Navigation */}
            <div className="flex items-center p-1 rounded-lg bg-zinc-900 border border-zinc-800">
              <button
                type="button"
                onClick={() => setActiveTab('tiers')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                  activeTab === 'tiers'
                    ? 'bg-zinc-100 text-zinc-950'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                Invest in Project
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('donate')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                  activeTab === 'donate'
                    ? 'bg-zinc-100 text-zinc-950'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                Direct Donation
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('wall')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer transition-colors tabular-nums ${
                  activeTab === 'wall'
                    ? 'bg-zinc-100 text-zinc-950'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                Founder &amp; Supporter Wall ({boardSummary.totalEntries})
              </button>
            </div>

            {activeTab === 'tiers' && (
              <div className="flex items-center p-1 rounded-lg bg-zinc-900 border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    billingCycle === 'monthly'
                      ? 'bg-amber-400 text-zinc-950'
                      : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('one-time')}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    billingCycle === 'one-time'
                      ? 'bg-amber-400 text-zinc-950'
                      : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  Lifetime
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
              aria-label="Close plans modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-6">
          {/* Daily Quota Bar */}
          {usage && usage.dailyLimit > 0 && (
            <div className="px-4 py-3 rounded-xl bg-zinc-900/70 border border-zinc-800 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-zinc-200">
                  Daily AI Orchestrator Quota ({currentUser?.tierName || 'Current Tier'})
                </div>
                <div className="text-[11px] text-zinc-400 font-mono tabular-nums">
                  Used {usage.usedToday} of {usage.dailyLimit} requests ({quotaPct}%) · Resets UTC {usage.dayKey}
                </div>
              </div>
              <div className="w-full sm:w-56 h-2 rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    quotaPct >= 90 ? 'bg-rose-500' : quotaPct >= 70 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${quotaPct}%` }}
                />
              </div>
            </div>
          )}

          {highlightModule && (
            <div className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/35 text-xs text-amber-100 flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                The capability or module <strong className="font-mono">{highlightModule}</strong> requires an upgraded backing tier. Choose a tier below to invest in the project and unlock it immediately upon settlement.
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/35 text-xs text-rose-200 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
              <button type="button" onClick={() => setErrorMsg(null)} className="text-rose-300 hover:text-white cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {successMsg && (
            <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/35 text-xs text-emerald-200 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
              <button type="button" onClick={() => setSuccessMsg(null)} className="text-emerald-300 hover:text-white cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {loading ? (
            <div className="py-16 flex items-center justify-center gap-2 text-xs text-zinc-400">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              <span>Loading tiers, permissions &amp; payment gateways...</span>
            </div>
          ) : (
            <>
              {/* =================================================================== */}
              {/* TAB 1: INVEST IN PROJECT (TIERS)                                    */}
              {/* =================================================================== */}
              {activeTab === 'tiers' && (
                <>
                  {/* Project Continuation Investment Charter */}
                  <div className="rounded-xl bg-zinc-900/75 border border-zinc-800 px-4 py-3.5 flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1 max-w-3xl">
                      <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span>Invest in Independent Continuation &amp; Long-Term Project Success</span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Every paid membership and contribution directly funds open research, offline model engineering, hardware independence, and server infrastructure. Founder Tier backers also receive a permanent, UTC-timestamped seat on the Founder &amp; Supporter Wall.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setActiveTab('donate')}
                        className="px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-200 cursor-pointer whitespace-nowrap"
                      >
                        Or Leave a Direct Donation
                      </button>
                    </div>
                  </div>

                  {/* Tier Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {sortedTiers.map((tier) => {
                      const isCurrent = currentUser?.tierId === tier.id;
                      const isFounder = Boolean(tier.isFounderTier || tier.rank >= 3);
                      const cycleForTier = resolveCycleForTier(tier);
                      const showOneTime = cycleForTier === 'one-time';
                      const displayCents = showOneTime
                        ? tier.pricing.oneTimeUsdCents || tier.pricing.monthlyUsdCents
                        : tier.pricing.monthlyUsdCents || tier.pricing.oneTimeUsdCents;
                      const priceLabel = !tier.isMonetized
                        ? '$0'
                        : displayCents > 0
                        ? formatUsd(displayCents)
                        : `$${tier.pricing.cryptoUsdAmount}`;
                      const cadenceLabel = !tier.isMonetized
                        ? 'free forever'
                        : showOneTime
                        ? 'one-time lifetime'
                        : '/ month';

                      const moduleCountLabel = tier.privileges.allModules
                        ? 'All user modules'
                        : `${tier.privileges.allowedModules.length} modules`;
                      const dailyLimitLabel =
                        !tier.privileges.maxDailyAiRequests || tier.privileges.maxDailyAiRequests === 0
                          ? 'Unlimited daily AI requests'
                          : `${tier.privileges.maxDailyAiRequests} daily AI requests`;

                      return (
                        <div
                          key={tier.id}
                          className={`rounded-xl border p-5 flex flex-col justify-between gap-5 ${
                            isCurrent
                              ? 'bg-zinc-900 border-amber-400/60'
                              : isFounder
                              ? 'bg-zinc-900/80 border-amber-500/35'
                              : 'bg-zinc-900/60 border-zinc-800'
                          }`}
                        >
                          <div className="space-y-3">
                            <div className="space-y-1">
                              {isFounder && (
                                <div className="text-[11px] font-mono text-amber-300">
                                  Founder Tier · Permanent Wall Seat Included
                                </div>
                              )}
                              <div className="flex items-center justify-between gap-2">
                                <h3 className="text-base font-bold text-white">{tier.name}</h3>
                                {isCurrent && (
                                  <span className="text-[11px] font-mono text-emerald-300">Active Plan</span>
                                )}
                              </div>
                              <p className="text-xs text-zinc-400 leading-relaxed">
                                {tier.tagline || tier.description}
                              </p>
                            </div>

                            <div className="pt-1 pb-2 border-b border-zinc-800/80 flex items-baseline justify-between gap-2">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-bold font-mono tabular-nums text-white">
                                  {priceLabel}
                                </span>
                                <span className="text-xs text-zinc-400">{cadenceLabel}</span>
                              </div>
                              {tier.isMonetized && tier.pricing.billingMode !== 'both' && (
                                <span className="text-[10px] font-mono uppercase text-zinc-500">
                                  {tier.pricing.billingMode} only
                                </span>
                              )}
                            </div>

                            <div className="text-[11px] text-zinc-400 font-mono tabular-nums flex flex-wrap items-center gap-1.5">
                              <span>{moduleCountLabel}</span>
                              <span aria-hidden="true">·</span>
                              <span>{dailyLimitLabel}</span>
                            </div>

                            <ul className="space-y-2 text-xs text-zinc-300">
                              {(tier.features?.length
                                ? tier.features
                                : [
                                    tier.privileges.canRunAutonomousWorkflow
                                      ? 'Autonomous Multi-Step Workflows'
                                      : 'Interactive Orchestrator Chat',
                                    tier.privileges.canAccessSecretsAndWallets
                                      ? 'Personal Encrypted Wallet Vault'
                                      : 'Isolated Personal Workspace',
                                    tier.privileges.canUseBurnerMail
                                      ? 'Real Burner Mail Vault'
                                      : 'Standard Web & Search Tools',
                                    tier.privileges.canUseInfiniteSim
                                      ? 'Personal Infinite SIM Access'
                                      : 'Bring Your Own API Keys'
                                  ]
                              ).map((feat, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                  <span>{feat}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                            {!tier.isMonetized ? (
                              <div className="w-full py-2 px-4 rounded-lg bg-zinc-950 border border-zinc-800 text-center text-xs font-medium text-zinc-400">
                                {isCurrent ? 'Your Current Free Tier' : 'Included by Default'}
                              </div>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  disabled={busyAction === `stripe:${tier.id}` || !billing?.fiatStripeEnabled}
                                  onClick={() => handleStripeCheckout(tier)}
                                  className="w-full py-2 px-4 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                                  title={
                                    billing?.fiatStripeEnabled
                                      ? 'Invest in project via Stripe Checkout'
                                      : 'Stripe secret key not configured by administrator yet'
                                  }
                                >
                                  {busyAction === `stripe:${tier.id}` ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <CreditCard className="w-3.5 h-3.5" />
                                  )}
                                  <span>
                                    {billing?.fiatStripeEnabled
                                      ? isFounder
                                        ? 'Back Founder Tier (Card)'
                                        : 'Back with Card (Stripe)'
                                      : 'Card Checkout Unavailable'}
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  disabled={!billing?.cryptoEnabled}
                                  onClick={() => handleOpenCryptoFlowForTier(tier)}
                                  className="w-full py-2 px-4 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                                  title={
                                    billing?.cryptoEnabled
                                      ? 'Back on-chain with USDC or ETH'
                                      : 'Treasury EVM address not configured by administrator yet'
                                  }
                                >
                                  <Wallet className="w-3.5 h-3.5 text-amber-400" />
                                  <span>
                                    {billing?.cryptoEnabled
                                      ? 'Back with Crypto (USDC / ETH)'
                                      : 'Crypto Checkout Unavailable'}
                                  </span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {cryptoMode === 'tier' && renderCryptoDrawer()}
                </>
              )}

              {/* =================================================================== */}
              {/* TAB 2: DIRECT DONATION (ANONYMOUS OR ATTRIBUTED + PERMANENT PROOF)  */}
              {/* =================================================================== */}
              {activeTab === 'donate' && (
                <div className="space-y-5">
                  <div className="rounded-xl bg-zinc-900/80 border border-zinc-800 p-5 space-y-4">
                    <div className="border-b border-zinc-800 pb-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <HeartHandshake className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-sm font-bold text-white">
                          Direct Project Donation &amp; Permanent Timestamped Receipt
                        </h3>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Contribute directly to project continuation — completely anonymously or publicly credited — with an optional permanent, UTC-timestamped note on the Founder &amp; Supporter Wall. Honest critiques, bug callouts, and tough feedback are welcome alongside support messages.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                      <div className="lg:col-span-6 space-y-4">
                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-zinc-300">
                            Contribution Amount (USD · $2 – $25,000)
                          </label>
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            {DONATION_PRESETS_USD.map((amt) => {
                              const selected = parsedDonateAmount === amt;
                              return (
                                <button
                                  key={amt}
                                  type="button"
                                  onClick={() => setDonateUsdInput(String(amt))}
                                  className={`py-2 px-2 rounded-lg text-xs font-mono tabular-nums font-semibold border cursor-pointer transition-colors ${
                                    selected
                                      ? 'bg-zinc-100 text-zinc-950 border-zinc-100'
                                      : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                                  }`}
                                >
                                  ${amt}
                                </button>
                              );
                            })}
                          </div>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-400">
                              $
                            </span>
                            <input
                              type="number"
                              min={2}
                              max={25000}
                              step="1"
                              value={donateUsdInput}
                              onChange={(e) => setDonateUsdInput(e.target.value)}
                              className="w-full pl-7 pr-14 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono tabular-nums text-white"
                              placeholder="25"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono text-zinc-500">
                              USD
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-zinc-300">
                            Wall Identity &amp; Privacy Mode
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setDonateAnonymous(false)}
                              className={`py-2 px-3 rounded-lg text-xs font-medium border cursor-pointer text-left ${
                                !donateAnonymous
                                  ? 'bg-zinc-100 text-zinc-950 border-zinc-100'
                                  : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                              }`}
                            >
                              Publicly Attributed
                            </button>
                            <button
                              type="button"
                              onClick={() => setDonateAnonymous(true)}
                              className={`py-2 px-3 rounded-lg text-xs font-medium border cursor-pointer text-left ${
                                donateAnonymous
                                  ? 'bg-zinc-100 text-zinc-950 border-zinc-100'
                                  : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                              }`}
                            >
                              Anonymous Backer
                            </button>
                          </div>

                          {!donateAnonymous ? (
                            <input
                              type="text"
                              maxLength={48}
                              value={donateAuthorName}
                              onChange={(e) => setDonateAuthorName(e.target.value)}
                              placeholder="Public display name or handle on the Wall"
                              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                            />
                          ) : (
                            <p className="text-[11px] text-zinc-400 leading-relaxed">
                              Listed strictly as <strong className="text-zinc-200">Anonymous Backer</strong> on the Wall with an opaque card receipt hash. (Note: on-chain crypto settlements link to a public blockchain explorer tx hash.)
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="lg:col-span-6 space-y-4">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-medium text-zinc-300">
                            Feedback Tag (Displayed on the Wall)
                          </label>
                          <select
                            value={donateCategory}
                            onChange={(e) => setDonateCategory(e.target.value as SupporterFeedbackSentiment)}
                            className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                          >
                            {FEEDBACK_CATEGORIES.map((cat) => (
                              <option key={cat.value} value={cat.value}>
                                {cat.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <label className="font-medium text-zinc-300">
                              Optional Message or Honest Critique (Saved with Permanent UTC Timestamp)
                            </label>
                            <span className="font-mono text-[11px] tabular-nums text-zinc-500">
                              {donateMessage.length}/450
                            </span>
                          </div>
                          <textarea
                            rows={4}
                            maxLength={450}
                            value={donateMessage}
                            onChange={(e) => setDonateMessage(e.target.value)}
                            placeholder="Tell us what works, what feels broken, or leave permanent proof you helped fund this build..."
                            className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white resize-y"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                          <button
                            type="button"
                            disabled={busyAction === 'donate-stripe' || !billing?.fiatStripeEnabled}
                            onClick={handleDonationStripeCheckout}
                            className="py-2.5 px-4 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            {busyAction === 'donate-stripe' ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CreditCard className="w-3.5 h-3.5" />
                            )}
                            <span>
                              {billing?.fiatStripeEnabled
                                ? `Donate $${parsedDonateAmount.toFixed(2)} (Card)`
                                : 'Card Donations Unavailable'}
                            </span>
                          </button>

                          <button
                            type="button"
                            disabled={busyAction === 'generate-invoice' || !billing?.cryptoEnabled}
                            onClick={handleOpenCryptoFlowForDonation}
                            className="py-2.5 px-4 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            <Wallet className="w-3.5 h-3.5 text-amber-400" />
                            <span>
                              {billing?.cryptoEnabled
                                ? `Donate $${parsedDonateAmount.toFixed(2)} (USDC / ETH)`
                                : 'Crypto Donations Unavailable'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {cryptoMode === 'donation' && renderCryptoDrawer()}
                </div>
              )}

              {/* =================================================================== */}
              {/* TAB 3: FOUNDER & SUPPORTER WALL (PROOF + UNFILTERED FEEDBACK)       */}
              {/* =================================================================== */}
              {activeTab === 'wall' && (
                <div className="space-y-5">
                  {/* Metrics Strip (Zero Pills, Clean Tabular Nums) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl bg-zinc-900/70 border border-zinc-800 p-3.5">
                      <div className="text-[11px] text-zinc-400">Direct Donations</div>
                      <div className="text-xl font-bold font-mono tabular-nums text-emerald-300 mt-0.5">
                        ${boardSummary.totalDonationsUsd.toFixed(2)}
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono tabular-nums mt-0.5">
                        {boardSummary.donationCount} verified donations
                      </div>
                    </div>
                    <div className="rounded-xl bg-zinc-900/70 border border-zinc-800 p-3.5">
                      <div className="text-[11px] text-zinc-400">Permanent Wall Entries</div>
                      <div className="text-xl font-bold font-mono tabular-nums text-white mt-0.5">
                        {boardSummary.totalEntries}
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono tabular-nums mt-0.5">
                        {boardSummary.founderCount} founder tier seats
                      </div>
                    </div>
                    <div className="rounded-xl bg-zinc-900/70 border border-zinc-800 p-3.5">
                      <div className="text-[11px] text-zinc-400">Honest Critiques &amp; Issues</div>
                      <div className="text-xl font-bold font-mono tabular-nums text-rose-300 mt-0.5">
                        {boardSummary.critiqueCount}
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">Unfiltered improvement signals</div>
                    </div>
                    <div className="rounded-xl bg-zinc-900/70 border border-zinc-800 p-3.5">
                      <div className="text-[11px] text-zinc-400">Suggestions &amp; Praise</div>
                      <div className="text-xl font-bold font-mono tabular-nums text-cyan-300 mt-0.5">
                        {boardSummary.suggestionCount + boardSummary.praiseCount}
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono tabular-nums mt-0.5">
                        {boardSummary.suggestionCount} ideas · {boardSummary.praiseCount} support notes
                      </div>
                    </div>
                  </div>

                  {/* Founder Tier Composer */}
                  {founderEligible ? (
                    <form
                      onSubmit={handlePostFounderNote}
                      className="rounded-xl bg-zinc-900/80 border border-amber-500/35 p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                            <MessageSquarePlus className="w-3.5 h-3.5" />
                            <span>Founder Tier Wall Composer</span>
                          </h3>
                          <p className="text-[11px] text-zinc-400 mt-0.5">
                            Post your permanent proof of backing and blunt feedback. Re-submitting updates your message while keeping your original UTC backing timestamp intact.
                          </p>
                        </div>
                        <span className="text-[11px] font-mono text-zinc-400">
                          {founderMessage.length}/500
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] text-zinc-400 mb-1">Visibility</label>
                          <select
                            value={founderAnonymous ? 'anon' : 'public'}
                            onChange={(e) => setFounderAnonymous(e.target.value === 'anon')}
                            className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                          >
                            <option value="public">Public Attribution</option>
                            <option value="anon">Anonymous Backer</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] text-zinc-400 mb-1">Display Name</label>
                          <input
                            type="text"
                            maxLength={48}
                            disabled={founderAnonymous}
                            value={founderAnonymous ? 'Anonymous Backer' : founderAuthorName}
                            onChange={(e) => setFounderAuthorName(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white disabled:opacity-50"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-zinc-400 mb-1">Feedback Category</label>
                          <select
                            value={founderCategory}
                            onChange={(e) => setFounderCategory(e.target.value as SupporterFeedbackSentiment)}
                            className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                          >
                            {FEEDBACK_CATEGORIES.map((cat) => (
                              <option key={cat.value} value={cat.value}>
                                {cat.shortLabel}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <textarea
                        rows={3}
                        maxLength={500}
                        required
                        value={founderMessage}
                        onChange={(e) => setFounderMessage(e.target.value)}
                        placeholder="Leave your permanent timestamped mark — positive support, feature priorities, or straight critique..."
                        className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white resize-y"
                      />

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={busyAction === 'founder-post' || founderMessage.trim().length < 2}
                          className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold cursor-pointer disabled:opacity-50"
                        >
                          {busyAction === 'founder-post' ? 'Publishing...' : 'Publish to Permanent Wall'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
                      <span>
                        Posting to this Wall is reserved for <strong className="text-zinc-200">Founder Tier</strong> members and <strong className="text-zinc-200">verified Donators</strong> so every entry carries cryptographic proof of backing.
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setActiveTab('donate')}
                          className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold cursor-pointer"
                        >
                          Donate &amp; Post
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('tiers')}
                          className="px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-medium cursor-pointer"
                        >
                          View Founder Tier
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Filter Strip */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Verified Supporter Ledger &amp; Community Feedback ({filteredWallEntries.length})
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      {[
                        { id: 'all', label: 'All' },
                        { id: 'critique', label: 'Critiques' },
                        { id: 'suggestion', label: 'Suggestions' },
                        { id: 'praise', label: 'Praise' },
                        { id: 'donation', label: 'Donations' },
                        { id: 'founder-tier', label: 'Founder Tiers' }
                      ].map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setWallFilter(f.id as any)}
                          className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                            wallFilter === f.id
                              ? 'bg-zinc-100 text-zinc-950 font-semibold'
                              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-100'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Entries List */}
                  {filteredWallEntries.length === 0 ? (
                    <div className="p-8 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center text-xs text-zinc-400">
                      No matching entries yet. Be the first verified backer to leave a permanently timestamped mark or critique.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredWallEntries.map((entry) => {
                        const catMeta =
                          FEEDBACK_CATEGORIES.find((c) => c.value === entry.feedbackCategory) ||
                          FEEDBACK_CATEGORIES[3];
                        const explorerHref = safeHttpsUrl(entry.explorerUrl);
                        return (
                          <div
                            key={entry.id}
                            className="rounded-xl bg-zinc-900/70 border border-zinc-800 p-4 space-y-2.5"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                              <div className="flex flex-wrap items-center gap-2 min-w-0">
                                <span className="font-bold text-white truncate">
                                  {entry.isAnonymous ? 'Anonymous Backer' : entry.authorDisplayName}
                                </span>
                                <span aria-hidden="true" className="text-zinc-600">·</span>
                                <span className="font-mono text-[11px] text-amber-300 tabular-nums">
                                  {entry.entryKind === 'donation'
                                    ? `Donation $${entry.amountUsd.toFixed(2)}`
                                    : entry.tierName || 'Founder Tier'}
                                </span>
                                <span aria-hidden="true" className="text-zinc-600">·</span>
                                <span className={`font-medium ${catMeta.textClass}`}>
                                  {catMeta.shortLabel}
                                </span>
                                {entry.isOwnEntry && (
                                  <>
                                    <span aria-hidden="true" className="text-zinc-600">·</span>
                                    <span className="font-mono text-[11px] text-zinc-400">Your entry</span>
                                  </>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-zinc-400 tabular-nums">
                                <span>
                                  {entry.paymentMethod === 'stripe-card'
                                    ? 'Verified Card'
                                    : entry.paymentMethod === 'crypto-onchain'
                                    ? `Verified ${entry.nativeAmount || entry.currency} (${entry.chain || 'EVM'})`
                                    : 'Verified Tier Member'}
                                </span>
                                {explorerHref ? (
                                  <a
                                    href={explorerHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sky-400 hover:underline inline-flex items-center gap-1"
                                  >
                                    <span>Tx Proof</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                ) : entry.referenceId ? (
                                  <span className="text-zinc-500">Proof #{entry.referenceId}</span>
                                ) : null}
                              </div>
                            </div>

                            {entry.message ? (
                              <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap break-words">
                                {entry.message}
                              </p>
                            ) : (
                              <p className="text-xs text-zinc-500 italic">
                                Verified backing contribution with no written message.
                              </p>
                            )}

                            <div className="pt-1 border-t border-zinc-800/70 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-zinc-500 tabular-nums">
                              <span>
                                Permanent UTC Proof: {new Date(entry.createdAt).toUTCString()}
                              </span>
                              <span>
                                Local: {new Date(entry.createdAt).toLocaleString()}
                                {entry.updatedAt ? ` · Note updated ${new Date(entry.updatedAt).toLocaleDateString()}` : ''}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Resumable Pending Crypto Invoices */}
              {openPendingInvoices.length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-zinc-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Open Crypto Payment Invoices ({openPendingInvoices.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {openPendingInvoices.map((inv) => (
                      <div
                        key={inv.id}
                        className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-zinc-100 truncate">
                            {inv.invoiceKind === 'donation' ? 'Direct Donation' : inv.tierName} ·{' '}
                            {inv.expectedAmountDisplay} ({inv.chainLabel})
                          </div>
                          <div className="text-[11px] font-mono text-zinc-400">
                            Expires {new Date(inv.expiresAt).toLocaleTimeString()} · {inv.billingCycle}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleResumeInvoice(inv)}
                            className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-[11px] font-semibold cursor-pointer"
                          >
                            Resume
                          </button>
                          <button
                            type="button"
                            disabled={busyAction === `cancel:${inv.id}`}
                            onClick={() => handleCancelInvoice(inv.id)}
                            className="p-1.5 rounded-lg bg-zinc-950 hover:bg-rose-950 border border-zinc-800 text-zinc-400 hover:text-rose-200 cursor-pointer"
                            title="Cancel open invoice"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Tier Permission Matrix (shown on Tiers tab) */}
              {activeTab === 'tiers' && sortedTiers.length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-zinc-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Permission &amp; Quota Details Across Tiers
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-zinc-800">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-zinc-900/80 border-b border-zinc-800 text-[11px] text-zinc-400">
                          <th className="py-2.5 px-3 font-medium">Capability / Quota</th>
                          {sortedTiers.map((t) => (
                            <th key={t.id} className="py-2.5 px-3 font-semibold text-zinc-200 text-center">
                              {t.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/70">
                        <tr className="bg-zinc-950/60">
                          <td className="py-2 px-3 font-medium text-zinc-200">Unlocked Modules</td>
                          {sortedTiers.map((t) => (
                            <td key={t.id} className="py-2 px-3 text-center font-mono tabular-nums text-zinc-300">
                              {t.privileges.allModules ? 'All' : t.privileges.allowedModules.length}
                            </td>
                          ))}
                        </tr>
                        <tr className="bg-zinc-950/60">
                          <td className="py-2 px-3 font-medium text-zinc-200">Daily AI Orchestration Cap</td>
                          {sortedTiers.map((t) => (
                            <td key={t.id} className="py-2 px-3 text-center font-mono tabular-nums text-cyan-300">
                              {!t.privileges.maxDailyAiRequests || t.privileges.maxDailyAiRequests === 0
                                ? 'Unlimited'
                                : `${t.privileges.maxDailyAiRequests}/day`}
                            </td>
                          ))}
                        </tr>
                        <tr className="bg-zinc-950/60">
                          <td className="py-2 px-3 font-medium text-zinc-200">Founder &amp; Supporter Wall Seat</td>
                          {sortedTiers.map((t) => (
                            <td key={t.id} className="py-2 px-3 text-center">
                              {t.isFounderTier || t.rank >= 3 ? (
                                <Check className="w-4 h-4 text-amber-400 mx-auto" />
                              ) : (
                                <span className="text-zinc-600">—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                        {PERMISSION_MATRIX_ROWS.map((row) => (
                          <tr key={row.key} className="hover:bg-zinc-900/40">
                            <td className="py-2 px-3">
                              <div className="font-medium text-zinc-200">{row.label}</div>
                              <div className="text-[10px] text-zinc-500">{row.desc}</div>
                            </td>
                            {sortedTiers.map((t) => {
                              const allowed = Boolean(t.privileges[row.key]);
                              return (
                                <td key={t.id} className="py-2 px-3 text-center">
                                  {allowed ? (
                                    <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                                  ) : (
                                    <span className="text-zinc-600">—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Payment History Ledger */}
              <div className="space-y-2.5 pt-2 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Your Payment, Investment &amp; Donation History</span>
                  </h3>
                  <span className="text-[11px] font-mono tabular-nums text-zinc-500">
                    {ledger.length} records · {openPendingInvoices.length} open invoices
                  </span>
                </div>

                {ledger.length === 0 ? (
                  <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-xs text-zinc-400">
                    No settled upgrades or donations recorded on your account yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-zinc-800">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-zinc-900/80 border-b border-zinc-800 text-[11px] text-zinc-400">
                          <th className="py-2.5 px-3 font-medium">UTC Date</th>
                          <th className="py-2.5 px-3 font-medium">Contribution</th>
                          <th className="py-2.5 px-3 font-medium">Method</th>
                          <th className="py-2.5 px-3 font-medium text-right">Amount</th>
                          <th className="py-2.5 px-3 font-medium">Status</th>
                          <th className="py-2.5 px-3 font-medium">Reference</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/80">
                        {ledger.map((rec) => {
                          const explorerHref = safeHttpsUrl(rec.explorerUrl);
                          return (
                            <tr key={rec.id} className="hover:bg-zinc-900/40">
                              <td className="py-2 px-3 font-mono tabular-nums text-zinc-400 whitespace-nowrap">
                                {new Date(rec.createdAt).toLocaleString()}
                              </td>
                              <td className="py-2 px-3 font-semibold text-zinc-100">
                                {rec.entryType === 'donation' ? 'Direct Donation' : rec.tierName}
                              </td>
                              <td className="py-2 px-3 text-zinc-300">
                                {rec.method === 'stripe-card'
                                  ? 'Card (Stripe)'
                                  : rec.method === 'crypto-onchain'
                                  ? `Crypto · ${rec.chain || 'EVM'}`
                                  : 'Admin Assignment'}
                              </td>
                              <td className="py-2 px-3 font-mono tabular-nums text-right text-emerald-300">
                                {rec.nativeAmount
                                  ? `${rec.nativeAmount} ($${rec.amountUsd.toFixed(2)})`
                                  : `$${rec.amountUsd.toFixed(2)}`}
                              </td>
                              <td className="py-2 px-3 font-mono text-[11px] uppercase text-zinc-300">
                                {rec.status}
                              </td>
                              <td className="py-2 px-3 font-mono text-[11px] text-zinc-400">
                                {explorerHref ? (
                                  <a
                                    href={explorerHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sky-400 hover:underline inline-flex items-center gap-1"
                                  >
                                    <span>{rec.referenceId.slice(0, 14)}...</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                ) : (
                                  <span className="truncate max-w-[160px] inline-block align-bottom">
                                    {rec.referenceId}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
