# 09 - Accessibility code audit (night, landing, sheets)

Scope: src/components/night/**, src/components/landing/**, Sheet and Dialog, globals.css. Read-only audit from code (about 20 calls); not run against a screen reader or device. Line numbers are as of commit ebaf2e6 and some are approximate (marked ~).

## What is already good (keep)
- Pinch zoom is enabled (src/app/layout.tsx:37-42, no maximum-scale).
- Global reduced-motion kill-switch (globals.css:149-157); entrance animations are also gated behind `no-preference` (globals.css:219, 264, 415; landing.css:199). The video does not autoplay under reduce (AddFlowVideo.tsx:18-19).
- `prefers-reduced-transparency` and `prefers-contrast: more` solidify `.glass` (globals.css:320-335).
- Radix Dialog gives focus trap, inert background, Escape and focus restore. Every Sheet has a Title and a Description (Sheet.tsx:33-42). The close button is 48px and labelled (Sheet.tsx:34).
- Status is not colour-only: "Not safe to drive" is words plus icon (NightStatus.tsx:35-41).
- Targets are almost all 48px or more; primary is 72px. Body text is 18px or larger.
- The chart slider has role, valuetext and arrow/Shift/Home/End/Esc keys (InstrumentChart.tsx:106-129, 140-147), plus an sr-only description of the curve (TimelineCard.tsx:73-78).
- One persistent live region for add/remove, with Undo (AddDock.tsx:194).

## Findings, ranked

### High
1. **Focus is dropped when the dock switches between idle and composer.** When `open`, the "Add a different drink" and mic buttons unmount (AddDock.tsx:~236-253). Typing mode has `autoFocus` (AddDock.tsx:396), but listening mode intentionally has no focus target (comment at 394-395). `close()` (~88-96) blurs the input and unmounts the form, so keyboard, switch and VoiceOver focus fall to body and restart from the top. Fix: on close, focus the primary pill; in listening mode, focus the Stop button.
2. **Add-sheet step change does not move focus or announce.** AddSheet.tsx:~96-185: choosing a serve swaps the whole body to the size picker (Back at line 100). The pressed control is unmounted, focus is lost inside the dialog, and nothing announces the new step. Fix: focus the step heading (tabIndex -1) or Back on swap, and return focus to the picked serve row on Back.
3. **Calm transition is never announced, and one tap triggers several announcements.** NightStatus.tsx:39 `role="status"` announces "Not safe to drive" when it appears, but when it clears the text simply goes null (400ms later, line 24), so a screen-reader user is never told. The same tap also fires the sr-only estimate region (Estimate.tsx:140-143) and the dock region (AddDock.tsx:194): three polite announcements. Fix: one announcer per action, e.g. "Added 1 beer. About 0.045. Not safe to drive." Keep wording that never implies fitness to drive when clearing.
4. **Chart slider values are epoch milliseconds, and the reading is lost on release.**
   - `aria-valuemin/max/now` are ms timestamps (InstrumentChart.tsx:143-145) with no defined step; swipe-adjust on VoiceOver/TalkBack will jump unpredictably. valuetext is good, but expose minutes-from-start as the numeric value.
   - `onPointerUp` and `onBlur` reset to now (lines 155, 158), so lifting the finger discards the reading just made. This conflicts with "confirmation persists; it does not flash". Hold the last read for a few seconds, or until Esc for keyboard users.
   - No hint that arrows work. Add aria-roledescription and an aria-describedby hint.
5. **Label-in-name failures (WCAG 2.5.3), which break voice control.** TimelineCard.tsx:64 `aria-label="Tonight: open a bigger graph"` omits the visible time/value text. Estimate.tsx:~64 `aria-label="About this estimate: ..."` replaces the visible number. The range toggle (Estimate.tsx:~75) labels itself "Show/Hide the likely range", but its visible text is the heading or "tap to hide". Fix: begin each aria-label with the visible text or drop the override.

### Medium
6. **Voice and parsed results have no non-visual confirmation.** In AddDock the parsed card ("Check it, then add", ~257-315) appears without announcing what was understood, so a misheard drink can be added without the user hearing it. Announce the parsed summary politely and make the add button specific (e.g. "Add 2 beers, 2.0 standard drinks").
7. **The primary pill does not say it adds now.** AddDock.tsx:215-221 builds its name from the drink label only. Use "Add another beer, just now" for non-visual clarity (visible text can stay).
8. **Mic hidden below 360 CSS px** (AddDock.tsx:249). At 200-300% browser zoom the CSS width drops under 360, so the mic vanishes for exactly the low-vision users who zoom. The composer still has one, so impact is limited; prefer truncating the label to hiding the key.
9. **Forced-colors / Windows high contrast has no support.** There is no `forced-colors` rule in globals.css. Many boundaries and focus affordances are `box-shadow` (composer focus ring at AddDock.tsx:382 and globals.css:564 where the input outline is removed; outline buttons at AddDock.tsx:238, 249, 363; TonightList.tsx:60). Shadows are dropped in forced-colors, leaving the composer with no focus indicator. Add real borders/outlines under `@media (forced-colors: active)`.
10. **Keyboard inset mis-measures when pinch-zoomed.** Sheet.tsx:51-65 computes `innerHeight - vv.height - vv.offsetTop`. With pinch zoom active (which the app allows) the visual viewport is smaller without a keyboard, so bottom padding balloons. Guard with `vv.scale === 1`.
11. **Landing announces demo changes from several regions.** Landing.tsx:161 (`aria-live` on the chip result row) and Landing.tsx:235 (sr-only live in hero) both fire for one chip tap, plus LiveStrip text. Reduce to one.
12. **Video has no text alternative for the sequence.** AddFlowVideo.tsx:59 gives one sentence as aria-label and no track. It is muted so audio needs are nil, but link a short step list via aria-describedby. Pause is available after autoplay (figcaption button), which satisfies 2.2.2.

### Low
13. **Landmarks.** Headings are well formed (sr-only h1 at NightStatus.tsx:30, h2 sections via aria-labelledby). No skip link; short page, low impact. `<main>` presence was not checked in these files.
14. **shadcn Dialog close is small** (ui/dialog.tsx:136-142: about 16px icon, `opacity-70`, no padding). If any night-path dialog uses `~/components/ui/dialog`, it breaks the 48px rule and lowers contrast. Confirm usage; otherwise delete the unused component or restyle it like Sheet.tsx:34.
15. **Disabled steppers** use `opacity-40` (AddSheet.tsx:154, 166), below 3:1 by design, with no explanation of why the minus is disabled at one drink. Optional helper text.
16. **Listening state cue.** The global reduced-motion rule stops the `mic-live` pulse; the state is still conveyed by the Square icon, aria-pressed and the "Listening..." text (AddDock.tsx:408-413), so this is acceptable.
17. **Pointer scroll vs scrub.** InstrumentChart.tsx:148-155: `touch-pan-y` is right, but pointerdown picks immediately, so a vertical scroll that starts on the chart briefly shows a scrub value before pointercancel resets it. Add a small horizontal-intent threshold.
18. **Landing details chevron** (Landing.tsx:343) has `transition-transform` without a `motion-reduce` variant; the global rule covers it.

## Cross-cutting recommendations
- Add a single `useAnnounce()` polite region at the app shell and remove the 4-5 local `aria-live` regions so each action yields one sentence.
- Add a `forced-colors` block for shadow-drawn borders and focus rings.
- Make every `aria-label` start with the visible text.
- Manual test list: VoiceOver and TalkBack through add, undo, edit; 200% OS text; 300% browser zoom at 320px; Windows high contrast; keyboard-only through the add sheet, composer and chart.
