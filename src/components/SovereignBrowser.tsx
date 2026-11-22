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

import React, { useState, useEffect, useRef } from 'react';
import { UltraVideoPlayer } from './UltraVideoPlayer';
import { 
  Globe, 
  ShieldCheck, 
  ShieldAlert, 
  Search, 
  Lock, 
  RefreshCw, 
  ExternalLink, 
  Terminal, 
  Layers, 
  ArrowRight, 
  Eye, 
  CheckCircle2, 
  Fingerprint,
  Radio,
  Zap,
  Wifi,
  WifiOff,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Home,
  BookOpen,
  Cpu,
  FileText,
  Bookmark,
  Share2,
  Trash2,
  Download,
  Database,
  Sparkles,
  Maximize2,
  Minimize2,
  History,
  Plus,
  X,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Music,
  Video,
  Sliders,
  Folder,
  MoreVertical,
  Settings,
  Code,
  ZoomIn,
  ZoomOut,
  Star,
  Compass,
  Laptop,
  Smartphone,
  Tablet,
  Film,
  PictureInPicture2,
  Bot,
  Send,
  Cookie,
  MessageSquarePlus,
  Link2
} from 'lucide-react';

interface BrowserProps {
  agentInternetAllowed: boolean;
  onToggleAgentInternet: () => void;
  userId?: string;
  onSaveToVault?: (artifact: any) => void;
  initialUrl?: string;
  pendingNavCommand?: {
    seq: number;
    action: 'navigate' | 'newtab' | 'search';
    url?: string;
    query?: string;
  };
  onInjectToChat?: (content: string, immediate?: boolean) => void;
  onSelectModule?: (mod: any) => void;
}

export interface BrowserTab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  history: string[];
  historyIndex: number;
  isLoading: boolean;
  isMuted: boolean;
  hasAudio: boolean;
  zoom: number; // 100 = 100%
  viewMode: 'viewport' | 'newtab' | 'reader' | 'media-hub' | 'devtools' | 'search' | 'agent-learn' | 'history' | 'bookmarks';
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

interface KnowledgeDossier {
  id: string;
  topic: string;
  agentId: string;
  title: string;
  summary: string;
  findings: string[];
  sources: Array<{ url: string; title: string; length: number; hash: string }>;
  tokensBurned: number;
  integrityScore: number;
  sha256: string;
  createdAt: string;
}

interface HistoryItem {
  id: string;
  url: string;
  title: string;
  timestamp: string;
}

interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  folder?: string;
}

const ChromeEmblem: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
    <circle cx="24" cy="24" r="22" fill="#202124" />
    <path fill="#EA4335" d="M24 2C15.1 2 7.5 7.3 4.1 14.9L14.6 33l.9-1.1A10.9 10.9 0 0 1 24 13h20.5A22 22 0 0 0 24 2z" />
    <path fill="#34A853" d="M4.1 14.9A22 22 0 0 0 22 45.9l10.2-17.7-1.1-.5A11 11 0 0 1 14.5 29L4.1 14.9z" />
    <path fill="#FBBC05" d="M24 13a11 11 0 0 1 9.5 16.5L22 45.9c.7.1 1.3.1 2 .1a22 22 0 0 0 20.5-33H24z" />
    <circle cx="24" cy="24" r="10.5" fill="#202124" />
    <circle cx="24" cy="24" r="8" fill="#4285F4" />
  </svg>
);

