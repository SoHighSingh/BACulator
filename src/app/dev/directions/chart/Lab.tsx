"use client";

import { Maximize2 } from "lucide-react";
import { useMemo, useState } from "react";

import { InstrumentChart, type Look } from "~/components/night/chart/InstrumentChart";
import { valueAt } from "~/components/night/chart/geometry";
import { simulateNight } from "~/lib/bac-calculator";
import { formatPoint } from "~/lib/estimate-display";
import { formatClock } from "~/lib/format-clock";

import { useSampleNight } from "../_kit/useSampleNight";

interface Variant {
  id: string;
  name: string;
  line: string;
  look: Partial<Look>;
  /** Simulation step in minutes (1 = every minute from the real model). */
  step: number;
}

const VARIANTS: Variant[] = [
  {
    id: "a",
    name: "A · Instrument",
    line: "Hour hairlines, value ticks on the right edge (no horizontal rules), band as a faint fill, wash under the line. 1-min samples.",
    look: { timeGrid: true, yGrid: false, yLabels: true, area: true, band: "fill" },
    step: 1,
  },
  {
    id: "b",
    name: "B · Graph paper",
    line: "Full hairline grid on both axes, band as a faint fill, wash under the line. 1-min samples.",
    look: { timeGrid: true, yGrid: true, yLabels: true, area: true, band: "fill" },
    step: 1,
  },
  {
    id: "c",
    name: "C · Terminal",
    line: "No grid, ticks only; band drawn as dashed hairline outlines; no wash. 1-min samples.",
    look: { timeGrid: false, yGrid: false, yLabels: true, area: false, band: "outline" },
    step: 1,
  },
  {
    id: "d",
    name: "A at 5-min samples",
    line: "The same look fed the screen's current 5-minute simulation, for comparison.",
    look: { timeGrid: true, yGrid: false, yLabels: true, area: true, band: "fill" },
    step: 5,
  },
];

function Card({ v, night }: { v: Variant; night: ReturnType<typeof useSampleNight> }) {
  const [picked, setPicked] = useState<{ t: number | null; bac: number } | null>(null);
  const sim = useMemo(() => simulateNight(night.drinks, night.weight ?? 75, "female", night.now, v.step), [night.drinks, night.weight, night.now, v.step]);
  if (!sim) return null;
  const bac = picked?.bac ?? valueAt(sim.samples, night.now.getTime());
  const events = night.drinks.map((d) => new Date(d.finishedAt).getTime());
  return (
    <section className="card p-5" aria-label={v.name}>
      <div className="-mx-2 -mt-2 flex min-h-12 items-center justify-between gap-3 px-2">
        <h2 className="flex items-center gap-1.5 text-lg font-semibold">
          Tonight
          <Maximize2 aria-hidden="true" className="size-4 text-ink-2" strokeWidth={2} />
        </h2>
        <span className="text-lg">
          <span className="text-ink-2">{picked?.t ? formatClock(picked.t) : "Now"} · </span>
          <span className="font-medium tabular-nums">about {formatPoint(bac)}</span>
        </span>
      </div>
      <div className="mt-3">
        <InstrumentChart simulation={sim} now={night.now} height={168} events={events} look={v.look} readout={false} onPick={(t, b) => setPicked(t === null ? null : { t, bac: b })} />
      </div>
    </section>
  );
}

/** Dev lab: the Tonight curve as 2–3 instrument variants on the shared sample night. */
export function ChartLab() {
  const night = useSampleNight();
  return (
    <main className="mx-auto flex max-w-[480px] flex-col gap-6 px-4 py-6 text-ink">
      <header>
        <h1 className="text-2xl font-semibold">Tonight curve variants</h1>
        <p className="mt-1 text-lg text-ink-2">Same sample night. Drag or use arrow keys on a chart to scrub. Dev only.</p>
      </header>
      {VARIANTS.map((v) => (
        <div key={v.id} className="flex flex-col gap-2">
          <p className="text-lg font-medium">{v.name}</p>
          <p className="text-lg text-ink-2">{v.line}</p>
          <Card v={v} night={night} />
        </div>
      ))}
    </main>
  );
}
