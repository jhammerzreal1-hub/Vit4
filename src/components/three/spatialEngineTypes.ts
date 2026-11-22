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

export type EngineKind =
  | 'aerial_combat'
  | 'swarm_logistics'
  | 'byzantine_mesh'
  | 'orbital_physics'
  | 'photoreal_sandbox'
  | 'mmorpg_world'
  | 'custom_world';

export type MmorpgRace =
  | 'Valorian Human'
  | 'Highborne Aether-Elf'
  | 'Starforged Dwarf'
  | 'Draconic Vaelkori'
  | 'Sylvan Fae-Kin'
  | 'Abyssal Nephilim';

export type MmorpgClass =
  | 'Vanguard Paladin'
  | 'Chronomancer Mage'
  | 'Shadow Assassin'
  | 'Sylvana Cleric'
  | 'Archon Summoner'
  | 'Runeforge Berserker';

export type CharacterHairStyle =
  | 'crowned_locks'
  | 'braided_war'
  | 'arcane_crest'
  | 'hooded_cowl'
  | 'horned_diadem';

export type CharacterWingsStyle =
  | 'none'
  | 'seraphic_feathers'
  | 'draconic_wyrm'
  | 'astral_light'
  | 'fae_butterflies';

export interface CharacterAppearanceSpec {
  race: MmorpgRace;
  heroClass: MmorpgClass;
  bodyScale: number;
  skinToneHex: string;
  hairStyle: CharacterHairStyle;
  hairColorHex: string;
  primaryArmorHex: string;
  secondaryTrimHex: string;
  weaponGlowHex: string;
  wingsStyle: CharacterWingsStyle;
  cloakEnabled: boolean;
  useFantasyAvatar: boolean;
}

export const FANTASY_RACE_META: Record<
  MmorpgRace,
  {
    racialPassive: string;
    lore: string;
    defaultScale: number;
    defaultSkinHex: string;
    defaultHairHex: string;
    defaultWings: CharacterWingsStyle;
  }
> = {
  'Valorian Human': {
    racialPassive: 'Sovereign Adaptability (+10% All XP & +8% Crafter Mastery Gain)',
    lore: 'Scions of the High Citadel who master both runic steel and leyline statecraft.',
    defaultScale: 1.0,
    defaultSkinHex: '#e0b193',
    defaultHairHex: '#3b281e',
    defaultWings: 'none'
  },
  'Highborne Aether-Elf': {
    racialPassive: 'Leyline Attunement (+15% Max Mana & +12% Evolved Skill Radius)',
    lore: 'Immortal star-weavers with elongated ears and luminous eyes attuned to the Astral Loom.',
    defaultScale: 1.07,
    defaultSkinHex: '#f3d9ca',
    defaultHairHex: '#e2e8f0',
    defaultWings: 'astral_light'
  },
  'Starforged Dwarf': {
    racialPassive: 'Titan-Anvil Bloodline (+20% Crafter Item Stats & +15% Armor Defense)',
    lore: 'Broad-shouldered master smiths who temper meteorite titanium in heart-forges.',
    defaultScale: 0.88,
    defaultSkinHex: '#d19c78',
    defaultHairHex: '#b45309',
    defaultWings: 'none'
  },
  'Draconic Vaelkori': {
    racialPassive: 'Wyrmfire Carapace (+18% Boss Cleave Damage & Draconic Wing Glide)',
    lore: 'Horned dragon-kin bearing obsidian scales, molten eyes, and articulated wyrm wings.',
    defaultScale: 1.14,
    defaultSkinHex: '#883939',
    defaultHairHex: '#f59e0b',
    defaultWings: 'draconic_wyrm'
  },
  'Sylvan Fae-Kin': {
    racialPassive: 'World-Tree Communion (+15% Gathering Yield & +12% Party HoT Regeneration)',
    lore: 'Crowned with living antlers and bioluminescent flora from the Eternal Groves.',
    defaultScale: 0.96,
    defaultSkinHex: '#a7d7c5',
    defaultHairHex: '#10b981',
    defaultWings: 'fae_butterflies'
  },
  'Abyssal Nephilim': {
    racialPassive: 'Seraphic Eclipse (+16% Critical Penetration & Dual Light/Void Resonance)',
    lore: 'Celestial-void hybrids with radiant haloes and six-feathered seraph wings.',
    defaultScale: 1.1,
    defaultSkinHex: '#cbd5e1',
    defaultHairHex: '#a855f7',
    defaultWings: 'seraphic_feathers'
  }
};

export const FANTASY_CLASS_META: Record<
  MmorpgClass,
  {
    weaponLabel: string;
    offhandLabel: string;
    armorStyle: string;
    primaryArmorHex: string;
    secondaryTrimHex: string;
    weaponGlowHex: string;
    defaultHairStyle: CharacterHairStyle;
  }
> = {
  'Vanguard Paladin': {
    weaponLabel: 'Sunforged Greatsword',
    offhandLabel: 'Tower Aegis Greatshield',
    armorStyle: 'Heavy Sanctum Full-Plate & Winged Pauldrons',
    primaryArmorHex: '#cbd5e1',
    secondaryTrimHex: '#f59e0b',
    weaponGlowHex: '#fbbf24',
    defaultHairStyle: 'crowned_locks'
  },
  'Chronomancer Mage': {
    weaponLabel: 'Twin-Crystal Archstaff',
    offhandLabel: 'Floating Astrolabe Grimoire',
    armorStyle: 'Astral Silk Robes & Orbiting Shoulder Rings',
    primaryArmorHex: '#1e293b',
    secondaryTrimHex: '#38bdf8',
    weaponGlowHex: '#38bdf8',
    defaultHairStyle: 'arcane_crest'
  },
  'Shadow Assassin': {
    weaponLabel: 'Nether-Edge Twin Blade',
    offhandLabel: 'Reverse-Grip Venom Dagger',
    armorStyle: 'Nightstalker Leather Cuirass & Phantom Cowl',
    primaryArmorHex: '#18181b',
    secondaryTrimHex: '#f43f5e',
    weaponGlowHex: '#f43f5e',
    defaultHairStyle: 'hooded_cowl'
  },
  'Sylvana Cleric': {
    weaponLabel: 'World-Tree Luminal Scepter',
    offhandLabel: 'Sanctuary Censer Chalice',
    armorStyle: 'Seraphic Gold-Woven Vestments & Mantle',
    primaryArmorHex: '#ecfdf5',
    secondaryTrimHex: '#10b981',
    weaponGlowHex: '#34d399',
    defaultHairStyle: 'crowned_locks'
  },
  'Archon Summoner': {
    weaponLabel: 'Void-Rift Sovereign Polearm',
    offhandLabel: 'Orbiting Soul-Prism Reliquary',
    armorStyle: 'Horned Archon Regalia & Runic Waist-Tassets',
    primaryArmorHex: '#2e1065',
    secondaryTrimHex: '#a855f7',
    weaponGlowHex: '#e879f9',
    defaultHairStyle: 'horned_diadem'
  },
  'Runeforge Berserker': {
    weaponLabel: 'Colossal Dual-Bearded Greataxe',
    offhandLabel: 'Molten Runebreaker War-Horn',
    armorStyle: 'Dragonscale Mail & Spiked Titan Pauldrons',
    primaryArmorHex: '#451a03',
    secondaryTrimHex: '#f97316',
    weaponGlowHex: '#fb923c',
    defaultHairStyle: 'braided_war'
  }
};

export function createDefaultCharacterAppearance(
  race: MmorpgRace = 'Highborne Aether-Elf',
  heroClass: MmorpgClass = 'Vanguard Paladin'
): CharacterAppearanceSpec {
  const rMeta = FANTASY_RACE_META[race] || FANTASY_RACE_META['Valorian Human'];
  const cMeta = FANTASY_CLASS_META[heroClass] || FANTASY_CLASS_META['Vanguard Paladin'];
  return {
    race,
    heroClass,
    bodyScale: rMeta.defaultScale,
    skinToneHex: rMeta.defaultSkinHex,
    hairStyle: cMeta.defaultHairStyle,
    hairColorHex: rMeta.defaultHairHex,
    primaryArmorHex: cMeta.primaryArmorHex,
    secondaryTrimHex: cMeta.secondaryTrimHex,
    weaponGlowHex: cMeta.weaponGlowHex,
    wingsStyle: rMeta.defaultWings,
    cloakEnabled: true,
    useFantasyAvatar: true
  };
}

export type EvolutionAxis =
  | 'aggressor'
  | 'tactician'
  | 'guardian'
  | 'velocity'
  | 'architect'
  | 'abyssal';

export interface EvolutionDnaProfile {
  aggressor: number;
  tactician: number;
  guardian: number;
  velocity: number;
  architect: number;
  abyssal: number;
}

export type EvolvedSkillEffectType =
  | 'nova_cleave'
  | 'gravity_singularity'
  | 'chrono_siphon'
  | 'aegis_bastion'
  | 'storm_cataclysm'
  | 'world_genesis';

export type SkillMasteryRank =
  | 'Awakened'
  | 'Ascendant'
  | 'Transcendent'
  | 'Mythic Genesis';

export interface EvolvedSkillSpec {
  skillId: string;
  editionTag: string;
  dnaHash: string;
  name: string;
  slotIndex: 0 | 1 | 2 | 3;
  generation: number;
  masteryRank?: SkillMasteryRank;
  masteryLevel?: number;
  comboChainText?: string;
  weaponSynergyBonus?: number;
  dominantAxis: EvolutionAxis;
  secondaryAxis: EvolutionAxis;
  effectType: EvolvedSkillEffectType;
  secondaryEffect?: EvolvedSkillEffectType;
  biomeAffinity: EnvironmentBiome;
  weatherCatalyst: WeatherMode;
  powerMultiplier: number;
  radius: number;
  manaCost: number;
  cooldownSec: number;
  fxColorHex: string;
  particleCount: number;
  passiveBonus: string;
  lineageNote: string;
  createdAt: string;
}

export interface EvolvedClassAscensionSpec {
  ascensionId: string;
  editionTag: string;
  dnaHash: string;
  baseClass: MmorpgClass;
  race: MmorpgRace;
  evolvedClassName: string;
  ascensionTier: number;
  dominantAxis: EvolutionAxis;
  secondaryAxis: EvolutionAxis;
  triggerFeat: string;
  classPassiveAura: string;
  skillResonanceEffect: string;
  statMultipliers: {
    hpMult: number;
    manaMult: number;
    damageMult: number;
    craftMasteryBonus: number;
  };
  unlockedWings: CharacterWingsStyle;
  auraColorHex: string;
  createdAt: string;
}

export type ResourceMaterialId =
  | 'aether_crystal'
  | 'star_titanium'
  | 'abyssal_herb'
  | 'chrono_essence'
  | 'dragon_obsidian'
  | 'celestial_silk';

export type ResourceInventory = Record<ResourceMaterialId, number>;

export const RESOURCE_MATERIAL_META: Record<
  ResourceMaterialId,
  { label: string; shortLabel: string; colorHex: string; nodeName: string; biomeHint: string }
> = {
  aether_crystal: {
    label: 'Aether Crystal Shard',
    shortLabel: 'Aether',
    colorHex: '#38bdf8',
    nodeName: 'Leyline Crystal Vein',
    biomeHint: 'Canyon & Archipelago'
  },
  star_titanium: {
    label: 'Starforged Titanium Ore',
    shortLabel: 'Titanium',
    colorHex: '#f59e0b',
    nodeName: 'Meteorite Titanium Lode',
    biomeHint: 'Orbital Ring & Citadel'
  },
  abyssal_herb: {
    label: 'Abyssal Biolume Bloom',
    shortLabel: 'Abyssal Bloom',
    colorHex: '#10b981',
    nodeName: 'Luminal Spore Grove',
    biomeHint: 'Bioluminescent Abyss'
  },
  chrono_essence: {
    label: 'Chrono-Rift Essence',
    shortLabel: 'Chrono',
    colorHex: '#a855f7',
    nodeName: 'Temporal Rift Anomaly',
    biomeHint: 'Cyber Metropolis & Rifts'
  },
  dragon_obsidian: {
    label: 'Dragonscale Obsidian',
    shortLabel: 'Obsidian',
    colorHex: '#f43f5e',
    nodeName: 'Volcanic Caldera Outcrop',
    biomeHint: 'Desert Monolith & Boss Lair'
  },
  celestial_silk: {
    label: 'Celestial Astral Silk',
    shortLabel: 'Astral Silk',
    colorHex: '#e879f9',
    nodeName: 'Starlight Weaver Cocoon',
    biomeHint: 'High Altitude Sanctuaries'
  }
};

export type CraftedItemCategory =
  | 'weapon'
  | 'armor'
  | 'relic'
  | 'elixir'
  | 'world_beacon';

export type CraftedItemRarity =
  | 'Masterwork'
  | 'Ascendant'
  | 'Mythic'
  | '1-of-1 Sovereign';

export type CrafterSpecialization =
  | 'Bladesmith'
  | 'Arcana Artificer'
  | 'Armorsmith'
  | 'Alchemist'
  | 'World Architect';

export interface CraftedItemStats {
  attackBonus: number;
  defenseBonus: number;
  manaRegenBonus: number;
  critChancePct: number;
  speedBonusPct: number;
  skillPowerMult: number;
}

