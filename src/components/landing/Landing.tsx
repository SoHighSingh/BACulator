"use client";

import Link from "next/link";

import { useRegion } from "~/hooks/useRegion";
import { REGION_IDS, REGIONS } from "~/lib/region";
import { LiveDocket } from "./LiveDocket";

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

function RegionSwitch() {
  const { region, setRegion } = useRegion();
  return (
    <div role="group" aria-label="Standard drink size" className="flex flex-wrap items-center gap-2 text-base text-ink-2">
      <span className="mr-1">Standard drink:</span>
      {REGION_IDS.map((id) => (
        <button
          key={id}
          type="button"
          aria-pressed={region.id === id}
          onClick={() => setRegion(id)}
          className={`press min-h-12 rounded-full px-4 text-base font-semibold ${
            region.id === id ? "bg-ink text-bg" : "bg-surface-2 text-ink hover:bg-surface-3"
          }`}
        >
          {REGIONS[id].gramsPerStandard} g{id === "us" ? " (US)" : ""}
        </button>
      ))}
    </div>
  );
}

/** A slice of the real night screen, drawn in HTML so it stays true to the app. */
function SameAgainFragment() {
  return (
    <div data-ui aria-hidden="true" className="flex w-full max-w-[400px] flex-col gap-3 rounded-[32px] bg-bg p-4">
      <div className="flex min-h-[120px] items-end justify-between gap-4 rounded-3xl bg-amber px-5 py-4 text-bg">
        <span>
          <span className="block text-[26px] leading-tight font-bold">+ Add another</span>
          <span className="block text-lg font-semibold">Schooner of lager</span>
        </span>
        <span className="text-right">
          <span className="block text-[40px] leading-none font-bold tabular-nums">1.6</span>
          <span className="block text-base font-semibold">std</span>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          ["Glass of red", "1.6"],
          ["Vodka soda", "1.0"],
        ].map(([name, n]) => (
          <div key={name} className="flex min-h-[72px] flex-col justify-between rounded-2xl bg-surface-2 px-4 py-3">
            <span className="text-lg font-semibold text-ink">{name}</span>
            <span className="text-base text-ink-2 tabular-nums">{n} std</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-4 rounded-2xl bg-surface p-4">
        <p className="flex-1 text-lg text-ink">
          <span className="block text-base text-ink-2">Last added</span>
          <span className="block font-semibold">Schooner of lager</span>
          <span className="block text-ink-2">just now</span>
        </p>
        <span className="flex min-h-14 min-w-28 items-center justify-center rounded-xl bg-surface-3 text-lg font-semibold text-ink">
          Undo
        </span>
      </div>
    </div>
  );
}

/** The public front door. Persuade mode: one live docket, then the argument, then the way in. */
export function Landing({ onStart }: LandingProps) {
  const { region } = useRegion();

  return (
    <div className="landing overflow-x-clip bg-bg text-ink">
      <nav className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8">
        <Link href="/" className="min-h-12 py-3 text-xl font-bold tracking-[-0.01em]">
          BACulator
        </Link>
        <div className="flex items-center gap-2 sm:gap-6">
          <a href="#how" className="hidden min-h-12 py-3 text-lg font-medium text-ink-2 hover:text-ink sm:block">
            How it works
          </a>
          <a href="#questions" className="hidden min-h-12 py-3 text-lg font-medium text-ink-2 hover:text-ink sm:block">
            Questions
          </a>
          <button type="button" onClick={onStart} className="press min-h-12 rounded-full bg-surface-2 px-5 text-lg font-semibold hover:bg-surface-3">
            Sign in
          </button>
        </div>
      </nav>

      <header className="mx-auto grid max-w-[1240px] gap-12 px-4 pt-12 pb-24 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:pt-20 lg:pb-32">
        <div className="flex flex-col gap-8 lg:sticky lg:top-12 lg:self-start">
          <h1 className="text-[clamp(56px,11vw,104px)] leading-[0.9] lg:text-[clamp(56px,7vw,104px)] font-bold tracking-[-0.045em]">
            <span className="rise block" style={{ "--d": "0ms" } as React.CSSProperties}>Your night,</span>
            <span className="rise block" style={{ "--d": "90ms" } as React.CSSProperties}>on one tab.</span>
          </h1>
          <p className="rise max-w-[30ch] text-[22px] leading-snug text-ink sm:text-2xl" style={{ "--d": "180ms" } as React.CSSProperties}>
            Add the drink you just got in one tap. See an honest estimate of your blood alcohol, and roughly when it&apos;s back to zero.
          </p>
          <div className="rise flex flex-col gap-3" style={{ "--d": "260ms" } as React.CSSProperties}>
            <button
              type="button"
              onClick={onStart}
              className="press min-h-[72px] w-full rounded-3xl bg-amber px-8 text-left text-[22px] font-bold text-bg hover:bg-amber-press sm:w-auto sm:self-start"
            >
              Start your tab
            </button>
            <p className="text-base text-ink-2">Free. Sign in with Google to keep your tab.</p>
          </div>
          <div className="rise" style={{ "--d": "320ms" } as React.CSSProperties}>
            <RegionSwitch />
          </div>
        </div>

        <div className="mx-auto w-full max-w-[460px]">
          <LiveDocket />
        </div>
      </header>

      <section id="how" aria-labelledby="how-heading" className="reveal mx-auto grid max-w-[1240px] items-center gap-12 px-4 py-24 sm:px-8 lg:grid-cols-2 lg:py-40">
        <div className="flex flex-col gap-6">
          <h2 id="how-heading" className="text-[clamp(40px,6vw,88px)] leading-[0.95] font-bold tracking-[-0.04em]">
            Another round is one tap.
          </h2>
          <p className="max-w-[44ch] text-xl leading-relaxed">
            Your last drink, at its real size, is the biggest thing on the screen. Your recent drinks sit right under it.
          </p>
          <p className="max-w-[44ch] text-xl leading-relaxed">
            Something new takes three taps at most. Type it the way you&apos;d say it, or just pick a serve.
          </p>
          <p className="max-w-[44ch] text-xl leading-relaxed">
            Tapped the wrong thing? Undo stays right there for two minutes. Nothing pops up, nothing nags.
          </p>
        </div>
        <div className="flex justify-center lg:justify-end">
          <SameAgainFragment />
        </div>
      </section>

      <section aria-labelledby="band-heading" className="bg-paper text-paper-ink">
        <div className="reveal mx-auto grid max-w-[1240px] gap-10 px-4 py-24 sm:px-8 lg:grid-cols-[1.2fr_1fr] lg:py-40">
          <div>
            <h2 id="band-heading" className="text-[clamp(40px,6vw,88px)] leading-[0.95] font-bold tracking-[-0.04em]">
              A number, not a verdict.
            </h2>
            <p aria-hidden="true" className="mt-10 text-[clamp(56px,15vw,220px)] leading-[0.85] font-bold tracking-[-0.05em] tabular-nums">
              0.07
            </p>
            <p className="mt-4 text-2xl font-semibold">Likely 0.05 to 0.09</p>
          </div>
          <div className="flex flex-col justify-end gap-6 text-xl leading-relaxed">
            <p>
              You get one clear number, and the range it likely sits in, because bodies and pours vary a lot. Plus
              a window for when it should be back to zero.
            </p>
            <p className="inline-flex -rotate-2 items-center gap-3 self-start rounded-lg border-[3px] border-stamp px-4 py-2 text-2xl font-bold text-stamp">
              Not safe to drive
            </p>
            <p>
              Until you&apos;re well clear of zero, that&apos;s the only thing it says about driving. No limit lines,
              no green zones, no countdowns.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="help-heading" className="reveal mx-auto max-w-[1240px] px-4 py-24 sm:px-8 lg:py-40">
        <h2 id="help-heading" className="max-w-[16ch] text-[clamp(40px,6vw,88px)] leading-[0.95] font-bold tracking-[-0.04em]">
          For whoever&apos;s holding the phone.
        </h2>
        <p className="mt-10 max-w-[28ch] text-[clamp(28px,3.4vw,44px)] leading-tight font-semibold">
          Call {region.emergency} if someone can&apos;t be woken, is breathing slowly, or is vomiting while drowsy.
        </p>
        <p className="mt-8 max-w-[52ch] text-xl leading-relaxed">
          Getting home sits on the same screen as your tab. Text a mate or call for help in one tap, whoever has the
          phone.
        </p>
      </section>

      <section aria-labelledby="yours-heading" className="bg-surface">
        <div className="reveal mx-auto grid max-w-[1240px] gap-12 px-4 py-24 sm:px-8 lg:grid-cols-[1fr_1.3fr] lg:py-40">
          <h2 id="yours-heading" className="text-[clamp(40px,6vw,88px)] leading-[0.95] font-bold tracking-[-0.04em]">
            Your tab is yours.
          </h2>
          <ul className="flex flex-col gap-8 text-xl leading-relaxed">
            <li>
              <strong className="block text-2xl">No streaks, no badges, no nudges.</strong>
              It never asks you to drink, and never sends a notification about drinks.
            </li>
            <li>
              <strong className="block text-2xl">The morning after, it&apos;s all there.</strong>
              What you had, how big, and when. Plain facts, no judgement.
            </li>
            <li>
              <strong className="block text-2xl">Private, and gone when you say.</strong>
              Your drinks are never sold or shared. Delete your account and every drink yourself, any time.
            </li>
          </ul>
        </div>
      </section>

      <section id="questions" aria-labelledby="questions-heading" className="reveal mx-auto max-w-[1240px] px-4 py-24 sm:px-8 lg:py-40">
        <h2 id="questions-heading" className="text-[clamp(40px,6vw,88px)] leading-[0.95] font-bold tracking-[-0.04em]">
          Questions
        </h2>
        <div className="mt-10 flex max-w-[60ch] flex-col gap-3">
          {QUESTIONS.map(({ q, a }) => (
            <details key={q} className="faq group rounded-2xl bg-surface-2">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-xl font-semibold">
                {q}
                <span aria-hidden="true" className="faq-mark text-3xl leading-none text-amber">+</span>
              </summary>
              <p className="px-5 pb-5 text-lg leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="bg-amber text-bg">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-8 px-4 pt-16 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-8">
          <button
            type="button"
            onClick={onStart}
            className="press min-h-[72px] self-start rounded-3xl bg-bg px-8 text-[22px] font-bold text-ink hover:bg-surface"
          >
            Start your tab
          </button>
          <p className="text-[clamp(64px,19vw,300px)] leading-[0.8] font-bold tracking-[-0.06em]">BACulator</p>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-lg font-semibold">
            <Link href="/terms" className="min-h-12 py-3 underline underline-offset-4">
              Terms
            </Link>
            <Link href="/privacy" className="min-h-12 py-3 underline underline-offset-4">
              Privacy
            </Link>
            <span className="font-medium">Estimate only. Not medical or legal advice.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
