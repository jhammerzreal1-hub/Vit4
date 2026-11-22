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

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import type { SceneMaterialLibrary } from './sceneMaterials';
import type {
  CharacterAppearanceSpec,
  ConceptStructureKind,
  EnvironmentBiome,
  MmorpgClass,
  ProcessEntityKind,
  RenderPipelineConfig,
  WeatherMode
} from './spatialEngineTypes';
import { createDefaultCharacterAppearance } from './spatialEngineTypes';

export const ARENA_HALF_EXTENT = 46;
export const INSPECT_LAYER = 1;

export type LightingPreset = 'orbital-twilight' | 'solar-foundry' | 'abyssal-hangar';

export interface LightingRigRefs {
  keyLight: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
  rimLight: THREE.DirectionalLight;
  rectLights: THREE.RectAreaLight[];
  applyPreset: (preset: LightingPreset, scene: THREE.Scene) => void;
  applyPipeline: (
    pipeline: RenderPipelineConfig,
    targetScene: THREE.Scene,
    targetRenderer: THREE.WebGLRenderer
  ) => void;
  updateAtmosphere: (dt: number, elapsedSec: number) => void;
}

export function groundHeightAt(
  x: number,
  z: number,
  biome: EnvironmentBiome = 'canyon_basin'
): number {
  const distFromCenter = Math.hypot(x, z);
  if (distFromCenter < 18) return 0;

  const corridorBlend = THREE.MathUtils.smoothstep(distFromCenter, 18, ARENA_HALF_EXTENT);
  const ridgeBlend = THREE.MathUtils.smoothstep(distFromCenter, ARENA_HALF_EXTENT, 130);

  if (biome === 'alpine_archipelago') {
    const islandSwell =
      (Math.sin(x * 0.065) * Math.cos(z * 0.065) * 1.4 - 0.55) * corridorBlend;
    const fjords =
      (Math.pow(Math.abs(Math.sin(x * 0.055) * Math.cos(z * 0.055)), 1.4) * 16.5 - 1.4) *
      ridgeBlend;
    return Math.max(-1.6, islandSwell + fjords);
  }

  if (biome === 'cyber_metropolis') {
    const step = (Math.sin(x * 0.09) * Math.cos(z * 0.09) * 0.35) * corridorBlend;
    const outerTerrace =
      (Math.floor((Math.sin(x * 0.07) + Math.cos(z * 0.07) + 2) * 2.2) * 1.2) * ridgeBlend;
    return Math.max(-0.8, step + outerTerrace);
  }

  if (biome === 'bioluminescent_abyss') {
    const basin = (Math.sin(x * 0.08) * Math.sin(z * 0.08) * 1.1 - 0.45) * corridorBlend;
    const cavernWalls =
      (Math.abs(Math.cos(x * 0.06) + Math.sin(z * 0.06)) * 6.5 + 3.2) * ridgeBlend;
    return Math.max(-1.1, basin + cavernWalls);
  }

  if (biome === 'orbital_ringworld') {
    const ringCurve = Math.pow(Math.max(0, Math.abs(z) - 42) / 60, 1.7) * 24;
    const plating = (Math.sin(x * 0.1) * 0.3) * corridorBlend;
    return Math.max(-0.9, plating + ringCurve);
  }

  if (biome === 'desert_monolith') {
    const dunes =
      (Math.sin(x * 0.055 + Math.cos(z * 0.04) * 1.5) * 0.95 + 0.35) * corridorBlend;
    const mesas =
      (Math.min(11, Math.max(0, Math.sin(x * 0.075) * Math.cos(z * 0.075) * 14 + 6.5))) *
      ridgeBlend;
    return Math.max(0, dunes + mesas);
  }

  // Default: canyon_basin
  const gentleUndo =
    (Math.sin(x * 0.08) * Math.cos(z * 0.08) * 0.45 + Math.sin((x + z) * 0.04) * 0.3) *
    corridorBlend;

  const perimeterCliffs =
    (Math.sin(x * 0.11) * Math.cos(z * 0.09) * 3.8 +
      Math.cos(Math.hypot(x, z) * 0.09) * 2.5 +
      10.5) *
    ridgeBlend;

  return Math.max(0, gentleUndo + perimeterCliffs);
}

function tagPart(
  obj: THREE.Object3D,
  partLabel: string,
  partRole: string,
  explodeOffset: THREE.Vector3,
  selectable = true
) {
  obj.userData.homePos = obj.position.clone();
  obj.userData.explodeOffset = explodeOffset;
  obj.userData.partLabel = partLabel;
  obj.userData.partRole = partRole;
  if (selectable) {
    obj.layers.enable(INSPECT_LAYER);
  }
}