export interface CraftedItemSpec {
  itemId: string;
  editionTag: string;
  signatureHash: string;
  name: string;
  category: CraftedItemCategory;
  rarity: CraftedItemRarity;
  crafterName: string;
  crafterId: string;
  crafterRole: 'player' | 'ai_player' | 'ai_npc';
  crafterSkillLevel: number;
  crafterSpecialization: CrafterSpecialization;
  uniqueMakerTrait: string;
  stats: CraftedItemStats;
  materialsUsed: Partial<Record<ResourceMaterialId, number>>;
  biomeForgedIn: EnvironmentBiome;
  weatherCatalyst: WeatherMode;
  fxColorHex: string;
  loreInscription: string;
  bazaarPriceGold: number;
  soughtByCount: number;
  spawnedStructureKind?: ConceptStructureKind;
  createdAt: string;
}

export type StoryObjectiveType =
  | 'gather'
  | 'craft'
  | 'slay_boss'
  | 'reshape_world'
  | 'commune_npc';

export interface StoryQuestStage {
  questId: string;
  chapterNum: number;
  epochTitle: string;
  title: string;
  narrative: string;
  questGiverName: string;
  questGiverRole: string;
  objectiveType: StoryObjectiveType;
  progress: number;
  target: number;
  rewardXp: number;
  rewardGold: number;
  rewardMaterial: ResourceMaterialId;
  rewardMaterialCount: number;
  worldMutationOnClear: {
    biome: EnvironmentBiome;
    weather: WeatherMode;
    sunElevationDeg: number;
    spawnStructureKind: ConceptStructureKind;
    spawnStructureLabel: string;
  };
}

export interface MmorpgQolConfig {
  autoLoot: boolean;
  autoPilotQuest: boolean;
  autoEquipBest: boolean;
  showMinimap: boolean;
}

export interface WorldLiveEvent {
  eventId: string;
  title: string;
  category: 'celestial_omen' | 'rift_incursion' | 'artisan_conclave' | 'leyline_surge' | 'draconic_awakening';
  loreSummary: string;
  worldEffectText: string;
  biomeShift: EnvironmentBiome;
  weatherShift: WeatherMode;
  bonusMaterial: ResourceMaterialId;
  crafterQualityBoostPct: number;
  bossPowerMod: number;
  startedAt: string;
}

export interface LoreCodexChapter {
  id: string;
  era: string;
  title: string;
  summary: string;
  chronicleText: string;
}

export const AETHERION_WORLD_LORE_CODEX: LoreCodexChapter[] = [
  {
    id: 'lore-first-sundering',
    era: 'Era 0 · The First Sundering',
    title: 'The Shattering of the Primeval Astral Loom',
    summary: 'How the Six Sovereign Shards of Aetherion were born from the collision of Celestial Order and the Bioluminescent Abyss.',
    chronicleText:
      'Before time was measured in epochs, Aetherion was a single unbroken ringworld woven around the Astral Loom. When the Primordial Titan Malakor struck the Loom with the Void-Cleaver, the realm fractured into six living biomes—from the sunken fjords of the Alpine Archipelago to the glowing spore-caverns of the Bioluminescent Abyss and the floating spires of the Orbital Ringworld. Yet the leylines remained alive: whenever heroes, artisans, or AI sovereigns channel enough resonance, the shards physically shift and re-forge the world.'
  },
  {
    id: 'lore-six-bloodlines',
    era: 'Era I · Covenant of the Six Bloodlines',
    title: 'The Six Races & The Runeforge Pact',
    summary: 'Valorian Humans, Highborne Aether-Elves, Starforged Dwarves, Draconic Vaelkori, Sylvan Fae-Kin, and Abyssal Nephilim.',
    chronicleText:
      'None of the six bloodlines could survive the Rift Incursions alone. The Starforged Dwarves of Kazad-Sol brought the secret of meteorite titanium; the Highborne Aether-Elves wove star-silk and temporal astrolabes; the Draconic Vaelkori bound wyrmfire into obsidian blades; the Sylvan Fae-Kin cultivated living biolume elixirs; the Abyssal Nephilim bridged light and void; and the Valorian Humans raised the Sanctuary Citadel. Together they swore the Runeforge Pact: every masterwork weapon or relic forged carries its maker’s eternal soul-mark.'
  },
  {
    id: 'lore-living-continuity',
    era: 'Era II · The Forever Living Continuity',
    title: 'Why No Two Skills or Masterworks Are Ever Identical',
    summary: '6D Behavioral DNA and Crafter Maker Marks permanently alter the world state.',
    chronicleText:
      'In Aetherion Eternal, magic and steel are not static templates—they are living reflections of who forged them and under what sky. A Paladin who fights recklessly during an Ash-Storm over the Desert Monoliths mutates their 6D Behavioral DNA along the Aggressor and Abyssal axes, awakening a 1-of-1 skill that no other warrior possesses. Likewise, a Bladesmith or AI Artisan whose Crafter Mastery reaches sovereign heights imbues their weapons with a personal Maker Mark sought out by adventurers across the Grand Bazaar.'
  },
  {
    id: 'lore-eternal-chronicle',
    era: 'Era III..∞ · The Real-Time World Clock',
    title: 'World Events, Living NPCs & Autonomous Adventurers',
    summary: 'Every world event, boss kill, and masterwork forge writes the next chapter of the Eternal Chronicle.',
    chronicleText:
      'The Arch-Chroniclers do not recite dead history; they transcribe the living present. As Celestial Omens, Meteor Showers, and Rift Incursions sweep across Aetherion in real time, the world’s weather, lighting, resource veins, and quests dynamically transform. AI agents walk the realm both as stationed Sanctuary NPCs—Blacksmiths, Quest Givers, Lore Chroniclers—and as fellow Player Adventurers who harvest, craft, trade, and raid beside you.'
  }
];

export interface MmorpgHudState {
  playerRace: MmorpgRace;
  playerClass: MmorpgClass;
  evolvedClassSpec: EvolvedClassAscensionSpec | null;
  characterAppearance: CharacterAppearanceSpec;
  level: number;
  xp: number;
  xpToNext: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  gold: number;
  realmTier: number;
  bossName: string;
  bossHp: number;
  bossMaxHp: number;
  bossActive: boolean;
  questTitle: string;
  questProgress: number;
  questTarget: number;
  skillCooldowns: [number, number, number, number];
  evolutionProfile: EvolutionDnaProfile;
  evolutionProgress: number;
  evolvedSkills: EvolvedSkillSpec[];
  activeSlots: [EvolvedSkillSpec | null, EvolvedSkillSpec | null, EvolvedSkillSpec | null, EvolvedSkillSpec | null];
  materials: ResourceInventory;
  crafterSkillLevel: number;
  crafterXp: number;
  crafterSpecialization: CrafterSpecialization;
  craftedInventory: CraftedItemSpec[];
  equippedWeapon: CraftedItemSpec | null;
  equippedArmor: CraftedItemSpec | null;
  equippedRelic: CraftedItemSpec | null;
  storyQuest: StoryQuestStage;
  activeWorldEvent: WorldLiveEvent;
  activeDungeonId?: string;
  worldChronicleLog: string[];
  qol: MmorpgQolConfig;
}

export type EnvironmentBiome =
  | 'canyon_basin'
  | 'alpine_archipelago'
  | 'cyber_metropolis'
  | 'bioluminescent_abyss'
  | 'orbital_ringworld'
  | 'desert_monolith';

export type WeatherMode = 'clear' | 'rain' | 'ash' | 'spores' | 'snow';

export interface RenderPipelineConfig {
  biome: EnvironmentBiome;
  weather: WeatherMode;
  waterEnabled: boolean;
  waterLevel: number;
  waveAmplitude: number;
  bloomEnabled: boolean;
  bloomStrength: number;
  bloomThreshold: number;
  sunElevationDeg: number;
  sunAzimuthDeg: number;
  fogDensity: number;
  exposure: number;
}

export type ConceptStructureKind =
  | 'skyscraper'
  | 'reactor_spire'
  | 'crystal_cluster'
  | 'sandstone_arch'
  | 'orbital_pylon'
  | 'habitat_dome';

export type DetectedGameEngineType =
  | 'threejs'
  | 'phaser'
  | 'godot'
  | 'unity'
  | 'unreal'
  | 'minecraft'
  | 'pygame'
  | 'love2d'
  | 'html5_canvas'
  | 'custom_engine';

export interface DetectedGameRecord {
  gameId: string;
  gameKey: string;
  title: string;
  engine: DetectedGameEngineType;
  sourcePath: string;
  status: 'DETECTED' | 'HOOKED' | 'MODDED';
  modCount: number;
  capabilities: string[];
  runtimeHook: 'spatial_bus' | 'canvas_dom' | 'filesystem_script' | 'hybrid';
  modState: {
    godMode: boolean;
    timeScale: number;
    gravity: number;
    speedScale: number;
    biome?: EnvironmentBiome;
    weather?: WeatherMode;
    bloomStrength?: number;
    activeMods: Array<{
      modId: string;
      name: string;
      appliedBy: string;
      summary: string;
      appliedAt: string;
      scriptPath?: string;
    }>;
  };
  detectedAt: string;
  updatedAt: string;
}

export type EngineToolCategory =
  | 'biome_sculptor'
  | 'water_fluid_shader'
  | 'skyline_architect'
  | 'weather_system'
  | 'entity_assembler'
  | 'physics_mutator'
  | 'glsl_post_fx';

export interface ProceduralEngineToolSpec {
  toolId: string;
  name: string;
  category: EngineToolCategory;
  description: string;
  createdByAgent: string;
  parameters: Record<string, any>;
  generatedStructures?: Array<{
    id: string;
    conceptKind: ConceptStructureKind;
    label: string;
    x: number;
    z: number;
    scale: number;
    colorHex: string;
  }>;
  pipelinePatch?: Partial<RenderPipelineConfig>;
  physicsPatch?: Partial<SpatialPhysicsConfig>;
  createdAt: string;
}

export type AgentParticipantRole =
  | 'ally'
  | 'rival'
  | 'guardian'
  | 'architect'
  | 'process_worker';

export type AgentTacticalPolicy =
  | 'harvest'
  | 'escort'
  | 'intercept'
  | 'route_packets'
  | 'consensus_sync'
  | 'orbit_hold';

export type ProcessEntityKind =
  | 'relay_source'
  | 'relay_processor'
  | 'relay_sink'
  | 'validator_node'
  | 'gravity_well'
  | 'hazard_sentinel'
  | 'beacon';

export type BlueprintFinishPreset =
  | 'titanium-amber'
  | 'obsidian-cyan'
  | 'ceramic-emerald'
  | 'forged-bronze';

export type BlueprintLightingPreset =
  | 'orbital-twilight'
  | 'solar-foundry'
  | 'abyssal-hangar';

export interface BlueprintEntitySpec {
  id: string;
  kind: ProcessEntityKind;
  label: string;
  x: number;
  z: number;
  weight?: number;
  faulty?: boolean;
}

export interface SpatialPhysicsConfig {
  gravity: number;       // m/s^2 vertical damping/orbital pull
  drag: number;          // lateral damping multiplier
  speedScale: number;    // 0.5..2.2 speed scale
  thrustPower: number;   // 14..45 boost max speed
  arenaRadius: number;   // 28..45
  magneticPull: number;  // 0..18 attraction radius / gravity well pull
  godMode?: boolean;
}

export interface SpatialRulesConfig {
  winCondition: string;
  targetScore: number;
  hazardCount: number;
  beaconCount: number;
  beaconValue: number;
  allowPvP: boolean;
  waveCount: number;
}

export interface SpatialProcessConfig {
  metricLabel: string;
  metricUnit: string;
  targetKpi: number;
  packetSpawnRate: number;
  faultInjectionRate: number;
}

export interface SpatialBlueprint {
  id: string;
  title: string;
  description: string;
  engineKind: EngineKind;
  createdByAgent: string;
  finishPreset: BlueprintFinishPreset;
  lightingPreset: BlueprintLightingPreset;
  renderPipeline?: RenderPipelineConfig;
  physics: SpatialPhysicsConfig;
  rules: SpatialRulesConfig;
  processConfig: SpatialProcessConfig;
  entities: BlueprintEntitySpec[];
  createdAt: string;
}

export type AgentPersonaMode = 'player' | 'npc';

export type AgentNpcRole =
  | 'Quest Giver'
  | 'Master Blacksmith'
  | 'Bazaar Merchant'
  | 'Lore Chronicler'
  | 'Dungeon Warden';

export interface AgentParticipantState {
  agentId: string;
  name: string;
  role: AgentParticipantRole;
  policy: AgentTacticalPolicy;
  colorHex: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  yaw: number;
  score: number;
  tasksCompleted: number;
  packetsDelivered: number;
  faultsHealed: number;
  lastAction: string;
  active: boolean;
  targetX?: number;
  targetZ?: number;
  boostTimer?: number;
  carryingPacket?: boolean;
  rpgRace?: MmorpgRace;
  rpgClass?: MmorpgClass;
  evolvedClassSpec?: EvolvedClassAscensionSpec;
  level?: number;
  hp?: number;
  maxHp?: number;
  dps?: number;
  evolvedSkills?: EvolvedSkillSpec[];
  evolutionProfile?: EvolutionDnaProfile;
  personaMode?: AgentPersonaMode;
  npcRole?: AgentNpcRole;
  npcTitle?: string;
  npcDialogue?: string;
  crafterLevel?: number;
  crafterSpec?: CrafterSpecialization;
  equippedWeaponName?: string;
}

