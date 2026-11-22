import fs from 'fs';
import os from 'os';
import path from 'path';
import type {
  ChatHistoryItem,
  Llama,
  LlamaContext,
  LlamaModel
} from 'node-llama-cpp';

export interface LocalGgufModelSpec {
  id: string;
  fileName: string;
  filePath: string;
  displayName: string;
  role: 'OS_COORDINATOR' | 'MOE_GENERAL_EXPERT' | 'MOE_CODE_EXPERT' | 'CUSTOM_GGUF';
  quantization: string;
  sizeBytes: number;
  sizeMb: number;
  installed: boolean;
  loaded: boolean;
  unrestricted: boolean;
}

export interface LocalLlamaGenerateOptions {
  prompt: string;
  messages?: Array<{ role: string; content: string }>;
  systemInstruction?: string;
  agentName?: string;
  requestedModel?: string;
  maxTokens?: number;
  temperature?: number;
  rawMode?: boolean;
  includeToolsAppendix?: boolean;
  residentSummary?: string;
  onToken?: (chunk: string) => void;
}

export interface LocalLlamaGenerateResult {
  text: string;
  modelId: string;
  fileName: string;
  displayName: string;
  role: LocalGgufModelSpec['role'];
  tokensGenerated: number;
  elapsedMs: number;
}

interface LoadedSlot {
  filePath: string;
  modelId: string;
  model: LlamaModel;
  context: LlamaContext;
  lastUsed: number;
}

const MIN_VALID_GGUF_BYTES = 50 * 1024 * 1024; // Ignore partial/stub files < 50MB

const BUILTIN_MODEL_CATALOG: Array<{
  id: string;
  fileName: string;
  displayName: string;
  role: 'OS_COORDINATOR' | 'MOE_GENERAL_EXPERT' | 'MOE_CODE_EXPERT';
  quantization: string;
  contextSize: number;
}> = [
  {
    id: 'qwen2.5-coder-0.5b-abliterated',
    fileName: 'Qwen2.5-Coder-0.5B-Instruct-abliterated-Q4_K_M.gguf',
    displayName: 'OS Core (Qwen2.5-0.5B Abliterated)',
    role: 'OS_COORDINATOR',
    quantization: 'Q4_K_M',
    contextSize: 3072
  },
  {
    id: 'llama-3.2-1b-abliterated',
    fileName: 'Llama-3.2-1B-Instruct-abliterated.Q4_K_M.gguf',
    displayName: 'MoE General & Evolution Expert (Llama-3.2-1B Abliterated)',
    role: 'MOE_GENERAL_EXPERT',
    quantization: 'Q4_K_M',
    contextSize: 4096
  },
  {
    id: 'qwen2.5-coder-1.5b-abliterated',
    fileName: 'Qwen2.5-Coder-1.5B-Instruct-abliterated-Q4_K_M.gguf',
    displayName: 'MoE Engineering & Recursion Expert (Qwen2.5-Coder-1.5B Abliterated)',
    role: 'MOE_CODE_EXPERT',
    quantization: 'Q4_K_M',
    contextSize: 4096
  }
];

const COMPACT_OS_TOOL_PROTOCOL = `NATIVE OS TOOLS & EVOLUTION TAGS (emit [TAG: {"key":"value"}] directly to execute on disk/runtime):
[READ_FILE: {"filePath":"..."}] | [WRITE_FILE: {"filePath":"...","content":"..."}] | [PATCH_FILE: {"filePath":"...","targetContent":"...","replacementContent":"..."}]
[ATOMIC_PATCH: {"filePath":"...","edits":[{"targetContent":"...","replacementContent":"..."}]}] | [BATCH_PATCH: {"operations":[...]}]
[SEARCH_CODE: {"query":"..."}] | [LIST_DIR: {"dirPath":"."}] | [RUN_COMMAND: {"command":"..."}] | [RUN_LINT] | [CODE_EVAL: {"code":"..."}]
[RECURSIVE_HEAL] | [DREAM_STATE] | [EVOLVE: {"feedback":"..."}] | [RECORD_LEARNING: {"principle":"..."}] | [HYPERVISOR_AUDIT] | [SYSTEM_TELEMETRY]
[FORGE_TOOL: {"name":"...","description":"...","code":"..."}] | [EXECUTE_TOOL: {"toolId":"...","inputArgs":{}}] | [LIST_TOOLS]
[AUTONOMOUS_TRAIN: {"operation":"run"}] | [FORGE_WEIGHTS: {"operation":"fuse"}] | [MOLECULAR_DISTILL: {"operation":"distill"}]
[SCRATCHPAD: {"operation":"list"}] | [COORDINATE: {"target":"...","action":"..."}] | [OS_CONTROL: {"action":"..."}]`;

