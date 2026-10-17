import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { PrismaClient } from "@prisma/client";

import type { AiRunner } from "~/lib/drinks/ai";
import { CircuitBreaker, limitAi, type UsageStore } from "~/lib/drinks/ai-quota";
import { CATALOG } from "~/lib/drinks/catalog";
import { normaliseText } from "~/lib/drinks/normalise";
import { buildIndex, type CatalogIndex } from "~/lib/drinks/parse";
import { CACHE_TTL_MS, parseDrinks, PARSER_VERSION } from "~/lib/drinks/pipeline";
import { SERVE_SIZES } from "~/lib/drinks/serves";
import type { CatalogEntry, Category, ParsedItem, ServeSize } from "~/lib/drinks/types";

const INDEX_TTL_MS = 10 * 60 * 1000;
let cachedIndex: { index: CatalogIndex; loadedAt: number } | null = null;

const parseJson = <T,>(text: string | null, fallback: T): T => {
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
};

/** Catalog + serve sizes from D1, cached per isolate. Falls back to the bundled seed if empty. */
async function loadIndex(db: PrismaClient): Promise<CatalogIndex> {
  if (cachedIndex && Date.now() - cachedIndex.loadedAt < INDEX_TTL_MS) return cachedIndex.index;
  let entries: CatalogEntry[] = CATALOG;
  let serves: ServeSize[] = SERVE_SIZES;
  try {
    const [catalogRows, serveRows] = await Promise.all([db.drinkCatalog.findMany(), db.serveSize.findMany()]);
    if (catalogRows.length > 0) {
      entries = catalogRows.map((r) => ({
        id: r.id,
        name: r.name,
        brand: r.brand,
        category: r.category as Category,
        abv: r.abv,
        serveMl: r.serveMl,
        aliases: parseJson<string[]>(r.aliases, []),
        isMixer: r.isMixer,
        sourceUrl: r.sourceUrl,
      }));
    }
    if (serveRows.length > 0) {
      serves = serveRows.map((r) => ({
        id: r.id,
        name: r.name,
        kind: r.kind as ServeSize["kind"],
        volumeMl: r.volumeMl,
        categoryMl: parseJson<ServeSize["categoryMl"]>(r.categoryMl, undefined),
        impliesCategory: (r.impliesCategory as Category | null) ?? undefined,
        aliases: parseJson<string[]>(r.aliases, []),
        sourceUrl: r.sourceUrl,
      }));
    }
    if (catalogRows.length === 0) console.warn("DrinkCatalog is empty; using the bundled catalog. Run npm run db:migrate:local.");
  } catch (err) {
    console.error("Could not load the drink catalog from D1; using the bundled catalog.", err);
  }
  const index = buildIndex(entries, serves);
  cachedIndex = { index, loadedAt: Date.now() };
  return index;
}

/** The user's most recently logged drink ("same again"). */
async function findLastDrink(db: PrismaClient, userId: string): Promise<ParsedItem[] | null> {
  const last = await db.drink.findFirst({ where: { tab: { userId } }, orderBy: { finishedAt: "desc" } });
  if (!last) return null;
  return [
    {
      name: last.name ?? "Same as last drink",
      category: last.abv === 0 ? "non_alcoholic" : null,
      brand: null,
      volumeMl: last.volumeMl ?? 0,
      abv: last.abv ?? 0,
      count: last.count ?? 1,
      standards: last.standards,
      confidence: 0.95,
      source: "recent",
      catalogId: null,
      assumed: [],
    },
  ];
}

/** The user's most recent drink logged from the same text, with the standards they confirmed. */
async function findRecent(db: PrismaClient, userId: string, normText: string): Promise<ParsedItem[] | null> {
  const recent = await db.drink.findMany({
    where: { tab: { userId }, rawText: { not: null } },
    orderBy: { finishedAt: "desc" },
    take: 100,
  });
  const match = recent.find((d) => d.rawText && normaliseText(d.rawText) === normText);
  if (match?.volumeMl == null || match.abv === null) return null;
  return [
    {
      name: match.name ?? match.rawText ?? "Drink",
      category: match.abv === 0 ? "non_alcoholic" : null,
      brand: null,
      volumeMl: match.volumeMl,
      abv: match.abv,
      count: match.count ?? 1,
      standards: match.standards,
      confidence: 0.95,
      source: "recent",
      catalogId: null,
      assumed: [],
    },
  ];
}

/** Atomic counters in D1 (one upsert per call, so concurrent isolates can't both take the last slot). */
function usageStore(db: PrismaClient): UsageStore {
  return {
    async increment(key, expiresAt) {
      const rows = await db.$queryRaw<{ count: number | bigint }[]>`
        INSERT INTO "AiUsage" ("key", "count", "expiresAt") VALUES (${key}, 1, ${expiresAt})
        ON CONFLICT ("key") DO UPDATE SET "count" = "count" + 1
        RETURNING "count"`;
      const count = rows[0]?.count;
      if (count === undefined) throw new Error("AiUsage upsert returned no row");
      return Number(count);
    },
    async raiseTo(key, count, expiresAt) {
      await db.$executeRaw`
        INSERT INTO "AiUsage" ("key", "count", "expiresAt") VALUES (${key}, ${count}, ${expiresAt})
        ON CONFLICT ("key") DO UPDATE SET "count" = MAX("count", excluded."count")`;
    },
  };
}

// One breaker per isolate: after repeated AI failures, skip the AI for a few minutes.
const breaker = new CircuitBreaker();

const PRUNE_EVERY_MS = 60 * 60 * 1000;
let lastPrunedAt = 0;

/** Deletes expired usage counters and parse-cache rows, at most once an hour per isolate. */
async function pruneExpired(db: PrismaClient) {
  const now = Date.now();
  if (now - lastPrunedAt < PRUNE_EVERY_MS) return;
  lastPrunedAt = now;
  await Promise.all([
    db.aiUsage.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.parseCache.deleteMany({ where: { createdAt: { lt: new Date(now - CACHE_TTL_MS) } } }),
  ]).catch((err) => console.warn("Could not prune expired bartender rows:", err));
}

function getAi(): AiRunner | null {
  try {
    const { env } = getCloudflareContext();
    return (env.AI as unknown as AiRunner | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function analyseDrinkText(db: PrismaClient, userId: string, text: string) {
  const index = await loadIndex(db);
  await pruneExpired(db);
  return parseDrinks(text, {
    index,
    lastDrink: () => findLastDrink(db, userId),
    findRecent: (norm) => findRecent(db, userId, norm),
    cacheGet: async (key) => {
      const row = await db.parseCache.findUnique({ where: { key } });
      if (!row || row.version !== PARSER_VERSION) return null;
      if (Date.now() - row.createdAt.getTime() > CACHE_TTL_MS) return null;
      await db.parseCache.update({ where: { key }, data: { hits: { increment: 1 } } });
      return parseJson<ParsedItem[] | null>(row.items, null);
    },
    cachePut: async (key, items) => {
      const data = { version: PARSER_VERSION, items: JSON.stringify(items) };
      // Re-parsing restarts the 30-day clock.
      await db.parseCache.upsert({ where: { key }, create: { key, ...data }, update: { ...data, createdAt: new Date() } });
    },
    ai: limitAi(getAi(), {
      userId,
      store: usageStore(db),
      breaker,
      onLimited: (reason) => console.warn(`Workers AI skipped for drink parsing: ${reason} limit`),
    }),
    onAiError: (err) => console.warn("Workers AI unavailable for drink parsing:", err instanceof Error ? err.message : err),
  });
}
