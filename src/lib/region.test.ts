import { describe, expect, it } from "vitest";

import {
  formatVolume,
  fromRegionStandards,
  guessRegion,
  isRegionId,
  kgToRegionWeight,
  REGIONS,
  regionWeightToKg,
  servesFor,
  toRegionStandards,
} from "./region";

const { metric, us } = REGIONS;

describe("region", () => {
  it("guesses US only from a US browser language", () => {
    expect(guessRegion(["en-US", "en"])).toBe("us");
    expect(guessRegion(["es-US"])).toBe("us");
    expect(guessRegion(["en-AU"])).toBe("metric");
    expect(guessRegion(["en-GB"])).toBe("metric");
    expect(guessRegion([])).toBe("metric");
    expect(guessRegion(undefined)).toBe("metric");
  });

  it("validates stored ids", () => {
    expect(isRegionId("us")).toBe(true);
    expect(isRegionId("metric")).toBe(true);
    expect(isRegionId("toString")).toBe(false);
    expect(isRegionId(null)).toBe(false);
  });

  it("shows stored 10 g standards in the region's own standard drinks", () => {
    expect(toRegionStandards(1.4, metric)).toBeCloseTo(1.4);
    expect(toRegionStandards(1.4, us)).toBeCloseTo(1); // 14 g is one US standard drink
    expect(fromRegionStandards(1, us)).toBeCloseTo(1.4);
    expect(fromRegionStandards(toRegionStandards(2.3, us), us)).toBeCloseTo(2.3);
  });

  it("writes volumes in ml or US fluid ounces", () => {
    expect(formatVolume(425, metric)).toBe("425 ml");
    expect(formatVolume(355, us)).toBe("12 oz");
    expect(formatVolume(148, us)).toBe("5 oz");
  });

  it("round-trips weight through pounds", () => {
    expect(kgToRegionWeight(75, metric)).toBe(75);
    expect(kgToRegionWeight(75, us)).toBeCloseTo(165.3, 1);
    expect(regionWeightToKg(165.3, us)).toBeCloseTo(75, 0);
  });

  it("has a full set of serves per region, each about the expected strength", () => {
    for (const region of [metric, us]) {
      const serves = servesFor(region);
      expect(serves).toHaveLength(6);
      for (const s of serves) expect(s.standards).toBeGreaterThan(0);
    }
    // A US 12 oz beer at 5% is one US standard drink, and must read "1.0", not "1.1".
    const beer = servesFor(us)[0]!;
    expect((Math.round(toRegionStandards(beer.standards, us) * 10) / 10).toFixed(1)).toBe("1.0");
    // Never rounded below the alcohol actually in the serve.
    for (const s of servesFor(metric)) expect(s.standards * 10).toBeGreaterThanOrEqual((s.volumeMl * s.abv * 0.789) / 100 - 1e-9);
  });

  it("uses the region's emergency number", () => {
    expect(metric.emergency).toBe("000");
    expect(us.emergency).toBe("911");
  });
});
