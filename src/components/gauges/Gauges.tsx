"use client";

import { useEffect, useRef, useState } from "react";

import { useReducedMotion } from "~/hooks/useReducedMotion";
import { formatBand, formatPoint } from "~/lib/estimate-display";
import { surfaceY } from "~/lib/fluid/surface";
import { COLORS, prepareCanvas, useFluidSim, type FluidFrame } from "./useFluidSim";

export interface GaugeProps {
  bac: number;
  /** Peak still to come from drinks being absorbed. */
  peakBac: number;
  /** Increments each time a drink is added. */
  pourKey: number;
  tilt: boolean;
}

const FULL_AT = 0.2;
const toLevel = (bac: number) => (bac <= 0 ? 0 : Math.min(0.96, Math.max(0.04, bac / FULL_AT)));

/** A number that springs to its target (slight overshoot, then still). Instant with reduced motion. */
export function useSpring(target: number, { stiffness = 140, damping = 16 } = {}) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(target);
  const state = useRef({ x: target, v: 0, frame: 0, last: 0 });

  useEffect(() => {
    const s = state.current;
    if (reduced) {
      s.x = target;
      s.v = 0;
      setValue(target);
      return;
    }
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - s.last) / 1000);
      s.last = now;
      s.v += (stiffness * (target - s.x) - damping * s.v) * dt;
      s.x += s.v * dt;
      setValue(s.x);
      if (Math.abs(target - s.x) > 1e-5 || Math.abs(s.v) > 1e-4) s.frame = requestAnimationFrame(tick);
      else {
        s.x = target;
        setValue(target);
        s.frame = 0;
      }
    };
    cancelAnimationFrame(s.frame);
    s.last = performance.now();
    s.frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(s.frame);
  }, [target, reduced, stiffness, damping]);

  return value;
}

