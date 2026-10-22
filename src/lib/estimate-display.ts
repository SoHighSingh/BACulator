import { formatClock } from "./format-clock";
import { calculateBAC, findTimeToTarget, simulateNight, type NightSimulation } from "~/lib/bac-calculator";
import type { BACResult, Drink } from "~/types/bac";

// The model is an estimate. Widmark predictions vary with a CV of about 20% between people and
// nights (Gullberg 2007; Searle 2015), so a "likely" range is roughly 0.75× to 1.4× of the point,
// skewed high because under-reading is the dangerous direction.
export const BAND_LOW = 0.75;
export const BAND_HIGH = 1.4;
// Elimination runs about 0.010–0.025 g/dL/h around the model's 0.015 (Jones 2010), so a slow
// eliminator reaches zero about 1.5× later than the model; body-water variance stretches that further.
// The screen shows the model's own time (user decision, 23 Oct 2026: a 0.75–1.6× window ran to six
// hours and was useless; "it's a prediction and we have clarified that"); ZERO_LATE only keeps the
// model's own slow-eliminator tail.
const ZERO_LATE = 1.6;
const FIVE_MIN_MS = 5 * 60 * 1000;
// One threshold for every region (stricter than the US 0.08). User decision, 18 Oct 2026 late: the
// screen goes red when the shown number reaches it, and the hazard key appears once the top of the
// likely range reaches it. Neither is framed as a driving or legal state.
export const ALERT_AT = 0.05;
// The headline is drawn to three places (user decision, 22 Oct 2026: a small live third digit),
// rounded UP, so red starts once the model passes 0.049 and ends when it is back to 0.049 or less.
const RED_ENDS_AT = ALERT_AT - 0.001;

export interface EstimateDisplay {
  /** The headline number: "0.07", "under 0.01" or "0.00" */
  point: string;
  /** The likely range around it: "0.05–0.08", "under 0.01" or "0.00" */
  band: string;
  status: "rising" | "falling" | "none";
  /** "about 3:45 am", or null when nothing is left to wear off */
  backToZero: string | null;
  /**
   * When the red field ends, the same way: "about 1:10 am". Null when the shown number is under
   * 0.05 and stays there, or is still above at the model's horizon.
   */
  belowAlert: string | null;
  /** True whenever any alcohol is counted, including drinks still being absorbed */
  notSafeToDrive: boolean;
}

const floor2 = (n: number) => Math.floor(n * 100) / 100;
const ceil2 = (n: number) => Math.ceil(n * 100) / 100;
/** The model in thousandths, rounded UP: 0.0963 → 97. The epsilon absorbs float noise (0.07 × 1000). */
const shownMilli = (bac: number) => Math.ceil(bac * 1000 - 1e-6);

/**
 * One number for the headline, rounded UP to two places: 0.0549 shows 0.06, never 0.05, so the
 * headline never reads lower than the model. The range under it carries the doubt.
 */
export function formatPoint(bac: number): string {
  if (bac <= 0) return "0.00";
  if (bac < 0.01) return "under 0.01";
  return ceil2(bac - 1e-9).toFixed(2);
}

/**
 * The headline as drawn: the model rounded UP at the third place, split into the big two places and
 * a small third digit ("0.09" + "7" for 0.0963). Both come from one rounded value, so the three
 * digits never contradict each other and never read lower than the model. Under 0.01 it reads
 * 0.00 with its small digit (0.004 → "0.00" + "4"), the same shape as the rest of the night; only
 * zero has no small digit. Screen readers keep the two-place `aboutPoint` ("about 0.10"): voice
 * never reads a three-decimal figure.
 */
export function displayPoint(bac: number): { big: string; small: string | null } {
  if (bac <= 0) return { big: "0.00", small: null };
  const shown = (shownMilli(bac) / 1000).toFixed(3);
  return { big: shown.slice(0, -1), small: shown.slice(-1) };
}

/**
 * The headline split for display: ["about", "0.08"], or [null, "under 0.01"] / [null, "0.00"] where
 * "about" would read wrongly ("about under 0.01").
 */
export function aboutPoint(bac: number): [string | null, string] {
  const point = formatPoint(bac);
  return [bac >= 0.01 ? "about" : null, point];
}

