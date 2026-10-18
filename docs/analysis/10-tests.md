# Test coverage gaps and strategy (BACulator)

Method: static read only. `@vitest/coverage-v8` is NOT installed (only expect/mocker/runner/snapshot/spy/utils), vitest runs `src/**/*.test.ts` in `environment: node`, so there are no coverage numbers and no component tests today. playwright-core is a dependency (used by scripts/shoot.mjs) but there is no @playwright/test runner.

## What is covered (pure logic, good)
- bac-calculator, night-model (mergeNight, client ids, syncFailure, double-tap, recents), region (guess, conversions, formatVolume, kg/weight), consent helpers, drinks parse + ai-quota, estimate-display, format-clock, brand-mark-svg, auth/account (token stripping, publicSession).
- Router: only consentStatus, recordConsent and exportMyData (consent-export.test.ts), via `createCallerFactory` with a mocked db. That pattern is the foundation for most recommendations below.

## Critical paths with NO tests
1. tRPC authz: the fail-closed `protectedProcedure` guard (trpc.ts) has no test. Nothing asserts that a null session or empty id gets UNAUTHORIZED on every procedure.
2. Tenant isolation in post.ts: `findOwnDrink`, `findByClientId` (CONFLICT when the clientId belongs to another user), updateDrink/deleteDrink on someone else's drink. Security-critical, zero tests.
3. addDrink idempotency: clientId replay returns the saved row; unique-violation race fallback (`isUniqueViolation`); `findOrStartTab` race fallback; standards bounds (positive, max 50); drinkTime validation.
4. deleteAccount: transaction contents and order. Check that aiUsage / parseCache rows hold no user id, or add them to the transaction; a test should assert every table with a userId is covered (derive the list from schema.prisma).
5. Offline outbox (`lib/outbox.ts`): IndexedDB path, in-memory fallback, seq ordering (memory seq starts at 1e12 so it sorts after disk), per-user filtering, `clearOutbox`. Needs `fake-indexeddb` (not installed).
6. Sync loop in `hooks/useNight.ts` (replay order, retry/drop/signedOut, double replay) and `trpc/offline-cache.ts` (48h max age, `claimOfflineCache` user switch so user B never sees user A's cached night). Only the pure `syncFailure` mapping is tested.
7. Consent/age gate wiring: helpers are tested, but `app/page.tsx` (`mustConsent`, pending consent from localStorage, 18/21 by region) is not. Risk: the gate shows only when `consent.isSuccess`, so a failed consentStatus query means no gate.
8. Migrations 0001-0007 are never executed in CI. 0006 has a data-fixing UPDATE plus a partial unique index (`Tab_one_open_per_user`); nothing proves it applies on a DB with duplicate open tabs.
9. AddSheet / AddDock / EditDrinkSheet / TonightList (add flow UI): no component or e2e tests.
10. AlertFavicon: the DOM dance (park originals' rel, append ours, restore on cleanup/unmount) is untested and regresses silently.
11. bartender.ts `analyseDrinkText` (rate limiting, quota, cache pruning) is only covered via the pure ai-quota/pipeline pieces.
12. Region: pure math is tested; untested is the UI round trip (stored as standards/kg, shown in oz/lb) and useRegion persistence/guess.

## Top 10 tests to add (ordered by value)
1. **Authz matrix** (router caller with `session: null`, `{user:{}}`, `{user:{id:""}}`): every procedure in postRouter rejects with UNAUTHORIZED and never touches db. Loop over `Object.keys(postRouter._def.procedures)` so new procedures are covered automatically (also catches a future paid or public procedure added by mistake).
2. **Cross-user isolation**: user B calling updateDrink/deleteDrink with A's drinkId gets NOT_FOUND; addDrink/deleteDrink with A's clientId gets CONFLICT and reveals nothing. Use a real sqlite with the real migrations (or a fake) rather than hand mocks so `where: {tab:{userId}}` is truly exercised.
3. **addDrink idempotency**: same clientId twice yields one row; concurrent duplicate (create throws unique violation) returns the saved row; two-open-tabs race resolves to one tab.
4. **deleteAccount completeness**: after the call no row for the user remains in any table (table list generated from schema.prisma); other users untouched; single batch.
5. **Migrations apply from scratch and incrementally**: run migrations/*.sql in order on sqlite (prefer wrangler/miniflare local D1 since prod is D1); a fixture with duplicate open tabs before 0006 proves the newest survives and the unique index rejects a second open tab; schema equals schema.prisma (prisma migrate diff in CI).
6. **Outbox with fake-indexeddb**: put/list ordering, per-user isolation, remove, clear, and fallback when `indexedDB` is undefined or `add` throws (the drink must still be kept in memory).
7. **Sync loop**: extract the replay function from useNight into `lib/` and test with a stub client failing with network / UNAUTHORIZED / BAD_REQUEST / CONFLICT: retry keeps the entry, drop removes it, signedOut halts, order preserved, replay twice is harmless.
8. **Offline cache**: `claimOfflineCache` true on user change and cache cleared; `shouldPersistQuery` excludes what it should; entries older than 48h are not restored.
9. **Consent gate (e2e or jsdom)**: null or old `termsVersion` shows the gate and blocks the night screen; accept calls recordConsent with the right legal age (18 metric / 21 US); bumping TERMS_VERSION re-prompts; a test pins the current version string so legal changes are deliberate.
10. **AlertFavicon (happy-dom, per-file `// @vitest-environment happy-dom`)**: alert true gives exactly one `link[data-alert-favicon]` appended last and originals' rel parked; false or unmount restores originals exactly; repeated toggling never leaks links.

Honorable mentions: region round-trip property test for all serves in both regions; exportMyData shape contract (so new columns, e.g. billing, are not leaked); analyseDrink input limits (empty, 201 chars).

## Tooling changes (small)
- Add devDeps: `@vitest/coverage-v8`, `fake-indexeddb`, `happy-dom`, and either `better-sqlite3` or miniflare/wrangler local D1.
- vitest.config.ts: add `coverage: { provider: "v8", include: ["src/lib/**","src/server/**","src/trpc/**","src/hooks/**"] }`, include `*.test.tsx`, add a `test:ci` script. Start thresholds near current numbers and ratchet.
- Extract logic out of hooks/pages (sync replay, consent decision) into pure `lib/` functions; cheaper than component tests and matches how night-model is already tested.

## Playwright end-to-end: yes, but small
Add about 5 smoke specs, not a large suite. shoot.mjs already proves Chrome launches via playwright-core and that `/dev/night` renders without auth. Move to `@playwright/test` (same browser; keep shoot.mjs for screenshots).
- Drive `/dev/night` (no auth) for the add flow: open dock, add a standard, undo, edit time, status turns not-safe, favicon becomes the alert one. This covers AlertFavicon and the add UI in a real browser.
- Offline: `context.setOffline(true)`, add 2 drinks, reload (outbox persists in IndexedDB), go online, assert both appear exactly once. Highest-value e2e: covers outbox + sync + idempotency together.
- Auth/consent/delete need a seeded test session: a test-only sign-in path or injected session cookie against `wrangler dev --local` with local D1 and migrations applied, never prod. Specs: new user sees consent gate; account delete clears data and the outbox.
- 375x812 touch project and a reduced-motion project, as in shoot.mjs; reuse its overflow check.
- CI on PRs, chromium only, under about 2 minutes.

## What a paywall would need tested
(No billing code exists yet.)
- Entitlement is server-authoritative: a `paidProcedure` middleware tested like #1 (free, paid, expired, refunded, past_due, unknown all handled; fails closed). Never trust client flags.
- Webhook handler (Stripe or app store): signature verification (bad, missing, stale timestamp), idempotency on replayed event ids, out-of-order events (cancel before create), unknown user, partial failure leaves consistent state. Use recorded provider fixtures.
- Safety is never paywalled: BAC estimate, the not-safe warning, offline logging and getting-home info must work for a free user; a test asserts those procedures stay free.
- AI quota interplay: paid vs free limits through `limitAi` / AI_LIMITS; breaker behavior unchanged.
- Offline: drinks queued while paid are replayed after expiry; entitlement lapsing mid-night never drops or blocks logged drinks.
- Account deletion: handles or surfaces the active subscription, deletes billing rows; `exportMyData` includes or deliberately omits billing data; billing migration covered by test #5.
- Consent: bump TERMS_VERSION when pricing terms are added (re-prompts via needsConsent); under-age users cannot reach checkout.
- E2E in provider test mode (test keys, test clocks) for checkout success, cancel, failed card; never real cards.
- Privacy: billing identifiers never appear in publicSession or any client payload.
