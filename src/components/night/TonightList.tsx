import { ChevronRight } from "lucide-react";

import { useRegion } from "~/hooks/useRegion";
import type { LoggedDrink } from "~/hooks/useNight";
import { drinkLabel } from "~/lib/estimate-display";
import { formatClock } from "~/lib/format-clock";

interface TonightListProps {
  drinks: LoggedDrink[];
  onEdit: (drink: LoggedDrink) => void;
  onRemove: (drink: LoggedDrink) => void;
}

/**
 * Your tab: what, how much, when, with the running total. It is also the morning-after record.
 * Tapping a drink edits its time or size; Remove lives here, away from the add buttons.
 */
export function TonightList({ drinks, onEdit, onRemove }: TonightListProps) {
  const { std } = useRegion();
  if (drinks.length === 0) return null;
  const total = drinks.reduce((sum, d) => sum + d.standards, 0);
  const newestFirst = [...drinks].sort((a, b) => b.finishedAt.getTime() - a.finishedAt.getTime());

  return (
    <section aria-labelledby="tonight-heading" className="card overflow-hidden">
      <header className="flex items-end justify-between gap-4 p-5">
        <h2 id="tonight-heading" className="text-lg font-semibold">
          Your tab
          <span className="block font-normal text-ink-2">Last 24 hours</span>
        </h2>
        <p className="text-right">
          <span className="block text-3xl leading-none font-medium tracking-[-0.03em] tabular-nums">{std(total)}</span>
          <span className="block text-lg text-ink-2">standard drinks</span>
        </p>
      </header>
      <ul className="divide-y divide-edge border-t border-edge">
        {newestFirst.map((drink) => {
          const label = drinkLabel(drink, std);
          return (
            <li key={drink.id} className="flex items-center gap-2 py-1.5 pr-4 pl-1">
              <button
                type="button"
                onClick={() => onEdit(drink)}
                aria-label={`Edit ${label} at ${formatClock(drink.finishedAt)}`}
                className="press flex min-h-14 min-w-0 flex-1 items-center gap-2 rounded-row px-4 text-left hover:bg-white/[0.03]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-medium">{label}</span>
                  <span className="block text-lg text-ink-2 tabular-nums">
                    {formatClock(drink.finishedAt)} · {std(drink.standards)} std
                  </span>
                  {drink.unsynced && <span className="block text-lg text-ink-2">Saved on this phone, will sync</span>}
                </span>
                <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-ink-2" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => onRemove(drink)}
                aria-label={`Remove ${label} at ${formatClock(drink.finishedAt)}`}
                className="press min-h-12 shrink-0 rounded-key px-4 text-lg text-ink-2 shadow-[inset_0_0_0_1px_var(--color-line)] hover:bg-white/5"
              >
                Remove
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
