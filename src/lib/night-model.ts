/**
 * Pure rules for the night screen's drink list, shared by the web app and (later) the Swift app.
 * No React, no network: given what the server has and what this device has added but not yet
 * confirmed, decide what the person sees.
 */

export interface NightDrink {
  id: string;
  standards: number;
  finishedAt: Date;
  name: string | null;
  volumeMl: number | null;
  abv: number | null;
  count: number | null;
  /** The id this device gave the drink when it was added (null for drinks from before offline adds). */
  clientId?: string | null;
  /** Saved on this device only so far: it syncs when there's signal. */
  unsynced?: boolean;
}

/** A drink added on this device that the server hasn't confirmed (or that was undone mid-save). */
export interface PendingDrink {
  tempId: string;
  /** Matches the server copy even when the save's reply was lost (offline, app closed). */
  clientId?: string | null;
  drink: NightDrink;
  /** The server's id once the save returns. */
  realId: string | null;
  /** Undone before the save finished: hide it, and delete the real one when it arrives. */
  cancelled: boolean;
}

/** A removal waiting to reach the server, by server id or by the id this device gave the drink. */
export type Removal = { drinkId: string } | { clientId: string };

/** A change to a drink waiting to reach the server: only the fields that changed. */
export interface UpdatePayload {
  target: Removal;
  standards?: number;
  /** ISO time */
  finishedAt?: string;
}

const matches = (target: Removal, d: Pick<NightDrink, "id" | "clientId">) =>
  "drinkId" in target ? d.id === target.drinkId : d.clientId === target.clientId;

/**
 * What to show: everything the server has, plus pending drinks that are neither undone nor already
 * in the server list, minus removals still on their way, with queued edits applied in order. A
 * confirmed drink is never shown twice (matched by server id or client id), an undone one never
 * comes back, and an edited one keeps its id and place.
 */
export function mergeNight(
  server: NightDrink[],
  pending: PendingDrink[],
  removals: Removal[] = [],
  updates: UpdatePayload[] = [],
): NightDrink[] {
  const goneIds = new Set<string>();
  const goneClientIds = new Set<string>();
  for (const r of removals) {
    if ("drinkId" in r) goneIds.add(r.drinkId);
    else goneClientIds.add(r.clientId);
  }
  // Undone mid-save: hide the server copy too until its delete lands.
  for (const p of pending) {
    if (!p.cancelled) continue;
    if (p.realId) goneIds.add(p.realId);
    if (p.clientId) goneClientIds.add(p.clientId);
  }
  const isGone = (id: string | null | undefined, clientId: string | null | undefined) =>
    (!!id && goneIds.has(id)) || (!!clientId && goneClientIds.has(clientId));

  const covered = coveredBy(server);
  const extra = pending.filter((p) => !p.cancelled && !covered(p) && !isGone(p.realId, p.clientId)).map((p) => p.drink);
  const shown = [...server.filter((d) => !isGone(d.id, d.clientId)), ...extra];
  if (!updates.length) return shown;
  return shown.map((d) =>
    updates.reduce<NightDrink>(
      (acc, u) =>
        matches(u.target, acc)
          ? {
              ...acc,
              ...(u.standards !== undefined && { standards: u.standards }),
              ...(u.finishedAt !== undefined && { finishedAt: new Date(u.finishedAt) }),
            }
          : acc,
      d,
    ),
  );
}

/** Whether the server list already has this pending drink, by server id or client id. */
function coveredBy(server: NightDrink[]) {
  const ids = new Set(server.map((d) => d.id));
  const clientIds = new Set(server.flatMap((d) => (d.clientId ? [d.clientId] : [])));
  return (p: PendingDrink) => (!!p.realId && ids.has(p.realId)) || (!!p.clientId && clientIds.has(p.clientId));
}

/**
 * Drop confirmed entries the server list now covers. Cancelled entries are removed by their owner
 * once the delete has gone through, so they stay here (hiding the drink) until then.
 */
export function prunePending(server: NightDrink[], pending: PendingDrink[]): PendingDrink[] {
  const covered = coveredBy(server);
  const next = pending.filter((p) => p.cancelled || !covered(p));
  return next.length === pending.length ? pending : next;
}

