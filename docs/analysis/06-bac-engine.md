# 06 - BAC engine review (read-only analysis)

Files: `src/lib/bac-calculator.ts` (435 lines), `src/lib/estimate-display.ts` (155), tests `bac-calculator.test.ts`, `estimate-display.test.ts`. Arithmetic below was checked with throwaway node scripts (not committed).

## What is right
- Widmark `A / (W * 1000 * r) * 100` with r 0.68 / 0.55 (`bac-calculator.ts:26-35`). Ethanol density 0.789 and 10 g/standard (`drinks/standards.ts`) are correct.
- Absorption: first-order, ka = 3/30 = 0.1/min (`:6-8,15,40-43`). 1-exp(-3) = 95% at 30 min, half-life 6.9 min. Matches "about 95% within 30 min".
- Elimination: 0.015 %/h zero-order, clamped at 0 so sober time does not bank elimination (`:72-83`). Tested ("does not let time spent sober cancel out").
- The "independent 1-second reference" test checks numerics only, not literature validity (see Tests).

## Confirmed issues (ranked by impact for a paid accuracy claim)

### 1. Reads ~0 right after logging; "40% low" is roughly the 5-minute number. CONFIRMED
`absorbedFraction(minutes <= 0) = 0` (`:41`) and each drink's clock starts at `finishedAt`, which is "now" when the user logs it. Absorption is modelled as starting the instant the glass is finished, with nothing absorbed during the drinking itself.
Worked example (80 kg male, 1 std, 10 g): full contribution 0.0184. After logging: t=0 -> 0.0000 (100% low); t=1 min -> 0.0015 net; t=5 -> 0.0060 net (39% of the drink absorbed); t=10 -> 0.0091; t=30 -> 0.0100. Real drinks are sipped over 15-45 min, so some alcohol is already in the blood at "finished". For the first ~10 minutes the number is far below reality and the headline reads "0.00" with a "rising" pill (`describeEstimate`, estimate-display.ts:72-82).
Fix: treat `finishedAt` as the END of a drinking window of D minutes (default ~15, possibly per drink type) and integrate intake uniformly over [finish-D, finish]; the per-drink fraction becomes (1/D) * integral of (1 - exp(-ka*(t+s))) ds over s in [0, D], with partial intake while still inside the window. Cheap alternative with no engine change: show the peak to come ("heading to 0.07") as the headline while absorbing; `describeNight` already has `peak` (estimate-display.ts:134). A food input (slower ka ~0.03-0.05/min) is absent; state "assumes an empty-ish stomach" in About this estimate.

### 2. isRising is wrong whenever a small drink follows a big one. CONFIRMED
`isBACRising` (`:144-153`) is true if any drink finished <= 30 min ago, regardless of net slope.
Example: BAC 0.10 and falling; user logs 0.5 std (80 kg male) 20 min ago. Absorption rate at 20 min = ka * e^-2 * 0.0092 = 0.000124 %/min; elimination = 0.00025 %/min. The curve is falling, status says "rising". Derive from the timeline: rising iff timeline[now+1 step] > timeline[now]. The existing test only passes `isRising` as an input (estimate-display.test.ts:63) and never derives it.

### 3. Fixed range 0.75-1.4x is not honest on the way down. CONFIRMED
`BAND_LOW/HIGH` (estimate-display.ts:8-9) scale the point. A multiplicative band suits uncertainty in r (peak scaling), but elimination uncertainty is additive over time (0.010-0.025 %/h, Jones 2010, cited at :10).
Example: peak 0.10 at 1 h (0.115 absorbed). At 4 h the model says 0.055. Slow eliminator (0.010) -> 0.075 = 1.36x (inside 1.4). Fast eliminator (0.025) -> 0.015 = 0.27x, far outside the 0.75 floor. After a few hours the stated "likely range" (0.04-0.08 for 0.055) excludes a normal fast eliminator (0.02 would be plausible). Around the peak the band is reasonable.
Fix: compute the range by re-running the (cheap) timeline at corner parameters rather than scaling: low = fast elimination (0.020-0.025) and r +10%; high = slow elimination (0.010) and r -10%. The same runs give the zero window (issue 4). Keep the existing property that the range contains the point (estimate-display.test.ts:32).

### 4. Back-to-zero window and the "tail" warning disagree. CONFIRMED
`formatBackToZero` scales hours remaining from NOW (estimate-display.ts:64-70: now + h*0.75 / h*1.6). `describeNight` scales from the FIRST DRINK (`:141-144`: first + (zeroAt - first)*1.6).
Example: first drink 8 pm, model zero 4 am, now 3 am. Window text: about 3:45-4:36 am. Tail warning: until 8 pm + 12.8 h = 8:48 am. The screen shows a window that ended, then four more hours of "Not safe to drive" with no end time (`timeToSober` is 0 after zeroAt, so `backToZero` is null while `inTail` is true). Conservative, but contradictory.
Literature check: 0.75 (0.020/0.015 = 1.33) and 1.6 (0.010/0.015 = 1.5 plus r variance) are sensible; scaling from now is the right base for a given current BAC. Use one source (the computed late bound from issue 3) for both the text and `inTail`, and show the end time while in the tail.

