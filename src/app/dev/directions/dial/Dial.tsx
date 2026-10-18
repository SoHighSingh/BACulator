"use client";

import { useEffect, useState } from "react";

import type { LoggedDrink } from "~/hooks/useNight";
import type { NightSimulation } from "~/lib/bac-calculator";
import { formatClock } from "~/lib/format-clock";

const HOUR = 3_600_000;
const C = 200; // centre of the 400-unit viewBox
const BEZEL_R = 178; // the ring the night is drawn on
const FACE_R = 158;

// Back to zero is shown as 0.75x to 1.6x of the model's remaining time (see formatBackToZero).
const ZERO_EARLY = 0.75;
const ZERO_LATE = 1.6;
const QUARTER = 15 * 60_000;

/** Degrees clockwise from 12 o'clock on a 12-hour dial. Unwrapped, so arcs can ease across 12. */
function angleOf(t: number, anchor: number) {
  return ((t - anchor) / HOUR) * 30;
}
function polar(deg: number, r: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [C + r * Math.sin(a), C - r * Math.cos(a)];
}

export interface DialTimes {
  /** Start of the night as drawn (first drink, clamped to the last 12 h). */
  start: number | null;
  now: number;
  zeroAt: number | null;
  early: number | null;
  late: number | null;
}

/** The back-to-zero window from the simulation: now + (zeroAt - now) x 0.75 to x 1.6, to the quarter hour. */
export function dialTimes(sim: NightSimulation | null, drinks: LoggedDrink[], now: Date): DialTimes {
  const nowT = now.getTime();
  const counted = drinks.map((d) => d.finishedAt.getTime()).filter((t) => t <= nowT);
  const first = counted.length ? Math.min(...counted) : null;
  const start = first === null ? null : Math.max(first, nowT - 12 * HOUR + QUARTER);
  const zeroAt = sim?.zeroAt && sim.zeroAt > nowT ? sim.zeroAt : null;
  if (!zeroAt) return { start, now: nowT, zeroAt: null, early: null, late: null };
  const left = zeroAt - nowT;
  const round = (t: number) => Math.round(t / QUARTER) * QUARTER;
  return { start, now: nowT, zeroAt, early: round(nowT + left * ZERO_EARLY), late: round(nowT + left * ZERO_LATE) };
}

interface DialProps {
  simulation: NightSimulation | null;
  drinks: LoggedDrink[];
  now: Date;
  /** "0.08", or null to leave the centre empty */
  point: string | null;
  likely: string | null;
  /** Scrubbed time on the curve: drawn as a ghost hand. */
  ghostT?: number | null;
  className?: string;
  /** "hero": the centre type is set smaller relative to the dial, which is drawn huge. */
  size?: "app" | "hero";
}

/**
 * A 12-hour watch dial. Indices are time only: there is no BAC scale anywhere on it. The bezel holds
 * the night: first drink to now (solid lume), now to the model's zero (fine lume), and the likely
 * back-to-zero window (shaded). Each drink is a mark on the ring; one hand points to now and jumps
 * only when the clock ticks over.
 */
