import { describe, expect, it } from "vitest";

import {
  isDoubleTap,
  mergeNight,
  outboxView,
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
