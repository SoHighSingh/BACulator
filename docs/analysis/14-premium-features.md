# 14. Premium features that add value without rewarding drinking

Basis: PRODUCT.md non-negotiables (no encouragement, no streaks/badges, no fitness-to-drive implication, nothing on the logging path interrupts) and the current code: `src/lib/bac-calculator.ts` (Widmark, r fixed 0.68/0.55, elimination 0.015/h, ranges 0.75-1.4x), `src/lib/night-model.ts`, `src/lib/outbox.ts` (IndexedDB offline queue), `src/lib/drinks/*` (catalog, parser, serves), tRPC `src/server/api/routers/post.ts` (`exportMyData`, `recentDrinks`, `getNight`, `updateUserInfo`), Prisma Tab/Drink (a Tab is a night; D1 migrations 0001-0007), `src/app/sw.ts` + `manifest.ts` (PWA), `src/components/night/chart`, `GetHome.tsx`.

Key structural fact: the data for history already exists (every Tab has finished drinks) and is already exportable as JSON. No UI reads past nights except `recentDrinks`. Weight and sex are the only body inputs.

## Principle for monetisation
Free tier keeps everything safety-critical (logging, estimate, "Not safe to drive", emergency info, bartender, export, deletion). Premium is about reflection and convenience, never about more drinking, and never about reducing warnings. Anything that makes the number look more precise or "safer" is out. Frame it as a supporter plan, not unlocks that gate safety.

## Ranked features

### 1. Morning-after recap + history (build first)
- Value: "What did I actually drink Saturday, when did I peak, roughly when was I back to zero", in neutral wording. Honest retrospection is the main behaviour-change lever, and PRODUCT.md already lists "the next morning understand what they drank" as a secondary job.
- Risk: Low if informational. Avoid best/worst night rankings, "lowest week" praise (a streak in disguise), peak-as-score, any "fine to drive by X". Keep the slow-eliminator caveat. No next-morning notification: the user opens it (pull only).
- Effort: Small to medium. New tRPC query over Tab/Drink (same shape as `exportMyData`), re-run the existing engine per past night and reuse `TimelineCard` and the chart. No schema change.
- Builds on: `exportMyData`, `bac-calculator` timeline, `chart/`, `TonightList`.
- Split: last night free (it is an understanding/safety feature); older nights and search paid.

### 2. Weekly/monthly trends (standard drinks per week, nights per month)
- Value: Context against health guidance (region-aware via `region.ts`) for people cutting down.
- Risk: Medium. Charts that reward "down" or celebrate a dry week become streaks. Keep neutral plain numbers, no goals-with-confetti. If a self-set weekly limit is offered, never show "X left" (reads as permission to drink up to it).
- Effort: Small once #1 exists (aggregate query).
- Builds on: #1, `drinks/standards.ts`, `region.ts`.

### 3. Custom drinks and saved favourites
- Value: Real. Home pours, cocktails, a regular glass size. Feeds one-tap same-again and fixes the biggest estimate error source (what was in the glass).
- Risk: Low to medium. Faster adding is the stated product value, not a reward. No "your usual" prompts, no venue check-ins or "popular near you" (encourages going out, privacy-sensitive).
- Effort: Small to medium. New UserDrink table (migration 0008), merge into `catalog.ts`, AddSheet UI. `pipeline.ts` can resolve user-defined names before catalog and AI.
- Builds on: `recentDrinks`, `drinks/catalog.ts`, `parse.ts`, `serves.ts`.
- Split: a basic custom drink (name, ml, abv) should stay free since accuracy is a safety property; paid = unlimited favourites, nicknames.

### 4. CSV/PDF export, Health apps later
- Value: Ownership, doctor visits, spreadsheets. JSON export exists.
- Risk: Low. Writing a BAC sample into a health app implies measured accuracy; avoid. HealthKit is not reachable from a PWA, so Apple Health needs a native shell.
- Effort: CSV tiny; HealthKit/Health Connect large.
- Builds on: `exportMyData`. Keep JSON export free (privacy right, likely legally required).

