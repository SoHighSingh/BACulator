import { computeStandards } from "./standards";
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

/** "2 × 425 ml · Victoria Bitter · 4.9%" */
export function describeItem(item: ParsedItem) {
  const count = item.count === 1 ? "" : `${fmt(item.count)} × `;
  return `${count}${fmt(item.volumeMl)} ml · ${item.name} · ${fmt(item.abv)}%`;
}

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

/** Manual-entry chips shown when the text could not be parsed. Values match the catalog generics. */
export const MANUAL_CHIPS = [
  { label: "Schooner of beer", volumeMl: 425, abv: 4.8 },
  { label: "Pint of beer", volumeMl: 570, abv: 4.8 },
  { label: "Can, stubby or premix", volumeMl: 375, abv: 4.8 },
  { label: "Glass of wine", volumeMl: 150, abv: 13.5 },
  { label: "Nip of spirits", volumeMl: 30, abv: 40 },
  { label: "Cocktail", volumeMl: 150, abv: 15.8 },
].map((c) => ({ ...c, standards: computeStandards(1, c.volumeMl, c.abv) }));