export function createInterceptorGroup(lib: SceneMaterialLibrary): {
  root: THREE.Group;
  thrusterCones: THREE.Mesh[];
  explodedParts: THREE.Object3D[];
  disposables: THREE.BufferGeometry[];
} {
  const root = new THREE.Group();
  root.name = 'AegisInterceptor';
  const disposables: THREE.BufferGeometry[] = [];
  const thrusterCones: THREE.Mesh[] = [];
  const explodedParts: THREE.Object3D[] = [];

  const registerGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposables.push(g);
    return g;
  };

  // 1. Primary silhouette: Extruded beveled delta fuselage hull
  const hullShape = new THREE.Shape();
  hullShape.moveTo(0, 2.55);
  hullShape.lineTo(0.74, 0.75);
  hullShape.lineTo(0.86, -1.65);
  hullShape.lineTo(0.45, -2.05);
  hullShape.lineTo(-0.45, -2.05);
  hullShape.lineTo(-0.86, -1.65);
  hullShape.lineTo(-0.74, 0.75);
  hullShape.closePath();

  const hullGeo = registerGeo(
    new THREE.ExtrudeGeometry(hullShape, {
      depth: 0.42,
      bevelEnabled: true,
      bevelThickness: 0.14,
      bevelSize: 0.12,
      bevelSegments: 3
    })
  );
  hullGeo.rotateX(Math.PI / 2);
  hullGeo.computeTangents();
  const hullMesh = new THREE.Mesh(hullGeo, lib.hullPrimary);
  hullMesh.position.set(0, 0.92, 0);
  hullMesh.castShadow = true;
  hullMesh.receiveShadow = true;
  tagPart(
    hullMesh,
    'Primary Titanium Airframe',
    'Primary load-bearing delta fuselage with chamfered armor spine',
    new THREE.Vector3(0, 0, 0)
  );
  root.add(hullMesh);
  explodedParts.push(hullMesh);

  // 2. Dorsal Spine Cowl
  const spineShape = new THREE.Shape();
  spineShape.moveTo(0, 1.85);
  spineShape.lineTo(0.32, 0.25);
  spineShape.lineTo(0.38, -1.55);
  spineShape.lineTo(-0.38, -1.55);
  spineShape.lineTo(-0.32, 0.25);
  spineShape.closePath();

  const spineGeo = registerGeo(
    new THREE.ExtrudeGeometry(spineShape, {
      depth: 0.24,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.07,
      bevelSegments: 2
    })
  );
  spineGeo.rotateX(Math.PI / 2);
  const spineMesh = new THREE.Mesh(spineGeo, lib.hullDarkTrim);
  spineMesh.position.set(0, 1.24, -0.15);
  spineMesh.castShadow = true;
  tagPart(
    spineMesh,
    'Dorsal Avionics Spine',
    'Carbon-composite upper telemetry & core power distribution bridge',
    new THREE.Vector3(0, 0.95, 0)
  );
  root.add(spineMesh);
  explodedParts.push(spineMesh);

  // 3 & 4. Port and Starboard Swept Forward-Edge Airfoil Wings
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0.95);
  wingShape.lineTo(2.15, -0.95);
  wingShape.lineTo(2.05, -1.52);
  wingShape.lineTo(0, -1.35);
  wingShape.closePath();

  const rightWingGeo = registerGeo(
    new THREE.ExtrudeGeometry(wingShape, {
      depth: 0.11,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.05,
      bevelSegments: 2
    })
  );
  rightWingGeo.rotateX(Math.PI / 2);

  const rightWing = new THREE.Mesh(rightWingGeo, lib.wingComposite);
  rightWing.position.set(0.66, 0.72, -0.1);
  rightWing.castShadow = true;
  rightWing.receiveShadow = true;
  tagPart(
    rightWing,
    'Starboard Airfoil Module',
    'Swept variable-lift composite wing surface with recessed actuator seam',
    new THREE.Vector3(1.4, 0.15, 0)
  );
  root.add(rightWing);
  explodedParts.push(rightWing);

  const leftWing = new THREE.Mesh(rightWingGeo, lib.wingComposite);
  leftWing.scale.x = -1;
  leftWing.position.set(-0.66, 0.72, -0.1);
  leftWing.castShadow = true;
  leftWing.receiveShadow = true;
  tagPart(
    leftWing,
    'Port Airfoil Module',
    'Mirror swept composite wing surface balanced for high-G roll stability',
    new THREE.Vector3(-1.4, 0.15, 0)
  );
  root.add(leftWing);
  explodedParts.push(leftWing);

  // 5. Twin Accent Wingtip Fins (Canted)
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.lineTo(0.85, 0);
  finShape.lineTo(0.62, 0.68);
  finShape.lineTo(0.18, 0.68);
  finShape.closePath();

  const finGeo = registerGeo(
    new THREE.ExtrudeGeometry(finShape, {
      depth: 0.06,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 1
    })
  );
  finGeo.rotateY(Math.PI / 2);

  const rightFin = new THREE.Mesh(finGeo, lib.accentTrim);
  rightFin.position.set(2.38, 0.72, -0.92);
  rightFin.rotation.z = -0.26;
  rightFin.castShadow = true;
  tagPart(
    rightFin,
    'Starboard Trim Stabilizer',
    'Anodized directional vector fin for canyon yaw authority',
    new THREE.Vector3(1.85, 0.65, -0.3)
  );
  root.add(rightFin);
  explodedParts.push(rightFin);

  const leftFin = new THREE.Mesh(finGeo, lib.accentTrim);
  leftFin.position.set(-2.38, 0.72, -0.92);
  leftFin.rotation.z = 0.26;
  leftFin.castShadow = true;
  tagPart(
    leftFin,
    'Port Trim Stabilizer',
    'Mirror anodized directional fin matching flight attitude dampers',
    new THREE.Vector3(-1.85, 0.65, -0.3)
  );
  root.add(leftFin);
  explodedParts.push(leftFin);

  // 6. Optical Glass Cockpit Canopy (Lathe dome + recessed frame)
  const canopyPoints = [
    new THREE.Vector2(0.01, 0.42),
    new THREE.Vector2(0.24, 0.38),
    new THREE.Vector2(0.38, 0.2),
    new THREE.Vector2(0.42, 0.0)
  ];
  const canopyGeo = registerGeo(new THREE.LatheGeometry(canopyPoints, 24));
  canopyGeo.scale(0.88, 1.0, 2.25);
  const canopyMesh = new THREE.Mesh(canopyGeo, lib.canopyGlass);
  canopyMesh.position.set(0, 1.24, 0.48);
  canopyMesh.renderOrder = 4;
  tagPart(
    canopyMesh,
    'Optical Sapphire Canopy',
    'Refractive transmissive flight dome over interior neural HUD seat',
    new THREE.Vector3(0, 1.45, 0.35)
  );
  root.add(canopyMesh);
  explodedParts.push(canopyMesh);

  // 7. Twin Vectored Plasma Thruster Nozzles + Plasma Cones (LatheGeometry)
  const nozzlePoints = [
    new THREE.Vector2(0.3, 0.42),
    new THREE.Vector2(0.35, 0.18),
    new THREE.Vector2(0.26, -0.28),
    new THREE.Vector2(0.2, -0.32)
  ];
  const nozzleGeo = registerGeo(new THREE.LatheGeometry(nozzlePoints, 20));
  nozzleGeo.rotateX(Math.PI / 2);

  const coneGeo = registerGeo(new THREE.ConeGeometry(0.19, 0.95, 16));
  coneGeo.rotateX(-Math.PI / 2);

  [-0.44, 0.44].forEach((offsetX, idx) => {
    const nozzleGroup = new THREE.Group();
    nozzleGroup.position.set(offsetX, 0.72, -1.88);
    const nozzle = new THREE.Mesh(nozzleGeo, lib.thrusterNozzle);
    nozzle.castShadow = true;
    nozzleGroup.add(nozzle);

    const flame = new THREE.Mesh(coneGeo, lib.thrusterPlasma);
    flame.position.set(0, 0, -0.58);
    nozzleGroup.add(flame);
    thrusterCones.push(flame);

    tagPart(
      nozzleGroup,
      idx === 0 ? 'Port Plasma Thruster' : 'Starboard Plasma Thruster',
      'Vectored magnetic nozzle housing & high-velocity ion plume',
      new THREE.Vector3(offsetX * 0.8, -0.1, -1.25)
    );
    root.add(nozzleGroup);
    explodedParts.push(nozzleGroup);
  });

  // 8. Nose Sensor Spire (Precision machined accent probe)
  const spirePoints = [
    new THREE.Vector2(0.0, 0.85),
    new THREE.Vector2(0.04, 0.4),
    new THREE.Vector2(0.14, 0.0)
  ];
  const spireGeo = registerGeo(new THREE.LatheGeometry(spirePoints, 14));
  spireGeo.rotateX(Math.PI / 2);
  const spireMesh = new THREE.Mesh(spireGeo, lib.accentTrim);
  spireMesh.position.set(0, 0.76, 2.52);
  tagPart(
    spireMesh,
    'Forward LiDAR Nose Probe',
    'Machined alloy resonance sensor array for terrain & beacon lock',
    new THREE.Vector3(0, 0, 1.2)
  );
  root.add(spireMesh);
  explodedParts.push(spireMesh);

  // 9. Twin Ventral Landing / Repulsor Skids grounded so lowest point sits at y = 0.0
  const skidCurveL = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.52, 0.45, 1.05),
    new THREE.Vector3(-0.56, 0.06, 0.75),
    new THREE.Vector3(-0.56, 0.06, -0.95),
    new THREE.Vector3(-0.52, 0.45, -1.25)
  ]);
  const skidCurveR = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.52, 0.45, 1.05),
    new THREE.Vector3(0.56, 0.06, 0.75),
    new THREE.Vector3(0.56, 0.06, -0.95),
    new THREE.Vector3(0.52, 0.45, -1.25)
  ]);
  const skidGeoL = registerGeo(new THREE.TubeGeometry(skidCurveL, 18, 0.055, 8, false));
  const skidGeoR = registerGeo(new THREE.TubeGeometry(skidCurveR, 18, 0.055, 8, false));

  const skidGroup = new THREE.Group();
  const skidL = new THREE.Mesh(skidGeoL, lib.hullDarkTrim);
  const skidR = new THREE.Mesh(skidGeoR, lib.hullDarkTrim);
  skidL.castShadow = true;
  skidR.castShadow = true;
  skidGroup.add(skidL, skidR);
  tagPart(
    skidGroup,
    'Ventral Repulsor Skids',
    'Ground-contact tubular landing cradle anchoring the chassis flush to deck',
    new THREE.Vector3(0, -0.75, 0)
  );
  root.add(skidGroup);
  explodedParts.push(skidGroup);

  // Ground contact shadow plane directly at y = 0.025 (never fights deck markings at 0.015)
  const shadowGeo = registerGeo(new THREE.PlaneGeometry(5.8, 6.4));
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowPlane = new THREE.Mesh(shadowGeo, lib.contactShadow);
  shadowPlane.position.set(0, 0.025, 0);
  root.add(shadowPlane);

  return { root, thrusterCones, explodedParts, disposables };
}

export function createBeaconGroup(lib: SceneMaterialLibrary): {
  root: THREE.Group;
  crystal: THREE.Mesh;
  ringA: THREE.Mesh;
  ringB: THREE.Mesh;
  disposables: THREE.BufferGeometry[];
} {
  const root = new THREE.Group();
  const disposables: THREE.BufferGeometry[] = [];
  const reg = <T extends THREE.BufferGeometry>(g: T): T => {
    disposables.push(g);
    return g;
  };

  // Base pedestal disc (bottom-center grounded at y=0)
  const baseGeo = reg(new THREE.CylinderGeometry(0.68, 0.85, 0.16, 12));
  const base = new THREE.Mesh(baseGeo, lib.hullDarkTrim);
  base.position.y = 0.08;
  base.receiveShadow = true;
  root.add(base);

  const collarGeo = reg(new THREE.TorusGeometry(0.55, 0.055, 8, 24));
  collarGeo.rotateX(Math.PI / 2);
  const collar = new THREE.Mesh(collarGeo, lib.accentTrim);
  collar.position.y = 0.18;
  root.add(collar);

  // Inner octahedral crystal core
  const crystalGeo = reg(new THREE.OctahedronGeometry(0.62, 0));
  crystalGeo.scale(0.85, 1.35, 0.85);
  const crystal = new THREE.Mesh(crystalGeo, lib.beaconCrystal);
  crystal.position.y = 1.45;
  crystal.castShadow = true;
  root.add(crystal);

  // Counter-rotating dual gimbal rings
  const ringGeoA = reg(new THREE.TorusGeometry(0.95, 0.045, 10, 32));
  const ringA = new THREE.Mesh(ringGeoA, lib.beaconGimbal);
  ringA.position.y = 1.45;
  root.add(ringA);

  const ringGeoB = reg(new THREE.TorusGeometry(1.14, 0.035, 10, 32));
  const ringB = new THREE.Mesh(ringGeoB, lib.accentTrim);
  ringB.position.y = 1.45;
  root.add(ringB);

  const shadowGeo = reg(new THREE.PlaneGeometry(2.6, 2.6));
  shadowGeo.rotateX(-Math.PI / 2);
  const shadow = new THREE.Mesh(shadowGeo, lib.contactShadow);
  shadow.position.y = 0.025;
  root.add(shadow);

  return { root, crystal, ringA, ringB, disposables };
}

export function createSentinelGroup(lib: SceneMaterialLibrary): {
  root: THREE.Group;
  shroudRing: THREE.Mesh;
  core: THREE.Mesh;
  disposables: THREE.BufferGeometry[];
} {
  const root = new THREE.Group();
  const disposables: THREE.BufferGeometry[] = [];
  const reg = <T extends THREE.BufferGeometry>(g: T): T => {
    disposables.push(g);
    return g;
  };

  // Octagonal plinth grounded at y=0
  const plinthGeo = reg(new THREE.CylinderGeometry(1.05, 1.32, 0.45, 8));
  const plinth = new THREE.Mesh(plinthGeo, lib.hullDarkTrim);
  plinth.position.y = 0.225;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  root.add(plinth);

  // Vertical armored core tower
  const bodyPoints = [
    new THREE.Vector2(0.82, 0.0),
    new THREE.Vector2(0.95, 0.8),
    new THREE.Vector2(0.62, 2.1),
    new THREE.Vector2(0.32, 2.45),
    new THREE.Vector2(0.0, 2.55)
  ];
  const bodyGeo = reg(new THREE.LatheGeometry(bodyPoints, 8));
  const body = new THREE.Mesh(bodyGeo, lib.sentinelArmor);
  body.position.y = 0.42;
  body.castShadow = true;
  root.add(body);

  // Guard ribs
  const ribGeo = reg(new THREE.BoxGeometry(2.15, 0.22, 0.34));
  const rib1 = new THREE.Mesh(ribGeo, lib.hullPrimary);
  rib1.position.y = 1.25;
  rib1.castShadow = true;
  const rib2 = new THREE.Mesh(ribGeo, lib.hullPrimary);
  rib2.position.y = 1.25;
  rib2.rotation.y = Math.PI / 2;
  rib2.castShadow = true;
  root.add(rib1, rib2);

  // Rotating hazard shroud
  const shroudGeo = reg(new THREE.TorusGeometry(1.22, 0.09, 8, 8));
  shroudGeo.rotateX(Math.PI / 2);
  const shroudRing = new THREE.Mesh(shroudGeo, lib.accentTrim);
  shroudRing.position.y = 1.55;
  root.add(shroudRing);

  // Emissive threat core
  const coreGeo = reg(new THREE.IcosahedronGeometry(0.46, 0));
  const core = new THREE.Mesh(coreGeo, lib.sentinelCore);
  core.position.y = 2.95;
  root.add(core);

  const shadowGeo = reg(new THREE.PlaneGeometry(3.4, 3.4));
  shadowGeo.rotateX(-Math.PI / 2);
  const shadow = new THREE.Mesh(shadowGeo, lib.contactShadow);
  shadow.position.y = 0.025;
  root.add(shadow);

  return { root, shroudRing, core, disposables };
}

