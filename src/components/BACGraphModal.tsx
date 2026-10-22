import type { LoggedDrink } from "~/hooks/useNight";
import { simulateNight } from "~/lib/bac-calculator";
import { Sheet } from "./night/Sheet";
import { TimelineChart } from "./night/TimelineCard";

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
 * The whole night as one picture, in the same glass bottom sheet as everything else: the curve
 * from the first drink to the model's zero, the likely range as a soft band around it (the doubt,
 * never a limit), and each drink as a dot on the curve. No list: Your tab has the drinks.
 */
export function BACGraphModal({ open, onOpenChange, drinks, userWeight, userSex, alert = false }: BACGraphModalProps) {
  const now = new Date();
  const simulation = open && userWeight && userSex ? simulateNight(drinks, userWeight, userSex, now, 1) : null;
  const marks = drinks.filter((d) => d.finishedAt.getTime() <= now.getTime()).map((d) => ({ t: d.finishedAt.getTime(), key: d.id }));

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Tonight"
      description="Estimated blood alcohol from your first drink until it is back to zero, with the likely range around it and each drink as a dot."
    >
      <div className={`${alert ? "tone-alert" : ""} pt-2 pb-2`}>
        {simulation && simulation.samples.length > 1 ? (
          <TimelineChart simulation={simulation} now={now} height={280} axes whole band marks={marks} />
        ) : (
          <p className="text-lg text-ink">Add your weight and a drink to see the curve.</p>
        )}
      </div>
    </Sheet>
  );
}
