/// <reference lib="webworker" />
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  Serwist,
  StaleWhileRevalidate,
  type PrecacheEntry,
  type SerwistGlobalConfig,
} from "serwist";

import { AUTH_SESSION_CACHE, PAGES_CACHE } from "../lib/sw-caches";

/**
 * The service worker (built by @serwist/next into public/sw.js, production only). Its one job is
 * that the installed app opens with no signal: every build file is precached, pages fall back to
 * the cached shell, and the last sign-in check is reused so a signed-in person lands on their night,
 * not the landing page. Drinks and the estimate never come from here: tRPC calls always go to the
 * network, and offline adds wait in the app's own outbox (lib/outbox).
 */

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const sameOrigin = (url: URL) => url.origin === self.location.origin;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      // "Am I signed in?" With no signal, the last answer stands, so the night screen opens.
      matcher: ({ url }) => sameOrigin(url) && url.pathname === "/api/auth/session",
      handler: new NetworkFirst({ cacheName: AUTH_SESSION_CACHE, networkTimeoutSeconds: 4 }),
    },
    {
      // Pages: fresh when there's signal, the last copy (or the precached shell) when there isn't.
      matcher: ({ request, url }) => sameOrigin(url) && request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: PAGES_CACHE,
        networkTimeoutSeconds: 4,
        plugins: [new ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 30 * 24 * 60 * 60 })],
      }),
    },
    {
      // Build files the precache doesn't list (they're content-hashed, so a cached copy is always right).
      matcher: ({ url }) => sameOrigin(url) && url.pathname.startsWith("/_next/static/"),
      handler: new CacheFirst({
        cacheName: "next-static",
        plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 })],
      }),
    },
    {
      // Icons and images from /public, and the manifest.
      matcher: ({ request, url }) =>
        sameOrigin(url) && (request.destination === "image" || request.destination === "manifest"),
      handler: new StaleWhileRevalidate({
        cacheName: "static",
        plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 30 * 24 * 60 * 60 })],
      }),
    },
  ],
  fallbacks: {
    entries: [{ url: "/", matcher: ({ request }) => request.destination === "document" }],
  },
});

serwist.addEventListeners();
