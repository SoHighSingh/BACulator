"use client";

import { useRef } from "react";

import { aboutPoint, BAND_HIGH, BAND_LOW, formatBand } from "~/lib/estimate-display";
import { formatClock } from "~/lib/format-clock";
import type { useDemoNight } from "./useDemoNight";

export type DemoNight = ReturnType<typeof useDemoNight>;

/** True once a value has been shown and then changes, so first paint never animates. */
function useChanged(value: string) {
  const prev = useRef<string | null>(null);
  const changed = prev.current !== null && prev.current !== value;
  prev.current = value;
  return changed;
}

/**
 * The night screen's range strip, blown up to the width of the window: a pill of likely range,
 * a white tick at the model's point, a dashed run to the peak while it's still rising. The big
 * number rides on the tick. Everything moves by transform only, so a tap slides it across.
 * No marks but the reading's own: nothing on the strip is a limit.
 */
export function LiveStrip({ demo }: { demo: DemoNight }) {
  const { model } = demo;
  const bac = model.bac ?? 0;
  const [about, point] = aboutPoint(bac);
  const changed = useChanged(point);
  const [lo, hi] = formatBand(bac).split("–");
  const rising = model.peak && model.peak.bac > bac + 0.004 ? model.peak : null;
  const top = Math.max(bac * BAND_HIGH, rising?.bac ?? 0);
  const scale = Math.max(0.24, top * 1.15);
  const pos = (v: number) => Math.min(100, (v / scale) * 100);
  const loP = pos(bac * BAND_LOW);
  const hiP = pos(bac * BAND_HIGH);
  const nowP = pos(bac);
  const peakP = rising ? pos(rising.bac) : nowP;
  const slide = (p: number) => ({ transform: `translateX(${p}%)` });

  return (
    <div className="relative" aria-hidden="true">
      {/* The number rides the tick: the wrapper slides to the point, the number shifts back by the
          same share of its own width, so it never runs off either edge. */}
      <div className="relative h-[clamp(112px,15vw,232px)] overflow-x-clip">
        <div className="strip-move absolute inset-0" style={slide(nowP)}>
          <p className="strip-move absolute bottom-0 left-0 flex items-baseline gap-[0.12em] whitespace-nowrap" style={{ transform: `translateX(-${nowP}%)` }}>
            {about && <span className="text-[clamp(22px,2.2vw,34px)] font-medium text-ink-2">about</span>}
            <span
              key={point}
              data-changed={changed || undefined}
              className="num-in inline-block text-[clamp(112px,15.5vw,240px)] leading-[0.8] font-medium tracking-[-0.06em]"
            >
              {point}
            </span>
          </p>
        </div>
      </div>

      {/* Full-bleed track: the scale starts at the page margin; the track runs on past both edges. */}
      <div className="strip-bleed relative mt-[clamp(16px,2vw,28px)] -mx-[var(--gutter)] h-[var(--strip-h)] overflow-x-clip">
        <div className="strip-track absolute inset-0 bg-white/[0.06]" />
        <div className="absolute inset-y-0 left-[var(--gutter)] right-[var(--gutter)]">
        {/* Likely range: two round caps and a body, each placed by transform. */}
        <div className="strip-move absolute inset-0" style={slide(loP)}>
          <span className="strip-cap absolute inset-y-0 -left-[calc(var(--strip-h)/2)] w-[var(--strip-h)] rounded-full bg-signal" />
        </div>
        <div className="strip-move absolute inset-0" style={slide(hiP)}>
          <span className="strip-cap absolute inset-y-0 -left-[calc(var(--strip-h)/2)] w-[var(--strip-h)] rounded-full bg-signal" />
        </div>
        <div
          className="strip-move strip-body absolute inset-0 origin-left bg-signal"
          style={{ transform: `translateX(${loP}%) scaleX(${Math.max(0, hiP - loP) / 100})` }}
        />
        {rising && (
          <>
            <div
              className="strip-move absolute inset-x-0 top-1/2 h-0 origin-left border-t-[3px] border-dashed border-bg/70"
              style={{ transform: `translateX(${nowP}%) scaleX(${Math.max(0, peakP - nowP) / 100})` }}
            />
            <div className="strip-move absolute inset-0" style={slide(peakP)}>
              <span className="absolute top-1/2 -left-3 size-6 -translate-y-1/2 rounded-full border-[3px] border-bg bg-signal" />
            </div>
          </>
        )}
        {/* Range ends, written inside the band when it's wide enough to hold them. */}
        {hiP - loP > 14 && (
          <>
            <div className="strip-move absolute inset-0" style={slide(loP)}>
              <span className="absolute top-1/2 left-1 hidden -translate-y-1/2 text-[clamp(18px,1.6vw,24px)] font-semibold text-bg tabular-nums md:block">{lo}</span>
            </div>
            <div className="strip-move absolute inset-0" style={slide(hiP)}>
              <span className="absolute top-1/2 right-[calc(100%-4px)] hidden -translate-y-1/2 text-[clamp(18px,1.6vw,24px)] font-semibold text-bg tabular-nums md:block">{hi}</span>
            </div>
          </>
        )}
        {/* Now: a white tick through the band. */}
        <div className="strip-move absolute -inset-y-3 inset-x-0" style={slide(nowP)}>
          <span className="absolute inset-y-0 -left-[3px] w-[6px] rounded-full bg-ink shadow-[0_0_0_3px_var(--color-bg)]" />
        </div>
        </div>
      </div>

      {rising && (
        <div className="relative mt-4 h-7 overflow-x-clip">
          <div className="strip-move absolute inset-0" style={slide(peakP)}>
            <p className="strip-move absolute top-0 left-0 text-lg whitespace-nowrap text-ink-2" style={{ transform: `translateX(-${peakP}%)` }}>
              Still rising: <span className="text-ink">about {aboutPoint(rising.bac)[1]}</span> by {formatClock(rising.at)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
