"use client";

import { TrendingDown, TrendingUp } from "lucide-react";

import { aboutPoint, BAND_HIGH, BAND_LOW } from "~/lib/estimate-display";

/**
 * Dev-only: three ways to say "still rising, to about X by T" on the range bar, on the calm and the
 * red field. Rising and falling for each; nothing moves. The chosen one ships in Estimate.tsx.
 */
type Variant = "arrow" | "dash" | "hollow";

interface Reading {
  bac: number;
  peak: number | null;
  hourAgo: number | null;
}
const RISING: Reading = { bac: 0.1, peak: 0.108, hourAgo: null };
const RISING_FAR: Reading = { bac: 0.1, peak: 0.16, hourAgo: null };
const FALLING: Reading = { bac: 0.08, peak: null, hourAgo: 0.1 };
const WHEN = "6:45 pm";

function Chevron({ left, color = "#fafafa", width = 2 }: { left: string; color?: string; width?: number }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 10 14" className="absolute top-[19px] h-3.5 w-2.5 -translate-x-[6px]" style={{ left }} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 2l6 5-6 5" />
    </svg>
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
      {falling !== null && (
        <span
          className="absolute top-6 h-1 rounded-full"
          style={{ left: pct(bac), width: `calc(${pct(falling)} - ${pct(bac)})`, background: "linear-gradient(to right, rgb(250 250 250 / 0.55), rgb(250 250 250 / 0))" }}
        />
      )}
      <span
        className="absolute top-6 h-1 rounded-full bg-signal shadow-[0_0_16px_2px_rgb(124_180_255/0.55)]"
        style={{ left: pct(bac * BAND_LOW), width: `calc(${pct(bac * BAND_HIGH)} - ${pct(bac * BAND_LOW)})` }}
      />
      {/* Over the band: the way ahead, from now to the peak. */}
      {rising !== null && v === "arrow" && (
        <>
          <span className="absolute top-[25px] h-0.5 rounded-full bg-ink/80" style={{ left: pct(bac), width: `calc(${pct(rising)} - ${pct(bac)} - 4px)` }} />
          <Chevron left={pct(rising)} />
        </>
      )}
      {rising !== null && v === "dash" && (
        <>
          <span className="absolute top-[25px] h-0 border-t-2 border-dashed border-ink/70" style={{ left: pct(bac), width: `calc(${pct(rising)} - ${pct(bac)} - 4px)` }} />
          <Chevron left={pct(rising)} />
        </>
      )}
      {rising !== null && v === "hollow" && (
        <>
          <span className="absolute top-[25px] h-0.5 rounded-full bg-ink/80" style={{ left: pct(bac), width: `calc(${pct(rising)} - ${pct(bac)})` }} />
          <span className="absolute top-[17px] h-[18px] w-1.5 -translate-x-1/2 rounded-full border-[1.5px] border-ink bg-bg/60" style={{ left: pct(rising) }} />
        </>
      )}
      <span className="absolute top-4 h-5 w-0.5 -translate-x-1/2 rounded-full bg-ink" style={{ left: pct(bac) }} />

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
  { v: "arrow", name: "Arrow over the band", why: "A solid ink line from the now tick to a chevron at the coming peak, drawn over the band (the peak is usually inside it). Reads as an arrow: from here, to there." },
  { v: "dash", name: "Dashed track to a chevron", why: "Today's dashed hairline, with the ring swapped for a chevron." },
  { v: "hollow", name: "Line to a hollow tick", why: "A solid line to an outlined copy of the now tick: the mark it will become." },
];

export function RisingLab() {
  return (
    <main className="min-h-dvh bg-bg px-8 py-10 text-ink">
      <h1 className="text-3xl font-semibold tracking-[-0.03em]">Which way it is heading</h1>
      <div className="mt-8 flex flex-col gap-12">
        {VARIANTS.map(({ v, name, why }) => (
          <section key={v} data-variant={v}>
            <h2 className="text-2xl font-semibold tracking-[-0.02em]">{name}</h2>
            <p className="mt-1 max-w-[70ch] text-lg text-ink-2">{why}</p>
            <div className="mt-4 flex gap-4">
              <Panel v={v} r={RISING} red={false} />
              <Panel v={v} r={RISING_FAR} red />
              <Panel v={v} r={FALLING} red />
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
