import { describe, expect, it } from "vitest";

import { legalAgeFor, needsConsent, parsePendingConsent, TERMS_VERSION } from "./consent";

describe("legalAgeFor", () => {
  it("asks for 21+ in the US and 18+ elsewhere", () => {
    expect(legalAgeFor("us")).toBe(21);
    expect(legalAgeFor("metric")).toBe(18);
  });
});

describe("needsConsent", () => {
  it("asks people who never agreed or agreed to an older version", () => {
    expect(needsConsent(null)).toBe(true);
    expect(needsConsent(undefined)).toBe(true);
    expect(needsConsent("2020-01-01")).toBe(true);
  });

  it("doesn't ask again for the current version", () => {
    expect(needsConsent(TERMS_VERSION)).toBe(false);
  });
});

describe("parsePendingConsent", () => {
  const now = Date.parse("2026-10-17T12:00:00Z");
  const fresh = JSON.stringify({ termsVersion: TERMS_VERSION, agreedAt: "2026-10-17T11:58:00Z" });

  it("accepts a fresh agreement to the current version", () => {
    expect(parsePendingConsent(fresh, now)).toEqual({
      termsVersion: TERMS_VERSION,
      agreedAt: "2026-10-17T11:58:00Z",
    });
  });

  it("ignores missing, broken, old-version and stale values", () => {
    expect(parsePendingConsent(null, now)).toBeNull();
    expect(parsePendingConsent("{not json", now)).toBeNull();
    expect(parsePendingConsent(JSON.stringify({ termsVersion: "old", agreedAt: "2026-10-17T11:58:00Z" }), now)).toBeNull();
    expect(parsePendingConsent(JSON.stringify({ termsVersion: TERMS_VERSION, agreedAt: "2026-10-15T11:58:00Z" }), now)).toBeNull();
    expect(parsePendingConsent(JSON.stringify({ termsVersion: TERMS_VERSION, agreedAt: "2026-10-18T11:58:00Z" }), now)).toBeNull();
    expect(parsePendingConsent(JSON.stringify({ termsVersion: TERMS_VERSION }), now)).toBeNull();
  });
});
