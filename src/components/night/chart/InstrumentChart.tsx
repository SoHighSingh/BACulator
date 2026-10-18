"use client";

import { useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { NightSimulation } from "~/lib/bac-calculator";
import { formatPoint } from "~/lib/estimate-display";
import { formatClock, formatHour } from "~/lib/format-clock";

import { axisValue, bandPath, chartWindow, crisp, polyline, valueAt } from "./geometry";

export interface Look {
  /** Hairline at every labelled hour, full height. */
  timeGrid: boolean;
  /** Hairline at every clean y step. */
  yGrid: boolean;
  /** Value labels down the right edge. */
  yLabels: boolean;
  /** Light gradient under the curve. */
  area: boolean;
  /** The likely range (0.75–1.4× of the model) around the line. */
  band: "fill" | "outline" | "none";
}

export const DEFAULT_LOOK: Look = { timeGrid: true, yGrid: false, yLabels: true, area: true, band: "fill" };

export interface InstrumentChartProps {
  simulation: NightSimulation;
  now: Date;
  /** Height of the plot; the time axis row (30px) is added below it. */
  height: number;
  /** Drink times (ms), marked on the time axis. */
  events?: number[];
  /** Reports the scrubbed time (null at rest) so a header can read it. */
  onPick?: (t: number | null, bac: number) => void;
  look?: Partial<Look>;
  /** Show the time · value tag at the cursor while scrubbing (default true). */
  readout?: boolean;
  ariaLabel?: string;
}

const AXIS_H = 30;
const PAD_TOP = 10;
const GUTTER = 48;
const STEP = 5 * 60_000;

/**
 * Tonight's curve as an instrument, not an illustration: the model drawn at its own sampling (one
 * point per step, no smoothing), a 1.5px line, hairline grid, tabular axes, the likely range as a
 * faint band, drinks as marks on the time axis, and a crisp cursor. Everything is in CSS pixels
 * (measured, never stretched), so strokes and type stay exact at every width. Nothing moves at rest.
 * No horizontal line ever means a limit: rows are a grid at clean steps, never 0.05 or 0.08 singled out.
 */
export function InstrumentChart({ simulation, now, height, events = [], onPick, look: lookIn, readout = true, ariaLabel }: InstrumentChartProps) {
  const look = { ...DEFAULT_LOOK, ...lookIn };
  const id = useId().replace(/:/g, "");
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [scrub, setScrub] = useState<number | null>(null);
  const { samples } = simulation;
  const nowT = now.getTime();

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const win = useMemo(() => chartWindow(simulation, now, { band: look.band !== "none" }), [simulation, now, look.band]);
  const plotW = Math.max(0, width - (look.yLabels ? GUTTER : 0));
  const H = height;
  const x = useCallback((t: number) => ((t - win.t0) / (win.t1 - win.t0)) * plotW, [win.t0, win.t1, plotW]);
  const y = useCallback((b: number) => PAD_TOP + (1 - b / win.top) * (H - PAD_TOP), [win.top, H]);
  const baseY = crisp(y(0));

  const paths = useMemo(() => {
    const pts = win.shown.map((s): [number, number] => [x(s.t), y(s.bac)]);
    const line = polyline(pts);
    const lastX = pts[pts.length - 1]?.[0] ?? 0;
    const firstX = pts[0]?.[0] ?? 0;
    const area = `${line} L${lastX.toFixed(2)} ${y(0).toFixed(2)} L${firstX.toFixed(2)} ${y(0).toFixed(2)} Z`;
    const band = bandPath(win.shown, x, y);
    return { line, area, band };
  }, [win.shown, x, y]);

  const nowX = x(nowT);
  const picked = scrub ?? nowT;
  const pickedBac = valueAt(samples, picked);

  const pickAt = useCallback(
    (t: number | null) => {
      setScrub(t);
      onPick?.(t, valueAt(samples, t ?? nowT));
    },
    [onPick, samples, nowT],
  );
  function pickClient(clientX: number) {
    const r = box.current?.getBoundingClientRect();
    if (!r || plotW === 0) return;
    const f = Math.min(1, Math.max(0, (clientX - r.left) / plotW));
    pickAt(win.t0 + f * (win.t1 - win.t0));
  }
  function onKey(e: React.KeyboardEvent) {
    const cur = scrub ?? nowT;
    const move = (d: number) => pickAt(Math.min(win.t1, Math.max(win.t0, cur + d)));
    switch (e.key) {
      case "ArrowLeft":
        move(e.shiftKey ? -6 * STEP : -STEP);
        break;
      case "ArrowRight":
        move(e.shiftKey ? 6 * STEP : STEP);
        break;
      case "Home":
        move(win.t0 - cur);
        break;
      case "End":
        move(win.t1 - cur);
        break;
      case "Escape":
        pickAt(null);
        break;
      default:
        return;
    }
    e.preventDefault();
  }

  const total = H + AXIS_H;
  // Hour labels need about 56px each; where they would crowd, label every second hour (ticks stay).
  const labelEvery = win.hours.length > 0 && plotW / win.hours.length < 60 ? 2 : 1;
  const cursorX = x(picked);
  const readoutText = `${formatClock(picked)} · ${pickedBac >= 0.01 ? "about " : ""}${formatPoint(pickedBac)}`;

  return (
    <div
      ref={box}
      role="slider"
      tabIndex={0}
      aria-label={ariaLabel ?? "Tonight's curve: read any time"}
      aria-valuemin={win.t0}
      aria-valuemax={win.t1}
      aria-valuenow={picked}
      aria-valuetext={readoutText}
      aria-orientation="horizontal"
      className="curve-reveal relative touch-pan-y select-none rounded-card outline-none focus-visible:ring-2 focus-visible:ring-signal/70 focus-visible:ring-offset-4 focus-visible:ring-offset-surface"
      style={{ height: total }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        pickClient(e.clientX);
      }}
      onPointerMove={(e) => e.buttons && pickClient(e.clientX)}
      onPointerUp={() => pickAt(null)}
      onPointerCancel={() => pickAt(null)}
      onKeyDown={onKey}
      onBlur={() => scrub !== null && pickAt(null)}
    >
      {width > 0 && (
        <svg aria-hidden="true" width={width} height={total} viewBox={`0 0 ${width} ${total}`} className="absolute inset-0 block overflow-visible">
          <defs>
            <linearGradient id={`area-${id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--color-signal)" stopOpacity="0.22" />
              <stop offset="1" stopColor="var(--color-signal)" stopOpacity="0.01" />
            </linearGradient>
            <clipPath id={`past-${id}`}>
              <rect x={-1} y={-20} width={Math.max(0, nowX + 1)} height={total + 40} />
            </clipPath>
            <clipPath id={`future-${id}`}>
              <rect x={nowX} y={-20} width={Math.max(0, plotW - nowX + 1)} height={total + 40} />
            </clipPath>
          </defs>

          {/* Grid: recessive hairlines, one shade off the surface. */}
          {look.yGrid &&
            win.rows.map((v) => (
              <line key={v} x1={0} x2={plotW} y1={crisp(y(v))} y2={crisp(y(v))} stroke="var(--color-edge)" strokeWidth={1} />
            ))}
          {look.timeGrid &&
            win.hours.map((t) => <line key={t} x1={crisp(x(t))} x2={crisp(x(t))} y1={PAD_TOP - 4} y2={baseY} stroke="var(--color-edge)" strokeWidth={1} />)}

          {/* The likely range: 0.75–1.4× of the model. */}
          {look.band === "fill" && <path d={paths.band} fill="var(--color-signal)" fillOpacity={0.09} />}
          {look.band === "outline" && <path d={paths.band} fill="none" stroke="var(--color-signal)" strokeOpacity={0.35} strokeWidth={1} strokeDasharray="2 3" />}

          {/* Past: solid line over a light wash. */}
          <g clipPath={`url(#past-${id})`}>
            {look.area && <path d={paths.area} fill={`url(#area-${id})`} />}
            <path d={paths.line} fill="none" stroke="var(--color-signal)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
          </g>
          {/* Future: the same line, dashed and dimmer. */}
          <g clipPath={`url(#future-${id})`}>
            {look.area && <path d={paths.area} fill={`url(#area-${id})`} opacity={0.45} />}
            <path d={paths.line} fill="none" stroke="var(--color-signal)" strokeOpacity={0.72} strokeWidth={1.5} strokeDasharray="3 4" strokeLinecap="round" />
          </g>

          {/* Time axis: baseline, minor ticks, hour ticks and labels, drink marks. */}
          <line x1={0} x2={plotW} y1={baseY} y2={baseY} stroke="var(--color-line)" strokeWidth={1} />
          {win.minors.map((t) => (
            <line key={t} x1={crisp(x(t))} x2={crisp(x(t))} y1={baseY} y2={baseY + 4} stroke="var(--color-line)" strokeWidth={1} />
          ))}
          {win.hours.map((t, i) => (
            <g key={t}>
              <line x1={crisp(x(t))} x2={crisp(x(t))} y1={baseY} y2={baseY + 7} stroke="var(--color-ink-2)" strokeWidth={1} />
              {i % labelEvery === 0 && (
                <text x={Math.min(plotW - 22, Math.max(22, x(t)))} y={baseY + 21} textAnchor="middle" className="fill-ink-2 text-base tabular-nums">
                  {formatHour(t)}
                </text>
              )}
            </g>
          ))}
          {events
            .filter((t) => t >= win.t0 && t <= win.t1)
            .map((t, i) => (
              <rect key={`${t}-${i}`} x={Math.round(x(t)) - 1.5} y={baseY - 4} width={3} height={8} rx={1} fill="var(--color-ink)" />
            ))}

          {/* Value axis: labels down the right edge, tick marks only (no lines unless yGrid). */}
          {look.yLabels &&
            [0, ...win.rows].map((v) => (
              <g key={v}>
                <line x1={plotW} x2={plotW + 5} y1={crisp(y(v))} y2={crisp(y(v))} stroke="var(--color-line)" strokeWidth={1} />
                <text x={width} y={y(v)} textAnchor="end" dominantBaseline="central" className="fill-ink-2 text-base tabular-nums">
                  {axisValue(v)}
                </text>
              </g>
            ))}

          {/* Now: a hairline and a ringed dot on the curve. */}
          <line x1={crisp(nowX)} x2={crisp(nowX)} y1={PAD_TOP - 4} y2={baseY} stroke="var(--color-ink)" strokeOpacity={scrub === null ? 0.45 : 0.2} strokeWidth={1} />
          <circle cx={nowX} cy={y(valueAt(samples, nowT))} r={6} fill="var(--color-surface)" />
          <circle cx={nowX} cy={y(valueAt(samples, nowT))} r={4} fill="var(--color-ink)" />

          {/* Cursor while scrubbing. */}
          {scrub !== null && (
            <g>
              <line x1={crisp(cursorX)} x2={crisp(cursorX)} y1={PAD_TOP - 4} y2={baseY + 8} stroke="var(--color-ink)" strokeWidth={1} />
              <circle cx={cursorX} cy={y(pickedBac)} r={7} fill="var(--color-surface)" />
              <circle cx={cursorX} cy={y(pickedBac)} r={5} fill="var(--color-ink)" />
            </g>
          )}
        </svg>
      )}
      {scrub !== null && readout && width > 0 && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 whitespace-nowrap rounded-mark border border-edge bg-surface-2 px-2 py-0.5 text-lg leading-6 text-ink tabular-nums"
          style={cursorX < plotW / 2 ? { left: Math.min(plotW - 8, cursorX + 10) } : { right: width - cursorX + 10 }}
        >
          {readoutText}
        </div>
      )}
    </div>
  );
}
