# BACulator — handoff (17 Oct 2026)

Read this, then `PRODUCT.md` (who it's for, non-negotiables) and `DESIGN.md` (current tokens). Don't re-read old components; they're deleted.

## Where things are
- **Repo:** `C:\Users\agams\BACulator`, GitHub `SoHighSingh/BACulator`. Work happens on branch `cloudflare-d1-migration`; `main` on GitHub is at `7816ae6` (migration + formula fix + tests + CI) and is **behind** the branch.
- **Stack:** Next.js 15 / React 19 / Tailwind 4 / tRPC / Prisma on **Cloudflare Workers (OpenNext) + D1**. Auth: NextAuth Google. CI: `.github/workflows/ci.yml` (lint, typecheck, vitest, OpenNext build). Vercel auto-deploys are off (`vercel.json`).
- **Checks:** `npm run lint`, `npm run typecheck`, `npm test` (546 tests), `SKIP_ENV_VALIDATION=1 npx opennextjs-cloudflare build`. Local dev: `npm run dev` (local D1 via wrangler; `npm run db:migrate:local` first).

## Done
- BAC engine rewritten as a minute-step simulation (old model "banked" sober time and under-read by up to 0.13). `src/lib/bac-calculator.ts`, 50-scenario test suite.
- Free AI bartender: catalog-first parser + Workers AI fallback, code computes standards (`src/lib/drinks/*`, `src/server/bartender.ts`). Gemini removed. Old Gemini key was leaked via the old Vercel bundle, the Google Cloud project `baculator-466810` was suspended for hijacking and has been **shut down** (no billing account, no cost).
- New Google OAuth client "BACulator Web" in project `baculator-app` (redirects for baculator.com, www, workers.dev, localhost:3000/8787). Consent screen is still **Testing**: Google needs live homepage + privacy URLs before "Publish app".
- `/privacy`, `/terms`, `/account/delete` pages (by the migration session; wording awaiting the user's review).
- **Phase 1 redesign (functional, not yet the visual upgrade):** new night screen in `src/components/night/*` + `src/hooks/useNight.ts` + `src/lib/estimate-display.ts`:
  - estimate shown as a ±20% band, "Not safe to drive" whenever > 0, back-to-zero as a time window; no 0.05 countdown, no limit colours
  - one-tap "Same again" + up to 4 recents; add sheet with type-or-pick, 56px stepper, time chips (no clock picker)
  - persistent "Last added" + 2-min Undo (also undoes removals), double-tap guard
  - estimate uses all drinks from the last 24 h regardless of session (`post.getNight`); `addDrink` auto-starts a session; `recentDrinks` procedure
  - static UI (WebGL veil, waves, pulses, joke copy, refresh notifications removed), ≥48px targets, 7:1+ text contrast, pinch-zoom on
  - SEO basics: global title/description, canonical www, JSON-LD WebApplication, `robots.ts`, `sitemap.ts`
  - copy is now global (no "Australia"), per the user.

## Not done / next (in priority order)
1. **Go-live (owned by the migration session `local_57f76079…`):** user approves privacy/terms wording → push → `wrangler secret put` AUTH_SECRET / GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET → `npm run db:migrate:remote` → `npm run deploy` → set Branding homepage `https://www.baculator.com` + privacy `/privacy` in Google Auth Platform (project `baculator-app`) → Publish app → point baculator.com DNS from Vercel to the Worker (Vercel still serves the old build). Coordinate before pushing `main` so the two sessions don't race.
2. **The visual upgrade ("insane UI").** Phase 1 is deliberately plain. Next: run Impeccable `shape`/new-work for the landing page (Persuade mode) and a richer but still-static night screen (Operate mode), using Taste for direction and React Bits only on the public landing page / Remotion promo (never on the logging path; honour `prefers-reduced-motion`). Keep every rule in `PRODUCT.md` → Non-negotiables and the `designing-for-impaired-users` skill.
3. **Global/US version:** region setting (AU/UK 10 g vs US 14 g standard drink, kg/lb, ml/oz, serve chips per region, emergency number 000/911, catalog entries for US brands). `GRAMS_PER_STANDARD` and `MANUAL_CHIPS` are the hard-coded AU spots; `GetHome` hard-codes 000.
4. **Public calculator at `/`** (no sign-in; drinks in localStorage, "sign in to save") + evergreen pages (standard drinks guide, how long until sober, how the estimate works, limits by country). Then add them to `sitemap.ts`.
5. Offline-first logging (IndexedDB queue, idempotent sync with a client id on Drink).
6. Legal: install the `claude-for-legal` plugins `privacy-legal` and `product-legal` (user scope) from the marketplace `anthropics/claude-for-legal`, then run launch-review / marketing-claims-review on the copy. Vetted: no hooks or local code; leave its MCP connectors disconnected; skip `legal-builder-hub`. Coverage of Australian law is thin — name the Privacy Act 1988/APPs and ACL explicitly, and US state privacy laws for the US version.

## Skills installed in `~/.claude/skills` (all vetted)
`designing-for-impaired-users` (our own), `impeccable` (instructions only — no scripts/hooks), `taste-skill`, `redesign-skill`, `remotion-*` (12), `seo*` from claude-seo (26, no scripts/hooks; 19 agents in `~/.claude/agents`), `psychologist-analyst` (weak fit). React Bits: use via shadcn registry (`"@react-bits": "https://reactbits.dev/r/{name}.json"` in `components.json`, `-TS-TW` variants; MIT + Commons Clause) — components aren't frame-driven, so port them to `useCurrentFrame` for Remotion.

## Gotchas
- Windows checkout: some files have CRLF; scripted string edits need `sed -i 's/\r$//'` first.
- The dev-time Google sign-in won't work until the consent screen is published or the user is added as a test user.
- `getDrinks`, `getCurrentTab`, `startTab`, `stopTab` tRPC procedures are now unused by the UI; safe to delete once nothing else depends on them.
