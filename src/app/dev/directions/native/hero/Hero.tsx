"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";

import { DrinkIcon, drinkKind } from "~/components/night/DrinkIcon";
import { useRegion } from "~/hooks/useRegion";
import { drinkLabel } from "~/lib/estimate-display";
import { useSampleNight } from "../../_kit/useSampleNight";
import { NightScreen } from "../Night";
import { aboutText } from "../RangeChart";

const PHONE_W = 390;
const PHONE_H = 844;

/** Scales the phone render to fit its field: height-bound on desktop, width-bound on phones. */
function usePhoneScale() {
  const field = useRef<HTMLDivElement>(null);
  const [s, setS] = useState(0.8);
  useLayoutEffect(() => {
    const el = field.current;
    if (!el) return;
    const fit = () => {
      const wide = window.innerWidth >= 1024;
      const w = el.clientWidth - (wide ? 96 : 0);
      const h = wide ? el.clientHeight - 96 : Infinity;
      setS(Math.max(0.5, Math.min(1, w / PHONE_W, h / PHONE_H)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { field, s };
}

export default function Hero() {
  const night = useSampleNight();
  const { std } = useRegion();
  const { field, s } = usePhoneScale();
  const bac = night.model.bac ?? 0;
  const chips = [night.repeat, ...night.recents].filter((d): d is NonNullable<typeof d> => !!d).slice(0, 4);

  return (
    <div className="ns-hero min-h-svh bg-bg text-ink">
      <div className="ns-hero-copy flex flex-col px-5 pt-5 sm:px-10 lg:min-h-svh lg:px-16 lg:pt-8 xl:px-24">
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-[22px] font-bold tracking-[-0.01em]">BACulator</span>
          <span className="text-[18px] font-medium text-ink-2">Blood alcohol &amp; standard drinks calculator</span>
        </p>

        <div className="flex flex-1 flex-col justify-center py-12 lg:py-16">
          <h1 className="max-w-[12ch] text-[clamp(44px,12vw,80px)] leading-[1.02] font-bold tracking-[-0.03em]">
            Roughly where you stand.
          </h1>
          <p className="mt-5 max-w-[34ch] text-[20px] leading-[1.45] font-medium text-ink-2 lg:text-[22px]">
            Add each drink in one tap. BACulator estimates your blood alcohol as one careful number with its likely
            range, and when you should be back to zero.
          </p>
          <Link
            href="/api/auth/signin"
            className="press mt-8 flex min-h-16 w-full items-center justify-center rounded-[18px] bg-amber px-8 text-[20px] font-bold text-bg active:bg-[var(--amber-press)] sm:w-fit"
          >
            Start tonight
          </Link>

          <div className="mt-12 rounded-[22px] bg-[var(--card)] p-5 lg:max-w-[560px]">
            <p className="text-[18px] font-semibold">Try it on a sample night</p>
            <p className="text-[18px] font-medium text-ink-2">Sample: 75 kg, female</p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {chips.map((d) => (
                <button
                  key={`${d.name ?? ""}|${d.standards}`}
                  type="button"
                  onClick={() => night.add(d)}
                  className="press flex min-h-14 items-center gap-3 rounded-[16px] border-[1.5px] border-[var(--edge)] bg-[var(--card-2)] px-4 py-2 text-left active:bg-[var(--card-3)]"
                >
                  <DrinkIcon kind={drinkKind(d)} className="size-6" />
                  <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3">
                    <span className="text-[18px] font-bold">+ {drinkLabel(d, std)}</span>
                    <span className="text-[18px] font-medium text-ink-2">{std(d.standards)} std</span>
                  </span>
                </button>
              ))}
            </div>
            <p aria-live="polite" className="mt-4 text-[18px] font-semibold">
              {night.point === null
                ? "No estimate without a weight."
                : `Now ${aboutText(bac)}${night.likely ? `, likely ${night.likely}` : ""}.`}
              <button
                type="button"
                onClick={night.undo}
                disabled={!night.notice || night.notice.kind !== "added"}
                className="ml-3 min-h-12 px-1 text-ink-2 underline underline-offset-4 disabled:hidden"
              >
                Undo
              </button>
            </p>
          </div>
        </div>
      </div>

      <div ref={field} className="ns-hero-phone flex items-center justify-center bg-[var(--card)] px-5 py-10 lg:p-0">
        <div style={{ width: PHONE_W * s, height: PHONE_H * s }}>
          <div
            className="relative overflow-hidden rounded-[56px] border-[10px] border-[#000] bg-bg outline-2 outline-[var(--card-3)]"
            style={{ width: PHONE_W, height: PHONE_H, transform: `scale(${s})`, transformOrigin: "0 0" }}
            aria-label="The BACulator night screen, showing the sample night"
            role="region"
          >
            <NightScreen night={night} framed />
          </div>
        </div>
      </div>

      <section aria-labelledby="ns-how" className="ns-hero-how px-5 py-16 sm:px-10 lg:px-16 lg:pt-8 lg:pb-32 xl:px-24">
        <h2 id="ns-how" className="text-[34px] leading-tight font-bold tracking-[-0.015em]">
          How the estimate works
        </h2>
        <p className="mt-4 max-w-[40ch] text-[20px] leading-[1.5] font-medium text-ink-2">
          Each drink becomes grams of alcohol, spread through your body water: the Widmark method, with
          Widmark&apos;s body-water ratio for your sex. Your body then clears about 0.015 an hour. People vary by about 20%,
          so you see one number rounded up, with the likely range under it.
        </p>
      </section>
    </div>
  );
}
