import { AiUnavailableError, parseWithAi, type AiRunner } from "./ai";
import { normaliseText } from "./normalise";
import { parseWithCatalog, type CatalogIndex } from "./parse";
import { roundUpToTenth } from "./standards";
import type { ParsedItem, ParseResult, ParseSource } from "./types";

/** Bump when parsing rules or the catalog change in a way that should invalidate cached parses. */
export const PARSER_VERSION = 1;

export interface BartenderDeps {
  index: CatalogIndex;
  /** The user's own earlier drinks with the same normalised text (recents / favourites). */
  findRecent?: (normText: string) => Promise<ParsedItem[] | null>;
  cacheGet?: (normText: string) => Promise<ParsedItem[] | null>;
  cachePut?: (normText: string, items: ParsedItem[]) => Promise<void>;
  ai?: AiRunner | null;
  onAiError?: (err: unknown) => void;
}

function result(items: ParsedItem[], unparsed: string[], layer: ParseSource | null, aiFailed = false): ParseResult {
  const totalStandards = roundUpToTenth(items.reduce((sum, i) => sum + i.standards, 0));
  let status: ParseResult["status"];
  if (unparsed.length > 0) status = items.length > 0 ? "partial" : aiFailed ? "unavailable" : "none";
  else status = totalStandards > 0 ? "ok" : "none";
  return { status, items, totalStandards, unparsed, layer };
}

/**
 * Text -> drinks, trying the cheapest layer first:
 *   recents (D1) -> parse cache (D1) -> curated catalog -> Workers AI (only for leftover text).
 * Never returns a silent 0: if nothing could be understood and the AI is unavailable the status is
 * "unavailable" so the UI can offer manual entry.
 */
export async function parseDrinks(text: string, deps: BartenderDeps): Promise<ParseResult> {
  const norm = normaliseText(text);
  if (!norm) return result([], [], null);

  const recent = await deps.findRecent?.(norm).catch(() => null);
  if (recent?.length) return result(recent.map((i) => ({ ...i, source: "recent" as const })), [], "recent");

  const cached = await deps.cacheGet?.(norm).catch(() => null);
  if (cached) return result(cached.map((i) => ({ ...i, source: "cache" as const })), [], "cache");

  const catalog = parseWithCatalog(text, deps.index);
  if (catalog.unparsed.length === 0) return result(catalog.items, [], "catalog");

  try {
    const aiItems = await parseWithAi(deps.ai, catalog.unparsed.join("; "), deps.index);
    const items = [...catalog.items, ...aiItems];
    await deps.cachePut?.(norm, items).catch(() => undefined);
    // Text the AI looked at but found no drink in (e.g. an injection attempt) is reported, not counted.
    return result(items, aiItems.length > 0 ? [] : catalog.unparsed, "ai");
  } catch (err) {
    if (!(err instanceof AiUnavailableError)) throw err;
    deps.onAiError?.(err);
    return result(catalog.items, catalog.unparsed, catalog.items.length > 0 ? "catalog" : null, true);
  }
}
