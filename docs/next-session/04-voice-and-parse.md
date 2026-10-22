# 04 - Voice and text drink entry: audit

Read-only audit. Parser outputs were observed by running `parseWithCatalog` (via tsx) against the real catalog (AU region).

## Short answer
1. Voice is a single-shot, interim-results recogniser that writes every interim guess into the live input; the UI parses and re-renders on each guess. It stops on the browser's first pause, nothing records what the engine finally heard, there is no confirm step, and every failure shows the same "Didn't catch that" line.
2. "vodka red bull" becoming "Vodka" is not a voice bug. The catalog parser discards the mixer by design and names the item after the spirit, so even a perfect transcript shows "Vodka". The standards (1.0 std, one 30 ml nip) are right; the name and card are wrong.
3. Keep voice, demoted to a secondary path that fills the two sliders (standards, how long ago). Final result only, single shot, visible editable transcript, never auto-add.

## 1. Speech handling (src/components/night/AddDock.tsx)

Configuration, `listen()` at lines 138-165:
- New `Ctor()` per tap (145): no reuse bug. `lang = navigator.language || "en-AU"` (146). `interimResults = true` (147). `continuous = false` (148). `maxAlternatives` never set; no `onnomatch`, `onspeechend`, `onstart`.
- `onresult` (149): `setText(Array.from(e.results, r => r[0]?.transcript).join(" "))`. Takes interim and final results alike and overwrites the field; there is no `isFinal` check anywhere.
- `onend` (152): flips `mode` listening -> typing. Never restarts, never checks that anything was heard.
- `onerror` (150-151): only `not-allowed` / `service-not-allowed` get their own message ("microphone is off for this site"). `no-speech`, `network`, `audio-capture`, `language-not-supported`, `aborted` all show "Didn't catch that. Try again, or type it." The user cannot tell blocked mic from iOS dictation off from offline from "you paused".
- `start()` is in try/catch (158-162), called synchronously in the click handler, so permission prompt timing is fine. Permissions-Policy is fine: `microphone=(self)` at next.config.js:47.

