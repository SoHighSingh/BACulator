import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useNight, type LoggedDrink, type NewDrink } from "~/hooks/useNight";
import { calculateBAC } from "~/lib/bac-calculator";
import { describeEstimate } from "~/lib/estimate-display";
import { BACGraphModal } from "../BACGraphModal";
import { AddSheet } from "./AddSheet";
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

const sameDrink = (a: QuickDrink, b: QuickDrink) => (a.name ?? "") === (b.name ?? "") && a.standards === b.standards;
const buzz = () => {
  try {
    navigator.vibrate?.(12);
  } catch {
    // Not supported (iOS Safari): the on-screen change is the confirmation.
  }
};

const DUPLICATE_WINDOW_MS = 4000;

/** A drink shown before the server has it, so the glass fills the instant the button is pressed. */
interface Pending {
  tempId: string;
  drink: LoggedDrink;
  realId: string | null;
}

/** The signed-in night-out screen. One job: record the drink you just got, and know it worked. */
export function NightScreen({ userWeight, userSex, onOpenUserInfo }: NightScreenProps) {
  const now = useMinuteClock();
  const night = useNight();
  const [addOpen, setAddOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const lastTap = useRef<{ key: string; at: number } | null>(null);

  // Drop optimistic drinks once the real one has arrived from the server.
  const serverIds = useMemo(() => new Set(night.drinks.map((d) => d.id)), [night.drinks]);
  const shownPending = pending.filter((p) => !(p.realId && serverIds.has(p.realId)));
  const drinks = useMemo(
    () => [...night.drinks, ...shownPending.map((p) => p.drink)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [night.drinks, shownPending.length],
  );

  const result = useMemo(
    () => calculateBAC({ drinks, userWeight, userSex, currentTime: now }),
    [drinks, userWeight, userSex, now],
  );
  const estimate = result ? describeEstimate(result, drinks, now) : null;

  const lastDrink = useMemo(
    () => drinks.reduce<LoggedDrink | null>((latest, d) => (!latest || d.finishedAt > latest.finishedAt ? d : latest), null),
    [drinks],
  );

  const repeat = lastDrink ? toQuick(lastDrink) : night.recents[0] ? toQuick(night.recents[0]) : null;
  const recents = night.recents
    .map(toQuick)
    .filter((d) => !repeat || !sameDrink(d, repeat))
    .slice(0, 4);

  const add = useCallback(
    async (drink: NewDrink) => {
      // A drunk double-tap logs one drink (useNight has the same 4 s rule); skip the optimistic fill too.
      const key = `${drink.details?.name ?? ""}|${drink.standards}`;
      if (lastTap.current?.key === key && Date.now() - lastTap.current.at < DUPLICATE_WINDOW_MS) return false;
      lastTap.current = { key, at: Date.now() };
      const tempId = `pending-${Date.now()}`;
      const optimistic: LoggedDrink = {
        id: tempId,
        standards: drink.standards,
        finishedAt: drink.finishedAt,
        name: drink.details?.name ?? null,
        volumeMl: drink.details?.volumeMl ?? null,
        abv: drink.details?.abv ?? null,
        count: drink.details?.count ?? null,
      };
      setPending((p) => [...p, { tempId, drink: optimistic, realId: null }]);
      setNotice({ kind: "added", drink: optimistic, at: Date.now() });
      buzz();

      const created = await night.add(drink);
      if (created) {
        setPending((p) => p.map((x) => (x.tempId === tempId ? { ...x, realId: created.id } : x)));
        setNotice((n) => (n?.drink.id === tempId ? { kind: "added", drink: created, at: n.at } : n));
      } else {
        // Saved nothing (duplicate tap or offline): take the optimistic drink back out.
        lastTap.current = null;
        setPending((p) => p.filter((x) => x.tempId !== tempId));
        setNotice((n) => (n?.drink.id === tempId ? null : n));
      }
      return created !== null;
    },
    [night],
  );

  function quickAdd(drink: QuickDrink) {
    void add({
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
    });
  }

  async function remove(drink: LoggedDrink) {
    if (await night.remove(drink.id)) setNotice({ kind: "removed", drink, at: Date.now() });
  }

  // Undo and "Add back" mirror each other, so a wrong tap on either is always reversible.
  async function undo() {
    if (!notice || notice.drink.id.startsWith("pending-")) return;
    if (notice.kind === "added") {
      const { drink } = notice;
      if (await night.remove(drink.id)) setNotice({ kind: "removed", drink, at: Date.now() });
      return;
    }
    const { drink } = notice;
    const restored = await night.add({
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
    if (restored) setNotice({ kind: "added", drink: restored, at: Date.now() });
  }

  return (
    <>
      <NightView
        estimate={estimate}
        bac={result ? result.currentBAC : null}
        peak={result && result.timeToPeak > 0 && result.peakBAC > result.currentBAC ? { bac: result.peakBAC, at: new Date(now.getTime() + result.timeToPeak * 3_600_000) } : null}
        drinks={drinks}
        repeat={repeat}
        recents={recents}
        lastDrink={lastDrink}
        notice={notice}
        now={now}
        busy={false}
        error={night.error}
        userWeight={userWeight}
        userSex={userSex}
        onAdd={quickAdd}
        onOpenAdd={() => setAddOpen(true)}
        onUndo={() => void undo()}
        onRemove={(d) => void remove(d)}
        onAddDetails={onOpenUserInfo}
        onShowTimeline={() => setTimelineOpen(true)}
      />

      <AddSheet open={addOpen} saving={night.isSaving} onClose={() => setAddOpen(false)} onAdd={add} />

      <BACGraphModal
        open={timelineOpen}
        onOpenChange={setTimelineOpen}
        drinks={drinks}
        userWeight={userWeight}
        userSex={userSex}
      />
    </>
  );
}
