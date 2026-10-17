import { useEffect, useId, useRef, useState } from "react";

import { useReducedMotion } from "~/hooks/useReducedMotion";
import { formatBand, formatPoint } from "~/lib/estimate-display";

interface FluidGaugeProps {
  /** Point estimate now. Shown as "about 0.08" with the likely range under it. */
  bac: number;
  /** Where it's heading from drinks still being absorbed, and when; null once it has peaked. */
  peak: { bac: number; at: Date } | null;
  status: "rising" | "falling" | "none";
}

// The glass is full at 0.20. There are no marks on it: the level shows "more" or "less", never a limit.
const FULL_AT = 0.2;
const W = 400;
const H = 320;
const TWEEN_MS = 900;
const SLOSH = 18; // wave height in drawing units when a drink lands
const SETTLE_MS = 2000; // the surface is still by then, however slow the phone is

// Pint glass silhouette in the 400 × 320 drawing space: wide rim, slight taper, rounded base.
const GLASS = "M 8 6 L 392 6 L 352 296 Q 349 314 330 314 L 70 314 Q 51 314 48 296 Z";

const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);
const levelFor = (bac: number) => (bac <= 0 ? 0 : Math.min(1, Math.max(0.04, bac / FULL_AT)));
const clock = (d: Date) =>
  d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();

function surface(bac: number, amplitude: number, phase: number) {
  const y = H - levelFor(bac) * H;
  const a = bac > 0 ? amplitude : 0;
  let d = `M 0 ${y}`;
  for (let x = 0; x <= W; x += 10) d += ` L ${x} ${(y + Math.sin(x * 0.02 + phase) * a).toFixed(1)}`;
  return `${d} L ${W} ${H} L 0 ${H} Z`;
}

/**
 * Tonight's estimate as a pint glass. Solid amber is what's in your blood now; the paler layer above
 * it is alcohol from drinks still being absorbed. Adding a drink pours the pale layer up straight
 * away, sloshes once and settles still, and the number counts to its new value. Nothing moves at
 * rest, and with reduced motion every change is instant.
 */
export function FluidGauge({ bac, peak, status }: FluidGaugeProps) {
  const reduced = useReducedMotion();
  const nowPath = useRef<SVGPathElement>(null);
  const incomingPath = useRef<SVGPathElement>(null);
  const targetNow = bac;
  const targetIncoming = Math.max(bac, peak?.bac ?? 0);
  // Start at the real values: opening the app never shows a false "0.00" counting up.
  const shown = useRef({ now: targetNow, incoming: targetIncoming, amplitude: 0, phase: 0 });
  const [displayBac, setDisplayBac] = useState(targetNow);
  const clipId = `glass-${useId().replace(/:/g, "")}`;

  useEffect(() => {
    const draw = () => {
      const s = shown.current;
      nowPath.current?.setAttribute("d", surface(s.now, s.amplitude, s.phase));
      incomingPath.current?.setAttribute("d", surface(s.incoming, s.amplitude * 0.8, s.phase + 1.3));
      setDisplayBac(s.now);
    };

    const from = { now: shown.current.now, incoming: shown.current.incoming };
    const changed = Math.abs(from.now - targetNow) > 0.0005 || Math.abs(from.incoming - targetIncoming) > 0.0005;
    if (reduced || !changed) {
      shown.current = { ...shown.current, now: targetNow, incoming: targetIncoming, amplitude: 0 };
      draw();
      return;
    }

    // A change is a pour: kick the surface, move both layers, let it settle.
    shown.current.amplitude = SLOSH;
    const start = performance.now();
    let frame = 0;
    const tick = (time: number) => {
      const t = Math.min(1, (time - start) / TWEEN_MS);
      const s = shown.current;
      s.now = from.now + (targetNow - from.now) * easeOut(t);
      s.incoming = from.incoming + (targetIncoming - from.incoming) * easeOut(t);
      const elapsed = time - start;
      s.amplitude = elapsed < SETTLE_MS ? SLOSH * Math.exp(-elapsed / 450) * (1 - elapsed / SETTLE_MS) : 0;
      s.phase = elapsed / 160;
      draw();
      if (elapsed < SETTLE_MS) frame = requestAnimationFrame(tick);
      else {
        s.amplitude = 0;
        draw();
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [targetNow, targetIncoming, reduced]);

  const likely = bac > 0 ? `Likely ${formatBand(bac).replace("–", " to ")}` : "Nothing counted yet";
  const heading = peak && peak.bac > bac + 0.004 ? `Still rising: about ${formatPoint(peak.bac)} by ${clock(peak.at)}` : null;

  return (
    <div className="flex items-stretch gap-4 rounded-[36px] bg-surface p-5 max-[360px]:gap-3 max-[360px]:p-4">
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <p className="text-lg font-semibold text-ink-2">Estimated blood alcohol</p>
        {displayBac > 0.0095 && <p className="mt-1 text-2xl leading-none font-semibold text-ink">about</p>}
        <p className="text-[clamp(56px,18vw,96px)] leading-[0.95] font-bold tracking-[-0.04em] text-ink tabular-nums">
          {formatPoint(displayBac)}
        </p>
        <p className="mt-2 text-lg font-semibold text-ink">{likely}</p>
        {heading ? (
          <p className="mt-1 text-lg leading-snug font-bold text-ink">↑ {heading}</p>
        ) : (
          status !== "none" && (
            <p className="mt-1 text-xl font-bold text-ink">{status === "rising" ? "↑ Still rising" : "↓ Falling"}</p>
          )
        )}
      </div>

      {/* A pint glass. The liquid is clipped to its shape; the outline sits on top. */}
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-[208px] w-[112px] shrink-0 self-center max-[360px]:h-[176px] max-[360px]:w-[84px]"
      >
        <defs>
          <clipPath id={clipId}>
            <path d={GLASS} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <rect width={W} height={H} className="fill-surface-2" />
          <path ref={incomingPath} className="fill-amber-soft" d={surface(0, 0, 0)} />
          <path ref={nowPath} className="fill-amber" d={surface(0, 0, 0)} />
        </g>
        <path
          d={GLASS}
          fill="none"
          className="stroke-ink-2"
          strokeWidth={3}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <p className="sr-only" aria-live="polite">
        Estimated blood alcohol: about {formatPoint(bac)}. {likely}. {heading ? `${heading}.` : ""}
        {!heading && status === "rising" ? "Still rising." : ""}
        {status === "falling" ? "Falling." : ""}
      </p>
    </div>
  );
}
