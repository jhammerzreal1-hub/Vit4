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
  Search,
  MapPin,
  Globe,
  ExternalLink,
  Compass,
  Layers,
  Send,
  Copy,
  Check,
  ArrowRight,
  Navigation,
  BookmarkPlus
} from 'lucide-react';

interface GroundingModuleProps {
  initialMode?: 'search' | 'maps';
  onSaveToVault?: (
    type: 'knowledge',
    title: string,
    prompt: string,
    model: string,
    mediaUrl?: string,
    metadataJson?: string
  ) => void;
}

export const GroundingModule: React.FC<GroundingModuleProps> = ({
  initialMode = 'search',
  onSaveToVault
}) => {
  const [mode, setMode] = useState<'search' | 'maps'>(initialMode);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [useGeolocation, setUseGeolocation] = useState(false);
  const [geoCoords, setGeoCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [result, setResult] = useState<{
    text: string;
    groundingMetadata?: any;
    model: string;
    error?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const searchPresets = [
    'Latest verified benchmarks and capabilities of modern open-weight inference clusters',
    'Recent developments in photonic interconnects for data center networking',
    'Current regulatory standards for autonomous AI orchestration security'
  ];

  const mapsPresets = [
    'Locate major semiconductor manufacturing corridors in Arizona and their primary logistics hubs',
    'High-speed rail transit stations and engineering campuses in Zurich',
    'Notable public research libraries and makerspaces near downtown San Francisco'
  ];

  const requestLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        });
        setUseGeolocation(true);
      },
      () => {
        setUseGeolocation(false);
      }
    );
  };

  const handleExecute = async (presetQuery?: string) => {
    const queryText = presetQuery || prompt;
    if (!queryText.trim() || loading) return;

    setLoading(true);
    setResult(null);
    setSavedNotice(false);

    const endpoint = mode === 'search' ? '/api/grounding/search' : '/api/grounding/maps';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: queryText.trim(),
          ...(mode === 'maps' && useGeolocation && geoCoords ? { latLng: geoCoords } : {})
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Grounding call failed');
      setResult(data);
    } catch (err: any) {
      setResult({
        text: `Error during ${mode === 'search' ? 'Google Search' : 'Google Maps'} grounding: ${err?.message || String(err)}`,
        model: 'gemini-4-hydrogen',
        error: err?.message || String(err)
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result?.text) return;
    navigator.clipboard.writeText(result.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    if (!result?.text || !onSaveToVault) return;
    onSaveToVault(
      'knowledge',
      `${mode === 'search' ? 'Search Grounding' : 'Maps Grounding'}: ${(prompt || 'Query').slice(0, 48)}`,
      result.text,
      result.model || 'gemini-4-hydrogen',
      undefined,
      JSON.stringify({
        mode,
        groundingMetadata: result.groundingMetadata || null
      })
    );
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2200);
  };

  const chunks: any[] = result?.groundingMetadata?.groundingChunks || [];

  return (
    <div className="w-full max-w-6xl 2xl:max-w-7xl mx-auto p-3 sm:p-6 space-y-5">
      {/* Header Banner */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`p-2.5 rounded-xl shrink-0 border ${
              mode === 'search'
                ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
            }`}
          >
            {mode === 'search' ? <Search className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2.5 flex-wrap">
              <span>{mode === 'search' ? 'Google Search Grounding' : 'Google Maps Grounding'}</span>
              <span className="text-[11px] font-mono text-amber-400">gemini-4-hydrogen</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {mode === 'search'
                ? 'Live real-world fact retrieval and source verification via Google Search grounding.'
                : 'Geospatial intelligence, place verification, and transit corridor lookup via Google Maps grounding.'}
            </p>
          </div>
        </div>

        <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs font-medium self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setMode('search');
              setResult(null);
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              mode === 'search'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/35 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('maps');
              setResult(null);
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              mode === 'maps'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Maps</span>
          </button>
        </div>
      </div>

      {/* Prompt Input & Optional Maps Geolocation */}
      <div className="space-y-3">
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              mode === 'search'
                ? 'Ask a real-time factual question verified against live Google Search...'
                : 'Query geographic places, logistics corridors, or nearby destinations...'
            }
            rows={3}
            className="w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 pb-14 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 resize-none shadow-lg"
          />

          <div className="absolute left-4 bottom-3 flex items-center gap-2">
            {mode === 'maps' && (
              <button
                type="button"
                onClick={() => (useGeolocation ? setUseGeolocation(false) : requestLocation())}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 cursor-pointer ${
                  useGeolocation && geoCoords
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Navigation className="w-3 h-3" />
                <span>
                  {useGeolocation && geoCoords
                    ? `GPS ${geoCoords.latitude.toFixed(2)}, ${geoCoords.longitude.toFixed(2)}`
                    : 'Attach Local GPS'}
                </span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleExecute()}
            disabled={!prompt.trim() || loading}
            className={`absolute right-3 bottom-3 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              mode === 'search'
                ? 'bg-sky-500 hover:bg-sky-400 text-zinc-950'
                : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950'
            }`}
          >
            <span>{loading ? 'Grounding...' : 'Execute Grounding'}</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono text-zinc-500">Suggested:</span>
          {(mode === 'search' ? searchPresets : mapsPresets).map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setPrompt(preset);
                handleExecute(preset);
              }}
              className="text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-amber-300 border border-zinc-800 rounded-lg px-2.5 py-1 text-left transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span className="truncate max-w-[240px] sm:max-w-[300px]">{preset}</span>
              <ArrowRight className="w-3 h-3 shrink-0 opacity-60" />
            </button>
          ))}
        </div>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-center">
          <div
            className={`w-9 h-9 rounded-full border-2 border-t-transparent animate-spin ${
              mode === 'search' ? 'border-sky-400' : 'border-emerald-400'
            }`}
          />
          <div className="text-sm font-medium text-zinc-200">
            Consulting {mode === 'search' ? 'Google Search' : 'Google Maps'} Grounding...
          </div>
          <div className="text-xs text-zinc-500 font-mono">Model: gemini-4-hydrogen</div>
        </div>
      )}

      {/* Results & Citations */}
      {result && !loading && (
        <div className="bg-zinc-900/85 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="font-semibold text-zinc-200 uppercase">
                {mode === 'search' ? 'Search Synthesis' : 'Maps Synthesis'}
              </span>
              <span className="text-zinc-500">·</span>
              <span className="text-amber-400">{result.model}</span>
            </div>

            <div className="flex items-center gap-2">
              {onSaveToVault && !result.error && (
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-amber-300 bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded-lg cursor-pointer"
                >
                  {savedNotice ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Saved</span>
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="w-3.5 h-3.5 text-amber-400" />
                      <span>Save to Vault</span>
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-zinc-100 bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded-lg cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap font-sans">
            {result.text}
          </div>

          {result.groundingMetadata && (
            <div className="mt-4 pt-4 border-t border-zinc-800 space-y-3">
              <div className="text-xs font-mono text-zinc-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Verified Citations & Links</span>
              </div>

              {Array.isArray(result.groundingMetadata.webSearchQueries) &&
                result.groundingMetadata.webSearchQueries.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-[11px] text-zinc-500 font-mono">Queries:</span>
                    {result.groundingMetadata.webSearchQueries.map((q: string, i: number) => (
                      <span
                        key={i}
                        className="bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded text-zinc-300 font-mono text-[11px]"
                      >
                        "{q}"
                      </span>
                    ))}
                  </div>
                )}

              {chunks.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {chunks.map((chunk: any, idx: number) => {
                    const web = chunk.web;
                    const maps = chunk.maps;
                    if (web) {
                      return (
                        <a
                          key={idx}
                          href={web.uri}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 transition-colors group text-xs"
                        >
                          <div className="truncate pr-2">
                            <div className="font-medium text-zinc-200 group-hover:text-amber-300 truncate">
                              {web.title || web.uri}
                            </div>
                            <div className="text-[10px] text-zinc-500 font-mono truncate">
                              {web.uri}
                            </div>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-amber-400 shrink-0" />
                        </a>
                      );
                    }
                    if (maps) {
                      return (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-zinc-950 border border-emerald-500/25 space-y-1.5 text-xs"
                        >
                          <a
                            href={maps.uri}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between font-medium text-emerald-300 hover:text-emerald-200"
                          >
                            <span className="truncate pr-2">{maps.title || 'Google Maps Place'}</span>
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          </a>
                          {maps.placeAnswerSources?.reviewSnippets?.length > 0 && (
                            <div className="space-y-1 pt-1 border-t border-zinc-800/80 text-[11px] text-zinc-400">
                              {maps.placeAnswerSources.reviewSnippets
                                .slice(0, 2)
                                .map((rev: any, rIdx: number) => (
                                  <a
                                    key={rIdx}
                                    href={rev.googleMapsUri || maps.uri}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block hover:text-zinc-200 truncate"
                                  >
                                    {rev.title || rev.reviewText || 'View place review'}
                                  </a>
                                ))}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
