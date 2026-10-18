import type { QueryClient } from "@tanstack/react-query";
import { signOut, type SignOutParams } from "next-auth/react";

import { clearOfflineCache } from "~/trpc/offline-cache";
import { clearSignedInCaches } from "./sw-caches";

/**
 * Signs out and leaves nothing of tonight on the phone for whoever signs in next: the saved night,
 * the service worker's copy of the sign-in check and of the pages. Drinks not yet synced stay in the
 * outbox under this person's id (they sync when they sign back in here); the You sheet warns first.
 */
export async function signOutHere(queryClient: QueryClient | null, params?: SignOutParams<true>) {
  queryClient?.clear();
  clearOfflineCache();
  await clearSignedInCaches().catch(() => undefined);
  await signOut(params);
}
