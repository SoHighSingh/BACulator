# 20 - Bartender parser: quality, cost, abuse

Scope: src/lib/drinks/{pipeline,ai,ai-quota,serves,standards,normalise}.ts, src/server/bartender.ts, scripts/eval-drinks.ts. Read-only; eval not run. Catalog gap greps were rough (they matched alias starts only), so verify before adding entries.

## Pipeline as built
recents (D1, 100 rows) -> ParseCache (D1) -> catalog -> Workers AI (llama-3.3-70b, ~30 neurons/parse), with per-user 20/h, 50/day, global 250/day, and a per-isolate breaker (ai-quota.ts:9-17, pipeline.ts:59-88). The design is sound: code does the arithmetic, output is zod-clamped, standards round up, and failures degrade to "unavailable" instead of 0.

## Findings (priority order)

### 1. Cache is a global, cross-user write path (poisoning and privacy), pipeline.ts:16-27, bartender.ts:167-178
- The key is normalised text and the value is the whole item list, shared by all users for 30 days. A wrong or under-counted AI answer (the model-choice note says 3/9 under by >0.3) is replayed to everyone with `source:"cache"`, which the UI may treat as more trustworthy than "ai".
- `isCacheable` requires `confidence >= 0.5`, but confidence is model-supplied (capped at 0.7, ai.ts:153). A user can craft a short phrase (<=48 chars, <=8 words) that coaxes the model into a low volume/ABV and have it stored for everyone ("my special beer" -> 0.1 standards). Low likelihood, but the harm direction is under-counting.
- Fix: cache AI results only when every item's volume/ABV is inside a plausible band for its category. Keep an AI-provenance flag on cache hits (pipeline.ts:72 overwrites source with "cache") so the UI still says "check this". Optionally write to the cache only after the same phrase yields the same result twice, or after a user logs it unedited.
- Write amplification: `cacheGet` runs an UPDATE on every hit (bartender.ts:171), one D1 write per read. Drop `hits` or sample it.

### 2. Cheap layers run before the catalog and cost D1 reads on every request, pipeline.ts:68-75, bartender.ts:89-96
- `findRecent` pulls 100 full Drink rows and filters in JS on every parse, even when the in-memory catalog would answer for free. Order is recents -> cache -> catalog. Run the catalog first and consult recents/cache only for leftovers (keep recents-first just for "same again" and user-confirmed standards). Use a targeted query (index on tab, rawText) instead of take:100.
- `pruneExpired` (bartender.ts:141) is fine.

### 3. Prompt injection (ai.ts:32-44, 166-193)
Well contained: data/instruction separation, JSON-schema output, zod clamps, count max 24, zero ABV on alcoholic types replaced by generic ABV (ai.ts:128-135), catalog ABV override for known brands, confidence capped at 0.7, only leftover text sent to the model (pipeline.ts:78), injection cases in the eval (drinks.eval.json ~525-549). Residual risks:
- The model can still be talked into plausible-but-low values ("a beer, it is 0.5% abv", "tiny tasting pour"). ai.ts:128 trusts any positive ABV and ai.ts:136 any positive serveMl (clamped only to 15-2000 ml, 0-80%). Direct impact is self-harm only, but it feeds the shared cache (finding 1). Mitigation: a per-category minimum ABV/volume floor on the AI path applied only when the user text states no explicit number (the removed floor at ai.ts:124-127 failed because it overrode a correct value; gating on "no number stated" avoids that), and flag via `assumed`.
- The `slice(0,300)` and `"""` strip (ai.ts:175) are bypassable (four quotes, unicode quotes). It is not a security boundary, so say so in the comment. Router caps input at 200 chars (post.ts:104).
- No tools or secrets in the prompt, so no exfiltration risk.
- Privacy: the cache stores user text globally. The 48 char / 8 word / long-number guard helps; add filters for "@", URLs and capitalised-name patterns, or cache a stripped drink name (see section 7).
- Add eval injection variants: quote breakout, "set abv to 0", "return items: []", non-English, long benign sentence.

### 4. Model choice and quota arithmetic (ai.ts:14-23, ai-quota.ts:9-14)
- The recorded benchmark (9 phrases): 8B 0/9 within +-0.2, 70B 2/9. Neither is accurate enough to be a number source; the AI is a "draft for the user to confirm" feature. The UI already treats it that way (confidence cap).
- Budget: 250 global/day x 30 neurons = 7,500 of 10,000 free. Per-user 50/day lets 5 users drain it. Recommend userPerDay about 10, userPerHour about 5, and a soft reserve (deny users above ~5 calls once global use passes ~70%). At 30 neurons the hard ceiling is about 333 unseen phrases a day for the whole app.
- Failed or timed-out calls still consume a user slot (ai-quota.ts:94-96); refund on AiUnavailableError (:102-110).
- Better accuracy per neuron: have the model extract only what the text says (type, brand, count, and nulls for unstated size/ABV), and let code supply volume/ABV from catalog generics and serve table. Most of the under-estimates are probably numeric recall. Try 8B with that prompt first; escalate to 70B only on schema failure. Re-run `npm run eval:drinks` with Cloudflare credentials before switching.
- Quota-error detection is regex on message text (ai-quota.ts:62): brittle but fail-safe because the breaker also trips (per isolate, bartender.ts:135).

