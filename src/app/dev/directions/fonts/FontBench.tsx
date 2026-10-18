"use client";

import { useEffect, useRef, useState } from "react";

interface Face {
  name: string;
  v: string;
  stretch?: string;
}

/**
 * Font bench: each candidate sets the estimate and a column of values, and the page measures whether
 * its figures are truly tabular (every digit the same advance with tnum on) in the browser.
 */
export function FontBench({ faces }: { faces: Face[] }) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 text-ink">
      <h1 className="text-3xl font-bold">Figures bench</h1>
      <p className="mt-2 text-lg text-ink-2">
        Tabular = every digit 0–9 has the same width with tnum on. Spread = widest minus narrowest digit, in em, without tnum.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {faces.map((f) => (
          <Specimen key={f.name} face={f} />
        ))}
      </div>
    </main>
  );
}

function Specimen({ face }: { face: Face }) {
  const ref = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<{ tabular: boolean; spread: number } | null>(null);
  const family = `var(${face.v})`;

  useEffect(() => {
    void document.fonts.ready.then(() => {
      const c = document.createElement("canvas").getContext("2d");
      const el = ref.current;
      if (!c || !el) return;
      const measure = (tnum: boolean) => {
        const span = document.createElement("span");
        span.style.cssText = `font-family:${getComputedStyle(el).fontFamily};font-size:100px;font-weight:700;font-stretch:${face.stretch ?? "100%"};position:absolute;visibility:hidden;white-space:pre;font-variant-numeric:${tnum ? "tabular-nums" : "normal"}`;
        document.body.appendChild(span);
        const widths = "0123456789".split("").map((d) => {
          span.textContent = d.repeat(10);
          return span.getBoundingClientRect().width / 10;
        });
        span.remove();
        return widths;
      };
      const tab = measure(true);
      const prop = measure(false);
      setResult({
        tabular: Math.max(...tab) - Math.min(...tab) < 0.5,
        spread: (Math.max(...prop) - Math.min(...prop)) / 100,
      });
    });
  }, [face.stretch]);

  return (
    <section ref={ref} className="rounded-2xl bg-surface p-5" style={{ fontFamily: family, fontStretch: face.stretch }}>
      <h2 className="text-lg font-semibold text-ink-2" style={{ fontFamily: "inherit" }}>
        {face.name}
      </h2>
      <p className="mt-2 flex items-baseline gap-2 [font-variant-numeric:tabular-nums_lining-nums]">
        <span className="text-2xl font-semibold">about</span>
        <span className="text-[88px] leading-none font-bold tracking-[-0.04em]">0.08</span>
      </p>
      <p className="mt-1 text-xl font-semibold">Likely 0.06 to 0.11 · 10:41 pm</p>
      <div className="mt-3 grid grid-cols-2 gap-x-6 text-xl font-semibold">
        <div className="text-right [font-variant-numeric:tabular-nums_lining-nums]">
          <p>0.11</p>
          <p>0.08</p>
          <p>1.10</p>
          <p>11:11</p>
        </div>
        <div className="text-right">
          <p>0.11</p>
          <p>0.08</p>
          <p>1.10</p>
          <p>11:11</p>
        </div>
      </div>
      <p className="mt-3 text-base text-ink-2">
        Left column tnum, right default.{" "}
        {result ? (
          <strong className="text-ink">
            {result.tabular ? "Tabular: yes" : "Tabular: NO"} · spread {result.spread.toFixed(3)} em
          </strong>
        ) : (
          "Measuring…"
        )}
      </p>
      <p className="mt-2 text-lg font-medium">Schooner of lager · 1.6 std · Back to zero 2:30–4:00 am</p>
    </section>
  );
}
