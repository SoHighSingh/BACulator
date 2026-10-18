import { simulateNight } from "~/lib/bac-calculator";
import type { Drink } from "~/types/bac";
import { TimelineChart } from "./night/TimelineCard";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";

interface BACGraphModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drinks: Drink[];
  userWeight: number | null;
  userSex: string | null;
}

/** The bigger curve: same chart as the main screen, with hour labels and the top value. */
export function BACGraphModal({ open, onOpenChange, drinks, userWeight, userSex }: BACGraphModalProps) {
  const now = new Date();
  const simulation = open && userWeight && userSex ? simulateNight(drinks, userWeight, userSex, now) : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next && document.activeElement instanceof HTMLElement) document.activeElement.blur();
      }}
    >
      <DialogContent className="fixed top-1/2 left-1/2 z-[130] mx-auto w-[94vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-panel border-0 bg-surface p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-2xl font-bold text-ink">Tonight&apos;s curve</DialogTitle>
          <DialogDescription className="text-lg text-ink-2">
            Estimated blood alcohol since your first drink, and where it&apos;s heading. Drag across it to see any time.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 px-6 pb-6">
          {simulation && simulation.samples.length > 1 ? (
            <TimelineChart simulation={simulation} now={now} height={300} axes />
          ) : (
            <p className="text-lg text-ink">Add your weight and a drink to see the curve.</p>
          )}
          <button
            type="button"
            className="press mt-2 min-h-14 w-full rounded-key bg-white/10 text-lg font-medium text-ink hover:bg-white/15"
            onClick={() => onOpenChange(false)}
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
