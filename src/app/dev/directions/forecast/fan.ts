import type { NightSimulation } from "~/lib/bac-calculator";
import { formatPoint } from "~/lib/estimate-display";
import { formatClock, formatHour } from "~/lib/format-clock";
import { BAND_HIGH, BAND_LOW, curveWindow, valueAt } from "../_kit/curve";

/**
 * The fan: the past is one line, the future widens. Two kinds of doubt are drawn at once. Height:
 * the likely range is 0.75–1.4× the model. Time: back to zero is 0.75–1.6× as far away as the model
 * says. So the upper edge at time t is 1.4× the model at now + (t − now) / 1.6 (a slow eliminator),
 * the lower edge 0.75× the model at now + (t − now) / 0.75 (a fast one), and the fan closes to
 * zero between the early and the late back-to-zero times.
 */
export const ZERO_EARLY = 0.75;
export const ZERO_LATE = 1.6;
// The inner, likelier band (shape only).
const IN_LOW = 0.85;
const IN_HIGH = 1.2;
const IN_LATE = 1.3;
const H = 3_600_000;

export interface Window {
  t0: number;
  t1: number;
  nowT: number;
  zeroAt: number | null;
  early: number | null;
  late: number | null;
  max: number;
}

export function forecastWindow(sim: NightSimulation, now: Date): Window {
  const nowT = now.getTime();
  const kit = curveWindow(sim, now, { band: true });
  const left = sim.zeroAt !== null && sim.zeroAt > nowT ? sim.zeroAt - nowT : 0;
  const early = left ? nowT + left * ZERO_EARLY : null;
  const late = left ? nowT + left * ZERO_LATE : null;
  // Look far enough ahead that the whole fan closes on the chart, within reason.
  const t1 = Math.min(nowT + 16 * H, Math.max(kit.t1, late ? late + 20 * 60_000 : 0, nowT + 30 * 60_000));
  const t0 = Math.min(kit.t0, nowT - 30 * 60_000);
  let max = 0.04;
  for (let i = 0; i <= 160; i++) {
    const t = t0 + ((t1 - t0) * i) / 160;
    max = Math.max(max, bandAt(sim, nowT, t).high);
  }
  return { t0, t1, nowT, zeroAt: sim.zeroAt, early, late, max: max * 1.04 };
}

const clamp0 = (n: number) => Math.max(0, n);

/** Model, likely low and likely high at any time; the past keeps the plain 0.75–1.4× band. */
export function bandAt(sim: NightSimulation, nowT: number, t: number) {
  const s = sim.samples;
  const model = clamp0(valueAt(s, t));
  if (t <= nowT) return { model, low: model * BAND_LOW, high: model * BAND_HIGH, inLow: model * IN_LOW, inHigh: model * IN_HIGH };
  const d = t - nowT;
  const high = Math.max(model, BAND_HIGH * clamp0(valueAt(s, nowT + d / ZERO_LATE)));
  const low = Math.min(model, BAND_LOW * clamp0(valueAt(s, nowT + d / ZERO_EARLY)));
  const inHigh = Math.min(high, Math.max(model, IN_HIGH * clamp0(valueAt(s, nowT + d / IN_LATE))));
  const inLow = Math.max(low, Math.min(model, IN_LOW * clamp0(valueAt(s, nowT + d / IN_LOW))));
  return { model, low, high, inLow, inHigh };
}

const floor2 = (n: number) => Math.floor(n * 100 + 1e-9) / 100;
const ceil2 = (n: number) => Math.ceil(n * 100 - 1e-9) / 100;

/** "likely 0.07 to 0.13" at any time, read off the fan's own edges. */
export function likelyAt(sim: NightSimulation, nowT: number, t: number): string | null {
  const b = bandAt(sim, nowT, t);
  if (b.high <= 0.0005) return null;
  const low = floor2(b.low);
  const high = Math.max(ceil2(b.high), low + 0.01);
  return `${low.toFixed(2)} to ${high.toFixed(2)}`;
}

const QUARTER = 15 * 60_000;
const FIVE = 5 * 60_000;
export const roundTo = (t: number, step: number) => Math.round(t / step) * step;
/** "11:20 pm", rounded to 5 minutes: the model is not good to the minute. */
export const aroundClock = (t: number) => formatClock(roundTo(t, FIVE));

