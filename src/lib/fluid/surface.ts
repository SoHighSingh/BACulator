/**
 * A liquid surface as a row of spring-coupled columns: the classic height-field approximation of
 * shallow-water waves. Each column is pulled toward the resting surface, damped, and passes some
 * of its height difference to its neighbours, which is what makes ripples travel and reflect off
 * the glass walls. Pure and framework-free so the same model can drive the web and Swift apps.
 *
 * Units are arbitrary "glass units": x from 0..1 across the glass, heights as a fraction of the
 * glass height.
 */
export interface FluidSurface {
  /** Column offsets from the resting surface. */
  height: Float32Array;
  velocity: Float32Array;
  /** Mean fill, 0..1 of the glass height. Moves toward `targetLevel`. */
  level: number;
  targetLevel: number;
  /** Tilt of the resting surface, as a slope (rise over the glass width). */
  slope: number;
}

export interface FluidParams {
  /** Pull of each column back to rest (per s²). */
  stiffness: number;
  /** Fraction of velocity lost per second. */
  damping: number;
  /** How strongly neighbours share height differences (per s²). */
  spread: number;
  /** How fast the mean level follows the target (per s). */
  fillRate: number;
}

export const DEFAULT_FLUID: FluidParams = { stiffness: 60, damping: 2.2, spread: 900, fillRate: 2.5 };

export function createSurface(columns = 48, level = 0): FluidSurface {
  return {
    height: new Float32Array(columns),
    velocity: new Float32Array(columns),
    level,
    targetLevel: level,
    slope: 0,
  };
}

/** Push the surface down (positive) or up at x (0..1), spreading over a few columns, like a drop landing. */
export function disturb(s: FluidSurface, x: number, impulse: number, width = 2) {
  const n = s.height.length;
  const c = Math.round(Math.min(1, Math.max(0, x)) * (n - 1));
  for (let i = Math.max(0, c - width); i <= Math.min(n - 1, c + width); i++) {
    const falloff = 1 - Math.abs(i - c) / (width + 1);
    s.velocity[i]! += impulse * falloff;
  }
}

/** Advance the surface by dt seconds. Substeps keep it stable at low frame rates. */
export function step(s: FluidSurface, dt: number, p: FluidParams = DEFAULT_FLUID) {
  const n = s.height.length;
  const sub = Math.max(1, Math.ceil(dt / (1 / 240)));
  const h = dt / sub;
  for (let k = 0; k < sub; k++) {
    s.level += (s.targetLevel - s.level) * Math.min(1, p.fillRate * h);
    for (let i = 0; i < n; i++) {
      const rest = s.slope * (i / (n - 1) - 0.5);
      const accel = -p.stiffness * (s.height[i]! - rest);
      s.velocity[i] = (s.velocity[i]! + accel * h) * (1 - p.damping * h);
    }
    // Neighbours share their offsets from the (possibly tilted) rest shape, not raw heights,
    // so a tilt holds while ripples still travel across it.
    const off = (i: number) => s.height[i]! - s.slope * (i / (n - 1) - 0.5);
    for (let i = 0; i < n; i++) {
      const left = i > 0 ? off(i - 1) : off(i);
      const right = i < n - 1 ? off(i + 1) : off(i);
      s.velocity[i]! += p.spread * (left + right - 2 * off(i)) * h;
    }
    let mean = 0;
    for (let i = 0; i < n; i++) {
      s.height[i]! += s.velocity[i]! * h;
      mean += s.height[i]!;
    }
    // Volume is conserved: waves move liquid around, they don't add or remove it.
    // The tilted rest shape is symmetric about the centre, so its mean is zero.
    mean /= n;
    for (let i = 0; i < n; i++) s.height[i]! -= mean;
  }
}

/** Total motion left in the surface; below ~1e-5 it looks still and the loop can sleep. */
export function energy(s: FluidSurface): number {
  let e = Math.abs(s.targetLevel - s.level) * 10;
  const n = s.height.length;
  for (let i = 0; i < n; i++) {
    const rest = s.slope * (i / (n - 1) - 0.5);
    e += s.velocity[i]! ** 2 + (s.height[i]! - rest) ** 2;
  }
  return e / n;
}

/** Surface heights (0 = bottom, 1 = top of glass) at each column, for drawing. */
export function surfaceY(s: FluidSurface): number[] {
  return Array.from(s.height, (dh) => Math.min(1, Math.max(0, s.level + dh)));
}
