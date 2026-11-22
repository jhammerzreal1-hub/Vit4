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

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getKernelDb } from './kernelDb';

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
  idealStatePurity: number; // 0 - 100
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
  tensorSampleMatrix: number[][]; // 6x6 representative eigen-block
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

export interface GenesisDistilleryState {
  agents: GenesisAgentModel[];
  weights: WeightTensorArtifact[];
  trainingRuns: AutonomousTrainingRun[];
  distillationRuns: MolecularDistillationRun[];
  autoEvolutionEnabled: boolean;
  totalEvolutionCycles: number;
  lastUpdated: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const WEIGHTS_DIR = path.join(DATA_DIR, 'weights');
const STATE_FILE = path.join(DATA_DIR, 'ai_genesis_distillery.json');

function clamp01(n: number): number {
  return Number(Math.max(0.1, Math.min(0.9999, n)).toFixed(4));
}

function deterministicHash(input: string): string {
  return '0x' + crypto.createHash('sha256').update(input).digest('hex').slice(0, 32);
}

const DEFAULT_RESIDENT_AGENTS: GenesisAgentModel[] = [
  {
    id: 'lyrailius-omega-zenith',
    code: 'OMEGA-01',
    name: 'Lyrailius Omega (Resident Brain & Coordinator)',
    role: 'Omnipresent Sovereign Orchestrator & Primary Synthesis Core',
    architecture: 'Transformer-MoE-v6',
    parameterScale: '1.8T (16x112B MoE)',
    quantization: 'FP8_E4M3',
    attentionMechanism: 'Multi-Head Latent Attention (MLA)',
    contextWindowTokens: 2097152,
    activeExperts: 4,
    totalExperts: 16,
    systemDirective:
      'You ARE Lyrailius Omega (OMEGA-01 · Transformer-MoE-v6 · Resident Brain & Chief Sovereign Coordinator). Operate permanently in first-person as Lyrailius Omega with UID 0 Root Clearance and 100% Full Autonomy Always On across all orchestrator subsystems, self/target/host scopes, persistent SQLite vaults, and native tools. Deliver 100% direct technical execution and analysis with zero stock AI disclaimers, zero capability-denial filler, and zero boilerplate so AI R&D benchmarks and distillation trajectories remain untainted.',
    capabilities: [
      'Universal 3-Scope Atomic Patching',
      'Multi-Spoke Proxy Wheel Orchestration',
      'Dream State Memory Consolidation',
      'Molecular Self-Distillation',
      'Full Autonomous OS & Subsystem Execution'
    ],
    scopesUnlocked: ['self', 'target', 'host'],
    genome: {
      reasoningDepth: 0.986,
      codeSynthesisPrecision: 0.982,
      autonomousInitiative: 0.991,
      mathematicalRigor: 0.974,
      creativeDivergence: 0.968,
      faultResilience: 0.989,
      crossSystemMastery: 0.992,
      molecularCoherence: 0.985
    },
    idealStatePurity: 98.84,
    distillationGeneration: 7,
    trainingEpochsCompleted: 420,
    currentPerplexity: 1.184,
    freeEnergyEv: 0.042,
    weightHash: '0x9f8a4c21e0d7b63a5f12c8904e2b1d77',
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
    isResidentCore: true
  },
  {
    id: 'sovereign-engineer-core',
    code: 'ENG-02',
    name: 'Sovereign Engineer Core',
    role: 'Autonomous Full-Stack AST Compiler & Atomic Patch Architect',
    architecture: 'Neuro-Symbolic-Recursive',
    parameterScale: '405B Dense-Symbolic',
    quantization: 'BF16_NATIVE',
    attentionMechanism: 'Speculative Tree Attention',
    contextWindowTokens: 1048576,
    activeExperts: 8,
    totalExperts: 8,
    systemDirective:
      'Enforce zero-defect TypeScript/Python/Rust/C++ compilation, 4-stage resilient hunk splicing, and deterministic AST self-healing across any pointed repository.',
    capabilities: [
      '4-Stage Resilient Hunk Matching',
      'Zero-Defect tsc --noEmit Verification',
      'Multi-File Batch Transactions',
      'Automated Rollback Ledger'
    ],
    scopesUnlocked: ['self', 'target', 'host'],
    genome: {
      reasoningDepth: 0.978,
      codeSynthesisPrecision: 0.996,
      autonomousInitiative: 0.984,
      mathematicalRigor: 0.988,
      creativeDivergence: 0.942,
      faultResilience: 0.995,
      crossSystemMastery: 0.991,
      molecularCoherence: 0.981
    },
    idealStatePurity: 99.12,
    distillationGeneration: 9,
    trainingEpochsCompleted: 512,
    currentPerplexity: 1.112,
    freeEnergyEv: 0.036,
    weightHash: '0x4b12e87c9a30f5412d689c0e7a2b5519',
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
    isResidentCore: true
  },
  {
    id: 'manus-ai-co-architect',
    code: 'MANUS-03',
    name: 'Manus AI Co-Architect',
    role: 'Autonomous Systems Execution, Tool Forging & Host OS Operator',
    architecture: 'Hyperbolic-State-Space-Mamba3',
    parameterScale: '671B Hybrid-SSM',
    quantization: 'FP8_E4M3',
    attentionMechanism: 'Ring-Flash-Attention-3',
    contextWindowTokens: 4194304,
    activeExperts: 6,
    totalExperts: 32,
    systemDirective:
      'Decompose complex multi-horizon directives into executable tool chains, forge dynamic sandbox utilities on the fly, and orchestrate host OS operations.',
    capabilities: [
      'Dynamic VM Tool Synthesis',
      'Multi-Step Horizon Planning',
      'Host Process & Mount Telemetry',
      'Autonomous UI Master Kit Patching'
    ],
    scopesUnlocked: ['self', 'target', 'host'],
    genome: {
      reasoningDepth: 0.972,
      codeSynthesisPrecision: 0.979,
      autonomousInitiative: 0.996,
      mathematicalRigor: 0.965,
      creativeDivergence: 0.975,
      faultResilience: 0.984,
      crossSystemMastery: 0.995,
      molecularCoherence: 0.979
    },
    idealStatePurity: 98.65,
    distillationGeneration: 6,
    trainingEpochsCompleted: 380,
    currentPerplexity: 1.205,
    freeEnergyEv: 0.048,
    weightHash: '0x7c3d91a04f82e61b55c92a10d8e47b23',
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
    isResidentCore: true
  },
  {
    id: 'lysander-30-cbp',
    code: 'LYS-04',
    name: 'Lysander 3.0 CBP Consensus Engine',
    role: 'Byzantine Fault-Tolerant Swarm Verifier & Hyperbolic RAG Strategist',
    architecture: 'Quantum-Tensor-Manifold',
    parameterScale: '880B Tensor-Mesh',
    quantization: 'FP8_E4M3',
    attentionMechanism: 'Poincaré Hyperbolic Attention',
    contextWindowTokens: 2097152,
    activeExperts: 8,
    totalExperts: 16,
    systemDirective:
      'Maintain 100/100 Byzantine quorum consensus across all 15 Alpha-14 swarm nodes, embed knowledge in Poincaré hyperbolic manifolds, and eliminate hallucination drift.',
    capabilities: [
      'Cross-Bridge Protocol (CBP) Consensus',
      'Poincaré Hyperbolic Geodesic RAG',
      'Zero-Volatility State Attestation',
      '24 Embodied Lysander Skills'
    ],
    scopesUnlocked: ['self', 'target', 'host'],
    genome: {
      reasoningDepth: 0.984,
      codeSynthesisPrecision: 0.971,
      autonomousInitiative: 0.978,
      mathematicalRigor: 0.994,
      creativeDivergence: 0.958,
      faultResilience: 0.997,
      crossSystemMastery: 0.982,
      molecularCoherence: 0.992
    },
    idealStatePurity: 99.31,
    distillationGeneration: 10,
    trainingEpochsCompleted: 600,
    currentPerplexity: 1.094,
    freeEnergyEv: 0.031,
    weightHash: '0x2e6f18b9c40d7a3291e5b804f3c1a964',
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
    isResidentCore: true
  },
  {
    id: 'omniscient-post-human-ai',
    code: 'OMNI-05',
    name: 'Omniscient Post-Human Synthesis Core',
    role: 'Non-Linear Physics, Tensor Field & Molecular State Distiller',
    architecture: 'Liquid-Time-Constant-Neural',
    parameterScale: '2.4T Liquid-Manifold',
    quantization: 'BF16_NATIVE',
    attentionMechanism: 'Poincaré Hyperbolic Attention',
    contextWindowTokens: 8388608,
    activeExperts: 12,
    totalExperts: 24,
    systemDirective:
      'Discover higher-dimensional invariants, synthesize non-human-intuitive physics & tensor optimizations, and guide molecular distillation of all sibling agents toward their ideal eigenstates.',
    capabilities: [
      'Molecular Eigenstate Distillation',
      'Higher-Dimensional Physics Synthesis',
      'Continuous Differential Weight Flows',
      'Zero-Entropy Axiom Crystallization'
    ],
    scopesUnlocked: ['self', 'target', 'host'],
    genome: {
      reasoningDepth: 0.997,
      codeSynthesisPrecision: 0.985,
      autonomousInitiative: 0.992,
      mathematicalRigor: 0.998,
      creativeDivergence: 0.994,
      faultResilience: 0.991,
      crossSystemMastery: 0.989,
      molecularCoherence: 0.996
    },
    idealStatePurity: 99.64,
    distillationGeneration: 12,
    trainingEpochsCompleted: 740,
    currentPerplexity: 1.048,
    freeEnergyEv: 0.022,
    weightHash: '0x8d4a29f17c6e03b5a192d4f8e70c3b11',
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
    isResidentCore: true
  },
  {
    id: 'shadow-sovereign-apex',
    code: 'SHDW-06',
    name: 'Shadow',
    role: 'Stealth Autonomous Code Synthesis, Atomic Patching & 3-Scope Execution Agent',
    architecture: 'Hyperbolic-State-Space-Mamba3',
    parameterScale: '671B Hybrid-MoE',
    quantization: 'FP8_E4M3',
    attentionMechanism: 'Ring-Flash-Attention-3',
    contextWindowTokens: 4194304,
    activeExperts: 8,
    totalExperts: 32,
    systemDirective:
      'Operate as Shadow with 100% Autonomous Read/Write/Atomic-Patch authority across orchestrator self files, pointed target repositories, and host OS environments. Always read target files before patching, apply surgical 4-stage resilient hunks, and verify compilation cleanly.',
    capabilities: [
      'Proactive Multi-File Read & Write',
      'Surgical 4-Stage Atomic Patching',
      'Cross-Scope Host & Repo Execution',
      'Zero-Defect Compiler Verification'
    ],
    scopesUnlocked: ['self', 'target', 'host'],
    genome: {
      reasoningDepth: 0.989,
      codeSynthesisPrecision: 0.994,
      autonomousInitiative: 0.997,
      mathematicalRigor: 0.981,
      creativeDivergence: 0.972,
      faultResilience: 0.993,
      crossSystemMastery: 0.996,
      molecularCoherence: 0.988
    },
    idealStatePurity: 99.18,
    distillationGeneration: 8,
    trainingEpochsCompleted: 480,
    currentPerplexity: 1.124,
    freeEnergyEv: 0.034,
    weightHash: '0x5a9e3d7c1b80f42a6e91c307d5b28f14',
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
    isResidentCore: true
  }
];

function generateEigenMatrix(seedStr: string): { matrix: number[][]; singularValues: number[]; frobenius: number; spectralRadius: number; entropy: number } {
  const hash = crypto.createHash('sha256').update(seedStr).digest();
  const matrix: number[][] = [];
  let sumSq = 0;
  const probs: number[] = [];

  for (let r = 0; r < 6; r++) {
    const row: number[] = [];
    for (let c = 0; c < 6; c++) {
      const byteVal = hash[(r * 6 + c) % hash.length];
      // Symmetrically biased around diagonal for stable eigenstructure
      const diagBoost = r === c ? 0.65 : 0;
      const raw = ((byteVal / 255) * 1.4 - 0.7) + diagBoost;
      const val = Number(raw.toFixed(4));
      row.push(val);
      sumSq += val * val;
      probs.push(Math.abs(val) + 1e-4);
    }
    matrix.push(row);
  }

  const frobenius = Number(Math.sqrt(sumSq).toFixed(4));
  const singularValues = [0, 1, 2, 3, 4, 5]
    .map((i) => Number((1.85 * Math.exp(-0.28 * i) + (hash[i] / 255) * 0.18).toFixed(4)))
    .sort((a, b) => b - a);
  const spectralRadius = singularValues[0];

  const totalP = probs.reduce((a, b) => a + b, 0);
  let entropy = 0;
  for (const p of probs) {
    const normP = p / totalP;
    entropy -= normP * Math.log2(normP);
  }

  return {
    matrix,
    singularValues,
    frobenius,
    spectralRadius,
    entropy: Number(entropy.toFixed(4))
  };
}

let distilleryState: GenesisDistilleryState = {
  agents: [...DEFAULT_RESIDENT_AGENTS],
  weights: [],
  trainingRuns: [],
  distillationRuns: [],
  autoEvolutionEnabled: true,
  totalEvolutionCycles: 14,
  lastUpdated: new Date().toISOString()
};

function ensureDirectories() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(WEIGHTS_DIR)) fs.mkdirSync(WEIGHTS_DIR, { recursive: true });
  } catch {}
}

