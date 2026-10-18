# 18. Region and internationalisation readiness

Scope: read-only review, about 9 tool calls. Findings below were verified in the files cited; "not checked" marks gaps.

## Current model (what is already good)

- `src/lib/region.ts`: `RegionId = "metric" | "us"`. Storage and the BAC engine are always in 10 g standards (`GRAMS_PER_STANDARD`, `src/lib/drinks/standards.ts`). A region only changes display and entry (`toRegionStandards`, `fromRegionStandards`, `formatVolume`, `kgToRegionWeight`). Switching region never rewrites data. This is the right design and should be kept.
- The ID `"metric"` is really "Australia". It is also the fallback for the UK, NZ, Canada and the EU, which is wrong for all of them (see below).
- Region is client-only: `src/hooks/useRegion.tsx` reads `localStorage["baculator.region"]`, else `guessRegion(navigator.languages)`. The prisma schema has no region column (grep returned nothing). Consequences: the server render cannot know the region, a new device re-guesses, and the region is not in account export or sync.
- `guessRegion` (region.ts:75) only tests for `-us` and treats every other language as `metric`. `en-GB`, `en-NZ` and `en-CA` are covered by tests as `metric` (region.test.ts:21-24), so that behaviour is locked in.

## Findings, by area

### 1. Hard-coded strings
- No i18n layer. All copy is inline English JSX (about 112 files touched by my broad grep; most hits are noise). `<html lang="en">` is fixed (`src/app/layout.tsx:67`).
- Region-branching copy is scattered and uses `region.id === "us"` ternaries, which will not scale past two regions:
  - `src/components/TermsAndDisclaimerDialog.tsx:94-100` ("Not in the US?", "Switch to 18+" / "Switch to US (21+)"). It is a binary toggle and breaks with 3+ regions.
  - `src/components/landing/Landing.tsx:106` (`{gramsPerStandard} g{id === "us" ? " (US)" : ""}`), and the region toggle at ~102 is built for two buttons.
  - `src/components/night/add/sizes.ts:89` (`region.id === "us" ? US : METRIC`).
  - `src/lib/consent.ts:10` `legalAgeFor`: `us` is 21, otherwise 18.
- Region data containing English: `Region.label` (region.ts:38 and 55) is a sentence, "10 g standard drink · kg · ml · call 000", mixing facts that should be derived (grams, units, number). `example` is also a free-text string.
- Terms page hard-codes both numbers: `src/app/(legal)/terms/page.tsx:36` ("call 000 (911 in the US)"). Privacy and terms are legal text and need per-jurisdiction review, not just translation.
- Voice input: `src/components/night/AddDock.tsx:143` uses `recognition.lang = navigator.language || "en-AU"`. That is already locale-aware, but the free-text parser (`src/lib/drinks/parse.ts`, `catalog.ts`, `serves.ts`) understands only AU/US terms (schooner, middy, nip, stubby, Bud Light) and the AI prompt (`src/lib/drinks/ai.ts`, `src/server/bartender.ts`) is not region-aware (not checked in detail). Local words ("pot", "pint of Guinness", "half", "shandy", "tinnie") will mis-parse.
- Estimate copy uses "std drink" (`src/lib/estimate-display.ts:89`), which is AU/UK-ish; the US says "standard drink" or "drink". Needs a per-region noun.
- `src/components/night/EstimateDetails.tsx:50` and `GetHome.tsx:23,40,71` already take the number from `region.emergency`. These are correct.

