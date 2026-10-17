"use client";

import { useMemo, useState } from "react";

import { Dial, DialLiquid, LiquidNumber, LivingGlass, type GaugeProps } from "~/components/gauges/Gauges";
import { calculateBAC } from "~/lib/bac-calculator";

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);

/** Dev-only: three ways to show the estimate, driven by the same sample night, side by side. */
export function GaugeLab() {
  const [drinks, setDrinks] = useState(() => [
    { id: "a", standards: 1.6, finishedAt: minutesAgo(95) },
    { id: "b", standards: 1.6, finishedAt: minutesAgo(50) },
    { id: "c", standards: 1.6, finishedAt: minutesAgo(20) },
  ]);
  const [pourKey, setPourKey] = useState(0);
  const [tilt, setTilt] = useState(false);
  const [variant, setVariant] = useState<"all" | "glass" | "number" | "dial" | "combo">("all");

  const result = useMemo(
    () => calculateBAC({ drinks, userWeight: 75, userSex: "female", currentTime: new Date() }),
    [drinks],
  );
  const props: GaugeProps = {
    bac: result?.currentBAC ?? 0,
    peakBac: result && result.timeToPeak > 0 ? result.peakBAC : 0,
    peakAt: result && result.timeToPeak > 0 ? new Date(Date.now() + result.timeToPeak * 3_600_000) : null,
    pourKey,
    tilt,
  };

  async function enableTilt() {
    const Orientation = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (Orientation.requestPermission) {
      const answer = await Orientation.requestPermission().catch(() => "denied");
      if (answer !== "granted") return;
    }
    setTilt((t) => !t);
  }

  const button = "press min-h-12 rounded-full bg-surface-2 px-4 text-base font-semibold text-ink active:bg-surface-3";

  return (
    <main className="min-h-dvh bg-bg px-4 py-6 text-ink">
      <div className="mx-auto flex max-w-[480px] flex-col gap-5">
        <h1 className="text-2xl font-bold">Gauge lab</h1>
        <p className="text-lg text-ink-2">
          Same night, four displays. Tap or drag the liquid to push it; turn on tilt on a phone and lean it.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="press min-h-12 rounded-full bg-amber px-5 text-base font-bold text-bg"
            onClick={() => {
              setDrinks((d) => [...d, { id: String(Date.now()), standards: 1.6, finishedAt: new Date() }]);
              setPourKey((k) => k + 1);
            }}
          >
            + Add schooner
          </button>
          <button type="button" className={button} onClick={() => setDrinks((d) => d.slice(0, -1))}>
            Undo
          </button>
          <button type="button" className={button} onClick={() => void enableTilt()} aria-pressed={tilt}>
            Tilt {tilt ? "on" : "off"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "combo", "glass", "number", "dial"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={variant === v}
              onClick={() => setVariant(v)}
              className={`${button} ${variant === v ? "!bg-ink !text-bg" : ""}`}
            >
              {{ all: "All", combo: "Dial + number", glass: "Living glass", number: "Liquid number", dial: "Dial" }[v]}
            </button>
          ))}
        </div>

        {(variant === "all" || variant === "combo") && (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-bold text-ink-2">Dial + liquid number</h2>
            <DialLiquid {...props} />
          </section>
        )}
        {(variant === "all" || variant === "glass") && (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-bold text-ink-2">1 · Living glass</h2>
            <LivingGlass {...props} />
          </section>
        )}
        {(variant === "all" || variant === "number") && (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-bold text-ink-2">2 · Liquid number</h2>
            <LiquidNumber {...props} />
          </section>
        )}
        {(variant === "all" || variant === "dial") && (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-bold text-ink-2">3 · Minimal dial</h2>
            <Dial {...props} />
          </section>
        )}
      </div>
    </main>
  );
}
