"use client";

import { useEffect, useMemo, useState } from "react";

import type { QuickDrink } from "~/components/night/AddDock";
import type { LoggedDrink } from "~/hooks/useNight";
import { describeNight } from "~/lib/estimate-display";

/**
 * The landing page's sample night: a stated demo person (75 kg, female) and four drinks over the
 * last hour and a half, run through the real engine. Visitors add drinks to it; nothing is saved.
 */
export const DEMO_WEIGHT = 75;
export const DEMO_SEX = "female";

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);
const sample = (): LoggedDrink[] => [
  { id: "a", standards: 1.6, finishedAt: minutesAgo(95), name: "Schooner of lager", volumeMl: 425, abv: 4.8, count: 1 },
  { id: "b", standards: 1.6, finishedAt: minutesAgo(50), name: "Schooner of lager", volumeMl: 425, abv: 4.8, count: 1 },
  { id: "c", standards: 1.6, finishedAt: minutesAgo(20), name: "Glass of red", volumeMl: 150, abv: 13.5, count: 1 },
  { id: "d", standards: 1, finishedAt: minutesAgo(6), name: "Vodka soda", volumeMl: 30, abv: 40, count: 1 },
];

export const DEMO_DRINKS: QuickDrink[] = [
  { standards: 1, name: "Vodka soda", volumeMl: 30, abv: 40, count: 1 },
  { standards: 1.6, name: "Glass of red", volumeMl: 150, abv: 13.5, count: 1 },
  { standards: 1.6, name: "Schooner of lager", volumeMl: 425, abv: 4.8, count: 1 },
];

export function useDemoNight() {
  // Empty until mounted: the server render has no clock to agree with.
  const [drinks, setDrinks] = useState<LoggedDrink[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [lastAdded, setLastAdded] = useState<LoggedDrink | null>(null);

  useEffect(() => {
    setDrinks(sample());
    setNow(new Date());
  }, []);

  const model = useMemo(() => describeNight(drinks, DEMO_WEIGHT, DEMO_SEX, now), [drinks, now]);

  function add(q: QuickDrink) {
    const drink: LoggedDrink = { id: `demo-${Date.now()}`, standards: q.standards, finishedAt: new Date(), name: q.name, volumeMl: q.volumeMl, abv: q.abv, count: q.count };
    setNow(new Date());
    setDrinks((d) => [...d, drink]);
    setLastAdded(drink);
  }

  function undo() {
    if (!lastAdded) return;
    setDrinks((d) => d.filter((x) => x.id !== lastAdded.id));
    setLastAdded(null);
  }

  return { model, drinks, now, ready: drinks.length > 0, lastAdded, add, undo };
}
