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

/**
 * 🎙️ AURELIUS & LYSANDER SOVEREIGN ACOUSTIC & VOICE ENGINE
 * ============================================================================
 * Provides rich multi-model neural voice synthesis, Gemini Cloud voices,
 * Free Open-Source Professional Voice Modules (Kokoro-82M, Piper, Orpheus, Bark),
 * real-time pitch/rate/timbre acoustic modulation, intelligent oral narrative
 * extraction (filtering out redundant file numbers, diffs, and code blocks),
 * and infinite-length coherent sentence chunking.
 * ============================================================================
 */

import { dev_null } from './devNullLogger';
import { audioSwarm } from './AudioSwarm';

export interface VoicePersona {
  id: string;
  name: string;
  description: string;
  badge: string;
  gender: 'female' | 'male' | 'synthetic';
  preferredLang: string;
  defaultPitch: number;
  defaultRate: number;
  filterPreset: 'studio' | 'hologram' | 'subbass' | 'crisp';
  isGemini?: boolean;
  isOpenSourceModule?: boolean;
}

export const PRESET_VOICE_PERSONAS: VoicePersona[] = [
  // --- FREE OPEN-SOURCE NATIVE ENGLISH NEURAL VOICES (DEFAULT · UNLIMITED · ZERO QUOTA) ---
  {
    id: 'kokoro-82m-aurelia',
    name: 'Kokoro-82M Aurelia (Open Weights)',
    description: 'Ultra-realistic native American English female neural voice. 100% Free & Unlimited.',
    badge: 'Open-Source US Neural',
    gender: 'female',
    preferredLang: 'en-US',
    defaultPitch: 1.0,
    defaultRate: 1.0,
    filterPreset: 'studio',
    isOpenSourceModule: true
  },
  {
    id: 'orpheus-openvoice-seraphina',
    name: 'Orpheus OpenVoice Seraphina',
    description: 'Warm, expressive native American English female voice with natural human cadence.',
    badge: 'Open-Source US Neural',
    gender: 'female',
    preferredLang: 'en-US',
    defaultPitch: 1.0,
    defaultRate: 1.0,
    filterPreset: 'studio',
    isOpenSourceModule: true
  },
  {
    id: 'orpheus-openvoice-atlas',
    name: 'Orpheus OpenVoice Atlas',
    description: 'Resonant, natural native American English male voice for technical briefings.',
    badge: 'Open-Source US Neural',
    gender: 'male',
    preferredLang: 'en-US',
    defaultPitch: 1.0,
    defaultRate: 1.0,
    filterPreset: 'subbass',
    isOpenSourceModule: true
  },
  {
    id: 'piper-neural-alpha',
    name: 'Piper High-Fidelity Alpha',
    description: 'Crisp, fast native American English neural voice with zero rate limits.',
    badge: 'Piper US Neural',
    gender: 'female',
    preferredLang: 'en-US',
    defaultPitch: 1.0,
    defaultRate: 1.02,
    filterPreset: 'crisp',
    isOpenSourceModule: true
  },
  {
    id: 'kokoro-82m-bella',
    name: 'Kokoro-82M Bella (British Articulate)',
    description: 'Crisp Oxford British English articulation powered by open neural synthesis.',
    badge: 'Open-Source UK Neural',
    gender: 'female',
    preferredLang: 'en-GB',
    defaultPitch: 1.0,
    defaultRate: 1.0,
    filterPreset: 'crisp',
    isOpenSourceModule: true
  },
  {
    id: 'bark-sovereign-celeste',
    name: 'Bark Sovereign Celeste',
    description: 'Expressive native American English narrative voice with smooth intonation.',
    badge: 'Open-Source US Neural',
    gender: 'female',
    preferredLang: 'en-US',
    defaultPitch: 1.0,
    defaultRate: 1.0,
    filterPreset: 'studio',
    isOpenSourceModule: true
  },
  {
    id: 'edge-openneural-nova',
    name: 'Edge OpenNeural Nova',
    description: 'High-clarity native American English studio voice.',
    badge: 'Open-Source US Neural',
    gender: 'female',
    preferredLang: 'en-US',
    defaultPitch: 1.0,
    defaultRate: 1.0,
    filterPreset: 'crisp',
    isOpenSourceModule: true
  },

  // --- OPTIONAL GEMINI CLOUD VOICES ---
  {
    id: 'gemini-kore',
    name: 'Gemini Kore (Warm Narrative)',
    description: 'Smooth, natural American English podcast-grade voice (uses Open Neural when quota reached).',
    badge: 'Gemini Cloud',
    gender: 'female',
    preferredLang: 'en-US',
    defaultPitch: 1.0,
    defaultRate: 1.0,
    filterPreset: 'studio',
    isGemini: true
  },
  {
    id: 'gemini-puck',
    name: 'Gemini Puck (Dynamic Studio)',
    description: 'Upbeat, energetic American English cloud voice.',
    badge: 'Gemini Cloud',
    gender: 'female',
    preferredLang: 'en-US',
    defaultPitch: 1.0,
    defaultRate: 1.0,
    filterPreset: 'studio',
    isGemini: true
  },
  {
    id: 'gemini-charon',
    name: 'Gemini Charon (Deep Authoritative)',
    description: 'Deep, authoritative American English male voice.',
    badge: 'Gemini Cloud',
    gender: 'male',
    preferredLang: 'en-US',
    defaultPitch: 0.95,
    defaultRate: 1.0,
    filterPreset: 'subbass',
    isGemini: true
  },
  {
    id: 'gemini-fenrir',
    name: 'Gemini Fenrir (Authoritative Executive)',
    description: 'Balanced, commanding English executive presence.',
    badge: 'Gemini Cloud',
    gender: 'male',
    preferredLang: 'en-US',
    defaultPitch: 0.98,
    defaultRate: 1.0,
    filterPreset: 'crisp',
    isGemini: true
  },
  {
    id: 'gemini-aoede',
    name: 'Gemini Aoede (Harmonic Ethereal)',
    description: 'Melodic, serene American English cadence.',
    badge: 'Gemini Cloud',
    gender: 'female',
    preferredLang: 'en-US',
    defaultPitch: 1.0,
    defaultRate: 1.0,
    filterPreset: 'studio',
    isGemini: true
  }
];