export function buildEnvironmentAndTerrain(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  lib: SceneMaterialLibrary,
  isSoftwareGl: boolean
): {
  lightingRig: LightingRigRefs;
  burstMesh: THREE.InstancedMesh;
  disposables: Array<{ dispose: () => void }>;
} {
  const disposables: Array<{ dispose: () => void }> = [];

  // Mandatory Studio Environment Reflection on EVERY device
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  pmremGenerator.dispose();
  disposables.push(envTex);

  scene.background = new THREE.Color(0x090c14);
  scene.fog = new THREE.FogExp2(0x090c14, 0.0082);

  // Warm / Cool 3-Point Lighting Rig
  const keyLight = new THREE.DirectionalLight(0xffe6c2, 2.2);
  keyLight.position.set(28, 42, 22);
  keyLight.castShadow = !isSoftwareGl;
  if (!isSoftwareGl) {
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    const d = 48;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 120;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
  }
  scene.add(keyLight);

  const hemiLight = new THREE.HemisphereLight(0x6ea8fe, 0x1e1b18, 0.9);
  hemiLight.position.set(0, 50, 0);
  scene.add(hemiLight);

  const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.15);
  rimLight.position.set(-28, 18, -32);
  scene.add(rimLight);

  const rectLights: THREE.RectAreaLight[] = [];
  if (!isSoftwareGl) {
    RectAreaLightUniformsLib.init();
    const softboxA = new THREE.RectAreaLight(0xffeed6, 3.2, 16, 6);
    softboxA.position.set(0, 14, 10);
    softboxA.lookAt(0, 0.8, 0);
    scene.add(softboxA);
    rectLights.push(softboxA);

    const softboxB = new THREE.RectAreaLight(0x93c5fd, 2.4, 16, 6);
    softboxB.position.set(-10, 10, -10);
    softboxB.lookAt(0, 0.8, 0);
    scene.add(softboxB);
    rectLights.push(softboxB);
  }

  const applyPreset = (preset: LightingPreset, targetScene: THREE.Scene) => {
    if (preset === 'orbital-twilight') {
      targetScene.background = new THREE.Color(0x090c14);
      targetScene.fog = new THREE.FogExp2(0x090c14, 0.0082);
      keyLight.color.setHex(0xffe6c2);
      keyLight.intensity = 2.2;
      hemiLight.color.setHex(0x6ea8fe);
      hemiLight.groundColor.setHex(0x1e1b18);
      hemiLight.intensity = 0.9;
      rimLight.color.setHex(0x38bdf8);
      rimLight.intensity = 1.15;
    } else if (preset === 'solar-foundry') {
      targetScene.background = new THREE.Color(0x17110d);
      targetScene.fog = new THREE.FogExp2(0x17110d, 0.0076);
      keyLight.color.setHex(0xffcb8c);
      keyLight.intensity = 2.55;
      hemiLight.color.setHex(0xfde68a);
      hemiLight.groundColor.setHex(0x2b1d14);
      hemiLight.intensity = 0.85;
      rimLight.color.setHex(0xfb923c);
      rimLight.intensity = 1.25;
    } else {
      targetScene.background = new THREE.Color(0x06090e);
      targetScene.fog = new THREE.FogExp2(0x06090e, 0.0095);
      keyLight.color.setHex(0xd8e8ff);
      keyLight.intensity = 1.85;
      hemiLight.color.setHex(0x38bdf8);
      hemiLight.groundColor.setHex(0x090b10);
      hemiLight.intensity = 0.82;
      rimLight.color.setHex(0x10b981);
      rimLight.intensity = 1.35;
    }
  };

  const biomePalette: Record<EnvironmentBiome, { flat: number; mid: number; peak: number; zenith: number; horizon: number; glow: number; fog: number; rock: number }> = {
    canyon_basin: { flat: 0x141923, mid: 0x1e2636, peak: 0x374151, zenith: 0x060b19, horizon: 0x172542, glow: 0xf59e0b, fog: 0x090c14, rock: 0x2c3442 },
    alpine_archipelago: { flat: 0x182e29, mid: 0x2f4f42, peak: 0xcbd5e1, zenith: 0x0f2747, horizon: 0x628bb8, glow: 0xfde68a, fog: 0x1b3048, rock: 0x475569 },
    cyber_metropolis: { flat: 0x0d111a, mid: 0x172033, peak: 0x1e293b, zenith: 0x040610, horizon: 0x171436, glow: 0x06b6d4, fog: 0x090c1a, rock: 0x1e293b },
    bioluminescent_abyss: { flat: 0x071b24, mid: 0x0d333d, peak: 0x115e59, zenith: 0x020b12, horizon: 0x09353f, glow: 0x10b981, fog: 0x051822, rock: 0x134e4a },
    orbital_ringworld: { flat: 0x181c26, mid: 0x2a3345, peak: 0x64748b, zenith: 0x03050a, horizon: 0x162440, glow: 0x38bdf8, fog: 0x060a14, rock: 0x475569 },
    desert_monolith: { flat: 0x452b1a, mid: 0x7c4625, peak: 0xb46936, zenith: 0x1b1d36, horizon: 0xc26e3a, glow: 0xfbbf24, fog: 0x3b2316, rock: 0x6b3a20 }
  };

  // Atmospheric Rayleigh/Mie Sky Dome (BackSide Sphere)
  const skyGeo = new THREE.SphereGeometry(260, 32, 20);
  disposables.push(skyGeo);
  const skyMesh = new THREE.Mesh(skyGeo, lib.skyDomeMat);
  scene.add(skyMesh);

  // Extended terrain well beyond playable arena with perimeter mountain ridges
  const terrainGeo = new THREE.PlaneGeometry(340, 340, 96, 96);
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position;
  const colors = new Float32Array(posAttr.count * 3);
  const colorAttr = new THREE.BufferAttribute(colors, 3);
  terrainGeo.setAttribute('color', colorAttr);
  disposables.push(terrainGeo);

  const terrainMesh = new THREE.Mesh(terrainGeo, lib.canyonTerrain);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  // Physically-Based Gerstner Ocean / Basin Water Mesh
  const waterGeo = new THREE.PlaneGeometry(320, 320, 72, 72);
  waterGeo.rotateX(-Math.PI / 2);
  disposables.push(waterGeo);
  const waterMesh = new THREE.Mesh(waterGeo, lib.waterMat);
  waterMesh.position.y = -0.35;
  waterMesh.receiveShadow = true;
  waterMesh.visible = false;
  scene.add(waterMesh);

  // Central Flight Deck Landing Pad (offset cleanly above y=0)
  const padBaseGeo = new THREE.CylinderGeometry(16, 17.2, 0.24, 32);
  disposables.push(padBaseGeo);
  const padBase = new THREE.Mesh(padBaseGeo, lib.deckPad);
  padBase.position.set(0, -0.1, 0);
  padBase.receiveShadow = true;
  scene.add(padBase);

  const padDecalGeo = new THREE.CircleGeometry(15.4, 32);
  padDecalGeo.rotateX(-Math.PI / 2);
  disposables.push(padDecalGeo);
  const padDecal = new THREE.Mesh(padDecalGeo, lib.deckDecal);
  padDecal.position.set(0, 0.022, 0);
  padDecal.receiveShadow = true;
  scene.add(padDecal);

  // InstancedMesh 1: Perimeter Basalt Monolith Rocks (96 instances)
  const rockGeo = new THREE.DodecahedronGeometry(2.8, 0);
  disposables.push(rockGeo);
  const rockCount = 96;
  const rockMesh = new THREE.InstancedMesh(rockGeo, lib.monolithRock, rockCount);
  rockMesh.castShadow = !isSoftwareGl;
  rockMesh.receiveShadow = true;
  scene.add(rockMesh);

  // InstancedMesh 1B: Procedural Cyber Metropolis Skyscraper Towers (44 perimeter towers)
  const towerGeo = new THREE.BoxGeometry(5.5, 22, 5.5);
  disposables.push(towerGeo);
  const towerCount = 44;
  const towerMesh = new THREE.InstancedMesh(towerGeo, lib.skyscraperMat, towerCount);
  towerMesh.castShadow = !isSoftwareGl;
  towerMesh.receiveShadow = true;
  towerMesh.visible = false;
  scene.add(towerMesh);

  const dummy = new THREE.Object3D();
  const tintColor = new THREE.Color();
  const cFlat = new THREE.Color();
  const cMid = new THREE.Color();
  const cPeak = new THREE.Color();
  const cTmp = new THREE.Color();

  const rebuildTerrainAndProps = (biome: EnvironmentBiome) => {
    const pal = biomePalette[biome] || biomePalette.canyon_basin;
    cFlat.setHex(pal.flat);
    cMid.setHex(pal.mid);
    cPeak.setHex(pal.peak);
    lib.monolithRock.color.setHex(pal.rock);

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      const h = groundHeightAt(vx, vz, biome);
      posAttr.setY(i, h);

      if (h < 1.2) {
        cTmp.copy(cFlat).lerp(cMid, Math.max(0, h + 0.5) / 1.7);
      } else {
        cTmp.copy(cMid).lerp(cPeak, Math.min(1, (h - 1.2) / 11));
      }
      colors[i * 3] = cTmp.r;
      colors[i * 3 + 1] = cTmp.g;
      colors[i * 3 + 2] = cTmp.b;
    }
    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    terrainGeo.computeVertexNormals();

    for (let i = 0; i < rockCount; i++) {
      const angle = (i / rockCount) * Math.PI * 2 + Math.sin(i * 3.1) * 0.14;
      const radius = ARENA_HALF_EXTENT + 7 + (i % 5) * 9.5 + Math.cos(i * 1.9) * 4;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = groundHeightAt(x, z, biome);

      const scaleVar = 0.85 + ((i * 37) % 30) / 100;
      const heightScale = scaleVar * (biome === 'desert_monolith' ? 2.4 + (i % 3) * 0.9 : 1.2 + (i % 4) * 0.65);

      dummy.position.set(x, y + heightScale * 1.4, z);
      dummy.rotation.set(
        Math.sin(i * 1.3) * 0.15,
        (i * 1.618) % (Math.PI * 2),
        Math.cos(i * 0.7) * 0.15
      );
      dummy.scale.set(scaleVar * 1.4, heightScale, scaleVar * 1.4);
      dummy.updateMatrix();
      rockMesh.setMatrixAt(i, dummy.matrix);

      const shade = 0.78 + ((i * 19) % 35) / 100;
      tintColor.setRGB(shade, shade * 1.03, shade * 1.1);
      rockMesh.setColorAt(i, tintColor);
    }
    rockMesh.instanceMatrix.needsUpdate = true;
    if (rockMesh.instanceColor) rockMesh.instanceColor.needsUpdate = true;
    rockMesh.computeBoundingSphere();

    // Update Cyber Metropolis / Ringworld architectural towers
    const showTowers = biome === 'cyber_metropolis' || biome === 'orbital_ringworld';
    towerMesh.visible = showTowers;
    if (showTowers) {
      for (let i = 0; i < towerCount; i++) {
        const angle = (i / towerCount) * Math.PI * 2 + (i % 2) * 0.08;
        const radius = ARENA_HALF_EXTENT + 12 + (i % 4) * 14;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = groundHeightAt(x, z, biome);
        const hScale = 0.7 + ((i * 29) % 15) * 0.14;
        const wScale = 0.8 + (i % 3) * 0.32;
        dummy.position.set(x, y + 11 * hScale - 0.5, z);
        dummy.rotation.set(0, -angle, 0);
        dummy.scale.set(wScale, hScale, wScale);
        dummy.updateMatrix();
        towerMesh.setMatrixAt(i, dummy.matrix);
      }
      towerMesh.instanceMatrix.needsUpdate = true;
      towerMesh.computeBoundingSphere();
    }
  };

  rebuildTerrainAndProps('canyon_basin');

  // InstancedMesh 2: Perimeter Navigation Guide Pylons (24 instances)
  const pylonGeo = new THREE.CylinderGeometry(0.18, 0.34, 3.4, 6);
  disposables.push(pylonGeo);
  const pylonCount = 24;
  const pylonMesh = new THREE.InstancedMesh(pylonGeo, lib.accentTrim, pylonCount);
  pylonMesh.castShadow = !isSoftwareGl;
  for (let i = 0; i < pylonCount; i++) {
    const angle = (i / pylonCount) * Math.PI * 2;
    const x = Math.cos(angle) * (ARENA_HALF_EXTENT + 1.5);
    const z = Math.sin(angle) * (ARENA_HALF_EXTENT + 1.5);
    const y = groundHeightAt(x, z);
    const scaleJitter = 0.9 + ((i * 13) % 20) / 100;
    dummy.position.set(x, y + 1.7 * scaleJitter, z);
    dummy.rotation.set(0, -angle, 0);
    dummy.scale.set(scaleJitter, scaleJitter, scaleJitter);
    dummy.updateMatrix();
    pylonMesh.setMatrixAt(i, dummy.matrix);
    tintColor.setHex(i % 2 === 0 ? 0xf59e0b : 0x38bdf8);
    pylonMesh.setColorAt(i, tintColor);
  }
  pylonMesh.instanceMatrix.needsUpdate = true;
  if (pylonMesh.instanceColor) pylonMesh.instanceColor.needsUpdate = true;
  pylonMesh.computeBoundingSphere();
  scene.add(pylonMesh);

  // InstancedMesh 3: Reusable Particle Burst Pool (64 shards)
  const burstGeo = new THREE.OctahedronGeometry(0.22, 0);
  disposables.push(burstGeo);
  const burstMesh = new THREE.InstancedMesh(burstGeo, lib.particleBurst, 64);
  burstMesh.frustumCulled = false;
  for (let i = 0; i < 64; i++) {
    dummy.position.set(0, -50, 0);
    dummy.scale.set(0, 0, 0);
    dummy.updateMatrix();
    burstMesh.setMatrixAt(i, dummy.matrix);
    burstMesh.setColorAt(i, new THREE.Color(0xfbbf24));
  }
  burstMesh.instanceMatrix.needsUpdate = true;
  if (burstMesh.instanceColor) burstMesh.instanceColor.needsUpdate = true;
  scene.add(burstMesh);

  // Dynamic Atmospheric Weather Particles Pool (520 points, zero per-frame allocations)
  const weatherCount = 520;
  const weatherPositions = new Float32Array(weatherCount * 3);
  for (let i = 0; i < weatherCount; i++) {
    weatherPositions[i * 3] = (Math.random() - 0.5) * 120;
    weatherPositions[i * 3 + 1] = Math.random() * 44;
    weatherPositions[i * 3 + 2] = (Math.random() - 0.5) * 120;
  }
  const weatherGeo = new THREE.BufferGeometry();
  const weatherAttr = new THREE.BufferAttribute(weatherPositions, 3);
  weatherAttr.setUsage(THREE.DynamicDrawUsage);
  weatherGeo.setAttribute('position', weatherAttr);
  disposables.push(weatherGeo);
  const weatherPoints = new THREE.Points(weatherGeo, lib.weatherMat);
  weatherPoints.visible = false;
  weatherPoints.frustumCulled = false;
  scene.add(weatherPoints);

  let currentBiome: EnvironmentBiome = 'canyon_basin';
  let currentWeather: WeatherMode = 'clear';

  const applyPipeline = (
    pipeline: RenderPipelineConfig,
    targetScene: THREE.Scene,
    targetRenderer: THREE.WebGLRenderer
  ) => {
    if (pipeline.biome !== currentBiome) {
      currentBiome = pipeline.biome;
      rebuildTerrainAndProps(currentBiome);
    }
    const pal = biomePalette[pipeline.biome] || biomePalette.canyon_basin;

    // Update atmospheric sky shader + solar directional light angle
    const elRad = THREE.MathUtils.degToRad(Math.max(2, Math.min(82, pipeline.sunElevationDeg)));
    const azRad = THREE.MathUtils.degToRad(pipeline.sunAzimuthDeg);
    const sx = Math.cos(elRad) * Math.sin(azRad);
    const sy = Math.sin(elRad);
    const sz = Math.cos(elRad) * Math.cos(azRad);
    (lib.skyDomeMat.uniforms.uSunDir.value as THREE.Vector3).set(sx, sy, sz).normalize();
    (lib.skyDomeMat.uniforms.uZenithColor.value as THREE.Color).setHex(pal.zenith);
    (lib.skyDomeMat.uniforms.uHorizonColor.value as THREE.Color).setHex(pal.horizon);
    (lib.skyDomeMat.uniforms.uGlowColor.value as THREE.Color).setHex(pal.glow);

    keyLight.position.set(sx * 54, Math.max(8, sy * 54), sz * 54);
    targetScene.fog = new THREE.FogExp2(pal.fog, pipeline.fogDensity);
    targetRenderer.toneMappingExposure = pipeline.exposure;

    // Water visibility & Gerstner wave amplitude
    waterMesh.visible = Boolean(pipeline.waterEnabled);
    waterMesh.position.y = pipeline.waterLevel;
    lib.waterUniforms.uWaveAmp.value = pipeline.waveAmplitude;

    // Weather configuration
    currentWeather = pipeline.weather;
    weatherPoints.visible = currentWeather !== 'clear';
    if (currentWeather === 'rain') {
      lib.weatherMat.color.setHex(0xbae6fd);
      lib.weatherMat.size = 0.28;
      lib.weatherMat.opacity = 0.72;
    } else if (currentWeather === 'snow') {
      lib.weatherMat.color.setHex(0xf8fafc);
      lib.weatherMat.size = 0.42;
      lib.weatherMat.opacity = 0.85;
    } else if (currentWeather === 'ash') {
      lib.weatherMat.color.setHex(0xfb923c);
      lib.weatherMat.size = 0.36;
      lib.weatherMat.opacity = 0.78;
    } else if (currentWeather === 'spores') {
      lib.weatherMat.color.setHex(0x34d399);
      lib.weatherMat.size = 0.45;
      lib.weatherMat.opacity = 0.85;
    }
  };

  const updateAtmosphere = (dt: number, elapsedSec: number) => {
    lib.waterUniforms.uTime.value = elapsedSec;
    if (!weatherPoints.visible || currentWeather === 'clear') return;

    const fallSpeed =
      currentWeather === 'rain'
        ? 34
        : currentWeather === 'snow'
          ? 5.5
          : currentWeather === 'ash'
            ? 3.8
            : -2.2; // spores float gently upward!
    const driftX = currentWeather === 'rain' ? 3.5 : Math.sin(elapsedSec * 0.9) * 2.4;

    for (let i = 0; i < weatherCount; i++) {
      const idx = i * 3;
      weatherPositions[idx] += driftX * dt;
      weatherPositions[idx + 1] -= fallSpeed * dt;
      if (weatherPositions[idx + 1] < 0) weatherPositions[idx + 1] = 44;
      if (weatherPositions[idx + 1] > 44) weatherPositions[idx + 1] = 0.5;
      if (weatherPositions[idx] > 60) weatherPositions[idx] = -60;
      if (weatherPositions[idx] < -60) weatherPositions[idx] = 60;
    }
    weatherAttr.needsUpdate = true;
  };

  return {
    lightingRig: {
      keyLight,
      hemiLight,
      rimLight,
      rectLights,
      applyPreset,
      applyPipeline,
      updateAtmosphere
    },
    burstMesh,
    disposables
  };
}

