import { useMemo } from "react";
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { useReducedMotion } from "~/hooks/useReducedMotion";
import { generateAdvancedBACTimeline } from "~/lib/bac-graph";
import type { Drink } from "~/types/bac";

interface TimelineCardProps {
  drinks: Drink[];
  userWeight: number | null;
  userSex: string | null;
  now: Date;
  onExpand: () => void;
}

const AMBER = "#f2b84b";
const clock = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", hour12: true }).toLowerCase().replace(" ", "");

/**
 * Tonight's curve, on the main screen: where the estimate has been, where it's heading. The past is
 * solid, the future lighter, "now" is a vertical line. No horizontal lines: nothing reads as a limit.
 */
export function TimelineCard({ drinks, userWeight, userSex, now, onExpand }: TimelineCardProps) {
  const reduced = useReducedMotion();

  const data = useMemo(() => {
    if (!userWeight || !userSex || drinks.length === 0) return null;
    const timeline = generateAdvancedBACTimeline(drinks, userWeight, userSex, now, {
      intervalMinutes: 10,
      postCurrentHours: 10,
    });
    // Trim the tail once it's back to zero, so the curve fills the card.
    let end = timeline.data.length;
    while (end > 1 && (timeline.data[end - 1]?.bac ?? 0) === 0 && (timeline.data[end - 2]?.bac ?? 0) === 0) end--;
    const points = timeline.data.slice(0, Math.min(timeline.data.length, end + 2)).map((p) => ({
      hour: p.hour,
      past: p.hoursFromCurrent <= 0 ? p.bac : null,
      future: p.hoursFromCurrent >= -0.1 ? p.bac : null,
      at: p.absoluteTime,
    }));
    return { points, nowHour: timeline.currentTimeHour };
  }, [drinks, userWeight, userSex, now]);

  if (!data) return null;
  const first = data.points[0];
  const last = data.points[data.points.length - 1];
  const span = (last?.hour ?? 1) - (first?.hour ?? 0) || 1;
  const nowPct = ((data.nowHour - (first?.hour ?? 0)) / span) * 100;

  return (
    <section aria-labelledby="curve-heading" className="rounded-[28px] bg-surface p-5">
      <header className="flex items-baseline justify-between gap-4">
        <h2 id="curve-heading" className="text-[22px] font-bold text-ink">
          Tonight&apos;s curve
        </h2>
        <button type="button" onClick={onExpand} className="press min-h-12 px-1 text-lg font-semibold text-ink underline underline-offset-4">
          Bigger
        </button>
      </header>
      <div className="mt-3 h-44" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.points} margin={{ left: 0, right: 4, top: 8, bottom: 0 }}>
            <XAxis dataKey="hour" type="number" domain={["dataMin", "dataMax"]} hide />
            <YAxis hide domain={[0, (max: number) => Math.max(0.04, max * 1.15)]} />
            <Area
              type="monotone"
              dataKey="past"
              stroke={AMBER}
              strokeWidth={3}
              fill={AMBER}
              fillOpacity={0.35}
              isAnimationActive={!reduced}
              animationDuration={900}
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="future"
              stroke={AMBER}
              strokeWidth={3}
              strokeDasharray="6 6"
              fill={AMBER}
              fillOpacity={0.12}
              isAnimationActive={!reduced}
              animationDuration={900}
              animationBegin={300}
              connectNulls={false}
            />
            <ReferenceLine x={data.nowHour} stroke="#edeae4" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="relative mt-2 flex h-6 justify-between text-base font-medium text-ink-2 tabular-nums">
        <span>{first ? clock(first.at) : ""}</span>
        <span
          className="absolute -translate-x-1/2 font-semibold text-ink"
          style={{ left: `${Math.min(88, Math.max(12, nowPct))}%` }}
        >
          now
        </span>
        <span>{last ? clock(last.at) : ""}</span>
      </p>
      <p className="sr-only">Chart of estimated blood alcohol over tonight. Use Bigger for times and values.</p>
    </section>
  );
}
