/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 * (TWENTY 47 PROTOCOL - GENESIS NODE / LYSANDER CORE EULA / H-FID Forensic License v1.1).
 * Zenodo DOI: https://doi.org/10.5281/zenodo.20778079 | ORCID: https://orcid.org/0009-0004-5273-7028
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Radio,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  PhoneOff,
  Compass,
  Wrench,
  Send,
  RefreshCw,
  GripHorizontal,
  Brain,
  BookmarkPlus,
  Check,
  Zap,
  Square,
  NotebookPen,
  ListTodo,
  Trash2,
  Copy,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import type { ModuleType } from '../types';
import { ALL_MODULES } from './Navigation';
import {
  PRESET_VOICE_PERSONAS,
  normalizeVoicePresetId,
  extractCoherentOralNarrative,
  splitIntoCoherentSpeechChunks
} from '../utils/voiceEngine';
import {
  pushContinuitySettingsPatch,
  saveVoiceContinuityToServer,
  fetchVoiceContinuityFromServer,
  updateLocalBeaconSnapshot
} from '../utils/continuityClient';
import {
  claimSharedMicrophoneStream,
  probeMediaPermission,
  requestMicrophoneStream,
  requestMicrophoneStreamOnUserGesture,
  isMicrophoneBlockedByFramePolicy,
  markMediaPermissionGranted,
  clearMediaPermissionGrant,
  hasRecentUserActivation,
  markVoiceUserGesture,
  loadPersistedMediaPermissions,
  isHardwareSwitchEnabled
} from '../utils/mediaPermissions';
import { apiFetch, getAuthBearerToken } from '../utils/authClient';
import { sovereignAi } from '../utils/sovereignAiDispatcher';

export type LiveVoicePersona = string;
export type NativeEnglishAccent = 'en-US' | 'en-GB';
export type MicCaptureMode = 'hybrid' | 'vad' | 'browser-stt';
export type MicHardwareStatus = 'idle' | 'requesting' | 'active' | 'needs-gesture' | 'denied' | 'frame-policy-blocked' | 'unavailable';

export interface TalkTranscriptEntry {
  id: string;
  role: 'user' | 'model' | 'thought' | 'tool';
  text: string;
  timestamp: string;
}

export interface VoiceBackgroundTask {
  id: string;
  title: string;
  prompt: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  result?: string;
  error?: string;
  model?: string;
  provider?: string;
}

export interface PersistentTalkDockProps {
  isActive: boolean;
  onDeactivate: () => void;
  activeModule: ModuleType;
  openModules: ModuleType[];
  onSelectModule: (mod: ModuleType) => void;
  onNavigateBrowserUrl?: (url: string) => void;
  onSaveToVault?: (title: string, content: string, model: string, metadataJson?: string) => void;
  onStatusChange?: (status: {
    connected: boolean;
    connecting: boolean;
    muted: boolean;
    speaking: boolean;
    exploringTool: string | null;
  }) => void;
}

const VOICE_OPTIONS: Array<{ id: LiveVoicePersona; label: string; style: string }> = PRESET_VOICE_PERSONAS
  .filter(p => !/bark|synthetic|experimental|robotic/i.test(p.id))
  .map(p => ({
    id: p.id,
    label: p.name,
    style: p.badge
  }));

function downsampleTo16k(float32: Float32Array, inputSampleRate: number): Float32Array {
  if (!inputSampleRate || inputSampleRate === 16000) return float32;
  const ratio = inputSampleRate / 16000;
  const outLength = Math.max(1, Math.round(float32.length / ratio));
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const srcIdx = i * ratio;
    const low = Math.floor(srcIdx);
    const high = Math.min(float32.length - 1, low + 1);
    const frac = srcIdx - low;
    out[i] = float32[low] * (1 - frac) + float32[high] * frac;
  }
  return out;
}

function pcmFloatToBase64(float32: Float32Array, inputSampleRate = 16000): string {
  const resampled = downsampleTo16k(float32, inputSampleRate);
  const pcm16 = new Int16Array(resampled.length);
  for (let i = 0; i < resampled.length; i++) {
    const s = Math.max(-1, Math.min(1, resampled[i]));
    pcm16[i] = s < 0 ? s * 32768 : s * 32767;
  }
  const bytes = new Uint8Array(pcm16.buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function cleanTextForSpeech(raw: string): string {
  const narrative = extractCoherentOralNarrative(raw);
  if (narrative) return narrative;
  return raw
    .replace(/<think>[\s\S]*?<\/think>/gi, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/https?:\/\/[^\s)]+/gi, ' ')
    .replace(/[*_~#|>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickBestRecorderMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus'
  ];
  for (const mime of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(mime)) return mime;
    } catch {}
  }
  return '';
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      resolve(result);
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to read audio clip'));
    reader.readAsDataURL(blob);
  });
}