export type SpatialCommandType =
  | 'LOAD_BLUEPRINT'
  | 'SPAWN_AGENT'
  | 'REMOVE_AGENT'
  | 'AGENT_ACTION'
  | 'SPAWN_ENTITY'
  | 'MUTATE_PHYSICS'
  | 'MUTATE_PIPELINE'
  | 'FORGE_TOOL'
  | 'APPLY_GAME_MOD'
  | 'CAST_RPG_SKILL'
  | 'EVOLVE_SKILL'
  | 'CRAFT_ITEM'
  | 'GATHER_RESOURCE'
  | 'ADVANCE_STORY'
  | 'SET_AGENT_PERSONA'
  | 'START_SIMULATION'
  | 'PAUSE_SIMULATION'
  | 'INJECT_FAULT'
  | 'HEAL_QUORUM'
  | 'TRIGGER_WAVE';

export interface SpatialCommandEvent {
  seq: number;
  timestamp: string;
  sourceAgent: string;
  type: SpatialCommandType;
  payload: Record<string, any>;
}

export interface SpatialLiveSnapshot {
  mode: 'game' | 'studio';
  phase: 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'VICTORY' | 'GAME_OVER';
  engineKind: EngineKind;
  blueprintId: string;
  blueprintTitle: string;
  score: number;
  wave: number;
  shields: number;
  playerX: number;
  playerZ: number;
  playerYaw: number;
  beaconsRemaining: number;
  processMetricLabel: string;
  processMetricValue: number;
  processMetricUnit: string;
  quorumPercent: number;
  throughputPerSec: number;
  orbitalFlux: number;
  entitiesCount: number;
  biome?: EnvironmentBiome;
  weather?: WeatherMode;
  godMode?: boolean;
  participants: AgentParticipantState[];
  updatedAt: string;
}

export const ROLE_COLOR_MAP: Record<AgentParticipantRole, string> = {
  ally: '#10b981',
  rival: '#f43f5e',
  guardian: '#06b6d4',
  architect: '#f59e0b',
  process_worker: '#a855f7'
};

export const BIOME_PRESET_DEFAULTS: Record<EnvironmentBiome, RenderPipelineConfig> = {
  canyon_basin: {
    biome: 'canyon_basin',
    weather: 'clear',
    waterEnabled: false,
    waterLevel: -0.65,
    waveAmplitude: 0.25,
    bloomEnabled: true,
    bloomStrength: 0.42,
    bloomThreshold: 0.86,
    sunElevationDeg: 28,
    sunAzimuthDeg: 38,
    fogDensity: 0.0072,
    exposure: 1.08
  },
  alpine_archipelago: {
    biome: 'alpine_archipelago',
    weather: 'rain',
    waterEnabled: true,
    waterLevel: -0.35,
    waveAmplitude: 0.38,
    bloomEnabled: true,
    bloomStrength: 0.48,
    bloomThreshold: 0.85,
    sunElevationDeg: 19,
    sunAzimuthDeg: 52,
    fogDensity: 0.0068,
    exposure: 1.12
  },
  cyber_metropolis: {
    biome: 'cyber_metropolis',
    weather: 'rain',
    waterEnabled: true,
    waterLevel: -0.5,
    waveAmplitude: 0.22,
    bloomEnabled: true,
    bloomStrength: 0.72,
    bloomThreshold: 0.75,
    sunElevationDeg: 8,
    sunAzimuthDeg: 210,
    fogDensity: 0.0092,
    exposure: 1.14
  },
  bioluminescent_abyss: {
    biome: 'bioluminescent_abyss',
    weather: 'spores',
    waterEnabled: true,
    waterLevel: -0.45,
    waveAmplitude: 0.3,
    bloomEnabled: true,
    bloomStrength: 0.68,
    bloomThreshold: 0.76,
    sunElevationDeg: 11,
    sunAzimuthDeg: 145,
    fogDensity: 0.0086,
    exposure: 1.1
  },
  orbital_ringworld: {
    biome: 'orbital_ringworld',
    weather: 'clear',
    waterEnabled: false,
    waterLevel: -0.9,
    waveAmplitude: 0.15,
    bloomEnabled: true,
    bloomStrength: 0.62,
    bloomThreshold: 0.8,
    sunElevationDeg: 22,
    sunAzimuthDeg: 95,
    fogDensity: 0.0056,
    exposure: 1.15
  },
  desert_monolith: {
    biome: 'desert_monolith',
    weather: 'ash',
    waterEnabled: false,
    waterLevel: -1.1,
    waveAmplitude: 0.18,
    bloomEnabled: true,
    bloomStrength: 0.38,
    bloomThreshold: 0.88,
    sunElevationDeg: 14,
    sunAzimuthDeg: 24,
    fogDensity: 0.0078,
    exposure: 1.16
  }
};

export function createBuiltinSpatialPresets(): Record<Exclude<EngineKind, 'custom_world'>, SpatialBlueprint> {
  const now = new Date().toISOString();
  return {
    aerial_combat: {
      id: 'preset-aerial-combat',
      title: 'Aegis Skylane · Canyon Interceptor',
      description: 'High-speed crystal beacon harvesting & sentinel evasion across three escalating waves with AI wingmen and rivals.',
      engineKind: 'aerial_combat',
      createdByAgent: 'lyrailius-omega-zenith',
      finishPreset: 'titanium-amber',
      lightingPreset: 'orbital-twilight',
      renderPipeline: { ...BIOME_PRESET_DEFAULTS.canyon_basin },
      physics: {
        gravity: 9.8,
        drag: 6.0,
        speedScale: 1.0,
        thrustPower: 34,
        arenaRadius: 44,
        magneticPull: 2.6
      },
      rules: {
        winCondition: 'Clear all crystal beacon waves while preserving shield integrity',
        targetScore: 6000,
        hazardCount: 3,
        beaconCount: 8,
        beaconValue: 150,
        allowPvP: true,
        waveCount: 3
      },
      processConfig: {
        metricLabel: 'Corridor Dominance',
        metricUnit: 'pts',
        targetKpi: 6000,
        packetSpawnRate: 0,
        faultInjectionRate: 0
      },
      entities: [],
      createdAt: now
    },
    swarm_logistics: {
      id: 'preset-swarm-logistics',
      title: 'Autonomous Swarm Supply & Packet Mesh',
      description: 'Non-typical 3D distributed compute & logistics simulation: AI worker agents route live data packets from Source Depots through Processor Nodes to Sink Vaults while dodging thermal fault sentinels.',
      engineKind: 'swarm_logistics',
      createdByAgent: 'lyrailius-omega-zenith',
      finishPreset: 'ceramic-emerald',
      lightingPreset: 'abyssal-hangar',
      renderPipeline: { ...BIOME_PRESET_DEFAULTS.cyber_metropolis },
      physics: {
        gravity: 9.8,
        drag: 6.5,
        speedScale: 1.15,
        thrustPower: 36,
        arenaRadius: 44,
        magneticPull: 3.4
      },
      rules: {
        winCondition: 'Route target logistics packets & sustain >85% pipeline throughput',
        targetScore: 4500,
        hazardCount: 3,
        beaconCount: 6,
        beaconValue: 180,
        allowPvP: false,
        waveCount: 3
      },
      processConfig: {
        metricLabel: 'Packet Throughput',
        metricUnit: 'pkt/min',
        targetKpi: 36,
        packetSpawnRate: 1.6,
        faultInjectionRate: 0.15
      },
      entities: [
        { id: 'src-alpha', kind: 'relay_source', label: 'Ingress Depot Alpha', x: -24, z: -18, weight: 1.2 },
        { id: 'src-beta', kind: 'relay_source', label: 'Ingress Depot Beta', x: -22, z: 20, weight: 1.2 },
        { id: 'proc-core', kind: 'relay_processor', label: 'Refinery Router Core', x: 0, z: -4, weight: 1.5 },
        { id: 'proc-edge', kind: 'relay_processor', label: 'Edge Multiplexer', x: 4, z: 18, weight: 1.2 },
        { id: 'sink-omega', kind: 'relay_sink', label: 'Vault Sink Omega', x: 26, z: -14, weight: 1.4 },
        { id: 'sink-sigma', kind: 'relay_sink', label: 'Vault Sink Sigma', x: 24, z: 16, weight: 1.4 }
      ],
      createdAt: now
    },
    byzantine_mesh: {
      id: 'preset-byzantine-mesh',
      title: 'Byzantine Consensus & Self-Healing Quorum',
      description: 'Distributed systems simulator rendered in 3D: 6 validator towers maintain BFT quorum. Fault injections corrupt nodes red; Guardian & Architect AI craft fly between towers to scrub & heal consensus.',
      engineKind: 'byzantine_mesh',
      createdByAgent: 'lyrailius-omega-zenith',
      finishPreset: 'obsidian-cyan',
      lightingPreset: 'orbital-twilight',
      renderPipeline: { ...BIOME_PRESET_DEFAULTS.bioluminescent_abyss },
      physics: {
        gravity: 7.2,
        drag: 5.5,
        speedScale: 1.1,
        thrustPower: 38,
        arenaRadius: 44,
        magneticPull: 3.2
      },
      rules: {
        winCondition: 'Maintain >=67% BFT quorum & heal corrupted validator shards',
        targetScore: 5000,
        hazardCount: 4,
        beaconCount: 7,
        beaconValue: 200,
        allowPvP: false,
        waveCount: 3
      },
      processConfig: {
        metricLabel: 'BFT Quorum Health',
        metricUnit: '%',
        targetKpi: 100,
        packetSpawnRate: 1.2,
        faultInjectionRate: 0.25
      },
      entities: [
        { id: 'val-0', kind: 'validator_node', label: 'Validator Quor-01', x: 0, z: -26, faulty: false },
        { id: 'val-1', kind: 'validator_node', label: 'Validator Quor-02', x: 23, z: -13, faulty: false },
        { id: 'val-2', kind: 'validator_node', label: 'Validator Quor-03', x: 23, z: 13, faulty: true },
        { id: 'val-3', kind: 'validator_node', label: 'Validator Quor-04', x: 0, z: 26, faulty: false },
        { id: 'val-4', kind: 'validator_node', label: 'Validator Quor-05', x: -23, z: 13, faulty: false },
        { id: 'val-5', kind: 'validator_node', label: 'Validator Quor-06', x: -23, z: -13, faulty: true }
      ],
      createdAt: now
    },
    orbital_physics: {
      id: 'preset-orbital-physics',
      title: 'Orbital Gravity Slingshot & Flux Sandbox',
      description: 'N-body gravitational containment playground: Gravity wells bend interceptor & AI pilot trajectories dynamically while harvesting destabilized flux cores.',
      engineKind: 'orbital_physics',
      createdByAgent: 'lyrailius-omega-zenith',
      finishPreset: 'forged-bronze',
      lightingPreset: 'solar-foundry',
      renderPipeline: { ...BIOME_PRESET_DEFAULTS.orbital_ringworld },
      physics: {
        gravity: 4.5,
        drag: 3.2,
        speedScale: 1.35,
        thrustPower: 42,
        arenaRadius: 45,
        magneticPull: 9.5
      },
      rules: {
        winCondition: 'Surf gravitational slingshots to harvest destabilized orbital cores',
        targetScore: 7200,
        hazardCount: 4,
        beaconCount: 9,
        beaconValue: 220,
        allowPvP: true,
        waveCount: 3
      },
      processConfig: {
        metricLabel: 'Orbital Flux Energy',
        metricUnit: 'MW',
        targetKpi: 500,
        packetSpawnRate: 1.0,
        faultInjectionRate: 0.1
      },
      entities: [
        { id: 'well-north', kind: 'gravity_well', label: 'Singularity Well North', x: -16, z: -16, weight: 1.8 },
        { id: 'well-east', kind: 'gravity_well', label: 'Singularity Well East', x: 18, z: -10, weight: 1.6 },
        { id: 'well-south', kind: 'gravity_well', label: 'Singularity Well South', x: 4, z: 20, weight: 2.0 }
      ],
      createdAt: now
    },
    photoreal_sandbox: {
      id: 'preset-photoreal-sandbox',
      title: 'Aegis Hyperion · Photorealistic World Engine',
      description: 'AAA-grade physically-based atmospheric environment with Rayleigh/Mie sky scattering, Gerstner displacement ocean water, Sobel tangent-space normals, dynamic weather particles, and UnrealBloom HDR pipeline.',
      engineKind: 'photoreal_sandbox',
      createdByAgent: 'lyrailius-omega-zenith',
      finishPreset: 'obsidian-cyan',
      lightingPreset: 'orbital-twilight',
      renderPipeline: { ...BIOME_PRESET_DEFAULTS.alpine_archipelago },
      physics: {
        gravity: 8.6,
        drag: 5.4,
        speedScale: 1.18,
        thrustPower: 38,
        arenaRadius: 45,
        magneticPull: 4.2
      },
      rules: {
        winCondition: 'Chart atmospheric archipelago relays while synchronizing AI survey craft',
        targetScore: 6800,
        hazardCount: 3,
        beaconCount: 8,
        beaconValue: 200,
        allowPvP: true,
        waveCount: 3
      },
      processConfig: {
        metricLabel: 'Render Fidelity Index',
        metricUnit: 'HDR',
        targetKpi: 120,
        packetSpawnRate: 1.0,
        faultInjectionRate: 0.08
      },
      entities: [
        { id: 'hyper-src', kind: 'relay_source', label: 'Hydrofoil Telemetry Buoy', x: -24, z: -16, weight: 1.3 },
        { id: 'hyper-proc', kind: 'relay_processor', label: 'Atmospheric Lidar Spire', x: 22, z: -14, weight: 1.5 },
        { id: 'hyper-well', kind: 'gravity_well', label: 'Tidal Harmonics Core', x: 0, z: 22, weight: 1.4 }
      ],
      createdAt: now
    },
    mmorpg_world: {
      id: 'preset-mmorpg-world',
      title: 'Aetherion Eternal · Infinite Photorealistic MMORPG',
      description: 'Persistent seamless 3D MMORPG realm with Rayleigh/Mie sky, Gerstner ocean tides, live AI Raid Party (Paladin, Chronomancer, Cleric, Assassin), Apex World Raid Boss, 4 active hotbar abilities, unlimited Mythic+ level scaling, and procedural dungeon forging.',
      engineKind: 'mmorpg_world',
      createdByAgent: 'lyrailius-omega-zenith',
      finishPreset: 'forged-bronze',
      lightingPreset: 'solar-foundry',
      renderPipeline: {
        ...BIOME_PRESET_DEFAULTS.alpine_archipelago,
        weather: 'clear',
        waterEnabled: true,
        bloomStrength: 0.56,
        sunElevationDeg: 22
      },
      physics: {
        gravity: 9.8,
        drag: 6.4,
        speedScale: 1.2,
        thrustPower: 40,
        arenaRadius: 45,
        magneticPull: 3.0
      },
      rules: {
        winCondition: 'Conquer endless Mythic+ Raid Boss tiers with AI Guild Party & ascend infinitely',
        targetScore: 25000,
        hazardCount: 4,
        beaconCount: 9,
        beaconValue: 260,
        allowPvP: true,
        waveCount: 999
      },
      processConfig: {
        metricLabel: 'Party Raid DPS',
        metricUnit: 'DPS',
        targetKpi: 1500,
        packetSpawnRate: 1.5,
        faultInjectionRate: 0.1
      },
      entities: [
        { id: 'mmo-sanctuary', kind: 'relay_source', label: 'Aetherion Citadel Sanctuary', x: -26, z: -18, weight: 1.6 },
        { id: 'mmo-obelisk-n', kind: 'validator_node', label: 'North Leyline Waystone', x: 0, z: -28, faulty: false },
        { id: 'mmo-obelisk-e', kind: 'validator_node', label: 'East Tidecaller Shrine', x: 28, z: 4, faulty: false },
        { id: 'mmo-forge-altar', kind: 'relay_processor', label: 'Mythic Runeforge Altar', x: -22, z: 22, weight: 1.5 },
        { id: 'mmo-rift-nexus', kind: 'gravity_well', label: 'Abyssal Raid Rift Portal', x: 20, z: -22, weight: 1.9 },
        { id: 'mmo-guild-vault', kind: 'relay_sink', label: 'Astral Guild Treasury', x: 24, z: 24, weight: 1.5 }
      ],
      createdAt: now
    }
  };
}

