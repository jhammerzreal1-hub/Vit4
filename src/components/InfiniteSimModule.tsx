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

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Smartphone,
  Phone,
  MessageSquare,
  RefreshCw,
  Plus,
  Trash2,
  Copy,
  Check,
  Send,
  Shield,
  Key,
  Webhook,
  Archive,
  Search,
  Sparkles,
  PhoneCall,
  Pause,
  Play,
  RotateCw,
  ArrowUpRight,
  AlertCircle,
  Radio,
  Globe,
  Download
} from 'lucide-react';
import type {
  InfiniteSimProfile,
  BurnerPhoneNumber,
  BurnerSmsMessage,
  BurnerVoiceCall,
  CarrierBridgeStatus
} from '../types';

interface CarrierOption {
  countryCode: string;
  countryName: string;
  dialCode: string;
  mcc: string;
  mnc: string;
  carrierName: string;
  apn: string;
  sampleAreas: string[];
}

interface InfiniteSimModuleProps {
  onSaveToVault?: (
    type: 'knowledge' | 'dossier' | 'transcription',
    title: string,
    prompt: string,
    model: string,
    mediaUrl?: string,
    metadataJson?: string
  ) => void;
  onInjectToChat?: (content: string, immediate?: boolean) => void;
  onNavigateUrlInBrowser?: (url: string) => void;
}

/**
 * Deterministic 21x21 QR-style matrix SVG derived from GSMA LPA activation string
 */
const DeterministicLpaMatrix: React.FC<{ value: string }> = ({ value }) => {
  const size = 21;
  const cells = useMemo(() => {
    const grid: boolean[] = new Array(size * size).fill(false);
    const setFinder = (ox: number, oy: number) => {
      for (let y = 0; y < 7; y++) {
        for (let x = 0; x < 7; x++) {
          const border = x === 0 || x === 6 || y === 0 || y === 6;
          const center = x >= 2 && x <= 4 && y >= 2 && y <= 4;
          grid[(oy + y) * size + (ox + x)] = border || center;
        }
      }
    };
    setFinder(0, 0);
    setFinder(size - 7, 0);
    setFinder(0, size - 7);

    let seed = 2166136261;
    for (let i = 0; i < value.length; i++) {
      seed ^= value.charCodeAt(i);
      seed = Math.imul(seed, 16777619);
    }

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const inTopLeft = x < 8 && y < 8;
        const inTopRight = x >= size - 8 && y < 8;
        const inBottomLeft = x < 8 && y >= size - 8;
        if (inTopLeft || inTopRight || inBottomLeft) continue;
        seed ^= (x * 31 + y * 17 + 7);
        seed = Math.imul(seed, 16777619);
        grid[y * size + x] = (seed >>> 30) % 2 === 0;
      }
    }
    return grid;
  }, [value]);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-24 h-24 rounded-lg bg-white p-1.5 shrink-0"
      role="img"
      aria-label="eSIM Activation Matrix"
    >
      {cells.map((filled, idx) => {
        if (!filled) return null;
        const x = idx % size;
        const y = Math.floor(idx / size);
        return <rect key={idx} x={x} y={y} width={1} height={1} fill="#09090b" />;
      })}
    </svg>
  );
};

