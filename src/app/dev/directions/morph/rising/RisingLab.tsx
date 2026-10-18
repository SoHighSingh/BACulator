"use client";

import { TrendingDown, TrendingUp } from "lucide-react";

import { aboutPoint, BAND_HIGH, BAND_LOW } from "~/lib/estimate-display";

/**
 * Dev-only: three ways to build momentum into the range bar with light alone. The thin glowing
 * band, the white now tick and the hollow ring at the coming peak are fixed; what changes is the
 * light between the tick and the ring (rising) or behind the tick (falling). Nothing moves. The
 * chosen one (comet) ships in Estimate.tsx and, at hero scale, LiveStrip.tsx.
 */
type Variant = "comet" | "streak" | "ghosts";

interface Reading {
  bac: number;
  peak: number | null;
  hourAgo: number | null;
}
const RISING: Reading = { bac: 0.1, peak: 0.108, hourAgo: null };
const RISING_FAR: Reading = { bac: 0.1, peak: 0.16, hourAgo: null };
const FALLING: Reading = { bac: 0.08, peak: null, hourAgo: 0.1 };
const WHEN = "6:45 pm";

const INK = "250 250 250";
const SIGNAL = "124 180 255";

/** The light from the tick outward: ahead to the ring (rising, blue-white) or back to an hour ago (falling, white). */
function Light({ v, from, to, rising }: { v: Variant; from: string; to: string; rising: boolean }) {
  const w = `calc(${to} - ${from})`;
  const tint = rising ? SIGNAL : INK;
  const a = rising ? 1 : 0.6;
  if (v === "comet") {
    return (
      <>
        <span
          className="absolute top-[16px] h-5"
          style={{
            left: from,
            width: w,
            background: `radial-gradient(100% 50% at 0% 50%, rgb(${INK} / ${0.95 * a}) 0%, rgb(${INK} / ${0.6 * a}) 18%, rgb(${tint} / ${0.5 * a}) 40%, rgb(${tint} / 0) 100%)`,
            filter: "blur(3px)",
          }}
        />
        <span
          className="absolute top-6 h-1 rounded-full"
          style={{
            left: from,
            width: w,
            background: rising
              ? `linear-gradient(to right, rgb(${INK} / 1), rgb(${INK} / 0.85) 30%, rgb(${tint} / 0.4) 70%, rgb(${tint} / 0))`
              : `linear-gradient(to right, rgb(${INK} / 0.7), rgb(${INK} / 0.3) 50%, rgb(${INK} / 0))`,
          }}
        />
      </>
    );
  }
  if (v === "streak") {
    return (
      <>
        <span
          className="absolute top-[19px] h-[14px]"
          style={{ left: from, width: w, background: `linear-gradient(to right, rgb(${INK} / ${0.7 * a}), rgb(${tint} / ${0.5 * a}) 35%, rgb(${tint} / 0))`, filter: "blur(6px)" }}
        />
        <span className="absolute top-6 h-1 rounded-full" style={{ left: from, width: w, background: `linear-gradient(to right, rgb(${INK} / ${a}), rgb(${INK} / ${0.9 * a}) 40%, rgb(${tint} / 0))` }} />
      </>
    );
  }
  // ghosts: fading copies of the now tick, strobed along the way, over a faint streak.
  const ghosts = [0.2, 0.4, 0.6, 0.8];
  return (
    <>
      <span className="absolute top-6 h-1 rounded-full" style={{ left: from, width: w, background: `linear-gradient(to right, rgb(${INK} / ${0.45 * a}), rgb(${tint} / 0))` }} />
      {ghosts.map((g, i) => (
        <span
          key={g}
          className="absolute w-0.5 -translate-x-1/2 rounded-full"
          style={{
            left: `calc(${from} + ${w} * ${g})`,
            top: `${16 + i}px`,
            height: `${20 - i * 2}px`,
            background: `rgb(${INK} / ${(0.6 - i * 0.13) * a})`,
          }}
        />
      ))}
    </>
  );
}

