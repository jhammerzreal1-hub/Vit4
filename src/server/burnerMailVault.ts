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

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface ArchivedBurnerMessage {
  id: string;
  provider?: string;
  from: {
    address: string;
    name?: string;
  };
  to: Array<{ address: string; name?: string }>;
  subject: string;
  intro: string;
  text?: string;
  html?: string;
  createdAt: string;
  archivedAt?: string;
  isRead?: boolean;
  hasAttachments?: boolean;
  attachments?: any[];
  size?: number;
  otpCode?: string | null;
  otpCandidates?: string[];
  verificationLinks?: string[];
  allUrls?: string[];
  archivedLocally?: boolean;
}

interface BurnerVaultDiskSchema {
  version: number;
  updatedAt: string;
  messagesByAddress: Record<string, ArchivedBurnerMessage[]>;
  deletedIdsByAddress: Record<string, string[]>;
}

const VAULT_DIR = path.resolve(process.cwd(), 'data');
const VAULT_FILE = path.join(VAULT_DIR, 'burner_messages_vault.json');
const MAX_MESSAGES_PER_ADDRESS = 250;
const MAX_TOMBSTONES_PER_ADDRESS = 500;

let vaultState: BurnerVaultDiskSchema = {
  version: 2,
  updatedAt: new Date().toISOString(),
  messagesByAddress: {},
  deletedIdsByAddress: {}
};

function loadVaultFromDisk(): void {
  try {
    if (!fs.existsSync(VAULT_DIR)) {
      fs.mkdirSync(VAULT_DIR, { recursive: true });
    }
    if (fs.existsSync(VAULT_FILE)) {
      const raw = fs.readFileSync(VAULT_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        vaultState = {
          version: 2,
          updatedAt: parsed.updatedAt || new Date().toISOString(),
          messagesByAddress: parsed.messagesByAddress && typeof parsed.messagesByAddress === 'object'
            ? parsed.messagesByAddress
            : {},
          deletedIdsByAddress: parsed.deletedIdsByAddress && typeof parsed.deletedIdsByAddress === 'object'
            ? parsed.deletedIdsByAddress
            : {}
        };
      }
    }
  } catch (err: any) {
    console.warn('[BurnerVault] Failed loading disk archive, starting fresh:', err?.message);
  }
}

