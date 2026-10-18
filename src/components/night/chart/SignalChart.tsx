"use client";

import {
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { NightSimulation } from "~/lib/bac-calculator";
import { formatPoint } from "~/lib/estimate-display";
import { formatClock, formatHour } from "~/lib/format-clock";

import {
  chartWindow,
  crisp,
  monotonePath,
  polyline,
  thin,
  valueAt,
} from "./geometry";

export interface SignalChartProps {
  simulation: NightSimulation;
  now: Date;
  /** Height of the plot; the hour-label row (26px) is added below it. */
  height: number;
  /** Drink times (ms): small marks on the baseline (default on). */
  events?: number[];
  /** Reports the scrubbed time (null at rest) so a header can read it. */
  onPick?: (t: number | null, bac: number) => void;
  /** Show a time · value tag at the cursor while scrubbing (the bigger graph). Default off. */
  readout?: boolean;
  /** Draw the samples as a smooth monotone curve (default) or as the raw polyline. */
  smooth?: boolean;
  ariaLabel?: string;
}

const AXIS_H = 26;
const PAD_TOP = 14;
const STEP = 5 * 60_000;

/**
 * Tonight's curve as one signal: the model's own samples drawn as a smooth monotone curve (it
 * passes through every sample and never overshoots, so the peak and each drink's rise are honest),
 * solid over a soft wash up to now and dashed, dimmer after. A hairline and a ringed dot mark now;
 * hour labels sit along the bottom. Nothing else: no value axis, no grid, no band. No horizontal
 * line ever reads as a limit. Drag or arrow across it to read any time; the header reads the time.
 * Everything is in CSS pixels (measured, never stretched), so strokes stay exact at every width.
 */
export function SignalChart({
  simulation,
  now,
  height,
  events = [],
  onPick,
  readout = false,
  smooth = true,
  ariaLabel,
}: SignalChartProps) {
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

  const win = useMemo(() => chartWindow(simulation, now), [simulation, now]);
  const H = height;
  const x = useCallback(
    (t: number) => ((t - win.t0) / (win.t1 - win.t0)) * width,
    [win.t0, win.t1, width],
  );
  const y = useCallback(
    (b: number) => PAD_TOP + (1 - b / win.top) * (H - PAD_TOP),
    [win.top, H],
  );
  const baseY = crisp(y(0));

  const paths = useMemo(() => {
    const pts = thin(
      win.shown.map((s): [number, number] => [x(s.t), y(s.bac)]),
      2,
    );
    const line = smooth ? monotonePath(pts) : polyline(pts);
    const lastX = pts[pts.length - 1]?.[0] ?? 0;
    const firstX = pts[0]?.[0] ?? 0;
    const area = `${line} L${lastX.toFixed(2)} ${y(0).toFixed(2)} L${firstX.toFixed(2)} ${y(0).toFixed(2)} Z`;
    return { line, area };
  }, [win.shown, x, y, smooth]);

  const nowX = x(nowT);
  const nowY = y(valueAt(samples, nowT));
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
    if (!r || width === 0) return;
    const f = Math.min(1, Math.max(0, (clientX - r.left) / width));
    pickAt(win.t0 + f * (win.t1 - win.t0));
  }
  function onKey(e: React.KeyboardEvent) {
    const cur = scrub ?? nowT;
    const move = (d: number) =>
      pickAt(Math.min(win.t1, Math.max(win.t0, cur + d)));
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
  // Hour labels need about 48px each; where they would crowd, label every second hour.
  const labelEvery =
    win.hours.length > 0 && width / win.hours.length < 52 ? 2 : 1;
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
      className="curve-reveal focus-visible:ring-signal/70 focus-visible:ring-offset-surface relative touch-pan-y rounded-lg outline-none select-none focus-visible:ring-2 focus-visible:ring-offset-4"
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
        <svg
          aria-hidden="true"
          width={width}
          height={total}
          viewBox={`0 0 ${width} ${total}`}
          className="absolute inset-0 block overflow-visible"
        >
          <defs>
            <linearGradient id={`wash-${id}`} x1="0" x2="0" y1="0" y2="1">
              <stop
                offset="0"
                stopColor="var(--color-signal)"
                stopOpacity="0.3"
              />
              <stop
                offset="1"
                stopColor="var(--color-signal)"
                stopOpacity="0"
              />
            </linearGradient>
            <clipPath id={`past-${id}`}>
              <rect
                x={-2}
                y={-20}
                width={Math.max(0, nowX + 2)}
                height={total + 40}
              />
            </clipPath>
            <clipPath id={`future-${id}`}>
              <rect
                x={nowX}
                y={-20}
                width={Math.max(0, width - nowX + 2)}
                height={total + 40}
              />
            </clipPath>
          </defs>

          {/* Past: the signal over a soft wash. */}
          <g clipPath={`url(#past-${id})`}>
            <path d={paths.area} fill={`url(#wash-${id})`} />
            <path
              d={paths.line}
              fill="none"
              stroke="var(--color-signal)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </g>
          {/* Future: the same line, dashed and dimmer. */}
          <g clipPath={`url(#future-${id})`}>
            <path
              d={paths.line}
              fill="none"
              stroke="var(--color-signal)"
              strokeOpacity={0.6}
              strokeWidth={2}
              strokeDasharray="3 5"
              strokeLinecap="round"
            />
          </g>

          {/* Baseline (zero), with each drink as a small mark on it. */}
          <line
            x1={0}
            x2={width}
            y1={baseY}
            y2={baseY}
            stroke="var(--color-edge)"
            strokeWidth={1}
          />
          {events
            .filter((t) => t >= win.t0 && t <= win.t1)
            .map((t, i) => (
              <rect
                key={`${t}-${i}`}
                x={Math.round(x(t)) - 1}
                y={baseY - 5}
                width={2}
                height={5}
                rx={1}
                fill="var(--color-ink-2)"
              />
            ))}

          {/* Hour labels. */}
          {win.hours.map(
            (t, i) =>
              i % labelEvery === 0 && (
                <text
                  key={t}
                  x={Math.min(width - 20, Math.max(20, x(t)))}
                  y={baseY + 20}
                  textAnchor="middle"
                  className="fill-ink-2 text-base tabular-nums"
                >
                  {formatHour(t)}
                </text>
              ),
          )}

          {/* Now: a hairline and a ringed dot on the curve; the ring fades while scrubbing elsewhere. */}
          <line
            x1={crisp(nowX)}
            x2={crisp(nowX)}
            y1={PAD_TOP - 6}
            y2={baseY}
            stroke="var(--color-ink)"
            strokeOpacity={scrub === null ? 0.5 : 0.25}
            strokeWidth={1}
          />
          <circle
            cx={nowX}
            cy={nowY}
            r={8}
            fill="var(--color-signal)"
            fillOpacity={scrub === null ? 0.35 : 0.18}
          />
          <circle
            cx={nowX}
            cy={nowY}
            r={4.5}
            fill="var(--color-ink)"
            fillOpacity={scrub === null ? 1 : 0.6}
          />

          {/* Cursor while scrubbing. */}
          {scrub !== null && (
            <g>
              <line
                x1={crisp(cursorX)}
                x2={crisp(cursorX)}
                y1={PAD_TOP - 6}
                y2={baseY}
                stroke="var(--color-ink)"
                strokeWidth={1}
              />
              <circle
                cx={cursorX}
                cy={y(pickedBac)}
                r={7}
                fill="var(--color-surface)"
              />
              <circle
                cx={cursorX}
                cy={y(pickedBac)}
                r={5}
                fill="var(--color-ink)"
              />
            </g>
          )}
        </svg>
      )}
      {scrub !== null && readout && width > 0 && (
        <div
          aria-hidden="true"
          className="border-edge bg-surface-2 text-ink pointer-events-none absolute top-0 rounded-md border px-2 py-0.5 text-lg leading-6 whitespace-nowrap tabular-nums"
          style={
            cursorX < width / 2
              ? { left: Math.min(width - 8, cursorX + 12) }
              : { right: width - cursorX + 12 }
          }
        >
          {readoutText}
        </div>
      )}
    </div>
  );
}
