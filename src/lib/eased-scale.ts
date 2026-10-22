/**
 * Smooth, eased sliders: a thumb position t in [0, 1] maps to a value through an exponential
 * curve, fine near the start (a minute near now, a tenth of a drink) and coarse further out, with
 * no kinks where the value per pixel suddenly jumps. The thumb follows the finger continuously;
 * only the value is rounded, to a step people say out loud, and the thumb settles there on release.
 *
 *   value(t) = min + (max − min) · (e^{kt} − 1) / (e^k − 1)
 *
 * Pure functions, no DOM.
 */
export interface EasedScale {
  min: number;
  max: number;
  /** The value at a thumb position (not rounded). */
  fromT(t: number): number;
  /** The thumb position for a value, clamped to [0, 1]. */
  toT(value: number): number;
  /** The nearest value people would say: the scale's step for that size. */
  round(value: number): number;
  /** One step up (+1) or down (−1) from a value, rounded and clamped. */
  step(value: number, by: 1 | -1): number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const tidy = (v: number) => Math.round(v * 1e6) / 1e6;

export function easedScale({ min, max, k, stepAt }: { min: number; max: number; k: number; stepAt: (value: number) => number }): EasedScale {
  const span = max - min;
  const ek = Math.expm1(k);
  const round = (value: number) => {
    const v = clamp(value, min, max);
    const s = stepAt(v);
    return tidy(clamp(Math.round(v / s) * s, min, max));
  };
  return {
    min,
    max,
    fromT: (t) => min + (span * Math.expm1(k * clamp(t, 0, 1))) / ek,
    toT: (value) => clamp(Math.log1p(((clamp(value, min, max) - min) * ek) / span) / k, 0, 1),
    round,
    step: (value, by) => {
      const v = round(value);
      // Step by the size of the step on the side being moved to, so 3.0 − 0.1 = 2.9 and 2.9 + 0.1 = 3.0.
      const s = by > 0 ? stepAt(v) : stepAt(tidy(v - stepAt(v) / 2));
      return round(v + by * s);
    },
  };
}

/**
 * How long ago a drink was finished, in minutes, back to 12 h: about 0.7 min per pixel near now
 * and 14 at 12 h on a phone-wide track. Rounded to the minute under an hour, then to 5 minutes.
 */
export const minutesAgoEased = easedScale({ min: 0, max: 720, k: 3, stepAt: (m) => (m < 60 ? 1 : 5) });

/**
 * Standard drinks (in the region's own standard) on the slider, a tenth to 10; above that, type it.
 * Tenths under 3, halves above. The midpoint is about 2.5.
 */
export const standardsEased = easedScale({ min: 0.1, max: 10, k: 2.3, stepAt: (v) => (v < 3 ? 0.1 : 0.5) });
