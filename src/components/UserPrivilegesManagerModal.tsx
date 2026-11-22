/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 * (TWENTY 47 PROTOCOL - GENESIS NODE / LYSANDER CORE EULA / H-FID Forensic License v1.1).
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Users,
  UserPlus,
  Settings,
  X,
  Check,
  Search,
  Trash2,
  KeyRound,
  Crown,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import {
  adminCreateUserAccount,
  adminDeleteUserAccount,
  adminFetchUsers,
  adminUpdateAuthPolicy,
  adminUpdateUserAccount
} from '../utils/authClient';
import {
  ADMIN_PRIVILEGES,
  ALL_SOVEREIGN_MODULES,
  PRIVILEGE_PRESETS,
  clonePrivileges,
  isExecutiveArchitectUser,
  type AuthAccountStatus,
  type AuthPolicySettings,
  type AuthRole,
  type AuthUserPublic,
  type UserPrivileges
} from '../types/auth';
import { ALL_MODULES, WORKSPACE_GROUPS } from './Navigation';
import type { ModuleType } from '../types';

interface UserPrivilegesManagerModalProps {
  isOpen: boolean;
  currentUser: AuthUserPublic;
  onClose: () => void;
  onPolicyOrSelfUpdated?: () => void;
}

const CAPABILITY_CONTROLS: Array<{
  key: Exclude<keyof UserPrivileges, 'allModules' | 'allowedModules'>;
  label: string;
  desc: string;
}> = [
  { key: 'canUseChat', label: 'AI Chat & Orchestrator', desc: 'Send prompts and interact with agents' },
  { key: 'canUseVoiceChat', label: 'Hands-Free Voice Chat', desc: 'Connect persistent voice dock & speech' },
  {
    key: 'canRunAutonomousWorkflow',
    label: 'Autonomous Infinite Workflow',
    desc: 'Launch multi-step autonomous loops & pop-out window'
  },
  {
    key: 'canExecuteTerminalAndTools',
    label: 'Terminal, Shell & Host Tools',
    desc: 'Run terminal commands, Termux, and autonomy tools'
  },
  {
    key: 'canAccessSecretsAndWallets',
    label: 'Secrets Vault & Crypto Wallets',
    desc: 'View/manage API keys and wallet modules'
  },
  { key: 'canModifyOSSettings', label: 'OS Settings & Customization', desc: 'Modify desktop themes and shell settings' },
  { key: 'canManageUsers', label: 'Manage Users & Privileges', desc: 'Create users and edit custom privileges' }
];