### 5. Supporter tier with no feature gating beyond the above
- Value: There are no ads, so "ad-free" means nothing. A plain "support BACulator" plan fits the brand.
- Risk: Low, provided no badges, no supporter streaks, no safety gating.
- Effort: Small to medium: checkout provider, entitlement flag on User (migration), webhook route on the Worker. Adds tax/age compliance.
- Builds on: `src/server/auth`, `src/app/account`.

### 6. Mates mode: read-only share for a sober friend
- Value: Matches the secondary user in PRODUCT.md (sober friend holding the phone).
- Risk: Medium-high. Sharing live data conflicts with "never shared" unless explicit, time-boxed and revocable. A friend seeing "0.04" may judge them fit to drive. No leaderboards or "who is drunkest". If built: show only "Not safe to drive", drinks count and emergency numbers, no number.
- Effort: Large. Unauthenticated signed route, expiry, revoke, rate limits, tokens table, polling.
- Builds on: `GetHome.tsx`, region emergency info, `getNight`.
- Cheaper free precursor: a printable/showable emergency card for the friend (no sharing).

### 7. Widgets / Apple Watch / Wear
- Value: One-tap same-again from the lock screen is on-mission.
- Risk: Medium. A glanceable number can become a driving test; haptic or complication prompts violate the no-notifications rule. Log-only is fine.
- Effort: Very large (needs native apps). Stopgap: PWA manifest `shortcuts` for "Same again".
- Builds on: `manifest.ts`, `sw.ts`, `outbox.ts` (offline-safe add already works).

### 8. Personal calibration from a breathalyser reading (tune r)
- Value: Could narrow the band for one person.
- Risk: High. Consumer readings are off by 0.01-0.02 and drift, a "calibrated" state breeds overconfidence, and "my r is low so I'm safer" is the wrong incentive. Conflicts with never implying fitness to drive.
- Effort: Medium (fields, Widmark variant, band rework, tests).
- Verdict: Do not ship. Safe subset: optional height/age to refine r, with the displayed band never narrower than today.
- Builds on: `bac-calculator.ts` r selection (~line 27), `updateUserInfo`.

### 9. B2B event mode
- Value: Revenue and reach (welfare tents, campus health).
- Risk: High. Venues are incentivised to sell more; consumption dashboards or promotions clash with "never encourage drinking" and "never sold or shared" data.
- Effort: Very large (orgs, roles, multi-tenant, sales).
- Verdict: Separate product at most, education-only, no user data.

## Summary ranking

| Rank | Feature | Value | Harm risk | Effort | Verdict |
|---|---|---|---|---|---|
| 1 | Morning-after recap + history | High | Low | S-M | Build first, core of paid tier |
| 2 | Weekly/monthly trends | Med-High | Medium (streak framing) | S | After 1, neutral wording only |
| 3 | Custom drinks / favourites | High | Low-Med | S-M | Build; basic accuracy stays free |
| 4 | CSV/PDF export (Health later) | Medium | Low | S (CSV) | Cheap add; JSON stays free |
| 5 | Supporter tier | Funding | Low | S-M | Wrap around 1-4 when needed |
| 6 | Mates read-only share | High | Med-High | L | Later, legal review; emergency card first |
| 7 | Widgets / Watch | Medium | Medium | XL | Manifest shortcuts only |
| 8 | Breathalyser calibration | Medium | High | M | Do not ship |
| 9 | B2B event mode | Revenue | High | XL | Separate, education-only |

## Suggested bundle
"Supporter": full history and search, trends, unlimited favourites, CSV/PDF export. Always free: logging, estimate and band, emergency info, bartender within quota, JSON export, deletion.

## Cross-cutting guardrails
- No push about drinking or the next morning; recaps are pull only.
- No comparisons with other users, rankings, personal bests, or sober-day streaks.
- Past nights keep the rounded-up band and "estimate only" wording.
- History must be covered by `/account/delete` and export.
- Reuse `night-model` for past-night runs so a second model does not drift from the live one; add vitest tests beside the lib files.
