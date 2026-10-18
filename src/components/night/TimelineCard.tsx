import { Maximize2 } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";

import type { NightSimulation } from "~/lib/bac-calculator";
import { formatPoint } from "~/lib/estimate-display";
import { formatClock, formatHour } from "~/lib/format-clock";

interface ChartProps {
  simulation: NightSimulation;
  now: Date;
  height: number;
  /** Hour labels along the bottom and the top value on the left (the bigger chart). */
  axes?: boolean;
  /** Reports the scrubbed time (null at rest), so a header can read it. */
  onPick?: (t: number | null, bac: number) => void;
}

const W = 400;

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

/**
 * Tonight's curve as one continuous line: solid with a soft glow up to now, dashed after, split by
 * clipping so there is never a gap. Drag across it to read any time. No horizontal lines anywhere:
 * nothing on it reads as a limit.
 */
export function TimelineChart({ simulation, now, height, axes = false, onPick }: ChartProps) {
  const id = useId().replace(/:/g, "");
  const box = useRef<HTMLDivElement>(null);
  const [scrub, setScrub] = useState<number | null>(null);
  const { samples } = simulation;
  const H = height;
  const padTop = 12;
  const padBottom = 4;

  const geo = useMemo(() => {
    const t0 = samples[0]?.t ?? now.getTime();
    const nowT = now.getTime();
    const last = samples[samples.length - 1]?.t ?? t0 + 1;
    // Look ahead as far as has passed (at least 3 h), so tonight isn't squashed into a corner.
    const ahead = Math.max(3 * 3_600_000, nowT - t0);
    const t1 = Math.max(nowT + 30 * 60_000, Math.min(last, nowT + ahead));
    const max = Math.max(0.04, ...samples.filter((s) => s.t <= t1).map((s) => s.bac)) * 1.15;
    const x = (t: number) => ((t - t0) / (t1 - t0)) * W;
    const y = (b: number) => padTop + (1 - b / max) * (H - padTop - padBottom);
    const end = samples.findIndex((s) => s.t > t1);
    const shown = end === -1 ? samples : samples.slice(0, end + 1);
    const line = shown.map((s, i) => `${i ? "L" : "M"}${x(s.t).toFixed(1)} ${y(s.bac).toFixed(1)}`).join(" ");
    const area = `${line} L${x(shown[shown.length - 1]?.t ?? t1).toFixed(1)} ${y(0)} L${x(t0).toFixed(1)} ${y(0)} Z`;
    const hours: number[] = [];
    const firstHour = new Date(t0);
    firstHour.setMinutes(0, 0, 0);
    const span = (t1 - t0) / 3_600_000;
    const every = span > 12 ? 3 : span > 6 ? 2 : 1;
    for (let t = firstHour.getTime() + 3_600_000; t < t1; t += 3_600_000 * every) hours.push(t);
    return { t0, t1, max, x, y, line, area, hours };
  }, [samples, now, H]);

  const nowX = geo.x(now.getTime());
  const picked = scrub ?? now.getTime();
  const pickedBac = valueAt(samples, picked);

  function pick(clientX: number) {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    const f = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    const t = geo.t0 + f * (geo.t1 - geo.t0);
    setScrub(t);
    onPick?.(t, valueAt(samples, t));
  }
  function release() {
    setScrub(null);
    onPick?.(null, valueAt(samples, now.getTime()));
  }

  return (
    <div>
      <div
        ref={box}
        className="curve-reveal relative touch-pan-y select-none"
        style={{ height: H }}
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          pick(e.clientX);
        }}
        onPointerMove={(e) => e.buttons && pick(e.clientX)}
        onPointerUp={release}
        onPointerCancel={release}
      >
        <svg aria-hidden="true" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
          <defs>
            <linearGradient id={`fill-${id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#7cb4ff" stopOpacity="0.35" />
              <stop offset="1" stopColor="#7cb4ff" stopOpacity="0" />
            </linearGradient>
            <clipPath id={`past-${id}`}>
              <rect x={0} y={-20} width={Math.max(0, nowX)} height={H + 40} />
            </clipPath>
            <clipPath id={`future-${id}`}>
              <rect x={nowX} y={-20} width={Math.max(0, W - nowX)} height={H + 40} />
            </clipPath>
            <filter id={`glow-${id}`} x="-20%" y="-50%" width="140%" height="200%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>
          <g clipPath={`url(#past-${id})`}>
            <path d={geo.area} fill={`url(#fill-${id})`} />
            <path d={geo.line} fill="none" stroke="#7cb4ff" strokeWidth={6} opacity={0.5} filter={`url(#glow-${id})`} vectorEffect="non-scaling-stroke" />
            <path d={geo.line} fill="none" stroke="#a9ceff" strokeWidth={2.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </g>
          <g clipPath={`url(#future-${id})`}>
            <path d={geo.line} fill="none" stroke="#7cb4ff" strokeWidth={2.5} strokeDasharray="4 6" strokeLinecap="round" opacity={0.85} vectorEffect="non-scaling-stroke" />
          </g>
          <line x1={nowX} x2={nowX} y1={0} y2={geo.y(0)} stroke="rgb(250 250 250 / 0.5)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          {scrub !== null && (
            <line x1={geo.x(picked)} x2={geo.x(picked)} y1={0} y2={geo.y(0)} stroke="#fafafa" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          )}
        </svg>
        {/* Dots are HTML so they stay round when the SVG stretches. */}
        <span
          className="pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink shadow-[0_0_0_4px_rgb(124_180_255/0.35)]"
          style={{ left: `${(nowX / W) * 100}%`, top: geo.y(valueAt(samples, now.getTime())) }}
        />
        {scrub !== null && (
          <span
            className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink"
            style={{ left: `${(geo.x(picked) / W) * 100}%`, top: geo.y(pickedBac) }}
          />
        )}
        {axes && <span className="absolute top-0 left-0 text-base text-ink-2 tabular-nums">{formatPoint(geo.max / 1.15)}</span>}
      </div>
      <div className="relative mt-2 h-6 text-base text-ink-2 tabular-nums" aria-hidden="true">
        {geo.hours.map((t) => (
          <span key={t} className="absolute -translate-x-1/2" style={{ left: `${Math.min(94, Math.max(6, (geo.x(t) / W) * 100))}%` }}>
            {formatHour(t)}
          </span>
        ))}
      </div>
    </div>
  );
}

