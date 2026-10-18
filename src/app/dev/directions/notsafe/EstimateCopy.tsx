"use client";

import { aboutPoint, BAND_HIGH, BAND_LOW, formatBand } from "~/lib/estimate-display";
import { formatClock } from "~/lib/format-clock";

interface Props {
  bac: number;
  peak: { bac: number; at: Date } | null;
  status: "rising" | "falling" | "none";
  hourAgo?: number | null;
  /** Replaces the "Estimated blood alcohol" heading block. */
  heading?: React.ReactNode;
  /** Sits between the number and the bar (where the coral line is today). */
  underNumber?: React.ReactNode;
  /** Sits under the bar, inside the estimate section. */
  underBar?: React.ReactNode;
}

/**
 * A static copy of src/components/night/Estimate.tsx (number + range bar, at rest, range hidden)
 * with slots where each option puts the warning. Markup and classes match the real component.
 */
export function EstimateCopy({ bac, peak, status, hourAgo = null, heading, underNumber, underBar }: Props) {
  const [about, point] = aboutPoint(bac);
  const [lo, hi] = formatBand(bac).split("–");
  const rising = status !== "none" && peak && peak.bac > bac + 0.004 ? peak : null;
  const top = Math.max(bac * BAND_HIGH, rising?.bac ?? 0, hourAgo ?? 0);
  const scale = Math.max(0.2, top * 1.12);
  const pos = (v: number) => Math.min(100, (v / scale) * 100);
  const pct = (v: number) => `${pos(v)}%`;
  const falling = !rising && status === "falling" && hourAgo !== null && hourAgo > bac + 0.004 ? hourAgo : null;
  const hasRange = bac > 0 && !!hi;
  const peakText = rising ? `about ${aboutPoint(rising.bac)[1]} by ${formatClock(rising.at)}` : null;

  return (
    <section aria-labelledby="ns-estimate-heading" className="px-1 pt-6 pb-1">
      {heading ?? (
        <h2 id="ns-estimate-heading" className="text-lg text-ink-2">
          Estimated blood alcohol
        </h2>
      )}
      <button type="button" aria-label={`About this estimate: ${about ? "about " : ""}${point}`} className="press -mx-1 block rounded-2xl px-1 text-left">
        <span className="mt-2 flex items-baseline gap-3" aria-hidden="true">
          {about && <span className="text-2xl font-medium">about</span>}
          <span className="inline-block text-[clamp(88px,27vw,116px)] leading-[0.88] font-medium tracking-[-0.055em]">{point}</span>
        </span>
      </button>
      {underNumber}

      {hasRange && (
        <button type="button" aria-label="Show the likely range" className="relative mt-3 block h-[72px] w-full text-left">
          <span aria-hidden="true" className="absolute inset-x-0 top-6 h-1 rounded-full bg-white/10" />
          {falling !== null && (
            <span
              aria-hidden="true"
              className="absolute top-6 h-1 rounded-full"
              style={{
                left: pct(bac),
                width: `calc(${pct(falling)} - ${pct(bac)})`,
                background: "linear-gradient(to right, rgb(250 250 250 / 0.55), rgb(250 250 250 / 0))",
              }}
            />
          )}
          <span
            aria-hidden="true"
            className="absolute top-6 h-1 rounded-full bg-signal shadow-[0_0_16px_2px_rgb(124_180_255/0.55)]"
            style={{ left: pct(bac * BAND_LOW), width: `calc(${pct(bac * BAND_HIGH)} - ${pct(bac * BAND_LOW)})` }}
          />
          {rising && (
            <>
              <span
                aria-hidden="true"
                className="absolute top-[25px] h-0 border-t-2 border-dashed border-ink/70"
                style={{ left: pct(bac), width: `calc(${pct(rising.bac)} - ${pct(bac)})` }}
              />
              <span aria-hidden="true" className="absolute top-[19px] size-3.5 -translate-x-1/2 rounded-full border-2 border-ink bg-bg" style={{ left: pct(rising.bac) }} />
            </>
          )}
          <span aria-hidden="true" className="absolute top-4 h-5 w-0.5 -translate-x-1/2 rounded-full bg-ink" style={{ left: pct(bac) }} />
          {peakText && (
            <span
              aria-hidden="true"
              className="absolute top-10 text-lg whitespace-nowrap text-ink-2"
              style={pos(rising!.bac) > 50 ? { right: `${100 - pos(rising!.bac)}%` } : { left: pct(rising!.bac) }}
            >
              {peakText}
            </span>
          )}
        </button>
      )}
      {underBar}
      <p className="sr-only">
        Likely {lo} to {hi}.
      </p>
    </section>
  );
}
