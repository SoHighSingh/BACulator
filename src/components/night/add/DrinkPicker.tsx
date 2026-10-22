"use client";

import { Check, ChevronLeft, Minus, Plus } from "lucide-react";
import { useState } from "react";

import { useRegion } from "~/hooks/useRegion";
import { rawStandards } from "~/lib/drinks/standards";
import { formatVolume, loggedStandards, servesFor } from "~/lib/region";
import { DrinkIcon, drinkKind } from "../DrinkIcon";
import { sizesFor } from "./sizes";

const MAX_COUNT = 6;

const ROW =
  "press flex w-full items-center gap-4 rounded-row bg-white/[0.05] px-4 py-3 text-left hover:bg-white/[0.08]";
const ICON_TILE = "grid size-11 shrink-0 place-items-center rounded-tile bg-white/[0.06] text-ink-2";

/** A new view in a sheet starts at its top, so its back key and heading are never scrolled away. */
export const toSheetTop = (el: HTMLElement | null) => {
  el?.closest(".overflow-y-auto")?.scrollTo({ top: 0 });
};

/** What the list worked out: the amount and what to call it. */
export interface Picked {
  standards: number;
  name: string;
  volumeMl: number;
  abv: number;
  count: number;
}

/**
 * The drink list, as a calculator for the amount: pick a drink, then its size and how many, and
 * it hands back the standard drinks and a name. It never adds anything itself.
 */
export function DrinkPicker({ onPick, onBack }: { onPick: (p: Picked) => void; onBack: () => void }) {
  const { region, std } = useRegion();
  const serves = servesFor(region);
  const [picked, setPicked] = useState<number | null>(null);
  const [volumeMl, setVolumeMl] = useState<number | null>(null);
  const [count, setCount] = useState(1);

  const serve = picked === null ? null : serves[picked]!;
  const sizes = serve ? sizesFor(serve, region) : [];
  const size = serve ? (sizes.find((s) => s.volumeMl === (volumeMl ?? serve.volumeMl)) ?? sizes[0]!) : null;
  const standards = serve && size ? loggedStandards(rawStandards(count, size.volumeMl, serve.abv), region) : 0;

  const back = (
    <button
      type="button"
      onClick={serve ? () => setPicked(null) : onBack}
      className="press -ml-2 flex min-h-12 w-fit items-center gap-1 rounded-key pr-4 pl-2 text-lg font-medium text-ink-2 hover:bg-white/[0.06]"
    >
      <ChevronLeft aria-hidden="true" className="size-6" strokeWidth={2.25} />
      {serve ? "All drinks" : "Back"}
    </button>
  );

  if (!serve || !size) {
    return (
      <div key="list" ref={toSheetTop} className="flex flex-col gap-3">
        {back}
        <ul className="flex flex-col gap-2" aria-label="Drinks">
          {serves.map((s, i) => (
            <li key={s.label}>
              <button
                type="button"
                onClick={() => {
                  setPicked(i);
                  setVolumeMl(s.volumeMl);
                  setCount(1);
                }}
                className={`${ROW} min-h-16`}
              >
                <span className={ICON_TILE}>
                  <DrinkIcon kind={drinkKind({ name: s.label, volumeMl: s.volumeMl, abv: s.abv })} className="size-6" />
                </span>
                <span className="min-w-0 flex-1 truncate text-xl leading-snug font-medium">{s.label}</span>
                <span className="shrink-0 text-lg text-ink-2 tabular-nums">{std(s.standards)} std</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div key="size" ref={toSheetTop} className="flex flex-col gap-4">
      {back}
      <section aria-labelledby="size-heading" className="flex flex-col gap-2">
        <h3 id="size-heading" className="px-1 text-lg font-semibold">
          {serve.label}: size
        </h3>
        <div role="radiogroup" aria-labelledby="size-heading" className="flex flex-col gap-2">
          {sizes.map((s) => {
            const on = s.volumeMl === size.volumeMl;
            return (
              <button
                key={s.volumeMl}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setVolumeMl(s.volumeMl)}
                className={`${ROW} min-h-16 ${on ? "bg-white/[0.14]" : ""}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-lg leading-snug font-medium">{s.size}</span>
                  <span className="block text-lg leading-snug text-ink-2 tabular-nums">
                    {formatVolume(s.volumeMl, region)} · {std(loggedStandards(rawStandards(1, s.volumeMl, serve.abv), region))} std
                  </span>
                </span>
                <span className={`grid size-7 shrink-0 place-items-center rounded-circle ${on ? "bg-ink text-bg" : "bg-white/10"}`}>
                  {on && <Check aria-hidden="true" className="size-4" strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex min-h-16 items-center justify-between gap-3 rounded-row bg-white/[0.04] px-4 py-2">
        <p className="text-lg font-semibold whitespace-nowrap">How many</p>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="One fewer" disabled={count <= 1} onClick={() => setCount((c) => Math.max(1, c - 1))} className="press grid size-12 place-items-center rounded-key bg-white/10 disabled:opacity-40">
            <Minus aria-hidden="true" className="size-5" strokeWidth={2.25} />
          </button>
          <span className="w-9 text-center text-xl font-medium tabular-nums" aria-live="polite">
            {count}
          </span>
          <button type="button" aria-label="One more" disabled={count >= MAX_COUNT} onClick={() => setCount((c) => Math.min(MAX_COUNT, c + 1))} className="press grid size-12 place-items-center rounded-key bg-white/10 disabled:opacity-40">
            <Plus aria-hidden="true" className="size-5" strokeWidth={2.25} />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onPick({ standards, name: count > 1 ? `${count} × ${size.label}` : size.label, volumeMl: size.volumeMl, abv: serve.abv, count })}
        className="press key-glow flex min-h-16 w-full items-center justify-center rounded-primary bg-ink text-xl font-medium text-bg"
      >
        Use {std(standards)} std
      </button>
    </div>
  );
}