interface TimelineCardProps {
  simulation: NightSimulation | null;
  now: Date;
  onExpand: () => void;
}

/** Tonight's curve on the main screen; the header reads whatever time is being scrubbed. */
export function TimelineCard({ simulation, now, onExpand }: TimelineCardProps) {
  const [picked, setPicked] = useState<{ t: number | null; bac: number } | null>(null);
  if (!simulation || simulation.samples.length < 2) return null;
  const bac = picked?.bac ?? valueAt(simulation.samples, now.getTime());
  return (
    <section aria-labelledby="curve-heading" className="card p-5">
      {/* The header opens the bigger graph; dragging the curve itself scrubs. No instructions needed. */}
      <button type="button" onClick={onExpand} aria-label="Tonight: open a bigger graph" className="press -mx-2 -mt-2 flex min-h-12 w-[calc(100%+16px)] items-center justify-between gap-3 rounded-xl px-2 text-left">
        <h2 id="curve-heading" className="flex items-center gap-1.5 text-lg font-semibold">
          Tonight
          <Maximize2 aria-hidden="true" className="size-4 text-ink-2" strokeWidth={2} />
        </h2>
        <span className="text-lg" aria-live="off">
          <span className="text-ink-2">{picked?.t ? formatClock(picked.t) : "Now"} · </span>
          <span className="font-medium">about {formatPoint(bac)}</span>
        </span>
      </button>
      <div className="mt-3">
        <TimelineChart simulation={simulation} now={now} height={170} onPick={(t, b) => setPicked(t === null ? null : { t, bac: b })} />
      </div>
    </section>
  );
}
