/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 * (TWENTY 47 PROTOCOL - GENESIS NODE / LYSANDER CORE EULA / H-FID Forensic License v1.1).
 * Zenodo DOI: https://doi.org/10.5281/zenodo.20778079 | ORCID: https://orcid.org/0009-0004-5273-7028
 */

export type ControllerFamily =
  | 'xbox'
  | 'playstation'
  | 'nintendo'
  | 'steam'
  | 'arcade-8bitdo'
  | 'mobile-backbone'
  | 'flight-hotas'
  | 'generic-hid';

export interface DetectedControllerState {
  index: number;
  id: string;
  displayName: string;
  family: ControllerFamily;
  vendorId?: string;
  productId?: string;
  mapping: string;
  connected: boolean;
  timestamp: number;
  hasRumble: boolean;
  buttons: Array<{
    index: number;
    pressed: boolean;
    touched: boolean;
    value: number;
    label: string;
  }>;
  axes: number[];
  leftStick: { x: number; y: number };
  rightStick: { x: number; y: number };
  triggers: { left: number; right: number };
}

export interface ControllerMappingProfile {
  deadzone: number;
  sensitivity: number;
  invertRightY: boolean;
  rumbleStrength: number;
  gamepadToKeyboardEnabled: boolean;
  buttonBindings: Record<number, string>;
  activePresetName: string;
}

const INPUT_PROFILE_STORAGE_KEY = 'sovereign_universal_input_profile_v1';

export const DEFAULT_CONTROLLER_PROFILE: ControllerMappingProfile = {
  deadzone: 0.12,
  sensitivity: 1.0,
  invertRightY: false,
  rumbleStrength: 0.85,
  gamepadToKeyboardEnabled: true,
  activePresetName: 'Universal Steam + Desktop (XInput/DualSense/Switch)',
  buttonBindings: {
    0: 'Space',       // A / Cross / B
    1: 'Escape',      // B / Circle / A
    2: 'KeyR',        // X / Square / Y
    3: 'KeyE',        // Y / Triangle / X
    4: 'KeyQ',        // LB / L1 / L
    5: 'KeyF',        // RB / R1 / R
    6: 'MouseRight',  // LT / L2 / ZL
    7: 'MouseLeft',   // RT / R2 / ZR
    8: 'Tab',         // Back / Share / Minus
    9: 'Enter',       // Start / Options / Plus
    10: 'ShiftLeft',  // L3
    11: 'KeyC',       // R3
    12: 'ArrowUp',    // D-Up
    13: 'ArrowDown',  // D-Down
    14: 'ArrowLeft',  // D-Left
    15: 'ArrowRight', // D-Right
    16: 'Meta'        // Guide / PS / Home / Steam
  }
};

export function loadControllerProfile(): ControllerMappingProfile {
  if (typeof window === 'undefined') return DEFAULT_CONTROLLER_PROFILE;
  try {
    const raw = localStorage.getItem(INPUT_PROFILE_STORAGE_KEY);
    if (!raw) return DEFAULT_CONTROLLER_PROFILE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CONTROLLER_PROFILE,
      ...parsed,
      buttonBindings: {
        ...DEFAULT_CONTROLLER_PROFILE.buttonBindings,
        ...(parsed.buttonBindings || {})
      }
    };
  } catch {
    return DEFAULT_CONTROLLER_PROFILE;
  }
}

export function saveControllerProfile(next: Partial<ControllerMappingProfile>): ControllerMappingProfile {
  const cur = loadControllerProfile();
  const merged: ControllerMappingProfile = {
    ...cur,
    ...next,
    buttonBindings: {
      ...cur.buttonBindings,
      ...(next.buttonBindings || {})
    }
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(INPUT_PROFILE_STORAGE_KEY, JSON.stringify(merged));
    } catch {}
    window.dispatchEvent(new CustomEvent('sovereign_input_profile_changed', { detail: merged }));
  }
  return merged;
}

