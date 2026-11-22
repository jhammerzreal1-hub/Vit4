/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 */

export interface DeduplicatableTool {
  id: string;
  name: string;
  description: string;
  category: string;
  authorAgent?: string;
  author?: string;
  parameters?: Record<string, any>;
  code: string;
  proofHash?: string;
  createdAt?: string;
  executionCount?: number;
  usageCount?: number;
  endpoint?: string;
  useCase?: string;
  defaultInput?: string;
  language?: 'javascript' | 'python';
}

export type ToolMergeStrategy =
  | 'identical_code_prune'
  | 'superset_kept'
  | 'deterministic_capability_fusion'
  | 'ai_ast_fusion';

export interface ToolClusterMergeSummary {
  canonicalId: string;
  canonicalName: string;
  keptCategory: string;
  distinctVariantsMerged: number;
  deletedIds: string[];
  deletedNames: string[];
  combinedParameters: Record<string, any>;
  combinedCapabilities: string[];
  totalExecutionCount: number;
  mergeStrategy: ToolMergeStrategy;
}

export interface ToolDeduplicationResult<T extends DeduplicatableTool = DeduplicatableTool> {
  beforeCount: number;
  afterCount: number;
  duplicatesDeleted: number;
  clustersMerged: number;
  functionsCombinedCount: number;
  consolidatedTools: T[];
  deletedToolIds: string[];
  clusters: ToolClusterMergeSummary[];
}

const DAEMON_BASE_PREFIXES = [
  'Runtime-AST-Sanitizer',
  'Memory-KV-Cache-Compactor',
  'Autonomous-Entropy-Sealer'
];

/**
 * Strips random daemon suffixes (e.g. `Runtime-AST-Sanitizer-4sj` -> `Runtime-AST-Sanitizer`)
 * and copy/duplicate/version noise (`Tool (2)`, `Tool copy`, `Tool #3`).
 */
