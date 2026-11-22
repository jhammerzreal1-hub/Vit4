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

import type { Artifact } from '../types';
import { ZipArchiveBuilder } from './zipBuilder';

export const VAULT_ARTIFACTS_STORAGE_KEY = 'aurelius_vault_artifacts_v1';

export type VaultBackupFormat = 'json' | 'zip';

export interface VaultBackupSummary {
  format: VaultBackupFormat;
  fileName: string;
  totalArtifacts: number;
  mediaFilesPackaged: number;
  byteSize: number;
  checksumSha256: string;
  warnings: string[];
  exportedAt: string;
}

/**
 * Collects all locally stored artifacts by merging React state artifacts with
 * any records persisted directly in localStorage ('aurelius_vault_artifacts_v1'),
 * deduplicating cleanly by artifact id.
 */
export function collectLocallyStoredArtifacts(propArtifacts: Artifact[]): Artifact[] {
  const byId = new Map<string, Artifact>();

  const addAll = (items: unknown) => {
    if (!Array.isArray(items)) return;
    for (const raw of items) {
      if (!raw || typeof raw !== 'object') continue;
      const item = raw as Artifact;
      const key = item.id || `local-${byId.size + 1}-${item.title || 'artifact'}`;
      if (!byId.has(key)) {
        byId.set(key, {
          ...item,
          id: key
        });
      }
    }
  };

  addAll(propArtifacts);

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(VAULT_ARTIFACTS_STORAGE_KEY);
      if (saved) {
        addAll(JSON.parse(saved));
      }
    }
  } catch {
    // Ignore malformed localStorage cache cleanly
  }

  return Array.from(byId.values());
}

export async function computeSha256Hex(input: string | Uint8Array): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
      const copy = new Uint8Array(bytes.length);
      copy.set(bytes);
      const digest = await crypto.subtle.digest('SHA-256', copy);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // Fallback below on non-secure contexts
  }
  const str = typeof input === 'string' ? input : new TextDecoder().decode(input);
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function sanitizeSegment(raw: string, fallback = 'artifact'): string {
  const cleaned = (raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
  return cleaned || fallback;
}

function mimeToExtension(mimeType: string, artifactType: Artifact['type']): string {
  const lower = (mimeType || '').toLowerCase();
  if (lower.includes('png')) return 'png';
  if (lower.includes('jpeg') || lower.includes('jpg')) return 'jpg';
  if (lower.includes('webp')) return 'webp';
  if (lower.includes('gif')) return 'gif';
  if (lower.includes('svg')) return 'svg';
  if (lower.includes('wav')) return 'wav';
  if (lower.includes('mpeg') || lower.includes('mp3')) return 'mp3';
  if (lower.includes('ogg')) return 'ogg';
  if (lower.includes('mp4')) return 'mp4';
  if (lower.includes('webm')) return 'webm';
  if (lower.includes('json')) return 'json';
  if (lower.includes('text/plain')) return 'txt';

  if (artifactType === 'image' || artifactType === 'spatial') return 'png';
  if (artifactType === 'music') return 'wav';
  if (artifactType === 'video') return 'mp4';
  if (artifactType === 'transcription' || artifactType === 'voice') return 'txt';
  return 'json';
}

function decodeDataUrl(dataUrl: string): { bytes: Uint8Array; mimeType: string } | null {
  try {
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx === -1) return null;
    const header = dataUrl.slice(5, commaIdx); // strip "data:"
    const payload = dataUrl.slice(commaIdx + 1);
    const mimeType = header.split(';')[0] || 'application/octet-stream';
    const isBase64 = header.includes(';base64');

    if (isBase64) {
      const binaryStr = atob(payload);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      return { bytes, mimeType };
    }

    const decoded = decodeURIComponent(payload);
    return { bytes: new TextEncoder().encode(decoded), mimeType };
  } catch {
    return null;
  }
}

