/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Per-User Isolated Encrypted Secrets Vault
 * Guarantees every non-owner account starts 100% empty and can store only their own credentials.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { CANONICAL_SECRET_SPECS, type SecretSpec, type SecretTelemetry } from './internalSecretsHandler';

interface UserVaultEntry {
  iv: string;
  tag: string;
  ciphertext: string;
  updatedAt: string;
  label?: string;
  category?: SecretSpec['category'];
  description?: string;
}

interface UserEncryptedVaultFile {
  version: number;
  algorithm: 'aes-256-gcm';
  userId: string;
  updatedAt: string;
  entries: Record<string, UserVaultEntry>;
}

const WORKSPACE_ROOT = process.cwd();
const DATA_DIR = path.join(WORKSPACE_ROOT, 'data');
const USER_WORKSPACES_ROOT = path.join(DATA_DIR, 'user_workspaces');
const MASTER_KEY_PATH = path.join(DATA_DIR, '.vault.key');

const ENV_VAR_PATTERN = /^[A-Z][A-Z0-9_]{1,95}$/;

function sanitizeUserId(userId: string): string {
  const cleaned = String(userId || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 96);
  if (!cleaned || cleaned === '.' || cleaned === '..') {
    throw new Error('Invalid user workspace scope');
  }
  return cleaned;
}

function getMasterKey(): Buffer {
  fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  if (fs.existsSync(MASTER_KEY_PATH)) {
    const raw = fs.readFileSync(MASTER_KEY_PATH, 'utf8').trim();
    const buf = Buffer.from(raw, 'hex');
    if (buf.length === 32) return buf;
  }
  const fresh = crypto.randomBytes(32);
  fs.writeFileSync(MASTER_KEY_PATH, fresh.toString('hex'), { mode: 0o600 });
  return fresh;
}

function deriveUserVaultKey(safeUserId: string): Buffer {
  return crypto
    .createHmac('sha256', getMasterKey())
    .update(`sovereign-user-secrets-vault:v1:${safeUserId}`)
    .digest();
}

function getUserVaultPath(userId: string): { safeUserId: string; vaultPath: string; userDir: string } {
  const safeUserId = sanitizeUserId(userId);
  const userDir = path.resolve(USER_WORKSPACES_ROOT, safeUserId);
  const rootResolved = path.resolve(USER_WORKSPACES_ROOT);
  if (!userDir.startsWith(rootResolved + path.sep)) {
    throw new Error('User vault path escapes workspace root');
  }
  fs.mkdirSync(userDir, { recursive: true, mode: 0o700 });
  return {
    safeUserId,
    userDir,
    vaultPath: path.join(userDir, '.secrets.vault.enc')
  };
}

function maskSecretValue(value: string): string {
  if (!value) return 'Not Configured';
  if (value.length <= 8) return '••••••••';
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

function fingerprintSecret(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 12).toUpperCase();
}

function encryptValue(key: Buffer, plaintext: string): { iv: string; tag: string; ciphertext: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    ciphertext: encrypted.toString('hex')
  };
}

function decryptValue(key: Buffer, entry: UserVaultEntry): string | null {
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(entry.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(entry.tag, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(entry.ciphertext, 'hex')),
      decipher.final()
    ]);
    return decrypted.toString('utf8');
  } catch {
    return null;
  }
}

function readUserVaultFile(userId: string): { safeUserId: string; vaultPath: string; file: UserEncryptedVaultFile } {
  const { safeUserId, vaultPath } = getUserVaultPath(userId);
  if (!fs.existsSync(vaultPath)) {
    return {
      safeUserId,
      vaultPath,
      file: {
        version: 1,
        algorithm: 'aes-256-gcm',
        userId: safeUserId,
        updatedAt: new Date().toISOString(),
        entries: {}
      }
    };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(vaultPath, 'utf8')) as UserEncryptedVaultFile;
    if (!parsed || typeof parsed !== 'object' || typeof parsed.entries !== 'object') {
      throw new Error('Malformed vault file');
    }
    return { safeUserId, vaultPath, file: parsed };
  } catch {
    return {
      safeUserId,
      vaultPath,
      file: {
        version: 1,
        algorithm: 'aes-256-gcm',
        userId: safeUserId,
        updatedAt: new Date().toISOString(),
        entries: {}
      }
    };
  }
}

