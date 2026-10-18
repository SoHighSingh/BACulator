import type { RegionId } from "../region";
import type { ServeSize } from "./types";

// Australian serve sizes. Seeded into the ServeSize table by scripts/build-catalog-sql.ts.
// Sources:
//  - Glass names and volumes by state: https://en.wikipedia.org/wiki/Beer_in_Australia#Beer_glasses
//  - 150 ml wine glass, 30 ml nip, 375 ml can/stubby, 750 ml longneck:
//    https://www.health.gov.au/topics/alcohol/about-alcohol/standard-drinks-guide
const GLASSES = "https://en.wikipedia.org/wiki/Beer_in_Australia#Beer_glasses";
const HEALTH = "https://www.health.gov.au/topics/alcohol/about-alcohol/standard-drinks-guide";
// US shot / jigger 1.5 fl oz: https://www.niaaa.nih.gov/alcohols-effects-health/what-standard-drink
const NIAAA = "https://www.niaaa.nih.gov/alcohols-effects-health/what-standard-drink";
// A "handle" is a 1.75 L bottle: https://en.wikipedia.org/wiki/Alcohol_measurements#Bottles
const US_HANDLE = "https://en.wikipedia.org/wiki/Alcohol_measurements#Bottles";

export const SERVE_SIZES: ServeSize[] = [
  // Region-specific names first so "sa pint" wins over "pint".
  { id: "sa_pint", name: "SA pint", kind: "measure", volumeMl: 425, impliesCategory: "beer",
    aliases: ["sa pint", "south australian pint", "adelaide pint", "pint in adelaide", "pint in sa"], sourceUrl: GLASSES },
  { id: "sa_schooner", name: "SA schooner", kind: "measure", volumeMl: 285, impliesCategory: "beer",
    aliases: ["sa schooner", "south australian schooner", "adelaide schooner", "schooner in adelaide", "schooner in sa"], sourceUrl: GLASSES },
  { id: "pot", name: "Pot / middy", kind: "measure", volumeMl: 285, impliesCategory: "beer",
    aliases: ["pot", "middy", "middie", "half pint"], sourceUrl: GLASSES },
  // "Handle" is a beer glass in the NT and New Zealand, but a 1.75 L bottle of spirits in the US.
  // Read as the larger of the two beer glasses unless the drink is a spirit.
  { id: "handle", name: "Handle", kind: "container", volumeMl: 425, impliesCategory: "beer",
    categoryMl: { beer: 425, cider: 425, spirit: 1750, liqueur: 1750 }, aliases: ["handle"], sourceUrl: US_HANDLE },
  { id: "schooner", name: "Schooner", kind: "measure", volumeMl: 425, impliesCategory: "beer",
    aliases: ["schooner", "schooey", "schooie", "schooy", "schoonie", "schoon"], sourceUrl: GLASSES },
  { id: "pint", name: "Pint", kind: "measure", volumeMl: 570, impliesCategory: "beer",
    aliases: ["pint", "pinty", "imperial pint"], sourceUrl: GLASSES },
  { id: "pony", name: "Pony", kind: "measure", volumeMl: 140, impliesCategory: "beer", aliases: ["pony"], sourceUrl: GLASSES },
  { id: "butcher", name: "Butcher", kind: "measure", volumeMl: 200, impliesCategory: "beer", aliases: ["butcher"], sourceUrl: GLASSES },
  { id: "jug", name: "Jug", kind: "measure", volumeMl: 1140, impliesCategory: "beer", aliases: ["jug", "pitcher"], sourceUrl: GLASSES },
  { id: "stubby", name: "Can / stubby", kind: "measure", volumeMl: 375, impliesCategory: "beer",
    aliases: ["stubby", "stubbie", "tinny", "tinnie", "tin"], sourceUrl: HEALTH },
  { id: "longneck", name: "Longneck", kind: "measure", volumeMl: 750, impliesCategory: "beer",
    aliases: ["longneck", "long neck", "longy", "longie", "tallie", "tally", "king brown"], sourceUrl: HEALTH },
  { id: "tallboy", name: "Tall can", kind: "measure", volumeMl: 500, aliases: ["tall can", "tallboy", "tall boy", "big can"], sourceUrl: null },
  { id: "can", name: "Can", kind: "container", volumeMl: 375, impliesCategory: "beer",
    categoryMl: { beer: 375, cider: 375, rtd: 375, non_alcoholic: 375 }, aliases: ["can"], sourceUrl: HEALTH },
  { id: "bottle", name: "Bottle", kind: "container", volumeMl: 750,
    categoryMl: { beer: 375, cider: 375, rtd: 330, wine: 750, sparkling: 750, fortified: 750, spirit: 700, liqueur: 700, soju_sake: 360, cocktail: 330 },
    aliases: ["bottle", "bottl", "btl", "botle"], sourceUrl: HEALTH },
  { id: "large_glass", name: "Large glass", kind: "container", volumeMl: 250, impliesCategory: "wine",
    categoryMl: { wine: 250, sparkling: 200, beer: 570, cider: 570, spirit: 60, liqueur: 90 },
    aliases: ["large glass", "big glass", "generous glass", "large pour", "big pour"], sourceUrl: null },
  { id: "small_glass", name: "Small glass", kind: "container", volumeMl: 100, impliesCategory: "wine",
    categoryMl: { wine: 100, sparkling: 100, beer: 285, cider: 285 },
    aliases: ["small glass", "little glass", "taster", "tasting"], sourceUrl: null },
  { id: "glass", name: "Glass", kind: "container", volumeMl: 150, impliesCategory: "wine",
    categoryMl: { wine: 150, sparkling: 150, fortified: 60, beer: 425, cider: 425, spirit: 60, liqueur: 60, soju_sake: 50, rtd: 330 },
    aliases: ["glass", "glas", "wine glass", "goblet", "flute", "cup"], sourceUrl: HEALTH },
  { id: "carafe", name: "Carafe", kind: "measure", volumeMl: 500, impliesCategory: "wine", aliases: ["carafe", "decanter"], sourceUrl: null },
  { id: "cask", name: "Goon sack", kind: "measure", volumeMl: 2000, impliesCategory: "wine", aliases: ["goon sack", "goon bag", "cask"], sourceUrl: null },
  { id: "hip_flask", name: "Hip flask", kind: "measure", volumeMl: 200, impliesCategory: "spirit", aliases: ["hip flask", "flask"], sourceUrl: null },
  { id: "double", name: "Double", kind: "measure", volumeMl: 60, impliesCategory: "spirit", aliases: ["double", "double shot"], sourceUrl: HEALTH },
  { id: "triple", name: "Triple", kind: "measure", volumeMl: 90, impliesCategory: "spirit", aliases: ["triple"], sourceUrl: null },
  { id: "shot", name: "Shot / nip", kind: "measure", volumeMl: 30, impliesCategory: "spirit",
    aliases: ["shot", "nip", "shooter"], sourceUrl: HEALTH },
  // A jigger is a US bar measure: 1.5 US fl oz.
  { id: "jigger", name: "Jigger", kind: "measure", volumeMl: 44, impliesCategory: "spirit", aliases: ["jigger"], sourceUrl: NIAAA },
];

/**
 * US bar measures: a shot is 1.5 fl oz (44 ml), not the Australian 30 ml nip. Applied over the
 * serve list for people using US units (see servesForRegion).
 */
const US_MEASURES: Record<string, number> = { shot: 44, double: 88, triple: 132 };

/** The serve list for a region: Australian sizes, with US bar measures for the US. */
export function servesForRegion(serves: ServeSize[], region: RegionId): ServeSize[] {
  if (region !== "us") return serves;
  return serves.map((s) => (US_MEASURES[s.id] ? { ...s, volumeMl: US_MEASURES[s.id]!, sourceUrl: NIAAA } : s));
}

/** Multi-packs are counts, not volumes: "a six pack of vb" = 6 × VB. */
export const PACK_COUNTS: { aliases: string[]; count: number }[] = [
  { aliases: ["slab", "carton", "case"], count: 24 },
  { aliases: ["six pack", "6 pack", "sixer", "6pk"], count: 6 },
  { aliases: ["four pack", "4 pack", "4pk"], count: 4 },
  { aliases: ["ten pack", "10 pack"], count: 10 },
  { aliases: ["dozen"], count: 12 },
];
