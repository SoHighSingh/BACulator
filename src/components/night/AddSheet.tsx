import { List, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import type { NewDrink } from "~/hooks/useNight";
import { useRegion } from "~/hooks/useRegion";
import { drinkLabel } from "~/lib/estimate-display";
import { drinkKey } from "~/lib/night-model";
import type { QuickDrink } from "./AddDock";
import { AmountControl } from "./add/AmountControl";
import { DrinkPicker, toSheetTop } from "./add/DrinkPicker";
import { StepTabs, type Step } from "./add/StepTabs";
import { WhenControl } from "./add/WhenControl";
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
  /** Opened from the composer with a drink it read: start on When with that amount and name. */
  prefill?: Prefill | null;
}

/** A drink worked out somewhere else (a recent, the list, typed or said): its amount and what to call it. */
export interface Prefill {
  standards: number;
  details: NonNullable<NewDrink["details"]>;
}

export const PRIMARY = "press key-glow flex min-h-16 w-full items-center justify-center gap-2 rounded-primary bg-ink text-xl font-medium text-bg disabled:opacity-40";
/** The sticky key at the bottom of a sheet, over a fade so the content scrolls under it. */
export const STICKY = "sticky -bottom-5 -mx-5 mt-auto -mb-5 bg-gradient-to-t from-[var(--glass-strong)] from-70% to-transparent px-5 pt-4 pb-5"; // taste-skill-ignore: a neutral scrim, so content scrolls under the key

/**
 * Add a drink in two steps, then Add. How much: a big typeable number, −/+ and a smooth slider,
 * with recent drinks as presets (each with its own "Add now" key, so a repeat is two taps) and the
 * drink list as a calculator. When: a read-out, chips and a smooth slider, now by default. Nothing
 * moves on by itself and nothing is added until Add is tapped.
 */
export function AddSheet({ open, onClose, now, onAdd, recents = [], onAddRecent, prefill = null }: AddSheetProps) {
  const { std } = useRegion();
  const [step, setStep] = useState<Step>("amount");
  const [picking, setPicking] = useState(false);
  const [standards, setStandards] = useState(1);
  const [named, setNamed] = useState<Prefill | null>(null);
  const [minutesAgo, setMinutesAgo] = useState(0);
  // The time is measured from when the sheet opened, so it doesn't drift while the sheet is up.
  const [openedAt, setOpenedAt] = useState(now);

  // Every open starts on how much, at the last drink's amount, finished now.
  useEffect(() => {
    if (!open) return;
    const last = recents[0];
    setStep(prefill ? "when" : "amount");
    setPicking(false);
    setStandards(prefill?.standards ?? last?.standards ?? 1);
    setNamed(prefill);
    setMinutesAgo(0);
    setOpenedAt(new Date());
    // Only on open: recents refreshing mustn't reset what's being chosen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // A name only sticks while the amount is still the one it came with.
  const name = named && Math.abs(named.standards - standards) < 1e-9 ? named : null;
  const label = drinkLabel({ name: name?.details.name, standards }, std);

  /** On to When. The key that did it goes away, so focus goes to the When tab, not the sheet itself. */
  function toWhen() {
    setStep("when");
    requestAnimationFrame(() => document.querySelector<HTMLElement>('[role="dialog"] [aria-current="step"]')?.focus({ preventScroll: true }));
  }

  function choose(p: Prefill) {
    setStandards(p.standards);
    setNamed(p);
    setPicking(false);
    toWhen();
  }

  function add() {
    const finishedAt = minutesAgo <= 0 ? new Date() : new Date(openedAt.getTime() - minutesAgo * 60_000);
    const added = onAdd({
      standards,
      finishedAt,
      details: name ? name.details : { source: "manual", confidence: 1, rawText: "" },
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
            <DrinkPicker onBack={() => setPicking(false)} onPick={(p) =>
                choose({
                  standards: p.standards,
                  details: { name: p.name, volumeMl: p.volumeMl, abv: p.abv, count: p.count, source: "manual", confidence: 1, rawText: "" },
                })
              } />
          </div>
        ) : step === "amount" ? (
          <div key="amount" ref={toSheetTop} className="compose-in flex flex-col gap-5">
            <AmountControl
              standards={standards}
              onChange={(s) => setStandards(s)}
              onEnter={toWhen}
            />

            {recents.length > 0 && (
              <section aria-labelledby="recent-heading" className="flex flex-col gap-2">
                <h3 id="recent-heading" className="px-1 text-lg font-semibold">
                  Recent
                </h3>
                <ul className="flex flex-col gap-2">
                  {recents.slice(0, 3).map((d) => (
                    <RecentRow
                      key={drinkKey(d)}
                      drink={d}
                      onPick={() =>
                        choose({
                          standards: d.standards,
                          details: {
                            name: d.name ?? undefined,
                            volumeMl: d.volumeMl ?? undefined,
                            abv: d.abv ?? undefined,
                            count: d.count ?? undefined,
                            source: "recent",
                            confidence: 1,
                            rawText: "",
                          },
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
              <button type="button" onClick={toWhen} className={PRIMARY}>
                Next: when
              </button>
            </div>
          </div>
        ) : (
          <div key="when" ref={toSheetTop} className="compose-in flex flex-col gap-5">
            {name?.details.name && <p className="truncate px-1 text-lg font-medium">{name.details.name}</p>}

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
    <li className="flex items-center gap-3 rounded-row bg-white/[0.05] pr-2">
      <button
        type="button"
        onClick={onPick}
        aria-label={`${label}, ${std(drink.standards)} standard drinks. Choose when`}
        className="press flex min-h-16 min-w-0 flex-1 items-center justify-between gap-3 rounded-l-row py-2 pl-4 text-left"
      >
        <span className="line-clamp-2 text-lg leading-snug font-medium">{label}</span>
        <span className="shrink-0 text-lg text-ink-2 tabular-nums">{std(drink.standards)}</span>
      </button>
      {onAddNow && (
        <button
          type="button"
          onClick={onAddNow}
          aria-label={`Add ${label} now`}
          className="press flex min-h-12 shrink-0 items-center gap-1 rounded-key bg-white/[0.1] pr-4 pl-3 text-lg font-medium hover:bg-white/15"
        >
          <Plus aria-hidden="true" className="size-5" strokeWidth={2.5} />
          Add now
        </button>
      )}
    </li>
  );
}
