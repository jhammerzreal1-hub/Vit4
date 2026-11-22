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

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Search,
  FileText,
  ExternalLink,
  Copy,
  Check,
  Download,
  HardDrive,
  RefreshCw,
  ShieldCheck,
  Award,
  UserCheck,
  AlertTriangle
} from 'lucide-react';

type GrantCategory =
  | 'ALL'
  | 'ELIGIBILITY_FAST_TRACK'
  | 'CRYPTO_AGENTIC_NON_DILUTIVE'
  | 'OPENSOURCE_PUBLIC_GOODS'
  | 'FEDERAL_RESEARCH_GRANTS'
  | 'CLOUD_COMPUTE_CREDITS'
  | 'MICRO_GRANTS_FOUNDATIONS';

interface NonReciprocalGrantOpportunity {
  id: string;
  title: string;
  sponsor: string;
  category: Exclude<GrantCategory, 'ALL' | 'ELIGIBILITY_FAST_TRACK'>;
  awardRange: string;
  payoutMedium: 'CRYPTO_USDC_ETH_SOL' | 'USD_FIAT_GRANT' | 'CLOUD_COMPUTE_CREDITS';
  nonReciprocalTerms: string;
  approvalType: 'ELIGIBILITY_BASED' | 'MERIT_REVIEW' | 'RETROACTIVE_BUILDERS' | 'FEDERAL_COMPETITIVE';
  deadline: string;
  eligibilitySummary: string;
  applicationUrl: string;
  source: 'VERIFIED_CURATED' | 'GRANTS_GOV_LIVE_API' | 'GEMINI_LIVE_WEB_SEARCH';
  discoveredAt: string;
  matchScore: number;
}

interface GrantApplicantProfile {
  applicantName: string;
  organizationName: string;
  email: string;
  website: string;
  githubUrl: string;
  zenodoDoi: string;
  orcid: string;
  projectTitle: string;
  projectSummary: string;
  requestedUseOfFunds: string;
}

interface GeneratedGrantApplication {
  id: string;
  grantId: string;
  grantTitle: string;
  sponsor: string;
  applicationUrl: string;
  awardRange: string;
  payoutMedium: string;
  status: 'DRAFT_READY' | 'REVIEWED' | 'SUBMITTED' | 'AWARDED';
  createdAt: string;
  updatedAt: string;
  modelUsed: string;
  receivingWalletAddresses: {
    ethereumEip55: string;
    bitcoinSegwit: string;
    solanaBase58: string;
  };
  markdownPacket: string;
  groundingSources: Array<{ title: string; uri: string }>;
}

interface GrantsState {
  profile: GrantApplicantProfile;
  opportunities: NonReciprocalGrantOpportunity[];
  applications: GeneratedGrantApplication[];
  lastAutonomousScanAt: string;
  lastScanSummary: string;
  autoScanEnabled: boolean;
}

