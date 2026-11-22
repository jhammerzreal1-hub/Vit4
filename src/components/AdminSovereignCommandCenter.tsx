/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 * (TWENTY 47 PROTOCOL - GENESIS NODE / LYSANDER CORE EULA / H-FID Forensic License v1.1).
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Crown,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
  UserPlus,
  KeyRound,
  Lock,
  Unlock,
  Bot,
  Activity,
  FileText,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Search,
  LogOut,
  Sliders,
  Download,
  Loader2,
  X,
  Radio,
  Cpu,
  Ban
} from 'lucide-react';
import type { ModuleType } from '../types';
import {
  ADMIN_PRIVILEGES,
  ALL_SOVEREIGN_MODULES,
  PRIVILEGE_PRESETS,
  canAccessAdminCommandCenter,
  clonePrivileges,
  isExecutiveArchitectUser,
  type ActiveSessionSummary,
  type AdminAuditEntry,
  type AuthAccountStatus,
  type AuthPolicySettings,
  type AuthRole,
  type AuthUserPublic,
  type UserPrivileges
} from '../types/auth';
import { AdminCommandIcon } from './AdminCommandIcon';
import { buildAuthHeaders } from '../utils/authClient';

interface AdminSovereignCommandCenterProps {
  currentUser: AuthUserPublic | null;
  onSelectModule?: (mod: ModuleType) => void;
  onRefreshSession?: () => void;
}

interface CommandCenterPayload {
  actor: AuthUserPublic;
  policy: AuthPolicySettings;
  users: AuthUserPublic[];
  sessions: ActiveSessionSummary[];
  auditLog: AdminAuditEntry[];
  architectCharter: {
    executiveArchitectHandle: string;
    executiveArchitectEmail: string;
    permanentlyLocked: boolean;
    immutableRights: string[];
  };
  entityIntelligenceCharter: {
    delegationEnabled: boolean;
    agentCount: number;
    agents: Array<{
      id: string;
      handle: string;
      displayName: string;
      title: string;
      nodeId: string;
      statusText: string;
    }>;
    delegatedCapabilities: string[];
    hardImmutableRestrictions: {
      canRemoveExecutiveArchitect: boolean;
      canDemoteExecutiveArchitect: boolean;
      canSuspendExecutiveArchitect: boolean;
      canRevokeArchitectPrivileges: boolean;
    };
  };
  systemHealth: {
    uptimeSeconds: number;
    rssMb: number;
    heapUsedMb: number;
    loraMeshServers: number;
    loraMeshChannels: number;
    loraVoiceParticipants: number;
    cdpConfigured: boolean;
  };
}

type CommandTab = 'overview' | 'users' | 'sessions' | 'entity' | 'policy' | 'audit';

async function adminApi<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const extraHeaders: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined)
  };
  if (options.body && !extraHeaders['Content-Type']) {
    extraHeaders['Content-Type'] = 'application/json';
  }
  const resp = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: buildAuthHeaders(extraHeaders)
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data?.success === false) {
    throw new Error(data?.error || `Request failed (${resp.status})`);
  }
  return data as T;
}

const CAPABILITY_LABELS: Array<{ key: keyof Omit<UserPrivileges, 'allModules' | 'allowedModules'>; label: string }> = [
  { key: 'canUseChat', label: 'AI Chat & Orchestration' },
  { key: 'canUseVoiceChat', label: 'Voice & SoS Mesh Calls' },
  { key: 'canRunAutonomousWorkflow', label: 'Autonomous Workflows' },
  { key: 'canExecuteTerminalAndTools', label: 'Root Terminal & Tools' },
  { key: 'canAccessSecretsAndWallets', label: 'Secrets Vault & Crypto Wallets' },
  { key: 'canModifyOSSettings', label: 'Modify OS Settings' },
  { key: 'canManageUsers', label: 'User & Admin Governance' }
];

