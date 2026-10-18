"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { DrinkIcon, drinkKind } from "~/components/night/DrinkIcon";
import { WarningMark } from "~/components/night/WarningMark";
import { useRegion } from "~/hooks/useRegion";
import { drinkLabel } from "~/lib/estimate-display";
import { useSampleNight } from "../../_kit/useSampleNight";
import { Estimate, GlassDock, lightAt } from "../Night";

const METHOD: [string, string][] = [
  ["Absorption", "Most of each drink reaches your blood within about 30 minutes, so the estimate keeps rising for a while after you log it."],
  ["Body water", "Alcohol spreads through the water in your body: Widmark's method, from your weight and his ratio for your sex."],
  ["Elimination", "Your body clears about 0.015 an hour. Coffee, water and sleep don't speed it up."],
];

export function GlassHero() {
  const night = useSampleNight();
  const { std } = useRegion();
  const chips = [night.repeat, ...night.recents].filter((d): d is NonNullable<typeof d> => !!d).slice(0, 3);

  return (
    <div className="relative min-h-svh overflow-x-clip bg-[var(--g-bg)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[900px]"
        style={{
          background:
            "radial-gradient(50% 40% at 50% 62%, rgb(70 120 255 / 0.28), transparent 70%), radial-gradient(35% 30% at 50% 0%, rgb(124 180 255 / 0.12), transparent 70%)",
        }}
      />

      <nav className="g-glass sticky top-3 z-20 mx-auto mt-3 flex w-[calc(100%-24px)] max-w-[1100px] items-center gap-2 rounded-2xl py-2 pr-2 pl-4">
        <p className="flex-1 text-lg font-semibold tracking-[-0.02em]">BACulator</p>
        <a href="#method" className="hidden min-h-12 items-center rounded-xl px-4 text-lg text-[var(--g-ink-2)] hover:text-[var(--g-ink)] sm:flex">
          How it works
        </a>
        <Link href="/api/auth/signin" className="g-press flex min-h-12 items-center rounded-xl px-4 text-lg font-medium hover:bg-white/5">
          Sign in
        </Link>
      </nav>

      <main className="relative mx-auto flex max-w-[1100px] flex-col items-center px-4 pt-16 text-center sm:pt-24">
        <h1 className="max-w-[16ch] text-[clamp(44px,7.2vw,92px)] leading-[0.98] font-semibold tracking-[-0.055em] text-balance">
          Blood alcohol, with error bars.
        </h1>
        <p className="mt-6 max-w-[40ch] text-xl leading-snug text-[var(--g-ink-2)]">
          Add each drink in one tap. BACulator estimates where you likely are now, and when you&apos;ll be back to zero.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/api/auth/signin"
            className="g-press flex min-h-14 items-center gap-2 rounded-full bg-[var(--g-ink)] px-7 text-lg font-semibold text-[var(--g-bg)] shadow-[0_8px_30px_-8px_rgb(124_180_255/0.6)]"
          >
            Start tonight
            <ArrowRight aria-hidden="true" className="size-5" strokeWidth={2.25} />
          </Link>
          <a href="#method" className="g-press flex min-h-14 items-center rounded-full px-6 text-lg font-medium shadow-[inset_0_0_0_1px_var(--g-edge-2)] hover:bg-white/5">
            How it works
          </a>
        </div>
        <p className="mt-4 text-lg text-[var(--g-ink-2)]">Free blood alcohol &amp; standard drinks calculator</p>

        <div className="mt-14 grid w-full items-center gap-8 lg:grid-cols-[1fr_400px_1fr]">
          <div className="hidden lg:block" />
          <div className="g-glass relative mx-auto w-full max-w-[400px] rounded-[36px] p-3 text-left">
            <div className="rounded-[28px] bg-[var(--g-bg)]/80 px-4 pb-3">
              <p className="flex min-h-12 items-center gap-2 pt-3 text-lg font-semibold text-[var(--g-alert)]">
                <WarningMark className="size-5" />
                Not safe to drive
              </p>
              <Estimate night={night} />
            </div>
            <div className="mt-3">
              <GlassDock night={night} std={std} chips={false} />
            </div>
          </div>
          <div className="flex flex-col items-center gap-3 lg:items-start">
            <p className="text-lg font-medium">Try it on a sample night</p>
            <p className="text-lg text-[var(--g-ink-2)]">75 kg, female</p>
            <div className="flex flex-wrap justify-center gap-2 lg:flex-col">
              {chips.map((d) => (
                <button
                  key={`${d.name}|${d.standards}`}
                  type="button"
                  onClick={() => night.add(d)}
                  onPointerMove={lightAt}
                  className="g-press g-lit flex min-h-12 items-center gap-2.5 rounded-full bg-white/[0.05] px-4 text-lg font-medium shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]"
                >
                  <DrinkIcon kind={drinkKind(d)} className="size-5 text-[var(--g-ink-2)]" />
                  Add {drinkLabel(d, std).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      <section id="method" aria-labelledby="g-method" className="relative mx-auto mt-28 max-w-[1100px] px-4 pb-28">
        <h2 id="g-method" className="text-[clamp(32px,4vw,52px)] leading-none font-semibold tracking-[-0.045em]">
          How the estimate works
        </h2>
        <p className="mt-4 max-w-[52ch] text-xl text-[var(--g-ink-2)]">
          A published model, run minute by minute, shown as a likely range because people differ from it by about 20%. It
          can&apos;t tell you you&apos;re fit to drive. Nothing can, short of a breath test.
        </p>
        <dl className="g-card mt-10 grid overflow-hidden md:grid-cols-3 md:divide-x divide-y md:divide-y-0 divide-[var(--g-edge)]">
          {METHOD.map(([k, v]) => (
            <div key={k} className="p-6">
              <dt className="text-lg font-semibold">{k}</dt>
              <dd className="mt-2 text-lg text-[var(--g-ink-2)]">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-lg text-[var(--g-ink-2)]">Sources: Widmark 1932; Jones 2010.</p>
      </section>
    </div>
  );
}
