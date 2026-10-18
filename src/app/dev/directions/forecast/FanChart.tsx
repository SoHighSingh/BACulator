"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { NightSimulation } from "~/lib/bac-calculator";
import { formatPoint } from "~/lib/estimate-display";
import { formatClock } from "~/lib/format-clock";
import { useScrub, valueAt } from "../_kit/curve";
import { bandPath, buildGeo, forecastWindow, lerpGeo, likelyAt, polyline, type Geo, type Label } from "./fan";

const DURATION = 500;
const ease = (k: number) => 1 - Math.pow(1 - k, 3);

/** Width of the box, measured, so the chart is drawn at real pixels and text never stretches. */
function useWidth(initial: number) {
  const ref = useRef<HTMLElement | null>(null);
  const [w, setW] = useState(initial);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => e && setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    setW(Math.round(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  return { ref, w };
}

/**
 * The fan redraws over 500 ms when the night changes (an add, an undo, a remove): every point
 * slides from where it was to where it now is. A resize or the clock ticking just snaps. Off
 * under reduced motion.
 */
function useAnimated(target: Geo, key: string): Geo {
  const shown = useRef(target);
  const lastKey = useRef(key);
  const [frame, setFrame] = useState<{ from: Geo; start: number; k: number } | null>(null);

  useEffect(() => {
    if (lastKey.current === key) return;
    lastKey.current = key;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const from = shown.current;
    const start = performance.now();
    let id = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / DURATION);
      setFrame(k < 1 ? { from, start, k: ease(k) } : null);
      if (k < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [key]);

  const geo = frame ? lerpGeo(frame.from, target, frame.k) : target;
  shown.current = geo;
  return geo;
}

function Note({ label, font, weight = 600, fill = "var(--fx-ink)" }: { label: Label; font: number; weight?: number; fill?: string }) {
  return (
    <text x={label.x} y={label.y} textAnchor={label.anchor} fontSize={font} fontWeight={weight} style={{ fill }}>
      {label.lines.map((line, i) => (
        <tspan key={i} x={label.x} dy={i ? font * 1.3 : 0}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

interface FanChartProps {
  sim: NightSimulation;
  now: Date;
  /** Changes when drinks change: that's what animates. */
  animKey: string;
  plotH: number;
  font?: number;
}

/** The night as a forecast: one known line, then a fan that widens and closes, annotated in words. */
export function FanChart({ sim, now, animKey, plotH, font = 17 }: FanChartProps) {
  const win = useMemo(() => forecastWindow(sim, now), [sim, now]);
  const { ref: sizeRef, w } = useWidth(343);
  const target = useMemo(() => buildGeo(sim, win, { width: w, plotH, annotate: true, font }), [sim, win, w, plotH, font]);
  const g = useAnimated(target, animKey);
  const { box, t, handlers } = useScrub(win);
  const clip = `fx-plot-${useId().replace(/:/g, "")}`;

  const nowT = win.nowT;
  const picked = t ?? nowT;
  const bac = Math.max(0, valueAt(sim.samples, picked));
  const likely = likelyAt(sim, nowT, picked);
  const cx = ((picked - g.t0) / (g.t1 - g.t0)) * g.W;
  const cy = g.y0 - (bac / g.max) * (g.y0 - g.top);

  return (
    <div className="fx-chart">
      <p className="flex min-h-12 flex-wrap items-baseline gap-x-2 text-lg font-semibold text-ink" aria-live="off">
        <span className="font-bold">{t === null ? "Now" : formatClock(picked)}</span>
        <span aria-hidden="true">·</span>
        <span className="font-bold">about {formatPoint(bac)}</span>
        {likely && (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-ink-2">likely {likely}</span>
          </>
        )}
      </p>
      <div
        ref={(el) => {
          box.current = el;
          sizeRef.current = el;
        }}
        className="relative cursor-ew-resize touch-pan-y select-none"
        style={{ height: g.H }}
        {...handlers}
      >
        <svg width={g.W} height={g.H} viewBox={`0 0 ${g.W} ${g.H}`} className="absolute inset-0 overflow-visible" role="img" aria-label={describe(g)}>
          <defs>
            <clipPath id={clip}>
              <rect x={0} y={0} width={g.W} height={g.y0 + 1} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clip})`}>
            <path d={bandPath(g.upper, g.lower)} style={{ fill: "var(--fx-fan)" }} fillOpacity={0.2} />
            <path d={bandPath(g.inUpper, g.inLower)} style={{ fill: "var(--fx-fan)" }} fillOpacity={0.32} />
            <path d={polyline(g.past)} fill="none" style={{ stroke: "var(--fx-ink)" }} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
            <path d={polyline(g.model)} fill="none" style={{ stroke: "var(--fx-ink)" }} strokeWidth={2.5} strokeDasharray="6 6" strokeLinejoin="round" />
          </g>
          {/* The time axis: the only scale on the chart. No value ticks, no horizontal guides. */}
          <line x1={0} x2={g.W} y1={g.y0} y2={g.y0} style={{ stroke: "var(--fx-ink-2)" }} strokeWidth={1.5} />
          {g.hours.map((h) => (
            <g key={h.text}>
              <line x1={h.x} x2={h.x} y1={g.y0} y2={g.y0 + 6} style={{ stroke: "var(--fx-ink-2)" }} strokeWidth={1.5} />
              <text x={h.x} y={g.y0 + 24} textAnchor="middle" fontSize={16} fontWeight={500} style={{ fill: "var(--fx-ink-2)" }}>
                {h.text}
              </text>
            </g>
          ))}
          {g.bracket && (
            <>
              <path
                d={`M${g.bracket.x1} ${g.y0 + 30}V${g.y0 + 36}H${g.bracket.x2}V${g.y0 + 30}`}
                fill="none"
                style={{ stroke: "var(--fx-ink)" }}
                strokeWidth={2}
              />
              <Note label={g.bracket.label} font={font} />
            </>
          )}
          {g.nowLeader && <path d={polyline(g.nowLeader)} fill="none" style={{ stroke: "var(--fx-ink)" }} strokeWidth={1.5} />}
          {g.peakLeader && <path d={polyline(g.peakLeader)} fill="none" style={{ stroke: "var(--fx-ink)" }} strokeWidth={1.5} />}
          {g.peakDot && <circle cx={g.peakDot.x} cy={g.peakDot.y} r={4} style={{ fill: "var(--fx-ink)" }} />}
          {g.nowLabel && <Note label={g.nowLabel} font={font} weight={700} />}
          {g.peakLabel && <Note label={g.peakLabel} font={font} />}
          <circle cx={g.now.x} cy={g.now.y} r={7} style={{ fill: "var(--fx-hl)", stroke: "var(--fx-dot-ring)" }} strokeWidth={2.5} />
          {t !== null && (
            <>
              <line x1={cx} x2={cx} y1={g.top - 6} y2={g.y0} style={{ stroke: "var(--fx-ink)" }} strokeWidth={2} />
              <circle cx={cx} cy={cy} r={6} style={{ fill: "var(--fx-ink)", stroke: "var(--fx-halo)" }} strokeWidth={2.5} />
            </>
          )}
        </svg>
      </div>
    </div>
  );
}

function describe(g: Geo) {
  return [g.nowLabel?.lines.join(" "), g.peakLabel?.lines.join(" "), g.bracket?.label.lines.join(" ")].filter(Boolean).join(". ");
}

/** The small fan that sits inside the headline: same data, no words. */
export function MiniFan({ sim, now, animKey }: { sim: NightSimulation; now: Date; animKey: string }) {
  const win = useMemo(() => forecastWindow(sim, now), [sim, now]);
  const { ref, w } = useWidth(120);
  const [h, setH] = useState(40);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => e && setH(Math.round(e.contentRect.height)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  const target = useMemo(() => buildGeo(sim, win, { width: w, plotH: Math.max(10, h - 6), annotate: false, font: 12 }), [sim, win, w, h]);
  const g = useAnimated(target, animKey);
  const stroke = Math.max(2, h / 16);

  return (
    <span ref={(el) => { ref.current = el; }} className="fx-inline-chart" aria-hidden="true">
      <svg width={g.W} height={g.H} viewBox={`0 0 ${g.W} ${g.H}`} className="block overflow-visible">
        <path d={bandPath(g.upper, g.lower)} style={{ fill: "var(--fx-fan)" }} fillOpacity={0.24} />
        <path d={bandPath(g.inUpper, g.inLower)} style={{ fill: "var(--fx-fan)" }} fillOpacity={0.36} />
        <path d={polyline(g.past)} fill="none" style={{ stroke: "var(--fx-ink)" }} strokeWidth={stroke} strokeLinejoin="round" strokeLinecap="round" />
        <path d={polyline(g.model)} fill="none" style={{ stroke: "var(--fx-ink)" }} strokeWidth={stroke * 0.8} strokeDasharray={`${stroke * 2} ${stroke * 2}`} />
        <line x1={0} x2={g.W} y1={g.y0} y2={g.y0} style={{ stroke: "var(--fx-ink)" }} strokeWidth={stroke * 0.6} />
        <circle cx={g.now.x} cy={g.now.y} r={stroke * 2.2} style={{ fill: "var(--fx-hl)", stroke: "var(--fx-dot-ring)" }} strokeWidth={stroke * 0.8} />
      </svg>
    </span>
  );
}
