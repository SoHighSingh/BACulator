import { describe, expect, it } from "vitest";

import { pickHeard, speechLang, voiceErrorMessage, voiceOffered } from "./voice";

describe("voice", () => {
  it("listens in the region's English", () => {
    expect(speechLang("us", "en-AU")).toBe("en-US");
    expect(speechLang("metric", "en-US")).toBe("en-AU"); // an Aussie on a US-set phone still says "schooner"
    expect(speechLang("metric", "en-GB")).toBe("en-GB");
    expect(speechLang("metric", undefined)).toBe("en-AU");
    expect(speechLang("metric", "de-DE")).toBe("de-DE");
  });

  it("takes the first guess that reads as a drink", () => {
    const drink = (t: string) => t.includes("vodka");
    expect(pickHeard(["Bodhi red bull", "vodka red bull"], drink)).toBe("vodka red bull");
    expect(pickHeard(["hello there", "hollow there"], drink)).toBe("hello there");
    expect(pickHeard(["", "  "], drink)).toBe("");
  });

  it("says what went wrong, and always offers typing", () => {
    for (const code of ["not-allowed", "service-not-allowed", "network", "no-speech", "audio-capture", "language-not-supported", "x"]) {
      expect(voiceErrorMessage(code)).toMatch(/type it/i);
    }
    expect(voiceErrorMessage("not-allowed")).not.toBe(voiceErrorMessage("network"));
    expect(voiceErrorMessage("aborted")).toBe("");
  });

  it("doesn't offer a mic that won't work", () => {
    expect(voiceOffered(false, "Chrome", false)).toBe(false);
    expect(voiceOffered(true, "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)", true)).toBe(false);
    expect(voiceOffered(true, "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)", false)).toBe(true);
    expect(voiceOffered(true, "Mozilla/5.0 (Linux; Android 15)", true)).toBe(true);
  });
});
