// Shared types for the drink parser ("bartender"). Everything in src/lib/drinks is pure and
// runtime-agnostic so it can be used from the Worker, unit tests and the eval script.

export const CATEGORIES = [
  "beer",
  "cider",
  "wine",
  "sparkling",
  "fortified",
  "spirit",
  "liqueur",
  "rtd",
  "cocktail",
  "soju_sake",
  "non_alcoholic",
] as const;
export type Category = (typeof CATEGORIES)[number];

export interface CatalogEntry {
  id: string;
  name: string;
  brand: string | null;
  category: Category;
  /** % alcohol by volume, as on the label. */
  abv: number;
  /** Volume of the usual serve when the user gives none (e.g. a VB is a 375 ml stubby). */
  serveMl: number;
  /** Lower-case phrases that identify this drink. The name is always matched as well. */
  aliases: string[];
  /** Mixers (coke, tonic, lemonade) are absorbed into a neighbouring alcoholic drink. */
  isMixer?: boolean;
  sourceUrl: string | null;
}

export type ServeKind =
  /** A fixed measure: a schooner is 425 ml whatever is in it. */
  | "measure"
  /** A container whose size depends on the drink: a bottle of wine vs a bottle of beer. */
  | "container";

export interface ServeSize {
  id: string;
  name: string;
  kind: ServeKind;
  /** Fixed volume for measures, fallback volume for containers. */
  volumeMl: number;
  /** Per-category volumes for containers. */
  categoryMl?: Partial<Record<Category, number>>;
  /** What the drink is assumed to be when only the serve is given ("a schooner" = beer). */
  impliesCategory?: Category;
  aliases: string[];
  sourceUrl: string | null;
}

export type ParseSource = "recent" | "cache" | "catalog" | "ai";

export interface ParsedItem {
  name: string;
  /** null for a recent drink re-used from history (the category was not stored). */
  category: Category | null;
  brand: string | null;
  /** Volume of one serve in ml. */
  volumeMl: number;
  abv: number;
  count: number;
  standards: number;
  /** 0–1. Below ~0.7 the UI should nudge the user to double-check. */
  confidence: number;
  source: ParseSource;
  catalogId: string | null;
  /** Which of volume / abv / count were assumed rather than read from the text. */
  assumed: ("volume" | "abv" | "count")[];
}

export type ParseStatus =
  /** Every part of the text was understood. */
  | "ok"
  /** Some drinks were understood, some text was not (and the AI could not help). */
  | "partial"
  /** The text was understood and contains no drinks (or only non-alcoholic ones). */
  | "none"
  /** Nothing could be parsed and the AI fallback is unavailable: show manual entry. */
  | "unavailable";

export interface ParseResult {
  status: ParseStatus;
  items: ParsedItem[];
  totalStandards: number;
  /** Text fragments that were not understood (shown so nothing is silently dropped). */
  unparsed: string[];
  /** Which layer produced the result (the deepest one used). */
  layer: ParseSource | null;
}
