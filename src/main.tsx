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

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { installGlobalApiAuthInterceptor } from './utils/authClient';
import './index.css';

installGlobalApiAuthInterceptor();

// Guarantee idempotent AudioContext.close() across all modules and Web Audio libraries
// (prevents InvalidStateError: "Cannot close a closed AudioContext" during concurrent teardown/StrictMode cycles)
if (typeof window !== 'undefined') {
  const ctors = [window.AudioContext, (window as any).webkitAudioContext].filter(Boolean);
  for (const Ctor of ctors) {
    const proto = Ctor?.prototype;
    if (proto && typeof proto.close === 'function' && !(proto as any).__sovereignSafeClose) {
      const nativeClose = proto.close;
      proto.close = function safeClose(this: AudioContext) {
        if (this.state === 'closed') {
          return Promise.resolve();
        }
        try {
          return Promise.resolve(nativeClose.call(this)).catch((err: any) => {
            const msg = String(err?.message || err || '');
            if ((this.state as AudioContextState) === 'closed' || /closed AudioContext/i.test(msg)) {
              return;
            }
            throw err;
          });
        } catch (err: any) {
          const msg = String(err?.message || err || '');
          if ((this.state as AudioContextState) === 'closed' || /closed AudioContext/i.test(msg)) {
            return Promise.resolve();
          }
          return Promise.reject(err);
        }
      };
      (proto as any).__sovereignSafeClose = true;
    }
  }
}

// Global Client Exceptional Error Safeguards
window.addEventListener('unhandledrejection', (event) => {
  const reasonStr = String(event.reason?.message || event.reason || '');
  if (reasonStr.includes('WebSocket') || reasonStr.includes('vite') || reasonStr.includes('closed without opened')) {
    event.preventDefault();
    return;
  }
  console.warn('[Aurelius Client Safeguard] Handled Async Promise Rejection:', event.reason);
  event.preventDefault();
});

window.addEventListener('error', (event) => {
  const msg = String(event.error?.message || event.message || '').trim();
  const isOpaqueCrossOriginScriptError =
    /^script error\.?$/i.test(msg) && !event.error && !event.filename && (!event.lineno || event.lineno === 0);
  if (
    isOpaqueCrossOriginScriptError ||
    msg.includes('WebSocket') ||
    msg.includes('vite') ||
    msg.includes('ResizeObserver loop')
  ) {
    event.preventDefault();
    return;
  }
  console.warn('[Aurelius Client Safeguard] Handled Window Runtime Error:', event.error || event.message);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Manage Service Worker cleanly:
// On dev/preview hosts (localhost, 127.0.0.1, ais-dev-*), actively unregister stale SWs & caches
// so Vite module updates never collide with stale caches. Only register SW in production builds.
if ('serviceWorker' in navigator) {
  const host = window.location.hostname || '';
  const isDevPreview =
    !import.meta.env.PROD ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.startsWith('ais-dev-');

  window.addEventListener('load', () => {
    if (isDevPreview) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((reg) => reg.unregister())))
        .catch(() => {});
      if ('caches' in window) {
        caches
          .keys()
          .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
          .catch(() => {});
      }
    } else {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('ServiceWorker registration error:', err);
      });
    }
  });
}