function buildCategoryCounts(artifacts: Artifact[]): Record<string, number> {
  return {
    music: artifacts.filter((a) => a.type === 'music').length,
    image: artifacts.filter((a) => a.type === 'image').length,
    video: artifacts.filter((a) => a.type === 'video').length,
    transcription: artifacts.filter((a) => a.type === 'transcription').length,
    voice: artifacts.filter((a) => a.type === 'voice').length,
    spatial: artifacts.filter((a) => a.type === 'spatial').length,
    knowledge: artifacts.filter((a) => a.type === 'knowledge').length,
    dossier: artifacts.filter((a) => a.type === 'dossier').length
  };
}

export async function createArtifactsJsonBackup(
  artifacts: Artifact[],
  userId?: string
): Promise<{ blob: Blob; summary: VaultBackupSummary }> {
  const exportedAt = new Date().toISOString();
  const artifactsJson = JSON.stringify(artifacts);
  const checksumSha256 = await computeSha256Hex(artifactsJson);
  const fileName = `vault_all_artifacts_backup_${exportedAt.replace(/[:.]/g, '-')}.json`;

  const bundle = {
    bundleTitle: 'Lysander Sovereign Vault Backup Archive',
    schemaVersion: '1.0.0',
    exportedAt,
    storageSource: VAULT_ARTIFACTS_STORAGE_KEY,
    userId: userId || 'local-offline-vault',
    checksumSha256,
    totalCount: artifacts.length,
    categoryCounts: buildCategoryCounts(artifacts),
    artifacts
  };

  const jsonText = JSON.stringify(bundle, null, 2);
  const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });

  return {
    blob,
    summary: {
      format: 'json',
      fileName,
      totalArtifacts: artifacts.length,
      mediaFilesPackaged: 0,
      byteSize: blob.size,
      checksumSha256,
      warnings: [],
      exportedAt
    }
  };
}