function persistVaultToDisk(): void {
  try {
    if (!fs.existsSync(VAULT_DIR)) {
      fs.mkdirSync(VAULT_DIR, { recursive: true });
    }
    vaultState.updatedAt = new Date().toISOString();
    const tmpFile = `${VAULT_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(vaultState, null, 2), 'utf8');
    fs.renameSync(tmpFile, VAULT_FILE);
  } catch (err: any) {
    console.warn('[BurnerVault] Disk persist warning:', err?.message);
  }
}

loadVaultFromDisk();

export function normalizeAddressKey(address?: string, fallback?: string): string {
  const raw = (address || fallback || '').toLowerCase().trim();
  return raw;
}

export function generateStableMessageId(
  provider: string,
  address: string,
  fields: {
    nativeId?: string | number | null;
    from?: string;
    subject?: string;
    createdAt?: string | number;
    bodySample?: string;
  }
): string {
  if (fields.nativeId !== undefined && fields.nativeId !== null && String(fields.nativeId).trim() !== '') {
    return String(fields.nativeId).trim();
  }
  const digest = crypto
    .createHash('sha256')
    .update(
      [
        provider,
        normalizeAddressKey(address),
        String(fields.from || '').trim().toLowerCase(),
        String(fields.subject || '').trim(),
        String(fields.createdAt || ''),
        String(fields.bodySample || '').slice(0, 256)
      ].join('|')
    )
    .digest('hex')
    .slice(0, 18);
  return `${provider}-${digest}`;
}

export function decodeHtmlEntities(input: string): string {
  if (!input) return '';
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;|&#x27;/gi, "'")
    .replace(/&ndash;/gi, '-')
    .replace(/&mdash;/gi, ' - ')
    .replace(/&copy;/gi, '(c)')
    .replace(/&#(\d+);/g, (_, num) => {
      const code = parseInt(num, 10);
      return Number.isFinite(code) && code > 0 && code < 65536 ? String.fromCharCode(code) : ' ';
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) && code > 0 && code < 65536 ? String.fromCharCode(code) : ' ';
    });
}

export function htmlToCleanText(html: string): string {
  if (!html) return '';
  let cleaned = html
    // Remove invisible/non-content blocks that contain CSS hex colors, styles, scripts, metadata
    .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, '\n')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '\n')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '\n')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '\n')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    // Preserve visual line breaks for block elements
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|tr|li|h[1-6]|section|article|header|footer|blockquote|table)>/gi, '\n')
    .replace(/<\/(?:td|th|span|strong|b|em|a)>/gi, ' ')
    // Strip all remaining tags
    .replace(/<[^>]+>/g, '');

  cleaned = decodeHtmlEntities(cleaned);

  // Normalize horizontal whitespace while keeping line structure
  return cleaned
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isLikelyFalsePositiveOtp(rawCode: string, surroundingLine: string, hasExplicitKeyword: boolean): boolean {
  const normalized = rawCode.replace(/[\s-]/g, '');
  if (!normalized || normalized.length < 4 || normalized.length > 10) return true;

  // Reject pure repeating zeros or trivial placeholder numbers
  if (/^0+$/.test(normalized)) return true;

  // Reject 4-digit calendar years unless immediately paired with an explicit OTP label
  if (!hasExplicitKeyword && /^\d{4}$/.test(normalized)) {
    const year = parseInt(normalized, 10);
    if (year >= 1980 && year <= 2039) return true;
  }

  // Reject common address / footer / phone / CSS / copyright contexts
  const lowerLine = surroundingLine.toLowerCase();
  if (
    !hasExplicitKeyword &&
    /(?:copyright|©|\(c\)|all rights reserved|p\.?o\.?\s*box|parkway|boulevard|street|suite|avenue|irvine|mountain view|san francisco|unsubscribe|privacy policy|terms of|1-800|800-|888-|877-|tel:|phone|order\s*#|invoice\s*#|receipt\s*#|store\s*#|zip\s*code|\bca\s+\d{5}\b|\bny\s+\d{5}\b|\btx\s+\d{5}\b)/i.test(
      lowerLine
    )
  ) {
    return true;
  }

  // Reject hex color fragments like #702082
  if (new RegExp(`#${rawCode}\\b`, 'i').test(surroundingLine)) {
    return true;
  }

  return false;
}

function normalizeSpacedOrHyphenatedOtp(raw: string): string {
  const trimmed = raw.trim();
  // Collapse spaced single digits like "4 8 2 9 1 7" -> "482917"
  if (/^(?:\d\s+){3,7}\d$/.test(trimmed)) {
    return trimmed.replace(/\s+/g, '');
  }
  return trimmed;
}

export interface ExtractedEmailArtifacts {
  otpCode: string | null;
  otpCandidates: string[];
  verificationLinks: string[];
  allUrls: string[];
  cleanText: string;
}

/**
 * Forensic HTML-aware OTP & Verification Link extractor.
 * Safely strips CSS/HTML/URLs before scanning for one-time passwords (including Taco Bell,
 * DoorDash, Google, Discord, Steam, GitHub, bank & passwordless sign-in templates) so CSS hex
 * colors (e.g. #702082) and tracking URLs never shadow real verification codes.
 */