export function inferBiomeFromPrompt(lower: string, fallback: EnvironmentBiome): EnvironmentBiome {
  if (/cyber|city|metropolis|neon|urban|skyscraper|tokyo|night/.test(lower)) return 'cyber_metropolis';
  if (/ocean|sea|archipelago|island|water|alpine|fjord|lake|storm|wave/.test(lower)) return 'alpine_archipelago';
  if (/abyss|biolumines|cavern|cave|spore|deep|alien|jungle/.test(lower)) return 'bioluminescent_abyss';
  if (/ringworld|space|orbital|station|halo|star|galaxy|singularity/.test(lower)) return 'orbital_ringworld';
  if (/desert|dune|mars|monolith|sand|canyon|arach|dune/.test(lower)) return 'desert_monolith';
  if (/canyon|skylane/.test(lower)) return 'canyon_basin';
  return fallback;
}

export function inferWeatherFromPrompt(lower: string, fallback: WeatherMode): WeatherMode {
  if (/rain|storm|monsoon|thunder|drizzle|wet/.test(lower)) return 'rain';
  if (/snow|blizzard|ice|arctic|frost|glacial/.test(lower)) return 'snow';
  if (/ash|volcan|ember|desert|dust|sand/.test(lower)) return 'ash';
  if (/spore|biolumines|alien|forest|pollen/.test(lower)) return 'spores';
  if (/clear|sunny|bright/.test(lower)) return 'clear';
  return fallback;
}

export function synthesizeSpatialBlueprint(
  prompt: string,
  options: {
    engineKind?: EngineKind;
    title?: string;
    finishPreset?: BlueprintFinishPreset;
    lightingPreset?: BlueprintLightingPreset;
    createdByAgent?: string;
    speedScale?: number;
    gravity?: number;
    hazardCount?: number;
    beaconCount?: number;
    metricLabel?: string;
    metricUnit?: string;
    biome?: EnvironmentBiome;
    weather?: WeatherMode;
    waterEnabled?: boolean;
    bloomStrength?: number;
    sunElevationDeg?: number;
    customEntities?: BlueprintEntitySpec[];
  } = {}
): SpatialBlueprint {
  const lower = String(prompt || '').toLowerCase();
  const presets = createBuiltinSpatialPresets();

  let detectedKind: EngineKind = options.engineKind || 'custom_world';
  if (!options.engineKind) {
    if (/mmorpg|mmo\b|rpg|raid|boss|guild|dungeon|quest|paladin|mage|mana|citadel|mythic|realm|open[\s-]*world/.test(lower)) {
      detectedKind = 'mmorpg_world';
    } else if (/photoreal|realistic|hyperion|unreal|aaa|archipelago|water|skyline|metropolis|biolumines|desert/.test(lower)) {
      detectedKind = 'photoreal_sandbox';
    } else if (/byzantine|consensus|quorum|validator|fault|blockchain|raft|distributed/.test(lower)) {
      detectedKind = 'byzantine_mesh';
    } else if (/swarm|logistics|factory|packet|router|supply|queue|pipeline/.test(lower)) {
      detectedKind = 'swarm_logistics';
    } else if (/orbit|gravity|slingshot|physics|n-body|singularity|flux/.test(lower)) {
      detectedKind = 'orbital_physics';
    } else if (/combat|dogfight|arena|wave|skylane|interceptor|race/.test(lower)) {
      detectedKind = 'aerial_combat';
    } else {
      detectedKind = 'custom_world';
    }
  }

  const base =
    detectedKind === 'custom_world'
      ? presets.mmorpg_world
      : presets[detectedKind];

  const basePipeline = base.renderPipeline || BIOME_PRESET_DEFAULTS.canyon_basin;
  const biome = options.biome || inferBiomeFromPrompt(lower, basePipeline.biome);
  const biomeDefaults = BIOME_PRESET_DEFAULTS[biome];
  const weather = options.weather || inferWeatherFromPrompt(lower, biomeDefaults.weather);
  const waterEnabled =
    typeof options.waterEnabled === 'boolean'
      ? options.waterEnabled
      : /water|ocean|lake|sea|island|archipelago|harbor/.test(lower)
        ? true
        : biomeDefaults.waterEnabled;

  const renderPipeline: RenderPipelineConfig = {
    ...biomeDefaults,
    biome,
    weather,
    waterEnabled,
    bloomStrength:
      typeof options.bloomStrength === 'number'
        ? Math.max(0, Math.min(2, options.bloomStrength))
        : biomeDefaults.bloomStrength,
    sunElevationDeg:
      typeof options.sunElevationDeg === 'number'
        ? Math.max(2, Math.min(82, options.sunElevationDeg))
        : biomeDefaults.sunElevationDeg
  };

  const cleanTitle =
    options.title?.trim() ||
    (prompt.trim()
      ? prompt.trim().slice(0, 58).replace(/\s+/g, ' ')
      : base.title);

  const entities: BlueprintEntitySpec[] =
    Array.isArray(options.customEntities) && options.customEntities.length > 0
      ? options.customEntities
      : detectedKind === 'custom_world'
      ? [
          { id: 'cust-src-1', kind: 'relay_source', label: 'Autonomous Generator Node', x: -24, z: 0, weight: 1.4 },
          { id: 'cust-val-1', kind: 'validator_node', label: 'Consensus Arbiter Hub', x: 0, z: -22, faulty: false },
          { id: 'cust-well-1', kind: 'gravity_well', label: 'Harmonic Attractor Well', x: 0, z: 18, weight: 1.6 },
          { id: 'cust-sink-1', kind: 'relay_sink', label: 'Synthesis Collector Sink', x: 24, z: 0, weight: 1.5 }
        ]
      : base.entities.map((e) => ({ ...e }));

  return {
    ...base,
    id: `bp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: cleanTitle,
    description: prompt.trim() || base.description,
    engineKind: detectedKind,
    createdByAgent: options.createdByAgent || 'lyrailius-omega-zenith',
    finishPreset: options.finishPreset || base.finishPreset,
    lightingPreset: options.lightingPreset || base.lightingPreset,
    renderPipeline,
    physics: {
      ...base.physics,
      speedScale: options.speedScale ?? base.physics.speedScale,
      gravity: options.gravity ?? base.physics.gravity
    },
    rules: {
      ...base.rules,
      hazardCount: options.hazardCount ?? base.rules.hazardCount,
      beaconCount: options.beaconCount ?? base.rules.beaconCount
    },
    processConfig: {
      ...base.processConfig,
      metricLabel: options.metricLabel || base.processConfig.metricLabel,
      metricUnit: options.metricUnit || base.processConfig.metricUnit
    },
    entities,
    createdAt: new Date().toISOString()
  };
}

export const DEFAULT_EVOLUTION_PROFILE: EvolutionDnaProfile = {
  aggressor: 12,
  tactician: 8,
  guardian: 10,
  velocity: 10,
  architect: 6,
  abyssal: 4
};

function fnv1aHex(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

export function synthesizeUniqueEvolvedSkill(params: {
  profile: EvolutionDnaProfile;
  playerClass: MmorpgClass;
  level: number;
  biome: EnvironmentBiome;
  weather: WeatherMode;
  existingHashes?: string[];
  preferredSlot?: 0 | 1 | 2 | 3;
  customIntent?: string;
}): EvolvedSkillSpec {
  const axes: Array<[EvolutionAxis, number]> = [
    ['aggressor', params.profile.aggressor],
    ['tactician', params.profile.tactician],
    ['guardian', params.profile.guardian],
    ['velocity', params.profile.velocity],
    ['architect', params.profile.architect],
    ['abyssal', params.profile.abyssal]
  ];
  axes.sort((a, b) => b[1] - a[1]);

  const dominant = axes[0][0];
  const secondary = axes[1][0];
  const generation = (params.existingHashes?.length || 0) + 1;

  const axisPrefix: Record<EvolutionAxis, string[]> = {
    aggressor: ['Crimson', 'Sovereign', 'Sundering', 'Bloodfire', 'Oblivion'],
    tactician: ['Leyline', 'Astral', 'Paradox', 'Singularity', 'Quantum'],
    guardian: ['Sanctum', 'Aegis', 'Seraphic', 'Bulwark', 'Vowkeeper'],
    velocity: ['Galeborn', 'Mach', 'Zephyr', 'Hyperion', 'Lightstep'],
    architect: ['Genesis', 'Runeforged', 'Monolith', 'Tessera', 'Prismatic'],
    abyssal: ['Voidborn', 'Eclipse', 'Nether', 'Nightmare', 'Riftbound']
  };

  const biomeEpithet: Record<EnvironmentBiome, string> = {
    canyon_basin: 'Canyon',
    alpine_archipelago: 'Tidecaller',
    cyber_metropolis: 'Neon-Grid',
    bioluminescent_abyss: 'Luminal',
    orbital_ringworld: 'Star-Ring',
    desert_monolith: 'Solaris'
  };

  const weatherNoun: Record<WeatherMode, string> = {
    clear: 'Corona',
    rain: 'Maelstrom',
    snow: 'Absolute Zero',
    ash: 'Cinderfall',
    spores: 'Bloomsurge'
  };

  const axisCoreNoun: Record<EvolutionAxis, string[]> = {
    aggressor: ['Severance', 'Execution', 'Rupture', 'Judgment'],
    tactician: ['Convergence', 'Vortex', 'Inversion', 'Catalyst'],
    guardian: ['Bastion', 'Redemption', 'Sanctuary', 'Overwatch'],
    velocity: ['Flashstep', 'Tempest', 'Phantom Surge', 'Velocity Nova'],
    architect: ['Citadel', 'Sculpture', 'Forge-Pulse', 'Construct'],
    abyssal: ['Cataclysm', 'Devourer', 'Soul-Rend', 'Horizon']
  };

  const effectByAxis: Record<EvolutionAxis, EvolvedSkillEffectType> = {
    aggressor: 'nova_cleave',
    tactician: 'gravity_singularity',
    guardian: 'aegis_bastion',
    velocity: 'chrono_siphon',
    architect: 'world_genesis',
    abyssal: 'storm_cataclysm'
  };

  const colorByAxis: Record<EvolutionAxis, string> = {
    aggressor: '#f43f5e',
    tactician: '#38bdf8',
    guardian: '#10b981',
    velocity: '#f59e0b',
    architect: '#a855f7',
    abyssal: '#e879f9'
  };

  const slotByAxis: Record<EvolutionAxis, 0 | 1 | 2 | 3> = {
    aggressor: 0,
    tactician: 1,
    velocity: 1,
    guardian: 2,
    architect: 2,
    abyssal: 3
  };

  const existingSet = new Set(params.existingHashes || []);
  let nonce = 0;
  let dnaHash = '';
  do {
    const raw = `${params.playerClass}|${dominant}|${secondary}|${params.biome}|${params.weather}|L${params.level}|G${generation}|${JSON.stringify(params.profile)}|${nonce}|${Date.now()}`;
    dnaHash = fnv1aHex(raw) + fnv1aHex(raw.split('').reverse().join('')).slice(0, 4);
    nonce += 1;
  } while (existingSet.has(dnaHash) && nonce < 20);

  const seedInt = parseInt(dnaHash.slice(0, 6), 16);
  const pList = axisPrefix[dominant];
  const nList = axisCoreNoun[secondary];
  const prefix = pList[seedInt % pList.length];
  const noun = nList[(seedInt >> 4) % nList.length];
  const useWeatherFlavor = seedInt % 2 === 0;
  const flavor = useWeatherFlavor ? weatherNoun[params.weather] : biomeEpithet[params.biome];

  const customSuffix = params.customIntent
    ? ` (${params.customIntent.trim().slice(0, 18)})`
    : '';
  const name = `${prefix} ${flavor} ${noun}${customSuffix}`;

  const effectType = effectByAxis[dominant];
  const secondaryEffect =
    effectByAxis[secondary] !== effectType ? effectByAxis[secondary] : undefined;

  const powerMultiplier =
    Math.round((1.45 + Math.min(2.2, params.level * 0.08) + ((seedInt % 35) / 100)) * 100) / 100;
  const radius = Math.round((8.5 + (seedInt % 9) + params.profile[dominant] * 0.06) * 10) / 10;
  const cooldownSec = Math.max(2.2, Math.round((7.5 - Math.min(3.5, params.profile.velocity * 0.04)) * 10) / 10);
  const manaCost = Math.max(10, 16 + Math.floor((powerMultiplier - 1.4) * 14));
  const slotIndex =
    typeof params.preferredSlot === 'number' ? params.preferredSlot : slotByAxis[dominant];

  const passiveMap: Record<EvolutionAxis, string> = {
    aggressor: `+${8 + (seedInt % 12)}% Critical Strike Penetration & Boss Armor Shred`,
    tactician: `+${10 + (seedInt % 14)}% Gravity Vortex Pull & Cooldown Reduction`,
    guardian: `+${15 + (seedInt % 20)} HP Barrier Absorb & Party Damage Mitigation`,
    velocity: `+${12 + (seedInt % 15)}% Movement Tempo & Free Afterburner Reflex`,
    architect: `Summons Resonant Crystal Spire on Cast · +${8 + (seedInt % 10)}% World Sync`,
    abyssal: `+${14 + (seedInt % 16)}% Berserk Scaling Below 50% HP + Mana Leech`
  };

  const masteryRank: SkillMasteryRank =
    generation >= 5 || params.level >= 25
      ? 'Mythic Genesis'
      : generation >= 3 || params.level >= 15
      ? 'Transcendent'
      : generation >= 2 || params.level >= 8
      ? 'Ascendant'
      : 'Awakened';

  const comboMap: Record<EvolutionAxis, string> = {
    aggressor: '3-Hit Armor Sunder -> Vacuum Cleave -> Solar Execution',
    tactician: 'Leyline Tether -> Singularity Implosion -> Time-Lock',
    guardian: 'Sanctum Dome -> Reflective Counter -> Party Aegis Pulse',
    velocity: 'Mach Afterimage -> Triple Vortex Dash -> Lightning Finale',
    architect: 'Runic Pillar Drop -> Resonance Beam -> Terrain Fracture',
    abyssal: 'Void Tether -> Soul Leech Wave -> Eclipse Cataclysm'
  };

  return {
    skillId: `evolve-${dnaHash.toLowerCase()}`,
    editionTag: `1-OF-1 · #${dnaHash.slice(0, 4)}-${dnaHash.slice(4, 8)}`,
    dnaHash,
    name,
    slotIndex,
    generation,
    masteryRank,
    masteryLevel: Math.max(1, generation),
    comboChainText: comboMap[dominant],
    weaponSynergyBonus: 15 + (seedInt % 25),
    dominantAxis: dominant,
    secondaryAxis: secondary,
    effectType,
    secondaryEffect,
    biomeAffinity: params.biome,
    weatherCatalyst: params.weather,
    powerMultiplier,
    radius,
    manaCost,
    cooldownSec,
    fxColorHex: colorByAxis[dominant],
    particleCount: 22 + (seedInt % 22),
    passiveBonus: passiveMap[dominant],
    lineageNote: `Synthesized as ${params.playerClass} via ${dominant.toUpperCase()}+${secondary.toUpperCase()} divergence under ${params.biome.replace('_', ' ')} (${params.weather}) at Lv.${params.level}.`,
    createdAt: new Date().toISOString()
  };
}