export const InfiniteSimModule: React.FC<InfiniteSimModuleProps> = ({
  onSaveToVault,
  onInjectToChat,
  onNavigateUrlInBrowser
}) => {
  const [simProfiles, setSimProfiles] = useState<InfiniteSimProfile[]>([]);
  const [burnerNumbers, setBurnerNumbers] = useState<BurnerPhoneNumber[]>([]);
  const [smsMessages, setSmsMessages] = useState<BurnerSmsMessage[]>([]);
  const [voiceCalls, setVoiceCalls] = useState<BurnerVoiceCall[]>([]);
  const [carriers, setCarriers] = useState<CarrierOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Active SIM provisioning controls
  const [newSimCountry, setNewSimCountry] = useState('US');
  const [newSimLabel, setNewSimLabel] = useState('');
  const [showNewSimForm, setShowNewSimForm] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  // Burner number provisioning controls
  const [numCountry, setNumCountry] = useState('US');
  const [numAreaCode, setNumAreaCode] = useState('');
  const [numTag, setNumTag] = useState('Verification');
  const [numCount, setNumCount] = useState(1);
  const [numSimId, setNumSimId] = useState('');

  // Directory & message filtering
  const [selectedNumberId, setSelectedNumberId] = useState<string>('all');
  const [numberSearch, setNumberSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ONLINE' | 'PAUSED'>('all');
  const [selectedSmsId, setSelectedSmsId] = useState<string | null>(null);
  const [streamMode, setStreamMode] = useState<'sms' | 'voice'>('sms');

  // Interactive messaging / webhook / AI controls
  const [composeTab, setComposeTab] = useState<'inbound-test' | 'outbound' | 'call'>('outbound');
  const [testFrom, setTestFrom] = useState('AuthGateway');
  const [testBody, setTestBody] = useState('Your one-time security verification code is 739104. Valid for 10 minutes.');
  const [outboundTo, setOutboundTo] = useState('');
  const [outboundBody, setOutboundBody] = useState('');
  const [useTermuxBridge, setUseTermuxBridge] = useState(false);

  const [callParty, setCallParty] = useState('');
  const [callDirection, setCallDirection] = useState<'OUTBOUND' | 'INBOUND'>('OUTBOUND');
  const [callDtmf, setCallDtmf] = useState('');
  const [callNotes, setCallNotes] = useState('');

  const [webhookInput, setWebhookInput] = useState('');
  const [aiTriageResult, setAiTriageResult] = useState<string | null>(null);
  const [aiTriaging, setAiTriaging] = useState(false);

  // Real Carrier PSTN / eSIM / Termux Hardware Bridge & Training Dataset
  const [carrierStatus, setCarrierStatus] = useState<CarrierBridgeStatus | null>(null);
  const [availableRealNumbers, setAvailableRealNumbers] = useState<Array<{
    provider: string;
    phoneNumber: string;
    friendlyName: string;
    locality: string;
    region: string;
    country: string;
  }>>([]);
  const [searchingReal, setSearchingReal] = useState(false);
  const [syncingTermux, setSyncingTermux] = useState(false);
  const [showCarrierPanel, setShowCarrierPanel] = useState(false);

  const flashNotice = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(prev => (prev === msg ? null : prev)), 4000);
  };

  const copyValue = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(prev => (prev === key ? null : prev)), 1800);
  };

  const fetchState = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [res, carrierRes] = await Promise.all([
        fetch('/api/sim/state'),
        fetch('/api/sim/carrier/status').catch(() => null)
      ]);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load SIM state');
      setSimProfiles(data.simProfiles || []);
      setBurnerNumbers(data.burnerNumbers || []);
      setSmsMessages(data.smsMessages || []);
      setVoiceCalls(data.voiceCalls || []);
      setCarriers(data.carriers || []);
      const activeSim = (data.simProfiles || []).find((s: InfiniteSimProfile) => s.status === 'ACTIVE') || data.simProfiles?.[0];
      if (activeSim) {
        setNumSimId(prev => prev || activeSim.id);
      }
      if (carrierRes && carrierRes.ok) {
        const cData = await carrierRes.json();
        if (cData?.success) setCarrierStatus(cData);
      }
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to connect to SIM subsystem');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState(false);
    const interval = setInterval(() => fetchState(true), 10000);
    return () => clearInterval(interval);
  }, [fetchState]);

  const handleSearchRealCarrierNumbers = async () => {
    setSearchingReal(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams({ country: numCountry, limit: '8' });
      if (numAreaCode) params.set('areaCode', numAreaCode);
      const res = await fetch(`/api/sim/carrier/available-numbers?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Carrier credentials not configured in .env');
      }
      setAvailableRealNumbers(data.numbers || []);
      flashNotice(`Found ${(data.numbers || []).length} live ${data.provider} PSTN numbers`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to query real carrier inventory');
      setAvailableRealNumbers([]);
    } finally {
      setSearchingReal(false);
    }
  };

  const handleProvisionRealNumber = async (phoneNumber: string) => {
    setBusyAction(`real-${phoneNumber}`);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/sim/carrier/provision-real-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          countryCode: numCountry,
          tag: numTag.trim() || 'Real PSTN Line',
          simId: numSimId || undefined
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to provision real number');
      await fetchState(true);
      setAvailableRealNumbers(prev => prev.filter(n => n.phoneNumber !== phoneNumber));
      flashNotice(`Provisioned real PSTN number ${phoneNumber} (${data.provider})`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Real number provisioning failed');
    } finally {
      setBusyAction(null);
    }
  };

  const handleProvisionRealEsim = async () => {
    setBusyAction('real-esim');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/sim/carrier/provision-real-esim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newSimLabel.trim() || 'Carrier Programmable eSIM' })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Real carrier eSIM credentials not configured');
      await fetchState(true);
      flashNotice(`Provisioned carrier eSIM via ${data.provider}`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Carrier eSIM provisioning unavailable');
    } finally {
      setBusyAction(null);
    }
  };

  const handleSyncTermuxHardware = async () => {
    setSyncingTermux(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/sim/termux/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Termux hardware API not active on host');
      await fetchState(true);
      flashNotice(`Synced phone hardware SIM (${data.importedMessages || 0} SMS imported)`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Termux hardware sync unavailable');
    } finally {
      setSyncingTermux(false);
    }
  };

  const handleExportTrainingJsonl = async (saveToVault = false) => {
    setBusyAction('training-export');
    try {
      const res = await fetch('/api/sim/training-dataset');
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error('Failed to compile training dataset');
      if (saveToVault && onSaveToVault) {
        onSaveToVault(
          'knowledge',
          `Telecom & OTP Agent Training JSONL (${data.sampleCount} samples)`,
          data.jsonl || '',
          'infinite-sim-training-pipeline'
        );
        flashNotice(`Saved ${data.sampleCount} training samples to Vault`);
      } else {
        const blob = new Blob([data.jsonl || ''], { type: 'application/x-ndjson' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'infinite_sim_agent_training.jsonl';
        a.click();
        URL.revokeObjectURL(url);
        flashNotice(`Downloaded ${data.sampleCount} JSONL agent training records`);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to export training dataset');
    } finally {
      setBusyAction(null);
    }
  };

  const activeSim = useMemo(
    () => simProfiles.find(s => s.status === 'ACTIVE') || simProfiles[0] || null,
    [simProfiles]
  );

  const selectedNumber = useMemo(
    () => burnerNumbers.find(n => n.id === selectedNumberId) || null,
    [burnerNumbers, selectedNumberId]
  );

  useEffect(() => {
    if (selectedNumber) {
      setWebhookInput(selectedNumber.forwardingWebhook || '');
    } else {
      setWebhookInput('');
    }
  }, [selectedNumber]);

  const filteredNumbers = useMemo(() => {
    return burnerNumbers.filter(n => {
      if (n.status === 'BURNED') return false;
      if (statusFilter !== 'all' && n.status !== statusFilter) return false;
      if (numberSearch.trim()) {
        const q = numberSearch.toLowerCase();
        return (
          n.e164.toLowerCase().includes(q) ||
          n.displayNumber.toLowerCase().includes(q) ||
          n.tag.toLowerCase().includes(q) ||
          n.countryCode.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [burnerNumbers, statusFilter, numberSearch]);

  const visibleMessages = useMemo(() => {
    if (selectedNumberId === 'all') return smsMessages;
    return smsMessages.filter(m => m.numberId === selectedNumberId);
  }, [smsMessages, selectedNumberId]);

  const visibleCalls = useMemo(() => {
    if (selectedNumberId === 'all') return voiceCalls;
    return voiceCalls.filter(c => c.numberId === selectedNumberId);
  }, [voiceCalls, selectedNumberId]);

  const selectedSms = useMemo(
    () => visibleMessages.find(m => m.id === selectedSmsId) || visibleMessages[0] || null,
    [visibleMessages, selectedSmsId]
  );

  useEffect(() => {
    setAiTriageResult(null);
  }, [selectedSms?.id]);

  // SIM Profile Actions
  const handleProvisionSim = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyAction('provision-sim');
    try {
      const res = await fetch('/api/sim/profile/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countryCode: newSimCountry,
          label: newSimLabel.trim() || undefined,
          makeActive: true
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Provisioning failed');
      setNewSimLabel('');
      setShowNewSimForm(false);
      await fetchState(true);
      flashNotice(`Provisioned ${data.profile.carrierName} (${data.profile.iccid.slice(-6)})`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to provision eSIM');
    } finally {
      setBusyAction(null);
    }
  };

  const handleActivateOrRotateSim = async (simId: string, rotate: boolean) => {
    setBusyAction(rotate ? `rotate-${simId}` : `activate-${simId}`);
    try {
      const res = await fetch('/api/sim/profile/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simId, rotate })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Operation failed');
      await fetchState(true);
      flashNotice(rotate ? `Rotated IMSI & ICCID for ${data.profile.label}` : `Activated ${data.profile.label}`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'SIM update failed');
    } finally {
      setBusyAction(null);
    }
  };

  const handleDeleteSim = async (simId: string) => {
    setBusyAction(`del-sim-${simId}`);
    try {
      const res = await fetch(`/api/sim/profile/${simId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Could not remove SIM');
      await fetchState(true);
      flashNotice('Removed standby eSIM profile');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to delete SIM');
    } finally {
      setBusyAction(null);
    }
  };

  // Burner Phone Number Actions
  const handleProvisionNumbers = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyAction('provision-numbers');
    try {
      const res = await fetch('/api/sim/numbers/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countryCode: numCountry,
          areaCode: numAreaCode,
          tag: numTag,
          simId: numSimId || activeSim?.id,
          count: numCount
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Provisioning failed');
      if (data.numbers?.[0]) {
        setSelectedNumberId(data.numbers[0].id);
      }
      setNumAreaCode('');
      await fetchState(true);
      flashNotice(`Provisioned ${data.count} ${numCountry} number${data.count > 1 ? 's' : ''}`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to provision numbers');
    } finally {
      setBusyAction(null);
    }
  };

  const handleToggleNumberStatus = async (num: BurnerPhoneNumber) => {
    const nextStatus = num.status === 'ONLINE' ? 'PAUSED' : 'ONLINE';
    try {
      const res = await fetch(`/api/sim/numbers/${num.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        await fetchState(true);
        flashNotice(`${num.displayNumber} set to ${nextStatus}`);
      }
    } catch (_) {}
  };

  const handleRotateNumber = async (num: BurnerPhoneNumber) => {
    setBusyAction(`rot-num-${num.id}`);
    try {
      const res = await fetch(`/api/sim/numbers/${num.id}/rotate`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.replacement) {
        setSelectedNumberId(data.replacement.id);
        await fetchState(true);
        flashNotice(`Rotated to ${data.replacement.displayNumber}`);
      }
    } catch (_) {}
    finally {
      setBusyAction(null);
    }
  };

  const handleBurnNumber = async (num: BurnerPhoneNumber) => {
    setBusyAction(`burn-${num.id}`);
    try {
      const res = await fetch(`/api/sim/numbers/${num.id}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedNumberId === num.id) setSelectedNumberId('all');
        await fetchState(true);
        flashNotice(`Burned ${num.displayNumber}`);
      }
    } catch (_) {}
    finally {
      setBusyAction(null);
    }
  };

  // Messaging & Voice Actions
  const activeTargetNumber = selectedNumber || filteredNumbers[0] || null;

  const handleDeliverInboundTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTargetNumber) {
      setErrorMsg('Provision or select a burner phone number first.');
      return;
    }
    setBusyAction('inbound-sms');
    try {
      const res = await fetch('/api/sim/sms/incoming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: activeTargetNumber.e164,
          from: testFrom.trim() || 'ServiceAuth',
          body: testBody.trim()
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Delivery failed');
      setSelectedSmsId(data.message.id);
      await fetchState(true);
      flashNotice(`Delivered inbound SMS to ${activeTargetNumber.displayNumber}`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Inbound SMS delivery failed');
    } finally {
      setBusyAction(null);
    }
  };

  const handleSendOutboundSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTargetNumber || !outboundTo.trim() || !outboundBody.trim()) return;
    setBusyAction('outbound-sms');
    try {
      const res = await fetch('/api/sim/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numberId: activeTargetNumber.id,
          to: outboundTo.trim(),
          body: outboundBody.trim(),
          useTermuxBridge
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Send failed');
      setOutboundBody('');
      setSelectedSmsId(data.message.id);
      await fetchState(true);
      flashNotice(
        data.loopbackDelivered
          ? `Sent & delivered loopback SMS to ${outboundTo}`
          : `Dispatched outbound SMS to ${outboundTo}`
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'Outbound SMS failed');
    } finally {
      setBusyAction(null);
    }
  };

  const handleLogVoiceCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTargetNumber || !callParty.trim()) return;
    setBusyAction('voice-call');
    try {
      const res = await fetch('/api/sim/voice/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numberId: activeTargetNumber.id,
          remoteParty: callParty.trim(),
          direction: callDirection,
          dtmfDigits: callDtmf.trim(),
          transcript: callNotes.trim() || undefined,
          useTermuxBridge
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Call dispatch failed');
      setCallNotes('');
      setCallDtmf('');
      setStreamMode('voice');
      await fetchState(true);
      flashNotice(`Logged ${callDirection.toLowerCase()} call with ${callParty}`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Voice call failed');
    } finally {
      setBusyAction(null);
    }
  };

  const handleSaveWebhook = async () => {
    if (!selectedNumber) return;
    setBusyAction('save-webhook');
    try {
      const res = await fetch(`/api/sim/numbers/${selectedNumber.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forwardingWebhook: webhookInput.trim() })
      });
      if (res.ok) {
        await fetchState(true);
        flashNotice('Webhook forwarding rule saved');
      }
    } catch (_) {}
    finally {
      setBusyAction(null);
    }
  };

  const handleAiTriage = async () => {
    if (!selectedSms) return;
    setAiTriaging(true);
    try {
      const res = await fetch('/api/sim/ai-triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: selectedSms.from,
          to: selectedSms.to,
          body: selectedSms.body
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAiTriageResult(data.analysis);
      } else {
        setAiTriageResult(data.error || 'Analysis unavailable');
      }
    } catch (err: any) {
      setAiTriageResult(err?.message || 'AI analysis error');
    } finally {
      setAiTriaging(false);
    }
  };

  const handleDeleteSms = async (smsId: string) => {
    try {
      const res = await fetch(`/api/sim/sms/${smsId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchState(true);
        flashNotice('Message deleted');
      }
    } catch (_) {}
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6 text-zinc-100">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
            Infinite eSIM & Burner Phone Numbers
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            {simProfiles.length} SIM profiles · {filteredNumbers.length} active numbers · {smsMessages.length} messages · Unlimited allocation
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowNewSimForm(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>New Infinite eSIM</span>
          </button>
          <button
            onClick={() => fetchState(false)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : 'text-zinc-400'}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Transient Feedback */}
      {(errorMsg || statusNotice) && (
        <div className={`px-4 py-2.5 rounded-lg border text-xs flex items-center justify-between ${
          errorMsg
            ? 'bg-red-950/40 border-red-800/70 text-red-200'
            : 'bg-emerald-950/40 border-emerald-800/70 text-emerald-200'
        }`}>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg || statusNotice}</span>
          </div>
          <button
            onClick={() => { setErrorMsg(null); setStatusNotice(null); }}
            className="text-xs underline opacity-80 hover:opacity-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Optional New SIM Form */}
      {showNewSimForm && (
        <form onSubmit={handleProvisionSim} className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/70 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Carrier Region</label>
            <select
              value={newSimCountry}
              onChange={(e) => setNewSimCountry(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100"
            >
              {(carriers.length > 0 ? carriers : [{ countryCode: 'US', countryName: 'United States', carrierName: 'Lyrailius Carrier US 5G' } as any]).map(c => (
                <option key={c.countryCode} value={c.countryCode}>
                  {c.countryCode} — {c.carrierName}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-zinc-400 mb-1">Profile Label</label>
            <input
              type="text"
              value={newSimLabel}
              onChange={(e) => setNewSimLabel(e.target.value)}
              placeholder="Primary Operations eSIM"
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={busyAction === 'provision-sim'}
              className="flex-1 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              {busyAction === 'provision-sim' ? 'Provisioning...' : 'Provision eSIM'}
            </button>
            <button
              type="button"
              onClick={() => setShowNewSimForm(false)}
              className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* SECTION 1: INFINITE eSIM CARD CONSOLE */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-amber-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">
                Active Infinite eSIM Hardware Profile
              </h2>
              <p className="text-xs text-zinc-400">
                {activeSim ? `${activeSim.carrierName} · ${activeSim.networkStandard} · Data: ${activeSim.dataQuota}` : 'No SIM provisioned'}
              </p>
            </div>
          </div>

          {activeSim && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => copyValue('lpa', activeSim.activationCode)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-xs text-zinc-200 cursor-pointer whitespace-nowrap"
              >
                {copiedKey === 'lpa' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                <span>Copy LPA String</span>
              </button>
              <button
                onClick={() => handleActivateOrRotateSim(activeSim.id, true)}
                disabled={busyAction === `rotate-${activeSim.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-xs text-amber-300 cursor-pointer whitespace-nowrap"
              >
                <RotateCw className={`w-3.5 h-3.5 ${busyAction === `rotate-${activeSim.id}` ? 'animate-spin' : ''}`} />
                <span>Rotate ICCID / IMSI</span>
              </button>
              {onSaveToVault && (
                <button
                  onClick={() => onSaveToVault(
                    'dossier',
                    `eSIM Profile: ${activeSim.label}`,
                    JSON.stringify(activeSim, null, 2),
                    'infinite-sim-subsystem'
                  )}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-xs text-zinc-200 cursor-pointer whitespace-nowrap"
                >
                  <Archive className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Save to Vault</span>
                </button>
              )}
            </div>
          )}
        </div>

        {activeSim && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Hardware SIM Specification Grid */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-xs text-zinc-400">ICCID (Luhn Validated)</div>
                <div className="flex items-center justify-between gap-2 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2">
                  <span className="font-mono tabular-nums text-xs text-zinc-100 truncate">{activeSim.iccid}</span>
                  <button onClick={() => copyValue('iccid', activeSim.iccid)} className="text-zinc-400 hover:text-zinc-100 cursor-pointer">
                    {copiedKey === 'iccid' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-zinc-400">IMSI · MCC/MNC ({activeSim.mcc}-{activeSim.mnc})</div>
                <div className="flex items-center justify-between gap-2 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2">
                  <span className="font-mono tabular-nums text-xs text-zinc-100 truncate">{activeSim.imsi}</span>
                  <button onClick={() => copyValue('imsi', activeSim.imsi)} className="text-zinc-400 hover:text-zinc-100 cursor-pointer">
                    {copiedKey === 'imsi' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-zinc-400">eUICC Identifier (EID)</div>
                <div className="flex items-center justify-between gap-2 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2">
                  <span className="font-mono tabular-nums text-xs text-zinc-300 truncate">{activeSim.eid}</span>
                  <button onClick={() => copyValue('eid', activeSim.eid)} className="text-zinc-400 hover:text-zinc-100 cursor-pointer">
                    {copiedKey === 'eid' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-zinc-400">SM-DP+ & APN Gateway</div>
                <div className="flex items-center justify-between gap-2 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2">
                  <span className="font-mono text-xs text-zinc-300 truncate">{activeSim.smdpAddress} · {activeSim.apn}</span>
                </div>
              </div>
            </div>

            {/* SGP.22 LPA QR Activation Panel */}
            <div className="lg:col-span-4 flex items-center gap-4 bg-zinc-950 border border-zinc-800 rounded-xl p-4">
              <DeterministicLpaMatrix value={activeSim.activationCode} />
              <div className="min-w-0 space-y-1.5">
                <div className="text-xs font-medium text-zinc-100">GSMA SGP.22 Activation</div>
                <div className="text-[11px] font-mono text-zinc-400 break-all line-clamp-2">
                  {activeSim.activationCode}
                </div>
                <div className="text-[11px] font-mono text-zinc-500">
                  Ki {activeSim.kiFingerprint.slice(0, 12)} · {activeSim.assignedNumbersCount || 0} numbers bound
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SIM Profile Switcher Strip */}
        {simProfiles.length > 0 && (
          <div className="pt-2 border-t border-zinc-800/80 flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs text-zinc-400 shrink-0 mr-1">SIM Slots:</span>
            {simProfiles.map(sim => (
              <div
                key={sim.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs shrink-0 ${
                  sim.status === 'ACTIVE'
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                }`}
              >
                <button
                  onClick={() => sim.status !== 'ACTIVE' && handleActivateOrRotateSim(sim.id, false)}
                  className="font-medium hover:text-zinc-100 cursor-pointer whitespace-nowrap"
                >
                  {sim.label} ({sim.countryCode}) · {sim.iccid.slice(-4)}
                </button>
                {sim.status !== 'ACTIVE' && simProfiles.length > 1 && (
                  <button
                    onClick={() => handleDeleteSim(sim.id)}
                    title="Remove standby eSIM"
                    className="text-zinc-500 hover:text-red-400 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* REAL TELECOM CARRIER BRIDGE, HARDWARE CELLULAR SYNC & TRAINING DATA */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">
              Live Telecom Bridge, User Cellular Sync & Agent Training Data
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Twilio PSTN: {carrierStatus?.twilioConfigured ? 'Connected (.env)' : 'Not configured'} · Telnyx PSTN: {carrierStatus?.telnyxConfigured ? 'Connected (.env)' : 'Not configured'} · Android Termux Radio: {carrierStatus?.termuxTelephonyAvailable || carrierStatus?.termuxSmsAvailable ? 'Detected' : 'Desktop Host'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowCarrierPanel(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-xs text-zinc-200 cursor-pointer whitespace-nowrap"
            >
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              <span>{showCarrierPanel ? 'Hide Carrier Bridge' : 'Real Carrier PSTN / eSIM'}</span>
            </button>
            <button
              onClick={handleSyncTermuxHardware}
              disabled={syncingTermux}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-xs text-emerald-300 cursor-pointer whitespace-nowrap"
            >
              <Radio className={`w-3.5 h-3.5 ${syncingTermux ? 'animate-spin' : ''}`} />
              <span>{syncingTermux ? 'Syncing...' : 'Sync Phone SIM / SMS'}</span>
            </button>
            <button
              onClick={() => handleExportTrainingJsonl(false)}
              disabled={busyAction === 'training-export'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-xs text-amber-300 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Training JSONL</span>
            </button>
            {onSaveToVault && (
              <button
                onClick={() => handleExportTrainingJsonl(true)}
                disabled={busyAction === 'training-export'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-xs text-zinc-200 cursor-pointer whitespace-nowrap"
              >
                <Archive className="w-3.5 h-3.5 text-emerald-400" />
                <span>Save Dataset to Vault</span>
              </button>
            )}
          </div>
        </div>

        {showCarrierPanel && (
          <div className="pt-3 border-t border-zinc-800 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1.5">
                <div className="font-medium text-zinc-200">Inbound Carrier Webhook Endpoints</div>
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-zinc-400">
                  <span className="truncate">Twilio: {carrierStatus?.webhookUrls.twilioSms || '/api/sim/webhook/twilio'}</span>
                  <button
                    onClick={() => copyValue('wh-tw', carrierStatus?.webhookUrls.twilioSms || `${window.location.origin}/api/sim/webhook/twilio`)}
                    className="text-zinc-300 hover:text-white shrink-0 cursor-pointer"
                  >
                    {copiedKey === 'wh-tw' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-zinc-400">
                  <span className="truncate">Telnyx: {carrierStatus?.webhookUrls.telnyxSms || '/api/sim/webhook/telnyx'}</span>
                  <button
                    onClick={() => copyValue('wh-tl', carrierStatus?.webhookUrls.telnyxSms || `${window.location.origin}/api/sim/webhook/telnyx`)}
                    className="text-zinc-300 hover:text-white shrink-0 cursor-pointer"
                  >
                    {copiedKey === 'wh-tl' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex flex-col justify-between gap-2">
                <div className="text-[11px] text-zinc-400 leading-relaxed">
                  To provision live PSTN numbers &amp; carrier eSIMs, set <span className="font-mono text-zinc-200">TWILIO_ACCOUNT_SID</span> + <span className="font-mono text-zinc-200">TWILIO_AUTH_TOKEN</span> (or <span className="font-mono text-zinc-200">TELNYX_API_KEY</span>) in your server <span className="font-mono text-zinc-200">.env</span>, or run inside Android Termux to share your phone&apos;s cellular SIM.
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleSearchRealCarrierNumbers}
                    disabled={searchingReal}
                    className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium cursor-pointer"
                  >
                    {searchingReal ? 'Querying Carrier...' : `Search Live ${numCountry} Numbers`}
                  </button>
                  <button
                    onClick={handleProvisionRealEsim}
                    disabled={busyAction === 'real-esim'}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-medium cursor-pointer"
                  >
                    Provision Carrier SuperSIM / eSIM
                  </button>
                </div>
              </div>
            </div>

            {availableRealNumbers.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {availableRealNumbers.map(item => (
                  <div key={item.phoneNumber} className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono tabular-nums text-xs font-medium text-zinc-100 truncate">{item.phoneNumber}</div>
                      <div className="text-[11px] text-zinc-500 truncate">{item.locality || item.region || item.country} · {item.provider}</div>
                    </div>
                    <button
                      onClick={() => handleProvisionRealNumber(item.phoneNumber)}
                      disabled={busyAction === `real-${item.phoneNumber}`}
                      className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium shrink-0 cursor-pointer"
                    >
                      {busyAction === `real-${item.phoneNumber}` ? '...' : 'Buy'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* SECTION 2: INFINITE BURNER PHONE NUMBERS */}
      <section className="space-y-4">
        {/* Generator Bar */}
        <form onSubmit={handleProvisionNumbers} className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Country / Dial Code</label>
            <select
              value={numCountry}
              onChange={(e) => setNumCountry(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100"
            >
              {(carriers.length > 0 ? carriers : [{ countryCode: 'US', countryName: 'United States', dialCode: '+1' } as any]).map(c => (
                <option key={c.countryCode} value={c.countryCode}>
                  {c.countryCode} ({c.dialCode}) — {c.countryName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Area Code (Optional)</label>
            <input
              type="text"
              value={numAreaCode}
              onChange={(e) => setNumAreaCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
              placeholder="Auto (e.g. 415)"
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-600"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Line Tag</label>
            <input
              type="text"
              value={numTag}
              onChange={(e) => setNumTag(e.target.value)}
              placeholder="Verification"
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Bind to eSIM</label>
            <select
              value={numSimId || activeSim?.id || ''}
              onChange={(e) => setNumSimId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100"
            >
              {simProfiles.map(s => (
                <option key={s.id} value={s.id}>
                  {s.label} ({s.countryCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Batch Count</label>
            <select
              value={numCount}
              onChange={(e) => setNumCount(Number(e.target.value))}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100"
            >
              {[1, 3, 5, 10, 25].map(n => (
                <option key={n} value={n}>{n} {n === 1 ? 'Number' : 'Numbers'}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={busyAction === 'provision-numbers'}
            className="w-full px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            {busyAction === 'provision-numbers' ? 'Allocating...' : 'Generate Number'}
          </button>
        </form>

        {/* Three-Pane Number Directory, Stream & Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Pane: Unlimited Numbers Directory */}
          <div className="lg:col-span-4 rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            <div className="p-3 border-b border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-200">
                  Burner Phone Numbers ({filteredNumbers.length})
                </span>
                <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
                  {(['all', 'ONLINE', 'PAUSED'] as const).map(st => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-2 py-1 rounded text-[11px] font-medium cursor-pointer ${
                        statusFilter === st ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {st === 'all' ? 'All' : st === 'ONLINE' ? 'Online' : 'Paused'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={numberSearch}
                  onChange={(e) => setNumberSearch(e.target.value)}
                  placeholder="Search number, country, tag..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500"
                />
              </div>
            </div>

            <div className="max-h-[460px] overflow-y-auto divide-y divide-zinc-800/70">
              <button
                onClick={() => setSelectedNumberId('all')}
                className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                  selectedNumberId === 'all' ? 'bg-zinc-800/80 text-zinc-100' : 'hover:bg-zinc-800/40 text-zinc-300'
                }`}
              >
                <span className="font-medium">All Burner Numbers</span>
                <span className="font-mono tabular-nums text-zinc-400">{smsMessages.length} SMS</span>
              </button>

              {filteredNumbers.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-500">
                  No matching numbers. Click Generate Number above to allocate a new line.
                </div>
              ) : (
                filteredNumbers.map(num => {
                  const isSelected = selectedNumberId === num.id;
                  return (
                    <div
                      key={num.id}
                      onClick={() => setSelectedNumberId(num.id)}
                      className={`px-3.5 py-3 transition-colors cursor-pointer space-y-2 ${
                        isSelected ? 'bg-zinc-800/70' : 'hover:bg-zinc-800/30'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono tabular-nums text-xs font-semibold text-zinc-100">
                          {num.displayNumber}
                        </span>
                        <span className={`text-[11px] font-medium ${num.status === 'ONLINE' ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {num.status === 'ONLINE' ? 'Active' : 'Paused'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span>{num.countryCode} · {num.tag}{num.provider && num.provider !== 'local-matrix' ? ` · ${num.provider}` : ''}</span>
                        <span className="font-mono tabular-nums">{num.messageCount} msg</span>
                      </div>

                      <div className="flex items-center gap-1.5 pt-0.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => copyValue(num.id, num.e164)}
                          className="px-2 py-1 rounded bg-zinc-950 border border-zinc-800 hover:border-zinc-600 text-[11px] text-zinc-300 flex items-center gap-1 cursor-pointer"
                        >
                          {copiedKey === num.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>Copy</span>
                        </button>
                        <a
                          href={`tel:${num.e164}`}
                          className="px-2 py-1 rounded bg-zinc-950 border border-zinc-800 hover:border-zinc-600 text-[11px] text-sky-300 flex items-center gap-1"
                          title="Dial via phone cellular dialer"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Dial</span>
                        </a>
                        <button
                          onClick={() => handleToggleNumberStatus(num)}
                          className="px-2 py-1 rounded bg-zinc-950 border border-zinc-800 hover:border-zinc-600 text-[11px] text-zinc-300 flex items-center gap-1 cursor-pointer"
                        >
                          {num.status === 'ONLINE' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                          <span>{num.status === 'ONLINE' ? 'Pause' : 'Resume'}</span>
                        </button>
                        <button
                          onClick={() => handleRotateNumber(num)}
                          className="px-2 py-1 rounded bg-zinc-950 border border-zinc-800 hover:border-zinc-600 text-[11px] text-amber-300 flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCw className="w-3 h-3" />
                          <span>Rotate</span>
                        </button>
                        <button
                          onClick={() => handleBurnNumber(num)}
                          className="px-2 py-1 rounded bg-zinc-950 border border-zinc-800 hover:border-red-700 text-[11px] text-red-400 flex items-center gap-1 cursor-pointer ml-auto"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Burn</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Middle Pane: SMS / Voice Feed + Composers */}
          <div className="lg:col-span-4 rounded-xl border border-zinc-800 bg-zinc-900/50 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-zinc-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
                <button
                  onClick={() => setStreamMode('sms')}
                  className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
                    streamMode === 'sms' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  SMS ({visibleMessages.length})
                </button>
                <button
                  onClick={() => setStreamMode('voice')}
                  className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
                    streamMode === 'voice' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Voice ({visibleCalls.length})
                </button>
              </div>
              <span className="text-[11px] font-mono text-zinc-400 truncate">
                {activeTargetNumber ? activeTargetNumber.displayNumber : 'No line selected'}
              </span>
            </div>

            {/* Stream List */}
            <div className="max-h-64 overflow-y-auto divide-y divide-zinc-800/70">
              {streamMode === 'sms' ? (
                visibleMessages.length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-500">
                    No SMS messages on this line yet. Send an outbound message or deliver a test verification SMS below.
                  </div>
                ) : (
                  visibleMessages.map(msg => {
                    const isSelected = selectedSms?.id === msg.id;
                    return (
                      <div
                        key={msg.id}
                        onClick={() => setSelectedSmsId(msg.id)}
                        className={`p-3 cursor-pointer transition-colors space-y-1 ${
                          isSelected ? 'bg-zinc-800/70' : 'hover:bg-zinc-800/30'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-medium text-zinc-100 truncate">
                            {msg.direction === 'INBOUND' ? `From ${msg.from}` : `To ${msg.to}`}
                          </span>
                          <span className="font-mono tabular-nums text-[11px] text-zinc-400 shrink-0">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 line-clamp-2">{msg.body}</p>
                        <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                          <span>{msg.direction === 'INBOUND' ? `On ${msg.e164}` : `Via ${msg.from}`}</span>
                          {msg.otpCode && <span className="text-emerald-400 font-semibold">OTP: {msg.otpCode}</span>}
                        </div>
                      </div>
                    );
                  })
                )
              ) : visibleCalls.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-500">
                  No voice sessions recorded yet.
                </div>
              ) : (
                visibleCalls.map(call => (
                  <div key={call.id} className="p-3 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-zinc-100">
                        {call.direction} · {call.remoteParty}
                      </span>
                      <span className="font-mono tabular-nums text-[11px] text-zinc-400">{call.durationSec}s</span>
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Line {call.e164} {call.dtmfDigits ? `· DTMF: ${call.dtmfDigits}` : ''}
                    </div>
                    {call.transcript && <p className="text-xs text-zinc-300">{call.transcript}</p>}
                  </div>
                ))
              )}
            </div>

            {/* Interactive Dispatch / Test Console */}
            <div className="border-t border-zinc-800 p-3 bg-zinc-950/60 space-y-3">
              <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setComposeTab('outbound')}
                  className={`flex-1 py-1.5 rounded text-[11px] font-medium cursor-pointer ${
                    composeTab === 'outbound' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400'
                  }`}
                >
                  Send SMS
                </button>
                <button
                  type="button"
                  onClick={() => setComposeTab('inbound-test')}
                  className={`flex-1 py-1.5 rounded text-[11px] font-medium cursor-pointer ${
                    composeTab === 'inbound-test' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400'
                  }`}
                >
                  Inbound / OTP Test
                </button>
                <button
                  type="button"
                  onClick={() => setComposeTab('call')}
                  className={`flex-1 py-1.5 rounded text-[11px] font-medium cursor-pointer ${
                    composeTab === 'call' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400'
                  }`}
                >
                  Voice / DTMF
                </button>
              </div>

              {composeTab === 'outbound' && (
                <form onSubmit={handleSendOutboundSms} className="space-y-2">
                  <input
                    type="text"
                    value={outboundTo}
                    onChange={(e) => setOutboundTo(e.target.value)}
                    placeholder="Recipient phone (e.g. another burner E.164)"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-100 placeholder-zinc-500"
                  />
                  <textarea
                    rows={2}
                    value={outboundBody}
                    onChange={(e) => setOutboundBody(e.target.value)}
                    placeholder="Type SMS payload..."
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 resize-none"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-1.5 text-[11px] text-zinc-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useTermuxBridge}
                        onChange={(e) => setUseTermuxBridge(e.target.checked)}
                        className="rounded border-zinc-700"
                      />
                      <span>Termux Hardware SMS</span>
                    </label>
                    <button
                      type="submit"
                      disabled={!activeTargetNumber || !outboundTo.trim() || !outboundBody.trim() || busyAction === 'outbound-sms'}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 text-xs font-semibold cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send SMS</span>
                    </button>
                  </div>
                </form>
              )}

              {composeTab === 'inbound-test' && (
                <form onSubmit={handleDeliverInboundTest} className="space-y-2">
                  <input
                    type="text"
                    value={testFrom}
                    onChange={(e) => setTestFrom(e.target.value)}
                    placeholder="Sender ID or number"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100"
                  />
                  <textarea
                    rows={2}
                    value={testBody}
                    onChange={(e) => setTestBody(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 resize-none"
                  />
                  <button
                    type="submit"
                    disabled={!activeTargetNumber || busyAction === 'inbound-sms'}
                    className="w-full px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold cursor-pointer"
                  >
                    Deliver Inbound SMS to Selected Line
                  </button>
                </form>
              )}

              {composeTab === 'call' && (
                <form onSubmit={handleLogVoiceCall} className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={callParty}
                      onChange={(e) => setCallParty(e.target.value)}
                      placeholder="Remote party (+1...)"
                      className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-zinc-100"
                    />
                    <select
                      value={callDirection}
                      onChange={(e) => setCallDirection(e.target.value as 'OUTBOUND' | 'INBOUND')}
                      className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100"
                    >
                      <option value="OUTBOUND">Outbound Call</option>
                      <option value="INBOUND">Inbound Call</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={callDtmf}
                      onChange={(e) => setCallDtmf(e.target.value)}
                      placeholder="DTMF digits (e.g. 1#42)"
                      className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-zinc-100"
                    />
                    <input
                      type="text"
                      value={callNotes}
                      onChange={(e) => setCallNotes(e.target.value)}
                      placeholder="Call note / transcript"
                      className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!activeTargetNumber || !callParty.trim() || busyAction === 'voice-call'}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 border border-zinc-700 text-xs font-medium text-zinc-100 cursor-pointer"
                  >
                    <PhoneCall className="w-3.5 h-3.5 text-amber-400" />
                    <span>Place / Log Voice Call</span>
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right Pane: Message Forensics, Webhook Forwarding & AI Triage */}
          <div className="lg:col-span-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-xs font-semibold text-zinc-200">Packet & Line Inspector</h3>
              {selectedSms && (
                <button
                  onClick={() => handleDeleteSms(selectedSms.id)}
                  className="text-xs text-red-400 hover:text-red-300 cursor-pointer"
                >
                  Delete SMS
                </button>
              )}
            </div>

            {selectedSms ? (
              <div className="space-y-3">
                <div className="text-xs space-y-1">
                  <div className="flex justify-between text-zinc-400">
                    <span>From: {selectedSms.from}</span>
                    <span className="font-mono">{selectedSms.direction}</span>
                  </div>
                  <div className="text-zinc-400 font-mono text-[11px]">
                    To: {selectedSms.to} {selectedSms.simIccid ? `· SIM ...${selectedSms.simIccid.slice(-6)}` : ''}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 leading-relaxed whitespace-pre-wrap">
                  {selectedSms.body}
                </div>

                {selectedSms.otpCode && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/50">
                    <div>
                      <div className="text-[11px] text-emerald-300">Extracted OTP</div>
                      <div className="font-mono tabular-nums text-sm font-semibold text-emerald-200">{selectedSms.otpCode}</div>
                    </div>
                    <button
                      onClick={() => copyValue('otp', selectedSms.otpCode!)}
                      className="px-2.5 py-1.5 rounded bg-emerald-900/60 hover:bg-emerald-800 text-xs text-emerald-100 cursor-pointer"
                    >
                      {copiedKey === 'otp' ? 'Copied' : 'Copy OTP'}
                    </button>
                  </div>
                )}

                {selectedSms.extractedUrls?.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs text-zinc-400">Detected Links</div>
                    {selectedSms.extractedUrls.map((url, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 text-xs bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5">
                        <span className="font-mono text-[11px] text-sky-300 truncate">{url}</span>
                        {onNavigateUrlInBrowser && (
                          <button
                            onClick={() => onNavigateUrlInBrowser(url)}
                            className="text-sky-400 hover:text-sky-200 shrink-0 cursor-pointer"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleAiTriage}
                    disabled={aiTriaging}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-xs text-amber-300 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{aiTriaging ? 'Analyzing...' : 'Analyze SMS'}</span>
                  </button>
                  {onInjectToChat && (
                    <button
                      onClick={() => onInjectToChat(
                        `Inspect this burner SMS received on ${selectedSms.to} from ${selectedSms.from}:\n"${selectedSms.body}"`
                      )}
                      className="px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-xs text-zinc-200 cursor-pointer"
                    >
                      Send to Chat
                    </button>
                  )}
                  {onSaveToVault && (
                    <button
                      onClick={() => onSaveToVault(
                        'dossier',
                        `SMS on ${selectedSms.to}`,
                        `From: ${selectedSms.from}\nTo: ${selectedSms.to}\nOTP: ${selectedSms.otpCode || 'None'}\n\n${selectedSms.body}`,
                        'infinite-sim-subsystem'
                      )}
                      className="px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-xs text-emerald-300 cursor-pointer"
                    >
                      Save to Vault
                    </button>
                  )}
                </div>

                {aiTriageResult && (
                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 whitespace-pre-wrap">
                    {aiTriageResult}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-500 text-center">
                Select an SMS packet from the stream to inspect OTPs, carrier routing, or run security analysis.
              </div>
            )}

            {/* Webhook Forwarding per Burner Number */}
            <div className="pt-3 border-t border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-zinc-300 flex items-center gap-1.5">
                  <Webhook className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Inbound Webhook Relay</span>
                </span>
                <span className="font-mono text-[11px] text-zinc-500">POST /api/sim/sms/incoming</span>
              </div>
              {selectedNumber ? (
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={webhookInput}
                    onChange={(e) => setWebhookInput(e.target.value)}
                    placeholder="https://your-endpoint.example/webhook"
                    className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600"
                  />
                  <button
                    onClick={handleSaveWebhook}
                    disabled={busyAction === 'save-webhook'}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-100 cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-zinc-500">
                  Select a specific burner number from the directory to configure HTTP webhook forwarding on incoming SMS.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
