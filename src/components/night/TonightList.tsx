import { drinkLabel, formatStandards } from "~/lib/estimate-display";
import type { LoggedDrink } from "~/hooks/useNight";

interface TonightListProps {
  drinks: LoggedDrink[];
  onRemove: (drink: LoggedDrink) => void;
}

const clock = (date: Date) =>
  date.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();

/** The morning-after record: what, how much, when. Remove lives here, away from the add buttons. */
export function TonightList({ drinks, onRemove }: TonightListProps) {
  if (drinks.length === 0) return null;
  const total = drinks.reduce((sum, d) => sum + d.standards, 0);
  const newestFirst = [...drinks].sort((a, b) => b.finishedAt.getTime() - a.finishedAt.getTime());

  return (
    <section aria-labelledby="tonight-heading" className="rounded-2xl bg-surface p-5">
      <h2 id="tonight-heading" className="text-xl font-semibold text-ink">
        Last 24 hours · {formatStandards(total)} standard drinks
      </h2>
      <ul className="mt-3 divide-y divide-line/40">
        {newestFirst.map((drink) => (
          <li key={drink.id} className="flex items-center justify-between gap-6 py-3">
            <div className="min-w-0">
              <p className="text-lg font-medium text-ink">{drinkLabel(drink)}</p>
              <p className="text-base text-ink-2">
                {formatStandards(drink.standards)} std · {clock(drink.finishedAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(drink)}
              aria-label={`Remove ${drinkLabel(drink)} at ${clock(drink.finishedAt)}`}
              className="min-h-12 shrink-0 rounded-lg border border-line px-4 text-base font-medium text-ink-2"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
