/**
 * Which number to call for help, decided by where the phone is, not by the units the person picked:
 * a Brit using US units still needs 999, and a "10 g standard drink" region says nothing about the
 * country. When the country can't be told, the app says "Call for help" and dials 112, the GSM
 * emergency number that mobile phones route to the local service in most of the world, rather than
 * showing a number that may be wrong.
 */

export interface Emergency {
  /** What a tel: link dials. */
  dial: string;
  /** The number to show, or null when the country is unknown (copy then says "for help"). */
  number: string | null;
}

/** Fallback when the country is unknown. */
export const UNKNOWN_EMERGENCY: Emergency = { dial: "112", number: null };

const EU_112 = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU",
  "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO", "CH",
];

const NUMBERS: Record<string, string> = {
  AU: "000",
  NZ: "111",
  US: "911",
  CA: "911",
  GB: "999",
  ...Object.fromEntries(EU_112.map((c) => [c, "112"])),
};

// Time zones answer "where is the phone" better than the language does (plenty of phones outside
// the US are set to en-US). Only zones that pin one of the countries above are listed.
const ZONE_PREFIXES: [string, string][] = [
  ["Australia/", "AU"],
  ["Pacific/Auckland", "NZ"],
  ["Pacific/Chatham", "NZ"],
  ["Pacific/Honolulu", "US"],
  ["Europe/London", "GB"],
  ["Europe/Belfast", "GB"],
  ["Europe/Dublin", "IE"],
];

const US_ZONES = new Set([
  "America/New_York", "America/Detroit", "America/Chicago", "America/Denver", "America/Phoenix", "America/Boise",
  "America/Los_Angeles", "America/Anchorage", "America/Juneau", "America/Sitka", "America/Nome", "America/Adak",
  "America/Menominee", "America/Metlakatla", "America/Yakutat",
]);
const CA_ZONES = new Set([
  "America/Toronto", "America/Vancouver", "America/Edmonton", "America/Winnipeg", "America/Halifax", "America/St_Johns",
  "America/Regina", "America/Moncton", "America/Whitehorse", "America/Yellowknife", "America/Iqaluit",
  "America/Glace_Bay", "America/Goose_Bay", "America/Swift_Current", "America/Dawson_Creek", "America/Rankin_Inlet",
]);
// Mainland EU/EEA zones are "Europe/<capital>"; these Europe/ zones are outside the 112 list.
const EUROPE_NOT_112 = new Set([
  "Europe/London", "Europe/Belfast", "Europe/Moscow", "Europe/Minsk", "Europe/Kiev", "Europe/Kyiv", "Europe/Istanbul",
  "Europe/Kaliningrad", "Europe/Samara", "Europe/Volgograd", "Europe/Saratov", "Europe/Ulyanovsk", "Europe/Astrakhan",
  "Europe/Kirov", "Europe/Chisinau", "Europe/Belgrade", "Europe/Sarajevo", "Europe/Skopje", "Europe/Podgorica",
  "Europe/Tirane", "Europe/Simferopol", "Europe/Gibraltar", "Europe/Andorra", "Europe/Monaco", "Europe/San_Marino",
  "Europe/Vatican", "Europe/Isle_of_Man", "Europe/Jersey", "Europe/Guernsey",
]);

/** ISO country from an IANA time zone, or null when the zone doesn't pin one we know. */
export function countryFromTimeZone(zone: string | undefined): string | null {
  if (!zone) return null;
  for (const [prefix, country] of ZONE_PREFIXES) if (zone.startsWith(prefix)) return country;
  if (US_ZONES.has(zone) || zone.startsWith("America/Indiana/") || zone.startsWith("America/Kentucky/") || zone.startsWith("America/North_Dakota/")) return "US";
  if (CA_ZONES.has(zone)) return "CA";
  // Any EU/EEA zone dials 112; "DE" stands in for the bloc.
  if (zone.startsWith("Europe/") && !EUROPE_NOT_112.has(zone)) return "DE";
  return null;
}

/** ISO country from the first browser language that names one ("en-GB" -> "GB"). */
export function countryFromLanguages(languages: readonly string[] | undefined): string | null {
  for (const lang of languages ?? []) {
    const region = lang.split(/[-_]/).slice(1).find((part) => /^[a-z]{2}$/i.test(part));
    if (region) return region.toUpperCase();
  }
  return null;
}

/**
 * The emergency number for this phone. The time zone wins when it pins a country; otherwise the
 * browser language's country; otherwise (or for a country not listed) the neutral fallback.
 */
export function emergencyFor(timeZone: string | undefined, languages: readonly string[] | undefined): Emergency {
  const zoneCountry = countryFromTimeZone(timeZone);
  // A zone outside the countries we know (Asia/Tokyo, America/Sao_Paulo) means the language's
  // country can't be trusted either: "en-US" in Tokyo is not in the US.
  const knownElsewhere = !!timeZone && !zoneCountry && /^(Africa|America|Antarctica|Asia|Atlantic|Europe|Indian|Pacific)\//.test(timeZone);
  const country = zoneCountry ?? (knownElsewhere ? null : countryFromLanguages(languages));
  const number = country ? NUMBERS[country] : undefined;
  return number ? { dial: number, number } : UNKNOWN_EMERGENCY;
}

/** "Call 000", or "Call for help" when the number isn't known. */
export const callLabel = (e: Emergency) => (e.number ? `Call ${e.number}` : "Call for help");

/** "call 000", or "call your local emergency number" in running text. */
export const callPhrase = (e: Emergency) => (e.number ? `call ${e.number}` : "call your local emergency number");
