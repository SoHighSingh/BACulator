import type { NightSimulation } from "~/lib/bac-calculator";
import { BAND_HIGH, BAND_LOW } from "~/lib/estimate-display";

export type Sample = { t: number; bac: number };

const HOUR = 3_600_000;
const MINUTE = 60_000;

/** Linear read of the model at any time; exact at every sample. */
export function valueAt(samples: Sample[], t: number): number {
  if (samples.length === 0) return 0;
  if (t <= samples[0]!.t) return samples[0]!.bac;
  for (let i = 1; i < samples.length; i++) {
    const b = samples[i]!;
    if (t <= b.t) {
      const a = samples[i - 1]!;
      return a.bac + ((b.bac - a.bac) * (t - a.t)) / (b.t - a.t);
    }
  }
  return samples[samples.length - 1]!.bac;
}

export interface ChartWindow {
  t0: number;
  t1: number;
  /** Top of the y scale: a clean multiple of `step` above the highest value drawn (band included). */
  top: number;
  /** Clean y step (0.01, 0.02, 0.05, 0.1) giving at most five rows. */
  step: number;
  /** Every sample inside the window, at the simulation's own resolution. */
  shown: Sample[];
  /** Hour marks with labels. */
  hours: number[];
  /** Finer time ticks (15 or 30 min) without labels. */
  minors: number[];
  /** Horizontal rows at each clean step (0 excluded). */
  rows: number[];
}

/**
 * The time window: from the first drink, looking ahead as far as has already passed (at least 3 h),
 * so tonight isn't squashed into a corner by the long tail. The y scale ends on a clean step above
 * the upper edge of the likely band, so axis labels are honest numbers rather than a padded max.
 */
export function chartWindow(sim: NightSimulation, now: Date, { band = true } = {}): ChartWindow {
  const { samples } = sim;
  const nowT = now.getTime();
  const t0 = samples[0]?.t ?? nowT;
  const last = samples[samples.length - 1]?.t ?? t0 + 1;
  const ahead = Math.max(3 * HOUR, nowT - t0);
  const t1 = Math.max(nowT + 30 * MINUTE, Math.min(last, nowT + ahead));
  const end = samples.findIndex((s) => s.t > t1);
  const shown = end === -1 ? samples : samples.slice(0, end + 1);

  const peak = Math.max(0.02, ...shown.map((s) => s.bac)) * (band ? BAND_HIGH : 1);
  let step = 0.01;
  for (const s of [0.01, 0.02, 0.05, 0.1, 0.2]) {
    step = s;
    if (peak / s <= 5) break;
  }
  // The plot's own top padding is the headroom, so the top row is the first clean step at or above the peak.
  const top = Math.max(step, Math.ceil(peak / step - 1e-6) * step);
  const rows: number[] = [];
  for (let v = step; v <= top + 1e-9; v += step) rows.push(+v.toFixed(3));

  const span = (t1 - t0) / HOUR;
  const every = span > 12 ? 3 : span > 6 ? 2 : 1;
  const minor = span > 6 ? 30 * MINUTE : 15 * MINUTE;
  const hours: number[] = [];
  const first = new Date(t0);
  first.setMinutes(0, 0, 0);
  for (let t = first.getTime() + HOUR; t < t1; t += HOUR * every) hours.push(t);
  const minors: number[] = [];
  for (let t = Math.ceil(t0 / minor) * minor; t < t1; t += minor) if (!hours.includes(t)) minors.push(t);
  return { t0, t1, top, step, shown, hours, minors, rows };
}

/** Pixel on a half-pixel so a 1px stroke stays one crisp device row. */
export const crisp = (v: number) => Math.round(v) + 0.5;

/** SVG path through points, two decimals, so a minute-sampled line is drawn as it was computed. */
export function polyline(pts: [number, number][]): string {
  return pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
}

/** The likely-range band around the model, as a closed polygon (upper edge forward, lower back). */
export function bandPath(shown: Sample[], x: (t: number) => number, y: (b: number) => number): string {
  if (shown.length === 0) return "";
  const upper = shown.map((s): [number, number] => [x(s.t), y(s.bac * BAND_HIGH)]);
  const lower = [...shown].reverse().map((s): [number, number] => [x(s.t), y(s.bac * BAND_LOW)]);
  return `${polyline(upper)} ${lower.map(([px, py]) => `L${px.toFixed(2)} ${py.toFixed(2)}`).join(" ")} Z`;
}

/** Format a y-axis step label: "0.05", or "0.1" never (always two places, tabular). */
export const axisValue = (v: number) => v.toFixed(2);
