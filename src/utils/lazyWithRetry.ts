import React, { lazy } from 'react';

export function isDynamicImportError(error: unknown): boolean {
  const msg = String((error as any)?.message || error || '').toLowerCase();
  return (
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('loading chunk') ||
    msg.includes('chunkloaderror') ||
    msg.includes('failed to load module script')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Resilient React.lazy wrapper that retries transient dynamic import failures
 * (e.g. during dev server restarts, hot-swapped module reloads, or Cloud Run proxy blips)
 * instead of letting React.lazy permanently cache a single failed Promise.
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  moduleLabel?: string,
  maxRetries = 5
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    const delays = [250, 500, 900, 1400, 2200];
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await factory();
      } catch (err) {
        lastError = err;
        if (!isDynamicImportError(err) || attempt === maxRetries) {
          break;
        }
        const waitMs = delays[attempt] ?? 1500;
        console.warn(
          `[OS Module Loader] Transient import retry ${attempt + 1}/${maxRetries} for ${moduleLabel || 'module'} in ${waitMs}ms...`
        );
        await sleep(waitMs);
      }
    }

    throw lastError;
  });
}
