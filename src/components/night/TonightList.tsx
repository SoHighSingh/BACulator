import { useRegion } from "~/hooks/useRegion";
import type { LoggedDrink } from "~/hooks/useNight";
import { drinkLabel } from "~/lib/estimate-display";
import { formatClock } from "~/lib/format-clock";

interface TonightListProps {
  drinks: LoggedDrink[];
  onEdit: (drink: LoggedDrink) => void;
}

/**
 * Your tab: one clean line per drink (name · time · standards), newest first, with the count and
 * total once in the header. It is also the morning-after record. The whole row is one target that
 * opens the edit sheet; removing a drink lives in that sheet, off the logging screen (user decision,
 * 22 Oct 2026). The unit is said once, in the header; rows carry figures only.
 */
export function TonightList({ drinks, onEdit }: TonightListProps) {
  const { std } = useRegion();
  if (drinks.length === 0) return null;
  const total = drinks.reduce((sum, d) => sum + d.standards, 0);
  const newestFirst = [...drinks].sort((a, b) => b.finishedAt.getTime() - a.finishedAt.getTime());
  const unsynced = drinks.filter((d) => d.unsynced).length;
  const count = `${drinks.length} ${drinks.length === 1 ? "drink" : "drinks"}`;

  return (
    <section aria-labelledby="tonight-heading" className="card overflow-hidden">
      <header className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 px-5 py-2">
        <h2 id="tonight-heading" className="text-lg font-semibold">
          Your tab
        </h2>
        <p className="ml-auto text-lg font-medium tabular-nums">
          {count} · {std(total)} std
        </p>
      </header>
      <ul className="divide-y divide-edge border-t border-edge">
        {newestFirst.map((drink) => {
          const label = drinkLabel(drink, std);
          const time = formatClock(drink.finishedAt);
          return (
            <li key={drink.id}>
              <button
                type="button"
                onClick={() => onEdit(drink)}
                aria-label={`Edit ${label}, ${time}, ${std(drink.standards)} standard drinks`}
                className="press grid min-h-14 w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 px-5 py-2 text-left text-lg hover:bg-white/[0.03]"
              >
                <span className="font-medium break-words">{label}</span>
                <span className="text-ink-2 tabular-nums whitespace-nowrap">{time}</span>
                <span className="min-w-[3ch] text-right tabular-nums">{std(drink.standards)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {unsynced > 0 && (
        <p className="border-t border-edge px-5 py-3 text-lg text-ink-2">
          {unsynced} saved on this phone, will sync
        </p>
      )}
    </section>
  );
}