function Bar({ r, v }: { r: Reading; v: Variant }) {
  const { bac } = r;
  const rising = r.peak !== null && r.peak > bac + 0.004 ? r.peak : null;
  const falling = !rising && r.hourAgo !== null && r.hourAgo > bac + 0.004 ? r.hourAgo : null;
  const top = Math.max(bac * BAND_HIGH, rising ?? 0, r.hourAgo ?? 0);
  const scale = Math.max(0.2, top * 1.12);
  const pos = (x: number) => Math.min(100, (x / scale) * 100);
  const pct = (x: number) => `${pos(x)}%`;
  const label = rising ? `Rising to about ${aboutPoint(rising)[1]} by ${WHEN}` : falling ? "Falling" : null;
  const Icon = rising ? TrendingUp : TrendingDown;

  return (
    <div className="relative mt-3 block h-[72px] w-full text-left">
      <span className="absolute inset-x-0 top-6 h-1 rounded-full bg-white/10" />
      <span
        className="absolute top-6 h-1 rounded-full bg-signal shadow-[0_0_16px_2px_rgb(124_180_255/0.55)]"
        style={{ left: pct(bac * BAND_LOW), width: `calc(${pct(bac * BAND_HIGH)} - ${pct(bac * BAND_LOW)})` }}
      />
      {rising !== null && <Light v={v} from={pct(bac)} to={pct(rising)} rising />}
      {falling !== null && <Light v={v} from={pct(bac)} to={pct(falling)} rising={false} />}
      {rising !== null && <span className="absolute top-[19px] size-3.5 -translate-x-1/2 rounded-full border-2 border-ink bg-bg/50" style={{ left: pct(rising) }} />}
      <span className="absolute top-4 h-5 w-0.5 -translate-x-1/2 rounded-full bg-ink shadow-[0_0_10px_1px_rgb(250_250_250/0.45)]" style={{ left: pct(bac) }} />

      {label && (
        <span className="absolute top-10 left-0 flex items-center gap-1.5 text-lg whitespace-nowrap text-ink-2">
          <Icon aria-hidden="true" className="size-5 shrink-0" strokeWidth={2.25} />
          {label}
        </span>
      )}
    </div>
  );
}

function Panel({ v, r, red }: { v: Variant; r: Reading; red: boolean }) {
  const [about, point] = aboutPoint(r.bac);
  return (
    <div className="relative w-[375px] overflow-hidden rounded-2xl bg-bg px-5 pt-6 pb-3 text-ink" style={{ background: red ? "radial-gradient(70% 70% at 50% 10%, rgb(90 22 16), #09090b)" : "radial-gradient(70% 70% at 50% 10%, rgb(20 36 70), #09090b)" }}>
      <p className="text-lg text-ink-2">Estimated blood alcohol</p>
      <p className="mt-2 flex items-baseline gap-3">
        {about && <span className="text-2xl font-medium">about</span>}
        <span className="text-[88px] leading-[0.88] font-medium tracking-[-0.055em]">{point}</span>
      </p>
      <Bar r={r} v={v} />
    </div>
  );
}

const VARIANTS: { v: Variant; name: string; why: string }[] = [
  { v: "comet", name: "Comet (shipped)", why: "A soft head of light on the tick that tapers toward the ring (an elliptical glow plus the band gone white-hot, thinning away). Brightest where it is, thinning to where it is going." },
  { v: "streak", name: "Long exposure", why: "The band itself smears forward: a white-hot streak at the band's own height fading to nothing before the ring, with a uniform soft bloom under it. One shape, stretched by light; boxier than the comet." },
  { v: "ghosts", name: "Ghost ticks", why: "Strobed, fading copies of the now tick along the way, over a faint streak. A motion trail read frame by frame; rejected because it reads as ruler marks." },
];

export function RisingLab() {
  return (
    <main className="min-h-dvh bg-bg px-8 py-10 text-ink">
      <h1 className="text-3xl font-semibold tracking-[-0.03em]">Momentum, built in light</h1>
      <p className="mt-2 max-w-[70ch] text-lg text-ink-2">Rising near the peak, rising far from it, falling; on the calm field and the red one. Nothing moves.</p>
      <div className="mt-8 flex flex-col gap-12">
        {VARIANTS.map(({ v, name, why }) => (
          <section key={v} data-variant={v}>
            <h2 className="text-2xl font-semibold tracking-[-0.02em]">{name}</h2>
            <p className="mt-1 max-w-[70ch] text-lg text-ink-2">{why}</p>
            <div className="mt-4 flex gap-4">
              <Panel v={v} r={RISING} red={false} />
              <Panel v={v} r={RISING_FAR} red={false} />
              <Panel v={v} r={FALLING} red={false} />
            </div>
            <div className="mt-4 flex gap-4">
              <Panel v={v} r={RISING} red />
              <Panel v={v} r={RISING_FAR} red />
              <Panel v={v} r={FALLING} red />
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
