"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { useId, useRef } from "react";

import { formatClock, formatHour } from "~/lib/format-clock";
import { formatBand, formatPoint } from "~/lib/estimate-display";
import type { NightSimulation } from "~/lib/bac-calculator";
import { BAND_HIGH, BAND_LOW, curveWindow, pathOf, useScrub, valueAt } from "../_kit/curve";
import type { SampleNight } from "../_kit/useSampleNight";

/** Re-key a node when its value changes so it settles in once (CSS, off under reduced motion). */
function useChanged(value: string | null) {
  const prev = useRef(value);
  const changed = prev.current !== null && prev.current !== value;
  prev.current = value;
  return changed;
}

/**
 * The estimate set like a lab result: what it is, the value, its likely interval drawn on a strip
 * that has no marks but zero, and the method in plain words. Shared by the night screen and the hero.
 */
export function ResultPanel({ night, large = false }: { night: SampleNight; large?: boolean }) {
  const { model, point, likely, now } = night;
  const bac = model.bac ?? 0;
  const changed = useChanged(point);
  const low = bac * BAND_LOW;
  const high = bac * BAND_HIGH;
  // Labels come from the same rounding as "Likely … to …" so the strip and the words always agree.
  const [lowLabel, highLabel] = formatBand(bac).split("–");
  // A fixed 0 to 0.20 scale (wider only if the range runs past it), so the strip compares across the
  // night. Only zero is labelled: nothing on it can be read as a limit.
  const scale = Math.max(0.2, high * 1.12);
  const pct = (v: number) => `${Math.min(100, (v / scale) * 100)}%`;
  const rising = model.peak && model.peak.bac > bac + 0.004 ? model.peak : null;

  return (
    <section aria-labelledby="result-heading" className={`rounded-[18px] bg-surface ${large ? "p-6 sm:p-8" : "p-5"}`}>
      <header className="flex items-baseline justify-between gap-4 text-lg font-medium text-ink-2">
        <h2 id="result-heading" className="whitespace-nowrap">Estimated blood alcohol</h2>
        <span className="whitespace-nowrap max-[420px]:hidden">at {formatClock(now)}</span>
      </header>

      <p className="mt-3 flex items-baseline gap-3" aria-hidden="true">
        <span className={`font-semibold text-ink ${large ? "text-[30px]" : "text-[26px]"}`}>about</span>
        <span
          key={point}
          data-changed={changed || undefined}
          className={`result-num leading-[0.9] font-bold tracking-[-0.045em] text-ink ${
            large ? "text-[clamp(80px,9vw,128px)]" : "text-[clamp(72px,22vw,96px)]"
          }`}
        >
          {point}
        </span>
      </p>
      <p className="mt-2 text-xl font-semibold text-ink" aria-hidden="true">
        {likely ? `Likely ${likely}` : "Nothing counted yet"}
      </p>

      {bac > 0 && (
        <div className="mt-5" aria-hidden="true">
          <div className="relative h-4 rounded-full bg-surface-3">
            <span className="strip-band absolute inset-y-0 rounded-full bg-[var(--signal)]" style={{ left: pct(low), width: `calc(${pct(high)} - ${pct(low)})` }} />
            <span className="strip-tick absolute -top-2 -bottom-2 w-1 -translate-x-1/2 rounded-full bg-ink" style={{ left: pct(bac) }} />
          </div>
          <div className="relative mt-2 h-6 text-base font-semibold text-ink-2">
            <span className="absolute left-0">0</span>
            <span className="strip-tick absolute -translate-x-full pr-1" style={{ left: pct(low) }}>
              {lowLabel}
            </span>
            <span className="strip-tick absolute pl-1" style={{ left: pct(high) }}>
              {highLabel}
            </span>
          </div>
        </div>
      )}

      {rising ? (
        <p className="mt-4 flex items-center gap-2 text-lg font-semibold text-ink">
          <TrendingUp aria-hidden="true" className="size-6 shrink-0" strokeWidth={2.25} />
          Still rising: about {formatPoint(rising.bac)} by {formatClock(rising.at)}
        </p>
      ) : (
        bac > 0 && (
          <p className="mt-4 flex items-center gap-2 text-lg font-semibold text-ink">
            <TrendingDown aria-hidden="true" className="size-6 shrink-0" strokeWidth={2.25} />
            Falling
          </p>
        )
      )}

      <p className="sr-only" aria-live="polite">
        Estimated blood alcohol about {point}. {likely ? `Likely ${likely}.` : ""} {rising ? `Still rising to about ${formatPoint(rising.bac)}.` : ""}
      </p>
    </section>
  );
}

