import { describe, expect, it } from "vitest";

import { createSurface, disturb, energy, step, surfaceY } from "./surface";

const run = (seconds: number, s: ReturnType<typeof createSurface>) => {
  for (let t = 0; t < seconds; t += 1 / 60) step(s, 1 / 60);
};

describe("fluid surface", () => {
  it("rests flat with no energy", () => {
    const s = createSurface(32, 0.4);
    run(1, s);
    expect(energy(s)).toBeLessThan(1e-9);
    expect(surfaceY(s).every((y) => Math.abs(y - 0.4) < 1e-6)).toBe(true);
  });

  it("conserves volume while waves move", () => {
    const s = createSurface(32, 0.5);
    disturb(s, 0.2, -0.6);
    for (let i = 0; i < 30; i++) {
      step(s, 1 / 60);
      const mean = surfaceY(s).reduce((a, b) => a + b, 0) / 32;
      expect(mean).toBeCloseTo(0.5, 3);
    }
  });

  it("settles after a splash", () => {
    const s = createSurface(48, 0.3);
    disturb(s, 0.5, -1.2);
    run(0.2, s);
    const early = energy(s);
    run(4, s);
    expect(energy(s)).toBeLessThan(early / 100);
  });

  it("stays stable at a slow frame rate", () => {
    const s = createSurface(48, 0.3);
    disturb(s, 0.1, -2);
    for (let i = 0; i < 40; i++) step(s, 1 / 8);
    expect(surfaceY(s).every(Number.isFinite)).toBe(true);
    expect(energy(s)).toBeLessThan(1);
  });

  it("fills toward the target level", () => {
    const s = createSurface(16, 0);
    s.targetLevel = 0.6;
    run(3, s);
    expect(s.level).toBeCloseTo(0.6, 2);
  });

  it("leans with tilt", () => {
    const s = createSurface(16, 0.5);
    s.slope = 0.2;
    run(4, s);
    const y = surfaceY(s);
    expect(y[15]! - y[0]!).toBeCloseTo(0.2, 1);
  });
});
