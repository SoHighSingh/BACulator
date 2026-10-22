import { describe, expect, it } from "vitest";

import { minutesAgoEased, standardsEased } from "./eased-scale";

describe("eased scales", () => {
  it("map the ends and round-trip every position", () => {
    for (const s of [minutesAgoEased, standardsEased]) {
      expect(s.fromT(0)).toBeCloseTo(s.min, 9);
      expect(s.fromT(1)).toBeCloseTo(s.max, 9);
      for (let i = 0; i <= 100; i++) expect(s.toT(s.fromT(i / 100))).toBeCloseTo(i / 100, 9);
      expect(s.toT(s.max * 2)).toBe(1);
      expect(s.toT(s.min - 5)).toBe(0);
    }
  });

  it("rise smoothly: monotonic, with no jump in value per step of travel", () => {
    for (const s of [minutesAgoEased, standardsEased]) {
      let prevDelta = 0;
      for (let i = 1; i <= 1000; i++) {
        const delta = s.fromT(i / 1000) - s.fromT((i - 1) / 1000);
        expect(delta).toBeGreaterThan(0);
        // An exponential: each step a little bigger than the last, never a sudden ×2.
        if (prevDelta) expect(delta / prevDelta).toBeLessThan(1.01);
        prevDelta = delta;
      }
    }
  });

  it("put about 2 h at the middle of the time slider and about 2.5 at the middle of the amount", () => {
    expect(minutesAgoEased.fromT(0.5)).toBeGreaterThan(120);
    expect(minutesAgoEased.fromT(0.5)).toBeLessThan(140);
    expect(standardsEased.fromT(0.5)).toBeGreaterThan(2.2);
    expect(standardsEased.fromT(0.5)).toBeLessThan(2.8);
  });

  it("round to values people say", () => {
    expect(minutesAgoEased.round(42.4)).toBe(42);
    expect(minutesAgoEased.round(131)).toBe(130);
    expect(minutesAgoEased.round(800)).toBe(720);
    expect(standardsEased.round(1.64)).toBe(1.6);
    expect(standardsEased.round(3.3)).toBe(3.5);
    expect(standardsEased.round(0)).toBe(0.1);
  });

  it("step one rounded value at a time, both ways, across the change of step", () => {
    expect(standardsEased.step(1.5, 1)).toBe(1.6);
    expect(standardsEased.step(2.9, 1)).toBe(3);
    expect(standardsEased.step(3, 1)).toBe(3.5);
    expect(standardsEased.step(3, -1)).toBe(2.9);
    expect(standardsEased.step(0.1, -1)).toBe(0.1);
    expect(minutesAgoEased.step(59, 1)).toBe(60);
    expect(minutesAgoEased.step(60, 1)).toBe(65);
    expect(minutesAgoEased.step(60, -1)).toBe(59);
    expect(minutesAgoEased.step(0, -1)).toBe(0);
    expect(minutesAgoEased.step(720, 1)).toBe(720);
  });
});
