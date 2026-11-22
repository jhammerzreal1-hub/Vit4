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

import React, { useState, useEffect, useCallback } from 'react';
import {
  Wrench,
  Sparkles,
  Play,
  ShieldAlert,
  Cpu,
  Layers,
  Terminal,
  Compass,
  Zap,
  RefreshCw,
  Code2,
  GitBranch,
  RotateCcw,
  CheckCircle2,
  FileCode,
  Image as ImageIcon,
  Palette,
  BookOpen,
  Search,
  Copy,
  Check,
  ArrowUpRight,
  Sliders,
  Hammer
} from 'lucide-react';
import type { ModuleType } from '../types';
import {
  BASELINE_ORCHESTRATOR_ASSETS,
  ORCHESTRATOR_FACETS_INDEX,
  SOVEREIGN_BACKEND_TOOLS_MANIFEST,
  UI_MASTER_KIT_BLUEPRINTS,
  type BaselineAssetDescriptor,
  type OrchestratorFacetDescriptor,
  type UiMasterBlueprint
} from '../data/orchestratorMasterKnowledge';
import heroNeuralMatrixImg from '../assets/images/hero_neural_matrix_1791569635501.jpg';
import sovereignCockpitImg from '../assets/images/sovereign_cockpit_hud_1791569644848.jpg';
import aegisArenaImg from '../assets/images/aegis_skylane_arena_1794941663165.jpg';
import acousticStudioImg from '../assets/images/acoustic_harmonic_studio_1794941673227.jpg';
import creativeAudioImg from '../assets/images/studio_creative_audio_1791569654655.jpg';
import visualCanvasImg from '../assets/images/visual_studio_canvas_1791569663435.jpg';
import jhammerzStageImg from '../assets/images/jhammerz_on_stage_1792947926393.jpg';

const ASSET_IMAGE_MAP: Record<string, string> = {
  'asset-hero-neural-matrix': heroNeuralMatrixImg,
  'asset-sovereign-cockpit-hud': sovereignCockpitImg,
  'asset-aegis-skylane-arena': aegisArenaImg,
  'asset-acoustic-harmonic-studio': acousticStudioImg,
  'asset-studio-creative-audio': creativeAudioImg,
  'asset-visual-studio-canvas': visualCanvasImg,
  'asset-jhammerz-on-stage': jhammerzStageImg
};

interface DevKitTelemetry {
  activeEngine: string;
  forgedToolsCount: number;
  activeQuestsCount: number;
  agentActorsCount: number;
  uiMutationsCount?: number;
  baselineAssetsCount?: number;
  orchestratorFacetsCount?: number;
  logs: string[];
}

interface LogicPatchRecord {
  patchId: string;
  title: string;
  subsystem: 'combat' | 'quest' | 'economy' | 'ai_behavior' | 'world_event';
  logicCode: string;
  author: string;
  proofHash: string;
  createdAt: string;
  active: boolean;
}

interface ComponentInspectionResult {
  componentPath: string;
  lineCount: number;
  byteLength: number;
  imports: string[];
  hooksUsed: string[];
  metrics: {
    buttonCount: number;
    imgCount: number;
    hasTabularNums: boolean;
    hasAnimatePulse: boolean;
  };
  content: string;
}

interface UiMutationRecord {
  id: string;
  componentPath: string;
  operation: string;
  summary: string;
  verifiedCompile: boolean;
  diff?: string;
  authorAgent: string;
  createdAt: string;
}

type MasterKitTab = 'ui-architect' | 'assets-knowledge' | 'mmo-engine' | 'compiler-heal';

export interface AgentDevKitModuleProps {
  onSelectModule?: (module: ModuleType) => void;
  onInjectIntoChat?: (content: string, immediate?: boolean) => void;
}