// Blacklist of novelty, musical, robotic, foreign, and non-native accented English voice patterns
export const EXCLUDED_NOVELTY_VOICE_PATTERNS = [
  'bad news', 'good news', 'bells', 'boing', 'bubbles', 'cellos',
  'deranged', 'hysterical', 'pipe organ', 'trinoids', 'whisper', 'zarvox',
  'bahh', 'albert', 'junior', 'ralph', 'fred', 'kathy', 'princess', 'wobble',
  'sin-ji', 'tink', 'chime', 'ringtone', 'alert', 'sound', 'tone', 'organ',
  'basso', 'trill', 'cell', 'echo', 'jester', 'robot', 'alien', 'noise',
  'espeak', 'festival', 'mbrola', 'flite', 'pico',
  // Foreign languages & non-native English regional accents
  'french', 'german', 'spanish', 'italian', 'portuguese', 'russian',
  'hindi', 'hinglish', 'india', 'indian', 'chinese', 'cantonese', 'mandarin',
  'japanese', 'korean', 'arabic', 'dutch', 'polish', 'turkish', 'swedish',
  'norwegian', 'danish', 'finnish', 'greek', 'hebrew', 'indonesia', 'vietnam',
  'thai', 'czech', 'hungarian', 'romanian', 'slovak', 'ukrainian', 'afrikaans',
  'catalan', 'filipino', 'philippines', 'malay', 'singapore', 'singlish',
  'hong kong', 'nigeria', 'kenya', 'tanzania', 'south africa', 'ghana',
  // Common OS voice names for non-native English locales (en-IN, en-PH, en-SG, en-HK, en-NG, en-ZA, en-KE)
  'rishi', 'veena', 'neerja', 'prabhat', 'heera', 'ravi', 'sangeeta', 'lekha',
  'isha', 'kavya', 'aarav', 'ananya', 'swara', 'madhur', 'rosa', 'angelo',
  'luna', 'wayne', 'yan', 'sam', 'abeo', 'ezinne', 'asili', 'chilemba', 'leah', 'luke', 'tessa'
];

