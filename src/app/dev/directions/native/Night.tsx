"use client";

import { Car, ChevronRight, CircleUser, MessageCircle, Moon, Phone, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { DrinkIcon, drinkKind } from "~/components/night/DrinkIcon";
import { WarningMark } from "~/components/night/WarningMark";
import { useRegion } from "~/hooks/useRegion";
import { drinkLabel, formatPoint, timeAgo } from "~/lib/estimate-display";
import { formatClock } from "~/lib/format-clock";
import { dockStatus, useSampleNight, type SampleNight } from "../_kit/useSampleNight";
import { aboutText, RangeChart } from "./RangeChart";

const COME_GET_ME = "Hey, can you come and get me? I've been drinking and need a lift home.";
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function Night() {
  const night = useSampleNight();
  return <NightScreen night={night} />;
}

/** The estimate counts to its new value in ~400ms when it changes; it never moves on its own. */
function useCounted(value: number) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    if (start === value || reduced()) {
      from.current = value;
      setShown(value);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / 400);
      const v = start + (value - start) * (1 - (1 - k) ** 3);
      from.current = v;
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return shown;
}

/** "between 2:30 and 4:00 am" → ["2:30 am", "4:00 am"] */
function zeroTimes(s: string | null): [string, string] | null {
  const m = s ? /between (\d{1,2}:\d{2})(?: ([ap]m))? and (\d{1,2}:\d{2}) ([ap]m)/.exec(s) : null;
  if (!m) return null;
  return [`${m[1]} ${m[2] ?? m[4]}`, `${m[3]} ${m[4]}`];
}

function Tile({ children, tone = "amber" }: { children: React.ReactNode; tone?: "amber" | "alert" | "plain" }) {
  const bg = tone === "amber" ? "bg-amber text-bg" : tone === "alert" ? "bg-alert text-bg" : "bg-[var(--card-3)] text-ink";
  return <span className={`flex size-10 shrink-0 items-center justify-center rounded-[11px] ${bg}`}>{children}</span>;
}

const ROW =
  "press flex min-h-[60px] items-center gap-3 rounded-[16px] bg-[var(--card-2)] px-3 text-[18px] active:bg-[var(--card-3)]";
const SECONDARY =
  "press flex items-center justify-center rounded-full border-[1.5px] border-[var(--edge)] bg-[var(--card-2)] text-[18px] font-semibold text-ink active:bg-[var(--card-3)]";
const DOCK_TILE =
  "ns-on-dock press rounded-[16px] border-[1.5px] border-[var(--edge)] bg-[var(--card-2)] text-ink active:bg-[var(--card-3)]";

/**
 * The night screen in Health's idiom: large title, a summary card, a range-capsule chart, and inset
 * grouped lists. `framed` renders it inside a container (the landing's phone) instead of the viewport.
 */
