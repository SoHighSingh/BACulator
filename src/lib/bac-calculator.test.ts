import { describe, expect, it } from "vitest";

import type { Drink } from "~/types/bac";
import { calculateBAC, calculateBACAtTime } from "./bac-calculator";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const BETA = 0.015; // %BAC eliminated per hour
const KA = 0.1; // absorption rate per minute
const BASE = Date.UTC(2026, 0, 10, 8);

type Sex = "male" | "female";
interface Scenario {
  name: string;
  drinks: Drink[];
  weight: number;
  sex: Sex;
  nowHours: number; // relative to BASE
}

const ratio = (sex: Sex) => (sex === "male" ? 0.68 : 0.55);

/** drinks as [standards, hours after BASE] */
function makeDrinks(list: Array<[number, number]>): Drink[] {
  return list.map(([standards, hours], i) => ({
    id: `d${i}`,
    standards,
    finishedAt: new Date(BASE + hours * HOUR).toISOString(),
  }));
}

const at = (s: Pick<Scenario, "drinks" | "weight" | "sex">, hours: number) =>
  calculateBACAtTime(s.drinks, s.weight, s.sex, new Date(BASE + hours * HOUR));

/** Independent reference model: 1-second steps with its own absorption code */
function reference(drinks: Drink[], weight: number, sex: Sex, t: number): number {
  if (drinks.length === 0) return 0;
  const times = drinks.map((d) => new Date(d.finishedAt).getTime());
  const t0 = Math.min(...times);
  if (t <= t0) return 0;
  const toBAC = (1 / (weight * 1000 * ratio(sex))) * 100;
  const absorbedGrams = (x: number) =>
    drinks.reduce((sum, d, i) => {
      const minutes = (x - times[i]!) / MINUTE;
      return minutes > 0 ? sum + d.standards * 10 * (1 - Math.exp(-KA * minutes)) : sum;
    }, 0);
  let bac = 0;
  let previous = absorbedGrams(t0);
  for (let x = t0 + 1000; x <= t; x += 1000) {
    const absorbed = absorbedGrams(x);
    bac = Math.max(0, bac + (absorbed - previous) * toBAC - BETA / 3600);
    previous = absorbed;
  }
  return bac;
}

/** Deterministic pseudo-random generator so the scenarios are stable between runs */
function seededRandom(seed: number) {
  let state = seed;
  return () => (state = (state * 1103515245 + 12345) % 2147483648) / 2147483648;
}

function buildScenarios(): Scenario[] {
  const scenarios: Scenario[] = [
    { name: "single std, 70M, at peak", drinks: makeDrinks([[1, 0]]), weight: 70, sex: "male", nowHours: 0.5 },
    { name: "single std, 70F, long after", drinks: makeDrinks([[1, 0]]), weight: 70, sex: "female", nowHours: 6 },
    { name: "now before first drink", drinks: makeDrinks([[2, 1]]), weight: 80, sex: "male", nowHours: 0 },
    { name: "drink finished exactly now", drinks: makeDrinks([[1.5, 2]]), weight: 65, sex: "female", nowHours: 2 },
    {
      name: "binge 15 std in 1h, 55F",
      drinks: makeDrinks(Array.from({ length: 15 }, (_, i): [number, number] => [1, i / 15])),
      weight: 55,
      sex: "female",
      nowHours: 1.5,
    },
    { name: "tiny 0.5 std, 130M", drinks: makeDrinks([[0.5, 0]]), weight: 130, sex: "male", nowHours: 0.25 },
    { name: "24h-old drink", drinks: makeDrinks([[3, 0]]), weight: 75, sex: "male", nowHours: 24 },
    {
      name: "lunch drink then night out",
      drinks: makeDrinks([[1, -6], [1, 2], [1, 2.5], [1, 3], [1, 3.5], [1, 4], [1, 4.5]]),
      weight: 60,
      sex: "female",
      nowHours: 5,
    },
    { name: "two sessions 5h apart", drinks: makeDrinks([[2, 0], [4, 5]]), weight: 80, sex: "male", nowHours: 5.5 },
    {
      name: "steady 1/h for 8h, 85M",
      drinks: makeDrinks(Array.from({ length: 8 }, (_, i): [number, number] => [1, i])),
      weight: 85,
      sex: "male",
      nowHours: 8,
    },
    { name: "drink logged in the future", drinks: makeDrinks([[1, 0], [2, 3]]), weight: 70, sex: "male", nowHours: 1 },
    { name: "heavy 4-std drinks", drinks: makeDrinks([[4, 0], [4, 0.5]]), weight: 90, sex: "male", nowHours: 1 },
  ];

  const random = seededRandom(42);
  const pick = <T,>(items: T[]): T => items[Math.floor(random() * items.length)]!;
  const styles = ["steady", "burst", "gapped", "sparse"] as const;

  while (scenarios.length < 50) {
    const weight = Math.round(45 + random() * 85);
    const sex = pick<Sex>(["male", "female"]);
    const count = 1 + Math.floor(random() * 12);
    const style = pick([...styles]);
    const list: Array<[number, number]> = [];
    let t = 0;
    for (let i = 0; i < count; i++) {
      list.push([pick([0.5, 0.8, 1, 1, 1.2, 1.4, 1.5, 2, 3]), Number(t.toFixed(3))]);
      if (style === "steady") t += 0.5 + random() * 0.7;
      else if (style === "burst") t += random() * 0.25;
      else if (style === "gapped") t += random() < 0.25 ? 3 + random() * 5 : 0.3 + random() * 0.5;
      else t += 1 + random() * 3;
    }
    const nowHours = Number(pick([-0.5, 0.2, t / 2, t, t + 0.4, t + 2, t + 5, t + 12]).toFixed(2));
    scenarios.push({
      name: `random ${style}: ${count} drinks, ${weight}${sex === "male" ? "M" : "F"}`,
      drinks: makeDrinks(list),
      weight,
      sex,
      nowHours,
    });
  }
  return scenarios;
}

