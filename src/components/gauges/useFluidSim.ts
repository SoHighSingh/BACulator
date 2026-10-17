import { useEffect, useRef } from "react";

import { createSurface, disturb, energy, step, type FluidSurface } from "~/lib/fluid/surface";

interface Drop {
  x: number; // 0..1 across the container
  y: number; // 0 = top, 1 = bottom
  vy: number;
}

export interface FluidFrame {
  surface: FluidSurface;
  drops: Drop[];
  /** 0..1 level of the "now" layer (what's absorbed), drawn under the surface. */
  nowLevel: number;
}

interface Options {
  /** Level the liquid surface settles at (0..1): everything poured, including what's still absorbing. */
  level: number;
  /** Level of the absorbed layer (0..1). */
  nowLevel: number;
  /** Increments to trigger a pour (e.g. the number of drinks added). */
  pourKey: number;
  reduced: boolean;
  /** Use the phone's tilt to lean the surface (Android works without asking; iOS needs permission). */
  tilt: boolean;
  draw: (frame: FluidFrame) => void;
}

const GRAVITY = 4.5; // glass heights per s²
const IMPACT = -0.9; // a drop pushes the surface down where it lands

/**
 * Runs a height-field liquid: pours arrive as falling drops that ripple the surface where they land,
 * a tap or drag on the canvas pushes the liquid, and (optionally) tilting the phone leans it. The loop
 * sleeps as soon as the surface is still, so nothing moves on its own at rest.
 */
export function useFluidSim(canvas: React.RefObject<HTMLCanvasElement | null>, opts: Options) {
  const sim = useRef<{ surface: FluidSurface; drops: Drop[]; nowLevel: number } | null>(null);
  const frame = useRef(0);
  const last = useRef(0);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  // Start at the real level: opening never shows an empty glass filling up.
  sim.current ??= { surface: createSurface(56, opts.level), drops: [], nowLevel: opts.nowLevel };

  const wake = () => {
    if (frame.current) return;
    last.current = performance.now();
    frame.current = requestAnimationFrame(loop);
  };

  function loop(now: number) {
    const s = sim.current!;
    const o = optsRef.current;
    const dt = Math.min(0.05, (now - last.current) / 1000);
    last.current = now;

    if (o.reduced) {
      s.surface.level = s.surface.targetLevel;
      s.surface.height.fill(0);
      s.surface.velocity.fill(0);
      s.nowLevel = o.nowLevel;
      s.drops = [];
    } else {
      s.nowLevel += (o.nowLevel - s.nowLevel) * Math.min(1, 2.5 * dt);
      for (const d of s.drops) {
        d.vy += GRAVITY * dt;
        d.y += d.vy * dt;
      }
      const landed = s.drops.filter((d) => d.y >= 1 - s.surface.level);
      for (const d of landed) disturb(s.surface, d.x, IMPACT * Math.min(1.4, d.vy), 1);
      s.drops = s.drops.filter((d) => d.y < 1 - s.surface.level);
      step(s.surface, dt);
    }
    o.draw({ surface: s.surface, drops: s.drops, nowLevel: s.nowLevel });

    const busy = s.drops.length > 0 || energy(s.surface) > 1e-6 || Math.abs(s.nowLevel - o.nowLevel) > 0.001;
    frame.current = busy && !o.reduced ? requestAnimationFrame(loop) : 0;
  }

  // Level changes: start filling toward it.
  useEffect(() => {
    sim.current!.surface.targetLevel = opts.level;
    wake();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.level, opts.nowLevel, opts.reduced]);

  // A pour: a short stream of drops from just above the glass.
  useEffect(() => {
    if (opts.pourKey === 0 || opts.reduced) return;
    const s = sim.current!;
    let n = 0;
    const id = window.setInterval(() => {
      for (let k = 0; k < 3; k++) s.drops.push({ x: 0.42 + Math.random() * 0.16, y: -0.05 - Math.random() * 0.1, vy: 0.4 });
      wake();
      if (++n >= 9) window.clearInterval(id);
    }, 45);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.pourKey]);

  // Touch the liquid: tap or drag pushes the surface where your finger is.
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let lastX: number | null = null;
    const push = (e: PointerEvent) => {
      if (optsRef.current.reduced) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const speed = lastX == null ? 1 : Math.min(3, Math.abs(x - lastX) * 40);
      lastX = x;
      disturb(sim.current!.surface, x, -0.5 * Math.max(0.6, speed), 2);
      wake();
    };
    const down = (e: PointerEvent) => {
      lastX = null;
      push(e);
    };
    const move = (e: PointerEvent) => e.buttons && push(e);
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tilt: lean the resting surface with the phone, like liquid in a real glass.
  useEffect(() => {
    if (!opts.tilt || opts.reduced) {
      sim.current!.surface.slope = 0;
      wake();
      return;
    }
    const onTilt = (e: DeviceOrientationEvent) => {
      const gamma = Math.max(-45, Math.min(45, e.gamma ?? 0));
      const slope = -Math.tan((gamma * Math.PI) / 180) * 0.55;
      if (Math.abs(slope - sim.current!.surface.slope) > 0.004) {
        sim.current!.surface.slope = slope;
        wake();
      }
    };
    window.addEventListener("deviceorientation", onTilt);
    return () => window.removeEventListener("deviceorientation", onTilt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.tilt, opts.reduced]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);
}

/** Sizes a canvas to its CSS box at device pixel ratio and returns a 2D context in CSS pixels. */
export function prepareCanvas(el: HTMLCanvasElement) {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const w = el.clientWidth;
  const h = el.clientHeight;
  if (el.width !== Math.round(w * dpr) || el.height !== Math.round(h * dpr)) {
    el.width = Math.round(w * dpr);
    el.height = Math.round(h * dpr);
  }
  const ctx = el.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

export const COLORS = {
  amber: "#f2b84b",
  amberSoft: "#7d6230",
  surface2: "#262421",
  ink: "#edeae4",
  ink2: "#bdb8b0",
  bg: "#121110",
};
