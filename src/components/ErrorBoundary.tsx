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

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw, Terminal, ShieldCheck, RotateCcw } from 'lucide-react';
import { isDynamicImportError } from '../utils/lazyWithRetry';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryKey: number;
  autoRetried: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    retryKey: 0,
    autoRetried: false
  };

  private autoRetryTimer: number | null = null;

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Aurelius Sovereign ErrorBoundary caught an exception:', error, errorInfo);
    this.setState({ errorInfo });

    // Automatically attempt one non-destructive retry for transient dynamic module fetch errors
    if (isDynamicImportError(error) && !this.state.autoRetried) {
      this.autoRetryTimer = window.setTimeout(() => {
        this.setState((prev) => ({
          hasError: false,
          error: null,
          errorInfo: null,
          retryKey: prev.retryKey + 1,
          autoRetried: true
        }));
      }, 750);
    }
  }

  public componentWillUnmount() {
    if (this.autoRetryTimer !== null) {
      window.clearTimeout(this.autoRetryTimer);
    }
  }

  private handleSoftRetry = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryKey: prev.retryKey + 1
    }));
  };

  private handleReloadPage = () => {
    window.location.reload();
  };

  private handleReset = () => {
    try {
      localStorage.removeItem('aurelius_chat_history_v3');
      localStorage.removeItem('aurelius_vault_artifacts_v1');
      localStorage.removeItem('aurelius_chat_permit_v1');
      localStorage.removeItem('aurelius_knowledge_nodes');
      localStorage.removeItem('aurelius_knowledge_edges');
      localStorage.removeItem('aurelius_active_account');
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker
          .getRegistrations()
          .then((regs) => {
            regs.forEach((r) => r.unregister());
          })
          .catch(() => {});
      }
      if ('caches' in window) {
        caches
          .keys()
          .then((keys) => {
            keys.forEach((k) => caches.delete(k));
          })
          .catch(() => {});
      }
    } catch (_) {}
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      const isChunkErr = isDynamicImportError(this.state.error);
      return (
        <div className="h-full min-h-[280px] w-full bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-5 font-mono select-none overflow-y-auto">
          <div className="max-w-xl w-full bg-zinc-900/90 border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-2xl shadow-black/80 space-y-5">
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-bold text-zinc-100 tracking-tight">
                  {isChunkErr ? 'Module Reload Required' : 'Sovereign Nexus Self-Healing Intercept'}
                </h1>
                <p className="text-xs text-zinc-400">
                  {isChunkErr
                    ? 'The OS updated or restarted while loading this module. Click Reload App to sync the latest build without losing your data.'
                    : 'Substrate caught an unhandled exception. Your data is preserved.'}
                </p>
              </div>
            </div>

            <div className="bg-black/60 border border-zinc-800/80 rounded-xl p-4 text-xs font-mono space-y-2 text-zinc-300 overflow-x-auto">
              <div className="flex items-center gap-2 text-amber-400 font-semibold">
                <Terminal className="w-3.5 h-3.5" />
                <span>Exception Trace:</span>
              </div>
              <p className="text-rose-400 break-words">
                {this.state.error?.name}: {this.state.error?.message || 'Unknown runtime interruption'}
              </p>
              {this.state.errorInfo?.componentStack && (
                <pre className="text-[10px] text-zinc-500 mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap font-mono">
                  {this.state.errorInfo.componentStack.slice(0, 500)}
                </pre>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2 text-[11px] text-emerald-400">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>State Preserved</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={this.handleSoftRetry}
                  className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-100 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Module</span>
                </button>
                <button
                  type="button"
                  onClick={this.handleReloadPage}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reload App</span>
                </button>
                {!isChunkErr && (
                  <button
                    type="button"
                    onClick={this.handleReset}
                    className="px-3.5 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Clear Cache &amp; Reset
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return <React.Fragment key={this.state.retryKey}>{this.props.children}</React.Fragment>;
  }
}
