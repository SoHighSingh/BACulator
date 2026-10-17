import { describe, expect, it } from "vitest";

import { isDoubleTap, mergeNight, pickRepeatAndRecents, prunePending, type NightDrink, type PendingDrink } from "./night-model";

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