/** Peak, back to zero and what was counted, aligned like the rows of a results table. */
export function ResultRows({ night, std }: { night: SampleNight; std: (n: number) => string }) {
  const { model, drinks, totalStd } = night;
  const rows: [string, string][] = [];
  if (model.peak) rows.push(["Peak", `about ${formatPoint(model.peak.bac)} at ${formatClock(model.peak.at)}`]);
  if (model.estimate?.backToZero) rows.push(["Back to zero", model.estimate.backToZero.replace(/^between /, "").replace(" and ", " to ")]);
  rows.push(["Counted", `${drinks.length} ${drinks.length === 1 ? "drink" : "drinks"} · ${std(totalStd)} std`]);
  return (
    <dl className="flex flex-col gap-[2px] overflow-hidden rounded-[18px]">
      {rows.map(([k, v]) => (
        <div key={k} className="flex min-h-14 items-baseline justify-between gap-4 bg-surface px-5 py-3.5 text-lg">
          <dt className="font-medium text-ink-2">{k}</dt>
          <dd className="text-right font-semibold text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

const W = 400;

/** Tonight's curve: one signal-blue line, filled below while it's known, dashed ahead. Time labels only. */
export function ClinicalCurve({ simulation, now, height = 180 }: { simulation: NightSimulation; now: Date; height?: number }) {
  const id = useId().replace(/:/g, "");
  const win = curveWindow(simulation, now);
  const { box, t, handlers } = useScrub(win);
  const H = height;
  const top = 10;
  const bottom = 4;
  const x = (tt: number) => ((tt - win.t0) / (win.t1 - win.t0)) * W;
  const y = (b: number) => top + (1 - b / win.max) * (H - top - bottom);
  const pts = win.shown.map((s) => [x(s.t), y(s.bac)] as [number, number]);
  const line = pathOf(pts);
  const area = `${line} L${x(win.shown[win.shown.length - 1]?.t ?? win.t1).toFixed(1)} ${y(0)} L${x(win.t0)} ${y(0)} Z`;
  const nowT = now.getTime();
  const nowX = x(nowT);
  const picked = t ?? nowT;
  const pickedBac = valueAt(simulation.samples, picked);

  return (
    <div>
      <p className="flex min-h-8 items-baseline justify-between gap-3 text-lg">
        <span className="font-semibold text-ink">{t === null ? "Now" : formatClock(picked)}</span>
        <span className="font-bold text-ink">
          about {formatPoint(pickedBac)}
          {pickedBac > 0 && <span className="font-medium text-ink-2"> · likely {formatBand(pickedBac).replace("–", " to ")}</span>}
        </span>
      </p>
      <div ref={box} {...handlers} className="curve-reveal relative mt-2 touch-pan-y select-none" style={{ height: H }}>
        <svg aria-hidden="true" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full">
          <defs>
            <clipPath id={`p-${id}`}>
              <rect x={0} y={0} width={Math.max(0, nowX)} height={H} />
            </clipPath>
            <clipPath id={`f-${id}`}>
              <rect x={nowX} y={0} width={Math.max(0, W - nowX)} height={H} />
            </clipPath>
          </defs>
          <g clipPath={`url(#p-${id})`}>
            <path d={area} fill="var(--signal-soft)" />
            <path d={line} fill="none" stroke="var(--signal)" strokeWidth={3} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </g>
          <g clipPath={`url(#f-${id})`}>
            <path d={line} fill="none" stroke="var(--signal)" strokeWidth={3} strokeDasharray="6 7" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </g>
          <line x1={nowX} x2={nowX} y1={0} y2={y(0)} stroke="var(--color-ink)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
          {t !== null && <line x1={x(picked)} x2={x(picked)} y1={0} y2={y(0)} stroke="var(--color-ink-2)" strokeWidth={2} vectorEffect="non-scaling-stroke" />}
        </svg>
        <span
          className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-ink bg-bg"
          style={{ left: `${(nowX / W) * 100}%`, top: y(valueAt(simulation.samples, nowT)) }}
        />
        {t !== null && (
          <span
            className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink"
            style={{ left: `${(x(picked) / W) * 100}%`, top: y(pickedBac) }}
          />
        )}
      </div>
      <div className="relative mt-2 h-6 text-base font-medium text-ink-2" aria-hidden="true">
        {win.hours.map((h) => (
          <span key={h} className="absolute -translate-x-1/2" style={{ left: `${Math.min(94, Math.max(6, (x(h) / W) * 100))}%` }}>
            {formatHour(h)}
          </span>
        ))}
      </div>
    </div>
  );
}
