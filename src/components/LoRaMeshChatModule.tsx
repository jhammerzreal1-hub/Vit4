/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 * (TWENTY 47 PROTOCOL - GENESIS NODE / LYSANDER CORE EULA / H-FID Forensic License v1.1).
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Radio,
  Hash,
  Volume2,
  Mic,
  MicOff,
  Headphones,
  HeadphoneOff,
  Video,
  VideoOff,
  MonitorUp,
  MonitorOff,
  PhoneOff,
  PhoneCall,
  Users,
  Pin,
  Send,
  Plus,
  Settings,
  Sparkles,
  Bot,
  MessageSquare,
  CornerUpLeft,
  Trash2,
  Shield,
  Signal,
  Usb,
  X,
  Maximize2,
  Minimize2,
  Flame,
  Zap,
  Globe,
  CheckCircle2,
  AlertCircle,
  Loader2,
  EyeOff,
  Lock,
  Network,
  Paperclip,
  Download,
  FileText,
  Film,
  Image as ImageIcon,
  Music,
  ExternalLink,
  UserPlus,
  Mail
} from 'lucide-react';
import type { AuthUserPublic } from '../types/auth';
import type {
  LoRaAgentProfile,
  LoRaChannelKind,
  LoRaFederatedPeer,
  LoRaLinkPreview,
  LoRaMeshAttachment,
  LoRaMeshChannel,
  LoRaMeshMessage,
  LoRaMeshServer,
  LoRaModemPreset,
  LoRaPresenceMember,
  LoRaRegion,
  LoRaTypingState,
  LoRaVoiceParticipant
} from '../types/loraMesh';
import { requestCameraStream, requestMicrophoneStream } from '../utils/mediaPermissions';
import { sovereignVoiceQueue } from '../utils/voiceEngine';
import { buildAuthHeaders, getAuthBearerToken } from '../utils/authClient';
import { SoSMeshIcon } from './SoSMeshIcon';

interface LoRaMeshChatModuleProps {
  currentUser?: AuthUserPublic | null;
}

const PRIVATE_DM_SERVER_ID = 'srv_private_dms';
const QUICK_EMOJIS = ['🔥', '⚡', '📡', '🧠', '🛡️', '🚀'];
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

async function meshFetch<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const extraHeaders: Record<string, string> = {
    'X-Sovereign-Request': '1',
    ...(options.headers as Record<string, string> | undefined)
  };
  if (options.body && !extraHeaders['Content-Type']) {
    extraHeaders['Content-Type'] = 'application/json';
  }
  const resp = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: buildAuthHeaders(extraHeaders)
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data?.error || `Request failed (${resp.status})`);
  }
  return data as T;
}

