import { describe, expect, it } from "vitest";

import { aboutPoint } from "./estimate-display";
import { formatClock, formatHour } from "./format-clock";

const at = (h: number, m: number) => new Date(2026, 9, 18, h, m);

describe("formatClock", () => {
  it("writes 12-hour times with a lowercase period", () => {
    expect(formatClock(at(22, 40))).toBe("10:40 pm");
    expect(formatClock(at(9, 5))).toBe("9:05 am");
  });
  it("handles midnight and noon", () => {
    expect(formatClock(at(0, 0))).toBe("12:00 am");
    expect(formatClock(at(12, 30))).toBe("12:30 pm");
  });
  it("can drop the period and compact whole hours", () => {
    expect(formatClock(at(2, 30), { period: false })).toBe("2:30");
    expect(formatClock(at(23, 0), { compact: true })).toBe("11 pm");
    expect(formatHour(at(23, 0))).toBe("11pm");
  });
  it("accepts a timestamp", () => {
    expect(formatClock(at(18, 15).getTime())).toBe("6:15 pm");
  });
});

describe("aboutPoint", () => {
  it("says about with a real number", () => {
    expect(aboutPoint(0.0745)).toEqual(["about", "0.08"]);
  });
  it("never reads 'about under 0.01' or 'about 0.00'", () => {
    expect(aboutPoint(0.004)).toEqual([null, "under 0.01"]);
    expect(aboutPoint(0)).toEqual([null, "0.00"]);
  });
});
