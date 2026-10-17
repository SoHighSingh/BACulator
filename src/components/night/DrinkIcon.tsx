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

const PATHS: Record<DrinkKind, string> = {
  beer: "M7 4h10l-1.2 16.2a1 1 0 0 1-1 .8H9.2a1 1 0 0 1-1-.8L7 4Zm.5 4h9",
  wine: "M8 3h8l.2 4a4.2 4.2 0 0 1-8.4 0L8 3Zm4 8.2V20m-3.5 0h7",
  shot: "M7.5 8h9l-1.3 11.2a1 1 0 0 1-1 .8H9.8a1 1 0 0 1-1-.8L7.5 8Zm1 4h7",
  can: "M8 5.5C8 4.7 9.8 4 12 4s4 .7 4 1.5v13c0 .8-1.8 1.5-4 1.5s-4-.7-4-1.5v-13Zm0 2.5h8m-8 8h8",
  cocktail: "M5 4h14l-7 8-7-8Zm7 8v8m-3.5 0h7M16 2.5l-2 4",
  drink: "M7 5h10l-1.4 14.2a1 1 0 0 1-1 .8H9.4a1 1 0 0 1-1-.8L7 5Zm.4 5h9.2",
};

export function DrinkIcon({ kind, className = "size-8" }: { kind: DrinkKind; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={PATHS[kind]} />
    </svg>
  );
}
