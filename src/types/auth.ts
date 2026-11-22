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

export type TierBadgeColor = 'zinc' | 'emerald' | 'cyan' | 'amber' | 'violet' | 'rose';
export type TierBillingMode = 'free' | 'monthly' | 'one-time' | 'both';
export type SupportedBillingChain = 'base' | 'ethereum' | 'polygon' | 'arbitrum' | 'base-sepolia';
export type SupportedBillingCryptoToken = 'USDC' | 'ETH';
export type UserSubscriptionStatus = 'free' | 'active' | 'lifetime' | 'expired' | 'admin-granted';

export interface DailyAiQuotaUsage {
  usedToday: number;
  dailyLimit: number; // 0 = unlimited
  remaining: number | null;
  dayKey: string;
}

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
  // Granular multi-tenant & tiered OS privileges
  canUseBurnerMail?: boolean;
  canUseInfiniteSim?: boolean;
  canAccessGrantHunter?: boolean;
  canBringOwnKeys?: boolean;
  canAccessSystemCore?: boolean;
  maxDailyAiRequests?: number;
}

export interface TierPricingConfig {
  billingMode: TierBillingMode;
  monthlyUsdCents: number;
  oneTimeUsdCents: number;
  cryptoUsdAmount: number;
  acceptedCryptoChains: SupportedBillingChain[];
  acceptedCryptoTokens: SupportedBillingCryptoToken[];
  stripePriceId?: string;
}

export type SupporterFeedbackSentiment = 'praise' | 'critique' | 'suggestion' | 'note';

export interface SupporterBoardEntry {
  id: string;
  entryKind: 'donation' | 'founder-tier';
  isAnonymous: boolean;
  authorDisplayName: string;
  tierId?: string;
  tierName?: string;
  tierBadgeColor?: TierBadgeColor;
  amountUsd: number;
  currency: string;
  nativeAmount?: string;
  chain?: SupportedBillingChain;
  paymentMethod: 'stripe-card' | 'crypto-onchain' | 'tier-membership' | 'admin-grant';
  feedbackCategory: SupporterFeedbackSentiment;
  message: string;
  referenceId?: string;
  explorerUrl?: string;
  verified: boolean;
  isOwnEntry?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface SupporterBoardSummary {
  totalEntries: number;
  totalDonationsUsd: number;
  donationCount: number;
  founderCount: number;
  critiqueCount: number;
  praiseCount: number;
  suggestionCount: number;
}

export interface UserTierDefinition {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  badgeColor: TierBadgeColor;
  rank: number;
  baseRole: AuthRole;
  isBuiltIn: boolean;
  isPublic: boolean;
  isMonetized: boolean;
  isFounderTier?: boolean;
  pricing: TierPricingConfig;
  privileges: UserPrivileges;
  features: string[];
  createdAt: string;
  updatedAt: string;
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
  tierId?: string;
  tierName?: string;
  tierBadgeColor?: TierBadgeColor;
  subscriptionStatus?: UserSubscriptionStatus;
  tierExpiresAt?: string | null;
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
  defaultTierId?: string;
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
  tierName?: string;
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
  tiers?: UserTierDefinition[];
  usage?: DailyAiQuotaUsage | null;
}

export interface BillingConfigPublic {
  fiatStripeEnabled: boolean;
  stripeSecretConfigured: boolean;
  stripeWebhookSecretConfigured: boolean;
  cryptoEnabled: boolean;
  treasuryEvmAddress: string;
  enabledChains: SupportedBillingChain[];
  enabledTokens: SupportedBillingCryptoToken[];
  updatedAt: string;
}

export interface CryptoPaymentInvoice {
  id: string;
  invoiceKind?: 'tier' | 'donation';
  userId: string;
  username: string;
  tierId: string;
  tierName: string;
  billingCycle: 'monthly' | 'one-time';
  chain: SupportedBillingChain;
  chainId: number;
  chainLabel: string;
  token: SupportedBillingCryptoToken;
  tokenContractAddress: string | null;
  tokenDecimals: number;
  treasuryAddress: string;
  usdAmount: number;
  ethSpotPriceUsd?: number;
  expectedAmountDisplay: string;
  expectedAmountUnits: string;
  expectedMinUnits: string;
  status: 'pending' | 'settled' | 'expired' | 'cancelled';
  eip681Uri?: string;
  confirmations?: number;
  txHash?: string;
  explorerUrl?: string;
  donationIsAnonymous?: boolean;
  donationAuthorName?: string;
  donationFeedbackCategory?: SupporterFeedbackSentiment;
  donationMessage?: string;
  createdAt: string;
  expiresAt: string;
  settledAt?: string;
}

export interface BillingLedgerRecord {
  id: string;
  entryType?: 'tier' | 'donation';
  userId: string;
  username: string;
  tierId: string;
  tierName: string;
  method: 'stripe-card' | 'crypto-onchain' | 'admin-grant';
  billingCycle: 'monthly' | 'one-time' | 'grant';
  amountUsd: number;
  currency: string;
  nativeAmount?: string;
  chain?: SupportedBillingChain;
  referenceId: string;
  explorerUrl?: string;
  status: 'settled' | 'refunded' | 'cancelled';
  createdAt: string;
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

// Core system modules strictly restricted to Executive Architect / System Core privilege
export const SYSTEM_CORE_ONLY_MODULES: ModuleType[] = [
  'admin-command',
  'transfer-hub',
  'audit',
  'swarm-test'
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
  canManageUsers: true,
  canUseBurnerMail: true,
  canUseInfiniteSim: true,
  canAccessGrantHunter: true,
  canBringOwnKeys: true,
  canAccessSystemCore: true,
  maxDailyAiRequests: 0
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
    'batch-processor',
    'api-secrets',
    'crypto-wallet',
    'burner-mail'
  ],
  canUseChat: true,
  canUseVoiceChat: true,
  canRunAutonomousWorkflow: true,
  canExecuteTerminalAndTools: true,
  canAccessSecretsAndWallets: true,
  canModifyOSSettings: true,
  canManageUsers: false,
  canUseBurnerMail: true,
  canUseInfiniteSim: false,
  canAccessGrantHunter: true,
  canBringOwnKeys: true,
  canAccessSystemCore: false,
  maxDailyAiRequests: 500
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
    'file-manager',
    'os-settings',
    'api-secrets'
  ],
  canUseChat: true,
  canUseVoiceChat: true,
  canRunAutonomousWorkflow: false,
  canExecuteTerminalAndTools: false,
  canAccessSecretsAndWallets: false,
  canModifyOSSettings: true,
  canManageUsers: false,
  canUseBurnerMail: false,
  canUseInfiniteSim: false,
  canAccessGrantHunter: false,
  canBringOwnKeys: true,
  canAccessSystemCore: false,
  maxDailyAiRequests: 100
};

