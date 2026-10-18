# 15 · Observability and metrics (reconstructed from the analyst's hand-back; the original file was not saved)

- **Today:** no Sentry, logger, analytics or health route, and no `observability` block in `wrangler.jsonc`. The only server log is a dev-only `console.error` in `src/app/api/trpc/[trpc]/route.ts`, so production tRPC errors are silent. `onAiError` in `pipeline.ts` has no consumer. Client sync failures and bare `catch {}` blocks are unreported.
- **Privacy constraint:** the privacy page (`src/app/(legal)/privacy/page.tsx`, ~line 108) promises "No advertising, analytics or tracking cookies". Keep that true, or change the wording and `TERMS_VERSION` first.
- **Workers Logs:** enable `observability` with invocation logs off, because tRPC GET inputs sit in the URL and could carry drink data. Add an allowlist structured logger that logs error codes only, never raw `err.message`.
- **Errors:** a same-origin `/api/report` beacon (code, route, build) plus a CSP report endpoint. Sentry is the fallback, with PII, breadcrumbs and Replay off and a same-origin tunnel.
- **Health and uptime:**
  - `/api/health` runs `SELECT 1` on D1 and returns only ok and the build, with no AI call; `/api/ping` has no DB call. Keep both out of the service worker.
  - An external uptime monitor on both, with two alert channels.
  - D1 Time Travel restore steps plus a weekly encrypted `wrangler d1 export`.
- **Product metrics:** Workers Analytics Engine, server-side, with no user id, session id or IP. Track consent, first drink, the AI layer and its outcome, and the paywall funnel, as aggregate ratios, suppressing counts under 10.
  - Before any paywall, collect about 4 weeks of baseline.
  - Measure mission outcomes (getting-home views, nights ended at zero), never drinks per user.
  - No upsell during a high-BAC night, and no A/B tests on safety information.
- **CSP:** logs, Analytics Engine, the beacon and health routes need no CSP change. Cloudflare Web Analytics would need `static.cloudflareinsights.com` in script-src and `cloudflareinsights.com` in connect-src, and it contradicts the privacy copy, so skip it. Hosted Stripe Checkout needs only `checkout.stripe.com` in form-action.