export function detectControllerFamily(idRaw: string): {
  family: ControllerFamily;
  displayName: string;
  vendorId?: string;
  productId?: string;
} {
  const id = idRaw || 'Standard Gamepad';
  const lower = id.toLowerCase();

  const vidMatch = lower.match(/vendor[:\s]+([0-9a-f]{4})|([0-9a-f]{4})-[0-9a-f]{4}/i);
  const pidMatch = lower.match(/product[:\s]+([0-9a-f]{4})|[0-9a-f]{4}-([0-9a-f]{4})/i);
  const vendorId = (vidMatch?.[1] || vidMatch?.[2] || '').toLowerCase() || undefined;
  const productId = (pidMatch?.[1] || pidMatch?.[2] || '').toLowerCase() || undefined;

  // Valve Steam Deck / Steam Controller (VID 28de)
  if (vendorId === '28de' || lower.includes('steam') || lower.includes('valve') || lower.includes('neptune')) {
    return {
      family: 'steam',
      displayName: lower.includes('deck') || lower.includes('neptune') ? 'Valve Steam Deck Controller' : 'Valve Steam Controller',
      vendorId,
      productId
    };
  }

  // Sony PlayStation DualSense / DualShock (VID 054c)
  if (
    vendorId === '054c' ||
    lower.includes('dualsense') ||
    lower.includes('dualshock') ||
    lower.includes('playstation') ||
    lower.includes('wireless controller') ||
    lower.includes('ps5') ||
    lower.includes('ps4')
  ) {
    const isPs5 = lower.includes('dualsense') || productId === '0ce6' || productId === '0df2';
    return {
      family: 'playstation',
      displayName: productId === '0df2'
        ? 'Sony DualSense Edge (PS5)'
        : isPs5
        ? 'Sony DualSense Wireless (PS5)'
        : 'Sony DualShock Wireless (PS4/PS3)',
      vendorId,
      productId
    };
  }

  // Nintendo Switch Pro / Joy-Con / GameCube (VID 057e)
  if (
    vendorId === '057e' ||
    lower.includes('nintendo') ||
    lower.includes('joy-con') ||
    lower.includes('pro controller') ||
    lower.includes('switch') ||
    lower.includes('gamecube')
  ) {
    return {
      family: 'nintendo',
      displayName: lower.includes('joy-con')
        ? 'Nintendo Switch Joy-Con'
        : lower.includes('gamecube')
        ? 'Nintendo GameCube Controller'
        : 'Nintendo Switch Pro Controller',
      vendorId,
      productId
    };
  }

  // Microsoft Xbox (VID 045e)
  if (
    vendorId === '045e' ||
    lower.includes('xbox') ||
    lower.includes('xinput') ||
    lower.includes('microsoft')
  ) {
    return {
      family: 'xbox',
      displayName: lower.includes('360')
        ? 'Xbox 360 Controller (XInput)'
        : lower.includes('elite')
        ? 'Xbox Elite Wireless Series 2'
        : 'Xbox Series X|S / One Controller',
      vendorId,
      productId
    };
  }

  // 8BitDo / Arcade / Hori / Qanba / Fightstick (VID 2dc8 / 0f0d)
  if (
    vendorId === '2dc8' ||
    vendorId === '0f0d' ||
    lower.includes('8bitdo') ||
    lower.includes('fightstick') ||
    lower.includes('hori') ||
    lower.includes('arcade') ||
    lower.includes('qanba') ||
    lower.includes('mayflash')
  ) {
    return {
      family: 'arcade-8bitdo',
      displayName: lower.includes('8bitdo') ? '8BitDo Pro / Ultimate Controller' : 'Arcade Fightstick / Retro HID',
      vendorId,
      productId
    };
  }

  // Mobile telescopic controllers (Backbone, Razer Kishi, GameSir)
  if (lower.includes('backbone') || lower.includes('kishi') || lower.includes('gamesir') || lower.includes('razer')) {
    return {
      family: 'mobile-backbone',
      displayName: lower.includes('backbone')
        ? 'Backbone One Mobile Controller'
        : lower.includes('kishi')
        ? 'Razer Kishi Mobile Controller'
        : 'GameSir / Mobile HID Controller',
      vendorId,
      productId
    };
  }

  // Flight sticks / HOTAS / Racing Wheels
  if (
    lower.includes('hotas') ||
    lower.includes('thrustmaster') ||
    lower.includes('logitech g29') ||
    lower.includes('logitech g920') ||
    lower.includes('saitek') ||
    lower.includes('flight') ||
    lower.includes('wheel')
  ) {
    return {
      family: 'flight-hotas',
      displayName: 'HOTAS / Flight Stick / Sim Wheel',
      vendorId,
      productId
    };
  }

  return {
    family: 'generic-hid',
    displayName: id.slice(0, 48),
    vendorId,
    productId
  };
}

