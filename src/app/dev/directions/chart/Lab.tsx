"use client";

import { Maximize2 } from "lucide-react";
import { useMemo, useState } from "react";

import { valueAt } from "~/components/night/chart/geometry";
import { SignalChart } from "~/components/night/chart/SignalChart";
import { simulateNight } from "~/lib/bac-calculator";
import { formatPoint } from "~/lib/estimate-display";
import { formatClock } from "~/lib/format-clock";

import { useSampleNight } from "../_kit/useSampleNight";

interface Variant {
  id: string;
  name: string;
  line: string;
  smooth: boolean;
  marks: boolean;
  readout: boolean;
  /** Simulation step in minutes (1 = every minute from the real model). */
  step: number;
}

const VARIANTS: Variant[] = [
  {
    id: "a",
    name: "A · Signal (shipped)",
    line: "1-min samples as a monotone curve, solid over a wash to now, dashed after; drink marks on the baseline; hour labels. No axis, grid or band.",
    smooth: true,
    marks: true,
    readout: false,
    step: 1,
  },
  {
    id: "b",
    name: "B · Signal, no marks",
    line: "The same without the drink marks.",
    smooth: true,
    marks: false,
    readout: false,
    step: 1,
  },
  {
    id: "c",
    name: "C · Raw polyline",
    line: "The same 1-min samples joined straight, for an honesty check against the smoothing.",
    smooth: false,
    marks: true,
    readout: false,
    step: 1,
  },
  {
    id: "d",
    name: "D · Bigger-graph look at 5-min samples",
    line: "What the bigger graph gets: the screen's 5-minute simulation, smoothed, with the value readout while scrubbing.",
    smooth: true,
    marks: true,
    readout: true,
    step: 5,
  },
];

function Card({
  v,
  night,
}: {
  v: Variant;
  night: ReturnType<typeof useSampleNight>;
}) {
  const [picked, setPicked] = useState<{
    t: number | null;
    bac: number;
  } | null>(null);
  const sim = useMemo(
    () =>
      simulateNight(
        night.drinks,
        night.weight ?? 75,
        "female",
        night.now,
        v.step,
      ),
    [night.drinks, night.weight, night.now, v.step],
  );
  if (!sim) return null;
  const bac = picked?.bac ?? valueAt(sim.samples, night.now.getTime());
  const events = v.marks
    ? night.drinks.map((d) => new Date(d.finishedAt).getTime())
    : [];
  return (
    <section className="card p-5" aria-label={v.name}>
      <div className="-mx-2 -mt-2 flex min-h-12 items-center justify-between gap-3 px-2">
        <h2 className="flex items-center gap-1.5 text-lg font-semibold">
          Tonight
          <Maximize2
            aria-hidden="true"
            className="text-ink-2 size-4"
            strokeWidth={2}
          />
        </h2>
        <span className="text-lg">
          <span className="text-ink-2">
            {picked?.t ? formatClock(picked.t) : "Now"} ·{" "}
          </span>
          <span className="font-medium tabular-nums">
            about {formatPoint(bac)}
          </span>
        </span>
      </div>
      <div className="mt-3">
        <SignalChart
          simulation={sim}
          now={night.now}
          height={168}
          events={events}
          smooth={v.smooth}
          readout={v.readout}
          onPick={(t, b) => setPicked(t === null ? null : { t, bac: b })}
        />
      </div>
    </section>
  );
}

/** Dev lab: the Tonight curve as signal variants on the shared sample night. */
export function ChartLab() {
  const night = useSampleNight();
  return (
    <main className="text-ink mx-auto flex max-w-[480px] flex-col gap-6 px-4 py-6">
      <header>
        <h1 className="text-2xl font-semibold">Tonight curve variants</h1>
        <p className="text-ink-2 mt-1 text-lg">
          Same sample night. Drag or use arrow keys on a chart to scrub. Dev
          only.
        </p>
      </header>
      {VARIANTS.map((v) => (
        <div key={v.id} className="flex flex-col gap-2">
          <p className="text-lg font-medium">{v.name}</p>
          <p className="text-ink-2 text-lg">{v.line}</p>
          <Card v={v} night={night} />
        </div>
      ))}
    </main>
  );
}
