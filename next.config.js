/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import("next").NextConfig} */
const config = {
  // Keep Prisma out of the Next bundle so OpenNext can wire up its Workers (wasm) build.
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
};

export default config;

// Exposes Cloudflare bindings (local D1 via Miniflare) to `next dev` through getCloudflareContext().
void initOpenNextCloudflareForDev();
