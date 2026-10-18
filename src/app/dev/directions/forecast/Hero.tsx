"use client";

import Link from "next/link";

import { DrinkIcon, drinkKind } from "~/components/night/DrinkIcon";
import { WarningMark } from "~/components/night/WarningMark";
import { useRegion } from "~/hooks/useRegion";
import { drinkLabel } from "~/lib/estimate-display";
import { dockStatus, useSampleNight } from "../_kit/useSampleNight";
import { FanChart, MiniFan } from "./FanChart";

/**
 * The landing's first screen, for a sober visitor from search: one sentence with tonight's fan set
 * inside it, then the same chart at reading size, driven by serve buttons for a stated sample person.
 */
export function Hero() {
  const night = useSampleNight();
  const { std } = useRegion();
  const { model, now } = night;
  const sim = model.simulation;
  const animKey = night.drinks.map((d) => d.id).join(",");
  const status = dockStatus(night, std);
  const serves = [night.repeat, ...night.recents].filter((d): d is NonNullable<typeof d> => !!d).slice(0, 4);

  return (
    <div className="fx-light min-h-screen">
      <header className="mx-auto flex max-w-[1360px] flex-wrap items-baseline gap-x-4 gap-y-1 px-4 pt-6 sm:px-8 lg:px-16">
        <p className="fx-head text-[24px]">BACulator</p>
        <p className="text-lg font-medium text-ink-2">Blood alcohol &amp; standard drinks calculator</p>
      </header>

      <main>
        <section className="mx-auto max-w-[1360px] px-4 pt-12 pb-10 sm:px-8 lg:px-16 lg:pt-20">
          <h1 className="fx-head fx-poster">
            <span>
              Your night,
              {sim ? <MiniFan sim={sim} now={now} animKey={animKey} /> : <span className="fx-inline-chart" />}
            </span>
            <span>doubts and all.</span>
          </h1>
          <div className="mt-8 flex flex-col gap-6 lg:mt-12 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
            <p className="max-w-[34ch] text-xl leading-snug font-medium text-ink lg:text-[24px]">
              Add drinks as you go. BACulator draws your likely blood alcohol as a range, not one confident number, and says
              when it should be back to zero.
            </p>
            <div className="flex items-center gap-5">
              <Link href="/api/auth/signin" className="press fx-btn-hl inline-flex min-h-16 items-center rounded-lg px-8 text-[22px] font-extrabold">
                Start tonight
              </Link>
              <span className="text-lg font-medium text-ink-2">Free</span>
            </div>
          </div>
        </section>

        <section aria-labelledby="fx-demo" className="mx-auto max-w-[1360px] px-4 pb-16 sm:px-8 lg:px-16">
          <div className="grid gap-8 rounded-lg bg-surface p-5 sm:p-8 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:gap-14">
            <div className="flex flex-col gap-5">
              <div>
                <h2 id="fx-demo" className="fx-head text-[28px] leading-tight">
                  Try it on a sample night
                </h2>
                <p className="mt-1 text-lg font-medium text-ink-2">Sample: 75 kg, female. Tap a drink to add it.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {serves.map((d) => (
                  <button
                    key={`${d.name ?? ""}|${d.standards}`}
                    type="button"
                    onClick={() => night.add(d)}
                    aria-label={`Add ${drinkLabel(d, std)}, ${std(d.standards)} standard drinks`}
                    className="press flex min-h-16 items-center gap-3 rounded-lg border-2 border-line bg-surface px-3 py-2 text-left active:bg-surface-2"
                  >
                    <DrinkIcon kind={drinkKind(d)} className="size-6" />
                    <span className="min-w-0">
                      <span className="line-clamp-2 text-lg leading-tight font-bold">{drinkLabel(d, std)}</span>
                      <span className="block text-base font-medium text-ink-2">{std(d.standards)} std</span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex min-h-12 items-center gap-3">
                <p aria-live="polite" className="min-w-0 flex-1 text-lg">
                  {status.live ? (
                    <>
                      <span className="font-bold">{status.lead}</span> {status.label}
                    </>
                  ) : (
                    <span className="text-ink-2">
                      {night.drinks.length} drinks so far, {std(night.totalStd)} std
                    </span>
                  )}
                </p>
                {status.action && (
                  <button
                    type="button"
                    onClick={night.undo}
                    className="press min-h-12 shrink-0 rounded-lg border-2 border-line px-4 text-lg font-bold active:bg-surface-2"
                  >
                    {status.action}
                  </button>
                )}
              </div>
            </div>

            <div className="min-w-0">
              {night.point && (
                <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
                  <p className="flex items-baseline gap-2">
                    <span className="text-[24px] font-bold">about</span>
                    <span className="fx-head text-[64px] leading-none">{night.point}</span>
                  </p>
                  {night.likely && <p className="text-xl font-semibold">Likely {night.likely}</p>}
                </div>
              )}
              {model.notSafeToDrive && (
                <p className="mt-2 flex items-center gap-2 text-lg font-bold text-alert">
                  <WarningMark className="size-6" />
                  Not safe to drive
                </p>
              )}
              {sim && sim.samples.length > 1 && (
                <div className="mt-5">
                  <FanChart sim={sim} now={now} animKey={animKey} plotH={200} />
                </div>
              )}
              <p className="mt-2 text-base text-ink-2">Drag across the chart to read any time. Estimate only. Bodies and pours vary.</p>
            </div>
          </div>
        </section>

        <section aria-labelledby="fx-how" className="mx-auto max-w-[1360px] px-4 pb-24 sm:px-8 lg:px-16">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:gap-14">
            <h2 id="fx-how" className="fx-head text-[40px] leading-[1.02] lg:text-[56px]">
              How the estimate works
            </h2>
            <div className="max-w-[62ch]">
              <p className="text-xl leading-relaxed text-ink lg:text-[22px]">
                It uses Widmark&apos;s method: the alcohol in each drink, spread through a body of your weight, using
                Widmark&apos;s body-water ratio for your sex. Each drink is absorbed over about half an hour, and your liver clears about 0.015 an hour, a steady
                rate rather than a percentage. People differ by about 20% on both counts, so the chart shows a likely range
                that widens into the hours ahead, and back to zero as a window rather than a time.
              </p>
              <p className="mt-4 text-lg text-ink-2">
                Sources: Widmark (1932) on the method; Jones (2010) on elimination rates.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
