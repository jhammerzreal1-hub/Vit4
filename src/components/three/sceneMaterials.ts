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

export type MaterialFinishPreset =
  | 'titanium-amber'
  | 'obsidian-cyan'
  | 'ceramic-emerald'
  | 'forged-bronze';

export interface FinishConfig {
  id: MaterialFinishPreset;
  label: string;
  primaryColor: number;
  secondaryColor: number;
  accentColor: number;
  swatchHex: string;
}

export const FINISH_PRESETS: FinishConfig[] = [
  {
    id: 'titanium-amber',
    label: 'Titanium Amber',
    primaryColor: 0x3b4454,
    secondaryColor: 0x181c24,
    accentColor: 0xf59e0b,
    swatchHex: '#f59e0b'
  },
  {
    id: 'obsidian-cyan',
    label: 'Obsidian Cyan',
    primaryColor: 0x1b2230,
    secondaryColor: 0x0d121a,
    accentColor: 0x06b6d4,
    swatchHex: '#06b6d4'
  },
  {
    id: 'ceramic-emerald',
    label: 'Ceramic Emerald',
    primaryColor: 0xd4dce6,
    secondaryColor: 0x26323d,
    accentColor: 0x10b981,
    swatchHex: '#10b981'
  },
  {
    id: 'forged-bronze',
    label: 'Forged Bronze',
    primaryColor: 0x5c4230,
    secondaryColor: 0x1f1916,
    accentColor: 0xf97316,
    swatchHex: '#f97316'
  }
];

export interface SceneMaterialLibrary {
  hullPrimary: THREE.MeshPhysicalMaterial;
  hullDarkTrim: THREE.MeshStandardMaterial;
  wingComposite: THREE.MeshStandardMaterial;
  accentTrim: THREE.MeshPhysicalMaterial;
  canopyGlass: THREE.MeshPhysicalMaterial;
  thrusterNozzle: THREE.MeshStandardMaterial;
  thrusterPlasma: THREE.MeshStandardMaterial;
  deckPad: THREE.MeshStandardMaterial;
  deckDecal: THREE.MeshStandardMaterial;
  canyonTerrain: THREE.MeshStandardMaterial;
  monolithRock: THREE.MeshStandardMaterial;
  beaconCrystal: THREE.MeshPhysicalMaterial;
  beaconGimbal: THREE.MeshStandardMaterial;
  sentinelArmor: THREE.MeshStandardMaterial;
  sentinelCore: THREE.MeshStandardMaterial;
  contactShadow: THREE.MeshBasicMaterial;
  particleBurst: THREE.MeshBasicMaterial;
  relaySourceMat: THREE.MeshStandardMaterial;
  relayProcessorMat: THREE.MeshStandardMaterial;
  relaySinkMat: THREE.MeshStandardMaterial;
  validatorHealthyMat: THREE.MeshStandardMaterial;
  validatorFaultMat: THREE.MeshStandardMaterial;
  gravityWellMat: THREE.MeshStandardMaterial;
  packetOrbMat: THREE.MeshStandardMaterial;
  linkBeamMat: THREE.LineBasicMaterial;
  skyDomeMat: THREE.ShaderMaterial;
  waterMat: THREE.MeshPhysicalMaterial;
  waterUniforms: { uTime: { value: number }; uWaveAmp: { value: number } };
  skyscraperMat: THREE.MeshStandardMaterial;
  weatherMat: THREE.PointsMaterial;
  conceptAccentMat: THREE.MeshStandardMaterial;
  textures: THREE.Texture[];
  applyFinishPreset: (preset: MaterialFinishPreset) => void;
  dispose: () => void;
}