### 2. Units and serves
- `Region.serves` (region.ts:44, 61) is the quick-pick list; `sizesFor` (sizes.ts) holds two parallel tables, `METRIC` and `US`, keyed by a `Kind` that is inferred by regex over the English serve label (`kindOf`, sizes.ts:13). This is fragile: renaming a label ("Nip" to "Shot") silently changes the kind. Adding a third region means a third table and more regex.
- `MANUAL_CHIPS = servesFor(REGIONS.metric)` in `src/lib/drinks/details.ts:50` is pinned to the AU region, and `describeItem` defaults to `REGIONS.metric`. Any other caller that forgets to pass a region silently gets AU units.
- Volume units: only `ml` and `oz` (US fluid oz). UK uses imperial pints (568 ml) and 25/35 ml spirit measures, and the app uses 570 ml for the "Pint of beer" in AU, which is wrong for the UK (568 ml). Imperial oz (28.41 ml) differs from US oz (29.57 ml). The `volumeUnit` type has no `"imperial-oz"`. Weight: UK users usually think in stone and lb, so `weightUnit: "kg" | "lb"` is missing `"st"`.
- Size tables carry hard-coded US ounce sizes in labels ("Large (22 oz)", sizes.ts:59). These should be derived from `volumeMl` via `formatVolume`.
- `LIMITS.abv` max 80 and so on are universal; fine.
- Rounding: `servesFor` rounds standards up to hundredths so a 12 oz US beer is not shown as 1.1. This rounding logic is region-agnostic and will carry over, but each new standard (8 g, 12 g, 13.6 g) needs a unit test like the existing ones in `region.test.ts`.

### 3. Emergency numbers
- Present: `000` and `911` as a string on `Region.emergency`, rendered in `GetHome.tsx` with a `tel:` link. Good design, only needs more data.
- Gaps: no secondary or text-only services (AU 106 for TTY, 112 on GSM mobiles works in AU too), no poison-line numbers (AU 13 11 26, US 1-800-222-1222, UK use 111 for non-emergency) and no "tell the dispatcher your location" text per country. The `tel:` link is the sole action; on a desktop browser it does nothing useful.
- Moving to the UK means 999 (112 also works), the EU 112, NZ 111, Canada 911. A user who travels (a very common drinking scenario) should be able to override the number independently of the standard-drink definition. Decouple `emergency` from `Region`: a separate `EmergencyInfo` keyed by country.
- Safety note: wrong number is the highest-severity i18n bug in this app. A UK user falling back to the `metric` region would be shown "Call 000". That needs fixing before any non-AU/US launch.

### 4. Date and time formatting
- `src/lib/format-clock.ts` is hand-rolled 12-hour "10:40 pm" on purpose (so SSR, client and tests agree). It ignores 24-hour locales (UK, EU, much of the world prefer 24h; NZ and Canada vary). Also hard-codes "am"/"pm" in lowercase English.
- `formatHour` ("11pm") is used for chart axes (`src/components/night/chart/geometry.ts`, `InstrumentChart.tsx`; not read in detail).
- `src/server/api/routers/post.ts:77` uses `new Date().toLocaleString()` on the server for a tab name ("Session ..."): this uses the server's locale and timezone (Cloudflare edge = UTC, en-US), so it is wrong for any user and is not a display string anyone should rely on. Replace with a neutral name or a client-supplied label.
- `Date.now()` is used throughout for relative logic. The "night window" is a duration (`NIGHT_WINDOW_MS`), which is timezone-safe. Nothing found for calendar-day boundaries, but not exhaustively checked; any "tonight" logic that uses `getHours()` uses the device's local timezone, which is correct for a user who is physically there.
- Recommended: keep hand-rolled but add `hour12: boolean` (from region or from `Intl.DateTimeFormat().resolvedOptions().hour12` read on the client after hydration only) and a `periodLabels` option. Keep the deterministic-output property for tests by passing the option explicitly.

### 5. Next standard-drink definitions (to add)
Values to confirm against official sources before shipping; do not rely on this table as the final word.

