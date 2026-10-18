"use client";

import { GlassWater, Plus, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { BrandMark } from "~/components/BrandMark";
import { DrinkIcon, drinkKind } from "~/components/night/DrinkIcon";
import { lightAt } from "~/components/night/GetHome";
import { WarningMark } from "~/components/night/WarningMark";
import { useRegion } from "~/hooks/useRegion";
import { callLabel } from "~/lib/emergency";
import { aboutPoint, drinkLabel, formatBand } from "~/lib/estimate-display";
import { REGION_IDS, REGIONS } from "~/lib/region";
import { AddFlowVideo } from "./AddFlowVideo";
import { CodePanel } from "./CodePanel";
import { LiveStrip, StripGlyph, type DemoNight } from "./LiveStrip";
import { NightBar } from "./NightBar";
import { DEMO_DRINKS, DEMO_WEIGHT, useDemoNight } from "./useDemoNight";
import "./landing.css";

interface LandingProps {
  onStart: () => void;
}

const QUESTIONS = [
  {
    q: "How accurate is it?",
    a: "It's an estimate. The same drinks can read about a fifth higher or lower between people and nights, so you see a likely range under the number. It uses your weight and sex, and how alcohol is absorbed and cleared over time.",
  },
  {
    q: "Can it tell me if I'm okay to drive?",
    a: "No. While any drink counts, BACulator says one thing: not safe to drive.",
  },
  {
    q: "What counts as a standard drink?",
    a: "10 grams of alcohol in most guidelines, 14 grams in the US. Pick yours any time. Your drinks stay the same; only the numbers change.",
  },
  {
    q: "Does it work with no signal?",
    a: "Yes. Drinks you add are saved on your phone and sync when you're back online.",
  },
  {
    q: "Is it private?",
    a: "Yes. Your drinks are yours: download or delete everything yourself, any time, from your account.",
  },
  {
    q: "What does it cost?",
    a: "Nothing. It's free, with no ads.",
  },
];

const HOW: [string, string][] = [
  ["Body water.", "Alcohol spreads through the water in your body. Widmark's ratio is 0.68 for men and 0.55 for women."],
  ["Absorption.", "About 95% of each drink is in your blood within 30 minutes, so the estimate keeps rising after you add it."],
  ["Elimination.", "Your body clears about 0.015 an hour, from the moment each drink lands."],
  ["Rounding.", "One number, rounded up, with a likely range of 0.75 to 1.4 times the model. Back to zero spans 0.75 to 1.6 times."],
];

const d = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;
const H2 = "text-[clamp(34px,4.2vw,68px)] leading-[0.98] font-semibold tracking-[-0.05em] text-balance";

/** Sections rise once as they first scroll in. Off under reduced motion; visible without script. */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const items = [...root.querySelectorAll<HTMLElement>(".reveal")].filter((el) => el.getBoundingClientRect().top > window.innerHeight);
    if (!items.length) return;
    root.dataset.reveal = "armed";
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).dataset.in = "";
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    // Anything already on screen when the page opens is simply there.
    root.querySelectorAll<HTMLElement>(".reveal").forEach((el) => {
      if (items.includes(el)) io.observe(el);
      else el.dataset.in = "";
    });
    return () => io.disconnect();
  }, []);
  return ref;
}

function RegionSwitch() {
  const { region, setRegion } = useRegion();
  return (
    <div role="group" aria-label="Standard drink size" className="flex flex-wrap items-center gap-2 text-lg text-ink-2">
      <span className="mr-1">Standard drink</span>
      {REGION_IDS.map((id) => (
        <button
          key={id}
          type="button"
          aria-pressed={region.id === id}
          onClick={() => setRegion(id)}
          className={`press min-h-12 rounded-key px-4 text-lg ${region.id === id ? "bg-ink font-medium text-bg" : "ctl-edge hover:bg-white/5 hover:text-ink"}`}
        >
          {REGIONS[id].gramsPerStandard} g{id === "us" ? " (US)" : ""}
        </button>
      ))}
    </div>
  );
}

