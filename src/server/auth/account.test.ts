import { describe, expect, it } from "vitest";

import { publicSession, withoutTokens } from "./account";

describe("auth storage", () => {
  it("stores the account link without OAuth tokens", () => {
    const stored = withoutTokens({
      userId: "u1",
      type: "oidc",
      provider: "google",
      providerAccountId: "123",
      access_token: "ya29.secret",
      refresh_token: "1//secret",
      id_token: "eyJ.secret",
      expires_at: 1,
      scope: "openid email profile",
      token_type: "bearer",
    });
    expect(stored).toEqual({ userId: "u1", type: "oidc", provider: "google", providerAccountId: "123" });
  });

  it("never sends the session token or the user's body details to the browser", () => {
    const expires = new Date("2026-11-17T00:00:00Z");
    const session = { sessionToken: "secret-cookie", userId: "u1", expires };
    const user = { id: "u1", name: "Sam", email: "sam@example.com", image: null, weight: 80, sex: "male", emailVerified: null };
    const out = publicSession(session, user);
    expect(out).toEqual({
      expires: "2026-11-17T00:00:00.000Z",
      user: { id: "u1", name: "Sam", email: "sam@example.com", image: null },
    });
    expect(JSON.stringify(out)).not.toContain("secret-cookie");
  });
});
