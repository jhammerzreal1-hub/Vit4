/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 * (TWENTY 47 PROTOCOL - GENESIS NODE / LYSANDER CORE EULA / H-FID Forensic License v1.1).
 */

import type { ModuleType } from './index';

export type AuthRole = 'admin' | 'operator' | 'collaborator' | 'viewer';
export type AuthAccountStatus = 'active' | 'pending' | 'suspended';
export type AuthProviderKind = 'local' | 'google';
export type AuthorityTier = 'executive-architect' | 'entity-intelligence' | 'delegated-admin' | 'standard';

export interface UserPrivileges {
  allModules: boolean;
  allowedModules: ModuleType[];
  canUseChat: boolean;
  canUseVoiceChat: boolean;
  canRunAutonomousWorkflow: boolean;
  canExecuteTerminalAndTools: boolean;
  canAccessSecretsAndWallets: boolean;
  canModifyOSSettings: boolean;
  canManageUsers: boolean;
}

export interface AuthUserPublic {
  id: string;
  username: string;
  email: string;
  displayName: string;
  preferredName?: string;
  preferredNameConfirmed?: boolean;
  workspaceRoot?: string;
  photoURL?: string;
  authProvider: AuthProviderKind;
  firebaseUid?: string;
  role: AuthRole;
  status: AuthAccountStatus;
  isExecutiveArchitect?: boolean;
  authorityTier?: AuthorityTier;
  privileges: UserPrivileges;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface AuthPolicySettings {
  requireLoginOnBoot: boolean;
  allowSelfRegistration: boolean;
  newUsersRequireApproval: boolean;
  defaultRole: AuthRole;
  defaultPrivileges: UserPrivileges;
  entityIntelligenceDelegationEnabled?: boolean;
  systemLockdownMode?: boolean;
}

export interface AdminAuditEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorUsername: string;
  actorTier: AuthorityTier;
  action: string;
  target: string;
  details: string;
  outcome: 'allowed' | 'blocked';
}

export interface ActiveSessionSummary {
  sessionId: string;
  userId: string;
  username: string;
  displayName: string;
  role: AuthRole;
  isExecutiveArchitect: boolean;
  createdAt: number;
  expiresAt: number;
}

export interface AuthSessionResponse {
  authenticated: boolean;
  user: AuthUserPublic | null;
  token?: string;
  adminClaimed: boolean;
  envAdminConfigured: boolean;
  policy: AuthPolicySettings;
}

export function isExecutiveArchitectUser(user?: AuthUserPublic | null): boolean {
  if (!user) return false;
  if (user.isExecutiveArchitect || user.authorityTier === 'executive-architect') return true;
  const email = (user.email || '').trim().toLowerCase();
  const uname = (user.username || '').trim().toLowerCase();
  if (user.authProvider === 'google' && email === 'jhammerzreal1@gmail.com') return true;
  return uname === 'jhammerz' && user.role === 'admin';
}

export function canAccessAdminCommandCenter(user?: AuthUserPublic | null): boolean {
  if (!user || user.status !== 'active') return false;
  return Boolean(isExecutiveArchitectUser(user) || user.role === 'admin' || user.privileges?.canManageUsers);
}

export const ALL_SOVEREIGN_MODULES: ModuleType[] = [
  'chat',
  'war-room',
  'browser',
  'functions',
  'termux',
  'scratchpad',
  'hitl',
  'music',
  'video',
  'image',
  'search',
  'maps',
  'transcribe',
  'live',
  'vault',
  'github',
  'osint',
  'burner-mail',
  'infinite-sim',
  'projects',
  'presets',
  'audit',
  'swarm-test',
  'packager',
  'drive',
  'tasks',
  'knowledge-graph',
  'tool-shed',
  'autonomy-supervisor',
  'download-models',
  'universal-installer',
  'api-secrets',
  'integrations',
  'spatial-arena',
  'agent-dev-kit',
  'ai-genesis-distillery',
  'emulator-modder',
  'macro-telemetry',
  'world-start',
  'file-manager',
  'terminal',
  'task-manager',
  'os-settings',
  'crypto-wallet',
  'grant-hunter',
  'transfer-hub',
  'batch-processor',
  'lora-mesh',
  'admin-command'
];

export const ADMIN_PRIVILEGES: UserPrivileges = {
  allModules: true,
  allowedModules: [...ALL_SOVEREIGN_MODULES],
  canUseChat: true,
  canUseVoiceChat: true,
  canRunAutonomousWorkflow: true,
  canExecuteTerminalAndTools: true,
  canAccessSecretsAndWallets: true,
  canModifyOSSettings: true,
  canManageUsers: true
};