/** "2:30–4:00 am" (the period once when both share it). */
export function zeroRange(early: number, late: number) {
  const e = new Date(roundTo(early, QUARTER));
  const l = new Date(roundTo(late, QUARTER));
  const same = e.getHours() < 12 === l.getHours() < 12;
  return `${formatClock(e, { period: !same })}–${formatClock(l)}`;
}

/* ---------------------------------------------------------------------------------------------
   Pixel geometry. Fixed point counts, so a redraw can be interpolated point for point.
   --------------------------------------------------------------------------------------------- */
const N_PAST = 120;
const N_FAN = 96;

export interface Label {
  x: number;
  y: number;
  anchor: "start" | "end";
  lines: string[];
}

export interface Geo {
  W: number;
  H: number;
  top: number;
  y0: number;
  t0: number;
  t1: number;
  max: number;
  past: number[];
  model: number[];
  upper: number[];
  lower: number[];
  inUpper: number[];
  inLower: number[];
  now: { x: number; y: number };
  nowLabel: Label | null;
  nowLeader: number[] | null;
  peakLabel: Label | null;
  peakLeader: number[] | null;
  peakDot: { x: number; y: number } | null;
  hours: { x: number; text: string }[];
  bracket: { x1: number; x2: number; label: Label } | null;
}

export interface GeoOptions {
  width: number;
  plotH: number;
  annotate: boolean;
  font: number;
}

export function textWidth(s: string, font: number) {
  return s.length * font * 0.54;
}

