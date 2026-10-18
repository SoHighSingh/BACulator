# 16. Path to the app stores and monetisation implications

Scope: read-only analysis. Store-policy statements come from general knowledge (cutoff June 2026); re-read the current App Store Review Guidelines and Google Play policies before submitting. Treat every policy citation below as "verify".

## Current state (from the repo)
- Mobile-first PWA: Next 15 on Cloudflare Workers (OpenNext) + D1/Prisma, tRPC, next-auth (Google sign-in), Serwist service worker (`src/app/sw.ts`, production only), IndexedDB outbox (`src/lib/outbox.ts`) with pure merge logic (`src/lib/night-model.ts`).
- PRODUCT.md: "A free web app"; no payments, no push, no notifications anywhere in `src`. Non-negotiables forbid streaks, upsells and drink notifications, and forbid implying fitness to drive.
- Data is sensitive; account deletion exists at `/account/delete` (good for both stores).
- DESIGN.md line 69 already anticipates a Swift port (blur-in = `.blurReplace`, glass = `.glassEffect()`).

## Option comparison
| | PWA only | Capacitor (iOS) / TWA (Android) | Native Swift + Kotlin |
|---|---|---|---|
| Effort | zero | low (days) for Android TWA; medium for Capacitor iOS | very high; two codebases plus a port of the engine, outbox, auth, sync |
| Store presence | none on iOS (Add to Home Screen only); Android Chrome can install | yes, both | yes, both |
| App Store risk | n/a | high for a thin wrapper (rule 4.2 minimum functionality / repackaged website); needs real native value (widgets, haptics, Live Activity, durable storage) | lowest |
| Play risk | n/a | TWA accepted if Digital Asset Links verify and content passes policy | low |
| Payments | web (Stripe etc.), no store cut | iOS: IAP for digital goods unless a permitted exception; Android: Play Billing for digital goods | store billing both |
| Offline | works (SW + outbox); Safari evicts script-writable storage after ~7 days of non-use for non-installed sites (installed PWAs are exempt) | WebView IndexedDB works; Capacitor can use SQLite/Preferences for durable storage | best (SwiftData/Room) |
| Push | iOS 16.4+ web push only for installed PWAs; Android fine | native push (APNs/FCM) via plugin | native |
| Feel/perf | very good, no haptics on iOS | haptics plugin, native sheets possible | best; matches DESIGN.md glass mapping |
| Discoverability | SEO/web only | store search, ratings | store search, ratings |

Recommendation: ship PWA-only until there is a revenue or distribution reason; then Android TWA first (cheapest, lowest policy risk), and only do iOS via Capacitor if a few genuine native features justify it (home-screen widget, lock-screen "last logged" Live Activity, haptics, durable storage). A Swift rewrite is only worth it if iOS becomes the main channel.

