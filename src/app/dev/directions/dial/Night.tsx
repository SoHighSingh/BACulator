"use client";

import { User } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { useUserInfo } from "~/components/UserInfoSlideOutProvider";
import { DrinkIcon, drinkKind } from "~/components/night/DrinkIcon";
import { WarningMark } from "~/components/night/WarningMark";
import { useRegion } from "~/hooks/useRegion";
import { callLabel } from "~/lib/emergency";
import type { NightSimulation } from "~/lib/bac-calculator";
import { drinkLabel, formatPoint, timeAgo } from "~/lib/estimate-display";
import { formatClock, formatHour } from "~/lib/format-clock";
import { curveWindow, pathOf, useScrub, valueAt, type CurveWindow } from "../_kit/curve";
import { dockStatus, useSampleNight, type SampleNight } from "../_kit/useSampleNight";
import { Dial, dialTimes } from "./Dial";

const COME_GET_ME = "Hey, can you come and get me? I've been drinking and need a lift home.";
const EMPTY_WIN = { t0: 0, t1: 1 };

export function Night() {
  const night = useSampleNight();
  // Everything here is clock-driven; draw it once on the client so server and client agree.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const sim = night.model.simulation;
  const win = useMemo(() => (sim && sim.samples.length > 1 ? curveWindow(sim, night.now) : null), [sim, night.now]);
  const scrub = useScrub(win ?? EMPTY_WIN);
  const getHome = useRef<HTMLDivElement>(null);
  const { openUserInfo } = useUserInfo();

  if (!ready) return <div className="fixed inset-0 bg-bg" />;

  const { model } = night;
  const hasEstimate = model.bac !== null && model.estimate !== null;

  return (
    <div className="app-shell dial-shell fixed inset-0 bg-bg text-ink">
      <header className="app-top mx-auto flex w-full max-w-[480px] items-center gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 lg:max-w-none lg:px-0">
        <h1 className="x-wide min-w-0 flex-1 truncate text-[22px] max-[360px]:text-lg">BACulator</h1>
        <button
          type="button"
          onClick={() => getHome.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className="press dial-key min-h-12 rounded-[12px] px-4 text-lg font-semibold whitespace-nowrap max-[360px]:px-3"
        >
          Get home
        </button>
        <button
          type="button"
          onClick={openUserInfo}
          className="press dial-key flex min-h-12 min-w-12 items-center gap-1.5 rounded-[12px] px-3 text-lg font-semibold"
        >
          <User aria-hidden="true" className="size-5 max-[360px]:hidden" strokeWidth={2.25} />
          You
        </button>
      </header>

      <aside className="dial-aside">
        {hasEstimate ? <Gauge night={night} ghostT={scrub.t} wide /> : <NoWeight night={night} />}
      </aside>

      <main className="app-main min-h-0 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-[480px] px-4 pb-8 lg:max-w-none lg:px-0">
          {model.notSafeToDrive && (
            <p role="status" className="sticky top-0 z-10 -mx-4 bg-bg px-4 pt-1 pb-2 lg:mx-0 lg:px-0">
              <span className="flex min-h-12 items-center gap-2.5 rounded-[12px] bg-surface px-4 text-alert max-[360px]:gap-2 max-[360px]:px-3">
                <WarningMark className="size-6" />
                <span className="flex-1 text-xl font-bold whitespace-nowrap [font-stretch:112%] max-[360px]:text-lg">Not safe to drive</span>
                {model.bac !== null && model.bac > 0 && (
                  <span className="text-lg font-semibold whitespace-nowrap text-ink max-[360px]:text-base">about {formatPoint(model.bac)}</span>
                )}
              </span>
            </p>
          )}

          <div className="flex flex-col gap-5">
            <div className="lg:hidden">{hasEstimate ? <Gauge night={night} ghostT={scrub.t} /> : <NoWeight night={night} />}</div>

            <div className="flex flex-col gap-5">
              {sim && win && <CurveCard sim={sim} now={night.now} win={win} scrub={scrub} />}
              <div ref={getHome} className="scroll-mt-20">
                <GettingHome />
              </div>
              <YourTab night={night} />
            </div>
          </div>
        </div>
      </main>

      <footer className="app-dock bg-bg">
        <div className="mx-auto w-full max-w-[480px] lg:max-w-none">
          <Dock night={night} />
        </div>
      </footer>
    </div>
  );
}

function Gauge({ night, ghostT, wide = false }: { night: SampleNight; ghostT: number | null; wide?: boolean }) {
  const { model, now, drinks } = night;
  const times = dialTimes(model.simulation, drinks, now);
  return (
    <section aria-label="Estimate" className="flex flex-col items-center pt-2">
      <Dial
        simulation={model.simulation}
        drinks={drinks}
        now={now}
        point={night.point}
        likely={night.likely}
        ghostT={ghostT}
        className={wide ? "w-[min(520px,56vh)]" : "w-full max-w-[340px]"}
      />
      {model.peak && (
        <p className="mt-4 text-center text-lg font-semibold text-ink">
          Still rising: about {formatPoint(model.peak.bac)} by {formatClock(model.peak.at)}
        </p>
      )}

      {times.early !== null && times.late !== null && (
        <div className="mt-5 w-full max-w-[400px] rounded-[16px] bg-surface px-5 py-4">
          <p className="sr-only">
            Back to zero between {formatClock(times.early)} and {formatClock(times.late)}
          </p>
          <div aria-hidden="true">
            <p className="text-lg text-ink-2">Back to zero between</p>
            <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-end gap-3">
              <Complication time={times.early} label="earliest" />
              <span className="pb-8 text-lg text-ink-2">and</span>
              <Complication time={times.late} label="latest" align="end" />
            </div>
          </div>
        </div>
      )}

      <ul className="mt-4 flex w-full max-w-[400px] flex-wrap gap-x-6 gap-y-1 px-1 text-lg text-ink-2" aria-label="Reading the dial">
        <li className="flex items-center gap-2.5">
          <span aria-hidden="true" className="h-2.5 w-6 rounded-[2px] bg-[var(--dial-lume)]" />
          Tonight so far
        </li>
        {times.early !== null && (
          <li className="flex items-center gap-2.5">
            <span aria-hidden="true" className="h-4 w-6 rounded-[2px] bg-[var(--dial-lume)] opacity-30" />
            Back to zero
          </li>
        )}
      </ul>
      <p className="mt-2 w-full max-w-[400px] px-1 text-lg text-ink-2">Estimate only. Bodies and pours vary.</p>
    </section>
  );
}

function Complication({ time, label, align = "start" }: { time: number; label: string; align?: "start" | "end" }) {
  const [clock, period] = formatClock(time).split(" ");
  return (
    <p className={align === "end" ? "text-right" : ""}>
      <span className="x-wide block text-[34px] leading-none text-ink">
        {clock}
        <span className="ml-1 text-xl text-ink">{period}</span>
      </span>
      <span className="mt-1.5 block text-lg text-ink-2">{label}</span>
    </p>
  );
}

function NoWeight({ night }: { night: SampleNight }) {
  return (
    <section className="flex flex-col gap-3 rounded-[16px] bg-surface p-6">
      <h2 className="x-wide text-[28px] leading-tight">Add your weight to see an estimate</h2>
      <p className="text-lg text-ink-2">
        {night.model.hasDrinks ? "Your drinks are saved and counted." : "Your drinks still get saved without it."}
      </p>
      <button type="button" onClick={() => night.setWeight(75)} className="press dial-key min-h-14 rounded-[12px] px-4 text-lg font-bold">
        Add details
      </button>
    </section>
  );
}

const CH = 170;
const CW = 400;

function CurveCard({ sim, now, win, scrub }: { sim: NightSimulation; now: Date; win: CurveWindow; scrub: ReturnType<typeof useScrub> }) {
  const id = useId().replace(/:/g, "");
  const padTop = 14;
  const padBottom = 6;
  const x = (t: number) => ((t - win.t0) / (win.t1 - win.t0)) * CW;
  const y = (b: number) => padTop + (1 - b / win.max) * (CH - padTop - padBottom);
  const line = pathOf(win.shown.map((s) => [x(s.t), y(s.bac)]));
  const nowT = now.getTime();
  const nowX = x(nowT);
  const picked = scrub.t ?? nowT;
  const pickedBac = valueAt(sim.samples, picked);

  return (
    <section aria-labelledby="dial-curve" className="rounded-[16px] bg-surface p-5">
      <h2 id="dial-curve" className="x-wide text-[22px]">
        Tonight&apos;s curve
      </h2>
      <p className="mt-0.5 text-lg text-ink-2">Drag across it to see any time.</p>
      <p className="mt-3 flex min-h-8 items-baseline justify-between gap-3 text-lg">
        <span className="font-semibold text-ink">{scrub.t === null ? "Now" : formatClock(picked)}</span>
        <span className="font-bold text-ink">about {formatPoint(pickedBac)}</span>
      </p>
      <div ref={scrub.box} {...scrub.handlers} className="curve-reveal relative mt-1 select-none" style={{ height: CH, touchAction: "pan-y" }}>
        <svg aria-hidden="true" viewBox={`0 0 ${CW} ${CH}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
          <defs>
            <clipPath id={`p-${id}`}>
              <rect x={-4} y={-4} width={Math.max(0, nowX + 4)} height={CH + 8} />
            </clipPath>
            <clipPath id={`f-${id}`}>
              <rect x={nowX} y={-4} width={Math.max(0, CW - nowX + 4)} height={CH + 8} />
            </clipPath>
          </defs>
          <line x1={nowX} x2={nowX} y1={0} y2={CH} stroke="var(--color-ink-2)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
          <path
            d={line}
            clipPath={`url(#p-${id})`}
            fill="none"
            stroke="var(--dial-champagne)"
            strokeWidth={3}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={line}
            clipPath={`url(#f-${id})`}
            fill="none"
            stroke="var(--dial-champagne)"
            strokeWidth={3}
            strokeDasharray="6 6"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {scrub.t !== null && (
            <line x1={x(picked)} x2={x(picked)} y1={0} y2={CH} stroke="var(--color-ink)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
          )}
        </svg>
        <span
          className="pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-bg"
          style={{ left: `${(nowX / CW) * 100}%`, top: y(valueAt(sim.samples, nowT)) }}
        />
        {scrub.t !== null && (
          <span
            className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink"
            style={{ left: `${(x(picked) / CW) * 100}%`, top: y(pickedBac) }}
          />
        )}
      </div>
      <div aria-hidden="true" className="relative mt-2 h-7 text-lg text-ink-2">
        {win.hours.filter((t) => x(t) / CW > 0.08 && x(t) / CW < 0.92).map((t) => (
          <span key={t} className="absolute top-0 -translate-x-1/2" style={{ left: `${(x(t) / CW) * 100}%` }}>
            {formatHour(t)}
          </span>
        ))}
      </div>
    </section>
  );
}

function GettingHome() {
  const { emergency } = useRegion();
  const call = callLabel(emergency);
  return (
    <section aria-labelledby="dial-home" className="rounded-[16px] bg-surface p-5">
      <h2 id="dial-home" className="x-wide text-[22px]">
        Getting home
      </h2>
      <p className="mt-2 text-lg font-semibold text-ink">
        {call} if someone can&apos;t be woken, is breathing slowly, or is vomiting while drowsy. Stay with them.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <a
          href={`sms:?&body=${encodeURIComponent(COME_GET_ME)}`}
          className="press dial-key flex min-h-14 items-center justify-center rounded-[12px] px-2 text-center text-lg font-semibold"
        >
          Text a mate
        </a>
        <a
          href="https://www.google.com/maps/search/taxi+near+me"
          target="_blank"
          rel="noopener noreferrer"
          className="press dial-key flex min-h-14 items-center justify-center rounded-[12px] px-2 text-center text-lg font-semibold"
        >
          Find a ride
        </a>
        <a
          href={`tel:${emergency.dial}`}
          className="press col-span-2 flex min-h-14 items-center justify-center rounded-[12px] bg-surface-3 text-lg font-bold text-alert shadow-[inset_0_0_0_2px_var(--color-alert)]"
        >
          {call}
        </a>
      </div>
      <p className="mt-3 text-lg text-ink-2">Text a mate opens a message saying you need a lift. You pick who it goes to.</p>
      <p className="mt-1 flex gap-6 text-lg">
        <Link href="/terms" className="flex min-h-12 items-center text-ink-2 underline underline-offset-4">
          Terms
        </Link>
        <Link href="/privacy" className="flex min-h-12 items-center text-ink-2 underline underline-offset-4">
          Privacy
        </Link>
      </p>
    </section>
  );
}

function YourTab({ night }: { night: SampleNight }) {
  const { std } = useRegion();
  if (night.drinks.length === 0) return null;
  const newestFirst = [...night.drinks].sort((a, b) => b.finishedAt.getTime() - a.finishedAt.getTime());
  return (
    <section aria-labelledby="dial-tab" className="rounded-[16px] bg-surface px-5 pt-5 pb-3">
      <header className="flex items-end justify-between gap-4">
        <h2 id="dial-tab" className="x-wide text-[22px]">
          Your tab
          <span className="block text-lg font-medium [font-stretch:100%] tracking-normal text-ink-2">Last 24 hours</span>
        </h2>
        <p className="text-right">
          <span className="x-widest block text-[34px] leading-none">{std(night.totalStd)}</span>
          <span className="block text-lg text-ink-2">standard drinks</span>
        </p>
      </header>
      <ul className="mt-3 flex flex-col">
        {newestFirst.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-4 py-3">
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
              className="press dial-key min-h-12 shrink-0 rounded-[12px] px-4 text-lg font-semibold"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Dock({ night }: { night: SampleNight }) {
  const { std } = useRegion();
  const status = dockStatus(night, std);
  const { repeat, recents, last } = night;
  const shortcuts = recents.slice(0, 2);

  return (
    <div className="flex w-full flex-col gap-2.5 px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:px-0">
      <div className={`flex min-h-14 items-center gap-3 rounded-[14px] px-4 ${status.live ? "bg-surface-3" : "bg-surface"}`}>
        <p aria-live="polite" className="min-w-0 flex-1 truncate text-lg">
          <span key={status.live?.at ?? "idle"} className="snack inline">
            {status.live ? (
              <>
                <span className="font-bold">{status.lead} </span>
                {status.label}
              </>
            ) : status.lead ? (
              <span className="text-ink-2">
                Last: <span className="font-semibold text-ink">{status.label}</span> · {last ? timeAgo(last.finishedAt, night.now) : ""}
              </span>
            ) : (
              <span className="text-ink-2">{status.label}</span>
            )}
          </span>
        </p>
        {status.action && (
          <button
            type="button"
            onClick={night.undo}
            className="press min-h-12 shrink-0 rounded-[10px] bg-bg px-4 text-lg font-bold text-ink shadow-[inset_0_0_0_2px_var(--dial-edge)]"
          >
            {status.action}
          </button>
        )}
      </div>

      {repeat ? (
        <button
          type="button"
          onClick={() => night.add(repeat)}
          className="press dial-champagne dock-primary mt-1.5 flex min-h-[84px] w-full items-center gap-4 rounded-[16px] px-5 text-left"
        >
          <span className="flex size-14 shrink-0 items-center justify-center rounded-[12px] bg-[#0b0b0c]/10">
            <DrinkIcon kind={drinkKind(repeat)} className="size-8" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="x-wide block text-[26px] leading-tight whitespace-nowrap">{last ? "+ Add another" : "+ Add"}</span>
            <span className="block truncate text-lg font-semibold">
              {drinkLabel(repeat, std)} · {std(repeat.standards)} std
            </span>
          </span>
        </button>
      ) : (
        <button
          type="button"
          className="press dial-champagne dock-primary x-wide mt-1.5 flex min-h-[84px] w-full items-center gap-4 rounded-[16px] px-5 text-left text-[26px]"
        >
          + Add a drink
        </button>
      )}

      {repeat && (
        <div className="dock-recents grid grid-cols-2 gap-3">
          {shortcuts.map((d) => (
            <button
              key={`${d.name ?? ""}|${d.standards}`}
              type="button"
              onClick={() => night.add(d)}
              className="press dial-key flex min-h-16 items-center gap-3 rounded-[12px] px-3 py-2 text-left"
            >
              <DrinkIcon kind={drinkKind(d)} className="size-6" />
              <span className="min-w-0">
                <span className="line-clamp-2 text-lg leading-tight font-bold">{drinkLabel(d, std)}</span>
                <span className="block text-lg leading-tight font-medium text-ink-2">{std(d.standards)} std</span>
              </span>
            </button>
          ))}
          <button
            type="button"
            className={`press dial-key flex items-center justify-center rounded-[12px] px-3 text-lg font-bold ${
              shortcuts.length % 2 === 0 ? "col-span-2 min-h-12" : "min-h-16"
            }`}
          >
            + New drink
          </button>
        </div>
      )}
      {repeat && (
        <button type="button" className="press dial-key dock-new-compact hidden min-h-14 items-center justify-center rounded-[12px] text-lg font-bold">
          + New drink
        </button>
      )}
    </div>
  );
}
