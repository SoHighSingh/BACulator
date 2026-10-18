"use client";

import Link from "next/link";

import { DrinkIcon, drinkKind } from "~/components/night/DrinkIcon";
import { useRegion } from "~/hooks/useRegion";
import { drinkLabel } from "~/lib/estimate-display";
import { useSampleNight } from "../../_kit/useSampleNight";
import { ClinicalCurve, ResultPanel, ResultRows } from "../Result";

const METHOD: [string, string, string][] = [
  ["Absorption", "Most of each drink reaches your blood within about 30 minutes, so the estimate keeps rising for a while.", "Widmark, 1932"],
  ["Body water", "Alcohol spreads through the water in your body, worked out from your weight and Widmark's ratio for your sex.", "Widmark, 1932"],
  ["Elimination", "Your body clears about 0.015 an hour. Coffee, water and sleep don't speed it up.", "Jones, 2010"],
];

export function ClinicalHero() {
  const night = useSampleNight();
  const { std } = useRegion();
  const chips = [night.repeat, ...night.recents].filter((d): d is NonNullable<typeof d> => !!d).slice(0, 3);

  return (
    <div className="clin-light min-h-svh bg-bg text-ink">
      <nav className="mx-auto flex max-w-[1360px] items-center gap-6 px-4 py-5 sm:px-8">
        <p className="flex-1 text-xl font-bold tracking-[-0.02em]">BACulator</p>
        <a href="#method" className="hidden min-h-12 items-center text-lg font-semibold underline-offset-4 hover:underline sm:flex">
          How it works
        </a>
        <Link href="/api/auth/signin" className="press flex min-h-12 items-center rounded-xl bg-surface-2 px-4 text-lg font-semibold">
          Sign in
        </Link>
      </nav>

      <main className="mx-auto grid max-w-[1360px] gap-10 px-4 pt-6 pb-16 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-14">
        <div className="flex flex-col">
          <h1 className="text-[clamp(40px,6.2vw,104px)] leading-[0.95] font-bold tracking-[-0.045em] text-balance">
            Blood alcohol, with error bars.
          </h1>
          <p className="mt-6 max-w-[34ch] text-xl leading-snug text-ink sm:text-2xl">
            Add each drink in one tap. See about where you are now, how sure that is, and when you&apos;ll be back to zero.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/api/auth/signin" className="press flex min-h-16 items-center rounded-[14px] bg-ink px-7 text-xl font-bold text-bg">
              Start tonight
            </Link>
            <p className="text-lg text-ink-2">Free blood alcohol &amp; standard drinks calculator</p>
          </div>

          <div className="mt-10 lg:mt-16">
            <p className="text-lg font-semibold">Try it on a sample night: 75 kg, female.</p>
            <div className="mt-3 flex flex-wrap gap-2.5">
              {chips.map((d) => (
                <button
                  key={`${d.name}|${d.standards}`}
                  type="button"
                  onClick={() => night.add(d)}
                  className="press flex min-h-14 items-center gap-2.5 rounded-xl bg-surface px-4 text-lg font-semibold active:bg-surface-3"
                >
                  <DrinkIcon kind={drinkKind(d)} className="size-6" />
                  Add {drinkLabel(d, std).toLowerCase()}
                </button>
              ))}
              {night.notice?.kind === "added" && (
                <button type="button" onClick={night.undo} className="press min-h-14 rounded-xl px-4 text-lg font-semibold underline underline-offset-4">
                  Undo
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <ResultPanel night={night} large />
          <ResultRows night={night} std={std} />
          {night.model.simulation && (
            <div className="rounded-[18px] bg-surface p-5">
              <ClinicalCurve simulation={night.model.simulation} now={night.now} height={140} />
            </div>
          )}
        </div>
      </main>

      <section id="method" aria-labelledby="method-heading" className="bg-surface-2">
        <div className="mx-auto grid max-w-[1360px] gap-10 px-4 py-20 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-32">
          <div>
            <h2 id="method-heading" className="text-[clamp(36px,4.4vw,72px)] leading-[0.98] font-bold tracking-[-0.04em] text-balance">
              How the estimate works
            </h2>
            <p className="mt-6 max-w-[46ch] text-xl leading-relaxed">
              It runs your drinks through a published model, minute by minute, then shows the answer as a likely range,
              because people differ by about 20% from the model. It can&apos;t tell you that you&apos;re fit to drive. Nothing can,
              short of a breath test.
            </p>
          </div>
          <dl className="flex flex-col gap-[2px] self-start overflow-hidden rounded-[18px]">
            {METHOD.map(([k, v, src]) => (
              <div key={k} className="grid gap-1 bg-surface p-5 sm:grid-cols-[9rem_1fr] sm:gap-6">
                <dt className="text-lg font-bold">{k}</dt>
                <dd className="text-lg leading-snug">
                  {v} <span className="text-ink-2">{src}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  );
}
