# The user's list for the next session (22 Oct 2026)

Verbatim, then decoded. The agents' reports (01–05) add detail and find more in the same spirit.

## Verbatim
1. "I dont like how theres so many dialogues that open really nicely, and then they close statically - not good."
2. "adding a drink is a nightmare right now. lets focus on the free tier right now: adding a drink asks u how many standards and how long ago did u drink it. Literally just 2 sliders with the ability to also text edit the standards. The current slider is so glitchy and not smooth at all, jumps all over the place."
3. "Get rid of the 'estimate only. Bodies and pours vary' - we've addressed this too many times."
4. "voice didnt work at all - worked once 'i said vodka red bull' and then it landed on vodka and thats it. quite poorly made."
5. "get rid of counted. they can literally scroll down to the tab and see that"
6. "make it a back to zero and back to 0.05 table row instead"
7. "can we add a decimal point? much smaller text on the bottom right of the number (in line) that updates so it feels more accurate."
8. "I added a drink THEN had to edit it to change the time which is so stupid. I wonder if its better for add drink to be a two parter - standards and then pick the time and then confirm."
9. Bug: "I added that drink, edited it to be 3.5 hours ago and then the previous drink changed to be finished JUST now, thats a bug. needs fixing."
10. "can we hide the scrollbar on this? i dont like that its there"
11. "tab needs a redesign"
12. "details needs a redesign - far too boring and yucky to look at and read, need to reduce clutter like crazy"
13. (done 22 Oct, commit 1585447, not deployed yet) "remove the em dash from the tab title, keep it BACulator always"

## Decoded into work
- **Exit motion everywhere** (1): every sheet, dialog, popover and composer closes with a reverse of its open motion, about 70% of the open duration, with the same easing; off under reduced motion. See 01.
- **Add a drink, free tier** (2, 8): a two-step sheet.
  - Step 1, how much: a smooth standard-drinks slider plus a typeable number.
  - Step 2, when: a smooth "how long ago" slider with a live read-out.
  - Then Confirm.
  - No add-then-edit. Edit reuses the same two controls.
  - Both sliders must be smooth: a continuous thumb with eased mapping and snapping only on release.
  - See 02.
- **Bug** (9): editing one drink's time moved another drink to "just now". Fix it with a regression test before anything else. See 02.
- **Voice** (4): make it reliable or demote it. Mixed drinks must keep their name ("vodka red bull"). See 04.
- **Cuts** (3, 5): remove "Estimate only. Bodies and pours vary." and the Counted row. The single disclaimer in the details sheet stays ("Estimate only. It can't tell you whether you're fit to drive.").
- **Numbers** (6): one row, "Back to zero …" and "Back to 0.05 …". See 03.
- **Extra decimal** (7): a small, live third digit at the number's bottom right.
  - This is the user's decision. The tension: DESIGN.md said precision must not come from fake decimals, and the headline is rounded UP.
  - Do it honestly: show the model's next digit small and tabular, keep the rounded-up headline digits, and leave the screen-reader text unchanged. See 03.
- **Scrollbar** (10): hide it on the night screen's scroller; keep scrolling and keyboard access.
- **Redesigns** (11, 12): Your tab and the details sheet, with far less clutter. See 03 for specs and mocks.