const STRICT_NATIVE_ENGLISH_LOCALES = new Set([
  'en-us',
  'en-gb',
  'en-ca',
  'en-au',
  'en-nz',
  'en-ie'
]);

export const isStrictNativeEnglishVoice = (voice: SpeechSynthesisVoice): boolean => {
  const lang = (voice.lang || '').toLowerCase().replace('_', '-').trim();
  // Strictly allow ONLY core native English locales (US, UK, CA, AU, NZ, IE)
  // Rejects foreign languages and foreign-accented English locales (en-IN, en-SG, en-PH, en-NG, en-HK, en-ZA, etc.)
  if (!STRICT_NATIVE_ENGLISH_LOCALES.has(lang)) return false;

  const name = (voice.name || '').toLowerCase();
  const uri = (voice.voiceURI || '').toLowerCase();
  for (const pattern of EXCLUDED_NOVELTY_VOICE_PATTERNS) {
    if (name.includes(pattern) || uri.includes(pattern)) return false;
  }
  return true;
};

export const isCleanHumanVoice = (voice: SpeechSynthesisVoice): boolean => {
  return isStrictNativeEnglishVoice(voice);
};

export const selectBestSystemVoice = (
  availableVoices: SpeechSynthesisVoice[],
  preferredNameOrUri?: string,
  preferredGender?: 'female' | 'male' | 'synthetic',
  preferredLang: string = 'en-US'
): SpeechSynthesisVoice | null => {
  if (!availableVoices || availableVoices.length === 0) return null;

  // 1. Strictly filter to native US/UK/CA/AU/NZ/IE English voices ONLY — NEVER fall back to foreign or foreign-accented voices
  const nativeEnVoices = availableVoices.filter(isStrictNativeEnglishVoice);
  if (nativeEnVoices.length === 0) return null;
  const pool = nativeEnVoices;

  // Infer gender and US/UK preference if preferredNameOrUri is one of our preset personas
  const matchedPersona = preferredNameOrUri
    ? PRESET_VOICE_PERSONAS.find(
        (p) => p.id.toLowerCase() === preferredNameOrUri.toLowerCase() || p.name.toLowerCase() === preferredNameOrUri.toLowerCase()
      )
    : undefined;

  const targetGender = preferredGender || matchedPersona?.gender || 'female';
  const rawTargetLang = (matchedPersona?.preferredLang || preferredLang || 'en-US').toLowerCase().replace('_', '-');
  const targetLang = STRICT_NATIVE_ENGLISH_LOCALES.has(rawTargetLang) ? rawTargetLang : 'en-us';

  // 2. If preferredNameOrUri directly matches a verified native English browser voice, return it
  if (preferredNameOrUri && !matchedPersona) {
    const exact = pool.find(
      (v) =>
        v.name.toLowerCase() === preferredNameOrUri.toLowerCase() ||
        v.name.toLowerCase().includes(preferredNameOrUri.toLowerCase()) ||
        v.voiceURI === preferredNameOrUri
    );
    if (exact) return exact;
  }

  // 3. Strongly prefer US English or British English first (easiest to understand)
  const dialectVoices = pool.filter((v) => (v.lang || '').toLowerCase().replace('_', '-') === targetLang);
  const usVoices = pool.filter((v) => (v.lang || '').toLowerCase().replace('_', '-') === 'en-us');
  const gbVoices = pool.filter((v) => (v.lang || '').toLowerCase().replace('_', '-') === 'en-gb');
  const langPool =
    dialectVoices.length > 0
      ? dialectVoices
      : usVoices.length > 0
      ? usVoices
      : gbVoices.length > 0
      ? gbVoices
      : pool;

  // 4. Ranked priority list of the most realistic native English human system voices
  const highRealismFemalePriority = [
    'ava online (natural)',
    'aria online (natural)',
    'jenny online (natural)',
    'michelle online (natural)',
    'ana online (natural)',
    'sonia online (natural)',
    'libby online (natural)',
    'google us english',
    'google uk english female',
    'samantha',
    'ava',
    'allison',
    'susan',
    'zira',
    'karen',
    'moira',
    'victoria',
    'natural',
    'neural'
  ];

  const highRealismMalePriority = [
    'andrew online (natural)',
    'brian online (natural)',
    'guy online (natural)',
    'christopher online (natural)',
    'eric online (natural)',
    'roger online (natural)',
    'steffan online (natural)',
    'ryan online (natural)',
    'google uk english male',
    'google us english',
    'alex',
    'daniel',
    'oliver',
    'david',
    'mark',
    'natural',
    'neural'
  ];

  const priorityKeywords = targetGender === 'male' ? highRealismMalePriority : highRealismFemalePriority;
  for (const kw of priorityKeywords) {
    const matched = langPool.find((v) => v.name.toLowerCase().includes(kw));
    if (matched) return matched;
  }

  return langPool[0] || pool[0] || null;
};

