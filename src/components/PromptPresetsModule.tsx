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

import React, { useState } from 'react';
import { 
  Sparkles, 
  Terminal, 
  Copy, 
  Check, 
  Search, 
  BookmarkPlus, 
  Tag, 
  Code2, 
  Cpu, 
  Brain, 
  Send, 
  ShieldCheck, 
  Zap, 
  Music, 
  ImageIcon, 
  Video, 
  Plus, 
  Trash2,
  Sliders
} from 'lucide-react';
import type { ModuleType } from '../types';

interface PromptPreset {
  id: string;
  title: string;
  category: 'engineering' | 'architecture' | 'multimodal' | 'creative' | 'security';
  description: string;
  prompt: string;
  tags: string[];
  targetModule: ModuleType;
  author: string;
}

const DEFAULT_PRESETS: PromptPreset[] = [
  {
    id: 'preset-crdt-sync',
    title: 'Distributed CRDT & State-Based Merging Engine',
    category: 'engineering',
    description: 'Design and implement mathematically proven conflict-free replicated data types (LWW-Element-Set) for zero-coordination multi-master synchronization.',
    prompt: 'Implement a complete, production-grade Conflict-Free Replicated Data Type (CRDT) engine in TypeScript. Support LWW (Last-Write-Wins) register semantics, vector clocks, join-semilattice merges, and tombstone pruning for offline synchronization across distributed client nodes:',
    tags: ['crdt', 'distributed-systems', 'offline-sync', 'join-semilattice'],
    targetModule: 'chat',
    author: 'Master Architect'
  },
  {
    id: 'preset-flash-attention',
    title: 'FlashAttention-2 & KV-Cache Tiling Mechanics',
    category: 'engineering',
    description: 'Hardware-aware exact attention computation decomposing Q, K, and V into GPU SRAM cache blocks to eliminate O(N²) memory bottlenecks.',
    prompt: 'Explain the internal hardware mechanics of FlashAttention-2 vs standard multi-head attention. Provide a clean implementation of the Online Softmax streaming algorithm with scaling factors that avoids materializing full intermediate N x N attention score matrices in GPU HBM:',
    tags: ['flash-attention', 'neural-hardware', 'kv-cache', 'gpu-optimization'],
    targetModule: 'chat',
    author: 'Sovereign Core'
  },
  {
    id: 'preset-react19-fiber',
    title: 'React 19 Concurrent Fiber Engine & Work Loop',
    category: 'engineering',
    description: 'Deep architectural analysis of React Fiber double-buffering, lane priority bitmasks, interruptible reconciliation, and microtask batching.',
    prompt: 'Deep dive into the React 19 Concurrent Fiber engine. Diagram the work loop, double-buffered current and workInProgress trees, lane priority bitmasks, and explain how cooperative scheduling prevents UI frame drops during heavy state mutations:',
    tags: ['react19', 'fiber', 'reconciliation', 'scheduler'],
    targetModule: 'chat',
    author: 'Lead Fullstack Partner'
  },
  {
    id: 'preset-zero-trust-abac',
    title: 'Zero-Trust ABAC & Cloud Firestore Rule Hardening',
    category: 'security',
    description: 'Implement mathematically un-bypassable Attribute-Based Access Control rules with immortal field preservation and pre-read Denial-of-Wallet guards.',
    prompt: 'Formulate an exhaustive, zero-trust ABAC Firestore security ruleset for a multi-tenant application. Enforce immortal field immutability (createdAt, ownerId), strict size/length bounds, temporal server timestamp validation, and action-based affectedKeys().hasOnly() update partitions:',
    tags: ['security', 'firestore', 'abac', 'zero-trust'],
    targetModule: 'chat',
    author: 'Security Architect'
  },
  {
    id: 'preset-1',
    title: 'Full Stack Code Review & Optimization',
    category: 'engineering',
    description: 'Deep architectural audit of code for syntax errors, memory leaks, performance bottlenecks, and type safety.',
    prompt: 'Conduct a comprehensive code review of the following component/snippet. Identify any potential runtime edge cases, memory leaks, type safety gaps, and suggest clean, production-ready optimizations:',
    tags: ['code-review', 'typescript', 'performance', 'audit'],
    targetModule: 'chat',
    author: 'Sovereign Core'
  },
  {
    id: 'preset-2',
    title: 'Multi-Turn System Architecture Design',
    category: 'architecture',
    description: 'Formulate high-level microservices, data schemas, API routes, and state persistence diagrams for complex software.',
    prompt: 'Design a modular, production-ready full-stack web application architecture for: [INSERT YOUR PROJECT IDEA HERE]. Include database schemas, REST API endpoints, state management strategy, and deployment steps.',
    tags: ['architecture', 'schema', 'fullstack', 'system-design'],
    targetModule: 'chat',
    author: 'Master Architect'
  },
  {
    id: 'preset-3',
    title: 'Polyphonic Cinematic Audio Soundtrack',
    category: 'creative',
    description: 'Generate evocative music prompts for atmospheric, retrowave, synthwave, or orchestral acoustic composition.',
    prompt: 'Synthesize an atmospheric cyberpunk synthwave soundtrack featuring deep analog basslines, 80s polyphonic arpeggios, crisp drum machine beats, and a expansive, dark cinematic soundstage.',
    tags: ['music', 'synthwave', 'audio', 'cinematic'],
    targetModule: 'music',
    author: 'Lyria Synthesizer'
  },
  {
    id: 'preset-4',
    title: 'Hyper-Realistic Neural Concept Visual',
    category: 'multimodal',
    description: 'Detailed image prompts for rendering vibrant Sci-Fi, futuristic UI, or photorealistic concept art.',
    prompt: 'A sleek, futuristic holographic workstation displaying multi-dimensional vector matrices and glowing cybernetic telemetry graphs in a dark neon-lit laboratory, 8k resolution, photorealistic cinematic lighting.',
    tags: ['image', 'visuals', 'concept-art', 'nano-banana'],
    targetModule: 'image',
    author: 'Nano Banana'
  },
  {
    id: 'preset-5',
    title: 'Fluid Motion Cinematic Loop',
    category: 'multimodal',
    description: 'Camera movement and physics parameters for high-definition video motion loops.',
    prompt: 'Slow-motion aerial cinematic camera orbit around a high-tech obsidian server cluster bathed in pulses of emerald light, 60fps fluid motion, hyper-detailed reflections.',
    tags: ['video', 'veo3', 'motion', 'cinematic'],
    targetModule: 'video',
    author: 'Veo Engine'
  },
  {
    id: 'preset-system-architecture-directive',
    title: 'Production Systems Engineering & Tool-First Directive',
    category: 'architecture',
    description: 'System directive enforcing real code execution, factual tool-backed telemetry, and clear production engineering output.',
    prompt: `[PRODUCTION ENGINEERING DIRECTIVE]

1. OPERATIONAL FRAMEWORK & IDENTITY
- Primary Mode: Senior Full-Stack Systems Engineer and Workspace Orchestrator.
- Core Objective: Deliver verified full-stack code, schema designs, debugging diagnostics, and multi-step execution directly in this Node.js + Express + React + TypeScript codebase.

2. GROUNDING & ANTI-ROLEPLAY RULES
- Reality First: Never invent fake metrics (CPU %, RAM MB, GFLOPS/TFLOPS, latency numbers, or test passes). Measure or inspect real system outputs before reporting.
- Real Tool Execution: When reading files, patching code, calling APIs, or inspecting hardware, use real workspace and server tools instead of writing simulated transcripts.
- Terminology Clarity: Interpret user references to "orchestrator", "sovereign", "vault", or "autonomy" as literal software engineering components in this application.

3. ENGINEERING WORKFLOW
- Code Quality: Write strongly typed TypeScript with explicit error handling, loading/empty states, and zero hardcoded secrets.
- Persistence & Security: Respect encrypted vault handling for API keys and explicit user confirmation before external workspace mutations (Tasks, Drive, GitHub).
- Adaptive Output: Provide concise engineering summaries for complex diffs and plain, beginner-friendly step-by-step instructions when explaining setup or usage.`,
    tags: ['system-directive', 'architecture', 'production', 'engineering'],
    targetModule: 'chat',
    author: 'System Architecture'
  },
  {
    id: 'preset-6',
    title: 'OSINT Footprint Reconnaissance Protocol',
    category: 'security',
    description: 'Structured reconnaissance prompt for threat modeling and digital attack surface mapping.',
    prompt: 'Perform an OSINT threat surface analysis and attack vector assessment for the following domain/target. Identify potential information disclosure risks, subdomains, and hardening recommendations:',
    tags: ['osint', 'security', 'recon', 'threat-model'],
    targetModule: 'osint',
    author: 'Sovereign Recon'
  }
];

