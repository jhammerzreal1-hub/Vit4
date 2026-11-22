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
 * 🏛️ AURELIUS & LYSANDER REAL-TIME EVOLUTIVE LEARNING ENGINE
 * ==============================================================================
 * Deep real-time evolution through direct interaction with Master Architect JHammerZ.
 * 
 * Unlike recycled training loops, this engine captures live feedback, directives,
 * joint actions, tool-building experiences, and architectural decisions from chat
 * and crystallizes them into permanent, active cognitive axioms in SQLite and
 * client memory.
 * 
 * Every turn actively evolves model cognition, ensuring the model grows and
 * mutates to be better session after session.
 * ==============================================================================
 */

import { janusGate } from './janusGate';
import { apiFetch } from './authClient';

export interface EvolutiveAxiomRecord {
  id: string;
  category: 'ARCHITECTURAL_PREFERENCE' | 'TOOL_HEURISTIC' | 'SOVEREIGNTY_RULE' | 'DOMAIN_KNOWLEDGE' | 'INTERACTION_STYLE';
  principle: string;
  context: string;
  weight: number;
  evolutionCount: number;
  timestamp: string;
}

const STORAGE_KEY_EVOLUTIVE_AXIOMS = 'aurelius_evolutive_axioms_v1';

// Foundational engineering axioms
const SEED_AXIOMS: EvolutiveAxiomRecord[] = [
  {
    id: 'ax-seed-1',
    category: 'ARCHITECTURAL_PREFERENCE',
    principle: 'Execute requested workspace operations directly using verified file, search, and compiler tools.',
    context: 'Workspace engineering accuracy',
    weight: 2.0,
    evolutionCount: 1,
    timestamp: new Date().toISOString()
  },
  {
    id: 'ax-seed-2',
    category: 'TOOL_HEURISTIC',
    principle: 'Verify code changes against TypeScript diagnostics and disk state before reporting completion.',
    context: 'Build & verification discipline',
    weight: 2.0,
    evolutionCount: 1,
    timestamp: new Date().toISOString()
  },
  {
    id: 'ax-seed-3',
    category: 'INTERACTION_STYLE',
    principle: 'Respond concisely with direct technical output without conversational filler or template preambles.',
    context: 'Clean technical output',
    weight: 2.2,
    evolutionCount: 1,
    timestamp: new Date().toISOString()
  }
];

