# BACulator — design system: "The tab"

The app keeps your bar tab. Every surface is built from that one idea: drinks print onto a tab, and where a bar puts the price, BACulator puts the standard drinks, an estimate band and a back-to-zero window, with a rubber-stamped **Not safe to drive** whenever it's above zero.

Two modes share one palette:

- **Night screen (Operate):** warm near-black, off-white type, one amber action colour. The estimate is the largest thing on screen; "Same again" is a big amber slab in the thumb zone. Nothing moves on its own. The only motion is press feedback that answers the thumb within 120 ms.
- **Landing page (Persuade):** the same world, louder. A live paper docket is the hero; whole fields of colour (paper, surface, amber) change section by section; motion is allowed with transform and opacity only, and switched off for `prefers-reduced-motion`.

Retired and not coming back: animated WebGL veil, glass blur, wave gauge, pulsing buttons, gradient text, hairline borders as separators.

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
| `alert` | `#FF9A8A` | "Not safe to drive" on dark only | 9.2:1 on bg |
| `paper` | `#F3EEE4` | the docket, the "range" section | — |
| `paper-2` | `#E4DDCF` | tone step on paper (totals row) | — |
| `paper-ink` | `#1A1816` | text on paper | 15.3:1 |
| `paper-ink-2` | `#4F4A43` | secondary text on paper | 7.6:1 |
| `stamp` | `#861C0F` | "Not safe to drive" stamp on paper, 3px border | ≥ 7:1 on paper |

No green, no red/green status, no colour-only meaning. Status is word + icon + colour (warning triangle at a 2.5px stroke).

Surfaces are separated by a step in tone, never by a hairline or a shadow. Selected chips use `surface-3` + a 3px amber ring.

## Type (Geist, one family)
- Night estimate band: `clamp(56px, 17vw, 76px)` / 700, tracking −0.03em, tabular.
- "Same again": 26px / 700; its std number 40px / 700 tabular.
- Section headings on the night screen: 22px / 700. Body and list rows: 18px / 500–600. Never below 16px on the logging screen.
- Landing hero: `clamp(56px, 11vw, 104px)` (7vw from `lg`), leading 0.9, tracking −0.045em, **two lines at every width** ("Your night, / on one tab."). Section headings `clamp(40px, 6vw, 88px)`. Body 20px, ≤ 52ch.
- No eyebrows, no tracked uppercase labels, no monospace.

## Targets and layout (night screen)
- "Same again" (or "Add a drink" when nothing is logged): full width, ≥ 120px tall, `rounded-3xl`, amber.
- Recents: 2×2 grid, ≥ 72px. "+ Add a different drink" fills the last cell (or spans the row).
- Every other target ≥ 56px (48px floor), ≥ 12px apart.
- Order, top to bottom: estimate (fixed min-height 248px so the buttons never move) → Same again → recents → Last added + Undo → Your tab → Getting home. Last added sits **below** the add buttons so appearing never pushes them.
- Destructive actions (Remove, Sign out, Delete account) never sit next to a routine target; Remove lives in tab rows.
- Single column, max-width 480px, 16px gutter, safe-area padding.

## Motion
- **Night screen:** none on its own. `.press` scales to 0.97 in 120ms on `:active`; colour steps to the `-press`/`surface-3` token. That's it.
- **Landing:** the docket prints in from above on load (900ms, `--ease-out` = `cubic-bezier(0.16,1,0.3,1)`); each added line prints top-down via `clip-path` (420ms); totals and band roll up on change (380ms); the stamp lands with a slight overshoot (`--ease-spring`, 420ms) and rests at −2°; "Start over" tears the docket off (520ms) before a fresh one prints. Hero lines rise in with 90ms stagger. Sections rise on scroll via CSS scroll-driven animation (progressive; content is visible without it). FAQ `+` rotates to ×.
- All of it sits inside `@media (prefers-reduced-motion: no-preference)`; the global reduced-motion rule also zeroes durations.
- For the Swift port: same durations and curves (`.spring(response: 0.42, dampingFraction: 0.72)` ≈ the stamp; `.easeOut` with the 0.16/1/0.3/1 control points ≈ everything else). On the night screen use only the system press highlight.

## Components
- **EstimatePanel** (no card): label, band, Rising/Falling + back-to-zero window, ⚠ Not safe to drive, "Estimate only. Bodies and pours vary.", See the timeline.
- **QuickAdd**: Same again slab (drink name + std) + recents + "Add a different drink".
- **LastAdded**: "Last added / name / std · time ago" with Undo (2 min) on the right.
- **TonightList → "Your tab"**: header with the 24-hour total where a tab puts the price; rows on alternating tone steps; Remove per row.
- **GetHome**: Text a mate, Call {region emergency number}, poisoning signs line.
- **AddSheet**: type-or-pick, region serve chips, ± stepper in the region's standard drinks, time chips, Add.
- **Landing / LiveDocket**: the paper docket with region serve chips, real engine, demo person stated on the docket (75 kg / 165 lb woman, one drink every 30 min).

## Region (`src/lib/region.ts`, `useRegion`)
Storage and the BAC engine always use 10 g standards. Region only changes display and entry: 10 g / kg / ml / 000, or US 14 g / lb / oz / 911. Serve chips per region. Chosen per device (localStorage), guessed from the browser language, editable in Your details and on the landing page. Copy never names a country other than "US".

## Dev preview
`/dev/night` renders the night screen with sample drinks and no sign-in (404 in production). Use it for phone-size checks.
