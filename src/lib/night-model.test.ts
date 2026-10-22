import { describe, expect, it } from "vitest";

import {
  editChange,
  isDoubleTap,
  mergeNight,
  outboxView,
  planRemoval,
  pickRepeatAndRecents,
  prunePending,
  syncFailure,
  type NightDrink,
  type OutboxEntry,
  type PendingDrink,
} from "./night-model";

const drink = (id: string, name = "Schooner", standards = 1.6): NightDrink => ({
  id,
  standards,
  finishedAt: new Date(2026, 9, 17, 21, 0),
  name,
  volumeMl: 425,
  abv: 4.8,
  count: 1,
});
const pending = (tempId: string, realId: string | null = null, cancelled = false): PendingDrink => ({
  tempId,
  drink: drink(tempId),
  realId,
  cancelled,
});

describe("mergeNight", () => {
  it("shows a pending drink before the server has it", () => {
    expect(mergeNight([drink("a")], [pending("t1")]).map((d) => d.id)).toEqual(["a", "t1"]);
  });

  it("shows a saved drink once, not twice, after the refetch lands", () => {
    expect(mergeNight([drink("a"), drink("r1")], [pending("t1", "r1")]).map((d) => d.id)).toEqual(["a", "r1"]);
  });

  it("keeps showing a saved drink until the refetch includes it (no flicker)", () => {
    expect(mergeNight([drink("a")], [pending("t1", "r1")]).map((d) => d.id)).toEqual(["a", "t1"]);
  });

  it("never brings back a drink that was undone or removed", () => {
    // Saved, confirmed, pruned, then removed on the server: nothing pending is left to resurrect it.
    const server = [drink("a"), drink("r1")];
    const left = prunePending(server, [pending("t1", "r1")]);
    expect(left).toEqual([]);
    expect(mergeNight([drink("a")], left).map((d) => d.id)).toEqual(["a"]);
  });

  it("hides a drink undone while it was still saving", () => {
    expect(mergeNight([drink("a")], [pending("t1", null, true)]).map((d) => d.id)).toEqual(["a"]);
    // Saved before the undo landed: the server copy is hidden too until its delete goes through.
    expect(mergeNight([drink("a"), drink("r1")], [pending("t1", "r1", true)]).map((d) => d.id)).toEqual(["a"]);
  });
});

describe("offline adds (client ids)", () => {
  const withClient = (id: string, clientId: string): NightDrink => ({ ...drink(id), clientId });
  const add = (clientId: string, createdAt = 1): OutboxEntry => ({
    clientId,
    op: "add",
    payload: { clientId, standards: 1.6, finishedAt: new Date(2026, 9, 17, 21, 0).toISOString(), details: { name: "Schooner" } },
    createdAt,
    userId: "u1",
  });
  const del = (payload: { drinkId: string } | { clientId: string }, createdAt = 2): OutboxEntry => ({
    clientId: "drinkId" in payload ? `del-${payload.drinkId}` : payload.clientId,
    op: "delete",
    payload,
    createdAt,
    userId: "u1",
  });

  it("shows a queued drink, marked as only on this phone", () => {
    const { pending, removals } = outboxView([add("c1")]);
    const shown = mergeNight([drink("a")], pending, removals);
    expect(shown.map((d) => d.id)).toEqual(["a", "c1"]);
    expect(shown[1]).toMatchObject({ unsynced: true, clientId: "c1", name: "Schooner", standards: 1.6 });
  });

  it("shows a synced drink once when only the client id ties it to the queue (reply was lost)", () => {
    const { pending, removals } = outboxView([add("c1")]);
    const server = [drink("a"), withClient("r1", "c1")];
    expect(mergeNight(server, pending, removals).map((d) => d.id)).toEqual(["a", "r1"]);
    expect(prunePending(server, pending)).toEqual([]);
  });

  it("keeps a queued drink until the server list has it", () => {
    const { pending } = outboxView([add("c1")]);
    expect(prunePending([drink("a")], pending)).toBe(pending);
  });

  it("hides a drink whose removal is still queued, by server id or client id", () => {
    const server = [drink("a"), withClient("r1", "c1"), drink("b")];
    const { pending, removals } = outboxView([del({ drinkId: "b" }), del({ clientId: "c1" })]);
    expect(mergeNight(server, pending, removals).map((d) => d.id)).toEqual(["a"]);
  });

  it("hides a queued add that was undone while it was being sent", () => {
    const { pending, removals } = outboxView([add("c1"), del({ clientId: "c1" })]);
    expect(mergeNight([drink("a")], pending, removals).map((d) => d.id)).toEqual(["a"]);
    // The add landed before the delete: the server copy stays hidden too.
    expect(mergeNight([drink("a"), withClient("r1", "c1")], pending, removals).map((d) => d.id)).toEqual(["a"]);
  });

  it("counts every queued drink once, however many there are", () => {
    const { pending, removals } = outboxView([add("c1"), add("c2"), add("c3")]);
    const server = [withClient("r1", "c1")];
    expect(mergeNight(server, pending, removals).map((d) => d.id)).toEqual(["r1", "c2", "c3"]);
  });
});

