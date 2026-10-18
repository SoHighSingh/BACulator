"use client";

import Link from "next/link";
import { useRef } from "react";

import { DrinkIcon, drinkKind } from "~/components/night/DrinkIcon";
import { WarningMark } from "~/components/night/WarningMark";
import { useRegion } from "~/hooks/useRegion";
import { callLabel } from "~/lib/emergency";
import { drinkLabel, formatPoint, timeAgo } from "~/lib/estimate-display";
import { formatClock } from "~/lib/format-clock";
import { dockStatus, useSampleNight } from "../_kit/useSampleNight";
import { FanChart } from "./FanChart";
import { aroundClock } from "./fan";

const COME_GET_ME = "Hey, can you come and get me? I've been drinking and need a lift home.";

// Secondary controls: a 2px boundary at 4.2:1 or better on every surface, square-ish corners.
const SECONDARY =
  "press flex items-center justify-center rounded-lg border-2 border-line bg-surface-2 px-4 text-lg font-semibold text-ink active:bg-surface-3";

export function Night() {
  const night = useSampleNight();
  const { std, emergency } = useRegion();
  const { model, now } = night;
  const status = dockStatus(night, std);
  const getHome = useRef<HTMLElement>(null);
  const animKey = night.drinks.map((d) => d.id).join(",");
  const sim = model.simulation;
  const est = model.estimate;
  const call = callLabel(emergency);
  const newestFirst = [...night.drinks].sort((a, b) => b.finishedAt.getTime() - a.finishedAt.getTime());
  const shortcuts = night.recents.slice(0, 2);

  return (
    <div className="app-shell fx-shell fixed inset-0 bg-bg text-ink">
      <header className="app-top flex w-full items-center gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 lg:px-10">
        <p className="fx-head min-w-0 flex-1 truncate text-[22px] max-[360px]:text-[17px]">BACulator</p>
        <button
          type="button"
          onClick={() => getHome.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className={`${SECONDARY} min-h-12 whitespace-nowrap max-[360px]:px-3 max-[360px]:text-base`}
        >
          Get home
        </button>
        <button type="button" aria-label="You: profile and settings" className={`${SECONDARY} min-h-12 min-w-12 px-3`}>
          You
        </button>
      </header>

      <main className="app-main min-h-0 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-[480px] flex-col gap-6 px-4 pb-8 lg:max-w-[880px] lg:px-10">
          {model.notSafeToDrive && (
            <div role="status" className="sticky top-0 z-10 -mx-4 bg-bg px-4 pt-1 pb-2 lg:-mx-10 lg:px-10">
              <p className="flex min-h-14 items-center gap-3 rounded-lg bg-surface px-4 text-alert max-[360px]:gap-2 max-[360px]:px-3">
                <WarningMark className="size-7 max-[360px]:size-6" />
                <span className="flex-1 text-xl font-extrabold whitespace-nowrap max-[360px]:text-lg">Not safe to drive</span>
                {model.bac !== null && model.bac > 0 && (
                  <span className="text-lg font-semibold whitespace-nowrap text-ink max-[360px]:text-base">about {formatPoint(model.bac)}</span>
                )}
              </p>
            </div>
          )}

          {model.bac === null || !est ? (
            <section className="flex flex-col gap-3 rounded-lg bg-surface p-6">
              <h2 className="fx-head text-[30px] leading-tight">Add your weight to see an estimate</h2>
              <p className="text-lg text-ink-2">
                {model.hasDrinks ? "Your drinks are saved and counted." : "Your drinks still get saved without it."}
              </p>
              <button type="button" onClick={() => night.setWeight(75)} className="press fx-btn-hl min-h-14 rounded-lg px-4 text-lg font-bold">
                Add details
              </button>
            </section>
          ) : (
            <section aria-labelledby="fx-estimate" className="flex flex-col gap-1">
              <h2 id="fx-estimate" className="sr-only">
                Your estimate
              </h2>
              <p className="flex items-baseline gap-3">
                <span className="text-[30px] font-bold">about</span>
                <span className="fx-head text-[88px] leading-[0.95] lg:text-[112px]">{night.point}</span>
              </p>
              {night.likely && <p className="text-[22px] font-semibold">Likely {night.likely}</p>}
              {model.peak && (
                <p className="text-xl font-semibold text-ink">
                  Still rising: about {formatPoint(model.peak.bac)} by {aroundClock(model.peak.at.getTime())}
                </p>
              )}

              {sim && sim.samples.length > 1 && (
                <div className="mt-5">
                  <FanChart sim={sim} now={now} animKey={animKey} plotH={190} />
                  <p className="mt-1 text-base text-ink-2">Drag across the chart to read any time.</p>
                </div>
              )}

              <div className="mt-4 text-lg">
                {est.backToZero && (
                  <p>
                    <span className="font-bold">Back to zero</span> {est.backToZero}
                  </p>
                )}
                <p className="text-base text-ink-2">Estimate only. Bodies and pours vary.</p>
              </div>
            </section>
          )}

          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <section ref={getHome} aria-labelledby="fx-home" className="scroll-mt-20 rounded-lg bg-surface-2 p-5">
              <h2 id="fx-home" className="fx-head text-[26px]">
                Getting home
              </h2>
              <p className="mt-2 text-lg font-semibold">
                {call} if someone can&apos;t be woken, is breathing slowly, or is vomiting while drowsy. Stay with them.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <a href={`sms:?&body=${encodeURIComponent(COME_GET_ME)}`} className={`${SECONDARY} min-h-14 text-center`}>
                  Text a mate
                </a>
                <a href="https://www.google.com/maps/search/taxi+near+me" target="_blank" rel="noopener noreferrer" className={`${SECONDARY} min-h-14 text-center`}>
                  Find a ride
                </a>
                <a
                  href={`tel:${emergency.dial}`}
                  className="press col-span-2 flex min-h-14 items-center justify-center rounded-lg border-2 border-alert bg-bg text-lg font-bold text-alert active:bg-surface"
                >
                  {call}
                </a>
              </div>
              <p className="mt-3 text-base text-ink-2">Text a mate opens a message saying you need a lift. You pick who it goes to.</p>
              <p className="mt-1 flex gap-6 text-base">
                <Link href="/terms" className="flex min-h-12 items-center text-ink-2 underline underline-offset-4">
                  Terms
                </Link>
                <Link href="/privacy" className="flex min-h-12 items-center text-ink-2 underline underline-offset-4">
                  Privacy
                </Link>
              </p>
            </section>

            {newestFirst.length > 0 && (
              <section aria-labelledby="fx-tab" className="rounded-lg bg-surface px-5 pt-5 pb-3">
                <header className="flex items-end justify-between gap-4">
                  <h2 id="fx-tab" className="fx-head text-[26px] leading-tight">
                    Your tab
                    <span className="block text-base font-medium tracking-normal text-ink-2">Last 24 hours</span>
                  </h2>
                  <p className="text-right">
                    <span className="fx-head block text-[34px] leading-none">{std(night.totalStd)}</span>
                    <span className="block text-base font-medium text-ink-2">standard drinks</span>
                  </p>
                </header>
                <ul className="mt-3 flex flex-col">
                  {newestFirst.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <p className="text-lg font-semibold">{drinkLabel(d, std)}</p>
                        <p className="text-base text-ink-2">
                          {formatClock(d.finishedAt)} · {std(d.standards)} std
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => night.remove(d)}
                        aria-label={`Remove ${drinkLabel(d, std)} at ${formatClock(d.finishedAt)}`}
                        className={`${SECONDARY} min-h-12 shrink-0 text-base`}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      </main>

      <footer className="app-dock bg-bg">
        <div className="mx-auto flex w-full max-w-[480px] flex-col gap-2.5 px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:px-6 lg:pb-6">
          <div className={`flex min-h-14 items-center gap-3 rounded-lg px-4 ${status.live ? "bg-surface-3" : "bg-surface lg:bg-surface-2"}`}>
            <p aria-live="polite" className="min-w-0 flex-1 truncate text-lg">
              <span key={status.live?.at ?? "idle"} className="snack inline">
                {status.live ? (
                  <>
                    <span className="font-bold">{status.lead} </span>
                    {status.label}
                  </>
                ) : night.last ? (
                  <span className="font-medium text-ink-2">
                    Last: <span className="font-semibold text-ink">{status.label}</span> · {timeAgo(night.last.finishedAt, now)}
                  </span>
                ) : (
                  <span className="font-medium text-ink-2">{status.label}</span>
                )}
              </span>
            </p>
            {status.action && (
              <button type="button" onClick={night.undo} className={`${SECONDARY} min-h-12 shrink-0 bg-bg font-bold`}>
                {status.action}
              </button>
            )}
          </div>

          {night.repeat ? (
            <button
              type="button"
              onClick={() => night.add(night.repeat!)}
              className="press fx-btn-hl dock-primary mt-1.5 flex min-h-[84px] w-full items-center gap-4 rounded-lg px-5 text-left"
            >
              <DrinkIcon kind={drinkKind(night.repeat)} className="size-9" />
              <span className="min-w-0 flex-1">
                <span className="block text-[26px] leading-tight font-extrabold tracking-[-0.02em] whitespace-nowrap">
                  {night.last ? "+ Add another" : "+ Add"}
                </span>
                <span className="block truncate text-lg font-semibold">
                  {drinkLabel(night.repeat, std)} · {std(night.repeat.standards)} std
                </span>
              </span>
            </button>
          ) : (
            <button type="button" className="press fx-btn-hl dock-primary mt-1.5 flex min-h-[84px] w-full items-center rounded-lg px-5 text-left text-[26px] font-extrabold">
              + Add a drink
            </button>
          )}

          {night.repeat && (
            <div className="dock-recents grid grid-cols-2 gap-3">
              {shortcuts.map((d) => (
                <button
                  key={`${d.name ?? ""}|${d.standards}`}
                  type="button"
                  onClick={() => night.add(d)}
                  className={`${SECONDARY} min-h-16 justify-start gap-3 px-3 py-2 text-left`}
                >
                  <DrinkIcon kind={drinkKind(d)} className="size-6" />
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-lg leading-tight font-bold">{drinkLabel(d, std)}</span>
                    <span className="block text-base font-medium text-ink-2">{std(d.standards)} std</span>
                  </span>
                </button>
              ))}
              <button type="button" className={`${SECONDARY} font-bold ${shortcuts.length % 2 === 0 ? "col-span-2 min-h-12" : "min-h-16"}`}>
                + New drink
              </button>
            </div>
          )}
          {night.repeat && (
            <button type="button" className={`${SECONDARY.replace("flex ", "")} dock-new-compact hidden min-h-14 items-center font-bold`}>
              + New drink
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
