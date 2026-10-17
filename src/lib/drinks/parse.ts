import { editDistance, normaliseText, tokenise, typoAllowance } from "./normalise";
import { PACK_COUNTS } from "./serves";
import { clamp, computeStandards, LIMITS } from "./standards";
import type { CatalogEntry, Category, ParsedItem, ServeSize } from "./types";

/*
 * Deterministic drink parser. Text is split into segments ("2 schooners of vb, a shot of tequila"),
 * and in each segment we find, in order:
 *   1. exact catalog phrases (longest first)   "vodka cruiser", "jim beam and cola"
 *   2. serve sizes and multi-packs              "schooner", "sa pint", "six pack"
 *   3. catalog phrases with typos               "heinekin", "schoner"
 *   4. volumes, strengths and counts            "330ml", "4.2%", "two", "x3", "half"
 * The arithmetic is done in code: standards = count × ml × abv/100 × 0.789 / 10, rounded up.
 */

type PhraseKind = "catalog" | "serve" | "pack";

interface Phrase {
  tokens: string[];
  joined: string;
  kind: PhraseKind;
  entry?: CatalogEntry;
  serve?: ServeSize;
  packCount?: number;
}

export interface CatalogIndex {
  entries: CatalogEntry[];
  byId: Map<string, CatalogEntry>;
  catalogPhrases: Phrase[];
  servePhrases: Phrase[];
  /** Alias phrases containing "and", which must not be split into two drinks. */
  andPhrases: { pattern: RegExp; replacement: string }[];
  genericByCategory: Partial<Record<Category, CatalogEntry>>;
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** "jim beam and cola" -> "jim beam n cola", so segment splitting on " and " leaves it whole. */
const protectAnd = (s: string) => s.replace(/ and /g, " n ");

function phraseOf(alias: string, kind: PhraseKind, extra: Partial<Phrase>): Phrase | null {
  const tokens = tokenise(protectAnd(normaliseText(alias)));
  if (tokens.length === 0) return null;
  return { tokens, joined: tokens.join(""), kind, ...extra };
}

export function buildIndex(entries: CatalogEntry[], serves: ServeSize[]): CatalogIndex {
  const catalogPhrases: Phrase[] = [];
  const andAliases = new Set<string>();
  for (const entry of entries) {
    for (const alias of new Set([entry.name, ...entry.aliases])) {
      const phrase = phraseOf(alias, "catalog", { entry });
      if (phrase) catalogPhrases.push(phrase);
      const norm = normaliseText(alias);
      if (norm.includes(" and ")) andAliases.add(norm);
    }
  }
  const servePhrases: Phrase[] = [];
  for (const serve of serves) {
    for (const alias of new Set([serve.name, ...serve.aliases])) {
      const phrase = phraseOf(alias, "serve", { serve });
      if (phrase) servePhrases.push(phrase);
    }
  }
  for (const pack of PACK_COUNTS) {
    for (const alias of pack.aliases) {
      const phrase = phraseOf(alias, "pack", { packCount: pack.count });
      if (phrase) servePhrases.push(phrase);
    }
  }
  // Longer phrases first; brands before generics so "corona beer" picks Corona.
  const order = (a: Phrase, b: Phrase) =>
    b.tokens.length - a.tokens.length ||
    Number(!!b.entry?.brand) - Number(!!a.entry?.brand) ||
    b.joined.length - a.joined.length;
  catalogPhrases.sort(order);
  servePhrases.sort(order);

  const andPhrases = [...andAliases]
    .sort((a, b) => b.length - a.length)
    .map((alias) => ({
      // allow a plural on the last word: "rum and cokes"
      pattern: new RegExp(`\\b${escapeRegExp(alias)}(s|es)?\\b`, "g"),
      replacement: protectAnd(alias),
    }));

  const genericByCategory: Partial<Record<Category, CatalogEntry>> = {};
  const genericIds: Partial<Record<Category, string>> = {
    beer: "generic_beer_full_strength",
    cider: "generic_cider",
    wine: "generic_wine",
    sparkling: "generic_sparkling_wine",
    fortified: "generic_port",
    spirit: "generic_spirit",
    liqueur: "generic_liqueur",
    rtd: "generic_premix_rtd",
    cocktail: "generic_cocktail",
    soju_sake: "generic_soju",
  };
  const byId = new Map(entries.map((e) => [e.id, e]));
  for (const [category, id] of Object.entries(genericIds) as [Category, string][]) {
    const entry = byId.get(id) ?? entries.find((e) => e.category === category && !e.brand);
    if (entry) genericByCategory[category] = entry;
  }

  return { entries, byId, catalogPhrases, servePhrases, andPhrases, genericByCategory };
}

// ---------------------------------------------------------------------------------------------
// Tokens

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, another: 1, single: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20, couple: 2, pair: 2,
  few: 3, several: 3, both: 2,
};
const FRACTION_WORDS: Record<string, number> = { half: 0.5, quarter: 0.25, third: 1 / 3 };