export function createAgentParticipantGroup(
  lib: SceneMaterialLibrary,
  roleHex: string
): {
  root: THREE.Group;
  haloRing: THREE.Mesh;
  coreMesh: THREE.Mesh;
  thrusterCone: THREE.Mesh;
  packetIndicator: THREE.Mesh;
  disposables: Array<{ dispose: () => void }>;
} {
  const root = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];
  const regGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposables.push(g);
    return g;
  };
  const roleMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(roleHex),
    emissive: new THREE.Color(roleHex),
    emissiveIntensity: 1.4,
    metalness: 0.35,
    roughness: 0.22
  });
  disposables.push(roleMat);

  // 1. Sleek dart fuselage
  const bodyShape = new THREE.Shape();
  bodyShape.moveTo(0, 1.9);
  bodyShape.lineTo(0.55, 0.35);
  bodyShape.lineTo(0.62, -1.25);
  bodyShape.lineTo(-0.62, -1.25);
  bodyShape.lineTo(-0.55, 0.35);
  bodyShape.closePath();

  const bodyGeo = regGeo(
    new THREE.ExtrudeGeometry(bodyShape, {
      depth: 0.28,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.07,
      bevelSegments: 2
    })
  );
  bodyGeo.rotateX(Math.PI / 2);
  const fuselage = new THREE.Mesh(bodyGeo, lib.hullDarkTrim);
  fuselage.position.y = 0.72;
  fuselage.castShadow = true;
  root.add(fuselage);

  // 2. Twin Swept Wings
  const wingGeo = regGeo(new THREE.BoxGeometry(2.9, 0.09, 0.78));
  const wings = new THREE.Mesh(wingGeo, lib.hullPrimary);
  wings.position.set(0, 0.62, -0.25);
  wings.castShadow = true;
  root.add(wings);

  // 3. Role-Colored Beacon Core
  const coreGeo = regGeo(new THREE.OctahedronGeometry(0.32, 0));
  const coreMesh = new THREE.Mesh(coreGeo, roleMat);
  coreMesh.position.set(0, 1.08, 0.15);
  root.add(coreMesh);

  // 4. Sensor Halo Gimbal
  const haloGeo = regGeo(new THREE.TorusGeometry(0.68, 0.045, 8, 24));
  haloGeo.rotateX(Math.PI / 2);
  const haloRing = new THREE.Mesh(haloGeo, roleMat);
  haloRing.position.set(0, 1.05, -0.1);
  root.add(haloRing);

  // 5. Rear Plasma Thruster Cone
  const coneGeo = regGeo(new THREE.ConeGeometry(0.22, 0.9, 12));
  coneGeo.rotateX(-Math.PI / 2);
  const thrusterCone = new THREE.Mesh(coneGeo, roleMat);
  thrusterCone.position.set(0, 0.62, -1.65);
  root.add(thrusterCone);

  // 6. Carried Packet Payload Indicator (visible when routing packets)
  const pktGeo = regGeo(new THREE.IcosahedronGeometry(0.28, 0));
  const packetIndicator = new THREE.Mesh(pktGeo, lib.packetOrbMat);
  packetIndicator.position.set(0, 1.68, 0);
  packetIndicator.visible = false;
  root.add(packetIndicator);

  // Contact shadow disc
  const shadowGeo = regGeo(new THREE.PlaneGeometry(3.8, 4.2));
  shadowGeo.rotateX(-Math.PI / 2);
  const shadow = new THREE.Mesh(shadowGeo, lib.contactShadow);
  shadow.position.y = 0.025;
  root.add(shadow);

  return { root, haloRing, coreMesh, thrusterCone, packetIndicator, disposables };
}

