import type { ParsedItem, ParseResult } from "./types";

/** What gets stored on a Drink row alongside the standards the user confirmed. */
export interface DrinkDetails {
  name: string;
  volumeMl: number;
  abv: number;
  count: number;
  source: "recent" | "cache" | "catalog" | "ai" | "manual" | "edited";
  confidence: number;
  rawText: string;
}

const fmt = (n: number) => String(Math.round(n * 10) / 10);


/**
 * One Drink row per add. A multi-drink entry ("2 schooners and a shot") is stored as its total
 * volume at the ethanol-weighted ABV, so volumeMl × abv still matches the standards.
 */
export function toDrinkDetails(result: ParseResult, rawText: string): DrinkDetails | undefined {
  const items = result.items;
  if (items.length === 0 || !result.layer) return undefined;
  const confidence = Math.min(...items.map((i) => i.confidence));
  if (items.length === 1) {
    const [i] = items as [ParsedItem];
    return { name: i.name, volumeMl: i.volumeMl, abv: i.abv, count: i.count, source: result.layer, confidence, rawText };
  }
  const volumeMl = items.reduce((s, i) => s + i.count * i.volumeMl, 0);
  const ethanolMl = items.reduce((s, i) => s + (i.count * i.volumeMl * i.abv) / 100, 0);
  return {
    name: items.map((i) => (i.count === 1 ? i.name : `${fmt(i.count)}× ${i.name}`)).join(" + ").slice(0, 200),
    volumeMl: Math.round(volumeMl * 10) / 10,
    abv: volumeMl > 0 ? Math.round((ethanolMl / volumeMl) * 1000) / 10 : 0,
    count: 1,
    source: result.layer,
    confidence,
    rawText,
  };
}

/** Manual-entry chips for the default region; the add sheet picks them per region (see lib/region). */
