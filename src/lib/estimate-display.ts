import { calculateBAC, simulateNight, type NightSimulation } from "~/lib/bac-calculator";
import type { BACResult, Drink } from "~/types/bac";

// The model is an estimate. Widmark predictions vary with a CV of about 20% between people and
// nights (Gullberg 2007; Searle 2015), so a "likely" range is roughly 0.75× to 1.4× of the point,
// skewed high because under-reading is the dangerous direction.
const BAND_LOW = 0.75;
const BAND_HIGH = 1.4;
// Elimination runs about 0.010–0.025 g/dL/h around the model's 0.015 (Jones 2010), so a slow
// eliminator reaches zero about 1.5× later than the model; body-water variance stretches that further.
const ZERO_EARLY = 0.75;
const ZERO_LATE = 1.6;
const QUARTER_HOUR_MS = 15 * 60 * 1000;

export interface EstimateDisplay {
  /** The headline number: "0.07", "under 0.01" or "0.00" */
  point: string;
  /** The likely range around it: "0.05–0.08", "under 0.01" or "0.00" */
  band: string;
  status: "rising" | "falling" | "none";
  /** "between 2:30 and 4:00 am", or null when nothing is left to wear off */
  backToZero: string | null;
  /** True whenever any alcohol is counted, including drinks still being absorbed */
  notSafeToDrive: boolean;
}

const floor2 = (n: number) => Math.floor(n * 100) / 100;
const ceil2 = (n: number) => Math.ceil(n * 100) / 100;

/**
 * One number for the headline, rounded UP to two places: 0.0549 shows 0.06, never 0.05, so the
 * headline never reads lower than the model. The range under it carries the doubt.
 */
export function formatPoint(bac: number): string {
  if (bac <= 0) return "0.00";
  if (bac < 0.01) return "under 0.01";
  return ceil2(bac - 1e-9).toFixed(2);
}

export function formatBand(bac: number): string {
  if (bac <= 0) return "0.00";
  if (bac < 0.01) return "under 0.01";
  const low = floor2(bac * BAND_LOW);
  const high = Math.max(ceil2(bac * BAND_HIGH), low + 0.01);
  return `${low.toFixed(2)}–${high.toFixed(2)}`;
}

function roundToQuarterHour(ms: number) {
  return new Date(Math.round(ms / QUARTER_HOUR_MS) * QUARTER_HOUR_MS);
}

function clockTime(date: Date, withPeriod: boolean) {
  const text = date.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true });
  return withPeriod ? text.replace(/\s?([ap])\.?m\.?/i, " $1m").toLowerCase() : text.replace(/\s?[ap]\.?m\.?/i, "");
}

export function formatBackToZero(hoursToZero: number, now: Date): string | null {
  if (hoursToZero <= 0) return null;
  const early = roundToQuarterHour(now.getTime() + hoursToZero * ZERO_EARLY * 3_600_000);
  const late = roundToQuarterHour(now.getTime() + hoursToZero * ZERO_LATE * 3_600_000);
  const samePeriod = early.getHours() < 12 === late.getHours() < 12;
  return `between ${clockTime(early, !samePeriod)} and ${clockTime(late, true)}`;
}

export function describeEstimate(result: BACResult, drinks: Drink[], now: Date): EstimateDisplay {
  const counted = drinks.some((d) => new Date(d.finishedAt).getTime() <= now.getTime());
  const status = result.isRising ? "rising" : result.currentBAC > 0 ? "falling" : "none";
  return {
    point: formatPoint(result.currentBAC),
    band: formatBand(result.currentBAC),
    status,
    backToZero: formatBackToZero(result.timeToSober, now),
    notSafeToDrive: counted && (result.currentBAC > 0 || result.isRising),
  };
}

/** "Schooner of lager", or "1.5 std drink" for a drink entered by number only */
export function drinkLabel(
  drink: Pick<Drink, "standards"> & { name?: string | null },
  std: (stored: number) => string = formatStandards,
): string {
  return drink.name?.trim() ? drink.name : `${std(drink.standards)} std drink`;
}

export function formatStandards(standards: number): string {
  return (Math.round(standards * 10) / 10).toFixed(1);
}

/** "6 min ago", "1 h 20 min ago", "just now" */
export function timeAgo(date: Date, now: Date): string {
  const minutes = Math.max(0, Math.round((now.getTime() - date.getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min ago` : `${hours} h ago`;
}

export interface NightModel {
  /** Any drink counted in the window (finished, not in the future). */
  hasDrinks: boolean;
  /** Null when weight or sex is missing: drinks still count for the driving warning. */
  estimate: EstimateDisplay | null;
  bac: number | null;
  /** Peak still to come from drinks being absorbed. */
  peak: { bac: number; at: Date } | null;
  /**
   * Shown whenever any drink is counted and either there's no estimate, the model is above zero,
   * or we're still inside the slow-eliminator tail after the model reaches zero.
   */
  notSafeToDrive: boolean;
  simulation: NightSimulation | null;
}

/** Everything the night screen shows about the estimate, from one simulation. */
export function describeNight(drinks: Drink[], userWeight: number | null, userSex: string | null, now: Date): NightModel {
  const counted = drinks.filter((d) => new Date(d.finishedAt).getTime() <= now.getTime());
  const hasDrinks = counted.length > 0;
  const result = calculateBAC({ drinks, userWeight, userSex, currentTime: now });
  const simulation = userWeight && userSex ? simulateNight(drinks, userWeight, userSex, now) : null;

  if (!result) {
    return { hasDrinks, estimate: null, bac: null, peak: null, notSafeToDrive: hasDrinks, simulation };
  }

  const estimate = describeEstimate(result, drinks, now);
  const peak =
    result.timeToPeak > 0 && result.peakBAC > result.currentBAC
      ? { bac: result.peakBAC, at: new Date(now.getTime() + result.timeToPeak * 3_600_000) }
      : null;

  // After the model hits zero, keep the warning for the slow-eliminator tail of the night.
  let inTail = false;
  const first = counted.reduce((min, d) => Math.min(min, new Date(d.finishedAt).getTime()), Infinity);
  if (simulation?.zeroAt && Number.isFinite(first) && now.getTime() >= simulation.zeroAt) {
    const lateZero = first + (simulation.zeroAt - first) * ZERO_LATE;
    inTail = now.getTime() < lateZero;
  }

  return {
    hasDrinks,
    estimate,
    bac: result.currentBAC,
    peak,
    notSafeToDrive: hasDrinks && (estimate.notSafeToDrive || inTail),
    simulation,
  };
}
