# 07 Performance analysis (read-only review)

Scope: client bundle, night-screen render cost, Worker size and cold start, D1 patterns, caching. Nothing was built or measured; figures come from reading code.

## Findings, highest priority first

### P1. Home page is one client component; landing and night code ship together
`src/app/page.tsx:1` is `"use client"` and statically imports `Landing`, `NightScreen`, `Onboarding`, `TermsAndDisclaimerDialog` (lines 6-9). A signed-out visitor downloads the whole night screen (sheets, chart, add flow, tRPC and react-query persist), and a signed-in user downloads the landing page. `useSession()` (line 38) also makes first paint wait on `/api/auth/session` (a Worker plus D1 round trip), which gates landing LCP.
Fix: split with `next/dynamic` (`NightScreen` only when `authenticated`, `Landing` only when not), or make the landing a server component and move the app to its own route. Lazy-load `AddSheet`, `EditDrinkSheet`, `GetHome`, `BACGraphModal` (opened on demand; `Sheet.tsx` and radix dialog come with them). Biggest bundle win.

### P2. Night screen simulates 3 times per tick, and the "fine" run is a duplicate
The clock ticks every 30 s plus on `visibilitychange` (`src/components/night/NightScreen.tsx:20-32`), creating a new `Date`, so every memo keyed on `now` invalidates (twice a minute with identical minute-level output).
- `describeNight` (`src/lib/estimate-display.ts:125-127`) calls `calculateBAC` and `simulateNight`.
- `TimelineCard.tsx:48-51` calls `simulateNight(..., 1)` again over the same drinks.
- `simulateNight` (`src/lib/bac-calculator.ts:408-436`) always simulates at `CONFIG.STEP_MINUTES = 1` (line 9) and only subsamples by `every`. The "5-minute" and "1-minute" runs cost the same, so the fine run in TimelineCard is pure duplication.
- Cost is O(minutes x drinks): `simulateTimeline` (lines 93-107) calls `stepBAC` per minute over all drinks. A 48 h window with about 8 drinks is roughly 3000 steps x 8, around 1-2 ms. Not a real bottleneck today; the waste is structural. It only matters on low-end phones or with many drinks.
Fixes: (a) have `describeNight` return one 1-minute `NightSimulation` and pass it to `TimelineCard`; drop the `drinks/weight/sex` props (`TimelineCard.tsx:40-42`). (b) cache the timeline by drinks identity, weight, sex, and extend it per tick rather than restarting from the first drink. (c) floor `now` to the minute in `useMinuteClock` (the name says minute, the interval is 30 s) so memos are stable.

### P3. InstrumentChart: paths rebuild per tick; scrubbing re-renders the whole card
`src/components/night/chart/InstrumentChart.tsx:72,79` memoise `win` and `paths` on `[simulation, now]`. Rebuilding every 30 s with at most a few hundred points is cheap. Scrubbing calls `setPicked` on every pointer move (`TimelineCard.tsx:47,88`), re-rendering the whole `TimelineCard` including the sr-only paragraph. `onPick` is a fresh inline function each render (line 88), which would defeat any `React.memo` on the chart.
Fix: wrap `InstrumentChart` in `React.memo`, give `onPick` a `useCallback`, throttle via `requestAnimationFrame`, or move the header readout into a small child that owns the picked state.

### P4. Landing media
- `public/media/add-flow-loop.mp4` is 404 KB with `preload="metadata"` (`src/components/landing/AddFlowVideo.tsx:48-55`): fine.
- `public/media/add-flow-loop-poster.png` is 616 KB and likely the LCP element. Convert to WebP or AVIF at display size (about 60-90 KB). `<video poster>` is not optimised by `next/image`, so convert the file itself.
- `public/BACulatorThumbnail.png` (384 KB, OG image): fine for social, but keep it out of the service worker precache.

### P5. Cloudflare Worker size and cold start
- Limits: Worker script size is 3 MB compressed on Free and 10 MB compressed on Paid; startup CPU limit is 1 s on both. OpenNext + Next 15 + Prisma client and D1 adapter + next-auth v5 + tRPC + zod + superjson commonly lands in the low-to-mid single-digit MB gzipped, so the Free plan is a real risk. Nothing in `wrangler.jsonc` records the plan or size. Action: run `opennextjs-cloudflare build` then `wrangler deploy --dry-run` once and record the `.open-next/worker.js` gzip size; note the plan in docs. Prisma and NextAuth module-scope init counts toward the 1 s startup limit.
- `src/server/db.ts:19-27` creates `PrismaClient` lazily per binding: good for cold start. The `db` Proxy (lines 33-39) re-binds every function on each property access; negligible.
- Workers AI is only touched on the last-resort path (`bartender.ts` `getAi`): correct.
- If size or cold start proves a problem, the first lever is lazy `import()` of rarely used server code (AI parsing), not replacing Prisma.

