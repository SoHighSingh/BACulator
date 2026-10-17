"use client";

import { useEffect, useMemo, useState } from "react";

import type { Notice, QuickDrink } from "~/components/night/AddDock";
import { NightView } from "~/components/night/NightView";
import type { LoggedDrink } from "~/hooks/useNight";
import { useRegion } from "~/hooks/useRegion";
import { calculateBAC } from "~/lib/bac-calculator";
import { describeEstimate } from "~/lib/estimate-display";
import { REGION_IDS } from "~/lib/region";

/**
 * Dev-only: the real NightView with sample drinks and no sign-in, for checking the design at phone
 * size. Only reachable outside production (see page.tsx). `?empty` starts with no drinks.
 */
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);
const SAMPLE: LoggedDrink[] = [
  { id: "a", standards: 1.6, finishedAt: minutesAgo(95), name: "Schooner of lager", volumeMl: 425, abv: 4.8, count: 1 },
  { id: "b", standards: 1.6, finishedAt: minutesAgo(50), name: "Schooner of lager", volumeMl: 425, abv: 4.8, count: 1 },
  { id: "c", standards: 1.6, finishedAt: minutesAgo(20), name: "Glass of red", volumeMl: 150, abv: 13.5, count: 1 },
  { id: "d", standards: 1, finishedAt: minutesAgo(6), name: "Vodka soda", volumeMl: 30, abv: 40, count: 1 },
];
const RECENTS: QuickDrink[] = [
  { standards: 1.6, name: "Glass of red", volumeMl: 150, abv: 13.5, count: 1 },
  { standards: 1.6, name: "Schooner of lager", volumeMl: 425, abv: 4.8, count: 1 },
  { standards: 2.2, name: "Pint of cider", volumeMl: 570, abv: 4.8, count: 1 },
];

export function DevNight() {
  const [drinks, setDrinks] = useState<LoggedDrink[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [now, setNow] = useState(() => new Date());
  const { region, setRegion } = useRegion();

  useEffect(() => {
    if (!window.location.search.includes("empty")) setDrinks(SAMPLE);
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const result = useMemo(
    () => calculateBAC({ drinks, userWeight: 75, userSex: "female", currentTime: now }),
    [drinks, now],
  );
  const estimate = result ? describeEstimate(result, drinks, now) : null;
  const last = drinks.reduce<LoggedDrink | null>((l, d) => (!l || d.finishedAt > l.finishedAt ? d : l), null);
  const repeat: QuickDrink | null = last ?? RECENTS[0] ?? null;

  function add(d: QuickDrink) {
    const drink: LoggedDrink = { ...d, id: String(Date.now()), finishedAt: new Date() };
    setNow(new Date());
    setDrinks((prev) => [...prev, drink]);
    setNotice({ kind: "added", drink, at: Date.now() });
  }

  return (
    <>
      <NightView
        estimate={estimate}
        bac={result ? result.currentBAC : null}
        peak={result && result.timeToPeak > 0 && result.peakBAC > result.currentBAC ? { bac: result.peakBAC, at: new Date(now.getTime() + result.timeToPeak * 3_600_000) } : null}
        drinks={drinks}
        repeat={repeat}
        recents={RECENTS.filter((r) => r.name !== repeat?.name)}
        lastDrink={last}
        notice={notice}
        now={now}
        busy={false}
        error={null}
        userWeight={75}
        userSex="female"
        onAdd={add}
        onOpenAdd={() => undefined}
        onUndo={() => {
          if (!notice) return;
          if (notice.kind === "added") {
            setDrinks((p) => p.filter((d) => d.id !== notice.drink.id));
            setNotice({ kind: "removed", drink: notice.drink, at: Date.now() });
          } else {
            setDrinks((p) => [...p, notice.drink]);
            setNotice({ kind: "added", drink: notice.drink, at: Date.now() });
          }
        }}
        onRemove={(d) => {
          setDrinks((p) => p.filter((x) => x.id !== d.id));
          setNotice({ kind: "removed", drink: d, at: Date.now() });
        }}
        onAddDetails={() => undefined}
        onShowTimeline={() => undefined}
      />
      <button
        type="button"
        className="fixed top-[max(0.75rem,env(safe-area-inset-top))] right-4 z-50 min-h-12 rounded-full bg-surface-2 px-4 text-base font-semibold text-ink"
        onClick={() => setRegion(REGION_IDS[(REGION_IDS.indexOf(region.id) + 1) % REGION_IDS.length]!)}
      >
        {region.id === "us" ? "US" : "10 g"}
      </button>
    </>
  );
}
