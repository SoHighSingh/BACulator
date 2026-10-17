import { drinkLabel, formatStandards, timeAgo } from "~/lib/estimate-display";
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

/** Answers "did I log that?" at a glance, and makes the last action reversible. */
export function LastAdded({ lastDrink, notice, now, onUndo }: LastAddedProps) {
  const undoable = notice && now.getTime() - notice.at < UNDO_WINDOW_MS ? notice : null;
  if (!lastDrink && !undoable) return null;

  return (
    <section aria-live="polite" className="rounded-2xl border border-line bg-surface p-4">
      {undoable?.kind === "removed" ? (
        <p className="text-lg font-medium text-ink">Removed {drinkLabel(undoable.drink)}</p>
      ) : (
        lastDrink && (
          <p className="text-lg text-ink">
            <span className="font-semibold">Last added: {drinkLabel(lastDrink)}</span>
            <span className="block text-ink-2">
              {formatStandards(lastDrink.standards)} std · {timeAgo(lastDrink.finishedAt, now)}
            </span>
          </p>
        )
      )}
      {undoable && (
        <button
          type="button"
          onClick={onUndo}
          className="mt-3 min-h-14 w-full rounded-xl border border-line bg-surface-2 px-4 text-lg font-semibold text-ink"
        >
          Undo
        </button>
      )}
    </section>
  );
}