const scenarios = buildScenarios();

describe("calculateBAC across 50 drinking scenarios", () => {
  it("has 50 scenarios", () => {
    expect(scenarios).toHaveLength(50);
  });

  describe.each(scenarios.map((s, i) => [`#${i + 1} ${s.name}`, s] as const))("%s", (_, s) => {
    const now = new Date(BASE + s.nowHours * HOUR);
    const result = calculateBAC({ drinks: s.drinks, userWeight: s.weight, userSex: s.sex, currentTime: now })!;
    const times = s.drinks.map((d) => new Date(d.finishedAt).getTime());
    const firstDrink = Math.min(...times);
    const lastDrink = Math.max(...times);

    it("returns a result", () => {
      expect(result).not.toBeNull();
    });

    it("matches an independent 1-second reference model", () => {
      for (const t of [now.getTime(), firstDrink + 10 * MINUTE, firstDrink + HOUR, lastDrink + 20 * MINUTE, lastDrink + 2 * HOUR, lastDrink + 5 * HOUR]) {
        const actual = calculateBACAtTime(s.drinks, s.weight, s.sex, new Date(t));
        expect(Math.abs(actual - reference(s.drinks, s.weight, s.sex, t))).toBeLessThanOrEqual(2.5e-4);
      }
    });

    it("never goes negative and peak bounds every value", () => {
      expect(result.currentBAC).toBeGreaterThanOrEqual(0);
      expect(result.peakBAC + 1e-4).toBeGreaterThanOrEqual(result.currentBAC);
      for (const point of result.bacOverTime) {
        expect(point.bac).toBeGreaterThanOrEqual(0);
        expect(point.bac).toBeLessThanOrEqual(result.peakBAC + 1e-4);
      }
    });

    it("starts the graph at the current BAC", () => {
      expect(Math.abs(result.bacOverTime[0]!.bac - result.currentBAC)).toBeLessThanOrEqual(2e-4);
    });

    it.each([
      ["sober", 0, () => result.timeToSober],
      ["legal (0.05)", 0.05, () => result.timeToLegal],
    ] as const)("predicts a real, final crossing for %s", (_, target, getHours) => {
      const hours = getHours();
      if (hours >= 48) {
        expect(at(s, s.nowHours + 47.9)).toBeGreaterThan(target);
        return;
      }
      // one minute after the prediction we're at/below target...
      expect(at(s, s.nowHours + hours + 1 / 60)).toBeLessThanOrEqual(target + 1e-6);
      // ...and it was above target shortly before (unless the answer is "now")
      if (hours > 0.05) {
        const before = [1, 2, 3, 4, 5, 6, 7, 8].map((k) => at(s, s.nowHours + hours - (k * 15) / 3600));
        expect(Math.max(...before)).toBeGreaterThan(target + 1e-6);
      }
      // and it never climbs back above afterwards
      for (let h = hours + 0.1; h < hours + 12; h += 0.5) {
        expect(at(s, s.nowHours + h)).toBeLessThanOrEqual(target + 1e-6);
      }
    });

    it("eliminates at exactly 0.015%/h once fully absorbed", () => {
      const lastHours = (lastDrink - BASE) / HOUR;
      const a = at(s, lastHours + 3);
      const b = at(s, lastHours + 3.5);
      if (b > 0.001) expect(Math.abs(a - b - BETA * 0.5)).toBeLessThanOrEqual(2e-4);
    });

    it("does not depend on drink order", () => {
      const reversed = calculateBAC({ drinks: [...s.drinks].reverse(), userWeight: s.weight, userSex: s.sex, currentTime: now });
      expect(reversed).toEqual(result);
    });

    it("never lowers BAC when a drink is added", () => {
      const extra: Drink = { id: "extra", standards: 1, finishedAt: new Date(firstDrink + 30 * MINUTE).toISOString() };
      for (const h of [0.5, 1, 2, 4]) {
        const t = new Date(firstDrink + h * HOUR);
        expect(calculateBACAtTime([...s.drinks, extra], s.weight, s.sex, t) + 1e-9).toBeGreaterThanOrEqual(
          calculateBACAtTime(s.drinks, s.weight, s.sex, t),
        );
      }
    });

    it("gives a heavier person a lower peak, and a female a higher peak than a male", () => {
      const heavier = calculateBAC({ drinks: s.drinks, userWeight: s.weight + 20, userSex: s.sex, currentTime: now })!;
      expect(heavier.peakBAC).toBeLessThanOrEqual(result.peakBAC + 1e-4);
      const female = calculateBAC({ drinks: s.drinks, userWeight: s.weight, userSex: "female", currentTime: now })!;
      const male = calculateBAC({ drinks: s.drinks, userWeight: s.weight, userSex: "male", currentTime: now })!;
      expect(female.peakBAC + 1e-4).toBeGreaterThanOrEqual(male.peakBAC);
    });
  });
});

