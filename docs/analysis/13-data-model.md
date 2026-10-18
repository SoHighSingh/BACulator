# 13 - Data model and migrations (read-only review)

Scope: prisma/schema.prisma vs migrations/0001-0007, hot queries in src/server (api/routers/post.ts, bartender.ts), D1 backup, paywall schema.

## 1. Schema vs migration drift

Replaying 0001-0007 in order yields the Prisma schema. Verified: Drink gets name/volumeMl/abv/count/source/confidence/rawText (0002) and clientId (0006); User gets ageConfirmedAt/termsVersion (0007); AiUsage + ParseCache_createdAt_idx (0004); DrinkCatalog/ServeSize/ParseCache (0002); catalog seed (0003). No missing columns found.

- Intended, undeclared drift: the partial unique index `Tab_one_open_per_user` (0006) cannot be expressed in Prisma. A future `prisma migrate diff` will want to drop it, and `db:migrations:sql` (diff from empty) will not emit it. Never regenerate migrations from the schema; hand-write SQL.
- Stale comment: schema.prisma says the index is in `0004_offline_adds.sql`; the file is now `0006_offline_adds.sql`. Fix the comment.
- ParseCache.updatedAt is `@updatedAt` (client-side in Prisma); the SQL column has no default, so raw-SQL inserts must supply it.
- Date formats: SQL defaults (CURRENT_TIMESTAMP text "YYYY-MM-DD HH:MM:SS") vs values Prisma writes (ISO or epoch). Mixed formats in one column can break range comparisons and ordering (createdAt cutoffs, orderBy). 0006 deliberately reuses createdAt for this reason; keep raw SQL away from writing dates.
- VerificationToken has no @id (only unique indexes). Works, harmless.

## 2. Migration-order risks before go-live (0004-0007 not applied remotely)

Apply order is lexical; wrangler records names in d1_migrations. Renumbering is safe only because nothing was applied remotely. Verify first with `wrangler d1 migrations list baculator --remote` (expect 0001-0003 only). If any old-numbered name was ever applied to any DB (preview/staging), the renumbered files will re-run and fail, since ADD COLUMN has no IF NOT EXISTS.

- 0004_ai_limits: safe. Includes a data change (`DELETE FROM ParseCache WHERE length(key) > 48`).
- 0005_drop_oauth_tokens: unconditional UPDATE of every Account row; irreversible by design. Deploy with or after the code that stops storing tokens, else the next sign-in re-saves them.
- 0006_offline_adds: highest risk. ADD COLUMN, unique index, dedupe UPDATE, then partial unique index in one file. If the later index fails, the file aborts after the column was added, and a retry fails with "duplicate column name: clientId" (D1 does not guarantee DDL rollback). Mitigation: split into two files (column + clientId index; dedupe + partial index), and rehearse on a production export. The dedupe also silently rewrites history (extra open tabs get finishedAt = createdAt, which can be earlier than their drinks); check that nightDrinksWhere keys on Drink.finishedAt, not Tab.finishedAt.
- 0007_consent: two nullable columns, safe. But code that selects ageConfirmedAt/termsVersion deployed before it would 500 the session lookup for everyone.
- General rule: migrate remote FIRST, deploy code SECOND. Old code runs fine on the new schema; new code on the old schema breaks (unknown columns, missing unique index race handling).
- D1 enforces foreign keys, so cascades work. Any future table rebuild (SQLite cannot drop/alter constraints) must follow D1's defer_foreign_keys guidance.
- Checklist: Time Travel bookmark and `d1 export`; rehearse on a local import of the export; apply remote; deploy; smoke test sign-in, offline replay, delete account.

## 3. Indexes vs hot queries

| Query | Index today | Verdict |
|---|---|---|
| Tabs by userId ordered createdAt desc (cleanupOldTabs) | only partial unique Tab(userId) WHERE finishedAt IS NULL | No general userId index. Add Tab(userId, createdAt). SQLite does not auto-index FKs. |
| Open tab findFirst {userId, finishedAt null} | partial unique | good |
| Drink by tabId | Drink_tabId_idx | good |
| Drink by clientId | unique | good |
| Night window: drinks where tab.userId, finishedAt in last 48h, order finishedAt | tabId only | OK now (5-tab retention bounds it); Drink(tabId, finishedAt) better |
| Recents / last drink (bartender.ts ~69, ~90): tab.userId, rawText not null, order finishedAt desc | none on finishedAt | bounded by retention; same composite index helps |
| Session/Account by userId (deleteMany, cascades) | none | add Session(userId), Account(userId) |
| ParseCache prune by createdAt, AiUsage prune by expiresAt | indexed | good |
| User by email | unique | good |
| DrinkCatalog/ServeSize findMany all rows | n/a | fine if cached in memory; confirm TTL |

