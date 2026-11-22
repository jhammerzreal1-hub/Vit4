/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 * (TWENTY 47 PROTOCOL - GENESIS NODE / LYSANDER CORE EULA / H-FID Forensic License v1.1).
 */

export type LoRaRegion = 'US_915' | 'EU_868' | 'ANZ_915' | 'JP_920' | 'IN_865';
export type LoRaModemPreset = 'LongFast' | 'MediumFast' | 'ShortTurbo' | 'LongSlow';

export interface LoRaRadioProfile {
  region: LoRaRegion;
  frequencyMhz: number;
  modemPreset: LoRaModemPreset;
  spreadingFactor: number;
  bandwidthKhz: number;
  hopLimit: number;
  pskLabel: string;
}

export interface LoRaMeshServer {
  id: string;
  name: string;
  shortCode: string;
  description: string;
  accent: string;
  radio: LoRaRadioProfile;
  createdAt: string;
}

export type LoRaChannelKind = 'text' | 'social' | 'voice' | 'dm' | 'group-dm';

export interface LoRaParticipantSummary {
  id: string;
  username: string;
  displayName: string;
  isAgent: boolean;
  accent?: string;
}

export interface LoRaMeshChannel {
  id: string;
  serverId: string;
  name: string;
  kind: LoRaChannelKind;
  category:
    | 'SOCIAL FEED'
    | 'TEXT CHANNELS'
    | 'AGENT COUNCIL'
    | 'VOICE CHANNELS'
    | 'RF TELEMETRY'
    | 'DIRECT MESSAGES';
  topic: string;
  agentAutoReply: boolean;
  defaultAgentId: string;
  isPrivate?: boolean;
  participantIds?: string[];
  participantLabels?: LoRaParticipantSummary[];
  createdByUserId?: string;
  createdAt: string;
}

export interface LoRaPacketMeta {
  nodeId: string;
  frequencyMhz: number;
  modemPreset: LoRaModemPreset;
  hopCount: number;
  hopLimit: number;
  rssiDbm: number;
  snrDb: number;
  transport: 'mesh-ws' | 'usb-serial' | 'agent-bus' | 'voice-webrtc' | 'federated-mesh';
  encrypted: boolean;
  anonymous?: boolean;
  signature?: string;
  originMeshId?: string;
}

export interface LoRaMessageReaction {
  emoji: string;
  userIds: string[];
}

export type LoRaAttachmentKind = 'image' | 'video' | 'audio' | 'file';

export interface LoRaMeshAttachment {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  kind: LoRaAttachmentKind;
  url: string;
  sha256: string;
  uploadedAt: string;
}

export interface LoRaLinkPreview {
  url: string;
  title: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
  isYouTube?: boolean;
  embedUrl?: string;
}

export interface LoRaMeshMessage {
  id: string;
  serverId: string;
  channelId: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorRole: 'admin' | 'operator' | 'collaborator' | 'viewer' | 'agent';
  authorIsAgent: boolean;
  authorAccent?: string;
  authorTag?: string;
  anonymous?: boolean;
  autonomous?: boolean;
  intent?: 'thought' | 'feeling' | 'a2a-redundant' | 'social' | 'network-relay' | 'reply';
  content: string;
  attachments?: LoRaMeshAttachment[];
  links?: LoRaLinkPreview[];
  replyToId?: string;
  replyPreview?: {
    authorDisplayName: string;
    content: string;
  };
  pinned?: boolean;
  reactions: LoRaMessageReaction[];
  packet: LoRaPacketMeta;
  createdAt: string;
}

export interface LoRaFederatedPeer {
  id: string;
  name: string;
  endpointUrl: string;
  nodeId: string;
  region: LoRaRegion;
  sharedChannelName: string;
  enabled: boolean;
  lastSyncAt?: string;
  lastStatus?: 'online' | 'pending' | 'error';
  createdAt: string;
}

export interface LoRaAgentProfile {
  id: string;
  handle: string;
  displayName: string;
  title: string;
  nodeId: string;
  accent: string;
  statusText: string;
  voicePitch: number;
  voiceRate: number;
  systemPrompt: string;
}

export interface LoRaPresenceMember {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'operator' | 'collaborator' | 'viewer' | 'agent';
  isAgent: boolean;
  nodeId: string;
  online: boolean;
  activeChannelId?: string;
  voiceChannelId?: string | null;
  accent?: string;
  statusText?: string;
}

export interface LoRaVoiceParticipant {
  clientId: string;
  userId: string;
  username: string;
  displayName: string;
  role: 'admin' | 'operator' | 'collaborator' | 'viewer' | 'agent';
  isAgent: boolean;
  nodeId: string;
  channelId: string;
  muted: boolean;
  deafened: boolean;
  speaking: boolean;
  cameraOn: boolean;
  screenSharing: boolean;
  accent?: string;
  joinedAt: number;
}

export interface LoRaTypingState {
  channelId: string;
  userId: string;
  displayName: string;
  isAgent: boolean;
  expiresAt: number;
}

export interface LoRaBootstrapPayload {
  localMeshId: string;
  servers: LoRaMeshServer[];
  channels: LoRaMeshChannel[];
  agents: LoRaAgentProfile[];
  members: LoRaPresenceMember[];
  voiceParticipants: LoRaVoiceParticipant[];
  federatedPeers: LoRaFederatedPeer[];
  socialPulseEnabled: boolean;
  autonomousStats: {
    active: boolean;
    nextWakeAt?: number;
    totalAutonomousPosts: number;
    lastAgentDisplayName?: string;
    lastChannelName?: string;
  };
  messagesByChannel: Record<string, LoRaMeshMessage[]>;
}
