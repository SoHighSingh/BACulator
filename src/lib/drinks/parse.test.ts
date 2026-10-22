import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { itemsFromAi, parseWithAi, type AiRunner } from "./ai";
import { CATALOG } from "./catalog";
import { buildIndex, parseWithCatalog } from "./parse";
import { parseDrinks } from "./pipeline";
import { SERVE_SIZES } from "./serves";
import { computeStandards, roundUpToTenth } from "./standards";

const index = buildIndex(CATALOG, SERVE_SIZES);
const total = (text: string) => parseWithCatalog(text, index).items.reduce((s, i) => s + i.standards, 0);

describe("standards", () => {
  it("rounds up to the next tenth, never down", () => {
    expect(roundUpToTenth(1.61)).toBe(1.7);
    expect(roundUpToTenth(1.6)).toBe(1.6);
    expect(roundUpToTenth(1.6000000001)).toBe(1.6);
    expect(computeStandards(1, 425, 4.8)).toBe(1.7); // 1.609
  });
});

describe("catalog parser", () => {
  it("knows Australian serve sizes", () => {
    expect(total("schooner of vb")).toBe(computeStandards(1, 425, 4.9));
    expect(total("pot of vb")).toBe(computeStandards(1, 285, 4.9));
    expect(total("SA pint of vb")).toBe(computeStandards(1, 425, 4.9));
    expect(total("longneck of vb")).toBe(computeStandards(1, 750, 4.9));
  });

  it("handles counts, mixers and multiple drinks", () => {
    expect(total("2 schooners of vb and a shot of tequila")).toBeCloseTo(computeStandards(2, 425, 4.9) + computeStandards(1, 30, 40));
    expect(parseWithCatalog("rum and coke", index).items).toHaveLength(1);
    expect(total("half a bottle of wine")).toBe(computeStandards(0.5, 750, 13.5));
  });

  it("only accepts typos that keep the first letter", () => {
    expect(parseWithCatalog("vodak", index).items[0]?.name).toBe("Vodka");
    expect(parseWithCatalog("a hot toddy", index).items[0]?.name).toBe("Hot toddy");
  });

  it("assumes full strength for unknown beer", () => {
    expect(parseWithCatalog("a beer", index).items[0]?.abv).toBe(4.8);
  });

  it("treats non-alcoholic drinks as zero", () => {
    expect(total("carlton zero")).toBe(0);
    expect(parseWithCatalog("a coke", index).onlyNonAlcoholic).toBe(true);
    expect(total("a cup of tea")).toBe(0);
    expect(total("a double with coke")).toBe(computeStandards(1, 60, 40));
  });

  it("does not report zero for text it cannot read", () => {
    expect(parseWithCatalog("a tumbler of chicha", index).unparsed).not.toHaveLength(0);
    expect(parseWithCatalog("drinks", index).unparsed).not.toHaveLength(0);
  });
});

