/**
 * Rules for saying a drink out loud (Web Speech API), kept pure so they can be tested. The
 * recogniser itself lives in hooks/useVoice.
 */

/**
 * The recogniser's language. US units mean US English; otherwise the phone's own English if it has
 * one that isn't US (en-GB, en-NZ…), else Australian English, which hears "schooner", "jager" and
 * "tinnie". A phone set to another language keeps it.
 */
export function speechLang(regionId: "metric" | "us", navigatorLanguage: string | undefined): string {
  const nav = navigatorLanguage ?? "";
  if (regionId === "us") return "en-US";
  if (/^en-/i.test(nav) && !/^en-US$/i.test(nav)) return nav;
  if (nav && !/^en/i.test(nav)) return nav;
  return "en-AU";
}

/** Of the recogniser's guesses, the first one that reads as a drink; else its best guess. */
export function pickHeard(alternatives: string[], readsAsDrink: (text: string) => boolean): string {
  const heard = alternatives.map((a) => a.trim()).filter(Boolean);
  return heard.find(readsAsDrink) ?? heard[0] ?? "";
}

/** What to say when listening fails, by the recogniser's error code. Every one ends in a way forward. */
export function voiceErrorMessage(code: string): string {
  switch (code) {
    case "not-allowed":
      return "The microphone is blocked for this site. Type it instead.";
    case "service-not-allowed":
      return "Voice isn't available here. Type it instead.";
    case "network":
      return "Voice needs a connection. Type it instead.";
    case "no-speech":
      return "Didn't hear anything. Try again, or type it.";
    case "audio-capture":
      return "No microphone found. Type it instead.";
    case "language-not-supported":
      return "Voice doesn't work in this language. Type it instead.";
    case "aborted":
      return "";
    default:
      return "Didn't catch that. Try again, or type it.";
  }
}

/**
 * Whether to offer the mic at all. An iPhone home-screen app exposes the recogniser but it almost
 * never works there (it needs Safari itself, with Siri and Dictation on), so a dead key isn't shown.
 */
export function voiceOffered(hasRecogniser: boolean, userAgent: string, standalone: boolean): boolean {
  if (!hasRecogniser) return false;
  const ios = /iPhone|iPad|iPod/.test(userAgent);
  return !(ios && standalone);
}
