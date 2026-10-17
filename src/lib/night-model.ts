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
}

/** A drink added on this device that the server hasn't confirmed (or that was undone mid-save). */
export interface PendingDrink {
  tempId: string;
  drink: NightDrink;
  /** The server's id once the save returns. */
  realId: string | null;
  /** Undone before the save finished: hide it, and delete the real one when it arrives. */
  cancelled: boolean;
}

/**
 * What to show: everything the server has, plus pending drinks that are neither undone nor already
 * in the server list. A confirmed drink is never shown twice, and an undone one never comes back.
 */
export function mergeNight(server: NightDrink[], pending: PendingDrink[]): NightDrink[] {
  const serverIds = new Set(server.map((d) => d.id));
  // Undone mid-save: hide the server copy too until its delete lands.
  const undone = new Set(pending.filter((p) => p.cancelled && p.realId).map((p) => p.realId));
  const extra = pending.filter((p) => !p.cancelled && !(p.realId && serverIds.has(p.realId))).map((p) => p.drink);
  return [...server.filter((d) => !undone.has(d.id)), ...extra];
}

/**
 * Drop confirmed entries the server list now covers. Cancelled entries are removed by their owner
 * once the delete has gone through, so they stay here (hiding the drink) until then.
 */
export function prunePending(server: NightDrink[], pending: PendingDrink[]): PendingDrink[] {
  const serverIds = new Set(server.map((d) => d.id));
  const next = pending.filter((p) => p.cancelled || !(p.realId && serverIds.has(p.realId)));
  return next.length === pending.length ? pending : next;
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

/** The drink "Add another" repeats (the latest), and up to `limit` other recents, without repeats. */
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
