"use client";

import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

import { BrandMark } from "~/components/BrandMark";
import { WarningMark } from "~/components/night/WarningMark";
import { useSampleNight } from "../_kit/useSampleNight";
import { Frame, type Treatment } from "./Frame";
import "./notsafe.css";

const WORD = "Not safe to drive";

/** Today's compact glass pill (NightView), used by the current treatment and as a scrolled fallback. */
function GlassPill({ icon = "text-alert" }: { icon?: string }) {
  return (
    <div className="flex min-w-0 flex-1">
      <h1 className="sr-only">BACulator</h1>
      <p role="status" data-status className="glass glass-strong relative flex min-h-12 items-center gap-2 rounded-full px-3.5 text-lg font-medium whitespace-nowrap">
        <WarningMark className={`size-5 ${icon}`} />
        {WORD}
      </p>
    </div>
  );
}
const Mark = () => (
  <h1 className="flex-1">
    <BrandMark size={44} />
  </h1>
);

interface Option {
  id: string;
  name: string;
  why: string;
  t: Treatment;
}

const OPTIONS: Option[] = [
  {
    id: "0",
    name: "Current",
    why: "Coral line between the number and the bar; the glass pill takes the mark's place once the number scrolls away.",
    t: {
      headerLeft: (s) => (s ? <GlassPill /> : <Mark />),
      underNumber: (
        <p role="status" data-status className="mt-3 flex items-center gap-2 text-lg font-medium text-alert">
          <WarningMark className="size-5" />
          {WORD}
        </p>
      ),
    },
  },
  {
    id: "A",
    name: "Status in the chrome",
    why: "The pill is the top-left chrome for the whole night: it replaces the mark whenever a drink counts, so it never appears, swaps or moves on scroll. The number area goes back to number + bar only. Glass is used for exactly what Glass is for: floating chrome.",
    t: {
      headerLeft: () => (
        <div className="flex min-w-0 flex-1">
          <h1 className="sr-only">BACulator</h1>
          <p role="status" data-status className="glass glass-strong relative flex min-h-12 items-center gap-2.5 rounded-full pr-4 pl-3 text-lg font-semibold whitespace-nowrap">
            <span className="grid size-8 place-items-center rounded-full bg-[rgb(255_164_148/0.1)] shadow-[inset_0_0_0_1px_rgb(255_164_148/0.2)]">
              <WarningMark className="size-[18px] text-alert" />
            </span>
            {WORD}
          </p>
        </div>
      ),
    },
  },
  {
    id: "B",
    name: "The screen's heading",
    why: "The warning becomes the title of the estimate: icon + words in ink above the caption, set like a heading, not an error. When the number scrolls away the same heading pins top-left on the scrim, with no glass and no swap of material.",
    t: {
      headerLeft: (s) =>
        s ? (
          <div className="flex min-w-0 flex-1">
            <h1 className="sr-only">BACulator</h1>
            <p role="status" data-status className="flex min-h-12 items-center gap-2 pl-1 text-xl font-semibold tracking-[-0.01em] whitespace-nowrap">
              <WarningMark className="size-6 text-alert" />
              {WORD}
            </p>
          </div>
        ) : (
          <Mark />
        ),
      heading: (
        <div>
          <p role="status" data-status className="flex items-center gap-2 text-xl font-semibold tracking-[-0.01em]">
            <WarningMark className="size-6 text-alert" />
            {WORD}
          </p>
          <h2 id="ns-estimate-heading" className="mt-1 text-lg text-ink-2">
            Estimated blood alcohol
          </h2>
        </div>
      ),
    },
  },
  {
    id: "C",
    name: "Solid card, leads to Getting home",
    why: "A full-width solid row at the top of the cards stack: icon, the words, and Get home on the right, so the warning is also the way out. It reads as content, sits on the material everything else sits on, and earns its space by doing something.",
    t: {
      headerLeft: (s) => (s ? <GlassPill /> : <Mark />),
      cardRow: (
        <button type="button" aria-label="Not safe to drive. Get home" className="card press flex min-h-16 items-center gap-3 py-2 pr-3 pl-3 text-left">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[rgb(255_164_148/0.12)] shadow-[inset_0_0_0_1px_rgb(255_164_148/0.3)]">
            <WarningMark className="size-5 text-alert" />
          </span>
          <span role="status" data-status className="flex-1 text-lg font-semibold">
            {WORD}
          </span>
          <span className="flex items-center gap-0.5 text-lg text-ink-2">
            Get home
            <ChevronRight aria-hidden="true" className="size-5" strokeWidth={2} />
          </span>
        </button>
      ),
    },
  },
  {
    id: "D",
    name: "Quiet ink, on the instrument",
    why: "No coral at all: the red field already carries the colour. Icon and words in ink, set as the bar's legend under a 1px lit rule, so it reads as the instrument's state rather than an error message. Scrolled, the same ink treatment in the glass pill.",
    t: {
      headerLeft: (s) => (s ? <GlassPill icon="text-ink" /> : <Mark />),
      underBar: (
        <p role="status" data-status className="mt-1 flex items-center gap-2 border-t border-white/[0.12] pt-3.5 text-lg font-medium">
          <WarningMark className="size-5" />
          {WORD}
        </p>
      ),
    },
  },
];

export function NotSafeLab() {
  const night = useSampleNight();
  const [q, setQ] = useState<{ only: string | null; s: boolean } | null>(null);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setQ({ only: p.get("only"), s: p.has("s") });
  }, []);
  if (!q || !night.model.hasDrinks) return <div className="min-h-dvh bg-bg" />;

  if (q.only) {
    const o = OPTIONS.find((x) => x.id === q.only);
    if (!o) return <p className="p-4 text-ink">No option {q.only}</p>;
    return (
      <div className="bg-bg">
        <div className="[&_.ns-frame]:rounded-none [&_.ns-frame]:shadow-none">
          <Frame night={night} t={o.t} scrolled={q.s} />
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-dvh bg-bg px-8 py-10 text-ink">
      <h1 className="text-3xl font-semibold tracking-[-0.03em]">Not safe to drive: four treatments</h1>
      <p className="mt-2 max-w-[70ch] text-lg text-ink-2">
        Each frame is the top of the night screen on the red field, at rest and scrolled (number off screen). Shows whenever any drink is counted; nothing moves at rest. Add{" "}
        <code>?only=A</code> (and <code>&amp;s=1</code>) to render one frame alone.
      </p>
      <div className="mt-10 flex flex-col gap-14">
        {OPTIONS.map((o) => (
          <section key={o.id} className="grid grid-cols-[320px_375px_375px] items-start gap-8">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.02em]">
                {o.id === "0" ? "Now" : o.id}. {o.name}
              </h2>
              <p className="mt-3 text-lg text-ink-2">{o.why}</p>
            </div>
            <figure>
              <figcaption className="mb-3 text-lg text-ink-2">At rest</figcaption>
              <Frame night={night} t={o.t} scrolled={false} />
            </figure>
            <figure>
              <figcaption className="mb-3 text-lg text-ink-2">Scrolled, number off screen</figcaption>
              <Frame night={night} t={o.t} scrolled />
            </figure>
          </section>
        ))}
      </div>
    </main>
  );
}
