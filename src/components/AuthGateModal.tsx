/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 * (TWENTY 47 PROTOCOL - GENESIS NODE / LYSANDER CORE EULA / H-FID Forensic License v1.1).
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  KeyRound,
  UserPlus,
  LogIn,
  LogOut,
  AlertTriangle,
  Clock,
  Ban,
  Cpu,
  Eye,
  EyeOff,
  Loader2,
  X,
  CheckCircle2
} from 'lucide-react';
import { auth, googleProvider, signInWithPopup, signOut } from '../firebase';
import {
  loadSavedLoginHint,
  loginWithGoogleToken,
  loginWithUsernamePassword,
  logoutSession,
  registerLocalAccount,
  saveLoginHint
} from '../utils/authClient';
import type { AuthPolicySettings, AuthSessionResponse, AuthUserPublic } from '../types/auth';

interface AuthGateModalProps {
  mode: 'gate' | 'modal';
  currentUser: AuthUserPublic | null;
  adminClaimed?: boolean;
  envAdminConfigured?: boolean;
  policy: AuthPolicySettings;
  onAuthenticated: (session: AuthSessionResponse) => void;
  onSignedOut?: () => void;
  onClose?: () => void;
}

export const AuthGateModal: React.FC<AuthGateModalProps> = ({
  mode,
  currentUser,
  policy,
  onAuthenticated,
  onSignedOut,
  onClose
}) => {
  const savedHint = loadSavedLoginHint();

  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState(() => savedHint?.username || '');
  const [displayName, setDisplayName] = useState(() => savedHint?.displayName || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => savedHint?.rememberMe ?? true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If self-registration is disabled by admin policy while on register tab, return to Sign In
  useEffect(() => {
    if (!policy.allowSelfRegistration && tab === 'register') {
      setTab('login');
    }
  }, [policy.allowSelfRegistration, tab]);

  const handleSignOutBlocked = async () => {
    setLoading(true);
    try {
      await logoutSession();
      await signOut(auth).catch(() => {});
      onSignedOut?.();
    } finally {
      setLoading(false);
    }
  };

  // Pending approval or suspended account view
  if (currentUser && currentUser.status !== 'active') {
    const isPending = currentUser.status === 'pending';
    return (
      <div className="fixed inset-0 z-[120] bg-zinc-950/95 backdrop-blur-xl flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-zinc-900/95 border border-zinc-800 shadow-2xl p-6 space-y-5 text-center">
          <div
            className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center border ${
              isPending
                ? 'bg-amber-500/15 border-amber-500/35 text-amber-400'
                : 'bg-rose-500/15 border-rose-500/35 text-rose-400'
            }`}
          >
            {isPending ? <Clock className="w-7 h-7" /> : <Ban className="w-7 h-7" />}
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-zinc-100">
              {isPending ? 'Account Awaiting Approval' : 'Account Suspended'}
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Signed in as <span className="font-mono text-zinc-200">{currentUser.username}</span> (
              {currentUser.displayName}).{' '}
              {isPending
                ? 'An administrator needs to approve your account and assign your OS privileges before entry.'
                : 'Access to Lysander Sovereign OS has been suspended by an administrator.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOutBlocked}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-100 text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out &amp; Switch Account</span>
          </button>
        </div>
      </div>
    );
  }

  const offerBrowserPasswordSave = async (id: string, secret: string, name?: string) => {
    try {
      const win = window as any;
      if (rememberMe && typeof win.PasswordCredential === 'function' && navigator.credentials?.store) {
        const cred = new win.PasswordCredential({ id, password: secret, name: name || id });
        await navigator.credentials.store(cred);
      }
    } catch {
      // Browser credential manager is optional; ignore if unsupported in iframe
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim();
    if (cleanUsername.length < 2) {
      setError('Please enter a username (at least 2 characters).');
      return;
    }

    if (tab === 'register') {
      if (password.length < 8) {
        setError('Password must be at least 8 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      let res: AuthSessionResponse;
      if (tab === 'register') {
        res = await registerLocalAccount({
          username: cleanUsername,
          password,
          displayName: displayName.trim() || undefined,
          email: email.trim() || undefined,
          rememberMe
        });
      } else {
        res = await loginWithUsernamePassword({
          username: cleanUsername,
          password,
          rememberMe
        });
      }

      if (rememberMe) {
        saveLoginHint({
          username: res.user?.username || cleanUsername,
          displayName: res.user?.displayName || displayName.trim() || undefined,
          rememberMe: true
        });
        await offerBrowserPasswordSave(
          res.user?.username || cleanUsername,
          password,
          res.user?.displayName || displayName.trim() || undefined
        );
      } else {
        saveLoginHint(null);
      }

      onAuthenticated(res);
    } catch (err: any) {
      setError(err?.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuthority = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const idToken = await cred.user.getIdToken(true);
      const res = await loginWithGoogleToken(idToken, rememberMe);
      if (rememberMe && res.user) {
        saveLoginHint({
          username: res.user.username,
          displayName: res.user.displayName,
          rememberMe: true
        });
      }
      onAuthenticated(res);
    } catch (err: any) {
      const msg = String(err?.message || err || '');
      if (msg.includes('popup-closed-by-user')) {
        setError('Google sign-in popup was closed before completing.');
      } else {
        setError(msg || 'Google sign-in failed.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const passwordReady = password.length >= 8;
  const passwordsMatch = !confirmPassword || password === confirmPassword;

  return (
    <div
      className={`fixed inset-0 z-[120] flex items-center justify-center p-4 overflow-y-auto ${
        mode === 'gate' ? 'bg-zinc-950' : 'bg-zinc-950/85 backdrop-blur-md'
      }`}
    >
      <div className="relative w-full max-w-md rounded-2xl bg-zinc-900/95 border border-zinc-800 shadow-2xl overflow-hidden my-auto">
        {mode === 'modal' && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 cursor-pointer z-10"
            aria-label="Close login modal"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-zinc-800/80 bg-zinc-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center text-amber-400 shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-zinc-100 tracking-tight truncate">
                Lysander Sovereign OS
              </h1>
              <p className="text-xs text-zinc-400 truncate">
                Sign in with Username &amp; Password or Google Authority
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Google Login Authority */}
          <button
            type="button"
            onClick={handleGoogleAuthority}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-60"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            )}
            <span>{googleLoading ? 'Verifying Google Authority...' : 'Continue with Google Login Authority'}</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
              or local credentials
            </span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          {/* Mode Tabs — Strictly Sign In & Standard User Registration (Never Admin Creation) */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-zinc-950 border border-zinc-800">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setTab('login');
              }}
              className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                tab === 'login'
                  ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              disabled={!policy.allowSelfRegistration}
              onClick={() => {
                setError(null);
                setTab('register');
              }}
              className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                tab === 'register'
                  ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} method="post" className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="sov-auth-username" className="block text-[11px] font-medium text-zinc-300">
                  {tab === 'login' ? 'Username or Email' : 'Username (or Email)'}
                </label>
                {savedHint?.username && username === savedHint.username && (
                  <button
                    type="button"
                    onClick={() => {
                      saveLoginHint(null);
                      setUsername('');
                    }}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 underline cursor-pointer"
                  >
                    Forget saved
                  </button>
                )}
              </div>
              <input
                id="sov-auth-username"
                name="username"
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username or email"
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-amber-500/60 focus:outline-none text-xs text-zinc-100 placeholder-zinc-500"
              />
            </div>

            {tab === 'register' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="sov-auth-display" className="block text-[11px] font-medium text-zinc-300 mb-1">
                    Display Name
                  </label>
                  <input
                    id="sov-auth-display"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-amber-500/60 focus:outline-none text-xs text-zinc-100 placeholder-zinc-500"
                  />
                </div>
                <div>
                  <label htmlFor="sov-auth-email" className="block text-[11px] font-medium text-zinc-300 mb-1">
                    Email (optional)
                  </label>
                  <input
                    id="sov-auth-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-amber-500/60 focus:outline-none text-xs text-zinc-100 placeholder-zinc-500"
                  />
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="sov-auth-password" className="block text-[11px] font-medium text-zinc-300">
                  Password
                </label>
                {tab === 'register' && password.length > 0 && (
                  <span
                    className={`text-[10px] font-mono flex items-center gap-1 ${
                      passwordReady ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {passwordReady && <CheckCircle2 className="w-3 h-3" />}
                    {password.length}/8+ chars
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  id="sov-auth-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={tab === 'login' ? 'Enter password' : 'Minimum 8 characters'}
                  className="w-full px-3 py-2 pr-9 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-amber-500/60 focus:outline-none text-xs text-zinc-100 placeholder-zinc-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {tab === 'register' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="sov-auth-confirm" className="block text-[11px] font-medium text-zinc-300">
                    Confirm Password
                  </label>
                  {confirmPassword.length > 0 && (
                    <span
                      className={`text-[10px] font-mono ${
                        passwordsMatch ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {passwordsMatch ? 'Match' : 'Does not match'}
                    </span>
                  )}
                </div>
                <input
                  id="sov-auth-confirm"
                  name="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-amber-500/60 focus:outline-none text-xs text-zinc-100 placeholder-zinc-500"
                />
              </div>
            )}

            {/* Save Login Info / Keep Me Signed In */}
            <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/90 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="mt-0.5 accent-amber-500 rounded cursor-pointer"
              />
              <div className="text-[11px] leading-snug">
                <div className="font-semibold text-zinc-200">Save login info &amp; keep me signed in</div>
                <div className="text-zinc-500 text-[10px]">
                  Remembers your username, persists your secure HttpOnly session (30 days), and lets your browser password manager save credentials.
                </div>
              </div>
            </label>

            {error && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/35 text-xs text-rose-200">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <KeyRound className="w-4 h-4" />
              )}
              <span>
                {tab === 'register' ? 'Create Account & Sign In' : 'Sign In to Sovereign OS'}
              </span>
            </button>
          </form>

          {tab === 'register' && policy.newUsersRequireApproval && (
            <p className="text-[11px] text-zinc-400 text-center">
              Note: New accounts require administrator approval before accessing OS modules.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
