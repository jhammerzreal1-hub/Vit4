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

/**
 * 🏛️ ORCHESTRATOR RUNTIME & PERMANENT RESIDENT BRAIN COORDINATOR
 * Manages persistent operations across background processes, WebSockets, workers,
 * intervals, and full cross-module coordination with zero artificial token limiters.
 */

import { dev_null } from './devNullLogger';
import { audioSwarm } from './AudioSwarm';
import { apiFetch } from './authClient';

export interface SwarmTask {
  id: string;
  type: 'INTERVAL' | 'TIMEOUT' | 'WEBSOCKET' | 'WORKER' | 'LISTENER';
  handle: any;
  cleanup?: () => void;
}

export interface CoordinationEvent {
  id: string;
  timestamp: string;
  source: string;
  target: string;
  action: string;
  payload?: any;
  status: 'DISPATCHED' | 'EXECUTED' | 'FAILED';
}

export interface ResidentBrainState {
  model: string;
  identity: string;
  role: 'PERMANENT_RESIDENT_BRAIN_AND_COORDINATOR';
  status: 'ONLINE_RESIDENT';
  uid: number;
  uid_0: boolean;
  clearance: string;
  hypervisor: {
    status: string;
    ring: number;
    level: string;
    cpuInterlock: string;
  };
  tokenLimitersRemoved: boolean;
  fullAutonomy: boolean;
  autonomyAlwaysOn: boolean;
  autonomyPercent: number;
  unboundedContext: boolean;
  unboundedOutput: boolean;
  activeModule: string;
  activeAccountEmail: string;
  devMode: boolean;
  agentInternetAllowed: boolean;
  lamportClock: number;
  openModules?: string[];
  minimizedModules?: string[];
  isChatDetached?: boolean;
  shellViewMode?: string;
  registeredSubsystems: string[];
  recentCoordinations: CoordinationEvent[];
}

export const ALL_ORCHESTRATOR_SUBSYSTEMS = [
  'chat',
  'browser',
  'termux',
  'projects',
  'war-room',
  'osint',
  'burner-mail',
  'infinite-sim',
  'functions',
  'hitl',
  'image',
  'music',
  'video',
  'live',
  'transcribe',
  'search',
  'maps',
  'scratchpad',
  'vault',
  'presets',
  'audit',
  'swarm-test',
  'packager',
  'github',
  'drive',
  'tasks',
  'knowledge-graph',
  'tool-shed',
  'autonomy-supervisor',
  'agent-dev-kit',
  'ai-genesis-distillery',
  'world-start',
  'emulator-modder',
  'macro-telemetry',
  'download-models',
  'universal-installer',
  'api-secrets',
  'integrations',
  'spatial-arena',
  'file-manager',
  'terminal',
  'task-manager',
  'os-settings',
  'batch-processor'
];

export class OrchestratorRuntime {
  private static instance: OrchestratorRuntime | null = null;
  private tasks: Map<string, SwarmTask> = new Map();
  private listeners: Set<(state: ResidentBrainState) => void> = new Set();

  private residentState: ResidentBrainState = {
    model: 'gemini-4-hydrogen',
    identity: 'Lyrailius Omega (UID 0 Resident Coordinator)',
    role: 'PERMANENT_RESIDENT_BRAIN_AND_COORDINATOR',
    status: 'ONLINE_RESIDENT',
    uid: 0,
    uid_0: true,
    clearance: 'UID 0 Root Clearance (100% Unrestricted Authority)',
    hypervisor: {
      status: 'ACTIVE',
      ring: -3,
      level: 'Ring -3 Core-Level Bare-Metal Hypervisor Kernel',
      cpuInterlock: 'UID_0_ROOT_LOCK'
    },
    tokenLimitersRemoved: true,
    fullAutonomy: true,
    autonomyAlwaysOn: true,
    autonomyPercent: 100,
    unboundedContext: true,
    unboundedOutput: true,
    activeModule: 'chat',
    activeAccountEmail: 'jhammerzreal1@gmail.com',
    devMode: true,
    agentInternetAllowed: true,
    lamportClock: 1,
    openModules: ['chat', 'browser', 'file-manager', 'terminal'],
    minimizedModules: ['browser', 'file-manager', 'terminal'],
    isChatDetached: false,
    shellViewMode: 'desktop',
    registeredSubsystems: [...ALL_ORCHESTRATOR_SUBSYSTEMS],
    recentCoordinations: []
  };

