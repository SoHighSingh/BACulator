import { describe, expect, it } from "vitest";

import { calculateBACAtTime, findTimeToTarget } from "./bac-calculator";
import {
  asRange,
  describeEstimate,
  describeNight,
  displayPoint,
  drinkLabel,
  formatBackToZero,
  formatBand,
  formatPoint,
  isAlert,
  isHazard,
  timeAgo,
} from "./estimate-display";

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

describe("displayPoint: the headline with its small third digit", () => {
  it("rounds up at the third place and splits big and small from that one value", () => {
    expect(displayPoint(0.0963)).toEqual({ big: "0.09", small: "7" });
    expect(displayPoint(0.0991)).toEqual({ big: "0.10", small: "0" });
    expect(displayPoint(0.07)).toEqual({ big: "0.07", small: "0" });
    expect(displayPoint(0.05)).toEqual({ big: "0.05", small: "0" });
    expect(displayPoint(0.0491)).toEqual({ big: "0.05", small: "0" });
    expect(displayPoint(0.049)).toEqual({ big: "0.04", small: "9" });
    expect(displayPoint(0.0101)).toEqual({ big: "0.01", small: "1" });
  });

  it("has no small digit at zero or under 0.01", () => {
    expect(displayPoint(0)).toEqual({ big: "0.00", small: null });
    expect(displayPoint(0.004)).toEqual({ big: "under 0.01", small: null });
  });

  it("never draws lower than the model, never more than 0.001 above, and its digits never contradict", () => {
    for (let bac = 0.01; bac < 0.4; bac += 0.00037) {
      const { big, small } = displayPoint(bac);
      const shown = Number(`${big}${small}`);
      expect(shown).toBeGreaterThanOrEqual(bac - 1e-9);
      expect(shown - bac).toBeLessThan(0.001 + 1e-9);
      // The big digits are the shown value's own first two places, never a separately rounded figure.
      expect(big).toBe(shown.toFixed(3).slice(0, 4));
      // Red always matches what's printed.
      expect(isAlert(bac)).toBe(shown >= 0.05 - 1e-9);
    }
  });
});

describe("the Below 0.05 window", () => {
  const drink = (minutesAgo: number, standards: number) => ({
    id: `${minutesAgo}-${standards}`,
    standards,
    finishedAt: new Date(now.getTime() - minutesAgo * 60000),
  });

  it("is a window like Back to zero, and comes before it, while the screen is red", () => {
    const m = describeNight([drink(90, 2), drink(45, 2), drink(15, 2)], 75, "male", now);
    expect(m.alert).toBe(true);
    expect(m.estimate!.belowAlert).toMatch(/^between \d{1,2}:\d{2}( am| pm)? and \d{1,2}:\d{2} (am|pm)$/);
    expect(m.estimate!.backToZero).not.toBeNull();
    expect(asRange(m.estimate!.belowAlert!)).toMatch(/ to /);
  });

  it("is keyed on the same moment the red ends, to the minute", () => {
    const drinks = [drink(90, 2), drink(45, 2), drink(15, 2)];
    const hours = findTimeToTarget(drinks, 75, "male", now, 0.049);
    const at = (h: number) => calculateBACAtTime(drinks, 75, "male", new Date(now.getTime() + h * 3_600_000));
    expect(hours).toBeGreaterThan(0);
    expect(isAlert(at(hours - 2 / 60))).toBe(true);
    expect(isAlert(at(hours + 1 / 60))).toBe(false);
  });

  it("is absent when the drawn number is under 0.05 and stays there", () => {
    const m = describeNight([drink(120, 1)], 75, "male", now);
    expect(m.alert).toBe(false);
    expect(m.estimate!.belowAlert).toBeNull();
  });

  it("is absent without a weight to estimate with", () => {
    expect(describeNight([drink(30, 4)], null, null, now).estimate).toBeNull();
  });

  it("never collapses to a single clock time", () => {
    expect(formatBackToZero(0.05, now)).toMatch(/^between .+ and .+$/);
    const [a, b] = asRange(formatBackToZero(0.05, now)!).split(" to ");
    expect(a).not.toBe(b!.replace(/ (am|pm)$/, ""));
  });
});

describe("red and the hazard key (user decision, 18 Oct 2026 late: 0.05, by what is shown)", () => {
  it("is red once the drawn three-place number is 0.050 (user decision, 22 Oct 2026)", () => {
    expect(isAlert(0.05)).toBe(true);
    // 0.0491 draws 0.05|0 (rounded up at the third place): red.
    expect(isAlert(0.0491)).toBe(true);
    // 0.049 draws 0.04|9, and 0.0449 draws 0.04|5: not red, even though two places would round up to 0.05.
    expect(isAlert(0.049)).toBe(false);
    expect(isAlert(0.0449)).toBe(false);
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