function hash2D(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function valueNoise2D(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2D(ix, iy);
  const b = hash2D(ix + 1, iy);
  const c = hash2D(ix, iy + 1);
  const d = hash2D(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbmNoise(x: number, y: number, octaves = 4): number {
  let val = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += amp * valueNoise2D(x * freq, y * freq);
    freq *= 2.02;
    amp *= 0.5;
  }
  return val;
}

/**
 * Generates a tileable tangent-space normal map via Sobel height differences.
 * Uses linear NoColorSpace so Three.js PBR lighting remains physically accurate.
 */
export function createProceduralNormalMap(
  size: number,
  scale: number,
  strength: number,
  maxAnisotropy: number
): THREE.DataTexture {
  const heights = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Seamless domain wrap via periodic sin/cos mapping + fbm
      const nx = (x / size) * scale;
      const ny = (y / size) * scale;
      heights[y * size + x] = fbmNoise(nx, ny, 4);
    }
  }

  const data = new Uint8Array(size * size * 4);
  const sample = (x: number, y: number) => {
    const wx = ((x % size) + size) % size;
    const wy = ((y % size) + size) % size;
    return heights[wy * size + wx];
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tl = sample(x - 1, y - 1);
      const t = sample(x, y - 1);
      const tr = sample(x + 1, y - 1);
      const l = sample(x - 1, y);
      const r = sample(x + 1, y);
      const bl = sample(x - 1, y + 1);
      const b = sample(x, y + 1);
      const br = sample(x + 1, y + 1);

      const dX = (tr + 2 * r + br - (tl + 2 * l + bl)) * strength;
      const dY = (bl + 2 * b + br - (tl + 2 * t + tr)) * strength;
      const invLen = 1 / Math.sqrt(dX * dX + dY * dY + 1);

      const idx = (y * size + x) * 4;
      data[idx] = Math.round(((-dX * invLen) * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.round(((-dY * invLen) * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.round((invLen * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates a linear roughness variation map (NoColorSpace) for terrain/rock surfaces.
 */
export function createLinearRoughnessMap(size: number, maxAnisotropy: number): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbmNoise((x / size) * 8, (y / size) * 8, 3);
      const v = Math.max(95, Math.min(250, Math.round(145 + n * 105)));
      const idx = (y * size + x) * 4;
      data[idx] = v;
      data[idx + 1] = v;
      data[idx + 2] = v;
      data[idx + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 14);
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createSkyscraperFacadeTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#090f1a';
  ctx.fillRect(0, 0, size, size);

  const cols = 16;
  const rows = 24;
  const cw = size / cols;
  const rh = size / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const h = hash2D(c + 3.1, r + 7.7);
      if (h > 0.42) {
        ctx.fillStyle = h > 0.86 ? '#38bdf8' : h > 0.68 ? '#fbbf24' : '#94a3b8';
        ctx.fillRect(c * cw + 2, r * rh + 2, cw - 4, rh - 4);
      } else {
        ctx.fillStyle = '#111827';
        ctx.fillRect(c * cw + 2, r * rh + 2, cw - 4, rh - 4);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createDeckGridTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#121722';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(245, 158, 11, 0.22)';
  ctx.lineWidth = 2;
  const step = 64;
  for (let i = 0; i <= size; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
  ctx.lineWidth = 1;
  for (let i = 32; i < size; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(245, 158, 11, 0.55)';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, size - 20, size - 20);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createWarningChevronTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#18181b';
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = '#f59e0b';
  for (let x = -size; x < size * 2; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 24, 0);
    ctx.lineTo(x - size + 24, size);
    ctx.lineTo(x - size, size);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(9, 9, 11, 0.35)';
  ctx.fillRect(0, 0, size, 28);
  ctx.fillRect(0, size - 28, size, 28);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createBrushedMetalTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#d8dee9';
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y++) {
    const shade = 205 + Math.floor(Math.sin(y * 1.7) * 14 + ((y * 37) % 18));
    ctx.fillStyle = `rgb(${shade}, ${shade + 2}, ${shade + 6})`;
    ctx.fillRect(0, y, size, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createRadialContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.32)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createMaterialLibrary(
  renderer: THREE.WebGLRenderer,
  isSoftwareGl: boolean
): SceneMaterialLibrary {
  const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy() || 1);

  const deckGridTex = createDeckGridTexture(maxAnisotropy);
  const chevronTex = createWarningChevronTexture(maxAnisotropy);
  const brushedMetalTex = createBrushedMetalTexture(maxAnisotropy);
  const contactShadowTex = createRadialContactShadowTexture();
  const terrainNormalTex = createProceduralNormalMap(128, 12, 2.8, maxAnisotropy);
  const terrainRoughnessTex = createLinearRoughnessMap(128, maxAnisotropy);
  const facadeTex = createSkyscraperFacadeTexture(maxAnisotropy);

  const textures: THREE.Texture[] = [
    deckGridTex,
    chevronTex,
    brushedMetalTex,
    contactShadowTex,
    terrainNormalTex,
    terrainRoughnessTex,
    facadeTex
  ];

  const hullPrimary = new THREE.MeshPhysicalMaterial({
    color: 0x3b4454,
    map: brushedMetalTex,
    normalMap: terrainNormalTex,
    normalScale: new THREE.Vector2(0.18, 0.18),
    metalness: 0.92,
    roughness: 0.22,
    anisotropy: 0.75,
    anisotropyRotation: 0.35,
    clearcoat: 0.4,
    clearcoatRoughness: 0.18
  });

  const hullDarkTrim = new THREE.MeshStandardMaterial({
    color: 0x181c24,
    metalness: 0.35,
    roughness: 0.72
  });

  const wingComposite = new THREE.MeshStandardMaterial({
    color: 0x262e3d,
    metalness: 0.45,
    roughness: 0.56
  });

  const accentTrim = new THREE.MeshPhysicalMaterial({
    color: 0xf59e0b,
    metalness: 0.85,
    roughness: 0.2,
    clearcoat: 0.85,
    clearcoatRoughness: 0.12
  });

  const canopyGlass = new THREE.MeshPhysicalMaterial({
    color: 0x9bd7ff,
    metalness: 0.0,
    roughness: 0.06,
    transmission: isSoftwareGl ? 0 : 0.92,
    transparent: true,
    opacity: isSoftwareGl ? 0.42 : 1.0,
    ior: 1.56,
    thickness: 1.1,
    attenuationDistance: 2.2,
    attenuationColor: new THREE.Color(0x0ea5e9),
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    depthWrite: false
  });

  const thrusterNozzle = new THREE.MeshStandardMaterial({
    color: 0x1f242c,
    metalness: 0.9,
    roughness: 0.32
  });

  const thrusterPlasma = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 1.9,
    roughness: 0.2,
    metalness: 0.1
  });

  const deckPad = new THREE.MeshStandardMaterial({
    color: 0x161b26,
    metalness: 0.25,
    roughness: 0.84
  });

  const deckDecal = new THREE.MeshStandardMaterial({
    map: deckGridTex,
    metalness: 0.2,
    roughness: 0.58,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  });

  const canyonTerrain = new THREE.MeshStandardMaterial({
    vertexColors: true,
    normalMap: terrainNormalTex,
    normalScale: new THREE.Vector2(1.15, 1.15),
    roughnessMap: terrainRoughnessTex,
    metalness: 0.08,
    roughness: 0.88,
    flatShading: false
  });

  const monolithRock = new THREE.MeshStandardMaterial({
    color: 0x2c3442,
    normalMap: terrainNormalTex,
    normalScale: new THREE.Vector2(1.4, 1.4),
    roughnessMap: terrainRoughnessTex,
    metalness: 0.14,
    roughness: 0.84
  });

  const beaconCrystal = new THREE.MeshPhysicalMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 0.65,
    metalness: 0.1,
    roughness: 0.12,
    transmission: isSoftwareGl ? 0 : 0.78,
    transparent: true,
    opacity: isSoftwareGl ? 0.85 : 1.0,
    ior: 1.85,
    thickness: 1.4,
    clearcoat: 1.0
  });

  const beaconGimbal = new THREE.MeshStandardMaterial({
    color: 0xdbe4f0,
    metalness: 0.92,
    roughness: 0.24
  });

  const sentinelArmor = new THREE.MeshStandardMaterial({
    map: chevronTex,
    color: 0x313640,
    metalness: 0.52,
    roughness: 0.64
  });

  const sentinelCore = new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    emissive: 0xe11d48,
    emissiveIntensity: 1.5,
    roughness: 0.25,
    metalness: 0.2
  });

  const contactShadow = new THREE.MeshBasicMaterial({
    map: contactShadowTex,
    transparent: true,
    opacity: 0.5,
    depthWrite: false
  });

  const particleBurst = new THREE.MeshBasicMaterial({
    color: 0xffffff
  });

  const relaySourceMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x059669,
    emissiveIntensity: 1.25,
    metalness: 0.4,
    roughness: 0.25
  });

  const relayProcessorMat = new THREE.MeshStandardMaterial({
    color: 0xa855f7,
    emissive: 0x7e22ce,
    emissiveIntensity: 1.2,
    metalness: 0.5,
    roughness: 0.22
  });

  const relaySinkMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 1.2,
    metalness: 0.55,
    roughness: 0.2
  });

  const validatorHealthyMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 1.35,
    metalness: 0.35,
    roughness: 0.18
  });

  const validatorFaultMat = new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    emissive: 0xe11d48,
    emissiveIntensity: 1.9,
    metalness: 0.25,
    roughness: 0.25
  });

  const gravityWellMat = new THREE.MeshStandardMaterial({
    color: 0x6366f1,
    emissive: 0x4f46e5,
    emissiveIntensity: 1.65,
    metalness: 0.85,
    roughness: 0.15
  });

  const packetOrbMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 1.8,
    roughness: 0.15,
    metalness: 0.2
  });

  const linkBeamMat = new THREE.LineBasicMaterial({
    color: 0x22d3ee,
    transparent: true,
    opacity: 0.42
  });

  // Rayleigh/Mie Atmospheric Sky Dome ShaderMaterial
  const skyDomeMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uSunDir: { value: new THREE.Vector3(0.55, 0.38, 0.74).normalize() },
      uZenithColor: { value: new THREE.Color(0x060b19) },
      uHorizonColor: { value: new THREE.Color(0x16294a) },
      uGlowColor: { value: new THREE.Color(0xf59e0b) }
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldDir;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldDir = normalize(position);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uSunDir;
      uniform vec3 uZenithColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uGlowColor;
      varying vec3 vWorldDir;
      void main() {
        vec3 dir = normalize(vWorldDir);
        float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
        float skyFactor = pow(clamp(dir.y, 0.0, 1.0), 0.55);
        vec3 col = mix(uHorizonColor, uZenithColor, skyFactor);

        // Mie forward scattering solar halo + crisp solar disc
        float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
        float mieGlow = pow(sunDot, 10.0) * 0.48 + pow(sunDot, 128.0) * 1.15;
        col += uGlowColor * mieGlow;

        // Subtle atmospheric horizon band
        float horizonBand = exp(-abs(dir.y) * 9.0) * 0.28;
        col += mix(uHorizonColor, uGlowColor, 0.35) * horizonBand;
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });

  // Physically-Based Ocean Water with Gerstner Wave displacement via onBeforeCompile
  const waterUniforms = {
    uTime: { value: 0 },
    uWaveAmp: { value: 0.35 }
  };

  const waterMat = new THREE.MeshPhysicalMaterial({
    color: 0x0b3a53,
    normalMap: terrainNormalTex,
    normalScale: new THREE.Vector2(0.45, 0.45),
    metalness: 0.12,
    roughness: 0.09,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    ior: 1.333,
    transparent: true,
    opacity: isSoftwareGl ? 0.8 : 0.88,
    transmission: isSoftwareGl ? 0 : 0.38
  });

  waterMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = waterUniforms.uTime;
    shader.uniforms.uWaveAmp = waterUniforms.uWaveAmp;
    shader.vertexShader =
      `uniform float uTime;\nuniform float uWaveAmp;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        /* glsl */ `
        #include <begin_vertex>
        float w1 = sin(transformed.x * 0.18 + uTime * 1.6) * cos(transformed.z * 0.14 + uTime * 1.25);
        float w2 = sin((transformed.x + transformed.z) * 0.32 - uTime * 2.1) * 0.5;
        transformed.y += (w1 + w2) * uWaveAmp;
        `
      );
  };

  const skyscraperMat = new THREE.MeshStandardMaterial({
    map: facadeTex,
    emissiveMap: facadeTex,
    emissive: new THREE.Color(0x93c5fd),
    emissiveIntensity: 0.65,
    metalness: 0.68,
    roughness: 0.24
  });

  const weatherMat = new THREE.PointsMaterial({
    color: 0xcbd5e1,
    size: 0.34,
    transparent: true,
    opacity: 0.68,
    depthWrite: false
  });

  const conceptAccentMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 1.15,
    metalness: 0.65,
    roughness: 0.22
  });

  const allMaterials: THREE.Material[] = [
    hullPrimary,
    hullDarkTrim,
    wingComposite,
    accentTrim,
    canopyGlass,
    thrusterNozzle,
    thrusterPlasma,
    deckPad,
    deckDecal,
    canyonTerrain,
    monolithRock,
    beaconCrystal,
    beaconGimbal,
    sentinelArmor,
    sentinelCore,
    contactShadow,
    particleBurst,
    relaySourceMat,
    relayProcessorMat,
    relaySinkMat,
    validatorHealthyMat,
    validatorFaultMat,
    gravityWellMat,
    packetOrbMat,
    linkBeamMat,
    skyDomeMat,
    waterMat,
    skyscraperMat,
    weatherMat,
    conceptAccentMat
  ];

  const applyFinishPreset = (presetId: MaterialFinishPreset) => {
    const preset = FINISH_PRESETS.find((p) => p.id === presetId) || FINISH_PRESETS[0];
    hullPrimary.color.setHex(preset.primaryColor);
    hullDarkTrim.color.setHex(preset.secondaryColor);
    accentTrim.color.setHex(preset.accentColor);

    if (presetId === 'ceramic-emerald') {
      hullPrimary.metalness = 0.22;
      hullPrimary.roughness = 0.24;
      hullPrimary.clearcoat = 1.0;
    } else if (presetId === 'forged-bronze') {
      hullPrimary.metalness = 0.94;
      hullPrimary.roughness = 0.28;
      hullPrimary.clearcoat = 0.45;
    } else {
      hullPrimary.metalness = 0.92;
      hullPrimary.roughness = 0.22;
      hullPrimary.clearcoat = 0.4;
    }
    hullPrimary.needsUpdate = true;
  };

  const dispose = () => {
    for (const tex of textures) tex.dispose();
    for (const mat of allMaterials) mat.dispose();
  };

  return {
    hullPrimary,
    hullDarkTrim,
    wingComposite,
    accentTrim,
    canopyGlass,
    thrusterNozzle,
    thrusterPlasma,
    deckPad,
    deckDecal,
    canyonTerrain,
    monolithRock,
    beaconCrystal,
    beaconGimbal,
    sentinelArmor,
    sentinelCore,
    contactShadow,
    particleBurst,
    relaySourceMat,
    relayProcessorMat,
    relaySinkMat,
    validatorHealthyMat,
    validatorFaultMat,
    gravityWellMat,
    packetOrbMat,
    linkBeamMat,
    skyDomeMat,
    waterMat,
    waterUniforms,
    skyscraperMat,
    weatherMat,
    conceptAccentMat,
    textures,
    applyFinishPreset,
    dispose
  };
}