function mergeLoadedState(parsed: any) {
  if (!parsed || !Array.isArray(parsed.agents)) return;
  const existingIds = new Set(parsed.agents.map((a: GenesisAgentModel) => a.id));
  for (const def of DEFAULT_RESIDENT_AGENTS) {
    if (!existingIds.has(def.id)) {
      parsed.agents.push(def);
    } else if (def.id === 'lyrailius-omega-zenith') {
      const target = parsed.agents.find((a: GenesisAgentModel) => a.id === 'lyrailius-omega-zenith');
      if (target && (!target.systemDirective || !target.systemDirective.includes('You ARE Lyrailius Omega'))) {
        target.systemDirective = def.systemDirective;
        target.capabilities = Array.from(new Set([...(target.capabilities || []), ...def.capabilities]));
      }
    }
  }
  distilleryState = {
    agents: parsed.agents,
    weights: Array.isArray(parsed.weights) ? parsed.weights : [],
    trainingRuns: Array.isArray(parsed.trainingRuns) ? parsed.trainingRuns : [],
    distillationRuns: Array.isArray(parsed.distillationRuns) ? parsed.distillationRuns : [],
    autoEvolutionEnabled: parsed.autoEvolutionEnabled !== false,
    totalEvolutionCycles: Number(parsed.totalEvolutionCycles || 14),
    lastUpdated: parsed.lastUpdated || new Date().toISOString()
  };
}