export function buildGeo(sim: NightSimulation, win: Window, o: GeoOptions): Geo {
  const W = Math.max(40, o.width);
  const { t0, t1, nowT, max } = win;
  const rowH = Math.round(o.font * 1.3);
  const nowBac = clamp0(valueAt(sim.samples, nowT));
  const peakAhead = sim.peak.t > nowT && sim.peak.bac > nowBac + 0.0005 ? sim.peak : null;

  // Header rows above the plot hold the notes; work out how many are needed first.
  const x = (t: number) => ((t - t0) / (t1 - t0)) * W;
  const nowX = x(nowT);
  let nowLabel: Label | null = null;
  let peakLabel: Label | null = null;
  let rows = 0;
  if (o.annotate) {
    rows = 1;
    const text = `Now, about ${formatPoint(nowBac)}`;
    const w = textWidth(text, o.font);
    nowLabel =
      nowX + 8 + w <= W
        ? { x: nowX + 8, y: 0, anchor: "start", lines: [text] }
        : { x: Math.max(w, nowX - 8), y: 0, anchor: "end", lines: [text] };
    if (peakAhead) {
      const px = x(peakAhead.t);
      const a = `Peak about ${formatPoint(peakAhead.bac)}`;
      const b = `around ${aroundClock(peakAhead.t)}`;
      const lx = Math.max(px + 8, nowX + 16);
      const one = `${a} ${b}`;
      if (lx + textWidth(one, o.font) <= W) {
        peakLabel = { x: lx, y: 0, anchor: "start", lines: [one] };
        rows = 2;
      } else {
        const w2 = Math.max(textWidth(a, o.font), textWidth(b, o.font));
        peakLabel = { x: Math.min(lx, W - w2), y: 0, anchor: "start", lines: [a, b] };
        rows = 3;
      }
    }
  }

  const top = o.annotate ? rows * rowH + 14 : 3;
  const y0 = top + o.plotH;
  const foot = o.annotate ? 64 : 3;
  const Ht = y0 + foot;
  const y = (b: number) => y0 - (b / max) * o.plotH;

  const past: number[] = [];
  for (let i = 0; i <= N_PAST; i++) {
    const t = t0 + ((nowT - t0) * i) / N_PAST;
    past.push(x(t), y(clamp0(valueAt(sim.samples, t))));
  }
  const end = win.late ?? nowT;
  const modelEnd = win.zeroAt && win.zeroAt > nowT ? Math.min(win.zeroAt, t1) : nowT;
  const model: number[] = [];
  const upper: number[] = [];
  const lower: number[] = [];
  const inUpper: number[] = [];
  const inLower: number[] = [];
  for (let i = 0; i <= N_FAN; i++) {
    const tm = nowT + ((modelEnd - nowT) * i) / N_FAN;
    model.push(x(tm), y(clamp0(valueAt(sim.samples, tm))));
    const t = nowT + ((Math.min(end, t1) - nowT) * i) / N_FAN;
    const b = bandAt(sim, nowT, t);
    upper.push(x(t), y(b.high));
    lower.push(x(t), y(b.low));
    inUpper.push(x(t), y(b.inHigh));
    inLower.push(x(t), y(b.inLow));
  }

  const now = { x: nowX, y: y(nowBac) };
  const rowY = (r: number) => r * rowH + o.font * 0.2;
  let nowLeader: number[] | null = null;
  let peakLeader: number[] | null = null;
  let peakDot: { x: number; y: number } | null = null;
  if (nowLabel) {
    nowLabel.y = rowY(1);
    nowLeader = [nowX, now.y - 9, nowX, nowLabel.y - o.font * 0.32];
    if (nowLabel.anchor === "end") nowLeader = [nowX, now.y - 9, nowX, nowLabel.y + 5];
  }
  if (peakLabel && peakAhead) {
    peakLabel.y = rowY(2);
    const px = x(peakAhead.t);
    peakDot = { x: px, y: y(peakAhead.bac) };
    const ly = peakLabel.y - o.font * 0.32;
    peakLeader = [px, peakDot.y - 8, px, ly, Math.max(px, peakLabel.x - 5), ly];
  }

  // Hour labels: as dense as the width allows, never crowded.
  const hours: { x: number; text: string }[] = [];
  if (o.annotate) {
    const perHour = W / ((t1 - t0) / H);
    const step = perHour >= 58 ? 1 : perHour * 2 >= 58 ? 2 : perHour * 3 >= 58 ? 3 : 4;
    const first = new Date(t0);
    first.setMinutes(0, 0, 0);
    for (let t = first.getTime() + H; t < t1; t += H) {
      if (new Date(t).getHours() % step !== 0) continue;
      const hx = x(t);
      if (hx < 16 || hx > W - 16) continue;
      hours.push({ x: hx, text: formatHour(t) });
    }
  }

  let bracket: Geo["bracket"] = null;
  if (o.annotate && win.early && win.late) {
    const x1 = x(win.early);
    const x2 = Math.min(W - 1, x(win.late));
    const text = `Back to zero ${zeroRange(win.early, win.late)}`;
    const w = textWidth(text, o.font);
    const lx = Math.min(Math.max(0, (x1 + x2) / 2 - w / 2), W - w);
    bracket = { x1, x2, label: { x: Math.max(0, lx), y: y0 + 58, anchor: "start", lines: [text] } };
  }

  return { W, H: Ht, top, y0, t0, t1, max, past, model, upper, lower, inUpper, inLower, now, nowLabel, nowLeader, peakLabel, peakLeader, peakDot, hours, bracket };
}

/** Interpolate any two geometries of the same shape; anything that changed shape snaps. */
export function lerpGeo<T>(a: T, b: T, k: number): T {
  if (typeof a === "number" && typeof b === "number") return (a + (b - a) * k) as T;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return b;
    return (b as unknown[]).map((v, i) => lerpGeo((a as unknown[])[i], v, k)) as T;
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(b)) out[key] = lerpGeo((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], k);
    return out as T;
  }
  return b;
}

export const polyline = (pts: number[]) => {
  let d = "";
  for (let i = 0; i < pts.length; i += 2) d += `${i ? "L" : "M"}${pts[i]!.toFixed(1)} ${pts[i + 1]!.toFixed(1)}`;
  return d;
};

/** A closed band: along the top edge, back along the bottom. */
export function bandPath(top: number[], bottom: number[]) {
  let d = polyline(top);
  for (let i = bottom.length - 2; i >= 0; i -= 2) d += `L${bottom[i]!.toFixed(1)} ${bottom[i + 1]!.toFixed(1)}`;
  return `${d}Z`;
}
