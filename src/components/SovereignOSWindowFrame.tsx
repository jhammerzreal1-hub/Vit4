/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 * (TWENTY 47 PROTOCOL - GENESIS NODE / LYSANDER CORE EULA / H-FID Forensic License v1.1).
 * Zenodo DOI: https://doi.org/10.5281/zenodo.20778079 | ORCID: https://orcid.org/0009-0004-5273-7028
 */

import React, { useEffect, useRef, useState } from 'react';
import { SoSMeshIcon } from './SoSMeshIcon';
import { AdminCommandIcon } from './AdminCommandIcon';
import {
  canAccessAdminCommandCenter,
  canUserAccessModule,
  isExecutiveArchitectUser,
  type AuthUserPublic
} from '../types/auth';
import {
  Minus,
  Square,
  Copy,
  X,
  PanelLeft,
  PanelRight,
  Layers,
  Grid2x2,
  EyeOff,
  Terminal,
  Folder,
  Globe,
  MessageSquare,
  Cpu,
  Activity,
  Settings,
  Shield,
  Sparkles,
  Briefcase,
  PictureInPicture2,
  Bot,
  LayoutGrid,
  RefreshCw,
  HardDrive,
  Archive,
  ShieldAlert,
  Send,
  Gamepad2,
  Package,
  Video,
  Film,
  Download,
  Wallet,
  BookOpen,
  FilePlus2,
  FolderPlus,
  Trash2,
  Pencil,
  RotateCcw,
  FileText,
  Link2,
  SlidersHorizontal,
  Save,
  Smartphone,
  Award,
  ArrowUpDown,
  GripHorizontal
} from 'lucide-react';
import { ALL_MODULES } from './Navigation';
import type { ModuleType } from '../types';
import {
  loadOSCustomizationProfile,
  saveOSCustomizationProfile,
  applyOSCustomizationToDOM,
  getActiveThemeWallpaperStyle,
  hideDesktopIcon,
  restoreAllDesktopIcons,
  renameDesktopIcon,
  addCustomDesktopShortcut,
  removeCustomDesktopShortcut,
  type CustomDesktopShortcut,
  type SovereignOSCustomizationProfile
} from '../utils/osCustomizationStore';
import { apiFetch, buildAuthHeaders } from '../utils/authClient';

export interface OSWindowGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
}

export function clampWindowGeometry(
  geom: OSWindowGeometry,
  containerW: number,
  containerH: number
): OSWindowGeometry {
  const safeW = Math.max(containerW, 300);
  const safeH = Math.max(containerH, 220);
  const minW = Math.min(280, safeW - 8);
  const minH = Math.min(200, safeH - 8);
  const width = Math.max(minW, Math.min(geom.width, safeW - 8));
  const height = Math.max(minH, Math.min(geom.height, safeH - 8));
  // Keep at least 180px of the titlebar reachable horizontally and the full 44px titlebar visible vertically
  const minVisibleStrip = Math.min(180, Math.max(120, width));
  const minX = -(width - minVisibleStrip);
  const maxX = Math.max(0, safeW - minVisibleStrip);
  const maxY = Math.max(0, safeH - 52);
  return {
    ...geom,
    width,
    height,
    x: Math.max(minX, Math.min(geom.x, maxX)),
    y: Math.max(0, Math.min(geom.y, maxY))
  };
}

export function createDefaultWindowGeometry(
  index: number,
  containerW: number,
  containerH: number,
  zIndex: number
): OSWindowGeometry {
  const safeW = Math.max(containerW || 1200, 640);
  const safeH = Math.max(containerH || 700, 420);
  const width = Math.min(860, Math.max(480, Math.round(safeW * 0.62)));
  const height = Math.min(640, Math.max(380, Math.round(safeH * 0.78)));
  const stepX = (index % 6) * 34;
  const stepY = (index % 5) * 28;
  const maxInitialX = Math.max(8, safeW - width - 8);
  const maxInitialY = Math.max(8, safeH - height - 8);
  return clampWindowGeometry(
    {
      x: Math.min(24 + stepX, maxInitialX),
      y: Math.min(20 + stepY, maxInitialY),
      width,
      height,
      zIndex,
      minimized: false,
      maximized: false
    },
    safeW,
    safeH
  );
}

interface SovereignOSWindowFrameProps {
  moduleId: ModuleType;
  mode: 'floating' | 'tiled' | 'pip';
  visible: boolean;
  tiledClassName?: string;
  geometry?: OSWindowGeometry;
  isFocused?: boolean;
  alwaysOnTop?: boolean;
  isDetached?: boolean;
  pipMinimized?: boolean;
  containerSize?: { width: number; height: number };
  onFocus?: () => void;
  onMinimize?: () => void;
  onToggleMaximize?: () => void;
  onSnapLeft?: () => void;
  onSnapRight?: () => void;
  onToggleDetach?: () => void;
  onRestorePip?: () => void;
  onClose?: () => void;
  onMoveResize?: (next: Partial<OSWindowGeometry>) => void;
  children: React.ReactNode;
}

