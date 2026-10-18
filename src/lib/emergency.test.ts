import { describe, expect, it } from "vitest";

import { callLabel, callPhrase, countryFromLanguages, emergencyFor, UNKNOWN_EMERGENCY } from "./emergency";

const num = (zone: string | undefined, langs: string[] | undefined) => emergencyFor(zone, langs).number;

describe("emergency number", () => {
  it("never shows Australia's 000 outside Australia", () => {
    expect(num(undefined, ["en-GB"])).toBe("999");
    expect(num(undefined, ["en-NZ"])).toBe("111");
    expect(num(undefined, ["en-CA"])).toBe("911");
    expect(num(undefined, ["fr-CA"])).toBe("911");
    expect(num(undefined, ["en-IE"])).toBe("112");
    expect(num(undefined, ["de-DE"])).toBe("112");
    expect(num(undefined, ["es-ES", "en"])).toBe("112");
    expect(num(undefined, ["en-US"])).toBe("911");
    expect(num(undefined, ["en-AU"])).toBe("000");
  });

  it("goes by the time zone before the language", () => {
    // A phone left on en-US in Sydney is in Australia; one in London is in the UK.
    expect(num("Australia/Sydney", ["en-US"])).toBe("000");
    expect(num("Europe/London", ["en-US"])).toBe("999");
    expect(num("Pacific/Auckland", ["en-AU"])).toBe("111");
    expect(num("America/Toronto", ["en-US"])).toBe("911");
    expect(num("America/Indiana/Indianapolis", ["en-GB"])).toBe("911");
    expect(num("Europe/Berlin", ["en-AU"])).toBe("112");
    expect(num("Europe/Dublin", ["en-GB"])).toBe("112");
  });

  it("falls back to a neutral call for help when the country is unknown", () => {
    expect(emergencyFor(undefined, ["en"])).toEqual(UNKNOWN_EMERGENCY);
    expect(emergencyFor(undefined, [])).toEqual(UNKNOWN_EMERGENCY);
    expect(emergencyFor(undefined, undefined)).toEqual(UNKNOWN_EMERGENCY);
    expect(emergencyFor(undefined, ["ja-JP"])).toEqual(UNKNOWN_EMERGENCY);
    // en-US set on a phone in Tokyo: the language's country isn't where the phone is.
    expect(emergencyFor("Asia/Tokyo", ["en-US"])).toEqual(UNKNOWN_EMERGENCY);
    expect(emergencyFor("Europe/Moscow", ["en-GB"])).toEqual(UNKNOWN_EMERGENCY);
    // UTC says nothing about place, so the language decides.
    expect(num("Etc/UTC", ["en-GB"])).toBe("999");
    expect(UNKNOWN_EMERGENCY.dial).toBe("112");
  });

  it("writes the call to action with or without a number", () => {
    expect(callLabel(emergencyFor("Australia/Perth", []))).toBe("Call 000");
    expect(callLabel(UNKNOWN_EMERGENCY)).toBe("Call for help");
    expect(callPhrase(emergencyFor(undefined, ["en-GB"]))).toBe("call 999");
    expect(callPhrase(UNKNOWN_EMERGENCY)).toBe("call your local emergency number");
  });

  it("reads the country from a language tag with a script", () => {
    expect(countryFromLanguages(["zh-Hant-TW"])).toBe("TW");
    expect(countryFromLanguages(["en_GB"])).toBe("GB");
    expect(countryFromLanguages(["en", "en-NZ"])).toBe("NZ");
  });
});
