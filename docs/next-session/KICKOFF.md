# Kickoff prompt for the next session

Paste this:

> Continue BACulator in C:\Users\agams\BACulator on branch `cloudflare-d1-migration`. Read the top of HANDOFF.md ("Next session (from 22 Oct 2026)" and "22 Oct 2026: deployed"), then `docs/next-session/00-user-list.md`, my list word for word. Read reports 01–05 in that folder only for the items you're working on. PRODUCT.md and DESIGN.md hold the standing rules and decisions.
>
> **Before building, ask me the four open decisions** listed in HANDOFF, using one AskUserQuestion with options.
>
> **Then work in this order:**
> 1. **P0 fixes.**
>    - The landing maths card still has a "drive → not safe" row and raw 4-decimal BAC (`CodePanel.tsx:47–52`). It's live, so fix and deploy it first.
>    - The edit bug: an edit is remove + add, and remove can skip the delete for an add that already reached the server. Add a real `update` outbox op, Undo that restores the old values, and keep a drink's exact time unless it's changed. Write a failing regression test first.
>    - The double rounding: a row shows 1.6 std but adds 1.7.
> 2. **P1: the new Add a drink (free tier).**
>    - Two steps. How much: a smooth eased standards slider plus a typeable number. When: a smooth eased "how long ago" slider. Then Confirm.
>    - Edit reuses the same two controls.
>    - Sliders are continuous, snap only on release, run full width, and have keyboard steps.
>    - Specs are in report 02.
> 3. **P2: exit motion.** Every sheet, dialog and panel closes the way it opened, with a scrim fade, and is off under reduced motion. See report 01.
> 4. **P3: declutter.**
>    - Cut "Estimate only. Bodies and pours vary." and Counted.
>    - Numbers becomes Back to zero plus Below/Back to 0.05.
>    - Redesign Your tab and the details sheet.
>    - Add the small live third digit.
>    - Hide the scrollbar.
>    - Specs and mocks are in report 03.
> 5. **P4: voice as a secondary path** that pre-fills the two sliders, plus the parser keeping mixers ("Vodka & Red Bull"). See report 04.
> 6. **P5: the rest of the friction walk,** in its ranked order. See report 05.
>
> **How to work:**
> - Run independent pieces in parallel subagents, each in its own worktree or with strictly disjoint files, and give each a complete brief.
> - After every merge, grep for conflict markers and typecheck before committing.
> - Verify everything yourself in real Chrome (`npm run shoot`, `node scripts/rubric.mjs`, `node scripts/contact-sheet.mjs`) at 375×812, 320×568 and 1440×900. Show me contact sheets for anything visual before calling it done.
> - Keep lint, typecheck and tests green.
> - Deploy only when I say: Node 24 on PATH, a throwaway worktree, `npm run build:worker`, then `npx opennextjs-cloudflare deploy`. HANDOFF has the steps.
> - Commit locally and don't push without asking.
> - Use the designing-for-impaired-users skill and impeccable on every UI round.
