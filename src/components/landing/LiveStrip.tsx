"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

import { aboutPoint, BAND_HIGH, BAND_LOW, formatBand } from "~/lib/estimate-display";
import { formatClock } from "~/lib/format-clock";
import { valueAt } from "~/components/night/TimelineCard";
import type { useDemoNight } from "./useDemoNight";

export type DemoNight = ReturnType<typeof useDemoNight>;

/** True once a value has been shown and then changes, so first paint never animates. */
export function useChanged(value: string) {
  const prev = useRef<string | null>(null);
  const changed = prev.current !== null && prev.current !== value;
  prev.current = value;
  return changed;
}

/** The strip's scale only ever widens during a visit, so a tap moves the reading, not the ruler. */
function useRatchet(value: number) {
  const max = useRef(0);
  max.current = Math.max(max.current, value);
  return max.current;
}

/** Measured widths of the number and its box, so the number can sit centred on the tick. */
function useWidths() {
  const box = useRef<HTMLDivElement>(null);
  const num = useRef<HTMLParagraphElement>(null);
  const [w, setW] = useState<[number, number]>([0, 0]);
  useLayoutEffect(() => {
    const b = box.current;
    const n = num.current;
    if (!b || !n) return;
    const read = () => setW([b.clientWidth, n.offsetWidth]);
    read();
    const ro = new ResizeObserver(read);
    ro.observe(b);
    ro.observe(n);
    return () => ro.disconnect();
  }, []);
  return { box, num, boxW: w[0], numW: w[1] };
}

/**
 * The night screen's range strip, blown up to the width of the window: the same thin glowing band
 * of likely range, the white tick at the model's point, and the same momentum light (a comet from
 * the tick toward a hollow ring at the coming peak while it is rising; a dimmer tail behind it while
 * it is falling). The big number sits centred over the tick and travels with it. The band and the
 * marks move by transform; the light eases its left/width like the night screen. Nothing moves at
 * rest. No marks but the reading's own: nothing on the strip is a limit.
 */
