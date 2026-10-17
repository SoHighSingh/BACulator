import { useRegion } from "~/hooks/useRegion";
import type { LoggedDrink } from "~/hooks/useNight";
import { drinkLabel, timeAgo } from "~/lib/estimate-display";
import { DrinkIcon, drinkKind } from "./DrinkIcon";

export interface QuickDrink {
  standards: number;
  name: string | null;
  volumeMl: number | null;
  abv: number | null;
  count: number | null;
}

export type Notice =
  | { kind: "added"; drink: LoggedDrink; at: number }
  | { kind: "removed"; drink: LoggedDrink; at: number };

// Undo stays on screen this long after an add or remove (the skill's floor is 10 s).
export const UNDO_WINDOW_MS = 2 * 60 * 1000;

interface AddDockProps {
  /** The drink "Add another" repeats: the last one added, else the most recent. */
  repeat: QuickDrink | null;
  recents: QuickDrink[];
  lastDrink: LoggedDrink | null;
  notice: Notice | null;
  now: Date;
  busy: boolean;
  onAdd: (drink: QuickDrink) => void;
  onOpenAdd: () => void;
  onUndo: () => void;
}

/**
 * The bottom dock, like an app's: always in the same place under the thumb. Top to bottom: what
 * just happened (with Undo / Add back), the one-tap repeat, recents and "New drink".
 */
export function AddDock({ repeat, recents, lastDrink, notice, now, busy, onAdd, onOpenAdd, onUndo }: AddDockProps) {
  const { std } = useRegion();
  const live = notice && now.getTime() - notice.at < UNDO_WINDOW_MS ? notice : null;
  const shortcuts = recents.slice(0, 2);

  return (
    <div className="dock pointer-events-auto mx-auto flex w-full max-w-[480px] flex-col gap-3 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div
        key={live ? live.at : "idle"}
        aria-live="polite"
        className={`snack flex min-h-16 items-center gap-3 rounded-2xl px-4 ${live ? "bg-surface-3" : "bg-surface"}`}
      >
        <p className="min-w-0 flex-1 truncate text-lg text-ink">
          {live?.kind === "added" && (
            <>
              <span className="font-bold">Added </span>
              {drinkLabel(live.drink, std)}
            </>
          )}
          {live?.kind === "removed" && (
            <>
              <span className="font-bold">Removed </span>
              {drinkLabel(live.drink, std)}
            </>
          )}
          {!live && lastDrink && (
            <span className="text-ink-2">
              Last: <span className="font-semibold text-ink">{drinkLabel(lastDrink, std)}</span> · {timeAgo(lastDrink.finishedAt, now)}
            </span>
          )}
          {!live && !lastDrink && <span className="text-ink-2">Nothing added yet tonight</span>}
        </p>
        {live && (
          <button
            type="button"
            onClick={onUndo}
            className="press min-h-12 shrink-0 rounded-xl bg-bg px-4 text-lg font-bold text-ink active:bg-surface"
          >
            {live.kind === "added" ? "Undo" : "Add back"}
          </button>
        )}
      </div>

      {repeat ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onAdd(repeat)}
          className="press mt-2 flex min-h-24 w-full items-center gap-4 rounded-[28px] bg-amber px-5 text-left text-bg active:bg-amber-press disabled:opacity-60"
        >
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-bg/10">
            <DrinkIcon kind={drinkKind(repeat)} className="size-9" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[26px] leading-tight font-bold">{lastDrink ? "+ Add another" : "+ Add"}</span>
            <span className="block truncate text-lg font-semibold">
              {drinkLabel(repeat, std)} · {std(repeat.standards)} std
            </span>
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onOpenAdd}
          className="press mt-2 flex min-h-24 w-full items-center gap-4 rounded-[28px] bg-amber px-5 text-left text-[26px] font-bold text-bg active:bg-amber-press"
        >
          + Add a drink
        </button>
      )}

      {repeat && (
        <div className="grid grid-cols-3 gap-3">
          {shortcuts.map((drink) => (
            <button
              key={`${drink.name ?? ""}|${drink.standards}`}
              type="button"
              disabled={busy}
              onClick={() => onAdd(drink)}
              className="press flex min-h-[72px] flex-col items-start justify-center gap-1 rounded-2xl bg-surface-2 px-3 py-2 text-left text-ink active:bg-surface-3 disabled:opacity-60"
            >
              <span className="flex items-start gap-1.5">
                <DrinkIcon kind={drinkKind(drink)} className="mt-0.5 size-5" />
                <span className="line-clamp-2 text-base leading-tight font-bold">{drinkLabel(drink, std)}</span>
              </span>
              <span className="pl-[26px] text-base font-medium text-ink-2 tabular-nums">{std(drink.standards)} std</span>
            </button>
          ))}
          <button
            type="button"
            onClick={onOpenAdd}
            className={`press flex min-h-[72px] items-center justify-center rounded-2xl bg-surface-2 px-3 text-lg font-bold text-ink active:bg-surface-3 ${
              shortcuts.length === 0 ? "col-span-3" : shortcuts.length === 1 ? "col-span-2" : ""
            }`}
          >
            + New drink
          </button>
        </div>
      )}
    </div>
  );
}
