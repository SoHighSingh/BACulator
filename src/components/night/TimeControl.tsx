"use client";

import { Minus, Plus } from "lucide-react";
import { useId, useState } from "react";

import { formatClock } from "~/lib/format-clock";
import { minutesAgoScale } from "~/lib/log-scale";

const CHIPS = [0, 10, 20, 30, 60];
/** 12 h back; the night window is 48 h but a drink further back than this wouldn't count anyway. */
export const MAX_MINUTES_AGO = minutesAgoScale.max;
const LAST = minutesAgoScale.values.length - 1;
/** Rungs named under the track, so the eased scale can be read before it is dragged; the middle two hide under 360px. */
const GUIDES: { m: number; narrow: boolean }[] = [
  { m: 720, narrow: true },
  { m: 360, narrow: false },
  { m: 180, narrow: false },
  { m: 60, narrow: true },
  { m: 0, narrow: true },
];

export function agoLabel(minutes: number): string {
  if (minutes <= 0) return "now";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min ago`;
  return m === 0 ? `${h} h ago` : `${h} h ${m} min ago`;
}

const guideLabel = (m: number) => (m === 0 ? "now" : m < 60 ? `${m} min` : `${m / 60} h`);
const stepLabel = (m: number) => (m === 1 ? "1 minute" : `${m} minutes`);

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
 * When a drink was finished: one tap for the common answers, then an "Earlier" slider with large
 * −/+ buttons, so dragging is never the only way. The slider is eased (`minutesAgoScale`): one
 * position per rung, so the same thumb travel covers a minute near now and half an hour at 12 h
 * back, and every stop is a round value. The buttons step one rung on the same ladder (1 min near
 * now, 5 within the hour, up to 30 far back); their labels say how far. The read-out says the
 * clock time and how long ago, in words.
 */
export function TimeControl({ minutesAgo, onChange, now, startOpen = false, wrap = false }: TimeControlProps) {
  const id = useId();
  const [open, setOpen] = useState(startOpen || !CHIPS.includes(minutesAgo));
  const at = new Date(now.getTime() - minutesAgo * 60_000);
  const chip = (m: number) => (m === 0 ? "Now" : m < 60 ? `${m} min` : "1 hour");
  // Left is earlier, right is now, like a timeline: position 0 is 12 h ago, LAST is now.
  const position = LAST - minutesAgoScale.indexOf(minutesAgo);
  const earlierBy = minutesAgoScale.delta(minutesAgo, 1);
  const laterBy = -minutesAgoScale.delta(minutesAgo, -1);

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
              !open && minutesAgo === m ? "bg-ink text-bg font-medium" : "bg-white/[0.06] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]"
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
          className={`press min-h-12 shrink-0 rounded-key px-4 text-lg ${open ? "bg-ink text-bg font-medium" : "bg-white/[0.06] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]"}`}
        >
          Earlier…
        </button>
      </div>

      {open && (
        <div
          id={id}
          // Opened by a tap, the slider brings itself into view, clear of a sheet's sticky Add button.
          ref={(el) => {
            if (el && !startOpen) el.scrollIntoView({ block: "nearest" });
          }}
          className="compose-in scroll-mb-28 rounded-row bg-white/[0.04] p-3 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]"
        >
          <p className="text-center text-lg" aria-live="polite">
            <span className="font-medium">{formatClock(at)}</span>
            <span className="text-ink-2"> · {agoLabel(minutesAgo)}</span>
          </p>
          <div className="mt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChange(minutesAgoScale.move(minutesAgo, 1))}
              disabled={earlierBy === 0}
              aria-label={earlierBy === 0 ? "Earlier (at the start)" : `${stepLabel(earlierBy)} earlier`}
              className="press grid size-12 shrink-0 place-items-center rounded-key bg-white/10 hover:bg-white/15 disabled:opacity-40"
            >
              <Minus aria-hidden="true" className="size-5" strokeWidth={2.25} />
            </button>
            <div className="min-w-0 flex-1">
              <input
                type="range"
                aria-label="How long ago"
                aria-valuetext={`${formatClock(at)}, ${agoLabel(minutesAgo)}`}
                min={0}
                max={LAST}
                step={1}
                value={position}
                onChange={(e) => onChange(minutesAgoScale.values[LAST - Number(e.target.value)]!)}
                className="time-range block w-full"
                style={
                  {
                    "--fill": `${(position / LAST) * 100}%`,
                  } as React.CSSProperties
                }
              />
              {/* Guide words under the track, at the rungs they name (the track runs between the thumb's centres, 16px in). */}
              <div aria-hidden="true" className="text-ink-2 relative mx-4 -mt-1 h-5 text-base tabular-nums">
                {GUIDES.map(({ m, narrow }) => (
                  <span
                    key={m}
                    className={`absolute -translate-x-1/2 whitespace-nowrap ${narrow ? "" : "hidden min-[360px]:inline"}`}
                    style={{
                      left: `${((LAST - minutesAgoScale.indexOf(m)) / LAST) * 100}%`,
                    }}
                  >
                    {guideLabel(m)}
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onChange(minutesAgoScale.move(minutesAgo, -1))}
              disabled={laterBy === 0}
              aria-label={laterBy === 0 ? "Later (already now)" : `${stepLabel(laterBy)} later`}
              className="press grid size-12 shrink-0 place-items-center rounded-key bg-white/10 hover:bg-white/15 disabled:opacity-40"
            >
              <Plus aria-hidden="true" className="size-5" strokeWidth={2.25} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
