# 03 · Clutter audit: Numbers, Your tab, details sheet, estimate header

Read-only audit of `/dev/night` (sample drinks, 22 Oct 2026) against DESIGN.md, PRODUCT.md, the impaired-users skill and `impeccable/distill` + `clarify`. Nothing in `src/` was edited.

Screenshots (real Chrome, `npm run shoot`): `.shots/next-session/-dev-night-{375x812,320x568,1440x900}-{0..3}.png` (0 rest, 1 scrolled to Numbers, 2 scrolled to Your tab, 3 details sheet), `-dev-night-us-375x812-1.png` (sheet, 911), `-dev-night-empty-375x812-0.png`.
Mocks: `.shots/next-session/mock-night-mock-{375x812,320x568}.png`, `mock-details-mock-375x812.png`, and `contact-before-after.png` (now vs mock side by side). Sources in the session scratchpad: `night-mock.html`, `details-mock.html`, `glass.css`, `shoot-mocks.mjs`.

The user's cuts, taken as decided: no "Estimate only. Bodies and pours vary." on the night screen; no Counted row; Numbers becomes a Back-to-zero / Back-to-0.05 pair; a small trailing digit on the number; no visible scrollbar; tab and details redesigned for calm.

---

## 1. Element-by-element: keep / cut / merge

### Numbers card (`NightNumbers.tsx`)
| Element | Verdict | Why |
|---|---|---|
| Back to zero row | **Keep** | The one forward-looking fact that isn't on the bar. |
| Peak row ("about 0.11 at 11:34 pm") | **Cut** | Restated three times already: the rising label under the bar ("Rising to about 0.11 by 11:34 pm"), the hollow ring on the bar, and the curve's crest. When falling, the peak is history and nobody out needs it. |
| Counted row ("4 drinks · 5.8 std") | **Cut** (user) | The tab header below says it. |
| "Estimate only. Bodies and pours vary." | **Cut** (user) | The heading already says "Estimated"; the disclaimer lives once, in the sheet. |
| *(new)* Back to 0.05 row | **Add** | When the red field ends; see §2.1 for the engine. |
| Card chrome (border, dividers) | Keep | Material, not meaning. Two rows, one card. |

### Your tab (`TonightList.tsx`)
| Element | Verdict | Why |
|---|---|---|
| "Your tab" title | Keep | |
| "Last 24 hours" sub-line | **Cut** | Nobody out needs the window named; the times on the rows say when. The morning view can say it if a morning view ever exists. |
| Big 30px total "5.8" + "standard drinks" word | **Merge** into one 18px/500 line at the right of the header: "4 drinks · 5.8 std" | A second hero number competes with the estimate. PRODUCT: "std" only next to a number. This also absorbs Counted. |
| Row line 1: drink name | Keep | The one thing a row must never hide: wrap to 2 lines, never ellipsis. |
| Row line 2: "11:08 pm · 1.6 std" | **Merge** into the same line as the name: three columns, name · time · std | One line per drink scans in a glance; the 2-line row was 56px of mostly repeated "std". |
| "std" on every row | **Cut** | The header says the unit once; the column is figures only, `tabular-nums`. |
| Chevron › | **Cut** | Redundant icon: the whole row is a button with a hover tint and a press scale; the edit sheet opening teaches it once. Keep the accessible name "Edit …". |
| Remove key on every row | **Move** into the edit sheet (a second, quiet key under Save) | Four bordered keys per screen are the loudest things in the card and the only destructive controls on the logging screen. The impaired-users skill wants destructive controls off the logging path; Undo already covers mistakes ("Removed … [Add back]"). Two taps to remove is fine for a rare action. |
| "Saved on this phone, will sync" per row | **Merge** into one footer line on the card when `unsynced > 0` ("2 saved on this phone, will sync") | Otherwise a bad-signal night repeats it on every row. The dock's live region already speaks it. |
| Newest-first order | Keep | |

### Details sheet (`EstimateDetails.tsx`, "About tonight's estimate")
| Element | Verdict | Why |
|---|---|---|
| Title "About tonight's estimate" + close key | Keep | Radix needs a title; the close key is the 48px escape. |
| Now row ("about 0.10") | **Cut** | The number is 116px tall directly behind the sheet. |
| Likely range row | **Keep, promote** to the hero line: small "Likely" label, "0.07 to 0.14" at 34px/500 | It is the thing the number can't say. |
| Peak row | **Cut** | See Numbers. |
| Back to zero row | Keep | |
| *(new)* Back to 0.05 row | Add | Same pair as Numbers; the sheet and the card must agree. |
| "Only time brings it down." | **Cut** | A lecture line; the Back-to-zero time already says it. |
| "The range is wide because bodies and pours vary." | **Cut** | The user has retired this sentence twice already. |
| Hazard glyph before the disclaimer | **Cut** | The person just tapped a hazard glyph to get here; a second one restates the obvious. |
| "Estimate only. It can't tell you whether you're fit to drive." | **Keep**, the one disclaimer, 18px `ink-2` (not bold `ink`) | It must exist once; it does not need to shout at someone who already opened the sheet. |
| Emergency line on the alert-tinted row | **Keep** exactly as is | For whoever holds the phone; the tint is what lets a stranger find it. |
| Terms / Privacy links | **Fold away**: move to the You sheet (profile/settings), where sign-out and delete already live | They are not about tonight's estimate. If legal wants them reachable from the night screen, keep them as the last, quietest line (as mocked). |
| Card box around the rows | **Cut** | A card inside a glass sheet is a card in a card; plain rows with 1px `edge` dividers read calmer. |

