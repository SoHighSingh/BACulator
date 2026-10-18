"use client";

import { useEffect, useMemo, useState } from "react";

import type { QuickDrink } from "~/components/night/AddDock";
import type { LoggedDrink } from "~/hooks/useNight";
import { calculateBAC } from "~/lib/bac-calculator";
import { describeNight } from "~/lib/estimate-display";

/**
 * The landing page's sample night: a stated demo person (75 kg) and four drinks over the last hour
 * and a half, run through the real engine. Visitors add drinks to it and can switch the Widmark
 * ratio between female and male; nothing is saved.
 */
export const DEMO_WEIGHT = 75;
export type DemoSex = "female" | "male";

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
  { standards: 0, name: "Water", volumeMl: 300, abv: 0, count: 1 },
];

export function useDemoNight() {
  // Empty until mounted: the server render has no clock to agree with.
  const [drinks, setDrinks] = useState<LoggedDrink[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [sex, setSex] = useState<DemoSex>("female");
  const [lastAdded, setLastAdded] = useState<LoggedDrink | null>(null);
  // True once the visitor has added something: the hero's light answers their tap, not the page load.
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setDrinks(sample());
    setNow(new Date());
  }, []);

  const model = useMemo(() => describeNight(drinks, DEMO_WEIGHT, sex, now), [drinks, sex, now]);
  // The same engine call the night screen makes, for the hours the code panel prints.
  const result = useMemo(
    () => (drinks.length ? calculateBAC({ drinks, userWeight: DEMO_WEIGHT, userSex: sex, currentTime: now }) : null),
    [drinks, sex, now],
  );

  /** Water counts as a drink you had, not alcohol: it is shown, and changes nothing in the maths. */
  function add(q: QuickDrink) {
    const drink: LoggedDrink = {
      id: `demo-${Date.now()}`,
      standards: q.standards,
      finishedAt: new Date(),
      name: q.name,
      volumeMl: q.volumeMl,
      abv: q.abv,
      count: q.count,
    };
    setNow(new Date());
    setLastAdded(drink);
    if (q.standards > 0) {
      setDrinks((d) => [...d, drink]);
      setTouched(true);
    }
  }

  function undo() {
    if (!lastAdded) return;
    setDrinks((d) => d.filter((x) => x.id !== lastAdded.id));
    setLastAdded(null);
    setNow(new Date());
  }

  function reset() {
    setDrinks(sample());
    setLastAdded(null);
    setTouched(false);
    setNow(new Date());
  }

  function changeSex(next: DemoSex) {
    setSex(next);
    setNow(new Date());
  }

  return { model, result, drinks, now, sex, setSex: changeSex, ready: drinks.length > 0, lastAdded, touched, add, undo, reset };
}
