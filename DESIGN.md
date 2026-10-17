# BACulator — design system: "Last orders"

Mode for the app screen: **Operate**. The interface is a well-lit bar menu read at arm's length: warm near-black, off-white type, one amber action colour, nothing moving. Expression lives in precision and in the copy, not in effects. Public guide pages (later) are **Read** mode in the same palette.

The previous look (animated WebGL veil, glass blur, wave gauge, pulsing buttons, gradient text) is retired. It reduced legibility exactly when users need it most.

## Tokens (`src/styles/globals.css`, `@theme` → Tailwind utilities)
| Token | Value | Use | Contrast on bg |
|---|---|---|---|
| `bg` | `#121110` | page | — |
| `surface` | `#1C1B19` | cards, sheets | — |
| `surface-2` | `#262421` | chips, secondary buttons | — |
| `line` | `#6E6A64` | borders/dividers on controls | 3.6:1 |
| `ink` | `#EDEAE4` | primary text, estimate | 15.6:1 |
| `ink-2` | `#BDB8B0` | secondary text | 9.6:1 |
| `amber` | `#F2B84B` | primary action fill (text `#121110` on it, 10.5:1) | 10.3:1 |
| `alert` | `#FF9A8A` | "Not safe to drive" text only | 8.6:1 |

No green, no red/green status, no colour-only meaning. Status is word + icon + colour.

## Type (Geist)
- Estimate: 56px / weight 700, tabular numbers.
- Section and primary button labels: 20px / 600.
- Body and list rows: 18px / 500. Never below 16px anywhere on the logging screen.
- Line length ≤ 60ch on guide pages.

## Targets and layout
- Primary action ("Same again" or "Add a drink"): full width, 72px tall, amber.
- Every other target on the logging screen: ≥ 56px tall (48px absolute floor), ≥ 12px apart.
- Destructive actions (Remove, Sign out, Delete account) never sit next to a routine target and never on the logging path; Remove lives in the Tonight list rows, right-aligned, ≥ 24px from anything else.
- Single column, max-width 480px, 16px side gutter, bottom actions inside the thumb zone with safe-area padding.

## Motion
None on the logging path. State changes are instant (≤100ms). `prefers-reduced-motion` honoured everywhere else.

## Components
- **EstimatePanel**: band ("about 0.05–0.08"), "estimated blood alcohol", status (Rising/Falling), back-to-zero range, Not safe to drive line, link to timeline.
- **LastLogged**: persistent "Schooner of lager · 1.6 std · 6 min ago" + full-width Undo (2 min).
- **SameAgain** hero + **RecentChips** (≤4, 2×2 grid, 64px).
- **AddSheet** (drawer): bartender text field, quick-pick serve chips, ± stepper (56px), time chips (Now / 15 / 30 / 60 min ago), Add (72px).
- **TonightList**: rows with drink, standards, clock time, Remove.
- **GetHome** strip: Call 000, Text a mate.
