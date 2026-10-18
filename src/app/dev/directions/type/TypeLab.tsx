"use client";

import { Plus, TrendingUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { DrinkIcon, drinkKind } from "~/components/night/DrinkIcon";
import { WarningMark } from "~/components/night/WarningMark";
import { useRegion } from "~/hooks/useRegion";
import { drinkLabel, formatBand, formatPoint } from "~/lib/estimate-display";
import { formatClock } from "~/lib/format-clock";
import { BAND_HIGH, BAND_LOW } from "../_kit/curve";
import { useSampleNight, type SampleNight } from "../_kit/useSampleNight";
import "./type.css";

export interface Face {
  id: string;
  name: string;
  note: string;
  /** CSS font-family for everything you read and tap */
  text: string;
  /** CSS font-family for the number and headlines */
  display: string;
  numWeight: number;
  stretch?: string;
  serif?: boolean;
}

/**
 * Type round in the refined treatment: lighter weights at large sizes, 8–12px corners, no icon tiles,
 * a thin interval strip. Sizes and contrast stay at the impaired-user floors (18px body, 7:1 status).
 */
export function TypeLab({ faces }: { faces: Face[] }) {
  const night = useSampleNight();
  return (
    <main className="tlab">
      <header className="tlab-head">
        <h1>Type round</h1>
        <p>Same screen, same refined treatment, eight faces. Light block: the landing headline. Dark block: the night screen.</p>
      </header>
      <div className="tlab-grid">
        {faces.map((f) => (
          <Specimen key={f.id} face={f} night={night} />
        ))}
      </div>
    </main>
  );
}

function useFigures(ref: React.RefObject<HTMLElement | null>, family: string) {
  const [res, setRes] = useState<string>("measuring");
  useEffect(() => {
    void document.fonts.ready.then(() => {
      if (!ref.current) return;
      const span = document.createElement("span");
      span.style.cssText = `font-family:${family};font-size:100px;position:absolute;visibility:hidden;white-space:pre;font-variant-numeric:tabular-nums`;
      document.body.appendChild(span);
      const w = "0123456789".split("").map((d) => {
        span.textContent = d.repeat(10);
        return span.getBoundingClientRect().width;
      });
      span.style.fontVariantNumeric = "normal";
      span.textContent = "1.0";
      const prop = span.getBoundingClientRect().width;
      span.style.fontVariantNumeric = "tabular-nums";
      const tab = span.getBoundingClientRect().width;
      span.remove();
      const tabular = Math.max(...w) - Math.min(...w) < 5;
      setRes(`${tabular ? "Tabular figures" : "No tabular figures"} · tnum widens "1.0" by ${Math.round(((tab - prop) / prop) * 100)}%`);
    });
  }, [ref, family]);
  return res;
}

function Specimen({ face, night }: { face: Face; night: SampleNight }) {
  const { std } = useRegion();
  const ref = useRef<HTMLElement>(null);
  const figures = useFigures(ref, face.text);
  const bac = night.model.bac ?? 0;
  const [lo, hi] = formatBand(bac).split("–");
  const scale = Math.max(0.2, bac * BAND_HIGH * 1.12);
  const pct = (v: number) => `${(v / scale) * 100}%`;
  const style = {
    "--t-text": face.text,
    "--t-display": face.display,
    "--t-num-weight": face.numWeight,
    fontStretch: face.stretch,
  } as React.CSSProperties;
  const repeat = night.repeat;
  const recents = night.recents.slice(0, 2);

  return (
    <section ref={ref} className="tlab-spec" style={style} aria-label={face.name}>
      <div className="tlab-meta">
        <h2>{face.name}</h2>
        <p>{face.note}</p>
        <p className="tlab-fig">{figures}</p>
      </div>

      <div className="tlab-light">
        <p className="tlab-word">BACulator</p>
        <p className={`tlab-headline ${face.serif ? "is-serif" : ""}`}>Blood alcohol, with error bars.</p>
        <p className="tlab-support">Add each drink in one tap. See where you likely are, and when you&apos;ll be back to zero.</p>
        <span className="tlab-cta">Start tonight</span>
      </div>

      <div className="tlab-dark">
        <div className="tlab-top">
          <span className="tlab-word">BACulator</span>
          <span className="tlab-chip">Get home</span>
          <span className="tlab-chip">You</span>
        </div>
        <p className="tlab-warn">
          <WarningMark className="size-5" />
          <span>Not safe to drive</span>
          <span className="tlab-warn-num">about {formatPoint(bac)}</span>
        </p>
        <div className="tlab-est">
          <p className="tlab-label">Estimated blood alcohol</p>
          <p className="tlab-num">
            <span className="tlab-about">about</span>
            <span className={`tlab-big ${face.serif ? "is-serif" : ""}`}>{formatPoint(bac)}</span>
          </p>
          <p className="tlab-range">
            Likely {lo} to {hi}
          </p>
          <div className="tlab-strip" aria-hidden="true">
            <span className="tlab-band" style={{ left: pct(bac * BAND_LOW), width: `calc(${pct(bac * BAND_HIGH)} - ${pct(bac * BAND_LOW)})` }} />
            <span className="tlab-tick" style={{ left: pct(bac) }} />
          </div>
          {night.model.peak && (
            <p className="tlab-rising">
              <TrendingUp aria-hidden="true" className="size-5" strokeWidth={2} />
              Still rising: about {formatPoint(night.model.peak.bac)} by {formatClock(night.model.peak.at)}
            </p>
          )}
        </div>
        <dl className="tlab-rows">
          <div>
            <dt>Back to zero</dt>
            <dd>{night.model.estimate?.backToZero?.replace(/^between /, "").replace(" and ", " to ")}</dd>
          </div>
          <div>
            <dt>Counted</dt>
            <dd>
              {night.drinks.length} drinks · {std(night.totalStd)} std
            </dd>
          </div>
        </dl>
        {repeat && (
          <div className="tlab-dock">
            <button type="button" className="tlab-primary" onClick={() => night.add(repeat)}>
              <Plus aria-hidden="true" className="size-6" strokeWidth={2.25} />
              <span>
                <span className="tlab-primary-label">Add another</span>
                <span className="tlab-primary-sub">
                  {drinkLabel(repeat, std)} · {std(repeat.standards)} std
                </span>
              </span>
            </button>
            <div className="tlab-recents">
              {recents.map((d) => (
                <button key={`${d.name}|${d.standards}`} type="button" className="tlab-recent" onClick={() => night.add(d)}>
                  <DrinkIcon kind={drinkKind(d)} className="size-5" />
                  <span>
                    <span className="tlab-recent-name">{drinkLabel(d, std)}</span>
                    <span className="tlab-recent-std">{std(d.standards)} std</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
