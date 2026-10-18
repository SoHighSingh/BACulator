import { Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import type { LoggedDrink } from "~/hooks/useNight";
import { useRegion } from "~/hooks/useRegion";
import { drinkLabel } from "~/lib/estimate-display";
import { fromRegionStandards, toRegionStandards } from "~/lib/region";
import { Sheet } from "./Sheet";
import { MAX_MINUTES_AGO, TimeControl } from "./TimeControl";

interface EditDrinkSheetProps {
  drink: LoggedDrink | null;
  now: Date;
  onClose: () => void;
  onSave: (drink: LoggedDrink, change: { standards: number; finishedAt: Date }) => void;
}

const STEP = 0.5;
const MAX_STANDARDS = 50;

/** Fix a logged drink: when it was finished, and how many standard drinks it was. */
export function EditDrinkSheet({ drink, now, onClose, onSave }: EditDrinkSheetProps) {
  const { region, std } = useRegion();
  const [minutesAgo, setMinutesAgo] = useState(0);
  const [standards, setStandards] = useState(1);

  useEffect(() => {
    if (!drink) return;
    const ago = Math.round((now.getTime() - drink.finishedAt.getTime()) / 60_000 / 5) * 5;
    setMinutesAgo(Math.min(MAX_MINUTES_AGO, Math.max(0, ago)));
    setStandards(drink.standards);
    // Only when a different drink opens: the clock ticking must not reset what's being edited.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drink?.id]);

  // The stepper counts in the region's standard drinks; state stays in stored 10 g standards.
  function step(direction: 1 | -1) {
    const shown = Math.round(toRegionStandards(standards, region) * 10) / 10 + direction * STEP;
    setStandards(Math.min(MAX_STANDARDS, Math.max(fromRegionStandards(STEP, region), fromRegionStandards(shown, region))));
  }

  return (
    <Sheet open={!!drink} onOpenChange={(o) => !o && onClose()} title={drink ? drinkLabel(drink, std) : "Edit drink"} description="Change when you finished it or how much it was.">
      {drink && (
        <>
          <p className="text-lg text-ink-2">When you finished it</p>
          <div className="mt-2">
            <TimeControl minutesAgo={minutesAgo} onChange={setMinutesAgo} now={now} startOpen />
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <p className="text-lg text-ink-2">Standard drinks</p>
            <div className="flex items-center gap-2">
              <button type="button" aria-label="Half a standard drink less" onClick={() => step(-1)} className="press grid size-12 place-items-center rounded-full bg-white/10">
                <Minus aria-hidden="true" className="size-5" strokeWidth={2.25} />
              </button>
              <span className="w-14 text-center text-xl font-medium tabular-nums" aria-live="polite">
                {std(standards)}
              </span>
              <button type="button" aria-label="Half a standard drink more" onClick={() => step(1)} className="press grid size-12 place-items-center rounded-full bg-white/10">
                <Plus aria-hidden="true" className="size-5" strokeWidth={2.25} />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSave(drink, { standards, finishedAt: new Date(now.getTime() - minutesAgo * 60_000) })}
            className="press key-glow mt-6 flex min-h-16 w-full items-center justify-center rounded-full bg-ink text-xl font-medium text-bg"
          >
            Save
          </button>
        </>
      )}
    </Sheet>
  );
}
