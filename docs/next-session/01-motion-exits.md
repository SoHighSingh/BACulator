# 01 · Exit motion: everything opens well and closes dead

User, 22 Oct 2026: "I dont like how theres so many dialogues that open really nicely, and then they close statically - not good."

Audit of every surface that opens and closes, filmed in real Chrome (375×812, dark). Read-only; no source changed.

## What is going on

- DESIGN.md's Motion section specifies open motion only (sheet 340ms rise, composer 280ms rise, status 260ms slide). There is **no exit rule**, and `src/styles/globals.css` has no exit keyframes at all: `sheet-up`, `rise-in`, `snack-in`, `num-in`, `curve-reveal`, `hazard-in` are all one-way.
- Every Glass surface is either a Radix `Dialog` whose `Content`/`Overlay` have no `data-[state=closed]` animation (so Radix's Presence unmounts on the next frame) or a `{open && <div className="compose-in">}` that React unmounts on the same tick.
- The two legacy shadcn dialogs (`ui/dialog.tsx`, via `tw-animate-css`) **do** animate out, but in a different language (200ms zoom 95% + fade from the centre, default easing), so the app has three exit behaviours: instant, zoom-fade, and nothing-moves-at-all (FAQ).
- The sheet scrim (`Dialog.Overlay`, `bg-black/55`) has no animation either way: it snaps on **open** too, under a rising sheet.

## Inventory

| Surface | File | Open today | Close today | Fix |
|---|---|---|---|---|
| Add a drink sheet | `src/components/night/AddSheet.tsx` → `Sheet.tsx` | `.sheet` → `sheet-up` 340ms `--ease-out` (translateY 24% → 0, opacity 0.6 → 1). Scrim snaps. | **Instant unmount.** `Dialog.Content` has no `data-[state=closed]` style; `[role=dialog]` is out of the DOM at t=0 (`log.txt`). Also closes instantly on Add, with the dock growing by a row with no transition. | A1 + A2 |
| About tonight's estimate | `EstimateDetails.tsx` → `Sheet.tsx` | same | same, instant | A1 |
| Edit drink sheet | `EditDrinkSheet.tsx` → `Sheet.tsx` | same, plus the Earlier panel `rise-in` inside | instant. Note `open={!!drink}` and `{drink && …}`: once an exit exists the body would blank mid-slide | A1 + A3 |
| You sheet | `src/components/UserInfoSlideOut.tsx` → `Sheet.tsx` | same | instant | A1 |
| Tonight's curve (graph modal) | `src/components/BACGraphModal.tsx` → `ui/dialog.tsx` | tw-animate `fade-in-0 zoom-in-95`, 200ms, centre origin; a second `curve-reveal` 900ms draws the chart | tw-animate `fade-out-0 zoom-out-95` 200ms. **Content swaps mid-exit**: `simulation = open && …` goes null, so the fading modal shows "Add your weight and a drink to see the curve." (`graph-modal-close-80.png`) | B1 + B2 |
| Terms / Before you start | `src/components/TermsAndDisclaimerDialog.tsx` → `ui/dialog.tsx` | tw-animate zoom-fade 200ms | tw-animate zoom-fade 200ms; the only surface whose exit is fine, but it is a different family from the sheets | B1 |
| Composer (type or say) | `src/components/night/AddDock.tsx` ~L252 | `.compose-in` → `rise-in` 280ms (opacity 0, 10px) | **Instant**: `{open && …}` unmounts; the rest keys and Add key reappear with no motion; dock height snaps | C1 |
| Status / notice line ("Added: …  Undo") | `AddDock.tsx` ~L195 | `.snack` → `snack-in` 260ms (10px slide, opacity 0.4 → 1) | Leaves by flipping to `sr-only` when `UNDO_WINDOW_MS` lapses or the composer opens: instant, and the dock shrinks 48px with no transition | C2 |
| Likely-range line (tap the bar) | `src/components/night/Estimate.tsx` ~L128 | `.compose-in` 280ms | instant swap back to the heading line | C1 |
| Earlier… time panel | `src/components/night/TimeControl.tsx` ~L95 | `.compose-in` 280ms | instant; the sheet body jumps ~180px up (`earlier-panel-close-0.png`). The Now chip's label vanishes for a frame: `.press` transitions `background-color` 160ms but `color` snaps | C1 + D2 |
| Add sheet step: list ↔ Size and time | `AddSheet.tsx` (`serve && size ? … : …`) | nothing (instant swap, title included) | nothing | C3 (optional) |
| Tonight list row (Remove / Undo) | `src/components/night/TonightList.tsx` | row appears with no motion | row vanishes, list reflows instantly | C3 (optional) |
| Hazard key | `src/components/night/NightStatus.tsx`, `hazard-in` | 300ms scale 0.6 → 1 from the left edge | "simply gone" (documented) | D3 (optional, 1-line) |
| Landing FAQ tiles | `src/components/landing/Landing.tsx` ~L353, `landing.css` `.faq-tile` | `<details>`: none (only the + rotates 45° via `transition-transform`) | none | E1 |
| Onboarding | `src/components/Onboarding.tsx` | full page, no dialog | n/a (route change) | — |

Surfaces that do not open/close and are fine: the number blur-in, band ease, curve reveal, red bloom, mic ring, landing scroll reveals.

## Evidence

`C:\Users\agams\BACulator\.shots\exits\` — `film.mjs` (opens each surface, waits for the open animation, triggers close, pauses only the animations still running and seeks them to 0/80/160/240ms; `log.txt` lists what was running and whether the element was still in the DOM).

- `add-sheet-open.png` vs `add-sheet-close-0.png`: sheet fully up, then gone at frame 0. Log at close: only the two `momentum-breathe` loops running; `probe still in DOM: false`.
- `estimate-details-*`, `edit-sheet-*`, `you-sheet-*`: identical pattern.
- `graph-modal-close-80.png`: the one real exit (tw-animate), with the "Add your weight…" fallback visible inside the fading dialog.
- `composer-open.png` / `composer-close-0.png`: composer gone, Add key back, nothing in flight.
- `earlier-panel-open.png` / `earlier-panel-close-0.png`: panel gone, 180px jump, Now chip with an invisible label.
- `add-then-status-close-0.png`: sheet gone at t=0; "Added: Schooner of beer · Undo" has slid in, dock 48px taller with no transition.
- `faq-tile-*`, `terms-dialog-*`: FAQ has no motion either way; Terms zoom-fades in 200ms.

Re-run: `node .shots/exits/film.mjs .shots/exits [names…]` with the dev server on :3000.

## Proposed exit system (one rule, fits DESIGN.md Motion)

**Rule:** every surface leaves the way it came, in about 70% of its open time, same `--ease-out` family, transform + opacity only, nothing under `prefers-reduced-motion`. Scrims fade on the same clock as the thing they sit under.

| Surface kind | Open | Exit |
|---|---|---|
| Bottom sheet (`.sheet`) | 340ms `sheet-up` | 240ms `sheet-down`: translateY 0 → 24%, opacity 1 → 0.6; scrim 240ms fade |
| Scrim (`Dialog.Overlay`) | add 340ms fade 0 → 1 (missing today) | 240ms fade 1 → 0 |
| Composer, Earlier panel, range line (`.compose-in`) | 280ms `rise-in` | 200ms `rise-out`: opacity 1 → 0, translateY 0 → 10px |
| Status line (`.snack`) | 260ms `snack-in` | 180ms `snack-out` (reverse), and the dock's height eases |
| Centre dialogs (graph, terms) | retire tw-animate; use `Sheet` or the same keyframes at scale 0.96 | 200ms fade + scale back to 0.96 |
| FAQ tile | content rises 260ms | 180ms reverse; height eases |

Add to DESIGN.md Motion: "Exits: the reverse of the entrance at ~70% of its time, same easing; scrims fade with their sheet; off under reduced motion."

### Technique 1 — Radix dialogs (sheets, graph, terms)

Radix `Dialog.Content` and `Dialog.Overlay` set `data-state="closed"` and keep the node mounted until the `animationend` of any animation whose name changed on that state (its `Presence` component). So this is CSS only, in `src/styles/globals.css` inside the existing `prefers-reduced-motion: no-preference` block:

```css
.sheet[data-state="closed"] { animation: sheet-down 240ms var(--ease-out) both; }
.sheet-scrim[data-state="open"]   { animation: scrim-in 340ms var(--ease-out) both; }
.sheet-scrim[data-state="closed"] { animation: scrim-out 240ms var(--ease-out) both; }
@keyframes sheet-down { to { transform: translateY(24%); opacity: 0.6; } }
@keyframes scrim-in  { from { opacity: 0; } }
@keyframes scrim-out { to   { opacity: 0; } }
```

`Sheet.tsx`: add `sheet-scrim` to the `Dialog.Overlay` class. Under reduced motion the global `animation-duration: 0.01ms` rule still fires `animationend`, so Radix unmounts at once; outside that media block no animation is declared and Radix unmounts immediately anyway. No `forceMount` needed.

Prerequisites so the body does not blank mid-slide:
- `EditDrinkSheet.tsx`: keep the last drink in a ref (`const shown = drink ?? lastDrink.current`) and render from it; `open={!!drink}` stays.
- `BACGraphModal.tsx`: compute `simulation` from `userWeight && userSex` without `open &&` (or memo the last result) so the exit shows the chart it had.
- `AddSheet.tsx`: `onClose` after Add should not reset `picked` synchronously; reset it in `onAnimationEnd` or when `open` flips true again (it already resets in a `useEffect` on open; keep that, drop any reset on close).

Centre dialogs: either (a) move `BACGraphModal` and `TermsAndDisclaimerDialog` onto `Sheet` (one family, and the graph wants the width anyway), or (b) replace the tw-animate classes on `ui/dialog.tsx` with `.dialog-card[data-state=…]` keyframes: 280ms in (opacity 0 → 1, scale 0.96 → 1), 200ms out, `--ease-out`. Then drop `tw-animate-css` from `globals.css` and `package.json`.

### Technique 2 — conditionally rendered elements (composer, Earlier, range line, status line, FAQ)

These are `{open && <div className="compose-in">}`; React removes the node before any CSS can run. Keep them mounted until the exit finishes with a small hook, e.g. `src/lib/use-presence.ts`:

```ts
export function usePresence(open: boolean, ms = 200) {
  const [mounted, setMounted] = useState(open);
  const reduced = useReducedMotion(); // matchMedia('(prefers-reduced-motion: reduce)')
  useEffect(() => {
    if (open) { setMounted(true); return; }
    if (reduced) { setMounted(false); return; }
    const id = setTimeout(() => setMounted(false), ms);
    return () => clearTimeout(id);
  }, [open, ms, reduced]);
  return { mounted, state: open ? "open" : "closed" } as const;
}
```

Render `{mounted && <div data-state={state} className="compose-in">}` and add in CSS:

```css
.compose-in[data-state="closed"] { animation: rise-out 200ms var(--ease-out) both; pointer-events: none; }
@keyframes rise-out { to { opacity: 0; transform: translateY(10px); } }
```

(An `onAnimationEnd` unmount is equivalent; the timeout is simpler and survives a missed event. Keep `aria-hidden` / `inert` on the closed node so focus and screen readers leave with it.)

Where to apply:
- `AddDock.tsx` composer: `usePresence(open, 200)`; the rest keys (`!open && …`) can use the same hook inverted so they rise in as the composer leaves, or simply render once the composer is gone.
- `TimeControl.tsx` Earlier panel and `Estimate.tsx` range line: same.
- Status line (`AddDock.tsx`): derive `live` as today, then `usePresence(!!live, 180)` with `snack-out`; the `sr-only` swap happens after.
- Landing FAQ: `<details>` gives no close hook. Chrome 131+ handles it in CSS alone (`.faq-tile::details-content { transition: height 240ms var(--ease-out), content-visibility 240ms allow-discrete; height: 0; overflow: clip } .faq-tile[open]::details-content { height: auto }` with `interpolate-size: allow-keywords` on `:root`); other browsers get the instant toggle, which is acceptable on the landing. Keep the + rotation.

### Height changes (the "static" half nobody names)

Even with fades, the dock, sheet body and FAQ tile change height in one frame. Two options, both DESIGN-compatible:
- `interpolate-size: allow-keywords` on `:root` plus `transition: height 240ms var(--ease-out)` on the container (Chrome/Edge; others snap, no harm).
- Or the `grid-template-rows: 0fr → 1fr` wrapper for the composer, Earlier panel and status line (works everywhere; 240ms, same easing).

## Prioritised fix list

1. **A1 — Sheet exit + scrim fade** (`globals.css`, `Sheet.tsx`): CSS only, fixes five surfaces at once (Add, About, Edit, You, and Add-then-close). Do first; it is the complaint.
2. **A3 / B2 — mid-exit content swaps**: `EditDrinkSheet` last-drink ref; `BACGraphModal` simulation not gated on `open`. Required by A1 or the sheet slides down empty.
3. **C1 — `usePresence` + `rise-out`** for composer, Earlier panel, range line (`AddDock.tsx`, `TimeControl.tsx`, `Estimate.tsx`).
4. **C2 — status line out + dock height ease** (`AddDock.tsx`): `snack-out` 180ms; dock container height transition so Add-then-close no longer jumps 48px.
5. **B1 — one dialog family**: graph and terms onto `Sheet` (preferred) or shared keyframes on `ui/dialog.tsx`; remove `tw-animate-css`.
6. **A2 — Add-then-close choreography**: when a drink is added from the sheet, let the sheet leave (240ms) and the status line land at ~120ms so the eye follows the drink down into the dock.
7. **D2 — `.press` colour snap**: add `color 160ms linear` to `.press` so a chip's label never disappears while its background fades (seen on the Now chip).
8. **E1 — FAQ `::details-content` height transition** (landing only, progressive).
9. **C3 / D3 — optional**: Tonight list rows collapse out (height + opacity, 200ms) when removed; Add-sheet step swap (list ↔ size) as a 200ms cross-fade; hazard key 200ms scale-down on clear (DESIGN.md says "simply gone", so this is a decision, not a bug).

## Other motion notes

- **Scrim snaps on open**, not just close: `Dialog.Overlay` in `Sheet.tsx` has no animation at all; the sheet rises over a scrim that is already fully dark. Covered by A1.
- **Double animation when the graph opens**: the modal zoom-fade (200ms) and its own `curve-reveal` (900ms) start together with different easings; after B1, start the reveal ~120ms in.
- **Open-time layout shifts**: the composer and Earlier panel both change container height in one frame while their content fades in; the fade reads as a snap-then-fade. The height ease above fixes both directions.
- **Focus return**: Radix returns focus to the trigger on close; the composer's close button does not (field blur leaves focus on `body`). Low priority, but worth moving focus back to the "Type or say a drink" key when C1 lands.
- **`.press` on `Dialog.Close` inside a leaving sheet**: with the exit animation, a tap on Close will show its 160ms scale while the sheet slides; fine, but set `pointer-events: none` on `[data-state=closed]` so a second tap cannot re-trigger.
- Not a bug but worth knowing: finished `both`-filled animations (`curve-reveal`, `snack-in`) stay in `document.getAnimations()`; any future seek-based film script must filter `playState === "running"` or it rewinds the chart (the first run of this audit did exactly that).
