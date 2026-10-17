"use client";

import { useEffect, useMemo, useState } from "react";

import { useRegion } from "~/hooks/useRegion";
import { calculateBAC } from "~/lib/bac-calculator";
import { describeEstimate } from "~/lib/estimate-display";
import { servesFor } from "~/lib/region";

// The demo person is stated on the docket; nothing here is anyone's real estimate.
const DEMO_WEIGHT_KG = 75;
const DEMO_SEX = "female";
const PACE_MIN = 30;
const MAX_LINES = 8;
const TEAR_MS = 520;

interface Line {
  key: number;
  label: string;
  standards: number;
}

const clock = (date: Date) =>
  date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();

function WarningMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-7 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round">
      <path d="M12 3 2 21h20L12 3Z" />
      <path d="M12 10v5M12 18v.01" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The hero's live thing: a bar docket you can add serves to. Each tap prints a line, the estimate
 * band and back-to-zero window recalculate with the real engine, and "Start over" tears it off.
 */
export function LiveDocket() {
  const { region, std } = useRegion();
  const serves = useMemo(() => servesFor(region), [region]);
  const [lines, setLines] = useState<Line[]>([]);
  const [tearing, setTearing] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  // Seed after mount so server and client agree, and so the clock is the visitor's own.
  useEffect(() => {
    setNow(new Date());
    const [first, , , wine] = serves;
    if (first && wine) {
      setLines([
        { key: 1, label: first.label, standards: first.standards },
        { key: 2, label: wine.label, standards: wine.standards },
      ]);
    }
  }, [serves]);

  const timed = useMemo(() => {
    if (!now) return [];
    return lines.map((line, i) => ({
      ...line,
      finishedAt: new Date(now.getTime() - (lines.length - 1 - i) * PACE_MIN * 60_000),
    }));
  }, [lines, now]);

  const estimate = useMemo(() => {
    if (!now) return null;
    const drinks = timed.map((l) => ({ id: String(l.key), standards: l.standards, finishedAt: l.finishedAt }));
    const result = calculateBAC({ drinks, userWeight: DEMO_WEIGHT_KG, userSex: DEMO_SEX, currentTime: now });
    return result ? describeEstimate(result, drinks, now) : null;
  }, [timed, now]);

  const total = lines.reduce((sum, l) => sum + l.standards, 0);
  const full = lines.length >= MAX_LINES;

  function add(serve: (typeof serves)[number]) {
    if (full || tearing) return;
    setNow(new Date());
    setLines((prev) => [...prev, { key: Date.now(), label: serve.label, standards: serve.standards }]);
  }

  function startOver() {
    if (tearing || lines.length === 0) return;
    setTearing(true);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => {
      setLines([]);
      setTearing(false);
    }, reduce ? 0 : TEAR_MS);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="docket-slot">
        <article
          aria-label="Example tab"
          className={`docket bg-paper text-paper-ink ${tearing ? "docket-tear" : "docket-print"}`}
        >
          <header className="flex items-baseline justify-between gap-4 px-6 pt-6">
            <h2 className="text-[26px] leading-none font-bold tracking-[-0.02em]">Tonight</h2>
            <p className="text-base font-medium text-paper-ink-2 tabular-nums">{now ? clock(now) : ""}</p>
          </header>

          <ol className="mt-4 flex flex-col px-6" aria-live="polite">
            {timed.length === 0 && <li className="py-2 text-lg text-paper-ink-2">Nothing yet. Add a drink below.</li>}
            {timed.map((line) => (
              <li key={line.key} className="docket-line flex items-baseline justify-between gap-4 py-1.5 text-lg">
                <span className="min-w-0 font-semibold">
                  {line.label}
                  <span className="ml-2 font-medium text-paper-ink-2 tabular-nums">{clock(line.finishedAt)}</span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums">{std(line.standards)}</span>
              </li>
            ))}
          </ol>

          <div className="mt-3 flex items-baseline justify-between bg-paper-2 px-6 py-3 text-lg font-semibold">
            <span>Standard drinks</span>
            <span key={total} className="docket-roll text-[22px] font-bold tabular-nums">
              {std(total)}
            </span>
          </div>

          <div className="px-6 pt-5 pb-10">
            <p className="text-base font-medium text-paper-ink-2">Estimated blood alcohol, roughly</p>
            <p
              key={estimate?.band ?? "none"}
              className="docket-roll text-[clamp(48px,13vw,72px)] leading-[0.95] font-bold tracking-[-0.035em] tabular-nums"
            >
              {estimate?.band ?? "0.00"}
            </p>
            {estimate?.backToZero && (
              <p className="mt-2 text-lg font-medium">Back to zero {estimate.backToZero}</p>
            )}
            {estimate?.notSafeToDrive && (
              <p key={lines.length > 0 ? "on" : "off"} className="docket-stamp mt-4 inline-flex items-center gap-2 rounded-lg border-[3px] border-stamp px-3 py-1.5 text-[22px] font-bold text-stamp">
                <WarningMark />
                Not safe to drive
              </p>
            )}
            <p className="mt-5 text-base text-paper-ink-2">
              Example for a {region.weightUnit === "lb" ? "165 lb" : "75 kg"} woman, one drink every {PACE_MIN} min. Estimate only.
            </p>
          </div>
        </article>
      </div>

      <div className="grid grid-cols-2 gap-3" role="group" aria-label="Add a serve to the example tab">
        {serves.map((serve) => (
          <button
            key={serve.label}
            type="button"
            disabled={full}
            onClick={() => add(serve)}
            className="press flex min-h-16 flex-col justify-center rounded-2xl bg-surface-2 px-4 py-2 text-left text-ink hover:bg-surface-3 disabled:opacity-50"
          >
            <span className="text-lg leading-snug font-semibold">{serve.label}</span>
            <span className="text-base text-ink-2 tabular-nums">{std(serve.standards)} std</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={startOver}
        disabled={lines.length === 0}
        className="press min-h-14 self-start rounded-2xl px-1 text-lg font-semibold text-ink underline underline-offset-4 disabled:opacity-50"
      >
        {full ? "Tab's full. Start over" : "Start over"}
      </button>
    </div>
  );
}
