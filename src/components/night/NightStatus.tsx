import { TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { BrandMark } from "~/components/BrandMark";

interface NightStatusProps {
  /** Red: the shown number is 0.05 or more (`NightModel.alert`). The mark's tone and tick follow it. */
  alert: boolean;
  /** The hazard key: the top of the likely range is 0.05 or more (`NightModel.hazard`). */
  hazard: boolean;
  /** True only while a change the person just made flipped `alert`, so the mark's colour only moves then. */
  animate: boolean;
  /** The same, for the key's reveal when `hazard` flips. */
  animateHazard: boolean;
  /** Opens the one sheet about tonight's estimate (the same one the number opens). */
  onOpenDetails: () => void;
}

/**
 * The top-left chrome of the night screen: the mark (its own tile, nothing behind it) and, once the
 * top of the likely range reaches 0.05, a glass hazard key right beside it (user decisions, 18 Oct
 * 2026 late: no words on screen, and nothing here is framed as a driving state; the red field, the
 * red mark with its tick slid right, and this key carry the state, and the key opens the estimate's
 * details). Screen readers get a neutral name and one polite line when the key appears after a
 * change, never on load. The app's name stays in the hidden h1.
 */
export function NightStatus({ alert, hazard, animate, animateHazard, onOpenDetails }: NightStatusProps) {
  const [announce, setAnnounce] = useState("");
  const prev = useRef(hazard);
  useEffect(() => {
    if (hazard && !prev.current) setAnnounce("Estimate details available");
    if (!hazard) setAnnounce("");
    prev.current = hazard;
  }, [hazard]);

  return (
    <div className={`night-status flex h-12 min-w-0 flex-1 items-center gap-2 ${animate ? "is-anim" : ""}`}>
      <h1 className="sr-only">BACulator</h1>
      {/* The mark is its own tile: no glass behind it (user: "no need to double up the logo card"). */}
      <span className="grid size-12 shrink-0 place-items-center" aria-hidden="true">
        <BrandMark size={48} tone={alert ? "alert" : "calm"} />
      </span>
      {hazard && (
        <button
          type="button"
          onClick={onOpenDetails}
          aria-label="Estimate details"
          className={`glass press hazard-key grid size-12 shrink-0 place-items-center rounded-key text-alert ${animateHazard ? "is-anim" : ""}`}
        >
          <TriangleAlert aria-hidden="true" className="size-7" strokeWidth={2.25} />
        </button>
      )}
      <p role="status" className="sr-only">
        {announce}
      </p>
    </div>
  );
}
