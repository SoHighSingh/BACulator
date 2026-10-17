import { useRegion } from "~/hooks/useRegion";
import { drinkLabel } from "~/lib/estimate-display";
import type { LoggedDrink } from "~/hooks/useNight";

interface TonightListProps {
  drinks: LoggedDrink[];
  onRemove: (drink: LoggedDrink) => void;
}

const clock = (date: Date) =>
  date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();

/**
 * The tab: what, how much, when, with the running total where a bar tab puts the price.
 * It is also the morning-after record. Remove lives here, away from the add buttons.
 */
export function TonightList({ drinks, onRemove }: TonightListProps) {
  const { std } = useRegion();
  if (drinks.length === 0) return null;
  const total = drinks.reduce((sum, d) => sum + d.standards, 0);
  const newestFirst = [...drinks].sort((a, b) => b.finishedAt.getTime() - a.finishedAt.getTime());

  return (
    <section aria-labelledby="tonight-heading" className="rounded-[28px] bg-surface px-5 pt-5 pb-3">
      <header className="flex items-end justify-between gap-4">
        <h2 id="tonight-heading" className="text-[22px] font-bold text-ink">
          Your tab
          <span className="block text-base font-medium text-ink-2">Last 24 hours</span>
        </h2>
        <p className="text-right text-ink">
          <span className="block text-[32px] leading-none font-bold tabular-nums">{std(total)}</span>
          <span className="block text-base font-medium text-ink-2">standard drinks</span>
        </p>
      </header>
      <ul className="mt-4 flex flex-col">
        {newestFirst.map((drink) => (
          <li
            key={drink.id}
            className="flex items-center justify-between gap-6 py-3"
          >
            <div className="min-w-0">
              <p className="text-lg font-semibold text-ink">{drinkLabel(drink, std)}</p>
              <p className="text-base text-ink-2 tabular-nums">
                {clock(drink.finishedAt)} · {std(drink.standards)} std
              </p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(drink)}
              aria-label={`Remove ${drinkLabel(drink, std)} at ${clock(drink.finishedAt)}`}
              className="min-h-12 shrink-0 rounded-lg bg-surface-3 px-4 text-base font-semibold text-ink-2 active:bg-line"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