export async function createArtifactsZipBackup(
  artifacts: Artifact[],
  userId?: string
): Promise<{ blob: Blob; summary: VaultBackupSummary }> {
  const exportedAt = new Date().toISOString();
  const stamp = exportedAt.replace(/[:.]/g, '-');
  const fileName = `vault_all_artifacts_backup_${stamp}.zip`;
  const zip = new ZipArchiveBuilder();
  const warnings: string[] = [];
  let mediaFilesPackaged = 0;

  const rawArtifactsPayload = JSON.stringify(artifacts, null, 2);
  const checksumSha256 = await computeSha256Hex(rawArtifactsPayload);
  zip.addTextFile('artifacts.json', rawArtifactsPayload);

  const manifestEntries: Array<{
    id: string;
    type: Artifact['type'];
    title: string;
    model: string;
    createdAt: string;
    folder: string;
    files: string[];
  }> = [];

  for (let idx = 0; idx < artifacts.length; idx++) {
    const item = artifacts[idx];
    const safeTitle = sanitizeSegment(item.title, `artifact_${idx + 1}`);
    const safeId = sanitizeSegment(item.id, `${idx + 1}`);
    const folder = `artifacts/${sanitizeSegment(item.type, 'other')}/${String(idx + 1).padStart(3, '0')}_${safeTitle}_${safeId}`;
    const packagedFiles: string[] = [];

    let parsedMetaJson: unknown = undefined;
    if (item.metadataJson) {
      try {
        parsedMetaJson = JSON.parse(item.metadataJson);
      } catch {
        parsedMetaJson = item.metadataJson;
      }
    }

    const metaRecord = {
      id: item.id,
      type: item.type,
      title: item.title,
      model: item.model,
      prompt: item.prompt,
      createdAt: item.createdAt,
      metadata: item.metadata || null,
      metadataData: parsedMetaJson ?? null,
      mediaUrlType: item.mediaUrl
        ? item.mediaUrl.startsWith('data:')
          ? 'data-url'
          : item.mediaUrl.startsWith('blob:')
            ? 'blob-url'
            : 'remote-url'
        : 'none'
    };

    const metaFile = `${folder}/metadata.json`;
    zip.addTextFile(metaFile, JSON.stringify(metaRecord, null, 2));
    packagedFiles.push('metadata.json');

    if (item.type === 'transcription' || item.type === 'voice') {
      const transcriptText = item.mediaUrl && !item.mediaUrl.startsWith('data:')
        ? `${item.prompt ? `Prompt: ${item.prompt}\n\n` : ''}${item.mediaUrl}`
        : item.prompt || '';
      zip.addTextFile(`${folder}/transcript.txt`, transcriptText);
      packagedFiles.push('transcript.txt');
    } else if (item.type === 'knowledge' || item.type === 'dossier') {
      const bodyObj = parsedMetaJson ?? item.metadata ?? { title: item.title, prompt: item.prompt };
      zip.addTextFile(`${folder}/content.json`, JSON.stringify(bodyObj, null, 2));
      packagedFiles.push('content.json');
    }

    if (item.mediaUrl) {
      if (item.mediaUrl.startsWith('data:')) {
        const decoded = decodeDataUrl(item.mediaUrl);
        if (decoded) {
          const ext = mimeToExtension(decoded.mimeType, item.type);
          const mediaFilename = `media.${ext}`;
          zip.addBinaryFile(`${folder}/${mediaFilename}`, decoded.bytes, ext === 'svg' || ext === 'txt' || ext === 'json');
          packagedFiles.push(mediaFilename);
          mediaFilesPackaged++;
        } else {
          warnings.push(`Could not decode data URL for artifact "${item.title}" (${item.id}); kept raw URL inside artifacts.json.`);
        }
      } else if (
        item.type !== 'transcription' &&
        item.type !== 'voice' &&
        (item.mediaUrl.startsWith('http://') || item.mediaUrl.startsWith('https://') || item.mediaUrl.startsWith('blob:') || item.mediaUrl.startsWith('/'))
      ) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 5000);
          const resp = await fetch(item.mediaUrl, { signal: controller.signal });
          clearTimeout(timer);
          if (resp.ok) {
            const buf = new Uint8Array(await resp.arrayBuffer());
            const mime = resp.headers.get('content-type') || '';
            const ext = mimeToExtension(mime, item.type);
            const mediaFilename = `media.${ext}`;
            zip.addBinaryFile(`${folder}/${mediaFilename}`, buf, false);
            packagedFiles.push(mediaFilename);
            mediaFilesPackaged++;
          } else {
            zip.addTextFile(`${folder}/media-url.txt`, item.mediaUrl);
            packagedFiles.push('media-url.txt');
            warnings.push(`HTTP ${resp.status} fetching media for "${item.title}"; saved URL reference instead.`);
          }
        } catch {
          zip.addTextFile(`${folder}/media-url.txt`, item.mediaUrl);
          packagedFiles.push('media-url.txt');
          warnings.push(`Remote media blocked or offline for "${item.title}"; saved URL reference instead.`);
        }
      }
    }

    manifestEntries.push({
      id: item.id,
      type: item.type,
      title: item.title,
      model: item.model,
      createdAt: item.createdAt,
      folder,
      files: packagedFiles
    });
  }

  const manifest = {
    bundleTitle: 'Lysander Sovereign Vault Backup Archive',
    schemaVersion: '1.0.0',
    exportedAt,
    storageSource: VAULT_ARTIFACTS_STORAGE_KEY,
    userId: userId || 'local-offline-vault',
    checksumSha256,
    totalCount: artifacts.length,
    mediaFilesPackaged,
    categoryCounts: buildCategoryCounts(artifacts),
    warnings,
    entries: manifestEntries
  };

  zip.addTextFile('manifest.json', JSON.stringify(manifest, null, 2));

  const blob = await zip.toBlob();

  return {
    blob,
    summary: {
      format: 'zip',
      fileName,
      totalArtifacts: artifacts.length,
      mediaFilesPackaged,
      byteSize: blob.size,
      checksumSha256,
      warnings,
      exportedAt
    }
  };
}

export function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