Why it "didn't work at all" most of the time, ranked:
1. Interim text drives the UI. `onDevice` (line 105) is a `useMemo` over `text`, so each interim guess is parsed and the result card re-renders. With `continuous=false` Chrome (especially Android) ends the session at the first pause. If the engine had only produced "vodka" when it ended, the field is left on "vodka" and `mode` goes to "typing". This matches "it landed on vodka and that's it". There is no "Heard: ..." line, so nothing tells the user it stopped early.
2. Short single-shot window. A hesitant speaker ("uh... vodka... red bull") gets cut at the pause, or `no-speech` (about 5-8 s of nothing) which maps to the generic message. No countdown or progress.
3. Stale-handler race. `close()` (109-117) calls `rec.current?.stop()` then `setText("")`. `stop()` still delivers a final `onresult` asynchronously and the old object's handlers are never detached, so a late `onresult` calls `setText` while `mode` is "idle"; the next open of the composer can carry a stale phrase. No unmount cleanup either.
4. `hasVoice` (103) is only "constructor exists". iOS Safari exposes `webkitSpeechRecognition` but needs Siri and Dictation enabled, and in an installed home-screen PWA it commonly fails with `service-not-allowed` or returns nothing. The mic is still offered and the message ("microphone is off for this site") gives wrong advice. Android Chrome works but needs network (Google's server); offline `network` errors also show "Didn't catch that". Firefox has no support (mic correctly hidden).
5. `lang` from `navigator.language`: an AU user on an en-US phone gets en-US recognition, which mis-hears "schooner", "jager", "tinnie", "goon". Use the region (en-AU for AU) and set `maxAlternatives = 3`.
6. Mic key on the idle bar is `hidden ... min-[360px]:grid` (under 360 px it only exists inside the composer).
7. Double start / object reuse is not an issue: a second tap while listening calls stop(). Only a very fast double tap before `mode` updates could race.

## 2. Parse: why mixed drinks lose the mixer

Observed outputs (name, count x ml, abv, standards):

| Input | Result |
|---|---|
| vodka red bull | Vodka 1 x 30 ml, 40%, 1.0 |
| vodka redbull | Vodka 1 x 30 ml, 40%, 1.0 |
| a vodka red bull | Vodka 1 x 30 ml, 40%, 1.0 |
| jager bomb | Jagerbomb 1 x 130 ml, 8.1%, 0.9 (catalog entry, keeps its name) |
| rum and coke | Rum 1 x 30 ml, 40%, 1.0 |
| two schooners of great northern | Great Northern Original 2 x 425 ml, 4.2%, 2.9 |
| glass of red | Red wine 1 x 150 ml, 14%, 1.7 |
| double gin and tonic | Gin 1 x 60 ml, 40%, 1.9 (loses "double" and "tonic" in the name) |
| vodka and red bull / vodka soda / vodka cranberry / vodka and orange juice | Vodka 1.0 each |
| bourbon and coke | Whisky 1.0 |
| jack and coke | Jack Daniel's Old No. 7, 30 ml, 40%, 1.0 |
| jaeger and red bull | Jagermeister 30 ml, 35%, 0.9 |
| two / 3 vodka red bulls | Vodka x2 = 1.9 / x3 = 2.9 |
| double vodka red bull | Vodka 60 ml, 1.9 |
| vodka red bull and a vodka soda | two Vodka items, 1.0 each |
| red bull | Energy drink 375 ml, 0%, 0 std |

Cause (src/lib/drinks/parse.ts):
- Mixers are catalog entries with `isMixer` (catalog.ts:165-179; "Energy drink" has "red bull"/"redbull", Cola has "coke"). In `parseSegment`, `best` is picked from the alcoholic matches only, and `name = entry.name`. The mixer match only marks its tokens used; it is never attached to the item. A mixer survives only when no alcoholic item exists (`mixerOnly` return, and the fallback at the end of `parseWithCatalog`).
- `splitSegments` splits on " and ", so "vodka and red bull" becomes two segments and the mixer-only one is dropped. Only hard-coded "and" aliases like "jim beam and cola" (the `andPhrases` mechanism, parse.ts ~62-65 and ~99-106) keep a pairing, and those are premix RTD cans (catalog.ts:441-449), not a general rule.

Are the standards right? Yes. One 30 ml nip of 40% = 0.95, rounded up to 1.0; the eval case at scripts/drinks.eval.json:203 expects 0.95. The mixer adds no alcohol. What is wrong is display and record: the card and the logged name say "Vodka". Number caveats: a bar often pours a double (60 ml); the 30 ml is flagged `assumed: volume`, and the slider covers it.

## 3. Recommendation

Voice stays as a secondary path. Primary add is the two sliders (standards, how long ago); voice only pre-fills them, always editable, never adds by itself.

Voice design:
- Single shot, final only: `interimResults = false`, `continuous = false`, `maxAlternatives = 3`, `lang` from the region (en-AU for AU), fallback `navigator.language`. Accept only `isFinal` results; try the parser over each alternative and prefer the first with a catalog hit.
- One recogniser ref and a session id. In close() and an unmount effect: null all handlers, then `abort()`. Ignore any result whose session id is stale.
- Visible states: Listening (with a 6 s ring), "Heard: <transcript>" in an editable field, "Try again". If `onend` arrives with no transcript say "Heard nothing", never go silent.
- Result goes to the sliders: set standards to `totalStandards` (rounded up to a tenth, as addResult does), set the time slider if a time was spoken ("an hour ago"), else "now". The user presses the one Add button.
- Distinct errors: `not-allowed` "Microphone blocked for this site"; `service-not-allowed` "Voice isn't available here (iPhone: Settings > Siri and Dictation, and use Safari rather than the home-screen app)"; `network` "Voice needs a connection"; `no-speech` "Didn't hear anything"; `language-not-supported` "Type it instead". Hide the mic where it is known broken (iOS standalone PWA) rather than offering a dead key.
- Never parse interim text. Parse only final speech or typed text (debounce typing about 250 ms).

Parser fixes (parse.ts):
1. Attach the mixer. When `best` is alcoholic and a mixer match is in the same segment, name the item "Vodka & Red Bull" and keep the standards from the spirit alone. Add `mixer?: string` to `ParsedItem`.
2. Do not split on " and " when one side is a mixer: merge a purely-mixer segment into the preceding alcoholic segment ("vodka and red bull", "rum and coke", "gin and tonic", "whisky and dry"). That removes the need for the per-brand "and" alias hack for non-premix drinks.
3. Keep serve words in the display name for generic spirits: "Double gin & tonic", using the user's tokens, with `catalogId` unchanged.
4. Show and store the user's own words (`rawText` already goes to `toDrinkDetails(r, raw)`); the card currently prints only `i.name`.
5. Leave the maths as is (count x serve ml x spirit abv). Label the card "30 ml spirit" so the displayed volume is not read as the whole glass.

Cases to add to scripts/drinks.eval.json (format: text, expected unrounded std, tags, note). The eval harness (scripts/eval-drinks.ts:93) prints names but never asserts them, so add an optional `expectName` check as well:
- "vodka red bull" 0.95, expectName "Vodka & Red Bull" (existing case, add the name)
- "vodka redbull" 0.95; "a vodka red bull" 0.95; "vodka and red bull" 0.95; "red bull vodka" 0.95
- "jager bomb": expected from the catalog's 30 ml Jager at 35% = 0.83 (parser gives 0.9 after rounding up; confirm this case at +-0.2)
- "2 jager bombs" 1.66
- "rum and coke" 0.95, expectName "Rum & Cola"
- "double gin and tonic" 1.89, expectName "Double Gin & Tonic"
- "two schooners of great northern" 2.86
- "glass of red" 1.66 (150 ml at 14%, confirm against the wine convention used elsewhere in the file)
- "vodka cranberry", "bourbon and coke", "jack and coke", each 0.95
- "vodka red bull and a vodka soda" 1.9 (two items)
- Speech-style: "uh vodka red bull please", "vodka, red bull", "vodka and a red bull mate", "can I get a double vodka red bull" (1.89)
- "red bull" as a noDrinks case

Also add vitest cases to src/lib/drinks/parse.test.ts asserting `items[0].name` includes the mixer while `standards` is unchanged, and a check that a late `onresult` after close() does not change `text`.

## Files
- C:\Users\agams\BACulator\src\components\night\AddDock.tsx (speech: 47-62, 103, 105, 109-117, 138-165)
- C:\Users\agams\BACulator\src\lib\drinks\parse.ts (segments and mixers)
- C:\Users\agams\BACulator\src\lib\drinks\catalog.ts (mixers 165-179, Jagerbomb 143, premix RTDs 441-449)
- C:\Users\agams\BACulator\scripts\drinks.eval.json (vodka red bull at 203)
- C:\Users\agams\BACulator\next.config.js:47 (Permissions-Policy, fine)

Line numbers for parse.ts are approximate where marked with "~"; the AddDock and catalog lines were read directly.
