"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { BACGraphModal } from "~/components/BACGraphModal";
import { AddSheet } from "~/components/night/AddSheet";
import { EditDrinkSheet } from "~/components/night/EditDrinkSheet";
import { Sheet } from "~/components/night/Sheet";
import type { Notice, QuickDrink } from "~/components/night/AddDock";
import { NightView } from "~/components/night/NightView";
import { SIGNED_OUT, type LoggedDrink, type NewDrink } from "~/hooks/useNight";
import { useRegion } from "~/hooks/useRegion";
import { describeNight } from "~/lib/estimate-display";
import { drinkKey, isDoubleTap, pickRepeatAndRecents } from "~/lib/night-model";

/**
 * Dev-only: the real NightView, AddSheet and curve with sample drinks and no sign-in, for checking
 * the design at phone size. Only reachable outside production (see page.tsx).
 * `?empty` starts with no drinks; `?noweight` hides the estimate; `?us` / `?metric` set the region;
 * `?offline` shows the latest drink as saved on this phone only; `?signedout` shows the signed-out state.
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

export function DevNight() {
  const [drinks, setDrinks] = useState<LoggedDrink[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [weight, setWeight] = useState<number | null>(75);
  const [offline, setOffline] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [editing, setEditing] = useState<LoggedDrink | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [graphOpen, setGraphOpen] = useState(false);
  const lastTap = useRef<{ key: string; at: number } | null>(null);
  const { setRegion } = useRegion();

  useEffect(() => {
    const q = window.location.search;
    if (!q.includes("empty")) setDrinks(SAMPLE);
    if (q.includes("noweight")) setWeight(null);
    if (q.includes("us")) setRegion("us");
    else if (q.includes("metric")) setRegion("metric");
    if (q.includes("offline")) setOffline(true);
    if (q.includes("signedout")) setSignedOut(true);
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, [setRegion]);

  const model = useMemo(() => describeNight(drinks, weight, "female", now), [drinks, weight, now]);
  const latestId = drinks.at(-1)?.id;
  const shown = offline ? drinks.map((d) => (d.id === latestId ? { ...d, unsynced: true } : d)) : drinks;
  const last = drinks.reduce<LoggedDrink | null>((l, d) => (!l || d.finishedAt > l.finishedAt ? d : l), null);
  const { repeat, others } = pickRepeatAndRecents<QuickDrink>(last, RECENTS, 4);

  function add(d: NewDrink, fromTap: boolean) {
    const key = drinkKey({ name: d.details?.name, standards: d.standards });
    const at = Date.now();
    if (fromTap && isDoubleTap(lastTap.current, key, at)) return false;
    lastTap.current = { key, at };
    const drink: LoggedDrink = {
      id: `dev-${at}`,
      standards: d.standards,
      finishedAt: d.finishedAt,
      name: d.details?.name ?? null,
      volumeMl: d.details?.volumeMl ?? null,
      abv: d.details?.abv ?? null,
      count: d.details?.count ?? null,
    };
    setNow(new Date());
    setDrinks((prev) => [...prev, drink]);
    setNotice((n) =>
      n?.kind === "added" && drinkKey(n.drink) === key && at - n.at < 15_000
        ? { kind: "added", drink, at, count: n.count + 1 }
        : { kind: "added", drink, at, count: 1 },
    );
    return true;
  }

  return (
    <>
      <NightView
        model={model}
        drinks={shown}
        repeat={repeat}
        recents={others}
        lastDrink={last}
        notice={notice}
        now={now}
        error={signedOut ? SIGNED_OUT : null}
        unsyncedCount={offline && drinks.length > 0 ? 1 : 0}
        onAddNew={(d) => add(d, false)}
        onEdit={setEditing}
        onOpenProfile={() => setProfileOpen(true)}
        onSignIn={signedOut ? () => setSignedOut(false) : undefined}
        onAdd={(q) =>
          add({ standards: q.standards, finishedAt: new Date(), details: { name: q.name ?? undefined, volumeMl: q.volumeMl ?? undefined, abv: q.abv ?? undefined } }, true)
        }
        onOpenAdd={() => setAddOpen(true)}
        onUndo={() => {
          if (!notice) return;
          const { drink } = notice;
          if (notice.kind === "added") {
            setDrinks((p) => p.filter((d) => d.id !== drink.id));
            setNotice({ kind: "removed", drink, at: Date.now(), count: 1 });
          } else {
            setDrinks((p) => [...p, drink]);
            setNotice({ kind: "added", drink, at: Date.now(), count: 1 });
          }
        }}
        onRemove={(d) => {
          setDrinks((p) => p.filter((x) => x.id !== d.id));
          setNotice({ kind: "removed", drink: d, at: Date.now(), count: 1 });
        }}
        onAddDetails={() => setWeight(75)}
        onShowTimeline={() => setGraphOpen(true)}
      />
      <AddSheet open={addOpen} now={now} onClose={() => setAddOpen(false)} onAdd={(d) => add(d, false)} />
      <EditDrinkSheet
        drink={editing}
        now={now}
        onClose={() => setEditing(null)}
        onSave={(d, change) => {
          setEditing(null);
          setDrinks((p) => p.map((x) => (x.id === d.id ? { ...x, ...change } : x)));
        }}
      />
      <Sheet open={profileOpen} onOpenChange={setProfileOpen} title="You">
        <p className="text-lg text-ink-2">Your details and settings open here in the real app.</p>
      </Sheet>
      <BACGraphModal open={graphOpen} onOpenChange={setGraphOpen} drinks={drinks} userWeight={weight} userSex="female" />
    </>
  );
}
