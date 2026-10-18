import type { RegionId } from "./region";

/**
 * Bump this when the consent wording, the terms or what we store changes in a way people should
 * agree to again. Everyone whose stored version differs is asked once more after they sign in.
 */
export const TERMS_VERSION = "2026-10-17";

/** Legal drinking age to confirm before sign-in. */
export const legalAgeFor = (region: RegionId): number => (region === "us" ? 21 : 18);

/** True when this person hasn't agreed to the current terms yet. */
export const needsConsent = (storedVersion: string | null | undefined): boolean =>
  storedVersion !== TERMS_VERSION;

/**
 * Consent given on the landing page, held in the browser across the Google sign-in redirect
 * and written to the account as soon as the user is signed in.
 */
export interface PendingConsent {
  termsVersion: string;
  agreedAt: string;
}

export const PENDING_CONSENT_KEY = "baculator.pendingConsent";

/** Pending consent only counts for the current version and for a day; anything else is ignored. */
export function parsePendingConsent(raw: string | null, now = Date.now()): PendingConsent | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PendingConsent>;
    if (value.termsVersion !== TERMS_VERSION || typeof value.agreedAt !== "string") return null;
    const at = Date.parse(value.agreedAt);
    if (Number.isNaN(at) || at > now + 5 * 60 * 1000 || now - at > 24 * 60 * 60 * 1000) return null;
    return { termsVersion: value.termsVersion, agreedAt: value.agreedAt };
  } catch {
    return null;
  }
}
