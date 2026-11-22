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

import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Upload,
  Copy,
  Check,
  BookmarkPlus,
  Volume2,
  RefreshCw,
  Download
} from 'lucide-react';
import { requestMicrophoneStream } from '../utils/mediaPermissions';
import { apiFetch } from '../utils/authClient';

interface TranscribeModuleProps {
  onSaveToVault?: (title: string, prompt: string, model: string, transcript: string) => void;
}

type TranscribeMode = 'verbatim' | 'summary' | 'actions' | 'timestamps';

const TRANSCRIBE_PROMPTS: Record<TranscribeMode, { label: string; instruction: string }> = {
  verbatim: {
    label: 'Verbatim',
    instruction:
      'Transcribe this audio verbatim with accurate punctuation, standard capitalization, and paragraph structure.'
  },
  timestamps: {
    label: 'Speaker & Sections',
    instruction:
      'Transcribe this audio cleanly, separating distinct speakers or topic shifts clearly.'
  },
  summary: {
    label: 'Transcript + Brief',
    instruction:
      'Provide a concise executive summary first, followed by the full verbatim transcript.'
  },
  actions: {
    label: 'Action Extract',
    instruction:
      'Transcribe the audio and extract concrete tasks, decisions, and follow-up actions as bullet points.'
  }
};

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Failed to encode audio blob.'));
    };
    reader.onerror = () => reject(new Error('Audio read error.'));
    reader.readAsDataURL(blob);
  });
}

