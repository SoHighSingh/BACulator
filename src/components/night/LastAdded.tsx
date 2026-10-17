import { useRegion } from "~/hooks/useRegion";
import { drinkLabel, timeAgo } from "~/lib/estimate-display";
import type { LoggedDrink } from "~/hooks/useNight";

export type Notice =
  | { kind: "added"; drink: LoggedDrink; at: number }
  | { kind: "removed"; drink: LoggedDrink; at: number };

// Undo stays on screen this long after an add or remove (the skill's floor is 10 s).
export const UNDO_WINDOW_MS = 2 * 60 * 1000;

interface LastAddedProps {
  lastDrink: LoggedDrink | null;
  notice: Notice | null;
  now: Date;
  onUndo: () => void;
}

/**
 * Answers "did I log that?" at a glance, and makes the last action reversible. It sits below the
 * add buttons so appearing never pushes them around.
 */
export function LastAdded({ lastDrink, notice, now, onUndo }: LastAddedProps) {
  const { std } = useRegion();
  const undoable = notice && now.getTime() - notice.at < UNDO_WINDOW_MS ? notice : null;
  if (!lastDrink && !undoable) return null;

  return (
    <section aria-live="polite" className="mt-3 flex items-center gap-4 rounded-2xl bg-surface p-4">
      <div className="min-w-0 flex-1">
        {undoable?.kind === "removed" ? (
          <p className="text-lg font-semibold text-ink">Removed {drinkLabel(undoable.drink, std)}</p>
        ) : (
          lastDrink && (
            <p className="text-lg text-ink">
              <span className="block text-base font-medium text-ink-2">Last added</span>
              <span className="block font-semibold">{drinkLabel(lastDrink, std)}</span>
              <span className="block text-ink-2 tabular-nums">
                {std(lastDrink.standards)} std · {timeAgo(lastDrink.finishedAt, now)}
              </span>
            </p>
          )
        )}
      </div>
      {undoable && (
        <button
          type="button"
          onClick={onUndo}
          className="min-h-14 min-w-28 shrink-0 rounded-xl bg-surface-3 px-5 text-lg font-semibold text-ink active:bg-line"
        >
          Undo
        </button>
      )}
    </section>
  );
}
