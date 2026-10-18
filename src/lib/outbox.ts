import type { OutboxEntry } from "./night-model";

/**
 * Drinks added (and removals made) with no signal wait here until the server confirms them.
 * IndexedDB, so the queue survives a reload, a closed app or a flat battery. Where IndexedDB isn't
 * available (some private windows) it falls back to memory: the night still works, it just won't
 * survive a reload. Browser only.
 */

export type StoredEntry = OutboxEntry & {
  seq: number;
  /** The server refused this add: it stays here (and in the estimate) but isn't sent again. */
  stuck?: boolean;
};

const DB_NAME = "baculator";
const STORE = "outbox";

let dbPromise: Promise<IDBDatabase | null> | null = null;
const memory = new Map<number, StoredEntry>();
let memorySeq = 0;

function openDb(): Promise<IDBDatabase | null> {
  dbPromise ??= new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const store = req.result.createObjectStore(STORE, { keyPath: "seq", autoIncrement: true });
        store.createIndex("userId", "userId");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function run<T>(db: IDBDatabase, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

/** This person's queued changes, oldest first. */
export async function listOutbox(userId: string): Promise<StoredEntry[]> {
  const db = await openDb();
  const stored = db
    ? await run(db, "readonly", (s) => s.index("userId").getAll(userId) as IDBRequest<StoredEntry[]>).catch(() => [])
    : [];
  const all = [...stored, ...memory.values()];
  return all.filter((e) => e.userId === userId).sort((a, b) => a.seq - b.seq);
}

/** Queues a change; resolves once it's on disk. */
export async function putOutbox(entry: OutboxEntry): Promise<StoredEntry> {
  const db = await openDb();
  if (db) {
    try {
      const seq = await run<IDBValidKey>(db, "readwrite", (s) => s.add(entry));
      return { ...entry, seq: seq as number };
    } catch {
      // Quota or a broken store: keep it in memory rather than lose the drink.
    }
  }
  const stored = { ...entry, seq: 1e12 + ++memorySeq };
  memory.set(stored.seq, stored);
  return stored;
}

export async function removeOutbox(seq: number): Promise<void> {
  if (memory.delete(seq)) return;
  const db = await openDb();
  if (db) await run(db, "readwrite", (s) => s.delete(seq)).catch(() => undefined);
}

/** Keeps a refused add on this phone instead of deleting it. Resolves with the updated entry. */
export async function markOutboxStuck(entry: StoredEntry): Promise<StoredEntry> {
  const stuck: StoredEntry = { ...entry, stuck: true };
  if (memory.has(entry.seq)) {
    memory.set(entry.seq, stuck);
    return stuck;
  }
  const db = await openDb();
  if (db) await run(db, "readwrite", (s) => s.put(stuck)).catch(() => undefined);
  return stuck;
}

/** How many drinks this person added on this phone that their account doesn't have yet. */
export async function countQueuedAdds(userId: string): Promise<number> {
  return (await listOutbox(userId)).filter((e) => e.op === "add").length;
}

/** Forget everything this person queued on this phone (account deleted). */
export async function clearOutbox(userId: string): Promise<void> {
  for (const e of await listOutbox(userId)) await removeOutbox(e.seq);
}
