# Monetisation and ethics (analysis 01)

Sources: PRODUCT.md (non-negotiables, lines 16-22; "free web app", line 4; "never sold or shared", line 22), HANDOFF.md (AI quota, `src/lib/drinks/ai-quota.ts`, the only real marginal cost; CSP note on injected scripts; consent/health-data policy branch). No monetisation work exists in the repo today.

## Context that shapes the answer
- Cost base is tiny: Workers + D1 + capped Workers AI (20/user/hr, 50/user/day, 250/day global). Revenue need is low, so the ethical choice is cheap.
- The product is sold on trust: sensitive health-adjacent data, user is possibly intoxicated and impaired (judgement, motor control), and the public calculator is an SEO acquisition surface.
- Users in the moment are the *least* able to evaluate a purchase. Any prompt at the point of use is a dark-pattern risk by definition.

## Red lines implied by PRODUCT.md
1. No paywall, limit, ad, or upsell on: the estimate and its band, "Not safe to drive", Get home, emergency number (000/911), About this estimate, the public calculator, Add/Undo/same-again, offline logging, account deletion, data export.
2. "Nothing times out or interrupts on the logging path": no modal, banner, interstitial, trial countdown or "upgrade" nag anywhere in the night flow. Upsells only in calm, sober contexts (settings, the morning-after view), never while a night is open.
3. "Never encourage or reward drinking": no tiers keyed to volume, streaks, loyalty points, "unlock after N nights", badges, drink-deal ads, venue offers, or anything whose revenue rises with drinking. No metric of "engagement" may be a business KPI.
4. "Never sold or shared" data: rules out ad networks, data brokers, third-party SDKs/trackers, and "anonymised insights" sold to alcohol brands or insurers. Also keeps the CSP clean (no injected ad/analytics scripts).
5. Never imply fitness to drive: paid features must not add limit lines, "safe to drive at" times, or green zones.
6. Impaired-user rules: no purchase flow reachable from the night screen; no payment entry while a night is open; no auto-renew surprises; cancel in one tap; no countdown/scarcity copy.
7. Fairness: a sober friend holding the phone or a stranger in an emergency must never meet a sign-in or payment wall.

## Models compared
| Model | Fit | Notes |
|---|---|---|
| Ads / sponsorship by alcohol, delivery, bars | Reject | Directly rewards drinking; breaks red lines 3 and 4. Non-alcohol sponsors (water, rideshare, taxis) still make the "Get home" surface an ad slot and risk implied endorsement; reject for in-app, at most a neutral, non-tracking, clearly labelled partner list in the sober-context pages. |
| Subscription | Weak | Recurring charge for a tool used a few nights a month feels extractive; renewals hit people who forgot; churn pressure pushes engagement tactics (red line 3). Only defensible for genuinely sober, ongoing-cost features. |
| Freemium with gated core | Reject | Gating any estimate accuracy, history depth that undermines safety, or logging limits breaks line 1. |
| One-off unlock ("supporter pack") | Good | No renewal trap, no engagement incentive, honest. Needs sober-context purchase only. Gate convenience and extras, never safety. |
| Tips / donations (pay what you want, optional) | Good | Lowest ethical risk; fits "free app" promise. Revenue likely small and lumpy. Place on landing/account/morning-after, never mid-night. |
| B2B: festivals, universities, health services, harm-reduction orgs, employers/wellbeing programmes | Good, with conditions | Pay for white-label/co-branded public calculator, embeddable widget, printable QR posters, region packs. Must never include per-user data, drinking analytics, or venue-driven drink promotion. Bars/pubs selling alcohol are a conflict of interest; prefer organisers, councils, unis, safe-rides, health charities. Grants (public health, AOD foundations) are a natural fit and carry no incentive conflict. |
| Data licensing / insights | Reject | Contradicts "never sold or shared". |

## What could be paid without touching safety
Candidate extras, all sober-context, none affecting the night screen's safety output:
- Morning-after summary: full-night recap, export to PDF/CSV (note: the "Download my data" right must stay free; paid is only the formatted report).
- Long-term history and trends, multi-device sync beyond one account (data export stays free).
- Custom drinks library/imports, bulk editing, saved venues' serves.
- Cosmetic: themes, app icons (low risk, but avoid "reward" framing).
- Accessibility is not an upsell; never gate it.
- For B2B: embed/white-label calculator, translated and region packs, event QR kit.
Never gated: the AI bartender should stay free for normal use; its caps are a cost control and must read as "unavailable, add manually", never "upgrade". A paid higher AI cap is acceptable only if the free path stays fully functional.

## Risks
- Trust: any visible paywall near the estimate invites "they paywalled safety" press and damages the SEO/word-of-mouth funnel.
- Perverse incentive: if revenue depends on nights logged, the team will drift toward engagement. Keep revenue independent of usage (one-off, donation, B2B licences, grants).
- Payment processor and app store policies: app stores and some processors have policies on alcohol-related apps; web-only with Stripe/Paddle/Ko-fi style checkout is simplest. Verify current terms before launch.
- Regulatory: health-data handling (consent branch, 18+/21+ gate) applies to anything billing-linked; keep payment identity separate from drink data (processor holds the card; the app stores only an entitlement flag).
- Impaired purchasing: even a donation button can be hit while drunk; refunds-on-request should be stated plainly.

## Recommendation
Keep the app free and fully safe for everyone. Fund it with, in order: (1) optional tips / "supporter" one-off unlock shown only in sober contexts (account page, morning-after view, landing footer), granting sober-context extras (recap export, history, themes) and never a safety feature; (2) grants and B2B licensing to events, universities, councils and harm-reduction orgs for a white-label embeddable calculator and poster kit, with a written no-data, no-alcohol-promotion clause. No ads, no subscriptions, no data sales, no sponsorship by alcohol or venues.

Implementation guardrails if built: an `entitlement` boolean on User only (no payment data in D1); a test asserting no upsell component renders on `/night` or the Get-home/emergency surfaces; a lint-style grep in review for "upgrade|premium|pro" strings in night components; a short "How BACulator is funded" page to reinforce trust.
