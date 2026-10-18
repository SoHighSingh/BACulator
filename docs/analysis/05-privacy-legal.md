# 05 - Privacy and legal readiness (before charging money)

Not legal advice. This is an engineering read of the repo as of 18 Oct 2026 (branch cloudflare-d1-migration), written to brief a lawyer. Sources: PRODUCT.md, HANDOFF.md, `src/app/(legal)/{privacy,terms}/page.tsx`, `contact.ts`, `src/lib/consent.ts`, `TermsAndDisclaimerDialog.tsx`, `migrations/0007_consent.sql`, `routers/post.ts`. I did not read /account/delete, and I ran nothing.

## What exists (good)
- Consent step before Google sign-in ("Before you start"). It covers estimate-only, never-for-driving, what we store, an age checkbox (18+, 21+ in the US region) and a Terms link. Consent is recorded server-side (`User.ageConfirmedAt`, `User.termsVersion`), versioned via `TERMS_VERSION`, with re-consent when the version changes. Pending consent expires after 24h.
- The privacy policy is strong for a solo draft. It treats the data as sensitive/health information, cites APP 3/8/11/12/13, discloses overseas storage (US), has a retention list, discloses the AI fallback (Workers AI, 30-day phrase cache), lists cookies (no analytics/ads), includes a Washington MHMDA / Nevada SB 370 section with rights and appeals, gives the OAIC complaint path, and has an age section.
- Self-serve delete (/account/delete) and "Download my data" (`exportMyData`, tested). Google OAuth tokens are no longer stored (migration 0005).
- Terms: entertainment/estimate only, "never use to decide whether to drive", no warranty, ACL carve-out, emergency numbers. The PRODUCT.md non-negotiables (no fit-to-drive cues) are strong liability mitigation.
- Retention is short: the 5 most recent sessions are kept and older ones auto-delete.

## Gaps and risks (by priority)

### P0 - fix before taking money
1. **No paid-tier terms exist.** Terms say nothing on price, billing, renewal, cancellation, refunds, trials, price changes, merchant identity or payment processor (Stripe etc.). Needed for Australian Consumer Law (ACL) and, in the US, auto-renewal laws (California ARL and similar; FTC click-to-cancel direction).
2. **ACL guarantees cannot be excluded.** Terms already say so, but the "as is, not liable" paragraph could mislead paying consumers (misleading-conduct risk; the unfair-contract-terms regime now carries penalties for standard-form consumer contracts). Add a plain statement of non-excludable guarantees for paid features. Limit liability only where the law allows (get lawyer wording). "We may change, suspend or stop BACulator at any time" will draw unfair-term scrutiny for paid users: add notice and a pro-rata refund.
3. **Refund and cancellation path.** Cancel in-app in two taps from the account screen, no dark patterns (fits the harm-reduction stance), pro-rata refund if the service is withdrawn, optionally a 7-day no-questions refund on first purchase (not legally required in AU, but a cheap trust signal).
4. **Contact address is a personal Gmail**, shown publicly (already flagged in `contact.ts`). Use a role address (privacy@ / support@ via Cloudflare Email Routing). Also identify the actual business entity or ABN; the policy says only "run by one person", but invoices, GST and ACL need a named trader.
5. **Is the Privacy Act binding yet?** The small-business exemption (turnover under AU$3m) normally excludes the business from the APPs, but not an entity that provides a health service or trades in personal information, and reforms may narrow it. Voluntary compliance (as drafted) is wise; avoid saying "the Privacy Act requires us" if it may not apply. Ask a lawyer whether to opt in. Also note the statutory privacy tort (in force 2025) and that the notifiable data breaches scheme applies only to APP entities.
6. **Paid-terms acceptance is not captured.** Re-consent on `TERMS_VERSION` exists. At checkout, show and record the paid-terms version and the price shown, alongside the subscription record.

