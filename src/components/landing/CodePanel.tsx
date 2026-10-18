"use client";

import type { ReactNode } from "react";

import { aboutPoint, formatBackToZero, formatBand } from "~/lib/estimate-display";
import { useChanged, type DemoNight } from "./LiveStrip";
import { DEMO_WEIGHT, type DemoSex } from "./useDemoNight";

/** A live value from the demo night: blurs in when a tap changes it, never on its own. */
function V({ children }: { children: string }) {
  const changed = useChanged(children);
  return (
    <span key={children} data-changed={changed || undefined} className="num-in code-live">
      {children}
    </span>
  );
}

/** A constant of the model, set in signal blue like a number literal. */
const N = ({ children }: { children: ReactNode }) => <span className="text-signal">{children}</span>;

function hoursMinutes(hours: number) {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h} h ${m} min` : `${m} min`;
}

/**
 * The model as a few lines of maths, set like a snippet, with the sample night's numbers filled in
 * from the same functions the night screen runs (bac-calculator.ts and estimate-display.ts).
 */
export function CodePanel({ demo }: { demo: DemoNight }) {
  const { model, result, drinks, sex, now } = demo;
  const r = sex === "male" ? 0.68 : 0.55;
  const grams = Math.round(drinks.reduce((sum, d) => sum + d.standards * 10, 0));
  const allAtOnce = grams / (r * DEMO_WEIGHT * 10);
  const bac = result?.currentBAC ?? 0;
  const point = aboutPoint(bac)[1];
  const band = formatBand(bac).replace("–", " to ");
  const hours = result?.timeToSober ?? 0;
  const zero = formatBackToZero(hours, now)?.replace("between ", "") ?? "now";

  const lines: { name: string; formula: ReactNode; value: string }[] = [
    { name: "drinks", formula: <>{drinks.length} × <N>10</N> g</>, value: `${grams} g` },
    { name: "body", formula: <>r × kg = <N>{r.toFixed(2)}</N> × <N>{DEMO_WEIGHT}</N></>, value: `${sex}, ${DEMO_WEIGHT} kg` },
    { name: "all at once", formula: <>grams ÷ (r × kg × <N>10</N>)</>, value: allAtOnce.toFixed(3) },
    { name: "now", formula: <>absorbed over <N>30</N> min, cleared <N>0.015</N> an hour</>, value: bac.toFixed(4) },
    { name: "shown", formula: <>rounded up</>, value: `about ${point}` },
    { name: "likely", formula: <>now × <N>0.75</N> … <N>1.4</N></>, value: band },
    { name: "zero", formula: <>{hours > 0 ? hoursMinutes(hours) : "now"} × <N>0.75</N> … <N>1.6</N></>, value: zero },
    { name: "drive", formula: <>while any drink counts</>, value: model.notSafeToDrive ? "not safe" : "no drinks" },
  ];

  return (
    <div data-ui className="card code-panel overflow-hidden">
      {/* taste-skill-ignore: header rule inside the data-ui panel */}
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-edge px-5 py-2 md:px-6">
        <p className="text-lg font-medium">Widmark, minute by minute</p>
        <SexSwitch sex={sex} onChange={demo.setSex} />
      </div>
      <dl className="code-lines px-5 py-3 md:px-6 md:py-4" aria-label="The estimate's model, with the sample night's numbers">
        {lines.map((l) => (
          <div key={l.name} className="code-line">
            <dt className="code-name">
              <code>{l.name}</code>
            </dt>
            <dd className="code-formula">
              <code>{l.formula}</code>
            </dd>
            <dd className="code-value">
              <code>
                <span className="code-arrow" aria-hidden="true">
                  →{" "}
                </span>
                <V>{l.value}</V>
              </code>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function SexSwitch({ sex, onChange }: { sex: DemoSex; onChange: (s: DemoSex) => void }) {
  return (
    <div role="group" aria-label="Sample person's sex, for the Widmark ratio" className="flex items-center gap-2">
      {(["female", "male"] as const).map((s) => (
        <button
          key={s}
          type="button"
          aria-pressed={sex === s}
          onClick={() => onChange(s)}
          className={`press min-h-12 rounded-full px-4 text-lg capitalize ${sex === s ? "bg-ink font-medium text-bg" : "text-ink-2 ctl-edge hover:bg-white/5 hover:text-ink"}`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
