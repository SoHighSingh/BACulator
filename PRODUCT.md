# BACulator — product context

## What it is
A free web app that estimates blood alcohol from the drinks you log during a night out. Mobile web (installable), hosted on Cloudflare Workers + D1. Name stays **BACulator** (confirmed); search-facing copy leads with the descriptor "Blood Alcohol & Standard Drinks Calculator". **Audience is global** (confirmed 17 Oct 2026): Australia first in data, but no "Australia" in product copy; a US version is wanted (14 g US standard drink, oz/lb, US serves, 0.08 limit context, 911).

## Primary user and scene
Someone of legal drinking age on a night out: phone in one hand, drink in the other, dark loud venue, BAC anywhere from 0 to ~0.15, possibly offline. Their job: **record the drink they just got, in two taps at most, and know it worked.** Secondary jobs: see an honest estimate, fix a wrong entry, and the next morning understand what they drank. (User decision, 18 Oct 2026 late: "an estimation calculator and nothing else"; getting home is not the app's job.)

Secondary users: a sober friend holding the phone (needs emergency info fast); a sober visitor from search comparing standard drinks or "how long until I'm sober" (needs a public calculator and plain explanations, no sign-in).

## What makes it different
- "Same again" in two taps with the real drink and size: one **Add a drink** key opens the list with recents first (user decision, 18 Oct 2026 late: one add key, not a one-tap repeat key plus a second key). Competitors need 3–4 taps or log a generic drink.
- Free "bartender" that reads Australian drink slang ("2 schooners of Great Northern") with a catalog first and Workers AI only as a fallback; code does the maths, never the model.
- A simulation-based estimate (absorption + zero-order elimination, never "banking" sober time), shown as a band, not a precise number.

## Non-negotiables (from the designing-for-impaired-users skill and harm-reduction stance)
- Never imply fitness to drive: no legal-limit lines, no green zones, no single "time until 0.05" clock, no "under the limit". (User decision, 22 Oct 2026: the Numbers card and the sheet show a **Below 0.05** row, framed only as when the red field ends, with the sheet's disclaimer kept. User decision, 23 Oct 2026: Back to zero and Below 0.05 show the model's own time, rounded up to five minutes, "about 9:45 am"; the 0.75–1.6× window ran to six hours and was useless, and the estimate is already labelled a prediction.) **The words "Not safe to drive" are no longer shown anywhere** (user decision, 18 Oct 2026 late: "we won't tie it to driving or anything"). Two thresholds, both at one constant `ALERT_AT = 0.05` for every region (stricter than the US 0.08) and both read off what is shown, not the raw model: **red** (the light field, the mark with its tick slid right, the tab icon) from a drawn number of 0.050 (three places, rounded up; 22 Oct 2026); the **hazard key** beside the mark once the top of the likely range ("Likely X to Y", Y) reaches 0.05. Neither is framed as a driving or legal state: the key is named "Estimate details", the one announcement is "Estimate details available", and the sheet it opens (**About tonight's estimate**, also opened by tapping the number) carries the likely range, Back to zero and Below 0.05, exactly one disclaimer line ("Estimate only. It can't tell you whether you're fit to drive."), one emergency line with a call link, and Terms / Privacy. The model keeps `notSafeToDrive` (any drink counted, plus the slow-eliminator tail) for its own use; the UI shows nothing for it.
- An estimation calculator and nothing else (user decision, 18 Oct 2026 late): the Getting home card, "Text a mate" and "Find a ride" are cut. The one emergency line stays, in the sheet, for whoever is holding the phone.
- Never encourage or reward drinking: no streaks, badges, celebrations, round reminders, upsells or drink notifications.
- Nothing times out or interrupts on the logging path, and nothing moves at rest. Motion only answers a change (the number settles in, the range band eases, sheets rise) and is off under reduced motion. (User decision, 17 Oct 2026: "fluid" is the main driver; 18 Oct: fluid means responsive motion, not liquid, and the pint-glass gauge is gone. User decision, 18 Oct 2026 (late): the rising light may breathe slowly; it's the only ambient motion besides the live mic. It is still, at full strength, while falling, at zero and under reduced motion.) Undo instead of confirm dialogs.
- Repeat drink = 2 taps (Add a drink → tap a recent); new drink ≤ 3 taps; typing optional, never required. (User decision, 18 Oct 2026 late; before that a one-tap repeat key.)
- Estimate is ±20% (1 SD) at best: show one number rounded UP (under the heading "Estimated blood alcohol"; user decision, 18 Oct 2026 late: no "about" beside the number, the heading carries the estimate wording, and "about" stays in the spoken text, the range line and the scrub readout; user decision, 22 Oct 2026: rounded up at the third place and drawn "0.09" with a small live "7", while screen readers keep the two-place "about 0.10") with the likely range (0.75–1.4×) drawn as a band under it, and "estimate only". The range's numbers ("Likely 0.06 to 0.11") appear when the band is tapped and are always read to screen readers (user decision, 18 Oct 2026: less text on the night screen). Which way it's heading is drawn on the same bar: a dashed track to the coming peak while rising, a fading trail from an hour ago while falling. Back to zero is the model's own time, rounded up, "about 9:45 am" (user decision, 23 Oct 2026; before that a 0.75–1.6× window).
- Drinking data is sensitive: stored in D1, never sold or shared; self-serve account deletion exists at /account/delete.

## Terminology
- "Standard drink" = 10 g of alcohol in Australia/UK-style units, 14 g in the US (storage and the engine stay in 10 g units; `src/lib/region.ts` converts for display and entry per region). Abbreviate "std" only next to a number.
- Core action verb is **Add** everywhere.
- Serves: pot/middy 285 ml, schooner 425 ml, pint 570 ml, can/stubby 375 ml, wine glass 150 ml, nip 30 ml.
- Emergency number: 000 (default region), 911 (US), from the region setting.

## Platform
web (mobile-first; must also work on desktop). Pinch-zoom must stay enabled.

## Open decisions
- Public no-sign-in calculator at `/` and evergreen SEO pages — planned (see SEO audit P0/P1).
