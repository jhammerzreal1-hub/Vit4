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
import type {
  ConceptStructureKind,
  DetectedGameEngineType,
  DetectedGameRecord,
  EngineToolCategory,
  EnvironmentBiome,
  ProceduralEngineToolSpec,
  RenderPipelineConfig,
  SpatialPhysicsConfig,
  WeatherMode
} from '../components/three/spatialEngineTypes';
import { BIOME_PRESET_DEFAULTS, inferBiomeFromPrompt, inferWeatherFromPrompt } from '../components/three/spatialEngineTypes';

export interface SpatialModBridge {
  dispatchLiveMod: (params: {
    sourceAgent: string;
    gameId: string;
    gameTitle: string;
    godMode?: boolean;
    timeScale?: number;
    gravity?: number;
    speedScale?: number;
    biome?: EnvironmentBiome;
    weather?: WeatherMode;
    bloomStrength?: number;
    spawnEntityKind?: string;
    spawnCount?: number;
    modSummary: string;
  }) => void;
  dispatchForgedTool: (tool: ProceduralEngineToolSpec) => void;
}

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.cache',
  'android',
  'Pods',
  '__pycache__',
  'Library',
  'Temp'
]);

const detectedGamesMap = new Map<string, DetectedGameRecord>();
const forgedEngineTools: ProceduralEngineToolSpec[] = [];

function ensureBuiltinSpatialRegistered(): DetectedGameRecord {
  const key = 'builtin://aegis-hyperion-spatial-engine';
  const existing = detectedGamesMap.get(key);
  if (existing) return existing;

  const now = new Date().toISOString();
  const record: DetectedGameRecord = {
    gameId: 'aegis-spatial-engine',
    gameKey: key,
    title: 'Aegis Hyperion · Resident 3D Spatial Engine',
    engine: 'threejs',
    sourcePath: 'src/components/three/SpatialArenaModule.tsx',
    status: 'HOOKED',
    modCount: 0,
    capabilities: [
      'physics_override',
      'biome_resculpt',
      'shader_postfx_bloom',
      'weather_injection',
      'entity_spawning',
      'multi_agent_pilot',
      'god_mode',
      'procedural_tool_forge'
    ],
    runtimeHook: 'hybrid',
    modState: {
      godMode: false,
      timeScale: 1.0,
      gravity: 9.8,
      speedScale: 1.0,
      biome: 'canyon_basin',
      weather: 'clear',
      bloomStrength: 0.42,
      activeMods: []
    },
    detectedAt: now,
    updatedAt: now
  };
  detectedGamesMap.set(key, record);
  return record;
}

ensureBuiltinSpatialRegistered();

function makeGameId(gameKey: string): string {
  const slug = gameKey
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return slug || `game-${Date.now().toString(36)}`;
}

function capabilitiesForEngine(engine: DetectedGameEngineType): string[] {
  switch (engine) {
    case 'threejs':
      return ['physics_override', 'shader_postfx_bloom', 'biome_resculpt', 'entity_spawning', 'multi_agent_pilot', 'god_mode'];
    case 'godot':
      return ['gdscript_autoload_hook', 'physics_gravity_override', 'scene_node_injector', 'time_scale_control'];
    case 'unity':
      return ['csharp_monobehaviour_hook', 'timescale_override', 'rigidbody_physics_patch', 'prefab_spawner'];
    case 'unreal':
      return ['ini_cvar_override', 'postprocess_bloom_patch', 'gravity_worldsettings'];
    case 'minecraft':
      return ['datapack_mod_bridge', 'gamerule_mutator', 'entity_summoner'];
    case 'phaser':
    case 'html5_canvas':
      return ['raf_timescale_hook', 'canvas_overlay_bridge', 'arcade_physics_patch'];
    case 'pygame':
      return ['python_runtime_monkeypatch', 'clock_fps_override', 'sprite_injector'];
    case 'love2d':
      return ['lua_update_hook', 'physics_meter_override', 'shader_fx'];
    default:
      return ['manifest_override', 'physics_override', 'script_injection'];
  }
}

