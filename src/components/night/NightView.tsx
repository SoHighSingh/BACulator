import { useRef } from "react";

import type { LoggedDrink } from "~/hooks/useNight";
import type { NightModel } from "~/lib/estimate-display";
import { AddDock, type Notice, type QuickDrink } from "./AddDock";
import { FluidGauge } from "./FluidGauge";
import { GetHome } from "./GetHome";
import { TimelineCard } from "./TimelineCard";
import { TonightList } from "./TonightList";
import { WarningMark } from "./WarningMark";

export interface NightViewProps {
  model: NightModel;
  drinks: LoggedDrink[];
  repeat: QuickDrink | null;
  recents: QuickDrink[];
  lastDrink: LoggedDrink | null;
  notice: Notice | null;
  now: Date;
  error: string | null;
  userWeight: number | null;
  userSex: string | null;
  onAdd: (drink: QuickDrink) => void;
  onOpenAdd: () => void;
  onUndo: () => void;
  onRemove: (drink: LoggedDrink) => void;
  onAddDetails: () => void;
  onShowTimeline: () => void;
}

/**
 * The signed-in night screen, laid out like an app: a top bar, one scrolling column and a dock for
 * adding (side by side in landscape). Purely presentational so the dev preview and the real screen
 * match. "Not safe to drive" sticks to the top of the scroll area, so it never scrolls away.
 */
export function NightView(props: NightViewProps) {
  const { model, drinks, now } = props;
  const { estimate } = model;
  const getHomeRef = useRef<HTMLDivElement>(null);

  return (
    <div className="app-shell fixed inset-0 bg-bg text-ink">
      <header className="app-top mx-auto flex w-full max-w-[480px] items-center gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pr-32 pb-2 max-[360px]:pr-28">
        <h1 className="min-w-0 flex-1 truncate text-xl font-bold tracking-[-0.01em]">BACulator</h1>
        <button
          type="button"
          onClick={() => getHomeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className="press min-h-12 rounded-full bg-surface-2 px-4 text-lg font-semibold whitespace-nowrap active:bg-surface-3 max-[360px]:px-3 max-[360px]:text-base"
        >
          Get home
        </button>
      </header>

      <main className="app-main min-h-0 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 pb-6">
          {model.notSafeToDrive && (
            <p role="status" className="sticky top-0 z-10 -mx-4 bg-bg px-4 py-2 text-[22px] font-bold text-alert">
              <span className="flex min-h-12 items-center gap-2 rounded-2xl bg-surface px-4 py-2">
                <WarningMark />
                Not safe to drive
              </span>
            </p>
          )}

          {model.bac === null || !estimate ? (
            <section className="flex flex-col gap-3 rounded-[36px] bg-surface p-6">
              <h2 className="text-[28px] leading-tight font-bold">Add your weight to see an estimate</h2>
              <p className="text-lg text-ink-2">
                {model.hasDrinks ? "Your drinks are saved and counted." : "Your drinks still get saved without it."}
              </p>
              <button
                type="button"
                onClick={props.onAddDetails}
                className="press min-h-14 rounded-2xl bg-surface-3 px-4 text-lg font-bold active:bg-line"
              >
                Add details
              </button>
            </section>
          ) : (
            <>
              <FluidGauge bac={model.bac} peak={model.peak} status={estimate.status} />
              <p className="px-1 text-lg text-ink">
                {estimate.backToZero && (
                  <span className="block">
                    <span className="font-bold">Back to zero</span> {estimate.backToZero}
                  </span>
                )}
                <span className="block text-base text-ink-2">Estimate only. Bodies and pours vary.</span>
              </p>
            </>
          )}

          {props.error && (
            <p role="alert" className="rounded-2xl bg-surface-2 p-4 text-lg font-semibold text-alert">
              {props.error}
            </p>
          )}

          <TimelineCard simulation={model.simulation} now={now} onExpand={props.onShowTimeline} />
          <div ref={getHomeRef} className="scroll-mt-16">
            <GetHome />
          </div>
          <TonightList drinks={drinks} onRemove={props.onRemove} />
        </div>
      </main>

      <footer className="app-dock bg-bg">
        <AddDock
          repeat={props.repeat}
          recents={props.recents}
          lastDrink={props.lastDrink}
          notice={props.notice}
          now={now}
          onAdd={props.onAdd}
          onOpenAdd={props.onOpenAdd}
          onUndo={props.onUndo}
        />
      </footer>
    </div>
  );
}
