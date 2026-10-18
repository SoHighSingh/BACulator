# 02 - Where a paywall / entitlement gate would live

## Findings (current state)
- Auth: NextAuth v5 + Google + PrismaAdapter, database sessions (`src/server/auth/config.ts`). The `session` callback goes through `publicSession()` (`src/server/auth/account.ts`), which whitelists id/name/email/image, so any entitlement field must be added there deliberately. Session type is augmented in config.ts (only `id`).
- tRPC (`src/server/api/trpc.ts`): `createTRPCContext` calls `auth()` once per request; only `publicProcedure` and `protectedProcedure` exist (fail-closed on missing user id). No role/plan concept.
- Every router procedure is `protectedProcedure` in `src/server/api/routers/post.ts` (analyseDrink, addDrink, updateDrink, deleteDrink, getNight, recentDrinks, userInfo, consentStatus, recordConsent, exportMyData, deleteAccount). The core logging path (addDrink, getNight) must stay free per PRODUCT.md non-negotiables (one-tap, never interrupt, offline). Natural paid candidates: `analyseDrink` (Workers AI bartender, already has `AiUsage` counters, migrations/0004), history beyond 48 h, export.
- DB: Prisma/D1 `User` (prisma/schema.prisma) has weight, sex, ageConfirmedAt, termsVersion. Migrations are hand-written SQL in `migrations/` (latest 0007_consent.sql), mirrored in schema.prisma. `deleteAccount` deletes children explicitly in a $transaction, so any new table must be added there. `exportMyData` should include entitlement rows.
- Client: `useNight` (`src/hooks/useNight.ts`) reads `useSession()`; `src/app/page.tsx` switches on session status; `useUserInfoData` wraps `post.userInfo`. Offline: `src/trpc/offline-cache.ts` persists only `post.getNight`, `post.recentDrinks`, `post.userInfo` for 48 h in localStorage, cleared on sign-out/account switch; drinks queue in `src/lib/outbox.ts`; service worker (`src/app/sw.ts`) NetworkFirst-caches `/api/auth/session` so signed-in users open offline.
- Signed-out: the app shell redirects to sign-in; public landing/maths card is static. There is no server-side signed-out calculator state to gate.

## Risks
- Paywalling the night screen violates the harm-reduction stance (an unpaid user at the bar losing the estimate or "Not safe to drive" is dangerous). Never gate: add/undo drink, the estimate, the not-safe status, emergency info, delete account, data export (legal).
- Expiry mid-night while offline: fail open (keep last known entitlement) rather than lock.
- Cached entitlement is client-trustable only for UI; server must be the enforcement point.
- Session cache in SW can be stale after upgrade/downgrade; don't put plan in the session payload.
- Webhook ordering/idempotency if Stripe (or app-store) is added; D1 has no long transactions, so use upsert keyed on provider event id.
- GDPR/Privacy: billing ids are personal data; add to export/delete paths and privacy page.

## Recommendation
Keep the free core untouched; gate only value-add features. Read entitlement from the DB per request (not the session), cached in the offline cache.

### Schema (migration `0008_entitlements.sql`, mirrored in schema.prisma)
Table `Entitlement` (one row per user, so User stays lean):
- `userId` TEXT PK -> User (onDelete cascade)
- `plan` TEXT ("free" | "plus"), default "free"
- `status` TEXT ("active" | "trialing" | "past_due" | "canceled")
- `currentPeriodEnd` DATETIME NULL, `graceUntil` DATETIME NULL
- `provider` TEXT NULL ("stripe" | "manual"), `providerCustomerId`, `providerSubId` TEXT NULL (unique index)
- `updatedAt` DATETIME
Table `BillingEvent` (`id` = provider event id PK, `type`, `receivedAt`) for webhook idempotency. Optional `grantedBy`/`note` for manual comps. Absent row == free.
Derive in one helper `src/server/entitlements.ts`: `getEntitlement(db, userId)` -> `{ plan, active, until, features: Set }`; active = status in (active, trialing, past_due within graceUntil) and (currentPeriodEnd + 3 day grace) > now.

### Server
- `trpc.ts`: add `premiumProcedure = protectedProcedure.use(async ({ctx,next}) => { const ent = await getEntitlement(ctx.db, ctx.session.user.id); if(!ent.active) throw new TRPCError({code:"FORBIDDEN", message:"PREMIUM_REQUIRED"}); return next({ctx:{...ctx, entitlement: ent}}); })`. Optionally `featureProcedure(feature)` factory for per-feature checks.
- Cheap alternative for the AI bartender: do not block; keep the catalog-first path free and make only the AI fallback premium or raise its `AiUsage` daily cap for premium. Use `ctx.entitlement` in `analyseDrinkText` limits rather than erroring.
- New router `src/server/api/routers/billing.ts`: `entitlement` query (protected), `createCheckout`, `portal`; webhook as a Next route handler `src/app/api/billing/webhook/route.ts` (verify signature with env secret, upsert Entitlement idempotently via BillingEvent).
- `env`: add Stripe keys to `src/env.js` and wrangler secrets.

### Client
- New `src/hooks/useEntitlement.ts` wrapping `api.billing.entitlement.useQuery` (enabled when signed in), returning `{ isPremium, loading, can(feature) }`; default to last cached value, never to "locked" while loading.
- Add `billing.entitlement` to the `PERSISTED` set in `src/trpc/offline-cache.ts` (cleared with the rest on sign-out, same 48 h maxAge; consider a longer 7-day maxAge for this key only, since an expired paid user going offline should keep access through grace).
- Gate in UI by feature component (e.g. history, export-more), showing an upgrade card, never a modal on the logging path. Handle server `PREMIUM_REQUIRED` by showing the same card (server wins if cache is stale).

### Offline / signed-out behaviour
- Offline, signed in: cached entitlement used; if cache is missing or older than maxAge, treat as free for premium extras only (core stays fully usable). Outbox replay of addDrink is unaffected (protectedProcedure only).
- Signed-out: no entitlement; landing/public pages stay free; premium features hidden. Sign-in then fetches entitlement; `claimOfflineCache` already wipes another account's cached entitlement on user switch.
- Downgrade while offline resolves on next online refetch (refetchOnReconnect already default); server enforces regardless.

## Files to change / add
- prisma/schema.prisma (Entitlement, BillingEvent, User relation)
- migrations/0008_entitlements.sql (new)
- src/server/entitlements.ts (new)
- src/server/api/trpc.ts (premiumProcedure)
- src/server/api/root.ts (register billing router); src/server/api/routers/billing.ts (new)
- src/server/api/routers/post.ts (use premium/ctx.entitlement on analyseDrink limits and any history/export; extend deleteAccount transaction and exportMyData to include Entitlement)
- src/server/bartender.ts / AiUsage limit logic (premium cap)
- src/app/api/billing/webhook/route.ts (new); src/env.js
- src/hooks/useEntitlement.ts (new); src/trpc/offline-cache.ts (PERSISTED, maybe per-key maxAge)
- Gated UI components under src/components/ plus an upgrade card; src/app/(legal)/privacy/page.tsx and terms (billing data, refunds)
- Tests: new `src/server/entitlements.test.ts`, extend `src/server/api/routers/consent-export.test.ts` pattern for delete/export coverage.
- Do NOT put plan in `publicSession`/`src/server/auth/account.ts` (SW caches the session and it would go stale).
