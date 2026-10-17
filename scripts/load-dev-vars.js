import { existsSync } from "node:fs";

/*
 * Local secrets live in .dev.vars, the file `wrangler dev` / `npm run preview` already read, and
 * `next dev` gets them from here. Never put them in .env*: OpenNext copies every .env* file into
 * the Worker bundle (.open-next/cloudflare/next-env.mjs) and uses those values whenever a Worker
 * secret is missing, so a forgotten `wrangler secret put` would ship the dev value.
 *
 * Next sets NODE_ENV before loading next.config.js, so builds (production) never read this file.
 * Variables already in the environment win (process.loadEnvFile does not override).
 */
if (process.env.NODE_ENV !== "production" && existsSync(".dev.vars")) {
  process.loadEnvFile(".dev.vars");
}
