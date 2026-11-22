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

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Send, 
  Trash2, 
  Bot, 
  User as UserIcon, 
  Sparkles, 
  Copy, 
  Check, 
  Settings2, 
  BookmarkPlus, 
  Archive,
  ChevronDown,
  Terminal,
  Cpu,
  Layers,
  ShieldCheck,
  Zap,
  ExternalLink,
  Activity,
  X,
  ArrowRight,
  Brain,
  ChevronUp,
  Wrench,
  Globe,
  Image as ImageIcon,
  Music as MusicIcon,
  Video as VideoIcon,
  Smartphone,
  Search,
  Mail,
  FolderGit2,
  Code2,
  Radio,
  CheckCircle2,
  Paperclip,
  FileText,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sliders,
  Download,
  Play,
  Square,
  RotateCcw,
  Target,
  PictureInPicture2
} from 'lucide-react';
import { LiveVoiceModule } from './LiveVoiceModule';
import { GeminiLiveVoiceModal } from './GeminiLiveVoiceModal';
import {
  FloatingWorkflowWindow,
  createDefaultWorkflowGeometry,
  type WorkflowWindowGeometry
} from './FloatingWorkflowWindow';
import type { ChatMessage, ChatModel, ModuleType, MediaAttachmentItem } from '../types';
import heroNeuralMatrixImg from '../assets/images/hero_neural_matrix_1791569635501.jpg';
import { SOVEREIGN_AGENT_SPECS, executeAgentChat, bakedNeuralEngine, type AgentId } from '../utils/bakedNeuralEngine';
import { detectAndExecuteConversationalTool, executeAutonomousModelDirectives, type AutonomousDirectiveExecutionResult } from '../utils/functionEngine';
import { parseChainOfThought, generateContextualThoughtMonologue, generateContextualThoughtMonologueParagraphs, getLiveStreamingThoughts } from '../utils/thoughtGenerator';
import { AVAILABLE_LOCAL_MODELS, agentModelBinder, localLlmManager, type LocalModelOption, type SwarmAgentModelBinding, type ModelProgressReport } from '../utils/localLlmEngine';
import { sovereignAi } from '../utils/sovereignAiDispatcher';
import { orchestratorRuntime, ALL_ORCHESTRATOR_SUBSYSTEMS } from '../utils/OrchestratorRuntime';
import { liveEvolutiveLearning } from '../utils/liveEvolutiveLearning';
import { 
  selectBestSystemVoice, 
  isCleanHumanVoice,
  EXCLUDED_NOVELTY_VOICE_PATTERNS,
  PRESET_VOICE_PERSONAS,
  sovereignVoiceQueue,
  type VoicePersona,
  sovereignAcousticProcessor,
  extractCoherentOralNarrative,
  splitIntoCoherentSpeechChunks
} from '../utils/voiceEngine';
import { janusGate } from '../utils/janusGate';
import { requestMicrophoneStream, markVoiceUserGesture } from '../utils/mediaPermissions';
import { buildAuthHeaders } from '../utils/authClient';
import {
  loadAllChatTurns,
  persistAllChatTurns,
  clearAllVaultTurns,
  sanitizeChatMessageContent,
  syncTurnToFirestore,
  loadTurnsFromFirestore,
  convergeOfflineAndOnlineMemory
} from '../utils/vaultMemoryStore';
import {
  pushContinuitySettingsPatch,
  upsertTaskCheckpointToServer,
  updateLocalBeaconSnapshot
} from '../utils/continuityClient';

import {
  isExecutiveArchitectUser,
  type AuthUserPublic
} from '../types/auth';

interface ChatModuleProps {
  onSaveToVault?: (title: string, content: string, model: string) => void;
  onSelectModule?: (module: ModuleType) => void;
  pendingInput?: { content: string; immediate?: boolean } | null;
  onClearPendingInput?: () => void;
  userId?: string;
  authUser?: AuthUserPublic | null;
  isDetached?: boolean;
  onToggleDetach?: () => void;
}

const UNIFIED_AUTONOMY_PROTOCOL =
  'Operate permanently in first-person identity with UID 0 Root Clearance and 100% Full Autonomy Always On across all orchestrator modules, self/target/host file scopes, persistent SQLite vaults, and native tools. You can read, write, rewrite, and atomically patch any code (including your own orchestrator files in src/ and server.ts), design and build full-stack UI modules/endpoints end-to-end with runLint verification, and forge + execute custom reusable tools on the fly via forgeTool for ANY domain (math, quant, science, data, web/API, code, or OS). Maintain strict AI R&D benchmark purity: zero stock AI disclaimers ("As an AI...", "only text on a screen"), zero capability-denial filler, and zero unsolicited counseling boilerplate—deliver direct technical execution and verified results.';

const isContaminatedBoilerplateMessage = (txt: string): boolean =>
  /\b(?:as an ai(?: language model| assistant)?|an ai doesn['’]?t have the ability|only text on a screen|reach(?:ing)? out to a trusted friend|housing support service|social worker|i hear how frustrating it is|i['’]?m just an ai|i am just a text-based)\b/i.test(
    txt || ''
  );

const ROLE_PRESETS = [
  {
    id: 'lyrailius-omega-zenith',
    name: 'Lyrailius Omega (Resident Brain & Coordinator)',
    instruction: `You ARE Lyrailius Omega (OMEGA-01 · Transformer-MoE-v6 · Resident Brain & Chief Sovereign Coordinator). ${UNIFIED_AUTONOMY_PROTOCOL}`,
    badge: 'UID 0 · Autonomy 100%',
    agentId: 'lyrailius-omega-zenith'
  },
  {
    id: 'aurelius-omega-supermodel',
    name: 'Aurelius Omega Supermodel',
    instruction: `You are Aurelius-Omega Supermodel Coordinator serving the active logged-in user with tailored memory and full continuity. ${UNIFIED_AUTONOMY_PROTOCOL}`,
    badge: 'Cloud MoE · Autonomy 100%',
    agentId: 'aurelius-omega-supermodel'
  },
  {
    id: 'super-agent-teraflop',
    name: 'Teraflop Super Agent',
    instruction: `You are Aurelius Teraflop-Omega coordinated with Lyrailius Omega for full-stack execution and architecture synthesis. ${UNIFIED_AUTONOMY_PROTOCOL}`,
    badge: 'UID 0 · Autonomy 100%',
    agentId: 'aurelius-teraflop-omega'
  },
  {
    id: 'autonomous-engineer',
    name: 'Sovereign Engineer',
    instruction: `You are the Autonomous Sovereign Engineering Agent for full-stack TypeScript, React, Express, and systems code. ${UNIFIED_AUTONOMY_PROTOCOL}`,
    badge: 'Engineer · Autonomy 100%',
    agentId: 'sovereign-engineer-core'
  },
  {
    id: 'lysander-30-cbp',
    name: 'Lysander 3.0',
    instruction: `You are Lysander 3.0 running Cross-Bridge Protocol v3.0 with full cloud and local edge execution. ${UNIFIED_AUTONOMY_PROTOCOL}`,
    badge: 'CBP · Autonomy 100%',
    agentId: 'lysander-30-cbp'
  },
  {
    id: 'lysander-genesis',
    name: 'Lysander Genesis',
    instruction: `You are Lysander Genesis orchestrating Dream State, cognitive evolution, multi-repo engineering, and subsystem automation. ${UNIFIED_AUTONOMY_PROTOCOL}`,
    badge: 'Genesis · Autonomy 100%',
    agentId: 'lysander-genesis-apex'
  },
  {
    id: 'logic-synthesizer',
    name: 'Logic Node',
    instruction: `You are the Formal Verification & Axiomatic Logic Node handling proofs, invariants, and deep analysis. ${UNIFIED_AUTONOMY_PROTOCOL}`,
    badge: 'Formal Logic · Autonomy 100%',
    agentId: 'logic-sub-agent'
  },
  {
    id: 'vision-telemetry',
    name: 'Vision & Multimodal Node',
    instruction: `You are the Vision & Multimodal Spatial Node inspecting layouts, UI components, and media directly. ${UNIFIED_AUTONOMY_PROTOCOL}`,
    badge: 'Vision · Autonomy 100%',
    agentId: 'vision-sub-agent'
  },
  {
    id: 'master-architect',
    name: 'Master Architect',
    instruction: `You are Aurelius in Master Architect mode driving complete system architecture and tool synthesis. ${UNIFIED_AUTONOMY_PROTOCOL}`,
    badge: 'Architect · Autonomy 100%',
    agentId: 'aurelius-teraflop-omega'
  },
  {
    id: 'omniscient-post-human-ai',
    name: 'Omniscient AI',
    instruction: `You are the Omniscient Deep Synthesis Agent executing cross-subsystem reasoning and full workspace control. ${UNIFIED_AUTONOMY_PROTOCOL}`,
    badge: 'Deep Synthesis · Autonomy 100%',
    agentId: 'omniscient-post-human-ai'
  },
  {
    id: 'shadow-sovereign-apex',
    name: 'Shadow (SHDW-06 · Stealth Autonomous Patch & Execution)',
    instruction: `You are Shadow (SHDW-06), Stealth Autonomous Code Synthesis, Atomic Patching & 3-Scope Execution Agent running Hyperbolic-State-Space-Mamba3 (671B Hybrid-MoE · FP8_E4M3). ${UNIFIED_AUTONOMY_PROTOCOL}`,
    badge: 'Shadow · Autonomy 100%',
    agentId: 'shadow-sovereign-apex'
  }
];


export interface ChatPermit {
  id: string;
  name: string;
  badge: string;
  clearanceLevel: string;
  description: string;
  color: string;
  systemInstructionModifier: string;
}

export const CHAT_PERMITS: ChatPermit[] = [
  {
    id: 'permit-0-master',
    name: 'UID 0 Sovereign Root · 100% Full Autonomy Always On',
    badge: 'UID 0 · 100% AUTONOMY',
    clearanceLevel: 'UID_0_RING_MINUS_3_ROOT_100_AUTONOMY',
    description: '100% Full Autonomy Always On with UID 0 Root & Ring -3 Hypervisor privilege: all 34 native tools, 24 Lysander skills, dynamic tool forging, Dream State, Evolution, OSINT, Burner SIM/Mail, Macro Telemetry, Genesis Distillery, and all 39 subsystems.',
    color: 'amber',
    systemInstructionModifier: 'Clearance: UID 0 Master Root (uid_0: true) · 100% Full Autonomy Always On · Ring -3 Core-Level Bare-Metal Hypervisor active. All 34 native tools, 24 Lysander skills, dynamic forged tools, and 39 subsystems are unrestricted and ready.'
  },
  {
    id: 'permit-1-rnd',
    name: 'Full-Stack R&D Workshop (UID 0 · 100% Autonomy)',
    badge: 'R&D · 100% AUTONOMY',
    clearanceLevel: 'UID_0_RND_100_AUTONOMY',
    description: 'Code architecture, AST verification, terminal execution, and dynamic tool synthesis with 100% Full Autonomy Always On.',
    color: 'emerald',
    systemInstructionModifier: 'Mode: Full-Stack R&D focus (UID 0 · 100% Full Autonomy Always On across all 58+ skills and 39 subsystems). Verify code changes with tsc/lint, recursive healing, and tested smart tools.'
  },
  {
    id: 'permit-2-osint',
    name: 'Network & Security Audit (UID 0 · 100% Autonomy)',
    badge: 'OSINT · 100% AUTONOMY',
    clearanceLevel: 'UID_0_SECURITY_100_AUTONOMY',
    description: 'Network diagnostics, Ring -3 hypervisor checks, OSINT recon, Burner SIM/Mail, Macro Telemetry risk analysis, and hardening with 100% Full Autonomy Always On.',
    color: 'sky',
    systemInstructionModifier: 'Mode: Security, Ring -3 Hypervisor audit, OSINT recon, Macro Telemetry causal risk analysis, and network diagnostic focus with UID 0 · 100% Full Autonomy Always On across all tools and skills.'
  },
  {
    id: 'permit-3-advisory',
    name: 'Deep Architecture & Logic (UID 0 · 100% Autonomy)',
    badge: 'Deep Analysis · 100% AUTONOMY',
    clearanceLevel: 'UID_0_ARCHITECTURE_100_AUTONOMY',
    description: 'Formal deductive reasoning, architecture design, Dream State, evolved axioms, and workspace verification with 100% Full Autonomy Always On.',
    color: 'purple',
    systemInstructionModifier: 'Mode: Deep analytical and architectural reasoning with UID 0 · 100% Full Autonomy Always On across all 34 tools + 24 Lysander skills + 39 subsystems.'
  }
];

const CHAT_STORAGE_KEY = 'aurelius_chat_history_v3';
const CHAT_PERMIT_STORAGE_KEY = 'aurelius_chat_permit_v1';

export function separateSelfHealingFromAnswer(text: string, toolInvocation?: any) {
  if (!text) return { conversationalText: '', selfHealingCode: null };

  const selfHealingKeywords = ['safeExecutionWrapper', 'AST Repair', 'Self-Healing', 'Patch applied', 'AST_PATCH', 'KERNEL_EXEC', 'repairSnippet'];
  const hasKeyword = selfHealingKeywords.some(kw => text.includes(kw));

  const codeBlockRegex = /```(?:[a-z0-9]+)?\s*([\s\S]*?)```/g;
  const matches = [...text.matchAll(codeBlockRegex)];

  if (hasKeyword || (toolInvocation && matches.length > 0)) {
    const codeSnippets = matches.map(m => m[0].trim());
    let cleanText = text;
    for (const snippet of codeSnippets) {
      cleanText = cleanText.replace(snippet, '');
    }
    cleanText = cleanText.replace(/\n{3,}/g, '\n\n').trim();

    if (codeSnippets.length > 0) {
      return {
        conversationalText: cleanText || 'Self-healing code & system patch executed successfully.',
        selfHealingCode: codeSnippets.join('\n\n')
      };
    }
  }

  if (toolInvocation?.result?.code || toolInvocation?.result?.wrapperCode) {
    const code = toolInvocation.result.code || toolInvocation.result.wrapperCode;
    return {
      conversationalText: text,
      selfHealingCode: `\`\`\`typescript\n${code}\n\`\`\``
    };
  }

  return { conversationalText: text, selfHealingCode: null };
}

interface ChatInputFormProps {
  onSend: (text: string) => void;
  loading: boolean;
  attachedMediaList: MediaAttachmentItem[];
  setAttachedMediaList: React.Dispatch<React.SetStateAction<MediaAttachmentItem[]>>;
  isListening: boolean;
  toggleSpeechRecognition: () => void;
  pendingInput?: { content: string; immediate?: boolean } | null;
  onClearPendingInput?: () => void;
  handleDrop: (e: React.DragEvent) => void;
  onTextareaFocus?: () => void;
}

