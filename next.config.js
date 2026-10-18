/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
// Local secrets come from .dev.vars, never .env (see the file). Must stay above the env import.
import "./scripts/load-dev-vars.js";
import "./src/env.js";

import { randomUUID } from "node:crypto";

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import withSerwistInit from "@serwist/next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

/**
 * Content Security Policy. Everything the app loads is same-origin (next/font self-hosts Geist,
 * there are no third-party scripts or images). Scripts still need 'unsafe-inline': the App
 * Router streams its payload in inline <script> tags, and a nonce would make every page dynamic.
 * The policy still stops scripts, frames and requests to other origins. The JSON-LD block needs no
 * hash: it is a data block, which browsers never execute, so script-src does not apply to it.
 * Dev adds 'unsafe-eval' for React Refresh.
 * @param {boolean} dev
 */
const contentSecurityPolicy = (dev) =>
  [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    // Sign-in posts to /api/auth, which redirects to Google.
    "form-action 'self' https://accounts.google.com",
    "frame-ancestors 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

/** @param {boolean} dev */
const securityHeaders = (dev) => [
  { key: "Content-Security-Policy", value: contentSecurityPolicy(dev) },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), payment=()" },
];

// The service worker that lets the installed app open with no signal (src/app/sw.ts). Built into
// public/sw.js by production builds only: `next dev --turbo` doesn't run webpack plugins.
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // The app shell, for opening offline; a new revision each build so it never goes stale.
  additionalPrecacheEntries: [{ url: "/", revision: randomUUID() }],
  reloadOnOnline: false, // a reload would throw away whatever the person is doing
});

/** @param {string} phase */
export default function nextConfig(phase) {
  // Exposes Cloudflare bindings (local D1 via Miniflare) to `next dev` through getCloudflareContext().
  // Dev only: the remote AI binding needs a Cloudflare login, which CI builds don't have.
  const dev = phase === PHASE_DEVELOPMENT_SERVER;
  if (dev) void initOpenNextCloudflareForDev();
  /** @type {import("next").NextConfig} */
  const config = {
    // Keep Prisma out of the Next bundle so OpenNext can wire up its Workers (wasm) build.
    serverExternalPackages: ["@prisma/client", ".prisma/client"],
    // The floating dev badge sits over the dock's buttons on phone-size previews.
    devIndicators: false,
    async headers() {
      return [{ source: "/:path*", headers: securityHeaders(dev) }];
    },
  };
  return dev ? config : withSerwist(config);
}
