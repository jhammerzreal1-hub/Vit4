/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 * (TWENTY 47 PROTOCOL - GENESIS NODE / LYSANDER CORE EULA / H-FID Forensic License v1.1).
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type express from 'express';
import type { ModuleType } from '../types';
import {
  ADMIN_PRIVILEGES,
  ALL_SOVEREIGN_MODULES,
  COLLABORATOR_PRIVILEGES,
  OPERATOR_PRIVILEGES,
  VIEWER_PRIVILEGES,
  clonePrivileges,
  type ActiveSessionSummary,
  type AdminAuditEntry,
  type AuthAccountStatus,
  type AuthPolicySettings,
  type AuthRole,
  type AuthSessionResponse,
  type AuthUserPublic,
  type AuthorityTier,
  type UserPrivileges
} from '../types/auth';
import firebaseConfig from '../../firebase-applet-config.json';

interface StoredAuthUser extends AuthUserPublic {
  passwordHash?: string;
}

interface StoredAuthSession {
  id: string;
  tokenHash: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

interface PersistedAuthStore {
  version: number;
  users: StoredAuthUser[];
  sessions: StoredAuthSession[];
  policy: AuthPolicySettings;
  auditLog: AdminAuditEntry[];
}

const OWNER_ADMIN_EMAIL = 'jhammerzreal1@gmail.com';
const EXECUTIVE_ARCHITECT_HANDLES = new Set(['jhammerz', 'joshuahamilton', OWNER_ADMIN_EMAIL]);
const RESERVED_SELF_REGISTER_HANDLES = new Set([
  'jhammerz',
  'joshuahamilton',
  OWNER_ADMIN_EMAIL,
  'admin',
  'root',
  'owner',
  'administrator',
  'executive-architect'
]);

function isExecutiveArchitectRecord(user: {
  isExecutiveArchitect?: boolean;
  authProvider?: string;
  role?: string;
  email?: string;
  username?: string;
}): boolean {
  if (user.isExecutiveArchitect === true) return true;
  const email = String(user.email || '').trim().toLowerCase();
  const uname = String(user.username || '').trim().toLowerCase();
  if (user.authProvider === 'google' && email === OWNER_ADMIN_EMAIL) return true;
  return uname === 'jhammerz' && user.role === 'admin';
}
const SESSION_COOKIE_NAME = 'sovereign_os_session';
const SESSION_TTL_REMEMBER_MS = 1000 * 60 * 60 * 24 * 30; // 30 days when Save Login Info / Remember Me is on
const SESSION_TTL_SHORT_MS = 1000 * 60 * 60 * 12; // 12 hours when Remember Me is off
const DATA_DIR = path.join(process.cwd(), 'data');
const AUTH_STORE_FILE = path.join(DATA_DIR, 'auth_store.json');
const AUTH_HMAC_KEY_FILE = path.join(DATA_DIR, '.auth_hmac.key');
const VALID_MODULE_SET = new Set<string>(ALL_SOVEREIGN_MODULES);

// Persistent server-side HMAC key so "Keep me signed in" sessions survive server restarts
function loadOrCreateSessionSecret(): string {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length >= 16) {
    return process.env.SESSION_SECRET.trim();
  }
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(AUTH_HMAC_KEY_FILE)) {
      const existing = fs.readFileSync(AUTH_HMAC_KEY_FILE, 'utf8').trim();
      if (existing.length >= 32) return existing;
    }
    const fresh = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(AUTH_HMAC_KEY_FILE, fresh, { encoding: 'utf8', mode: 0o600 });
    return fresh;
  } catch {
    return crypto.randomBytes(32).toString('hex');
  }
}

const PROCESS_SESSION_SECRET = loadOrCreateSessionSecret();

const DEFAULT_POLICY: AuthPolicySettings = {
  requireLoginOnBoot: true,
  allowSelfRegistration: true,
  newUsersRequireApproval: false,
  defaultRole: 'collaborator',
  defaultPrivileges: clonePrivileges(COLLABORATOR_PRIVILEGES),
  entityIntelligenceDelegationEnabled: true,
  systemLockdownMode: false
};

// Executive Architect identity helper moved above for strict provider-aware checks

function enforceArchitectInvariants(user: StoredAuthUser): StoredAuthUser {
  if (isExecutiveArchitectRecord(user)) {
    user.isExecutiveArchitect = true;
    user.authorityTier = 'executive-architect';
    user.role = 'admin';
    user.status = 'active';
    user.privileges = clonePrivileges(ADMIN_PRIVILEGES);
  } else {
    user.isExecutiveArchitect = false;
    user.authorityTier = user.role === 'admin' ? 'delegated-admin' : 'standard';
  }
  return user;
}

// Cached Google SecureToken X.509 certs for Firebase ID token RS256 verification
let cachedGoogleCerts: { certs: Record<string, string>; expiresAt: number } | null = null;

function normalizeUsername(raw: string): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function isValidUsername(username: string): boolean {
  return /^[a-z0-9._@+-]{2,64}$/.test(username);
}

function isValidPassword(password: string): boolean {
  return typeof password === 'string' && password.length >= 8 && password.length <= 128;
}

function sanitizeDisplayName(raw: string, fallback: string): string {
  const clean = String(raw || '').trim().slice(0, 64);
  return clean || fallback;
}

function sanitizeRole(role: unknown, fallback: AuthRole = 'collaborator'): AuthRole {
  if (role === 'admin' || role === 'operator' || role === 'collaborator' || role === 'viewer') {
    return role;
  }
  return fallback;
}

function sanitizeStatus(status: unknown, fallback: AuthAccountStatus = 'active'): AuthAccountStatus {
  if (status === 'active' || status === 'pending' || status === 'suspended') {
    return status;
  }
  return fallback;
}

