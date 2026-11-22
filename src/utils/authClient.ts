/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 * (TWENTY 47 PROTOCOL - GENESIS NODE / LYSANDER CORE EULA / H-FID Forensic License v1.1).
 */

import type {
  AuthAccountStatus,
  AuthPolicySettings,
  AuthRole,
  AuthSessionResponse,
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
  TierBadgeColor,
  TierPricingConfig,
  UserPrivileges,
  UserTierDefinition
} from '../types/auth';

// Strictly in-memory session bearer token (never written to localStorage or sessionStorage)
let inMemorySessionToken: string | null = null;

export function getAuthBearerToken(): string | null {
  return inMemorySessionToken;
}

export function setAuthBearerToken(token: string | null): void {
  inMemorySessionToken = token && token.trim() ? token.trim() : null;
}

export function buildAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Requested-With': 'SovereignOS',
    ...(extra || {})
  };
  if (inMemorySessionToken && !headers.Authorization && !headers.authorization) {
    headers.Authorization = `Bearer ${inMemorySessionToken}`;
  }
  return headers;
}

/**
 * Authenticated fetch wrapper for same-origin /api/* endpoints.
 * Explicitly attaches credentials:'include', X-Requested-With, and the
 * in-memory Authorization Bearer token so calls succeed even in sandboxed
 * iframes where third-party cookies are blocked and window.fetch is read-only.
 */
export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(
    init?.headers || (input instanceof Request ? input.headers : undefined)
  );
  if (!headers.has('X-Requested-With')) {
    headers.set('X-Requested-With', 'SovereignOS');
  }
  if (inMemorySessionToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${inMemorySessionToken}`);
  }
  return fetch(input, {
    ...init,
    credentials: init?.credentials ?? 'include',
    headers
  });
}

let globalAuthFetchInstalled = false;

/**
 * Safely wraps window.fetch (only when configurable/writable) to attach the
 * in-memory Bearer token, credentials, and CSRF header on same-origin /api/*
 * calls. Gracefully no-ops in sandboxed runtimes where window.fetch is locked.
 */
export function installGlobalApiAuthInterceptor(): void {
  if (globalAuthFetchInstalled || typeof window === 'undefined' || typeof window.fetch !== 'function') {
    return;
  }
  globalAuthFetchInstalled = true;
  try {
    const nativeFetch = window.fetch.bind(window);
    const wrappedFetch: typeof window.fetch = (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> => {
      try {
        const rawUrl =
          typeof input === 'string'
            ? input
            : input instanceof URL
            ? input.toString()
            : input instanceof Request
            ? input.url
            : '';
        const isSameOriginApi =
          rawUrl.startsWith('/api/') ||
          (window.location?.origin && rawUrl.startsWith(`${window.location.origin}/api/`));

        if (isSameOriginApi) {
          const headers = new Headers(
            init?.headers || (input instanceof Request ? input.headers : undefined)
          );
          if (!headers.has('X-Requested-With')) {
            headers.set('X-Requested-With', 'SovereignOS');
          }
          if (inMemorySessionToken && !headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${inMemorySessionToken}`);
          }
          return nativeFetch(input, {
            ...init,
            credentials: init?.credentials ?? 'include',
            headers
          });
        }
      } catch {
        // Fall back safely to native fetch
      }
      return nativeFetch(input, init);
    };

    const desc =
      Object.getOwnPropertyDescriptor(window, 'fetch') ||
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(window), 'fetch');

    if (!desc || desc.configurable) {
      Object.defineProperty(window, 'fetch', {
        configurable: true,
        writable: true,
        enumerable: desc?.enumerable ?? true,
        value: wrappedFetch
      });
    } else if (desc.writable) {
      window.fetch = wrappedFetch;
    }
  } catch {
    // Host runtime locks window.fetch — modules also call buildAuthHeaders() explicitly
  }
}

