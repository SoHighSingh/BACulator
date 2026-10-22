import { X } from "lucide-react";
import { useRef } from "react";

import type { LoggedDrink } from "~/hooks/useNight";
import { Held } from "~/hooks/usePresence";
import { simulateNight } from "~/lib/bac-calculator";
import { TimelineChart } from "./night/TimelineCard";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";

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
 * The whole night as one picture, on a centred glass card made of the same material as the sheets
 * (glass-strong, the 28px panel radius, the sheets' header and close key): the curve from the first
 * drink to the model's zero, the likely range as a soft band around it (the doubt, never a limit),
 * and each drink as a dot on the curve. No list: Your tab has the drinks.
 */
export function BACGraphModal({ open, onOpenChange, drinks, userWeight, userSex, alert = false }: BACGraphModalProps) {
  const now = new Date();
  const simulation = open && userWeight && userSex ? simulateNight(drinks, userWeight, userSex, now, 1) : null;
  // Opened from state, not a Trigger: hand focus back to what opened it, as Sheet does.
  const opener = useRef<HTMLElement | null>(null);
  const marks = drinks.filter((d) => d.finishedAt.getTime() <= now.getTime()).map((d) => ({ t: d.finishedAt.getTime(), key: d.id }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        onOpenAutoFocus={() => {
          opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        }}
        onCloseAutoFocus={(e) => {
          const el = opener.current;
          opener.current = null;
          if (!el?.isConnected || el === document.body) return;
          e.preventDefault();
          el.focus({ preventScroll: true });
        }}
        className={`${alert ? "tone-alert" : ""} glass glass-strong app-shell z-[130] block w-[94vw] max-w-lg gap-0 border-0 bg-transparent p-0 text-ink shadow-none`}
      >
        <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
          <DialogTitle className="text-[22px] font-semibold tracking-[-0.02em]">Tonight</DialogTitle>
          <DialogClose aria-label="Close" className="press grid size-12 place-items-center rounded-key bg-white/10 hover:bg-white/15">
            <X aria-hidden="true" className="size-5" strokeWidth={2.25} />
          </DialogClose>
        </header>
        <DialogDescription className="sr-only">
          Estimated blood alcohol from your first drink until it is back to zero, with the likely range around it and each drink as a dot.
        </DialogDescription>
        <div className="px-5 pt-2 pb-5">
          {/* While the card leaves it keeps showing the curve it had, not the empty-state line. */}
          <Held open={open}>
            {simulation && simulation.samples.length > 1 ? (
              <TimelineChart simulation={simulation} now={now} height={280} axes whole band marks={marks} />
            ) : (
              <p className="text-lg text-ink">Add your weight and a drink to see the curve.</p>
            )}
          </Held>
        </div>
      </DialogContent>
    </Dialog>
  );
}