export function LiveStrip({ demo }: { demo: DemoNight }) {
  const { model } = demo;
  const bac = model.bac ?? 0;
  const [, point] = aboutPoint(bac);
  const changed = useChanged(point);
  const [lo, hi] = formatBand(bac).split("–");
  const rising = model.peak && model.peak.bac > bac + 0.004 ? model.peak : null;
  const falling = !rising && bac > 0.004;
  // Where the model was an hour ago: the falling tail runs back to it.
  const hourAgo = model.simulation ? valueAt(model.simulation.samples, demo.now.getTime() - 3_600_000) : 0;
  const tailTo = falling && hourAgo > bac + 0.004 ? hourAgo : null;
  // The ruler: zero at the left margin, the furthest thing on it (band, peak or tail) near the right.
  const top = Math.max(bac * BAND_HIGH, rising?.bac ?? 0, tailTo ?? 0);
  const scale = useRatchet(Math.max(0.05, top * 1.02));
  const pos = (v: number) => Math.min(100, (v / scale) * 100);
  const loP = pos(bac * BAND_LOW);
  const hiP = pos(bac * BAND_HIGH);
  const nowP = pos(bac);
  const peakP = rising ? pos(rising.bac) : nowP;
  const slide = (p: number) => ({ transform: `translateX(${p}%)` });
  const { box, num, boxW, numW } = useWidths();
  // Centre the number on the tick, held inside the gutters.
  const numX = boxW ? Math.max(0, Math.min(boxW - numW, (nowP / 100) * boxW - numW / 2)) : 0;
  const peakText = rising ? `about ${aboutPoint(rising.bac)[1]} by ${formatClock(rising.at)}` : null;
  // The momentum light runs from the now tick to the ring (rising) or back to where the model was
  // an hour ago (falling), the same way the night screen draws it.
  const lightTo = rising ? peakP : tailTo !== null ? pos(tailTo) : null;
  const lightStyle = lightTo !== null && lightTo > nowP ? { left: `${nowP}%`, width: `${lightTo - nowP}%` } : null;

  return (
    <div className="relative" aria-hidden="true">
      <div ref={box} className="strip-num-box relative">
        <p
          ref={num}
          className="strip-move absolute bottom-0 left-0 flex items-baseline whitespace-nowrap"
          style={{ transform: `translateX(${numX}px)`, visibility: boxW ? undefined : "hidden" }}
        >
          {/* No "about" beside the number (user decision, 18 Oct 2026 late); it stays in the spoken
              copy under the strip. Centred on the tick by its own measured width. */}
          <span key={point} data-changed={changed || undefined} className="strip-num num-in inline-block font-medium">
            {point}
          </span>
        </p>
      </div>

      {/* Full-bleed track: the scale starts at the page margin; the track runs on past both edges. */}
      <div className="strip-bleed relative mt-[clamp(14px,1.6vw,26px)]">
        <div className="absolute inset-0 bg-white/[0.07]" />
        <div className="absolute inset-y-0 right-[var(--gutter)] left-[var(--gutter)]">
          {/* Likely range: two round caps and a body, each placed by transform, glowing as one. */}
          <div className="strip-glow absolute inset-0">
            <div className="strip-move absolute inset-0" style={slide(loP)}>
              <span className="absolute inset-y-0 -left-[calc(var(--strip-h)/2)] w-[var(--strip-h)] rounded-full bg-signal" />
            </div>
            <div className="strip-move absolute inset-0" style={slide(hiP)}>
              <span className="absolute inset-y-0 -left-[calc(var(--strip-h)/2)] w-[var(--strip-h)] rounded-full bg-signal" />
            </div>
            <div
              className="strip-move absolute inset-0 origin-left bg-signal"
              style={{ transform: `translateX(${loP}%) scaleX(${Math.max(0, hiP - loP) / 100})` }}
            >
              {/* A drink landing brightens the band once, then it settles. Never on first paint. */}
              {demo.touched && <span key={demo.drinks.length} className="strip-land absolute inset-0 bg-white" />}
            </div>
          </div>
          {lightStyle && (
            <>
              {/* The momentum light, the night screen's at this scale: a coma of light on the tick
                  tapering the way it is heading, and the band gone white-hot, thinning away. */}
              <div className={`strip-light momentum-glow strip-coma absolute ${rising ? "momentum-rise" : "momentum-glow-fall"}`} style={lightStyle} />
              <div className={`strip-light momentum-core absolute inset-y-0 rounded-full ${rising ? "momentum-rise" : "momentum-core-fall"}`} style={lightStyle} />
            </>
          )}
          {rising && (
            // The hollow ring at the coming peak.
            <div className="strip-move absolute inset-0" style={slide(peakP)}>
              <span className="strip-ring absolute top-1/2 left-0 rounded-full border-ink bg-bg/50" />
            </div>
          )}
          {/* Now: a white tick through the band. */}
          <div className="strip-move absolute inset-0" style={slide(nowP)}>
            <span className="strip-tick absolute left-0 rounded-full bg-ink" />
          </div>
        </div>
      </div>

      <div className="relative mt-[clamp(14px,1.6vw,22px)] flex min-h-7 flex-wrap items-center justify-between gap-x-6 gap-y-1 text-lg">
        <p className="text-ink-2">
          Likely <span className="text-ink tabular-nums">{lo}</span> to <span className="text-ink tabular-nums">{hi}</span>
        </p>
        {rising ? (
          <p className="flex items-center gap-2 text-ink">
            <TrendingUp aria-hidden="true" className="size-5 text-signal" strokeWidth={2.25} />
            Rising to {peakText}
          </p>
        ) : falling ? (
          <p className="flex items-center gap-2 text-ink">
            <TrendingDown aria-hidden="true" className="size-5 text-signal" strokeWidth={2.25} />
            Falling
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The motif at text size: a short band with the white tick. Used as the bullet, the button glyph
 * and the section marks, so the page has one shape at many scales.
 */
export function StripGlyph({ className = "h-3 w-8", tone = "signal" }: { className?: string; tone?: "signal" | "dark" }) {
  const band = tone === "dark" ? "#09090b" : "#7cb4ff";
  const tick = tone === "dark" ? "#7cb4ff" : "#fafafa";
  return (
    <svg viewBox="0 0 32 12" className={`shrink-0 ${className}`} aria-hidden="true" focusable="false">
      <rect x="0" y="3" width="32" height="6" rx="3" fill={band} opacity={tone === "dark" ? 0.18 : 0.22} />
      <rect x="6" y="3" width="18" height="6" rx="3" fill={band} />
      <rect x="12.5" y="0" width="3" height="12" rx="1.5" fill={tick} />
    </svg>
  );
}
