import { useIsRestoring, useQueryClient } from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { DrinkDetails } from "~/lib/drinks/details";
import {
  drinkFromPayload,
  mergeNight,
  outboxView,
  syncFailure,
  type AddPayload,
  type NightDrink,
  type OutboxEntry,
  type Removal,
} from "~/lib/night-model";
import { listOutbox, putOutbox, removeOutbox, type StoredEntry } from "~/lib/outbox";
import { claimOfflineCache } from "~/trpc/offline-cache";
import { api } from "~/trpc/react";

export interface NewDrink {
  standards: number;
  finishedAt: Date;
  details?: Partial<DrinkDetails> & { name?: string };
}

export type LoggedDrink = NightDrink;

const errorCode = (e: unknown) => (e instanceof TRPCClientError ? (e.data as { code?: string } | undefined)?.code : undefined);

const SIGNED_OUT = "You've been signed out. Sign in again and your drinks will sync.";
// A send with no reply by then is treated as no signal (lie-fi), and tried again later.
const SEND_TIMEOUT_MS = 15_000;
// Waiting this long for a reply shows "saved on this phone" instead of leaving it unsaid.
const SLOW_MS = 3_000;
const RETRY_MIN_MS = 5_000;
const RETRY_MAX_MS = 60_000;

// Not yet on disk: a negative seq until the IndexedDB write returns.
let optimisticSeq = 0;

/** Entries from disk plus ones still being written, without listing any twice. */
function mergeQueue(stored: StoredEntry[], current: StoredEntry[]): StoredEntry[] {
  const onDisk = new Set(stored.map((e) => `${e.op}|${e.clientId}`));
  return [...stored, ...current.filter((e) => e.seq < 0 && !onDisk.has(`${e.op}|${e.clientId}`))];
}

/**
 * Tonight's drinks (48 h window, any session), recents for one-tap adds, and add/remove.
 *
 * Every add and remove goes to an outbox on this device first (IndexedDB, lib/outbox) and is shown
 * at once; the outbox is sent in order whenever there's signal, and again on `online` and when the
 * app comes back to the front. Each add carries a client id, so a replay never adds a drink twice.
 * With no signal the drink stays on screen marked "saved on this phone" and survives a reload.
 * The merge rules live in lib/night-model and are unit tested.
 */
