/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 */

import crypto from 'crypto';
import { ThinkingLevel, type GoogleGenAI } from '@google/genai';
import {
  canonicalizeToolName,
  computeCodeFingerprint,
  deduplicateToolsDeterministic,
  toCanonicalToolComparisonKey,
  type ToolClusterMergeSummary,
  type ToolDeduplicationResult,
  type ToolMergeStrategy
} from '../utils/toolShedDeduplicator';
import { executeDynamicToolCode, type DynamicToolRecord } from './autonomyEngine';

export interface ServerToolDeduplicatorDeps {
  getAiClient?: () => GoogleGenAI;
  hasGeminiKey?: () => boolean;
  saveToolsRegistry?: () => void;
}

export interface ServerDeduplicationOptions {
  useAiMerge?: boolean;
  dryRun?: boolean;
  extraToolsToIngest?: Partial<DynamicToolRecord>[];
}

function computeToolProofHash(id: string, name: string, code: string): string {
  return `0x${crypto
    .createHash('sha256')
    .update(`${id}:${name}:${code}`)
    .digest('hex')
    .slice(0, 32)}`;
}

function isValidJsToolBody(code: string): boolean {
  try {
    const AsyncFnCtor = Object.getPrototypeOf(async function () {}).constructor;
    new AsyncFnCtor(
      'args',
      'input',
      'crypto',
      'os',
      'path',
      'fs',
      'fetch',
      'Buffer',
      'autonomy',
      'URL',
      'URLSearchParams',
      'TextEncoder',
      'TextDecoder',
      'performance',
      code
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Uses Gemini 4 Hydrogen when available to fuse 2+ distinct JS tool implementations into one
 * cohesive async implementation, dry-running to verify syntax and runtime behavior before accepting.
 */
async function tryAiCapabilityFusion(
  canonicalName: string,
  combinedParameters: Record<string, any>,
  distinctCodes: Array<{ name: string; description: string; code: string }>,
  deps?: ServerToolDeduplicatorDeps
): Promise<string | null> {
  if (!deps?.hasGeminiKey?.() || !deps?.getAiClient || distinctCodes.length < 2) {
    return null;
  }

  try {
    const ai = deps.getAiClient();
    const variantsText = distinctCodes
      .map(
        (v, idx) =>
          `--- VARIANT ${idx + 1} (${v.name}) ---\nDescription: ${v.description}\nCode:\n${v.code}`
      )
      .join('\n\n');

    const prompt = `Combine these ${distinctCodes.length} duplicate tool implementations for "${canonicalName}" into ONE unified JavaScript async function body.
STRICT REQUIREMENTS:
1. Return ONLY raw executable JavaScript statements (no markdown fences, no TypeScript type annotations).
2. Available globals in scope: (args, input, crypto, os, path, fs, fetch, Buffer, autonomy, URL, URLSearchParams, TextEncoder, TextDecoder, performance).
3. Preserve 100% of the capabilities, calculations, network probes, and returned object properties from EVERY variant so no feature from any duplicate is lost.
4. Handle partial or missing parameters gracefully with safe defaults so one capability never crashes another.
5. Combined parameter keys: ${JSON.stringify(combinedParameters)}

${variantsText}`;

    const timeoutPromise = new Promise<null>(resolve => setTimeout(() => resolve(null), 6500));
    const genPromise = ai.models
      .generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'You are a deterministic JavaScript AST synthesizer. Output only valid executable JavaScript body code with zero markdown formatting.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
        }
      })
      .then(r => r.text || null)
      .catch(() => null);

    const rawText = await Promise.race([genPromise, timeoutPromise]);
    if (!rawText) return null;

    const cleaned = rawText
      .replace(/^```(?:javascript|js|ts|typescript)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    if (!cleaned || cleaned.length < 20 || !isValidJsToolBody(cleaned)) {
      return null;
    }

    const dry = await executeDynamicToolCode(
      cleaned,
      { input: 'Consolidation dry-run verification', __timeoutMs: 4000 },
      'tool-deduplicator'
    );
    if (dry && typeof dry === 'object' && dry.error) {
      return null;
    }

    return cleaned;
  } catch {
    return null;
  }
}

/**
 * Compares all tools in `registry`, combines any extra functions/parameters/descriptions/counts
 * from duplicates into a single canonical tool per cluster, deletes all duplicates, and persists.
 */
export async function deduplicateAndMergeToolsRegistry(
  registry: DynamicToolRecord[],
  options: ServerDeduplicationOptions = {},
  deps?: ServerToolDeduplicatorDeps
): Promise<ToolDeduplicationResult<DynamicToolRecord>> {
  const workingList: DynamicToolRecord[] = [...registry];

  // Optionally ingest client-cached tools that were never synced to server before deduplicating
  if (Array.isArray(options.extraToolsToIngest) && options.extraToolsToIngest.length > 0) {
    const existingIds = new Set(workingList.map(t => t.id));
    for (const raw of options.extraToolsToIngest) {
      if (!raw || !raw.name || !raw.code) continue;
      // Skip client-only dedicated `/api/sovereign/tools/*` wrappers if already represented
      const id = String(raw.id || `tool-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
      if (existingIds.has(id)) continue;
      existingIds.add(id);
      workingList.push({
        id,
        name: String(raw.name).trim(),
        description: String(raw.description || 'Dynamically forged autonomous tool.'),
        category: String(raw.category || 'AUTONOMOUS_SYNTHESIZED').toUpperCase(),
        authorAgent: String(raw.authorAgent || (raw as any).author || 'Sovereign Engineer'),
        parameters: raw.parameters && typeof raw.parameters === 'object' ? raw.parameters : {},
        code: String(raw.code),
        proofHash: String(raw.proofHash || computeToolProofHash(id, String(raw.name), String(raw.code))),
        createdAt: String(raw.createdAt || new Date().toISOString()),
        executionCount: Number(raw.executionCount ?? (raw as any).usageCount ?? 0) || 0
      });
    }
  }

  // Group original tools by canonical key / code fingerprint to allow optional AI fusion on multi-variant clusters
  const detResult = deduplicateToolsDeterministic<DynamicToolRecord>(workingList);

  if (options.useAiMerge && detResult.functionsCombinedCount > 0) {
    for (let i = 0; i < detResult.consolidatedTools.length; i++) {
      const mergedTool = detResult.consolidatedTools[i];
      const clusterMeta = detResult.clusters.find(c => c.canonicalId === mergedTool.id);
      if (!clusterMeta || clusterMeta.distinctVariantsMerged < 2) continue;

      const targetKey = toCanonicalToolComparisonKey(mergedTool.name, mergedTool.authorAgent);
      const matchingOriginals = workingList.filter(
        w =>
          w.id === mergedTool.id ||
          clusterMeta.deletedIds.includes(w.id) ||
          toCanonicalToolComparisonKey(w.name, w.authorAgent) === targetKey
      );

      const byFp = new Map<string, { name: string; description: string; code: string }>();
      for (const orig of matchingOriginals) {
        const fp = computeCodeFingerprint(orig.code);
        if (fp && !byFp.has(fp)) {
          byFp.set(fp, { name: orig.name, description: orig.description, code: orig.code });
        }
      }

      if (byFp.size >= 2) {
        const aiCode = await tryAiCapabilityFusion(
          mergedTool.name,
          mergedTool.parameters || {},
          Array.from(byFp.values()),
          deps
        );
        if (aiCode) {
          mergedTool.code = aiCode;
          clusterMeta.mergeStrategy = 'ai_ast_fusion' as ToolMergeStrategy;
        }
      }
    }
  }

  // Refresh cryptographic proof hashes on every consolidated tool
  for (const tool of detResult.consolidatedTools) {
    tool.name = canonicalizeToolName(tool.name, tool.authorAgent);
    tool.proofHash = computeToolProofHash(tool.id, tool.name, tool.code);
  }

  if (!options.dryRun) {
    registry.splice(0, registry.length, ...detResult.consolidatedTools);
    deps?.saveToolsRegistry?.();
  }

  return detResult;
}

/**
 * Upserts a newly forged tool into `registry` while automatically comparing against any existing
 * identical/suffixed/same-code tools, combining any extra functions into one canonical tool,
 * and deleting duplicates.
 */
export function upsertAndConsolidateToolSync(
  registry: DynamicToolRecord[],
  incoming: DynamicToolRecord,
  saveFn?: () => void
): {
  tool: DynamicToolRecord;
  mergedDuplicates: number;
  combinedExtraFunctions: boolean;
  clusterSummary?: ToolClusterMergeSummary;
} {
  const normalizedIncoming: DynamicToolRecord = {
    ...incoming,
    name: canonicalizeToolName(incoming.name, incoming.authorAgent)
  };

  const candidateList: DynamicToolRecord[] = [normalizedIncoming, ...registry];
  const result = deduplicateToolsDeterministic<DynamicToolRecord>(candidateList);

  for (const t of result.consolidatedTools) {
    t.name = canonicalizeToolName(t.name, t.authorAgent);
    t.proofHash = computeToolProofHash(t.id, t.name, t.code);
  }

  registry.splice(0, registry.length, ...result.consolidatedTools);
  saveFn?.();

  const incomingKey = toCanonicalToolComparisonKey(normalizedIncoming.name, normalizedIncoming.authorAgent);
  const incomingFp = computeCodeFingerprint(normalizedIncoming.code);
  const finalTool =
    registry.find(
      t =>
        t.id === normalizedIncoming.id ||
        toCanonicalToolComparisonKey(t.name, t.authorAgent) === incomingKey ||
        (incomingFp.length >= 24 && computeCodeFingerprint(t.code) === incomingFp)
    ) || result.consolidatedTools[0];

  const clusterSummary = result.clusters.find(c => c.canonicalId === finalTool.id);

  return {
    tool: finalTool,
    mergedDuplicates: result.duplicatesDeleted,
    combinedExtraFunctions: Boolean(clusterSummary && clusterSummary.distinctVariantsMerged > 1),
    clusterSummary
  };
}
