# 03 · Payments integration (reconstructed from the analyst's hand-back; the original file was not saved)

Provider facts are from the analyst's background knowledge, not a live lookup: re-verify before building.

- No billing exists. PRODUCT.md forbids upsells or interruptions on the logging path, so only secondary features off the night screen can be paid.
- **Workers compatibility:** Stripe needs `createFetchHttpClient()` and the async `constructEventAsync` with `createSubtleCryptoProvider()`, because the sync `constructEvent` needs Node crypto. Paddle and Lemon Squeezy: REST over fetch, and HMAC-SHA256 via `crypto.subtle` over the raw body (`req.text()`). RevenueCat webhooks use a shared Authorization header.
- **Recommendation:** Paddle (merchant of record; handles global tax), or Stripe Managed Payments if available. Add RevenueCat later for native apps, writing to the same provider-neutral Entitlement table.
- **Where it lands:**
  - `src/app/api/webhooks/<provider>/route.ts`
  - a `billing` tRPC router in `src/server/api/routers`, registered in `root.ts`
  - Entitlement and WebhookEvent (idempotency) models in a new migration, `0008_billing`
  - secrets in `src/env.js` and `wrangler secret`
  - exclude `/api/*` from the service worker
  - cache `isPro` offline with a grace period
  - cancel the subscription from `/account/delete`
  - bump `TERMS_VERSION`
- **CSP (`next.config.js`):** a hosted redirect checkout needs no change (recommended). Overlay or embedded flows need provider origins in script-src, frame-src and connect-src; scope them to the billing page. Stripe Elements needs `Permissions-Policy payment` loosened.
- **Policy risk:** processors may treat the app as alcohol- or health-adjacent. Get written pre-approval from Paddle or Stripe, keep the "estimate only / never fit to drive" copy, and keep a backup provider.
- **App stores:** in-app unlocks need Apple IAP or Play Billing (15–30%). US link-out rules changed in 2025, so re-check them at submission. Apple rules 1.4.3, 1.4.1 and 4.8 (Sign in with Apple, since Google login is offered) apply.
