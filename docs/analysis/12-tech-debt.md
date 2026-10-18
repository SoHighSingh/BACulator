# 12 - Code quality and tech debt

Scope: static read of the repo (no installs, no servers). ~17k lines of TS/TSX. Overall the codebase is clean: zero TODO/FIXME/HACK, zero `any`, `@ts-ignore` or `@ts-expect-error` in src/. The debt is concentrated in prototype labs and a few leftover assets.

## Findings

### Dead or nearly dead
- `src/app/dev/directions/*` (446 KB, ~18 lab folders: _kit, assets, chart, clinical, dial, dock, fonts, forecast, glass, logo, logo-gradient, morph, native, notsafe, type, plus layout/page). Nothing outside `src/app/dev` imports from it (grep for "directions" outside is empty). It is gated by `NODE_ENV === "production" -> notFound()` in `layout.tsx`, so it is not served, but it is still compiled by `next build` and typechecked/linted by `npm run check`. The design direction ("Glass") is already chosen and shipped in `src/components/night` and `landing`. Delete all except whatever the team still uses as a reference (suggest keeping only `glass/` and `logo*` until the logo is final, or archive in a git tag and delete everything).
- `public/BACULATROR.png`, `public/BACulatorThumbnail.png`, `public/UserIcon.png`: zero references in src, scripts, configs. Safe to delete (old create-t3 era assets; 1.5 MB total `public/`, most is `media/`). Also verify `public/icons` (10 refs, in use) and `public/media` (used by `AddFlowVideo.tsx`).
- `src/components/BACGraphModal.tsx` (51 lines): NOT dead. Used by `night/NightScreen.tsx` and `dev/night/DevNight.tsx`. It is a thin wrapper, but the name implies "graph modal" while it lives at the top level next to `night/`; move into `components/night/` or `night/chart/` for consistency.
- `src/components/UserInfoSlideOut.tsx`/`UserInfoSlideOutProvider.tsx`/`AlertFavicon.tsx`/`TermsAndDisclaimerDialog.tsx`/`DetailsForm.tsx`: each used by 1-3 files; all live. Mixed layout: 9 top-level components vs `night/`, `landing/`, `ui/` subfolders.
- `src/components/ui/button.tsx` is imported by only 1 file. `@radix-ui/react-slot` and `class-variance-authority` are each referenced in exactly one file (the button). Consider whether the button is worth two deps (low priority; Radix Dialog is used by 2).
- `src/app/dev/night` and `src/app/dev/onboarding`: legitimate harnesses (referenced by `scripts/shoot.mjs`). Keep, but they duplicate gating logic (see below).

### Duplicated / inconsistent patterns
- The `NODE_ENV === "production" -> notFound()` gate is copy-pasted in dev/night, dev/onboarding and dev/directions layout. Replace with a single `src/app/dev/layout.tsx`.
- `src/server/api/routers/post.ts` (298 lines) is the only app router and holds drinks, user info, consent, export and delete-account procedures. The name `post` is a leftover from create-t3-app. Split into `drink`, `user`, `consent` routers (each ~80-100 lines) and rename; touches the client call sites (`api.post.*`).
- `consent.ts`, `outbox.ts`, `region.ts` and hooks `useRegion.tsx`/`useUserInfoData.ts`/`useNight.ts` (300 lines) mix localStorage, react-query persistence and an outbox; worth a single "offline/persistence" doc, not necessarily a refactor.
- Dev labs each re-implement a `Night.tsx` (glass 406, native 387, dial 440 lines) with copied curve helpers; moot if the labs are deleted.

### Oversized files (>300 lines)
`lib/drinks/parse.ts` 549, `lib/drinks/catalog.ts` 479 (data, fine), `lib/bac-calculator.ts` 435 (core, tested), `night/AddDock.tsx` 420, `landing/Landing.tsx` 384, `hooks/useNight.ts` 300. Only AddDock and Landing are candidates for splitting; Landing into section components.

### Dependencies (from package.json, no registry lookup, so verify with `npm outdated`)
- `next-auth ^5.0.0-beta.32` is a prerelease; pin exact and track the Auth.js stable release.
- Version floors are low versus installed-latest in several places (`next ^15.2.3`, `@prisma/client ^6.5.0` vs `@prisma/adapter-d1 ^6.12.0`, `@types/node ^20` while Cloudflare/Node target is newer): keep Prisma client, prisma CLI and adapter on the same minor to avoid mismatches.
- `@t3-oss/env-nextjs ^0.12`, `eslint ^9` + `next lint` (deprecated in Next 15.5+/16; migrate to the ESLint CLI).
- `playwright-core` is a devDependency only used by `scripts/shoot.mjs`; fine.
- `server-only` and `tw-animate-css` are each used once; fine.
- `overrides` for `@node-minify/core` glob and next's postcss: re-check whether still needed after upgrades.
- `package.json` `ct3aMetadata` block is dead metadata.
- No coverage tooling; `vitest` tests exist for lib only (no component or router tests apart from `consent-export.test.ts`).

## Prioritised cleanup list

| # | Item | Files | Effort | Value |
|---|------|-------|--------|-------|
| 1 | Delete unreferenced public images | `public/BACULATROR.png`, `BACulatorThumbnail.png`, `UserIcon.png` | 5 min | small, zero risk |
| 2 | Delete or archive the direction labs (tag the commit first) | `src/app/dev/directions/**` (446 KB) | 30 min incl. build check | large: faster build, check and cognitive load |
| 3 | Single dev gate | new `src/app/dev/layout.tsx`, remove 3 copies | 15 min | small |
| 4 | Rename/split `post` router into drink/user/consent | `src/server/api/routers/post.ts`, `root.ts`, client call sites, test | 2-3 h | medium |
| 5 | Move `BACGraphModal` into `components/night/` and tidy top-level components into folders (`account/`, `legal/`) | `src/components/*.tsx` | 45 min | small |
| 6 | Replace deprecated `next lint` with ESLint CLI; run `npm outdated`, align Prisma 6.x minors, pin next-auth beta | `package.json`, eslint config | 1-2 h | medium (supply-chain and upgrade hygiene) |
| 7 | Split `AddDock.tsx` and `Landing.tsx` | night/AddDock.tsx, landing/Landing.tsx | 2-3 h each | small-medium |
| 8 | Drop `ct3aMetadata`; reassess button.tsx + cva + slot | `package.json`, `ui/button.tsx` | 30 min | small |
| 9 | Add component/router tests for the add-drink flow and outbox | `useNight.ts`, `outbox.ts`, `post.ts` | 1 day | medium-high for regression safety |

Total for items 1-6: roughly one working day.