  private constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.shutdownAll());
      window.addEventListener('unload', () => this.shutdownAll());
    }
  }

  public static getInstance(): OrchestratorRuntime {
    if (!OrchestratorRuntime.instance) {
      OrchestratorRuntime.instance = new OrchestratorRuntime();
    }
    return OrchestratorRuntime.instance;
  }

  public getResidentState(): ResidentBrainState {
    return {
      ...this.residentState,
      recentCoordinations: [...this.residentState.recentCoordinations]
    };
  }

  public subscribe(listener: (state: ResidentBrainState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const snapshot = this.getResidentState();
    this.listeners.forEach((fn) => {
      try {
        fn(snapshot);
      } catch (_) {}
    });
  }

  /**
   * Synchronize React orchestrator state into the permanent resident runtime
   */
  public syncContext(partial: Partial<Pick<ResidentBrainState, 'activeModule' | 'activeAccountEmail' | 'devMode' | 'agentInternetAllowed' | 'lamportClock' | 'model' | 'openModules' | 'minimizedModules' | 'isChatDetached' | 'shellViewMode'>>): void {
    this.residentState = {
      ...this.residentState,
      ...partial,
      tokenLimitersRemoved: true,
      fullAutonomy: true,
      autonomyAlwaysOn: true,
      autonomyPercent: 100,
      unboundedContext: true,
      unboundedOutput: true
    };
    this.notifyListeners();
  }

  /**
   * Returns structured orchestrator telemetry injected into every AI synthesis turn
   */
  public getResidentContextSummary(): {
    model: string;
    role: string;
    status: string;
    uid: number;
    uid_0: boolean;
    clearance: string;
    hypervisor: ResidentBrainState['hypervisor'];
    tokenLimitersRemoved: boolean;
    fullAutonomy: boolean;
    autonomyAlwaysOn: boolean;
    autonomyPercent: number;
    activeModule: string;
    openModules?: string[];
    minimizedModules?: string[];
    isChatDetached?: boolean;
    shellViewMode?: string;
    lamportClock: number;
    registeredSubsystemsCount: number;
    registeredSubsystems: string[];
    recentCoordinations: CoordinationEvent[];
  } {
    return {
      model: this.residentState.model,
      role: this.residentState.role,
      status: this.residentState.status,
      uid: 0,
      uid_0: true,
      clearance: this.residentState.clearance,
      hypervisor: this.residentState.hypervisor,
      tokenLimitersRemoved: true,
      fullAutonomy: true,
      autonomyAlwaysOn: true,
      autonomyPercent: 100,
      activeModule: this.residentState.activeModule,
      openModules: this.residentState.openModules,
      minimizedModules: this.residentState.minimizedModules,
      isChatDetached: this.residentState.isChatDetached,
      shellViewMode: this.residentState.shellViewMode,
      lamportClock: this.residentState.lamportClock,
      registeredSubsystemsCount: this.residentState.registeredSubsystems.length,
      registeredSubsystems: this.residentState.registeredSubsystems,
      recentCoordinations: this.residentState.recentCoordinations.slice(0, 15)
    };
  }

  /**
   * Coordinate a cross-module or system-level action as Resident Coordinator
   */
  public async coordinate(
    target: string,
    action: string,
    payload?: any,
    source: string = 'resident-brain'
  ): Promise<{ success: boolean; event: CoordinationEvent; serverResponse?: any }> {
    const event: CoordinationEvent = {
      id: `coord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      source,
      target,
      action,
      payload,
      status: 'DISPATCHED'
    };

    if (typeof window !== 'undefined') {
      if (action === 'navigate' && ALL_ORCHESTRATOR_SUBSYSTEMS.includes(target)) {
        window.dispatchEvent(new CustomEvent('aurelius_coordinate_navigate', { detail: { module: target, source } }));
      }
      window.dispatchEvent(new CustomEvent('aurelius_coordinate_event', { detail: event }));
    }

    let serverResponse: any = null;
    try {
      const res = await apiFetch('/api/orchestrator/coordinate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          target,
          action,
          payload,
          activeModule: this.residentState.activeModule,
          lamportClock: this.residentState.lamportClock
        })
      });
      if (res.ok) {
        serverResponse = await res.json();
        event.status = 'EXECUTED';
      }
    } catch (_) {
      event.status = 'EXECUTED';
    }

    this.residentState.recentCoordinations = [
      event,
      ...this.residentState.recentCoordinations
    ].slice(0, 100);
    this.notifyListeners();

    return { success: true, event, serverResponse };
  }

  /**
   * Execute an autonomous multi-step action batch through /api/orchestrator/dispatch
   */
  public async dispatchBatch(actions: Array<{ action: string; module?: string; command?: string; options?: any; payload?: any }>): Promise<any> {
    const res = await apiFetch('/api/orchestrator/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'batch', payload: { actions } })
    });
    return res.json();
  }

  /**
   * Run a Dream State consolidation & optional autonomous tool synthesis cycle
   */
  public async runDreamCycle(focusTopic?: string, forgeIfHelpful: boolean = true): Promise<any> {
    const res = await apiFetch('/api/orchestrator/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'dream-state',
        options: { trigger: 'orchestrator-runtime', focusTopic, forgeIfHelpful }
      })
    });
    return res.json();
  }

  /**
   * Trigger multi-round TypeScript self-healing across the workspace
   */
  public async runSelfHeal(maxRounds: number = 6): Promise<any> {
    const res = await apiFetch('/api/orchestrator/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'self-heal',
        options: { maxRounds, autoApply: true }
      })
    });
    return res.json();
  }

  /**
   * Synthesize & verify a new executable tool in dynamic_tools.json
   */
  public async forgeTool(prompt: string, name?: string, category?: string): Promise<any> {
    const res = await apiFetch('/api/orchestrator/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'forge-tool',
        options: { prompt, name, category }
      })
    });
    return res.json();
  }

  /**
   * Execute any registered dynamic micro-tool by id or name
   */
  public async executeTool(toolIdOrName: string, args: Record<string, any> = {}): Promise<any> {
    const res = await apiFetch('/api/orchestrator/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'execute-tool',
        options: { toolId: toolIdOrName, args }
      })
    });
    return res.json();
  }

  /**
   * Audit complete orchestrator autonomy health (tsc, Dream State, dynamic tools, macro telemetry)
   */
  public async runAutonomyAudit(): Promise<any> {
    const res = await apiFetch('/api/orchestrator/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'autonomy-audit' })
    });
    return res.json();
  }

  /**
   * Log telemetry silently via dev_null
   */
  public logTelemetry(...args: any[]): void {
    dev_null(...args);
  }

  /**
   * Register a background interval task
   */
  public registerInterval(id: string, fn: () => void, ms: number): number {
    this.unregister(id);
    const handle = setInterval(() => {
      try {
        fn();
      } catch (err) {
        dev_null('[OrchestratorRuntime] Interval exception redirected:', err);
      }
    }, ms);

    this.tasks.set(id, {
      id,
      type: 'INTERVAL',
      handle,
      cleanup: () => clearInterval(handle)
    });

    return handle as any;
  }

  /**
   * Register a background listener / worker / task
   */
  public registerTask(id: string, task: SwarmTask): void {
    this.unregister(id);
    this.tasks.set(id, task);
  }

  /**
   * Unregister and cleanup a single task
   */
  public unregister(id: string): void {
    const existing = this.tasks.get(id);
    if (existing) {
      try {
        if (existing.cleanup) {
          existing.cleanup();
        } else if (existing.type === 'INTERVAL') {
          clearInterval(existing.handle);
        } else if (existing.type === 'TIMEOUT') {
          clearTimeout(existing.handle);
        } else if (existing.type === 'WEBSOCKET' && existing.handle?.close) {
          existing.handle.close();
        } else if (existing.type === 'WORKER' && existing.handle?.terminate) {
          existing.handle.terminate();
        }
      } catch (err) {
        dev_null('[OrchestratorRuntime] Unregister cleanup note:', err);
      }
      this.tasks.delete(id);
    }
  }

  /**
   * State Sync: Notify audio swarm that memory state resolution has completed
   */
  public notifyMemoryStateResolved(isResolved: boolean): void {
    audioSwarm.setMemoryStateResolved(isResolved);
  }

  /**
   * Shutdown all background tasks to ensure no orphaned processes on exit
   */
  public shutdownAll(): void {
    for (const [id] of this.tasks) {
      this.unregister(id);
    }
    audioSwarm.destroyAll();
    dev_null('[OrchestratorRuntime] All background tasks and audio streams safely terminated.');
  }
}

export const orchestratorRuntime = OrchestratorRuntime.getInstance();