async function authFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: buildAuthHeaders({
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string> | undefined)
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export async function fetchAuthSession(): Promise<AuthSessionResponse> {
  const data = await authFetch<AuthSessionResponse & { success: boolean }>('/api/auth/session', {
    method: 'GET'
  });
  return data;
}

const SAVED_LOGIN_HINT_KEY = 'sovereign_os_saved_login_hint_v1';

export interface SavedLoginHint {
  username: string;
  displayName?: string;
  rememberMe: boolean;
}

export function loadSavedLoginHint(): SavedLoginHint | null {
  try {
    const raw = localStorage.getItem(SAVED_LOGIN_HINT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.username === 'string' && parsed.username.trim()) {
      return {
        username: parsed.username.trim(),
        displayName: typeof parsed.displayName === 'string' ? parsed.displayName : undefined,
        rememberMe: parsed.rememberMe !== false
      };
    }
  } catch {}
  return null;
}

export function saveLoginHint(hint: SavedLoginHint | null): void {
  try {
    if (!hint || !hint.username.trim()) {
      localStorage.removeItem(SAVED_LOGIN_HINT_KEY);
      return;
    }
    // Security: ONLY store non-sensitive username & display hint — NEVER password or token
    localStorage.setItem(
      SAVED_LOGIN_HINT_KEY,
      JSON.stringify({
        username: hint.username.trim(),
        displayName: hint.displayName || undefined,
        rememberMe: hint.rememberMe !== false
      })
    );
  } catch {}
}

export async function claimOwnerAdmin(payload: {
  username: string;
  password: string;
  displayName?: string;
  email?: string;
  rememberMe?: boolean;
}): Promise<AuthSessionResponse> {
  const data = await authFetch<AuthSessionResponse & { success: boolean }>('/api/auth/claim-admin', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (data.token) setAuthBearerToken(data.token);
  return data;
}

export async function registerLocalAccount(payload: {
  username: string;
  password: string;
  displayName?: string;
  email?: string;
  rememberMe?: boolean;
}): Promise<AuthSessionResponse> {
  const data = await authFetch<AuthSessionResponse & { success: boolean }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (data.token) setAuthBearerToken(data.token);
  return data;
}

export async function loginWithUsernamePassword(payload: {
  username: string;
  password: string;
  rememberMe?: boolean;
}): Promise<AuthSessionResponse> {
  const data = await authFetch<AuthSessionResponse & { success: boolean }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (data.token) setAuthBearerToken(data.token);
  return data;
}

export async function loginWithGoogleToken(
  idToken: string,
  rememberMe = true
): Promise<AuthSessionResponse> {
  const data = await authFetch<AuthSessionResponse & { success: boolean }>('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken, rememberMe })
  });
  if (data.token) setAuthBearerToken(data.token);
  return data;
}

export async function logoutSession(): Promise<void> {
  try {
    await authFetch('/api/auth/logout', { method: 'POST', body: '{}' });
  } finally {
    setAuthBearerToken(null);
  }
}

export async function adminFetchUsers(): Promise<{ users: AuthUserPublic[]; policy: AuthPolicySettings }> {
  return authFetch<{ success: boolean; users: AuthUserPublic[]; policy: AuthPolicySettings }>(
    '/api/auth/admin/users',
    { method: 'GET' }
  );
}

export async function adminCreateUserAccount(payload: {
  username: string;
  password: string;
  displayName?: string;
  email?: string;
  role: AuthRole;
  status: AuthAccountStatus;
  privileges: UserPrivileges;
  tierId?: string;
}): Promise<{ user: AuthUserPublic }> {
  return authFetch<{ success: boolean; user: AuthUserPublic }>('/api/auth/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function adminUpdateUserAccount(
  userId: string,
  patch: {
    displayName?: string;
    email?: string;
    role?: AuthRole;
    status?: AuthAccountStatus;
    privileges?: UserPrivileges;
    tierId?: string;
    newPassword?: string;
  }
): Promise<{ user: AuthUserPublic }> {
  return authFetch<{ success: boolean; user: AuthUserPublic }>(
    `/api/auth/admin/users/${encodeURIComponent(userId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(patch)
    }
  );
}

export async function adminDeleteUserAccount(userId: string): Promise<void> {
  await authFetch(`/api/auth/admin/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE'
  });
}

export async function adminUpdateAuthPolicy(
  patch: Partial<AuthPolicySettings>
): Promise<{ policy: AuthPolicySettings }> {
  return authFetch<{ success: boolean; policy: AuthPolicySettings }>('/api/auth/admin/policy', {
    method: 'PATCH',
    body: JSON.stringify(patch)
  });
}

// =========================================================================
// CUSTOM USER TIERS & REAL FIAT / CRYPTO MONETIZATION CLIENT
// =========================================================================

export async function fetchPublicTiers(): Promise<{
  tiers: UserTierDefinition[];
  defaultTierId?: string;
}> {
  return authFetch<{
    success: boolean;
    tiers: UserTierDefinition[];
    defaultTierId?: string;
  }>('/api/tiers', { method: 'GET' });
}

export async function adminFetchTiers(): Promise<{
  tiers: UserTierDefinition[];
  defaultTierId?: string;
}> {
  return authFetch<{
    success: boolean;
    tiers: UserTierDefinition[];
    defaultTierId?: string;
  }>('/api/auth/admin/tiers', { method: 'GET' });
}

export async function adminCreateTier(payload: {
  name: string;
  slug?: string;
  tagline?: string;
  description?: string;
  badgeColor?: TierBadgeColor;
  rank?: number;
  baseRole?: AuthRole;
  isPublic?: boolean;
  isMonetized?: boolean;
  isFounderTier?: boolean;
  pricing?: Partial<TierPricingConfig>;
  privileges: UserPrivileges;
  features?: string[];
}): Promise<{ tier: UserTierDefinition }> {
  return authFetch<{ success: boolean; tier: UserTierDefinition }>('/api/auth/admin/tiers', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function adminUpdateTier(
  tierId: string,
  patch: {
    name?: string;
    slug?: string;
    tagline?: string;
    description?: string;
    badgeColor?: TierBadgeColor;
    rank?: number;
    baseRole?: AuthRole;
    isPublic?: boolean;
    isMonetized?: boolean;
    isFounderTier?: boolean;
    pricing?: Partial<TierPricingConfig>;
    privileges?: UserPrivileges;
    features?: string[];
    syncExistingUsers?: boolean;
  }
): Promise<{ tier: UserTierDefinition }> {
  return authFetch<{ success: boolean; tier: UserTierDefinition }>(
    `/api/auth/admin/tiers/${encodeURIComponent(tierId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(patch)
    }
  );
}

export async function adminDeleteTier(tierId: string): Promise<void> {
  await authFetch(`/api/auth/admin/tiers/${encodeURIComponent(tierId)}`, {
    method: 'DELETE'
  });
}

export async function adminAssignUserTier(
  userId: string,
  payload: {
    tierId: string;
    subscriptionStatus?: 'free' | 'active' | 'lifetime' | 'expired' | 'admin-granted';
    tierExpiresAt?: string | null;
  }
): Promise<{ user: AuthUserPublic; tier: UserTierDefinition }> {
  return authFetch<{ success: boolean; user: AuthUserPublic; tier: UserTierDefinition }>(
    `/api/auth/admin/users/${encodeURIComponent(userId)}/assign-tier`,
    {
      method: 'POST',
      body: JSON.stringify(payload)
    }
  );
}

export interface BillingStatusResponse {
  billing: BillingConfigPublic;
  currentTier: {
    tierId?: string;
    tierName?: string;
    tierBadgeColor?: TierBadgeColor;
    subscriptionStatus?: string;
    tierExpiresAt?: string | null;
    isFounderTier?: boolean;
  };
  founderEligible?: boolean;
  usage?: DailyAiQuotaUsage | null;
  tiers: UserTierDefinition[];
  ledger: BillingLedgerRecord[];
  pendingInvoices: CryptoPaymentInvoice[];
  supporterBoard?: SupporterBoardEntry[];
  supporterBoardSummary?: SupporterBoardSummary;
}

export async function fetchBillingStatus(): Promise<BillingStatusResponse> {
  return authFetch<BillingStatusResponse & { success: boolean }>('/api/billing/status', {
    method: 'GET'
  });
}

export async function fetchSupporterBoard(): Promise<{
  entries: SupporterBoardEntry[];
  summary: SupporterBoardSummary;
}> {
  return authFetch<{
    success: boolean;
    entries: SupporterBoardEntry[];
    summary: SupporterBoardSummary;
  }>('/api/supporter-board', { method: 'GET' });
}

export async function createStripeCheckout(payload: {
  tierId: string;
  billingCycle: 'monthly' | 'one-time';
}): Promise<{ sessionId: string; url: string }> {
  return authFetch<{ success: boolean; sessionId: string; url: string }>(
    '/api/billing/stripe/checkout',
    {
      method: 'POST',
      body: JSON.stringify(payload)
    }
  );
}

export async function createDonationStripeCheckout(payload: {
  amountUsd: number;
  isAnonymous: boolean;
  authorName?: string;
  feedbackCategory: SupporterFeedbackSentiment;
  message?: string;
}): Promise<{ sessionId: string; url: string }> {
  return authFetch<{ success: boolean; sessionId: string; url: string }>(
    '/api/billing/donate/stripe/checkout',
    {
      method: 'POST',
      body: JSON.stringify(payload)
    }
  );
}

export async function createDonationCryptoInvoice(payload: {
  amountUsd: number;
  chain: SupportedBillingChain;
  token: SupportedBillingCryptoToken;
  isAnonymous: boolean;
  authorName?: string;
  feedbackCategory: SupporterFeedbackSentiment;
  message?: string;
}): Promise<{ invoice: CryptoPaymentInvoice }> {
  return authFetch<{ success: boolean; invoice: CryptoPaymentInvoice }>(
    '/api/billing/donate/crypto/invoice',
    {
      method: 'POST',
      body: JSON.stringify(payload)
    }
  );
}

export async function postFounderSupporterNote(payload: {
  isAnonymous: boolean;
  authorName?: string;
  feedbackCategory: SupporterFeedbackSentiment;
  message: string;
}): Promise<{ entry: SupporterBoardEntry }> {
  return authFetch<{ success: boolean; entry: SupporterBoardEntry }>(
    '/api/billing/supporter-board/founder-post',
    {
      method: 'POST',
      body: JSON.stringify(payload)
    }
  );
}

export async function adminDeleteSupporterBoardEntry(entryId: string): Promise<void> {
  await authFetch(`/api/auth/admin/supporter-board/${encodeURIComponent(entryId)}`, {
    method: 'DELETE'
  });
}

export async function verifyStripeSession(sessionId: string): Promise<{
  settled: boolean;
  entryType?: 'tier' | 'donation';
  paymentStatus: string;
  user?: AuthUserPublic;
  supporterEntry?: SupporterBoardEntry;
}> {
  return authFetch<{
    success: boolean;
    settled: boolean;
    entryType?: 'tier' | 'donation';
    paymentStatus: string;
    user?: AuthUserPublic;
    supporterEntry?: SupporterBoardEntry;
  }>('/api/billing/stripe/verify-session', {
    method: 'POST',
    body: JSON.stringify({ sessionId })
  });
}

export async function createCryptoInvoice(payload: {
  tierId: string;
  billingCycle: 'monthly' | 'one-time';
  chain: SupportedBillingChain;
  token: SupportedBillingCryptoToken;
}): Promise<{ invoice: CryptoPaymentInvoice }> {
  return authFetch<{ success: boolean; invoice: CryptoPaymentInvoice }>(
    '/api/billing/crypto/invoice',
    {
      method: 'POST',
      body: JSON.stringify(payload)
    }
  );
}

export async function cancelCryptoInvoice(invoiceId: string): Promise<{ invoice: CryptoPaymentInvoice }> {
  return authFetch<{ success: boolean; invoice: CryptoPaymentInvoice }>(
    '/api/billing/crypto/cancel',
    {
      method: 'POST',
      body: JSON.stringify({ invoiceId })
    }
  );
}

export async function verifyCryptoPayment(payload: {
  invoiceId: string;
  txHash: string;
}): Promise<{
  verified: boolean;
  entryType?: 'tier' | 'donation';
  invoice: CryptoPaymentInvoice;
  ledgerRecord?: BillingLedgerRecord;
  user?: AuthUserPublic;
  supporterEntry?: SupporterBoardEntry;
}> {
  return authFetch<{
    success: boolean;
    verified: boolean;
    entryType?: 'tier' | 'donation';
    invoice: CryptoPaymentInvoice;
    ledgerRecord?: BillingLedgerRecord;
    user?: AuthUserPublic;
    supporterEntry?: SupporterBoardEntry;
  }>('/api/billing/crypto/verify', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function adminFetchBillingConfig(): Promise<{
  config: BillingConfigPublic;
}> {
  return authFetch<{ success: boolean; config: BillingConfigPublic }>(
    '/api/auth/admin/billing/config',
    { method: 'GET' }
  );
}

export async function adminUpdateBillingConfig(patch: {
  fiatStripeEnabled?: boolean;
  cryptoEnabled?: boolean;
  treasuryEvmAddress?: string;
  enabledChains?: SupportedBillingChain[];
  enabledTokens?: SupportedBillingCryptoToken[];
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
}): Promise<{ config: BillingConfigPublic }> {
  return authFetch<{ success: boolean; config: BillingConfigPublic }>(
    '/api/auth/admin/billing/config',
    {
      method: 'PATCH',
      body: JSON.stringify(patch)
    }
  );
}

export async function adminFetchBillingLedger(): Promise<{
  ledger: BillingLedgerRecord[];
  totalRevenueUsd: number;
  fiatRevenueUsd?: number;
  cryptoRevenueUsd?: number;
  settledCount?: number;
  pendingInvoicesCount?: number;
  count: number;
}> {
  return authFetch<{
    success: boolean;
    ledger: BillingLedgerRecord[];
    totalRevenueUsd: number;
    fiatRevenueUsd?: number;
    cryptoRevenueUsd?: number;
    settledCount?: number;
    pendingInvoicesCount?: number;
    count: number;
  }>('/api/auth/admin/billing/ledger', { method: 'GET' });
}

