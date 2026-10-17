import { Beer, CupSoda, GlassWater, Martini, Wine, type LucideIcon } from "lucide-react";

export type DrinkKind = "beer" | "wine" | "shot" | "can" | "cocktail" | "drink";

interface DrinkLike {
  name?: string | null;
  volumeMl?: number | null;
  abv?: number | null;
}

/** A glass shape people recognise faster than a word. Guessed from the name, then size and strength. */
export function drinkKind({ name, volumeMl, abv }: DrinkLike): DrinkKind {
  const n = (name ?? "").toLowerCase();
  if (/\b(can|stubby|tinny|premix|seltzer|claw|truly|rtd|bottle of beer)\b/.test(n)) return "can";
  if (/\b(wine|red|white|ros[eé]|sparkling|prosecco|champagne|bubbles|shiraz|pinot|sav|chardonnay|merlot|glass of)\b/.test(n))
    return "wine";
  if (/\b(shot|nip|neat|double|tequila|jager|liquor|spirits?)\b/.test(n)) return "shot";
  if (/\b(cocktail|margarita|martini|spritz|mojito|negroni|espresso|daiquiri|g&t|gin|vodka|rum|whisk(e)?y|bourbon)\b/.test(n))
    return "cocktail";
  if (/\b(beer|lager|ale|pint|schooner|pot|middy|ipa|stout|cider|pilsner|draught)\b/.test(n)) return "beer";
  if (volumeMl != null && abv != null) {
    if (volumeMl <= 60 && abv >= 20) return "shot";
    if (abv >= 9 && abv <= 16 && volumeMl <= 250) return "wine";
    if (volumeMl >= 250 && abv < 9) return "beer";
  }
  return "drink";
}

// Lucide's drink set: one consistent stroke family, drawn on a 24px grid.
const ICONS: Record<DrinkKind, LucideIcon> = {
  beer: Beer,
  wine: Wine,
  shot: GlassWater,
  can: CupSoda,
  cocktail: Martini,
  drink: GlassWater,
};

export function DrinkIcon({ kind, className = "size-8" }: { kind: DrinkKind; className?: string }) {
  const Icon = ICONS[kind];
  return <Icon aria-hidden="true" className={`shrink-0 ${className}`} strokeWidth={2.25} absoluteStrokeWidth={false} />;
}