export function getButtonGlyphsForFamily(family: ControllerFamily | 'auto'): Record<number, string> {
  if (family === 'playstation') {
    return {
      0: '✕',
      1: '○',
      2: '□',
      3: '△',
      4: 'L1',
      5: 'R1',
      6: 'L2',
      7: 'R2',
      8: 'Create',
      9: 'Options',
      10: 'L3',
      11: 'R3',
      12: '▲',
      13: '▼',
      14: '◀',
      15: '▶',
      16: 'PS'
    };
  }
  if (family === 'nintendo') {
    return {
      0: 'B',
      1: 'A',
      2: 'Y',
      3: 'X',
      4: 'L',
      5: 'R',
      6: 'ZL',
      7: 'ZR',
      8: '−',
      9: '+',
      10: 'LS',
      11: 'RS',
      12: '▲',
      13: '▼',
      14: '◀',
      15: '▶',
      16: 'Home'
    };
  }
  if (family === 'steam') {
    return {
      0: 'A',
      1: 'B',
      2: 'X',
      3: 'Y',
      4: 'L1',
      5: 'R1',
      6: 'L2',
      7: 'R2',
      8: 'View',
      9: 'Menu',
      10: 'L3',
      11: 'R3',
      12: '▲',
      13: '▼',
      14: '◀',
      15: '▶',
      16: 'STEAM'
    };
  }
  // Xbox / XInput / Standard default
  return {
    0: 'A',
    1: 'B',
    2: 'X',
    3: 'Y',
    4: 'LB',
    5: 'RB',
    6: 'LT',
    7: 'RT',
    8: 'View',
    9: 'Menu',
    10: 'LS',
    11: 'RS',
    12: '▲',
    13: '▼',
    14: '◀',
    15: '▶',
    16: 'Guide'
  };
}

export function applyStickDeadzone(val: number, deadzone: number, sensitivity: number): number {
  const abs = Math.abs(val);
  if (abs < deadzone) return 0;
  const normalized = (abs - deadzone) / Math.max(0.01, 1 - deadzone);
  const curved = Math.min(1, Math.pow(normalized, 1 / Math.max(0.25, sensitivity)));
  return Math.sign(val) * Number(curved.toFixed(3));
}

export function snapshotConnectedGamepads(
  profile: ControllerMappingProfile,
  overrideGlyphFamily: ControllerFamily | 'auto' = 'auto'
): DetectedControllerState[] {
  if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') {
    return [];
  }
  const rawPads = navigator.getGamepads();
  const list: DetectedControllerState[] = [];

  for (let i = 0; i < rawPads.length; i++) {
    const gp = rawPads[i];
    if (!gp || !gp.connected) continue;
    const meta = detectControllerFamily(gp.id);
    const glyphs = getButtonGlyphsForFamily(
      overrideGlyphFamily === 'auto' ? meta.family : overrideGlyphFamily
    );
    const axes = Array.from(gp.axes || []);
    const leftX = applyStickDeadzone(axes[0] || 0, profile.deadzone, profile.sensitivity);
    const leftY = applyStickDeadzone(axes[1] || 0, profile.deadzone, profile.sensitivity);
    const rightX = applyStickDeadzone(axes[2] || 0, profile.deadzone, profile.sensitivity);
    const rightYRaw = applyStickDeadzone(axes[3] || 0, profile.deadzone, profile.sensitivity);
    const rightY = profile.invertRightY ? -rightYRaw : rightYRaw;

    const buttons = Array.from(gp.buttons || []).map((btn, idx) => ({
      index: idx,
      pressed: Boolean(btn.pressed),
      touched: Boolean((btn as any).touched),
      value: Number((btn.value || 0).toFixed(3)),
      label: glyphs[idx] || `B${idx}`
    }));

    const lt = buttons[6]?.value ?? 0;
    const rt = buttons[7]?.value ?? 0;
    const actuator = (gp as any).vibrationActuator || ((gp as any).hapticActuators && (gp as any).hapticActuators[0]);

    list.push({
      index: gp.index,
      id: gp.id,
      displayName: meta.displayName,
      family: meta.family,
      vendorId: meta.vendorId,
      productId: meta.productId,
      mapping: gp.mapping || 'raw-hid',
      connected: gp.connected,
      timestamp: gp.timestamp,
      hasRumble: Boolean(actuator),
      buttons,
      axes,
      leftStick: { x: leftX, y: leftY },
      rightStick: { x: rightX, y: rightY },
      triggers: { left: lt, right: rt }
    });
  }
  return list;
}

