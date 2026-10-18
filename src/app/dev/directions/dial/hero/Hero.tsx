"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { WarningMark } from "~/components/night/WarningMark";
import { useRegion } from "~/hooks/useRegion";
import { drinkLabel } from "~/lib/estimate-display";
import { useSampleNight } from "../../_kit/useSampleNight";
import { Dial } from "../Dial";

/**
 * One motif: the night dial at watch-face-in-hand scale, cropped by the viewport, with the headline on
 * the ground beside it. The serve chips add a drink to the sample person and the dial answers.
 */
export function Hero() {
  const night = useSampleNight();
  const { std } = useRegion();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const chips = night.repeat ? [night.repeat, ...night.recents].slice(0, 3) : night.recents.slice(0, 3);

  return (
    <main className="bg-bg text-ink">
      <section className="relative flex min-h-[100svh] flex-col overflow-hidden lg:block lg:h-[100svh] lg:min-h-[640px]">
        <p className="x-wide relative z-10 px-4 pt-5 text-[22px] lg:absolute lg:top-8 lg:left-16 lg:p-0">BACulator</p>

        <div className="relative z-10 flex flex-col px-4 pt-5 lg:absolute lg:top-1/2 lg:left-16 lg:w-[min(560px,40vw)] lg:-translate-y-1/2 lg:p-0">
          <h1 className="x-widest text-[clamp(40px,6vw,112px)] leading-[0.96]">Your night, on a dial.</h1>
          <p className="mt-4 max-w-[30ch] text-[clamp(18px,1.5vw,24px)] leading-snug text-ink-2">
            Add each drink as you get it, and BACulator estimates your blood alcohol and when it&apos;s likely back to zero.
          </p>
          <div className="mt-6 flex flex-col items-start gap-3">
            <Link
              href="/api/auth/signin"
              className="press dial-champagne x-wide flex min-h-14 items-center rounded-[14px] px-7 text-xl"
            >
              Start tonight
            </Link>
            <span className="text-base text-ink-2 lg:text-lg">Blood alcohol &amp; standard drinks calculator</span>
          </div>

          <div className="mt-5 lg:mt-12">
            <p className="text-lg text-ink">Try it. Sample: 75 kg, female.</p>
            <div className="mt-2 flex flex-wrap gap-2.5">
              {chips.map((q, i) => (
                <button
                  key={`${q.name ?? ""}|${q.standards}`}
                  type="button"
                  onClick={() => night.add(q)}
                  className={`press dial-key min-h-14 rounded-[12px] px-4 text-lg font-semibold ${i === 2 ? "max-[420px]:hidden" : ""}`}
                >
                  + {drinkLabel(q, std)}
                </button>
              ))}
            </div>
            {night.model.notSafeToDrive && (
              <p className="mt-2 flex items-center gap-2 text-lg font-bold text-alert">
                <WarningMark className="size-5" />
                Not safe to drive
              </p>
            )}
          </div>
        </div>

        {/* The dial: about 120vh across on desktop, cropped on the right; on phones, cropped bottom right. */}
        <div
          aria-live="polite"
          className="relative mt-3 ml-[4vw] w-[104vw] shrink-0 lg:absolute lg:top-1/2 lg:left-[max(44vw,calc(100vw-100vh))] lg:m-0 lg:w-[120vh] lg:-translate-y-1/2"
        >
          {ready ? (
            <Dial simulation={night.model.simulation} drinks={night.drinks} now={night.now} point={night.point} likely={night.likely} size="hero" className="w-full" />
          ) : (
            <div className="aspect-square w-full rounded-full bg-surface-2" />
          )}
        </div>
      </section>

      <section aria-labelledby="dial-how" className="px-4 py-20 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:px-16 lg:py-32">
        <h2 id="dial-how" className="x-widest text-[clamp(32px,3.6vw,56px)] leading-[1.02]">
          How the estimate works
        </h2>
        <p className="mt-6 max-w-[60ch] text-[clamp(19px,1.4vw,22px)] leading-relaxed text-ink-2 lg:mt-2">
          BACulator uses the Widmark formula with your weight and sex, lets each drink absorb over about half an hour, and takes
          alcohol away at about 0.015 per hour. Bodies vary by about 20%, so it shows one number rounded up with a likely range around it, and
          the time back to zero as a window rather than a promise. It never tells you when you&apos;re fit to drive.
        </p>
      </section>
    </main>
  );
}