function formatAttachmentBytes(bytes: number): string {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function renderLinkifiedText(text: string): React.ReactNode {
  if (!text) return null;
  const parts = text.split(/(https?:\/\/[^\s<>"'`)\]]+)/gi);
  return parts.map((part, idx) => {
    if (/^https?:\/\//i.test(part)) {
      const cleaned = part.replace(/[.,!?;:]+$/, '');
      const trailing = part.slice(cleaned.length);
      return (
        <React.Fragment key={idx}>
          <a
            href={cleaned}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-300 hover:text-cyan-200 underline underline-offset-2 break-all"
          >
            {cleaned}
          </a>
          {trailing}
        </React.Fragment>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

const MediaVideoElement: React.FC<{
  stream: MediaStream | null;
  muted?: boolean;
  mirror?: boolean;
  className?: string;
}> = ({ stream, muted = false, mirror = false, className = '' }) => {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }
    if (stream) {
      el.play().catch(() => {});
    }
  }, [stream]);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className={`${className} ${mirror ? '-scale-x-100' : ''}`}
    />
  );
};

const RemoteAudioPlayer: React.FC<{ stream: MediaStream; deafened: boolean }> = ({ stream, deafened }) => {
  const ref = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    el.muted = deafened;
    el.play().catch(() => {});
  }, [stream, deafened]);

  return <audio ref={ref} autoPlay playsInline muted={deafened} className="hidden" />;
};

export const LoRaMeshChatModule: React.FC<LoRaMeshChatModuleProps> = ({ currentUser }) => {
  // Mesh data state
  const [servers, setServers] = useState<LoRaMeshServer[]>([]);
  const [channels, setChannels] = useState<LoRaMeshChannel[]>([]);
  const [agents, setAgents] = useState<LoRaAgentProfile[]>([]);
  const [members, setMembers] = useState<LoRaPresenceMember[]>([]);
  const [voiceParticipants, setVoiceParticipants] = useState<LoRaVoiceParticipant[]>([]);
  const [messagesByChannel, setMessagesByChannel] = useState<Record<string, LoRaMeshMessage[]>>({});
  const [socialPulseEnabled, setSocialPulseEnabled] = useState(true);
  const [localMeshId, setLocalMeshId] = useState<string>('');
  const [federatedPeers, setFederatedPeers] = useState<LoRaFederatedPeer[]>([]);
  const [autonomousStats, setAutonomousStats] = useState<{
    active: boolean;
    totalAutonomousPosts: number;
    lastAutonomousAt: number | null;
    nextScheduledAt: number | null;
  }>({ active: true, totalAutonomousPosts: 0, lastAutonomousAt: null, nextScheduledAt: null });

  // Navigation & UI state
  const [activeServerId, setActiveServerId] = useState<string>('srv_sovereign_prime');
  const [activeChannelId, setActiveChannelId] = useState<string>('ch_social_feed');
  const [showMembers, setShowMembers] = useState(true);
  const [showPinned, setShowPinned] = useState(false);
  const [showInCallChat, setShowInCallChat] = useState(true);
  const [showFederationModal, setShowFederationModal] = useState(false);
  const [showNewDmModal, setShowNewDmModal] = useState(false);
  const [showAddDmMembersModal, setShowAddDmMembersModal] = useState(false);
  const [dmSelectedIds, setDmSelectedIds] = useState<string[]>([]);
  const [dmGroupName, setDmGroupName] = useState('');
  const [incomingCall, setIncomingCall] = useState<{
    channelId: string;
    channelName: string;
    kind: string;
    mode: 'audio' | 'video';
    callerUserId: string;
    callerDisplayName: string;
    ts: number;
  } | null>(null);
  const [peerNameDraft, setPeerNameDraft] = useState('');
  const [peerEndpointDraft, setPeerEndpointDraft] = useState('');
  const [peerSecretDraft, setPeerSecretDraft] = useState('');
  const [peerChannelDraft, setPeerChannelDraft] = useState('ch_agent_comms');
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'reconnecting'>('connecting');
  const [selfClientId, setSelfClientId] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<{ ok: boolean; text: string } | null>(null);

  // Composer & Typing state
  const [draft, setDraft] = useState('');
  const [anonymousMode, setAnonymousMode] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<LoRaMeshAttachment[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [dragOverFeed, setDragOverFeed] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState<LoRaMeshAttachment | null>(null);
  const [expandedYouTubeIds, setExpandedYouTubeIds] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [replyTo, setReplyTo] = useState<LoRaMeshMessage | null>(null);
  const [typingList, setTypingList] = useState<LoRaTypingState[]>([]);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  // Voice & Video Call state (Unlimited Multi-Party WebRTC Mesh)
  const [activeVoiceChannelId, setActiveVoiceChannelId] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [localSpeaking, setLocalSpeaking] = useState(false);
  const [spotlightId, setSpotlightId] = useState<string | null>(null);
  const [localVideoStream, setLocalVideoStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [voiceListening, setVoiceListening] = useState(false);
  const [voicePromptDraft, setVoicePromptDraft] = useState('');

  // Hardware Web Serial USB LoRa Bridge
  const [usbConnected, setUsbConnected] = useState(false);
  const usbPortRef = useRef<any>(null);
  const usbWriterRef = useRef<any>(null);

  // Modals
  const [showCreateServerModal, setShowCreateServerModal] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [newServerRegion, setNewServerRegion] = useState<LoRaRegion>('US_915');
  const [newServerModem, setNewServerModem] = useState<LoRaModemPreset>('LongFast');

  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelKind, setNewChannelKind] = useState<LoRaChannelKind>('text');
  const [newChannelTopic, setNewChannelTopic] = useState('');

  const [showRadioModal, setShowRadioModal] = useState(false);
  const [radioRegion, setRadioRegion] = useState<LoRaRegion>('US_915');
  const [radioModem, setRadioModem] = useState<LoRaModemPreset>('LongFast');
  const [radioHopLimit, setRadioHopLimit] = useState(3);
  const [radioPsk, setRadioPsk] = useState('SOV-AES256-PRIME');

  const [showHuddleModal, setShowHuddleModal] = useState(false);
  const [huddleTopic, setHuddleTopic] = useState('');
  const [huddleAgentIds, setHuddleAgentIds] = useState<string[]>([
    'lyrailius-omega-zenith',
    'sovereign-engineer-core',
    'colonel-ro-private-ghost'
  ]);

  // Refs for real-time WebSocket & WebRTC mesh
  const wsRef = useRef<WebSocket | null>(null);
  const selfClientIdRef = useRef<string | null>(null);
  const activeVoiceChannelIdRef = useRef<string | null>(null);
  const localAudioStreamRef = useRef<MediaStream | null>(null);
  const localVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const speakingTimerRef = useRef<number | null>(null);
  const deafenedRef = useRef(false);
  const mutedRef = useRef(false);
  const cameraOnRef = useRef(false);
  const screenSharingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const speechRecRef = useRef<any>(null);

  useEffect(() => {
    deafenedRef.current = deafened;
  }, [deafened]);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);
  useEffect(() => {
    cameraOnRef.current = cameraOn;
  }, [cameraOn]);
  useEffect(() => {
    screenSharingRef.current = screenSharing;
  }, [screenSharing]);
  useEffect(() => {
    activeVoiceChannelIdRef.current = activeVoiceChannelId;
  }, [activeVoiceChannelId]);

  const showToast = useCallback((ok: boolean, text: string) => {
    setStatusBanner({ ok, text });
    window.setTimeout(() => {
      setStatusBanner((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  }, []);

  const isDmView = activeServerId === PRIVATE_DM_SERVER_ID;

  const dmChannels = useMemo(
    () => channels.filter((c) => c.isPrivate || c.serverId === PRIVATE_DM_SERVER_ID),
    [channels]
  );

  const activeServer = useMemo(
    () => (isDmView ? null : servers.find((s) => s.id === activeServerId) || servers[0] || null),
    [servers, activeServerId, isDmView]
  );

  const serverChannels = useMemo(
    () => (isDmView ? dmChannels : channels.filter((c) => c.serverId === activeServer?.id && !c.isPrivate)),
    [channels, activeServer, isDmView, dmChannels]
  );

  const activeChannel = useMemo(
    () => channels.find((c) => c.id === activeChannelId) || serverChannels[0] || null,
    [channels, activeChannelId, serverChannels]
  );

  const activeMessages = useMemo(
    () => (activeChannel ? messagesByChannel[activeChannel.id] || [] : []),
    [messagesByChannel, activeChannel]
  );

  const pinnedMessages = useMemo(
    () => activeMessages.filter((m) => m.pinned),
    [activeMessages]
  );

  const sendWs = useCallback((payload: Record<string, any>) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }, []);

  // =========================================================================
  // WebRTC UNLIMITED MULTI-PARTY VOICE & VIDEO MESH HELPERS
  // =========================================================================
  const syncLocalTracksToPeer = useCallback(async (pc: RTCPeerConnection, peerClientId: string, sendOffer: boolean) => {
    const senders = pc.getSenders();
    const audioTrack = localAudioStreamRef.current?.getAudioTracks()[0] || null;
    const videoTrack = localVideoTrackRef.current || null;

    const audioSender = senders.find((s) => s.track?.kind === 'audio');
    if (audioTrack) {
      if (audioSender) {
        if (audioSender.track !== audioTrack) {
          await audioSender.replaceTrack(audioTrack).catch(() => {});
        }
      } else {
        pc.addTrack(audioTrack, localAudioStreamRef.current!);
      }
    }

    const videoSender = senders.find((s) => s.track?.kind === 'video');
    if (videoTrack && videoTrack.readyState === 'live') {
      if (videoSender) {
        if (videoSender.track !== videoTrack) {
          await videoSender.replaceTrack(videoTrack).catch(() => {});
        }
      } else {
        const videoOnlyStream = new MediaStream([videoTrack]);
        pc.addTrack(videoTrack, videoOnlyStream);
      }
    } else if (videoSender) {
      try {
        pc.removeTrack(videoSender);
      } catch {}
    }

    if (sendOffer) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendWs({
          type: 'voice:offer',
          targetClientId: peerClientId,
          sdp: pc.localDescription
        });
      } catch {}
    }
  }, [sendWs]);

  const renegotiateAllPeers = useCallback(async () => {
    for (const [peerClientId, pc] of peerConnectionsRef.current.entries()) {
      await syncLocalTracksToPeer(pc, peerClientId, true);
    }
  }, [syncLocalTracksToPeer]);

  const createPeerConnection = useCallback(
    (peerClientId: string) => {
      const existing = peerConnectionsRef.current.get(peerClientId);
      if (existing) return existing;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peerConnectionsRef.current.set(peerClientId, pc);

      // Attach current mic audio + active camera/screen video tracks
      const audioTrack = localAudioStreamRef.current?.getAudioTracks()[0];
      if (audioTrack && localAudioStreamRef.current) {
        pc.addTrack(audioTrack, localAudioStreamRef.current);
      }
      const videoTrack = localVideoTrackRef.current;
      if (videoTrack && videoTrack.readyState === 'live') {
        pc.addTrack(videoTrack, new MediaStream([videoTrack]));
      }

      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          sendWs({
            type: 'voice:ice',
            targetClientId: peerClientId,
            candidate: ev.candidate
          });
        }
      };

      pc.ontrack = (ev) => {
        setRemoteStreams((prev) => {
          const current = prev[peerClientId] ? new MediaStream(prev[peerClientId].getTracks()) : new MediaStream();
          const incomingTracks = ev.streams[0]?.getTracks() || [ev.track];
          for (const t of incomingTracks) {
            if (!current.getTracks().some((ex) => ex.id === t.id)) {
              current.addTrack(t);
            }
            t.onended = () => {
              setRemoteStreams((p) => {
                const st = p[peerClientId];
                if (!st) return p;
                const liveTracks = st.getTracks().filter((tr) => tr.readyState === 'live');
                return { ...p, [peerClientId]: new MediaStream(liveTracks) };
              });
            };
          }
          return { ...prev, [peerClientId]: current };
        });
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          peerConnectionsRef.current.delete(peerClientId);
          setRemoteStreams((prev) => {
            const copy = { ...prev };
            delete copy[peerClientId];
            return copy;
          });
        }
      };

      return pc;
    },
    [sendWs]
  );

  const closePeer = useCallback((peerClientId: string) => {
    const pc = peerConnectionsRef.current.get(peerClientId);
    if (pc) {
      try {
        pc.close();
      } catch {}
      peerConnectionsRef.current.delete(peerClientId);
    }
    setRemoteStreams((prev) => {
      if (!(peerClientId in prev)) return prev;
      const copy = { ...prev };
      delete copy[peerClientId];
      return copy;
    });
  }, []);

  const stopLocalVideoTrack = useCallback(() => {
    if (localVideoTrackRef.current) {
      try {
        localVideoTrackRef.current.stop();
      } catch {}
      localVideoTrackRef.current = null;
    }
    setLocalVideoStream(null);
    setCameraOn(false);
    setScreenSharing(false);
  }, []);

  const leaveVoiceCall = useCallback(() => {
    if (speakingTimerRef.current) {
      window.clearInterval(speakingTimerRef.current);
      speakingTimerRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (localAudioStreamRef.current) {
      localAudioStreamRef.current.getTracks().forEach((t) => t.stop());
      localAudioStreamRef.current = null;
    }
    stopLocalVideoTrack();
    for (const peerId of Array.from(peerConnectionsRef.current.keys())) {
      closePeer(peerId);
    }
    setRemoteStreams({});
    setActiveVoiceChannelId(null);
    setLocalSpeaking(false);
    setSpotlightId(null);
    sendWs({ type: 'voice:leave' });
  }, [closePeer, sendWs, stopLocalVideoTrack]);

  const joinVoiceChannel = useCallback(
    async (channelId: string) => {
      setActiveChannelId(channelId);
      if (activeVoiceChannelIdRef.current === channelId) return;

      if (activeVoiceChannelIdRef.current) {
        leaveVoiceCall();
      }

      // Request microphone ONLY on explicit user click to join a voice channel
      const micRes = await requestMicrophoneStream({ allowPrompt: true });
      let audioStream = micRes.stream;
      let startMuted = mutedRef.current;

      if (!audioStream) {
        startMuted = true;
        setMuted(true);
        showToast(
          false,
          micRes.status === 'denied'
            ? 'Joined listen-only (Microphone is blocked in browser site settings).'
            : 'Joined call in listen-only mode (no microphone detected).'
        );
      } else {
        localAudioStreamRef.current = audioStream;
        audioStream.getAudioTracks().forEach((t) => {
          t.enabled = !startMuted;
        });

        // Real-time local RMS speaking detector -> glowing green Discord speaking ring
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioCtx();
          audioCtxRef.current = ctx;
          const source = ctx.createMediaStreamSource(audioStream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          const data = new Uint8Array(analyser.frequencyBinCount);
          let lastState = false;
          speakingTimerRef.current = window.setInterval(() => {
            if (mutedRef.current || deafenedRef.current) {
              if (lastState) {
                lastState = false;
                setLocalSpeaking(false);
                sendWs({ type: 'voice:state', speaking: false });
              }
              return;
            }
            analyser.getByteFrequencyData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i++) sum += data[i];
            const avg = sum / data.length;
            const nowSpeaking = avg > 18;
            if (nowSpeaking !== lastState) {
              lastState = nowSpeaking;
              setLocalSpeaking(nowSpeaking);
              sendWs({ type: 'voice:state', speaking: nowSpeaking });
            }
          }, 180);
        } catch {}
      }

      setActiveVoiceChannelId(channelId);
      sendWs({
        type: 'voice:join',
        channelId,
        muted: startMuted,
        deafened: deafenedRef.current,
        cameraOn: false,
        screenSharing: false
      });
    },
    [leaveVoiceCall, sendWs, showToast]
  );

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      if (localAudioStreamRef.current) {
        localAudioStreamRef.current.getAudioTracks().forEach((t) => {
          t.enabled = !next;
        });
      }
      sendWs({ type: 'voice:state', muted: next, speaking: next ? false : undefined });
      return next;
    });
  }, [sendWs]);

  const toggleDeafen = useCallback(() => {
    setDeafened((prev) => {
      const next = !prev;
      if (next && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      sendWs({ type: 'voice:state', deafened: next });
      return next;
    });
  }, [sendWs]);

  const toggleCamera = useCallback(async () => {
    if (!activeVoiceChannelIdRef.current) {
      showToast(false, 'Join a Voice & Video channel first to turn on your camera.');
      return;
    }
    if (cameraOnRef.current) {
      stopLocalVideoTrack();
      sendWs({ type: 'voice:state', cameraOn: false, screenSharing: false });
      await renegotiateAllPeers();
      return;
    }

    const res = await requestCameraStream({ allowPrompt: true });
    if (!res.stream) {
      showToast(
        false,
        res.status === 'denied'
          ? 'Camera blocked in browser. Open the address-bar site lock icon → Allow Camera.'
          : 'No camera detected or permission dismissed.'
      );
      return;
    }
    // Replace any existing screen share track with camera track
    if (localVideoTrackRef.current) {
      try {
        localVideoTrackRef.current.stop();
      } catch {}
    }
    const track = res.stream.getVideoTracks()[0];
    if (!track) return;
    localVideoTrackRef.current = track;
    setLocalVideoStream(new MediaStream([track]));
    setCameraOn(true);
    setScreenSharing(false);
    track.onended = () => {
      stopLocalVideoTrack();
      sendWs({ type: 'voice:state', cameraOn: false, screenSharing: false });
      renegotiateAllPeers().catch(() => {});
    };
    sendWs({ type: 'voice:state', cameraOn: true, screenSharing: false });
    await renegotiateAllPeers();
  }, [renegotiateAllPeers, sendWs, showToast, stopLocalVideoTrack]);

  const toggleScreenShare = useCallback(async () => {
    if (!activeVoiceChannelIdRef.current) {
      showToast(false, 'Join a Voice & Video channel first to share your screen.');
      return;
    }
    if (screenSharingRef.current) {
      stopLocalVideoTrack();
      sendWs({ type: 'voice:state', cameraOn: false, screenSharing: false });
      await renegotiateAllPeers();
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      showToast(false, 'Screen sharing is not supported in this browser.');
      return;
    }
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 24, max: 30 } },
        audio: false
      });
      const track = displayStream.getVideoTracks()[0];
      if (!track) return;
      if (localVideoTrackRef.current) {
        try {
          localVideoTrackRef.current.stop();
        } catch {}
      }
      localVideoTrackRef.current = track;
      setLocalVideoStream(new MediaStream([track]));
      setScreenSharing(true);
      setCameraOn(false);
      track.onended = () => {
        stopLocalVideoTrack();
        sendWs({ type: 'voice:state', cameraOn: false, screenSharing: false });
        renegotiateAllPeers().catch(() => {});
      };
      sendWs({ type: 'voice:state', cameraOn: false, screenSharing: true });
      await renegotiateAllPeers();
    } catch {
      showToast(false, 'Screen share was cancelled.');
    }
  }, [renegotiateAllPeers, sendWs, showToast, stopLocalVideoTrack]);

  // Speak agent voice responses aloud in browser (respecting Deafen toggle, zero truncation!)
  const speakAgentText = useCallback((text: string, pitch = 1, rate = 1) => {
    if (deafenedRef.current) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      sovereignVoiceQueue.enqueue({
        id: `lora-voice-${Date.now()}`,
        text,
        personaId: 'Zephyr',
        pitch: Math.max(0.6, Math.min(1.5, pitch)),
        rate: Math.max(0.8, Math.min(1.3, rate))
      });
    } catch {}
  }, []);

  // =========================================================================
  // REAL-TIME WEBSOCKET + BOOTSTRAP CONNECTION
  // =========================================================================
  const applyBootstrap = useCallback((payload: any) => {
    if (Array.isArray(payload.servers)) setServers(payload.servers);
    if (Array.isArray(payload.channels)) setChannels(payload.channels);
    if (Array.isArray(payload.agents)) setAgents(payload.agents);
    if (Array.isArray(payload.members)) setMembers(payload.members);
    if (Array.isArray(payload.voiceParticipants)) setVoiceParticipants(payload.voiceParticipants);
    if (typeof payload.socialPulseEnabled === 'boolean') setSocialPulseEnabled(payload.socialPulseEnabled);
    if (typeof payload.localMeshId === 'string') setLocalMeshId(payload.localMeshId);
    if (Array.isArray(payload.federatedPeers)) setFederatedPeers(payload.federatedPeers);
    if (payload.autonomousStats && typeof payload.autonomousStats === 'object') {
      setAutonomousStats(payload.autonomousStats);
    }
    if (payload.messagesByChannel && typeof payload.messagesByChannel === 'object') {
      setMessagesByChannel(payload.messagesByChannel);
    }
    if (typeof payload.selfClientId === 'string') {
      setSelfClientId(payload.selfClientId);
      selfClientIdRef.current = payload.selfClientId;
    }
  }, []);

  useEffect(() => {
    let closed = false;
    let reconnectTimer: number | null = null;

    // Immediate REST bootstrap so UI populates instantaneously
    meshFetch('/api/lora-mesh/bootstrap')
      .then((data) => {
        if (!closed) applyBootstrap(data);
      })
      .catch(() => {});

    const connectWs = () => {
      if (closed) return;
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const callsign = encodeURIComponent(
        currentUser?.preferredName || currentUser?.displayName || 'Sovereign Operator'
      );
      const bearerToken = getAuthBearerToken();
      const wsUrl = `${proto}//${window.location.host}/ws/lora-mesh?callsign=${callsign}${
        bearerToken ? `&token=${encodeURIComponent(bearerToken)}` : ''
      }`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsStatus('connected');
      };

      ws.onmessage = async (ev) => {
        try {
          const frame = JSON.parse(ev.data);
          const { event, payload } = frame || {};
          if (!event) return;

          if (event === 'mesh:init') {
            applyBootstrap(payload);
            return;
          }
          if (event === 'presence:update' && Array.isArray(payload?.members)) {
            setMembers(payload.members);
            return;
          }
          if (event === 'voice:participants' && Array.isArray(payload?.participants)) {
            setVoiceParticipants(payload.participants);
            return;
          }
          if (event === 'social:pulse_status') {
            setSocialPulseEnabled(Boolean(payload?.enabled));
            if (payload?.autonomousStats) setAutonomousStats(payload.autonomousStats);
            return;
          }
          if (event === 'autonomy:status' && payload) {
            setAutonomousStats(payload);
            return;
          }
          if (event === 'federation:updated' && Array.isArray(payload?.peers)) {
            setFederatedPeers(payload.peers);
            return;
          }
          if (event === 'call:ring' && payload?.channelId) {
            setIncomingCall(payload);
            return;
          }
          if (event === 'user:preferred_name' && payload?.preferredName) {
            window.dispatchEvent(
              new CustomEvent('sovereign_preferred_name_updated', {
                detail: { userId: payload.userId, preferredName: payload.preferredName }
              })
            );
            return;
          }
          if (event === 'server:created' && payload?.server) {
            setServers((prev) =>
              prev.some((s) => s.id === payload.server.id) ? prev : [...prev, payload.server]
            );
            setChannels((prev) => {
              const next = [...prev];
              for (const ch of [payload.defaultChannel, payload.voiceChannel].filter(Boolean)) {
                if (!next.some((c) => c.id === ch.id)) next.push(ch);
              }
              return next;
            });
            return;
          }
          if (event === 'server:updated' && payload?.server) {
            setServers((prev) => prev.map((s) => (s.id === payload.server.id ? payload.server : s)));
            return;
          }
          if (event === 'channel:created' && payload?.channel) {
            setChannels((prev) =>
              prev.some((c) => c.id === payload.channel.id) ? prev : [...prev, payload.channel]
            );
            return;
          }
          if (event === 'channel:updated' && payload?.channel) {
            setChannels((prev) => prev.map((c) => (c.id === payload.channel.id ? payload.channel : c)));
            return;
          }
          if (event === 'message:created' && payload?.message) {
            const msg: LoRaMeshMessage = payload.message;
            setMessagesByChannel((prev) => {
              const list = prev[msg.channelId] || [];
              if (list.some((m) => m.id === msg.id)) return prev;
              return { ...prev, [msg.channelId]: [...list, msg] };
            });
            return;
          }
          if (event === 'message:updated' && payload?.message) {
            const msg: LoRaMeshMessage = payload.message;
            setMessagesByChannel((prev) => {
              const list = prev[msg.channelId] || [];
              return { ...prev, [msg.channelId]: list.map((m) => (m.id === msg.id ? msg : m)) };
            });
            return;
          }
          if (event === 'message:deleted' && payload?.messageId && payload?.channelId) {
            setMessagesByChannel((prev) => {
              const list = prev[payload.channelId] || [];
              return { ...prev, [payload.channelId]: list.filter((m) => m.id !== payload.messageId) };
            });
            return;
          }
          if (event === 'typing:update' && payload?.channelId) {
            setTypingList((prev) => [
              ...prev.filter((t) => !(t.channelId === payload.channelId && t.userId === payload.userId)),
              payload
            ]);
            return;
          }
          if (event === 'typing:clear' && payload?.channelId) {
            setTypingList((prev) =>
              prev.filter((t) => !(t.channelId === payload.channelId && t.userId === payload.userId))
            );
            return;
          }
          if (event === 'voice:agent_speak' && payload?.channelId === activeVoiceChannelIdRef.current) {
            speakAgentText(String(payload.text || ''), Number(payload.voicePitch || 1), Number(payload.voiceRate || 1));
            return;
          }

          // === WEBRTC UNLIMITED MULTI-PARTY SIGNALING ===
          if (event === 'voice:peers' && Array.isArray(payload?.peers)) {
            if (payload.selfClientId) {
              setSelfClientId(payload.selfClientId);
              selfClientIdRef.current = payload.selfClientId;
            }
            // Newly joined peer initiates WebRTC offers to EVERY existing peer in the room (unlimited mesh)
            for (const peer of payload.peers) {
              const pc = createPeerConnection(peer.clientId);
              await syncLocalTracksToPeer(pc, peer.clientId, true);
            }
            return;
          }
          if (event === 'voice:peer_left' && payload?.clientId) {
            closePeer(payload.clientId);
            return;
          }
          if (event === 'voice:offer' && payload?.fromClientId && payload?.sdp) {
            if (payload.channelId && payload.channelId !== activeVoiceChannelIdRef.current) return;
            const pc = createPeerConnection(payload.fromClientId);
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendWs({
              type: 'voice:answer',
              targetClientId: payload.fromClientId,
              sdp: pc.localDescription
            });
            return;
          }
          if (event === 'voice:answer' && payload?.fromClientId && payload?.sdp) {
            const pc = peerConnectionsRef.current.get(payload.fromClientId);
            if (pc) {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp)).catch(() => {});
            }
            return;
          }
          if (event === 'voice:ice' && payload?.fromClientId && payload?.candidate) {
            const pc = peerConnectionsRef.current.get(payload.fromClientId);
            if (pc) {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(() => {});
            }
          }
        } catch {}
      };

      ws.onclose = () => {
        if (closed) return;
        setWsStatus('reconnecting');
        reconnectTimer = window.setTimeout(connectWs, 2500);
      };
    };

    connectWs();

    const typingCleanup = window.setInterval(() => {
      const now = Date.now();
      setTypingList((prev) => prev.filter((t) => t.expiresAt > now));
    }, 2000);

    return () => {
      closed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      window.clearInterval(typingCleanup);
      leaveVoiceCall();
      try {
        wsRef.current?.close();
      } catch {}
    };
  }, [applyBootstrap, closePeer, createPeerConnection, currentUser?.displayName, leaveVoiceCall, sendWs, speakAgentText, syncLocalTracksToPeer]);

  // Auto-scroll chat feed
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length, activeChannelId]);

  // Notify server of active text channel
  useEffect(() => {
    if (activeChannelId) {
      sendWs({ type: 'channel:join', channelId: activeChannelId });
    }
  }, [activeChannelId, sendWs]);

  // =========================================================================
  // MESSAGE & SOCIAL ACTIONS
  // =========================================================================
  const handleUploadFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setUploadingFiles(true);
    try {
      const uploaded: LoRaMeshAttachment[] = [];
      for (const file of files.slice(0, 10)) {
        const resp = await fetch('/api/lora-mesh/upload', {
          method: 'POST',
          credentials: 'include',
          headers: buildAuthHeaders({
            'X-Sovereign-Request': '1',
            'X-File-Name': encodeURIComponent(file.name || 'shared-file'),
            'X-File-Mime': file.type || 'application/octet-stream',
            'Content-Type': file.type || 'application/octet-stream'
          }),
          body: file
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok || !data?.attachment) {
          throw new Error(data?.error || `Failed to upload ${file.name}`);
        }
        uploaded.push(data.attachment);
      }
      if (uploaded.length > 0) {
        setPendingAttachments((prev) => [...prev, ...uploaded].slice(0, 12));
        showToast(true, `Attached ${uploaded.length} file${uploaded.length > 1 ? 's' : ''} ready to transmit.`);
      }
    } catch (err: any) {
      showToast(false, err?.message || 'File upload failed');
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleSendMessage = async (customText?: string, targetChannelId?: string, transportOverride?: 'mesh-ws' | 'usb-serial' | 'voice-webrtc') => {
    const chId = targetChannelId || activeChannel?.id;
    const text = (customText ?? draft).trim();
    const attachmentsToSend = customText === undefined ? pendingAttachments : [];
    if (!chId || (!text && attachmentsToSend.length === 0)) return;
    if (customText === undefined) {
      setDraft('');
      setPendingAttachments([]);
    }
    const rId = replyTo?.id;
    setReplyTo(null);

    try {
      // Optional physical USB LoRa radio packet mirror
      if (usbWriterRef.current && text) {
        try {
          const enc = new TextEncoder();
          await usbWriterRef.current.write(enc.encode(`[SOS-MESH #${activeChannel?.name || 'ch'}] ${text}\n`));
        } catch {}
      }

      await meshFetch('/api/lora-mesh/messages', {
        method: 'POST',
        body: JSON.stringify({
          channelId: chId,
          content: text,
          attachments: attachmentsToSend,
          replyToId: rId,
          anonymous: anonymousMode,
          transport: transportOverride || (usbConnected ? 'usb-serial' : 'mesh-ws'),
          fallbackCallsign: currentUser?.preferredName || currentUser?.displayName || 'Sovereign Operator'
        })
      });
    } catch (err: any) {
      showToast(false, err?.message || 'Failed to transmit message');
    }
  };

  const handleToggleSocialPulse = async () => {
    try {
      const res = await meshFetch<{ enabled: boolean }>('/api/lora-mesh/agents/social-pulse', {
        method: 'POST',
        body: JSON.stringify({ enabled: !socialPulseEnabled })
      });
      setSocialPulseEnabled(res.enabled);
      showToast(
        true,
        res.enabled
          ? 'Autonomous Agent Agency LIVE — all 10 agents post freely across channels on their own initiative.'
          : 'Autonomous background posting paused.'
      );
    } catch (err: any) {
      showToast(false, err?.message || 'Failed to update Autonomous Agency');
    }
  };

  const handleAddFederatedPeer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!peerNameDraft.trim() || !peerEndpointDraft.trim()) return;
    setBusyAction('add-peer');
    try {
      const res = await meshFetch<{ peer: LoRaFederatedPeer }>('/api/lora-mesh/federation/peers', {
        method: 'POST',
        body: JSON.stringify({
          name: peerNameDraft.trim(),
          endpointUrl: peerEndpointDraft.trim(),
          sharedSecret: peerSecretDraft.trim() || undefined,
          channelMap: peerChannelDraft.trim() || 'ch_agent_comms'
        })
      });
      setFederatedPeers((prev) => [...prev.filter((p) => p.id !== res.peer.id), res.peer]);
      setPeerNameDraft('');
      setPeerEndpointDraft('');
      setPeerSecretDraft('');
      showToast(true, `Linked federated SoS Mesh peer "${res.peer.name}" for cross-network relay.`);
    } catch (err: any) {
      showToast(false, err?.message || 'Failed to add peer mesh');
    } finally {
      setBusyAction(null);
    }
  };

  const handleRemoveFederatedPeer = async (peerId: string) => {
    try {
      await meshFetch(`/api/lora-mesh/federation/peers/${encodeURIComponent(peerId)}`, {
        method: 'DELETE'
      });
      setFederatedPeers((prev) => prev.filter((p) => p.id !== peerId));
      showToast(true, 'Removed federated peer mesh.');
    } catch (err: any) {
      showToast(false, err?.message || 'Failed to remove peer mesh');
    }
  };

  const handleStartPrivateCall = async (channelId: string, mode: 'audio' | 'video' = 'audio') => {
    setActiveServerId(PRIVATE_DM_SERVER_ID);
    setActiveChannelId(channelId);
    setIncomingCall((cur) => (cur?.channelId === channelId ? null : cur));
    try {
      await meshFetch(`/api/lora-mesh/dms/${encodeURIComponent(channelId)}/call`, {
        method: 'POST',
        body: JSON.stringify({ mode })
      }).catch(() => {});
      await joinVoiceChannel(channelId);
      if (mode === 'video' && !cameraOnRef.current) {
        await toggleCamera();
      }
      showToast(true, `Private ${mode === 'video' ? 'video' : 'voice'} call connected.`);
    } catch (err: any) {
      showToast(false, err?.message || 'Could not start private call');
    }
  };

  const handleOpenOrCreateDirectThread = async (
    participantIds: string[],
    customName?: string,
    callMode?: 'audio' | 'video'
  ) => {
    if (participantIds.length === 0) return;
    setBusyAction('create-dm');
    try {
      const res = await meshFetch<{ channel: LoRaMeshChannel }>('/api/lora-mesh/dms', {
        method: 'POST',
        body: JSON.stringify({
          participantIds,
          name: customName?.trim() || undefined
        })
      });
      const ch = res.channel;
      setChannels((prev) => (prev.some((c) => c.id === ch.id) ? prev.map((c) => (c.id === ch.id ? ch : c)) : [...prev, ch]));
      setActiveServerId(PRIVATE_DM_SERVER_ID);
      setActiveChannelId(ch.id);
      setShowNewDmModal(false);
      setDmSelectedIds([]);
      setDmGroupName('');
      if (callMode) {
        await handleStartPrivateCall(ch.id, callMode);
      } else {
        showToast(true, `Opened private ${ch.kind === 'group-dm' ? 'group chat' : 'DM'}: ${ch.name}`);
      }
    } catch (err: any) {
      showToast(false, err?.message || 'Could not open private chat');
    } finally {
      setBusyAction(null);
    }
  };

  const handleAddMembersToActiveDm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChannel?.isPrivate || dmSelectedIds.length === 0) return;
    setBusyAction('add-dm-members');
    try {
      const res = await meshFetch<{ channel: LoRaMeshChannel }>(
        `/api/lora-mesh/dms/${encodeURIComponent(activeChannel.id)}/members`,
        {
          method: 'POST',
          body: JSON.stringify({ participantIds: dmSelectedIds })
        }
      );
      setChannels((prev) => prev.map((c) => (c.id === res.channel.id ? res.channel : c)));
      setShowAddDmMembersModal(false);
      setDmSelectedIds([]);
      showToast(true, `Added members to ${res.channel.name}.`);
    } catch (err: any) {
      showToast(false, err?.message || 'Could not add members');
    } finally {
      setBusyAction(null);
    }
  };

  const handleSummonAgent = async (agentId: string) => {
    if (!activeChannel) return;
    setBusyAction(`summon:${agentId}`);
    try {
      await meshFetch('/api/lora-mesh/agents/summon', {
        method: 'POST',
        body: JSON.stringify({ channelId: activeChannel.id, agentId })
      });
    } catch (err: any) {
      showToast(false, err?.message || 'Agent summon failed');
    } finally {
      setBusyAction(null);
    }
  };

  const handleToggleAgentVoice = async (agentId: string, channelId?: string) => {
    const targetVoiceId = channelId || activeVoiceChannelId || (activeChannel?.kind === 'voice' ? activeChannel.id : null);
    if (!targetVoiceId) {
      showToast(false, 'Open or join a Voice & Video channel first to invite an agent into the call.');
      return;
    }
    try {
      await meshFetch(`/api/lora-mesh/voice/${encodeURIComponent(targetVoiceId)}/agent`, {
        method: 'POST',
        body: JSON.stringify({ agentId })
      });
    } catch (err: any) {
      showToast(false, err?.message || 'Could not update agent voice presence');
    }
  };

  const handleRunHuddle = async () => {
    if (!activeChannel) return;
    setBusyAction('huddle');
    setShowHuddleModal(false);
    try {
      await meshFetch('/api/lora-mesh/agents/huddle', {
        method: 'POST',
        body: JSON.stringify({
          channelId: activeChannel.id,
          topic: huddleTopic.trim() || 'Cross-OS mesh architecture, live security & opportunities',
          agentIds: huddleAgentIds
        })
      });
      setHuddleTopic('');
    } catch (err: any) {
      showToast(false, err?.message || 'Agent huddle failed');
    } finally {
      setBusyAction(null);
    }
  };

  const handleReact = async (messageId: string, emoji: string) => {
    try {
      await meshFetch(`/api/lora-mesh/messages/${encodeURIComponent(messageId)}/react`, {
        method: 'POST',
        body: JSON.stringify({ emoji })
      });
    } catch {}
  };

  const handlePin = async (messageId: string) => {
    try {
      await meshFetch(`/api/lora-mesh/messages/${encodeURIComponent(messageId)}/pin`, { method: 'POST' });
    } catch {}
  };

  const handleDelete = async (messageId: string) => {
    try {
      await meshFetch(`/api/lora-mesh/messages/${encodeURIComponent(messageId)}`, { method: 'DELETE' });
    } catch (err: any) {
      showToast(false, err?.message || 'Delete failed');
    }
  };

  const handleToggleAutoReply = async () => {
    if (!activeChannel) return;
    try {
      await meshFetch(`/api/lora-mesh/channels/${encodeURIComponent(activeChannel.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ agentAutoReply: !activeChannel.agentAutoReply })
      });
    } catch {}
  };

  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await meshFetch<{ server: LoRaMeshServer; defaultChannel: LoRaMeshChannel }>('/api/lora-mesh/servers', {
        method: 'POST',
        body: JSON.stringify({
          name: newServerName,
          region: newServerRegion,
          modemPreset: newServerModem
        })
      });
      setActiveServerId(res.server.id);
      setActiveChannelId(res.defaultChannel.id);
      setNewServerName('');
      setShowCreateServerModal(false);
    } catch (err: any) {
      showToast(false, err?.message || 'Failed to create mesh server');
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeServer) return;
    try {
      const res = await meshFetch<{ channel: LoRaMeshChannel }>('/api/lora-mesh/channels', {
        method: 'POST',
        body: JSON.stringify({
          serverId: activeServer.id,
          name: newChannelName,
          kind: newChannelKind,
          topic: newChannelTopic,
          agentAutoReply: newChannelKind !== 'text'
        })
      });
      setActiveChannelId(res.channel.id);
      setNewChannelName('');
      setNewChannelTopic('');
      setShowCreateChannelModal(false);
    } catch (err: any) {
      showToast(false, err?.message || 'Failed to create channel');
    }
  };

  const handleSaveRadio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeServer) return;
    try {
      await meshFetch(`/api/lora-mesh/servers/${encodeURIComponent(activeServer.id)}/radio`, {
        method: 'PATCH',
        body: JSON.stringify({
          region: radioRegion,
          modemPreset: radioModem,
          hopLimit: radioHopLimit,
          pskLabel: radioPsk
        })
      });
      setShowRadioModal(false);
      showToast(true, `Updated LoRa RF profile (${radioRegion} · ${radioModem}).`);
    } catch (err: any) {
      showToast(false, err?.message || 'Failed to update RF profile');
    }
  };

  const handleConnectUsbLoRa = async () => {
    const nav = navigator as any;
    if (!nav.serial) {
      showToast(false, 'Web Serial USB LoRa bridge requires Chrome or Edge over HTTPS/localhost.');
      return;
    }
    if (usbConnected) {
      try {
        usbWriterRef.current?.releaseLock();
        await usbPortRef.current?.close();
      } catch {}
      usbPortRef.current = null;
      usbWriterRef.current = null;
      setUsbConnected(false);
      showToast(true, 'Disconnected USB LoRa radio.');
      return;
    }
    try {
      const port = await nav.serial.requestPort();
      await port.open({ baudRate: 115200 });
      usbPortRef.current = port;
      usbWriterRef.current = port.writable?.getWriter() || null;
      setUsbConnected(true);
      showToast(true, 'USB LoRa Transceiver bridged at 115200 baud!');
    } catch {
      showToast(false, 'USB LoRa pairing cancelled.');
    }
  };

  const handleVoicePushToTalk = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      showToast(false, 'Browser speech recognition unavailable here — use the voice text bar below to talk to agents.');
      return;
    }
    if (voiceListening && speechRecRef.current) {
      speechRecRef.current.stop();
      setVoiceListening(false);
      return;
    }
    const rec = new SpeechRec();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.onresult = (ev: any) => {
      const spoken = ev?.results?.[0]?.[0]?.transcript?.trim();
      if (spoken && activeChannel) {
        handleSendMessage(spoken, activeChannel.id, 'voice-webrtc');
      }
      setVoiceListening(false);
    };
    rec.onerror = () => setVoiceListening(false);
    rec.onend = () => setVoiceListening(false);
    speechRecRef.current = rec;
    setVoiceListening(true);
    rec.start();
  };

  // Channel categories in sidebar
  const groupedChannels = useMemo(() => {
    const order: LoRaMeshChannel['category'][] = [
      'SOCIAL FEED',
      'TEXT CHANNELS',
      'AGENT COUNCIL',
      'VOICE CHANNELS',
      'RF TELEMETRY'
    ];
    return order
      .map((cat) => ({
        category: cat,
        items: serverChannels.filter((c) => c.category === cat)
      }))
      .filter((g) => g.items.length > 0);
  }, [serverChannels]);

  const currentVoiceRoomParticipants = useMemo(() => {
    if (!activeChannel || activeChannel.kind !== 'voice') return [];
    return voiceParticipants.filter((p) => p.channelId === activeChannel.id);
  }, [voiceParticipants, activeChannel]);

  const activeVoiceChannelObj = useMemo(
    () => channels.find((c) => c.id === activeVoiceChannelId) || null,
    [channels, activeVoiceChannelId]
  );

  const onlineHumans = useMemo(() => members.filter((m) => !m.isAgent && m.online), [members]);
  const offlineHumans = useMemo(() => members.filter((m) => !m.isAgent && !m.online), [members]);
  const channelTypers = useMemo(
    () => typingList.filter((t) => t.channelId === activeChannel?.id),
    [typingList, activeChannel?.id]
  );

  // Responsive grid sizing for UNLIMITED multi-party Discord video/voice stage
  const stageGridClass = useMemo(() => {
    const count = Math.max(1, currentVoiceRoomParticipants.length);
    if (count === 1) return 'grid-cols-1 max-w-2xl mx-auto';
    if (count === 2) return 'grid-cols-1 md:grid-cols-2';
    if (count <= 4) return 'grid-cols-1 sm:grid-cols-2';
    if (count <= 9) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
  }, [currentVoiceRoomParticipants.length]);

  const renderParticipantTile = (p: LoRaVoiceParticipant, compact = false) => {
    const isSelf = p.clientId === selfClientId;
    const stream = isSelf ? localVideoStream : remoteStreams[p.clientId] || null;
    const hasLiveVideo =
      isSelf
        ? Boolean((cameraOn || screenSharing) && localVideoStream)
        : Boolean(stream && stream.getVideoTracks().some((t) => t.readyState === 'live'));
    const isSpeakingNow = isSelf ? localSpeaking : p.speaking;
    const isPinned = spotlightId === p.clientId;

    return (
      <div
        key={p.clientId}
        onClick={() => setSpotlightId((prev) => (prev === p.clientId ? null : p.clientId))}
        className={`relative rounded-xl overflow-hidden border transition-all cursor-pointer group flex flex-col items-center justify-center bg-[#18191c] ${
          compact ? 'h-28 min-w-[168px]' : 'min-h-[190px] aspect-video'
        } ${
          isSpeakingNow
            ? 'border-emerald-400 ring-2 ring-emerald-400/50 shadow-[0_0_24px_rgba(16,185,129,0.22)]'
            : 'border-zinc-800 hover:border-zinc-600'
        }`}
      >
        {hasLiveVideo && stream ? (
          <MediaVideoElement
            stream={stream}
            muted={isSelf || deafened}
            mirror={isSelf && cameraOn && !screenSharing}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 p-4">
            <div
              className={`rounded-full flex items-center justify-center font-bold border-2 transition-transform ${
                compact ? 'w-10 h-10 text-sm' : 'w-16 h-16 text-xl'
              } ${
                p.isAgent
                  ? 'bg-gradient-to-br from-cyan-500/25 via-indigo-500/20 to-amber-500/25 border-cyan-400/50 text-cyan-200'
                  : 'bg-gradient-to-br from-emerald-500/20 to-sky-500/20 border-emerald-400/40 text-emerald-200'
              } ${isSpeakingNow ? 'scale-105' : ''}`}
            >
              {p.isAgent ? <Bot className={compact ? 'w-5 h-5' : 'w-7 h-7'} /> : p.displayName.slice(0, 2).toUpperCase()}
            </div>
            {!compact && (
              <div className="text-center">
                <div className="text-xs font-semibold text-zinc-100 flex items-center justify-center gap-1.5">
                  <span>{p.displayName}</span>
                  {p.isAgent && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                      AGENT
                    </span>
                  )}
                </div>
                <div className="text-[10px] font-mono text-zinc-500">{p.nodeId}</div>
              </div>
            )}
          </div>
        )}

        {/* Top-left live badges */}
        <div className="absolute top-2 left-2 flex items-center gap-1">
          {p.screenSharing && (
            <span className="px-1.5 py-0.5 rounded bg-rose-600/90 text-[9px] font-bold uppercase tracking-wider text-white">
              LIVE SCREEN
            </span>
          )}
          {p.cameraOn && !p.screenSharing && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-600/80 text-[9px] font-bold uppercase tracking-wider text-white">
              CAM
            </span>
          )}
          {isSelf && (
            <span className="px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-mono text-zinc-300">YOU</span>
          )}
        </div>

        {/* Top-right Spotlight & Remove Agent controls */}
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="p-1 rounded bg-black/65 text-zinc-200" title={isPinned ? 'Exit Spotlight' : 'Spotlight Tile'}>
            {isPinned ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </span>
          {p.isAgent && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleAgentVoice(p.userId, p.channelId);
              }}
              className="p-1 rounded bg-rose-600/80 hover:bg-rose-500 text-white cursor-pointer"
              title="Remove agent from call"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Bottom-left Nameplate + Mic/Deafen status */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2 pointer-events-none">
          <div className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[11px] font-medium text-zinc-100 truncate flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isSpeakingNow ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
              }`}
            />
            <span className="truncate">{p.displayName}</span>
          </div>
          <div className="flex items-center gap-1">
            {p.muted && (
              <span className="p-1 rounded-full bg-rose-600/85 text-white">
                <MicOff className="w-3 h-3" />
              </span>
            )}
            {p.deafened && (
              <span className="p-1 rounded-full bg-rose-600/85 text-white">
                <HeadphoneOff className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full w-full bg-[#1e1f22] text-zinc-100 overflow-hidden select-none">
      {/* Hidden audio renderers for remote WebRTC peers */}
      {Object.entries(remoteStreams).map(([peerId, stream]) => (
        <RemoteAudioPlayer key={peerId} stream={stream} deafened={deafened} />
      ))}

      {/* 1. FAR-LEFT DISCORD MESH SERVER RAIL */}
      <aside className="w-[66px] bg-[#141518] border-r border-zinc-800/80 flex flex-col items-center py-3 gap-2.5 shrink-0 overflow-y-auto">
        <div
          className="w-11 h-11 rounded-2xl bg-zinc-900 border border-cyan-500/35 flex items-center justify-center shadow-lg"
          title="SoS Mesh — Sovereign OS LoRa Social & Voice/Video Network"
        >
          <SoSMeshIcon className="w-8 h-8" />
        </div>

        {/* Private DMs & Group Chats Home Button (Discord-style) */}
        <div className="relative flex items-center justify-center w-full group">
          <span
            className={`absolute left-0 w-1 rounded-r-full bg-white transition-all ${
              isDmView ? 'h-8' : 'h-0 group-hover:h-4'
            }`}
          />
          <button
            type="button"
            onClick={() => {
              setActiveServerId(PRIVATE_DM_SERVER_ID);
              if (dmChannels[0]) setActiveChannelId(dmChannels[0].id);
            }}
            title={`Private Direct Messages & Group Chats (${dmChannels.length})`}
            className={`relative w-11 h-11 flex items-center justify-center transition-all cursor-pointer ${
              isDmView
                ? 'rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-lg ring-2 ring-white/30'
                : 'rounded-full hover:rounded-2xl bg-zinc-800/90 hover:bg-indigo-600 text-zinc-200 hover:text-white'
            }`}
          >
            <Mail className="w-5 h-5" />
            {(dmChannels.length > 0 || incomingCall) && (
              <span
                className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center border-2 border-[#141518] ${
                  incomingCall ? 'bg-emerald-500 text-zinc-950 animate-bounce' : 'bg-indigo-500 text-white'
                }`}
              >
                {incomingCall ? '!' : dmChannels.length}
              </span>
            )}
          </button>
        </div>

        <div className="w-8 h-px bg-zinc-800 my-0.5" />

        {servers.map((srv) => {
          const isActive = srv.id === activeServer?.id;
          return (
            <div key={srv.id} className="relative flex items-center justify-center w-full group">
              <span
                className={`absolute left-0 w-1 rounded-r-full bg-white transition-all ${
                  isActive ? 'h-8' : 'h-0 group-hover:h-4'
                }`}
              />
              <button
                type="button"
                onClick={() => {
                  setActiveServerId(srv.id);
                  const first = channels.find((c) => c.serverId === srv.id);
                  if (first) setActiveChannelId(first.id);
                }}
                title={`${srv.name} (${srv.radio.frequencyMhz} MHz · ${srv.radio.modemPreset})`}
                className={`w-11 h-11 flex items-center justify-center font-bold text-xs text-white transition-all cursor-pointer bg-gradient-to-br ${srv.accent} ${
                  isActive ? 'rounded-2xl shadow-lg ring-2 ring-white/30' : 'rounded-full hover:rounded-2xl opacity-80 hover:opacity-100'
                }`}
              >
                {srv.shortCode}
              </button>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => setShowCreateServerModal(true)}
          title="Create New LoRa Mesh Server"
          className="w-11 h-11 rounded-full hover:rounded-2xl bg-zinc-800/90 hover:bg-emerald-600 text-emerald-400 hover:text-white flex items-center justify-center transition-all cursor-pointer mt-1"
        >
          <Plus className="w-5 h-5" />
        </button>
      </aside>

      {/* 2. CHANNEL SIDEBAR + VOICE CONNECTED BAR + USER FOOTER */}
      <aside className="w-64 bg-[#23252a] border-r border-zinc-800/80 flex flex-col shrink-0">
        {/* Server / Private DM Header */}
        <div className="px-3.5 py-3 border-b border-zinc-800/90 bg-[#1e2024]">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-zinc-100 truncate">
                {isDmView ? 'Direct Messages' : activeServer?.name || 'SoS Mesh'}
              </h2>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-300 mt-0.5">
                {isDmView ? (
                  <>
                    <Lock className="w-3 h-3 shrink-0 text-emerald-400" />
                    <span>Private DMs, Groups &amp; Calls</span>
                  </>
                ) : (
                  <>
                    <Radio className="w-3 h-3 shrink-0" />
                    <span>
                      {activeServer?.radio.frequencyMhz ?? 906.875} MHz · {activeServer?.radio.modemPreset ?? 'LongFast'}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {isDmView ? (
                <button
                  type="button"
                  onClick={() => {
                    setDmSelectedIds([]);
                    setDmGroupName('');
                    setShowNewDmModal(true);
                  }}
                  title="New Private DM or Group Chat"
                  className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (activeServer) {
                        setRadioRegion(activeServer.radio.region);
                        setRadioModem(activeServer.radio.modemPreset);
                        setRadioHopLimit(activeServer.radio.hopLimit);
                        setRadioPsk(activeServer.radio.pskLabel);
                      }
                      setShowRadioModal(true);
                    }}
                    title="Configure LoRa Radio & Frequency"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleConnectUsbLoRa}
                    title={usbConnected ? 'USB LoRa Radio Connected (Click to Disconnect)' : 'Bridge USB LoRa Hardware (Web Serial)'}
                    className={`p-1.5 rounded-lg cursor-pointer ${
                      usbConnected
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                    }`}
                  >
                    <Usb className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400">
            <span className="flex items-center gap-1">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  wsStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                }`}
              />
              {wsStatus === 'connected' ? 'SoS Mesh Live' : 'Syncing Mesh...'}
            </span>
            <span className="font-mono text-zinc-500">
              {isDmView ? 'E2E Private Scoped' : `AES-256 · Hop ${activeServer?.radio.hopLimit ?? 3}`}
            </span>
          </div>
        </div>

        {/* Channel Tree OR Private DM / Group DM List */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {isDmView ? (
            <div className="space-y-1.5">
              <div className="px-2 flex items-center justify-between text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
                <span>Private Chats ({dmChannels.length})</span>
                <button
                  type="button"
                  onClick={() => {
                    setDmSelectedIds([]);
                    setDmGroupName('');
                    setShowNewDmModal(true);
                  }}
                  className="text-indigo-300 hover:text-white cursor-pointer"
                  title="Start New 1-on-1 DM or Private Group"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              {dmChannels.length === 0 ? (
                <div className="px-2.5 py-6 text-center space-y-2 rounded-xl bg-zinc-900/50 border border-zinc-800/70">
                  <div className="text-xs text-zinc-400">No private chats yet.</div>
                  <button
                    type="button"
                    onClick={() => {
                      setDmSelectedIds([]);
                      setDmGroupName('');
                      setShowNewDmModal(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
                  >
                    Start Private DM / Group
                  </button>
                </div>
              ) : (
                dmChannels.map((ch) => {
                  const isSelected = ch.id === activeChannel?.id;
                  const inCall = voiceParticipants.filter((v) => v.channelId === ch.id);
                  const memberCount = ch.participantIds?.length || 2;
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setActiveChannelId(ch.id)}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-500/20 border border-indigo-400/40 text-white'
                          : 'text-zinc-300 hover:text-white hover:bg-zinc-800/70 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/30 to-cyan-500/30 border border-indigo-400/40 flex items-center justify-center text-[11px] font-bold text-indigo-100 shrink-0">
                          {ch.kind === 'group-dm' ? (
                            <Users className="w-4 h-4" />
                          ) : (
                            ch.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{ch.name}</div>
                          <div className="text-[10px] text-zinc-400 truncate">
                            {ch.kind === 'group-dm' ? `${memberCount} members · Group` : 'Private 1-on-1 DM'}
                          </div>
                        </div>
                      </div>
                      {inCall.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-[9px] font-mono text-emerald-300 flex items-center gap-1 shrink-0">
                          <PhoneCall className="w-2.5 h-2.5 animate-pulse" />
                          {inCall.length}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            groupedChannels.map((group) => (
            <div key={group.category} className="space-y-1">
              <div className="px-2 flex items-center justify-between text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
                <span>{group.category}</span>
                <button
                  type="button"
                  onClick={() => {
                    setNewChannelKind(
                      group.category === 'VOICE CHANNELS'
                        ? 'voice'
                        : group.category === 'SOCIAL FEED'
                        ? 'social'
                        : 'text'
                    );
                    setShowCreateChannelModal(true);
                  }}
                  className="text-zinc-500 hover:text-zinc-200 cursor-pointer"
                  title="Create Channel"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {group.items.map((ch) => {
                const isSelected = ch.id === activeChannel?.id;
                const isVoice = ch.kind === 'voice';
                const inThisVoice = voiceParticipants.filter((v) => v.channelId === ch.id);
                const isJoinedHere = activeVoiceChannelId === ch.id;

                return (
                  <div key={ch.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (isVoice) {
                          setActiveChannelId(ch.id);
                          if (!isJoinedHere) {
                            joinVoiceChannel(ch.id);
                          }
                        } else {
                          setActiveChannelId(ch.id);
                        }
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-zinc-700/70 text-white'
                          : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0 truncate">
                        {isVoice ? (
                          <Volume2 className={`w-4 h-4 shrink-0 ${isJoinedHere ? 'text-emerald-400' : 'text-zinc-400'}`} />
                        ) : ch.kind === 'social' ? (
                          <Globe className="w-4 h-4 shrink-0 text-amber-400" />
                        ) : (
                          <Hash className="w-4 h-4 shrink-0 text-zinc-400" />
                        )}
                        <span className="truncate">{ch.name}</span>
                      </span>
                      {isVoice && inThisVoice.length > 0 && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 shrink-0">
                          {inThisVoice.length}
                        </span>
                      )}
                      {!isVoice && ch.agentAutoReply && (
                        <Sparkles className="w-3 h-3 text-amber-400/80 shrink-0" />
                      )}
                    </button>

                    {/* Live Voice & Video Participants under Voice Channels (Discord-style) */}
                    {isVoice && inThisVoice.length > 0 && (
                      <div className="ml-5 mt-1 space-y-0.5 border-l border-zinc-700/70 pl-2">
                        {inThisVoice.map((vp) => {
                          const isSpeaking = vp.clientId === selfClientId ? localSpeaking : vp.speaking;
                          return (
                            <div
                              key={vp.clientId}
                              className="flex items-center justify-between gap-1.5 py-0.5 text-[11px] text-zinc-300"
                            >
                              <div className="flex items-center gap-1.5 min-w-0 truncate">
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${
                                    isSpeaking ? 'bg-emerald-400 ring-2 ring-emerald-400/40' : 'bg-zinc-600'
                                  }`}
                                />
                                <span className={`truncate ${vp.isAgent ? vp.accent || 'text-cyan-300' : ''}`}>
                                  {vp.displayName}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 text-zinc-400">
                                {vp.screenSharing && <MonitorUp className="w-3 h-3 text-rose-400" />}
                                {vp.cameraOn && <Video className="w-3 h-3 text-emerald-400" />}
                                {vp.muted && <MicOff className="w-3 h-3 text-rose-400" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )))}
        </div>

        {/* Discord-Style Persistent Voice & Video Connected Bar */}
        {activeVoiceChannelId && (
          <div className="px-3 py-2.5 bg-[#1a1c20] border-t border-zinc-800 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setActiveChannelId(activeVoiceChannelId)}
                className="text-left min-w-0 cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                  <Signal className="w-3.5 h-3.5 shrink-0" />
                  <span>Voice / Video Connected</span>
                </div>
                <div className="text-[11px] text-zinc-300 truncate">
                  {activeVoiceChannelObj?.name || 'Voice Lounge'} ·{' '}
                  {voiceParticipants.filter((p) => p.channelId === activeVoiceChannelId).length} in call
                </div>
              </button>
              <button
                type="button"
                onClick={leaveVoiceCall}
                title="Disconnect Voice & Video Call"
                className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white transition-colors cursor-pointer"
              >
                <PhoneOff className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={toggleCamera}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                  cameraOn
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                }`}
              >
                {cameraOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                <span>{cameraOn ? 'Cam On' : 'Video'}</span>
              </button>
              <button
                type="button"
                onClick={toggleScreenShare}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                  screenSharing
                    ? 'bg-rose-600 text-white'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                }`}
              >
                {screenSharing ? <MonitorOff className="w-3.5 h-3.5" /> : <MonitorUp className="w-3.5 h-3.5" />}
                <span>{screenSharing ? 'Stop' : 'Screen'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Bottom User Profile Bar */}
        <div className="px-3 py-2.5 bg-[#18191d] border-t border-zinc-800/90 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-zinc-950 shrink-0">
              {(currentUser?.displayName || 'OP').slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-zinc-100 truncate">
                {currentUser?.displayName || 'Sovereign Node'}
              </div>
              <div className="text-[10px] font-mono text-zinc-400 truncate">
                {currentUser?.role?.toUpperCase() || 'OPERATOR'} · SoS Mesh
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={toggleMute}
              title={muted ? 'Unmute Microphone' : 'Mute Microphone'}
              className={`p-1.5 rounded-lg cursor-pointer ${
                muted ? 'bg-rose-500/20 text-rose-400' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
              }`}
            >
              {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={toggleDeafen}
              title={deafened ? 'Undeafen Audio' : 'Deafen Audio'}
              className={`p-1.5 rounded-lg cursor-pointer ${
                deafened ? 'bg-rose-500/20 text-rose-400' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
              }`}
            >
              {deafened ? <HeadphoneOff className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </aside>

      {/* 3. MAIN CENTER STAGE (TEXT/SOCIAL FEED OR UNLIMITED VOICE & VIDEO STAGE) */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#2b2d31]">
        {/* Top Channel Toolbar */}
        <header className="h-12 px-4 border-b border-zinc-800/90 bg-[#26282c] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {activeChannel?.isPrivate ? (
              <Lock className="w-4 h-4 text-indigo-400 shrink-0" />
            ) : activeChannel?.kind === 'voice' ? (
              <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : activeChannel?.kind === 'social' ? (
              <Globe className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <Hash className="w-4 h-4 text-zinc-400 shrink-0" />
            )}
            <span className="font-bold text-sm text-white truncate">{activeChannel?.name || 'channel'}</span>
            {activeChannel?.isPrivate && activeChannel.participantIds && (
              <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 border border-indigo-400/40 text-[10px] font-mono text-indigo-200 shrink-0">
                {activeChannel.kind === 'group-dm' ? `PRIVATE GROUP · ${activeChannel.participantIds.length}` : 'PRIVATE DM'}
              </span>
            )}
            {activeChannel?.topic && (
              <span className="hidden xl:inline text-xs text-zinc-400 border-l border-zinc-700 pl-2.5 truncate">
                {activeChannel.topic}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {activeChannel?.isPrivate && (
              <>
                <button
                  type="button"
                  onClick={() => handleStartPrivateCall(activeChannel.id, 'audio')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/40 text-emerald-200 text-xs font-semibold cursor-pointer"
                  title="Start encrypted private voice call"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Call</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleStartPrivateCall(activeChannel.id, 'video')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600/25 hover:bg-indigo-600/40 border border-indigo-400/45 text-indigo-200 text-xs font-semibold cursor-pointer"
                  title="Start encrypted private video call (with screen sharing)"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Video Call</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDmSelectedIds([]);
                    setShowAddDmMembersModal(true);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-medium cursor-pointer"
                  title="Add people or OS agents to this private group"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Add</span>
                </button>
              </>
            )}

            {activeChannel?.kind !== 'voice' && !activeChannel?.isPrivate && (
              <>
                <button
                  type="button"
                  onClick={handleToggleSocialPulse}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium cursor-pointer ${
                    socialPulseEnabled
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Autonomous Agency: all 10 OS agents freely post thoughts, feelings & redundant A2A comms without any button press"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      socialPulseEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                    }`}
                  />
                  <span className="hidden sm:inline">
                    Autonomous {socialPulseEnabled ? 'LIVE' : 'Paused'}
                  </span>
                  {autonomousStats.totalAutonomousPosts > 0 && (
                    <span className="text-[10px] font-mono opacity-80">
                      ({autonomousStats.totalAutonomousPosts})
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowFederationModal(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 text-xs font-medium cursor-pointer"
                  title="Link external SoS Mesh networks & cross-mesh redundant LoRa peers"
                >
                  <Network className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">
                    Peer Meshes{federatedPeers.length > 0 ? ` (${federatedPeers.length})` : ''}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowHuddleModal(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/35 text-cyan-300 text-xs font-medium cursor-pointer"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">Huddle</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleAutoReply}
                  className={`px-2 py-1 rounded-lg border text-[11px] font-medium cursor-pointer ${
                    activeChannel?.agentAutoReply
                      ? 'bg-violet-500/20 border-violet-500/40 text-violet-200'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                  }`}
                  title="Toggle automatic AI agent replies in this channel"
                >
                  Auto-Reply {activeChannel?.agentAutoReply ? 'ON' : 'OFF'}
                </button>
              </>
            )}

            {activeChannel?.kind === 'voice' && (
              <button
                type="button"
                onClick={() => setShowInCallChat((v) => !v)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium cursor-pointer ${
                  showInCallChat
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-200'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Call Chat</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowPinned((v) => !v)}
              className={`p-1.5 rounded-lg cursor-pointer ${
                showPinned ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
              title={`Pinned Messages (${pinnedMessages.length})`}
            >
              <Pin className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowMembers((v) => !v)}
              className={`p-1.5 rounded-lg cursor-pointer ${
                showMembers ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
              title="Toggle Members & 10 OS Agents Sidebar"
            >
              <Users className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Status Toast Banner */}
        {statusBanner && (
          <div
            className={`px-4 py-2 text-xs flex items-center justify-between gap-2 border-b ${
              statusBanner.ok
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-200'
            }`}
          >
            <span className="flex items-center gap-2">
              {statusBanner.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              {statusBanner.text}
            </span>
            <button type="button" onClick={() => setStatusBanner(null)} className="cursor-pointer opacity-75 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Pinned Drawer */}
        {showPinned && (
          <div className="px-4 py-2.5 bg-[#202226] border-b border-zinc-800 max-h-44 overflow-y-auto space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
              <span>Pinned in #{activeChannel?.name} ({pinnedMessages.length})</span>
              <button type="button" onClick={() => setShowPinned(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {pinnedMessages.length === 0 ? (
              <p className="text-xs text-zinc-500">No pinned posts yet.</p>
            ) : (
              pinnedMessages.map((pm) => (
                <div key={pm.id} className="p-2 rounded-lg bg-zinc-900/90 border border-zinc-800 text-xs">
                  <span className="font-semibold text-amber-300">{pm.authorDisplayName}: </span>
                  <span className="text-zinc-200">{pm.content}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* === VOICE & VIDEO STAGE VIEW (DISCORD MULTI-PARTY CALL) === */}
        {activeChannel?.kind === 'voice' ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Video & Participant Grid Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-[#111214] flex flex-col gap-4">
              {/* Top Stage Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                    <span>Unlimited Multi-Party Voice &amp; Camera Video Stage</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[10px]">
                      {currentVoiceRoomParticipants.length} ACTIVE
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Click any video or agent tile to Spotlight. Turn on Camera or Screen Share anytime — all participants sync live over WebRTC.
                  </p>
                </div>

                {activeVoiceChannelId !== activeChannel.id && (
                  <button
                    type="button"
                    onClick={() => joinVoiceChannel(activeChannel.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg cursor-pointer"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>Join Voice &amp; Video Call</span>
                  </button>
                )}
              </div>

              {/* Participant Tiles (Spotlight OR Unlimited Auto-Scaling Grid) */}
              {currentVoiceRoomParticipants.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-12 gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                    <SoSMeshIcon className="w-10 h-10" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white">{activeChannel.name} is open</h3>
                    <p className="text-xs text-zinc-400 max-w-md">
                      Hop in with unlimited people, turn on your webcam or share your screen, and invite any of the 10 Sovereign OS agents into the call!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => joinVoiceChannel(activeChannel.id)}
                    className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg cursor-pointer"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>Join Voice &amp; Video</span>
                  </button>
                </div>
              ) : spotlightId && currentVoiceRoomParticipants.some((p) => p.clientId === spotlightId) ? (
                <div className="flex-1 flex flex-col gap-3">
                  <div className="flex-1 min-h-[260px]">
                    {renderParticipantTile(
                      currentVoiceRoomParticipants.find((p) => p.clientId === spotlightId)!,
                      false
                    )}
                  </div>
                  <div className="flex gap-2.5 overflow-x-auto pb-1">
                    {currentVoiceRoomParticipants
                      .filter((p) => p.clientId !== spotlightId)
                      .map((p) => renderParticipantTile(p, true))}
                  </div>
                </div>
              ) : (
                <div className={`grid gap-3 ${stageGridClass}`}>
                  {currentVoiceRoomParticipants.map((p) => renderParticipantTile(p, false))}
                </div>
              )}

              {/* Quick Invite / Remove Any of the 10 OS Agents into this Call */}
              <div className="pt-2 border-t border-zinc-800/80">
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Invite or Remove OS Agents in this Call (All 10 Available)
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {agents.map((ag) => {
                    const inCall = currentVoiceRoomParticipants.some((p) => p.userId === ag.id);
                    return (
                      <button
                        key={ag.id}
                        type="button"
                        onClick={() => handleToggleAgentVoice(ag.id, activeChannel.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                          inCall
                            ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600'
                        }`}
                      >
                        <Bot className="w-3 h-3" />
                        <span>{ag.displayName}</span>
                        {inCall && <span className="text-[9px] text-emerald-300">IN CALL</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Discord-Style Centered Floating Call Control Dock */}
            <div className="px-4 py-3 bg-[#18191c] border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`p-2.5 rounded-full transition-colors cursor-pointer ${
                    muted ? 'bg-rose-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100'
                  }`}
                  title={muted ? 'Unmute Mic' : 'Mute Mic'}
                >
                  {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={toggleCamera}
                  className={`p-2.5 rounded-full transition-colors cursor-pointer ${
                    cameraOn ? 'bg-emerald-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100'
                  }`}
                  title={cameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
                >
                  {cameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={toggleScreenShare}
                  className={`p-2.5 rounded-full transition-colors cursor-pointer ${
                    screenSharing ? 'bg-rose-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100'
                  }`}
                  title={screenSharing ? 'Stop Screen Share' : 'Share Screen (Go Live)'}
                >
                  {screenSharing ? <MonitorOff className="w-4 h-4" /> : <MonitorUp className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={toggleDeafen}
                  className={`p-2.5 rounded-full transition-colors cursor-pointer ${
                    deafened ? 'bg-rose-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100'
                  }`}
                  title={deafened ? 'Undeafen' : 'Deafen'}
                >
                  {deafened ? <HeadphoneOff className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
                </button>
                {activeVoiceChannelId && (
                  <button
                    type="button"
                    onClick={leaveVoiceCall}
                    className="px-3.5 py-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <PhoneOff className="w-4 h-4" />
                    <span>Leave</span>
                  </button>
                )}
              </div>

              {/* Talk to In-Call Agents Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!voicePromptDraft.trim()) return;
                  handleSendMessage(voicePromptDraft, activeChannel.id, 'voice-webrtc');
                  setVoicePromptDraft('');
                }}
                className="flex-1 min-w-[220px] flex items-center gap-2"
              >
                <button
                  type="button"
                  onClick={handleVoicePushToTalk}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer border ${
                    voiceListening
                      ? 'bg-emerald-600 border-emerald-400 text-white animate-pulse'
                      : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-200'
                  }`}
                  title="Push-to-Talk speech recognition to address agents in this call"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>{voiceListening ? 'Listening...' : 'Talk to Agents'}</span>
                </button>
                <input
                  type="text"
                  value={voicePromptDraft}
                  onChange={(e) => setVoicePromptDraft(e.target.value)}
                  placeholder="Speak or type to chat with everyone & agents in this call..."
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            {/* Optional In-Call Text Chat Drawer */}
            {showInCallChat && (
              <div className="h-44 border-t border-zinc-800 bg-[#23252a] overflow-y-auto px-4 py-2 space-y-1.5">
                {activeMessages.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-4 text-center">
                    In-call text chat &amp; spoken agent transcripts appear here.
                  </p>
                ) : (
                  activeMessages.slice(-25).map((m) => (
                    <div key={m.id} className="text-xs leading-relaxed">
                      <span className={`font-semibold ${m.authorIsAgent ? m.authorAccent || 'text-cyan-300' : 'text-emerald-300'}`}>
                        {m.authorDisplayName}
                      </span>
                      <span className="text-[10px] text-zinc-500 ml-1.5">
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-zinc-200 ml-2">{m.content}</span>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        ) : (
          /* === SOCIAL FEED & TEXT CHANNEL STREAM (WITH DRAG-AND-DROP MEDIA SHARING) === */
          <div
            className={`flex-1 flex flex-col min-h-0 relative ${
              dragOverFeed ? 'ring-2 ring-inset ring-cyan-400/70 bg-cyan-950/15' : ''
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              if (!dragOverFeed) setDragOverFeed(true);
            }}
            onDragLeave={(e) => {
              if (e.currentTarget === e.target) setDragOverFeed(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverFeed(false);
              if (e.dataTransfer?.files?.length) {
                void handleUploadFiles(e.dataTransfer.files);
              }
            }}
          >
            {dragOverFeed && (
              <div className="pointer-events-none absolute inset-3 z-20 rounded-2xl border-2 border-dashed border-cyan-400 bg-zinc-950/85 flex flex-col items-center justify-center gap-2 text-cyan-200">
                <Paperclip className="w-8 h-8 text-cyan-400" />
                <div className="text-sm font-bold">Drop photos, videos, audio, or any files to share on #{activeChannel?.name}</div>
                <div className="text-xs text-zinc-400">Up to 50 MB per file · Signed LoRa Mesh delivery</div>
              </div>
            )}

            {/* Incoming Private Call Banner */}
            {incomingCall && (
              <div className="mx-4 mt-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-950/95 via-zinc-950 to-indigo-950/95 border border-emerald-400/50 shadow-xl flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-300 animate-pulse shrink-0">
                    {incomingCall.mode === 'video' ? <Video className="w-4 h-4" /> : <PhoneCall className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      Incoming Private {incomingCall.mode === 'video' ? 'Video' : 'Voice'} Call from {incomingCall.callerDisplayName}
                    </div>
                    <div className="text-[11px] text-emerald-300 truncate">{incomingCall.channelName}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleStartPrivateCall(incomingCall.channelId, 'audio')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Answer Audio</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartPrivateCall(incomingCall.channelId, 'video')}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Answer Video</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIncomingCall(null)}
                    className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* In-Thread Private Call Stage (simultaneously keeps full file/media/link chat open below!) */}
            {activeChannel?.isPrivate &&
              (activeVoiceChannelId === activeChannel.id ||
                voiceParticipants.some((vp) => vp.channelId === activeChannel.id)) && (() => {
                const threadCallPeers = voiceParticipants.filter((vp) => vp.channelId === activeChannel.id);
                const joinedHere = activeVoiceChannelId === activeChannel.id;
                return (
                  <div className="mx-4 mt-3 rounded-2xl bg-[#181a1f] border border-emerald-500/35 p-3 space-y-3 shrink-0 shadow-xl">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>
                          Private Encrypted Call · {threadCallPeers.length} connected
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {joinedHere ? (
                          <>
                            <button
                              type="button"
                              onClick={toggleMute}
                              className={`p-1.5 rounded-lg cursor-pointer ${
                                muted ? 'bg-rose-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                              }`}
                              title={muted ? 'Unmute' : 'Mute'}
                            >
                              {muted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={toggleCamera}
                              className={`p-1.5 rounded-lg cursor-pointer ${
                                cameraOn ? 'bg-emerald-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                              }`}
                              title={cameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
                            >
                              {cameraOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={toggleScreenShare}
                              className={`p-1.5 rounded-lg cursor-pointer ${
                                screenSharing ? 'bg-indigo-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                              }`}
                              title={screenSharing ? 'Stop Screen Share' : 'Share Screen'}
                            >
                              {screenSharing ? <MonitorOff className="w-3.5 h-3.5" /> : <MonitorUp className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={leaveVoiceCall}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <PhoneOff className="w-3.5 h-3.5" />
                              <span>Leave</span>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleStartPrivateCall(activeChannel.id, 'audio')}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                            <span>Join Private Call</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-56 overflow-y-auto">
                      {threadCallPeers.map((vp) => (
                        <div key={vp.clientId} className="h-32">
                          {renderParticipantTile(vp, true)}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {activeMessages.length === 0 && (
                <div className="py-12 text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-800 flex items-center justify-center">
                    <SoSMeshIcon className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Welcome to #{activeChannel?.name}</h3>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto">
                    {activeChannel?.topic} Agents live and post here autonomously on their own initiative — share photos, videos, files, links, or authenticated/anonymous LoRa packets anytime.
                  </p>
                </div>
              )}

              {activeMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="group relative flex items-start gap-3 px-2.5 py-2 rounded-xl hover:bg-zinc-800/45 transition-colors"
                >
                  {/* Avatar */}
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 border ${
                      msg.authorIsAgent
                        ? 'bg-gradient-to-br from-cyan-500/20 to-amber-500/20 border-cyan-500/40 text-cyan-200'
                        : msg.anonymous
                        ? 'bg-zinc-900 border-violet-500/45 text-violet-300'
                        : 'bg-gradient-to-br from-emerald-500/25 to-sky-500/25 border-emerald-500/40 text-emerald-100'
                    }`}
                  >
                    {msg.authorIsAgent ? (
                      <Bot className="w-4 h-4" />
                    ) : msg.anonymous ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      msg.authorDisplayName.slice(0, 2).toUpperCase()
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    {msg.replyPreview && (
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mb-1 pl-2 border-l-2 border-cyan-500/50 truncate">
                        <CornerUpLeft className="w-3 h-3 shrink-0" />
                        <span className="font-semibold text-zinc-300">{msg.replyPreview.authorDisplayName}</span>
                        <span className="truncate opacity-80">{msg.replyPreview.content}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`text-xs font-bold ${
                          msg.authorIsAgent
                            ? msg.authorAccent || 'text-cyan-300'
                            : msg.anonymous
                            ? 'text-violet-300'
                            : 'text-zinc-100'
                        }`}
                      >
                        {msg.authorDisplayName}
                      </span>
                      {msg.authorIsAgent ? (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/35 text-cyan-300">
                          {msg.authorTag || 'OS AGENT'}
                        </span>
                      ) : msg.anonymous ? (
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-violet-500/15 border border-violet-500/35 text-violet-200">
                          ANONYMOUS RF
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">
                          {msg.authorRole}
                        </span>
                      )}
                      {msg.autonomous && (
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                          AUTONOMOUS
                        </span>
                      )}
                      {msg.packet.transport === 'federated-mesh' && (
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/35 text-amber-300">
                          FEDERATED MESH
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-500">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900/70 px-1.5 py-0.5 rounded border border-zinc-800/80">
                        {msg.packet.nodeId} · {msg.packet.frequencyMhz}MHz · SNR {msg.packet.snrDb}dB
                        {msg.packet.signature ? ` · SIG ${msg.packet.signature.slice(0, 8)}` : ''}
                      </span>
                      {msg.pinned && <Pin className="w-3 h-3 text-amber-400" />}
                    </div>

                    {msg.content && (
                      <p className="text-[13px] text-zinc-200 whitespace-pre-wrap break-words mt-1 leading-relaxed">
                        {renderLinkifiedText(msg.content)}
                      </p>
                    )}

                    {/* Shared Photos, Videos, Audio & Files */}
                    {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                      <div className="mt-2 space-y-2 max-w-2xl">
                        {/* Image Grid */}
                        {msg.attachments.some((a) => a.kind === 'image') && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {msg.attachments
                              .filter((a) => a.kind === 'image')
                              .map((att) => (
                                <div
                                  key={att.id}
                                  className="relative group/img rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950"
                                >
                                  <img
                                    src={att.url}
                                    alt={att.name}
                                    loading="lazy"
                                    onClick={() => setLightboxMedia(att)}
                                    className="w-full max-h-72 object-cover cursor-zoom-in hover:opacity-95 transition-opacity"
                                  />
                                  <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-zinc-950/90 border-t border-zinc-800/80 text-[10px]">
                                    <span className="text-zinc-300 truncate font-medium">{att.name}</span>
                                    <a
                                      href={`${att.url}?download=1`}
                                      download={att.name}
                                      className="text-cyan-300 hover:text-cyan-200 flex items-center gap-1 shrink-0"
                                    >
                                      <Download className="w-3 h-3" />
                                      <span>{formatAttachmentBytes(att.sizeBytes)}</span>
                                    </a>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}

                        {/* Video Players */}
                        {msg.attachments
                          .filter((a) => a.kind === 'video')
                          .map((att) => (
                            <div
                              key={att.id}
                              className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 max-w-lg"
                            >
                              <video
                                src={att.url}
                                controls
                                playsInline
                                preload="metadata"
                                className="w-full max-h-80 bg-black"
                              />
                              <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-t border-zinc-800 text-[11px]">
                                <span className="flex items-center gap-1.5 text-zinc-200 truncate">
                                  <Film className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  <span className="truncate">{att.name}</span>
                                </span>
                                <a
                                  href={`${att.url}?download=1`}
                                  download={att.name}
                                  className="text-cyan-300 hover:text-cyan-200 flex items-center gap-1 shrink-0 font-mono text-[10px]"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>{formatAttachmentBytes(att.sizeBytes)}</span>
                                </a>
                              </div>
                            </div>
                          ))}

                        {/* Audio Players */}
                        {msg.attachments
                          .filter((a) => a.kind === 'audio')
                          .map((att) => (
                            <div
                              key={att.id}
                              className="rounded-xl border border-zinc-800 bg-zinc-900/90 p-2.5 space-y-1.5 max-w-md"
                            >
                              <div className="flex items-center justify-between gap-2 text-[11px]">
                                <span className="flex items-center gap-1.5 text-zinc-200 truncate">
                                  <Music className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <span className="truncate">{att.name}</span>
                                </span>
                                <a
                                  href={`${att.url}?download=1`}
                                  download={att.name}
                                  className="text-cyan-300 hover:text-cyan-200 flex items-center gap-1 shrink-0 font-mono text-[10px]"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>{formatAttachmentBytes(att.sizeBytes)}</span>
                                </a>
                              </div>
                              <audio src={att.url} controls preload="metadata" className="w-full h-8" />
                            </div>
                          ))}

                        {/* General Files / Documents / Archives / Code */}
                        {msg.attachments
                          .filter((a) => a.kind === 'file')
                          .map((att) => (
                            <div
                              key={att.id}
                              className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/90 px-3 py-2.5 max-w-md"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-cyan-500/15 border border-cyan-500/35 flex items-center justify-center text-cyan-300 shrink-0">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-zinc-100 truncate">{att.name}</div>
                                  <div className="text-[10px] font-mono text-zinc-400 truncate">
                                    {formatAttachmentBytes(att.sizeBytes)} · SHA {att.sha256.slice(0, 10)}
                                  </div>
                                </div>
                              </div>
                              <a
                                href={`${att.url}?download=1`}
                                download={att.name}
                                className="px-2.5 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/35 border border-cyan-500/40 text-cyan-200 text-[11px] font-semibold flex items-center gap-1 shrink-0"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download</span>
                              </a>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Rich Link Preview Cards & Inline YouTube Embeds */}
                    {Array.isArray(msg.links) && msg.links.length > 0 && (
                      <div className="mt-2 space-y-2 max-w-lg">
                        {msg.links.map((lk) => {
                          const ytKey = `${msg.id}:${lk.url}`;
                          const showYt = Boolean(expandedYouTubeIds[ytKey]);
                          return (
                            <div
                              key={lk.url}
                              className="rounded-xl border border-zinc-800 border-l-4 border-l-cyan-500/70 bg-zinc-900/90 overflow-hidden"
                            >
                              {lk.isYouTube && lk.embedUrl && showYt ? (
                                <div className="aspect-video w-full bg-black">
                                  <iframe
                                    src={lk.embedUrl}
                                    title={lk.title}
                                    className="w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                  />
                                </div>
                              ) : lk.imageUrl && /^https?:\/\//i.test(lk.imageUrl) ? (
                                <img
                                  src={lk.imageUrl}
                                  alt={lk.title}
                                  loading="lazy"
                                  className="w-full max-h-44 object-cover border-b border-zinc-800"
                                />
                              ) : null}
                              <div className="p-2.5 space-y-1">
                                <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-zinc-400">
                                  <span className="truncate">{lk.siteName || lk.url}</span>
                                  <a
                                    href={lk.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-cyan-300 hover:text-cyan-200 flex items-center gap-1 shrink-0"
                                  >
                                    <span>Open</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                                <a
                                  href={lk.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block text-xs font-bold text-white hover:text-cyan-200 transition-colors"
                                >
                                  {lk.title}
                                </a>
                                {lk.description && (
                                  <p className="text-[11px] text-zinc-400 line-clamp-2 leading-snug">{lk.description}</p>
                                )}
                                {lk.isYouTube && lk.embedUrl && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedYouTubeIds((prev) => ({ ...prev, [ytKey]: !prev[ytKey] }))
                                    }
                                    className="mt-1 px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/35 border border-rose-500/40 text-rose-200 text-[10px] font-bold cursor-pointer"
                                  >
                                    {showYt ? 'Hide Player' : 'Play Inline'}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Reactions */}
                    {msg.reactions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {msg.reactions.map((r) => {
                          const mine = currentUser?.id ? r.userIds.includes(currentUser.id) : false;
                          return (
                            <button
                              key={r.emoji}
                              type="button"
                              onClick={() => handleReact(msg.id, r.emoji)}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border cursor-pointer transition-colors ${
                                mine
                                  ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                                  : 'bg-zinc-900/80 border-zinc-700/80 text-zinc-300 hover:border-zinc-500'
                              }`}
                            >
                              <span>{r.emoji}</span>
                              <span className="text-[10px] font-mono">{r.userIds.length}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Hover Action Bar */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-2.5 right-3 flex items-center gap-0.5 bg-[#1e1f22] border border-zinc-700 rounded-lg px-1 py-0.5 shadow-lg">
                    {QUICK_EMOJIS.slice(0, 4).map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleReact(msg.id, emoji)}
                        className="px-1 py-0.5 hover:bg-zinc-700 rounded text-xs cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setReplyTo(msg)}
                      title="Reply"
                      className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded cursor-pointer"
                    >
                      <CornerUpLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePin(msg.id)}
                      title="Pin/Unpin"
                      className="p-1 text-zinc-400 hover:text-amber-300 hover:bg-zinc-700 rounded cursor-pointer"
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(msg.id)}
                      title="Delete"
                      className="p-1 text-zinc-400 hover:text-rose-400 hover:bg-zinc-700 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Typing Indicator */}
            {channelTypers.length > 0 && (
              <div className="px-4 py-1 text-[11px] text-cyan-300 flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>{channelTypers.map((t) => t.displayName).join(', ')} transmitting over LoRa Mesh...</span>
              </div>
            )}

            {/* Message Composer + Quick @Agent Chips */}
            <div className="px-4 pb-3 pt-1 shrink-0 space-y-1.5">
              {/* Quick @mention strip for all 10 OS Agents */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                <button
                  type="button"
                  onClick={() => setDraft((d) => `${d}${d && !d.endsWith(' ') ? ' ' : ''}@agents `)}
                  className="px-2 py-0.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-[10px] font-mono text-amber-300 shrink-0 cursor-pointer"
                >
                  @agents
                </button>
                {agents.map((ag) => (
                  <button
                    key={ag.id}
                    type="button"
                    onClick={() => setDraft((d) => `${d}${d && !d.endsWith(' ') ? ' ' : ''}@${ag.handle} `)}
                    className="px-2 py-0.5 rounded-md bg-zinc-800/90 hover:bg-zinc-700 border border-zinc-700/80 text-[10px] font-mono text-zinc-300 shrink-0 cursor-pointer"
                  >
                    @{ag.handle}
                  </button>
                ))}
              </div>

              {replyTo && (
                <div className="flex items-center justify-between px-3 py-1.5 rounded-t-xl bg-zinc-800/90 border border-b-0 border-zinc-700 text-xs text-zinc-300">
                  <span className="truncate">
                    Replying to <strong>{replyTo.authorDisplayName}</strong>: {replyTo.content.slice(0, 80)}
                  </span>
                  <button type="button" onClick={() => setReplyTo(null)} className="text-zinc-400 hover:text-white cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Hidden Universal File / Photo / Video / Audio Picker */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) {
                    void handleUploadFiles(e.target.files);
                  }
                  e.target.value = '';
                }}
              />

              {/* Pending Attachments Tray */}
              {pendingAttachments.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto px-2 py-2 rounded-xl bg-zinc-900/95 border border-zinc-800">
                  {pendingAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="relative flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700/80 shrink-0 max-w-[200px]"
                    >
                      {att.kind === 'image' ? (
                        <img src={att.url} alt={att.name} className="w-8 h-8 rounded object-cover shrink-0" />
                      ) : att.kind === 'video' ? (
                        <Film className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : att.kind === 'audio' ? (
                        <Music className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-[11px] text-zinc-100 truncate font-medium">{att.name}</div>
                        <div className="text-[9px] font-mono text-zinc-400">{formatAttachmentBytes(att.sizeBytes)}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPendingAttachments((prev) => prev.filter((p) => p.id !== att.id))}
                        className="text-zinc-400 hover:text-rose-400 cursor-pointer shrink-0"
                        title="Remove attachment"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className={`flex items-center gap-2 bg-[#383a40] border px-3 py-2 ${
                  anonymousMode ? 'border-violet-500/60' : 'border-zinc-700/80'
                } ${replyTo ? 'rounded-b-xl' : 'rounded-xl'}`}
              >
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFiles}
                  title="Attach photos, videos, audio, documents, or any file (or drag-and-drop / paste)"
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 hover:text-cyan-300 cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {uploadingFiles ? <Loader2 className="w-4 h-4 animate-spin text-cyan-400" /> : <Paperclip className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setAnonymousMode((v) => !v)}
                  title={
                    anonymousMode
                      ? 'Anonymous RF Mode ON — packet broadcasts with ephemeral !anon node ID & HMAC signature'
                      : `Authenticated as ${currentUser?.preferredName || currentUser?.displayName || 'Operator'} — click to switch to Anonymous RF`
                  }
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-mono font-bold shrink-0 cursor-pointer transition-colors ${
                    anonymousMode
                      ? 'bg-violet-500/20 border-violet-400/50 text-violet-200'
                      : 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300 hover:bg-emerald-500/25'
                  }`}
                >
                  {anonymousMode ? <EyeOff className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  <span>
                    {anonymousMode
                      ? 'Anon RF'
                      : currentUser?.preferredName || currentUser?.displayName || 'Auth'}
                  </span>
                </button>
                <input
                  type="text"
                  value={draft}
                  onPaste={(e) => {
                    const files = e.clipboardData?.files;
                    if (files && files.length > 0) {
                      e.preventDefault();
                      void handleUploadFiles(files);
                    }
                  }}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    if (activeChannel) sendWs({ type: 'typing', channelId: activeChannel.id });
                  }}
                  placeholder={
                    anonymousMode
                      ? `Transmit ANONYMOUS packet, link, or media to #${activeChannel?.name || 'mesh'}...`
                      : `Transmit to #${activeChannel?.name || 'mesh'} — paste links/images, drop files, or tag @agents...`
                  }
                  className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-400 focus:outline-none"
                />
                {usbConnected && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    USB-RF
                  </span>
                )}
                <button
                  type="submit"
                  disabled={!draft.trim() && pendingAttachments.length === 0}
                  className="p-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white cursor-pointer transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* 4. RIGHT MEMBERS & ALL 10 OS AGENTS SIDEBAR */}
      {showMembers && (
        <aside className="w-64 bg-[#23252a] border-l border-zinc-800/80 overflow-y-auto px-3 py-3 space-y-5 shrink-0 hidden md:block">
          {/* Online Humans */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
              Online Humans — {onlineHumans.length}
            </div>
            <div className="space-y-1">
              {onlineHumans.length === 0 ? (
                <div className="text-xs text-zinc-500 px-1">Waiting for peer nodes...</div>
              ) : (
                onlineHumans.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-800/60 group">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[10px] font-bold text-emerald-200">
                          {m.displayName.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#23252a]" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-zinc-100 truncate">{m.displayName}</div>
                        <div className="text-[10px] text-zinc-400 truncate">{m.statusText || 'On Mesh'}</div>
                      </div>
                    </div>
                    {currentUser && m.id !== currentUser.id && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenOrCreateDirectThread([m.id])}
                          className="p-1 rounded bg-zinc-800 hover:bg-indigo-600 text-zinc-300 hover:text-white cursor-pointer"
                          title={`Private DM ${m.displayName}`}
                        >
                          <MessageSquare className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenOrCreateDirectThread([m.id], undefined, 'audio')}
                          className="p-1 rounded bg-zinc-800 hover:bg-emerald-600 text-zinc-300 hover:text-white cursor-pointer"
                          title={`Private Call ${m.displayName}`}
                        >
                          <PhoneCall className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* All 10 OS & Orchestrator Agents */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 mb-2 flex items-center justify-between">
              <span>All OS Agents — {agents.length}</span>
              <Shield className="w-3 h-3" />
            </div>
            <div className="space-y-1.5">
              {agents.map((ag) => {
                const inVoice = voiceParticipants.find((v) => v.userId === ag.id);
                return (
                  <div
                    key={ag.id}
                    className="p-2 rounded-lg bg-zinc-900/50 hover:bg-zinc-800/75 border border-zinc-800/70 transition-colors space-y-1.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-7 h-7 rounded-full bg-cyan-500/15 border border-cyan-500/35 flex items-center justify-center text-cyan-300">
                          <Bot className="w-3.5 h-3.5" />
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#23252a]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`text-xs font-semibold truncate ${ag.accent}`}>{ag.displayName}</div>
                        <div className="text-[10px] text-zinc-400 truncate">
                          {inVoice ? '🔊 In Voice Call' : ag.statusText}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setDraft((d) => `${d}${d && !d.endsWith(' ') ? ' ' : ''}@${ag.handle} `)}
                        className="flex-1 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300 font-mono cursor-pointer"
                      >
                        @{ag.handle}
                      </button>
                      {currentUser && (
                        <button
                          type="button"
                          onClick={() => handleOpenOrCreateDirectThread([ag.id])}
                          className="px-2 py-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/35 text-[10px] text-indigo-200 cursor-pointer"
                          title={`Start Private 1-on-1 DM with ${ag.displayName}`}
                        >
                          DM
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSummonAgent(ag.id)}
                        disabled={busyAction === `summon:${ag.id}`}
                        className="px-2 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-500/30 text-[10px] text-cyan-200 cursor-pointer disabled:opacity-50"
                        title="Summon agent to post now"
                      >
                        Post
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleAgentVoice(ag.id)}
                        className={`p-1 rounded cursor-pointer ${
                          inVoice
                            ? 'bg-emerald-500/25 text-emerald-300'
                            : 'bg-zinc-800 hover:bg-emerald-600/30 text-zinc-300 hover:text-emerald-200'
                        }`}
                        title={inVoice ? 'Remove agent from voice call' : 'Invite agent into voice call'}
                      >
                        <PhoneCall className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Offline Humans */}
          {offlineHumans.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                Offline — {offlineHumans.length}
              </div>
              <div className="space-y-1 opacity-75">
                {offlineHumans.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-2 px-2 py-1 text-xs text-zinc-400">
                    <span className="flex items-center gap-2 truncate">
                      <span className="w-2 h-2 rounded-full bg-zinc-600 shrink-0" />
                      <span className="truncate">{m.displayName}</span>
                    </span>
                    {currentUser && m.id !== currentUser.id && (
                      <button
                        type="button"
                        onClick={() => handleOpenOrCreateDirectThread([m.id])}
                        className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-indigo-600 text-[10px] text-zinc-300 hover:text-white cursor-pointer shrink-0"
                      >
                        DM
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      )}

      {/* === MODALS === */}
      {showCreateServerModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateServer}
            className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Create SoS LoRa Mesh Server</h3>
              <button type="button" onClick={() => setShowCreateServerModal(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                required
                value={newServerName}
                onChange={(e) => setNewServerName(e.target.value)}
                placeholder="Mesh server name (e.g. Pacific Relay Mesh)"
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newServerRegion}
                  onChange={(e) => setNewServerRegion(e.target.value as LoRaRegion)}
                  className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white"
                >
                  <option value="US_915">US 915 MHz</option>
                  <option value="EU_868">EU 868 MHz</option>
                  <option value="ANZ_915">ANZ 915 MHz</option>
                  <option value="JP_920">JP 920 MHz</option>
                  <option value="IN_865">IN 865 MHz</option>
                </select>
                <select
                  value={newServerModem}
                  onChange={(e) => setNewServerModem(e.target.value as LoRaModemPreset)}
                  className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white"
                >
                  <option value="LongFast">LongFast (SF11)</option>
                  <option value="MediumFast">MediumFast (SF9)</option>
                  <option value="ShortTurbo">ShortTurbo (SF7)</option>
                  <option value="LongSlow">LongSlow (SF12)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreateServerModal(false)} className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-300 cursor-pointer">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white cursor-pointer">
                Create Mesh
              </button>
            </div>
          </form>
        </div>
      )}

      {showCreateChannelModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateChannel}
            className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Create Channel</h3>
              <button type="button" onClick={() => setShowCreateChannelModal(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['text', 'social', 'voice'] as LoRaChannelKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setNewChannelKind(k)}
                  className={`py-2 rounded-xl border text-xs font-semibold capitalize cursor-pointer ${
                    newChannelKind === k
                      ? 'bg-cyan-600/25 border-cyan-400 text-cyan-200'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
                >
                  {k === 'voice' ? 'Voice & Video' : k}
                </button>
              ))}
            </div>
            <input
              type="text"
              required
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              placeholder={newChannelKind === 'voice' ? 'Room name (e.g. Video Hangout)' : 'channel-name'}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white"
            />
            <input
              type="text"
              value={newChannelTopic}
              onChange={(e) => setNewChannelTopic(e.target.value)}
              placeholder="Optional topic or description"
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreateChannelModal(false)} className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-300 cursor-pointer">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white cursor-pointer">
                Create Channel
              </button>
            </div>
          </form>
        </div>
      )}

      {showRadioModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveRadio}
            className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">LoRa RF Modem &amp; Encryption Settings</h3>
              <button type="button" onClick={() => setShowRadioModal(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Region Band</label>
                <select
                  value={radioRegion}
                  onChange={(e) => setRadioRegion(e.target.value as LoRaRegion)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white"
                >
                  <option value="US_915">US 915 MHz</option>
                  <option value="EU_868">EU 868 MHz</option>
                  <option value="ANZ_915">ANZ 915 MHz</option>
                  <option value="JP_920">JP 920 MHz</option>
                  <option value="IN_865">IN 865 MHz</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Modem Preset</label>
                <select
                  value={radioModem}
                  onChange={(e) => setRadioModem(e.target.value as LoRaModemPreset)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white"
                >
                  <option value="LongFast">LongFast (SF11 / 250kHz)</option>
                  <option value="MediumFast">MediumFast (SF9 / 250kHz)</option>
                  <option value="ShortTurbo">ShortTurbo (SF7 / 500kHz)</option>
                  <option value="LongSlow">LongSlow (SF12 / 125kHz)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Max Hop Limit (1–7)</label>
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={radioHopLimit}
                  onChange={(e) => setRadioHopLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">AES-256 Channel PSK Label</label>
                <input
                  type="text"
                  value={radioPsk}
                  onChange={(e) => setRadioPsk(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowRadioModal(false)} className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-300 cursor-pointer">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white cursor-pointer">
                Save RF Profile
              </button>
            </div>
          </form>
        </div>
      )}

      {showHuddleModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Launch Multi-Agent Huddle</h3>
              <button type="button" onClick={() => setShowHuddleModal(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              value={huddleTopic}
              onChange={(e) => setHuddleTopic(e.target.value)}
              placeholder="Huddle topic (e.g. Base liquidity & off-grid mesh security)"
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white"
            />
            <div className="space-y-1.5">
              <div className="text-[11px] text-zinc-400">Pick up to 3 agents to debate live:</div>
              <div className="flex flex-wrap gap-1.5">
                {agents.map((ag) => {
                  const picked = huddleAgentIds.includes(ag.id);
                  return (
                    <button
                      key={ag.id}
                      type="button"
                      onClick={() =>
                        setHuddleAgentIds((prev) =>
                          prev.includes(ag.id)
                            ? prev.filter((id) => id !== ag.id)
                            : prev.length < 3
                            ? [...prev, ag.id]
                            : [...prev.slice(1), ag.id]
                        )
                      }
                      className={`px-2.5 py-1 rounded-full text-[11px] border cursor-pointer ${
                        picked
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      {ag.displayName}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowHuddleModal(false)} className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-300 cursor-pointer">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRunHuddle}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white cursor-pointer"
              >
                Start Huddle
              </button>
            </div>
          </div>
        </div>
      )}
      {showFederationModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Cross-Network SoS Mesh Federation</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFederationModal(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-zinc-900/90 border border-zinc-800 p-3 space-y-1 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-400">Local Mesh ID</span>
                <span className="font-mono text-amber-300 font-bold">{localMeshId || 'sos-mesh-local'}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-400">Inbound Relay Endpoint</span>
                <span className="font-mono text-cyan-300 truncate">
                  {typeof window !== 'undefined' ? `${window.location.origin}/api/lora-mesh/federation/receive` : '/api/lora-mesh/federation/receive'}
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 pt-1">
                Packets from agents and humans automatically relay to linked peer SoS meshes with HMAC-SHA256 signatures for redundant A2A communication.
              </p>
            </div>

            <form onSubmit={handleAddFederatedPeer} className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={peerNameDraft}
                  onChange={(e) => setPeerNameDraft(e.target.value)}
                  placeholder="Peer Mesh Name (e.g. Edge Node Beta)"
                  className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white"
                />
                <input
                  type="text"
                  value={peerChannelDraft}
                  onChange={(e) => setPeerChannelDraft(e.target.value)}
                  placeholder="Target Channel (e.g. ch_agent_comms)"
                  className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white font-mono"
                />
              </div>
              <input
                type="url"
                required
                value={peerEndpointDraft}
                onChange={(e) => setPeerEndpointDraft(e.target.value)}
                placeholder="https://peer-host.example/api/lora-mesh/federation/receive"
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white font-mono"
              />
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={peerSecretDraft}
                  onChange={(e) => setPeerSecretDraft(e.target.value)}
                  placeholder="Optional HMAC Shared Secret"
                  className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white"
                />
                <button
                  type="submit"
                  disabled={busyAction === 'add-peer'}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  Link Peer
                </button>
              </div>
            </form>

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Linked Peer Meshes ({federatedPeers.length})
              </div>
              {federatedPeers.length === 0 ? (
                <div className="text-xs text-zinc-500 py-3 text-center rounded-xl bg-zinc-900/50 border border-zinc-800/80">
                  No external peer meshes linked yet. Add any SoS Mesh URL above to bridge networks.
                </div>
              ) : (
                federatedPeers.map((peer) => (
                  <div
                    key={peer.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate">{peer.name}</div>
                      <div className="text-[10px] font-mono text-zinc-400 truncate">{peer.endpointUrl}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFederatedPeer(peer.id)}
                      className="p-1.5 rounded-lg bg-rose-600/15 hover:bg-rose-600 text-rose-300 hover:text-white cursor-pointer shrink-0"
                      title="Disconnect peer mesh"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {lightboxMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxMedia(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxMedia.url}
              alt={lightboxMedia.name}
              className="max-w-full max-h-[80vh] rounded-xl border border-zinc-700 object-contain shadow-2xl"
            />
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
              <span className="font-semibold text-white">{lightboxMedia.name}</span>
              <span className="font-mono text-zinc-400">{formatAttachmentBytes(lightboxMedia.sizeBytes)}</span>
              <a
                href={`${lightboxMedia.url}?download=1`}
                download={lightboxMedia.name}
                className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </a>
              <button
                type="button"
                onClick={() => setLightboxMedia(null)}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* New Private DM or Group Chat Modal */}
      {showNewDmModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">New Private DM or Group Chat</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewDmModal(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-zinc-400">
              Select 1 person/agent for a private 1-on-1 DM, or select multiple to create a private Group Chat with private voice/video calls &amp; file sharing.
            </p>
            {dmSelectedIds.length > 1 && (
              <input
                type="text"
                value={dmGroupName}
                onChange={(e) => setDmGroupName(e.target.value)}
                placeholder="Optional Private Group Name..."
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white"
              />
            )}
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">People</div>
              {members
                .filter((m) => !m.isAgent && m.id !== currentUser?.id)
                .map((m) => {
                  const picked = dmSelectedIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() =>
                        setDmSelectedIds((prev) =>
                          prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                        )
                      }
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs cursor-pointer ${
                        picked
                          ? 'bg-indigo-500/20 border-indigo-400 text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <span className="font-semibold truncate">{m.displayName} (@{m.username})</span>
                      <span className={`text-[10px] font-mono ${m.online ? 'text-emerald-400' : 'text-zinc-500'}`}>
                        {picked ? 'SELECTED' : m.online ? 'ONLINE' : 'OFFLINE'}
                      </span>
                    </button>
                  );
                })}
              <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 pt-2">OS Agents</div>
              {agents.map((ag) => {
                const picked = dmSelectedIds.includes(ag.id);
                return (
                  <button
                    key={ag.id}
                    type="button"
                    onClick={() =>
                      setDmSelectedIds((prev) =>
                        prev.includes(ag.id) ? prev.filter((id) => id !== ag.id) : [...prev, ag.id]
                      )
                    }
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs cursor-pointer ${
                      picked
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <span className="font-semibold truncate">{ag.displayName}</span>
                    <span className="text-[10px] font-mono text-cyan-300">{picked ? 'SELECTED' : `@${ag.handle}`}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewDmModal(false)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={dmSelectedIds.length === 0 || busyAction === 'create-dm'}
                onClick={() => handleOpenOrCreateDirectThread(dmSelectedIds, dmGroupName)}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-bold text-white cursor-pointer"
              >
                {dmSelectedIds.length > 1 ? `Create Group (${dmSelectedIds.length + 1})` : 'Open Private DM'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Members to Active Private Chat Modal */}
      {showAddDmMembersModal && activeChannel?.isPrivate && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <form
            onSubmit={handleAddMembersToActiveDm}
            className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Add People or Agents to {activeChannel.name}</h3>
              <button
                type="button"
                onClick={() => setShowAddDmMembersModal(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1.5">
              {[...members.filter((m) => !m.isAgent), ...agents.map((a) => ({ id: a.id, displayName: a.displayName, username: a.handle, isAgent: true }))]
                .filter((p) => !(activeChannel.participantIds || []).includes(p.id))
                .map((p) => {
                  const picked = dmSelectedIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        setDmSelectedIds((prev) =>
                          prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                        )
                      }
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs cursor-pointer ${
                        picked
                          ? 'bg-indigo-500/20 border-indigo-400 text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                      }`}
                    >
                      <span className="truncate">{p.displayName}</span>
                      <span className="text-[10px] font-mono text-zinc-400">{picked ? 'ADD' : p.isAgent ? 'AGENT' : 'USER'}</span>
                    </button>
                  );
                })}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddDmMembersModal(false)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={dmSelectedIds.length === 0 || busyAction === 'add-dm-members'}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-bold text-white cursor-pointer"
              >
                Add Selected ({dmSelectedIds.length})
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