export function synthesizeUniqueEvolvedClass(params: {
  baseClass: MmorpgClass;
  race: MmorpgRace;
  profile: EvolutionDnaProfile;
  level: number;
  biome: EnvironmentBiome;
  weather: WeatherMode;
  ascensionTier?: number;
  triggerFeat?: string;
}): EvolvedClassAscensionSpec {
  const axes: Array<[EvolutionAxis, number]> = [
    ['aggressor', params.profile.aggressor],
    ['tactician', params.profile.tactician],
    ['guardian', params.profile.guardian],
    ['velocity', params.profile.velocity],
    ['architect', params.profile.architect],
    ['abyssal', params.profile.abyssal]
  ];
  axes.sort((a, b) => b[1] - a[1]);
  const dominant = axes[0][0];
  const secondary = axes[1][0];
  const tier = Math.max(1, params.ascensionTier || 1);

  const raw = `CLASS_ASCENSION|${params.baseClass}|${params.race}|${dominant}|${secondary}|${params.biome}|${params.weather}|L${params.level}|T${tier}|${Date.now()}|${Math.random()}`;
  const dnaHash = fnv1aHex(raw) + fnv1aHex(raw.split('').reverse().join('')).slice(0, 4);
  const seedInt = parseInt(dnaHash.slice(0, 6), 16);

  const racePrefix: Record<MmorpgRace, string[]> = {
    'Valorian Human': ['Sovereign', 'High-Citadel', 'Imperator'],
    'Highborne Aether-Elf': ['Astral-Born', 'Quel’Vaelor', 'Star-Loom'],
    'Starforged Dwarf': ['Kazad-Sol', 'Titan-Anvil', 'Meteor-Forged'],
    'Draconic Vaelkori': ['Wyrmfire', 'Dragon-Crowned', 'Caldera-Sovereign'],
    'Sylvan Fae-Kin': ['World-Tree', 'Luminal-Grove', 'Emerald-Arch'],
    'Abyssal Nephilim': ['Seraph-Void', 'Eclipse-Winged', 'Nephilim']
  };

  const axisTitle: Record<EvolutionAxis, string[]> = {
    aggressor: ['God-Slayer', 'Cataclysm', 'Blood-Sun'],
    tactician: ['Singularity', 'Paradox', 'Omni-Loom'],
    guardian: ['Immortal-Aegis', 'Sanctuary', 'Unbreakable'],
    velocity: ['Lightstep', 'Tempest-Mach', 'Zephyr'],
    architect: ['World-Shaper', 'Runeforge', 'Genesis'],
    abyssal: ['Nether-Rift', 'Soul-Reaver', 'Oblivion']
  };

  const classCore: Record<MmorpgClass, string[]> = {
    'Vanguard Paladin': ['God-Templar', 'Solaris Justiciar', 'Aegis Highlord'],
    'Chronomancer Mage': ['Time-Weaver', 'Chrono-Archon', 'Astral Savant'],
    'Shadow Assassin': ['Phantom Executioner', 'Void-Stalker', 'Night-Sovereign'],
    'Sylvana Cleric': ['Hierophant of Eternity', 'Seraphic Oracle', 'Life-Weaver'],
    'Archon Summoner': ['Rift-Overlord', 'Primordial Caller', 'Soul-Architect'],
    'Runeforge Berserker': ['Titan-Breaker', 'Molten Warlord', 'Dread-Juggernaut']
  };

  const rList = racePrefix[params.race] || racePrefix['Valorian Human'];
  const aList = axisTitle[dominant];
  const cList = classCore[params.baseClass] || classCore['Vanguard Paladin'];

  const evolvedClassName = `${rList[seedInt % rList.length]} ${aList[(seedInt >> 3) % aList.length]} ${cList[(seedInt >> 6) % cList.length]}`;

  const wingsByAxis: Record<EvolutionAxis, CharacterWingsStyle> = {
    aggressor: 'draconic_wyrm',
    tactician: 'astral_light',
    guardian: 'seraphic_feathers',
    velocity: 'astral_light',
    architect: 'seraphic_feathers',
    abyssal: 'draconic_wyrm'
  };

  const auraColors: Record<EvolutionAxis, string> = {
    aggressor: '#f43f5e',
    tactician: '#38bdf8',
    guardian: '#10b981',
    velocity: '#f59e0b',
    architect: '#a855f7',
    abyssal: '#e879f9'
  };

  const featText =
    params.triggerFeat ||
    `Achieved ${dominant.toUpperCase()}+${secondary.toUpperCase()} behavioral mastery across ${params.biome.replace('_', ' ')} at Lv.${params.level}`;

  return {
    ascensionId: `ascend-${dnaHash.toLowerCase()}`,
    editionTag: `1-OF-1 CLASS · #${dnaHash.slice(0, 4)}-${dnaHash.slice(4, 8)}`,
    dnaHash,
    baseClass: params.baseClass,
    race: params.race,
    evolvedClassName,
    ascensionTier: tier,
    dominantAxis: dominant,
    secondaryAxis: secondary,
    triggerFeat: featText,
    classPassiveAura: `+${18 + tier * 6}% All Damage & Defense · Radiates "${evolvedClassName}" Sovereign Aura to nearby Party & NPCs`,
    skillResonanceEffect: `All 1-of-1 Evolved Skills gain +${22 + (seedInt % 18)}% radius & trigger a secondary ${secondary.toUpperCase()} shockwave`,
    statMultipliers: {
      hpMult: Math.round((1.25 + tier * 0.12) * 100) / 100,
      manaMult: Math.round((1.22 + tier * 0.1) * 100) / 100,
      damageMult: Math.round((1.3 + tier * 0.15) * 100) / 100,
      craftMasteryBonus: 5 + tier * 4
    },
    unlockedWings: wingsByAxis[dominant],
    auraColorHex: auraColors[dominant],
    createdAt: new Date().toISOString()
  };
}

