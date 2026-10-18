import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { signIn } from "next-auth/react";

import { SIGNED_OUT, useNight, type LoggedDrink, type NewDrink } from "~/hooks/useNight";
import { describeNight } from "~/lib/estimate-display";
import { drinkKey, isDoubleTap, pickRepeatAndRecents } from "~/lib/night-model";
import { BACGraphModal } from "../BACGraphModal";
import { AddSheet } from "./AddSheet";
import { EditDrinkSheet } from "./EditDrinkSheet";
import type { Notice, QuickDrink } from "./AddDock";
import { NightView } from "./NightView";

interface NightScreenProps {
  userWeight: number | null;
  userSex: string | null;
  onOpenUserInfo: () => void;
}

function useMinuteClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);
  return now;
}

const toQuick = (d: LoggedDrink | QuickDrink): QuickDrink => ({
  standards: d.standards,
  name: d.name,
  volumeMl: d.volumeMl,
  abv: d.abv,
  count: d.count,
});

const buzz = () => {
  try {
    navigator.vibrate?.(12);
  } catch {
    // Not supported (iOS Safari): the on-screen change is the confirmation.
  }
};

// Repeats of the same drink within this window collapse into one "Added … ×2" line.
const STACK_MS = 15_000;

/** The signed-in night-out screen. One job: record the drink you just got, and know it worked. */
export function NightScreen({ userWeight, userSex, onOpenUserInfo }: NightScreenProps) {
  const now = useMinuteClock();
  const night = useNight();
  const [addOpen, setAddOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [editing, setEditing] = useState<LoggedDrink | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const lastTap = useRef<{ key: string; at: number } | null>(null);

  const { drinks } = night;
  const model = useMemo(() => describeNight(drinks, userWeight, userSex, now), [drinks, userWeight, userSex, now]);

  const lastDrink = useMemo(
    () => drinks.reduce<LoggedDrink | null>((latest, d) => (!latest || d.finishedAt > latest.finishedAt ? d : latest), null),
    [drinks],
  );
  const { repeat, others } = pickRepeatAndRecents(lastDrink ? toQuick(lastDrink) : null, night.recents.map(toQuick), 4);

  const add = useCallback(
    (drink: NewDrink, fromTap: boolean) => {
      const key = drinkKey({ name: drink.details?.name, standards: drink.standards });
      const at = Date.now();
      if (fromTap && isDoubleTap(lastTap.current, key, at)) return false;
      lastTap.current = { key, at };
      const shown = night.add(drink);
      buzz();
      setNotice((n) =>
        n?.kind === "added" && drinkKey(n.drink) === key && at - n.at < STACK_MS
          ? { kind: "added", drink: shown, at, count: n.count + 1 }
          : { kind: "added", drink: shown, at, count: 1 },
      );
      return true;
    },
    [night],
  );

  function quickAdd(drink: QuickDrink) {
    add(
      {
        standards: drink.standards,
        finishedAt: new Date(),
        details: {
          name: drink.name ?? undefined,
          volumeMl: drink.volumeMl ?? undefined,
          abv: drink.abv ?? undefined,
          count: drink.count ?? undefined,
          source: "recent",
          confidence: 1,
        },
      },
      true,
    );
  }

  function remove(drink: LoggedDrink) {
    setNotice({ kind: "removed", drink, at: Date.now(), count: 1 });
    night.remove(drink.id);
  }

  // An edit is a replace through the same outbox as adds and removes, so it works with no signal and
  // a replay never doubles it. The notice offers "Undo" back to the old version via Add back.
  function saveEdit(drink: LoggedDrink, change: { standards: number; finishedAt: Date }) {
    setEditing(null);
    if (change.standards === drink.standards && change.finishedAt.getTime() === drink.finishedAt.getTime()) return;
    night.remove(drink.id);
    const shown = night.add({
      standards: change.standards,
      finishedAt: change.finishedAt,
      details: {
        name: drink.name ?? undefined,
        volumeMl: drink.volumeMl ?? undefined,
        abv: drink.abv ?? undefined,
        count: drink.count ?? undefined,
        source: "edited",
      },
    });
    setNotice({ kind: "added", drink: shown, at: Date.now(), count: 1 });
  }

  // Undo removes the latest add; Add back restores the latest removal. Each mirrors the other,
  // so a wrong tap on either is always reversible.
  function undo() {
    if (!notice) return;
    const { drink } = notice;
    if (notice.kind === "added") {
      night.remove(drink.id);
      setNotice(
        notice.count > 1
          ? { ...notice, count: notice.count - 1, at: Date.now() }
          : { kind: "removed", drink, at: Date.now(), count: 1 },
      );
      return;
    }
    const shown = night.add({
      standards: drink.standards,
      finishedAt: drink.finishedAt,
      details: {
        name: drink.name ?? undefined,
        volumeMl: drink.volumeMl ?? undefined,
        abv: drink.abv ?? undefined,
        count: drink.count ?? undefined,
        source: "recent",
      },
    });
    setNotice({ kind: "added", drink: shown, at: Date.now(), count: 1 });
  }

  return (
    <>
      <NightView
        model={model}
        drinks={drinks}
        repeat={repeat}
        recents={others}
        lastDrink={lastDrink}
        notice={notice}
        now={now}
        error={night.error}
        unsyncedCount={night.unsyncedCount}
        onAdd={quickAdd}
        onAddNew={(d) => add(d, false)}
        onOpenAdd={() => setAddOpen(true)}
        onUndo={undo}
        onEdit={setEditing}
        onRemove={remove}
        onOpenProfile={onOpenUserInfo}
        onAddDetails={onOpenUserInfo}
        onShowTimeline={() => setTimelineOpen(true)}
        onSignIn={night.error === SIGNED_OUT ? () => void signIn("google") : undefined}
      />

      <AddSheet open={addOpen} now={now} onClose={() => setAddOpen(false)} onAdd={(d) => add(d, false)} />
      <EditDrinkSheet drink={editing} now={now} onClose={() => setEditing(null)} onSave={saveEdit} />

      <BACGraphModal open={timelineOpen} onOpenChange={setTimelineOpen} drinks={drinks} userWeight={userWeight} userSex={userSex} />
    </>
  );
}