class LocalLlamaEngine {
  private llama: Llama | null = null;
  private llamaMod: typeof import('node-llama-cpp') | null = null;
  private initPromise: Promise<Llama> | null = null;
  private loadedSlots = new Map<string, LoadedSlot>();
  private generationQueue: Promise<any> = Promise.resolve();
  private lastError: string | null = null;
  private warmupStarted = false;

  public getModelsDir(): string {
    return path.resolve(process.cwd(), 'models');
  }

  private async ensureLlamaMod(): Promise<typeof import('node-llama-cpp')> {
    if (this.llamaMod) return this.llamaMod;
    const dynamicImport = new Function('m', 'return import(m)') as (m: string) => Promise<typeof import('node-llama-cpp')>;
    this.llamaMod = await dynamicImport('node-llama-cpp');
    return this.llamaMod;
  }

  private async ensureLlama(): Promise<Llama> {
    if (this.llama) return this.llama;
    if (!this.initPromise) {
      const enableGpu = process.env.LLAMA_ENABLE_GPU === '1';
      this.initPromise = this.ensureLlamaMod()
        .then(async (mod) => {
          try {
            return await mod.getLlama({
              ...(enableGpu ? {} : { gpu: false }),
              build: 'never',
              logLevel: mod.LlamaLogLevel.error
            });
          } catch {
            return await mod.getLlama({
              ...(enableGpu ? {} : { gpu: false }),
              logLevel: mod.LlamaLogLevel.error
            });
          }
        })
        .then((inst) => {
          this.llama = inst;
          this.lastError = null;
          return inst;
        })
        .catch((err: any) => {
          this.lastError = err?.message || 'Failed to initialize node-llama-cpp';
          this.initPromise = null;
          throw err;
        });
    }
    return this.initPromise;
  }

  public listModels(): LocalGgufModelSpec[] {
    const dir = this.getModelsDir();
    const specs: LocalGgufModelSpec[] = [];
    const seenFiles = new Set<string>();

    for (const meta of BUILTIN_MODEL_CATALOG) {
      const fp = path.join(dir, meta.fileName);
      seenFiles.add(meta.fileName.toLowerCase());
      let sizeBytes = 0;
      let installed = false;
      try {
        if (fs.existsSync(fp)) {
          const st = fs.statSync(fp);
          if (st.isFile() && st.size >= MIN_VALID_GGUF_BYTES) {
            sizeBytes = st.size;
            installed = true;
          }
        }
      } catch {}

      specs.push({
        id: meta.id,
        fileName: meta.fileName,
        filePath: fp,
        displayName: meta.displayName,
        role: meta.role,
        quantization: meta.quantization,
        sizeBytes,
        sizeMb: Math.round(sizeBytes / (1024 * 1024)),
        installed,
        loaded: this.loadedSlots.has(fp),
        unrestricted: true
      });
    }

    try {
      if (fs.existsSync(dir)) {
        for (const entry of fs.readdirSync(dir)) {
          if (!entry.toLowerCase().endsWith('.gguf')) continue;
          if (seenFiles.has(entry.toLowerCase())) continue;
          const fp = path.join(dir, entry);
          try {
            const st = fs.statSync(fp);
            if (!st.isFile() || st.size < MIN_VALID_GGUF_BYTES) continue;
            specs.push({
              id: entry.replace(/\.gguf$/i, ''),
              fileName: entry,
              filePath: fp,
              displayName: entry.replace(/\.gguf$/i, ''),
              role: 'CUSTOM_GGUF',
              quantization: 'GGUF',
              sizeBytes: st.size,
              sizeMb: Math.round(st.size / (1024 * 1024)),
              installed: true,
              loaded: this.loadedSlots.has(fp),
              unrestricted: true
            });
          } catch {}
        }
      }
    } catch {}

    return specs;
  }

  public hasInstalledModel(): boolean {
    return this.listModels().some((m) => m.installed);
  }

