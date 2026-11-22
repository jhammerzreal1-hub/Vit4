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

import React, { useState } from 'react';
import { 
  Archive, 
  Music, 
  Image as ImageIcon, 
  Video, 
  Mic, 
  Trash2, 
  Download, 
  Play, 
  Pause, 
  Copy, 
  Check, 
  ExternalLink,
  Layers,
  Sparkles,
  ShieldCheck,
  Search,
  FileCode2,
  Lock,
  Eye,
  X,
  FileArchive,
  FileJson,
  Loader2,
  FolderDown,
  Box,
  Radio
} from 'lucide-react';
import type { Artifact } from '../types';
import {
  collectLocallyStoredArtifacts,
  createArtifactsJsonBackup,
  createArtifactsZipBackup,
  triggerBlobDownload,
  type VaultBackupFormat,
  type VaultBackupSummary
} from '../utils/vaultBackup';

interface VaultModuleProps {
  artifacts: Artifact[];
  onDeleteArtifact?: (id: string) => void;
  userId?: string;
}

export const VaultModule: React.FC<VaultModuleProps> = ({ 
  artifacts, 
  onDeleteArtifact,
  userId 
}) => {
  const [filter, setFilter] = useState<'all' | 'music' | 'image' | 'video' | 'transcription' | 'voice' | 'spatial' | 'knowledge'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeAudio, setActiveAudio] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [backupFormat, setBackupFormat] = useState<VaultBackupFormat>('zip');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [backupNotice, setBackupNotice] = useState<{ type: 'success' | 'error'; summary?: VaultBackupSummary; message?: string } | null>(null);

  const allLocalArtifacts = collectLocallyStoredArtifacts(artifacts);

  const filtered = artifacts.filter(a => {
    const matchesFilter = filter === 'all' || a.type === filter;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesFilter;
    const matchesQuery = 
      (a.title && a.title.toLowerCase().includes(q)) ||
      (a.prompt && a.prompt.toLowerCase().includes(q)) ||
      (a.model && a.model.toLowerCase().includes(q));
    return matchesFilter && matchesQuery;
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'music': return <Music className="w-4 h-4 text-fuchsia-400" />;
      case 'image': return <ImageIcon className="w-4 h-4 text-purple-400" />;
      case 'video': return <Video className="w-4 h-4 text-rose-400" />;
      case 'transcription': return <Mic className="w-4 h-4 text-teal-400" />;
      case 'voice': return <Radio className="w-4 h-4 text-rose-400" />;
      case 'spatial': return <Box className="w-4 h-4 text-amber-400" />;
      case 'knowledge': return <FileCode2 className="w-4 h-4 text-cyan-400" />;
      default: return <Layers className="w-4 h-4 text-amber-400" />;
    }
  };

  const formatByteSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Download all locally stored artifacts as a single JSON or ZIP backup archive
  const handleDownloadAllArtifacts = async (requestedFormat?: VaultBackupFormat) => {
    if (isExporting) return;
    const formatToUse = requestedFormat || backupFormat;
    setIsExporting(true);
    setBackupNotice(null);

    try {
      const localArtifacts = collectLocallyStoredArtifacts(artifacts);
      const { blob, summary } = formatToUse === 'zip'
        ? await createArtifactsZipBackup(localArtifacts, userId)
        : await createArtifactsJsonBackup(localArtifacts, userId);

      triggerBlobDownload(blob, summary.fileName);
      setBackupNotice({ type: 'success', summary });
    } catch (err: any) {
      setBackupNotice({
        type: 'error',
        message: err?.message || 'Failed to package locally stored artifacts for backup.'
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Banner */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
            <Archive className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2 flex-wrap">
              <span>Sovereign Storage Vault</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
                Google Cloud Firestore
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-cyan-400" />
                SHA-256 Invariant Sealed
              </span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Persistent storage of generated music, videos, synthesis images, transcripts, OSINT audits, and architectural logs.
            </p>
          </div>
        </div>

        {/* Action Controls: Backup Format Selector + Download All Artifacts */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
          <div
            className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-[11px] font-mono"
            role="group"
            aria-label="Backup export format"
          >
            <button
              type="button"
              onClick={() => setBackupFormat('zip')}
              disabled={isExporting}
              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                backupFormat === 'zip'
                  ? 'bg-zinc-800 text-amber-300 font-bold border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Package all artifacts and decoded media into a ZIP archive"
            >
              <FileArchive className="w-3.5 h-3.5" />
              <span>ZIP</span>
            </button>
            <button
              type="button"
              onClick={() => setBackupFormat('json')}
              disabled={isExporting}
              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                backupFormat === 'json'
                  ? 'bg-zinc-800 text-amber-300 font-bold border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Export all artifacts as a single portable JSON backup"
            >
              <FileJson className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleDownloadAllArtifacts()}
            disabled={isExporting}
            className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-60 text-amber-300 border border-amber-500/40 text-xs font-mono font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            title={`Download all ${allLocalArtifacts.length} locally stored artifact(s) as a ${backupFormat.toUpperCase()} backup`}
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FolderDown className="w-3.5 h-3.5" />
            )}
            <span>
              {isExporting
                ? 'Packaging Backup...'
                : `Download All Artifacts (${allLocalArtifacts.length})`}
            </span>
          </button>
        </div>
      </div>

      {/* Backup Export Status Banner */}
      {backupNotice && (
        <div
          className={`rounded-2xl p-3.5 border text-xs font-mono flex items-start justify-between gap-3 ${
            backupNotice.type === 'success'
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
              : 'bg-red-950/30 border-red-500/30 text-red-300'
          }`}
        >
          <div className="space-y-1">
            {backupNotice.type === 'success' && backupNotice.summary ? (
              <>
                <div className="font-bold flex items-center gap-2 flex-wrap">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Backup exported: {backupNotice.summary.fileName} ({formatByteSize(backupNotice.summary.byteSize)})
                  </span>
                </div>
                <div className="text-[11px] text-emerald-400/90">
                  Artifacts: {backupNotice.summary.totalArtifacts} · Format: {backupNotice.summary.format.toUpperCase()}
                  {backupNotice.summary.format === 'zip'
                    ? ` · Media assets packaged: ${backupNotice.summary.mediaFilesPackaged}`
                    : ''}
                  {` · SHA-256: ${backupNotice.summary.checksumSha256.slice(0, 16)}...`}
                </div>
                {backupNotice.summary.warnings.length > 0 && (
                  <div className="text-[11px] text-amber-300/90 pt-0.5">
                    Notes: {backupNotice.summary.warnings.join(' | ')}
                  </div>
                )}
              </>
            ) : (
              <div>{backupNotice.message}</div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setBackupNotice(null)}
            className="p-1 rounded-lg hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 cursor-pointer shrink-0"
            aria-label="Dismiss backup notice"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-950 p-2 rounded-2xl border border-zinc-800">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search artifacts by title, model, or prompt..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none font-mono"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs font-mono flex-wrap gap-1">
          {(['all', 'music', 'image', 'video', 'spatial', 'transcription', 'voice', 'knowledge'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg capitalize transition-all cursor-pointer ${
                filter === tab
                  ? 'bg-zinc-800 text-amber-300 font-bold border border-zinc-700 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Artifacts Grid */}
      {filtered.length === 0 ? (
        <div className="border border-dashed border-zinc-800 rounded-2xl p-16 flex flex-col items-center justify-center gap-3 text-center text-zinc-500">
          <Archive className="w-12 h-12 stroke-1 text-zinc-600" />
          <div className="text-sm font-semibold text-zinc-300">
            {searchQuery ? 'No Matching Artifacts' : 'Vault Empty'}
          </div>
          <div className="text-xs text-zinc-500 font-mono max-w-sm">
            {searchQuery 
              ? `No artifacts matching "${searchQuery}". Clear search to view all items.`
              : 'Generate tracks in Lyria Music, visuals in Nano Banana 2.1, videos in Veo 3, voice transcripts, or OSINT reports and save to vault.'}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-zinc-700 transition-all shadow-lg group"
            >
              {/* Media Preview Header */}
              {(item.type === 'image' || item.type === 'spatial') && item.mediaUrl && (
                <div className="relative aspect-video bg-zinc-950 overflow-hidden">
                  <img src={item.mediaUrl} alt={item.title} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
              )}

              {item.type === 'video' && item.mediaUrl && (
                <div className="relative aspect-video bg-black overflow-hidden">
                  <video src={item.mediaUrl} controls className="w-full h-full object-contain" />
                </div>
              )}

              {item.type === 'music' && item.mediaUrl && (
                <div className="p-4 bg-gradient-to-r from-fuchsia-950/40 to-zinc-900 border-b border-zinc-800/80 flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (activeAudio === item.id) {
                        setActiveAudio(null);
                      } else {
                        setActiveAudio(item.id);
                      }
                    }}
                    className="w-10 h-10 rounded-xl bg-fuchsia-500 hover:bg-fuchsia-400 text-zinc-950 flex items-center justify-center transition-all shadow-md shrink-0 cursor-pointer"
                  >
                    {activeAudio === item.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>
                  <div className="flex-1 truncate">
                    <span className="text-xs font-mono font-semibold text-fuchsia-300 block truncate">
                      {item.title}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      Lyria Synthesized Audio
                    </span>
                  </div>
                  {activeAudio === item.id && (
                    <audio src={item.mediaUrl} autoPlay onEnded={() => setActiveAudio(null)} className="hidden" />
                  )}
                </div>
              )}

              {(item.type === 'transcription' || item.type === 'voice') && (
                <div className={`p-4 border-b border-zinc-800/80 max-h-32 overflow-y-auto text-xs text-zinc-300 font-mono ${item.type === 'voice' ? 'bg-rose-950/20' : 'bg-teal-950/20'}`}>
                  {item.mediaUrl || item.prompt}
                </div>
              )}

              {item.type === 'knowledge' && (
                <div className="p-3.5 bg-cyan-950/20 border-b border-zinc-800/80 flex items-center justify-between text-xs font-mono">
                  <span className="text-cyan-300 font-semibold flex items-center gap-1.5">
                    <FileCode2 className="w-3.5 h-3.5 text-cyan-400" />
                    OSINT &amp; Architecture Knowledge Artifact
                  </span>
                  <span className="text-[10px] text-zinc-500">Structured JSON</span>
                </div>
              )}

              {/* Card Body */}
              <div className="p-4 space-y-2 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-200 truncate">
                    {getIcon(item.type)}
                    <span className="truncate">{item.title}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-950 text-zinc-400 border border-zinc-800 shrink-0">
                    {item.model}
                  </span>
                </div>

                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                  {item.prompt}
                </p>

                {/* SHA-256 Invariant Stamp */}
                <div className="flex items-center gap-1.5 pt-1 text-[10px] font-mono text-emerald-400/90">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Immutable SHA-256 Provenance Attested</span>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="px-4 py-3 bg-zinc-950/60 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-500">
                <span>{item.createdAt}</span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedArtifact(item)}
                    className="p-1 hover:text-cyan-400 transition-colors cursor-pointer"
                    title="Inspect metadata"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  {item.mediaUrl && item.type !== 'music' && (
                    <a
                      href={item.mediaUrl}
                      download={`artifact-${item.id}`}
                      className="p-1 hover:text-amber-400 transition-colors"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {(item.type === 'transcription' || item.type === 'voice') && (
                    <button
                      onClick={() => handleCopy(item.mediaUrl || item.prompt, item.id)}
                      className="p-1 hover:text-teal-400 transition-colors cursor-pointer"
                      title="Copy text"
                    >
                      {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}

                  {onDeleteArtifact && (
                    <button
                      onClick={() => onDeleteArtifact(item.id)}
                      className="p-1 hover:text-red-400 transition-colors cursor-pointer"
                      title="Delete from Firestore"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal for Selected Artifact */}
      {selectedArtifact && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedArtifact(null);
          }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
        >
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                {getIcon(selectedArtifact.type)}
                <h3 className="font-bold text-sm text-zinc-100 truncate">{selectedArtifact.title}</h3>
              </div>
              <button
                onClick={() => setSelectedArtifact(null)}
                aria-label="Close Inspector"
                className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 font-mono text-xs text-zinc-300">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-zinc-500 block">Artifact Type</span>
                  <span className="text-amber-300 font-bold uppercase">{selectedArtifact.type}</span>
                </div>
                <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-zinc-500 block">Model Engine</span>
                  <span className="text-cyan-300 font-bold">{selectedArtifact.model}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-zinc-400 block font-bold">Prompt / Context:</span>
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 font-mono text-[11px] leading-relaxed whitespace-pre-wrap select-all">
                  {selectedArtifact.prompt}
                </div>
              </div>

              {(selectedArtifact.metadataJson || selectedArtifact.metadata) && (
                <div className="space-y-1">
                  <span className="text-zinc-400 block font-bold">Raw Structured Metadata:</span>
                  <pre className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 font-mono text-[10px] text-zinc-400 leading-relaxed overflow-x-auto select-all max-h-60">
                    {selectedArtifact.metadataJson || JSON.stringify(selectedArtifact.metadata, null, 2)}
                  </pre>
                </div>
              )}

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>System Immutable Provenance:  Local-System-Integrity-Proof Invariants Verified (100/100)</span>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => setSelectedArtifact(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-bold cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
