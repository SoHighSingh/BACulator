import { drinkLabel, formatStandards } from "~/lib/estimate-display";

export interface QuickDrink {
  standards: number;
  name: string | null;
  volumeMl: number | null;
  abv: number | null;
  count: number | null;
}

interface QuickAddProps {
  sameAgain: QuickDrink | null;
  recents: QuickDrink[];
  disabled: boolean;
  onQuickAdd: (drink: QuickDrink) => void;
  onOpenAdd: () => void;
}

/** The night screen's main job: "same again" in one tap, recents in one tap, anything else in the sheet. */
export function QuickAdd({ sameAgain, recents, disabled, onQuickAdd, onOpenAdd }: QuickAddProps) {
  return (
    <section aria-label="Add a drink" className="flex flex-col gap-3">
      {sameAgain ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onQuickAdd(sameAgain)}
          className="min-h-[72px] w-full rounded-2xl bg-amber px-5 text-left text-bg disabled:opacity-60"
        >
          <span className="block text-xl font-semibold">Same again</span>
          <span className="block text-lg font-medium">
            {drinkLabel(sameAgain)} · {formatStandards(sameAgain.standards)} std
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onOpenAdd}
          className="min-h-[72px] w-full rounded-2xl bg-amber px-5 text-xl font-semibold text-bg"
        >
          Add a drink
        </button>
      )}

      {recents.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {recents.map((drink) => (
            <button
              key={`${drink.name ?? ""}|${drink.standards}`}
              type="button"
              disabled={disabled}
              onClick={() => onQuickAdd(drink)}
              className="min-h-16 rounded-xl border border-line bg-surface-2 px-3 py-2 text-left text-ink disabled:opacity-60"
            >
              <span className="block text-lg leading-snug font-semibold">{drinkLabel(drink)}</span>
              <span className="block text-base text-ink-2">{formatStandards(drink.standards)} std</span>
            </button>
          ))}
        </div>
      )}

      {sameAgain && (
        <button
          type="button"
          onClick={onOpenAdd}
          className="min-h-14 w-full rounded-xl border border-line bg-surface-2 px-4 text-lg font-semibold text-ink"
        >
          Add a different drink
        </button>
      )}
    </section>
  );
}
