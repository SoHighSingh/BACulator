import { useCallback, useEffect, useMemo, useState } from "react";

import { calculateBAC } from "~/lib/bac-calculator";
import { describeEstimate } from "~/lib/estimate-display";
import { useNight, type LoggedDrink, type NewDrink } from "~/hooks/useNight";
import { BACGraphModal } from "../BACGraphModal";
import { AddSheet } from "./AddSheet";
import { EstimatePanel } from "./EstimatePanel";
import { GetHome } from "./GetHome";
import { LastAdded, type Notice } from "./LastAdded";
import { QuickAdd, type QuickDrink } from "./QuickAdd";
import { TonightList } from "./TonightList";

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

/** The signed-in night-out screen. One job: record the drink you just got, and know it worked. */
export function NightScreen({ userWeight, userSex, onOpenUserInfo }: NightScreenProps) {
  const now = useMinuteClock();
  const night = useNight();
  const [addOpen, setAddOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const estimate = useMemo(() => {
    const result = calculateBAC({ drinks: night.drinks, userWeight, userSex, currentTime: now });
    return result ? describeEstimate(result, night.drinks, now) : null;
  }, [night.drinks, userWeight, userSex, now]);

  const lastDrink = useMemo(
    () => night.drinks.reduce<LoggedDrink | null>((latest, d) => (!latest || d.finishedAt > latest.finishedAt ? d : latest), null),
    [night.drinks],
  );

  const sameAgain = lastDrink ? toQuick(lastDrink) : (night.recents[0] ? toQuick(night.recents[0]) : null);
  const recents = night.recents
    .map(toQuick)
    .filter((d) => !sameAgain || !sameDrink(d, sameAgain))
    .slice(0, 4);

  const add = useCallback(
    async (drink: NewDrink) => {
      const created = await night.add(drink);
      if (created) setNotice({ kind: "added", drink: created, at: Date.now() });
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

  async function undo() {
    if (!notice) return;
    if (notice.kind === "added") {
      if (await night.remove(notice.drink.id)) setNotice(null);
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
    if (restored) setNotice(null);
  }

  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="flex min-h-12 items-center pr-28">
        <h1 className="text-xl font-semibold text-ink">BACulator</h1>
      </header>

      <EstimatePanel estimate={estimate} onAddDetails={onOpenUserInfo} onShowTimeline={() => setTimelineOpen(true)} />

      <QuickAdd
        sameAgain={sameAgain}
        recents={recents}
        disabled={night.isSaving}
        onQuickAdd={quickAdd}
        onOpenAdd={() => setAddOpen(true)}
      />

      <LastAdded lastDrink={lastDrink} notice={notice} now={now} onUndo={() => void undo()} />

      {night.error && (
        <p role="alert" className="rounded-xl border border-alert p-4 text-lg font-medium text-alert">
          {night.error}
        </p>
      )}

      <TonightList drinks={night.drinks} onRemove={(d) => void remove(d)} />

      <GetHome />

      <AddSheet open={addOpen} saving={night.isSaving} onClose={() => setAddOpen(false)} onAdd={add} />

      <BACGraphModal
        open={timelineOpen}
        onOpenChange={setTimelineOpen}
        drinks={night.drinks}
        userWeight={userWeight}
        userSex={userSex}
      />
    </div>
  );
}
