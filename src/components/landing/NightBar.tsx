"use client";

import { formatBackToZero } from "~/lib/estimate-display";
import { formatClock } from "~/lib/format-clock";
import type { DemoNight } from "./LiveStrip";

const HOUR = 3_600_000;

/**
 * The sample night as one bar, each stretch as wide as it really lasts: drinks going in, the slow
 * clear-out at 0.015 an hour, and the window where it likely reaches zero. A white tick marks now.
 * There is no limit on it, only time.
 */
export function NightBar({ demo }: { demo: DemoNight }) {
  const { drinks, result, now } = demo;
  if (!drinks.length || !result) return <div className="h-[clamp(200px,22vh,240px)]" />;

  const times = drinks.map((d) => new Date(d.finishedAt).getTime());
  const start = Math.min(...times);
  const inEnd = Math.max(...times) + 30 * 60_000;
  const t = now.getTime();
  const early = t + result.timeToSober * 0.75 * HOUR;
  const late = t + result.timeToSober * 1.6 * HOUR;
  const clearEnd = Math.max(inEnd + 15 * 60_000, early);
  const end = Math.max(late, clearEnd + 30 * 60_000);
  const span = end - start;

  const stages = [
    { key: "in", from: start, to: inEnd, title: "Going in", note: `Drinks from ${formatClock(new Date(start))}, each mostly absorbed within 30 minutes.`, cls: "bg-signal text-bg" },
    { key: "out", from: inEnd, to: clearEnd, title: "Clearing", note: "Your body clears about 0.015 an hour, at its own pace.", cls: "bg-signal/35 text-ink" },
    { key: "zero", from: clearEnd, to: end, title: "Back to zero", note: `Likely ${formatBackToZero(result.timeToSober, now) ?? "now"}.`, cls: "nightbar-tail text-ink" },
  ];
  // Each stretch as wide as it lasts, with a floor so a short one still holds its title.
  const raw = stages.map((s) => Math.max(20, ((s.to - s.from) / span) * 100));
  const total = raw.reduce((a, b) => a + b, 0);
  const widths = raw.map((w) => (w / total) * 100);
  let nowP = 0;
  stages.forEach((s, i) => {
    const before = widths.slice(0, i).reduce((a, b) => a + b, 0);
    if (t >= s.from && t <= s.to) nowP = before + widths[i]! * ((t - s.from) / (s.to - s.from));
    else if (t > s.to) nowP = before + widths[i]!;
  });

  return (
    <div className="relative">
      <ol className="nightbar flex flex-col gap-4 md:flex-row md:gap-[6px]" aria-label="The sample night, start to back to zero">
        {stages.map((s, i) => {
          return (
            <li key={s.key} className="nightbar-seg flex min-w-0 flex-col gap-3" style={{ flexGrow: widths[i], flexBasis: 0 }}>
              <div className={`nightbar-block strip-move flex rounded-[14px] px-5 py-4 md:p-5 ${s.cls}`}>
                <p className="text-[clamp(20px,2vw,28px)] leading-tight font-semibold tracking-[-0.02em]">{s.title}</p>
              </div>
              <p className="max-w-[34ch] text-lg text-ink-2">{s.note}</p>
            </li>
          );
        })}
      </ol>
      {/* Now, on the desktop bar only (the stacked phone bar reads top to bottom instead). */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[-12px] hidden h-[calc(var(--bar-h)+24px)] md:block">
        <div className="strip-move absolute inset-0" style={{ transform: `translateX(${nowP}%)` }}>
          <span className="absolute inset-y-0 -left-[3px] w-[6px] rounded-full bg-ink tick-cut" />
          <span className="absolute -top-9 -left-6 text-lg font-medium text-ink">Now</span>
        </div>
      </div>
    </div>
  );
}
