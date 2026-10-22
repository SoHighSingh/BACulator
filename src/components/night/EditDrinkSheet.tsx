import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import type { DrinkChange, LoggedDrink } from "~/hooks/useNight";
import { useRegion } from "~/hooks/useRegion";
import { drinkLabel } from "~/lib/estimate-display";
import { formatClock } from "~/lib/format-clock";
import { editChange } from "~/lib/night-model";
import { PRIMARY, STICKY } from "./AddSheet";
import { AmountControl } from "./add/AmountControl";
import { StepTabs, type Step } from "./add/StepTabs";
import { WhenControl } from "./add/WhenControl";
import { Sheet } from "./Sheet";

interface EditDrinkSheetProps {
  drink: LoggedDrink | null;
  now: Date;
  onClose: () => void;
  /** Only what changed; null when nothing did. */
  onSave: (drink: LoggedDrink, change: DrinkChange | null) => void;
  /** Removes the drink (with Undo in the dock). */
  onRemove?: (drink: LoggedDrink) => void;
}

/**
 * Change a logged drink with the same two controls as adding one: how much, and when. It opens on
 * the drink's own amount and exact time; the time moves only if the person touches it, and only
 * what changed is saved. Remove lives here, at the bottom, away from Save.
 */
export function EditDrinkSheet({ drink, now, onClose, onSave, onRemove }: EditDrinkSheetProps) {
  const { std } = useRegion();
  const [step, setStep] = useState<Step>("amount");
  const [standards, setStandards] = useState(1);
  const [minutesAgo, setMinutesAgo] = useState(0);
  const [timeTouched, setTimeTouched] = useState(false);
  const [openedAt, setOpenedAt] = useState(now);

  useEffect(() => {
    if (!drink) return;
    const at = new Date();
    setOpenedAt(at);
    setStep("amount");
    setStandards(drink.standards);
    // Exact, seconds and all: saving an untouched time must not move the drink at all.
    setMinutesAgo(Math.max(0, (at.getTime() - drink.finishedAt.getTime()) / 60_000));
    setTimeTouched(false);
    // Only when a different drink opens: the clock ticking must not reset what's being changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drink?.id]);

  const change = drink ? editChange(drink, { standards, minutesAgo }, timeTouched, openedAt) : null;

  return (
    <Sheet
      open={!!drink}
      onOpenChange={(o) => !o && onClose()}
      title={drink ? `Change ${drinkLabel(drink, std)}` : "Change drink"}
      description="Change how much it was or when you finished it, then save."
    >
      {drink && (
        <div className="flex min-h-full flex-col gap-5 pt-1">
          <p className="-mt-1 px-1 text-lg text-ink-2 tabular-nums">
            Logged {std(drink.standards)} std at {formatClock(drink.finishedAt)}
          </p>
          <StepTabs step={step} onStep={setStep} />

          {step === "amount" ? (
            <div key="amount" className="compose-in">
              <AmountControl standards={standards} onChange={setStandards} onEnter={() => setStep("when")} />
            </div>
          ) : (
            <div key="when" className="compose-in">
              <WhenControl
                minutesAgo={minutesAgo}
                onChange={(m) => {
                  setMinutesAgo(m);
                  setTimeTouched(true);
                }}
                now={openedAt}
              />
            </div>
          )}

          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(drink)}
              className="press mt-4 flex min-h-12 w-fit items-center gap-2 self-center rounded-key px-4 text-lg font-medium text-ink-2 hover:bg-white/[0.06]"
            >
              <Trash2 aria-hidden="true" className="size-5" strokeWidth={2.25} />
              Remove drink
            </button>
          )}

          <div className={STICKY}>
            <button
              type="button"
              disabled={!change}
              onClick={() => onSave(drink, change)}
              className={change ? PRIMARY : "flex min-h-16 w-full items-center justify-center rounded-primary bg-white/[0.08] text-xl font-medium text-ink-2"}
            >
              {change ? "Save" : "No changes"}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
