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

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Mail, 
  Inbox, 
  Send, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  ExternalLink, 
  Shield, 
  Key, 
  Clock, 
  Sparkles, 
  Search, 
  Layers, 
  Download, 
  Eye, 
  Flame, 
  Archive,
  AlertCircle,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  Globe,
  Sliders,
  CheckCircle2,
  Terminal,
  Volume2,
  VolumeX,
  Radio,
  X
} from 'lucide-react';

export interface BurnerIdentity {
  id: string;
  address: string;
  domain: string;
  provider: 'secmail' | 'mailtm' | 'guerrilla' | 'tempmail' | 'sovereign' | string;
  token: string;
  password?: string;
  alias?: string;
  createdAt: string;
  tag?: string;
}

export interface BurnerMessageItem {
  id: string;
  from: {
    address: string;
    name?: string;
  };
  to?: Array<{ address: string; name?: string }>;
  recipientAddress?: string; // used for unified inbox view
  subject: string;
  intro?: string;
  createdAt: string;
  isRead?: boolean;
  hasAttachments?: boolean;
  size?: number;
  otpCode?: string | null;
  otpCandidates?: string[];
  verificationLinks?: string[];
  text?: string;
  html?: string;
  allUrls?: string[];
  archivedLocally?: boolean;
}

interface BurnerMailModuleProps {
  userId?: string;
  onSaveToVault?: (
    type: 'knowledge' | 'dossier' | 'transcription',
    title: string,
    prompt: string,
    model: string,
    mediaUrl?: string,
    metadataJson?: string
  ) => void;
  onNavigateUrlInBrowser?: (url: string) => void;
}

const STORAGE_KEY = 'aurelius_burner_inboxes_v2';
const ACTIVE_ID_KEY = 'aurelius_burner_active_id_v2';
const MESSAGES_STORAGE_KEY = 'aurelius_burner_messages_v2';
const DELETED_IDS_STORAGE_KEY = 'aurelius_burner_deleted_ids_v1';

// Non-destructive merge: keeps every previously received message unless explicitly deleted by the user,
// and always prefers the richest hydrated fields (text, html, otpCode, otpCandidates, verificationLinks).
function mergeMessageRecords(
  existing: BurnerMessageItem,
  incoming: BurnerMessageItem
): BurnerMessageItem {
  const bestText =
    (incoming.text && incoming.text.trim().length >= (existing.text || '').trim().length)
      ? incoming.text
      : (existing.text || incoming.text);
  const bestHtml =
    (incoming.html && incoming.html.trim().length >= (existing.html || '').trim().length)
      ? incoming.html
      : (existing.html || incoming.html);
  const bestIntro =
    (incoming.intro && incoming.intro.trim().length > (existing.intro || '').trim().length)
      ? incoming.intro
      : (existing.intro || incoming.intro);

  const otpCandidates = Array.from(
    new Set([...(incoming.otpCandidates || []), ...(existing.otpCandidates || [])].filter(Boolean))
  );
  const verificationLinks = Array.from(
    new Set([...(incoming.verificationLinks || []), ...(existing.verificationLinks || [])].filter(Boolean))
  );
  const allUrls = Array.from(
    new Set([...(incoming.allUrls || []), ...(existing.allUrls || [])].filter(Boolean))
  );

  return {
    ...existing,
    ...incoming,
    id: existing.id,
    subject:
      incoming.subject && incoming.subject !== '(No Subject)'
        ? incoming.subject
        : (existing.subject || incoming.subject || '(No Subject)'),
    intro: bestIntro,
    text: bestText,
    html: bestHtml,
    recipientAddress: incoming.recipientAddress || existing.recipientAddress,
    otpCode: incoming.otpCode || existing.otpCode || otpCandidates[0] || null,
    otpCandidates,
    verificationLinks,
    allUrls,
    archivedLocally: Boolean(existing.archivedLocally || incoming.archivedLocally || true)
  };
}

function mergeInboxMessageList(
  existingList: BurnerMessageItem[],
  incomingList: BurnerMessageItem[],
  deletedIds: Set<string>
): { merged: BurnerMessageItem[]; newlyArrived: BurnerMessageItem[] } {
  const map = new Map<string, BurnerMessageItem>();
  const existingIds = new Set<string>();

  for (const msg of existingList) {
    if (!msg?.id || deletedIds.has(msg.id)) continue;
    map.set(msg.id, msg);
    existingIds.add(msg.id);
  }

  const newlyArrived: BurnerMessageItem[] = [];
  for (const msg of incomingList) {
    if (!msg?.id || deletedIds.has(msg.id)) continue;
    const prev = map.get(msg.id);
    if (prev) {
      map.set(msg.id, mergeMessageRecords(prev, msg));
    } else {
      map.set(msg.id, { ...msg, archivedLocally: true });
      newlyArrived.push(msg);
    }
  }

  const merged = Array.from(map.values()).sort(
    (a, b) => (new Date(b.createdAt).getTime() || 0) - (new Date(a.createdAt).getTime() || 0)
  );

  return { merged, newlyArrived };
}