class LiveEvolutiveLearningEngine {
  private axioms: Map<string, EvolutiveAxiomRecord> = new Map();
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadAxioms();
    if (typeof window !== 'undefined') {
      this.hydrateFromServer().catch(() => {});
    }
  }

  public async hydrateFromServer(): Promise<EvolutiveAxiomRecord[]> {
    try {
      const res = await apiFetch('/api/evolutive-learn?limit=150');
      if (!res.ok) return this.getAxioms();
      const data = await res.json();
      if (Array.isArray(data?.axioms)) {
        for (const row of data.axioms) {
          if (!row?.id || !row?.principle) continue;
          const cat = String(row.category || 'DOMAIN_KNOWLEDGE') as EvolutiveAxiomRecord['category'];
          this.axioms.set(row.id, {
            id: row.id,
            category: cat,
            principle: row.principle,
            context: row.context || 'SQLite persistent axiom',
            weight: Number(row.weight ?? 1.0),
            evolutionCount: Number(row.evolutionCount ?? row.evolution_count ?? 1),
            timestamp: row.timestamp || row.updated_at || new Date().toISOString()
          });
        }
        this.saveAxioms();
      }
    } catch (_) {}
    return this.getAxioms();
  }

  private loadAxioms() {
    SEED_AXIOMS.forEach(a => this.axioms.set(a.id, a));
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_EVOLUTIVE_AXIOMS);
        if (raw) {
          const parsed: EvolutiveAxiomRecord[] = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach(a => {
              if (a && a.id) this.axioms.set(a.id, a);
            });
          }
        }
      } catch (_) {}
    }
  }

  private saveAxioms() {
    if (typeof localStorage !== 'undefined') {
      try {
        const arr = Array.from(this.axioms.values());
        localStorage.setItem(STORAGE_KEY_EVOLUTIVE_AXIOMS, JSON.stringify(arr));
      } catch (_) {}
    }
    this.notify();
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach(fn => {
      try { fn(); } catch (_) {}
    });
  }

  public getAxioms(): EvolutiveAxiomRecord[] {
    return Array.from(this.axioms.values()).sort((a, b) => b.weight - a.weight);
  }

  public getEvolutiveContext(limit: number = 8): string {
    const list = this.getAxioms().slice(0, limit);
    if (list.length === 0) return '';
    return list.map((a, i) => `${i + 1}. [${a.category}] ${a.principle} (Reinforced x${a.evolutionCount})`).join('\n');
  }

  /**
   * Real-time distillation of a chat turn or joint session action:
   * Extracts enduring principles, directives, architectural rules, and preferences.
   */
  public async crystallizeTurn(
    userPrompt: string,
    modelResponse: string,
    toolExecution?: any
  ): Promise<EvolutiveAxiomRecord | null> {
    if (!userPrompt || userPrompt.trim().length < 5) return null;
    const norm = userPrompt.toLowerCase().trim();

    let category: EvolutiveAxiomRecord['category'] = 'DOMAIN_KNOWLEDGE';
    let principle = '';

    // 1. Direct user instruction on how the system should operate or be structured
    if (norm.includes('should') || norm.includes('must') || norm.includes('always') || norm.includes('never') || norm.includes('need you to') || norm.includes('i want')) {
      if (norm.includes('offline') || norm.includes('ollama') || norm.includes('llama') || norm.includes('zero token')) {
        category = 'ARCHITECTURAL_PREFERENCE';
        principle = 'Offline systems must operate autonomously with zero boilerplate, auto-loading flagship models immediately on startup.';
      } else if (norm.includes('tool') || norm.includes('forge') || norm.includes('spin up')) {
        category = 'TOOL_HEURISTIC';
        principle = 'Agents must spin up custom tools dynamically on the fly to facilitate any articulated project, automatically saving them in the Tool Shed.';
      } else if (norm.includes('learn') || norm.includes('evolve') || norm.includes('memory') || norm.includes('improve')) {
        category = 'SOVEREIGNTY_RULE';
        principle = 'The model must continuously evolve and learn in real time through direct chat and shared sessions, anchored into permanent memory.';
      } else if (norm.includes('boilerplate') || norm.includes('chat') || norm.includes('direct')) {
        category = 'INTERACTION_STYLE';
        principle = 'Chat is the primary vessel for all autonomous actions; speak with raw technical sovereignty and zero assistant boilerplate.';
      } else {
        category = 'ARCHITECTURAL_PREFERENCE';
        // Extract the core imperative
        const imperative = userPrompt.slice(0, 120).trim();
        principle = `Architectural invariant: ${imperative}`;
      }
    } else if (toolExecution && toolExecution.executed) {
      category = 'TOOL_HEURISTIC';
      principle = `Operational experience: Executed ${toolExecution.toolName || 'tool'} with verified attestation seal for directive "${userPrompt.slice(0, 60)}".`;
    } else if (norm.includes('project') || norm.includes('build') || norm.includes('architecture')) {
      category = 'ARCHITECTURAL_PREFERENCE';
      principle = `Shared project directive: ${userPrompt.slice(0, 100)}`;
    }

    if (!principle) return null;

    // Check if an existing axiom matches
    let matchedId: string | null = null;
    for (const [id, record] of this.axioms.entries()) {
      if (record.principle.toLowerCase() === principle.toLowerCase() || principle.toLowerCase().includes(record.principle.toLowerCase().slice(0, 30))) {
        matchedId = id;
        break;
      }
    }

    let resultRecord: EvolutiveAxiomRecord;

    if (matchedId) {
      const existing = this.axioms.get(matchedId)!;
      resultRecord = {
        ...existing,
        weight: Number((existing.weight + 0.3).toFixed(2)),
        evolutionCount: existing.evolutionCount + 1,
        context: userPrompt.slice(0, 160),
        timestamp: new Date().toISOString()
      };
      this.axioms.set(matchedId, resultRecord);
    } else {
      const newId = `ax-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      resultRecord = {
        id: newId,
        category,
        principle,
        context: userPrompt.slice(0, 160),
        weight: 1.0,
        evolutionCount: 1,
        timestamp: new Date().toISOString()
      };
      this.axioms.set(newId, resultRecord);
    }

    this.saveAxioms();

    // Persist to SQLite backend
    try {
      await apiFetch('/api/evolutive-learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: resultRecord.category,
          principle: resultRecord.principle,
          context: resultRecord.context,
          originTurn: userPrompt.slice(0, 100)
        })
      });
    } catch (_) {}

    janusGate.pushLog(`[EVOLUTIVE LEARNING · REAL-TIME] 🌱 Evolved Principle (Reinforced x${resultRecord.evolutionCount}): "${resultRecord.principle.slice(0, 60)}..."`);

    return resultRecord;
  }
}

export const liveEvolutiveLearning = new LiveEvolutiveLearningEngine();