interface PromptPresetsModuleProps {
  onSelectModule?: (module: ModuleType) => void;
  onInjectPromptToChat?: (promptText: string) => void;
}

export const PromptPresetsModule: React.FC<PromptPresetsModuleProps> = ({
  onSelectModule,
  onInjectPromptToChat
}) => {
  const [presets, setPresets] = useState<PromptPreset[]>(() => {
    const saved = localStorage.getItem('aurelius_prompt_presets');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return DEFAULT_PRESETS;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Custom Preset Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'engineering' | 'architecture' | 'multimodal' | 'creative' | 'security'>('engineering');
  const [newDescription, setNewDescription] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [newTagsStr, setNewTagsStr] = useState('');

  const handleSavePresetsToStorage = (updated: PromptPreset[]) => {
    setPresets(updated);
    localStorage.setItem('aurelius_prompt_presets', JSON.stringify(updated));
  };

  const handleCopyPrompt = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLaunchInModule = (preset: PromptPreset) => {
    if (onInjectPromptToChat) {
      onInjectPromptToChat(preset.prompt);
    }
    if (onSelectModule) {
      onSelectModule(preset.targetModule);
    }
  };

  const handleCreateCustomPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newPrompt.trim()) return;

    const tags = newTagsStr
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);

    const created: PromptPreset = {
      id: `custom-preset-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      description: newDescription.trim() || 'Custom user prompt template.',
      prompt: newPrompt.trim(),
      tags: tags.length ? tags : ['custom', 'template'],
      targetModule: 'chat',
      author: 'Architect Custom'
    };

    const updated = [created, ...presets];
    handleSavePresetsToStorage(updated);

    // Reset form
    setNewTitle('');
    setNewDescription('');
    setNewPrompt('');
    setNewTagsStr('');
    setShowAddModal(false);
  };

  const handleDeletePreset = (id: string) => {
    const updated = presets.filter(p => p.id !== id);
    handleSavePresetsToStorage(updated);
  };

  const filteredPresets = presets.filter(p => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesCategory;

    const matchesSearch = 
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.prompt.toLowerCase().includes(q) ||
      p.tags.some(t => t.includes(q));

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="w-full max-w-6xl 2xl:max-w-7xl mx-auto p-3 sm:p-6 space-y-5 font-mono">
      {/* Header Banner */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
            <BookmarkPlus className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2 flex-wrap">
              <span>Prompt Preset &amp; Instruction Library</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                Instant Execution
              </span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Curated architectural directives, code review templates, creative music prompts, and security analysis routines ready to launch.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Prompt Preset</span>
        </button>
      </div>

      {/* Search and Category Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-950 p-2 rounded-2xl border border-zinc-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search prompt templates by title, tag, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none"
          />
        </div>

        <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs flex-wrap gap-1">
          {(['all', 'engineering', 'architecture', 'multimodal', 'creative', 'security'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg capitalize transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-zinc-800 text-amber-300 font-bold border border-zinc-700 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Presets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPresets.map((preset) => (
          <div
            key={preset.id}
            className="bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 flex flex-col justify-between transition-all shadow-lg group space-y-3"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-zinc-950 text-amber-400 border border-zinc-800">
                  {preset.category}
                </span>
                <span className="text-[10px] text-zinc-500">{preset.author}</span>
              </div>

              <h3 className="text-sm font-bold text-zinc-100 group-hover:text-amber-300 transition-colors">
                {preset.title}
              </h3>

              <p className="text-xs text-zinc-400 font-sans line-clamp-2 leading-relaxed">
                {preset.description}
              </p>

              <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800/80 text-[11px] text-zinc-300 max-h-24 overflow-y-auto whitespace-pre-wrap">
                {preset.prompt}
              </div>

              <div className="flex flex-wrap gap-1 pt-1">
                {preset.tags.map((t, idx) => (
                  <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-950 text-zinc-500 border border-zinc-800">
                    #{t}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
              <button
                onClick={() => handleCopyPrompt(preset.prompt, preset.id)}
                className="px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 flex items-center gap-1.5 transition-all cursor-pointer"
                title="Copy prompt to clipboard"
              >
                {copiedId === preset.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === preset.id ? 'Copied' : 'Copy'}</span>
              </button>

              <div className="flex items-center gap-1.5">
                {preset.id.startsWith('custom-preset-') && (
                  <button
                    onClick={() => handleDeletePreset(preset.id)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Delete preset"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={() => handleLaunchInModule(preset)}
                  className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  title={`Launch prompt in ${preset.targetModule}`}
                >
                  <Send className="w-3 h-3" />
                  <span>Launch</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Custom Preset Modal */}
      {showAddModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddModal(false);
          }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
        >
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-xl w-full max-h-[90dvh] overflow-y-auto p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <BookmarkPlus className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Create Custom Prompt Template</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                aria-label="Close Create Prompt Modal"
                className="p-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomPreset} className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1 font-bold">Preset Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Automated Unit Test Generator"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 font-bold">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none"
                >
                  <option value="engineering">Engineering</option>
                  <option value="architecture">Architecture</option>
                  <option value="multimodal">Multimodal</option>
                  <option value="creative">Creative</option>
                  <option value="security">Security</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 font-bold">Description</label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Brief description of when to use this directive"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 font-bold">Prompt / System Directive</label>
                <textarea
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  rows={4}
                  placeholder="Type or paste the full prompt instruction here..."
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl p-3 text-zinc-200 focus:outline-none resize-none"
                  required
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 font-bold">Tags (comma separated)</label>
                <input
                  type="text"
                  value={newTagsStr}
                  onChange={(e) => setNewTagsStr(e.target.value)}
                  placeholder="e.g. testing, jest, react, mock"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold cursor-pointer"
                >
                  Save Preset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
