/* eslint-disable @typescript-eslint/no-inferrable-types */
import type { Drink, BACResult, BACCalculationInputs } from "~/types/bac";

const CONFIG = {
  GRAMS_PER_STANDARD: 10.0,  // storage unit; regions (e.g. US 14 g) only convert for display
  ABSORPTION_TIME_MINUTES: 30.0, // ~95% absorbed after this long (used for "absorbing" status)
  ELIMINATION_RATE: 0.015,  // %BAC per hour, zero-order, only while BAC > 0
  ABSORPTION_CURVE_FACTOR: 3.0,  // ka = factor / absorption time (0.1/min, absorption half-life ~7 min)
  STEP_MINUTES: 1.0, // simulation resolution
  HORIZON_HOURS: 48.0, // how far ahead to predict
};

const MS_PER_MINUTE = 60 * 1000;
const MIN_BAC_THRESHOLD = 1e-6;
const ABSORPTION_RATE_PER_MINUTE = CONFIG.ABSORPTION_CURVE_FACTOR / CONFIG.ABSORPTION_TIME_MINUTES;
const ELIMINATION_PER_MINUTE = CONFIG.ELIMINATION_RATE / 60.0;

/**
 * Round to specified decimal places to maintain precision
 */
function roundToPrecision(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function distributionRatio(userSex: string): number {
  return userSex === 'male' ? 0.68 : 0.55;
}

/**
 * Widmark: %BAC contributed by fully absorbing `grams` of alcohol
 */
function gramsToBAC(grams: number, userWeight: number, userSex: string): number {
  return (grams / (userWeight * 1000.0 * distributionRatio(userSex))) * 100.0;
}

/**
 * Fraction of a drink absorbed `minutes` after it was finished (first-order, tends to 1)
 */
function absorbedFraction(minutes: number): number {
  if (minutes <= 0) return 0.0;
  return 1.0 - Math.exp(-ABSORPTION_RATE_PER_MINUTE * minutes);
}

/** Drinks with their times already in ms, so the per-minute loop never parses a date. */
type Prepared = { t: number; grams: number }[];
const prepared = new WeakMap<Drink[], Prepared>();
function prepare(drinks: Drink[]): Prepared {
  let p = prepared.get(drinks);
  if (!p) {
    p = drinks.map(d => ({ t: new Date(d.finishedAt).getTime(), grams: d.standards * CONFIG.GRAMS_PER_STANDARD }));
    prepared.set(drinks, p);
  }
  return p;
}

/**
 * Total %BAC worth of alcohol absorbed from all drinks by time `t` (ms), ignoring elimination
 */
function absorbedBACAt(drinks: Drink[], userWeight: number, userSex: string, t: number): number {
  let grams = 0.0;
  for (const drink of prepare(drinks)) {
    grams += drink.grams * absorbedFraction((t - drink.t) / MS_PER_MINUTE);
  }
  return gramsToBAC(grams, userWeight, userSex);
}

/**
 * Advance BAC by one interval: add alcohol absorbed during [from, to], then eliminate.
 * Elimination is clamped at zero, so the liver can't "bank" elimination while you're sober.
 */
function stepBAC(
  bac: number,
  drinks: Drink[],
  userWeight: number,
  userSex: string,
  from: number,
  to: number
): number {
  const absorbed = absorbedBACAt(drinks, userWeight, userSex, to) - absorbedBACAt(drinks, userWeight, userSex, from);
  const minutes = (to - from) / MS_PER_MINUTE;
  return Math.max(0.0, bac + absorbed - ELIMINATION_PER_MINUTE * minutes);
}

function earliestDrinkTime(drinks: Drink[]): number {
  return Math.min(...drinks.map(d => new Date(d.finishedAt).getTime()));
}

/**
 * Simulate BAC from the first drink, returning one value per STEP_MINUTES up to `endTime`.
 * timeline[i] is the BAC at startTime + i steps.
 */
function simulateTimeline(
  drinks: Drink[],
  userWeight: number,
  userSex: string,
  endTime: number
): { startTime: number; timeline: number[] } {
  const startTime = earliestDrinkTime(drinks);
  const stepMs = CONFIG.STEP_MINUTES * MS_PER_MINUTE;
  const timeline: number[] = [0.0];
  let bac = 0.0;
  for (let t = startTime; t < endTime; t += stepMs) {
    bac = stepBAC(bac, drinks, userWeight, userSex, t, t + stepMs);
    timeline.push(bac);
  }
  return { startTime, timeline };
}

/**
 * Calculate BAC at a specific time.
 * Steps forward from the first drink: each step adds newly absorbed alcohol and removes
 * 0.015%/h, never going below zero.
 */
export function calculateBACAtTime(
  drinks: Drink[],
  userWeight: number,
  userSex: string,
  targetTime: Date
): number {
  if (drinks.length === 0) return 0.0;

  const target = targetTime.getTime();
  const startTime = earliestDrinkTime(drinks);
  if (target <= startTime) return 0.0;

  const stepMs = CONFIG.STEP_MINUTES * MS_PER_MINUTE;
  let bac = 0.0;
  let t = startTime;
  while (t + stepMs <= target) {
    bac = stepBAC(bac, drinks, userWeight, userSex, t, t + stepMs);
    t += stepMs;
  }
  if (t < target) {
    bac = stepBAC(bac, drinks, userWeight, userSex, t, target);
  }

  return bac < MIN_BAC_THRESHOLD ? 0.0 : bac;
}

/**
 * Check if BAC is currently rising (any drinks still absorbing)
 */
function isBACRising(
  drinks: Drink[],
  currentTime: Date
): boolean {
  return drinks.some(drink => {
    const finishedTime = new Date(drink.finishedAt);
    const minutesSinceFinished = (currentTime.getTime() - finishedTime.getTime()) / (1000 * 60);
    return minutesSinceFinished >= 0 && minutesSinceFinished <= CONFIG.ABSORPTION_TIME_MINUTES;
  });
}

/**
 * Hours from `currentTime` until BAC is at or below `targetBAC` for good
 * (i.e. after the last future moment it is above target). 0 if it never goes above
 * target again, -1 if still above at the end of the prediction horizon.
 */
function hoursToTargetFromTimeline(
  timeline: number[],
  startTime: number,
  currentTime: number,
  targetBAC: number
): number {
  const stepMs = CONFIG.STEP_MINUTES * MS_PER_MINUTE;
  const firstIndex = Math.max(0, Math.ceil((currentTime - startTime) / stepMs));

  let lastAbove = -1;
  for (let i = firstIndex; i < timeline.length; i++) {
    if (timeline[i]! > targetBAC + MIN_BAC_THRESHOLD) lastAbove = i;
  }

  if (lastAbove === -1) return 0.0;
  if (lastAbove === timeline.length - 1) return -1;

  const crossingTime = startTime + (lastAbove + 1) * stepMs;
  return roundToPrecision(Math.max(0, crossingTime - currentTime) / (60 * MS_PER_MINUTE), 2);
}

function predictionEnd(drinks: Drink[], currentTime: Date): number {
  const lastDrink = Math.max(...drinks.map(d => new Date(d.finishedAt).getTime()));
  return Math.max(currentTime.getTime(), lastDrink) + CONFIG.HORIZON_HOURS * 60 * MS_PER_MINUTE;
}

/**
 * Find when BAC will drop to a target level
 * Handles case where BAC is rising and will exceed target
 */
export function findTimeToTarget(
  drinks: Drink[],
  userWeight: number,
  userSex: string,
  currentTime: Date,
  targetBAC: number
): number {
  if (drinks.length === 0) return 0.0;
  const { startTime, timeline } = simulateTimeline(drinks, userWeight, userSex, predictionEnd(drinks, currentTime));
  return hoursToTargetFromTimeline(timeline, startTime, currentTime.getTime(), targetBAC);
}

function peakFromTimeline(
  timeline: number[],
  startTime: number,
  currentTime: number
): { peakBAC: number; timeToPeak: number } {
  let peakIndex = 0;
  for (let i = 1; i < timeline.length; i++) {
    if (timeline[i]! > timeline[peakIndex]!) peakIndex = i;
  }
  const peakTime = startTime + peakIndex * CONFIG.STEP_MINUTES * MS_PER_MINUTE;
  return {
    peakBAC: roundToPrecision(timeline[peakIndex]!, 4),
    timeToPeak: roundToPrecision((peakTime - currentTime) / (60 * MS_PER_MINUTE), 2)
  };
}

/**
 * Find peak BAC and when it occurs.
 * timeToPeak is in hours relative to currentTime (negative if the peak has passed).
 */
export function findPeakBAC(
  drinks: Drink[],
  userWeight: number,
  userSex: string,
  currentTime: Date
): { peakBAC: number; timeToPeak: number } {
  if (drinks.length === 0) return { peakBAC: 0, timeToPeak: 0 };
  const { startTime, timeline } = simulateTimeline(drinks, userWeight, userSex, predictionEnd(drinks, currentTime));
  return peakFromTimeline(timeline, startTime, currentTime.getTime());
}

/**
 * Get the status of a drink at the current time
 */
export function getDrinkStatus(
  drink: Drink,
  currentTime: Date
): { status: 'not_started' | 'absorbing' | 'absorbed'; minutesToPeak: number } {
  const finishedTime = new Date(drink.finishedAt);
  const minutesSinceFinished = (currentTime.getTime() - finishedTime.getTime()) / (1000 * 60);

  if (minutesSinceFinished < 0) {
    return {
      status: 'not_started',
      minutesToPeak: roundToPrecision(Math.abs(minutesSinceFinished) + CONFIG.ABSORPTION_TIME_MINUTES, 1)
    };
  } else if (minutesSinceFinished <= CONFIG.ABSORPTION_TIME_MINUTES) {
    return {
      status: 'absorbing',
      minutesToPeak: roundToPrecision(CONFIG.ABSORPTION_TIME_MINUTES - minutesSinceFinished, 1)
    };
  } else {
    return { status: 'absorbed', minutesToPeak: 0.0 };
  }
}

/**
 * Calculate the BAC contribution from a single drink
 * This is used for display purposes to show individual drink contributions
 */
export function calculateDrinkContribution(
  drink: Drink,
  userWeight: number,
  userSex: string,
  currentTime: Date
): { bac: number; isAbsorbing: boolean; peakBAC: number; timeToPeak: number } {
  const status = getDrinkStatus(drink, currentTime);

  // This drink's full Widmark contribution once completely absorbed
  const theoreticalPeakBAC = gramsToBAC(drink.standards * CONFIG.GRAMS_PER_STANDARD, userWeight, userSex);

  const minutesSinceFinished = (currentTime.getTime() - new Date(drink.finishedAt).getTime()) / MS_PER_MINUTE;
  const currentContribution = theoreticalPeakBAC * absorbedFraction(minutesSinceFinished);

  // Note: We don't apply elimination here as that's handled at the total BAC level
  // This is just to show the drink's theoretical contribution

  return {
    bac: roundToPrecision(currentContribution, 4),
    isAbsorbing: status.status === 'absorbing',
    peakBAC: roundToPrecision(theoreticalPeakBAC, 4),
    timeToPeak: status.minutesToPeak
  };
}

function sampleTimeline(
  timeline: number[],
  startTime: number,
  currentTime: number,
  hoursToShow: number
): Array<{ hour: number; bac: number }> {
  let intervalMinutes: number;
  if (hoursToShow <= 6) {
    intervalMinutes = 5;  // Every 5 minutes for short range
  } else if (hoursToShow <= 24) {
    intervalMinutes = 15; // Every 15 minutes for medium range
  } else {
    intervalMinutes = 30; // Every 30 minutes for long range
  }

  const stepMs = CONFIG.STEP_MINUTES * MS_PER_MINUTE;
  const dataPoints: Array<{ hour: number; bac: number }> = [];
  for (let minutes = 0; minutes <= hoursToShow * 60; minutes += intervalMinutes) {
    // Linear interpolation between simulated steps so points between whole minutes are exact enough
    const position = (currentTime + minutes * MS_PER_MINUTE - startTime) / stepMs;
    let bac = 0.0;
    if (position >= timeline.length - 1) {
      bac = timeline[timeline.length - 1] ?? 0.0;
    } else if (position > 0) {
      const lower = Math.floor(position);
      const fraction = position - lower;
      bac = timeline[lower]! * (1 - fraction) + timeline[lower + 1]! * fraction;
    }
    dataPoints.push({
      hour: roundToPrecision(minutes / 60.0, 2),
      bac: roundToPrecision(bac, 4)
    });
  }
  return dataPoints;
}

/**
 * Generate BAC over time data (from currentTime forward)
 */
export function generateBACOverTime(
  drinks: Drink[],
  userWeight: number,
  userSex: string,
  currentTime: Date,
  hoursToShow: number = 12.0
): Array<{ hour: number; bac: number }> {
  if (drinks.length === 0) return [];
  const endTime = currentTime.getTime() + hoursToShow * 60 * MS_PER_MINUTE;
  const { startTime, timeline } = simulateTimeline(drinks, userWeight, userSex, endTime);
  return sampleTimeline(timeline, startTime, currentTime.getTime(), hoursToShow);
}

/**
 * Main BAC calculation function
 */
export function calculateBAC(inputs: BACCalculationInputs): BACResult | null {
  const { drinks, userWeight, userSex, currentTime = new Date() } = inputs;

  // Input validation
  if (!userWeight || userWeight <= 0.0) {
    return null;
  }

  if (!userSex || !['male', 'female'].includes(userSex.toLowerCase())) {
    return null;
  }

  if (drinks?.some(drink => !drink.standards || drink.standards <= 0.0)) {
    return null;
  }

  if (!drinks || drinks.length === 0) {
    return {
      currentBAC: 0.0,
      timeToSober: 0.0,
      timeToLegal: 0.0,
      bacOverTime: [],
      isRising: false,
      peakBAC: 0.0,
      timeToPeak: 0.0
    };
  }

  const sex = userSex.toLowerCase();
  const now = currentTime.getTime();

  // Simulate once and derive everything from the same timeline
  const { startTime, timeline } = simulateTimeline(drinks, userWeight, sex, predictionEnd(drinks, currentTime));

  const currentBAC = calculateBACAtTime(drinks, userWeight, sex, currentTime);
  const isRising = isBACRising(drinks, currentTime);
  const { peakBAC, timeToPeak } = peakFromTimeline(timeline, startTime, now);
  const timeToSober = hoursToTargetFromTimeline(timeline, startTime, now, 0.0);
  const timeToLegal = hoursToTargetFromTimeline(timeline, startTime, now, 0.05);

  const hoursToShow = Math.max(12.0, Math.min(48.0, (timeToSober === -1 ? 24.0 : timeToSober * 1.2)));
  const bacOverTime = sampleTimeline(timeline, startTime, now, hoursToShow);

  return {
    currentBAC: roundToPrecision(Math.max(0.0, currentBAC), 4),
    timeToSober: timeToSober === -1 ? 48.0 : roundToPrecision(timeToSober, 2),
    timeToLegal: timeToLegal === -1 ? 48.0 : roundToPrecision(timeToLegal, 2),
    bacOverTime,
    isRising,
    peakBAC: roundToPrecision(Math.max(0.0, peakBAC), 4),
    timeToPeak: roundToPrecision(timeToPeak, 2)
  };
}

export interface NightSimulation {
  /** BAC every `stepMinutes` from the first drink until shortly after it's back to zero (or the horizon). */
  samples: { t: number; bac: number }[];
  /** When the model reaches zero for good (ms), or null if it's still above zero at the horizon. */
  zeroAt: number | null;
  peak: { bac: number; t: number };
}

/**
 * One simulation of the whole night, for the screen and the curve: simulate once at one-minute
 * resolution, then sample it. (The older per-point helpers re-simulated for every point.)
 */
export function simulateNight(
  drinks: Drink[],
  userWeight: number,
  userSex: string,
  currentTime: Date,
  stepMinutes: number = 5
): NightSimulation | null {
  if (drinks.length === 0 || !userWeight || !userSex) return null;
  const sex = userSex.toLowerCase();
  const { startTime, timeline } = simulateTimeline(drinks, userWeight, sex, predictionEnd(drinks, currentTime));
  const stepMs = CONFIG.STEP_MINUTES * MS_PER_MINUTE;

  let lastAbove = -1;
  let peakIndex = 0;
  for (let i = 0; i < timeline.length; i++) {
    if (timeline[i]! > MIN_BAC_THRESHOLD) lastAbove = i;
    if (timeline[i]! > timeline[peakIndex]!) peakIndex = i;
  }
  const zeroAt = lastAbove === timeline.length - 1 ? null : startTime + (lastAbove + 1) * stepMs;
  const end = Math.max(currentTime.getTime(), (zeroAt ?? startTime + (timeline.length - 1) * stepMs) + 30 * MS_PER_MINUTE);

  const samples: { t: number; bac: number }[] = [];
  const every = Math.max(1, Math.round(stepMinutes / CONFIG.STEP_MINUTES));
  for (let i = 0; i < timeline.length && startTime + i * stepMs <= end; i += every) {
    samples.push({ t: startTime + i * stepMs, bac: roundToPrecision(timeline[i]!, 4) });
  }
  return { samples, zeroAt, peak: { bac: roundToPrecision(timeline[peakIndex]!, 4), t: startTime + peakIndex * stepMs } };
}
