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

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Activity,
  RefreshCw,
  Globe,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Compass,
  AlertTriangle,
  ExternalLink,
  Layers,
  Cpu,
  ArrowRight,
  Search,
  Zap,
  Target,
  Sliders,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  LineChart,
  Clock,
  DollarSign,
  Eye,
  BellOff
} from 'lucide-react';
import type { ModuleType } from '../types';
import {
  loadOSCustomizationProfile,
  saveOSCustomizationProfile,
  type SovereignOSCustomizationProfile
} from '../utils/osCustomizationStore';

export interface MacroTelemetryModuleProps {
  onSelectModule?: (mod: ModuleType) => void;
  onInjectIntoChat?: (prompt: string) => void;
}

interface TelemetryHubStatus {
  id: string;
  name: string;
  category: 'markets' | 'fx' | 'crypto' | 'fiscal' | 'geopolitics' | 'geophysical';
  endpoint: string;
  status: 'LIVE' | 'DEGRADED' | 'OFFLINE';
  latencyMs: number;
  lastUpdated: number;
  detail: string;
}

interface MarketQuote {
  symbol: string;
  name: string;
  assetClass: 'equity' | 'volatility' | 'rates' | 'currency' | 'commodity' | 'crypto';
  price: number;
  prevClose: number;
  changePct: number;
  annualizedVolPct: number;
  zScore: number;
  unit: string;
  source: string;
  timestamp: number;
  historyCloses: number[];
  intraday5mCloses?: number[];
  microCloses2s?: number[];
}

interface GeopoliticalHeadline {
  id: string;
  source: string;
  title: string;
  link: string;
  publishedAt: string;
  category: 'conflict' | 'sanctions_trade' | 'central_bank' | 'energy_shipping' | 'cyber_infra' | 'macro';
  severity: number;
  impactedRegions: string[];
  predictedPrimaryAsset?: string;
  predictedImpulsePct?: number;
  conformal99BandPct?: number;
}

interface SeismicAlert {
  id: string;
  place: string;
  magnitude: number;
  time: number;
  tsunami: boolean;
  coords: [number, number, number];
}

interface StressTestScenarioResult {
  id: string;
  name: string;
  triggerDescription: string;
  primaryShock: string;
  estimatedPortfolioImpactPct: number;
  projectedEquitiesPct: number;
  projectedRatesBps: number;
  projectedGoldPct: number;
  projectedOilPct: number;
  projectedCryptoPct: number;
  probabilityHorizon: string;
}

interface QuantitativeRiskMatrix {
  observationWindowDays: number;
  annualizedPortfolioVolPct: number;
  var95OneDayPct: number;
  var99OneDayPct: number;
  cvar99ExpectedShortfallPct: number;
  sharpeProxy: number;
  correlationAssets: string[];
  correlationMatrix: number[][];
  factorExposures: Array<{
    factor: string;
    proxySymbol: string;
    currentLevel: string;
    dailySigmaMove: number;
    systemicWeightPct: number;
  }>;
  stressScenarios: StressTestScenarioResult[];
}

interface KernelWeightBreakdown {
  laplace14_2s: number;
  epanechnikov14: number;
  gaussianRbf: number;
  studentT3: number;
}

interface FiveMinutePredictionWindow {
  symbol: string;
  name: string;
  assetClass: MarketQuote['assetClass'];
  unit: string;
  spotPrice: number;
  predicted5mPrice: number;
  predicted5mMovePct: number;
  predicted5mMoveBps: number;
  conformal99Lower5mPrice: number;
  conformal99Upper5mPrice: number;
  conformal99HalfBand5mPct: number;
  conformal99CoveragePct: number;
  trailing5mCloses: number[];
  forward5mTrajectory: number[];
  forward5mUpper99: number[];
  forward5mLower99: number[];
  actionSignal: 'STRONG_BUY' | 'BUY_ACCUMULATE' | 'HOLD_NEUTRAL' | 'TAKE_PROFIT_SELL' | 'URGENT_STOP_LOSS_SELL';
  alertCategory: 'PROFIT_OPPORTUNITY' | 'LOSS_PREVENTION' | 'MOMENTUM_BREAKOUT' | 'GEOPOLITICAL_SHOCK' | 'EQUILIBRIUM';
  urgencyScore: number;
  leadTimeSeconds: number;
  estimatedPnlPer10kUsd: number;
  rationale: string;
}

export interface AutonomousMarketAlert {
  id: string;
  timestamp: number;
  expiresAt: number;
  symbol: string;
  name: string;
  assetClass: MarketQuote['assetClass'];
  unit: string;
  actionSignal: FiveMinutePredictionWindow['actionSignal'];
  alertCategory: FiveMinutePredictionWindow['alertCategory'];
  severity: 'CRITICAL' | 'HIGH' | 'ELEVATED';
  urgencyScore: number;
  leadTimeWindow: string;
  spotPrice: number;
  target5mPrice: number;
  predicted5mMovePct: number;
  conformal99Band5mPct: number;
  conformal99CoveragePct: number;
  estimatedPnlPer10kUsd: number;
  headlineTrigger: string;
  recommendation: string;
}

interface AssetMultiKernelForecast {
  symbol: string;
  name: string;
  assetClass: MarketQuote['assetClass'];
  unit: string;
  spotPrice: number;
  windowLength: number;
  laplaceScaleS: number;
  laplaceBandwidth2s: number;
  laplace14ForecastPrice: number;
  multiKernelForecastPrice: number;
  predictedMovePct: number;
  geopoliticalAdjustedForecastPrice: number;
  geopoliticalAdjustedMovePct: number;
  conformal99LowerPrice: number;
  conformal99UpperPrice: number;
  conformal99HalfBandPct: number;
  conformal99CoveragePct: number;
  loocvRmsePct: number;
  loocvMaePct: number;
  directionalHitRatePct: number;
  rSquared: number;
  kernelWeights: KernelWeightBreakdown;
  micro2sVelocityBps: number;
  micro2sSampleCount: number;
  signalRegime: 'STRONG_LONG' | 'LONG_BIAS' | 'NEUTRAL_CONFORMAL' | 'SHORT_BIAS' | 'STRONG_SHORT';
  fiveMinPrediction: FiveMinutePredictionWindow;
}

interface GeopoliticalShockTensor {
  conflictKinetic: number;
  energyChokepoint: number;
  sanctionsTariff: number;
  monetarySovereign: number;
  cyberSemiconductor: number;
  seismicInfrastructure: number;
  compositeIntensity: number;
  dominantChannel: string;
  activeTriggers: string[];
}

interface GeopoliticalAssetImpulse {
  symbol: string;
  name: string;
  spotPrice: number;
  unit: string;
  fiveMinForecastPct: number;
  micro2sTo15mPct: number;
  session24hPct: number;
  tail7dPct: number;
  projected5mPrice: number;
  projected24hPrice: number;
  conformal99Lower24hPrice: number;
  conformal99Upper24hPrice: number;
  conformal99BandPct: number;
  certaintyPct: number;
  actionSignal: FiveMinutePredictionWindow['actionSignal'];
  transmissionMechanism: string;
}

interface MultiKernelTelemetrySummary {
  algorithmSpec: string;
  windowCloses: number;
  bandwidthSpec: string;
  conformalAlpha: number;
  targetCertaintyPct: number;
  meanEmpiricalCoverage99Pct: number;
  meanDirectionalHitRatePct: number;
  meanLoocvRmsePct: number;
  samplingCadenceMs: number;
  microBufferDepth: number;
  assetForecasts: AssetMultiKernelForecast[];
  fiveMinPredictions: FiveMinutePredictionWindow[];
  autonomousAlerts: AutonomousMarketAlert[];
  geopoliticalShockTensor: GeopoliticalShockTensor;
  geopoliticalImpulses: GeopoliticalAssetImpulse[];
}

interface MacroTelemetrySnapshot {
  success: boolean;
  timestamp: number;
  samplingMode?: 'full_90d_and_2s' | 'fast_2s_micro';
  hubs: TelemetryHubStatus[];
  quotes: MarketQuote[];
  headlines: GeopoliticalHeadline[];
  seismicAlerts: SeismicAlert[];
  fearGreed: { value: number; classification: string; previousValue?: number; timestamp: number } | null;
  usTreasuryDebt: { recordDate: string; totalDebtUsd: number; publicDebtUsd: number } | null;
  riskMatrix: QuantitativeRiskMatrix;
  multiKernelTelemetry?: MultiKernelTelemetrySummary;
  geopoliticalRiskIndex: number;
  liquidityStressIndex: number;
  marketSwayPrediction: string;
  directionalSway: string;
}

interface CausalPredictionReport {
  generatedAt: number;
  scenario: string;
  marketRegime: string;
  directionalSway: string;
  confidencePct: number;
  conformalCertaintyPct?: number;
  geopoliticalFrictionIndex: number;
  liquidityStressIndex: number;
  executiveSummary: string;
  causalChains: Array<{
    trigger: string;
    transmissionChannel: string;
    affectedMarkets: string[];
    predictedDirection: string;
    timeframe: string;
    confidencePct: number;
  }>;
  geopoliticalImpulses?: GeopoliticalAssetImpulse[];
  shockTensor?: GeopoliticalShockTensor;
  modelUsed: string;
  groundedInLiveHubs: number;
}

type ViewTab = 'all' | 'graph' | 'alerts' | 'mkr' | 'risk' | 'markets' | 'wires';
type GraphNormMode = 'pct' | 'zscore' | 'index100';
type GraphWindowMode = '5m_cone' | '14_laplace' | '90d_macro';

const ASSET_COLOR_PALETTE: Record<string, string> = {
  '^GSPC': '#10b981',    // Emerald
  '^IXIC': '#06b6d4',    // Cyan
  '^DJI': '#3b82f6',     // Blue
  'NVDA': '#84cc16',     // Lime
  'AAPL': '#38bdf8',     // Sky
  '^VIX': '#f43f5e',     // Rose
  '^TNX': '#f59e0b',     // Amber
  'DX-Y.NYB': '#a855f7', // Purple
  'CL=F': '#f97316',     // Orange
  'GC=F': '#eab308',     // Yellow Gold
  'SI=F': '#cbd5e1',     // Silver Slate
  'BTC-USD': '#fb923c',  // Bitcoin Orange
  'ETH-USD': '#818cf8',  // Indigo
  'SOL-USD': '#2dd4bf',  // Teal
  'XRP-USD': '#60a5fa',  // Light Blue
  'DOGE-USD': '#facc15', // Yellow
  'USD/EUR': '#c084fc',  // Violet
  'USD/JPY': '#fb7185',  // Pink
  'USD/CNY': '#f87171',  // Red
  'USD/GBP': '#34d399'   // Mint
};

function getAssetColor(symbol: string, idx = 0): string {
  if (ASSET_COLOR_PALETTE[symbol]) return ASSET_COLOR_PALETTE[symbol];
  const fallback = ['#10b981', '#06b6d4', '#f59e0b', '#f43f5e', '#a855f7', '#3b82f6', '#84cc16', '#fb923c'];
  return fallback[idx % fallback.length];
}