export function synthesizeMasterworkCraftedItem(params: {
  crafterName: string;
  crafterId: string;
  crafterRole?: 'player' | 'ai_player' | 'ai_npc';
  crafterSkillLevel: number;
  crafterSpecialization: CrafterSpecialization;
  category: CraftedItemCategory;
  materialsUsed?: Partial<Record<ResourceMaterialId, number>>;
  biome: EnvironmentBiome;
  weather: WeatherMode;
  customName?: string;
  customInscription?: string;
}): CraftedItemSpec {
  const skillLv = Math.max(1, Math.min(999, Math.round(params.crafterSkillLevel || 1)));
  const mats: Partial<Record<ResourceMaterialId, number>> = params.materialsUsed || {
    aether_crystal: 2,
    star_titanium: 2
  };
  const totalMats = Object.values(mats).reduce((acc, v) => acc + (Number(v) || 0), 0) || 3;

  const rawSeed = `${params.crafterName}|${params.crafterId}|${params.crafterSpecialization}|${params.category}|L${skillLv}|${params.biome}|${params.weather}|${JSON.stringify(mats)}|${Date.now()}|${Math.random()}`;
  const sigHash = fnv1aHex(rawSeed) + fnv1aHex(rawSeed.split('').reverse().join('')).slice(0, 4);
  const seedInt = parseInt(sigHash.slice(0, 6), 16);

  const rarity: CraftedItemRarity =
    skillLv >= 25 || totalMats >= 8 || seedInt % 5 === 0
      ? '1-of-1 Sovereign'
      : skillLv >= 14 || totalMats >= 6
      ? 'Mythic'
      : skillLv >= 6 || totalMats >= 4
      ? 'Ascendant'
      : 'Masterwork';

  const prefixBySpec: Record<CrafterSpecialization, string[]> = {
    Bladesmith: ['Star-Sundered', 'Astral-Tempered', 'Edge-Sovereign', 'Solaris-Forged'],
    'Arcana Artificer': ['Chrono-Woven', 'Singularity-Etched', 'Leyline-Bound', 'Paradox-Spun'],
    Armorsmith: ['Aegis-Crowned', 'Titan-Plate', 'Immortal-Bastion', 'Citadel-Ward'],
    Alchemist: ['Luminal-Distilled', 'Ambrosia-Infused', 'Void-Nectar', 'Phoenix-Elixir'],
    'World Architect': ['Genesis-Pylon', 'Monolith-Heart', 'Terraform-Core', 'Sanctuary-Spire']
  };

  const baseNounByCategory: Record<CraftedItemCategory, string[]> = {
    weapon: ['Greatsword', 'Halberd of Resonance', 'Chrono-Blade', 'Archon Lance', 'Twin Void-Daggers'],
    armor: ['Sovereign Cuirass', 'Seraphic Regalia', 'Valkyrie Aegis Plate', 'Astral Mantle'],
    relic: ['Chronicle Astrolabe', 'Soul-Prism Signet', 'Heart of the Rift', 'Omni-Reliquary'],
    elixir: ['Draught of Ascension', 'Tidecaller Phial', 'Sovereign Clarity Tonic', 'Starblood Vial'],
    world_beacon: ['Sanctuary Resonator Obelisk', 'Leyline Forge Spire', 'Aetherion Citadel Beacon', 'Gravity Bastion Tower']
  };

  const pList = prefixBySpec[params.crafterSpecialization] || prefixBySpec.Bladesmith;
  const nList = baseNounByCategory[params.category] || baseNounByCategory.weapon;
  const generatedName = `${pList[seedInt % pList.length]} ${nList[(seedInt >> 3) % nList.length]} of ${params.crafterName.split(' ')[0]}`;
  const finalName = params.customName?.trim()
    ? params.customName.trim().slice(0, 80)
    : generatedName;

  const rarityMult =
    rarity === '1-of-1 Sovereign' ? 2.15 : rarity === 'Mythic' ? 1.65 : rarity === 'Ascendant' ? 1.32 : 1.1;
  const scale = rarityMult * (1 + skillLv * 0.055 + totalMats * 0.04);

  const stats: CraftedItemStats = {
    attackBonus:
      params.category === 'weapon'
        ? Math.round(65 * scale + (seedInt % 28))
        : params.category === 'relic'
        ? Math.round(35 * scale)
        : Math.round(18 * scale),
    defenseBonus:
      params.category === 'armor'
        ? Math.round(75 * scale + (seedInt % 30))
        : params.category === 'world_beacon'
        ? Math.round(50 * scale)
        : Math.round(20 * scale),
    manaRegenBonus:
      params.category === 'relic' || params.category === 'elixir'
        ? Math.round((4.5 * scale + (seedInt % 5)) * 10) / 10
        : Math.round(1.8 * scale * 10) / 10,
    critChancePct: Math.min(65, Math.round(8 + skillLv * 0.6 + (seedInt % 14))),
    speedBonusPct: Math.min(55, Math.round(6 + skillLv * 0.45 + (seedInt % 11))),
    skillPowerMult: Math.round((1.12 + (scale - 1) * 0.28) * 100) / 100
  };

  const uniqueTraitBySpec: Record<CrafterSpecialization, string> = {
    Bladesmith: `[${params.crafterName}'s Maker Mark] Every 3rd strike unleashes a ${Math.round(140 * rarityMult)}% ${params.biome.replace('_', ' ')} shockwave & shreds Boss Armor by ${12 + (seedInt % 14)}%`,
    'Arcana Artificer': `[${params.crafterName}'s Arcane Seal] Evolved 1-of-1 skills cost -${15 + (seedInt % 15)}% Mana and echo a secondary singularity pulse`,
    Armorsmith: `[${params.crafterName}'s Bulwark Temper] Grants ${Math.round(180 * rarityMult)} regenerating Aegis Ward & reflects ${18 + (seedInt % 16)}% raid damage`,
    Alchemist: `[${params.crafterName}'s Living Catalyst] Permanently infuses bloodstream with +${Math.round(stats.manaRegenBonus)} Mana/s & instant low-HP phoenix recovery`,
    'World Architect': `[${params.crafterName}'s World-Shaper Core] Anchors a live 3D Sanctuary Resonance Field boosting all nearby Players & AI Party DPS by +${16 + (seedInt % 18)}%`
  };

  const colorMap: Record<CrafterSpecialization, string> = {
    Bladesmith: '#f59e0b',
    'Arcana Artificer': '#38bdf8',
    Armorsmith: '#10b981',
    Alchemist: '#a855f7',
    'World Architect': '#f43f5e'
  };

  const structureKinds: ConceptStructureKind[] = [
    'crystal_cluster',
    'reactor_spire',
    'orbital_pylon',
    'habitat_dome',
    'skyscraper',
    'sandstone_arch'
  ];

  return {
    itemId: `craft-${sigHash.toLowerCase()}`,
    editionTag: `MAKER #${sigHash.slice(0, 4)}-${sigHash.slice(4, 8)}`,
    signatureHash: sigHash,
    name: finalName,
    category: params.category,
    rarity,
    crafterName: params.crafterName,
    crafterId: params.crafterId,
    crafterRole: params.crafterRole || 'player',
    crafterSkillLevel: skillLv,
    crafterSpecialization: params.crafterSpecialization,
    uniqueMakerTrait: uniqueTraitBySpec[params.crafterSpecialization],
    stats,
    materialsUsed: mats,
    biomeForgedIn: params.biome,
    weatherCatalyst: params.weather,
    fxColorHex: colorMap[params.crafterSpecialization],
    loreInscription:
      params.customInscription?.trim() ||
      `Hand-forged by ${params.crafterName} (Lv.${skillLv} ${params.crafterSpecialization}) during ${params.weather} over ${params.biome.replace('_', ' ')}. No two signatures in Aetherion can replicate its harmonic temper.`,
    bazaarPriceGold: Math.round(450 * scale + (seedInt % 250)),
    soughtByCount: 2 + Math.floor(skillLv / 4) + (seedInt % 7),
    spawnedStructureKind:
      params.category === 'world_beacon'
        ? structureKinds[seedInt % structureKinds.length]
        : undefined,
    createdAt: new Date().toISOString()
  };
}

export function createDefaultBazaarMasterworks(): CraftedItemSpec[] {
  return [
    synthesizeMasterworkCraftedItem({
      crafterName: 'Kaelen the Star-Smith',
      crafterId: 'npc-kaelen-smith',
      crafterRole: 'ai_npc',
      crafterSkillLevel: 38,
      crafterSpecialization: 'Bladesmith',
      category: 'weapon',
      materialsUsed: { star_titanium: 4, dragon_obsidian: 3, aether_crystal: 2 },
      biome: 'orbital_ringworld',
      weather: 'clear',
      customName: 'Solaris Edge · Kaelen’s 1-of-1 Sovereign Greatsword',
      customInscription: 'Tempered in orbital solar flares by Grandmaster Kaelen. Sought across every shard for its triple-cleave resonance.'
    }),
    synthesizeMasterworkCraftedItem({
      crafterName: 'Lyra-Chronos',
      crafterId: 'mmo-chronomancer',
      crafterRole: 'ai_player',
      crafterSkillLevel: 29,
      crafterSpecialization: 'Arcana Artificer',
      category: 'relic',
      materialsUsed: { chrono_essence: 4, aether_crystal: 3, celestial_silk: 2 },
      biome: 'alpine_archipelago',
      weather: 'rain',
      customName: 'Paradox Astrolabe of Infinite Horizons',
      customInscription: 'Woven by AI Adventurer Lyra-Chronos between raid pulls. Compresses evolved skill cooldowns and amplifies singularity radius.'
    }),
    synthesizeMasterworkCraftedItem({
      crafterName: 'Aegis-Paladin',
      crafterId: 'mmo-paladin',
      crafterRole: 'ai_player',
      crafterSkillLevel: 26,
      crafterSpecialization: 'Armorsmith',
      category: 'armor',
      materialsUsed: { star_titanium: 5, celestial_silk: 3 },
      biome: 'canyon_basin',
      weather: 'clear',
      customName: 'Immortal Bulwark of the First Vanguard',
      customInscription: 'Forged on the Citadel anvil by Aegis-Paladin. Radiates an unbreakable party ward.'
    })
  ];
}

export function triggerNextWorldLiveEvent(stepIndex: number = 0): WorldLiveEvent {
  const templates: Array<Omit<WorldLiveEvent, 'eventId' | 'startedAt'>> = [
    {
      title: 'Starforged Meteor Shower over the Archipelago',
      category: 'celestial_omen',
      loreSummary: 'Fragments of the shattered Astral Loom rain across the fjords, supercharging titanium veins and runic anvils.',
      worldEffectText: '+25% Starforged Titanium Yield · +15% Bladesmith Masterwork Potency',
      biomeShift: 'alpine_archipelago',
      weatherShift: 'clear',
      bonusMaterial: 'star_titanium',
      crafterQualityBoostPct: 15,
      bossPowerMod: 1.05
    },
    {
      title: 'Bioluminescent World-Tree Awakening',
      category: 'leyline_surge',
      loreSummary: 'Ancient Sylvan spores rise from the Abyssal Caverns, bathing the realm in healing emerald luminescence.',
      worldEffectText: '+30% Abyssal Bloom Harvest · +20% Mana Regeneration & Cleric/Alchemist Resonance',
      biomeShift: 'bioluminescent_abyss',
      weatherShift: 'spores',
      bonusMaterial: 'abyssal_herb',
      crafterQualityBoostPct: 18,
      bossPowerMod: 1.0
    },
    {
      title: 'Eclipse of the Draconic Caldera',
      category: 'draconic_awakening',
      loreSummary: 'Volcanic ash and wyrmfire vents erupt across the monoliths as ancient Vaelkori dragons test the realm’s champions.',
      worldEffectText: '+35% Dragonscale Obsidian Drop · Raid Boss Enraged (+20% Boss XP & Gold)',
      biomeShift: 'desert_monolith',
      weatherShift: 'ash',
      bonusMaterial: 'dragon_obsidian',
      crafterQualityBoostPct: 22,
      bossPowerMod: 1.2
    },
    {
      title: 'Grand Conclave of the Sovereign Crafters',
      category: 'artisan_conclave',
      loreSummary: 'Master Blacksmith Kaelen and the Six Houses open the Astral Vaults, magnifying the Maker Mark of every crafted item.',
      worldEffectText: '+28% 1-of-1 Sovereign Craft Chance · +2 Bonus Celestial Silk per Node',
      biomeShift: 'orbital_ringworld',
      weatherShift: 'clear',
      bonusMaterial: 'celestial_silk',
      crafterQualityBoostPct: 28,
      bossPowerMod: 1.1
    },
    {
      title: 'Chrono-Rift Tempest of the Neon Spire',
      category: 'rift_incursion',
      loreSummary: 'Temporal lightning fractures the sky, accelerating skill cooldowns and crystallizing pure Chrono-Rift Essence.',
      worldEffectText: '+30% Chrono Essence Yield · -15% Evolved Skill Cooldowns',
      biomeShift: 'cyber_metropolis',
      weatherShift: 'rain',
      bonusMaterial: 'chrono_essence',
      crafterQualityBoostPct: 20,
      bossPowerMod: 1.15
    }
  ];
  const chosen = templates[Math.abs(stepIndex) % templates.length];
  return {
    ...chosen,
    eventId: `wevt-${Date.now().toString(36)}-${Math.abs(stepIndex)}`,
    startedAt: new Date().toISOString()
  };
}

export function synthesizeNextStoryQuest(
  chapterNum: number,
  currentBiome: EnvironmentBiome = 'alpine_archipelago',
  currentWeather: WeatherMode = 'clear',
  continuityContext?: {
    activeEventTitle?: string;
    lastCraftedItemName?: string;
    lastCrafterName?: string;
  }
): StoryQuestStage {
  const ch = Math.max(1, Math.round(chapterNum || 1));
  const liveEvent = triggerNextWorldLiveEvent(ch);
  const biomes: EnvironmentBiome[] = [
    'alpine_archipelago',
    'bioluminescent_abyss',
    'cyber_metropolis',
    'orbital_ringworld',
    'desert_monolith',
    'canyon_basin'
  ];
  const weathers: WeatherMode[] = ['clear', 'rain', 'spores', 'ash', 'snow'];
  const structures: ConceptStructureKind[] = [
    'crystal_cluster',
    'reactor_spire',
    'orbital_pylon',
    'habitat_dome',
    'sandstone_arch',
    'skyscraper'
  ];
  const materials: ResourceMaterialId[] = [
    'aether_crystal',
    'star_titanium',
    'abyssal_herb',
    'chrono_essence',
    'dragon_obsidian',
    'celestial_silk'
  ];

  const objectiveOrder: StoryObjectiveType[] = [
    'gather',
    'craft',
    'slay_boss',
    'commune_npc',
    'reshape_world'
  ];
  const objectiveType = objectiveOrder[(ch - 1) % objectiveOrder.length];

  const nextBiome = biomes[ch % biomes.length];
  const nextWeather = weathers[(ch + 1) % weathers.length];
  const nextStruct = structures[ch % structures.length];
  const rewardMat = materials[ch % materials.length];

  const epochs = [
    'Dawn of the Leyline Awakening',
    'Convergence of the Sovereign Crafters',
    'The Bioluminescent Rift Tide',
    'Ascension of the Star-Ring Citadel',
    'Chronicle of the Eternal Forge',
    'Cataclysm of the Solaris Monoliths'
  ];
  const epochTitle = `Act ${ch} · ${epochs[(ch - 1) % epochs.length]}`;

  const questGivers = [
    { name: 'Arch-Chronicler Veylan', role: 'Lore Chronicler' },
    { name: 'Grandmaster Kaelen', role: 'Master Blacksmith' },
    { name: 'High Envoy Seraphina', role: 'Quest Giver' },
    { name: 'Warden Malakor', role: 'Dungeon Warden' }
  ];
  const giver = questGivers[(ch - 1) % questGivers.length];

  const eventPrefix = continuityContext?.activeEventTitle
    ? `Amidst "${continuityContext.activeEventTitle}", `
    : `As "${liveEvent.title}" unfolds across Aetherion, `;

  const craftContinuityNote = continuityContext?.lastCraftedItemName
    ? ` Inspired by ${continuityContext.lastCrafterName || 'the Artisan'}'s forging of "${continuityContext.lastCraftedItemName}", the realm's guilds demand new resonance.`
    : '';

  let title = '';
  let narrative = '';
  let target = 4;

  if (objectiveType === 'gather') {
    target = 4 + (ch % 4);
    title = `Harvest ${target} Leyline & Starforged Nodes Across ${currentBiome.replace('_', ' ')}`;
    narrative = `${eventPrefix}${giver.name} has detected a surge of raw ${RESOURCE_MATERIAL_META[rewardMat].label} crystallizing around the sanctuary beacons. Gather resources alongside AI adventurers to fuel the Sovereign Forge.${craftContinuityNote}`;
  } else if (objectiveType === 'craft') {
    target = 1;
    title = `Forge a Signature Masterwork Item at the Runeforge`;
    narrative = `${eventPrefix}travelers and AI guildmates are seeking a bespoke creation bearing your Crafter Maker Mark. Forge any Weapon, Armor, Relic, or World Beacon to etch your signature into Aetherion's living continuity.${craftContinuityNote}`;
  } else if (objectiveType === 'slay_boss') {
    target = 3;
    title = `Strike the Mythic Raid Boss & Unleash Evolved Skills`;
    narrative = `${eventPrefix}the rift guardian destabilizes the ${currentBiome.replace('_', ' ')} leylines. Coordinate with your AI Raid Party and land ${target} empowered strikes or evolved skill combos.${craftContinuityNote}`;
  } else if (objectiveType === 'commune_npc') {
    target = 2;
    title = `Commune with Living World NPCs & Fulfill Artisan Directives`;
    narrative = `${eventPrefix}seek out the stationed NPCs or harvest ${target} resonance nodes near their sanctuaries to unlock ancient crafting schematics and trigger the next world epoch.${craftContinuityNote}`;
  } else {
    target = 3;
    title = `Reshape the Realm · Catalyze the ${nextBiome.replace('_', ' ')} Shift`;
    narrative = `${eventPrefix}channel ${target} world-shaping actions (gathering, crafting, or skill evolutions) to permanently evolve the environment into ${nextBiome.replace('_', ' ')}.${craftContinuityNote}`;
  }

  return {
    questId: `quest-act-${ch}-${Date.now().toString(36)}`,
    chapterNum: ch,
    epochTitle,
    title,
    narrative,
    questGiverName: giver.name,
    questGiverRole: giver.role,
    objectiveType,
    progress: 0,
    target,
    rewardXp: 450 + ch * 180,
    rewardGold: 320 + ch * 140,
    rewardMaterial: rewardMat,
    rewardMaterialCount: 3 + (ch % 3),
    worldMutationOnClear: {
      biome: nextBiome,
      weather: nextWeather,
      sunElevationDeg: 14 + ((ch * 9) % 45),
      spawnStructureKind: nextStruct,
      spawnStructureLabel: `Act ${ch} Monument · ${epochs[(ch - 1) % epochs.length].split(' ').slice(-2).join(' ')}`
    }
  };
}