| Region | Unit name | Grams ethanol | Notes |
|---|---|---|---|
| Australia | standard drink | 10 g | current `metric` |
| US | standard drink | 14 g | current `us` (NIAAA) |
| UK | unit | 8 g (10 ml) | UK units, not "standard drinks"; labels show units; pint 568 ml; spirit 25 ml (or 35 ml); wine 125/175/250 ml; stone/lb |
| NZ | standard drink | 10 g | same as AU; own serve names (jug, handle, pint, "bottle"); emergency 111 |
| Canada | standard drink | 13.45 g | 341 ml beer 5%, 142 ml wine 12%, 43 ml spirits 40%; metric units; 911; provinces vary on legal age (18/19) |
| EU | varies by country | roughly 8 to 12 g (for example Germany 10 to 12 g, France 10 g, Spain 10 g, Ireland 10 g, Netherlands 10 g) | there is no single EU definition; treat as per-country; emergency 112 |
| Ireland | standard drink | 10 g | HSE; pint 568 ml |

Implementation consequence: the engine's stored unit (10 g) works for all of these, but "UK units" at 8 g means a "1.0 unit" label is 0.8 stored standards. `toRegionStandards` already handles this.

Also not covered: legal driving BAC limits differ (AU 0.05, US 0.08, UK England/Wales 0.08 but Scotland 0.05, much of the EU 0.05, Canada criminal 0.08 with provincial lower thresholds, some countries 0.00). I counted 60 mentions of "drive/0.05/0.08" in non-dev source (`estimate-display.ts`, `EstimateDetails.tsx`, `NightStatus.tsx`, `Estimate.tsx`, `src/types/bac.ts`); I did not verify whether the 0.05 threshold is a single constant. If it is, it needs to move onto the region/country config as `drivingLimit`. This also touches the harm-reduction rule that the app must never imply fitness to drive.

### 6. Currency and price localisation (if a paywall comes)
- Nothing exists today (no `Intl.NumberFormat`, no currency). Do not hand-format prices.
- Use the store (App Store / Play Billing / Stripe) as the source of price and currency, and show the localised string it returns. Avoid computing prices in app code. If Stripe on web: use Stripe Prices with `currency_options` and Adaptive Pricing; display with `Intl.NumberFormat(locale, { style: "currency", currency })`.
- Tax-inclusive pricing is expected in AU, UK, EU and NZ (GST/VAT included), exclusive in the US/Canada. Copy like "$X/month" needs a "incl. GST" note per region. Check consumer law: AU Australian Consumer Law cooling-off for subscriptions, EU 14-day withdrawal, UK Consumer Contracts Regulations. This is a legal review item, not code.
- Keep paywall copy out of the harm-reduction path: never gate the emergency number, the "get home" screen, or the not-safe warning. Region and emergency data must be free in every country.

### 7. i18n library: adopt or not
Recommendation: do not adopt a full library yet. Adopt a thin structure first, and add a library only when a non-English language is actually planned.

- All planned regions (AU, US, UK, NZ, CA, IE) are English. Their differences are data (units, serve names, numbers, spelling like "litre", "alcohol" vs "liquor"), not translation. A typed region config plus a small copy-variant table covers it.
- French is required for Canada if you want to be accessible in Quebec (Bill 96 pressure applies to commercial services), and the EU needs local languages. That is the trigger for a library. Candidates in Next.js (App Router): `next-intl` (best fit, server-component friendly, ICU plurals), or `react-intl`/`i18next` (heavier). ICU message format matters because the app has many plural and number strings ("1 drink", "2 std drinks").
- Do not let `lang` and region collapse into one setting. Keep three: language (UI text), region (units and standard), and emergency country (can differ when travelling).
- Cheap prep now: stop writing new user-visible strings that embed `region.id === "us"` checks; route them through region fields.

## Phased plan

Phase 0: safety fixes (small, do first)
1. Stop falling back to AU for everyone: in `guessRegion` (region.ts:75), map `en-AU`, `en-NZ` to AU-style, and make the unrecognised case explicit rather than defaulting to "Call 000". Show the number picker prompt, or at least never display "000" to a UK/EU/CA user. Update `region.test.ts:21-24`.
2. Remove the `toLocaleString()` server-side session name (`src/server/api/routers/post.ts:77`).
3. Fix the 570 ml "Pint of beer" label in the UK context when UK is added (568 ml).

