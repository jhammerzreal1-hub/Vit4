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

export interface CapitalFlowMetric {
  vector: string;
  velocity: number;
  anomalyDetected: boolean;
  timestamp: number;
}

type TelemetryListener = (...args: any[]) => void;

class BrowserSafeEventEmitter {
  private listeners: Map<string, Set<TelemetryListener>> = new Map();

  public on(event: string, listener: TelemetryListener): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return this;
  }

  public addListener(event: string, listener: TelemetryListener): this {
    return this.on(event, listener);
  }

  public off(event: string, listener: TelemetryListener): this {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(listener);
    }
    return this;
  }

  public removeListener(event: string, listener: TelemetryListener): this {
    return this.off(event, listener);
  }

  public once(event: string, listener: TelemetryListener): this {
    const wrapper: TelemetryListener = (...args: any[]) => {
      this.off(event, wrapper);
      listener(...args);
    };
    return this.on(event, wrapper);
  }

  public emit(event: string, ...args: any[]): boolean {
    const set = this.listeners.get(event);
    if (!set || set.size === 0) return false;
    for (const listener of Array.from(set)) {
      try {
        listener(...args);
      } catch (err) {
        console.error('[MacroTelemetryEngine] Listener error:', err);
      }
    }
    return true;
  }

  public removeAllListeners(event?: string): this {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
    return this;
  }
}

export class MacroTelemetryEngine extends BrowserSafeEventEmitter {
  private static instance: MacroTelemetryEngine;
  private activeStreams: Map<string, CapitalFlowMetric> = new Map();

  private constructor() {
    super();
    this.initializeEngine();
  }

  public static getInstance(): MacroTelemetryEngine {
    if (!MacroTelemetryEngine.instance) {
      MacroTelemetryEngine.instance = new MacroTelemetryEngine();
    }
    return MacroTelemetryEngine.instance;
  }

  private initializeEngine() {
    console.log('[MACRO_TELEMETRY] Geopolitical strife & capital flight tracking active.');
  }

  public ingestTelemetry(vector: string, velocity: number, anomaly: boolean): CapitalFlowMetric {
    const metric: CapitalFlowMetric = {
      vector,
      velocity,
      anomalyDetected: anomaly,
      timestamp: Date.now(),
    };
    this.activeStreams.set(vector, metric);
    this.emit('capital_shift', metric);
    return metric;
  }

  public getActiveStreams(): CapitalFlowMetric[] {
    return Array.from(this.activeStreams.values());
  }
}

export const macroTelemetry = MacroTelemetryEngine.getInstance();
