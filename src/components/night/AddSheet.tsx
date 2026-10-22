import { ChevronLeft, List, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import type { NewDrink } from "~/hooks/useNight";
import { useRegion } from "~/hooks/useRegion";
import { drinkLabel } from "~/lib/estimate-display";
import { drinkKey } from "~/lib/night-model";
import type { QuickDrink } from "./AddDock";
import { AmountControl } from "./add/AmountControl";
import { DrinkPicker, ICON_TILE, toSheetTop, type Picked } from "./add/DrinkPicker";
import { StepTabs, type Step } from "./add/StepTabs";
import { WhenControl } from "./add/WhenControl";
import { DrinkIcon, drinkKind } from "./DrinkIcon";
import { Sheet } from "./Sheet";

interface AddSheetProps {
  open: boolean;
  onClose: () => void;
  now: Date;
  /** Adds optimistically and returns at once; false if it was swallowed as a double tap. */
  onAdd: (drink: NewDrink) => boolean;
  /** Drinks from earlier tonight or nights before, the last one first. */
  recents?: QuickDrink[];
  /** A recent's "Add now" key: logs it at now in one tap. */
  onAddRecent?: (drink: QuickDrink) => void;
}

/** What the amount is called, while it still matches what was picked. */
type Named = Omit<Picked, "standards"> & { standards: number; source: "recent" | "manual" };

export const PRIMARY = "press key-glow flex min-h-16 w-full items-center justify-center gap-2 rounded-primary bg-ink text-xl font-medium text-bg disabled:opacity-40";
/** The sticky key at the bottom of a sheet, over a fade so the content scrolls under it. */
export const STICKY = "sticky -bottom-5 -mx-5 mt-auto -mb-5 bg-gradient-to-t from-[var(--glass-strong)] from-70% to-transparent px-5 pt-4 pb-5";

/**
 * Add a drink in two steps, then Add. How much: a big typeable number, −/+ and a smooth slider,
 * with recent drinks as presets (each with its own "Add now" key, so a repeat is two taps) and the
 * drink list as a calculator. When: a read-out, chips and a smooth slider, now by default. Nothing
 * moves on by itself and nothing is added until Add is tapped.
 */
export function AddSheet({ open, onClose, now, onAdd, recents = [], onAddRecent }: AddSheetProps) {
  const { std } = useRegion();
  const [step, setStep] = useState<Step>("amount");
  const [picking, setPicking] = useState(false);
  const [standards, setStandards] = useState(1);
  const [named, setNamed] = useState<Named | null>(null);
  const [minutesAgo, setMinutesAgo] = useState(0);
  // The time is measured from when the sheet opened, so it doesn't drift while the sheet is up.
  const [openedAt, setOpenedAt] = useState(now);

  // Every open starts on how much, at the last drink's amount, finished now.
  useEffect(() => {
    if (!open) return;
    const last = recents[0];
    setStep("amount");
    setPicking(false);
    setStandards(last?.standards ?? 1);
    setNamed(null);
    setMinutesAgo(0);
    setOpenedAt(new Date());
    // Only on open: recents refreshing mustn't reset what's being chosen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // A name only sticks while the amount is still the one it came with.
  const name = named && Math.abs(named.standards - standards) < 1e-9 ? named : null;
  const label = name ? drinkLabel({ name: name.name, standards }, std) : `${std(standards)} std drink`;

  function choose(p: Named) {
    setStandards(p.standards);
    setNamed(p);
    setPicking(false);
    setStep("when");
  }

  function add() {
    const finishedAt = minutesAgo <= 0 ? new Date() : new Date(openedAt.getTime() - minutesAgo * 60_000);
    const added = onAdd({
      standards,
      finishedAt,
      details: name
        ? {
            name: name.name || undefined,
            volumeMl: name.volumeMl || undefined,
            abv: name.abv || undefined,
            count: name.count || undefined,
            source: name.source,
            confidence: 1,
            rawText: "",
          }
        : { source: "manual", confidence: 1, rawText: "" },
    });
    if (added) onClose();
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Add a drink"
      description="Step 1, how much. Step 2, when. Then add it."
    >
      <div className="flex min-h-full flex-col gap-5 pt-1">
        {!picking && <StepTabs step={step} onStep={setStep} />}

        {picking ? (
          <div key="pick" className="compose-in">
            <DrinkPicker onBack={() => setPicking(false)} onPick={(p) => choose({ ...p, source: "manual" })} />
          </div>
        ) : step === "amount" ? (
          <div key="amount" ref={toSheetTop} className="compose-in flex flex-col gap-5">
            <AmountControl
              standards={standards}
              onChange={(s) => setStandards(s)}
              onEnter={() => setStep("when")}
            />

            {recents.length > 0 && (
              <section aria-labelledby="recent-heading" className="flex flex-col gap-2">
                <h3 id="recent-heading" className="px-1 text-lg font-semibold">
                  Recent
                </h3>
                <ul className="flex flex-col gap-2">
                  {recents.slice(0, 4).map((d) => (
                    <RecentRow
                      key={drinkKey(d)}
                      drink={d}
                      onPick={() =>
                        choose({
                          standards: d.standards,
                          name: d.name ?? "",
                          volumeMl: d.volumeMl ?? 0,
                          abv: d.abv ?? 0,
                          count: d.count ?? 1,
                          source: "recent",
                        })
                      }
                      onAddNow={
                        onAddRecent
                          ? () => {
                              onAddRecent(d);
                              onClose();
                            }
                          : undefined
                      }
                    />
                  ))}
                </ul>
              </section>
            )}

            <button
              type="button"
              onClick={() => setPicking(true)}
              className="press flex min-h-12 items-center justify-center gap-2 rounded-key text-lg font-medium text-ink-2 hover:bg-white/[0.06]"
            >
              <List aria-hidden="true" className="size-5" strokeWidth={2.25} />
              Pick from the drink list
            </button>

            <div className={STICKY}>
              <button type="button" onClick={() => setStep("when")} className={PRIMARY}>
                Next: when
              </button>
            </div>
          </div>
        ) : (
          <div key="when" ref={toSheetTop} className="compose-in flex flex-col gap-5">
            <button
              type="button"
              onClick={() => setStep("amount")}
              className="press -ml-2 flex min-h-12 w-fit max-w-full items-center gap-1 rounded-key pr-4 pl-2 text-lg text-ink-2 hover:bg-white/[0.06]"
            >
              <ChevronLeft aria-hidden="true" className="size-6 shrink-0" strokeWidth={2.25} />
              <span className="truncate">
                <span className="font-medium text-ink tabular-nums">{std(standards)} std</span>
                {name?.name ? ` · ${name.name}` : ""}
              </span>
            </button>

            <WhenControl minutesAgo={minutesAgo} onChange={setMinutesAgo} now={openedAt} />

            <div className={STICKY}>
              <button type="button" onClick={add} className={PRIMARY} aria-label={`Add ${label}`}>
                <Plus aria-hidden="true" className="size-6" strokeWidth={2.5} />
                Add · {std(standards)} std
              </button>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}

/** A recent drink: the row picks it (then when), its "Add now" key logs it at now. */
function RecentRow({ drink, onPick, onAddNow }: { drink: QuickDrink; onPick: () => void; onAddNow?: () => void }) {
  const { std } = useRegion();
  const label = drinkLabel(drink, std);
  return (
    <li className="flex items-center gap-2 rounded-row bg-white/[0.05] pr-2 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]">
      <button
        type="button"
        onClick={onPick}
        aria-label={`${label}, ${std(drink.standards)} standard drinks. Choose when`}
        className="press flex min-h-16 min-w-0 flex-1 items-center gap-3 rounded-l-row py-2 pr-1 pl-3 text-left hover:bg-white/[0.04]"
      >
        <span className={ICON_TILE}>
          <DrinkIcon kind={drinkKind(drink)} className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg leading-snug font-medium">{label}</span>
          <span className="block text-lg leading-snug text-ink-2 tabular-nums">{std(drink.standards)} std</span>
        </span>
      </button>
      {onAddNow && (
        <button
          type="button"
          onClick={onAddNow}
          aria-label={`Add ${label} now`}
          className="press flex min-h-12 shrink-0 items-center gap-1 rounded-key bg-white/[0.1] pr-4 pl-3 text-lg font-medium shadow-[inset_0_0_0_1px_rgb(255_255_255/0.18)] hover:bg-white/15"
        >
          <Plus aria-hidden="true" className="size-5" strokeWidth={2.5} />
          Add now
        </button>
      )}
    </li>
  );
}