export const AutonomousGrantEnginePanel: React.FC = () => {
  const [state, setState] = useState<GrantsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [hunting, setHunting] = useState(false);
  const [focusQuery, setFocusQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<GrantCategory>('ALL');
  const [draftingGrantId, setDraftingGrantId] = useState<string | null>(null);
  const [batchDrafting, setBatchDrafting] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [profileForm, setProfileForm] = useState<GrantApplicantProfile | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const loadState = useCallback(async () => {
    try {
      const res = await fetch('/api/grants/state');
      const data = await res.json();
      if (data?.success && data.state) {
        setState(data.state);
        setProfileForm((prev) => prev || data.state.profile);
        if (!selectedAppId && data.state.applications?.length > 0) {
          setSelectedAppId(data.state.applications[0].id);
        }
      }
    } catch (err: any) {
      setNotice({ type: 'error', text: `Failed to load grants engine: ${err?.message}` });
    } finally {
      setLoading(false);
    }
  }, [selectedAppId]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const handleHuntLiveGrants = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setHunting(true);
    setNotice({
      type: 'info',
      text: 'Autonomously querying live Grants.gov Federal API + Google Search Grounding for open 0%-equity non-reciprocal grants...'
    });
    try {
      const res = await fetch('/api/grants/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ focusQuery: focusQuery.trim() || undefined })
      });
      const data = await res.json();
      if (data?.success && data.state) {
        setState(data.state);
        const baseSummary = `Discovery complete: ${data.state.opportunities.length} non-reciprocal grants indexed (${data.grantsGovCount} from Grants.gov API, ${data.liveWebSearchCount} from live Google Search, ${data.discoveredNewCount} new).`;
        setNotice({
          type: data.webSearchWarning ? 'info' : 'success',
          text: data.webSearchWarning ? `${baseSummary} Note: ${data.webSearchWarning}` : baseSummary
        });
      } else {
        setNotice({ type: 'error', text: data?.error || 'Live grant discovery returned an error.' });
      }
    } catch (err: any) {
      setNotice({ type: 'error', text: `Grant hunt failed: ${err?.message}` });
    } finally {
      setHunting(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm) return;
    try {
      const res = await fetch('/api/grants/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm)
      });
      const data = await res.json();
      if (data?.success) {
        setState((prev) => (prev ? { ...prev, profile: data.profile } : prev));
        setShowProfileEditor(false);
        setNotice({ type: 'success', text: 'Applicant & project provenance profile saved for all future grant applications.' });
      }
    } catch (err: any) {
      setNotice({ type: 'error', text: `Profile save failed: ${err?.message}` });
    }
  };

  const handleDraftApplication = async (grantId: string) => {
    setDraftingGrantId(grantId);
    setNotice({
      type: 'info',
      text: 'Generating tailored submission-ready non-reciprocal grant application packet with real mainnet payout addresses...'
    });
    try {
      const res = await fetch('/api/grants/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grantId })
      });
      const data = await res.json();
      if (data?.success && data.application) {
        if (data.state) setState(data.state);
        setSelectedAppId(data.application.id);
        setNotice({
          type: 'success',
          text: `Generated complete grant application packet for "${data.application.grantTitle}" — ready to copy, download, or save to Desktop.`
        });
      } else {
        setNotice({ type: 'error', text: data?.error || 'Could not draft grant application.' });
      }
    } catch (err: any) {
      setNotice({ type: 'error', text: `Draft failed: ${err?.message}` });
    } finally {
      setDraftingGrantId(null);
    }
  };

  const handleCreateProvenanceTemplate = async (grantId: string) => {
    setDraftingGrantId(grantId);
    try {
      const res = await fetch('/api/grants/template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grantId })
      });
      const data = await res.json();
      if (data?.success && data.application) {
        if (data.state) setState(data.state);
        setSelectedAppId(data.application.id);
        setNotice({
          type: 'success',
          text: `Built structured Provenance & Payout Cover Sheet (No AI) for "${data.application.grantTitle}" — ready to copy, download, or save to Desktop.`
        });
      } else {
        setNotice({ type: 'error', text: data?.error || 'Could not create provenance cover sheet.' });
      }
    } catch (err: any) {
      setNotice({ type: 'error', text: `Cover sheet error: ${err?.message}` });
    } finally {
      setDraftingGrantId(null);
    }
  };

  const handleBatchDraftTop3 = async () => {
    if (!state) return;
    const undrafted = filteredOpportunities
      .filter((g) => !state.applications.some((a) => a.grantId === g.id))
      .slice(0, 3);
    if (undrafted.length === 0) {
      setNotice({ type: 'info', text: 'Top grants in this filter already have generated application packets.' });
      return;
    }
    setBatchDrafting(true);
    let created = 0;
    let lastError = '';
    for (const g of undrafted) {
      setDraftingGrantId(g.id);
      try {
        const res = await fetch('/api/grants/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ grantId: g.id })
        });
        const data = await res.json();
        if (data?.success && data.application) {
          created += 1;
          if (data.state) setState(data.state);
          setSelectedAppId(data.application.id);
        } else {
          lastError = data?.error || 'Unable to generate AI grant packet.';
          if (res.status === 429 || res.status === 403 || res.status === 503) {
            break;
          }
        }
      } catch (err: any) {
        lastError = err?.message || 'Network error during batch draft.';
      }
    }
    setDraftingGrantId(null);
    setBatchDrafting(false);
    setNotice({
      type: created > 0 ? 'success' : 'error',
      text:
        created > 0
          ? `Autonomously drafted ${created} tailored non-reciprocal grant application packets.`
          : lastError || 'Could not generate batch drafts; check Settings > Secrets for your GEMINI_API_KEY.'
    });
  };

  const handleStatusChange = async (applicationId: string, status: GeneratedGrantApplication['status']) => {
    try {
      const res = await fetch('/api/grants/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, status })
      });
      const data = await res.json();
      if (data?.success && data.state) setState(data.state);
    } catch {}
  };

  const handleExportToDesktop = async (applicationId: string) => {
    try {
      const res = await fetch('/api/grants/export-desktop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId })
      });
      const data = await res.json();
      if (data?.success) {
        setNotice({ type: 'success', text: `Saved grant application directly to Desktop: ${data.filePath}` });
      } else {
        setNotice({ type: 'error', text: data?.error || 'Export failed.' });
      }
    } catch (err: any) {
      setNotice({ type: 'error', text: `Export error: ${err?.message}` });
    }
  };

  const handleDownloadMarkdown = (app: GeneratedGrantApplication) => {
    const blob = new Blob([app.markdownPacket], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Grant_Application_${app.grantTitle.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 42)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyPacket = (app: GeneratedGrantApplication) => {
    navigator.clipboard?.writeText(app.markdownPacket).catch(() => {});
    setCopiedId(app.id);
    setTimeout(() => setCopiedId(null), 2200);
  };

  const opportunities = state?.opportunities || [];
  const filteredOpportunities = opportunities.filter((g) => {
    if (categoryFilter === 'ALL') return true;
    if (categoryFilter === 'ELIGIBILITY_FAST_TRACK') return g.approvalType === 'ELIGIBILITY_BASED';
    return g.category === categoryFilter;
  });

  const activeApplication =
    state?.applications.find((a) => a.id === selectedAppId) || state?.applications[0] || null;

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-zinc-400 font-mono">
        Initializing Autonomous Non-Reciprocal Grant Hunter &amp; Application Engine...
      </div>
    );
  }

  return (
    <div className="space-y-5 font-mono">
      {/* Header & Live Autonomous Hunter Bar */}
      <div className="rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-emerald-500/35 p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Award className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-black text-emerald-300">
                AUTONOMOUS NON-RECIPROCAL GRANT HUNTER &amp; APPLICATION ENGINE
              </h2>
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-[10px] font-bold">
                0% EQUITY · NON-REPAYABLE · NON-DILUTIVE ONLY
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 max-w-3xl">
              Autonomously discovers live non-reciprocal funding via <strong className="text-zinc-200">Grants.gov Federal API</strong> + <strong className="text-zinc-200">Live Google Search Grounding</strong>, then drafts complete submission-ready applications pre-filled with your real Agentic Treasury payout addresses, GitHub, Zenodo DOI, and ORCID.
            </p>
            <p className="text-[10px] text-amber-300/90">
              Note: Non-reciprocal grants never require repayment or equity. High-approval <strong>Eligibility-Based</strong> programs (Microsoft Founders Hub, Google Cloud Start, AWS Activate) verify basic eligibility directly; foundation/federal grants require human portal submission &amp; merit review.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowProfileEditor((p) => !p)}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>{showProfileEditor ? 'Hide Applicant Profile' : 'Edit Applicant Profile'}</span>
            </button>
            <button
              type="button"
              disabled={batchDrafting || Boolean(draftingGrantId)}
              onClick={handleBatchDraftTop3}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-[11px] font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className={`w-3.5 h-3.5 ${batchDrafting ? 'animate-spin' : ''}`} />
              <span>{batchDrafting ? 'Drafting Batch...' : 'Auto-Draft Top 3 Grants'}</span>
            </button>
          </div>
        </div>

        {/* Search & Hunt Form */}
        <form onSubmit={handleHuntLiveGrants} className="flex flex-wrap gap-2">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={focusQuery}
              onChange={(e) => setFocusQuery(e.target.value)}
              placeholder="Optional focus (e.g. AI operating system, Solana autonomous agent, open source security, indie founder)..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
            />
          </div>
          <button
            type="submit"
            disabled={hunting}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${hunting ? 'animate-spin' : ''}`} />
            <span>{hunting ? 'Hunting Live Grants...' : 'Hunt Live Non-Reciprocal Grants'}</span>
          </button>
        </form>

        {state?.lastScanSummary && (
          <div className="text-[10px] text-zinc-400 flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-zinc-800/80">
            <span>{state.lastScanSummary}</span>
            <span>Last Autonomous Scan: {new Date(state.lastAutonomousScanAt).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Notice Banner */}
      {notice && (
        <div
          className={`px-4 py-2.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            notice.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
              : notice.type === 'error'
              ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
              : 'bg-sky-500/15 border-sky-500/40 text-sky-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            ) : (
              <ShieldCheck className="w-4 h-4 shrink-0" />
            )}
            <span>{notice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-[10px] px-2 py-0.5 rounded bg-black/30 hover:bg-black/50 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Collapsible Applicant Profile Editor */}
      {showProfileEditor && profileForm && (
        <form
          onSubmit={handleSaveProfile}
          className="rounded-2xl bg-zinc-900/90 border border-sky-500/30 p-5 space-y-3 text-xs"
        >
          <div className="font-black text-sky-300">
            APPLICANT &amp; PROVENANCE PROFILE (AUTO-INJECTED INTO EVERY GRANT APPLICATION)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              value={profileForm.applicantName}
              onChange={(e) => setProfileForm({ ...profileForm, applicantName: e.target.value })}
              placeholder="Applicant Name"
              className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100"
            />
            <input
              value={profileForm.organizationName}
              onChange={(e) => setProfileForm({ ...profileForm, organizationName: e.target.value })}
              placeholder="Organization / Initiative"
              className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100"
            />
            <input
              value={profileForm.email}
              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
              placeholder="Contact Email"
              className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100"
            />
            <input
              value={profileForm.website}
              onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
              placeholder="Website URL"
              className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100"
            />
            <input
              value={profileForm.githubUrl}
              onChange={(e) => setProfileForm({ ...profileForm, githubUrl: e.target.value })}
              placeholder="GitHub Repository URL"
              className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100"
            />
            <input
              value={profileForm.zenodoDoi}
              onChange={(e) => setProfileForm({ ...profileForm, zenodoDoi: e.target.value })}
              placeholder="Zenodo DOI / Publication URL"
              className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100"
            />
          </div>
          <input
            value={profileForm.projectTitle}
            onChange={(e) => setProfileForm({ ...profileForm, projectTitle: e.target.value })}
            placeholder="Project Title"
            className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100"
          />
          <textarea
            rows={2}
            value={profileForm.projectSummary}
            onChange={(e) => setProfileForm({ ...profileForm, projectSummary: e.target.value })}
            placeholder="Technical Project Summary"
            className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100"
          />
          <textarea
            rows={2}
            value={profileForm.requestedUseOfFunds}
            onChange={(e) => setProfileForm({ ...profileForm, requestedUseOfFunds: e.target.value })}
            placeholder="Requested Use of Non-Reciprocal Funds"
            className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-black cursor-pointer"
          >
            Save Applicant Profile
          </button>
        </form>
      )}

      {/* Category Filter Strip */}
      <div className="flex flex-wrap items-center gap-1.5">
        {(
          [
            { id: 'ALL', label: `All Non-Reciprocal (${opportunities.length})` },
            {
              id: 'ELIGIBILITY_FAST_TRACK',
              label: `Fast-Track Eligibility (${opportunities.filter((g) => g.approvalType === 'ELIGIBILITY_BASED').length})`
            },
            { id: 'CRYPTO_AGENTIC_NON_DILUTIVE', label: 'Crypto / Agentic Grants' },
            { id: 'OPENSOURCE_PUBLIC_GOODS', label: 'Open-Source Funds' },
            { id: 'FEDERAL_RESEARCH_GRANTS', label: 'Grants.gov Federal' },
            { id: 'CLOUD_COMPUTE_CREDITS', label: 'Cloud / AI Credits' },
            { id: 'MICRO_GRANTS_FOUNDATIONS', label: 'Micro-Grants' }
          ] as Array<{ id: GrantCategory; label: string }>
        ).map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategoryFilter(c.id)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
              categoryFilter === c.id
                ? 'bg-emerald-500 text-zinc-950'
                : 'bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Main Split: Discovered Opportunities (Left) + Generated Application Packet Workspace (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Opportunities */}
        <div className="lg:col-span-6 space-y-3 max-h-[680px] overflow-y-auto pr-1">
          {filteredOpportunities.map((g) => {
            const existingDraft = state?.applications.find((a) => a.grantId === g.id);
            const isDraftingThis = draftingGrantId === g.id;
            return (
              <div
                key={g.id}
                className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-emerald-500/40 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="text-xs font-black text-zinc-100 leading-snug">{g.title}</div>
                    <div className="text-[11px] text-amber-300 font-bold">
                      {g.sponsor} · {g.awardRange}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-black shrink-0">
                    {g.matchScore}% FIT
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 text-[9px] font-bold">
                  <span className="px-1.5 py-0.5 rounded bg-zinc-950 border border-emerald-500/30 text-emerald-300">
                    {g.nonReciprocalTerms}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-zinc-950 border border-sky-500/30 text-sky-300">
                    {g.approvalType.replace(/_/g, ' ')}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-700 text-zinc-400">
                    {g.source.replace(/_/g, ' ')}
                  </span>
                </div>

                <p className="text-[11px] text-zinc-300 leading-relaxed">{g.eligibilitySummary}</p>
                <div className="text-[10px] text-zinc-500">Deadline: {g.deadline}</div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/80">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      disabled={isDraftingThis || batchDrafting}
                      onClick={() => handleDraftApplication(g.id)}
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 text-zinc-950 text-[11px] font-black flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isDraftingThis ? 'animate-spin' : ''}`} />
                      <span>
                        {isDraftingThis
                          ? 'Drafting Packet...'
                          : existingDraft
                          ? 'Regenerate AI Draft'
                          : 'Auto-Draft Application'}
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={isDraftingThis || batchDrafting}
                      onClick={() => handleCreateProvenanceTemplate(g.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <FileText className="w-3 h-3 text-amber-400" />
                      <span>Provenance Sheet</span>
                    </button>
                    {existingDraft && (
                      <button
                        type="button"
                        onClick={() => setSelectedAppId(existingDraft.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-emerald-300 text-[10px] font-bold cursor-pointer"
                      >
                        View Draft ({existingDraft.status})
                      </button>
                    )}
                  </div>

                  <a
                    href={g.applicationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-sky-300 text-[10px] font-bold flex items-center gap-1"
                  >
                    <span>Apply Portal</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Submission-Ready Application Packet Viewer & Tracker */}
        <div className="lg:col-span-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 p-4 flex flex-col gap-3 max-h-[680px]">
          <div className="flex items-center justify-between gap-2 flex-wrap border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black text-zinc-100">
                SUBMISSION-READY GRANT PACKETS ({state?.applications.length || 0})
              </span>
            </div>

            {state && state.applications.length > 0 && (
              <select
                value={activeApplication?.id || ''}
                onChange={(e) => setSelectedAppId(e.target.value)}
                className="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1 text-[11px] text-zinc-200 max-w-[260px]"
              >
                {state.applications.map((a) => (
                  <option key={a.id} value={a.id}>
                    [{a.status}] {a.grantTitle.slice(0, 42)}
                  </option>
                ))}
              </select>
            )}
          </div>

          {!activeApplication ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-zinc-400 space-y-2">
              <Award className="w-8 h-8 text-emerald-500/60" />
              <div className="text-xs font-bold text-zinc-200">No Grant Applications Drafted Yet</div>
              <p className="text-[11px] max-w-sm">
                Click <strong>Auto-Draft Application</strong> on any non-reciprocal grant on the left (or click <strong>Auto-Draft Top 3 Grants</strong> above) to generate a complete tailored proposal pre-filled with your real Agentic Treasury payout addresses.
              </p>
            </div>
          ) : (
            <>
              {/* Packet Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-zinc-400">Status:</span>
                  {(['DRAFT_READY', 'REVIEWED', 'SUBMITTED', 'AWARDED'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleStatusChange(activeApplication.id, st)}
                      className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                        activeApplication.status === st
                          ? 'bg-emerald-500 text-zinc-950'
                          : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleCopyPacket(activeApplication)}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId === activeApplication.id ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3 text-sky-400" />
                    )}
                    <span>{copiedId === activeApplication.id ? 'Copied!' : 'Copy All'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadMarkdown(activeApplication)}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3 text-amber-400" />
                    <span>.MD</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportToDesktop(activeApplication.id)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <HardDrive className="w-3 h-3" />
                    <span>Save to Desktop</span>
                  </button>
                  <a
                    href={activeApplication.applicationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 font-black flex items-center gap-1"
                  >
                    <span>Open Portal</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Embedded Real Mainnet Payout Addresses */}
              <div className="p-2.5 rounded-xl bg-zinc-950 border border-amber-500/25 text-[10px] space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-bold text-amber-300">
                    Embedded Real Agentic Treasury Payout Addresses (0% Simulated):
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300 text-[9px] font-bold">
                    {activeApplication.modelUsed === 'STRUCTURED_PROVENANCE_TEMPLATE_NO_AI'
                      ? 'PROVENANCE COVER SHEET (NO AI)'
                      : `AI DRAFT (${activeApplication.modelUsed})`}
                  </span>
                </div>
                <div className="text-zinc-300 truncate">
                  ETH/Base: <span className="text-sky-300">{activeApplication.receivingWalletAddresses.ethereumEip55}</span>
                </div>
                <div className="text-zinc-300 truncate">
                  SOL: <span className="text-purple-300">{activeApplication.receivingWalletAddresses.solanaBase58}</span>
                </div>
                <div className="text-zinc-300 truncate">
                  BTC: <span className="text-amber-300">{activeApplication.receivingWalletAddresses.bitcoinSegwit}</span>
                </div>
              </div>

              {/* Markdown Packet Content */}
              <div className="flex-1 min-h-0 overflow-y-auto rounded-xl bg-zinc-950 border border-zinc-800 p-4 text-[11px] text-zinc-200 whitespace-pre-wrap leading-relaxed">
                {activeApplication.markdownPacket}
              </div>

              {activeApplication.groundingSources.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-400 pt-1">
                  <span>Grounded Sources:</span>
                  {activeApplication.groundingSources.slice(0, 4).map((src, i) => (
                    <a
                      key={i}
                      href={src.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 hover:underline truncate max-w-[180px]"
                    >
                      [{src.title}]
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
