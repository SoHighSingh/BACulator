/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

/** @type {import("next").NextConfig} */
const config = {
  // Keep Prisma out of the Next bundle so OpenNext can wire up its Workers (wasm) build.
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
};

/** @param {string} phase */
export default function nextConfig(phase) {
  // Exposes Cloudflare bindings (local D1 via Miniflare) to `next dev` through getCloudflareContext().
  // Dev only: the remote AI binding needs a Cloudflare login, which CI builds don't have.
  if (phase === PHASE_DEVELOPMENT_SERVER) void initOpenNextCloudflareForDev();
  return config;
}