describe("syncFailure", () => {
  it("retries when there was no reply or the server hiccupped", () => {
    expect(syncFailure(undefined, "add")).toBe("retry");
    expect(syncFailure("INTERNAL_SERVER_ERROR", "add")).toBe("retry");
    expect(syncFailure("TOO_MANY_REQUESTS", "delete")).toBe("retry");
  });
  it("stops for a sign-in, and treats an already-removed drink as removed", () => {
    expect(syncFailure("UNAUTHORIZED", "add")).toBe("signedOut");
    expect(syncFailure("NOT_FOUND", "delete")).toBe("done");
  });
  it("gives up on a change the server will never accept", () => {
    expect(syncFailure("BAD_REQUEST", "add")).toBe("drop");
    expect(syncFailure("CONFLICT", "add")).toBe("drop");
  });
});

describe("isDoubleTap", () => {
  it("swallows a second tap within 600 ms but allows a real second drink", () => {
    const last = { key: "Shot|1", at: 1000 };
    expect(isDoubleTap(last, "Shot|1", 1300)).toBe(true);
    expect(isDoubleTap(last, "Shot|1", 1700)).toBe(false);
    expect(isDoubleTap(last, "Wine|1.6", 1100)).toBe(false);
    expect(isDoubleTap(null, "Shot|1", 1000)).toBe(false);
  });
});

describe("pickRepeatAndRecents", () => {
  const r = (name: string, standards = 1) => ({ name, standards });
  it("repeats the latest drink and lists other distinct recents", () => {
    const out = pickRepeatAndRecents(r("Vodka soda"), [r("Vodka soda"), r("Red"), r("Red"), r("Cider"), r("Lager")], 2);
    expect(out.repeat?.name).toBe("Vodka soda");
    expect(out.others.map((o) => o.name)).toEqual(["Red", "Cider"]);
  });
  it("falls back to the most recent when nothing is logged tonight", () => {
    const out = pickRepeatAndRecents(null, [r("Red"), r("Cider")], 2);
    expect(out.repeat?.name).toBe("Red");
    expect(out.others.map((o) => o.name)).toEqual(["Cider"]);
  });
});

