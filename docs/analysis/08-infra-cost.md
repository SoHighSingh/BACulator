# 08 - Infrastructure running-cost model

Date of analysis: 18 Oct 2026. Pricing is Cloudflare's published pricing as I know it; I could not re-verify it live, so check dash.cloudflare.com/billing and developers.cloudflare.com/workers/platform/pricing before relying on it. All usage figures are estimates from reading the code, not measurements.

## 1. What the code does (facts from the repo)

- `wrangler.jsonc`: one Worker (OpenNext), static assets binding (static assets are free and unmetered), D1 `DB`, Workers AI `AI` (remote).
- `src/lib/drinks/ai.ts`: model `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, about 30 neurons per parse (8B variant was ~3 neurons but failed accuracy evals).
- `src/lib/drinks/ai-quota.ts`: AI is the last resort in the parse pipeline. Limits: 20/user/hour, 50/user/day, **250/day globally** (about 7,500 neurons, sized for the free 10,000 neurons/day). Each AI attempt does 3 D1 upserts (hour, day, global counters).
- `src/server/bartender.ts` `analyseDrinkText` per drink typed: catalog+serve index (cached per isolate for 10 min; refresh reads the whole DrinkCatalog + ServeSize tables, assume about 600 rows), `findRecent` (reads up to 100 Drink rows), `cacheGet` (1 read + 1 write for the hits counter), `cachePut` on a miss (1 upsert), hourly prune (2 deleteMany). "Same again" does `findLastDrink` (1 read).
- `src/server/api/routers/post.ts` (only router): every protectedProcedure calls `auth()` (session+user lookup, about 2 row reads). Procedures: analyseDrink, addDrink, updateDrink, deleteDrink, getNight, recentDrinks, userInfo, consentStatus, etc. Tab cleanup keeps the last 5 tabs per user, so storage per user is bounded.

## 2. Per active user per night (assumptions)

Assumptions: 6 drinks/night; about 40 Worker invocations per night (page loads, batched tRPC calls, getNight refetches, auth); 15% of drinks fall through catalog, recent and cache to the AI (about 0.9 AI calls/night); 8 ms CPU per request.

| Item | Per night |
|---|---|
| Worker requests | about 40 |
| CPU time | about 320 ms |
| D1 rows read | about 1,500 (auth about 80, 6 x about 110 for analyse, catalog refreshes, getNight reads) |
| D1 rows written | about 25 (6 drink inserts, about 6 cache writes/hit counters, about 3 per AI call, misc) |
| Workers AI neurons | about 27 (0.9 calls x 30) |

A MAU is assumed to go out 4 nights/month, so nights/month = 4 x MAU. Peak day (Saturday) is assumed to be about 12% of the month's nights.

## 3. Monthly usage

| MAU | Nights/mo | Requests | CPU ms | D1 reads | D1 writes | AI neurons |
|---|---|---|---|---|---|---|
| 1k | 4k | 0.16M | 1.3M | 6M | 0.1M | 0.11M |
| 10k | 40k | 1.6M | 12.8M | 60M | 1M | 1.1M |
| 100k | 400k | 16M | 128M | 600M | 10M | 10.8M |

Peak-day load (12% of nights): 1k MAU = 19k requests, 0.7M reads; 10k = 192k requests, 7.2M reads; 100k = 1.9M requests, 72M reads.

## 4. Pricing assumed (Oct 2026)

- **Workers Free**: 100k requests/day, 10 ms CPU per request, D1 free: 5M rows read/day, 100k rows written/day, 5 GB; Workers AI 10,000 neurons/day. Over the limit requests fail until the UTC reset. Compressed Worker size limit 3 MB.
- **Workers Paid, $5/mo**: 10M requests/mo then $0.30/M; 30M CPU ms/mo then $0.02/M ms; D1 25B reads/mo then $0.001/M, 50M writes/mo then $1.00/M, 5 GB then $0.75/GB-mo; Worker size 10 MB. Workers AI is $0.011 per 1,000 neurons, with the same 10,000 neurons/day free allocation on both plans.
- Domain about $10/yr (about $1/mo), not included below. Email/auth provider costs unknown (not read), not included.

## 5. Monthly cost

### Workers Free
| MAU | Verdict |
|---|---|
| 1k | **$0**, with caveats: peak-day AI demand (about 430 calls) exceeds the 250/day global cap, so AI falls back to manual entry at peaks; and check the 3 MB Worker size limit (Next + Prisma + OpenNext bundles often exceed it; if so Free is not possible at any scale). |
| 10k | Not viable. Peak day about 192k requests (limit 100k) and about 7.2M reads (limit 5M). |
| 100k | Not viable (about 19x over on requests, about 14x over on reads). |

### Workers Paid ($5 base)
| MAU | Requests | CPU | D1 | AI | **Total** |
|---|---|---|---|---|---|
| 1k | $0 | $0 | $0 | $0 (within free 300k/mo) | **about $5** |
| 10k | $0 | $0 | $0 | about $8.6 (0.8M over free) | **about $14** |
| 100k | $1.80 (6M over) | $1.96 (98M ms over) | $0 | about $115 (10.5M over) | **about $124** |

Notes: D1 stays far inside included quotas even at 100k MAU (600M of 25B reads, 10M of 50M writes). Storage is bounded (last 5 tabs per user, 30-day parse cache): about 200 MB at 100k users, so $0. AI is about 93% of the 100k bill. The parse cache is keyed on normalised text and is shared across users, so repeat phrases stop hitting the AI as it warms; a 50% reduction would put 100k at about $66. The 250/day global AI cap must be raised (or made plan-aware) once off the free allocation, otherwise AI silently stops at about 930 nights/day.

Stress case (no cache, every drink goes to the AI, 180 neurons/night): 100k MAU is about 72M neurons = about $790/mo. Single abusive user at the 50/day cap: 1,500 neurons = $0.017/day.

## 6. Break-even price per paying user per month (infrastructure only)

Formula: total cost / (MAU x conversion). Excludes payment fees.

| MAU (cost) | 1% convert | 2% | 5% |
|---|---|---|---|
| 1k ($5) | $0.50 | $0.25 | $0.10 |
| 10k ($14) | $0.14 | $0.07 | $0.03 |
| 100k ($124) | $0.12 | $0.06 | $0.025 |
| 100k stress ($790) | $0.79 | $0.40 | $0.16 |

Infra cost per MAU: about $0.005 (1k), $0.0014 (10k), $0.0012 (100k).

## 7. Takeaways

1. Infrastructure is negligible against any realistic price. A $1/mo or $2.99 one-off covers hosting at every scale and conversion rate above, even the AI stress case. Pricing should be driven by willingness to pay and by fees, not hosting.
2. Fees dominate: Stripe is about 2.9% + $0.30 (so a $1 charge nets about $0.67), Apple/Google take 15% (small business program) to 30%. A sub-$1 monthly price is fee-bound, not infra-bound; prefer annual or one-time pricing.
3. The only real cost lever is Workers AI. Keep the parse cache effective, keep the 70B model as the last resort, and make `globalPerDay` scale with plan (for example a paid-only larger cap).
4. Upgrade to Workers Paid ($5) well before 5k MAU or the first viral weekend; the Free plan's daily request and D1 read limits fail hard on peak nights, which is exactly when users are drunk and logging.
5. Verify the Worker bundle size against the 3 MB Free limit before assuming Free works even at 1k MAU.
6. Biggest uncertainty: nights per MAU (4), requests per night (40), AI hit rate (15%). Measure with Workers analytics and the `onLimited`/AI logs, then rerun this model.
