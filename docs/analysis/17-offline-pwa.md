# 17. Offline / PWA robustness (read-only analysis)

Files reviewed: src/lib/outbox.ts, src/hooks/useNight.ts, src/app/sw.ts, src/trpc/offline-cache.ts, src/app/manifest.ts, src/server/api/routers/post.ts, src/lib/night-model.ts.
The design is solid overall (clientId idempotency, ordered flush, memory fallback, userId-scoped outbox). Risks ranked below.

## Ranked risks

1. HIGH - Server time window silently drops legitimately queued drinks. post.ts:50-56 (`drinkTime`) rejects finishedAt later than now+5min or earlier than now-48h with BAD_REQUEST. night-model.ts:142 maps BAD_REQUEST to "drop", and useNight.ts:174-181 deletes the entry (irreversible, outbox.ts:74) and shows a generic error.
   - Clock skew: a phone clock more than 5 min fast has every add rejected and dropped, even online. Nothing compares device time to server time.
   - Long offline gap beyond 48h (flat phone, roaming, restored storage): the whole queue is dropped.
   - Fixes: clamp to server now on skew rather than reject; estimate offset from a response Date header; keep dropped entries in a "couldn't sync" list instead of deleting.
2. HIGH - Sign-out with pending drinks. UserInfoSlideOut.tsx:36-40 clears query cache and offline cache then signs out with no outbox check or warning. The outbox survives (keyed by userId, outbox.ts:49,55) but is unreachable until the same user returns (flush returns early on no userId, useNight.ts:138). Nobody is told it exists; if another account signs in, the first user's drinks stay on disk indefinitely (privacy residue, quota). page.tsx:100 signOut path does not call clearOfflineCache (only the slide-out does). Account delete correctly calls clearOutbox (account/delete/page.tsx:41).
3. MEDIUM - Multiple tabs / duplicate flushes. The `flushing` guard is a per-tab ref (useNight.ts:70-71,139). Two tabs or tab plus installed PWA each read listOutbox and send the same entries. Data is safe: addDrink dedupes by clientId with a unique-violation fallback (post.ts:224-245), and a second delete gives NOT_FOUND which maps to "done" (night-model.ts:141). Costs: wasted requests, and UI staleness since queue state is React-local (useNight.ts:66). Use `navigator.locks` or BroadcastChannel.
4. MEDIUM - Quota exceeded / IndexedDB failure. outbox.ts:63-68 falls back to memory (good), but the "saved on this phone" badge then lies: memory entries vanish on reload with no hint. Memory seqs start at 1e12 (outbox.ts:69) so they sort after all disk entries even when older. `openDb` caches a null result forever after any onerror/onblocked (outbox.ts:20-35), so a transient failure disables persistence until reload; no `onversionchange` handler. removeOutbox swallows disk errors (outbox.ts:77), so a failed delete leaves the entry to be re-sent (safe because of clientId). The localStorage persister (offline-cache.ts:23) behaviour on quota error is unverified.
5. MEDIUM - iOS Safari 7-day eviction. Home-screen-installed PWAs are exempt from the 7-day cap on script-writable storage; plain Safari tabs are not. Non-installed users can lose IndexedDB, localStorage and SW caches after 7 days unvisited, so the cached shell and any unsynced drinks can vanish. `navigator.storage.persist()` is never called (no match in src). Add an iOS install nudge and a persistent "N drinks only on this phone" indicator.
6. MEDIUM - Service worker update flow. sw.ts:32-33 uses `skipWaiting: true, clientsClaim: true`, and next.config.js:57 sets `reloadOnOnline: false`. A new SW takes over a page that is already open; that old page may request hashed /_next/static chunks removed from the new precache and get 404s mid-session (the CacheFirst runtime cache at sw.ts:52-57 only helps for previously fetched files). No "update available" prompt exists. The document fallback (sw.ts:68-70) serves "/" for any failed document request, including /account/delete, which can mislead.
7. MEDIUM - Stale cached session. sw.ts:38-40 is NetworkFirst for /api/auth/session with a 4 s timeout, no ExpirationPlugin, and no clearing on sign-out. The `pages` cache (sw.ts:42-49) stores authenticated HTML for 30 days, also uncleared on sign-out. On a shared phone the previous user's session JSON and pages persist in Cache Storage until overwritten online. A server-expired session offline still looks signed in; the flush then gets UNAUTHORIZED and shows SIGNED_OUT with the queue kept (useNight.ts:31,170-172), which is correct. Delete the `auth-session` and `pages` caches on sign-out.
8. LOW - Poison entry stalls the queue. "retry" is the default outcome for any unrecognised code, including INTERNAL_SERVER_ERROR (night-model.ts:143), so one entry that always 500s blocks every later drink forever with growing backoff to 60 s (useNight.ts:164-168). Add a max attempt count.
9. LOW - Owner check race. claimOfflineCache runs in an effect after restore (useNight.ts:217-219, offline-cache.ts:45), so another account's persisted night can flash before resetQueries on the abnormal path (session expired, different account). Normal sign-out clears it.
10. LOW - add-then-undo before the IndexedDB write resolves relies on cancelledUnstored and cancelledSeqs refs (useNight.ts:74-76,199-203). Appears handled (and unit tested per the header comment).

## Entitlement check offline, if a paywall is added
Nothing exists today.
- Never gate logging or the BAC estimate on a network entitlement check; an offline drinker must still log. Gate extras only.
- night-model.ts:142 maps FORBIDDEN to "drop". A lapsed entitlement returning FORBIDDEN from addDrink would delete queued drinks. Keep addDrink ungated, or use a code that maps to retry/keep.
- The session response is cached indefinitely by the SW (sw.ts:38-40), so an entitlement flag read from it is stale both ways: revoked users keep access offline and new purchasers do not see access until a fresh online fetch.
- Use a signed token with a grace window (about 7-14 days since last verification), fail open for read/log paths offline, and fail closed only for new purchases. Do not rely on device clock (see risk 1); use server timestamps.
- iOS eviction (risk 5) would wipe cached entitlement: treat unknown as free tier for extras, never as locked out.

## Manifest / install experience
manifest.ts is good: id and start_url "/", standalone, portrait, 192 and 512 "any" icons plus a 512 maskable, dark background and theme colours. Gaps:
- No `scope`, `lang`, `categories`, `shortcuts` (for example "Add a drink") or `screenshots` (Chrome's richer install sheet needs them).
- No in-app install prompt (`beforeinstallprompt`) or iOS Add to Home Screen guidance, which matters given risk 5.
- Verify an apple-touch-icon (180x180) exists in the layout; iOS ignores manifest icons for the home-screen icon. Not checked here.
- Cold offline start works only after one online visit that installed the SW; expected.

## Suggested order
1) Stop silently dropping on time-window BAD_REQUEST (clamp or skew-correct, keep a recovery list). 2) Warn on sign-out when the outbox is non-empty; clear SW `auth-session` and `pages` caches on sign-out; make page.tsx:100 match the slide-out. 3) Web Locks across tabs plus `navigator.storage.persist()`. 4) SW update toast, cap poison-entry retries. 5) Install nudge plus manifest shortcuts/screenshots. 6) If a paywall arrives, never gate logging and never let FORBIDDEN drop queued drinks.
