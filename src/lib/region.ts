import { rawStandards } from "./drinks/standards";

/**
 * Where the user drinks decides what "one standard drink" means, how weight and volume are written,
 * and which serves are on the quick-pick chips. The emergency number is not part of a region: it
 * follows where the phone is (lib/emergency).
 *
 * Storage and the BAC engine always work in 10 g standards (see GRAMS_PER_STANDARD). A region only
 * changes how those numbers are shown and entered, so switching region never rewrites anyone's data.
 */
export type RegionId = "metric" | "us";

export interface Serve {
  label: string;
  volumeMl: number;
  abv: number;
}

export interface Region {
  id: RegionId;
  /** Shown in the settings picker. No country names in copy beyond "US". */
  label: string;
  gramsPerStandard: number;
  weightUnit: "kg" | "lb";
  volumeUnit: "ml" | "oz";
  /** Example for the free-text drink box, in the region's own words. */
  example: string;
  serves: Serve[];
}

const ML_PER_US_OZ = 29.5735;
const LB_PER_KG = 2.20462;
const STORED_GRAMS_PER_STANDARD = 10;

export const REGIONS: Record<RegionId, Region> = {
  metric: {
    id: "metric",
    label: "10 g standard drink · kg · ml",
    gramsPerStandard: 10,
    weightUnit: "kg",
    volumeUnit: "ml",
    example: "e.g. 2 schooners of lager",
    serves: [
      { label: "Schooner of beer", volumeMl: 425, abv: 4.8 },
      { label: "Pint of beer", volumeMl: 570, abv: 4.8 },
      { label: "Can, stubby or premix", volumeMl: 375, abv: 4.8 },
      { label: "Glass of wine", volumeMl: 150, abv: 13.5 },
      { label: "Nip of spirits", volumeMl: 30, abv: 40 },
      { label: "Cocktail", volumeMl: 150, abv: 15.8 },
    ],
  },
  us: {
    id: "us",
    label: "US: 14 g standard drink · lb · oz",
    gramsPerStandard: 14,
    weightUnit: "lb",
    volumeUnit: "oz",
    example: "e.g. 2 Bud Lights",
    serves: [
      { label: "Can or bottle of beer", volumeMl: 355, abv: 5 },
      { label: "Pint of beer", volumeMl: 473, abv: 5 },
      { label: "Hard seltzer", volumeMl: 355, abv: 5 },
      { label: "Glass of wine", volumeMl: 148, abv: 12 },
      { label: "Shot of liquor", volumeMl: 44, abv: 40 },
      { label: "Cocktail", volumeMl: 150, abv: 15.8 },
    ],
  },
};

export const REGION_IDS = Object.keys(REGIONS) as RegionId[];

/** Best guess from the browser language; the user can change it in their details. */
export function guessRegion(languages: readonly string[] | undefined): RegionId {
  const first = languages?.[0]?.toLowerCase() ?? "";
  return first === "en-us" || first.endsWith("-us") ? "us" : "metric";
}

export function isRegionId(value: unknown): value is RegionId {
  return typeof value === "string" && Object.hasOwn(REGIONS, value);
}

/** Stored 10 g standards → this region's standard drinks. */
export const toRegionStandards = (stored: number, region: Region) =>
  (stored * STORED_GRAMS_PER_STANDARD) / region.gramsPerStandard;

/** This region's standard drinks → stored 10 g standards. */
export const fromRegionStandards = (shown: number, region: Region) =>
  (shown * region.gramsPerStandard) / STORED_GRAMS_PER_STANDARD;

/** "425 ml" or "12 oz" */
export function formatVolume(ml: number, region: Region): string {
  if (region.volumeUnit === "oz") return `${Math.round((ml / ML_PER_US_OZ) * 10) / 10} oz`;
  return `${Math.round(ml * 10) / 10} ml`;
}

export const kgToRegionWeight = (kg: number, region: Region) =>
  region.weightUnit === "lb" ? Math.round(kg * LB_PER_KG * 10) / 10 : kg;

export const regionWeightToKg = (weight: number, region: Region) =>
  region.weightUnit === "lb" ? Math.round((weight / LB_PER_KG) * 10) / 10 : weight;

/**
 * Quick-pick serves with their stored (10 g) standards, rounded up to hundredths: rounding up to
 * tenths in 10 g units turned a 12 oz US beer (14.0 g) into "1.1" US standard drinks.
 */
export const servesFor = (region: Region) =>
  region.serves.map((s) => ({
    ...s,
    standards: Math.ceil(rawStandards(1, s.volumeMl, s.abv) * 100 - 1e-6) / 100,
  }));
