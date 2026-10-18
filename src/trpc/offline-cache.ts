import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import type { Query } from "@tanstack/react-query";

/**
 * The night screen's data (tonight's drinks, recents, weight and sex) is kept in localStorage so a
 * reload with no signal still shows the estimate. Only these queries, only for 48 h (the estimate's
 * window), and cleared on sign-out. Drinks not yet synced live in lib/outbox, not here.
 */
const STORAGE_KEY = "baculator-offline-cache";
const OWNER_KEY = "baculator-offline-cache-owner";
const PERSISTED = new Set(["post.getNight", "post.recentDrinks", "post.userInfo"]);

export const OFFLINE_CACHE_MAX_AGE = 48 * 60 * 60 * 1000;

function storage(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined; // blocked storage: nothing persists, everything else still works
  }
}

export const offlinePersister = createSyncStoragePersister({ storage: storage(), key: STORAGE_KEY });

// tRPC query keys look like [["post", "getNight"], { type: "query" }].
export const shouldPersistQuery = (query: Query) => {
  const path = query.queryKey[0];
  return query.state.status === "success" && Array.isArray(path) && PERSISTED.has(path.join("."));
};

/** Forget the saved night (sign-out, account deleted). */
export function clearOfflineCache() {
  try {
    storage()?.removeItem(STORAGE_KEY);
    storage()?.removeItem(OWNER_KEY);
  } catch {
    // nothing saved
  }
}

/**
 * Whether the saved night belongs to someone else (another account signed in on this phone).
 * Records `userId` as the owner either way.
 */
export function claimOfflineCache(userId: string): boolean {
  try {
    const owner = storage()?.getItem(OWNER_KEY);
    storage()?.setItem(OWNER_KEY, userId);
    return !!owner && owner !== userId;
  } catch {
    return false;
  }
}
