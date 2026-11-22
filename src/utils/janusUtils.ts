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
 * Sanitizes and ensures balanced reasoning tags without substituting canned text.
 */
export function healReasoningStream(
  rawText: string,
  _prompt: string,
  onRecovery?: () => void
): { reasoning: string; answer: string; fullText: string } {
  let text = rawText || '';
  let reasoning = '';
  let answer = text;

  if (text.includes('<think>')) {
    const startIdx = text.indexOf('<think>') + 7;
    const endIdx = text.indexOf('</think>');

    if (endIdx !== -1) {
      reasoning = text.substring(startIdx, endIdx).trim();
      answer = text.substring(endIdx + 8).trim();
    } else {
      if (onRecovery) onRecovery();
      reasoning = text.substring(startIdx).trim();
      answer = '';
      text = `<think>\n${reasoning}\n</think>`;
    }
  } else if (text.startsWith('🧠 **[DEEPTHINK') && text.includes('**')) {
    const parts = text.split('\n\n');
    reasoning = parts[0];
    answer = parts.slice(1).join('\n\n');
  }

  return { reasoning, answer, fullText: text };
}