// The user's report (22 Oct): "I added that drink, edited it to be 3.5 hours ago and then the
// previous drink changed to be finished JUST now." An edit was remove + add, and remove forgot a
// queued add that had already reached the server, so the original stayed at "just now".
describe("editing a drink", () => {
  const at = (h: number, m: number) => new Date(2026, 9, 22, h, m);
  const P: NightDrink = { id: "s-p", clientId: "c-p", standards: 1, finishedAt: at(23, 11), name: "Vodka soda", volumeMl: 30, abv: 40, count: 1 };
  const X: NightDrink = { ...P, id: "s-x", clientId: "c-x", finishedAt: at(23, 17) }; // saved on the server...
  const addX: OutboxEntry = {
    clientId: "c-x",
    op: "add",
    payload: { clientId: "c-x", standards: 1, finishedAt: at(23, 17).toISOString(), details: { name: "Vodka soda" } },
    createdAt: 0,
    userId: "u",
  }; // ...but its reply was lost, so it's still queued
  const update = (finishedAt: Date, standards?: number): OutboxEntry => ({
    clientId: "e-1",
    op: "update",
    payload: { target: { clientId: "c-x" }, finishedAt: finishedAt.toISOString(), standards },
    createdAt: 0,
    userId: "u",
  });

  it("moves only the edited drink, keeping its identity; the previous drink keeps its time", () => {
    const { pending, removals, updates } = outboxView([addX, update(at(19, 47))]);
    const shown = mergeNight([P, X], pending, removals, updates); // the server still returns X as it was
    expect(shown).toHaveLength(2);
    expect(shown.find((d) => d.id === "s-p")!.finishedAt).toEqual(at(23, 11));
    expect(shown.find((d) => d.id === "s-x")!.finishedAt).toEqual(at(19, 47));
  });

  it("applies an edit to a drink that's still only on this phone", () => {
    const { pending, removals, updates } = outboxView([addX, update(at(19, 47), 2)]);
    const shown = mergeNight([P], pending, removals, updates);
    expect(shown.map((d) => [d.id, d.finishedAt.getTime(), d.standards])).toEqual([
      ["s-p", at(23, 11).getTime(), 1],
      ["c-x", at(19, 47).getTime(), 2],
    ]);
  });

  it("applies queued edits in order, so Undo puts the old values back", () => {
    const { pending, removals, updates } = outboxView([update(at(19, 47), 2), { ...update(at(23, 17), 1), clientId: "e-2" }]);
    const shown = mergeNight([P, X], pending, removals, updates);
    expect(shown.find((d) => d.id === "s-x")).toMatchObject({ finishedAt: at(23, 17), standards: 1 });
  });

  it("an edit for a drink that's gone is done, not an error", () => {
    expect(syncFailure("NOT_FOUND", "update")).toBe("done");
  });

  it("sends only what changed, and never moves a time that wasn't touched", () => {
    const now = at(23, 30);
    expect(editChange(X, { standards: 1, minutesAgo: 13 }, false, now)).toBeNull();
    expect(editChange(X, { standards: 2, minutesAgo: 15 }, false, now)).toEqual({ standards: 2 });
    expect(editChange(X, { standards: 1, minutesAgo: 210 }, true, now)).toEqual({ finishedAt: at(20, 0) });
  });
});

describe("planRemoval", () => {
  const X: NightDrink = { ...drink("s-x"), clientId: "c-x" };

  it("deletes on the server even when the add is still queued (its reply may have been lost)", () => {
    expect(planRemoval(X, X.id, { seq: 5 }, null)).toEqual({ forgetQueued: true, send: { clientId: "c-x" } });
  });

  it("doesn't pull an add out from under its own send", () => {
    expect(planRemoval(X, X.id, { seq: 5 }, 5)).toEqual({ forgetQueued: false, send: { clientId: "c-x" } });
  });

  it("forgets an add that never left the phone without a network call", () => {
    expect(planRemoval(X, X.id, { seq: -1 }, null)).toEqual({ forgetQueued: true, send: null });
  });

  it("deletes a saved drink by its server id", () => {
    expect(planRemoval(X, X.id, undefined, null)).toEqual({ forgetQueued: false, send: { drinkId: "s-x" } });
    expect(planRemoval(drink("old"), "old", undefined, null)).toEqual({ forgetQueued: false, send: { drinkId: "old" } });
  });
});
