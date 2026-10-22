"use client";

import { Keyboard, Minus, Plus } from "lucide-react";
import { useState } from "react";

import { useRegion } from "~/hooks/useRegion";
import { standardsEased } from "~/lib/eased-scale";
import { formatStandards } from "~/lib/estimate-display";
import { standardsScale } from "~/lib/log-scale";
import { fromRegionStandards, toRegionStandards } from "~/lib/region";
import { EasedSlider } from "./EasedSlider";

/** The most that can be typed in one go; the slider stops at 10. */
export const MAX_TYPED = 50;

const KEY = "press grid size-14 shrink-0 place-items-center rounded-key bg-white/10 hover:bg-white/15 disabled:opacity-40";

/** "1,5" or "1.5" → 1.5, rounded up to a tenth (never down), within 0.1–50. Null if it isn't a number. */
export function parseTyped(text: string): number | null {
  const n = Number(text.trim().replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(MAX_TYPED, Math.max(0.1, Math.ceil(n * 10 - 1e-6) / 10));
}

interface AmountControlProps {
  /** Stored 10 g standards. */
  standards: number;
  onChange: (standards: number) => void;
  /** Enter in the typed number: move on to the next step. */
  onEnter?: () => void;
}

/**
 * How much: a big number you can tap and type into, −/+ beside it, and a smooth eased slider
 * under it from a tenth to 10. Everything reads and writes the region's own standard drinks;
 * the state stays in stored 10 g standards.
 */
export function AmountControl({ standards, onChange, onEnter }: AmountControlProps) {
  const { region } = useRegion();
  const shown = toRegionStandards(standards, region);
  const [typing, setTyping] = useState<string | null>(null);
  const [said, setSaid] = useState("");
  const [bad, setBad] = useState(false);

  const set = (regionValue: number) => onChange(fromRegionStandards(regionValue, region));
  const words = (v: number) => `${formatStandards(v)} standard ${formatStandards(v) === "1.0" ? "drink" : "drinks"}`;

  function commitTyped() {
    if (typing === null) return;
    const v = parseTyped(typing);
    if (v === null) {
      setBad(true);
      return;
    }
    set(v);
    setBad(false);
    setTyping(null);
  }

  const less = standardsScale.move(shown, -1);
  const more = standardsScale.move(shown, 1);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <button type="button" aria-label={`Less: ${words(less)}`} disabled={shown <= standardsScale.min + 1e-9} onClick={() => set(less)} className={KEY}>
          <Minus aria-hidden="true" className="size-6" strokeWidth={2.25} />
        </button>

        <div className="flex min-w-0 flex-1 flex-col items-center">
          {typing === null ? (
            <button
              type="button"
              onClick={() => setTyping(formatStandards(shown))}
              aria-label={`${words(shown)}. Tap to type a number`}
              className="press flex min-h-[72px] min-w-36 items-center justify-center gap-2 rounded-key px-3 text-[56px] leading-none font-medium tracking-[-0.02em] tabular-nums shadow-[inset_0_0_0_1px_var(--color-line)] hover:bg-white/[0.06]"
            >
              {formatStandards(shown)}
              <Keyboard aria-hidden="true" className="size-5 shrink-0 text-ink-2" strokeWidth={2.25} />
            </button>
          ) : (
            <input
              autoFocus
              inputMode="decimal"
              enterKeyHint="next"
              aria-label="Standard drinks"
              value={typing}
              onFocus={(e) => e.currentTarget.select()}
              aria-invalid={bad || undefined}
              aria-describedby={bad ? "amount-error" : undefined}
              onChange={(e) => {
                setTyping(e.target.value);
                setBad(false);
              }}
              onBlur={() => {
                // Leaving with something unreadable keeps the old amount.
                if (typing !== null && parseTyped(typing) === null) {
                  setBad(false);
                  setTyping(null);
                } else commitTyped();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (typing !== null && parseTyped(typing) === null) {
                    setBad(true);
                    return;
                  }
                  commitTyped();
                  onEnter?.();
                } else if (e.key === "Escape") {
                  e.stopPropagation();
                  setBad(false);
                  setTyping(null);
                }
              }}
              className="min-h-[72px] w-40 rounded-key bg-white/[0.08] text-center text-[56px] leading-none font-medium tracking-[-0.02em] tabular-nums shadow-[inset_0_0_0_2px_var(--color-ink)] outline-none"
            />
          )}
          {bad ? (
            <span id="amount-error" className="text-lg font-medium text-alert">
              Type a number, like 1.5
            </span>
          ) : (
            <span className="text-lg text-ink-2">{typing === null ? "standard drinks · tap to type" : "standard drinks"}</span>
          )}
        </div>

        <button type="button" aria-label={`More: ${words(more)}`} disabled={shown >= MAX_TYPED - 1e-9} onClick={() => set(more)} className={KEY}>
          <Plus aria-hidden="true" className="size-6" strokeWidth={2.25} />
        </button>
      </div>

      <EasedSlider
        scale={standardsEased}
        value={Math.min(shown, standardsEased.max)}
        onChange={set}
        onCommit={(v) => setSaid(words(v))}
        label="Standard drinks"
        valueText={words}
        pageStep={1}
      />
      <div aria-hidden="true" className="-mt-2 flex justify-between px-1 text-base text-ink-2 tabular-nums">
        <span>0.1</span>
        <span>10+, type it</span>
      </div>
      <p aria-live="polite" className="sr-only">
        {said}
      </p>
    </div>
  );
}
