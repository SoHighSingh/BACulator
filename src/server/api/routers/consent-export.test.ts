import { beforeEach, describe, expect, it, vi } from "vitest";

// The router module pulls in auth, the D1 client and the bartender; none of them run here.
vi.mock("~/server/auth", () => ({ auth: vi.fn() }));
vi.mock("~/server/db", () => ({ db: {} }));
vi.mock("~/server/bartender", () => ({ analyseDrinkText: vi.fn() }));

const { TERMS_VERSION } = await import("~/lib/consent");
const { postRouter } = await import("./post");
const { createCallerFactory } = await import("~/server/api/trpc");

const userUpdate = vi.fn();
const userFindUnique = vi.fn();
const db = { user: { update: userUpdate, findUnique: userFindUnique } };

const caller = createCallerFactory(postRouter)({
  db: db as never,
  session: { user: { id: "user-1" }, expires: "2099-01-01T00:00:00.000Z" },
  headers: new Headers(),
} as never);

beforeEach(() => {
  userUpdate.mockReset();
  userFindUnique.mockReset();
});

describe("recordConsent", () => {
  it("saves the current terms version and the time age was confirmed", async () => {
    await caller.recordConsent({ termsVersion: TERMS_VERSION, ageConfirmed: true });
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { termsVersion: TERMS_VERSION, ageConfirmedAt: expect.any(Date) as Date },
    });
  });

  it("refuses an old terms version or an unticked age box", async () => {
    await expect(caller.recordConsent({ termsVersion: "old" as never, ageConfirmed: true })).rejects.toThrow();
    await expect(caller.recordConsent({ termsVersion: TERMS_VERSION, ageConfirmed: false as never })).rejects.toThrow();
    expect(userUpdate).not.toHaveBeenCalled();
  });
});

describe("consentStatus", () => {
  it("reports no consent for an account from before the consent step", async () => {
    userFindUnique.mockResolvedValue({ termsVersion: null, ageConfirmedAt: null });
    await expect(caller.consentStatus()).resolves.toEqual({ termsVersion: null, ageConfirmedAt: null });
  });
});

describe("exportMyData", () => {
  it("returns the user's details and drinks without sign-in tokens", async () => {
    userFindUnique.mockResolvedValue({
      name: "Sam",
      email: "sam@example.com",
      image: null,
      weight: 70,
      sex: "female",
      ageConfirmedAt: new Date("2026-10-17T10:00:00Z"),
      termsVersion: TERMS_VERSION,
      accounts: [{ provider: "google" }],
      tabs: [
        {
          name: "Session 1",
          createdAt: new Date("2026-10-17T09:00:00Z"),
          finishedAt: null,
          drinks: [
            {
              standards: 1.6,
              finishedAt: new Date("2026-10-17T09:30:00Z"),
              name: "Schooner",
              volumeMl: 425,
              abv: 4.8,
              count: 1,
              source: "catalog",
              rawText: "schooner",
            },
          ],
        },
      ],
    });

    const data = await caller.exportMyData();

    // Only ask the database for fields that are about the person, never the token columns.
    const select = (userFindUnique.mock.calls[0]![0] as { select: Record<string, unknown> }).select;
    expect(select).toMatchObject({ accounts: { select: { provider: true } } });
    expect(JSON.stringify(select)).not.toMatch(/token/i);

    expect(data.details).toMatchObject({ email: "sam@example.com", weightKg: 70, signInWith: ["google"] });
    expect(data.sessions[0]!.drinks[0]).toMatchObject({ name: "Schooner", standards10g: 1.6 });
    expect(JSON.stringify(data)).not.toMatch(/token"/i);
  });

  it("fails cleanly if the account is gone", async () => {
    userFindUnique.mockResolvedValue(null);
    await expect(caller.exportMyData()).rejects.toThrow("Account not found");
  });
});
