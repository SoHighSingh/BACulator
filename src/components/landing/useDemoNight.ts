"use client";

import { useEffect, useMemo, useState } from "react";

import type { QuickDrink } from "~/components/night/AddDock";
import type { LoggedDrink } from "~/hooks/useNight";
import { calculateBAC } from "~/lib/bac-calculator";
import { describeNight } from "~/lib/estimate-display";

/**
 * The landing page's sample night: a stated demo person (75 kg) and two drinks in the last hour,
 * run through the real engine. It opens calm (about 0.03, blue), so the first thing a visitor sees
 * isn't the alarm state; a couple of taps on the drinks take it red. Visitors add drinks to it and can switch the Widmark
 * ratio between female and male; nothing is saved.
 */
export const DEMO_WEIGHT = 75;
export type DemoSex = "female" | "male";

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);
const sample = (): LoggedDrink[] => [
  { id: "a", standards: 1.6, finishedAt: minutesAgo(70), name: "Schooner of lager", volumeMl: 425, abv: 4.8, count: 1 },
  { id: "b", standards: 1, finishedAt: minutesAgo(10), name: "Vodka soda", volumeMl: 30, abv: 40, count: 1 },
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
  // True once the visitor has changed something: the hero's light then moves in answer to their tap,
  // never on the page load.
  const [touched, setTouched] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDrinks(sample());
    setNow(new Date());
    setReady(true);
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

  /** Takes back the latest drink: the one just added, else the latest of the night, so Undo can take the
   *  night down and the field, the mark and the hazard key go back to calm the way the night screen's do. */
  function undo() {
    const latest = lastAdded ?? drinks.reduce<LoggedDrink | null>((l, d) => (!l || d.finishedAt > l.finishedAt ? d : l), null);
    if (!latest) return;
    setDrinks((d) => d.filter((x) => x.id !== latest.id));
    setLastAdded(null);
    setTouched(true);
    setNow(new Date());
  }

  /** Back to the sample night (calm again, about 0.03). */
  function reset() {
    setDrinks(sample());
    setLastAdded(null);
    setTouched(true);
    setNow(new Date());
  }

  function changeSex(next: DemoSex) {
    setSex(next);
    setNow(new Date());
  }

  return { model, result, drinks, now, sex, setSex: changeSex, ready, lastAdded, touched, add, undo, reset };
}
