import { Pencil } from "lucide-react";
import { useEffect, useState } from "react";

import type { LoggedDrink } from "~/hooks/useNight";
import { Held } from "~/hooks/usePresence";
import { useRegion } from "~/hooks/useRegion";
import { simulateNight } from "~/lib/bac-calculator";
import { drinkLabel } from "~/lib/estimate-display";
import { formatClock } from "~/lib/format-clock";
import { TimelineChart } from "./night/TimelineCard";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";

interface BACGraphModalProps {
  /** The screen is red (the shown number is 0.05 or more): the curve takes the alert colour too. */
  alert?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drinks: LoggedDrink[];
  userWeight: number | null;
  userSex: string | null;
  /** Change a drink picked here (opens the Change sheet). */
  onEditDrink?: (drink: LoggedDrink) => void;
}

/**
 * The whole night as a story: the curve from the first drink to the model's zero, the likely range
 * as a soft band around it (the doubt, never a limit), and each drink as a dot on the curve. The
 * drinks are listed under it; picking one marks its dot and time and offers Change, so "why did it
 * jump here?" is answered on the graph itself.
 */
export function BACGraphModal({ open, onOpenChange, drinks, userWeight, userSex, alert = false, onEditDrink }: BACGraphModalProps) {
  const { std } = useRegion();
  const [selected, setSelected] = useState<string | null>(null);
  const now = new Date();
  const simulation = open && userWeight && userSex ? simulateNight(drinks, userWeight, userSex, now, 1) : null;
  const counted = drinks.filter((d) => d.finishedAt.getTime() <= now.getTime()).sort((a, b) => a.finishedAt.getTime() - b.finishedAt.getTime());
  const marks = counted.map((d) => ({ t: d.finishedAt.getTime(), key: d.id }));

  useEffect(() => {
    if (open) setSelected(null);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={`${alert ? "tone-alert" : ""} fixed top-1/2 left-1/2 z-[130] mx-auto flex max-h-[92dvh] w-[94vw] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-panel border-0 bg-surface p-0`}
      >
        <DialogHeader className="px-6 pt-6 pb-2 text-left sm:text-left">
          <DialogTitle className="text-2xl font-semibold tracking-[-0.02em] text-ink">Tonight</DialogTitle>
          <DialogDescription className="sr-only">
            Estimated blood alcohol from your first drink until it is back to zero, with the likely range around it and each drink marked.
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-6 pb-6">
          {/* While the dialog leaves it keeps showing the curve it had, not the empty-state line. */}
          <Held open={open}>
            {simulation && simulation.samples.length > 1 ? (
              <TimelineChart simulation={simulation} now={now} height={240} axes whole band marks={marks} selected={selected} />
            ) : (
              <p className="text-lg text-ink">Add your weight and a drink to see the curve.</p>
            )}
          </Held>

          {counted.length > 0 && (
            <ul aria-label="Drinks" className="flex flex-col gap-1">
              {[...counted].reverse().map((d) => {
                const on = d.id === selected;
                return (
                  <li key={d.id} className={`flex flex-col rounded-row ${on ? "bg-white/[0.1] pb-2" : ""}`}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => setSelected(on ? null : d.id)}
                      className="press flex min-h-14 w-full items-center gap-3 rounded-row px-3 text-left text-lg"
                    >
                      <span className="shrink-0 text-ink-2 tabular-nums whitespace-nowrap">{formatClock(d.finishedAt)}</span>
                      <span className="min-w-0 flex-1 truncate font-medium">{drinkLabel(d, std)}</span>
                      <span className="shrink-0 tabular-nums">{std(d.standards)}</span>
                    </button>
                    {on && onEditDrink && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenChange(false);
                          onEditDrink(d);
                        }}
                        className="press mx-2 flex min-h-12 items-center justify-center gap-2 rounded-key bg-white/[0.12] px-4 text-lg font-medium hover:bg-white/[0.16]"
                      >
                        <Pencil aria-hidden="true" className="size-4" strokeWidth={2.25} />
                        Change this drink
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <button
            type="button"
            className="press min-h-14 w-full rounded-key bg-white/10 text-lg font-medium text-ink hover:bg-white/15"
            onClick={() => onOpenChange(false)}
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
