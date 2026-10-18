"use client";

import { Minus, Plus } from "lucide-react";
import { useId, useState } from "react";

import { formatClock } from "~/lib/format-clock";

const CHIPS = [0, 10, 20, 30, 60];
const STEP = 5;
// The night window is 48 h; a drink further back than this wouldn't count anyway.
export const MAX_MINUTES_AGO = 12 * 60;

export function agoLabel(minutes: number): string {
  if (minutes <= 0) return "now";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min ago`;
  return m === 0 ? `${h} h ago` : `${h} h ${m} min ago`;
}

interface TimeControlProps {
  /** Minutes before now the drink was finished. */
  minutesAgo: number;
  onChange: (minutesAgo: number) => void;
  now: Date;
  /** Opens with the slider showing (editing a logged drink). */
  startOpen?: boolean;
  /** Wrap the chips onto two rows (sheets). Without it they scroll on one row, for above a keyboard. */
  wrap?: boolean;
}

/**
 * When a drink was finished: one tap for the common answers, then an "Earlier" slider in 5-minute
 * steps with large −5 / +5 minute buttons, so dragging is never the only way. The read-out says the
 * clock time and how long ago, in words.
 */
export function TimeControl({ minutesAgo, onChange, now, startOpen = false, wrap = false }: TimeControlProps) {
  const id = useId();
  const [open, setOpen] = useState(startOpen || !CHIPS.includes(minutesAgo));
  const clamp = (m: number) => Math.min(MAX_MINUTES_AGO, Math.max(0, Math.round(m / STEP) * STEP));
  const at = new Date(now.getTime() - minutesAgo * 60_000);
  const chip = (m: number) => (m === 0 ? "Now" : m < 60 ? `${m} min` : "1 hour");

  return (
    <div className="flex flex-col gap-3">
      {/* In a sheet the chips wrap; above a keyboard they scroll on one row to stay one line tall. */}
      <div className={wrap ? "flex flex-wrap gap-2" : "-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5"} role="group" aria-label="When you finished it">
        {CHIPS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              onChange(m);
              setOpen(false);
            }}
            aria-pressed={!open && minutesAgo === m}
            className={`press min-h-12 shrink-0 rounded-key px-4 text-lg ${
              !open && minutesAgo === m ? "bg-ink font-medium text-bg" : "bg-white/[0.06] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]"
            }`}
          >
            {chip(m)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls={id}
          className={`press min-h-12 shrink-0 rounded-key px-4 text-lg ${open ? "bg-ink font-medium text-bg" : "bg-white/[0.06] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]"}`}
        >
          Earlier…
        </button>
      </div>

      {open && (
        <div id={id} className="compose-in rounded-row bg-white/[0.04] p-3 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]">
          <p className="text-center text-lg" aria-live="polite">
            <span className="font-medium">{formatClock(at)}</span>
            <span className="text-ink-2"> · {agoLabel(minutesAgo)}</span>
          </p>
          <div className="mt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChange(clamp(minutesAgo + 5))}
              aria-label="5 minutes earlier"
              className="press grid size-12 shrink-0 place-items-center rounded-key bg-white/10 hover:bg-white/15"
            >
              <Minus aria-hidden="true" className="size-5" strokeWidth={2.25} />
            </button>
            <input
              type="range"
              aria-label="How long ago"
              aria-valuetext={`${formatClock(at)}, ${agoLabel(minutesAgo)}`}
              min={0}
              max={MAX_MINUTES_AGO}
              step={STEP}
              // Left is earlier, right is now, like a timeline.
              value={MAX_MINUTES_AGO - minutesAgo}
              onChange={(e) => onChange(clamp(MAX_MINUTES_AGO - Number(e.target.value)))}
              className="time-range min-w-0 flex-1"
              style={{ "--fill": `${((MAX_MINUTES_AGO - minutesAgo) / MAX_MINUTES_AGO) * 100}%` } as React.CSSProperties}
            />
            <button
              type="button"
              onClick={() => onChange(clamp(minutesAgo - 5))}
              aria-label="5 minutes later"
              className="press grid size-12 shrink-0 place-items-center rounded-key bg-white/10 hover:bg-white/15"
            >
              <Plus aria-hidden="true" className="size-5" strokeWidth={2.25} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
