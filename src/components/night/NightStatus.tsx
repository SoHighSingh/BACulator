import { useEffect, useState } from "react";

import { BrandMark } from "~/components/BrandMark";
import { WarningMark } from "./WarningMark";

const WORD = "Not safe to drive";

/**
 * The top-left chrome of the night screen: the mark, which becomes the "Not safe to drive" pill
 * whenever a drink is counted. One glass element for the whole night, fixed at the left, so it never
 * appears, swaps or moves on scroll; calm, it is clipped down to the mark's tile (`.night-status` in
 * globals.css). `animate` is true only while a change the person just made is settling, so the
 * morph answers the tap and nothing plays on load. Screen readers get the name from the hidden h1
 * and the status from the live region, never the mark's label twice.
 */
export function NightStatus({ alert, animate }: { alert: boolean; animate: boolean }) {
  // Keep the words in the DOM while they fade out, then drop them so they are never read when calm.
  const [word, setWord] = useState(alert);
  useEffect(() => {
    if (alert) {
      setWord(true);
      return;
    }
    const t = setTimeout(() => setWord(false), animate ? 400 : 0);
    return () => clearTimeout(t);
  }, [alert, animate]);

  return (
    <div className="relative h-12 min-w-0 flex-1">
      <h1 className="sr-only">BACulator</h1>
      <div
        data-status
        className={`night-status glass glass-strong absolute top-0 left-0 flex h-12 items-center rounded-full ${alert ? "is-alert" : ""} ${animate ? "is-anim" : ""}`}
      >
        <span className="relative size-12 shrink-0" aria-hidden="true">
          <span className="night-status-mark absolute inset-0 grid place-items-center">
            <BrandMark size={44} tone={alert ? "alert" : "calm"} />
          </span>
          {/* The disc is the tile, folded: equal 8px inset on the top, left and bottom of the pill. */}
          <span className="night-status-disc absolute top-2 left-2 grid size-8 place-items-center rounded-full bg-[rgb(255_164_148/0.12)] shadow-[inset_0_0_0_1px_rgb(255_164_148/0.28)]">
            <WarningMark className="size-[18px] text-alert" />
          </span>
        </span>
        {/* Disc → words 10px (8px slot remainder + 2px), words → edge 16px. */}
        <p role="status" className="night-status-word pr-4 pl-0.5 text-lg font-semibold whitespace-nowrap">
          {word ? WORD : null}
        </p>
      </div>
    </div>
  );
}
