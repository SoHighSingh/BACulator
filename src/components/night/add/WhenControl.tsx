"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { minutesAgoEased } from "~/lib/eased-scale";
import { formatClock } from "~/lib/format-clock";
import { NIGHT_WINDOW_MS } from "~/lib/night-model";
import { EasedSlider } from "./EasedSlider";

const CHIPS = [0, 15, 30, 60];
const MAX_AGO = NIGHT_WINDOW_MS / 60_000;
const KEY = "press grid size-14 shrink-0 place-items-center rounded-key bg-white/10 hover:bg-white/15 disabled:opacity-40";

const chipLabel = (m: number) => (m === 0 ? "Now" : m < 60 ? `${m} min` : `${m / 60} h`);

export function agoWords(minutes: number): string {
  const total = Math.round(minutes);
  if (total <= 0) return "now";
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min ago`;
  return m === 0 ? `${h} h ago` : `${h} h ${m} min ago`;
}

/** 5 minutes earlier or later, landing on whole fives. */
export const fiveEarlier = (m: number) => Math.min(MAX_AGO, Math.floor(Math.round(m) / 5) * 5 + 5);
export const fiveLater = (m: number) => Math.max(0, Math.ceil(Math.round(m) / 5) * 5 - 5);

interface WhenControlProps {
  /** Minutes before `now`; may have seconds in it for a logged drink's exact time. */
  minutesAgo: number;
  onChange: (minutesAgo: number) => void;
  /** Frozen when the sheet opened, so the read-out doesn't drift while it's held. */
  now: Date;
}

/**
 * When: a read-out ("9:40 pm · 1 h 20 min ago") with 5-minute earlier/later keys beside it (left is
 * earlier, like the track), one row of
 * chips for the usual answers, and a smooth eased slider from 12 h ago (left) to now (right).
 */
export function WhenControl({ minutesAgo, onChange, now }: WhenControlProps) {
  const [said, setSaid] = useState("");
  const at = new Date(now.getTime() - minutesAgo * 60_000);
  const isNow = Math.round(minutesAgo) <= 0;
  const text = (m: number) => (Math.round(m) <= 0 ? "Now" : `${formatClock(new Date(now.getTime() - m * 60_000))}, ${agoWords(m)}`);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <button type="button" aria-label="5 minutes earlier" disabled={minutesAgo >= MAX_AGO} onClick={() => onChange(fiveEarlier(minutesAgo))} className={KEY}>
          <ChevronLeft aria-hidden="true" className="size-7" strokeWidth={2.25} />
        </button>
        <p className="flex min-h-[72px] min-w-0 flex-1 flex-col items-center justify-center text-center">
          <span className="text-[28px] leading-tight font-medium tabular-nums">{isNow ? "Now" : formatClock(at)}</span>
          <span className="text-lg text-ink-2 tabular-nums">{isNow ? "just finished" : agoWords(minutesAgo)}</span>
        </p>
        <button type="button" aria-label="5 minutes later" disabled={isNow} onClick={() => onChange(fiveLater(minutesAgo))} className={KEY}>
          <ChevronRight aria-hidden="true" className="size-7" strokeWidth={2.25} />
        </button>
      </div>

      <EasedSlider
        scale={minutesAgoEased}
        value={Math.min(minutesAgo, minutesAgoEased.max)}
        onChange={onChange}
        onCommit={(m) => setSaid(text(m))}
        reversed
        label="When you finished it"
        valueText={text}
        pageStep={30}
      />
      <div aria-hidden="true" className="-mt-3 flex justify-between px-1 text-lg text-ink-2">
        <span>12 h ago</span>
        <span>now</span>
      </div>

      <div role="group" aria-label="When you finished it" className="flex flex-wrap gap-2">
        {CHIPS.map((m) => {
          const on = Math.abs(minutesAgo - m) < 0.5;
          return (
            <button
              key={m}
              type="button"
              aria-pressed={on}
              onClick={() => {
                onChange(m);
                setSaid(text(m));
              }}
              className={`press min-h-12 min-w-12 flex-auto rounded-key px-2 text-lg whitespace-nowrap ${
                on ? "bg-ink font-medium text-bg" : "bg-white/[0.08] hover:bg-white/[0.12]"
              }`}
            >
              {chipLabel(m)}
            </button>
          );
        })}
      </div>
      <p aria-live="polite" className="sr-only">
        {said}
      </p>
    </div>
  );
}