export const SovereignBrowser: React.FC<BrowserProps> = ({
  agentInternetAllowed,
  onToggleAgentInternet,
  userId = 'anonymous_sovereign',
  onSaveToVault,
  initialUrl,
  pendingNavCommand,
  onInjectToChat,
  onSelectModule
}) => {
  const [detectedMediaUrl, setDetectedMediaUrl] = useState<string | null>(null);
  const [sessionId] = useState<string>(() => {
    try {
      const existing = localStorage.getItem('sovereign_browser_sid_v1');
      if (existing) return existing;
      const created = `sid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem('sovereign_browser_sid_v1', created);
      return created;
    } catch {
      return 'default';
    }
  });

  // Tabs State (Full Chrome-style Multi-Tabs)
  const [tabs, setTabs] = useState<BrowserTab[]>([
    {
      id: 'tab-1',
      title: 'Open Web',
      url: 'https://www.google.com',
      history: ['https://www.google.com'],
      historyIndex: 0,
      isLoading: false,
      isMuted: false,
      hasAudio: false,
      zoom: 100,
      viewMode: 'viewport'
    },
    {
      id: 'tab-2',
      title: 'YouTube',
      url: 'https://www.youtube.com',
      history: ['https://www.youtube.com'],
      historyIndex: 0,
      isLoading: false,
      isMuted: false,
      hasAudio: true,
      zoom: 100,
      viewMode: 'viewport'
    },
    {
      id: 'tab-3',
      title: 'Steam Store',
      url: 'https://store.steampowered.com',
      history: ['https://store.steampowered.com'],
      historyIndex: 0,
      isLoading: false,
      isMuted: false,
      hasAudio: false,
      zoom: 100,
      viewMode: 'viewport'
    }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');

  // Active Tab Derived
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  // Address Bar (Omnibox) Input State
  const [omniboxInput, setOmniboxInput] = useState<string>(activeTab ? activeTab.url : '');
  const [isOmniboxFocused, setIsOmniboxFocused] = useState<boolean>(false);
  const omniboxRef = useRef<HTMLDivElement>(null);
  const [showOmniboxSuggestions, setShowOmniboxSuggestions] = useState<boolean>(false);
  const [selectedSearchEngine, setSelectedSearchEngine] = useState<'google' | 'bing' | 'news' | 'yt' | 'ddg' | 'wiki'>('google');
  const [renderEngineMode, setRenderEngineMode] = useState<'proxy' | 'direct'>('proxy');

  // Bookmarks Bar State (Full Open Internet)
  const [showBookmarksBar, setShowBookmarksBar] = useState<boolean>(true);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([
    { id: 'bm-1', title: 'Open Web', url: 'https://www.google.com', folder: 'Web' },
    { id: 'bm-2', title: 'Bing Live', url: 'https://www.bing.com', folder: 'Web' },
    { id: 'bm-3', title: 'YouTube', url: 'https://www.youtube.com', folder: 'Media' },
    { id: 'bm-4', title: 'Reddit', url: 'https://www.reddit.com', folder: 'Social' },
    { id: 'bm-5', title: 'Steam Store', url: 'https://store.steampowered.com', folder: 'Gaming' },
    { id: 'bm-6', title: 'CNN News', url: 'https://www.cnn.com', folder: 'News' },
    { id: 'bm-7', title: 'BBC World', url: 'https://www.bbc.com', folder: 'News' },
    { id: 'bm-8', title: 'Yahoo', url: 'https://www.yahoo.com', folder: 'Web' },
    { id: 'bm-9', title: 'ESPN', url: 'https://www.espn.com', folder: 'Sports' },
    { id: 'bm-10', title: 'Twitch', url: 'https://www.twitch.tv', folder: 'Media' },
    { id: 'bm-11', title: 'Amazon', url: 'https://www.amazon.com', folder: 'Shopping' },
    { id: 'bm-12', title: 'Wikipedia', url: 'https://www.wikipedia.org', folder: 'Reference' },
    { id: 'bm-13', title: 'Grants.gov', url: 'https://www.grants.gov', folder: 'Funding' },
    { id: 'bm-14', title: 'GitHub', url: 'https://github.com', folder: 'Dev' }
  ]);

  // Browsing History State
  const [browsingHistory, setBrowsingHistory] = useState<HistoryItem[]>([
    { id: 'h-1', url: 'https://jhammerz.github.io', title: 'JHammerZ Sovereign Hub', timestamp: 'Just now' },
    { id: 'h-2', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', title: 'YouTube Live Stream', timestamp: '5 mins ago' },
    { id: 'h-3', url: 'https://doi.org/Local-System-Integrity-Proof', title: 'System Proof Provenance', timestamp: '12 mins ago' }
  ]);

  // Agent Clearance Level - 100% Unrestricted per user directive (custom guard rails)
  const [agentAccessMode, setAgentAccessMode] = useState<'unrestricted' | 'permanent' | 'supervised'>('unrestricted');
  const isAgentAllowed = true; // 100% unrestricted autonomous agent & browser clearance

  // Unified Cinema Video Player State (decoded best version)
  const [popoutVideoUrl, setPopoutVideoUrl] = useState<string>('https://www.youtube.com/watch?v=jfKfPfyJRdk');
  const [popoutVideoTitle, setPopoutVideoTitle] = useState<string>('YouTube Lofi & Ambient HD Stream');
  const [isPopoutVideoOpen, setIsPopoutVideoOpen] = useState<boolean>(false);

  const openInUnifiedCinemaPlayer = (url: string, title?: string) => {
    setPopoutVideoUrl(url);
    setPopoutVideoTitle(title || (url.includes('youtube') ? 'YouTube HD Stream (Decoded 1080p)' : 'Decoded Media Stream'));
    setIsPopoutVideoOpen(true);
  };

  // Chrome Menus & Modals
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile' | 'tablet'>('desktop');
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [showChromeMenu, setShowChromeMenu] = useState<boolean>(false);
  const [showSiteInfoModal, setShowSiteInfoModal] = useState<boolean>(false);
  const [showGlobalMediaHub, setShowGlobalMediaHub] = useState<boolean>(false);
  const [showDevTools, setShowDevTools] = useState<boolean>(false);
  const [devToolsTab, setDevToolsTab] = useState<'elements' | 'console' | 'network' | 'security' | 'cookies'>('network');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Add Bookmark Inline Modal State (replaces browser prompt())
  const [showAddBookmarkModal, setShowAddBookmarkModal] = useState<boolean>(false);
  const [bookmarkDraftTitle, setBookmarkDraftTitle] = useState<string>('');
  const [bookmarkDraftUrl, setBookmarkDraftUrl] = useState<string>('');
  const [bookmarkDraftFolder, setBookmarkDraftFolder] = useState<string>('Custom');

  // Real AI Web Copilot Drawer State (User + AI with full live internet & DOM)
  interface CopilotMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    model?: string;
    elapsedMs?: number;
    sha256?: string;
    discoveredUrls?: Array<{ title: string; url: string; source: string }>;
    pageLinks?: Array<{ text: string; href: string }>;
  }
  const [isCopilotOpen, setIsCopilotOpen] = useState<boolean>(false);
  const [copilotInput, setCopilotInput] = useState<string>('');
  const [copilotLoading, setCopilotLoading] = useState<boolean>(false);
  const [copilotAutoBrowse, setCopilotAutoBrowse] = useState<boolean>(true);
  const [livePageText, setLivePageText] = useState<string>('');
  const [copilotMessages, setCopilotMessages] = useState<CopilotMessage[]>([
    {
      id: 'copilot-welcome',
      role: 'assistant',
      content: 'Sovereign Web AI Copilot is online with real internet access and live page inspection. Ask me to summarize the open tab, extract links/tables, fact-check claims against live web search, or navigate to any site.'
    }
  ]);

  // Global Audio / Video Media Player State
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [activeMediaTrack, setActiveMediaTrack] = useState<{
    title: string;
    artist: string;
    url: string;
    type: 'stream' | 'video' | 'lofi';
  }>({
    title: 'DEFCON Cyber Radio (Music for Hackers)',
    artist: 'SomaFM Broadcast Substrate',
    url: 'https://ice1.somafm.com/defcon-128-mp3',
    type: 'lofi'
  });
  const [mediaVolume, setMediaVolume] = useState<number>(0.8);
  const [audioPreset, setAudioPreset] = useState<'master' | 'bass' | 'clarity'>('master');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Live Network Inspector Data (Synced from Server Proxy Audit Log)
  const [networkLogs, setNetworkLogs] = useState<Array<{
    id: string;
    url: string;
    status: number;
    method: string;
    type: string;
    size: string;
    timeMs: number;
    sha256: string;
  }>>([]);

  // Session Cookies Inspector State
  const [sessionCookies, setSessionCookies] = useState<Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    httpOnly?: boolean;
    secure?: boolean;
  }>>([]);

  // Console Logs (Live runtime events)
  const [consoleLogs, setConsoleLogs] = useState<Array<{ type: 'log' | 'info' | 'warn' | 'error'; msg: string; time: string }>>([]);

  const pushConsoleLog = (type: 'log' | 'info' | 'warn' | 'error', msg: string) => {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    setConsoleLogs((prev) => [{ type, msg, time }, ...prev.slice(0, 79)]);
  };

  const syncLiveTelemetry = async () => {
    try {
      const [netRes, cookieRes] = await Promise.all([
        fetch('/api/browser/network-log?limit=40'),
        fetch(`/api/browser/cookies?sid=${encodeURIComponent(sessionId)}`)
      ]);
      if (netRes.ok) {
        const netJson = await netRes.json();
        if (Array.isArray(netJson.records)) {
          setNetworkLogs(
            netJson.records.map((r: any) => ({
              id: r.id,
              url: r.finalUrl || r.url,
              status: r.status || 0,
              method: r.method || 'GET',
              type: r.contentType || 'text/html',
              size: r.bytes >= 1024 ? `${(r.bytes / 1024).toFixed(1)} KB` : `${r.bytes || 0} B`,
              timeMs: r.elapsedMs || 0,
              sha256: r.sha256 || 'n/a'
            }))
          );
        }
      }
      if (cookieRes.ok) {
        const cookieJson = await cookieRes.json();
        if (Array.isArray(cookieJson.cookies)) {
          setSessionCookies(cookieJson.cookies);
        }
      }
    } catch {
      // ignore transient network sync errors
    }
  };

  // Search Engine State (Full Open Internet)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchMeta, setSearchMeta] = useState<any>(null);

  // Raw Proxy / Reader State
  const [proxyData, setProxyData] = useState<any>(null);
  const [isProxyLoading, setIsProxyLoading] = useState<boolean>(false);

  // Autonomous Agent Learner State
  const [learningTopic, setLearningTopic] = useState<string>('Zero volatility consensus and edge swarm architecture');
  const [selectedAgent, setSelectedAgent] = useState<string>('Aurelius-God-Kernel-01');
  const [isAgentLearning, setIsAgentLearning] = useState<boolean>(false);
  const [agentLogs, setAgentLogs] = useState<Array<{ timeMs: number; step: string; detail: string }>>([]);
  const [currentDossier, setCurrentDossier] = useState<KnowledgeDossier | null>(null);

  // Learned Store in LocalStorage
  const [learnedStore, setLearnedStore] = useState<KnowledgeDossier[]>(() => {
    try {
      const saved = localStorage.getItem('sovereign_learned_knowledge');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return [
      {
        id: 'seed-01',
        topic: 'Aurelius Orchestrator & God Kernel',
        agentId: 'Aurelius-God-Kernel-01',
        title: 'Project Aurelius: Sovereign Edge Swarm Matrix',
        summary: 'Decentralized multi-agent edge orchestrator deployed on local device substrate with zero latency volatility.',
        findings: [
          'Deterministic substrate operates with zero inference token waste for local memory loops.',
          'H-FID Standard v1.0.3 provides tamper-evident SHA-256 cryptographic attestation across all nodes.',
          'Core-Level autonomy level verified with cold air-gap protocol and sovereign web proxy relays.'
        ],
        sources: [
          { url: 'https://jhammerz.github.io', title: 'JHammerZ Hub', length: 14200, hash: '7f38fa8ce6a6d3abd6e6d116x' },
          { url: 'https://doi.org/Local-System-Integrity-Proof', title: 'System Proof', length: 8400, hash: '8836e9c9888f4b00aa19' }
        ],
        tokensBurned: 0,
        integrityScore: 100,
        sha256: '7f38fa8ce6a6d3abd6e6d116x8836e9c9888f4b00aa19e3b0c44298fc1c149afb',
        createdAt: new Date().toISOString()
      }
    ];
  });

  const [copiedHash, setCopiedHash] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Update Omnibox input when active tab changes, without interrupting active typing
  useEffect(() => {
    if (activeTab && !isOmniboxFocused) {
      setOmniboxInput(activeTab.url === 'sovereign://newtab' ? '' : activeTab.url);
    }
  }, [activeTabId, activeTab.url, isOmniboxFocused]);

  // Handle outside click for Omnibox suggestions
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (omniboxRef.current && !omniboxRef.current.contains(e.target as Node)) {
        setShowOmniboxSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Audio element volume binding
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = mediaVolume;
    }
  }, [mediaVolume]);

  const lastConsumedNavSeqRef = useRef<number>(0);

  // Handle initialUrl or monotonic pendingNavCommand prop navigation (guarantees lazy-mounted Browser never drops OS commands)
  useEffect(() => {
    if (pendingNavCommand && pendingNavCommand.seq > lastConsumedNavSeqRef.current) {
      lastConsumedNavSeqRef.current = pendingNavCommand.seq;
      if (pendingNavCommand.action === 'newtab') {
        createNewTab(pendingNavCommand.url || 'sovereign://newtab');
      } else if (pendingNavCommand.action === 'search') {
        const searchTarget = pendingNavCommand.url || pendingNavCommand.query;
        if (searchTarget) {
          navigateTo(searchTarget);
        }
      } else if (pendingNavCommand.url) {
        navigateTo(pendingNavCommand.url);
      }
      return;
    }
    if (initialUrl && initialUrl !== activeTab.url && !pendingNavCommand) {
      navigateTo(initialUrl);
    }
  }, [initialUrl, pendingNavCommand]);

  // Initial live proxy telemetry fetch on mount
  useEffect(() => {
    pushConsoleLog('info', `[Sovereign-Web-Engine] Real HTTP/HTTPS proxy & session (${sessionId}) initialized`);
    syncLiveTelemetry();
  }, []);

  // Handle postMessage navigation, new-tab opens, AI Copilot trigger & media detection from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return;
      if (event.data.type === 'SOVEREIGN_NAVIGATE' && event.data.url) {
        navigateTo(event.data.url);
      } else if (event.data.type === 'SOVEREIGN_OPEN_NEW_TAB' && event.data.url) {
        createNewTab(event.data.url);
      } else if (event.data.type === 'SOVEREIGN_AI_SEARCH' && event.data.query) {
        setIsCopilotOpen(true);
        handleAskCopilot(String(event.data.query));
      } else if (event.data.type === 'SOVEREIGN_URL_RESOLVED' && event.data.url) {
        let clean = String(event.data.url);
        if (clean.includes('/api/browser/render?url=')) {
          try {
            const u = new URL(clean, window.location.origin);
            clean = u.searchParams.get('url') || clean;
          } catch {}
        }
        const resolvedTitle =
          (typeof event.data.title === 'string' && event.data.title.trim())
            ? event.data.title.trim()
            : (clean.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] || clean);
        if (typeof event.data.liveText === 'string' && event.data.liveText.trim()) {
          setLivePageText(event.data.liveText.trim());
        }
        updateActiveTab({
          url: clean,
          title: resolvedTitle,
          isLoading: false
        });
        if (!isOmniboxFocused) {
          setOmniboxInput(clean);
        }
        pushConsoleLog('log', `Loaded ${clean} (${resolvedTitle})`);
        syncLiveTelemetry();
      } else if (event.data.type === 'SOVEREIGN_POP_VIDEO' && event.data.url) {
        openInUnifiedCinemaPlayer(event.data.url, event.data.title || 'Decoded High-Definition Video Stream');
      } else if (event.data.type === 'SOVEREIGN_MEDIA_DETECTED' && event.data.mediaUrl) {
        setDetectedMediaUrl(event.data.mediaUrl);
        updateActiveTab({ hasAudio: true });
        if (event.data.title) {
          setActiveMediaTrack(prev => ({
            ...prev,
            title: event.data.title,
            url: event.data.mediaUrl
          }));
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [tabs, activeTabId, activeTab, selectedSearchEngine, isOmniboxFocused, sessionId]);

  // Tab Management Functions
  const createNewTab = (initialUrl: string = 'sovereign://newtab') => {
    const newTabId = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const isNewTab = initialUrl === 'sovereign://newtab';
    const newTab: BrowserTab = {
      id: newTabId,
      title: isNewTab ? 'New Tab' : initialUrl.split('/')[2] || initialUrl,
      url: initialUrl,
      history: [initialUrl],
      historyIndex: 0,
      isLoading: !isNewTab,
      isMuted: false,
      hasAudio: isVideoOrAudioUrl(initialUrl),
      zoom: 100,
      viewMode: isNewTab ? 'newtab' : 'viewport'
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTabId);
    setOmniboxInput(isNewTab ? '' : initialUrl);
    if (!isNewTab) {
      fetchProxyData(initialUrl);
    }
  };

  const closeTab = (tabIdToClose: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (tabs.length === 1) {
      // Keep at least one tab, reset to newtab
      const freshId = `tab-${Date.now()}`;
      setTabs([{
        id: freshId,
        title: 'New Tab',
        url: 'sovereign://newtab',
        history: ['sovereign://newtab'],
        historyIndex: 0,
        isLoading: false,
        isMuted: false,
        hasAudio: false,
        zoom: 100,
        viewMode: 'newtab'
      }]);
      setActiveTabId(freshId);
      setOmniboxInput('');
      return;
    }

    const filtered = tabs.filter(t => t.id !== tabIdToClose);
    setTabs(filtered);
    if (activeTabId === tabIdToClose) {
      const nextTab = filtered[filtered.length - 1];
      setActiveTabId(nextTab.id);
      setOmniboxInput(nextTab.url === 'sovereign://newtab' ? '' : nextTab.url);
    }
  };

  const toggleTabMute = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTabs(tabs.map(t => {
      if (t.id === tabId) {
        return { ...t, isMuted: !t.isMuted };
      }
      return t;
    }));
  };

  const isVideoOrAudioUrl = (url: string) => {
    return /(?:youtube\.com|youtu\.be|vimeo\.com|twitch\.tv|\.mp4|\.webm|\.mp3|\.wav|\.ogg|\.aac|\.m3u8)/i.test(url);
  };

  // Navigate to Target URL
  const navigateTo = (targetUrl: string) => {
    let url = targetUrl.trim();
    if (!url) return;

    // Unwrap internal proxy URLs
    if (url.includes('/api/browser/render?url=')) {
      try {
        const u = new URL(url, window.location.origin);
        const inner = u.searchParams.get('url');
        if (inner) url = decodeURIComponent(inner);
      } catch {}
    }

    if (url === 'sovereign://newtab' || url === 'about:blank') {
      updateActiveTab({
        url: 'sovereign://newtab',
        title: 'New Tab',
        viewMode: 'newtab'
      });
      setOmniboxInput('');
      return;
    }

    // Clean accidental trailing protocol text e.g. cmo.xxnxhttps -> cmo.xxnx
    url = url.replace(/https?$/i, '').trim();

    // Check if explicit protocol or localhost / IP
    const isExplicitUrl = /^https?:\/\//i.test(url) || url.startsWith('sovereign://') || url.startsWith('file://');
    const isLocalhostOrIp = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?(\/.*)?$/i.test(url);
    const looksLikeDomain = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+([a-zA-Z]{2,24})(:\d+)?(\/.*)?$/i.test(url);

    if (!isExplicitUrl && !isLocalhostOrIp && (!looksLikeDomain || url.includes(' '))) {
      // Direct Full Open-Internet Web Search via chosen engine
      if (selectedSearchEngine === 'bing') {
        url = `https://www.bing.com/search?q=${encodeURIComponent(url)}`;
      } else if (selectedSearchEngine === 'news') {
        url = `https://www.google.com/search?q=${encodeURIComponent(url)}&cat=news`;
      } else if (selectedSearchEngine === 'ddg') {
        url = `https://duckduckgo.com/?q=${encodeURIComponent(url)}`;
      } else if (selectedSearchEngine === 'wiki') {
        url = `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(url)}`;
      } else if (selectedSearchEngine === 'yt') {
        url = `https://www.youtube.com/results?search_query=${encodeURIComponent(url)}`;
      } else {
        url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
      }
    } else if (isLocalhostOrIp && !isExplicitUrl) {
      url = 'http://' + url;
    } else if (!isExplicitUrl && !url.startsWith('sovereign://')) {
      url = 'https://' + url;
    }

    const hasMedia = isVideoOrAudioUrl(url);

    // Always bump reload trigger to guarantee fresh iframe load
    setRefreshKey(prev => prev + 1);

    // Add to history
    const nextHistory = activeTab.history.slice(0, activeTab.historyIndex + 1);
    if (nextHistory[nextHistory.length - 1] !== url) {
      nextHistory.push(url);
    }

    // Title inference
    let derivedTitle = url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] || url;
    if (url.includes('youtube.com') || url.includes('youtu.be')) derivedTitle = 'YouTube Video & Audio';
    else if (url.includes('google.com/search')) {
      try {
        const q = new URL(url).searchParams.get('q');
        derivedTitle = q ? `${q} - Google Search` : 'Google Search';
      } catch {
        derivedTitle = 'Google Search';
      }
    }
    else if (url.includes('google.com')) derivedTitle = 'Google';
    else if (url.includes('jhammerz.github.io')) derivedTitle = 'JHammerZ Hub | Aurelius';
    else if (url.includes('zenodo.org')) derivedTitle = 'System Proof Record';

    updateActiveTab({
      url,
      title: derivedTitle,
      history: nextHistory,
      historyIndex: nextHistory.length - 1,
      isLoading: true,
      hasAudio: hasMedia,
      viewMode: 'viewport'
    });
    setOmniboxInput(url);
    setShowOmniboxSuggestions(false);

    // Imperatively reload iframe if mounted
    if (iframeRef.current && url !== 'sovereign://newtab') {
      try {
        iframeRef.current.src =
          renderEngineMode === 'direct'
            ? url
            : `/api/browser/render?url=${encodeURIComponent(url)}&sid=${encodeURIComponent(sessionId)}`;
      } catch {}
    }

    // Add to browsing history
    setBrowsingHistory(prev => [
      { id: `h-${Date.now()}`, url, title: derivedTitle, timestamp: 'Just now' },
      ...prev.slice(0, 49)
    ]);

    pushConsoleLog('info', `Navigating to ${url}`);
    fetchProxyData(url);
  };

  const updateActiveTab = (updates: Partial<BrowserTab>) => {
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, ...updates } : t));
  };

  const handleBack = () => {
    if (activeTab.historyIndex > 0) {
      const nextIndex = activeTab.historyIndex - 1;
      const prevUrl = activeTab.history[nextIndex];
      const isNew = prevUrl === 'sovereign://newtab';
      setRefreshKey(prev => prev + 1);
      updateActiveTab({
        historyIndex: nextIndex,
        url: prevUrl,
        title: isNew ? 'New Tab' : prevUrl.split('/')[2] || prevUrl,
        viewMode: isNew ? 'newtab' : 'viewport',
        isLoading: !isNew
      });
      setOmniboxInput(isNew ? '' : prevUrl);
      if (!isNew) fetchProxyData(prevUrl);
    }
  };

  const handleForward = () => {
    if (activeTab.historyIndex < activeTab.history.length - 1) {
      const nextIndex = activeTab.historyIndex + 1;
      const nextUrl = activeTab.history[nextIndex];
      const isNew = nextUrl === 'sovereign://newtab';
      setRefreshKey(prev => prev + 1);
      updateActiveTab({
        historyIndex: nextIndex,
        url: nextUrl,
        title: isNew ? 'New Tab' : nextUrl.split('/')[2] || nextUrl,
        viewMode: isNew ? 'newtab' : 'viewport',
        isLoading: !isNew
      });
      setOmniboxInput(isNew ? '' : nextUrl);
      if (!isNew) fetchProxyData(nextUrl);
    }
  };

  const handleReload = () => {
    updateActiveTab({ isLoading: true });
    setRefreshKey(prev => prev + 1);
    if (iframeRef.current && activeTab.url !== 'sovereign://newtab') {
      try {
        iframeRef.current.contentWindow?.location?.reload();
      } catch {
        iframeRef.current.src =
          renderEngineMode === 'direct'
            ? activeTab.url
            : `/api/browser/render?url=${encodeURIComponent(activeTab.url)}&sid=${encodeURIComponent(sessionId)}&_t=${Date.now()}`;
      }
    }
    fetchProxyData(activeTab.url);
  };

  const handleZoomChange = (delta: number) => {
    const nextZoom = Math.min(250, Math.max(50, activeTab.zoom + delta));
    updateActiveTab({ zoom: nextZoom });
  };

  const handleCopyUrl = (customUrl?: string) => {
    const target = customUrl || activeTab.url;
    if (!target) return;
    try {
      navigator.clipboard.writeText(target);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (e) {}
  };

  // Omnibox Submit
  const handleOmniboxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowOmniboxSuggestions(false);
    if (!omniboxInput.trim()) return;
    navigateTo(omniboxInput.trim());
  };

  // Search Engine Query Trigger (Real Multi-Engine Web Index)
  const handleSearchQuery = async (queryText: string) => {
    const q = queryText.trim();
    if (!q) return;

    setSearchQuery(q);
    setIsSearching(true);
    updateActiveTab({
      title: `Search: ${q}`,
      url: `sovereign://search?q=${encodeURIComponent(q)}`,
      viewMode: 'search'
    });

    try {
      const res = await fetch('/api/browser/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, agentAllowed: isAgentAllowed })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.results)) {
        setSearchResults(data.results);
        setSearchMeta(data);
        pushConsoleLog('log', `Multi-engine search "${q}" returned ${data.results.length} real results`);
      }
    } catch (err: any) {
      pushConsoleLog('error', `Web search failed: ${err?.message || 'network error'}`);
    } finally {
      setIsSearching(false);
    }
  };

  const osHandlersRef = useRef<{
    navigateTo: (u: string) => void;
    createNewTab: (u?: string) => void;
    handleSearchQuery: (q: string) => void;
  }>({ navigateTo, createNewTab, handleSearchQuery });
  osHandlersRef.current = { navigateTo, createNewTab, handleSearchQuery };

  useEffect(() => {
    const onOsCommand = (e: Event) => {
      const detail = (e as CustomEvent<any>)?.detail;
      if (!detail || !detail.action) return;
      if (detail.action === 'browser_navigate' && (detail.url || detail.query || detail.command)) {
        osHandlersRef.current.navigateTo(String(detail.url || detail.query || detail.command));
      } else if (detail.action === 'browser_new_tab') {
        osHandlersRef.current.createNewTab(detail.url ? String(detail.url) : 'sovereign://newtab');
      } else if (detail.action === 'browser_search' && (detail.url || detail.query || detail.command)) {
        const rawSearch = String(detail.query || detail.command || detail.url);
        if (/^https?:\/\//i.test(rawSearch)) {
          osHandlersRef.current.navigateTo(rawSearch);
        } else {
          osHandlersRef.current.handleSearchQuery(rawSearch);
        }
      }
    };
    window.addEventListener('sovereign_os_command', onOsCommand);
    return () => window.removeEventListener('sovereign_os_command', onOsCommand);
  }, []);

  // Fetch Real Proxy Data for Reader, Inspector & AI Copilot DOM Awareness
  const fetchProxyData = async (targetUrl: string) => {
    if (!targetUrl || targetUrl.startsWith('sovereign://')) return;
    setIsProxyLoading(true);
    try {
      const res = await fetch('/api/browser/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl, sessionId, agentAllowed: isAgentAllowed })
      });
      const data = await res.json();
      setProxyData(data);
      if (data?.textContent) setLivePageText(data.textContent);
      if (data?.title && data.title.trim()) {
        updateActiveTab({ title: data.title.trim() });
      }
      if (data?.success) {
        pushConsoleLog('info', `Proxy ${data.status || 200} · ${data.url || targetUrl} (${data.elapsedMs || 0}ms, SHA-256 ${String(data.sha256 || '').slice(0, 12)})`);
      } else if (data?.error) {
        pushConsoleLog('warn', `Proxy warning for ${targetUrl}: ${data.error}`);
      }
      syncLiveTelemetry();
    } catch (err: any) {
      pushConsoleLog('warn', `Proxy metadata error: ${err?.message || 'unreachable'}`);
    } finally {
      setIsProxyLoading(false);
      updateActiveTab({ isLoading: false });
    }
  };

  // Real AI Web Copilot Action (Reads live DOM + Crawls/Searches Real Internet)
  const handleAskCopilot = async (overridePrompt?: string) => {
    const promptText = (overridePrompt ?? copilotInput).trim();
    if (!promptText || copilotLoading) return;
    if (!overridePrompt) setCopilotInput('');

    const userMsg: CopilotMessage = {
      id: `cop-u-${Date.now()}`,
      role: 'user',
      content: promptText
    };
    setCopilotMessages((prev) => [...prev, userMsg]);
    setCopilotLoading(true);
    pushConsoleLog('info', `[AI Copilot] Investigating "${promptText.slice(0, 80)}"...`);

    try {
      const res = await fetch('/api/browser/ai-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          currentUrl: activeTab.url.startsWith('http') ? activeTab.url : '',
          pageTitle: activeTab.title,
          pageText: livePageText || proxyData?.textContent || '',
          pageLinks: proxyData?.links || [],
          history: copilotMessages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
          autoBrowse: copilotAutoBrowse,
          sessionId
        })
      });
      const data = await res.json();
      const assistantMsg: CopilotMessage = {
        id: `cop-a-${Date.now()}`,
        role: 'assistant',
        content: data.reply || data.error || 'No response returned by AI Web Copilot.',
        model: data.model,
        elapsedMs: data.elapsedMs,
        sha256: data.sha256,
        discoveredUrls: Array.isArray(data.discoveredUrls) ? data.discoveredUrls : [],
        pageLinks: Array.isArray(data.pageLinks) ? data.pageLinks : []
      };
      setCopilotMessages((prev) => [...prev, assistantMsg]);
      pushConsoleLog('log', `[AI Copilot] Completed via ${data.model || 'engine'} in ${data.elapsedMs || 0}ms`);
      syncLiveTelemetry();
    } catch (err: any) {
      setCopilotMessages((prev) => [
        ...prev,
        {
          id: `cop-err-${Date.now()}`,
          role: 'assistant',
          content: `AI Copilot network error: ${err?.message || 'Unable to reach /api/browser/ai-copilot'}`
        }
      ]);
    } finally {
      setCopilotLoading(false);
    }
  };

  const handleClearCookies = async () => {
    try {
      await fetch(`/api/browser/cookies?sid=${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
      setSessionCookies([]);
      pushConsoleLog('warn', `Cleared session cookies for ${sessionId}`);
    } catch {}
  };

  // Bookmark Management
  const isCurrentPageBookmarked = bookmarks.some(b => b.url === activeTab.url);

  const toggleBookmarkCurrentPage = () => {
    if (isCurrentPageBookmarked) {
      setBookmarks(bookmarks.filter(b => b.url !== activeTab.url));
    } else {
      setBookmarks([
        ...bookmarks,
        {
          id: `bm-${Date.now()}`,
          title: activeTab.title || 'Saved Bookmark',
          url: activeTab.url,
          folder: 'Unsorted'
        }
      ]);
    }
  };

  // Autonomous Agent Learn Routine
  const handleRunAgentLearn = async () => {
    if (!learningTopic.trim()) return;
    setIsAgentLearning(true);
    setAgentLogs([]);
    setCurrentDossier(null);

    try {
      const res = await fetch('/api/browser/agent-learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: learningTopic.trim(),
          agentId: selectedAgent,
          maxPages: 3
        })
      });
      const data = await res.json();
      if (data.success) {
        setAgentLogs(data.logTrace || []);
        if (data.dossier) {
          setCurrentDossier(data.dossier);
          setLearnedStore(prev => [data.dossier, ...prev]);
        }
      }
    } catch (err) {
      console.error('Agent learn failed:', err);
    } finally {
      setIsAgentLearning(false);
    }
  };

  // Save Dossier / Artifact to Vault
  const handleSaveDossierToVault = (dossier: KnowledgeDossier) => {
    if (onSaveToVault) {
      onSaveToVault({
        type: 'dossier',
        title: dossier.title,
        prompt: `Autonomous Agent [${dossier.agentId}] research topic: ${dossier.topic}`,
        model: dossier.agentId,
        mediaUrl: dossier.sources[0]?.url || 'https://jhammerz.github.io',
        metadata: {
          sha256: dossier.sha256,
          findings: dossier.findings,
          sources: dossier.sources,
          tokensBurned: 0,
          integrityScore: dossier.integrityScore
        }
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  useEffect(() => {
    if (!isFullscreen && !showSiteInfoModal && !showAddBookmarkModal && !isCopilotOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAddBookmarkModal) setShowAddBookmarkModal(false);
        else if (showSiteInfoModal) setShowSiteInfoModal(false);
        else if (isFullscreen) setIsFullscreen(false);
        else if (isCopilotOpen && window.innerWidth < 1024) setIsCopilotOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFullscreen, showSiteInfoModal, showAddBookmarkModal, isCopilotOpen]);

  return (
    <div className={`flex flex-col bg-zinc-950 text-zinc-100 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
      isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none' : 'min-h-[420px] sm:min-h-[540px] w-full flex-1'
    }`}>
      
      {/* 1. CUSTOM SOVEREIGN GOOGLE CHROME TAB BAR */}
      <div className="bg-[#202124] border-b border-zinc-800/90 px-2 pt-2 pb-0 flex items-center justify-between gap-2 select-none">
        
        {/* Left: Chrome Emblem & Multi-Tab Strip */}
        <div className="flex items-center gap-1.5 flex-1 overflow-x-auto scrollbar-none">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 mb-1 rounded-full bg-zinc-900/90 border border-zinc-700/70 text-[10px] font-sans shrink-0 whitespace-nowrap">
            <ChromeEmblem className="w-4 h-4 shrink-0" />
            <span className="font-bold tracking-wide text-zinc-100">Chrome</span>
            <span className="text-[9px] font-mono text-sky-400">OS</span>
          </div>

          {/* Chrome Tab Strip Items */}
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              return (
                <div
                  key={tab.id}
                  onClick={() => {
                    setActiveTabId(tab.id);
                    setOmniboxInput(tab.url === 'sovereign://newtab' ? '' : tab.url);
                    if (tab.url !== 'sovereign://newtab') {
                      fetchProxyData(tab.url);
                    }
                  }}
                  className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-t-xl text-xs cursor-pointer transition-all max-w-[210px] min-w-[110px] shrink-0 border-t border-x ${
                    isActive 
                      ? 'bg-[#292a2d] text-zinc-100 border-zinc-700/70 shadow-sm font-semibold' 
                      : 'bg-transparent text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200 border-transparent'
                  }`}
                >
                  {/* Tab Icon */}
                  {tab.hasAudio ? (
                    <button
                      onClick={(e) => toggleTabMute(tab.id, e)}
                      title={tab.isMuted ? 'Unmute tab audio' : 'Mute tab audio'}
                      className="text-emerald-400 hover:text-emerald-300 shrink-0"
                    >
                      {tab.isMuted ? <VolumeX className="w-3.5 h-3.5 text-zinc-500" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                  ) : tab.viewMode === 'newtab' ? (
                    <ChromeEmblem className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  )}

                  {/* Tab Title */}
                  <span className="truncate flex-1 text-[11px]">
                    {tab.title}
                  </span>

                  {/* Close Tab Button */}
                  <button
                    onClick={(e) => closeTab(tab.id, e)}
                    aria-label={`Close tab ${tab.title}`}
                    className="opacity-80 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-zinc-700 p-1 rounded-full text-zinc-400 hover:text-zinc-100 transition-opacity shrink-0"
                    title="Close tab"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            {/* New Tab Button (+) */}
            <button
              onClick={() => createNewTab()}
              className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors shrink-0 ml-0.5 cursor-pointer"
              title="New Chrome Tab"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: AI Web Copilot Toggle, UID 0 Profile Pill & Fullscreen */}
        <div className="flex items-center gap-1.5 shrink-0 pb-1.5">
          <button
            type="button"
            onClick={() => setIsCopilotOpen((prev) => !prev)}
            className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
              isCopilotOpen
                ? 'bg-sky-500/20 text-sky-200 border-sky-500/40'
                : 'bg-[#292a2d] text-zinc-200 border-zinc-700 hover:border-sky-500/40 hover:text-white'
            }`}
            title="Toggle Chrome AI Web Copilot (Live Internet + DOM Access)"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>AI Copilot</span>
          </button>

          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
            <Wifi className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>UID 0 · LIVE NET</span>
          </div>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`px-2 py-1.5 rounded-full transition-colors flex items-center gap-1 text-[11px] font-mono font-bold cursor-pointer ${
              isFullscreen
                ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40'
                : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Exit</span>
              </>
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* 2. GOOGLE CHROME OMNIBOX & NAVIGATION TOOLBAR */}
      <div className="bg-[#292a2d] px-3 py-2 border-b border-zinc-800 flex items-center gap-2">
        {/* Navigation Buttons: Back, Forward, Reload, Home */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleBack}
            disabled={activeTab.historyIndex <= 0}
            className="p-1.5 rounded-lg hover:bg-zinc-800 disabled:opacity-30 text-zinc-300 transition-colors"
            title="Back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleForward}
            disabled={activeTab.historyIndex >= activeTab.history.length - 1}
            className="p-1.5 rounded-lg hover:bg-zinc-800 disabled:opacity-30 text-zinc-300 transition-colors"
            title="Forward"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleReload}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 transition-colors"
            title="Reload page"
          >
            <RefreshCw className={`w-4 h-4 ${activeTab.isLoading ? 'animate-spin text-sky-400' : ''}`} />
          </button>
          <button
            onClick={() => navigateTo('https://www.google.com')}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 transition-colors"
            title="Home (Open Web Search)"
          >
            <Home className="w-4 h-4" />
          </button>
        </div>

        {/* Omnibox Container */}
        <div ref={omniboxRef} className="flex-1 relative">
          <form onSubmit={handleOmniboxSubmit} className="relative z-50 flex items-center w-full">
            {/* Site Security Badge / Padlock */}
            <button
              type="button"
              onClick={() => setShowSiteInfoModal(true)}
              className="absolute left-2.5 flex items-center text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
              title="Site Security & Provenance"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>

            {/* Omnibox Input */}
            <input
              type="text"
              dir="ltr"
              value={omniboxInput}
              onFocus={() => {
                setIsOmniboxFocused(true);
                setShowOmniboxSuggestions(true);
              }}
              onBlur={() => {
                setIsOmniboxFocused(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setShowOmniboxSuggestions(false);
                  if (omniboxInput.trim()) {
                    navigateTo(omniboxInput.trim());
                  }
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setShowOmniboxSuggestions(false);
                  setOmniboxInput(activeTab.url === 'sovereign://newtab' ? '' : activeTab.url);
                  (e.target as HTMLInputElement).blur();
                }
              }}
              onChange={(e) => {
                setOmniboxInput(e.target.value);
                setShowOmniboxSuggestions(true);
              }}
              placeholder="Search Google Chrome or type a URL (e.g. google.com, youtube.com, github.com)..."
              style={{ direction: 'ltr', textAlign: 'left', unicodeBidi: 'normal' }}
              className="w-full bg-[#202124] border border-zinc-700/80 hover:border-zinc-500 focus:border-sky-500 rounded-full pl-8 sm:pl-9 pr-24 py-1.5 text-xs text-zinc-100 font-sans tracking-normal selection:bg-sky-500/30 focus:outline-none transition-all shadow-inner text-left"
            />

            {/* Right Omnibox Actions: Clear, Bookmark Star, Go */}
            <div className="absolute right-1.5 flex items-center gap-1">
              {/* Clear Input */}
              {omniboxInput && (
                <button
                  type="button"
                  onClick={() => setOmniboxInput('')}
                  className="p-1 rounded-full text-zinc-500 hover:text-zinc-200 transition-colors"
                  title="Clear address bar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Bookmark Star */}
              <button
                type="button"
                onClick={toggleBookmarkCurrentPage}
                className={`p-1 rounded-full transition-colors ${
                  isCurrentPageBookmarked ? 'text-amber-400 hover:text-amber-300' : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title={isCurrentPageBookmarked ? 'Remove bookmark' : 'Bookmark this tab'}
              >
                <Star className={`w-3.5 h-3.5 ${isCurrentPageBookmarked ? 'fill-amber-400' : ''}`} />
              </button>

              {/* Go Button */}
              <button
                type="submit"
                onClick={(e) => {
                  e.preventDefault();
                  setShowOmniboxSuggestions(false);
                  if (omniboxInput.trim()) {
                    navigateTo(omniboxInput.trim());
                  }
                }}
                className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-full text-[10px] font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
              >
                <span>GO</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </form>

          {/* Omnibox Autocomplete & Suggestions Dropdown */}
          {showOmniboxSuggestions && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-zinc-800 text-xs">
              {/* Search Engine Switcher */}
              <div className="p-2 bg-zinc-950/80 flex items-center justify-between text-[11px]">
                <span className="text-zinc-400 font-semibold flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-sky-400" />
                  <span>Default Search Engine:</span>
                </span>
                <div className="flex items-center gap-1">
                  {(['google', 'bing', 'news', 'yt', 'ddg', 'wiki'] as const).map(engine => (
                    <button
                      key={engine}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSelectedSearchEngine(engine);
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold transition-colors ${
                        selectedSearchEngine === engine
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {engine === 'google' ? 'open-web' : engine}
                    </button>
                  ))}
                </div>
              </div>

              {/* Instant Suggestions */}
              <div className="p-1 max-h-60 overflow-y-auto">
                {omniboxInput.trim() && (
                  <>
                    {/* Navigate directly to domain */}
                    <div
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setShowOmniboxSuggestions(false);
                        navigateTo(omniboxInput.trim());
                      }}
                      className="flex items-center gap-2 p-2 hover:bg-zinc-800 rounded-lg cursor-pointer text-emerald-300 font-medium"
                    >
                      <Globe className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Navigate to <strong>{omniboxInput.trim()}</strong></span>
                      <span className="ml-auto text-[10px] font-mono text-zinc-400">↵ Enter</span>
                    </div>

                    {/* Search Google */}
                    <div
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setShowOmniboxSuggestions(false);
                        navigateTo(`https://www.google.com/search?q=${encodeURIComponent(omniboxInput.trim())}`);
                      }}
                      className="flex items-center gap-2 p-2 hover:bg-zinc-800 rounded-lg cursor-pointer text-sky-300 font-medium"
                    >
                      <Search className="w-3.5 h-3.5 text-sky-400" />
                      <span>Search Google for "<strong>{omniboxInput.trim()}</strong>"</span>
                      <span className="ml-auto text-[10px] font-mono text-emerald-400">Web</span>
                    </div>

                    {/* Search DuckDuckGo */}
                    <div
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setShowOmniboxSuggestions(false);
                        navigateTo(`https://duckduckgo.com/?q=${encodeURIComponent(omniboxInput.trim())}`);
                      }}
                      className="flex items-center gap-2 p-2 hover:bg-zinc-800 rounded-lg cursor-pointer text-amber-300 font-medium"
                    >
                      <Compass className="w-3.5 h-3.5 text-amber-400" />
                      <span>Search DuckDuckGo for "<strong>{omniboxInput.trim()}</strong>"</span>
                      <span className="ml-auto text-[10px] font-mono text-zinc-400">Privacy</span>
                    </div>
                  </>
                )}

                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Quick Dials & Media
                </div>

                <div
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setShowOmniboxSuggestions(false);
                    openInUnifiedCinemaPlayer('https://www.youtube.com/watch?v=jfKfPfyJRdk', 'YouTube Lofi & Ambient HD Stream');
                  }}
                  className="flex items-center gap-2 p-2 hover:bg-zinc-800 rounded-lg cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5 text-red-400" />
                  <div>
                    <div className="font-semibold text-zinc-200">YouTube Lofi & Ambient HD Stream (Cinema Player)</div>
                    <div className="text-[10px] text-zinc-500">Decoded Best Version • 1080p Stereo Stream</div>
                  </div>
                </div>

                <div
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setShowOmniboxSuggestions(false);
                    navigateTo('https://jhammerz.github.io');
                  }}
                  className="flex items-center gap-2 p-2 hover:bg-zinc-800 rounded-lg cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  <div>
                    <div className="font-semibold text-zinc-200">JHammerZ Sovereign Hub</div>
                    <div className="text-[10px] text-zinc-500">https://jhammerz.github.io</div>
                  </div>
                </div>

                <div
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setShowOmniboxSuggestions(false);
                    navigateTo('https://doi.org/Local-System-Integrity-Proof');
                  }}
                  className="flex items-center gap-2 p-2 hover:bg-zinc-800 rounded-lg cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <div>
                    <div className="font-semibold text-zinc-200">System Proof Provenance Record</div>
                    <div className="text-[10px] text-zinc-500">Local-System-Integrity-Proof</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Toolbar Utility Controls: Proxy/Direct Mode, Open External, Copy, Reader Mode, Zoom */}
        <div className="hidden sm:flex items-center gap-1 shrink-0">
          {/* Proxy vs Direct Frame Mode Toggle */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-[10px] font-mono font-bold">
            <button
              type="button"
              onClick={() => {
                setRenderEngineMode('proxy');
                setRefreshKey((k) => k + 1);
              }}
              className={`px-1.5 py-0.5 rounded cursor-pointer ${
                renderEngineMode === 'proxy' ? 'bg-emerald-500/20 text-emerald-300' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Full Web Proxy (strips X-Frame-Options/CSP so almost any website loads inside OS)"
            >
              Proxy
            </button>
            <button
              type="button"
              onClick={() => {
                setRenderEngineMode('direct');
                setRefreshKey((k) => k + 1);
              }}
              className={`px-1.5 py-0.5 rounded cursor-pointer ${
                renderEngineMode === 'direct' ? 'bg-sky-500/20 text-sky-300' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Direct Browser Frame (uses your direct IP for embed-friendly sites)"
            >
              Direct
            </button>
          </div>

          {/* Open Current URL Directly in Native Browser Tab */}
          {activeTab.url.startsWith('http') && (
            <a
              href={activeTab.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-sky-400 hover:bg-zinc-800 hover:text-sky-300 transition-colors"
              title="Open website directly in native browser tab (bypasses proxy & iframe restrictions)"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}

          {/* Copy URL */}
          <button
            type="button"
            onClick={() => handleCopyUrl()}
            className={`p-1.5 rounded-lg transition-colors ${copiedUrl ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}
            title={copiedUrl ? 'URL Copied!' : 'Copy current address'}
          >
            {copiedUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Reader Mode Toggle */}
          <button
            type="button"
            onClick={() => updateActiveTab({ viewMode: activeTab.viewMode === 'reader' ? 'viewport' : 'reader' })}
            className={`p-1.5 rounded-lg transition-colors ${
              activeTab.viewMode === 'reader' ? 'text-sky-400 bg-sky-500/20' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
            title="Toggle distraction-free reader mode"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          {/* Zoom Controls */}
          <div className="hidden md:flex items-center text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded-lg">
            <button type="button" onClick={() => handleZoomChange(-10)} className="hover:text-zinc-100 px-1">-</button>
            <span>{activeTab.zoom}%</span>
            <button type="button" onClick={() => handleZoomChange(10)} className="hover:text-zinc-100 px-1">+</button>
          </div>
        </div>

        {/* Extensions & Chrome Toolbar Icons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Device Viewport Toggle (PC / Tablet / Mobile) */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-0.5 text-[10px] font-bold">
            <button
              onClick={() => setDeviceMode('desktop')}
              className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 ${
                deviceMode === 'desktop'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Desktop PC Browser Mode (100% Widescreen)"
            >
              <Laptop className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PC</span>
            </button>
            <button
              onClick={() => setDeviceMode('tablet')}
              className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 ${
                deviceMode === 'tablet'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Tablet Mode (768px Viewport)"
            >
              <Tablet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tablet</span>
            </button>
            <button
              onClick={() => setDeviceMode('mobile')}
              className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 ${
                deviceMode === 'mobile'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Mobile Smartphone Mode (iPhone / Android Mobile Viewport)"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mobile</span>
            </button>
          </div>

          {/* Chrome Global Media Controls Button (Music Note) */}
          <button
            onClick={() => setShowGlobalMediaHub(!showGlobalMediaHub)}
            className={`p-1.5 rounded-lg border transition-all ${
              isAudioPlaying || showGlobalMediaHub
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'hover:bg-zinc-800 text-zinc-400 border-transparent hover:text-zinc-200'
            }`}
            title="Global Media Controls (Audio & Video Player)"
          >
            <Music className={`w-4 h-4 ${isAudioPlaying ? 'animate-bounce text-emerald-400' : ''}`} />
          </button>

          {/* Autonomous Agent Clearance Deck Toggle */}
          <div className="hidden lg:flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-0.5 text-[10px] font-bold">
            <button
              onClick={() => setAgentAccessMode('permanent')}
              className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 ${
                agentAccessMode === 'permanent'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Permanent 24/7 Agent Internet Clearance (Zero Tokens)"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>PERMANENT</span>
            </button>
            <button
              onClick={() => setAgentAccessMode('supervised')}
              className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 ${
                agentAccessMode === 'supervised'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Session Supervised Access"
            >
              <Radio className="w-3 h-3 text-sky-400" />
              <span>SESSION</span>
            </button>
          </div>

          {/* Chrome DevTools Toggle (F12) */}
          <button
            onClick={() => setShowDevTools(!showDevTools)}
            className={`p-1.5 rounded-lg border transition-all ${
              showDevTools
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                : 'hover:bg-zinc-800 text-zinc-400 border-transparent hover:text-zinc-200'
            }`}
            title="Inspect / DevTools (F12)"
          >
            <Code className="w-4 h-4" />
          </button>

          {/* Chrome Three Dots Menu Button (⋮) */}
          <div className="relative">
            <button
              onClick={() => setShowChromeMenu(!showChromeMenu)}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Customize and control Sovereign Chrome"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Three Dots Menu Dropdown */}
            {showChromeMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowChromeMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-64 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl z-50 py-1.5 text-xs text-zinc-200 divide-y divide-zinc-800">
                  <div className="px-3 py-2 flex items-center justify-between text-zinc-400 text-[11px]">
                    <span>Sovereign Chrome 122.0</span>
                    <span className="text-emerald-400 font-bold font-mono">TOR-MESH</span>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => { setShowChromeMenu(false); createNewTab(); }}
                      className="w-full px-3 py-1.5 hover:bg-zinc-800 flex items-center justify-between text-left"
                    >
                      <span className="flex items-center gap-2"><Plus className="w-3.5 h-3.5 text-zinc-400" /> New tab</span>
                      <span className="text-[10px] text-zinc-500 font-mono">Ctrl+T</span>
                    </button>
                    <button
                      onClick={() => { setShowChromeMenu(false); createNewTab('sovereign://newtab'); }}
                      className="w-full px-3 py-1.5 hover:bg-zinc-800 flex items-center justify-between text-left"
                    >
                      <span className="flex items-center gap-2"><ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> New Ghost/Stealth tab</span>
                      <span className="text-[10px] text-zinc-500 font-mono">Ctrl+Shift+N</span>
                    </button>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => { setShowChromeMenu(false); updateActiveTab({ viewMode: 'history' }); }}
                      className="w-full px-3 py-1.5 hover:bg-zinc-800 flex items-center justify-between text-left"
                    >
                      <span className="flex items-center gap-2"><History className="w-3.5 h-3.5 text-zinc-400" /> History</span>
                      <span className="text-[10px] text-zinc-500 font-mono">Ctrl+H</span>
                    </button>
                    <button
                      onClick={() => { setShowChromeMenu(false); updateActiveTab({ viewMode: 'bookmarks' }); }}
                      className="w-full px-3 py-1.5 hover:bg-zinc-800 flex items-center justify-between text-left"
                    >
                      <span className="flex items-center gap-2"><Bookmark className="w-3.5 h-3.5 text-zinc-400" /> Bookmarks</span>
                      <span className="text-[10px] text-zinc-500 font-mono">Ctrl+Shift+O</span>
                    </button>
                    <button
                      onClick={() => { setShowChromeMenu(false); setShowGlobalMediaHub(true); }}
                      className="w-full px-3 py-1.5 hover:bg-zinc-800 flex items-center justify-between text-left"
                    >
                      <span className="flex items-center gap-2"><Music className="w-3.5 h-3.5 text-emerald-400" /> Global Media Hub</span>
                      <span className="text-[10px] text-zinc-500 font-mono">Media</span>
                    </button>
                  </div>

                  <div className="py-1">
                    <div className="px-3 py-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-2"><ZoomIn className="w-3.5 h-3.5 text-zinc-400" /> Zoom</span>
                      <div className="flex items-center gap-2 bg-zinc-800 px-2 py-0.5 rounded text-[11px] font-mono">
                        <button onClick={() => handleZoomChange(-10)} className="hover:text-white">-</button>
                        <span>{activeTab.zoom}%</span>
                        <button onClick={() => handleZoomChange(10)} className="hover:text-white">+</button>
                      </div>
                    </div>
                    <button
                      onClick={() => { setShowChromeMenu(false); updateActiveTab({ viewMode: 'agent-learn' }); }}
                      className="w-full px-3 py-1.5 hover:bg-zinc-800 flex items-center justify-between text-left text-sky-300"
                    >
                      <span className="flex items-center gap-2"><Cpu className="w-3.5 h-3.5 text-sky-400" /> Autonomous Agent Research</span>
                      <span className="text-[10px] text-emerald-400 font-mono">0 Tokens</span>
                    </button>
                    <button
                      onClick={() => { setShowChromeMenu(false); setShowDevTools(true); }}
                      className="w-full px-3 py-1.5 hover:bg-zinc-800 flex items-center justify-between text-left"
                    >
                      <span className="flex items-center gap-2"><Code className="w-3.5 h-3.5 text-zinc-400" /> Developer Tools</span>
                      <span className="text-[10px] text-zinc-500 font-mono">F12</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 3. CHROME BOOKMARKS BAR */}
      {showBookmarksBar && (
        <div className="bg-zinc-900/60 px-3 py-1 border-b border-zinc-800 flex items-center gap-1.5 overflow-x-auto text-[11px] select-none scrollbar-none">
          {bookmarks.map((bm) => (
            <button
              key={bm.id}
              onClick={() => navigateTo(bm.url)}
              className="px-2 py-1 rounded-md hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 flex items-center gap-1.5 shrink-0 transition-colors"
            >
              {bm.folder === 'Media' ? (
                <Video className="w-3 h-3 text-red-400" />
              ) : bm.folder === 'Sovereign' ? (
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
              ) : (
                <Globe className="w-3 h-3 text-sky-400" />
              )}
              <span className="max-w-[120px] truncate">{bm.title}</span>
            </button>
          ))}
          
          <button
            type="button"
            onClick={() => {
              setBookmarkDraftUrl(activeTab.url.startsWith('http') ? activeTab.url : 'https://');
              setBookmarkDraftTitle(activeTab.title || 'New Bookmark');
              setBookmarkDraftFolder('Custom');
              setShowAddBookmarkModal(true);
            }}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 shrink-0 ml-1 cursor-pointer"
            title="Add bookmark"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* 3.5 ACTIVE MEDIA DETECTED QUICK BAR (Video & Audio Player Controls) */}
      {(activeTab.hasAudio || detectedMediaUrl || isVideoOrAudioUrl(activeTab.url)) && (
        <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 px-3 py-1.5 border-b border-emerald-500/30 flex items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>ACTIVE MEDIA</span>
            </span>
            <span className="text-zinc-200 font-semibold truncate text-[11px]">
              {detectedMediaUrl ? (activeTab.title || 'Page Video/Audio Stream') : (activeTab.title || 'Media Playing')}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                const targetMedia = detectedMediaUrl || activeTab.url;
                openInUnifiedCinemaPlayer(targetMedia, activeTab.title || 'High-Definition Cinema Video & Audio');
              }}
              className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-sm transition-all cursor-pointer"
              title="Pop out in 1080p Cinema Player with Stereo Sound"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Pop Out Cinema Player (Video + Audio)</span>
            </button>

            <button
              onClick={() => setShowGlobalMediaHub(!showGlobalMediaHub)}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-[10px] flex items-center gap-1 transition-all cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>Audio Deck</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. CHROME GLOBAL MEDIA CONTROLS FLYOUT (Music & Video Engine) */}
      {showGlobalMediaHub && (
        <div className="bg-zinc-900 border-b border-zinc-800 p-4 shadow-2xl relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Music className="w-4 h-4 animate-pulse" />
              </span>
              <div>
                <h4 className="text-xs font-bold text-zinc-100 flex items-center gap-2">
                  <span>Chrome Global Media Hub</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                    STEREO AUDIO ACTIVE
                  </span>
                </h4>
                <p className="text-[10px] text-zinc-400">
                  Background audio & video playback pipeline with zero browser throttling
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowGlobalMediaHub(false)}
              className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Active Audio Player Card */}
            <div className="md:col-span-2 bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-600 to-emerald-600 flex items-center justify-center text-white text-xl shadow-lg shrink-0">
                  {isAudioPlaying ? '🎵' : '⏸️'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs text-zinc-100 truncate">{activeMediaTrack.title}</div>
                  <div className="text-[11px] text-emerald-400 font-mono">{activeMediaTrack.artist}</div>
                </div>

                {/* Play / Pause Button */}
                <button
                  onClick={() => {
                    if (audioRef.current) {
                      if (isAudioPlaying) {
                        audioRef.current.pause();
                        setIsAudioPlaying(false);
                      } else {
                        audioRef.current.play().catch(e => console.log('Audio autoplay policy:', e));
                        setIsAudioPlaying(true);
                      }
                    }
                  }}
                  className="p-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold shadow-lg transition-transform active:scale-95 cursor-pointer shrink-0"
                >
                  {isAudioPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </div>

              {/* Volume Scrubber & Audio Presets */}
              <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2 flex-1">
                  <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={mediaVolume}
                    onChange={(e) => setMediaVolume(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-zinc-400 w-8">{Math.round(mediaVolume * 100)}%</span>
                </div>

                <div className="flex items-center gap-1 text-[10px]">
                  <span className="text-zinc-500">EQ:</span>
                  {(['master', 'bass', 'clarity'] as const).map(preset => (
                    <button
                      key={preset}
                      onClick={() => setAudioPreset(preset)}
                      className={`px-2 py-0.5 rounded font-mono uppercase font-bold ${
                        audioPreset === preset
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Media Presets */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex flex-col justify-between">
              <div className="text-[11px] font-bold text-zinc-300 mb-2">Live Radio & Stream Presets:</div>
              <div className="space-y-1.5 text-xs">
                <button
                  onClick={() => {
                    setActiveMediaTrack({
                      title: 'DEFCON Cyber Radio',
                      artist: 'SomaFM Music for Hackers',
                      url: 'https://ice1.somafm.com/defcon-128-mp3',
                      type: 'stream'
                    });
                    if (audioRef.current) {
                      audioRef.current.src = 'https://ice1.somafm.com/defcon-128-mp3';
                      audioRef.current.play();
                      setIsAudioPlaying(true);
                    }
                  }}
                  className="w-full text-left px-2 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white flex items-center justify-between"
                >
                  <span className="truncate">📻 DEFCON Cyber Stream</span>
                  <span className="text-[10px] text-emerald-400 font-mono">LIVE</span>
                </button>

                <button
                  onClick={() => {
                    openInUnifiedCinemaPlayer('https://www.youtube.com/watch?v=jfKfPfyJRdk', 'YouTube Lofi Live Video');
                    setShowGlobalMediaHub(false);
                  }}
                  className="w-full text-left px-2 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white flex items-center justify-between"
                >
                  <span className="truncate">🎬 YouTube Lofi Live Video (Decoded HD)</span>
                  <span className="text-[10px] text-red-400 font-mono">1080p</span>
                </button>
              </div>
            </div>
          </div>

          {/* Hidden Audio Element for persistent playback */}
          <audio
            ref={audioRef}
            src={activeMediaTrack.url}
            onPlay={() => setIsAudioPlaying(true)}
            onPause={() => setIsAudioPlaying(false)}
          />
        </div>
      )}

      {/* 5. MAIN BROWSER VIEWPORT CONTAINER (+ OPTIONAL DOCKED AI COPILOT SIDEBAR) */}
      <div className="flex-1 flex min-h-0 overflow-hidden bg-zinc-950">
      <div className="flex-1 relative bg-zinc-950 flex flex-col overflow-hidden min-h-[340px] sm:min-h-[500px] min-w-0">
        
        {/* VIEW A: CUSTOM GOOGLE CHROME NEW TAB DASHBOARD */}
        {activeTab.viewMode === 'newtab' && (
          <div className="flex-1 p-5 md:p-10 overflow-y-auto flex flex-col items-center justify-center max-w-4xl mx-auto w-full bg-[#202124]">
            <div className="flex flex-col items-center mb-8 text-center">
              <div className="w-16 h-16 rounded-full bg-[#292a2d] border border-zinc-700/80 shadow-2xl mb-4 flex items-center justify-center">
                <ChromeEmblem className="w-11 h-11" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-100 tracking-tight">
                Sovereign Google Chrome
              </h1>
              <p className="text-xs text-zinc-400 mt-1 font-mono">
                Live Full-Internet Proxy • Persistent Cookies • Integrated AI Web Copilot
              </p>
            </div>

            {/* Central Google Chrome + AI Omnisearch Pill */}
            <div className="w-full max-w-2xl mb-10">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (searchQuery.trim()) navigateTo(searchQuery.trim());
                }}
                className="relative flex items-center"
              >
                <Search className="w-4 h-4 text-zinc-400 absolute left-4 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Google or type a URL..."
                  className="w-full bg-[#292a2d] border border-zinc-700 hover:border-zinc-500 focus:border-sky-500 rounded-full pl-11 pr-44 py-3 text-sm text-zinc-100 placeholder-zinc-400 shadow-xl focus:outline-none transition-all"
                />
                <div className="absolute right-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCopilotOpen(true);
                      if (searchQuery.trim()) handleAskCopilot(searchQuery.trim());
                    }}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600/70 text-sky-300 rounded-full text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    title="Research with live AI Web Copilot"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>AI Mode</span>
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-full text-xs font-bold transition-colors cursor-pointer"
                  >
                    Search
                  </button>
                </div>
              </form>
            </div>

            {/* Top Shortcuts / Full Open-Internet Speed Dial Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-2xl">
              {[
                { title: 'Open Web Search', url: 'https://www.google.com', icon: '🌐', desc: 'Full Internet' },
                { title: 'Bing Live Web', url: 'https://www.bing.com', icon: '🔍', desc: 'Web & Shopping' },
                { title: 'YouTube', url: 'https://www.youtube.com', icon: '🎬', desc: 'Videos & Music' },
                { title: 'Steam Store', url: 'https://store.steampowered.com', icon: '🎮', desc: 'PC Gaming' },
                { title: 'Reddit', url: 'https://www.reddit.com', icon: '💬', desc: 'Communities' },
                { title: 'CNN News', url: 'https://www.cnn.com', icon: '📰', desc: 'Breaking News' },
                { title: 'Yahoo Portal', url: 'https://www.yahoo.com', icon: '⚡', desc: 'News & Finance' },
                { title: 'Amazon', url: 'https://www.amazon.com', icon: '🛒', desc: 'Shopping' }
              ].map((sc, i) => (
                <div
                  key={i}
                  onClick={() => navigateTo(sc.url)}
                  className="p-3.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-all flex flex-col items-center text-center group shadow-md"
                >
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 group-hover:bg-zinc-700 flex items-center justify-center text-lg mb-2 transition-transform group-hover:scale-110">
                    {sc.icon}
                  </div>
                  <div className="text-xs font-bold text-zinc-200 group-hover:text-white truncate w-full">{sc.title}</div>
                  <div className="text-[10px] text-zinc-500 font-mono mt-0.5 truncate w-full">{sc.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW B: LIVE INTERACTIVE BROWSER VIEWPORT (Iframe Engine) */}
        {activeTab.viewMode === 'viewport' && activeTab.url !== 'sovereign://newtab' && (
          <div className={`flex-1 w-full h-full relative bg-zinc-950 flex flex-col ${
            deviceMode === 'mobile' || deviceMode === 'tablet' ? 'items-center justify-center p-2 sm:p-4 bg-zinc-950/90 overflow-y-auto' : ''
          }`}>
            <div className={`flex flex-col relative transition-all duration-300 ${
              deviceMode === 'mobile' 
                ? 'w-full max-w-[390px] h-[65dvh] max-h-[780px] min-h-[400px] bg-black rounded-[36px] sm:rounded-[44px] border-[6px] sm:border-[8px] border-zinc-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden ring-1 ring-zinc-700/60 shrink-0'
                : deviceMode === 'tablet'
                ? 'w-full max-w-[768px] h-[68dvh] max-h-[820px] min-h-[420px] bg-black rounded-[24px] sm:rounded-[28px] border-[6px] border-zinc-800 shadow-2xl overflow-hidden ring-1 ring-zinc-700/60 shrink-0'
                : 'w-full h-full flex-1'
            }`}>
              {/* Mobile Smartphone Status Bar & Dynamic Island */}
              {deviceMode === 'mobile' && (
                <div className="bg-black text-white px-6 pt-3 pb-2 flex items-center justify-between text-[11px] font-semibold select-none shrink-0 z-30 border-b border-zinc-900">
                  <span className="font-mono">9:41</span>
                  {/* Dynamic Island Pill */}
                  <div className="w-24 h-4 bg-zinc-900 rounded-full flex items-center justify-center gap-1.5 shadow-inner">
                    <div className="w-2 h-2 rounded-full bg-zinc-950 ring-1 ring-zinc-800" />
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono">
                    <span>5G</span>
                    <span>100%</span>
                  </div>
                </div>
              )}

              {/* Tablet Top Header Indicator */}
              {deviceMode === 'tablet' && (
                <div className="bg-zinc-900 px-4 py-1.5 flex items-center justify-between text-[10px] text-zinc-400 font-mono select-none border-b border-zinc-800">
                  <span>Sovereign Slate (Tablet Viewport 768px)</span>
                  <span>Multi-Touch Active</span>
                </div>
              )}

              <iframe
                ref={iframeRef}
                key={`${activeTab.id}-${activeTab.url}-${renderEngineMode}-${refreshKey}`}
                src={
                  renderEngineMode === 'direct'
                    ? activeTab.url
                    : `/api/browser/render?url=${encodeURIComponent(activeTab.url)}&sid=${encodeURIComponent(sessionId)}&ua=${deviceMode === 'mobile' ? 'mobile' : 'desktop'}`
                }
                title={activeTab.title}
                className="w-full flex-1 border-0 bg-white dark:bg-zinc-950 min-h-[320px] sm:min-h-[460px] h-full"
                style={{
                  transform: `scale(${activeTab.zoom / 100})`,
                  transformOrigin: 'top left',
                  width: `${100 * (100 / activeTab.zoom)}%`,
                  height: `${100 * (100 / activeTab.zoom)}%`
                }}
                onLoad={() => {
                  updateActiveTab({ isLoading: false });
                }}
                allow="accelerometer; autoplay *; clipboard-write *; encrypted-media *; fullscreen *; gyroscope; picture-in-picture *; web-share *; microphone *; camera *; display-capture *"
                allowFullScreen={true}
              />

              {/* Mobile Smartphone Bottom Navigation Bar */}
              {deviceMode === 'mobile' && (
                <div className="bg-zinc-950/95 backdrop-blur border-t border-zinc-800/80 px-4 py-2.5 flex items-center justify-between text-zinc-400 select-none shrink-0 z-30">
                  <button 
                    onClick={handleBack} 
                    disabled={activeTab.historyIndex <= 0} 
                    className="p-1.5 hover:text-white disabled:opacity-30 transition-colors"
                    title="Back"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={handleForward} 
                    disabled={activeTab.historyIndex >= activeTab.history.length - 1} 
                    className="p-1.5 hover:text-white disabled:opacity-30 transition-colors"
                    title="Forward"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleCopyUrl()} 
                    className="p-1.5 hover:text-white transition-colors" 
                    title="Share / Copy Link"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={toggleBookmarkCurrentPage} 
                    className={`p-1.5 ${isCurrentPageBookmarked ? 'text-amber-400' : 'hover:text-white'} transition-colors`} 
                    title="Bookmark"
                  >
                    <Star className={`w-4 h-4 ${isCurrentPageBookmarked ? 'fill-amber-400' : ''}`} />
                  </button>
                  <button 
                    onClick={() => createNewTab()} 
                    className="px-2 py-0.5 rounded border border-zinc-700 text-xs font-mono font-bold hover:text-white transition-colors" 
                    title="Tabs"
                  >
                    {tabs.length}
                  </button>
                  <button 
                    onClick={() => navigateTo('sovereign://newtab')} 
                    className="p-1.5 hover:text-white transition-colors" 
                    title="Home / New Tab"
                  >
                    <Home className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW C: SEARCH RESULTS VIEW (0 Token Substrate Search) */}
        {activeTab.viewMode === 'search' && (
          <div className="flex-1 p-4 md:p-8 overflow-y-auto max-w-4xl mx-auto w-full">
            <div className="mb-6 pb-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-zinc-100 flex items-center gap-2">
                  <span>Search Results: "{searchQuery}"</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 font-bold">
                    0 TOKENS BURNED
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Full open-internet multi-engine aggregation (Bing OpenWeb, Yahoo, Google News, DuckDuckGo, GitHub, HackerNews)
                </p>
              </div>
            </div>

            {isSearching ? (
              <div className="py-20 flex flex-col items-center justify-center text-center">
                <RefreshCw className="w-8 h-8 text-sky-400 animate-spin mb-3" />
                <p className="text-sm font-semibold text-zinc-300">Searching deterministic web index...</p>
                <p className="text-xs text-zinc-500 mt-1 font-mono">Zero LLM tokens burned</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="py-16 text-center text-zinc-400">
                <p>No results found for "{searchQuery}".</p>
                <button
                  onClick={() => navigateTo(`https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}`)}
                  className="mt-3 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold"
                >
                  Search on DuckDuckGo Web &rarr;
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {searchResults.map((result, idx) => (
                  <div
                    key={idx}
                    onClick={() => navigateTo(result.url)}
                    className="p-4 bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 rounded-xl cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-2 text-[11px] text-zinc-400 mb-1">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-sky-400 font-mono">{result.source}</span>
                      <span className="truncate">{result.url}</span>
                    </div>
                    <h4 className="text-sm font-bold text-sky-400 group-hover:text-sky-300 group-hover:underline">
                      {result.title}
                    </h4>
                    <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                      {result.snippet}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW D: READER MODE */}
        {activeTab.viewMode === 'reader' && (
          <div className="flex-1 p-6 md:p-12 overflow-y-auto max-w-3xl mx-auto w-full leading-relaxed">
            <div className="mb-6 pb-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 uppercase font-bold">
                  Distraction-Free Reader Mode
                </span>
                <h2 className="text-xl font-bold text-zinc-100 mt-2">
                  {proxyData?.preview ? (activeTab.title || 'Extracted Document') : 'Fetching Clean Page Text...'}
                </h2>
                <div className="text-xs text-zinc-400 mt-1 font-mono">{activeTab.url}</div>
              </div>
              <button
                onClick={() => updateActiveTab({ viewMode: 'viewport' })}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold"
              >
                Back to Web
              </button>
            </div>

            {isProxyLoading ? (
              <div className="py-20 text-center">
                <RefreshCw className="w-8 h-8 text-sky-400 animate-spin mx-auto mb-3" />
                <p className="text-sm text-zinc-400">Extracting article text from proxy stream...</p>
              </div>
            ) : (
              <div className="prose prose-invert max-w-none text-zinc-300 text-sm whitespace-pre-wrap font-sans">
                {proxyData?.preview || 'No text extracted. Open in Web Viewport mode.'}
              </div>
            )}
          </div>
        )}

        {/* VIEW E: AUTONOMOUS AGENT RESEARCH DECK (0 TOKENS) */}
        {activeTab.viewMode === 'agent-learn' && (
          <div className="flex-1 p-4 md:p-8 overflow-y-auto max-w-5xl mx-auto w-full">
            <div className="mb-6 pb-4 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-sky-400" />
                  <h3 className="text-base font-black text-zinc-100 uppercase tracking-wide">
                    Autonomous Agent Research & Learning Engine
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    0 TOKENS BURNED
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Agents explore the open web via deterministic anonymous proxies, extract semantic findings, and sign dossiers with SHA-256 integrity.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Agent Clearance:</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  {agentAccessMode.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Launchpad Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 mb-6 shadow-xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                    Target Research Inquiry / Domain Topic:
                  </label>
                  <input
                    type="text"
                    value={learningTopic}
                    onChange={(e) => setLearningTopic(e.target.value)}
                    placeholder="e.g. Zero-knowledge rollups, Aurelius God Kernel architecture..."
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                    Assigned Agent Lieutenant:
                  </label>
                  <select
                    value={selectedAgent}
                    onChange={(e) => setSelectedAgent(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-sky-500 font-mono"
                  >
                    <option value="Aurelius-Teraflop-Omega">Aurelius Strategic Core (DeepSeek-R1 / Gemini Cascade)</option>
                    <option value="Sovereign-Engineer-Core">Sovereign Engineer (Qwen 2.5 Coder 32B)</option>
                    <option value="Lysander-30-CBP">Lysander 3.0 CBP (Llama 3.2 Termux Edge)</option>
                    <option value="Logic-Proof-Node">Logic Node (Phi-4 14B Proofs)</option>
                    <option value="Vision-Spatial-Node">Vision Node (Llama 3.2 11B Vision)</option>
                    <option value="Memory-Vector-Node">Memory Node (Qwen 2.5 7B Axioms)</option>
                    <option value="Kernel-God-RingMinus3">Kernel Core Node (DeepSeek-R1 32B Local)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-zinc-500">Presets:</span>
                  {[
                    'Zero Volatility Consensus',
                    'Aurelius God Kernel Architecture',
                    'Cryptographic SHA-256 Provenance'
                  ].map((preset, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setLearningTopic(preset)}
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleRunAgentLearn}
                  disabled={isAgentLearning}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 via-indigo-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isAgentLearning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Agent Crawling & Learning...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Dispatch Agent (0 Tokens)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Live Terminal Log */}
            {agentLogs.length > 0 && (
              <div className="mb-6 bg-zinc-950 border border-zinc-800 rounded-2xl p-4 font-mono text-[11px]">
                <div className="text-zinc-400 font-bold mb-2 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>Agent Telemetry Stream</span>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {agentLogs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-zinc-500">+{log.timeMs}ms</span>
                      <span className="text-sky-400 font-bold">[{log.step}]</span>
                      <span className="text-zinc-300">{log.detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ingested Dossier Output */}
            {currentDossier && (
              <div className="bg-zinc-900 border border-emerald-500/40 rounded-2xl p-5 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>{currentDossier.title}</span>
                  </h4>
                  <button
                    onClick={() => handleSaveDossierToVault(currentDossier)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>{savedSuccess ? 'Saved to Vault!' : 'Save to Sovereign Vault'}</span>
                  </button>
                </div>

                <p className="text-xs text-zinc-300 mb-4">{currentDossier.summary}</p>

                <div className="space-y-2 mb-4">
                  <div className="text-[11px] font-bold text-zinc-400 uppercase">Key Semantic Findings:</div>
                  {currentDossier.findings.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-zinc-200 bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800">
                      <span className="text-emerald-400 font-bold">{i + 1}.</span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

                <div className="text-[10px] font-mono text-zinc-500 flex items-center justify-between border-t border-zinc-800 pt-3">
                  <span>SHA-256: {currentDossier.sha256}</span>
                  <span>Tokens Burned: 0 (Deterministic Substrate)</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW F: BROWSING HISTORY */}
        {activeTab.viewMode === 'history' && (
          <div className="flex-1 p-6 md:p-10 overflow-y-auto max-w-4xl mx-auto w-full">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-sky-400" />
                <h3 className="text-lg font-bold text-zinc-100">Browsing History</h3>
              </div>
              <button
                onClick={() => setBrowsingHistory([])}
                className="px-3 py-1.5 rounded-xl bg-red-500/20 text-red-300 hover:bg-red-500/30 text-xs font-bold flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Browsing Data</span>
              </button>
            </div>

            <div className="divide-y divide-zinc-800">
              {browsingHistory.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigateTo(item.url)}
                  className="py-3 flex items-center justify-between hover:bg-zinc-900 px-3 rounded-xl cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Globe className="w-4 h-4 text-zinc-500 shrink-0" />
                    <div className="truncate">
                      <div className="text-xs font-bold text-zinc-200 truncate">{item.title}</div>
                      <div className="text-[11px] text-zinc-500 font-mono truncate">{item.url}</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-500 shrink-0 font-mono">{item.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW G: BOOKMARKS MANAGER */}
        {activeTab.viewMode === 'bookmarks' && (
          <div className="flex-1 p-6 md:p-10 overflow-y-auto max-w-4xl mx-auto w-full">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-zinc-100">Bookmarks & Sovereign Pins</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {bookmarks.map((bm) => (
                <div
                  key={bm.id}
                  className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between hover:border-zinc-700"
                >
                  <div
                    onClick={() => navigateTo(bm.url)}
                    className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
                  >
                    <Star className="w-4 h-4 text-amber-400 shrink-0 fill-amber-400" />
                    <div className="truncate">
                      <div className="text-xs font-bold text-zinc-200 truncate">{bm.title}</div>
                      <div className="text-[10px] text-zinc-500 font-mono truncate">{bm.url}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setBookmarks(bookmarks.filter(b => b.id !== bm.id))}
                    className="p-1 rounded text-zinc-500 hover:text-red-400"
                    title="Remove bookmark"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT / MOBILE DRAWER: LIVE AI WEB COPILOT */}
      {isCopilotOpen && (
        <aside className="fixed inset-0 z-50 lg:static lg:z-auto lg:w-[360px] xl:w-[400px] lg:shrink-0 bg-zinc-950/95 lg:bg-zinc-900/60 lg:border-l border-zinc-800 flex flex-col backdrop-blur-md lg:backdrop-blur-none">
          {/* Copilot Header */}
          <div className="px-3.5 py-2.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Bot className="w-4 h-4 text-sky-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-bold text-zinc-100 truncate">AI Web Copilot (Live Net + DOM)</div>
                <div className="text-[10px] font-mono text-zinc-400 truncate">
                  {activeTab.url.startsWith('http') ? activeTab.url : 'Ready for open-web query'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setCopilotAutoBrowse((prev) => !prev)}
                className={`px-2 py-1 rounded text-[10px] font-mono font-bold border cursor-pointer whitespace-nowrap ${
                  copilotAutoBrowse
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}
                title="Automatically run live multi-engine web search and crawl cited pages"
              >
                {copilotAutoBrowse ? 'Auto-Browse ON' : 'Page Only'}
              </button>
              <button
                type="button"
                onClick={() => setIsCopilotOpen(false)}
                aria-label="Close AI Copilot"
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="px-3 py-2 border-b border-zinc-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0 bg-zinc-950/60">
            {[
              { label: 'Summarize Page', prompt: 'Summarize the key points, facts, and structure of this open page.' },
              { label: 'Extract Links & Data', prompt: 'Extract the most important data points, entities, and clickable links from this page.' },
              { label: 'Verify on Live Web', prompt: `Verify claims on ${activeTab.title || activeTab.url} against live multi-engine web search sources.` },
              { label: 'Latest Market News', prompt: 'Search live news for today’s top global financial, macro, and AI technology developments.' }
            ].map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => handleAskCopilot(chip.prompt)}
                disabled={copilotLoading}
                className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-semibold text-zinc-300 hover:text-sky-300 whitespace-nowrap shrink-0 cursor-pointer transition-colors disabled:opacity-50"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Messages Thread */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {copilotMessages.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-xl p-3 text-xs leading-relaxed border ${
                  msg.role === 'user'
                    ? 'bg-sky-950/35 border-sky-500/30 text-sky-100 ml-6'
                    : 'bg-zinc-900/90 border-zinc-800 text-zinc-200 mr-2'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1 text-[10px] font-mono text-zinc-400">
                  <span className="font-bold uppercase">{msg.role === 'user' ? 'Operator' : (msg.model || 'AI Copilot')}</span>
                  {msg.elapsedMs !== undefined && <span className="tabular-nums">{msg.elapsedMs}ms</span>}
                </div>
                <div className="whitespace-pre-wrap break-words">{msg.content}</div>

                {msg.discoveredUrls && msg.discoveredUrls.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-zinc-800 space-y-1">
                    <div className="text-[10px] font-mono uppercase text-zinc-400">Live Discovered Sources:</div>
                    {msg.discoveredUrls.slice(0, 6).map((u, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 bg-zinc-950/90 px-2 py-1.5 rounded-lg border border-zinc-800/80">
                        <button
                          type="button"
                          onClick={() => navigateTo(u.url)}
                          className="text-left text-[11px] text-sky-400 hover:text-sky-300 truncate flex-1 cursor-pointer"
                          title={u.url}
                        >
                          <Link2 className="w-3 h-3 inline mr-1" />
                          {u.title || u.url}
                        </button>
                        <button
                          type="button"
                          onClick={() => createNewTab(u.url)}
                          className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300 whitespace-nowrap shrink-0 cursor-pointer"
                          title="Open in new tab"
                        >
                          New Tab
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {msg.role === 'assistant' && msg.id !== 'copilot-welcome' && (
                  <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex flex-wrap items-center gap-1.5">
                    {onInjectToChat && (
                      <button
                        type="button"
                        onClick={() => {
                          onInjectToChat(`[Browser Web Intel · ${activeTab.url}]\n\n${msg.content}`, false);
                          if (onSelectModule) onSelectModule('chat');
                        }}
                        className="px-2 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-[10px] font-semibold text-amber-300 flex items-center gap-1 cursor-pointer"
                      >
                        <MessageSquarePlus className="w-3 h-3" />
                        <span>Send to Chat</span>
                      </button>
                    )}
                    {onSaveToVault && (
                      <button
                        type="button"
                        onClick={() =>
                          onSaveToVault({
                            type: 'knowledge',
                            title: `Web Copilot: ${activeTab.title || activeTab.url}`,
                            prompt: msg.content,
                            model: msg.model || 'ai-web-copilot',
                            mediaUrl: activeTab.url
                          })
                        }
                        className="px-2 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-[10px] font-semibold text-emerald-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Database className="w-3 h-3" />
                        <span>Save Vault</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
            {copilotLoading && (
              <div className="rounded-xl p-3 bg-zinc-900 border border-zinc-800 text-xs text-sky-300 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span>Inspecting live DOM & querying open web...</span>
              </div>
            )}
          </div>

          {/* Copilot Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAskCopilot();
            }}
            className="p-3 border-t border-zinc-800 bg-zinc-900/90 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={copilotInput}
              onChange={(e) => setCopilotInput(e.target.value)}
              placeholder="Ask AI to read page, research live web, or find links..."
              className="flex-1 min-w-0 bg-zinc-950 border border-zinc-700 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={copilotLoading || !copilotInput.trim()}
              className="p-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white cursor-pointer shrink-0"
              title="Send to AI Web Copilot"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </aside>
      )}
      </div>

      {/* 6. BROWSER DEVTOOLS DRAWER (Real Network + Live Cookies + Console + Security) */}
      {showDevTools && (
        <div className="h-64 bg-zinc-950 border-t-2 border-zinc-800 flex flex-col z-30">
          {/* DevTools Tab Bar */}
          <div className="bg-zinc-900 px-3 py-1.5 border-b border-zinc-800 flex items-center justify-between text-xs select-none overflow-x-auto scrollbar-none gap-2">
            <div className="flex items-center gap-2 font-mono shrink-0">
              <span className="text-sky-400 font-bold flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5" /> DevTools
              </span>
              <span className="text-zinc-600">|</span>
              {(['network', 'cookies', 'console', 'elements', 'security'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setDevToolsTab(tab);
                    if (tab === 'network' || tab === 'cookies') syncLiveTelemetry();
                  }}
                  className={`px-2 py-0.5 rounded uppercase text-[10px] font-bold cursor-pointer ${
                    devToolsTab === tab
                      ? 'bg-zinc-800 text-sky-300'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {tab === 'cookies' ? `cookies (${sessionCookies.length})` : tab}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={syncLiveTelemetry}
                className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono cursor-pointer"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={() => setShowDevTools(false)}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* DevTools Body */}
          <div className="flex-1 p-3 overflow-y-auto font-mono text-[11px] bg-zinc-950 text-zinc-300">
            {devToolsTab === 'network' && (
              <div className="space-y-1 min-w-[520px]">
                <div className="grid grid-cols-6 text-[10px] font-bold text-zinc-500 border-b border-zinc-800 pb-1 mb-1">
                  <span className="col-span-2">URL</span>
                  <span>Status</span>
                  <span>Type</span>
                  <span>Size</span>
                  <span>Elapsed</span>
                </div>
                {networkLogs.length === 0 ? (
                  <div className="text-zinc-500 py-4">Navigate to a live URL to record real server proxy HTTP/HTTPS traffic.</div>
                ) : (
                  networkLogs.map(log => (
                    <div key={log.id} className="grid grid-cols-6 py-1 hover:bg-zinc-900 rounded px-1 tabular-nums">
                      <span className="col-span-2 truncate text-zinc-200 pr-2" title={log.url}>{log.url}</span>
                      <span className={log.status >= 400 || log.status === 0 ? 'text-rose-400' : 'text-emerald-400'}>{log.status}</span>
                      <span className="text-zinc-400 truncate pr-2">{log.type}</span>
                      <span className="text-zinc-400">{log.size}</span>
                      <span className="text-sky-400">{log.timeMs}ms</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {devToolsTab === 'cookies' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-800">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <Cookie className="w-3.5 h-3.5 text-amber-400" />
                    <span>Active Session Jar: <strong className="text-zinc-200">{sessionId}</strong></span>
                  </span>
                  <button
                    type="button"
                    onClick={handleClearCookies}
                    className="px-2.5 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[10px] font-bold cursor-pointer"
                  >
                    Clear Session Cookies
                  </button>
                </div>
                {sessionCookies.length === 0 ? (
                  <div className="text-zinc-500 py-3">No active cookies stored for this session yet.</div>
                ) : (
                  sessionCookies.map((c, idx) => (
                    <div key={`${c.domain}-${c.name}-${idx}`} className="grid grid-cols-4 gap-2 py-1 border-b border-zinc-900 text-[10px]">
                      <span className="text-sky-300 truncate">{c.name}</span>
                      <span className="text-zinc-400 truncate">{c.domain}{c.path}</span>
                      <span className="text-zinc-300 truncate">{c.value}</span>
                      <span className="text-emerald-400">{[c.httpOnly ? 'HttpOnly' : '', c.secure ? 'Secure' : 'Standard'].filter(Boolean).join(' ')}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {devToolsTab === 'console' && (
              <div className="space-y-1">
                {consoleLogs.length === 0 ? (
                  <div className="text-zinc-500 py-3">Waiting for browser runtime events...</div>
                ) : (
                  consoleLogs.map((log, i) => (
                    <div key={i} className="flex items-start gap-2 py-0.5">
                      <span className="text-zinc-500">[{log.time}]</span>
                      <span className={log.type === 'error' ? 'text-red-400' : log.type === 'warn' ? 'text-amber-400' : 'text-emerald-400'}>
                        [{log.type.toUpperCase()}]
                      </span>
                      <span className="text-zinc-200">{log.msg}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {devToolsTab === 'elements' && (
              <div className="text-xs text-emerald-400 space-y-1 font-mono">
                <div>{'<!DOCTYPE html>'}</div>
                <div className="pl-3">{'<html lang="en">'}</div>
                <div className="pl-6">{'<head><title>'}{activeTab.title}{'</title></head>'}</div>
                <div className="pl-6">{`<iframe src="/api/browser/render?url=${activeTab.url}&sid=${sessionId}" />`}</div>
                <div className="pl-6 text-zinc-400">{`<!-- Headings detected: ${proxyData?.headings?.length || 0} | Links: ${proxyData?.links?.length || 0} | Images: ${proxyData?.images?.length || 0} -->`}</div>
                <div className="pl-3">{'</html>'}</div>
              </div>
            )}

            {devToolsTab === 'security' && (
              <div className="space-y-2">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300">
                  Real HTTP/HTTPS Proxy Relay Active · TLS Verification Enabled · SHA-256 Digest: {proxyData?.sha256 || 'ready'}
                </div>
                <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg">
                  Session Cookies: <strong>{sessionCookies.length}</strong> · Last Response: <strong>{proxyData?.status || 200}</strong> · Latency: <strong>{proxyData?.elapsedMs || 0}ms</strong>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. ADD BOOKMARK INLINE MODAL (Zero window.prompt) */}
      {showAddBookmarkModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddBookmarkModal(false);
          }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!bookmarkDraftUrl.trim() || !bookmarkDraftTitle.trim()) return;
              setBookmarks((prev) => [
                ...prev,
                {
                  id: `bm-${Date.now()}`,
                  title: bookmarkDraftTitle.trim(),
                  url: bookmarkDraftUrl.trim(),
                  folder: bookmarkDraftFolder.trim() || 'Custom'
                }
              ]);
              setShowAddBookmarkModal(false);
            }}
            className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-zinc-100">Add Browser Bookmark</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddBookmarkModal(false)}
                aria-label="Close Add Bookmark"
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Title</label>
              <input
                type="text"
                value={bookmarkDraftTitle}
                onChange={(e) => setBookmarkDraftTitle(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-700 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">URL</label>
              <input
                type="text"
                value={bookmarkDraftUrl}
                onChange={(e) => setBookmarkDraftUrl(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-700 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Folder</label>
              <input
                type="text"
                value={bookmarkDraftFolder}
                onChange={(e) => setBookmarkDraftFolder(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none"
              />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddBookmarkModal(false)}
                className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold cursor-pointer"
              >
                Save Bookmark
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 8. SITE INFORMATION & PROVENANCE MODAL */}
      {showSiteInfoModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSiteInfoModal(false);
          }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
        >
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <h3 className="text-sm font-bold text-zinc-100">Site Information & Proxy Telemetry</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSiteInfoModal(false)}
                aria-label="Close Site Information"
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <div className="text-[10px] text-zinc-500 uppercase font-mono">Current Origin:</div>
                <div className="font-bold text-zinc-200 mt-0.5 truncate">{activeTab.url}</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                  <div className="text-[10px] text-zinc-500 uppercase font-mono">HTTP Status:</div>
                  <div className="font-bold text-emerald-400 mt-0.5">{proxyData?.status || 'Ready'}</div>
                </div>
                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                  <div className="text-[10px] text-zinc-500 uppercase font-mono">Proxy Latency:</div>
                  <div className="font-bold text-sky-400 mt-0.5 tabular-nums">{proxyData?.elapsedMs || 0} ms</div>
                </div>
              </div>

              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Session Cookies:</span>
                  <span className="text-emerald-400 font-bold tabular-nums">{sessionCookies.length} active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Extracted Links:</span>
                  <span className="text-sky-400 font-bold tabular-nums">{proxyData?.links?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">SHA-256 Digest:</span>
                  <span className="text-zinc-300 font-mono text-[10px] truncate max-w-[160px]">{proxyData?.sha256 || 'pending'}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSiteInfoModal(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Cinema Video Player (Decoded Best Version) */}
      <UltraVideoPlayer
        url={popoutVideoUrl}
        title={popoutVideoTitle}
        isOpen={isPopoutVideoOpen}
        onClose={() => setIsPopoutVideoOpen(false)}
        onSaveToVault={onSaveToVault}
      />

    </div>
  );
};