export function createProcessNodeGroup(
  lib: SceneMaterialLibrary,
  kind: ProcessEntityKind
): {
  root: THREE.Group;
  coreMesh: THREE.Mesh;
  ringMesh: THREE.Mesh;
  setFaulty: (faulty: boolean) => void;
  disposables: THREE.BufferGeometry[];
} {
  const root = new THREE.Group();
  const disposables: THREE.BufferGeometry[] = [];
  const regGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposables.push(g);
    return g;
  };

  const baseGeo = regGeo(new THREE.CylinderGeometry(1.15, 1.45, 0.34, 8));
  const base = new THREE.Mesh(baseGeo, lib.hullDarkTrim);
  base.position.y = 0.17;
  base.receiveShadow = true;
  base.castShadow = true;
  root.add(base);

  const initialMat =
    kind === 'relay_source'
      ? lib.relaySourceMat
      : kind === 'relay_processor'
        ? lib.relayProcessorMat
        : kind === 'relay_sink'
          ? lib.relaySinkMat
          : kind === 'gravity_well'
            ? lib.gravityWellMat
            : lib.validatorHealthyMat;

  const towerGeo = regGeo(
    kind === 'gravity_well'
      ? new THREE.CylinderGeometry(0.42, 0.95, 1.1, 16)
      : new THREE.CylinderGeometry(0.58, 0.84, 1.7, 6)
  );
  const tower = new THREE.Mesh(towerGeo, lib.hullPrimary);
  tower.position.y = kind === 'gravity_well' ? 0.7 : 1.05;
  tower.castShadow = true;
  root.add(tower);

  const coreGeo = regGeo(
    kind === 'gravity_well'
      ? new THREE.SphereGeometry(0.66, 20, 16)
      : kind === 'relay_sink'
        ? new THREE.BoxGeometry(0.95, 0.95, 0.95)
        : new THREE.OctahedronGeometry(0.68, 0)
  );
  const coreMesh = new THREE.Mesh(coreGeo, initialMat);
  coreMesh.position.y = kind === 'gravity_well' ? 1.85 : 2.55;
  root.add(coreMesh);

  const ringGeo = regGeo(
    new THREE.TorusGeometry(kind === 'gravity_well' ? 2.4 : 1.35, 0.065, 10, 32)
  );
  ringGeo.rotateX(Math.PI / 2);
  const ringMesh = new THREE.Mesh(ringGeo, initialMat);
  ringMesh.position.y = kind === 'gravity_well' ? 1.25 : 2.25;
  root.add(ringMesh);

  const shadowGeo = regGeo(new THREE.PlaneGeometry(3.8, 3.8));
  shadowGeo.rotateX(-Math.PI / 2);
  const shadow = new THREE.Mesh(shadowGeo, lib.contactShadow);
  shadow.position.y = 0.025;
  root.add(shadow);

  const setFaulty = (faulty: boolean) => {
    const nextMat = faulty ? lib.validatorFaultMat : initialMat;
    coreMesh.material = nextMat;
    ringMesh.material = nextMat;
  };

  return { root, coreMesh, ringMesh, setFaulty, disposables };
}

export function createDynamicLinkLines(
  lib: SceneMaterialLibrary,
  maxSegments = 32
): {
  lines: THREE.LineSegments;
  setSegment: (idx: number, x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) => void;
  commitCount: (segmentCount: number) => void;
  dispose: () => void;
} {
  const positions = new Float32Array(maxSegments * 6);
  const geo = new THREE.BufferGeometry();
  const attr = new THREE.BufferAttribute(positions, 3);
  attr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', attr);
  geo.setDrawRange(0, 0);

  const lines = new THREE.LineSegments(geo, lib.linkBeamMat);
  lines.frustumCulled = false;

  const setSegment = (idx: number, x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) => {
    if (idx < 0 || idx >= maxSegments) return;
    const base = idx * 6;
    positions[base] = x1;
    positions[base + 1] = y1;
    positions[base + 2] = z1;
    positions[base + 3] = x2;
    positions[base + 4] = y2;
    positions[base + 5] = z2;
  };

  const commitCount = (segmentCount: number) => {
    const clamped = Math.max(0, Math.min(maxSegments, segmentCount));
    geo.setDrawRange(0, clamped * 2);
    attr.needsUpdate = true;
  };

  const dispose = () => {
    geo.dispose();
  };

  return { lines, setSegment, commitCount, dispose };
}

