import type { AdapterAccount } from "next-auth/adapters";
import type { Session } from "next-auth";

/**
 * Google sign-in is only used to know who someone is; we never call Google APIs for them. So
 * the OAuth tokens the provider returns are dropped before the Account row is written, and a
 * database leak can't be turned into access to anyone's Google account.
 */
export function withoutTokens(account: AdapterAccount): AdapterAccount {
  return {
    userId: account.userId,
    type: account.type,
    provider: account.provider,
    providerAccountId: account.providerAccountId,
  };
}

/**
 * What /api/auth/session returns to the browser. Built field by field: the adapter's session
 * object also carries the session token (the httpOnly cookie value) and the user row (weight,
 * sex), which page scripts don't need.
 */
export function publicSession(
  session: { expires: Date | string },
  user: { id: string; name?: string | null; email?: string | null; image?: string | null },
): Session {
  return {
    expires: session.expires instanceof Date ? session.expires.toISOString() : session.expires,
    user: { id: user.id, name: user.name ?? null, email: user.email ?? null, image: user.image ?? null },
  };
}
