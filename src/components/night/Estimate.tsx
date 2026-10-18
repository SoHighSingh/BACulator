"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { useRef, useState } from "react";

import { aboutPoint, BAND_HIGH, BAND_LOW, formatBand } from "~/lib/estimate-display";
import { formatClock } from "~/lib/format-clock";

interface EstimateProps {
  bac: number;
  peak: { bac: number; at: Date } | null;
  status: "rising" | "falling" | "none";
  /** The model an hour ago, for the trail that shows which way it's going when it's falling. */
  hourAgo?: number | null;
  size?: "md" | "lg";
  /** Makes the number a button that opens the details (range, peak, back to zero, why). */
  onOpenDetails?: () => void;
  ref?: React.Ref<HTMLElement>;
}

/** True once a value has been shown and then changes, so first paint never animates. */
function useChanged(value: string) {
  const prev = useRef<string | null>(null);
  const changed = prev.current !== null && prev.current !== value;
  prev.current = value;
  return changed;
}

/**
 * The estimate on the light field: one number rounded up, and under it a bar that says the rest
 * without words. The glowing band is the likely range; the white tick is now; while it's rising an
 * ink arrow runs from the tick to a chevron where it should peak (drawn over the band, since the
 * peak is usually inside it) and the label says "Rising to about X by T"; while it's falling a
 * fading trail runs back to where it was an hour ago and the label says "Falling". Tapping the bar
 * spells out the range. Nothing on the bar is a limit: there are no marks but the reading's own.
 */
export function Estimate({ bac, peak, status, hourAgo = null, size = "md", onOpenDetails, ref }: EstimateProps) {
  const [about, point] = aboutPoint(bac);
  const changed = useChanged(point);
  const [showRange, setShowRange] = useState(false);
  const [lo, hi] = formatBand(bac).split("–");
  const rising = status !== "none" && peak && peak.bac > bac + 0.004 ? peak : null;
  const top = Math.max(bac * BAND_HIGH, rising?.bac ?? 0, hourAgo ?? 0);
  const scale = Math.max(0.2, top * 1.12);
  const pos = (v: number) => Math.min(100, (v / scale) * 100);
  const pct = (v: number) => `${pos(v)}%`;
  const falling = !rising && status === "falling" && hourAgo !== null && hourAgo > bac + 0.004 ? hourAgo : null;
  const hasRange = bac > 0 && !!hi;
  const rangeText = hasRange ? `Likely ${lo} to ${hi}` : null;
  const peakText = rising ? `about ${aboutPoint(rising.bac)[1]} by ${formatClock(rising.at)}` : null;
  const headingText = rising ? `Rising to ${peakText}` : falling !== null ? "Falling" : null;
  const HeadingIcon = rising ? TrendingUp : TrendingDown;
  // The arrow's shaft stops 6px short of the chevron; with the peak this close, the chevron alone says it.
  const shaft = rising && pos(rising.bac) - pos(bac) > 4;

  return (
    <section ref={ref} aria-labelledby="estimate-heading" className="px-1 pt-6 pb-1">
      <h2 id="estimate-heading" className="text-lg text-ink-2">
        Estimated blood alcohol
      </h2>
      {(() => {
        const number = (
          <span className="mt-2 flex items-baseline gap-3" aria-hidden="true">
            {about && <span className="text-2xl font-medium">about</span>}
            <span
              key={point}
              data-changed={changed || undefined}
              className={`num-in inline-block leading-[0.88] font-medium tracking-[-0.055em] ${
                point.length > 4 ? "text-[clamp(48px,14vw,64px)]" : size === "lg" ? "text-[clamp(96px,10vw,148px)]" : "text-[clamp(88px,27vw,116px)]"
              }`}
            >
              {point}
            </span>
          </span>
        );
        return onOpenDetails ? (
          <button type="button" onClick={onOpenDetails} aria-label={`About this estimate: ${about ? "about " : ""}${point}`} className="press -mx-1 block rounded-2xl px-1 text-left">
            {number}
          </button>
        ) : (
          <p>{number}</p>
        );
      })()}

      {hasRange && (
        <button
          type="button"
          onClick={() => setShowRange((v) => !v)}
          aria-expanded={showRange}
          aria-label={showRange ? "Hide the likely range" : "Show the likely range"}
          className="relative mt-3 block h-[72px] w-full text-left"
        >
          {/* The bar sits in the upper half of a 72px target; labels hang under it. */}
          <span aria-hidden="true" className="absolute inset-x-0 top-6 h-1 rounded-full bg-white/10" />
          {falling !== null && (
            <span
              aria-hidden="true"
              className="band-ease absolute top-6 h-1 rounded-full"
              style={{
                left: pct(bac),
                width: `calc(${pct(falling)} - ${pct(bac)})`,
                background: "linear-gradient(to right, rgb(250 250 250 / 0.55), rgb(250 250 250 / 0))",
              }}
            />
          )}
          <span
            aria-hidden="true"
            className="band-ease absolute top-6 h-1 rounded-full bg-signal shadow-[0_0_16px_2px_rgb(124_180_255/0.55)]"
            style={{ left: pct(bac * BAND_LOW), width: `calc(${pct(bac * BAND_HIGH)} - ${pct(bac * BAND_LOW)})` }}
          />
          {rising && (
            <>
              {shaft && (
                <span
                  aria-hidden="true"
                  className="band-ease absolute top-[25px] h-0.5 rounded-full bg-ink/80"
                  style={{ left: pct(bac), width: `calc(${pct(rising.bac)} - ${pct(bac)} - 6px)` }}
                />
              )}
              <svg
                aria-hidden="true"
                viewBox="0 0 10 14"
                className="band-ease absolute top-[19px] h-3.5 w-2.5 -translate-x-[6px]"
                style={{ left: pct(rising.bac) }}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 2l6 5-6 5" />
              </svg>
            </>
          )}
          <span aria-hidden="true" className="band-ease absolute top-4 h-5 w-0.5 -translate-x-1/2 rounded-full bg-ink" style={{ left: pct(bac) }} />

          {showRange ? (
            <span aria-hidden="true" className="compose-in absolute inset-x-0 top-10 flex items-baseline justify-between text-lg">
              <span className="font-medium">{rangeText}</span>
              <span className="text-ink-2">tap to hide</span>
            </span>
          ) : (
            headingText && (
              <span aria-hidden="true" className="absolute top-10 left-0 flex items-center gap-1.5 text-lg whitespace-nowrap text-ink-2">
                <HeadingIcon className="size-5 shrink-0" strokeWidth={2.25} />
                {headingText}
              </span>
            )
          )}
        </button>
      )}

      <p className="sr-only" aria-live="polite">
        Estimated blood alcohol {about ? "about " : ""}
        {point}. {rangeText ? `${rangeText}.` : ""} {peakText ? `Still rising, to ${peakText}.` : status === "falling" ? "Falling." : ""}
      </p>
    </section>
  );
}
