/**
 * Service worker caches that hold something about the signed-in person: the last sign-in check and
 * the pages they opened. Named here so the worker (app/sw.ts) and sign-out agree.
 */
export const AUTH_SESSION_CACHE = "auth-session";
export const PAGES_CACHE = "pages";
export const SIGNED_IN_CACHES = [AUTH_SESSION_CACHE, PAGES_CACHE] as const;

/** Deletes those caches, so the next person on this phone never opens on the last one's night. */
export async function clearSignedInCaches(cacheStorage: CacheStorage | undefined = globalThis.caches): Promise<void> {
  if (!cacheStorage) return;
  await Promise.all(SIGNED_IN_CACHES.map((name) => cacheStorage.delete(name).catch(() => false)));
}
