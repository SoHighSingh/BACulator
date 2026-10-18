"use client";

import { useLayoutEffect, useMemo, useRef } from "react";

import type { NightSimulation } from "~/lib/bac-calculator";
import { formatBand, formatPoint } from "~/lib/estimate-display";
import { formatClock, formatHour } from "~/lib/format-clock";
import { BAND_HIGH, BAND_LOW, curveWindow, useScrub, valueAt } from "../_kit/curve";

const STEP = 15 * 60_000;
const H = 168;

/** "about 0.09", "under 0.01" or "0.00": never "about" in front of a floor. */
export function aboutText(bac: number) {
  const p = formatPoint(bac);
  return bac > 0 && bac >= 0.01 ? `about ${p}` : p;
}
export const likelyText = (bac: number) => (bac >= 0.01 ? formatBand(bac).replace("–", " to ") : null);

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * One capsule per 15 minutes spanning the likely range (0.75–1.4× the model) at that time, like the
 * Health app's heart-rate range chart. When the numbers change, future capsules grow from where
 * they were to where they are now (FLIP on transform, origin bottom), then sit still.
 */
function Capsule({ low, high, when, picked }: { low: number; high: number; when: "past" | "future" | "zero"; picked: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef<{ low: number; high: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const p = prev.current;
    prev.current = { low, high };
    if (!el || !p || when !== "future") return;
    if (Math.abs(p.low - low) < 1e-4 && Math.abs(p.high - high) < 1e-4) return;
    const span = high - low;
    if (span <= 0 || reduced()) return;
    const scale = Math.max(0.02, (p.high - p.low) / span);
    const dy = ((low - p.low) / span) * 100;
    el.animate([{ transform: `translateY(${dy.toFixed(2)}%) scaleY(${scale.toFixed(3)})` }, { transform: "none" }], {
      duration: 450,
      easing: "cubic-bezier(0.34, 1.4, 0.64, 1)",
    });
  }, [low, high, when]);

  return (
    <span
      ref={ref}
      className="ns-cap"
      data-when={when}
      data-picked={picked ? "" : undefined}
      style={{ bottom: `${(low * 100).toFixed(3)}%`, height: `max(8px, ${((high - low) * 100).toFixed(3)}%)` }}
    />
  );
}

export function RangeChart({ simulation, now, bac }: { simulation: NightSimulation; now: Date; bac: number }) {
  const win = useMemo(() => curveWindow(simulation, now, { band: true }), [simulation, now]);
  const { box, t, handlers } = useScrub(win);
  const nowT = now.getTime();

  const caps = useMemo(() => {
    const out: { t: number; m: number }[] = [];
    for (let at = win.t0; at <= win.t1 + 1; at += STEP) out.push({ t: at, m: valueAt(win.shown, at) });
    return out;
  }, [win]);
  const n = caps.length;
  const slotOf = (at: number) => Math.min(n - 1, Math.max(0, Math.floor(((at - win.t0) / (win.t1 - win.t0)) * n)));
  const nowIdx = slotOf(nowT);
  const pickedIdx = t === null ? null : slotOf(t);
  const picked = pickedIdx === null ? null : caps[pickedIdx]!;

  const label = picked ? formatClock(picked.t) : "Now";
  const value = picked ? picked.m : bac;
  const likely = likelyText(value);
  const xOf = (i: number) => ((i + 0.5) / n) * 100;
  const nowY = Math.min(1, valueAt(win.shown, nowT) / win.max);

  return (
    <div>
      <div aria-live="off" className="min-h-[106px]">
        <p className="text-[18px] font-medium text-ink-2">{label}</p>
        <p className="text-[34px] leading-[1.15] font-bold tracking-[-0.01em]">{aboutText(value)}</p>
        <p className="text-[18px] font-medium text-ink-2">{likely ? `likely ${likely}` : " "}</p>
      </div>

      <div
        ref={box}
        {...handlers}
        role="img"
        aria-label={`Tonight's estimate every 15 minutes from ${formatClock(win.t0)} to ${formatClock(win.t1)}. Now ${aboutText(bac)}. Drag across to read any time.`}
        className={`relative mt-4 cursor-ew-resize select-none ${picked ? "ns-scrubbing" : ""}`}
        style={{ height: H, touchAction: "pan-y" }}
      >
        {/* Now: a 2px ink rule through the plot, with a dot at the model's value. */}
        <span
          aria-hidden="true"
          className="absolute top-0 bottom-0 w-[2px] -translate-x-1/2 rounded-full bg-ink"
          style={{ left: `${xOf(nowIdx)}%` }}
        />
        <div className="absolute inset-0 flex">
          {caps.map((c, i) => {
            const when = c.m < 0.001 ? "zero" : i <= nowIdx ? "past" : "future";
            const low = when === "zero" ? 0 : (c.m * BAND_LOW) / win.max;
            const high = when === "zero" ? 0 : Math.min(1, (c.m * BAND_HIGH) / win.max);
            return (
              <span key={c.t - win.t0} className="relative h-full flex-1">
                <Capsule low={low} high={high} when={when} picked={i === pickedIdx} />
              </span>
            );
          })}
        </div>
        <span
          aria-hidden="true"
          className="absolute size-[14px] -translate-x-1/2 translate-y-1/2 rounded-full border-[3px] border-[var(--card)] bg-ink"
          style={{ left: `${xOf(nowIdx)}%`, bottom: `${(nowY * 100).toFixed(2)}%` }}
        />
      </div>

      <div aria-hidden="true" className="ns-tnum relative mt-2 h-6 text-[16px] font-medium text-ink-2">
        {win.hours.map((h) => {
          const f = (h - win.t0) / (win.t1 - win.t0);
          if (f < 0.07 || f > 0.93) return null;
          return (
            <span key={h} className="absolute top-0 -translate-x-1/2 whitespace-nowrap" style={{ left: `${(f * 100).toFixed(2)}%` }}>
              {formatHour(h)}
            </span>
          );
        })}
      </div>

      <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[18px] font-medium text-ink-2">
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-4 w-2.5 rounded-full bg-amber" />
          So far
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-4 w-2.5 rounded-full border-[1.5px] border-amber bg-amber/35" />
          Ahead, if you stop now
        </span>
      </p>
    </div>
  );
}
