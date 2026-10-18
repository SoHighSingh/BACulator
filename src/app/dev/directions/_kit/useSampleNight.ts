"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { Notice, QuickDrink } from "~/components/night/AddDock";
import type { LoggedDrink } from "~/hooks/useNight";
import { describeNight, drinkLabel, formatBand, formatPoint, type NightModel } from "~/lib/estimate-display";
import { drinkKey, isDoubleTap, pickRepeatAndRecents } from "~/lib/night-model";

/**
 * Dev-only sample night shared by every design direction, so they are compared on identical data.
 * `?empty` starts with no drinks, `?noweight` hides the estimate. Adds, undo and remove work.
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
  { standards: 2.2, name: "Pint of cider", volumeMl: 570, abv: 4.8, count: 1 },
];

export interface SampleNight {
  model: NightModel;
  drinks: LoggedDrink[];
  repeat: QuickDrink | null;
  recents: QuickDrink[];
  last: LoggedDrink | null;
  notice: Notice | null;
  now: Date;
  weight: number | null;
  /** "about 0.08" pieces, null with no estimate */
  point: string | null;
  /** "0.06 to 0.12" */
  likely: string | null;
  totalStd: number;
  add: (q: QuickDrink) => void;
  undo: () => void;
  remove: (d: LoggedDrink) => void;
  setWeight: (kg: number | null) => void;
}

export function useSampleNight(): SampleNight {
  const [drinks, setDrinks] = useState<LoggedDrink[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [weight, setWeight] = useState<number | null>(75);
  const lastTap = useRef<{ key: string; at: number } | null>(null);

  useEffect(() => {
    const q = window.location.search;
    if (!q.includes("empty")) setDrinks(SAMPLE);
    if (q.includes("noweight")) setWeight(null);
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const model = useMemo(() => describeNight(drinks, weight, "female", now), [drinks, weight, now]);
  const last = drinks.reduce<LoggedDrink | null>((l, d) => (!l || d.finishedAt > l.finishedAt ? d : l), null);
  const { repeat, others } = pickRepeatAndRecents<QuickDrink>(last, RECENTS, 4);

  function add(q: QuickDrink) {
    const key = drinkKey(q);
    const at = Date.now();
    if (isDoubleTap(lastTap.current, key, at)) return;
    lastTap.current = { key, at };
    const drink: LoggedDrink = { id: `dev-${at}`, standards: q.standards, finishedAt: new Date(), name: q.name, volumeMl: q.volumeMl, abv: q.abv, count: q.count };
    setNow(new Date());
    setDrinks((prev) => [...prev, drink]);
    setNotice((n) =>
      n?.kind === "added" && drinkKey(n.drink) === key && at - n.at < 15_000
        ? { kind: "added", drink, at, count: n.count + 1 }
        : { kind: "added", drink, at, count: 1 },
    );
  }

  function undo() {
    if (!notice) return;
    const { drink } = notice;
    if (notice.kind === "added") {
      setDrinks((p) => p.filter((d) => d.id !== drink.id));
      setNotice({ kind: "removed", drink, at: Date.now(), count: 1 });
    } else {
      setDrinks((p) => [...p, drink]);
      setNotice({ kind: "added", drink, at: Date.now(), count: 1 });
    }
  }

  function remove(d: LoggedDrink) {
    setDrinks((p) => p.filter((x) => x.id !== d.id));
    setNotice({ kind: "removed", drink: d, at: Date.now(), count: 1 });
  }

  const bac = model.bac;
  return {
    model,
    drinks,
    repeat,
    recents: others,
    last,
    notice,
    now,
    weight,
    point: bac === null ? null : formatPoint(bac),
    likely: bac === null || bac <= 0 ? null : formatBand(bac).replace("–", " to "),
    totalStd: drinks.reduce((s, d) => s + d.standards, 0),
    add,
    undo,
    remove,
    setWeight,
  };
}

/** The dock's status line, as data, so each direction can set it in its own type. */
export function dockStatus(night: SampleNight, std: (n: number) => string, undoWindowMs = 120_000) {
  const live = night.notice && night.now.getTime() - night.notice.at < undoWindowMs ? night.notice : null;
  if (live) {
    return {
      live,
      lead: live.kind === "added" ? "Added" : "Removed",
      label: drinkLabel(live.drink, std) + (live.count > 1 ? ` ×${live.count}` : ""),
      action: live.kind === "added" ? (live.count > 1 ? "Undo one" : "Undo") : "Add back",
    };
  }
  return { live: null, lead: night.last ? "Last" : null, label: night.last ? drinkLabel(night.last, std) : "Nothing added yet tonight", action: null };
}
