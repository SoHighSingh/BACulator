import { useEffect, useRef, useState } from "react";

import { describeItem, toDrinkDetails, type DrinkDetails } from "~/lib/drinks/details";
import type { ParseResult } from "~/lib/drinks/types";
import type { NewDrink } from "~/hooks/useNight";
import { useRegion } from "~/hooks/useRegion";
import { fromRegionStandards, servesFor, toRegionStandards } from "~/lib/region";
import { api } from "~/trpc/react";

const MAX_STANDARDS = 50;
const STEP = 0.5;
const TIME_CHIPS = [
  { minutesAgo: 0, label: "Now" },
  { minutesAgo: 15, label: "15 min ago" },
  { minutesAgo: 30, label: "30 min ago" },
  { minutesAgo: 60, label: "1 hour ago" },
] as const;

interface AddSheetProps {
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onAdd: (drink: NewDrink) => Promise<boolean>;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Anything that isn't a one-tap repeat. No animation, no time picker, no required typing:
 * pick a serve or type it, check the number, pick when, Add.
 */
export function AddSheet({ open, saving, onClose, onAdd }: AddSheetProps) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [standards, setStandards] = useState(1);
  const [details, setDetails] = useState<DrinkDetails | undefined>(undefined);
  const [minutesAgo, setMinutesAgo] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const analyse = api.post.analyseDrink.useMutation();
  const { region, std } = useRegion();
  const chips = servesFor(region);