/** What an add sends to the server; also what the outbox keeps until it's sent. */
export interface AddPayload {
  standards: number;
  /** ISO time */
  finishedAt: string;
  clientId: string;
  details?: {
    name?: string;
    volumeMl?: number;
    abv?: number;
    count?: number;
    source?: "recent" | "cache" | "catalog" | "ai" | "manual" | "edited";
    confidence?: number;
    rawText?: string;
  };
}

/**
 * One change saved on this device and not yet confirmed by the server, oldest first. Kept in
 * IndexedDB (lib/outbox) so it survives a reload or a closed app with no signal.
 */
export type OutboxEntry =
  | { clientId: string; op: "add"; payload: AddPayload; createdAt: number; userId: string }
  | { clientId: string; op: "delete"; payload: Removal; createdAt: number; userId: string }
  /** clientId here is the entry's own id, not the drink's: a drink can have several edits queued. */
  | { clientId: string; op: "update"; payload: UpdatePayload; createdAt: number; userId: string };

/** The drink as shown while it's only on this device. */
export function drinkFromPayload(payload: AddPayload, unsynced: boolean): NightDrink {
  return {
    id: payload.clientId,
    clientId: payload.clientId,
    standards: payload.standards,
    finishedAt: new Date(payload.finishedAt),
    name: payload.details?.name ?? null,
    volumeMl: payload.details?.volumeMl ?? null,
    abv: payload.details?.abv ?? null,
    count: payload.details?.count ?? null,
    unsynced,
  };
}

/** The queue as the screen sees it: drinks waiting to be added, removals waiting to land, and edits in order. */
export function outboxView(entries: OutboxEntry[]): { pending: PendingDrink[]; removals: Removal[]; updates: UpdatePayload[] } {
  const pending: PendingDrink[] = [];
  const removals: Removal[] = [];
  const updates: UpdatePayload[] = [];
  for (const e of entries) {
    if (e.op === "add") {
      pending.push({ tempId: e.clientId, clientId: e.clientId, drink: drinkFromPayload(e.payload, true), realId: null, cancelled: false });
    } else if (e.op === "delete") {
      removals.push(e.payload);
    } else {
      updates.push(e.payload);
    }
  }
  return { pending, removals, updates };
}

/** Which id an edit or a removal goes by: the phone's id when it has one (it works before the add has synced). */
export const targetOf = (drink: Pick<NightDrink, "id" | "clientId">): Removal =>
  drink.clientId ? { clientId: drink.clientId } : { drinkId: drink.id };

/**
 * How to remove a drink. An add still in the outbox may already be on the server (its reply was
 * lost or slow, or it landed just before the queue was trimmed), so it's forgotten here and a
 * delete is sent too; the server answers NOT_FOUND if it never got it, which counts as done. Only
 * an add that was never written to disk (a negative seq) can't have been sent.
 */
export function planRemoval(
  target: NightDrink | undefined,
  id: string,
  queuedAdd: { seq: number } | undefined,
  inFlightSeq: number | null,
): { forgetQueued: boolean; send: Removal | null } {
  const clientId = target?.clientId ?? null;
  if (queuedAdd && queuedAdd.seq < 0) return { forgetQueued: true, send: null };
  if (queuedAdd && clientId) return { forgetQueued: queuedAdd.seq !== inFlightSeq, send: { clientId } };
  if (target && target.id !== target.clientId) return { forgetQueued: false, send: { drinkId: target.id } };
  return { forgetQueued: false, send: clientId ? { clientId } : { drinkId: id } };
}

/**
 * What an edit changes, or null if nothing did. The time moves only if the person touched the time
 * control: opening and saving never nudges a drink to the nearest step or to a later "now".
 */
export function editChange(
  drink: Pick<NightDrink, "standards" | "finishedAt">,
  form: { standards: number; minutesAgo: number },
  timeTouched: boolean,
  now: Date,
): { standards?: number; finishedAt?: Date } | null {
  const change: { standards?: number; finishedAt?: Date } = {};
  if (Math.abs(form.standards - drink.standards) > 1e-9) change.standards = form.standards;
  if (timeTouched) {
    const finishedAt = new Date(now.getTime() - form.minutesAgo * 60_000);
    if (finishedAt.getTime() !== drink.finishedAt.getTime()) change.finishedAt = finishedAt;
  }
  return Object.keys(change).length ? change : null;
}

