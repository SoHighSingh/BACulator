import { UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AlertFavicon } from "~/components/AlertFavicon";
import type { LoggedDrink, NewDrink } from "~/hooks/useNight";
import type { NightModel } from "~/lib/estimate-display";
import { AddDock, type Notice, type QuickDrink } from "./AddDock";
import { Estimate } from "./Estimate";
import { EstimateDetails } from "./EstimateDetails";
import { NightNumbers } from "./NightNumbers";
import { NightStatus } from "./NightStatus";
import { useKeyboardInset } from "./Sheet";
import { TimelineCard, valueAt } from "./TimelineCard";
import { TonightList } from "./TonightList";

export interface NightViewProps {
  model: NightModel;
  drinks: LoggedDrink[];
  /** For the curve's minute-by-minute line and drink marks; without them it uses the model's samples. */
  weight?: number | null;
  sex?: string | null;
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
  /** Not used by this view since the tab rows lost their Remove key (22 Oct 2026); removing moves
      into the edit sheet, which NightScreen owns. Kept so the screen's plumbing is unchanged. */
  onRemove: (drink: LoggedDrink) => void;
  onOpenProfile: () => void;
  onAddDetails: () => void;
  onShowTimeline: () => void;
  /** Shown with the error when the session has ended. */
  onSignIn?: () => void;
}

const ICON_BUTTON = "glass press relative grid size-12 shrink-0 place-items-center rounded-key";

/**
 * True for ~1.4s after `flag` flips because of something the person just did (a notice landed in
 * the last 3s: add, undo, remove, add back). Data arriving on load flips the same flag without a
 * notice, and must not play the mark's colour change, the key's reveal or the field's cross-fade.
 * Latched in render so the class is present on the very frame the state changes.
 */
function useAlertChange(alert: boolean, noticeAt: number | null) {
  const prev = useRef(alert);
  const until = useRef(0);
  const now = Date.now();
  if (prev.current !== alert) {
    prev.current = alert;
    if (noticeAt !== null && now - noticeAt < 3000) until.current = now + 1400;
  }
  return now < until.current;
}

/**
 * The signed-in night screen (Glass, see DESIGN.md): a still field of light behind the number,
 * translucent cards for everything you read, and glass chrome floating over the content: the mark
 * with its hazard key, the You key and the dock. Purely presentational so the dev preview and the real
 * screen match.
 */
export function NightView(props: NightViewProps) {
  const { model, drinks, now } = props;
  const { estimate } = model;
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

  const [detailsOpen, setDetailsOpen] = useState(false);
  // Red (field, mark, favicon) from a shown 0.05; the hazard key once the range's top reaches it.
  const animateAlert = useAlertChange(model.alert, props.notice?.at ?? null);
  const animateHazard = useAlertChange(model.hazard, props.notice?.at ?? null);

  return (
    <div className="app-shell fixed inset-0 overflow-hidden bg-bg text-ink">
      {/* Content fades out under the floating icons instead of colliding with them. */}
      <div aria-hidden="true" className="night-scrim pointer-events-none fixed inset-x-0 top-0 z-10 h-[calc(96px_+_env(safe-area-inset-top))]" />
      {/* No painted scrollbar (user decision, 22 Oct 2026; `.app-main` in globals.css): wheel, touch,
          trackpad and keys still scroll it. tabIndex -1 lets a click give it focus for the keys. */}
      <main tabIndex={-1} className="app-main h-full overflow-y-auto overscroll-contain outline-none">
        <div className="relative">
          <div className={`glass-field ${model.alert ? "is-alert" : ""} ${animateAlert ? "is-anim" : ""}`} aria-hidden="true" />
          <AlertFavicon alert={model.alert} />
          <div
            className="night-cols relative mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 pt-[max(12px,env(safe-area-inset-top))]"
            style={{ paddingBottom: dockHeight + 24 }}
          >
            {/* No bar: the mark (with the hazard key beside it once the range reaches 0.05) and the You
                key float over the field, so nothing sits between the person and the number. */}
            <header className="night-header night-span sticky top-[max(8px,env(safe-area-inset-top))] z-20 flex items-center gap-2">
              <NightStatus alert={model.alert} hazard={model.hazard} animate={animateAlert} animateHazard={animateHazard} onOpenDetails={() => setDetailsOpen(true)} />
              <button type="button" aria-label="You: your details and settings" onClick={props.onOpenProfile} className={ICON_BUTTON}>
                <UserRound aria-hidden="true" className="size-6" strokeWidth={2} />
              </button>
            </header>

            <div className="flex flex-col gap-4">
              {model.bac === null || !estimate ? (
                <section className="card mt-4 flex flex-col gap-3 p-6">
                  <h2 className="text-2xl font-semibold tracking-[-0.02em]">Add your weight to see an estimate</h2>
                  <p className="text-lg text-ink-2">{model.hasDrinks ? "Your drinks are saved and counted." : "Your drinks still get saved without it."}</p>
                  <button type="button" onClick={props.onAddDetails} className="press min-h-14 rounded-key bg-ink text-lg font-medium text-bg">
                    Add details
                  </button>
                </section>
              ) : (
                <Estimate
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
                    <button type="button" onClick={props.onSignIn} className="press min-h-12 self-start rounded-key bg-ink px-5 text-lg font-medium text-bg">
                      Sign in
                    </button>
                  )}
                </div>
              )}

              <TimelineCard simulation={model.simulation} now={now} onExpand={props.onShowTimeline} drinks={drinks} weight={props.weight} sex={props.sex} />
              {model.hasDrinks && <NightNumbers model={model} />}
            </div>

            <div className="flex flex-col gap-4">
              <TonightList drinks={drinks} onEdit={props.onEdit} />
            </div>
          </div>
        </div>
      </main>

      <EstimateDetails open={detailsOpen} onClose={() => setDetailsOpen(false)} model={model} />

      <footer
        ref={dockRef}
        className="night-dock glass glass-strong fixed inset-x-2 z-30 mx-auto max-w-[464px] rounded-panel p-3"
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