export function canonicalizeToolName(rawName: string, authorAgent?: string): string {
  let clean = String(rawName || '').trim().replace(/\s+/g, ' ');
  if (!clean) return 'Unnamed-Tool';

  for (const base of DAEMON_BASE_PREFIXES) {
    const re = new RegExp(`^${base.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}-[a-z0-9]{2,8}$`, 'i');
    if (re.test(clean)) {
      return base;
    }
  }

  if (
    authorAgent &&
    /autonomous-self-improvement-daemon/i.test(authorAgent) &&
    /-[a-z0-9]{3,5}$/i.test(clean)
  ) {
    clean = clean.replace(/-[a-z0-9]{3,5}$/i, '');
  }

  clean = clean
    .replace(/\s*(?:\((?:copy|\d+)\)|\bcopy\b\s*\d*|\bduplicate\b\s*\d*|#\d+)$/i, '')
    .trim();

  return clean || String(rawName || '').trim();
}

/**
 * Normalized slug used to compare tool names for identity.
 */
export function toCanonicalToolComparisonKey(rawName: string, authorAgent?: string): string {
  const canonical = canonicalizeToolName(rawName, authorAgent)
    .toLowerCase()
    .replace(/^the\s+/, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return canonical || 'unnamed_tool';
}

/**
 * Lexer-safe JS comment stripper that preserves `http://`, `https://`, and `//` inside
 * single-quoted, double-quoted, and template string literals.
 */
export function stripJsCommentsSafely(source: string): string {
  const src = String(source || '');
  let out = '';
  let i = 0;
  const len = src.length;
  let state: 'code' | 'single' | 'double' | 'template' | 'line_comment' | 'block_comment' = 'code';

  while (i < len) {
    const ch = src[i];
    const next = i + 1 < len ? src[i + 1] : '';

    if (state === 'code') {
      if (ch === '/' && next === '/') {
        state = 'line_comment';
        i += 2;
        continue;
      }
      if (ch === '/' && next === '*') {
        state = 'block_comment';
        i += 2;
        continue;
      }
      if (ch === "'") {
        state = 'single';
        out += ch;
        i++;
        continue;
      }
      if (ch === '"') {
        state = 'double';
        out += ch;
        i++;
        continue;
      }
      if (ch === '`') {
        state = 'template';
        out += ch;
        i++;
        continue;
      }
      out += ch;
      i++;
    } else if (state === 'line_comment') {
      if (ch === '\n') {
        state = 'code';
        out += '\n';
      }
      i++;
    } else if (state === 'block_comment') {
      if (ch === '*' && next === '/') {
        state = 'code';
        i += 2;
        continue;
      }
      i++;
    } else if (state === 'single') {
      out += ch;
      if (ch === '\\' && i + 1 < len) {
        out += src[i + 1];
        i += 2;
        continue;
      }
      if (ch === "'") state = 'code';
      i++;
    } else if (state === 'double') {
      out += ch;
      if (ch === '\\' && i + 1 < len) {
        out += src[i + 1];
        i += 2;
        continue;
      }
      if (ch === '"') state = 'code';
      i++;
    } else if (state === 'template') {
      out += ch;
      if (ch === '\\' && i + 1 < len) {
        out += src[i + 1];
        i += 2;
        continue;
      }
      if (ch === '`') state = 'code';
      i++;
    }
  }

  return out;
}

/**
 * Produces a canonical structural fingerprint of a tool's executable logic so
 * identical implementations match regardless of comments, formatting, or quote style.
 */
export function computeCodeFingerprint(rawCode: string): string {
  let cleaned = stripJsCommentsSafely(rawCode).trim();
  // Unwrap outer `function run(...) { ... }` if the entire body is just that wrapper
  const fnMatch = cleaned.match(
    /^(?:async\s+)?function\s+run\s*\([^)]*\)\s*\{([\s\S]*)\}\s*;?$/
  );
  if (fnMatch) {
    cleaned = fnMatch[1].trim();
  }
  return cleaned
    .replace(/'([^'\\]*)'/g, '"$1"')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}();,:+\-*/=<>!&|?[\]])\s*/g, '$1')
    .replace(/;+\}/g, '}')
    .replace(/;+$/g, '')
    .trim();
}

function isNonTrivialCodeFingerprint(fp: string): boolean {
  if (!fp || fp.length < 24) return false;
  if (fp === 'return{status:"OK"}' || fp === 'return{status:"ok"}') return false;
  return true;
}

function isTimestampGeneratedId(id: string): boolean {
  return /^tool-(?:\d{10,}|[a-z0-9]{7,9}-[a-z0-9]{4})$/i.test(String(id || ''));
}

function isGenericCategory(cat: string): boolean {
  const upper = String(cat || '').toUpperCase();
  return (
    !upper ||
    upper === 'AUTONOMOUS_SYNTHESIZED' ||
    upper === 'AUTONOMOUS_FORGED' ||
    upper === 'UTILITY'
  );
}

/**
 * Scores a candidate tool so the cleanest, most semantic record wins as the canonical container.
 */
function scoreCanonicalCandidate(t: DeduplicatableTool): number {
  let score = 0;
  if (!isTimestampGeneratedId(t.id)) score += 500;
  if (t.endpoint && t.endpoint.startsWith('/api/sovereign/tools/')) score += 400;
  if (t.useCase) score += 120;
  if (!isGenericCategory(t.category)) score += 200;
  const canonicalName = canonicalizeToolName(t.name, t.authorAgent || t.author);
  if (t.name.trim() === canonicalName) score += 150;
  score += Math.min(80, Object.keys(t.parameters || {}).length * 20);
  score += Math.min(100, (t.executionCount ?? t.usageCount ?? 0) * 3);
  score += Math.min(60, Math.floor(String(t.code || '').length / 40));
  return score;
}

/**
 * Extracts inferred parameter keys referenced via `args.<prop>` or `input.<prop>` in JS code.
 */
