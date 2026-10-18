import { Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import type { NewDrink } from "~/hooks/useNight";
import { useRegion } from "~/hooks/useRegion";
import { servesFor } from "~/lib/region";
import { DrinkIcon, drinkKind } from "./DrinkIcon";
import { Sheet } from "./Sheet";
import { TimeControl } from "./TimeControl";

interface AddSheetProps {
  open: boolean;
  onClose: () => void;
  now: Date;
  /** Adds optimistically and returns at once; false if it was swallowed as a double tap. */
  onAdd: (drink: NewDrink) => boolean;
}

const MAX_COUNT = 6;

/**
 * Choose a drink from the region's serves: tap one, optionally how many and when, Add. Two taps
 * for the usual case, never any typing (typing and voice live in the dock's composer).
 */
export function AddSheet({ open, onClose, now, onAdd }: AddSheetProps) {
  const { region, std } = useRegion();
  const serves = servesFor(region);
  const [picked, setPicked] = useState(0);
  const [count, setCount] = useState(1);
  const [minutesAgo, setMinutesAgo] = useState(0);

  // Every open starts fresh at "Now", so a drink is never stamped with a stale time.
  useEffect(() => {
    if (!open) return;
    setPicked(0);
    setCount(1);
    setMinutesAgo(0);
  }, [open]);

  const serve = serves[Math.min(picked, serves.length - 1)]!;
  const standards = Math.ceil(serve.standards * count * 10 - 1e-9) / 10; // never round a drink down

  function submit() {
    const added = onAdd({
      standards,
      finishedAt: new Date(Date.now() - minutesAgo * 60_000),
      details: {
        name: count > 1 ? `${count} × ${serve.label}` : serve.label,
        volumeMl: serve.volumeMl,
        abv: serve.abv,
        count,
        source: "manual",
        confidence: 1,
        rawText: "",
      },
    });
    if (added) onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()} title="Choose a drink" description="Pick a drink, how many and when, then add it.">
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Drink">
        {serves.map((s, i) => (
          <button
            key={s.label}
            type="button"
            role="radio"
            aria-checked={picked === i}
            onClick={() => setPicked(i)}
            className={`press flex min-h-[72px] items-center gap-3 rounded-2xl px-3 text-left ${
              picked === i ? "bg-white/[0.14] shadow-[inset_0_0_0_2px_var(--color-ink)]" : "bg-white/[0.05] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]"
            }`}
          >
            <DrinkIcon kind={drinkKind({ name: s.label, volumeMl: s.volumeMl, abv: s.abv })} className="size-6 shrink-0 text-ink-2" />
            <span className="min-w-0">
              <span className="block text-lg leading-tight font-medium">{s.label}</span>
              <span className="block text-lg leading-tight text-ink-2 tabular-nums">{std(s.standards)} std</span>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-lg text-ink-2">How many</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="One fewer"
            disabled={count <= 1}
            onClick={() => setCount((c) => Math.max(1, c - 1))}
            className="press grid size-12 place-items-center rounded-full bg-white/10 disabled:opacity-40"
          >
            <Minus aria-hidden="true" className="size-5" strokeWidth={2.25} />
          </button>
          <span className="w-8 text-center text-xl font-medium tabular-nums" aria-live="polite">
            {count}
          </span>
          <button
            type="button"
            aria-label="One more"
            disabled={count >= MAX_COUNT}
            onClick={() => setCount((c) => Math.min(MAX_COUNT, c + 1))}
            className="press grid size-12 place-items-center rounded-full bg-white/10 disabled:opacity-40"
          >
            <Plus aria-hidden="true" className="size-5" strokeWidth={2.25} />
          </button>
        </div>
      </div>

      <p className="mt-5 text-lg text-ink-2">When you finished it</p>
      <div className="mt-2">
        <TimeControl minutesAgo={minutesAgo} onChange={setMinutesAgo} now={now} wrap />
      </div>

      <button type="button" onClick={submit} className="press key-glow mt-6 flex min-h-16 w-full items-center justify-center gap-2 rounded-full bg-ink text-xl font-medium text-bg">
        <Plus aria-hidden="true" className="size-6" strokeWidth={2.5} />
        Add · {std(standards)} std
      </button>
    </Sheet>
  );
}