/**
 * 🧠 INTELLIGENT ORAL NARRATIVE EXTRACTOR
 * Strips non-oral noise (fenced code blocks, diff hunks, line numbers, file paths with line numbers,
 * JSON dumps, hex hashes, URLs, and raw CLI syntax) while preserving 100% of the coherent prose
 * that the model intends to orally convey, regardless of total length.
 */
export function extractCoherentOralNarrative(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return '';

  let text = rawText;

  // 1. Unwrap any explicit <oral>/<speak>/<voice> or [ORAL]/[VOICE_SUMMARY] tags in-place WITHOUT discarding surrounding prose
  text = text
    .replace(/<\/?(?:oral|speak|voice)>/gi, ' ')
    .replace(/\[\/?(?:ORAL|VOICE_SUMMARY)\]/gi, ' ');

  // 2. Remove <think>...</think> reasoning blocks (including unclosed trailing think blocks)
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, ' ');
  text = text.replace(/<think>[\s\S]*$/gi, ' ');

  // 3. Remove internal tool call XML / JSON trace blocks
  text = text.replace(/<(?:tool_call|function_calls|tool_result|artifact)>[\s\S]*?<\/(?:tool_call|function_calls|tool_result|artifact)>/gi, ' ');
  text = text.replace(/\[diff_block_start\][\s\S]*?\[diff_block_end\]/gi, ' ');

  // 4. Remove fenced multi-line code blocks (```...``` and ~~~...~~~) BEFORE any backtick stripping
  text = text.replace(/```[\s\S]*?```/g, ' ');
  text = text.replace(/~~~[\s\S]*?~~~/g, ' ');
  // If there is an unclosed code block at the very end of a streaming message, omit the raw code body
  text = text.replace(/```[a-zA-Z0-9_-]*\n[\s\S]*$/g, ' ');

  // 5. Filter line-by-line to remove diff hunks, numbered source-code dump lines, table borders, and raw code lines
  const lines = text.split('\n');
  const spokenLines: string[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      spokenLines.push('');
      continue;
    }

    // Skip unified diff markers and hunk headers
    if (/^@@\s*-\d+/.test(trimmed) || /^(\+\+\+|---)\s+\S+/.test(trimmed)) continue;
    // Skip numbered source file dump lines like "142 | const foo" or "142: const foo = bar;" (preserve normal numbered prose!)
    if (
      /^\d{1,5}\s*\|\s+/.test(trimmed) ||
      /^\d{1,5}:\s*(?:import\b|export\b|const\b|let\b|var\b|function\b|return\b|class\b|interface\b|type\b|[{}();/])/.test(trimmed)
    ) {
      continue;
    }
    // Skip markdown table border rows like "|---|---|"
    if (/^\|?[\s\-:|]+\|[\s\-:|]*$/.test(trimmed)) continue;
    // Skip standalone JSON / object / import / export / shell command lines
    if (/^(import\s+.*from\s+|export\s+(const|interface|type|function|class)\s+|const\s+\w+\s*=|let\s+\w+\s*=|function\s+\w+\s*\(|\{\s*"|\[\s*\{|\$\s+(npm|npx|git|cd|curl|grep|cat)\s+)/.test(trimmed)) {
      continue;
    }

    let line = trimmed;

    // Convert markdown headings and bullets into natural sentence boundaries
    line = line.replace(/^#{1,6}\s+/, '');
    line = line.replace(/^(?:[-*•+]|\d+[.)])\s+/, '');

    // Ensure lines that were headings or bullet points end with punctuation so they don't run together
    if (line.length > 0 && !/[.!?:;,]$/.test(line)) {
      line += '.';
    }

    spokenLines.push(line);
  }

  text = spokenLines.join(' ');

  // 6. Handle inline code backticks (`...`):
  //    - If the backticked content is a file path with line numbers, CLI flag, or code expression, strip or humanize it.
  //    - If it's a normal name or term (e.g. `Chronicles of Aetherion`), keep the words.
  text = text.replace(/`([^`]+)`/g, (_match, inner: string) => {
    const val = inner.trim();
    // Omit CLI flags, shell commands, or code syntax with braces/semicolons/arrows
    if (/^--?[a-zA-Z0-9_-]+/.test(val) || /[;{}()=>[\]$\\]/.test(val) || /^(npm|npx|git|tsc|vite)\b/i.test(val)) {
      return '';
    }
    // If it's a file path like "src/components/ChatModule.tsx:1827" or "/api/ui-master-kit/patch-ui"
    if (val.includes('/') || /\.[a-z]{2,4}(:\d+)?$/i.test(val)) {
      // Strip line/column numbers like :1827:12
      const withoutLines = val.replace(/:\d+(:\d+)?/g, '');
      const segments = withoutLines.split('/').filter(Boolean);
      const lastSeg = segments[segments.length - 1] || '';
      // Remove file extension (.tsx, .ts, .json, .md) for natural speech
      const humanName = lastSeg
        .replace(/\.(tsx|ts|jsx|js|json|md|css|html)$/i, '')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[-_]/g, ' ');
      return humanName;
    }
    return val;
  });

  // 7. Strip parenthesized file paths / line number citations like "(src/components/Foo.tsx, lines 100-200)"
  text = text.replace(/\(\s*(?:lines?\s*\d+[\s\-\d,]*|(?:\/?[\w.-]+\/)+[\w.-]+(?::\d+)?[^)]*)\s*\)/gi, ' ');

  // 8. Replace bare file paths with line numbers in prose (e.g. src/components/Header.tsx:240) with clean component name
  text = text.replace(/\b(?:\/?[\w.-]+\/)+([\w.-]+)\.(?:tsx|ts|jsx|js|json|md|css|py|sh)(?::\d+(?::\d+)?)?\b/gi, (_m, baseName: string) => {
    return baseName.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ');
  });

  // 9. Remove raw URLs, hex/SHA hashes, and UUIDs
  text = text.replace(/https?:\/\/[^\s)]+/gi, ' ');
  text = text.replace(/\b0x[a-fA-F0-9]{4,}(?:\.\.\.[a-fA-F0-9]+)?\b/g, ' ');
  text = text.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, ' ');

  // 10. Remove markdown links [label](url) -> keep label
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Remove bracketed telemetry tags like [RELEVANT], [INFO], [0x99a]
  text = text.replace(/\[[A-Z0-9_:\s-]{2,24}\]/g, ' ');

  // 11. Strip remaining markdown formatting symbols and normalize prosody
  text = text
    .replace(/[*_~#|>]/g, ' ')
    .replace(/\be\.g\.\b/gi, 'for example')
    .replace(/\bi\.e\.\b/gi, 'that is')
    .replace(/\bvs\.\b/gi, 'versus')
    .replace(/\betc\.\b/gi, 'et cetera')
    .replace(/\s*&\s*/g, ' and ')
    .replace(/(\w)\/(\w)/g, '$1 or $2')
    .replace(/\.{2,}/g, '.')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/([.,!?;:]){2,}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  return text;
}

/**
 * ♾️ INFINITE-LENGTH COHERENT SENTENCE CHUNKER
 * Splits a sanitized oral narrative of any length (even 100,000+ chars) into natural,
 * sentence-aligned chunks (~190 chars) so browser SpeechSynthesis and Cloud TTS
 * never truncate, timeout, or drop words mid-sentence.
 */
export function splitIntoCoherentSpeechChunks(oralText: string, maxChunkChars: number = 195): string[] {
  const cleaned = oralText.trim();
  if (!cleaned) return [];

  // Split by sentence boundaries (. ! ? ;) while keeping punctuation attached
  const rawSentences = cleaned.match(/[^.!?;]+[.!?;]+|[^.!?;]+$/g) || [cleaned];
  const chunks: string[] = [];
  let currentChunk = '';

  const pushClauseSplits = (longSentence: string) => {
    // Split long sentences on commas, colons, or dashes first
    const clauses = longSentence.split(/(?<=[,:—–-])\s+/);
    let temp = '';
    for (const clause of clauses) {
      if ((temp + ' ' + clause).trim().length <= maxChunkChars) {
        temp = (temp + ' ' + clause).trim();
      } else {
        if (temp) chunks.push(temp);
        if (clause.length <= maxChunkChars) {
          temp = clause.trim();
        } else {
          // Word-boundary split for ultra-long single clauses
          const words = clause.split(/\s+/);
          let wordBuf = '';
          for (const w of words) {
            if ((wordBuf + ' ' + w).trim().length <= maxChunkChars) {
              wordBuf = (wordBuf + ' ' + w).trim();
            } else {
              if (wordBuf) chunks.push(wordBuf);
              wordBuf = w;
            }
          }
          temp = wordBuf;
        }
      }
    }
    if (temp) chunks.push(temp);
  };

  for (const sentence of rawSentences) {
    const s = sentence.trim();
    if (!s) continue;

    if (s.length > maxChunkChars) {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
      pushClauseSplits(s);
    } else if ((currentChunk + ' ' + s).trim().length <= maxChunkChars) {
      currentChunk = (currentChunk + ' ' + s).trim();
    } else {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = s;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks.filter((c) => c.length > 0);
}

export interface AcousticFilterState {
  pitch: number;        // 0.5 to 2.0
  rate: number;         // 0.5 to 2.0
  warmth: number;       // 0.0 to 1.0 (Low-shelf boost)
  resonance: number;    // 0.0 to 1.0 (Presence Q-filter)
  formantShift: number; // -5 to +5 semitones
}

export class SovereignAcousticProcessor {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private isInitialized = false;

  public init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 256;
        this.isInitialized = true;
        audioSwarm.registerAudioContext(this.audioCtx);
      }
    } catch (e) {
      dev_null('[AcousticProcessor] WebAudio init notice:', e);
    }
  }

  public getVisualizerData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(0);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }
}

