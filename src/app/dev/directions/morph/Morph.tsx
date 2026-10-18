"use client";

import { useEffect, useMemo, useState } from "react";

import type { Notice, QuickDrink } from "~/components/night/AddDock";
import { NightView } from "~/components/night/NightView";
import type { LoggedDrink } from "~/hooks/useNight";
import { describeNight } from "~/lib/estimate-display";
import { pickRepeatAndRecents } from "~/lib/night-model";

/**
 * Dev-only motion test: the real NightView with a button (outside the night UI) that flips between
 * no drinks counted (calm) and drinks counted (not safe), so the mark → pill morph and the field's
 * cross-fade can be triggered and filmed. `?alert` starts in the not-safe state.
 */
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);
const SAMPLE: LoggedDrink[] = [
  { id: "a", standards: 1.6, finishedAt: minutesAgo(95), name: "Schooner of lager", volumeMl: 425, abv: 4.8, count: 1 },
  { id: "b", standards: 1.6, finishedAt: minutesAgo(50), name: "Schooner of lager", volumeMl: 425, abv: 4.8, count: 1 },
  { id: "c", standards: 1.6, finishedAt: minutesAgo(20), name: "Glass of red", volumeMl: 150, abv: 13.5, count: 1 },
  { id: "d", standards: 1, finishedAt: minutesAgo(6), name: "Vodka soda", volumeMl: 30, abv: 40, count: 1 },
];
const RECENTS: QuickDrink[] = [
  { standards: 1, name: "Vodka soda", volumeMl: 30, abv: 40, count: 1 },
  { standards: 1.6, name: "Glass of red", volumeMl: 150, abv: 13.5, count: 1 },
  { standards: 1.6, name: "Schooner of lager", volumeMl: 425, abv: 4.8, count: 1 },
];

export function Morph() {
  const [on, setOn] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (window.location.search.includes("alert")) setOn(true);
  }, []);

  const drinks = useMemo(() => (on ? SAMPLE : []), [on]);
  const model = useMemo(() => describeNight(drinks, 75, "female", now), [drinks, now]);
  const last = drinks.at(-1) ?? null;
  const { repeat, others } = pickRepeatAndRecents<QuickDrink>(last, RECENTS, 4);

  function toggle() {
    const at = Date.now();
    setNow(new Date(at));
    const drink = SAMPLE[3]!;
    // A real add/remove always lands a notice, which is what lets the morph play.
    setNotice(on ? { kind: "removed", drink, at, count: 1 } : { kind: "added", drink, at, count: 1 });
    setOn((v) => !v);
  }

  return (
    <>
      <NightView
        model={model}
        drinks={drinks}
        repeat={repeat}
        recents={others}
        lastDrink={last}
        notice={notice}
        now={now}
        error={null}
        onAdd={toggle}
        onAddNew={() => {
          toggle();
          return true;
        }}
        onOpenAdd={() => undefined}
        onUndo={toggle}
        onEdit={() => undefined}
        onRemove={toggle}
        onOpenProfile={() => undefined}
        onAddDetails={() => undefined}
        onShowTimeline={() => undefined}
      />
      <button
        type="button"
        onClick={toggle}
        data-dev-toggle
        className="fixed top-1/2 left-0 z-50 rounded-r-full bg-ink px-3 py-2 text-sm font-medium text-bg"
      >
        Toggle state
      </button>
    </>
  );
}