### Estimate header (`Estimate.tsx` + `NightStatus`)
| Element | Verdict | Why |
|---|---|---|
| Mark, hazard key, You key | Keep | Settled chrome. |
| "Estimated blood alcohol" heading | Keep | Carries "estimate"; it is why "about" and the disclaimer can go. |
| The number | Keep, add the small third digit (§2.4) | |
| Range bar: band, tick, comet, ring | Keep | |
| Label under the bar, rising ("↗ Rising to about 0.11 by 11:34 pm") | Keep | This is why Peak can go everywhere else. |
| Label under the bar, falling ("↘ Falling") | Keep | |
| "tap to hide" when the range is shown | **Cut** | The bar is `aria-expanded`; a second tap anywhere on the bar hides it; the hint is clutter on the hero. If anything, the range text alone. |
| Tonight card header "Now · about 0.10" | **Cut at rest**; show only while scrubbing ("11:40 pm · about 0.08") | At rest it repeats the number 60px above it. (Not strictly in scope, but it is the same fact three times on one screen.) |
| Tonight expand icon (Maximize2) | Keep (but it is the only decorative icon left; fine) | |

---

## 2. Redesign specs

### 2.1 Numbers: two rows
One `.card`, a `dl` with two rows, 18px, label `ink-2` left, value `ink`/500 right, `tabular-nums`, min-height 48px, 1px `edge` divider. Nothing else in the card: no note, no Peak, no Counted. Hide the card when neither row has a value (model at zero).

```
Back to zero     5:00 to 11:45 am
Below 0.05       2:30 to 6:15 am
```

**Label.** The user said "back to 0.05". Prefer **"Below 0.05"** (or "Under 0.05"): "back to" suggests a target to reach; "below" states a fact and matches the red rule ("the red field ends when the shown number drops below 0.05"). Either way no "limit", no "legal", no "safe".

**Tension, stated neutrally.** PRODUCT.md's non-negotiables list "no 'time until 0.05'" and DESIGN says nothing is framed as a driving state. The user has now asked for this row; the honest framing is that it is the time the red screen ends, nothing more. The row should use the same wording family as Back to zero (a range, "to"), never a single clock time, and the sheet's disclaimer stays. The next session should record the decision in PRODUCT.md either way.

**Engine.** Yes, it can supply it, and as a range:
- `BACResult.timeToLegal` already exists (`bac-calculator.ts:380`, `hoursToTargetFromTimeline(timeline, start, now, 0.05)`), but it is the raw model crossing 0.05. Red is keyed on the *shown* number: `isAlert` = `ceil2(bac) >= 0.05`, i.e. raw > 0.040. So the red field ends when the raw model drops to ≤ 0.040, which is `hoursToTargetFromTimeline(…, 0.04)`, not 0.05. Recommend a new field on `BACResult` (`timeToBelowAlert`, target `ALERT_AT - 0.01`) or a `findTimeToTarget(drinks, w, s, now, 0.04)` call in `describeNight`, so the row and the field agree to the minute. (If the third digit lands and `isAlert` moves to `ceil3`, use target `ALERT_AT - 0.001`; see §2.4.)
- Format with the existing `formatBackToZero(hours, now)` (0.75×–1.6× of the hours, quarter-hour rounding) so both rows share one voice: "2:30 to 6:15 am". Strip "between" as the rows do today.
- Edge cases: `0` hours (already below) → hide the row; `-1` (beyond the 48h horizon, returned as 48) → hide or "after 11 am tomorrow"; rising past 0.05 later tonight is handled because the helper scans for the *last* sample above target.
- `EstimateDisplay` gains `backToAlert: string | null` next to `backToZero`; `NightNumbers` and `EstimateDetails` read the same field.

Alternative (not mocked): fold the two rows into the bottom of the Tonight card under the axis, one card fewer. Cleaner, but the user's words say "table row"; the separate card is what was mocked.