const STOPWORDS = new Set(
  (
    "of the with and n some my i im ive id i'd had have having has drank drunk drink drinking just got get getting like about around approx " +
    "approximately maybe probably ish on in at for to from into mate mates tonight today last night earlier later after before pregame " +
    "pregaming pre preload preloading bar pub club home party then also more large big small nice quick cold ice-cold " +
    "fresh glasses each per or plus please thanks thank you it its this that was were be been is are am we me us our they them " +
    "lol haha ok okay so too very really bit little lot lots heaps over under total all up down out by while during whole entire " +
    "full worth sip sips"
  )
    .split(" ")
    .map((w) => w.replace(/'/g, "")),
);

const NEGATION_TOKENS = new Set(["zero", "nonalcoholic", "alcoholfree", "af", "0.0", "0%"]);

const UNIT_ML: Record<string, number> = {
  ml: 1, mls: 1, millilitre: 1, milliliter: 1, millilitres: 1, cl: 10, l: 1000, lt: 1000, ltr: 1000, litre: 1000,
  liter: 1000, litres: 1000, liters: 1000, oz: 29.57, ounce: 29.57, ounces: 29.57,
};

interface Match {
  start: number;
  end: number; // exclusive
  phrase: Phrase;
  typos: number;
}

function findExact(tokens: string[], used: boolean[], phrases: Phrase[], out: Match[]) {
  for (const phrase of phrases) {
    const n = phrase.tokens.length;
    for (let i = 0; i + n <= tokens.length; i++) {
      let ok = true;
      for (let k = 0; k < n; k++) {
        if (used[i + k] || tokens[i + k] !== phrase.tokens[k]) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      for (let k = 0; k < n; k++) used[i + k] = true;
      out.push({ start: i, end: i + n, phrase, typos: 0 });
    }
  }
}

function findFuzzy(tokens: string[], used: boolean[], phrases: Phrase[], out: Match[], minLength = 5) {
  const candidates: Match[] = [];
  for (const phrase of phrases) {
    const n = phrase.tokens.length;
    for (let i = 0; i + n <= tokens.length; i++) {
      let typos = 0;
      let ok = true;
      for (let k = 0; k < n && ok; k++) {
        const t = tokens[i + k]!;
        const p = phrase.tokens[k]!;
        if (used[i + k] || STOPWORDS.has(t) || /^\d/.test(t)) {
          ok = false;
        } else if (t !== p) {
          const allowance = p.length < minLength ? 0 : typoAllowance(p.length);
          const d = allowance === 0 ? 1 : editDistance(t, p, allowance);
          if (d > allowance) ok = false;
          else typos += d;
        }
      }
      if (ok && typos > 0 && typos <= 2) candidates.push({ start: i, end: i + n, phrase, typos });
    }
    // Spacing differences: "redbull" vs "red bull", "espressomartini"
    if (n > 1) {
      for (let i = 0; i < tokens.length; i++) {
        if (!used[i] && tokens[i] === phrase.joined) candidates.push({ start: i, end: i + 1, phrase, typos: 0 });
      }
    }
  }
  candidates.sort(
    (a, b) =>
      a.typos - b.typos ||
      b.phrase.tokens.length - a.phrase.tokens.length ||
      Number(!!b.phrase.entry?.brand) - Number(!!a.phrase.entry?.brand),
  );
  for (const m of candidates) {
    let free = true;
    for (let k = m.start; k < m.end; k++) if (used[k]) free = false;
    if (!free) continue;
    for (let k = m.start; k < m.end; k++) used[k] = true;
    out.push(m);
  }
}

interface Quantities {
  counts: { index: number; value: number }[];
  fractions: number[];
  volumeMl: number | null;
  abv: number | null;
  negated: boolean;
  leftovers: string[];
}

function readQuantities(tokens: string[], used: boolean[]): Quantities {
  const q: Quantities = { counts: [], fractions: [], volumeMl: null, abv: null, negated: false, leftovers: [] };
  for (let i = 0; i < tokens.length; i++) {
    if (used[i]) continue;
    const t = tokens[i]!;
    const next = tokens[i + 1];
    const mark = (n = 1) => {
      for (let k = 0; k < n; k++) used[i + k] = true;
    };

    if (NEGATION_TOKENS.has(t)) {
      q.negated = true;
      mark();
      continue;
    }
    if ((t === "non" || t === "no" || t === "low") && (next === "alc" || next === "alcohol" || next === "alcoholic")) {
      if (t !== "low") q.negated = true;
      mark(2);
      continue;
    }
    if (t === "alcohol" && next === "free") {
      q.negated = true;
      mark(2);
      continue;
    }

    // 4.2% | 4.2 % | 4.2 percent | 4.2 abv
    let m = /^(\d+(?:\.\d+)?)%$/.exec(t);
    if (m) {
      q.abv = Number(m[1]);
      mark();
      continue;
    }
    if (/^\d+(?:\.\d+)?$/.test(t) && (next === "%" || next === "percent" || next === "abv" || next === "per")) {
      q.abv = Number(t);
      mark(next === "per" && tokens[i + 2] === "cent" ? 3 : 2);
      continue;
    }
    if (t === "%" || t === "abv" || t === "percent") {
      mark();
      continue;
    }

    // 330ml | 330 ml | 1.5l | 12oz
    m = /^(\d+(?:\.\d+)?)([a-z]+)$/.exec(t);
    if (m && UNIT_ML[m[2]!] !== undefined) {
      q.volumeMl = Number(m[1]) * UNIT_ML[m[2]!]!;
      mark();
      continue;
    }
    if (/^\d+(?:\.\d+)?$/.test(t) && next && UNIT_ML[next] !== undefined) {
      q.volumeMl = Number(t) * UNIT_ML[next];
      mark(2);
      continue;
    }
    if ((t === "litre" || t === "liter") && q.volumeMl === null) {
      q.volumeMl = 1000;
      mark();
      continue;
    }

    // x2 | 2x | x 2
    m = /^x(\d+(?:\.\d+)?)$/.exec(t) ?? /^(\d+(?:\.\d+)?)x$/.exec(t);
    if (m) {
      q.counts.push({ index: i, value: Number(m[1]) });
      mark();
      continue;
    }
    if (t === "x" && next && /^\d+(?:\.\d+)?$/.test(next)) {
      q.counts.push({ index: i, value: Number(next) });
      mark(2);
      continue;
    }
    if (/^\d+(?:\.\d+)?$/.test(t)) {
      q.counts.push({ index: i, value: Number(t) });
      mark();
      continue;
    }
    if (NUMBER_WORDS[t] !== undefined) {
      q.counts.push({ index: i, value: NUMBER_WORDS[t] });
      mark();
      continue;
    }
    if (FRACTION_WORDS[t] !== undefined) {
      q.fractions.push(FRACTION_WORDS[t]);
      mark();
      continue;
    }
    if (STOPWORDS.has(t) || t === "x") {
      mark();
      continue;
    }
    q.leftovers.push(t);
  }
  return q;
}

// ---------------------------------------------------------------------------------------------
// Segments

export interface SegmentParse {
  text: string;
  /** The alcoholic (or non-alcoholic) drink found, if any. */
  item: ParsedItem | null;
  /** True when the only thing found was a mixer such as "coke" or "tonic". */
  mixerOnly: boolean;
  /** The mixer, so a mixer on its own ("a coke") can still be shown as a non-alcoholic drink. */
  mixer?: CatalogEntry;
  /** True when the segment contained nothing that looks like a drink (stopwords, numbers). */
  empty: boolean;
}

const isAlcoholic = (e: CatalogEntry) => e.category !== "non_alcoholic";

function preprocess(text: string, index: CatalogIndex) {
  let norm = normaliseText(text);
  // "1 and a half bottles" -> "1.5 bottles"; "a bottle and a half" -> "1.5 bottle"
  norm = norm
    .replace(/\b(\d+) and a half\b/g, (_, n: string) => `${Number(n) + 0.5}`)
    .replace(/\b(one|a) and a half\b/g, "1.5")
    .replace(/\ba (\w+) and a half\b/g, "1.5 $1")
    .replace(/\b(\d+) or (\d+)\b/g, (_, a: string, b: string) => `${Math.max(Number(a), Number(b))}`)
    .replace(/\b(\d+) (\d+) (?=[a-z])/g, (_, a: string, b: string) => `${Math.max(Number(a), Number(b))} `); // "3-4 beers"
  for (const { pattern, replacement } of index.andPhrases) norm = norm.replace(pattern, replacement);
  return norm;
}

export function splitSegments(norm: string) {
  return norm
    .split(/[,;\n]| and | then | plus | also | followed by | after that /)
    .map((s) => s.trim())
    .filter(Boolean);
}

function resolveVolume(entry: CatalogEntry, serve: ServeSize | null, explicitMl: number | null) {
  if (explicitMl !== null) return { volumeMl: explicitMl, assumed: false };
  if (!serve) return { volumeMl: entry.serveMl, assumed: true };
  const isSpirit = entry.category === "spirit" || entry.category === "liqueur";
  if ((serve.id === "double" || serve.id === "triple") && !isSpirit) return { volumeMl: entry.serveMl, assumed: true };
  if (serve.kind === "measure") return { volumeMl: serve.volumeMl, assumed: false };
  // Containers. A branded beer/cider/RTD bottle or can is its own pack size (a Corona is 355 ml).
  const packaged = entry.category === "beer" || entry.category === "cider" || entry.category === "rtd" || entry.category === "non_alcoholic";
  if (entry.brand && packaged && (serve.id === "bottle" || serve.id === "can")) return { volumeMl: entry.serveMl, assumed: false };
  if (entry.category === "rtd" && serve.id === "glass") return { volumeMl: entry.serveMl, assumed: false };
  return { volumeMl: serve.categoryMl?.[entry.category] ?? serve.volumeMl, assumed: false };
}

function parseSegment(text: string, index: CatalogIndex): SegmentParse[] {
  const tokens = tokenise(text);
  const used = tokens.map(() => false);
  const catalogMatches: Match[] = [];
  const serveMatches: Match[] = [];

  findExact(tokens, used, index.catalogPhrases, catalogMatches);
  findExact(tokens, used, index.servePhrases, serveMatches);
  findFuzzy(tokens, used, index.servePhrases, serveMatches, 6);
  findFuzzy(tokens, used, index.catalogPhrases, catalogMatches);

  // Two drinks in one segment with a quantity between them ("2 vb 3 coronas") are split.
  const alcoholic = catalogMatches.filter((m) => isAlcoholic(m.phrase.entry!)).sort((a, b) => a.start - b.start);
  if (alcoholic.length > 1) {
    const second = alcoholic[1]!;
    const firstEnd = alcoholic[0]!.end;
    let cut = -1;
    for (let i = firstEnd; i < second.start; i++) {
      const t = tokens[i]!;
      if (/^\d/.test(t) || NUMBER_WORDS[t] !== undefined || serveMatches.some((s) => s.start === i)) {
        cut = i;
        break;
      }
    }
    if (cut === -1 && serveMatches.some((s) => s.start > second.end) === false) {
      // No quantity between them: keep a single drink (e.g. "jameson whiskey").
    } else if (cut !== -1) {
      const words = text.split(" ");
      // tokens map 1:1 onto words (tokenise only stems)
      return [
        ...parseSegment(words.slice(0, cut).join(" "), index),
        ...parseSegment(words.slice(cut).join(" "), index),
      ];
    }
  }

  const q = readQuantities(tokens, used);
  const hasDrinkWords = catalogMatches.length > 0 || serveMatches.length > 0;
  if (!hasDrinkWords) {
    return [{ text, item: null, mixerOnly: false, empty: q.leftovers.length === 0 }];
  }

  const typosOf = (m: Match | undefined) => m?.typos ?? 0;
  const score = (m: Match) => m.phrase.tokens.length * 10 + m.phrase.joined.length * 0.1 + (m.phrase.entry!.brand ? 3 : 0) - m.typos * 4;
  const best = [...alcoholic].sort((a, b) => score(b) - score(a))[0];
  const nonAlc = catalogMatches.filter((m) => !isAlcoholic(m.phrase.entry!));
  const negator = nonAlc.find((m) => m.phrase.entry!.id === "na_mocktail");

  const serveMatch = serveMatches.find((m) => m.phrase.kind === "serve");
  const serve = serveMatch?.phrase.serve ?? null;
  const pack = serveMatches.find((m) => m.phrase.kind === "pack")?.phrase.packCount ?? null;

  let entry: CatalogEntry | undefined = best?.phrase.entry;
  let confidence = entry ? (entry.brand ? 0.95 : entry.category === "cocktail" ? 0.8 : 0.85) : 0.6;

  // "a schooner" = full-strength beer, "3 shots" = spirits, "a glass" = wine. A named soft drink
  // wins over a serve ("a cup of tea", "a pint of lemonade") except for spirit measures
  // ("a double with coke").
  const impliesSpirit = serve?.impliesCategory === "spirit";
  if (!entry && serve?.impliesCategory && (nonAlc.length === 0 || impliesSpirit)) {
    entry = index.genericByCategory[serve.impliesCategory];
  }
  if (!entry && pack) entry = index.genericByCategory.beer; // "a slab"
  if (!entry && nonAlc.length > 0) {
    const mixer = nonAlc[0]!.phrase.entry!;
    if (mixer.isMixer === true && !negator) {
      return [{ text, item: null, mixerOnly: true, empty: false, mixer }];
    }
    entry = mixer;
    confidence = 0.9;
  }
  if (!entry) {
    // Only an unsized container ("a bottle"): let the AI or the user decide.
    return [{ text, item: null, mixerOnly: false, empty: false }];
  }

  // A can of a spirit is a premix: "a can of jack daniels".
  let name = entry.name;
  let category: Category = entry.category;
  let abv = entry.abv;
  let serveMl = entry.serveMl;
  if ((entry.category === "spirit" || entry.category === "liqueur") && (serve?.id === "can" || serve?.id === "tallboy")) {
    const premix = index.genericByCategory.rtd;
    name = `${entry.brand ? entry.name : entry.name} premix`;
    category = "rtd";
    abv = premix?.abv ?? 4.8;
    serveMl = serve.id === "tallboy" ? 500 : (premix?.serveMl ?? 375);
  }
  const effective: CatalogEntry = { ...entry, category, abv, serveMl };
  const { volumeMl: rawVolume, assumed: volumeAssumed } =
    category === "rtd" && entry.category !== "rtd" ? { volumeMl: serveMl, assumed: false } : resolveVolume(effective, serve, q.volumeMl);

  const assumed: ParsedItem["assumed"] = [];
  if (volumeAssumed) assumed.push("volume");

  if (q.abv !== null) {
    abv = q.abv;
  } else if (q.negated || negator) {
    abv = 0;
    category = "non_alcoholic";
    name = entry.category === "non_alcoholic" ? name : `${name} (non-alcoholic)`;
  } else if (!entry.brand) {
    assumed.push("abv");
  }

  // Count: the largest explicit number wins ("3 or 4" was already folded to 4); fractions multiply.
  let count = q.counts.length > 0 ? Math.max(...q.counts.map((c) => c.value)) : 1;
  if (q.counts.length === 0 && q.fractions.length === 0 && !pack) assumed.push("count");
  for (const f of q.fractions) count *= f;
  if (pack) count *= pack;

  count = clamp(count, LIMITS.count.min, LIMITS.count.max);
  const volumeMl = clamp(rawVolume, LIMITS.volumeMl.min, LIMITS.volumeMl.max);
  abv = clamp(abv, LIMITS.abv.min, LIMITS.abv.max);

  confidence -= 0.1 * (typosOf(best) + typosOf(serveMatch));
  if (q.leftovers.length > 0) confidence -= 0.05;
  if (!best) confidence = Math.min(confidence, 0.65);

  const item: ParsedItem = {
    name,
    category,
    brand: entry.brand,
    volumeMl: Math.round(volumeMl * 10) / 10,
    abv,
    count: Math.round(count * 100) / 100,
    standards: computeStandards(count, volumeMl, abv),
    confidence: Math.round(clamp(confidence, 0.1, 1) * 100) / 100,
    source: "catalog",
    catalogId: entry.id,
    assumed,
  };
  return [{ text, item, mixerOnly: false, empty: false }];
}

export interface CatalogParse {
  items: ParsedItem[];
  /** Segments that looked like drinks but could not be understood. */
  unparsed: string[];
  /** True if every understood segment was a mixer / non-alcoholic drink. */
  onlyNonAlcoholic: boolean;
}

export function parseWithCatalog(text: string, index: CatalogIndex): CatalogParse {
  const norm = preprocess(text, index);
  const segments = splitSegments(norm).flatMap((s) => parseSegment(s, index));

  const items: ParsedItem[] = [];
  const unparsed: string[] = [];
  const mixers: SegmentParse[] = [];
  for (const seg of segments) {
    if (seg.item) items.push(seg.item);
    else if (seg.mixerOnly) mixers.push(seg);
    else if (!seg.empty) unparsed.push(seg.text);
  }
  // Nothing recognisable at all ("drinks"): hand the whole text on rather than reporting zero.
  if (items.length === 0 && unparsed.length === 0 && mixers.length === 0) unparsed.push(norm);
  // Mixers next to a spirit are absorbed ("rum and coke"); on their own ("a coke") they are a
  // non-alcoholic drink.
  if (items.length === 0 && unparsed.length === 0) {
    for (const { mixer } of mixers) {
      if (!mixer) continue;
      items.push({
        name: mixer.name, category: "non_alcoholic", brand: null, volumeMl: mixer.serveMl, abv: 0, count: 1,
        standards: 0, confidence: 0.9, source: "catalog", catalogId: mixer.id, assumed: ["volume", "count"],
      });
    }
  }
  const onlyNonAlcoholic = items.every((i) => i.standards === 0) && unparsed.length === 0 && (items.length > 0 || mixers.length > 0);
  return { items, unparsed, onlyNonAlcoholic };
}

/** Best catalog entry for a free-text name (used to sanity-check AI output). */
export function lookupEntry(text: string, index: CatalogIndex): CatalogEntry | null {
  const tokens = tokenise(protectAnd(normaliseText(text)));
  const used = tokens.map(() => false);
  const matches: Match[] = [];
  findExact(tokens, used, index.catalogPhrases, matches);
  findFuzzy(tokens, used, index.catalogPhrases, matches);
  const alcoholic = matches.filter((m) => isAlcoholic(m.phrase.entry!));
  const pick = (alcoholic.length > 0 ? alcoholic : matches).sort(
    (a, b) => Number(!!b.phrase.entry!.brand) - Number(!!a.phrase.entry!.brand) || b.phrase.tokens.length - a.phrase.tokens.length,
  )[0];
  return pick?.phrase.entry ?? null;
}
