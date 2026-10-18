# 19 - Activation and conversion funnel

Scope: landing to first drink logged. Read-only analysis. Files: `src/app/page.tsx`, `src/components/Onboarding.tsx`, `src/components/TermsAndDisclaimerDialog.tsx`, `src/components/landing/Landing.tsx`, `src/lib/consent.ts`, `src/lib/outbox.ts`, `src/hooks/useNight.ts`, `src/components/DetailsForm.tsx`.

## 1. Current funnel (new user, happy path)

| # | Step | Taps/inputs | Drop-off risk |
|---|------|-------------|---------------|
| 0 | Landing, optional "Try it" demo (`TryIt`, `useDemoNight`) | 0 to N | Good: value shown before any ask. But the demo uses a fixed sample weight (`DEMO_WEIGHT`), so it never becomes the user's own first drink; the effort is thrown away. |
| 1 | "Start tonight" (`StartButton`, `Landing.tsx` ~l.113, 219, 359) opens the terms dialog | 1 | The label promises a start; the next thing is a legal wall. |
| 2 | Terms dialog (`TermsAndDisclaimerDialog`): read 3 bullets, tick "I'm 18/21 or older", optional region switch | 1-2 | Modal text wall. Main button is disabled until the box is ticked, with no explanation of why. "Not now" just closes. |
| 3 | "Continue with Google" (`signIn("google")`, `page.tsx` l.78) | 1 | Biggest risk. Forced third-party account before any value. Off-site redirect, return load, Google account picker (1-2 more taps, possible password/2FA). Shared phones, privacy-minded users and people already tipsy at a bar bounce here. |
| 4 | Return: `consentStatus` query, then `takePendingConsent` writes consent | 0 taps, 2 sequential round trips behind blank `aria-busy` screens (l.65, 88-90) | Blank screen with no words on slow bar signal. If localStorage was blocked or older than 24h, the full terms dialog appears a second time (l.92-105). |
| 5 | Onboarding (`Onboarding.tsx`): weight, sex, "Save and start" | about 4-6 | Reasonable and skippable, but it blocks the first drink and is the third gate in a row. Skip is stored only in localStorage (`ONBOARDING_SKIPPED_KEY`). |
| 6 | Night screen, add dock (`AddDock`, `AddSheet`) | 1-3 per drink | Tuned for drunk use; fine. |

Cold start to first drink: roughly 10-14 taps, 3 page states, at least 4 gates (terms, Google, consent re-check, onboarding). Too many for someone at a bar on 5% battery. The demo already proves the logging UI is fast; the gate sits between that proof and the user's own data.

## 2. Findings

1. Sign-in is the conversion cliff and is not needed to create value. BAC math is client-side; `useNight.ts` already writes every add/remove to an IndexedDB outbox first (`putOutbox`, `lib/outbox.ts`) and shows it at once. The outbox is keyed by `userId` and `useNight` already tolerates `userId ?? ""` (l.256, 284), but `send` returns early with no user (l.138). Most of a guest mode exists.
2. The consent step mixes two jobs. Bullets 1-2 ("only a guess", "never decide if you can drive") are safety information: keep. Bullet 3 (we store your drinks, weight and sex), the age tick and "By continuing you agree to the Terms" are legal/data consent. Bullet 3 would be false in a guest mode where nothing leaves the phone.
3. "Continue with Google" is the only agree label, so consent and account creation are fused; "Not now" leads nowhere.
4. After sign-in, consent can be asked again (`mustConsent` path) with the same safety copy. Right for version bumps, wasteful for first-timers.
5. Weight and sex are asked in a blocking full screen. The "Add details" affordance on the night screen already exists, so the ask could happen inline at the moment the number needs it.
6. Pending consent and skip state live in localStorage, fragile on iOS/private mode. Failure degrades to repeated prompts, not data loss (the code comments this; good).

## 3. Proposed guest mode (offline-first)

Principle: the first drink is loggable with no account and no network. An account is a way to back up and sync, never a gate.