Check the two prune deleteMany calls (bartender.ts:146-147) are throttled, not run every request (D1 bills rows read/written). ParseCache `hits` increment writes on every cache hit; consider sampling.

## 4. Table notes

- User: no createdAt or plan field. Consent is only the last version/time, no history. For a health-adjacent app, an append-only Consent table (userId, termsVersion, acceptedAt) is better evidence. `sex` is a free string validated only by zod.
- Tab: 5-tab retention silently drops older nights; say so in the privacy policy and export.
- Drink: `clientId @unique` is global, not per user. A client could pre-claim another user's clientId and make the victim's replay fail (post.ts ~89-91 checks ownership, which is right, but the add is still rejected). Use per-user scope (needs userId on Drink or unique on tab+clientId) or server-verified uuids. Drink has no userId, so ownership is always via a Tab join.
- ParseCache: shared, anonymous, 30-day TTL, good for privacy.
- AiUsage: increments must be atomic (upsert with count+1) or quotas race. Keys embed userId.

## 5. Account deletion / cascade

deleteAccount (post.ts ~107-119) deletes Drink, Tab, Session, Account, User child-first in one $transaction batch. Good; it does not depend on cascade (which also works, since D1 enforces FKs and the schema has onDelete: Cascade on Account/Session/Tab/Drink).
Gaps:
1. AiUsage rows keyed with the userId are not deleted (they expire within a day, but contain the id). Delete `key LIKE 'ai:u:' || userId || ':%'`.
2. VerificationToken rows for the user's email (identifier) are not deleted.
3. Future billing rows must join this transaction, and the payment-provider customer must be deleted or anonymised via API.
4. D1 Time Travel keeps deleted data recoverable for up to 30 days; state this retention in the privacy policy. After any restore, re-apply deletions from a deletion log (userId + date only).
5. Add a test asserting zero rows remain in every table after deleteAccount (only consent-export.test.ts exists).

## 6. Backup / restore on D1

- Time Travel: point-in-time restore to any minute in the last 30 days (7 days on the Free plan). `wrangler d1 time-travel info|restore baculator --timestamp=...`. It overwrites in place; note the pre-restore bookmark so the restore is undoable.
- Manual: `wrangler d1 export baculator --remote --output=backup.sql` (can block writes on large DBs; skip AiUsage/ParseCache if wanted).
- Recommend: nightly export via cron Worker or CI to private, encrypted R2 (contains emails, Google ids, drinking history), retention matching the privacy policy, and a documented restore drill into a scratch D1 database.
- Migrations are forward-only. Rollback = Time Travel to the bookmark recorded before the migration. Put the bookmark in the release checklist.

## 7. Paywall schema (proposed 0008_billing.sql, additive only)

Provider-neutral, Stripe-shaped; Apple/Google IAP would add rows with another `provider`.

- Customer: id, userId UNIQUE (FK cascade), provider, providerCustomerId, createdAt; UNIQUE(provider, providerCustomerId).
- Subscription: id, userId (FK cascade, indexed), provider, providerSubscriptionId, status (trialing|active|past_due|canceled|incomplete|paused), priceId, currentPeriodEnd (epoch ms like AiUsage), cancelAtPeriodEnd, providerUpdatedAt (event time, to drop out-of-order events), createdAt, updatedAt; UNIQUE(provider, providerSubscriptionId).
- Entitlement: id, userId (FK cascade), key (e.g. pro, ai_bartender), source (subscription|promo|manual), sourceId, validUntil (NULL = none); UNIQUE(userId, key, source). Feature gates read this, not Subscription.status, and not a boolean on User.
- WebhookEvent: id = provider event id (the idempotency key), provider, type, receivedAt, processedAt, status (received|processed|failed), error, optional payload (no card data, prune after 30-90 days); index on receivedAt.

Patterns: verify signature on the raw body; `INSERT ... ON CONFLICT DO NOTHING` on WebhookEvent first and skip if nothing inserted; apply Subscription and Entitlement changes and set processedAt in one `db.batch` so a crash cannot half-apply; compare providerUpdatedAt to ignore stale events; return 5xx on failure so the provider retries (status failed lets a retry through). Make AI quotas tier-aware via Entitlement instead of new User columns. Add User.createdAt first (missing; needed for trials). Migrate before deploying billing code.

## 8. Priority list

1. Pre go-live: confirm remote migration list; Time Travel bookmark and export; rehearse 0004-0007 on an export; split 0006; migrate first, deploy second.
2. New 0008 (never edit applied files): Tab(userId, createdAt), Session(userId), Account(userId), Drink(tabId, finishedAt).
3. deleteAccount: also delete AiUsage by key prefix and VerificationToken by email; add a test.
4. Fix the stale `0004_offline_adds.sql` comment in schema.prisma.
5. Decide Drink.clientId scoping.
6. Nightly export to R2 plus restore drill and deletion log.
7. Add User.createdAt and a Consent history table before the paywall.
