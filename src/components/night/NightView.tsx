import { House, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { BrandMark } from "~/components/BrandMark";
import type { LoggedDrink, NewDrink } from "~/hooks/useNight";
import type { NightModel } from "~/lib/estimate-display";
import { AddDock, type Notice, type QuickDrink } from "./AddDock";
import { Estimate } from "./Estimate";
import { EstimateDetails } from "./EstimateDetails";
import { GetHome } from "./GetHome";
import { NightNumbers } from "./NightNumbers";
import { useKeyboardInset } from "./Sheet";
import { TimelineCard, valueAt } from "./TimelineCard";
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
  /** Drinks saved on this phone that haven't reached the account yet (no signal). */
  unsyncedCount?: number;
  onAdd: (drink: QuickDrink) => void;
  onAddNew: (drink: NewDrink) => boolean;
  onOpenAdd: () => void;
  onUndo: () => void;
  onEdit: (drink: LoggedDrink) => void;
  onRemove: (drink: LoggedDrink) => void;
  onOpenProfile: () => void;
  onAddDetails: () => void;
  onShowTimeline: () => void;
  /** Shown with the error when the session has ended. */
  onSignIn?: () => void;
}

const ICON_BUTTON = "glass press relative grid size-12 shrink-0 place-items-center rounded-full";

/**
 * The signed-in night screen (Glass, see DESIGN.md): a still field of light behind the number,
 * solid cards for everything you read, and glass chrome floating over the content: the top bar,
 * the warning pill and the dock. Purely presentational so the dev preview and the real screen match.
 */
export function NightView(props: NightViewProps) {
  const { model, drinks, now } = props;
  const { estimate } = model;
  const getHomeRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const [dockHeight, setDockHeight] = useState(240);
  // The dock rides on top of the on-screen keyboard instead of hiding under it.
  const keyboard = useKeyboardInset(true);

  useEffect(() => {
    const el = dockRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setDockHeight(el.getBoundingClientRect().height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // "Not safe to drive" lives under the number; once the number scrolls away a compact copy
  // joins the floating icons, so the warning is never off screen.
  const estimateRef = useRef<HTMLElement>(null);
  const hasEstimate = model.bac !== null && !!estimate;
  const [showStickyWarning, setShowStickyWarning] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  useEffect(() => {
    const el = estimateRef.current;
    if (!el) {
      setShowStickyWarning(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => setShowStickyWarning(!e?.isIntersecting), { rootMargin: "-80px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasEstimate]);

  const total = drinks.reduce((sum, d) => sum + d.standards, 0);

  return (
    <div className="app-shell fixed inset-0 overflow-hidden bg-bg text-ink">
      {/* Content fades out under the floating icons instead of colliding with them. */}
      <div aria-hidden="true" className="night-scrim pointer-events-none fixed inset-x-0 top-0 z-10 h-[calc(96px_+_env(safe-area-inset-top))]" />
      <main className="app-main h-full overflow-y-auto overscroll-contain">
        <div className="relative">
          <div className={`glass-field ${model.notSafeToDrive ? "is-alert" : ""}`} aria-hidden="true" />
          <div
            className="night-cols relative mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 pt-[max(12px,env(safe-area-inset-top))]"
            style={{ paddingBottom: dockHeight + 24 }}
          >
            {/* No bar: the mark and two icon keys float over the field, so nothing sits between
                the person and the number. */}
            <header className="night-span sticky top-[max(8px,env(safe-area-inset-top))] z-20 flex items-center gap-2">
              {/* Once the number scrolls away, the warning takes the mark's place. */}
              {model.notSafeToDrive && showStickyWarning ? (
                <div className="flex min-w-0 flex-1">
                  <h1 className="sr-only">BACulator</h1>
                  <p role="status" className="glass glass-strong compose-in flex min-h-12 items-center gap-2 rounded-full px-3.5 text-lg font-medium whitespace-nowrap">
                    <WarningMark className="size-5 text-alert" />
                    Not safe to drive
                  </p>
                </div>
              ) : (
                <h1 className="flex-1">
                  <BrandMark size={44} />
                </h1>
              )}
              <button
                type="button"
                aria-label="Get home"
                onClick={() => getHomeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className={ICON_BUTTON}
              >
                <House aria-hidden="true" className="size-6" strokeWidth={2} />
              </button>
              <button type="button" aria-label="You: your details and settings" onClick={props.onOpenProfile} className={ICON_BUTTON}>
                <UserRound aria-hidden="true" className="size-6" strokeWidth={2} />
              </button>
            </header>

            <div className="flex flex-col gap-4">
              {model.bac === null || !estimate ? (
                <section className="card mt-4 flex flex-col gap-3 p-6">
                  {model.notSafeToDrive && (
                    <p role="status" className="flex items-center gap-2 text-lg font-medium text-alert">
                      <WarningMark className="size-5" />
                      Not safe to drive
                    </p>
                  )}
                  <h2 className="text-2xl font-semibold tracking-[-0.02em]">Add your weight to see an estimate</h2>
                  <p className="text-lg text-ink-2">{model.hasDrinks ? "Your drinks are saved and counted." : "Your drinks still get saved without it."}</p>
                  <button type="button" onClick={props.onAddDetails} className="press min-h-14 rounded-full bg-ink text-lg font-medium text-bg">
                    Add details
                  </button>
                </section>
              ) : (
                <Estimate
                  ref={estimateRef}
                  notSafe={model.notSafeToDrive}
                  onOpenDetails={() => setDetailsOpen(true)}
                  bac={model.bac}
                  peak={model.peak}
                  status={estimate.status}
                  hourAgo={model.simulation ? valueAt(model.simulation.samples, now.getTime() - 3_600_000) : null}
                />
              )}

              {props.error && (
                <div role="alert" className="card flex flex-col gap-3 p-4">
                  <p className="text-lg font-medium text-alert">{props.error}</p>
                  {props.onSignIn && (
                    <button type="button" onClick={props.onSignIn} className="press min-h-12 self-start rounded-full bg-ink px-5 text-lg font-medium text-bg">
                      Sign in
                    </button>
                  )}
                </div>
              )}

              <TimelineCard simulation={model.simulation} now={now} onExpand={props.onShowTimeline} />
              {model.hasDrinks && <NightNumbers model={model} drinkCount={drinks.length} totalStandards={total} />}
            </div>

            <div className="flex flex-col gap-4">
              <div ref={getHomeRef} className="scroll-mt-36">
                <GetHome />
              </div>
              <TonightList drinks={drinks} onEdit={props.onEdit} onRemove={props.onRemove} />
            </div>
          </div>
        </div>
      </main>

      <EstimateDetails open={detailsOpen} onClose={() => setDetailsOpen(false)} model={model} />

      <footer
        ref={dockRef}
        className="night-dock glass glass-strong fixed inset-x-2 z-30 mx-auto max-w-[464px] rounded-[28px] p-3"
        style={{ bottom: keyboard > 0 ? keyboard + 6 : "max(8px, env(safe-area-inset-bottom))" }}
      >
        <AddDock
          repeat={props.repeat}
          recents={props.recents}
          lastDrink={props.lastDrink}
          notice={props.notice}
          now={now}
          unsynced={props.unsyncedCount ?? 0}
          onAdd={props.onAdd}
          onAddNew={props.onAddNew}
          onOpenAdd={props.onOpenAdd}
          onUndo={props.onUndo}
        />
      </footer>
    </div>
  );
}