export const PersistentTalkDock: React.FC<PersistentTalkDockProps> = ({
  isActive,
  onDeactivate,
  activeModule,
  openModules,
  onSelectModule,
  onNavigateBrowserUrl,
  onSaveToVault,
  onStatusChange
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [peerExploreEnabled, setPeerExploreEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sovereign_voice_peer_explore_v1');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });
  const [autoArchiveVault, setAutoArchiveVault] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sovereign_voice_auto_archive_v1');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });
  const [vaultSavedFlash, setVaultSavedFlash] = useState(false);
  const [transportMode, setTransportMode] = useState<'gemini-live-pcm' | 'sovereign-duplex-relay'>('sovereign-duplex-relay');
  const [interimSpeech, setInterimSpeech] = useState('');
  const [micStatus, setMicStatus] = useState<MicHardwareStatus>('idle');
  const [micConsentDismissed, setMicConsentDismissed] = useState(false);
  const [micLabel, setMicLabel] = useState<string>(() => {
    try {
      return localStorage.getItem('sovereign_voice_mic_label') || '';
    } catch {
      return '';
    }
  });
  const [micDevices, setMicDevices] = useState<Array<{ deviceId: string; label: string }>>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>(() => {
    try {
      return localStorage.getItem('sovereign_voice_mic_device_id') || '';
    } catch {
      return '';
    }
  });
  const [captureMode, setCaptureMode] = useState<MicCaptureMode>(() => {
    try {
      const saved = localStorage.getItem('sovereign_voice_capture_mode') as MicCaptureMode | null;
      if (saved === 'hybrid' || saved === 'vad' || saved === 'browser-stt') return saved;
    } catch {}
    return 'hybrid';
  });
  const [vadRecording, setVadRecording] = useState(false);
  const [vadTranscribing, setVadTranscribing] = useState(false);

  const [voiceName, setVoiceName] = useState<LiveVoicePersona>(() => {
    try {
      const saved = localStorage.getItem('sovereign_persistent_talk_voice_v1');
      if (saved) return normalizeVoicePresetId(saved);
    } catch {}
    return 'distilled-core-01';
  });
  const [voiceAccent, setVoiceAccent] = useState<NativeEnglishAccent>(() => {
    try {
      const saved = localStorage.getItem('sovereign_persistent_talk_accent_v1') as NativeEnglishAccent | null;
      if (saved === 'en-US' || saved === 'en-GB') return saved;
    } catch {}
    return 'en-US';
  });
  const [expanded, setExpanded] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sovereign_voice_dock_expanded_v1') === 'true';
    } catch {
      return false;
    }
  });
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [interactionStatus, setInteractionStatus] = useState<'IDLE' | 'IN_PROGRESS'>('IDLE');
  const [activeToolName, setActiveToolName] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<TalkTranscriptEntry[]>(() => {
    try {
      const saved = localStorage.getItem('sovereign_voice_transcripts_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.slice(-80);
      }
    } catch {}
    return [];
  });
  const transcriptsRef = useRef<TalkTranscriptEntry[]>(transcripts);
  const liveSessionIdRef = useRef<string>((() => {
    try {
      const saved = localStorage.getItem('sovereign_voice_session_id_v1');
      if (saved && saved.trim()) return saved.trim();
      const fresh = `live-${Date.now()}`;
      localStorage.setItem('sovereign_voice_session_id_v1', fresh);
      return fresh;
    } catch {
      return `live-${Date.now()}`;
    }
  })());
  const [quickNudge, setQuickNudge] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [drawerTab, setDrawerTab] = useState<'log' | 'scratchpad' | 'tasks'>('log');
  const [scratchpad, setScratchpad] = useState<string>(() => {
    try {
      return localStorage.getItem('sovereign_voice_scratchpad_v1') || '';
    } catch {
      return '';
    }
  });
  const [scratchpadCopied, setScratchpadCopied] = useState(false);
  const [bgTasks, setBgTasks] = useState<VoiceBackgroundTask[]>([]);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [isCompactMobile, setIsCompactMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );

  // Draggable dock offset (desktop/tablet only; mobile uses full-width responsive anchoring)
  const [dockPos, setDockPos] = useState<{ x: number; y: number } | null>(() => {
    try {
      const saved = localStorage.getItem('sovereign_voice_dock_pos_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return { x: parsed.x, y: parsed.y };
        }
      }
    } catch {}
    return null;
  });
  const dragDockRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const dockElRef = useRef<HTMLDivElement | null>(null);
  const activeTurnAbortRef = useRef<AbortController | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const silentGainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const meterRafRef = useRef<number | null>(null);
  const vadRecorderRef = useRef<MediaRecorder | null>(null);
  const vadChunksRef = useRef<Blob[]>([]);
  const vadSpeechStartRef = useRef<number>(0);
  const vadLastVoiceRef = useRef<number>(0);
  const vadInFlightRef = useRef<boolean>(false);
  const sttHandledAtRef = useRef<number>(0);
  const sttBrokenRef = useRef<boolean>(false);
  const noiseFloorRef = useRef<number>(0.008);
  const vadAboveCountRef = useRef<number>(0);

  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const activeAudioElRef = useRef<HTMLAudioElement | null>(null);
  const playbackSessionIdRef = useRef<number>(0);
  const activeSpeakAbortRef = useRef<AbortController | null>(null);
  const activeBrowserUtterancesRef = useRef<SpeechSynthesisUtterance[]>([]);
  const speechKeepAliveTimerRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const relayModeRef = useRef<boolean>(true);
  const isConnectedRef = useRef(false);
  const isMutedRef = useRef(false);
  const speakerMutedRef = useRef(false);
  const isModelSpeakingRef = useRef(false);
  const wasSpeakingWhenInterruptedRef = useRef<boolean>(false);
  const peerExploreRef = useRef(true);
  const activeModuleRef = useRef<ModuleType>(activeModule);
  const openModulesRef = useRef<ModuleType[]>(openModules);
  const voiceNameRef = useRef<LiveVoicePersona>(voiceName);
  const voiceAccentRef = useRef<NativeEnglishAccent>(voiceAccent);
  const selectedMicIdRef = useRef<string>(selectedMicId);
  const captureModeRef = useRef<MicCaptureMode>(captureMode);
  const lastModuleSentRef = useRef<string>('');
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const speakingMessageIdRef = useRef<string | null>(null);
  const isActiveRef = useRef<boolean>(isActive);
  const manualDisconnectRef = useRef<boolean>(false);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const voiceHydratedRef = useRef<boolean>(false);
  const applyingRemoteVoiceRef = useRef<boolean>(false);
  const voiceSaveTimerRef = useRef<number | null>(null);
  const connectSeqRef = useRef<number>(0);
  const wsConnectTimerRef = useRef<number | null>(null);
  const bootConnectTimerRef = useRef<number | null>(null);
  const micAcquirePromiseRef = useRef<Promise<MediaStream | null> | null>(null);
  const micRetryInFlightRef = useRef<boolean>(false);
  const onSelectModuleRef = useRef(onSelectModule);
  const onNavigateBrowserUrlRef = useRef(onNavigateBrowserUrl);
  const onSaveToVaultRef = useRef(onSaveToVault);
  const onStatusChangeRef = useRef(onStatusChange);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    onSelectModuleRef.current = onSelectModule;
    onNavigateBrowserUrlRef.current = onNavigateBrowserUrl;
    onSaveToVaultRef.current = onSaveToVault;
    onStatusChangeRef.current = onStatusChange;
  }, [onSelectModule, onNavigateBrowserUrl, onSaveToVault, onStatusChange]);

  const safeCloseAudioContext = useCallback((ctx: AudioContext | null | undefined) => {
    if (!ctx || ctx.state === 'closed') return;
    try {
      const maybePromise = ctx.close();
      if (maybePromise && typeof (maybePromise as Promise<void>).catch === 'function') {
        (maybePromise as Promise<void>).catch(() => {});
      }
    } catch {}
  }, []);

  useEffect(() => {
    activeModuleRef.current = activeModule;
    openModulesRef.current = openModules;
  }, [activeModule, openModules]);

  useEffect(() => {
    voiceNameRef.current = voiceName;
    try {
      localStorage.setItem('sovereign_persistent_talk_voice_v1', voiceName);
    } catch {}
  }, [voiceName]);

  useEffect(() => {
    voiceAccentRef.current = voiceAccent;
    try {
      localStorage.setItem('sovereign_persistent_talk_accent_v1', voiceAccent);
    } catch {}
  }, [voiceAccent]);

  useEffect(() => {
    selectedMicIdRef.current = selectedMicId;
    try {
      localStorage.setItem('sovereign_voice_mic_device_id', selectedMicId);
    } catch {}
  }, [selectedMicId]);

  useEffect(() => {
    captureModeRef.current = captureMode;
    try {
      localStorage.setItem('sovereign_voice_capture_mode', captureMode);
    } catch {}
  }, [captureMode]);

  useEffect(() => {
    try {
      localStorage.setItem('sovereign_voice_scratchpad_v1', scratchpad);
    } catch {}
  }, [scratchpad]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncViewport = () => {
      const compact = window.innerWidth < 640;
      setIsCompactMobile(compact);
      if (!compact) {
        setDockPos((prev) => {
          if (!prev) return prev;
          const w = dockElRef.current?.offsetWidth || 405;
          const h = dockElRef.current?.offsetHeight || 64;
          const nx = Math.max(8, Math.min(window.innerWidth - w - 8, prev.x));
          const ny = Math.max(40, Math.min(window.innerHeight - h - 56, prev.y));
          return nx === prev.x && ny === prev.y ? prev : { x: Math.round(nx), y: Math.round(ny) };
        });
      }
    };
    syncViewport();
    window.addEventListener('resize', syncViewport);
    window.addEventListener('orientationchange', syncViewport);
    return () => {
      window.removeEventListener('resize', syncViewport);
      window.removeEventListener('orientationchange', syncViewport);
    };
  }, []);

  const refreshBgTasks = useCallback(async () => {
    try {
      const res = await apiFetch('/api/voice/tasks');
      if (!res.ok) return;
      const data = await res.json().catch(() => ({}));
      if (Array.isArray(data?.tasks)) {
        setBgTasks(data.tasks);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!isActive) return;
    refreshBgTasks();
    const timer = window.setInterval(refreshBgTasks, 8000);
    return () => window.clearInterval(timer);
  }, [isActive, refreshBgTasks]);

  useEffect(() => {
    try {
      localStorage.setItem('sovereign_voice_peer_explore_v1', String(peerExploreEnabled));
      localStorage.setItem('sovereign_voice_auto_archive_v1', String(autoArchiveVault));
      localStorage.setItem('sovereign_voice_dock_expanded_v1', String(expanded));
      if (dockPos) {
        localStorage.setItem('sovereign_voice_dock_pos_v1', JSON.stringify(dockPos));
      }
      if (micLabel) {
        localStorage.setItem('sovereign_voice_mic_label', micLabel);
      }
    } catch {}

    if (applyingRemoteVoiceRef.current || !voiceHydratedRef.current) return;
    pushContinuitySettingsPatch({
      voiceDock: {
        voiceName,
        voiceAccent,
        captureMode,
        selectedMicId,
        micLabel,
        peerExploreEnabled,
        autoArchiveVault,
        expanded,
        dockPos
      }
    });
  }, [
    voiceName,
    voiceAccent,
    captureMode,
    selectedMicId,
    micLabel,
    peerExploreEnabled,
    autoArchiveVault,
    expanded,
    dockPos
  ]);

  useEffect(() => {
    transcriptsRef.current = transcripts;
    try {
      localStorage.setItem('sovereign_voice_transcripts_v1', JSON.stringify(transcripts.slice(-80)));
      localStorage.setItem('sovereign_voice_session_id_v1', liveSessionIdRef.current);
    } catch {}

    updateLocalBeaconSnapshot({
      voice: {
        sessionId: liveSessionIdRef.current,
        activeModule: activeModuleRef.current,
        activeModulesList: openModulesRef.current,
        transcripts: transcripts.slice(-80)
      }
    });

    if (applyingRemoteVoiceRef.current || !voiceHydratedRef.current) return;
    if (voiceSaveTimerRef.current !== null) {
      window.clearTimeout(voiceSaveTimerRef.current);
    }
    voiceSaveTimerRef.current = window.setTimeout(() => {
      voiceSaveTimerRef.current = null;
      saveVoiceContinuityToServer({
        sessionId: liveSessionIdRef.current,
        activeModule: activeModuleRef.current,
        activeModulesList: openModulesRef.current,
        transcripts: transcriptsRef.current.slice(-80)
      }).catch(() => {});
    }, 650);
  }, [transcripts]);

  useEffect(() => {
    let mounted = true;
    const applyHydratedVoice = (voiceData: any, voiceDockSettings?: any) => {
      if (!mounted) return;
      applyingRemoteVoiceRef.current = true;
      try {
        if (voiceDockSettings && typeof voiceDockSettings === 'object') {
          if (
            typeof voiceDockSettings.voiceName === 'string' &&
            VOICE_OPTIONS.some((v) => v.id === voiceDockSettings.voiceName)
          ) {
            setVoiceName(voiceDockSettings.voiceName as LiveVoicePersona);
          }
          if (voiceDockSettings.voiceAccent === 'en-US' || voiceDockSettings.voiceAccent === 'en-GB') {
            setVoiceAccent(voiceDockSettings.voiceAccent);
          }
          if (
            voiceDockSettings.captureMode === 'hybrid' ||
            voiceDockSettings.captureMode === 'vad' ||
            voiceDockSettings.captureMode === 'browser-stt'
          ) {
            setCaptureMode(voiceDockSettings.captureMode);
          }
          if (typeof voiceDockSettings.selectedMicId === 'string') {
            setSelectedMicId(voiceDockSettings.selectedMicId);
          }
          if (typeof voiceDockSettings.micLabel === 'string' && voiceDockSettings.micLabel) {
            setMicLabel(voiceDockSettings.micLabel);
          }
          if (typeof voiceDockSettings.peerExploreEnabled === 'boolean') {
            setPeerExploreEnabled(voiceDockSettings.peerExploreEnabled);
          }
          if (typeof voiceDockSettings.autoArchiveVault === 'boolean') {
            setAutoArchiveVault(voiceDockSettings.autoArchiveVault);
          }
          if (typeof voiceDockSettings.expanded === 'boolean') {
            setExpanded(voiceDockSettings.expanded);
          }
          if (
            voiceDockSettings.dockPos &&
            typeof voiceDockSettings.dockPos.x === 'number' &&
            typeof voiceDockSettings.dockPos.y === 'number'
          ) {
            setDockPos({ x: voiceDockSettings.dockPos.x, y: voiceDockSettings.dockPos.y });
          }
        }

        if (voiceData && typeof voiceData === 'object') {
          if (typeof voiceData.sessionId === 'string' && voiceData.sessionId.trim()) {
            liveSessionIdRef.current = voiceData.sessionId.trim();
            try {
              localStorage.setItem('sovereign_voice_session_id_v1', liveSessionIdRef.current);
            } catch {}
          }
          if (
            Array.isArray(voiceData.transcripts) &&
            voiceData.transcripts.length > transcriptsRef.current.length
          ) {
            const restored = voiceData.transcripts.slice(-80);
            transcriptsRef.current = restored;
            setTranscripts(restored);
          }
        }
      } finally {
        window.setTimeout(() => {
          applyingRemoteVoiceRef.current = false;
          voiceHydratedRef.current = true;
        }, 0);
      }
    };

    fetchVoiceContinuityFromServer()
      .then((voice) => {
        if (voice) {
          applyHydratedVoice(voice);
        } else {
          voiceHydratedRef.current = true;
        }
      })
      .catch(() => {
        voiceHydratedRef.current = true;
      });

    const onContinuityHydrated = (ev: Event) => {
      const detail = (ev as CustomEvent)?.detail;
      if (!detail) return;
      applyHydratedVoice(detail.voice, detail.settings?.voiceDock);
    };
    window.addEventListener('sovereign_continuity_hydrated', onContinuityHydrated);
    return () => {
      mounted = false;
      window.removeEventListener('sovereign_continuity_hydrated', onContinuityHydrated);
      if (voiceSaveTimerRef.current !== null) {
        window.clearTimeout(voiceSaveTimerRef.current);
        voiceSaveTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  useEffect(() => {
    isModelSpeakingRef.current = isModelSpeaking;
  }, [isModelSpeaking]);

  const refreshMicDevices = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices
        .filter((d) => d.kind === 'audioinput')
        .map((d, idx) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${idx + 1}`
        }));
      setMicDevices(inputs);
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) return;
    refreshMicDevices();
    const onDeviceChange = () => refreshMicDevices();
    try {
      navigator.mediaDevices.addEventListener?.('devicechange', onDeviceChange);
    } catch {}

    let permStatus: PermissionStatus | null = null;
    const syncPermissionState = (state: PermissionState) => {
      if (state === 'granted') {
        markMediaPermissionGranted('microphone');
        setMicStatus((prev) => (prev === 'idle' || prev === 'denied' || prev === 'needs-gesture' ? 'active' : prev));
        setErrorMessage((prev) => (prev && /permission/i.test(prev) ? null : prev));
        refreshMicDevices();
        // If voice dock is active in standby mode waiting for user to grant mic in browser bar, bind mic seamlessly now!
        if (isActiveRef.current && isConnectedRef.current && !streamRef.current && !micAcquirePromiseRef.current) {
          acquireMicrophoneStreamRef.current?.({ allowPrompt: false })
            .then(async (micStream) => {
              if (!micStream || !isActiveRef.current) {
                micStream?.getTracks().forEach((t) => t.stop());
                return;
              }
              streamRef.current = micStream;
              const AudioCtxCtor = window.AudioContext || (window as any).webkitAudioContext;
              if (AudioCtxCtor) {
                const prevIn = inputCtxRef.current;
                inputCtxRef.current = null;
                safeCloseAudioContext(prevIn);
                const inputCtx = new AudioCtxCtor();
                if (inputCtx.state === 'suspended') {
                  await inputCtx.resume().catch(() => {});
                }
                inputCtxRef.current = inputCtx;
                startAnalyserAndVadLoopRef.current?.(micStream, inputCtx);
              }
              if (relayModeRef.current && !isMutedRef.current) {
                startContinuousRecognitionRef.current?.();
              }
            })
            .catch(() => {});
        }
      } else if (state === 'denied') {
        clearMediaPermissionGrant('microphone');
        setMicStatus('denied');
      } else if (state === 'prompt') {
        setMicStatus((prev) => (prev === 'idle' ? 'needs-gesture' : prev));
      }
    };

    try {
      const persisted = loadPersistedMediaPermissions();
      if (persisted.micGranted && persisted.lastMicLabel) {
        setMicLabel((prev) => prev || persisted.lastMicLabel || '');
      }
    } catch {}

    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'microphone' as PermissionName })
        .then((status) => {
          permStatus = status;
          syncPermissionState(status.state);
          status.onchange = () => syncPermissionState(status.state);
        })
        .catch(() => {});
    }

    return () => {
      try {
        navigator.mediaDevices.removeEventListener?.('devicechange', onDeviceChange);
      } catch {}
      if (permStatus) {
        try {
          permStatus.onchange = null;
        } catch {}
      }
    };
  }, [refreshMicDevices, safeCloseAudioContext]);

  const flushPlaybackQueue = useCallback((opts?: { abortTurn?: boolean }) => {
    playbackSessionIdRef.current += 1;
    if (activeSpeakAbortRef.current) {
      try {
        activeSpeakAbortRef.current.abort();
      } catch {}
      activeSpeakAbortRef.current = null;
    }
    if (opts?.abortTurn !== false && activeTurnAbortRef.current) {
      try {
        activeTurnAbortRef.current.abort();
      } catch {}
      activeTurnAbortRef.current = null;
      setInteractionStatus('IDLE');
    }
    if (speechKeepAliveTimerRef.current !== null) {
      window.clearInterval(speechKeepAliveTimerRef.current);
      speechKeepAliveTimerRef.current = null;
    }
    activeBrowserUtterancesRef.current = [];

    activeSourcesRef.current.forEach((src) => {
      try {
        src.onended = null;
        src.stop();
      } catch {}
    });
    activeSourcesRef.current.clear();

    if (activeAudioElRef.current) {
      try {
        activeAudioElRef.current.onended = null;
        activeAudioElRef.current.onerror = null;
        activeAudioElRef.current.pause();
        activeAudioElRef.current.currentTime = 0;
      } catch {}
      activeAudioElRef.current = null;
    }

    if (isModelSpeakingRef.current) {
      wasSpeakingWhenInterruptedRef.current = true;
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({ interrupt: true }));
        } catch {}
      }
    }
    speakingMessageIdRef.current = null;
    isModelSpeakingRef.current = false;
    setIsModelSpeaking(false);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sovereign_voice_speaking_id', { detail: { speakingId: null, id: null } }));
    }

    if (outputCtxRef.current && outputCtxRef.current.state !== 'closed') {
      nextStartTimeRef.current = outputCtxRef.current.currentTime;
    } else {
      nextStartTimeRef.current = 0;
    }
  }, []);

  useEffect(() => {
    speakerMutedRef.current = speakerMuted;
    if (speakerMuted) {
      flushPlaybackQueue();
    }
  }, [speakerMuted, flushPlaybackQueue]);

  useEffect(() => {
    peerExploreRef.current = peerExploreEnabled;
  }, [peerExploreEnabled]);

  useEffect(() => {
    onStatusChangeRef.current?.({
      connected: isConnected,
      connecting: isConnecting,
      muted: isMuted,
      speaking: isModelSpeaking,
      exploringTool: activeToolName
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('sovereign_persistent_talk_state', {
          detail: {
            active: isActive,
            connected: isConnected,
            connecting: isConnecting,
            muted: isMuted,
            speakerMuted,
            speaking: isModelSpeaking,
            transport: transportMode,
            voiceName,
            micStatus,
            micLabel,
            captureMode,
            activeToolName,
            autoArchiveVault,
            peerExploreEnabled,
            transcripts
          }
        })
      );
    }
  }, [
    isActive,
    isConnected,
    isConnecting,
    isMuted,
    speakerMuted,
    isModelSpeaking,
    transportMode,
    voiceName,
    micStatus,
    micLabel,
    captureMode,
    activeToolName,
    autoArchiveVault,
    peerExploreEnabled,
    transcripts
  ]);

  useEffect(() => {
    if (expanded) {
      transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcripts, expanded]);

  const ensureOutputAudioContext = useCallback((): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    if (outputCtxRef.current && outputCtxRef.current.state !== 'closed') {
      if (outputCtxRef.current.state === 'suspended') {
        outputCtxRef.current.resume().catch(() => {});
      }
      return outputCtxRef.current;
    }
    const AudioCtxCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxCtor) return null;
    try {
      const ctx = new AudioCtxCtor({ sampleRate: 24000 });
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      outputCtxRef.current = ctx;
      return ctx;
    } catch {
      try {
        const ctx = new AudioCtxCtor();
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        outputCtxRef.current = ctx;
        return ctx;
      } catch {
        return null;
      }
    }
  }, []);

  const playSingleAudioChunkAndWait = useCallback(
    async (audioUrl: string, sessionId: number): Promise<boolean> => {
      if (speakerMutedRef.current || playbackSessionIdRef.current !== sessionId) return true;

      const outCtx = ensureOutputAudioContext();
      if (outCtx) {
        try {
          if (outCtx.state === 'suspended') {
            await outCtx.resume().catch(() => {});
          }
          const resp = await fetch(audioUrl);
          const arrBuf = await resp.arrayBuffer();
          if (playbackSessionIdRef.current !== sessionId || speakerMutedRef.current) return true;
          const audioBuf = await outCtx.decodeAudioData(arrBuf.slice(0));
          if (playbackSessionIdRef.current !== sessionId || speakerMutedRef.current) return true;

          return await new Promise<boolean>((resolve) => {
            try {
              const src = outCtx.createBufferSource();
              src.buffer = audioBuf;
              src.connect(outCtx.destination);
              activeSourcesRef.current.add(src);
              let done = false;
              const finish = (ok: boolean) => {
                if (done) return;
                done = true;
                activeSourcesRef.current.delete(src);
                resolve(ok);
              };
              src.onended = () => finish(true);
              src.start(0);
            } catch {
              resolve(false);
            }
          });
        } catch {
          // Fall through cleanly to HTMLAudioElement
        }
      }

      if (playbackSessionIdRef.current !== sessionId || speakerMutedRef.current) return true;
      return await new Promise<boolean>((resolve) => {
        try {
          const audio = new Audio(audioUrl);
          activeAudioElRef.current = audio;
          let done = false;
          const finish = (ok: boolean) => {
            if (done) return;
            done = true;
            if (activeAudioElRef.current === audio) {
              activeAudioElRef.current = null;
            }
            resolve(ok);
          };
          audio.onended = () => finish(true);
          audio.onerror = () => finish(false);
          audio.play().catch(() => finish(false));
        } catch {
          resolve(false);
        }
      });
    },
    [ensureOutputAudioContext]
  );

  const manualReadAloudActiveRef = useRef<boolean>(false);

  // Infinite-length sequential studio speech streamer (Distilled Sovereign Acoustic Cores & Gemini Native TTS ONLY — ZERO robot fallbacks!)
  const speakInfiniteTextSequence = useCallback(
    async (rawText: string, messageId?: string, voiceOverride?: string, isManualReadAloud?: boolean) => {
      if (speakerMutedRef.current) return;
      const clean = cleanTextForSpeech(rawText);
      if (!clean) return;

      flushPlaybackQueue({ abortTurn: false });
      const sessionId = ++playbackSessionIdRef.current;
      const abortCtrl = new AbortController();
      activeSpeakAbortRef.current = abortCtrl;

      const resolvedMsgId = messageId || 'live';
      const targetVoice = normalizeVoicePresetId(voiceOverride || voiceNameRef.current);
      const targetAccent = voiceAccentRef.current;

      manualReadAloudActiveRef.current = Boolean(isManualReadAloud || (messageId && messageId !== 'live'));
      speakingMessageIdRef.current = resolvedMsgId;
      isModelSpeakingRef.current = true;
      setIsModelSpeaking(true);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('sovereign_voice_speaking_id', {
            detail: { speakingId: messageId || null, id: messageId || null }
          })
        );
      }

      // Split into natural sentence-aligned ~420-char studio chunks with NO upper bound on chunk count
      const neuralChunks = splitIntoCoherentSpeechChunks(clean, 420);
      if (neuralChunks.length === 0) {
        if (playbackSessionIdRef.current === sessionId) {
          manualReadAloudActiveRef.current = false;
          speakingMessageIdRef.current = null;
          isModelSpeakingRef.current = false;
          setIsModelSpeaking(false);
          window.dispatchEvent(new CustomEvent('sovereign_voice_speaking_id', { detail: { speakingId: null, id: null } }));
        }
        return;
      }

      const fetchStudioChunk = async (chunkText: string): Promise<{ audioUrl: string } | null> => {
        if (playbackSessionIdRef.current !== sessionId || abortCtrl.signal.aborted) return null;
        try {
          const res = await apiFetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: chunkText,
              voice: targetVoice,
              accent: targetAccent,
              lockedEngine: 'gemini'
            }),
            signal: abortCtrl.signal
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data?.audioUrl) {
            return { audioUrl: String(data.audioUrl) };
          }
        } catch {}
        return null;
      };

      try {
        const firstResult = await fetchStudioChunk(neuralChunks[0]);
        if (playbackSessionIdRef.current !== sessionId || speakerMutedRef.current || abortCtrl.signal.aborted) {
          return;
        }

        if (!firstResult) {
          setErrorMessage('Studio neural voice temporarily unavailable — reply logged in Voice Log (robotic fallback disabled).');
          return;
        }

        let nextChunkPromise: Promise<{ audioUrl: string } | null> | null =
          neuralChunks.length > 1 ? fetchStudioChunk(neuralChunks[1]) : null;

        for (let i = 0; i < neuralChunks.length; i++) {
          if (playbackSessionIdRef.current !== sessionId || speakerMutedRef.current || abortCtrl.signal.aborted) {
            break;
          }

          const currentResult = i === 0 ? firstResult : nextChunkPromise ? await nextChunkPromise : null;
          nextChunkPromise = i + 1 < neuralChunks.length ? fetchStudioChunk(neuralChunks[i + 1]) : null;

          if (playbackSessionIdRef.current !== sessionId || speakerMutedRef.current || abortCtrl.signal.aborted) {
            break;
          }

          let finalAudioUrl = currentResult?.audioUrl || null;
          if (!finalAudioUrl) {
            const retryRes = await fetchStudioChunk(neuralChunks[i]);
            finalAudioUrl = retryRes?.audioUrl || null;
          }

          if (finalAudioUrl) {
            const ok = await playSingleAudioChunkAndWait(finalAudioUrl, sessionId);
            if (!ok) break;
          } else {
            break;
          }
        }
      } finally {
        if (playbackSessionIdRef.current === sessionId) {
          if (activeSpeakAbortRef.current === abortCtrl) {
            activeSpeakAbortRef.current = null;
          }
          manualReadAloudActiveRef.current = false;
          speakingMessageIdRef.current = null;
          isModelSpeakingRef.current = false;
          setIsModelSpeaking(false);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('sovereign_voice_speaking_id', { detail: { speakingId: null, id: null } }));
          }
        }
      }
    },
    [flushPlaybackQueue, playSingleAudioChunkAndWait]
  );

  const playNeuralAudioUrl = useCallback(
    async (audioUrl: string, _fallbackText?: string, messageId?: string) => {
      if (speakerMutedRef.current) return;
      flushPlaybackQueue({ abortTurn: false });
      const sessionId = ++playbackSessionIdRef.current;
      speakingMessageIdRef.current = messageId || 'live';
      isModelSpeakingRef.current = true;
      setIsModelSpeaking(true);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('sovereign_voice_speaking_id', { detail: { speakingId: messageId || null, id: messageId || null } })
        );
      }
      try {
        await playSingleAudioChunkAndWait(audioUrl, sessionId);
      } finally {
        if (playbackSessionIdRef.current === sessionId) {
          speakingMessageIdRef.current = null;
          isModelSpeakingRef.current = false;
          setIsModelSpeaking(false);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('sovereign_voice_speaking_id', { detail: { speakingId: null, id: null } }));
          }
        }
      }
    },
    [flushPlaybackQueue, playSingleAudioChunkAndWait]
  );

  const schedulePcmPlayback = useCallback((base64Pcm: string) => {
    if (speakerMutedRef.current) return;
    const outCtx = outputCtxRef.current;
    if (!outCtx || outCtx.state === 'closed') return;

    if (outCtx.state === 'suspended') {
      outCtx.resume().catch(() => {});
    }

    const binary = atob(base64Pcm);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    const buffer = outCtx.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);

    const src = outCtx.createBufferSource();
    src.buffer = buffer;
    src.connect(outCtx.destination);

    const now = outCtx.currentTime;
    if (nextStartTimeRef.current < now) {
      nextStartTimeRef.current = now;
    }
    src.start(nextStartTimeRef.current);
    nextStartTimeRef.current += buffer.duration;

    activeSourcesRef.current.add(src);
    isModelSpeakingRef.current = true;
    setIsModelSpeaking(true);
    src.onended = () => {
      activeSourcesRef.current.delete(src);
      if (activeSourcesRef.current.size === 0) {
        isModelSpeakingRef.current = false;
        setIsModelSpeaking(false);
      }
    };
  }, []);

  const appendTranscript = useCallback((role: TalkTranscriptEntry['role'], text: string) => {
    const cleaned = text.trim();
    if (!cleaned) return;
    const timestamp = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // Strictly decoupled from Text Chat (ChatModule): voice turns write ONLY to the dedicated Voice Live Log & Scratchpad
    setTranscripts((prev) => {
      const last = prev[prev.length - 1];
      let next: TalkTranscriptEntry[];
      if (last && last.role === role && role !== 'tool') {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...last,
          text: `${last.text} ${cleaned}`.replace(/\s+/g, ' ')
        };
        next = updated.slice(-80);
      } else {
        next = [
          ...prev.slice(-79),
          {
            id: `pt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            role,
            text: cleaned,
            timestamp
          }
        ];
      }
      transcriptsRef.current = next;
      return next;
    });
  }, []);

  const archiveSessionToVault = useCallback(
    (entries: TalkTranscriptEntry[] = transcriptsRef.current) => {
      const saveFn = onSaveToVaultRef.current;
      if (!saveFn || entries.length === 0) return false;
      const thoughtCount = entries.filter((e) => e.role === 'thought').length;
      const toolCount = entries.filter((e) => e.role === 'tool').length;
      const startedAt = new Date().toLocaleString();
      const lines: string[] = [
        `# Live Peer Conversation & Chain-of-Thought Log (Lyrailius Omega · Voice Preset: ${voiceNameRef.current})`,
        `Recorded: ${startedAt} · Turns: ${entries.length} · Thought Blocks: ${thoughtCount} · Autonomous Tools: ${toolCount}`,
        ''
      ];
      for (const entry of entries) {
        if (entry.role === 'user') {
          lines.push(`### [${entry.timestamp}] You (Voice Transcript)\n${entry.text}\n`);
        } else if (entry.role === 'thought') {
          lines.push(`### [${entry.timestamp}] Lyrailius Omega — Chain-of-Thought Reasoning\n> ${entry.text.replace(/\n/g, '\n> ')}\n`);
        } else if (entry.role === 'tool') {
          lines.push(`- \`[${entry.timestamp}] AUTONOMOUS TOOL:\` ${entry.text}`);
        } else {
          lines.push(`### [${entry.timestamp}] Lyrailius Omega (Spoken Response · Voice: ${voiceNameRef.current})\n${entry.text}\n`);
        }
      }
      saveFn(
        `Voice Chat + CoT Log (Lyrailius Omega · ${voiceNameRef.current} · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
        lines.join('\n'),
        relayModeRef.current ? 'lyrailius-omega-voice-duplex' : 'gemini-3.8-live',
        JSON.stringify({
          kind: 'live_peer_transcript_with_cot',
          agentName: 'Lyrailius Omega',
          voiceName: voiceNameRef.current,
          entryCount: entries.length,
          thoughtCount,
          toolCount,
          archivedAt: new Date().toISOString()
        })
      );
      setVaultSavedFlash(true);
      setTimeout(() => setVaultSavedFlash(false), 2400);
      return true;
    },
    []
  );

  const stopContinuousRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setInterimSpeech('');
  }, []);

  const stopActiveVadRecorder = useCallback((discard = true) => {
    const rec = vadRecorderRef.current;
    if (rec && rec.state !== 'inactive') {
      if (discard) {
        rec.onstop = null;
      }
      try {
        rec.stop();
      } catch {}
    }
    if (discard) {
      vadRecorderRef.current = null;
      vadChunksRef.current = [];
      vadSpeechStartRef.current = 0;
      vadLastVoiceRef.current = 0;
      setVadRecording(false);
    }
  }, []);

  const dispatchBackgroundTask = useCallback(
    async (taskPrompt: string, customTitle?: string) => {
      const cleaned = taskPrompt.trim();
      if (!cleaned) return;
      const title = (customTitle || cleaned.slice(0, 64)).trim();
      try {
        const res = await apiFetch('/api/voice/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, prompt: cleaned, sessionId: liveSessionIdRef.current })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.task) {
          setBgTasks((prev) => [data.task, ...prev.filter((t) => t.id !== data.task.id)].slice(0, 30));
          appendTranscript('tool', `Background task queued: ${data.task.title} (voice channel remains completely open)`);
          setDrawerTab('tasks');
        }
      } catch (err) {
        console.warn('[PersistentTalkDock] Background task dispatch error:', err);
      }
    },
    [appendTranscript]
  );

  const cancelOrRemoveBgTask = useCallback(async (taskId: string) => {
    try {
      await apiFetch(`/api/voice/tasks/${encodeURIComponent(taskId)}`, { method: 'DELETE' });
      setBgTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch {}
  }, []);

  const sendRelayUtterance = useCallback(
    async (spokenText: string) => {
      const cleaned = spokenText.trim();
      if (!cleaned) return;
      const wasBusy = isModelSpeakingRef.current || activeTurnAbortRef.current !== null;
      flushPlaybackQueue({ abortTurn: true });
      appendTranscript('user', cleaned);

      const wasInterjected = wasBusy || wasSpeakingWhenInterruptedRef.current;
      wasSpeakingWhenInterruptedRef.current = false;

      const turnCtrl = new AbortController();
      activeTurnAbortRef.current = turnCtrl;
      setInteractionStatus('IN_PROGRESS');
      setErrorMessage(null);

      try {
        const voiceHistory = transcriptsRef.current
          .filter((t) => t.role === 'user' || t.role === 'model')
          .slice(-16)
          .map((t) => ({ role: t.role === 'user' ? 'user' : 'model', text: t.text }));

        const res = await apiFetch('/api/voice/duplex', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: turnCtrl.signal,
          body: JSON.stringify({
            prompt: cleaned,
            voiceHistory,
            interjected: wasInterjected,
            sessionId: liveSessionIdRef.current,
            activeModule: activeModuleRef.current,
            voice: voiceNameRef.current,
            accent: voiceAccentRef.current
          })
        });

        const data = await res.json().catch(() => ({}));
        if (turnCtrl.signal.aborted) return;

        if (data?.dispatchedTask) {
          setBgTasks((prev) => [data.dispatchedTask, ...prev.filter((t) => t.id !== data.dispatchedTask.id)].slice(0, 30));
          appendTranscript('tool', `Async background task launched: ${data.dispatchedTask.title}`);
        }

        if (res.ok && data?.success && typeof data?.text === 'string' && data.text.trim()) {
          const responseText = data.text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
          if (responseText) {
            appendTranscript('model', responseText);
            speakInfiniteTextSequence(responseText, `live-${Date.now()}`, voiceNameRef.current);
          }
          return;
        }

        // Seamless fallback through Proxy Wheel + local Ollama / llama-server / WebGPU WebLLM when cloud duplex is unavailable
        if (data?.fallbackRequired || !res.ok) {
          const localResult = await sovereignAi.dispatchChat({
            prompt: cleaned,
            agentId: 'sovereign-os-voice-duplex',
            agentName: 'Sovereign Intelligence',
            zeroTokenMode: false,
            systemInstruction:
              'You are the Autonomous Sovereign Intelligence of this OS speaking directly through an impersonal acoustic voice channel (zero personal name or human persona). Respond naturally, concisely, and directly for spoken dialogue.'
          });
          if (turnCtrl.signal.aborted) return;
          const localText = String(localResult?.text || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
          if (localText && !localResult?.isError) {
            appendTranscript('model', localText);
            speakInfiniteTextSequence(localText, `live-${Date.now()}`, voiceNameRef.current);
          } else if (localText) {
            setErrorMessage(localText.slice(0, 220));
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError' || turnCtrl.signal.aborted) return;
        console.warn('[PersistentTalkDock] Fluent conversational voice turn error:', err);
        setErrorMessage('Voice turn interrupted or offline — tap Reconnect or try again.');
      } finally {
        if (activeTurnAbortRef.current === turnCtrl) {
          activeTurnAbortRef.current = null;
          setInteractionStatus('IDLE');
        }
      }
    },
    [appendTranscript, flushPlaybackQueue, speakInfiniteTextSequence]
  );

  const transcribeVadBlobAndSend = useCallback(
    async (blob: Blob, mimeType: string, utteranceStartedAt: number) => {
      if (blob.size < 1400) return;
      // Avoid duplicate sends if browser SpeechRecognition already captured this exact phrase
      if (sttHandledAtRef.current >= utteranceStartedAt - 300) return;
      if (vadInFlightRef.current) return;
      vadInFlightRef.current = true;
      setVadTranscribing(true);
      try {
        const audioBase64 = await blobToBase64(blob);
        const res = await apiFetch('/api/audio/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64,
            mimeType: mimeType || 'audio/webm',
            prompt:
              'Transcribe the spoken words accurately in plain text without commentary. If the clip contains only silence or noise, return an empty string.'
          })
        });
        const data = await res.json().catch(() => ({}));
        const transcript = String(data?.transcription || '').trim();
        if (transcript && sttHandledAtRef.current < utteranceStartedAt - 300) {
          sendRelayUtterance(transcript);
        }
      } catch (err) {
        console.warn('[PersistentTalkDock] Direct mic VAD transcribe notice:', err);
      } finally {
        vadInFlightRef.current = false;
        setVadTranscribing(false);
      }
    },
    [sendRelayUtterance]
  );

  const beginVadUtteranceCapture = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || typeof MediaRecorder === 'undefined') return;
    if (vadRecorderRef.current && vadRecorderRef.current.state === 'recording') return;

    try {
      const mimeType = pickBestRecorderMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      vadChunksRef.current = [];
      const startedAt = Date.now();
      vadSpeechStartRef.current = startedAt;
      vadLastVoiceRef.current = startedAt;
      vadRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          vadChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        const chunks = vadChunksRef.current;
        vadChunksRef.current = [];
        vadRecorderRef.current = null;
        setVadRecording(false);
        const durationMs = Date.now() - startedAt;
        if (chunks.length === 0 || durationMs < 260) return;
        const resolvedMime = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(chunks, { type: resolvedMime });
        // Give browser STT 180ms grace to emit its final result before sending to /api/audio/transcribe
        setTimeout(() => {
          transcribeVadBlobAndSend(blob, resolvedMime, startedAt);
        }, 180);
      };

      recorder.start(250);
      setVadRecording(true);
    } catch {
      vadRecorderRef.current = null;
      setVadRecording(false);
    }
  }, [transcribeVadBlobAndSend]);

  const startContinuousRecognition = useCallback(async () => {
    if (typeof window === 'undefined' || isMutedRef.current) return;
    if (captureModeRef.current === 'vad') return;
    // If user explicitly picked a non-default hardware mic, rely on Direct Mic VAD so their chosen mic is used
    if (selectedMicIdRef.current && selectedMicIdRef.current !== 'default') return;
    if (sttBrokenRef.current && captureModeRef.current !== 'browser-stt') return;

    // Never start SpeechRecognition on boot if browser mic permission is still 'prompt' (causes unrequested Allow popup!)
    if (!streamRef.current && !hasRecentUserActivation(2500)) {
      const probe = await probeMediaPermission('microphone').catch(() => null);
      if (!probe?.canAcquireSilently) return;
    }
    if (!isConnectedRef.current || !relayModeRef.current || isMutedRef.current) return;

    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      sttBrokenRef.current = true;
      return;
    }
    if (recognitionRef.current) return;

    try {
      const rec = new SpeechRecognitionCtor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = voiceAccentRef.current;
      recognitionRef.current = rec;

      rec.onresult = (event: any) => {
        sttBrokenRef.current = false;
        let interim = '';
        let finalText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const text = res[0]?.transcript || '';
          if (res.isFinal) {
            finalText += ` ${text}`;
          } else {
            interim += ` ${text}`;
          }
        }
        // Instant conversational barge-in: immediately cut off AI speech on the very first detected word/interim token
        if (
          !manualReadAloudActiveRef.current &&
          isModelSpeakingRef.current &&
          (interim.trim().length > 0 || finalText.trim().length > 0)
        ) {
          flushPlaybackQueue();
        }
        setInterimSpeech(interim.trim());
        if (finalText.trim() && !manualReadAloudActiveRef.current) {
          sttHandledAtRef.current = Date.now();
          stopActiveVadRecorder(true);
          setInterimSpeech('');
          sendRelayUtterance(finalText.trim());
        }
      };

      rec.onerror = (ev: any) => {
        const code = String(ev?.error || '');
        // If browser STT is blocked by iframe/network/audio-capture, fall back seamlessly to Direct Mic VAD
        if (
          code === 'not-allowed' ||
          code === 'service-not-allowed' ||
          code === 'audio-capture' ||
          code === 'network'
        ) {
          sttBrokenRef.current = true;
          recognitionRef.current = null;
        }
      };

      rec.onend = () => {
        recognitionRef.current = null;
        if (
          isConnectedRef.current &&
          relayModeRef.current &&
          !isMutedRef.current &&
          captureModeRef.current !== 'vad' &&
          !sttBrokenRef.current
        ) {
          setTimeout(() => {
            if (
              isConnectedRef.current &&
              relayModeRef.current &&
              !isMutedRef.current &&
              captureModeRef.current !== 'vad' &&
              !sttBrokenRef.current
            ) {
              startContinuousRecognition();
            }
          }, 300);
        }
      };

      rec.start();
    } catch {
      sttBrokenRef.current = true;
      recognitionRef.current = null;
    }
  }, [flushPlaybackQueue, sendRelayUtterance, stopActiveVadRecorder]);

  useEffect(() => {
    isMutedRef.current = isMuted;
    if (isMuted) {
      stopContinuousRecognition();
      stopActiveVadRecorder(true);
      setMicLevel(0);
    } else if (isConnectedRef.current && relayModeRef.current) {
      startContinuousRecognition();
    }
  }, [isMuted, startContinuousRecognition, stopContinuousRecognition, stopActiveVadRecorder]);

  const stopMeterLoop = useCallback(() => {
    if (meterRafRef.current !== null) {
      cancelAnimationFrame(meterRafRef.current);
      meterRafRef.current = null;
    }
  }, []);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const teardownSession = useCallback(
    (opts?: { preserveReconnectTimer?: boolean }) => {
      connectSeqRef.current += 1;
      if (wsConnectTimerRef.current !== null) {
        window.clearTimeout(wsConnectTimerRef.current);
        wsConnectTimerRef.current = null;
      }
      if (!opts?.preserveReconnectTimer) {
        clearReconnectTimer();
      }
      isConnectedRef.current = false;
      relayModeRef.current = false;
      setIsConnected(false);
      setIsConnecting(false);
      setInteractionStatus('IDLE');
      setActiveToolName(null);
    setMicLevel(0);
    setInterimSpeech('');
    setVadRecording(false);
    setVadTranscribing(false);

    stopMeterLoop();
    stopContinuousRecognition();
    stopActiveVadRecorder(true);
    flushPlaybackQueue();

    try {
      processorRef.current?.disconnect();
    } catch {}
    processorRef.current = null;
    try {
      sourceNodeRef.current?.disconnect();
    } catch {}
    sourceNodeRef.current = null;
    try {
      silentGainRef.current?.disconnect();
    } catch {}
    silentGainRef.current = null;
    analyserRef.current = null;

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    const prevIn = inputCtxRef.current;
    inputCtxRef.current = null;
    safeCloseAudioContext(prevIn);

    const prevOut = outputCtxRef.current;
    outputCtxRef.current = null;
    safeCloseAudioContext(prevOut);

    try {
      wsRef.current?.close();
    } catch {}
    wsRef.current = null;
  }, [clearReconnectTimer, flushPlaybackQueue, safeCloseAudioContext, stopActiveVadRecorder, stopContinuousRecognition, stopMeterLoop]);

  const acquireMicrophoneStream = useCallback(
    async (opts?: { allowPrompt?: boolean }): Promise<MediaStream | null> => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setMicStatus('unavailable');
        setMicLabel('');
        setErrorMessage('Browser microphone API unavailable in this context. Use text input below or open in Chrome/Edge.');
        return null;
      }

      // 0. If HardwarePermissionsPanel just acquired a live microphone stream, adopt it immediately in 0ms!
      const preGrantedStream = claimSharedMicrophoneStream();
      if (preGrantedStream) {
        const audioTrack = preGrantedStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = true;
          const resolvedLabel = audioTrack.label || 'Device Microphone';
          setMicLabel(resolvedLabel);
          const resolvedDeviceId = audioTrack.getSettings?.().deviceId;
          if (resolvedDeviceId && !selectedMicIdRef.current) {
            prevMicIdRef.current = resolvedDeviceId;
            selectedMicIdRef.current = resolvedDeviceId;
            setSelectedMicId(resolvedDeviceId);
          }
        }
        setMicStatus('active');
        setMicConsentDismissed(true);
        setErrorMessage(null);
        refreshMicDevices();
        return preGrantedStream;
      }

      if (micAcquirePromiseRef.current) {
        return micAcquirePromiseRef.current;
      }

      const allowPrompt = Boolean(opts?.allowPrompt);

      // CRITICAL: When allowPrompt is true (user clicked Voice Chat / Allow Microphone / Enable Mic),
      // invoke requestMicrophoneStreamOnUserGesture IMMEDIATELY on line 1 with ZERO prior awaits
      // so transient browser user activation is 100% preserved and the native Allow prompt appears!
      const run = (async (): Promise<MediaStream | null> => {
        if (allowPrompt) {
          const directPromise = requestMicrophoneStreamOnUserGesture(selectedMicIdRef.current);
          setMicStatus('requesting');
          const directRes = await directPromise;
          if (directRes.stream) {
            const audioTrack = directRes.stream.getAudioTracks()[0];
            if (audioTrack) {
              audioTrack.enabled = true;
              const resolvedLabel = audioTrack.label || 'Device Microphone';
              setMicLabel(resolvedLabel);
              const resolvedDeviceId = audioTrack.getSettings?.().deviceId;
              if (resolvedDeviceId && !selectedMicIdRef.current) {
                prevMicIdRef.current = resolvedDeviceId;
                selectedMicIdRef.current = resolvedDeviceId;
                setSelectedMicId(resolvedDeviceId);
              }
            }
            setMicStatus('active');
            setMicConsentDismissed(true);
            setErrorMessage(null);
            refreshMicDevices();
            return directRes.stream;
          }
          if (directRes.status === 'frame-policy-blocked') {
            setMicStatus('frame-policy-blocked');
            setMicConsentDismissed(false);
            setErrorMessage(null);
            return null;
          }
          if (directRes.status === 'denied') {
            setMicStatus('denied');
            setMicConsentDismissed(false);
            setErrorMessage(
              'Microphone access is blocked in your browser site settings — allow Microphone in the address bar, then click Allow Microphone.'
            );
            return null;
          }
          if (directRes.status === 'needs-gesture') {
            setMicStatus('needs-gesture');
            setMicConsentDismissed(false);
            setErrorMessage(null);
            return null;
          }
          setMicStatus('unavailable');
          setMicConsentDismissed(false);
          setErrorMessage(`Microphone notice: ${directRes.error?.message || 'No audio input device detected.'}`);
          return null;
        }

        // Silent check on passive mount: NEVER fake 'active' when no live MediaStream exists!
        if (!isHardwareSwitchEnabled('microphone')) {
          setMicStatus('needs-gesture');
          setMicConsentDismissed(false);
          setErrorMessage(null);
          return null;
        }

        const probe = await probeMediaPermission('microphone');
        if (probe.browserState === 'denied') {
          setMicStatus('denied');
          setMicConsentDismissed(false);
          return null;
        }
        if (!probe.canAcquireSilently) {
          setMicStatus('needs-gesture');
          setMicConsentDismissed(false);
          setErrorMessage(null);
          return null;
        }

        setMicStatus('requesting');
        const result = await requestMicrophoneStream({ allowPrompt: false });
        if (result.stream) {
          const audioTrack = result.stream.getAudioTracks()[0];
          if (audioTrack) {
            audioTrack.enabled = true;
            setMicLabel(audioTrack.label || 'Device Microphone');
          }
          setMicStatus('active');
          setMicConsentDismissed(true);
          setErrorMessage(null);
          refreshMicDevices();
          return result.stream;
        }

        setMicStatus(result.status === 'denied' ? 'denied' : 'needs-gesture');
        setMicConsentDismissed(false);
        return null;
      })();

      micAcquirePromiseRef.current = run;
      try {
        return await run;
      } finally {
        if (micAcquirePromiseRef.current === run) {
          micAcquirePromiseRef.current = null;
        }
      }
    },
    [refreshMicDevices]
  );

  const startAnalyserAndVadLoop = useCallback(
    (stream: MediaStream, inputCtx: AudioContext) => {
      stopMeterLoop();
      const source = inputCtx.createMediaStreamSource(stream);
      sourceNodeRef.current = source;
      const analyser = inputCtx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.25;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Keep ScriptProcessor ONLY for native Gemini Live 16kHz PCM streaming (zero noise gate, continuous full-duplex!)
      try {
        const processor = inputCtx.createScriptProcessor(2048, 1, 1);
        processorRef.current = processor;
        const silentGain = inputCtx.createGain();
        silentGain.gain.value = 0;
        silentGainRef.current = silentGain;
        source.connect(processor);
        processor.connect(silentGain);
        silentGain.connect(inputCtx.destination);

        processor.onaudioprocess = (ev) => {
          if (!isConnectedRef.current || wsRef.current?.readyState !== WebSocket.OPEN) return;
          if (isMutedRef.current || relayModeRef.current) return;
          const channel = ev.inputBuffer.getChannelData(0);
          const base64 = pcmFloatToBase64(channel, inputCtx.sampleRate || 16000);
          wsRef.current.send(JSON.stringify({ audio: base64 }));
        };
      } catch {
        processorRef.current = null;
      }

      const timeBuf = new Float32Array(analyser.fftSize);
      const VAD_SILENCE_MS = 850;
      const VAD_MAX_UTTERANCE_MS = 14000;
      noiseFloorRef.current = 0.006;
      vadAboveCountRef.current = 0;

      let frameTick = 0;
      let lastReportedLevel = -1;
      const tick = () => {
        if (!analyserRef.current) return;
        meterRafRef.current = requestAnimationFrame(tick);

        if (inputCtx.state === 'suspended') {
          inputCtx.resume().catch(() => {});
        }

        if (isMutedRef.current) {
          if (lastReportedLevel !== 0) {
            lastReportedLevel = 0;
            setMicLevel(0);
          }
          return;
        }

        analyser.getFloatTimeDomainData(timeBuf);
        let sumSq = 0;
        for (let i = 0; i < timeBuf.length; i += 2) {
          sumSq += timeBuf[i] * timeBuf[i];
        }
        const rms = Math.sqrt(sumSq / (timeBuf.length / 2));

        if (frameTick++ % 8 === 0) {
          const nextLevel = Math.round(Math.min(1, rms * 10) * 20) / 20;
          if (Math.abs(nextLevel - lastReportedLevel) >= 0.05) {
            lastReportedLevel = nextLevel;
            setMicLevel(nextLevel);
          }
        }

        // Direct hardware microphone Adaptive Noise-Floor VAD (only used in sovereign-duplex-relay fallback;
        // native gemini-live-pcm streams 100% raw 16kHz PCM continuously with zero client noise gate!)
        if (!isConnectedRef.current || !relayModeRef.current) return;
        if (captureModeRef.current === 'browser-stt') return;

        const now = Date.now();
        const isRec = Boolean(vadRecorderRef.current && vadRecorderRef.current.state === 'recording');

        // Adapt ambient noise floor continuously when idle (or slowly down if quieter) so room fan/hum NEVER traps the gate
        if (!isRec) {
          const alpha = rms < noiseFloorRef.current ? 0.12 : 0.03;
          noiseFloorRef.current = Math.max(0.002, Math.min(0.06, noiseFloorRef.current * (1 - alpha) + rms * alpha));
        } else if (rms < noiseFloorRef.current) {
          noiseFloorRef.current = noiseFloorRef.current * 0.96 + rms * 0.04;
        }

        const speaking = isModelSpeakingRef.current;
        if (manualReadAloudActiveRef.current) return;
        const startThreshold = speaking
          ? Math.max(0.012, noiseFloorRef.current * 1.5 + 0.004)
          : Math.max(0.010, noiseFloorRef.current * 1.8 + 0.004);
        const holdThreshold = Math.max(0.005, noiseFloorRef.current * 1.2 + 0.002);

        if (!isRec) {
          if (rms >= startThreshold) {
            vadAboveCountRef.current += 1;
            if (vadAboveCountRef.current >= 1) {
              vadAboveCountRef.current = 0;
              if (speaking) {
                flushPlaybackQueue();
              }
              vadLastVoiceRef.current = now;
              beginVadUtteranceCapture();
            }
          } else {
            vadAboveCountRef.current = 0;
          }
        } else {
          if (rms >= holdThreshold) {
            vadLastVoiceRef.current = now;
          }
          const silentFor = now - vadLastVoiceRef.current;
          const totalFor = now - vadSpeechStartRef.current;
          if (silentFor >= VAD_SILENCE_MS || totalFor >= VAD_MAX_UTTERANCE_MS) {
            try {
              vadRecorderRef.current?.stop();
            } catch {}
          }
        }
      };

      meterRafRef.current = requestAnimationFrame(tick);
    },
    [beginVadUtteranceCapture, flushPlaybackQueue, stopMeterLoop]
  );

  const connectSession = useCallback(async (opts?: { allowPrompt?: boolean }) => {
    if (isConnectedRef.current) return;
    clearReconnectTimer();
    manualDisconnectRef.current = false;
    const seq = ++connectSeqRef.current;
    const allowPrompt =
      typeof opts?.allowPrompt === 'boolean' ? opts.allowPrompt : hasRecentUserActivation(3000);
    setErrorMessage(null);
    setIsConnecting(true);
    sttBrokenRef.current = false;

    try {
      const AudioCtxCtor = window.AudioContext || (window as any).webkitAudioContext;

      // Create output AudioContext BEFORE awaiting getUserMedia so it captures browser user-activation cleanly
      if (outputCtxRef.current && outputCtxRef.current.state !== 'closed') {
        safeCloseAudioContext(outputCtxRef.current);
      }
      let outputCtx: AudioContext | null = null;
      if (AudioCtxCtor) {
        try {
          outputCtx = new AudioCtxCtor({ sampleRate: 24000 });
        } catch {
          outputCtx = new AudioCtxCtor();
        }
        if (outputCtx.state === 'suspended') {
          outputCtx.resume().catch(() => {});
        }
      }
      outputCtxRef.current = outputCtx;
      nextStartTimeRef.current = outputCtx ? outputCtx.currentTime : 0;

      // Acquire microphone (silent probe on boot; full prompt only on user gesture)
      acquireMicrophoneStream({ allowPrompt })
        .then(async (micStream) => {
          if (connectSeqRef.current !== seq) {
            micStream?.getTracks().forEach((t) => t.stop());
            return;
          }
          if (!micStream) return;
          streamRef.current = micStream;

          let inputCtx: AudioContext | null = null;
          if (AudioCtxCtor) {
            try {
              inputCtx = new AudioCtxCtor();
              if (inputCtx.state === 'suspended') {
                await inputCtx.resume().catch(() => {});
              }
            } catch {
              inputCtx = null;
            }
          }

          if (connectSeqRef.current !== seq) {
            micStream.getTracks().forEach((t) => t.stop());
            safeCloseAudioContext(inputCtx);
            return;
          }

          if (inputCtxRef.current && inputCtxRef.current !== inputCtx) {
            safeCloseAudioContext(inputCtxRef.current);
          }
          inputCtxRef.current = inputCtx;
          if (outputCtx && outputCtx.state === 'suspended') {
            outputCtx.resume().catch(() => {});
          }

          if (inputCtx) {
            startAnalyserAndVadLoop(micStream, inputCtx);
          }
        })
        .catch(() => {});

      const scheduleAutoReconnect = (reason: string) => {
        if (!isActiveRef.current || manualDisconnectRef.current) {
          setErrorMessage(reason);
          return;
        }
        if (reconnectAttemptsRef.current >= 4) {
          setErrorMessage(`${reason} Click Reconnect to resume.`);
          return;
        }
        if (reconnectTimerRef.current !== null) return;
        const delays = [900, 1800, 3200, 5000];
        const delayMs = delays[Math.min(delays.length - 1, reconnectAttemptsRef.current)];
        reconnectAttemptsRef.current += 1;
        setIsConnecting(true);
        setErrorMessage(
          `Voice link reconnecting (${reconnectAttemptsRef.current}/4) while keeping full transcript memory...`
        );
        reconnectTimerRef.current = window.setTimeout(() => {
          reconnectTimerRef.current = null;
          if (isActiveRef.current && !manualDisconnectRef.current && !isConnectedRef.current) {
            connectSessionRef.current({ allowPrompt: false });
          }
        }, delayMs);
      };

      const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
      const resumeFlag = transcriptsRef.current.length > 0 || reconnectAttemptsRef.current > 0 ? '1' : '0';
      const authToken = getAuthBearerToken();
      const tokenParam = authToken ? `&token=${encodeURIComponent(authToken)}` : '';
      // Use native Gemini Live bidirectional audio streaming (transport=gemini-live-pcm) with automatic relay fallback on server
      const wsUrl = `${protocol}://${location.host}/live?transport=gemini-live-pcm&voice=${encodeURIComponent(voiceNameRef.current)}&accent=${encodeURIComponent(voiceAccentRef.current)}&mode=autonomous&peer=1&proactive=${peerExploreRef.current ? '1' : '0'}&sessionId=${encodeURIComponent(liveSessionIdRef.current)}&resume=${resumeFlag}${tokenParam}`;
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {}
        wsRef.current = null;
      }
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      if (wsConnectTimerRef.current !== null) {
        window.clearTimeout(wsConnectTimerRef.current);
      }
      wsConnectTimerRef.current = window.setTimeout(() => {
        if (connectSeqRef.current === seq && !isConnectedRef.current) {
          teardownSession({ preserveReconnectTimer: true });
          scheduleAutoReconnect('Voice channel handshake timed out.');
        }
      }, 15000);

      let lastSpokenReply = '';

      ws.onmessage = (event) => {
        if (connectSeqRef.current !== seq) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.ready) {
            if (wsConnectTimerRef.current !== null) {
              window.clearTimeout(wsConnectTimerRef.current);
              wsConnectTimerRef.current = null;
            }
            reconnectAttemptsRef.current = 0;
            clearReconnectTimer();
            setErrorMessage(null);
            const isRelay = msg.transport === 'sovereign-duplex-relay';
            relayModeRef.current = isRelay;
            setTransportMode(isRelay ? 'sovereign-duplex-relay' : 'gemini-live-pcm');
            isConnectedRef.current = true;
            setIsConnected(true);
            setIsConnecting(false);

            // Start browser SpeechRecognition ONLY when mic stream is already active (never trigger unprompted browser popup)
            if (isRelay && !isMutedRef.current && streamRef.current) {
              startContinuousRecognition();
            }

            const activeMeta = ALL_MODULES.find((m) => m.id === activeModuleRef.current);
            ws.send(
              JSON.stringify({
                workspaceContext: {
                  activeModule: activeModuleRef.current,
                  activeLabel: activeMeta?.label || activeModuleRef.current,
                  openModules: openModulesRef.current,
                  proactive: peerExploreRef.current,
                  initial: true
                }
              })
            );
            lastModuleSentRef.current = activeModuleRef.current;
            return;
          }

          if (msg.error) {
            setErrorMessage(String(msg.error));
            appendTranscript('tool', `Voice bridge notice: ${String(msg.error)}`);
          }

          if (msg.transportSwitch === 'sovereign-duplex-relay') {
            relayModeRef.current = true;
            setTransportMode('sovereign-duplex-relay');
            if (!isMutedRef.current && streamRef.current) {
              startContinuousRecognition();
            }
            return;
          }

          if (msg.audio) {
            schedulePcmPlayback(msg.audio);
          }
          if (msg.bgTaskUpdate && msg.bgTaskUpdate.id) {
            const updated: VoiceBackgroundTask = msg.bgTaskUpdate;
            setBgTasks((prev) => [updated, ...prev.filter((t) => t.id !== updated.id)].slice(0, 30));
            if (updated.status === 'completed') {
              appendTranscript('tool', `Background task completed: ${updated.title}`);
            } else if (updated.status === 'failed') {
              appendTranscript('tool', `Background task failed: ${updated.title}${updated.error ? ` (${updated.error})` : ''}`);
            }
          }
          if (msg.speakSequence && typeof msg.speakSequence.text === 'string') {
            speakInfiniteTextSequence(
              String(msg.speakSequence.text),
              msg.speakSequence.id || undefined,
              msg.speakSequence.voice || undefined
            );
          } else if (msg.audioUrl) {
            playNeuralAudioUrl(String(msg.audioUrl), lastSpokenReply, msg.speakOnlyId);
          }
          if (msg.thought) {
            appendTranscript('thought', msg.thought);
          }
          if (msg.inputTranscript) {
            appendTranscript('user', msg.inputTranscript);
          }
          if (msg.outputTranscript) {
            lastSpokenReply = String(msg.outputTranscript);
            appendTranscript('model', msg.outputTranscript);
          }
          if (msg.text) {
            lastSpokenReply = String(msg.text);
            appendTranscript('model', msg.text);
          }
          if (msg.interrupted) {
            flushPlaybackQueue({ abortTurn: false });
          }
          if (msg.interactionStatus) {
            setInteractionStatus(msg.interactionStatus === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'IDLE');
          }
          if (msg.toolEvent) {
            if (msg.toolEvent.status === 'RUNNING') {
              setActiveToolName(msg.toolEvent.name);
              const argPreview = Object.entries(msg.toolEvent.args || {})
                .slice(0, 2)
                .map(([k, v]) => `${k}=${typeof v === 'string' ? v.slice(0, 48) : JSON.stringify(v).slice(0, 48)}`)
                .join(', ');
              appendTranscript(
                'tool',
                `Running ${msg.toolEvent.name.replace(/_/g, ' ')}${argPreview ? ` (${argPreview})` : ''}`
              );
            } else {
              setActiveToolName(null);
              if (msg.toolEvent.summary) {
                appendTranscript(
                  'tool',
                  `${msg.toolEvent.success === false ? 'Failed' : 'Done'} · ${msg.toolEvent.name.replace(/_/g, ' ')}: ${String(msg.toolEvent.summary).slice(0, 140)}`
                );
              }
            }
          }
          if (msg.osCommand && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('sovereign_os_command', { detail: msg.osCommand }));
          }
          if (msg.navigateModule) {
            onSelectModuleRef.current(msg.navigateModule as ModuleType);
          }
          if (msg.openBrowserUrl && onNavigateBrowserUrlRef.current) {
            onNavigateBrowserUrlRef.current(String(msg.openBrowserUrl));
          }
          if (msg.spatialCommand && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('aurelius_spatial_command', { detail: msg.spatialCommand }));
          }
        } catch (err) {
          console.warn('[PersistentTalkDock] WS parse note:', err);
        }
      };

      ws.onerror = () => {
        if (connectSeqRef.current !== seq) return;
        teardownSession({ preserveReconnectTimer: true });
        scheduleAutoReconnect('Voice channel interrupted.');
      };

      ws.onclose = () => {
        if (connectSeqRef.current !== seq) return;
        const wasConnecting = !isConnectedRef.current;
        teardownSession({ preserveReconnectTimer: true });
        scheduleAutoReconnect(
          wasConnecting ? 'Voice socket closed before handshake.' : 'Voice channel disconnected.'
        );
      };
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unable to initialize audio hardware.');
      teardownSession();
    }
  }, [
    acquireMicrophoneStream,
    clearReconnectTimer,
    startAnalyserAndVadLoop,
    appendTranscript,
    schedulePcmPlayback,
    playNeuralAudioUrl,
    speakInfiniteTextSequence,
    startContinuousRecognition,
    flushPlaybackQueue,
    teardownSession
  ]);

  const connectSessionRef = useRef(connectSession);
  const teardownSessionRef = useRef(teardownSession);
  const acquireMicrophoneStreamRef = useRef(acquireMicrophoneStream);
  const startAnalyserAndVadLoopRef = useRef(startAnalyserAndVadLoop);
  const startContinuousRecognitionRef = useRef(startContinuousRecognition);
  useEffect(() => {
    connectSessionRef.current = connectSession;
    teardownSessionRef.current = teardownSession;
    acquireMicrophoneStreamRef.current = acquireMicrophoneStream;
    startAnalyserAndVadLoopRef.current = startAnalyserAndVadLoop;
    startContinuousRecognitionRef.current = startContinuousRecognition;
  }, [connectSession, teardownSession, acquireMicrophoneStream, startAnalyserAndVadLoop, startContinuousRecognition]);

  const attachLiveMicrophoneStream = useCallback(
    async (micStream: MediaStream) => {
      stopMeterLoop();
      stopActiveVadRecorder(true);
      if (streamRef.current && streamRef.current !== micStream) {
        try {
          streamRef.current.getTracks().forEach((t) => t.stop());
        } catch {}
      }
      streamRef.current = micStream;
      setIsMuted(false);
      isMutedRef.current = false;

      const audioTrack = micStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = true;
        setMicLabel(audioTrack.label || 'Device Microphone');
        const resolvedDeviceId = audioTrack.getSettings?.().deviceId;
        if (resolvedDeviceId && !selectedMicIdRef.current) {
          prevMicIdRef.current = resolvedDeviceId;
          selectedMicIdRef.current = resolvedDeviceId;
          setSelectedMicId(resolvedDeviceId);
        }
      }
      setMicStatus('active');
      setMicConsentDismissed(true);
      setErrorMessage(null);
      refreshMicDevices();

      const AudioCtxCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxCtor) {
        const prevIn = inputCtxRef.current;
        inputCtxRef.current = null;
        safeCloseAudioContext(prevIn);
        const inputCtx = new AudioCtxCtor();
        if (inputCtx.state === 'suspended') {
          await inputCtx.resume().catch(() => {});
        }
        inputCtxRef.current = inputCtx;
        startAnalyserAndVadLoop(micStream, inputCtx);
      }

      if (isConnectedRef.current && relayModeRef.current && !isMutedRef.current) {
        stopContinuousRecognition();
        sttBrokenRef.current = false;
        startContinuousRecognition();
      }
    },
    [
      refreshMicDevices,
      safeCloseAudioContext,
      startAnalyserAndVadLoop,
      startContinuousRecognition,
      stopActiveVadRecorder,
      stopContinuousRecognition,
      stopMeterLoop
    ]
  );

  const handleRetryMicrophone = async () => {
    if (micRetryInFlightRef.current) return;
    micRetryInFlightRef.current = true;
    markVoiceUserGesture();
    try {
      // 1. Fire requestMicrophoneStreamOnUserGesture IMMEDIATELY on line 1 before any cleanup
      // so the browser's synchronous user-gesture token goes straight to getUserMedia!
      const micPromise = acquireMicrophoneStream({ allowPrompt: true });
      const micStream = await micPromise;
      if (!micStream) return;
      await attachLiveMicrophoneStream(micStream);
    } finally {
      micRetryInFlightRef.current = false;
    }
  };

  // Unified Read-Aloud / Speak-Text listener: streams infinite sentence-aligned chunks until 100% of text finishes!
  useEffect(() => {
    const onSpeakRequest = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (!detail) return;
      const reqId = String(detail.id || 'msg');
      if (detail.stop || (speakingMessageIdRef.current && speakingMessageIdRef.current === reqId)) {
        flushPlaybackQueue();
        return;
      }
      const rawText = String(detail.text || '');
      if (!rawText.trim()) return;
      const requestedVoice = typeof detail.voice === 'string' && detail.voice.trim() ? detail.voice.trim() : undefined;
      speakInfiniteTextSequence(rawText, reqId, requestedVoice, true);
    };

    const onControl = (e: Event) => {
      const detail = (e as CustomEvent)?.detail || {};
      if (detail.action === 'mute') setIsMuted((m) => (typeof detail.value === 'boolean' ? detail.value : !m));
      if (detail.action === 'speakerMute') setSpeakerMuted((s) => (typeof detail.value === 'boolean' ? detail.value : !s));
      if (detail.action === 'interrupt') flushPlaybackQueue({ abortTurn: true });
      if (detail.action === 'voice' && typeof detail.voice === 'string') {
        const normalized = normalizeVoicePresetId(detail.voice);
        setVoiceName(normalized);
        try {
          localStorage.setItem('sovereign_persistent_talk_voice_v1', normalized);
        } catch {}
      }
      if (detail.action === 'expand') setExpanded(typeof detail.value === 'boolean' ? detail.value : true);
      if (detail.action === 'archive') archiveSessionToVault();
      if (detail.action === 'nudge' && typeof detail.text === 'string' && detail.text.trim()) {
        sendRelayUtterance(detail.text.trim());
      }
      if (detail.action === 'bgTask' && typeof detail.text === 'string' && detail.text.trim()) {
        dispatchBackgroundTask(detail.text.trim(), detail.title);
      }
      if (detail.action === 'query') {
        window.dispatchEvent(
          new CustomEvent('sovereign_persistent_talk_state', {
            detail: {
              active: isActive,
              connected: isConnectedRef.current,
              connecting: isConnecting,
              muted: isMutedRef.current,
              speakerMuted: speakerMutedRef.current,
              speaking: isModelSpeakingRef.current,
              transport: transportMode,
              voiceName: voiceNameRef.current,
              micStatus,
              micLabel,
              captureMode: captureModeRef.current,
              activeToolName,
              autoArchiveVault,
              peerExploreEnabled: peerExploreRef.current,
              transcripts: transcriptsRef.current
            }
          })
        );
      }
    };

    window.addEventListener('sovereign_voice_speak_text', onSpeakRequest);
    window.addEventListener('sovereign_persistent_talk_control', onControl);
    return () => {
      window.removeEventListener('sovereign_voice_speak_text', onSpeakRequest);
      window.removeEventListener('sovereign_persistent_talk_control', onControl);
    };
  }, [
    isActive,
    isConnecting,
    transportMode,
    micStatus,
    micLabel,
    activeToolName,
    autoArchiveVault,
    flushPlaybackQueue,
    speakInfiniteTextSequence,
    archiveSessionToVault,
    sendRelayUtterance,
    dispatchBackgroundTask
  ]);

  // Connect cleanly when user clicks Voice Chat (isActive flips true):
  // If triggered by a user click (hasRecentUserActivation), immediately request the microphone popup!
  useEffect(() => {
    if (bootConnectTimerRef.current !== null) {
      window.clearTimeout(bootConnectTimerRef.current);
      bootConnectTimerRef.current = null;
    }
    if (isActive) {
      manualDisconnectRef.current = false;
      reconnectAttemptsRef.current = 0;
      setMicConsentDismissed(false);
      const userClickedToOpen = hasRecentUserActivation(4500) && isHardwareSwitchEnabled('microphone');
      connectSessionRef.current({ allowPrompt: userClickedToOpen });
    } else {
      manualDisconnectRef.current = true;
      teardownSessionRef.current();
    }
    return () => {
      if (bootConnectTimerRef.current !== null) {
        window.clearTimeout(bootConnectTimerRef.current);
        bootConnectTimerRef.current = null;
      }
      manualDisconnectRef.current = true;
      teardownSessionRef.current();
    };
  }, [isActive]);

  // Apply voice preset & native English accent updates seamlessly over existing WebSocket without re-requesting mic
  useEffect(() => {
    if (isActive && isConnected && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          updateVoiceConfig: { voice: voiceName, accent: voiceAccent }
        })
      );
    }
  }, [isActive, isConnected, voiceName, voiceAccent]);

  // Keep Web Audio input & output contexts unlocked on any user interaction in Chrome/iframes
  useEffect(() => {
    if (!isActive || typeof window === 'undefined') return;
    const unlockAudioContexts = () => {
      if (inputCtxRef.current && inputCtxRef.current.state === 'suspended') {
        inputCtxRef.current.resume().catch(() => {});
      }
      if (outputCtxRef.current && outputCtxRef.current.state === 'suspended') {
        outputCtxRef.current.resume().catch(() => {});
      }
    };
    window.addEventListener('pointerdown', unlockAudioContexts, { passive: true });
    window.addEventListener('keydown', unlockAudioContexts, { passive: true });
    const onHardwareRevoked = (ev: Event) => {
      const key = (ev as CustomEvent)?.detail?.key;
      if (key === 'microphone') {
        setIsMuted(true);
        stopContinuousRecognition();
        stopActiveVadRecorder(true);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setMicStatus('needs-gesture');
        setMicConsentDismissed(false);
        setMicLevel(0);
      }
    };
    const onMicStreamGranted = () => {
      const grantedStream = claimSharedMicrophoneStream();
      if (grantedStream) {
        attachLiveMicrophoneStream(grantedStream);
      }
    };
    window.addEventListener('sovereign_hardware_permission_revoked', onHardwareRevoked);
    window.addEventListener('sovereign_microphone_stream_granted', onMicStreamGranted);
    return () => {
      window.removeEventListener('pointerdown', unlockAudioContexts);
      window.removeEventListener('keydown', unlockAudioContexts);
      window.removeEventListener('sovereign_hardware_permission_revoked', onHardwareRevoked);
      window.removeEventListener('sovereign_microphone_stream_granted', onMicStreamGranted);
    };
  }, [isActive, attachLiveMicrophoneStream, stopActiveVadRecorder, stopContinuousRecognition]);

  // Track explicit mic selection (actual device switch is triggered from the dropdown onChange handler)
  const prevMicIdRef = useRef<string>(selectedMicId);
  useEffect(() => {
    prevMicIdRef.current = selectedMicId;
  }, [selectedMicId]);

  // Apply capture mode change live
  useEffect(() => {
    if (!isConnectedRef.current || !relayModeRef.current || isMutedRef.current) return;
    if (captureMode === 'vad') {
      stopContinuousRecognition();
    } else {
      sttBrokenRef.current = false;
      startContinuousRecognition();
    }
  }, [captureMode, startContinuousRecognition, stopContinuousRecognition]);

  // Stream lightweight workspace context when user switches active windows during hands-free talk
  useEffect(() => {
    if (!isConnected || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (lastModuleSentRef.current === activeModule) return;
    lastModuleSentRef.current = activeModule;

    const timer = setTimeout(() => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) return;
      const activeMeta = ALL_MODULES.find((m) => m.id === activeModule);
      wsRef.current.send(
        JSON.stringify({
          workspaceContext: {
            activeModule,
            activeLabel: activeMeta?.label || activeModule,
            openModules,
            proactive: peerExploreRef.current
          }
        })
      );
    }, 900);

    return () => clearTimeout(timer);
  }, [activeModule, openModules, isConnected]);

  const handleEndTalk = () => {
    manualDisconnectRef.current = true;
    clearReconnectTimer();
    if (autoArchiveVault && transcriptsRef.current.length > 0) {
      archiveSessionToVault(transcriptsRef.current);
    }
    onDeactivate();
  };

  const triggerPeerExploration = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const activeMeta = ALL_MODULES.find((m) => m.id === activeModule);
    const cue = `I'm actively working in ${activeMeta?.label || activeModule} (open windows: ${openModules.join(', ')}). Inspect what's relevant in the workspace and share a quick, natural peer suggestion.`;
    if (relayModeRef.current) {
      sendRelayUtterance(cue);
    } else {
      wsRef.current.send(JSON.stringify({ text: `[PEER EXPLORATION CUE] ${cue}` }));
      appendTranscript('tool', `Peer exploring context around ${activeMeta?.label || activeModule}...`);
    }
  };

  const handleSendNudge = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickNudge.trim();
    if (!trimmed) return;
    // Allow immediate interjection even while speaking or thinking!
    flushPlaybackQueue({ abortTurn: true });
    if (relayModeRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      sendRelayUtterance(trimmed);
    } else {
      wsRef.current.send(JSON.stringify({ interrupt: true }));
      wsRef.current.send(JSON.stringify({ text: trimmed }));
      appendTranscript('user', trimmed);
    }
    setQuickNudge('');
  };

  const handleDispatchBgFromInput = () => {
    const trimmed = quickNudge.trim();
    if (!trimmed) return;
    dispatchBackgroundTask(trimmed);
    setQuickNudge('');
  };

  const handleManualFinishUtterance = () => {
    if (vadRecorderRef.current && vadRecorderRef.current.state === 'recording') {
      try {
        vadRecorderRef.current.stop();
      } catch {}
    } else if (streamRef.current && !isMutedRef.current) {
      beginVadUtteranceCapture();
    }
  };

  const startDockDrag = (e: React.PointerEvent) => {
    if (isCompactMobile) return;
    if (e.button !== 0 || (e.target as HTMLElement).closest('button, select, input, textarea')) return;
    e.preventDefault();
    const rect = dockElRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragDockRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: rect.left,
      origY: rect.top
    };

    const onMove = (ev: PointerEvent) => {
      const s = dragDockRef.current;
      if (!s) return;
      const w = dockElRef.current?.offsetWidth || 340;
      const h = dockElRef.current?.offsetHeight || 56;
      const nx = Math.max(8, Math.min(window.innerWidth - w - 8, s.origX + (ev.clientX - s.startX)));
      const ny = Math.max(40, Math.min(window.innerHeight - h - 52, s.origY + (ev.clientY - s.startY)));
      setDockPos({ x: Math.round(nx), y: Math.round(ny) });
    };

    const onUp = () => {
      dragDockRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  if (!isActive) return null;

  const latestLine = transcripts[transcripts.length - 1];
  const barHeights = [0.45, 0.85, 1, 0.72, 0.5].map((scale) =>
    isMuted ||
    micStatus === 'denied' ||
    micStatus === 'unavailable' ||
    micStatus === 'needs-gesture' ||
    micStatus === 'frame-policy-blocked'
      ? 3
      : isModelSpeaking
      ? Math.max(5, Math.round(6 + scale * 12))
      : Math.max(3, Math.round(3 + micLevel * scale * 18))
  );

  const hasLiveMicStream = Boolean(
    streamRef.current && streamRef.current.getAudioTracks().some((t) => t.readyState === 'live')
  );

  const micBlocked =
    !hasLiveMicStream ||
    micStatus === 'idle' ||
    micStatus === 'denied' ||
    micStatus === 'unavailable' ||
    micStatus === 'needs-gesture' ||
    micStatus === 'frame-policy-blocked';

  const showMicConsentCard =
    !micConsentDismissed &&
    (!hasLiveMicStream ||
      micStatus === 'needs-gesture' ||
      micStatus === 'denied' ||
      micStatus === 'frame-policy-blocked');

  const activeBgCount = bgTasks.filter((t) => t.status === 'running' || t.status === 'queued').length;
  const activeVoiceOption = VOICE_OPTIONS.find((v) => v.id === voiceName);

  return (
    <div
      ref={dockElRef}
      style={
        !isCompactMobile && dockPos
          ? { left: dockPos.x, top: dockPos.y, bottom: 'auto', right: 'auto' }
          : undefined
      }
      className={`fixed z-50 flex flex-col rounded-2xl bg-zinc-950/95 border shadow-[0_20px_60px_rgba(0,0,0,0.85)] backdrop-blur-xl transition-colors ${
        isCompactMobile
          ? 'inset-x-2 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] w-auto max-h-[72dvh]'
          : `w-[420px] max-w-[calc(100vw-1.5rem)] max-h-[82dvh] ${!dockPos ? 'bottom-14 left-4' : ''}`
      } ${
        micBlocked
          ? 'border-amber-500/70'
          : isModelSpeaking
          ? 'border-sky-400/70'
          : vadRecording
          ? 'border-emerald-300/80'
          : isConnected
          ? 'border-emerald-500/55'
          : 'border-zinc-700'
      }`}
    >
      {/* Compact Always-Accessible Hands-Free Control Bar */}
      <div
        onPointerDown={startDockDrag}
        className={`px-2.5 sm:px-3 py-2 flex items-center justify-between gap-2 select-none shrink-0 ${
          isCompactMobile ? '' : 'cursor-grab active:cursor-grabbing'
        }`}
        title={isCompactMobile ? 'Sovereign Voice Dock' : 'Drag to reposition Voice Dock'}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {!isCompactMobile && (
            <GripHorizontal className="w-3.5 h-3.5 text-zinc-500 shrink-0" aria-hidden="true" />
          )}

          {/* Live Compact Acoustic Level Bars */}
          <div className="flex items-center gap-0.5 h-5 w-6 justify-center shrink-0" aria-hidden="true">
            {barHeights.map((h, i) => (
              <span
                key={i}
                style={{ height: `${h}px` }}
                className={`w-[3px] rounded-full transition-all duration-75 ${
                  isMuted || micBlocked
                    ? 'bg-zinc-600'
                    : isModelSpeaking
                    ? 'bg-sky-400'
                    : vadRecording
                    ? 'bg-emerald-300'
                    : isConnected
                    ? 'bg-emerald-400'
                    : 'bg-amber-400'
                }`}
              />
            ))}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-100 leading-tight">
              <span className="truncate">
                {isConnecting
                  ? 'Connecting Voice...'
                  : !isConnected
                  ? 'Voice Paused'
                  : activeToolName
                  ? `Running: ${activeToolName.replace(/_/g, ' ')}`
                  : isModelSpeaking
                  ? 'OS Voice Output Active'
                  : interactionStatus === 'IN_PROGRESS'
                  ? 'Processing Turn...'
                  : vadTranscribing
                  ? 'Transcribing Audio...'
                  : vadRecording
                  ? 'Listening...'
                  : isMuted
                  ? 'Mic Muted'
                  : micStatus === 'needs-gesture' || !hasLiveMicStream
                  ? 'Mic Standby · Tap Enable'
                  : micBlocked
                  ? 'Mic Permission Needed'
                  : activeVoiceOption?.label || voiceName}
              </span>
              {activeBgCount > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-[9px] font-mono text-amber-300 shrink-0">
                  {activeBgCount} BG
                </span>
              )}
            </div>
            <div className="text-[10px] font-mono text-zinc-400 truncate mt-0.5">
              {interimSpeech
                ? `Hearing: "${interimSpeech}"`
                : isConnected
                ? micStatus === 'needs-gesture' || !hasLiveMicStream
                  ? 'Tap Enable Mic once for hands-free capture'
                  : micBlocked
                  ? 'Click Enable Mic or type to interject'
                  : isModelSpeaking
                  ? 'Speak or tap Interrupt anytime to barge in'
                  : interactionStatus === 'IN_PROGRESS'
                  ? 'Interrupt anytime · decoupled from Text Chat'
                  : transportMode === 'gemini-live-pcm'
                  ? 'Gemini Live PCM · Impersonal OS Voice · Scratchpad'
                  : 'Studio Voice Duplex · Decoupled Scratchpad'
                : errorMessage || 'Autonomous Sovereign OS Voice Channel'}
            </div>
          </div>
        </div>

        {/* Well-Spaced Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {(isModelSpeaking || interactionStatus === 'IN_PROGRESS') && (
            <button
              type="button"
              onClick={() => flushPlaybackQueue({ abortTurn: true })}
              className="h-8 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/60 text-amber-200 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
              title="Interrupt current speech & generation immediately"
            >
              <Square className="w-2.5 h-2.5 fill-current" />
              <span className="hidden sm:inline">Interrupt</span>
            </button>
          )}
          {!isConnected && !isConnecting && (
            <button
              type="button"
              onClick={() => {
                markVoiceUserGesture();
                teardownSessionRef.current();
                connectSessionRef.current({ allowPrompt: true });
              }}
              className="h-8 px-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/60 text-emerald-200 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
              title="Reconnect Voice Chat WebSocket"
            >
              <span>Reconnect</span>
            </button>
          )}
          {micBlocked ? (
            <button
              type="button"
              onClick={handleRetryMicrophone}
              className="h-8 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/60 text-amber-200 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
              title="Request device microphone permission and bind audio input"
            >
              <Mic className="w-3 h-3" />
              <span>Enable Mic</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (!hasLiveMicStream) {
                  handleRetryMicrophone();
                  return;
                }
                setIsMuted((m) => !m);
              }}
              disabled={!isConnected}
              className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 ${
                isMuted
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : vadRecording
                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                  : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-emerald-300'
              }`}
              title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              aria-label={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            type="button"
            onClick={() => setSpeakerMuted((s) => !s)}
            disabled={!isConnected}
            className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 ${
              speakerMuted
                ? 'bg-zinc-800 border-zinc-600 text-zinc-400'
                : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-sky-300'
            }`}
            title={speakerMuted ? 'Unmute Voice Output' : 'Mute Voice Output'}
            aria-label={speakerMuted ? 'Unmute Voice Output' : 'Mute Voice Output'}
          >
            {speakerMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="h-8 w-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center transition-colors cursor-pointer"
            title={expanded ? 'Collapse Transcript & Mic Controls' : 'Expand Transcript, Mic Selector & Options'}
            aria-label={expanded ? 'Collapse Talk Drawer' : 'Expand Talk Drawer'}
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>

          <div className="h-5 w-px bg-zinc-700/80 mx-0.5" aria-hidden="true" />

          <button
            type="button"
            onClick={handleEndTalk}
            className="h-8 w-8 rounded-lg bg-rose-950/60 hover:bg-rose-600 border border-rose-500/45 text-rose-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="End Voice Chat (Auto-Archives Transcript + CoT to Vault)"
            aria-label="End Voice Chat"
          >
            <PhoneOff className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Subtle Single-Line Live Caption When Collapsed */}
      {!expanded && latestLine && (
        <div className="px-3 pb-2 pt-0.5 border-t border-zinc-800/70 text-[11px] text-zinc-300 truncate flex items-center gap-1.5">
          <span
            className={`font-mono text-[10px] font-semibold shrink-0 ${
              latestLine.role === 'user'
                ? 'text-zinc-400'
                : latestLine.role === 'thought'
                ? 'text-cyan-400'
                : latestLine.role === 'tool'
                ? 'text-sky-400'
                : 'text-emerald-400'
            }`}
          >
            {latestLine.role === 'user'
              ? 'You:'
              : latestLine.role === 'thought'
              ? 'Trace:'
              : latestLine.role === 'tool'
              ? 'System:'
              : 'OS Voice:'}
          </span>
          <span className="truncate">{latestLine.text}</span>
        </div>
      )}

      {/* Clean On-Demand Microphone Permission Prompt (Appears ONLY when Voice Chat is opened and mic isn't granted yet; ZERO system refresh!) */}
      {showMicConsentCard && (
        <div className="px-3 py-2.5 border-t border-emerald-500/30 bg-zinc-900/95 space-y-2 text-xs">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-semibold text-zinc-100 flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  {micStatus === 'frame-policy-blocked'
                    ? 'Hardware Mic Restricted by Preview Frame'
                    : micStatus === 'denied'
                    ? 'Microphone Blocked in Browser Settings'
                    : 'Allow Microphone Access for Voice Chat?'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                {micStatus === 'frame-policy-blocked'
                  ? 'This embedded preview iframe blocks raw mic capture so it never forces a boot reload. Open in a direct browser tab for live mic input, or type below with full spoken voice replies right here.'
                  : micStatus === 'denied'
                  ? 'Allow Microphone in your browser address bar site settings, then click Allow Microphone below (no page refresh needed).'
                  : 'Click Allow Microphone to speak hands-free with Lyrailius Omega (1:1 same entity, tools & memory as Text Chat — zero page refresh).'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleRetryMicrophone();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-[11px] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Mic className="w-3 h-3" />
              <span>Allow Microphone</span>
            </button>
            {micStatus === 'frame-policy-blocked' && (
              <a
                href={typeof window !== 'undefined' ? window.location.href : '/'}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-200 font-semibold text-[11px] inline-flex items-center gap-1.5 transition-colors"
              >
                <Mic className="w-3 h-3" />
                <span>Open Standalone Tab</span>
              </a>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMicConsentDismissed(true);
                setExpanded(true);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-[11px] font-medium cursor-pointer transition-colors"
            >
              Use Text + Voice Output
            </button>
          </div>
        </div>
      )}

      {/* Recovery Strip */}
      {errorMessage && !showMicConsentCard && (
        <div className="px-3 py-2 border-t border-amber-500/30 bg-amber-950/35 flex items-center justify-between gap-2 text-[11px] text-amber-200">
          <span className="truncate">{errorMessage}</span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              markVoiceUserGesture();
              if (micBlocked) {
                handleRetryMicrophone();
              } else {
                connectSession({ allowPrompt: false });
              }
            }}
            className="px-2 py-1 rounded bg-amber-500/25 hover:bg-amber-500/40 border border-amber-400/50 text-amber-100 font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>{micBlocked ? 'Allow Mic' : 'Reconnect'}</span>
          </button>
        </div>
      )}

      {/* Expandable Live Voice Drawer (Decoupled Live Log · Scratchpad · Async Background Tasks) */}
      {expanded && (
        <div className="border-t border-zinc-800 p-2.5 sm:p-3 space-y-2.5 text-xs overflow-y-auto min-h-0 flex-1">
          {/* Device Microphone Picker & Capture Mode */}
          <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-zinc-800/70">
            <Mic className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <select
              value={selectedMicId}
              onChange={(e) => {
                const nextId = e.target.value;
                selectedMicIdRef.current = nextId;
                setSelectedMicId(nextId);
                if (isActive) {
                  setTimeout(() => {
                    handleRetryMicrophone();
                  }, 0);
                }
              }}
              aria-label="Select Device Microphone"
              className="flex-1 min-w-[120px] bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-[11px] text-zinc-100 focus:outline-none focus:border-emerald-500 cursor-pointer truncate"
            >
              <option value="">System Default Mic</option>
              {micDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))}
            </select>

            <select
              value={captureMode}
              onChange={(e) => setCaptureMode(e.target.value as MicCaptureMode)}
              aria-label="Voice Capture Engine"
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-[11px] text-zinc-200 focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="hybrid">Auto Hybrid</option>
              <option value="vad">Direct VAD</option>
              <option value="browser-stt">Browser STT</option>
            </select>

            <button
              type="button"
              onClick={handleManualFinishUtterance}
              disabled={!isConnected || isMuted || micBlocked}
              className={`px-2 py-1 rounded-lg border text-[10px] font-semibold cursor-pointer disabled:opacity-40 ${
                vadRecording
                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-100'
                  : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-300'
              }`}
            >
              {vadRecording ? 'Send Clip' : 'Tap Talk'}
            </button>
          </div>

          {/* Acoustic Output Timbre & Controls (Impersonal Distilled Cores + Gemini Native Audio) */}
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
              <Radio className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <select
                value={voiceName}
                onChange={(e) => {
                  const nextVoice = normalizeVoicePresetId(e.target.value);
                  setVoiceName(nextVoice);
                  try {
                    localStorage.setItem('sovereign_persistent_talk_voice_v1', nextVoice);
                  } catch {}
                }}
                aria-label="OS Voice Timbre"
                className="flex-1 min-w-[155px] bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-[11px] text-zinc-100 focus:outline-none focus:border-sky-500 cursor-pointer truncate"
              >
                {VOICE_OPTIONS.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>

              <select
                value={voiceAccent}
                onChange={(e) => setVoiceAccent(e.target.value as NativeEnglishAccent)}
                aria-label="Native English Accent"
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-[11px] text-emerald-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="en-US">US English</option>
                <option value="en-GB">UK English</option>
              </select>
            </div>

            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => setPeerExploreEnabled((v) => !v)}
                className={`px-2 py-1 rounded-lg border text-[10px] font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                  peerExploreEnabled
                    ? 'bg-sky-500/15 border-sky-500/45 text-sky-200'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                }`}
              >
                <Compass className="w-3 h-3" />
                <span>Explore</span>
              </button>

              {onSaveToVault && (
                <button
                  type="button"
                  onClick={() => archiveSessionToVault()}
                  disabled={transcripts.length === 0}
                  className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[10px] text-cyan-300 flex items-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  {vaultSavedFlash ? <Check className="w-3 h-3 text-emerald-400" /> : <BookmarkPlus className="w-3 h-3" />}
                  <span>{vaultSavedFlash ? 'Saved' : 'Vault'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={triggerPeerExploration}
                disabled={!isConnected}
                className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[10px] text-amber-300 cursor-pointer disabled:opacity-40"
              >
                Check View
              </button>
            </div>
          </div>

          {/* Decoupled 3-Tab Switcher: Live Log | Scratchpad | Bg Tasks */}
          <div className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setDrawerTab('log')}
              className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                drawerTab === 'log'
                  ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Radio className="w-3 h-3" />
              <span>Live Log</span>
              {transcripts.length > 0 && <span className="text-[10px] opacity-75">({transcripts.length})</span>}
            </button>
            <button
              type="button"
              onClick={() => setDrawerTab('scratchpad')}
              className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                drawerTab === 'scratchpad'
                  ? 'bg-sky-500/20 text-sky-200 border border-sky-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <NotebookPen className="w-3 h-3" />
              <span>Scratchpad</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDrawerTab('tasks');
                refreshBgTasks();
              }}
              className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                drawerTab === 'tasks'
                  ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ListTodo className="w-3 h-3" />
              <span>Bg Tasks</span>
              {bgTasks.length > 0 && (
                <span className="text-[10px] opacity-80">
                  ({activeBgCount > 0 ? `${activeBgCount} live` : bgTasks.length})
                </span>
              )}
            </button>
          </div>

          {/* Tab 1: Independent Voice Live Log (Never pollutes Text Chat) */}
          {drawerTab === 'log' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-zinc-400 px-0.5">
                <span>Decoupled voice log (separate from Text Chat)</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={transcripts.length === 0}
                    onClick={() => {
                      const dumped = transcripts
                        .map((t) => `[${t.timestamp}] ${t.role === 'user' ? 'You' : t.role === 'tool' ? 'System' : 'OS'}: ${t.text}`)
                        .join('\n');
                      setScratchpad((prev) => (prev ? `${prev}\n\n${dumped}` : dumped));
                      setDrawerTab('scratchpad');
                    }}
                    className="text-sky-300 hover:text-sky-200 cursor-pointer disabled:opacity-40"
                  >
                    Copy to Scratchpad
                  </button>
                  <button
                    type="button"
                    disabled={transcripts.length === 0}
                    onClick={() => {
                      setTranscripts([]);
                      transcriptsRef.current = [];
                      try {
                        localStorage.removeItem('sovereign_voice_transcripts_v1');
                      } catch {}
                    }}
                    className="text-zinc-500 hover:text-rose-300 cursor-pointer disabled:opacity-40"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="h-44 overflow-y-auto rounded-xl bg-zinc-900/80 border border-zinc-800 p-2.5 space-y-2">
                {transcripts.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center text-[11px] text-zinc-500 px-3">
                    Full-duplex impersonal OS voice channel active. Talk freely, interrupt anytime, or launch long background tasks without touching Text Chat.
                  </div>
                ) : (
                  transcripts.map((item) => (
                    <div
                      key={item.id}
                      className={`p-2 rounded-lg text-[11px] leading-relaxed ${
                        item.role === 'user'
                          ? 'bg-zinc-800/80 text-zinc-100'
                          : item.role === 'thought'
                          ? 'bg-cyan-950/35 border border-cyan-500/30 text-cyan-200 font-mono text-[10px]'
                          : item.role === 'tool'
                          ? 'bg-sky-950/35 border border-sky-500/25 text-sky-300 font-mono text-[10px]'
                          : 'bg-emerald-950/25 border border-emerald-500/20 text-emerald-100'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-0.5">
                        <span className="flex items-center gap-1 font-semibold">
                          {item.role === 'thought' && <Brain className="w-2.5 h-2.5 text-cyan-400" />}
                          {item.role === 'tool' && <Wrench className="w-2.5 h-2.5 text-sky-400" />}
                          {item.role === 'user'
                            ? 'You'
                            : item.role === 'thought'
                            ? 'OS Reasoning'
                            : item.role === 'tool'
                            ? 'OS Action'
                            : 'OS Voice'}
                        </span>
                        <span className="tabular-nums">{item.timestamp}</span>
                      </div>
                      <div>{item.text}</div>
                    </div>
                  ))
                )}
                <div ref={transcriptEndRef} />
              </div>
            </div>
          )}

          {/* Tab 2: Dedicated Voice Scratchpad */}
          {drawerTab === 'scratchpad' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-zinc-400 px-0.5">
                <span>Persistent Voice Scratchpad (auto-saved)</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!scratchpad.trim()}
                    onClick={() => {
                      navigator.clipboard?.writeText(scratchpad).catch(() => {});
                      setScratchpadCopied(true);
                      setTimeout(() => setScratchpadCopied(false), 1600);
                    }}
                    className="text-sky-300 hover:text-sky-200 inline-flex items-center gap-1 cursor-pointer disabled:opacity-40"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{scratchpadCopied ? 'Copied' : 'Copy'}</span>
                  </button>
                  {onSaveToVault && (
                    <button
                      type="button"
                      disabled={!scratchpad.trim()}
                      onClick={() => {
                        onSaveToVault(
                          `Voice Scratchpad (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
                          scratchpad,
                          'sovereign-voice-scratchpad'
                        );
                        setVaultSavedFlash(true);
                        setTimeout(() => setVaultSavedFlash(false), 2000);
                      }}
                      className="text-emerald-300 hover:text-emerald-200 cursor-pointer disabled:opacity-40"
                    >
                      Save Vault
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!scratchpad.trim()}
                    onClick={() => setScratchpad('')}
                    className="text-zinc-500 hover:text-rose-300 cursor-pointer disabled:opacity-40"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <textarea
                value={scratchpad}
                onChange={(e) => setScratchpad(e.target.value)}
                rows={8}
                placeholder="Jot notes, paste logs, or copy live voice transcripts here without ever cluttering your main Text Chat..."
                className="w-full h-44 bg-zinc-900/90 border border-zinc-800 focus:border-sky-500/60 rounded-xl p-2.5 text-[11px] font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none leading-relaxed"
              />
            </div>
          )}

          {/* Tab 3: Non-Blocking Async Background Tasks */}
          {drawerTab === 'tasks' && (
            <div className="h-48 overflow-y-auto rounded-xl bg-zinc-900/80 border border-zinc-800 p-2 space-y-2">
              {bgTasks.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-[11px] text-zinc-500 px-3 gap-1">
                  <span>No background tasks yet.</span>
                  <span>Ask verbally for a deep/long task or type below and click Bg Task — voice conversation stays completely unblocked.</span>
                </div>
              ) : (
                bgTasks.map((task) => {
                  const isExp = expandedTaskId === task.id;
                  return (
                    <div
                      key={task.id}
                      className="rounded-lg bg-zinc-950/90 border border-zinc-800 p-2 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedTaskId(isExp ? null : task.id)}
                          className="flex items-center gap-1.5 min-w-0 flex-1 text-left cursor-pointer"
                        >
                          {task.status === 'running' || task.status === 'queued' ? (
                            <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
                          ) : task.status === 'completed' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          )}
                          <span className="text-[11px] font-semibold text-zinc-100 truncate">{task.title}</span>
                        </button>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400">
                            {task.status}
                          </span>
                          <button
                            type="button"
                            onClick={() => cancelOrRemoveBgTask(task.id)}
                            className="p-1 rounded hover:bg-rose-500/20 text-zinc-500 hover:text-rose-300 cursor-pointer"
                            title={task.status === 'running' ? 'Cancel background task' : 'Remove task'}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      {isExp && (
                        <div className="text-[10px] font-mono text-zinc-300 bg-zinc-900/90 border border-zinc-800 rounded p-2 whitespace-pre-wrap max-h-32 overflow-y-auto">
                          {task.result || task.error || `Prompt: ${task.prompt}`}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Interject or Launch Non-Blocking Background Task */}
          <form onSubmit={handleSendNudge} className="flex items-center gap-1.5">
            <input
              type="text"
              value={quickNudge}
              onChange={(e) => setQuickNudge(e.target.value)}
              placeholder="Interject live or type a long background task..."
              className="flex-1 min-w-0 bg-zinc-900 border border-zinc-800 focus:border-sky-500/60 rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-100 placeholder-zinc-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleDispatchBgFromInput}
              disabled={!quickNudge.trim()}
              className="h-7 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-amber-500/40 text-amber-300 text-[10px] font-semibold flex items-center gap-1 disabled:opacity-40 cursor-pointer shrink-0"
              title="Run as non-blocking background task without pausing voice chat"
            >
              <Zap className="w-3 h-3" />
              <span>Bg Task</span>
            </button>
            <button
              type="submit"
              disabled={!quickNudge.trim()}
              className="h-7 px-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-[10px] flex items-center justify-center gap-1 disabled:opacity-40 cursor-pointer shrink-0"
              title="Interject into live voice conversation immediately"
              aria-label="Interject into voice chat"
            >
              <Send className="w-3 h-3" />
              <span className="hidden sm:inline">Interject</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
