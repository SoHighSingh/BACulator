import { existsSync, readdirSync, readFileSync } from "node:fs";

/*
 * Guards the Worker build against baked-in secrets. OpenNext copies every .env* file into
 * .open-next/cloudflare/next-env.mjs, and the Worker falls back to those values when a secret is
 * missing. Local values belong in .dev.vars (see scripts/load-dev-vars.js).
 *
 *   node scripts/check-env-files.js          before a build: refuse if any .env* file exists
 *   node scripts/check-env-files.js --built  after a build: refuse if the bundle has env values
 */
const built = process.argv.includes("--built");

if (!built) {
  const found = readdirSync(".").filter((f) => /^\.env(\..+)?$/.test(f) && f !== ".env.example");
  if (found.length > 0) {
    console.error(
      `Refusing to build the Worker: ${found.join(", ")} would be copied into the bundle.\n` +
        "Move local values to .dev.vars (see .dev.vars.example) and delete the .env file(s).",
    );
    process.exit(1);
  }
} else {
  const file = ".open-next/cloudflare/next-env.mjs";
  if (!existsSync(file)) {
    console.error(`${file} not found; run the OpenNext build first.`);
    process.exit(1);
  }
  // Each mode is written as `export const <mode> = {...};`. Only key names are printed, never values.
  const leaked = [...readFileSync(file, "utf8").matchAll(/export const (\w+) = (\{.*\});/g)].flatMap(
    ([, mode, json]) => Object.keys(JSON.parse(json ?? "{}")).map((key) => `${mode}.${key}`),
  );
  if (leaked.length > 0) {
    console.error(`The Worker bundle contains .env values: ${leaked.join(", ")}`);
    process.exit(1);
  }
}
