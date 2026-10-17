import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { PrismaClient } from "@prisma/client";

import type { AiRunner } from "~/lib/drinks/ai";
import { CATALOG } from "~/lib/drinks/catalog";
import { normaliseText } from "~/lib/drinks/normalise";
import { buildIndex, type CatalogIndex } from "~/lib/drinks/parse";
import { parseDrinks, PARSER_VERSION } from "~/lib/drinks/pipeline";
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
  return parseDrinks(text, {
    index,
    findRecent: (norm) => findRecent(db, userId, norm),
    cacheGet: async (key) => {
      const row = await db.parseCache.findUnique({ where: { key } });
      if (!row || row.version !== PARSER_VERSION) return null;
      await db.parseCache.update({ where: { key }, data: { hits: { increment: 1 } } });
      return parseJson<ParsedItem[] | null>(row.items, null);
    },
    cachePut: async (key, items) => {
      const data = { version: PARSER_VERSION, items: JSON.stringify(items) };
      await db.parseCache.upsert({ where: { key }, create: { key, ...data }, update: data });
    },
    ai: getAi(),
    onAiError: (err) => console.warn("Workers AI unavailable for drink parsing:", err),
  });
}
