# BACulator — product context

## What it is
A free web app that estimates blood alcohol from the drinks you log during a night out. Mobile web (installable), hosted on Cloudflare Workers + D1. Name stays **BACulator** (confirmed); search-facing copy leads with the descriptor "Blood Alcohol & Standard Drinks Calculator". **Audience is global** (confirmed 17 Oct 2026): Australia first in data, but no "Australia" in product copy; a US version is wanted (14 g US standard drink, oz/lb, US serves, 0.08 limit context, 911).

## Primary user and scene
Someone of legal drinking age on a night out: phone in one hand, drink in the other, dark loud venue, BAC anywhere from 0 to ~0.15, possibly offline. Their job: **record the drink they just got, in one tap, and know it worked.** Secondary jobs: see an honest estimate, fix a wrong entry, get home, and the next morning understand what they drank.

Secondary users: a sober friend holding the phone (needs emergency info fast); a sober visitor from search comparing standard drinks or "how long until I'm sober" (needs a public calculator and plain explanations, no sign-in).

## What makes it different
- One-tap "same again" with the real drink and size, plus recents. Competitors need 3–4 taps or log a generic drink.
- Free "bartender" that reads Australian drink slang ("2 schooners of Great Northern") with a catalog first and Workers AI only as a fallback; code does the maths, never the model.
- A simulation-based estimate (absorption + zero-order elimination, never "banking" sober time), shown as a band, not a precise number.

## Non-negotiables (from the designing-for-impaired-users skill and harm-reduction stance)
- Never imply fitness to drive: no legal-limit lines, no green zones, no "time until 0.05", no "under the limit". While the estimate is above zero, always say **Not safe to drive**.
- Never encourage or reward drinking: no streaks, badges, celebrations, round reminders, upsells or drink notifications.
- Nothing times out or interrupts on the logging path, and nothing moves at rest. Motion only answers a change (the glass pours and settles, numbers count) and is off under reduced motion. (User decision, 17 Oct 2026: "fluid" is the main driver.) Undo instead of confirm dialogs.
- Repeat drink = 1 tap; new drink ≤ 3 taps; typing optional, never required.
- Estimate is ±20% at best: show one rounded number ("about 0.08") with the likely range under it, and "estimate only". (User decision, 17 Oct 2026: a band alone was too wide to act on.)
- Drinking data is sensitive: stored in D1, never sold or shared; self-serve account deletion exists at /account/delete.

## Terminology
- "Standard drink" = 10 g of alcohol in Australia/UK-style units, 14 g in the US (storage and the engine stay in 10 g units; `src/lib/region.ts` converts for display and entry per region). Abbreviate "std" only next to a number.
- Core action verb is **Add** everywhere.
- Serves: pot/middy 285 ml, schooner 425 ml, pint 570 ml, can/stubby 375 ml, wine glass 150 ml, nip 30 ml.
- Emergency number: 000 (default region), 911 (US), from the region setting.

## Platform
web (mobile-first; must also work on desktop). Pinch-zoom must stay enabled.

## Open decisions
- Offline-first logging (IndexedDB queue + idempotent sync) — planned, not built.
- Public no-sign-in calculator at `/` and evergreen SEO pages — planned (see SEO audit P0/P1).
