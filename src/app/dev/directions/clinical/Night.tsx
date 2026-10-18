"use client";

import { MessageSquare, Phone, CarFront } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

import { DrinkIcon, drinkKind } from "~/components/night/DrinkIcon";
import { WarningMark } from "~/components/night/WarningMark";
import { useRegion } from "~/hooks/useRegion";
import { callLabel } from "~/lib/emergency";
import { drinkLabel, formatPoint, timeAgo } from "~/lib/estimate-display";
import { formatClock } from "~/lib/format-clock";
import { dockStatus, useSampleNight, type SampleNight } from "../_kit/useSampleNight";
import { ClinicalCurve, ResultPanel, ResultRows } from "./Result";

const COME_GET_ME = "Hey, can you come and get me? I've been drinking and need a lift home.";

export function ClinicalNight() {
  const night = useSampleNight();
  const { std } = useRegion();
  const { model } = night;
  const getHomeRef = useRef<HTMLDivElement>(null);

  return (
    <div className="app-shell fixed inset-0 bg-bg text-ink">
      <header className="app-top flex w-full items-center gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 lg:px-8">
        <p className="min-w-0 flex-1 truncate text-xl font-bold tracking-[-0.02em]">BACulator</p>
        <button
          type="button"
          onClick={() => getHomeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className="press min-h-12 rounded-xl bg-surface-2 px-4 text-lg font-semibold whitespace-nowrap active:bg-surface-3"
        >
          Get home
        </button>
        <button type="button" className="press min-h-12 min-w-12 rounded-xl bg-surface-2 px-4 text-lg font-semibold active:bg-surface-3">
          You
        </button>
      </header>

      <main className="app-main min-h-0 overflow-y-auto overscroll-contain">
        <div className="clin-cols mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 pb-6 lg:px-8">
          {model.notSafeToDrive && (
            <p role="status" className="clin-sticky-warn sticky top-0 z-10 -mx-4 bg-bg px-4 pt-1 pb-2 lg:-mx-8 lg:px-8">
              <span className="flex min-h-14 items-center gap-3 rounded-[14px] bg-surface px-4 text-xl font-bold text-alert">
                <WarningMark className="size-6" />
                <span className="flex-1 whitespace-nowrap max-[360px]:text-lg">Not safe to drive</span>
                {model.bac !== null && model.bac > 0 && (
                  <span className="text-lg font-semibold whitespace-nowrap text-ink max-[360px]:text-lg">about {formatPoint(model.bac)}</span>
                )}
              </span>
            </p>
          )}

          <div className="flex flex-col gap-4">
            {model.bac === null ? (
              <section className="flex flex-col gap-3 rounded-[18px] bg-surface p-6">
                <h2 className="text-[26px] leading-tight font-bold">Add your weight to see an estimate</h2>
                <p className="text-lg text-ink-2">{model.hasDrinks ? "Your drinks are saved and counted." : "Your drinks still get saved without it."}</p>
                <button type="button" onClick={() => night.setWeight(75)} className="press min-h-14 rounded-xl bg-ink px-4 text-lg font-bold text-bg">
                  Add details
                </button>
              </section>
            ) : (
              <>
                <ResultPanel night={night} />
                <ResultRows night={night} std={std} />
                <p className="px-1 text-lg font-medium text-ink-2">
                  Estimate only. Bodies and pours vary. Widmark model, 75 kg, female. The likely range is 0.75 to 1.4 times the model.
                </p>
              </>
            )}
            {model.simulation && model.simulation.samples.length > 1 && (
              <section aria-labelledby="curve-heading" className="rounded-[18px] bg-surface p-5">
                <h2 id="curve-heading" className="text-[22px] font-bold">
                  Tonight&apos;s curve
                </h2>
                <p className="text-lg text-ink-2">Drag across it to read any time.</p>
                <div className="mt-3">
                  <ClinicalCurve simulation={model.simulation} now={night.now} />
                </div>
              </section>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div ref={getHomeRef} className="scroll-mt-20">
              <GettingHome />
            </div>
            <Tab night={night} std={std} />
          </div>
        </div>
      </main>

      <footer className="app-dock bg-bg">
        <Dock night={night} std={std} />
      </footer>
    </div>
  );
}

function GettingHome() {
  const { emergency } = useRegion();
  const call = callLabel(emergency);
  const row = "press flex min-h-14 items-center gap-3 rounded-xl px-4 text-lg font-semibold active:bg-line";
  return (
    <section aria-labelledby="home-heading" className="rounded-[18px] bg-surface-2 p-5">
      <h2 id="home-heading" className="text-[22px] font-bold">
        Getting home
      </h2>
      <p className="mt-2 text-lg font-semibold">
        {call} if someone can&apos;t be woken, is breathing slowly, or is vomiting while drowsy. Stay with them.
      </p>
      <div className="mt-4 flex flex-col gap-2.5">
        <a href={`tel:${emergency.dial}`} className={`${row} bg-surface font-bold text-alert`}>
          <Phone aria-hidden="true" className="size-6" strokeWidth={2.25} />
          {call}
        </a>
        <div className="grid grid-cols-2 gap-2.5">
          <a href={`sms:?&body=${encodeURIComponent(COME_GET_ME)}`} className={`${row} bg-surface-3`}>
            <MessageSquare aria-hidden="true" className="size-6" strokeWidth={2.25} />
            Text a mate
          </a>
          <a href="https://www.google.com/maps/search/taxi+near+me" target="_blank" rel="noopener noreferrer" className={`${row} bg-surface-3`}>
            <CarFront aria-hidden="true" className="size-6" strokeWidth={2.25} />
            Find a ride
          </a>
        </div>
      </div>
      <p className="mt-3 text-lg text-ink-2">Text a mate opens a message saying you need a lift. You pick who it goes to.</p>
      <p className="mt-1 flex gap-6 text-lg">
        <Link href="/terms" className="min-h-12 py-3 text-ink-2 underline underline-offset-4">
          Terms
        </Link>
        <Link href="/privacy" className="min-h-12 py-3 text-ink-2 underline underline-offset-4">
          Privacy
        </Link>
      </p>
    </section>
  );
}

function Tab({ night, std }: { night: SampleNight; std: (n: number) => string }) {
  if (night.drinks.length === 0) return null;
  const newest = [...night.drinks].sort((a, b) => b.finishedAt.getTime() - a.finishedAt.getTime());
  return (
    <section aria-labelledby="tab-heading" className="rounded-[18px] bg-surface p-5">
      <header className="flex items-end justify-between gap-4">
        <h2 id="tab-heading" className="text-[22px] font-bold">
          Your tab
          <span className="block text-lg font-medium text-ink-2">Last 24 hours</span>
        </h2>
        <p className="text-right">
          <span className="block text-[32px] leading-none font-bold">{std(night.totalStd)}</span>
          <span className="block text-lg font-medium text-ink-2">standard drinks</span>
        </p>
      </header>
      <ul className="mt-3 flex flex-col">
        {newest.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-4 py-2.5">
            <div className="min-w-0">
              <p className="text-lg font-semibold">{drinkLabel(d, std)}</p>
              <p className="text-lg text-ink-2">
                {formatClock(d.finishedAt)} · {std(d.standards)} std
              </p>
            </div>
            <button
              type="button"
              onClick={() => night.remove(d)}
              aria-label={`Remove ${drinkLabel(d, std)} at ${formatClock(d.finishedAt)}`}
              className="min-h-12 shrink-0 rounded-lg bg-surface-3 px-4 text-lg font-semibold text-ink-2 active:bg-line"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Dock({ night, std, compact = false }: { night: SampleNight; std: (n: number) => string; compact?: boolean }) {
  const s = dockStatus(night, std);
  const { repeat, last } = night;
  const shortcuts = night.recents.slice(0, 2);
  return (
    <div className={`mx-auto flex w-full flex-col gap-2.5 px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] ${compact ? "" : "max-w-[480px] lg:max-w-none lg:px-8"}`}>
      {!compact && (
        <div className={`flex min-h-14 items-center gap-3 rounded-[14px] px-4 ${s.live ? "bg-surface-3" : "bg-surface"}`}>
          <p aria-live="polite" className="min-w-0 flex-1 truncate text-lg">
            <span key={s.live?.at ?? "idle"} className="snack inline">
              {s.lead && <span className={s.live ? "font-bold" : "font-medium text-ink-2"}>{s.lead}: </span>}
              <span className="font-semibold">{s.label}</span>
              {!s.live && last && <span className="font-medium text-ink-2"> · {timeAgo(last.finishedAt, night.now)}</span>}
            </span>
          </p>
          {s.action && (
            <button type="button" onClick={night.undo} className="press min-h-12 shrink-0 rounded-[10px] bg-bg px-4 text-lg font-bold active:bg-surface">
              {s.action}
            </button>
          )}
        </div>
      )}
      {repeat ? (
        <button
          type="button"
          onClick={() => night.add(repeat)}
          className="press dock-primary mt-1 flex min-h-[88px] w-full items-center gap-4 rounded-[18px] bg-ink px-5 text-left text-bg active:bg-ink-2"
        >
          <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-bg text-ink">
            <DrinkIcon kind={drinkKind(repeat)} className="size-8" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[26px] leading-tight font-bold whitespace-nowrap">{last ? "+ Add another" : "+ Add"}</span>
            <span className="block truncate text-lg font-semibold">
              {drinkLabel(repeat, std)} · {std(repeat.standards)} std
            </span>
          </span>
        </button>
      ) : (
        <button type="button" className="press dock-primary mt-1 flex min-h-[88px] w-full items-center rounded-[18px] bg-ink px-5 text-[26px] font-bold text-bg">
          + Add a drink
        </button>
      )}
      {repeat && (
        <div className="dock-recents grid grid-cols-2 gap-3">
          {shortcuts.map((d) => (
            <button
              key={`${d.name}|${d.standards}`}
              type="button"
              onClick={() => night.add(d)}
              className="press flex min-h-16 items-center gap-3 rounded-[14px] bg-surface-3 px-3 py-2 text-left active:bg-line"
            >
              <DrinkIcon kind={drinkKind(d)} className="size-6" />
              <span className="min-w-0">
                <span className="line-clamp-2 text-lg leading-tight font-bold">{drinkLabel(d, std)}</span>
                <span className="block text-lg font-medium text-ink-2">{std(d.standards)} std</span>
              </span>
            </button>
          ))}
          {!compact && (
            <button type="button" className="press col-span-2 flex min-h-12 items-center justify-center rounded-[14px] bg-surface-3 text-lg font-bold active:bg-line">
              + New drink
            </button>
          )}
        </div>
      )}
      {repeat && !compact && (
        <button type="button" className="press dock-new-compact hidden min-h-14 items-center justify-center rounded-[14px] bg-surface-3 text-lg font-bold active:bg-line">
          + New drink
        </button>
      )}
    </div>
  );
}
