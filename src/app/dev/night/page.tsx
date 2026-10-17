"use client";

import { notFound } from "next/navigation";
import { useMemo, useState } from "react";

import { EstimatePanel } from "~/components/night/EstimatePanel";
import { GetHome } from "~/components/night/GetHome";
import { LastAdded, type Notice } from "~/components/night/LastAdded";
import { QuickAdd, type QuickDrink } from "~/components/night/QuickAdd";
import { TonightList } from "~/components/night/TonightList";
import type { LoggedDrink } from "~/hooks/useNight";
import { useRegion } from "~/hooks/useRegion";
import { calculateBAC } from "~/lib/bac-calculator";
import { describeEstimate } from "~/lib/estimate-display";
import { REGION_IDS } from "~/lib/region";

/**
 * Dev-only: the night screen with sample drinks and no sign-in, for checking the design at phone
 * size. Mirrors NightScreen's layout; returns 404 in production builds.
 */
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);
const SAMPLE: LoggedDrink[] = [
  { id: "a", standards: 1.6, finishedAt: minutesAgo(95), name: "Schooner of lager", volumeMl: 425, abv: 4.8, count: 1 },
  { id: "b", standards: 1.6, finishedAt: minutesAgo(50), name: "Schooner of lager", volumeMl: 425, abv: 4.8, count: 1 },
  { id: "c", standards: 1.6, finishedAt: minutesAgo(20), name: "Glass of red", volumeMl: 150, abv: 13.5, count: 1 },
  { id: "d", standards: 1, finishedAt: minutesAgo(6), name: "Vodka soda", volumeMl: 30, abv: 40, count: 1 },
];

export default function DevNight() {
  if (process.env.NODE_ENV === "production") notFound();
  const [drinks, setDrinks] = useState(SAMPLE);
  const [notice, setNotice] = useState<Notice | null>(null);
  const { region, setRegion } = useRegion();
  const now = new Date();

  const estimate = useMemo(() => {
    const result = calculateBAC({ drinks, userWeight: 75, userSex: "female", currentTime: new Date() });
    return result ? describeEstimate(result, drinks, new Date()) : null;
  }, [drinks]);

  const last = drinks.reduce<LoggedDrink | null>((l, d) => (!l || d.finishedAt > l.finishedAt ? d : l), null);
  const quick = (d: LoggedDrink): QuickDrink => ({ ...d });
  const recents = [quick(SAMPLE[2]!), quick(SAMPLE[3]!), { standards: 2.2, name: "Pint of cider", volumeMl: 570, abv: 4.8, count: 1 }];

  function add(d: QuickDrink) {
    const drink: LoggedDrink = { id: String(Date.now()), finishedAt: new Date(), ...d };
    setDrinks((prev) => [...prev, drink]);
    setNotice({ kind: "added", drink, at: Date.now() });
  }

  return (
    <main className="min-h-dvh bg-bg text-ink">
      <div className="mx-auto flex w-full max-w-[480px] flex-col gap-5 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
        <header className="flex min-h-12 items-center justify-between">
          <h1 className="text-xl font-bold tracking-[-0.01em] text-ink">BACulator</h1>
          <button
            type="button"
            className="min-h-12 rounded-full bg-surface-2 px-4 text-base font-semibold"
            onClick={() => setRegion(REGION_IDS[(REGION_IDS.indexOf(region.id) + 1) % REGION_IDS.length]!)}
          >
            Region: {region.id}
          </button>
        </header>
        <EstimatePanel estimate={estimate} onAddDetails={() => undefined} onShowTimeline={() => undefined} />
        <QuickAdd sameAgain={last ? quick(last) : null} recents={recents} disabled={false} onQuickAdd={add} onOpenAdd={() => undefined} />
        <LastAdded lastDrink={last} notice={notice} now={now} onUndo={() => {
          if (notice?.kind === "added") setDrinks((p) => p.filter((d) => d.id !== notice.drink.id));
          setNotice(null);
        }} />
        <TonightList drinks={drinks} onRemove={(d) => setDrinks((p) => p.filter((x) => x.id !== d.id))} />
        <GetHome />
      </div>
    </main>
  );
}