export type DungeonDifficultyTier =
  | 'novice'
  | 'intermediate'
  | 'expert'
  | 'epic_class_area'
  | 'legendary_class_area';

export interface DungeonRaidZoneSpec {
  id: string;
  index: number;
  name: string;
  tier: DungeonDifficultyTier;
  kind: 'Dungeon' | 'Raid' | 'Class Sanctuary';
  minLevel: number;
  recommendedClass: MmorpgClass | 'All Classes';
  biome: EnvironmentBiome;
  weather: WeatherMode;
  bossName: string;
  bossHp: number;
  primaryDropMaterial: ResourceMaterialId;
  structureKind: ConceptStructureKind;
  loreDescription: string;
}

const NOVICE_DUNGEON_DEFS: Array<[string, EnvironmentBiome, WeatherMode, string, ResourceMaterialId, ConceptStructureKind, string]> = [
  ['Whispering Leyline Grotto', 'alpine_archipelago', 'clear', 'Grotto Warden Vaelis', 'aether_crystal', 'crystal_cluster', 'Sunken tide-caverns where apprentice heroes attune their first leyline shards.'],
  ['Sunken Fjord Catacombs', 'alpine_archipelago', 'rain', 'Drowned Thane Orsik', 'star_titanium', 'sandstone_arch', 'Flooded burial halls of the ancient fjord-kings guarded by rusted runic sentinels.'],
  ['Canyon Watchtower Bastion', 'canyon_basin', 'clear', 'Captain Korrath the Fallen', 'star_titanium', 'reactor_spire', 'Wind-carved border fortress overlooking the lower skylanes of Valoria.'],
  ['Glimmer-Spore Burrows', 'bioluminescent_abyss', 'spores', 'Myconid Matriarch Lyraea', 'abyssal_herb', 'habitat_dome', 'Bioluminescent root-tunnels teeming with living alchemical spores.'],
  ['Rust-Iron Foundry Vaults', 'canyon_basin', 'ash', 'Slag-Golem Ignis-04', 'star_titanium', 'reactor_spire', 'Abandoned dwarven smelting pits where molten titanium still flows.'],
  ['Sun-Bleached Obelisk Tombs', 'desert_monolith', 'clear', 'Sand-Wraith Akheton', 'dragon_obsidian', 'sandstone_arch', 'Ancient solar obelisks half-buried beneath shifting golden dunes.'],
  ['Starlight Novice Cloister', 'orbital_ringworld', 'clear', 'Acolyte Construct Seraph-1', 'celestial_silk', 'orbital_pylon', 'Outer ringworld training sanctuary where Highborne initiates weave astral silk.'],
  ['Neon Under-Conduit', 'cyber_metropolis', 'rain', 'Overclocked Sentinel VX-9', 'chrono_essence', 'skyscraper', 'Sub-level mana-conduit tunnels pulsing with raw temporal static.'],
  ['Bramble-Heart Thicket', 'bioluminescent_abyss', 'spores', 'Thorn-Stag Oberon', 'abyssal_herb', 'crystal_cluster', 'Twisted sylvan grove where Fae-Kin druids test novice adventurers.'],
  ['Ember-Crag Quarry', 'desert_monolith', 'ash', 'Magma-Hound Cerberon', 'dragon_obsidian', 'sandstone_arch', 'Open volcanic quarry rich in unrefined dragonscale obsidian.'],
  ['Tidecaller Sea-Shrine', 'alpine_archipelago', 'rain', 'Siren-Queen Nerissa', 'aether_crystal', 'crystal_cluster', 'Coral-wrapped temple rising from the stormy archipelago shallows.'],
  ['Broken Astral Reliquary', 'orbital_ringworld', 'clear', 'Shard-Keeper Telos', 'celestial_silk', 'orbital_pylon', 'Fractured museum ofFirst-Sundering relics orbiting the upper meridian.'],
  ['Copper-Vein Delve', 'canyon_basin', 'clear', 'Delve-Overseer Grimgar', 'star_titanium', 'habitat_dome', 'Deep subterranean mine shafts echoing with pickaxe strikes and crystal hums.'],
  ['Frost-Mist Barrow', 'alpine_archipelago', 'snow', 'Barrow-Wight Hrothgar', 'aether_crystal', 'sandstone_arch', 'Glacial barrow-mounds shrouded in perpetual highland snow.'],
  ['Sanctuary Trial Grounds', 'canyon_basin', 'clear', 'Grand Instructor Valerius', 'celestial_silk', 'orbital_pylon', 'Proving arena at the gates of Aetherion Citadel for aspiring raiders.']
];

const INTERMEDIATE_DUNGEON_DEFS: Array<[string, EnvironmentBiome, WeatherMode, string, ResourceMaterialId, ConceptStructureKind, string]> = [
  ['Citadel of the Fractured Moon', 'orbital_ringworld', 'clear', 'Lunar Archon Selene', 'celestial_silk', 'orbital_pylon', 'Low-gravity lunar fortress where tidal leylines converge in silver arcs.'],
  ['Kazad-Sol Deep Heart-Forge', 'canyon_basin', 'ash', 'High Anvil-Lord Thrain', 'star_titanium', 'reactor_spire', 'The roaring subterranean capital forge of the Starforged Dwarves.'],
  ['Quel’Vaelor Star-Spire Raid', 'orbital_ringworld', 'clear', 'Star-Weaver Astrea', 'aether_crystal', 'skyscraper', 'Soaring crystalline towers of the Highborne Aether-Elves.'],
  ['Vaelkori Wyrmfire Caldera', 'desert_monolith', 'ash', 'Elder Wyrm Pyraxis', 'dragon_obsidian', 'sandstone_arch', 'Boiling lava crater where Draconic Vaelkori temper their war-blades.'],
  ['Sylvana World-Tree Canopy', 'bioluminescent_abyss', 'spores', 'Ancient Keeper Yggdran', 'abyssal_herb', 'habitat_dome', 'Mile-high bioluminescent boughs of the primeval World-Tree.'],
  ['Chronos Paradox Clocktower', 'cyber_metropolis', 'rain', 'Time-Eater Chronovore', 'chrono_essence', 'skyscraper', 'Gears of frozen lightning where time flows backward every third bell.'],
  ['Abyssal Trench of Leviathan', 'bioluminescent_abyss', 'rain', 'Trench-Leviathan Charybdis', 'abyssal_herb', 'crystal_cluster', 'Crushing deep-sea chasm lit only by predatory abyssal lure-crystals.'],
  ['Solaris Mirror-Desert Raid', 'desert_monolith', 'clear', 'Sun-Colossus Helios-Ra', 'dragon_obsidian', 'orbital_pylon', 'Blinding glass dunes formed by orbital solar-lance strikes.'],
  ['Glacier-Crown Fjord Keep', 'alpine_archipelago', 'snow', 'Frost-Jarl Skadi', 'aether_crystal', 'sandstone_arch', 'Ice-bound dreadnought fortress anchored between twin fjords.'],
  ['Nether-Rift Transit Hub', 'cyber_metropolis', 'rain', 'Void-Conductor Null-0', 'chrono_essence', 'reactor_spire', 'Interdimensional portal nexus overrun by rift anomalies.'],
  ['Obsidian Dragon-Roost', 'desert_monolith', 'ash', 'Brood-Matron Ignivara', 'dragon_obsidian', 'sandstone_arch', 'Jagged basalt spires where winged Vaelkori drakes guard their clutches.'],
  ['Seraphic Sky-Cathedral', 'orbital_ringworld', 'clear', 'Fallen Seraph Zephon', 'celestial_silk', 'orbital_pylon', 'Floating stained-glass cathedral suspended above the ringworld horizon.'],
  ['Fungal Under-Kingdom', 'bioluminescent_abyss', 'spores', 'Spore-Emperor Mycelion', 'abyssal_herb', 'habitat_dome', 'Vast subterranean metropolis carved into giant bioluminescent mushrooms.'],
  ['Storm-lashed Archipelago Raid', 'alpine_archipelago', 'rain', 'Tempest-Kraken Vaelstrom', 'aether_crystal', 'crystal_cluster', 'Chain of sinking islands battered by hurricane-force Gerstner waves.'],
  ['Runeforge Arsenal Vaults', 'canyon_basin', 'clear', 'living-Armor Automaton Rex', 'star_titanium', 'reactor_spire', 'Sealed vault containing animated masterwork weapons from Era I.'],
  ['Cyber-Leyline Core Grid', 'cyber_metropolis', 'clear', 'Grid-Overmind Teslar', 'chrono_essence', 'skyscraper', 'High-voltage leyline capacitor matrix powering the neon spires.'],
  ['Crimson Canyon Blood-Arena', 'canyon_basin', 'ash', 'Champion Blood-Tusk', 'dragon_obsidian', 'sandstone_arch', 'Gladiatorial canyon amphitheater where Aggressor DNA surges.'],
  ['Astral Loom Weave-Chamber', 'orbital_ringworld', 'clear', 'Loom-Guardian Atropos', 'celestial_silk', 'orbital_pylon', 'Sacred chamber where threads of celestial silk hold reality together.'],
  ['Frozen Leyline Observatory', 'alpine_archipelago', 'snow', 'Stargazer Borealis', 'aether_crystal', 'habitat_dome', 'High-altitude telescope dome encased in enchanted rime-ice.'],
  ['Molten Titanium Cistern', 'canyon_basin', 'ash', 'Crucible-Titan Volcanus', 'star_titanium', 'reactor_spire', 'Giant suspended cauldrons pouring liquid star-metal into runic molds.'],
  ['Shadow-Step Night Bazaar', 'cyber_metropolis', 'rain', 'Guildmaster Vexia', 'chrono_essence', 'skyscraper', 'Rooftop labyrinth ruled by rogue Shadow Assassins and black-market smiths.'],
  ['Emerald Lotus Sanctuary', 'bioluminescent_abyss', 'spores', 'HierophantSylvaris', 'abyssal_herb', 'crystal_cluster', 'Tranquil healing lagoons guarded by awakened floral colossi.'],
  ['Sandstone Monolith Labyrinth', 'desert_monolith', 'clear', 'Sphinx-Arbiter Ankhera', 'dragon_obsidian', 'sandstone_arch', 'Shifting maze of 200-foot carved monoliths that rearrange on every boss roar.'],
  ['Star-Fall Crater Excavation', 'orbital_ringworld', 'ash', 'Meteor-Behemoth Astraeus', 'star_titanium', 'crystal_cluster', 'Impact crater where a fallen star-core radiates intense gravitational pull.'],
  ['Twilight Nephilim Bastion', 'canyon_basin', 'rain', 'Dual-Winged Archon Malphas', 'celestial_silk', 'orbital_pylon', 'Fortress balanced on the razor edge between solar light and abyssal shadow.'],
  ['Sovereign Guild Hall Raid', 'alpine_archipelago', 'clear', 'Grand Marshal Aurelius', 'star_titanium', 'habitat_dome', 'Trial raid where veteran guilds test their crafted masterwork gear against the Marshal.']
];

