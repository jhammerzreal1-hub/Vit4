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

import React, { useState, useEffect, useMemo } from 'react';
import {
  Key,
  ShieldCheck,
  Server,
  Zap,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Terminal,
  Lock,
  Send,
  Copy,
  Check,
  Shield,
  Plus,
  Trash2,
  Edit3,
  EyeOff,
  X
} from 'lucide-react';
import { apiFetch } from '../utils/authClient';

interface SecretRecord {
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
  updatedAt?: string | null;
  proxyEndpoint: string;
  description: string;
}

interface VaultTelemetry {
  algorithm: string;
  vaultFileExists: boolean;
  masterKeyProtected: boolean;
  totalTracked: number;
  configuredCount: number;
  vaultStoredCount: number;
  envInjectedCount: number;
}

export const ApiSecretsModule: React.FC = () => {
  const [secrets, setSecrets] = useState<SecretRecord[]>([]);
  const [vaultInfo, setVaultInfo] = useState<VaultTelemetry | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [pingResults, setPingResults] = useState<Record<string, { ok: boolean; latencyMs: number; message: string }>>({});
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);
  const [testingAll, setTestingAll] = useState<boolean>(false);

  // Inline Edit / Inject Secret state
  const [editingEnvVar, setEditingEnvVar] = useState<string | null>(null);
  const [secretInput, setSecretInput] = useState<string>('');
  const [savingEnvVar, setSavingEnvVar] = useState<string | null>(null);
  const [confirmDeleteEnvVar, setConfirmDeleteEnvVar] = useState<string | null>(null);

  // Add Custom Secret modal
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newEnvVar, setNewEnvVar] = useState<string>('');
  const [newValue, setNewValue] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('Custom Integration');
  const [newDescription, setNewDescription] = useState<string>('');

  // Proxy Workbench State
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('/api/health');
  const [testMethod, setTestMethod] = useState<'GET' | 'POST'>('GET');
  const [testPayload, setTestPayload] = useState<string>('{\n  "prompt": "ping"\n}');
  const [bearerToken, setBearerToken] = useState<string>('');
  const [testResponse, setTestResponse] = useState<any>(null);
  const [testLoading, setTestLoading] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const fetchSecrets = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiFetch('/api/secrets');
      if (!res.ok) {
        throw new Error(`Secrets vault endpoint returned HTTP ${res.status}`);
      }
      const data = await res.json();
      const list = data?.secrets || data?.keys;
      if (data && Array.isArray(list)) {
        setSecrets(list);
        setVaultInfo(data.vault || null);
      } else {
        throw new Error('Malformed telemetry payload from /api/secrets');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to reach server secrets handler');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecrets();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>(['ALL']);
    secrets.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set);
  }, [secrets]);

  const filteredSecrets = useMemo(() => {
    if (activeCategory === 'ALL') return secrets;
    return secrets.filter((s) => s.category === activeCategory);
  }, [secrets, activeCategory]);

  const handleSaveSecret = async (envVar: string, value: string, meta?: { name?: string; category?: string; description?: string }) => {
    if (!envVar.trim() || !value.trim()) {
      setErrorMsg('Secret name and value are both required.');
      return;
    }
    setSavingEnvVar(envVar);
    setErrorMsg(null);
    try {
      const res = await apiFetch('/api/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          envVar: envVar.trim(),
          value,
          name: meta?.name,
          category: meta?.category,
          description: meta?.description
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      await fetchSecrets();
      setEditingEnvVar(null);
      setSecretInput('');
      setShowAddModal(false);
      setNewEnvVar('');
      setNewValue('');
      setNewName('');
      setNewDescription('');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to store secret in AES-256-GCM vault');
    } finally {
      setSavingEnvVar(null);
    }
  };

  const handleDeleteSecret = async (envVar: string) => {
    setSavingEnvVar(envVar);
    setErrorMsg(null);
    try {
      const res = await apiFetch(`/api/secrets/${encodeURIComponent(envVar)}`, {
        method: 'DELETE'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setConfirmDeleteEnvVar(null);
      await fetchSecrets();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to purge secret');
    } finally {
      setSavingEnvVar(null);
    }
  };

  const handleTestKeyEndpoint = async (item: SecretRecord) => {
    setTestingKeyId(item.id);
    const t0 = performance.now();
    try {
      const isPost = item.proxyEndpoint.includes('/chat') || item.proxyEndpoint.includes('/generate');
      const res = await apiFetch(item.proxyEndpoint, {
        method: isPost ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: isPost ? JSON.stringify({ prompt: 'ping', zeroTokenMode: false }) : undefined
      });
      const latencyMs = Math.round(performance.now() - t0);
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setPingResults((prev) => ({
          ...prev,
          [item.id]: {
            ok: true,
            latencyMs,
            message: `Handshake Verified (${latencyMs}ms) · ${data?.provider || data?.model || data?.status || 'Online'}`
          }
        }));
      } else {
        setPingResults((prev) => ({
          ...prev,
          [item.id]: { ok: false, latencyMs, message: `Proxy Responded HTTP ${res.status}` }
        }));
      }
    } catch (e: any) {
      setPingResults((prev) => ({
        ...prev,
        [item.id]: { ok: false, latencyMs: Math.round(performance.now() - t0), message: e?.message || 'Network error' }
      }));
    } finally {
      setTestingKeyId(null);
    }
  };

  const handleTestAllConnections = async () => {
    setTestingAll(true);
    for (const item of secrets) {
      await handleTestKeyEndpoint(item);
    }
    setTestingAll(false);
  };

  const handleRunProxyTest = async () => {
    setTestLoading(true);
    const t0 = performance.now();
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (bearerToken.trim()) {
        headers['Authorization'] = `Bearer ${bearerToken.trim()}`;
      }

      const options: RequestInit = { method: testMethod, headers };
      if (testMethod === 'POST' && testPayload.trim()) {
        options.body = testPayload.trim();
      }

      const res = await apiFetch(selectedEndpoint, options);
      const data = await res.json().catch(() => ({ status: res.status, text: 'Non-JSON response' }));
      setTestResponse({
        httpStatus: res.status,
        ok: res.ok,
        elapsedMs: Math.round(performance.now() - t0),
        data
      });
    } catch (err: any) {
      setTestResponse({
        httpStatus: 0,
        ok: false,
        elapsedMs: Math.round(performance.now() - t0),
        error: err?.message || 'Proxy dispatch error'
      });
    } finally {
      setTestLoading(false);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto p-4 sm:p-6 gap-6 font-mono overflow-y-auto">
      {/* Header Banner */}
      <div className="bg-zinc-900/60 border border-amber-500/30 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-emerald-500 to-sky-500" />
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
          <Lock className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>
        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-100">Internal Secrets Handler &amp; Vault</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              {vaultInfo?.algorithm?.toUpperCase() || 'AES-256-GCM'} SEALED
            </span>
          </div>
          <p className="text-zinc-400 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Every secret in <code className="text-amber-300">.env.example</code> and custom environment keys is encrypted at rest with AES-256-GCM, dynamically masked via deterministic fingerprints, and automatically redacted from agent file reads, terminal output, archives, and LLM responses.
          </p>
          {vaultInfo && (
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-[11px] text-zinc-400 pt-1">
              <span>Configured: <strong className="text-emerald-300">{vaultInfo.configuredCount}</strong> / {vaultInfo.totalTracked}</span>
              <span>·</span>
              <span>Vault Encrypted: <strong className="text-cyan-300">{vaultInfo.vaultStoredCount}</strong></span>
              <span>·</span>
              <span>Master Key: <strong className={vaultInfo.masterKeyProtected ? 'text-emerald-300' : 'text-amber-300'}>{vaultInfo.masterKeyProtected ? 'ACTIVE (0600)' : 'INITIALIZING'}</strong></span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-center sm:justify-end">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Secret</span>
          </button>
          <button
            onClick={handleTestAllConnections}
            disabled={testingAll || secrets.length === 0}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            <Zap className={`w-4 h-4 ${testingAll ? 'animate-bounce' : ''}`} />
            <span>{testingAll ? 'Testing...' : 'Verify Endpoints'}</span>
          </button>
          <button
            onClick={fetchSecrets}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-zinc-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            {errorMsg}
          </span>
          <button onClick={() => setErrorMsg(null)} className="text-zinc-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Category Filter + Grid of Secrets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <Server className="w-4 h-4 text-amber-400" />
            Tracked Environment &amp; Vault Secrets ({filteredSecrets.length})
          </h3>
          <div className="flex items-center gap-1.5 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSecrets.map((item) => {
            const result = pingResults[item.id];
            const isTesting = testingKeyId === item.id;
            const isEditing = editingEnvVar === item.envVar;
            const isSaving = savingEnvVar === item.envVar;

            return (
              <div
                key={item.envVar}
                className="bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-zinc-100 text-sm">{item.name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                          {item.category}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-amber-400/90 mt-0.5 break-all">
                        {item.envVar}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                        item.source === 'vault'
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                          : item.source === 'env'
                          ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                      }`}
                    >
                      {item.source === 'vault' ? 'VAULT_ENCRYPTED' : item.source === 'env' ? 'ENV_RUNTIME' : 'UNSET'}
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-400 leading-relaxed">{item.description}</p>

                  <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800/80 space-y-1.5 text-[10px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-500 font-bold uppercase flex items-center gap-1">
                        <EyeOff className="w-3 h-3" /> Dynamic Mask:
                      </span>
                      <span className={item.source === 'unset' ? 'text-zinc-500' : 'text-emerald-400 font-bold tracking-wider'}>
                        {item.maskedValue}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-500 font-bold uppercase">Fingerprint:</span>
                      <span className="text-zinc-400">
                        {item.fingerprint ? `${item.fingerprint} (${item.length} chars)` : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-500 font-bold uppercase">Proxy Route:</span>
                      <span className="text-cyan-300 font-bold">{item.proxyEndpoint}</span>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="p-3 rounded-xl bg-zinc-950 border border-amber-500/40 space-y-2">
                      <label className="text-[10px] text-amber-300 font-bold block">
                        Enter secret value for {item.envVar} (encrypted via AES-256-GCM):
                      </label>
                      <input
                        type="password"
                        value={secretInput}
                        onChange={(e) => setSecretInput(e.target.value)}
                        placeholder={`Paste new ${item.envVar} value...`}
                        autoComplete="off"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSaveSecret(item.envVar, secretInput)}
                          disabled={isSaving || !secretInput.trim()}
                          className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-[11px] font-bold disabled:opacity-50 cursor-pointer"
                        >
                          {isSaving ? 'Encrypting...' : 'Encrypt & Store'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingEnvVar(null);
                            setSecretInput('');
                          }}
                          className="px-3 py-1 rounded-lg bg-zinc-800 text-zinc-300 text-[11px] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {confirmDeleteEnvVar === item.envVar && (
                    <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 space-y-2 text-[11px]">
                      <div className="text-rose-200 font-bold">
                        Purge {item.envVar} from the encrypted vault and runtime environment?
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDeleteSecret(item.envVar)}
                          disabled={isSaving}
                          className="px-3 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold cursor-pointer disabled:opacity-50"
                        >
                          {isSaving ? 'Purging...' : 'Confirm Purge'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteEnvVar(null)}
                          className="px-3 py-1 rounded-lg bg-zinc-800 text-zinc-300 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {result && (
                    <div
                      className={`p-2 rounded-xl text-[10px] font-bold flex items-center gap-2 ${
                        result.ok
                          ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
                          : 'bg-rose-950/40 border border-rose-500/30 text-rose-300'
                      }`}
                    >
                      {result.ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                      <span>{result.message}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setEditingEnvVar(isEditing ? null : item.envVar);
                        setSecretInput('');
                        setConfirmDeleteEnvVar(null);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3 text-amber-400" />
                      <span>{item.source === 'unset' ? 'Set Secret' : 'Rotate'}</span>
                    </button>
                    {item.source !== 'unset' && (
                      <button
                        onClick={() => {
                          setConfirmDeleteEnvVar(item.envVar);
                          setEditingEnvVar(null);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-rose-950/50 text-rose-300 border border-zinc-800 hover:border-rose-500/40 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                        title="Purge Secret"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleTestKeyEndpoint(item)}
                    disabled={isTesting}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin text-amber-400' : ''}`} />
                    <span>{isTesting ? 'Testing...' : 'Test Proxy'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Custom Secret Modal */}
      {showAddModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddModal(false);
          }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
        >
          <div className="bg-zinc-950 border border-amber-500/40 rounded-3xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm min-w-0">
                <Key className="w-4 h-4 shrink-0" />
                <span className="truncate">Store New Secret in AES-256-GCM Vault</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                aria-label="Close Add Secret Modal"
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-zinc-400 font-bold uppercase block mb-1">Environment Variable Name *</label>
                <input
                  type="text"
                  value={newEnvVar}
                  onChange={(e) => setNewEnvVar(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                  placeholder="e.g. STRIPE_SECRET_KEY"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 font-bold uppercase block mb-1">Secret Value *</label>
                <input
                  type="password"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="Paste secret token or key..."
                  autoComplete="off"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 font-bold uppercase block mb-1">Display Label</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Optional label"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 font-bold uppercase block mb-1">Category</label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 font-bold uppercase block mb-1">Description</label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="What service uses this secret?"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  handleSaveSecret(newEnvVar, newValue, {
                    name: newName || newEnvVar,
                    category: newCategory,
                    description: newDescription
                  })
                }
                disabled={!newEnvVar.trim() || !newValue.trim() || savingEnvVar === newEnvVar}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold disabled:opacity-50 cursor-pointer"
              >
                Encrypt &amp; Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proxy Route Workbench */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-zinc-100">Server Proxy Route Workbench</h3>
          </div>
          <span className="text-[10px] text-zinc-500 font-bold">
            Test backend `/api/*` endpoints directly
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1 block">HTTP Method</label>
            <select
              value={testMethod}
              onChange={(e) => setTestMethod(e.target.value as 'GET' | 'POST')}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1 block">Proxy Endpoint</label>
            <select
              value={selectedEndpoint}
              onChange={(e) => {
                const ep = e.target.value;
                setSelectedEndpoint(ep);
                if (ep.includes('/chat') || ep.includes('/completions') || ep.includes('/rotate')) {
                  setTestMethod('POST');
                  if (ep.includes('/v1/chat/completions')) {
                    setTestPayload('{\n  "model": "auto",\n  "messages": [{ "role": "user", "content": "ping" }]\n}');
                  } else if (ep.includes('/rotate')) {
                    setTestPayload('{\n  "action": "step"\n}');
                  }
                } else if (ep.includes('/status') || ep.includes('/health') || ep.includes('/providers') || ep.includes('/tags') || ep.includes('/secrets') || ep.includes('/v1/models')) {
                  setTestMethod('GET');
                }
              }}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
            >
              <option value="/api/secrets">/api/secrets (Encrypted Secrets Telemetry)</option>
              <option value="/api/proxy-wheel/status">/api/proxy-wheel/status (Proxy Loop Wheel Telemetry)</option>
              <option value="/api/proxy-wheel/rotate">/api/proxy-wheel/rotate (Step / Reset Wheel Spokes)</option>
              <option value="/api/v1/chat/completions">/api/v1/chat/completions (OpenAI-Compat Dev Proxy Wheel)</option>
              <option value="/api/v1/models">/api/v1/models (Wheel Capable Model Catalog)</option>
              <option value="/api/health">/api/health (Server Status)</option>
              <option value="/api/keys/status">/api/keys/status (Compatibility Key Telemetry)</option>
              <option value="/api/llm/providers">/api/llm/providers (All LLM Providers &amp; Models)</option>
              <option value="/api/gemini/chat">/api/gemini/chat (Google Gemini API)</option>
              <option value="/api/deepseek/chat">/api/deepseek/chat (DeepSeek Native API)</option>
              <option value="/api/groq/chat">/api/groq/chat (Groq LPU Acceleration)</option>
              <option value="/api/openrouter/chat">/api/openrouter/chat (OpenRouter MoE Matrix)</option>
              <option value="/api/ollama/chat">/api/ollama/chat (Ollama Offline Substrate)</option>
              <option value="/api/chat">/api/chat (Universal Multi-Model AI Proxy)</option>
              <option value="/api/github/status">/api/github/status (GitHub Telemetry)</option>
              <option value="/api/system/health">/api/system/health (Hardware Telemetry)</option>
              <option value="/api/tags">/api/tags (Local Ollama Models)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1 block">Optional Bearer Token Header</label>
          <input
            type="text"
            value={bearerToken}
            onChange={(e) => setBearerToken(e.target.value)}
            placeholder="e.g. OAuth Bearer token or custom session token"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        {testMethod === 'POST' && (
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1 block">POST Body (JSON)</label>
            <textarea
              value={testPayload}
              onChange={(e) => setTestPayload(e.target.value)}
              rows={3}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-amber-200 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>
        )}

        <button
          onClick={handleRunProxyTest}
          disabled={testLoading}
          className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-amber-500/20 active:scale-98 disabled:opacity-50 cursor-pointer"
        >
          <Send className={`w-3.5 h-3.5 ${testLoading ? 'animate-spin' : ''}`} />
          <span>{testLoading ? 'Dispatching Test...' : 'Dispatch Endpoint Test'}</span>
        </button>

        {testResponse && (
          <div className="bg-black/80 border border-zinc-800 rounded-2xl p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-zinc-400 font-bold">RESPONSE OUTPUT</span>
              <span className={`font-bold ${testResponse.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                HTTP {testResponse.httpStatus} ({testResponse.elapsedMs}ms)
              </span>
            </div>
            <pre className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] text-emerald-300 font-mono overflow-x-auto max-h-48 whitespace-pre-wrap">
              {JSON.stringify(testResponse.data || testResponse.error, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Vault Security Architecture */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-100">
          <Shield className="w-4 h-4 text-emerald-400" />
          Internal AES-256-GCM Secrets Handler Architecture
        </h3>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Secrets stored via the UI or <code className="text-amber-300">.env</code> are encrypted on disk at <code className="text-amber-300">data/.secrets.vault.enc</code> using an auto-provisioned 256-bit key (<code className="text-amber-300">data/.vault.key</code>, mode <code className="text-amber-300">0600</code>). Browser clients only receive dynamic masks and SHA-256 fingerprints, never plaintext secret material.
        </p>
        <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 font-mono text-[11px] text-amber-300/90 flex items-center justify-between overflow-x-auto">
          <span>POST /api/secrets &#123; "envVar": "GEMINI_API_KEY", "value": "..." &#125;</span>
          <button
            onClick={() => handleCopyText('POST /api/secrets { "envVar": "GEMINI_API_KEY", "value": "..." }', 'env-sample')}
            className="text-[10px] text-zinc-400 hover:text-amber-300 flex items-center gap-1 shrink-0 ml-3 cursor-pointer"
          >
            {copiedText === 'env-sample' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>Copy</span>
          </button>
        </div>
      </div>
    </div>
  );
};
