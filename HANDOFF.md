# BACulator — handoff (18 Oct 2026, evening)

Read this, then `PRODUCT.md` (who it's for, non-negotiables, the user's decisions) and `DESIGN.md` (what's built now). This file covers: where the code is, what the seven-agent audit found and what's still open, the three side branches waiting to merge, and the brief for the next visual direction.

## Next session (from 22 Oct 2026): read first
The kickoff prompt is in `docs/next-session/KICKOFF.md`. The user's own list, word for word, is in `docs/next-session/00-user-list.md`. Five read-only audits back it up:

| Report | What it covers |
|---|---|
| `01-motion-exits.md` | Every sheet opens with motion and unmounts instantly (no exit keyframes, the scrim snaps). One CSS fix in `Sheet.tsx` and `globals.css` covers five sheets; a `usePresence` hook covers the composer and Earlier. |
| `02-add-flow-and-bugs.md` | The edit bug's probable root cause (`useNight.ts:277` `remove()` drops a queued add without a delete, though it may have reached the server). Slider jank, measured at 61 hard rungs and 2–3 px per step. The two-step add spec. |
| `03-clutter-tab-details.md` | Keep/cut lists, the Numbers row (the engine can supply "below 0.05" as a range), the Your tab and details redesigns, the third-digit spec, the scrollbar fix. Mocks are in `.shots/next-session/`. |
| `04-voice-and-parse.md` | "vodka red bull" → "Vodka" is a parser bug: the mixer is matched, then dropped. Voice fails from interim results, `continuous=false` stopping at the first pause, silent errors, and the mic being offered on iOS standalone. |
| `05-friction-walk.md` | 28 new issues with screenshots, plus tap counts. A live blocker: the landing maths card's "drive → not safe" row and raw 4-decimal BAC. |

**Open decisions to ask the user first:**
1. **Repeat drink.** A strict two-step add makes a repeat 3 taps. Keep 2 by giving recents an inline "Add now" key, or always ask the time?
2. **Numbers row wording.** "Below 0.05" (the audit's pick: no legal framing) or "Back to 0.05" (the user's words)?
3. **Third digit and the red rule.** Red currently starts at ceil2 ≥ 0.05, so the screen could show "0.04₃" in red. Move red to the shown three-decimal value (about 35 minutes later), or accept the gap?
4. **Your tab.** Move Remove into the Edit sheet so each row is one clean line (Undo still covers mistakes)?

**Known facts for the work:**
- The edit bug doesn't reproduce on `/dev/night`, because DevNight edits in place. Test the real `NightScreen`/`useNight` path, or a unit test on `night-model`.
- In production a just-added drink isn't counted for up to 30 s, because `now` isn't refreshed on add.
- The first drink shows 0.00 with no bar, then "under 0.01", then 0.01: three layout shapes. This ties into the engine lag in `docs/analysis/06-bac-engine.md`.

## 22 Oct 2026: deployed
- **Live at baculator.com** (Worker version `84e64fcf-00f7-4517-b6b6-9eff1a7c515a`), from `cloudflare-d1-migration` (the code was not pushed to GitHub).
- **Remote D1:** migrations 0004–0008 applied on 22 Oct (the database had 0 users before). The pre-migration export is in `backups/` (gitignored).
- **How it was deployed:** Wrangler needs Node 22+, and the default Node here is 20, so put nvm's `C:/Users/agams/AppData/Local/nvm/v24.0.1` on PATH. Build in a throwaway worktree, because the `.env` files in the main checkout block `build:worker`.
- **Next 16.4 (22 Oct; live version `9dfb382d`):** upgraded, so the unsupported-version flag is gone. To deploy: from a throwaway worktree with Node 24 on PATH, run `npm ci`, `SKIP_ENV_VALIDATION=1 npm run build:worker`, then `npx opennextjs-cloudflare deploy`. `build` is `next build --webpack` (Serwist needs webpack). Lint is the ESLint CLI (`npm run lint`). The React Compiler hook rules (`react-hooks/refs`, `set-state-in-effect`, `purity`, `immutability`) are warnings: about 70 sites, mostly the night and landing hooks and the dev labs, need refactoring before turning them back to errors.
- **Sign-in fix (22 Oct, version `49f9a3b7`):** production sign-in had never worked. The Worker bundle resolved `@prisma/client` to its Node entry, which needs a native query engine, so every database call failed and Auth.js showed "Configuration". `src/server/prisma-client.ts` now picks the build by mode: the WASM build in production, the regular client in `next dev` and tests (Node can't load the WASM engine). To test the database in the real runtime, build, run `npx wrangler dev --local`, then curl `/api/auth/session` with a session cookie.
- **Production console:** Cloudflare Web Analytics injects its beacon, which the CSP blocks. Turn it off in the dashboard; the privacy page promises no analytics.
- **Still on the user:** rotate the secrets and delete `.env`/`.env.local`; publish the Google OAuth consent screen (until then only test users can sign in on production).

## 18 Oct 2026, late: landing redo, mark tone, status pill
- **Landing** rebuilt (`src/components/landing/*`): one-line headline "See where you’re at.", the range strip at window width with the number riding the tick, try-it chips that turn the hero field red once, a compact "Widmark, minute by minute" maths card (live values, no source listing), NightBar, the add-flow video (plays once in view, Play control, never autoplays under reduced motion), holding-the-phone, FAQ, region switch. The user asked: no copy that argues against other models; no "Your night is yours" section.
- **Logo:** the original range-strip mark stays (gradient-with-dot options at `/dev/directions/logo-gradient` were rejected). `BrandMark tone="alert"` turns the band coral while not safe. Proportions changed so it no longer reads as a plus (wider band, shorter off-centre tick). `src/lib/brand-mark-svg.ts` draws it for icons; `scripts/make-icons.mjs` and `scripts/make-og.mjs` regenerate the app icons and the 1200×630 OG image ("Blood alcohol estimator", "See where you’re at.", about 0.04). `AlertFavicon` swaps the tab icon to red while not safe.
- **Not safe to drive** is now one glass pill in the top-left chrome (`NightStatus`), with nothing under the number; the mark morphs into it when a drink tips the night into not-safe (only after an add/undo, never on load, instant under reduced motion). Frames: `/dev/directions/morph`. The red field now fades the blue out as the red comes in. Options considered: `/dev/directions/notsafe`.
- **Rising cue:** an arrow over the band to the coming peak plus "Rising to about X by T" with a trend icon (spec in `.shots/rising-spec.md`, lab `/dev/directions/morph/rising`). On the landing's thick strip the arrow is still the weakest bit.
- **Stale:** `public/media/add-flow-loop.mp4` shows the old night screen (top bar, old pill). Re-render it from `motion/` against the new design.

## 18 Oct 2026: merges and the Glass rebuild
- **Merged locally** into `cloudflare-d1-migration` (nothing pushed): security (`15e4841`), offline (`f37a16c`), consent (`0444855`). All checks and the OpenNext build passed after each.
- **Migrations renumbered** so they apply in order: `0004_ai_limits`, `0005_drop_oauth_tokens`, `0006_offline_adds` (was the offline branch's 0004), `0007_consent` (was the consent branch's 0004). None has been applied remotely. **Tell the migration session before go-live** (it wasn't reachable from the design session).
- **`.env` and `.env.local` still exist in the main checkout.** `npm run build:worker` refuses to run while they do (by design). The user should move the values into `.dev.vars`, rotate the secrets, and delete those files. Until then, build in a throwaway worktree.
- **Visual direction: "Glass"** (see DESIGN.md), chosen from five built directions under `/dev/directions` (dev only; also `/dev/directions/type`, `/dock`, `/glass/lab`, `/logo`, `/fonts`, `/assets`). The night screen and landing are rebuilt on it; FluidGauge, the gauge lab, `lib/fluid` and the paper docket are deleted.
- **New on the night screen:** no top bar (the mark, Get home and You float as glass keys over a scrim); the whole screen turns red while any drink counts (never a number threshold) and "Not safe to drive" sits under the number, moving to the top left once the number scrolls away; tapping the number opens About this estimate; the estimate bar draws direction (dashed track to the peak while rising, a fading trail while falling) and shows the range's numbers on tap; a dock with a white "Add another …" pill and a type-or-say composer (on-device catalog parse first, the bartender only when the catalog can't read it; folds to one-line rows while the keyboard is up and rides on top of it); time chips Now/10/20/30 min/1 h plus an Earlier slider in 5-minute steps with ±5 buttons.
- **Audit items closed here:** B2 (signed-out now has a Sign in button), profile button is an icon labelled "You" and opens a Radix sheet (the floating Profile button is gone), onboarding asks weight and sex once before the first night (skippable), editing a drink's time or size (a replace through the offline outbox, so it works with no signal), one `formatClock()` (`src/lib/format-clock.ts`, tested), Radix Dialog for the add, edit and You sheets.
- **Still open from that list:** none. Other ⏳ items below are unchanged; the engine items are proposed as their own session ("BAC engine accuracy fixes").
- **Logo:** five candidates at `/dev/directions/logo`; the shipped `BrandMark` is a placeholder until the user picks (the current one reads as a plus sign at 40px).
- **Motion study:** `motion/` is a separate Remotion project (`npx remotion studio`); its landscape loop ships at `public/media/add-flow-loop.mp4` on the landing page.
- **Voice entry** uses the browser's speech recognition (audio goes to Google or Apple's servers); `Permissions-Policy` now allows `microphone=(self)` and the mic is only requested when its key is tapped.

## Kickoff prompt for the next session
Paste this to continue:

> Continue BACulator in C:\Users\agams\BACulator on branch cloudflare-d1-migration. Read HANDOFF.md (the 18 Oct section first), PRODUCT.md and DESIGN.md; don't re-explore beyond what they point to. The visual direction is "Glass" and the night screen is rebuilt on it. Keep every PRODUCT.md non-negotiable and the designing-for-impaired-users rules: no limit lines or number thresholds, nothing moving at rest, and icon + word + colour for status.
>
> 1. **Redo the landing page properly.** The user called the current one "very AI slop" and wants better use of the window, more fun, more excitement, more design, and a headline that isn't about error bars.
>    - Run the impeccable skill's new-work flow for a Persuade surface inside the established Glass world. Its launcher is missing, so read reference/new-work.md, mode-persuade.md and craft-floor.md. Then run the taste skill's draw, lint and inspect gate.
>    - A stopped agent left a start: `.taste-skill/direction.json` (dealt "one-motif") and `src/components/landing/LiveStrip.tsx`. LiveStrip blows the range strip up to the window's width, with the big number riding on the tick; that's a good motif.
>    - Show the maths "coded style": a live code panel of the real Widmark model with the demo night's numbers filled in as visitors tap drinks. The model: fixed r 0.68/0.55, ~95% absorbed in 30 min, 0.015/h elimination, a 0.75–1.4× likely range, 0.75–1.6× back to zero.
>    - Keep the consent flow (`onStart`), RegionSwitch, getting-home, privacy, FAQ and the add-flow video.
> 2. **Logo.** The user's idea: a blue-to-red gradient running corner to corner, with a dot in the centre or something similar, and the mark turning red while it's not safe to drive.
>    - Candidates so far are at /dev/directions/logo; G "filling drop" and J "drop in brackets" read best small.
>    - Draw 3–4 takes on the gradient-with-dot idea and show them side by side in the real top bar and at favicon size. Let the user pick.
>    - Then ship it everywhere: `BrandMark`; the red state on the night screen; the tab favicon while not safe; the app icons (public/icons, src/app/icon.png, apple-icon.png, manifest); and a 1200×630 OG image.
> 3. **Replace the "Not safe to drive" line under the number.** The user says it doesn't look like it belongs. The red field already carries the state. The new treatment must:
>    - fit Glass;
>    - still carry icon + short word, because screen readers and a quick glance both need words;
>    - not be tied to a number threshold;
>    - not move at rest.
>
>    Render 3–4 options side by side before choosing.
> 4. **Check everything, then commit locally.**
>    - Shoot with `npm run shoot` in real Chrome at 375×812, 320×568 and 1440×900. It now supports `press`, `focus` and `type` actions.
>    - Run `node scripts/rubric.mjs <url>` for the impaired-user measurements, and `node scripts/contact-sheet.mjs` to lay options side by side for the user.
>    - Keep lint, typecheck, tests and the OpenNext build green. Build in a throwaway worktree, because the `.env` files in the main checkout block `build:worker`.
>    - Commit locally. Don't push, and check with the migration session before anything touches main.
>
> **Budget (as of the evening of 18 Oct 2026):** the user has about 26% of their weekly session limit left and it resets in about 2 hours, so go hard with subagents, as long as it's done correctly:
> - run independent pieces in parallel: the landing redo, the logo options and the not-safe options;
> - give each agent its own files or worktree, so no two touch the same file (the logo's red state and the not-safe treatment both touch the night screen, so sequence those two or split them by file);
> - give each a complete brief;
> - verify every result yourself in real Chrome before showing the user.
>
> Proposed side sessions (cards in the previous session):
> - **"BAC engine accuracy fixes":**
>   - the estimate reads ~40% low right after logging;
>   - the elimination tail;
>   - g/100 g vs g/100 mL;
>   - future-dated drinks;
>   - possibly a computed range instead of a fixed one.
> - **"Ops runbook":** Workers Logs, D1 backups, an uptime ping, a health route.
>
> Still on the user:
> - move the `.env`/`.env.local` values into `.dev.vars` and rotate the secrets;
> - publish the Google OAuth consent screen;
> - review the consent and privacy wording;
> - tell the migration session the migrations are renumbered 0004–0007;
> - test on a real iPhone and Android phone.

## Where things are
- **Repo:** `C:\Users\agams\BACulator`, GitHub `SoHighSingh/BACulator`. Work branch **`cloudflare-d1-migration`** (local, not pushed since `6788199`). `main` on GitHub is older still. Don't push `main` without checking with the migration session (`local_57f76079…`), which owns go-live.
- **Stack:** Next.js 15 / React 19 / Tailwind 4 / tRPC / Prisma on **Cloudflare Workers (OpenNext) + D1**. Auth: NextAuth Google. CI: `.github/workflows/ci.yml` (lint, typecheck, vitest, OpenNext build). Vercel auto-deploys are off (`vercel.json`).
- **Checks:** `npm run lint`, `npm run typecheck`, `npm test` (588 tests), `SKIP_ENV_VALIDATION=1 npm run build:worker`. Local dev: `npm run dev` (local D1 via wrangler; `npm run db:migrate:local` first). Lint and dev need `.dev.vars` (or `SKIP_ENV_VALIDATION=1`).
- **Look at the UI with `npm run shoot`** (Playwright driving the system Chrome, `scripts/shoot.mjs`). The Claude desktop browser pane renders pages *hidden*, which freezes `requestAnimationFrame` and canvases. That's why earlier screenshots showed empty gauges the user never saw. Example:
  `npm run shoot -- .shots/night http://localhost:3000/dev/night 375 812 '--actions=[{"scroll":400,"wait":600,"shot":1}]'`
  It prints horizontal overflow, canvas pixel coverage and console errors. Check 320×568, 375×812, 430×932 and 1440×900. `RM=1` emulates reduced motion.
- **Dev-only pages** (404 in production): `/dev/night` (the real night screen with sample drinks; `?empty`, `?noweight`, `?us`, `?metric`) and `/dev/gauges` (gauge experiments). Sign-in doesn't work locally until the OAuth consent screen is published, so use these.

## Secrets and env (read before building or deploying)
- **Local values live in `.dev.vars`** (gitignored; template `.dev.vars.example`). `wrangler dev` reads it, and `next dev` gets it through `scripts/load-dev-vars.js` (dev only; Next sets NODE_ENV=production before a build, so builds never read it).
- **Never create `.env`, `.env.local` or any `.env*` file.** OpenNext copies every `.env*` file into `.open-next/cloudflare/next-env.mjs`, and the Worker uses those values for any variable without a Worker secret (`process.env[key] ??=`), so a forgotten `wrangler secret put` silently ships the dev value.
- `npm run build:worker` (used by `deploy`, `preview` and CI) refuses to start while a `.env*` file exists and fails afterwards if `next-env.mjs` holds any values (it prints key names only).
- Production values are Worker secrets: `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (`npx wrangler secret put <NAME>`). Use a different AUTH_SECRET locally. If a secret is missing the Worker now fails loudly at env validation instead of falling back.

## Security (audit 17 Oct 2026)
- Fixed: IDOR scoping, fail-closed `protectedProcedure`, zod validation, atomic account deletion, security headers + CSP (`next.config.js`), dev-only request logging, secrets out of the bundle, next-auth/@auth/tRPC/glob/postcss advisories (`npm audit --omit=dev` = 0; overrides in package.json).
- **AI bartender limits** (`src/lib/drinks/ai-quota.ts`): Workers AI calls take a slot from atomic D1 counters (`AiUsage`): 20/user/hour, 50/user/day, 250/day globally; a quota error from Cloudflare fills the day's global budget; a per-isolate breaker skips the AI for 5 min after 3 failures. A limit reads as "AI unavailable" so the add sheet offers manual entry. `ParseCache` only stores short phrases (<= 48 chars, 8 words, no 5+ digit runs, confidence >= 0.5) and expires rows after 30 days; `src/server/bartender.ts` prunes hourly.
- **Auth:** Google tokens are no longer stored (`src/server/auth/account.ts`, migration 0005 clears old ones); `/api/auth/session` returns only `expires` and the user's id/name/email/image (it used to include the httpOnly session token).
- **Migrations 0004 (AiUsage, ParseCache index/cleanup) and 0005 (clear OAuth tokens) are not applied remotely yet**: `npm run db:migrate:remote` before deploying this code, or `analyseDrink` will fall back to manual entry (the AiUsage table is missing, so the limiter fails closed).
- CSP keeps `script-src 'unsafe-inline'` (App Router inline payload scripts; a nonce would make every page dynamic). If Cloudflare Web Analytics or other injected scripts are turned on, add their origin to the CSP.

## Offline
- **Offline (merged 18 Oct 2026):** every add/remove goes through an IndexedDB outbox (`src/lib/outbox.ts`, rules in `lib/night-model.ts`), shown at once and marked "Saved on this phone, will sync" while there's no signal; flushed on `online` / `visibilitychange` / retry. `Drink.clientId` (unique) makes `addDrink` idempotent; `deleteDrink` takes a drinkId or clientId; one open Tab per user is enforced by a partial unique index. Tonight's queries persist to localStorage (`src/trpc/offline-cache.ts`, cleared on sign-out). Serwist service worker (`src/app/sw.ts`, production builds only) precaches the shell and reuses the last `/api/auth/session`. **Deploy needs `npm run db:migrate:remote` for `migrations/0006_offline_adds.sql` before the code.** If a CSP is added, allow `worker-src 'self'`.

## What this session shipped (on `cloudflare-d1-migration`)
`7514845` → `e435569`, nine commits:
- **Night screen as an app:**
  - layout: fixed top bar, scrolling middle, fixed bottom dock (CSS grid shell); landscape is two columns; the recents fold away under 700 px tall; "Not safe to drive · about 0.10" stays pinned at the top
  - adding: "+ Add another" with a Lucide drink icon, two recents, "+ New drink"
  - undo: "Added … ×2 [Undo one]" / "Removed … [Add back]"
- **Estimate shown as one number:** "about 0.10", rounded **up**, with "Likely 0.07 to 0.14" (0.75–1.4×). Back to zero is shown as 0.75–1.6× of the model. "Not safe to drive" shows with no weight entered, and through the slow-eliminator tail after the model reaches zero. These are user decisions; PRODUCT.md is updated.
- **Engine:**
  - `simulateNight()` runs the simulation once and the screen samples it; drink times are parsed once (about 10× faster)
  - the window is now 48 h
  - pure night-model rules (`src/lib/night-model.ts`) handle optimistic adds, undo while a save is in flight, and the 600 ms double-tap guard
- **Curve:** hand-drawn SVG, one continuous line split at "now". Drag across it to read time and value. The window looks ahead as far as has already passed (at least 3 h). recharts is removed.
- **Region:** 10 g / kg / ml / 000, or US 14 g / lb / oz / 911. Each region has its own serve chips and an example drink in its own words. Storage stays in 10 g units.
- **Server:**
  - zod limits on drink time, weight and ids
  - account deletion runs as one transaction
  - auth fails closed
  - security headers
  - unused procedures removed
- **Landing:** "The tab" (a live paper docket). It works, but the user now finds the overall look not premium enough; see the brief below.
- **Gauge lab** (`/dev/gauges`): living glass (height-field fluid sim in `src/lib/fluid/surface.ts`), liquid number, minimal dial, and dial plus liquid number. **The user's verdict: drop the fluid, "nothing exciting yet".** The night screen still uses the pint-glass `FluidGauge`, which needs replacing in the new direction.

## Side branches (all three merged locally on 18 Oct; none pushed or deployed)
| Branch | What | Before merging |
|---|---|---|
| `claude/stoic-sinoussi-8f07b2` (6 commits) | Security: secrets moved out of the Worker bundle (`.dev.vars`); next-auth/Auth.js/tRPC upgraded past the advisories; AI bartender rate limits plus a global budget and circuit breaker; a safer parse cache; Google tokens no longer stored; a CSP | It also edits HANDOFF.md, so expect a conflict here. The user must rotate secrets by hand (see that branch's HANDOFF notes). |
| `claude/charming-chatterjee-4a4833` (1 commit) | Consent step with an age gate (18+, 21+ in the US), a draft health-data privacy policy, "Download my data" | Wording needs the user's review. Adds User columns, so a D1 migration is needed. |
| `claude/recursing-montalcini-1fd82d` (1 commit) | Offline-first: IndexedDB outbox, `Drink.clientId` with idempotent adds, a service worker, proper PWA icons | Merged 18 Oct; its migration is now 0006. It touches `useNight`/`night-model`, so re-run the tests after merging. |

Suggested merge order: security → offline → consent. Re-run all checks after each merge. **Merge only when the user says so.**

## The audit (seven parallel agents) and where each finding stands
Legend: ✅ fixed on this branch · 🔀 fixed on a side branch · ⏳ open

**Button pipelines**
- ✅ Removed drinks reappearing as ghosts (B1)
- ✅ The 4 s guard swallowing real second drinks (B3)
- ✅ Silent offline hangs (B4)
- ✅ Invisible AddSheet errors (B5)
- ✅ Undo while a save is in flight (B6)
- ✅ Swallowed weight-save errors (B7)
- ✅ Stale parse after editing the text (B8)
- ✅ Add back blocked (B9)
- ✅ Double-Remove error (B10)
- ✅ Duplicate frame on reconcile (B11)
- ✅ US stepper starting at 0.7 (B13)
- ✅ Profile sheet focus jumps (B14)
- ⏳ B2: "Signed out" message shows, but there's no sign-in button
- ⏳ B12: kg↔lb rounding snaps on first save
- ⏳ B15: two concurrent first adds can open two sessions (needs a unique index or upsert)
- ⏳ `updateDrink` is unused: editing a drink's time or size isn't possible yet

**Math**
- ✅ Band 0.75–1.4×
- ✅ Back-to-zero 0.75–1.6×
- ✅ Headline rounds up
- ✅ 48 h window
- ✅ Single simulation
- ✅ Server weight 30–300 kg and drink-time limits
- ✅ AI-parsed standards round up
- ✅ Comment fix
- ⏳ Absorption starts at `finishedAt`, so the number reads about 40% low right after logging; start it at drink start or spread it.
- ⏳ Zero-order elimination to 0: consider Michaelis-Menten near 0.02 or a tail margin.
- ⏳ BAC is g per 100 g, not g per 100 mL: ×1.055, or document it. Verify against Searle 2015 / Wagner before encoding.
- ⏳ Future-dated drinks.
- ⏳ UK units are 8 g, not 10 g: ask the user before adding a UK region.

**Security**
- ✅ Validation, transaction, fail-closed auth, headers
- 🔀 Secrets baked into the bundle
- 🔀 Dependency CVEs
- 🔀 AI rate limit
- 🔀 OAuth tokens at rest
- 🔀 CSP
- ⏳ Parse cache shared across users (partly on the security branch)
- ⏳ Recompute standards on the server rather than trusting the client

**UI/UX (impaired-user rubric)**
- ✅ Double tap
- ✅ Count-up from 0.00
- ✅ Pinned warning
- ✅ Small screens
- ✅ Actionable Getting home
- ✅ "Still rising" copy
- ✅ Recent labels at 18 px
- ✅ Dark-bar contrast
- ✅ Landing copy honesty
- ⏳ Profile button should read "You" or an icon, not change with region
- ⏳ Trusted contact for "Text a mate" (currently a prefilled `sms:` with no recipient)
- ⏳ The two-tone glass meaning ("still absorbing") wasn't decoded by testers; moot if the glass goes

**Mobile**
- ✅ Overflow at 320
- ✅ Landscape
- ✅ Keyboard (`visualViewport`)
- ✅ Recharts out of the landing bundle (/ dropped from 276 to 183 kB first load)
- ✅ Pull-to-refresh
- 🔀 PWA icons and service worker
- ⏳ Test on a real iPhone and an Android phone: Safari toolbars, installed standalone, sign-in inside the installed app

**Code**
- ✅ Memoized `useNight`
- ✅ One double-tap guard
- ✅ Single sim
- ✅ Dead procedures, `bac-graph`, recharts removed
- ✅ `WarningMark` shared
- ⏳ One `formatClock()` (several formatters with mixed en-AU/en-US locales)
- ⏳ Move AddSheet and UserInfoSlideOut onto Radix Dialog (focus trap, `inert` background)
- ⏳ `.gitattributes` with `eol=lf` (the checkout is mixed CRLF/LF)
- ⏳ `next lint` → ESLint CLI
- ⏳ Shared JSON fixtures for the Swift engine
- ⏳ Tests for `drinkKind`, `toDrinkDetails`, router ownership

**Gaps (privacy, offline, a11y, ethics)**
- ✅ Warning without weight
- 🔀 Age gate
- 🔀 Consent and health-data policy
- 🔀 Data export
- 🔀 Offline
- ⏳ Onboarding: ask weight and sex once, sober, before the first night
- ⏳ Morning-after "Last night" view
- ⏳ Observability: Workers Logs, a D1 backup runbook, an uptime ping
- ⏳ Screen-reader pass with VoiceOver and TalkBack

## The next visual direction: brief
**The user's words (17 Oct):** "doesn't feel very trustworthy… doesn't feel premium… way too not precise. We want sleek designs with better font choices and assets that give confidence in what we do." Also: drop the fluid. "Fluid" should mean motion and UX that respond, not liquid. Keep what they liked: the fixed bottom dock, the Getting home card, back to zero, the scrubbable curve. They want to choose between designs.

**What "precise and trustworthy" has to mean here, honestly.** The number is an estimate with a wide range, so precision has to come from craft: exact alignment, true tabular figures, a disciplined grid, calm restrained motion, real data visualisation, and plain copy that states its method. It must not come from fake decimals. Never imply fitness to drive. Every PRODUCT.md non-negotiable still holds.

**Process (use the skills; don't skip):**
1. Run `impeccable` (shape → new-work) for a **replacement visual world**, for the night screen (Operate) and the landing page (Persuade). The impeccable launcher (`scripts/impeccable`) is missing from the skill folder; say so, then follow the playbooks by reading them.
2. Use `taste-skill` for the landing direction (`node ~/.claude/skills/taste-skill/scripts/draw.mjs …`), its type and colour references, and its `lint.mjs` / `inspect.mjs` gate.
3. Run the `designing-for-impaired-users` rubric (Workflow B) on every candidate.
4. Build **at least three materially different directions** as real code on dev-only routes (for example `/dev/directions/<name>`), each covering the night screen with its gauge, dock and curve, plus a landing hero. Shoot each with `npm run shoot` at 375 and 1440 and show the user the images side by side. **Let the user pick before rebuilding the real screens.**
5. Write the chosen direction into DESIGN.md (tokens, type roles, motion), then rebuild `src/components/night/*` and the landing page on it.

**Directions worth exploring (starting points, not answers):**
- **Clinical instrument:** a lab-report or medical-device calm. White or very dark neutral, one signal colour, hairline-free precision through spacing, large tabular numerals, method notes like a lab printout. Trust through restraint.
- **Swiss watch face:** chronograph or complication discipline. Concentric rings, fine indices (decorative only, no limit marks), a refined grotesk, monochrome plus one accent. Premium through finish.
- **Financial-grade data:** the clarity of a trading or bank app. Dense but calm, tabular figures, a sparkline-first curve, neutral greys. Trust through familiarity with money apps.
- **Editorial data journalism:** FT or Bloomberg graphics. A confident serif or grotesk pairing for headings, a precise chart language, annotations on the curve. Trust through explanation.
- **Native-premium:** Apple Health or Fitness-grade cards. SF-like rhythm, materials, haptic-feeling transitions. It also maps cleanly to the Swift port.

**Fonts:** Geist is the current face. Try faces with real tabular, lining figures and a precise voice. Free or open options to evaluate:
- Mona Sans or Hubot Sans (variable width, great numerals)
- Schibsted Grotesk
- Hanken Grotesk
- Onest
- Figtree
- Fontshare's Satoshi, General Sans, Switzer and Cabinet Grotesk (check the licence for web and app use)

Impeccable flags these as overused defaults: Inter-as-display, Space Grotesk, IBM Plex, DM Sans, Instrument Sans. Avoid them unless there's a reason. Monospace is banned outside code by Taste. Check figures for tabular alignment in the gauge, curve and tab.

**Assets that build confidence:**
- a proper app icon and OG image
- one consistent icon family (Lucide now; consider a custom drink set drawn to the chosen grid)
- for the landing page, real photography or a credible product render (taste `assets.mjs` finds licensable images; never fake a product shot)
- a "How the estimate works" explainer with sources (Widmark, Watson, Jones), which is also an SEO page

## Gotchas
- A dev server started at 14:49 on **:3000** is not this session's, and its server-side bundle went stale (it served old SSR). Start your own with the `baculator-dev` launch config, which takes :3001 when :3000 is busy.
- `.open-next` is locked by that server, so the OpenNext build fails with EPERM. Build in a throwaway worktree: `git worktree add --detach <dir> HEAD`, `npm ci`, build, then `git worktree remove`.
- Windows CRLF: scripted edits need `sed -i 's/\r$//'` first. Shell quoting of `\u00a0` and similar escapes mangles them, so use the Edit tool.
- Region is stored per device in localStorage; the dev page sets it from `?us` / `?metric`.
- Building inside `.claude/worktrees/*`: Next warns about multiple lockfiles and picks the main checkout as the workspace root. Harmless: OpenNext still read env files only from the worktree (the bundle check found `next-env.mjs` empty).
- The dev-time Google sign-in won't work until the consent screen is published or the user is added as a test user.

## Skills installed (`~/.claude/skills`)
`designing-for-impaired-users`, `impeccable` (instructions only; launcher missing), `taste-skill` (scripts work with Node 22+ and Chrome), `redesign-skill`, `remotion-*`, `seo*`. React Bits via the shadcn registry, only on the landing page or Remotion, and always honour reduced motion.
