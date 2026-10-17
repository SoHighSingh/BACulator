/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

import { randomUUID } from "node:crypto";

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import withSerwistInit from "@serwist/next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

// The service worker that lets the installed app open with no signal (src/app/sw.ts). Built into
// public/sw.js by production builds only: `next dev --turbo` doesn't run webpack plugins.
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // The app shell, for opening offline; a new revision each build so it never goes stale.
  additionalPrecacheEntries: [{ url: "/", revision: randomUUID() }],
  reloadOnOnline: false, // a reload would throw away whatever the person is doing
});

/** @type {import("next").NextConfig} */
const config = {
  // Keep Prisma out of the Next bundle so OpenNext can wire up its Workers (wasm) build.
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
};

/** @param {string} phase */
export default function nextConfig(phase) {
  // Exposes Cloudflare bindings (local D1 via Miniflare) to `next dev` through getCloudflareContext().
  // Dev only: the remote AI binding needs a Cloudflare login, which CI builds don't have.
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    void initOpenNextCloudflareForDev();
    return config;
  }
  return withSerwist(config);
}