### 5. g/100 g vs g/100 mL. CONFIRMED (small, systematic, undisclosed)
Widmark's r (0.68/0.55) is defined for mass-based blood concentration, so `gramsToBAC` returns g/100 g. Legal limits (0.05 AU, 0.08 US) are g/100 mL; blood density is about 1.055 g/mL, so g/100 mL = 1.055 x g/100 g. 70 kg male, 1 std: 0.02101 (g/100 g) vs 0.02216 (g/100 mL). The engine reads about 5% low against legal limits. Fix: multiply by 1.055 in `gramsToBAC` (or document the unit). Pick one convention and note it in `CONFIG`.

### 6. Future-dated drinks leak into the "now" results. CONFIRMED
The simulation starts at the earliest drink including future ones (`earliestDrinkTime` `:85-87`; `predictionEnd` `:181-184`), and `describeNight` passes all drinks to `calculateBAC` while filtering `counted` only for `hasDrinks` and the tail.
- Only a drink 1 h in the future: `hasDrinks` is false, yet `calculateBAC` returns positive `timeToSober` and `timeToPeak`, so `estimate.backToZero` is a clock window and `peak` is set.
- Earlier drink plus a future drink: `timeToSober`, the curve and the zero window include the future drink, so "back to zero" shifts when someone mis-types or schedules a time. (`isBACRising` correctly ignores future drinks.)
Suggest: the headline, window and tail use `drinks.filter(finishedAt <= now)`; future drinks appear only in a separate "if you have it" continuation of the curve.
Related performance: a mistakenly far-past drink (a year ago) makes `simulateTimeline` run ~525k one-minute steps, and `calculateBAC` runs a second full simulation inside `calculateBACAtTime` (`:115-139`). Start the simulation at max(first drink, now - 48 h) once earlier drinks have cleared, and read `currentBAC` from the same timeline.

### 7. Smaller points
- Zero-order elimination all the way to 0 (`:82`). Real elimination is Michaelis-Menten (Km about 0.01 %): near 0.01 it runs at about half rate, so the true tail is longer. The 1.6 late bound covers it; document it, or taper below 0.02.
- Widmark with sex and weight only has about +/-12% structural error versus Watson TBW. 60 kg, 165 cm, 25 y woman: Watson TBW 30.3 L -> /0.8157 = 37.2 L; Widmark 0.55 x 60 = 33 L -> engine reads 12.7% HIGH. 120 kg, 170 cm, 30 y man: TBW 58.2 L -> 71.3 L; Widmark 0.68 x 120 = 81.6 L -> engine reads 12.6% LOW (the dangerous direction). Onboarding collects weight and sex only; to reach Watson, collect height and age, or at minimum lower r for high BMI.
- Headline rounds UP to 2 dp (`estimate-display.ts:35-39`): 0.011 shows 0.02 (82% high), 0.0501 shows 0.06. Deliberate, never under-reads, but inflates relative error at low BAC. Standards are also rounded up to 0.1 and quick-picks to 0.01. A consistent small upward bias; defensible, but disclose it.
- `getDrinkStatus.minutesToPeak` says "30 minus elapsed" but the model's net single-drink peak is at about 20 min after finish (solve ka*e^(-ka*t)*B = beta/60 for 1 std, 80 kg: t about 20 min). Fine as a label, not a measured peak.
- Sex other than male/female returns null (`calculateBAC` `:350`): no estimate for non-binary users. Product decision (an averaged r of about 0.62 is an option).
- Weights are not bounded (`:346`); add sanity limits.

## Tests: gaps and proposed additions
Existing coverage is good on numerics (50 scenarios vs a 1-second reference, closed-form Widmark/first-order checks, order independence, monotonic in drinks). Missing:
1. Right after logging: 1 std, 80 kg male, logged at t=0: BAC at t=0 is above a minimum (e.g. >= 0.004) and at 5 min is at least 60% of the 30-min value. Fails today (t=0 is 0).
2. isRising from slope: 0.10 falling + 0.5 std logged 20 min ago -> false; 1 std 5 min ago -> true.
3. Range at 4 h: scenario in issue 3; computed low <= 0.020, high >= 0.075. Property: range contains the point and widens with time after the peak.
4. Window/tail consistency: `inTail` true implies a displayed end time at or after now; both derived from one function.
5. Units: 70 kg male 1 std returns 0.0222 if issue 5 is fixed (fixes the convention).
6. Future drinks: only a future drink -> `hasDrinks` false, `backToZero` null, `peak` null; earlier + future drink -> headline, window and tail equal the earlier-only values.
7. Far-past drink (365 days) returns 0 in under 50 ms.
8. Literature golden values, not self-referential: 80 kg male, 4 std within 1 h: gross 0.0735, peak about 0.058 at 1 h, zero about 4.9 h after (0.0735 / 0.015). Today's reference-model test would still pass if ka or r were wrong.

## Suggested session plan ("BAC engine accuracy fixes")
1. Drinking-window absorption (1) + slope-based `isRising` (2), with tests 1 and 2.
2. Computed range and zero window from corner runs (3, 4) replacing `BAND_*` / `ZERO_*`, one tail rule; tests 3, 4.
3. Filter future drinks in `describeNight` (6) plus the start cap; tests 6, 7.
4. Unit convention (5) and golden-value tests (5, 8); update the About this estimate copy (model, units, no food, deliberate upward rounding).
5. Optional: Watson TBW with height/age; Michaelis-Menten taper.
Marketing guardrail: even after these, claim "an estimate with a stated range", never a precise reading. Individual elimination varies 0.010-0.025 %/h and cannot be narrowed without a breathalyser.
