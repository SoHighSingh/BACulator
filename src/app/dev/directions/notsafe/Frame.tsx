"use client";

import { House, Plus, Search, Mic, UserRound } from "lucide-react";

import { GetHome } from "~/components/night/GetHome";
import { NightNumbers } from "~/components/night/NightNumbers";
import { TimelineCard, valueAt } from "~/components/night/TimelineCard";
import { useRegion } from "~/hooks/useRegion";
import { drinkLabel, timeAgo } from "~/lib/estimate-display";
import type { SampleNight } from "../_kit/useSampleNight";
import { EstimateCopy } from "./EstimateCopy";

const ICON_BUTTON = "glass press relative grid size-12 shrink-0 place-items-center rounded-full";
/** How far the frame is "scrolled" in the scrolled state: the number is gone, the curve is under the icons. */
export const SCROLL = 420;

export interface Treatment {
  /** Left of the header row (the mark's place), per state. */
  headerLeft: (scrolled: boolean) => React.ReactNode;
  heading?: React.ReactNode;
  underNumber?: React.ReactNode;
  underBar?: React.ReactNode;
  /** First item of the cards stack, before Tonight. */
  cardRow?: React.ReactNode;
}

/** A 375×812 copy of the top of the night screen on the red field, with one treatment applied. */
export function Frame({ night, t, scrolled }: { night: SampleNight; t: Treatment; scrolled: boolean }) {
  const { std } = useRegion();
  const { model, now, drinks, last } = night;
  const est = model.estimate;

  return (
    <div className="ns-frame rounded-[28px] shadow-[0_0_0_1px_rgb(255_255_255/0.08)]" data-frame>
      <div className="ns-field" aria-hidden="true" />
      <div aria-hidden="true" className="ns-scrim pointer-events-none absolute inset-x-0 top-0 z-10 h-24" />

      <header className="absolute inset-x-4 z-20 flex items-center gap-2" style={{ top: scrolled ? 8 : 12 }}>
        {t.headerLeft(scrolled)}
        <button type="button" aria-label="Get home" className={ICON_BUTTON}>
          <House aria-hidden="true" className="size-6" strokeWidth={2} />
        </button>
        <button type="button" aria-label="You: your details and settings" className={ICON_BUTTON}>
          <UserRound aria-hidden="true" className="size-6" strokeWidth={2} />
        </button>
      </header>

      <div className="relative flex flex-col gap-4 px-4 pt-3" style={{ transform: scrolled ? `translateY(-${SCROLL}px)` : undefined }}>
        <div className="h-12" />
        {model.bac !== null && est && (
          <EstimateCopy
            bac={model.bac}
            peak={model.peak}
            status={est.status}
            hourAgo={model.simulation ? valueAt(model.simulation.samples, now.getTime() - 3_600_000) : null}
            heading={t.heading}
            underNumber={t.underNumber}
            underBar={t.underBar}
          />
        )}
        {t.cardRow}
        <TimelineCard simulation={model.simulation} now={now} onExpand={() => undefined} />
        {model.hasDrinks && <NightNumbers model={model} drinkCount={drinks.length} totalStandards={night.totalStd} />}
        <GetHome />
      </div>

      <div className="glass glass-strong absolute inset-x-2 bottom-2 z-30 rounded-[28px] p-3">
        <div className="flex flex-col gap-2.5">
          <p className="flex min-h-12 items-center px-2 text-lg">
            {last ? (
              <span className="truncate">
                <span className="text-ink-2">Last: </span>
                <span className="font-medium">{drinkLabel(last, std)}</span>
                <span className="text-ink-2"> · {timeAgo(last.finishedAt, now)}</span>
              </span>
            ) : (
              <span className="text-ink-2">Nothing added yet tonight</span>
            )}
          </p>
          <button type="button" className="press key-glow flex min-h-[72px] items-center justify-center gap-2.5 rounded-full bg-ink px-6 text-xl font-medium text-bg">
            <Plus aria-hidden="true" className="size-6 shrink-0" strokeWidth={2.5} />
            <span className="truncate">Add another {night.repeat ? drinkLabel(night.repeat, std).toLowerCase() : "drink"}</span>
          </button>
          <div className="flex min-h-14 items-center gap-3 rounded-full bg-white/[0.06] py-1 pr-1 pl-4 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]">
            <Search aria-hidden="true" className="size-5 text-ink-2" />
            <span className="flex-1 text-lg text-ink-2">Type or say a drink</span>
            <span className="grid size-12 place-items-center rounded-full bg-white/10">
              <Mic aria-hidden="true" className="size-5" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