export function Dial({ simulation, drinks, now, point, likely, ghostT = null, className = "", size = "app" }: DialProps) {
  // A fixed anchor (local midnight, a day back) keeps angles continuous so arcs ease across 12.
  const [anchor] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime() - 24 * HOUR;
  });
  const times = dialTimes(simulation, drinks, now);
  const nowDeg = angleOf(times.now, anchor);

  // Arm the easing only after the first full draw, so nothing animates on load.
  const hasNight = times.start !== null;
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!hasNight || armed) return;
    const id = window.setTimeout(() => setArmed(true), 80);
    return () => window.clearTimeout(id);
  }, [hasNight, armed]);

  // Nothing drawn ahead may wrap round onto the night already drawn.
  const limit = (times.start ?? times.now) + 12 * HOUR - QUARTER;
  const clip = (t: number | null) => (t === null ? null : Math.min(t, limit));
  const zero = clip(times.zeroAt);
  const early = clip(times.early);
  const late = clip(times.late);

  const arc = (from: number | null, to: number | null) => {
    if (from === null || to === null || to <= from) return { span: 0, rot: nowDeg - 90 };
    const a = angleOf(from, anchor);
    return { span: angleOf(to, anchor) - a, rot: a - 90 };
  };
  const past = arc(times.start, times.now);
  const ahead = arc(times.now, zero);
  const windowArc = arc(early, late);

  const arcStyle = (rot: number) => ({ transform: `rotate(${rot}deg)`, transformOrigin: `${C}px ${C}px` });
  const arcCls = armed ? "dial-arc" : "";

  const shown = drinks.filter((d) => d.finishedAt.getTime() <= times.now && d.finishedAt.getTime() >= (times.start ?? 0));

  const fs = size === "hero" ? { about: "5.2cqw", num: "15cqw", min: "56px", likely: "3.8cqw" } : { about: "7.4cqw", num: "20.5cqw", min: "64px", likely: "5.6cqw" };
  const summary = hasNight
    ? `Watch dial. Tonight drawn from ${formatClock(times.start!)} to now, ${formatClock(times.now)}, with ${shown.length} ${
        shown.length === 1 ? "drink" : "drinks"
      } marked.${early && late ? ` Back to zero shaded from ${formatClock(early)} to ${formatClock(late)}.` : ""}`
    : `Watch dial showing now, ${formatClock(times.now)}.`;

  return (
    <div className={`dial ${className}`}>
      <p className="sr-only">{summary}</p>
      <svg viewBox="0 0 400 400" aria-hidden="true" className="absolute inset-0 size-full overflow-visible">
        {/* Case and bezel, then the face. */}
        <circle cx={C} cy={C} r={198} fill="var(--color-surface-2)" />
        <circle cx={C} cy={C} r={FACE_R} fill="var(--color-surface)" />

        {/* The likely back-to-zero window: wide and shaded. */}
        <circle
          cx={C}
          cy={C}
          r={BEZEL_R}
          pathLength={360}
          fill="none"
          stroke="var(--dial-lume)"
          strokeOpacity={0.36}
          strokeWidth={30}
          strokeDasharray={`${windowArc.span} 360`}
          className={arcCls}
          style={arcStyle(windowArc.rot)}
        />
        {/* Now to the model's zero: a fine line. */}
        <circle
          cx={C}
          cy={C}
          r={BEZEL_R}
          pathLength={360}
          fill="none"
          stroke="var(--dial-lume)"
          strokeWidth={3}
          strokeDasharray={`${ahead.span} 360`}
          className={arcCls}
          style={arcStyle(ahead.rot)}
        />
        {/* First drink to now: solid. */}
        <circle
          cx={C}
          cy={C}
          r={BEZEL_R}
          pathLength={360}
          fill="none"
          stroke="var(--dial-lume)"
          strokeWidth={10}
          strokeDasharray={`${past.span} 360`}
          className={arcCls}
          style={arcStyle(past.rot)}
        />

        {/* 60 minute indices, 12 hour batons, a double baton at 12. Time only. */}
        {Array.from({ length: 60 }, (_, i) => {
          const hour = i % 5 === 0;
          const [x1, y1] = polar(i * 6, 152);
          const [x2, y2] = polar(i * 6, hour ? 130 : 144);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={hour ? "var(--color-ink-2)" : "var(--dial-index)"}
              strokeWidth={hour ? 4 : 1.5}
              strokeLinecap="butt"
              transform={i === 0 ? "translate(-4 0)" : undefined}
            />
          );
        })}
        <line x1={C + 4} y1={C - 152} x2={C + 4} y2={C - 130} stroke="var(--color-ink-2)" strokeWidth={4} />

        {/* Each drink, where it sits in the night. */}
        {shown.map((d) => {
          const t = d.finishedAt.getTime();
          const deg = angleOf(t, anchor);
          const [x, y] = polar(deg, BEZEL_R);
          const [ox, oy] = polar(deg, 26);
          const fresh = times.now - t < 4000;
          return (
            <circle
              key={d.id}
              cx={x}
              cy={y}
              r={7}
              fill="var(--color-ink)"
              stroke="var(--color-surface-2)"
              strokeWidth={3}
              className={fresh ? "dial-dot-new" : undefined}
              style={fresh ? ({ "--dx": `${(ox - C).toFixed(1)}px`, "--dy": `${(oy - C).toFixed(1)}px` } as React.CSSProperties) : undefined}
            />
          );
        })}

        {/* Ghost hand at the scrubbed time. */}
        {ghostT !== null && (
          <g transform={`rotate(${angleOf(ghostT, anchor) % 360} ${C} ${C})`}>
            <rect x={C - 4} y={4} width={8} height={74} rx={1} fill="var(--color-bg)" fillOpacity={0.6} stroke="var(--color-ink)" strokeWidth={2.5} />
          </g>
        )}
        {/* The hand: a lume baton reaching across the bezel to now. */}
        <g transform={`rotate(${nowDeg % 360} ${C} ${C})`}>
          <rect x={C - 4.5} y={2} width={9} height={76} rx={1} fill="var(--dial-lume)" stroke="var(--color-bg)" strokeWidth={2.5} />
        </g>
      </svg>

      {point !== null && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="x-wide leading-none text-ink" style={{ fontSize: `clamp(24px, ${fs.about}, 120px)` }}>
            about
          </span>
          <span
            key={point}
            className="dial-roll x-widest leading-[0.95] text-ink"
            style={{ fontSize: `clamp(${fs.min}, ${fs.num}, 300px)`, marginTop: "0.04em" }}
          >
            {point}
          </span>
          {likely && (
            <span className="mt-[0.4em] leading-tight font-medium text-ink-2" style={{ fontSize: `clamp(18px, ${fs.likely}, 72px)` }}>
              Likely {likely}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
