# BACulator — design system: "Glass"

Chosen 18 Oct 2026 from five built directions (Result, Night dial, Forecast, Health card, Glass); prototypes live under `/dev/directions` (dev only). The register is Vercel / shadcn / Claude desktop: dark zinc, light caught on 1px edges, solid cards for anything you read, and liquid glass only for the chrome that floats over content. Premium comes from material, restraint and motion that answers the finger, never from loud fills or big buttons.

Two modes share one system:

- **Night screen (Operate):** a still field of blue light behind one number, solid cards below it, and three pieces of glass chrome: the top bar, the "Not safe to drive" pill and the dock. Content scrolls under the glass.
- **Landing (Persuade):** the same world, centred like a product page: a two-line headline, a white pill action, and the real night screen floating in a glass frame on the light field, driven by try-it chips.

Retired: the pint-glass FluidGauge and every liquid effect, the paper docket and stamp, amber as the action colour, flat slab buttons, hairline-free "tone step only" rule (1px edges are now part of the material).

## Tokens (`src/styles/globals.css`, `@theme`)
| Token | Value | Use | Contrast |
|---|---|---|---|
| `bg` | `#09090b` | page ground | — |
| `surface` | `#0f0f12` | cards | — |
| `surface-2` | `#16161a` | raised rows, inputs, sheets | — |
| `surface-3` | `#1f1f24` | pressed states, small buttons on cards | — |
| `edge` | `#27272a` | 1px card borders and row dividers (material, not meaning) | — |
| `line` | `#52525b` | control boundaries (inputs, Remove, outline buttons) | 3.1:1 on bg, 3.0:1 on surface |
| `ink` | `#fafafa` | text, the number, the white pill and keys | 19.1:1 on bg, 18.4:1 on surface |
| `ink-2` | `#a1a1aa` | secondary text | 7.8:1 on bg, 7.4:1 on surface, 6.9:1 on surface-2 |
| `signal` | `#7cb4ff` | the estimate's range band, the curve, focus rings, the light field | 9.0:1 on bg |
| `alert` | `#ffa494` | the warning icon, "Call 000", errors | 10.0:1 on bg, 8.9:1 on surface-2 |

Text on the white pill and keys is `bg` (19.1:1). Glass chrome is `rgb(18 18 22 / 0.78)` with blur, so text on it measures at least 15:1 whatever scrolls behind; under `prefers-reduced-transparency` and `prefers-contrast: more` it becomes solid `surface-2` / black with a 2px edge.

No green anywhere, no red/green status, no colour-only meaning: status is icon + word + colour.

