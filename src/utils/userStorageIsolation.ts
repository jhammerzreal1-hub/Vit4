/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 */

const ACTIVE_SCOPE_META_KEY = 'sovereign_active_storage_scope_v1';
const SNAPSHOT_PREFIX = 'sovereign_scope_snapshot_v1::';

// User-scoped browser keys that must NEVER bleed across different user logins.
// When switching from user A to user B, user A's values are saved under user A's
// private snapshot and cleared before user B's workspace mounts so user B gets a
// completely fresh OS experience with zero wallets, seeds, burner emails, or secrets.
export const USER_SCOPED_LOCAL_KEYS: string[] = [
  'sovereign_crypto_wallets_cache_v1',
  'aurelius_burner_inboxes_v2',
  'aurelius_burner_active_id_v2',
  'aurelius_burner_messages_v2',
  'aurelius_burner_deleted_ids_v1',
  'burner_webhook_url',
  'burner_notify_termux',
  'aurelius_burner_gmail_base_v1',
  'aurelius_chat_history_v3',
  'aurelius_chat_permit_v1',
  'aurelius_custom_system_instruction_v1',
  'aurelius_build_steps_v1',
  'aurelius_prompt_presets',
  'aurelius_hitl_queue_v1',
  'aurelius_vault_artifacts_v1',
  'aurelius_active_account',
  'sovereign_browser_sid_v1',
  'sovereign_learned_knowledge',
  'sovereign_voice_scratchpad_v1',
  'sovereign_voice_transcripts_v1',
  'sovereign_voice_session_id_v1',
  'sovereign_os_active_module_v1',
  'sovereign_os_open_modules_v1',
  'sovereign_os_window_states_v2',
  'sovereign_os_chat_detached_v1',
  'sovereign_os_detached_extras_v1',
  'sovereign_ui_mutation_v1',
  'lysander_host_bridge_url',
  'lysander_host_bridge_token',
  'aurelius_autonomy_diagnostics',
  'aurelius_autonomy_pulse'
];

function sanitizeScopeId(userId: string | null | undefined): string {
  const clean = String(userId || '').trim().replace(/[^a-zA-Z0-9._-]/g, '_');
  return clean || '__guest__';
}

export function clearCurrentUserCachedState(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  for (const key of USER_SCOPED_LOCAL_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {}
  }
}

/**
 * Snapshots the previous user's scoped browser keys (if authenticated) and restores
 * or starts fresh for `nextUserId`. Ensures non-owner / new accounts NEVER inherit
 * another user's cached wallets, burner emails, chat history, scratchpad, or secrets.
 */
export function syncUserLocalStorageScope(nextUserId: string | null | undefined): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  const nextScope = sanitizeScopeId(nextUserId);
  let prevScope: string | null = null;
  try {
    prevScope = localStorage.getItem(ACTIVE_SCOPE_META_KEY);
  } catch {
    return false;
  }

  if (prevScope === nextScope) {
    return false;
  }

  // 1. Save outgoing user's scoped state into their private snapshot (skip __guest__)
  if (prevScope && prevScope !== '__guest__') {
    const outgoing: Record<string, string> = {};
    for (const key of USER_SCOPED_LOCAL_KEYS) {
      try {
        const val = localStorage.getItem(key);
        if (val !== null) outgoing[key] = val;
      } catch {}
    }
    try {
      localStorage.setItem(`${SNAPSHOT_PREFIX}${prevScope}`, JSON.stringify(outgoing));
    } catch {}
  }

  // 2. Always wipe live user-scoped keys clean before mounting next user
  clearCurrentUserCachedState();

  // 3. Restore incoming user's previous snapshot if one exists
  if (nextScope !== '__guest__') {
    try {
      const raw = localStorage.getItem(`${SNAPSHOT_PREFIX}${nextScope}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          for (const key of USER_SCOPED_LOCAL_KEYS) {
            if (typeof parsed[key] === 'string') {
              localStorage.setItem(key, parsed[key]);
            }
          }
        }
      }
    } catch {}
  }

  try {
    localStorage.setItem(ACTIVE_SCOPE_META_KEY, nextScope);
  } catch {}

  return prevScope !== null;
}
