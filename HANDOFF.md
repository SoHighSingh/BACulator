# BACulator — handoff (17 Oct 2026, evening)

Read this, then `PRODUCT.md` (who it's for, non-negotiables, the user's decisions) and `DESIGN.md` (what's built now). This file covers: where the code is, what the seven-agent audit found and what's still open, the three side branches waiting to merge, and the brief for the next visual direction.

## Where things are
- **Repo:** `C:\Users\agams\BACulator`, GitHub `SoHighSingh/BACulator`. Work branch **`cloudflare-d1-migration`** (local, not pushed since `6788199`). `main` on GitHub is older still. Don't push `main` without checking with the migration session (`local_57f76079…`), which owns go-live.
- **Stack:** Next.js 15 / React 19 / Tailwind 4 / tRPC / Prisma on Cloudflare Workers (OpenNext) + D1, NextAuth Google.
- **Checks:** `npm run lint`, `npm run typecheck`, `npm test` (573), `SKIP_ENV_VALIDATION=1 npx opennextjs-cloudflare build`.
- **Look at the UI with `npm run shoot`** (Playwright driving the system Chrome, `scripts/shoot.mjs`). The Claude desktop browser pane renders pages *hidden*, which freezes `requestAnimationFrame` and canvases. That's why earlier screenshots showed empty gauges the user never saw. Example:
  `npm run shoot -- .shots/night http://localhost:3000/dev/night 375 812 '--actions=[{"scroll":400,"wait":600,"shot":1}]'`
  It prints horizontal overflow, canvas pixel coverage and console errors. Check 320×568, 375×812, 430×932 and 1440×900. `RM=1` emulates reduced motion.
- **Dev-only pages** (404 in production): `/dev/night` (the real night screen with sample drinks; `?empty`, `?noweight`, `?us`, `?metric`) and `/dev/gauges` (gauge experiments). Sign-in doesn't work locally until the OAuth consent screen is published, so use these.

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

## Side branches waiting to merge (none merged, pushed or deployed)
| Branch | What | Before merging |
|---|---|---|
| `claude/stoic-sinoussi-8f07b2` (6 commits) | Security: secrets moved out of the Worker bundle (`.dev.vars`); next-auth/Auth.js/tRPC upgraded past the advisories; AI bartender rate limits plus a global budget and circuit breaker; a safer parse cache; Google tokens no longer stored; a CSP | It also edits HANDOFF.md, so expect a conflict here. The user must rotate secrets by hand (see that branch's HANDOFF notes). |
| `claude/charming-chatterjee-4a4833` (1 commit) | Consent step with an age gate (18+, 21+ in the US), a draft health-data privacy policy, "Download my data" | Wording needs the user's review. Adds User columns, so a D1 migration is needed. |
| `claude/recursing-montalcini-1fd82d` (1 commit) | Offline-first: IndexedDB outbox, `Drink.clientId` with idempotent adds, a service worker, proper PWA icons | Remote D1 migration 0004 must run before deploy. It touches `useNight`/`night-model`, so re-run the tests after merging. |

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

## Skills installed (`~/.claude/skills`)
`designing-for-impaired-users`, `impeccable` (instructions only; launcher missing), `taste-skill` (scripts work with Node 22+ and Chrome), `redesign-skill`, `remotion-*`, `seo*`. React Bits via the shadcn registry, only on the landing page or Remotion, and always honour reduced motion.