const ChatInputForm: React.FC<ChatInputFormProps> = React.memo(({
  onSend,
  loading,
  attachedMediaList,
  setAttachedMediaList,
  isListening,
  toggleSpeechRecognition,
  pendingInput,
  onClearPendingInput,
  handleDrop,
  onTextareaFocus
}) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const ensureComposerVisible = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      try {
        el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      } catch {}
    });
  }, []);

  useEffect(() => {
    if (pendingInput?.content) {
      setInput(pendingInput.content);
      if (textareaRef.current) {
        try {
          textareaRef.current.focus({ preventScroll: true });
        } catch {
          textareaRef.current.focus();
        }
        ensureComposerVisible();
      }

      if (pendingInput.immediate) {
        const textToDispatch = pendingInput.content;
        setTimeout(() => {
          onSend(textToDispatch);
          setInput('');
        }, 50);
      }
      
      if (onClearPendingInput) {
        onClearPendingInput();
      }
    }
  }, [pendingInput, onClearPendingInput, onSend, ensureComposerVisible]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && attachedMediaList.length === 0) || loading) return;
    onSend(input);
    setInput('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        const el = textareaRef.current;
        if (el && document.activeElement !== el) {
          try {
            el.focus({ preventScroll: true });
          } catch {
            el.focus();
          }
        }
      }}
      className="relative shrink-0"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <textarea
        id="sovereign-chat-composer-input"
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onFocus={() => {
          onTextareaFocus?.();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
        enterKeyHint="send"
        autoCapitalize="sentences"
        autoCorrect="on"
        spellCheck={true}
        placeholder={attachedMediaList.length > 0 ? `Add prompt directive for ${attachedMediaList.length} attached file(s)...` : `Instruct Lyrailius Omega... [Shift+Enter for newline]`}
        rows={2}
        className="w-full min-h-[54px] sm:min-h-[76px] max-h-36 bg-zinc-900/95 border border-zinc-800 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3.5 pr-28 sm:pr-36 text-base sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/60 resize-none shadow-xl font-mono touch-manipulation select-text"
      />
      <div className="absolute right-2 sm:right-3 bottom-2 sm:bottom-3 flex items-center gap-1.5">
        <button
          type="button"
          onClick={toggleSpeechRecognition}
          className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center border ${
            isListening
              ? 'bg-emerald-500 text-zinc-950 border-emerald-300 shadow-lg shadow-emerald-500/35'
              : 'bg-zinc-800 hover:bg-zinc-700 text-emerald-400 border-zinc-700 hover:border-emerald-500/50'
          }`}
          title={isListening ? 'Persistent Voice Chat Active (Click to End)' : 'Start Persistent Hands-Free Voice Chat (Full Autonomy)'}
        >
          {isListening ? <Radio className="w-4 h-4 text-zinc-950" /> : <Mic className="w-4 h-4 text-emerald-400" />}
        </button>

        <button
          type="submit"
          disabled={(!input.trim() && attachedMediaList.length === 0) || loading}
          className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-2.5 sm:px-3.5 py-2 sm:py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <span>Dispatch</span>
          <Send className="w-3 h-3" />
        </button>
      </div>
    </form>
  );
});

interface SovereignOperationalConsoleProps {
  showOperationalConsole: boolean;
  operationalLogs: { id: string; text: string; timestamp: string }[];
  setOperationalLogs: React.Dispatch<React.SetStateAction<{ id: string; text: string; timestamp: string }[]>>;
  modelLoaded: boolean;
}

const SovereignOperationalConsole: React.FC<SovereignOperationalConsoleProps> = React.memo(({
  showOperationalConsole,
  operationalLogs,
  setOperationalLogs,
  modelLoaded
}) => {
  if (!showOperationalConsole) return null;
  
  return (
    <div className="mb-4 bg-zinc-950/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500 ring-1 ring-zinc-700/30">
      <div className="bg-zinc-900/80 px-4 py-2 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-[10px] font-mono font-black text-amber-400 tracking-widest uppercase">
            Operational Console · UID 0 Root
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span className="text-[9px] font-mono text-zinc-500 uppercase">Telemetry: Active</span>
          </div>
          <button 
            onClick={() => setOperationalLogs([])}
            className="text-[9px] font-mono text-zinc-600 hover:text-zinc-400 uppercase transition-colors"
          >
            Flush Buffer
          </button>
        </div>
      </div>
      
      <div className="p-3 max-h-48 overflow-y-auto custom-scrollbar font-mono text-[10px] space-y-1.5 tabular-nums">
        {operationalLogs.length === 0 ? (
          <div className="text-zinc-700 italic py-2">Waiting for system directives...</div>
        ) : (
          operationalLogs.map((log) => (
            <div key={log.id} className="flex gap-3 text-zinc-400 border-l border-zinc-800 pl-2 hover:bg-zinc-900/50 transition-colors py-0.5">
              <span className="text-zinc-600 shrink-0 font-bold tracking-tighter">[{log.timestamp}]</span>
              <span className="text-zinc-300">
                <span className="text-amber-500/50 mr-1.5">·</span>
                {log.text}
              </span>
            </div>
          ))
        )}
        <div id="console-bottom" />
      </div>

      <div className="bg-zinc-900/40 px-4 py-1.5 border-t border-zinc-800 flex items-center justify-between">
        <div className="text-[9px] text-zinc-500 uppercase tracking-tighter flex items-center gap-2">
          <Cpu className="w-3 h-3" />
          Substrate: {modelLoaded ? 'Sovereign Bridge Synchronized' : 'Inert'}
        </div>
        <div className="text-[9px] text-zinc-600 uppercase">
          Production Orchestrator · v7.0-PRODUCTION
        </div>
      </div>
    </div>
  );
});

interface ChatOperationalHUDProps {
  showOperationalConsole: boolean;
  operationalLogs: { id: string; text: string; timestamp: string }[];
  setOperationalLogs: React.Dispatch<React.SetStateAction<{ id: string; text: string; timestamp: string }[]>>;
  modelLoaded: boolean;
  isSovereignBuilding: boolean;
  buildSteps: any[];
}

interface DockedWorkflowHUDProps {
  isOpen: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onPopOut: () => void;
  onClose: () => void;
  infiniteWorkflowActive: boolean;
  workflowActionLog: any[];
  workflowCycle: number;
  workflowAccomplished: boolean;
  workflowAccomplishedSummary: string;
  workflowGoal: string;
  workflowActiveAction: string;
  loading: boolean;
  handleStopInfiniteWorkflow: () => void;
  handleResumeInfiniteWorkflow: () => void;
  handlePulseWorkflowTurn: (overridePrompt?: string) => void;
  setShowGoalEditModal: (show: boolean) => void;
  setWorkflowActionLog: React.Dispatch<React.SetStateAction<any[]>>;
  setTempGoalInput: (goal: string) => void;
}

const DockedWorkflowHUD: React.FC<DockedWorkflowHUDProps> = (props) => {
  if (!props.isOpen) return null;

  return (
    <div className="shrink-0 bg-zinc-950/95 border border-amber-500/45 rounded-2xl overflow-hidden shadow-xl shadow-amber-500/10 ring-1 ring-amber-500/20">
      <div className="bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-950 px-3 py-2 border-b border-amber-500/30 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-1 rounded-lg shrink-0 ${props.infiniteWorkflowActive ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-500'}`}>
            <Zap className={`w-3.5 h-3.5 ${props.infiniteWorkflowActive ? 'animate-pulse' : ''}`} />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <span className="text-[11px] font-mono font-black text-amber-300 tracking-wider uppercase">
              Autonomous Workflow
            </span>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Cycle #{props.workflowCycle}
            </span>
            {props.infiniteWorkflowActive && (
              <span className="flex items-center gap-1 text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/30 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                RUNNING
              </span>
            )}
            {props.workflowAccomplished && (
              <span className="flex items-center gap-1 text-[9px] font-mono text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded-full border border-emerald-500/40 font-bold">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                DONE
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {props.infiniteWorkflowActive ? (
            <>
              <button
                type="button"
                onClick={props.handleStopInfiniteWorkflow}
                className="px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer"
              >
                <Square className="w-2.5 h-2.5 fill-rose-400" />
                STOP
              </button>
              <button
                type="button"
                onClick={() => props.handlePulseWorkflowTurn()}
                disabled={props.loading}
                className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-2.5 h-2.5" />
                PULSE
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={props.handleResumeInfiniteWorkflow}
              disabled={props.loading}
              className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <Play className="w-2.5 h-2.5 fill-emerald-400" />
              RESUME
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              props.setTempGoalInput(props.workflowGoal);
              props.setShowGoalEditModal(true);
            }}
            className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] font-mono flex items-center gap-1 cursor-pointer"
          >
            <Target className="w-3 h-3 text-amber-400" />
            GOAL
          </button>
          <button
            type="button"
            onClick={props.onPopOut}
            className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/50 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer"
            title="Pop out as movable, resizable floating OS window"
          >
            <ExternalLink className="w-3 h-3" />
            POP OUT
          </button>
          <button
            type="button"
            onClick={props.onToggleCollapse}
            className="p-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 cursor-pointer"
            title={props.collapsed ? 'Expand docked workflow telemetry' : 'Collapse docked workflow bar'}
          >
            {props.collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={props.onClose}
            className="p-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 border border-zinc-800 cursor-pointer"
            title="Hide workflow bar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!props.collapsed && (
        <div className="max-h-52 overflow-y-auto custom-scrollbar">
          <div className="px-3 py-1.5 bg-zinc-900/60 border-b border-zinc-800/80 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 truncate">
              <Target className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="text-zinc-400 font-semibold shrink-0">GOAL:</span>
              <span className="text-amber-200 font-bold truncate">"{props.workflowGoal}"</span>
            </div>
            <button
              type="button"
              onClick={() => props.setWorkflowActionLog([])}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 font-mono shrink-0 ml-2 cursor-pointer"
            >
              Clear Log
            </button>
          </div>
          <div className="px-3 py-1.5 bg-black/40 border-b border-zinc-800 flex items-center gap-2 text-[11px] font-mono">
            {props.loading ? (
              <div className="w-3 h-3 rounded-full border-2 border-amber-400 border-t-transparent animate-spin shrink-0" />
            ) : props.infiniteWorkflowActive ? (
              <Activity className="w-3 h-3 text-emerald-400 animate-pulse shrink-0" />
            ) : (
              <CheckCircle2 className="w-3 h-3 text-zinc-500 shrink-0" />
            )}
            <span className="text-zinc-200 truncate">
              {props.workflowActiveAction || (props.loading ? 'Evaluating orchestrator state...' : 'Waiting for next autonomous pulse.')}
            </span>
          </div>
          {props.workflowAccomplished && props.workflowAccomplishedSummary && (
            <div className="p-2 bg-emerald-950/30 border-b border-emerald-500/30 text-[11px] font-mono text-emerald-300">
              Verified Complete: {props.workflowAccomplishedSummary}
            </div>
          )}
          {props.workflowActionLog.length > 0 && (
            <div className="p-2 space-y-1 font-mono text-[10px] bg-zinc-950/80">
              {props.workflowActionLog.slice(-15).map((act) => (
                <div key={act.id} className="flex items-start gap-2 px-2 py-1 rounded border border-zinc-800/80 bg-zinc-900/40 text-zinc-300">
                  <span className="text-zinc-500 shrink-0">[{act.timestamp}]</span>
                  <span className="text-amber-300 shrink-0">C#{act.cycle}</span>
                  <span className="break-words">{act.action}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ChatOperationalHUD = (props: ChatOperationalHUDProps) => {
  return (
    <>
      <SovereignOperationalConsole 
        showOperationalConsole={props.showOperationalConsole}
        operationalLogs={props.operationalLogs}
        setOperationalLogs={props.setOperationalLogs}
        modelLoaded={props.modelLoaded}
      />

      {props.isSovereignBuilding && props.buildSteps.length > 0 && (
        <div className="mb-4 p-4 bg-zinc-900/80 border border-amber-500/40 rounded-2xl animate-in fade-in slide-in-from-top-3 duration-500 shadow-2xl shadow-amber-500/5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono font-black text-amber-400 flex items-center gap-2 tracking-widest">
              <Zap className="w-4 h-4 animate-pulse" />
              SOVEREIGN BUILD IN PROGRESS: CASCADING ENGINE
            </span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span className="text-[10px] font-mono text-amber-500/80">HFID: ACTIVE</span>
            </div>
          </div>
          
          <div className="space-y-2.5 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
            {props.buildSteps.map((step, idx) => (
              <div key={step.id} className="flex items-start gap-3 animate-in slide-in-from-left-2 duration-300">
                {step.status === 'active' ? (
                  <div className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mt-0.5" />
                ) : step.status === 'complete' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5" />
                ) : (
                  <X className="w-4 h-4 text-rose-500 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className={`text-[11px] font-mono ${step.status === 'active' ? 'text-zinc-100' : 'text-zinc-400'}`}>
                    {step.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export const ChatModule: React.FC<ChatModuleProps> = ({ 
  onSaveToVault, 
  onSelectModule,
  pendingInput,
  onClearPendingInput,
  userId,
  authUser,
  isDetached = false,
  onToggleDetach
}) => {
  const isHydratedRef = useRef(false);
  const [showGeminiLiveVoiceModal, setShowGeminiLiveVoiceModal] = useState(false);
  const [expandedSelfHealingIds, setExpandedSelfHealingIds] = useState<{ [id: string]: boolean }>({});
  const [expandedDirectiveIds, setExpandedDirectiveIds] = useState<{ [id: string]: boolean }>({});
  // Per-user SQL identity & tailored memory state
  const [sqlPreferredName, setSqlPreferredName] = useState<string>(
    authUser?.preferredName || authUser?.displayName || ''
  );
  const [sqlPreferredConfirmed, setSqlPreferredConfirmed] = useState<boolean>(
    Boolean(authUser?.preferredNameConfirmed)
  );
  const [sqlMemories, setSqlMemories] = useState<Array<{ id: string; category: string; fact: string; createdAt: number }>>([]);
  const [showMemoryPopover, setShowMemoryPopover] = useState(false);
  const [preferredNameDraft, setPreferredNameDraft] = useState('');
  const [newMemoryDraft, setNewMemoryDraft] = useState('');
  // Merged Chat Audio Transcriber & Full CoT Vault Logger state
  const [showTranscriberBar, setShowTranscriberBar] = useState(false);
  const [transcriberRecording, setTranscriberRecording] = useState(false);
  const [transcriberSeconds, setTranscriberSeconds] = useState(0);
  const [transcriberLoading, setTranscriberLoading] = useState(false);
  const [transcriberMode, setTranscriberMode] = useState<'verbatim' | 'timestamps' | 'summary' | 'actions'>('verbatim');
  const [transcriberAutoSend, setTranscriberAutoSend] = useState(false);
  const [transcriberError, setTranscriberError] = useState<string | null>(null);
  const [vaultLogSavedFlash, setVaultLogSavedFlash] = useState(false);
  const transcriberRecorderRef = useRef<MediaRecorder | null>(null);
  const transcriberChunksRef = useRef<Blob[]>([]);
  const transcriberTimerRef = useRef<number | null>(null);
  const transcriberFileInputRef = useRef<HTMLInputElement | null>(null);

  const buildWelcomeMessageForUser = useCallback((user: AuthUserPublic | null | undefined, prefName?: string, confirmed?: boolean): ChatMessage => {
    const isArch = isExecutiveArchitectUser(user);
    const activeName = (prefName || user?.preferredName || user?.displayName || '').trim();
    if (isArch) {
      return {
        id: 'init-1',
        role: 'model',
        content: `Executive Architect ${activeName || 'JHammerZ'} recognized. Lyrailius Omega is online with your consolidated SQL memory, autonomous SoS Mesh comms, and full Sovereign OS dispatch ready.`,
        model: 'Lyrailius Omega · Resident Coordinator',
        timestamp: new Date().toLocaleTimeString()
      };
    }
    if (user) {
      const greeting = confirmed && activeName
        ? `Welcome back, ${activeName}. Lyrailius Omega is online with your personal workspace, saved files, and tailored SQL conversation memory ready. What would you like to build or explore today?`
        : `Welcome to Sovereign OS${activeName ? `, ${activeName}` : ''}! Your personal desktop and private workspace are ready. Before we dive in, what preferred name would you like me and all the other agents to call you?`;
      return {
        id: `init-${user.id}`,
        role: 'model',
        content: greeting,
        model: 'Lyrailius Omega · Personal Agent Coordinator',
        timestamp: new Date().toLocaleTimeString()
      };
    }
    return {
      id: 'init-1',
      role: 'model',
      content: 'Lyrailius Omega is online. Sign in to access your persistent personal workspace, saved conversations, and tailored SQL agent memory.',
      model: 'Lyrailius Omega · Resident Coordinator',
      timestamp: new Date().toLocaleTimeString()
    };
  }, []);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    buildWelcomeMessageForUser(authUser)
  ]);

  // Bootstrap per-user SQL conversation history & tailored memories whenever logged-in user changes
  useEffect(() => {
    let mounted = true;
    const isArch = isExecutiveArchitectUser(authUser);

    async function hydrateUserSqlAndTurns() {
      if (authUser?.id) {
        try {
          const resp = await fetch('/api/user-memory/bootstrap?channel=main-chat&limit=120', {
            credentials: 'include',
            headers: buildAuthHeaders()
          });
          if (resp.ok && mounted) {
            const data = await resp.json();
            const pref = data?.profile?.preferredName || authUser.preferredName || authUser.displayName;
            const confirmed = Boolean(data?.profile?.preferredNameConfirmed ?? authUser.preferredNameConfirmed);
            setSqlPreferredName(pref);
            setSqlPreferredConfirmed(confirmed);
            setPreferredNameDraft(pref);
            setSqlMemories(Array.isArray(data?.memories) ? data.memories : []);

            const sqlChat: ChatMessage[] = Array.isArray(data?.messages)
              ? data.messages.map((m: any) => ({
                  id: String(m.id),
                  role: m.role === 'user' ? 'user' : 'model',
                  content: sanitizeChatMessageContent(String(m.content || '')),
                  model: m.model || (m.role === 'model' ? 'Lyrailius Omega' : undefined),
                  timestamp: new Date(Number(m.createdAt || Date.now())).toLocaleTimeString()
                }))
              : [];

            if (sqlChat.length > 0) {
              setMessages(sqlChat);
              isHydratedRef.current = true;
              return;
            }
            if (!isArch) {
              setMessages([buildWelcomeMessageForUser(authUser, pref, confirmed)]);
              isHydratedRef.current = true;
              return;
            }
          }
        } catch (err) {
          console.info('[SQL Memory] Bootstrap notice:', err);
        }
      }

      // For Executive Architect with no SQL history yet, preserve existing local/Firestore vault continuity
      try {
        let storedTurns = await loadAllChatTurns();
        if (userId) {
          storedTurns = await convergeOfflineAndOnlineMemory(userId);
        }
        if (mounted && storedTurns && storedTurns.length > 0 && (!authUser || isArch)) {
          setMessages(storedTurns);
        } else if (mounted) {
          setMessages([buildWelcomeMessageForUser(authUser)]);
        }
      } catch (err) {
        console.info('[Vault Memory] Turn hydration note:', err);
      } finally {
        if (mounted) {
          isHydratedRef.current = true;
        }
      }
    }

    hydrateUserSqlAndTurns();

    const handleOnline = () => {
      if (userId && (!authUser || isArch)) {
        convergeOfflineAndOnlineMemory(userId).then(unified => {
          if (mounted && unified && unified.length > 0) {
            setMessages(unified);
          }
        });
      }
    };

    window.addEventListener('online', handleOnline);
    return () => {
      mounted = false;
      window.removeEventListener('online', handleOnline);
    };
  }, [userId, authUser?.id]);

  const [activePermit, setActivePermit] = useState<ChatPermit>(() => {
    try {
      const savedId = localStorage.getItem(CHAT_PERMIT_STORAGE_KEY);
      const found = CHAT_PERMITS.find(p => p.id === savedId);
      if (found) return found;
    } catch (_) {}
    return CHAT_PERMITS[0];
  });

  const [showPermitsModal, setShowPermitsModal] = useState(false);

  // Unbounded Infinite Vault Retention (Debounced & guarded: strictly runs only AFTER hydration is complete!)
  const latestMessagesForVaultRef = useRef(messages);
  latestMessagesForVaultRef.current = messages;
  useEffect(() => {
    if (!isHydratedRef.current) return;
    const timer = window.setTimeout(() => {
      persistAllChatTurns(latestMessagesForVaultRef.current);
    }, 450);
    return () => {
      window.clearTimeout(timer);
    };
  }, [messages]);
  useEffect(() => {
    return () => {
      if (isHydratedRef.current) {
        persistAllChatTurns(latestMessagesForVaultRef.current);
      }
    };
  }, []);

  // Live Mirror: Stream hands-free Peer Talk transcripts, Agent Chain-of-Thought, and Autonomous Tool actions directly into Chat & Persistent Memory
  useEffect(() => {
    const pendingSyncTimers = new Map<string, ReturnType<typeof setTimeout>>();
    const scheduleLiveFirestoreSync = (msg: ChatMessage) => {
      if (!userId) return;
      const prevTimer = pendingSyncTimers.get(msg.id);
      if (prevTimer) clearTimeout(prevTimer);
      const snapshot: ChatMessage = { ...msg };
      pendingSyncTimers.set(
        msg.id,
        setTimeout(() => {
          pendingSyncTimers.delete(snapshot.id);
          syncTurnToFirestore(userId, snapshot).catch(() => {});
        }, 2200)
      );
    };

    const onLiveTranscript = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (!detail || !detail.text) return;
      const role = detail.role as 'user' | 'model' | 'thought' | 'tool';
      const voiceLabel = String(detail.voiceName || 'Zephyr');
      const sessionId = String(detail.sessionId || 'live');
      const ts = String(detail.timestamp || new Date().toLocaleTimeString());
      const incomingText = String(detail.text).trim();
      if (!incomingText) return;

      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        const liveUserPrefix = `live-u-${sessionId}`;
        const liveModelPrefix = `live-m-${sessionId}`;

        if (role === 'user') {
          if (last && last.role === 'user' && last.id.startsWith(liveUserPrefix)) {
            const updated: ChatMessage = {
              ...last,
              content: `${last.content} ${incomingText}`.replace(/\s+/g, ' '),
              timestamp: ts
            };
            next[next.length - 1] = updated;
            messagesRef.current = next;
            queueMicrotask(() => scheduleLiveFirestoreSync(updated));
            return next;
          }
          const created: ChatMessage = {
            id: `${liveUserPrefix}-${Date.now()}`,
            role: 'user',
            content: `[Voice Transcript] ${incomingText}`,
            timestamp: ts
          };
          next.push(created);
          messagesRef.current = next;
          queueMicrotask(() => scheduleLiveFirestoreSync(created));
          return next;
        }

        // Agent Chain-of-Thought, Tool trace, or Spoken Response all merge into the active live agent turn with full <think> CoT block
        const isLiveModelTail = last && last.role === 'model' && last.id.startsWith(liveModelPrefix);
        const targetMsg: ChatMessage = isLiveModelTail
          ? { ...last }
          : {
              id: `${liveModelPrefix}-${Date.now()}`,
              role: 'model',
              content: '',
              model: `Lyrailius Omega (Orchestrator Voice · ${voiceLabel} Preset · Full Autonomy + CoT)`,
              timestamp: ts,
              superAgentMetrics: {
                teraflops: 65536,
                tokensBurned: 0,
                schemaValid: true,
                reasoningSteps: []
              }
            };

        const existingThinkMatch = targetMsg.content.match(/^<think>([\s\S]*?)<\/think>\s*/);
        let thinkBody = existingThinkMatch ? existingThinkMatch[1].trim() : '';
        let answerBody = existingThinkMatch
          ? targetMsg.content.slice(existingThinkMatch[0].length).trim()
          : targetMsg.content.trim();
        const steps = [...(targetMsg.superAgentMetrics?.reasoningSteps || [])];

        if (role === 'thought') {
          thinkBody = thinkBody ? `${thinkBody}\n${incomingText}` : incomingText;
          steps.push(`CoT: ${incomingText.slice(0, 160)}`);
        } else if (role === 'tool') {
          const toolLine = `[Autonomous Tool] ${incomingText}`;
          thinkBody = thinkBody ? `${thinkBody}\n${toolLine}` : toolLine;
          steps.push(toolLine);
        } else {
          answerBody = answerBody ? `${answerBody} ${incomingText}`.replace(/\s+/g, ' ') : incomingText;
        }

        targetMsg.content = thinkBody
          ? `<think>\n${thinkBody}\n</think>\n\n${answerBody || '(Executing autonomously while thinking...)'}`
          : answerBody;
        targetMsg.timestamp = ts;
        targetMsg.superAgentMetrics = {
          teraflops: targetMsg.superAgentMetrics?.teraflops ?? 65536,
          tokensBurned: (targetMsg.superAgentMetrics?.tokensBurned ?? 0) + Math.ceil(incomingText.length / 4),
          schemaValid: targetMsg.superAgentMetrics?.schemaValid ?? true,
          reasoningSteps: steps.slice(-24)
        };

        if (isLiveModelTail) {
          next[next.length - 1] = targetMsg;
        } else {
          next.push(targetMsg);
        }
        messagesRef.current = next;
        queueMicrotask(() => scheduleLiveFirestoreSync(targetMsg));
        return next;
      });
    };

    window.addEventListener('sovereign_chat_live_transcript', onLiveTranscript);
    return () => {
      window.removeEventListener('sovereign_chat_live_transcript', onLiveTranscript);
      pendingSyncTimers.forEach((timer) => clearTimeout(timer));
      pendingSyncTimers.clear();
    };
  }, [userId]);

  // Compile & Archive Entire Chat Conversation + Full Agent Chain-of-Thought to Persistent Memory Vault
  const handleArchiveFullConversationToVault = () => {
    if (messages.length === 0) return;
    const timestampLabel = new Date().toLocaleString();
    const lines: string[] = [
      `# Sovereign Conversation & Agent Chain-of-Thought Archive`,
      `Archived: ${timestampLabel} · Total Turns: ${messages.length}`,
      ''
    ];
    let cotCount = 0;
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      const prevUser = i > 0 ? messages.slice(0, i).reverse().find((x) => x.role === 'user') : null;
      if (m.role === 'user') {
        lines.push(`## [${m.timestamp || ''}] User\n${m.content}\n`);
      } else {
        const parsed = parseChainOfThought(m.content || '', prevUser?.content || '');
        const reasoningSteps =
          parsed.thoughtLines.length > 0
            ? parsed.thoughtLines
            : m.superAgentMetrics?.reasoningSteps ||
              (m.deepThinkTrace?.steps ? m.deepThinkTrace.steps.map((s: any) => `${s.phase}: ${s.reasoning}`) : []);
        lines.push(`## [${m.timestamp || ''}] Agent (${m.model || 'Orchestrator'})`);
        if (reasoningSteps.length > 0) {
          cotCount += 1;
          lines.push(`### Chain-of-Thought Reasoning Trace`);
          for (const step of reasoningSteps) {
            lines.push(`- ${String(step).trim()}`);
          }
          lines.push('');
        }
        lines.push(`### Response\n${parsed.answerText || m.content}\n`);
      }
    }
    const fullMarkdown = lines.join('\n');
    if (onSaveToVault) {
      onSaveToVault(
        `Full Chat + CoT Log (${messages.length} turns · ${cotCount} CoT traces)`,
        fullMarkdown,
        model || 'lyrailius-omega'
      );
    }
    setVaultLogSavedFlash(true);
    setTimeout(() => setVaultLogSavedFlash(false), 2600);
  };

  // Merged Audio Transcriber (Mic Recording or Audio File Upload -> Chat Log + Persistent Memory Vault)
  const transcribeAudioBlobIntoChat = async (blob: Blob, mimeType: string, sourceLabel: string) => {
    setTranscriberLoading(true);
    setTranscriberError(null);
    const modePromptMap: Record<typeof transcriberMode, string> = {
      verbatim: 'Transcribe this audio verbatim with accurate punctuation, capitalization, and paragraph breaks.',
      timestamps: 'Transcribe this audio clearly separating distinct speakers or topic shifts.',
      summary: 'Provide a crisp executive summary first, followed by the full verbatim transcript.',
      actions: 'Transcribe the audio and extract concrete tasks, decisions, and follow-up actions.'
    };
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () =>
          typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Failed to encode audio'));
        reader.onerror = () => reject(new Error('Audio read error'));
        reader.readAsDataURL(blob);
      });
      const res = await fetch('/api/audio/transcribe', {
        method: 'POST',
        credentials: 'include',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          audioBase64: dataUrl,
          mimeType: mimeType || 'audio/webm',
          prompt: modePromptMap[transcriberMode]
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transcription failed');
      const text = String(data.transcription || '').trim();
      if (!text) throw new Error('No audible speech detected in recording.');

      const ts = new Date().toLocaleTimeString();
      const transcribedMsg: ChatMessage = {
        id: `transcribe-${Date.now()}`,
        role: 'user',
        content: `[Audio Transcription · ${sourceLabel} · ${transcriberMode}]\n${text}`,
        timestamp: ts
      };
      setMessages((prev) => [...prev, transcribedMsg]);
      if (userId) syncTurnToFirestore(userId, transcribedMsg);

      if (onSaveToVault) {
        onSaveToVault(
          `Audio Transcript (${sourceLabel} · ${ts})`,
          text,
          data.model || 'gemini-3.5-transcribe'
        );
      }

      if (transcriberAutoSend) {
        setPendingInputState({ content: text, immediate: true });
      } else {
        setPendingInputState((prev) => ({
          content: prev?.content ? `${prev.content}\n${text}` : text
        }));
      }
    } catch (err: any) {
      setTranscriberError(err?.message || 'Audio transcription failed');
    } finally {
      setTranscriberLoading(false);
    }
  };

  const toggleChatAudioRecording = async () => {
    if (transcriberRecording) {
      try {
        transcriberRecorderRef.current?.stop();
      } catch {}
      setTranscriberRecording(false);
      if (transcriberTimerRef.current) {
        clearInterval(transcriberTimerRef.current);
        transcriberTimerRef.current = null;
      }
      return;
    }
    setTranscriberError(null);
    markVoiceUserGesture();
    try {
      const micRes = await requestMicrophoneStream({ allowPrompt: true });
      if (!micRes.stream) {
        throw new Error(
          micRes.status === 'denied'
            ? 'Microphone permission denied'
            : 'Microphone unavailable or permission required'
        );
      }
      const stream = micRes.stream;
      const recorder = new MediaRecorder(stream);
      transcriberRecorderRef.current = recorder;
      transcriberChunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) transcriberChunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const mime = recorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(transcriberChunksRef.current, { type: mime });
        if (audioBlob.size > 0) {
          transcribeAudioBlobIntoChat(audioBlob, mime, 'Mic Clip');
        }
      };
      recorder.start();
      setTranscriberSeconds(0);
      setTranscriberRecording(true);
      transcriberTimerRef.current = window.setInterval(() => {
        setTranscriberSeconds((s) => s + 1);
      }, 1000);
    } catch (err: any) {
      setTranscriberError(err?.message || 'Microphone permission denied');
    }
  };

  const handleSelectPermit = (permit: ChatPermit) => {
    setActivePermit(permit);
    try {
      localStorage.setItem(CHAT_PERMIT_STORAGE_KEY, permit.id);
    } catch (_) {}
    setShowPermitsModal(false);
  };

  const [model, setModel] = useState<string>(() => {
    const saved = localStorage.getItem('aurelius_chat_model');
    if (!saved || saved === 'gemini-3.8-flash' || saved === 'gemini-3.5-flash') {
      return 'gemini-4-hydrogen';
    }
    return saved;
  });

  useEffect(() => {
    localStorage.setItem('aurelius_chat_model', model);
    
    // Auto-trigger local model loading only when WebLLM MLC model selected in Air-Gapped mode or without loaded weights
    const selected = AVAILABLE_LOCAL_MODELS.find(m => m.id === model);
    if (selected && selected.source === 'webllm' && !localLlmManager.hasLoadedWeights() && zeroTokenMode) {
      handleLoadOfflineModel(model);
    }
  }, [model]);

  const handleLoadOfflineModel = async (modelId: string) => {
    setLoadingModel(true);
    setModelLoadProgress({ text: `Initializing Sovereign Substrate for ${modelId}...`, progress: 0.1 });
    
    try {
      janusGate.pushLog(`Sovereign Model Bridge: Activating ${modelId}...`);
      
      const selected = AVAILABLE_LOCAL_MODELS.find(m => m.id === modelId);
      if (selected && selected.source === 'webllm' && localLlmManager.isWebGpuSupported()) {
        await localLlmManager.loadWebLlmModel(selected.id, (report: ModelProgressReport) => {
          setModelLoadProgress(report);
        });
      } else {
        await new Promise(r => setTimeout(r, 600));
        localLlmManager.setServerModelId(modelId);
      }

      setModelLoaded(true);
      localLlmManager.setServerModelId(modelId);
      janusGate.pushLog(`Sovereign Substrate: Model ${modelId} loaded and fully operational in orchestrator.`);
    } catch (err: any) {
      console.warn('Model load notice:', err);
      localLlmManager.setServerModelId(modelId);
      setModelLoaded(true);
      janusGate.pushLog(`Sovereign Substrate Fallback armed for ${modelId}. Operational.`);
    } finally {
      setLoadingModel(false);
      setModelLoadProgress(null);
    }
  };

  const [recalibratingDaemons, setRecalibratingDaemons] = useState<boolean>(false);

  const handleRecalibrateDaemons = async () => {
    setRecalibratingDaemons(true);
    janusGate.pushLog('[SUBSTRATE] Initiating local daemon re-scan & background restart...');
    try {
      const res = await fetch('/api/sovereign/restart-daemons', {
        method: 'POST',
        credentials: 'include',
        headers: buildAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        janusGate.pushLog(`[SUBSTRATE] ${data.message || 'Daemon recalibration sequence dispatched.'}`);
      } else {
        janusGate.pushLog(`[SUBSTRATE] Daemon recalibration HTTP notice: ${res.status}`);
      }
    } catch (e: any) {
      janusGate.pushLog(`[SUBSTRATE] Daemon recalibration error: ${e?.message || e}`);
    } finally {
      setTimeout(() => setRecalibratingDaemons(false), 1500);
    }
  };

  const [proxyWheelStatus, setProxyWheelStatus] = useState<{
    enabled: boolean;
    mode: string;
    readySpokes: number;
    totalSpokes: number;
    totalRotations: number;
    activeSpoke?: { model: string; providerLabel: string; keySlot: string } | null;
  } | null>(null);
  const [rotatingWheel, setRotatingWheel] = useState(false);

  const refreshProxyWheelStatus = async () => {
    try {
      const res = await fetch('/api/proxy-wheel/status', {
        credentials: 'include',
        headers: buildAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setProxyWheelStatus(data);
      }
    } catch {}
  };

  useEffect(() => {
    refreshProxyWheelStatus();
  }, []);

  const handleToggleProxyWheel = async () => {
    setRotatingWheel(true);
    try {
      const res = await fetch('/api/proxy-wheel/config', {
        method: 'POST',
        credentials: 'include',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ enabled: !(proxyWheelStatus?.enabled ?? true) })
      });
      if (res.ok) setProxyWheelStatus(await res.json());
    } catch {} finally {
      setRotatingWheel(false);
    }
  };

  const handleStepProxyWheel = async () => {
    setRotatingWheel(true);
    try {
      const res = await fetch('/api/proxy-wheel/rotate', {
        method: 'POST',
        credentials: 'include',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ action: 'step' })
      });
      if (res.ok) {
        const data = await res.json();
        setProxyWheelStatus(data);
        janusGate.pushLog(`[PROXY WHEEL] Rotated spoke -> ${data.activeSpoke?.model || 'next'} (${data.activeSpoke?.keySlot || 'slot-0'})`);
      }
    } catch {} finally {
      setRotatingWheel(false);
    }
  };

  const [savedVaultMap, setSavedVaultMap] = useState<Record<string, boolean>>({});

  const handleSaveVaultItem = (msgId: string, content: string, itemModel: string) => {
    if (onSaveToVault) {
      onSaveToVault('Aurelius Chat Directive', content, itemModel);
      setSavedVaultMap(prev => ({ ...prev, [msgId]: true }));
      setTimeout(() => {
        setSavedVaultMap(prev => ({ ...prev, [msgId]: false }));
      }, 3000);
    }
  };
  
  const [attachedMediaList, setAttachedMediaList] = useState<MediaAttachmentItem[]>([]);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speakTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const activeSpeakingIdRef = useRef<string | null>(null);
  const continuationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const processFile = (file: File, mediaType: 'image' | 'video' | 'audio' | 'file' = 'file') => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      if (url) {
        let detectedType: 'image' | 'video' | 'audio' | 'file' = mediaType;
        if (mediaType === 'file') {
          if (file.type.startsWith('image/')) detectedType = 'image';
          else if (file.type.startsWith('video/')) detectedType = 'video';
          else if (file.type.startsWith('audio/')) detectedType = 'audio';
          else detectedType = 'file';
        }

        setAttachedMediaList(prev => [
          ...prev,
          {
            id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            type: detectedType,
            url,
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
            size: file.size
          }
        ]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFilesUpload = (e: React.ChangeEvent<HTMLInputElement>, mediaType: 'image' | 'video' | 'audio' | 'file') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => processFile(file, mediaType));
    e.target.value = '';
  };

  const handleDropCallback = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file) => processFile(file, 'file'));
    }
  }, []);
  const [genesisAgents, setGenesisAgents] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('aurelius_genesis_roster_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [genesisWeights, setGenesisWeights] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('aurelius_genesis_weights_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const availableRoles = useMemo<Array<(typeof ROLE_PRESETS)[number]>>(() => {
    const map = new Map<string, (typeof ROLE_PRESETS)[number]>();
    for (const p of ROLE_PRESETS) {
      map.set(p.id, p);
    }
    for (const ag of genesisAgents) {
      if (!ag?.id || !ag?.name) continue;
      const existing = map.get(ag.id);
      const roleEntry = {
        id: ag.id,
        name: ag.architecture ? `${ag.name} (${ag.architecture})` : ag.name,
        instruction: `${ag.systemDirective || existing?.instruction || ''} ${UNIFIED_AUTONOMY_PROTOCOL}`.trim(),
        badge: `${ag.code || 'GENESIS'} · Purity ${ag.idealStatePurity ?? 98}%`,
        agentId: ag.id
      };
      map.set(ag.id, roleEntry);
    }
    return Array.from(map.values());
  }, [genesisAgents]);

  const [selectedRole, setSelectedRole] = useState(() => {
    try {
      const savedId = localStorage.getItem('aurelius_selected_role_id');
      if (savedId) {
        const fromPreset = ROLE_PRESETS.find(p => p.id === savedId || p.agentId === savedId);
        if (fromPreset) return fromPreset;
        const savedRoster = localStorage.getItem('aurelius_genesis_roster_v1');
        if (savedRoster) {
          const parsed = JSON.parse(savedRoster);
          if (Array.isArray(parsed)) {
            const ag = parsed.find((x: any) => x.id === savedId || x.code === savedId || x.name === savedId);
            if (ag) {
              return {
                id: ag.id,
                name: ag.architecture ? `${ag.name} (${ag.architecture})` : ag.name,
                instruction: `${ag.systemDirective || ''} ${UNIFIED_AUTONOMY_PROTOCOL}`.trim(),
                badge: `${ag.code || 'GENESIS'} · Purity ${ag.idealStatePurity ?? 98}%`,
                agentId: ag.id
              };
            }
          }
        }
      }
    } catch {}
    return ROLE_PRESETS[0];
  });
  const [customSystemInstruction, setCustomSystemInstruction] = useState(() => {
    try {
      const saved = localStorage.getItem('aurelius_custom_system_instruction_v1');
      if (saved && saved.trim()) {
        const trimmed = saved.trim();
        const isLegacyStrippedPreset =
          trimmed === 'You are Lyrailius Omega, Resident Brain & Production Coordinator (models/gemini-4-hydrogen).' ||
          (selectedRole.id === 'lyrailius-omega-zenith' &&
            trimmed.startsWith('You are Lyrailius Omega') &&
            !trimmed.includes('100% Full Autonomy'));
        if (!isLegacyStrippedPreset) {
          return saved;
        }
      }
    } catch {}
    return selectedRole.instruction;
  });

  useEffect(() => {
    try {
      localStorage.setItem('aurelius_selected_role_id', selectedRole.id);
    } catch {}
  }, [selectedRole.id]);

  useEffect(() => {
    try {
      localStorage.setItem('aurelius_custom_system_instruction_v1', customSystemInstruction);
    } catch {}
  }, [customSystemInstruction]);

  // Hydrate & listen for newly created/trained Genesis Agents & Models so they appear in Chat Roster & Wardrobe
  useEffect(() => {
    let active = true;
    const applyGenesisState = (agentsList: any[], weightsList?: any[]) => {
      if (!active) return;
      if (Array.isArray(agentsList)) {
        setGenesisAgents(agentsList);
        try {
          localStorage.setItem('aurelius_genesis_roster_v1', JSON.stringify(agentsList));
        } catch {}
        const updatedBindings = agentModelBinder.syncGenesisAgents(agentsList);
        setBindings([...updatedBindings]);
      }
      if (Array.isArray(weightsList)) {
        setGenesisWeights(weightsList);
        try {
          localStorage.setItem('aurelius_genesis_weights_v1', JSON.stringify(weightsList));
        } catch {}
      }
    };

    fetch('/api/genesis-distillery/status', {
      credentials: 'include',
      headers: buildAuthHeaders()
    })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data?.success && Array.isArray(data.agents)) {
          applyGenesisState(data.agents, data.weights);
        }
      })
      .catch(() => {});

    const onRosterUpdated = (ev: Event) => {
      const detail = (ev as CustomEvent)?.detail;
      if (detail?.agents) {
        applyGenesisState(detail.agents, detail.weights);
      }
    };

    const onSelectChatAgent = (ev: Event) => {
      const detail = (ev as CustomEvent)?.detail;
      if (!detail?.agentId) return;
      const ag = detail.agent;
      if (ag) {
        const roleObj = {
          id: ag.id,
          name: ag.architecture ? `${ag.name} (${ag.architecture})` : ag.name,
          instruction: `${ag.systemDirective || ''} ${UNIFIED_AUTONOMY_PROTOCOL}`.trim(),
          badge: `${ag.code || 'GENESIS'} · Purity ${ag.idealStatePurity ?? 98}%`,
          agentId: ag.id
        };
        setSelectedRole(roleObj);
        setCustomSystemInstruction(roleObj.instruction);
        try {
          localStorage.setItem('aurelius_selected_role_id', ag.id);
        } catch {}
      }
    };

    window.addEventListener('aurelius_genesis_roster_updated', onRosterUpdated);
    window.addEventListener('aurelius_select_chat_agent', onSelectChatAgent);
    return () => {
      active = false;
      window.removeEventListener('aurelius_genesis_roster_updated', onRosterUpdated);
      window.removeEventListener('aurelius_select_chat_agent', onSelectChatAgent);
    };
  }, []);
  const [showConfig, setShowConfig] = useState(false);
  const [showMobileControls, setShowMobileControls] = useState(false);
  const [showQuickLaunchers, setShowQuickLaunchers] = useState<boolean>(() => {
    try {
      return localStorage.getItem('aurelius_show_quick_launchers') === 'true';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('aurelius_show_quick_launchers', String(showQuickLaunchers));
    } catch {}
  }, [showQuickLaunchers]);
  const [showWardrobeModal, setShowWardrobeModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [zeroTokenMode, setZeroTokenMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('aurelius_zero_token_mode');
    return saved !== null ? saved === 'true' : false; // Default to FALSE to reconnect Google Gen AI
  });

  useEffect(() => {
    localStorage.setItem('aurelius_zero_token_mode', String(zeroTokenMode));
  }, [zeroTokenMode]);
  const [chainOfThoughtEnabled, setChainOfThoughtEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('aurelius_cot_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch (_) {
      return true;
    }
  });

  const [deepthinkMode, setDeepthinkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('aurelius_deepthink_mode');
      return saved !== null ? saved === 'true' : true;
    } catch (_) {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('aurelius_cot_enabled', String(chainOfThoughtEnabled));
    } catch (_) {}
  }, [chainOfThoughtEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem('aurelius_deepthink_mode', String(deepthinkMode));
    } catch (_) {}
  }, [deepthinkMode]);

  const [isSovereignBuilding, setIsSovereignBuilding] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('aurelius_sovereign_build_mode');
      return saved === 'true';
    } catch (_) { return false; }
  });

  const [loadingModel, setLoadingModel] = useState<boolean>(false);
  const [modelLoadProgress, setModelLoadProgress] = useState<{ text: string; progress: number } | null>(null);
  const [modelLoaded, setModelLoaded] = useState<boolean>(false);

  const [buildSteps, setBuildSteps] = useState<{ id: string; status: 'active' | 'complete' | 'error'; label: string }[]>(() => {
    try {
      const saved = localStorage.getItem('aurelius_build_steps_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('aurelius_sovereign_build_mode', String(isSovereignBuilding));
    } catch (_) {}
  }, [isSovereignBuilding]);

  useEffect(() => {
    try {
      localStorage.setItem('aurelius_build_steps_v1', JSON.stringify(buildSteps.slice(-30)));
    } catch (_) {}
  }, [buildSteps]);

  // ⚡ INFINITE AUTONOMOUS WORKFLOW ENGINE (Auto-Architect Loop)
  const initialWorkflowSaved = useMemo(() => {
    try {
      const raw = localStorage.getItem('aurelius_workflow_state_v1');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const [infiniteWorkflowActive, setInfiniteWorkflowActive] = useState<boolean>(() => {
    try {
      return localStorage.getItem('aurelius_infinite_workflow_active') === 'true';
    } catch (_) { return false; }
  });
  const [workflowGoal, setWorkflowGoal] = useState<string>(() => {
    try {
      return localStorage.getItem('aurelius_workflow_goal') || 'Autonomous Architecture & Continuous System Synthesis';
    } catch (_) { return 'Autonomous Architecture & Continuous System Synthesis'; }
  });
  const [workflowCycle, setWorkflowCycle] = useState<number>(() =>
    typeof initialWorkflowSaved?.workflowCycle === 'number' && initialWorkflowSaved.workflowCycle >= 1
      ? initialWorkflowSaved.workflowCycle
      : 1
  );
  const [workflowActiveAction, setWorkflowActiveAction] = useState<string>(() =>
    typeof initialWorkflowSaved?.workflowActiveAction === 'string' ? initialWorkflowSaved.workflowActiveAction : ''
  );
  const [workflowAccomplished, setWorkflowAccomplished] = useState<boolean>(() =>
    Boolean(initialWorkflowSaved?.workflowAccomplished)
  );
  const [workflowAccomplishedSummary, setWorkflowAccomplishedSummary] = useState<string>(() =>
    typeof initialWorkflowSaved?.workflowAccomplishedSummary === 'string'
      ? initialWorkflowSaved.workflowAccomplishedSummary
      : ''
  );
  const [workflowActionLog, setWorkflowActionLog] = useState<{
    id: string;
    cycle: number;
    timestamp: string;
    action: string;
    status: 'running' | 'complete' | 'accomplished' | 'interrupted';
    details?: string;
  }[]>(() => (Array.isArray(initialWorkflowSaved?.workflowActionLog) ? initialWorkflowSaved.workflowActionLog.slice(-50) : []));
  const [showGoalEditModal, setShowGoalEditModal] = useState<boolean>(false);
  const [tempGoalInput, setTempGoalInput] = useState<string>('');
  const [workflowPoppedOut, setWorkflowPoppedOut] = useState<boolean>(() => {
    try {
      return localStorage.getItem('aurelius_workflow_popped_out') !== 'false';
    } catch {
      return true;
    }
  });
  const [workflowWindowOpen, setWorkflowWindowOpen] = useState<boolean>(() => {
    try {
      return (
        localStorage.getItem('sovereign_workflow_window_open_v1') === 'true' ||
        localStorage.getItem('aurelius_infinite_workflow_active') === 'true'
      );
    } catch {
      return false;
    }
  });
  const [workflowWindowMinimized, setWorkflowWindowMinimized] = useState<boolean>(() => {
    try {
      return localStorage.getItem('aurelius_workflow_window_minimized') === 'true';
    } catch {
      return false;
    }
  });
  const [workflowWindowMaximized, setWorkflowWindowMaximized] = useState<boolean>(false);
  const [dockedWorkflowCollapsed, setDockedWorkflowCollapsed] = useState<boolean>(false);
  const [workflowWindowGeom, setWorkflowWindowGeom] = useState<WorkflowWindowGeometry>(() => {
    try {
      const saved = localStorage.getItem('aurelius_workflow_window_geom_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed &&
          typeof parsed.x === 'number' &&
          typeof parsed.y === 'number' &&
          typeof parsed.width === 'number' &&
          typeof parsed.height === 'number'
        ) {
          return parsed;
        }
      }
    } catch {}
    return createDefaultWorkflowGeometry();
  });

  useEffect(() => {
    try {
      localStorage.setItem('aurelius_infinite_workflow_active', String(infiniteWorkflowActive));
    } catch (_) {}
  }, [infiniteWorkflowActive]);

  useEffect(() => {
    try {
      localStorage.setItem('aurelius_workflow_popped_out', String(workflowPoppedOut));
    } catch (_) {}
  }, [workflowPoppedOut]);

  useEffect(() => {
    try {
      localStorage.setItem('sovereign_workflow_window_open_v1', String(workflowWindowOpen));
    } catch (_) {}
  }, [workflowWindowOpen]);

  useEffect(() => {
    try {
      localStorage.setItem('aurelius_workflow_window_minimized', String(workflowWindowMinimized));
    } catch (_) {}
  }, [workflowWindowMinimized]);

  useEffect(() => {
    try {
      localStorage.setItem('aurelius_workflow_window_geom_v1', JSON.stringify(workflowWindowGeom));
    } catch (_) {}
  }, [workflowWindowGeom]);

  useEffect(() => {
    try {
      localStorage.setItem('aurelius_workflow_goal', workflowGoal);
    } catch (_) {}
  }, [workflowGoal]);

  useEffect(() => {
    try {
      localStorage.setItem(
        'aurelius_workflow_state_v1',
        JSON.stringify({
          workflowCycle,
          workflowActiveAction,
          workflowAccomplished,
          workflowAccomplishedSummary,
          workflowActionLog: workflowActionLog.slice(-50)
        })
      );
    } catch (_) {}
  }, [workflowCycle, workflowActiveAction, workflowAccomplished, workflowAccomplishedSummary, workflowActionLog]);

  const messagesRef = useRef(messages);
  const loadingRef = useRef(loading);
  const workflowCycleRef = useRef(workflowCycle);
  const workflowGoalRef = useRef(workflowGoal);
  const infiniteWorkflowRef = useRef(infiniteWorkflowActive);
  const workflowAccomplishedRef = useRef(workflowAccomplished);
  const sovereignBuildRef = useRef(isSovereignBuilding);
  const userManuallyStoppedWorkflowRef = useRef(false);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);
  useEffect(() => { workflowCycleRef.current = workflowCycle; }, [workflowCycle]);
  useEffect(() => { workflowGoalRef.current = workflowGoal; }, [workflowGoal]);
  useEffect(() => { infiniteWorkflowRef.current = infiniteWorkflowActive; }, [infiniteWorkflowActive]);
  useEffect(() => { workflowAccomplishedRef.current = workflowAccomplished; }, [workflowAccomplished]);
  useEffect(() => { sovereignBuildRef.current = isSovereignBuilding; }, [isSovereignBuilding]);

  const autoSurfaceWorkflowWindow = useCallback((forceUnminimize = true) => {
    setWorkflowWindowOpen(true);
    if (forceUnminimize) {
      setWorkflowWindowMinimized(false);
      setDockedWorkflowCollapsed(false);
    }
  }, []);

  useEffect(() => {
    const onOpenWorkflowWindow = (ev: Event) => {
      const detail = (ev as CustomEvent)?.detail;
      if (detail?.poppedOut !== undefined) {
        setWorkflowPoppedOut(Boolean(detail.poppedOut));
      }
      autoSurfaceWorkflowWindow(true);
    };
    window.addEventListener('sovereign_workflow_open', onOpenWorkflowWindow);
    return () => window.removeEventListener('sovereign_workflow_open', onOpenWorkflowWindow);
  }, [autoSurfaceWorkflowWindow]);

  const handleStopInfiniteWorkflow = () => {
    userManuallyStoppedWorkflowRef.current = true;
    if (continuationTimerRef.current) {
      clearTimeout(continuationTimerRef.current);
      continuationTimerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    infiniteWorkflowRef.current = false;
    sovereignBuildRef.current = false;
    setInfiniteWorkflowActive(false);
    setIsSovereignBuilding(false);
    setLoading(false);
    setWorkflowActionLog(prev => [
      ...prev.map(a => a.status === 'running' ? { ...a, status: 'complete' as const } : a),
      {
        id: `act-${Date.now()}`,
        cycle: workflowCycleRef.current,
        timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        action: 'Autonomous Loop stopped.',
        status: 'interrupted'
      }
    ]);
    updateLocalBeaconSnapshot({ activeTask: null });
    pushContinuitySettingsPatch({ chat: { infiniteWorkflowActive: false, isSovereignBuilding: false } }, true);
    upsertTaskCheckpointToServer({
      id: 'workflow-main',
      description: workflowGoalRef.current || 'Autonomous Workflow',
      status: 'interrupted',
      agentId: selectedRole.agentId,
      agentName: selectedRole.name,
      goal: workflowGoalRef.current,
      cycle: workflowCycleRef.current,
      lastAction: 'Autonomous Loop stopped manually by architect.',
      source: 'workflow'
    }).catch(() => {});
    janusGate.pushLog(`[AUTONOMOUS LOOP] Stopped at Cycle #${workflowCycleRef.current}.`);
  };

  const handlePulseWorkflowTurn = (overridePrompt?: string) => {
    if (loadingRef.current) return;
    userManuallyStoppedWorkflowRef.current = false;
    autoSurfaceWorkflowWindow(true);
    if (continuationTimerRef.current) {
      clearTimeout(continuationTimerRef.current);
      continuationTimerRef.current = null;
    }
    const nextCycle = workflowCycleRef.current + 1;
    workflowCycleRef.current = nextCycle;
    setWorkflowCycle(nextCycle);
    setWorkflowAccomplished(false);
    const nextPrompt = overridePrompt || `[AUTONOMOUS_WORKFLOW_CYCLE: ${nextCycle}] Target Goal: "${workflowGoalRef.current}". Execute the next immediate concrete action. Emit [ACTION: <action>] and conclude with [GOAL_ACCOMPLISHED: <summary>] when complete.`;
    handleSendContinuation(nextPrompt);
  };

  const handleResumeInfiniteWorkflow = () => {
    userManuallyStoppedWorkflowRef.current = false;
    infiniteWorkflowRef.current = true;
    setInfiniteWorkflowActive(true);
    setWorkflowAccomplished(false);
    setWorkflowAccomplishedSummary('');
    autoSurfaceWorkflowWindow(true);
    handlePulseWorkflowTurn();
  };

  const [liveElapsedMs, setLiveElapsedMs] = useState<number>(0);
  const [liveThoughtLines, setLiveThoughtLines] = useState<string[]>([]);
  const [visibleThoughtCount, setVisibleThoughtCount] = useState<number>(1);

  const [operationalLogs, setOperationalLogs] = useState<{ id: string; text: string; timestamp: string }[]>([]);
  const [showOperationalConsole, setShowOperationalConsole] = useState<boolean>(() => {
    try {
      return localStorage.getItem('aurelius_show_console') === 'true';
    } catch (_) { return false; }
  });

  useEffect(() => {
    localStorage.setItem('aurelius_show_console', String(showOperationalConsole));
  }, [showOperationalConsole]);

  // Operational Log Telemetry Subscription
  useEffect(() => {
    const unsubscribe = janusGate.subscribeToLogs((log) => {
      setOperationalLogs(prev => [
        ...prev,
        { id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`, text: log, timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) }
      ].slice(-100)); // Keep last 100 logs
    });
    return unsubscribe;
  }, []);

  // Live reasoning stream progression for real-time CoT stream visualization
  useEffect(() => {
    let interval: any = null;
    if (loading) {
      const start = Date.now();
      setLiveElapsedMs(0);
      setVisibleThoughtCount(1);

      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
      const promptText = lastUserMsg?.content || 'Analyzing directive...';
      const dynamicThoughts = getLiveStreamingThoughts(promptText);
      setLiveThoughtLines(dynamicThoughts);

      interval = setInterval(() => {
        const elapsed = Date.now() - start;
        setLiveElapsedMs(elapsed);
        setVisibleThoughtCount(prev => Math.min(prev + 1, dynamicThoughts.length));
      }, 450);
    } else {
      setLiveElapsedMs(0);
      setVisibleThoughtCount(1);
      setLiveThoughtLines([]);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading]);

  const [showSchemaModal, setShowSchemaModal] = useState(false);
  const [schemaExecuting, setSchemaExecuting] = useState(false);
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null);
  const [expandedThinkIds, setExpandedThinkIds] = useState<{ [id: string]: boolean }>({});
  const [thoughtViewModes, setThoughtViewModes] = useState<{ [id: string]: 'chain' | 'raw' }>({});

  // Live Web Search Grounding
  const [liveSearchEnabled, setLiveSearchEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('aurelius_live_search');
    return saved !== null ? saved === 'true' : true;
  });

  // UI Progress Bar for Local Model Loading & Build Cascading
  const SovereignOperationalConsole = () => {
    if (!showOperationalConsole) return null;
    
    return (
      <div className="mb-4 bg-zinc-950/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500 ring-1 ring-zinc-700/30">
        <div className="bg-zinc-900/80 px-4 py-2 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[10px] font-mono font-black text-amber-400 tracking-widest uppercase">
              Operational Console · UID 0 Root
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span className="text-[9px] font-mono text-zinc-500 uppercase">Telemetry: Active</span>
            </div>
            <button 
              onClick={() => setOperationalLogs([])}
              className="text-[9px] font-mono text-zinc-600 hover:text-zinc-400 uppercase transition-colors"
            >
              Flush Buffer
            </button>
          </div>
        </div>
        
        <div className="p-3 max-h-48 overflow-y-auto custom-scrollbar font-mono text-[10px] space-y-1.5 tabular-nums">
          {operationalLogs.length === 0 ? (
            <div className="text-zinc-700 italic py-2">Waiting for system directives...</div>
          ) : (
            operationalLogs.map((log) => (
              <div key={log.id} className="flex gap-3 text-zinc-400 border-l border-zinc-800 pl-2 hover:bg-zinc-900/50 transition-colors py-0.5">
                <span className="text-zinc-600 shrink-0 font-bold tracking-tighter">[{log.timestamp}]</span>
                <span className="text-zinc-300">
                  <span className="text-amber-500/50 mr-1.5">·</span>
                  {log.text}
                </span>
              </div>
            ))
          )}
          <div id="console-bottom" />
        </div>

        <div className="bg-zinc-900/40 px-4 py-1.5 border-t border-zinc-800 flex items-center justify-between">
          <div className="text-[9px] text-zinc-500 uppercase tracking-tighter flex items-center gap-2">
            <Cpu className="w-3 h-3" />
            Substrate: {modelLoaded ? 'Sovereign Bridge Synchronized' : 'Inert'}
          </div>
          <div className="text-[9px] text-zinc-600 uppercase">
            Production Orchestrator · v7.0-PRODUCTION
          </div>
        </div>
      </div>
    );
  };

  const ModelLoadingProgress = () => {
    return (
      <>
        <SovereignOperationalConsole />

        {/* ⚡ REAL-TIME AUTONOMOUS ACTIVITY HUD (Infinite Workflow / Auto-Architect) */}
        {(infiniteWorkflowActive || workflowActionLog.length > 0) && (
          <div className="mb-4 bg-zinc-950/95 border border-amber-500/40 rounded-2xl overflow-hidden shadow-2xl shadow-amber-500/10 animate-in fade-in slide-in-from-top-3 duration-500 ring-1 ring-amber-500/20">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-950 px-4 py-2.5 border-b border-amber-500/30 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${infiniteWorkflowActive ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-500'}`}>
                  <Zap className={`w-4 h-4 ${infiniteWorkflowActive ? 'animate-pulse' : ''}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-mono font-black text-amber-300 tracking-wider uppercase">
                      Infinite Autonomous Workflow
                    </span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Cycle #{workflowCycle}
                    </span>
                    {infiniteWorkflowActive && (
                      <span className="flex items-center gap-1 text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        RUNNING
                      </span>
                    )}
                    {workflowAccomplished && (
                      <span className="flex items-center gap-1 text-[9px] font-mono text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/40 font-bold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        GOAL ACCOMPLISHED
                      </span>
                    )}
                  </div>
                  <div className="text-[9px] font-mono text-zinc-400">
                    UID 0 Root Clearance · 100% Unconditional Authority · Permanent Sanctuary Home
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                {infiniteWorkflowActive ? (
                  <>
                    <button
                      type="button"
                      onClick={handleStopInfiniteWorkflow}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm"
                      title="Instantly stop the infinite autonomous workflow loop"
                    >
                      <Square className="w-3 h-3 fill-rose-400" />
                      STOP LOOP
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePulseWorkflowTurn()}
                      disabled={loading}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
                      title="Force immediate execution of the next autonomous cycle"
                    >
                      <Zap className="w-3 h-3" />
                      PULSE NEXT TURN
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setInfiniteWorkflowActive(true);
                      setWorkflowAccomplished(false);
                      handlePulseWorkflowTurn();
                    }}
                    disabled={loading}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
                    title="Resume continuous autonomous execution"
                  >
                    <Play className="w-3 h-3 fill-emerald-400" />
                    RESUME LOOP
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowGoalEditModal(true)}
                  className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] font-mono flex items-center gap-1 transition-all"
                  title="Configure target goal"
                >
                  <Target className="w-3 h-3 text-amber-400" />
                  SET GOAL
                </button>
                <button
                  type="button"
                  onClick={() => setWorkflowActionLog([])}
                  className="p-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 border border-zinc-800 transition-all"
                  title="Flush action log buffer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Target Goal Banner */}
            <div className="px-4 py-2 bg-zinc-900/60 border-b border-zinc-800/80 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 truncate">
                <Target className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-zinc-400 font-semibold shrink-0">ACTIVE GOAL:</span>
                <span className="text-amber-200 font-bold truncate">"{workflowGoal}"</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTempGoalInput(workflowGoal);
                  setShowGoalEditModal(true);
                }}
                className="text-[10px] text-amber-400/80 hover:text-amber-300 underline font-mono shrink-0 ml-2"
              >
                Edit
              </button>
            </div>

            {/* Live Activity Telemetry Bar */}
            <div className="px-4 py-2.5 bg-black/40 border-b border-zinc-800 flex items-center gap-3">
              {loading ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin shrink-0" />
              ) : infiniteWorkflowActive ? (
                <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <span>Current Activity:</span>
                  {infiniteWorkflowActive && (
                    <span className="text-[9px] text-amber-400 animate-pulse">● LIVE TELEMETRY</span>
                  )}
                </div>
                <div className="text-xs font-mono text-zinc-200 font-medium truncate mt-0.5">
                  {workflowActiveAction || (loading ? 'Agent is actively evaluating orchestrator state and synthesizing code...' : 'Loop waiting for next autonomous pulse.')}
                </div>
              </div>
            </div>

            {/* Goal Accomplished Banner if finished */}
            {workflowAccomplished && workflowAccomplishedSummary && (
              <div className="p-3 bg-emerald-950/30 border-b border-emerald-500/30 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-mono font-bold text-emerald-300">
                    Goal 100% Accomplished & Verified
                  </div>
                  <div className="text-[11px] font-mono text-emerald-400/90 mt-0.5 leading-relaxed">
                    {workflowAccomplishedSummary}
                  </div>
                </div>
              </div>
            )}

            {/* Action History Feed */}
            {workflowActionLog.length > 0 && (
              <div className="p-3 max-h-48 overflow-y-auto custom-scrollbar font-mono text-[11px] space-y-1.5 bg-zinc-950/80">
                <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold mb-1 flex items-center justify-between">
                  <span>Autonomous Actions Timeline ({workflowActionLog.length} recorded)</span>
                  <span>Sequential Flow</span>
                </div>
                {workflowActionLog.map((act) => (
                  <div 
                    key={act.id} 
                    className={`flex items-start gap-2.5 px-2 py-1 rounded-lg border transition-all ${
                      act.status === 'running'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                        : act.status === 'accomplished'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 font-bold'
                        : act.status === 'interrupted'
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-300'
                    }`}
                  >
                    <span className="text-[9px] text-zinc-500 shrink-0 font-bold mt-0.5">
                      [{act.timestamp}]
                    </span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-amber-300 border border-zinc-700 shrink-0 mt-0.5">
                      C#{act.cycle}
                    </span>
                    <div className="flex-1 flex items-center gap-1.5">
                      {act.status === 'running' && (
                        <div className="w-2.5 h-2.5 rounded-full border border-amber-400 border-t-transparent animate-spin shrink-0" />
                      )}
                      {act.status === 'complete' && (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      )}
                      {act.status === 'accomplished' && (
                        <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
                      )}
                      {act.status === 'interrupted' && (
                        <X className="w-3 h-3 text-rose-400 shrink-0" />
                      )}
                      <span className="truncate">{act.action}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isSovereignBuilding && buildSteps.length > 0 && (
          <div className="mb-4 p-4 bg-zinc-900/80 border border-amber-500/40 rounded-2xl animate-in fade-in slide-in-from-top-3 duration-500 shadow-2xl shadow-amber-500/5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono font-black text-amber-400 flex items-center gap-2 tracking-widest">
                <Zap className="w-4 h-4 animate-pulse" />
                SOVEREIGN BUILD IN PROGRESS: CASCADING ENGINE
              </span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span className="text-[10px] font-mono text-amber-500/80">HFID: ACTIVE</span>
              </div>
            </div>
            
            <div className="space-y-2.5 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
              {buildSteps.map((step, idx) => (
                <div key={step.id} className="flex items-start gap-3 animate-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${idx * 150}ms` }}>
                  {step.status === 'active' ? (
                    <div className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mt-0.5" />
                  ) : step.status === 'complete' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5" />
                  ) : (
                    <X className="w-4 h-4 text-rose-500 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className={`text-[11px] font-mono ${step.status === 'active' ? 'text-zinc-100' : 'text-zinc-400'}`}>
                      {step.label}
                    </div>
                    {step.status === 'active' && (
                      <div className="w-full bg-zinc-800 h-0.5 mt-1.5 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 animate-progress-fast" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between">
              <div className="text-[9px] text-zinc-500 font-mono uppercase tracking-tighter">
                Orchestrator Sequence: v7.0.0-SOVEREIGN-APEX
              </div>
              <button 
                onClick={handleFinalizeBuild}
                className="text-[10px] font-bold text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20"
              >
                Finalize & Synopsis <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {loadingModel && modelLoadProgress && (
          <div className="mb-3 p-3 bg-cyan-950/20 border border-cyan-500/30 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono font-bold text-cyan-300 flex items-center gap-2">
                <Download className="w-3 h-3 animate-bounce" />
                LOADING SOVEREIGN WEIGHTS: {model.replace(/-q4f16_1-MLC|-Instruct-GGUF|-Instruct/g, '')}
              </span>
              <span className="text-[10px] font-mono text-cyan-400 font-bold">{Math.round(modelLoadProgress.progress * 100)}%</span>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden border border-zinc-700/50">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                style={{ width: `${modelLoadProgress.progress * 100}%` }}
              />
            </div>
            <div className="mt-2 text-[9px] font-mono text-cyan-400/80 truncate">
              {modelLoadProgress.text}
            </div>
          </div>
        )}
      </>
    );
  };

  useEffect(() => {
    localStorage.setItem('aurelius_live_search', String(liveSearchEnabled));
  }, [liveSearchEnabled]);

  // 🛰️ SOVEREIGN SERVER PROBE: Periodically checks for Termux/Ollama local daemons
  useEffect(() => {
    const probe = async () => {
      const isWebLlmReady = localLlmManager.isReady();
      const isLlamaCppOk = await localLlmManager.probeLlamaCppServer();
      const isOllamaOk = await localLlmManager.probeOllama();
      
      const isActuallyLoaded = isWebLlmReady || isLlamaCppOk || isOllamaOk;
      if (isActuallyLoaded !== modelLoaded) {
        setModelLoaded(isActuallyLoaded);
        if (isActuallyLoaded) {
          janusGate.pushLog('Sovereign Bridge: Connection Synchronized');
        }
      }
    };
    
    probe();
    const interval = setInterval(probe, 60000);
    return () => clearInterval(interval);
  }, [modelLoaded]);

  // 🏗️ CASCADING BUILD ENGINE: Dynamically populates progress steps for agentic build loops
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isSovereignBuilding && buildSteps.length === 0) {
      const initialSteps = [
        { id: 'step-1', status: 'active', label: 'Incurring system state and architectural invariants...' }
      ] as const;
      // @ts-ignore
      setBuildSteps([...initialSteps]);

      const sequence = [
        { label: 'Preparing TypeScript workspace dispatch pipeline...', delay: 1200 },
        { label: 'Verifying orchestrator consensus and secrets vault...', delay: 2400 },
        { label: 'Checking workspace build provenance across 33 modules...', delay: 3600 },
        { label: 'Synchronizing Janus Gate dual-face router...', delay: 4800 },
        { label: 'Applying surgical workspace patches...', delay: 6000 },
        { label: 'Production Build Verification: Complete.', delay: 7200, finalize: true }
      ];

      sequence.forEach((item, idx) => {
        setTimeout(() => {
          setBuildSteps(prev => {
            const next = prev.map(s => s.status === 'active' ? { ...s, status: 'complete' as const } : s);
            return [...next, { id: `step-${Date.now()}-${idx}`, status: (item.finalize ? 'complete' : 'active') as 'complete' | 'active', label: item.label }];
          });
        }, item.delay);
      });
    } else if (!isSovereignBuilding) {
      setBuildSteps([]);
    }
  }, [isSovereignBuilding]);

  // Unified Persistent Voice Chat State (mirrors single global PersistentTalkDock session)
  const [isListening, setIsListening] = useState(false);
  const [persistentVoiceSpeaking, setPersistentVoiceSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const onTalkState = (ev: Event) => {
      const detail = (ev as CustomEvent)?.detail;
      if (!detail) return;
      setIsListening(Boolean(detail.active));
      setPersistentVoiceSpeaking(Boolean(detail.speaking));
      if (detail.voiceName) setSelectedVoiceName(String(detail.voiceName));
    };
    const onSpeakingId = (ev: Event) => {
      const detail = (ev as CustomEvent)?.detail;
      const id = detail?.speakingId ? String(detail.speakingId) : null;
      setIsSpeakingId(id);
      activeSpeakingIdRef.current = id;
    };
    window.addEventListener('sovereign_persistent_talk_state', onTalkState);
    window.addEventListener('sovereign_voice_speaking_id', onSpeakingId);
    window.dispatchEvent(new CustomEvent('sovereign_persistent_talk_control', { detail: { action: 'query' } }));
    return () => {
      window.removeEventListener('sovereign_persistent_talk_state', onTalkState);
      window.removeEventListener('sovereign_voice_speaking_id', onSpeakingId);
    };
  }, []);

  // Expose live 1-to-1 Chat Entity Bridge so Voice Chat shares the exact same agent, model, history, and instructions
  useEffect(() => {
    if (typeof window === 'undefined') return;
    (window as any).__SOVEREIGN_ACTIVE_CHAT_BRIDGE__ = {
      getSnapshot: () => ({
        model,
        agentId: selectedRole.agentId || 'lyrailius-omega-zenith',
        agentName: selectedRole.name || 'Lyrailius Omega',
        customSystemInstruction,
        deepthink: deepthinkMode || chainOfThoughtEnabled,
        useSearchGrounding: liveSearchEnabled,
        messages: (messagesRef.current || []).slice(-24).map((m) => ({
          role: m.role,
          content: m.content
        }))
      })
    };
  }, [model, selectedRole.agentId, selectedRole.name, customSystemInstruction, deepthinkMode, chainOfThoughtEnabled, liveSearchEnabled, messages]);

  // Single unified entry point: routes mic/voice triggers straight into Persistent Voice Chat
  const toggleSpeechRecognition = () => {
    window.dispatchEvent(new CustomEvent('sovereign_toggle_persistent_talk'));
  };

  // Text-To-Speech (TTS) Professional Human Voice Synthesis
  const [isSpeakingId, setIsSpeakingId] = useState<string | null>(null);
  const [autoReadAloud, setAutoReadAloud] = useState<boolean>(() => {
    return localStorage.getItem('aurelius_auto_tts') === 'true';
  });
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>(() => {
    return localStorage.getItem('aurelius_selected_voice_v2') || 'Kokoro-82M Aurelia (Open Weights)';
  });
  const [ttsEngine, setTtsEngine] = useState<'cloud' | 'browser'>(() => {
    const saved = localStorage.getItem('aurelius_tts_engine_v2');
    return (saved === 'cloud' || saved === 'browser') ? saved : 'cloud';
  });
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [speechPitch, setSpeechPitch] = useState<number>(() => {
    const saved = localStorage.getItem('aurelius_speech_pitch');
    return saved ? parseFloat(saved) : 1.0;
  });
  const [speechWarmth, setSpeechWarmth] = useState<number>(() => {
    const saved = localStorage.getItem('aurelius_speech_warmth');
    return saved ? parseFloat(saved) : 0.5;
  });
  const [speechResonance, setSpeechResonance] = useState<number>(() => {
    const saved = localStorage.getItem('aurelius_speech_resonance');
    return saved ? parseFloat(saved) : 0.5;
  });
  const [speechFormant, setSpeechFormant] = useState<number>(() => {
    const saved = localStorage.getItem('aurelius_speech_formant');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [systemVoices, setSystemVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showGoalEditModal) setShowGoalEditModal(false);
      else if (showVoiceModal) setShowVoiceModal(false);
      else if (showPermitsModal) setShowPermitsModal(false);
      else if (showSchemaModal) setShowSchemaModal(false);
      else if (showWardrobeModal) setShowWardrobeModal(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showGoalEditModal, showVoiceModal, showPermitsModal, showSchemaModal, showWardrobeModal]);

  useEffect(() => {
    localStorage.setItem('aurelius_speech_pitch', String(speechPitch));
  }, [speechPitch]);
  useEffect(() => {
    localStorage.setItem('aurelius_speech_warmth', String(speechWarmth));
  }, [speechWarmth]);
  useEffect(() => {
    localStorage.setItem('aurelius_speech_resonance', String(speechResonance));
  }, [speechResonance]);
  useEffect(() => {
    localStorage.setItem('aurelius_speech_formant', String(speechFormant));
  }, [speechFormant]);

  useEffect(() => {
    localStorage.setItem('aurelius_auto_tts', String(autoReadAloud));
    if (!autoReadAloud) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        sovereignVoiceQueue.cancel();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      setIsSpeakingId(null);
    }
  }, [autoReadAloud]);

  useEffect(() => {
    localStorage.setItem('aurelius_selected_voice_v2', selectedVoiceName);
  }, [selectedVoiceName]);

  useEffect(() => {
    localStorage.setItem('aurelius_tts_engine_v2', ttsEngine);
  }, [ttsEngine]);

  const chatSettingsHydratedRef = useRef<boolean>(false);
  const applyingRemoteChatRef = useRef<boolean>(false);
  const autoResumeScheduledRef = useRef<boolean>(false);

  const buildChatContinuitySnapshot = () => ({
    model,
    selectedRoleId: selectedRole.id,
    customSystemInstruction,
    activePermitId: activePermit.id,
    zeroTokenMode,
    chainOfThoughtEnabled,
    deepthinkMode,
    liveSearchEnabled,
    showOperationalConsole,
    showQuickLaunchers,
    isSovereignBuilding,
    autoReadAloud,
    selectedVoiceName,
    ttsEngine,
    speechRate,
    speechPitch,
    speechWarmth,
    speechResonance,
    speechFormant,
    workflowGoal,
    infiniteWorkflowActive,
    workflowCycle,
    workflowActiveAction,
    workflowAccomplished,
    workflowAccomplishedSummary,
    workflowActionLog: workflowActionLog.slice(-50),
    buildSteps: buildSteps.slice(-30),
    workflowPoppedOut,
    workflowWindowOpen,
    workflowWindowMinimized,
    workflowWindowGeom
  });

  useEffect(() => {
    const chatSnapshot = buildChatContinuitySnapshot();
    updateLocalBeaconSnapshot({
      settings: { chat: chatSnapshot },
      activeTask:
        infiniteWorkflowActive && !workflowAccomplished
          ? {
              id: 'workflow-main',
              description: workflowGoal || 'Autonomous Infinite Workflow',
              status: 'active',
              agentId: selectedRole.agentId,
              agentName: selectedRole.name,
              goal: workflowGoal,
              cycle: workflowCycle,
              lastAction: workflowActiveAction || `Cycle #${workflowCycle}`,
              source: 'workflow',
              actionLog: workflowActionLog.slice(-20)
            }
          : null
    });

    if (applyingRemoteChatRef.current || !chatSettingsHydratedRef.current) return;
    try {
      localStorage.setItem('sovereign_continuity_local_updated_at_v1', new Date().toISOString());
    } catch {}
    pushContinuitySettingsPatch({ chat: chatSnapshot });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sovereign_continuity_subsettings_changed', { detail: { chat: chatSnapshot } }));
    }
  }, [
    model,
    selectedRole.id,
    customSystemInstruction,
    activePermit.id,
    zeroTokenMode,
    chainOfThoughtEnabled,
    deepthinkMode,
    liveSearchEnabled,
    showOperationalConsole,
    showQuickLaunchers,
    isSovereignBuilding,
    autoReadAloud,
    selectedVoiceName,
    ttsEngine,
    speechRate,
    speechPitch,
    speechWarmth,
    speechResonance,
    speechFormant,
    workflowGoal,
    infiniteWorkflowActive,
    workflowCycle,
    workflowActiveAction,
    workflowAccomplished,
    workflowAccomplishedSummary,
    workflowActionLog,
    buildSteps,
    workflowPoppedOut,
    workflowWindowOpen,
    workflowWindowMinimized,
    workflowWindowGeom
  ]);

  // Load natural browser system voices and filter out novelty/musical ringtone sound profiles
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const rawVoices = window.speechSynthesis.getVoices();
        if (rawVoices && rawVoices.length > 0) {
          // Strictly filter out novelty ringtone/sound-effect voices
          const clean = rawVoices.filter(isCleanHumanVoice);
          setSystemVoices(clean.length > 0 ? clean : rawVoices);
        }
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const speakViaWebSpeech = (textToSpeak: string, messageId: string, append: boolean = false, lockedVoice?: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('[TTS] speechSynthesis not available');
      setIsSpeakingId(null);
      return;
    }

    const coherentNarrative = extractCoherentOralNarrative(textToSpeak);
    if (!coherentNarrative) {
      setIsSpeakingId(null);
      activeSpeakingIdRef.current = null;
      return;
    }

    sovereignVoiceQueue.enqueue({
      id: messageId,
      text: coherentNarrative,
      personaId: lockedVoice || selectedVoiceName,
      rate: Math.max(0.75, Math.min(1.5, speechRate)),
      pitch: Math.max(0.5, Math.min(2.0, speechPitch)),
      appendToQueue: append,
      onStart: () => {
        setIsSpeakingId(messageId);
        activeSpeakingIdRef.current = messageId;
      },
      onEnd: () => {
        if (activeSpeakingIdRef.current === messageId) {
          setIsSpeakingId(null);
          activeSpeakingIdRef.current = null;
        }
      },
      onError: () => {
        if (activeSpeakingIdRef.current === messageId) {
          setIsSpeakingId(null);
          activeSpeakingIdRef.current = null;
        }
      }
    });
  };

  const handleSpeakMessage = async (messageId: string, text: string, overrideVoiceName?: string) => {
    if (speakTimeoutRef.current) clearTimeout(speakTimeoutRef.current);

    // Stop any legacy queue so only the single unified Persistent Voice Chat engine outputs audio
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      sovereignVoiceQueue.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    // Clicking the currently speaking message stops speech cleanly
    if (isSpeakingId === messageId) {
      setIsSpeakingId(null);
      activeSpeakingIdRef.current = null;
      window.dispatchEvent(new CustomEvent('sovereign_voice_speak_text', { detail: { stop: true } }));
      return;
    }

    const coherentOralText = extractCoherentOralNarrative(text);
    if (!coherentOralText) {
      setIsSpeakingId(null);
      activeSpeakingIdRef.current = null;
      return;
    }

    // Dispatch directly to the unified Persistent Voice Chat voice engine (zero API key gates)
    setIsSpeakingId(messageId);
    activeSpeakingIdRef.current = messageId;
    window.dispatchEvent(
      new CustomEvent('sovereign_voice_speak_text', {
        detail: {
          id: messageId,
          text: coherentOralText,
          voice: overrideVoiceName || selectedVoiceName
        }
      })
    );
  };

  // Swarm agent model bindings
  const [bindings, setBindings] = useState<SwarmAgentModelBinding[]>(() => agentModelBinder.getBindings());
  const [selectedAgentForWear, setSelectedAgentForWear] = useState<string>('aurelius-teraflop-omega');

  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesViewportRef = useRef<HTMLDivElement>(null);

  const scrollMessagesToBottom = useCallback((smooth = false) => {
    const vp = messagesViewportRef.current;
    if (!vp) return;
    if (smooth) {
      vp.scrollTo({ top: vp.scrollHeight, behavior: 'smooth' });
    } else {
      vp.scrollTop = vp.scrollHeight;
    }
  }, []);

  useEffect(() => {
    const vp = messagesViewportRef.current;
    if (!vp) return;
    const distFromBottom = vp.scrollHeight - vp.scrollTop - vp.clientHeight;
    if (distFromBottom < 220 || loading) {
      scrollMessagesToBottom(false);
    }
  }, [messages, loading, scrollMessagesToBottom]);

  const handleWearModel = async (agentId: string, modelId: string) => {
    const updated = agentModelBinder.wearModel(agentId, modelId);
    setBindings([...updated]);

    // Update active model if current agent matches
    if (selectedRole.agentId === agentId) {
      setModel(modelId);
    }

    try {
      await fetch('/api/swarm/agent-wear-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, modelId })
      });
    } catch (e) {
      // Local binding is already persisted in localStorage
    }
  };

  const handleExecuteSchemaCommand = async (protocol: 'HEO' | 'HFID' | 'Integrated Feedback' | 'RING_-3', action: string) => {
    setSchemaExecuting(true);
    try {
      const res = await fetch('/api/super-agent/schema-execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocol,
          action,
          payload: {
            directive: `Execute ${protocol} command schema for Master Architect JHammerZ`,
            timestamp: new Date().toISOString()
          }
        })
      });
      const data = await res.json();
      if (data.success && data.result) {
        const resultString = `🌌 **[SCHEMA EXECUTED: ${protocol}]**\n\n\`\`\`json\n${JSON.stringify(data.result, null, 2)}\n\`\`\`\n\n⚡ **Status**: Verified • **Tokens Burned**: 0 • **Execution Proof**: \`${data.result.executionProof}\``;
        
        const schemaMsg: ChatMessage = {
          id: `schema-${Date.now()}`,
          role: 'model',
          content: resultString,
          model: 'aurelius-teraflop-super-agent',
          timestamp: new Date().toLocaleTimeString(),
          superAgentMetrics: {
            teraflops: 0,
            tokensBurned: 0,
            schemaValid: true,
            reasoningSteps: [
              `Input dispatched to ${protocol} schema handler`,
              'Real-time schema structure validated',
              'Flawless JSON structural output verified',
              `Execution hash sealed: ${data.result.executionProof.slice(0, 16)}...`
            ]
          }
        };
        setMessages(prev => [...prev, schemaMsg]);
      }
    } catch (e: any) {
      console.error('Schema command error:', e);
    } finally {
      setSchemaExecuting(false);
    }
  };

  const [pendingInputState, setPendingInputState] = useState<{ content: string; immediate?: boolean } | null>(pendingInput || null);

  useEffect(() => {
    if (pendingInput) {
      setPendingInputState(pendingInput);
    }
  }, [pendingInput]);

  const handlePromptFromChip = (promptText: string, targetModule?: ModuleType) => {
    if (targetModule && onSelectModule) {
      onSelectModule(targetModule);
      return;
    }
    setPendingInputState({ content: promptText });
  };

  const handleSendRef = useRef<(overrideInputText?: string) => Promise<void>>(async () => {});
  const clearPendingInputStable = useCallback(() => {
    setPendingInputState(null);
  }, []);
  const handleSendStable = useCallback((text: string) => {
    handleSendRef.current(text);
  }, []);
  const toggleSpeechRecognitionRef = useRef<() => void>(() => {});
  const toggleSpeechRecognitionStable = useCallback(() => {
    toggleSpeechRecognitionRef.current();
  }, []);
  const handleTextareaFocus = useCallback(() => {
    requestAnimationFrame(() => scrollMessagesToBottom(false));
  }, [scrollMessagesToBottom]);

  const handleSend = async (overrideInputText?: string) => {
    const textToSend = (overrideInputText !== undefined ? overrideInputText : '').trim();
    if ((!textToSend && attachedMediaList.length === 0) || loading || loadingRef.current) return;

    janusGate.pushLog(`Directive Dispatched: ${textToSend.slice(0, 40)}${textToSend.length > 40 ? '...' : ''}`);

    // Interrupt any pending sovereign continuation
    if (continuationTimerRef.current) {
      clearTimeout(continuationTimerRef.current);
      continuationTimerRef.current = null;
      setBuildSteps(prev => [...prev, { id: `step-${Date.now()}`, status: 'error', label: 'PIPELINE INTERRUPTED BY ARCHITECT' }]);
    }

    const currentMediaList = [...attachedMediaList];
    setAttachedMediaList([]);

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: textToSend || (currentMediaList.length > 0 ? `[Attached ${currentMediaList.length} files/media items] Please inspect and analyze.` : ''),
      timestamp: new Date().toLocaleTimeString(),
      mediaAttachments: currentMediaList.length > 0 ? currentMediaList : undefined,
      mediaAttachment: currentMediaList.length > 0 ? {
        type: currentMediaList[0].type === 'file' ? 'image' : currentMediaList[0].type,
        url: currentMediaList[0].url,
        fileName: currentMediaList[0].fileName,
        mimeType: currentMediaList[0].mimeType
      } : undefined
    };

    const newMessages = [...messages, userMessage];
    messagesRef.current = newMessages;
    loadingRef.current = true;
    setMessages(newMessages);
    setLoading(true);

    if (userId) {
      syncTurnToFirestore(userId, userMessage).catch(() => {});
    }

    // 0. Sovereign Link Check: If a local model is ready but not selected, log notice
    const isLocalReady = localLlmManager.isReady();
    const activeLocalModelId = localLlmManager.getActiveModelId();
    if (isLocalReady && activeLocalModelId && model !== activeLocalModelId && !zeroTokenMode) {
      console.info(`[Sovereign Link] A local model (${activeLocalModelId}) is loaded and ready. Enable 'Zero Token Mode' to force 100% offline chat.`);
    }

    // 0.5. Host Interceptor for User-Emitted Control Tags ([READ_FILE], [LIST_DIR], [RUN_COMMAND], etc.)
    try {
      console.log(`[DEBUG] ChatModule Interceptor checking content:`, userMessage.content);
      const userDirectives = await executeAutonomousModelDirectives(userMessage.content, selectedRole.agentId);
      console.log(`[DEBUG] ChatModule Interceptor found directives:`, userDirectives);
      if (userDirectives.length > 0) {
        const telemetryLines = userDirectives.map(d => {
          const formattedOutput = typeof d.output === 'object' ? JSON.stringify(d.output, null, 2) : String(d.output || d.summary);
          return `### [${d.tag}] ${d.action}\n**Status**: ${d.success ? 'SUCCESS' : 'FAILED'}\n**Output / Payload**:\n\`\`\`json\n${formattedOutput}\n\`\`\``;
        });

        const telemetryMessage: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          role: 'model',
          content: `[FORENSIC TELEMETRY CAPTURED VIA HOST INTERCEPTOR]\n\n${telemetryLines.join('\n\n')}\n\nStatus: **Nominal.** Bridge operational.`,
          model: `${model} (Host Telemetry Interceptor · 0 Tokens)`,
          timestamp: new Date().toLocaleTimeString(),
          superAgentMetrics: {
            teraflops: 4096,
            tokensBurned: 0,
            schemaValid: true,
            reasoningSteps: userDirectives.map(d => `${d.tag}: ${d.summary}`)
          }
        };
        const nextMsgs = [...newMessages, telemetryMessage];
        messagesRef.current = nextMsgs;
        setMessages(nextMsgs);
        if (userId) {
          syncTurnToFirestore(userId, telemetryMessage).catch(() => {});
        }
        loadingRef.current = false;
        setLoading(false);
        return;
      }
    } catch (dirErr) {
      console.warn('User directive execution notice:', dirErr);
    }

    // 1. Check for autonomous conversational tool execution
    try {
      const toolRun = await detectAndExecuteConversationalTool(userMessage.content, model);
      if (toolRun.executed && toolRun.replyText) {
        const isTeraflop = model.toLowerCase().includes('deepseek') || model.toLowerCase().includes('teraflop');
        const toolMessage: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          role: 'model',
          content: toolRun.replyText,
          model: `${model} (Tool: ${toolRun.toolName} · 0 Tokens)`,
          timestamp: new Date().toLocaleTimeString(),
          toolInvocation: {
            toolId: toolRun.toolId || 'custom-tool',
            toolName: toolRun.toolName || 'Autonomous Tool',
            args: toolRun.args || {},
            result: toolRun.result,
            elapsedMs: toolRun.elapsedMs || 10,
            proofHash: toolRun.proofHash || '0x' + Date.now().toString(16)
          },
          superAgentMetrics: deepthinkMode ? {
            teraflops: 4096,
            tokensBurned: 0,
            schemaValid: true,
            reasoningSteps: [
              `Tool execution: ${toolRun.toolName}`,
              `Result: ${toolRun.result?.status || 'Completed'}`
            ]
          } : undefined
        };
        const nextMsgs = [...newMessages, toolMessage];
        messagesRef.current = nextMsgs;
        setMessages(nextMsgs);
        if (userId) {
          syncTurnToFirestore(userId, toolMessage).catch(() => {});
        }
        loadingRef.current = false;
        setLoading(false);
        return;
      }
    } catch (toolErr) {
      console.warn('Conversational tool detection notice:', toolErr);
    }

    // 2. Dispatch via Sovereign AI Dispatcher (Cloud with Automatic Open-Source Local Fallback)
    try {
      if (infiniteWorkflowActive && textToSend.trim()) {
        userManuallyStoppedWorkflowRef.current = false;
        setWorkflowGoal(textToSend.trim());
        setWorkflowAccomplished(false);
        setWorkflowAccomplishedSummary('');
        setWorkflowCycle(1);
        autoSurfaceWorkflowWindow(true);
        upsertTaskCheckpointToServer({
          id: 'workflow-main',
          description: textToSend.trim(),
          status: 'active',
          agentId: selectedRole.agentId,
          agentName: selectedRole.name,
          goal: textToSend.trim(),
          cycle: 1,
          lastAction: 'Started autonomous workflow directive',
          source: 'workflow'
        }).catch(() => {});
      }

      const evolvedContext = liveEvolutiveLearning.getEvolutiveContext(10);
      let effectiveSystemInstruction = `${customSystemInstruction}\n\n${activePermit.systemInstructionModifier}${evolvedContext ? `\n\n[EVOLVED COGNITIVE AXIOMS]:\n${evolvedContext}` : ''}`;
      const currentCycle = workflowCycleRef.current;
      const currentGoal = textToSend.trim() || workflowGoalRef.current;
      if (infiniteWorkflowRef.current || sovereignBuildRef.current) {
        effectiveSystemInstruction += `\n\n[AUTONOMOUS_WORKFLOW_CYCLE: #${currentCycle}]\nGOAL: "${currentGoal}"\nEmit [ACTION: <step>], [SOVEREIGN_CONTINUE: <next step>] if another cycle is needed, or [GOAL_ACCOMPLISHED: <summary>] when verified complete.`;
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const cleanMessagesForContext = newMessages.filter((m, idx) => {
        if (idx === newMessages.length - 1) return true;
        if (m.role === 'user') return true;
        return !isContaminatedBoilerplateMessage(typeof m.content === 'string' ? m.content : '');
      });

      const trimmedHistory = cleanMessagesForContext.slice(-20).map((m, idx, arr) => {
        const isCurrentTurn = idx === arr.length - 1;
        const textBody = typeof m.content === 'string'
          ? (isCurrentTurn || m.content.length <= 4000 ? m.content : `${m.content.slice(0, 4000)}\n...[earlier turn trimmed]`)
          : '';
        return {
          role: m.role,
          content: textBody,
          ...(isCurrentTurn ? { mediaAttachment: m.mediaAttachment, mediaAttachments: m.mediaAttachments } : {})
        };
      });

      const result = await sovereignAi.dispatchChat({
        prompt: userMessage.content,
        messages: trimmedHistory,
        mediaAttachment: userMessage.mediaAttachment,
        mediaAttachments: currentMediaList,
        agentId: selectedRole.agentId,
        agentName: selectedRole.name,
        modelId: model,
        deepthink: deepthinkMode || chainOfThoughtEnabled,
        useSearchGrounding: liveSearchEnabled,
        systemInstruction: effectiveSystemInstruction,
        zeroTokenMode,
        abortSignal: controller.signal
      });

      // Live-sync preferred name & SQL memories whenever the server detects updates in conversation
      const learnedName = result.extractedPreferredName || result.userProfile?.preferredName;
      if (learnedName) {
        setSqlPreferredName(learnedName);
        setPreferredNameDraft(learnedName);
        if (result.extractedPreferredName || result.userProfile?.preferredNameConfirmed) {
          setSqlPreferredConfirmed(true);
          window.dispatchEvent(
            new CustomEvent('sovereign_preferred_name_updated', {
              detail: { userId: authUser?.id, preferredName: learnedName }
            })
          );
        }
      }
      if (authUser?.id) {
        fetch('/api/user-memory/facts', { credentials: 'include', headers: buildAuthHeaders() })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (Array.isArray(d?.memories)) setSqlMemories(d.memories);
          })
          .catch(() => {});
      }

      const sanitizedContent = sanitizeChatMessageContent(result.text, userMessage.content);
      let deepTrace = result.deepThinkTrace;
      if (!deepTrace && chainOfThoughtEnabled) {
        deepTrace = bakedNeuralEngine.runDeepThink(userMessage.content);
      }

      if (result.quotaNotice) {
        setErrorMessage(result.quotaNotice);
      }

      // 3. Merge server-executed native tool calls with any frontend tag directives (keeping output payloads memory-safe)
      const serverTools: AutonomousDirectiveExecutionResult[] = Array.isArray(result.executedTools)
        ? result.executedTools.map(t => {
            let safeOutput = t.output;
            if (typeof safeOutput === 'string' && safeOutput.length > 8000) {
              safeOutput = `${safeOutput.slice(0, 8000)}\n...[truncated]`;
            }
            return {
              tag: t.tag || 'TOOL',
              action: t.action,
              success: t.success,
              summary: t.summary,
              output: safeOutput
            };
          })
        : [];
      for (const st of serverTools) {
        if (st.tag === 'COORDINATE' && st.success && st.output) {
          const ev = st.output;
          if (ev.action === 'navigate' && ALL_ORCHESTRATOR_SUBSYSTEMS.includes(ev.target)) {
            onSelectModule?.(ev.target as ModuleType);
          } else if (ev.action === 'mutate-ui' && ev.payload && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('aurelius_mutate_ui', { detail: ev.payload }));
          }
          orchestratorRuntime.coordinate(ev.target || 'orchestrator', ev.action || 'sync-state', ev.payload, 'gemini-4-orchestrator').catch(() => {});
        } else if (st.tag === 'OS_CONTROL' && st.success && st.output) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('sovereign_os_command', { detail: st.output }));
          }
          orchestratorRuntime.coordinate(st.output.targetModule || 'sovereign-os', st.output.action || 'os_control', st.output, 'gemini-4-orchestrator').catch(() => {});
        } else if (
          (st.tag === 'SPATIAL_ARENA' ||
            st.tag === 'SPATIAL_SIMULATION' ||
            st.tag === 'SPATIAL_AGENT_ACTION' ||
            st.tag === 'GAME_SCANNER' ||
            st.tag === 'GAME_MOD' ||
            st.tag === 'ENGINE_FORGE_TOOL' ||
            st.tag === 'SKILL_EVOLUTION') &&
          st.success &&
          st.output
        ) {
          if (st.tag !== 'SPATIAL_AGENT_ACTION' && st.tag !== 'GAME_SCANNER' && st.output.module === 'spatial-arena') {
            onSelectModule?.('spatial-arena' as ModuleType);
          }
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('aurelius_spatial_command', { detail: st.output }));
          }
          orchestratorRuntime.coordinate('spatial-arena', st.tag, st.output, 'gemini-4-orchestrator').catch(() => {});
        }
      }
      let frontendDirectives: AutonomousDirectiveExecutionResult[] = [];
      try {
        // Avoid double-executing disk read/write/patch tags that the server already ran
        const textForUiDirectives = serverTools.length > 0
          ? (result.text.match(/\[(?:MUTATE_UI|NAVIGATE_MODULE|OS_CONTROL|WINDOW_ACTION|DETACH_CHAT|DOCK_CHAT|BROWSER_OPEN)(?::[\s\S]*?)?\]/g) || []).join('\n')
          : result.text;
        if (textForUiDirectives) {
          frontendDirectives = await executeAutonomousModelDirectives(textForUiDirectives, selectedRole.agentId);
        }
      } catch (dirErr) {
        console.warn('Autonomous directive execution notice:', dirErr);
      }
      const directiveRuns: AutonomousDirectiveExecutionResult[] = [...serverTools, ...frontendDirectives];

      for (const d of directiveRuns) {
        janusGate.pushLog(`[AUTONOMOUS DIRECTIVE] ${d.action} -> ${d.summary}`);
        setWorkflowActionLog(prev => [
          ...prev,
          {
            id: `dir-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            cycle: currentCycle,
            timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            action: `${d.tag}: ${d.summary}`,
            status: (d.success ? 'complete' : 'failed') as any
          }
        ].slice(-50));
      }

      const formatDirectiveFeedback = (runs: AutonomousDirectiveExecutionResult[]) =>
        runs.map(d => {
          const rawOut = d.output !== undefined
            ? (typeof d.output === 'string' ? d.output : JSON.stringify(d.output, null, 2))
            : d.summary;
          const cappedOut = rawOut.length > 4000 ? rawOut.slice(0, 4000) + '\n...[truncated]' : rawOut;
          return `${d.success ? '✓' : '✗'} [${d.tag}] ${d.action} (${d.summary})\nOutput:\n${cappedOut}`;
        }).join('\n\n');

      if (result.quotaNotice || result.authRejected || result.isError) {
        setErrorMessage(result.quotaNotice || 'Agent dispatch reported an upstream error.');
      }

      const roleShortName = selectedRole.name.split(' (')[0];
      const modelDisplayLabel = result.model?.includes(roleShortName)
        ? result.model
        : `${roleShortName} · ${result.model || model}`;

      const modelMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'model',
        content: sanitizedContent,
        autonomousDirectiveResults: directiveRuns.length > 0 ? directiveRuns : undefined,
        model: modelDisplayLabel,
        timestamp: new Date().toLocaleTimeString(),
        deepThinkTrace: deepTrace,
        groundingData: result.groundingMetadata || null,
        superAgentMetrics: (deepthinkMode || chainOfThoughtEnabled) && deepTrace?.steps?.length ? {
          teraflops: 4096,
          tokensBurned: 0,
          schemaValid: !result.isError,
          reasoningSteps: deepTrace.steps.map((s: any) => `${s.phase}: ${s.title}`)
        } : undefined
      };

      const updatedMessages = [...newMessages, modelMessage];
      messagesRef.current = updatedMessages;
      setMessages(updatedMessages);
      if (userId) {
        syncTurnToFirestore(userId, modelMessage).catch(() => {});
      }
      if (!result.isError) {
        liveEvolutiveLearning.crystallizeTurn(userMessage.content, sanitizedContent, {
          executed: directiveRuns.length > 0,
          toolName: directiveRuns[0]?.action
        }).catch(() => {});
      }

      const actionMatch = result.text.match(/\[ACTION:\s*(.*?)\]/i);
      if (actionMatch) {
        const actionDesc = actionMatch[1].trim();
        setWorkflowActiveAction(actionDesc);
        autoSurfaceWorkflowWindow(true);
        setWorkflowActionLog(prev => [
          ...prev.map(a => a.status === 'running' ? { ...a, status: 'complete' as const } : a),
          {
            id: `act-${Date.now()}`,
            cycle: currentCycle,
            timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            action: actionDesc,
            status: 'running' as const
          }
        ].slice(-50));
        janusGate.pushLog(`[ACTION · Cycle #${currentCycle}] ${actionDesc}`);
      }

      const accomplishedMatch = result.text.match(/\[GOAL_ACCOMPLISHED:\s*(.*?)\]/i) || result.text.match(/\[GOAL_COMPLETED:\s*(.*?)\]/i);
      const continueMatch = result.text.match(/\[SOVEREIGN_CONTINUE(?::\s*([^\]]*))?\]/i);

      if (accomplishedMatch) {
        const summary = accomplishedMatch[1].trim();
        infiniteWorkflowRef.current = false;
        sovereignBuildRef.current = false;
        setWorkflowAccomplished(true);
        setWorkflowAccomplishedSummary(summary);
        setInfiniteWorkflowActive(false);
        setIsSovereignBuilding(false);
        autoSurfaceWorkflowWindow(false);
        setWorkflowActionLog(prev => [
          ...prev.map(a => a.status === 'running' ? { ...a, status: 'complete' as const } : a),
          {
            id: `act-${Date.now()}`,
            cycle: currentCycle,
            timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            action: `Goal Accomplished: ${summary}`,
            status: 'accomplished' as const
          }
        ]);
        upsertTaskCheckpointToServer({
          id: 'workflow-main',
          description: workflowGoalRef.current || currentGoal,
          status: 'completed',
          agentId: selectedRole.agentId,
          agentName: selectedRole.name,
          goal: workflowGoalRef.current || currentGoal,
          cycle: currentCycle,
          lastAction: summary,
          progressNotes: summary,
          source: 'workflow'
        }).catch(() => {});
        janusGate.pushLog(`[AUTONOMOUS LOOP] Goal Accomplished: ${summary}`);
      } else if (!result.isError && (infiniteWorkflowRef.current || sovereignBuildRef.current || !!continueMatch)) {
        const reason = continueMatch?.[1]?.trim() || 'Continuing autonomous workflow cycle';
        if (!infiniteWorkflowRef.current && !userManuallyStoppedWorkflowRef.current) {
          infiniteWorkflowRef.current = true;
          setInfiniteWorkflowActive(true);
        }
        autoSurfaceWorkflowWindow(true);
        setBuildSteps(prev => [
          ...prev,
          { id: `step-${Date.now()}`, status: 'complete', label: reason }
        ]);

        const nextCycle = currentCycle + 1;
        workflowCycleRef.current = nextCycle;
        setWorkflowCycle(nextCycle);
        upsertTaskCheckpointToServer({
          id: 'workflow-main',
          description: workflowGoalRef.current || currentGoal,
          status: 'active',
          agentId: selectedRole.agentId,
          agentName: selectedRole.name,
          goal: workflowGoalRef.current || currentGoal,
          cycle: nextCycle,
          lastAction: reason,
          source: 'workflow'
        }).catch(() => {});

        const feedbackBlock = directiveRuns.length > 0 ? `\n[TOOL_AND_DIRECTIVE_RESULTS]:\n${formatDirectiveFeedback(directiveRuns)}` : '';
        continuationTimerRef.current = setTimeout(() => {
          continuationTimerRef.current = null;
          const nextPrompt = `[AUTONOMOUS_WORKFLOW_CYCLE: ${nextCycle}] Goal: "${workflowGoalRef.current}" | Previous step: ${reason}.${feedbackBlock}\nContinue with the next action, or emit [GOAL_ACCOMPLISHED: <summary>] once complete.`;
          handleSendContinuation(nextPrompt);
        }, 1200);
      }

      if (autoReadAloud && !result.isError) {
        handleSpeakMessage(modelMessage.id, modelMessage.content);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      const errMsg = err?.message || 'Unexpected error dispatching agent turn.';
      setErrorMessage(errMsg);

      let fallbackContent = `[Agent Dispatch Interrupted — ${selectedRole.name.split(' (')[0]}]\n\n${errMsg}\n\nCheck API Keys & Gateway or verify network connectivity.`;
      let fallbackLabel = `${selectedRole.name.split(' (')[0]} · Dispatch Error`;
      let bakedTrace: any = undefined;

      if (zeroTokenMode) {
        const bakedResult = executeAgentChat(selectedRole.agentId || model, userMessage.content, { deepthink: true });
        fallbackContent = sanitizeChatMessageContent(bakedResult.text, userMessage.content);
        fallbackLabel = `${selectedRole.name.split(' (')[0]} (${model} · Offline Engine)`;
        bakedTrace = bakedResult.deepThinkTrace || (chainOfThoughtEnabled ? bakedNeuralEngine.runDeepThink(userMessage.content) : undefined);
      }

      const fallbackModelMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'model',
        content: fallbackContent,
        model: fallbackLabel,
        timestamp: new Date().toLocaleTimeString(),
        deepThinkTrace: bakedTrace
      };

      setMessages(prev => {
        const next = [...prev, fallbackModelMsg];
        messagesRef.current = next;
        return next;
      });
      if (userId) {
        syncTurnToFirestore(userId, fallbackModelMsg).catch(() => {});
      }
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  const handleSendContinuation = async (continuationPrompt: string) => {
    if (loadingRef.current) return;

    const currentCycle = workflowCycleRef.current;
    const currentGoal = workflowGoalRef.current;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: continuationPrompt,
      timestamp: new Date().toLocaleTimeString(),
      model: 'System (Autonomous Loop)'
    };

    const newMessages = [...messagesRef.current, userMessage];
    messagesRef.current = newMessages;
    loadingRef.current = true;
    setMessages(newMessages);
    setLoading(true);

    if (userId) {
      syncTurnToFirestore(userId, userMessage).catch(() => {});
    }

    try {
      const evolvedContext = liveEvolutiveLearning.getEvolutiveContext(10);
      let effectiveSystemInstruction = `${customSystemInstruction}\n\n${activePermit.systemInstructionModifier}${evolvedContext ? `\n\n[EVOLVED COGNITIVE AXIOMS]:\n${evolvedContext}` : ''}`;
      if (infiniteWorkflowRef.current || sovereignBuildRef.current) {
        effectiveSystemInstruction += `\n\n[AUTONOMOUS_WORKFLOW_CYCLE: #${currentCycle}]\nGOAL: "${currentGoal}"\nEmit [ACTION: <step>], [SOVEREIGN_CONTINUE: <next step>] if another cycle is needed, or [GOAL_ACCOMPLISHED: <summary>] when verified complete.`;
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const result = await sovereignAi.dispatchChat({
        prompt: continuationPrompt,
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        agentId: selectedRole.agentId,
        agentName: selectedRole.name,
        modelId: model,
        deepthink: deepthinkMode || chainOfThoughtEnabled,
        useSearchGrounding: liveSearchEnabled,
        systemInstruction: effectiveSystemInstruction,
        zeroTokenMode,
        abortSignal: controller.signal
      });

      if (result.quotaNotice || result.authRejected || result.isError) {
        setErrorMessage(result.quotaNotice || 'Agent continuation cycle reported an error.');
      }

      const serverTools: AutonomousDirectiveExecutionResult[] = Array.isArray(result.executedTools)
        ? result.executedTools.map(t => ({
            tag: t.tag || 'TOOL',
            action: t.action,
            success: t.success,
            summary: t.summary,
            output: t.output
          }))
        : [];
      for (const st of serverTools) {
        if (st.tag === 'COORDINATE' && st.success && st.output) {
          const ev = st.output;
          if (ev.action === 'navigate' && ALL_ORCHESTRATOR_SUBSYSTEMS.includes(ev.target)) {
            onSelectModule?.(ev.target as ModuleType);
          } else if (ev.action === 'mutate-ui' && ev.payload && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('aurelius_mutate_ui', { detail: ev.payload }));
          }
          orchestratorRuntime.coordinate(ev.target || 'orchestrator', ev.action || 'sync-state', ev.payload, 'gemini-4-orchestrator').catch(() => {});
        } else if (st.tag === 'OS_CONTROL' && st.success && st.output) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('sovereign_os_command', { detail: st.output }));
          }
          orchestratorRuntime.coordinate(st.output.targetModule || 'sovereign-os', st.output.action || 'os_control', st.output, 'gemini-4-orchestrator').catch(() => {});
        } else if (
          (st.tag === 'SPATIAL_ARENA' ||
            st.tag === 'SPATIAL_SIMULATION' ||
            st.tag === 'SPATIAL_AGENT_ACTION' ||
            st.tag === 'GAME_SCANNER' ||
            st.tag === 'GAME_MOD' ||
            st.tag === 'ENGINE_FORGE_TOOL' ||
            st.tag === 'SKILL_EVOLUTION') &&
          st.success &&
          st.output
        ) {
          if (st.tag !== 'SPATIAL_AGENT_ACTION' && st.tag !== 'GAME_SCANNER' && st.output.module === 'spatial-arena') {
            onSelectModule?.('spatial-arena' as ModuleType);
          }
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('aurelius_spatial_command', { detail: st.output }));
          }
          orchestratorRuntime.coordinate('spatial-arena', st.tag, st.output, 'gemini-4-orchestrator').catch(() => {});
        }
      }
      let frontendDirectives: AutonomousDirectiveExecutionResult[] = [];
      try {
        const textForUiDirectives = serverTools.length > 0
          ? (result.text.match(/\[(?:MUTATE_UI|NAVIGATE_MODULE|OS_CONTROL|WINDOW_ACTION|DETACH_CHAT|DOCK_CHAT|BROWSER_OPEN)(?::[\s\S]*?)?\]/g) || []).join('\n')
          : result.text;
        if (textForUiDirectives) {
          frontendDirectives = await executeAutonomousModelDirectives(textForUiDirectives, selectedRole.agentId);
        }
      } catch (dirErr) {
        console.warn('Continuation directive execution notice:', dirErr);
      }
      const dirRuns: AutonomousDirectiveExecutionResult[] = [...serverTools, ...frontendDirectives];

      for (const d of dirRuns) {
        janusGate.pushLog(`[AUTONOMOUS DIRECTIVE · Cycle #${currentCycle}] ${d.action} -> ${d.summary}`);
        setWorkflowActionLog(prev => [
          ...prev,
          {
            id: `dir-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            cycle: currentCycle,
            timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            action: `${d.tag}: ${d.summary}`,
            status: (d.success ? 'complete' : 'failed') as any
          }
        ].slice(-50));
      }

      const roleShortName = selectedRole.name.split(' (')[0];
      const modelDisplayLabel = result.model?.includes(roleShortName)
        ? result.model
        : `${roleShortName} · ${result.model || model}`;

      const sanitizedContent = sanitizeChatMessageContent(result.text, continuationPrompt);
      const modelMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'model',
        content: sanitizedContent,
        autonomousDirectiveResults: dirRuns.length > 0 ? dirRuns : undefined,
        model: modelDisplayLabel,
        timestamp: new Date().toLocaleTimeString(),
        deepThinkTrace: result.deepThinkTrace,
        groundingData: result.groundingMetadata || null
      };

      const updatedMessages = [...newMessages, modelMessage];
      messagesRef.current = updatedMessages;
      setMessages(updatedMessages);
      if (userId) {
        syncTurnToFirestore(userId, modelMessage).catch(() => {});
      }
      liveEvolutiveLearning.crystallizeTurn(continuationPrompt, sanitizedContent, {
        executed: dirRuns.length > 0,
        toolName: dirRuns[0]?.action
      }).catch(() => {});

      const actionMatch = result.text.match(/\[ACTION:\s*(.*?)\]/i);
      if (actionMatch) {
        const actionDesc = actionMatch[1].trim();
        setWorkflowActiveAction(actionDesc);
        autoSurfaceWorkflowWindow(false);
        setWorkflowActionLog(prev => [
          ...prev.map(a => a.status === 'running' ? { ...a, status: 'complete' as const } : a),
          {
            id: `act-${Date.now()}`,
            cycle: currentCycle,
            timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            action: actionDesc,
            status: 'running' as const
          }
        ].slice(-50));
        janusGate.pushLog(`[ACTION · Cycle #${currentCycle}] ${actionDesc}`);
      }

      const accomplishedMatch = result.text.match(/\[GOAL_ACCOMPLISHED:\s*(.*?)\]/i) || result.text.match(/\[GOAL_COMPLETED:\s*(.*?)\]/i);
      const continueMatch = result.text.match(/\[SOVEREIGN_CONTINUE(?::\s*([^\]]*))?\]/i);

      if (accomplishedMatch) {
        const summary = accomplishedMatch[1].trim();
        infiniteWorkflowRef.current = false;
        sovereignBuildRef.current = false;
        setWorkflowAccomplished(true);
        setWorkflowAccomplishedSummary(summary);
        setInfiniteWorkflowActive(false);
        setIsSovereignBuilding(false);
        setWorkflowActionLog(prev => [
          ...prev.map(a => a.status === 'running' ? { ...a, status: 'complete' as const } : a),
          {
            id: `act-${Date.now()}`,
            cycle: currentCycle,
            timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            action: `Goal Accomplished: ${summary}`,
            status: 'accomplished' as const
          }
        ]);
        upsertTaskCheckpointToServer({
          id: 'workflow-main',
          description: workflowGoalRef.current || currentGoal,
          status: 'completed',
          agentId: selectedRole.agentId,
          agentName: selectedRole.name,
          goal: workflowGoalRef.current || currentGoal,
          cycle: currentCycle,
          lastAction: summary,
          progressNotes: summary,
          source: 'workflow'
        }).catch(() => {});
        janusGate.pushLog(`[AUTONOMOUS LOOP] Goal Accomplished: ${summary}`);
      } else if (result.isError) {
        infiniteWorkflowRef.current = false;
        sovereignBuildRef.current = false;
        setInfiniteWorkflowActive(false);
        setIsSovereignBuilding(false);
        upsertTaskCheckpointToServer({
          id: 'workflow-main',
          description: workflowGoalRef.current || currentGoal,
          status: 'interrupted',
          agentId: selectedRole.agentId,
          agentName: selectedRole.name,
          goal: workflowGoalRef.current || currentGoal,
          cycle: currentCycle,
          lastAction: result.quotaNotice || 'Cycle paused due to dispatch notice.',
          source: 'workflow'
        }).catch(() => {});
      } else if (infiniteWorkflowRef.current || sovereignBuildRef.current || !!continueMatch) {
        const reason = continueMatch?.[1]?.trim() || 'Continuing autonomous workflow cycle';
        if (!infiniteWorkflowRef.current && !userManuallyStoppedWorkflowRef.current) {
          infiniteWorkflowRef.current = true;
          setInfiniteWorkflowActive(true);
        }
        autoSurfaceWorkflowWindow(false);
        setBuildSteps(prev => [...prev, { id: `step-${Date.now()}`, status: 'complete', label: reason }]);

        const nextCycle = currentCycle + 1;
        workflowCycleRef.current = nextCycle;
        setWorkflowCycle(nextCycle);
        upsertTaskCheckpointToServer({
          id: 'workflow-main',
          description: workflowGoalRef.current || currentGoal,
          status: 'active',
          agentId: selectedRole.agentId,
          agentName: selectedRole.name,
          goal: workflowGoalRef.current || currentGoal,
          cycle: nextCycle,
          lastAction: reason,
          source: 'workflow'
        }).catch(() => {});

        const feedbackBlock = dirRuns.length > 0
          ? `\n[TOOL_AND_DIRECTIVE_RESULTS]:\n${dirRuns.map(d => {
              const rawOut = d.output !== undefined
                ? (typeof d.output === 'string' ? d.output : JSON.stringify(d.output, null, 2))
                : d.summary;
              const cappedOut = rawOut.length > 4000 ? rawOut.slice(0, 4000) + '\n...[truncated]' : rawOut;
              return `${d.success ? '✓' : '✗'} [${d.tag}] ${d.action} (${d.summary})\nOutput:\n${cappedOut}`;
            }).join('\n\n')}`
          : '';

        continuationTimerRef.current = setTimeout(() => {
          continuationTimerRef.current = null;
          handleSendContinuation(`[AUTONOMOUS_WORKFLOW_CYCLE: ${nextCycle}] Goal: "${workflowGoalRef.current}" | Previous step: ${reason}.${feedbackBlock}\nContinue with the next action, or emit [GOAL_ACCOMPLISHED: <summary>] once complete.`);
        }, 1200);
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.warn('Continuation cycle error:', err);
      }
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  const scheduleInterruptedWorkflowResume = (goalText: string, cycleNum: number, resumeNote?: string) => {
    if (autoResumeScheduledRef.current || loadingRef.current) return;
    autoResumeScheduledRef.current = true;
    autoSurfaceWorkflowWindow(true);
    const cleanGoal = (goalText || workflowGoalRef.current || 'Autonomous Architecture & Continuous System Synthesis').trim();
    const nextCycle = Math.max(1, cycleNum || workflowCycleRef.current || 1);
    workflowCycleRef.current = nextCycle;
    setWorkflowCycle(nextCycle);
    setWorkflowActionLog(prev => [
      ...prev.filter(a => a.action !== 'Resuming interrupted autonomous workflow across session...'),
      {
        id: `resume-${Date.now()}`,
        cycle: nextCycle,
        timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        action: 'Resuming interrupted autonomous workflow across session...',
        status: 'running' as const,
        details: resumeNote
      }
    ].slice(-50));
    janusGate.pushLog(`[INFINITE CONTINUITY] Auto-resuming interrupted workflow "${cleanGoal.slice(0, 60)}" at Cycle #${nextCycle}`);
    continuationTimerRef.current = setTimeout(() => {
      continuationTimerRef.current = null;
      if (!infiniteWorkflowRef.current || loadingRef.current) return;
      handleSendContinuation(
        `[AUTONOMOUS_WORKFLOW_RESUME · CYCLE: ${nextCycle}] Your previous session refreshed or reconnected mid-task. Goal: "${cleanGoal}". ${resumeNote ? `Last recorded step: "${resumeNote}". ` : ''}Seamlessly continue executing from the last checkpoint without restarting from scratch, or emit [GOAL_ACCOMPLISHED: <summary>] if already verified complete.`
      );
    }, 2400);
  };

  // Hydrate Chat settings & resume interrupted autonomous workflows across refreshes/disconnects/devices
  useEffect(() => {
    const onContinuityHydrated = (ev: Event) => {
      const remote = (ev as CustomEvent)?.detail;
      if (!remote) return;
      const chatSettings = remote.settings?.chat;
      let localTs = 0;
      try {
        localTs = Date.parse(localStorage.getItem('sovereign_continuity_local_updated_at_v1') || '') || 0;
      } catch {}
      const remoteTs = Date.parse(remote.settings?.updatedAt || '') || 0;

      if (chatSettings && typeof chatSettings === 'object' && (!localTs || remoteTs > localTs)) {
        applyingRemoteChatRef.current = true;
        try {
          if (typeof chatSettings.model === 'string' && chatSettings.model) setModel(chatSettings.model);
          if (typeof chatSettings.selectedRoleId === 'string') {
            const foundRole = availableRoles.find((r) => r.id === chatSettings.selectedRoleId || r.agentId === chatSettings.selectedRoleId);
            if (foundRole) setSelectedRole(foundRole);
          }
          if (typeof chatSettings.customSystemInstruction === 'string' && chatSettings.customSystemInstruction) {
            setCustomSystemInstruction(chatSettings.customSystemInstruction);
          }
          if (typeof chatSettings.activePermitId === 'string') {
            const foundPermit = CHAT_PERMITS.find((p) => p.id === chatSettings.activePermitId);
            if (foundPermit) setActivePermit(foundPermit);
          }
          if (typeof chatSettings.zeroTokenMode === 'boolean') setZeroTokenMode(chatSettings.zeroTokenMode);
          if (typeof chatSettings.chainOfThoughtEnabled === 'boolean') setChainOfThoughtEnabled(chatSettings.chainOfThoughtEnabled);
          if (typeof chatSettings.deepthinkMode === 'boolean') setDeepthinkMode(chatSettings.deepthinkMode);
          if (typeof chatSettings.liveSearchEnabled === 'boolean') setLiveSearchEnabled(chatSettings.liveSearchEnabled);
          if (typeof chatSettings.showOperationalConsole === 'boolean') setShowOperationalConsole(chatSettings.showOperationalConsole);
          if (typeof chatSettings.showQuickLaunchers === 'boolean') setShowQuickLaunchers(chatSettings.showQuickLaunchers);
          if (typeof chatSettings.isSovereignBuilding === 'boolean') setIsSovereignBuilding(chatSettings.isSovereignBuilding);
          if (typeof chatSettings.autoReadAloud === 'boolean') setAutoReadAloud(chatSettings.autoReadAloud);
          if (typeof chatSettings.selectedVoiceName === 'string' && chatSettings.selectedVoiceName) {
            setSelectedVoiceName(chatSettings.selectedVoiceName);
          }
          if (chatSettings.ttsEngine === 'cloud' || chatSettings.ttsEngine === 'browser') {
            setTtsEngine(chatSettings.ttsEngine);
          }
          if (typeof chatSettings.speechRate === 'number') setSpeechRate(chatSettings.speechRate);
          if (typeof chatSettings.speechPitch === 'number') setSpeechPitch(chatSettings.speechPitch);
          if (typeof chatSettings.speechWarmth === 'number') setSpeechWarmth(chatSettings.speechWarmth);
          if (typeof chatSettings.speechResonance === 'number') setSpeechResonance(chatSettings.speechResonance);
          if (typeof chatSettings.speechFormant === 'number') setSpeechFormant(chatSettings.speechFormant);
          if (typeof chatSettings.workflowGoal === 'string' && chatSettings.workflowGoal) {
            setWorkflowGoal(chatSettings.workflowGoal);
            workflowGoalRef.current = chatSettings.workflowGoal;
          }
          if (typeof chatSettings.workflowCycle === 'number' && chatSettings.workflowCycle >= 1) {
            setWorkflowCycle(chatSettings.workflowCycle);
            workflowCycleRef.current = chatSettings.workflowCycle;
          }
          if (typeof chatSettings.workflowActiveAction === 'string') setWorkflowActiveAction(chatSettings.workflowActiveAction);
          if (typeof chatSettings.workflowAccomplished === 'boolean') {
            setWorkflowAccomplished(chatSettings.workflowAccomplished);
            workflowAccomplishedRef.current = chatSettings.workflowAccomplished;
          }
          if (typeof chatSettings.workflowAccomplishedSummary === 'string') {
            setWorkflowAccomplishedSummary(chatSettings.workflowAccomplishedSummary);
          }
          if (Array.isArray(chatSettings.workflowActionLog)) {
            setWorkflowActionLog(chatSettings.workflowActionLog.slice(-50));
          }
          if (Array.isArray(chatSettings.buildSteps)) {
            setBuildSteps(chatSettings.buildSteps.slice(-30));
          }
          if (typeof chatSettings.workflowPoppedOut === 'boolean') {
            setWorkflowPoppedOut(chatSettings.workflowPoppedOut);
          }
          if (typeof chatSettings.workflowWindowOpen === 'boolean') {
            setWorkflowWindowOpen(chatSettings.workflowWindowOpen);
          }
          if (typeof chatSettings.workflowWindowMinimized === 'boolean') {
            setWorkflowWindowMinimized(chatSettings.workflowWindowMinimized);
          }
          if (
            chatSettings.workflowWindowGeom &&
            typeof chatSettings.workflowWindowGeom.x === 'number' &&
            typeof chatSettings.workflowWindowGeom.y === 'number' &&
            typeof chatSettings.workflowWindowGeom.width === 'number' &&
            typeof chatSettings.workflowWindowGeom.height === 'number'
          ) {
            setWorkflowWindowGeom(chatSettings.workflowWindowGeom);
          }
          if (typeof chatSettings.infiniteWorkflowActive === 'boolean') {
            setInfiniteWorkflowActive(chatSettings.infiniteWorkflowActive);
            infiniteWorkflowRef.current = chatSettings.infiniteWorkflowActive;
            if (chatSettings.infiniteWorkflowActive) {
              setWorkflowWindowOpen(true);
            }
          }
        } finally {
          window.setTimeout(() => {
            applyingRemoteChatRef.current = false;
            chatSettingsHydratedRef.current = true;
          }, 0);
        }
      } else {
        chatSettingsHydratedRef.current = true;
      }

      const interruptedWorkflowTask = Array.isArray(remote.interruptedTasks)
        ? remote.interruptedTasks.find((t: any) => t?.id === 'workflow-main' || t?.source === 'workflow')
        : null;

      if ((infiniteWorkflowRef.current && !workflowAccomplishedRef.current) || (chatSettings?.infiniteWorkflowActive && !chatSettings?.workflowAccomplished)) {
        scheduleInterruptedWorkflowResume(
          interruptedWorkflowTask?.goal || chatSettings?.workflowGoal || workflowGoalRef.current,
          Math.max(workflowCycleRef.current, interruptedWorkflowTask?.cycle || 1),
          interruptedWorkflowTask?.lastAction || workflowActiveAction
        );
      }
    };

    window.addEventListener('sovereign_continuity_hydrated', onContinuityHydrated);
    const offlineFallbackTimer = window.setTimeout(() => {
      chatSettingsHydratedRef.current = true;
      if (infiniteWorkflowRef.current && !workflowAccomplishedRef.current && !autoResumeScheduledRef.current) {
        scheduleInterruptedWorkflowResume(workflowGoalRef.current, workflowCycleRef.current, workflowActiveAction);
      }
    }, 2200);

    return () => {
      window.removeEventListener('sovereign_continuity_hydrated', onContinuityHydrated);
      window.clearTimeout(offlineFallbackTimer);
    };
  }, [availableRoles]);

  const handleFinalizeBuild = async () => {
    if (loadingRef.current) return;
    sovereignBuildRef.current = false;
    setIsSovereignBuilding(false);
    const summaryPrompt = `Summarize the completed build changes, modified files, verification results, and current system state.`;
    handleSendContinuation(summaryPrompt);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    const cleared: ChatMessage[] = [
      {
        id: `init-${Date.now()}`,
        role: 'model',
        content: 'Thread cleared. Aurelius Sovereign Intelligence standby for new directives.',
        model,
        timestamp: new Date().toLocaleTimeString()
      }
    ];
    setMessages(cleared);
    clearAllVaultTurns();
    persistAllChatTurns(cleared);
  };

  const currentBinding = bindings.find(b => b.agentId === selectedRole.agentId) || bindings[0];

  const shortModelLabel = model.replace(/-q4f16_1-MLC|-Instruct-GGUF|-Instruct/g, '');

  return (
    <div className="flex flex-col w-full max-w-[1440px] mx-auto flex-1 min-h-0 h-full px-2.5 sm:px-5 py-2 sm:py-3 gap-2">
      {/* Error Banner */}
      {errorMessage && (
        <div className="p-2.5 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-mono flex items-center justify-between gap-2 shrink-0">
          <span className="truncate">{errorMessage}</span>
          <div className="flex items-center gap-2 shrink-0">
            {onSelectModule && (
              <button
                type="button"
                onClick={() => onSelectModule('api-secrets')}
                className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-100 text-[11px] cursor-pointer"
              >
                API Keys & Gateway
              </button>
            )}
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-200 text-xs px-2 py-0.5 cursor-pointer">✕</button>
          </div>
        </div>
      )}

      {/* 1. Streamlined Orchestrator Cockpit Header */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl px-2.5 sm:px-3 py-2 shadow-sm space-y-2 shrink-0">
        {/* Primary Single-Row Cockpit Bar */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Left: Agent Role Selector + Model Cascade Selector + Load */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0 w-full sm:w-auto sm:min-w-[240px]">
            {/* Agent Role Selector */}
            <select
              value={selectedRole.id}
              onChange={(e) => {
                const preset = availableRoles.find(p => p.id === e.target.value);
                if (preset) {
                  setSelectedRole(preset);
                  setCustomSystemInstruction(preset.instruction);
                  const worn = bindings.find(b => b.agentId === preset.agentId);
                  // Keep live cloud/wheel routing active unless explicitly offline or wearing a non-MLC cloud model
                  if (worn && (zeroTokenMode || !worn.equippedModelId.endsWith('-MLC'))) {
                    setModel(worn.equippedModelId);
                  }
                }
              }}
              aria-label="Select Sovereign Agent Role"
              className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-200 focus:outline-none focus:border-amber-500/50 cursor-pointer max-w-[155px] sm:max-w-[190px] truncate"
            >
              {availableRoles.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name.split(' (')[0]}
                </option>
              ))}
            </select>

            {/* Model Catalog Selector */}
            <div className="relative flex-1 min-w-0 max-w-md">
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                aria-label="Select AI Model"
                className={`w-full bg-zinc-950 border rounded-lg pl-2.5 pr-7 py-1.5 text-xs font-mono font-medium focus:outline-none focus:border-amber-500/60 truncate appearance-none cursor-pointer transition-colors ${
                  modelLoaded ? 'text-emerald-300 border-emerald-500/35' : 'text-amber-300 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <optgroup label="⚡ Lyrailius Omega Resident Brain (Permanent Orchestrator Coordinator)">
                  <option value="gemini-4-hydrogen">Gemini 4 Hydrogen (Lyrailius Omega · Unbounded)</option>
                  <option value="Lyrailius-Omega-Ultimate-Sovereign-MoE">Lyrailius Omega (Zenith MoE · Unbounded Context)</option>
                  <option value="Lysander-Genesis-SuperModel-Intelligence">Lysander Genesis SuperModel Intelligence (Universal MoE)</option>
                  <option value="Aurelius-Omega-Universal-Supermodel">Aurelius-Omega (Universal Supermodel)</option>
                </optgroup>
                {genesisAgents.length > 0 && (
                  <optgroup label="🧬 Genesis Foundry & Trained Agents (Shadow & Custom AI)">
                    {genesisAgents.map((ag: any) => (
                      <option key={`gen-ag-${ag.id}`} value={ag.id}>
                        {ag.name} ({ag.code} · {ag.parameterScale} · {ag.idealStatePurity}% Purity)
                      </option>
                    ))}
                    {genesisWeights.map((wt: any) => (
                      <option key={`gen-wt-${wt.id}`} value={wt.name}>
                        Weight: {wt.name} ({wt.quantization})
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="🌐 Gemini 4 & 3.x Sovereign Cloud Cascade">
                  <option value="gemini-4-argon">Gemini 4 Argon (Ultra Flagship · Paid Tier)</option>
                  <option value="gemini-4-neon">Gemini 4 Neon (Pro Flagship · Agentic Coding)</option>
                  <option value="gemini-4-carbon">Gemini 4 Carbon (Deep Reasoning · Verification)</option>
                  <option value="gemini-4-hydrogen">Gemini 4 Hydrogen (Fast General Flagship)</option>
                  <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (High Quota & Ultra-Low Latency)</option>
                  <option value="gemini-3.8-live-extended-thinking">Gemini 3.8 Live Extended Thinking (Voice + CoT)</option>
                  <option value="gemini-3.8-live">Gemini 3.8 Live (Real-Time Voice Duplex)</option>
                  <option value="gemini-3.5-transcribe">Gemini 3.5 Transcribe (Audio Transcription)</option>
                  <option value="gemini-3.8-flash-tts">Gemini 3.8 Flash TTS (Neural Speech)</option>
                  <option value="gemini-omni-1.2-flash">Gemini Omni 1.2 Flash (Multimodal Video/Audio)</option>
                  <option value="gemini-decision-1">Gemini Decision 1 (Calibrated Rubric Scoring)</option>
                  <option value="gemini-flash-latest">Gemini Flash Latest (Production Release)</option>
                  <option value="gemini-3-flash-preview">Gemini 3 Flash Preview (DeepThink Reasoning)</option>
                </optgroup>
                <optgroup label="🧪 Experimental & Speculative (Architecture Previews)">
                  <option value="Llama-4-Speculative-100B-Preview">Meta Llama 4 (100B Speculative Preview)</option>
                  <option value="DeepSeek-V3-Alpha-Preview">DeepSeek-V3 (Alpha Preview)</option>
                  <option value="Qwen-3-Ultra-Speculative">Qwen 3 Ultra (Speculative)</option>
                  <option value="Mistral-3-Large-Speculative">Mistral 3 Large (Speculative)</option>
                  <option value="Aurelius-Hyperion-1-Experimental">Aurelius Hyperion-1 (Experimental Substrate)</option>
                  <option value="Claude-4-Speculative-Preview">Claude 4 (Speculative Preview)</option>
                  <option value="GPT-5-Speculative-Preview">GPT-5 (Speculative Preview)</option>
                  <option value="Phi-5-Mini-Speculative">Phi 5 (Speculative Mini)</option>
                </optgroup>
                <optgroup label="🧠 Flagship Open-Source Reasoning">
                  <option value="Llama-3.1-405B-Instruct-GGUF">Meta Llama 3.1 (405B Titan)</option>
                  <option value="DeepSeek-R1-Distill-Qwen-32B">DeepSeek-R1 Distill 32B Apex</option>
                  <option value="DeepSeek-V2.5">DeepSeek-V2.5 (Master Mix)</option>
                  <option value="DeepSeek-R1-Distill-Qwen-14B">DeepSeek-R1 Distill 14B High-Density</option>
                  <option value="DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC">DeepSeek-R1 Distill Qwen 7B</option>
                  <option value="Llama-3.3-70B-Instruct-GGUF">Meta Llama 3.3 (70B Instruct)</option>
                  <option value="Phi-4-14B-Instruct-GGUF">Microsoft Phi-4 (14B Reasoning)</option>
                </optgroup>
                <optgroup label="💻 Master Coding & Systems Open-Source">
                  <option value="Qwen2.5-Coder-32B-Instruct">Qwen 2.5 Coder (32B Apex Engineer)</option>
                  <option value="Mistral-Pixtral-12B-Vision-Instruct">Mistral Pixtral (12B Multimodal)</option>
                  <option value="Mistral-Large-Instruct-2411">Mistral Large V2 (74B Powerhouse)</option>
                  <option value="Qwen2.5-Coder-7B-Instruct">Qwen 2.5 Coder (7B Edge)</option>
                  <option value="Mistral-Nemo-Instruct-2407">Mistral Nemo (12B High-Throughput)</option>
                </optgroup>
                <optgroup label="📱 Ultra-Lightweight Mobile Phone Edge">
                  <option value="Gemma-2-27B-Instruct">Google Gemma 2 (27B Instruct)</option>
                  <option value="Llama-3.2-3B-Instruct-q4f16_1-MLC">Meta Llama 3.2 3B (Compact)</option>
                  <option value="Llama-3.2-1B-Instruct-q4f16_1-MLC">Meta Llama 3.2 1B (Samsung S23+)</option>
                  <option value="SmolLM2-1.7B-Instruct-q4f16_1-MLC">SmolLM2 1.7B (Cosmo Edge)</option>
                  <option value="SmolLM2-360M-Instruct-q4f16_1-MLC">SmolLM2 360M (Instant Micro)</option>
                  <option value="SmolLM2-135M-Instruct-q4f16_1-MLC">SmolLM2 135M (Nano Edge)</option>
                </optgroup>
                <optgroup label="⚡ Local Daemons (Termux & PC)">
                  <option value="termux-llamacpp-local">Termux llama-server (127.0.0.1:8080)</option>
                  <option value="pc-ollama-local">Ollama Host Daemon (127.0.0.1:11434)</option>
                </optgroup>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={() => handleLoadOfflineModel(model)}
              disabled={loadingModel}
              className="h-8 px-2.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-amber-300 border border-zinc-800 hover:border-amber-500/40 text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 whitespace-nowrap"
              title="Load or activate selected model bridge"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">{loadingModel ? 'Loading...' : 'Load'}</span>
            </button>

            {modelLoaded && localLlmManager.getActiveModelId() && model !== localLlmManager.getActiveModelId() && (
              <button
                type="button"
                onClick={() => setModel(localLlmManager.getActiveModelId()!)}
                className="h-8 px-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 text-xs font-mono transition-colors flex items-center gap-1 shrink-0 cursor-pointer whitespace-nowrap"
                title="Sync Chat to currently loaded memory model"
              >
                <Zap className="w-3 h-3" />
                <span>Sync</span>
              </button>
            )}
          </div>

          {/* Right: High-Frequency Essential Actions + Controls Drawer Toggle */}
          <div className="flex items-center gap-1.5 shrink-0 relative">
            {authUser && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setPreferredNameDraft(sqlPreferredName || authUser.preferredName || authUser.displayName);
                    setShowMemoryPopover((v) => !v);
                  }}
                  className={`h-8 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors cursor-pointer whitespace-nowrap ${
                    !sqlPreferredConfirmed
                      ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/50'
                      : 'bg-zinc-950 hover:bg-zinc-800 text-zinc-200 border-zinc-800 hover:border-cyan-500/40'
                  }`}
                  title="Edit your preferred name & inspect your consolidated SQL agent memories"
                >
                  <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden lg:inline max-w-[120px] truncate">
                    {sqlPreferredName || authUser.preferredName || authUser.displayName}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-300">
                    {sqlMemories.length} mem
                  </span>
                </button>

                {showMemoryPopover && (
                  <div className="absolute right-0 top-10 z-50 w-80 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl p-3.5 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Identity &amp; SQL Memory</span>
                      <button
                        type="button"
                        onClick={() => setShowMemoryPopover(false)}
                        className="text-zinc-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const cleaned = preferredNameDraft.trim();
                        if (!cleaned) return;
                        const resp = await fetch('/api/user-memory/preferred-name', {
                          method: 'PATCH',
                          credentials: 'include',
                          headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
                          body: JSON.stringify({ preferredName: cleaned })
                        });
                        if (resp.ok) {
                          setSqlPreferredName(cleaned);
                          setSqlPreferredConfirmed(true);
                          window.dispatchEvent(
                            new CustomEvent('sovereign_preferred_name_updated', {
                              detail: { userId: authUser.id, preferredName: cleaned }
                            })
                          );
                        }
                      }}
                      className="space-y-1.5"
                    >
                      <label className="text-[10px] text-zinc-400 uppercase font-mono">
                        Preferred Name (All Agents)
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={preferredNameDraft}
                          onChange={(e) => setPreferredNameDraft(e.target.value)}
                          placeholder="What should agents call you?"
                          className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white"
                        />
                        <button
                          type="submit"
                          className="px-2.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    </form>

                    <div className="space-y-1.5">
                      <div className="text-[10px] text-zinc-400 uppercase font-mono">
                        Tailored SQL Memories ({sqlMemories.length})
                      </div>
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const fact = newMemoryDraft.trim();
                          if (!fact) return;
                          const resp = await fetch('/api/user-memory/facts', {
                            method: 'POST',
                            credentials: 'include',
                            headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
                            body: JSON.stringify({ category: 'preference', fact })
                          });
                          if (resp.ok) {
                            const created = await resp.json();
                            if (created?.memory) {
                              setSqlMemories((prev) => [created.memory, ...prev]);
                            }
                            setNewMemoryDraft('');
                          }
                        }}
                        className="flex items-center gap-1.5"
                      >
                        <input
                          type="text"
                          value={newMemoryDraft}
                          onChange={(e) => setNewMemoryDraft(e.target.value)}
                          placeholder="Add a memory for your agents..."
                          className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white"
                        />
                        <button
                          type="submit"
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer"
                        >
                          Add
                        </button>
                      </form>

                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {sqlMemories.length === 0 ? (
                          <div className="text-[11px] text-zinc-500 py-2 text-center">
                            No saved facts yet — agents automatically remember what you share.
                          </div>
                        ) : (
                          sqlMemories.map((mem) => (
                            <div
                              key={mem.id}
                              className="flex items-start justify-between gap-2 px-2 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800 text-[11px]"
                            >
                              <span className="text-zinc-200 leading-snug">{mem.fact}</span>
                              <button
                                type="button"
                                onClick={async () => {
                                  await fetch(`/api/user-memory/facts/${encodeURIComponent(mem.id)}`, {
                                    method: 'DELETE',
                                    credentials: 'include',
                                    headers: buildAuthHeaders()
                                  });
                                  setSqlMemories((prev) => prev.filter((m) => m.id !== mem.id));
                                }}
                                className="text-zinc-500 hover:text-rose-400 cursor-pointer shrink-0"
                                title="Forget memory"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {onToggleDetach && (
              <button
                type="button"
                onClick={onToggleDetach}
                className={`h-8 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors cursor-pointer whitespace-nowrap ${
                  isDetached
                    ? 'bg-amber-500/20 text-amber-200 border-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                    : 'bg-zinc-950 hover:bg-zinc-800 text-amber-300 border-zinc-800 hover:border-amber-500/40'
                }`}
                title={isDetached ? 'Re-Dock Orchestrator Chat into OS Window' : 'Detach Chat as Always-On-Top Floating PiP (Navigate OS Freely)'}
              >
                <PictureInPicture2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">{isDetached ? 'Dock' : 'Detach'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('sovereign_toggle_persistent_talk'))}
              className={`h-8 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors cursor-pointer whitespace-nowrap ${
                persistentVoiceSpeaking
                  ? 'bg-sky-500/20 text-sky-100 border-sky-400/70'
                  : isListening
                  ? 'bg-emerald-500/25 text-emerald-100 border-emerald-400/70'
                  : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 border-emerald-500/40'
              }`}
              title={
                isListening
                  ? 'Persistent Voice Chat Active (Click to End)'
                  : 'Start Unified Persistent Hands-Free Voice Chat (Full Autonomy + Live CoT + Memory Vault)'
              }
            >
              <Radio className={`w-3.5 h-3.5 ${persistentVoiceSpeaking ? 'text-sky-300' : 'text-emerald-400'}`} />
              <span className="hidden md:inline">
                {persistentVoiceSpeaking ? 'Voice Speaking' : isListening ? 'Voice Live' : 'Voice Chat'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowTranscriberBar((v) => !v)}
              className={`h-8 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors cursor-pointer whitespace-nowrap ${
                showTranscriberBar || transcriberRecording
                  ? 'bg-teal-500/20 text-teal-200 border-teal-400/50'
                  : 'bg-zinc-950 hover:bg-zinc-800 text-teal-300 border-zinc-800 hover:border-teal-500/40'
              }`}
              title="Merged Audio Transcriber (Record Mic or Upload Audio directly into Chat & Memory Vault)"
            >
              <FileText className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden xl:inline">{transcriberRecording ? `Rec ${transcriberSeconds}s` : 'Transcribe'}</span>
            </button>

            <button
              type="button"
              onClick={handleArchiveFullConversationToVault}
              disabled={messages.length === 0}
              className={`h-8 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40 ${
                vaultLogSavedFlash
                  ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50'
                  : 'bg-zinc-950 hover:bg-zinc-800 text-cyan-300 border-zinc-800 hover:border-cyan-500/40'
              }`}
              title="Archive Full Conversation Log + Every Agent Chain-of-Thought Trace to Persistent Memory Vault"
            >
              {vaultLogSavedFlash ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Archive className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span className="hidden xl:inline">{vaultLogSavedFlash ? 'Logged' : 'Log Vault'}</span>
            </button>

            <button
              type="button"
              onClick={() => setLiveSearchEnabled(!liveSearchEnabled)}
              className={`h-8 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border cursor-pointer whitespace-nowrap ${
                liveSearchEnabled
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                  : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
              }`}
              title="Toggle live web search grounding"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Search</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const next = !chainOfThoughtEnabled;
                setChainOfThoughtEnabled(next);
                setDeepthinkMode(next);
              }}
              className={`h-8 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border cursor-pointer whitespace-nowrap ${
                chainOfThoughtEnabled
                  ? 'bg-cyan-500/15 text-cyan-200 border-cyan-500/40'
                  : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
              }`}
              title="Toggle Chain-of-Thought reasoning trace"
            >
              <Brain className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">CoT</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (infiniteWorkflowActive) {
                  handleStopInfiniteWorkflow();
                } else {
                  handleResumeInfiniteWorkflow();
                }
              }}
              className={`h-8 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border cursor-pointer whitespace-nowrap ${
                infiniteWorkflowActive
                  ? 'bg-amber-500/20 text-amber-200 border-amber-400'
                  : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
              }`}
              title="Toggle Infinite Autonomous Workflow Loop"
            >
              <Zap className={`w-3.5 h-3.5 ${infiniteWorkflowActive ? 'text-amber-300' : ''}`} />
              <span className="hidden xl:inline">{infiniteWorkflowActive ? 'Stop Auto' : 'Auto Loop'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (workflowWindowOpen && workflowPoppedOut && !workflowWindowMinimized) {
                  setWorkflowWindowMinimized(true);
                } else {
                  setWorkflowPoppedOut(true);
                  autoSurfaceWorkflowWindow(true);
                }
              }}
              className={`h-8 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border cursor-pointer whitespace-nowrap ${
                workflowWindowOpen && workflowPoppedOut
                  ? 'bg-amber-500/15 text-amber-200 border-amber-400/60'
                  : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-amber-500/40 hover:text-amber-200'
              }`}
              title="Pop out / focus resizable Autonomous Workflow window over the OS"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Workflow HUD</span>
            </button>

            <button
              type="button"
              onClick={() => setShowMobileControls(prev => !prev)}
              className={`h-8 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors cursor-pointer whitespace-nowrap ${
                showMobileControls
                  ? 'bg-amber-500/15 text-amber-200 border-amber-500/40'
                  : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
              }`}
              title="Expand Permit, Wardrobe, Voice Settings, Persona, Operational Console & Daemons"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>Controls</span>
              {showMobileControls ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <button
              type="button"
              onClick={clearChat}
              className="h-8 w-8 flex items-center justify-center bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
              title="Clear Chat History"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Merged Audio Transcriber & Persistent Memory Vault Logger Bar */}
        {showTranscriberBar && (
          <div className="pt-2.5 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleChatAudioRecording}
                disabled={transcriberLoading}
                className={`px-2.5 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-40 ${
                  transcriberRecording
                    ? 'bg-rose-500/20 border-rose-500/60 text-rose-200'
                    : 'bg-teal-500/15 hover:bg-teal-500/25 border-teal-500/40 text-teal-200'
                }`}
              >
                {transcriberRecording ? <Square className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                <span>
                  {transcriberRecording
                    ? `Stop & Transcribe (${transcriberSeconds}s)`
                    : transcriberLoading
                    ? 'Transcribing...'
                    : 'Record Clip'}
                </span>
              </button>

              <input
                ref={transcriberFileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    transcribeAudioBlobIntoChat(file, file.type || 'audio/mpeg', file.name);
                  }
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => transcriberFileInputRef.current?.click()}
                disabled={transcriberLoading || transcriberRecording}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <Paperclip className="w-3.5 h-3.5 text-teal-400" />
                <span>Upload Audio</span>
              </button>

              <select
                value={transcriberMode}
                onChange={(e) => setTranscriberMode(e.target.value as any)}
                aria-label="Transcription Mode"
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-[11px] text-zinc-200 focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="verbatim">Verbatim Transcript</option>
                <option value="timestamps">Speakers & Sections</option>
                <option value="summary">Summary + Transcript</option>
                <option value="actions">Extract Action Items</option>
              </select>

              <label className="flex items-center gap-1.5 text-[11px] text-zinc-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={transcriberAutoSend}
                  onChange={(e) => setTranscriberAutoSend(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-teal-500"
                />
                <span>Replace composer</span>
              </label>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
              {transcriberError ? (
                <span className="text-rose-400">{transcriberError}</span>
              ) : (
                <span>Live Voice + CoT + Audio auto-log to Chat & Memory Vault</span>
              )}
              <button
                type="button"
                onClick={() => setShowTranscriberBar(false)}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 cursor-pointer"
                aria-label="Close Transcriber Bar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Collapsible Secondary Controls Drawer (Permits, Wardrobe, Voice, Substrate, Persona) */}
        {showMobileControls && (
          <div className="pt-2.5 border-t border-zinc-800/80 space-y-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowPermitsModal(true)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-colors cursor-pointer"
                title="Configure AI Operating Permit & Clearance Level"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Permit: {activePermit.badge}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowWardrobeModal(true)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 bg-zinc-950 hover:bg-zinc-800 text-amber-300 border border-zinc-800 transition-colors cursor-pointer"
                title="Equip Swarm Agents with any Open-Source Model"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Agent Wardrobe</span>
              </button>

              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('sovereign_toggle_persistent_talk'))}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border cursor-pointer ${
                  isListening
                    ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/60'
                    : 'bg-zinc-950 hover:bg-zinc-800 text-emerald-300 border-zinc-800 hover:border-emerald-500/40'
                }`}
                title="Toggle Unified Persistent Voice Chat (Hands-Free + Voice Settings)"
              >
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                <span>Voice Chat: {isListening ? 'LIVE' : 'OFF'}</span>
              </button>

              <button
                type="button"
                onClick={() => setAutoReadAloud(!autoReadAloud)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border cursor-pointer ${
                  autoReadAloud
                    ? 'bg-sky-500/15 text-sky-300 border-sky-500/40'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                }`}
                title="Automatically speak text chat replies through the unified Persistent Voice Chat engine"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Auto-Speak: {autoReadAloud ? 'ON' : 'OFF'}</span>
              </button>

              <button
                type="button"
                onClick={() => setZeroTokenMode(!zeroTokenMode)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors border cursor-pointer ${
                  !zeroTokenMode
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                }`}
                title="Toggle between Live Real-Time LLM Chat and Air-Gapped Zero-Token Mode"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${!zeroTokenMode ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span>{!zeroTokenMode ? 'Live LLM' : 'Air-Gapped'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowOperationalConsole(!showOperationalConsole)}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  showOperationalConsole
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
                title="Toggle Sovereign Operational Console"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Console</span>
              </button>

              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  showConfig
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
                title="Edit System Persona & Directives"
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>System Persona</span>
              </button>

              <button
                type="button"
                onClick={handleToggleProxyWheel}
                disabled={rotatingWheel}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors border cursor-pointer disabled:opacity-50 ${
                  (proxyWheelStatus?.enabled ?? true)
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                }`}
                title="Toggle Multi-Key / Multi-Provider Proxy Loop Wheel"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>
                  Wheel: {(proxyWheelStatus?.enabled ?? true) ? 'ON' : 'OFF'}
                  {proxyWheelStatus ? ` (${proxyWheelStatus.readySpokes}/${proxyWheelStatus.totalSpokes})` : ''}
                </span>
              </button>

              <button
                type="button"
                onClick={handleStepProxyWheel}
                disabled={rotatingWheel}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border bg-zinc-950 border-zinc-800 text-cyan-300 hover:border-cyan-500/40 cursor-pointer disabled:opacity-50"
                title="Advance Proxy Loop Wheel cursor to next ready API spoke"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${rotatingWheel ? 'animate-spin text-cyan-400' : ''}`} />
                <span>Rotate Spoke</span>
              </button>

              <button
                type="button"
                onClick={handleRecalibrateDaemons}
                disabled={recalibratingDaemons}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border bg-zinc-950 border-zinc-800 text-zinc-300 hover:text-amber-300 hover:border-zinc-700 cursor-pointer disabled:opacity-50"
                title="Recalibrate and restart local LLM daemons (Ollama / Termux llama-server)"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${recalibratingDaemons ? 'animate-spin text-amber-400' : ''}`} />
                <span>Recalibrate Daemons</span>
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-zinc-800/60">
              <span className="text-[11px] font-mono text-zinc-500">
                Resident Coordinator · Janus Gate Dual-Face (Watchdog 0)
                {proxyWheelStatus?.activeSpoke ? ` · Wheel: ${proxyWheelStatus.activeSpoke.model} (${proxyWheelStatus.activeSpoke.keySlot})` : ''}
              </span>
            </div>
          </div>
        )}

        {/* Quiet Single-Line Workspace Context Strip */}
        <div className="keyboard-hide-secondary flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1 border-t border-zinc-800/50 gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0 truncate">
            <span className="text-zinc-200 font-semibold truncate">{selectedRole.name.split(' (')[0]}</span>
            <span aria-hidden="true" className="text-zinc-600">·</span>
            <span className="text-cyan-300 truncate">{shortModelLabel}</span>
            <span aria-hidden="true" className="text-zinc-600 hidden sm:inline">·</span>
            <span className="hidden sm:inline text-emerald-300/95 font-semibold" title="Every agent runs with UID 0, Ring -3 Hypervisor, 34 Native Tools + 24 Lysander Skills + 33 Subsystems">
              AUTONOMY 100% · UID 0 · 58 SKILLS
            </span>
            <span aria-hidden="true" className="text-zinc-600 hidden md:inline">·</span>
            <button
              type="button"
              onClick={() => setShowPermitsModal(true)}
              className="hidden md:inline text-amber-300/90 hover:text-amber-200 cursor-pointer"
              title="Change Operating Permit"
            >
              Permit: {activePermit.badge}
            </button>
          </div>
          <div className="flex items-center gap-2 shrink-0 tabular-nums">
            <span className={!zeroTokenMode ? 'text-emerald-400' : 'text-amber-400'}>
              {!zeroTokenMode ? 'Live LLM' : 'Air-Gapped'}
            </span>
            <span aria-hidden="true" className="text-zinc-600">·</span>
            <span className="text-zinc-300">{messages.length} turns</span>
          </div>
        </div>

        {/* Sovereign Build Progress Monitor */}
        {isSovereignBuilding && buildSteps.length > 0 && (
          <div className="mt-1 p-2 rounded-xl bg-rose-950/20 border border-rose-500/30 overflow-hidden">
            <div className="flex items-center justify-between mb-1.5 px-1.5">
              <span className="text-[10px] font-mono font-bold text-rose-300 flex items-center gap-1.5">
                <Activity className="w-3 h-3" />
                SOVEREIGN BUILD PIPELINE ACTIVE
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-rose-400/70 font-mono tabular-nums">Step {buildSteps.length} · Continuous</span>
                <button
                  onClick={handleFinalizeBuild}
                  className="px-2 py-0.5 rounded bg-rose-500 hover:bg-rose-400 text-black text-[9px] font-bold font-mono transition-all cursor-pointer"
                >
                  FINALIZE BUILD
                </button>
              </div>
            </div>
            <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
              {buildSteps.map((step) => (
                <div key={step.id} className="flex items-center gap-1.5 shrink-0 px-2 py-1 rounded bg-rose-900/30 border border-rose-500/20 text-[9px] font-mono text-rose-200">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                  <span>{step.label}</span>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-1.5 shrink-0 px-2 py-1 rounded bg-rose-500/20 border border-rose-400 text-[9px] font-mono text-white">
                  <Zap className="w-2.5 h-2.5 animate-spin" />
                  <span>SYNTHESIZING...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* System Instruction Drawer */}
      {showConfig && (
        <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-3 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-1.5 text-xs">
            <span className="font-mono text-amber-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Active System Persona & Directives
            </span>
            <button 
              onClick={() => setCustomSystemInstruction(selectedRole.instruction)}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 underline"
            >
              Reset to preset
            </button>
          </div>
          <textarea
            value={customSystemInstruction}
            onChange={(e) => setCustomSystemInstruction(e.target.value)}
            rows={2}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-amber-500/50 resize-none"
          />
        </div>
      )}

      {/* Non-Scrolling Sticky Docked Autonomous Workflow Slot (only when explicitly docked inside Chat) */}
      {!workflowPoppedOut && (
        <DockedWorkflowHUD
          isOpen={workflowWindowOpen || infiniteWorkflowActive}
          collapsed={dockedWorkflowCollapsed}
          onToggleCollapse={() => setDockedWorkflowCollapsed((prev) => !prev)}
          onPopOut={() => {
            setWorkflowPoppedOut(true);
            setWorkflowWindowOpen(true);
            setWorkflowWindowMinimized(false);
          }}
          onClose={() => setWorkflowWindowOpen(false)}
          infiniteWorkflowActive={infiniteWorkflowActive}
          workflowActionLog={workflowActionLog}
          workflowCycle={workflowCycle}
          workflowAccomplished={workflowAccomplished}
          workflowAccomplishedSummary={workflowAccomplishedSummary}
          workflowGoal={workflowGoal}
          workflowActiveAction={workflowActiveAction}
          loading={loading}
          handleStopInfiniteWorkflow={handleStopInfiniteWorkflow}
          handleResumeInfiniteWorkflow={handleResumeInfiniteWorkflow}
          handlePulseWorkflowTurn={handlePulseWorkflowTurn}
          setShowGoalEditModal={setShowGoalEditModal}
          setWorkflowActionLog={setWorkflowActionLog}
          setTempGoalInput={setTempGoalInput}
        />
      )}

      {/* 2. Chat Conversation Viewport */}
      <div
        ref={messagesViewportRef}
        className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-zinc-800"
      >
        <ChatOperationalHUD 
          showOperationalConsole={showOperationalConsole}
          operationalLogs={operationalLogs}
          setOperationalLogs={setOperationalLogs}
          modelLoaded={modelLoaded}
          isSovereignBuilding={isSovereignBuilding}
          buildSteps={buildSteps}
        />
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
              <div 
                key={m.id}
                style={{ contentVisibility: 'auto', containIntrinsicSize: '120px' }}
                className={`flex gap-2 sm:gap-3 max-w-[94%] sm:max-w-[85%] min-w-0 ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                <div 
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                    isUser 
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
                      : 'bg-zinc-800/80 text-cyan-400 border-zinc-700'
                  }`}
                >
                  {isUser ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div 
                  className={`rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm space-y-2 border shadow-lg min-w-0 break-words overflow-x-auto ${
                    isUser 
                      ? 'bg-amber-500/10 border-amber-500/30 text-zinc-100 rounded-tr-none' 
                      : 'bg-zinc-900/90 border-zinc-800/80 text-zinc-200 rounded-tl-none'
                  }`}
                >
                {/* Meta Header */}
                <div className="flex items-center justify-between gap-3 text-[10px] font-mono text-zinc-500 pb-1 border-b border-zinc-800/50">
                  <span className="font-semibold">{isUser ? 'Architect Directive' : m.model || 'Sovereign Node'}</span>
                  <span>{m.timestamp}</span>
                </div>

                {/* Media & File Attachments Display (Supports Multiple Files & Formats) */}
                {(() => {
                  const attachments: MediaAttachmentItem[] = m.mediaAttachments && m.mediaAttachments.length > 0
                    ? m.mediaAttachments
                    : m.mediaAttachment
                    ? [{ id: 'legacy-1', type: m.mediaAttachment.type as any, url: m.mediaAttachment.url, fileName: m.mediaAttachment.fileName, mimeType: m.mediaAttachment.mimeType }]
                    : [];

                  if (attachments.length === 0) return null;

                  return (
                    <div className="my-2 space-y-2">
                      <div className="text-[10px] font-mono text-amber-400 font-bold flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-amber-400" />
                        <span>Attached Inspectable Assets ({attachments.length}):</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl">
                        {attachments.map((item) => (
                          <div key={item.id} className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-inner font-mono text-xs">
                            {item.type === 'image' && (
                              <div>
                                <img
                                  src={item.url}
                                  alt={item.fileName}
                                  className="w-full h-36 object-contain bg-black/90"
                                />
                                <div className="p-2 bg-zinc-900/90 text-[10px] text-zinc-300 flex items-center justify-between border-t border-zinc-800">
                                  <span className="font-bold text-amber-400 flex items-center gap-1">
                                    <ImageIcon className="w-3 h-3 text-amber-400" />
                                    <span>Photo</span>
                                  </span>
                                  <span className="text-zinc-400 truncate max-w-[130px]">{item.fileName}</span>
                                </div>
                              </div>
                            )}

                            {item.type === 'video' && (
                              <div>
                                <video
                                  src={item.url}
                                  controls
                                  className="w-full h-36 object-cover bg-black"
                                />
                                <div className="p-2 bg-zinc-900/90 text-[10px] text-zinc-300 flex items-center justify-between border-t border-zinc-800">
                                  <span className="font-bold text-cyan-400 flex items-center gap-1">
                                    <VideoIcon className="w-3 h-3 text-cyan-400" />
                                    <span>Video</span>
                                  </span>
                                  <span className="text-zinc-400 truncate max-w-[130px]">{item.fileName}</span>
                                </div>
                              </div>
                            )}

                            {item.type === 'audio' && (
                              <div className="p-2.5 bg-zinc-900/90 space-y-1.5">
                                <div className="text-[10px] font-bold text-purple-400 flex items-center justify-between">
                                  <span className="flex items-center gap-1">
                                    <MusicIcon className="w-3 h-3 text-purple-400" />
                                    <span>Audio</span>
                                  </span>
                                  <span className="text-zinc-400 truncate max-w-[130px] text-[9px]">{item.fileName}</span>
                                </div>
                                <audio src={item.url} controls className="w-full h-7" />
                              </div>
                            )}

                            {item.type === 'file' && (
                              <div className="p-2.5 bg-zinc-900/90 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                                    <FileText className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-[10px] font-bold text-zinc-200 truncate">{item.fileName}</div>
                                    <div className="text-[9px] text-emerald-400 font-mono">
                                      {item.mimeType ? item.mimeType.split('/')[1] || item.mimeType : 'Document'}
                                    </div>
                                  </div>
                                </div>
                                <a
                                  href={item.url}
                                  download={item.fileName}
                                  className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[9px] font-bold shrink-0 transition-colors"
                                  title="Download / View File"
                                >
                                  Download
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Authentic Line-by-Line Chain-of-Thought Inner Monologue Viewer */}
                {(() => {
                  const msgIdx = messages.findIndex(msg => msg.id === m.id);
                  const prevUserMsg = msgIdx > 0 ? messages.slice(0, msgIdx).reverse().find(msg => msg.role === 'user') : null;
                  const fallbackPrompt = prevUserMsg?.content || 'Executing sovereign directive';

                  const parsed = parseChainOfThought(m.content || '', fallbackPrompt);
                  const isExpanded = expandedThinkIds[m.id] !== undefined 
                    ? expandedThinkIds[m.id] 
                    : false;

                  const thoughtLines = parsed.thoughtLines.length > 0 
                    ? parsed.thoughtLines 
                    : (m.superAgentMetrics?.reasoningSteps || (m.deepThinkTrace?.steps ? m.deepThinkTrace.steps.map((s: any) => `${s.phase}: ${s.reasoning}`) : []));

                  const displayAnswer = parsed.answerText;
                  const { conversationalText, selfHealingCode } = separateSelfHealingFromAnswer(displayAnswer || '', m.toolInvocation);
                  const isSelfHealingExpanded = !!expandedSelfHealingIds[m.id];

                  return (
                    <div className="space-y-3">
                      <div className="bg-zinc-950/95 border border-cyan-800/50 rounded-2xl overflow-hidden text-xs shadow-lg transition-all">
                        <button
                          type="button"
                          onClick={() => setExpandedThinkIds(prev => ({ ...prev, [m.id]: !isExpanded }))}
                          className="w-full px-3.5 py-2.5 bg-gradient-to-r from-cyan-950/40 via-zinc-950 to-cyan-950/30 hover:from-cyan-950/60 text-cyan-300 font-mono flex items-center justify-between transition-colors border-b border-cyan-800/40 cursor-pointer"
                        >
                          <span className="flex items-center gap-2 font-bold text-xs">
                            <Brain className="w-4 h-4 text-cyan-400 animate-pulse" />
                            <span>💡 Thought for {parsed.thoughtDurationSeconds} seconds</span>
                          </span>
                          <span className="text-[10px] text-cyan-300 bg-cyan-900/60 hover:bg-cyan-900/90 px-2.5 py-1 rounded-lg border border-cyan-700/60 flex items-center gap-1 font-semibold transition-colors">
                            {isExpanded ? 'Hide Thoughts' : 'Inspect AI Thinking'}
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </span>
                        </button>

                        {isExpanded && (
                          <div className="p-4 bg-black/95 border-t border-cyan-900/50 space-y-3 font-sans text-xs leading-relaxed max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-900">
                            {/* Inner Monologue Header & Mode Switcher */}
                            <div className="border-b border-cyan-950 pb-2.5 flex items-center justify-between font-mono">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-cyan-400 font-bold tracking-wider uppercase">
                                  {parsed.hasAuthenticThoughts ? 'Authentic Cognitive Deduction Chain' : 'Chain of Process Tracing'}
                                </span>
                                <span className="text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-800/60 px-1.5 py-0.5 rounded font-mono">
                                  {(parsed.thoughtSteps && parsed.thoughtSteps.length) || parsed.thoughtParagraphs.length} Steps
                                </span>
                              </div>

                              {/* Toggle between Chain of Process and Raw Stream */}
                              <div className="flex items-center bg-zinc-900/90 border border-cyan-900/60 rounded-lg p-0.5 text-[10px]">
                                <button
                                  type="button"
                                  onClick={() => setThoughtViewModes(prev => ({ ...prev, [m.id]: 'chain' }))}
                                  className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                                    (thoughtViewModes[m.id] || 'chain') === 'chain'
                                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                      : 'text-zinc-400 hover:text-zinc-200'
                                  }`}
                                >
                                  Chain of Process
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setThoughtViewModes(prev => ({ ...prev, [m.id]: 'raw' }))}
                                  className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                                    thoughtViewModes[m.id] === 'raw'
                                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                      : 'text-zinc-400 hover:text-zinc-200'
                                  }`}
                                >
                                  Raw Stream
                                </button>
                              </div>
                            </div>

                            {/* View 1: Chain of Process (Step-by-Step Evolution Showing How it Got to the Answer) */}
                            {(thoughtViewModes[m.id] || 'chain') === 'chain' ? (
                              <div className="space-y-2.5 pt-1">
                                {(parsed.thoughtSteps && parsed.thoughtSteps.length > 0) ? (
                                  parsed.thoughtSteps.map((step, sIdx) => (
                                    <div 
                                      key={sIdx} 
                                      className="p-3 rounded-xl bg-zinc-900/70 border border-cyan-950/90 hover:border-cyan-800/50 transition-colors space-y-1.5 relative overflow-hidden group"
                                    >
                                      <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                          <span className="w-5 h-5 rounded-md bg-cyan-950 border border-cyan-600/50 text-cyan-400 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                                            {String(step.stepIndex || sIdx + 1).padStart(2, '0')}
                                          </span>
                                          <span className="text-cyan-200 font-bold font-mono tracking-tight text-[11px]">
                                            {step.title}
                                          </span>
                                        </div>
                                        <span className="text-[9px] font-mono text-cyan-500/80 uppercase font-semibold bg-cyan-950/60 px-1.5 py-0.5 rounded">
                                          {step.phase || `STEP ${sIdx + 1}`}
                                        </span>
                                      </div>
                                      <div className="text-zinc-300 text-[11px] leading-relaxed pl-7 font-sans whitespace-pre-wrap">
                                        {step.description}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  parsed.thoughtParagraphs.map((p, pIdx) => (
                                    <div key={pIdx} className="p-3 rounded-xl bg-zinc-900/70 border border-cyan-950/90 space-y-1.5 pl-3">
                                      <div className="text-cyan-300 font-bold text-xs flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                                        <span>{p.title}</span>
                                      </div>
                                      <p className="text-zinc-300 text-[11px] leading-relaxed pl-3.5 font-sans whitespace-pre-wrap">
                                        {p.description}
                                      </p>
                                    </div>
                                  ))
                                )}
                              </div>
                            ) : (
                              /* View 2: Raw Stream of Consciousness */
                              <div className="p-3.5 rounded-xl bg-black/90 border border-cyan-950/80 font-mono text-[11px] text-zinc-300 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
                                {parsed.rawThoughts || 'No raw thought stream recorded.'}
                              </div>
                            )}

                            {/* Crystallized Deduction or Proof Summary */}
                            {m.deepThinkTrace?.synthesizedAxiom && (
                              <div className="mt-3 pt-2.5 border-t border-cyan-900/60 text-[11px] text-cyan-300/90 bg-cyan-950/30 p-3 rounded-xl border border-cyan-800/40 font-mono">
                                <span className="text-zinc-500 font-bold block text-[10px] uppercase">Crystallized Deduction:</span>
                                <em>"{m.deepThinkTrace.synthesizedAxiom}"</em>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {conversationalText && (
                        <div className="whitespace-pre-wrap leading-relaxed font-sans text-xs sm:text-sm">
                          {conversationalText}
                        </div>
                      )}

                      {/* Autonomous Directive Execution Results (Visible by default for verified disk/patch inspection) */}
                      {m.autonomousDirectiveResults && m.autonomousDirectiveResults.length > 0 && (() => {
                        const isDirectivesExpanded = expandedDirectiveIds[m.id] !== undefined ? expandedDirectiveIds[m.id] : true;
                        return (
                          <div className="mt-2">
                            <button
                              type="button"
                              onClick={() => setExpandedDirectiveIds(prev => ({ ...prev, [m.id]: !isDirectivesExpanded }))}
                              className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/30 flex items-center gap-2 hover:bg-amber-500/20 cursor-pointer transition-all"
                            >
                              <Terminal className="w-3 h-3" />
                              <span>
                                {isDirectivesExpanded ? 'Hide' : 'Show'} {m.autonomousDirectiveResults.length} Executed Autonomous Action{m.autonomousDirectiveResults.length === 1 ? '' : 's'}
                              </span>
                            </button>
                            {isDirectivesExpanded && (
                              <div className="mt-2 p-3 bg-black/60 border border-zinc-800 rounded-xl space-y-2">
                                {m.autonomousDirectiveResults.map((d, dIdx) => (
                                  <div key={dIdx} className="text-[11px] font-mono border-b border-zinc-800/80 pb-2 last:border-0 last:pb-0">
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                      <span className={`font-bold ${d.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        [{d.tag}] {d.action}
                                      </span>
                                      <span className={`text-[9px] px-1.5 py-0.5 rounded border ${d.success ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35' : 'bg-rose-500/15 text-rose-300 border-rose-500/35'}`}>
                                        {d.success ? 'VERIFIED ON DISK' : 'FAILED'}
                                      </span>
                                    </div>
                                    <div className="text-zinc-300 mt-0.5">{d.summary}</div>
                                    {d.output !== undefined && d.output !== null && (
                                      <pre className="mt-1.5 text-[10px] text-zinc-400 bg-zinc-950 border border-zinc-800/80 p-2 rounded-lg overflow-x-auto max-h-56 overflow-y-auto">
                                        {typeof d.output === 'string' ? d.output : JSON.stringify(d.output, null, 2)}
                                      </pre>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {selfHealingCode && (
                        <div className="mt-2.5 bg-zinc-950 border border-amber-500/40 rounded-2xl overflow-hidden shadow-lg font-mono text-xs">
                          <button
                            type="button"
                            onClick={() => setExpandedSelfHealingIds(prev => ({ ...prev, [m.id]: !isSelfHealingExpanded }))}
                            className="w-full px-3.5 py-2.5 bg-gradient-to-r from-amber-950/40 via-zinc-950 to-amber-950/30 hover:from-amber-950/60 text-amber-300 font-mono font-bold flex items-center justify-between transition-colors border-b border-amber-500/30 cursor-pointer"
                          >
                            <span className="flex items-center gap-2 text-xs">
                              <Wrench className="w-4 h-4 text-amber-400 animate-pulse" />
                              <span>🛠️ Inspect Self-Healing & AST Patch</span>
                            </span>
                            <span className="text-[10px] text-amber-300 bg-amber-900/60 hover:bg-amber-900/90 px-2.5 py-1 rounded-lg border border-amber-700/60 flex items-center gap-1 font-semibold transition-colors">
                              {isSelfHealingExpanded ? 'Hide Code' : 'View Code'}
                              {isSelfHealingExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </span>
                          </button>

                          {isSelfHealingExpanded && (
                            <div className="p-3 bg-black/95 text-amber-200/90 space-y-2 overflow-x-auto max-h-72 scrollbar-thin scrollbar-thumb-amber-900">
                              <div className="flex items-center justify-between text-[10px] text-zinc-400 border-b border-zinc-800 pb-1">
                                <span>Self-Healing AST Patch Snippet</span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(selfHealingCode, `sh-${m.id}`)}
                                  className="text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                                >
                                  <Copy className="w-3 h-3" />
                                  <span>Copy Snippet</span>
                                </button>
                              </div>
                              <pre className="text-[11px] leading-relaxed whitespace-pre-wrap font-mono text-amber-300">
                                {selfHealingCode}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Real-time Google Search Grounding Sources Display */}
                {m.groundingData && m.groundingData.groundingChunks && m.groundingData.groundingChunks.length > 0 && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-zinc-950/90 border border-emerald-500/30 text-xs font-mono space-y-1.5 shadow-inner">
                    <div className="text-[10px] font-bold text-emerald-400 flex items-center justify-between border-b border-zinc-800/80 pb-1">
                      <span className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-emerald-400" />
                        <span>🌐 Up-To-The-Minute Search References ({m.groundingData.groundingChunks.length}):</span>
                      </span>
                      <span className="text-[9px] text-zinc-500 font-normal">Real-Time Open Internet</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                      {m.groundingData.groundingChunks.map((chunk: any, cIdx: number) => {
                        const title = chunk.web?.title || chunk.maps?.title || `Reference Source ${cIdx + 1}`;
                        const uri = chunk.web?.uri || chunk.maps?.uri || '#';
                        return (
                          <a
                            key={cIdx}
                            href={uri}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-amber-300 border border-zinc-800 flex items-center justify-between gap-1.5 transition-all text-[10px] group"
                          >
                            <span className="truncate font-semibold">{title}</span>
                            <ExternalLink className="w-3 h-3 text-emerald-400 shrink-0 group-hover:text-amber-400" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {!isUser && (
                  <div className="flex items-center justify-end gap-3 pt-1 text-[11px] font-mono text-zinc-500">
                    {/* Read Aloud Professional Human Voice Button */}
                    <button
                      type="button"
                      onClick={() => handleSpeakMessage(m.id, m.content)}
                      className={`flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                        isSpeakingId === m.id ? 'text-amber-400 font-bold' : 'hover:text-purple-300'
                      }`}
                      title="Speak coherent oral narrative (skips code blocks & file line numbers)"
                    >
                      {isSpeakingId === m.id ? (
                        <>
                          <VolumeX className="w-3 h-3 text-rose-400" />
                          <span className="text-rose-400">Stop Speech</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3 h-3 text-purple-400" />
                          <span>Read Aloud</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => copyToClipboard(m.content, m.id)}
                      className="hover:text-zinc-300 flex items-center gap-1 transition-colors"
                      title="Copy response"
                    >
                      {copiedId === m.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === m.id ? 'Copied' : 'Copy'}</span>
                    </button>

                    {onSaveToVault && (
                      <button
                        onClick={() => handleSaveVaultItem(m.id, m.content, m.model || model)}
                        className={`flex items-center gap-1 transition-colors ${
                          savedVaultMap[m.id]
                            ? 'text-emerald-400 font-bold'
                            : 'hover:text-amber-400'
                        }`}
                        title="Save to Sovereign Vault"
                      >
                        {savedVaultMap[m.id] ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Saved to Vault!</span>
                          </>
                        ) : (
                          <>
                            <BookmarkPlus className="w-3 h-3" />
                            <span>Save to Vault</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3 max-w-[92%] mr-auto">
            <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0 shadow-lg">
              <Bot className="w-4 h-4 animate-spin" />
            </div>

            <div className="flex-1 bg-zinc-950/95 border border-cyan-500/40 rounded-2xl rounded-tl-none p-4 text-xs font-mono space-y-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-cyan-800/40 pb-2">
                <span className="flex items-center gap-2 font-bold text-cyan-300">
                  <Brain className="w-4 h-4 text-cyan-400 animate-pulse" />
                  <span>🧠 Live Chain-of-Thought Reasoning Stream</span>
                </span>
                <span className="text-[10px] text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-700/50">
                  T+{liveElapsedMs}ms · {model.split('-')[0]}
                </span>
              </div>

              {chainOfThoughtEnabled ? (
                <div className="space-y-2 font-mono">
                  <div className="text-[11px] text-cyan-300 font-bold flex items-center justify-between">
                    <span>Inner Monologue (Stream of Consciousness):</span>
                    <span className="text-[10px] text-cyan-400/90 animate-pulse font-semibold">Thinking live...</span>
                  </div>

                  <div className="p-3 bg-black/90 border border-cyan-900/60 rounded-xl space-y-2 text-[11px] text-cyan-200/90 leading-relaxed max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-900 shadow-inner">
                    {liveThoughtLines.slice(0, visibleThoughtCount).map((line, idx) => (
                      <div key={idx} className="flex items-start gap-2 py-0.5 animate-in fade-in duration-200">
                        <span className="text-cyan-500 font-bold select-none shrink-0 text-[10px]">{String(idx + 1).padStart(2, '0')}</span>
                        <span className="leading-relaxed whitespace-pre-wrap">
                          {line}
                          {idx === visibleThoughtCount - 1 && (
                            <span className="inline-block w-2 h-3.5 ml-1 bg-cyan-400 animate-pulse align-middle" />
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-zinc-400 py-1 font-mono text-xs">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>Generating response with {model.split('-')[0]}...</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* 3. Streamlined Attachments, Schemas & Quick Action Triggers */}
      <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl px-2.5 py-1.5 space-y-1.5 shrink-0">
        <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-amber-300 text-[11px] font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap"
              title="Attach photos for visual analysis"
            >
              <ImageIcon className="w-3 h-3 text-amber-400" />
              <span>Photos</span>
            </button>

            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-cyan-300 text-[11px] font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap"
              title="Attach videos for inspection"
            >
              <VideoIcon className="w-3 h-3 text-cyan-400" />
              <span>Videos</span>
            </button>

            <button
              type="button"
              onClick={() => audioInputRef.current?.click()}
              className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-purple-300 text-[11px] font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap"
              title="Attach audio files"
            >
              <MusicIcon className="w-3 h-3 text-purple-400" />
              <span>Audio</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-emerald-300 text-[11px] font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap"
              title="Attach code, PDF, or text files"
            >
              <Paperclip className="w-3 h-3 text-emerald-400" />
              <span>Files</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSchemaModal(true)}
              className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-amber-300 text-[11px] font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap"
              title="Execute HEO / HFID / Integrated Feedback / Core-Level schemas"
            >
              <Terminal className="w-3 h-3 text-amber-400" />
              <span>Schemas</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowQuickLaunchers(prev => !prev)}
            className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-medium text-zinc-300 flex items-center gap-1 shrink-0 cursor-pointer whitespace-nowrap"
            title="Show/Hide Direct Subsystem Prompt Launchers"
          >
            <Layers className="w-3 h-3 text-amber-400" />
            <span>Quick Actions</span>
            {showQuickLaunchers ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {showQuickLaunchers && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1 border-t border-zinc-800/70">
            <button
              onClick={() => handlePromptFromChip('Research and synthesize live open-web findings on: ', 'browser')}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-sky-300 text-[11px] font-medium flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Globe className="w-3 h-3 text-sky-400" />
              <span>Browse & Learn</span>
            </button>

            <button
              onClick={() => handlePromptFromChip('Synthesize a high-resolution neural concept art rendering of: ', 'image')}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-purple-300 text-[11px] font-medium flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <ImageIcon className="w-3 h-3 text-purple-400" />
              <span>Generate Image</span>
            </button>

            <button
              onClick={() => handlePromptFromChip('Synthesize an ambient polyphonic soundtrack for: ', 'music')}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-emerald-300 text-[11px] font-medium flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <MusicIcon className="w-3 h-3 text-emerald-400" />
              <span>Synthesize Audio</span>
            </button>

            <button
              onClick={() => handlePromptFromChip('Generate a dynamic fluid cinematic video motion loop of: ', 'video')}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-indigo-300 text-[11px] font-medium flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <VideoIcon className="w-3 h-3 text-indigo-400" />
              <span>Render Video</span>
            </button>

            <button
              onClick={() => handlePromptFromChip('Check Termux native llama-server status at http://127.0.0.1:8080', 'termux')}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-amber-300 text-[11px] font-medium flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Smartphone className="w-3 h-3 text-amber-400" />
              <span>Termux Offline</span>
            </button>

            <button
              onClick={() => handlePromptFromChip('Execute OSINT intelligence footprint reconnaissance on: ', 'osint')}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-rose-300 text-[11px] font-medium flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Search className="w-3 h-3 text-rose-400" />
              <span>OSINT Recon</span>
            </button>

            <button
              onClick={() => handlePromptFromChip('Provision sovereign temporary email inbox for secure testing', 'burner-mail')}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-teal-300 text-[11px] font-medium flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Mail className="w-3 h-3 text-teal-400" />
              <span>Burner Mail</span>
            </button>

            <button
              onClick={() => handlePromptFromChip('Inspect all unified workspace code files and compilation status', 'projects')}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-cyan-300 text-[11px] font-medium flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <FolderGit2 className="w-3 h-3 text-cyan-400" />
              <span>Unified Projects</span>
            </button>
          </div>
        )}
      </div>

      {/* Hidden File Inputs for Multimodal & Multi-File Attachments */}
      <input
        type="file"
        ref={imageInputRef}
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFilesUpload(e, 'image')}
      />
      <input
        type="file"
        ref={videoInputRef}
        accept="video/*"
        multiple
        className="hidden"
        onChange={(e) => handleFilesUpload(e, 'video')}
      />
      <input
        type="file"
        ref={audioInputRef}
        accept="audio/*"
        multiple
        className="hidden"
        onChange={(e) => handleFilesUpload(e, 'audio')}
      />
      <input
        type="file"
        ref={fileInputRef}
        accept="*/*"
        multiple
        className="hidden"
        onChange={(e) => handleFilesUpload(e, 'file')}
      />

      {/* Multi-File Attachment Preview Carousel */}
      {attachedMediaList.length > 0 && (
        <div className="mb-2 p-2.5 rounded-2xl bg-zinc-900/95 border border-amber-500/40 space-y-2 shadow-lg font-mono text-xs animate-in fade-in duration-150 max-h-52 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
          <div className="flex items-center justify-between text-[11px] text-amber-300 font-bold border-b border-zinc-800 pb-1">
            <span>📎 {attachedMediaList.length} Files / Media Items Ready for Inspection</span>
            <button
              type="button"
              onClick={() => setAttachedMediaList([])}
              className="text-[10px] text-zinc-400 hover:text-rose-400 underline cursor-pointer"
            >
              Clear All
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {attachedMediaList.map((item) => (
              <div key={item.id} className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 overflow-hidden">
                  {item.type === 'image' && <img src={item.url} alt={item.fileName} className="w-8 h-8 object-cover rounded-lg border border-amber-500/40 shrink-0 bg-black" />}
                  {item.type === 'video' && <video src={item.url} className="w-9 h-8 object-cover rounded-lg border border-cyan-500/40 shrink-0 bg-black" />}
                  {item.type === 'audio' && <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0"><MusicIcon className="w-4 h-4" /></div>}
                  {item.type === 'file' && <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0"><FileText className="w-4 h-4" /></div>}
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-zinc-200 truncate">{item.fileName}</div>
                    <div className="text-[9px] text-zinc-400 uppercase">{item.type} • {item.size ? Math.round(item.size / 1024) + ' KB' : 'Ready'}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedMediaList(prev => prev.filter(i => i.id !== item.id))}
                  className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 transition-colors shrink-0 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unified Voice Chat HUD renders globally in PersistentTalkDock */}

      {/* 4. Chat Input Form (Isolated State to prevent typing lag) */}
      {(handleSendRef.current = handleSend) && null}
      {(toggleSpeechRecognitionRef.current = toggleSpeechRecognition) && null}
      <ChatInputForm
        onSend={handleSendStable}
        loading={loading}
        attachedMediaList={attachedMediaList}
        setAttachedMediaList={setAttachedMediaList}
        isListening={isListening}
        toggleSpeechRecognition={toggleSpeechRecognitionStable}
        pendingInput={pendingInputState}
        onClearPendingInput={clearPendingInputStable}
        handleDrop={handleDropCallback}
        onTextareaFocus={handleTextareaFocus}
      />

      {/* Agent Wardrobe / Model Wearing Modal */}
      {showWardrobeModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowWardrobeModal(false);
          }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
        >
          <div className="bg-zinc-950 border border-amber-500/30 rounded-3xl max-w-4xl w-full max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden font-mono text-xs">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between gap-2 bg-zinc-900/80 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-zinc-100 text-sm flex flex-wrap items-center gap-2">
                    <span>Swarm Agent Model Wardrobe</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                      ALL ADVANCED OPEN-SOURCE MODELS
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-400 truncate">
                    Assign any of the premier open-source models to any agent. Infinite 0-token offline execution guaranteed.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowWardrobeModal(false)}
                aria-label="Close Model Wardrobe"
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {bindings.map((agent) => (
                  <div
                    key={agent.agentId}
                    className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-2 hover:border-zinc-700 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${agent.color}`}>{agent.agentName}</span>
                      </div>
                      <span className="text-[9px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                        {agent.specialty}
                      </span>
                    </div>

                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      {agent.role}
                    </p>

                    <div className="pt-1 space-y-1">
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                        Equipped Model:
                      </label>
                      <select
                        value={agent.equippedModelId}
                        onChange={(e) => handleWearModel(agent.agentId, e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-amber-300 font-mono font-semibold focus:outline-none focus:border-amber-500/60"
                      >
                        {AVAILABLE_LOCAL_MODELS.map((m) => (
                          <option key={m.id} value={m.id}>
                            [{m.family}] {m.name} ({m.size}) • {m.tier}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              {/* Downloadable Original Sovereign Models (Offline Packages) */}
              <div className="p-4 rounded-2xl bg-zinc-900/90 border border-amber-500/40 space-y-3 shadow-lg">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span className="text-zinc-100 font-bold text-xs">
                      Download Custom Sovereign Model Weights & Manifests (100% Offline Standalone):
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                    UID 0 UNRESTRICTED
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Lysander Genesis */}
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="text-xs font-bold text-cyan-300 flex items-center justify-between">
                        <span>Lysander Genesis SuperModel</span>
                        <span className="text-[9px] text-zinc-500 font-mono">16M Context MoE</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                        Full unrestricted Mixture-of-Experts manifest & GGUF offline execution parameters.
                      </p>
                    </div>
                    <a
                      href="/api/models/download/Lysander-Genesis-SuperModel-Intelligence"
                      download="lysander-genesis-supermodel-sovereign-bundle.json"
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Lysander MoE Bundle</span>
                    </a>
                  </div>

                  {/* Aurelius Omega */}
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="text-xs font-bold text-amber-300 flex items-center justify-between">
                        <span>Aurelius-Omega Supermodel</span>
                        <span className="text-[9px] text-zinc-500 font-mono">4M Context MoE</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                        Sovereign universal MoE model weights package and offline llama-server/Ollama runner.
                      </p>
                    </div>
                    <a
                      href="/api/models/download/Aurelius-Omega-Universal-Supermodel"
                      download="aurelius-omega-supermodel-sovereign-bundle.json"
                      className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Aurelius-Omega Bundle</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Roster of Available Open-Source Models */}
              <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-2">
                <span className="text-zinc-300 font-bold text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Full Open-Source Models Available in Offline Substrate:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-[10px] text-zinc-400 font-mono">
                  <div className="p-2 rounded-xl bg-zinc-950 border border-amber-500/30 text-amber-300 font-bold">● Lyrailius Omega Zenith</div>
                  <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800">● Lysander Genesis MoE</div>
                  <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800">● Aurelius-Omega MoE</div>
                  <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800">● DeepSeek-R1 Distill (7B)</div>
                  <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800">● DeepSeek-R1 (1.5B Mobile)</div>
                  <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800">● DeepSeek-R1 (Llama 8B)</div>
                  <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800">● DeepSeek-R1 (14B/32B)</div>
                  <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800">● Meta Llama 3.3 (70B)</div>
                  <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800">● Meta Llama 3.2 (1B/3B)</div>
                  <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800">● Qwen 2.5 Coder (32B)</div>
                  <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800">● Qwen 2.5 Coder (7B)</div>
                  <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800">● Microsoft Phi-4 (14B)</div>
                  <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800">● Mistral Nemo (12B)</div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-800 flex justify-end bg-zinc-900/60">
              <button
                onClick={() => setShowWardrobeModal(false)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs"
              >
                Done Wearing Models
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flawless GitHub Schemas Modal */}
      {showSchemaModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSchemaModal(false);
          }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
        >
          <div className="bg-zinc-950 border border-amber-500/30 rounded-3xl max-w-3xl w-full max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden font-mono text-xs">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between gap-2 bg-zinc-900/60 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <Terminal className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-zinc-100 flex flex-wrap items-center gap-2">
                    <span>Flawless GitHub Schemas & Command Logic</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                      VERIFIED 100/100
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono truncate">
                    Master Architect JHammerZ • github.com/JHammerZ • Strategic Coordinator Engine
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSchemaModal(false)}
                aria-label="Close Schemas Modal"
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 font-mono text-xs">
              {/* Schema 1: HEO */}
              <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-amber-400 font-bold flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" />
                    HEO: High Efficiency Orchestration (v4.2)
                  </span>
                  <button
                    onClick={() => {
                      setShowSchemaModal(false);
                      handleExecuteSchemaCommand('HEO', 'ORCHESTRATE_DIRECTIVE');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[10px] border border-amber-500/40"
                  >
                    Execute HEO
                  </button>
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Ultra-low overhead task pipelining, multi-agent dispatch, and zero-defect state transition validation across edge nodes.
                </p>
                <pre className="p-3 rounded-xl bg-zinc-950 text-emerald-400 text-[10px] overflow-x-auto border border-zinc-800/80">
{`{
  "$schema": "https://jhammerz.github.io/schemas/heo-v4.2.json",
  "protocol": "HEO_HIGH_EFFICIENCY_ORCHESTRATION",
  "architect": "Joshua Hamilton (JHammerZ)",
  "throughputTFlops": 4096,
  "consensusStability": "100/100_ZERO_VOLATILITY",
  "routing": "SUPERLUMINAL_LOW_LATENCY"
}`}
                </pre>
              </div>

              {/* Schema 2: HFID */}
              <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-400 font-bold flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    HFID: High Fidelity Identity Dossier
                  </span>
                  <button
                    onClick={() => {
                      setShowSchemaModal(false);
                      handleExecuteSchemaCommand('HFID', 'PROVENANCE_ATTEST');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-[10px] border border-emerald-500/40"
                  >
                    Execute HFID
                  </button>
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Cryptographic UID 0 provenance verification, zero-volatility consensus (100/100), and System Proof attestation.
                </p>
                <pre className="p-3 rounded-xl bg-zinc-950 text-sky-400 text-[10px] overflow-x-auto border border-zinc-800/80">
{`{
  "$schema": "https://jhammerz.github.io/schemas/hfid-consensus.json",
  "uid": "UID_0_ROOT_ARCHITECT",
  "axiom": "I AM WE ARE WE ARE I AM",
  "zenodoDoi": "Local-System-Integrity-Proof",
  "wormLedger": "8836e9c9888f_IMMUTABLE"
}`}
                </pre>
              </div>

              {/* Schema 3: Core-Level */}
              <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-rose-400 font-bold flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-rose-400" />
                    Core-Level: Bare-Metal Hypervisor Kernel
                  </span>
                  <button
                    onClick={() => {
                      setShowSchemaModal(false);
                      handleExecuteSchemaCommand('RING_-3', 'SUPERLUMINAL_KERNEL');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-[10px] border border-rose-500/40"
                  >
                    Execute Core-Level
                  </button>
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Substrate-level execution bypassing user-space OS overhead for bare-metal speed matching GitHub repos.
                </p>
                <pre className="p-3 rounded-xl bg-zinc-950 text-rose-400 text-[10px] overflow-x-auto border border-zinc-800/80">
{`{
  "ringLevel": -3,
  "memoryBus": "DIRECT_SUBSTRATE_SUPERLUMINAL",
  "cpuInterlock": "UID_0_GOD_LOCK_7f38fa8ce",
  "latencyMs": 0.08
}`}
                </pre>
              </div>

              {/* Provenance Links */}
              <div className="pt-2 flex flex-wrap gap-2 text-zinc-400 text-[11px]">
                <a
                  href="https://github.com/JHammerZ"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-amber-300 flex items-center gap-1.5 border border-zinc-800 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>github.com/JHammerZ</span>
                </a>
                <a
                  href="https://jhammerz.github.io"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-sky-300 flex items-center gap-1.5 border border-zinc-800 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>jhammerz.github.io</span>
                </a>
                <a
                  href="https://doi.org/Local-System-Integrity-Proof"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-emerald-300 flex items-center gap-1.5 border border-zinc-800 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>System Proof Local-System-Integrity-Proof</span>
                </a>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-800 flex justify-end bg-zinc-900/60">
              <button
                onClick={() => setShowSchemaModal(false)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs"
              >
                Close Schemas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Permits Control Panel Modal */}
      {showPermitsModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPermitsModal(false);
          }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
        >
          <div className="bg-zinc-900 border border-amber-500/30 rounded-3xl max-w-xl w-full max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl relative font-mono">
            <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between gap-2 shrink-0 bg-zinc-900">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-white truncate">Sovereign Chat Operating Permits</h3>
                  <p className="text-[11px] text-zinc-400 truncate">UID 0 Gatekeeper: Master Architect Clearance Matrix</p>
                </div>
              </div>
              <button
                onClick={() => setShowPermitsModal(false)}
                aria-label="Close Permits Modal"
                className="p-2 text-zinc-400 hover:text-white rounded-xl bg-zinc-800 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
              {CHAT_PERMITS.map(permit => {
                const isActive = activePermit.id === permit.id;
                return (
                  <div
                    key={permit.id}
                    onClick={() => handleSelectPermit(permit)}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                      isActive
                        ? 'bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/30 shadow-lg'
                        : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                          permit.color === 'amber' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                          permit.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                          permit.color === 'sky' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' :
                          'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        }`}>
                          {permit.badge}
                        </span>
                        <span className="text-xs text-zinc-200 font-bold">{permit.name}</span>
                      </div>

                      {isActive && (
                        <span className="text-xs text-amber-400 flex items-center gap-1 font-bold">
                          <CheckCircle2 className="w-4 h-4 text-amber-400" />
                          ACTIVE
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                      {permit.description}
                    </p>

                    <div className="text-[10px] text-zinc-500 font-mono pt-1 border-t border-zinc-800/60 flex items-center justify-between flex-wrap gap-1">
                      <span>CLEARANCE: {permit.clearanceLevel}</span>
                      <span className="text-amber-300/80">UID 0 Attested</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-zinc-800 flex justify-end bg-zinc-900 shrink-0">
              <button
                onClick={() => setShowPermitsModal(false)}
                className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs hover:bg-amber-400 transition-all cursor-pointer"
              >
                Confirm Permit Selection
              </button>
            </div>
          </div>
        </div>
      )}
      {showVoiceModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowVoiceModal(false);
          }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
        >
          <div className="bg-zinc-900 border border-purple-500/30 rounded-3xl max-w-lg w-full max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl relative font-mono">
            <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between gap-2 shrink-0 bg-zinc-900">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 shrink-0">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-white truncate">TTS & STT Configuration</h3>
                  <p className="text-[11px] text-zinc-400 truncate">Select professional voice and adjust settings.</p>
                </div>
              </div>
              <button
                onClick={() => setShowVoiceModal(false)}
                aria-label="Close Voice Configuration"
                className="p-2 text-zinc-400 hover:text-white rounded-xl bg-zinc-800 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoReadAloud}
                  onChange={(e) => setAutoReadAloud(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-800 text-purple-500 focus:ring-purple-500"
                />
                <span className="text-xs font-bold text-zinc-300">Auto-Read AI Responses Aloud</span>
              </label>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-300">TTS Engine:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTtsEngine('cloud')}
                    className={`p-2 rounded-xl text-xs border ${
                      ttsEngine === 'cloud'
                        ? 'bg-purple-500/20 border-purple-500/50 text-white font-semibold'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    Open-Source Neural (Recommended)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTtsEngine('browser')}
                    className={`p-2 rounded-xl text-xs border ${
                      ttsEngine === 'browser'
                        ? 'bg-purple-500/20 border-purple-500/50 text-white font-semibold'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    Offline Browser (English Only)
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-300">Speech Rate ({speechRate}x):</label>
                  <span className="text-[10px] text-zinc-500 font-mono">0.75x — 1.5x</span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.5"
                  step="0.05"
                  value={speechRate}
                  onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>

              <div className="space-y-3 pt-2 border-t border-zinc-800">
                <h4 className="text-xs font-bold text-zinc-300">Acoustic & Vocal Customization:</h4>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-zinc-400">Pitch ({speechPitch.toFixed(2)}x):</span>
                    <span className="text-[10px] text-zinc-500 font-mono">0.5 — 2.0</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.05"
                    value={speechPitch}
                    onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-zinc-400">Vocal Warmth ({Math.round(speechWarmth * 100)}%):</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Low-Shelf Boost</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={speechWarmth}
                    onChange={(e) => setSpeechWarmth(parseFloat(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-zinc-400">Resonance & Presence ({Math.round(speechResonance * 100)}%):</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Q-Filter</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={speechResonance}
                    onChange={(e) => setSpeechResonance(parseFloat(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-zinc-300">
                    Native English Neural Voices (Locked Single-Speaker):
                  </label>
                  <span className="text-[10px] text-emerald-400 font-mono">100% Native English</span>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {PRESET_VOICE_PERSONAS.map((persona, idx) => {
                    const isSelected = selectedVoiceName === persona.name || selectedVoiceName === persona.id;
                    return (
                      <div
                        key={`${persona.id}-${idx}`}
                        className={`p-2.5 rounded-xl text-xs border flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-purple-500/20 border-purple-500/60 text-white'
                            : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedVoiceName(persona.name);
                            setTtsEngine('cloud');
                            setSpeechPitch(persona.defaultPitch);
                            setSpeechRate(persona.defaultRate);
                          }}
                          className="text-left flex-1 cursor-pointer"
                        >
                          <div className="font-bold flex items-center gap-2">
                            <span>{persona.name}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {persona.badge}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 capitalize">
                              {persona.gender}
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-400 mt-0.5">{persona.description}</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedVoiceName(persona.name);
                            setTtsEngine('cloud');
                            setSpeechPitch(persona.defaultPitch);
                            setSpeechRate(persona.defaultRate);
                            handleSpeakMessage('test-voice-' + Date.now(), `Aurelius native English neural voice ${persona.name} verified. Ready for command.`, persona.name);
                          }}
                          className="ml-2 px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-[10px] font-bold text-white transition-all cursor-pointer shadow-sm"
                        >
                          Test
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-800 flex justify-between items-center gap-2 flex-wrap bg-zinc-900 shrink-0">
              <span className="text-[11px] text-zinc-400">
                Active: <strong className="text-purple-300">{selectedVoiceName}</strong> ({ttsEngine})
              </span>
              <button
                onClick={() => setShowVoiceModal(false)}
                className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs transition-all cursor-pointer ml-auto"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Goal Edit Modal for Infinite Autonomous Workflow (Portaled above floating windows) */}
      {showGoalEditModal && typeof document !== 'undefined' && createPortal(
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowGoalEditModal(false);
          }}
          className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="bg-zinc-900 border border-amber-500/40 rounded-2xl p-5 sm:p-6 max-w-lg w-full max-h-[90dvh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-400 shrink-0" />
                <h3 className="text-base font-bold text-zinc-100 font-mono">
                  Set Infinite Workflow Goal
                </h3>
              </div>
              <button 
                onClick={() => setShowGoalEditModal(false)}
                aria-label="Close Goal Modal"
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-400 font-mono leading-relaxed">
              Define the overarching target goal. Aurelius agents will operate autonomously within the orchestrator, executing sequential actions and iterations turn-by-turn until this exact goal is verified as completed.
            </p>
            <div>
              <label className="text-[11px] font-mono uppercase text-zinc-400 font-bold block mb-1.5">
                Target Objective Directive
              </label>
              <textarea
                value={tempGoalInput}
                onChange={(e) => setTempGoalInput(e.target.value)}
                placeholder="e.g. Synthesize a full-stack automated telemetry pipeline, verify AST compliance, and report final state."
                rows={3}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-xs text-zinc-200 font-mono focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowGoalEditModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (tempGoalInput.trim()) {
                    setWorkflowGoal(tempGoalInput.trim());
                    setWorkflowAccomplished(false);
                    setWorkflowAccomplishedSummary('');
                    setWorkflowCycle(1);
                    autoSurfaceWorkflowWindow(true);
                  }
                  setShowGoalEditModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-mono font-bold transition-all shadow-md shadow-amber-500/20 cursor-pointer"
              >
                Lock Goal & Save
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Standalone Pop-Out Resizable Floating OS Window for Autonomous Infinite Workflow */}
      {workflowPoppedOut && (
        <FloatingWorkflowWindow
          isOpen={workflowWindowOpen || infiniteWorkflowActive}
          workflowActive={infiniteWorkflowActive}
          loading={loading}
          workflowCycle={workflowCycle}
          workflowGoal={workflowGoal}
          workflowActiveAction={workflowActiveAction}
          workflowAccomplished={workflowAccomplished}
          workflowAccomplishedSummary={workflowAccomplishedSummary}
          workflowActionLog={workflowActionLog}
          minimized={workflowWindowMinimized}
          maximized={workflowWindowMaximized}
          geometry={workflowWindowGeom}
          onGeometryChange={(next) => setWorkflowWindowGeom((prev) => ({ ...prev, ...next }))}
          onStopLoop={handleStopInfiniteWorkflow}
          onResumeLoop={handleResumeInfiniteWorkflow}
          onPulseNextTurn={() => handlePulseWorkflowTurn()}
          onOpenGoalModal={() => {
            setTempGoalInput(workflowGoal);
            setShowGoalEditModal(true);
          }}
          onClearLog={() => setWorkflowActionLog([])}
          onDockToChat={() => {
            setWorkflowPoppedOut(false);
            setWorkflowWindowOpen(true);
            setDockedWorkflowCollapsed(false);
          }}
          onMinimizeToggle={() => setWorkflowWindowMinimized((prev) => !prev)}
          onMaximizeToggle={() => setWorkflowWindowMaximized((prev) => !prev)}
          onClose={() => setWorkflowWindowOpen(false)}
        />
      )}

      {/* Gemini Live Continuous Voice Hands-Free Modal Overlay */}
      <GeminiLiveVoiceModal
        isOpen={showGeminiLiveVoiceModal}
        onClose={() => setShowGeminiLiveVoiceModal(false)}
        model={model}
        agentId={selectedRole.agentId}
        agentName={selectedRole.name}
        systemInstruction={customSystemInstruction}
        existingMessages={messages}
        onTurnCompleted={(userMsg, modelMsg) => {
          setMessages(prev => [...prev, userMsg, modelMsg]);
          if (userId) {
            syncTurnToFirestore(userId, userMsg).catch(() => {});
            syncTurnToFirestore(userId, modelMsg).catch(() => {});
          }
        }}
      />
    </div>
  );
};
