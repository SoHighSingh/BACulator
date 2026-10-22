import type { LoggedDrink } from "~/hooks/useNight";
import { Held } from "~/hooks/usePresence";
import { simulateNight } from "~/lib/bac-calculator";
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
}

/**
 * The whole night as one picture: the curve from the first drink to the model's zero, the likely
 * range as a soft band around it (the doubt, never a limit), and each drink as a dot on the curve,
 * so "why did it jump here?" is answered on the graph itself. No list: Your tab has the drinks.
 */
export function BACGraphModal({ open, onOpenChange, drinks, userWeight, userSex, alert = false }: BACGraphModalProps) {
  const now = new Date();
  const simulation = open && userWeight && userSex ? simulateNight(drinks, userWeight, userSex, now, 1) : null;
  const marks = drinks.filter((d) => d.finishedAt.getTime() <= now.getTime()).map((d) => ({ t: d.finishedAt.getTime(), key: d.id }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={`${alert ? "tone-alert" : ""} fixed top-1/2 left-1/2 z-[130] mx-auto flex max-h-[92dvh] w-[94vw] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-panel border-0 bg-surface p-0`}
      >
        <DialogHeader className="px-6 pt-6 pb-2 text-left sm:text-left">
          <DialogTitle className="text-2xl font-semibold tracking-[-0.02em] text-ink">Tonight</DialogTitle>
          <DialogDescription className="sr-only">
            Estimated blood alcohol from your first drink until it is back to zero, with the likely range around it and each drink as a dot.
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-6 pb-6">
          {/* While the dialog leaves it keeps showing the curve it had, not the empty-state line. */}
          <Held open={open}>
            {simulation && simulation.samples.length > 1 ? (
              <TimelineChart simulation={simulation} now={now} height={280} axes whole band marks={marks} />
            ) : (
              <p className="text-lg text-ink">Add your weight and a drink to see the curve.</p>
            )}
          </Held>
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