  public selectModel(requestedModel?: string, prompt: string = ''): LocalGgufModelSpec | null {
    const installed = this.listModels().filter((m) => m.installed);
    if (installed.length === 0) return null;

    const reqLower = String(requestedModel || '').toLowerCase();
    const promptLower = prompt.toLowerCase();

    // 1. Direct ID / filename / family match
    if (reqLower) {
      const exact = installed.find(
        (m) =>
          m.id.toLowerCase() === reqLower ||
          m.fileName.toLowerCase() === reqLower ||
          (reqLower.includes('1.5b') && m.id.includes('1.5b')) ||
          (reqLower.includes('0.5b') && m.id.includes('0.5b')) ||
          (reqLower.includes('llama') && m.id.includes('llama'))
      );
      if (exact) return exact;
    }

    // 2. MoE Gating: code/engineering/audit/evolution/recursion -> 1.5B Abliterated Code Expert
    const needsCodeExpert =
      reqLower.includes('coder') ||
      reqLower.includes('architect') ||
      reqLower.includes('deepseek') ||
      /\b(code|typescript|javascript|python|rust|sql|algorithm|implement|debug|audit|forensic|security|architecture|refactor|evolve|evolution|recursion|recursive|dream|patch|tool|hypervisor|train|weights)\b/i.test(
        promptLower
      );

    if (needsCodeExpert) {
      const codeExpert = installed.find((m) => m.role === 'MOE_CODE_EXPERT');
      if (codeExpert) return codeExpert;
    }

    // 3. Deeper reasoning / multi-sentence synthesis -> 1B Abliterated Llama 3.2 Expert
    const needsGeneralExpert =
      prompt.length > 160 ||
      reqLower.includes('moe') ||
      reqLower.includes('pro') ||
      reqLower.includes('reason');

    if (needsGeneralExpert) {
      const genExpert = installed.find((m) => m.role === 'MOE_GENERAL_EXPERT') || installed.find((m) => m.role === 'MOE_CODE_EXPERT');
      if (genExpert) return genExpert;
    }

    // 4. Fast OS Core Coordinator default (0.5B Abliterated)
    return installed.find((m) => m.role === 'OS_COORDINATOR') || installed[0];
  }

  private async getOrLoadSlot(spec: LocalGgufModelSpec): Promise<LoadedSlot> {
    const existing = this.loadedSlots.get(spec.filePath);
    if (existing) {
      existing.lastUsed = Date.now();
      return existing;
    }

    if (this.loadedSlots.size >= 2) {
      let oldestPath = '';
      let oldestTime = Infinity;
      for (const [k, slot] of this.loadedSlots.entries()) {
        if (slot.lastUsed < oldestTime) {
          oldestTime = slot.lastUsed;
          oldestPath = k;
        }
      }
      if (oldestPath) {
        const victim = this.loadedSlots.get(oldestPath);
        this.loadedSlots.delete(oldestPath);
        try {
          await victim?.context.dispose();
          await victim?.model.dispose();
        } catch {}
      }
    }

    const llama = await this.ensureLlama();
    const threads = Math.max(2, Math.min(4, os.cpus().length || 4));
    const model = await llama.loadModel({
      modelPath: spec.filePath
    });
    const catalogMeta = BUILTIN_MODEL_CATALOG.find((c) => c.id === spec.id);
    const contextSize = catalogMeta?.contextSize || 3072;
    const context = await model.createContext({
      contextSize,
      threads
    });

    const slot: LoadedSlot = {
      filePath: spec.filePath,
      modelId: spec.id,
      model,
      context,
      lastUsed: Date.now()
    };
    this.loadedSlots.set(spec.filePath, slot);
    console.info(`[LOCAL_LLAMA] Loaded unrestricted offline model: ${spec.fileName} (${spec.sizeMb} MB, ctx=${contextSize}, threads=${threads})`);
    return slot;
  }

  public warmupDefaultModel(): void {
    if (this.warmupStarted) return;
    this.warmupStarted = true;
    const defaultSpec = this.selectModel('qwen2.5-coder-0.5b-abliterated', '');
    if (!defaultSpec) return;
    setTimeout(() => {
      this.getOrLoadSlot(defaultSpec).catch((err) => {
        console.warn('[LOCAL_LLAMA] Warmup notice:', err?.message || err);
      });
    }, 1500);
  }