export function formatBand(bac: number): string {
  if (bac <= 0) return "0.00";
  if (bac < 0.01) return "under 0.01";
  const low = floor2(bac * BAND_LOW);
  const high = Math.max(ceil2(bac * BAND_HIGH), low + 0.01);
  return `${low.toFixed(2)}–${high.toFixed(2)}`;
}

/**
 * Red: the headline as drawn, three places rounded up (`displayPoint`), is 0.050 or more, so the
 * colour always matches what's printed: 0.0491 draws 0.05|0 and is red; 0.049 draws 0.04|9 and isn't.
 */
export function isAlert(bac: number | null): boolean {
  return bac !== null && bac >= 0.01 && shownMilli(bac) >= Math.round(ALERT_AT * 1000);
}

/** The hazard key: the top of the likely range as shown ("Likely X to Y", Y rounded up) is ALERT_AT or more. */
export function isHazard(bac: number | null): boolean {
  if (bac === null || bac < 0.01) return false;
  const low = floor2(bac * BAND_LOW);
  return Math.max(ceil2(bac * BAND_HIGH), low + 0.01) >= ALERT_AT;
}

/**
 * The model's own time for it, rounded UP to five minutes (never earlier than the model says), with
 * "about": "about 3:45 am". Null when nothing is left to wear off.
 */
export function formatBackToZero(hoursToZero: number, now: Date): string | null {
  if (hoursToZero <= 0) return null;
  const at = Math.ceil((now.getTime() + hoursToZero * 3_600_000) / FIVE_MIN_MS) * FIVE_MIN_MS;
  return `about ${formatClock(new Date(at), { period: true })}`;
}

/**
 * @param hoursBelowAlert hours until the drawn number is under 0.050 for good (0: under now and
 * staying there; -1: still above at the model's horizon, so no window is shown).
 */
export function describeEstimate(result: BACResult, drinks: Drink[], now: Date, hoursBelowAlert = 0): EstimateDisplay {
  const counted = drinks.some((d) => new Date(d.finishedAt).getTime() <= now.getTime());
  const status = result.isRising ? "rising" : result.currentBAC > 0 ? "falling" : "none";
  return {
    point: formatPoint(result.currentBAC),
    band: formatBand(result.currentBAC),
    status,
    backToZero: formatBackToZero(result.timeToSober, now),
    belowAlert: hoursBelowAlert > 0 ? formatBackToZero(hoursBelowAlert, now) : null,
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
   * True whenever any drink is counted and either there's no estimate, the model is above zero,
   * or we're still inside the slow-eliminator tail after the model reaches zero. The night UI no
   * longer shows anything for it (user decision, 18 Oct 2026 late); it stays for the model's own use.
   */
  notSafeToDrive: boolean;
  /** Red field, red mark, red favicon: the shown number is ALERT_AT (0.05) or more. */
  alert: boolean;
  /** The hazard key beside the mark: the top of the likely range is ALERT_AT or more. */
  hazard: boolean;
  simulation: NightSimulation | null;
}

/** Everything the night screen shows about the estimate, from one simulation. */
export function describeNight(drinks: Drink[], userWeight: number | null, userSex: string | null, now: Date): NightModel {
  const counted = drinks.filter((d) => new Date(d.finishedAt).getTime() <= now.getTime());
  const hasDrinks = counted.length > 0;
  const result = calculateBAC({ drinks, userWeight, userSex, currentTime: now });
  const simulation = userWeight && userSex ? simulateNight(drinks, userWeight, userSex, now) : null;

  if (!result) {
    return { hasDrinks, estimate: null, bac: null, peak: null, notSafeToDrive: hasDrinks, alert: false, hazard: false, simulation };
  }

  // When the red field ends: after the last moment the model is above 0.049 (`RED_ENDS_AT`), which
  // is exactly when the drawn three-place number drops under 0.050, so the row and the colour agree.
  const hoursBelowAlert = userWeight && userSex ? findTimeToTarget(drinks, userWeight, userSex.toLowerCase(), now, RED_ENDS_AT) : 0;
  const estimate = describeEstimate(result, drinks, now, hoursBelowAlert);
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
    alert: hasDrinks && isAlert(result.currentBAC),
    hazard: hasDrinks && isHazard(result.currentBAC),
    simulation,
  };
}
