import type { BACResult, Drink } from "~/types/bac";

// The model is an estimate: real BAC for the same drinks varies by roughly ±20% between people
// and nights, so the screen shows a band rather than a falsely precise number.
const BAND_LOW = 0.8;
const BAND_HIGH = 1.2;
const ZERO_EARLY = 0.8;
const ZERO_LATE = 1.25;
const QUARTER_HOUR_MS = 15 * 60 * 1000;

export interface EstimateDisplay {
  /** "0.05–0.08", "under 0.01" or "0.00" */
  band: string;
  status: "rising" | "falling" | "none";
  /** "between 2:30 and 4:00 am", or null when nothing is left to wear off */
  backToZero: string | null;
  /** True whenever any alcohol is counted, including drinks still being absorbed */
  notSafeToDrive: boolean;
}

const floor2 = (n: number) => Math.floor(n * 100) / 100;
const ceil2 = (n: number) => Math.ceil(n * 100) / 100;

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
