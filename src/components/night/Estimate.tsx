"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { useRef, useState } from "react";

import { aboutPoint, BAND_HIGH, BAND_LOW, displayPoint, formatBand } from "~/lib/estimate-display";
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
 * The estimate on the light field: one number rounded up (the heading says it is an estimate; "about"
 * is only spoken), and under it a bar that says the rest without words. The glowing band is the
 * likely range; the white tick is now. Which way it is heading is built in light, like a long
 * exposure: while it's rising a comet of light leads from the tick (white-hot), breathing slowly, and
 * thins toward a hollow ring where it should peak, and the label says "Rising to about X by T";
 * while it's falling nothing moves and a dimmer white tail trails
 * from the tick back to where it was an hour ago, and the label says "Falling". Tapping the bar
 * spells out the range. Nothing on the bar is a limit: there are no marks but the reading's own.
 */
export function Estimate({ bac, peak, status, hourAgo = null, size = "md", onOpenDetails, ref }: EstimateProps) {
  // Spoken (and in the button's name): two places, rounded up, with "about". Drawn: three places,
  // rounded up, the third digit small (`displayPoint`); only the big digits settle in with motion.
  const [about, point] = aboutPoint(bac);
  const drawn = displayPoint(bac);
  const changed = useChanged(drawn.big);
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
  // The momentum light: from the tick ahead to the ring (rising) or back to an hour ago (falling).
  const lightTo = rising ? rising.bac : falling;
  const lightStyle = lightTo !== null ? { left: pct(bac), width: `calc(${pct(lightTo)} - ${pct(bac)})` } : null;

  return (
    <section ref={ref} aria-labelledby="estimate-heading" className="px-1 pt-6 pb-1">
      <h2 id="estimate-heading" className="text-lg text-ink-2">
        Estimated blood alcohol
      </h2>
      {(() => {
        const number = (
          // The heading carries "estimated"; the number stands alone, nudged left by its own side
          // bearing so the glyph's edge, not its box, lines up with the text above (user decision,
          // 18 Oct 2026 late: no "about" beside the number; it stays in the spoken text).
          <span className="mt-2 flex items-baseline" aria-hidden="true">
            <span
              className={`inline-flex -ml-[0.04em] items-baseline leading-[0.88] font-medium ${
                drawn.big.length > 4 ? "text-[clamp(48px,14vw,64px)]" : size === "lg" ? "text-[clamp(96px,10vw,148px)]" : "text-[clamp(88px,27vw,116px)]"
              }`}
            >
              <span key={drawn.big} data-changed={changed || undefined} className="num-in inline-block tracking-[-0.055em]">
                {drawn.big}
              </span>
              {/* The model's third place, small, on the same baseline at the number's bottom right. It
                  changes in place as the night moves (every few minutes), with no animation. */}
              {drawn.small !== null && (
                <span className="ml-[0.06em] text-[0.35em] tracking-[-0.02em] text-ink/70 tabular-nums">{drawn.small}</span>
              )}
            </span>
          </span>
        );
        return onOpenDetails ? (
          <button type="button" onClick={onOpenDetails} aria-label={`About tonight's estimate: ${about ? "about " : ""}${point}`} className="press -mx-1 block rounded-row px-1 text-left">
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
          <span aria-hidden="true" className="absolute inset-x-0 top-6 h-1 rounded-circle bg-white/10" />
          <span
            aria-hidden="true"
            className="band-ease absolute top-6 h-1 rounded-circle bg-[var(--tone)] shadow-[0_0_16px_2px_rgb(var(--tone-rgb)/0.55)]"
            style={{ left: pct(bac * BAND_LOW), width: `calc(${pct(bac * BAND_HIGH)} - ${pct(bac * BAND_LOW)})` }}
          />
          {lightStyle && (
            <>
              {/* The coma: a soft head of light on the tick, tapering the way it is heading. */}
              <span aria-hidden="true" className={`band-ease momentum-glow absolute top-4 h-5 ${rising ? "momentum-rise" : "momentum-glow-fall"}`} style={lightStyle} />
              {/* The core: the band itself, white-hot at the tick and thinning away from it. Rising, both
                  layers breathe slowly (.momentum-rise); falling, they hold still. */}
              <span aria-hidden="true" className={`band-ease momentum-core absolute top-6 h-1 rounded-circle ${rising ? "momentum-rise" : "momentum-core-fall"}`} style={lightStyle} />
            </>
          )}
          {rising && (
            <span
              aria-hidden="true"
              className="band-ease absolute top-[19px] size-3.5 -translate-x-1/2 rounded-circle border-2 border-ink bg-bg/50"
              style={{ left: pct(rising.bac) }}
            />
          )}
          <span
            aria-hidden="true"
            className="band-ease absolute top-4 h-5 w-0.5 -translate-x-1/2 rounded-circle bg-ink shadow-[0_0_10px_1px_rgb(250_250_250/0.45)]"
            style={{ left: pct(bac) }}
          />

          {showRange ? (
            <span aria-hidden="true" className="compose-in absolute inset-x-0 top-10 text-lg font-medium">
              {rangeText}
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
