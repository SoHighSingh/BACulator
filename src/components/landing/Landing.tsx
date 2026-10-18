"use client";

import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";

import { BrandMark } from "~/components/BrandMark";
import { DrinkIcon, drinkKind } from "~/components/night/DrinkIcon";
import { Estimate } from "~/components/night/Estimate";
import { lightAt } from "~/components/night/GetHome";
import { valueAt } from "~/components/night/TimelineCard";
import { WarningMark } from "~/components/night/WarningMark";
import { useRegion } from "~/hooks/useRegion";
import { drinkLabel } from "~/lib/estimate-display";
import { REGION_IDS, REGIONS } from "~/lib/region";
import { DEMO_DRINKS, useDemoNight } from "./useDemoNight";

interface LandingProps {
  onStart: () => void;
}

const QUESTIONS = [
  {
    q: "How accurate is it?",
    a: "It's an estimate. The same drinks can read about a fifth higher or lower between people and nights, so you see a range. It uses your weight and sex, and how alcohol is absorbed and cleared over time.",
  },
  {
    q: "What counts as a standard drink?",
    a: "10 grams of alcohol in most guidelines, 14 grams in the US. Pick yours any time. Your drinks stay the same; only the numbers change.",
  },
  {
    q: "Can it tell me if I'm okay to drive?",
    a: "No. No estimate can. While the estimate is above zero, BACulator says one thing: not safe to drive.",
  },
  {
    q: "What does it cost?",
    a: "Nothing. No ads, no upgrades, no drink notifications.",
  },
];

const METHOD: [string, string][] = [
  ["Absorption", "Most of each drink reaches your blood within about 30 minutes, so the estimate keeps rising for a while after you log it."],
  ["Body water", "Alcohol spreads through the water in your body: Widmark's method, from your weight and his ratio for your sex."],
  ["Elimination", "Your body clears about 0.015 an hour. Coffee, water and sleep don't speed it up."],
];

function RegionSwitch() {
  const { region, setRegion } = useRegion();
  return (
    <div role="group" aria-label="Standard drink size" className="flex flex-wrap items-center justify-center gap-2 text-lg text-ink-2">
      <span className="mr-1">Standard drink</span>
      {REGION_IDS.map((id) => (
        <button
          key={id}
          type="button"
          aria-pressed={region.id === id}
          onClick={() => setRegion(id)}
          className={`press min-h-12 rounded-full px-4 text-lg ${region.id === id ? "bg-ink font-medium text-bg" : "shadow-[inset_0_0_0_1px_var(--color-line)] hover:bg-white/5"}`}
        >
          {REGIONS[id].gramsPerStandard} g{id === "us" ? " (US)" : ""}
        </button>
      ))}
    </div>
  );
}

