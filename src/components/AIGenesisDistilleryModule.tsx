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

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Cpu,
  FlaskConical,
  Layers,
  Activity,
  Download,
  Play,
  RefreshCw,
  Check,
  Copy,
  Sliders,
  ArrowUpRight,
  Archive,
  Zap
} from 'lucide-react';
import type { ModuleType } from '../types';
import { agentModelBinder } from '../utils/localLlmEngine';
import molecularChamberImg from '../assets/images/molecular_distillation_chamber_1794958702719.jpg';
import weightTensorForgeImg from '../assets/images/neural_weight_tensor_forge_1794958706825.jpg';

export interface CognitiveGenome {
  reasoningDepth: number;
  codeSynthesisPrecision: number;
  autonomousInitiative: number;
  mathematicalRigor: number;
  creativeDivergence: number;
  faultResilience: number;
  crossSystemMastery: number;
  molecularCoherence: number;
}

export interface GenesisAgentModel {
  id: string;
  code: string;
  name: string;
  role: string;
  architecture:
    | 'Transformer-MoE-v6'
    | 'Hyperbolic-State-Space-Mamba3'
    | 'Liquid-Time-Constant-Neural'
    | 'Neuro-Symbolic-Recursive'
    | 'Quantum-Tensor-Manifold';
  parameterScale: string;
  quantization: 'FP8_E4M3' | 'BF16_NATIVE' | 'INT4_AWQ' | 'NF4_QLORA' | 'TERNARY_1.58BIT';
  attentionMechanism:
    | 'Multi-Head Latent Attention (MLA)'
    | 'Ring-Flash-Attention-3'
    | 'Poincaré Hyperbolic Attention'
    | 'Speculative Tree Attention';
  contextWindowTokens: number;
  activeExperts: number;
  totalExperts: number;
  systemDirective: string;
  capabilities: string[];
  scopesUnlocked: Array<'self' | 'target' | 'host'>;
  genome: CognitiveGenome;
  idealStatePurity: number;
  distillationGeneration: number;
  trainingEpochsCompleted: number;
  currentPerplexity: number;
  freeEnergyEv: number;
  weightHash: string;
  createdAt: string;
  updatedAt: string;
  isResidentCore?: boolean;
}

export interface WeightTensorArtifact {
  id: string;
  name: string;
  targetAgentId: string;
  mergeMethod: 'SLERP_GEODESIC' | 'TIES_DENSITY' | 'DARE_LINEAR' | 'QLORA_ADAPTER' | 'AB_INITIO_ORTHOGONAL';
  parentModelA: string;
  parentModelB: string;
  interpolationAlpha: number;
  quantization: 'FP8_E4M3' | 'BF16_NATIVE' | 'INT4_AWQ' | 'NF4_QLORA' | 'TERNARY_1.58BIT';
  rankDimension: number;
  layersCount: number;
  frobeniusNorm: number;
  spectralRadius: number;
  shannonEntropyBits: number;
  sparsityRatio: number;
  cosineAlignment: number;
  tensorSampleMatrix: number[][];
  singularValues: number[];
  sha256Hash: string;
  filePathOnDisk: string;
  createdAt: string;
}

export interface TrainingEpochPoint {
  epoch: number;
  trainLoss: number;
  valPerplexity: number;
  rewardScore: number;
  gradientNorm: number;
  klDivergence: number;
}

export interface AutonomousTrainingRun {
  id: string;
  targetAgentId: string;
  targetAgentName: string;
  curriculumDomain:
    | 'UNIVERSAL_AUTONOMOUS_ENGINEERING'
    | 'ATOMIC_PATCH_AND_COMPILER_MASTERY'
    | 'HYPERBOLIC_MATHEMATICAL_PROOFS'
    | 'MULTI_AGENT_BYZANTINE_CONSENSUS'
    | '3D_SPATIAL_PHYSICS_SYNTHESIS'
    | 'MOLECULAR_SELF_REFLECTION';
  algorithm: 'GRPO_REINFORCEMENT' | 'DPO_ALIGNMENT' | 'RLAIF_SELF_PLAY' | 'COMPILER_VERIFIED_EVOLUTION';
  epochs: number;
  learningRate: number;
  batchSize: number;
  initialLoss: number;
  finalLoss: number;
  initialPerplexity: number;
  finalPerplexity: number;
  rewardDelta: number;
  curve: TrainingEpochPoint[];
  distilledAxioms: string[];
  genomeDelta: Partial<CognitiveGenome>;
  proofHash: string;
  completedAt: string;
}

export interface MolecularDistillationRun {
  id: string;
  agentId: string;
  agentName: string;
  chamberMode:
    | 'SINGLE_AGENT_PURIFICATION'
    | 'COLLECTIVE_SWARM_CROSS_POLLINATION'
    | 'ZERO_ENTROPY_CRYSTALLIZATION'
    | 'QUANTUM_EIGENSTATE_ALIGNMENT';
  startTempKelvin: number;
  endTempKelvin: number;
  klRegularizationBeta: number;
  fractionationStages: Array<{
    vessel: 'VESSEL_A_PLASMA_INTAKE' | 'VESSEL_B_ENTROPY_FRACTIONATION' | 'VESSEL_C_IDEAL_CRYSTALLIZATION';
    temperatureK: number;
    entropyBits: number;
    coherencePct: number;
    statusNote: string;
  }>;
  purityBeforePct: number;
  purityAfterPct: number;
  entropyReducedBits: number;
  freeEnergyBeforeEv: number;
  freeEnergyAfterEv: number;
  refinedGenome: CognitiveGenome;
  crystallizedIdealDirective: string;
  molecularReflections: string[];
  crystalHash: string;
  distilledAt: string;
}

interface AIGenesisDistilleryModuleProps {
  onSelectModule?: (module: ModuleType) => void;
  onInjectIntoChat?: (content: string, immediate?: boolean) => void;
  onSaveToVault?: (
    type: 'music' | 'image' | 'video' | 'transcription' | 'voice' | 'spatial' | 'knowledge' | 'dossier',
    title: string,
    prompt: string,
    model: string,
    mediaUrl?: string,
    metadataJson?: string
  ) => void;
}

type FacilitySection = 'distillation-chamber' | 'agent-genesis' | 'weights-forge' | 'autonomous-training';

const GENOME_AXES: Array<{ key: keyof CognitiveGenome; label: string; shortLabel: string }> = [
  { key: 'reasoningDepth', label: 'Reasoning Depth', shortLabel: 'REASON' },
  { key: 'codeSynthesisPrecision', label: 'Code Synthesis Precision', shortLabel: 'CODE_AST' },
  { key: 'autonomousInitiative', label: 'Autonomous Initiative', shortLabel: 'AUTONOMY' },
  { key: 'mathematicalRigor', label: 'Mathematical Rigor', shortLabel: 'MATH' },
  { key: 'creativeDivergence', label: 'Creative Divergence', shortLabel: 'CREATIVE' },
  { key: 'faultResilience', label: 'Fault Resilience', shortLabel: 'RESILIENCE' },
  { key: 'crossSystemMastery', label: 'Cross-System Mastery', shortLabel: '3_SCOPE' },
  { key: 'molecularCoherence', label: 'Molecular Coherence', shortLabel: 'COHERENCE' }
];

