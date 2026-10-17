import { useRef } from "react";

import type { LoggedDrink } from "~/hooks/useNight";
import type { EstimateDisplay } from "~/lib/estimate-display";
import { AddDock, type Notice, type QuickDrink } from "./AddDock";
import { FluidGauge } from "./FluidGauge";
import { GetHome } from "./GetHome";
import { TimelineCard } from "./TimelineCard";
import { TonightList } from "./TonightList";

export interface NightViewProps {
  estimate: EstimateDisplay | null;
  /** Raw point estimate for the gauge; null when the user hasn't given weight and sex. */
  bac: number | null;
  /** Peak still to come from drinks being absorbed, if any. */
  peak: { bac: number; at: Date } | null;
  drinks: LoggedDrink[];
  repeat: QuickDrink | null;
  recents: QuickDrink[];
  lastDrink: LoggedDrink | null;
  notice: Notice | null;
  now: Date;
  busy: boolean;
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

function WarningMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-7 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round">
      <path d="M12 3 2 21h20L12 3Z" />
      <path d="M12 10v5M12 18v.01" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The signed-in night screen, laid out like an app: a fixed top bar, one scrolling column, and a
 * fixed dock for adding. Purely presentational so the dev preview and the real screen match.
 */
export function NightView(props: NightViewProps) {
  const { estimate, bac, drinks, now } = props;
  const getHomeRef = useRef<HTMLDivElement>(null);
  const safeToSay = estimate?.notSafeToDrive ?? false;

  return (
    <div className="app-shell fixed inset-0 flex flex-col bg-bg text-ink">
      <header className="flex shrink-0 items-center gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pr-32 pb-2">
        <h1 className="flex-1 text-xl font-bold tracking-[-0.01em]">BACulator</h1>
        <button
          type="button"
          onClick={() => getHomeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className="press min-h-12 rounded-full bg-surface-2 px-4 text-lg font-semibold active:bg-surface-3"
        >
          Get home
        </button>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 pt-2 pb-6">
          {safeToSay && (
            <p className="flex min-h-12 items-center gap-2 rounded-2xl bg-surface px-4 text-[22px] font-bold text-alert">
              <WarningMark />
              Not safe to drive
            </p>
          )}

          {bac === null || !estimate ? (
            <section className="flex flex-col gap-3 rounded-[36px] bg-surface p-6">
              <h2 className="text-[28px] leading-tight font-bold">Add your weight to see an estimate</h2>
              <p className="text-lg text-ink-2">Your drinks still get saved without it.</p>
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
              <FluidGauge bac={bac} peak={props.peak} status={estimate.status} />
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

          <TimelineCard
            drinks={drinks}
            userWeight={props.userWeight}
            userSex={props.userSex}
            now={now}
            onExpand={props.onShowTimeline}
          />
          <TonightList drinks={drinks} onRemove={props.onRemove} />
          <div ref={getHomeRef} className="scroll-mt-4">
            <GetHome />
          </div>
        </div>
      </main>

      <footer className="shrink-0 bg-bg">
        <AddDock
          repeat={props.repeat}
          recents={props.recents}
          lastDrink={props.lastDrink}
          notice={props.notice}
          now={now}
          busy={props.busy}
          onAdd={props.onAdd}
          onOpenAdd={props.onOpenAdd}
          onUndo={props.onUndo}
        />
      </footer>
    </div>
  );
}
