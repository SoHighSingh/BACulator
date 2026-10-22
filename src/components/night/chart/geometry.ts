import type { NightSimulation } from "~/lib/bac-calculator";

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
  /** Top of the y scale: the highest value drawn (the plot's own padding is the headroom). */
  top: number;
  /** Every sample inside the window, at the simulation's own resolution. */
  shown: Sample[];
  /** Hour marks with labels. */
  hours: number[];
}

/**
 * The time window: from the first drink, looking ahead as far as has already passed (at least 3 h),
 * so tonight isn't squashed into a corner by the long tail.
 */
/** `whole`: the whole night, from the first drink to the model's zero (the bigger graph). */
export function chartWindow(sim: NightSimulation, now: Date, whole = false): ChartWindow {
  const { samples } = sim;
  const nowT = now.getTime();
  const t0 = samples[0]?.t ?? nowT;
  const last = samples[samples.length - 1]?.t ?? t0 + 1;
  const ahead = Math.max(3 * HOUR, nowT - t0);
  const t1 = whole ? Math.max(nowT + 30 * MINUTE, last) : Math.max(nowT + 30 * MINUTE, Math.min(last, nowT + ahead));
  const end = samples.findIndex((s) => s.t > t1);
  const shown = end === -1 ? samples : samples.slice(0, end + 1);
  const top = Math.max(0.02, ...shown.map((s) => s.bac));

  const span = (t1 - t0) / HOUR;
  const every = span > 12 ? 3 : span > 6 ? 2 : 1;
  const hours: number[] = [];
  const first = new Date(t0);
  first.setMinutes(0, 0, 0);
  for (let t = first.getTime() + HOUR; t < t1; t += HOUR * every) hours.push(t);
  return { t0, t1, top, shown, hours };
}

/** Pixel on a half-pixel so a 1px stroke stays one crisp device row. */
export const crisp = (v: number) => Math.round(v) + 0.5;

/** SVG path through points, two decimals, so a minute-sampled line is drawn as it was computed. */
export function polyline(pts: [number, number][]): string {
  return pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
}

/**
 * A smooth path through the points that never overshoots them: monotone cubic Hermite (Fritsch–
 * Carlson) tangents, written as cubic Béziers. Between two samples the curve stays within their
 * values, so a peak is exactly the peak sample and an absorption step still rises where it rose;
 * the smoothing only rounds off the sampling corners. Points must be sorted by x.
 */
export function monotonePath(pts: [number, number][]): string {
  const n = pts.length;
  if (n < 3) return polyline(pts);
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const h = pts[i + 1]![0] - pts[i]![0];
    dx.push(h);
    slope.push(h > 0 ? (pts[i + 1]![1] - pts[i]![1]) / h : 0);
  }
  const m: number[] = new Array<number>(n).fill(0);
  m[0] = slope[0]!;
  m[n - 1] = slope[n - 2]!;
  for (let i = 1; i < n - 1; i++) {
    const a = slope[i - 1]!;
    const b = slope[i]!;
    // A flat or turning point gets a flat tangent, so the curve never pokes past a sample.
    if (a === 0 || b === 0 || a * b < 0) m[i] = 0;
    else {
      const w1 = 2 * dx[i]! + dx[i - 1]!;
      const w2 = dx[i]! + 2 * dx[i - 1]!;
      m[i] = (w1 + w2) / (w1 / a + w2 / b);
    }
  }
  let d = `M${pts[0]![0].toFixed(2)} ${pts[0]![1].toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i]!;
    const [x1, y1] = pts[i + 1]!;
    const h = dx[i]! / 3;
    d += ` C${(x0 + h).toFixed(2)} ${(y0 + m[i]! * h).toFixed(2)} ${(x1 - h).toFixed(2)} ${(y1 - m[i + 1]! * h).toFixed(2)} ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  }
  return d;
}

/**
 * Thin a minute-sampled line to roughly one point per `minPx` of width, keeping the first and
 * last points and every local peak or trough, so the drawn curve is lighter but turns where the
 * model turns.
 */
export function thin(pts: [number, number][], minPx: number): [number, number][] {
  if (pts.length < 3) return pts;
  const out: [number, number][] = [pts[0]!];
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i]!;
    const prev = pts[i - 1]![1];
    const next = pts[i + 1]![1];
    const turn = (p[1] - prev) * (next - p[1]) < 0;
    if (turn || p[0] - out[out.length - 1]![0] >= minPx) out.push(p);
  }
  out.push(pts[pts.length - 1]!);
  return out;
}