export function createConceptStructureGroup(
  lib: SceneMaterialLibrary,
  conceptKind: ConceptStructureKind,
  colorHex: string,
  scale = 1
): {
  root: THREE.Group;
  rotator: THREE.Mesh;
  disposables: Array<{ dispose: () => void }>;
} {
  const root = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];
  const regGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposables.push(g);
    return g;
  };
  const customMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    emissive: new THREE.Color(colorHex),
    emissiveIntensity: 0.9,
    metalness: 0.5,
    roughness: 0.25
  });
  disposables.push(customMat);

  let rotator: THREE.Mesh;

  if (conceptKind === 'skyscraper') {
    const bodyGeo = regGeo(new THREE.BoxGeometry(2.6, 11.5, 2.6));
    const body = new THREE.Mesh(bodyGeo, lib.skyscraperMat);
    body.position.y = 5.75;
    body.castShadow = true;
    body.receiveShadow = true;
    root.add(body);

    const crownGeo = regGeo(new THREE.CylinderGeometry(0.18, 0.7, 3.2, 6));
    const crown = new THREE.Mesh(crownGeo, customMat);
    crown.position.y = 13.1;
    root.add(crown);
    rotator = crown;
  } else if (conceptKind === 'crystal_cluster') {
    const baseGeo = regGeo(new THREE.CylinderGeometry(1.4, 1.8, 0.35, 8));
    const base = new THREE.Mesh(baseGeo, lib.monolithRock);
    base.position.y = 0.17;
    root.add(base);

    const shardGeo = regGeo(new THREE.OctahedronGeometry(0.95, 0));
    shardGeo.scale(0.65, 2.6, 0.65);
    const main = new THREE.Mesh(shardGeo, customMat);
    main.position.y = 2.4;
    root.add(main);
    rotator = main;

    for (let i = 0; i < 4; i++) {
      const side = new THREE.Mesh(shardGeo, customMat);
      const a = (i / 4) * Math.PI * 2;
      side.position.set(Math.cos(a) * 0.9, 1.3, Math.sin(a) * 0.9);
      side.rotation.set(Math.sin(a) * 0.35, a, Math.cos(a) * 0.35);
      side.scale.setScalar(0.55);
      root.add(side);
    }
  } else if (conceptKind === 'habitat_dome') {
    const ringGeo = regGeo(new THREE.CylinderGeometry(2.4, 2.6, 0.45, 24));
    const ring = new THREE.Mesh(ringGeo, lib.hullDarkTrim);
    ring.position.y = 0.22;
    root.add(ring);

    const domeGeo = regGeo(new THREE.SphereGeometry(2.2, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2));
    const dome = new THREE.Mesh(domeGeo, lib.canopyGlass);
    dome.position.y = 0.42;
    root.add(dome);

    const coreGeo = regGeo(new THREE.TorusGeometry(1.2, 0.08, 8, 24));
    coreGeo.rotateX(Math.PI / 2);
    const core = new THREE.Mesh(coreGeo, customMat);
    core.position.y = 1.65;
    root.add(core);
    rotator = core;
  } else if (conceptKind === 'sandstone_arch') {
    const archGeo = regGeo(new THREE.TorusGeometry(2.4, 0.52, 8, 20, Math.PI));
    const arch = new THREE.Mesh(archGeo, lib.monolithRock);
    arch.position.y = 0.2;
    arch.castShadow = true;
    root.add(arch);

    const orbGeo = regGeo(new THREE.OctahedronGeometry(0.55, 0));
    const orb = new THREE.Mesh(orbGeo, customMat);
    orb.position.y = 1.6;
    root.add(orb);
    rotator = orb;
  } else {
    // reactor_spire or orbital_pylon
    const plinthGeo = regGeo(new THREE.CylinderGeometry(1.1, 1.55, 0.5, 8));
    const plinth = new THREE.Mesh(plinthGeo, lib.hullDarkTrim);
    plinth.position.y = 0.25;
    root.add(plinth);

    const spireGeo = regGeo(new THREE.CylinderGeometry(0.32, 0.85, 5.2, 8));
    const spire = new THREE.Mesh(spireGeo, lib.hullPrimary);
    spire.position.y = 3.1;
    spire.castShadow = true;
    root.add(spire);

    const haloGeo = regGeo(new THREE.TorusGeometry(1.45, 0.08, 10, 28));
    haloGeo.rotateX(Math.PI / 2);
    const halo = new THREE.Mesh(haloGeo, customMat);
    halo.position.y = 4.6;
    root.add(halo);
    rotator = halo;
  }

  root.scale.setScalar(Math.max(0.5, Math.min(2.2, scale)));
  return { root, rotator, disposables };
}

export function createRaidBossGroup(lib: SceneMaterialLibrary): {
  root: THREE.Group;
  crownRing: THREE.Mesh;
  coreOrb: THREE.Mesh;
  aoeRing: THREE.Mesh;
  disposables: THREE.BufferGeometry[];
} {
  const root = new THREE.Group();
  const disposables: THREE.BufferGeometry[] = [];
  const regGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposables.push(g);
    return g;
  };

  // Monolithic Obsidian Pedestal Base
  const plinthGeo = regGeo(new THREE.CylinderGeometry(2.1, 2.7, 0.75, 8));
  const plinth = new THREE.Mesh(plinthGeo, lib.hullDarkTrim);
  plinth.position.y = 0.375;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  root.add(plinth);

  // Armored Colossal Chassis (Extruded beveled carapace)
  const torsoGeo = regGeo(new THREE.CylinderGeometry(1.45, 1.95, 3.6, 8));
  const torso = new THREE.Mesh(torsoGeo, lib.hullPrimary);
  torso.position.y = 2.45;
  torso.castShadow = true;
  root.add(torso);

  // Dual Swept Shoulder Pauldrons
  const pauldronGeo = regGeo(new THREE.BoxGeometry(1.5, 1.85, 1.4));
  [-1.95, 1.95].forEach((px, idx) => {
    const pauldron = new THREE.Mesh(pauldronGeo, lib.sentinelArmor);
    pauldron.position.set(px, 3.65, 0);
    pauldron.rotation.z = idx === 0 ? 0.28 : -0.28;
    pauldron.castShadow = true;
    root.add(pauldron);
  });

  // Crimson Abyssal Raid Core
  const coreGeo = regGeo(new THREE.IcosahedronGeometry(0.92, 1));
  const coreOrb = new THREE.Mesh(coreGeo, lib.sentinelCore);
  coreOrb.position.y = 5.15;
  root.add(coreOrb);

  // Orbiting Obsidian-Gold Sigil Crown Ring
  const crownGeo = regGeo(new THREE.TorusGeometry(2.35, 0.14, 10, 32));
  crownGeo.rotateX(Math.PI / 2);
  const crownRing = new THREE.Mesh(crownGeo, lib.accentTrim);
  crownRing.position.y = 4.6;
  root.add(crownRing);

  // Ground AoE Raid Telegraph Ring
  const aoeGeo = regGeo(new THREE.TorusGeometry(4.6, 0.09, 8, 48));
  aoeGeo.rotateX(Math.PI / 2);
  const aoeRing = new THREE.Mesh(aoeGeo, lib.validatorFaultMat);
  aoeRing.position.y = 0.12;
  root.add(aoeRing);

  const shadowGeo = regGeo(new THREE.PlaneGeometry(7.2, 7.2));
  shadowGeo.rotateX(-Math.PI / 2);
  const shadow = new THREE.Mesh(shadowGeo, lib.contactShadow);
  shadow.position.y = 0.028;
  root.add(shadow);

  return { root, crownRing, coreOrb, aoeRing, disposables };
}

export interface FantasyHeroRig {
  root: THREE.Group;
  bodyRoot: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftWingPivot: THREE.Group;
  rightWingPivot: THREE.Group;
  cloakMesh: THREE.Mesh;
  groundAuraRing: THREE.Mesh;
  applyAppearance: (spec: CharacterAppearanceSpec) => void;
  animateCharacter: (speed: number, elapsedSec: number, attackSwing: number) => void;
  disposables: Array<{ dispose: () => void }>;
}