function Readout({
  bac,
  shown,
  peakBac,
  align = "left",
  compact = false,
}: {
  bac: number;
  shown: number;
  peakBac: number;
  align?: "left" | "center";
  compact?: boolean;
}) {
  const rising = peakBac > bac + 0.004;
  return (
    <div className={align === "center" ? "text-center" : ""}>
      <p className={`font-semibold text-ink-2 ${compact ? "text-base" : "text-lg"}`}>
        {compact ? "Blood alcohol" : "Estimated blood alcohol"}
      </p>
      {shown > 0.0095 && <p className="text-2xl leading-none font-semibold text-ink">about</p>}
      <p
        className={`leading-[0.95] font-bold tracking-[-0.04em] text-ink tabular-nums ${
          compact ? "text-[clamp(52px,15vw,72px)]" : "text-[clamp(56px,17vw,92px)]"
        }`}
      >
        {formatPoint(Math.max(0, shown))}
      </p>
      <p className="mt-1 text-lg font-semibold text-ink">
        {bac > 0 ? `Likely ${formatBand(bac).replace("–", " to ")}` : "Nothing counted yet"}
      </p>
      {rising && <p className="mt-1 text-lg font-semibold text-ink-2">Still rising, likely about {formatPoint(peakBac)} soon</p>}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------- */
/* 1. Living glass: a pint glass with a real height-field surface. Pours fall in as drops,       */
/*    the surface ripples, sloshes off the walls and settles. Touch it or tilt the phone.        */
/* ------------------------------------------------------------------------------------------- */
export function LivingGlass({ bac, peakBac, pourKey, tilt }: GaugeProps) {
  const reduced = useReducedMotion();
  const canvas = useRef<HTMLCanvasElement>(null);
  const shown = useSpring(bac);

  useFluidSim(canvas, {
    level: toLevel(Math.max(bac, peakBac)),
    nowLevel: toLevel(bac),
    pourKey,
    reduced,
    tilt,
    draw: (f) => canvas.current && drawGlass(canvas.current, f),
  });

  return (
    <div className="flex items-center gap-4 rounded-[36px] bg-surface p-5">
      <div className="min-w-0 flex-1">
        <Readout bac={bac} shown={shown} peakBac={peakBac} />
      </div>
      <canvas ref={canvas} aria-hidden="true" className="h-[220px] w-[124px] shrink-0 touch-none" />
    </div>
  );
}

function glassPath(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const top = 6;
  const bottom = h - 6;
  const inset = w * 0.1;
  const r = 14;
  ctx.beginPath();
  ctx.moveTo(4, top);
  ctx.lineTo(w - 4, top);
  ctx.lineTo(w - inset, bottom - r);
  ctx.quadraticCurveTo(w - inset - 1, bottom, w - inset - r, bottom);
  ctx.lineTo(inset + r, bottom);
  ctx.quadraticCurveTo(inset + 1, bottom, inset, bottom - r);
  ctx.closePath();
}

function drawGlass(el: HTMLCanvasElement, f: FluidFrame) {
  const { ctx, w, h } = prepareCanvas(el);
  const ys = surfaceY(f.surface);
  const yAt = (level: number) => h - 6 - level * (h - 12);

  ctx.save();
  glassPath(ctx, w, h);
  ctx.clip();
  ctx.fillStyle = COLORS.surface2;
  ctx.fillRect(0, 0, w, h);

  // Everything poured, including what's still absorbing: the paler body.
  ctx.beginPath();
  ctx.moveTo(0, h);
  ys.forEach((y, i) => ctx.lineTo((i / (ys.length - 1)) * w, yAt(y)));
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = COLORS.amberSoft;
  ctx.fill();

  // What's absorbed now: solid amber, its top following the waves faintly.
  ctx.beginPath();
  ctx.moveTo(0, h);
  ys.forEach((y, i) => {
    const wave = (y - f.surface.level) * 0.35;
    ctx.lineTo((i / (ys.length - 1)) * w, yAt(Math.min(y, f.nowLevel + wave)));
  });
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = COLORS.amber;
  ctx.fill();

  // Falling drops of the pour.
  ctx.fillStyle = COLORS.amber;
  for (const d of f.drops) {
    ctx.beginPath();
    ctx.ellipse(d.x * w, d.y * h, 3.2, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // A soft vertical reflection, the one detail that makes it read as glass.
  ctx.fillStyle = "rgba(237,234,228,0.07)";
  ctx.fillRect(w * 0.18, 0, w * 0.07, h);
  ctx.restore();

  glassPath(ctx, w, h);
  ctx.strokeStyle = COLORS.ink2;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.stroke();
}

/* ------------------------------------------------------------------------------------------- */
/* 2. Liquid number: the digits themselves are the glass. Liquid fills the glyphs from below,   */
/*    light above the surface, amber below. Pours drip into the numerals.                       */
/* ------------------------------------------------------------------------------------------- */
export function LiquidNumber({ bac, peakBac, pourKey, tilt }: GaugeProps) {
  const reduced = useReducedMotion();
  const canvas = useRef<HTMLCanvasElement>(null);
  const shown = useSpring(bac);
  const text = formatPoint(Math.max(0, bac));
  const textRef = useRef(text);
  textRef.current = text;

  useFluidSim(canvas, {
    level: toLevel(Math.max(bac, peakBac)),
    nowLevel: toLevel(bac),
    pourKey,
    reduced,
    tilt,
    draw: (f) => canvas.current && drawLiquidText(canvas.current, f, textRef.current),
  });

  return (
    <div className="rounded-[36px] bg-surface p-5 text-center">
      <p className="text-lg font-semibold text-ink-2">Estimated blood alcohol{shown > 0.0095 ? ", about" : ""}</p>
      <canvas ref={canvas} aria-hidden="true" className="mx-auto h-[150px] w-full max-w-[340px] touch-none" />
      <p className="sr-only">About {formatPoint(bac)}</p>
      <p className="text-lg font-semibold text-ink">
        {bac > 0 ? `Likely ${formatBand(bac).replace("–", " to ")}` : "Nothing counted yet"}
      </p>
      {peakBac > bac + 0.004 && (
        <p className="mt-1 text-lg font-semibold text-ink-2">Still rising, likely about {formatPoint(peakBac)} soon</p>
      )}
    </div>
  );
}

function drawLiquidText(el: HTMLCanvasElement, f: FluidFrame, text: string) {
  const { ctx, w, h } = prepareCanvas(el);
  const family = getComputedStyle(el).fontFamily || "sans-serif";
  const size = Math.min(h * 1.02, w / (text.length * 0.6));
  ctx.font = `700 ${size}px ${family}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const baseline = h * 0.86;
  const capTop = baseline - size * 0.72;
  const yAt = (level: number) => baseline - level * (baseline - capTop);

  ctx.fillStyle = COLORS.ink;
  ctx.fillText(text, w / 2, baseline);

  ctx.globalCompositeOperation = "source-atop";
  const ys = surfaceY(f.surface);
  ctx.beginPath();
  ctx.moveTo(0, h);
  ys.forEach((y, i) => ctx.lineTo((i / (ys.length - 1)) * w, yAt(y)));
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = COLORS.amber;
  ctx.fill();
  for (const d of f.drops) {
    ctx.beginPath();
    ctx.ellipse(d.x * w, capTop + d.y * (baseline - capTop), 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
}

/* ------------------------------------------------------------------------------------------- */
/* 3. Minimal dial: a 260° arc with a sprung needle. No ticks, no zones, no red line: the arc   */
/*    shows more or less, never a limit. A ghost arc shows where it's heading.                  */
/* ------------------------------------------------------------------------------------------- */
const START = 140; // degrees, measured clockwise from 3 o'clock
const SWEEP = 260;

function arc(cx: number, cy: number, r: number, from: number, to: number) {
  const p = (deg: number) => {
    const a = (deg * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
  };
  const [x1, y1] = p(from);
  const [x2, y2] = p(to);
  const large = to - from > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

/** The lines that sit under a dial, outside the circle, so they never get clipped by it. */
function UnderDial({ bac, peakBac }: { bac: number; peakBac: number }) {
  const rising = peakBac > bac + 0.004;
  return (
    <div className="-mt-[14%] text-center">
      <p className="text-lg font-semibold text-ink">
        {bac > 0 ? `Likely ${formatBand(bac).replace("–", " to ")}` : "Nothing counted yet"}
      </p>
      {rising && <p className="mt-1 text-lg font-semibold text-ink-2">↑ Still rising: about {formatPoint(peakBac)} soon</p>}
    </div>
  );
}

function useDialArcs(bac: number, peakBac: number) {
  const shown = useSpring(bac, { stiffness: 110, damping: 11 });
  const ghost = useSpring(Math.max(bac, peakBac), { stiffness: 90, damping: 14 });
  const frac = (b: number) => Math.min(1, Math.max(0, b / FULL_AT));
  const C = 150;
  const R = 128;
  const valueDeg = START + SWEEP * frac(shown);
  const ghostDeg = START + SWEEP * frac(ghost);
  const tip = [C + R * Math.cos((valueDeg * Math.PI) / 180), C + R * Math.sin((valueDeg * Math.PI) / 180)];
  const svg = (
    <svg aria-hidden="true" viewBox="0 0 300 300" className="absolute inset-0 size-full">
      <path d={arc(C, C, R, START, START + SWEEP)} fill="none" stroke={COLORS.surface2} strokeWidth={16} strokeLinecap="round" />
      {ghost > shown + 0.001 && (
        <path d={arc(C, C, R, START, ghostDeg)} fill="none" stroke={COLORS.amberSoft} strokeWidth={16} strokeLinecap="round" />
      )}
      {shown > 0.0005 && (
        <path d={arc(C, C, R, START, valueDeg)} fill="none" stroke={COLORS.amber} strokeWidth={16} strokeLinecap="round" />
      )}
      <circle cx={tip[0]} cy={tip[1]} r={12} fill={COLORS.bg} stroke={COLORS.ink} strokeWidth={4} />
    </svg>
  );
  return { shown, svg };
}

export function Dial({ bac, peakBac }: GaugeProps) {
  const { shown, svg } = useDialArcs(bac, peakBac);
  return (
    <div className="rounded-[36px] bg-surface p-5">
      <div className="relative mx-auto aspect-square w-full max-w-[300px]">
        {svg}
        <div className="absolute inset-x-[20%] top-[26%] bottom-[22%] flex flex-col items-center justify-center text-center">
          <p className="text-base font-semibold text-ink-2">Blood alcohol</p>
          {shown > 0.0095 && <p className="text-xl leading-none font-semibold text-ink">about</p>}
          <p className="text-[clamp(48px,15vw,68px)] leading-[0.95] font-bold tracking-[-0.04em] text-ink tabular-nums">
            {formatPoint(Math.max(0, shown))}
          </p>
        </div>
      </div>
      <UnderDial bac={bac} peakBac={peakBac} />
    </div>
  );
}

/* ------------------------------------------------------------------------------------------- */
/* 4. Dial + liquid number: the sprung arc around the outside, and inside it the number whose    */
/*    digits fill with liquid. The arc reads at a glance; the digits pour when you add a drink.  */
/* ------------------------------------------------------------------------------------------- */
export function DialLiquid({ bac, peakBac, pourKey, tilt }: GaugeProps) {
  const reduced = useReducedMotion();
  const canvas = useRef<HTMLCanvasElement>(null);
  const { shown, svg } = useDialArcs(bac, peakBac);
  const text = formatPoint(Math.max(0, bac));
  const textRef = useRef(text);
  textRef.current = text;

  useFluidSim(canvas, {
    level: toLevel(Math.max(bac, peakBac)),
    nowLevel: toLevel(bac),
    pourKey,
    reduced,
    tilt,
    draw: (f) => canvas.current && drawLiquidText(canvas.current, f, textRef.current),
  });

  return (
    <div className="rounded-[36px] bg-surface p-5">
      <div className="relative mx-auto aspect-square w-full max-w-[300px]">
        {svg}
        <div className="absolute inset-x-[15%] top-[25%] bottom-[25%] flex flex-col items-center justify-center">
          <p className="text-base font-semibold text-ink-2">
            Blood alcohol{shown > 0.0095 ? ", about" : ""}
          </p>
          <canvas ref={canvas} aria-hidden="true" className="aspect-[2/1] w-full touch-none" />
        </div>
        <p className="sr-only">About {formatPoint(bac)}</p>
      </div>
      <UnderDial bac={bac} peakBac={peakBac} />
    </div>
  );
}
