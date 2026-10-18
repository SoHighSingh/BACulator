# 11 · SEO and public pages (reconstructed from the analyst's hand-back; the original file was not saved)

- **P0:** `src/app/page.tsx` is `"use client"` and renders an empty `<main aria-busy>` while `useSession()` loads, so the server-rendered HTML has no h1, FAQ or Widmark content. Server-render the marketing content, with client islands for the session-dependent UI.
- **P0:** there is no public calculator without sign-in. Ship a local-only (localStorage) calculator at `/` and embed it on the evergreen pages.
- **P1 metadata and schema:**
  - add noindex or disallow for `/dev/*` and `/account/*`
  - add a title template and real sitemap `lastModified` dates; drop priority and changeFrequency
  - change JSON-LD `HealthApplication` to Utilities/Lifestyle and add `isAccessibleForFree`
  - add FAQPage, Organization and WebSite
  - avoid MedicalWebPage, Review and any "safe to drive" claim
- **P2:** per-page ImageResponse OG images. `public/BACULATROR.png` and `BACulatorThumbnail.png` are orphaned. The footer has no internal links to deeper pages.
- **Pages:**
  - Tier 1: `/how-long-until-sober`, `/standard-drinks`, `/how-bac-is-calculated`.
  - Tier 2: `/standard-drinks/{australia,united-states,united-kingdom,canada,new-zealand,ireland}`, drink-type pages, `/legal-limits`, `/help-someone-drunk`.
  - Drive pages, metadata and the sitemap from one typed content list, with figures from `REGIONS` so they can't drift.
  - Create a country page only when it has unique content.
- **Paywall:** keep every calculator and evergreen page free and server-rendered. Gate only account-bound features under `/account` or app routes. No interstitials, no cloaking, no paywall structured data.
- **Health copy:** always say "estimate", cite NHMRC/NIAAA/NHS/CDC, show review dates, and never say "safe to drive", including in metadata and schema.