describe("calculateBACAtTime closed-form and regression checks", () => {
  it.each([
    [1, 70, "male"],
    [2, 60, "female"],
    [3, 100, "male"],
  ] as const)("matches Widmark with first-order absorption for a single %s std drink (%skg %s)", (standards, weight, sex) => {
    const s = { drinks: makeDrinks([[standards, 0]]), weight, sex };
    for (const h of [0.25, 0.5, 1, 2]) {
      const widmark = ((standards * 10) / (weight * 1000 * ratio(sex))) * 100;
      const expected = Math.max(0, widmark * (1 - Math.exp(-KA * h * 60)) - BETA * h);
      expect(at(s, h)).toBeCloseTo(expected, 6);
    }
  });

  it("does not let time spent sober cancel out later drinks", () => {
    const withEarlySession = { drinks: makeDrinks([[2, 0], [4, 8]]), weight: 80, sex: "male" as const };
    const laterOnly = { drinks: makeDrinks([[4, 8]]), weight: 80, sex: "male" as const };
    for (const h of [8.5, 9, 10]) {
      expect(at(withEarlySession, h)).toBeCloseTo(at(laterOnly, h), 4);
    }
  });

  it("reports a lunchtime drink followed by a night out correctly (old model showed ~0.037)", () => {
    const s = {
      drinks: makeDrinks([[1, -6], [1, 2], [1, 2.5], [1, 3], [1, 3.5], [1, 4], [1, 4.5]]),
      weight: 60,
      sex: "female" as const,
    };
    expect(at(s, 5)).toBeGreaterThan(0.13);
  });

  it("absorbs the whole drink rather than capping at 95%", () => {
    const s = { drinks: makeDrinks([[4, 0]]), weight: 70, sex: "male" as const };
    const widmark = (40 / (70 * 1000 * 0.68)) * 100;
    // absorbed alcohol = BAC + what has been eliminated; ~all of it after 2h
    expect(at(s, 2) + BETA * 2).toBeCloseTo(widmark, 4);
  });
});

describe("calculateBAC input handling", () => {
  it("returns zeros with no drinks", () => {
    expect(calculateBAC({ drinks: [], userWeight: 70, userSex: "male" })).toMatchObject({ currentBAC: 0, peakBAC: 0, timeToSober: 0 });
  });

  it.each([
    [{ userWeight: 0, userSex: "male" }],
    [{ userWeight: null, userSex: "male" }],
    [{ userWeight: 70, userSex: "other" }],
    [{ userWeight: 70, userSex: null }],
  ])("rejects invalid profile %j", (profile) => {
    expect(calculateBAC({ drinks: makeDrinks([[1, 0]]), ...profile })).toBeNull();
  });

  it("rejects drinks with non-positive standards", () => {
    expect(calculateBAC({ drinks: makeDrinks([[0, 0]]), userWeight: 70, userSex: "male" })).toBeNull();
  });
});