export const UserPrivilegesManagerModal: React.FC<UserPrivilegesManagerModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onPolicyOrSelfUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'create' | 'policy'>('users');
  const [users, setUsers] = useState<AuthUserPublic[]>([]);
  const [policy, setPolicy] = useState<AuthPolicySettings | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);

  // Selected user editable draft
  const [draftRole, setDraftRole] = useState<AuthRole>('collaborator');
  const [draftStatus, setDraftStatus] = useState<AuthAccountStatus>('active');
  const [draftDisplayName, setDraftDisplayName] = useState('');
  const [draftPrivileges, setDraftPrivileges] = useState<UserPrivileges>(() =>
    clonePrivileges(PRIVILEGE_PRESETS[2].privileges)
  );
  const [resetPasswordInput, setResetPasswordInput] = useState('');

  // Create user form
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<AuthRole>('collaborator');
  const [newStatus, setNewStatus] = useState<AuthAccountStatus>('active');
  const [newPrivileges, setNewPrivileges] = useState<UserPrivileges>(() =>
    clonePrivileges(PRIVILEGE_PRESETS[2].privileges)
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetchUsers();
      setUsers(res.users);
      setPolicy(res.policy);
      setSelectedUserId((prev) => {
        if (prev && res.users.some((u) => u.id === prev)) return prev;
        return res.users[0]?.id || null;
      });
    } catch (err: any) {
      setBanner({ ok: false, text: err?.message || 'Failed to load user directory' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setBanner(null);
      loadData();
    }
  }, [isOpen, loadData]);

  const isArchitect = isExecutiveArchitectUser(currentUser);
  const selectedUser = users.find((u) => u.id === selectedUserId) || null;
  const selectedIsArchitect = isExecutiveArchitectUser(selectedUser);

  useEffect(() => {
    if (!selectedUser) return;
    setDraftRole(selectedUser.role);
    setDraftStatus(selectedUser.status);
    setDraftDisplayName(selectedUser.displayName);
    setDraftPrivileges(clonePrivileges(selectedUser.privileges));
    setResetPasswordInput('');
  }, [selectedUser]);

  if (!isOpen) return null;

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      u.username.toLowerCase().includes(q) ||
      u.displayName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const applyPresetToDraft = (role: AuthRole, target: 'edit' | 'create' | 'policy') => {
    const preset = PRIVILEGE_PRESETS.find((p) => p.id === role) || PRIVILEGE_PRESETS[2];
    const cloned = clonePrivileges(preset.privileges);
    if (target === 'edit') {
      setDraftRole(role);
      setDraftPrivileges(cloned);
    } else if (target === 'create') {
      setNewRole(role);
      setNewPrivileges(cloned);
    } else if (policy) {
      setPolicy({
        ...policy,
        defaultRole: role === 'admin' ? 'collaborator' : role,
        defaultPrivileges: role === 'admin' ? clonePrivileges(PRIVILEGE_PRESETS[2].privileges) : cloned
      });
    }
  };

  const toggleModuleInPrivileges = (
    privs: UserPrivileges,
    modId: ModuleType,
    setter: (next: UserPrivileges) => void
  ) => {
    const has = privs.allowedModules.includes(modId);
    const nextModules = has
      ? privs.allowedModules.filter((m) => m !== modId)
      : [...privs.allowedModules, modId];
    setter({
      ...privs,
      allModules: false,
      allowedModules: nextModules
    });
  };

  const handleSaveSelectedUser = async () => {
    if (!selectedUser) return;
    setSaving(true);
    setBanner(null);
    try {
      const res = await adminUpdateUserAccount(selectedUser.id, {
        displayName: draftDisplayName.trim() || selectedUser.username,
        role: draftRole,
        status: draftStatus,
        privileges: draftPrivileges,
        ...(resetPasswordInput.trim() ? { newPassword: resetPasswordInput.trim() } : {})
      });
      setUsers((prev) => prev.map((u) => (u.id === res.user.id ? res.user : u)));
      setResetPasswordInput('');
      setBanner({ ok: true, text: `Saved custom privileges for ${res.user.username}.` });
      onPolicyOrSelfUpdated?.();
    } catch (err: any) {
      setBanner({ ok: false, text: err?.message || 'Failed to save user changes.' });
    } finally {
      setSaving(false);
    }
  };

  const handlePromoteToAdmin = async () => {
    if (!selectedUser || !isArchitect || selectedIsArchitect) return;
    setSaving(true);
    setBanner(null);
    try {
      const promotedPrivs = clonePrivileges(ADMIN_PRIVILEGES);
      const res = await adminUpdateUserAccount(selectedUser.id, {
        displayName: draftDisplayName.trim() || selectedUser.displayName || selectedUser.username,
        role: 'admin',
        status: 'active',
        privileges: promotedPrivs
      });
      setUsers((prev) => prev.map((u) => (u.id === res.user.id ? res.user : u)));
      setDraftRole('admin');
      setDraftStatus('active');
      setDraftPrivileges(clonePrivileges(res.user.privileges));
      setBanner({ ok: true, text: `Promoted @${res.user.username} to Admin privileges.` });
      onPolicyOrSelfUpdated?.();
    } catch (err: any) {
      setBanner({ ok: false, text: err?.message || 'Failed to promote user to Admin.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSelectedUser = async () => {
    if (!selectedUser) return;
    setSaving(true);
    setBanner(null);
    try {
      await adminDeleteUserAccount(selectedUser.id);
      const remaining = users.filter((u) => u.id !== selectedUser.id);
      setUsers(remaining);
      setSelectedUserId(remaining[0]?.id || null);
      setBanner({ ok: true, text: `Removed user ${selectedUser.username}.` });
    } catch (err: any) {
      setBanner({ ok: false, text: err?.message || 'Failed to delete user.' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setBanner(null);
    try {
      const res = await adminCreateUserAccount({
        username: newUsername.trim(),
        password: newPassword,
        displayName: newDisplayName.trim() || undefined,
        email: newEmail.trim() || undefined,
        role: newRole,
        status: newStatus,
        privileges: newPrivileges
      });
      setUsers((prev) => [...prev, res.user]);
      setSelectedUserId(res.user.id);
      setNewUsername('');
      setNewDisplayName('');
      setNewEmail('');
      setNewPassword('');
      setActiveTab('users');
      setBanner({ ok: true, text: `Created user "${res.user.username}" with custom privileges.` });
    } catch (err: any) {
      setBanner({ ok: false, text: err?.message || 'Failed to create user.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePolicy = async () => {
    if (!policy) return;
    setSaving(true);
    setBanner(null);
    try {
      const res = await adminUpdateAuthPolicy(policy);
      setPolicy(res.policy);
      setBanner({ ok: true, text: 'Global login & access policy updated.' });
      onPolicyOrSelfUpdated?.();
    } catch (err: any) {
      setBanner({ ok: false, text: err?.message || 'Failed to update policy.' });
    } finally {
      setSaving(false);
    }
  };

  const renderPrivilegeEditor = (
    role: AuthRole,
    privs: UserPrivileges,
    onChangeRole: (r: AuthRole) => void,
    onChangePrivs: (p: UserPrivileges) => void,
    allowAdminRole = true
  ) => (
    <div className="space-y-4">
      {/* Role Presets */}
      <div>
        <div className="text-[11px] font-semibold text-zinc-300 mb-1.5">Role Preset</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {PRIVILEGE_PRESETS.filter((p) => allowAdminRole || p.id !== 'admin').map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                onChangeRole(preset.id);
                onChangePrivs(clonePrivileges(preset.privileges));
              }}
              className={`px-2.5 py-2 rounded-lg border text-left transition-colors cursor-pointer ${
                role === preset.id
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-200'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
              }`}
            >
              <div className="text-xs font-bold">{preset.label}</div>
              <div className="text-[10px] text-zinc-400 line-clamp-2 mt-0.5">{preset.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Capability Sliders */}
      <div className="rounded-xl bg-zinc-950/70 border border-zinc-800 p-3 space-y-2">
        <div className="text-[11px] font-semibold text-zinc-200 pb-1 border-b border-zinc-800/80">
          System Capabilities
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {CAPABILITY_CONTROLS.map((cap) => {
            const checked = role === 'admin' ? true : Boolean(privs[cap.key]);
            return (
              <label
                key={cap.key}
                className="flex items-center justify-between gap-2 p-2 rounded-lg bg-zinc-900/70 border border-zinc-800/80 cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium text-zinc-100 truncate">{cap.label}</div>
                  <div className="text-[10px] text-zinc-400 truncate">{cap.desc}</div>
                </div>
                <input
                  type="checkbox"
                  disabled={role === 'admin'}
                  checked={checked}
                  onChange={(e) => onChangePrivs({ ...privs, [cap.key]: e.target.checked })}
                  className="h-4 w-4 accent-amber-500 rounded cursor-pointer disabled:opacity-50"
                />
              </label>
            );
          })}
        </div>
      </div>

      {/* Module Access Checklist */}
      <div className="rounded-xl bg-zinc-950/70 border border-zinc-800 p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-zinc-800/80">
          <div>
            <div className="text-[11px] font-semibold text-zinc-200">Allowed OS Modules</div>
            <div className="text-[10px] text-zinc-400">
              {role === 'admin' || privs.allModules
                ? 'All modules unlocked'
                : `${privs.allowedModules.length} of ${ALL_SOVEREIGN_MODULES.length} modules enabled`}
            </div>
          </div>
          {role !== 'admin' && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  onChangePrivs({ ...privs, allModules: true, allowedModules: [...ALL_SOVEREIGN_MODULES] })
                }
                className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] font-semibold text-zinc-200 cursor-pointer"
              >
                Enable All
              </button>
              <button
                type="button"
                onClick={() => onChangePrivs({ ...privs, allModules: false, allowedModules: ['chat'] })}
                className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] font-semibold text-zinc-300 cursor-pointer"
              >
                Chat Only
              </button>
            </div>
          )}
        </div>

        <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
          {WORKSPACE_GROUPS.map((group) => {
            const mods = ALL_MODULES.filter((m) => m.group === group.id);
            return (
              <div key={group.id} className="space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{group.label}</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {mods.map((mod) => {
                    const enabled =
                      role === 'admin' || privs.allModules || privs.allowedModules.includes(mod.id);
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        disabled={role === 'admin'}
                        onClick={() => toggleModuleInPrivileges(privs, mod.id, onChangePrivs)}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-left text-[11px] transition-colors cursor-pointer disabled:opacity-70 ${
                          enabled
                            ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-200'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 ${
                            enabled
                              ? 'bg-emerald-500 border-emerald-400 text-zinc-950'
                              : 'border-zinc-700 bg-zinc-950'
                          }`}
                        >
                          {enabled && <Check className="w-2.5 h-2.5" />}
                        </span>
                        <span className="truncate">{mod.shortLabel || mod.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[115] bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="w-full max-w-5xl max-h-[90dvh] rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-zinc-800 bg-zinc-950/70 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center text-amber-400 shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-zinc-100 truncate">
                Access Control &amp; Custom User Privileges
              </h2>
              <p className="text-[11px] text-zinc-400 truncate">
                Signed in as <span className="font-mono text-amber-300">{currentUser.username}</span> · Manage local &amp; Google accounts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={loadData}
              className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 cursor-pointer"
              title="Refresh user directory"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
              aria-label="Close Access Control"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 sm:px-5 pt-3 border-b border-zinc-800 bg-zinc-950/30 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'users'
                ? 'border-amber-400 text-amber-200'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Users &amp; Privileges ({users.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'create'
                ? 'border-amber-400 text-amber-200'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create User</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('policy')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'policy'
                ? 'border-amber-400 text-amber-200'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Login Policy</span>
          </button>
        </div>

        {banner && (
          <div
            className={`mx-4 sm:mx-5 mt-3 px-3 py-2 rounded-xl border text-xs flex items-center gap-2 shrink-0 ${
              banner.ok
                ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-200'
                : 'bg-rose-500/10 border-rose-500/35 text-rose-200'
            }`}
          >
            {banner.ok ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{banner.text}</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5">
          {activeTab === 'users' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* User List */}
              <div className="lg:col-span-4 space-y-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter users..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
                  />
                </div>

                <div className="space-y-1.5 max-h-[56dvh] overflow-y-auto pr-1">
                  {filteredUsers.map((u) => {
                    const active = u.id === selectedUserId;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setSelectedUserId(u.id)}
                        className={`w-full p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                          active
                            ? 'bg-amber-500/10 border-amber-500/50'
                            : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {u.role === 'admin' && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                            <span className="text-xs font-bold text-zinc-100 truncate">{u.displayName}</span>
                          </div>
                          <span
                            className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                              u.status === 'active'
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                : u.status === 'pending'
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                            }`}
                          >
                            {u.status}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-zinc-400">
                          <span className="font-mono truncate">@{u.username}</span>
                          <span className="text-[10px] uppercase font-mono text-zinc-500 shrink-0">
                            {u.authProvider} · {u.role}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected User Editor */}
              <div className="lg:col-span-8">
                {selectedUser ? (
                  <div className="rounded-xl bg-zinc-950/50 border border-zinc-800 p-4 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-zinc-100">{selectedUser.displayName}</h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300">
                            {selectedUser.authProvider === 'google' ? 'Google Authority' : 'Local Account'}
                          </span>
                          {selectedIsArchitect && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/45 text-amber-200 flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              EXECUTIVE ARCHITECT (LOCKED)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 font-mono">
                          @{selectedUser.username} {selectedUser.email ? `· ${selectedUser.email}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {isArchitect && !selectedIsArchitect && selectedUser.role !== 'admin' && (
                          <button
                            type="button"
                            onClick={handlePromoteToAdmin}
                            disabled={saving}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500 border border-amber-400/50 text-amber-200 hover:text-zinc-950 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                            title="Promote this account to Admin"
                          >
                            <Crown className="w-3.5 h-3.5" />
                            <span>Promote to Admin</span>
                          </button>
                        )}
                        <select
                          value={draftStatus}
                          disabled={selectedIsArchitect}
                          onChange={(e) => setDraftStatus(e.target.value as AuthAccountStatus)}
                          aria-label="Account status"
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 cursor-pointer disabled:opacity-50"
                        >
                          <option value="active">Active</option>
                          <option value="pending">Pending Approval</option>
                          <option value="suspended">Suspended</option>
                        </select>
                        {selectedUser.id !== currentUser.id && !selectedIsArchitect && (
                          <button
                            type="button"
                            onClick={handleDeleteSelectedUser}
                            disabled={saving}
                            className="p-2 rounded-lg bg-rose-950/60 hover:bg-rose-600 border border-rose-500/40 text-rose-200 cursor-pointer disabled:opacity-50"
                            title="Delete user account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">Display Name</label>
                        <input
                          type="text"
                          value={draftDisplayName}
                          onChange={(e) => setDraftDisplayName(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100"
                        />
                      </div>
                      {selectedUser.authProvider === 'local' && (
                        <div>
                          <label className="block text-[11px] text-zinc-400 mb-1">
                            Reset Password (leave blank to keep)
                          </label>
                          <input
                            type="password"
                            value={resetPasswordInput}
                            onChange={(e) => setResetPasswordInput(e.target.value)}
                            placeholder="New password (8+ chars)"
                            className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100"
                          />
                        </div>
                      )}
                    </div>

                    {!selectedIsArchitect &&
                      renderPrivilegeEditor(
                        draftRole,
                        draftPrivileges,
                        (r) => applyPresetToDraft(r, 'edit'),
                        setDraftPrivileges,
                        isArchitect
                      )}

                    <div className="flex justify-end pt-2 border-t border-zinc-800">
                      <button
                        type="button"
                        onClick={handleSaveSelectedUser}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs cursor-pointer disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>Save User Privileges</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-zinc-500">Select a user to manage privileges.</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'create' && (
            <form onSubmit={handleCreateUser} className="max-w-3xl mx-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="e.g. alex.dev"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Password * (min 8 chars)</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Strong password"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder="Full name or handle"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Email (optional)</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="user@domain.com"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
                  />
                </div>
              </div>

              {renderPrivilegeEditor(
                newRole,
                newPrivileges,
                (r) => applyPresetToDraft(r, 'create'),
                setNewPrivileges,
                isArchitect
              )}

              <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as AuthAccountStatus)}
                  className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
                >
                  <option value="active">Status: Active immediately</option>
                  <option value="pending">Status: Pending approval</option>
                </select>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                  <span>Create Account</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'policy' && policy && (
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="rounded-xl bg-zinc-950/70 border border-zinc-800 p-4 space-y-3">
                <label className="flex items-center justify-between gap-3 cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-zinc-100">Require Login Gate on Boot</div>
                    <div className="text-[11px] text-zinc-400">
                      Visitors must sign in with Username/Password or Google before entering the OS.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={policy.requireLoginOnBoot}
                    onChange={(e) => setPolicy({ ...policy, requireLoginOnBoot: e.target.checked })}
                    className="h-4 w-4 accent-amber-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-800/80 cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-zinc-100">Allow Public Account Registration</div>
                    <div className="text-[11px] text-zinc-400">
                      Let new users create their own username &amp; password from the login screen.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={policy.allowSelfRegistration}
                    onChange={(e) => setPolicy({ ...policy, allowSelfRegistration: e.target.checked })}
                    className="h-4 w-4 accent-amber-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-800/80 cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-zinc-100">Require Admin Approval for New Sign-Ups</div>
                    <div className="text-[11px] text-zinc-400">
                      New local or Google accounts start as Pending until you approve them and assign privileges.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={policy.newUsersRequireApproval}
                    onChange={(e) => setPolicy({ ...policy, newUsersRequireApproval: e.target.checked })}
                    className="h-4 w-4 accent-amber-500 cursor-pointer"
                  />
                </label>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-zinc-200">Default Privileges for New Accounts</div>
                {renderPrivilegeEditor(
                  policy.defaultRole,
                  policy.defaultPrivileges,
                  (r) => applyPresetToDraft(r, 'policy'),
                  (p) => setPolicy({ ...policy, defaultPrivileges: p }),
                  false
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={handleSavePolicy}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Global Policy</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