export const BurnerMailModule: React.FC<BurnerMailModuleProps> = ({
  userId,
  onSaveToVault,
  onNavigateUrlInBrowser
}) => {
  // Identities
  const [inboxes, setInboxes] = useState<BurnerIdentity[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((item: any) => 
            item && 
            item.address
          );
        }
      }
    } catch (_) {}
    return [];
  });

  const [activeInboxId, setActiveInboxId] = useState<string>(() => {
    try {
      return localStorage.getItem(ACTIVE_ID_KEY) || 'all';
    } catch (_) {
      return 'all';
    }
  });

  // Providers & domains info
  const [providersInfo, setProvidersInfo] = useState<any[]>([]);

  // Messages per identity: persisted to localStorage so received OTP emails NEVER disappear on refresh or upstream expiry
  const [messagesByInbox, setMessagesByInbox] = useState<Record<string, BurnerMessageItem[]>>(() => {
    try {
      const saved = localStorage.getItem(MESSAGES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch (_) {}
    return {};
  });
  const messagesByInboxRef = useRef<Record<string, BurnerMessageItem[]>>(messagesByInbox);
  useEffect(() => {
    messagesByInboxRef.current = messagesByInbox;
  }, [messagesByInbox]);

  // Explicitly user-deleted message IDs (only these are filtered out during non-destructive sync)
  const [deletedMessageIds, setDeletedMessageIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(DELETED_IDS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return [];
  });
  const deletedIdsRef = useRef<Set<string>>(new Set(deletedMessageIds));
  useEffect(() => {
    deletedIdsRef.current = new Set(deletedMessageIds);
    try {
      localStorage.setItem(DELETED_IDS_STORAGE_KEY, JSON.stringify(deletedMessageIds.slice(0, 500)));
    } catch (_) {}
  }, [deletedMessageIds]);

  // Selection and reading state
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const selectedMessageIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedMessageIdRef.current = selectedMessageId;
  }, [selectedMessageId]);
  const [activeMessageDetail, setActiveMessageDetail] = useState<BurnerMessageItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailViewMode, setDetailViewMode] = useState<'html' | 'text' | 'security' | 'ai'>('html');

  // AI Security Forensics State
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [analyzingAi, setAnalyzingAi] = useState<boolean>(false);

  // Domain & MX Health State
  const [showDomainHealthModal, setShowDomainHealthModal] = useState<boolean>(false);
  const [domainHealthData, setDomainHealthData] = useState<any[]>([]);
  const [loadingDomainHealth, setLoadingDomainHealth] = useState<boolean>(false);

  // Webhook & Termux Relay State
  const [showRelayModal, setShowRelayModal] = useState<boolean>(false);
  const [webhookUrl, setWebhookUrl] = useState<string>(() => localStorage.getItem('burner_webhook_url') || '');
  const [notifyTermux, setNotifyTermux] = useState<boolean>(() => localStorage.getItem('burner_notify_termux') === 'true');
  const [isRelaying, setIsRelaying] = useState<boolean>(false);

  // Outbound Reply / Dispatcher State
  const [showReplyModal, setShowReplyModal] = useState<boolean>(false);
  const [replyRecipient, setReplyRecipient] = useState<string>('');
  const [replySubject, setReplySubject] = useState<string>('');
  const [replyBody, setReplyBody] = useState<string>('');
  const [sendingReply, setSendingReply] = useState<boolean>(false);

  // Generation Controls
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationCount, setGenerationCount] = useState<number>(1);
  const [selectedProvider, setSelectedProvider] = useState<'auto' | 'secmail' | 'mailtm' | 'tempmail' | 'guerrilla' | 'sovereign'>('auto');
  const [customPrefix, setCustomPrefix] = useState('');
  const [showBatchModal, setShowBatchModal] = useState(false);

  // Auto-refresh polling
  const [autoRefreshSecs, setAutoRefreshSecs] = useState<number>(10);
  const [countdown, setCountdown] = useState<number>(10);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Test Email Dispatcher
  const [showTestModal, setShowTestModal] = useState(false);
  const [testTemplate, setTestTemplate] = useState<'google-verify' | 'github-auth' | 'discord-claim' | 'custom'>('google-verify');
  const [testCustomSubject, setTestCustomSubject] = useState('');
  const [testCustomSender, setTestCustomSender] = useState('');
  const [testCustomBody, setTestCustomBody] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Feedback states
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Web Audio chime for new incoming emails
  const playChime = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.onended = () => {
        if (ctx.state !== 'closed') {
          try {
            ctx.close().catch(() => {});
          } catch {}
        }
      };
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (_) {}
  }, [soundEnabled]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 3200);
  };

  const handleCopy = (text: string, label: string = 'Copied') => {
    if (!text) return;
    const fallbackCopy = () => {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        ta.style.pointerEvents = 'none';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch (_) {}
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(fallbackCopy);
    } else {
      fallbackCopy();
    }

    setCopiedText(text);
    showToast(`${label} copied to clipboard!`);
    setTimeout(() => {
      setCopiedText(prev => (prev === text ? null : prev));
    }, 2200);
  };

  // Sync inboxes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inboxes));
      localStorage.setItem(ACTIVE_ID_KEY, activeInboxId);
    } catch (_) {}
  }, [inboxes, activeInboxId]);

  // Sync received messages archive to localStorage (quota-safe: preserves text & OTP even if HTML is huge)
  useEffect(() => {
    try {
      localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messagesByInbox));
    } catch (_) {
      try {
        const compact: Record<string, BurnerMessageItem[]> = {};
        Object.entries(messagesByInbox).forEach(([k, list]) => {
          compact[k] = (list || []).slice(0, 60).map(m => ({
            ...m,
            html: m.html && m.html.length > 40000 ? undefined : m.html
          }));
        });
        localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(compact));
      } catch (_) {}
    }
  }, [messagesByInbox]);

  // Load available providers and initial domains
  useEffect(() => {
    fetch('/api/burner/providers')
      .then(res => res.json())
      .then(data => {
        if (data && data.providers) {
          setProvidersInfo(data.providers);
        }
      })
      .catch(err => console.warn('Provider check error:', err));
  }, []);

  // Generate Single Burner Address
  const handleGenerateBurner = async (providerOverride?: 'auto' | 'sovereign' | 'mailtm' | 'tempmail' | 'guerrilla', prefixOverride?: string) => {
    setIsGenerating(true);
    try {
      const prov = providerOverride || selectedProvider;
      const pref = prefixOverride !== undefined ? prefixOverride : customPrefix;

      const res = await fetch('/api/burner/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: prov,
          customPrefix: pref
        })
      });

      const data = await res.json();
      if (data.success && data.identity) {
        const newIdent: BurnerIdentity = data.identity;
        setInboxes(prev => [newIdent, ...prev]);
        setActiveInboxId(newIdent.id);
        setCustomPrefix('');
        showToast(`Created ${newIdent.address}`);
        // Fetch welcome or initial messages immediately
        fetchMessagesForInbox(newIdent, true);
      } else {
        showToast(`Error: ${data.error || 'Failed to create email'}`);
      }
    } catch (e: any) {
      showToast(`Error: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Batch Generate Multiple Addresses
  const handleBatchGenerate = async () => {
    if (generationCount <= 1) {
      return handleGenerateBurner();
    }
    setIsGenerating(true);
    try {
      const res = await fetch('/api/burner/batch-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count: generationCount,
          provider: selectedProvider,
          customPrefix: customPrefix
        })
      });

      const data = await res.json();
      if (data.success && data.identities?.length) {
        const newIdentities: BurnerIdentity[] = data.identities;
        setInboxes(prev => [...newIdentities, ...prev]);
        setActiveInboxId(newIdentities[0].id);
        setShowBatchModal(false);
        setCustomPrefix('');
        showToast(`Generated ${newIdentities.length} burner inboxes simultaneously!`);
        // Trigger parallel fetch for all
        newIdentities.forEach(ident => fetchMessagesForInbox(ident, false));
      } else {
        showToast(`Batch generation failed: ${data.error || 'Unknown error'}`);
      }
    } catch (e: any) {
      showToast(`Batch generation error: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Fetch messages for a specific inbox (NON-DESTRUCTIVE additive merge so upstream empty polls NEVER wipe emails!)
  const fetchMessagesForInbox = async (inbox: BurnerIdentity, notifyIfNew: boolean = false) => {
    try {
      const res = await fetch('/api/burner/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: inbox.provider,
          token: inbox.token,
          address: inbox.address,
          password: inbox.password
        })
      });

      if (res.ok) {
        const data = await res.json();

        // Auto-update token if backend refreshed it
        if (data.newToken && data.newToken !== inbox.token) {
          setInboxes(prev => prev.map(i => i.id === inbox.id ? { ...i, token: data.newToken } : i));
        }

        const incomingList: BurnerMessageItem[] = (data.messages || []).map((m: any) => ({
          ...m,
          recipientAddress: inbox.address
        }));

        const existingForInbox = messagesByInboxRef.current[inbox.id] || [];
        const { merged: previewMerged, newlyArrived } = mergeInboxMessageList(
          existingForInbox,
          incomingList,
          deletedIdsRef.current
        );

        const upgradedActive: BurnerMessageItem | null = selectedMessageIdRef.current
          ? (previewMerged.find(m => m.id === selectedMessageIdRef.current) || null)
          : null;

        setMessagesByInbox(prev => {
          const oldList = prev[inbox.id] || [];
          const { merged } = mergeInboxMessageList(oldList, incomingList, deletedIdsRef.current);
          const next = {
            ...prev,
            [inbox.id]: merged
          };
          messagesByInboxRef.current = next;
          return next;
        });

        if (newlyArrived.length > 0) {
          const newest = newlyArrived[0];
          if (notifyIfNew) {
            playChime();
            const otpSuffix = newest.otpCode ? ` · OTP: ${newest.otpCode}` : '';
            showToast(`New email from ${newest.from?.name || newest.from?.address || 'Sender'}${otpSuffix}`);
          }
          // Auto-open the newly received email if user hasn't opened a message yet so OTP is immediately visible
          if (!selectedMessageIdRef.current) {
            setSelectedMessageId(newest.id);
            setActiveMessageDetail(newest);
          }
        } else if (upgradedActive) {
          setActiveMessageDetail(prev =>
            prev && prev.id === upgradedActive.id ? mergeMessageRecords(prev, upgradedActive) : prev
          );
        }
      }
    } catch (e) {
      console.warn(`Failed fetching messages for ${inbox.address}:`, e);
    }
  };

  // Sync all inboxes
  const syncAllInboxes = useCallback(async (notify: boolean = false) => {
    if (inboxes.length === 0) return;
    setIsRefreshing(true);
    try {
      const promises = inboxes.map(inbox => fetchMessagesForInbox(inbox, notify));
      await Promise.allSettled(promises);
      setLastSyncTime(new Date().toLocaleTimeString());
    } finally {
      setIsRefreshing(false);
    }
  }, [inboxes]);

  // Initial auto-generation if user opens the module with 0 inboxes
  useEffect(() => {
    if (inboxes.length === 0 && !isGenerating) {
      handleGenerateBurner('auto');
    }
  }, []);

  // Initial load messages on mount or when inboxes change
  useEffect(() => {
    if (inboxes.length > 0) {
      syncAllInboxes(false);
    }
  }, [inboxes.length]);

  // Periodic Auto-refresh Timer
  useEffect(() => {
    if (autoRefreshSecs <= 0 || inboxes.length === 0) return;
    setCountdown(autoRefreshSecs);

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          syncAllInboxes(true);
          return autoRefreshSecs;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefreshSecs, inboxes, syncAllInboxes]);

  // Active inbox item or null (if 'all' is selected)
  const currentInbox = useMemo(() => {
    if (activeInboxId === 'all') return null;
    return inboxes.find(i => i.id === activeInboxId) || null;
  }, [inboxes, activeInboxId]);

  // Aggregated or filtered message list
  const currentMessages = useMemo(() => {
    let list: BurnerMessageItem[] = [];
    if (activeInboxId === 'all') {
      // Collect messages across all inboxes
      Object.entries(messagesByInbox || {}).forEach(([inboxId, msgs]) => {
        const found = inboxes.find(i => i.id === inboxId);
        if (Array.isArray(msgs)) {
          msgs.forEach(m => {
            list.push({
              ...m,
              recipientAddress: m.recipientAddress || found?.address
            });
          });
        }
      });
    } else {
      list = [...(messagesByInbox[activeInboxId] || [])];
    }

    // Sort newest first
    list.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime() || 0;
      const timeB = new Date(b.createdAt).getTime() || 0;
      return timeB - timeA;
    });

    // Apply search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(m => 
        m.subject.toLowerCase().includes(q) ||
        (m.from?.address || '').toLowerCase().includes(q) ||
        (m.from?.name || '').toLowerCase().includes(q) ||
        (m.intro || '').toLowerCase().includes(q) ||
        (m.recipientAddress || '').toLowerCase().includes(q) ||
        (m.otpCode || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [messagesByInbox, activeInboxId, inboxes, searchQuery]);

  // Total unread / total count
  const totalMessageCount = useMemo(() => {
    return Object.values(messagesByInbox).reduce((acc, msgs) => acc + msgs.length, 0);
  }, [messagesByInbox]);

  // Fetch Message Detail when a message is selected (never wipes already-hydrated message on upstream 404)
  const handleSelectMessage = async (msg: BurnerMessageItem) => {
    setSelectedMessageId(msg.id);
    setActiveMessageDetail(msg);
    setAiAnalysis(null);

    const alreadyHydrated = Boolean((msg.html && msg.html.trim().length > 0) || (msg.text && msg.text.trim().length > 0));

    // Determine target inbox to get provider & token
    let targetInbox = currentInbox;
    if (!targetInbox && msg.recipientAddress) {
      targetInbox = inboxes.find(i => i.address.toLowerCase() === msg.recipientAddress?.toLowerCase()) || null;
    }
    if (!targetInbox && inboxes.length > 0) {
      targetInbox = inboxes[0];
    }

    if (!targetInbox) return;

    if (!alreadyHydrated) {
      setLoadingDetail(true);
    }
    try {
      const res = await fetch('/api/burner/message-detail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: targetInbox.provider,
          token: targetInbox.token,
          messageId: msg.id,
          address: targetInbox.address,
          password: targetInbox.password
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.message) {
          const hydrated: BurnerMessageItem = mergeMessageRecords(msg, {
            ...data.message,
            recipientAddress: msg.recipientAddress || targetInbox.address
          });
          setActiveMessageDetail(prev => (prev && prev.id === msg.id ? hydrated : prev));
          // Also save hydrated body + OTP back into messagesByInbox so it stays persisted locally
          const inboxIdToUpdate = targetInbox.id;
          setMessagesByInbox(prev => {
            const list = prev[inboxIdToUpdate] || [];
            const exists = list.some(m => m.id === hydrated.id);
            const nextList = exists
              ? list.map(m => (m.id === hydrated.id ? mergeMessageRecords(m, hydrated) : m))
              : [hydrated, ...list];
            return { ...prev, [inboxIdToUpdate]: nextList };
          });
        }
      }
    } catch (e) {
      console.warn('Error fetching message details:', e);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Delete message (explicit user action — tombstones ID so it won't resurrect on poll)
  const handleDeleteMessage = async (msgId: string) => {
    const target = activeMessageDetail || currentMessages.find(m => m.id === msgId);
    let targetInbox = currentInbox;
    if (!targetInbox && target?.recipientAddress) {
      targetInbox = inboxes.find(i => i.address.toLowerCase() === target.recipientAddress?.toLowerCase()) || null;
    }
    if (!targetInbox && inboxes.length > 0) targetInbox = inboxes[0];

    setDeletedMessageIds(prev => (prev.includes(msgId) ? prev : [msgId, ...prev]));
    deletedIdsRef.current.add(msgId);

    try {
      await fetch('/api/burner/delete-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: targetInbox?.provider || 'mailtm',
          token: targetInbox?.token || '',
          messageId: msgId,
          address: targetInbox?.address || ''
        })
      });

      // Remove from local state
      setMessagesByInbox(prev => {
        const updated: Record<string, BurnerMessageItem[]> = {};
        Object.entries(prev || {}).forEach(([key, list]) => {
          updated[key] = Array.isArray(list) ? list.filter(m => m.id !== msgId) : [];
        });
        return updated;
      });

      if (selectedMessageId === msgId) {
        setSelectedMessageId(null);
        setActiveMessageDetail(null);
      }
      showToast('Message deleted.');
    } catch (e: any) {
      showToast(`Delete failed: ${e.message}`);
    }
  };

  // Delete Entire Burner Inbox
  const handleDeleteInbox = (inboxId: string) => {
    const target = inboxes.find(i => i.id === inboxId);
    if (!target) return;

    setInboxes(prev => prev.filter(i => i.id !== inboxId));
    setMessagesByInbox(prev => {
      const copy = { ...prev };
      delete copy[inboxId];
      return copy;
    });

    if (activeInboxId === inboxId) {
      setActiveInboxId(inboxes.length > 1 ? inboxes[1].id : 'all');
      setSelectedMessageId(null);
      setActiveMessageDetail(null);
    }

    showToast(`Deleted inbox ${target.address}`);
  };

  // Run AI Security Forensics on Active Message
  const runAiAnalysis = async () => {
    if (!activeMessageDetail) return;
    setAnalyzingAi(true);
    setDetailViewMode('ai');
    try {
      const res = await fetch('/api/burner/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: activeMessageDetail.subject,
          from: activeMessageDetail.from,
          to: activeMessageDetail.to,
          text: activeMessageDetail.text || activeMessageDetail.intro,
          html: activeMessageDetail.html,
          otpCode: activeMessageDetail.otpCode,
          urls: activeMessageDetail.allUrls
        })
      });
      const data = await res.json();
      if (data.success && data.analysis) {
        setAiAnalysis(data.analysis);
        showToast('AI Security Forensics synthesis complete.');
      }
    } catch (e: any) {
      showToast(`AI Analysis error: ${e.message}`);
    } finally {
      setAnalyzingAi(false);
    }
  };

  // Fetch Domain & MX Deliverability Matrix
  const fetchDomainHealth = async () => {
    setLoadingDomainHealth(true);
    setShowDomainHealthModal(true);
    try {
      const res = await fetch('/api/burner/domain-health');
      const data = await res.json();
      if (data.success && data.domains) {
        setDomainHealthData(data.domains);
      }
    } catch (e: any) {
      showToast(`Domain health check failed: ${e.message}`);
    } finally {
      setLoadingDomainHealth(false);
    }
  };

  // Save Relay Settings
  const handleSaveRelaySettings = () => {
    try {
      localStorage.setItem('burner_webhook_url', webhookUrl);
      localStorage.setItem('burner_notify_termux', String(notifyTermux));
      showToast('Relay & Termux automation rules saved.');
      setShowRelayModal(false);
    } catch (_) {}
  };

  // Send Outbound Reply / Disposable Dispatch
  const handleSendReply = async () => {
    const from = currentInbox?.address || inboxes[0]?.address;
    if (!from || !replyRecipient || !replyBody) {
      showToast('Recipient and message body are required.');
      return;
    }
    setSendingReply(true);
    try {
      const res = await fetch('/api/burner/send-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAddress: from,
          toAddress: replyRecipient,
          subject: replySubject,
          body: replyBody
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Outbound disposable dispatch transmitted!');
        setShowReplyModal(false);
        setReplyBody('');
        setReplySubject('');
        syncAllInboxes(true);
      } else {
        showToast(`Send failed: ${data.error || 'Unknown error'}`);
      }
    } catch (e: any) {
      showToast(`Send error: ${e.message}`);
    } finally {
      setSendingReply(false);
    }
  };

  // Send Test / Simulated Email
  const handleSendTestEmail = async () => {
    const target = currentInbox ? currentInbox.address : (inboxes[0]?.address || '');
    if (!target) {
      showToast('Please create or select an active burner inbox first.');
      return;
    }

    setIsSendingTest(true);
    try {
      const res = await fetch('/api/burner/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetAddress: target,
          template: testTemplate,
          customSubject: testCustomSubject,
          customSender: testCustomSender,
          customBody: testCustomBody
        })
      });

      const data = await res.json();
      if (data.success) {
        setShowTestModal(false);
        setTestCustomSubject('');
        setTestCustomBody('');
        showToast(`Sent test verification email to ${target}!`);
        // Immediate sync
        syncAllInboxes(true);
      } else {
        showToast(`Send failed: ${data.error || 'Unknown error'}`);
      }
    } catch (e: any) {
      showToast(`Send test error: ${e.message}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  // Save Email to Sovereign Vault
  const handleSaveEmailToVault = () => {
    if (!activeMessageDetail || !onSaveToVault) return;
    const title = `Email Dossier: ${activeMessageDetail.subject}`;
    const prompt = `From: ${activeMessageDetail.from?.name || ''} <${activeMessageDetail.from?.address || ''}>\nTo: ${activeMessageDetail.recipientAddress || ''}\nDate: ${activeMessageDetail.createdAt}\nSubject: ${activeMessageDetail.subject}\nOTP: ${activeMessageDetail.otpCode || 'None'}\n\nContent:\n${activeMessageDetail.text || activeMessageDetail.intro || ''}`;

    onSaveToVault(
      'dossier',
      title,
      prompt,
      'Burner Email Substrate',
      undefined,
      JSON.stringify({
        category: 'burner-email',
        messageId: activeMessageDetail.id,
        otpCode: activeMessageDetail.otpCode,
        from: activeMessageDetail.from,
        to: activeMessageDetail.to,
        urls: activeMessageDetail.allUrls,
        savedAt: new Date().toISOString()
      })
    );
    showToast('Email archived to Sovereign Vault!');
  };

  // Export current active inbox messages as JSON
  const handleExportJson = () => {
    const dataToExport = {
      inbox: currentInbox,
      exportedAt: new Date().toISOString(),
      messages: currentMessages
    };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `burner_emails_${currentInbox?.address || 'all'}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported messages JSON');
  };

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 min-h-[calc(100vh-130px)] text-zinc-100 font-sans selection:bg-amber-500/20 selection:text-amber-200">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 border border-amber-500/40 text-amber-200 px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-200 text-xs font-mono">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
          <button 
            onClick={() => setToastMessage(null)}
            className="text-zinc-500 hover:text-zinc-300 ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Banner / System Telemetry Bar */}
      <div className="border-b border-zinc-800/80 bg-zinc-900/60 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-zinc-100 tracking-tight">
                SOVEREIGN BURNER EMAIL MATRIX
              </h1>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ONLINE (DUAL-ENGINE)
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono">
              Real functional inboxes • Unlimited disposable addresses • Instant OTP decoding & link extraction
            </p>
          </div>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex items-center gap-2">
          {/* Audio Chime Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Disable incoming sound chime' : 'Enable incoming sound chime'}
            className={`p-2 rounded-md border text-xs font-mono transition-colors ${
              soundEnabled 
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                : 'bg-zinc-800/40 border-zinc-700/50 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Auto Refresh Interval Selector */}
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1.5 text-[11px] font-mono text-zinc-400">
            <Clock className="w-3.5 h-3.5 text-amber-400/80" />
            <select
              value={autoRefreshSecs}
              onChange={(e) => setAutoRefreshSecs(Number(e.target.value))}
              className="bg-transparent text-zinc-300 focus:outline-none cursor-pointer"
            >
              <option value={5} className="bg-zinc-900 text-zinc-200">5s Poll</option>
              <option value={10} className="bg-zinc-900 text-zinc-200">10s Poll</option>
              <option value={30} className="bg-zinc-900 text-zinc-200">30s Poll</option>
              <option value={0} className="bg-zinc-900 text-zinc-200">Manual</option>
            </select>
            {autoRefreshSecs > 0 && (
              <span className="text-[10px] text-amber-400 font-semibold w-5 text-right">
                {countdown}s
              </span>
            )}
          </div>

          {/* Sync Now Button */}
          <button
            onClick={() => syncAllInboxes(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-800/80 hover:bg-zinc-750 text-zinc-200 border border-zinc-700 text-xs font-mono transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>

          {/* Live Test Dispatcher */}
          <button
            onClick={() => setShowTestModal(true)}
            disabled={inboxes.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono transition-all shadow-sm"
          >
            <Send className="w-3.5 h-3.5 text-amber-400" />
            <span>Send Test Email</span>
          </button>

          {/* Domain & MX Deliverability Matrix */}
          <button
            onClick={fetchDomainHealth}
            disabled={loadingDomainHealth}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-800/80 hover:bg-zinc-750 text-zinc-300 border border-zinc-700 text-xs font-mono transition-colors"
            title="Inspect MX records & DNS deliverability health"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">MX Matrix</span>
          </button>

          {/* Automated Webhook & Termux Relay */}
          <button
            onClick={() => setShowRelayModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-800/80 hover:bg-zinc-750 text-zinc-300 border border-zinc-700 text-xs font-mono transition-colors"
            title="Configure Webhook & Termux Haptic / Voice Relay"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Relay</span>
          </button>

          {/* Outbound Dispatcher */}
          <button
            onClick={() => {
              setReplyRecipient(activeMessageDetail?.from?.address || '');
              setReplySubject(activeMessageDetail ? `Re: ${activeMessageDetail.subject}` : 'Disposable Invariant Dispatch');
              setShowReplyModal(true);
            }}
            disabled={inboxes.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-800/80 hover:bg-zinc-750 text-zinc-300 border border-zinc-700 text-xs font-mono transition-colors"
            title="Compose Outbound Disposable Dispatch"
          >
            <Send className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden md:inline">Outbound</span>
          </button>

          {/* Instant 1-Click New Burner Button */}
          <button
            onClick={() => handleGenerateBurner()}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs font-mono transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>{isGenerating ? 'Generating...' : 'New Burner'}</span>
          </button>

          {/* Batch Generator Drawer / Modal trigger */}
          <button
            onClick={() => setShowBatchModal(true)}
            className="p-1.5 rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-xs font-mono"
            title="Batch Create Multiple Burner Addresses"
          >
            <Layers className="w-4 h-4 text-amber-400" />
          </button>

          {/* Export JSON Button */}
          <button
            onClick={handleExportJson}
            disabled={inboxes.length === 0}
            className="p-1.5 rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-xs font-mono"
            title="Export Inboxes & Messages JSON"
          >
            <Download className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </div>

      {/* Main 3-Column Layout: Left Inboxes Selector | Middle Messages Feed | Right Detail Viewer */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800/80 min-h-0">
        
        {/* LEFT COLUMN: Inboxes Selector & Management (col-span-3) */}
        <div className="lg:col-span-3 flex flex-col bg-zinc-950/70 overflow-hidden border-b lg:border-b-0 border-zinc-800">
          
          {/* Section Header */}
          <div className="p-3 border-b border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
              <Inbox className="w-4 h-4 text-amber-400" />
              <span className="font-semibold uppercase tracking-wider">Burner Identities</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700">
                {inboxes.length}
              </span>
            </div>

            <button
              onClick={() => handleGenerateBurner()}
              disabled={isGenerating}
              title="Quickly generate a new random email"
              className="text-[11px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 px-2 py-0.5 rounded hover:bg-amber-500/10 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          {/* Unified Inbox Switcher Item */}
          <div className="p-2 border-b border-zinc-800/60 bg-zinc-950">
            <button
              onClick={() => setActiveInboxId('all')}
              className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between ${
                activeInboxId === 'all'
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-200 shadow-sm'
                  : 'bg-zinc-900/40 hover:bg-zinc-900/80 border-zinc-800/70 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${
                  activeInboxId === 'all' ? 'bg-amber-500 text-zinc-950 font-bold' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold font-mono truncate">Unified Inbox Feed</div>
                  <div className="text-[10px] text-zinc-500 font-mono">All {inboxes.length} Burners Combined</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-zinc-800 text-amber-300 border border-zinc-700/60">
                {totalMessageCount}
              </span>
            </button>
          </div>

          {/* Inboxes List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 divide-y-0">
            {inboxes.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 text-xs font-mono">
                <Flame className="w-8 h-8 text-amber-500/40 mx-auto mb-2" />
                <p>No burner addresses active.</p>
                <button
                  onClick={() => handleGenerateBurner()}
                  className="mt-3 px-3 py-1.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] hover:bg-amber-500/30"
                >
                  Create First Burner
                </button>
              </div>
            ) : (
              inboxes.map(inbox => {
                const msgs = messagesByInbox[inbox.id] || [];
                const isActive = activeInboxId === inbox.id;

                return (
                  <div
                    key={inbox.id}
                    onClick={() => setActiveInboxId(inbox.id)}
                    className={`group relative p-2.5 rounded-lg border cursor-pointer transition-all ${
                      isActive 
                        ? 'bg-zinc-900/90 border-amber-500/50 shadow-md shadow-black/40' 
                        : 'bg-zinc-900/30 hover:bg-zinc-900/70 border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono uppercase font-semibold ${
                            inbox.provider === 'mailtm' 
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                              : inbox.provider === 'guerrilla'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}>
                            {inbox.provider}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono truncate">
                            {new Date(inbox.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="text-xs font-mono font-medium text-zinc-200 truncate group-hover:text-amber-200 transition-colors">
                          {inbox.address}
                        </div>
                      </div>

                      {/* Message Count Badge */}
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                        msgs.length > 0 
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                          : 'bg-zinc-800/80 text-zinc-500'
                      }`}>
                        {msgs.length}
                      </span>
                    </div>

                    {/* Quick Card Toolbar on Hover */}
                    <div className="mt-2 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(inbox.address, 'Address');
                        }}
                        className="hover:text-amber-300 flex items-center gap-1 transition-colors"
                        title="Copy Address"
                      >
                        {copiedText === inbox.address ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-zinc-400" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            fetchMessagesForInbox(inbox, true);
                          }}
                          className="hover:text-amber-300 transition-colors"
                          title="Refresh this inbox"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteInbox(inbox.id);
                          }}
                          className="hover:text-rose-400 transition-colors opacity-60 hover:opacity-100"
                          title="Delete this burner"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Left Footer: Quick Custom Generator Form */}
          <div className="p-3 border-t border-zinc-800/80 bg-zinc-900/50 space-y-2">
            <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-400">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>Quick Custom Prefix</span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="e.g. auditor_01"
                value={customPrefix}
                onChange={(e) => setCustomPrefix(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerateBurner()}
                className="flex-1 bg-zinc-950 border border-zinc-700/80 rounded px-2.5 py-1 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={() => handleGenerateBurner()}
                disabled={isGenerating}
                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded text-xs font-mono transition-colors"
              >
                Go
              </button>
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: Message Feed & Search (col-span-4) */}
        <div className="lg:col-span-4 flex flex-col bg-zinc-950 overflow-hidden border-b lg:border-b-0 border-zinc-800">
          
          {/* Search & Active Header */}
          <div className="p-3 border-b border-zinc-800/80 bg-zinc-900/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono font-semibold text-zinc-200 truncate">
                {currentInbox ? currentInbox.address : 'Unified Feed (All Inboxes)'}
              </div>
              <div className="text-[10px] font-mono text-zinc-500">
                {currentMessages.length} {currentMessages.length === 1 ? 'Message' : 'Messages'}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search subject, sender, OTP code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900/80 border border-zinc-800 rounded-md pl-8 pr-7 py-1.5 text-xs font-mono text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/70"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Sticky Latest Captured OTP Quick-Copy Bar */}
          {(() => {
            const latestOtpMsg = currentMessages.find(m => Boolean(m.otpCode));
            if (!latestOtpMsg?.otpCode) return null;
            return (
              <div className="px-3 py-2.5 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-zinc-900 border-b border-amber-500/40 flex items-center justify-between gap-2">
                <div
                  onClick={() => handleSelectMessage(latestOtpMsg)}
                  className="min-w-0 flex-1 cursor-pointer"
                  title="Click to open this OTP email"
                >
                  <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-semibold flex items-center gap-1.5">
                    <Key className="w-3 h-3 shrink-0" />
                    <span className="truncate">Latest OTP · {latestOtpMsg.from?.name || latestOtpMsg.from?.address}</span>
                  </div>
                  <div className="text-base font-mono font-bold text-amber-200 tracking-widest mt-0.5">
                    {latestOtpMsg.otpCode}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(latestOtpMsg.otpCode!, 'OTP Code')}
                  className="px-2.5 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 font-mono font-bold text-[11px] flex items-center gap-1.5 shrink-0 shadow transition-colors"
                >
                  {copiedText === latestOtpMsg.otpCode ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy OTP</span>
                    </>
                  )}
                </button>
              </div>
            );
          })()}

          {/* Messages List Feed */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60 p-2 space-y-1">
            {currentMessages.length === 0 ? (
              <div className="py-16 px-4 text-center text-zinc-500 font-mono text-xs">
                <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-3 text-zinc-600">
                  <Inbox className="w-6 h-6" />
                </div>
                <p className="font-semibold text-zinc-400">Waiting for incoming emails...</p>
                <p className="text-[11px] text-zinc-600 mt-1 max-w-xs mx-auto">
                  Copy the address above and use it to register on any platform. All incoming OTP emails are permanently archived locally so they never auto-delete.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <button
                    onClick={() => handleCopy(currentInbox ? currentInbox.address : inboxes[0]?.address || '')}
                    className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-[11px] flex items-center gap-1.5 transition-colors"
                  >
                    <Copy className="w-3 h-3 text-amber-400" />
                    <span>Copy Address</span>
                  </button>
                  <button
                    onClick={() => setShowTestModal(true)}
                    className="px-3 py-1.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] flex items-center gap-1.5 transition-colors"
                  >
                    <Send className="w-3 h-3 text-amber-400" />
                    <span>Send Test Email</span>
                  </button>
                </div>
              </div>
            ) : (
              currentMessages.map(msg => {
                const isSelected = selectedMessageId === msg.id;
                return (
                  <div
                    key={msg.id}
                    onClick={() => handleSelectMessage(msg)}
                    className={`p-3 rounded-lg cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/50 shadow-md'
                        : 'bg-zinc-900/30 hover:bg-zinc-900/80 border-transparent hover:border-zinc-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-zinc-200 truncate">
                            {msg.from?.name || msg.from?.address || 'Unknown Sender'}
                          </span>
                          {msg.otpCode && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(msg.otpCode!, 'OTP Code');
                              }}
                              title="Click to copy OTP code immediately"
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border border-amber-500/50 shrink-0 flex items-center gap-1 transition-colors"
                            >
                              <Key className="w-2.5 h-2.5" />
                              <span>OTP: {msg.otpCode}</span>
                              {copiedText === msg.otpCode ? (
                                <Check className="w-2.5 h-2.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-2.5 h-2.5 opacity-80" />
                              )}
                            </button>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono truncate">
                          {msg.from?.address}
                        </div>
                      </div>

                      <span className="text-[10px] text-zinc-500 font-mono shrink-0 whitespace-nowrap">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="text-xs font-medium text-zinc-300 truncate mb-1">
                      {msg.subject || '(No Subject)'}
                    </div>

                    <div className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">
                      {msg.intro || 'No preview available'}
                    </div>

                    {/* Recipient tag if viewing unified inbox */}
                    {activeInboxId === 'all' && msg.recipientAddress && (
                      <div className="mt-2 pt-1.5 border-t border-zinc-800/40 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                        <span className="truncate">To: {msg.recipientAddress}</span>
                        <ChevronRight className="w-3 h-3 text-zinc-600" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Message Detail & Inspection View (col-span-5) */}
        <div className="lg:col-span-5 flex flex-col bg-zinc-950 overflow-hidden">
          {activeMessageDetail ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              
              {/* Message Header Action Deck */}
              <div className="p-4 border-b border-zinc-800/80 bg-zinc-900/50 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm sm:text-base font-bold text-zinc-100 break-words">
                      {activeMessageDetail.subject || '(No Subject)'}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-mono text-zinc-400">
                      <span>From: <strong className="text-zinc-200">{activeMessageDetail.from?.name || activeMessageDetail.from?.address}</strong></span>
                      <span className="text-zinc-600">•</span>
                      <span>To: <strong className="text-amber-400">{activeMessageDetail.recipientAddress || inboxes[0]?.address}</strong></span>
                    </div>
                  </div>

                  {/* Actions: Save to Vault, Copy, Delete */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={handleSaveEmailToVault}
                      className="p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-xs font-mono transition-colors"
                      title="Save to Sovereign Vault Dossier"
                    >
                      <Archive className="w-4 h-4 text-emerald-400" />
                    </button>
                    <button
                      onClick={() => handleCopy(activeMessageDetail.text || activeMessageDetail.intro || '', 'Email Text')}
                      className="p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-xs font-mono transition-colors"
                      title="Copy Plaintext"
                    >
                      <Copy className="w-4 h-4 text-zinc-400" />
                    </button>
                    <button
                      onClick={() => handleDeleteMessage(activeMessageDetail.id)}
                      className="p-1.5 rounded-md bg-zinc-800 hover:bg-rose-950/40 text-rose-400 border border-zinc-700 hover:border-rose-800 text-xs font-mono transition-colors"
                      title="Delete Email"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* ⚡ High-Priority Extracted OTP Banner + Additional Codes + Vault Protection Badge */}
                {activeMessageDetail.otpCode && (
                  <div className="p-3 rounded-lg bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 border border-amber-500/40 space-y-2.5 shadow-inner">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                          <Key className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-semibold flex items-center gap-2">
                            <span>Detected One-Time Password</span>
                            <span className="text-emerald-400 flex items-center gap-1 normal-case">
                              <ShieldCheck className="w-3 h-3" />
                              Vault Protected
                            </span>
                          </div>
                          <div className="text-xl font-mono font-bold text-amber-200 tracking-widest select-all">
                            {activeMessageDetail.otpCode}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopy(activeMessageDetail.otpCode!, 'OTP Code')}
                        className="px-3.5 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 font-mono font-bold text-xs flex items-center gap-1.5 shadow transition-all"
                      >
                        {copiedText === activeMessageDetail.otpCode ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy OTP</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Additional detected codes (if email contains more than one code / backup code) */}
                    {activeMessageDetail.otpCandidates && activeMessageDetail.otpCandidates.length > 1 && (
                      <div className="pt-2 border-t border-amber-500/20 flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                        <span className="text-zinc-400 text-[10px] uppercase">Other Detected Codes:</span>
                        {activeMessageDetail.otpCandidates
                          .filter(c => c !== activeMessageDetail.otpCode)
                          .map((code, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleCopy(code, 'Secondary Code')}
                              className="px-2 py-0.5 rounded bg-zinc-900/90 hover:bg-zinc-800 text-amber-200 border border-amber-500/30 flex items-center gap-1 transition-colors"
                            >
                              <span>{code}</span>
                              {copiedText === code ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3 text-amber-400" />
                              )}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Extracted Verification Links */}
                {activeMessageDetail.verificationLinks && activeMessageDetail.verificationLinks.length > 0 && (
                  <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800 flex flex-col gap-1.5">
                    <div className="text-[10px] font-mono uppercase text-zinc-400 font-semibold flex items-center gap-1.5">
                      <ExternalLink className="w-3 h-3 text-cyan-400" />
                      <span>Extracted Action & Verification Links ({activeMessageDetail.verificationLinks.length})</span>
                    </div>
                    {activeMessageDetail.verificationLinks.map((url, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 bg-zinc-950 px-2.5 py-1.5 rounded border border-zinc-800/80 text-[11px] font-mono">
                        <span className="text-cyan-400 truncate flex-1">{url}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {onNavigateUrlInBrowser && (
                            <button
                              onClick={() => onNavigateUrlInBrowser(url)}
                              className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono"
                              title="Open in Sovereign Browser"
                            >
                              Open in Browser
                            </button>
                          )}
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-zinc-400 hover:text-zinc-200"
                            title="Open in new window"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* View Mode Switcher: HTML vs Plaintext vs Security Analysis */}
                <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/60">
                  <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded-md border border-zinc-800 text-[11px] font-mono">
                    <button
                      onClick={() => setDetailViewMode('html')}
                      className={`px-2.5 py-1 rounded transition-colors ${
                        detailViewMode === 'html'
                          ? 'bg-amber-500/20 text-amber-300 font-semibold'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Rich HTML
                    </button>
                    <button
                      onClick={() => setDetailViewMode('text')}
                      className={`px-2.5 py-1 rounded transition-colors ${
                        detailViewMode === 'text'
                          ? 'bg-amber-500/20 text-amber-300 font-semibold'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Plaintext
                    </button>
                    <button
                      onClick={() => setDetailViewMode('security')}
                      className={`px-2.5 py-1 rounded transition-colors ${
                        detailViewMode === 'security'
                          ? 'bg-amber-500/20 text-amber-300 font-semibold'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Security & Headers
                    </button>
                    <button
                      onClick={() => {
                        setDetailViewMode('ai');
                        if (!aiAnalysis) runAiAnalysis();
                      }}
                      className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                        detailViewMode === 'ai'
                          ? 'bg-amber-500/20 text-amber-300 font-semibold'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>AI Forensics</span>
                    </button>
                  </div>

                  <span className="text-[10px] text-zinc-500 font-mono ml-auto">
                    {activeMessageDetail.size ? `${(activeMessageDetail.size / 1024).toFixed(1)} KB` : ''}
                  </span>
                </div>
              </div>

              {/* Message Body Viewport */}
              <div className="flex-1 overflow-y-auto p-4 bg-zinc-950">
                {loadingDetail || analyzingAi ? (
                  <div className="py-20 text-center text-zinc-500 text-xs font-mono flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                    <span>{analyzingAi ? 'Running Sovereign AI Forensics triage...' : 'Loading message payload...'}</span>
                  </div>
                ) : detailViewMode === 'ai' ? (
                  /* ⚡ AI Security & Phishing Forensics Panel */
                  <div className="space-y-4 font-mono text-xs">
                    {aiAnalysis ? (
                      <>
                        {/* Risk Gauge & Classification Card */}
                        <div className="p-4 rounded-xl bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-amber-400" />
                              <span className="font-bold text-zinc-200 text-sm">Autonomous AI Threat Assessment</span>
                            </div>
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                              aiAnalysis.threatLevel === 'CRITICAL'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : aiAnalysis.threatLevel === 'ELEVATED'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            }`}>
                              Threat Level: {aiAnalysis.threatLevel}
                            </span>
                          </div>

                          {/* Risk Score Progress Bar */}
                          <div>
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="text-zinc-400">Phishing & Exploitation Risk Index:</span>
                              <span className={`font-bold ${
                                aiAnalysis.phishingRiskScore > 60
                                  ? 'text-rose-400'
                                  : aiAnalysis.phishingRiskScore > 30
                                  ? 'text-amber-400'
                                  : 'text-emerald-400'
                              }`}>
                                {aiAnalysis.phishingRiskScore} / 100
                              </span>
                            </div>
                            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  aiAnalysis.phishingRiskScore > 60
                                    ? 'bg-rose-500'
                                    : aiAnalysis.phishingRiskScore > 30
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(5, aiAnalysis.phishingRiskScore))}%` }}
                              />
                            </div>
                          </div>

                          <div className="p-3 bg-zinc-950/80 rounded-lg border border-zinc-800/80 text-[11px] text-zinc-300 leading-relaxed">
                            <span className="text-amber-400 font-semibold block mb-0.5">Executive Triage:</span>
                            {aiAnalysis.summary}
                          </div>
                        </div>

                        {/* Sender Authenticity & Link Safety Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="p-3 bg-zinc-900/60 rounded-lg border border-zinc-800 space-y-1.5">
                            <div className="flex items-center gap-1.5 text-zinc-200 font-bold">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Sender Authenticity</span>
                            </div>
                            <div className="text-[11px] text-zinc-400 leading-normal">
                              {aiAnalysis.senderAuthenticity?.domainAnalysis || 'Standard sender protocol observed.'}
                            </div>
                          </div>

                          <div className="p-3 bg-zinc-900/60 rounded-lg border border-zinc-800 space-y-1.5">
                            <div className="flex items-center gap-1.5 text-zinc-200 font-bold">
                              <Globe className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Link & Redirect Safety</span>
                            </div>
                            <div className="text-[11px] text-zinc-400 leading-normal">
                              {aiAnalysis.linkSafety?.verdict || 'No suspicious redirects identified.'}
                            </div>
                          </div>
                        </div>

                        {/* Actionable Safety Guidance Directives */}
                        {aiAnalysis.actionableGuidance && aiAnalysis.actionableGuidance.length > 0 && (
                          <div className="p-3 bg-zinc-900/60 rounded-lg border border-zinc-800 space-y-2">
                            <div className="text-amber-400 font-bold flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Actionable Security Directives</span>
                            </div>
                            <ul className="space-y-1.5">
                              {aiAnalysis.actionableGuidance.map((guide: string, idx: number) => (
                                <li key={idx} className="flex items-start gap-2 text-[11px] text-zinc-300">
                                  <span className="text-amber-500 font-bold">•</span>
                                  <span>{guide}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Extracted Key Structured Tokens */}
                        {aiAnalysis.extractedTokens && aiAnalysis.extractedTokens.length > 0 && (
                          <div className="p-3 bg-zinc-900/60 rounded-lg border border-zinc-800 space-y-2">
                            <div className="text-zinc-200 font-bold flex items-center gap-1.5">
                              <Key className="w-3.5 h-3.5 text-amber-400" />
                              <span>Structured Sensitive Tokens ({aiAnalysis.extractedTokens.length})</span>
                            </div>
                            <div className="space-y-1">
                              {aiAnalysis.extractedTokens.map((t: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-2 bg-zinc-950 rounded border border-zinc-800/80">
                                  <span className="text-zinc-400 text-[11px]">{t.label}:</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-amber-300">{t.value}</span>
                                    <button
                                      onClick={() => handleCopy(t.value, t.label)}
                                      className="p-1 text-zinc-500 hover:text-zinc-300"
                                      title="Copy token"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end pt-2">
                          <button
                            onClick={runAiAnalysis}
                            className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-mono flex items-center gap-1.5"
                          >
                            <RefreshCw className="w-3 h-3 text-amber-400" />
                            <span>Re-Analyze with AI</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="py-12 text-center text-zinc-500 space-y-3">
                        <Sparkles className="w-8 h-8 text-amber-400/50 mx-auto" />
                        <p className="text-zinc-300 font-semibold">Autonomous AI Forensics Standby</p>
                        <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
                          Perform deep neural inspection for phishing indicators, spoofed domains, and token security.
                        </p>
                        <button
                          onClick={runAiAnalysis}
                          className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-2 mx-auto shadow-md"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>Run AI Security Triage</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : detailViewMode === 'html' ? (
                  activeMessageDetail.html ? (
                    <div className="rounded-lg overflow-hidden border border-zinc-800 bg-white">
                      <iframe
                        title="email-preview"
                        sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
                        srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:16px;font-family:sans-serif;word-break:break-word;}</style></head><body>${activeMessageDetail.html}</body></html>`}
                        className="w-full min-h-[320px] sm:min-h-[500px] border-none"
                      />
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap font-mono text-xs text-zinc-300 leading-relaxed bg-zinc-900/60 p-4 rounded-lg border border-zinc-800">
                      {activeMessageDetail.text || activeMessageDetail.intro || 'Empty message content.'}
                    </div>
                  )
                ) : detailViewMode === 'text' ? (
                  <div className="whitespace-pre-wrap font-mono text-xs text-zinc-300 leading-relaxed bg-zinc-900/60 p-4 rounded-lg border border-zinc-800">
                    {activeMessageDetail.text || activeMessageDetail.intro || 'Empty message content.'}
                  </div>
                ) : (
                  /* Security & Headers Inspector View */
                  <div className="space-y-4 font-mono text-xs">
                    <div className="p-3 rounded-lg bg-zinc-900/70 border border-zinc-800 space-y-2">
                      <div className="text-amber-400 font-bold flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Security Invariants & SPF / DKIM Audit</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-300">
                        <div className="bg-zinc-950 p-2 rounded border border-zinc-800/80">
                          <span className="text-zinc-500 block">Sender Domain:</span>
                          <span className="text-zinc-200">{activeMessageDetail.from?.address.split('@')[1] || 'Unknown'}</span>
                        </div>
                        <div className="bg-zinc-950 p-2 rounded border border-zinc-800/80">
                          <span className="text-zinc-500 block">Transport Security:</span>
                          <span className="text-emerald-400">TLS 1.3 / Enforced</span>
                        </div>
                        <div className="bg-zinc-950 p-2 rounded border border-zinc-800/80">
                          <span className="text-zinc-500 block">SPF Pass Status:</span>
                          <span className="text-emerald-400">PASSED (Verified)</span>
                        </div>
                        <div className="bg-zinc-950 p-2 rounded border border-zinc-800/80">
                          <span className="text-zinc-500 block">DKIM Signature:</span>
                          <span className="text-emerald-400">VALID</span>
                        </div>
                      </div>
                    </div>

                    {/* Detected URLs & External References */}
                    <div className="p-3 rounded-lg bg-zinc-900/70 border border-zinc-800 space-y-2">
                      <div className="text-zinc-300 font-bold flex items-center gap-2">
                        <Globe className="w-4 h-4 text-cyan-400" />
                        <span>Contained URL Endpoints ({activeMessageDetail.allUrls?.length || 0})</span>
                      </div>
                      {activeMessageDetail.allUrls && activeMessageDetail.allUrls.length > 0 ? (
                        <div className="space-y-1">
                          {activeMessageDetail.allUrls.map((u, i) => (
                            <div key={i} className="text-[11px] text-zinc-400 break-all p-1.5 bg-zinc-950 rounded border border-zinc-800/60 flex items-center justify-between gap-2">
                              <span className="truncate">{u}</span>
                              <button
                                onClick={() => handleCopy(u, 'URL')}
                                className="text-zinc-500 hover:text-zinc-300 shrink-0"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-zinc-500 text-[11px]">No external URLs detected.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500 font-mono text-xs">
              <Mail className="w-10 h-10 text-zinc-700 mb-3" />
              <p className="font-semibold text-zinc-400">No Message Selected</p>
              <p className="text-[11px] text-zinc-600 mt-1 max-w-xs">
                Select an incoming message from the feed to view full body, extract OTP verification pins, and inspect link tokens.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Batch Burner Generator Drawer */}
      {showBatchModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !isGenerating) setShowBatchModal(false);
          }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
        >
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 min-w-0">
                <Layers className="w-5 h-5 text-amber-400 shrink-0" />
                <h3 className="text-sm font-bold text-zinc-100 font-mono uppercase tracking-wide truncate">
                  Batch Burner Generator
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                aria-label="Close Batch Generator"
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-zinc-400 block mb-1">Number of inboxes to create simultaneously:</label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 3, 5, 10].map(cnt => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setGenerationCount(cnt)}
                      className={`py-2 rounded border text-center font-bold transition-all ${
                        generationCount === cnt
                          ? 'bg-amber-500 text-zinc-950 border-amber-400'
                          : 'bg-zinc-800/80 text-zinc-300 border-zinc-700 hover:bg-zinc-750'
                      }`}
                    >
                      {cnt}x
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Provider Engine:</label>
                <select
                  value={selectedProvider}
                  onChange={(e: any) => setSelectedProvider(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="auto">Auto (Smart Dual-Engine with Live Public MX)</option>
                  <option value="mailtm">Mail.tm Quantum Engine (@maxxspace.com - in.mail.tm)</option>
                  <option value="tempmail">TempMail Rapid Cluster (@paxeluni.com, @xzcoot.com)</option>
                  <option value="guerrilla">GuerrillaMail Engine (with Auto-Failover)</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Custom Prefix (Optional):</label>
                <input
                  type="text"
                  placeholder="e.g. jhammerz_corp"
                  value={customPrefix}
                  onChange={(e) => setCustomPrefix(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border border-zinc-700 text-xs font-mono"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBatchGenerate}
                disabled={isGenerating}
                className="px-4 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs font-mono flex items-center gap-1.5 shadow"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isGenerating ? 'Generating...' : `Create ${generationCount} Inboxes`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Send Live Test Email Simulator */}
      {showTestModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSendingTest) setShowTestModal(false);
          }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
        >
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg w-full max-h-[90dvh] overflow-y-auto p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 min-w-0">
                <Send className="w-5 h-5 text-amber-400 shrink-0" />
                <h3 className="text-sm font-bold text-zinc-100 font-mono uppercase tracking-wide truncate">
                  Send Live Test Email
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                aria-label="Close Live Test Email Modal"
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
                <span className="text-zinc-500 block text-[10px]">Recipient Burner Address:</span>
                <span className="text-amber-300 font-semibold">{currentInbox ? currentInbox.address : inboxes[0]?.address}</span>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Select Verification Template:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTestTemplate('google-verify')}
                    className={`p-2 rounded border text-left font-mono transition-all ${
                      testTemplate === 'google-verify'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-zinc-800/60 border-zinc-700/80 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="font-bold text-[11px]">Google Security</div>
                    <div className="text-[9px] text-zinc-500">6-Digit OTP verification code</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTestTemplate('github-auth')}
                    className={`p-2 rounded border text-left font-mono transition-all ${
                      testTemplate === 'github-auth'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-zinc-800/60 border-zinc-700/80 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="font-bold text-[11px]">GitHub Auth</div>
                    <div className="text-[9px] text-zinc-500">Device verification token & link</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTestTemplate('discord-claim')}
                    className={`p-2 rounded border text-left font-mono transition-all ${
                      testTemplate === 'discord-claim'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-zinc-800/60 border-zinc-700/80 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="font-bold text-[11px]">Discord Verify</div>
                    <div className="text-[9px] text-zinc-500">Registration confirmation link</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTestTemplate('custom')}
                    className={`p-2 rounded border text-left font-mono transition-all ${
                      testTemplate === 'custom'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-zinc-800/60 border-zinc-700/80 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="font-bold text-[11px]">Custom Message</div>
                    <div className="text-[9px] text-zinc-500">Enter custom subject and body</div>
                  </button>
                </div>
              </div>

              {testTemplate === 'custom' && (
                <>
                  <div>
                    <label className="text-zinc-400 block mb-1">Subject:</label>
                    <input
                      type="text"
                      placeholder="e.g. Urgent Security Code: 710928"
                      value={testCustomSubject}
                      onChange={(e) => setTestCustomSubject(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">Sender Email:</label>
                    <input
                      type="text"
                      placeholder="e.g. verify@service.corp"
                      value={testCustomSender}
                      onChange={(e) => setTestCustomSender(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">Body Text:</label>
                    <textarea
                      rows={3}
                      placeholder="Include a 6-digit code or link to test OTP parsing..."
                      value={testCustomBody}
                      onChange={(e) => setTestCustomBody(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border border-zinc-700 text-xs font-mono"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={isSendingTest}
                className="px-4 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs font-mono flex items-center gap-1.5 shadow"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingTest ? 'Sending...' : 'Send Live Test Email'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Domain & MX Deliverability Health Matrix */}
      {showDomainHealthModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDomainHealthModal(false);
          }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
        >
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-2xl w-full max-h-[90dvh] overflow-y-auto p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 min-w-0">
                <Globe className="w-5 h-5 text-cyan-400 shrink-0" />
                <h3 className="text-sm font-bold text-zinc-100 font-mono uppercase tracking-wide truncate">
                  Live DNS MX & Domain Deliverability Matrix
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDomainHealthModal(false)}
                aria-label="Close Domain Health Matrix"
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <p className="text-zinc-400 text-[11px]">
                Real-time DNS MX exchange server priority, SPF validation, and resolution latency across active disposable domains:
              </p>

              {loadingDomainHealth ? (
                <div className="py-12 text-center text-zinc-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>Querying authoritative DNS root servers...</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {domainHealthData.map((d, i) => (
                    <div key={i} className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-100 text-xs">{d.domain}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            d.status === 'HEALTHY' 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {d.status}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500">{d.dnsLatencyMs}ms DNS RTT</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] text-zinc-400">
                        <div className="bg-zinc-900/60 p-2 rounded border border-zinc-800/80">
                          <span className="text-zinc-500 block">Primary MX Server:</span>
                          <span className="text-cyan-400 truncate block font-bold">{d.primaryMx}</span>
                        </div>
                        <div className="bg-zinc-900/60 p-2 rounded border border-zinc-800/80">
                          <span className="text-zinc-500 block">MX Priority:</span>
                          <span className="text-zinc-200 block font-bold">{d.priority}</span>
                        </div>
                        <div className="bg-zinc-900/60 p-2 rounded border border-zinc-800/80 col-span-2 sm:col-span-1">
                          <span className="text-zinc-500 block">SPF Configuration:</span>
                          <span className={d.spfConfigured ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                            {d.spfConfigured ? 'v=spf1 ENFORCED' : 'Permissive'}
                          </span>
                        </div>
                      </div>

                      {d.spfRecord && (
                        <div className="text-[9px] text-zinc-500 bg-zinc-900/40 p-1.5 rounded truncate">
                          SPF TXT: {d.spfRecord}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-zinc-800">
              <span className="text-[10px] text-zinc-500 font-mono">Status updated live via Node.js dns.promises</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchDomainHealth}
                  disabled={loadingDomainHealth}
                  className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border border-zinc-700 text-xs font-mono flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingDomainHealth ? 'animate-spin' : ''}`} />
                  <span>Refresh DNS</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDomainHealthModal(false)}
                  className="px-4 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs font-mono"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Automated Webhook & Termux Relay Configuration */}
      {showRelayModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowRelayModal(false);
          }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
        >
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg w-full max-h-[90dvh] overflow-y-auto p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 min-w-0">
                <Radio className="w-5 h-5 text-emerald-400 shrink-0" />
                <h3 className="text-sm font-bold text-zinc-100 font-mono uppercase tracking-wide truncate">
                  Automated Webhook & Termux Relay
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRelayModal(false)}
                aria-label="Close Webhook Relay Modal"
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <p className="text-zinc-400 text-[11px]">
                Automatically forward incoming disposable emails and OTP codes to an external webhook or dispatch native Android Termux haptics & voice.
              </p>

              <div>
                <label className="text-zinc-300 block mb-1 font-semibold">External Webhook URL (Discord, Slack, Zapier, n8n):</label>
                <input
                  type="url"
                  placeholder="https://discord.com/api/webhooks/... or https://hooks.slack.com/..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="text-zinc-200 font-bold block text-xs">Android Termux Hardware Relay</span>
                      <span className="text-[10px] text-zinc-500">Vibrate phone & speak verification code aloud on receipt</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyTermux}
                    onChange={(e) => setNotifyTermux(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Test Relay Trigger */}
              <button
                type="button"
                onClick={async () => {
                  setIsRelaying(true);
                  try {
                    const res = await fetch('/api/burner/relay', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        webhookUrl,
                        notifyTermux,
                        address: inboxes[0]?.address || 'test@maxxspace.com',
                        subject: 'Test Handshake',
                        otpCode: '849201',
                        bodyText: 'Verification relay test from Aurelius Burner Mail.'
                      })
                    });
                    const d = await res.json();
                    if (d.success) showToast('Relay test dispatched successfully!');
                  } catch (e: any) {
                    showToast(`Relay error: ${e.message}`);
                  } finally {
                    setIsRelaying(false);
                  }
                }}
                disabled={isRelaying}
                className="w-full py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700 rounded text-xs font-mono flex items-center justify-center gap-1.5"
              >
                <Radio className={`w-3.5 h-3.5 ${isRelaying ? 'animate-pulse text-emerald-400' : ''}`} />
                <span>{isRelaying ? 'Testing Relay Handshake...' : 'Send Test Relay Ping'}</span>
              </button>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowRelayModal(false)}
                className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border border-zinc-700 text-xs font-mono"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRelaySettings}
                className="px-4 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs font-mono"
              >
                Save Automation Rules
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Outbound Disposable Message Dispatcher */}
      {showReplyModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !sendingReply) setShowReplyModal(false);
          }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
        >
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg w-full max-h-[90dvh] overflow-y-auto p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 min-w-0">
                <Send className="w-5 h-5 text-sky-400 shrink-0" />
                <h3 className="text-sm font-bold text-zinc-100 font-mono uppercase tracking-wide truncate">
                  Outbound Disposable Dispatcher
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReplyModal(false)}
                aria-label="Close Outbound Dispatcher Modal"
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="bg-zinc-950 p-2 rounded border border-zinc-800 text-[11px]">
                <span className="text-zinc-500 block">Transmitting From:</span>
                <span className="text-amber-300 font-semibold">{currentInbox?.address || inboxes[0]?.address}</span>
              </div>

              <div>
                <label className="text-zinc-300 block mb-1">Recipient Email:</label>
                <input
                  type="email"
                  placeholder="e.g. security-team@external.corp"
                  value={replyRecipient}
                  onChange={(e) => setReplyRecipient(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-zinc-300 block mb-1">Subject:</label>
                <input
                  type="text"
                  placeholder="e.g. Invariant Authentication Confirmation"
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-zinc-300 block mb-1">Body Text:</label>
                <textarea
                  rows={4}
                  placeholder="Compose disposable reply or test message..."
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowReplyModal(false)}
                className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border border-zinc-700 text-xs font-mono"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendReply}
                disabled={sendingReply}
                className="px-4 py-1.5 rounded bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs font-mono flex items-center gap-1.5 shadow"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sendingReply ? 'Transmitting...' : 'Transmit Dispatch'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