type DragAction = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const SovereignOSWindowFrameInner: React.FC<SovereignOSWindowFrameProps> = ({
  moduleId,
  mode,
  visible,
  tiledClassName = 'flex flex-1 min-w-0 min-h-0 flex-col',
  geometry,
  isFocused = false,
  alwaysOnTop = false,
  isDetached = false,
  pipMinimized = false,
  containerSize = { width: 1280, height: 720 },
  onFocus,
  onMinimize,
  onToggleMaximize,
  onSnapLeft,
  onSnapRight,
  onToggleDetach,
  onRestorePip,
  onClose,
  onMoveResize,
  children
}) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const coordsBadgeRef = useRef<HTMLSpanElement | null>(null);
  const dragSessionRef = useRef<{
    type: DragAction;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
    startedMaximized: boolean;
    unmaximized: boolean;
    pointerRatioX: number;
    containerLeft: number;
    containerTop: number;
  } | null>(null);
  const lastInteractionEndRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const [activeInteraction, setActiveInteraction] = useState<DragAction | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<DragAction | null>(null);
  const isInteracting = activeInteraction !== null;

  const meta = ALL_MODULES.find((m) => m.id === moduleId);
  const Icon = meta?.icon || Terminal;

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (typeof document !== 'undefined') {
        document.body.style.userSelect = '';
      }
    };
  }, []);

  const isTiled = mode === 'tiled';
  const rawGeom = geometry || createDefaultWindowGeometry(0, containerSize.width, containerSize.height, 45);
  const safeGeom = clampWindowGeometry(rawGeom, containerSize.width, containerSize.height);
  const isPipPill = mode === 'pip' && pipMinimized;
  const isHidden = isTiled
    ? !visible
    : isPipPill
    ? true
    : mode === 'floating'
    ? !visible || safeGeom.minimized
    : !visible;

  const effectiveZ = alwaysOnTop ? Math.max(safeGeom.zIndex, 46) : safeGeom.zIndex;

  // Guard prevents accidental button clicks within 160ms of ending a drag/resize
  const safeControlClick = (handler?: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (Date.now() - lastInteractionEndRef.current < 160) return;
    handler?.();
  };

  const startDrag = (e: React.PointerEvent, type: DragAction) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, [data-window-controls="true"]')) return;
    e.preventDefault();
    e.stopPropagation();
    onFocus?.();

    const frameEl = (e.currentTarget as HTMLElement).closest('.sovereign-window-wrapper') as HTMLElement | null;
    const parentRect = frameEl?.offsetParent?.getBoundingClientRect() || { left: 0, top: 0 };
    const frameRect = frameEl?.getBoundingClientRect();
    const pointerRatioX =
      frameRect && frameRect.width > 0
        ? Math.max(0.15, Math.min(0.85, (e.clientX - frameRect.left) / frameRect.width))
        : 0.5;

    // Restored dimensions when dragging out of a maximized window
    const restoredW = Math.min(
      Math.max(420, safeGeom.width),
      Math.max(420, containerSize.width - 80)
    );
    const restoredH = Math.min(
      Math.max(320, safeGeom.height),
      Math.max(320, containerSize.height - 64)
    );

    dragSessionRef.current = {
      type,
      startX: e.clientX,
      startY: e.clientY,
      origX: safeGeom.x,
      origY: safeGeom.y,
      origW: safeGeom.maximized ? restoredW : safeGeom.width,
      origH: safeGeom.maximized ? restoredH : safeGeom.height,
      startedMaximized: safeGeom.maximized,
      unmaximized: false,
      pointerRatioX,
      containerLeft: parentRect.left,
      containerTop: parentRect.top
    };
    setActiveInteraction(type);
    if (typeof document !== 'undefined') {
      document.body.style.userSelect = 'none';
    }

    let pendingCommit: Partial<OSWindowGeometry> | null = null;
    let pendingMoveDx = 0;
    let pendingMoveDy = 0;
    let pendingBox: { x: number; y: number; w: number; h: number } | null = null;

    const applyLiveFrameToDom = () => {
      rafRef.current = 0;
      const el = wrapperRef.current;
      if (!el) return;
      const sess = dragSessionRef.current;
      if (!sess) return;

      if (sess.type === 'move') {
        if (sess.unmaximized && pendingBox) {
          el.style.left = `${Math.round(pendingBox.x)}px`;
          el.style.top = `${Math.round(pendingBox.y)}px`;
          el.style.width = `${Math.round(pendingBox.w)}px`;
          el.style.height = `${Math.round(pendingBox.h)}px`;
        }
        el.style.transform = `translate3d(${Math.round(pendingMoveDx)}px, ${Math.round(pendingMoveDy)}px, 0)`;
        if (coordsBadgeRef.current && pendingCommit) {
          coordsBadgeRef.current.textContent = `X ${Math.round(pendingCommit.x ?? sess.origX)} · Y ${Math.round(pendingCommit.y ?? sess.origY)}`;
        }
      } else if (pendingBox) {
        el.style.left = `${Math.round(pendingBox.x)}px`;
        el.style.top = `${Math.round(pendingBox.y)}px`;
        el.style.width = `${Math.round(pendingBox.w)}px`;
        el.style.height = `${Math.round(pendingBox.h)}px`;
        if (coordsBadgeRef.current) {
          coordsBadgeRef.current.textContent = `${Math.round(pendingBox.w)} × ${Math.round(pendingBox.h)}`;
        }
      }
    };

    const scheduleDomFrame = () => {
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(applyLiveFrameToDom);
      }
    };

    const handlePointerMove = (moveEvt: PointerEvent) => {
      const sess = dragSessionRef.current;
      if (!sess) return;
      const dx = moveEvt.clientX - sess.startX;
      const dy = moveEvt.clientY - sess.startY;
      const minW = Math.min(280, Math.max(220, containerSize.width - 12));
      const minH = Math.min(200, Math.max(170, containerSize.height - 12));

      if (sess.type === 'move') {
        if (sess.startedMaximized && !sess.unmaximized) {
          if (Math.hypot(dx, dy) < 6) return;
          sess.unmaximized = true;
          const localCursorX = moveEvt.clientX - sess.containerLeft;
          const localCursorY = moveEvt.clientY - sess.containerTop;
          sess.origX = Math.round(localCursorX - sess.origW * sess.pointerRatioX);
          sess.origY = Math.max(0, Math.round(localCursorY - 22));
          sess.startX = moveEvt.clientX;
          sess.startY = moveEvt.clientY;
          const clampedTear = clampWindowGeometry(
            {
              ...safeGeom,
              x: sess.origX,
              y: sess.origY,
              width: sess.origW,
              height: sess.origH,
              maximized: false
            },
            containerSize.width,
            containerSize.height
          );
          sess.origX = Math.round(clampedTear.x);
          sess.origY = Math.round(clampedTear.y);
          pendingBox = {
            x: sess.origX,
            y: sess.origY,
            w: Math.round(clampedTear.width),
            h: Math.round(clampedTear.height)
          };
          pendingMoveDx = 0;
          pendingMoveDy = 0;
          pendingCommit = {
            x: sess.origX,
            y: sess.origY,
            width: Math.round(clampedTear.width),
            height: Math.round(clampedTear.height),
            maximized: false
          };
          scheduleDomFrame();
          return;
        }

        const clamped = clampWindowGeometry(
          {
            ...safeGeom,
            x: sess.origX + dx,
            y: sess.origY + dy,
            width: sess.origW,
            height: sess.origH,
            maximized: false
          },
          containerSize.width,
          containerSize.height
        );
        const finalX = Math.round(clamped.x);
        const finalY = Math.round(clamped.y);
        pendingMoveDx = finalX - sess.origX;
        pendingMoveDy = finalY - sess.origY;
        pendingCommit = {
          x: finalX,
          y: finalY,
          ...(sess.unmaximized ? { width: Math.round(sess.origW), height: Math.round(sess.origH) } : {}),
          maximized: false
        };
        scheduleDomFrame();
        return;
      }

      let nextX = sess.origX;
      let nextY = sess.origY;
      let nextW = sess.origW;
      let nextH = sess.origH;

      // Horizontal resize
      if (sess.type.includes('e')) {
        const maxW = Math.max(minW, containerSize.width - sess.origX - 4);
        nextW = Math.max(minW, Math.min(maxW, sess.origW + dx));
      } else if (sess.type.includes('w')) {
        const maxDelta = sess.origW - minW;
        const clampedDx = Math.max(-sess.origX + 4, Math.min(maxDelta, dx));
        nextX = sess.origX + clampedDx;
        nextW = sess.origW - clampedDx;
      }

      // Vertical resize
      if (sess.type.includes('s')) {
        const maxH = Math.max(minH, containerSize.height - sess.origY - 4);
        nextH = Math.max(minH, Math.min(maxH, sess.origH + dy));
      } else if (sess.type.includes('n')) {
        const maxDelta = sess.origH - minH;
        const clampedDy = Math.max(-sess.origY + 4, Math.min(maxDelta, dy));
        nextY = sess.origY + clampedDy;
        nextH = sess.origH - clampedDy;
      }

      pendingBox = {
        x: Math.round(nextX),
        y: Math.round(nextY),
        w: Math.round(nextW),
        h: Math.round(nextH)
      };
      pendingCommit = {
        x: pendingBox.x,
        y: pendingBox.y,
        width: pendingBox.w,
        height: pendingBox.h,
        maximized: false
      };
      scheduleDomFrame();
    };

    const finishDrag = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      const el = wrapperRef.current;
      if (el) {
        el.style.transform = '';
      }
      if (pendingCommit && onMoveResize) {
        onMoveResize(pendingCommit);
        pendingCommit = null;
      }
      dragSessionRef.current = null;
      lastInteractionEndRef.current = Date.now();
      setActiveInteraction(null);
      if (typeof document !== 'undefined') {
        document.body.style.userSelect = '';
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', finishDrag);
      window.removeEventListener('pointercancel', finishDrag);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', finishDrag);
  };

  const windowStyle: React.CSSProperties = safeGeom.maximized
    ? {
        top: 4,
        left: 4,
        width: 'calc(100% - 8px)',
        height: 'calc(100% - 8px)',
        zIndex: effectiveZ,
        willChange: isInteracting ? 'transform, left, top, width, height' : undefined
      }
    : {
        top: `min(${safeGeom.y}px, max(0px, calc(100% - 220px)))`,
        left: safeGeom.x,
        width: safeGeom.width,
        maxWidth: 'calc(100% - 8px)',
        height: safeGeom.height,
        maxHeight: `calc(100% - min(${safeGeom.y}px, max(0px, calc(100% - 220px))) - 6px)`,
        zIndex: effectiveZ,
        willChange: isInteracting ? 'transform, left, top, width, height' : undefined
      };

  const activeResizeEdge = activeInteraction && activeInteraction !== 'move' ? activeInteraction : hoveredHandle;
  const edgeGlow = (dir: 'n' | 's' | 'e' | 'w') =>
    Boolean(activeResizeEdge && activeResizeEdge.includes(dir));

  return (
    <>
      <div
        id={`sovereign-window-${moduleId}`}
        ref={wrapperRef}
        aria-hidden={isHidden ? 'true' : undefined}
        onPointerDownCapture={(e) => {
          if (isTiled || isHidden || isFocused) return;
          const target = e.target as HTMLElement | null;
          if (target?.closest('textarea, input, select, [contenteditable="true"]')) {
            requestAnimationFrame(() => onFocus?.());
            return;
          }
          onFocus?.();
        }}
        style={isTiled || isHidden ? undefined : windowStyle}
        className={
          isHidden
            ? 'sovereign-window-wrapper hidden'
            : isTiled
            ? tiledClassName
            : 'sovereign-window-wrapper absolute overflow-visible'
        }
      >
        {/* Inner Clipped Window Surface (Consistent Fiber depth across all modes so children NEVER unmount) */}
        <div
          style={
            isTiled
              ? undefined
              : {
                  borderRadius: 'var(--sovereign-window-radius, 14px)'
                }
          }
          className={
            isTiled
              ? 'w-full h-full flex flex-col min-h-0 overflow-hidden'
              : `sovereign-window relative w-full h-full flex flex-col overflow-hidden bg-zinc-950 ${
                  isInteracting
                    ? 'border-2 border-sky-400/85 shadow-[0_18px_48px_rgba(0,0,0,0.88)]'
                    : isDetached || alwaysOnTop
                    ? 'border border-amber-400/75 shadow-[0_18px_48px_rgba(0,0,0,0.85)] ring-1 ring-amber-400/35'
                    : isFocused
                    ? 'border border-amber-500/55 shadow-[0_16px_42px_rgba(0,0,0,0.75)] ring-1 ring-amber-500/20'
                    : 'border border-zinc-800/95 shadow-[0_10px_28px_rgba(0,0,0,0.55)]'
                }`
          }
        >
          {/* Subtle Visual Edge Glow When Hovering or Dragging a Resize Handle */}
          {!isTiled && !isHidden && !safeGeom.maximized && edgeGlow('n') && (
            <div className="pointer-events-none absolute top-0 inset-x-0 h-[2px] bg-sky-400 z-40" />
          )}
          {!isTiled && !isHidden && !safeGeom.maximized && edgeGlow('s') && (
            <div className="pointer-events-none absolute bottom-0 inset-x-0 h-[2px] bg-sky-400 z-40" />
          )}
          {!isTiled && !isHidden && !safeGeom.maximized && edgeGlow('w') && (
            <div className="pointer-events-none absolute left-0 inset-y-0 w-[2px] bg-sky-400 z-40" />
          )}
          {!isTiled && !isHidden && !safeGeom.maximized && edgeGlow('e') && (
            <div className="pointer-events-none absolute right-0 inset-y-0 w-[2px] bg-sky-400 z-40" />
          )}

          {/* Generous 44px Window Title Bar — Easy Grab & Drag, Separated Mistake-Proof Controls */}
          {!isTiled && !isHidden && (
            <div
              onPointerDown={(e) => startDrag(e, 'move')}
              onDoubleClick={(e) => {
                if ((e.target as HTMLElement).closest('button, [data-window-controls="true"]')) return;
                onToggleMaximize?.();
              }}
          className={`h-11 pl-3.5 pr-3 flex items-center justify-between gap-3 shrink-0 select-none touch-none border-b cursor-grab active:cursor-grabbing ${
            isDetached || alwaysOnTop
              ? 'bg-gradient-to-r from-zinc-900 via-amber-950/35 to-zinc-900 border-amber-500/35 text-amber-100'
              : isFocused
              ? 'bg-zinc-900/95 border-zinc-800 text-zinc-100'
              : 'bg-zinc-950/95 border-zinc-900 text-zinc-400'
          }`}
          title={
            safeGeom.maximized
              ? 'Drag down to restore & move, or double-click to restore'
              : 'Drag to move window, or double-click to maximize'
          }
        >
          {/* Left: Drag Grip + Window Identity + Live Move/Resize Dimensions */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <GripHorizontal className="w-4 h-4 text-zinc-500 shrink-0 opacity-75" aria-hidden="true" />
            <Icon className={`w-4 h-4 shrink-0 ${meta?.accentColor || 'text-amber-400'}`} />
            <span className="text-xs font-semibold truncate">{meta?.label || moduleId}</span>
            {isInteracting ? (
              <span
                ref={coordsBadgeRef}
                className="text-[11px] font-mono text-sky-300 tabular-nums whitespace-nowrap"
              >
                {activeInteraction === 'move'
                  ? `X ${Math.round(safeGeom.x)} · Y ${Math.round(safeGeom.y)}`
                  : `${Math.round(safeGeom.width)} × ${Math.round(safeGeom.height)}`}
              </span>
            ) : isDetached ? (
              <span className="text-[10px] font-mono text-amber-300/90 whitespace-nowrap hidden md:inline">
                · Detached
              </span>
            ) : null}
          </div>

          {/* Right: Separated Layout Helpers & Mistake-Proof Window Controls */}
          <div
            data-window-controls="true"
            onPointerDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 shrink-0 cursor-default"
          >
            {/* Group 1: Quiet Layout Helpers (Detach, Snap Left, Snap Right) */}
            {(onToggleDetach || onSnapLeft || onSnapRight) && (
              <div className="hidden sm:flex items-center gap-1 p-0.5 rounded-lg bg-zinc-950/70 border border-zinc-800/90">
                {onToggleDetach && (
                  <button
                    type="button"
                    onClick={safeControlClick(onToggleDetach)}
                    className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                      isDetached
                        ? 'bg-amber-500/25 text-amber-200 hover:bg-amber-500/35'
                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-amber-300'
                    }`}
                    title={isDetached ? 'Re-Dock Window into Desktop' : 'Pin Always-On-Top Floating Window'}
                    aria-label={isDetached ? 'Re-Dock Window' : 'Detach Window'}
                  >
                    <PictureInPicture2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {onSnapLeft && (
                  <button
                    type="button"
                    onClick={safeControlClick(onSnapLeft)}
                    className="h-7 w-7 rounded-md flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors cursor-pointer"
                    title="Snap Left Half"
                    aria-label="Snap Left Half"
                  >
                    <PanelLeft className="w-3.5 h-3.5" />
                  </button>
                )}
                {onSnapRight && (
                  <button
                    type="button"
                    onClick={safeControlClick(onSnapRight)}
                    className="h-7 w-7 rounded-md flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors cursor-pointer"
                    title="Snap Right Half"
                    aria-label="Snap Right Half"
                  >
                    <PanelRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Clear Divider Separating Layout Helpers from Primary Window Actions */}
            {(onToggleDetach || onSnapLeft || onSnapRight) && (onMinimize || onToggleMaximize || onClose) && (
              <div className="hidden sm:block h-5 w-px bg-zinc-700/80 mx-0.5" aria-hidden="true" />
            )}

            {/* Group 2: Minimize & Maximize/Restore with Generous Spacing */}
            <div className="flex items-center gap-2">
              {onMinimize && (
                <button
                  type="button"
                  onClick={safeControlClick(onMinimize)}
                  className="h-8 w-8 rounded-lg bg-zinc-800/75 hover:bg-amber-500/20 border border-zinc-700/80 hover:border-amber-400/50 text-zinc-300 hover:text-amber-200 flex items-center justify-center transition-colors cursor-pointer"
                  title="Minimize Window to Taskbar"
                  aria-label="Minimize Window"
                >
                  <Minus className="w-4 h-4" />
                </button>
              )}
              {onToggleMaximize && (
                <button
                  type="button"
                  onClick={safeControlClick(onToggleMaximize)}
                  className="h-8 w-8 rounded-lg bg-zinc-800/75 hover:bg-sky-500/20 border border-zinc-700/80 hover:border-sky-400/50 text-zinc-300 hover:text-sky-200 flex items-center justify-center transition-colors cursor-pointer"
                  title={safeGeom.maximized ? 'Restore Window Size' : 'Maximize Window'}
                  aria-label={safeGeom.maximized ? 'Restore Window' : 'Maximize Window'}
                >
                  {safeGeom.maximized ? <Copy className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {/* Dedicated Safety Gap + Divider Before Destructive Close Action */}
            {onClose && (onMinimize || onToggleMaximize) && (
              <div className="h-5 w-px bg-zinc-700/80 mx-1" aria-hidden="true" />
            )}

            {onClose && (
              <button
                type="button"
                onClick={safeControlClick(onClose)}
                className="h-8 w-9 mr-0.5 rounded-lg bg-rose-950/50 hover:bg-rose-600 border border-rose-500/40 hover:border-rose-400 text-rose-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title={isDetached ? 'Re-Dock / Close Floating Window' : 'Close Window'}
                aria-label="Close Window"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
          )}

        {/* Window Content Body (never intercept 1-tap focus on inputs/textareas/links) */}
        <div
          key="window-body"
          className={
            isTiled
              ? 'flex-1 min-h-0 flex flex-col overflow-hidden'
              : 'relative flex-1 min-h-0 flex flex-col overflow-hidden bg-zinc-950'
          }
        >
          {children}

          {/* Drag/Resize pointer shield so embedded iframes/canvases never swallow pointermove */}
          {isInteracting && (
            <div className="absolute inset-0 z-20 bg-transparent" />
          )}
        </div>
      </div>

      {/* Generous Overhanging 8-Way Edge & Corner Resize Handles (Clear of Titlebar Buttons) */}
      {!isTiled && !isHidden && !safeGeom.maximized && (
        <>
          {/* Top Edge — sits strictly above the titlebar rim so it never blocks Minimize/Maximize/Close */}
          <div
            onPointerDown={(e) => startDrag(e, 'n')}
            onPointerEnter={() => setHoveredHandle('n')}
            onPointerLeave={() => setHoveredHandle((cur) => (cur === 'n' ? null : cur))}
            className="absolute -top-2 left-5 right-5 h-3 cursor-ns-resize touch-none z-30"
            title="Drag top edge to resize"
          />
          {/* Bottom Edge — wide 14px grab zone */}
          <div
            onPointerDown={(e) => startDrag(e, 's')}
            onPointerEnter={() => setHoveredHandle('s')}
            onPointerLeave={() => setHoveredHandle((cur) => (cur === 's' ? null : cur))}
            className="absolute -bottom-2 left-6 right-7 h-3.5 cursor-ns-resize touch-none z-30"
            title="Drag bottom edge to resize"
          />
          {/* Left Edge — starts below titlebar to stay clear of drag handle */}
          <div
            onPointerDown={(e) => startDrag(e, 'w')}
            onPointerEnter={() => setHoveredHandle('w')}
            onPointerLeave={() => setHoveredHandle((cur) => (cur === 'w' ? null : cur))}
            className="absolute top-11 bottom-6 -left-2 w-3.5 cursor-ew-resize touch-none z-30"
            title="Drag left edge to resize"
          />
          {/* Right Edge — starts below 44px titlebar so it never overlaps Close button */}
          <div
            onPointerDown={(e) => startDrag(e, 'e')}
            onPointerEnter={() => setHoveredHandle('e')}
            onPointerLeave={() => setHoveredHandle((cur) => (cur === 'e' ? null : cur))}
            className="absolute top-11 bottom-7 -right-2 w-3.5 cursor-ew-resize touch-none z-30"
            title="Drag right edge to resize"
          />

          {/* Top-Left Corner (overhanging outside) */}
          <div
            onPointerDown={(e) => startDrag(e, 'nw')}
            onPointerEnter={() => setHoveredHandle('nw')}
            onPointerLeave={() => setHoveredHandle((cur) => (cur === 'nw' ? null : cur))}
            className="absolute -top-2 -left-2 w-5 h-5 cursor-nwse-resize touch-none z-30"
            title="Drag top-left corner to resize"
          />
          {/* Top-Right Corner (overhanging strictly outside so Close button is never obscured) */}
          <div
            onPointerDown={(e) => startDrag(e, 'ne')}
            onPointerEnter={() => setHoveredHandle('ne')}
            onPointerLeave={() => setHoveredHandle((cur) => (cur === 'ne' ? null : cur))}
            className="absolute -top-2 -right-2 w-4 h-4 cursor-nesw-resize touch-none z-30"
            title="Drag top-right corner to resize"
          />
          {/* Bottom-Left Corner — generous 24x24px target */}
          <div
            onPointerDown={(e) => startDrag(e, 'sw')}
            onPointerEnter={() => setHoveredHandle('sw')}
            onPointerLeave={() => setHoveredHandle((cur) => (cur === 'sw' ? null : cur))}
            className="absolute -bottom-2 -left-2 w-6 h-6 cursor-nesw-resize touch-none z-30"
            title="Drag bottom-left corner to resize"
          />
          {/* Bottom-Right Corner — generous 28x28px target with clear tactile diagonal grip */}
          <div
            onPointerDown={(e) => startDrag(e, 'se')}
            onPointerEnter={() => setHoveredHandle('se')}
            onPointerLeave={() => setHoveredHandle((cur) => (cur === 'se' ? null : cur))}
            title="Drag bottom-right corner to resize"
            className="absolute -right-1.5 -bottom-1.5 w-7 h-7 cursor-nwse-resize touch-none z-30 flex items-end justify-end p-1.5 text-zinc-400 hover:text-sky-300 transition-colors"
          >
            <svg viewBox="0 0 14 14" className="w-4 h-4 fill-current drop-shadow">
              <path d="M13 2.5L2.5 13H5.2L13 5.2V2.5ZM13 7.5L7.5 13H10.2L13 10.2V7.5Z" />
            </svg>
          </div>
        </>
      )}
      </div>

      {isPipPill && (
        <button
          type="button"
          onClick={() => onRestorePip?.()}
          className={`fixed z-40 px-3.5 py-2 rounded-xl bg-zinc-900/95 hover:bg-zinc-800 border border-amber-500/50 shadow-[0_12px_32px_rgba(0,0,0,0.7)] flex items-center gap-2 text-xs font-semibold text-amber-200 cursor-pointer backdrop-blur-md ${
            moduleId === 'chat'
              ? 'right-3 bottom-14'
              : moduleId === 'browser'
              ? 'right-3 bottom-24'
              : 'left-3 bottom-14'
          }`}
          title={`Restore Detached ${meta?.label || moduleId}`}
        >
          <Icon className={`w-4 h-4 ${meta?.accentColor || 'text-amber-400'}`} />
          <span>{meta?.shortLabel || meta?.label || moduleId} PiP</span>
        </button>
      )}
    </>
  );
};

export const SovereignOSWindowFrame = React.memo(SovereignOSWindowFrameInner);

interface SovereignDesktopCanvasProps {
  openModules: ModuleType[];
  isChatDetached?: boolean;
  onOpenModule: (mod: ModuleType) => void;
  onToggleDetachChat?: () => void;
  onLaunchChatPrompt?: (prompt: string) => void;
  onOpenStartMenu?: () => void;
  onTileWindows: () => void;
  onCascadeWindows: () => void;
  onMinimizeAll: () => void;
  onSwitchWorkspaceMode: () => void;
  authUser?: AuthUserPublic | null;
}

const DESKTOP_SHORTCUTS: Array<{
  id: ModuleType;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  adminOnly?: boolean;
}> = [
  { id: 'admin-command', label: 'Sovereign Command', subtitle: 'Admin · JHammerZ', icon: AdminCommandIcon, accent: 'text-amber-400', adminOnly: true },
  { id: 'file-manager', label: 'This PC · Files', subtitle: 'Host Filesystem', icon: HardDrive, accent: 'text-amber-300' },
  { id: 'lora-mesh', label: 'SoS Mesh', subtitle: 'LoRa · Voice · Cam', icon: SoSMeshIcon, accent: 'text-cyan-400' },
  { id: 'chat', label: 'Sovereign Chat', subtitle: 'AI Orchestrator', icon: MessageSquare, accent: 'text-amber-400' },
  { id: 'browser', label: 'Google Chrome', subtitle: 'Full Internet', icon: Globe, accent: 'text-sky-400' },
  { id: 'terminal', label: 'Root Terminal', subtitle: 'UID 0 Shell', icon: Terminal, accent: 'text-emerald-400' },
  { id: 'task-manager', label: 'Task Manager', subtitle: 'CPU · RAM · PIDs', icon: Cpu, accent: 'text-cyan-400' },
  { id: 'macro-telemetry', label: 'Macro Telemetry', subtitle: 'Laplace-14 · 99%', icon: Activity, accent: 'text-rose-400' },
  { id: 'crypto-wallet', label: 'Crypto Wallets', subtitle: 'Personal & Agentic', icon: Wallet, accent: 'text-emerald-400' },
  { id: 'grant-hunter', label: 'Grant Hunter', subtitle: '0% Equity Funding', icon: Award, accent: 'text-emerald-300' },
  { id: 'transfer-hub', label: 'Downloads & Uploads', subtitle: 'Hub · Module Lab', icon: ArrowUpDown, accent: 'text-sky-400' },
  { id: 'batch-processor', label: 'Batch Processor', subtitle: 'Background Queue', icon: Layers, accent: 'text-amber-400' },
  { id: 'ai-genesis-distillery', label: 'AI Distillery', subtitle: 'Model Forging', icon: Sparkles, accent: 'text-purple-400' },
  { id: 'projects', label: 'Unified Projects', subtitle: 'IDE & Builds', icon: Briefcase, accent: 'text-indigo-400' },
  { id: 'vault', label: 'Encrypted Vault', subtitle: 'AES-256 Store', icon: Archive, accent: 'text-emerald-300' },
  { id: 'autonomy-supervisor', label: 'Autonomy HUD', subtitle: '100% Ring -3', icon: ShieldAlert, accent: 'text-orange-400' },
  { id: 'osint', label: 'OSINT Recon', subtitle: 'Intel Suite', icon: Shield, accent: 'text-sky-300' },
  { id: 'universal-installer', label: 'App & Game Store', subtitle: 'Steam · Discord · Pkg', icon: Package, accent: 'text-amber-400' },
  { id: 'swarm-test', label: 'Forensic & Manual', subtitle: 'Audit · Repair · Docs', icon: BookOpen, accent: 'text-amber-300' },
  { id: 'os-settings', label: 'Control Panel', subtitle: 'Win · Mac · Linux', icon: Settings, accent: 'text-zinc-300' }
];

interface DesktopInstalledApp {
  id: string;
  name: string;
  version: string;
  category: string;
  publisher: string;
  iconType: string;
  launchMode: string;
  launchTarget: string;
  desktopShortcut: boolean;
}

const SovereignDesktopCanvasInner: React.FC<SovereignDesktopCanvasProps> = ({
  openModules,
  isChatDetached = false,
  onOpenModule,
  onToggleDetachChat,
  onLaunchChatPrompt,
  onOpenStartMenu,
  onTileWindows,
  onCascadeWindows,
  onMinimizeAll,
  onSwitchWorkspaceMode,
  authUser = null
}) => {
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    target?:
      | { kind: 'builtin'; id: string; label: string }
      | { kind: 'installed'; id: string; label: string; app: DesktopInstalledApp }
      | { kind: 'custom'; id: string; label: string; shortcut: CustomDesktopShortcut }
      | { kind: 'fs'; id: string; label: string; entry: { name: string; path: string; type: 'dir' | 'file'; sizeBytes: number } };
  } | null>(null);
  const [desktopCommand, setDesktopCommand] = useState('');
  const [installedDesktopApps, setInstalledDesktopApps] = useState<DesktopInstalledApp[]>([]);
  const [desktopFsPath, setDesktopFsPath] = useState<string>('');
  const [desktopFsEntries, setDesktopFsEntries] = useState<
    Array<{ name: string; path: string; type: 'dir' | 'file'; sizeBytes: number }>
  >([]);
  const [editIconsMode, setEditIconsMode] = useState<boolean>(false);
  const [desktopToast, setDesktopToast] = useState<string | null>(null);
  const [desktopModal, setDesktopModal] = useState<
    | null
    | { type: 'new-file'; name: string; content: string }
    | { type: 'new-folder'; name: string }
    | { type: 'new-shortcut'; label: string; kind: 'steam' | 'url' | 'command'; target: string }
    | { type: 'rename'; targetKind: 'builtin' | 'installed' | 'custom' | 'fs'; id: string; oldPath?: string; value: string }
    | { type: 'edit-file'; name: string; path: string; content: string; saving?: boolean }
  >(null);
  const [customProfile, setCustomProfile] = useState<SovereignOSCustomizationProfile>(() =>
    loadOSCustomizationProfile()
  );
  const [hudMarketQuotes, setHudMarketQuotes] = useState<any[]>([]);
  const [hudCryptoSummary, setHudCryptoSummary] = useState<{
    personalUsd: number;
    agenticUsd: number;
  } | null>(null);
  const [hostInfo, setHostInfo] = useState<{
    hostPlatform: string;
    arch: string;
    cores: number;
    totalMemGb: number;
    hostname: string;
    uid: number;
    ring: number;
  } | null>(null);
  const [preferredNameInput, setPreferredNameInput] = useState<string>('');
  const [savingPreferredName, setSavingPreferredName] = useState<boolean>(false);

  const handleSaveDesktopPreferredName = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = preferredNameInput.trim();
    if (!cleaned || savingPreferredName) return;
    setSavingPreferredName(true);
    try {
      const resp = await fetch('/api/user-memory/preferred-name', {
        method: 'PATCH',
        credentials: 'include',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ preferredName: cleaned })
      });
      if (resp.ok) {
        window.dispatchEvent(
          new CustomEvent('sovereign_preferred_name_updated', {
            detail: { userId: authUser?.id, preferredName: cleaned }
          })
        );
        setPreferredNameInput('');
        showDesktopToast(`All agents will now address you as ${cleaned}.`);
      }
    } catch {
      // ignore network error
    } finally {
      setSavingPreferredName(false);
    }
  };

  const showDesktopToast = (msg: string) => {
    setDesktopToast(msg);
    setTimeout(() => setDesktopToast((cur) => (cur === msg ? null : cur)), 3800);
  };

  const refreshDesktopFiles = React.useCallback(() => {
    fetch('/api/os/desktop/entries', { credentials: 'include', headers: buildAuthHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.success) return;
        if (data.desktopPath) setDesktopFsPath(data.desktopPath);
        if (Array.isArray(data.entries)) {
          setDesktopFsEntries(
            data.entries.map((e: any) => ({
              name: String(e.name),
              path: String(e.path),
              type: e.type === 'dir' ? 'dir' : 'file',
              sizeBytes: Number(e.sizeBytes || 0)
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshDesktopFiles();
    const onFsUpdated = () => refreshDesktopFiles();
    window.addEventListener('sovereign_desktop_fs_updated', onFsUpdated);
    return () => window.removeEventListener('sovereign_desktop_fs_updated', onFsUpdated);
  }, [refreshDesktopFiles, authUser?.id]);

  useEffect(() => {
    const nextProfile = loadOSCustomizationProfile();
    setCustomProfile(nextProfile);
    applyOSCustomizationToDOM(nextProfile);
    const onCustom = (e: Event) => {
      const ce = e as CustomEvent<SovereignOSCustomizationProfile>;
      if (ce.detail) setCustomProfile(ce.detail);
    };
    window.addEventListener('sovereign_os_customization_changed', onCustom);
    return () => window.removeEventListener('sovereign_os_customization_changed', onCustom);
  }, [authUser?.id]);

  useEffect(() => {
    let active = true;
    const loadHudTelemetry = () => {
      apiFetch('/api/macro/telemetry')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!active || !data?.quotes) return;
          setHudMarketQuotes(data.quotes.slice(0, 4));
        })
        .catch(() => {});

      apiFetch('/api/crypto/wallets')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!active || !Array.isArray(data?.wallets)) return;
          let pUsd = 0;
          let aUsd = 0;
          for (const w of data.wallets) {
            const holdingsVal = (w.holdings || []).reduce(
              (acc: number, h: any) => acc + (Number(h.marketValueUsd) || 0),
              0
            );
            const total = (Number(w.cashReserveUsd) || 0) + holdingsVal;
            if (w.role === 'AGENTIC_AUTONOMOUS') aUsd += total;
            else pUsd += total;
          }
          setHudCryptoSummary({ personalUsd: pUsd, agenticUsd: aUsd });
        })
        .catch(() => {});
    };
    loadHudTelemetry();
    const timer = setInterval(loadHudTelemetry, 18000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadInstalled = () => {
      apiFetch('/api/os/packages/registry')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!active || !data?.success || !Array.isArray(data.installed)) return;
          setInstalledDesktopApps(
            data.installed.filter((a: DesktopInstalledApp) => a.desktopShortcut !== false)
          );
        })
        .catch(() => {});
    };
    loadInstalled();
    window.addEventListener('sovereign_apps_updated', loadInstalled);
    return () => {
      active = false;
      window.removeEventListener('sovereign_apps_updated', loadInstalled);
    };
  }, [authUser?.id]);

  useEffect(() => {
    let active = true;
    apiFetch('/api/os/runtime-info')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active || !data?.success) return;
        setHostInfo({
          hostPlatform: String(data.hostPlatform || 'linux'),
          arch: String(data.arch || 'x64'),
          cores: Number(data.cpu?.cores || 0),
          totalMemGb: data.memory?.totalBytes
            ? Math.max(1, Math.round(data.memory.totalBytes / 1024 / 1024 / 1024))
            : 0,
          hostname: String(data.hostname || 'sovereign-host'),
          uid: typeof data.authority?.uid === 'number' ? data.authority.uid : 0,
          ring: typeof data.authority?.ring === 'number' ? data.authority.ring : -3
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!contextMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    const onDown = () => setContextMenu(null);
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [contextMenu]);

  const openContextMenuAt = (
    e: React.MouseEvent,
    target?: NonNullable<typeof contextMenu>['target']
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const container = e.currentTarget.closest('[data-sovereign-desktop-root="true"]') || e.currentTarget;
    const rect = container.getBoundingClientRect();
    const x = Math.min(Math.max(8, e.clientX - rect.left), Math.max(8, rect.width - 245));
    const y = Math.min(Math.max(8, e.clientY - rect.top), Math.max(8, rect.height - 360));
    setContextMenu({ x, y, target });
  };

  const handleUninstallProgram = async (app: DesktopInstalledApp) => {
    try {
      const res = await apiFetch('/api/os/packages/uninstall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId: app.id })
      });
      const data = await res.json();
      if (data?.ok || data?.success) {
        setInstalledDesktopApps((prev) => prev.filter((a) => a.id !== app.id));
        window.dispatchEvent(new CustomEvent('sovereign_apps_updated'));
        showDesktopToast(`Uninstalled "${app.name}" and removed desktop shortcut.`);
      } else {
        showDesktopToast(data?.error || `Failed to uninstall ${app.name}`);
      }
    } catch (err: any) {
      showDesktopToast(`Uninstall failed: ${err?.message || 'Error'}`);
    }
  };

  const handleDeleteDesktopFsEntry = async (entry: { name: string; path: string; type: 'dir' | 'file' }) => {
    try {
      const res = await apiFetch('/api/os/fs/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: entry.path })
      });
      const data = await res.json();
      if (data?.success || data?.ok) {
        refreshDesktopFiles();
        showDesktopToast(`Deleted ${entry.type === 'dir' ? 'folder' : 'file'} "${entry.name}" from disk.`);
      } else {
        showDesktopToast(data?.error || `Could not delete ${entry.name}`);
      }
    } catch (err: any) {
      showDesktopToast(`Delete error: ${err?.message || 'Error'}`);
    }
  };

  const handleOpenDesktopFsEntry = async (entry: { name: string; path: string; type: 'dir' | 'file' }) => {
    if (entry.type === 'dir') {
      onOpenModule('file-manager');
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('sovereign_os_command', {
            detail: { action: 'file_manager_open_path', targetModule: 'file-manager', path: entry.path }
          })
        );
      }, 100);
      return;
    }
    try {
      const res = await apiFetch(`/api/os/fs/read?path=${encodeURIComponent(entry.path)}`);
      const data = await res.json();
      if (data?.success && typeof data.content === 'string') {
        setDesktopModal({ type: 'edit-file', name: entry.name, path: entry.path, content: data.content });
        return;
      }
    } catch {}
    onOpenModule('file-manager');
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desktopModal) return;
    try {
      if (desktopModal.type === 'new-file') {
        const cleanName = desktopModal.name.trim();
        if (!cleanName) return;
        const fullPath = `${desktopFsPath || 'data/desktop'}/${cleanName}`;
        const res = await apiFetch('/api/os/fs/write', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: fullPath, content: desktopModal.content })
        });
        const data = await res.json();
        if (data?.success) {
          refreshDesktopFiles();
          showDesktopToast(`Created file "${cleanName}" on Desktop.`);
          setDesktopModal(null);
        }
      } else if (desktopModal.type === 'new-folder') {
        const cleanName = desktopModal.name.trim();
        if (!cleanName) return;
        const fullPath = `${desktopFsPath || 'data/desktop'}/${cleanName}`;
        const res = await apiFetch('/api/os/fs/mkdir', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: fullPath })
        });
        const data = await res.json();
        if (data?.success) {
          refreshDesktopFiles();
          showDesktopToast(`Created folder "${cleanName}" on Desktop.`);
          setDesktopModal(null);
        }
      } else if (desktopModal.type === 'new-shortcut') {
        const cleanLabel = desktopModal.label.trim();
        const cleanTarget = desktopModal.target.trim();
        if (!cleanLabel || !cleanTarget) return;
        const next = addCustomDesktopShortcut({
          label: cleanLabel,
          subtitle:
            desktopModal.kind === 'steam'
              ? `Steam #${cleanTarget}`
              : desktopModal.kind === 'url'
              ? cleanTarget.replace(/^https?:\/\//i, '').slice(0, 22)
              : `$ ${cleanTarget.slice(0, 18)}`,
          kind: desktopModal.kind,
          target: cleanTarget,
          accent:
            desktopModal.kind === 'steam'
              ? 'text-sky-400'
              : desktopModal.kind === 'command'
              ? 'text-emerald-400'
              : 'text-amber-400',
          badge: desktopModal.kind === 'steam' ? 'STEAM' : desktopModal.kind === 'command' ? 'CMD' : 'WEB'
        });
        setCustomProfile(next);
        showDesktopToast(`Pinned "${cleanLabel}" to Desktop.`);
        setDesktopModal(null);
      } else if (desktopModal.type === 'rename') {
        const cleanVal = desktopModal.value.trim();
        if (!cleanVal) return;
        if (desktopModal.targetKind === 'fs' && desktopModal.oldPath) {
          const parent = desktopModal.oldPath.slice(0, desktopModal.oldPath.lastIndexOf('/'));
          const newPath = `${parent}/${cleanVal}`;
          await apiFetch('/api/os/fs/rename', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldPath: desktopModal.oldPath, newPath })
          });
          refreshDesktopFiles();
          showDesktopToast(`Renamed to "${cleanVal}".`);
        } else {
          const next = renameDesktopIcon(desktopModal.id, cleanVal);
          setCustomProfile(next);
          showDesktopToast(`Renamed desktop icon to "${cleanVal}".`);
        }
        setDesktopModal(null);
      } else if (desktopModal.type === 'edit-file') {
        setDesktopModal({ ...desktopModal, saving: true });
        await apiFetch('/api/os/fs/write', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: desktopModal.path, content: desktopModal.content })
        });
        refreshDesktopFiles();
        showDesktopToast(`Saved "${desktopModal.name}" to disk.`);
        setDesktopModal(null);
      }
    } catch (err: any) {
      showDesktopToast(`Action failed: ${err?.message || 'Error'}`);
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    openContextMenuAt(e, undefined);
  };

  const handleDesktopCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = desktopCommand.trim();
    if (!q) return;
    setDesktopCommand('');
    if (q.startsWith('$ ') || q.startsWith('> ')) {
      const cmd = q.slice(2).trim();
      if (cmd) {
        onOpenModule('terminal');
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent('sovereign_os_command', {
              detail: { action: 'terminal_exec', targetModule: 'terminal', command: cmd }
            })
          );
        }, 80);
        return;
      }
    }
    if (/^https?:\/\//i.test(q)) {
      window.dispatchEvent(
        new CustomEvent('sovereign_os_command', {
          detail: { action: 'browser_navigate', targetModule: 'browser', url: q }
        })
      );
      return;
    }
    if (onLaunchChatPrompt) {
      onLaunchChatPrompt(q);
    } else {
      onOpenModule('chat');
    }
  };

  const hiddenSet = new Set(customProfile.hiddenDesktopIcons || []);
  const canSeeAdminCommand = canAccessAdminCommandCenter(authUser);
  const isArchitectOnDesktop = isExecutiveArchitectUser(authUser);
  const visibleBuiltinShortcuts = DESKTOP_SHORTCUTS.filter(
    (item) =>
      !hiddenSet.has(item.id) &&
      (!item.adminOnly || canSeeAdminCommand) &&
      (!authUser || canUserAccessModule(authUser, item.id))
  );
  const visibleInstalledApps = installedDesktopApps.filter((app) => !hiddenSet.has(`app-${app.id}`));
  const customShortcuts = customProfile.customDesktopShortcuts || [];

  return (
    <div
      data-sovereign-desktop-root="true"
      onContextMenu={handleContextMenu}
      onClick={(e) => {
        if (e.target === e.currentTarget) setSelectedIcon(null);
      }}
      style={getActiveThemeWallpaperStyle(customProfile)}
      className="absolute inset-0 overflow-hidden select-none flex flex-col justify-between transition-all duration-300"
    >
      {/* Optional Architectural Tactical Grid */}
      {customProfile.showTacticalGrid && (
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.22) 1px, transparent 1px)',
            backgroundSize: '48px 48px'
          }}
        />
      )}

      {/* Optional Subtle CRT Scanline Shader */}
      {customProfile.showCrtScanlines && (
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(0,0,0,0.45) 0px, rgba(0,0,0,0.45) 1px, transparent 1px, transparent 3px)'
          }}
        />
      )}

      {/* Responsive Desktop App Icon Grid + Right-Side Live Desktop HUD Widgets */}
      <div className="relative z-0 flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div
          className={`grid grid-cols-3 sm:grid-cols-none sm:grid-flow-col sm:grid-rows-6 ${
            customProfile.iconSize === 'compact'
              ? 'sm:auto-cols-[90px] gap-1.5'
              : customProfile.iconSize === 'large'
              ? 'sm:auto-cols-[120px] gap-3'
              : 'sm:auto-cols-[106px] gap-2 sm:gap-2.5'
          } w-full sm:w-fit`}
        >
          {visibleBuiltinShortcuts.map((item) => {
            const Icon = item.icon;
            const isRunning = openModules.includes(item.id);
            const isSelected = selectedIcon === item.id;
            const displayLabel = customProfile.customIconLabels?.[item.id] || item.label;
            return (
              <div key={item.id} className="relative group">
                <button
                  type="button"
                  onContextMenu={(e) =>
                    openContextMenuAt(e, { kind: 'builtin', id: item.id, label: displayLabel })
                  }
                  onClick={() => {
                    setSelectedIcon(item.id);
                    if (!editIconsMode) onOpenModule(item.id);
                  }}
                  className={`w-full p-2 rounded-xl border flex flex-col items-center text-center gap-1.5 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-sky-500/15 border-sky-400/50'
                      : 'border-transparent hover:bg-white/[0.06] hover:border-white/10 active:bg-white/[0.1]'
                  }`}
                >
                  <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-zinc-900/90 border border-zinc-800 group-hover:border-amber-500/40 shadow-lg flex items-center justify-center">
                    <Icon className={`w-5 h-5 ${item.accent}`} />
                    {isRunning && (
                      <span className="absolute -bottom-1 w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-100 leading-tight drop-shadow line-clamp-1">
                    {displayLabel}
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500 leading-none line-clamp-1">
                    {item.subtitle}
                  </span>
                </button>
                {editIconsMode && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCustomProfile(hideDesktopIcon(item.id));
                      showDesktopToast(`Removed "${displayLabel}" from Desktop (restore anytime in right-click or Settings).`);
                    }}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg cursor-pointer z-10"
                    title="Delete / Remove Icon from Desktop"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Installed Sovereign OS Software & Games Shortcuts (Steam, Discord, Arcade, OBS, custom packages) */}
          {visibleInstalledApps.map((app) => {
            const iconKey = `app-${app.id}`;
            const isSelected = selectedIcon === iconKey;
            const displayLabel =
              customProfile.customIconLabels?.[iconKey] ||
              app.name.replace(' (Sovereign OS Edition)', '').replace(' (WebRTC Edition)', '');
            const AppIcon =
              app.iconType === 'discord'
                ? MessageSquare
                : app.iconType === 'obs'
                ? Video
                : app.iconType === 'vlc'
                ? Film
                : app.iconType === 'steam' ||
                  app.iconType === 'arcade' ||
                  app.iconType === 'mmorpg' ||
                  app.iconType === 'emulator' ||
                  app.iconType === 'heroic'
                ? Gamepad2
                : Download;
            const accentClass =
              app.id === 'steam'
                ? 'text-sky-400'
                : app.id === 'discord'
                ? 'text-indigo-400'
                : app.id === 'sovereign-arcade'
                ? 'text-amber-400'
                : app.id === 'obs-studio'
                ? 'text-rose-400'
                : 'text-emerald-400';

            return (
              <div key={iconKey} className="relative group">
                <button
                  type="button"
                  onContextMenu={(e) =>
                    openContextMenuAt(e, { kind: 'installed', id: iconKey, label: displayLabel, app })
                  }
                  onClick={() => {
                    setSelectedIcon(iconKey);
                    if (editIconsMode) return;
                    if (app.launchMode === 'os_module') {
                      onOpenModule(app.launchTarget as ModuleType);
                    } else {
                      onOpenModule('universal-installer');
                      setTimeout(() => {
                        window.dispatchEvent(
                          new CustomEvent('sovereign_launch_installed_app', {
                            detail: { appId: app.id }
                          })
                        );
                      }, 120);
                    }
                  }}
                  className={`w-full p-2 rounded-xl border flex flex-col items-center text-center gap-1.5 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-sky-500/15 border-sky-400/50'
                      : 'border-transparent hover:bg-white/[0.06] hover:border-white/10 active:bg-white/[0.1]'
                  }`}
                >
                  <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-zinc-900/90 border border-zinc-800 group-hover:border-emerald-500/50 shadow-lg flex items-center justify-center">
                    <AppIcon className={`w-5 h-5 ${accentClass}`} />
                    <span className="absolute -top-1 -right-1 px-1 rounded bg-emerald-500/20 border border-emerald-500/40 text-[8px] font-bold text-emerald-300">
                      APP
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-100 leading-tight drop-shadow line-clamp-1">
                    {displayLabel}
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500 leading-none line-clamp-1">
                    {app.publisher}
                  </span>
                </button>
                {editIconsMode && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUninstallProgram(app);
                    }}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg cursor-pointer z-10"
                    title={`Uninstall ${displayLabel}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          {/* User Custom Desktop Shortcuts (Pinned Steam Games, Web URLs, Shell Commands) */}
          {customShortcuts.map((sc) => {
            const isSelected = selectedIcon === sc.id;
            const displayLabel = customProfile.customIconLabels?.[sc.id] || sc.label;
            const ScIcon =
              sc.kind === 'steam' ? Gamepad2 : sc.kind === 'command' ? Terminal : sc.kind === 'url' ? Globe : Link2;
            return (
              <div key={sc.id} className="relative group">
                <button
                  type="button"
                  onContextMenu={(e) =>
                    openContextMenuAt(e, { kind: 'custom', id: sc.id, label: displayLabel, shortcut: sc })
                  }
                  onClick={() => {
                    setSelectedIcon(sc.id);
                    if (editIconsMode) return;
                    if (sc.kind === 'steam') {
                      onOpenModule('universal-installer');
                      setTimeout(() => {
                        window.dispatchEvent(
                          new CustomEvent('sovereign_launch_steam_game', {
                            detail: { appId: Number(sc.target), name: displayLabel }
                          })
                        );
                      }, 120);
                    } else if (sc.kind === 'url') {
                      window.dispatchEvent(
                        new CustomEvent('sovereign_os_command', {
                          detail: { action: 'browser_navigate', targetModule: 'browser', url: sc.target }
                        })
                      );
                    } else if (sc.kind === 'command') {
                      onOpenModule('terminal');
                      setTimeout(() => {
                        window.dispatchEvent(
                          new CustomEvent('sovereign_os_command', {
                            detail: { action: 'terminal_exec', targetModule: 'terminal', command: sc.target }
                          })
                        );
                      }, 120);
                    } else {
                      onOpenModule(sc.target as ModuleType);
                    }
                  }}
                  className={`w-full p-2 rounded-xl border flex flex-col items-center text-center gap-1.5 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-sky-500/15 border-sky-400/50'
                      : 'border-transparent hover:bg-white/[0.06] hover:border-white/10 active:bg-white/[0.1]'
                  }`}
                >
                  <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-zinc-900/90 border border-sky-500/40 shadow-lg flex items-center justify-center">
                    <ScIcon className={`w-5 h-5 ${sc.accent || 'text-sky-400'}`} />
                    {sc.badge && (
                      <span className="absolute -top-1 -right-1 px-1 rounded bg-sky-500/25 border border-sky-400/50 text-[7px] font-bold text-sky-200">
                        {sc.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-100 leading-tight drop-shadow line-clamp-1">
                    {displayLabel}
                  </span>
                  <span className="text-[9px] font-mono text-zinc-400 leading-none line-clamp-1">
                    {sc.subtitle}
                  </span>
                </button>
                {editIconsMode && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCustomProfile(removeCustomDesktopShortcut(sc.id));
                      showDesktopToast(`Deleted shortcut "${displayLabel}".`);
                    }}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg cursor-pointer z-10"
                    title="Delete Shortcut"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Real Sovereign Desktop Files & Folders on Host Disk */}
          {customProfile.showDesktopFiles !== false &&
            desktopFsEntries.map((entry) => {
              const fsKey = `fs-${entry.name}`;
              const isSelected = selectedIcon === fsKey;
              return (
                <div key={fsKey} className="relative group">
                  <button
                    type="button"
                    onContextMenu={(e) =>
                      openContextMenuAt(e, { kind: 'fs', id: fsKey, label: entry.name, entry })
                    }
                    onClick={() => {
                      setSelectedIcon(fsKey);
                      if (!editIconsMode) handleOpenDesktopFsEntry(entry);
                    }}
                    className={`w-full p-2 rounded-xl border flex flex-col items-center text-center gap-1.5 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400/50'
                        : 'border-transparent hover:bg-white/[0.06] hover:border-white/10 active:bg-white/[0.1]'
                    }`}
                  >
                    <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-zinc-900/90 border border-amber-500/35 shadow-lg flex items-center justify-center">
                      {entry.type === 'dir' ? (
                        <Folder className="w-5 h-5 text-amber-300" />
                      ) : (
                        <FileText className="w-5 h-5 text-cyan-300" />
                      )}
                      <span className="absolute -top-1 -right-1 px-1 rounded bg-zinc-950 border border-zinc-700 text-[7px] font-mono text-zinc-300">
                        {entry.type === 'dir' ? 'DIR' : 'FILE'}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-zinc-100 leading-tight drop-shadow line-clamp-1">
                      {entry.name}
                    </span>
                    <span className="text-[9px] font-mono text-zinc-400 leading-none line-clamp-1">
                      {entry.type === 'dir'
                        ? 'Desktop Folder'
                        : `${Math.max(1, Math.round(entry.sizeBytes / 1024))} KB`}
                    </span>
                  </button>
                  {editIconsMode && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDesktopFsEntry(entry);
                      }}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg cursor-pointer z-10"
                      title={`Delete ${entry.name} from disk`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
        </div>

        {/* Right-Side Live Desktop Telemetry & Customization HUD Widgets (Composited Solid-Alpha for Zero Backdrop-Blur Drag Lag) */}
        <div className="hidden lg:flex flex-col gap-2.5 w-72 shrink-0">
          {canSeeAdminCommand && (
            <div className="rounded-2xl bg-gradient-to-br from-[#1b1409]/95 via-zinc-950/95 to-zinc-950/95 border border-amber-500/45 p-3 shadow-[0_0_24px_rgba(245,158,11,0.16)] space-y-2 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <AdminCommandIcon className="w-6 h-6 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-bold text-amber-200 truncate">Sovereign Command</div>
                    <div className="text-[9px] font-mono text-amber-400/90 truncate">
                      {isArchitectOnDesktop ? 'EXECUTIVE ARCHITECT · JHAMMERZ' : 'ADMIN CLEARANCE ACTIVE'}
                    </div>
                  </div>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-[9px] font-mono text-amber-200 shrink-0">
                  ADMIN ONLY
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 leading-snug">
                Full control over all users, active sessions, Entity Intelligence charter, security policies &amp; lockdown.
              </p>
              <button
                type="button"
                onClick={() => onOpenModule('admin-command')}
                className="w-full py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-[11px] transition-colors cursor-pointer"
              >
                Open Sovereign Command Center
              </button>
            </div>
          )}

          {authUser && !canSeeAdminCommand && (
            <div className="rounded-2xl bg-zinc-950/92 border border-cyan-500/35 p-3 shadow-lg space-y-2.5 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-white truncate">
                    Welcome, {authUser.preferredName || authUser.displayName}
                  </div>
                  <div className="text-[10px] font-mono text-cyan-300 truncate">
                    My Personal Desktop · SQL Memory Active
                  </div>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/35 text-[9px] font-mono uppercase text-emerald-300 shrink-0">
                  {authUser.role}
                </span>
              </div>
              {!authUser.preferredNameConfirmed ? (
                <form onSubmit={handleSaveDesktopPreferredName} className="space-y-1.5">
                  <div className="text-[10px] text-zinc-400">
                    What name would you like all agents to call you?
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={preferredNameInput}
                      onChange={(e) => setPreferredNameInput(e.target.value)}
                      placeholder="Your preferred name..."
                      className="flex-1 min-w-0 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                    <button
                      type="submit"
                      disabled={!preferredNameInput.trim() || savingPreferredName}
                      className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-[10px] font-bold cursor-pointer shrink-0"
                    >
                      Save
                    </button>
                  </div>
                </form>
              ) : (
                <p className="text-[10px] text-zinc-400 leading-snug">
                  Your private files, desktop layout, and tailored agent conversations are saved automatically across sessions.
                </p>
              )}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onOpenModule('chat')}
                  className="flex-1 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/35 border border-cyan-500/40 text-cyan-200 font-semibold text-[11px] cursor-pointer"
                >
                  Open Agent Chat
                </button>
                <button
                  type="button"
                  onClick={() => onOpenModule('file-manager')}
                  className="flex-1 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-[11px] cursor-pointer"
                >
                  My Files
                </button>
              </div>
            </div>
          )}

          {customProfile.desktopWidgets.showKernelHud && (
            <div className="rounded-2xl bg-zinc-950/92 border border-zinc-800/90 p-3 shadow-lg space-y-2 text-[11px] font-mono">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                  <span>RING -3 KERNEL & WORKSPACE</span>
                </span>
                <button
                  type="button"
                  onClick={() => onOpenModule('os-settings')}
                  className="text-[10px] text-sky-400 hover:underline cursor-pointer"
                >
                  Customize
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {([1, 2, 3, 4] as const).map((wsNum) => (
                  <button
                    key={wsNum}
                    type="button"
                    onClick={() => {
                      const next = saveOSCustomizationProfile({ activeWorkspace: wsNum });
                      setCustomProfile(next);
                    }}
                    className={`py-1 rounded text-[10px] font-bold cursor-pointer border ${
                      customProfile.activeWorkspace === wsNum
                        ? 'bg-amber-500 text-zinc-950 border-amber-400'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    WS {wsNum}
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-zinc-400 flex items-center justify-between pt-0.5">
                <span>Theme: {customProfile.themeId}</span>
                <span className="text-emerald-400">
                  UID {hostInfo?.uid ?? 0} · {hostInfo?.cores || 8}C
                </span>
              </div>
            </div>
          )}

          {customProfile.desktopWidgets.showMarketTickerHud && hudMarketQuotes.length > 0 && (
            <div className="rounded-2xl bg-zinc-950/92 border border-zinc-800/90 p-3 shadow-lg space-y-1.5 text-[11px] font-mono">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-300 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-rose-400" />
                  <span>LAPLACE-14 (h=2s) 5M HUD</span>
                </span>
                <button
                  type="button"
                  onClick={() => onOpenModule('macro-telemetry')}
                  className="text-[10px] text-amber-300 hover:underline cursor-pointer"
                >
                  20 Markets
                </button>
              </div>
              <div className="space-y-1">
                {hudMarketQuotes.map((q: any) => (
                  <div key={q.symbol} className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-zinc-200">{q.symbol}</span>
                    <span className="text-zinc-300">
                      ${Number(q.price || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                    <span
                      className={
                        Number(q.changePercent || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }
                    >
                      {Number(q.changePercent || 0) >= 0 ? '+' : ''}
                      {Number(q.changePercent || 0).toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {customProfile.desktopWidgets.showCryptoVaultHud && hudCryptoSummary && (
            <div className="rounded-2xl bg-zinc-950/92 border border-zinc-800/90 p-3 shadow-lg space-y-1.5 text-[11px] font-mono">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>DUAL-VAULT CRYPTO HUD</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenModule('grant-hunter')}
                    className="text-[10px] text-amber-300 hover:underline cursor-pointer"
                  >
                    Grants (0%)
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenModule('crypto-wallet')}
                    className="text-[10px] text-emerald-300 hover:underline cursor-pointer"
                  >
                    Open Vaults
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-zinc-400">Personal Vault:</span>
                <span className="font-bold text-emerald-300">
                  ${Math.round(hudCryptoSummary.personalUsd).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-zinc-400">UID 0 Agentic:</span>
                <span className="font-bold text-amber-300">
                  ${Math.round(hudCryptoSummary.agenticUsd).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {customProfile.desktopWidgets.showClipboardHud && (
            <div className="rounded-2xl bg-zinc-950/92 border border-zinc-800/90 p-3 shadow-lg space-y-1.5 text-[11px] font-mono">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-300">OS CLIPBOARD RING</span>
                <button
                  type="button"
                  onClick={() => onOpenModule('os-settings')}
                  className="text-[10px] text-sky-400 hover:underline cursor-pointer"
                >
                  Manage
                </button>
              </div>
              {customProfile.clipboardHistory.slice(0, 2).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(c.text)}
                  className="w-full text-left p-1.5 rounded bg-zinc-900/90 hover:bg-zinc-800 text-[10px] text-zinc-300 truncate cursor-pointer"
                  title="Click to copy"
                >
                  {c.label}: {c.text}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Orchestrator-Powered OS Command Dock & Live Host Telemetry Strip */}
      <div className="keyboard-hide-secondary relative z-0 px-3 pb-3 sm:px-5 sm:pb-4 flex flex-col lg:flex-row lg:items-end justify-between gap-2.5 shrink-0">
        {/* Central / Primary Autonomous Orchestrator Command Dock */}
        <div className="w-full lg:max-w-2xl rounded-2xl bg-zinc-950/94 border border-zinc-800/90 shadow-xl p-2.5 sm:p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
            <div className="flex items-center gap-1.5 text-zinc-200 font-semibold">
              <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Lysander Sovereign OS</span>
              <span className="text-amber-300">
                · UID {hostInfo?.uid ?? 0} · Ring {hostInfo?.ring ?? -3} Hypervisor
              </span>
            </div>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-jhammerz-license'))}
              className="text-amber-300/90 hover:text-amber-200 underline cursor-pointer truncate"
              title="Click to inspect official MIT & JHammerZ Custom Sovereign License Charter (jhammerz.github.io)"
            >
              © 1988–2026 Joshua Hamilton (JHammerZ) · MIT & TWENTY 47 / H-FID License · jhammerz.github.io
            </button>
          </div>

          <form onSubmit={handleDesktopCommandSubmit} className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Bot className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={desktopCommand}
                onChange={(e) => setDesktopCommand(e.target.value)}
                placeholder="Command OS autonomously, open Chrome URL, or run $ host shell command..."
                className="w-full bg-zinc-900/95 border border-zinc-700/80 focus:border-amber-500/60 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Execute</span>
            </button>
          </form>

          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-0.5">
            <button
              type="button"
              onClick={() => onOpenModule('chat')}
              className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-[11px] font-semibold text-amber-200 flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0"
            >
              <MessageSquare className="w-3 h-3 text-amber-400" />
              <span>Orchestrator Chat</span>
            </button>
            {onToggleDetachChat && (
              <button
                type="button"
                onClick={onToggleDetachChat}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
                  isChatDetached
                    ? 'bg-amber-500/25 border-amber-400 text-amber-100'
                    : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-amber-300'
                }`}
              >
                <PictureInPicture2 className="w-3 h-3" />
                <span>{isChatDetached ? 'Re-Dock Chat' : 'Float Copilot PiP'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenModule('browser')}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-sky-300 flex items-center gap-1 whitespace-nowrap cursor-pointer shrink-0"
            >
              <Globe className="w-3 h-3" />
              <span>Chrome</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenModule('terminal')}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-emerald-300 flex items-center gap-1 whitespace-nowrap cursor-pointer shrink-0"
            >
              <Terminal className="w-3 h-3" />
              <span>Root Shell</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenModule('file-manager')}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-amber-200 flex items-center gap-1 whitespace-nowrap cursor-pointer shrink-0"
            >
              <HardDrive className="w-3 h-3" />
              <span>Host Files</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenModule('task-manager')}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-cyan-300 flex items-center gap-1 whitespace-nowrap cursor-pointer shrink-0"
            >
              <Cpu className="w-3 h-3" />
              <span>Task Manager</span>
            </button>
          </div>
        </div>

        {/* Desktop Right-Bottom Quick Customization & Window Manager Bar (sm+) */}
        <div className="hidden sm:flex items-center gap-1.5 bg-zinc-900/94 border border-zinc-800 rounded-xl p-1.5 shadow-lg self-end shrink-0">
          <button
            type="button"
            onClick={() => setDesktopModal({ type: 'new-file', name: 'notes.txt', content: '' })}
            className="px-2 py-1 rounded-lg hover:bg-zinc-800 text-[11px] text-cyan-300 flex items-center gap-1 cursor-pointer"
            title="Create New File on Desktop"
          >
            <FilePlus2 className="w-3.5 h-3.5" />
            <span>+ File</span>
          </button>
          <button
            type="button"
            onClick={() => setDesktopModal({ type: 'new-folder', name: 'New Folder' })}
            className="px-2 py-1 rounded-lg hover:bg-zinc-800 text-[11px] text-amber-300 flex items-center gap-1 cursor-pointer"
            title="Create New Folder on Desktop"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>+ Folder</span>
          </button>
          <button
            type="button"
            onClick={() => setEditIconsMode((v) => !v)}
            className={`px-2 py-1 rounded-lg text-[11px] flex items-center gap-1 cursor-pointer ${
              editIconsMode
                ? 'bg-rose-500/25 text-rose-200 border border-rose-400/50 font-bold'
                : 'hover:bg-zinc-800 text-zinc-200'
            }`}
            title="Edit / Delete Desktop Icons & Uninstall Programs"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-rose-400" />
            <span>{editIconsMode ? 'Done Editing' : 'Edit Icons'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const next = saveOSCustomizationProfile({
                showTouchControllerOverlay: !customProfile.showTouchControllerOverlay
              });
              setCustomProfile(next);
            }}
            className={`px-2 py-1 rounded-lg text-[11px] flex items-center gap-1 cursor-pointer ${
              customProfile.showTouchControllerOverlay
                ? 'bg-sky-500/25 text-sky-200 border border-sky-400/50 font-bold'
                : 'hover:bg-zinc-800 text-emerald-300'
            }`}
            title="Toggle Multi-Touch Virtual Gamepad Overlay"
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Pad</span>
          </button>
          <div className="h-4 w-px bg-zinc-700" />
          <button
            type="button"
            onClick={onTileWindows}
            className="px-2 py-1 rounded-lg hover:bg-zinc-800 text-[11px] text-zinc-200 flex items-center gap-1 cursor-pointer"
            title="Tile Open Windows"
          >
            <Grid2x2 className="w-3.5 h-3.5 text-sky-400" />
            <span>Tile</span>
          </button>
          <button
            type="button"
            onClick={onCascadeWindows}
            className="px-2 py-1 rounded-lg hover:bg-zinc-800 text-[11px] text-zinc-200 flex items-center gap-1 cursor-pointer"
            title="Cascade Open Windows"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Cascade</span>
          </button>
          <button
            type="button"
            onClick={onMinimizeAll}
            className="px-2 py-1 rounded-lg hover:bg-zinc-800 text-[11px] text-zinc-200 flex items-center gap-1 cursor-pointer"
            title="Minimize All (Show Desktop)"
          >
            <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
            <span>Desktop</span>
          </button>
          <button
            type="button"
            onClick={onSwitchWorkspaceMode}
            className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] text-sky-300 font-semibold cursor-pointer"
            title="Switch to Split Workspace Mode"
          >
            Split
          </button>
        </div>
      </div>

      {/* Desktop Toast Notification */}
      {desktopToast && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-zinc-950/95 border border-amber-400/50 text-xs font-semibold text-amber-200 shadow-2xl">
          {desktopToast}
        </div>
      )}

      {/* Sleek Inline Desktop Modals (New File / New Folder / New Shortcut / Rename / Quick File Editor) */}
      {desktopModal && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <form
            onSubmit={handleModalSubmit}
            className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-700 shadow-2xl p-5 space-y-3 text-xs text-zinc-100"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-amber-300">
                {desktopModal.type === 'new-file'
                  ? 'Create New File on Desktop'
                  : desktopModal.type === 'new-folder'
                  ? 'Create New Folder on Desktop'
                  : desktopModal.type === 'new-shortcut'
                  ? 'Pin Custom Shortcut to Desktop'
                  : desktopModal.type === 'rename'
                  ? 'Rename Desktop Item'
                  : `Edit Desktop File: ${desktopModal.name}`}
              </h3>
              <button
                type="button"
                onClick={() => setDesktopModal(null)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {desktopModal.type === 'new-file' && (
              <>
                <input
                  type="text"
                  autoFocus
                  required
                  value={desktopModal.name}
                  onChange={(e) => setDesktopModal({ ...desktopModal, name: e.target.value })}
                  placeholder="Filename (e.g. notes.md, script.sh, config.json)"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100"
                />
                <textarea
                  rows={5}
                  value={desktopModal.content}
                  onChange={(e) => setDesktopModal({ ...desktopModal, content: e.target.value })}
                  placeholder="Optional initial file contents..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 font-mono text-[11px] text-emerald-300"
                />
              </>
            )}

            {desktopModal.type === 'new-folder' && (
              <input
                type="text"
                autoFocus
                required
                value={desktopModal.name}
                onChange={(e) => setDesktopModal({ ...desktopModal, name: e.target.value })}
                placeholder="Folder name (e.g. Projects, Games, Receipts)"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100"
              />
            )}

            {desktopModal.type === 'new-shortcut' && (
              <div className="space-y-2.5">
                <select
                  value={desktopModal.kind}
                  onChange={(e) => setDesktopModal({ ...desktopModal, kind: e.target.value as any })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100"
                >
                  <option value="steam">Steam Video Game (by Steam AppID)</option>
                  <option value="url">Website / Web App URL (Chrome)</option>
                  <option value="command">Root Shell / CLI Command</option>
                </select>
                <input
                  type="text"
                  required
                  value={desktopModal.label}
                  onChange={(e) => setDesktopModal({ ...desktopModal, label: e.target.value })}
                  placeholder="Shortcut Label (e.g. Counter-Strike 2, YouTube, System Monitor)"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100"
                />
                <input
                  type="text"
                  required
                  value={desktopModal.target}
                  onChange={(e) => setDesktopModal({ ...desktopModal, target: e.target.value })}
                  placeholder={
                    desktopModal.kind === 'steam'
                      ? 'Steam AppID (e.g. 730 for CS2, 1245620 for Elden Ring)'
                      : desktopModal.kind === 'url'
                      ? 'https://...'
                      : 'Shell command (e.g. htop || uname -a)'
                  }
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 font-mono"
                />
              </div>
            )}

            {desktopModal.type === 'rename' && (
              <input
                type="text"
                autoFocus
                required
                value={desktopModal.value}
                onChange={(e) => setDesktopModal({ ...desktopModal, value: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100"
              />
            )}

            {desktopModal.type === 'edit-file' && (
              <textarea
                rows={10}
                value={desktopModal.content}
                onChange={(e) => setDesktopModal({ ...desktopModal, content: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 font-mono text-[11px] text-emerald-300"
              />
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDesktopModal(null)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>
                  {desktopModal.type === 'edit-file'
                    ? 'Save File'
                    : desktopModal.type === 'rename'
                    ? 'Rename'
                    : 'Create'}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Beyond-Windows Desktop & Icon Right-Click Context Menu */}
      {contextMenu && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          className="absolute z-50 w-60 rounded-xl bg-zinc-950/95 backdrop-blur-lg border border-zinc-700/90 shadow-2xl py-1.5 text-xs text-zinc-200"
        >
          {contextMenu.target ? (
            <>
              <div className="px-3 py-1 text-[10px] font-mono text-amber-300 truncate border-b border-zinc-800 mb-1">
                {contextMenu.target.label}
              </div>
              <button
                type="button"
                onClick={() => {
                  const t = contextMenu.target!;
                  setContextMenu(null);
                  if (t.kind === 'builtin') onOpenModule(t.id as ModuleType);
                  else if (t.kind === 'fs') handleOpenDesktopFsEntry(t.entry);
                  else if (t.kind === 'installed') {
                    if (t.app.launchMode === 'os_module') onOpenModule(t.app.launchTarget as ModuleType);
                    else {
                      onOpenModule('universal-installer');
                      setTimeout(() => window.dispatchEvent(new CustomEvent('sovereign_launch_installed_app', { detail: { appId: t.app.id } })), 120);
                    }
                  } else if (t.kind === 'custom') {
                    if (t.shortcut.kind === 'steam') {
                      onOpenModule('universal-installer');
                      setTimeout(() => window.dispatchEvent(new CustomEvent('sovereign_launch_steam_game', { detail: { appId: Number(t.shortcut.target), name: t.label } })), 120);
                    } else if (t.shortcut.kind === 'url') {
                      window.dispatchEvent(new CustomEvent('sovereign_os_command', { detail: { action: 'browser_navigate', targetModule: 'browser', url: t.shortcut.target } }));
                    } else {
                      onOpenModule('terminal');
                    }
                  }
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-zinc-800 flex items-center gap-2.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Open / Launch</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const t = contextMenu.target!;
                  setContextMenu(null);
                  setDesktopModal({
                    type: 'rename',
                    targetKind: t.kind,
                    id: t.id,
                    oldPath: t.kind === 'fs' ? t.entry.path : undefined,
                    value: t.label
                  });
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-zinc-800 flex items-center gap-2.5 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5 text-sky-400" />
                <span>Rename</span>
              </button>
              <div className="my-1 border-t border-zinc-800" />
              {contextMenu.target.kind === 'installed' && (
                <button
                  type="button"
                  onClick={() => {
                    const t = contextMenu.target!;
                    setContextMenu(null);
                    if (t.kind === 'installed') handleUninstallProgram(t.app);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-rose-500/20 text-rose-300 flex items-center gap-2.5 cursor-pointer font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Uninstall Program</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const t = contextMenu.target!;
                  setContextMenu(null);
                  if (t.kind === 'builtin' || t.kind === 'installed') {
                    setCustomProfile(hideDesktopIcon(t.id));
                    showDesktopToast(`Removed "${t.label}" icon from Desktop.`);
                  } else if (t.kind === 'custom') {
                    setCustomProfile(removeCustomDesktopShortcut(t.id));
                    showDesktopToast(`Deleted shortcut "${t.label}".`);
                  } else if (t.kind === 'fs') {
                    handleDeleteDesktopFsEntry(t.entry);
                  }
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-rose-500/20 text-rose-300 flex items-center gap-2.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>
                  {contextMenu.target.kind === 'fs'
                    ? 'Delete from Disk'
                    : 'Delete / Remove Icon'}
                </span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setContextMenu(null);
                  setDesktopModal({ type: 'new-file', name: 'untitled.txt', content: '' });
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-zinc-800 flex items-center gap-2.5 text-cyan-300 cursor-pointer"
              >
                <FilePlus2 className="w-3.5 h-3.5" />
                <span>New File on Desktop...</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setContextMenu(null);
                  setDesktopModal({ type: 'new-folder', name: 'New Folder' });
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-zinc-800 flex items-center gap-2.5 text-amber-300 cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>New Folder on Desktop...</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setContextMenu(null);
                  setDesktopModal({ type: 'new-shortcut', label: '', kind: 'steam', target: '' });
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-zinc-800 flex items-center gap-2.5 text-sky-300 cursor-pointer"
              >
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>New Steam / Web / CLI Shortcut...</span>
              </button>
              <div className="my-1 border-t border-zinc-800" />
              <button
                type="button"
                onClick={() => {
                  setContextMenu(null);
                  setEditIconsMode((v) => !v);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-zinc-800 flex items-center gap-2.5 cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-rose-400" />
                <span>{editIconsMode ? 'Exit Icon Edit Mode' : 'Edit / Delete Desktop Icons'}</span>
              </button>
              {(customProfile.hiddenDesktopIcons?.length || 0) > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setContextMenu(null);
                    setCustomProfile(restoreAllDesktopIcons());
                    showDesktopToast('Restored all hidden desktop icons.');
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-zinc-800 flex items-center gap-2.5 text-emerald-300 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Hidden Icons ({customProfile.hiddenDesktopIcons.length})</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setContextMenu(null);
                  const next = saveOSCustomizationProfile({
                    showTouchControllerOverlay: !customProfile.showTouchControllerOverlay
                  });
                  setCustomProfile(next);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-zinc-800 flex items-center gap-2.5 text-emerald-300 cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>
                  {customProfile.showTouchControllerOverlay
                    ? 'Hide Touch Virtual Controller'
                    : 'Show Touch Virtual Controller'}
                </span>
              </button>
              <div className="my-1 border-t border-zinc-800" />
              {onOpenStartMenu && (
                <button
                  type="button"
                  onClick={() => {
                    setContextMenu(null);
                    onOpenStartMenu();
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-zinc-800 flex items-center gap-2.5 cursor-pointer"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
                  <span>Start Menu · All OS Apps</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setContextMenu(null);
                  onOpenModule('universal-installer');
                  setTimeout(() => window.dispatchEvent(new CustomEvent('sovereign_open_installer_tab', { detail: { tab: 'controllers' } })), 120);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-zinc-800 flex items-center gap-2.5 cursor-pointer"
              >
                <Gamepad2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Steam Games &amp; All Controllers</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setContextMenu(null);
                  onOpenModule('file-manager');
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-zinc-800 flex items-center gap-2.5 cursor-pointer"
              >
                <Folder className="w-3.5 h-3.5 text-amber-300" />
                <span>Open This PC (All Host Files)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setContextMenu(null);
                  onOpenModule('terminal');
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-zinc-800 flex items-center gap-2.5 cursor-pointer"
              >
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>Open Root Terminal (UID 0)</span>
              </button>
              <div className="my-1 border-t border-zinc-800" />
              <button
                type="button"
                onClick={() => {
                  setContextMenu(null);
                  onTileWindows();
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-zinc-800 flex items-center gap-2.5 cursor-pointer"
              >
                <Grid2x2 className="w-3.5 h-3.5 text-sky-300" />
                <span>Tile Open Windows</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setContextMenu(null);
                  onMinimizeAll();
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-zinc-800 flex items-center gap-2.5 cursor-pointer"
              >
                <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
                <span>Show Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setContextMenu(null);
                  onOpenModule('os-settings');
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-zinc-800 flex items-center gap-2.5 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-zinc-300" />
                <span>Hyper-Customize OS &amp; Wallpaper</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export const SovereignDesktopCanvas = React.memo(SovereignDesktopCanvasInner);