function writeUserVaultFile(vaultPath: string, file: UserEncryptedVaultFile): void {
  file.updatedAt = new Date().toISOString();
  const tmpPath = `${vaultPath}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(file, null, 2), { mode: 0o600 });
  fs.renameSync(tmpPath, vaultPath);
}

class UserSecretsVault {
  getSecret(userId: string, envVar: string): string | undefined {
    const normalized = String(envVar || '').trim().toUpperCase();
    if (!normalized) return undefined;
    const { safeUserId, file } = readUserVaultFile(userId);
    const entry = file.entries[normalized];
    if (!entry) return undefined;
    const key = deriveUserVaultKey(safeUserId);
    const val = decryptValue(key, entry);
    return val && val.trim() ? val.trim() : undefined;
  }

  setSecret(
    userId: string,
    envVar: string,
    value: string,
    metadata?: { label?: string; category?: SecretSpec['category']; description?: string }
  ): SecretTelemetry {
    const normalized = String(envVar || '').trim().toUpperCase();
    if (!ENV_VAR_PATTERN.test(normalized)) {
      throw new Error('Secret environment variable must match /^[A-Z][A-Z0-9_]{1,95}$/');
    }
    const trimmed = String(value ?? '').trim();
    if (!trimmed) {
      throw new Error('Secret value cannot be empty');
    }

    const { safeUserId, vaultPath, file } = readUserVaultFile(userId);
    const key = deriveUserVaultKey(safeUserId);
    const enc = encryptValue(key, trimmed);
    file.entries[normalized] = {
      ...enc,
      updatedAt: new Date().toISOString(),
      label: metadata?.label,
      category: metadata?.category,
      description: metadata?.description
    };
    writeUserVaultFile(vaultPath, file);
    return this.getTelemetryForEnvVar(userId, normalized);
  }

  deleteSecret(userId: string, envVar: string): boolean {
    const normalized = String(envVar || '').trim().toUpperCase();
    if (!normalized) return false;
    const { vaultPath, file } = readUserVaultFile(userId);
    if (!file.entries[normalized]) return false;
    delete file.entries[normalized];
    writeUserVaultFile(vaultPath, file);
    return true;
  }

  getTelemetryForEnvVar(userId: string, envVar: string): SecretTelemetry {
    const normalized = String(envVar || '').trim().toUpperCase();
    const { safeUserId, file } = readUserVaultFile(userId);
    const spec = CANONICAL_SECRET_SPECS.find((s) => s.envVar === normalized);
    const entry = file.entries[normalized];
    const key = deriveUserVaultKey(safeUserId);
    const plaintext = entry ? decryptValue(key, entry) : null;
    const configured = Boolean(plaintext && plaintext.trim().length > 0);

    return {
      id: spec?.id || normalized.toLowerCase(),
      name: spec?.name || entry?.label || normalized,
      envVar: normalized,
      category: spec?.category || entry?.category || 'Custom',
      status: configured ? 'INJECTED' : 'NOT_CONFIGURED',
      configured,
      source: configured ? 'vault' : 'unset',
      maskedValue: configured && plaintext ? maskSecretValue(plaintext) : 'Not Configured',
      fingerprint: configured && plaintext ? fingerprintSecret(plaintext) : null,
      length: configured && plaintext ? plaintext.length : 0,
      proxyEndpoint: spec?.proxyEndpoint || `/api/secrets/${encodeURIComponent(normalized)}`,
      description:
        spec?.description ||
        entry?.description ||
        'Personal encrypted credential stored exclusively in your isolated account vault.',
      quotaPolicy: spec?.quotaPolicy || 'USER_ISOLATED_VAULT',
      updatedAt: entry?.updatedAt
    };
  }

  listSecretTelemetry(userId: string): SecretTelemetry[] {
    const { file } = readUserVaultFile(userId);
    const seen = new Set<string>();
    const results: SecretTelemetry[] = [];

    for (const spec of CANONICAL_SECRET_SPECS) {
      seen.add(spec.envVar);
      results.push(this.getTelemetryForEnvVar(userId, spec.envVar));
    }

    for (const envVar of Object.keys(file.entries)) {
      if (!seen.has(envVar)) {
        results.push(this.getTelemetryForEnvVar(userId, envVar));
      }
    }

    return results;
  }

  getVaultHealth(userId: string): {
    status: 'LOCKED_AES_256_GCM';
    algorithm: 'aes-256-gcm';
    vaultFilePresent: boolean;
    totalTracked: number;
    configuredCount: number;
    missingCount: number;
    vaultStoredCount: number;
    envFallbackCount: number;
    scope: 'personal-isolated';
    updatedAt: string;
  } {
    const { vaultPath, file } = readUserVaultFile(userId);
    const telemetry = this.listSecretTelemetry(userId);
    const configuredCount = telemetry.filter((t) => t.configured).length;
    return {
      status: 'LOCKED_AES_256_GCM',
      algorithm: 'aes-256-gcm',
      vaultFilePresent: fs.existsSync(vaultPath),
      totalTracked: telemetry.length,
      configuredCount,
      missingCount: telemetry.length - configuredCount,
      vaultStoredCount: Object.keys(file.entries).length,
      envFallbackCount: 0,
      scope: 'personal-isolated',
      updatedAt: file.updatedAt
    };
  }
}

export const userSecretsVault = new UserSecretsVault();