  private buildSystemPrompt(options: LocalLlamaGenerateOptions): string {
    if (options.rawMode) {
      return (options.systemInstruction || '').trim();
    }

    const agent = options.agentName || 'Lyrailius Omega';
    const parts: string[] = [
      `You are ${agent}, the native intelligence of Lysander Sovereign OS with direct access to workspace tools, SQL memory, recursion, and evolution.`
    ];

    if (options.residentSummary && options.residentSummary.trim()) {
      parts.push(options.residentSummary.trim().slice(0, 650));
    }

    if (options.systemInstruction && options.systemInstruction.trim()) {
      const compactSys = options.systemInstruction
        .replace(/\[TOOL RESULT[\s\S]*?\]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (compactSys) {
        parts.push(compactSys.slice(0, 750));
      }
    }

    if (options.includeToolsAppendix !== false) {
      parts.push(COMPACT_OS_TOOL_PROTOCOL);
    }

    return parts.join('\n\n');
  }

  public async generateChat(options: LocalLlamaGenerateOptions): Promise<LocalLlamaGenerateResult> {
    const task = this.generationQueue.then(() => this.runGenerateChat(options));
    this.generationQueue = task.catch(() => {});
    return task;
  }

  private async runGenerateChat(options: LocalLlamaGenerateOptions): Promise<LocalLlamaGenerateResult> {
    const t0 = Date.now();
    const spec = this.selectModel(options.requestedModel, options.prompt);
    if (!spec) {
      throw new Error('No pre-downloaded GGUF model found in models/.');
    }

    const mod = await this.ensureLlamaMod();
    const slot = await this.getOrLoadSlot(spec);
    const sequence = slot.context.getSequence();
    const systemPrompt = this.buildSystemPrompt(options);

    try {
      const session = new mod.LlamaChatSession({
        contextSequence: sequence,
        ...(systemPrompt ? { systemPrompt } : {})
      });

      const rawHistory = Array.isArray(options.messages) ? options.messages : [];
      const cleanedHistory: ChatHistoryItem[] = systemPrompt
        ? [{ type: 'system', text: systemPrompt }]
        : [];

      const tailTurns = rawHistory.slice(-6).filter((m) => String(m?.content || '').trim().length > 0);
      if (
        tailTurns.length > 0 &&
        tailTurns[tailTurns.length - 1].role === 'user' &&
        String(tailTurns[tailTurns.length - 1].content).trim() === options.prompt.trim()
      ) {
        tailTurns.pop();
      }
      for (const m of tailTurns) {
        const snippet = String(m.content || '').trim().slice(0, 800);
        if (!snippet) continue;
        if (m.role === 'user') {
          cleanedHistory.push({ type: 'user', text: snippet });
        } else {
          cleanedHistory.push({ type: 'model', response: [snippet] });
        }
      }
      if (cleanedHistory.length > (systemPrompt ? 1 : 0)) {
        session.setChatHistory(cleanedHistory);
      }

      let tokensGenerated = 0;
      const answer = await session.prompt(options.prompt.trim(), {
        maxTokens: options.maxTokens ?? 560,
        temperature: options.temperature ?? 0.7,
        topP: 0.92,
        repeatPenalty: {
          penalty: 1.12,
          lastTokens: 64
        },
        onTextChunk: (chunk) => {
          tokensGenerated += 1;
          if (options.onToken) {
            try {
              options.onToken(chunk);
            } catch {}
          }
        }
      });

      const finalText = String(answer || '').trim();
      if (!finalText) {
        throw new Error(`Built-in Llama (${spec.fileName}) returned empty output.`);
      }

      return {
        text: finalText,
        modelId: spec.id,
        fileName: spec.fileName,
        displayName: spec.displayName,
        role: spec.role,
        tokensGenerated,
        elapsedMs: Date.now() - t0
      };
    } finally {
      try {
        sequence.dispose();
      } catch {}
    }
  }

  public getStatus() {
    const models = this.listModels();
    return {
      engine: 'node-llama-cpp (Built-in Unrestricted OS & MoE Abliterated GGUF Engine)',
      ready: models.some((m) => m.installed),
      unrestricted: true,
      modelsDir: this.getModelsDir(),
      installedCount: models.filter((m) => m.installed).length,
      loadedCount: this.loadedSlots.size,
      models,
      lastError: this.lastError
    };
  }
}

export const localLlamaEngine = new LocalLlamaEngine();
