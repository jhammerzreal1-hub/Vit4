/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 * (TWENTY 47 PROTOCOL - GENESIS NODE / LYSANDER CORE EULA / H-FID Forensic License v1.1).
 * Zenodo DOI: https://doi.org/10.5281/zenodo.20778079 | ORCID: https://orcid.org/0009-0004-5273-7028
 */

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Zap,
  Square,
  Play,
  Target,
  Trash2,
  Activity,
  CheckCircle2,
  Sparkles,
  X,
  GripHorizontal,
  Minus,
  Maximize2,
  Minimize2,
  PanelTop,
  Radio,
  ArrowDown
} from 'lucide-react';

export interface WorkflowActionEntry {
  id: string;
  cycle: number;
  timestamp: string;
  action: string;
  status: 'running' | 'complete' | 'accomplished' | 'interrupted' | string;
  details?: string;
}

export interface WorkflowWindowGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FloatingWorkflowWindowProps {
  isOpen: boolean;
  workflowActive: boolean;
  loading: boolean;
  workflowCycle: number;
  workflowGoal: string;
  workflowActiveAction: string;
  workflowAccomplished: boolean;
  workflowAccomplishedSummary: string;
  workflowActionLog: WorkflowActionEntry[];
  minimized: boolean;
  maximized: boolean;
  geometry: WorkflowWindowGeometry;
  onGeometryChange: (next: Partial<WorkflowWindowGeometry>) => void;
  onStopLoop: () => void;
  onResumeLoop: () => void;
  onPulseNextTurn: () => void;
  onOpenGoalModal: () => void;
  onClearLog: () => void;
  onDockToChat: () => void;
  onMinimizeToggle: () => void;
  onMaximizeToggle: () => void;
  onClose: () => void;
}

type DragAction = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export function getViewportDimensions(): { width: number; height: number } {
  if (typeof window === 'undefined') return { width: 1280, height: 720 };
  const vv = window.visualViewport;
  return {
    width: Math.max(300, Math.round(vv?.width || window.innerWidth || 1280)),
    height: Math.max(240, Math.round(vv?.height || window.innerHeight || 720))
  };
}

export function createDefaultWorkflowGeometry(
  vpW = getViewportDimensions().width,
  vpH = getViewportDimensions().height
): WorkflowWindowGeometry {
  const width = Math.min(480, Math.max(300, vpW - 24));
  const height = Math.min(460, Math.max(260, Math.round(vpH * 0.6)));
  const x = Math.max(12, vpW - width - 16);
  const y = Math.min(58, Math.max(8, vpH - height - 64));
  return { x, y, width, height };
}

export function clampWorkflowGeometry(
  geom: WorkflowWindowGeometry,
  vpW: number,
  vpH: number
): WorkflowWindowGeometry {
  const safeW = Math.max(300, vpW);
  const safeH = Math.max(240, vpH);
  const minW = Math.min(300, safeW - 12);
  const minH = Math.min(220, safeH - 16);
  const width = Math.max(minW, Math.min(geom.width, safeW - 12));
  const height = Math.max(minH, Math.min(geom.height, safeH - 16));
  const minVisibleStrip = Math.min(160, Math.max(110, width));
  const minX = -(width - minVisibleStrip);
  const maxX = Math.max(4, safeW - minVisibleStrip);
  const maxY = Math.max(4, safeH - 52);
  return {
    x: Math.round(Math.max(minX, Math.min(geom.x, maxX))),
    y: Math.round(Math.max(4, Math.min(geom.y, maxY))),
    width: Math.round(width),
    height: Math.round(height)
  };
}

