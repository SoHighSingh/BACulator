import { describe, expect, it } from "vitest";

import type { AiRunner } from "./ai";
import { AI_LIMITS, BREAKER, CircuitBreaker, isQuotaError, limitAi, usageKeys, type UsageStore } from "./ai-quota";
import { CATALOG } from "./catalog";
import { buildIndex } from "./parse";
import { isCacheable, parseDrinks } from "./pipeline";
import { SERVE_SIZES } from "./serves";
import type { ParsedItem } from "./types";

const index = buildIndex(CATALOG, SERVE_SIZES);
const T0 = Date.UTC(2026, 9, 17, 20, 0, 0);

function memoryStore() {
  const counts = new Map<string, number>();
  const store: UsageStore = {
    async increment(key) {
      const n = (counts.get(key) ?? 0) + 1;
      counts.set(key, n);
      return n;
    },
    async raiseTo(key, count) {
      counts.set(key, Math.max(counts.get(key) ?? 0, count));
    },
  };
  return { store, counts };
}

function countingAi(impl: () => Promise<unknown> = async () => ({ response: { items: [] } })) {
  const ai = { calls: 0, run: async () => (ai.calls++, impl()) };
  return ai;
}

const call = (ai: AiRunner | null) => ai!.run("model", {});

describe("AI limits", () => {
  it("allows 20 AI calls per user per hour, then stops", async () => {
    const { store } = memoryStore();
    const inner = countingAi();
    const limited: string[] = [];
    let now = T0;
    const ai = limitAi(inner, { userId: "u1", store, breaker: new CircuitBreaker(), now: () => now, onLimited: (r) => limited.push(r) });
    for (let i = 0; i < AI_LIMITS.userPerHour; i++) await call(ai);
    await expect(call(ai)).rejects.toThrow(/user_hour/);
    expect(inner.calls).toBe(AI_LIMITS.userPerHour);
    expect(limited).toEqual(["user_hour"]);

    now += 60 * 60 * 1000; // next hour
    await call(ai);
    expect(inner.calls).toBe(AI_LIMITS.userPerHour + 1);
  });

  it("caps a user at 50 a day across hours", async () => {
    const { store } = memoryStore();
    const inner = countingAi();
    let now = T0 - 20 * 60 * 60 * 1000; // early in the UTC day
    const ai = limitAi(inner, { userId: "u1", store, breaker: new CircuitBreaker(), now: () => now });
    for (let hour = 0; hour < 3; hour++) {
      for (let i = 0; i < AI_LIMITS.userPerHour; i++) await call(ai).catch(() => undefined);
      now += 60 * 60 * 1000;
    }
    expect(inner.calls).toBe(AI_LIMITS.userPerDay);
  });

  it("does not let one user's limit affect another, but shares the global budget", async () => {
    const { store, counts } = memoryStore();
    const inner = countingAi();
    const keys = usageKeys("anyone", T0);
    counts.set(keys.globalDay.key, AI_LIMITS.globalPerDay - 1);
    const a = limitAi(inner, { userId: "a", store, breaker: new CircuitBreaker(), now: () => T0 });
    const b = limitAi(inner, { userId: "b", store, breaker: new CircuitBreaker(), now: () => T0 });
    await call(a);
    await expect(call(b)).rejects.toThrow(/global_day/);
    expect(inner.calls).toBe(1);
  });

  it("does not spend the global budget for a user who is over their own limit", async () => {
    const { store, counts } = memoryStore();
    const keys = usageKeys("u1", T0);
    counts.set(keys.userHour.key, AI_LIMITS.userPerHour);
    const ai = limitAi(countingAi(), { userId: "u1", store, breaker: new CircuitBreaker(), now: () => T0 });
    await expect(call(ai)).rejects.toThrow();
    expect(counts.get(keys.globalDay.key)).toBeUndefined();
  });

  it("stops every caller for the day when the provider reports the allocation is used up", async () => {
    const { store, counts } = memoryStore();
    const inner = countingAi(async () => {
      throw new Error("4006: you have used up your daily free allocation of 10,000 neurons");
    });
    const ai = limitAi(inner, { userId: "u1", store, breaker: new CircuitBreaker(), now: () => T0 });
    await expect(call(ai)).rejects.toThrow();
    expect(counts.get(usageKeys("u1", T0).globalDay.key)).toBe(AI_LIMITS.globalPerDay);
  });

  it("fails closed when the counter store is down", async () => {
    const inner = countingAi();
    const store: UsageStore = { increment: async () => Promise.reject(new Error("D1 down")), raiseTo: async () => undefined };
    const ai = limitAi(inner, { userId: "u1", store, breaker: new CircuitBreaker(), now: () => T0 });
    await expect(call(ai)).rejects.toThrow();
    expect(inner.calls).toBe(0);
  });

  it("opens the breaker after repeated failures and closes it later", async () => {
    const { store } = memoryStore();
    const inner = countingAi(async () => Promise.reject(new Error("timeout")));
    let now = T0;
    const ai = limitAi(inner, { userId: "u1", store, breaker: new CircuitBreaker(), now: () => now });
    for (let i = 0; i < BREAKER.failures; i++) await call(ai).catch(() => undefined);
    await expect(call(ai)).rejects.toThrow(/breaker/);
    expect(inner.calls).toBe(BREAKER.failures);
    now += BREAKER.openMs + 1;
    await call(ai).catch(() => undefined);
    expect(inner.calls).toBe(BREAKER.failures + 1);
  });

  it("turns a limit into 'unavailable' so the user is offered manual entry", async () => {
    const { store, counts } = memoryStore();
    counts.set(usageKeys("u1", T0).userHour.key, AI_LIMITS.userPerHour);
    const ai = limitAi(countingAi(), { userId: "u1", store, breaker: new CircuitBreaker(), now: () => T0 });
    const r = await parseDrinks("a tumbler of chicha", { index, ai });
    expect(r.status).toBe("unavailable");
  });

  it("recognises quota errors", () => {
    expect(isQuotaError(new Error("3036: account limited"))).toBe(true);
    expect(isQuotaError(new Error("Workers AI timed out"))).toBe(false);
  });

  it("passes no AI through when there is no binding", () => {
    expect(limitAi(null, { userId: "u1", store: memoryStore().store, breaker: new CircuitBreaker() })).toBeNull();
  });
});

