/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 * (TWENTY 47 PROTOCOL - GENESIS NODE / LYSANDER CORE EULA / H-FID Forensic License v1.1).
 * Zenodo DOI: https://doi.org/10.5281/zenodo.20778079 | ORCID: https://orcid.org/0009-0004-5273-7028
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Gamepad2,
  Keyboard,
  Mouse,
  Smartphone,
  Vibrate,
  Sliders,
  CheckCircle2,
  X,
  RotateCcw,
  Radio,
  Sparkles,
  Crosshair,
  Move
} from 'lucide-react';
import {
  ControllerFamily,
  ControllerMappingProfile,
  DEFAULT_CONTROLLER_PROFILE,
  DetectedControllerState,
  dispatchSyntheticKeyEvent,
  getButtonGlyphsForFamily,
  loadControllerProfile,
  saveControllerProfile,
  snapshotConnectedGamepads,
  triggerControllerRumble
} from '../utils/universalInputEngine';
import {
  ControllerGlyphFamily,
  loadOSCustomizationProfile,
  saveOSCustomizationProfile
} from '../utils/osCustomizationStore';

const FAMILY_BADGES: Record<ControllerFamily, { label: string; color: string }> = {
  xbox: { label: 'Xbox / XInput', color: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/40' },
  playstation: { label: 'PlayStation DualSense / DS4', color: 'text-sky-300 bg-sky-500/15 border-sky-500/40' },
  nintendo: { label: 'Nintendo Switch / Joy-Con', color: 'text-rose-300 bg-rose-500/15 border-rose-500/40' },
  steam: { label: 'Valve Steam Deck / Input', color: 'text-cyan-300 bg-cyan-500/15 border-cyan-500/40' },
  'arcade-8bitdo': { label: '8BitDo / Arcade Fightstick', color: 'text-amber-300 bg-amber-500/15 border-amber-500/40' },
  'mobile-backbone': { label: 'Backbone / Kishi / Mobile HID', color: 'text-violet-300 bg-violet-500/15 border-violet-500/40' },
  'flight-hotas': { label: 'HOTAS / Sim Wheel', color: 'text-orange-300 bg-orange-500/15 border-orange-500/40' },
  'generic-hid': { label: 'Universal HID / DirectInput', color: 'text-zinc-200 bg-zinc-800 border-zinc-700' }
};

export const UniversalControllerDeck: React.FC = () => {
  const [profile, setProfile] = useState<ControllerMappingProfile>(() => loadControllerProfile());
  const [osProfile, setOsProfile] = useState(() => loadOSCustomizationProfile());
  const [controllers, setControllers] = useState<DetectedControllerState[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number>(0);
  const [rumbleStatus, setRumbleStatus] = useState<string>('');
  const [remappingButton, setRemappingButton] = useState<number | null>(null);
  const [lastKeyEvent, setLastKeyEvent] = useState<string>('Press any key or click inside the tester');
  const [mouseTelemetry, setMouseTelemetry] = useState<{ x: number; y: number; buttons: number; locked: boolean }>({
    x: 0,
    y: 0,
    buttons: 0,
    locked: false
  });
  const [hidDevicesCount, setHidDevicesCount] = useState<number | null>(null);
  const [touchCapable] = useState<boolean>(
    () => typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
  );
  const pointerLockBoxRef = useRef<HTMLDivElement | null>(null);

  // Sync OS customization changes
  useEffect(() => {
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setOsProfile(detail || loadOSCustomizationProfile());
    };
    window.addEventListener('sovereign_os_customization_changed', onCustom);
    return () => window.removeEventListener('sovereign_os_customization_changed', onCustom);
  }, []);

  // Event-woken real W3C Gamepad API poll loop (sleeps with 0 CPU when no gamepads are connected)
  useEffect(() => {
    let rafId = 0;
    let active = true;

    const hasAnyConnectedGamepad = (): boolean => {
      try {
        const list = navigator.getGamepads ? navigator.getGamepads() : [];
        for (let i = 0; i < list.length; i++) {
          if (list[i] && list[i]!.connected) return true;
        }
      } catch {}
      return false;
    };

    const poll = () => {
      rafId = 0;
      if (!active) return;
      if (!hasAnyConnectedGamepad()) {
        setControllers((prev) => (prev.length === 0 ? prev : []));
        return;
      }
      const pads = snapshotConnectedGamepads(profile, osProfile.controllerGlyphStyle);
      setControllers(pads);
      rafId = requestAnimationFrame(poll);
    };

    const startPollingIfNeeded = () => {
      const pads = snapshotConnectedGamepads(profile, osProfile.controllerGlyphStyle);
      setControllers((prev) => (prev.length === 0 && pads.length === 0 ? prev : pads));
      if (pads.length > 0) {
        setSelectedSlot(pads[0].index);
        if (!rafId) rafId = requestAnimationFrame(poll);
      }
    };

    startPollingIfNeeded();

    window.addEventListener('gamepadconnected', startPollingIfNeeded);
    window.addEventListener('gamepaddisconnected', startPollingIfNeeded);
    return () => {
      active = false;
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('gamepadconnected', startPollingIfNeeded);
      window.removeEventListener('gamepaddisconnected', startPollingIfNeeded);
    };
  }, [profile, osProfile.controllerGlyphStyle]);

  // Listen for keyboard capture during remapping or raw keyboard telemetry
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      setLastKeyEvent(`${e.code} (key: "${e.key}")`);
      if (remappingButton !== null) {
        e.preventDefault();
        const updated = saveControllerProfile({
          buttonBindings: {
            ...profile.buttonBindings,
            [remappingButton]: e.code
          }
        });
        setProfile(updated);
        setRemappingButton(null);
      }
    };
    const onPointerLockChange = () => {
      setMouseTelemetry((prev) => ({
        ...prev,
        locked: document.pointerLockElement === pointerLockBoxRef.current
      }));
    };
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
    };
  }, [remappingButton, profile.buttonBindings]);

  const activePad = controllers.find((c) => c.index === selectedSlot) || controllers[0] || null;
  const activeGlyphs = getButtonGlyphsForFamily(
    osProfile.controllerGlyphStyle === 'auto'
      ? activePad?.family || 'xbox'
      : osProfile.controllerGlyphStyle
  );

  const handleRumbleTest = async () => {
    if (!activePad) {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate([80, 40, 120]);
        setRumbleStatus('Dispatched device tactile vibration pattern.');
      } else {
        setRumbleStatus('Connect any controller and press a button to wake the Gamepad API.');
      }
      return;
    }
    const res = await triggerControllerRumble(activePad.index, 420, profile.rumbleStrength, profile.rumbleStrength * 0.6);
    setRumbleStatus(res.message);
  };

  const handleScanWebHid = async () => {
    const navAny = navigator as any;
    if (!navAny?.hid?.requestDevice) {
      setRumbleStatus('WebHID API is unavailable in this browser context; standard W3C Gamepad API remains active for all USB/Bluetooth controllers.');
      return;
    }
    try {
      const devices = await navAny.hid.requestDevice({ filters: [] });
      setHidDevicesCount(devices.length);
      setRumbleStatus(`WebHID authorized ${devices.length} raw HID device(s) (DualSense/Switch/HOTAS/Flightstick ready).`);
    } catch (err: any) {
      setRumbleStatus(err?.message || 'WebHID picker cancelled.');
    }
  };

  const updateProfile = (patch: Partial<ControllerMappingProfile>) => {
    const next = saveControllerProfile(patch);
    setProfile(next);
  };

  const toggleTouchOverlay = () => {
    const next = saveOSCustomizationProfile({
      showTouchControllerOverlay: !osProfile.showTouchControllerOverlay
    });
    setOsProfile(next);
  };

  const toggleGamepadOsNav = () => {
    const next = saveOSCustomizationProfile({
      enableGamepadOsNav: !osProfile.enableGamepadOsNav
    });
    setOsProfile(next);
  };

  const setGlyphStyle = (style: ControllerGlyphFamily) => {
    const next = saveOSCustomizationProfile({ controllerGlyphStyle: style });
    setOsProfile(next);
  };

  return (
    <div className="space-y-4 text-xs text-zinc-200">
      {/* Header Banner */}
      <div className="rounded-xl bg-gradient-to-r from-emerald-950/60 via-zinc-900 to-sky-950/60 border border-emerald-500/30 p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-300">
            <Gamepad2 className="w-4 h-4" />
            <span>Universal Steam Input, All-Controller HID, Keyboard/Mouse & Multi-Touch Engine</span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Plug in or pair via Bluetooth ANY controller — Xbox Series X|S/One/360, PlayStation DualSense (PS5)/DualShock 4, Nintendo Switch Pro/Joy-Con, Steam Deck, 8BitDo, Backbone/Kishi, Fightsticks, or HOTAS — plus Raw Keyboard/Mouse & On-Screen Multi-Touch Virtual Gamepad.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleTouchOverlay}
            className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer ${
              osProfile.showTouchControllerOverlay
                ? 'bg-sky-500/25 border-sky-400 text-sky-100'
                : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{osProfile.showTouchControllerOverlay ? 'Hide Touch Controller' : 'Launch Touch Virtual Controller'}</span>
          </button>
          <button
            type="button"
            onClick={toggleGamepadOsNav}
            className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer ${
              osProfile.enableGamepadOsNav
                ? 'bg-emerald-500/25 border-emerald-400 text-emerald-100'
                : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-300'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>OS Gamepad Nav: {osProfile.enableGamepadOsNav ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Supported Controller Ecosystem Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { name: 'Xbox XInput', desc: 'Series X|S · Elite 2 · One · 360', badge: 'Native USB/BT' },
          { name: 'PlayStation HID', desc: 'DualSense PS5 · Edge · DualShock 4/3', badge: 'Dual-Rumble' },
          { name: 'Nintendo HID', desc: 'Switch Pro · Joy-Con L/R · GameCube', badge: 'Auto Glyphs' },
          { name: 'Steam & Custom', desc: 'Steam Deck · 8BitDo · Kishi · HOTAS', badge: 'WebHID + API' }
        ].map((item) => (
          <div key={item.name} className="rounded-xl bg-zinc-900/80 border border-zinc-800 p-2.5">
            <div className="flex items-center justify-between gap-1">
              <span className="font-bold text-zinc-100 text-[11px]">{item.name}</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[9px] text-emerald-300 font-mono">
                {item.badge}
              </span>
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">{item.desc}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Live Connected Controllers & Visualizer */}
        <div className="lg:col-span-7 rounded-xl bg-zinc-900/90 border border-zinc-800 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-bold text-zinc-100 flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-sky-400" />
              <span>Live Hardware Controller Telemetry ({controllers.length} Connected)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleRumbleTest}
                className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Vibrate className="w-3.5 h-3.5" />
                <span>Test Rumble</span>
              </button>
              <button
                type="button"
                onClick={handleScanWebHid}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-[11px] cursor-pointer"
              >
                Pair Raw WebHID{hidDevicesCount !== null ? ` (${hidDevicesCount})` : ''}
              </button>
            </div>
          </div>

          {rumbleStatus && (
            <div className="px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-200 text-[11px]">
              {rumbleStatus}
            </div>
          )}

          {/* Glyph Override Selector */}
          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className="text-zinc-400 font-semibold">Button Glyphs:</span>
            {(['auto', 'xbox', 'playstation', 'nintendo', 'steam'] as ControllerGlyphFamily[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGlyphStyle(g)}
                className={`px-2 py-0.5 rounded border uppercase font-mono cursor-pointer ${
                  osProfile.controllerGlyphStyle === g
                    ? 'bg-sky-500/25 border-sky-400 text-sky-100'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          {controllers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/70 p-6 text-center space-y-2">
              <Gamepad2 className="w-8 h-8 text-zinc-500 mx-auto" />
              <div className="text-sm font-semibold text-zinc-200">
                Waiting for Physical Controller Signal (Press Any Button on Your Controller)
              </div>
              <p className="text-[11px] text-zinc-400 max-w-md mx-auto">
                Browsers activate USB/Bluetooth controllers the instant you press any button or move a stick. Plug in an Xbox, PS5 DualSense, PS4 DualShock, Nintendo Switch Pro/Joy-Con, Steam Deck, or 8BitDo pad — or click <strong>Launch Touch Virtual Controller</strong> above for instant touchscreen play.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Slot selector */}
              <div className="flex flex-wrap gap-1.5">
                {controllers.map((pad) => {
                  const fam = FAMILY_BADGES[pad.family];
                  return (
                    <button
                      key={pad.index}
                      type="button"
                      onClick={() => setSelectedSlot(pad.index)}
                      className={`px-2.5 py-1.5 rounded-lg border text-left cursor-pointer ${
                        activePad?.index === pad.index
                          ? 'bg-sky-500/20 border-sky-400 text-white'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-300'
                      }`}
                    >
                      <div className="font-bold text-[11px]">P{pad.index + 1}: {pad.displayName}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`px-1.5 py-0.2 rounded border text-[9px] font-mono ${fam.color}`}>
                          {fam.label}
                        </span>
                        <span className="text-[9px] text-zinc-500 font-mono">
                          {pad.mapping} · {pad.buttons.length} btns
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {activePad && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-zinc-950/80 border border-zinc-800 rounded-xl p-3">
                  {/* Left Stick Visualizer */}
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-mono text-zinc-400">LEFT STICK (L3)</span>
                    <div className="relative w-24 h-24 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center">
                      <div className="w-full h-px bg-zinc-800 absolute" />
                      <div className="h-full w-px bg-zinc-800 absolute" />
                      <div
                        className="w-5 h-5 rounded-full bg-sky-400 shadow-[0_0_10px_#38bdf8] transition-transform duration-75"
                        style={{
                          transform: `translate(${activePad.leftStick.x * 34}px, ${activePad.leftStick.y * 34}px)`
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-sky-300">
                      X:{activePad.leftStick.x.toFixed(2)} Y:{activePad.leftStick.y.toFixed(2)}
                    </span>
                  </div>

                  {/* Triggers & Center Telemetry */}
                  <div className="flex flex-col justify-between gap-2">
                    <div className="space-y-1.5">
                      <div>
                        <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                          <span>{activeGlyphs[6]} Trigger</span>
                          <span>{Math.round(activePad.triggers.left * 100)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-zinc-800 overflow-hidden mt-0.5">
                          <div
                            className="h-full bg-emerald-400 transition-all duration-75"
                            style={{ width: `${Math.round(activePad.triggers.left * 100)}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                          <span>{activeGlyphs[7]} Trigger</span>
                          <span>{Math.round(activePad.triggers.right * 100)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-zinc-800 overflow-hidden mt-0.5">
                          <div
                            className="h-full bg-amber-400 transition-all duration-75"
                            style={{ width: `${Math.round(activePad.triggers.right * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-2 text-[10px] font-mono text-zinc-400 space-y-0.5">
                      <div>VID/PID: {activePad.vendorId || 'std'}:{activePad.productId || 'hid'}</div>
                      <div>Rumble: {activePad.hasRumble ? 'Dual-Actuator Ready' : 'Standard'}</div>
                      <div>Axes: {activePad.axes.length} · Btns: {activePad.buttons.length}</div>
                    </div>
                  </div>

                  {/* Right Stick Visualizer */}
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-mono text-zinc-400">RIGHT STICK (R3)</span>
                    <div className="relative w-24 h-24 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center">
                      <div className="w-full h-px bg-zinc-800 absolute" />
                      <div className="h-full w-px bg-zinc-800 absolute" />
                      <div
                        className="w-5 h-5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399] transition-transform duration-75"
                        style={{
                          transform: `translate(${activePad.rightStick.x * 34}px, ${activePad.rightStick.y * 34}px)`
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-emerald-300">
                      X:{activePad.rightStick.x.toFixed(2)} Y:{activePad.rightStick.y.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Live 17-Button State Grid */}
              {activePad && (
                <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5">
                  {activePad.buttons.slice(0, 18).map((btn) => (
                    <div
                      key={btn.index}
                      className={`px-1.5 py-1.5 rounded-lg border text-center font-mono text-[10px] transition-colors ${
                        btn.pressed
                          ? 'bg-emerald-500 text-zinc-950 border-emerald-300 font-bold shadow-[0_0_10px_rgba(16,185,129,0.6)]'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      <div>{btn.label}</div>
                      <div className="text-[8px] opacity-75">B{btn.index}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Keyboard + Raw Mouse + Pointer Lock Tester */}
          <div className="rounded-xl bg-zinc-950/80 border border-zinc-800 p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-bold text-zinc-100">
                <Keyboard className="w-3.5 h-3.5 text-amber-400" />
                <Mouse className="w-3.5 h-3.5 text-sky-400" />
                <span>Keyboard, Raw Mouse & Pointer Lock FPS Calibration</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-300">
                Touchscreen: {touchCapable ? 'Detected (Multi-Touch Ready)' : 'Desktop Pointer + Virtual Touch Ready'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-2.5 font-mono text-[11px]">
                <div className="text-[10px] text-zinc-500 mb-1">LAST KEYBOARD INPUT</div>
                <div className="text-amber-300 truncate">{lastKeyEvent}</div>
              </div>
              <div
                ref={pointerLockBoxRef}
                onClick={() => {
                  try {
                    pointerLockBoxRef.current?.requestPointerLock?.();
                  } catch {}
                }}
                onMouseMove={(e) =>
                  setMouseTelemetry((prev) => ({
                    ...prev,
                    x: prev.locked ? prev.x + e.movementX : Math.round(e.nativeEvent.offsetX),
                    y: prev.locked ? prev.y + e.movementY : Math.round(e.nativeEvent.offsetY),
                    buttons: e.buttons
                  }))
                }
                className={`rounded-lg border p-2.5 font-mono text-[11px] cursor-crosshair select-none ${
                  mouseTelemetry.locked
                    ? 'bg-sky-500/20 border-sky-400 text-sky-100'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-sky-500/50'
                }`}
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-zinc-400 flex items-center gap-1">
                    <Crosshair className="w-3 h-3 text-sky-400" />
                    {mouseTelemetry.locked ? 'RAW FPS POINTER LOCKED (ESC to exit)' : 'Click to Test Raw FPS Pointer Lock'}
                  </span>
                </div>
                <div className="text-sky-300 mt-1">
                  ΔX:{mouseTelemetry.x} · ΔY:{mouseTelemetry.y} · BtnMask:{mouseTelemetry.buttons}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Deadzone, Sensitivity & Custom Button Remapper */}
        <div className="lg:col-span-5 rounded-xl bg-zinc-900/90 border border-zinc-800 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-bold text-zinc-100 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Analog Curves & Universal Remapper</span>
            </div>
            <button
              type="button"
              onClick={() => setProfile(saveControllerProfile(DEFAULT_CONTROLLER_PROFILE))}
              className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          <div className="space-y-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl p-3">
            <label className="block space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-300">Stick Deadzone</span>
                <span className="font-mono text-amber-300">{Math.round(profile.deadzone * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={0.4}
                step={0.01}
                value={profile.deadzone}
                onChange={(e) => updateProfile({ deadzone: Number(e.target.value) })}
                className="w-full accent-amber-400"
              />
            </label>

            <label className="block space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-300">Stick Response Sensitivity</span>
                <span className="font-mono text-sky-300">{profile.sensitivity.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={0.4}
                max={2.0}
                step={0.05}
                value={profile.sensitivity}
                onChange={(e) => updateProfile({ sensitivity: Number(e.target.value) })}
                className="w-full accent-sky-400"
              />
            </label>

            <label className="block space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-300">Dual-Rumble Haptic Force</span>
                <span className="font-mono text-emerald-300">{Math.round(profile.rumbleStrength * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={profile.rumbleStrength}
                onChange={(e) => updateProfile({ rumbleStrength: Number(e.target.value) })}
                className="w-full accent-emerald-400"
              />
            </label>

            <div className="flex flex-wrap gap-3 pt-1 text-[11px]">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.invertRightY}
                  onChange={(e) => updateProfile({ invertRightY: e.target.checked })}
                  className="accent-amber-400"
                />
                <span>Invert Right Stick Y</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.gamepadToKeyboardEnabled}
                  onChange={(e) => updateProfile({ gamepadToKeyboardEnabled: e.target.checked })}
                  className="accent-emerald-400"
                />
                <span>Gamepad → KB/Mouse Bridge</span>
              </label>
            </div>
          </div>

          {/* Remap Table */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-zinc-200">Button → Key/Mouse Binding (Click to Rebind)</span>
              {remappingButton !== null && (
                <span className="text-amber-300 font-mono animate-pulse">
                  Press any key for {activeGlyphs[remappingButton] || `B${remappingButton}`}...
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
              {Object.entries(profile.buttonBindings).map(([btnIdxStr, boundCode]) => {
                const idx = Number(btnIdxStr);
                const isListening = remappingButton === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRemappingButton(isListening ? null : idx)}
                    className={`px-2 py-1.5 rounded-lg border flex items-center justify-between text-[10px] font-mono cursor-pointer ${
                      isListening
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                        : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                    }`}
                  >
                    <span className="font-bold text-sky-300">{activeGlyphs[idx] || `B${idx}`}</span>
                    <span className="text-zinc-400">→ {isListening ? 'Listening...' : boundCode}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Floating Multi-Touch Virtual Gamepad Overlay + Global Hardware Gamepad Bridge
 * Enables touchscreen gaming AND hardware controller desktop/game control OS-wide.
 */
export const FloatingTouchGamepadOverlay: React.FC<{
  onClose?: () => void;
}> = ({ onClose }) => {
  const [osProfile, setOsProfile] = useState(() => loadOSCustomizationProfile());
  const [inputProfile, setInputProfile] = useState(() => loadControllerProfile());
  const [opacityPct, setOpacityPct] = useState<number>(82);
  const [leftKnob, setLeftKnob] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rightKnob, setRightKnob] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [pressedBtns, setPressedBtns] = useState<Record<number, boolean>>({});
  const [lastAction, setLastAction] = useState<string>('Multi-Touch Virtual Controller Active');

  useEffect(() => {
    const onCustom = (e: Event) => {
      setOsProfile((e as CustomEvent).detail || loadOSCustomizationProfile());
    };
    const onInput = (e: Event) => {
      setInputProfile((e as CustomEvent).detail || loadControllerProfile());
    };
    window.addEventListener('sovereign_os_customization_changed', onCustom);
    window.addEventListener('sovereign_input_profile_changed', onInput);
    return () => {
      window.removeEventListener('sovereign_os_customization_changed', onCustom);
      window.removeEventListener('sovereign_input_profile_changed', onInput);
    };
  }, []);

  const glyphs = getButtonGlyphsForFamily(
    osProfile.controllerGlyphStyle === 'auto' ? 'xbox' : osProfile.controllerGlyphStyle
  );

  const pressButton = (btnIdx: number, isDown: boolean) => {
    setPressedBtns((prev) => ({ ...prev, [btnIdx]: isDown }));
    const mappedCode = inputProfile.buttonBindings[btnIdx] || 'Space';
    dispatchSyntheticKeyEvent(mappedCode, isDown ? 'keydown' : 'keyup');
    if (isDown) {
      setLastAction(`${glyphs[btnIdx] || `B${btnIdx}`} → ${mappedCode}`);
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try {
          navigator.vibrate(14);
        } catch {}
      }
    }
  };

  const handleStickMove = (
    stick: 'left' | 'right',
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width / 2 - 12;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, maxR);
    const angle = Math.atan2(dy, dx);
    const nx = Math.cos(angle) * (clampedDist / maxR);
    const ny = Math.sin(angle) * (clampedDist / maxR);

    if (stick === 'left') {
      setLeftKnob({ x: nx, y: ny });
      // Map left stick to WASD for universal browser/cloud/Steam compatibility
      dispatchSyntheticKeyEvent('KeyW', ny < -0.35 ? 'keydown' : 'keyup');
      dispatchSyntheticKeyEvent('KeyS', ny > 0.35 ? 'keydown' : 'keyup');
      dispatchSyntheticKeyEvent('KeyA', nx < -0.35 ? 'keydown' : 'keyup');
      dispatchSyntheticKeyEvent('KeyD', nx > 0.35 ? 'keydown' : 'keyup');
    } else {
      setRightKnob({ x: nx, y: ny });
    }
    window.dispatchEvent(
      new CustomEvent('sovereign_virtual_controller_input', {
        detail: { kind: 'stick', stick, x: Number(nx.toFixed(3)), y: Number(ny.toFixed(3)) }
      })
    );
  };

  const resetStick = (stick: 'left' | 'right') => {
    if (stick === 'left') {
      setLeftKnob({ x: 0, y: 0 });
      ['KeyW', 'KeyA', 'KeyS', 'KeyD'].forEach((k) => dispatchSyntheticKeyEvent(k, 'keyup'));
    } else {
      setRightKnob({ x: 0, y: 0 });
    }
  };

  const handleClose = () => {
    saveOSCustomizationProfile({ showTouchControllerOverlay: false });
    onClose?.();
  };

  return (
    <div
      style={{ opacity: opacityPct / 100 }}
      className="fixed inset-x-2 sm:inset-x-6 bottom-14 z-[140] pointer-events-none select-none"
    >
      <div className="max-w-3xl mx-auto rounded-2xl bg-zinc-950/90 backdrop-blur-xl border border-sky-500/40 shadow-2xl p-3 pointer-events-auto">
        {/* Top Shoulder Triggers & Controls */}
        <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-zinc-800/90">
          <div className="flex items-center gap-1.5">
            {[
              { idx: 6, label: glyphs[6] },
              { idx: 4, label: glyphs[4] }
            ].map((b) => (
              <button
                key={b.idx}
                type="button"
                onPointerDown={() => pressButton(b.idx, true)}
                onPointerUp={() => pressButton(b.idx, false)}
                onPointerLeave={() => pressedBtns[b.idx] && pressButton(b.idx, false)}
                className={`px-3 py-1 rounded-lg border font-mono text-[11px] font-bold touch-none cursor-pointer ${
                  pressedBtns[b.idx]
                    ? 'bg-sky-400 text-zinc-950 border-sky-200'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-200'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
            <Sparkles className="w-3 h-3 text-amber-400 hidden sm:inline" />
            <span className="truncate max-w-[180px] text-sky-300">{lastAction}</span>
            <input
              type="range"
              min={35}
              max={100}
              value={opacityPct}
              onChange={(e) => setOpacityPct(Number(e.target.value))}
              className="w-14 accent-sky-400 hidden sm:inline"
              title="Overlay Opacity"
            />
            <button
              type="button"
              onClick={handleClose}
              className="p-1 rounded-lg bg-zinc-900 hover:bg-rose-500/20 border border-zinc-700 text-zinc-300 hover:text-rose-300 cursor-pointer"
              title="Close Touch Controller"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {[
              { idx: 5, label: glyphs[5] },
              { idx: 7, label: glyphs[7] }
            ].map((b) => (
              <button
                key={b.idx}
                type="button"
                onPointerDown={() => pressButton(b.idx, true)}
                onPointerUp={() => pressButton(b.idx, false)}
                onPointerLeave={() => pressedBtns[b.idx] && pressButton(b.idx, false)}
                className={`px-3 py-1 rounded-lg border font-mono text-[11px] font-bold touch-none cursor-pointer ${
                  pressedBtns[b.idx]
                    ? 'bg-amber-400 text-zinc-950 border-amber-200'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-200'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Touch Gamepad Deck */}
        <div className="grid grid-cols-3 items-center gap-3">
          {/* Left: Virtual Analog Stick + Mini D-Pad */}
          <div className="flex items-center justify-center gap-3">
            <div
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                handleStickMove('left', e);
              }}
              onPointerMove={(e) => {
                if (e.buttons > 0 || e.pressure > 0) handleStickMove('left', e);
              }}
              onPointerUp={() => resetStick('left')}
              onPointerCancel={() => resetStick('left')}
              className="relative w-24 h-24 rounded-full bg-zinc-900/90 border-2 border-zinc-700 flex items-center justify-center touch-none cursor-grab active:cursor-grabbing"
            >
              <Move className="w-4 h-4 text-zinc-700 absolute" />
              <div
                className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 border border-sky-200 shadow-lg"
                style={{
                  transform: `translate(${leftKnob.x * 28}px, ${leftKnob.y * 28}px)`
                }}
              />
            </div>

            <div className="hidden sm:grid grid-cols-3 gap-0.5 w-20">
              <div />
              <button
                type="button"
                onPointerDown={() => pressButton(12, true)}
                onPointerUp={() => pressButton(12, false)}
                className={`h-6 rounded bg-zinc-900 border border-zinc-700 text-[10px] touch-none cursor-pointer ${pressedBtns[12] ? 'bg-sky-400 text-zinc-950' : ''}`}
              >
                ▲
              </button>
              <div />
              <button
                type="button"
                onPointerDown={() => pressButton(14, true)}
                onPointerUp={() => pressButton(14, false)}
                className={`h-6 rounded bg-zinc-900 border border-zinc-700 text-[10px] touch-none cursor-pointer ${pressedBtns[14] ? 'bg-sky-400 text-zinc-950' : ''}`}
              >
                ◀
              </button>
              <div className="h-6 rounded bg-zinc-950 border border-zinc-800" />
              <button
                type="button"
                onPointerDown={() => pressButton(15, true)}
                onPointerUp={() => pressButton(15, false)}
                className={`h-6 rounded bg-zinc-900 border border-zinc-700 text-[10px] touch-none cursor-pointer ${pressedBtns[15] ? 'bg-sky-400 text-zinc-950' : ''}`}
              >
                ▶
              </button>
              <div />
              <button
                type="button"
                onPointerDown={() => pressButton(13, true)}
                onPointerUp={() => pressButton(13, false)}
                className={`h-6 rounded bg-zinc-900 border border-zinc-700 text-[10px] touch-none cursor-pointer ${pressedBtns[13] ? 'bg-sky-400 text-zinc-950' : ''}`}
              >
                ▼
              </button>
              <div />
            </div>
          </div>

          {/* Center: View / Guide / Menu */}
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="flex items-center gap-1.5">
              {[8, 16, 9].map((idx) => (
                <button
                  key={idx}
                  type="button"
                  onPointerDown={() => pressButton(idx, true)}
                  onPointerUp={() => pressButton(idx, false)}
                  className={`px-2 py-1 rounded-full border font-mono text-[10px] touch-none cursor-pointer ${
                    idx === 16
                      ? 'bg-amber-500/20 border-amber-400/60 text-amber-200 font-bold'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-300'
                  } ${pressedBtns[idx] ? 'scale-95 bg-amber-400 text-zinc-950' : ''}`}
                >
                  {glyphs[idx]}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 text-[9px] text-emerald-300 font-mono">
              <CheckCircle2 className="w-3 h-3" />
              <span>WASD + Steam Input Active</span>
            </div>
          </div>

          {/* Right: Face Buttons + Mini Right Stick */}
          <div className="flex items-center justify-center gap-3">
            <div
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                handleStickMove('right', e);
              }}
              onPointerMove={(e) => {
                if (e.buttons > 0 || e.pressure > 0) handleStickMove('right', e);
              }}
              onPointerUp={() => resetStick('right')}
              onPointerCancel={() => resetStick('right')}
              className="hidden sm:flex relative w-16 h-16 rounded-full bg-zinc-900/90 border border-zinc-700 items-center justify-center touch-none cursor-grab"
            >
              <div
                className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 border border-emerald-200 shadow"
                style={{
                  transform: `translate(${rightKnob.x * 18}px, ${rightKnob.y * 18}px)`
                }}
              />
            </div>

            <div className="grid grid-cols-3 gap-1 w-24">
              <div />
              <button
                type="button"
                onPointerDown={() => pressButton(3, true)}
                onPointerUp={() => pressButton(3, false)}
                className={`w-7 h-7 rounded-full border font-bold text-xs touch-none cursor-pointer ${
                  pressedBtns[3]
                    ? 'bg-amber-400 text-zinc-950 border-amber-200'
                    : 'bg-zinc-900 border-amber-500/50 text-amber-300'
                }`}
              >
                {glyphs[3]}
              </button>
              <div />
              <button
                type="button"
                onPointerDown={() => pressButton(2, true)}
                onPointerUp={() => pressButton(2, false)}
                className={`w-7 h-7 rounded-full border font-bold text-xs touch-none cursor-pointer ${
                  pressedBtns[2]
                    ? 'bg-sky-400 text-zinc-950 border-sky-200'
                    : 'bg-zinc-900 border-sky-500/50 text-sky-300'
                }`}
              >
                {glyphs[2]}
              </button>
              <div />
              <button
                type="button"
                onPointerDown={() => pressButton(1, true)}
                onPointerUp={() => pressButton(1, false)}
                className={`w-7 h-7 rounded-full border font-bold text-xs touch-none cursor-pointer ${
                  pressedBtns[1]
                    ? 'bg-rose-400 text-zinc-950 border-rose-200'
                    : 'bg-zinc-900 border-rose-500/50 text-rose-300'
                }`}
              >
                {glyphs[1]}
              </button>
              <div />
              <button
                type="button"
                onPointerDown={() => pressButton(0, true)}
                onPointerUp={() => pressButton(0, false)}
                className={`w-7 h-7 rounded-full border font-bold text-xs touch-none cursor-pointer ${
                  pressedBtns[0]
                    ? 'bg-emerald-400 text-zinc-950 border-emerald-200'
                    : 'bg-zinc-900 border-emerald-500/50 text-emerald-300'
                }`}
              >
                {glyphs[0]}
              </button>
              <div />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