function readSmallText(filePath: string, maxBytes = 24_000): string {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile() || stat.size > 512_000) return '';
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(Math.min(maxBytes, stat.size));
    fs.readSync(fd, buf, 0, buf.length, 0);
    fs.closeSync(fd);
    return buf.toString('utf8');
  } catch {
    return '';
  }
}

export function scanGamesOnDisk(options: { paths?: string[]; maxDepth?: number } = {}): DetectedGameRecord[] {
  ensureBuiltinSpatialRegistered();

  const workspaceRoot = process.cwd();
  const candidateRoots = (
    Array.isArray(options.paths) && options.paths.length > 0
      ? options.paths
      : [
          path.join(workspaceRoot, 'src'),
          path.join(workspaceRoot, 'projects'),
          path.join(workspaceRoot, 'games')
        ]
  )
    .map((p) => path.resolve(p))
    .filter((p) => {
      try {
        return fs.existsSync(p) && fs.statSync(p).isDirectory();
      } catch {
        return false;
      }
    });

  const maxDepth = Math.max(1, Math.min(5, options.maxDepth ?? 4));
  let entriesVisited = 0;
  const maxEntries = 2400;

  const registerFound = (
    gameKey: string,
    title: string,
    engine: DetectedGameEngineType,
    sourcePath: string,
    runtimeHook: DetectedGameRecord['runtimeHook']
  ) => {
    const now = new Date().toISOString();
    const prev = detectedGamesMap.get(gameKey);
    if (prev) {
      prev.updatedAt = now;
      prev.sourcePath = sourcePath;
      return;
    }
    detectedGamesMap.set(gameKey, {
      gameId: makeGameId(title + '-' + engine),
      gameKey,
      title,
      engine,
      sourcePath,
      status: runtimeHook === 'filesystem_script' ? 'DETECTED' : 'HOOKED',
      modCount: 0,
      capabilities: capabilitiesForEngine(engine),
      runtimeHook,
      modState: {
        godMode: false,
        timeScale: 1.0,
        gravity: 9.8,
        speedScale: 1.0,
        activeMods: []
      },
      detectedAt: now,
      updatedAt: now
    });
  };

  const walk = (dir: string, depth: number) => {
    if (depth > maxDepth || entriesVisited >= maxEntries) return;
    let items: fs.Dirent[] = [];
    try {
      items = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    const fileNames = new Set(items.filter((d) => d.isFile()).map((d) => d.name));
    const relDir = path.relative(workspaceRoot, dir) || dir;

    // 1. Godot project signature
    if (fileNames.has('project.godot')) {
      const text = readSmallText(path.join(dir, 'project.godot'));
      const m = text.match(/config\/name="([^"]+)"/);
      const title = m ? m[1] : path.basename(dir);
      registerFound(`fs://${dir}#godot`, `${title} (Godot)`, 'godot', relDir, 'filesystem_script');
    }

    // 2. Unity signature
    if (dir.endsWith('ProjectSettings') && fileNames.has('ProjectVersion.txt')) {
      const projectDir = path.dirname(dir);
      const relProj = path.relative(workspaceRoot, projectDir) || projectDir;
      registerFound(`fs://${projectDir}#unity`, `${path.basename(projectDir)} (Unity)`, 'unity', relProj, 'filesystem_script');
    }

    // 3. Minecraft Mod signature
    if (fileNames.has('fabric.mod.json') || fileNames.has('mods.toml') || fileNames.has('mcmod.info')) {
      registerFound(`fs://${dir}#minecraft`, `${path.basename(dir)} (Minecraft Mod)`, 'minecraft', relDir, 'filesystem_script');
    }

    // 4. Love2D signature
    if (fileNames.has('conf.lua') && fileNames.has('main.lua')) {
      registerFound(`fs://${dir}#love2d`, `${path.basename(dir)} (LÖVE 2D)`, 'love2d', relDir, 'filesystem_script');
    }

    for (const entry of items) {
      if (entriesVisited >= maxEntries) break;
      entriesVisited++;

      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
          walk(path.join(dir, entry.name), depth + 1);
        }
        continue;
      }

      const fullPath = path.join(dir, entry.name);
      const relFile = path.relative(workspaceRoot, fullPath) || fullPath;

      if (entry.name.endsWith('.uproject')) {
        registerFound(`fs://${fullPath}#unreal`, `${entry.name.replace('.uproject', '')} (Unreal Engine)`, 'unreal', relFile, 'filesystem_script');
      } else if (entry.name.endsWith('.py')) {
        const snippet = readSmallText(fullPath, 6000);
        if (/import\s+pygame\b|pygame\.init\s*\(/.test(snippet)) {
          registerFound(`fs://${fullPath}#pygame`, `${path.basename(entry.name, '.py')} (Pygame)`, 'pygame', relFile, 'filesystem_script');
        }
      } else if (
        (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts') || entry.name.endsWith('.js') || entry.name.endsWith('.html')) &&
        !entry.name.endsWith('.d.ts') &&
        !entry.name.includes('sceneMaterials') &&
        !entry.name.includes('proceduralModels') &&
        !entry.name.includes('spatialEngineTypes') &&
        !entry.name.includes('gameModEngine')
      ) {
        const snippet = readSmallText(fullPath, 8000);
        if (/new\s+Phaser\.Game\b|from\s+['"]phaser['"]/.test(snippet)) {
          registerFound(`fs://${fullPath}#phaser`, `${path.basename(entry.name)} (Phaser)`, 'phaser', relFile, 'hybrid');
        } else if (
          /SpatialArenaModule/.test(entry.name) ||
          (/new\s+THREE\.WebGLRenderer\b/.test(snippet) && !fullPath.includes('SpatialArenaModule.tsx'))
        ) {
          registerFound(
            fullPath.includes('SpatialArenaModule.tsx') ? 'builtin://aegis-hyperion-spatial-engine' : `fs://${fullPath}#threejs`,
            fullPath.includes('SpatialArenaModule.tsx') ? 'Aegis Hyperion · Resident 3D Spatial Engine' : `${path.basename(entry.name)} (Three.js)`,
            'threejs',
            relFile,
            'hybrid'
          );
        } else if (/requestAnimationFrame/.test(snippet) && /getContext\(['"]2d['"]\)|<canvas/i.test(snippet)) {
          registerFound(`fs://${fullPath}#canvas`, `${path.basename(entry.name)} (HTML5 Canvas Game)`, 'html5_canvas', relFile, 'canvas_dom');
        }
      }
    }
  };

  for (const rootDir of candidateRoots) {
    walk(rootDir, 0);
  }

  return getDetectedGames();
}

export function registerRuntimeGames(
  games: Array<{
    gameKey?: string;
    title: string;
    engine?: DetectedGameEngineType;
    sourcePath?: string;
    capabilities?: string[];
  }>
): DetectedGameRecord[] {
  ensureBuiltinSpatialRegistered();
  const now = new Date().toISOString();

  for (const item of games) {
    if (!item?.title) continue;
    const engine: DetectedGameEngineType = item.engine || 'html5_canvas';
    const gameKey = item.gameKey || `runtime://${item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const prev = detectedGamesMap.get(gameKey);
    if (prev) {
      prev.updatedAt = now;
      if (Array.isArray(item.capabilities) && item.capabilities.length > 0) {
        prev.capabilities = Array.from(new Set([...prev.capabilities, ...item.capabilities]));
      }
      continue;
    }

    detectedGamesMap.set(gameKey, {
      gameId: makeGameId(item.title),
      gameKey,
      title: String(item.title).slice(0, 128),
      engine,
      sourcePath: String(item.sourcePath || 'browser://live-dom').slice(0, 512),
      status: 'HOOKED',
      modCount: 0,
      capabilities: item.capabilities && item.capabilities.length > 0 ? item.capabilities : capabilitiesForEngine(engine),
      runtimeHook: gameKey.includes('aegis') ? 'hybrid' : 'canvas_dom',
      modState: {
        godMode: false,
        timeScale: 1.0,
        gravity: 9.8,
        speedScale: 1.0,
        activeMods: []
      },
      detectedAt: now,
      updatedAt: now
    });
  }

  return getDetectedGames();
}

export function getDetectedGames(): DetectedGameRecord[] {
  ensureBuiltinSpatialRegistered();
  return Array.from(detectedGamesMap.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getForgedEngineTools(): ProceduralEngineToolSpec[] {
  return [...forgedEngineTools];
}

function generateEngineModScript(game: DetectedGameRecord, modSummary: string): { filename: string; content: string } {
  const safeClass = game.title.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24) || 'GameMod';
  switch (game.engine) {
    case 'godot':
      return {
        filename: 'aurelius_mod_autoload.gd',
        content: `extends Node
# Autonomous Mod generated for ${game.title}
# Summary: ${modSummary}

var god_mode: bool = ${game.modState.godMode}
var time_scale: float = ${game.modState.timeScale}
var gravity_override: float = ${game.modState.gravity}

func _ready() -> void:
\tEngine.time_scale = time_scale
\tProjectSettings.set_setting("physics/3d/default_gravity", gravity_override)
\tprint("[Lysander Mod] Hooked ${game.title}: ", "${modSummary.replace(/"/g, "'")}")
`
      };
    case 'unity':
      return {
        filename: `Aurelius${safeClass}Mod.cs`,
        content: `using UnityEngine;

// Autonomous Mod generated for ${game.title}
// Summary: ${modSummary}
public class Aurelius${safeClass}Mod : MonoBehaviour
{
    public bool godMode = ${game.modState.godMode ? 'true' : 'false'};
    public float timeScale = ${game.modState.timeScale}f;
    public float gravityY = -${Math.abs(game.modState.gravity)}f;

    void Awake()
    {
        Time.timeScale = timeScale;
        Physics.gravity = new Vector3(0f, gravityY, 0f);
        Debug.Log("[Lysander Mod] Applied autonomous runtime overrides.");
    }
}
`
      };
    case 'pygame':
      return {
        filename: 'aurelius_pygame_mod.py',
        content: `# Autonomous Pygame Mod for ${game.title}
# Summary: ${modSummary}
MOD_CONFIG = {
    "god_mode": ${game.modState.godMode ? 'True' : 'False'},
    "time_scale": ${game.modState.timeScale},
    "gravity": ${game.modState.gravity},
    "speed_scale": ${game.modState.speedScale},
}

def apply_runtime_patch(game_ctx):
    if hasattr(game_ctx, "speed"):
        game_ctx.speed *= MOD_CONFIG["speed_scale"]
    if MOD_CONFIG["god_mode"] and hasattr(game_ctx, "invincible"):
        game_ctx.invincible = True
    return MOD_CONFIG
`
      };
    case 'love2d':
      return {
        filename: 'aurelius_love_mod.lua',
        content: `-- Autonomous LÖVE 2D Mod for ${game.title}
-- Summary: ${modSummary}
local aurelius_mod = {
  god_mode = ${game.modState.godMode},
  time_scale = ${game.modState.timeScale},
  gravity = ${game.modState.gravity},
  speed_scale = ${game.modState.speedScale}
}
return aurelius_mod
`
      };
    default:
      return {
        filename: 'aurelius_mod_patch.json',
        content: JSON.stringify(
          {
            gameId: game.gameId,
            title: game.title,
            engine: game.engine,
            summary: modSummary,
            modState: game.modState,
            updatedAt: new Date().toISOString()
          },
          null,
          2
        )
      };
  }
}

export function applyAutonomousGameMod(
  params: {
    gameId?: string;
    modPrompt?: string;
    modName?: string;
    godMode?: boolean;
    timeScale?: number;
    gravity?: number;
    speedScale?: number;
    biome?: EnvironmentBiome;
    weather?: WeatherMode;
    bloomStrength?: number;
    spawnEntityKind?: string;
    spawnCount?: number;
    persistToDisk?: boolean;
    appliedBy?: string;
  },
  bridge: SpatialModBridge
): { game: DetectedGameRecord; modId: string; summary: string; scriptPath?: string } {
  ensureBuiltinSpatialRegistered();
  const games = getDetectedGames();
  const target =
    (params.gameId
      ? games.find((g) => g.gameId === params.gameId || g.gameKey === params.gameId || g.title.toLowerCase().includes(params.gameId!.toLowerCase()))
      : undefined) ||
    games[0];

  const promptLower = String(params.modPrompt || '').toLowerCase();

  const resolvedGodMode =
    typeof params.godMode === 'boolean'
      ? params.godMode
      : /god\s*mode|invincib|immortal|infinite\s*shield/.test(promptLower)
        ? true
        : /disable\s*god|mortal/.test(promptLower)
          ? false
          : target.modState.godMode;

  const resolvedTimeScale =
    typeof params.timeScale === 'number'
      ? Math.max(0.25, Math.min(3.0, params.timeScale))
      : /slow\s*mo|bullet\s*time/.test(promptLower)
        ? 0.5
        : /hyper|turbo|2x|double\s*speed/.test(promptLower)
          ? 1.75
          : target.modState.timeScale;

  const resolvedGravity =
    typeof params.gravity === 'number'
      ? Math.max(0.2, Math.min(30, params.gravity))
      : /low\s*gravity|moon|zero[\s-]*g/.test(promptLower)
        ? 1.8
        : /heavy\s*gravity|double\s*gravity/.test(promptLower)
          ? 19.6
          : target.modState.gravity;

  const resolvedSpeedScale =
    typeof params.speedScale === 'number'
      ? Math.max(0.4, Math.min(2.5, params.speedScale))
      : resolvedTimeScale;

  const resolvedBiome =
    params.biome ||
    (/biome|cyber|ocean|archipelago|abyss|ringworld|desert|canyon/.test(promptLower)
      ? inferBiomeFromPrompt(promptLower, target.modState.biome || 'canyon_basin')
      : target.modState.biome);

  const resolvedWeather =
    params.weather ||
    (/rain|storm|snow|ash|spore|clear/.test(promptLower)
      ? inferWeatherFromPrompt(promptLower, target.modState.weather || 'clear')
      : target.modState.weather);

  const resolvedBloom =
    typeof params.bloomStrength === 'number'
      ? Math.max(0, Math.min(2, params.bloomStrength))
      : /bloom|glow|hdr|neon/.test(promptLower)
        ? 0.88
        : target.modState.bloomStrength;

  const modId = `mod-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
  const modName = params.modName?.trim() || (params.modPrompt ? params.modPrompt.slice(0, 44) : 'Autonomous Engine Override');
  const summaryParts = [
    resolvedGodMode ? 'GodMode=ON' : null,
    `TimeScale=${resolvedTimeScale}x`,
    `Gravity=${resolvedGravity}`,
    resolvedBiome ? `Biome=${resolvedBiome}` : null,
    resolvedWeather ? `Weather=${resolvedWeather}` : null
  ].filter(Boolean);
  const modSummary = `${modName} (${summaryParts.join(', ')})`;

  target.modState.godMode = resolvedGodMode;
  target.modState.timeScale = resolvedTimeScale;
  target.modState.gravity = resolvedGravity;
  target.modState.speedScale = resolvedSpeedScale;
  if (resolvedBiome) target.modState.biome = resolvedBiome;
  if (resolvedWeather) target.modState.weather = resolvedWeather;
  if (typeof resolvedBloom === 'number') target.modState.bloomStrength = resolvedBloom;

  let scriptPath: string | undefined;
  if (params.persistToDisk !== false) {
    const modDir = path.join(process.cwd(), 'projects', 'mods', target.gameId);
    fs.mkdirSync(modDir, { recursive: true });
    const artifact = generateEngineModScript(target, modSummary);
    const absScriptPath = path.join(modDir, artifact.filename);
    fs.writeFileSync(absScriptPath, artifact.content, 'utf8');
    scriptPath = path.relative(process.cwd(), absScriptPath);
  }

  target.modCount += 1;
  target.status = 'MODDED';
  target.updatedAt = new Date().toISOString();
  target.modState.activeMods.unshift({
    modId,
    name: modName,
    appliedBy: params.appliedBy || 'lyrailius-omega-zenith',
    summary: modSummary,
    appliedAt: target.updatedAt,
    ...(scriptPath ? { scriptPath } : {})
  });
  if (target.modState.activeMods.length > 20) {
    target.modState.activeMods.length = 20;
  }

  if (target.runtimeHook === 'hybrid' || target.runtimeHook === 'spatial_bus' || target.engine === 'threejs') {
    bridge.dispatchLiveMod({
      sourceAgent: params.appliedBy || 'lyrailius-omega-zenith',
      gameId: target.gameId,
      gameTitle: target.title,
      godMode: resolvedGodMode,
      timeScale: resolvedTimeScale,
      gravity: resolvedGravity,
      speedScale: resolvedSpeedScale,
      biome: resolvedBiome,
      weather: resolvedWeather,
      bloomStrength: resolvedBloom,
      spawnEntityKind: params.spawnEntityKind,
      spawnCount: params.spawnCount,
      modSummary
    });
  }

  return { game: target, modId, summary: modSummary, scriptPath };
}

export function synthesizeAndExecuteEngineTool(
  params: {
    toolName: string;
    category?: EngineToolCategory;
    description: string;
    biome?: EnvironmentBiome;
    weather?: WeatherMode;
    waterEnabled?: boolean;
    bloomStrength?: number;
    sunElevationDeg?: number;
    structureKind?: ConceptStructureKind;
    structureCount?: number;
    gravity?: number;
    speedScale?: number;
    createdByAgent?: string;
  },
  bridge: SpatialModBridge
): ProceduralEngineToolSpec {
  const lower = `${params.toolName} ${params.description}`.toLowerCase();
  const inferredCategory: EngineToolCategory =
    params.category ||
    (/water|ocean|wave|fluid|gerstner/.test(lower)
      ? 'water_fluid_shader'
      : /city|skyline|tower|building|architecture/.test(lower)
        ? 'skyline_architect'
        : /rain|snow|weather|storm|ash|spore/.test(lower)
          ? 'weather_system'
          : /bloom|shader|glsl|post/.test(lower)
            ? 'glsl_post_fx'
            : /gravity|physics|speed/.test(lower)
              ? 'physics_mutator'
              : /spawn|structure|monolith|crystal|reactor/.test(lower)
                ? 'entity_assembler'
                : 'biome_sculptor');

  const biome = params.biome || (/biome|cyber|ocean|archipelago|abyss|ringworld|desert|canyon/.test(lower) ? inferBiomeFromPrompt(lower, 'alpine_archipelago') : undefined);
  const weather = params.weather || (/rain|storm|snow|ash|spore|clear/.test(lower) ? inferWeatherFromPrompt(lower, 'clear') : undefined);

  const pipelinePatch: Partial<RenderPipelineConfig> = {};
  if (biome) {
    Object.assign(pipelinePatch, BIOME_PRESET_DEFAULTS[biome]);
    pipelinePatch.biome = biome;
  }
  if (weather) pipelinePatch.weather = weather;
  if (typeof params.waterEnabled === 'boolean') pipelinePatch.waterEnabled = params.waterEnabled;
  if (typeof params.bloomStrength === 'number') pipelinePatch.bloomStrength = Math.max(0, Math.min(2, params.bloomStrength));
  if (typeof params.sunElevationDeg === 'number') pipelinePatch.sunElevationDeg = Math.max(2, Math.min(82, params.sunElevationDeg));

  const physicsPatch: Partial<SpatialPhysicsConfig> = {};
  if (typeof params.gravity === 'number') physicsPatch.gravity = Math.max(0.2, Math.min(30, params.gravity));
  if (typeof params.speedScale === 'number') physicsPatch.speedScale = Math.max(0.4, Math.min(2.5, params.speedScale));

  const conceptKind: ConceptStructureKind =
    params.structureKind ||
    (/city|skyline|tower|building|skyscraper/.test(lower)
      ? 'skyscraper'
      : /reactor|core|energy/.test(lower)
        ? 'reactor_spire'
        : /crystal|gem|biolumines/.test(lower)
          ? 'crystal_cluster'
          : /arch|sandstone|canyon|desert/.test(lower)
            ? 'sandstone_arch'
            : /habitat|dome|colony/.test(lower)
              ? 'habitat_dome'
              : 'orbital_pylon');

  const count = Math.max(0, Math.min(10, params.structureCount ?? (inferredCategory === 'skyline_architect' || inferredCategory === 'entity_assembler' ? 5 : 3)));
  const paletteByKind: Record<ConceptStructureKind, string> = {
    skyscraper: '#38bdf8',
    reactor_spire: '#f59e0b',
    crystal_cluster: '#10b981',
    sandstone_arch: '#fb923c',
    orbital_pylon: '#a855f7',
    habitat_dome: '#22d3ee'
  };

  const generatedStructures = Array.from({ length: count }, (_, idx) => {
    const angle = (idx / Math.max(1, count)) * Math.PI * 2 + 0.45;
    const radius = 19 + (idx % 3) * 6.5;
    return {
      id: `struct-${Date.now().toString(36)}-${idx}`,
      conceptKind,
      label: `${params.toolName} #${idx + 1}`,
      x: Math.round(Math.cos(angle) * radius * 10) / 10,
      z: Math.round(Math.sin(angle) * radius * 10) / 10,
      scale: Math.round((0.85 + (idx % 3) * 0.25) * 100) / 100,
      colorHex: paletteByKind[conceptKind]
    };
  });

  const spec: ProceduralEngineToolSpec = {
    toolId: `engtool-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
    name: params.toolName.slice(0, 64),
    category: inferredCategory,
    description: params.description.slice(0, 320),
    createdByAgent: params.createdByAgent || 'lyrailius-omega-zenith',
    parameters: params,
    generatedStructures,
    pipelinePatch: Object.keys(pipelinePatch).length > 0 ? pipelinePatch : undefined,
    physicsPatch: Object.keys(physicsPatch).length > 0 ? physicsPatch : undefined,
    createdAt: new Date().toISOString()
  };

  forgedEngineTools.unshift(spec);
  if (forgedEngineTools.length > 24) forgedEngineTools.length = 24;

  // Persist generated tool specification to projects/engine_tools/
  try {
    const toolsDir = path.join(process.cwd(), 'projects', 'engine_tools');
    fs.mkdirSync(toolsDir, { recursive: true });
    fs.writeFileSync(path.join(toolsDir, `${spec.toolId}.json`), JSON.stringify(spec, null, 2), 'utf8');
  } catch {}

  bridge.dispatchForgedTool(spec);
  return spec;
}