### 2.2 Your tab
Mocked in `mock-night-mock-375x812.png`.
- **Header** (padding 16px 20px): "Your tab" 18px/600 left; right, 18px/500 `tabular-nums`: `{n} drinks · {std} std` (singular "1 drink"). No sub-line, no 30px figure.
- **Row** = one `<button>`, full width, min-height 56px, padding 8px 20px, `grid-template-columns: minmax(0,1fr) auto auto; column-gap: 12px`:
  1. name, 18px/500, `ink`, wraps to 2 lines (`-webkit-line-clamp: 2`), never ellipsis;
  2. time, 18px/400, `ink-2`, `tabular-nums` ("11:08 pm");
  3. standards, 18px/400, `ink`, `tabular-nums`, right-aligned, min-width 3ch ("1.6").
  Accessible name: "Edit Vodka soda, 11:08 pm, 1.0 standard drinks". Hover `bg-white/[0.03]`, `.press`. No chevron.
- **Dividers** 1px `edge`; `divide-y` as now.
- **Footer**, only when any row is unsynced: one line 18px `ink-2`, "2 saved on this phone, will sync".
- **Remove** moves to `EditDrinkSheet`: under the white Save key, a 56px bordered key (`shadow-[inset_0_0_0_1px_var(--color-line)]`, `ink-2`), "Remove", ≥ 24px gap from Save. Removing closes the sheet and fires the existing "Removed … [Add back]" notice. Keyboard and screen-reader users lose nothing: the row is still the one target.
- 320px: labels wrap ("Schooner of lager" to two lines) and the row grows; nothing truncates (`mock-night-mock-320x568.png`). Desktop (`.night-cols`): unchanged two-column grid; the lighter header stops the tab competing with the number at 1440.