export const FloatingWorkflowWindow: React.FC<FloatingWorkflowWindowProps> = ({
  isOpen,
  workflowActive,
  loading,
  workflowCycle,
  workflowGoal,
  workflowActiveAction,
  workflowAccomplished,
  workflowAccomplishedSummary,
  workflowActionLog,
  minimized,
  maximized,
  geometry,
  onGeometryChange,
  onStopLoop,
  onResumeLoop,
  onPulseNextTurn,
  onOpenGoalModal,
  onClearLog,
  onDockToChat,
  onMinimizeToggle,
  onMaximizeToggle,
  onClose
}) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const coordsBadgeRef = useRef<HTMLSpanElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number>(0);
  const lastInteractionEndRef = useRef<number>(0);
  const stickToBottomRef = useRef<boolean>(true);
  const [showJumpBottom, setShowJumpBottom] = useState(false);

  const [viewport, setViewport] = useState(getViewportDimensions);
  const [activeInteraction, setActiveInteraction] = useState<DragAction | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<DragAction | null>(null);
  const [isFocused, setIsFocused] = useState(true);

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
  } | null>(null);

  useEffect(() => {
    const updateVp = () => setViewport(getViewportDimensions());
    window.addEventListener('resize', updateVp);
    window.visualViewport?.addEventListener('resize', updateVp);
    return () => {
      window.removeEventListener('resize', updateVp);
      window.visualViewport?.removeEventListener('resize', updateVp);
    };
  }, []);

  useEffect(() => {
    const onDocPointerDown = (ev: PointerEvent) => {
      const el = wrapperRef.current;
      if (!el) return;
      setIsFocused(el.contains(ev.target as Node));
    };
    document.addEventListener('pointerdown', onDocPointerDown, true);
    return () => document.removeEventListener('pointerdown', onDocPointerDown, true);
  }, []);

  // Auto-follow timeline bottom when new workflow steps arrive unless user scrolled up
  useEffect(() => {
    const el = timelineRef.current;
    if (!el || minimized) return;
    if (stickToBottomRef.current) {
      requestAnimationFrame(() => {
        if (timelineRef.current) {
          timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
        }
      });
    }
  }, [workflowActionLog.length, workflowActiveAction, minimized, isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const safeGeom = clampWorkflowGeometry(geometry, viewport.width, viewport.height);
  const isInteracting = activeInteraction !== null;
  const zClass = isFocused ? 'z-[51]' : 'z-[49]';

  const safeControlClick = (handler?: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (Date.now() - lastInteractionEndRef.current < 160) return;
    handler?.();
  };

  const startDrag = (e: React.PointerEvent, type: DragAction) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, [data-wf-controls="true"]')) return;
    e.preventDefault();
    e.stopPropagation();
    setIsFocused(true);

    const frameEl = wrapperRef.current;
    const frameRect = frameEl?.getBoundingClientRect();
    const pointerRatioX =
      frameRect && frameRect.width > 0
        ? Math.max(0.15, Math.min(0.85, (e.clientX - frameRect.left) / frameRect.width))
        : 0.5;

    dragSessionRef.current = {
      type,
      startX: e.clientX,
      startY: e.clientY,
      origX: safeGeom.x,
      origY: safeGeom.y,
      origW: safeGeom.width,
      origH: safeGeom.height,
      startedMaximized: maximized,
      unmaximized: false,
      pointerRatioX
    };
    setActiveInteraction(type);
    document.body.style.userSelect = 'none';

    let pendingCommit: Partial<WorkflowWindowGeometry> | null = null;
    let pendingMoveDx = 0;
    let pendingMoveDy = 0;
    let pendingBox: { x: number; y: number; w: number; h: number } | null = null;

    const applyLiveFrame = () => {
      rafRef.current = 0;
      const el = wrapperRef.current;
      const sess = dragSessionRef.current;
      if (!el || !sess) return;

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

    const scheduleFrame = () => {
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(applyLiveFrame);
      }
    };

    const onMove = (moveEvt: PointerEvent) => {
      const sess = dragSessionRef.current;
      if (!sess) return;
      const dx = moveEvt.clientX - sess.startX;
      const dy = moveEvt.clientY - sess.startY;
      const minW = Math.min(300, viewport.width - 12);
      const minH = Math.min(220, viewport.height - 16);

      if (sess.type === 'move') {
        if (sess.startedMaximized && !sess.unmaximized) {
          if (Math.hypot(dx, dy) < 6) return;
          sess.unmaximized = true;
          onMaximizeToggle();
          sess.origX = Math.max(6, Math.round(moveEvt.clientX - sess.origW * sess.pointerRatioX));
          sess.origY = Math.max(6, Math.round(moveEvt.clientY - 20));
          sess.startX = moveEvt.clientX;
          sess.startY = moveEvt.clientY;
          const clampedTear = clampWorkflowGeometry(
            { x: sess.origX, y: sess.origY, width: sess.origW, height: sess.origH },
            viewport.width,
            viewport.height
          );
          sess.origX = clampedTear.x;
          sess.origY = clampedTear.y;
          pendingBox = {
            x: clampedTear.x,
            y: clampedTear.y,
            w: clampedTear.width,
            h: clampedTear.height
          };
          pendingMoveDx = 0;
          pendingMoveDy = 0;
          pendingCommit = clampedTear;
          scheduleFrame();
          return;
        }

        const clamped = clampWorkflowGeometry(
          {
            x: sess.origX + dx,
            y: sess.origY + dy,
            width: sess.origW,
            height: sess.origH
          },
          viewport.width,
          viewport.height
        );
        pendingMoveDx = clamped.x - sess.origX;
        pendingMoveDy = clamped.y - sess.origY;
        pendingCommit = { x: clamped.x, y: clamped.y };
        scheduleFrame();
        return;
      }

      let nextX = sess.origX;
      let nextY = sess.origY;
      let nextW = sess.origW;
      let nextH = sess.origH;

      if (sess.type.includes('e')) {
        const maxW = Math.max(minW, viewport.width - sess.origX - 6);
        nextW = Math.max(minW, Math.min(maxW, sess.origW + dx));
      } else if (sess.type.includes('w')) {
        const maxDelta = sess.origW - minW;
        const clampedDx = Math.max(-sess.origX + 6, Math.min(maxDelta, dx));
        nextX = sess.origX + clampedDx;
        nextW = sess.origW - clampedDx;
      }

      if (sess.type.includes('s')) {
        const maxH = Math.max(minH, viewport.height - sess.origY - 6);
        nextH = Math.max(minH, Math.min(maxH, sess.origH + dy));
      } else if (sess.type.includes('n')) {
        const maxDelta = sess.origH - minH;
        const clampedDy = Math.max(-sess.origY + 6, Math.min(maxDelta, dy));
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
        height: pendingBox.h
      };
      scheduleFrame();
    };

    const onEnd = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      if (wrapperRef.current) {
        wrapperRef.current.style.transform = '';
      }
      if (pendingCommit) {
        onGeometryChange(pendingCommit);
        pendingCommit = null;
      }
      dragSessionRef.current = null;
      lastInteractionEndRef.current = Date.now();
      setActiveInteraction(null);
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
  };

  // Minimized Persistent Pill Mode (keeps workflow live & 1-tap controllable alongside Voice Chat or any app)
  if (minimized) {
    const pillNode = (
      <div
        ref={wrapperRef}
        onPointerDown={() => setIsFocused(true)}
        style={{
          top: Math.max(8, Math.min(safeGeom.y, viewport.height - 62)),
          right: 12
        }}
        className={`fixed ${zClass} max-w-[calc(100vw-24px)] flex items-center gap-2 px-3 py-2 rounded-2xl bg-zinc-950/95 border shadow-[0_14px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl ${
          workflowActive
            ? 'border-amber-400/70 ring-1 ring-amber-400/30'
            : workflowAccomplished
            ? 'border-emerald-500/60'
            : 'border-zinc-700'
        }`}
      >
        <div className={`p-1.5 rounded-lg shrink-0 ${workflowActive ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-400'}`}>
          <Zap className={`w-3.5 h-3.5 ${workflowActive ? 'animate-pulse' : ''}`} />
        </div>
        <button
          type="button"
          onClick={onMinimizeToggle}
          className="min-w-0 text-left cursor-pointer"
          title="Restore Autonomous Workflow Window"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-amber-200 whitespace-nowrap">
            <span>Workflow C#{workflowCycle}</span>
            {workflowActive ? (
              <span className="text-[9px] text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30 animate-pulse">
                RUNNING
              </span>
            ) : workflowAccomplished ? (
              <span className="text-[9px] text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30">
                DONE
              </span>
            ) : (
              <span className="text-[9px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">PAUSED</span>
            )}
          </div>
          <div className="text-[10px] font-mono text-zinc-400 truncate max-w-[200px] sm:max-w-[260px]">
            {workflowActiveAction || workflowGoal}
          </div>
        </button>

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {workflowActive ? (
            <button
              type="button"
              onClick={onStopLoop}
              className="px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/35 text-rose-200 border border-rose-500/40 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer"
              title="Stop autonomous loop"
            >
              <Square className="w-2.5 h-2.5 fill-rose-400" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onResumeLoop}
              disabled={loading}
              className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-200 border border-emerald-500/40 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40"
              title="Resume autonomous loop"
            >
              <Play className="w-2.5 h-2.5 fill-emerald-400" />
              <span>Run</span>
            </button>
          )}
          <button
            type="button"
            onClick={onMinimizeToggle}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-zinc-700 cursor-pointer"
            title="Expand Floating Workflow Window"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDockToChat}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 border border-zinc-800 cursor-pointer"
            title="Dock back inside Chat"
          >
            <PanelTop className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
    return createPortal(pillNode, document.body);
  }

  const windowStyle: React.CSSProperties = maximized
    ? {
        top: 8,
        left: 8,
        width: 'calc(100vw - 16px)',
        height: 'calc(100dvh - 16px)',
        willChange: isInteracting ? 'transform, left, top, width, height' : undefined
      }
    : {
        top: safeGeom.y,
        left: safeGeom.x,
        width: safeGeom.width,
        height: safeGeom.height,
        willChange: isInteracting ? 'transform, left, top, width, height' : undefined
      };

  const activeResizeEdge = activeInteraction && activeInteraction !== 'move' ? activeInteraction : hoveredHandle;
  const edgeGlow = (dir: 'n' | 's' | 'e' | 'w') => Boolean(activeResizeEdge && activeResizeEdge.includes(dir));

  const windowNode = (
    <div
      ref={wrapperRef}
      onPointerDownCapture={() => setIsFocused(true)}
      style={windowStyle}
      className={`fixed ${zClass} overflow-visible`}
    >
      {/* Clipped Window Body */}
      <div
        className={`relative w-full h-full flex flex-col overflow-hidden rounded-2xl bg-zinc-950/95 backdrop-blur-xl transition-shadow ${
          isInteracting
            ? 'border-2 border-sky-400/85 shadow-[0_24px_64px_rgba(0,0,0,0.9)]'
            : workflowActive
            ? 'border border-amber-400/75 shadow-[0_20px_60px_rgba(0,0,0,0.88)] ring-1 ring-amber-400/35'
            : 'border border-zinc-700/90 shadow-[0_18px_52px_rgba(0,0,0,0.85)]'
        }`}
      >
        {/* Active Resize Edge Highlights */}
        {!maximized && edgeGlow('n') && <div className="pointer-events-none absolute top-0 inset-x-0 h-[2px] bg-sky-400 z-40" />}
        {!maximized && edgeGlow('s') && <div className="pointer-events-none absolute bottom-0 inset-x-0 h-[2px] bg-sky-400 z-40" />}
        {!maximized && edgeGlow('w') && <div className="pointer-events-none absolute left-0 inset-y-0 w-[2px] bg-sky-400 z-40" />}
        {!maximized && edgeGlow('e') && <div className="pointer-events-none absolute right-0 inset-y-0 w-[2px] bg-sky-400 z-40" />}

        {/* Draggable Window Title Bar */}
        <div
          onPointerDown={(e) => startDrag(e, 'move')}
          onDoubleClick={(e) => {
            if ((e.target as HTMLElement).closest('button, [data-wf-controls="true"]')) return;
            onMaximizeToggle();
          }}
          className="h-11 px-3 bg-gradient-to-r from-amber-950/50 via-zinc-900 to-zinc-950 border-b border-amber-500/35 flex items-center justify-between gap-2 shrink-0 select-none touch-none cursor-grab active:cursor-grabbing"
          title="Drag to position over any OS window or resize from any edge/corner"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <GripHorizontal className="w-4 h-4 text-zinc-500 shrink-0" aria-hidden="true" />
            <div className={`p-1 rounded-lg shrink-0 ${workflowActive ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-400'}`}>
              <Zap className={`w-3.5 h-3.5 ${workflowActive ? 'animate-pulse' : ''}`} />
            </div>
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <span className="text-[11px] font-mono font-black text-amber-300 tracking-wide uppercase truncate">
                Autonomous Workflow
              </span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/35 shrink-0">
                C#{workflowCycle}
              </span>
              {workflowActive && (
                <span className="flex items-center gap-1 text-[9px] font-mono text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 rounded-full border border-emerald-500/35 animate-pulse shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  RUNNING
                </span>
              )}
              {workflowAccomplished && (
                <span className="flex items-center gap-1 text-[9px] font-mono text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded-full border border-emerald-500/40 font-bold shrink-0">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                  DONE
                </span>
              )}
              {isInteracting && (
                <span ref={coordsBadgeRef} className="text-[10px] font-mono text-sky-300 tabular-nums whitespace-nowrap">
                  {activeInteraction === 'move' ? `X ${safeGeom.x} · Y ${safeGeom.y}` : `${safeGeom.width} × ${safeGeom.height}`}
                </span>
              )}
            </div>
          </div>

          <div
            data-wf-controls="true"
            onPointerDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 shrink-0 cursor-default"
          >
            <button
              type="button"
              onClick={safeControlClick(() => window.dispatchEvent(new CustomEvent('sovereign_toggle_persistent_talk')))}
              className="h-7 px-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 text-[10px] font-mono font-semibold flex items-center gap-1 cursor-pointer"
              title="Toggle Voice Chat Dock in tandem with Autonomous Workflow"
            >
              <Radio className="w-3 h-3" />
              <span className="hidden sm:inline">Voice</span>
            </button>

            <button
              type="button"
              onClick={safeControlClick(onDockToChat)}
              className="h-7 px-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-amber-200 text-[10px] font-mono flex items-center gap-1 cursor-pointer"
              title="Re-dock Autonomous Workflow HUD into Chat header"
            >
              <PanelTop className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">Dock</span>
            </button>

            <button
              type="button"
              onClick={safeControlClick(onMinimizeToggle)}
              className="h-7 w-7 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-100 flex items-center justify-center cursor-pointer"
              title="Minimize to compact always-visible status pill"
              aria-label="Minimize workflow window"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={safeControlClick(onMaximizeToggle)}
              className="h-7 w-7 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-100 flex items-center justify-center cursor-pointer"
              title={maximized ? 'Restore window size' : 'Maximize workflow window'}
              aria-label={maximized ? 'Restore workflow window' : 'Maximize workflow window'}
            >
              {maximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={safeControlClick(onClose)}
              className="h-7 w-7 rounded-lg bg-zinc-900 hover:bg-rose-950/70 border border-zinc-800 hover:border-rose-500/40 text-zinc-400 hover:text-rose-200 flex items-center justify-center cursor-pointer"
              title={workflowActive ? 'Hide workflow window (loop keeps running; reopen from Chat header)' : 'Close workflow window'}
              aria-label="Close workflow window"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Loop Control Bar */}
        <div className="px-3 py-2 bg-zinc-900/75 border-b border-zinc-800 flex items-center justify-between gap-1.5 flex-wrap shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {workflowActive ? (
              <>
                <button
                  type="button"
                  onClick={onStopLoop}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/45 text-[10px] font-mono font-bold flex items-center gap-1.5 cursor-pointer"
                  title="Instantly stop the infinite autonomous workflow loop"
                >
                  <Square className="w-3 h-3 fill-rose-400" />
                  STOP LOOP
                </button>
                <button
                  type="button"
                  onClick={onPulseNextTurn}
                  disabled={loading}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-[10px] font-mono font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-45"
                  title="Force immediate execution of next autonomous cycle"
                >
                  <Zap className="w-3 h-3" />
                  PULSE NEXT TURN
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onResumeLoop}
                disabled={loading}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/45 text-[10px] font-mono font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-45"
                title="Start or resume continuous autonomous execution"
              >
                <Play className="w-3 h-3 fill-emerald-400" />
                RESUME LOOP
              </button>
            )}

            <button
              type="button"
              onClick={onOpenGoalModal}
              className="px-2 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-[10px] font-mono flex items-center gap-1 cursor-pointer"
              title="Configure target autonomous goal"
            >
              <Target className="w-3 h-3 text-amber-400" />
              SET GOAL
            </button>
          </div>

          <button
            type="button"
            onClick={onClearLog}
            disabled={workflowActionLog.length === 0}
            className="px-2 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-[10px] font-mono flex items-center gap-1 cursor-pointer disabled:opacity-40"
            title="Clear recorded action timeline"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear</span>
          </button>
        </div>

        {/* Active Target Goal */}
        <div className="px-3 py-2 bg-zinc-900/50 border-b border-zinc-800/80 flex items-start justify-between gap-2 text-xs font-mono shrink-0">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <Target className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-zinc-400 font-semibold uppercase mr-1.5">Goal:</span>
              <span className="text-[11px] text-amber-200 font-bold break-words">"{workflowGoal}"</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenGoalModal}
            className="text-[10px] text-amber-400/90 hover:text-amber-300 underline font-mono shrink-0 cursor-pointer"
          >
            Edit
          </button>
        </div>

        {/* Live Activity Telemetry Bar */}
        <div className="px-3 py-2 bg-black/50 border-b border-zinc-800 flex items-start gap-2.5 shrink-0">
          {loading ? (
            <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin shrink-0 mt-0.5" />
          ) : workflowActive ? (
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 flex items-center gap-1.5">
              <span>Current Activity</span>
              {workflowActive && <span className="text-[9px] text-amber-400 animate-pulse">● LIVE TELEMETRY</span>}
            </div>
            <div className="text-[11px] font-mono text-zinc-100 font-medium break-words mt-0.5">
              {workflowActiveAction ||
                (loading
                  ? 'Agent actively evaluating orchestrator state & executing tools...'
                  : workflowActive
                  ? 'Autonomous loop armed — waiting for next cycle pulse.'
                  : 'Loop paused. Click RESUME LOOP or toggle Auto Loop in Chat/Voice.')}
            </div>
          </div>
        </div>

        {/* Verified Goal Accomplished Banner */}
        {workflowAccomplished && workflowAccomplishedSummary && (
          <div className="p-2.5 bg-emerald-950/35 border-b border-emerald-500/35 flex items-start gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] font-mono font-bold text-emerald-300">Goal Accomplished & Verified</div>
              <div className="text-[11px] font-mono text-emerald-300/90 mt-0.5 break-words leading-relaxed">
                {workflowAccomplishedSummary}
              </div>
            </div>
          </div>
        )}

        {/* Flex-1 Resizable Autonomous Actions Timeline */}
        <div className="relative flex-1 min-h-0 flex flex-col bg-zinc-950/85">
          <div className="px-3 py-1.5 border-b border-zinc-900 flex items-center justify-between text-[9px] font-mono text-zinc-500 uppercase tracking-wider font-bold shrink-0">
            <span>Autonomous Actions Timeline ({workflowActionLog.length})</span>
            <span>Resize window to expand view</span>
          </div>

          <div
            ref={timelineRef}
            onScroll={() => {
              const el = timelineRef.current;
              if (!el) return;
              const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
              const atBottom = distFromBottom < 36;
              stickToBottomRef.current = atBottom;
              setShowJumpBottom(!atBottom && workflowActionLog.length > 0);
            }}
            className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-1.5 font-mono text-[11px] custom-scrollbar"
          >
            {workflowActionLog.length === 0 ? (
              <div className="h-full min-h-[72px] flex items-center justify-center text-center text-zinc-500 text-[11px] px-4">
                Autonomous steps, tool calls, and cycle checkpoints will stream live right here as agents execute.
              </div>
            ) : (
              workflowActionLog.map((act) => (
                <div
                  key={act.id}
                  className={`flex items-start gap-2 px-2 py-1.5 rounded-lg border transition-colors ${
                    act.status === 'running'
                      ? 'bg-amber-500/10 border-amber-500/35 text-amber-200'
                      : act.status === 'accomplished'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 font-bold'
                      : act.status === 'interrupted'
                      ? 'bg-rose-500/10 border-rose-500/35 text-rose-300'
                      : 'bg-zinc-900/45 border-zinc-800/80 text-zinc-300'
                  }`}
                >
                  <span className="text-[9px] text-zinc-500 shrink-0 font-bold mt-0.5 tabular-nums">[{act.timestamp}]</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-amber-300 border border-zinc-700 shrink-0 mt-0.5 tabular-nums">
                    C#{act.cycle}
                  </span>
                  <div className="flex-1 min-w-0 flex items-start gap-1.5">
                    {act.status === 'running' && (
                      <div className="w-2.5 h-2.5 rounded-full border border-amber-400 border-t-transparent animate-spin shrink-0 mt-1" />
                    )}
                    {act.status === 'complete' && <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />}
                    {act.status === 'accomplished' && <Sparkles className="w-3 h-3 text-amber-300 shrink-0 mt-0.5" />}
                    {act.status === 'interrupted' && <X className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />}
                    <span className="break-words leading-snug">{act.action}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {showJumpBottom && (
            <button
              type="button"
              onClick={() => {
                stickToBottomRef.current = true;
                setShowJumpBottom(false);
                if (timelineRef.current) {
                  timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
                }
              }}
              className="absolute bottom-2.5 right-4 px-2.5 py-1 rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 text-[10px] font-mono font-bold shadow-lg flex items-center gap-1 cursor-pointer"
            >
              <ArrowDown className="w-3 h-3" />
              <span>Latest</span>
            </button>
          )}
        </div>

        {/* Bottom-right subtle resize grip visual indicator */}
        {!maximized && (
          <div
            onPointerDown={(e) => startDrag(e, 'se')}
            className="absolute bottom-0.5 right-0.5 w-4 h-4 cursor-nwse-resize touch-none flex items-end justify-end p-0.5 text-zinc-600 hover:text-amber-400"
            title="Drag corner to resize"
          >
            <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" aria-hidden="true">
              <path d="M9 1L1 9M9 5L5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </div>

      {/* 8-Way Overhanging Resize Handles (Edges + Corners, Touch & Mouse Friendly) */}
      {!maximized && (
        <>
          <div
            onPointerDown={(e) => startDrag(e, 'n')}
            onPointerEnter={() => setHoveredHandle('n')}
            onPointerLeave={() => setHoveredHandle((h) => (h === 'n' ? null : h))}
            className="absolute -top-1.5 left-3 right-3 h-3 cursor-ns-resize touch-none z-30"
          />
          <div
            onPointerDown={(e) => startDrag(e, 's')}
            onPointerEnter={() => setHoveredHandle('s')}
            onPointerLeave={() => setHoveredHandle((h) => (h === 's' ? null : h))}
            className="absolute -bottom-1.5 left-3 right-3 h-3 cursor-ns-resize touch-none z-30"
          />
          <div
            onPointerDown={(e) => startDrag(e, 'w')}
            onPointerEnter={() => setHoveredHandle('w')}
            onPointerLeave={() => setHoveredHandle((h) => (h === 'w' ? null : h))}
            className="absolute top-3 bottom-3 -left-1.5 w-3 cursor-ew-resize touch-none z-30"
          />
          <div
            onPointerDown={(e) => startDrag(e, 'e')}
            onPointerEnter={() => setHoveredHandle('e')}
            onPointerLeave={() => setHoveredHandle((h) => (h === 'e' ? null : h))}
            className="absolute top-3 bottom-3 -right-1.5 w-3 cursor-ew-resize touch-none z-30"
          />
          <div
            onPointerDown={(e) => startDrag(e, 'nw')}
            onPointerEnter={() => setHoveredHandle('nw')}
            onPointerLeave={() => setHoveredHandle((h) => (h === 'nw' ? null : h))}
            className="absolute -top-2 -left-2 w-4 h-4 cursor-nwse-resize touch-none z-40"
          />
          <div
            onPointerDown={(e) => startDrag(e, 'ne')}
            onPointerEnter={() => setHoveredHandle('ne')}
            onPointerLeave={() => setHoveredHandle((h) => (h === 'ne' ? null : h))}
            className="absolute -top-2 -right-2 w-4 h-4 cursor-nesw-resize touch-none z-40"
          />
          <div
            onPointerDown={(e) => startDrag(e, 'sw')}
            onPointerEnter={() => setHoveredHandle('sw')}
            onPointerLeave={() => setHoveredHandle((h) => (h === 'sw' ? null : h))}
            className="absolute -bottom-2 -left-2 w-4 h-4 cursor-nesw-resize touch-none z-40"
          />
          <div
            onPointerDown={(e) => startDrag(e, 'se')}
            onPointerEnter={() => setHoveredHandle('se')}
            onPointerLeave={() => setHoveredHandle((h) => (h === 'se' ? null : h))}
            className="absolute -bottom-2 -right-2 w-4 h-4 cursor-nwse-resize touch-none z-40"
          />
        </>
      )}
    </div>
  );

  return createPortal(windowNode, document.body);
};