export async function triggerControllerRumble(
  gamepadIndex: number,
  durationMs = 300,
  strongMagnitude = 0.85,
  weakMagnitude = 0.55
): Promise<{ ok: boolean; message: string }> {
  if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') {
    return { ok: false, message: 'Gamepad API unavailable in this environment.' };
  }
  const gp = navigator.getGamepads()[gamepadIndex];
  if (!gp) {
    return { ok: false, message: `Controller slot #${gamepadIndex} not found.` };
  }
  const anyGp = gp as any;
  try {
    if (anyGp.vibrationActuator && typeof anyGp.vibrationActuator.playEffect === 'function') {
      await anyGp.vibrationActuator.playEffect('dual-rumble', {
        startDelay: 0,
        duration: durationMs,
        strongMagnitude: Math.max(0, Math.min(1, strongMagnitude)),
        weakMagnitude: Math.max(0, Math.min(1, weakMagnitude))
      });
      return { ok: true, message: `Dual-rumble haptic pulse dispatched (${durationMs}ms)` };
    }
    if (Array.isArray(anyGp.hapticActuators) && anyGp.hapticActuators[0]?.pulse) {
      await anyGp.hapticActuators[0].pulse(strongMagnitude, durationMs);
      return { ok: true, message: `Haptic actuator pulse dispatched (${durationMs}ms)` };
    }
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(durationMs);
      return { ok: true, message: `Device vibration dispatched (${durationMs}ms)` };
    }
    return { ok: false, message: 'Controller does not expose a browser haptic actuator.' };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Haptic rumble failed.' };
  }
}

export function dispatchSyntheticKeyEvent(code: string, type: 'keydown' | 'keyup'): void {
  if (typeof window === 'undefined' || !code) return;
  if (code === 'MouseLeft' || code === 'MouseRight') {
    window.dispatchEvent(
      new CustomEvent('sovereign_virtual_controller_input', {
        detail: { kind: 'mouse', button: code, state: type === 'keydown' ? 'down' : 'up' }
      })
    );
    return;
  }
  const keyMap: Record<string, string> = {
    Space: ' ',
    Escape: 'Escape',
    Enter: 'Enter',
    Tab: 'Tab',
    ArrowUp: 'ArrowUp',
    ArrowDown: 'ArrowDown',
    ArrowLeft: 'ArrowLeft',
    ArrowRight: 'ArrowRight',
    ShiftLeft: 'Shift',
    Meta: 'Meta'
  };
  const key = keyMap[code] || (code.startsWith('Key') ? code.slice(3).toLowerCase() : code);
  const target = (document.activeElement as HTMLElement) || window;
  try {
    target.dispatchEvent(
      new KeyboardEvent(type, {
        key,
        code,
        bubbles: true,
        cancelable: true
      })
    );
  } catch {}
  window.dispatchEvent(
    new CustomEvent('sovereign_virtual_controller_input', {
      detail: { kind: 'key', code, key, type }
    })
  );
}
