import { useId, useMemo, useRef, useState } from "react";

import type { NightSimulation } from "~/lib/bac-calculator";
import { formatPoint } from "~/lib/estimate-display";

const clock = (t: number) =>
  new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
const hourLabel = (t: number) =>
  new Date(t).toLocaleTimeString("en-US", { hour: "numeric", hour12: true }).toLowerCase().replace(" ", "");

interface ChartProps {
  simulation: NightSimulation;
  now: Date;
  height: number;
  /** Hour labels along the bottom and the top value on the left (the bigger chart). */
  axes?: boolean;
}

const W = 400;

/**
 * Tonight's curve as one continuous line: solid up to now, dashed after, split by clipping so there
 * is never a gap at "now". Drag a thumb across it to read the time and estimate at any point. No
 * horizontal lines anywhere: nothing on it reads as a limit.
 */
export function TimelineChart({ simulation, now, height, axes = false }: ChartProps) {
  const id = useId().replace(/:/g, "");
  const box = useRef<HTMLDivElement>(null);
  const [scrub, setScrub] = useState<number | null>(null);
  const { samples } = simulation;
  const H = height;
  const padTop = 12;
  const padBottom = axes ? 28 : 6;

  const geo = useMemo(() => {
    const t0 = samples[0]?.t ?? now.getTime();
    const nowT = now.getTime();
    const last = samples[samples.length - 1]?.t ?? t0 + 1;
    // Show as much ahead as has passed (at least 3 h), so tonight isn't squashed into a corner by
    // a long tail. Back to zero is still spelled out under the glass.
    const ahead = Math.max(3 * 3_600_000, nowT - t0);
    const t1 = Math.max(nowT + 30 * 60_000, Math.min(last, nowT + ahead));
    const max = Math.max(0.04, ...samples.filter((s) => s.t <= t1).map((s) => s.bac)) * 1.15;
    const x = (t: number) => ((t - t0) / (t1 - t0)) * W;
    const y = (b: number) => padTop + (1 - b / max) * (H - padTop - padBottom);
    // One point past the window keeps the line running off the edge instead of stopping short.
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
  }, [samples, now, H, padBottom]);

  const nowX = geo.x(now.getTime());
  const nowBac = valueAt(samples, now.getTime());
  const picked = scrub ?? now.getTime();
  const pickedBac = valueAt(samples, picked);

  function pick(clientX: number) {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    const f = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    setScrub(geo.t0 + f * (geo.t1 - geo.t0));
  }

  return (
    <div>
      <p className="flex min-h-7 items-baseline justify-between gap-3 text-lg tabular-nums" aria-live="off">
        <span className="font-semibold text-ink">{scrub === null ? "Now" : clock(picked)}</span>
        <span className="font-bold text-ink">about {formatPoint(scrub === null ? nowBac : pickedBac)}</span>
      </p>
      <div
        ref={box}
        className="curve-reveal relative mt-1 touch-pan-y select-none"
        style={{ height: H }}
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          pick(e.clientX);
        }}
        onPointerMove={(e) => e.buttons && pick(e.clientX)}
        onPointerUp={() => setScrub(null)}
        onPointerCancel={() => setScrub(null)}
      >
        <svg aria-hidden="true" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-hidden">
          <defs>
            <clipPath id={`past-${id}`}>
              <rect x={0} y={0} width={Math.max(0, nowX)} height={H} />
            </clipPath>
            <clipPath id={`future-${id}`}>
              <rect x={nowX} y={0} width={Math.max(0, W - nowX)} height={H} />
            </clipPath>
          </defs>
          <g clipPath={`url(#past-${id})`}>
            <path d={geo.area} className="fill-amber" fillOpacity={0.32} />
            <path d={geo.line} fill="none" className="stroke-amber" strokeWidth={3} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </g>
          <g clipPath={`url(#future-${id})`}>
            <path d={geo.area} className="fill-amber" fillOpacity={0.1} />
            <path
              d={geo.line}
              fill="none"
              className="stroke-amber"
              strokeWidth={3}
              strokeDasharray="7 7"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </g>
          <line x1={nowX} x2={nowX} y1={padTop - 8} y2={geo.y(0)} className="stroke-ink" strokeWidth={2} vectorEffect="non-scaling-stroke" />
          {scrub !== null && (
            <line
              x1={geo.x(picked)}
              x2={geo.x(picked)}
              y1={padTop - 8}
              y2={geo.y(0)}
              className="stroke-ink-2"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        {/* Dots are HTML so they stay round when the SVG stretches. */}
        <span
          className="pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-bg"
          style={{ left: `${(nowX / W) * 100}%`, top: geo.y(nowBac) }}
        />
        {scrub !== null && (
          <span
            className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink"
            style={{ left: `${(geo.x(picked) / W) * 100}%`, top: geo.y(pickedBac) }}
          />
        )}
        {axes && (
          <>
            <span className="absolute top-0 left-0 text-base text-ink-2 tabular-nums">{formatPoint(geo.max / 1.15)}</span>
            {geo.hours.map((t) => (
              <span
                key={t}
                className="absolute bottom-0 -translate-x-1/2 text-base text-ink-2 tabular-nums"
                style={{ left: `${Math.min(92, Math.max(8, (geo.x(t) / W) * 100))}%` }}
              >
                {hourLabel(t)}
              </span>
            ))}
          </>
        )}
      </div>
      {!axes && (
        <p className="mt-2 flex justify-between text-base font-medium text-ink-2 tabular-nums">
          <span>{hourLabel(geo.t0)}</span>
          <span>{hourLabel(geo.t1)}</span>
        </p>
      )}
    </div>
  );
}

function valueAt(samples: { t: number; bac: number }[], t: number): number {
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

interface TimelineCardProps {
  simulation: NightSimulation | null;
  now: Date;
  onExpand: () => void;
}

/** Tonight's curve on the main screen. */
export function TimelineCard({ simulation, now, onExpand }: TimelineCardProps) {
  if (!simulation || simulation.samples.length < 2) return null;
  return (
    <section aria-labelledby="curve-heading" className="rounded-[28px] bg-surface p-5">
      <header className="flex items-baseline justify-between gap-4">
        <h2 id="curve-heading" className="text-[22px] font-bold text-ink">
          Tonight&apos;s curve
        </h2>
        <button type="button" onClick={onExpand} className="press min-h-12 px-1 text-lg font-semibold text-ink underline underline-offset-4">
          Bigger
        </button>
      </header>
      <p className="text-base text-ink-2">Drag across it to see any time.</p>
      <div className="mt-3">
        <TimelineChart simulation={simulation} now={now} height={170} />
      </div>
    </section>
  );
}