const EXPERT_RAID_DEFS: Array<[string, EnvironmentBiome, WeatherMode, string, ResourceMaterialId, ConceptStructureKind, string]> = [
  ['Throne of the First Sundering (Expert Raid)', 'orbital_ringworld', 'clear', 'Primordial Titan Malakor', 'celestial_silk', 'orbital_pylon', 'The shattered epicenter of the Astral Loom where Malakor’sVoid-Cleaver still cleaves space-time.'],
  ['Abyssal Heart of the World-Serpent (Expert Raid)', 'bioluminescent_abyss', 'spores', 'World-Serpent Jormun-Vael', 'abyssal_herb', 'crystal_cluster', 'The deepest bioluminescent abyss where the mile-long World-Serpent coils around the planet core.'],
  ['Cataclysm of Kazad-Sol’s Core (Expert Raid)', 'desert_monolith', 'ash', 'Omega-Forge Dragon Ignis-Prime', 'dragon_obsidian', 'reactor_spire', 'Super-heated planetary mantle forge where only Mythic-geared parties survive the thermal pulses.'],
  ['Singularity Nexus of Infinite Time (Expert Raid)', 'cyber_metropolis', 'rain', 'Paradox-Emperor Kairos-Omega', 'chrono_essence', 'skyscraper', 'Collapsed temporal singularity where past, present, and future raid phases happen simultaneously.'],
  ['Maelstrom of the Sunken Gods (Expert Raid)', 'alpine_archipelago', 'snow', 'Elder Leviathan Okeanos', 'aether_crystal', 'sandstone_arch', 'Colossal whirlpool at the edge of the world where 40-foot ocean swells crash over ancient god-statues.']
];

const EPIC_CLASS_AREA_DEFS: Array<[string, MmorpgClass, EnvironmentBiome, WeatherMode, string, ResourceMaterialId, ConceptStructureKind, string]> = [
  [
    'Sanctum of the Solaris Vanguard (Epic Class Sanctuary)',
    'Vanguard Paladin',
    'orbital_ringworld',
    'clear',
    'Solaris Avatar Hyperion',
    'star_titanium',
    'orbital_pylon',
    'Epic Class Sanctuary for Paladins & Clerics: bathes heroes in golden solar radiance, doubling Guardian & Aggressor class ascension progress.'
  ],
  [
    'Conclave of the Astral Chronosphere (Epic Class Sanctuary)',
    'Chronomancer Mage',
    'cyber_metropolis',
    'rain',
    'Arch-Savant Chronos-Zero',
    'chrono_essence',
    'skyscraper',
    'Epic Class Sanctuary for Chronomancers & Summoners: suspended time-spheres amplify Tactician & Architect DNA and unlock 1-of-1 spell weavers.'
  ],
  [
    'Shadow-Forge of the Crimson Eclipse (Epic Class Sanctuary)',
    'Shadow Assassin',
    'desert_monolith',
    'ash',
    'Eclipse-Lord Nocturne',
    'dragon_obsidian',
    'reactor_spire',
    'Epic Class Sanctuary for Assassins & Berserkers: volcanic shadow-vents supercharge Velocity & Abyssal DNA for lethal 1-of-1 class evolutions.'
  ]
];

const LEGENDARY_CLASS_AREA_DEFS: Array<[string, MmorpgClass | 'All Classes', EnvironmentBiome, WeatherMode, string, ResourceMaterialId, ConceptStructureKind, string]> = [
  [
    'The Sovereign Genesis Anvil of Aetherion (Legendary Class Realm)',
    'All Classes',
    'orbital_ringworld',
    'clear',
    'All-Father of the Forge · Aetherion Prime',
    'star_titanium',
    'orbital_pylon',
    'Legendary Class Area #1: The mythic origin anvil where Crafters and Raid Champions fuse 1-of-1 Sovereign Weapons directly into their Class Soul.'
  ],
  [
    'Eternity’s Horizon · Throne of the Six Bloodlines (Legendary Class Realm)',
    'All Classes',
    'bioluminescent_abyss',
    'spores',
    'Sovereign Convergence Avatar',
    'celestial_silk',
    'crystal_cluster',
    'Legendary Class Area #2: Where all six bloodlines and classes transcend mortality, unlocking Mythic Genesis 1-of-1 Class Ascensions and eternal world monuments.'
  ]
];

export const AETHERION_DUNGEONS_AND_RAIDS_ATLAS: DungeonRaidZoneSpec[] = [
  ...NOVICE_DUNGEON_DEFS.map(([name, biome, weather, bossName, mat, struct, lore], i): DungeonRaidZoneSpec => ({
    id: `novice-${i + 1}`,
    index: i + 1,
    name,
    tier: 'novice',
    kind: i % 4 === 0 ? 'Raid' : 'Dungeon',
    minLevel: 1 + i,
    recommendedClass: 'All Classes',
    biome,
    weather,
    bossName,
    bossHp: 1800 + i * 280,
    primaryDropMaterial: mat,
    structureKind: struct,
    loreDescription: lore
  })),
  ...INTERMEDIATE_DUNGEON_DEFS.map(([name, biome, weather, bossName, mat, struct, lore], i): DungeonRaidZoneSpec => ({
    id: `intermediate-${i + 1}`,
    index: i + 1,
    name,
    tier: 'intermediate',
    kind: i % 3 === 0 ? 'Raid' : 'Dungeon',
    minLevel: 18 + i * 2,
    recommendedClass: 'All Classes',
    biome,
    weather,
    bossName,
    bossHp: 6500 + i * 650,
    primaryDropMaterial: mat,
    structureKind: struct,
    loreDescription: lore
  })),
  ...EXPERT_RAID_DEFS.map(([name, biome, weather, bossName, mat, struct, lore], i): DungeonRaidZoneSpec => ({
    id: `expert-${i + 1}`,
    index: i + 1,
    name,
    tier: 'expert',
    kind: 'Raid',
    minLevel: 72 + i * 4,
    recommendedClass: 'All Classes',
    biome,
    weather,
    bossName,
    bossHp: 28000 + i * 6000,
    primaryDropMaterial: mat,
    structureKind: struct,
    loreDescription: lore
  })),
  ...EPIC_CLASS_AREA_DEFS.map(([name, recClass, biome, weather, bossName, mat, struct, lore], i): DungeonRaidZoneSpec => ({
    id: `epic-class-${i + 1}`,
    index: i + 1,
    name,
    tier: 'epic_class_area',
    kind: 'Class Sanctuary',
    minLevel: 85 + i * 3,
    recommendedClass: recClass,
    biome,
    weather,
    bossName,
    bossHp: 55000 + i * 8000,
    primaryDropMaterial: mat,
    structureKind: struct,
    loreDescription: lore
  })),
  ...LEGENDARY_CLASS_AREA_DEFS.map(([name, recClass, biome, weather, bossName, mat, struct, lore], i): DungeonRaidZoneSpec => ({
    id: `legendary-class-${i + 1}`,
    index: i + 1,
    name,
    tier: 'legendary_class_area',
    kind: 'Class Sanctuary',
    minLevel: 95 + i * 5,
    recommendedClass: recClass,
    biome,
    weather,
    bossName,
    bossHp: 95000 + i * 25000,
    primaryDropMaterial: mat,
    structureKind: struct,
    loreDescription: lore
  }))
];

export interface GuildTerritorySpec {
  territoryId: string;
  name: string;
  biome: EnvironmentBiome;
  occupyingGuildName: string;
  taxRatePct: number;
  defenseHp: number;
  maxDefenseHp: number;
  resourcesPerMinute: ResourceMaterialId;
}

export interface AlchemyRecipeSpec {
  recipeId: string;
  name: string;
  ingredients: Partial<Record<ResourceMaterialId, number>>;
  elixirName: string;
  permanentStatBoost: string;
  statMultiplierBonus: number;
}

export interface NpcReputationRecord {
  npcId: string;
  name: string;
  role: string;
  sentiment: 'Friendly' | 'Neutral' | 'Hostile' | 'Venerated';
  playerDeedsCount: number;
  lastDialogue: string;
}

export const AETHERION_GUILD_TERRITORIES: GuildTerritorySpec[] = [
  { territoryId: 'terr-1', name: 'Aether Citadel Bastion', biome: 'canyon_basin', occupyingGuildName: 'Sovereign Vanguard', taxRatePct: 5, defenseHp: 15000, maxDefenseHp: 15000, resourcesPerMinute: 'aether_crystal' },
  { territoryId: 'terr-2', name: 'Star-Forge of Kazad-Sol', biome: 'orbital_ringworld', occupyingGuildName: 'Starforged Hammer', taxRatePct: 8, defenseHp: 22000, maxDefenseHp: 22000, resourcesPerMinute: 'star_titanium' },
  { territoryId: 'terr-3', name: 'Bioluminescent Spore Core', biome: 'bioluminescent_abyss', occupyingGuildName: 'Sylvan Weaver', taxRatePct: 4, defenseHp: 12000, maxDefenseHp: 12000, resourcesPerMinute: 'abyssal_herb' },
  { territoryId: 'terr-4', name: 'Chrono-Rift Spire', biome: 'cyber_metropolis', occupyingGuildName: 'Temporal Vanguard', taxRatePct: 10, defenseHp: 18000, maxDefenseHp: 18000, resourcesPerMinute: 'chrono_essence' }
];

export const AETHERION_ALCHEMY_RECIPES: AlchemyRecipeSpec[] = [
  { recipeId: 'alc-1', name: 'Elixir of Aetherial Awakening', ingredients: { aether_crystal: 5, abyssal_herb: 3 }, elixirName: 'Awakened Aether Draught', permanentStatBoost: '+15% Mana Regen & +10% Skill Radius', statMultiplierBonus: 1.15 },
  { recipeId: 'alc-2', name: 'Titanium Blood Infusion', ingredients: { star_titanium: 4, dragon_obsidian: 2 }, elixirName: 'Titanium Blood Extract', permanentStatBoost: '+20% Armor Defense & +12% Boss Cleave', statMultiplierBonus: 1.20 },
  { recipeId: 'alc-3', name: 'Chrono-Astrological Philtre', ingredients: { chrono_essence: 3, celestial_silk: 3 }, elixirName: 'Chrono-Astrological Philtre', permanentStatBoost: '-15% Cooldowns & +25% XP Gain', statMultiplierBonus: 1.25 }
];

export interface LivingProvinceSpec {
  provinceId: string;
  name: string;
  continent: string;
  biome: EnvironmentBiome;
  climate: string;
  merchantCaravanActive: boolean;
  monsterHordeThreatPct: number;
  activeEconomicExport: ResourceMaterialId;
}

export interface MythicDelveSpec {
  delveId: string;
  title: string;
  tierLevel: number;
  affixName: string;
  affixDescription: string;
  bossName: string;
  bossHp: number;
  recommendedPower: number;
  legendaryLootReward: string;
}

export const AETHERION_LIVING_PROVINCES: LivingProvinceSpec[] = [
  { provinceId: 'prov-1', name: 'Valorian Capital Reach', continent: 'Valoria', biome: 'canyon_basin', climate: 'Temperate Sun', merchantCaravanActive: true, monsterHordeThreatPct: 12, activeEconomicExport: 'aether_crystal' },
  { provinceId: 'prov-2', name: 'Highborne Starlight Canopies', continent: 'Aetheria', biome: 'orbital_ringworld', climate: 'Astral Aurora', merchantCaravanActive: true, monsterHordeThreatPct: 8, activeEconomicExport: 'celestial_silk' },
  { provinceId: 'prov-3', name: 'Kazad-Sol Deep Forges', continent: 'Durmoth', biome: 'orbital_ringworld', climate: 'Magma Glow', merchantCaravanActive: false, monsterHordeThreatPct: 45, activeEconomicExport: 'star_titanium' },
  { provinceId: 'prov-4', name: 'Vaelkori Dragon-Sands', continent: 'Pyrrhia', biome: 'desert_monolith', climate: 'Scorching Sirocco', merchantCaravanActive: true, monsterHordeThreatPct: 62, activeEconomicExport: 'dragon_obsidian' },
  { provinceId: 'prov-5', name: 'Sylvan Fae Groves', continent: 'Viridia', biome: 'bioluminescent_abyss', climate: 'Eternal Spore Mist', merchantCaravanActive: true, monsterHordeThreatPct: 18, activeEconomicExport: 'abyssal_herb' },
  { provinceId: 'prov-6', name: 'Nephilim Abyssal Rifts', continent: 'Noxis', biome: 'cyber_metropolis', climate: 'Temporal Storm', merchantCaravanActive: false, monsterHordeThreatPct: 88, activeEconomicExport: 'chrono_essence' }
];

export function synthesizeMythicDelve(tierLevel: number = 10, seedStr: string = 'delve'): MythicDelveSpec {
  const affixes = [
    { name: 'Void-Touched', desc: 'Enemies inflict stacking shadow corruption and drain mana on hit.' },
    { name: 'Chrono-Corrupted', desc: 'Boss ability cooldowns accelerated by 35% with temporal stutter.' },
    { name: 'Titan-Forged Armor', desc: 'Boss gains 40% hardened obsidian shield that shatters into explosive shards.' },
    { name: 'Leyline Surge', desc: 'All elemental spell damages increased by 50% for both heroes and bosses.' }
  ];
  const bossNames = [
    'Malakor, The Shattered Primordial',
    'Vespera, Sovereign of the Eclipse Veil',
    'Gorgorath, Titan of the Obsidian Core',
    'Chronos-X, The Temporal Abomination'
  ];
  const lootRewards = [
    'Sovereign Mythic Greataxe of the World-Loom',
    'Astral Weave Robes of Eternity',
    'Dragonscale Aegis of the Wyrm King',
    'Chrono-Singularity Reliquary of Epochs'
  ];

  const affix = affixes[tierLevel % affixes.length];
  const bName = bossNames[tierLevel % bossNames.length];
  const loot = lootRewards[tierLevel % lootRewards.length];

  return {
    delveId: `delve-${tierLevel}-${Math.random().toString(36).slice(2, 6)}`,
    title: `Mythic Delve Tier ${tierLevel} · ${affix.name}`,
    tierLevel,
    affixName: affix.name,
    affixDescription: affix.desc,
    bossName: bName,
    bossHp: 15000 + tierLevel * 8500,
    recommendedPower: 100 + tierLevel * 75,
    legendaryLootReward: loot
  };
}