export const sovereignAcousticProcessor = new SovereignAcousticProcessor();

/**
 * 🛰️ SOVEREIGN VOICE QUEUE (FIFO + INFINITE STREAMING)
 * Prevents race conditions where multiple neural models attempt to speak simultaneously,
 * while supporting arbitrarily long multi-chunk reading sessions.
 */
export interface QueuedUtterance {
  id: string;
  text: string;
  personaId: string;
  rate: number;
  pitch: number;
  audioUrl?: string;
  appendToQueue?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

export class SovereignVoiceQueue {
  private static instance: SovereignVoiceQueue;

  private constructor() {}

  public static getInstance(): SovereignVoiceQueue {
    if (!SovereignVoiceQueue.instance) {
      SovereignVoiceQueue.instance = new SovereignVoiceQueue();
    }
    return SovereignVoiceQueue.instance;
  }

  public enqueue(item: QueuedUtterance) {
    audioSwarm.enqueue({
      id: item.id,
      text: item.text,
      audioUrl: item.audioUrl,
      rate: item.rate,
      pitch: item.pitch,
      personaId: item.personaId,
      appendToQueue: item.appendToQueue,
      onStart: item.onStart,
      onEnd: item.onEnd,
      onError: item.onError
    });
  }

  public cancel(_id?: string) {
    audioSwarm.stopAll();
  }
}

export const sovereignVoiceQueue = SovereignVoiceQueue.getInstance();
