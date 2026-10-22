import type { RegionId } from "../region";
import { AiUnavailableError, parseWithAi, type AiRunner } from "./ai";
import { normaliseText } from "./normalise";
import { parseWithCatalog, type CatalogIndex } from "./parse";
import { roundUpToTenth } from "./standards";
import type { Category, ParsedItem, ParseResult, ParseSource } from "./types";

/** Bump when parsing rules or the catalog change in a way that should invalidate cached parses. */
// 3: "handle" is no longer a 285 ml pot, US shots are 44 ml, ABV up to 95%, "proof" is read.
// 4: mixed drinks keep the mixer in their name ("Vodka & Red Bull"); an unknown drink in a known glass is unread.
export const PARSER_VERSION = 4;

/*
 * The parse cache is shared by everyone, so it only keeps short phrases that read like a drink
 * order and that the AI parsed with some confidence. Anything longer (a sentence that might name
 * a person or a place) or holding a long number (a phone number, an address) is parsed but never
 * stored. Rows also expire (CACHE_TTL_MS, enforced by the server on read and by pruning).
 */
export const CACHE_RULES = { maxChars: 48, maxWords: 8, minConfidence: 0.5 };
export const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/*
 * The shared cache must never hand everyone an under-count. An AI answer is only stored when each
 * of its drinks is at least a plausible strength and size for its type; below that (a "beer" at
 * 0.5%, a 10 ml "glass of wine") it may still be right for this one person, who sees it marked as
 * a guess, but it isn't replayed to anyone else. A drink the AI calls non-alcoholic is never
 * stored: that is the cheapest way to talk a drink down to zero.
 */
export const PLAUSIBLE_FLOOR: Record<Category, { abv: number; volumeMl: number } | null> = {
  beer: { abv: 2.5, volumeMl: 140 },
  cider: { abv: 3, volumeMl: 200 },
  wine: { abv: 8, volumeMl: 60 },
  sparkling: { abv: 7, volumeMl: 60 },
  fortified: { abv: 14, volumeMl: 30 },
  spirit: { abv: 20, volumeMl: 25 },
  liqueur: { abv: 10, volumeMl: 25 },
  rtd: { abv: 3, volumeMl: 200 },
  cocktail: { abv: 5, volumeMl: 60 },
  soju_sake: { abv: 5, volumeMl: 30 },
  non_alcoholic: null,
};

export function isPlausibleAiItem(item: ParsedItem) {
  if (item.source !== "ai") return true;
  const floor = item.category ? PLAUSIBLE_FLOOR[item.category] : null;
  return !!floor && item.abv >= floor.abv && item.volumeMl >= floor.volumeMl;
}

export function isCacheable(norm: string, items: ParsedItem[]) {
  return (
    items.length > 0 &&
    items.every(isPlausibleAiItem) &&
    norm.length <= CACHE_RULES.maxChars &&
    norm.split(" ").length <= CACHE_RULES.maxWords &&
    !/\d{5,}/.test(norm.replace(/ /g, "")) && // "0412 345 678" counts as one long number
    items.every((i) => i.confidence >= CACHE_RULES.minConfidence)
  );
}

export interface BartenderDeps {
  index: CatalogIndex;
  /** The user's most recent drink, for "same again" / "another one". */
  lastDrink?: () => Promise<ParsedItem[] | null>;
  /** The user's own earlier drinks with the same normalised text (recents / favourites). */
  findRecent?: (normText: string) => Promise<ParsedItem[] | null>;
  cacheGet?: (normText: string) => Promise<ParsedItem[] | null>;
  cachePut?: (normText: string, items: ParsedItem[]) => Promise<void>;
  ai?: AiRunner | null;
  onAiError?: (err: unknown) => void;
  /** Whose bar measures to assume (US shots are 44 ml). The index should be built to match. */
  region?: RegionId;
}

/** "same again", "another one", "one more"... */
const SAME_AGAIN = /^(same|same again|same one|same as before|same again please|another|another one|again|one more|repeat|ditto|same thing)$/;

function result(items: ParsedItem[], unparsed: string[], layer: ParseSource | null): ParseResult {
  const totalStandards = roundUpToTenth(items.reduce((sum, i) => sum + i.standards, 0));
  let status: ParseResult["status"];
  // Text nobody could read ("idk like 3 drinks") is never reported as zero: the UI asks instead.
  if (unparsed.length > 0) status = items.length > 0 ? "partial" : "unavailable";
  else status = totalStandards > 0 ? "ok" : "none";
  return { status, items, totalStandards, unparsed, layer };
}

/**
 * Text -> drinks, trying the cheapest layer first:
 *   recents (D1) -> parse cache (D1) -> curated catalog -> Workers AI (only for leftover text).
 * Never returns a silent 0: if some text could not be understood (AI unavailable, or the AI found no
 * drink in it) the status is "partial" or "unavailable" so the UI can offer manual entry.
 */
export async function parseDrinks(text: string, deps: BartenderDeps): Promise<ParseResult> {
  const norm = normaliseText(text);
  if (!norm) return result([], [], null);

  if (SAME_AGAIN.test(norm)) {
    const last = await deps.lastDrink?.().catch(() => null);
    if (last?.length) return result(last.map((i) => ({ ...i, source: "recent" as const })), [], "recent");
  }

  const recent = await deps.findRecent?.(norm).catch(() => null);
  if (recent?.length) return result(recent.map((i) => ({ ...i, source: "recent" as const })), [], "recent");

  const cached = await deps.cacheGet?.(norm).catch(() => null);
  if (cached) return result(cached.map((i) => ({ ...i, source: "cache" as const })), [], "cache");

  const catalog = parseWithCatalog(text, deps.index);
  if (catalog.unparsed.length === 0) return result(catalog.items, [], "catalog");

  try {
    const aiItems = await parseWithAi(deps.ai, catalog.unparsed.join("; "), deps.index, deps.region);
    const items = [...catalog.items, ...aiItems];
    if (aiItems.length > 0 && isCacheable(norm, items)) await deps.cachePut?.(norm, items).catch(() => undefined);
    // Text the AI looked at but found no drink in (e.g. an injection attempt) is reported, not counted.
    return result(items, aiItems.length > 0 ? [] : catalog.unparsed, "ai");
  } catch (err) {
    if (!(err instanceof AiUnavailableError)) throw err;
    deps.onAiError?.(err);
    return result(catalog.items, catalog.unparsed, catalog.items.length > 0 ? "catalog" : null);
  }
}