export const OPERATOR_PRIVILEGES: UserPrivileges = {
  allModules: false,
  allowedModules: [
    'chat',
    'lora-mesh',
    'browser',
    'search',
    'maps',
    'image',
    'video',
    'music',
    'transcribe',
    'live',
    'vault',
    'scratchpad',
    'projects',
    'presets',
    'knowledge-graph',
    'file-manager',
    'terminal',
    'task-manager',
    'os-settings',
    'spatial-arena',
    'war-room',
    'autonomy-supervisor',
    'batch-processor'
  ],
  canUseChat: true,
  canUseVoiceChat: true,
  canRunAutonomousWorkflow: true,
  canExecuteTerminalAndTools: true,
  canAccessSecretsAndWallets: false,
  canModifyOSSettings: true,
  canManageUsers: false
};

export const COLLABORATOR_PRIVILEGES: UserPrivileges = {
  allModules: false,
  allowedModules: [
    'chat',
    'lora-mesh',
    'browser',
    'search',
    'maps',
    'image',
    'music',
    'transcribe',
    'live',
    'vault',
    'scratchpad',
    'projects',
    'presets',
    'os-settings'
  ],
  canUseChat: true,
  canUseVoiceChat: true,
  canRunAutonomousWorkflow: false,
  canExecuteTerminalAndTools: false,
  canAccessSecretsAndWallets: false,
  canModifyOSSettings: false,
  canManageUsers: false
};

export const VIEWER_PRIVILEGES: UserPrivileges = {
  allModules: false,
  allowedModules: ['chat', 'lora-mesh', 'browser', 'search', 'vault', 'scratchpad'],
  canUseChat: true,
  canUseVoiceChat: false,
  canRunAutonomousWorkflow: false,
  canExecuteTerminalAndTools: false,
  canAccessSecretsAndWallets: false,
  canModifyOSSettings: false,
  canManageUsers: false
};

export const PRIVILEGE_PRESETS: Array<{
  id: AuthRole;
  label: string;
  description: string;
  privileges: UserPrivileges;
}> = [
  {
    id: 'admin',
    label: 'Root Admin',
    description: 'Full unrestricted OS modules, user management, secrets & terminal access.',
    privileges: ADMIN_PRIVILEGES
  },
  {
    id: 'operator',
    label: 'Power Operator',
    description: 'Chat, voice, autonomous workflow, browser, creative studio & terminal (no secrets/users).',
    privileges: OPERATOR_PRIVILEGES
  },
  {
    id: 'collaborator',
    label: 'Standard User',
    description: 'Chat, voice, search, browser, creative tools & vault (no terminal, workflow, or secrets).',
    privileges: COLLABORATOR_PRIVILEGES
  },
  {
    id: 'viewer',
    label: 'Restricted Viewer',
    description: 'Read-oriented chat, search, browser & vault only.',
    privileges: VIEWER_PRIVILEGES
  }
];

export function clonePrivileges(p: UserPrivileges): UserPrivileges {
  return {
    allModules: Boolean(p.allModules),
    allowedModules: Array.isArray(p.allowedModules) ? [...p.allowedModules] : [],
    canUseChat: Boolean(p.canUseChat),
    canUseVoiceChat: Boolean(p.canUseVoiceChat),
    canRunAutonomousWorkflow: Boolean(p.canRunAutonomousWorkflow),
    canExecuteTerminalAndTools: Boolean(p.canExecuteTerminalAndTools),
    canAccessSecretsAndWallets: Boolean(p.canAccessSecretsAndWallets),
    canModifyOSSettings: Boolean(p.canModifyOSSettings),
    canManageUsers: Boolean(p.canManageUsers)
  };
}

export function canUserAccessModule(user: AuthUserPublic | null, mod: ModuleType): boolean {
  if (!user) return false;
  if (user.status !== 'active') return false;
  if (user.role === 'admin' || user.privileges.allModules) return true;
  if ((mod === 'api-secrets' || mod === 'crypto-wallet') && !user.privileges.canAccessSecretsAndWallets) {
    return false;
  }
  if ((mod === 'terminal' || mod === 'termux' || mod === 'tool-shed') && !user.privileges.canExecuteTerminalAndTools) {
    return false;
  }
  return user.privileges.allowedModules.includes(mod);
}