export function defaultPrivilegesForRole(role: AuthRole): UserPrivileges {
  if (role === 'admin') return clonePrivileges(ADMIN_PRIVILEGES);
  if (role === 'operator') return clonePrivileges(OPERATOR_PRIVILEGES);
  if (role === 'viewer') return clonePrivileges(VIEWER_PRIVILEGES);
  return clonePrivileges(COLLABORATOR_PRIVILEGES);
}

export function sanitizePrivileges(input: unknown, role: AuthRole): UserPrivileges {
  if (role === 'admin') {
    return clonePrivileges(ADMIN_PRIVILEGES);
  }
  const base = defaultPrivilegesForRole(role);
  if (!input || typeof input !== 'object') return base;
  const obj = input as Record<string, unknown>;
  const rawModules = Array.isArray(obj.allowedModules) ? obj.allowedModules : base.allowedModules;
  const filteredModules = Array.from(
    new Set(
      rawModules
        .map((m) => String(m || '').trim())
        .filter((m): m is ModuleType => VALID_MODULE_SET.has(m))
    )
  ).slice(0, 64);

  return {
    allModules: Boolean(obj.allModules),
    allowedModules: filteredModules,
    canUseChat: typeof obj.canUseChat === 'boolean' ? obj.canUseChat : base.canUseChat,
    canUseVoiceChat: typeof obj.canUseVoiceChat === 'boolean' ? obj.canUseVoiceChat : base.canUseVoiceChat,
    canRunAutonomousWorkflow:
      typeof obj.canRunAutonomousWorkflow === 'boolean'
        ? obj.canRunAutonomousWorkflow
        : base.canRunAutonomousWorkflow,
    canExecuteTerminalAndTools:
      typeof obj.canExecuteTerminalAndTools === 'boolean'
        ? obj.canExecuteTerminalAndTools
        : base.canExecuteTerminalAndTools,
    canAccessSecretsAndWallets:
      typeof obj.canAccessSecretsAndWallets === 'boolean'
        ? obj.canAccessSecretsAndWallets
        : base.canAccessSecretsAndWallets,
    canModifyOSSettings:
      typeof obj.canModifyOSSettings === 'boolean' ? obj.canModifyOSSettings : base.canModifyOSSettings,
    canManageUsers: typeof obj.canManageUsers === 'boolean' ? obj.canManageUsers : base.canManageUsers
  };
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function verifyPassword(password: string, storedHash?: string): boolean {
  if (!storedHash || typeof password !== 'string') return false;
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(expectedHex, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

function timingSafeCompareString(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function hashSessionToken(rawToken: string): string {
  return crypto.createHmac('sha256', PROCESS_SESSION_SECRET).update(rawToken).digest('hex');
}

function toPublicUser(user: StoredAuthUser): AuthUserPublic {
  const safe = enforceArchitectInvariants(user);
  const { passwordHash: _omitted, ...pub } = safe;
  return {
    ...pub,
    privileges: clonePrivileges(pub.privileges)
  };
}

function base64UrlDecode(segment: string): Buffer {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(normalized + '='.repeat(padLen), 'base64');
}

async function fetchGoogleSecureTokenCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedGoogleCerts && cachedGoogleCerts.expiresAt > now) {
    return cachedGoogleCerts.certs;
  }
  const url = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load Google auth certificates (${res.status})`);
  }
  const certs = (await res.json()) as Record<string, string>;
  const cacheControl = res.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const ttlMs = maxAgeMatch ? Math.max(60, parseInt(maxAgeMatch[1], 10)) * 1000 : 1000 * 60 * 60;
  cachedGoogleCerts = { certs, expiresAt: now + ttlMs };
  return certs;
}

export interface VerifiedFirebaseTokenPayload {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  photoURL: string;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseTokenPayload> {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Missing Firebase ID token');
  }
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed Firebase ID token');
  }
  const [headerB64, payloadB64, sigB64] = parts;
  const header = JSON.parse(base64UrlDecode(headerB64).toString('utf8'));
  const payload = JSON.parse(base64UrlDecode(payloadB64).toString('utf8'));

  if (header?.alg !== 'RS256' || typeof header?.kid !== 'string' || !header.kid) {
    throw new Error('Invalid Firebase token algorithm or key ID');
  }

  let certs = await fetchGoogleSecureTokenCerts();
  let cert = certs[header.kid];
  if (!cert) {
    cachedGoogleCerts = null;
    certs = await fetchGoogleSecureTokenCerts();
    cert = certs[header.kid];
  }
  if (!cert) {
    throw new Error('Unrecognized Google signing certificate');
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();
  const signature = base64UrlDecode(sigB64);
  if (!verifier.verify(cert, signature)) {
    throw new Error('Firebase ID token signature verification failed');
  }

  const projectId = firebaseConfig.projectId;
  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.aud !== projectId) {
    throw new Error('Firebase ID token audience mismatch');
  }
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error('Firebase ID token issuer mismatch');
  }
  if (typeof payload.exp !== 'number' || payload.exp <= nowSec) {
    throw new Error('Firebase ID token expired');
  }
  if (typeof payload.iat !== 'number' || payload.iat > nowSec + 300) {
    throw new Error('Firebase ID token issued-at timestamp invalid');
  }
  const uid = String(payload.user_id || payload.sub || '').trim();
  if (!uid || uid.length > 128) {
    throw new Error('Firebase ID token missing subject');
  }
  const email = String(payload.email || '').trim().toLowerCase();
  const emailVerified = Boolean(payload.email_verified);
  if (!email || !emailVerified) {
    throw new Error('Google account must have a verified email address');
  }

  return {
    uid,
    email,
    emailVerified,
    displayName: sanitizeDisplayName(String(payload.name || ''), email.split('@')[0]),
    photoURL: typeof payload.picture === 'string' ? payload.picture.slice(0, 1024) : ''
  };
}

class SovereignAuthService {
  private store: PersistedAuthStore;
  private initialized = false;

  constructor() {
    this.store = {
      version: 2,
      users: [],
      sessions: [],
      policy: {
        ...DEFAULT_POLICY,
        defaultPrivileges: clonePrivileges(DEFAULT_POLICY.defaultPrivileges)
      },
      auditLog: []
    };
  }

  public init(): void {
    if (this.initialized) return;
    this.initialized = true;
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      if (fs.existsSync(AUTH_STORE_FILE)) {
        const raw = fs.readFileSync(AUTH_STORE_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.users)) {
            this.store.users = parsed.users.map((u: any) => {
              const role = sanitizeRole(u.role, 'collaborator');
              const rec: StoredAuthUser = {
                id: String(u.id || crypto.randomUUID()),
                username: normalizeUsername(u.username || u.email || 'user'),
                email: String(u.email || '').trim().toLowerCase(),
                displayName: sanitizeDisplayName(u.displayName, u.username || 'User'),
                photoURL: typeof u.photoURL === 'string' ? u.photoURL : undefined,
                authProvider: u.authProvider === 'google' ? 'google' : 'local',
                firebaseUid: typeof u.firebaseUid === 'string' ? u.firebaseUid : undefined,
                role,
                status: sanitizeStatus(u.status, 'active'),
                isExecutiveArchitect: Boolean(u.isExecutiveArchitect),
                authorityTier: u.isExecutiveArchitect ? 'executive-architect' : role === 'admin' ? 'delegated-admin' : 'standard',
                privileges: sanitizePrivileges(u.privileges, role),
                passwordHash: typeof u.passwordHash === 'string' ? u.passwordHash : undefined,
                createdAt: typeof u.createdAt === 'string' ? u.createdAt : new Date().toISOString(),
                updatedAt: typeof u.updatedAt === 'string' ? u.updatedAt : new Date().toISOString(),
                lastLoginAt: typeof u.lastLoginAt === 'string' ? u.lastLoginAt : undefined
              };
              return enforceArchitectInvariants(rec);
            });
          }
          if (Array.isArray(parsed.sessions)) {
            const now = Date.now();
            this.store.sessions = parsed.sessions
              .filter(
                (s: any) => s && typeof s.tokenHash === 'string' && typeof s.userId === 'string' && s.expiresAt > now
              )
              .map((s: any) => ({
                id: typeof s.id === 'string' && s.id ? s.id : `ses_${crypto.randomBytes(6).toString('hex')}`,
                tokenHash: s.tokenHash,
                userId: s.userId,
                createdAt: Number(s.createdAt) || now,
                expiresAt: Number(s.expiresAt)
              }));
          }
          if (Array.isArray(parsed.auditLog)) {
            this.store.auditLog = parsed.auditLog.slice(-250);
          }
          if (parsed.policy && typeof parsed.policy === 'object') {
            const defRole = sanitizeRole(parsed.policy.defaultRole, 'collaborator');
            this.store.policy = {
              requireLoginOnBoot:
                typeof parsed.policy.requireLoginOnBoot === 'boolean'
                  ? parsed.policy.requireLoginOnBoot
                  : DEFAULT_POLICY.requireLoginOnBoot,
              allowSelfRegistration:
                typeof parsed.policy.allowSelfRegistration === 'boolean'
                  ? parsed.policy.allowSelfRegistration
                  : DEFAULT_POLICY.allowSelfRegistration,
              newUsersRequireApproval:
                typeof parsed.policy.newUsersRequireApproval === 'boolean'
                  ? parsed.policy.newUsersRequireApproval
                  : DEFAULT_POLICY.newUsersRequireApproval,
              defaultRole: defRole,
              defaultPrivileges: sanitizePrivileges(parsed.policy.defaultPrivileges, defRole),
              entityIntelligenceDelegationEnabled:
                typeof parsed.policy.entityIntelligenceDelegationEnabled === 'boolean'
                  ? parsed.policy.entityIntelligenceDelegationEnabled
                  : true,
              systemLockdownMode:
                typeof parsed.policy.systemLockdownMode === 'boolean'
                  ? parsed.policy.systemLockdownMode
                  : false
            };
          }
        }
      }
    } catch (err: any) {
      console.warn('[AUTH] Starting with fresh auth store:', err?.message || err);
    }
  }

  private recordAudit(
    actor: AuthUserPublic | null,
    action: string,
    target: string,
    details: string,
    outcome: 'allowed' | 'blocked' = 'allowed'
  ): void {
    const tier: AuthorityTier = actor?.isExecutiveArchitect
      ? 'executive-architect'
      : actor?.role === 'admin'
      ? 'delegated-admin'
      : 'standard';
    this.store.auditLog.push({
      id: `aud_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      timestamp: new Date().toISOString(),
      actorId: actor?.id || 'system',
      actorUsername: actor?.username || 'system',
      actorTier: tier,
      action,
      target,
      details: details.slice(0, 260),
      outcome
    });
    if (this.store.auditLog.length > 250) {
      this.store.auditLog = this.store.auditLog.slice(-250);
    }
  }

  private persist(): void {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const now = Date.now();
      this.store.sessions = this.store.sessions.filter((s) => s.expiresAt > now).slice(-200);
      const tmp = `${AUTH_STORE_FILE}.tmp.${process.pid}`;
      fs.writeFileSync(tmp, JSON.stringify(this.store, null, 2), { encoding: 'utf8', mode: 0o600 });
      fs.renameSync(tmp, AUTH_STORE_FILE);
    } catch (err: any) {
      console.warn('[AUTH] Failed to persist auth store:', err?.message || err);
    }
  }

  public isEnvAdminConfigured(): boolean {
    return Boolean(process.env.SOVEREIGN_ADMIN_PASSCODE && process.env.SOVEREIGN_ADMIN_PASSCODE.trim().length >= 8);
  }

  public isLocalAdminClaimed(): boolean {
    this.init();
    // One-time Root Admin setup has permanently completed; login screen never offers Admin creation.
    return true;
  }

  public getPolicy(): AuthPolicySettings {
    this.init();
    return {
      ...this.store.policy,
      defaultPrivileges: clonePrivileges(this.store.policy.defaultPrivileges)
    };
  }

  private createSessionForUser(userId: string, rememberMe = true): string {
    const rawToken = crypto.randomBytes(32).toString('base64url');
    const tokenHash = hashSessionToken(rawToken);
    const now = Date.now();
    const ttlMs = rememberMe ? SESSION_TTL_REMEMBER_MS : SESSION_TTL_SHORT_MS;
    this.store.sessions.push({
      id: `ses_${crypto.randomBytes(6).toString('hex')}`,
      tokenHash,
      userId,
      createdAt: now,
      expiresAt: now + ttlMs
    });
    this.persist();
    return rawToken;
  }

  public extractRawToken(req: express.Request): string | null {
    const authHeader = String(req.headers.authorization || '').trim();
    if (authHeader.toLowerCase().startsWith('bearer ')) {
      const bearer = authHeader.slice(7).trim();
      if (bearer) return bearer;
    }
    const cookieHeader = String(req.headers.cookie || '');
    if (cookieHeader) {
      const cookies = cookieHeader.split(';');
      for (const pair of cookies) {
        const idx = pair.indexOf('=');
        if (idx === -1) continue;
        const name = pair.slice(0, idx).trim();
        if (name === SESSION_COOKIE_NAME) {
          return decodeURIComponent(pair.slice(idx + 1).trim());
        }
      }
    }
    const queryToken =
      typeof (req as any).query?.token === 'string' ? String((req as any).query.token).trim() : '';
    if (queryToken) return queryToken;
    const rawUrl = String((req as any).url || '');
    if (rawUrl.includes('token=')) {
      try {
        const parsed = new URL(rawUrl, 'http://localhost');
        const urlToken = (parsed.searchParams.get('token') || '').trim();
        if (urlToken) return urlToken;
      } catch {
        // Ignore malformed URL
      }
    }
    return null;
  }

  public setSessionCookie(
    req: express.Request,
    res: express.Response,
    rawToken: string,
    rememberMe = true
  ): void {
    const isHttps =
      req.secure ||
      String(req.headers['x-forwarded-proto'] || '')
        .toLowerCase()
        .includes('https');
    const parts = [`${SESSION_COOKIE_NAME}=${encodeURIComponent(rawToken)}`, 'Path=/', 'HttpOnly'];
    if (rememberMe) {
      const maxAgeSec = Math.floor(SESSION_TTL_REMEMBER_MS / 1000);
      parts.push(`Max-Age=${maxAgeSec}`);
    }
    if (isHttps) {
      parts.push('SameSite=None', 'Secure', 'Partitioned');
    } else {
      parts.push('SameSite=Lax');
    }
    res.setHeader('Set-Cookie', parts.join('; '));
  }

  public clearSessionCookie(req: express.Request, res: express.Response): void {
    const isHttps =
      req.secure ||
      String(req.headers['x-forwarded-proto'] || '')
        .toLowerCase()
        .includes('https');
    const parts = [`${SESSION_COOKIE_NAME}=`, 'Path=/', 'Max-Age=0', 'HttpOnly'];
    if (isHttps) {
      parts.push('SameSite=None', 'Secure', 'Partitioned');
    } else {
      parts.push('SameSite=Lax');
    }
    res.setHeader('Set-Cookie', parts.join('; '));
  }

  public validateCsrf(req: express.Request): boolean {
    // Allow requests carrying explicit SPA header or Bearer token
    if (String(req.headers['x-requested-with'] || '') === 'SovereignOS') {
      return true;
    }
    const authHeader = String(req.headers.authorization || '').trim();
    if (authHeader.toLowerCase().startsWith('bearer ')) {
      return true;
    }
    const origin = String(req.headers.origin || '').trim();
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').trim();
    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        return originHost === host;
      } catch {
        return false;
      }
    }
    return false;
  }

  public resolveRequestUser(req: express.Request): AuthUserPublic | null {
    this.init();
    const rawToken = this.extractRawToken(req);
    if (!rawToken) return null;
    const tokenHash = hashSessionToken(rawToken);
    const now = Date.now();
    const session = this.store.sessions.find((s) => s.tokenHash === tokenHash && s.expiresAt > now);
    if (!session) return null;
    const user = this.store.users.find((u) => u.id === session.userId);
    if (!user) return null;
    return toPublicUser(user);
  }

  public getSessionState(req: express.Request): AuthSessionResponse {
    this.init();
    const user = this.resolveRequestUser(req);
    return {
      authenticated: Boolean(user),
      user,
      adminClaimed: this.isLocalAdminClaimed(),
      envAdminConfigured: this.isEnvAdminConfigured(),
      policy: this.getPolicy()
    };
  }

  public claimOwnerAdmin(input: {
    username: string;
    password: string;
    displayName?: string;
    email?: string;
    rememberMe?: boolean;
  }): { user: AuthUserPublic; token: string } {
    this.init();
    const attempted = normalizeUsername(input?.username || 'unknown') || 'unknown';
    this.recordAudit(
      null,
      'ONE_TIME_ADMIN_CLAIM_SEALED',
      attempted,
      'Blocked unauthenticated attempt to invoke permanently sealed one-time Root Admin claim.',
      'blocked'
    );
    this.persist();
    throw new Error(
      'Root Admin setup was a one-time initialization and is permanently sealed. New administrators can only be created or promoted by the signed-in Administrator.'
    );
  }

  public registerLocalUser(input: {
    username: string;
    password: string;
    displayName?: string;
    email?: string;
    rememberMe?: boolean;
  }): { user: AuthUserPublic; token: string } {
    this.init();
    if (this.store.policy.systemLockdownMode) {
      throw new Error('System Lockdown is active — new account registrations are temporarily frozen by the Executive Architect.');
    }
    if (!this.store.policy.allowSelfRegistration) {
      throw new Error('Self-registration is disabled by the system administrator.');
    }
    const username = normalizeUsername(input.username);
    if (!isValidUsername(username)) {
      throw new Error('Username must be 2-64 characters (letters, numbers, ., _, -, +, @).');
    }
    if (!isValidPassword(input.password)) {
      throw new Error('Password must be at least 8 characters long.');
    }
    const normalizedEmail = String(input.email || (username.includes('@') ? username : ''))
      .trim()
      .toLowerCase();
    if (
      RESERVED_SELF_REGISTER_HANDLES.has(username) ||
      EXECUTIVE_ARCHITECT_HANDLES.has(username) ||
      normalizedEmail === OWNER_ADMIN_EMAIL
    ) {
      throw new Error('That username or email is reserved for the Administrator. Please sign in instead.');
    }
    if (this.store.users.some((u) => u.username === username)) {
      throw new Error('That username is already registered.');
    }

    const now = new Date().toISOString();
    const role: AuthRole =
      this.store.policy.defaultRole === 'admin' ? 'collaborator' : this.store.policy.defaultRole;
    const status: AuthAccountStatus = this.store.policy.newUsersRequireApproval ? 'pending' : 'active';
    const safePrivileges = sanitizePrivileges(this.store.policy.defaultPrivileges, role);
    safePrivileges.canManageUsers = false;

    const newUser: StoredAuthUser = {
      id: `usr_${crypto.randomBytes(10).toString('hex')}`,
      username,
      email: normalizedEmail,
      displayName: sanitizeDisplayName(input.displayName || '', username),
      authProvider: 'local',
      role,
      status,
      isExecutiveArchitect: false,
      authorityTier: 'standard',
      privileges: safePrivileges,
      passwordHash: hashPassword(input.password),
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now
    };
    this.store.users.push(newUser);
    this.recordAudit(
      toPublicUser(newUser),
      'USER_SELF_REGISTERED',
      newUser.username,
      `Registered standard ${newUser.role} account (${newUser.status}).`
    );
    const token = this.createSessionForUser(newUser.id, input.rememberMe !== false);
    return { user: toPublicUser(newUser), token };
  }

  public loginWithPassword(input: {
    username: string;
    password: string;
    rememberMe?: boolean;
  }): { user: AuthUserPublic; token: string } {
    this.init();
    const identifier = normalizeUsername(input.username);
    const password = String(input.password || '');
    if (!identifier || !password) {
      throw new Error('Username and password are required.');
    }

    // Check optional SOVEREIGN_ADMIN_PASSCODE env override
    const envPasscode = (process.env.SOVEREIGN_ADMIN_PASSCODE || '').trim();
    if (
      envPasscode.length >= 8 &&
      (identifier === 'admin' || identifier === 'owner' || identifier === OWNER_ADMIN_EMAIL) &&
      timingSafeCompareString(password, envPasscode)
    ) {
      const now = new Date().toISOString();
      let envAdmin = this.store.users.find((u) => u.role === 'admin' && u.username === 'admin');
      if (!envAdmin) {
        envAdmin = {
          id: `usr_${crypto.randomBytes(10).toString('hex')}`,
          username: 'admin',
          email: OWNER_ADMIN_EMAIL,
          displayName: 'Sovereign Owner',
          authProvider: 'local',
          role: 'admin',
          status: 'active',
          privileges: clonePrivileges(ADMIN_PRIVILEGES),
          createdAt: now,
          updatedAt: now,
          lastLoginAt: now
        };
        this.store.users.push(envAdmin);
      } else {
        envAdmin.lastLoginAt = now;
        envAdmin.updatedAt = now;
        envAdmin.status = 'active';
      }
      const token = this.createSessionForUser(envAdmin.id, input.rememberMe !== false);
      return { user: toPublicUser(envAdmin), token };
    }

    if (!this.store.users.some((u) => Boolean(u.passwordHash))) {
      throw new Error(
        'Invalid username or password, or sign in with Google Login Authority.'
      );
    }

    const user = this.store.users.find(
      (u) =>
        Boolean(u.passwordHash) &&
        (u.username === identifier ||
          (u.email && u.email === identifier) ||
          u.displayName.trim().toLowerCase() === identifier)
    );
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new Error('Invalid username or password.');
    }

    enforceArchitectInvariants(user);
    user.lastLoginAt = new Date().toISOString();
    user.updatedAt = user.lastLoginAt;
    const token = this.createSessionForUser(user.id, input.rememberMe !== false);
    return { user: toPublicUser(user), token };
  }

  public async loginWithGoogleIdToken(idToken: string): Promise<{ user: AuthUserPublic; token: string }> {
    this.init();
    const verified = await verifyFirebaseIdToken(idToken);
    const now = new Date().toISOString();
    const isOwnerEmail = verified.email === OWNER_ADMIN_EMAIL;

    let user = this.store.users.find(
      (u) =>
        u.firebaseUid === verified.uid ||
        (u.email && u.email === verified.email) ||
        (isOwnerEmail && u.isExecutiveArchitect)
    );

    if (!user) {
      const baseUsername = normalizeUsername(verified.email.split('@')[0].replace(/[^a-z0-9._-]/g, '')) || 'google_user';
      let candidate = baseUsername.slice(0, 26);
      if (candidate.length < 3) candidate = `${candidate}_os`;
      let suffix = 1;
      while (this.store.users.some((u) => u.username === candidate)) {
        candidate = `${baseUsername.slice(0, 24)}_${suffix++}`;
      }

      const role: AuthRole = isOwnerEmail
        ? 'admin'
        : this.store.policy.defaultRole === 'admin'
        ? 'collaborator'
        : this.store.policy.defaultRole;
      const status: AuthAccountStatus = isOwnerEmail
        ? 'active'
        : this.store.policy.newUsersRequireApproval
        ? 'pending'
        : 'active';

      user = enforceArchitectInvariants({
        id: `usr_${crypto.randomBytes(10).toString('hex')}`,
        username: isOwnerEmail ? 'jhammerz' : candidate,
        email: verified.email,
        displayName: isOwnerEmail ? 'JHammerZ' : verified.displayName,
        photoURL: verified.photoURL,
        authProvider: 'google',
        firebaseUid: verified.uid,
        role,
        status,
        isExecutiveArchitect: isOwnerEmail,
        authorityTier: isOwnerEmail ? 'executive-architect' : 'standard',
        privileges: isOwnerEmail
          ? clonePrivileges(ADMIN_PRIVILEGES)
          : sanitizePrivileges(this.store.policy.defaultPrivileges, role),
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now
      });
      this.store.users.push(user);
    } else {
      user.firebaseUid = verified.uid;
      user.email = verified.email;
      if (!user.displayName && verified.displayName) user.displayName = verified.displayName;
      if (verified.photoURL) user.photoURL = verified.photoURL;
      if (isOwnerEmail) {
        user.role = 'admin';
        user.status = 'active';
        user.isExecutiveArchitect = true;
        user.authorityTier = 'executive-architect';
        user.privileges = clonePrivileges(ADMIN_PRIVILEGES);
      }
      enforceArchitectInvariants(user);
      user.lastLoginAt = now;
      user.updatedAt = now;
    }

    const token = this.createSessionForUser(user.id, true);
    return { user: toPublicUser(user), token };
  }

  public logout(req: express.Request): void {
    this.init();
    const rawToken = this.extractRawToken(req);
    if (!rawToken) return;
    const tokenHash = hashSessionToken(rawToken);
    this.store.sessions = this.store.sessions.filter((s) => s.tokenHash !== tokenHash);
    this.persist();
  }

  public listUsers(): AuthUserPublic[] {
    this.init();
    return this.store.users
      .map(toPublicUser)
      .sort((a, b) => {
        if (a.isExecutiveArchitect && !b.isExecutiveArchitect) return -1;
        if (b.isExecutiveArchitect && !a.isExecutiveArchitect) return 1;
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (b.role === 'admin' && a.role !== 'admin') return 1;
        return a.username.localeCompare(b.username);
      });
  }

  public listActiveSessions(): ActiveSessionSummary[] {
    this.init();
    const now = Date.now();
    this.store.sessions = this.store.sessions.filter((s) => s.expiresAt > now);
    const summaries: ActiveSessionSummary[] = [];
    for (const ses of this.store.sessions) {
      const user = this.store.users.find((u) => u.id === ses.userId);
      if (!user) continue;
      const pub = toPublicUser(user);
      summaries.push({
        sessionId: ses.id,
        userId: pub.id,
        username: pub.username,
        displayName: pub.displayName,
        role: pub.role,
        isExecutiveArchitect: Boolean(pub.isExecutiveArchitect),
        createdAt: ses.createdAt,
        expiresAt: ses.expiresAt
      });
    }
    return summaries.sort((a, b) => b.createdAt - a.createdAt);
  }

  public getAuditLog(): AdminAuditEntry[] {
    this.init();
    return [...this.store.auditLog].reverse();
  }

  public adminRevokeSession(actor: AuthUserPublic, sessionId: string): void {
    this.init();
    const ses = this.store.sessions.find((s) => s.id === sessionId);
    if (!ses) return;
    const targetUser = this.store.users.find((u) => u.id === ses.userId);
    if (targetUser && isExecutiveArchitectRecord(targetUser) && !actor.isExecutiveArchitect) {
      this.recordAudit(
        actor,
        'SESSION_REVOKE_DENIED',
        targetUser.username,
        'Blocked non-architect attempt to terminate Executive Architect session.',
        'blocked'
      );
      this.persist();
      throw new Error('Executive Architect sessions are permanently protected and cannot be terminated by other accounts.');
    }
    this.store.sessions = this.store.sessions.filter((s) => s.id !== sessionId);
    this.recordAudit(actor, 'SESSION_REVOKED', targetUser?.username || sessionId, `Terminated active session ${sessionId}.`);
    this.persist();
  }

  public adminRevokeAllNonArchitectSessions(actor: AuthUserPublic): number {
    this.init();
    if (!actor.isExecutiveArchitect) {
      this.recordAudit(
        actor,
        'GLOBAL_SESSION_PURGE_DENIED',
        'all-sessions',
        'Only Executive Architect JHammerZ may purge all active sessions.',
        'blocked'
      );
      this.persist();
      throw new Error('Only the Executive Architect can execute a global session purge.');
    }
    const architectIds = new Set(
      this.store.users.filter((u) => isExecutiveArchitectRecord(u)).map((u) => u.id)
    );
    const before = this.store.sessions.length;
    this.store.sessions = this.store.sessions.filter((s) => architectIds.has(s.userId));
    const removed = before - this.store.sessions.length;
    this.recordAudit(
      actor,
      'GLOBAL_SESSION_PURGE',
      'non-architect-sessions',
      `Purged ${removed} non-architect session(s). Executive Architect sessions preserved.`
    );
    this.persist();
    return removed;
  }

  public adminCreateUser(
    input: {
      username: string;
      password: string;
      displayName?: string;
      email?: string;
      role?: AuthRole;
      status?: AuthAccountStatus;
      privileges?: Partial<UserPrivileges>;
    },
    actor?: AuthUserPublic
  ): AuthUserPublic {
    this.init();
    const username = normalizeUsername(input.username);
    if (!isValidUsername(username)) {
      throw new Error('Username must be 2-64 characters (letters, numbers, ., _, -, +, @).');
    }
    if (!isValidPassword(input.password)) {
      throw new Error('Password must be at least 8 characters long.');
    }
    if (this.store.users.some((u) => u.username === username)) {
      throw new Error('That username already exists.');
    }

    const requestedRole = sanitizeRole(input.role, 'collaborator');
    // Strictly prevent non-architects from minting admin accounts or granting user-management powers
    if (actor && !actor.isExecutiveArchitect && (requestedRole === 'admin' || input.privileges?.canManageUsers)) {
      this.recordAudit(
        actor,
        'PRIVILEGE_ESCALATION_BLOCKED',
        username,
        'Only Executive Architect JHammerZ can create Admin accounts or delegate canManageUsers.',
        'blocked'
      );
      this.persist();
      throw new Error('Only Executive Architect JHammerZ can grant Admin role or User Management authority.');
    }

    const status = sanitizeStatus(input.status, 'active');
    const now = new Date().toISOString();
    const user: StoredAuthUser = enforceArchitectInvariants({
      id: `usr_${crypto.randomBytes(10).toString('hex')}`,
      username,
      email: String(input.email || (username.includes('@') ? username : '')).trim().toLowerCase(),
      displayName: sanitizeDisplayName(input.displayName || '', username),
      authProvider: 'local',
      role: requestedRole,
      status,
      isExecutiveArchitect: false,
      privileges: sanitizePrivileges(input.privileges, requestedRole),
      passwordHash: hashPassword(input.password),
      createdAt: now,
      updatedAt: now
    });
    this.store.users.push(user);
    this.recordAudit(actor || null, 'USER_CREATED', user.username, `Created ${user.role} account (${user.status}).`);
    this.persist();
    return toPublicUser(user);
  }

  public adminUpdateUser(
    actor: AuthUserPublic,
    targetId: string,
    patch: {
      displayName?: string;
      email?: string;
      role?: AuthRole;
      status?: AuthAccountStatus;
      privileges?: Partial<UserPrivileges>;
      newPassword?: string;
    }
  ): AuthUserPublic {
    this.init();
    const user = this.store.users.find((u) => u.id === targetId);
    if (!user) {
      throw new Error('User account not found.');
    }

    const targetIsArchitect = isExecutiveArchitectRecord(user);
    const nextRole = patch.role ? sanitizeRole(patch.role, user.role) : user.role;
    const nextStatus = patch.status ? sanitizeStatus(patch.status, user.status) : user.status;

    // HARD-LOCKED ARCHITECT PROTECTION:
    // Nobody (no secondary admin, no user, NOT EVEN Entity Intelligence) can ever demote, suspend,
    // strip privileges, or alter the Executive Architect JHammerZ!
    if (targetIsArchitect) {
      if (nextRole !== 'admin' || nextStatus !== 'active') {
        this.recordAudit(
          actor,
          'ARCHITECT_SHIELD_BLOCKED',
          user.username,
          'Blocked attempt to demote or suspend permanent Executive Architect JHammerZ.',
          'blocked'
        );
        this.persist();
        throw new Error('PERMANENT ARCHITECT LOCK: Executive Architect JHammerZ cannot be demoted, suspended, or stripped of privileges.');
      }
      if (!actor.isExecutiveArchitect && (patch.newPassword || patch.privileges)) {
        this.recordAudit(
          actor,
          'ARCHITECT_SHIELD_BLOCKED',
          user.username,
          'Blocked non-architect attempt to modify Executive Architect credentials or privileges.',
          'blocked'
        );
        this.persist();
        throw new Error('PERMANENT ARCHITECT LOCK: Only Executive Architect JHammerZ can update their own credentials.');
      }
    }

    // Only Executive Architect may promote another human to admin or grant canManageUsers
    if (
      !actor.isExecutiveArchitect &&
      !targetIsArchitect &&
      (nextRole === 'admin' || patch.privileges?.canManageUsers === true)
    ) {
      this.recordAudit(
        actor,
        'PRIVILEGE_ESCALATION_BLOCKED',
        user.username,
        'Blocked non-architect attempt to grant Admin role or canManageUsers.',
        'blocked'
      );
      this.persist();
      throw new Error('Only Executive Architect JHammerZ can promote users to Admin or grant User Management privileges.');
    }

    // Prevent removing the last active admin
    if (user.role === 'admin' && (nextRole !== 'admin' || nextStatus !== 'active')) {
      const otherActiveAdmins = this.store.users.filter(
        (u) => u.id !== user.id && u.role === 'admin' && u.status === 'active'
      );
      if (otherActiveAdmins.length === 0) {
        throw new Error('At least one active Admin account must remain.');
      }
    }

    if (typeof patch.displayName === 'string') {
      user.displayName = sanitizeDisplayName(patch.displayName, user.username);
    }
    if (typeof patch.email === 'string' && user.authProvider === 'local') {
      user.email = patch.email.trim().toLowerCase().slice(0, 256);
    }
    user.role = targetIsArchitect ? 'admin' : nextRole;
    user.status = targetIsArchitect ? 'active' : nextStatus;

    if (targetIsArchitect) {
      user.privileges = clonePrivileges(ADMIN_PRIVILEGES);
    } else if (patch.privileges) {
      user.privileges = sanitizePrivileges(patch.privileges, nextRole);
    } else if (patch.role && nextRole === 'admin') {
      user.privileges = clonePrivileges(ADMIN_PRIVILEGES);
    }

    if (typeof patch.newPassword === 'string' && patch.newPassword.length > 0) {
      if (user.authProvider !== 'local') {
        throw new Error('Google-authenticated accounts do not use local passwords.');
      }
      if (!isValidPassword(patch.newPassword)) {
        throw new Error('New password must be at least 8 characters long.');
      }
      user.passwordHash = hashPassword(patch.newPassword);
      if (actor.id !== user.id) {
        this.store.sessions = this.store.sessions.filter((s) => s.userId !== user.id);
      }
    }

    if (user.status === 'suspended' && !targetIsArchitect) {
      this.store.sessions = this.store.sessions.filter((s) => s.userId !== user.id);
    }

    user.updatedAt = new Date().toISOString();
    enforceArchitectInvariants(user);
    this.recordAudit(
      actor,
      'USER_UPDATED',
      user.username,
      `Updated role=${user.role}, status=${user.status}${patch.newPassword ? ', password reset' : ''}.`
    );
    this.persist();
    return toPublicUser(user);
  }

  public adminDeleteUser(actor: AuthUserPublic, targetId: string): void {
    this.init();
    const user = this.store.users.find((u) => u.id === targetId);
    if (!user) {
      throw new Error('User account not found.');
    }
    if (user.id === actor.id) {
      throw new Error('You cannot delete your own active admin account.');
    }
    if (isExecutiveArchitectRecord(user)) {
      this.recordAudit(
        actor,
        'ARCHITECT_DELETE_BLOCKED',
        user.username,
        'Blocked attempt to remove permanent Executive Architect JHammerZ.',
        'blocked'
      );
      this.persist();
      throw new Error('PERMANENT ARCHITECT LOCK: Executive Architect JHammerZ can NEVER be removed or deleted by anyone, including Entity Intelligence.');
    }
    if (user.role === 'admin' && !actor.isExecutiveArchitect) {
      throw new Error('Only Executive Architect JHammerZ can remove delegated Admin accounts.');
    }
    if (user.role === 'admin') {
      const otherAdmins = this.store.users.filter((u) => u.id !== user.id && u.role === 'admin' && u.status === 'active');
      if (otherAdmins.length === 0) {
        throw new Error('At least one active Admin account must remain.');
      }
    }
    this.store.users = this.store.users.filter((u) => u.id !== targetId);
    this.store.sessions = this.store.sessions.filter((s) => s.userId !== targetId);
    this.recordAudit(actor, 'USER_DELETED', user.username, `Deleted user account (${user.role}).`);
    this.persist();
  }

  public adminUpdatePolicy(patch: Partial<AuthPolicySettings>, actor?: AuthUserPublic): AuthPolicySettings {
    this.init();
    if (actor && !actor.isExecutiveArchitect) {
      if (typeof patch.entityIntelligenceDelegationEnabled === 'boolean' || typeof patch.systemLockdownMode === 'boolean') {
        this.recordAudit(
          actor,
          'ARCHITECT_POLICY_BLOCKED',
          'global-policy',
          'Only Executive Architect JHammerZ can alter Entity Intelligence Delegation or System Lockdown.',
          'blocked'
        );
        this.persist();
        throw new Error('Only Executive Architect JHammerZ can modify Entity Intelligence Delegation or System Lockdown.');
      }
    }
    if (typeof patch.requireLoginOnBoot === 'boolean') {
      this.store.policy.requireLoginOnBoot = patch.requireLoginOnBoot;
    }
    if (typeof patch.allowSelfRegistration === 'boolean') {
      this.store.policy.allowSelfRegistration = patch.allowSelfRegistration;
    }
    if (typeof patch.newUsersRequireApproval === 'boolean') {
      this.store.policy.newUsersRequireApproval = patch.newUsersRequireApproval;
    }
    if (typeof patch.entityIntelligenceDelegationEnabled === 'boolean') {
      this.store.policy.entityIntelligenceDelegationEnabled = patch.entityIntelligenceDelegationEnabled;
    }
    if (typeof patch.systemLockdownMode === 'boolean') {
      this.store.policy.systemLockdownMode = patch.systemLockdownMode;
    }
    if (patch.defaultRole) {
      const safeRole = sanitizeRole(patch.defaultRole, 'collaborator');
      this.store.policy.defaultRole = safeRole === 'admin' ? 'collaborator' : safeRole;
    }
    if (patch.defaultPrivileges) {
      this.store.policy.defaultPrivileges = sanitizePrivileges(
        patch.defaultPrivileges,
        this.store.policy.defaultRole
      );
    }
    this.recordAudit(
      actor || null,
      'POLICY_UPDATED',
      'system-policy',
      `Updated policy (lockdown=${Boolean(this.store.policy.systemLockdownMode)}, entityDelegation=${this.store.policy.entityIntelligenceDelegationEnabled !== false}, loginOnBoot=${this.store.policy.requireLoginOnBoot}).`
    );
    this.persist();
    return this.getPolicy();
  }
}

export const authService = new SovereignAuthService();