export const AgentDevKitModule: React.FC<AgentDevKitModuleProps> = ({ onSelectModule }) => {
  const [activeTab, setActiveTab] = useState<MasterKitTab>('ui-architect');

  // Telemetry & Logs
  const [telemetry, setTelemetry] = useState<DevKitTelemetry>({
    activeEngine: 'mmorpg_world',
    forgedToolsCount: 14,
    activeQuestsCount: 8,
    agentActorsCount: 24,
    uiMutationsCount: 0,
    baselineAssetsCount: BASELINE_ORCHESTRATOR_ASSETS.length,
    orchestratorFacetsCount: ORCHESTRATOR_FACETS_INDEX.length,
    logs: [
      'Autonomous UI Dev Master Kit & MMO Engine Suite initialized.',
      'Full Codebase Knowledge & Baseline Assets Manifest loaded into agent memory.'
    ]
  });

  // UI Architect & Component Inspector State
  const [componentFiles, setComponentFiles] = useState<string[]>([
    'src/components/Header.tsx',
    'src/components/Navigation.tsx',
    'src/components/ChatModule.tsx',
    'src/components/AgentDevKitModule.tsx',
    'src/components/WorldLoadStartScreen.tsx',
    'src/components/UniversalEmulatorModderModule.tsx',
    'src/components/three/SpatialArenaModule.tsx',
    'src/components/AutonomySupervisorModule.tsx',
    'src/components/WarRoomModule.tsx',
    'src/components/ToolShedModule.tsx'
  ]);
  const [selectedComponentPath, setSelectedComponentPath] = useState<string>('src/components/Header.tsx');
  const [inspection, setInspection] = useState<ComponentInspectionResult | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);

  // Patching & Synthesis State
  const [patchMode, setPatchMode] = useState<'ai' | 'surgical'>('ai');
  const [aiUiInstruction, setAiUiInstruction] = useState('');
  const [selectedEmbedAssetId, setSelectedEmbedAssetId] = useState<string>('');
  const [targetCodeBlock, setTargetCodeBlock] = useState('');
  const [replacementCodeBlock, setReplacementCodeBlock] = useState('');
  const [isPatchingUi, setIsPatchingUi] = useState(false);
  const [lastPatchDiff, setLastPatchDiff] = useState<string>('');
  const [mutationHistory, setMutationHistory] = useState<UiMutationRecord[]>([]);

  // Live Global DOM Theme & Style Overrides
  const [surfaceContrast, setSurfaceContrast] = useState<number>(100);
  const [accentHue, setAccentHue] = useState<string>('#06b6d4');
  const [borderCrispness, setBorderCrispness] = useState<number>(100);
  const [customCssRules, setCustomCssRules] = useState<string>('');

  // Knowledge & Asset Explorer State
  const [knowledgeSearch, setKnowledgeSearch] = useState('');
  const [assetCategoryFilter, setAssetCategoryFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string>('');

  // MMO Engine & Logic Patch State
  const [promptInput, setPromptInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('world_event');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [logicPatches, setLogicPatches] = useState<LogicPatchRecord[]>([]);
  const [patchTitle, setPatchTitle] = useState('');
  const [patchSubsystem, setPatchSubsystem] = useState<'combat' | 'quest' | 'economy' | 'ai_behavior' | 'world_event'>('combat');
  const [patchPrompt, setPatchPrompt] = useState('');
  const [patchCode, setPatchCode] = useState('');
  const [isPatchingLogic, setIsPatchingLogic] = useState(false);

  // Compiler & Self-Healing State
  const [isRepairing, setIsRepairing] = useState(false);
  const [compilerReport, setCompilerReport] = useState<{
    compilerClean: boolean;
    lintSummary: string;
    lintOutput?: any;
  } | null>(null);

  // Universal 3-Scope Target System & Atomic Patch Ledger State
  const [targetSystemInput, setTargetSystemInput] = useState<string>('self');
  const [activeTargetRoot, setActiveTargetRoot] = useState<string>('');
  const [orchestratorRoot, setOrchestratorRoot] = useState<string>('');
  const [targetScopeLabel, setTargetScopeLabel] = useState<string>('orchestrator');
  const [atomicLedgerEntries, setAtomicLedgerEntries] = useState<any[]>([]);
  const [isPointingTarget, setIsPointingTarget] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);

  const appendLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString();
    setTelemetry((prev) => ({
      ...prev,
      logs: [`[${time}] ${msg}`, ...prev.logs.slice(0, 49)]
    }));
  }, []);

  const fetchTargetSystemStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/target-system/status');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setOrchestratorRoot(data.orchestratorRoot || '');
          setActiveTargetRoot(data.targetSystem?.rootPath || data.orchestratorRoot || '');
          setTargetScopeLabel(data.targetSystem?.scope || 'orchestrator');
          setTargetSystemInput(data.targetSystem?.rootPath || 'self');
          if (Array.isArray(data.recentPatches)) {
            setAtomicLedgerEntries(data.recentPatches);
          }
        }
      }
    } catch {
      // Non-fatal
    }
  }, []);

  const handlePointTargetSystem = async (overridePath?: string) => {
    const pathToSet = (overridePath !== undefined ? overridePath : targetSystemInput).trim() || 'self';
    setIsPointingTarget(true);
    try {
      const res = await fetch('/api/target-system/point', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPath: pathToSet, createIfMissing: true })
      });
      const data = await res.json();
      if (data.success) {
        appendLog(`Pointed Target System: ${data.summary}`);
        await fetchTargetSystemStatus();
      } else {
        appendLog(`Target System Error: ${data.summary || data.error}`);
      }
    } catch (err: any) {
      appendLog(`Target System Network Error: ${err.message}`);
    } finally {
      setIsPointingTarget(false);
    }
  };

  const handleRollbackLatestAtomicPatch = async (patchId?: string) => {
    setIsRollingBack(true);
    try {
      const res = await fetch('/api/target-system/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchId ? { patchId } : {})
      });
      const data = await res.json();
      if (data.success) {
        appendLog(`Atomic Patch Rolled Back: ${data.summary}`);
        await fetchTargetSystemStatus();
        await inspectComponent(selectedComponentPath);
      } else {
        appendLog(`Rollback Notice: ${data.summary || data.error}`);
      }
    } catch (err: any) {
      appendLog(`Rollback Error: ${err.message}`);
    } finally {
      setIsRollingBack(false);
    }
  };

  const fetchMasterKnowledgeAndStatus = useCallback(async () => {
    try {
      fetchTargetSystemStatus();
      const [statusRes, patchesRes, knowledgeRes] = await Promise.all([
        fetch('/api/dev-kit/status'),
        fetch('/api/dev-kit/patches'),
        fetch('/api/ui-master-kit/knowledge')
      ]);

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.success) {
          setTelemetry((prev) => ({
            ...prev,
            activeEngine: statusData.activeEngine || prev.activeEngine,
            forgedToolsCount: statusData.forgedToolsCount ?? prev.forgedToolsCount,
            activeQuestsCount: statusData.activeQuestsCount ?? prev.activeQuestsCount,
            agentActorsCount: statusData.agentActorsCount ?? prev.agentActorsCount,
            uiMutationsCount: statusData.uiMutationsCount ?? prev.uiMutationsCount,
            logs: statusData.logs?.length ? statusData.logs : prev.logs
          }));
        }
      }

      if (patchesRes.ok) {
        const patchesData = await patchesRes.json();
        if (patchesData.success && Array.isArray(patchesData.patches)) {
          setLogicPatches(patchesData.patches);
        }
      }

      if (knowledgeRes.ok) {
        const kData = await knowledgeRes.json();
        if (kData.success) {
          if (Array.isArray(kData.componentFiles) && kData.componentFiles.length > 0) {
            const tsxFiles = kData.componentFiles
              .filter((f: any) => typeof f.name === 'string' && f.name.endsWith('.tsx'))
              .map((f: any) => `src/components/${f.name}`);
            if (tsxFiles.length > 0) {
              setComponentFiles(Array.from(new Set([...tsxFiles, 'src/components/three/SpatialArenaModule.tsx'])));
            }
          }
          if (Array.isArray(kData.mutationHistory)) {
            setMutationHistory(kData.mutationHistory);
          }
          if (kData.styleOverrides) {
            setSurfaceContrast(kData.styleOverrides.surfaceContrast ?? 100);
            setAccentHue(kData.styleOverrides.accentHue ?? '#06b6d4');
            setBorderCrispness(kData.styleOverrides.borderCrispness ?? 100);
            setCustomCssRules(kData.styleOverrides.customCssRules ?? '');
          }
        }
      }
    } catch {
      // Non-fatal initial fetch
    }
  }, []);

  const inspectComponent = useCallback(async (filePath: string) => {
    setIsInspecting(true);
    try {
      const res = await fetch('/api/ui-master-kit/inspect-component', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ componentPath: filePath })
      });
      const data = await res.json();
      if (data.success) {
        setInspection(data);
        appendLog(`Inspected ${filePath} (${data.lineCount} lines, ${data.hooksUsed?.length || 0} React hooks).`);
      } else {
        appendLog(`Inspect error on ${filePath}: ${data.error}`);
      }
    } catch (err: any) {
      appendLog(`Network error inspecting ${filePath}: ${err.message}`);
    } finally {
      setIsInspecting(false);
    }
  }, [appendLog]);

  useEffect(() => {
    fetchMasterKnowledgeAndStatus();
    inspectComponent('src/components/Header.tsx');
  }, [fetchMasterKnowledgeAndStatus, inspectComponent]);

  const handleSelectComponent = (filePath: string) => {
    setSelectedComponentPath(filePath);
    inspectComponent(filePath);
  };

  const handleExecuteUiPatch = async () => {
    if (patchMode === 'ai' && !aiUiInstruction.trim()) return;
    if (patchMode === 'surgical' && (!targetCodeBlock.trim() || !replacementCodeBlock.trim())) return;

    setIsPatchingUi(true);
    appendLog(`Executing compile-verified UI patch on ${selectedComponentPath}...`);
    try {
      const payload =
        patchMode === 'ai'
          ? {
              componentPath: selectedComponentPath,
              aiInstruction: aiUiInstruction,
              embedAssetId: selectedEmbedAssetId || undefined,
              verifyCompile: true,
              authorAgent: 'ui-master-kit-operator'
            }
          : {
              componentPath: selectedComponentPath,
              targetBlock: targetCodeBlock,
              replacementBlock: replacementCodeBlock,
              verifyCompile: true,
              authorAgent: 'ui-master-kit-operator'
            };

      const res = await fetch('/api/ui-master-kit/patch-ui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        appendLog(`UI Patch Verified & Applied: ${data.summary}`);
        if (data.diff) setLastPatchDiff(data.diff);
        if (data.mutation) {
          setMutationHistory((prev) => [data.mutation, ...prev]);
        }
        await inspectComponent(selectedComponentPath);
        setAiUiInstruction('');
      } else {
        appendLog(`UI Patch Rolled Back / Rejected: ${data.error || data.summary}`);
      }
    } catch (err: any) {
      appendLog(`UI Patch Failed: ${err.message}`);
    } finally {
      setIsPatchingUi(false);
    }
  };

  const handleApplyLiveStyleTokens = async () => {
    try {
      let styleTag = document.getElementById('sovereign-ui-master-kit-overrides') as HTMLStyleElement | null;
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'sovereign-ui-master-kit-overrides';
        document.head.appendChild(styleTag);
      }
      styleTag.textContent = `
        :root {
          --sovereign-accent: ${accentHue};
          --sovereign-contrast: ${surfaceContrast}%;
          --sovereign-border-opacity: ${(borderCrispness / 100) * 0.15};
        }
        ${customCssRules}
      `;

      const res = await fetch('/api/ui-master-kit/live-style-override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surfaceContrast,
          accentHue,
          borderCrispness,
          customCssRules
        })
      });
      const data = await res.json();
      if (data.success && data.mutation) {
        setMutationHistory((prev) => [data.mutation, ...prev]);
        appendLog(data.mutation.summary);
      }
    } catch (err: any) {
      appendLog(`Failed to apply style tokens: ${err.message}`);
    }
  };

  const handleRunCompilerDiagnostic = async (autoHeal: boolean) => {
    setIsRepairing(true);
    appendLog(`Running TypeScript & JSX compiler audit (autoHeal=${autoHeal})...`);
    try {
      const res = await fetch('/api/ui-master-kit/repair-ui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetComponent: selectedComponentPath,
          autoHeal
        })
      });
      const data = await res.json();
      if (data.success) {
        setCompilerReport({
          compilerClean: data.compilerClean,
          lintSummary: data.lintSummary,
          lintOutput: data.lintOutput
        });
        if (data.mutation) {
          setMutationHistory((prev) => [data.mutation, ...prev]);
        }
        appendLog(`Compiler Diagnostic: ${data.lintSummary}`);
      } else {
        appendLog(`Diagnostic Error: ${data.error}`);
      }
    } catch (err: any) {
      appendLog(`Diagnostic Network Error: ${err.message}`);
    } finally {
      setIsRepairing(false);
    }
  };

  const handleTriggerAutonomousAction = async (actionType: string, payload: Record<string, any> = {}) => {
    appendLog(`Dispatching autonomous engine action [${actionType}]...`);
    try {
      const res = await fetch('/api/dev-kit/dispatch-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionType, payload })
      });
      const data = await res.json();
      if (data.success) {
        appendLog(`Success: ${data.message}`);
        setTelemetry((prev) => ({
          ...prev,
          activeQuestsCount: data.activeQuestsCount ?? prev.activeQuestsCount,
          agentActorsCount: data.agentActorsCount ?? prev.agentActorsCount,
          forgedToolsCount: data.forgedToolsCount ?? prev.forgedToolsCount
        }));
      } else {
        appendLog(`Error: ${data.error || 'Action failed'}`);
      }
    } catch (err: any) {
      appendLog(`Network Error: ${err.message}`);
    }
  };

  const handleSynthesizeWithAI = async () => {
    if (!promptInput.trim()) return;
    setIsSynthesizing(true);
    appendLog(`Synthesizing [${selectedCategory}] feature with AI: "${promptInput}"...`);
    try {
      const res = await fetch('/api/dev-kit/synthesize-ai-feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedCategory,
          prompt: promptInput
        })
      });
      const data = await res.json();
      if (data.success) {
        appendLog(`AI Synthesis Complete: ${data.title} — ${data.summary.slice(0, 140)}...`);
        setPromptInput('');
        fetchMasterKnowledgeAndStatus();
      } else {
        appendLog(`Synthesis Error: ${data.error}`);
      }
    } catch (err: any) {
      appendLog(`Synthesis Failed: ${err.message}`);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleInjectLogicPatch = async () => {
    if (!patchTitle.trim() && !patchPrompt.trim()) return;
    setIsPatchingLogic(true);
    appendLog(`Hot-injecting [${patchSubsystem}] logic patch into active MMO engine...`);
    try {
      const res = await fetch('/api/dev-kit/inject-logic-patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: patchTitle || `Autonomous ${patchSubsystem.toUpperCase()} Patch`,
          subsystem: patchSubsystem,
          logicPrompt: patchPrompt,
          logicCode: patchCode
        })
      });
      const data = await res.json();
      if (data.success) {
        appendLog(data.message);
        setPatchTitle('');
        setPatchPrompt('');
        setPatchCode('');
        fetchMasterKnowledgeAndStatus();
      } else {
        appendLog(`Patch Error: ${data.error}`);
      }
    } catch (err: any) {
      appendLog(`Patch Failed: ${err.message}`);
    } finally {
      setIsPatchingLogic(false);
    }
  };

  const handleRevertPatch = async (patchId: string) => {
    try {
      const res = await fetch('/api/dev-kit/revert-patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patchId })
      });
      const data = await res.json();
      if (data.success) {
        appendLog(data.message);
        fetchMasterKnowledgeAndStatus();
      }
    } catch (err: any) {
      appendLog(`Revert Failed: ${err.message}`);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(''), 1800);
  };

  const handleLoadBlueprintIntoPatcher = (bp: UiMasterBlueprint) => {
    setPatchMode('ai');
    setAiUiInstruction(`Inject the "${bp.name}" UI blueprint into ${selectedComponentPath} using these classes and layout: ${bp.jsxSnippet}`);
    setActiveTab('ui-architect');
    appendLog(`Loaded UI Blueprint "${bp.name}" into AI UI Architect for ${selectedComponentPath}.`);
  };

  const handleLoadAssetIntoPatcher = (asset: BaselineAssetDescriptor) => {
    setSelectedEmbedAssetId(asset.id);
    setPatchMode('ai');
    setAiUiInstruction((prev) =>
      prev
        ? `${prev} (Embed baseline asset: ${asset.name})`
        : `Add a high-contrast visual section or header banner to ${selectedComponentPath} featuring the "${asset.name}" baseline asset.`
    );
    setActiveTab('ui-architect');
    appendLog(`Selected Baseline Asset "${asset.name}" for embedding into ${selectedComponentPath}.`);
  };

  const filteredAssets = BASELINE_ORCHESTRATOR_ASSETS.filter((a) => {
    const matchesCat = assetCategoryFilter === 'all' || a.category === assetCategoryFilter;
    const matchesQuery =
      !knowledgeSearch.trim() ||
      a.name.toLowerCase().includes(knowledgeSearch.toLowerCase()) ||
      a.description.toLowerCase().includes(knowledgeSearch.toLowerCase()) ||
      a.tags.some((t) => t.toLowerCase().includes(knowledgeSearch.toLowerCase()));
    return matchesCat && matchesQuery;
  });

  const filteredFacets = ORCHESTRATOR_FACETS_INDEX.filter(
    (f) =>
      !knowledgeSearch.trim() ||
      f.title.toLowerCase().includes(knowledgeSearch.toLowerCase()) ||
      f.moduleId.toLowerCase().includes(knowledgeSearch.toLowerCase()) ||
      f.componentPath.toLowerCase().includes(knowledgeSearch.toLowerCase()) ||
      f.capabilities.some((c) => c.toLowerCase().includes(knowledgeSearch.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 p-6 overflow-y-auto space-y-6">
      {/* Top Hero & Telemetry Matrix */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/90 p-6">
        <img
          src={sovereignCockpitImg}
          alt="Sovereign UI Master Kit Banner"
          className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/60 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-cyan-400">
              UID 0 Sovereign Clearance · Real-Time AST & DOM Mutator
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3 mt-1">
              <Wrench className="w-6 h-6 text-cyan-400 shrink-0" />
              Autonomous UI Dev Master Kit & MMO Engine Suite
            </h1>
            <p className="text-slate-300 text-sm mt-1.5 max-w-3xl">
              Inspect, repair, modify, and inject UI elements across all 37 orchestrator modules with pre-loaded Baseline Visual/3D/Audio Assets, full Codebase Facets Knowledge, and <code className="text-cyan-300 font-mono text-xs">tsc --noEmit</code> atomic rollback protection.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
            <div className="px-3.5 py-2.5 rounded-xl bg-slate-950/85 border border-white/10">
              <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Indexed Facets</div>
              <div className="text-lg font-bold text-cyan-400 font-mono tabular-nums mt-0.5">
                {ORCHESTRATOR_FACETS_INDEX.length} Modules
              </div>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-slate-950/85 border border-white/10">
              <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Baseline Assets</div>
              <div className="text-lg font-bold text-amber-400 font-mono tabular-nums mt-0.5">
                {BASELINE_ORCHESTRATOR_ASSETS.length} Ready
              </div>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-slate-950/85 border border-white/10">
              <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">World Actors</div>
              <div className="text-lg font-bold text-emerald-400 font-mono tabular-nums mt-0.5">
                {telemetry.agentActorsCount} Active
              </div>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-slate-950/85 border border-white/10">
              <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Forged Tools</div>
              <div className="text-lg font-bold text-purple-400 font-mono tabular-nums mt-0.5">
                {telemetry.forgedToolsCount} Live
              </div>
            </div>
          </div>
        </div>

        {/* Workspace Navigation Bar */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mt-6 pt-4 border-t border-white/10">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('ui-architect')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition ${
                activeTab === 'ui-architect'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-white/10'
              }`}
            >
              <FileCode className="w-4 h-4" />
              UI Component Inspector & AI Patch Studio
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('assets-knowledge')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition ${
                activeTab === 'assets-knowledge'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-white/10'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Baseline Assets & Full Codebase Knowledge ({BASELINE_ORCHESTRATOR_ASSETS.length + ORCHESTRATOR_FACETS_INDEX.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('mmo-engine')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition ${
                activeTab === 'mmo-engine'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-white/10'
              }`}
            >
              <Compass className="w-4 h-4" />
              Zero-Downtime MMO & 3D Engine Patcher
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('compiler-heal')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition ${
                activeTab === 'compiler-heal'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-white/10'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Compiler Gate & Self-Healing Diagnostics
            </button>
          </div>

          <button
            type="button"
            onClick={fetchMasterKnowledgeAndStatus}
            className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 text-xs font-medium flex items-center gap-2 whitespace-nowrap transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            Sync Telemetry
          </button>
        </div>

        {/* Universal 3-Scope Target System Pointer & Atomic Patch Rollback Bar */}
        <div className="relative z-10 mt-4 pt-4 border-t border-white/10 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-mono uppercase tracking-wider text-cyan-400 font-semibold">
              Active System Scope [{targetScopeLabel.toUpperCase()}]:
            </span>
            <span className="font-mono text-slate-300 bg-slate-950/90 px-2.5 py-1 rounded border border-white/10">
              {activeTargetRoot || orchestratorRoot || 'Resolving...'}
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              (Self: <code className="text-emerald-400">@self</code> · Target: <code className="text-cyan-300">@target</code> · Host OS: <code className="text-amber-300">@host</code>)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={targetSystemInput}
              onChange={(e) => setTargetSystemInput(e.target.value)}
              placeholder="/path/to/any/system/or/repo or self"
              className="w-64 sm:w-80 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-cyan-200 focus:outline-none focus:border-cyan-400"
            />
            <button
              type="button"
              onClick={() => handlePointTargetSystem()}
              disabled={isPointingTarget}
              className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold text-xs whitespace-nowrap transition"
            >
              {isPointingTarget ? 'Pointing...' : 'Point Target System'}
            </button>
            <button
              type="button"
              onClick={() => handlePointTargetSystem('self')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-medium whitespace-nowrap transition"
            >
              Point to Self (Orchestrator)
            </button>
            <button
              type="button"
              onClick={() => handleRollbackLatestAtomicPatch()}
              disabled={isRollingBack || atomicLedgerEntries.length === 0}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-40 text-amber-300 border border-amber-500/30 text-xs font-mono flex items-center gap-1.5 whitespace-nowrap transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Rollback Patch ({atomicLedgerEntries.length})
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: UI COMPONENT INSPECTOR & AI PATCH STUDIO */}
      {activeTab === 'ui-architect' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Component Selector & Live Source Metrics (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-cyan-400" />
                  Orchestrator UI Component Target
                </h2>
                <span className="text-xs font-mono text-slate-400 tabular-nums">
                  {componentFiles.length} files
                </span>
              </div>

              <select
                value={selectedComponentPath}
                onChange={(e) => handleSelectComponent(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
              >
                {componentFiles.map((file) => (
                  <option key={file} value={file}>
                    {file}
                  </option>
                ))}
              </select>

              {inspection && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-white/5">
                      <div className="text-[11px] text-slate-400">Source Lines</div>
                      <div className="text-base font-bold text-white font-mono tabular-nums mt-0.5">
                        {inspection.lineCount}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-white/5">
                      <div className="text-[11px] text-slate-400">Interactive Buttons</div>
                      <div className="text-base font-bold text-cyan-400 font-mono tabular-nums mt-0.5">
                        {inspection.metrics.buttonCount}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-white/5">
                      <div className="text-[11px] text-slate-400">Embedded Images</div>
                      <div className="text-base font-bold text-amber-400 font-mono tabular-nums mt-0.5">
                        {inspection.metrics.imgCount}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-white/5 space-y-1.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Active React Hooks & State Bindings
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {inspection.hooksUsed.length > 0 ? (
                        inspection.hooksUsed.map((h) => (
                          <span
                            key={h}
                            className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-[11px]"
                          >
                            {h}()
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500">Stateless presentation component</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Live Component Source ({inspection.componentPath})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyText('source-copy', inspection.content)}
                        className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono"
                      >
                        {copiedId === 'source-copy' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedId === 'source-copy' ? 'Copied' : 'Copy TSX'}
                      </button>
                    </div>
                    <pre className="bg-slate-950 border border-white/10 rounded-xl p-3.5 text-[11px] font-mono text-slate-300 max-h-72 overflow-y-auto leading-relaxed">
                      {isInspecting ? 'Reading file from disk...' : inspection.content.slice(0, 6000)}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Live Global DOM Theme & Surface Token Customizer */}
            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  Live Global UI Surface & CSS Token Override
                </h2>
                <span className="text-[11px] font-mono text-emerald-400">Zero-Reload DOM</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-white/5">
                  <label className="text-[11px] text-slate-400 flex justify-between">
                    <span>Surface Contrast</span>
                    <span className="font-mono tabular-nums text-white">{surfaceContrast}%</span>
                  </label>
                  <input
                    type="range"
                    min={80}
                    max={125}
                    value={surfaceContrast}
                    onChange={(e) => setSurfaceContrast(Number(e.target.value))}
                    className="w-full mt-2 accent-cyan-400"
                  />
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-white/5">
                  <label className="text-[11px] text-slate-400 flex justify-between">
                    <span>Border Crispness</span>
                    <span className="font-mono tabular-nums text-white">{borderCrispness}%</span>
                  </label>
                  <input
                    type="range"
                    min={50}
                    max={200}
                    value={borderCrispness}
                    onChange={(e) => setBorderCrispness(Number(e.target.value))}
                    className="w-full mt-2 accent-cyan-400"
                  />
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-white/5">
                  <label className="text-[11px] text-slate-400 flex justify-between">
                    <span>Accent Token</span>
                    <span className="font-mono text-cyan-300">{accentHue}</span>
                  </label>
                  <input
                    type="color"
                    value={accentHue}
                    onChange={(e) => setAccentHue(e.target.value)}
                    className="w-full h-7 mt-1.5 rounded bg-transparent cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                  Live Global CSS Rule Injection (Applied immediately to document head)
                </label>
                <textarea
                  value={customCssRules}
                  onChange={(e) => setCustomCssRules(e.target.value)}
                  rows={2}
                  placeholder="/* Optional live CSS overrides, e.g. .custom-panel { backdrop-filter: blur(16px); } */"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-emerald-300 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                type="button"
                onClick={handleApplyLiveStyleTokens}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 whitespace-nowrap transition"
              >
                <Palette className="w-4 h-4" />
                Broadcast Live UI Tokens Across Orchestrator
              </button>
            </div>
          </div>

          {/* Right Column: AI UI Architect, Surgical Patch Studio & Blueprints (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                    Autonomous UI Repair, Element Injector & Atomic Patch Studio
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Every change is written to disk via <code className="text-cyan-300 font-mono">autonomyPatchFile</code> and verified with <code className="text-emerald-300 font-mono">npx tsc --noEmit</code>. Syntax errors automatically roll back.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setPatchMode('ai')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                      patchMode === 'ai' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    AI Architect Synthesis
                  </button>
                  <button
                    type="button"
                    onClick={() => setPatchMode('surgical')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                      patchMode === 'surgical' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Deterministic Block Patch
                  </button>
                </div>
              </div>

              {patchMode === 'ai' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Target Component File
                      </label>
                      <input
                        type="text"
                        value={selectedComponentPath}
                        onChange={(e) => setSelectedComponentPath(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Embed Baseline Asset (Optional)
                      </label>
                      <select
                        value={selectedEmbedAssetId}
                        onChange={(e) => setSelectedEmbedAssetId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="">None — Pure UI / Layout / Logic Modification</option>
                        {BASELINE_ORCHESTRATOR_ASSETS.map((asset) => (
                          <option key={asset.id} value={asset.id}>
                            [{asset.category}] {asset.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      UI Repair, Modification, or New Element Instruction
                    </label>
                    <textarea
                      value={aiUiInstruction}
                      onChange={(e) => setAiUiInstruction(e.target.value)}
                      rows={4}
                      placeholder="Describe the exact UI repair, styling upgrade, or new interactive element to add to the selected component..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Exact Target Code Block in <code className="text-cyan-300 font-mono">{selectedComponentPath}</code>
                    </label>
                    <textarea
                      value={targetCodeBlock}
                      onChange={(e) => setTargetCodeBlock(e.target.value)}
                      rows={4}
                      placeholder="Paste exact existing lines from the component source..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-amber-300 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Replacement TSX Code Block
                    </label>
                    <textarea
                      value={replacementCodeBlock}
                      onChange={(e) => setReplacementCodeBlock(e.target.value)}
                      rows={5}
                      placeholder="Paste replacement TSX code block..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-emerald-300 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="text-xs text-slate-400 font-mono">
                  Compiler Gate: <span className="text-emerald-400">tsc --noEmit Mandatory</span>
                </div>
                <button
                  type="button"
                  onClick={handleExecuteUiPatch}
                  disabled={isPatchingUi}
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2 whitespace-nowrap transition shadow-sm"
                >
                  <Hammer className="w-4 h-4" />
                  {isPatchingUi ? 'Synthesizing & Verifying TypeScript...' : 'Apply Compile-Verified UI Patch'}
                </button>
              </div>

              {lastPatchDiff && (
                <div className="pt-3 border-t border-white/10">
                  <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1.5">
                    Latest Applied Patch Diff
                  </div>
                  <pre className="bg-slate-950 border border-emerald-500/30 rounded-xl p-3 text-[11px] font-mono text-emerald-300 max-h-48 overflow-y-auto">
                    {lastPatchDiff}
                  </pre>
                </div>
              )}
            </div>

            {/* Ready-to-Inject Zero-Slop UI Blueprints */}
            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  Baseline UI Master Kit Blueprints (1-Click Component Injection)
                </h3>
                <span className="text-xs font-mono text-slate-400">{UI_MASTER_KIT_BLUEPRINTS.length} Templates</span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {UI_MASTER_KIT_BLUEPRINTS.map((bp) => (
                  <div
                    key={bp.id}
                    className="p-4 rounded-xl bg-slate-950/90 border border-white/10 flex flex-col gap-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 mr-2">
                          {bp.category}
                        </span>
                        <span className="text-sm font-bold text-white">{bp.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyText(bp.id, bp.jsxSnippet)}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10 text-xs font-mono flex items-center gap-1 whitespace-nowrap"
                        >
                          {copiedId === bp.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          {copiedId === bp.id ? 'Copied' : 'Copy JSX'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLoadBlueprintIntoPatcher(bp)}
                          className="px-3 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/30 text-xs font-semibold whitespace-nowrap"
                        >
                          Load into Patcher
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">{bp.description}</p>
                    <pre className="bg-slate-900/90 border border-white/5 rounded-lg p-2.5 text-[11px] font-mono text-cyan-300 overflow-x-auto">
                      {bp.jsxSnippet}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BASELINE ASSETS & FULL CODEBASE FACETS KNOWLEDGE EXPLORER */}
      {activeTab === 'assets-knowledge' && (
        <div className="space-y-6">
          {/* Search & Category Filter Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-900/80 border border-white/10 rounded-2xl p-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={knowledgeSearch}
                onChange={(e) => setKnowledgeSearch(e.target.value)}
                placeholder="Search across all 37 orchestrator modules, baseline visual/3D/audio assets, API routes, and sovereign tools..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'All Assets' },
                { id: 'visual_image', label: 'Visual Images (7)' },
                { id: '3d_procedural_rig', label: '3D Procedural Rigs' },
                { id: 'pbr_material_preset', label: 'PBR Shaders' },
                { id: 'audio_voice_engine', label: 'Voice & Audio' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setAssetCategoryFilter(cat.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    assetCategoryFilter === cat.id
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-white/10'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Visual & Procedural Baseline Assets Inventory */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-amber-400" />
                Baseline Orchestrator Assets Inventory ({filteredAssets.length})
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                Pre-verified local paths & Three.js procedural generators
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredAssets.map((asset) => {
                const previewImg = ASSET_IMAGE_MAP[asset.id];
                return (
                  <div
                    key={asset.id}
                    className="bg-slate-900/80 border border-white/10 rounded-2xl overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      {previewImg ? (
                        <div className="relative h-40 w-full bg-slate-950 border-b border-white/10">
                          <img
                            src={previewImg}
                            alt={asset.name}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-slate-950/90 border border-white/15 text-[10px] font-mono text-amber-300">
                            {asset.category}
                          </span>
                        </div>
                      ) : (
                        <div className="h-24 w-full bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/40 border-b border-white/10 p-4 flex items-center justify-between">
                          <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">
                            {asset.category.replace(/_/g, ' ')}
                          </span>
                          <Cpu className="w-6 h-6 text-cyan-400/60" />
                        </div>
                      )}

                      <div className="p-4 space-y-2">
                        <div className="text-sm font-bold text-white">{asset.name}</div>
                        <div className="text-[11px] font-mono text-cyan-400">{asset.dimensionsOrSpec}</div>
                        <p className="text-xs text-slate-300 leading-relaxed">{asset.description}</p>
                        <pre className="bg-slate-950 border border-white/5 rounded-lg p-2 text-[10px] font-mono text-slate-300 overflow-x-auto">
                          {asset.importPath}
                        </pre>
                      </div>
                    </div>

                    <div className="p-4 pt-0 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyText(asset.id, `${asset.importPath}\n${asset.usageSnippet}`)}
                        className="flex-1 py-2 px-3 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-200 border border-white/10 text-xs font-mono flex items-center justify-center gap-1.5 whitespace-nowrap"
                      >
                        {copiedId === asset.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedId === asset.id ? 'Copied Snippet' : 'Copy Import + JSX'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLoadAssetIntoPatcher(asset)}
                        className="py-2 px-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold whitespace-nowrap"
                      >
                        Embed in UI
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Complete Codebase Facets & Module Architecture Registry */}
          <div className="space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Code2 className="w-5 h-5 text-cyan-400" />
                Orchestrator Facets & Module Knowledge Base ({filteredFacets.length})
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                Direct navigation & live component inspection
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredFacets.map((facet: OrchestratorFacetDescriptor) => (
                <div
                  key={facet.moduleId}
                  className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                          {facet.category}
                        </span>
                        <h3 className="text-base font-bold text-white mt-1.5">{facet.title}</h3>
                      </div>
                      <span className="text-xs font-mono text-slate-400">{facet.componentPath}</span>
                    </div>

                    <p className="text-xs text-slate-300">{facet.uiArchitectureNotes}</p>

                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Capabilities
                      </div>
                      <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
                        {facet.capabilities.map((cap, idx) => (
                          <li key={idx}>{cap}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {facet.primaryApiEndpoints.map((ep) => (
                        <span
                          key={ep}
                          className="px-2 py-0.5 rounded bg-slate-950 border border-white/10 text-[10px] font-mono text-emerald-300"
                        >
                          {ep}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedComponentPath(facet.componentPath);
                        inspectComponent(facet.componentPath);
                        setActiveTab('ui-architect');
                      }}
                      className="flex-1 py-2 px-3 rounded-lg bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      Inspect & Patch UI Source
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectModule?.(facet.moduleId as ModuleType)}
                      className="py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1 whitespace-nowrap"
                    >
                      Open Module
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sovereign Backend Tools Manifest */}
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              Sovereign Agent Tools Registered for Autonomous UI & Engine Operations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {SOVEREIGN_BACKEND_TOOLS_MANIFEST.map((tool) => (
                <div key={tool.toolName} className="p-3.5 rounded-xl bg-slate-950 border border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-cyan-300">{tool.toolName}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      tsc-verified
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{tool.description}</p>
                  <div className="text-[10px] font-mono text-slate-400">{tool.parametersSummary}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ZERO-DOWNTIME MMO & 3D ENGINE PATCH STUDIO */}
      {activeTab === 'mmo-engine' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Autonomous MMO World Mutators */}
            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  Live 3D World & MMO Mutators
                </h2>
                <p className="text-xs text-slate-400">
                  Directly mutate <code className="text-amber-300 font-mono">SPATIAL_ENGINE_STATE</code> in Chronicles of Aetherion with real 3D entities, procedural quests, and autonomous NPCs.
                </p>

                <div className="grid grid-cols-1 gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => handleTriggerAutonomousAction('SPAWN_QUEST', { difficulty: 'mythic' })}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 flex items-center justify-between text-xs font-semibold whitespace-nowrap transition"
                  >
                    <span>Synthesize & Spawn Story Quest</span>
                    <Compass className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTriggerAutonomousAction('TRIGGER_WORLD_EVENT', { eventName: 'Aetherion Leyline Convergence' })}
                    className="w-full py-2.5 px-4 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 flex items-center justify-between text-xs font-semibold whitespace-nowrap transition"
                  >
                    <span>Trigger World Event & Weather Shift</span>
                    <Sparkles className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTriggerAutonomousAction('FORGE_TOOL', { toolName: 'Aetherion Spire Architect', structureKind: 'crystal_cluster' })}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 flex items-center justify-between text-xs font-semibold whitespace-nowrap transition"
                  >
                    <span>Forge Procedural 3D Spire Cluster</span>
                    <Wrench className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTriggerAutonomousAction('SPAWN_NPC', { role: 'guardian' })}
                    className="w-full py-2.5 px-4 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 flex items-center justify-between text-xs font-semibold whitespace-nowrap transition"
                  >
                    <span>Spawn Autonomous 3D City NPC</span>
                    <Play className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectModule?.('spatial-arena')}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center justify-center gap-2 whitespace-nowrap transition"
              >
                Jump to 3D Spatial Arena Viewport
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            {/* AI Game Feature Synthesizer */}
            <div className="lg:col-span-2 bg-slate-900/80 border border-white/10 rounded-2xl p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  AI Game Feature, Raid Boss & Economy Architect
                </h2>
                <p className="text-xs text-slate-400">
                  Synthesize new MMORPG mechanics, faction economy formulas, or Unreal 5/6 shader presets and bind them to the live simulation log.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Target Subsystem</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="world_event">Living World Event</option>
                      <option value="quest_chain">Infinite Story Quest Chain</option>
                      <option value="custom_biome">Procedural Biome & Shader</option>
                      <option value="boss_encounter">Mythic Raid Boss Encounter</option>
                      <option value="npc_behavior">Autonomous NPC Goal Matrix</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Feature Specification Prompt</label>
                    <input
                      type="text"
                      value={promptInput}
                      onChange={(e) => setPromptInput(e.target.value)}
                      placeholder="e.g., Chrono-storm over Starfall Basin that awakens ancient crystal golems..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSynthesizeWithAI}
                disabled={isSynthesizing || !promptInput.trim()}
                className="w-full py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 whitespace-nowrap transition"
              >
                <Sparkles className="w-4 h-4" />
                {isSynthesizing ? 'Synthesizing Engine Feature...' : 'Synthesize & Bind Feature to Engine'}
              </button>
            </div>
          </div>

          {/* Zero-Downtime Logic Patch Studio */}
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-emerald-400" />
                  Zero-Downtime MMO Logic Patch Injector
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Hot-swap combat damage scaling, caravan tariff curves, and boss phase triggers without restarting the simulation.
                </p>
              </div>
              <span className="text-xs font-mono text-emerald-400 tabular-nums">
                {logicPatches.filter((p) => p.active).length} Active Patches
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Patch Title</label>
                    <input
                      type="text"
                      value={patchTitle}
                      onChange={(e) => setPatchTitle(e.target.value)}
                      placeholder="e.g., Critical Overdrive Scaling"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Target Subsystem</label>
                    <select
                      value={patchSubsystem}
                      onChange={(e) => setPatchSubsystem(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="combat">Combat & Damage Scaling</option>
                      <option value="quest">Quest Reward & XP Curve</option>
                      <option value="economy">Grand Bazaar Price Equilibrium</option>
                      <option value="ai_behavior">Autonomous NPC Decision Tree</option>
                      <option value="world_event">World Boss & Weather Triggers</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Natural Language Intent (AI Synthesizes Code if Code Box Empty)</label>
                  <input
                    type="text"
                    value={patchPrompt}
                    onChange={(e) => setPatchPrompt(e.target.value)}
                    placeholder="e.g., Boost spell critical multiplier by 25% during Leyline storms..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Executable Runtime Code Body</label>
                  <textarea
                    value={patchCode}
                    onChange={(e) => setPatchCode(e.target.value)}
                    rows={3}
                    placeholder="return baseDamage * (isLeylineStorm ? 1.25 : 1.0);"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleInjectLogicPatch}
                  disabled={isPatchingLogic || (!patchTitle.trim() && !patchPrompt.trim())}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 whitespace-nowrap transition"
                >
                  <GitBranch className="w-4 h-4" />
                  {isPatchingLogic ? 'Compiling & Hot-Injecting...' : 'Hot-Inject Logic Patch'}
                </button>
              </div>

              <div className="bg-slate-950 border border-white/10 rounded-xl p-4 flex flex-col">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Active Engine Logic Patch Registry ({logicPatches.length})
                </div>
                <div className="flex-1 overflow-y-auto space-y-2.5 max-h-64 pr-1">
                  {logicPatches.map((p) => (
                    <div
                      key={p.patchId}
                      className={`p-3 rounded-xl border ${
                        p.active ? 'bg-slate-900/90 border-emerald-500/30' : 'bg-slate-900/30 border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-100">{p.title}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-300 uppercase">
                          {p.subsystem}
                        </span>
                      </div>
                      <pre className="text-[11px] font-mono text-slate-300 mt-2 bg-slate-950 p-2 rounded border border-white/5 overflow-x-auto">
                        {p.logicCode}
                      </pre>
                      <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400 font-mono">
                        <span>Proof: {p.proofHash} · {p.createdAt}</span>
                        <button
                          type="button"
                          onClick={() => handleRevertPatch(p.patchId)}
                          className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          {p.active ? 'Revert' : 'Re-Enable'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: COMPILER GATE & SELF-HEALING DIAGNOSTICS */}
      {activeTab === 'compiler-heal' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-slate-900/80 border border-white/10 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-cyan-400" />
                  TypeScript Compiler Gate & Recursive Self-Healing
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Executes <code className="text-cyan-300 font-mono">npx tsc --noEmit</code> across the entire workspace and optionally runs <code className="text-emerald-300 font-mono">recursiveHealCodebase</code> to repair any broken imports or JSX types.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleRunCompilerDiagnostic(false)}
                disabled={isRepairing}
                className="py-3 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 font-semibold text-xs flex items-center justify-center gap-2 whitespace-nowrap transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isRepairing ? 'Running tsc --noEmit...' : 'Run Compiler Verification Audit'}
              </button>
              <button
                type="button"
                onClick={() => handleRunCompilerDiagnostic(true)}
                disabled={isRepairing}
                className="py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 whitespace-nowrap transition"
              >
                <Wrench className="w-4 h-4" />
                {isRepairing ? 'Healing Codebase...' : 'Execute Autonomous Self-Healing'}
              </button>
            </div>

            {compilerReport && (
              <div
                className={`p-4 rounded-xl border ${
                  compilerReport.compilerClean
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                    : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                } space-y-2`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {compilerReport.compilerClean ? 'Compiler Gate Passed (0 Errors)' : 'Compiler Audit Report'}
                  </span>
                  <span className="text-xs font-mono">tsc --noEmit</span>
                </div>
                <div className="text-xs font-mono">{compilerReport.lintSummary}</div>
              </div>
            )}

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                UI Master Kit Mutation & Repair Ledger ({mutationHistory.length})
              </div>
              <div className="bg-slate-950 border border-white/10 rounded-xl p-3 max-h-64 overflow-y-auto space-y-2">
                {mutationHistory.length === 0 ? (
                  <div className="text-xs text-slate-500 font-mono py-4 text-center">
                    No UI mutations recorded in this session yet.
                  </div>
                ) : (
                  mutationHistory.map((mut) => (
                    <div key={mut.id} className="p-2.5 rounded-lg bg-slate-900 border border-white/5 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-cyan-300">{mut.componentPath}</span>
                        <span className="text-[10px] font-mono text-slate-400">{mut.createdAt}</span>
                      </div>
                      <div className="text-slate-200">{mut.summary}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Live Dev Kit & Autonomy Execution Console */}
          <div className="lg:col-span-6 bg-slate-900/80 border border-white/10 rounded-2xl p-6 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                Live Orchestrator & UI Master Kit Telemetry Log
              </h2>
              <span className="text-xs font-mono text-emerald-400">UID 0 Stream</span>
            </div>
            <div className="bg-slate-950 border border-white/10 rounded-xl p-4 font-mono text-xs text-slate-300 h-96 overflow-y-auto space-y-1.5">
              {telemetry.logs.map((log, index) => (
                <div key={index} className="leading-relaxed border-b border-white/[0.03] pb-1">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentDevKitModule;
