import { Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import type { LoggedDrink } from "~/hooks/useNight";
import { useRegion } from "~/hooks/useRegion";
import { drinkLabel, formatStandards } from "~/lib/estimate-display";
import { minutesAgoScale, standardsScale } from "~/lib/log-scale";
import { fromRegionStandards, toRegionStandards } from "~/lib/region";
import { Sheet } from "./Sheet";
import { TimeControl } from "./TimeControl";

interface EditDrinkSheetProps {
  drink: LoggedDrink | null;
  now: Date;
  onClose: () => void;
  onSave: (
    drink: LoggedDrink,
    change: { standards: number; finishedAt: Date },
  ) => void;
}

/**
 * Fix a logged drink: when it was finished, and how many standard drinks it was. The amount
 * stepper walks `standardsScale`: tenths under 2, halves to 10, whole drinks above, so a single
 * nip can be corrected finely while a big night isn't twenty taps away. Its labels say how far.
 */
export function EditDrinkSheet({
  drink,
  now,
  onClose,
  onSave,
}: EditDrinkSheetProps) {
  const { region, std } = useRegion();
  const [minutesAgo, setMinutesAgo] = useState(0);
  const [standards, setStandards] = useState(1);

  useEffect(() => {
    if (!drink) return;
    // Snapped to the time slider's own rungs (1 min near now, coarser further back).
    setMinutesAgo(
      minutesAgoScale.snap(
        (now.getTime() - drink.finishedAt.getTime()) / 60_000,
      ),
    );
    setStandards(drink.standards);
    // Only when a different drink opens: the clock ticking must not reset what's being edited.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drink?.id]);

  // The stepper counts in the region's standard drinks; state stays in stored 10 g standards.
  const shown = toRegionStandards(standards, region);
  const lessBy = -standardsScale.delta(shown, -1);
  const moreBy = standardsScale.delta(shown, 1);
  function step(direction: 1 | -1) {
    setStandards(
      fromRegionStandards(standardsScale.move(shown, direction), region),
    );
  }
  const stepLabel = (d: number, word: string) =>
    `${formatStandards(d)} standard ${d === 1 ? "drink" : "drinks"} ${word}`;

  return (
    <Sheet
      open={!!drink}
      onOpenChange={(o) => !o && onClose()}
      title={drink ? drinkLabel(drink, std) : "Edit drink"}
      description="Change when you finished it or how much it was."
    >
      {drink && (
        <>
          <p className="text-ink-2 text-lg">When you finished it</p>
          <div className="mt-2">
            <TimeControl
              minutesAgo={minutesAgo}
              onChange={setMinutesAgo}
              now={now}
              startOpen
              wrap
            />
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <p className="text-ink-2 text-lg">Standard drinks</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={
                  lessBy === 0
                    ? "Less (at the minimum)"
                    : stepLabel(lessBy, "less")
                }
                disabled={lessBy === 0}
                onClick={() => step(-1)}
                className="press grid size-12 place-items-center rounded-full bg-white/10 disabled:opacity-40"
              >
                <Minus
                  aria-hidden="true"
                  className="size-5"
                  strokeWidth={2.25}
                />
              </button>
              <span
                className="w-14 text-center text-xl font-medium tabular-nums"
                aria-live="polite"
              >
                {std(standards)}
              </span>
              <button
                type="button"
                aria-label={
                  moreBy === 0
                    ? "More (at the maximum)"
                    : stepLabel(moreBy, "more")
                }
                disabled={moreBy === 0}
                onClick={() => step(1)}
                className="press grid size-12 place-items-center rounded-full bg-white/10 disabled:opacity-40"
              >
                <Plus
                  aria-hidden="true"
                  className="size-5"
                  strokeWidth={2.25}
                />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              onSave(drink, {
                standards,
                finishedAt: new Date(now.getTime() - minutesAgo * 60_000),
              })
            }
            className="press key-glow bg-ink text-bg mt-6 flex min-h-16 w-full items-center justify-center rounded-full text-xl font-medium"
          >
            Save
          </button>
        </>
      )}
    </Sheet>
  );
}