### P1 - launch quality
7. **GDPR/UK GDPR is not addressed**, though the audience is "global". Drink log plus weight and sex is arguably Art 9 special-category data and needs explicit consent. Today "By continuing you agree to the Terms" bundles consent, and the only explicit tick is the age box. Missing: lawful basis statement, controller identity and whether an EU/UK representative is needed (Art 27), transfer mechanism (name the Data Privacy Framework / SCCs for Cloudflare and Google), full rights list (access, rectification, erasure, restriction, portability, objection, complaint to a supervisory authority), DPIA consideration, and a statement that only strictly-necessary cookies are used (no banner needed). Cheapest route: a short "If you live in the EU/UK" section plus a genuine separate explicit-consent tick, or limit marketing to AU/US.
8. **Washington MHMDA specifics.** The section is a good start, but MHMDA also expects a standalone Consumer Health Data Privacy Policy with a prominent link (safest: a footer link labelled "Consumer Health Data Privacy Policy" pointing at `/privacy#consumer-health`), separate freely-given consent for collection, a distinct valid authorization for any sale (state plainly that we do not sell), and a named list of third parties (done: Cloudflare, Google). It has a private right of action via the WA Consumer Protection Act, making it the highest litigation risk in this set. Nevada SB 370 is similar, and Connecticut and others have health-data consent provisions. Add CCPA/CPRA notice-at-collection and "limit use of sensitive personal information" wording. No ad cookies means honouring Global Privacy Control is trivial.
9. **Processor terms.** Record that Cloudflare's standard DPA applies to D1 and Workers AI, and verify and cite that Workers AI does not train on customer data. Add the billing processor (Stripe etc.) to "Who else handles it" before launch.
10. **Retention gaps.** The 5-session rule is good, but (a) D1 point-in-time restore keeps deleted data for a period, so say "removed from backups within about 30 days" after verifying; (b) account details stay "until you delete", so add inactive-account deletion (e.g. 24 months, with a warning email); (c) billing records must be kept for tax (AU: 5 years), so state that this is the one thing deletion cannot remove, and keep it in a table separate from drink data.
11. **Export format.** Confirm `exportMyData` produces a downloadable machine-readable file (JSON and ideally CSV) for GDPR portability, and includes consent history. Add "download before you delete" on the delete screen.
12. **Age gate is self-declaration only.** Standard for this class of product. Consider: a path for users who do not confirm (anonymous calculator, nothing stored), a reporting route for underage accounts (email), and monitor AU age-assurance rules. COPPA (under 13) is not a concern.
13. **On-device storage is under-disclosed.** The policy mentions region and consent keys only. The IndexedDB outbox and the localStorage cache of tonight's queries (`offline-cache.ts`) hold drink data on the phone. Disclose them, and make sure sign-out and account deletion clear them. The planned anonymous calculator should store nothing server-side, and say where its state lives.
14. **Breach runbook.** The policy promises notification. Write a one-page plan: AU assessment within 30 days, GDPR 72 hours to the regulator, US state laws vary.

### P2 - polish and defensibility
15. **Disclaimers on the product surface.** "Estimate only" and "Not safe to drive" are in place. Add an always-reachable "About this estimate" (model, error range, BAC can keep rising after the last drink). Terms could add: not for use with medication, pregnancy or liver conditions; not for any legal or medical purpose; not a substitute for a breathalyser.
16. **Harm-reduction line.** Never add an in-app "OK to drive at X". Consider a footer help line per region (verify numbers before publishing).
17. **Marketing claims.** Avoid "accurate", "know when you are sober", "safe" (ACL misleading conduct; FTC). Keep "estimate".
18. **Terms hygiene.** Add governing law and courts (with a carve-out for mandatory local consumer rights), terms-change-with-notice, severability, acceptable use and suspension, IP licence, complaints contact. Archive old policy texts so you can show what each user agreed to.
19. **App stores (if packaged).** Apple needs a privacy policy URL, nutrition labels and in-app account deletion (already satisfied), and is wary of alcohol-promotion apps, so position as harm reduction. Google Play needs a Data safety form.
20. **Operational items from HANDOFF.** `.env` and `.env.local` still exist with secrets to rotate. Publish the Google OAuth consent screen (needs a privacy policy URL on your own domain; we only use basic profile scopes). Migrations 0004-0007 are not applied remotely, and without 0007 the consent columns do not exist, so consent saving fails.

## Recommended wording (drafts for a lawyer to adjust)

**Separate explicit health-data consent** (record as its own timestamp and version, apart from age and Terms):
> "BACulator stores your drinks, weight and sex so it can estimate your blood alcohol. This is health information. We never sell it or use it for ads. You can download or delete it any time. [ ] I agree."

**Paid plans section for Terms:**
> "Paid plans. Prices are shown in your currency and include GST where it applies. Your plan renews each [month/year] until you cancel in Account > Plan; cancelling takes effect at the end of the period you have paid for. We email you [7] days before a yearly renewal. If we stop providing a paid feature, we refund the unused part. Our services come with guarantees that cannot be excluded under the Australian Consumer Law, and other consumer laws where you live. We do not change the price during a period you have already paid for."

**Disclaimer (keep, tighten):**
> "BACulator is an estimate, not a measurement. It can be wrong in either direction, and your real blood alcohol may be higher. It is not medical, legal or safety advice. Never use it to decide whether you can drive, ride, swim, supervise children or operate machinery. If you have been drinking, do not drive."

## Features to build
- Export as downloadable JSON and CSV; "download then delete" in one flow.
- Inactive-account auto-deletion with a warning email.
- Consent ledger (timestamp, text version, region, consent type); add `healthConsentAt` and `paidTermsVersion`.
- Billing customer id in a table separable from drink data.
- Footer on every public page: Privacy, Terms, Consumer Health Data Privacy Policy, Contact, Delete my data.
- Data map doc (what, where, why, retention, processor); the privacy page's retention list is most of it.
- Regression tests: deletion cascades to Drink/Tab/AiUsage; no new storage of health data outside documented tables.

## Questions for a lawyer
1. Is the APP small-business exemption available given health-information handling, and should we opt in?
2. Does a US-resident paid subscription trigger auto-renewal disclosures, sales tax or licensing we must build for first?
3. Liability-limit wording for paid services under ACL: is "as is" safe?
4. Do we need an EU/UK representative if we do not target those markets?
5. App store category and alcohol-content rules.