export function NightScreen({ night, framed = false }: { night: SampleNight; framed?: boolean }) {
  const { model, now } = night;
  const { std, region } = useRegion();
  const main = useRef<HTMLElement>(null);
  const getHome = useRef<HTMLElement>(null);
  const curve = useRef<HTMLElement>(null);
  const placed = useRef(false);
  const bac = model.bac ?? 0;
  const counted = useCounted(bac);
  const zero = zeroTimes(model.estimate?.backToZero ?? null);
  const status = dockStatus(night, std);
  const call = `Call ${region.emergency}`;
  const shortcuts = night.recents.slice(0, 2);
  const newestFirst = [...night.drinks].sort((a, b) => b.finishedAt.getTime() - a.finishedAt.getTime());

  // In the landing's phone, open on the range chart: it's the part a visitor hasn't seen before.
  const hasCurve = !!model.simulation;
  useEffect(() => {
    if (!framed || placed.current || !hasCurve || !main.current || !curve.current) return;
    placed.current = true;
    main.current.scrollTop = curve.current.offsetTop - 64;
  }, [framed, hasCurve]);

  function toGetHome() {
    const m = main.current;
    const el = getHome.current;
    if (!m || !el) return;
    m.scrollTo({ top: el.offsetTop - 72, behavior: reduced() ? "auto" : "smooth" });
  }

  return (
    <div className={`app-shell ${framed ? "ns-framed absolute" : "ns-wide fixed"} inset-0 bg-bg text-ink`}>
      <header className="app-top ns-top mx-auto flex w-full max-w-[480px] items-center gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <p className="min-w-0 flex-1 truncate text-[20px] font-bold tracking-[-0.01em] max-[360px]:text-[18px]">BACulator</p>
        <button type="button" onClick={toGetHome} className={`${SECONDARY} min-h-12 px-4 whitespace-nowrap max-[360px]:px-3`}>
          Get home
        </button>
        <button type="button" className={`${SECONDARY} min-h-12 min-w-12 gap-1.5 pr-4 pl-2.5 max-[360px]:px-3`}>
          <CircleUser aria-hidden="true" className="size-6 max-[360px]:hidden" strokeWidth={2} />
          You
        </button>
      </header>

      <main ref={main} className="app-main relative min-h-0 overflow-y-auto overscroll-contain">
        <div className="ns-content mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 pb-8">
          <h1 className="pt-2 text-[34px] leading-[41px] font-bold tracking-[-0.015em]">Tonight</h1>

          {model.notSafeToDrive && (
            <div role="status" className="ns-sticky sticky top-0 z-10 -mx-4 -my-2 bg-bg px-4 py-2">
              <p className="flex min-h-14 flex-wrap items-center gap-x-3 rounded-[18px] bg-[var(--card)] px-4 py-2 text-alert">
                <WarningMark className="size-6" />
                <span className="text-[20px] font-bold whitespace-nowrap max-[340px]:text-[18px]">Not safe to drive</span>
                {bac > 0 && <span className="ml-auto text-[18px] font-semibold whitespace-nowrap text-ink max-[340px]:ml-9">{aboutText(bac)}</span>}
              </p>
            </div>
          )}

          {model.bac === null || !model.estimate ? (
            <section className="flex flex-col gap-3 rounded-[22px] bg-[var(--card)] p-5">
              <h2 className="text-[22px] leading-tight font-bold">Add your weight to see an estimate</h2>
              <p className="text-[18px] font-medium text-ink-2">
                {model.hasDrinks ? "Your drinks are saved and counted." : "Your drinks still get saved without it."}
              </p>
              <button
                type="button"
                onClick={() => night.setWeight(75)}
                className="press min-h-14 rounded-[16px] bg-amber px-4 text-[18px] font-bold text-bg active:bg-[var(--amber-press)]"
              >
                Add details
              </button>
            </section>
          ) : (
            <div className="ns-pair ns-pair-est flex flex-col gap-4">
              <section aria-labelledby="ns-est" className="rounded-[22px] bg-[var(--card)] px-5 pt-4 pb-5">
                <h2 id="ns-est" className="text-[18px] font-medium text-ink-2">
                  Estimated blood alcohol
                </h2>
                <p className="mt-1 flex items-baseline gap-2.5">
                  {bac >= 0.01 && <span className="text-[28px] font-semibold">about</span>}
                  <span className="text-[clamp(72px,22vw,84px)] leading-[0.95] font-bold tracking-[-0.03em]">
                    {formatPoint(counted)}
                  </span>
                </p>
                {night.likely && <p className="mt-2 text-[20px] font-semibold">Likely {night.likely}</p>}
                {model.peak && (
                  <p className="mt-3 flex items-start gap-2 text-[18px] font-semibold text-ink">
                    <TrendingUp aria-hidden="true" className="mt-0.5 size-5 shrink-0" strokeWidth={2.25} />
                    <span>
                      Still rising: about {formatPoint(model.peak.bac)} by{" "}
                      <span className="whitespace-nowrap">{formatClock(model.peak.at)}</span>
                    </span>
                  </p>
                )}
              </section>

              <section aria-labelledby="ns-zero" className="rounded-[22px] bg-[var(--card)] p-5">
                <h2 id="ns-zero" className="flex items-center gap-3 text-[18px] font-semibold text-ink-2">
                  <Tile>
                    <Moon aria-hidden="true" className="size-5" strokeWidth={2.25} />
                  </Tile>
                  Back to zero
                </h2>
                {zero ? (
                  <p className="mt-3 text-[28px] leading-tight font-bold">
                    {zero[0]} <span className="text-[20px] font-semibold text-ink-2">to</span> {zero[1]}
                  </p>
                ) : (
                  <p className="mt-3 text-[22px] font-bold">Nothing left to wear off</p>
                )}
                <p className="mt-1 text-[18px] font-medium text-ink-2">Estimate only. Bodies and pours vary.</p>
              </section>
            </div>
          )}

          {model.simulation && model.bac !== null && (
            <section ref={curve} aria-labelledby="ns-curve">
              <h2 id="ns-curve" className="px-1 pt-2 text-[22px] font-bold">
                Tonight&apos;s curve
              </h2>
              <div className="mt-2 rounded-[22px] bg-[var(--card)] p-5">
                <RangeChart simulation={model.simulation} now={now} bac={bac} />
              </div>
            </section>
          )}

          <div className="ns-pair flex flex-col gap-4">
            <section ref={getHome} aria-labelledby="ns-home">
              <h2 id="ns-home" className="px-1 pt-2 text-[22px] font-bold">
                Getting home
              </h2>
              <div className="mt-2 rounded-[22px] bg-[var(--card)] p-2">
                <p className="px-3 pt-3 pb-4 text-[18px] font-semibold">
                  {call} if someone can&apos;t be woken, is breathing slowly, or is vomiting while drowsy. Stay with them.
                </p>
                <ul className="flex flex-col gap-2">
                  <li>
                    <a href={`sms:?&body=${encodeURIComponent(COME_GET_ME)}`} className={`${ROW} font-semibold`}>
                      <Tile>
                        <MessageCircle aria-hidden="true" className="size-5" strokeWidth={2.25} />
                      </Tile>
                      <span className="flex-1">Text a mate</span>
                      <ChevronRight aria-hidden="true" className="size-5 text-ink-2" strokeWidth={2.5} />
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.google.com/maps/search/taxi+near+me"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${ROW} font-semibold`}
                    >
                      <Tile>
                        <Car aria-hidden="true" className="size-5" strokeWidth={2.25} />
                      </Tile>
                      <span className="flex-1">Find a ride</span>
                      <ChevronRight aria-hidden="true" className="size-5 text-ink-2" strokeWidth={2.5} />
                    </a>
                  </li>
                  <li>
                    <a href={`tel:${region.emergency}`} className={`${ROW} font-bold text-alert`}>
                      <Tile tone="alert">
                        <Phone aria-hidden="true" className="size-5" strokeWidth={2.25} />
                      </Tile>
                      <span className="flex-1">{call}</span>
                    </a>
                  </li>
                </ul>
              </div>
              <p className="mt-2 px-1 text-[18px] font-medium text-ink-2">
                Text a mate opens a message saying you need a lift. You pick who it goes to.
              </p>
              <p className="flex gap-6 px-1 text-[18px] font-medium">
                <Link href="/terms" className="min-h-12 py-3 text-ink-2 underline underline-offset-4">
                  Terms
                </Link>
                <Link href="/privacy" className="min-h-12 py-3 text-ink-2 underline underline-offset-4">
                  Privacy
                </Link>
              </p>
            </section>

            {newestFirst.length > 0 && (
              <section aria-labelledby="ns-tab">
                <h2 id="ns-tab" className="px-1 pt-2 text-[22px] font-bold">
                  Your tab
                </h2>
                <div className="mt-2 rounded-[22px] bg-[var(--card)] p-2">
                  <p className="flex flex-wrap items-baseline gap-x-2 px-3 pt-3 pb-4">
                    <span className="text-[34px] leading-none font-bold">{std(night.totalStd)}</span>
                    <span className="text-[18px] font-medium text-ink-2">standard drinks, last 24 hours</span>
                  </p>
                  <ul className="flex flex-col gap-2">
                    {newestFirst.map((d) => (
                      <li key={d.id} className="flex min-h-16 items-center gap-3 rounded-[16px] bg-[var(--card-2)] py-2 pr-2 pl-3">
                        <Tile tone="plain">
                          <DrinkIcon kind={drinkKind(d)} className="size-5" />
                        </Tile>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[18px] font-semibold">{drinkLabel(d, std)}</span>
                          <span className="ns-tnum block text-[18px] font-medium text-ink-2">
                            {formatClock(d.finishedAt)} · {std(d.standards)} std
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => night.remove(d)}
                          aria-label={`Remove ${drinkLabel(d, std)} at ${formatClock(d.finishedAt)}`}
                          className="press min-h-12 shrink-0 rounded-[12px] border-[1.5px] border-[var(--edge)] px-4 text-[18px] font-semibold text-ink active:bg-[var(--card-3)]"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

      <footer className="app-dock bg-bg">
        <div className="ns-dock-inner mx-auto flex w-full max-w-[480px] flex-col gap-3 px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div
            className={`flex min-h-14 items-center gap-3 rounded-[16px] pr-1.5 pl-4 ${status.live ? "bg-[var(--card-3)]" : "ns-status-idle bg-[var(--card)]"}`}
          >
            <p aria-live="polite" className="min-w-0 flex-1 truncate text-[18px]">
              <span key={status.live?.at ?? "idle"} className="snack inline">
                {status.live ? (
                  <>
                    <span className="font-bold">{status.lead} </span>
                    <span className="font-semibold">{status.label}</span>
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
            {status.live && (
              <button
                type="button"
                onClick={night.undo}
                className="press min-h-12 shrink-0 rounded-[12px] border-[1.5px] border-[var(--edge)] bg-bg px-4 text-[18px] font-bold text-ink"
              >
                {status.action}
              </button>
            )}
          </div>

          {night.repeat ? (
            <button
              type="button"
              onClick={() => night.add(night.repeat!)}
              className="press dock-primary flex min-h-[88px] w-full items-center gap-4 rounded-[20px] bg-amber px-5 text-left text-bg active:bg-[var(--amber-press)]"
            >
              <span className="flex size-14 shrink-0 items-center justify-center rounded-[14px] bg-bg/10">
                <DrinkIcon kind={drinkKind(night.repeat)} className="size-8" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[26px] leading-tight font-bold whitespace-nowrap">
                  {night.last ? "+ Add another" : "+ Add"}
                </span>
                <span className="block truncate text-[18px] font-semibold">
                  {drinkLabel(night.repeat, std)} · {std(night.repeat.standards)} std
                </span>
              </span>
            </button>
          ) : (
            <button
              type="button"
              className="press dock-primary flex min-h-[88px] w-full items-center rounded-[20px] bg-amber px-5 text-left text-[26px] font-bold text-bg active:bg-[var(--amber-press)]"
            >
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
                  className={`${DOCK_TILE} flex min-h-16 items-center gap-3 px-3 py-2 text-left`}
                >
                  <DrinkIcon kind={drinkKind(d)} className="size-6" />
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-[18px] leading-tight font-bold">{drinkLabel(d, std)}</span>
                    <span className="block text-[16px] font-medium text-ink-2">{std(d.standards)} std</span>
                  </span>
                </button>
              ))}
              <button
                type="button"
                className={`${DOCK_TILE} flex items-center justify-center px-3 text-[18px] font-bold ${
                  shortcuts.length % 2 === 0 ? "col-span-2 min-h-12" : "min-h-16"
                }`}
              >
                + New drink
              </button>
            </div>
          )}
          {night.repeat && (
            <button type="button" className={`${DOCK_TILE} dock-new-compact hidden min-h-14 items-center justify-center text-[18px] font-bold`}>
              + New drink
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
