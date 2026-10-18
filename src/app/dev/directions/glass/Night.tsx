"use client";

import { CarFront, MessageSquare, Phone, Plus, TrendingDown, TrendingUp, UserRound } from "lucide-react";
import Link from "next/link";
import { useId, useRef } from "react";

import { DrinkIcon, drinkKind } from "~/components/night/DrinkIcon";
import { WarningMark } from "~/components/night/WarningMark";
import { useRegion } from "~/hooks/useRegion";
import type { NightSimulation } from "~/lib/bac-calculator";
import { drinkLabel, formatBand, formatPoint, timeAgo } from "~/lib/estimate-display";
import { formatClock, formatHour } from "~/lib/format-clock";
import { BAND_HIGH, BAND_LOW, curveWindow, pathOf, useScrub, valueAt } from "../_kit/curve";
import { dockStatus, useSampleNight, type SampleNight } from "../_kit/useSampleNight";
import { ComposerDock } from "./Composer";

type Std = (n: number) => string;

/** Move the pointer light on .g-lit elements. */
export function lightAt(e: React.PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
}

function useChanged(value: string | null) {
  const prev = useRef(value);
  const changed = prev.current !== null && prev.current !== value;
  prev.current = value;
  return changed;
}

export function GlassNight() {
  const night = useSampleNight();
  const { std } = useRegion();
  const homeRef = useRef<HTMLDivElement>(null);
  const { model } = night;

  return (
    <div className="fixed inset-0 overflow-hidden bg-[var(--g-bg)]">
      <main className="app-main h-full overflow-y-auto overscroll-contain">
        <div className="relative">
          <div className="g-field" aria-hidden="true" />
          <div className="g-cols relative mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-[340px] lg:px-8 lg:pb-12">
            <header className="g-glass g-span sticky top-[max(8px,env(safe-area-inset-top))] z-20 flex items-center gap-2 rounded-2xl py-2 pr-2 pl-4">
              <p className="flex-1 text-lg font-semibold tracking-[-0.02em]">BACulator</p>
              <button
                type="button"
                onClick={() => homeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="g-press min-h-12 rounded-xl px-4 text-lg font-medium text-[var(--g-ink)] hover:bg-white/5 active:bg-white/10"
              >
                Get home
              </button>
              <button type="button" className="g-press flex min-h-12 items-center gap-2 rounded-xl px-3 text-lg font-medium hover:bg-white/5 active:bg-white/10">
                <UserRound aria-hidden="true" className="size-5" strokeWidth={2} />
                You
              </button>
            </header>

            {model.notSafeToDrive && (
              <p role="status" className="g-glass g-glass-strong g-span sticky top-[calc(max(8px,env(safe-area-inset-top))+76px)] z-10 flex min-h-12 items-center gap-3 rounded-full px-4 text-lg font-medium">
                <WarningMark className="size-5 text-[var(--g-alert)]" />
                <span className="flex-1">Not safe to drive</span>
                {model.bac !== null && model.bac > 0 && <span className="text-[var(--g-ink-2)]">about {formatPoint(model.bac)}</span>}
              </p>
            )}

            <div className="flex flex-col gap-4">
              {model.bac === null ? (
                <section className="g-card flex flex-col gap-3 p-6">
                  <h2 className="text-2xl font-semibold tracking-[-0.02em]">Add your weight to see an estimate</h2>
                  <p className="text-lg text-[var(--g-ink-2)]">{model.hasDrinks ? "Your drinks are saved and counted." : "Your drinks still get saved without it."}</p>
                  <button type="button" onClick={() => night.setWeight(75)} className="g-press min-h-14 rounded-xl bg-[var(--g-ink)] text-lg font-semibold text-[var(--g-bg)]">
                    Add details
                  </button>
                </section>
              ) : (
                <Estimate night={night} />
              )}
              {model.simulation && model.simulation.samples.length > 1 && <Curve simulation={model.simulation} now={night.now} />}
              <Rows night={night} std={std} />
            </div>

            <div className="flex flex-col gap-4">
              <div ref={homeRef} className="scroll-mt-40">
                <GettingHome />
              </div>
              <Tab night={night} std={std} />
            </div>
          </div>
        </div>
      </main>

      <footer className="g-dock g-glass g-glass-strong fixed inset-x-2 bottom-[max(8px,env(safe-area-inset-bottom))] z-30 mx-auto max-w-[464px] rounded-[28px] p-3">
        <ComposerDock night={night} std={std} />
      </footer>
    </div>
  );
}

export function Estimate({ night, size = "md" }: { night: SampleNight; size?: "md" | "lg" }) {
  const bac = night.model.bac ?? 0;
  const point = night.point;
  const changed = useChanged(point);
  const [lo, hi] = formatBand(bac).split("–");
  const scale = Math.max(0.2, bac * BAND_HIGH * 1.12);
  const pct = (v: number) => `${Math.min(100, (v / scale) * 100)}%`;
  const rising = night.model.peak && night.model.peak.bac > bac + 0.004 ? night.model.peak : null;

  return (
    <section aria-labelledby="g-est" className="px-1 pt-6 pb-2">
      <h2 id="g-est" className="text-lg font-medium text-[var(--g-ink-2)]">
        Estimated blood alcohol
      </h2>
      <p className="mt-2 flex items-baseline gap-3" aria-hidden="true">
        <span className="text-2xl font-medium">about</span>
        <span
          key={point}
          data-changed={changed || undefined}
          className={`g-num inline-block leading-[0.88] font-medium tracking-[-0.055em] ${size === "lg" ? "text-[clamp(96px,10vw,148px)]" : "text-[clamp(88px,27vw,116px)]"}`}
        >
          {point}
        </span>
      </p>
      {bac > 0 && (
        <>
          <p className="mt-3 text-xl font-medium" aria-hidden="true">
            Likely {lo} to {hi}
          </p>
          <div className="relative mt-5 h-1 rounded-full bg-white/10" aria-hidden="true">
            <span
              className="g-band absolute inset-y-0 rounded-full bg-[var(--g-signal)] shadow-[0_0_16px_2px_rgb(124_180_255/0.55)]"
              style={{ left: pct(bac * BAND_LOW), width: `calc(${pct(bac * BAND_HIGH)} - ${pct(bac * BAND_LOW)})` }}
            />
            <span className="g-band absolute -top-2 -bottom-2 w-0.5 -translate-x-1/2 rounded-full bg-[var(--g-ink)]" style={{ left: pct(bac) }} />
          </div>
          <p className="mt-5 flex items-center gap-2 text-lg font-medium">
            {rising ? (
              <>
                <TrendingUp aria-hidden="true" className="size-5" strokeWidth={2} />
                Still rising: about {formatPoint(rising.bac)} by {formatClock(rising.at)}
              </>
            ) : (
              <>
                <TrendingDown aria-hidden="true" className="size-5" strokeWidth={2} />
                Falling
              </>
            )}
          </p>
        </>
      )}
      <p className="sr-only" aria-live="polite">
        Estimated blood alcohol about {point}. {bac > 0 ? `Likely ${lo} to ${hi}.` : ""}
      </p>
    </section>
  );
}

export function Rows({ night, std }: { night: SampleNight; std: Std }) {
  const { model, drinks, totalStd } = night;
  const rows: [string, string][] = [];
  if (model.estimate?.backToZero) rows.push(["Back to zero", model.estimate.backToZero.replace(/^between /, "").replace(" and ", " to ")]);
  if (model.peak) rows.push(["Peak", `about ${formatPoint(model.peak.bac)} at ${formatClock(model.peak.at)}`]);
  rows.push(["Counted", `${drinks.length} ${drinks.length === 1 ? "drink" : "drinks"} · ${std(totalStd)} std`]);
  return (
    <section className="g-card overflow-hidden">
      <dl className="divide-y divide-[var(--g-edge)]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex min-h-14 items-center justify-between gap-4 px-5 text-lg">
            <dt className="text-[var(--g-ink-2)]">{k}</dt>
            <dd className="text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-[var(--g-edge)] px-5 py-3.5 text-lg text-[var(--g-ink-2)]">Estimate only. Bodies and pours vary.</p>
    </section>
  );
}

const W = 400;

export function Curve({ simulation, now }: { simulation: NightSimulation; now: Date }) {
  const id = useId().replace(/:/g, "");
  const win = curveWindow(simulation, now);
  const { box, t, handlers } = useScrub(win);
  const H = 170;
  const x = (tt: number) => ((tt - win.t0) / (win.t1 - win.t0)) * W;
  const y = (b: number) => 12 + (1 - b / win.max) * (H - 16);
  const line = pathOf(win.shown.map((s) => [x(s.t), y(s.bac)]));
  const area = `${line} L${x(win.shown[win.shown.length - 1]?.t ?? win.t1).toFixed(1)} ${y(0)} L${x(win.t0)} ${y(0)} Z`;
  const nowT = now.getTime();
  const nowX = x(nowT);
  const picked = t ?? nowT;
  const pickedBac = valueAt(simulation.samples, picked);

  return (
    <section aria-labelledby="g-curve" className="g-card p-5">
      <header className="flex items-baseline justify-between gap-3">
        <h2 id="g-curve" className="text-lg font-semibold">
          Tonight
        </h2>
        <p className="text-lg">
          <span className="text-[var(--g-ink-2)]">{t === null ? "Now" : formatClock(picked)} · </span>
          <span className="font-medium">about {formatPoint(pickedBac)}</span>
        </p>
      </header>
      <div ref={box} {...handlers} className="curve-reveal relative mt-4 touch-pan-y select-none" style={{ height: H }}>
        <svg aria-hidden="true" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
          <defs>
            <linearGradient id={`fill-${id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#7cb4ff" stopOpacity="0.35" />
              <stop offset="1" stopColor="#7cb4ff" stopOpacity="0" />
            </linearGradient>
            <clipPath id={`p-${id}`}>
              <rect x={0} y={-20} width={Math.max(0, nowX)} height={H + 40} />
            </clipPath>
            <clipPath id={`f-${id}`}>
              <rect x={nowX} y={-20} width={Math.max(0, W - nowX)} height={H + 40} />
            </clipPath>
            <filter id={`glow-${id}`} x="-20%" y="-50%" width="140%" height="200%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>
          <g clipPath={`url(#p-${id})`}>
            <path d={area} fill={`url(#fill-${id})`} />
            <path d={line} fill="none" stroke="#7cb4ff" strokeWidth={6} opacity={0.5} filter={`url(#glow-${id})`} vectorEffect="non-scaling-stroke" />
            <path d={line} fill="none" stroke="#a9ceff" strokeWidth={2.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </g>
          <g clipPath={`url(#f-${id})`}>
            <path d={line} fill="none" stroke="#7cb4ff" strokeWidth={2.5} strokeDasharray="4 6" strokeLinecap="round" opacity={0.85} vectorEffect="non-scaling-stroke" />
          </g>
          <line x1={nowX} x2={nowX} y1={0} y2={y(0)} stroke="rgb(250 250 250 / 0.5)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          {t !== null && <line x1={x(picked)} x2={x(picked)} y1={0} y2={y(0)} stroke="#fafafa" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />}
        </svg>
        <span
          className="pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--g-ink)] shadow-[0_0_0_4px_rgb(124_180_255/0.35)]"
          style={{ left: `${(nowX / W) * 100}%`, top: y(valueAt(simulation.samples, nowT)) }}
        />
        {t !== null && (
          <span className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--g-ink)]" style={{ left: `${(x(picked) / W) * 100}%`, top: y(pickedBac) }} />
        )}
      </div>
      <div className="relative mt-2 h-6 text-base text-[var(--g-ink-2)]" aria-hidden="true">
        {win.hours.map((h) => (
          <span key={h} className="absolute -translate-x-1/2" style={{ left: `${Math.min(94, Math.max(6, (x(h) / W) * 100))}%` }}>
            {formatHour(h)}
          </span>
        ))}
      </div>
      <p className="mt-1 text-lg text-[var(--g-ink-2)]">Drag across it to read any time.</p>
    </section>
  );
}

function GettingHome() {
  const { region } = useRegion();
  const call = `Call ${region.emergency}`;
  const row = "g-press g-lit flex min-h-14 items-center gap-3 px-4 text-lg font-medium hover:bg-white/[0.03]";
  return (
    <section aria-labelledby="g-home" className="g-card overflow-hidden">
      <div className="p-5">
        <h2 id="g-home" className="text-lg font-semibold">
          Getting home
        </h2>
        <p className="mt-2 text-lg">
          {call} if someone can&apos;t be woken, is breathing slowly, or is vomiting while drowsy. Stay with them.
        </p>
      </div>
      <div className="divide-y divide-[var(--g-edge)] border-t border-[var(--g-edge)]">
        <a href={`tel:${region.emergency}`} onPointerMove={lightAt} className={`${row} font-semibold text-[var(--g-alert)]`}>
          <Phone aria-hidden="true" className="size-5" strokeWidth={2} />
          {call}
        </a>
        <a href={`sms:?&body=${encodeURIComponent("Hey, can you come and get me? I've been drinking and need a lift home.")}`} onPointerMove={lightAt} className={row}>
          <MessageSquare aria-hidden="true" className="size-5" strokeWidth={2} />
          Text a mate
        </a>
        <a href="https://www.google.com/maps/search/taxi+near+me" target="_blank" rel="noopener noreferrer" onPointerMove={lightAt} className={row}>
          <CarFront aria-hidden="true" className="size-5" strokeWidth={2} />
          Find a ride
        </a>
      </div>
      <p className="flex gap-6 border-t border-[var(--g-edge)] px-5 text-lg">
        <Link href="/terms" className="min-h-12 py-3 text-[var(--g-ink-2)] underline underline-offset-4">
          Terms
        </Link>
        <Link href="/privacy" className="min-h-12 py-3 text-[var(--g-ink-2)] underline underline-offset-4">
          Privacy
        </Link>
      </p>
    </section>
  );
}

function Tab({ night, std }: { night: SampleNight; std: Std }) {
  if (night.drinks.length === 0) return null;
  const newest = [...night.drinks].sort((a, b) => b.finishedAt.getTime() - a.finishedAt.getTime());
  return (
    <section aria-labelledby="g-tab" className="g-card overflow-hidden">
      <header className="flex items-end justify-between gap-4 p-5">
        <h2 id="g-tab" className="text-lg font-semibold">
          Your tab
          <span className="block text-lg font-normal text-[var(--g-ink-2)]">Last 24 hours</span>
        </h2>
        <p className="text-right">
          <span className="block text-3xl leading-none font-medium tracking-[-0.03em]">{std(night.totalStd)}</span>
          <span className="block text-lg text-[var(--g-ink-2)]">standard drinks</span>
        </p>
      </header>
      <ul className="divide-y divide-[var(--g-edge)] border-t border-[var(--g-edge)]">
        {newest.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-4 px-5 py-2.5">
            <div className="min-w-0">
              <p className="text-lg font-medium">{drinkLabel(d, std)}</p>
              <p className="text-lg text-[var(--g-ink-2)]">
                {formatClock(d.finishedAt)} · {std(d.standards)} std
              </p>
            </div>
            <button
              type="button"
              onClick={() => night.remove(d)}
              aria-label={`Remove ${drinkLabel(d, std)} at ${formatClock(d.finishedAt)}`}
              className="g-press min-h-12 shrink-0 rounded-lg border border-[var(--g-edge-2)] px-4 text-lg text-[var(--g-ink-2)] hover:bg-white/5"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function GlassDock({ night, std, chips = true }: { night: SampleNight; std: Std; chips?: boolean }) {
  const s = dockStatus(night, std);
  const r = night.repeat;
  const recents = night.recents.slice(0, 2);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-12 items-center gap-3 px-2">
        <p aria-live="polite" className="min-w-0 flex-1 truncate text-lg">
          <span key={s.live?.at ?? "idle"} className="snack inline">
            {s.lead && <span className={s.live ? "font-semibold" : "text-[var(--g-ink-2)]"}>{s.lead}: </span>}
            <span className="font-medium">{s.label}</span>
            {!s.live && night.last && <span className="text-[var(--g-ink-2)]"> · {timeAgo(night.last.finishedAt, night.now)}</span>}
          </span>
        </p>
        {s.action && (
          <button type="button" onClick={night.undo} className="g-press min-h-12 shrink-0 rounded-xl bg-white/10 px-4 text-lg font-semibold hover:bg-white/15">
            {s.action}
          </button>
        )}
      </div>

      {r ? (
        <button
          type="button"
          onClick={() => night.add(r)}
          onPointerMove={lightAt}
          aria-label={`Add another ${drinkLabel(r, std)}`}
          className="g-press g-lit flex min-h-[92px] w-full items-center gap-4 rounded-[22px] bg-white/[0.06] py-2.5 pr-2.5 pl-5 text-left shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[28px] leading-tight font-medium tracking-[-0.03em]">{drinkLabel(r, std)}</span>
            <span className="block text-lg text-[var(--g-ink-2)]">Add another · {std(r.standards)} std</span>
          </span>
          <span className="g-key" aria-hidden="true">
            <Plus className="size-8" strokeWidth={2.5} />
          </span>
        </button>
      ) : (
        <button type="button" className="g-press flex min-h-[84px] items-center justify-center gap-3 rounded-[22px] bg-[var(--g-ink)] text-2xl font-semibold text-[var(--g-bg)]">
          <Plus aria-hidden="true" className="size-7" strokeWidth={2.5} />
          Add a drink
        </button>
      )}

      {r && chips && (
        <div className="grid grid-cols-2 gap-2">
          {recents.map((d) => (
            <button
              key={`${d.name}|${d.standards}`}
              type="button"
              onClick={() => night.add(d)}
              onPointerMove={lightAt}
              className="g-press g-lit flex min-h-16 items-center gap-2.5 rounded-2xl bg-white/[0.05] px-3 text-left shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]"
            >
              <DrinkIcon kind={drinkKind(d)} className="size-5 text-[var(--g-ink-2)]" />
              <span className="min-w-0">
                <span className="line-clamp-2 text-lg leading-tight font-medium">{drinkLabel(d, std)}</span>
                <span className="block text-lg leading-tight text-[var(--g-ink-2)]">{std(d.standards)} std</span>
              </span>
            </button>
          ))}
          <button
            type="button"
            className="g-press col-span-2 flex min-h-12 items-center justify-center gap-2 rounded-2xl text-lg font-medium text-[var(--g-ink)] hover:bg-white/5"
          >
            <Plus aria-hidden="true" className="size-5" strokeWidth={2.25} />
            New drink
          </button>
        </div>
      )}
    </div>
  );
}