export function extractOtpAndLinks(
  textInput: string = '',
  subjectInput: string = '',
  htmlInput: string = ''
): ExtractedEmailArtifacts {
  const rawText = String(textInput || '');
  const rawHtml = String(htmlInput || '');
  const subject = decodeHtmlEntities(String(subjectInput || '').trim());

  // Determine whether textInput actually contains raw HTML (backward compatibility with callers passing text + html)
  const looksLikeHtml = /<(?:html|body|div|table|tr|td|p|span|a|style|br)\b/i.test(rawText);
  const htmlSource = rawHtml || (looksLikeHtml ? rawText : '');
  const plainFromHtml = htmlSource ? htmlToCleanText(htmlSource) : '';
  const plainFromText = looksLikeHtml ? htmlToCleanText(rawText) : decodeHtmlEntities(rawText);

  // Prefer genuine plaintext when rich, supplemented by cleaned HTML text so nothing in HTML-only emails is missed
  const cleanBody =
    plainFromText && plainFromHtml && plainFromHtml.length > plainFromText.length + 40
      ? `${plainFromText}\n\n${plainFromHtml}`
      : plainFromText || plainFromHtml || '';

  // 1. Extract URLs & HTML anchor links (with decoded &amp; -> &)
  const urlSet = new Set<string>();
  const verificationLinkSet = new Set<string>();

  const ignoreUrlRegex =
    /(?:\.(?:png|jpe?g|gif|webp|svg|ico|css|woff2?|ttf)(?:\?|$)|unsubscribe|opt[-_]?out|preferences|privacy[-_]?policy|terms[-_]?of|facebook\.com|instagram\.com|twitter\.com|x\.com\/|tiktok\.com|youtube\.com|linkedin\.com|apple\.com\/app|play\.google\.com\/store|fonts\.googleapis\.com|w3\.org)/i;
  const actionUrlRegex =
    /(?:verify|confirm|activate|validate|token|auth|login|log[-_]?in|signin|sign[-_]?in|magic|one[-_]?time|otp|passcode|passwordless|reset|claim|authorize|sso|redeem|session)/i;
  const actionAnchorTextRegex =
    /(?:verify|confirm|sign\s*in|log\s*in|activate|continue|complete|reset|magic\s*link|one[- ]?time|get\s*started|authenticate|authorize)/i;

  if (htmlSource) {
    const anchorRegex = /<a\b[^>]*href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;
    while ((match = anchorRegex.exec(htmlSource)) !== null) {
      const rawHref = decodeHtmlEntities((match[1] || match[2] || match[3] || '').trim());
      const anchorLabel = htmlToCleanText(match[4] || '');
      if (!/^https?:\/\//i.test(rawHref)) continue;
      urlSet.add(rawHref);
      if (!ignoreUrlRegex.test(rawHref) && (actionUrlRegex.test(rawHref) || actionAnchorTextRegex.test(anchorLabel))) {
        verificationLinkSet.add(rawHref);
      }
    }
  }

  const rawUrlMatches = `${rawText}\n${htmlSource}`.match(/https?:\/\/[^\s<>"')\]}]+/gi) || [];
  for (const rawUrl of rawUrlMatches) {
    const decoded = decodeHtmlEntities(rawUrl.replace(/[.,;!?]+$/, ''));
    if (!/^https?:\/\//i.test(decoded)) continue;
    urlSet.add(decoded);
    if (!ignoreUrlRegex.test(decoded) && actionUrlRegex.test(decoded)) {
      verificationLinkSet.add(decoded);
    }
  }

  // 2. Build clean OTP search corpus (with URLs & email addresses removed so IDs inside URLs never false-match)
  const sanitizeForOtp = (s: string) =>
    s
      .replace(/https?:\/\/\S+/gi, ' ')
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, ' ');

  const searchCorpus = sanitizeForOtp(`${subject}\n${cleanBody}`);
  const lines = searchCorpus
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const candidates: string[] = [];
  const addCandidate = (rawCode: string, lineContext: string, explicit: boolean) => {
    const code = normalizeSpacedOrHyphenatedOtp(rawCode);
    if (!code) return;
    if (isLikelyFalsePositiveOtp(code, lineContext, explicit)) return;
    if (!candidates.includes(code)) {
      candidates.push(code);
    }
  };

  // Tier 1A: Explicit keyword BEFORE the code (supports newlines & filler words like "Your Taco Bell one-time passcode is:\n482917")
  const explicitBeforeRegexes: RegExp[] = [
    /(?:one[- ]?time\s+(?:passcode|password|code|pin|verification(?:\s+code)?)|verification\s+code|security\s+code|confirmation\s+code|login\s+code|log[- ]?in\s+code|sign[- ]?in\s+code|access\s+code|temporary\s+(?:code|passcode|password|pin)|auth(?:entication)?\s+code|recovery\s+code|reset\s+code|passcode|\botp\b|\bpin\b)[^\n]{0,60}?(?:is|are|:|=|-|below|here)?[\s:\-–—\n]{1,40}((?:\d\s+){3,7}\d|\d{3,4}-\d{3,4}|\d{4,8})\b/gi,
    /(?:enter|use|type|input|copy)\s+(?:this|the|your|following)\s+(?:\d[- ]?digit\s+)?(?:one[- ]?time\s+)?(?:code|passcode|password|pin|otp)[^\n]{0,40}?[\s:\-–—\n]{1,40}((?:\d\s+){3,7}\d|\d{3,4}-\d{3,4}|\d{4,8})\b/gi,
    // Explicit alphanumeric OTP (must contain at least 1 letter AND 1 digit, directly after keyword)
    /(?:one[- ]?time\s+(?:passcode|password|code)|verification\s+code|security\s+code|login\s+code|sign[- ]?in\s+code|passcode|\botp\b)(?:\s*(?:is|:|=|-)\s*|\s*\n\s*)([A-Z0-9]{2,4}-[A-Z0-9]{3,5}|(?=[A-Z0-9]{5,8}\b)(?=.*\d)(?=.*[A-Z])[A-Z0-9]{5,8})\b/g
  ];

  for (const regex of explicitBeforeRegexes) {
    let m: RegExpExecArray | null;
    while ((m = regex.exec(searchCorpus)) !== null) {
      if (m[1]) {
        addCandidate(m[1], m[0], true);
      }
    }
  }

  // Tier 1B: Code BEFORE explicit keyword (e.g. "482917 is your Taco Bell one-time password")
  const explicitAfterRegex =
    /\b((?:\d\s+){3,7}\d|\d{3,4}-\d{3,4}|\d{4,8})\s+(?:is\s+)?your\s+(?:[A-Za-z0-9'&.-]+\s+){0,4}(?:one[- ]?time\s+)?(?:verification|security|confirmation|login|log[- ]?in|sign[- ]?in|temporary|account)?\s*(?:code|passcode|password|pin|otp)\b/gi;
  let afterMatch: RegExpExecArray | null;
  while ((afterMatch = explicitAfterRegex.exec(searchCorpus)) !== null) {
    if (afterMatch[1]) {
      addCandidate(afterMatch[1], afterMatch[0], true);
    }
  }

  // Tier 2: Standalone prominent code sitting on its own line (super common in brand HTML emails like Taco Bell)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const standalone = line.match(/^((?:\d\s+){3,7}\d|\d{3,4}-\d{3,4}|\d{4,8})$/);
    if (standalone && standalone[1]) {
      const prevContext = `${lines[i - 1] || ''} ${line} ${lines[i + 1] || ''}`;
      const nearOtpHint = /(?:code|passcode|password|pin|otp|verify|sign\s*in|log\s*in|expire|minute|valid|one[- ]?time)/i.test(prevContext);
      addCandidate(standalone[1], prevContext, nearOtpHint);
    }
  }

  // Tier 3: Subject line digits (e.g. "Taco Bell: 482917" or "Code: 123456")
  const subjectClean = sanitizeForOtp(subject);
  const subjSix = subjectClean.match(/\b(\d{6}|\d{3}-\d{3}|\d{4,8})\b/);
  if (subjSix && subjSix[1]) {
    addCandidate(subjSix[1], subjectClean, /(?:code|otp|pin|pass|verify|sign|log)/i.test(subjectClean));
  }

  // Tier 4: Fallback 6-digit then 4-8 digit in non-footer body lines
  if (candidates.length === 0) {
    for (const line of lines) {
      const sixMatches = line.match(/\b\d{6}\b/g) || [];
      for (const code of sixMatches) {
        addCandidate(code, line, false);
      }
    }
  }
  if (candidates.length === 0) {
    for (const line of lines) {
      const otherMatches = line.match(/\b(?:\d{5}|\d{7,8}|\d{4})\b/g) || [];
      for (const code of otherMatches) {
        addCandidate(code, line, false);
      }
    }
  }

  return {
    otpCode: candidates[0] || null,
    otpCandidates: candidates.slice(0, 6),
    verificationLinks: Array.from(verificationLinkSet).slice(0, 8),
    allUrls: Array.from(urlSet).slice(0, 12),
    cleanText: cleanBody
  };
}

export function isMessageHydrated(msg: ArchivedBurnerMessage | null | undefined): boolean {
  if (!msg) return false;
  const hasHtml = Boolean(msg.html && msg.html.trim().length > 0);
  const hasRichText = Boolean(msg.text && msg.text.trim().length > 0);
  return hasHtml || hasRichText;
}

function mergeTwoMessages(existing: ArchivedBurnerMessage, incoming: ArchivedBurnerMessage): ArchivedBurnerMessage {
  const bestText =
    (incoming.text && incoming.text.trim().length >= (existing.text || '').trim().length)
      ? incoming.text
      : (existing.text || incoming.text || '');

  const bestHtml =
    (incoming.html && incoming.html.trim().length >= (existing.html || '').trim().length)
      ? incoming.html
      : (existing.html || incoming.html || '');

  const bestIntro =
    (incoming.intro && incoming.intro.trim().length > (existing.intro || '').trim().length)
      ? incoming.intro
      : (existing.intro || incoming.intro || bestText.slice(0, 160));

  const bestSubject =
    incoming.subject && incoming.subject !== '(No Subject)'
      ? incoming.subject
      : (existing.subject || incoming.subject || '(No Subject)');

  // Re-run OTP extraction over richest available content if either lacked an OTP or body grew richer
  let otpCode = incoming.otpCode || existing.otpCode || null;
  let otpCandidates = Array.from(new Set([...(incoming.otpCandidates || []), ...(existing.otpCandidates || [])]));
  let verificationLinks = Array.from(new Set([...(incoming.verificationLinks || []), ...(existing.verificationLinks || [])]));
  let allUrls = Array.from(new Set([...(incoming.allUrls || []), ...(existing.allUrls || [])]));

  if ((bestHtml || bestText) && (!otpCode || otpCandidates.length === 0)) {
    const extracted = extractOtpAndLinks(bestText, bestSubject, bestHtml);
    otpCode = otpCode || extracted.otpCode;
    otpCandidates = Array.from(new Set([...otpCandidates, ...extracted.otpCandidates]));
    verificationLinks = Array.from(new Set([...verificationLinks, ...extracted.verificationLinks]));
    allUrls = Array.from(new Set([...allUrls, ...extracted.allUrls]));
  }

  return {
    ...existing,
    ...incoming,
    id: existing.id,
    subject: bestSubject,
    intro: bestIntro,
    text: bestText || undefined,
    html: bestHtml || undefined,
    from: {
      address: incoming.from?.address && incoming.from.address !== 'Unknown Sender'
        ? incoming.from.address
        : (existing.from?.address || 'Unknown Sender'),
      name: incoming.from?.name && incoming.from.name !== 'Unknown'
        ? incoming.from.name
        : (existing.from?.name || incoming.from?.address || 'Unknown')
    },
    to: (incoming.to && incoming.to.length > 0) ? incoming.to : existing.to,
    createdAt: existing.createdAt || incoming.createdAt || new Date().toISOString(),
    archivedAt: existing.archivedAt || incoming.archivedAt || new Date().toISOString(),
    isRead: Boolean(existing.isRead || incoming.isRead),
    hasAttachments: Boolean(existing.hasAttachments || incoming.hasAttachments),
    attachments: (incoming.attachments && incoming.attachments.length > 0) ? incoming.attachments : (existing.attachments || []),
    size: Math.max(Number(existing.size) || 0, Number(incoming.size) || 0, (bestText?.length || 0) + (bestHtml?.length || 0)),
    otpCode,
    otpCandidates: otpCandidates.slice(0, 6),
    verificationLinks: verificationLinks.slice(0, 8),
    allUrls: allUrls.slice(0, 12),
    archivedLocally: true
  };
}

export function isMessageDeleted(address: string, messageId: string): boolean {
  const key = normalizeAddressKey(address);
  if (!key || !messageId) return false;
  const tombstones = vaultState.deletedIdsByAddress[key];
  return Array.isArray(tombstones) && tombstones.includes(messageId);
}

export function upsertArchivedMessages(
  address: string,
  incomingMessages: ArchivedBurnerMessage[]
): ArchivedBurnerMessage[] {
  const key = normalizeAddressKey(address);
  if (!key) return incomingMessages;

  const tombstones = new Set(vaultState.deletedIdsByAddress[key] || []);
  const existingList = vaultState.messagesByAddress[key] || [];
  const mapById = new Map<string, ArchivedBurnerMessage>();

  for (const msg of existingList) {
    if (!msg?.id || tombstones.has(msg.id)) continue;
    mapById.set(msg.id, { ...msg, archivedLocally: true });
  }

  let changed = false;

  for (const rawMsg of incomingMessages) {
    if (!rawMsg?.id || tombstones.has(rawMsg.id)) continue;
    const prev = mapById.get(rawMsg.id);
    if (prev) {
      const merged = mergeTwoMessages(prev, rawMsg);
      // Detect meaningful upgrade before writing disk
      if (
        (merged.html || '').length !== (prev.html || '').length ||
        (merged.text || '').length !== (prev.text || '').length ||
        merged.otpCode !== prev.otpCode ||
        (merged.verificationLinks?.length || 0) !== (prev.verificationLinks?.length || 0)
      ) {
        changed = true;
      }
      mapById.set(rawMsg.id, merged);
    } else {
      const enriched: ArchivedBurnerMessage = {
        ...rawMsg,
        archivedAt: rawMsg.archivedAt || new Date().toISOString(),
        archivedLocally: true
      };
      mapById.set(rawMsg.id, enriched);
      changed = true;
    }
  }

  const sorted = Array.from(mapById.values())
    .sort((a, b) => (new Date(b.createdAt).getTime() || 0) - (new Date(a.createdAt).getTime() || 0))
    .slice(0, MAX_MESSAGES_PER_ADDRESS);

  vaultState.messagesByAddress[key] = sorted;
  if (changed) {
    persistVaultToDisk();
  }

  return sorted;
}

export function getArchivedMessages(address: string): ArchivedBurnerMessage[] {
  const key = normalizeAddressKey(address);
  if (!key) return [];
  const tombstones = new Set(vaultState.deletedIdsByAddress[key] || []);
  return (vaultState.messagesByAddress[key] || [])
    .filter(m => m && m.id && !tombstones.has(m.id))
    .sort((a, b) => (new Date(b.createdAt).getTime() || 0) - (new Date(a.createdAt).getTime() || 0));
}

export function getArchivedMessageById(address: string | undefined, messageId: string): ArchivedBurnerMessage | null {
  if (!messageId) return null;
  const key = normalizeAddressKey(address);
  if (key && vaultState.messagesByAddress[key]) {
    const exact = vaultState.messagesByAddress[key].find(m => m.id === messageId);
    if (exact) return exact;
  }
  // Fallback scan across all archived inboxes (useful for Unified All-Inboxes view)
  for (const list of Object.values(vaultState.messagesByAddress)) {
    const found = list.find(m => m.id === messageId);
    if (found) return found;
  }
  return null;
}

export function markMessageDeleted(address: string | undefined, messageId: string): boolean {
  if (!messageId) return false;
  const key = normalizeAddressKey(address);
  let removed = false;

  if (key) {
    if (!vaultState.deletedIdsByAddress[key]) {
      vaultState.deletedIdsByAddress[key] = [];
    }
    if (!vaultState.deletedIdsByAddress[key].includes(messageId)) {
      vaultState.deletedIdsByAddress[key].unshift(messageId);
      vaultState.deletedIdsByAddress[key] = vaultState.deletedIdsByAddress[key].slice(0, MAX_TOMBSTONES_PER_ADDRESS);
    }
    if (vaultState.messagesByAddress[key]) {
      const before = vaultState.messagesByAddress[key].length;
      vaultState.messagesByAddress[key] = vaultState.messagesByAddress[key].filter(m => m.id !== messageId);
      if (vaultState.messagesByAddress[key].length < before) removed = true;
    }
  } else {
    for (const addrKey of Object.keys(vaultState.messagesByAddress)) {
      const before = vaultState.messagesByAddress[addrKey].length;
      vaultState.messagesByAddress[addrKey] = vaultState.messagesByAddress[addrKey].filter(m => m.id !== messageId);
      if (vaultState.messagesByAddress[addrKey].length < before) {
        removed = true;
        if (!vaultState.deletedIdsByAddress[addrKey]) vaultState.deletedIdsByAddress[addrKey] = [];
        if (!vaultState.deletedIdsByAddress[addrKey].includes(messageId)) {
          vaultState.deletedIdsByAddress[addrKey].unshift(messageId);
        }
      }
    }
  }

  persistVaultToDisk();
  return removed;
}