export const TranscribeModule: React.FC<TranscribeModuleProps> = ({ onSaveToVault }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcribeMode, setTranscribeMode] = useState<TranscribeMode>('verbatim');
  const [loading, setLoading] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [usedModel, setUsedModel] = useState('gemini-3.5-transcribe');
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const meterCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = meterCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bins = new Uint8Array(32);

    const drawMeter = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, w, h);

      if (analyserRef.current && isRecording) {
        analyserRef.current.getByteFrequencyData(bins);
      } else {
        bins.fill(4);
      }

      const barWidth = Math.max(4, Math.floor((w - 24) / bins.length) - 2);
      for (let i = 0; i < bins.length; i++) {
        const mag = bins[i] / 255;
        const barH = Math.max(4, mag * (h - 12));
        ctx.fillStyle = isRecording ? '#14b8a6' : '#27272a';
        ctx.fillRect(12 + i * (barWidth + 2), h - 6 - barH, barWidth, barH);
      }

      rafRef.current = requestAnimationFrame(drawMeter);
    };

    rafRef.current = requestAnimationFrame(drawMeter);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isRecording]);

  const stopMeterAudio = () => {
    const ctx = audioCtxRef.current;
    audioCtxRef.current = null;
    analyserRef.current = null;
    if (ctx && ctx.state !== 'closed') {
      try {
        const res = ctx.close();
        if (res && typeof res.catch === 'function') {
          res.catch(() => {});
        }
      } catch {}
    }
  };

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      stopMeterAudio();
    };
  }, []);

  const processAudioBlob = async (blob: Blob, mimeType: string) => {
    setLoading(true);
    setTranscription('');
    setSavedSuccess(false);
    setErrorMessage(null);

    try {
      const base64Audio = await blobToDataUrl(blob);
      const response = await apiFetch('/api/audio/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: base64Audio,
          mimeType: mimeType || 'audio/webm',
          prompt: TRANSCRIBE_PROMPTS[transcribeMode].instruction
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Transcription failed');

      setUsedModel(data.model || 'gemini-3.5-transcribe');
      setTranscription(data.transcription || 'No audible speech detected in audio stream.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Audio transcription failed');
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      setErrorMessage(null);
      audioChunksRef.current = [];
      const micRes = await requestMicrophoneStream({ allowPrompt: true });
      if (!micRes.stream) {
        throw new Error(
          micRes.status === 'denied'
            ? 'Microphone permission blocked in browser settings.'
            : 'Microphone access requires permission.'
        );
      }
      const stream = micRes.stream;

      const actx = new AudioContext();
      const source = actx.createMediaStreamSource(stream);
      const analyser = actx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      audioCtxRef.current = actx;
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const blobUrl = URL.createObjectURL(audioBlob);
        setAudioBlobUrl(blobUrl);
        stream.getTracks().forEach((track) => track.stop());
        stopMeterAudio();
        await processAudioBlob(audioBlob, 'audio/webm');
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((sec) => sec + 1);
      }, 1000);
    } catch (err: any) {
      setErrorMessage('Could not access microphone: ' + (err?.message || String(err)));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const handleFileSelected = async (file?: File) => {
    if (!file) return;
    setAudioBlobUrl(URL.createObjectURL(file));
    await processAudioBlob(file, file.type || 'audio/webm');
  };

  const handleCopy = () => {
    if (!transcription) return;
    navigator.clipboard.writeText(transcription);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    if (!transcription || !onSaveToVault) return;
    onSaveToVault(
      `Transcription (${TRANSCRIBE_PROMPTS[transcribeMode].label}) ${new Date().toLocaleDateString()}`,
      `Mode: ${transcribeMode}`,
      usedModel,
      transcription
    );
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2400);
  };

  const handleExportTxt = () => {
    if (!transcription) return;
    const blob = new Blob([transcription], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${Date.now()}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-6xl 2xl:max-w-7xl mx-auto p-3 sm:p-6 space-y-5">
      {/* Header Banner */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-3 rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30 shrink-0">
            <Mic className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2.5 flex-wrap">
              <span>Speech-to-Text Transcription Studio</span>
              <span className="text-[11px] font-mono text-teal-400">gemini-3.5-transcribe</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Live microphone capture and audio file ingest decoded via specialized Gemini transcription.
            </p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex flex-wrap bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs font-mono gap-1">
          {(Object.keys(TRANSCRIBE_PROMPTS) as TranscribeMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setTranscribeMode(m)}
              className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                transcribeMode === m
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/35 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {TRANSCRIBE_PROMPTS[m].label}
            </button>
          ))}
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-950/50 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-mono flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-200 text-xs px-2 py-0.5 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Recording & File Upload Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 flex flex-col items-center justify-between gap-4 text-center">
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-18 h-18 rounded-2xl flex items-center justify-center transition-colors shadow-xl cursor-pointer ${
              isRecording
                ? 'bg-rose-500 hover:bg-rose-400 text-white'
                : 'bg-teal-500 hover:bg-teal-400 text-zinc-950'
            }`}
          >
            {isRecording ? <Square className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
          </button>

          <div>
            <div className="text-sm font-bold text-zinc-100">
              {isRecording ? 'Capturing Audio Stream' : 'Record Microphone'}
            </div>
            <div className="text-xs text-zinc-400 font-mono mt-1 tabular-nums">
              {isRecording ? `Elapsed ${formatSeconds(recordingSeconds)}` : 'Click to begin capture'}
            </div>
          </div>

          <canvas
            ref={meterCanvasRef}
            width={360}
            height={48}
            className="w-full h-12 rounded-xl border border-zinc-800 bg-zinc-950"
          />
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleFileSelected(e.dataTransfer.files?.[0]);
          }}
          className={`bg-zinc-900/80 border rounded-2xl p-6 flex flex-col items-center justify-center gap-4 text-center transition-colors ${
            dragActive ? 'border-teal-400 bg-teal-950/20' : 'border-zinc-800'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept="audio/*"
            className="hidden"
            onChange={(e) => handleFileSelected(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-18 h-18 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-teal-400 border border-zinc-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <Upload className="w-7 h-7" />
          </button>
          <div>
            <div className="text-sm font-bold text-zinc-100">Upload or Drop Audio File</div>
            <div className="text-xs text-zinc-400 font-mono mt-1">
              MP3, WAV, WebM, M4A, OGG
            </div>
          </div>
        </div>
      </div>

      {audioBlobUrl && (
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-3 flex items-center gap-3">
          <Volume2 className="w-4 h-4 text-teal-400 shrink-0" />
          <span className="text-xs font-mono text-zinc-400 shrink-0">Source Audio:</span>
          <audio src={audioBlobUrl} controls className="w-full h-8" />
        </div>
      )}

      {loading && (
        <div className="bg-zinc-900 border border-teal-500/25 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-center">
          <RefreshCw className="w-7 h-7 text-teal-400 animate-spin" />
          <div className="text-sm font-semibold text-zinc-200">
            Transcribing acoustic frames via gemini-3.5-transcribe...
          </div>
        </div>
      )}

      {transcription && !loading && (
        <div className="bg-zinc-900 border border-teal-500/30 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="font-bold text-zinc-200 uppercase">Transcript Result</span>
              <span className="text-zinc-500">·</span>
              <span className="text-teal-400">{usedModel}</span>
            </div>

            <div className="flex items-center gap-2">
              {onSaveToVault && (
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex items-center gap-1.5 text-xs bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 px-3 py-1.5 rounded-lg text-zinc-200 cursor-pointer"
                >
                  {savedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <BookmarkPlus className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{savedSuccess ? 'Saved' : 'Save to Vault'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleExportTxt}
                className="flex items-center gap-1.5 text-xs bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 px-3 py-1.5 rounded-lg text-zinc-300 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export .TXT</span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 px-3 py-1.5 rounded-lg text-teal-300 font-medium cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-sm text-zinc-100 leading-relaxed whitespace-pre-wrap">
            {transcription}
          </div>
        </div>
      )}
    </div>
  );
};