### 2.3 Details sheet
Mocked in `mock-details-mock-375x812.png`. Top to bottom inside the existing `Sheet`:
1. Title + close (unchanged).
2. **Likely** label (18px `ink-2`) over **"0.07 to 0.14"** at 34px/500, tracking −0.03em, `tabular-nums`. When the model is under 0.01, show "under 0.01" at the same size.
3. Two plain rows (no card): Back to zero / Below 0.05, 52px min-height, 1px `edge` divider between them, same formatting as the Numbers card. Rows with no value are omitted.
4. The disclaimer, one line, 18px `ink-2`, no icon: "Estimate only. It can't tell you whether you're fit to drive."
5. The emergency row, unchanged (alert-tinted, `tel:` link on the whole row, number from `lib/emergency`; 911 under `?us` verified).
6. Terms · Privacy as the last line in `ink-2`, 48px tall targets — or moved to the You sheet (preferred).
Cut: Now, Peak, both notes, the hazard glyph, the inner card. The sheet is now ~60% of its old height at 375 and fits 320×568 without scrolling past the emergency row (`-dev-night-320x568-3.png` shows today's sheet cut off mid-disclaimer).

### 2.4 The extra decimal
**What to show.** The headline becomes the model rounded **up at the third place** (`ceil3`), split into two spans on one baseline: the big "0.09" (unchanged size, `clamp(88px,27vw,116px)` / 500 / −0.055em) and a small "7" at **0.35em** of the number (≈31–41px), weight 500, tracking −0.02em, `font-variant-numeric: tabular-nums` so the glyph never shifts width, `margin-left: 0.06em`, colour `ink-2` (7.8:1 on bg; over the brightest red still ≥ 6.6:1 per DESIGN's compositing note). Mocked: `0.09` `7` for a model of 0.0963.

**Why this is honest.** `0.09|7` is a true reading of the model (≥ the model, never under). The current `0.10` is `ceil2`, which is also ≥ the model but by up to 0.009. HANDOFF.md says precision "must not come from fake decimals": a third digit of the model is not fake; a third digit painted onto a `ceil2` value would be (0.10|3 for a model of 0.096 is a lie). So the rule is: **the small digit is only shown if the big digits are the model's own first two decimals**, which means switching the headline from `ceil2` to `ceil3`.

**The tension, briefly.** Two things change when the headline is `ceil3`:
- The glance reads lower than today for most values (0.09 instead of 0.10 for 0.0963). The skill's "round hard, be humble" pulls the other way; the user's ask ("feels more accurate") pulls this way. The range bar and "Likely 0.07 to 0.14" still carry the doubt, and the heading still says "Estimated".
- `isAlert` keys red on the shown number (`ceil2 >= 0.05`, raw > 0.040). If the big digits now read "0.04|3" while the field is red, that reads like a bug. Recommend moving `isAlert` to the same `ceil3` value (red from a shown 0.050, raw > 0.049): one line in `estimate-display.ts`, update the two tests, and PRODUCT/DESIGN's "shown number" wording stays true. Red then starts up to ~35 min later than today at 0.015/h. The hazard key (range top, `ceil2`) is unaffected. If the user would rather keep red stricter, the alternative is to keep `isAlert` on `ceil2` and accept the "0.04|x but red" window; say which in the decision log.

**Updates.** `now` ticks every 30 s (`NightScreen.tsx:24`), and the third place moves about every 4 minutes at 0.015/h, so it visibly changes on its own, which is what the user wants. Keep DESIGN's "nothing moves at rest": the `num-in` blur animation must key on the **two-decimal** string only (today it keys on `point`); the small digit swaps in place with no animation (or a 200ms opacity cross-fade at most). Keep the `point.length > 4` branch for "under 0.01" (no small digit there, nor at 0.00).

**Screen readers.** Unchanged: the `sr-only` live line keeps "Estimated blood alcohol about 0.10 …" (`ceil2` with "about"), and the number button's `aria-label` keeps `about 0.10`. The small digit is inside the existing `aria-hidden` span. Voice never reads a three-decimal figure (skill copy rule: "never a bare three-decimal number").

**Where it reads elsewhere.** The Tonight card readout, the sheet, Numbers and the scrub tag stay two-decimal "about" values; only the hero gets the third digit.

### 2.5 The scrollbar
**Where.** `NightView.tsx:95`: `<main class="app-main h-full overflow-y-auto overscroll-contain">` inside the fixed `app-shell`. On Windows/Linux Chrome and any desktop without overlay scrollbars that draws a classic 15–17px bar down the right of `main` (the 1440 Playwright shots don't show it because Playwright's headless Chrome uses overlay bars; the user's real Chrome does). The second one is the sheet body, `Sheet.tsx:43` (`overflow-y-auto`), which shows whenever the sheet content exceeds `92dvh` (today's sheet at 320×568).

**Fix** (globals.css, keeps wheel, touch, trackpad and keyboard scrolling; scrolling is a property of `overflow`, not of the painted bar):
```css
.app-main, .sheet-body { scrollbar-width: none; }           /* Firefox, Chrome 121+ */
.app-main::-webkit-scrollbar, .sheet-body::-webkit-scrollbar { display: none; } /* Safari, older Chrome */
```
Give the sheet's inner div a `sheet-body` class. Keyboard: Chrome ≥ 130 makes scroll containers keyboard-focusable by default, so Space/PgDn/arrows still work once the main has focus; to be safe add `tabIndex={-1}` to `main` so programmatic focus (and click-to-focus) lands there, and keep the existing `:focus-visible` ring off it (`outline-none` on main only; it's not a control). Do not use `overflow: hidden` + JS scrolling, and do not set `scrollbar-gutter`. Also check `.night-cols` at 1440: with the bar gone the content gains ~17px on the right; the `right: 24px` dock still clears it.

---

## 3. Further clutter found (ranked)
1. **Three copies of the current number on one screen at rest**: the hero, "Now · about 0.10" in the Tonight header, "Now · about 0.10" in the sheet. Show the Tonight readout only while scrubbing; cut Now from the sheet. (Major: attention is the first thing alcohol takes; every repeated fact is a target the eye has to reject.)
2. **Peak stated three ways** (rising label, ring, Numbers row, plus the sheet row): keep only the label and the ring.
3. **Four "Remove" keys** are the loudest elements on the logging screen and the only destructive controls there; move to the edit sheet.
4. **"std" printed on every tab row** and "standard drinks" under the total: the unit once, in the header.
5. **"Last 24 hours"** restates what the times show.
6. **Chevrons** on tab rows: decoration that says "this row is tappable" on rows that already behave like rows.
7. **"tap to hide"** on the range bar: a hint on the hero; the bar is a toggle already.
8. **Hazard glyph in the sheet** when the sheet was opened from a hazard glyph.
9. **Both sheet notes** ("Only time…", "The range is wide…"): facts the person cannot act on at 0.10, and the second has been retired twice.
10. **Card-in-sheet**: the rows' box inside the glass sheet doubles the material.
11. **Terms / Privacy inside "About tonight's estimate"**: wrong room; belongs with sign-out and delete in the You sheet.
12. **"Saved on this phone, will sync" per row** on a bad-signal night.
13. Minor: 320px today wraps "5:00 to 11:45 am" into two lines in the Numbers card; if the next session wants a one-line value at 320, format the pair as "5:00–11:45 am" (en dash, one period) via a `compact` option on `formatBackToZero`, and keep "to" in the spoken text.

## 4. What already works (don't touch)
The estimate block (heading, number, bar, one label) is the right amount of information; the hazard key + red field carry state without words; the dock is one clear action; the emergency row is findable by a stranger; everything measured is ≥ 18px and ≥ 48px targets. The cuts above remove about 11 text elements and 8 controls from the scrolled screen without removing a fact the person needs while out.
