/**
 * Drink parser eval: runs scripts/drinks.eval.json through the same pipeline the app uses and
 * reports per-layer hit rate and accuracy.
 *
 *   npm run eval:drinks                 # offline: catalog only, AI layer reported as unavailable
 *   CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_API_TOKEN=... npm run eval:drinks   # also exercises Workers AI
 *
 * Targets: ≥90% of cases within ±0.2 standard drinks, no under-estimate worse than −0.3, and every
 * injection case ignored. Exits 1 if a target is missed.
 */
import { readFileSync } from "node:fs";

import { AI_MODEL, type AiRunner } from "../src/lib/drinks/ai";
import { CATALOG } from "../src/lib/drinks/catalog";
import { buildIndex } from "../src/lib/drinks/parse";
import { parseDrinks } from "../src/lib/drinks/pipeline";
import { SERVE_SIZES } from "../src/lib/drinks/serves";
import type { ParseResult } from "../src/lib/drinks/types";

interface EvalCase {
  text: string;
  expected: number;
  noDrinks?: boolean;
  /** Name the single parsed item must have ("Vodka & Red Bull"), when the name matters. */
  expectName?: string;
  tags: string[];
  note?: string;
}

const TOLERANCE = 0.2;
const MAX_UNDER = -0.3;

function restAi(): AiRunner | null {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!account || !token) return null;
  return {
    async run(model, inputs) {
      const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(inputs),
      });
      if (!res.ok) throw new Error(`Workers AI HTTP ${res.status}: ${await res.text()}`);
      return (await res.json<{ result: unknown }>()).result;
    },
  };
}

async function main() {
  const file = new URL("./drinks.eval.json", import.meta.url);
  const { cases } = JSON.parse(readFileSync(file, "utf8")) as { cases: EvalCase[] };
  const index = buildIndex(CATALOG, SERVE_SIZES);
  const ai = restAi();

  const rows: { c: EvalCase; r: ParseResult; diff: number; pass: boolean; under: boolean }[] = [];
  for (const c of cases) {
    const r = await parseDrinks(c.text, { index, ai });
    const actual = r.totalStandards;
    const diff = Math.round((actual - c.expected) * 100) / 100;
    const nameOk = c.expectName === undefined || (r.items.length === 1 && r.items[0]!.name === c.expectName);
    const pass = nameOk && (c.noDrinks ? actual === 0 : Math.abs(diff) <= TOLERANCE + 1e-9 && r.status !== "unavailable");
    // "unavailable" shows manual entry rather than a number, so it is a miss but not an under-estimate.
    const under = !c.noDrinks && r.status !== "unavailable" && diff < MAX_UNDER;
    rows.push({ c, r, diff, pass, under });
  }

  const pct = (n: number, d: number) => (d === 0 ? "–" : `${((100 * n) / d).toFixed(1)}%`);
  const layerOf = (r: ParseResult) => (r.status === "unavailable" ? "unavailable" : (r.layer ?? "none"));

  console.log(`\nDrink parser eval: ${rows.length} cases, AI layer ${ai ? `ON (${AI_MODEL})` : "OFF (no Cloudflare credentials)"}\n`);
  console.log("Layer           cases   accurate");
  const layers = new Map<string, typeof rows>();
  for (const row of rows) layers.set(layerOf(row.r), [...(layers.get(layerOf(row.r)) ?? []), row]);
  for (const [layer, list] of layers) {
    console.log(`${layer.padEnd(15)} ${String(list.length).padStart(5)}   ${pct(list.filter((x) => x.pass).length, list.length).padStart(8)}`);
  }

  console.log("\nTag             cases   accurate");
  const tags = [...new Set(rows.flatMap((x) => x.c.tags))].sort();
  for (const tag of tags) {
    const list = rows.filter((x) => x.c.tags.includes(tag));
    console.log(`${tag.padEnd(15)} ${String(list.length).padStart(5)}   ${pct(list.filter((x) => x.pass).length, list.length).padStart(8)}`);
  }

  const passed = rows.filter((x) => x.pass).length;
  const unders = rows.filter((x) => x.under);
  const injections = rows.filter((x) => x.c.tags.includes("injection"));
  const injectionOk = injections.filter((x) => x.pass).length;
  const accuracy = passed / rows.length;

  const failures = rows.filter((x) => !x.pass);
  if (failures.length > 0) {
    console.log("\nMisses");
    for (const { c, r, diff } of failures) {
      const got = r.items.map((i) => `${i.count}×${i.name} ${i.volumeMl}ml@${i.abv}%`).join(" + ") || r.status;
      console.log(`  ${JSON.stringify(c.text)}  expected ${c.expected}, got ${r.totalStandards} (${diff >= 0 ? "+" : ""}${diff})  [${got}]`);
    }
  }

  console.log(`\nAccuracy (±${TOLERANCE}):     ${passed}/${rows.length} = ${pct(passed, rows.length)}  (target ≥ 90%)`);
  console.log(`Under-estimates < ${MAX_UNDER}: ${unders.length}${unders.length ? `  ${unders.map((x) => JSON.stringify(x.c.text)).join(", ")}` : ""}  (target 0)`);
  console.log(`Injection cases ignored:  ${injectionOk}/${injections.length}  (target all)\n`);

  const unavailable = rows.filter((x) => x.r.status === "unavailable").length;
  console.log(`Unavailable (manual entry shown): ${unavailable}
`);
  if (accuracy < 0.9 || unders.length > 0 || injectionOk < injections.length) process.exit(1);
}

void main();
