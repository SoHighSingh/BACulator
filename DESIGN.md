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
- **Light field:** two radial blue glows behind the estimate (`.glass-field`). Static: it never moves.
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
1. **Top bar** (glass, sticky): BACulator · Get home · You (person icon + "You", opens Your details).
2. **Not safe to drive** (glass pill, sticky under the bar, separate from it): coral triangle, white words, "about 0.10" in `ink-2`. Shown whenever drinks are counted and the model is above zero, with no weight, and through the slow-eliminator tail.
3. **Estimate** on the light field: "Estimated blood alcohol", about + number, "Likely 0.07 to 0.14", a 4px range strip (signal band with a soft glow, a 2px ink tick at the point, only zero implied, no other marks), and "Still rising: about 0.11 by 11:20 pm" or "Falling".
4. **Tonight** card: the scrubbable curve (past solid with a glow and a fading fill, future dashed, a now line and dot), "Now · about 0.10" header that reads the scrubbed time, hour labels.
5. **Numbers** card: Back to zero (range of clock times), Peak, Counted; "Estimate only. Bodies and pours vary."
6. **Getting home** card: the emergency instruction first, then rows for Call 000 (alert), Text a mate, Find a ride; Terms and Privacy.
7. **Your tab** card: newest first; each row opens Edit (time and size) and has its own Remove.
8. **Dock** (glass, fixed bottom, 28px corners): status line ("Added: Vodka soda ×2 [Undo one]", "Removed … [Add back]", "Last: … · 6 min ago", "Saved on this phone, will sync"), the white **Add another vodka soda** pill (72px), and the composer: "Type or say a drink" with a mic key. Focusing the composer hides the pill and shows recents as suggestion chips; typing parses on the device (catalog) and shows a confirmation card with time and "Add · 1.9 std"; the bartender (Workers AI) is only asked when the catalog can't read it.
Desktop (≥1024): two content columns; the dock floats as a 420px glass panel at the bottom right.

## Time of a drink
Default now. Chips: Now / 15 min ago / 30 min ago / 1 hour ago, then **Earlier…** which opens a slider (5-minute steps, back to the start of the 48 h window) with −15 / +15 minute buttons either side and a live read-out "9:40 pm · 1 h 20 min ago". Dragging is never the only way. The same control edits a logged drink's time.

## Motion (all off under `prefers-reduced-motion`)
- Nothing moves at rest. The only loop is the mic ring while the microphone is live.
- Number change: 520ms blur-in (blur 10px → 0, rise 10px). Range band: 520ms width/position ease.
- Composer open: 280ms rise. Sheets: 340ms rise. Status line: 260ms slide-in. Press: scale 0.975 in 160ms. Pointer light on dock and rows follows the finger (radial highlight), only while touched.
- Curve draws in once (900ms clip). Easing everywhere: `cubic-bezier(0.16, 1, 0.3, 1)`.
- Swift port: blur-in ≈ `.blurReplace` + `.spring(response: 0.5, dampingFraction: 0.9)`; glass = `.glassEffect()` / `.ultraThinMaterial`; sheets = system sheet.

## Components
- `NightView` (presentational) / `NightScreen` (data, optimistic adds, undo/add back, edit).
- `Estimate`, `TimelineCard` (curve), `NightNumbers`, `GetHome`, `TonightList`, `AddDock` + `Composer`, `TimeControl`, `AddSheet` and `EditDrinkSheet` (Radix Dialog), `Onboarding` (weight and sex, once, before the first night), `DrinkIcon`, `WarningMark`.
- Landing: `Landing` (glass hero with the live night screen, how the estimate works).

## Targets and the impaired-user floors
Primary add 72px tall and full width; every target ≥ 48px; ≥ 8px between targets and ≥ 12px around the primary. Status words ≥ 7:1, everything else ≥ 4.5:1, control edges ≥ 3:1. Repeat drink = 1 tap; a new drink ≤ 3 taps (type, size, Add); typing and voice are optional. Undo instead of confirm. The microphone is only requested when the mic key is tapped.

## Dev preview
`/dev/night` renders the real night screen with sample drinks (`?empty`, `?noweight`, `?us`, `?metric`, `?offline`). `/dev/directions/*` holds the direction prototypes and labs.