export const VIEWER_PRIVILEGES: UserPrivileges = {
  allModules: false,
  allowedModules: ['chat', 'lora-mesh', 'browser', 'search', 'vault', 'scratchpad', 'os-settings'],
  canUseChat: true,
  canUseVoiceChat: false,
  canRunAutonomousWorkflow: false,
  canExecuteTerminalAndTools: false,
  canAccessSecretsAndWallets: false,
  canModifyOSSettings: false,
  canManageUsers: false,
  canUseBurnerMail: false,
  canUseInfiniteSim: false,
  canAccessGrantHunter: false,
  canBringOwnKeys: false,
  canAccessSystemCore: false,
  maxDailyAiRequests: 40
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
    description: 'Chat, voice, autonomous workflow, browser, personal wallet/vault, burner mail & terminal.',
    privileges: OPERATOR_PRIVILEGES
  },
  {
    id: 'collaborator',
    label: 'Standard User',
    description: 'Fresh personal workspace, chat, voice, search, browser, creative tools & own API vault.',
    privileges: COLLABORATOR_PRIVILEGES
  },
  {
    id: 'viewer',
    label: 'Restricted Viewer',
    description: 'Read-oriented chat, search, browser & personal scratchpad only.',
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
    canManageUsers: Boolean(p.canManageUsers),
    canUseBurnerMail: Boolean(p.canUseBurnerMail ?? p.allowedModules?.includes('burner-mail')),
    canUseInfiniteSim: Boolean(p.canUseInfiniteSim ?? p.allowedModules?.includes('infinite-sim')),
    canAccessGrantHunter: Boolean(p.canAccessGrantHunter ?? p.allowedModules?.includes('grant-hunter')),
    canBringOwnKeys: Boolean(p.canBringOwnKeys ?? p.canAccessSecretsAndWallets ?? true),
    canAccessSystemCore: Boolean(p.canAccessSystemCore),
    maxDailyAiRequests: typeof p.maxDailyAiRequests === 'number' && p.maxDailyAiRequests >= 0 ? p.maxDailyAiRequests : 0
  };
}

export function canUserAccessModule(user: AuthUserPublic | null, mod: ModuleType): boolean {
  if (!user) return false;
  if (user.status !== 'active') return false;
  if (isExecutiveArchitectUser(user) || user.role === 'admin') return true;
  if (mod === 'admin-command' && !user.privileges.canManageUsers) return false;
  if (SYSTEM_CORE_ONLY_MODULES.includes(mod) && !user.privileges.canAccessSystemCore) {
    return false;
  }
  if (user.privileges.allModules) return true;
  if (mod === 'crypto-wallet' && !user.privileges.canAccessSecretsAndWallets) {
    return false;
  }
  if (mod === 'api-secrets' && !user.privileges.canAccessSecretsAndWallets && !user.privileges.canBringOwnKeys) {
    return false;
  }
  if ((mod === 'terminal' || mod === 'termux' || mod === 'tool-shed') && !user.privileges.canExecuteTerminalAndTools) {
    return false;
  }
  if (mod === 'burner-mail' && user.privileges.canUseBurnerMail === false) {
    return false;
  }
  if (mod === 'infinite-sim' && user.privileges.canUseInfiniteSim === false) {
    return false;
  }
  if (mod === 'grant-hunter' && user.privileges.canAccessGrantHunter === false) {
    return false;
  }
  return user.privileges.allowedModules.includes(mod);
}