export const AIGenesisDistilleryModule: React.FC<AIGenesisDistilleryModuleProps> = ({
  onSelectModule,
  onInjectIntoChat,
  onSaveToVault
}) => {
  const [activeSection, setActiveSection] = useState<FacilitySection>('distillation-chamber');
  const [agents, setAgents] = useState<GenesisAgentModel[]>([]);
  const [weights, setWeights] = useState<WeightTensorArtifact[]>([]);
  const [trainingRuns, setTrainingRuns] = useState<AutonomousTrainingRun[]>([]);
  const [distillationRuns, setDistillationRuns] = useState<MolecularDistillationRun[]>([]);
  const [evolutiveAxioms, setEvolutiveAxioms] = useState<any[]>([]);
  const [totalEvolutionCycles, setTotalEvolutionCycles] = useState<number>(14);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('lyrailius-omega-zenith');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusBanner, setStatusBanner] = useState<string>(
    'Facility calibrated. All 3-Vessel Molecular Distillation Chambers and Weight Tensor Forges nominal.'
  );
  const [copiedHash, setCopiedHash] = useState<string>('');

  // Continuous Autonomous Background Evolution Daemon Toggle
  const [continuousEvolutionLoop, setContinuousEvolutionLoop] = useState<boolean>(false);

  // 1. Distillation Chamber Controls
  const [chamberMode, setChamberMode] = useState<MolecularDistillationRun['chamberMode']>(
    'COLLECTIVE_SWARM_CROSS_POLLINATION'
  );
  const [startTempK, setStartTempK] = useState<number>(2.4);
  const [endTempK, setEndTempK] = useState<number>(0.012);
  const [klBeta, setKlBeta] = useState<number>(0.04);
  const [idealIntentPrompt, setIdealIntentPrompt] = useState<string>(
    'Maximize zero-entropy deductive clarity, 3-scope atomic patch reliability, and cross-agent harmonic coherence.'
  );
  const [isDistilling, setIsDistilling] = useState<boolean>(false);

  // 2. Agent & AI Genesis Foundry Controls
  const [newAgentName, setNewAgentName] = useState<string>('');
  const [newAgentRole, setNewAgentRole] = useState<string>(
    'Autonomous Multi-System Architect & Molecular Weight Synthesizer'
  );
  const [newArchitecture, setNewArchitecture] =
    useState<GenesisAgentModel['architecture']>('Transformer-MoE-v6');
  const [newParamScale, setNewParamScale] = useState<string>('671B Hybrid-MoE');
  const [newQuantization, setNewQuantization] =
    useState<GenesisAgentModel['quantization']>('FP8_E4M3');
  const [newAttention, setNewAttention] = useState<GenesisAgentModel['attentionMechanism']>(
    'Multi-Head Latent Attention (MLA)'
  );
  const [newContextTokens, setNewContextTokens] = useState<number>(2097152);
  const [newSystemDirective, setNewSystemDirective] = useState<string>('');
  const [aiSynthesizeDirective, setAiSynthesizeDirective] = useState<boolean>(true);
  const [customGenome, setCustomGenome] = useState<CognitiveGenome>({
    reasoningDepth: 0.975,
    codeSynthesisPrecision: 0.985,
    autonomousInitiative: 0.99,
    mathematicalRigor: 0.978,
    creativeDivergence: 0.965,
    faultResilience: 0.988,
    crossSystemMastery: 0.992,
    molecularCoherence: 0.982
  });
  const [isCreatingAgent, setIsCreatingAgent] = useState<boolean>(false);

  // 3. Neural Weight Tensor Forge Controls
  const [weightName, setWeightName] = useState<string>('');
  const [mergeMethod, setMergeMethod] =
    useState<WeightTensorArtifact['mergeMethod']>('SLERP_GEODESIC');
  const [parentModelA, setParentModelA] = useState<string>('gemini-4-hydrogen-backbone');
  const [parentModelB, setParentModelB] = useState<string>('omniscient-post-human-eigenstate');
  const [interpolationAlpha, setInterpolationAlpha] = useState<number>(0.62);
  const [weightQuantization, setWeightQuantization] =
    useState<WeightTensorArtifact['quantization']>('FP8_E4M3');
  const [rankDimension, setRankDimension] = useState<number>(128);
  const [layersCount, setLayersCount] = useState<number>(96);
  const [isForgingWeights, setIsForgingWeights] = useState<boolean>(false);

  // 4. Autonomous Training & Evolution Controls
  const [curriculumDomain, setCurriculumDomain] = useState<AutonomousTrainingRun['curriculumDomain']>(
    'UNIVERSAL_AUTONOMOUS_ENGINEERING'
  );
  const [trainingAlgorithm, setTrainingAlgorithm] =
    useState<AutonomousTrainingRun['algorithm']>('GRPO_REINFORCEMENT');
  const [trainingEpochs, setTrainingEpochs] = useState<number>(16);
  const [learningRate, setLearningRate] = useState<number>(0.00015);
  const [batchSize, setBatchSize] = useState<number>(64);
  const [useCloudCurriculum, setUseCloudCurriculum] = useState<boolean>(true);
  const [isTraining, setIsTraining] = useState<boolean>(false);

  const syncRosterToBrowser = useCallback(
    (nextAgents: GenesisAgentModel[], nextWeights?: WeightTensorArtifact[]) => {
      try {
        localStorage.setItem('aurelius_genesis_roster_v1', JSON.stringify(nextAgents || []));
        if (nextWeights) {
          localStorage.setItem('aurelius_genesis_weights_v1', JSON.stringify(nextWeights));
        }
        agentModelBinder.syncGenesisAgents(nextAgents || []);
        window.dispatchEvent(
          new CustomEvent('aurelius_genesis_roster_updated', {
            detail: { agents: nextAgents || [], weights: nextWeights }
          })
        );
      } catch {}
    },
    []
  );

  const handleEquipAndOpenInChat = useCallback(
    (ag: GenesisAgentModel) => {
      syncRosterToBrowser(agents, weights);
      try {
        localStorage.setItem('aurelius_selected_role_id', ag.id);
        window.dispatchEvent(
          new CustomEvent('aurelius_select_chat_agent', {
            detail: { agentId: ag.id, agent: ag }
          })
        );
      } catch {}
      setStatusBanner(
        `Agent "${ag.name}" synced to Chat Roster & Agent Wardrobe. Switching to Chat...`
      );
      if (onSelectModule) onSelectModule('chat');
    },
    [agents, weights, syncRosterToBrowser, onSelectModule]
  );

  const fetchFacilityState = useCallback(async () => {
    try {
      const res = await fetch('/api/genesis-distillery/status');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const nextAgents = Array.isArray(data.agents) ? data.agents : [];
          const nextWeights = Array.isArray(data.weights) ? data.weights : [];
          setAgents(nextAgents);
          setWeights(nextWeights);
          setTrainingRuns(Array.isArray(data.trainingRuns) ? data.trainingRuns : []);
          setDistillationRuns(Array.isArray(data.distillationRuns) ? data.distillationRuns : []);
          setEvolutiveAxioms(Array.isArray(data.evolutiveAxioms) ? data.evolutiveAxioms : []);
          setTotalEvolutionCycles(Number(data.totalEvolutionCycles || 14));
          syncRosterToBrowser(nextAgents, nextWeights);
        }
      }
    } catch {
      // Non-fatal
    } finally {
      setIsLoading(false);
    }
  }, [syncRosterToBrowser]);

  useEffect(() => {
    fetchFacilityState();
  }, [fetchFacilityState]);

  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId) || agents[0] || null,
    [agents, selectedAgentId]
  );

  // Continuous Autonomous Evolution Loop
  useEffect(() => {
    if (!continuousEvolutionLoop || !selectedAgent) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch('/api/genesis-distillery/train', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetAgentId: selectedAgent.id,
            curriculumDomain: 'MOLECULAR_SELF_REFLECTION',
            algorithm: 'GRPO_REINFORCEMENT',
            epochs: 8,
            learningRate: 0.00012,
            batchSize: 64,
            useCloudCurriculum: false
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.state) {
            const nextAgents = data.state.agents || [];
            setAgents(nextAgents);
            setTrainingRuns(data.state.trainingRuns || []);
            setTotalEvolutionCycles(data.state.totalEvolutionCycles || 15);
            syncRosterToBrowser(nextAgents, data.state.weights);
            setStatusBanner(
              `Autonomous Continuous Evolution Cycle completed for ${selectedAgent.name} — Perplexity converged to ${data.trainingRun?.finalPerplexity}.`
            );
          }
        }
      } catch {}
    }, 12000);
    return () => clearInterval(timer);
  }, [continuousEvolutionLoop, selectedAgent, syncRosterToBrowser]);

  const handleRunMolecularDistillation = async () => {
    if (!selectedAgent) return;
    setIsDistilling(true);
    setStatusBanner(
      `Initiating 3-Vessel Molecular State Distillation for ${
        chamberMode === 'COLLECTIVE_SWARM_CROSS_POLLINATION'
          ? 'All Resident & Custom Agents'
          : selectedAgent.name
      } (${startTempK} K → ${endTempK} K)...`
    );
    try {
      const res = await fetch('/api/genesis-distillery/distill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          chamberMode,
          startTempKelvin: startTempK,
          endTempKelvin: endTempK,
          klRegularizationBeta: klBeta,
          idealIntentPrompt
        })
      });
      const data = await res.json();
      if (data.success) {
        const run: MolecularDistillationRun = data.distillationRun;
        setStatusBanner(
          `Molecular Distillation Complete: ${run.agentName} refined from ${run.purityBeforePct}% → ${run.purityAfterPct}% Purity (Free Energy ${run.freeEnergyAfterEv} eV · Crystal ${run.crystalHash.slice(0, 14)}).`
        );
        await fetchFacilityState();
      } else {
        setStatusBanner(`Distillation notice: ${data.error}`);
      }
    } catch (err: any) {
      setStatusBanner(`Distillation error: ${err.message}`);
    } finally {
      setIsDistilling(false);
    }
  };

  const handleCreateGenesisAgent = async () => {
    if (!newAgentName.trim()) {
      setStatusBanner('Please provide a name for the new AI model or autonomous agent.');
      return;
    }
    setIsCreatingAgent(true);
    setStatusBanner(`Synthesizing Genesis AI Agent "${newAgentName}"...`);
    try {
      const res = await fetch('/api/genesis-distillery/create-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAgentName.trim(),
          role: newAgentRole.trim(),
          architecture: newArchitecture,
          parameterScale: newParamScale,
          quantization: newQuantization,
          attentionMechanism: newAttention,
          contextWindowTokens: newContextTokens,
          systemDirective: newSystemDirective.trim(),
          aiSynthesizeDirective,
          genome: customGenome
        })
      });
      const data = await res.json();
      if (data.success && data.agent) {
        if (data.state?.agents) {
          syncRosterToBrowser(data.state.agents, data.state.weights);
        }
        try {
          localStorage.setItem('aurelius_selected_role_id', data.agent.id);
          window.dispatchEvent(
            new CustomEvent('aurelius_select_chat_agent', {
              detail: { agentId: data.agent.id, agent: data.agent }
            })
          );
        } catch {}
        setStatusBanner(
          `Created & Synced "${data.agent.name}" (${data.agent.code}) directly into the Chat Agent Roster & Wardrobe (${data.agent.idealStatePurity}% purity).`
        );
        setSelectedAgentId(data.agent.id);
        setNewAgentName('');
        setNewSystemDirective('');
        await fetchFacilityState();
      } else {
        setStatusBanner(`Agent creation error: ${data.error}`);
      }
    } catch (err: any) {
      setStatusBanner(`Network error creating agent: ${err.message}`);
    } finally {
      setIsCreatingAgent(false);
    }
  };

  const handleForgeWeights = async () => {
    if (!selectedAgent) return;
    setIsForgingWeights(true);
    setStatusBanner(`Forging & quantizing weight tensor manifold for ${selectedAgent.name}...`);
    try {
      const res = await fetch('/api/genesis-distillery/forge-weights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: weightName.trim() || `${selectedAgent.code}-${mergeMethod}-${weightQuantization}`,
          targetAgentId: selectedAgent.id,
          mergeMethod,
          parentModelA,
          parentModelB,
          interpolationAlpha,
          quantization: weightQuantization,
          rankDimension,
          layersCount
        })
      });
      const data = await res.json();
      if (data.success && data.artifact) {
        setStatusBanner(
          `Forged Weight Tensor "${data.artifact.name}" — Spectral Radius ${data.artifact.spectralRadius}, Frobenius Norm ${data.artifact.frobeniusNorm}, saved to ${data.artifact.filePathOnDisk}.`
        );
        setWeightName('');
        await fetchFacilityState();
      } else {
        setStatusBanner(`Weight forge error: ${data.error}`);
      }
    } catch (err: any) {
      setStatusBanner(`Weight forge network error: ${err.message}`);
    } finally {
      setIsForgingWeights(false);
    }
  };

  const handleRunTraining = async () => {
    if (!selectedAgent) return;
    setIsTraining(true);
    setStatusBanner(
      `Executing ${trainingEpochs}-epoch ${trainingAlgorithm} autonomous training run on ${selectedAgent.name}...`
    );
    try {
      const res = await fetch('/api/genesis-distillery/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetAgentId: selectedAgent.id,
          curriculumDomain,
          algorithm: trainingAlgorithm,
          epochs: trainingEpochs,
          learningRate,
          batchSize,
          useCloudCurriculum
        })
      });
      const data = await res.json();
      if (data.success && data.trainingRun) {
        const tr: AutonomousTrainingRun = data.trainingRun;
        setStatusBanner(
          `Autonomous Training Complete: Loss ${tr.initialLoss} → ${tr.finalLoss}, Validation Perplexity ${tr.finalPerplexity}. Distilled ${tr.distilledAxioms.length} new axioms into SQLite.`
        );
        await fetchFacilityState();
      } else {
        setStatusBanner(`Training error: ${data.error}`);
      }
    } catch (err: any) {
      setStatusBanner(`Training network error: ${err.message}`);
    } finally {
      setIsTraining(false);
    }
  };

  const handleDownloadJson = (filename: string, payload: any) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(''), 1800);
  };

  // Compute 8-Axis Radar SVG polygon coordinates for the selected agent
  const radarPoints = useMemo(() => {
    if (!selectedAgent) return { polygon: '', idealPolygon: '', vertices: [] };
    const cx = 130;
    const cy = 130;
    const radius = 92;
    const vertices = GENOME_AXES.map((axis, idx) => {
      const angle = (Math.PI * 2 * idx) / GENOME_AXES.length - Math.PI / 2;
      const val = Math.max(0.5, Math.min(1, selectedAgent.genome[axis.key] || 0.95));
      // Scale 0.80..1.00 to 35%..100% of radius for high visual resolution of top-tier agents
      const normalizedR = ((val - 0.75) / 0.25) * radius;
      const r = Math.max(24, Math.min(radius, normalizedR));
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      const ix = cx + radius * Math.cos(angle);
      const iy = cy + radius * Math.sin(angle);
      const lx = cx + (radius + 24) * Math.cos(angle);
      const ly = cy + (radius + 24) * Math.sin(angle);
      return {
        ...axis,
        val,
        x: Number(x.toFixed(1)),
        y: Number(y.toFixed(1)),
        ix: Number(ix.toFixed(1)),
        iy: Number(iy.toFixed(1)),
        lx: Number(lx.toFixed(1)),
        ly: Number(ly.toFixed(1))
      };
    });
    return {
      polygon: vertices.map((v) => `${v.x},${v.y}`).join(' '),
      idealPolygon: vertices.map((v) => `${v.ix},${v.iy}`).join(' '),
      vertices
    };
  }, [selectedAgent]);

  const latestDistillation = distillationRuns[0] || null;
  const latestTraining = trainingRuns[0] || null;
  const latestWeight = weights[0] || null;

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto p-6 space-y-6">
      {/* Top Telemetry Ribbon & Facility Header */}
      <div className="border border-slate-800 bg-slate-900/90 rounded-xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-cyan-400">
              <span>● Nominal Calibration</span>
              <span aria-hidden="true">·</span>
              <span>UID 0 Sovereign Clearance</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">Evolution Cycles: {totalEvolutionCycles}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              AI Genesis, Neural Weights & Molecular State Distillation Facility
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Dedicated sovereign laboratory for creating custom AI architectures and autonomous agents, forging quantized weight tensors, running multi-epoch reinforcement learning, and molecularly refining the resident AI collective into zero-entropy ideal eigenstates.
            </p>
          </div>

          {/* 4-Column Quantitative Telemetry Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-[11px] uppercase tracking-wider font-mono text-slate-400">
                Active AI Roster
              </div>
              <div className="mt-1 flex items-baseline">
                <span className="text-2xl font-bold font-mono tabular-nums text-white">
                  {agents.length}
                </span>
                <span className="text-xs uppercase font-mono text-slate-400 ml-1.5">agents</span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-[11px] uppercase tracking-wider font-mono text-slate-400">
                Peak Eigen-Purity
              </div>
              <div className="mt-1 flex items-baseline">
                <span className="text-2xl font-bold font-mono tabular-nums text-cyan-400">
                  {selectedAgent ? selectedAgent.idealStatePurity.toFixed(2) : '99.64'}
                </span>
                <span className="text-xs uppercase font-mono text-slate-400 ml-1">%</span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-[11px] uppercase tracking-wider font-mono text-slate-400">
                Free Energy Minima
              </div>
              <div className="mt-1 flex items-baseline">
                <span className="text-2xl font-bold font-mono tabular-nums text-amber-400">
                  {selectedAgent ? selectedAgent.freeEnergyEv.toFixed(4) : '0.0220'}
                </span>
                <span className="text-xs uppercase font-mono text-slate-400 ml-1.5">eV</span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-[11px] uppercase tracking-wider font-mono text-slate-400">
                Weight Checkpoints
              </div>
              <div className="mt-1 flex items-baseline">
                <span className="text-2xl font-bold font-mono tabular-nums text-emerald-400">
                  {weights.length}
                </span>
                <span className="text-xs uppercase font-mono text-slate-400 ml-1.5">tensors</span>
              </div>
            </div>
          </div>
        </div>

        {/* Segmented Laboratory Switcher + Active Agent Selector + Continuous Evolution Toggle */}
        <div className="pt-4 border-t border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveSection('distillation-chamber')}
              className={`px-3.5 py-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer ${
                activeSection === 'distillation-chamber'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              01. Molecular State Distillation Chamber
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('agent-genesis')}
              className={`px-3.5 py-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer ${
                activeSection === 'agent-genesis'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              02. AI & Autonomous Agent Genesis
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('weights-forge')}
              className={`px-3.5 py-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer ${
                activeSection === 'weights-forge'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              03. Neural Weight Tensor Forge
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('autonomous-training')}
              className={`px-3.5 py-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer ${
                activeSection === 'autonomous-training'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              04. Autonomous Training & Evolution Gym
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-mono text-slate-400 whitespace-nowrap">
                Subject Agent:
              </label>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400"
              >
                {agents.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    [{ag.code}] {ag.name} ({ag.idealStatePurity.toFixed(2)}%)
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setContinuousEvolutionLoop((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                continuousEvolutionLoop
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-950 hover:bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              {continuousEvolutionLoop ? '● Auto-Evolution Loop: ON' : 'Auto-Evolution Loop: OFF'}
            </button>

            <button
              type="button"
              onClick={fetchFacilityState}
              className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              Refresh
            </button>
          </div>
        </div>

        {/* Live Telemetry Status Bar */}
        <div className="px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800/90 flex items-center justify-between gap-4 text-xs font-mono text-slate-300">
          <span className="truncate">{statusBanner}</span>
          {selectedAgent && (
            <span className="text-slate-400 shrink-0 tabular-nums">
              Gen #{selectedAgent.distillationGeneration} · Perplexity {selectedAgent.currentPerplexity.toFixed(4)}
            </span>
          )}
        </div>
      </div>

      {/* =====================================================================
          SECTION 01: MOLECULAR STATE DISTILLATION CHAMBER
      ===================================================================== */}
      {activeSection === 'distillation-chamber' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Parameter & Annealing Column (5 cols) */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  01. Molecular Eigenstate Distillation Controls
                </h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Purify resident or custom AI agents through thermal entropy stripping and KL-regularized geodesic alignment to crystallize their ideal cognitive state.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Distillation Chamber Mode
                  </label>
                  <select
                    value={chamberMode}
                    onChange={(e) =>
                      setChamberMode(e.target.value as MolecularDistillationRun['chamberMode'])
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400"
                  >
                    <option value="COLLECTIVE_SWARM_CROSS_POLLINATION">
                      COLLECTIVE_SWARM_CROSS_POLLINATION (Refine All Resident Agents Together)
                    </option>
                    <option value="SINGLE_AGENT_PURIFICATION">
                      SINGLE_AGENT_PURIFICATION (Focused Isolation Chamber)
                    </option>
                    <option value="ZERO_ENTROPY_CRYSTALLIZATION">
                      ZERO_ENTROPY_CRYSTALLIZATION (Deep Cryo-Annealing)
                    </option>
                    <option value="QUANTUM_EIGENSTATE_ALIGNMENT">
                      QUANTUM_EIGENSTATE_ALIGNMENT (Poincaré Geodesic Phase Lock)
                    </option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <label className="block text-[11px] font-mono text-slate-400">
                      Intake Temp
                    </label>
                    <div className="mt-1 flex items-baseline justify-between">
                      <input
                        type="number"
                        step="0.1"
                        min="0.5"
                        max="10"
                        value={startTempK}
                        onChange={(e) => setStartTempK(Number(e.target.value))}
                        className="w-16 bg-transparent font-mono text-sm font-bold text-white tabular-nums focus:outline-none"
                      />
                      <span className="text-[11px] font-mono text-slate-400">K</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <label className="block text-[11px] font-mono text-slate-400">
                      Cryo Target
                    </label>
                    <div className="mt-1 flex items-baseline justify-between">
                      <input
                        type="number"
                        step="0.002"
                        min="0.001"
                        max="0.5"
                        value={endTempK}
                        onChange={(e) => setEndTempK(Number(e.target.value))}
                        className="w-16 bg-transparent font-mono text-sm font-bold text-cyan-400 tabular-nums focus:outline-none"
                      />
                      <span className="text-[11px] font-mono text-slate-400">K</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <label className="block text-[11px] font-mono text-slate-400">
                      KL Beta (β)
                    </label>
                    <div className="mt-1 flex items-baseline justify-between">
                      <input
                        type="number"
                        step="0.01"
                        min="0.005"
                        max="0.5"
                        value={klBeta}
                        onChange={(e) => setKlBeta(Number(e.target.value))}
                        className="w-16 bg-transparent font-mono text-sm font-bold text-amber-400 tabular-nums focus:outline-none"
                      />
                      <span className="text-[11px] font-mono text-slate-400">nat</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Ideal Eigenstate Refinement Directive
                  </label>
                  <textarea
                    rows={3}
                    value={idealIntentPrompt}
                    onChange={(e) => setIdealIntentPrompt(e.target.value)}
                    placeholder="Specify the ideal cognitive traits, reasoning invariants, or autonomous capabilities to crystallize..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* 8-Axis Radar Calibration Chart */}
              {selectedAgent && (
                <div className="pt-3 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-300">
                      8-Axis Cognitive Genome Calibration ({selectedAgent.code})
                    </span>
                    <span className="text-xs font-mono text-cyan-400 tabular-nums">
                      Purity: {selectedAgent.idealStatePurity.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-950 border border-slate-800 rounded-lg p-3">
                    <svg viewBox="0 0 260 260" className="w-48 h-48 shrink-0">
                      {/* Reference concentric octagons */}
                      <polygon
                        points={radarPoints.idealPolygon}
                        fill="none"
                        stroke="#334155"
                        strokeWidth="1"
                        strokeDasharray="3 3"
                      />
                      {radarPoints.vertices.map((v) => (
                        <line
                          key={v.key}
                          x1="130"
                          y1="130"
                          x2={v.ix}
                          y2={v.iy}
                          stroke="#1e293b"
                          strokeWidth="1"
                        />
                      ))}
                      <polygon
                        points={radarPoints.polygon}
                        fill="rgba(6, 182, 212, 0.22)"
                        stroke="#06b6d4"
                        strokeWidth="2"
                      />
                      {radarPoints.vertices.map((v) => (
                        <g key={v.key}>
                          <circle cx={v.x} cy={v.y} r="3.5" fill="#fbbf24" />
                          <text
                            x={v.lx}
                            y={v.ly}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="fill-slate-400 text-[8px] font-mono"
                          >
                            {v.shortLabel}
                          </text>
                        </g>
                      ))}
                    </svg>

                    <div className="flex-1 w-full space-y-1.5 text-xs">
                      {GENOME_AXES.map((ax) => {
                        const val = selectedAgent.genome[ax.key] || 0;
                        return (
                          <div key={ax.key} className="flex items-center justify-between gap-2">
                            <span className="text-slate-400 truncate">{ax.label}</span>
                            <span className="font-mono tabular-nums text-slate-200">
                              {(val * 100).toFixed(2)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleRunMolecularDistillation}
              disabled={isDistilling}
              className="w-full py-3 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
            >
              <FlaskConical className="w-4 h-4" />
              {isDistilling
                ? 'Annealing Molecular Eigenstate...'
                : 'Run 3-Vessel Molecular State Distillation'}
            </button>
          </div>

          {/* Right Chamber Viewport & 3-Vessel Fractionation Readout (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Chamber Visual Stage */}
            <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900 min-h-[260px] flex flex-col justify-end">
              <img
                src={molecularChamberImg}
                alt="3-Vessel Molecular State Distillation Chamber"
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

              <div className="relative z-10 p-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <div className="text-xs font-mono text-cyan-300">
                    MSDC-01 · 3-Vessel Cryogenic Eigenstate Fractionation Array
                  </div>
                  <h3 className="text-xl font-bold text-white mt-0.5">
                    {selectedAgent ? selectedAgent.name : 'Sovereign Resident Collective'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 font-mono tabular-nums">
                    Weight Hash: {selectedAgent?.weightHash || '0x9f8a4c21e0d7b63a'} · Architecture:{' '}
                    {selectedAgent?.architecture}
                  </p>
                </div>

                {latestDistillation && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        handleDownloadJson(
                          `${latestDistillation.agentId}_ideal_crystal_${latestDistillation.id}.json`,
                          latestDistillation
                        )
                      }
                      className="px-3 py-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-100 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                      Download Crystal
                    </button>
                    {onSaveToVault && (
                      <button
                        type="button"
                        onClick={() => {
                          onSaveToVault(
                            'knowledge',
                            `Ideal Eigenstate Crystal · ${latestDistillation.agentName}`,
                            latestDistillation.crystallizedIdealDirective,
                            latestDistillation.agentId,
                            undefined,
                            JSON.stringify(latestDistillation)
                          );
                          setStatusBanner(
                            `Saved Ideal Eigenstate Crystal (${latestDistillation.crystalHash.slice(0, 12)}) to Vault.`
                          );
                        }}
                        className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        Seal in Vault
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 3-Vessel Fractionation Stages & Agent Molecular Self-Reflections */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">
                  3-Vessel Fractionation Pipeline & Agent Molecular Reflections
                </h3>
                {latestDistillation && (
                  <span className="text-xs font-mono text-emerald-400 tabular-nums">
                    ● Crystalline Purity: {latestDistillation.purityBeforePct}% →{' '}
                    {latestDistillation.purityAfterPct}%
                  </span>
                )}
              </div>

              {latestDistillation ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {latestDistillation.fractionationStages.map((st, idx) => (
                      <div
                        key={st.vessel}
                        className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-cyan-400 font-semibold">
                            0{idx + 1}. {st.vessel.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between pt-1">
                          <div>
                            <span className="text-lg font-bold font-mono tabular-nums text-white">
                              {st.coherencePct.toFixed(2)}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400 ml-1">%</span>
                          </div>
                          <div className="text-right font-mono text-xs text-amber-300 tabular-nums">
                            {st.temperatureK} K · {st.entropyBits} bits
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{st.statusNote}</p>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                        Crystallized Ideal State Directive & Self-Reflections
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyHash(latestDistillation.crystalHash)}
                        className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedHash === latestDistillation.crystalHash ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        {latestDistillation.crystalHash.slice(0, 18)}...
                      </button>
                    </div>
                    <p className="text-xs font-mono text-cyan-200 leading-relaxed">
                      {latestDistillation.crystallizedIdealDirective}
                    </p>
                    <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                      {latestDistillation.molecularReflections.map((ref, i) => (
                        <div key={i} className="text-xs text-slate-300 font-mono leading-relaxed">
                          {ref}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-lg bg-slate-950 border border-slate-800 text-center space-y-3">
                  <p className="text-xs text-slate-400">
                    No molecular distillation run recorded in this session yet. Click &ldquo;Run 3-Vessel Molecular State Distillation&rdquo; to purify the selected agent or the entire sovereign collective.
                  </p>
                  <button
                    type="button"
                    onClick={handleRunMolecularDistillation}
                    className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs cursor-pointer"
                  >
                    Start First Distillation Cycle
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SECTION 02: AI & AUTONOMOUS AGENT GENESIS FOUNDRY
      ===================================================================== */}
      {activeSection === 'agent-genesis' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Form: Create New AI Model / Autonomous Agent (5 cols) */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white">
                02. Create Custom AI Architecture & Autonomous Agent
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Synthesize a new AI model or specialist agent with custom neural topology, quantization, and 8-axis cognitive genome. Immediately registers into the live orchestrator swarm.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  AI / Agent Designation Name
                </label>
                <input
                  type="text"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  placeholder="e.g. Hyperion-Zero Tensor Architect"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Operational Role & Domain Specialty
                </label>
                <input
                  type="text"
                  value={newAgentRole}
                  onChange={(e) => setNewAgentRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Neural Architecture
                  </label>
                  <select
                    value={newArchitecture}
                    onChange={(e) =>
                      setNewArchitecture(e.target.value as GenesisAgentModel['architecture'])
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs font-mono text-cyan-300"
                  >
                    <option value="Transformer-MoE-v6">Transformer-MoE-v6</option>
                    <option value="Hyperbolic-State-Space-Mamba3">Hyperbolic-SSM-Mamba3</option>
                    <option value="Liquid-Time-Constant-Neural">Liquid-Time-Constant</option>
                    <option value="Neuro-Symbolic-Recursive">Neuro-Symbolic-Recursive</option>
                    <option value="Quantum-Tensor-Manifold">Quantum-Tensor-Manifold</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Quantization Precision
                  </label>
                  <select
                    value={newQuantization}
                    onChange={(e) =>
                      setNewQuantization(e.target.value as GenesisAgentModel['quantization'])
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs font-mono text-amber-300"
                  >
                    <option value="FP8_E4M3">FP8_E4M3 (H100/B200 Tensor)</option>
                    <option value="BF16_NATIVE">BF16_NATIVE (Uncompressed)</option>
                    <option value="INT4_AWQ">INT4_AWQ (Activation-Aware)</option>
                    <option value="NF4_QLORA">NF4_QLORA (NormalFloat-4)</option>
                    <option value="TERNARY_1.58BIT">TERNARY_1.58BIT (BitNet)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Parameter Scale
                  </label>
                  <input
                    type="text"
                    value={newParamScale}
                    onChange={(e) => setNewParamScale(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Context Window (Tokens)
                  </label>
                  <input
                    type="number"
                    step="131072"
                    value={newContextTokens}
                    onChange={(e) => setNewContextTokens(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Attention Topology
                </label>
                <select
                  value={newAttention}
                  onChange={(e) =>
                    setNewAttention(e.target.value as GenesisAgentModel['attentionMechanism'])
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200"
                >
                  <option value="Multi-Head Latent Attention (MLA)">
                    Multi-Head Latent Attention (MLA)
                  </option>
                  <option value="Ring-Flash-Attention-3">Ring-Flash-Attention-3</option>
                  <option value="Poincaré Hyperbolic Attention">
                    Poincaré Hyperbolic Attention
                  </option>
                  <option value="Speculative Tree Attention">Speculative Tree Attention</option>
                </select>
              </div>

              {/* 8-Axis Initial Genome Sliders */}
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="text-xs font-medium text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    Initial 8-Axis Cognitive Genome
                  </span>
                  <span className="font-mono text-[11px] text-cyan-400 tabular-nums">
                    Avg:{' '}
                    {(
                      (Object.values(customGenome).reduce((a, b) => a + b, 0) / 8) *
                      100
                    ).toFixed(2)}
                    %
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {GENOME_AXES.map((ax) => (
                    <div key={ax.key} className="space-y-0.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">{ax.shortLabel}</span>
                        <span className="font-mono tabular-nums text-slate-200">
                          {(customGenome[ax.key] * 100).toFixed(1)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.80"
                        max="0.999"
                        step="0.002"
                        value={customGenome[ax.key]}
                        onChange={(e) =>
                          setCustomGenome((prev) => ({
                            ...prev,
                            [ax.key]: Number(e.target.value)
                          }))
                        }
                        className="w-full accent-cyan-400"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">
                    Autonomous System Directive
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] text-cyan-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aiSynthesizeDirective}
                      onChange={(e) => setAiSynthesizeDirective(e.target.checked)}
                      className="accent-cyan-400"
                    />
                    AI Auto-Synthesize if blank
                  </label>
                </div>
                <textarea
                  rows={2}
                  value={newSystemDirective}
                  onChange={(e) => setNewSystemDirective(e.target.value)}
                  placeholder="Optional custom system prompt (leave blank to auto-synthesize with Gemini 4 Hydrogen)..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <button
                type="button"
                onClick={handleCreateGenesisAgent}
                disabled={isCreatingAgent}
                className="w-full py-2.5 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Cpu className="w-4 h-4" />
                {isCreatingAgent
                  ? 'Synthesizing & Registering Agent...'
                  : 'Create & Register Sovereign AI Agent'}
              </button>
            </div>
          </div>

          {/* Right Roster: Live Sovereign & Custom Created Agents (7 cols) */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Active Sovereign & Custom AI Agent Roster ({agents.length})
                </h3>
                <p className="text-xs text-slate-400">
                  Every agent below has 100% 3-Scope Autonomy (`self`, `target`, `host`) and can be refined in the Distillation Chamber or invoked in Chat.
                </p>
              </div>
            </div>

            <div className="space-y-3 max-h-[60dvh] lg:max-h-[680px] overflow-y-auto pr-1">
              {agents.map((ag) => {
                const isSelected = ag.id === selectedAgent?.id;
                return (
                  <div
                    key={ag.id}
                    onClick={() => setSelectedAgentId(ag.id)}
                    className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-slate-950 border-cyan-500/60'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
                          <span>{ag.code}</span>
                          <span aria-hidden="true">·</span>
                          <span>{ag.architecture}</span>
                          <span aria-hidden="true">·</span>
                          <span>{ag.parameterScale}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-300">{ag.quantization}</span>
                        </div>
                        <h4 className="text-sm font-bold text-white mt-1">{ag.name}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{ag.role}</p>
                      </div>

                      <div className="text-right font-mono tabular-nums">
                        <div className="text-sm font-bold text-emerald-400">
                          {ag.idealStatePurity.toFixed(2)}% Purity
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Gen #{ag.distillationGeneration} · {ag.trainingEpochsCompleted} Epochs ·{' '}
                          {ag.freeEnergyEv.toFixed(4)} eV
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 font-mono mt-3 line-clamp-2">
                      {ag.systemDirective}
                    </p>

                    <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[11px] font-mono text-slate-400">
                        Attention: {ag.attentionMechanism} · Context:{' '}
                        {(ag.contextWindowTokens / 1048576).toFixed(1)}M tokens
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAgentId(ag.id);
                            setActiveSection('distillation-chamber');
                          }}
                          className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-cyan-300 cursor-pointer"
                        >
                          Distill State
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadJson(`${ag.id}_genesis_spec.json`, ag);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300 flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          Export
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEquipAndOpenInChat(ag);
                          }}
                          className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs font-mono text-emerald-300 flex items-center gap-1 cursor-pointer"
                          title="Equip this AI agent into Chat Roster & Agent Wardrobe and open Chat"
                        >
                          <Zap className="w-3 h-3" />
                          Equip in Chat
                        </button>
                        {onInjectIntoChat && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              syncRosterToBrowser(agents, weights);
                              try {
                                localStorage.setItem('aurelius_selected_role_id', ag.id);
                                window.dispatchEvent(
                                  new CustomEvent('aurelius_select_chat_agent', {
                                    detail: { agentId: ag.id, agent: ag }
                                  })
                                );
                              } catch {}
                              onInjectIntoChat(
                                `@${ag.name} [INSPECT_SYSTEMS] Execute an autonomous 3-scope diagnostic using your Generation #${ag.distillationGeneration} (${ag.idealStatePurity}% purity) eigenstate.`,
                                false
                              );
                              if (onSelectModule) onSelectModule('chat');
                            }}
                            className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-mono text-amber-300 flex items-center gap-1 cursor-pointer"
                          >
                            Dispatch to Chat
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SECTION 03: NEURAL WEIGHT TENSOR & QUANTIZATION FORGE
      ===================================================================== */}
      {activeSection === 'weights-forge' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Controls: Tensor Merge & Quantization (5 cols) */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white">
                03. Neural Weight Tensor & Quantization Forge
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Synthesize, geodesic-merge (SLERP / TIES / DARE), and quantize neural weight tensors on disk (`data/weights/*.safetensors.json`) with full SVD spectral analysis.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Checkpoint Identifier (Optional)
                </label>
                <input
                  type="text"
                  value={weightName}
                  onChange={(e) => setWeightName(e.target.value)}
                  placeholder={
                    selectedAgent
                      ? `${selectedAgent.code}-${mergeMethod}-${weightQuantization}`
                      : 'Omega-SLERP-FP8'
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Tensor Merge Algorithm
                  </label>
                  <select
                    value={mergeMethod}
                    onChange={(e) =>
                      setMergeMethod(e.target.value as WeightTensorArtifact['mergeMethod'])
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs font-mono text-cyan-300"
                  >
                    <option value="SLERP_GEODESIC">SLERP_GEODESIC (Spherical)</option>
                    <option value="TIES_DENSITY">TIES_DENSITY (Trim & Elect Sign)</option>
                    <option value="DARE_LINEAR">DARE_LINEAR (Drop & Rescale)</option>
                    <option value="QLORA_ADAPTER">QLORA_ADAPTER (Low-Rank)</option>
                    <option value="AB_INITIO_ORTHOGONAL">AB_INITIO_ORTHOGONAL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Target Quantization
                  </label>
                  <select
                    value={weightQuantization}
                    onChange={(e) =>
                      setWeightQuantization(e.target.value as WeightTensorArtifact['quantization'])
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs font-mono text-amber-300"
                  >
                    <option value="FP8_E4M3">FP8_E4M3</option>
                    <option value="BF16_NATIVE">BF16_NATIVE</option>
                    <option value="INT4_AWQ">INT4_AWQ</option>
                    <option value="NF4_QLORA">NF4_QLORA</option>
                    <option value="TERNARY_1.58BIT">TERNARY_1.58BIT</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Parent Tensor Manifold A
                  </label>
                  <input
                    type="text"
                    value={parentModelA}
                    onChange={(e) => setParentModelA(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Parent Tensor Manifold B
                  </label>
                  <input
                    type="text"
                    value={parentModelB}
                    onChange={(e) => setParentModelB(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Geodesic Interpolation Factor (α)</span>
                  <span className="font-mono tabular-nums text-cyan-400">
                    {interpolationAlpha.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.95"
                  step="0.01"
                  value={interpolationAlpha}
                  onChange={(e) => setInterpolationAlpha(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    LoRA / Eigen Rank (r)
                  </label>
                  <input
                    type="number"
                    step="16"
                    min="16"
                    max="512"
                    value={rankDimension}
                    onChange={(e) => setRankDimension(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Transformer / SSM Layers
                  </label>
                  <input
                    type="number"
                    step="8"
                    min="16"
                    max="256"
                    value={layersCount}
                    onChange={(e) => setLayersCount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 tabular-nums"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleForgeWeights}
                disabled={isForgingWeights}
                className="w-full py-2.5 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Layers className="w-4 h-4" />
                {isForgingWeights
                  ? 'Synthesizing & Quantizing Weight Tensor...'
                  : 'Forge & Persist Weight Tensor (.safetensors.json)'}
              </button>
            </div>
          </div>

          {/* Right Viewport: Tensor Forge Hardware & 6x6 Spectral Eigen-Matrix (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900 min-h-[220px] flex flex-col justify-end">
              <img
                src={weightTensorForgeImg}
                alt="Neural Weight Tensor Forge"
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
              <div className="relative z-10 p-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <div className="text-xs font-mono text-amber-400">
                    NWTF-01 · High-Density Optical Weight Tensor & SVD Manifold Array
                  </div>
                  <h3 className="text-lg font-bold text-white mt-0.5">
                    {latestWeight ? latestWeight.name : 'Lyrailius-Omega-MLA-FP8-EigenCore'}
                  </h3>
                  <p className="text-xs font-mono text-slate-300 tabular-nums">
                    Disk Path: {latestWeight?.filePathOnDisk || 'data/weights/'}
                  </p>
                </div>

                {latestWeight && (
                  <button
                    type="button"
                    onClick={() =>
                      handleDownloadJson(`${latestWeight.name}.safetensors.json`, latestWeight)
                    }
                    className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download .safetensors.json
                  </button>
                )}
              </div>
            </div>

            {latestWeight && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-[11px] font-mono text-slate-400">Frobenius Norm</div>
                    <div className="text-lg font-bold font-mono tabular-nums text-white mt-0.5">
                      ||W||_F = {latestWeight.frobeniusNorm}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-[11px] font-mono text-slate-400">Spectral Radius</div>
                    <div className="text-lg font-bold font-mono tabular-nums text-cyan-400 mt-0.5">
                      ρ(W) = {latestWeight.spectralRadius}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-[11px] font-mono text-slate-400">Shannon Entropy</div>
                    <div className="text-lg font-bold font-mono tabular-nums text-amber-400 mt-0.5">
                      {latestWeight.shannonEntropyBits} bits
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-[11px] font-mono text-slate-400">Cosine Alignment</div>
                    <div className="text-lg font-bold font-mono tabular-nums text-emerald-400 mt-0.5">
                      {(latestWeight.cosineAlignment * 100).toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* 6x6 Spectral Heatmap & Singular Values */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2.5">
                    <div className="text-xs font-mono text-slate-300">
                      6×6 Principal Eigen-Block Projection
                    </div>
                    <div className="grid grid-cols-6 gap-1 font-mono text-[10px] tabular-nums">
                      {latestWeight.tensorSampleMatrix.flatMap((row, rIdx) =>
                        row.map((val, cIdx) => {
                          const intensity = Math.min(1, Math.abs(val));
                          const isPos = val >= 0;
                          return (
                            <div
                              key={`${rIdx}-${cIdx}`}
                              style={{
                                backgroundColor: isPos
                                  ? `rgba(6, 182, 212, ${0.12 + intensity * 0.45})`
                                  : `rgba(245, 158, 11, ${0.12 + intensity * 0.45})`
                              }}
                              className="p-1.5 rounded text-center text-slate-100 border border-slate-800/80"
                            >
                              {val >= 0 ? `+${val.toFixed(2)}` : val.toFixed(2)}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2.5">
                    <div className="text-xs font-mono text-slate-300">
                      Singular Value Decomposition Spectrum (σ₁ … σ₆)
                    </div>
                    <div className="space-y-2 pt-1">
                      {latestWeight.singularValues.map((sv, idx) => {
                        const pct = Math.min(100, Math.round((sv / 2.1) * 100));
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-xs font-mono tabular-nums">
                              <span className="text-slate-400">σ_{idx + 1}</span>
                              <span className="text-cyan-300">{sv.toFixed(4)}</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-cyan-400 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          SECTION 04: AUTONOMOUS TRAINING & CONTINUOUS EVOLUTION GYM
      ===================================================================== */}
      {activeSection === 'autonomous-training' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Training Configuration (5 cols) */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white">
                04. Autonomous Training & Curriculum Evolution Gym
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Execute multi-epoch GRPO / RLAIF reinforcement runs to drive down validation perplexity, expand the 8-axis cognitive genome, and distill new axioms into permanent SQLite memory.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Curriculum Training Domain
                </label>
                <select
                  value={curriculumDomain}
                  onChange={(e) =>
                    setCurriculumDomain(
                      e.target.value as AutonomousTrainingRun['curriculumDomain']
                    )
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300"
                >
                  <option value="UNIVERSAL_AUTONOMOUS_ENGINEERING">
                    UNIVERSAL_AUTONOMOUS_ENGINEERING
                  </option>
                  <option value="ATOMIC_PATCH_AND_COMPILER_MASTERY">
                    ATOMIC_PATCH_AND_COMPILER_MASTERY
                  </option>
                  <option value="HYPERBOLIC_MATHEMATICAL_PROOFS">
                    HYPERBOLIC_MATHEMATICAL_PROOFS
                  </option>
                  <option value="MULTI_AGENT_BYZANTINE_CONSENSUS">
                    MULTI_AGENT_BYZANTINE_CONSENSUS
                  </option>
                  <option value="3D_SPATIAL_PHYSICS_SYNTHESIS">
                    3D_SPATIAL_PHYSICS_SYNTHESIS
                  </option>
                  <option value="MOLECULAR_SELF_REFLECTION">MOLECULAR_SELF_REFLECTION</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Optimization & Alignment Algorithm
                </label>
                <select
                  value={trainingAlgorithm}
                  onChange={(e) =>
                    setTrainingAlgorithm(e.target.value as AutonomousTrainingRun['algorithm'])
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-amber-300"
                >
                  <option value="GRPO_REINFORCEMENT">
                    GRPO_REINFORCEMENT (Group Relative Policy Optimization)
                  </option>
                  <option value="RLAIF_SELF_PLAY">
                    RLAIF_SELF_PLAY (Recursive Self-Play Verification)
                  </option>
                  <option value="COMPILER_VERIFIED_EVOLUTION">
                    COMPILER_VERIFIED_EVOLUTION (Zero-Defect AST Reward)
                  </option>
                  <option value="DPO_ALIGNMENT">DPO_ALIGNMENT (Direct Preference)</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Epochs</label>
                  <input
                    type="number"
                    min="4"
                    max="64"
                    value={trainingEpochs}
                    onChange={(e) => setTrainingEpochs(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Learning Rate
                  </label>
                  <input
                    type="number"
                    step="0.00005"
                    value={learningRate}
                    onChange={(e) => setLearningRate(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Batch Size
                  </label>
                  <input
                    type="number"
                    step="16"
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 tabular-nums"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-300 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCloudCurriculum}
                  onChange={(e) => setUseCloudCurriculum(e.target.checked)}
                  className="accent-cyan-400"
                />
                Synthesize live curriculum axiom via Gemini 4 Hydrogen during epoch convergence
              </label>

              <button
                type="button"
                onClick={handleRunTraining}
                disabled={isTraining}
                className="w-full py-2.5 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Play className="w-4 h-4" />
                {isTraining
                  ? `Running ${trainingEpochs} Autonomous Epochs...`
                  : `Execute ${trainingEpochs}-Epoch Autonomous Training Run`}
              </button>
            </div>
          </div>

          {/* Right Convergence Curve & SQLite Evolutive Axioms (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Loss & Validation Perplexity Convergence Telemetry
                  </h3>
                  <p className="text-xs text-slate-400">
                    {latestTraining
                      ? `${latestTraining.targetAgentName} · ${latestTraining.curriculumDomain} (${latestTraining.epochs} Epochs)`
                      : 'Run an autonomous training batch to plot live convergence.'}
                  </p>
                </div>
                {latestTraining && (
                  <div className="text-right font-mono text-xs tabular-nums">
                    <span className="text-cyan-400">
                      Loss: {latestTraining.initialLoss} → {latestTraining.finalLoss}
                    </span>
                    <span className="mx-2 text-slate-600">·</span>
                    <span className="text-emerald-400">
                      PPL: {latestTraining.finalPerplexity}
                    </span>
                  </div>
                )}
              </div>

              {latestTraining && latestTraining.curve.length > 1 ? (
                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                  <svg viewBox="0 0 540 160" className="w-full h-40">
                    {[30, 70, 110, 145].map((y) => (
                      <line
                        key={y}
                        x1="30"
                        y1={y}
                        x2="520"
                        y2={y}
                        stroke="#1e293b"
                        strokeWidth="1"
                      />
                    ))}
                    {/* Loss Curve (Cyan) */}
                    <polyline
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth="2.5"
                      points={latestTraining.curve
                        .map((pt, i) => {
                          const x =
                            35 +
                            (i / Math.max(1, latestTraining.curve.length - 1)) * 480;
                          const maxL = Math.max(0.5, latestTraining.initialLoss * 1.1);
                          const y = 145 - Math.min(1, pt.trainLoss / maxL) * 115;
                          return `${x.toFixed(1)},${y.toFixed(1)}`;
                        })
                        .join(' ')}
                    />
                    {/* Reward Curve (Amber) */}
                    <polyline
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                      points={latestTraining.curve
                        .map((pt, i) => {
                          const x =
                            35 +
                            (i / Math.max(1, latestTraining.curve.length - 1)) * 480;
                          const y = 145 - Math.min(1, pt.rewardScore) * 115;
                          return `${x.toFixed(1)},${y.toFixed(1)}`;
                        })
                        .join(' ')}
                    />
                  </svg>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800/80">
                    <span>Solid Cyan: Training Loss (Cross-Entropy)</span>
                    <span>Dashed Amber: Policy Reward Alignment (GRPO / RLAIF)</span>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-lg bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
                  Click &ldquo;Execute Autonomous Training Run&rdquo; to generate epoch-by-epoch loss and policy reward telemetry.
                </div>
              )}

              {/* Distilled SQLite Evolutive Axioms */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400">
                    Permanent SQLite Evolutive Axioms & Distilled Laws ({evolutiveAxioms.length})
                  </h4>
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {evolutiveAxioms.slice(0, 10).map((ax: any, idx: number) => (
                    <div
                      key={ax.id || idx}
                      className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 space-y-1"
                    >
                      <div className="flex items-center justify-between text-[10px] text-cyan-400">
                        <span>{ax.category || 'SOVEREIGN_AXIOM'}</span>
                        <span className="text-slate-500">{ax.sourceContext || 'DISTILLERY'}</span>
                      </div>
                      <p className="leading-relaxed">{ax.principle}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