/**
 * What to do when sending a queued change fails, from the tRPC error code (undefined = no reply:
 * offline, dropped connection). "retry" keeps it for the next flush; "drop" gives up on it because
 * sending it again can never work; "signedOut" keeps it and stops until the person signs back in.
 */
export function syncFailure(code: string | undefined, op: OutboxEntry["op"]): "retry" | "drop" | "done" | "signedOut" {
  if (code === "UNAUTHORIZED") return "signedOut";
  // Already gone (Undo on two phones, a double tap): that's what was wanted.
  // Edited after it was removed: nothing left to change.
  if (code === "NOT_FOUND" && (op === "delete" || op === "update")) return "done";
  // Terms not agreed yet (the server's consent gate): keep it, it goes once they agree.
  if (code === "PRECONDITION_FAILED") return "retry";
  if (code === "BAD_REQUEST" || code === "CONFLICT" || code === "FORBIDDEN" || code === "NOT_FOUND" || code === "PARSE_ERROR") return "drop";
  return "retry";
}

/** How long the estimate looks back, and how long a drink the server refused is kept on this device. */
export const NIGHT_WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * An add the server refused stays on this device ("stuck"), still counted in the estimate and
 * marked as not saved to the account, instead of being deleted. Once it's older than the night
 * window it no longer affects anything and can go.
 */
export const stuckExpired = (entry: OutboxEntry, now: number) =>
  entry.op === "add"
    ? Date.parse(entry.payload.finishedAt) < now - NIGHT_WINDOW_MS
    : entry.createdAt < now - NIGHT_WINDOW_MS;

/**
 * Hides "saved on this phone" while sends are going through, except on drinks the server refused:
 * those stay marked, because they really are only on this phone.
 */
export function markUnsynced(shown: NightDrink[], waiting: boolean, stuckClientIds: ReadonlySet<string>): NightDrink[] {
  if (waiting) return shown;
  return shown.map((d) => (d.unsynced && !(d.clientId && stuckClientIds.has(d.clientId)) ? { ...d, unsynced: false } : d));
}

/** Within this much, the phone's clock is taken as right (the send itself takes a moment). */
const CLOCK_SLACK_MS = 60 * 1000;

/**
 * When a drink sent from this device happened, on the server's clock. `clientNow` is the phone's
 * clock at the moment it sent: if the phone is fast or slow, the drink time moves by the same
 * amount. A time still in the future becomes now. Old drinks (a queue held offline for days) are
 * kept at their real time rather than refused, so nothing logged is ever thrown away.
 */
export function serverDrinkTime(finishedAt: string, clientNow: string | undefined, serverNow: number): Date {
  let t = Date.parse(finishedAt);
  const phoneNow = clientNow ? Date.parse(clientNow) : NaN;
  if (Number.isFinite(phoneNow)) {
    const skew = serverNow - phoneNow;
    if (Math.abs(skew) > CLOCK_SLACK_MS) t += skew;
  }
  return new Date(Math.min(t, serverNow));
}

/** Same drink, same size: the identity used for repeat buttons and the double-tap guard. */
export const drinkKey = (d: { name?: string | null; standards: number }) => `${d.name ?? ""}|${d.standards}`;

/**
 * A second tap on the same button inside this window is a drunk double-tap, not a second drink.
 * Short on purpose: two drinks ordered together are two taps a second or more apart.
 */
export const DOUBLE_TAP_MS = 600;

export function isDoubleTap(last: { key: string; at: number } | null, key: string, now: number): boolean {
  return last !== null && last.key === key && now - last.at < DOUBLE_TAP_MS;
}

/** The latest drink (first in the add sheet's recents), and up to `limit` other recents, without repeats. */
export function pickRepeatAndRecents<T extends { name: string | null; standards: number }>(
  latest: T | null,
  recents: T[],
  limit: number,
): { repeat: T | null; others: T[] } {
  const repeat = latest ?? recents[0] ?? null;
  const seen = new Set(repeat ? [drinkKey(repeat)] : []);
  const others: T[] = [];
  for (const r of recents) {
    const k = drinkKey(r);
    if (seen.has(k)) continue;
    seen.add(k);
    others.push(r);
    if (others.length >= limit) break;
  }
  return { repeat, others };
}
