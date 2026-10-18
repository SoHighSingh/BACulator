# 04 Security review (read-only, 18 Oct 2026)

Scope: tRPC authz, validation, headers/CSP, session, deletion, export, AI limits, secrets, dev routes. Items already fixed in HANDOFF.md "Security" are not repeated. No Critical or High issues found.

## Findings (by severity)

### Medium
1. **Consent and age gate are client-side only.** `recordConsent` stores the flag (`src/server/api/routers/post.ts:129-137`) but no procedure checks `ageConfirmedAt` / `termsVersion` (`addDrink` :213, `analyseDrink` :103). Anyone calling `/api/trpc` directly skips the 18+/21+ gate. Fix: a `consentedProcedure` middleware built on `src/server/api/trpc.ts:121`, used by everything except `consentStatus`, `recordConsent`, `deleteAccount`, `exportMyData`.
2. **Global AI budget can be drained by a few accounts.** Per-user cap 50/day vs global 250/day (`src/lib/drinks/ai-quota.ts:9-14`); 5 Google accounts exhaust the day for everyone (AI falls back to manual entry, so it degrades a nicety, not logging). Fix: lower the per-user day cap (e.g. 15), or require some logged drinks or account age before AI use.
3. **Shared ParseCache can be poisoned by prompt injection.** AI output is cached globally by normalised text (`src/server/bartender.ts:35-38`) and served to all users (:28-34). A crafted short phrase (<=48 chars) could coax an under-stated abv into a row other users hit with the same phrase. Under-estimating alcohol is the harmful direction in a safety app. Confirm `src/lib/drinks/ai.ts` (~:97-175) clamps abv, volume and count to sane ranges per category; the fenced user message (`ai.ts:175`) is only a soft defence. Not verified in this pass.
4. **No server-side rate limit on non-AI mutations.** `addDrink` (post.ts:213), `updateDrink` (:247), `deleteDrink` (:264), `updateUserInfo` (:189) have no throttle; zod caps each value (standards <= 50, count <= 100) but a signed-in user can write unlimited rows (D1 rows-written cost). `cleanupOldTabs` (post.ts:21-44) keeps 5 tabs but not a drinks-per-tab cap. Fix: cap drinks per tab (e.g. 200) in `addDrink`, or reuse the `AiUsage` counter for a writes/min limit.

### Low
5. **CSP `script-src 'unsafe-inline'`** (`next.config.js:27`). Documented trade-off. Still blocks other-origin scripts, frames, connects and form posts. Revisit if user-generated HTML is ever rendered (none today).
6. **Permissions-Policy allows `microphone=(self)`** (`next.config.js:50`): tighten to `()` if no voice input exists. HSTS has `preload` + `includeSubDomains` (:47): confirm every `*.baculator.com` subdomain is HTTPS before submitting to the preload list (hard to undo).
7. **`trustHost: true`** (`src/server/auth/config.ts:60`). Callback URLs derive from the Host header. Acceptable behind the custom-domain routes in `wrangler.jsonc`; if a `workers.dev` route is ever enabled, set `AUTH_URL` explicitly.
8. **Account deletion leaves AI counters.** `deleteAccount` (post.ts:108-119) is atomic and removes drinks, tabs, sessions, accounts, user. But `AiUsage` keys embed the user id (`ai-quota.ts:34-35`) and survive up to ~2 days until pruned (`bartender.ts:140-150`). No PII, but add a delete to the transaction for a clean erasure story. ParseCache holds no user data.
9. **clientId existence oracle.** `findByClientId` (post.ts:88-94) returns CONFLICT for another user's clientId. UUIDs are unguessable; negligible.
10. **Client-claimed metadata.** `source` and `confidence` from `drinkDetailsSchema` (post.ts:10-18) are spread into the row (:236); users can claim `"ai"`/`"catalog"`. Not a security hole, but do not trust it for analytics.
11. **Prod error messages.** The `errorFormatter` (`trpc.ts:46-58`) does not mask non-TRPCError messages; Prisma error text can leak table or column names to the client. Map unknown errors to a generic message in production.

### Verified OK (no action)
- **Authz on every procedure:** all 13 procedures in `postRouter` (post.ts:103-297) use `protectedProcedure`; `publicProcedure` (`trpc.ts:111`) is exported but unused. The guard fails closed on a missing or empty id (`trpc.ts:121-135`). Every query is scoped by `ctx.session.user.id` (`tab: { userId }` or `{ userId }`); `updateDrink` / `deleteDrink` go through `findOwnDrink` (post.ts:96-100) or `findByClientId` before writing.
- **Session endpoint:** `publicSession` builds the object field by field (`src/server/auth/account.ts:87-95`): no session token, weight or sex. Google tokens are dropped (`withoutTokens`, :73-80, wired at `config.ts:57`). Database sessions, so cookies are opaque and revocable.
- **Data export:** `exportMyData` (post.ts:140-188) uses an explicit `select`, scoped to the caller, omits tokens, ids and clientIds. It is a GET query, so a cross-origin page cannot read it.
- **CSRF:** mutations are POST with JSON via tRPC; Auth.js cookies default to SameSite=Lax, so cross-site POSTs carry no session.
- **Headers:** CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `upgrade-insecure-requests` in prod, on `/:path*` (`next.config.js:20-53`). The service worker is same-origin so `worker-src` falls back to `default-src 'self'`.
- **Secrets:** `.dev.vars*` is gitignored (`.gitignore:54-55`); `git ls-files` shows only `.dev.vars.example` and `scripts/load-dev-vars.js`. `src/env.js:9-17` requires `AUTH_SECRET` in production; no `NEXT_PUBLIC_` secrets. `wrangler.jsonc` holds only the D1 id and bindings. HANDOFF still says the user must rotate old secrets by hand.
- **AI limits:** atomic upsert counters (`bartender.ts:115-123`), user budgets taken before the global one (`ai-quota.ts:94-96`), store errors fail closed, per-isolate breaker, input capped at 200 chars by zod (post.ts:104) and 300 plus triple-quote stripping before the model (`ai.ts:175`).
- **Dev routes in prod:** `src/app/dev/**` 404s via `process.env.NODE_ENV === "production"` then `notFound()`:
  - `src/app/dev/directions/layout.tsx:4-9` covers all 20 child pages (none check themselves); `force-dynamic`.
  - `src/app/dev/night/page.tsx:9`, `src/app/dev/onboarding/page.tsx:9`, `directions/morph/page.tsx:9`, `directions/morph/rising/page.tsx:9`.
  - `next build` inlines `NODE_ENV`, so the check is static and reliable. Weakness: protection is per-file convention (no `src/app/dev/layout.tsx`, no middleware), so a new `src/app/dev/foo/page.tsx` is exposed unless the author remembers. Recommend one `src/app/dev/layout.tsx` with the same guard (defence in depth), and check `public/` for dev-only assets that would be served regardless. Source-level verification only: no build or curl of `/dev/...` was run (read-only task).

## Suggested fix order
1. Server-side consent gate (#1). 2. Drinks-per-tab / write cap (#4). 3. Validate AI output and reconsider the shared cache (#3). 4. Lower the per-user AI day cap (#2). 5. Top-level `/dev` layout guard. 6. Generic prod error messages (#11) and `AiUsage` erasure (#8).