describe("parse cache rules", () => {
  const item = (confidence: number): ParsedItem => ({
    name: "Chicha", category: "beer", brand: null, volumeMl: 300, abv: 5, count: 1, standards: 1.2,
    confidence, source: "ai", catalogId: null, assumed: [],
  });

  it("keeps short drink phrases", () => {
    expect(isCacheable("a tumbler of chicha", [item(0.7)])).toBe(true);
    expect(isCacheable("2 500ml cans of chicha", [item(0.7)])).toBe(true);
  });

  it("skips long text, long numbers and low-confidence parses", () => {
    expect(isCacheable("a tumbler of chicha at my mate daves place on smith street", [item(0.7)])).toBe(false);
    expect(isCacheable("chicha call me 0412 345 678", [item(0.7)])).toBe(false);
    expect(isCacheable("a tumbler of chicha", [item(0.3)])).toBe(false);
    expect(isCacheable("a tumbler of chicha", [])).toBe(false);
  });

  it("parses but does not cache text that fails the rules", async () => {
    const puts: string[] = [];
    const ai: AiRunner = { run: async () => ({ response: { items: [{ type: "beer", brand: "Chicha", serveMl: 300, abv: 5, count: 1, confidence: 0.9 }] } }) };
    const text = "a tumbler of chicha that jo from 12 smith street brewed";
    const r = await parseDrinks(text, { index, ai, cachePut: async (k) => void puts.push(k) });
    expect(r.layer).toBe("ai");
    expect(puts).toEqual([]);
  });
});
