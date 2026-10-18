# BACulator — design system: "Glass"

Chosen 18 Oct 2026 from five built directions (Result, Night dial, Forecast, Health card, Glass); prototypes live under `/dev/directions` (dev only). The register is Vercel / shadcn / Claude desktop: dark zinc, light caught on 1px edges, solid cards for anything you read, and liquid glass only for the chrome that floats over content. Premium comes from material, restraint and motion that answers the finger, never from loud fills or big buttons.

Two modes share one system:

- **Night screen (Operate):** a still field of blue light behind one number, solid cards below it, and three pieces of glass chrome: the top bar, the "Not safe to drive" pill and the dock. Content scrolls under the glass.
- **Landing (Persuade):** the same world, centred like a product page: a two-line headline, a white squircle key, and the real night screen floating in a glass frame on the light field, driven by try-it chips.

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
- **White key:** the primary action is white (`ink`) with `bg` text: a full-width squircle key on the dock, a square squircle for compact keys, a soft blue under-glow. No other filled colour buttons.
- **Corners: one squircle language.** Every container is a squircle (`corner-shape: squircle`, set globally in `globals.css`; Chrome 139+), with a radius of about 25–30% of its height for controls, the proportion of the mark's tile (rx 16 on 64). Nothing is a pill and no key is a disc; "pill" in this document names the status element, not a shape. Tokens (`@theme`, so `rounded-key` etc.): `mark` 8px (≤ 32px marks: chart tooltip, live-value tag), `tile` 11px (40–44px: the brand tile, icon tiles in rows), `key` 13px (48–56px controls: keys, chips, icon keys, the status pill, the composer), `card` 14px, `row` 16px (rows, inputs, panels inside sheets, the Getting-home tiles), `primary` 20px (64–72px white keys), `panel` 28px (dock, centred modals, the landing's glass frame), `sheet` 32px (bottom sheets, top corners). Where `corner-shape` is unsupported (Safari, Firefox) the same tokens step down to about 0.8× (key 11, primary 16, panel 23, sheet 26…) so plain arcs read with the same tightness. True circles exist only for marks that are not containers, via `rounded-circle` (`corner-shape: round`): the range bar's band, tick and peak ring, the chart's now-dot, size-option rings, the slider thumb and track, the sheet's grab handle. Concentric insets keep the family: the mark's tile (11) sits 2px inside the pill (13); the mic's live ring is key + 6px; the landing video sits 8px inside its 28px frame at 20px. The status pill's morph clips with `clip-path: inset(... round)`, which is always a plain arc, so the open state clips to the whole box and lets the squircle `border-radius` shape it.

## Type (Geist, one family; Geist Mono never)
- Number: `clamp(88px, 27vw, 116px)`, weight 500, tracking −0.055em, line-height 0.88. "about" 24px / 500 beside it.
- Range line "Likely 0.07 to 0.14": 20px / 500. Section titles 18px / 600. Body and rows 18px / 400–500. Secondary 18px in `ink-2`. Nothing on the night screen under 18px except chart axis labels (16px).
- The add pill: 20px / 500, sentence case, normal tracking ("Add another vodka soda"). No oversized drink names.
- Landing headline `clamp(44px, 7.2vw, 92px)` / 600, tracking −0.055em, two lines at every width ("Blood alcohol, / with error bars.").
- Figures: proportional lining for the number and prose; `tabular-nums` only where figures stack (tab rows, axis).
- No eyebrows, no tracked uppercase labels.

## Night screen layout
Top to bottom, phone (max-width 480, 16px gutter, safe-area aware):
1. **No top bar.** Top left, the mark; or, whenever a drink is counted, the "Not safe to drive" pill in its place (`NightStatus`; see Material, warning pill). Two square glass icon keys (Get home = house, You = person; 48px squircles, spoken labels) sit right. All of it floats over the field, sticky; a dark scrim fades content out under it as it scrolls. The pill is `role="status"`, so the change is announced; the name stays in a hidden h1.
2. **Estimate** on the light field: "Estimated blood alcohol", about + number (the number is a button that opens **About this estimate**), then the range bar: the likely range as a thin (4px) glowing band, a white tick for now, and the way it is heading built in light, like a long exposure. Rising: a comet of light leads from the tick (white-hot) and thins toward a hollow ring at the coming peak (`.momentum-glow` / `.momentum-core`, `bg-bg/50` ring), with "↗ Rising to about 0.11 by 11:20 pm" under the bar. Falling: a dimmer white tail trails from the tick back to an hour ago, no ring, and "↘ Falling". Static at rest, always. Labels are 18px `ink-2`, always left-anchored. Tapping the bar shows "Likely 0.07 to 0.14" instead. Nothing under the number. No arrows, chevrons, dashes or threshold marks. (Spec, and the hero strip's scale: `.shots/rising-spec.md`.)
3. **Not safe to drive state:** whenever drinks are counted (the same rule as the warning, never a number threshold) the light field cross-fades from blue to warm red across the whole screen and the mark becomes the pill (see Motion). Both hold still until the slowest likely back-to-zero time, then reverse. No pulse.
4. **Tonight** card: the scrubbable curve and hour labels; its header ("Tonight" + an expand icon, "Now · about 0.10" reading the scrubbed time) is the button that opens the bigger graph. No instruction text.
5. **Numbers** card: Back to zero, Peak, Counted; "Estimate only. Bodies and pours vary."
6. **Getting home** card: "Getting home · Call, text or ride", three equal tiles (Call 000 in alert, Text, Ride; full names to screen readers), a closed "When to call 000" disclosure holding the emergency instruction, then Terms and Privacy.
7. **Your tab** card: newest first; each row opens Edit (time and size) and has its own Remove.
8. **Dock** (glass, fixed bottom, 28px corners): status line ("Added: Vodka soda ×2 [Undo one]", "Removed … [Add back]", "Last: … · 6 min ago", "Saved on this phone, will sync"), the white **Add another vodka soda** pill (72px; 64px on short screens), and the composer: "Type or say a drink" with a mic key. Focusing the composer hides the pill, shows recents as one scrolling row of suggestion chips and folds a parsed drink to one line with an inline Add; the dock rides on top of the keyboard. Done drops the keyboard and shows the full card with its time control. The bartender (Workers AI) is only asked when the on-device catalog can't read it.
   *(18 Oct, late)* At rest the dock is just the white **Add another …** pill (72px) and a bordered **+ Add a different drink** pill with the mic as its own key; the status line shows only when a change lands (Added/Removed with Undo/Add back) and stays in a screen-reader live region otherwise. The add sheet is a list of roomy rows (recents first, then drinks with a + for the usual size; tap a row for size, how many and time), never a grid.
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