export function createFantasyHeroGroup(
  lib: SceneMaterialLibrary,
  initialSpec?: Partial<CharacterAppearanceSpec>
): FantasyHeroRig {
  const spec: CharacterAppearanceSpec = {
    ...createDefaultCharacterAppearance(
      initialSpec?.race || 'Highborne Aether-Elf',
      initialSpec?.heroClass || 'Vanguard Paladin'
    ),
    ...(initialSpec || {})
  };

  const root = new THREE.Group();
  root.name = 'FantasyHeroAvatar';
  const bodyRoot = new THREE.Group();
  root.add(bodyRoot);

  const disposables: Array<{ dispose: () => void }> = [];
  const regGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposables.push(g);
    return g;
  };
  const regMat = <T extends THREE.Material>(m: T): T => {
    disposables.push(m);
    return m;
  };

  // Dedicated customizable PBR materials for this hero instance
  const skinMat = regMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(spec.skinToneHex),
      roughness: 0.52,
      metalness: 0.08
    })
  );
  const hairMat = regMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(spec.hairColorHex),
      roughness: 0.42,
      metalness: 0.18
    })
  );
  const armorMat = regMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(spec.primaryArmorHex),
      roughness: 0.26,
      metalness: 0.78
    })
  );
  const trimMat = regMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(spec.secondaryTrimHex),
      emissive: new THREE.Color(spec.secondaryTrimHex),
      emissiveIntensity: 0.28,
      roughness: 0.22,
      metalness: 0.88
    })
  );
  const glowMat = regMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(spec.weaponGlowHex),
      emissive: new THREE.Color(spec.weaponGlowHex),
      emissiveIntensity: 1.75,
      roughness: 0.15,
      metalness: 0.35
    })
  );
  const cloakMat = regMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(spec.primaryArmorHex).multiplyScalar(0.65),
      roughness: 0.65,
      metalness: 0.12,
      side: THREE.DoubleSide
    })
  );

  // 1. Ground Class Aura Ring + Contact Shadow
  const auraGeo = regGeo(new THREE.TorusGeometry(1.18, 0.04, 8, 36));
  auraGeo.rotateX(Math.PI / 2);
  const groundAuraRing = new THREE.Mesh(auraGeo, glowMat);
  groundAuraRing.position.y = 0.05;
  root.add(groundAuraRing);

  const shadowGeo = regGeo(new THREE.PlaneGeometry(3.2, 3.2));
  shadowGeo.rotateX(-Math.PI / 2);
  const shadow = new THREE.Mesh(shadowGeo, lib.contactShadow);
  shadow.position.y = 0.025;
  root.add(shadow);

  // 2. Articulated Legs (Hip pivots at y = 1.05)
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.28, 1.05, 0);
  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.28, 1.05, 0);
  bodyRoot.add(leftLegPivot, rightLegPivot);

  const thighGeo = regGeo(new THREE.CylinderGeometry(0.18, 0.15, 0.52, 10));
  const greaveGeo = regGeo(new THREE.CylinderGeometry(0.16, 0.13, 0.52, 10));
  const kneeGeo = regGeo(new THREE.OctahedronGeometry(0.14, 0));
  const bootGeo = regGeo(new THREE.BoxGeometry(0.24, 0.16, 0.42));

  [leftLegPivot, rightLegPivot].forEach((legPivot) => {
    const thigh = new THREE.Mesh(thighGeo, armorMat);
    thigh.position.set(0, -0.26, 0);
    thigh.castShadow = true;
    legPivot.add(thigh);

    const knee = new THREE.Mesh(kneeGeo, trimMat);
    knee.position.set(0, -0.52, 0.12);
    legPivot.add(knee);

    const greave = new THREE.Mesh(greaveGeo, armorMat);
    greave.position.set(0, -0.76, 0);
    greave.castShadow = true;
    legPivot.add(greave);

    const boot = new THREE.Mesh(bootGeo, trimMat);
    boot.position.set(0, -0.97, 0.08);
    boot.castShadow = true;
    legPivot.add(boot);
  });

  // 3. Pelvis, Belt, Tassets & Optional Caster Robe Skirt
  const pelvisGeo = regGeo(new THREE.CylinderGeometry(0.42, 0.36, 0.28, 12));
  const pelvis = new THREE.Mesh(pelvisGeo, armorMat);
  pelvis.position.set(0, 1.12, 0);
  pelvis.castShadow = true;
  bodyRoot.add(pelvis);

  const beltGeo = regGeo(new THREE.CylinderGeometry(0.45, 0.45, 0.12, 14));
  const belt = new THREE.Mesh(beltGeo, trimMat);
  belt.position.set(0, 1.22, 0);
  bodyRoot.add(belt);

  const buckleGeo = regGeo(new THREE.OctahedronGeometry(0.13, 0));
  const buckle = new THREE.Mesh(buckleGeo, glowMat);
  buckle.position.set(0, 1.22, 0.44);
  bodyRoot.add(buckle);

  const robeSkirtGeo = regGeo(new THREE.CylinderGeometry(0.44, 0.72, 0.92, 14, 1, true));
  const robeSkirtMesh = new THREE.Mesh(robeSkirtGeo, cloakMat);
  robeSkirtMesh.position.set(0, 0.68, 0);
  bodyRoot.add(robeSkirtMesh);

  // 4. Sculpted Armored Cuirass / Torso
  const torsoPoints = [
    new THREE.Vector2(0.36, 0.0),
    new THREE.Vector2(0.48, 0.38),
    new THREE.Vector2(0.56, 0.78),
    new THREE.Vector2(0.42, 0.96),
    new THREE.Vector2(0.22, 1.02)
  ];
  const torsoGeo = regGeo(new THREE.LatheGeometry(torsoPoints, 14));
  torsoGeo.scale(1.08, 1.0, 0.76);
  const torsoMesh = new THREE.Mesh(torsoGeo, armorMat);
  torsoMesh.position.set(0, 1.24, 0);
  torsoMesh.castShadow = true;
  bodyRoot.add(torsoMesh);

  // Chest Heart-Rune Core
  const chestGemGeo = regGeo(new THREE.OctahedronGeometry(0.16, 0));
  const chestGem = new THREE.Mesh(chestGemGeo, glowMat);
  chestGem.position.set(0, 1.82, 0.4);
  bodyRoot.add(chestGem);

  // 5. Flowing Royal Cloak / Mantle
  const cloakGeo = regGeo(new THREE.PlaneGeometry(1.18, 1.85, 4, 6));
  const cloakPos = cloakGeo.attributes.position;
  for (let i = 0; i < cloakPos.count; i++) {
    const py = cloakPos.getY(i);
    const factor = (0.925 - py) / 1.85; // 0 at top, 1 at bottom
    cloakPos.setX(i, cloakPos.getX(i) * (0.75 + factor * 0.55));
    cloakPos.setZ(i, -Math.sin(factor * Math.PI) * 0.16 - factor * 0.18);
  }
  cloakGeo.computeVertexNormals();
  const cloakMesh = new THREE.Mesh(cloakGeo, cloakMat);
  cloakMesh.position.set(0, 1.25, -0.38);
  cloakMesh.castShadow = true;
  bodyRoot.add(cloakMesh);

  // 6. Articulated Wings (Left & Right Wing Pivots on upper back)
  const leftWingPivot = new THREE.Group();
  leftWingPivot.position.set(-0.26, 1.98, -0.34);
  const rightWingPivot = new THREE.Group();
  rightWingPivot.position.set(0.26, 1.98, -0.34);
  bodyRoot.add(leftWingPivot, rightWingPivot);

  const wingFeatherGeo = regGeo(new THREE.ConeGeometry(0.16, 1.65, 5));
  wingFeatherGeo.rotateZ(-Math.PI / 2);

  [leftWingPivot, rightWingPivot].forEach((wp, sideIdx) => {
    const dir = sideIdx === 0 ? -1 : 1;
    for (let f = 0; f < 4; f++) {
      const feather = new THREE.Mesh(wingFeatherGeo, f % 2 === 0 ? glowMat : trimMat);
      feather.scale.set(1 - f * 0.14, 0.55, 0.25);
      feather.position.set(dir * (0.65 - f * 0.08), 0.35 - f * 0.24, -0.12);
      feather.rotation.z = dir * (0.38 - f * 0.22);
      wp.add(feather);
    }
  });

  // 7. Head, Glowing Eyes, Race Ears/Horns/Beard/Antlers/Halo & Hair/Helm
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 2.48, 0);
  bodyRoot.add(headGroup);

  const headGeo = regGeo(new THREE.SphereGeometry(0.29, 16, 14));
  headGeo.scale(0.92, 1.08, 0.96);
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  const eyeGeo = regGeo(new THREE.SphereGeometry(0.042, 8, 8));
  const leftEye = new THREE.Mesh(eyeGeo, glowMat);
  leftEye.position.set(-0.1, 0.04, 0.25);
  const rightEye = new THREE.Mesh(eyeGeo, glowMat);
  rightEye.position.set(0.1, 0.04, 0.25);
  headGroup.add(leftEye, rightEye);

  // Race Feature Subgroups
  const elfEarsGroup = new THREE.Group();
  const earGeo = regGeo(new THREE.ConeGeometry(0.06, 0.38, 5));
  [-1, 1].forEach((dir) => {
    const ear = new THREE.Mesh(earGeo, skinMat);
    ear.position.set(dir * 0.34, 0.06, -0.02);
    ear.rotation.z = -dir * 1.15;
    ear.rotation.x = -0.25;
    elfEarsGroup.add(ear);
  });
  headGroup.add(elfEarsGroup);

  const dragonHornsGroup = new THREE.Group();
  const hornGeo = regGeo(new THREE.ConeGeometry(0.075, 0.56, 7));
  [-1, 1].forEach((dir) => {
    const horn = new THREE.Mesh(hornGeo, trimMat);
    horn.position.set(dir * 0.22, 0.34, -0.08);
    horn.rotation.z = -dir * 0.42;
    horn.rotation.x = -0.48;
    dragonHornsGroup.add(horn);
  });
  headGroup.add(dragonHornsGroup);

  const dwarfBeardGroup = new THREE.Group();
  const beardGeo = regGeo(new THREE.ConeGeometry(0.22, 0.62, 7));
  const beardMain = new THREE.Mesh(beardGeo, hairMat);
  beardMain.rotation.x = Math.PI;
  beardMain.position.set(0, -0.32, 0.18);
  dwarfBeardGroup.add(beardMain);
  headGroup.add(dwarfBeardGroup);

  const faeAntlersGroup = new THREE.Group();
  const antlerGeo = regGeo(new THREE.CylinderGeometry(0.02, 0.045, 0.52, 6));
  [-1, 1].forEach((dir) => {
    const mainBranch = new THREE.Mesh(antlerGeo, trimMat);
    mainBranch.position.set(dir * 0.2, 0.38, 0);
    mainBranch.rotation.z = -dir * 0.45;
    const subBranch = new THREE.Mesh(antlerGeo, glowMat);
    subBranch.scale.setScalar(0.65);
    subBranch.position.set(dir * 0.32, 0.48, 0.08);
    subBranch.rotation.z = -dir * 0.85;
    faeAntlersGroup.add(mainBranch, subBranch);
  });
  headGroup.add(faeAntlersGroup);

  const nephilimHaloGroup = new THREE.Group();
  const headHaloGeo = regGeo(new THREE.TorusGeometry(0.36, 0.032, 8, 24));
  headHaloGeo.rotateX(Math.PI / 2);
  const headHalo = new THREE.Mesh(headHaloGeo, glowMat);
  headHalo.position.set(0, 0.46, -0.05);
  nephilimHaloGroup.add(headHalo);
  headGroup.add(nephilimHaloGroup);

  // Hair & Crown/Cowl Subgroups
  const hairCapGeo = regGeo(new THREE.SphereGeometry(0.31, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.62));
  const hairCap = new THREE.Mesh(hairCapGeo, hairMat);
  hairCap.position.y = 0.03;
  hairCap.rotation.x = -0.22;
  headGroup.add(hairCap);

  const crownGeo = regGeo(new THREE.CylinderGeometry(0.28, 0.26, 0.14, 8, 1, true));
  const crownMesh = new THREE.Mesh(crownGeo, trimMat);
  crownMesh.position.set(0, 0.24, 0);
  headGroup.add(crownMesh);

  const cowlGeo = regGeo(new THREE.SphereGeometry(0.35, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.72));
  const cowlMesh = new THREE.Mesh(cowlGeo, armorMat);
  cowlMesh.position.set(0, 0.04, -0.02);
  headGroup.add(cowlMesh);

  // 8. Articulated Arms, Pauldrons & Class Weapons/Offhands
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.62, 2.08, 0);
  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.62, 2.08, 0);
  bodyRoot.add(leftArmPivot, rightArmPivot);

  const pauldronGeo = regGeo(new THREE.SphereGeometry(0.26, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.6));
  const armGeo = regGeo(new THREE.CylinderGeometry(0.13, 0.11, 0.68, 10));
  const gauntletGeo = regGeo(new THREE.BoxGeometry(0.18, 0.26, 0.2));

  [leftArmPivot, rightArmPivot].forEach((armPivot, idx) => {
    const dir = idx === 0 ? -1 : 1;
    const pauldron = new THREE.Mesh(pauldronGeo, trimMat);
    pauldron.position.set(dir * 0.06, 0.08, 0);
    pauldron.rotation.z = -dir * 0.35;
    pauldron.scale.set(1.25, 1.0, 1.15);
    pauldron.castShadow = true;
    armPivot.add(pauldron);

    const upperArm = new THREE.Mesh(armGeo, armorMat);
    upperArm.position.set(dir * 0.04, -0.34, 0);
    upperArm.castShadow = true;
    armPivot.add(upperArm);

    const gauntlet = new THREE.Mesh(gauntletGeo, trimMat);
    gauntlet.position.set(dir * 0.04, -0.68, 0.04);
    armPivot.add(gauntlet);
  });

  // Main-Hand Weapon Mount (Right Hand)
  const weaponHoldGroup = new THREE.Group();
  weaponHoldGroup.position.set(0.06, -0.74, 0.18);
  rightArmPivot.add(weaponHoldGroup);

  // Off-Hand Mount (Left Hand)
  const offhandHoldGroup = new THREE.Group();
  offhandHoldGroup.position.set(-0.06, -0.72, 0.18);
  leftArmPivot.add(offhandHoldGroup);

  // Build Class-Specific 3D Weapons
  // A. Paladin Greatsword
  const paladinSwordGroup = new THREE.Group();
  const hiltGeo = regGeo(new THREE.CylinderGeometry(0.04, 0.05, 0.45, 8));
  const crossguardGeo = regGeo(new THREE.BoxGeometry(0.58, 0.09, 0.14));
  const bladeGeo = regGeo(new THREE.BoxGeometry(0.16, 1.95, 0.05));
  const hilt = new THREE.Mesh(hiltGeo, trimMat);
  const guard = new THREE.Mesh(crossguardGeo, trimMat);
  guard.position.y = 0.22;
  const blade = new THREE.Mesh(bladeGeo, glowMat);
  blade.position.y = 1.22;
  paladinSwordGroup.add(hilt, guard, blade);
  paladinSwordGroup.rotation.x = Math.PI / 2.3;
  weaponHoldGroup.add(paladinSwordGroup);

  // B. Mage Archstaff & Summoner Glaive
  const mageStaffGroup = new THREE.Group();
  const shaftGeo = regGeo(new THREE.CylinderGeometry(0.045, 0.04, 2.55, 8));
  const shaft = new THREE.Mesh(shaftGeo, trimMat);
  shaft.position.y = 0.65;
  const staffRingGeo = regGeo(new THREE.TorusGeometry(0.28, 0.04, 8, 20));
  const staffRing = new THREE.Mesh(staffRingGeo, trimMat);
  staffRing.position.y = 1.98;
  const staffCrystalGeo = regGeo(new THREE.OctahedronGeometry(0.19, 0));
  const staffCrystal = new THREE.Mesh(staffCrystalGeo, glowMat);
  staffCrystal.position.y = 1.98;
  mageStaffGroup.add(shaft, staffRing, staffCrystal);
  mageStaffGroup.rotation.x = Math.PI / 3.2;
  weaponHoldGroup.add(mageStaffGroup);

  // C. Assassin Twin Dagger
  const assassinDaggerGroup = new THREE.Group();
  const daggerBladeGeo = regGeo(new THREE.ConeGeometry(0.09, 1.05, 4));
  const daggerBlade = new THREE.Mesh(daggerBladeGeo, glowMat);
  daggerBlade.position.y = 0.55;
  assassinDaggerGroup.add(daggerBlade);
  assassinDaggerGroup.rotation.x = Math.PI / 2.1;
  weaponHoldGroup.add(assassinDaggerGroup);

  // D. Berserker Colossal Dual-Bearded Greataxe
  const berserkerAxeGroup = new THREE.Group();
  const axeShaft = new THREE.Mesh(shaftGeo, trimMat);
  axeShaft.position.y = 0.55;
  const axeHeadGeo = regGeo(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 12, 1, false, 0, Math.PI));
  axeHeadGeo.rotateZ(Math.PI / 2);
  const axeBladeL = new THREE.Mesh(axeHeadGeo, glowMat);
  axeBladeL.position.set(0, 1.55, 0.08);
  const axeBladeR = new THREE.Mesh(axeHeadGeo, glowMat);
  axeBladeR.rotation.y = Math.PI;
  axeBladeR.position.set(0, 1.55, -0.08);
  berserkerAxeGroup.add(axeShaft, axeBladeL, axeBladeR);
  berserkerAxeGroup.rotation.x = Math.PI / 2.5;
  weaponHoldGroup.add(berserkerAxeGroup);

  // Off-Hand Items: Shield (Paladin) vs Floating Astrolabe/Chalice/Off-Dagger
  const paladinShieldGroup = new THREE.Group();
  const shieldGeo = regGeo(new THREE.BoxGeometry(0.76, 1.18, 0.1));
  const shieldBody = new THREE.Mesh(shieldGeo, armorMat);
  const shieldTrim = new THREE.Mesh(regGeo(new THREE.OctahedronGeometry(0.22, 0)), glowMat);
  shieldTrim.position.z = 0.08;
  paladinShieldGroup.add(shieldBody, shieldTrim);
  paladinShieldGroup.position.set(-0.22, 0.15, 0.15);
  paladinShieldGroup.rotation.y = -0.45;
  offhandHoldGroup.add(paladinShieldGroup);

  const casterOrbGroup = new THREE.Group();
  const orbCore = new THREE.Mesh(regGeo(new THREE.OctahedronGeometry(0.2, 0)), glowMat);
  const orbGimbal = new THREE.Mesh(regGeo(new THREE.TorusGeometry(0.32, 0.03, 8, 20)), trimMat);
  casterOrbGroup.add(orbCore, orbGimbal);
  casterOrbGroup.position.set(-0.25, 0.35, 0.35);
  offhandHoldGroup.add(casterOrbGroup);

  const offhandDaggerGroup = new THREE.Group();
  const offBlade = new THREE.Mesh(daggerBladeGeo, glowMat);
  offBlade.position.y = -0.45;
  offBlade.rotation.x = Math.PI;
  offhandDaggerGroup.add(offBlade);
  offhandDaggerGroup.rotation.x = Math.PI / 2.2;
  offhandHoldGroup.add(offhandDaggerGroup);

  const applyAppearance = (next: CharacterAppearanceSpec) => {
    skinMat.color.set(next.skinToneHex || '#f3d9ca');
    hairMat.color.set(next.hairColorHex || '#e2e8f0');
    armorMat.color.set(next.primaryArmorHex || '#cbd5e1');
    trimMat.color.set(next.secondaryTrimHex || '#f59e0b');
    trimMat.emissive.set(next.secondaryTrimHex || '#f59e0b');
    glowMat.color.set(next.weaponGlowHex || '#fbbf24');
    glowMat.emissive.set(next.weaponGlowHex || '#fbbf24');
    cloakMat.color.set(next.primaryArmorHex || '#1e293b').multiplyScalar(0.68);

    // Body scale & racial proportions
    const s = Math.max(0.8, Math.min(1.3, next.bodyScale || 1.0));
    const widthScale =
      next.race === 'Starforged Dwarf'
        ? s * 1.24
        : next.race === 'Highborne Aether-Elf'
        ? s * 0.94
        : next.race === 'Draconic Vaelkori'
        ? s * 1.12
        : s;
    bodyRoot.scale.set(widthScale, s, widthScale);

    // Race features
    elfEarsGroup.visible = next.race === 'Highborne Aether-Elf' || next.race === 'Sylvan Fae-Kin';
    dragonHornsGroup.visible = next.race === 'Draconic Vaelkori' || next.hairStyle === 'horned_diadem';
    dwarfBeardGroup.visible = next.race === 'Starforged Dwarf' || next.hairStyle === 'braided_war';
    faeAntlersGroup.visible = next.race === 'Sylvan Fae-Kin';
    nephilimHaloGroup.visible = next.race === 'Abyssal Nephilim' || next.heroClass === 'Sylvana Cleric';

    // Hair / Helm
    cowlMesh.visible = next.hairStyle === 'hooded_cowl';
    crownMesh.visible = next.hairStyle === 'crowned_locks' || next.hairStyle === 'arcane_crest';
    hairCap.visible = !cowlMesh.visible;

    // Cloak & Wings
    cloakMesh.visible = next.cloakEnabled !== false;
    const hasWings = next.wingsStyle && next.wingsStyle !== 'none';
    leftWingPivot.visible = Boolean(hasWings);
    rightWingPivot.visible = Boolean(hasWings);

    // Class Weapons & Offhands
    const cls: MmorpgClass = next.heroClass || 'Vanguard Paladin';
    const isCaster = cls === 'Chronomancer Mage' || cls === 'Sylvana Cleric' || cls === 'Archon Summoner';
    robeSkirtMesh.visible = isCaster;

    paladinSwordGroup.visible = cls === 'Vanguard Paladin';
    mageStaffGroup.visible = isCaster;
    assassinDaggerGroup.visible = cls === 'Shadow Assassin';
    berserkerAxeGroup.visible = cls === 'Runeforge Berserker';

    paladinShieldGroup.visible = cls === 'Vanguard Paladin';
    casterOrbGroup.visible = isCaster;
    offhandDaggerGroup.visible = cls === 'Shadow Assassin' || cls === 'Runeforge Berserker';
  };

  applyAppearance(spec);

  const animateCharacter = (speed: number, elapsedSec: number, attackSwing: number) => {
    const moveFactor = Math.min(1, speed / 12);
    const stride = Math.sin(elapsedSec * 9.5) * 0.62 * moveFactor;

    leftLegPivot.rotation.x = stride;
    rightLegPivot.rotation.x = -stride;

    // Arm swing + weapon attack slash
    leftArmPivot.rotation.x = -stride * 0.7 + Math.sin(elapsedSec * 2.2) * 0.06;
    if (attackSwing > 0.01) {
      rightArmPivot.rotation.x = -1.35 * Math.sin(attackSwing * Math.PI);
      rightArmPivot.rotation.z = -0.35 * Math.sin(attackSwing * Math.PI);
    } else {
      rightArmPivot.rotation.x = stride * 0.75 + Math.cos(elapsedSec * 2.2) * 0.06;
      rightArmPivot.rotation.z = 0;
    }

    // Wing flap & cloak billow
    const flap = Math.sin(elapsedSec * (3.2 + moveFactor * 3.0)) * (0.22 + moveFactor * 0.18);
    leftWingPivot.rotation.y = 0.32 + flap;
    rightWingPivot.rotation.y = -0.32 - flap;
    cloakMesh.rotation.x = 0.12 + moveFactor * 0.42 + Math.sin(elapsedSec * 5.0) * 0.06;

    // Rotate offhand astrolabe & ground aura
    casterOrbGroup.rotation.y = elapsedSec * 2.4;
    groundAuraRing.rotation.z = elapsedSec * 0.9;
  };

  return {
    root,
    bodyRoot,
    leftLegPivot,
    rightLegPivot,
    leftArmPivot,
    rightArmPivot,
    leftWingPivot,
    rightWingPivot,
    cloakMesh,
    groundAuraRing,
    applyAppearance,
    animateCharacter,
    disposables
  };
}