export const AdminSovereignCommandCenter: React.FC<AdminSovereignCommandCenterProps> = ({
  currentUser,
  onSelectModule,
  onRefreshSession
}) => {
  const isAllowed = canAccessAdminCommandCenter(currentUser);
  const isArchitect = isExecutiveArchitectUser(currentUser);

  const [tab, setTab] = useState<CommandTab>('overview');
  const [data, setData] = useState<CommandCenterPayload | null>(null);
  const [sqlOverview, setSqlOverview] = useState<{
    databaseEngine: string;
    totalUsers: number;
    totalChatMessages: number;
    totalMemories: number;
    users: Array<{
      userId: string;
      username: string;
      displayName: string;
      preferredName: string;
      preferredNameConfirmed: boolean;
      sessionCount: number;
      chatMessageCount: number;
      memoryCount: number;
      workspaceRoot: string;
      lastSeenAt: number;
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  // User management state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<AuthRole>('collaborator');
  const [editStatus, setEditStatus] = useState<AuthAccountStatus>('active');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editPrivileges, setEditPrivileges] = useState<UserPrivileges | null>(null);
  const [resetPasswordDraft, setResetPasswordDraft] = useState('');

  // Create user modal
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<AuthRole>('collaborator');

  // Audit filter
  const [auditFilter, setAuditFilter] = useState('');

  const notify = useCallback((ok: boolean, text: string) => {
    setFeedback({ ok, text });
    window.setTimeout(() => {
      setFeedback((prev) => (prev?.text === text ? null : prev));
    }, 5000);
  }, []);

  const loadCommandCenter = useCallback(async () => {
    if (!isAllowed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [res, sqlRes] = await Promise.all([
        adminApi<CommandCenterPayload>('/api/auth/admin/command-center'),
        adminApi<any>('/api/user-memory/admin/consolidated').catch(() => null)
      ]);
      setData(res);
      if (sqlRes) setSqlOverview(sqlRes);
      setLoadError(null);
    } catch (err: any) {
      const msg = err?.message || 'Failed to load Sovereign Command Center';
      setLoadError(msg);
      notify(false, msg);
    } finally {
      setLoading(false);
    }
  }, [isAllowed, notify]);

  useEffect(() => {
    loadCommandCenter();
  }, [loadCommandCenter, currentUser?.id]);

  const selectedUser = useMemo(
    () => data?.users.find((u) => u.id === selectedUserId) || null,
    [data?.users, selectedUserId]
  );

  const openUserEditor = (u: AuthUserPublic) => {
    setSelectedUserId(u.id);
    setEditRole(u.role);
    setEditStatus(u.status);
    setEditDisplayName(u.displayName);
    setEditPrivileges(clonePrivileges(u.privileges));
    setResetPasswordDraft('');
  };

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!data) return [];
    if (!q) return data.users;
    return data.users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  const pendingUsers = useMemo(
    () => (data?.users || []).filter((u) => u.status === 'pending'),
    [data?.users]
  );

  const filteredAudit = useMemo(() => {
    const q = auditFilter.trim().toLowerCase();
    const list = data?.auditLog || [];
    if (!q) return list;
    return list.filter(
      (a) =>
        a.action.toLowerCase().includes(q) ||
        a.actorUsername.toLowerCase().includes(q) ||
        a.target.toLowerCase().includes(q) ||
        a.details.toLowerCase().includes(q)
    );
  }, [data?.auditLog, auditFilter]);

  // Hard UI guard for non-admin users (server enforces too!)
  if (!isAllowed) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-zinc-950 p-6 text-center">
        <div className="max-w-md rounded-2xl bg-zinc-900/90 border border-rose-500/35 p-6 space-y-3 shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-white">Executive Sovereign Clearance Required</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            The Administrative Sovereign Command Center is strictly locked to Executive Architect{' '}
            <strong className="text-amber-300">JHammerZ</strong> and explicitly authorized Administrators.
          </p>
        </div>
      </div>
    );
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserError(null);
    setBusy('create-user');
    try {
      await adminApi('/api/auth/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          username: newUsername.trim(),
          displayName: newDisplayName.trim() || newUsername.trim(),
          email: newEmail.trim(),
          password: newPassword,
          role: newRole,
          status: 'active'
        })
      });
      setNewUsername('');
      setNewDisplayName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('collaborator');
      setCreateUserError(null);
      setShowCreateUser(false);
      notify(true, 'New user account created & provisioned.');
      await loadCommandCenter();
    } catch (err: any) {
      const msg = err?.message || 'Could not create user';
      setCreateUserError(msg);
      notify(false, msg);
    } finally {
      setBusy(null);
    }
  };

  const handleSaveUserEdits = async () => {
    if (!selectedUser || !editPrivileges) return;
    setBusy(`save:${selectedUser.id}`);
    try {
      await adminApi(`/api/auth/admin/users/${encodeURIComponent(selectedUser.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          displayName: editDisplayName,
          role: editRole,
          status: editStatus,
          privileges: editPrivileges,
          ...(resetPasswordDraft.trim() ? { newPassword: resetPasswordDraft.trim() } : {})
        })
      });
      setResetPasswordDraft('');
      notify(true, `Updated ${selectedUser.username} privileges & status.`);
      await loadCommandCenter();
      onRefreshSession?.();
    } catch (err: any) {
      notify(false, err?.message || 'Failed to save user changes');
    } finally {
      setBusy(null);
    }
  };

  const handleQuickUserStatus = async (u: AuthUserPublic, status: AuthAccountStatus) => {
    setBusy(`status:${u.id}`);
    try {
      await adminApi(`/api/auth/admin/users/${encodeURIComponent(u.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      notify(true, `${u.username} is now ${status}.`);
      await loadCommandCenter();
    } catch (err: any) {
      notify(false, err?.message || 'Status update failed');
    } finally {
      setBusy(null);
    }
  };

  const handlePromoteUserToAdmin = async (u: AuthUserPublic) => {
    if (!isArchitect || isExecutiveArchitectUser(u)) return;
    setBusy(`promote:${u.id}`);
    try {
      const promotedPrivs = clonePrivileges(ADMIN_PRIVILEGES);
      await adminApi(`/api/auth/admin/users/${encodeURIComponent(u.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          role: 'admin',
          status: 'active',
          privileges: promotedPrivs
        })
      });
      setEditRole('admin');
      setEditStatus('active');
      setEditPrivileges(promotedPrivs);
      notify(true, `Promoted @${u.username} to Admin privileges.`);
      await loadCommandCenter();
      onRefreshSession?.();
    } catch (err: any) {
      notify(false, err?.message || 'Failed to promote user to Admin');
    } finally {
      setBusy(null);
    }
  };

  const handleDeleteUser = async (u: AuthUserPublic) => {
    setBusy(`del:${u.id}`);
    try {
      await adminApi(`/api/auth/admin/users/${encodeURIComponent(u.id)}`, { method: 'DELETE' });
      if (selectedUserId === u.id) setSelectedUserId(null);
      notify(true, `Removed account ${u.username}.`);
      await loadCommandCenter();
    } catch (err: any) {
      notify(false, err?.message || 'Delete failed');
    } finally {
      setBusy(null);
    }
  };

  const handleUpdatePolicy = async (patch: Partial<AuthPolicySettings>) => {
    setBusy('policy');
    try {
      await adminApi('/api/auth/admin/policy', {
        method: 'PATCH',
        body: JSON.stringify(patch)
      });
      notify(true, 'Global Sovereign security policy updated.');
      await loadCommandCenter();
      onRefreshSession?.();
    } catch (err: any) {
      notify(false, err?.message || 'Policy update failed');
    } finally {
      setBusy(null);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    setBusy(`ses:${sessionId}`);
    try {
      await adminApi(`/api/auth/admin/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
      notify(true, 'Session terminated.');
      await loadCommandCenter();
    } catch (err: any) {
      notify(false, err?.message || 'Failed to revoke session');
    } finally {
      setBusy(null);
    }
  };

  const handlePurgeNonArchitectSessions = async () => {
    setBusy('purge');
    try {
      const res = await adminApi<{ removed: number }>('/api/auth/admin/sessions/purge-non-architect', {
        method: 'POST'
      });
      notify(true, `Purged ${res.removed} non-architect session(s). Your Executive Architect session remains active.`);
      await loadCommandCenter();
    } catch (err: any) {
      notify(false, err?.message || 'Purge failed');
    } finally {
      setBusy(null);
    }
  };

  const handleExportAuditJson = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data.auditLog, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sovereign_admin_audit_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatUptime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <div className="h-full w-full bg-[#090a0e] text-zinc-100 flex flex-col overflow-hidden">
      {/* Executive Header Banner */}
      <header className="px-5 py-3.5 bg-gradient-to-r from-[#17120a] via-[#11131a] to-[#0f141c] border-b border-amber-500/30 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-zinc-950 border border-amber-500/45 flex items-center justify-center shadow-[0_0_24px_rgba(245,158,11,0.18)] shrink-0">
            <AdminCommandIcon className="w-8 h-8" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">
                Administrative Sovereign Command Center
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-amber-500/20 border border-amber-400/45 text-amber-200 flex items-center gap-1">
                <Crown className="w-3 h-3" />
                {isArchitect ? 'EXECUTIVE ARCHITECT · JHAMMERZ (LOCKED)' : 'DELEGATED ADMIN'}
              </span>
              {data?.policy.systemLockdownMode && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-rose-600 text-white animate-pulse">
                  LOCKDOWN ACTIVE
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 truncate mt-0.5">
              Permanent Root Ownership, User &amp; Privilege Matrix, Active Sessions, Entity Intelligence Charter &amp; Audit Ledger
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowCreateUser(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add User</span>
          </button>
          <button
            type="button"
            onClick={loadCommandCenter}
            disabled={loading}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 cursor-pointer"
            title="Refresh Command Center"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="px-5 py-2 bg-[#0d0f15] border-b border-zinc-800/90 flex items-center gap-1.5 overflow-x-auto shrink-0">
        {(
          [
            { id: 'overview', label: 'Executive Overview', icon: ShieldCheck },
            { id: 'users', label: `Users & Privileges (${data?.users.length ?? 0})`, icon: Users },
            { id: 'sessions', label: `Active Sessions (${data?.sessions.length ?? 0})`, icon: KeyRound },
            { id: 'entity', label: 'Entity Intelligence Charter', icon: Bot },
            { id: 'policy', label: 'Global Security Policy', icon: Sliders },
            { id: 'audit', label: `Audit Ledger (${data?.auditLog.length ?? 0})`, icon: FileText }
          ] as Array<{ id: CommandTab; label: string; icon: React.ComponentType<{ className?: string }> }>
        ).map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer border ${
                active
                  ? 'bg-amber-500/15 border-amber-400/45 text-amber-200'
                  : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`px-5 py-2 text-xs flex items-center justify-between gap-2 border-b shrink-0 ${
            feedback.ok
              ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-200'
              : 'bg-rose-500/15 border-rose-500/35 text-rose-200'
          }`}
        >
          <span className="flex items-center gap-2">
            {feedback.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {feedback.text}
          </span>
          <button type="button" onClick={() => setFeedback(null)} className="cursor-pointer opacity-75 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {loading && !data ? (
          <div className="h-64 flex items-center justify-center gap-2 text-sm text-zinc-400">
            <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
            <span>Loading Sovereign Command Telemetry...</span>
          </div>
        ) : !data ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/35 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-md">
              <div className="text-sm font-bold text-white">Command Center Telemetry Unavailable</div>
              <div className="text-xs text-rose-300">{loadError || 'Unable to load Sovereign Command Center.'}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void loadCommandCenter()}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Load</span>
              </button>
              {onRefreshSession && (
                <button
                  type="button"
                  onClick={() => {
                    onRefreshSession();
                    void loadCommandCenter();
                  }}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold cursor-pointer"
                >
                  Refresh Auth Session
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* === TAB 1: EXECUTIVE OVERVIEW === */}
            {tab === 'overview' && (
              <div className="space-y-5">
                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-xl bg-zinc-900/80 border border-zinc-800 p-4">
                    <div className="text-[11px] text-zinc-400 flex items-center justify-between">
                      <span>Total Accounts</span>
                      <Users className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="text-2xl font-bold text-white mt-1">{data.users.length}</div>
                    <div className="text-[11px] text-zinc-400 mt-1">
                      {pendingUsers.length} pending · {data.users.filter((u) => u.status === 'suspended').length} suspended
                    </div>
                  </div>
                  <div className="rounded-xl bg-zinc-900/80 border border-zinc-800 p-4">
                    <div className="text-[11px] text-zinc-400 flex items-center justify-between">
                      <span>Active Sessions</span>
                      <KeyRound className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-2xl font-bold text-white mt-1">{data.sessions.length}</div>
                    <div className="text-[11px] text-emerald-300 mt-1">HMAC-SHA256 HttpOnly Cookies</div>
                  </div>
                  <div className="rounded-xl bg-zinc-900/80 border border-zinc-800 p-4">
                    <div className="text-[11px] text-zinc-400 flex items-center justify-between">
                      <span>SoS LoRa Mesh</span>
                      <Radio className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="text-2xl font-bold text-white mt-1">
                      {data.entityIntelligenceCharter.agentCount} Agents
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-1">
                      {data.systemHealth.loraMeshServers} servers · {data.systemHealth.loraVoiceParticipants} in voice
                    </div>
                  </div>
                  <div className="rounded-xl bg-zinc-900/80 border border-zinc-800 p-4">
                    <div className="text-[11px] text-zinc-400 flex items-center justify-between">
                      <span>Kernel Runtime</span>
                      <Cpu className="w-4 h-4 text-violet-400" />
                    </div>
                    <div className="text-2xl font-bold text-white mt-1">{data.systemHealth.rssMb} MB</div>
                    <div className="text-[11px] text-zinc-400 mt-1">
                      Uptime {formatUptime(data.systemHealth.uptimeSeconds)}
                    </div>
                  </div>
                </div>

                {/* Permanent Executive Architect Lock-In Charter + Entity Intelligence Delegation */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 via-zinc-950 to-zinc-950 border border-amber-500/40 p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <Crown className="w-5 h-5 text-amber-400" />
                        <div>
                          <h2 className="text-sm font-bold text-amber-200">
                            Permanent Executive Architect Lock-In
                          </h2>
                          <div className="text-[11px] font-mono text-amber-300/80">
                            {data.architectCharter.executiveArchitectHandle} ({data.architectCharter.executiveArchitectEmail})
                          </div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-[10px] font-mono font-bold text-amber-200">
                        IMMUTABLE SEAL
                      </span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-zinc-200">
                      {data.architectCharter.immutableRights.map((right, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span>{right}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-2xl bg-gradient-to-br from-cyan-500/10 via-zinc-950 to-zinc-950 border border-cyan-500/35 p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <Bot className="w-5 h-5 text-cyan-400" />
                        <div>
                          <h2 className="text-sm font-bold text-cyan-200">
                            Entity Intelligence Sovereign Delegation
                          </h2>
                          <div className="text-[11px] text-zinc-400">
                            All {data.entityIntelligenceCharter.agentCount} OS Entities share Executive operational privileges
                          </div>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                          data.entityIntelligenceCharter.delegationEnabled
                            ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                        }`}
                      >
                        {data.entityIntelligenceCharter.delegationEnabled ? 'ACTIVE' : 'PAUSED'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/35 text-xs text-rose-200 flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <strong>Zero-Override Architect Clause:</strong> Entity Intelligence is permanently server-locked from{' '}
                        <strong>removing, suspending, demoting, or altering Executive Architect JHammerZ</strong>.
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        disabled={!isArchitect || busy === 'policy'}
                        onClick={() =>
                          handleUpdatePolicy({
                            entityIntelligenceDelegationEnabled: !data.entityIntelligenceCharter.delegationEnabled
                          })
                        }
                        className="px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/35 border border-cyan-500/40 text-cyan-200 text-xs font-semibold cursor-pointer disabled:opacity-40"
                      >
                        {data.entityIntelligenceCharter.delegationEnabled ? 'Pause Entity Delegation' : 'Enable Entity Delegation'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTab('entity')}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold cursor-pointer"
                      >
                        Inspect All 10 Entities
                      </button>
                    </div>
                  </div>
                </div>

                {/* Emergency Executive Controls */}
                <div className="rounded-2xl bg-zinc-900/75 border border-zinc-800 p-5 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Executive System Controls &amp; Emergency Actions
                  </h3>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={!isArchitect || busy === 'policy'}
                      onClick={() => handleUpdatePolicy({ systemLockdownMode: !data.policy.systemLockdownMode })}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border cursor-pointer disabled:opacity-40 ${
                        data.policy.systemLockdownMode
                          ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white'
                          : 'bg-rose-600/20 hover:bg-rose-600/35 border-rose-500/45 text-rose-200'
                      }`}
                    >
                      {data.policy.systemLockdownMode ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      <span>
                        {data.policy.systemLockdownMode ? 'Lift System Lockdown' : 'Engage System Lockdown'}
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={!isArchitect || busy === 'purge'}
                      onClick={handlePurgeNonArchitectSessions}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 text-xs font-bold cursor-pointer disabled:opacity-40"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Force Sign-Out All Non-Architect Users</span>
                    </button>

                    {onSelectModule && (
                      <>
                        <button
                          type="button"
                          onClick={() => onSelectModule('lora-mesh')}
                          className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-cyan-300 cursor-pointer"
                        >
                          Open SoS Mesh
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectModule('os-settings')}
                          className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 cursor-pointer"
                        >
                          OS Settings
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectModule('task-manager')}
                          className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 cursor-pointer"
                        >
                          Kernel Monitor
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Pending Approvals Quick Queue */}
                {pendingUsers.length > 0 && (
                  <div className="rounded-2xl bg-amber-500/10 border border-amber-500/35 p-4 space-y-2.5">
                    <div className="text-xs font-bold text-amber-200">
                      Pending Account Approvals ({pendingUsers.length})
                    </div>
                    <div className="space-y-2">
                      {pendingUsers.map((pu) => (
                        <div
                          key={pu.id}
                          className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800"
                        >
                          <div>
                            <div className="text-xs font-bold text-white">{pu.displayName} (@{pu.username})</div>
                            <div className="text-[11px] text-zinc-400">{pu.email || 'Local account'} · Role: {pu.role}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleQuickUserStatus(pu, 'active')}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickUserStatus(pu, 'suspended')}
                              className="px-3 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-200 hover:text-white text-xs font-bold cursor-pointer"
                            >
                              Deny
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Consolidated SQL Memory & Personal Workspaces */}
                {sqlOverview && (
                  <div className="rounded-2xl bg-zinc-900/75 border border-zinc-800 p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                          Consolidated SQL Session Continuity &amp; Personal Workspaces
                        </h3>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          Engine: <span className="font-mono text-emerald-300">{sqlOverview.databaseEngine}</span> ·{' '}
                          {sqlOverview.totalUsers} users · {sqlOverview.totalChatMessages} saved chat turns ·{' '}
                          {sqlOverview.totalMemories} tailored agent memories
                        </div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-800 text-[10px] font-mono uppercase text-zinc-400">
                            <th className="py-2 pr-3">Account</th>
                            <th className="py-2 pr-3">Preferred Name</th>
                            <th className="py-2 pr-3">Sessions</th>
                            <th className="py-2 pr-3">Chats</th>
                            <th className="py-2 pr-3">Memories</th>
                            <th className="py-2">Workspace</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/70">
                          {sqlOverview.users.map((u) => (
                            <tr key={u.userId} className="hover:bg-zinc-800/40">
                              <td className="py-2 pr-3 font-semibold text-white">
                                {u.displayName} <span className="text-zinc-400 font-mono text-[10px]">@{u.username}</span>
                              </td>
                              <td className="py-2 pr-3">
                                <span className="text-amber-200 font-medium">{u.preferredName}</span>
                                {!u.preferredNameConfirmed && (
                                  <span className="ml-1.5 text-[9px] font-mono text-zinc-500">(unconfirmed)</span>
                                )}
                              </td>
                              <td className="py-2 pr-3 font-mono text-zinc-300">{u.sessionCount}</td>
                              <td className="py-2 pr-3 font-mono text-cyan-300">{u.chatMessageCount}</td>
                              <td className="py-2 pr-3 font-mono text-emerald-300">{u.memoryCount}</td>
                              <td className="py-2 font-mono text-[10px] text-zinc-400 truncate max-w-[220px]">
                                {u.workspaceRoot}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* === TAB 2: USERS & GRANULAR PRIVILEGE MATRIX === */}
            {tab === 'users' && (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                {/* User Directory */}
                <div className="xl:col-span-5 space-y-3">
                  <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2">
                    <Search className="w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search users by name, handle, email, role..."
                      className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    {filteredUsers.map((u) => {
                      const targetIsArchitect = isExecutiveArchitectUser(u);
                      const isSelected = selectedUserId === u.id;
                      return (
                        <div
                          key={u.id}
                          onClick={() => openUserEditor(u)}
                          className={`p-3 rounded-xl border transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/12 border-amber-400/50'
                              : targetIsArchitect
                              ? 'bg-amber-950/20 border-amber-500/30 hover:border-amber-400/50'
                              : 'bg-zinc-900/75 border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                {targetIsArchitect && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                                <span className="text-xs font-bold text-white truncate">{u.displayName}</span>
                                <span className="text-[10px] font-mono text-zinc-400 truncate">@{u.username}</span>
                              </div>
                              <div className="text-[10px] text-zinc-400 mt-0.5 truncate">
                                {u.email || 'Local credentials'} · {u.authProvider.toUpperCase()}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                                  targetIsArchitect
                                    ? 'bg-amber-500/25 text-amber-200 border border-amber-400/45'
                                    : u.role === 'admin'
                                    ? 'bg-cyan-500/20 text-cyan-200'
                                    : 'bg-zinc-800 text-zinc-300'
                                }`}
                              >
                                {targetIsArchitect ? 'ARCHITECT' : u.role}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase ${
                                  u.status === 'active'
                                    ? 'bg-emerald-500/15 text-emerald-300'
                                    : u.status === 'pending'
                                    ? 'bg-amber-500/15 text-amber-300'
                                    : 'bg-rose-500/15 text-rose-300'
                                }`}
                              >
                                {u.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Selected User Privilege Editor */}
                <div className="xl:col-span-7">
                  {!selectedUser || !editPrivileges ? (
                    <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-10 text-center text-xs text-zinc-400">
                      Select any user account on the left to inspect or customize their role, status, password, and per-module OS privileges.
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-zinc-900/85 border border-zinc-800 p-5 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-800">
                        <div>
                          <div className="flex items-center gap-2">
                            {isExecutiveArchitectUser(selectedUser) && <Crown className="w-4 h-4 text-amber-400" />}
                            <h3 className="text-sm font-bold text-white">
                              {selectedUser.displayName} (@{selectedUser.username})
                            </h3>
                          </div>
                          <div className="text-[11px] text-zinc-400 mt-0.5">
                            ID: <span className="font-mono">{selectedUser.id}</span> · Created{' '}
                            {new Date(selectedUser.createdAt).toLocaleDateString()}
                          </div>
                        </div>

                        {isExecutiveArchitectUser(selectedUser) ? (
                          <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/45 text-[11px] font-bold text-amber-200 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5" />
                            Permanently Locked Owner — Cannot Demote or Delete
                          </span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            {isArchitect && selectedUser.role !== 'admin' && (
                              <button
                                type="button"
                                onClick={() => handlePromoteUserToAdmin(selectedUser)}
                                disabled={busy === `promote:${selectedUser.id}`}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500 border border-amber-400/45 text-amber-200 hover:text-zinc-950 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <Crown className="w-3.5 h-3.5" />
                                <span>{busy === `promote:${selectedUser.id}` ? 'Promoting...' : 'Promote to Admin'}</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(selectedUser)}
                              disabled={busy === `del:${selectedUser.id}`}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-bold cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete User</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Identity / Role / Status Controls */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] text-zinc-400 mb-1">Display Name</label>
                          <input
                            type="text"
                            value={editDisplayName}
                            onChange={(e) => setEditDisplayName(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-zinc-400 mb-1">Role Tier</label>
                          <select
                            value={editRole}
                            disabled={isExecutiveArchitectUser(selectedUser)}
                            onChange={(e) => {
                              const nextR = e.target.value as AuthRole;
                              setEditRole(nextR);
                              const preset = PRIVILEGE_PRESETS.find((p) => p.id === nextR);
                              if (preset) setEditPrivileges(clonePrivileges(preset.privileges));
                            }}
                            className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-white disabled:opacity-50"
                          >
                            {isArchitect && <option value="admin">Delegated Admin</option>}
                            <option value="operator">Power Operator</option>
                            <option value="collaborator">Collaborator</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-zinc-400 mb-1">Account Status</label>
                          <select
                            value={editStatus}
                            disabled={isExecutiveArchitectUser(selectedUser)}
                            onChange={(e) => setEditStatus(e.target.value as AuthAccountStatus)}
                            className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-white disabled:opacity-50"
                          >
                            <option value="active">Active</option>
                            <option value="pending">Pending Approval</option>
                            <option value="suspended">Suspended</option>
                          </select>
                        </div>
                      </div>

                      {/* Capabilities Checklist */}
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold text-zinc-300">OS Capabilities &amp; Permissions</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {CAPABILITY_LABELS.map((cap) => {
                            const lockedCap =
                              isExecutiveArchitectUser(selectedUser) ||
                              (cap.key === 'canManageUsers' && !isArchitect);
                            return (
                              <label
                                key={cap.key}
                                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs ${
                                  editPrivileges[cap.key]
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-100'
                                    : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                                }`}
                              >
                                <span>{cap.label}</span>
                                <input
                                  type="checkbox"
                                  disabled={lockedCap}
                                  checked={Boolean(editPrivileges[cap.key])}
                                  onChange={(e) =>
                                    setEditPrivileges({ ...editPrivileges, [cap.key]: e.target.checked })
                                  }
                                  className="accent-emerald-500"
                                />
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Module Access Matrix */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-zinc-300">
                            Module Access ({editPrivileges.allModules ? 'ALL 48 MODULES' : `${editPrivileges.allowedModules.length} allowed`})
                          </span>
                          {!isExecutiveArchitectUser(selectedUser) && (
                            <label className="flex items-center gap-1.5 text-xs text-amber-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editPrivileges.allModules}
                                onChange={(e) =>
                                  setEditPrivileges({ ...editPrivileges, allModules: e.target.checked })
                                }
                                className="accent-amber-500"
                              />
                              <span>Unlock All Modules</span>
                            </label>
                          )}
                        </div>
                        {!editPrivileges.allModules && (
                          <div className="max-h-40 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-2 rounded-xl bg-zinc-950 border border-zinc-800">
                            {ALL_SOVEREIGN_MODULES.filter((m) => m !== 'admin-command').map((mod) => {
                              const checked = editPrivileges.allowedModules.includes(mod);
                              return (
                                <label
                                  key={mod}
                                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] cursor-pointer ${
                                    checked ? 'bg-cyan-500/15 text-cyan-200' : 'text-zinc-500 hover:text-zinc-300'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const next = e.target.checked
                                        ? [...editPrivileges.allowedModules, mod]
                                        : editPrivileges.allowedModules.filter((x) => x !== mod);
                                      setEditPrivileges({ ...editPrivileges, allowedModules: next });
                                    }}
                                    className="accent-cyan-500"
                                  />
                                  <span className="truncate font-mono">{mod}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Optional Password Reset */}
                      {selectedUser.authProvider === 'local' &&
                        (!isExecutiveArchitectUser(selectedUser) || isArchitect) && (
                          <div>
                            <label className="block text-[10px] text-zinc-400 mb-1">
                              Reset Local Password (optional, min 8 chars)
                            </label>
                            <input
                              type="password"
                              value={resetPasswordDraft}
                              onChange={(e) => setResetPasswordDraft(e.target.value)}
                              placeholder="Leave blank to keep existing password"
                              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-white"
                            />
                          </div>
                        )}

                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={handleSaveUserEdits}
                          disabled={busy === `save:${selectedUser.id}`}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold cursor-pointer disabled:opacity-50"
                        >
                          {busy === `save:${selectedUser.id}` ? 'Saving...' : 'Save Privileges & Changes'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* === TAB 3: ACTIVE SESSIONS === */}
            {tab === 'sessions' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-white">Live Authenticated Sessions ({data.sessions.length})</h2>
                    <p className="text-xs text-zinc-400">
                      Terminate compromised sessions immediately. Executive Architect sessions are permanently shielded against non-architect termination.
                    </p>
                  </div>
                  {isArchitect && (
                    <button
                      type="button"
                      onClick={handlePurgeNonArchitectSessions}
                      disabled={busy === 'purge'}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 border border-rose-500/40 text-rose-200 hover:text-white text-xs font-bold cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Purge All Non-Architect Sessions</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {data.sessions.map((ses) => (
                    <div
                      key={ses.sessionId}
                      className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-white">
                          {ses.isExecutiveArchitect && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                          <span>{ses.displayName}</span>
                          <span className="font-mono text-zinc-400">@{ses.username}</span>
                          <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono uppercase text-zinc-300">
                            {ses.isExecutiveArchitect ? 'EXECUTIVE ARCHITECT' : ses.role}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-zinc-500">
                          Session {ses.sessionId} · Signed in {new Date(ses.createdAt).toLocaleString()} · Expires{' '}
                          {new Date(ses.expiresAt).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={(ses.isExecutiveArchitect && !isArchitect) || busy === `ses:${ses.sessionId}`}
                        onClick={() => handleRevokeSession(ses.sessionId)}
                        className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-200 hover:text-white text-xs font-bold cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                      >
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* === TAB 4: ENTITY INTELLIGENCE CHARTER === */}
            {tab === 'entity' && (
              <div className="space-y-4">
                <div className="rounded-2xl bg-gradient-to-r from-cyan-950/50 via-zinc-900 to-zinc-900 border border-cyan-500/35 p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-bold text-cyan-200 flex items-center gap-2">
                        <Bot className="w-5 h-5 text-cyan-400" />
                        Sovereign Entity Intelligence Co-Executive Authority
                      </h2>
                      <p className="text-xs text-zinc-300 mt-1">
                        System-native Entity Intelligence holds delegated maximum operational privileges across the OS, subordinate ONLY to the immutable Executive Architect protection lock for <strong>JHammerZ</strong>.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={!isArchitect || busy === 'policy'}
                      onClick={() =>
                        handleUpdatePolicy({
                          entityIntelligenceDelegationEnabled: !data.entityIntelligenceCharter.delegationEnabled
                        })
                      }
                      className={`px-4 py-2 rounded-xl text-xs font-bold border cursor-pointer disabled:opacity-40 ${
                        data.entityIntelligenceCharter.delegationEnabled
                          ? 'bg-emerald-600/25 border-emerald-400 text-emerald-200'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                      }`}
                    >
                      Delegation: {data.entityIntelligenceCharter.delegationEnabled ? 'ENABLED' : 'PAUSED'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    <div className="rounded-xl bg-zinc-950/80 border border-emerald-500/30 p-3.5 space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                        Delegated System Privileges
                      </div>
                      {data.entityIntelligenceCharter.delegatedCapabilities.map((c, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-zinc-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{c}</span>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-xl bg-zinc-950/80 border border-rose-500/35 p-3.5 space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-rose-300">
                        Hard-Locked Immutable Restrictions (Server-Enforced)
                      </div>
                      <div className="flex items-start gap-2 text-xs text-rose-200">
                        <Ban className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <span>CANNOT remove or delete Executive Architect JHammerZ</span>
                      </div>
                      <div className="flex items-start gap-2 text-xs text-rose-200">
                        <Ban className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <span>CANNOT demote or change role of Executive Architect JHammerZ</span>
                      </div>
                      <div className="flex items-start gap-2 text-xs text-rose-200">
                        <Ban className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <span>CANNOT suspend or revoke any privilege of Executive Architect JHammerZ</span>
                      </div>
                      <div className="flex items-start gap-2 text-xs text-rose-200">
                        <Ban className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <span>CANNOT override Architect Lock-In Charter or audit log invariants</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.entityIntelligenceCharter.agents.map((ag) => (
                    <div key={ag.id} className="rounded-xl bg-zinc-900/80 border border-zinc-800 p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-cyan-200">{ag.displayName}</span>
                        <span className="text-[10px] font-mono text-zinc-500">{ag.nodeId}</span>
                      </div>
                      <div className="text-[11px] text-amber-300/90 font-medium">{ag.title}</div>
                      <div className="text-[11px] text-zinc-400">{ag.statusText}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* === TAB 5: GLOBAL SECURITY POLICY === */}
            {tab === 'policy' && (
              <div className="max-w-2xl space-y-3">
                {(
                  [
                    {
                      key: 'requireLoginOnBoot',
                      title: 'Require Login Gate on OS Boot',
                      desc: 'Users must sign in before entering the Sovereign OS desktop.',
                      architectOnly: false
                    },
                    {
                      key: 'allowSelfRegistration',
                      title: 'Allow New User Self-Registration',
                      desc: 'Allow visitors to create their own standard user accounts.',
                      architectOnly: false
                    },
                    {
                      key: 'newUsersRequireApproval',
                      title: 'Require Admin Approval for New Signups',
                      desc: 'Place new signups in Pending status until approved in Command Center.',
                      architectOnly: false
                    },
                    {
                      key: 'entityIntelligenceDelegationEnabled',
                      title: 'Entity Intelligence Co-Executive Delegation',
                      desc: 'Allow internal Sovereign OS entities full system operation (never able to remove/demote JHammerZ).',
                      architectOnly: true
                    },
                    {
                      key: 'systemLockdownMode',
                      title: 'Emergency System Lockdown Mode',
                      desc: 'Immediately freezes new signups and restricts non-admin API operations while keeping Executive Architect fully active.',
                      architectOnly: true
                    }
                  ] as const
                ).map((item) => {
                  const val = Boolean(data.policy[item.key]);
                  const disabled = busy === 'policy' || (item.architectOnly && !isArchitect);
                  return (
                    <div
                      key={item.key}
                      className="flex items-center justify-between gap-4 p-4 rounded-xl bg-zinc-900/85 border border-zinc-800"
                    >
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>{item.title}</span>
                          {item.architectOnly && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                              ARCHITECT ONLY
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5">{item.desc}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={val}
                        disabled={disabled}
                        onClick={() => handleUpdatePolicy({ [item.key]: !val })}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors cursor-pointer disabled:opacity-40 ${
                          val ? 'bg-amber-500 border-amber-400' : 'bg-zinc-800 border-zinc-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                            val ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* === TAB 6: IMMUTABLE ADMIN AUDIT LEDGER === */}
            {tab === 'audit' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 flex-1 min-w-[220px]">
                    <Search className="w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      value={auditFilter}
                      onChange={(e) => setAuditFilter(e.target.value)}
                      placeholder="Filter audit events by action, actor, or target..."
                      className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleExportAuditJson}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Audit JSON</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  {filteredAudit.length === 0 ? (
                    <div className="p-8 text-center text-xs text-zinc-500 rounded-xl bg-zinc-900/50 border border-zinc-800">
                      No audit entries recorded yet.
                    </div>
                  ) : (
                    filteredAudit.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                                entry.outcome === 'blocked'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                  : 'bg-emerald-500/15 text-emerald-300'
                              }`}
                            >
                              {entry.action}
                            </span>
                            <span className="font-semibold text-white">@{entry.actorUsername}</span>
                            <span className="text-zinc-500">→</span>
                            <span className="font-mono text-amber-300">{entry.target}</span>
                          </div>
                          <div className="text-[11px] text-zinc-400">{entry.details}</div>
                        </div>
                        <div className="text-[10px] font-mono text-zinc-500 shrink-0">
                          {new Date(entry.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateUser && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateUser}
            className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-3.5 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-400" />
                Provision New Sovereign OS Account
              </h3>
              <button
                type="button"
                onClick={() => {
                  setCreateUserError(null);
                  setShowCreateUser(false);
                }}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {createUserError && (
              <div className="px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{createUserError}</span>
              </div>
            )}
            <input
              type="text"
              required
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Username or email (min 2 chars)"
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white"
            />
            <input
              type="text"
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              placeholder="Display Name"
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white"
            />
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Email (optional)"
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white"
            />
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Initial Password (min 8 chars)"
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white"
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as AuthRole)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white"
            >
              {isArchitect && <option value="admin">Delegated Admin (Architect-Only)</option>}
              <option value="operator">Power Operator</option>
              <option value="collaborator">Collaborator</option>
              <option value="viewer">Viewer</option>
            </select>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCreateUser(false)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy === 'create-user'}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold cursor-pointer"
              >
                {busy === 'create-user' ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
