import { useEffect, useState } from "react";

import { BrandMark } from "~/components/BrandMark";

const WORD = "Not safe to drive";

/**
 * The top-left chrome of the night screen: the mark, which opens into the "Not safe to drive" pill
 * whenever a drink is counted. The mark turns red and stays as the pill's leading glyph; its tile
 * extends to the right to show the words. One glass element for the whole night, fixed at the left,
 * so it never appears, swaps or moves on scroll; calm, it is clipped down to the mark's tile
 * (`.night-status` in globals.css). `animate` is true only while a change the person just made is
 * settling, so the motion answers the tap and nothing plays on load. Screen readers get the name from
 * the hidden h1 and the status from the live region, never the mark's label twice.
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
        className={`night-status glass glass-strong absolute top-0 left-0 flex h-12 items-center ${alert ? "is-alert" : ""} ${animate ? "is-anim" : ""}`}
      >
        <span className="grid size-12 shrink-0 place-items-center" aria-hidden="true">
          <BrandMark size={44} tone={alert ? "alert" : "calm"} />
        </span>
        {/* Mark → words 10px, words → edge 16px. */}
        <p role="status" className="night-status-word pr-4 pl-1.5 text-lg font-semibold whitespace-nowrap">
          {word ? WORD : null}
        </p>
      </div>
    </div>
  );
}
