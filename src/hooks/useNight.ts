import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { DrinkDetails } from "~/lib/drinks/details";
import { mergeNight, prunePending, type NightDrink, type PendingDrink } from "~/lib/night-model";
import { api } from "~/trpc/react";

export interface NewDrink {
  standards: number;
  finishedAt: Date;
  details?: Partial<DrinkDetails> & { name?: string };
}

export type LoggedDrink = NightDrink;

const errorCode = (e: unknown) => (e instanceof TRPCClientError ? (e.data as { code?: string } | undefined)?.code : undefined);

function saveError(e: unknown, action: "save" | "remove"): string {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return action === "save" ? "You're offline. That drink wasn't saved. Add it again when you have signal." : "You're offline. Try again when you have signal.";
  }
  if (errorCode(e) === "UNAUTHORIZED") return "You've been signed out. Sign in again to keep adding.";
  return action === "save" ? "Couldn't save that drink. Try again." : "Couldn't remove that drink. Try again.";
}

/**
 * Tonight's drinks (48 h window, any session), recents for one-tap adds, and add/remove.
 * Adds are optimistic: the drink shows (and the glass fills) the moment it's tapped, and the server
 * copy replaces it when it arrives. The merge rules live in lib/night-model and are unit tested.
 */
export function useNight() {
  const utils = api.useUtils();
  const nightQuery = api.post.getNight.useQuery(undefined, { refetchOnWindowFocus: true });
  const recentsQuery = api.post.recentDrinks.useQuery(undefined, { refetchOnWindowFocus: false });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingDrink[]>([]);
  const seq = useRef(0);
  // Drinks undone while still saving, read synchronously when the save returns.
  const undoneWhileSaving = useRef(new Set<string>());
  // Every saved drink's on-screen id → server id, so Undo works after the optimistic copy is gone.
  const savedIds = useRef(new Map<string, string>());

  const addMutation = api.post.addDrink.useMutation();
  const removeMutation = api.post.deleteDrink.useMutation();
  const refresh = useCallback(
    () => Promise.all([utils.post.getNight.invalidate(), utils.post.recentDrinks.invalidate()]),
    [utils],
  );

  const server = useMemo<NightDrink[]>(
    () =>
      (nightQuery.data ?? []).map((d) => ({
        id: d.id,
        standards: d.standards,
        finishedAt: new Date(d.finishedAt),
        name: d.name,
        volumeMl: d.volumeMl,
        abv: d.abv,
        count: d.count,
      })),
    [nightQuery.data],
  );

  useEffect(() => setPending((p) => prunePending(server, p)), [server]);
  const drinks = useMemo(() => mergeNight(server, pending), [server, pending]);

  const deleteOnServer = useCallback(
    async (id: string) => {
      try {
        await removeMutation.mutateAsync({ drinkId: id });
        return true;
      } catch (e) {
        // Already gone (a double tap, another tab): that's what was wanted.
        if (errorCode(e) === "NOT_FOUND") return true;
        setError(saveError(e, "remove"));
        return false;
      }
    },
    [removeMutation],
  );

  /** Shows the drink at once and saves it in the background. Returns the drink as shown. */
  const add = useCallback(
    (drink: NewDrink): LoggedDrink => {
      const tempId = `pending-${++seq.current}-${Date.now()}`;
      const shown: LoggedDrink = {
        id: tempId,
        standards: drink.standards,
        finishedAt: drink.finishedAt,
        name: drink.details?.name ?? null,
        volumeMl: drink.details?.volumeMl ?? null,
        abv: drink.details?.abv ?? null,
        count: drink.details?.count ?? null,
      };
      setError(null);
      setPending((p) => [...p, { tempId, drink: shown, realId: null, cancelled: false }]);

      const { name, volumeMl, abv, count, source, confidence, rawText } = drink.details ?? {};
      addMutation
        .mutateAsync({
          standards: drink.standards,
          finishedAt: drink.finishedAt.toISOString(),
          details: { name, volumeMl, abv, count, source, confidence, rawText },
        })
        .then(async (created) => {
          savedIds.current.set(tempId, created.id);
          setPending((p) => p.map((x) => (x.tempId === tempId ? { ...x, realId: created.id } : x)));
          if (undoneWhileSaving.current.delete(tempId)) {
            await deleteOnServer(created.id);
            setPending((p) => p.filter((x) => x.tempId !== tempId));
          }
          await refresh();
        })
        .catch((e: unknown) => {
          undoneWhileSaving.current.delete(tempId);
          setPending((p) => p.filter((x) => x.tempId !== tempId));
          setError(saveError(e, "save"));
        });
      return shown;
    },
    [addMutation, deleteOnServer, refresh],
  );

  /** Removes a drink, whether it's saved, still saving, or only on this device. */
  const remove = useCallback(
    async (id: string) => {
      setError(null);
      const entry = pending.find((p) => p.tempId === id || p.realId === id);
      if (entry && !entry.realId) {
        // Still saving: hide it now, delete it when the save returns.
        undoneWhileSaving.current.add(entry.tempId);
        setPending((p) => p.map((x) => (x.tempId === entry.tempId ? { ...x, cancelled: true } : x)));
        return true;
      }
      const realId = entry?.realId ?? savedIds.current.get(id) ?? id;
      if (entry) setPending((p) => p.map((x) => (x.tempId === entry.tempId ? { ...x, cancelled: true } : x)));
      const ok = await deleteOnServer(realId);
      if (entry) setPending((p) => p.filter((x) => x.tempId !== entry.tempId));
      await refresh();
      return ok;
    },
    [pending, deleteOnServer, refresh],
  );

  return {
    drinks,
    recents: recentsQuery.data ?? [],
    isLoading: nightQuery.isLoading,
    isSaving: addMutation.isPending,
    error,
    add,
    remove,
  };
}
