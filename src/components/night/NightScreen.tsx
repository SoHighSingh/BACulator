import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { signIn } from "next-auth/react";

import { SIGNED_OUT, useNight, type DrinkChange, type LoggedDrink, type NewDrink } from "~/hooks/useNight";
import { describeNight } from "~/lib/estimate-display";
import { drinkKey, isDoubleTap, pickRepeatAndRecents } from "~/lib/night-model";
import { BACGraphModal } from "../BACGraphModal";
import { AddSheet, type Prefill } from "./AddSheet";
import { EditDrinkSheet } from "./EditDrinkSheet";
import type { Notice, QuickDrink } from "./AddDock";
import { NightView } from "./NightView";

interface NightScreenProps {
  userWeight: number | null;
  userSex: string | null;
  onOpenUserInfo: () => void;
}

/** The screen's clock, and a way to move it on at once (a drink stamped "now" counts straight away). */
function useMinuteClock() {
  const [now, setNow] = useState(() => new Date());
  const tick = useCallback(() => setNow(new Date()), []);
  useEffect(() => {
    const id = setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [tick]);
  return [now, tick] as const;
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
  const [now, tick] = useMinuteClock();
  const night = useNight();
  const [addOpen, setAddOpen] = useState(false);
  const [prefill, setPrefill] = useState<Prefill | null>(null);
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
      tick();
      buzz();
      setNotice((n) =>
        n?.kind === "added" && drinkKey(n.drink) === key && at - n.at < STACK_MS
          ? { kind: "added", drink: shown, at, count: n.count + 1 }
          : { kind: "added", drink: shown, at, count: 1 },
      );
      return true;
    },
    [night, tick],
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
    tick();
  }

  // An edit changes the drink in place (same id, same row), through the same outbox as adds and
  // removes, so it works with no signal. Undo puts the old values back.
  function saveEdit(drink: LoggedDrink, change: DrinkChange | null) {
    setEditing(null);
    if (!change) return;
    night.update(drink, change);
    tick();
    setNotice({ kind: "changed", drink: { ...drink, ...change }, before: drink, at: Date.now(), count: 1 });
  }

  // Undo removes the latest add or reverses the latest edit; Add back restores the latest removal.
  // Each mirrors the other, so a wrong tap on either is always reversible.
  function undo() {
    if (!notice) return;
    tick();
    const { drink } = notice;
    if (notice.kind === "changed") {
      const { before } = notice;
      night.update(drink, { standards: before.standards, finishedAt: before.finishedAt });
      setNotice({ kind: "changed", drink: before, before: drink, at: Date.now(), count: 1 });
      return;
    }
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
        weight={userWeight}
        sex={userSex}
        model={model}
        drinks={drinks}
        repeat={repeat}
        recents={others}
        lastDrink={lastDrink}
        notice={notice}
        now={now}
        error={night.error}
        onAdd={quickAdd}
        onUseParsed={(p) => {
          setPrefill(p);
          setAddOpen(true);
        }}
        onOpenAdd={() => {
          setPrefill(null);
          setAddOpen(true);
        }}
        onUndo={undo}
        onEdit={setEditing}
        onRemove={remove}
        onOpenProfile={onOpenUserInfo}
        onAddDetails={onOpenUserInfo}
        onShowTimeline={() => setTimelineOpen(true)}
        onSignIn={night.error === SIGNED_OUT ? () => void signIn("google") : undefined}
      />

      <AddSheet
        open={addOpen}
        now={now}
        onClose={() => setAddOpen(false)}
        onAdd={(d) => add(d, false)}
        recents={repeat ? [repeat, ...others] : others}
        onAddRecent={quickAdd}
        prefill={prefill}
      />
      <EditDrinkSheet
        drink={editing}
        now={now}
        onClose={() => setEditing(null)}
        onSave={saveEdit}
        onRemove={(d) => {
          setEditing(null);
          remove(d);
        }}
      />

      <BACGraphModal open={timelineOpen} onOpenChange={setTimelineOpen} drinks={drinks} userWeight={userWeight} userSex={userSex} alert={model.alert} onEditDrink={setEditing} />
    </>
  );
}
