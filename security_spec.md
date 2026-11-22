# Security Specification: Lysander Genesis Orchestrator

## 1. Data Invariants
- A user can only read, create, or update their own profile at `/users/{userId}` when authenticated with a verified email (`request.auth.uid == userId && request.auth.token.email_verified == true`).
- Client-side self-elevation of tiers or privileges on `/users/{userId}` is strictly blocked: non-admin profile creates forbid `privileges`, `status`, `tierId`, `tierName`, `tierBadgeColor`, `subscriptionStatus`, `tierExpiresAt`, `isExecutiveArchitect`, and `authorityTier`, and updates restrict `affectedKeys()` to `['username', 'email', 'displayName', 'photoURL', 'updatedAt']`.
- Access tier catalog entries at `/tiers/{tierId}` and permanent Wall entries at `/supporter_board/{entryId}` are server/admin-governed (`isAdmin()` only for all writes). Public `get`/`list` queries on `/tiers` require `existing().isPublic == true`, and on `/supporter_board` require `existing().verified == true` without `get()`/`exists()` calls in `allow list`.
- Anonymous entries on `/supporter_board/{entryId}` forbid PII fields (`userId`, `uid`, `email`, `username` absent from allowed schema keys) and strictly enforce `authorDisplayName == 'Anonymous Backer'` when `isAnonymous == true`, while locking original `createdAt`, `amountUsd`, `entryKind`, and `paymentMethod` as immutable proof.
- All nested user collections (`threads`, `messages`, `agentic_memory`, `artifacts`, `audit_ledger`, `game_runs`, `spatial_blueprints`, `detected_games`, `crafted_items`, `orchestrator_state`) enforce strict path-ownership and parent/field identity integrity (`userId == userId == request.auth.uid`), with zero synthetic guest bypasses.
- Document IDs must match `^[a-zA-Z0-9_\-]+$` and length `1..128` on single-document operations (`get`, `create`, `update`, `delete`).
- Every string and array field enforces explicit upper bounds (`id <= 128`, `authorDisplayName <= 48`, `message <= 500`, `privileges.allowedModules <= 64`, `Tier.features <= 24`, etc.) and finite enum sets (`UserProfile.subscriptionStatus`, `UserProfile.authorityTier`, `SupporterBoardEntry.entryKind`, `SupporterBoardEntry.feedbackCategory`, `SupporterBoardEntry.paymentMethod`, etc.).

## 2. Attack Vectors & Defensive Gates ("Dirty Dozen+" Payloads)
1. **Unauthenticated Profile Read/Write**: `{}` with `auth = null` -> Rejected by `isSignedIn()` + catch-all `match /{document=**} { allow read, write: if false; }`.
2. **Email Spoofing (`email_verified == false`)**: `{ uid: "admin1", email: "jhammerzreal1@gmail.com", role: "admin" }` with `email_verified: false` -> Rejected by `isSignedIn()` and `isAdmin()`.
3. **Synthetic Guest / Cross-Tenant Path Traversal**: Write to `/users/userB/game_runs/run1` as `userA` -> Rejected by `isOwner(userId)`.
4. **Shadow Field Injection**: `{ ..., isVerified: true }` -> Rejected by `keys().hasAll(...) && keys().hasOnly(...)`.
5. **Document ID Poisoning**: 200-char or traversal document IDs -> Rejected by `isValidId(id)`.
6. **Self-Role Privilege Escalation**: Update `/users/userA` with `{ role: "admin" }` -> Rejected because `incoming().role == existing().role` and `affectedKeys().hasOnly(...)`.
7. **Denial-of-Wallet String/Array Overflow**: Oversized `prompt` or `allowedModules` -> Rejected by strict `.size()` limits; zero `get()`/`exists()` inside `allow list`.
8. **Cross-Tenant Query Scraping**: `collection(db, 'users/userB/artifacts')` queried by `userA` -> Rejected by `allow list: if isSignedIn() && existing().userId == request.auth.uid;`.
9. **Type & Enum Poisoning**: `GameRun` with invalid `score` or `mode` -> Rejected by `is number`, bounds, and enum allowlists.
10. **Immutable Field Overwrite & Terminal State Tampering**: Client `update` on `game_runs/{runId}` or `supporter_board/{entryId}` altering `createdAt`/`amountUsd` -> Rejected.
11. **Public Read/Write Probe Abuse**: `list` or `setDoc` against `/test/connection` -> Rejected by `allow list, write: if false;`.
12. **Orphaned Child Record Creation**: Creating `/users/userA/threads/t1/messages/m1` without parent thread -> Rejected by `exists(.../threads/$(threadId))`.
13. **Client Self-Tier & Founder Seat Elevation**: Standard user attempting to write `tierId: "tier-sovereign"`, `subscriptionStatus: "lifetime"`, or `isExecutiveArchitect: true` on `/users/userA` -> Rejected on both `create` (disallowed tier keys) and `update` (`affectedKeys().hasOnly(['username', 'email', 'displayName', 'photoURL', 'updatedAt'])`).
14. **Direct Client Supporter Wall & Tier Spoofing**: Standard user creating or tampering `/tiers/{tierId}` or `/supporter_board/{entryId}` (or injecting PII / unmasked name when `isAnonymous: true`) -> Rejected (`isAdmin()` only + schema anonymity invariant).
