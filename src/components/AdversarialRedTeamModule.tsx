/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Search,
  Plus,
  Trash2,
  Lock,
  Database,
  KeyRound,
  Package,
  FileCode2,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { apiFetch } from '../utils/authClient';

interface DefenseThreatRule {
  id: string;
  code: string;
  name: string;
  framework: 'MITRE ATT&CK' | 'OWASP Top 10' | 'Sovereign OS';
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  preventionControl: string;
  detectionProbe: string;
  lastStatus: 'DEFENDED' | 'WARNING' | 'ACTION_REQUIRED' | 'UNVERIFIED';
  lastEvidence: string;
  lastCheckedAt: string | null;
  isCustom?: boolean;
}

interface RouteAuditFinding {
  method: string;
  routePath: string;
  line: number;
  hasAdminGuard: boolean;
  hasCsrfGuard: boolean;
  risk: 'protected' | 'review' | 'elevated';
  note: string;
}

interface SecretScanFinding {
  file: string;
  line: number;
  patternName: string;
  redactedSnippet: string;
}

interface FirestoreInvariantCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

interface DependencyAdvisory {
  packageName: string;
  severity: 'critical' | 'high' | 'moderate' | 'low';
  title: string;
  advisoryId: string;
  recommendation: string;
}

interface LiveDefenseAuditReport {
  scanId: string;
  timestamp: string;
  durationMs: number;
  postureScore: number;
  postureGrade: 'A' | 'B' | 'C' | 'D';
  merkleRoot: string;
  totalFilesAudited: number;
  routeSummary: {
    totalRoutes: number;
    mutatingRoutes: number;
    adminGuardedRoutes: number;
    csrfGuardedRoutes: number;
    defaultDenyApiGuard: boolean;
    flaggedRoutes: RouteAuditFinding[];
  };
  secretScan: {
    filesScanned: number;
    findingsCount: number;
    findings: SecretScanFinding[];
  };
  firestoreChecks: FirestoreInvariantCheck[];
  dependencies: {
    status: 'ok' | 'advisories_found' | 'unavailable';
    totalAdvisories: number;
    advisories: DependencyAdvisory[];
  };
  authAndVault: {
    requireLoginOnBoot: boolean;
    systemLockdownMode: boolean;
    adminConfigured: boolean;
    totalUsers: number;
    activeSessions: number;
    vaultEncrypted: boolean;
    configuredSecrets: number;
  };
  threatRules: DefenseThreatRule[];
}

interface ScanHistoryEntry {
  scanId: string;
  timestamp: string;
  postureScore: number;
  postureGrade: string;
  merkleRoot: string;
  findingsCount: number;
}

type DefenseTab = 'matrix' | 'routes' | 'secrets-rules' | 'dependencies';