export function useNight() {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;
  const utils = api.useUtils();
  const queryClient = useQueryClient();
  const isRestoring = useIsRestoring();
  const nightQuery = api.post.getNight.useQuery(undefined, { refetchOnWindowFocus: true });
  const recentsQuery = api.post.recentDrinks.useQuery(undefined, { refetchOnWindowFocus: false });
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<StoredEntry[]>([]);
  // No signal (or a reply is slow): queued drinks say they're only on this phone.
  const [waiting, setWaiting] = useState(false);

  const flushing = useRef(false);
  const flushAgain = useRef(false);
  const inFlight = useRef<number | null>(null);
  // Undone before the IndexedDB write finished: delete it as soon as it lands.
  const cancelledUnstored = useRef(new Set<string>());
  // Undone while a flush was already under way: skip it there.
  const cancelledSeqs = useRef(new Set<number>());
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryDelay = useRef(RETRY_MIN_MS);

  const server = useMemo<NightDrink[]>(
    () =>
      (nightQuery.data ?? []).map((d) => ({
        id: d.id,
        clientId: d.clientId,
        standards: d.standards,
        finishedAt: new Date(d.finishedAt),
        name: d.name,
        volumeMl: d.volumeMl,
        abv: d.abv,
        count: d.count,
      })),
    [nightQuery.data],
  );

  const drinks = useMemo(() => {
    const { pending, removals } = outboxView(queue);
    const shown = mergeNight(server, pending, removals);
    return waiting ? shown : shown.map((d) => (d.unsynced ? { ...d, unsynced: false } : d));
  }, [server, queue, waiting]);

  const dropFromQueue = useCallback(async (entry: StoredEntry) => {
    await removeOutbox(entry.seq);
    setQueue((q) => q.filter((x) => x.seq !== entry.seq));
  }, []);

  /** Sends one queued change. The server's reply goes straight into the cached night, so the drink doesn't blink out while the list refetches. */
  const send = useCallback(
    async (entry: OutboxEntry) => {
      const signal = typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(SEND_TIMEOUT_MS) : undefined;
      try {
        if (entry.op === "add") {
          const created = await utils.client.post.addDrink.mutate(entry.payload, { signal });
          utils.post.getNight.setData(undefined, (prev) =>
            prev && !prev.some((d) => d.id === created.id) ? [...prev, created] : prev,
          );
        } else {
          await utils.client.post.deleteDrink.mutate(entry.payload, { signal });
          dropFromNight(entry.payload);
        }
        return "done" as const;
      } catch (e) {
        const outcome = syncFailure(errorCode(e), entry.op);
        if (outcome === "done" && entry.op === "delete") dropFromNight(entry.payload);
        return outcome;
      }

      function dropFromNight(removal: Removal) {
        utils.post.getNight.setData(undefined, (prev) =>
          prev?.filter((d) => ("drinkId" in removal ? d.id !== removal.drinkId : d.clientId !== removal.clientId)),
        );
      }
    },
    [utils],
  );

  /** Sends the outbox, oldest first, one at a time. Stops at the first change that can't go yet. */
  const flush = useCallback(async () => {
    if (!userId) return;
    if (flushing.current) {
      flushAgain.current = true;
      return;
    }
    flushing.current = true;
    if (retryTimer.current) clearTimeout(retryTimer.current);
    retryTimer.current = null;
    let sent = 0;
    try {
      do {
        flushAgain.current = false;
        const entries = await listOutbox(userId);
        setQueue((q) => mergeQueue(entries, q));
        for (const entry of entries) {
          if (cancelledSeqs.current.delete(entry.seq)) continue;
          if (typeof navigator !== "undefined" && navigator.onLine === false) {
            setWaiting(true);
            return; // the `online` event starts the next flush
          }
          inFlight.current = entry.seq;
          const slow = setTimeout(() => setWaiting(true), SLOW_MS);
          const outcome = await send(entry);
          clearTimeout(slow);
          inFlight.current = null;

          if (outcome === "retry") {
            setWaiting(true);
            retryTimer.current = setTimeout(() => void flush(), retryDelay.current);
            retryDelay.current = Math.min(retryDelay.current * 2, RETRY_MAX_MS);
            return;
          }
          if (outcome === "signedOut") {
            setError(SIGNED_OUT);
            return;
          }
          if (outcome === "drop") {
            setError(
              entry.op === "add"
                ? "A drink saved on this phone couldn't be added to your account."
                : "A drink couldn't be removed from your account. Try removing it again.",
            );
          }
          await dropFromQueue(entry);
          sent++;
          retryDelay.current = RETRY_MIN_MS;
          setWaiting(false);
        }
      } while (flushAgain.current);
    } finally {
      flushing.current = false;
      inFlight.current = null;
      if (sent > 0) void Promise.all([utils.post.getNight.invalidate(), utils.post.recentDrinks.invalidate()]);
    }
  }, [userId, send, dropFromQueue, utils]);

  /** Writes a change to the outbox (showing it at once) and starts sending. */
  const enqueue = useCallback(
    (entry: OutboxEntry) => {
      const optimistic: StoredEntry = { ...entry, seq: -++optimisticSeq };
      setQueue((q) => [...q, optimistic]);
      void putOutbox(entry).then(async (stored) => {
        if (cancelledUnstored.current.delete(`${entry.op}|${entry.clientId}`)) {
          await removeOutbox(stored.seq);
          return;
        }
        // A flush may already have read it from disk; otherwise swap it in where it was.
        setQueue((q) =>
          q.some((x) => x.seq === stored.seq)
            ? q.filter((x) => x.seq !== optimistic.seq)
            : q.map((x) => (x.seq === optimistic.seq ? stored : x)),
        );
        void flush();
      });
    },
    [flush],
  );

  // The night saved on this phone is someone else's (another account signed in here): drop it.
  useEffect(() => {
    if (userId && !isRestoring && claimOfflineCache(userId)) void queryClient.resetQueries();
  }, [userId, isRestoring, queryClient]);

  // Send whatever this phone saved earlier (a reload, an app closed with no signal), and again
  // whenever signal or the app comes back.
  useEffect(() => {
    if (!userId) return;
    void flush();
    const onOnline = () => {
      retryDelay.current = RETRY_MIN_MS;
      void flush();
    };
    const onOffline = () => setWaiting(true);
    const onVisible = () => {
      if (document.visibilityState === "visible") void flush();
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [userId, flush]);

  /** Shows the drink at once and saves it on this phone, then to the account. Returns the drink as shown. */
  const add = useCallback(
    (drink: NewDrink): LoggedDrink => {
      const { name, volumeMl, abv, count, source, confidence, rawText } = drink.details ?? {};
      const payload: AddPayload = {
        clientId: crypto.randomUUID(),
        standards: drink.standards,
        finishedAt: drink.finishedAt.toISOString(),
        details: { name, volumeMl, abv, count, source, confidence, rawText },
      };
      setError(null);
      enqueue({ clientId: payload.clientId, op: "add", payload, createdAt: Date.now(), userId: userId ?? "" });
      return drinkFromPayload(payload, waiting);
    },
    [enqueue, userId, waiting],
  );

  /** Removes a drink, whether it's saved, still sending, or only on this phone. `id` may be its server or client id. */
  const remove = useCallback(
    (id: string) => {
      setError(null);
      const target = drinks.find((d) => d.id === id) ?? drinks.find((d) => d.clientId === id);
      const clientId = target?.clientId ?? null;
      const queuedAdd = clientId ? queue.find((e) => e.op === "add" && e.clientId === clientId) : undefined;

      if (queuedAdd && queuedAdd.seq !== inFlight.current) {
        // Never sent: forget it here, and nothing ever reaches the server.
        setQueue((q) => q.filter((x) => x !== queuedAdd));
        if (queuedAdd.seq < 0) {
          cancelledUnstored.current.add(`add|${queuedAdd.clientId}`);
        } else {
          cancelledSeqs.current.add(queuedAdd.seq);
          void removeOutbox(queuedAdd.seq);
        }
        return true;
      }
      // On the server already (its id isn't the client id): delete by server id.
      const isSaved = target && target.id !== target.clientId;
      const payload: Removal = isSaved ? { drinkId: target.id } : clientId ? { clientId } : { drinkId: id };
      enqueue({ clientId: clientId ?? crypto.randomUUID(), op: "delete", payload, createdAt: Date.now(), userId: userId ?? "" });
      return true;
    },
    [drinks, queue, enqueue, userId],
  );

  return {
    drinks,
    recents: recentsQuery.data ?? [],
    isLoading: nightQuery.isLoading,
    /** Changes saved on this phone that haven't reached the account yet. */
    unsyncedCount: waiting ? queue.filter((e) => e.op === "add").length : 0,
    error,
    add,
    remove,
  };
}