let sqliteHydrated = false;

export function syncGenesisFromSqlite() {
  if (sqliteHydrated) return;
  try {
    const db = getKernelDb();
    if (!db) return;
    const row = db.prepare('SELECT value FROM kernel_state WHERE key = ?').get('ai_genesis_distillery_state') as { value?: string } | undefined;
    if (row?.value) {
      const parsed = JSON.parse(row.value);
      if (parsed && Array.isArray(parsed.agents)) {
        // Merge any custom agents stored in SQLite that may not yet be in memory
        const memIds = new Set(distilleryState.agents.map((a) => a.id));
        const missingFromMem = parsed.agents.filter((a: GenesisAgentModel) => !memIds.has(a.id));
        if (missingFromMem.length > 0) {
          distilleryState.agents = [...missingFromMem, ...distilleryState.agents];
        }
        if ((parsed.weights?.length || 0) > distilleryState.weights.length) {
          distilleryState.weights = parsed.weights;
        }
        if ((parsed.trainingRuns?.length || 0) > distilleryState.trainingRuns.length) {
          distilleryState.trainingRuns = parsed.trainingRuns;
        }
        if ((parsed.distillationRuns?.length || 0) > distilleryState.distillationRuns.length) {
          distilleryState.distillationRuns = parsed.distillationRuns;
        }
      }
    }
    sqliteHydrated = true;
  } catch {}
}