describe("mixed drinks keep their mixer", () => {
  const one = (text: string) => {
    const r = parseWithCatalog(text, index);
    expect(r.items, text).toHaveLength(1);
    expect(r.unparsed, text).toEqual([]);
    return r.items[0]!;
  };

  it.each([
    ["vodka red bull", "Vodka & Red Bull"],
    ["vodka redbull", "Vodka & Red Bull"],
    ["a vodka red bull", "Vodka & Red Bull"],
    ["vodka & red bull", "Vodka & Red Bull"],
    ["Vodka and Red Bull", "Vodka & Red Bull"],
    ["red bull vodka", "Vodka & Red Bull"],
    ["uh vodka red bull please", "Vodka & Red Bull"],
    ["vodka, red bull", "Vodka & Red Bull"],
    ["rum and coke", "Rum & Coke"],
    ["gin tonic", "Gin & Tonic"],
    ["gin and tonic", "Gin & Tonic"],
    ["vodka soda", "Vodka & Soda"],
    ["vodka lime soda", "Vodka & Lime Soda"],
    ["vodka cranberry", "Vodka & Cranberry"],
    ["jaeger and red bull", "Jägermeister & Red Bull"],
  ])("%s -> %s, with the spirit's standards", (text, name) => {
    const item = one(text);
    expect(item.name).toBe(name);
    expect(item.mixer).toBe(name.split(" & ")[1]);
    expect(item.standards).toBe(computeStandards(1, 30, item.abv));
    expect(item.volumeMl).toBe(30);
  });

  it("keeps a branded spirit's name", () => {
    const item = one("jack and coke");
    expect(item.name).toBe("Jack Daniel's Old No. 7 & Coke");
    expect(item.standards).toBe(computeStandards(1, 30, 40));
  });

  it("keeps counts and serve sizes", () => {
    const two = one("2 vodka red bulls");
    expect(two.name).toBe("Vodka & Red Bull");
    expect(two.count).toBe(2);
    expect(two.standards).toBe(computeStandards(2, 30, 40));

    const double = one("double vodka red bull");
    expect(double.name).toBe("Double Vodka & Red Bull");
    expect(double.volumeMl).toBe(60);
    expect(double.standards).toBe(computeStandards(1, 60, 40));

    expect(one("double gin and tonic").name).toBe("Double Gin & Tonic");
    expect(one("can I get a double vodka red bull").standards).toBe(computeStandards(1, 60, 40));
  });

  it("names each mixed drink in a list", () => {
    const r = parseWithCatalog("vodka red bull and a vodka soda", index);
    expect(r.items.map((i) => i.name)).toEqual(["Vodka & Red Bull", "Vodka & Soda"]);
  });

  it("does not name garnishes or attach mixers to beer", () => {
    expect(one("vodka on the rocks").name).toBe("Vodka");
    expect(one("vodka neat").name).toBe("Vodka");
    const r = parseWithCatalog("a schooner of vb and a coke", index);
    expect(r.items.map((i) => i.name)).toEqual(["Victoria Bitter"]);
  });

  it("still counts alcoholic mixers and premixes", () => {
    expect(one("jim beam and cola").category).toBe("rtd");
    expect(total("vodka and alcoholic ginger beer")).toBeCloseTo(computeStandards(1, 30, 40) + computeStandards(1, 330, 4.5));
  });

  it("treats a mixer on its own as non-alcoholic", () => {
    const r = parseWithCatalog("red bull", index);
    expect(r.onlyNonAlcoholic).toBe(true);
    expect(total("red bull")).toBe(0);
  });
});

describe("serve words with no drink", () => {
  it("leaves unknown drinks in a known glass unread", () => {
    const r = parseWithCatalog("blue lagoon jug", index);
    expect(r.items).toEqual([]);
    expect(r.unparsed).toEqual(["blue lagoon jug"]);
    expect(parseWithCatalog("a pint of blue lagoon", index).items).toEqual([]);
  });

  it("still reads a bare glass as its usual drink", () => {
    expect(total("a jug")).toBe(computeStandards(1, 1140, 4.8));
    expect(total("a pint")).toBe(computeStandards(1, 570, 4.8));
    expect(total("2 schooners")).toBe(computeStandards(2, 425, 4.8));
    expect(total("3 shots")).toBe(computeStandards(3, 30, 40));
    expect(total("jug of carlton dry")).toBe(computeStandards(1, 1140, 4.5));
  });

  it("does not read an unknown drink with a mixer as a soft drink", () => {
    const r = parseWithCatalog("blue lagoon lemonade", index);
    expect(r.items).toEqual([]);
    expect(r.unparsed).not.toHaveLength(0);
  });
});