export const AdversarialRedTeamModule: React.FC = () => {
  const [report, setReport] = useState<LiveDefenseAuditReport | null>(null);
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
  const [activeTab, setActiveTab] = useState<DefenseTab>('matrix');
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DEFENDED' | 'WARNING' | 'ACTION_REQUIRED'>('ALL');
  const [showAddRule, setShowAddRule] = useState(false);

  const [newRuleCode, setNewRuleCode] = useState('SOS-CUSTOM');
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleFramework, setNewRuleFramework] = useState<'Sovereign OS' | 'OWASP Top 10' | 'MITRE ATT&CK'>('Sovereign OS');
  const [newRuleCategory, setNewRuleCategory] = useState('Defensive Hardening');
  const [newRuleSeverity, setNewRuleSeverity] = useState<'critical' | 'high' | 'medium' | 'low'>('medium');
  const [newRuleDescription, setNewRuleDescription] = useState('');
  const [newRuleControl, setNewRuleControl] = useState('');
  const [isSavingRule, setIsSavingRule] = useState(false);

  const loadAudit = async (force = false) => {
    setIsScanning(true);
    setErrorMsg(null);
    try {
      const res = await apiFetch(force ? '/api/defense/scan' : '/api/defense/audit', {
        method: force ? 'POST' : 'GET'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Audit request failed (HTTP ${res.status})`);
      }
      setReport(data.report);
      setHistory(Array.isArray(data.history) ? data.history : []);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to run live security audit.');
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    loadAudit(false);
  }, []);

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim()) return;
    setIsSavingRule(true);
    setErrorMsg(null);
    try {
      const res = await apiFetch('/api/defense/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newRuleCode,
          name: newRuleName,
          framework: newRuleFramework,
          category: newRuleCategory,
          severity: newRuleSeverity,
          description: newRuleDescription,
          preventionControl: newRuleControl
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Could not save rule.');
      setNewRuleName('');
      setNewRuleDescription('');
      setNewRuleControl('');
      setShowAddRule(false);
      await loadAudit(true);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save defensive rule.');
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const res = await apiFetch(`/api/defense/rules/${encodeURIComponent(ruleId)}`, { method: 'DELETE' });
      if (res.ok) await loadAudit(false);
    } catch {}
  };

  const filteredRules = useMemo(() => {
    const list = report?.threatRules || [];
    const q = searchQuery.trim().toLowerCase();
    return list.filter((r) => {
      if (statusFilter !== 'ALL' && r.lastStatus !== statusFilter) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.preventionControl.toLowerCase().includes(q)
      );
    });
  }, [report, searchQuery, statusFilter]);

  const defendedCount = (report?.threatRules || []).filter((r) => r.lastStatus === 'DEFENDED').length;
  const totalRules = report?.threatRules.length || 0;
  const firestorePassed = (report?.firestoreChecks || []).filter((c) => c.passed).length;

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-50 tracking-tight">
            Sovereign Cyber Defense & Threat-Intelligence Center
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span>Live workspace audit</span>
            <span aria-hidden="true">·</span>
            <span>Auth & route boundary scanner</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {report ? `Merkle ${report.merkleRoot.slice(0, 14)}…` : 'Loading baseline…'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddRule((v) => !v)}
            className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Defense Rule
          </button>
          <button
            onClick={() => loadAudit(true)}
            disabled={isScanning}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? 'Scanning Workspace…' : 'Run Security Audit'}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6 flex-1">
        {errorMsg && (
          <div className="p-3.5 rounded-lg bg-red-950/60 border border-red-800/70 text-red-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* KPI Row — Real Computed Telemetry */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="text-xs text-slate-400">Defensive Posture</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-semibold font-mono tabular-nums text-emerald-400">
                {report ? `${report.postureScore}/100` : '—'}
              </span>
              <span className="text-xs font-mono text-slate-400">
                {report ? `Grade ${report.postureGrade}` : ''}
              </span>
            </div>
            <div className="mt-1.5 text-xs text-slate-400 font-mono tabular-nums">
              {defendedCount}/{totalRules} controls verified
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="text-xs text-slate-400">API Auth Boundary</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-2xl font-semibold ${report?.routeSummary.defaultDenyApiGuard ? 'text-emerald-400' : 'text-amber-400'}`}>
                {report ? (report.routeSummary.defaultDenyApiGuard ? 'Default-Deny' : 'Partial') : '—'}
              </span>
            </div>
            <div className="mt-1.5 text-xs text-slate-400 font-mono tabular-nums">
              {report ? `${report.routeSummary.totalRoutes} routes · ${report.routeSummary.csrfGuardedRoutes} CSRF guarded` : 'Scanning server.ts…'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="text-xs text-slate-400">Secrets & Firestore Rules</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-2xl font-semibold font-mono tabular-nums ${(report?.secretScan.findingsCount || 0) === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {report ? `${report.secretScan.findingsCount} leaks` : '—'}
              </span>
            </div>
            <div className="mt-1.5 text-xs text-slate-400 font-mono tabular-nums">
              {report ? `${firestorePassed}/${report.firestoreChecks.length} Firestore invariants · ${report.secretScan.filesScanned} files` : 'Verifying rules…'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="text-xs text-slate-400">Dependency Advisories</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-2xl font-semibold font-mono tabular-nums ${(report?.dependencies.totalAdvisories || 0) === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {report ? report.dependencies.totalAdvisories : '—'}
              </span>
              <span className="text-xs text-slate-400">active</span>
            </div>
            <div className="mt-1.5 text-xs text-slate-400 font-mono tabular-nums">
              {report ? `Audit completed in ${report.durationMs}ms` : 'Running package audit…'}
            </div>
          </div>
        </div>

        {/* Custom Defensive Rule Form */}
        {showAddRule && (
          <form onSubmit={handleAddRule} className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-100">Author Custom Defensive Threat Rule</h2>
              <button
                type="button"
                onClick={() => setShowAddRule(false)}
                className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                value={newRuleCode}
                onChange={(e) => setNewRuleCode(e.target.value)}
                placeholder="Rule ID (e.g. SOS-12)"
                className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
              />
              <input
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
                placeholder="Control name (required)"
                required
                className="md:col-span-2 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
              <select
                value={newRuleSeverity}
                onChange={(e) => setNewRuleSeverity(e.target.value as any)}
                className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select
                value={newRuleFramework}
                onChange={(e) => setNewRuleFramework(e.target.value as any)}
                className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="Sovereign OS">Sovereign OS</option>
                <option value="OWASP Top 10">OWASP Top 10</option>
                <option value="MITRE ATT&CK">MITRE ATT&CK</option>
              </select>
              <input
                value={newRuleCategory}
                onChange={(e) => setNewRuleCategory(e.target.value)}
                placeholder="Category (e.g. Prompt Containment)"
                className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <textarea
                value={newRuleDescription}
                onChange={(e) => setNewRuleDescription(e.target.value)}
                rows={2}
                placeholder="What threat or failure mode does this defend against?"
                className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
              <textarea
                value={newRuleControl}
                onChange={(e) => setNewRuleControl(e.target.value)}
                rows={2}
                placeholder="Defensive prevention control & remediation playbook"
                className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSavingRule}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
              >
                {isSavingRule ? 'Saving to SQLite…' : 'Save Defensive Rule'}
              </button>
            </div>
          </form>
        )}

        {/* Segmented Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
            {[
              { id: 'matrix', label: 'Threat-Defense Matrix', icon: ShieldCheck },
              { id: 'routes', label: 'Route Auth Audit', icon: Lock },
              { id: 'secrets-rules', label: 'Secrets & Firestore', icon: Database },
              { id: 'dependencies', label: 'Dependencies & History', icon: Package }
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as DefenseTab)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active ? 'bg-slate-800 text-slate-50' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === 'matrix' && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter controls…"
                  className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 w-52"
                />
              </div>
              <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
                {(['ALL', 'DEFENDED', 'WARNING', 'ACTION_REQUIRED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      statusFilter === st ? 'bg-slate-800 text-slate-100 font-medium' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {st === 'ALL' ? 'All' : st === 'DEFENDED' ? 'Defended' : st === 'WARNING' ? 'Warning' : 'Action Needed'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* TAB 1: THREAT-DEFENSE KNOWLEDGE BASE */}
        {activeTab === 'matrix' && (
          <div className="rounded-xl bg-slate-900/60 border border-slate-800 divide-y divide-slate-800/80">
            {filteredRules.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No defensive controls match the current filter.
              </div>
            ) : (
              filteredRules.map((rule) => (
                <div key={rule.id} className="p-4 flex flex-col lg:flex-row lg:items-start justify-between gap-4 hover:bg-slate-900/90 transition-colors">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="font-mono text-slate-300">{rule.code}</span>
                      <span aria-hidden="true">·</span>
                      <span>{rule.framework}</span>
                      <span aria-hidden="true">·</span>
                      <span>{rule.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="capitalize">{rule.severity} priority</span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-100">{rule.name}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{rule.description}</p>
                    <div className="text-xs text-slate-300 pt-1">
                      <span className="text-slate-500">Prevention Control: </span>
                      {rule.preventionControl}
                    </div>
                    <div className="text-xs font-mono text-slate-400 pt-0.5">
                      Live Evidence: {rule.lastEvidence}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 lg:pt-1">
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      {rule.lastStatus === 'DEFENDED' ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400">Defended</span>
                        </>
                      ) : rule.lastStatus === 'ACTION_REQUIRED' ? (
                        <>
                          <ShieldAlert className="w-4 h-4 text-red-400" />
                          <span className="text-red-400">Action Required</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                          <span className="text-amber-400">{rule.lastStatus === 'WARNING' ? 'Warning' : 'Unverified'}</span>
                        </>
                      )}
                    </div>
                    {rule.isCustom && (
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        title="Delete custom rule"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: EXPRESS ROUTE AUTH AUDIT */}
        {activeTab === 'routes' && report && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="space-y-1">
                <div className="text-slate-100 font-medium">Server Auth & Vault Runtime Policy</div>
                <div className="text-slate-400 font-mono tabular-nums">
                  Boot Login: {report.authAndVault.requireLoginOnBoot ? 'ENFORCED' : 'OPTIONAL'} · Lockdown: {report.authAndVault.systemLockdownMode ? 'ACTIVE' : 'OFF'} · Users: {report.authAndVault.totalUsers} · Sessions: {report.authAndVault.activeSessions} · Vault Slots: {report.authAndVault.configuredSecrets}
                </div>
              </div>
              <div className="text-emerald-400 font-mono">
                {report.routeSummary.defaultDenyApiGuard ? 'Default-Deny /api Guard Verified' : 'Guard Hardening Needed'}
              </div>
            </div>

            <div className="rounded-xl bg-slate-900/60 border border-slate-800 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-3 px-4 font-medium">Method</th>
                    <th className="py-3 px-4 font-medium">Endpoint</th>
                    <th className="py-3 px-4 font-medium text-right">Line</th>
                    <th className="py-3 px-4 font-medium">CSRF</th>
                    <th className="py-3 px-4 font-medium">Audit Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {report.routeSummary.flaggedRoutes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 px-4 text-center text-slate-400">
                        No sensitive routes require additional review.
                      </td>
                    </tr>
                  ) : (
                    report.routeSummary.flaggedRoutes.map((r, idx) => (
                      <tr key={`${r.routePath}-${idx}`} className="hover:bg-slate-900/90">
                        <td className="py-2.5 px-4 font-mono text-amber-300">{r.method}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-200">{r.routePath}</td>
                        <td className="py-2.5 px-4 font-mono tabular-nums text-right text-slate-400">{r.line}</td>
                        <td className="py-2.5 px-4 font-mono text-emerald-400">{r.hasCsrfGuard ? 'Checked' : 'Review'}</td>
                        <td className="py-2.5 px-4 text-slate-400">{r.note}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: SECRETS & FIRESTORE INVARIANTS */}
        {activeTab === 'secrets-rules' && report && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl bg-slate-900/60 border border-slate-800 divide-y divide-slate-800/80">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                  <Database className="w-4 h-4 text-emerald-400" />
                  Firestore Rules Verification
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-400">
                  {firestorePassed}/{report.firestoreChecks.length} passed
                </span>
              </div>
              {report.firestoreChecks.map((chk) => (
                <div key={chk.id} className="p-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-medium text-slate-100">{chk.label}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{chk.detail}</div>
                  </div>
                  <span className={`text-xs font-medium shrink-0 ${chk.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                    {chk.passed ? 'Pass' : 'Fail'}
                  </span>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-slate-900/60 border border-slate-800 divide-y divide-slate-800/80">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                  <KeyRound className="w-4 h-4 text-emerald-400" />
                  Workspace Credential Leak Scanner
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-400">
                  {report.secretScan.filesScanned} files scanned
                </span>
              </div>
              {report.secretScan.findings.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                  <div className="text-sm font-medium text-slate-100">Zero Hardcoded Secrets Detected</div>
                  <div className="text-xs text-slate-400">
                    All {report.secretScan.filesScanned} workspace source files passed credential pattern verification.
                  </div>
                </div>
              ) : (
                report.secretScan.findings.map((f, idx) => (
                  <div key={`${f.file}-${f.line}-${idx}`} className="p-4 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-red-300 flex items-center gap-1.5">
                        <FileCode2 className="w-3.5 h-3.5" />
                        {f.file}:{f.line}
                      </span>
                      <span className="text-amber-300">{f.patternName}</span>
                    </div>
                    <div className="text-xs font-mono text-slate-400">Matched (redacted): {f.redactedSnippet}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: DEPENDENCIES & AUDIT HISTORY */}
        {activeTab === 'dependencies' && report && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl bg-slate-900/60 border border-slate-800 divide-y divide-slate-800/80">
              <div className="p-4 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-100">Installed Package Advisories</div>
                <span className="text-xs font-mono tabular-nums text-slate-400">
                  {report.dependencies.totalAdvisories} advisory items
                </span>
              </div>
              {report.dependencies.advisories.length === 0 ? (
                <div className="p-6 text-xs text-slate-400">
                  {report.dependencies.status === 'unavailable'
                    ? 'Audit CLI was unavailable in this runtime environment.'
                    : 'No active package security advisories detected.'}
                </div>
              ) : (
                report.dependencies.advisories.map((adv, idx) => (
                  <div key={`${adv.packageName}-${idx}`} className="p-4 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-semibold text-slate-100">{adv.packageName}</span>
                      <span
                        className={`font-mono uppercase ${
                          adv.severity === 'critical' || adv.severity === 'high'
                            ? 'text-red-400'
                            : adv.severity === 'moderate'
                            ? 'text-amber-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {adv.severity} · {adv.advisoryId}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300">{adv.title}</div>
                    <div className="text-xs text-slate-400">{adv.recommendation}</div>
                  </div>
                ))
              )}
            </div>

            <div className="rounded-xl bg-slate-900/60 border border-slate-800 divide-y divide-slate-800/80">
              <div className="p-4 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-100">Persisted Security Audit Ledger</div>
                <span className="text-xs font-mono tabular-nums text-slate-400">{history.length} runs</span>
              </div>
              {history.length === 0 ? (
                <div className="p-6 text-xs text-slate-400">Run a scan to record history in SQLite.</div>
              ) : (
                history.map((h) => (
                  <div key={h.scanId} className="p-3.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-mono text-slate-200">{h.scanId} · Grade {h.postureGrade} ({h.postureScore}/100)</div>
                      <div className="text-slate-500 font-mono mt-0.5">
                        {new Date(h.timestamp).toLocaleString()} · Merkle {h.merkleRoot.slice(0, 12)}…
                      </div>
                    </div>
                    <div className="font-mono tabular-nums text-slate-400">{h.findingsCount} items</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
