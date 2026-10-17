import { describe, expect, it } from "vitest";

import { describeEstimate, drinkLabel, formatBackToZero, formatBand, formatPoint, timeAgo } from "./estimate-display";

const base = {
  currentBAC: 0,
  timeToSober: 0,
  timeToLegal: 0,
  bacOverTime: [],
  isRising: false,
  peakBAC: 0,
  timeToPeak: 0,
};
const now = new Date(2026, 9, 17, 23, 0);
const drink = (minutesAgo: number) => ({
  id: String(minutesAgo),
  standards: 1,
  finishedAt: new Date(now.getTime() - minutesAgo * 60000),
});

describe("formatBand", () => {
  it.each([
    [0, "0.00"],
    [0.004, "under 0.01"],
    [0.065, "0.05–0.08"],
    [0.1, "0.08–0.12"],
    [0.012, "0.00–0.02"],
  ])("%s → %s", (bac, expected) => {
    expect(formatBand(bac)).toBe(expected);
  });

  it("always shows a range that contains the estimate", () => {
    for (let bac = 0.01; bac < 0.4; bac += 0.003) {
      const [low, high] = formatBand(bac).split("–").map(Number);
      expect(low).toBeLessThanOrEqual(bac);
      expect(high).toBeGreaterThanOrEqual(bac);
    }
  });
});

describe("formatBackToZero", () => {
  it("is null when nothing is left to wear off", () => {
    expect(formatBackToZero(0, now)).toBeNull();
  });

  it("gives a quarter-hour window that starts before and ends after the point estimate", () => {
    expect(formatBackToZero(4, now)).toBe("between 2:15 and 4:00 am");
  });

  it("names both periods when the window crosses noon", () => {
    expect(formatBackToZero(14, now)).toMatch(/^between \d{1,2}:\d{2} am and \d{1,2}:\d{2} pm$/);
  });
});

describe("describeEstimate", () => {
  it("says not safe to drive while alcohol is counted", () => {
    const d = describeEstimate({ ...base, currentBAC: 0.03 }, [drink(60)], now);
    expect(d.notSafeToDrive).toBe(true);
    expect(d.status).toBe("falling");
  });

  it("says not safe to drive while a drink is still absorbing, even at 0.00", () => {
    const d = describeEstimate({ ...base, isRising: true }, [drink(0)], now);
    expect(d.notSafeToDrive).toBe(true);
    expect(d.status).toBe("rising");
  });

  it("drops the warning once everything has worn off", () => {
    const d = describeEstimate(base, [drink(600)], now);
    expect(d.notSafeToDrive).toBe(false);
    expect(d.band).toBe("0.00");
  });
});

describe("labels", () => {
  it("uses the drink name, or the standards when there is none", () => {
    expect(drinkLabel({ standards: 1.6, name: "Schooner of lager" })).toBe("Schooner of lager");
    expect(drinkLabel({ standards: 1.5, name: null })).toBe("1.5 std drink");
  });

  it("formats time since a drink", () => {
    expect(timeAgo(new Date(now.getTime() - 20000), now)).toBe("just now");
    expect(timeAgo(new Date(now.getTime() - 6 * 60000), now)).toBe("6 min ago");
    expect(timeAgo(new Date(now.getTime() - 80 * 60000), now)).toBe("1 h 20 min ago");
  });
});

describe("formatPoint", () => {
  it("rounds to two places, and never shows a falsely precise third digit", () => {
    expect(formatPoint(0)).toBe("0.00");
    expect(formatPoint(-0.01)).toBe("0.00");
    expect(formatPoint(0.004)).toBe("under 0.01");
    expect(formatPoint(0.0749)).toBe("0.07");
    expect(formatPoint(0.075)).toBe("0.08");
    expect(formatPoint(0.1234)).toBe("0.12");
  });
});
