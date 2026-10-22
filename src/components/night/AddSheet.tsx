import { Check, ChevronLeft, Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import type { NewDrink } from "~/hooks/useNight";
import { useRegion } from "~/hooks/useRegion";
import { rawStandards } from "~/lib/drinks/standards";
import { drinkLabel } from "~/lib/estimate-display";
import { formatVolume, loggedStandards, servesFor } from "~/lib/region";
import type { QuickDrink } from "./AddDock";
import { sizesFor } from "./add/sizes";
import { DrinkIcon, drinkKind } from "./DrinkIcon";
import { Sheet } from "./Sheet";
import { TimeControl } from "./TimeControl";

interface AddSheetProps {
  open: boolean;
  onClose: () => void;
  now: Date;
  /** Adds optimistically and returns at once; false if it was swallowed as a double tap. */
  onAdd: (drink: NewDrink) => boolean;
  /** Drinks from earlier tonight or nights before, shown first: one tap adds one at "now". */
  recents?: QuickDrink[];
  onAddRecent?: (drink: QuickDrink) => void;
}

const MAX_COUNT = 6;

const ROW = "press flex w-full items-center gap-4 rounded-row bg-white/[0.05] px-4 py-4 text-left shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)] hover:bg-white/[0.08]";
const ICON_TILE = "grid size-11 shrink-0 place-items-center rounded-tile bg-white/[0.06] text-ink-2";

/**
 * Pick a drink from a list, the way a food log or an order screen does it: recents first, then the
 * region's usual serves as roomy rows (glass, name, size and strength). "Add" on a row logs one
 * at its usual size, now; tapping the row opens a size step (then how many and when) before Add.
 * Never any typing: typing and voice live in the dock's composer.
 */
export function AddSheet({ open, onClose, now, onAdd, recents = [], onAddRecent }: AddSheetProps) {
  const { region, std } = useRegion();
  const serves = servesFor(region);
  const [picked, setPicked] = useState<number | null>(null);
  const [volumeMl, setVolumeMl] = useState<number | null>(null);
  const [count, setCount] = useState(1);
  const [minutesAgo, setMinutesAgo] = useState(0);

  // Every open starts on the list at "Now", so a drink is never stamped with a stale time.
  useEffect(() => {
    if (!open) return;
    setPicked(null);
    setVolumeMl(null);
    setCount(1);
    setMinutesAgo(0);
  }, [open]);

  const serve = picked === null ? null : serves[picked]!;
  const sizes = serve ? sizesFor(serve, region) : [];
  const size = serve ? (sizes.find((s) => s.volumeMl === (volumeMl ?? serve.volumeMl)) ?? sizes[0]!) : null;
  const standards = serve && size ? loggedStandards(rawStandards(count, size.volumeMl, serve.abv), region) : 0;

  function quickAdd(i: number) {
    const s = serves[i]!;
    const added = onAdd({
      standards: s.standards,
      finishedAt: new Date(),
      details: { name: s.label, volumeMl: s.volumeMl, abv: s.abv, count: 1, source: "manual", confidence: 1, rawText: "" },
    });
    if (added) onClose();
  }

  function submit() {
    if (!serve || !size) return;
    const added = onAdd({
      standards,
      finishedAt: new Date(Date.now() - minutesAgo * 60_000),
      details: {
        name: count > 1 ? `${count} × ${size.label}` : size.label,
        volumeMl: size.volumeMl,
        abv: serve.abv,
        count,
        source: "manual",
        confidence: 1,
        rawText: "",
      },
    });
    if (added) onClose();
  }

  const detail = (ml: number, abv: number) => `${formatVolume(ml, region)} · ${abv}%`;

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={serve ? "Size and time" : "Add a drink"}
      description={serve ? "Choose the size, how many and when you finished it, then add it." : "Recent drinks first, then the usual serves. Add logs one now; tap a drink to change its size or time."}
    >
      {serve && size ? (
        <div className="flex flex-col gap-5 pt-1">
          <button type="button" onClick={() => setPicked(null)} className="press -ml-2 flex min-h-12 w-fit items-center gap-1 rounded-key pr-4 pl-2 text-lg font-medium text-ink-2 hover:bg-white/[0.06]">
            <ChevronLeft aria-hidden="true" className="size-6" strokeWidth={2.25} />
            All drinks
          </button>

          <div className="flex items-center gap-4 px-1">
            <span className={ICON_TILE}>
              <DrinkIcon kind={drinkKind({ name: serve.label, volumeMl: serve.volumeMl, abv: serve.abv })} className="size-6" />
            </span>
            <span className="min-w-0">
              <span className="block text-xl leading-snug font-medium">{size.label}</span>
              <span className="block text-lg leading-snug text-ink-2">{detail(size.volumeMl, serve.abv)}</span>
            </span>
          </div>

          <section aria-labelledby="size-heading" className="flex flex-col gap-2">
            <h3 id="size-heading" className="px-1 text-lg font-semibold">
              Size
            </h3>
            <div role="radiogroup" aria-labelledby="size-heading" className="flex flex-col gap-2">
              {sizes.map((s) => {
                const on = s.volumeMl === size.volumeMl;
                return (
                  <button
                    key={s.volumeMl}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setVolumeMl(s.volumeMl)}
                    className={`${ROW} min-h-16 ${on ? "bg-white/[0.12] shadow-[inset_0_0_0_2px_var(--color-ink)]" : ""}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg leading-snug font-medium">{s.size}</span>
                      <span className="block text-lg leading-snug text-ink-2 tabular-nums">
                        {formatVolume(s.volumeMl, region)} · {std(loggedStandards(rawStandards(1, s.volumeMl, serve.abv), region))} std
                      </span>
                    </span>
                    <span className={`grid size-7 shrink-0 place-items-center rounded-circle ${on ? "bg-ink text-bg" : "shadow-[inset_0_0_0_1.5px_var(--color-line)]"}`}>
                      {on && <Check aria-hidden="true" className="size-4" strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="flex min-h-16 items-center justify-between gap-3 rounded-row bg-white/[0.04] px-4 py-2 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]">
            <p className="text-lg font-semibold">How many</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="One fewer"
                disabled={count <= 1}
                onClick={() => setCount((c) => Math.max(1, c - 1))}
                className="press grid size-12 place-items-center rounded-key bg-white/10 disabled:opacity-40"
              >
                <Minus aria-hidden="true" className="size-5" strokeWidth={2.25} />
              </button>
              <span className="w-9 text-center text-xl font-medium tabular-nums" aria-live="polite">
                {count}
              </span>
              <button
                type="button"
                aria-label="One more"
                disabled={count >= MAX_COUNT}
                onClick={() => setCount((c) => Math.min(MAX_COUNT, c + 1))}
                className="press grid size-12 place-items-center rounded-key bg-white/10 disabled:opacity-40"
              >
                <Plus aria-hidden="true" className="size-5" strokeWidth={2.25} />
              </button>
            </div>
          </div>

          <section className="flex flex-col gap-3">
            <h3 className="px-1 text-lg font-semibold">When you finished it</h3>
            <TimeControl minutesAgo={minutesAgo} onChange={setMinutesAgo} now={now} wrap />
          </section>

          <div className="sticky -bottom-5 -mx-5 -mb-5 bg-gradient-to-t from-[var(--glass-strong)] from-70% to-transparent px-5 pt-4 pb-5">
            <button type="button" onClick={submit} className="press key-glow flex min-h-16 w-full items-center justify-center gap-2 rounded-primary bg-ink text-xl font-medium text-bg">
              <Plus aria-hidden="true" className="size-6" strokeWidth={2.5} />
              Add {count > 1 ? `${count} · ` : "· "}
              {std(standards)} std
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6 pt-1">
          {recents.length > 0 && onAddRecent && (
            <section aria-labelledby="recent-heading" className="flex flex-col gap-2">
              <h3 id="recent-heading" className="px-1 text-lg font-semibold">
                Recent
              </h3>
              <ul className="flex flex-col gap-2">
                {recents.map((d) => (
                  <li key={`${d.name ?? ""}|${d.standards}`}>
                    <button
                      type="button"
                      onClick={() => {
                        onAddRecent(d);
                        onClose();
                      }}
                      className={`${ROW} min-h-[72px]`}
                    >
                      <span className={ICON_TILE}>
                        <DrinkIcon kind={drinkKind(d)} className="size-6" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xl leading-snug font-medium">{drinkLabel(d, std)}</span>
                        <span className="block text-lg leading-snug text-ink-2">
                          {d.volumeMl && d.abv ? `${detail(d.volumeMl, d.abv)} · ` : ""}
                          {std(d.standards)} std
                        </span>
                      </span>
                      <span className="flex min-h-12 shrink-0 items-center gap-1 rounded-key bg-ink pr-4 pl-3 text-lg font-medium text-bg">
                        <Plus aria-hidden="true" className="size-5" strokeWidth={2.5} />
                        Add
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="serves-heading" className="flex flex-col gap-2">
            <h3 id="serves-heading" className="px-1 text-lg font-semibold">
              {recents.length > 0 ? "All drinks" : "Drinks"}
            </h3>
            <ul className="flex flex-col gap-2">
              {serves.map((s, i) => (
                <li key={s.label} className="flex items-center rounded-row bg-white/[0.05] pr-3 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]">
                  {/* The row opens the size step; its + key logs one at the usual size, now. */}
                  <button
                    type="button"
                    onClick={() => {
                      setPicked(i);
                      setVolumeMl(s.volumeMl);
                    }}
                    aria-label={`${s.label}, ${detail(s.volumeMl, s.abv)}, ${std(s.standards)} standard drinks. Change size or time`}
                    className="press flex min-h-[72px] min-w-0 flex-1 items-center gap-3 rounded-l-row py-3 pr-2 pl-4 text-left"
                  >
                    <span className={ICON_TILE}>
                      <DrinkIcon kind={drinkKind({ name: s.label, volumeMl: s.volumeMl, abv: s.abv })} className="size-6" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xl leading-snug font-medium">{s.label}</span>
                      <span className="block text-lg leading-snug text-ink-2">
                        {formatVolume(s.volumeMl, region)} · {std(s.standards)} std
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => quickAdd(i)}
                    aria-label={`Add ${s.label.toLowerCase()}`}
                    className="press grid size-12 shrink-0 place-items-center rounded-key bg-white/10 shadow-[inset_0_0_0_1px_var(--color-line)] hover:bg-white/15"
                  >
                    <Plus aria-hidden="true" className="size-6" strokeWidth={2.5} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </Sheet>
  );
}
