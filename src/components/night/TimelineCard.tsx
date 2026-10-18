import { Maximize2 } from "lucide-react";
import { useMemo, useState } from "react";

import { simulateNight, type NightSimulation } from "~/lib/bac-calculator";
import { formatPoint } from "~/lib/estimate-display";
import { formatClock } from "~/lib/format-clock";
import type { Drink } from "~/types/bac";

import { valueAt } from "./chart/geometry";
import { SignalChart } from "./chart/SignalChart";

export { valueAt };

interface ChartProps {
  simulation: NightSimulation;
  now: Date;
  height: number;
  /** The bigger graph: shows a time · value tag at the cursor while scrubbing. */
  axes?: boolean;
  /** Drink times (ms), marked on the baseline. */
  events?: number[];
  /** Reports the scrubbed time (null at rest), so a header can read it. */
  onPick?: (t: number | null, bac: number) => void;
}

/** Tonight's curve (see chart/SignalChart). The bigger graph uses it too, with a readout. */
export function TimelineChart({ simulation, now, height, axes = false, events, onPick }: ChartProps) {
  return <SignalChart simulation={simulation} now={now} height={height} events={events} onPick={onPick} readout={axes} />;
}

interface TimelineCardProps {
  simulation: NightSimulation | null;
  now: Date;
  onExpand: () => void;
  /**
   * When the drinks and body details are passed, the curve is re-simulated at one-minute resolution
   * (the screen's own simulation samples every 5 min) and each drink is marked on the baseline.
   */
  drinks?: Drink[];
  weight?: number | null;
  sex?: string | null;
}

/** Tonight's curve on the main screen; the header reads whatever time is being scrubbed. */
export function TimelineCard({ simulation, now, onExpand, drinks, weight, sex }: TimelineCardProps) {
  const [picked, setPicked] = useState<{
    t: number | null;
    bac: number;
  } | null>(null);
  const fine = useMemo(() => (drinks && drinks.length > 0 && weight && sex ? simulateNight(drinks, weight, sex, now, 1) : null), [drinks, weight, sex, now]);
  const sim = fine ?? simulation;
  const events = useMemo(() => (drinks ?? []).map((d) => new Date(d.finishedAt).getTime()).filter((t) => t <= now.getTime()), [drinks, now]);
  if (!sim || sim.samples.length < 2) return null;
  const nowBac = valueAt(sim.samples, now.getTime());
  const bac = picked?.bac ?? nowBac;
  const zero = sim.zeroAt;
  return (
    <section aria-labelledby="curve-heading" className="card p-5">
      {/* The header opens the bigger graph; dragging the curve itself scrubs. No instructions needed. */}
      <button
        type="button"
        onClick={onExpand}
        aria-label="Tonight: open a bigger graph"
        className="press -mx-2 -mt-2 flex min-h-12 w-[calc(100%+16px)] items-center justify-between gap-3 rounded-key px-2 text-left"
      >
        <h2 id="curve-heading" className="flex items-center gap-1.5 text-lg font-semibold">
          Tonight
          <Maximize2 aria-hidden="true" className="text-ink-2 size-4" strokeWidth={2} />
        </h2>
        <span className="text-lg" aria-live="off">
          <span className="text-ink-2">{picked?.t ? formatClock(picked.t) : "Now"} · </span>
          <span className="font-medium tabular-nums">about {formatPoint(bac)}</span>
        </span>
      </button>
      <p className="sr-only">
        Estimated blood alcohol through the night, from {formatClock(sim.samples[0]!.t)}. Now about {formatPoint(nowBac)}. Peak about{" "}
        {formatPoint(sim.peak.bac)} at {formatClock(sim.peak.t)}.
        {zero ? ` Back to zero around ${formatClock(zero)} by the model, later for slow eliminators.` : ""} Estimate only: the true value could be a quarter
        lower or 40% higher.
      </p>
      <div className="mt-3">
        <SignalChart simulation={sim} now={now} height={168} events={events} onPick={(t, b) => setPicked(t === null ? null : { t, bac: b })} />
      </div>
    </section>
  );
}
