import { useRegion } from "~/hooks/useRegion";
import { drinkLabel } from "~/lib/estimate-display";

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

/**
 * The night screen's main job, in the thumb zone: "Same again" as one big amber slab with the real
 * drink and its standard drinks, recents underneath, anything else in the sheet.
 */
export function QuickAdd({ sameAgain, recents, disabled, onQuickAdd, onOpenAdd }: QuickAddProps) {
  const { std } = useRegion();

  return (
    <section aria-label="Add a drink" className="flex flex-col gap-3">
      {sameAgain ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onQuickAdd(sameAgain)}
          className="flex min-h-[120px] w-full items-end justify-between gap-4 rounded-3xl bg-amber px-5 py-4 text-left text-bg active:bg-amber-press disabled:opacity-60"
        >
          <span className="min-w-0">
            <span className="block text-[26px] leading-tight font-bold">Same again</span>
            <span className="block text-lg leading-snug font-semibold">{drinkLabel(sameAgain, std)}</span>
          </span>
          <span className="shrink-0 text-right">
            <span className="block text-[40px] leading-none font-bold tabular-nums">{std(sameAgain.standards)}</span>
            <span className="block text-base font-semibold">std</span>
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onOpenAdd}
          className="min-h-[120px] w-full rounded-3xl bg-amber px-5 text-left text-[26px] font-bold text-bg active:bg-amber-press"
        >
          Add a drink
        </button>
      )}

      <div className="grid grid-cols-2 gap-3">
        {recents.map((drink) => (
          <button
            key={`${drink.name ?? ""}|${drink.standards}`}
            type="button"
            disabled={disabled}
            onClick={() => onQuickAdd(drink)}
            className="flex min-h-[72px] flex-col justify-between rounded-2xl bg-surface-2 px-4 py-3 text-left text-ink active:bg-surface-3 disabled:opacity-60"
          >
            <span className="block text-lg leading-snug font-semibold">{drinkLabel(drink, std)}</span>
            <span className="block text-base font-medium text-ink-2 tabular-nums">{std(drink.standards)} std</span>
          </button>
        ))}
        {sameAgain && (
          <button
            type="button"
            onClick={onOpenAdd}
            className={`min-h-[72px] rounded-2xl bg-surface-2 px-4 text-left text-lg font-semibold text-ink active:bg-surface-3 ${
              recents.length % 2 === 0 ? "col-span-2" : ""
            }`}
          >
            + Add a different drink
          </button>
        )}
      </div>
    </section>
  );
}