## Material
- **Light field:** two lights on one fixed ground (`.glass-field`): the blue glows (`::before`) and the red not-safe-to-drive field (`::after`). Static: it never moves. `.is-alert` cross-fades them (the blue leaves in 700ms as the red blooms in 900ms, so there is no purple half-way), then still.
- **Warning pill (`.night-status`):** the top-left chrome for the whole night. One 48px glass pill, fixed at the left of the header: a 32px warning disc (alert at 12% fill, 1px alert ring at 28%, 18px triangle) inset 8px from the pill's top, left and bottom, 10px to the words, 16px to the right edge; "Not safe to drive" 18px / 600 in `ink` (17.9:1 on the glass). Calm, the same element is clipped down to the 44px mark. It never appears, swaps or moves on scroll. Under 360px wide the disc drops its fill and ring, the header takes 8px gutters and the words set 500 / −0.02em, still 18px, so the pill clears the keys at 320.
- **The mark (`BrandMark`):** the range strip on a dark tile; `tone="alert"` is the same shape in trouble: band `#ffa494` over a `#ff6a55` glow, tile `#1a0f0e`, warm rim (`#ffd2c8` 50% → `#ffa494` 10% → `#ff6a55` 30%), tick still white. Alert whenever the night is not safe to drive (the warning's rule, never a number threshold); it is also the tab icon in that state.
- **Glass (`.glass`):** `backdrop-filter: blur(22px) saturate(180%)`, a lit top edge (inset 1px white at 14%), a faint inner rim, a soft drop shadow, and a specular rim drawn by `::before` (a 160° gradient border, bright top-left). Only for chrome that floats: top bar, warning pill, dock, sheets, the landing's device frame.
- **Cards (`.card`):** `surface` with a 1px `edge` border, 14px corners; rows inside are split by 1px `edge` dividers. Everything you read sits on a card or on the field, never on glass alone.
- **White key:** the primary action is white (`ink`) with `bg` text: a full-width pill on the dock, a disc for compact keys, a soft blue under-glow. No other filled colour buttons.
- Corners: cards 14px, rows and inputs 16px, pills and keys fully round, sheets 32px top.

## Type (Geist, one family; Geist Mono never)
- Number: `clamp(88px, 27vw, 116px)`, weight 500, tracking −0.055em, line-height 0.88. "about" 24px / 500 beside it.
- Range line "Likely 0.07 to 0.14": 20px / 500. Section titles 18px / 600. Body and rows 18px / 400–500. Secondary 18px in `ink-2`. Nothing on the night screen under 18px except chart axis labels (16px).
- The add pill: 20px / 500, sentence case, normal tracking ("Add another vodka soda"). No oversized drink names.
- Landing headline `clamp(44px, 7.2vw, 92px)` / 600, tracking −0.055em, two lines at every width ("Blood alcohol, / with error bars.").
- Figures: proportional lining for the number and prose; `tabular-nums` only where figures stack (tab rows, axis).
- No eyebrows, no tracked uppercase labels.

## Night screen layout
Top to bottom, phone (max-width 480, 16px gutter, safe-area aware):
1. **No top bar.** Top left, the mark; or, whenever a drink is counted, the "Not safe to drive" pill in its place (`NightStatus`; see Material, warning pill). Two round glass icon keys (Get home = house, You = person; 48px, spoken labels) sit right. All of it floats over the field, sticky; a dark scrim fades content out under it as it scrolls. The pill is `role="status"`, so the change is announced; the name stays in a hidden h1.
2. **Estimate** on the light field: "Estimated blood alcohol", about + number (the number is a button that opens **About this estimate**), then the range bar: the likely range as a glowing band, a white tick for now, and the way it is heading. Rising: an ink arrow from the tick to a chevron at the coming peak, drawn over the band (the peak is usually inside it), with "↗ Rising to about 0.11 by 11:20 pm" under the bar. Falling: a fading trail back to an hour ago and "↘ Falling". Labels are 18px `ink-2`, always left-anchored. Tapping the bar shows "Likely 0.07 to 0.14" instead. Nothing under the number. (Spec for the landing's copy: `.shots/rising-spec.md`.)
3. **Not safe to drive state:** whenever drinks are counted (the same rule as the warning, never a number threshold) the light field cross-fades from blue to warm red across the whole screen and the mark becomes the pill (see Motion). Both hold still until the slowest likely back-to-zero time, then reverse. No pulse.
4. **Tonight** card: the scrubbable curve and hour labels; its header ("Tonight" + an expand icon, "Now · about 0.10" reading the scrubbed time) is the button that opens the bigger graph. No instruction text.
5. **Numbers** card: Back to zero, Peak, Counted; "Estimate only. Bodies and pours vary."
6. **Getting home** card: the emergency instruction first, then rows for Call 000 (alert), Text a mate, Find a ride; Terms and Privacy.
7. **Your tab** card: newest first; each row opens Edit (time and size) and has its own Remove.
8. **Dock** (glass, fixed bottom, 28px corners): status line ("Added: Vodka soda ×2 [Undo one]", "Removed … [Add back]", "Last: … · 6 min ago", "Saved on this phone, will sync"), the white **Add another vodka soda** pill (72px; 64px on short screens), and the composer: "Type or say a drink" with a mic key. Focusing the composer hides the pill, shows recents as one scrolling row of suggestion chips and folds a parsed drink to one line with an inline Add; the dock rides on top of the keyboard. Done drops the keyboard and shows the full card with its time control. The bartender (Workers AI) is only asked when the on-device catalog can't read it.
Desktop (≥1024): two content columns; the dock floats as a 420px glass panel at the bottom right.

## Time of a drink
Default now. Chips: Now / 15 min ago / 30 min ago / 1 hour ago, then **Earlier…** which opens a slider (5-minute steps, back to the start of the 48 h window) with −15 / +15 minute buttons either side and a live read-out "9:40 pm · 1 h 20 min ago". Dragging is never the only way. The same control edits a logged drink's time.

## Motion (all off under `prefers-reduced-motion`)
- Nothing moves at rest. The only loop is the mic ring while the microphone is live.
- Number change: 520ms blur-in (blur 10px → 0, rise 10px). Range band: 520ms width/position ease.
- Composer open: 280ms rise. Sheets: 340ms rise. Status line: 260ms slide-in. Press: scale 0.975 in 160ms. Pointer light on dock and rows follows the finger (radial highlight), only while touched.
- Curve draws in once (900ms clip). Easing everywhere: `cubic-bezier(0.16, 1, 0.3, 1)`; the one exception is the field's colour bloom, `cubic-bezier(0.45, 0, 0.25, 1)`, because the ease-out made 900ms read as a 300ms snap.
- **Calm → not safe (one gesture, ~900ms), when a drink is counted:** 0–250ms the mark's band goes red (`.bm-tone` opacity); 250–900ms the tile's clip opens into the pill (`clip-path: inset(2px … round 11px)` → `inset(0 round 24px)`, 650ms) while the mark scales 44→32 and fades into the warning disc (500 / 380ms) and the words slide in 8px from 330ms (450ms). Underneath, the blue light leaves (700ms) as the red blooms (900ms), half in at ~450ms. Only clip-path, transform and opacity; the pill's box and blur never change size and the keys never move. **Not safe → calm (~650ms), faster:** words out in 180ms, the clip closes from 100ms (450ms), the disc folds back into the mark from 150ms, the band goes blue from 400ms (250ms). It plays only for a change the person made (a notice landed in the last 3s): on load, or when data arrives already not safe, the final state shows with nothing playing. Under reduced motion it is an instant swap.
- Swift port: blur-in ≈ `.blurReplace` + `.spring(response: 0.5, dampingFraction: 0.9)`; glass = `.glassEffect()` / `.ultraThinMaterial`; sheets = system sheet.

## Components
- `NightView` (presentational) / `NightScreen` (data, optimistic adds, undo/add back, edit).
- `Estimate`, `TimelineCard` (curve), `NightNumbers`, `GetHome`, `TonightList`, `AddDock` + `Composer`, `TimeControl`, `AddSheet` and `EditDrinkSheet` (Radix Dialog), `Onboarding` (weight and sex, once, before the first night), `DrinkIcon`, `WarningMark`, `NightStatus` (the mark / warning pill), `BrandMark` (`tone`).
- Landing: `Landing` (glass hero with the live night screen, how the estimate works).

## Targets and the impaired-user floors
Primary add 72px tall and full width; every target ≥ 48px; ≥ 8px between targets and ≥ 12px around the primary. Status words ≥ 7:1, everything else ≥ 4.5:1, control edges ≥ 3:1. Repeat drink = 1 tap; a new drink ≤ 3 taps (type, size, Add); typing and voice are optional. Undo instead of confirm. The microphone is only requested when the mic key is tapped.

## Dev preview
`/dev/night` renders the real night screen with sample drinks (`?empty`, `?noweight`, `?us`, `?metric`, `?offline`). `/dev/directions/*` holds the direction prototypes and labs; `/dev/directions/morph` toggles calm ↔ not safe on the real screen (`?alert` starts red) and `/morph/rising` holds the direction-cue variants.
