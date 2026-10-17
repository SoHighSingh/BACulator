# BACulator — design system: "The tab"

The app keeps your bar tab. Every surface is built from that one idea: drinks print onto a tab, and where a bar puts the price, BACulator puts the standard drinks, an estimate band and a back-to-zero window, with a rubber-stamped **Not safe to drive** whenever it's above zero.

Two modes share one palette:

- **Night screen (Operate, app-like):** a fixed top bar, one scrolling column, and a fixed bottom dock, laid out like a native app, not a page. The estimate is a pint glass filling with amber beside one big number ("about 0.08", likely range under it). Motion only answers a change: the glass pours, sloshes once and settles still within 2 s; the number counts to its new value. Nothing moves at rest.
- **Landing page (Persuade):** the same world, louder. A live paper docket is the hero; whole fields of colour change section by section; motion uses transform and opacity only, and switches off for `prefers-reduced-motion`.

Retired and not coming back: WebGL veil, glass blur, gradients, hairline separators, looping waves, the band-only estimate ("0.06–0.11" was too wide to act on).

## Tokens (`src/styles/globals.css`, `@theme` → Tailwind utilities)
| Token | Value | Use | Contrast |
|---|---|---|---|
| `bg` | `#121110` | page | — |
| `surface` | `#1C1B19` | sections, Last added, the tab | — |
| `surface-2` | `#262421` | chips, secondary buttons, Getting home | ink 12.9:1, ink-2 7.9:1 |
| `surface-3` | `#34312C` | buttons inside a surface (Undo, Remove), pressed chips | ink 10.8:1 |
| `line` | `#6E6A64` | text-field borders, pressed state of surface-3 | 3.6:1 on bg |
| `ink` | `#EDEAE4` | primary text, estimate | 15.6:1 on bg |
| `ink-2` | `#BDB8B0` | secondary text | 9.6:1 on bg |
| `amber` | `#F2B84B` | primary action fill (text `bg` on it, 10.5:1) | 10.3:1 on bg |
| `amber-press` | `#D99E32` | amber pressed/hover (text `bg`, 8.0:1) | — |
| `amber-soft` | `#7D6230` | the "still absorbing" layer in the glass (shape only, never text) | — |
| `alert` | `#FF9A8A` | "Not safe to drive" on dark only | 9.2:1 on bg |
| `paper` | `#F3EEE4` | the docket, the "range" section | — |
| `paper-2` | `#E4DDCF` | tone step on paper (totals row) | — |
| `paper-ink` | `#1A1816` | text on paper | 15.3:1 |
| `paper-ink-2` | `#4F4A43` | secondary text on paper | 7.6:1 |
| `stamp` | `#861C0F` | "Not safe to drive" stamp on paper, 3px border | ≥ 7:1 on paper |

No green, no red/green status, no colour-only meaning. Status is word + icon + colour (warning triangle at a 2.5px stroke).

Surfaces are separated by a step in tone, never by a hairline or a shadow. Selected chips use `surface-3` + a 3px amber ring.

## Type (Geist, one family)
- Night estimate: "about" 24px / 600 above the point number `clamp(64px, 21vw, 96px)` / 700, tracking −0.04em, tabular.
- "+ Add another": 26px / 700; drink name · std 18px / 600.
- Section headings on the night screen: 22px / 700. Body and list rows: 18px / 500–600. Never below 16px on the logging screen.
- Landing hero: `clamp(56px, 11vw, 104px)` (7vw from `lg`), leading 0.9, tracking −0.045em, **two lines at every width** ("Your night, / on one tab."). Section headings `clamp(40px, 6vw, 88px)`. Body 20px, ≤ 52ch.
- No eyebrows, no tracked uppercase labels, no monospace.

## Targets and layout (night screen)
- App shell: `fixed inset-0` column. Top bar (BACulator · Get home · Profile), scrolling middle, fixed dock. No rubber-band overscroll, no tap flash, no text selection on controls.
- Scroll order: Not safe to drive banner (whenever > 0) → glass gauge → back-to-zero line → Tonight's curve → Your tab → Getting home. "Get home" in the top bar scrolls to the card.
- Dock, top to bottom: status line ("Added Vodka soda [Undo]", "Removed … [Add back]", or "Last: … · 6 min ago"), primary **+ Add another** (96px, full width, drink icon, name · std; "+ Add" when nothing is logged tonight), then 3 × 84px buttons: two recents (icon, name, std) and **+ New drink**.
- Undo and Add back mirror each other, so a wrong tap on either is reversible.
- Every target ≥ 48px, primary row gaps ≥ 12px. Remove lives only in tab rows.
- Max-width 480px, 16px gutter, safe-area padding.

## The glass (FluidGauge)
- Pint silhouette (112 × 208), outline `ink-2` 3px. Full at 0.20 and no markings: the level shows more or less, never a limit.
- Solid `amber` = estimate now. `amber-soft` above it = alcohol from drinks still being absorbed (the projected peak). Adding a drink raises the soft layer at once, so the tap always visibly lands, with "↑ Heading to about 0.13 by 10:00 pm" in amber text.
- Number: "about" + point (2 decimals, `clamp(64px,21vw,96px)`), "Likely 0.07 to 0.12" below. A screen-reader live line carries the final values; the animated text is hidden from it.

## Tonight's curve (TimelineCard)
- Inline on the main screen. Past solid amber area, future dashed and paler, a white "now" line with its label under the chart. No horizontal grid or reference lines. Draws in over 900ms. "Bigger" opens the full chart with times and values.

## Motion
- **Night screen:** only in answer to a change. Glass pour 900ms ease-out (quartic) with a slosh that decays to still within 2000ms of wall-clock time; number counts in step; "Added …" slides up 260ms; sheets rise 340ms; buttons squeeze to 0.97 in 120ms. Haptic tick (12ms) on add where supported. Optimistic adds: the glass fills on tap, before the server answers.
- **Landing:** docket prints in (900ms), lines print (420ms), numbers roll (380ms), stamp lands with overshoot (420ms), Start over tears the docket (520ms), hero rises with 90ms stagger, sections rise on scroll (CSS scroll-driven, progressive).
- Everything is off under `prefers-reduced-motion` (JS checks `useReducedMotion`; CSS sits in `no-preference` blocks).
- Swift port: pour = `.easeOut(duration: 0.9)`; slosh = damped sine, τ ≈ 0.45 s, stop at 2 s; stamp ≈ `.spring(response: 0.42, dampingFraction: 0.72)`; sheets = system sheet.

## Components
- **NightView** (presentational, shared by the real screen and `/dev/night`), **NightScreen** (data, optimistic adds, undo/add back).
- **FluidGauge**, **TimelineCard**, **AddDock**, **DrinkIcon** (beer, wine, shot, can, cocktail, drink; guessed from name, then size and strength).
- **TonightList → "Your tab"**, **GetHome** (Text a mate, Call {region number}, poisoning signs), **AddSheet** (rises as a sheet).
- **Landing / LiveDocket**: paper docket, region serve chips, real engine, demo person stated on it.

## Region (`src/lib/region.ts`, `useRegion`)
Storage and the BAC engine always use 10 g standards. Region only changes display and entry: 10 g / kg / ml / 000, or US 14 g / lb / oz / 911. Serve chips per region. Chosen per device (localStorage), guessed from the browser language, editable in Your details and on the landing page. Copy never names a country other than "US".

## Dev preview
`/dev/night` renders the night screen with sample drinks and no sign-in (404 in production). Use it for phone-size checks.
