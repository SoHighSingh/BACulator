/** Density of ethanol in g/ml. */
export const ETHANOL_DENSITY = 0.789;
/** One Australian standard drink is 10 g of ethanol. */
export const GRAMS_PER_STANDARD = 10;

export const LIMITS = {
  abv: { min: 0, max: 95 }, // Everclear and other rectified spirits are 95%
  volumeMl: { min: 15, max: 2000 },
  count: { min: 0.25, max: 48 },
} as const;

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Rounds up to the next 0.1 so a drink is never under-counted (1.61 -> 1.7, 1.6 -> 1.6). */
export function roundUpToTenth(value: number) {
  // The epsilon stops floating-point noise (1.6000000001) from bumping a value up a tenth.
  return Math.max(0, Math.ceil(value * 10 - 1e-6) / 10);
}

/** Unrounded standard drinks: count × ml × abv/100 × 0.789 / 10. */
export function rawStandards(count: number, volumeMl: number, abv: number) {
  return (count * volumeMl * (abv / 100) * ETHANOL_DENSITY) / GRAMS_PER_STANDARD;
}

export function computeStandards(count: number, volumeMl: number, abv: number) {
  return roundUpToTenth(rawStandards(count, volumeMl, abv));
}