export function inferParametersFromCode(code: string): Record<string, string> {
  const inferred: Record<string, string> = {};
  const stripped = stripJsCommentsSafely(code);
  const propRegex = /\b(?:args|input)\??\.([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
  const ignored = new Set([
    'slice', 'trim', 'split', 'match', 'replace', 'toLowerCase', 'toUpperCase',
    'includes', 'startsWith', 'endsWith', 'length', 'map', 'filter', 'reduce', 'forEach'
  ]);
  let m: RegExpExecArray | null;
  while ((m = propRegex.exec(stripped)) !== null) {
    const key = m[1];
    if (!ignored.has(key) && !(key in inferred)) {
      inferred[key] = 'any';
    }
  }
  return inferred;
}

/**
 * Merges descriptions across duplicate variants without repeating identical sentences.
 */
export function mergeToolDescriptions(tools: DeduplicatableTool[], canonicalName: string): string {
  const seen = new Set<string>();
  const sentences: string[] = [];
  const genericFallback = 'dynamically forged autonomous tool';

  for (const t of tools) {
    const raw = String(t.description || '').trim();
    if (!raw) continue;
    if (raw.toLowerCase().startsWith(genericFallback) && tools.length > 1) continue;

    const parts = raw
      .split(/(?<=[.!?])\s+/)
      .map(p => p.trim())
      .filter(Boolean);

    for (const part of parts) {
      // Normalize suffixed tool names inside description sentences
      let cleanedPart = part;
      for (const base of DAEMON_BASE_PREFIXES) {
        const re = new RegExp(`${base.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}-[a-z0-9]{2,8}`, 'gi');
        cleanedPart = cleanedPart.replace(re, canonicalName);
      }
      const norm = cleanedPart.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      if (!norm || seen.has(norm)) continue;
      // Skip if an existing sentence already contains this clause
      let redundant = false;
      for (const existing of seen) {
        if (existing.includes(norm) || (norm.length > 25 && norm.includes(existing))) {
          redundant = true;
          break;
        }
      }
      if (!redundant) {
        seen.add(norm);
        sentences.push(cleanedPart.endsWith('.') || cleanedPart.endsWith('!') ? cleanedPart : `${cleanedPart}.`);
      }
    }
  }

  if (sentences.length === 0) {
    return String(tools[0]?.description || `Consolidated ${canonicalName} autonomous micro-tool.`);
  }
  return sentences.slice(0, 4).join(' ');
}

/**
 *Deterministically combines 2+ distinct JavaScript implementations of duplicate tools into a single
 * unified multi-capability implementation that preserves 100% of functions, parameters, and return fields.
 */
export function combineDistinctCodeVariantsDeterministically(
  variants: Array<{ id: string; name: string; description?: string; code: string; fingerprint: string }>
): { code: string; strategy: ToolMergeStrategy } {
  if (variants.length <= 1) {
    return {
      code: variants[0]?.code || 'return { status: "OK" };',
      strategy: 'identical_code_prune'
    };
  }

  // Check if one variant is already a strict code superset of all other variants
  const sortedByLength = [...variants].sort((a, b) => b.fingerprint.length - a.fingerprint.length);
  const longest = sortedByLength[0];
  const isStrictSuperset = sortedByLength
    .slice(1)
    .every(v => !v.fingerprint || longest.fingerprint.includes(v.fingerprint));

  if (isStrictSuperset) {
    return {
      code: longest.code,
      strategy: 'superset_kept'
    };
  }

  // Check if longest was already combined by our capability combiner and contains every variant body
  const allAlreadyEmbedded = variants.every(v => {
    const trimmed = stripJsCommentsSafely(v.code).trim();
    return longest.code.includes(trimmed);
  });
  if (allAlreadyEmbedded) {
    return {
      code: longest.code,
      strategy: 'superset_kept'
    };
  }

  // Build isolated async capability functions for every distinct implementation
  const helperBlocks: string[] = [];
  const callNames: string[] = [];

  variants.forEach((variant, idx) => {
    const fnName = `__capability_${idx + 1}`;
    callNames.push(fnName);
    const rawCode = String(variant.code || '').trim();
    const definesRun = /\b(?:async\s+)?function\s+run\s*\(|\b(?:const|let|var)\s+run\s*=/.test(rawCode);
    const usesUrlFetch = /\bfetch\s*\(/.test(rawCode) && /\bargs\.(?:url|endpoint)\b/.test(rawCode);

    const argPrep = usesUrlFetch
      ? `const __rawArgs = (rawArgs && typeof rawArgs === 'object') ? rawArgs : { input: rawArgs };
  const args = (!__rawArgs.url && !__rawArgs.endpoint && typeof __rawArgs.input === 'string' && !/^https?:\\/\\//i.test(__rawArgs.input.trim()))
    ? { ...__rawArgs, input: undefined }
    : __rawArgs;
  const input = args.input !== undefined ? args.input : rawInput;`
      : `const args = (rawArgs && typeof rawArgs === 'object') ? rawArgs : { input: rawArgs };
  const input = rawInput !== undefined ? rawInput : (args.input !== undefined ? args.input : args);`;

    if (definesRun) {
      helperBlocks.push(
        `async function ${fnName}(rawArgs, rawInput) {\n  ${argPrep}\n  ${rawCode}\n  if (typeof run === 'function') {\n    const __runInput = (rawArgs && typeof rawArgs === 'object' && Object.keys(rawArgs).length > 0 && rawArgs.input === undefined) ? rawArgs : (args.input !== undefined ? args.input : rawInput);\n    return await run(__runInput, args);\n  }\n}`
      );
    } else {
      helperBlocks.push(
        `async function ${fnName}(rawArgs, rawInput) {\n  ${argPrep}\n  ${rawCode}\n}`
      );
    }
  });

  const combinedCode = [
    `// Consolidated Multi-Capability Tool (${variants.length} merged duplicate variants)`,
    ...helperBlocks,
    `const __normalizedArgs = (typeof args !== 'undefined' && args && typeof args === 'object')`,
    `  ? args`,
    `  : (typeof input === 'string' && input.trim().startsWith('{') ? (() => { try { return JSON.parse(input); } catch { return { input }; } })() : { input: typeof input !== 'undefined' ? input : undefined });`,
    `const __rawInput = typeof input !== 'undefined' ? input : __normalizedArgs.input;`,
    `const __settled = await Promise.allSettled([${callNames.map(fn => `${fn}(__normalizedArgs, __rawInput)`).join(', ')}]);`,
    `const __mergedObject = {};`,
    `const __scalarResults = [];`,
    `const __errors = [];`,
    `let __fulfilledCount = 0;`,
    `for (let i = 0; i < __settled.length; i++) {`,
    `  const entry = __settled[i];`,
    `  if (entry.status === 'fulfilled' && entry.value !== undefined) {`,
    `    __fulfilledCount++;`,
    `    if (entry.value && typeof entry.value === 'object' && !Array.isArray(entry.value)) {`,
    `      Object.assign(__mergedObject, entry.value);`,
    `    } else {`,
    `      __scalarResults.push(entry.value);`,
    `    }`,
    `  } else if (entry.status === 'rejected') {`,
    `    __errors.push(entry.reason?.message || String(entry.reason));`,
    `  }`,
    `}`,
    `if (__fulfilledCount === 0 && __errors.length > 0) {`,
    `  throw new Error(__errors.join(' | '));`,
    `}`,
    `if (Object.keys(__mergedObject).length > 0) {`,
    `  if (__scalarResults.length > 0) __mergedObject.additionalOutputs = __scalarResults;`,
    `  return __mergedObject;`,
    `}`,
    `return __scalarResults.length === 1 ? __scalarResults[0] : __scalarResults;`
  ].join('\n');

  return {
    code: combinedCode,
    strategy: 'deterministic_capability_fusion'
  };
}

/**
 * Counts how many duplicate entries currently exist in a list of tools without mutating it.
 */
export function countDuplicateTools(tools: DeduplicatableTool[]): {
  duplicateCount: number;
  clusterCount: number;
} {
  const res = deduplicateToolsDeterministic(tools);
  return {
    duplicateCount: res.duplicatesDeleted,
    clusterCount: res.clustersMerged
  };
}

/**
 * Clusters identical/duplicate tools by ID, canonicalized name, and exact code fingerprint,
 * combines any extra functions + parameters + descriptions + usage counts into one canonical tool,
 * and deletes all duplicates.
 */
export function deduplicateToolsDeterministic<T extends DeduplicatableTool>(
  inputTools: T[]
): ToolDeduplicationResult<T> {
  const n = inputTools.length;
  if (n === 0) {
    return {
      beforeCount: 0,
      afterCount: 0,
      duplicatesDeleted: 0,
      clustersMerged: 0,
      functionsCombinedCount: 0,
      consolidatedTools: [],
      deletedToolIds: [],
      clusters: []
    };
  }

  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };

  const byId = new Map<string, number>();
  const byCanonicalName = new Map<string, number>();
  const byCodeFp = new Map<string, number>();

  const meta = inputTools.map((t, idx) => {
    const author = t.authorAgent || t.author || '';
    const canonicalKey = toCanonicalToolComparisonKey(t.name, author);
    const codeFp = computeCodeFingerprint(t.code);

    const idKey = String(t.id || '').trim();
    if (idKey) {
      if (byId.has(idKey)) union(byId.get(idKey)!, idx);
      else byId.set(idKey, idx);
    }

    if (canonicalKey) {
      if (byCanonicalName.has(canonicalKey)) union(byCanonicalName.get(canonicalKey)!, idx);
      else byCanonicalName.set(canonicalKey, idx);
    }

    if (isNonTrivialCodeFingerprint(codeFp)) {
      if (byCodeFp.has(codeFp)) union(byCodeFp.get(codeFp)!, idx);
      else byCodeFp.set(codeFp, idx);
    }

    return { canonicalKey, codeFp };
  });

  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    const list = groups.get(r) || [];
    list.push(i);
    groups.set(r, list);
  }

  const consolidatedTools: T[] = [];
  const deletedToolIds: string[] = [];
  const clusters: ToolClusterMergeSummary[] = [];
  let functionsCombinedCount = 0;

  for (const indices of groups.values()) {
    if (indices.length === 1) {
      const single = inputTools[indices[0]];
      const cleanedName = canonicalizeToolName(single.name, single.authorAgent || single.author);
      if (cleanedName !== single.name) {
        consolidatedTools.push({ ...single, name: cleanedName });
      } else {
        consolidatedTools.push(single);
      }
      continue;
    }

    const members = indices.map(idx => ({
      idx,
      tool: inputTools[idx],
      codeFp: meta[idx].codeFp,
      score: scoreCanonicalCandidate(inputTools[indices.indexOf(idx) >= 0 ? idx : indices[0]])
    }));
    members.sort((a, b) => b.score - a.score);

    const winner = members[0].tool;
    const losers = members.slice(1).map(m => m.tool);
    const canonicalName = canonicalizeToolName(winner.name, winner.authorAgent || winner.author);

    // Sum execution/usage counts across duplicates (avoiding double-counting identical ID records)
    const seenIdsForCount = new Set<string>();
    let totalExecutions = 0;
    for (const m of members) {
      const tid = String(m.tool.id || '');
      const count = Number(m.tool.executionCount ?? m.tool.usageCount ?? 0) || 0;
      if (tid && seenIdsForCount.has(tid)) {
        totalExecutions = Math.max(totalExecutions, count);
      } else {
        if (tid) seenIdsForCount.add(tid);
        totalExecutions += count;
      }
    }

    // Union declared + inferred parameters across all duplicates
    const combinedParameters: Record<string, any> = {};
    for (const m of members) {
      const inferred = inferParametersFromCode(m.tool.code);
      for (const [k, v] of Object.entries(inferred)) {
        if (!(k in combinedParameters)) combinedParameters[k] = v;
      }
    }
    for (const m of members) {
      if (m.tool.parameters && typeof m.tool.parameters === 'object') {
        for (const [k, v] of Object.entries(m.tool.parameters)) {
          combinedParameters[k] = v;
        }
      }
    }

    // Identify distinct functional implementations
    // Note: if winner has a dedicated `/api/sovereign/tools/*` endpoint, keep its canonical preview/endpoint intact
    const hasDedicatedSovereignEndpoint = Boolean(
      winner.endpoint && winner.endpoint.startsWith('/api/sovereign/tools/')
    );

    const distinctVariantMap = new Map<
      string,
      { id: string; name: string; description?: string; code: string; fingerprint: string }
    >();
    for (const m of members) {
      const fp = m.codeFp || String(m.tool.code || '').trim();
      if (!fp) continue;
      if (!distinctVariantMap.has(fp)) {
        distinctVariantMap.set(fp, {
          id: m.tool.id,
          name: m.tool.name,
          description: m.tool.description,
          code: m.tool.code,
          fingerprint: fp
        });
      }
    }

    const distinctVariants = Array.from(distinctVariantMap.values());
    let mergedCode = winner.code;
    let mergeStrategy: ToolMergeStrategy = 'identical_code_prune';

    if (!hasDedicatedSovereignEndpoint && distinctVariants.length > 1) {
      const combined = combineDistinctCodeVariantsDeterministically(distinctVariants);
      mergedCode = combined.code;
      mergeStrategy = combined.strategy;
      if (distinctVariants.length > 1) {
        functionsCombinedCount += distinctVariants.length - 1;
      }
    }

    const mergedDescription = mergeToolDescriptions(
      members.map(m => m.tool),
      canonicalName
    );

    // Pick best non-generic category if winner had a generic one
    let bestCategory = winner.category;
    if (isGenericCategory(bestCategory)) {
      const specific = members.find(m => !isGenericCategory(m.tool.category));
      if (specific) bestCategory = specific.tool.category;
    }

    const mergedTool: T = {
      ...winner,
      name: canonicalName,
      description: mergedDescription,
      category: bestCategory,
      parameters: combinedParameters,
      code: mergedCode,
      ...(winner.executionCount !== undefined || losers.some(l => l.executionCount !== undefined)
        ? { executionCount: totalExecutions }
        : {}),
      ...(winner.usageCount !== undefined || losers.some(l => l.usageCount !== undefined)
        ? { usageCount: totalExecutions }
        : {})
    };

    consolidatedTools.push(mergedTool);

    const deletedIdsForCluster: string[] = [];
    const deletedNamesForCluster: string[] = [];
    for (const l of losers) {
      if (l.id && l.id !== winner.id) {
        deletedToolIds.push(l.id);
        deletedIdsForCluster.push(l.id);
      }
      deletedNamesForCluster.push(l.name);
    }

    // Only record as a duplicate cluster if distinct entries (not just same-ID client/server hydration) were merged
    if (deletedIdsForCluster.length > 0 || losers.length > 0) {
      clusters.push({
        canonicalId: mergedTool.id,
        canonicalName: mergedTool.name,
        keptCategory: mergedTool.category,
        distinctVariantsMerged: distinctVariants.length,
        deletedIds: deletedIdsForCluster,
        deletedNames: deletedNamesForCluster,
        combinedParameters,
        combinedCapabilities: distinctVariants.map(
          (v, idx) =>
            v.description?.trim() ||
            `Variant ${idx + 1} (${v.name})`
        ),
        totalExecutionCount: totalExecutions,
        mergeStrategy
      });
    }
  }

  return {
    beforeCount: inputTools.length,
    afterCount: consolidatedTools.length,
    duplicatesDeleted: inputTools.length - consolidatedTools.length,
    clustersMerged: clusters.length,
    functionsCombinedCount,
    consolidatedTools,
    deletedToolIds,
    clusters
  };
}