const PRESET_SCENARIOS = [
  'Strait of Hormuz kinetic naval blockade & +4.5σ crude supply shock',
  'Sovereign 10Y Treasury auction tail +50bps duration squeeze',
  'East Asia semiconductor export embargo & Taiwan Strait escalation',
  'Emergency Federal Reserve / ECB coordinated liquidity facility intervention',
  'Live Baseline: Real-time geopolitical wire tensor & Laplace-14 (2s) 5-minute regime'
];

function playAlertAudioChime(isBuy: boolean) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (isBuy) {
      // Ascending institutional profit-opportunity chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880.0, now + 0.11); // A5
    } else {
      // Urgent dual-tone loss-prevention warning chime
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(392.0, now + 0.12); // G4
    }
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.start(now);
    osc.stop(now + 0.29);
    setTimeout(() => {
      if (ctx.state !== 'closed') {
        try {
          const res = ctx.close();
          if (res && typeof res.catch === 'function') {
            res.catch(() => {});
          }
        } catch (_) {}
      }
    }, 350);
  } catch (_) {}
}

function MiniSparkline({ values, positive }: { values: number[]; positive: boolean }) {
  const safe = Array.isArray(values) ? values.filter((n) => typeof n === 'number' && Number.isFinite(n)) : [];
  if (safe.length < 2) {
    return <span className="text-[11px] font-mono text-zinc-600">—</span>;
  }
  const tail = safe.slice(-14);
  const min = Math.min(...tail);
  const max = Math.max(...tail);
  const span = max - min || 1;
  const w = 78;
  const h = 22;
  const points = tail
    .map((v, i) => {
      const x = (i / (tail.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible shrink-0" aria-hidden="true">
      <polyline
        fill="none"
        stroke={positive ? '#10b981' : '#f43f5e'}
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}

function formatPriceValue(price: number, unit: string, assetClass?: string): string {
  const p = Number(price);
  if (!Number.isFinite(p)) return '—';
  if (assetClass === 'currency') return p.toFixed(4);
  if (unit === '%') return `${p.toFixed(2)}%`;
  if (unit === 'USD' || unit.startsWith('USD')) {
    const dec = p < 2 ? 4 : p < 100 ? 2 : 2;
    return `$${p.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;
  }
  return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatQuotePrice(q: MarketQuote): string {
  return formatPriceValue(q.price, q.unit, q.assetClass);
}

function actionBadgeStyle(action: FiveMinutePredictionWindow['actionSignal']): {
  label: string;
  cls: string;
} {
  switch (action) {
    case 'STRONG_BUY':
      return {
        label: 'STRONG BUY · 5m PROFIT SURGE',
        cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
      };
    case 'BUY_ACCUMULATE':
      return {
        label: 'BUY / ACCUMULATE (5m)',
        cls: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
      };
    case 'URGENT_STOP_LOSS_SELL':
      return {
        label: 'URGENT SELL · LOSS PREVENTION',
        cls: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
      };
    case 'TAKE_PROFIT_SELL':
      return {
        label: 'TAKE PROFIT / TRIM (5m)',
        cls: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
      };
    default:
      return {
        label: 'HOLD · CONFORMAL EQUILIBRIUM',
        cls: 'bg-zinc-800 text-zinc-400 border-zinc-700'
      };
  }
}

function correlationCellStyle(val: number, isDiag: boolean): string {
  if (isDiag) return 'bg-zinc-800 text-zinc-200 font-semibold';
  if (val >= 0.5) return 'bg-emerald-500/20 text-emerald-300';
  if (val >= 0.2) return 'bg-emerald-500/10 text-emerald-400';
  if (val <= -0.5) return 'bg-rose-500/20 text-rose-300';
  if (val <= -0.2) return 'bg-rose-500/10 text-rose-400';
  return 'bg-zinc-900/60 text-zinc-400';
}

export const MacroTelemetryModule: React.FC<MacroTelemetryModuleProps> = ({ onInjectIntoChat }) => {
  const [snapshot, setSnapshot] = useState<MacroTelemetrySnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // High-frequency 2-second live stream mode
  const [live2sStreamArmed, setLive2sStreamArmed] = useState<boolean>(true);
  const [tickCount2s, setTickCount2s] = useState<number>(0);

  // Autonomous Notification Controls (OFF by default unless explicitly enabled by user)
  const [autonomousAlertsEnabled, setAutonomousAlertsEnabled] = useState<boolean>(
    () => loadOSCustomizationProfile().notifications.telemetryPopupAlerts
  );
  const [audioChimeEnabled, setAudioChimeEnabled] = useState<boolean>(
    () => loadOSCustomizationProfile().notifications.telemetryAudioChime
  );
  const [alertFilter, setAlertFilter] = useState<'ALL' | 'BUY_PROFIT' | 'SELL_PROTECT'>('ALL');
  const [notifiedPositionSize, setNotifiedPositionSize] = useState<number>(10000);
  const lastChimedAlertIdRef = useRef<string>('');

  useEffect(() => {
    const onCustom = (e: Event) => {
      const profile = (e as CustomEvent<SovereignOSCustomizationProfile>).detail || loadOSCustomizationProfile();
      setAutonomousAlertsEnabled(Boolean(profile.notifications?.telemetryPopupAlerts));
      setAudioChimeEnabled(Boolean(profile.notifications?.telemetryAudioChime));
    };
    window.addEventListener('sovereign_os_customization_changed', onCustom);
    return () => window.removeEventListener('sovereign_os_customization_changed', onCustom);
  }, []);

  const togglePopupAlerts = () => {
    const nextVal = !autonomousAlertsEnabled;
    setAutonomousAlertsEnabled(nextVal);
    saveOSCustomizationProfile({
      notifications: {
        ...loadOSCustomizationProfile().notifications,
        telemetryPopupAlerts: nextVal
      }
    });
  };

  const toggleAudioChime = () => {
    const nextVal = !audioChimeEnabled;
    setAudioChimeEnabled(nextVal);
    saveOSCustomizationProfile({
      notifications: {
        ...loadOSCustomizationProfile().notifications,
        telemetryAudioChime: nextVal
      }
    });
  };

  // Multi-Market Overlapped Graph State
  const [graphNormMode, setGraphNormMode] = useState<GraphNormMode>('pct');
  const [graphWindowMode, setGraphWindowMode] = useState<GraphWindowMode>('5m_cone');
  const [visibleSymbols, setVisibleSymbols] = useState<string[]>([]);
  const [focusedConeSymbol, setFocusedConeSymbol] = useState<string>('BTC-USD');
  const [hoverStepIdx, setHoverStepIdx] = useState<number | null>(null);

  const [activeTab, setActiveTab] = useState<ViewTab>('all');
  const [assetFilter, setAssetFilter] = useState<string>('all');
  const [wireCategory, setWireCategory] = useState<string>('all');
  const [wireSearch, setWireSearch] = useState<string>('');

  const [scenarioInput, setScenarioInput] = useState<string>(
    'Live Baseline: Real-time geopolitical wire tensor & Laplace-14 (2s) 5-minute regime'
  );
  const [predicting, setPredicting] = useState<boolean>(false);
  const [causalReport, setCausalReport] = useState<CausalPredictionReport | null>(null);
  const [predictError, setPredictError] = useState<string | null>(null);

  const fetchTelemetry = useCallback(async (force = false, fast2s = false) => {
    if (force) setRefreshing(true);
    try {
      const url = force
        ? '/api/macro/live-telemetry?refresh=1'
        : fast2s
        ? '/api/macro/live-telemetry?mode=fast2s'
        : '/api/macro/live-telemetry';
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Telemetry endpoint returned HTTP ${res.status}`);
      const data: MacroTelemetrySnapshot = await res.json();
      if (!data || !data.success) {
        throw new Error('Malformed telemetry payload');
      }
      setSnapshot(data);
      if (fast2s) {
        setTickCount2s((c) => c + 1);
      }
      setErrorMsg(null);
    } catch (err: any) {
      if (!fast2s) {
        setErrorMsg(err?.message || 'Unable to reach live macro telemetry backend');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTelemetry(false, false);
    const fullTimer = setInterval(() => fetchTelemetry(false, false), 28000);
    return () => clearInterval(fullTimer);
  }, [fetchTelemetry]);

  useEffect(() => {
    if (!live2sStreamArmed) return;
    const microTimer = setInterval(() => {
      fetchTelemetry(false, true);
    }, 2000);
    return () => clearInterval(microTimer);
  }, [live2sStreamArmed, fetchTelemetry]);

  const hubs = useMemo(() => (Array.isArray(snapshot?.hubs) ? snapshot.hubs : []), [snapshot]);
  const quotes = useMemo(() => (Array.isArray(snapshot?.quotes) ? snapshot.quotes : []), [snapshot]);
  const headlines = useMemo(() => (Array.isArray(snapshot?.headlines) ? snapshot.headlines : []), [snapshot]);
  const seismicAlerts = useMemo(() => (Array.isArray(snapshot?.seismicAlerts) ? snapshot.seismicAlerts : []), [snapshot]);
  const riskMatrix = snapshot?.riskMatrix;
  const mkr = snapshot?.multiKernelTelemetry;

  // Initialize visible overlapped graph symbols once quotes arrive (all markets + crypto enabled by default)
  useEffect(() => {
    if (quotes.length > 0 && visibleSymbols.length === 0) {
      setVisibleSymbols(quotes.map((q) => q.symbol));
      if (quotes.some((q) => q.symbol === 'BTC-USD')) {
        setFocusedConeSymbol('BTC-USD');
      } else {
        setFocusedConeSymbol(quotes[0].symbol);
      }
    }
  }, [quotes, visibleSymbols.length]);

  const autonomousAlerts = useMemo(
    () => (Array.isArray(mkr?.autonomousAlerts) ? mkr!.autonomousAlerts : []),
    [mkr]
  );

  // Trigger audio chime when a new CRITICAL autonomous alert arrives
  useEffect(() => {
    if (!autonomousAlertsEnabled || !audioChimeEnabled || autonomousAlerts.length === 0) return;
    const topAlert = autonomousAlerts[0];
    if (topAlert && topAlert.severity === 'CRITICAL' && topAlert.id !== lastChimedAlertIdRef.current) {
      lastChimedAlertIdRef.current = topAlert.id;
      const isBuy = topAlert.actionSignal === 'STRONG_BUY' || topAlert.actionSignal === 'BUY_ACCUMULATE';
      playAlertAudioChime(isBuy);
    }
  }, [autonomousAlerts, autonomousAlertsEnabled, audioChimeEnabled]);

  const filteredAlerts = useMemo(() => {
    return autonomousAlerts.filter((a) => {
      if (alertFilter === 'BUY_PROFIT') {
        return a.actionSignal === 'STRONG_BUY' || a.actionSignal === 'BUY_ACCUMULATE';
      }
      if (alertFilter === 'SELL_PROTECT') {
        return a.actionSignal === 'URGENT_STOP_LOSS_SELL' || a.actionSignal === 'TAKE_PROFIT_SELL';
      }
      return true;
    });
  }, [autonomousAlerts, alertFilter]);

  const handleRunCausalPredict = async (e?: React.FormEvent, customScenario?: string) => {
    if (e) e.preventDefault();
    const target = (customScenario ?? scenarioInput).trim();
    if (customScenario) setScenarioInput(customScenario);
    setPredicting(true);
    setPredictError(null);
    try {
      const res = await fetch('/api/macro/causal-predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: target })
      });
      if (!res.ok) throw new Error(`Causal engine returned HTTP ${res.status}`);
      const payload = await res.json();
      if (!payload?.success || !payload?.report) {
        throw new Error(payload?.error || 'Causal analysis failed');
      }
      setCausalReport(payload.report);
    } catch (err: any) {
      setPredictError(err?.message || 'Causal prediction failed');
    } finally {
      setPredicting(false);
    }
  };

  const liveHubsCount = hubs.filter((h) => h.status === 'LIVE' || h.status === 'DEGRADED').length;

  const filteredQuotes = useMemo(() => {
    if (assetFilter === 'all') return quotes;
    return quotes.filter((q) => q.assetClass === assetFilter);
  }, [quotes, assetFilter]);

  const filteredForecasts = useMemo(() => {
    const list = Array.isArray(mkr?.assetForecasts) ? mkr!.assetForecasts : [];
    if (assetFilter === 'all') return list;
    return list.filter((f) => f.assetClass === assetFilter);
  }, [mkr, assetFilter]);

  const activeImpulses = useMemo(() => {
    if (causalReport?.geopoliticalImpulses && causalReport.geopoliticalImpulses.length > 0) {
      return causalReport.geopoliticalImpulses;
    }
    return Array.isArray(mkr?.geopoliticalImpulses) ? mkr!.geopoliticalImpulses : [];
  }, [causalReport, mkr]);

  const activeTensor = causalReport?.shockTensor || mkr?.geopoliticalShockTensor;

  const filteredHeadlines = useMemo(() => {
    const q = wireSearch.trim().toLowerCase();
    return headlines.filter((h) => {
      if (wireCategory !== 'all' && h.category !== wireCategory) return false;
      if (q && !h.title.toLowerCase().includes(q) && !h.source.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [headlines, wireCategory, wireSearch]);

  // ============================================================================
  // OVERLAPPED MULTI-MARKET & CRYPTO GRAPH ENGINE (WITH +5M PREDICTION CONE)
  // ============================================================================
  const overlappedSeriesData = useMemo(() => {
    const forecasts = Array.isArray(mkr?.assetForecasts) ? mkr!.assetForecasts : [];
    const historyLen = graphWindowMode === '5m_cone' ? 14 : graphWindowMode === '14_laplace' ? 14 : 35;
    const forwardLen = 5; // +1m, +2m, +3m, +4m, +5m
    const totalPoints = historyLen + forwardLen;

    const labels: string[] = [];
    for (let i = 0; i < historyLen; i++) {
      const rem = historyLen - 1 - i;
      if (rem === 0) labels.push('NOW (T=0)');
      else if (graphWindowMode === '5m_cone') labels.push(`-${rem * 5}m`);
      else if (graphWindowMode === '14_laplace') labels.push(`Bar -${rem}`);
      else labels.push(`-${rem}d`);
    }
    for (let m = 1; m <= forwardLen; m++) {
      labels.push(`+${m}m Forecast`);
    }

    const seriesList = quotes
      .filter((q) => visibleSymbols.includes(q.symbol))
      .map((q, idx) => {
        const fc = forecasts.find((a) => a.symbol === q.symbol);
        const fm = fc?.fiveMinPrediction;
        const rawHistSource =
          graphWindowMode === '5m_cone'
            ? fm?.trailing5mCloses || q.intraday5mCloses || q.historyCloses
            : q.historyCloses;

        const cleanHist = Array.isArray(rawHistSource) && rawHistSource.length >= 2
          ? rawHistSource.slice(-historyLen)
          : [q.prevClose || q.price, q.price];

        // Pad front if shorter than historyLen
        const paddedHist = [...cleanHist];
        while (paddedHist.length < historyLen) {
          paddedHist.unshift(paddedHist[0] || q.price);
        }
        paddedHist[paddedHist.length - 1] = q.price;

        // Forward 5m points [t+1m .. t+5m]
        const fwdPrices = fm?.forward5mTrajectory && fm.forward5mTrajectory.length >= 6
          ? fm.forward5mTrajectory.slice(1, 6)
          : [q.price, q.price, q.price, q.price, q.price];

        const fwdUpper = fm?.forward5mUpper99 && fm.forward5mUpper99.length >= 6
          ? fm.forward5mUpper99.slice(1, 6)
          : fwdPrices;

        const fwdLower = fm?.forward5mLower99 && fm.forward5mLower99.length >= 6
          ? fm.forward5mLower99.slice(1, 6)
          : fwdPrices;

        const fullRawPrices = [...paddedHist, ...fwdPrices];
        const fullRawUpper = [...paddedHist, ...fwdUpper];
        const fullRawLower = [...paddedHist, ...fwdLower];

        const basePrice = paddedHist[0] > 0 ? paddedHist[0] : q.price || 1;
        const meanP = paddedHist.reduce((a, b) => a + b, 0) / paddedHist.length;
        const stdP = Math.sqrt(
          Math.max(1e-9, paddedHist.reduce((s, v) => s + (v - meanP) ** 2, 0) / Math.max(1, paddedHist.length - 1))
        );

        const normalizeVal = (p: number): number => {
          if (graphNormMode === 'pct') {
            return ((p - basePrice) / basePrice) * 100;
          }
          if (graphNormMode === 'zscore') {
            return Math.max(-3.8, Math.min(3.8, (p - meanP) / stdP));
          }
          return (p / basePrice) * 100;
        };

        return {
          symbol: q.symbol,
          name: q.name,
          assetClass: q.assetClass,
          unit: q.unit,
          color: getAssetColor(q.symbol, idx),
          spotPrice: q.price,
          predicted5mPrice: fm?.predicted5mPrice ?? q.price,
          predicted5mMovePct: fm?.predicted5mMovePct ?? 0,
          actionSignal: fm?.actionSignal ?? 'HOLD_NEUTRAL',
          conformal99Band5mPct: fm?.conformal99HalfBand5mPct ?? 0.35,
          rawPrices: fullRawPrices,
          normValues: fullRawPrices.map(normalizeVal),
          normUpper99: fullRawUpper.map(normalizeVal),
          normLower99: fullRawLower.map(normalizeVal)
        };
      });

    let yMin = Infinity;
    let yMax = -Infinity;
    for (const s of seriesList) {
      for (const v of s.normValues) {
        if (Number.isFinite(v)) {
          if (v < yMin) yMin = v;
          if (v > yMax) yMax = v;
        }
      }
      if (s.symbol === focusedConeSymbol) {
        for (const u of s.normUpper99.slice(historyLen - 1)) {
          if (Number.isFinite(u) && u > yMax) yMax = u;
        }
        for (const l of s.normLower99.slice(historyLen - 1)) {
          if (Number.isFinite(l) && l < yMin) yMin = l;
        }
      }
    }
    if (!Number.isFinite(yMin) || !Number.isFinite(yMax) || yMax === yMin) {
      yMin = graphNormMode === 'index100' ? 98 : -2;
      yMax = graphNormMode === 'index100' ? 102 : 2;
    } else {
      const pad = (yMax - yMin) * 0.12 || 0.5;
      yMin -= pad;
      yMax += pad;
    }

    return {
      historyLen,
      forwardLen,
      totalPoints,
      labels,
      seriesList,
      yMin,
      yMax
    };
  }, [quotes, mkr, visibleSymbols, graphNormMode, graphWindowMode, focusedConeSymbol]);

  const applyGraphPreset = (preset: 'all' | 'crypto' | 'equities' | 'commodities_rates' | 'fx' | 'signals') => {
    if (preset === 'all') {
      setVisibleSymbols(quotes.map((q) => q.symbol));
    } else if (preset === 'crypto') {
      setVisibleSymbols(quotes.filter((q) => q.assetClass === 'crypto').map((q) => q.symbol));
      setFocusedConeSymbol('BTC-USD');
    } else if (preset === 'equities') {
      setVisibleSymbols(quotes.filter((q) => q.assetClass === 'equity').map((q) => q.symbol));
      setFocusedConeSymbol('^GSPC');
    } else if (preset === 'commodities_rates') {
      setVisibleSymbols(
        quotes.filter((q) => q.assetClass === 'commodity' || q.assetClass === 'rates' || q.assetClass === 'volatility').map((q) => q.symbol)
      );
      setFocusedConeSymbol('CL=F');
    } else if (preset === 'fx') {
      setVisibleSymbols(quotes.filter((q) => q.assetClass === 'currency').map((q) => q.symbol));
      setFocusedConeSymbol('DX-Y.NYB');
    } else if (preset === 'signals') {
      const activeSyms = autonomousAlerts.map((a) => a.symbol);
      setVisibleSymbols(activeSyms.length > 0 ? activeSyms : quotes.map((q) => q.symbol));
      if (activeSyms[0]) setFocusedConeSymbol(activeSyms[0]);
    }
  };

  const toggleSymbolVisibility = (sym: string) => {
    setVisibleSymbols((prev) =>
      prev.includes(sym) ? (prev.length > 1 ? prev.filter((s) => s !== sym) : prev) : [...prev, sym]
    );
    setFocusedConeSymbol(sym);
  };

  if (loading && !snapshot) {
    return (
      <div className="h-full overflow-y-auto bg-zinc-950 text-zinc-100 p-6 space-y-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-20 rounded-xl bg-zinc-900/70 border border-zinc-800 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((idx) => (
              <div key={idx} className="h-28 rounded-xl bg-zinc-900/70 border border-zinc-800 animate-pulse" />
            ))}
          </div>
          <div className="h-80 rounded-xl bg-zinc-900/70 border border-zinc-800 animate-pulse" />
        </div>
      </div>
    );
  }

  const svgWidth = 1040;
  const svgHeight = 370;
  const padLeft = 58;
  const padRight = 24;
  const padTop = 22;
  const padBottom = 34;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const xForIdx = (i: number) =>
    padLeft + (i / Math.max(1, overlappedSeriesData.totalPoints - 1)) * plotW;
  const yForVal = (v: number) => {
    const span = overlappedSeriesData.yMax - overlappedSeriesData.yMin || 1;
    return padTop + plotH - ((v - overlappedSeriesData.yMin) / span) * plotH;
  };
  const nowIdx = overlappedSeriesData.historyLen - 1;
  const nowX = xForIdx(nowIdx);
  const zeroRefVal = graphNormMode === 'index100' ? 100 : 0;
  const zeroY = yForVal(zeroRefVal);

  const activeHoverIdx =
    hoverStepIdx !== null && hoverStepIdx >= 0 && hoverStepIdx < overlappedSeriesData.totalPoints
      ? hoverStepIdx
      : overlappedSeriesData.totalPoints - 1;

  return (
    <div className="h-full overflow-y-auto bg-zinc-950 text-zinc-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6 pb-10">
        {/* Workspace Toolbar */}
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-zinc-800">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
                Sovereign Macro &amp; Crypto Telemetry · 5-Min Predictive Laplace-14 (2s)
              </h1>
              <span className="px-2 py-0.5 text-[11px] font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded">
                {mkr?.meanEmpiricalCoverage99Pct ?? 99.7}% CONFORMAL CERTAINTY (α=0.01)
              </span>
              {autonomousAlerts.length > 0 && autonomousAlertsEnabled && (
                <span className="px-2 py-0.5 text-[11px] font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded inline-flex items-center gap-1">
                  <BellRing className="w-3 h-3 text-amber-400" />
                  <span>{autonomousAlerts.length} ACTIVE 5m SIGNALS</span>
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 font-mono tabular-nums">
              <span className={liveHubsCount >= 5 ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                {liveHubsCount}/{hubs.length || 7} Live Hubs · {quotes.length} Markets + Crypto Streaming
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-cyan-300">
                5-Min Early Warning Engine · Laplace(14 Closes, h=2s)
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Synced {snapshot?.timestamp ? new Date(snapshot.timestamp).toLocaleTimeString() : '—'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg max-w-full">
              {(
                [
                  ['all', 'All View'],
                  ['graph', 'Overlapped Graph'],
                  ['alerts', `5m Signals (${autonomousAlerts.length})`],
                  ['mkr', 'Laplace-14 (2s)'],
                  ['risk', 'Risk & VaR'],
                  ['markets', 'All Markets'],
                  ['wires', 'Geo Wires']
                ] as Array<[ViewTab, string]>
              ).map(([tabId, label]) => (
                <button
                  key={tabId}
                  type="button"
                  onClick={() => setActiveTab(tabId)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === tabId
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={togglePopupAlerts}
              className={`inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-mono transition-colors cursor-pointer whitespace-nowrap ${
                autonomousAlertsEnabled
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
              title="Off by default: explicitly enable OS popup notifications for 5-minute telemetry signals"
            >
              {autonomousAlertsEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{autonomousAlertsEnabled ? 'Popups ON' : 'Popups OFF'}</span>
            </button>

            <button
              type="button"
              onClick={toggleAudioChime}
              className={`inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-mono transition-colors cursor-pointer whitespace-nowrap ${
                audioChimeEnabled
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-200'
              }`}
              title="Off by default: toggle audio alert chime on critical 5-minute warnings"
            >
              {audioChimeEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{audioChimeEnabled ? 'Chime ON' : 'Chime OFF'}</span>
            </button>

            <button
              type="button"
              onClick={() => setLive2sStreamArmed((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-mono font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                live2sStreamArmed
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${live2sStreamArmed ? 'text-emerald-400 animate-pulse' : 'text-zinc-500'}`} />
              <span>{live2sStreamArmed ? `2s LIVE (${tickCount2s})` : '2s PAUSED'}</span>
            </button>

            <button
              type="button"
              onClick={() => fetchTelemetry(true, false)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-zinc-950 font-semibold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Syncing...' : 'Sync All'}</span>
            </button>
          </div>
        </header>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-sm text-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => fetchTelemetry(true, false)}
              className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* ========================================================================
            FULL-BLOWN OVERLAPPED MULTI-MARKET & CRYPTO GRAPH CANVAS (+5M CONE)
            ======================================================================== */}
        {(activeTab === 'all' || activeTab === 'graph') && (
          <section className="p-5 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-4">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 pb-3 border-b border-zinc-800">
              <div className="space-y-0.5">
                <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                  <LineChart className="w-4 h-4 text-emerald-400" />
                  <span>
                    Unified Overlapped Multi-Market &amp; Crypto Graph · 5-Minute Predictive Laplace-14 (2s) Cone
                  </span>
                </h2>
                <p className="text-xs text-zinc-400">
                  Watch all {quotes.length} live markets (US Equities, Tech Stocks, Crypto, Commodities, Treasury Yields, VIX, and FX) overlapped together with a live +5-minute forward prediction horizon.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Scale / Normalization Mode */}
                <div className="flex items-center gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-lg text-xs">
                  {(
                    [
                      ['pct', '% Normalized (0% Base)'],
                      ['zscore', 'Sigma Z-Score (σ)'],
                      ['index100', '100-Indexed']
                    ] as Array<[GraphNormMode, string]>
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setGraphNormMode(mode)}
                      className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                        graphNormMode === mode
                          ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Window Horizon Mode */}
                <div className="flex items-center gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-lg text-xs">
                  {(
                    [
                      ['5m_cone', '5-Min Intraday + Next 5m Forecast'],
                      ['14_laplace', '14-Bar Laplace(2s) + 5m'],
                      ['90d_macro', '90d Macro + 5m']
                    ] as Array<[GraphWindowMode, string]>
                  ).map(([wMode, label]) => (
                    <button
                      key={wMode}
                      type="button"
                      onClick={() => setGraphWindowMode(wMode)}
                      className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                        graphWindowMode === wMode
                          ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Market Group Overlay Presets */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-mono text-zinc-500 mr-1">Overlay Presets:</span>
                {[
                  ['all', `All Markets + Crypto (${quotes.length})`],
                  ['crypto', 'Crypto Only (BTC/ETH/SOL/XRP/DOGE)'],
                  ['equities', 'Equities & Tech (S&P/Nasdaq/Dow/NVDA/AAPL)'],
                  ['commodities_rates', 'Commodities, 10Y & VIX'],
                  ['fx', 'Global FX (DXY/EUR/JPY/CNY/GBP)'],
                  ['signals', `Active 5m Buy/Sell Signals (${autonomousAlerts.length})`]
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyGraphPreset(key as any)}
                    className="px-2.5 py-1 rounded-md bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition-colors cursor-pointer"
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                <span>99% Conformal Cone Focus:</span>
                <select
                  value={focusedConeSymbol}
                  onChange={(e) => setFocusedConeSymbol(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-amber-300 font-semibold focus:outline-none focus:border-amber-500"
                >
                  {quotes.map((q) => (
                    <option key={q.symbol} value={q.symbol}>
                      {q.symbol} ({q.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Interactive SVG Multi-Market Overlapped Canvas */}
            <div className="relative rounded-xl bg-zinc-950 border border-zinc-800/90 p-3 overflow-hidden">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-[340px] sm:h-[380px] select-none cursor-crosshair"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const relX = ((e.clientX - rect.left) / Math.max(1, rect.width)) * svgWidth;
                  const ratio = (relX - padLeft) / Math.max(1, plotW);
                  const idx = Math.round(ratio * (overlappedSeriesData.totalPoints - 1));
                  if (idx >= 0 && idx < overlappedSeriesData.totalPoints) {
                    setHoverStepIdx(idx);
                  }
                }}
                onMouseLeave={() => setHoverStepIdx(null)}
              >
                {/* Shaded Forward 5-Minute Prediction Zone (Right of NOW) */}
                <rect
                  x={nowX}
                  y={padTop}
                  width={Math.max(0, svgWidth - padRight - nowX)}
                  height={plotH}
                  fill="rgba(245, 158, 11, 0.055)"
                />

                {/* Horizontal Grid Lines & Y-Axis Labels */}
                {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                  const val = overlappedSeriesData.yMin + (overlappedSeriesData.yMax - overlappedSeriesData.yMin) * frac;
                  const y = yForVal(val);
                  const label =
                    graphNormMode === 'pct'
                      ? `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`
                      : graphNormMode === 'zscore'
                      ? `${val >= 0 ? '+' : ''}${val.toFixed(1)}σ`
                      : val.toFixed(1);
                  return (
                    <g key={frac}>
                      <line
                        x1={padLeft}
                        y1={y}
                        x2={svgWidth - padRight}
                        y2={y}
                        stroke="#27272a"
                        strokeDasharray="3 3"
                        strokeWidth="1"
                      />
                      <text
                        x={padLeft - 8}
                        y={y + 4}
                        textAnchor="end"
                        fill="#71717a"
                        fontSize="10"
                        fontFamily="monospace"
                      >
                        {label}
                      </text>
                    </g>
                  );
                })}

                {/* Baseline Zero / 100 Reference Line */}
                {zeroY >= padTop && zeroY <= padTop + plotH && (
                  <line
                    x1={padLeft}
                    y1={zeroY}
                    x2={svgWidth - padRight}
                    y2={zeroY}
                    stroke="#52525b"
                    strokeWidth="1.2"
                  />
                )}

                {/* Vertical NOW (T=0) Divider Line separating Live History from +5-Minute Prediction Window */}
                <line
                  x1={nowX}
                  y1={padTop}
                  x2={nowX}
                  y2={padTop + plotH}
                  stroke="#f59e0b"
                  strokeWidth="1.6"
                  strokeDasharray="4 3"
                />
                <text
                  x={nowX - 6}
                  y={padTop + 13}
                  textAnchor="end"
                  fill="#a1a1aa"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  ◀ LIVE OBSERVED
                </text>
                <text
                  x={nowX + 6}
                  y={padTop + 13}
                  textAnchor="start"
                  fill="#fbbf24"
                  fontSize="10"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  +5m LAPLACE-14 (2s) PREDICTION CONE ▶
                </text>

                {/* 99% Conformal Interval Shaded Cone for the Focused Asset */}
                {(() => {
                  const focused = overlappedSeriesData.seriesList.find((s) => s.symbol === focusedConeSymbol);
                  if (!focused) return null;
                  const upperPts: string[] = [];
                  const lowerPts: string[] = [];
                  for (let i = nowIdx; i < overlappedSeriesData.totalPoints; i++) {
                    const x = xForIdx(i).toFixed(1);
                    const yu = yForVal(focused.normUpper99[i]).toFixed(1);
                    const yl = yForVal(focused.normLower99[i]).toFixed(1);
                    upperPts.push(`${x},${yu}`);
                    lowerPts.unshift(`${x},${yl}`);
                  }
                  return (
                    <polygon
                      points={[...upperPts, ...lowerPts].join(' ')}
                      fill={focused.color}
                      fillOpacity="0.16"
                      stroke={focused.color}
                      strokeOpacity="0.4"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                  );
                })()}

                {/* Overlapped Market Curves (Solid Observed History + Dashed 5-Minute Predictive Trajectory) */}
                {overlappedSeriesData.seriesList.map((s) => {
                  const isFocused = s.symbol === focusedConeSymbol;
                  const histPoints = s.normValues
                    .slice(0, overlappedSeriesData.historyLen)
                    .map((v, i) => `${xForIdx(i).toFixed(1)},${yForVal(v).toFixed(1)}`)
                    .join(' ');

                  const predPoints = s.normValues
                    .slice(nowIdx)
                    .map((v, offset) => {
                      const i = nowIdx + offset;
                      return `${xForIdx(i).toFixed(1)},${yForVal(v).toFixed(1)}`;
                    })
                    .join(' ');

                  const endX = xForIdx(overlappedSeriesData.totalPoints - 1);
                  const endY = yForVal(s.normValues[overlappedSeriesData.totalPoints - 1]);

                  return (
                    <g key={s.symbol}>
                      {/* Observed Trail */}
                      <polyline
                        fill="none"
                        stroke={s.color}
                        strokeWidth={isFocused ? '2.8' : '1.65'}
                        strokeOpacity={isFocused ? '1' : '0.82'}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        points={histPoints}
                      />
                      {/* +5-Minute Predicted Laplace-14 (2s) Trajectory */}
                      <polyline
                        fill="none"
                        stroke={s.color}
                        strokeWidth={isFocused ? '2.8' : '1.8'}
                        strokeDasharray="5 3"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        points={predPoints}
                      />
                      {/* Terminal +5m Target Dot & Label */}
                      <circle
                        cx={endX}
                        cy={endY}
                        r={isFocused ? 4.2 : 2.8}
                        fill={s.color}
                      />
                    </g>
                  );
                })}

                {/* Interactive Hover Crosshair */}
                {hoverStepIdx !== null && (
                  <line
                    x1={xForIdx(activeHoverIdx)}
                    y1={padTop}
                    x2={xForIdx(activeHoverIdx)}
                    y2={padTop + plotH}
                    stroke="#e4e4e7"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}

                {/* X-Axis Timestamps */}
                {[0, Math.floor(nowIdx / 2), nowIdx, nowIdx + 2, overlappedSeriesData.totalPoints - 1].map((idx) => (
                  <text
                    key={idx}
                    x={xForIdx(idx)}
                    y={svgHeight - 10}
                    textAnchor="middle"
                    fill={idx > nowIdx ? '#fbbf24' : '#a1a1aa'}
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {overlappedSeriesData.labels[idx]}
                  </text>
                ))}
              </svg>
            </div>

            {/* Interactive Multi-Market Legend & Live 5-Minute Inspection Strip */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <span>
                  Inspecting Step:{' '}
                  <strong className="text-amber-300">{overlappedSeriesData.labels[activeHoverIdx]}</strong> (Click any market chip to toggle overlay; click eye icon to focus 99% Conformal Cone)
                </span>
                <span>Showing {overlappedSeriesData.seriesList.length}/{quotes.length} Markets</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2">
                {quotes.map((q, idx) => {
                  const color = getAssetColor(q.symbol, idx);
                  const isVisible = visibleSymbols.includes(q.symbol);
                  const isFocused = focusedConeSymbol === q.symbol;
                  const sData = overlappedSeriesData.seriesList.find((s) => s.symbol === q.symbol);
                  const fc = mkr?.assetForecasts.find((a) => a.symbol === q.symbol);
                  const fm = fc?.fiveMinPrediction;
                  const stepPrice = sData?.rawPrices[activeHoverIdx] ?? q.price;
                  const move5m = fm?.predicted5mMovePct ?? 0;
                  const isBuy = fm?.actionSignal === 'STRONG_BUY' || fm?.actionSignal === 'BUY_ACCUMULATE';
                  const isSell = fm?.actionSignal === 'URGENT_STOP_LOSS_SELL' || fm?.actionSignal === 'TAKE_PROFIT_SELL';

                  return (
                    <div
                      key={q.symbol}
                      className={`p-2 rounded-lg border transition-all flex items-center justify-between gap-2 ${
                        isVisible
                          ? isFocused
                            ? 'bg-zinc-900 border-amber-500/60'
                            : 'bg-zinc-950/90 border-zinc-800 hover:border-zinc-700'
                          : 'bg-zinc-950/40 border-zinc-900 opacity-45'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSymbolVisibility(q.symbol)}
                        className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono font-bold text-zinc-100 truncate">
                              {q.symbol}
                            </span>
                            {isBuy && (
                              <span className="px-1 py-0.2 text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 rounded">
                                BUY 5m
                              </span>
                            )}
                            {isSell && (
                              <span className="px-1 py-0.2 text-[9px] font-mono font-bold bg-rose-500/20 text-rose-300 rounded">
                                SELL 5m
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono tabular-nums text-zinc-400 truncate">
                            {formatPriceValue(stepPrice, q.unit, q.assetClass)}{' '}
                            <span className={move5m >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              ({move5m >= 0 ? '+' : ''}{move5m.toFixed(2)}% 5m)
                            </span>
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (!isVisible) toggleSymbolVisibility(q.symbol);
                          setFocusedConeSymbol(q.symbol);
                        }}
                        title={`Focus 99% Conformal 5m Cone on ${q.symbol}`}
                        className={`p-1 rounded transition-colors cursor-pointer ${
                          isFocused ? 'bg-amber-500/20 text-amber-300' : 'text-zinc-500 hover:text-zinc-200'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================
            AUTONOMOUS 5-MINUTE EARLY-WARNING BUY / SELL / PROFIT & LOSS ALERTS
            ======================================================================== */}
        {(activeTab === 'all' || activeTab === 'alerts') && (
          <section className="p-5 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-3 border-b border-zinc-800">
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-400" />
                    <span>
                      Autonomous 5-Minute Early-Warning Buy / Sell &amp; Profit / Loss-Prevention Feed
                    </span>
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    T-300s (5-MINUTE LEAD WINDOW)
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Autonomously monitors all {quotes.length} markets &amp; crypto every 2 seconds using Laplace-14 (h=2s) slope inflection and 99% Conformal bounds to warn you 5 minutes before major profit surges or downside drops.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Position Notional Calculator for Profit / Protected Loss */}
                <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs font-mono">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-zinc-400">Position Size:</span>
                  <select
                    value={notifiedPositionSize}
                    onChange={(e) => setNotifiedPositionSize(Number(e.target.value))}
                    className="bg-transparent text-zinc-100 font-semibold focus:outline-none"
                  >
                    <option value={1000} className="bg-zinc-900">$1,000</option>
                    <option value={10000} className="bg-zinc-900">$10,000</option>
                    <option value={50000} className="bg-zinc-900">$50,000</option>
                    <option value={100000} className="bg-zinc-900">$100,000</option>
                  </select>
                </div>

                {/* Filter Buy/Profit vs Sell/Loss-Prevention */}
                <div className="flex items-center gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-lg text-xs">
                  {[
                    ['ALL', `All Alerts (${autonomousAlerts.length})`],
                    ['BUY_PROFIT', 'Buy / Profit Surge'],
                    ['SELL_PROTECT', 'Sell / Loss Prevention']
                  ].map(([fKey, label]) => (
                    <button
                      key={fKey}
                      type="button"
                      onClick={() => setAlertFilter(fKey as any)}
                      className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                        alertFilter === fKey
                          ? 'bg-zinc-800 text-zinc-100 font-semibold'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={togglePopupAlerts}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-colors cursor-pointer ${
                    autonomousAlertsEnabled
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {autonomousAlertsEnabled ? 'POPUP ALERTS ON' : 'POPUP ALERTS OFF'}
                </button>
              </div>
            </div>

            {filteredAlerts.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-500">
                All monitored markets are currently trading inside their 5-minute conformal equilibrium band.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                {filteredAlerts.map((alert) => {
                  const badge = actionBadgeStyle(alert.actionSignal);
                  const isBuy = alert.actionSignal === 'STRONG_BUY' || alert.actionSignal === 'BUY_ACCUMULATE';
                  const scaledPnl = ((alert.estimatedPnlPer10kUsd * notifiedPositionSize) / 10000).toFixed(2);

                  return (
                    <div
                      key={`${alert.symbol}-${alert.actionSignal}`}
                      className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-colors ${
                        isBuy
                          ? 'bg-emerald-950/15 border-emerald-500/35 hover:border-emerald-500/60'
                          : 'bg-rose-950/15 border-rose-500/35 hover:border-rose-500/60'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded border ${badge.cls}`}>
                            {badge.label}
                          </span>
                          <span className="text-[11px] font-mono text-zinc-400 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>+5:00 Window</span>
                          </span>
                        </div>

                        <div className="flex items-baseline justify-between gap-2">
                          <div>
                            <div className="text-base font-bold font-mono text-zinc-100">
                              {alert.symbol}{' '}
                              <span className="text-xs font-sans font-normal text-zinc-400">{alert.name}</span>
                            </div>
                            <div className="text-xs font-mono tabular-nums text-zinc-300">
                              Spot: <strong>{formatPriceValue(alert.spotPrice, alert.unit, alert.assetClass)}</strong>{' '}
                              <ArrowRight className="w-3 h-3 inline mx-0.5 text-amber-400" /> 5m Target:{' '}
                              <strong className={isBuy ? 'text-emerald-300' : 'text-rose-300'}>
                                {formatPriceValue(alert.target5mPrice, alert.unit, alert.assetClass)}
                              </strong>
                            </div>
                          </div>

                          <div className="text-right font-mono tabular-nums">
                            <div className={`text-base font-bold ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {alert.predicted5mMovePct >= 0 ? '+' : ''}
                              {alert.predicted5mMovePct.toFixed(3)}%
                            </div>
                            <div className="text-[10px] text-zinc-400">
                              ±{alert.conformal99Band5mPct}% @ {alert.conformal99CoveragePct}%
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-zinc-300 leading-relaxed">
                          {alert.recommendation}
                        </p>
                      </div>

                      <div className="pt-2.5 border-t border-zinc-800/80 flex items-center justify-between gap-2 text-xs font-mono">
                        <div>
                          <span className="text-zinc-400">
                            {isBuy ? 'Est. Profit Wave:' : 'Loss Avoided:'}
                          </span>{' '}
                          <strong className={isBuy ? 'text-emerald-400' : 'text-amber-300'}>
                            {isBuy ? `+$${Number(scaledPnl).toLocaleString()}` : `$${Number(scaledPnl).toLocaleString()} Protected`}
                          </strong>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (!visibleSymbols.includes(alert.symbol)) {
                                toggleSymbolVisibility(alert.symbol);
                              }
                              setFocusedConeSymbol(alert.symbol);
                              setActiveTab('graph');
                            }}
                            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] cursor-pointer"
                          >
                            Focus Graph
                          </button>
                          {onInjectIntoChat && (
                            <button
                              type="button"
                              onClick={() =>
                                onInjectIntoChat(
                                  `Analyze 5-minute autonomous ${alert.actionSignal} signal on ${alert.symbol} (${alert.name}): Spot=${alert.spotPrice}, 5m Target=${alert.target5mPrice} (${alert.predicted5mMovePct >= 0 ? '+' : ''}${alert.predicted5mMovePct}% @ ${alert.conformal99CoveragePct}% conformal certainty). Provide exact entry, stop-loss, and take-profit execution levels.`
                                )
                              }
                              className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] cursor-pointer"
                            >
                              Ask OS Chat
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Hub Health Telemetry Strip */}
        <section aria-label="External Hub Connectivity" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {hubs.map((hub) => {
            const isOk = hub.status === 'LIVE';
            const isDeg = hub.status === 'DEGRADED';
            return (
              <div
                key={hub.id}
                className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 flex flex-col justify-between gap-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-zinc-200 truncate" title={hub.name}>
                    {hub.name.split('(')[0].trim()}
                  </span>
                  <span
                    className={`text-[11px] font-mono font-semibold shrink-0 ${
                      isOk ? 'text-emerald-400' : isDeg ? 'text-amber-400' : 'text-rose-400'
                    }`}
                  >
                    {hub.status}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 truncate" title={hub.detail}>
                  {hub.detail}
                </div>
                <div className="text-[11px] font-mono tabular-nums text-zinc-500 flex items-center justify-between">
                  <span>{hub.category.toUpperCase()}</span>
                  <span>{hub.latencyMs} ms</span>
                </div>
              </div>
            );
          })}
        </section>

        {/* Primary Quantitative Risk, Conformal Certainty & Directional Sway Summary */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2 md:col-span-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-medium flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                <span>Predicted Market Sway &amp; Multi-Kernel Laplace-14 (2s) Regime</span>
              </span>
              <span className="font-mono text-amber-300 font-semibold">
                {snapshot?.directionalSway || 'CONSOLIDATION'}
              </span>
            </div>
            <div className="text-sm sm:text-base font-semibold text-zinc-100 leading-snug">
              {snapshot?.marketSwayPrediction || 'Computing Multi-Kernel Laplace-14 (2s) conformal regime...'}
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-mono tabular-nums text-zinc-400">
              <span>
                Conformal Coverage:{' '}
                <strong className="text-emerald-400">{mkr?.meanEmpiricalCoverage99Pct ?? 99.7}% (α=0.01)</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Liquidity Stress: <strong className="text-zinc-100">{snapshot?.liquidityStressIndex ?? 0}/100</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Geopolitical Friction: <strong className="text-zinc-100">{snapshot?.geopoliticalRiskIndex ?? 0}/100</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Fear &amp; Greed:{' '}
                <strong className="text-zinc-100">
                  {snapshot?.fearGreed ? `${snapshot.fearGreed.value} (${snapshot.fearGreed.classification})` : 'Unavailable'}
                </strong>
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-medium flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>Hybrid Portfolio VaR &amp; CVaR (1-Day)</span>
              </span>
              <span className="font-mono text-[11px] text-zinc-500">{riskMatrix?.observationWindowDays ?? 60}d Window</span>
            </div>
            <div className="flex items-baseline gap-4 font-mono tabular-nums">
              <div>
                <div className="text-xl font-bold text-rose-400">-{riskMatrix?.var99OneDayPct ?? '—'}%</div>
                <div className="text-[11px] text-zinc-500">99% 1d VaR</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-amber-300">-{riskMatrix?.var95OneDayPct ?? '—'}%</div>
                <div className="text-[11px] text-zinc-500">95% 1d VaR</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-zinc-200">-{riskMatrix?.cvar99ExpectedShortfallPct ?? '—'}%</div>
                <div className="text-[11px] text-zinc-500">99% CVaR ES</div>
              </div>
            </div>
            <div className="text-xs font-mono tabular-nums text-zinc-400">
              Ann. Vol: <span className="text-zinc-200">{riskMatrix?.annualizedPortfolioVolPct ?? '—'}%</span> · Sharpe:{' '}
              <span className="text-zinc-200">{riskMatrix?.sharpeProxy ?? '—'}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-medium flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>US Treasury Sovereign Fiscal Anchor</span>
              </span>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-zinc-100">
              {snapshot?.usTreasuryDebt
                ? `$${(snapshot.usTreasuryDebt.totalDebtUsd / 1e12).toFixed(3)}T`
                : 'Unavailable'}
            </div>
            <div className="text-xs font-mono tabular-nums text-zinc-400">
              {snapshot?.usTreasuryDebt
                ? `Public Held: $${(snapshot.usTreasuryDebt.publicDebtUsd / 1e12).toFixed(3)}T · ${snapshot.usTreasuryDebt.recordDate}`
                : 'Fiscal Data API offline'}
            </div>
          </div>
        </section>

        {/* Geopolitical Instance -> Market Impulse Predictor & 6-Axis Shock Tensor */}
        <section className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-3 border-b border-zinc-800">
            <div>
              <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-amber-400" />
                <span>Geopolitical Instance Market Predictor · 5-Min &amp; 24h Multi-Kernel Laplace-14 (h=2s)</span>
              </h2>
              <p className="text-xs text-zinc-400">
                Couples any live breaking geopolitical headline or custom geopolitical instance into the 6-axis shock tensor, live {riskMatrix?.observationWindowDays ?? 60}d covariance matrix, and 5-minute Laplace-14 (2s) regression.
              </p>
            </div>
            {activeTensor && (
              <div className="flex items-center gap-3 text-xs font-mono tabular-nums bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-lg shrink-0">
                <span className="text-zinc-400">Dominant Channel:</span>
                <span className="text-amber-300 font-semibold">{activeTensor.dominantChannel}</span>
                <span className="text-emerald-400 font-bold">{activeTensor.compositeIntensity}/100</span>
              </div>
            )}
          </div>

          {activeTensor && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {[
                ['Kinetic Conflict', activeTensor.conflictKinetic, 'text-rose-400', 'bg-rose-500'],
                ['Energy Chokepoint', activeTensor.energyChokepoint, 'text-amber-300', 'bg-amber-500'],
                ['Sanctions / Tariff', activeTensor.sanctionsTariff, 'text-orange-300', 'bg-orange-500'],
                ['Monetary / Duration', activeTensor.monetarySovereign, 'text-cyan-300', 'bg-cyan-500'],
                ['Cyber & Chips', activeTensor.cyberSemiconductor, 'text-violet-300', 'bg-violet-500'],
                ['Seismic & Infra', activeTensor.seismicInfrastructure, 'text-emerald-300', 'bg-emerald-500']
              ].map(([label, val, textCol, barCol]) => (
                <div key={String(label)} className="p-2.5 rounded-lg bg-zinc-950/90 border border-zinc-800/90 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-zinc-400 truncate">{label}</span>
                    <span className={`font-bold tabular-nums ${textCol}`}>{val}/100</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full ${barCol}`} style={{ width: `${Math.min(100, Number(val))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={(e) => handleRunCausalPredict(e)} className="space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <input
                type="text"
                value={scenarioInput}
                onChange={(e) => setScenarioInput(e.target.value)}
                placeholder="Enter any geopolitical instance, military escalation, chokepoint blockade, tariff, or central bank shock..."
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={predicting}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-zinc-950 font-semibold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Activity className={`w-4 h-4 ${predicting ? 'animate-spin' : ''}`} />
                <span>{predicting ? 'Synthesizing 99% Conformal Forecast...' : 'Predict Market Impact (5m & 24h)'}</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-zinc-500 mr-1">Geopolitical Presets:</span>
              {PRESET_SCENARIOS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleRunCausalPredict(undefined, preset)}
                  disabled={predicting}
                  className="px-2.5 py-1 rounded-md bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition-colors cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>
          </form>

          {predictError && (
            <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/40 text-xs text-rose-300">
              {predictError}
            </div>
          )}

          {causalReport && (
            <div className="pt-3 border-t border-zinc-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-amber-300">
                    {causalReport.marketRegime} · {causalReport.directionalSway}
                  </div>
                  <p className="text-sm text-zinc-200 leading-relaxed max-w-4xl">
                    {causalReport.executiveSummary}
                  </p>
                </div>
                <div className="text-right font-mono tabular-nums text-xs text-zinc-400 shrink-0">
                  <div className="text-lg font-bold text-emerald-400">
                    {causalReport.conformalCertaintyPct ?? causalReport.confidencePct}% Conformal Certainty
                  </div>
                  <div>{causalReport.modelUsed}</div>
                  <div>{causalReport.groundedInLiveHubs} live hubs grounded</div>
                </div>
              </div>

              {Array.isArray(causalReport.causalChains) && causalReport.causalChains.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400 font-medium">
                        <th className="py-2.5 pr-4">Geopolitical / Macro Trigger</th>
                        <th className="py-2.5 pr-4">Transmission &amp; Kernel Coupling</th>
                        <th className="py-2.5 pr-4">Affected Markets</th>
                        <th className="py-2.5 pr-4">Predicted Sway (99% CI)</th>
                        <th className="py-2.5 text-right">Horizon &amp; Certainty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/80">
                      {causalReport.causalChains.map((chain, idx) => (
                        <tr key={idx} className="hover:bg-zinc-900/60">
                          <td className="py-3 pr-4 font-medium text-zinc-100 align-top max-w-xs">
                            {chain.trigger}
                          </td>
                          <td className="py-3 pr-4 text-zinc-300 align-top max-w-sm">
                            {chain.transmissionChannel}
                          </td>
                          <td className="py-3 pr-4 font-mono text-cyan-300 align-top">
                            {Array.isArray(chain.affectedMarkets) ? chain.affectedMarkets.join(', ') : '—'}
                          </td>
                          <td className="py-3 pr-4 font-medium text-amber-300 align-top">
                            <span className="inline-flex items-center gap-1">
                              <ArrowRight className="w-3 h-3 shrink-0" />
                              <span>{chain.predictedDirection}</span>
                            </span>
                          </td>
                          <td className="py-3 text-right font-mono tabular-nums text-zinc-400 align-top whitespace-nowrap">
                            <div className="text-emerald-400 font-semibold">{chain.confidencePct}%</div>
                            <div>{chain.timeframe}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Multi-Horizon Geopolitical Cross-Asset Impulse Table (5-Min Window, 24h Session, 7d Tail + 99% Conformal Bounds) */}
          {activeImpulses.length > 0 && (
            <div className="pt-3 border-t border-zinc-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Geopolitical Cross-Asset &amp; Crypto Impulse Matrix (5-Minute, 24h &amp; 7d Horizons)</span>
                </h3>
                <span className="text-[11px] font-mono text-zinc-400">
                  Non-Conformity Split/Walk-Forward Quantile α = 0.01 (99.0%+ Calibrated Coverage)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse font-mono tabular-nums">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 font-sans">
                      <th className="py-2 pr-3 text-left font-medium">Market / Crypto</th>
                      <th className="py-2 px-2 text-right font-medium">Live Spot</th>
                      <th className="py-2 px-2 text-right font-medium">+5m Prediction</th>
                      <th className="py-2 px-2 text-right font-medium">+5m Target Price</th>
                      <th className="py-2 px-2 text-right font-medium">24h Session</th>
                      <th className="py-2 px-2 text-right font-medium">24h Point Forecast</th>
                      <th className="py-2 px-2 text-right font-medium">99% Conformal Interval [Lower, Upper]</th>
                      <th className="py-2 pl-2 text-right font-medium">5m Action Signal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/70">
                    {activeImpulses.map((imp) => {
                      const pos5m = (imp.fiveMinForecastPct ?? 0) >= 0;
                      const pos24 = imp.session24hPct >= 0;
                      const badge = actionBadgeStyle(imp.actionSignal || 'HOLD_NEUTRAL');
                      return (
                        <tr key={imp.symbol} className="hover:bg-zinc-950/60">
                          <td className="py-2 pr-3 whitespace-nowrap">
                            <span className="font-semibold text-zinc-100">{imp.symbol}</span>{' '}
                            <span className="font-sans text-zinc-400 text-[11px]">{imp.name}</span>
                          </td>
                          <td className="py-2 px-2 text-right text-zinc-200 whitespace-nowrap">
                            {formatPriceValue(imp.spotPrice, imp.unit)}
                          </td>
                          <td className={`py-2 px-2 text-right font-semibold whitespace-nowrap ${pos5m ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {pos5m ? '+' : ''}
                            {(imp.fiveMinForecastPct ?? 0).toFixed(3)}%
                          </td>
                          <td className="py-2 px-2 text-right font-bold text-amber-300 whitespace-nowrap">
                            {formatPriceValue(imp.projected5mPrice ?? imp.spotPrice, imp.unit)}
                          </td>
                          <td className={`py-2 px-2 text-right font-semibold whitespace-nowrap ${pos24 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {pos24 ? '+' : ''}
                            {imp.session24hPct.toFixed(3)}%
                          </td>
                          <td className="py-2 px-2 text-right font-bold text-zinc-100 whitespace-nowrap">
                            {formatPriceValue(imp.projected24hPrice, imp.unit)}
                          </td>
                          <td className="py-2 px-2 text-right text-cyan-300 whitespace-nowrap">
                            [{formatPriceValue(imp.conformal99Lower24hPrice, imp.unit)}, {formatPriceValue(imp.conformal99Upper24hPrice, imp.unit)}]{' '}
                            <span className="text-zinc-500">(±{imp.conformal99BandPct}%)</span>
                          </td>
                          <td className="py-2 pl-2 text-right whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${badge.cls}`}>
                              {imp.actionSignal}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Multi-Kernel Regression (Laplace 14 Close 2s) Diagnostics & Kernel Weights Table */}
        {(activeTab === 'all' || activeTab === 'mkr') && mkr && (
          <section className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-3 border-b border-zinc-800">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <span>Multi-Kernel Regression (Laplace-14 Close · Bandwidth h = 2s) &amp; 5-Minute Forecast Diagnostics</span>
                </h2>
                <p className="text-xs text-zinc-400">
                  {mkr.algorithmSpec} · {mkr.bandwidthSpec} · Walk-forward LOOCV MSE-weighted ensemble.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums text-zinc-300">
                <span className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800">
                  Window: <strong>L = {mkr.windowCloses} Closes</strong>
                </span>
                <span className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800">
                  2s Micro Depth: <strong>{mkr.microBufferDepth} Ticks</strong>
                </span>
                <span className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-emerald-400">
                  Mean 99% Coverage: <strong>{mkr.meanEmpiricalCoverage99Pct}%</strong>
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse font-mono tabular-nums">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 font-sans">
                    <th className="py-2.5 pr-3 text-left font-medium">Asset</th>
                    <th className="py-2.5 px-2 text-right font-medium">Spot Close</th>
                    <th className="py-2.5 px-2 text-right font-medium">Bandwidth h=2s</th>
                    <th className="py-2.5 px-2 text-right font-medium">+5m Laplace Forecast</th>
                    <th className="py-2.5 px-2 text-right font-medium">24h MKR Forecast</th>
                    <th className="py-2.5 px-2 text-right font-medium">Kernel Weights (L14 / Epa / Rbf / St3)</th>
                    <th className="py-2.5 px-2 text-right font-medium">LOOCV RMSE</th>
                    <th className="py-2.5 px-2 text-right font-medium">Hit Rate / R²</th>
                    <th className="py-2.5 pl-2 text-right font-medium">5m Action Signal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70">
                  {filteredForecasts.map((f) => {
                    const fm = f.fiveMinPrediction;
                    const pos5m = (fm?.predicted5mMovePct ?? 0) >= 0;
                    const pos24 = f.geopoliticalAdjustedMovePct >= 0;
                    const kw = f.kernelWeights;
                    const badge = actionBadgeStyle(fm?.actionSignal || 'HOLD_NEUTRAL');
                    return (
                      <tr key={f.symbol} className="hover:bg-zinc-950/60">
                        <td className="py-2.5 pr-3 whitespace-nowrap">
                          <div className="font-semibold text-zinc-100">{f.symbol}</div>
                          <div className="font-sans text-[11px] text-zinc-500">{f.name}</div>
                        </td>
                        <td className="py-2.5 px-2 text-right text-zinc-200 whitespace-nowrap">
                          {formatPriceValue(f.spotPrice, f.unit, f.assetClass)}
                        </td>
                        <td className="py-2.5 px-2 text-right text-cyan-300 font-semibold whitespace-nowrap">
                          {f.laplaceBandwidth2s}
                        </td>
                        <td className="py-2.5 px-2 text-right whitespace-nowrap">
                          <div className="font-bold text-amber-300">
                            {formatPriceValue(fm?.predicted5mPrice ?? f.spotPrice, f.unit, f.assetClass)}
                          </div>
                          <div className={`text-[11px] ${pos5m ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {pos5m ? '+' : ''}
                            {(fm?.predicted5mMovePct ?? 0).toFixed(3)}% (±{fm?.conformal99HalfBand5mPct ?? 0.25}%)
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-right whitespace-nowrap">
                          <div className="font-semibold text-zinc-200">
                            {formatPriceValue(f.geopoliticalAdjustedForecastPrice, f.unit, f.assetClass)}
                          </div>
                          <div className={`text-[11px] ${pos24 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {pos24 ? '+' : ''}
                            {f.geopoliticalAdjustedMovePct.toFixed(3)}%
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-right whitespace-nowrap text-[11px]">
                          <span className="text-amber-300 font-semibold">{Math.round(kw.laplace14_2s * 100)}%</span>
                          <span className="text-zinc-600"> / </span>
                          <span className="text-cyan-300">{Math.round(kw.epanechnikov14 * 100)}%</span>
                          <span className="text-zinc-600"> / </span>
                          <span className="text-emerald-300">{Math.round(kw.gaussianRbf * 100)}%</span>
                          <span className="text-zinc-600"> / </span>
                          <span className="text-violet-300">{Math.round(kw.studentT3 * 100)}%</span>
                        </td>
                        <td className="py-2.5 px-2 text-right text-zinc-300 whitespace-nowrap">
                          ±{f.loocvRmsePct.toFixed(3)}%
                        </td>
                        <td className="py-2.5 px-2 text-right whitespace-nowrap">
                          <span className="text-emerald-400 font-semibold">{f.directionalHitRatePct}%</span>
                          <span className="text-zinc-500"> · {f.rSquared.toFixed(3)}</span>
                        </td>
                        <td className="py-2.5 pl-2 text-right whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${badge.cls}`}>
                            {fm?.actionSignal || f.signalRegime}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Aladdin Risk Matrix: Correlation Heatmap, Factor Exposures & Stress Tests */}
        {(activeTab === 'all' || activeTab === 'risk') && riskMatrix && (
          <section className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* 90-Day Cross-Asset Pearson Correlation Matrix */}
              <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-100">
                      {riskMatrix.observationWindowDays}-Day Cross-Asset &amp; Crypto Pearson Correlation Matrix
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Computed directly from aligned daily log/simple returns across live Yahoo Finance &amp; Kraken history.
                    </p>
                  </div>
                </div>

                {Array.isArray(riskMatrix.correlationAssets) && riskMatrix.correlationAssets.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono tabular-nums border-collapse">
                      <thead>
                        <tr>
                          <th className="py-2 pr-2 text-left text-zinc-500 font-medium">Asset</th>
                          {riskMatrix.correlationAssets.map((sym) => (
                            <th key={sym} className="py-2 px-1.5 text-right text-zinc-300 font-semibold">
                              {sym.replace('^', '').replace('.NYB', '').replace('-USD', '')}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/70">
                        {riskMatrix.correlationAssets.map((rowSym, i) => (
                          <tr key={rowSym}>
                            <td className="py-2 pr-2 text-left font-semibold text-zinc-200 whitespace-nowrap">
                              {rowSym}
                            </td>
                            {riskMatrix.correlationAssets.map((colSym, j) => {
                              const val = riskMatrix.correlationMatrix?.[i]?.[j] ?? 0;
                              return (
                                <td
                                  key={`${rowSym}-${colSym}`}
                                  className={`py-2 px-1.5 text-right rounded ${correlationCellStyle(val, i === j)}`}
                                >
                                  {val.toFixed(2)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    Waiting for multi-asset 90-day return history to populate correlation matrix.
                  </div>
                )}
              </div>

              {/* Factor Exposures */}
              <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-100">
                      Systematic Factor Exposures &amp; Sigma Moves
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Real-time factor Z-scores measured against each benchmark&apos;s trailing daily standard deviation.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400">
                        <th className="py-2 pr-3 text-left font-medium">Macro Factor</th>
                        <th className="py-2 px-3 text-left font-medium">Proxy</th>
                        <th className="py-2 px-3 text-right font-medium">Live Level</th>
                        <th className="py-2 px-3 text-right font-medium">Daily Z-Score</th>
                        <th className="py-2 pl-3 text-right font-medium">Weight</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/70">
                      {(riskMatrix.factorExposures || []).map((f) => {
                        const sigAbs = Math.abs(f.dailySigmaMove);
                        const sigColor =
                          sigAbs >= 2 ? 'text-rose-400 font-bold' : sigAbs >= 1 ? 'text-amber-300 font-semibold' : 'text-zinc-300';
                        return (
                          <tr key={f.proxySymbol} className="hover:bg-zinc-900/50">
                            <td className="py-2.5 pr-3 text-zinc-200 font-medium">{f.factor}</td>
                            <td className="py-2.5 px-3 font-mono text-zinc-400">{f.proxySymbol}</td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums text-zinc-200 whitespace-nowrap">
                              {f.currentLevel}
                            </td>
                            <td className={`py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap ${sigColor}`}>
                              {f.dailySigmaMove >= 0 ? '+' : ''}
                              {f.dailySigmaMove.toFixed(2)}σ
                            </td>
                            <td className="py-2.5 pl-3 text-right font-mono tabular-nums text-zinc-400">
                              {f.systemicWeightPct}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Deterministic Stress-Test Shock Scenarios */}
            <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-100">
                    Covariance-Propagated Stress-Test Shock Scenarios
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Deterministic tail-shock propagation scaled by live trailing volatility and cross-asset correlations.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {(riskMatrix.stressScenarios || []).map((sc) => (
                  <div
                    key={sc.id}
                    className="p-4 rounded-lg bg-zinc-950/70 border border-zinc-800 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-zinc-100 leading-snug">{sc.name}</h3>
                        <span className="font-mono tabular-nums text-sm font-bold text-rose-400 shrink-0">
                          {sc.estimatedPortfolioImpactPct >= 0 ? '+' : ''}
                          {sc.estimatedPortfolioImpactPct}%
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">{sc.triggerDescription}</p>
                      <div className="text-[11px] font-mono text-amber-300">
                        Primary Shock: {sc.primaryShock} · {sc.probabilityHorizon}
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-2 pt-3 border-t border-zinc-800/80 font-mono tabular-nums text-[11px]">
                      <div>
                        <div className="text-zinc-500">Equities</div>
                        <div className={sc.projectedEquitiesPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {sc.projectedEquitiesPct >= 0 ? '+' : ''}
                          {sc.projectedEquitiesPct}%
                        </div>
                      </div>
                      <div>
                        <div className="text-zinc-500">10Y Rate</div>
                        <div className="text-amber-300">
                          {sc.projectedRatesBps >= 0 ? '+' : ''}
                          {sc.projectedRatesBps}bp
                        </div>
                      </div>
                      <div>
                        <div className="text-zinc-500">Oil</div>
                        <div className={sc.projectedOilPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {sc.projectedOilPct >= 0 ? '+' : ''}
                          {sc.projectedOilPct}%
                        </div>
                      </div>
                      <div>
                        <div className="text-zinc-500">Gold</div>
                        <div className={sc.projectedGoldPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {sc.projectedGoldPct >= 0 ? '+' : ''}
                          {sc.projectedGoldPct}%
                        </div>
                      </div>
                      <div>
                        <div className="text-zinc-500">Crypto</div>
                        <div className={sc.projectedCryptoPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {sc.projectedCryptoPct >= 0 ? '+' : ''}
                          {sc.projectedCryptoPct}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Live Cross-Asset Market Quotes Grid */}
        {(activeTab === 'all' || activeTab === 'markets') && (
          <section className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-zinc-800">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  <span>Live All-Market &amp; Crypto Benchmarks, FX Clearing &amp; Laplace-14 (2s) Window</span>
                </h2>
                <p className="text-xs text-zinc-400">
                  Real-time prices from Yahoo Finance, Kraken L1 / CoinGecko, and European Central Bank clearing.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-lg">
                {[
                  ['all', `All (${quotes.length})`],
                  ['crypto', 'Crypto'],
                  ['equity', 'Equities & Stocks'],
                  ['commodity', 'Commodities'],
                  ['rates', 'Rates'],
                  ['volatility', 'Volatility'],
                  ['currency', 'FX']
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAssetFilter(key)}
                    className={`px-2.5 py-1 text-xs rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      assetFilter === key ? 'bg-zinc-800 text-zinc-100 font-medium' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {filteredQuotes.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-500">
                No market quotes matched this asset class filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400">
                      <th className="py-2.5 pr-4 text-left font-medium">Symbol</th>
                      <th className="py-2.5 px-3 text-left font-medium">Instrument</th>
                      <th className="py-2.5 px-3 text-left font-medium">Class</th>
                      <th className="py-2.5 px-3 text-right font-medium">Spot / Level</th>
                      <th className="py-2.5 px-3 text-right font-medium">24h Move</th>
                      <th className="py-2.5 px-3 text-right font-medium">+5m Prediction</th>
                      <th className="py-2.5 px-3 text-right font-medium">Z-Score</th>
                      <th className="py-2.5 px-3 text-right font-medium">Laplace-14 Close Curve</th>
                      <th className="py-2.5 pl-4 text-left font-medium">Verified Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/70">
                    {filteredQuotes.map((q) => {
                      const pos = q.changePct >= 0;
                      const fc = mkr?.assetForecasts.find((a) => a.symbol === q.symbol);
                      const fm = fc?.fiveMinPrediction;
                      const pos5m = (fm?.predicted5mMovePct ?? 0) >= 0;
                      return (
                        <tr key={q.symbol} className="hover:bg-zinc-900/50">
                          <td className="py-2.5 pr-4 font-mono font-semibold text-zinc-100 whitespace-nowrap">
                            {q.symbol}
                          </td>
                          <td className="py-2.5 px-3 text-zinc-200 whitespace-nowrap">{q.name}</td>
                          <td className="py-2.5 px-3 text-zinc-400 uppercase font-mono text-[11px]">{q.assetClass}</td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-zinc-100 whitespace-nowrap">
                            {formatQuotePrice(q)}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono tabular-nums font-semibold whitespace-nowrap ${
                              pos ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            <span className="inline-flex items-center gap-1 justify-end">
                              {pos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              <span>
                                {pos ? '+' : ''}
                                {q.changePct.toFixed(2)}%
                              </span>
                            </span>
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono tabular-nums font-semibold whitespace-nowrap ${
                              pos5m ? 'text-emerald-300' : 'text-rose-300'
                            }`}
                          >
                            {fm ? `${pos5m ? '+' : ''}${fm.predicted5mMovePct.toFixed(3)}% (${formatPriceValue(fm.predicted5mPrice, q.unit, q.assetClass)})` : '—'}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap ${
                              Math.abs(q.zScore) >= 1.65 ? 'text-amber-300 font-semibold' : 'text-zinc-300'
                            }`}
                          >
                            {q.zScore >= 0 ? '+' : ''}
                            {q.zScore.toFixed(2)}σ
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex justify-end">
                              <MiniSparkline values={q.intraday5mCloses || q.historyCloses} positive={pos} />
                            </div>
                          </td>
                          <td className="py-2.5 pl-4 text-zinc-400 whitespace-nowrap">{q.source}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Live Geopolitical News Wires & USGS Seismic Disruptions */}
        {(activeTab === 'all' || activeTab === 'wires') && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-zinc-800">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-amber-400" />
                    <span>Live Geopolitical &amp; Macro Wire (BBC / Al Jazeera / CNBC)</span>
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Classified in real time with Laplace-14 (2s) primary asset impulse &amp; one-click causal simulation.
                  </p>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={wireSearch}
                    onChange={(e) => setWireSearch(e.target.value)}
                    placeholder="Filter headlines..."
                    className="bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 w-48"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-lg">
                {[
                  ['all', 'All Wires'],
                  ['conflict', 'Conflict'],
                  ['energy_shipping', 'Energy & Shipping'],
                  ['central_bank', 'Central Banks'],
                  ['sanctions_trade', 'Sanctions & Trade'],
                  ['cyber_infra', 'Cyber & Chips'],
                  ['macro', 'General Macro']
                ].map(([cat, label]) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setWireCategory(cat)}
                    className={`px-2.5 py-1 text-xs rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      wireCategory === cat ? 'bg-zinc-800 text-zinc-100 font-medium' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="divide-y divide-zinc-800/80 max-h-[460px] overflow-y-auto pr-1">
                {filteredHeadlines.length === 0 ? (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    No live geopolitical headlines matched your current filter.
                  </div>
                ) : (
                  filteredHeadlines.map((h) => {
                    const highSev = h.severity >= 7;
                    return (
                      <div key={h.id} className="py-3 flex items-start justify-between gap-4">
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-zinc-400">
                            <span className="text-zinc-200 font-semibold">{h.source}</span>
                            <span aria-hidden="true">·</span>
                            <span className={highSev ? 'text-rose-400 font-semibold' : 'text-amber-300'}>
                              Severity {h.severity}/10
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{h.category.replace('_', ' ')}</span>
                            <span aria-hidden="true">·</span>
                            <span>{Array.isArray(h.impactedRegions) ? h.impactedRegions.join(', ') : 'Global'}</span>
                            {h.predictedPrimaryAsset && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-cyan-300 font-semibold">
                                  {h.predictedPrimaryAsset}{' '}
                                  {typeof h.predictedImpulsePct === 'number'
                                    ? `${h.predictedImpulsePct >= 0 ? '+' : ''}${h.predictedImpulsePct}% (±${h.conformal99BandPct ?? 1.2}% @99%)`
                                    : ''}
                                </span>
                              </>
                            )}
                          </div>
                          {h.link ? (
                            <a
                              href={h.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-zinc-100 hover:text-amber-300 transition-colors inline-flex items-start gap-1.5"
                            >
                              <span>{h.title}</span>
                              <ExternalLink className="w-3 h-3 shrink-0 mt-1 text-zinc-500" />
                            </a>
                          ) : (
                            <div className="text-sm font-medium text-zinc-100">{h.title}</div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className="text-[11px] font-mono tabular-nums text-zinc-500 whitespace-nowrap">
                            {h.publishedAt ? new Date(h.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRunCausalPredict(undefined, `[${h.source}] ${h.title}`)}
                            disabled={predicting}
                            className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-[11px] font-mono text-amber-300 transition-colors cursor-pointer"
                          >
                            Simulate Impact
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* USGS Geophysical & Infrastructure Risk Feed */}
            <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-4">
              <div className="pb-3 border-b border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>USGS Seismic &amp; Infra Disruptions (M4.5+)</span>
                </h2>
                <p className="text-xs text-zinc-400">
                  Real-time geophysical events tracked for subsea cable, port, and semiconductor fab proximity.
                </p>
              </div>

              <div className="divide-y divide-zinc-800/80 max-h-[460px] overflow-y-auto pr-1">
                {seismicAlerts.length === 0 ? (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    No M4.5+ seismic disruptions recorded in the trailing 24-hour window.
                  </div>
                ) : (
                  seismicAlerts.map((s) => (
                    <div key={s.id} className="py-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-sm font-mono tabular-nums font-bold ${
                            s.magnitude >= 6.0 ? 'text-rose-400' : s.magnitude >= 5.2 ? 'text-amber-300' : 'text-zinc-200'
                          }`}
                        >
                          M {s.magnitude.toFixed(1)}
                        </span>
                        <span className="text-[11px] font-mono tabular-nums text-zinc-500">
                          {new Date(s.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-zinc-200">{s.place}</div>
                      <div className="text-[11px] font-mono tabular-nums text-zinc-500 flex items-center justify-between gap-2">
                        <span>
                          {Array.isArray(s.coords) && s.coords.length >= 2
                            ? `${Number(s.coords[1]).toFixed(2)}°, ${Number(s.coords[0]).toFixed(2)}°`
                            : 'Global'}
                        </span>
                        {s.tsunami && <span className="text-rose-400 font-semibold">· TSUNAMI ALERT</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