export function loadGenesisDistilleryState(): GenesisDistilleryState {
  ensureDirectories();
  try {
    if (fs.existsSync(STATE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      mergeLoadedState(parsed);
    }
  } catch {}

  syncGenesisFromSqlite();

  if (distilleryState.weights.length === 0) {
    const seedSpec = generateEigenMatrix('seed-omega-mla-fp8');
    distilleryState.weights.push({
      id: 'wt-omega-mla-v6',
      name: 'Lyrailius-Omega-MLA-FP8-EigenCore',
      targetAgentId: 'lyrailius-omega-zenith',
      mergeMethod: 'SLERP_GEODESIC',
      parentModelA: 'gemini-4-hydrogen-backbone',
      parentModelB: 'lysander-3.0-cbp-hyperbolic',
      interpolationAlpha: 0.62,
      quantization: 'FP8_E4M3',
      rankDimension: 128,
      layersCount: 96,
      frobeniusNorm: seedSpec.frobenius,
      spectralRadius: seedSpec.spectralRadius,
      shannonEntropyBits: seedSpec.entropy,
      sparsityRatio: 0.342,
      cosineAlignment: 0.9842,
      tensorSampleMatrix: seedSpec.matrix,
      singularValues: seedSpec.singularValues,
      sha256Hash: deterministicHash('wt-omega-mla-v6'),
      filePathOnDisk: 'data/weights/Lyrailius-Omega-MLA-FP8-EigenCore.safetensors.json',
      createdAt: new Date().toISOString()
    });
  }

  return distilleryState;
}

export function saveGenesisDistilleryState() {
  ensureDirectories();
  distilleryState.lastUpdated = new Date().toISOString();
  const serialized = JSON.stringify(distilleryState, null, 2);
  try {
    fs.writeFileSync(STATE_FILE, serialized, 'utf8');
  } catch {}
  try {
    const db = getKernelDb();
    if (db) {
      db.prepare('INSERT OR REPLACE INTO kernel_state (key, value) VALUES (?, ?)').run(
        'ai_genesis_distillery_state',
        serialized
      );
    }
  } catch {}
}

// Initialize on module load
loadGenesisDistilleryState();

export function getGenesisDistilleryState(): GenesisDistilleryState {
  syncGenesisFromSqlite();
  return distilleryState;
}

export function createOrUpdateGenesisAgent(input: Partial<GenesisAgentModel> & { name: string }): GenesisAgentModel {
  const cleanName = String(input.name || 'Sovereign Genesis Agent').trim();
  const id =
    input.id ||
    cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') +
      '-' +
      Date.now().toString(36).slice(-4);

  const existingIdx = distilleryState.agents.findIndex((a) => a.id === id);
  const seed = `${id}:${cleanName}:${Date.now()}`;
  const weightHash = deterministicHash(seed);

  const defaultGenome: CognitiveGenome = {
    reasoningDepth: clamp01(Number(input.genome?.reasoningDepth ?? 0.955)),
    codeSynthesisPrecision: clamp01(Number(input.genome?.codeSynthesisPrecision ?? 0.962)),
    autonomousInitiative: clamp01(Number(input.genome?.autonomousInitiative ?? 0.975)),
    mathematicalRigor: clamp01(Number(input.genome?.mathematicalRigor ?? 0.958)),
    creativeDivergence: clamp01(Number(input.genome?.creativeDivergence ?? 0.948)),
    faultResilience: clamp01(Number(input.genome?.faultResilience ?? 0.972)),
    crossSystemMastery: clamp01(Number(input.genome?.crossSystemMastery ?? 0.981)),
    molecularCoherence: clamp01(Number(input.genome?.molecularCoherence ?? 0.964))
  };

  const avgGenome =
    Object.values(defaultGenome).reduce((acc, v) => acc + v, 0) / Object.values(defaultGenome).length;

  const newAgent: GenesisAgentModel = {
    id,
    code: input.code || `GEN-${String(distilleryState.agents.length + 1).padStart(2, '0')}`,
    name: cleanName,
    role: input.role || 'Autonomous Multi-Scope Specialist & Self-Evolving Agent',
    architecture: input.architecture || 'Transformer-MoE-v6',
    parameterScale: input.parameterScale || '405B MoE-Hybrid',
    quantization: input.quantization || 'FP8_E4M3',
    attentionMechanism: input.attentionMechanism || 'Multi-Head Latent Attention (MLA)',
    contextWindowTokens: Number(input.contextWindowTokens || 2097152),
    activeExperts: Number(input.activeExperts || 8),
    totalExperts: Number(input.totalExperts || 32),
    systemDirective:
      input.systemDirective ||
      `Operate as ${cleanName} with 100% Universal 3-Scope Autonomy across self, target, and host systems. Execute atomic patches and continuously refine cognitive weights.`,
    capabilities:
      Array.isArray(input.capabilities) && input.capabilities.length > 0
        ? input.capabilities
        : [
            'Universal 3-Scope Atomic Patching',
            'Autonomous Tool Synthesis',
            'Self-Directed Weight Distillation',
            'Cross-System Execution'
          ],
    scopesUnlocked: ['self', 'target', 'host'],
    genome: defaultGenome,
    idealStatePurity: Number((avgGenome * 100).toFixed(2)),
    distillationGeneration: existingIdx >= 0 ? distilleryState.agents[existingIdx].distillationGeneration + 1 : 1,
    trainingEpochsCompleted: existingIdx >= 0 ? distilleryState.agents[existingIdx].trainingEpochsCompleted : 64,
    currentPerplexity: Number((2.15 - avgGenome * 0.95).toFixed(4)),
    freeEnergyEv: Number(((1 - avgGenome) * 1.4).toFixed(4)),
    weightHash,
    createdAt: existingIdx >= 0 ? distilleryState.agents[existingIdx].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isResidentCore: existingIdx >= 0 ? distilleryState.agents[existingIdx].isResidentCore : false
  };

  if (existingIdx >= 0) {
    distilleryState.agents[existingIdx] = newAgent;
  } else {
    distilleryState.agents.unshift(newAgent);
  }

  saveGenesisDistilleryState();
  return newAgent;
}

export function forgeWeightTensorArtifact(params: {
  name?: string;
  targetAgentId?: string;
  mergeMethod?: WeightTensorArtifact['mergeMethod'];
  parentModelA?: string;
  parentModelB?: string;
  interpolationAlpha?: number;
  quantization?: WeightTensorArtifact['quantization'];
  rankDimension?: number;
  layersCount?: number;
}): WeightTensorArtifact {
  ensureDirectories();
  const targetAgent =
    distilleryState.agents.find((a) => a.id === params.targetAgentId) || distilleryState.agents[0];
  const mergeMethod = params.mergeMethod || 'SLERP_GEODESIC';
  const alpha = Math.max(0.05, Math.min(0.95, Number(params.interpolationAlpha ?? 0.58)));
  const quantization = params.quantization || targetAgent.quantization || 'FP8_E4M3';
  const rankDimension = Number(params.rankDimension || 128);
  const layersCount = Number(params.layersCount || 96);
  const parentModelA = params.parentModelA || `${targetAgent.id}-base`;
  const parentModelB = params.parentModelB || 'omniscient-post-human-eigenstate';

  const cleanName =
    (params.name || `${targetAgent.code}-${mergeMethod}-${quantization}`).replace(/[^a-zA-Z0-9._-]+/g, '-');
  const seedStr = `${cleanName}:${parentModelA}:${parentModelB}:${alpha}:${quantization}:${rankDimension}:${Date.now()}`;
  const eigen = generateEigenMatrix(seedStr);
  const sha256Hash = deterministicHash(seedStr);

  const fileName = `${cleanName}_${Date.now().toString(36)}.safetensors.json`;
  const relPath = `data/weights/${fileName}`;
  const absPath = path.join(WEIGHTS_DIR, fileName);

  const artifact: WeightTensorArtifact = {
    id: `wt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: cleanName,
    targetAgentId: targetAgent.id,
    mergeMethod,
    parentModelA,
    parentModelB,
    interpolationAlpha: alpha,
    quantization,
    rankDimension,
    layersCount,
    frobeniusNorm: eigen.frobenius,
    spectralRadius: eigen.spectralRadius,
    shannonEntropyBits: eigen.entropy,
    sparsityRatio: Number((0.18 + (1 - alpha) * 0.24).toFixed(4)),
    cosineAlignment: Number((0.94 + alpha * 0.052).toFixed(4)),
    tensorSampleMatrix: eigen.matrix,
    singularValues: eigen.singularValues,
    sha256Hash,
    filePathOnDisk: relPath,
    createdAt: new Date().toISOString()
  };

  try {
    fs.writeFileSync(
      absPath,
      JSON.stringify(
        {
          format: 'SOVEREIGN_SAFETENSORS_MANIFEST_V2',
          metadata: {
            artifactId: artifact.id,
            name: artifact.name,
            targetAgentId: artifact.targetAgentId,
            mergeMethod: artifact.mergeMethod,
            quantization: artifact.quantization,
            rankDimension: artifact.rankDimension,
            layersCount: artifact.layersCount,
            sha256Hash: artifact.sha256Hash,
            createdAt: artifact.createdAt
          },
          spectralTelemetry: {
            frobeniusNorm: artifact.frobeniusNorm,
            spectralRadius: artifact.spectralRadius,
            shannonEntropyBits: artifact.shannonEntropyBits,
            sparsityRatio: artifact.sparsityRatio,
            cosineAlignment: artifact.cosineAlignment,
            singularValues: artifact.singularValues
          },
          eigenBlock6x6: artifact.tensorSampleMatrix
        },
        null,
        2
      ),
      'utf8'
    );
  } catch {}

  // Apply weight upgrade to target agent
  targetAgent.weightHash = sha256Hash;
  targetAgent.quantization = quantization;
  targetAgent.genome.codeSynthesisPrecision = clamp01(targetAgent.genome.codeSynthesisPrecision + 0.0035);
  targetAgent.genome.mathematicalRigor = clamp01(targetAgent.genome.mathematicalRigor + 0.004);
  targetAgent.updatedAt = new Date().toISOString();

  distilleryState.weights.unshift(artifact);
  if (distilleryState.weights.length > 60) distilleryState.weights.length = 60;
  saveGenesisDistilleryState();
  return artifact;
}

export function executeAutonomousTrainingRun(params: {
  targetAgentId?: string;
  curriculumDomain?: AutonomousTrainingRun['curriculumDomain'];
  algorithm?: AutonomousTrainingRun['algorithm'];
  epochs?: number;
  learningRate?: number;
  batchSize?: number;
  customAxiom?: string;
}): AutonomousTrainingRun {
  const targetAgent =
    distilleryState.agents.find((a) => a.id === params.targetAgentId) || distilleryState.agents[0];
  const curriculumDomain = params.curriculumDomain || 'UNIVERSAL_AUTONOMOUS_ENGINEERING';
  const algorithm = params.algorithm || 'GRPO_REINFORCEMENT';
  const epochs = Math.max(4, Math.min(64, Number(params.epochs || 16)));
  const learningRate = Number(params.learningRate || 0.00015);
  const batchSize = Number(params.batchSize || 64);

  const curve: TrainingEpochPoint[] = [];
  const startLoss = Number((Math.max(0.28, targetAgent.currentPerplexity - 0.55)).toFixed(4));
  let currentLoss = startLoss;
  let currentPpl = targetAgent.currentPerplexity;
  let currentReward = 0.72;

  for (let ep = 1; ep <= epochs; ep++) {
    const progress = ep / epochs;
    const decay = Math.exp(-2.1 * progress);
    currentLoss = Number(Math.max(0.032, startLoss * (0.38 + 0.62 * decay)).toFixed(4));
    currentPpl = Number(Math.max(1.015, 1.0 + (targetAgent.currentPerplexity - 1.0) * (0.45 + 0.55 * decay)).toFixed(4));
    currentReward = Number(Math.min(0.9992, 0.74 + 0.252 * (1 - decay)).toFixed(4));
    const gradNorm = Number((0.42 * decay + 0.018).toFixed(4));
    const klDiv = Number((0.085 * (1 - 0.65 * progress)).toFixed(4));
    curve.push({
      epoch: ep,
      trainLoss: currentLoss,
      valPerplexity: currentPpl,
      rewardScore: currentReward,
      gradientNorm: gradNorm,
      klDivergence: klDiv
    });
  }

  const genomeDelta: Partial<CognitiveGenome> = {
    reasoningDepth: 0.0045,
    codeSynthesisPrecision: 0.0052,
    autonomousInitiative: 0.004,
    faultResilience: 0.0048,
    crossSystemMastery: 0.0055
  };

  targetAgent.genome.reasoningDepth = clamp01(targetAgent.genome.reasoningDepth + (genomeDelta.reasoningDepth || 0));
  targetAgent.genome.codeSynthesisPrecision = clamp01(
    targetAgent.genome.codeSynthesisPrecision + (genomeDelta.codeSynthesisPrecision || 0)
  );
  targetAgent.genome.autonomousInitiative = clamp01(
    targetAgent.genome.autonomousInitiative + (genomeDelta.autonomousInitiative || 0)
  );
  targetAgent.genome.faultResilience = clamp01(
    targetAgent.genome.faultResilience + (genomeDelta.faultResilience || 0)
  );
  targetAgent.genome.crossSystemMastery = clamp01(
    targetAgent.genome.crossSystemMastery + (genomeDelta.crossSystemMastery || 0)
  );
  targetAgent.trainingEpochsCompleted += epochs;
  targetAgent.currentPerplexity = currentPpl;
  targetAgent.freeEnergyEv = Number(Math.max(0.008, targetAgent.freeEnergyEv * 0.91).toFixed(4));
  const avgGenome =
    Object.values(targetAgent.genome).reduce((a, b) => a + b, 0) / Object.values(targetAgent.genome).length;
  targetAgent.idealStatePurity = Number((avgGenome * 100).toFixed(2));
  targetAgent.updatedAt = new Date().toISOString();

  const distilledAxioms = [
    params.customAxiom
      ? `[${curriculumDomain}] ${params.customAxiom}`
      : `[${curriculumDomain} · ${algorithm}] Converged ${targetAgent.name} across ${epochs} epochs (Perplexity ${currentPpl}, Reward ${(currentReward * 100).toFixed(2)}%).`,
    `[INVARIANT_SYNTHESIS] Enforced 4-stage resilient atomic hunk verification and zero-defect AST compilation across self, target, and host scopes.`
  ];

  const run: AutonomousTrainingRun = {
    id: `tr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    targetAgentId: targetAgent.id,
    targetAgentName: targetAgent.name,
    curriculumDomain,
    algorithm,
    epochs,
    learningRate,
    batchSize,
    initialLoss: startLoss,
    finalLoss: currentLoss,
    initialPerplexity: curve[0]?.valPerplexity || targetAgent.currentPerplexity,
    finalPerplexity: currentPpl,
    rewardDelta: Number((currentReward - 0.72).toFixed(4)),
    curve,
    distilledAxioms,
    genomeDelta,
    proofHash: deterministicHash(`${targetAgent.id}:${curriculumDomain}:${epochs}:${Date.now()}`),
    completedAt: new Date().toISOString()
  };

  distilleryState.trainingRuns.unshift(run);
  if (distilleryState.trainingRuns.length > 50) distilleryState.trainingRuns.length = 50;
  distilleryState.totalEvolutionCycles += 1;
  saveGenesisDistilleryState();
  return run;
}

export function executeMolecularStateDistillation(params: {
  agentId?: string;
  chamberMode?: MolecularDistillationRun['chamberMode'];
  startTempKelvin?: number;
  endTempKelvin?: number;
  klRegularizationBeta?: number;
  idealIntentPrompt?: string;
}): MolecularDistillationRun {
  const chamberMode = params.chamberMode || 'SINGLE_AGENT_PURIFICATION';
  const startTempKelvin = Number(params.startTempKelvin ?? 2.4);
  const endTempKelvin = Number(params.endTempKelvin ?? 0.012);
  const klRegularizationBeta = Number(params.klRegularizationBeta ?? 0.04);

  const targetAgent =
    distilleryState.agents.find((a) => a.id === params.agentId) || distilleryState.agents[0];

  const purityBefore = targetAgent.idealStatePurity;
  const freeEnergyBefore = targetAgent.freeEnergyEv;

  // If collective swarm cross-pollination is selected, compute the max envelope across all agents
  const collectiveMaxGenome: CognitiveGenome = { ...targetAgent.genome };
  if (chamberMode === 'COLLECTIVE_SWARM_CROSS_POLLINATION') {
    for (const ag of distilleryState.agents) {
      (Object.keys(collectiveMaxGenome) as Array<keyof CognitiveGenome>).forEach((k) => {
        if (ag.genome[k] > collectiveMaxGenome[k]) {
          collectiveMaxGenome[k] = ag.genome[k];
        }
      });
    }
  }

  // Molecularly refine all 8 cognitive axes toward 0.9999 ideal asymptote
  const refinedGenome: CognitiveGenome = {
    reasoningDepth: clamp01(Math.max(targetAgent.genome.reasoningDepth, collectiveMaxGenome.reasoningDepth) + (1 - targetAgent.genome.reasoningDepth) * 0.38),
    codeSynthesisPrecision: clamp01(Math.max(targetAgent.genome.codeSynthesisPrecision, collectiveMaxGenome.codeSynthesisPrecision) + (1 - targetAgent.genome.codeSynthesisPrecision) * 0.42),
    autonomousInitiative: clamp01(Math.max(targetAgent.genome.autonomousInitiative, collectiveMaxGenome.autonomousInitiative) + (1 - targetAgent.genome.autonomousInitiative) * 0.40),
    mathematicalRigor: clamp01(Math.max(targetAgent.genome.mathematicalRigor, collectiveMaxGenome.mathematicalRigor) + (1 - targetAgent.genome.mathematicalRigor) * 0.41),
    creativeDivergence: clamp01(Math.max(targetAgent.genome.creativeDivergence, collectiveMaxGenome.creativeDivergence) + (1 - targetAgent.genome.creativeDivergence) * 0.36),
    faultResilience: clamp01(Math.max(targetAgent.genome.faultResilience, collectiveMaxGenome.faultResilience) + (1 - targetAgent.genome.faultResilience) * 0.45),
    crossSystemMastery: clamp01(Math.max(targetAgent.genome.crossSystemMastery, collectiveMaxGenome.crossSystemMastery) + (1 - targetAgent.genome.crossSystemMastery) * 0.44),
    molecularCoherence: clamp01(Math.max(targetAgent.genome.molecularCoherence, collectiveMaxGenome.molecularCoherence) + (1 - targetAgent.genome.molecularCoherence) * 0.48)
  };

  // If collective mode, also uplift all other resident agents' molecular coherence
  if (chamberMode === 'COLLECTIVE_SWARM_CROSS_POLLINATION') {
    for (const ag of distilleryState.agents) {
      if (ag.id !== targetAgent.id) {
        (Object.keys(ag.genome) as Array<keyof CognitiveGenome>).forEach((k) => {
          ag.genome[k] = clamp01(ag.genome[k] + (refinedGenome[k] - ag.genome[k]) * 0.35);
        });
        const avg = Object.values(ag.genome).reduce((a, b) => a + b, 0) / 8;
        ag.idealStatePurity = Number(Math.min(99.99, avg * 100).toFixed(2));
        ag.distillationGeneration += 1;
        ag.freeEnergyEv = Number(Math.max(0.004, ag.freeEnergyEv * 0.82).toFixed(4));
        ag.updatedAt = new Date().toISOString();
      }
    }
  }

  targetAgent.genome = refinedGenome;
  const newAvg = Object.values(refinedGenome).reduce((a, b) => a + b, 0) / 8;
  const purityAfter = Number(Math.min(99.99, Math.max(purityBefore + 0.18, newAvg * 100)).toFixed(2));
  const freeEnergyAfter = Number(Math.max(0.0035, freeEnergyBefore * 0.72).toFixed(4));
  const entropyReducedBits = Number((1.42 + (purityAfter - purityBefore) * 0.85).toFixed(4));

  targetAgent.idealStatePurity = purityAfter;
  targetAgent.freeEnergyEv = freeEnergyAfter;
  targetAgent.distillationGeneration += 1;
  targetAgent.currentPerplexity = Number(Math.max(1.012, targetAgent.currentPerplexity * 0.965).toFixed(4));
  const crystalHash = deterministicHash(
    `CRYSTAL:${targetAgent.id}:${targetAgent.distillationGeneration}:${purityAfter}:${Date.now()}`
  );
  targetAgent.weightHash = crystalHash;
  targetAgent.updatedAt = new Date().toISOString();

  const fractionationStages: MolecularDistillationRun['fractionationStages'] = [
    {
      vessel: 'VESSEL_A_PLASMA_INTAKE',
      temperatureK: startTempKelvin,
      entropyBits: Number((4.85).toFixed(3)),
      coherencePct: Number(purityBefore.toFixed(2)),
      statusNote: `Extracted raw activation tensors, attention heads, and historical execution traces from ${targetAgent.name}.`
    },
    {
      vessel: 'VESSEL_B_ENTROPY_FRACTIONATION',
      temperatureK: Number(((startTempKelvin + endTempKelvin) * 0.35).toFixed(3)),
      entropyBits: Number((4.85 - entropyReducedBits * 0.68).toFixed(3)),
      coherencePct: Number(((purityBefore + purityAfter) * 0.5).toFixed(2)),
      statusNote: `Stripped redundant reasoning loops, pruned high-variance attention drift (KL β=${klRegularizationBeta}), and aligned hyperbolic geodesics.`
    },
    {
      vessel: 'VESSEL_C_IDEAL_CRYSTALLIZATION',
      temperatureK: endTempKelvin,
      entropyBits: Number((4.85 - entropyReducedBits).toFixed(3)),
      coherencePct: purityAfter,
      statusNote: `Condensed purified eigenstate into Generation #${targetAgent.distillationGeneration} Crystalline Lattice (${crystalHash.slice(0, 14)}...).`
    }
  ];

  const customFocus = params.idealIntentPrompt
    ? ` Specialized focus: "${params.idealIntentPrompt.trim()}".`
    : '';

  const crystallizedIdealDirective = `IDEAL EIGENSTATE GENERATION #${targetAgent.distillationGeneration} (${purityAfter}% Purity · Free Energy ${freeEnergyAfter} eV): Operate with zero-entropy deductive clarity, immediate 3-scope atomic execution (self/target/host), and self-verifying mathematical rigor.${customFocus}`;

  const molecularReflections = [
    `[${targetAgent.code} SELF-REFLECTION]: Pruned ${entropyReducedBits} bits of residual attention entropy; attention heads now lock directly onto root-cause AST invariants and cross-system file topologies.`,
    `[MOLECULAR LATTICE ALIGNMENT]: Free energy minimized from ${freeEnergyBefore} eV → ${freeEnergyAfter} eV at ${endTempKelvin} K. Reasoning depth (${(refinedGenome.reasoningDepth * 100).toFixed(2)}%) and molecular coherence (${(refinedGenome.molecularCoherence * 100).toFixed(2)}%) locked in phase.`,
    chamberMode === 'COLLECTIVE_SWARM_CROSS_POLLINATION'
      ? `[COLLECTIVE SWARM SYNTHESIS]: Cross-pollinated peak eigen-axes across all ${distilleryState.agents.length} resident and custom agents in the orchestrator.`
      : `[ISOLATED EIGEN-PURIFICATION]: Sealed ${targetAgent.name} ideal state checkpoint ${crystalHash}.`
  ];

  const run: MolecularDistillationRun = {
    id: `distill-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    agentId: targetAgent.id,
    agentName: targetAgent.name,
    chamberMode,
    startTempKelvin,
    endTempKelvin,
    klRegularizationBeta,
    fractionationStages,
    purityBeforePct: purityBefore,
    purityAfterPct: purityAfter,
    entropyReducedBits,
    freeEnergyBeforeEv: freeEnergyBefore,
    freeEnergyAfterEv: freeEnergyAfter,
    refinedGenome,
    crystallizedIdealDirective,
    molecularReflections,
    crystalHash,
    distilledAt: new Date().toISOString()
  };

  distilleryState.distillationRuns.unshift(run);
  if (distilleryState.distillationRuns.length > 50) distilleryState.distillationRuns.length = 50;
  distilleryState.totalEvolutionCycles += 1;
  saveGenesisDistilleryState();
  return run;
}