/** The real night screen's top half, live on a demo night, floating in a glass frame. */
function LiveDevice() {
  const demo = useDemoNight();
  const { std } = useRegion();
  const { model } = demo;
  return (
    <div className="grid w-full items-center gap-8 lg:grid-cols-[1fr_400px_1fr]">
      <div className="hidden lg:block" />
      <div className="glass relative mx-auto w-full max-w-[400px] rounded-[36px] p-3 text-left">
        <div className="min-h-[300px] rounded-[28px] bg-bg/80 px-4 pb-2">
          <p className="flex min-h-12 items-center gap-2 pt-3 text-lg font-medium">
            <WarningMark className="size-5 text-alert" />
            Not safe to drive
          </p>
          {demo.ready && model.bac !== null && model.estimate && (
            <Estimate
              bac={model.bac}
              peak={model.peak}
              status={model.estimate.status}
              hourAgo={model.simulation ? valueAt(model.simulation.samples, demo.now.getTime() - 3_600_000) : null}
            />
          )}
        </div>
        <p className="flex min-h-12 items-center justify-between gap-3 px-3 pt-2 text-lg" aria-live="polite">
          <span className="min-w-0 truncate">
            {demo.lastAdded ? (
              <>
                <span className="text-ink-2">Added: </span>
                <span className="font-medium">{drinkLabel(demo.lastAdded, std)}</span>
              </>
            ) : (
              <span className="text-ink-2">Sample night: 75 kg, female</span>
            )}
          </span>
          {demo.lastAdded && (
            <button type="button" onClick={demo.undo} className="press min-h-12 shrink-0 rounded-full bg-white/10 px-4 font-medium hover:bg-white/15">
              Undo
            </button>
          )}
        </p>
      </div>
      <div className="flex flex-col items-center gap-3 lg:items-start">
        <p className="text-lg font-medium">Try it</p>
        <div className="flex flex-wrap justify-center gap-2 lg:flex-col">
          {DEMO_DRINKS.map((d) => (
            <button
              key={d.name}
              type="button"
              onClick={() => demo.add(d)}
              onPointerMove={lightAt}
              className="press lit flex min-h-12 items-center gap-2.5 rounded-full bg-white/[0.05] px-4 text-lg font-medium shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]"
            >
              <DrinkIcon kind={drinkKind(d)} className="size-5 text-ink-2" />
              Add {drinkLabel(d, std).toLowerCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The public front door, in the Glass world: a centred promise, the real screen live under it, then the argument. */
export function Landing({ onStart }: LandingProps) {
  const { region } = useRegion();
  return (
    <div className="landing relative overflow-x-clip bg-bg text-ink">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[1000px]"
        style={{
          background:
            "radial-gradient(50% 40% at 50% 62%, rgb(70 120 255 / 0.28), transparent 70%), radial-gradient(35% 30% at 50% 0%, rgb(124 180 255 / 0.12), transparent 70%)",
        }}
      />

      <nav className="glass sticky top-3 z-20 mx-auto mt-[max(12px,env(safe-area-inset-top))] flex w-[calc(100%-24px)] max-w-[1100px] items-center gap-2 rounded-2xl py-1.5 pr-1.5 pl-2">
        <Link href="/" className="flex min-h-12 flex-1 items-center gap-3">
          <BrandMark size={40} />
          <span className="text-lg font-semibold tracking-[-0.02em]">BACulator</span>
        </Link>
        <a href="#how" className="hidden min-h-12 items-center rounded-xl px-4 text-lg text-ink-2 hover:text-ink sm:flex">
          How it works
        </a>
        <button type="button" onClick={onStart} className="press min-h-12 rounded-xl px-4 text-lg font-medium hover:bg-white/5">
          Sign in
        </button>
      </nav>

      <header className="relative mx-auto flex max-w-[1100px] flex-col items-center px-4 pt-16 text-center sm:pt-24">
        <h1 className="max-w-[16ch] text-[clamp(44px,7.2vw,92px)] leading-[0.98] font-semibold tracking-[-0.055em] text-balance">
          <span className="rise block" style={{ "--d": "0ms" } as React.CSSProperties}>
            Blood alcohol,
          </span>
          <span className="rise block" style={{ "--d": "90ms" } as React.CSSProperties}>
            with error bars.
          </span>
        </h1>
        <p className="rise mt-6 max-w-[40ch] text-xl leading-snug text-ink-2" style={{ "--d": "180ms" } as React.CSSProperties}>
          Add each drink in one tap. BACulator estimates where you likely are now, and when you&apos;ll be back to zero.
        </p>
        <div className="rise mt-8 flex flex-wrap items-center justify-center gap-3" style={{ "--d": "260ms" } as React.CSSProperties}>
          <button type="button" onClick={onStart} className="press key-glow flex min-h-14 items-center gap-2 rounded-full bg-ink px-7 text-lg font-semibold text-bg">
            Start tonight
            <ArrowRight aria-hidden="true" className="size-5" strokeWidth={2.25} />
          </button>
          <a href="#method" className="press flex min-h-14 items-center rounded-full px-6 text-lg font-medium shadow-[inset_0_0_0_1px_var(--color-line)] hover:bg-white/5">
            How the estimate works
          </a>
        </div>
        <p className="mt-4 text-lg text-ink-2">Free blood alcohol &amp; standard drinks calculator. Sign in with Google to keep your drinks.</p>
        <div className="mt-6">
          <RegionSwitch />
        </div>
        <div className="mt-14 w-full">
          <LiveDevice />
        </div>
      </header>

      <section id="how" aria-labelledby="how-heading" className="relative mx-auto mt-28 grid max-w-[1100px] items-center gap-12 px-4 lg:grid-cols-[1fr_1.15fr]">
        <div className="flex flex-col gap-5">
          <h2 id="how-heading" className="text-[clamp(32px,4vw,52px)] leading-none font-semibold tracking-[-0.045em] text-balance">
            Another round is one tap.
          </h2>
          <p className="max-w-[44ch] text-xl leading-relaxed text-ink-2">
            The drink you just had is the white button at the bottom, at its real size. Anything else, type it or say it the way
            you&apos;d order it.
          </p>
          <p className="max-w-[44ch] text-xl leading-relaxed text-ink-2">Tapped the wrong thing? Undo stays right there for two minutes. Nothing pops up, nothing nags.</p>
          <p className="flex items-center gap-2 text-lg text-ink-2">
            <Plus aria-hidden="true" className="size-5" strokeWidth={2} />
            Works with no signal, and syncs when you&apos;re back.
          </p>
        </div>
        <div className="glass relative overflow-hidden rounded-[28px] p-2">
          <video
            ref={(v) => {
              // Respect reduced motion: show the poster frame instead of a loop.
              if (v && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                v.autoplay = false;
                v.pause();
              }
            }}
            className="block w-full rounded-[22px]"
            src="/media/add-flow-loop.mp4"
            poster="/media/add-flow-loop-poster.png"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-label="The add flow: tap the microphone, say a drink, check it and add it; the estimate updates."
          />
        </div>
      </section>

      <section id="method" aria-labelledby="method-heading" className="mx-auto mt-28 max-w-[1100px] px-4">
        <h2 id="method-heading" className="text-[clamp(32px,4vw,52px)] leading-none font-semibold tracking-[-0.045em]">
          A number, not a verdict.
        </h2>
        <p className="mt-4 max-w-[56ch] text-xl text-ink-2">
          A published model, run minute by minute, shown as one number with the range it likely sits in, because people differ
          from it by about 20%. It never says you&apos;re fit to drive: while it&apos;s above zero, it says not safe to drive.
        </p>
        <dl className="card mt-10 grid divide-y divide-edge overflow-hidden md:grid-cols-3 md:divide-x md:divide-y-0">
          {METHOD.map(([k, v]) => (
            <div key={k} className="p-6">
              <dt className="text-lg font-semibold">{k}</dt>
              <dd className="mt-2 text-lg text-ink-2">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-lg text-ink-2">Sources: Widmark 1932; Jones 2010.</p>
      </section>

      <section aria-labelledby="help-heading" className="mx-auto mt-28 max-w-[1100px] px-4">
        <h2 id="help-heading" className="text-[clamp(32px,4vw,52px)] leading-none font-semibold tracking-[-0.045em] text-balance">
          For whoever&apos;s holding the phone.
        </h2>
        <p className="mt-6 max-w-[30ch] text-[clamp(24px,3vw,36px)] leading-tight font-medium">
          Call {region.emergency} if someone can&apos;t be woken, is breathing slowly, or is vomiting while drowsy.
        </p>
        <p className="mt-6 max-w-[52ch] text-xl text-ink-2">Getting home sits on the same screen as your drinks. Text a mate or call for help in one tap.</p>
      </section>

      <section aria-labelledby="yours-heading" className="mx-auto mt-28 grid max-w-[1100px] gap-10 px-4 lg:grid-cols-[1fr_1.3fr]">
        <h2 id="yours-heading" className="text-[clamp(32px,4vw,52px)] leading-none font-semibold tracking-[-0.045em]">
          Your night is yours.
        </h2>
        <ul className="card divide-y divide-edge overflow-hidden text-lg">
          {[
            ["No streaks, no badges, no nudges.", "It never asks you to drink, and never sends a notification about drinks."],
            ["The morning after, it's all there.", "What you had, how big, and when. Plain facts, no judgement."],
            ["Private, and gone when you say.", "Your drinks are never sold or shared. Download or delete everything yourself, any time."],
          ].map(([t, d]) => (
            <li key={t} className="p-6">
              <strong className="block font-semibold">{t}</strong>
              <span className="text-ink-2">{d}</span>
            </li>
          ))}
        </ul>
      </section>

      <section id="questions" aria-labelledby="questions-heading" className="mx-auto mt-28 max-w-[1100px] px-4">
        <h2 id="questions-heading" className="text-[clamp(32px,4vw,52px)] leading-none font-semibold tracking-[-0.045em]">
          Questions
        </h2>
        <div className="card mt-8 max-w-[64ch] divide-y divide-edge overflow-hidden">
          {QUESTIONS.map(({ q, a }) => (
            <details key={q} className="group">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 text-lg font-semibold">
                {q}
                <Plus aria-hidden="true" className="size-5 shrink-0 text-ink-2 transition-transform group-open:rotate-45" strokeWidth={2} />
              </summary>
              <p className="px-6 pb-5 text-lg leading-relaxed text-ink-2">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="relative mt-28 border-t border-edge">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-8 px-4 pt-16 pb-[max(2rem,env(safe-area-inset-bottom))]">
          <button type="button" onClick={onStart} className="press key-glow flex min-h-14 items-center gap-2 self-start rounded-full bg-ink px-7 text-lg font-semibold text-bg">
            Start tonight
            <ArrowRight aria-hidden="true" className="size-5" strokeWidth={2.25} />
          </button>
          <p className="flex items-center gap-4 text-[clamp(48px,12vw,160px)] leading-[0.85] font-semibold tracking-[-0.06em]">BACulator</p>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-lg">
            <Link href="/terms" className="min-h-12 py-3 text-ink-2 underline underline-offset-4">
              Terms
            </Link>
            <Link href="/privacy" className="min-h-12 py-3 text-ink-2 underline underline-offset-4">
              Privacy
            </Link>
            <span className="text-ink-2">Estimate only. Not medical or legal advice.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
