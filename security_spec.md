# Security Specification: Lysander Genesis Orchestrator

## 1. Data Invariants
- A user can only read, create, or update their own profile at `/users/{userId}` when authenticated with a verified email (`request.auth.uid == userId && request.auth.token.email_verified == true`).
- All nested user collections (`threads`, `messages`, `agentic_memory`, `artifacts`, `audit_ledger`, `game_runs`, `spatial_blueprints`, `detected_games`, `crafted_items`, `orchestrator_state`) enforce strict path-ownership and parent/field identity integrity (`userId == userId == request.auth.uid`), with zero synthetic guest bypasses (`'0'`, `'guest-*'`).
- Document IDs must match `^[a-zA-Z0-9_\-]+$` and length `1..128` on single-document operations (`get`, `create`, `update`, `delete`).
- Every string field enforces explicit upper bounds (`id <= 128`, `title <= 256` or `128` for blueprints/games/items, `sourcePath <= 512`, `prompt <= 4000`, `content/blueprintJson/modStateJson/itemSpecJson <= 50000`, `continuityJson <= 200000`, `mediaUrl <= 500000`) and finite enum sets (`UserProfile.role`, `ChatMessage.role`, `AgenticMemory.role`, `Artifact.type`, `AuditLedgerItem.status`, `GameRun.mode`, `GameRun.shipFinish`, `GameRun.status`, `SpatialBlueprint.engineKind`, `DetectedGameMod.engine`, `DetectedGameMod.status`, `CraftedItem.category`, `CraftedItem.rarity`, `OrchestratorState.stateKey`).
- Numerical game & continuity fields (`score` `0..10000000`, `wave` `1..999`, `beaconsCollected` `0..99999`, `durationSec` `0..86400`, `agentsCount` `0..64`, `modCount` `0..10000`, `crafterSkillLevel` `1..999`, `processMetricValue` `-1000000..10000000`, `revision` `0..100000000`) are strictly bounded against negative or overflow injection.
- Immutable ownership & creation fields (`uid`, `userId`, `createdAt`, `createdByAgent`, `gameKey`, `detectedAt`, `signatureHash`, `threadId`, `stateKey`) cannot be mutated after document creation; completed `game_runs` and `crafted_items` are terminal once recorded (admin-only correction).
- Self-privilege escalation is blocked: standard users cannot create or update their `role`, `status`, or `privileges` map; `privileges.allowedModules` is strictly bounded to `<= 64` items; only verified Admins (`jhammerzreal1@gmail.com` or `role == 'admin'`) can assign custom roles, statuses, or privileges.

## 2. Attack Vectors & Defensive Gates ("Dirty Dozen" Payloads)
1. **Unauthenticated Read/Write**: `{}` with `auth = null` -> Rejected by `isSignedIn()` + catch-all `match /{document=**} { allow read, write: if false; }`.
2. **Email Spoofing (`email_verified == false`)**: `{ uid: "admin1", email: "jhammerzreal1@gmail.com", role: "admin" }` with `email_verified: false` -> Rejected by `isSignedIn()` and `isAdmin()`.
3. **Synthetic Guest / Cross-Tenant Path Traversal**: Write to `/users/userB/game_runs/run1` as `userA` -> Rejected by `isOwner(userId)`.
4. **Shadow Field Injection**: `{ userId: "userA", mode: "arcade", shipFinish: "titanium", score: 100, wave: 1, beaconsCollected: 3, durationSec: 25, status: "COMPLETED", createdAt: "...", isVerified: true }` -> Rejected by `keys().hasAll(...) && keys().hasOnly(...)`.
5. **Document ID Poisoning**: Document path `/users/userA/game_runs/../../admins` or 500-char random ID -> Rejected by `isValidId(runId)`.
6. **Self-Role Privilege Escalation**: Update `/users/userA` with `{ role: "admin" }` -> Rejected because `incoming().role == existing().role` and `affectedKeys().hasOnly(['email', 'displayName', 'photoURL', 'updatedAt'])`.
7. **Denial-of-Wallet / Large Buffer DoS**: `Artifact` with `title` > 256 chars or `prompt` > 4000 chars -> Rejected by strict `.size()` limits; zero `get()`/`exists()` inside `allow list`.
8. **Cross-Tenant Query Scraping**: `collection(db, 'users/userB/game_runs')` queried by `userA` -> Rejected by `allow list: if isSignedIn() && existing().userId == request.auth.uid;`.
9. **Type & Enum Poisoning**: `GameRun` with `score: "999999"` (string), `score: -500`, `score: 999999999`, or `mode: "godmode"` -> Rejected by `is number`, range bounds, and enum allowlist.
10. **Immutable Field Overwrite & Terminal State Tampering**: `update` on `game_runs/{runId}` trying to inflate `score` or change `createdAt`/`userId` -> Rejected because `game_runs` updates are terminal-locked (`isAdmin()` only).
11. **Public Read/Write Probe Abuse**: `list` or `setDoc` against `/test/connection` -> Rejected by `allow get: if request.auth != null; allow list, write: if false;`.
12. **Orphaned Child Record Creation**: Creating `/users/userA/threads/t1/messages/m1` when parent thread `t1` does not exist -> Rejected by `exists(.../threads/$(threadId))`.
