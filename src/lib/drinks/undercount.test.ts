import { describe, expect, it } from "vitest";

import type { AiRunner } from "./ai";
import { CATALOG } from "./catalog";
import { buildIndex, parseWithCatalog } from "./parse";
import { isCacheable, parseDrinks } from "./pipeline";
import { SERVE_SIZES, servesForRegion } from "./serves";
import type { ParsedItem } from "./types";

// Ways the bartender used to read a drink as less alcohol than it was.
const au = buildIndex(CATALOG, SERVE_SIZES);
const us = buildIndex(CATALOG, servesForRegion(SERVE_SIZES, "us"));
const first = (text: string, index = au) => parseWithCatalog(text, index).items[0]!;

describe("serve sizes that under-counted", () => {
  it("reads a handle of spirits as a 1.75 L bottle, not a 285 ml pot", () => {
    expect(first("a handle of vodka").volumeMl).toBe(1750);
    expect(first("a handle of vodka").standards).toBeGreaterThan(50);
    // A beer handle (NT, New Zealand) is a glass, never smaller than a pot.
    expect(first("a handle").volumeMl).toBe(425);
    expect(first("a pot").volumeMl).toBe(285);
  });

  it("uses 44 ml US shots for US units, and 30 ml nips otherwise", () => {
    expect(first("a shot of vodka", us).volumeMl).toBe(44);
    expect(first("a double vodka", us).volumeMl).toBe(88);
    expect(first("a shot of vodka").volumeMl).toBe(30);
    // A jigger is a US measure wherever it's typed.
    expect(first("a jigger of whiskey").volumeMl).toBe(44);
  });

  it("keeps 95% spirits at 95%", () => {
    expect(first("a shot of everclear 95%").abv).toBe(95);
  });

  it("reads proof as twice the ABV", () => {
    expect(first("a shot of 80 proof whiskey").abv).toBe(40);
    expect(first("a shot of 151proof rum").abv).toBe(75.5);
    expect(first("100 proof vodka shot").abv).toBe(50);
  });
});

describe("the shared parse cache", () => {
  const ai = (abv: number, serveMl: number, type = "beer"): AiRunner => ({
    run: async () => ({ response: { items: [{ type, brand: "Chicha", serveMl, abv, count: 1, confidence: 0.9 }] } }),
  });
  const puts = async (runner: AiRunner) => {
    const keys: string[] = [];
    await parseDrinks("a tumbler of chicha", { index: au, ai: runner, cachePut: async (k) => void keys.push(k) });
    return keys;
  };

  it("stores a plausible AI answer", async () => {
    expect(await puts(ai(5, 300))).toEqual(["a tumbler of chicha"]);
  });

  it("never stores an implausibly weak or small AI answer for everyone", async () => {
    expect(await puts(ai(1.5, 300))).toEqual([]);
    expect(await puts(ai(5, 20))).toEqual([]);
    expect(await puts(ai(6, 150, "spirit"))).toEqual([]);
    expect(await puts(ai(0, 300, "non_alcoholic"))).toEqual([]);
  });

  it("still returns the answer to the person who asked", async () => {
    const r = await parseDrinks("a tumbler of chicha", { index: au, ai: ai(1.5, 300) });
    expect(r.layer).toBe("ai");
    expect(r.items).toHaveLength(1);
  });

  it("checks only the AI's items, not the catalog's", () => {
    const catalogItem: ParsedItem = { ...first("a glass of water"), source: "catalog" };
    expect(catalogItem.category).toBe("non_alcoholic");
    expect(isCacheable("water and chicha", [catalogItem])).toBe(true);
  });
});
