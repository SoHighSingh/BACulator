import { describe, expect, it } from "vitest";

import { describeEstimate, describeNight, drinkLabel, formatBackToZero, formatBand, formatPoint, isAlert, isHazard, timeAgo } from "./estimate-display";

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
    [0.065, "0.04–0.10"],
    [0.1, "0.07–0.14"],
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
    expect(formatBackToZero(4, now)).toBe("between 2:00 and 5:30 am");
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
  it("rounds up to two places, so the headline never reads lower than the model", () => {
    expect(formatPoint(0)).toBe("0.00");
    expect(formatPoint(-0.01)).toBe("0.00");
    expect(formatPoint(0.004)).toBe("under 0.01");
    expect(formatPoint(0.0749)).toBe("0.08");
    expect(formatPoint(0.0549)).toBe("0.06");
    expect(formatPoint(0.07)).toBe("0.07");
    expect(formatPoint(0.1234)).toBe("0.13");
  });
});

describe("red and the hazard key (user decision, 18 Oct 2026 late: 0.05, by what is shown)", () => {
  it("is red once the shown number is 0.05", () => {
    expect(isAlert(0.05)).toBe(true);
    // 0.0449 shows 0.05 (rounded up), so it is red.
    expect(isAlert(0.0449)).toBe(true);
    expect(isAlert(0.04)).toBe(false);
    expect(isAlert(0)).toBe(false);
    expect(isAlert(null)).toBe(false);
  });

  it("shows the hazard key once the top of the likely range is 0.05", () => {
    // 0.04 shows "Likely 0.03 to 0.06": the key, but not red.
    expect(isHazard(0.04)).toBe(true);
    expect(isAlert(0.04)).toBe(false);
    // 0.028 shows "Likely 0.02 to 0.04": neither.
    expect(formatBand(0.028)).toBe("0.02–0.04");
    expect(isHazard(0.028)).toBe(false);
    expect(isAlert(0.028)).toBe(false);
    // 0.05: both.
    expect(isHazard(0.05)).toBe(true);
    expect(isAlert(0.05)).toBe(true);
    expect(isHazard(0)).toBe(false);
    expect(isHazard(null)).toBe(false);
  });

  it("is neither with no drinks", () => {
    const m = describeNight([], 75, "female", now);
    expect(m.alert).toBe(false);
    expect(m.hazard).toBe(false);
  });

  it("is neither without a weight to estimate with, even with drinks", () => {
    const m = describeNight([{ id: "a", standards: 2, finishedAt: new Date(now.getTime() - 30 * 60000) }], null, null, now);
    expect(m.alert).toBe(false);
    expect(m.hazard).toBe(false);
  });
});

describe("describeNight", () => {
  const drink = (minutesAgo: number, standards = 1.6) => ({
    id: String(minutesAgo),
    standards,
    finishedAt: new Date(now.getTime() - minutesAgo * 60000),
  });

  it("warns about driving even when there's no weight to estimate with", () => {
    const m = describeNight([drink(30)], null, null, now);
    expect(m.estimate).toBeNull();
    expect(m.notSafeToDrive).toBe(true);
  });

  it("says nothing about driving with no drinks", () => {
    expect(describeNight([], 75, "female", now).notSafeToDrive).toBe(false);
  });

  it("keeps the warning for a while after the model reaches zero", () => {
    // Two standard drinks 3.5 hours ago: the model is back to zero (about 2.75 h), a slow eliminator may not be.
    const m = describeNight([drink(210, 2)], 75, "male", now);
    expect(m.bac).toBe(0);
    expect(m.notSafeToDrive).toBe(true);
  });

  it("drops the warning once well past even the slow-eliminator window", () => {
    const m = describeNight([drink(600, 1)], 75, "male", now);
    expect(m.notSafeToDrive).toBe(false);
  });

  it("reports a peak still to come while a fresh drink absorbs", () => {
    const m = describeNight([drink(2, 2)], 75, "female", now);
    expect(m.peak).not.toBeNull();
    expect(m.peak!.bac).toBeGreaterThan(m.bac!);
  });
});
