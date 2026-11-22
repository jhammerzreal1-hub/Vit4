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

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Camera,
  BookmarkPlus,
  ChevronDown,
  ChevronUp,
  Sliders,
  Gamepad2,
  Box,
  Trophy,
  Zap,
  Shield,
  Crosshair,
  Sun,
  Check,
  Cpu,
  Bot,
  Sparkles,
  Plus,
  Activity,
  X,
  Wrench,
  AlertTriangle,
  Dna,
  Swords,
  Radar,
  Layers,
  GraduationCap
} from 'lucide-react';
import aegisPosterImg from '../../assets/images/aegis_skylane_arena_1794941663165.jpg';
import {
  db,
  collection,
  addDoc,
  setDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  limit,
  OperationType,
  handleFirestoreError
} from '../../firebase';
import { apiFetch } from '../../utils/authClient';
import {
  createMaterialLibrary,
  FINISH_PRESETS,
  type MaterialFinishPreset,
  type SceneMaterialLibrary
} from './sceneMaterials';
import {
  ARENA_HALF_EXTENT,
  INSPECT_LAYER,
  buildEnvironmentAndTerrain,
  createAgentParticipantGroup,
  createBeaconGroup,
  createConceptStructureGroup,
  createDynamicLinkLines,
  createFantasyHeroGroup,
  createProcessNodeGroup,
  createRaidBossGroup,
  createSentinelGroup,
  groundHeightAt,
  type FantasyHeroRig,
  type LightingPreset,
  type LightingRigRefs
} from './proceduralModels';
import {
  BIOME_PRESET_DEFAULTS,
  DEFAULT_EVOLUTION_PROFILE,
  createBuiltinSpatialPresets,
  createDefaultCharacterAppearance,
  synthesizeSpatialBlueprint,
  synthesizeUniqueEvolvedSkill,
  type AgentParticipantRole,
  type AgentParticipantState,
  type AgentTacticalPolicy,
  type BlueprintEntitySpec,
  type ConceptStructureKind,
  type DetectedGameRecord,
  type EngineKind,
  type EnvironmentBiome,
  type EvolutionAxis,
  type EvolutionDnaProfile,
  type EvolvedSkillSpec,
  type MmorpgClass,
  type MmorpgHudState,
  type MmorpgRace,
  type CharacterWingsStyle,
  type ProceduralEngineToolSpec,
  type ProcessEntityKind,
  type RenderPipelineConfig,
  type SpatialBlueprint,
  type SpatialCommandEvent,
  type WeatherMode
} from './spatialEngineTypes';
import { spatialAudio } from './audioSynth';
import { hyperdimensionalPhysics, type HyperdimensionalPhysicsState } from './hyperdimensionalPhysicsEngine';
import { unrealEngineBeta, type UnrealEngineBetaState } from './unrealNextGenCore';

export interface SpatialArenaModuleProps {
  userId?: string;
  onSaveToVault?: (
    type: 'spatial',
    title: string,
    prompt: string,
    model: string,
    mediaUrl?: string,
    metadataJson?: string
  ) => void;
}

type ArenaMode = 'game' | 'studio';
type GamePhase = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'VICTORY' | 'GAME_OVER';
type CameraPreset = 'chase' | 'hero' | 'top' | 'detail';
type ForgeTab = 'mmorpg' | 'realism' | 'scanner';

interface GameRunRecord {
  id: string;
  mode: string;
  score: number;
  wave: number;
  beaconsCollected: number;
  durationSec: number;
  status: 'VICTORY' | 'DEFEAT' | 'COMPLETED' | 'ABORTED';
  shipFinish: MaterialFinishPreset;
  engineTitle?: string;
  agentsCount?: number;
  createdAt: string;
}

interface BurstParticle {
  active: boolean;
  life: number;
  maxLife: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
}

interface AgentLabelProjection {
  agentId: string;
  name: string;
  role: AgentParticipantRole;
  rpgClass?: MmorpgClass;
  colorHex: string;
  score: number;
  leftPct: number;
  topPct: number;
  visible: boolean;
}

interface LiveProcessNode {
  id: string;
  kind: ProcessEntityKind;
  label: string;
  x: number;
  z: number;
  faulty: boolean;
  packetBuffer: number;
  meshRef: ReturnType<typeof createProcessNodeGroup>;
}

interface LiveConceptStructure {
  id: string;
  meshRef: ReturnType<typeof createConceptStructureGroup>;
}

interface LiveAgentActor {
  state: AgentParticipantState;
  stage: 'to_source' | 'to_proc' | 'to_sink';
  boostCooldown: number;
  attackCooldown: number;
  meshRef: ReturnType<typeof createAgentParticipantGroup>;
}

const WAVE_BEACON_COUNTS = [6, 8, 10];
const TOTAL_WAVES = WAVE_BEACON_COUNTS.length;
const LOCAL_RUNS_KEY = 'aegis_skylane_runs_v1';
const LOCAL_EVOLVED_SKILLS_KEY = 'aegis_evolved_skills_v1';
const BUILTIN_PRESETS = createBuiltinSpatialPresets();

const BASE_CLASS_SKILLS: Record<MmorpgClass, Array<{ name: string; mana: number; cd: number; desc: string; color: string }>> = {
  'Vanguard Paladin': [
    { name: 'Aether Cleave', mana: 14, cd: 2.8, desc: 'Heavy radiant arc cleave vs Raid Boss & Sentinels', color: '#f59e0b' },
    { name: 'Solaris Charge', mana: 16, cd: 4.5, desc: 'High-velocity lunge + shield shockwave', color: '#38bdf8' },
    { name: 'Sanctuary Ward', mana: 20, cd: 6.5, desc: 'Restores +45 HP & fortifies Raid Party', color: '#10b981' },
    { name: 'Rift Judgment', mana: 28, cd: 8.5, desc: 'Calls celestial anvil strike on Boss', color: '#f43f5e' }
  ],
  'Chronomancer Mage': [
    { name: 'Chrono Bolt', mana: 12, cd: 2.2, desc: 'Fast temporal lance + mana surge', color: '#38bdf8' },
    { name: 'Gravity Vortex', mana: 18, cd: 4.8, desc: 'Pulls beacons & crushes Sentinel speed', color: '#a855f7' },
    { name: 'Time Dilation', mana: 20, cd: 6.0, desc: 'Siphons HP/Mana & accelerates cooldowns', color: '#10b981' },
    { name: 'Astral Meteor', mana: 30, cd: 8.2, desc: 'Devastating arcane cataclysm vs Boss', color: '#e879f9' }
  ],
  'Shadow Assassin': [
    { name: 'Twin Rend', mana: 12, cd: 2.0, desc: 'Lethal dual-blade burst strike', color: '#f43f5e' },
    { name: 'Phantom Step', mana: 14, cd: 3.4, desc: 'Hyper-dash blink + invulnerability window', color: '#a855f7' },
    { name: 'Nightveil Siphon', mana: 18, cd: 5.5, desc: 'Steals HP & Mana from nearest enemy', color: '#10b981' },
    { name: 'Abyssal Execute', mana: 26, cd: 7.4, desc: 'Scales damage up cleanly below 50% Boss HP', color: '#e879f9' }
  ],
  'Sylvana Cleric': [
    { name: 'Smite Beacon', mana: 12, cd: 2.5, desc: 'Verdant bolt + heals party ally DPS', color: '#10b981' },
    { name: 'Leyline Bloom', mana: 16, cd: 4.2, desc: 'Purifies nearby waystones & restores Mana', color: '#38bdf8' },
    { name: 'Seraphic Renewal', mana: 20, cd: 5.2, desc: 'Major +75 HP Party Sanctuary burst', color: '#34d399' },
    { name: 'Starlight Reckoning', mana: 28, cd: 8.0, desc: 'AoE radiant barrage on Raid Boss', color: '#fbbf24' }
  ],
  'Archon Summoner': [
    { name: 'Runic Volley', mana: 14, cd: 2.6, desc: 'Triple prismatic projectile burst', color: '#a855f7' },
    { name: 'Spire Genesis', mana: 20, cd: 5.2, desc: 'Conjures crystal pylon turret mid-battle', color: '#38bdf8' },
    { name: 'Aegis Symbiosis', mana: 18, cd: 6.0, desc: 'Transfers construct vitality into Hero HP', color: '#10b981' },
    { name: 'Omega Convergence', mana: 30, cd: 8.8, desc: 'Detonates summon leyline across Arena', color: '#f59e0b' }
  ],
  'Runeforge Berserker': [
    { name: 'Colossal Sweep', mana: 14, cd: 2.2, desc: 'Heavy dual-greataxe cleave vs Boss & Sentinels', color: '#f97316' },
    { name: 'Molten Charge', mana: 16, cd: 4.2, desc: 'Explosive lunge leaving magma trail', color: '#fb923c' },
    { name: 'Titan Bastion', mana: 20, cd: 6.0, desc: 'Grants +60 Armor & Berserk HP regen', color: '#ea580c' },
    { name: 'Apocalypse Smash', mana: 30, cd: 8.5, desc: 'Cataclysmic titan slam dealing massive kinetic shock', color: '#c2410c' }
  ]
};

// Module-scoped scratch math objects (zero per-frame allocations)
const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _projVec = new THREE.Vector3();
const _camTargetPos = new THREE.Vector3();
const _camLookTarget = new THREE.Vector3();
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