Flow:
- Landing "Start tonight" -> one-screen "Before you start" (age tick + the two safety lines) -> night screen. About 3 taps, then drinks.
- Guest identity: random `guestId` (UUID) persisted in localStorage/IndexedDB, used as the outbox `userId`. The outbox, `claimOfflineCache` and `listOutbox(userId)` already partition by owner, so a guest is just another owner. Store consent locally as `{termsVersion, ageConfirmed, agreedAt}` (same shape as `PendingConsent`, without the 24h expiry).
- Weight and sex are optional and stored locally for guests. Without them, show drinks/standard drinks first and the BAC range only after details are set, so the number stays honest. Do not block on it.
- `page.tsx`: add a third state `guest` beside `!session` and `authenticated`. Keep `useUserInfoData` and `consentStatus` disabled for guests; `NightScreen` reads weight/sex from local storage. `useNight` runs a local-only path (skip `send`/`flush`, keep `outboxView`).
- Persistence honesty: guest data lives only on this phone. Call `navigator.storage.persist()` after the first drink; offer a plain text/CSV export as a no-account safety net.
- Upgrade/merge: on Google sign-in, re-stamp guest outbox entries with the real `userId` and run the existing `flush`. Idempotency already comes from `clientId` per entry, so retries never duplicate a drink. Merge weight/sex into the account only if the account has none. Write server consent with `ageConfirmed` from the guest record.
- Privacy: guest mode holds less data, which suits the harm-reduction posture. Update `/privacy` to say guest data never leaves the device.

Risks: no cross-device history; no recovery for a lost phone (say so plainly); no server abuse surface since nothing is server-side.

## 4. Where an upgrade prompt may ethically appear

Never while the person is drinking or has a non-zero estimate. A prompt in a degraded-judgment moment is a dark pattern, and a modal would block the logging dock.

Allowed, in order of preference:
1. Next morning / next open, once the previous night is closed and the estimate is zero (the "all clear" state in `NightStatus`): a quiet inline card under the finished-night summary. "Keep your nights across phones." One button plus an equal-weight "No thanks". At most once per 7 days; stop after 2 dismissals.
2. A permanent row in settings / You (`UserInfoSlideOut`): "Back up with Google". Always there, never nags.
3. User-initiated: when they tap history, export or "new phone", offer the account as the way to do it.
4. If `navigator.storage.persist()` is denied, show the backup card, in the morning only.

Never: during a night, over the add dock, on first launch, countdowns or scarcity, fake loss warnings when storage is actually fine, guilt framing, or a smaller/greyed "No thanks".

## 5. Copy principles

- Sober-readable (per the `designing-for-impaired-users` skill): short sentences, one idea each, no jargon, 18px+ (already the norm).
- Say what happens next in the button. "Start tonight" then "Continue" with no object is vague; guest path: "Start (no account needed)". Use "Back up with Google" only at the upgrade point.
- Explain disabled buttons: under the age tick, "Tick the box to continue." (`disabled={!ageConfirmed}` is currently silent.)
- Safety lines stay first and unsoftened: "It's only a guess. Your real blood alcohol can be higher." "Never use it to decide if you can drive." Never imply fitness to drive; no green "you're fine" framing at any step.
- Truthful data lines per mode: guest "Stays on this phone."; signed in "Saved to your account so you can switch phones." Never claim what is not true for the mode.
- Trim legal text: age tick + one "Terms and Privacy" link line; full wording stays on `/terms` and `/privacy`. Bump `TERMS_VERSION` only for material changes.
- Offer, don't pressure: benefit plus an equal "No thanks". No streaks, no rewards for drinking, no urgency.
- Loading states carry words ("Signing you in...", "Checking your details...") instead of blank `aria-busy` screens.
- Ask for details when they pay off: "Add your weight for a closer estimate." Keep `Onboarding` as an optional first-run card with Skip as a first-class button.

## 6. Suggested metrics

Per-step drop (landing -> terms opened -> age ticked -> Google redirect -> return -> first drink), time-to-first-drink, demo-to-start rate, guest-to-account upgrade rate by surface (morning card vs settings), prompt dismiss rate (stop if high), night-2 return rate. Minimal and aggregate; no per-drink analytics for guests.

## 7. Priority

1. High: guest mode with local consent; Google off the critical path.
2. High: worded loading states; explain the disabled button.
3. Medium: weight/sex via inline "Add details"; Onboarding optional.
4. Medium: morning upgrade card and settings row; merge via outbox + `clientId`.
5. Low: trim consent copy; avoid the second consent for first-timers when pending consent fails (blocked storage / over 24h).
