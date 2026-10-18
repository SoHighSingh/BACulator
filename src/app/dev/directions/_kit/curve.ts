"use client";

import { useMemo, useRef, useState } from "react";

import type { NightSimulation } from "~/lib/bac-calculator";

// Same honesty rules as the shipped curve: the likely range around the model is 0.75×–1.4×.
export const BAND_LOW = 0.75;
export const BAND_HIGH = 1.4;

export function valueAt(samples: { t: number; bac: number }[], t: number): number {
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

export interface CurveWindow {
  t0: number;
  t1: number;
  /** Top of the y scale (already padded). */
  max: number;
  shown: { t: number; bac: number }[];
  hours: number[];
}

/**
 * The time window every direction draws: from the first drink, looking ahead as far as has already
 * passed (at least 3 h), so tonight isn't squashed into a corner by the long tail.
 */
export function curveWindow(sim: NightSimulation, now: Date, { band = false } = {}): CurveWindow {
  const { samples } = sim;
  const nowT = now.getTime();
  const t0 = samples[0]?.t ?? nowT;
  const last = samples[samples.length - 1]?.t ?? t0 + 1;
  const ahead = Math.max(3 * 3_600_000, nowT - t0);
  const t1 = Math.max(nowT + 30 * 60_000, Math.min(last, nowT + ahead));
  const end = samples.findIndex((s) => s.t > t1);
  const shown = end === -1 ? samples : samples.slice(0, end + 1);
  const peak = Math.max(0.04, ...shown.filter((s) => s.t <= t1).map((s) => s.bac));
  const max = peak * (band ? BAND_HIGH * 1.08 : 1.15);
  const hours: number[] = [];
  const first = new Date(t0);
  first.setMinutes(0, 0, 0);
  const span = (t1 - t0) / 3_600_000;
  const every = span > 12 ? 3 : span > 6 ? 2 : 1;
  for (let t = first.getTime() + 3_600_000; t < t1; t += 3_600_000 * every) hours.push(t);
  return { t0, t1, max, shown, hours };
}

/** Pointer scrub across a box: returns the picked time, or null at rest (= now). */
export function useScrub(win: { t0: number; t1: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [t, setT] = useState<number | null>(null);
  const handlers = useMemo(() => {
    const pick = (clientX: number) => {
      const r = box.current?.getBoundingClientRect();
      if (!r) return;
      const f = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
      setT(win.t0 + f * (win.t1 - win.t0));
    };
    return {
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        pick(e.clientX);
      },
      onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
        if (e.buttons) pick(e.clientX);
      },
      onPointerUp: () => setT(null),
      onPointerCancel: () => setT(null),
    };
  }, [win.t0, win.t1]);
  return { box, t, handlers };
}

/** SVG path for a polyline through (x, y) points. */
export const pathOf = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