describe("pipeline", () => {
  it("returns unavailable, never a silent 0, when the AI is down", async () => {
    const r = await parseDrinks("a tumbler of chicha", { index, ai: null });
    expect(r.status).toBe("unavailable");
  });

  it("keeps catalog results when the AI is down", async () => {
    const r = await parseDrinks("2 schooners of vb, a tumbler of chicha", { index, ai: null });
    expect(r.status).toBe("partial");
    expect(r.items).toHaveLength(1);
  });

  it("treats 'same again' as the last drink", async () => {
    const last = { name: "VB", category: null, brand: null, volumeMl: 425, abv: 4.9, count: 1, standards: 1.7, confidence: 0.95, source: "recent" as const, catalogId: null, assumed: [] };
    const r = await parseDrinks("Same again!!", { index, lastDrink: async () => [last] });
    expect(r.layer).toBe("recent");
    expect(r.totalStandards).toBe(1.7);
  });

  it("asks rather than reporting 0 when the AI finds no drink in vague text", async () => {
    const ai: AiRunner = { run: async () => ({ response: { items: [] } }) };
    expect((await parseDrinks("idk like 3 drinks", { index, ai })).status).toBe("unavailable");
  });

  it("reads stretched words and slang", () => {
    expect(parseWithCatalog("aperol spritzzz", index).items[0]?.name).toBe("Aperol spritz");
    expect(parseWithCatalog("2 schooies", index).items[0]?.volumeMl).toBe(425);
    expect(parseWithCatalog("xxxx gold", index).items[0]?.name).toBe("XXXX Gold");
  });

  it("prefers recents, then the cache", async () => {
    const recent = await parseDrinks("my usual", {
      index,
      findRecent: async () => [{ name: "Usual", category: null, brand: null, volumeMl: 425, abv: 4.9, count: 1, standards: 1.7, confidence: 0.95, source: "recent", catalogId: null, assumed: [] }],
    });
    expect(recent.layer).toBe("recent");
  });

  it("caches successful AI parses", async () => {
    const puts: string[] = [];
    const ai: AiRunner = { run: async () => ({ response: { items: [{ type: "wine", brand: "Mead", serveMl: 300, abv: 12, count: 1, confidence: 0.9 }] } }) };
    const r = await parseDrinks("a tumbler of chicha", { index, ai, cachePut: async (k) => void puts.push(k) });
    expect(r.layer).toBe("ai");
    expect(r.totalStandards).toBe(computeStandards(1, 300, 12));
    expect(puts).toEqual(["a tumbler of chicha"]);
  });
});

describe("AI output validation", () => {
  it("clamps volume and ABV and computes standards in code", () => {
    const [item] = itemsFromAi({ items: [{ type: "spirit", brand: "", serveMl: 99999, abv: 300, count: 1, confidence: 1 }] }, index);
    expect(item?.volumeMl).toBe(2000);
    expect(item?.abv).toBe(80);
    expect(item?.confidence).toBeLessThanOrEqual(0.7);
  });

  it("does not let the model zero out an unknown-strength drink", () => {
    const [item] = itemsFromAi({ items: [{ type: "beer", brand: "", serveMl: 425, abv: 0, count: 1, confidence: 1 }] }, index);
    expect(item?.abv).toBe(4.8);
    const [fraction] = itemsFromAi({ items: [{ type: "spirit", brand: "moonshine", serveMl: 30, abv: 0.4, count: 1, confidence: 1 }] }, index);
    expect(fraction?.abv).toBe(40);
  });

  it("uses the catalog ABV for a known brand", () => {
    const [item] = itemsFromAi({ items: [{ type: "beer", brand: "VB", serveMl: 375, abv: 1, count: 1, confidence: 1 }] }, index);
    expect(item?.abv).toBe(4.9);
  });

  it("treats quota errors as unavailable", async () => {
    const ai: AiRunner = { run: async () => { throw new Error("3036: account limited"); } };
    await expect(parseWithAi(ai, "mead", index)).rejects.toThrow();
    expect((await parseDrinks("a tumbler of chicha", { index, ai })).status).toBe("unavailable");
  });
});

describe("eval set (offline)", () => {
  const { cases } = JSON.parse(readFileSync(new URL("../../../scripts/drinks.eval.json", import.meta.url), "utf8")) as {
    cases: { text: string; expected: number; noDrinks?: boolean; expectName?: string; tags: string[] }[];
  };

  it("names mixed drinks as the eval set expects", async () => {
    for (const c of cases.filter((x) => x.expectName)) {
      const r = await parseDrinks(c.text, { index, ai: null });
      expect(r.items.map((i) => i.name), c.text).toEqual([c.expectName]);
    }
  });

  it("meets the accuracy and safety targets without the AI layer", async () => {
    let passed = 0;
    for (const c of cases) {
      const r = await parseDrinks(c.text, { index, ai: null });
      const diff = r.totalStandards - c.expected;
      const ok = c.noDrinks ? r.totalStandards === 0 : Math.abs(diff) <= 0.2 + 1e-9 && r.status !== "unavailable";
      if (ok) passed++;
      if (!c.noDrinks && r.status !== "unavailable") expect(diff, c.text).toBeGreaterThanOrEqual(-0.3);
      if (c.tags.includes("injection")) expect(ok, c.text).toBe(true);
    }
    expect(passed / cases.length).toBeGreaterThanOrEqual(0.9);
  });
});