function StartButton({ onStart, className = "" }: { onStart: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onStart}
      className={`press key-glow flex min-h-14 items-center gap-3 rounded-key bg-ink pr-7 pl-6 text-lg font-semibold text-bg ${className}`}
    >
      <StripGlyph tone="dark" className="h-3.5 w-9" />
      Start tonight
    </button>
  );
}

/** The try-it row under the giant strip: the drinks, the status, and what the last tap did. */
function TryIt({ demo }: { demo: DemoNight }) {
  const { std } = useRegion();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <p className="text-lg text-ink-2">
          Try it. A sample night, {DEMO_WEIGHT} kg, {demo.sex}:
        </p>
        <div className="flex flex-wrap gap-2">
          {DEMO_DRINKS.map((q) => (
            <button
              key={q.name}
              type="button"
              onClick={() => demo.add(q)}
              onPointerMove={lightAt}
              className="press lit flex min-h-12 items-center gap-2.5 rounded-key bg-white/[0.06] px-4 text-lg font-medium chip-edge"
            >
              {q.standards > 0 ? (
                <DrinkIcon kind={drinkKind(q)} className="size-5 text-ink-2" />
              ) : (
                <GlassWater aria-hidden="true" className="size-5 text-ink-2" strokeWidth={2} />
              )}
              Add {drinkLabel(q, std).toLowerCase()}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {demo.model.notSafeToDrive && (
          <p className="flex min-h-12 items-center gap-2.5 rounded-key bg-alert/[0.12] px-4 text-lg font-semibold text-alert alert-edge">
            <WarningMark className="size-5" />
            Not safe to drive
          </p>
        )}
        <div className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-2 text-lg" aria-live="polite">
          {demo.lastAdded ? (
            <span key={demo.lastAdded.id} className="status-in flex items-center gap-3">
              <span>
                <span className="text-ink-2">Added: </span>
                <span className="font-medium">{drinkLabel(demo.lastAdded, std)}</span>
              </span>
              <button type="button" onClick={demo.undo} className="press min-h-12 rounded-key bg-white/10 px-4 font-medium hover:bg-white/15">
                Undo
              </button>
            </span>
          ) : (
            <span className="text-ink-2">{demo.drinks.length} drinks so far tonight</span>
          )}
          {demo.drinks.length > 4 && (
            <button
              type="button"
              onClick={demo.reset}
              className="press flex min-h-12 items-center gap-2 rounded-key px-4 font-medium text-ink-2 ctl-edge hover:text-ink"
            >
              <RotateCcw aria-hidden="true" className="size-4" strokeWidth={2.25} />
              Start over
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** The public front door: the range strip at the width of the window, then the maths behind it. */
export function Landing({ onStart }: LandingProps) {
  const { emergency } = useRegion();
  const demo = useDemoNight();
  const root = useReveal();
  const bac = demo.model.bac ?? 0;
  // The light turns red the way the night screen's does, but only once the visitor has tapped.
  const alert = demo.touched && demo.model.notSafeToDrive;
  const spoken = demo.ready
    ? `Sample night: estimated blood alcohol about ${aboutPoint(bac)[1]}, likely ${formatBand(bac).replace("–", " to ")}.${demo.model.notSafeToDrive ? " Not safe to drive." : ""}`
    : "";

  return (
    <div ref={root} className="landing relative overflow-x-clip bg-bg text-ink">
      <div aria-hidden="true" className={`hero-field pointer-events-none absolute inset-x-0 top-0 h-[min(1100px,130vh)] ${alert ? "is-alert" : ""}`} />

      <nav className="wrap relative z-10 flex items-center gap-2 pt-[max(12px,env(safe-area-inset-top))]">
        <Link href="/" className="flex min-h-12 flex-1 items-center gap-3">
          <BrandMark size={40} tone={alert ? "alert" : "calm"} />
          <span className="text-lg font-semibold tracking-[-0.02em]">BACulator</span>
          <span className="hidden text-lg text-ink-2 md:inline">Blood alcohol estimator</span>
        </Link>
        <a href="#maths" className="hidden min-h-12 items-center rounded-key px-4 text-lg text-ink-2 hover:text-ink md:flex">
          The maths
        </a>
        <a href="#questions" className="hidden min-h-12 items-center rounded-key px-4 text-lg text-ink-2 hover:text-ink md:flex">
          Questions
        </a>
        <button type="button" onClick={onStart} className="press min-h-12 rounded-key px-5 text-lg font-medium ctl-edge hover:bg-white/5">
          Sign in
        </button>
      </nav>

      {/* Hero: one line, then the reading on its strip at the width of the window, then the action
          and the try-it drinks side by side. */}
      <header className="relative">
        <div className="wrap pt-[clamp(20px,4vh,56px)]">
          <h1 className="rise text-[clamp(30px,10vw,150px)] leading-[0.9] font-semibold tracking-[-0.05em] whitespace-nowrap" style={d(0)}>
            See where you’re at.
          </h1>
        </div>

        <div className="rise wrap mt-[clamp(24px,5vh,56px)]" style={d(120)}>
          {demo.ready ? <LiveStrip demo={demo} /> : <div className="h-[calc(var(--num)*0.8+var(--strip-h)+80px)]" />}
          <p className="sr-only" aria-live="polite">
            {spoken}
          </p>
        </div>

        <div className="wrap rise mt-7 grid gap-x-12 gap-y-7 lg:mt-9 lg:grid-cols-12 lg:items-start" style={d(220)}>
          <div className="flex flex-col gap-5 lg:col-span-5">
            <p className="max-w-[40ch] text-xl leading-snug">
              One tap per drink. BACulator shows an honest estimate with its likely range, and when you&apos;ll be back to zero.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <StartButton onStart={onStart} />
              <a href="#maths" className="press hidden min-h-14 items-center rounded-key px-6 text-lg font-medium ctl-edge hover:bg-white/5 sm:flex">
                See the maths
              </a>
            </div>
            <p className="text-lg text-ink-2">Free. Sign in with Google to keep your drinks.</p>
          </div>
          <div className="lg:col-span-7">
            <TryIt demo={demo} />
          </div>
        </div>
      </header>

      {/* The night as one bar: the same strip, stretched over time. */}
      <section aria-labelledby="bar-heading" className="wrap sect">
        <h2 id="bar-heading" className={`reveal ${H2}`}>
          <span className="block">Up in half an hour.</span>
          <span className="block text-ink-2">Down for hours.</span>
        </h2>
        <div className="reveal mt-[clamp(32px,5vw,80px)]" style={d(90)}>
          <NightBar demo={demo} />
        </div>
      </section>

      {/* The maths, as a few lines, live. */}
      <section id="maths" aria-labelledby="maths-heading" className="wrap sect grid scroll-mt-6 gap-x-12 gap-y-8 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-y-10">
        <div className="reveal flex flex-col gap-5 lg:col-span-4 lg:row-start-1">
          <h2 id="maths-heading" className={H2}>
            The maths, in the open.
          </h2>
          <p className="max-w-[44ch] text-xl leading-relaxed">
            A published model, run minute by minute. Tap a drink up top, or switch the sample person, and watch every number change.
          </p>
        </div>
        <div className="reveal min-w-0 lg:col-span-8 lg:col-start-5 lg:row-span-2 lg:row-start-1" style={d(90)}>
          {demo.ready && <CodePanel demo={demo} />}
        </div>
        <div className="reveal flex flex-col gap-6 lg:col-span-4 lg:row-start-2">
          <ul className="flex flex-col gap-5 text-lg">
            {HOW.map(([t, body]) => (
              <li key={t} className="flex gap-4">
                <StripGlyph className="mt-2 h-3 w-8" />
                <span>
                  <strong className="font-semibold">{t}</strong> <span className="text-ink-2">{body}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-lg text-ink-2">Sources: Widmark 1932; Jones 2010; Gullberg 2007.</p>
        </div>
      </section>

      {/* One tap: the real add flow. */}
      <section aria-labelledby="tap-heading" className="wrap sect grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
        <div className="reveal flex flex-col gap-5 lg:order-2 lg:col-span-6 lg:col-start-7">
          <h2 id="tap-heading" className={H2}>
            Same again is one tap.
          </h2>
          <p className="max-w-[44ch] text-xl leading-relaxed">
            The drink you just had is the white button at the bottom, at its real size. Anything else, type it or say it the way you&apos;d order it.
          </p>
          <p className="max-w-[44ch] text-xl leading-relaxed text-ink-2">Tapped the wrong thing? Undo stays right there. Works with no signal, too.</p>
        </div>
        <div className="reveal min-w-0 lg:order-1 lg:col-span-5" style={d(90)}>
          <AddFlowVideo />
        </div>
      </section>

      {/* For whoever's holding the phone. */}
      <section aria-labelledby="help-heading" className="sect bg-surface">
        <div className="wrap grid gap-6 py-[clamp(48px,9vh,128px)] lg:grid-cols-12 lg:gap-12">
          <p className="reveal text-[clamp(22px,2vw,28px)] leading-tight font-semibold tracking-[-0.03em] lg:col-span-4">For whoever&apos;s holding the phone.</p>
          <div className="reveal flex flex-col gap-5 lg:col-span-8" style={d(90)}>
            <h2 id="help-heading" className={H2}>
              <span className="block">Can&apos;t wake someone?</span>
              <span className="block text-alert">{callLabel(emergency)}.</span>
            </h2>
            <p className="max-w-[52ch] text-xl leading-relaxed">Also call if they&apos;re breathing slowly, or vomiting while drowsy. Stay with them.</p>
            <p className="max-w-[52ch] text-xl text-ink-2">
              Getting home sits on the same screen as your drinks: call for help, text a mate or find a ride, in one tap.
            </p>
          </div>
        </div>
      </section>

      {/* Questions. */}
      <section id="questions" aria-labelledby="questions-heading" className="wrap sect grid scroll-mt-6 gap-6 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-5">
          <h2 id="questions-heading" className={`reveal ${H2} lg:sticky lg:top-8`}>
            Questions
          </h2>
        </div>
        <div className="reveal flex flex-col gap-2 lg:col-span-7" style={d(90)}>
          {QUESTIONS.map(({ q, a }) => (
            <details key={q} name="faq" className="faq-tile group">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                {q}
                <Plus aria-hidden="true" className="size-5 shrink-0 text-ink-2 transition-transform group-open:rotate-45" strokeWidth={2.25} />
              </summary>
              <p className="max-w-[60ch] px-6 pb-6 text-lg leading-relaxed text-ink-2">{a}</p>
            </details>
          ))}
          <div className="mt-6">
            <RegionSwitch />
          </div>
        </div>
      </section>

      {/* Close: the action, then the name built large on the strip. */}
      <footer className="sect relative overflow-x-clip">
        <div className="wrap flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
          <h2 className={`reveal ${H2}`}>Count it honestly.</h2>
          <div className="reveal" style={d(90)}>
            <StartButton onStart={onStart} />
          </div>
        </div>
        <div aria-hidden="true" className="wrap mt-[clamp(40px,7vh,112px)]">
          <p className="text-[clamp(56px,20.6vw,380px)] leading-[0.8] font-semibold tracking-[-0.065em] whitespace-nowrap">BACulator</p>
          <div className="relative mt-[clamp(16px,2vw,28px)] -mx-[var(--gutter)] h-[var(--strip-h)] bg-white/[0.07]">
            <div className="absolute inset-y-0 left-[calc(var(--gutter)+18%)] w-[44%] rounded-circle bg-signal" />
            <div className="absolute -inset-y-3 left-[calc(var(--gutter)+34%)] w-[6px] rounded-circle bg-ink tick-cut" />
          </div>
        </div>
        <div className="wrap flex flex-wrap items-center gap-x-8 gap-y-2 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))] text-lg">
          <Link href="/terms" className="flex min-h-12 items-center text-ink-2 underline underline-offset-4 hover:text-ink">
            Terms
          </Link>
          <Link href="/privacy" className="flex min-h-12 items-center text-ink-2 underline underline-offset-4 hover:text-ink">
            Privacy
          </Link>
          <Link href="/account/delete" className="flex min-h-12 items-center text-ink-2 underline underline-offset-4 hover:text-ink">
            Delete my data
          </Link>
          <span className="text-ink-2">Estimate only. Not medical or legal advice.</span>
        </div>
      </footer>
    </div>
  );
}
