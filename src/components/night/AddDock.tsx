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
  | { kind: "added"; drink: LoggedDrink; at: number; count: number }
  | { kind: "removed"; drink: LoggedDrink; at: number; count: number };

// Undo stays on screen this long after an add or remove (the skill's floor is 10 s).
export const UNDO_WINDOW_MS = 2 * 60 * 1000;

interface AddDockProps {
  /** The drink "Add another" repeats: the last one added, else the most recent. */
  repeat: QuickDrink | null;
  recents: QuickDrink[];
  lastDrink: LoggedDrink | null;
  notice: Notice | null;
  now: Date;
  onAdd: (drink: QuickDrink) => void;
  onOpenAdd: () => void;
  onUndo: () => void;
}

/**
 * The bottom dock, like an app's: always in the same place under the thumb. Top to bottom: what
 * just happened (with Undo / Add back), the one-tap repeat, recents and "New drink". On short
 * screens the recents row folds into a single "New drink" button (see globals.css) so the
 * estimate stays in view.
 */
export function AddDock({ repeat, recents, lastDrink, notice, now, onAdd, onOpenAdd, onUndo }: AddDockProps) {
  const { std } = useRegion();
  const live = notice && now.getTime() - notice.at < UNDO_WINDOW_MS ? notice : null;
  const shortcuts = recents.slice(0, 2);

  let status: React.ReactNode;
  if (live) {
    status = (
      <>
        <span className="font-bold">{live.kind === "added" ? "Added " : "Removed "}</span>
        {drinkLabel(live.drink, std)}
        {live.count > 1 && <span className="font-bold"> ×{live.count}</span>}
      </>
    );
  } else if (lastDrink) {
    status = (
      <span className="font-medium text-ink-2">
        Last: <span className="font-semibold text-ink">{drinkLabel(lastDrink, std)}</span> ·{" "}
        {timeAgo(lastDrink.finishedAt, now)}
      </span>
    );
  } else {
    status = <span className="font-medium text-ink-2">Nothing added yet tonight</span>;
  }

  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-col gap-3 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className={`flex min-h-16 items-center gap-3 rounded-2xl px-4 ${live ? "bg-surface-3" : "bg-surface"}`}>
        {/* One persistent live region: screen readers announce text changes, not remounts. */}
        <p aria-live="polite" className="min-w-0 flex-1 truncate text-lg text-ink">
          <span key={live?.at ?? "idle"} className="snack inline">
            {status}
          </span>
        </p>
        {live && (
          <button
            type="button"
            onClick={onUndo}
            className="press min-h-12 shrink-0 rounded-xl bg-bg px-4 text-lg font-bold text-ink active:bg-surface"
          >
            {live.kind === "added" ? (live.count > 1 ? "Undo one" : "Undo") : "Add back"}
          </button>
        )}
      </div>

      {repeat ? (
        <button
          type="button"
          onClick={() => onAdd(repeat)}
          className="press dock-primary mt-2 flex min-h-24 w-full items-center gap-4 rounded-[28px] bg-amber px-5 text-left text-bg active:bg-amber-press"
        >
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-bg/10">
            <DrinkIcon kind={drinkKind(repeat)} className="size-8" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[26px] leading-tight font-bold whitespace-nowrap">
              {lastDrink ? "+ Add another" : "+ Add"}
            </span>
            <span className="block truncate text-lg font-semibold">
              {drinkLabel(repeat, std)} · {std(repeat.standards)} std
            </span>
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onOpenAdd}
          className="press dock-primary mt-2 flex min-h-24 w-full items-center gap-4 rounded-[28px] bg-amber px-5 text-left text-[26px] font-bold text-bg active:bg-amber-press"
        >
          + Add a drink
        </button>
      )}

      {repeat && (
        <div className="dock-recents grid grid-cols-2 gap-3">
          {shortcuts.map((drink) => (
            <button
              key={`${drink.name ?? ""}|${drink.standards}`}
              type="button"
              onClick={() => onAdd(drink)}
              className="press flex min-h-[72px] items-center gap-3 rounded-2xl bg-surface-3 px-3 py-2 text-left text-ink active:bg-line"
            >
              <DrinkIcon kind={drinkKind(drink)} className="size-6" />
              <span className="min-w-0">
                <span className="line-clamp-2 text-lg leading-tight font-bold">{drinkLabel(drink, std)}</span>
                <span className="block text-base font-medium text-ink-2 tabular-nums">{std(drink.standards)} std</span>
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={onOpenAdd}
            className={`press flex items-center justify-center rounded-2xl bg-surface-3 px-3 text-lg font-bold text-ink active:bg-line ${
              shortcuts.length % 2 === 0 ? "col-span-2 min-h-14" : "min-h-[72px]"
            }`}
          >
            + New drink
          </button>
        </div>
      )}
      {repeat && (
        <button
          type="button"
          onClick={onOpenAdd}
          className="press dock-new-compact hidden min-h-14 items-center justify-center rounded-2xl bg-surface-3 text-lg font-bold text-ink active:bg-line"
        >
          + New drink
        </button>
      )}
    </div>
  );
}
