import { describe, expect, it } from "vitest";

import { ladder, minutesAgoScale, standardsScale } from "./log-scale";

describe("ladder", () => {
  const l = ladder(0, [
    { upTo: 10, step: 2 },
    { upTo: 40, step: 10 },
  ]);

  it("lists every rung once, ascending, with the endpoints", () => {
    expect(l.values).toEqual([0, 2, 4, 6, 8, 10, 20, 30, 40]);
    expect(l.min).toBe(0);
    expect(l.max).toBe(40);
  });

  it("round-trips every rung through indexOf", () => {
    l.values.forEach((v, i) => {
      expect(l.indexOf(v)).toBe(i);
      expect(l.snap(v)).toBe(v);
    });
  });

  it("snaps to the nearest rung and clamps outside the range", () => {
    expect(l.snap(2.9)).toBe(2);
    expect(l.snap(3.1)).toBe(4);
    expect(l.snap(14)).toBe(10);
    expect(l.snap(16)).toBe(20);
    expect(l.snap(-5)).toBe(0);
    expect(l.snap(999)).toBe(40);
    expect(l.snap(Number.NaN)).toBe(0);
  });

  it("moves by whole rungs from the nearest rung, clamped at the ends", () => {
    expect(l.move(0, 1)).toBe(2);
    expect(l.move(10, 1)).toBe(20);
    expect(l.move(10, -1)).toBe(8);
    expect(l.move(3, 1)).toBe(6);
    expect(l.move(40, 1)).toBe(40);
    expect(l.move(0, -1)).toBe(0);
    expect(l.move(0, 100)).toBe(40);
  });

  it("reports the distance a move would travel", () => {
    expect(l.delta(0, 1)).toBe(2);
    expect(l.delta(10, 1)).toBe(10);
    expect(l.delta(40, 1)).toBe(0);
    expect(l.delta(20, -1)).toBe(-10);
  });

  it("rejects a non-positive step", () => {
    expect(() => ladder(0, [{ upTo: 1, step: 0 }])).toThrow();
  });
});

describe("minutesAgoScale", () => {
  it("runs from now to 12 hours with steps that grow with distance", () => {
    expect(minutesAgoScale.min).toBe(0);
    expect(minutesAgoScale.max).toBe(720);
    expect(minutesAgoScale.values.length).toBe(61);
    expect(minutesAgoScale.delta(0, 1)).toBe(1);
    expect(minutesAgoScale.delta(15, 1)).toBe(5);
    expect(minutesAgoScale.delta(60, 1)).toBe(10);
    expect(minutesAgoScale.delta(180, 1)).toBe(15);
    expect(minutesAgoScale.delta(360, 1)).toBe(30);
  });

  it("is strictly monotonic", () => {
    const v = minutesAgoScale.values;
    for (let i = 1; i < v.length; i++) expect(v[i]!).toBeGreaterThan(v[i - 1]!);
  });

  it("keeps the chip values as rungs", () => {
    for (const m of [0, 10, 20, 30, 60]) expect(minutesAgoScale.snap(m)).toBe(m);
  });

  it("snaps an arbitrary age to a spoken value", () => {
    expect(minutesAgoScale.snap(7.4)).toBe(7);
    expect(minutesAgoScale.snap(47)).toBe(45);
    expect(minutesAgoScale.snap(94)).toBe(90);
    expect(minutesAgoScale.snap(100)).toBe(100);
    expect(minutesAgoScale.snap(500)).toBe(510);
  });
});

describe("standardsScale", () => {
  it("runs from a tenth to 200 (the server limit): tenths under 2, halves to 10, wholes to 50, then fives", () => {
    expect(standardsScale.min).toBe(0.1);
    expect(standardsScale.max).toBe(200);
    expect(standardsScale.values.length).toBe(106);
    expect(standardsScale.delta(50, 1)).toBe(5);
    expect(standardsScale.delta(1, 1)).toBe(0.1);
    expect(standardsScale.delta(2, 1)).toBe(0.5);
    expect(standardsScale.delta(2, -1)).toBe(-0.1);
    expect(standardsScale.delta(10, 1)).toBe(1);
  });

  it("has no floating-point drift on its rungs", () => {
    expect(standardsScale.values.slice(0, 5)).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
    expect(standardsScale.snap(0.30000000000000004)).toBe(0.3);
    expect(standardsScale.move(1.14, 1)).toBe(1.2);
    expect(standardsScale.move(1.6, -1)).toBe(1.5);
  });

  it("round-trips every rung", () => {
    standardsScale.values.forEach((v, i) => expect(standardsScale.indexOf(v)).toBe(i));
  });
});