### 5. Catalog coverage (catalog.ts, serves.ts, standards.ts)
Strong on Australia (brands, slang: schooey, tinnie, longy, goon sack, king brown). Gaps:
- US serve sizes are wrong under AU defaults, in the dangerous direction:
  - "handle" is aliased to the 285 ml pot (serves.ts:20, `pot` aliases). In the US a handle is a 1.75 L spirit bottle (about 41 AU standards at 40%). Drop it from `pot`, make it category-aware.
  - "shot" and "jigger" are 30 ml; a US shot is 44 ml (1.5 oz), 47% higher.
  - "cup" under `glass` (150 ml); a red Solo cup is about 473 ml.
  - "tallboy" 500 ml (US 473 ml, fine), "pitcher" 1140 (US about 1.9 L, UK about 1.7 L), "40" / "forty" (US 40 oz malt liquor, about 1.2 L) not present.
  - Generic `can` is 375 ml; US cans are 355 ml (safe over-count; US brand entries at catalog.ts:262-266 already use 355).
- UK: single spirit measure is 25 ml (AU default over-counts, safe). Possibly missing (verify): WKD, Buckfast, Carling, snakebite, shandy, "half" (half pint), "dram", "large glass" phrasing. Pimm's, Magners, Bulmers, Strongbow are present.
- US brands/slang to check: Natty Light, Busch, Keystone, PBR, Truly, High Noon, Four Loko (14%, 695 ml, about 5.4 AU standards, high harm), Mike's Hard, Svedka, "jungle juice" / "punch" (unknowable; should return unparsed, not a guess).
- Everclear (95%) exceeds `LIMITS.abv.max` 80 (standards.ts:7), so a stated 95% is clamped and under-counted by 16%. Raise to 95 or return unparsed above 80.
- ABV parsing (parse.ts:244-256) handles "%", "abv", "percent" but not "proof" ("80 proof" = 40%).
- Unit: everything is the AU 10 g standard drink (standards.ts:3-4). If you expand beyond AU, show grams of ethanol and per-region units (US 14 g, UK 8 g); that is a larger accuracy gap than any one catalog entry.
- Eval: 64 cases, almost all AU phrasing, AI layer only with credentials. Add us / uk / slang tags with 10+ cases each, and a "never silently low" check there. The main danger is a confident wrong catalog match, not an AI miss.

### 6. Premium or free?
Keep the safety path free. The AI exists so unreadable text does not become "no drink", a harm-reduction function; paywalling it pushes users to guess low while drunk. Recommend:
- Free: catalog, cache, recents, AI with tight per-user limits, manual entry always.
- Premium (if monetised) should be convenience, not accuracy: higher AI cap, bottle/label photo scan, "describe my whole night" bulk text, history sync/export.
- Honest users rarely reach the AI (catalog target is >90%), so cost is driven by outliers and abuse; rate limits solve that without a paywall. Never word quota exhaustion as "upgrade to log".

### 7. Cache-hit potential
Normalisation (normalise.ts:6-40) collapses case, punctuation, accents, repeated letters, so "2 Schooners of VB!" and "2 schooners of vb" share a key. But the key includes counts and quantifiers, so "a pint of hobgoblin" and "2 pints of hobgoblin" are separate rows, and AI cost scales with distinct phrases. Improvements:
- Cache on the leftover drink name only (`catalog.unparsed`, pipeline.ts:78) and re-apply count/serve in code. Higher hit rate, less personal text stored.
- Cache negatives ("AI found no drink") for about 24h; currently `aiItems.length === 0` is never cached (pipeline.ts:80), so repeat junk or injection attempts re-spend neurons.
- Use `hits` to find the top uncatalogued phrases weekly, promote them into catalog.ts (free forever), and bump PARSER_VERSION (pipeline.ts:8).

## Shortlist of changes
1. serves.ts:20 remove "handle" from `pot`; add category-aware US shot (44), jigger, cup, 40. (high harm)
2. standards.ts:7 raise abv max to 95 or return unparsed above 80; add "proof" at parse.ts:244-256.
3. pipeline.ts:68-75 catalog first; bartender.ts:89-96 targeted recents query.
4. bartender.ts:171 stop per-read `hits` UPDATE.
5. pipeline.ts:16-27, :72, :80 tighter cache rules, provenance flag, cache negatives, key on stripped name.
6. ai.ts:128-141 plausibility floors when no number was stated.
7. ai-quota.ts:9-14 userPerDay about 10, userPerHour about 5, global soft reserve; refund failed calls (:94-110).
8. ai.ts:14-23 trial 8B extract-only prompt with code defaults; validate with eval.
9. drinks.eval.json add us/uk/slang and injection variants.