### P6. Service worker precache
`src/app/sw.ts:14,31` precaches every build file from `__SW_MANIFEST`. A first visit downloads night-screen and landing chunks plus the poster in the background. Fix: exclude `/media/*`, the OG thumbnail and any `/dev/**` chunks via the `@serwist/next` `exclude` option. The `src/app/dev/**` routes (`directions/forecast/FanChart.tsx`, `directions/native/Night.tsx`, `directions/chart/Lab.tsx`, `dev/night/DevNight.tsx`) are demo code; gate them with `notFound()` in production so they leave the build.

### P7. D1 query patterns
- `cleanupOldTabs` (`src/server/api/routers/post.ts:21-45`): reads all tab ids, then two deletes. Use `skip: 5` in the `findMany` so only the surplus is read, and run both deletes in one `$transaction([...])` array (as at line 111). Check it is not called on every add.
- Open-tab handling (`post.ts:73-80`) takes up to 3 round trips on the conflict path; rare, leave.
- Missing index: `getNight` (`post.ts:273-278`), `recentDrinks` (line 281), `findLastDrink` (`bartender.ts:69`) and `findRecent` (`bartender.ts:90`) all filter `tab: { userId }` and order by `finishedAt`, but Drink only has `@@index([tabId])` (`prisma/schema.prisma:96`). Add `@@index([finishedAt])` at minimum, or denormalise `userId` onto Drink with `@@index([userId, finishedAt])` (needs a migration in `migrations/`). D1 bills rows read, so this also saves cost.
- `findRecent` (`bartender.ts:90-95`) reads 100 full rows with no `select` and filters in JS. Add `select` of used columns; better, store a normalised text column with an index and look it up directly.
- Run `findLastDrink` and `findRecent` in parallel where both are needed.
- `parseCache.update({ hits: { increment: 1 } })` (`bartender.ts:171`) writes on every cache hit; make it fire-and-forget through `ctx.waitUntil` or drop the counter.
- `pruneExpired` (`bartender.ts:140-148`) deletes on a request path (hourly per isolate); move to a Cron Trigger so request latency stays flat.
- The catalog is cached per isolate with a TTL (`bartender.ts:15-28`): good.

### P8. Caching
- tRPC reads go through react-query persisted to localStorage: good for offline. Confirm `staleTime` is set; the default of 0 refetches on every focus, duplicating the `visibilitychange` tick.
- `src/server/auth/index.ts:8` only caches `auth` per request. Prefer JWT sessions so each session check does not hit D1; the SW already uses NetworkFirst for it (`sw.ts:39`).
- `layout.tsx` renders dynamically (comment near line 69), so every page view costs Worker CPU. A static server-component landing (see P1) can be served from assets. `open-next.config.ts` is `defineCloudflareConfig()` with no incremental cache; add R2/KV cache only if ISR is adopted.
- No `public/_headers` file exists. Add long `Cache-Control` for `/media/*` and `/icons/*` (files are unhashed, so use about one week rather than immutable).

### P9. Lucide and radix: low priority
About 17 named lucide icons across 15 components, and only `@radix-ui/react-dialog` and `react-slot`: both small. Worth checking with `@next/bundle-analyzer` (not installed): `next-auth/react`, `@trpc/react-query` + `superjson` + the persist client (likely the largest client dependencies), and whether `zod` is pulled into the client via shared `src/lib` modules.

## Suggested order
1. Split Landing vs NightScreen, lazy-load sheets and modal (P1).
2. Measure the Worker gzip size against the plan limit (P5).
3. Add the Drink index and trim `findRecent` (P7).
4. One simulation per tick, minute-stable `now`, memoise chart and throttle scrubbing (P2, P3).
5. Poster to WebP, SW precache excludes, gate `/dev` routes (P4, P6).
6. `_headers`, JWT sessions, static landing (P8).
