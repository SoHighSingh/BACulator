import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The router module pulls in auth, the D1 client and the bartender; none of them run here.
vi.mock("~/server/auth", () => ({ auth: vi.fn() }));
vi.mock("~/server/db", () => ({ db: {} }));
const analyseDrinkText = vi.fn();
vi.mock("~/server/bartender", () => ({ analyseDrinkText }));

const { TERMS_VERSION } = await import("~/lib/consent");
const { NIGHT_WINDOW_MS } = await import("~/lib/night-model");
const { postRouter } = await import("./post");
const { createCallerFactory } = await import("~/server/api/trpc");

const fn = () => vi.fn();
const db = {
  user: { findUnique: fn(), delete: fn() },
  drink: { findUnique: fn(), create: fn(), deleteMany: fn() },
  tab: { findFirst: fn(), findMany: fn(), create: fn(), deleteMany: fn() },
  session: { deleteMany: fn() },
  account: { deleteMany: fn() },
  aiUsage: { deleteMany: fn() },
  verificationToken: { deleteMany: fn() },
  $transaction: fn(),
};

const caller = createCallerFactory(postRouter)({
  db: db as never,
  session: { user: { id: "user-1" }, expires: "2099-01-01T00:00:00.000Z" },
  headers: new Headers(),
} as never);

const consented = { termsVersion: TERMS_VERSION, ageConfirmedAt: new Date(), email: "sam@example.com" };
const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return "ok";
  } catch (e) {
    return e instanceof TRPCError ? e.code : "other";
  }
};

beforeEach(() => {
  for (const model of Object.values(db)) {
    if (typeof model === "function") model.mockReset();
    else for (const m of Object.values(model)) m.mockReset();
  }
  db.tab.findFirst.mockResolvedValue({ id: "tab-1" });
  db.drink.findUnique.mockResolvedValue(null);
  db.drink.create.mockImplementation(({ data }: { data: object }) => Promise.resolve({ id: "d1", ...data }));
});

describe("server-side consent gate", () => {
  const add = () => caller.addDrink({ standards: 1.6, finishedAt: new Date().toISOString() });

  it("refuses to log drinks, edit details or ask the bartender before age and terms are confirmed", async () => {
    for (const user of [null, { termsVersion: null, ageConfirmedAt: null }, { termsVersion: "old", ageConfirmedAt: new Date() }, { termsVersion: TERMS_VERSION, ageConfirmedAt: null }]) {
      db.user.findUnique.mockResolvedValue(user);
      expect(await code(add())).toBe("PRECONDITION_FAILED");
      expect(await code(caller.updateUserInfo({ weight: 70, sex: "female" }))).toBe("PRECONDITION_FAILED");
      expect(await code(caller.analyseDrink({ drinkText: "a schooner" }))).toBe("PRECONDITION_FAILED");
    }
    expect(db.drink.create).not.toHaveBeenCalled();
    expect(analyseDrinkText).not.toHaveBeenCalled();
  });

  it("lets a consented person through", async () => {
    db.user.findUnique.mockResolvedValue(consented);
    expect(await code(add())).toBe("ok");
  });

  it("never blocks giving consent, downloading or deleting data", async () => {
    db.user.findUnique.mockResolvedValue({ termsVersion: null, ageConfirmedAt: null, email: null });
    expect(await code(caller.consentStatus())).toBe("ok");
    expect(await code(caller.deleteAccount())).toBe("ok");
  });
});

describe("addDrink with a queued drink", () => {
  beforeEach(() => db.user.findUnique.mockResolvedValue(consented));
  const savedAt = () => (db.drink.create.mock.calls[0]![0] as { data: { finishedAt: Date } }).data.finishedAt.getTime();

  it("accepts a drink held offline for more than 48 hours instead of refusing it", async () => {
    const old = Date.now() - NIGHT_WINDOW_MS - 60 * 60 * 1000;
    expect(await code(caller.addDrink({ standards: 1.6, finishedAt: new Date(old).toISOString(), clientNow: new Date().toISOString() }))).toBe("ok");
    expect(Math.abs(savedAt() - old)).toBeLessThan(2000);
  });

  it("corrects a phone clock that is 10 minutes fast instead of refusing it", async () => {
    const fast = Date.now() + 10 * 60 * 1000;
    expect(await code(caller.addDrink({ standards: 1.6, finishedAt: new Date(fast).toISOString(), clientNow: new Date(fast).toISOString() }))).toBe("ok");
    expect(Math.abs(savedAt() - Date.now())).toBeLessThan(2000);
  });
});

describe("deleteAccount", () => {
  it("also erases the bartender counters and sign-in links", async () => {
    db.user.findUnique.mockResolvedValue({ email: "sam@example.com" });
    await caller.deleteAccount();
    expect(db.aiUsage.deleteMany).toHaveBeenCalledWith({ where: { key: { startsWith: "ai:u:user-1:" } } });
    expect(db.verificationToken.deleteMany).toHaveBeenCalledWith({ where: { identifier: "sam@example.com" } });
    expect(db.user.delete).toHaveBeenCalledWith({ where: { id: "user-1" } });
    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });
});