Phase 1: restructure region data (no new regions visible yet)
1. Rename `"metric"` to `"au"` (keep a migration for the stored `localStorage` value `"metric"` in `src/hooks/useRegion.tsx:8-33`; accept both on read). Rename in `consent.ts`, `sizes.ts`, `Landing.tsx`, `TermsAndDisclaimerDialog.tsx`, tests.
2. Split `Region` into: `StandardDef` (name, grams, noun), `Units` (weight, volume, 12/24h), `EmergencyInfo` (primary number, alt number, poison line), `Law` (legal age, driving limit), `serves`. Generate `label` from fields instead of a hand-written string (region.ts:38/55).
3. Replace `kindOf` regex (sizes.ts:13) with an explicit `kind` field on each `Serve`. Move the `METRIC`/`US` tables into per-region data. Derive "22 oz" labels from `formatVolume`.
4. Remove the `MANUAL_CHIPS = servesFor(REGIONS.metric)` default (`details.ts:50`) and the `region = REGIONS.metric` default parameter, so a forgotten region is a type error.
5. Persist region on the account (new column on the user, included in the account export and in `consent-export`), so sync and server-side rendering are consistent. Keep localStorage as the anonymous fallback.

Phase 2: add UK, NZ, Canada, Ireland (English)
1. Add the data from the table in section 5. Add `"imperial-oz"` and `"st"` units only if UK users want them (default UK to ml and kg/stone; confirm with research).
2. Region picker: replace the two-button toggles (`Landing.tsx:~102`, `DetailsForm.tsx:69`, `TermsAndDisclaimerDialog.tsx:94-100`) with a list or select; the dialog's "Switch to US" link becomes "Change region".
3. Tests: per-region round trip (stored to shown to stored), per-region serve rounding, per-region emergency number, `guessRegion` for `en-GB`, `en-NZ`, `en-CA`, `en-IE`.
4. Terms and privacy: legal review per country (age, data protection: UK GDPR, NZ Privacy Act, PIPEDA); `terms/page.tsx:36` becomes data-driven.
5. Per-region driving limit (see section 5) and the "not safe" copy.

Phase 3: time and copy
1. `formatClock`: add 12/24-hour option, default from region, keep deterministic output (`src/lib/format-clock.ts`, plus `format-clock.test.ts`).
2. Move region-sensitive copy into one `copy` module keyed by region (noun for "std drink", "alcohol"/"liquor", "unit"), so Phase 4 can swap it for a library.
3. Make the parser and AI prompt region-aware (`src/lib/drinks/parse.ts`, `catalog.ts`, `serves.ts`, `ai.ts`, `bartender.ts`): pass region so "pint" means 568 ml in the UK and 473 ml in the US.

Phase 4: languages and price (only when a business reason exists)
1. Adopt `next-intl` with ICU messages when the first non-English language (Canadian French is the likely first) is scheduled. Extract strings screen by screen; start with the safety path (GetHome, Estimate, NightStatus) so those are reviewed by a native speaker.
2. Paywall: price and currency from the billing provider, `Intl.NumberFormat` for display, tax-inclusive copy per region, and never gate safety content.
3. Set `<html lang>` dynamically (`layout.tsx:67`) and add `hreflang` only if separate localised landing pages are shipped.

## Top risks

1. Wrong emergency number for anyone outside AU or US (UK, NZ, EU, CA all currently get "000").
2. Wrong standard-drink definition silently applied outside AU and US (a UK unit is 8 g, so a UK user logging "units" would be under-counted by 25 percent against a 10 g standard if the labels say units).
3. Wrong driving limit if the 0.05 threshold is a constant (unverified).
4. Region lives only in `localStorage`, so a cleared browser or new device re-guesses and can flip units mid-night.
