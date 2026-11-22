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

import React, { useEffect, useState } from 'react';
import { WifiOff, X } from 'lucide-react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isOnline) setDismissed(false);
  }, [isOnline]);

  if (isOnline || dismissed) return null;

  return (
    <div className="fixed bottom-14 sm:bottom-4 left-3 sm:left-4 z-30 flex items-center gap-2 rounded-xl bg-amber-500/95 px-3 py-1.5 text-xs font-bold text-zinc-950 shadow-xl border border-amber-400 max-w-[calc(100vw-24px)]">
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">Offline Mode — Local Cache</span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="p-0.5 rounded-md hover:bg-zinc-950/15 text-zinc-950 transition-colors shrink-0 cursor-pointer"
        aria-label="Dismiss offline notice"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