export const SpatialArenaModule: React.FC<SpatialArenaModuleProps> = ({
  userId,
  onSaveToVault
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [mode, setMode] = useState<ArenaMode>('game');
  const [phase, setPhase] = useState<GamePhase>('TITLE_MENU');
  const [activeBlueprint, setActiveBlueprint] = useState<SpatialBlueprint>(
    BUILTIN_PRESETS.aerial_combat
  );
  const [participantsHud, setParticipantsHud] = useState<AgentParticipantState[]>([]);
  const [agentLabels, setAgentLabels] = useState<AgentLabelProjection[]>([]);

  const [hudScore, setHudScore] = useState(0);
  const [hudWave, setHudWave] = useState(1);
  const [hudShields, setHudShields] = useState(3);
  const [hudCombo, setHudCombo] = useState(1);
  const [hudBeaconsRemaining, setHudBeaconsRemaining] = useState(WAVE_BEACON_COUNTS[0]);
  const [hudBoostEnergy, setHudBoostEnergy] = useState(100);
  const [hudElapsedSec, setHudElapsedSec] = useState(0);
  const [hudProcessMetric, setHudProcessMetric] = useState(0);
  const [hudQuorumPct, setHudQuorumPct] = useState(100);
  const [hudThroughput, setHudThroughput] = useState(0);

  const [finishPreset, setFinishPreset] = useState<MaterialFinishPreset>('titanium-amber');
  const [lightingPreset, setLightingPreset] = useState<LightingPreset>('orbital-twilight');
  const [explodeFactor, setExplodeFactor] = useState(0);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('hero');
  const [inspectedPart, setInspectedPart] = useState<{ label: string; role: string } | null>(null);

  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [forgeOpen, setForgeOpen] = useState(false);
  const [forgeTab, setForgeTab] = useState<ForgeTab>('mmorpg');
  const [forgePrompt, setForgePrompt] = useState('');
  const [forgeBusy, setForgeBusy] = useState(false);
  const [spawnAgentName, setSpawnAgentName] = useState('Aurelius-Scout');
  const [spawnAgentRole, setSpawnAgentRole] = useState<AgentParticipantRole>('ally');
  const [processEvents, setProcessEvents] = useState<Array<{ timestamp: string; source: string; message: string }>>([]);
  const [savedBlueprints, setSavedBlueprints] = useState<SpatialBlueprint[]>([]);

  // Photorealistic Engine, Scanner & Modder State
  const [detectedGames, setDetectedGames] = useState<DetectedGameRecord[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>('aegis-spatial-engine');
  const [modPromptInput, setModPromptInput] = useState('');
  const [toolForgeName, setToolForgeName] = useState('Hyperion Obsidian Spire');
  const [toolForgeStructure, setToolForgeStructure] = useState<ConceptStructureKind>('crystal_cluster');
  const [toolForgeDesc, setToolForgeDesc] = useState('Summon glowing bioluminescent crystal spires and mist particles');
  const [forgedToolsList, setForgedToolsList] = useState<ProceduralEngineToolSpec[]>([]);
  const [trainNotice, setTrainNotice] = useState<string | null>(null);
  const [evolutionBanner, setEvolutionBanner] = useState<EvolvedSkillSpec | null>(null);
  const [customEvoIntent, setCustomEvoIntent] = useState('');
  const [hyperPhysics, setHyperPhysics] = useState<HyperdimensionalPhysicsState>({
    aetherPressureBar: 1.618,
    chronoDilationFactor: 1.0,
    quantumEntanglementCohesion: 0.9998,
    probabilityCollapseEntropy: 0.042,
    multiversalSimStepCount: 1048576,
    gravitationalLensingStrength: 0.75,
    cognitiveResonanceMass: 1.414
  });

  const [unrealState, setUnrealState] = useState<UnrealEngineBetaState>({
    engineVersion: 'Unreal Engine 6.0 Beta (Neural Radiance Caches)',
    nanitePolygonsActive: 2147483648,
    lumenGlobalIlluminationRays: 16384,
    chaosPhysicsRigidBodies: 250000,
    temporalSuperResolutionEnabled: true,
    hardwareRayTracingActive: true,
    metahumanRiggingPrecision: 'Sub-Pixel Micro-Polygon'
  });

  // MMORPG + 1-of-1 Truly Evolving Skill State
  const [mmorpgHud, setMmorpgHud] = useState<MmorpgHudState>(() => {
    let savedSkills: EvolvedSkillSpec[] = [];
    try {
      const raw = localStorage.getItem(LOCAL_EVOLVED_SKILLS_KEY);
      if (raw) savedSkills = JSON.parse(raw);
    } catch {}
    const slots: [EvolvedSkillSpec | null, EvolvedSkillSpec | null, EvolvedSkillSpec | null, EvolvedSkillSpec | null] = [null, null, null, null];
    for (const sk of savedSkills) {
      if (sk.slotIndex >= 0 && sk.slotIndex <= 3 && !slots[sk.slotIndex]) {
        slots[sk.slotIndex] = sk;
      }
    }
    return {
      playerRace: 'Valorian Human',
      playerClass: 'Vanguard Paladin',
      evolvedClassSpec: null,
      characterAppearance: createDefaultCharacterAppearance('Valorian Human', 'Vanguard Paladin'),
      level: 1,
      xp: 0,
      xpToNext: 180,
      hp: 320,
      maxHp: 320,
      mana: 120,
      maxMana: 120,
      gold: 0,
      realmTier: 1,
      bossName: 'Kaelgor, Abyssal Titan · Tier I',
      bossHp: 1800,
      bossMaxHp: 1800,
      bossActive: true,
      questTitle: 'Sever the Abyssal Titan & Awaken 1-of-1 Evolution',
      questProgress: 0,
      questTarget: 1,
      skillCooldowns: [0, 0, 0, 0],
      evolutionProfile: { ...DEFAULT_EVOLUTION_PROFILE },
      evolutionProgress: 20,
      evolvedSkills: savedSkills,
      activeSlots: slots,
      materials: {
        aether_crystal: 5,
        star_titanium: 3,
        abyssal_herb: 2,
        chrono_essence: 1,
        dragon_obsidian: 1,
        celestial_silk: 2
      },
      crafterSkillLevel: 1,
      crafterXp: 0,
      crafterSpecialization: 'Bladesmith',
      craftedInventory: [],
      equippedWeapon: null,
      equippedArmor: null,
      equippedRelic: null,
      storyQuest: {
        questId: 'quest-1',
        chapterNum: 1,
        epochTitle: 'Era I · The Awakening',
        title: 'Awaken the First Leyline Beacon',
        narrative: 'Seek out the primordial waypoint and gather 3 Aether Crystal shards.',
        questGiverName: 'Archmage Valerius',
        questGiverRole: 'High Chrono-Sentinel',
        objectiveType: 'gather',
        progress: 0,
        target: 3,
        rewardXp: 150,
        rewardGold: 50,
        rewardMaterial: 'aether_crystal',
        rewardMaterialCount: 3,
        worldMutationOnClear: {
          biome: 'canyon_basin',
          weather: 'clear',
          sunElevationDeg: 45,
          spawnStructureKind: 'crystal_cluster',
          spawnStructureLabel: 'Aether Monolith'
        }
      },
      activeWorldEvent: {
        eventId: 'evt-1',
        title: 'Celestial Omen of the Star Loom',
        category: 'celestial_omen',
        loreSummary: 'Starlight rains down across the canyon basins, doubling crystal yields.',
        worldEffectText: 'All gathering yields +100% and mana regen accelerated by 25%.',
        biomeShift: 'canyon_basin',
        weatherShift: 'clear',
        bonusMaterial: 'aether_crystal',
        crafterQualityBoostPct: 20,
        bossPowerMod: 1.0,
        startedAt: '00:00:00'
      },
      worldChronicleLog: ['Chronicle initiated: Aetherion Eternal living world timeline established.'],
      qol: {
        autoLoot: true,
        autoPilotQuest: false,
        autoEquipBest: true,
        showMinimap: true
      }
    };
  });

  const [muted, setMuted] = useState(false);
  const [webglLost, setWebglLost] = useState(false);
  const [webglUnsupported, setWebglUnsupported] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [blueprintSavedNotice, setBlueprintSavedNotice] = useState(false);
  const [leaderboard, setLeaderboard] = useState<GameRunRecord[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_RUNS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Mutable refs synchronized cleanly into the Three.js loop
  const modeRef = useRef<ArenaMode>(mode);
  const phaseRef = useRef<GamePhase>(phase);
  const blueprintRef = useRef<SpatialBlueprint>(activeBlueprint);
  const finishRef = useRef<MaterialFinishPreset>(finishPreset);
  const lightingRef = useRef<LightingPreset>(lightingPreset);
  const explodeTargetRef = useRef<number>(explodeFactor);
  const mmorpgRef = useRef<MmorpgHudState>(mmorpgHud);
  const heroAvatarRef = useRef<FantasyHeroRig | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const touchSteerRef = useRef<{ x: number; z: number; boost: boolean }>({ x: 0, z: 0, boost: false });
  const lastCommandSeqRef = useRef<number>(0);

  const requestRenderFnRef = useRef<(() => void) | null>(null);
  const restartGameFnRef = useRef<(() => void) | null>(null);
  const applyCameraPresetFnRef = useRef<((preset: CameraPreset) => void) | null>(null);
  const exportCanvasFnRef = useRef<(() => string | null) | null>(null);
  const applyCommandFnRef = useRef<((cmd: SpatialCommandEvent) => void) | null>(null);
  const getTelemetrySnapshotFnRef = useRef<(() => Record<string, any>) | null>(null);
  const castSkillFnRef = useRef<((slotIdx: number) => void) | null>(null);
  const triggerEvolutionFnRef = useRef<((customIntent?: string, preferredSlot?: 0 | 1 | 2 | 3) => Promise<void>) | null>(null);
  const applyPipelineFnRef = useRef<((patch: Partial<RenderPipelineConfig>) => void) | null>(null);
  const matLibRef = useRef<SceneMaterialLibrary | null>(null);
  const lightingRigRef = useRef<LightingRigRefs | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    modeRef.current = mode;
    requestRenderFnRef.current?.();
  }, [mode]);

  useEffect(() => {
    phaseRef.current = phase;
    requestRenderFnRef.current?.();
  }, [phase]);

  useEffect(() => {
    blueprintRef.current = activeBlueprint;
  }, [activeBlueprint]);

  useEffect(() => {
    finishRef.current = finishPreset;
    matLibRef.current?.applyFinishPreset(finishPreset);
    requestRenderFnRef.current?.();
  }, [finishPreset]);

  useEffect(() => {
    lightingRef.current = lightingPreset;
    if (lightingRigRef.current && sceneRef.current) {
      lightingRigRef.current.applyPreset(lightingPreset, sceneRef.current);
      requestRenderFnRef.current?.();
    }
  }, [lightingPreset]);

  useEffect(() => {
    explodeTargetRef.current = explodeFactor;
    requestRenderFnRef.current?.();
  }, [explodeFactor]);

  useEffect(() => {
    mmorpgRef.current = mmorpgHud;
    try {
      localStorage.setItem(LOCAL_EVOLVED_SKILLS_KEY, JSON.stringify(mmorpgHud.evolvedSkills.slice(0, 32)));
    } catch {}
  }, [mmorpgHud]);

  // Hydrate initial detected games & forged tools from server
  useEffect(() => {
    apiFetch('/api/games/detected')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        if (Array.isArray(d.games) && d.games.length > 0) {
          setDetectedGames(d.games);
        }
        if (Array.isArray(d.forgedTools)) {
          setForgedToolsList(d.forgedTools);
        }
      })
      .catch(() => {});
  }, []);

  // Firestore listeners: game_runs + spatial_blueprints + detected_games
  useEffect(() => {
    if (!userId) return;
    const runsRef = collection(db, 'users', userId, 'game_runs');
    const qRuns = query(runsRef, orderBy('score', 'desc'), limit(8));
    const unsubRuns = onSnapshot(
      qRuns,
      (snap) => {
        const rows: GameRunRecord[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          const st = String(d.status || d.outcome || 'COMPLETED');
          rows.push({
            id: docSnap.id,
            mode: String(d.mode || 'aerial_combat'),
            score: Number(d.score || 0),
            wave: Number(d.wave || 1),
            beaconsCollected: Number(d.beaconsCollected || 0),
            durationSec: Number(d.durationSec || 0),
            status: (st === 'VICTORY' || st === 'DEFEAT' || st === 'ABORTED' ? st : 'COMPLETED') as GameRunRecord['status'],
            shipFinish: (d.shipFinish as MaterialFinishPreset) || 'titanium-amber',
            engineTitle: d.engineTitle ? String(d.engineTitle) : undefined,
            agentsCount: typeof d.agentsCount === 'number' ? d.agentsCount : undefined,
            createdAt: String(d.createdAt || '')
          });
        });
        setLeaderboard(rows);
      },
      (err) => {
        console.warn('[Firestore] game_runs read deferred:', err?.message || err);
      }
    );

    const bpRef = collection(db, 'users', userId, 'spatial_blueprints');
    const qBp = query(bpRef, orderBy('createdAt', 'desc'), limit(8));
    const unsubBp = onSnapshot(
      qBp,
      (snap) => {
        const bps: SpatialBlueprint[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          try {
            const parsed = JSON.parse(String(d.blueprintJson || '{}'));
            if (parsed && parsed.engineKind) {
              bps.push({ ...parsed, id: docSnap.id, title: String(d.title || parsed.title) });
            }
          } catch {}
        });
        setSavedBlueprints(bps);
      },
      (err) => {
        console.warn('[Firestore] spatial_blueprints read deferred:', err?.message || err);
      }
    );

    const dgRef = collection(db, 'users', userId, 'detected_games');
    const qDg = query(dgRef, orderBy('detectedAt', 'desc'), limit(12));
    const unsubDg = onSnapshot(
      qDg,
      (snap) => {
        if (snap.empty) return;
        const cloudGames: DetectedGameRecord[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          try {
            const modState = JSON.parse(String(d.modStateJson || '{}'));
            cloudGames.push({
              gameId: docSnap.id,
              gameKey: String(d.gameKey || docSnap.id),
              title: String(d.title || 'Detected Game'),
              engine: (d.engine || 'custom_engine') as DetectedGameRecord['engine'],
              sourcePath: String(d.sourcePath || 'cloud://registry'),
              status: (d.status || 'DETECTED') as DetectedGameRecord['status'],
              modCount: Number(d.modCount || 0),
              capabilities: Array.isArray(modState.capabilities) ? modState.capabilities : ['runtime_mod'],
              runtimeHook: 'hybrid',
              modState: {
                godMode: Boolean(modState.godMode),
                timeScale: Number(modState.timeScale || 1),
                gravity: Number(modState.gravity || 9.8),
                speedScale: Number(modState.speedScale || 1),
                biome: modState.biome,
                weather: modState.weather,
                bloomStrength: modState.bloomStrength,
                activeMods: Array.isArray(modState.activeMods) ? modState.activeMods : []
              },
              detectedAt: String(d.detectedAt || ''),
              updatedAt: String(d.detectedAt || '')
            });
          } catch {}
        });
        if (cloudGames.length > 0) {
          setDetectedGames((prev) => {
            const merged = new Map<string, DetectedGameRecord>();
            cloudGames.forEach((g) => merged.set(g.gameId, g));
            prev.forEach((g) => merged.set(g.gameId, g));
            return Array.from(merged.values());
          });
        }
      },
      (err) => {
        console.warn('[Firestore] detected_games read deferred:', err?.message || err);
      }
    );

    return () => {
      unsubRuns();
      unsubBp();
      unsubDg();
    };
  }, [userId]);

  const persistGameRun = useCallback(
    async (run: Omit<GameRunRecord, 'id' | 'createdAt'>) => {
      const createdAt = new Date().toISOString();
      const entry: GameRunRecord = {
        id: `run-${Date.now()}`,
        createdAt,
        ...run
      };

      setLeaderboard((prev) => {
        const updated = [entry, ...prev]
          .sort((a, b) => b.score - a.score)
          .slice(0, 8);
        try {
          localStorage.setItem(LOCAL_RUNS_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      if (userId) {
        try {
          await addDoc(collection(db, 'users', userId, 'game_runs'), {
            userId,
            mode: run.mode,
            shipFinish: run.shipFinish,
            score: Math.max(0, Math.min(10000000, Math.round(run.score))),
            wave: Math.max(1, Math.min(999, Math.round(run.wave))),
            beaconsCollected: Math.max(0, Math.min(99999, Math.round(run.beaconsCollected))),
            durationSec: Math.max(0, Math.min(86400, Math.round(run.durationSec * 10) / 10)),
            status: run.status,
            agentsCount: Math.max(0, Math.min(64, Math.round(run.agentsCount ?? 0))),
            engineTitle: String(run.engineTitle || 'Aegis Skylane').slice(0, 128),
            createdAt
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${userId}/game_runs`);
        }
      }
    },
    [userId]
  );

  const persistRunRef = useRef(persistGameRun);
  useEffect(() => {
    persistRunRef.current = persistGameRun;
  }, [persistGameRun]);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) return;

      keysRef.current[e.code] = true;

      if (e.code === 'KeyH') {
        setDockCollapsed((prev) => !prev);
      } else if (
        (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3' || e.code === 'Digit4') &&
        modeRef.current === 'game' &&
        phaseRef.current === 'PLAYING' &&
        blueprintRef.current.engineKind === 'mmorpg_world'
      ) {
        const slotIdx = Number(e.code.replace('Digit', '')) - 1;
        castSkillFnRef.current?.(slotIdx);
      } else if (e.code === 'Escape' || e.code === 'KeyP') {
        if (modeRef.current === 'game') {
          setPhase((prev) => {
            if (prev === 'PLAYING') return 'PAUSED';
            if (prev === 'PAUSED') return 'PLAYING';
            return prev;
          });
        }
      } else if (e.code === 'Space' && modeRef.current === 'game' && phaseRef.current === 'PLAYING') {
        e.preventDefault();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Poll /api/spatial/state for autonomous orchestrator & agent directives + publish live telemetry
  useEffect(() => {
    let active = true;

    const pullState = async () => {
      try {
        const res = await apiFetch(`/api/spatial/state?since=${lastCommandSeqRef.current}`);
        if (!res.ok || !active) return;
        const data = await res.json();
        if (!active) return;

        if (typeof data.latestSeq === 'number' && data.latestSeq > lastCommandSeqRef.current) {
          lastCommandSeqRef.current = data.latestSeq;
        }
        if (Array.isArray(data.processLog)) {
          setProcessEvents(data.processLog.slice(0, 12));
        }

        const cmds: SpatialCommandEvent[] = Array.isArray(data.commands) ? data.commands : [];
        if (cmds.length > 0) {
          for (const cmd of cmds) {
            applyCommandFnRef.current?.(cmd);
          }
        } else if (data.blueprint && lastCommandSeqRef.current === 0 && data.blueprint.id !== blueprintRef.current.id) {
          // Initial hydration from server blueprint state
          applyCommandFnRef.current?.({
            seq: data.latestSeq || 1,
            timestamp: new Date().toISOString(),
            sourceAgent: 'server-sync',
            type: 'LOAD_BLUEPRINT',
            payload: { blueprint: data.blueprint, autoStart: false }
          });
        }

        if (Array.isArray(data.participants) && lastCommandSeqRef.current === 0) {
          for (const ag of data.participants as AgentParticipantState[]) {
            applyCommandFnRef.current?.({
              seq: 0,
              timestamp: new Date().toISOString(),
              sourceAgent: ag.agentId,
              type: 'SPAWN_AGENT',
              payload: { agent: ag }
            });
          }
        }
      } catch {}
    };

    const pushTelemetry = async () => {
      if (!getTelemetrySnapshotFnRef.current) return;
      try {
        const snapshot = getTelemetrySnapshotFnRef.current();
        await apiFetch('/api/spatial/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ snapshot })
        });
      } catch {}
    };

    const onLocalSpatialCommand = (ev: Event) => {
      const detail = (ev as CustomEvent)?.detail;
      if (!detail) return;
      if (detail.viewMode === 'studio' || detail.viewMode === 'game') {
        setMode(detail.viewMode);
      }
      if (detail.finishPreset) {
        setFinishPreset(detail.finishPreset);
      }
      if (detail.lightingPreset) {
        setLightingPreset(detail.lightingPreset);
      }
      if (detail.blueprint) {
        applyCommandFnRef.current?.({
          seq: Date.now(),
          timestamp: new Date().toISOString(),
          sourceAgent: detail.sourceAgent || 'agent-directive',
          type: 'LOAD_BLUEPRINT',
          payload: { blueprint: detail.blueprint, autoStart: detail.autoStart !== false }
        });
      }
      if (detail.command) {
        applyCommandFnRef.current?.(detail.command);
      }
      pullState();
    };

    window.addEventListener('aurelius_spatial_command', onLocalSpatialCommand);
    pullState();

    const pullTimer = window.setInterval(pullState, 950);
    const pushTimer = window.setInterval(pushTelemetry, 1400);

    return () => {
      active = false;
      window.removeEventListener('aurelius_spatial_command', onLocalSpatialCommand);
      window.clearInterval(pullTimer);
      window.clearInterval(pushTimer);
    };
  }, []);

  // Main Three.js WebGL Engine Mount (Mounted Once)
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param) || '');
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false
      });
    } catch {
      setWebglUnsupported(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth || 960, container.clientHeight || 600);
    rendererRef.current = renderer;

    canvasRef.current = renderer.domElement;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglLost(true);
    };
    const onContextRestored = () => {
      setWebglLost(false);
      requestRenderFnRef.current?.();
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      52,
      (container.clientWidth || 960) / Math.max(1, container.clientHeight || 600),
      0.2,
      420
    );
    camera.position.set(8.5, 4.4, 9.8);

    // Hardware HDR Post-Processing (Skipped cleanly on SwiftShader / software GL)
    let composer: EffectComposer | null = null;
    let bloomPass: UnrealBloomPass | null = null;
    if (!isSoftwareGl) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      bloomPass = new UnrealBloomPass(
        new THREE.Vector2(container.clientWidth || 960, container.clientHeight || 600),
        0.48,
        0.38,
        0.82
      );
      composer.addPass(bloomPass);
      composer.addPass(new OutputPass());
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 4.2;
    controls.maxDistance = 48;
    controls.maxPolarAngle = Math.PI * 0.485;
    controls.target.set(0, 0.9, 0);

    let scriptedCamActive = false;
    const scriptedCamPos = new THREE.Vector3();
    const scriptedCamTarget = new THREE.Vector3();

    const onControlStart = () => {
      scriptedCamActive = false;
    };
    controls.addEventListener('start', onControlStart);

    const matLib = createMaterialLibrary(renderer, isSoftwareGl);
    matLibRef.current = matLib;

    const { lightingRig, burstMesh, disposables: envDisposables } = buildEnvironmentAndTerrain(
      scene,
      renderer,
      matLib,
      isSoftwareGl
    );
    lightingRigRef.current = lightingRig;

    // Hero 3D Fantasy Character Rig (Customizable MMORPG Champion)
    const heroAvatar = createFantasyHeroGroup(matLib, mmorpgHud.characterAppearance);
    heroAvatarRef.current = heroAvatar;
    scene.add(heroAvatar.root);

    // World Raid Boss Assembly for Infinite MMORPG Realm
    const raidBoss = createRaidBossGroup(matLib);
    raidBoss.root.visible = false;
    scene.add(raidBoss.root);
    const bossState = { x: 0, z: -26, yaw: 0, aoeCooldown: 6.5 };

    // Dynamic Process Link Lines (zero GC segment buffer)
    const linkLines = createDynamicLinkLines(matLib, 32);
    scene.add(linkLines.lines);

    // Beacon & Sentinel Pools (pre-allocated)
    const maxBeacons = 12;
    const beaconPool = Array.from({ length: maxBeacons }, () => {
      const b = createBeaconGroup(matLib);
      b.root.visible = false;
      scene.add(b.root);
      return { ...b, collected: false, x: 0, z: 0 };
    });

    const maxSentinels = 8;
    const sentinelPool = Array.from({ length: maxSentinels }, () => {
      const s = createSentinelGroup(matLib);
      s.root.visible = false;
      scene.add(s.root);
      return {
        ...s,
        active: false,
        x: 0,
        z: 0,
        vx: 0,
        vz: 0,
        radius: 1.55
      };
    });

    // Dynamic Process Nodes, Procedural Concept Structures & AI Agent Actors Map
    const processNodes: LiveProcessNode[] = [];
    const conceptStructures: LiveConceptStructure[] = [];
    const agentActors: Map<string, LiveAgentActor> = new Map();

    // Particle burst state
    const bursts: BurstParticle[] = Array.from({ length: 64 }, () => ({
      active: false,
      life: 0,
      maxLife: 0.65,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3()
    }));
    let burstCursor = 0;

    const spawnBurst = (wx: number, wy: number, wz: number, hexColor: number, count = 16) => {
      _color.setHex(hexColor);
      for (let i = 0; i < count; i++) {
        const p = bursts[burstCursor];
        burstCursor = (burstCursor + 1) % bursts.length;
        p.active = true;
        p.life = 0;
        p.maxLife = 0.45 + Math.random() * 0.35;
        p.pos.set(wx, wy, wz);
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
        const speed = 4 + Math.random() * 6;
        p.vel.set(Math.cos(angle) * speed, 2.5 + Math.random() * 4.5, Math.sin(angle) * speed);
        burstMesh.setColorAt(burstCursor, _color);
      }
      if (burstMesh.instanceColor) burstMesh.instanceColor.needsUpdate = true;
    };

    const player = {
      x: 0,
      z: 0,
      vx: 0,
      vz: 0,
      yaw: 0,
      roll: 0,
      pitch: 0,
      boostEnergy: 100,
      wasBoosting: false,
      shields: 3,
      invulnTimer: 0,
      hitstopTimer: 0,
      shakeIntensity: 0
    };

    const sim = {
      score: 0,
      wave: 1,
      combo: 1,
      comboTimer: 0,
      beaconsCollectedTotal: 0,
      beaconsRemainingWave: WAVE_BEACON_COUNTS[0],
      elapsedSec: 0,
      currentExplode: 0,
      targetFov: 52,
      elapsedClock: 0,
      packetsDeliveredTotal: 0,
      faultsHealedTotal: 0,
      orbitalFluxMw: 0,
      faultTimer: 0
    };

    const activeBiome = (): EnvironmentBiome =>
      blueprintRef.current.renderPipeline?.biome || 'canyon_basin';

    const addProcessNodeToScene = (spec: BlueprintEntitySpec) => {
      const biome = activeBiome();
      if (spec.kind === 'beacon') {
        const free = beaconPool.find((b) => !b.root.visible || b.collected);
        if (free) {
          free.x = spec.x;
          free.z = spec.z;
          free.collected = false;
          free.root.visible = true;
          free.root.position.set(spec.x, groundHeightAt(spec.x, spec.z, biome), spec.z);
          sim.beaconsRemainingWave += 1;
          setHudBeaconsRemaining(sim.beaconsRemainingWave);
        }
        return;
      }
      if (spec.kind === 'hazard_sentinel') {
        const free = sentinelPool.find((s) => !s.active);
        if (free) {
          free.x = spec.x;
          free.z = spec.z;
          free.vx = 5.5;
          free.vz = -4.5;
          free.active = true;
          free.root.visible = true;
          free.root.position.set(spec.x, groundHeightAt(spec.x, spec.z, biome), spec.z);
        }
        return;
      }
      const meshRef = createProcessNodeGroup(matLib, spec.kind);
      const isFaulty = Boolean(spec.faulty);
      meshRef.setFaulty(isFaulty);
      meshRef.root.position.set(spec.x, groundHeightAt(spec.x, spec.z, biome), spec.z);
      scene.add(meshRef.root);
      processNodes.push({
        id: spec.id,
        kind: spec.kind,
        label: spec.label,
        x: spec.x,
        z: spec.z,
        faulty: isFaulty,
        packetBuffer: spec.kind === 'relay_source' ? 4 : 0,
        meshRef
      });
    };

    const addConceptStructureToScene = (spec: {
      id: string;
      conceptKind: ConceptStructureKind;
      x: number;
      z: number;
      scale: number;
      colorHex: string;
    }) => {
      const biome = activeBiome();
      const meshRef = createConceptStructureGroup(matLib, spec.conceptKind, spec.colorHex, spec.scale);
      meshRef.root.position.set(spec.x, groundHeightAt(spec.x, spec.z, biome), spec.z);
      scene.add(meshRef.root);
      conceptStructures.push({ id: spec.id, meshRef });
    };

    const clearConceptStructures = () => {
      for (const cs of conceptStructures) {
        scene.remove(cs.meshRef.root);
        cs.meshRef.disposables.forEach((d) => d.dispose());
      }
      conceptStructures.length = 0;
    };

    const clearProcessNodes = () => {
      for (const pn of processNodes) {
        scene.remove(pn.meshRef.root);
        pn.meshRef.disposables.forEach((d) => d.dispose());
      }
      processNodes.length = 0;
      linkLines.commitCount(0);
    };

    const applyPipelinePatch = (patch: Partial<RenderPipelineConfig>) => {
      const currentPipeline = blueprintRef.current.renderPipeline || { ...BIOME_PRESET_DEFAULTS.canyon_basin };
      const nextPipeline: RenderPipelineConfig = { ...currentPipeline, ...patch };
      const nextBp: SpatialBlueprint = { ...blueprintRef.current, renderPipeline: nextPipeline };
      blueprintRef.current = nextBp;
      setActiveBlueprint(nextBp);

      lightingRig.applyPipeline(nextPipeline, scene, renderer);
      if (bloomPass) {
        bloomPass.strength = nextPipeline.bloomEnabled ? nextPipeline.bloomStrength : 0;
        bloomPass.threshold = nextPipeline.bloomThreshold;
      }

      const biome = nextPipeline.biome;
      for (const pn of processNodes) {
        pn.meshRef.root.position.y = groundHeightAt(pn.x, pn.z, biome);
      }
      for (const b of beaconPool) {
        if (b.root.visible) b.root.position.y = groundHeightAt(b.x, b.z, biome);
      }
      for (const s of sentinelPool) {
        if (s.active) s.root.position.y = groundHeightAt(s.x, s.z, biome);
      }
      for (const cs of conceptStructures) {
        cs.meshRef.root.position.y = groundHeightAt(cs.meshRef.root.position.x, cs.meshRef.root.position.z, biome);
      }
      if (raidBoss.root.visible) {
        raidBoss.root.position.y = groundHeightAt(bossState.x, bossState.z, biome);
      }
      requestRenderFnRef.current?.();
    };
    applyPipelineFnRef.current = applyPipelinePatch;

    const upsertAgentActor = (agentState: AgentParticipantState) => {
      const existing = agentActors.get(agentState.agentId);
      if (existing) {
        existing.state = { ...existing.state, ...agentState, active: true };
        return;
      }
      const biome = activeBiome();
      const meshRef = createAgentParticipantGroup(matLib, agentState.colorHex || '#10b981');
      meshRef.root.position.set(agentState.x, groundHeightAt(agentState.x, agentState.z, biome) + 0.25, agentState.z);
      scene.add(meshRef.root);
      agentActors.set(agentState.agentId, {
        state: { ...agentState, active: true },
        stage: 'to_source',
        boostCooldown: 0,
        attackCooldown: 0,
        meshRef
      });
      setParticipantsHud(Array.from(agentActors.values()).map((a) => ({ ...a.state })));
    };

    const removeAgentActor = (agentId: string) => {
      const actor = agentActors.get(agentId);
      if (!actor) return;
      scene.remove(actor.meshRef.root);
      actor.meshRef.disposables.forEach((d) => d.dispose());
      agentActors.delete(agentId);
      setParticipantsHud(Array.from(agentActors.values()).map((a) => ({ ...a.state })));
    };

    const spawnWave = (waveNum: number) => {
      const bp = blueprintRef.current;
      const biome = activeBiome();
      const beaconTarget = Math.min(
        maxBeacons,
        bp.engineKind === 'aerial_combat'
          ? WAVE_BEACON_COUNTS[Math.min(waveNum - 1, TOTAL_WAVES - 1)]
          : bp.rules.beaconCount || 7
      );
      sim.beaconsRemainingWave = beaconTarget;
      setHudWave(waveNum);
      setHudBeaconsRemaining(beaconTarget);

      beaconPool.forEach((b, idx) => {
        if (idx < beaconTarget) {
          const angle = (idx / beaconTarget) * Math.PI * 2 + waveNum * 0.65;
          const dist = 12 + ((idx * 17 + waveNum * 11) % 24);
          b.x = Math.cos(angle) * dist;
          b.z = Math.sin(angle) * dist;
          b.collected = false;
          b.root.visible = true;
          b.root.position.set(b.x, groundHeightAt(b.x, b.z, biome), b.z);
        } else {
          b.collected = true;
          b.root.visible = false;
        }
      });

      const activeSentinelCount = Math.min(maxSentinels, Math.max(1, (bp.rules.hazardCount || 2) + waveNum - 1));
      sentinelPool.forEach((s, idx) => {
        if (idx < activeSentinelCount) {
          const angle = (idx / activeSentinelCount) * Math.PI * 2 + 0.4;
          const dist = 19 + (idx % 3) * 8;
          s.x = Math.cos(angle) * dist;
          s.z = Math.sin(angle) * dist;
          const speed = (5.0 + waveNum * 1.4) * (bp.physics.speedScale || 1);
          s.vx = Math.cos(angle + Math.PI / 2) * speed;
          s.vz = Math.sin(angle + Math.PI / 2) * speed;
          s.active = true;
          s.root.visible = true;
          s.root.position.set(s.x, groundHeightAt(s.x, s.z, biome), s.z);
        } else {
          s.active = false;
          s.root.visible = false;
        }
      });
    };

    const awardMmorpgProgress = (
      xpGain: number,
      goldGain: number,
      bossDamage: number,
      dnaDelta?: Partial<EvolutionDnaProfile>,
      evoProgressGain = 0
    ) => {
      if (blueprintRef.current.engineKind !== 'mmorpg_world') return;
      const prev = mmorpgRef.current;
      let { level, xp, xpToNext, maxHp, hp, maxMana, mana, gold, realmTier, bossHp, bossMaxHp, bossName, questProgress, questTarget, questTitle } = prev;
      let bossActive = prev.bossActive;

      gold += goldGain;
      xp += xpGain;
      while (xp >= xpToNext) {
        xp -= xpToNext;
        level += 1;
        xpToNext = Math.round(xpToNext * 1.32 + 60);
        maxHp += 45;
        maxMana += 18;
        hp = maxHp;
        mana = maxMana;
        spatialAudio.playVictoryChord();
        spawnBurst(player.x, groundHeightAt(player.x, player.z, activeBiome()) + 2.2, player.z, 0xfbbf24, 24);
      }

      if (bossDamage > 0 && bossActive) {
        bossHp = Math.max(0, bossHp - Math.round(bossDamage));
        if (bossHp <= 0) {
          realmTier += 1;
          questProgress += 1;
          const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][Math.min(9, realmTier - 1)] || `M+${realmTier}`;
          bossMaxHp = Math.round(1800 * Math.pow(1.42, realmTier - 1));
          bossHp = bossMaxHp;
          bossName = `${['Kaelgor, Abyssal Titan', 'Vaelith, Void Sovereign', 'Malakor, Storm Colossus', 'Aurex, Chronos Devourer'][realmTier % 4]} · Tier ${roman}`;
          questTitle = `Clear Mythic+ Tier ${roman} & Unleash 1-of-1 Evolution`;
          questTarget = Math.max(1, questTarget + 1);
          xp += 420 * realmTier;
          gold += 350 * realmTier;
          sim.score += 1500 * realmTier;
          setHudScore(sim.score);
          spatialAudio.playVictoryChord();
          spawnBurst(bossState.x, groundHeightAt(bossState.x, bossState.z, activeBiome()) + 4.5, bossState.z, 0xf43f5e, 36);
        }
      }

      const nextProfile: EvolutionDnaProfile = { ...prev.evolutionProfile };
      if (dnaDelta) {
        (Object.keys(dnaDelta) as EvolutionAxis[]).forEach((ax) => {
          const val = dnaDelta[ax];
          if (typeof val === 'number') {
            nextProfile[ax] = Math.round((nextProfile[ax] + val) * 10) / 10;
          }
        });
      }

      let nextEvoProg = prev.evolutionProgress + evoProgressGain;
      let autoEvolve = false;
      if (nextEvoProg >= 100) {
        nextEvoProg -= 100;
        autoEvolve = true;
      }

      const nextMmo: MmorpgHudState = {
        ...prev,
        level,
        xp,
        xpToNext,
        hp: Math.min(maxHp, hp),
        maxHp,
        mana: Math.min(maxMana, mana),
        maxMana,
        gold,
        realmTier,
        bossName,
        bossHp,
        bossMaxHp,
        bossActive,
        questTitle,
        questProgress,
        questTarget,
        evolutionProfile: nextProfile,
        evolutionProgress: Math.min(99, Math.round(nextEvoProg))
      };
      mmorpgRef.current = nextMmo;
      setMmorpgHud(nextMmo);

      if (autoEvolve) {
        triggerEvolutionFnRef.current?.();
      }
    };

    const castSkillImpl = (slotIdx: number) => {
      const mmo = mmorpgRef.current;
      const biome = activeBiome();
      if (slotIdx < 0 || slotIdx > 3) return;
      if (mmo.skillCooldowns[slotIdx] > 0.05) return;

      const evolved = mmo.activeSlots[slotIdx];
      const baseList = BASE_CLASS_SKILLS[mmo.playerClass] || BASE_CLASS_SKILLS['Vanguard Paladin'];
      const baseSkill = baseList[slotIdx];

      const manaCost = evolved ? evolved.manaCost : baseSkill.mana;
      const cd = evolved ? evolved.cooldownSec : baseSkill.cd;
      if (mmo.mana < manaCost && !blueprintRef.current.physics.godMode) return;

      const py = groundHeightAt(player.x, player.z, biome);
      const fxHex = parseInt((evolved ? evolved.fxColorHex : baseSkill.color).replace('#', ''), 16) || 0xf59e0b;
      spawnBurst(player.x, py + 1.6, player.z, fxHex, evolved ? evolved.particleCount : 20);
      spatialAudio.playBeaconChime(slotIdx + 2);

      const powerMult = evolved ? evolved.powerMultiplier : 1.0;
      const dmg = Math.round((165 + mmo.level * 36) * powerMult);
      const distBoss = Math.hypot(bossState.x - player.x, bossState.z - player.z);

      let bossDmg = 0;
      let hpHeal = 0;
      let manaRestore = 0;
      const dnaDelta: Partial<EvolutionDnaProfile> = {};

      if (evolved) {
        if (evolved.effectType === 'nova_cleave' || evolved.effectType === 'storm_cataclysm') {
          bossDmg = distBoss < evolved.radius + 14 ? Math.round(dmg * 1.45) : Math.round(dmg * 0.6);
          dnaDelta.aggressor = 5;
          if (evolved.effectType === 'storm_cataclysm') dnaDelta.abyssal = 4;
          spawnBurst(bossState.x, groundHeightAt(bossState.x, bossState.z, biome) + 3.2, bossState.z, fxHex, 24);
        } else if (evolved.effectType === 'aegis_bastion') {
          hpHeal = Math.round(mmo.maxHp * 0.28);
          dnaDelta.guardian = 6;
          player.invulnTimer = Math.max(player.invulnTimer, 2.4);
        } else if (evolved.effectType === 'chrono_siphon') {
          manaRestore = 32;
          hpHeal = Math.round(mmo.maxHp * 0.14);
          bossDmg = Math.round(dmg * 0.85);
          dnaDelta.velocity = 6;
        } else if (evolved.effectType === 'gravity_singularity') {
          bossDmg = Math.round(dmg * 1.15);
          dnaDelta.tactician = 6;
          for (const b of beaconPool) {
            if (!b.collected && b.root.visible) {
              b.x += (player.x - b.x) * 0.45;
              b.z += (player.z - b.z) * 0.45;
              b.root.position.set(b.x, groundHeightAt(b.x, b.z, biome), b.z);
            }
          }
        } else if (evolved.effectType === 'world_genesis') {
          bossDmg = Math.round(dmg * 0.9);
          dnaDelta.architect = 7;
          if (conceptStructures.length < 18) {
            const sx = Math.round(player.x + Math.sin(player.yaw) * 7);
            const sz = Math.round(player.z + Math.cos(player.yaw) * 7);
            addConceptStructureToScene({
              id: `gen-${Date.now().toString(36)}`,
              conceptKind: 'crystal_cluster',
              x: sx,
              z: sz,
              scale: 0.9,
              colorHex: evolved.fxColorHex
            });
          }
        }
      } else {
        if (slotIdx === 0 || slotIdx === 3) {
          bossDmg = distBoss < 28 ? Math.round(dmg * (slotIdx === 3 ? 1.55 : 1.0)) : Math.round(dmg * 0.45);
          dnaDelta.aggressor = slotIdx === 3 ? 4 : 3;
          spawnBurst(bossState.x, groundHeightAt(bossState.x, bossState.z, biome) + 3.0, bossState.z, fxHex, 18);
        } else if (slotIdx === 1) {
          bossDmg = Math.round(dmg * 0.7);
          dnaDelta.velocity = 4;
          dnaDelta.tactician = 2;
          player.vx += Math.sin(player.yaw) * 18;
          player.vz += Math.cos(player.yaw) * 18;
        } else if (slotIdx === 2) {
          hpHeal = Math.round(mmo.maxHp * 0.2);
          manaRestore = 16;
          dnaDelta.guardian = 4;
        }
      }

      // Push back nearby sentinels on skill cast
      for (const s of sentinelPool) {
        if (!s.active) continue;
        const d = Math.hypot(s.x - player.x, s.z - player.z);
        if (d < 14) {
          s.vx *= -1.1;
          s.vz *= -1.1;
          spawnBurst(s.x, groundHeightAt(s.x, s.z, biome) + 1.8, s.z, fxHex, 10);
        }
      }

      const nextCooldowns: [number, number, number, number] = [...mmo.skillCooldowns] as [number, number, number, number];
      nextCooldowns[slotIdx] = cd;

      const updated: MmorpgHudState = {
        ...mmo,
        hp: Math.min(mmo.maxHp, mmo.hp + hpHeal),
        mana: Math.max(0, Math.min(mmo.maxMana, mmo.mana - manaCost + manaRestore)),
        skillCooldowns: nextCooldowns
      };
      mmorpgRef.current = updated;
      setMmorpgHud(updated);

      sim.score += Math.round(bossDmg * 0.8 + 80);
      setHudScore(sim.score);
      awardMmorpgProgress(55 + Math.round(bossDmg * 0.15), 25, bossDmg, dnaDelta, 18);
      requestRenderFnRef.current?.();
    };
    castSkillFnRef.current = castSkillImpl;

    const applyBlueprintToWorld = (bp: SpatialBlueprint, autoStart: boolean) => {
      blueprintRef.current = bp;
      setActiveBlueprint(bp);
      setFinishPreset(bp.finishPreset);
      setLightingPreset(bp.lightingPreset);

      const pipeline = bp.renderPipeline || BIOME_PRESET_DEFAULTS[bp.engineKind === 'mmorpg_world' || bp.engineKind === 'photoreal_sandbox' ? 'alpine_archipelago' : 'canyon_basin'];
      lightingRig.applyPipeline(pipeline, scene, renderer);
      if (bloomPass) {
        bloomPass.strength = pipeline.bloomEnabled ? pipeline.bloomStrength : 0;
        bloomPass.threshold = pipeline.bloomThreshold;
      }

      clearProcessNodes();
      clearConceptStructures();
      for (const spec of bp.entities || []) {
        addProcessNodeToScene(spec);
      }

      const isMmo = bp.engineKind === 'mmorpg_world';
      raidBoss.root.visible = isMmo;
      if (isMmo) {
        bossState.x = 0;
        bossState.z = -26;
        bossState.aoeCooldown = 6.5;
        raidBoss.root.position.set(0, groundHeightAt(0, -26, pipeline.biome), -26);
        const curMmo = mmorpgRef.current;
        const resetMmo: MmorpgHudState = {
          ...curMmo,
          hp: curMmo.maxHp,
          mana: curMmo.maxMana,
          bossHp: curMmo.bossMaxHp,
          bossActive: true,
          skillCooldowns: [0, 0, 0, 0]
        };
        mmorpgRef.current = resetMmo;
        setMmorpgHud(resetMmo);
      }

      sim.score = 0;
      sim.wave = 1;
      sim.combo = 1;
      sim.comboTimer = 0;
      sim.beaconsCollectedTotal = 0;
      sim.elapsedSec = 0;
      sim.packetsDeliveredTotal = 0;
      sim.faultsHealedTotal = 0;
      sim.orbitalFluxMw = 0;
      sim.faultTimer = 0;

      player.x = 0;
      player.z = 0;
      player.vx = 0;
      player.vz = 0;
      player.shields = 3;
      player.boostEnergy = 100;
      heroAvatar.root.position.set(0, groundHeightAt(0, 0, pipeline.biome), 0);

      spawnWave(1);
      setHudScore(0);
      setHudShields(3);
      setHudCombo(1);
      setHudElapsedSec(0);
      setHudProcessMetric(0);
      setHudThroughput(0);

      const validators = processNodes.filter((n) => n.kind === 'validator_node');
      if (validators.length > 0) {
        const healthy = validators.filter((v) => !v.faulty).length;
        setHudQuorumPct(Math.round((healthy / validators.length) * 100));
      } else {
        setHudQuorumPct(100);
      }

      if (autoStart) {
        setMode('game');
        setPhase('PLAYING');
      }
      requestRenderFnRef.current?.();
    };

    const resetGame = () => {
      applyBlueprintToWorld(blueprintRef.current, true);
    };

    restartGameFnRef.current = resetGame;
    applyBlueprintToWorld(blueprintRef.current, false);

    // Wire incoming spatial commands
    applyCommandFnRef.current = (cmd: SpatialCommandEvent) => {
      const payload = cmd.payload || {};
      const biome = activeBiome();
      switch (cmd.type) {
        case 'LOAD_BLUEPRINT': {
          if (payload.blueprint) {
            applyBlueprintToWorld(payload.blueprint as SpatialBlueprint, Boolean(payload.autoStart));
          }
          break;
        }
        case 'SPAWN_AGENT': {
          if (payload.agent) {
            upsertAgentActor(payload.agent as AgentParticipantState);
          }
          break;
        }
        case 'REMOVE_AGENT': {
          if (payload.agentId) {
            removeAgentActor(String(payload.agentId));
          }
          break;
        }
        case 'SPAWN_ENTITY': {
          if (payload.entity) {
            addProcessNodeToScene(payload.entity as BlueprintEntitySpec);
            const ent = payload.entity as BlueprintEntitySpec;
            spawnBurst(ent.x, groundHeightAt(ent.x, ent.z, biome) + 1.5, ent.z, 0x38bdf8, 14);
          }
          break;
        }
        case 'MUTATE_PHYSICS': {
          if (payload.physics) {
            const nextBp = {
              ...blueprintRef.current,
              physics: { ...blueprintRef.current.physics, ...payload.physics }
            };
            blueprintRef.current = nextBp;
            setActiveBlueprint(nextBp);
          }
          break;
        }
        case 'MUTATE_PIPELINE': {
          applyPipelinePatch(payload as Partial<RenderPipelineConfig>);
          break;
        }
        case 'FORGE_TOOL': {
          const tool = payload.tool as ProceduralEngineToolSpec | undefined;
          if (tool) {
            setForgedToolsList((prev) => [tool, ...prev.filter((t) => t.toolId !== tool.toolId)].slice(0, 24));
            if (tool.pipelinePatch) {
              applyPipelinePatch(tool.pipelinePatch);
            }
            if (tool.physicsPatch) {
              const nextBp = {
                ...blueprintRef.current,
                physics: { ...blueprintRef.current.physics, ...tool.physicsPatch }
              };
              blueprintRef.current = nextBp;
              setActiveBlueprint(nextBp);
            }
            if (Array.isArray(tool.generatedStructures)) {
              for (const st of tool.generatedStructures) {
                addConceptStructureToScene(st);
                spawnBurst(st.x, groundHeightAt(st.x, st.z, activeBiome()) + 2.5, st.z, 0x10b981, 12);
              }
            }
          }
          break;
        }
        case 'APPLY_GAME_MOD': {
          const nextBp = {
            ...blueprintRef.current,
            physics: {
              ...blueprintRef.current.physics,
              ...(typeof payload.godMode === 'boolean' ? { godMode: payload.godMode } : {}),
              ...(typeof payload.gravity === 'number' ? { gravity: payload.gravity } : {}),
              ...(typeof payload.speedScale === 'number' ? { speedScale: payload.speedScale } : {})
            }
          };
          blueprintRef.current = nextBp;
          setActiveBlueprint(nextBp);
          if (payload.biome || payload.weather || typeof payload.bloomStrength === 'number') {
            applyPipelinePatch({
              ...(payload.biome ? { biome: payload.biome } : {}),
              ...(payload.weather ? { weather: payload.weather } : {}),
              ...(typeof payload.bloomStrength === 'number' ? { bloomStrength: payload.bloomStrength } : {})
            });
          }
          spawnBurst(player.x, groundHeightAt(player.x, player.z, activeBiome()) + 2.0, player.z, 0xf59e0b, 20);
          break;
        }
        case 'CAST_RPG_SKILL': {
          const slot = Math.max(0, Math.min(3, Number(payload.skillSlot ?? 1) - 1));
          castSkillImpl(slot);
          break;
        }
        case 'EVOLVE_SKILL': {
          const sk = payload.evolvedSkill as EvolvedSkillSpec | undefined;
          if (sk) {
            const cur = mmorpgRef.current;
            const exists = cur.evolvedSkills.some((e) => e.dnaHash === sk.dnaHash);
            const nextList = exists ? cur.evolvedSkills : [sk, ...cur.evolvedSkills].slice(0, 32);
            const nextSlots: [EvolvedSkillSpec | null, EvolvedSkillSpec | null, EvolvedSkillSpec | null, EvolvedSkillSpec | null] = [...cur.activeSlots] as [EvolvedSkillSpec | null, EvolvedSkillSpec | null, EvolvedSkillSpec | null, EvolvedSkillSpec | null];
            nextSlots[sk.slotIndex] = sk;
            const nextMmo = {
              ...cur,
              evolvedSkills: nextList,
              activeSlots: nextSlots,
              evolutionProgress: 0
            };
            mmorpgRef.current = nextMmo;
            setMmorpgHud(nextMmo);
            setEvolutionBanner(sk);
            const fx = parseInt(sk.fxColorHex.replace('#', ''), 16) || 0xa855f7;
            spawnBurst(player.x, groundHeightAt(player.x, player.z, biome) + 2.2, player.z, fx, 28);
            spatialAudio.playVictoryChord();
          }
          break;
        }
        case 'INJECT_FAULT': {
          const healthyValidators = processNodes.filter((n) => n.kind === 'validator_node' && !n.faulty);
          if (healthyValidators.length > 0) {
            const target = healthyValidators[Math.floor(Math.random() * healthyValidators.length)];
            target.faulty = true;
            target.meshRef.setFaulty(true);
            spawnBurst(target.x, groundHeightAt(target.x, target.z, biome) + 2.4, target.z, 0xf43f5e, 18);
          }
          break;
        }
        case 'HEAL_QUORUM': {
          const faultyValidators = processNodes.filter((n) => n.kind === 'validator_node' && n.faulty);
          faultyValidators.forEach((v) => {
            v.faulty = false;
            v.meshRef.setFaulty(false);
            sim.faultsHealedTotal += 1;
            spawnBurst(v.x, groundHeightAt(v.x, v.z, biome) + 2.4, v.z, 0x10b981, 18);
          });
          break;
        }
        case 'AGENT_ACTION': {
          const actor = agentActors.get(String(payload.agentId || ''));
          if (actor) {
            if (payload.policy) actor.state.policy = payload.policy;
            if (typeof payload.targetX === 'number') actor.state.targetX = payload.targetX;
            if (typeof payload.targetZ === 'number') actor.state.targetZ = payload.targetZ;
            if (payload.subAction === 'boost') actor.boostCooldown = 2.5;
            if (payload.subAction === 'transfer_packet') {
              actor.state.carryingPacket = true;
              actor.state.packetsDelivered += 1;
              sim.packetsDeliveredTotal += 1;
            }
          }
          break;
        }
        case 'TRIGGER_WAVE': {
          sim.wave = Math.min(999, sim.wave + 1);
          spawnWave(sim.wave);
          break;
        }
        case 'START_SIMULATION': {
          if (payload.viewMode === 'studio') setMode('studio');
          else setMode('game');
          setPhase('PLAYING');
          break;
        }
        case 'PAUSE_SIMULATION': {
          setPhase('PAUSED');
          break;
        }
      }
      requestRenderFnRef.current?.();
    };

    getTelemetrySnapshotFnRef.current = () => {
      const bp = blueprintRef.current;
      const validators = processNodes.filter((n) => n.kind === 'validator_node');
      const healthyCount = validators.filter((v) => !v.faulty).length;
      const quorumPercent = validators.length > 0 ? Math.round((healthyCount / validators.length) * 100) : 100;
      const throughput = sim.elapsedSec > 1 ? Math.round((sim.packetsDeliveredTotal / sim.elapsedSec) * 60) : 0;

      let processValue = sim.score;
      if (bp.engineKind === 'swarm_logistics') processValue = throughput;
      else if (bp.engineKind === 'byzantine_mesh') processValue = quorumPercent;
      else if (bp.engineKind === 'orbital_physics') processValue = Math.round(sim.orbitalFluxMw);
      else if (bp.engineKind === 'mmorpg_world') processValue = Math.round((mmorpgRef.current.bossHp / Math.max(1, mmorpgRef.current.bossMaxHp)) * 100);

      return {
        mode: modeRef.current,
        phase: phaseRef.current,
        engineKind: bp.engineKind,
        blueprintId: bp.id,
        blueprintTitle: bp.title,
        score: sim.score,
        wave: sim.wave,
        shields: player.shields,
        playerX: Math.round(player.x * 10) / 10,
        playerZ: Math.round(player.z * 10) / 10,
        playerYaw: Math.round(player.yaw * 100) / 100,
        beaconsRemaining: sim.beaconsRemainingWave,
        processMetricLabel: bp.processConfig.metricLabel,
        processMetricValue: processValue,
        processMetricUnit: bp.processConfig.metricUnit,
        quorumPercent,
        throughputPerSec: throughput,
        orbitalFlux: Math.round(sim.orbitalFluxMw),
        entitiesCount: processNodes.length,
        biome: bp.renderPipeline?.biome || 'canyon_basin',
        weather: bp.renderPipeline?.weather || 'clear',
        godMode: Boolean(bp.physics.godMode),
        participants: Array.from(agentActors.values()).map((a) => ({
          ...a.state,
          x: Math.round(a.state.x * 10) / 10,
          z: Math.round(a.state.z * 10) / 10
        }))
      };
    };

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    applyCameraPresetFnRef.current = (preset: CameraPreset) => {
      scriptedCamActive = true;
      scriptedCamTarget.set(heroAvatar.root.position.x, heroAvatar.root.position.y + 0.9, heroAvatar.root.position.z);
      if (preset === 'hero') {
        scriptedCamPos.set(
          heroAvatar.root.position.x + 6.5,
          heroAvatar.root.position.y + 3.2,
          heroAvatar.root.position.z + 7.2
        );
      } else if (preset === 'top') {
        scriptedCamPos.set(
          heroAvatar.root.position.x,
          heroAvatar.root.position.y + 18.5,
          heroAvatar.root.position.z + 0.1
        );
      } else if (preset === 'detail') {
        scriptedCamPos.set(
          heroAvatar.root.position.x - 3.4,
          heroAvatar.root.position.y + 2.1,
          heroAvatar.root.position.z + 3.8
        );
      } else {
        scriptedCamPos.set(
          heroAvatar.root.position.x,
          heroAvatar.root.position.y + 5.2,
          heroAvatar.root.position.z - 12.5
        );
      }
      requestRenderFnRef.current?.();
    };

    exportCanvasFnRef.current = () => {
      if (!isSoftwareGl && composer) composer.render();
      else renderer.render(scene, camera);
      try {
        return renderer.domElement.toDataURL('image/png');
      } catch {
        return null;
      }
    };

    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(INSPECT_LAYER);
    const mouseNdc = new THREE.Vector2();
    let pointerDownX = 0;
    let pointerDownY = 0;

    const onPointerDown = (ev: PointerEvent) => {
      pointerDownX = ev.clientX;
      pointerDownY = ev.clientY;
    };

    const onPointerUp = (ev: PointerEvent) => {
      if (modeRef.current !== 'studio') return;
      if (Math.hypot(ev.clientX - pointerDownX, ev.clientY - pointerDownY) > 6) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouseNdc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      mouseNdc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouseNdc, camera);
      const hits = raycaster.intersectObjects(heroAvatar.root.children, true);
      if (hits.length > 0) {
        let obj: THREE.Object3D | null = hits[0].object;
        while (obj && !obj.userData?.partLabel && obj.parent) {
          obj = obj.parent;
        }
        if (obj?.userData?.partLabel) {
          setInspectedPart({
            label: String(obj.userData.partLabel),
            role: String(obj.userData.partRole || '')
          });
        }
      } else {
        setInspectedPart(null);
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    const handleResize = () => {
      if (!container) return;
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer?.setSize(w, h);
      bloomPass?.resolution.set(w, h);
      requestRenderFnRef.current?.();
    };
    const resizeObs = new ResizeObserver(handleResize);
    resizeObs.observe(container);

    let frameId = 0;
    let disposed = false;
    let renderBusy = false;
    let renderDirty = false;
    let lastTimeMs = performance.now();
    let hudSyncAccum = 0;

    const afterDraw = (cb: () => void) => {
      try {
        const gl = renderer.getContext() as WebGL2RenderingContext;
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const status = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
          if (status === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } catch {
        frameId = window.setTimeout(cb, 80);
      }
    };

    const advanceScene = (dt: number) => {
      sim.elapsedClock += dt;
      const bp = blueprintRef.current;
      const biome = activeBiome();
      const isMmo = bp.engineKind === 'mmorpg_world';
      const isGodMode = Boolean(bp.physics.godMode);

      lightingRig.updateAtmosphere(dt, sim.elapsedClock);

      const hpState = hyperdimensionalPhysics.update(dt, sim.elapsedClock, heroAvatar.root.position);
      if (Math.random() < 0.15) {
        setHyperPhysics({ ...hpState });
      }

      const ueState = unrealEngineBeta.update(dt, sim.elapsedClock);
      if (Math.random() < 0.15) {
        setUnrealState({ ...ueState });
      }

      // Exploded view damping in Studio Mode
      const targetExplode = modeRef.current === 'studio' ? explodeTargetRef.current : 0;
      sim.currentExplode = THREE.MathUtils.damp(sim.currentExplode, targetExplode, 7, dt);

      // Animate Procedural Engine Tool Concept Structures
      for (const cs of conceptStructures) {
        cs.meshRef.rotator.rotation.y += dt * 1.15;
      }

      // Animate Process Nodes (rotors, rings) & draw zero-GC telemetry link beams
      let segIdx = 0;
      for (let i = 0; i < processNodes.length; i++) {
        const pn = processNodes[i];
        pn.meshRef.coreMesh.rotation.y += dt * (pn.faulty ? 3.5 : 1.4);
        pn.meshRef.ringMesh.rotation.z += dt * (pn.kind === 'gravity_well' ? -2.2 : 1.1);
        if (i + 1 < processNodes.length && pn.kind !== 'gravity_well') {
          const next = processNodes[i + 1];
          linkLines.setSegment(
            segIdx++,
            pn.x,
            groundHeightAt(pn.x, pn.z, biome) + 2.3,
            pn.z,
            next.x,
            groundHeightAt(next.x, next.z, biome) + 2.3,
            next.z
          );
        }
      }

      if (modeRef.current === 'game' && phaseRef.current === 'PLAYING') {
        if (player.hitstopTimer > 0) {
          player.hitstopTimer = Math.max(0, player.hitstopTimer - dt);
        } else {
          sim.elapsedSec += dt;
          const speedScale = bp.physics.speedScale || 1.0;
          const dragRate = bp.physics.drag || 6.0;
          const arenaLimit = Math.min(ARENA_HALF_EXTENT - 2, bp.physics.arenaRadius || 44);

          // Fault injection cadence in Byzantine mode
          if (bp.engineKind === 'byzantine_mesh' && bp.processConfig.faultInjectionRate > 0) {
            sim.faultTimer += dt * bp.processConfig.faultInjectionRate;
            if (sim.faultTimer >= 2.2) {
              sim.faultTimer = 0;
              const healthy = processNodes.filter((n) => n.kind === 'validator_node' && !n.faulty);
              if (healthy.length > 2) {
                const chosen = healthy[Math.floor(Math.random() * healthy.length)];
                chosen.faulty = true;
                chosen.meshRef.setFaulty(true);
              }
            }
          }

          // Player Controls
          const inputX =
            (keysRef.current['KeyD'] || keysRef.current['ArrowRight'] ? 1 : 0) -
            (keysRef.current['KeyA'] || keysRef.current['ArrowLeft'] ? 1 : 0) +
            touchSteerRef.current.x;
          const inputZ =
            (keysRef.current['KeyS'] || keysRef.current['ArrowDown'] ? 1 : 0) -
            (keysRef.current['KeyW'] || keysRef.current['ArrowUp'] ? 1 : 0) +
            touchSteerRef.current.z;

          const wantsBoost = Boolean(keysRef.current['Space'] || touchSteerRef.current.boost);
          const isBoosting = wantsBoost && player.boostEnergy > 6;

          if (isBoosting && !player.wasBoosting) {
            spatialAudio.playBoostEngage();
          }
          player.wasBoosting = isBoosting;

          if (isBoosting) player.boostEnergy = Math.max(0, player.boostEnergy - (isGodMode ? 8 : 42) * dt);
          else player.boostEnergy = Math.min(100, player.boostEnergy + 24 * dt);

          _vecA.set(inputX, 0, inputZ);
          if (_vecA.lengthSq() > 1) _vecA.normalize();

          const maxSpeed = (isBoosting ? bp.physics.thrustPower || 34 : 21) * speedScale;
          const accelRate = isBoosting ? Math.max(6, dragRate * 1.35) : dragRate;

          let targetVx = _vecA.x * maxSpeed;
          let targetVz = _vecA.z * maxSpeed;

          // Apply Gravity Well Slingshot Forces on Player
          for (const pn of processNodes) {
            if (pn.kind !== 'gravity_well') continue;
            const dx = pn.x - player.x;
            const dz = pn.z - player.z;
            const dist = Math.hypot(dx, dz);
            if (dist > 1.5 && dist < 24) {
              const pull = ((bp.physics.magneticPull || 8) / Math.max(3, dist)) * 11;
              targetVx += (dx / dist) * pull - (dz / dist) * pull * 0.45;
              targetVz += (dz / dist) * pull + (dx / dist) * pull * 0.45;
              sim.orbitalFluxMw += dt * pull * 1.8;
            }
          }

          player.vx = THREE.MathUtils.damp(player.vx, targetVx, accelRate, dt);
          player.vz = THREE.MathUtils.damp(player.vz, targetVz, accelRate, dt);
          player.x += player.vx * dt;
          player.z += player.vz * dt;

          const radial = Math.hypot(player.x, player.z);
          if (radial > arenaLimit) {
            const scale = arenaLimit / radial;
            player.x *= scale;
            player.z *= scale;
            player.vx *= 0.65;
            player.vz *= 0.65;
          }

          const speedSq = player.vx * player.vx + player.vz * player.vz;
          if (speedSq > 0.25) {
            const targetYaw = Math.atan2(player.vx, player.vz);
            let diff = targetYaw - player.yaw;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            player.yaw += diff * (1 - Math.exp(-10 * dt));
          }

          const bankTarget = THREE.MathUtils.clamp(-player.vx * 0.025, -0.45, 0.45);
          player.roll = THREE.MathUtils.damp(player.roll, bankTarget, 8, dt);
          player.pitch = THREE.MathUtils.damp(player.pitch, isBoosting ? -0.09 : 0, 8, dt);

          const baseY = groundHeightAt(player.x, player.z, biome);
          heroAvatar.root.position.set(player.x, baseY, player.z);
          heroAvatar.root.rotation.y = player.yaw;

          const moveSpeed = Math.sqrt(speedSq);
          heroAvatar.animateCharacter(moveSpeed, sim.elapsedClock, 0);

          sim.targetFov = isBoosting ? 60 : 52;
          if (Math.abs(camera.fov - sim.targetFov) > 0.05) {
            camera.fov = THREE.MathUtils.damp(camera.fov, sim.targetFov, 7, dt);
            camera.updateProjectionMatrix();
          }

          if (sim.comboTimer > 0) {
            sim.comboTimer -= dt;
            if (sim.comboTimer <= 0 && sim.combo > 1) {
              sim.combo = 1;
              setHudCombo(1);
            }
          }

          if (player.invulnTimer > 0) {
            player.invulnTimer = Math.max(0, player.invulnTimer - dt);
            heroAvatar.root.visible = Math.floor(player.invulnTimer * 16) % 2 === 0;
          } else {
            heroAvatar.root.visible = true;
          }

          // MMORPG Raid Boss Loop, Mana Regen & 6-Axis Evolution Telemetry
          if (isMmo && raidBoss.root.visible) {
            bossState.x = Math.sin(sim.elapsedClock * 0.35) * 14;
            bossState.z = -22 + Math.cos(sim.elapsedClock * 0.28) * 7;
            const bossY = groundHeightAt(bossState.x, bossState.z, biome);
            raidBoss.root.position.set(bossState.x, bossY, bossState.z);
            raidBoss.crownRing.rotation.z += dt * 1.4;
            raidBoss.coreOrb.rotation.y += dt * 1.8;
            raidBoss.aoeRing.scale.setScalar(1 + Math.sin(sim.elapsedClock * 3.5) * 0.12);

            bossState.aoeCooldown -= dt;
            const distPlayerBoss = Math.hypot(player.x - bossState.x, player.z - bossState.z);
            if (bossState.aoeCooldown <= 0) {
              bossState.aoeCooldown = 5.4;
              spawnBurst(bossState.x, bossY + 1.2, bossState.z, 0xf43f5e, 18);
              if (distPlayerBoss < 7.2 && !isGodMode && player.invulnTimer <= 0) {
                const dmgTaken = 28 + mmorpgRef.current.realmTier * 8;
                const cur = mmorpgRef.current;
                const nextHp = Math.max(0, cur.hp - dmgTaken);
                const nextMmo = { ...cur, hp: nextHp };
                mmorpgRef.current = nextMmo;
                setMmorpgHud(nextMmo);
                player.invulnTimer = 1.1;
                player.shakeIntensity = 0.6;
                spatialAudio.playShieldImpact();
                if (nextHp <= 0) {
                  setPhase('GAME_OVER');
                  persistRunRef.current({
                    mode: bp.engineKind,
                    shipFinish: finishRef.current,
                    score: sim.score,
                    wave: mmorpgRef.current.realmTier,
                    beaconsCollected: sim.beaconsCollectedTotal,
                    durationSec: sim.elapsedSec,
                    status: 'DEFEAT',
                    agentsCount: agentActors.size,
                    engineTitle: bp.title
                  });
                }
              }
            }

            // Passive Mana Regen & Cooldown Tick & Passive Behavioral DNA Telemetry
            const cur = mmorpgRef.current;
            const nextCds: [number, number, number, number] = [
              Math.max(0, cur.skillCooldowns[0] - dt),
              Math.max(0, cur.skillCooldowns[1] - dt),
              Math.max(0, cur.skillCooldowns[2] - dt),
              Math.max(0, cur.skillCooldowns[3] - dt)
            ];
            const nextMana = Math.min(cur.maxMana, cur.mana + 5.8 * dt);
            const nextProfile: EvolutionDnaProfile = { ...cur.evolutionProfile };
            if (speedSq > 480) nextProfile.velocity += dt * 1.4;
            if (distPlayerBoss < 13) nextProfile.aggressor += dt * 1.2;
            if (cur.hp / Math.max(1, cur.maxHp) < 0.45) nextProfile.abyssal += dt * 1.6;
            if (conceptStructures.length > 0) nextProfile.architect += dt * 0.5;
            mmorpgRef.current = { ...cur, mana: nextMana, skillCooldowns: nextCds, evolutionProfile: nextProfile };
          }

          // Player interacts with Process Nodes (heal faulty validators / boost orbital flux)
          for (const pn of processNodes) {
            const dx = player.x - pn.x;
            const dz = player.z - pn.z;
            if (dx * dx + dz * dz < 11) {
              if (pn.kind === 'validator_node' && pn.faulty) {
                pn.faulty = false;
                pn.meshRef.setFaulty(false);
                sim.faultsHealedTotal += 1;
                sim.score += 220;
                spatialAudio.playBeaconChime(3);
                spawnBurst(pn.x, groundHeightAt(pn.x, pn.z, biome) + 2.4, pn.z, 0x10b981, 16);
                setHudScore(sim.score);
                if (isMmo) awardMmorpgProgress(40, 20, 0, { tactician: 3 }, 6);
              }
            }
          }

          // Advance & Animate Participating Autonomous AI Agents in 3D Space
          for (const actor of agentActors.values()) {
            const st = actor.state;
            if (!st.active) continue;
            if (actor.boostCooldown > 0) actor.boostCooldown = Math.max(0, actor.boostCooldown - dt);
            if (actor.attackCooldown > 0) actor.attackCooldown = Math.max(0, actor.attackCooldown - dt);

            let aimX = 0;
            let aimZ = 0;
            let hasAim = false;

            if (typeof st.targetX === 'number' && typeof st.targetZ === 'number') {
              aimX = st.targetX;
              aimZ = st.targetZ;
              hasAim = true;
              if (Math.hypot(aimX - st.x, aimZ - st.z) < 2.2) {
                st.targetX = undefined;
                st.targetZ = undefined;
                st.tasksCompleted += 1;
                st.lastAction = `Reached directive [${Math.round(aimX)}, ${Math.round(aimZ)}]`;
              }
            } else if (isMmo && raidBoss.root.visible && st.role !== 'process_worker') {
              // AI Raid Party engages Boss / Heals Player / Deflects Sentinels
              const orbitTheta = sim.elapsedClock * 0.95 + st.agentId.length * 1.4;
              aimX = bossState.x + Math.cos(orbitTheta) * 7.8;
              aimZ = bossState.z + Math.sin(orbitTheta) * 7.8;
              hasAim = true;

              if (actor.attackCooldown <= 0 && Math.hypot(bossState.x - st.x, bossState.z - st.z) < 12) {
                actor.attackCooldown = 2.6;
                const partyDmg = st.dps ? Math.round(st.dps * 0.65) : 45;
                st.score += partyDmg;
                st.tasksCompleted += 1;
                if (st.rpgClass === 'Sylvana Cleric' || st.role === 'guardian') {
                  const curMmo = mmorpgRef.current;
                  mmorpgRef.current = { ...curMmo, hp: Math.min(curMmo.maxHp, curMmo.hp + 16) };
                  st.lastAction = `Cast Seraphic Heal (+16 HP) & struck Boss (-${partyDmg})`;
                  spawnBurst(player.x, baseY + 1.5, player.z, 0x10b981, 8);
                } else {
                  st.lastAction = `${st.rpgClass || 'Raid Hero'} struck Raid Boss (-${partyDmg} HP)`;
                  spawnBurst(bossState.x, groundHeightAt(bossState.x, bossState.z, biome) + 3.0, bossState.z, 0x38bdf8, 8);
                }
                awardMmorpgProgress(15, 8, partyDmg, undefined, 2);
              }
            } else if (st.policy === 'consensus_sync') {
              const faultyNode = processNodes.find((n) => n.kind === 'validator_node' && n.faulty);
              if (faultyNode) {
                aimX = faultyNode.x;
                aimZ = faultyNode.z;
                hasAim = true;
                if (Math.hypot(aimX - st.x, aimZ - st.z) < 3.6) {
                  faultyNode.faulty = false;
                  faultyNode.meshRef.setFaulty(false);
                  st.faultsHealed += 1;
                  st.tasksCompleted += 1;
                  st.score += 250;
                  sim.faultsHealedTotal += 1;
                  st.lastAction = `Healed ${faultyNode.label}`;
                  spawnBurst(faultyNode.x, groundHeightAt(faultyNode.x, faultyNode.z, biome) + 2.5, faultyNode.z, 0x06b6d4, 14);
                }
              }
            } else if (st.policy === 'route_packets') {
              const targetKind: ProcessEntityKind =
                actor.stage === 'to_source'
                  ? 'relay_source'
                  : actor.stage === 'to_proc'
                    ? 'relay_processor'
                    : 'relay_sink';
              const candidates = processNodes.filter((n) => n.kind === targetKind);
              const fallback = processNodes.filter((n) => n.kind !== 'gravity_well');
              const chosen =
                candidates.length > 0
                  ? candidates[(st.tasksCompleted + st.packetsDelivered) % candidates.length]
                  : fallback[0];
              if (chosen) {
                aimX = chosen.x;
                aimZ = chosen.z;
                hasAim = true;
                if (Math.hypot(aimX - st.x, aimZ - st.z) < 3.5) {
                  if (actor.stage === 'to_source') {
                    actor.stage = 'to_proc';
                    st.carryingPacket = true;
                    st.lastAction = `Loaded packet at ${chosen.label}`;
                  } else if (actor.stage === 'to_proc') {
                    actor.stage = 'to_sink';
                    st.carryingPacket = true;
                    st.lastAction = `Routed packet via ${chosen.label}`;
                  } else {
                    actor.stage = 'to_source';
                    st.carryingPacket = false;
                    st.packetsDelivered += 1;
                    st.tasksCompleted += 1;
                    st.score += 180;
                    sim.packetsDeliveredTotal += 1;
                    st.lastAction = `Delivered packet to ${chosen.label}`;
                    spawnBurst(chosen.x, groundHeightAt(chosen.x, chosen.z, biome) + 2.4, chosen.z, 0xf59e0b, 12);
                  }
                }
              }
            } else if (st.policy === 'orbit_hold') {
              const well = processNodes.find((n) => n.kind === 'gravity_well');
              const cx = well ? well.x : 0;
              const cz = well ? well.z : 0;
              const orbitTheta = sim.elapsedClock * 1.15 + st.agentId.length;
              aimX = cx + Math.cos(orbitTheta) * 11.5;
              aimZ = cz + Math.sin(orbitTheta) * 11.5;
              hasAim = true;
              sim.orbitalFluxMw += dt * 4.5;
            } else if (st.policy === 'escort') {
              const offsetAngle = player.yaw + (st.role === 'ally' ? 2.3 : -2.3);
              aimX = player.x + Math.sin(offsetAngle) * 7.5;
              aimZ = player.z + Math.cos(offsetAngle) * 7.5;
              hasAim = true;
            } else if (st.policy === 'intercept') {
              const activeSentinel = sentinelPool.find((s) => s.active && s.root.visible);
              if (activeSentinel) {
                aimX = activeSentinel.x;
                aimZ = activeSentinel.z;
                hasAim = true;
                if (Math.hypot(aimX - st.x, aimZ - st.z) < 3.8) {
                  activeSentinel.vx *= -0.7;
                  activeSentinel.vz *= -0.7;
                  st.tasksCompleted += 1;
                  st.score += 90;
                  st.lastAction = 'Deflected Sentinel trajectory';
                  spawnBurst(activeSentinel.x, groundHeightAt(activeSentinel.x, activeSentinel.z, biome) + 2.0, activeSentinel.z, 0xf43f5e, 10);
                }
              }
            }

            if (!hasAim) {
              let bestDist = Infinity;
              for (const b of beaconPool) {
                if (b.collected || !b.root.visible) continue;
                const d = Math.hypot(b.x - st.x, b.z - st.z);
                if (d < bestDist) {
                  bestDist = d;
                  aimX = b.x;
                  aimZ = b.z;
                  hasAim = true;
                }
              }
              if (!hasAim) {
                const orbitA = sim.elapsedClock * 0.7 + st.agentId.length * 1.3;
                aimX = Math.cos(orbitA) * 16;
                aimZ = Math.sin(orbitA) * 16;
              }
            }

            const dxAim = aimX - st.x;
            const dzAim = aimZ - st.z;
            const dLen = Math.max(0.01, Math.hypot(dxAim, dzAim));
            const agentTopSpeed = (actor.boostCooldown > 0 ? 31 : 19) * speedScale;

            st.vx = THREE.MathUtils.damp(st.vx, (dxAim / dLen) * agentTopSpeed, 4.5, dt);
            st.vz = THREE.MathUtils.damp(st.vz, (dzAim / dLen) * agentTopSpeed, 4.5, dt);
            st.x += st.vx * dt;
            st.z += st.vz * dt;

            const agRadial = Math.hypot(st.x, st.z);
            if (agRadial > arenaLimit) {
              st.x *= arenaLimit / agRadial;
              st.z *= arenaLimit / agRadial;
            }

            if (st.vx * st.vx + st.vz * st.vz > 0.2) {
              const desiredYaw = Math.atan2(st.vx, st.vz);
              let diff = desiredYaw - st.yaw;
              while (diff > Math.PI) diff -= Math.PI * 2;
              while (diff < -Math.PI) diff += Math.PI * 2;
              st.yaw += diff * (1 - Math.exp(-9 * dt));
            }

            st.y = groundHeightAt(st.x, st.z, biome) + 0.35 + Math.sin(sim.elapsedClock * 3.8 + st.agentId.length) * 0.1;
            actor.meshRef.root.position.set(st.x, st.y, st.z);
            actor.meshRef.root.rotation.set(actor.boostCooldown > 0 ? -0.1 : 0, st.yaw, THREE.MathUtils.clamp(-st.vx * 0.02, -0.35, 0.35));
            actor.meshRef.haloRing.rotation.z += dt * 2.4;
            actor.meshRef.coreMesh.rotation.y += dt * 2.0;
            actor.meshRef.packetIndicator.visible = Boolean(st.carryingPacket);
            actor.meshRef.packetIndicator.rotation.y += dt * 3.2;

            if (hasAim) {
              linkLines.setSegment(
                segIdx++,
                st.x,
                st.y + 1.0,
                st.z,
                aimX,
                groundHeightAt(aimX, aimZ, biome) + 1.8,
                aimZ
              );
            }
          }

          // Animate & collide Resonance Beacons (Player + Autonomous AI Agents can harvest!)
          for (let i = 0; i < beaconPool.length; i++) {
            const b = beaconPool[i];
            if (b.collected || !b.root.visible) continue;

            b.crystal.rotation.y += dt * 1.9;
            b.ringA.rotation.x += dt * 1.5;
            b.ringA.rotation.y += dt * 0.9;
            b.ringB.rotation.z -= dt * 1.8;

            let collectorName: string | null = null;
            let collectorActor: LiveAgentActor | null = null;

            const dxP = player.x - b.x;
            const dzP = player.z - b.z;
            if (dxP * dxP + dzP * dzP < 6.8) {
              collectorName = 'player';
            } else {
              for (const actor of agentActors.values()) {
                const dxA = actor.state.x - b.x;
                const dzA = actor.state.z - b.z;
                if (dxA * dxA + dzA * dzA < 6.4) {
                  collectorName = actor.state.name;
                  collectorActor = actor;
                  break;
                }
              }
            }

            if (collectorName) {
              b.collected = true;
              b.root.visible = false;
              const baseVal = bp.rules.beaconValue || 150;
              if (collectorActor) {
                collectorActor.state.score += baseVal;
                collectorActor.state.tasksCompleted += 1;
                collectorActor.state.lastAction = 'Captured resonance beacon';
                if (collectorActor.state.role !== 'rival') {
                  sim.score += Math.round(baseVal * 0.5);
                }
                spawnBurst(b.x, groundHeightAt(b.x, b.z, biome) + 1.4, b.z, 0x10b981, 14);
              } else {
                sim.combo = Math.min(8, sim.comboTimer > 0 ? sim.combo + 1 : 1);
                sim.comboTimer = 4.2;
                sim.score += baseVal * sim.combo;
                spatialAudio.playBeaconChime(sim.combo);
                spawnBurst(b.x, groundHeightAt(b.x, b.z, biome) + 1.4, b.z, 0xfbbf24, 16);
                setHudCombo(sim.combo);
                if (isMmo) awardMmorpgProgress(35, 18, 25, { velocity: 1.5, tactician: 1.5 }, 8);
              }

              sim.beaconsCollectedTotal += 1;
              sim.beaconsRemainingWave -= 1;

              setHudScore(sim.score);
              setHudBeaconsRemaining(sim.beaconsRemainingWave);

              if (sim.beaconsRemainingWave <= 0) {
                const waveCap = bp.rules.waveCount || TOTAL_WAVES;
                if (sim.wave >= waveCap && !isMmo) {
                  sim.score += player.shields * 300;
                  setHudScore(sim.score);
                  spatialAudio.playVictoryChord();
                  setPhase('VICTORY');
                  persistRunRef.current({
                    mode: bp.engineKind,
                    shipFinish: finishRef.current,
                    score: sim.score,
                    wave: sim.wave,
                    beaconsCollected: sim.beaconsCollectedTotal,
                    durationSec: sim.elapsedSec,
                    status: 'VICTORY',
                    agentsCount: agentActors.size,
                    engineTitle: bp.title
                  });
                } else {
                  sim.wave += 1;
                  spawnWave(sim.wave);
                }
              }
            }
          }

          // Animate & collide Armored Sentinels
          for (let i = 0; i < sentinelPool.length; i++) {
            const s = sentinelPool[i];
            if (!s.active || !s.root.visible) continue;

            s.x += s.vx * dt;
            s.z += s.vz * dt;
            const r = Math.hypot(s.x, s.z);
            if (r > arenaLimit - 2) {
              const nx = s.x / r;
              const nz = s.z / r;
              const dot = s.vx * nx + s.vz * nz;
              s.vx -= 2 * dot * nx;
              s.vz -= 2 * dot * nz;
              s.x = nx * (arenaLimit - 2);
              s.z = nz * (arenaLimit - 2);
            }

            s.root.position.set(s.x, groundHeightAt(s.x, s.z, biome), s.z);
            s.shroudRing.rotation.z += dt * 2.1;
            s.core.rotation.y += dt * 1.6;

            if (player.invulnTimer <= 0) {
              const dx = player.x - s.x;
              const dz = player.z - s.z;
              if (dx * dx + dz * dz < 6.8) {
                if (isGodMode) {
                  // Mod God Mode deflects hazards automatically with burst FX
                  s.vx *= -1.15;
                  s.vz *= -1.15;
                  spawnBurst(s.x, groundHeightAt(s.x, s.z, biome) + 1.5, s.z, 0xfbbf24, 14);
                  continue;
                }
                player.shields -= 1;
                player.invulnTimer = 1.6;
                player.hitstopTimer = 0.04;
                player.shakeIntensity = 0.75;
                sim.combo = 1;
                sim.comboTimer = 0;

                const dist = Math.max(0.1, Math.hypot(dx, dz));
                player.vx = (dx / dist) * 18;
                player.vz = (dz / dist) * 18;

                spatialAudio.playShieldImpact();
                spawnBurst(player.x, baseY + 1.0, player.z, 0xf43f5e, 18);

                setHudShields(player.shields);
                setHudCombo(1);

                if (player.shields <= 0) {
                  spatialAudio.playDefeatTone();
                  heroAvatar.root.visible = true;
                  setPhase('GAME_OVER');
                  persistRunRef.current({
                    mode: bp.engineKind,
                    shipFinish: finishRef.current,
                    score: sim.score,
                    wave: sim.wave,
                    beaconsCollected: sim.beaconsCollectedTotal,
                    durationSec: sim.elapsedSec,
                    status: 'DEFEAT',
                    agentsCount: agentActors.size,
                    engineTitle: bp.title
                  });
                }
              }
            }
          }
        }

        // Smooth Chase Camera
        const backOffsetX = Math.sin(player.yaw) * -10.8;
        const backOffsetZ = Math.cos(player.yaw) * -10.8;
        _camTargetPos.set(
          player.x + backOffsetX,
          groundHeightAt(player.x, player.z, biome) + 5.8,
          player.z + backOffsetZ
        );
        if (player.shakeIntensity > 0.01) {
          _camTargetPos.x += (Math.random() - 0.5) * player.shakeIntensity;
          _camTargetPos.y += (Math.random() - 0.5) * player.shakeIntensity * 0.6;
          player.shakeIntensity = THREE.MathUtils.damp(player.shakeIntensity, 0, 8, dt);
        }

        camera.position.lerp(_camTargetPos, 1 - Math.exp(-6.5 * dt));
        _camLookTarget.set(
          player.x + Math.sin(player.yaw) * 4.5,
          groundHeightAt(player.x, player.z, biome) + 1.2,
          player.z + Math.cos(player.yaw) * 4.5
        );
        camera.lookAt(_camLookTarget);

        hudSyncAccum += dt;
        if (hudSyncAccum >= 0.14) {
          hudSyncAccum = 0;
          setHudBoostEnergy(Math.round(player.boostEnergy));
          setHudElapsedSec(Math.floor(sim.elapsedSec));
          if (isMmo) {
            setMmorpgHud({ ...mmorpgRef.current });
          }

          const validators = processNodes.filter((n) => n.kind === 'validator_node');
          const healthyCnt = validators.filter((v) => !v.faulty).length;
          const quorumPct = validators.length > 0 ? Math.round((healthyCnt / validators.length) * 100) : 100;
          const throughput = sim.elapsedSec > 1 ? Math.round((sim.packetsDeliveredTotal / sim.elapsedSec) * 60) : 0;
          setHudQuorumPct(quorumPct);
          setHudThroughput(throughput);

          if (bp.engineKind === 'swarm_logistics') setHudProcessMetric(throughput);
          else if (bp.engineKind === 'byzantine_mesh') setHudProcessMetric(quorumPct);
          else if (bp.engineKind === 'orbital_physics') setHudProcessMetric(Math.round(sim.orbitalFluxMw));
          else if (isMmo) {
            const totalDps = Array.from(agentActors.values()).reduce((s, a) => s + (a.state.dps || 80), 210);
            setHudProcessMetric(totalDps);
          } else setHudProcessMetric(sim.score);

          // Update lightweight projected floating callsign badges & sidebar crew snapshot
          const projections: AgentLabelProjection[] = [];
          const crewList: AgentParticipantState[] = [];
          for (const actor of agentActors.values()) {
            const st = actor.state;
            crewList.push({ ...st });
            _projVec.set(st.x, st.y + 2.1, st.z);
            _projVec.project(camera);
            const isBehind = _projVec.z > 1;
            const leftPct = (_projVec.x * 0.5 + 0.5) * 100;
            const topPct = (-_projVec.y * 0.5 + 0.5) * 100;
            projections.push({
              agentId: st.agentId,
              name: st.name,
              role: st.role,
              rpgClass: st.rpgClass,
              colorHex: st.colorHex,
              score: st.score,
              leftPct,
              topPct,
              visible: !isBehind && leftPct >= 4 && leftPct <= 96 && topPct >= 8 && topPct <= 92
            });
          }
          setAgentLabels(projections);
          setParticipantsHud(crewList);
        }
      } else {
        setAgentLabels([]);
        if (modeRef.current === 'game' && phaseRef.current === 'TITLE_MENU') {
          const orbitAngle = sim.elapsedClock * 0.25;
          camera.position.set(Math.cos(orbitAngle) * 12.5, 5.2, Math.sin(orbitAngle) * 12.5);
          camera.lookAt(0, 1.1, 0);
        } else if (modeRef.current === 'studio') {
          controls.enabled = true;
          if (scriptedCamActive) {
            camera.position.lerp(scriptedCamPos, 1 - Math.exp(-6 * dt));
            controls.target.lerp(scriptedCamTarget, 1 - Math.exp(-6 * dt));
            if (camera.position.distanceTo(scriptedCamPos) < 0.05) {
              scriptedCamActive = false;
            }
          }
          controls.update();
        }
      }

      linkLines.commitCount(segIdx);

      // Advance burst particles
      let particlesChanged = false;
      for (let i = 0; i < bursts.length; i++) {
        const p = bursts[i];
        if (!p.active) continue;
        particlesChanged = true;
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.active = false;
          _dummy.position.set(0, -50, 0);
          _dummy.scale.set(0, 0, 0);
        } else {
          p.vel.y -= 12 * dt;
          p.pos.addScaledVector(p.vel, dt);
          const s = 1 - p.life / p.maxLife;
          _dummy.position.copy(p.pos);
          _dummy.scale.setScalar(s);
          _dummy.rotation.set(p.life * 6, p.life * 4, 0);
        }
        _dummy.updateMatrix();
        burstMesh.setMatrixAt(i, _dummy.matrix);
      }
      if (particlesChanged) {
        burstMesh.instanceMatrix.needsUpdate = true;
      }
    };

    const needsContinuousLoop = () => {
      if (modeRef.current === 'game' && (phaseRef.current === 'PLAYING' || phaseRef.current === 'TITLE_MENU')) {
        return true;
      }
      if (Math.abs(sim.currentExplode - explodeTargetRef.current) > 0.005) return true;
      if (scriptedCamActive) return true;
      if (bursts.some((b) => b.active)) return true;
      return false;
    };

    const requestRender = () => {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame((nowMs) => {
        if (disposed) return;
        renderDirty = false;
        const dt = Math.min((nowMs - lastTimeMs) / 1000, 0.05);
        lastTimeMs = nowMs;

        advanceScene(dt);
        if (!isSoftwareGl && composer) {
          composer.render();
        } else {
          renderer.render(scene, camera);
        }

        const done = () => {
          renderBusy = false;
          if (!disposed && (renderDirty || needsContinuousLoop())) {
            requestRender();
          }
        };

        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    };

    requestRenderFnRef.current = requestRender;
    controls.addEventListener('change', requestRender);
    requestRender();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObs.disconnect();
      controls.removeEventListener('start', onControlStart);
      controls.removeEventListener('change', requestRender);
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);

      clearProcessNodes();
      clearConceptStructures();
      for (const actor of agentActors.values()) {
        scene.remove(actor.meshRef.root);
        actor.meshRef.disposables.forEach((d) => d.dispose());
      }
      agentActors.clear();
      linkLines.dispose();
      raidBoss.disposables.forEach((d) => d.dispose());
      heroAvatar.disposables.forEach((d) => d.dispose());
      beaconPool.forEach((b) => b.disposables.forEach((d) => d.dispose()));
      sentinelPool.forEach((s) => s.disposables.forEach((d) => d.dispose()));
      envDisposables.forEach((d) => d.dispose());
      matLib.dispose();
      bloomPass?.dispose();
      composer?.dispose();
      renderer.dispose();
    };
  }, []);

  // Blueprint & Agent Server Dispatch Helpers
  const handleSelectEnginePreset = async (kind: Exclude<EngineKind, 'custom_world'>) => {
    setForgeBusy(true);
    try {
      const res = await apiFetch('/api/spatial/blueprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engineKind: kind, autoStart: true, spawnDefaultAgents: true })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.blueprint) {
          applyCommandFnRef.current?.({
            seq: data.latestSeq || Date.now(),
            timestamp: new Date().toISOString(),
            sourceAgent: 'ui-selector',
            type: 'LOAD_BLUEPRINT',
            payload: { blueprint: data.blueprint, autoStart: true }
          });
        }
        if (Array.isArray(data.participants)) {
          data.participants.forEach((ag: AgentParticipantState) => {
            applyCommandFnRef.current?.({
              seq: 0,
              timestamp: new Date().toISOString(),
              sourceAgent: ag.agentId,
              type: 'SPAWN_AGENT',
              payload: { agent: ag }
            });
          });
        }
      }
    } finally {
      setForgeBusy(false);
    }
  };

  const handleForgeCustomBlueprint = async () => {
    const prompt = forgePrompt.trim();
    if (!prompt || forgeBusy) return;
    setForgeBusy(true);
    try {
      const res = await apiFetch('/api/spatial/blueprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, autoStart: true, spawnDefaultAgents: true })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.blueprint) {
          applyCommandFnRef.current?.({
            seq: data.latestSeq || Date.now(),
            timestamp: new Date().toISOString(),
            sourceAgent: 'orchestrator-forge',
            type: 'LOAD_BLUEPRINT',
            payload: { blueprint: data.blueprint, autoStart: true }
          });
        }
        if (Array.isArray(data.participants)) {
          data.participants.forEach((ag: AgentParticipantState) => {
            applyCommandFnRef.current?.({
              seq: 0,
              timestamp: new Date().toISOString(),
              sourceAgent: ag.agentId,
              type: 'SPAWN_AGENT',
              payload: { agent: ag }
            });
          });
        }
        setForgePrompt('');
      } else {
        const localBp = synthesizeSpatialBlueprint(prompt);
        applyCommandFnRef.current?.({
          seq: Date.now(),
          timestamp: new Date().toISOString(),
          sourceAgent: 'local-forge',
          type: 'LOAD_BLUEPRINT',
          payload: { blueprint: localBp, autoStart: true }
        });
      }
    } finally {
      setForgeBusy(false);
    }
  };

  const handleAgentAct = async (payload: Record<string, any>) => {
    try {
      const res = await apiFetch('/api/spatial/agent-act', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.command) {
          applyCommandFnRef.current?.(data.command);
        }
      }
    } catch {}
  };

  const handleTriggerEvolution = useCallback(
    async (customIntent?: string, preferredSlot?: 0 | 1 | 2 | 3) => {
      const cur = mmorpgRef.current;
      const pipe = blueprintRef.current.renderPipeline || BIOME_PRESET_DEFAULTS.alpine_archipelago;
      try {
        const res = await apiFetch('/api/spatial/evolve-skill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profile: cur.evolutionProfile,
            playerClass: cur.playerClass,
            level: cur.level,
            biome: pipe.biome,
            weather: pipe.weather,
            existingHashes: cur.evolvedSkills.map((s) => s.dnaHash),
            preferredSlot,
            customIntent
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.evolvedSkill) {
            applyCommandFnRef.current?.({
              seq: Date.now(),
              timestamp: new Date().toISOString(),
              sourceAgent: 'evolution-nexus',
              type: 'EVOLVE_SKILL',
              payload: { evolvedSkill: data.evolvedSkill }
            });
            return;
          }
        }
      } catch {}

      const fallback = synthesizeUniqueEvolvedSkill({
        profile: cur.evolutionProfile,
        playerClass: cur.playerClass,
        level: cur.level,
        biome: pipe.biome,
        weather: pipe.weather,
        existingHashes: cur.evolvedSkills.map((s) => s.dnaHash),
        preferredSlot,
        customIntent
      });
      applyCommandFnRef.current?.({
        seq: Date.now(),
        timestamp: new Date().toISOString(),
        sourceAgent: 'local-evolution-nexus',
        type: 'EVOLVE_SKILL',
        payload: { evolvedSkill: fallback }
      });
    },
    []
  );

  useEffect(() => {
    triggerEvolutionFnRef.current = handleTriggerEvolution;
  }, [handleTriggerEvolution]);

  const handleEquipEvolvedSkill = (sk: EvolvedSkillSpec, slotIdx: 0 | 1 | 2 | 3) => {
    setMmorpgHud((prev) => {
      const nextSlots: [EvolvedSkillSpec | null, EvolvedSkillSpec | null, EvolvedSkillSpec | null, EvolvedSkillSpec | null] = [...prev.activeSlots] as [EvolvedSkillSpec | null, EvolvedSkillSpec | null, EvolvedSkillSpec | null, EvolvedSkillSpec | null];
      nextSlots[slotIdx] = sk;
      const next = { ...prev, activeSlots: nextSlots };
      mmorpgRef.current = next;
      return next;
    });
  };

  const handleSelectMmorpgClass = (cls: MmorpgClass) => {
    setMmorpgHud((prev) => {
      const next = { ...prev, playerClass: cls };
      mmorpgRef.current = next;
      return next;
    });
  };

  const handleTrainAllAgents = async () => {
    setForgeBusy(true);
    try {
      const res = await apiFetch('/api/spatial/train-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ launchMmorpg: true })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.activeBlueprint) {
          applyCommandFnRef.current?.({
            seq: Date.now(),
            timestamp: new Date().toISOString(),
            sourceAgent: 'mmorpg-academy',
            type: 'LOAD_BLUEPRINT',
            payload: { blueprint: data.activeBlueprint, autoStart: true }
          });
        }
        if (Array.isArray(data.participants)) {
          data.participants.forEach((ag: AgentParticipantState) => {
            applyCommandFnRef.current?.({
              seq: 0,
              timestamp: new Date().toISOString(),
              sourceAgent: ag.agentId,
              type: 'SPAWN_AGENT',
              payload: { agent: ag }
            });
          });
        }
        setTrainNotice(`Trained ${data.trainedAgentsCount || 11} agents on MMORPG & 1-of-1 Evolution`);
        setTimeout(() => setTrainNotice(null), 4000);
      }
    } finally {
      setForgeBusy(false);
    }
  };

  const handleSyncDetectedGameToFirestore = async (game: DetectedGameRecord) => {
    if (!userId) return;
    try {
      const safeId = game.gameId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64);
      await setDoc(doc(db, 'users', userId, 'detected_games', safeId), {
        userId,
        gameKey: game.gameKey.slice(0, 128),
        title: game.title.slice(0, 128),
        engine: game.engine,
        sourcePath: game.sourcePath.slice(0, 256),
        status: game.status,
        modCount: game.modCount,
        modStateJson: JSON.stringify({ ...game.modState, capabilities: game.capabilities }).slice(0, 48000),
        detectedAt: game.detectedAt || new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${userId}/detected_games`);
    }
  };

  const handleScanGames = async () => {
    setForgeBusy(true);
    try {
      const canvases = Array.from(document.querySelectorAll('canvas'));
      const runtimeGames = canvases.map((c, idx) => ({
        gameId: idx === 0 ? 'aegis-spatial-engine' : `canvas-runtime-${idx}`,
        title: idx === 0 ? activeBlueprint.title : `Embedded WebGL Canvas #${idx + 1}`,
        engine: idx === 0 ? 'threejs' : 'html5_canvas',
        sourcePath: `dom://canvas[${idx}] (${c.width}x${c.height})`
      }));

      const res = await apiFetch('/api/games/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runtimeGames })
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.games)) {
          setDetectedGames(data.games);
          if (userId) {
            data.games.slice(0, 5).forEach((g: DetectedGameRecord) => {
              handleSyncDetectedGameToFirestore(g);
            });
          }
        }
        if (Array.isArray(data.forgedTools)) {
          setForgedToolsList(data.forgedTools);
        }
      }
    } finally {
      setForgeBusy(false);
    }
  };

  const handleApplyMod = async (opts: {
    modPrompt?: string;
    godMode?: boolean;
    speedScale?: number;
    gravity?: number;
    timeScale?: number;
  }) => {
    setForgeBusy(true);
    try {
      const res = await apiFetch('/api/games/mod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: selectedGameId,
          ...opts
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.game) {
          setDetectedGames((prev) => {
            const exists = prev.some((g) => g.gameId === data.game.gameId);
            if (!exists) return [data.game, ...prev];
            return prev.map((g) => (g.gameId === data.game.gameId ? data.game : g));
          });
          if (userId) handleSyncDetectedGameToFirestore(data.game);
        }
        if (Array.isArray(data.commands)) {
          data.commands.forEach((c: SpatialCommandEvent) => applyCommandFnRef.current?.(c));
        }
        if (opts.modPrompt) setModPromptInput('');
      }
    } finally {
      setForgeBusy(false);
    }
  };

  const handleForgeEngineTool = async () => {
    if (!toolForgeName.trim() || forgeBusy) return;
    setForgeBusy(true);
    try {
      const pipe = activeBlueprint.renderPipeline || BIOME_PRESET_DEFAULTS.alpine_archipelago;
      const res = await apiFetch('/api/spatial/forge-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: toolForgeName.trim(),
          description: toolForgeDesc.trim(),
          structureKind: toolForgeStructure,
          structureCount: 3,
          biome: pipe.biome,
          weather: pipe.weather,
          waterEnabled: pipe.waterEnabled,
          bloomStrength: pipe.bloomStrength
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.tool) {
          applyCommandFnRef.current?.({
            seq: Date.now(),
            timestamp: new Date().toISOString(),
            sourceAgent: 'tool-forge-ui',
            type: 'FORGE_TOOL',
            payload: { tool: data.tool }
          });
        }
      }
    } finally {
      setForgeBusy(false);
    }
  };

  const handleMutatePipeline = (patch: Partial<RenderPipelineConfig>) => {
    applyPipelineFnRef.current?.(patch);
  };

  const handleSaveBlueprintToFirestore = async () => {
    if (!userId) return;
    try {
      const now = new Date().toISOString();
      await addDoc(collection(db, 'users', userId, 'spatial_blueprints'), {
        userId,
        title: activeBlueprint.title.slice(0, 128),
        engineKind: activeBlueprint.engineKind,
        createdByAgent: activeBlueprint.createdByAgent.slice(0, 128),
        blueprintJson: JSON.stringify(activeBlueprint).slice(0, 49000),
        createdAt: now,
        updatedAt: now
      });
      setBlueprintSavedNotice(true);
      setTimeout(() => setBlueprintSavedNotice(false), 2200);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${userId}/spatial_blueprints`);
    }
  };

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    spatialAudio.setMuted(next);
  };

  const handleExportPng = () => {
    const dataUrl = exportCanvasFnRef.current?.();
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `aegis-skylane-${Date.now()}.png`;
    a.click();
  };

  const handleSaveToVault = () => {
    if (!onSaveToVault) return;
    const dataUrl = exportCanvasFnRef.current?.() || aegisPosterImg;
    onSaveToVault(
      'spatial',
      `${activeBlueprint.title} · ${FINISH_PRESETS.find((f) => f.id === finishPreset)?.label || finishPreset}`,
      `3D Spatial Engine (${activeBlueprint.engineKind}) · ${participantsHud.length} AI agents · Score ${hudScore}`,
      'threejs-autonomous-engine',
      dataUrl,
      JSON.stringify({
        blueprint: activeBlueprint,
        finishPreset,
        lightingPreset,
        explodeFactor,
        score: hudScore,
        wave: hudWave,
        participants: participantsHud,
        inspectedPart
      })
    );
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2200);
  };

  const switchMode = (target: ArenaMode) => {
    setMode(target);
    if (target === 'studio') {
      if (phase === 'PLAYING') setPhase('PAUSED');
      applyCameraPresetFnRef.current?.(cameraPreset);
    } else {
      setExplodeFactor(0);
      setInspectedPart(null);
    }
  };

  return (
    <div className="relative w-full flex-1 min-h-[calc(100vh-56px)] overflow-hidden bg-zinc-950 select-none">
      {/* Dedicated WebGL Mount Container */}
      <div ref={mountRef} className="w-full h-full min-h-[calc(100vh-56px)]" />

      {/* Lightweight Projected AI Participant Callsign Tags */}
      {mode === 'game' && phase === 'PLAYING' && agentLabels.length > 0 && (
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
          {agentLabels.map((lbl) =>
            lbl.visible ? (
              <div
                key={lbl.agentId}
                className="absolute -translate-x-1/2 -translate-y-full px-2 py-0.5 rounded bg-zinc-950/90 border text-[10px] font-mono whitespace-nowrap shadow-md"
                style={{
                  left: `${lbl.leftPct}%`,
                  top: `${lbl.topPct}%`,
                  borderColor: lbl.colorHex,
                  color: lbl.colorHex
                }}
              >
                {lbl.name} · {lbl.score}
              </div>
            ) : null
          )}
        </div>
      )}

      {/* WebGL Recovery Overlay */}
      {(webglUnsupported || webglLost) && (
        <div className="absolute inset-0 z-30 bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
          <img
            src={aegisPosterImg}
            alt="Aegis Skylane Orbital Canyon Landing Pad"
            className="max-w-3xl w-full aspect-video object-cover rounded-2xl border border-zinc-800 shadow-2xl mb-5"
          />
          <h2 className="text-lg font-bold text-zinc-100">
            {webglLost ? 'WebGL Context Suspended — Restoring Pipeline' : '3D WebGL Renderer Unavailable'}
          </h2>
          <p className="text-xs text-zinc-400 max-w-md mt-1">
            Displaying verified Aegis Skylane orbital bay render while hardware context recovers.
          </p>
        </div>
      )}

      {/* Minimal Top HUD Overlay */}
      <div className="absolute top-3 left-3 right-3 z-20 pointer-events-none flex flex-wrap items-start justify-between gap-3">
        {/* Top-Left Telemetry Bar */}
        <div className="pointer-events-auto bg-zinc-950/95 border border-zinc-800 rounded-xl px-3.5 py-2.5 flex items-center gap-4 shadow-xl">
          <div className="flex items-center gap-2.5">
            <svg
              width="26"
              height="26"
              viewBox="0 0 28 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              className="shrink-0"
            >
              <path
                d="M14 2L25 22L14 17.5L3 22L14 2Z"
                stroke="#f59e0b"
                strokeWidth="2"
                fill="rgba(245, 158, 11, 0.16)"
              />
              <circle cx="14" cy="12" r="2.2" fill="#38bdf8" />
            </svg>
            <div>
              <div className="text-xs font-bold tracking-wide text-zinc-100 uppercase max-w-[190px] truncate">
                {activeBlueprint.title}
              </div>
              <div className="text-[10px] font-mono text-zinc-400">
                {mode === 'studio'
                  ? '3D Procedural PBR Studio'
                  : `${activeBlueprint.engineKind.replace('_', ' ')} · ${participantsHud.length} AI Agents`}
              </div>
            </div>
          </div>

          <div className="h-6 w-px bg-zinc-800" />

          {mode === 'game' ? (
            <div className="flex items-center gap-4 font-mono text-xs tabular-nums">
              <div>
                <span className="text-zinc-500 text-[10px] block">SCORE</span>
                <span className="font-bold text-amber-400">{hudScore.toLocaleString()}</span>
              </div>
              {activeBlueprint.engineKind !== 'aerial_combat' && (
                <div>
                  <span className="text-zinc-500 text-[10px] block uppercase">
                    {activeBlueprint.processConfig.metricLabel.slice(0, 12)}
                  </span>
                  <span className="font-bold text-emerald-400">
                    {hudProcessMetric} {activeBlueprint.processConfig.metricUnit}
                  </span>
                </div>
              )}
              <div>
                <span className="text-zinc-500 text-[10px] block">WAVE</span>
                <span className="font-bold text-zinc-100">
                  {hudWave}/{activeBlueprint.rules.waveCount || TOTAL_WAVES}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 text-[10px] block">NODES</span>
                <span className="font-bold text-cyan-400">{hudBeaconsRemaining} left</span>
              </div>
              <div>
                <span className="text-zinc-500 text-[10px] block">SHIELD</span>
                <div className="flex items-center gap-1 mt-0.5">
                  {[0, 1, 2].map((idx) => (
                    <span
                      key={idx}
                      className={`w-3.5 h-2 rounded-xs ${
                        idx < hudShields ? 'bg-emerald-400' : 'bg-zinc-800'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="hidden md:block">
                <span className="text-zinc-500 text-[10px] block">BOOST</span>
                <div className="w-16 h-2 bg-zinc-800 rounded-xs overflow-hidden mt-0.5">
                  <div className="h-full bg-sky-400" style={{ width: `${hudBoostEnergy}%` }} />
                </div>
              </div>
            </div>
          ) : (
            <div className="font-mono text-xs text-zinc-300 flex items-center gap-3">
              <span>Parts: 9 Composite Groups</span>
              <span className="text-zinc-600">·</span>
              <span className="text-amber-400">
                {inspectedPart ? inspectedPart.label : 'Click any airframe component'}
              </span>
            </div>
          )}
        </div>

        {/* Top-Right Compact Mode Switcher + AI Engine Forge Toggle */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-zinc-950/95 border border-zinc-800 rounded-xl p-1 shadow-xl text-xs font-mono">
          <button
            type="button"
            onClick={() => switchMode('game')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              mode === 'game'
                ? 'bg-amber-500 text-zinc-950 font-bold'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Sim Arena</span>
          </button>
          <button
            type="button"
            onClick={() => switchMode('studio')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              mode === 'studio'
                ? 'bg-sky-500 text-zinc-950 font-bold'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>Scene Studio</span>
          </button>
          <button
            type="button"
            onClick={() => setForgeOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              forgeOpen
                ? 'bg-emerald-500 text-zinc-950 font-bold'
                : 'bg-zinc-900 text-emerald-300 border border-emerald-500/30 hover:bg-zinc-800'
            }`}
            title="Open Autonomous Engine Forge & AI Agent Crew"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>AI Forge ({participantsHud.length})</span>
          </button>
          <button
            type="button"
            onClick={handleToggleMute}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 cursor-pointer"
            title={muted ? 'Unmute Procedural Audio' : 'Mute Procedural Audio'}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* MMORPG Raid Boss Health & Quest Banner */}
      {mode === 'game' && phase === 'PLAYING' && activeBlueprint.engineKind === 'mmorpg_world' && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none w-[min(460px,92vw)]">
          <div className="bg-zinc-950/95 border border-rose-500/40 rounded-xl px-3.5 py-2 shadow-xl">
            <div className="flex items-center justify-between text-[11px] font-mono mb-1">
              <span className="font-bold text-rose-300 flex items-center gap-1.5 truncate">
                <Swords className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                {mmorpgHud.bossName}
              </span>
              <span className="text-zinc-200 tabular-nums shrink-0">
                {mmorpgHud.bossHp.toLocaleString()} / {mmorpgHud.bossMaxHp.toLocaleString()} HP
              </span>
            </div>
            <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
              <div
                className="h-full bg-gradient-to-r from-rose-600 via-amber-500 to-rose-400 transition-all duration-150"
                style={{ width: `${Math.max(0, Math.min(100, (mmorpgHud.bossHp / Math.max(1, mmorpgHud.bossMaxHp)) * 100))}%` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-zinc-400">
              <span className="truncate">Quest: {mmorpgHud.questTitle}</span>
              <span className="text-amber-300 shrink-0 ml-2">
                Tier {mmorpgHud.realmTier} · {mmorpgHud.gold.toLocaleString()} Gold
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 1-of-1 Evolved Skill Genesis Toast Banner */}
      {evolutionBanner && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-[min(430px,92vw)] bg-zinc-950/95 border border-fuchsia-500/60 rounded-2xl p-3.5 shadow-2xl">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[10px] font-mono font-bold text-fuchsia-300 flex items-center gap-1.5">
                <Dna className="w-3.5 h-3.5" />
                <span>UNIQUE SKILL AWAKENED · {evolutionBanner.editionTag}</span>
              </div>
              <div className="text-sm font-bold text-zinc-100 mt-0.5">{evolutionBanner.name}</div>
              <div className="text-[11px] text-emerald-300 font-mono mt-0.5">{evolutionBanner.passiveBonus}</div>
              <div className="text-[10px] text-zinc-400 mt-1">{evolutionBanner.lineageNote}</div>
            </div>
            <button
              type="button"
              onClick={() => setEvolutionBanner(null)}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* MMORPG Hero Bar + 4-Slot Skill Hotbar + 1-of-1 Evolution DNA Meter */}
      {mode === 'game' && phase === 'PLAYING' && activeBlueprint.engineKind === 'mmorpg_world' && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-20 transition-all duration-200"
          style={{
            bottom: dockCollapsed ? '52px' : '96px',
            width: 'min(760px, 94vw)'
          }}
        >
          <div className="bg-zinc-950/95 border border-zinc-800 rounded-2xl px-3.5 py-2.5 shadow-2xl space-y-2">
            {/* Hyperdimensional Metaphysics Telemetry */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[9px] font-mono text-cyan-300 bg-zinc-900/80 px-2 py-1 rounded-lg border border-cyan-500/30">
              <span>Aether Pressure: {hyperPhysics.aetherPressureBar.toFixed(3)} Bar</span>
              <span>Chrono Dilation: {hyperPhysics.chronoDilationFactor.toFixed(3)}x</span>
              <span>Quantum Entanglement: {(hyperPhysics.quantumEntanglementCohesion * 100).toFixed(2)}%</span>
              <span>Multiversal Steps: {hyperPhysics.multiversalSimStepCount.toLocaleString()}</span>
            </div>

            {/* Unreal Engine 6.0 Beta Nanite & Lumen Telemetry */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[9px] font-mono text-purple-300 bg-zinc-900/80 px-2 py-1 rounded-lg border border-purple-500/30">
              <span>UE6 Beta · Nanite: {(unrealState.nanitePolygonsActive / 1e9).toFixed(2)}B Triangles</span>
              <span>Lumen GI Rays: {unrealState.lumenGlobalIlluminationRays.toLocaleString()}</span>
              <span>Chaos Rigid Bodies: {unrealState.chaosPhysicsRigidBodies.toLocaleString()}</span>
              <span>TSR & Ray Tracing: ACTIVE</span>
            </div>

            {/* Hero Vitals & Evolution Progress */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                  Lv.{mmorpgHud.level} {mmorpgHud.playerClass}
                </span>
                <span className="px-2 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 font-bold hidden md:inline">
                  Hyperion Reality Engine (1M @ 120 FPS)
                </span>
                <span className="text-emerald-300">
                  HP {mmorpgHud.hp}/{mmorpgHud.maxHp}
                </span>
                <span className="text-sky-300">
                  MP {Math.round(mmorpgHud.mana)}/{mmorpgHud.maxMana}
                </span>
                <span className="text-zinc-400 hidden sm:inline">
                  XP {mmorpgHud.xp}/{mmorpgHud.xpToNext}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Dna className="w-3 h-3 text-fuchsia-400" />
                  <span className="text-fuchsia-300">Evolution DNA {mmorpgHud.evolutionProgress}%</span>
                  <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-fuchsia-400"
                      style={{ width: `${mmorpgHud.evolutionProgress}%` }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleTriggerEvolution()}
                  className="px-2 py-0.5 rounded bg-fuchsia-500/20 hover:bg-fuchsia-500/35 text-fuchsia-200 border border-fuchsia-500/40 font-bold cursor-pointer"
                  title="Synthesize unique 1-of-1 evolved skill from your live combat DNA"
                >
                  Awaken 1-of-1
                </button>
              </div>
            </div>

            {/* 4-Slot Interactive Skill Hotbar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[0, 1, 2, 3].map((slotIdx) => {
                const evolved = mmorpgHud.activeSlots[slotIdx];
                const base = (BASE_CLASS_SKILLS[mmorpgHud.playerClass] || BASE_CLASS_SKILLS['Vanguard Paladin'])[slotIdx];
                const cd = mmorpgHud.skillCooldowns[slotIdx];
                const manaCost = evolved ? evolved.manaCost : base.mana;
                const title = evolved ? evolved.name : base.name;
                const borderHex = evolved ? evolved.fxColorHex : base.color;
                return (
                  <button
                    key={slotIdx}
                    type="button"
                    onClick={() => castSkillFnRef.current?.(slotIdx)}
                    disabled={cd > 0.05 || (mmorpgHud.mana < manaCost && !activeBlueprint.physics.godMode)}
                    className="relative px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-55 border text-left transition-colors cursor-pointer overflow-hidden"
                    style={{ borderColor: evolved ? borderHex : '#27272a' }}
                    title={evolved ? `${evolved.editionTag} · ${evolved.passiveBonus}` : base.desc}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="font-bold text-zinc-200">[{slotIdx + 1}]</span>
                      {evolved ? (
                        <span className="text-[9px] font-bold px-1 rounded bg-fuchsia-500/25 text-fuchsia-300">
                          1-OF-1
                        </span>
                      ) : (
                        <span className="text-sky-400">{manaCost} MP</span>
                      )}
                    </div>
                    <div className="text-[11px] font-bold text-zinc-100 truncate mt-0.5">{title}</div>
                    {cd > 0.05 && (
                      <div className="text-[10px] font-mono text-amber-300">{cd.toFixed(1)}s</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Collapsible On-Demand AI Engine Forge, MMORPG Academy & Auto-Modder Drawer */}
      {forgeOpen && (
        <div className="absolute top-18 right-3 bottom-24 w-[min(410px,93vw)] z-30 bg-zinc-950/95 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-zinc-100 tracking-wide uppercase">
                Hyperion Engine, MMORPG & Modder
              </span>
            </div>
            <button
              type="button"
              onClick={() => setForgeOpen(false)}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 3-Tab Switcher */}
          <div className="px-3 pt-2.5 pb-2 border-b border-zinc-800 grid grid-cols-3 gap-1.5 font-mono text-[10px]">
            <button
              type="button"
              onClick={() => setForgeTab('mmorpg')}
              className={`py-1.5 px-2 rounded-lg border flex items-center justify-center gap-1 cursor-pointer ${
                forgeTab === 'mmorpg'
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-200 font-bold'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Swords className="w-3 h-3" />
              <span>MMO & Skills</span>
            </button>
            <button
              type="button"
              onClick={() => setForgeTab('realism')}
              className={`py-1.5 px-2 rounded-lg border flex items-center justify-center gap-1 cursor-pointer ${
                forgeTab === 'realism'
                  ? 'bg-sky-500/20 border-sky-500/50 text-sky-200 font-bold'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>World & Tools</span>
            </button>
            <button
              type="button"
              onClick={() => setForgeTab('scanner')}
              className={`py-1.5 px-2 rounded-lg border flex items-center justify-center gap-1 cursor-pointer ${
                forgeTab === 'scanner'
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200 font-bold'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Radar className="w-3 h-3" />
              <span>Mod Scanner</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
            {forgeTab === 'mmorpg' && (
              <>
                {/* Teach All Orchestrator Agents Button */}
                <div className="bg-zinc-900/90 border border-amber-500/35 rounded-xl p-2.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-amber-300 font-bold">
                    <span className="flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5" />
                      Orchestrator Engine Mastery
                    </span>
                    <span className="text-[10px] text-zinc-400">Skill #25</span>
                  </div>
                  <button
                    type="button"
                    disabled={forgeBusy}
                    onClick={handleTrainAllAgents}
                    className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Train All Agents & Launch MMORPG Raid</span>
                  </button>
                  {trainNotice && (
                    <div className="text-[10px] font-mono text-emerald-300">{trainNotice}</div>
                  )}
                </div>

                {/* 1. Simulation & MMORPG Presets */}
                <div className="space-y-2">
                  <div className="text-[11px] font-mono text-zinc-400 uppercase flex items-center justify-between">
                    <span>Engine Architectures</span>
                    <span className="text-emerald-400">{activeBlueprint.engineKind}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        { id: 'mmorpg_world', label: 'Aetherion MMORPG', sub: `Mythic+ Tier ${mmorpgHud.realmTier}` },
                        { id: 'photoreal_sandbox', label: 'Hyperion Realism', sub: 'Sky + Ocean + HDR' },
                        { id: 'aerial_combat', label: 'Aerial Combat', sub: '3-Wave Skylane' },
                        { id: 'swarm_logistics', label: 'Swarm Logistics', sub: `${hudThroughput} pkt/min` },
                        { id: 'byzantine_mesh', label: 'Byzantine Quorum', sub: `${hudQuorumPct}% BFT` },
                        { id: 'orbital_physics', label: 'Orbital Gravity', sub: 'N-Body Slingshot' }
                      ] as const
                    ).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        disabled={forgeBusy}
                        onClick={() => handleSelectEnginePreset(item.id)}
                        className={`p-2 rounded-xl border text-left transition-colors cursor-pointer ${
                          activeBlueprint.engineKind === item.id
                            ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        <div className="font-bold text-[11px]">{item.label}</div>
                        <div className="text-[10px] font-mono text-zinc-400">{item.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. MMORPG Class + 1-of-1 Behavioral Skill Evolution Codex */}
                <div className="space-y-2.5 bg-zinc-900/90 border border-fuchsia-500/35 rounded-xl p-3">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-fuchsia-300 font-bold flex items-center gap-1.5">
                      <Dna className="w-3.5 h-3.5" />
                      1-OF-1 EVOLVING SKILL SYSTEM
                    </span>
                    <span className="text-zinc-400">{mmorpgHud.evolvedSkills.length} Unique</span>
                  </div>

                  <select
                    value={mmorpgHud.playerClass}
                    onChange={(e) => handleSelectMmorpgClass(e.target.value as MmorpgClass)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-100"
                  >
                    <option value="Vanguard Paladin">Vanguard Paladin</option>
                    <option value="Chronomancer Mage">Chronomancer Mage</option>
                    <option value="Shadow Assassin">Shadow Assassin</option>
                    <option value="Sylvana Cleric">Sylvana Cleric</option>
                    <option value="Archon Summoner">Archon Summoner</option>
                  </select>

                  {/* 6-Axis DNA Telemetry Bars */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[10px]">
                    {(Object.keys(mmorpgHud?.evolutionProfile || {}) as EvolutionAxis[]).map((axis) => {
                      const val = mmorpgHud?.evolutionProfile?.[axis] || 0;
                      const allVals = mmorpgHud?.evolutionProfile ? Object.values(mmorpgHud.evolutionProfile) : [25];
                      const pct = Math.min(100, Math.round((val / Math.max(25, ...allVals)) * 100));
                      return (
                        <div key={axis} className="space-y-0.5">
                          <div className="flex justify-between text-zinc-300 uppercase">
                            <span>{axis}</span>
                            <span className="text-fuchsia-300">{val.toFixed(0)}</span>
                          </div>
                          <div className="h-1 bg-zinc-950 rounded-full overflow-hidden">
                            <div className="h-full bg-fuchsia-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={customEvoIntent}
                      onChange={(e) => setCustomEvoIntent(e.target.value)}
                      placeholder="Optional evolution intent (e.g. Eclipse)"
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-[11px] text-zinc-100"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        handleTriggerEvolution(customEvoIntent.trim() || undefined);
                        setCustomEvoIntent('');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-fuchsia-500 hover:bg-fuchsia-400 text-zinc-950 font-bold text-[11px] cursor-pointer shrink-0"
                    >
                      Synthesize 1-of-1
                    </button>
                  </div>

                  {mmorpgHud.evolvedSkills.length > 0 && (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1">
                      {mmorpgHud.evolvedSkills.slice(0, 6).map((sk) => (
                        <div
                          key={sk.skillId}
                          className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 space-y-1"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-zinc-100 truncate" style={{ color: sk.fxColorHex }}>
                              {sk.name}
                            </span>
                            <span className="text-[9px] font-mono text-fuchsia-300 shrink-0">{sk.editionTag}</span>
                          </div>
                          <div className="text-[10px] font-mono text-emerald-300">{sk.passiveBonus}</div>
                          <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400">
                            <span>{sk.effectType} · {sk.powerMultiplier}x</span>
                            <div className="flex gap-1">
                              {([0, 1, 2, 3] as const).map((slot) => (
                                <button
                                  key={slot}
                                  type="button"
                                  onClick={() => handleEquipEvolvedSkill(sk, slot)}
                                  className={`px-1.5 py-0.5 rounded border cursor-pointer ${
                                    mmorpgHud.activeSlots[slot]?.skillId === sk.skillId
                                      ? 'bg-fuchsia-500 text-zinc-950 border-fuchsia-400 font-bold'
                                      : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-zinc-500'
                                  }`}
                                >
                                  S{slot + 1}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Autonomous Prompt Blueprint Synthesizer */}
                <div className="space-y-2 bg-zinc-900/90 border border-zinc-800 rounded-xl p-3">
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-300">
                    <span>Synthesize Custom Game / Process</span>
                    {userId && (
                      <button
                        type="button"
                        onClick={handleSaveBlueprintToFirestore}
                        className="text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                      >
                        {blueprintSavedNotice ? <Check className="w-3 h-3" /> : <BookmarkPlus className="w-3 h-3" />}
                        <span>{blueprintSavedNotice ? 'Saved' : 'Save BP'}</span>
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={2}
                    value={forgePrompt}
                    onChange={(e) => setForgePrompt(e.target.value)}
                    placeholder="e.g. Create an abyssal dungeon raid MMORPG with rain and bioluminescent spires..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-2 text-[11px] text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 resize-none"
                  />
                  <button
                    type="button"
                    disabled={forgeBusy || !forgePrompt.trim()}
                    onClick={handleForgeCustomBlueprint}
                    className="w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-45 text-zinc-950 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{forgeBusy ? 'Synthesizing World...' : 'Forge & Launch 3D World'}</span>
                  </button>
                </div>

                {/* 4. Live Multi-Agent Participation Roster */}
                <div className="space-y-2">
                  <div className="text-[11px] font-mono text-zinc-400 uppercase flex items-center justify-between">
                    <span>AI Raid Party & Agents ({participantsHud.length})</span>
                    <span className="text-amber-400">Live Autonomous</span>
                  </div>

                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={spawnAgentName}
                      onChange={(e) => setSpawnAgentName(e.target.value)}
                      placeholder="Agent callsign..."
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-100"
                    />
                    <select
                      value={spawnAgentRole}
                      onChange={(e) => setSpawnAgentRole(e.target.value as AgentParticipantRole)}
                      className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-[11px] text-zinc-200"
                    >
                      <option value="ally">Ally</option>
                      <option value="rival">Rival</option>
                      <option value="guardian">Guardian</option>
                      <option value="process_worker">Worker</option>
                      <option value="architect">Architect</option>
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        handleAgentAct({
                          action: 'join',
                          agentId: `${spawnAgentName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString(36).slice(-3)}`,
                          name: spawnAgentName.trim() || 'Agent-Unit',
                          role: spawnAgentRole
                        })
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Join</span>
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {participantsHud.map((ag) => (
                      <div
                        key={ag.agentId}
                        className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: ag.colorHex }}
                            />
                            <span className="font-bold text-zinc-100 truncate">{ag.name}</span>
                            <span className="text-[10px] font-mono text-amber-300 truncate">
                              {ag.rpgClass || ag.role}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-zinc-400 truncate mt-0.5">
                            {ag.policy} · {ag.score} pts · {ag.lastAction}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <select
                            value={ag.policy}
                            onChange={(e) =>
                              handleAgentAct({
                                action: 'set_policy',
                                agentId: ag.agentId,
                                policy: e.target.value as AgentTacticalPolicy
                              })
                            }
                            className="bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1 text-[10px] text-zinc-200"
                          >
                            <option value="harvest">Harvest</option>
                            <option value="escort">Escort</option>
                            <option value="intercept">Intercept</option>
                            <option value="route_packets">Route Pkts</option>
                            <option value="consensus_sync">Heal BFT</option>
                            <option value="orbit_hold">Orbit</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleAgentAct({ action: 'leave', agentId: ag.agentId })}
                            className="px-1.5 py-1 rounded bg-zinc-950 text-zinc-400 hover:text-rose-400 border border-zinc-800 text-[10px] cursor-pointer"
                            title="Remove Agent"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {forgeTab === 'realism' && (
              <>
                {/* Biome & Photorealistic Atmosphere Controls */}
                <div className="space-y-2.5 bg-zinc-900/90 border border-zinc-800 rounded-xl p-3">
                  <div className="text-[11px] font-mono text-sky-300 font-bold uppercase">
                    Photorealistic World Pipeline
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
                    {(
                      [
                        { id: 'alpine_archipelago', label: 'Alpine Archipelago' },
                        { id: 'canyon_basin', label: 'Canyon Basin' },
                        { id: 'cyber_metropolis', label: 'Cyber Metropolis' },
                        { id: 'bioluminescent_abyss', label: 'Bioluminescent Abyss' },
                        { id: 'orbital_ringworld', label: 'Orbital Ringworld' },
                        { id: 'desert_monolith', label: 'Desert Monolith' }
                      ] as const
                    ).map((bm) => (
                      <button
                        key={bm.id}
                        type="button"
                        onClick={() => handleMutatePipeline({ ...BIOME_PRESET_DEFAULTS[bm.id] })}
                        className={`px-2 py-1.5 rounded-lg border text-left cursor-pointer ${
                          (activeBlueprint.renderPipeline?.biome || 'canyon_basin') === bm.id
                            ? 'bg-sky-500/20 border-sky-500/50 text-sky-200 font-bold'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        {bm.label}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] font-mono text-zinc-400 uppercase">Atmospheric Weather</div>
                    <div className="grid grid-cols-5 gap-1 font-mono text-[10px]">
                      {(['clear', 'rain', 'snow', 'ash', 'spores'] as WeatherMode[]).map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => handleMutatePipeline({ weather: w })}
                          className={`py-1 rounded border capitalize cursor-pointer ${
                            (activeBlueprint.renderPipeline?.weather || 'clear') === w
                              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200 font-bold'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                          }`}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-1 font-mono text-[10px]">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-300">Gerstner Ocean Water</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleMutatePipeline({
                            waterEnabled: !(activeBlueprint.renderPipeline?.waterEnabled ?? false)
                          })
                        }
                        className={`px-2.5 py-1 rounded border font-bold cursor-pointer ${
                          activeBlueprint.renderPipeline?.waterEnabled
                            ? 'bg-sky-500 text-zinc-950 border-sky-400'
                            : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                        }`}
                      >
                        {activeBlueprint.renderPipeline?.waterEnabled ? 'ENABLED' : 'DISABLED'}
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-400">Sun Angle</span>
                      <input
                        type="range"
                        min={2}
                        max={75}
                        value={activeBlueprint.renderPipeline?.sunElevationDeg ?? 24}
                        onChange={(e) => handleMutatePipeline({ sunElevationDeg: Number(e.target.value) })}
                        className="flex-1 accent-amber-400"
                      />
                      <span className="text-amber-300 w-8 text-right">
                        {Math.round(activeBlueprint.renderPipeline?.sunElevationDeg ?? 24)}°
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-400">HDR Bloom</span>
                      <input
                        type="range"
                        min={0}
                        max={1.6}
                        step={0.05}
                        value={activeBlueprint.renderPipeline?.bloomStrength ?? 0.48}
                        onChange={(e) => handleMutatePipeline({ bloomStrength: Number(e.target.value), bloomEnabled: true })}
                        className="flex-1 accent-sky-400"
                      />
                      <span className="text-sky-300 w-8 text-right">
                        {(activeBlueprint.renderPipeline?.bloomStrength ?? 0.48).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* AAA Procedural Engine Tool Forge */}
                <div className="space-y-2 bg-zinc-900/90 border border-zinc-800 rounded-xl p-3">
                  <div className="text-[11px] font-mono text-emerald-300 font-bold uppercase">
                    Forge Custom 3D Engine Tool
                  </div>
                  <input
                    type="text"
                    value={toolForgeName}
                    onChange={(e) => setToolForgeName(e.target.value)}
                    placeholder="Tool Name..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-100"
                  />
                  <select
                    value={toolForgeStructure}
                    onChange={(e) => setToolForgeStructure(e.target.value as ConceptStructureKind)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-200"
                  >
                    <option value="crystal_cluster">Bioluminescent Crystal Spires</option>
                    <option value="skyscraper">Metropolis Skyscrapers</option>
                    <option value="habitat_dome">Glass Habitat Domes</option>
                    <option value="reactor_spire">Fusion Reactor Spires</option>
                    <option value="sandstone_arch">Monolith Sandstone Arches</option>
                    <option value="orbital_pylon">Orbital Telemetry Pylons</option>
                  </select>
                  <textarea
                    rows={2}
                    value={toolForgeDesc}
                    onChange={(e) => setToolForgeDesc(e.target.value)}
                    placeholder="Describe 3D world generator tool..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-100 resize-none"
                  />
                  <button
                    type="button"
                    disabled={forgeBusy}
                    onClick={handleForgeEngineTool}
                    className="w-full py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-[11px] cursor-pointer"
                  >
                    Synthesize & Execute 3D Tool
                  </button>

                  {forgedToolsList.length > 0 && (
                    <div className="space-y-1 max-h-28 overflow-y-auto pt-1 font-mono text-[10px]">
                      {forgedToolsList.slice(0, 5).map((t) => (
                        <div key={t.toolId} className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-300 truncate">
                          <span className="text-sky-400">[{t.category}]</span> {t.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Process & Physics Mutations */}
                <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
                  <button
                    type="button"
                    onClick={() => handleAgentAct({ action: 'inject_fault' })}
                    className="py-1.5 px-2 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-200 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span>Inject Fault</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAgentAct({ action: 'heal_quorum', agentId: 'lyrailius-healer' })}
                    className="py-1.5 px-2 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Wrench className="w-3 h-3" />
                    <span>Heal Quorum</span>
                  </button>
                </div>
              </>
            )}

            {forgeTab === 'scanner' && (
              <>
                <div className="space-y-2 bg-zinc-900/90 border border-emerald-500/35 rounded-xl p-3">
                  <div className="flex items-center justify-between text-[11px] font-mono text-emerald-300 font-bold">
                    <span>AUTO GAME DETECTION & MODDING</span>
                    <span>{detectedGames.length} Found</span>
                  </div>
                  <button
                    type="button"
                    disabled={forgeBusy}
                    onClick={handleScanGames}
                    className="w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Radar className="w-3.5 h-3.5" />
                    <span>Scan Disk & WebGL Runtimes</span>
                  </button>
                </div>

                {detectedGames.length > 0 && (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {detectedGames.map((g) => (
                      <button
                        key={g.gameId}
                        type="button"
                        onClick={() => setSelectedGameId(g.gameId)}
                        className={`w-full text-left p-2 rounded-xl border transition-colors cursor-pointer ${
                          selectedGameId === g.gameId
                            ? 'bg-emerald-500/15 border-emerald-500/50'
                            : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-zinc-100 truncate">{g.title}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-950 text-sky-300 border border-zinc-800 uppercase">
                            {g.engine}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-zinc-400 truncate mt-0.5">
                          {g.status} · {g.modCount} mods · {g.sourcePath}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="space-y-2.5 bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 font-mono text-[10px]">
                  <div className="text-[11px] text-amber-300 font-bold uppercase">
                    Autonomous Runtime Mod Controls
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300">God Mode (Invulnerability)</span>
                    <button
                      type="button"
                      onClick={() => handleApplyMod({ godMode: !Boolean(activeBlueprint.physics.godMode) })}
                      className={`px-2.5 py-1 rounded border font-bold cursor-pointer ${
                        activeBlueprint.physics.godMode
                          ? 'bg-amber-500 text-zinc-950 border-amber-400'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      {activeBlueprint.physics.godMode ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleApplyMod({ speedScale: 1.65, timeScale: 1.4 })}
                      className="py-1.5 rounded bg-zinc-950 border border-zinc-800 text-sky-300 hover:border-sky-500/50 cursor-pointer"
                    >
                      Hyper-Speed 1.65x
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyMod({ gravity: 2.5 })}
                      className="py-1.5 rounded bg-zinc-950 border border-zinc-800 text-fuchsia-300 hover:border-fuchsia-500/50 cursor-pointer"
                    >
                      Zero-G Physics
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={modPromptInput}
                    onChange={(e) => setModPromptInput(e.target.value)}
                    placeholder="Natural language mod: e.g. Enable god mode, low gravity, snow storm & cyberpunk skyline..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-[11px] text-zinc-100 resize-none font-sans"
                  />
                  <button
                    type="button"
                    disabled={forgeBusy || !modPromptInput.trim()}
                    onClick={() => handleApplyMod({ modPrompt: modPromptInput.trim() })}
                    className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-45 text-zinc-950 font-bold text-[11px] cursor-pointer"
                  >
                    Inject Autonomous Mod
                  </button>
                </div>
              </>
            )}

            {/* Saved Cloud Blueprints */}
            {savedBlueprints.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-mono text-zinc-400 uppercase">Saved Cloud Blueprints</div>
                <div className="space-y-1">
                  {savedBlueprints.slice(0, 3).map((bp) => (
                    <button
                      key={bp.id}
                      type="button"
                      onClick={() =>
                        applyCommandFnRef.current?.({
                          seq: Date.now(),
                          timestamp: new Date().toISOString(),
                          sourceAgent: 'cloud-blueprint',
                          type: 'LOAD_BLUEPRINT',
                          payload: { blueprint: bp, autoStart: true }
                        })
                      }
                      className="w-full text-left px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-between text-[11px] cursor-pointer"
                    >
                      <span className="text-zinc-200 truncate">{bp.title}</span>
                      <span className="text-[10px] font-mono text-sky-400 shrink-0">{bp.engineKind}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Autonomous Event Stream */}
            {processEvents.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-mono text-zinc-400 uppercase flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-emerald-400" />
                  <span>Autonomous Sim Event Stream</span>
                </div>
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-2 space-y-1 max-h-24 overflow-y-auto font-mono text-[10px] text-zinc-300">
                  {processEvents.slice(0, 6).map((evt, idx) => (
                    <div key={`${evt.timestamp}-${idx}`} className="truncate">
                      <span className="text-emerald-400">[{evt.source}]</span> {evt.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Part Detail Strip in Studio Mode */}
      {mode === 'studio' && inspectedPart && (
        <div className="absolute top-20 left-3 z-20 max-w-sm bg-zinc-950/95 border border-sky-500/40 rounded-xl px-3.5 py-2.5 text-xs shadow-xl">
          <div className="flex items-center gap-2 font-bold text-sky-300">
            <Crosshair className="w-3.5 h-3.5" />
            <span>{inspectedPart.label}</span>
          </div>
          <p className="text-[11px] text-zinc-300 mt-1 leading-relaxed">{inspectedPart.role}</p>
        </div>
      )}

      {/* Touch Flight Controls */}
      {mode === 'game' && phase === 'PLAYING' && (
        <div className="sm:hidden fixed bottom-24 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
          <div className="pointer-events-auto grid grid-cols-3 gap-1 w-32 bg-zinc-950/90 border border-zinc-800 p-1.5 rounded-xl">
            <div />
            <button
              type="button"
              onPointerDown={() => { touchSteerRef.current.z = -1; }}
              onPointerUp={() => { touchSteerRef.current.z = 0; }}
              onPointerLeave={() => { touchSteerRef.current.z = 0; }}
              className="h-9 rounded-lg bg-zinc-800 text-zinc-100 font-bold text-xs"
            >
              ↑
            </button>
            <div />
            <button
              type="button"
              onPointerDown={() => { touchSteerRef.current.x = -1; }}
              onPointerUp={() => { touchSteerRef.current.x = 0; }}
              onPointerLeave={() => { touchSteerRef.current.x = 0; }}
              className="h-9 rounded-lg bg-zinc-800 text-zinc-100 font-bold text-xs"
            >
              ←
            </button>
            <button
              type="button"
              onPointerDown={() => { touchSteerRef.current.z = 1; }}
              onPointerUp={() => { touchSteerRef.current.z = 0; }}
              onPointerLeave={() => { touchSteerRef.current.z = 0; }}
              className="h-9 rounded-lg bg-zinc-800 text-zinc-100 font-bold text-xs"
            >
              ↓
            </button>
            <button
              type="button"
              onPointerDown={() => { touchSteerRef.current.x = 1; }}
              onPointerUp={() => { touchSteerRef.current.x = 0; }}
              onPointerLeave={() => { touchSteerRef.current.x = 0; }}
              className="h-9 rounded-lg bg-zinc-800 text-zinc-100 font-bold text-xs"
            >
              →
            </button>
          </div>
          <button
            type="button"
            onPointerDown={() => { touchSteerRef.current.boost = true; }}
            onPointerUp={() => { touchSteerRef.current.boost = false; }}
            onPointerLeave={() => { touchSteerRef.current.boost = false; }}
            className="pointer-events-auto px-4 py-3 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs shadow-lg"
          >
            BOOST
          </button>
        </div>
      )}

      {/* Game Phase Modal Shell */}
      {mode === 'game' && phase !== 'PLAYING' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-4 pointer-events-none">
          <div className="pointer-events-auto max-w-lg w-full bg-zinc-950/95 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
            {phase === 'TITLE_MENU' && (
              <div className="relative h-40 overflow-hidden border-b border-zinc-800">
                <img
                  src={aegisPosterImg}
                  alt="Aegis Skylane Interceptor Canyon"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />
                <div className="absolute bottom-3 left-5 right-5 flex items-end justify-between">
                  <div>
                    <div className="text-[11px] font-mono text-amber-400 uppercase tracking-wider font-semibold">
                      {activeBlueprint.engineKind.replace('_', ' ')} Engine
                    </div>
                    <h1 className="text-xl font-bold text-zinc-100">{activeBlueprint.title}</h1>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-300">
                    {participantsHud.length} AI Agents Ready
                  </span>
                </div>
              </div>
            )}

            <div className="p-5 space-y-4">
              {phase === 'TITLE_MENU' && (
                <>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {activeBlueprint.description}
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-[11px] font-mono bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                    <div>
                      <span className="text-zinc-500 block">STEER</span>
                      <span className="text-zinc-100 font-semibold">WASD / Arrows</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">AFTERBURN</span>
                      <span className="text-sky-400 font-semibold">Spacebar</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">AI FORGE / HUD</span>
                      <span className="text-amber-400 font-semibold">Top Bar / H</span>
                    </div>
                  </div>
                </>
              )}

              {phase === 'PAUSED' && (
                <div className="text-center space-y-2 py-2">
                  <h2 className="text-lg font-bold text-zinc-100">Simulation Suspended</h2>
                  <p className="text-xs text-zinc-400">
                    Score {hudScore.toLocaleString()} · Wave {hudWave} · {participantsHud.length} AI Agents · {hudElapsedSec}s
                  </p>
                </div>
              )}

              {(phase === 'VICTORY' || phase === 'GAME_OVER') && (
                <div className="space-y-3 text-center">
                  <div
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-mono font-bold ${
                      phase === 'VICTORY'
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {phase === 'VICTORY' ? <Trophy className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                    <span>{phase === 'VICTORY' ? 'SIMULATION OBJECTIVE CLEARED' : 'SHIELD INTEGRITY DEPLETED'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 bg-zinc-900 border border-zinc-800 rounded-xl p-3 font-mono text-xs tabular-nums">
                    <div>
                      <span className="text-zinc-500 text-[10px] block">FINAL SCORE</span>
                      <span className="text-amber-400 font-bold text-base">{hudScore.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-[10px] block">WAVE</span>
                      <span className="text-zinc-100 font-bold text-base">
                        {hudWave}/{activeBlueprint.rules.waveCount || TOTAL_WAVES}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-[10px] block">TIME</span>
                      <span className="text-cyan-400 font-bold text-base">{hudElapsedSec}s</span>
                    </div>
                  </div>
                </div>
              )}

              {leaderboard.length > 0 && (
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                    <span className="flex items-center gap-1.5 font-semibold text-zinc-200">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      Top Recorded Runs
                    </span>
                    <span>{userId ? 'Cloud Firestore Synced' : 'Local Session'}</span>
                  </div>
                  <div className="space-y-1 max-h-28 overflow-y-auto text-[11px] font-mono tabular-nums">
                    {leaderboard.slice(0, 4).map((run, idx) => (
                      <div
                        key={run.id}
                        className="flex items-center justify-between px-2 py-1 rounded bg-zinc-950 border border-zinc-800/80"
                      >
                        <span className="text-zinc-400 truncate max-w-[170px]">
                          #{idx + 1}{' '}
                          <span className={run.status === 'VICTORY' ? 'text-emerald-400' : 'text-zinc-200'}>
                            {run.status}
                          </span>
                          {' · '}
                          <span className="text-zinc-500">{run.mode}</span>
                        </span>
                        <span className="text-amber-300 font-bold">{run.score.toLocaleString()} pts</span>
                        <span className="text-zinc-500">{run.durationSec}s</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                {phase === 'PAUSED' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setPhase('PLAYING')}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Resume Simulation</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => restartGameFnRef.current?.()}
                      className="py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restart</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => restartGameFnRef.current?.()}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Zap className="w-4 h-4" />
                    <span>{phase === 'TITLE_MENU' ? 'Launch Simulation' : 'Run Again'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setForgeOpen(true)}
                  className="py-2.5 px-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-emerald-500/40 text-emerald-300 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>AI Forge</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unified Collapsible Bottom Control Dock */}
      <div
        className="fixed left-1/2 -translate-x-1/2 z-20 transition-transform duration-200"
        style={{
          bottom: '16px',
          width: 'min(940px, 94vw)',
          transform: dockCollapsed ? 'translate(-50%, calc(100% + 22px))' : 'translate(-50%, 0)'
        }}
      >
        <div className="flex justify-center mb-1.5">
          <button
            type="button"
            onClick={() => setDockCollapsed((prev) => !prev)}
            className="px-3 py-1 rounded-t-lg bg-zinc-950/95 border border-zinc-800 text-[11px] font-mono text-zinc-300 hover:text-amber-300 flex items-center gap-1.5 cursor-pointer shadow-lg"
            style={dockCollapsed ? { transform: 'translateY(-44px)' } : undefined}
            title="Toggle HUD Dock (H)"
          >
            {dockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{dockCollapsed ? 'Show Controls (H)' : 'Hide Controls (H)'}</span>
          </button>
        </div>

        <div className="bg-zinc-950/95 border border-zinc-800 rounded-2xl px-3.5 py-2.5 shadow-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Material Finishes */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1">
              <Sliders className="w-3 h-3 text-amber-400" />
              Finish
            </span>
            <div className="flex items-center gap-1.5">
              {FINISH_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setFinishPreset(preset.id)}
                  title={preset.label}
                  className={`w-6 h-6 rounded-md border flex items-center justify-center cursor-pointer transition-transform ${
                    finishPreset === preset.id
                      ? 'border-white scale-110'
                      : 'border-zinc-700 opacity-75 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: preset.swatchHex }}
                />
              ))}
            </div>
          </div>

          {/* Lighting Rig Selector */}
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            {(
              [
                { id: 'orbital-twilight', label: 'Twilight' },
                { id: 'solar-foundry', label: 'Foundry' },
                { id: 'abyssal-hangar', label: 'Abyssal' }
              ] as const
            ).map((lp) => (
              <button
                key={lp.id}
                type="button"
                onClick={() => setLightingPreset(lp.id)}
                className={`px-2 py-1 rounded-md border cursor-pointer ${
                  lightingPreset === lp.id
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-semibold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {lp.label}
              </button>
            ))}
          </div>

          {mode === 'studio' ? (
            <>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-zinc-400">Explode</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={explodeFactor}
                  onChange={(e) => setExplodeFactor(Number(e.target.value))}
                  className="w-24 accent-sky-400 cursor-pointer"
                />
                <span className="text-sky-400 w-8 text-right tabular-nums">
                  {Math.round(explodeFactor * 100)}%
                </span>
              </div>

              <div className="flex items-center gap-1 font-mono text-[11px]">
                {(['hero', 'top', 'detail'] as CameraPreset[]).map((cp) => (
                  <button
                    key={cp}
                    type="button"
                    onClick={() => {
                      setCameraPreset(cp);
                      applyCameraPresetFnRef.current?.(cp);
                    }}
                    className={`px-2 py-1 rounded-md border capitalize cursor-pointer ${
                      cameraPreset === cp
                        ? 'bg-sky-500/20 border-sky-500/50 text-sky-300 font-semibold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {cp}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <button
                type="button"
                onClick={() => {
                  if (phase === 'PLAYING') setPhase('PAUSED');
                  else if (phase === 'PAUSED') setPhase('PLAYING');
                  else restartGameFnRef.current?.();
                }}
                className="px-3 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold flex items-center gap-1 cursor-pointer"
              >
                {phase === 'PLAYING' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{phase === 'PLAYING' ? 'Pause' : phase === 'PAUSED' ? 'Resume' : 'Launch'}</span>
              </button>
              <button
                type="button"
                onClick={() => restartGameFnRef.current?.()}
                className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          )}

          {/* Snapshot & Vault Export */}
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <button
              type="button"
              onClick={handleExportPng}
              className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 flex items-center gap-1 cursor-pointer"
              title="Export Render Snapshot PNG"
            >
              <Camera className="w-3 h-3 text-sky-400" />
              <span>PNG</span>
            </button>
            {onSaveToVault && (
              <button
                type="button"
                onClick={handleSaveToVault}
                className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 flex items-center gap-1 cursor-pointer"
                title="Save 3D Spatial Snapshot to Vault"
              >
                {savedNotice ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-300">Saved</span>
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="w-3 h-3 text-amber-400" />
                    <span>Vault</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