  // Every open starts fresh at "Now", so a drink is never stamped with a stale time.
  useEffect(() => {
    if (!open) return;
    setText("");
    setResult(null);
    setStandards(1);
    setDetails(undefined);
    setMinutesAgo(0);
    headingRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function readDrink() {
    const drinkText = text.trim();
    if (!drinkText || analyse.isPending) return;
    try {
      const parsed = await analyse.mutateAsync({ drinkText });
      setResult(parsed);
      if (parsed.totalStandards > 0) {
        setStandards(Math.min(MAX_STANDARDS, round1(parsed.totalStandards)));
        setDetails(toDrinkDetails(parsed, drinkText));
      } else {
        setDetails(undefined);
      }
    } catch {
      setResult({ status: "unavailable", items: [], totalStandards: 0, unparsed: [drinkText], layer: null });
    }
  }

  function pickChip(chip: (typeof chips)[number]) {
    setStandards(chip.standards);
    setDetails({
      name: chip.label,
      volumeMl: chip.volumeMl,
      abv: chip.abv,
      count: 1,
      source: "manual",
      confidence: 1,
      rawText: text.trim().slice(0, 200),
    });
  }

  // The stepper counts in the region's standard drinks; state is kept in stored 10 g standards.
  function step(direction: 1 | -1) {
    const shown = round1(toRegionStandards(standards, region)) + direction * STEP;
    const value = Math.min(MAX_STANDARDS, Math.max(fromRegionStandards(STEP, region), fromRegionStandards(shown, region)));
    setStandards(value);
    if (details && details.source !== "manual") setDetails({ ...details, source: "edited" });
  }

  async function submit() {
    if (standards <= 0 || saving) return;
    const added = await onAdd({
      standards,
      finishedAt: new Date(Date.now() - minutesAgo * 60_000),
      details,
    });
    if (added) onClose();
  }

  const selectedChip = details?.source === "manual" ? details.name : null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="add-heading" className="fixed inset-0 z-50 flex flex-col bg-bg">
      <header className="mx-auto flex w-full max-w-[480px] items-center justify-between gap-4 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2">
        <h2 id="add-heading" ref={headingRef} tabIndex={-1} className="text-2xl font-semibold text-ink outline-none">
          Add a drink
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="min-h-12 min-w-20 rounded-xl bg-surface-2 px-4 text-lg font-medium text-ink"
        >
          Close
        </button>
      </header>

      <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-6 overflow-y-auto px-4 pb-6">
        <section className="flex flex-col gap-3">
          <label htmlFor="drink-text" className="text-lg font-medium text-ink">
            What are you having?
          </label>
          <div className="flex gap-3">
            <input
              id="drink-text"
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void readDrink()}
              placeholder="e.g. 2 schooners of Great Northern"
              autoComplete="off"
              enterKeyHint="go"
              className="min-h-14 min-w-0 flex-1 rounded-xl border-2 border-line bg-surface px-4 text-lg text-ink placeholder:text-ink-2 focus:border-amber focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void readDrink()}
              disabled={!text.trim() || analyse.isPending}
              className="min-h-14 shrink-0 rounded-xl bg-surface-2 px-4 text-lg font-semibold text-ink disabled:opacity-60"
            >
              {analyse.isPending ? "Reading…" : "Read it"}
            </button>
          </div>

          {result && (
            <div aria-live="polite" className="flex flex-col gap-1 text-lg text-ink">
              {result.items
                .filter((i) => i.standards > 0 || result.status === "none")
                .map((item, i) => (
                  <p key={i} className="flex justify-between gap-3">
                    <span>
                      {describeItem(item, region)}
                      {item.assumed.includes("volume") && <span className="text-ink-2"> (usual size)</span>}
                    </span>
                    <span className="font-semibold whitespace-nowrap">{std(item.standards)} std</span>
                  </p>
                ))}
              {result.items.some((i) => i.confidence < 0.7) && <p className="text-amber">Best guess. Check the number below.</p>}
              {result.status === "none" && <p>No alcohol found in that.</p>}
              {result.status === "partial" && result.unparsed.length > 0 && (
                <p className="text-ink-2">Not counted: {result.unparsed.map((u) => `"${u}"`).join(", ")}</p>
              )}
              {result.status === "unavailable" && <p>Couldn&apos;t read that. Pick the closest below.</p>}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3" aria-labelledby="pick-heading">
          <h3 id="pick-heading" className="text-lg font-medium text-ink">
            Or pick one
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {chips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                aria-pressed={selectedChip === chip.label}
                onClick={() => pickChip(chip)}
                className={`min-h-16 rounded-xl px-3 py-2 text-left text-ink ${
                  selectedChip === chip.label ? "bg-surface-3 ring-3 ring-amber" : "bg-surface-2"
                }`}
              >
                <span className="block text-lg leading-snug font-semibold">{chip.label}</span>
                <span className="block text-base text-ink-2 tabular-nums">{std(chip.standards)} std</span>
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3" aria-labelledby="amount-heading">
          <h3 id="amount-heading" className="text-lg font-medium text-ink">
            Standard drinks
          </h3>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Half a standard drink less"
              className="min-h-14 min-w-14 rounded-xl bg-surface-2 text-2xl font-semibold text-ink"
            >
              −
            </button>
            <output aria-live="polite" className="flex-1 text-center text-3xl font-bold tabular-nums text-ink">
              {std(standards)}
            </output>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Half a standard drink more"
              className="min-h-14 min-w-14 rounded-xl bg-surface-2 text-2xl font-semibold text-ink"
            >
              +
            </button>
          </div>
        </section>

        <section className="flex flex-col gap-3" aria-labelledby="when-heading">
          <h3 id="when-heading" className="text-lg font-medium text-ink">
            Finished it
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {TIME_CHIPS.map((chip) => (
              <button
                key={chip.minutesAgo}
                type="button"
                aria-pressed={minutesAgo === chip.minutesAgo}
                onClick={() => setMinutesAgo(chip.minutesAgo)}
                className={`min-h-14 rounded-xl px-3 text-lg font-semibold text-ink ${
                  minutesAgo === chip.minutesAgo ? "bg-surface-3 ring-3 ring-amber" : "bg-surface-2"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </section>
      </div>

      <footer className="mx-auto w-full max-w-[480px] px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={saving}
          className="min-h-[72px] w-full rounded-3xl bg-amber px-5 text-xl font-bold text-bg active:bg-amber-press disabled:opacity-60"
        >
          {saving ? "Adding…" : `Add ${details?.name ?? "drink"} · ${std(standards)} std`}
        </button>
      </footer>
    </div>
  );
}