## Store policy on alcohol and BAC apps
Apple (verify current text):
- Guideline 1.4.3 (approx.): apps that encourage consumption of tobacco/vape products, illicit drugs or excessive amounts of alcohol are not permitted; apps encouraging minors to consume alcohol are not permitted. BACulator's non-negotiables (no streaks, badges, round reminders, celebrations) are exactly the posture that passes. Do not add leaderboards, achievements, social "rounds", or promos. Review notes should state the harm-reduction purpose.
- Health/measurement accuracy (1.4.1 area): BAC estimators are a known sensitive category. Apple has historically rejected apps claiming to measure BAC with the phone and apps that suggest a user is fit to drive. BACulator is a drink-log estimator, shows a range, says "estimate only", and never shows a legal limit or "safe to drive". Keep that, and repeat the disclaimer in the store description and review notes. Avoid medical-category claims and "breathalyser" wording.
- Age rating: expect 17+ or higher (the 2025 system uses 4+/9+/13+/16+/18+) because of alcohol references; answer the questionnaire honestly. An adult-only first-run acknowledgement ("I am of legal drinking age") is advisable; keep it one-time and never on the logging path.
- 4.8 Login services: Google as the only third-party login requires offering an equivalent privacy-preserving login (Sign in with Apple, or an alternative meeting Apple's criteria) in an iOS app. Add an Apple provider to next-auth. A web-only PWA is unaffected.
- 5.1.1(v): in-app account deletion is required; `/account/delete` exists, surface it in settings. Privacy nutrition label: drink log plus weight/sex, linked to identity; privacy policy URL needed.
- Do not write BAC to HealthKit as medical data without a strong reason.

Google Play (verify):
- Alcohol: references are allowed; facilitating alcohol sales and alcohol ads are restricted. A BAC calculator with no sales or ads is fine. Complete the IARC content-rating questionnaire (alcohol references; expect Teen/Mature 17+). Target audience must be adults, which also avoids the Families policy.
- Misleading claims policy applies to "BAC measurement" wording; keep "estimate only". Data safety form required.
- Account deletion: in-app and a web link are required for apps with account creation; `/account/delete` serves as the web link.
- TWA needs Digital Asset Links (`/.well-known/assetlinks.json`) on the Worker domain, 512px and adaptive icons, and a current target API level (Bubblewrap / PWABuilder).

## In-app purchases versus web payments (monetisation)
- The product is free and must stay non-upselling on the logging path. Any revenue must respect that: no paywall mid-night, no ads, no promotion that encourages drinking. Models that fit: (a) a "supporter" tier for non-safety extras (history/export, custom drinks, themes) shown only in Settings/Account, never on the night screen; (b) tips/donations. Safety features (estimate, "Not safe to drive", emergency info, undo, offline) stay free.
- iOS: digital features unlocked in-app must use Apple IAP (15-30%; Small Business Program 15%). In the US, external purchase link-outs have been permitted without commission since the 2025 Epic ruling; EU/Japan have their own regimes. This changes fast: verify before designing.
- Android: Play Billing required for digital goods (15% to 30%); user-choice or alternative billing exists in some regions. A plain PWA cannot use Play Billing; a TWA can via the Digital Goods API.
- Web (PWA): Stripe Checkout or a merchant of record (Paddle, Lemon Squeezy) on the Worker; no store cut, and a merchant of record handles VAT/GST for a global audience. Best margin, lower conversion, no store discoverability.
- Implication: wrappers force IAP for the same unlock. Options: keep store builds fully free (store as acquisition only), sell on the web only where link-outs are allowed, or price the in-store unlock higher. A free store app that mentions a web purchase outside permitted regions risks a 3.1.1 rejection.
- Cost note: the Workers AI bartender is capped (20/hr, 50/day per user, 250/day global per HANDOFF). Store traffic could exhaust the global budget; model the cost before launch.

## Code portability
Pure and portable:
- `src/lib/bac-calculator.ts` imports only types (Widmark, absorption, zero-order elimination, `simulateNight`). Easy to port to Swift/Kotlin. Export the cases in `bac-calculator.test.ts` as shared golden vectors so three implementations cannot drift. A wrapper reuses it as is.
- `src/lib/night-model.ts` (merge, pending, removals, `syncFailure`, double-tap, recents): pure, portable; it defines the sync protocol (idempotent client IDs), so specify it rather than only port it.
- `src/lib/region.ts` plus `drinks/standards`: data and conversions, straightforward. The drink catalog lives in D1 (`db:catalog-sql`), so native needs to bundle or sync it.
- `estimate-display.ts`, `format-clock.ts`: UI-adjacent, rewrite.
Not portable: `outbox.ts` (IndexedDB), React components, tRPC client, next-auth cookie sessions. Native needs a token endpoint (Apple/Google native sign-in exchanging an ID token) and a stable API contract. The Worker backend is reused unchanged; WKWebView cookie sessions work for Capacitor.

## Offline
- PWA: SW plus outbox already handle offline logging. iOS risk: Safari removes storage for non-installed sites after ~7 days without use. Request `navigator.storage.persist()` (not honoured everywhere).
- Capacitor: serves a bundled shell, so Serwist caching is mostly moot; move the outbox to SQLite/Preferences for durability.
- Native: SwiftData/Room outbox with the same client-ID protocol; BGTaskScheduler/WorkManager for background sync.

## Push notifications
- The product forbids drink notifications, round reminders and anything encouraging drinking. Do not add engagement push. This also keeps 1.4.3 review simple.
- No code today requests notification permission, so compliance needs no change.
- Possible opt-in, off-by-default uses (need an explicit user decision first; PRODUCT.md authorises none): a single user-scheduled "getting home" check-in, or a morning-after summary. Both can read as nudges. A "BAC back to zero" push must not be built (implies fitness to drive).
- If ever built: web push for installed iOS PWAs (16.4+), FCM for TWA, APNs for Capacitor/native.

## Risks and open decisions
1. Decide whether stores are wanted at all; the PWA already installs on both platforms and avoids store alcohol review and the commission.
2. If iOS: Sign in with Apple, in-app delete account, 17+/18+ age rating, "estimate only" in metadata, native value beyond a wrapped site.
3. Monetisation model must not breach the no-upsell stance; decide supporter tier vs free and the web-vs-IAP split; verify current US/EU link-out rules.
4. Workers AI global cap and D1 growth under store traffic.
5. Create shared golden vectors for the BAC engine before any second implementation exists.
6. Global audience: drinking ages and alcohol/health-claim rules differ by country; keep the age acknowledgement generic, not tied to 18 or 21.

Suggested sequence: (1) harden PWA install and add `assetlinks.json`; (2) Bubblewrap TWA for Play, free app; (3) add Apple sign-in, then Capacitor iOS only if native features (widget, haptics) are scoped; (4) revisit monetisation with real usage data.
