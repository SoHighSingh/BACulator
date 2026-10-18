import { describe, expect, it } from "vitest";

import { monotonePath, thin } from "./geometry";

/** Parse the control and end points out of a path of cubic segments. */
function cubics(
  d: string,
): {
  p0: [number, number];
  c1: [number, number];
  c2: [number, number];
  p1: [number, number];
}[] {
  const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
  const out = [];
  let p0: [number, number] = [nums[0]!, nums[1]!];
  for (let i = 2; i < nums.length; i += 6) {
    const c1: [number, number] = [nums[i]!, nums[i + 1]!];
    const c2: [number, number] = [nums[i + 2]!, nums[i + 3]!];
    const p1: [number, number] = [nums[i + 4]!, nums[i + 5]!];
    out.push({ p0, c1, c2, p1 });
    p0 = p1;
  }
  return out;
}

describe("monotonePath", () => {
  it("passes through every sample and never overshoots between two of them", () => {
    const pts: [number, number][] = [
      [0, 100],
      [10, 90],
      [20, 40],
      [30, 38],
      [40, 60],
      [50, 100],
    ];
    const segs = cubics(monotonePath(pts));
    expect(segs.length).toBe(pts.length - 1);
    segs.forEach((s, i) => {
      expect(s.p0).toEqual(pts[i]);
      expect(s.p1).toEqual(pts[i + 1]);
      const lo = Math.min(s.p0[1], s.p1[1]);
      const hi = Math.max(s.p0[1], s.p1[1]);
      for (const c of [s.c1, s.c2]) {
        expect(c[1]).toBeGreaterThanOrEqual(lo - 1e-6);
        expect(c[1]).toBeLessThanOrEqual(hi + 1e-6);
      }
    });
  });

  it("keeps a flat tangent at a peak so the peak sample is the highest point", () => {
    const segs = cubics(
      monotonePath([
        [0, 50],
        [10, 10],
        [20, 50],
      ]),
    );
    // Both controls next to the peak sit at the peak's own y (the chart's y grows downwards).
    expect(segs[0]!.c2[1]).toBe(10);
    expect(segs[1]!.c1[1]).toBe(10);
  });

  it("falls back to a polyline for fewer than three points", () => {
    expect(
      monotonePath([
        [0, 0],
        [5, 5],
      ]),
    ).toBe("M0.00 0.00 L5.00 5.00");
  });
});

describe("thin", () => {
  it("keeps the ends and every turn, and otherwise spaces points out", () => {
    const pts: [number, number][] = [];
    for (let x = 0; x <= 20; x++) pts.push([x, x === 7 ? 0 : 10 + x]);
    const out = thin(pts, 4);
    expect(out[0]).toEqual(pts[0]);
    expect(out[out.length - 1]).toEqual(pts[pts.length - 1]);
    expect(out).toContainEqual([7, 0]);
    expect(out).toContainEqual([6, 16]);
    expect(out.length).toBeLessThan(pts.length);
  });
});
