# 02 — Add flow, the edit bug, and slider jank

Audit of adding, editing and removing drinks (22 Oct 2026). Read-only: no source changed. Scripts used are in `.shots/addflow/` (`repro-edit.mjs`, `repro-edit2.mjs`, `measure-slider.mjs`, `save-unchanged.mjs`, `addsheet-fold.mjs`); run with `node .shots/addflow/<file>` against the dev server.

---

## Bug: edit changes another drink's time

### What the user saw
"I added that drink, edited it to be 3.5 hours ago and then the previous drink changed to be finished JUST now."

### Repro
1. `/dev/night` (sample night: Vodka soda 6 min ago, Glass of red, two schooners).
2. **Add a drink** → tap the top Recent row (Vodka soda; it is the last drink, so it is the same name and size as the previous drink).
3. Your tab → tap the new top row → Edit → set the slider to 3 h 30 min → **Save**.
4. Read Your tab.

**On `/dev/night` it does not reproduce** (`repro-edit.mjs`): the edited drink moves to 7:45 pm and every other row keeps its time. DevNight edits in place by id (`DevNight.tsx:148`, `p.map(x => x.id === d.id ? {...x, ...change} : x)`), which is correct. It is also **not the production code path**: DevNight never touches `useNight` or the outbox, so `/dev/night` can't show this bug at all.

**The production path** (`NightScreen.saveEdit`, `NightScreen.tsx:115-131`) doesn't edit anything. It deletes the drink and adds a new copy: `night.remove(drink.id)` and then `night.add({...})`, which gives a new `clientId`, a new server id and `source: "edited"`. Each half goes through the outbox separately, so the result depends on what `remove()` thinks happened to the original add. That's where it breaks.

### Root cause (production): `remove()` assumes a queued add never reached the server
`src/hooks/useNight.ts:277-289`:

```ts
const queuedAdd = clientId ? queue.find((e) => e.op === "add" && e.clientId === clientId) : undefined;
if (queuedAdd && queuedAdd.seq !== inFlight.current) {
  // Never sent: forget it here, and nothing ever reaches the server.
  setQueue((q) => q.filter((x) => x !== queuedAdd));
  ...
  return true;            // <- no delete is ever sent
}
```

"Still in the outbox and not in flight" does **not** mean "never sent". An add stays queued after the server has saved it in at least these cases:

1. **The reply was lost or slow.** `send()` aborts after `SEND_TIMEOUT_MS` (15 s, line 111). Any network error or 5xx after the row was written returns `"retry"` (`syncFailure`, `night-model.ts:138-146`), and `flush` keeps the entry (lines 172-176). The server has the drink; the phone still has the add queued and shows "Saved on this phone". A bar's lie-fi or a cold Worker (Prisma WASM + D1 on the first request) is exactly when this happens.
2. **The window between `send()` resolving and the entry leaving the queue.** `inFlight.current = null` runs at line 170, before `await dropFromQueue(entry)` at line 190 (an IndexedDB delete, then `setQueue`). A tap in that window takes the "never sent" branch.

In both cases `remove()` only forgets the local entry. The server copy stays: it's already in the `getNight` cache, or it arrives on the next refetch (line 199, focus, `online`). Nothing is left in the queue that will ever delete it. Then `saveEdit` adds the new copy at 3.5 h ago. Your tab ends up showing **both**: the new copy at 7:45 pm, and the original still at the time it was added, "just now".

The repeat drink came from the Recents row, which is the previous drink by design (`pickRepeatAndRecents`), so the leftover has the same name and size as that previous drink. On screen that reads as "the previous drink changed to just now", which is what the user reported.

Two lesser paths make the same picture briefly:
- **A stale refetch brings the old copy back.** `dropFromNight` (useNight.ts:130-134) edits the cache, but a `getNight` fetch that started before the delete landed (one invalidated by the previous flush's `finally`, line 199, or by `refetchOnWindowFocus`) can resolve afterwards with the old row. Its removal has already left the queue, so nothing hides it until the next refetch. There's no `cancelQueries` before the optimistic `setData`.
- **Undo after an edit deletes the drink.** `saveEdit` sets the notice to `{kind: "added", drink: <new copy>}` (line 130), and Undo then calls `night.remove(newCopy.id)` (line 139). The drink disappears instead of going back to its old time. DevNight has the same effect for a different reason: it keeps the pre-edit "Added" notice, so Undo removes the edited drink by id.

I couldn't run the signed-in path here (there's no dev sign-in and no DOM test setup). The repro above is the code path, not a captured production run. Confirm it on the phone that saw it: DevTools → Application → IndexedDB `baculator/outbox` should still hold an `add` whose `clientId` matches a server row.

### Related bug found while reproducing: Save moves a drink you didn't move
`EditDrinkSheet.tsx:32` opens the sheet with `minutesAgoScale.snap(actual)`, so the slider shows the nearest rung, not the drink's time. `onSave` always rebuilds `finishedAt` from that snapped value plus `now`, and `saveEdit`'s "unchanged" check (`NightScreen.tsx:117`) compares against the original time, so the two never match. Effects:
- Change only the amount and the time shifts too. `save-unchanged.mjs`: a drink at 9:46 pm opened as "9:41 pm · 1 h 40 min ago" and saved as 9:41 pm.
- In production `now` comes from `useMinuteClock`, which ticks every 30 s, so up to 30 s of drift is added on top.
- A drink older than 12 h (the window is 48 h) snaps to 12 h and is moved forward on any save.
- Every such save is a full delete+add, so it runs through the bug above.

### The fix
**Proper fix: make an edit an edit, not a replace.** Add a third outbox op, `update`:

1. `night-model.ts`: `OutboxEntry` gains `{ op: "update"; clientId; payload: { target: Removal /* {drinkId}|{clientId} */; standards?: number; finishedAt?: string } }`. `outboxView` returns `updates`, and `mergeNight(server, pending, removals, updates)` applies them over server and pending drinks matched by id or clientId. The drink keeps its identity, its row key, its name and its place in the order.
2. `post.ts` `updateDrink` (lines 260-275): accept `z.union([{drinkId}, {clientId}])` like `deleteDrink`, and make both fields optional so only the changed one is sent. It is unused today. Its `drinkTime` refine rejects anything older than 48 h. Keep that, but map `BAD_REQUEST` on an update to "keep the local value and say so", never silent loss.
3. `useNight.update(id, change)`: always enqueue an `update` after whatever add is queued, in order. **Don't** rewrite the queued add's payload in place: if that add already reached the server, `addDrink` dedupes on `clientId` and returns the old row (post.ts:238-240), which is the same bug class again.
4. `NightScreen.saveEdit` calls `night.update` instead of remove+add. The notice becomes `{kind: "edited", before, after}`, and Undo enqueues an update back to `before`.
5. `EditDrinkSheet`: hold the drink's exact `finishedAt` and only replace it when the person touched the time control (`timeTouched`). Send only the changed fields.

**Hotfix (if the update op waits): stop assuming "queued means never sent".** In `remove()`, an add that is on disk (`seq > 0`) may have been sent, so forget it locally **and** enqueue `{op: "delete", payload: {clientId}}`. A delete for a drink the server never got comes back `NOT_FOUND`, which `syncFailure` already treats as `"done"` for deletes, so it's harmless. Only an optimistic entry (`seq < 0`, never written, never sent) can be forgotten silently. Move the decision into a pure function so it can be tested:

```ts
// src/lib/night-model.ts
export function planRemoval(
  target: NightDrink | undefined,
  id: string,
  queuedAdd: { seq: number } | undefined,
  inFlightSeq: number | null,
): { forgetQueued: boolean; send: Removal | null } {
  const clientId = target?.clientId ?? null;
  if (queuedAdd && queuedAdd.seq < 0) return { forgetQueued: true, send: null };       // never left this phone
  if (queuedAdd && clientId) return { forgetQueued: queuedAdd.seq !== inFlightSeq, send: { clientId } }; // may be on the server
  if (target && target.id !== target.clientId) return { forgetQueued: false, send: { drinkId: target.id } };
  return { forgetQueued: false, send: clientId ? { clientId } : { drinkId: id } };
}
```

Also `await utils.post.getNight.cancel()` before each `setData` in `send()`, so a refetch that was already in flight can't bring back a removed drink.

### Regression tests (vitest, `src/lib/night-model.test.ts`)

```ts
describe("editing a drink's time", () => {
  const at = (h: number, m: number) => new Date(2026, 9, 22, h, m);
  const P = { id: "s-p", clientId: "c-p", standards: 1, finishedAt: at(23, 11), name: "Vodka soda", volumeMl: 30, abv: 40, count: 1 };
  const X = { ...P, id: "s-x", clientId: "c-x", finishedAt: at(23, 17) }; // saved on the server...
  const queuedX = { seq: 5 };                                             // ...but its reply was lost: still queued

  it("deletes the original on the server even when its add is still queued", () => {
    expect(planRemoval(X, X.id, queuedX, null)).toEqual({ forgetQueued: true, send: { clientId: "c-x" } });
  });

  it("forgets an add that never left the phone without a network call", () => {
    expect(planRemoval(X, X.id, { seq: -1 }, null)).toEqual({ forgetQueued: true, send: null });
  });

  it("moves only the edited drink; the previous drink keeps its time", () => {
    const entries: OutboxEntry[] = [
      { clientId: "c-x", op: "delete", payload: { clientId: "c-x" }, createdAt: 0, userId: "u" },
      { clientId: "c-x2", op: "add", payload: { clientId: "c-x2", standards: 1, finishedAt: at(19, 47).toISOString(), details: { name: "Vodka soda" } }, createdAt: 0, userId: "u" },
    ];
    const { pending, removals } = outboxView(entries);
    const shown = mergeNight([P, X], pending, removals);   // the server still returns X
    expect(shown.map((d) => d.finishedAt.getTime()).sort()).toEqual([at(19, 47), at(23, 11)].map((d) => d.getTime()));
  });
});
```

With the update op, add one more: `mergeNight([P, X], [], [], [{ target: { clientId: "c-x" }, finishedAt: <7:47> }])` gives exactly two drinks, P at 11:11 pm and X at 7:47 pm with the same id `s-x`. For the snapping bug, a pure `editChange(drink, form, touched)` test: an untouched time returns no `finishedAt`.

**DevNight:** give it a fake transport for `useNight` (an in-memory "server" with configurable delay and a lost-reply switch), so `/dev/night` runs the real outbox. Today it can't catch any bug in this path.

---

## Slider jank: why the time slider jumps

Measured on the Edit sheet (`measure-slider.mjs`, real Chrome, 1 px drag steps):

| Viewport | `<input>` width | Usable track (minus 32 px thumb) | Rungs | px per rung |
|---|---|---|---|---|
| 375 | 199 px | 167 px | 60 | **2.8** |
| 320 | 144 px | 112 px | 60 | **1.9** |

Each 2–3 px of finger travel changes the value: 1 min near now, then 5, 10, 15 and **30 min** at the far end. 3 h 30 is one 2.8 px stop: a drag that read 3 h 15 went straight to 3 h 45 (`repro-edit2.mjs`). A tap on the track at one third jumped to 4 h 30.

Causes, in order of impact:
1. **A discrete rung index on a native range.** `TimeControl.tsx:117-125` sets `min=0 max=60 step=1` and `value = LAST - indexOf(minutesAgo)`. The thumb can only sit on 61 positions, so it moves in 2–3 px hops. A finger's normal 2–4 px wobble on release flips the value by up to 30 min. The value is snapped on every move, not on release.
2. **A kinked, piecewise ladder** (`log-scale.ts:78-84`: 1/5/10/15/30-minute segments). The value per pixel jumps ×5, ×2, ×1.5, ×2 at 15 min, 1 h, 3 h and 6 h, so the same thumb travel feels slow, then suddenly fast. That is the "jumps all over the place".
3. **A narrow track.** The 48 px −/+ keys sit on either side of the track inside the sheet's padding (lines 106-157), leaving 167 px of a 375 px phone.
4. **`touch-action: pan-y`** on `.time-range` (`globals.css:577`) inside a scrollable sheet. A drag that starts with any vertical motion goes to the sheet's scroll, and the thumb stalls or stops mid-drag.
5. **A native tap-to-jump.** A stray touch on the track teleports the value with no way back except dragging.
6. **Live read-out churn.** `aria-live="polite"` on the read-out (line 102) announces every rung during a drag. The clock part moves with the 30 s `now` tick while the "x min ago" part stays put. `now` doesn't move the thumb (the state is minutesAgo), but the read-out flickers.
7. **The amount has no slider at all.** Edit is a −/+ stepper on `standardsScale`: 1 → 3.5 std is 13 taps, and nothing can be typed.

### A smooth design
- **A continuous thumb.** `<input type="range" min=0 max=1000 step=1>` (or a custom `role="slider"` with pointer capture) maps a position `t ∈ [0,1]` through an eased function. The thumb follows the finger at sub-pixel resolution.
- **An eased mapping, a smooth curve rather than a ladder:**
  - Time, now → 12 h: `minutes(t) = 720 · (e^{kt} − 1)/(e^k − 1)` with k = 3, inverse `t(m) = ln(1 + m(e^k − 1)/720)/k`. That's about 0.7 min per px near now and about 14 min per px at 12 h on a 311 px track. Midpoint ≈ 2 h 10; quarter ≈ 42 min.
  - Amount, 0.1 → 10 region std: `v(t) = 0.1 + 9.9 · (e^{kt} − 1)/(e^k − 1)` with k = 2.3. Midpoint ≈ 2.5 std. Above 10, type it.
- **Rounding only for display while dragging, snapping on release.** During the drag the read-out shows the rounded value (time: 1 min under 1 h, 5 min after; amount: 0.1 under 3, 0.5 after) but the thumb stays where the finger is. Snap to the rounded value on `pointerup` / `change` / `keyup`. The stored value is always the snapped one.
- **A full-width track.** Move −/+ out from beside the track to beside the big read-out. At 375 the track becomes about 311 px (343 minus the thumb).
- **`touch-action: none` on the slider row** (a 48 px tall hit area), so the sheet can't steal the drag. Ignore track taps: drag from the thumb only, with a 56 px invisible hit zone. Keyboard and the −/+ keys still work.
- **Keyboard:** ←/→ one display step (1 min / 0.1 std), PageUp/PageDown ±30 min / ±1 std, Home/End. `aria-valuetext` "9:40 pm, 1 hour 20 minutes ago"; announce on release only.
- **A live read-out** above the track, 22 px: "9:40 pm · 1 h 20 min ago". Compute the clock from the snapped minutes and a `now` frozen when the sheet opened, so it doesn't drift while held.
- `log-scale.ts` stays for the −/+ steps only, or is replaced by `easedScale({ max, k, round })` with `toT`, `fromT` and `round`, unit-tested for monotonicity and round-trips.

---

## New add flow (free tier): spec

### Why
Today the time is hidden. Recents and the catalog's `+` log at now in one tap. The only time control is behind tapping a catalog row, where "When you finished it" sits at y = 698 of 812, under the sticky Add key (`addsheet-fold.mjs`). Recents have no time path at all. Hence "add, then edit to fix the time".

### Shape: one sheet, two steps, then Confirm
Opened by the dock's **Add a drink** key. A step marker sits at the top ("1 How much · 2 When", 18 px, the current step bold). A back chevron (48 px) on step 2.

**Step 1 — How much**
- A big tappable number, centred: "1.5" (56 px / 500) with "standard drinks" under it (18 px `ink-2`). Tapping it turns it into an `<input inputMode="decimal" enterKeyHint="next">` with the value selected. It reads and writes the region's standard (AU 10 g, US 14 g via `region.ts`), accepts "," or "." as the decimal mark, clamps to 0.1–50 (the server allows 200; above 50 needs a second confirm line), and never rounds a drink down (ceil to 0.1).
- −/+ keys (56 px) either side of the number, stepping 0.1 under 2 and 0.5 above.
- A full-width eased slider (0.1–10), continuous, snapping on release, as above.
- **Recents as presets** (up to 4, chips or rows, min 56 px). Each shows a name and "1.6 std". Tapping one sets the amount and the name and moves on to step 2 (or adds at once; see the tap counts). "Same again" is the first.
- Primary key (64 px, white): **Next: when**.
- Secondary text key: "Pick from the drink list". It opens the catalog (sizes) as a sub-view, which computes the standards and the name and comes back to step 1 filled in.
- The first open of a night defaults to the last drink's amount, else 1.0.

**Step 2 — When**
- Read-out: "9:40 pm · 1 h 20 min ago" (22 px). "Now" when 0.
- Chips (48 px): **Now · 15 min · 30 min · 1 h · 2 h**, one row, wrapping.
- A full-width eased slider, now → 12 h, continuous, snapping on release, with now on the right as today.
- −/+ keys beside the read-out ("5 minutes earlier" / "later").
- A summary line: "1.5 std · Vodka soda".
- Primary key: **Add · 1.5 std** (Confirm). It never times out and never auto-confirms.

**After Confirm:** the sheet closes, the dock shows "Added: 1.5 std at 9:40 pm [Undo]" for `UNDO_WINDOW_MS` (2 min), and the phone buzzes. Undo removes it. Nothing asks "are you sure?".

### Tap counts
| Job | Today | Proposed |
|---|---|---|
| Repeat the last drink, now | 2 (Add a drink → Recent row) | **2** (Add a drink → the preset's inline "Add now") |
| Repeat, earlier | impossible; add, then edit (≥ 5 + drag) | **3 + time** (Add a drink → preset → [chip or drag] → Add) |
| New amount, now | 3 (Add a drink → catalog row → Add) | **3** (Add a drink → type or drag → Next → Add = 4; with the "Add now" shortcut on step 1, 3) |
| New amount, earlier | 3 + scroll + drag | **4** (Add a drink → amount → Next → chip → Add) |

**Decision for the user:** PRODUCT.md says "Repeat = 2 taps, new ≤ 3". A strict two-step flow makes the repeat 3. The proposal keeps both: each preset row has an inline **Add now** key (2 taps), and tapping the row's body goes to step 2. Step 1 can also carry a small secondary **Add now** next to **Next: when**. If the user wants the time question always asked, drop both shortcuts and accept 3 taps.

### Catalog, bartender, voice
- **Catalog:** keep it, behind step 1's "Pick from the drink list". It is a calculator for the amount, not the front door. Size rows stay roomy (min 64 px). Fix the 1.6 / 1.7 mismatch first (see friction 5).
- **Bartender and voice:** keep the dock's **Type or say a drink** key. A parsed result fills step 1 (amount and name) and opens step 2 with Now preselected. Do not keep the composer's own `TimeControl`; one time control lives in step 2.
- **Name is optional.** A drink from the slider alone is labelled "1.5 std drink" in Your tab.

### Impaired-user rules (designing-for-impaired-users)
- Every target ≥ 48 px (primary 64 px). The slider's hit area is 48 px tall and the thumb's zone 56 px wide. Nothing sits within 8 px of another target.
- Text ≥ 18 px; the read-out is 22 px and the number 56 px.
- No time-outs, no auto-advance timers, no auto-confirm. A step moves on only when tapped. Undo instead of confirm dialogs; the double-tap guard (`isDoubleTap`) on Add.
- Times can't be in the future, and the sheet freezes `now` when it opens.
- Reduced motion: the step change is a cross-fade, not a slide.
- Screen readers: "Step 1 of 2, how much". Announce values on release only.

### Edit reuses the same controls
- The same sheet, titled "Change drink", opens on step 1 with the drink's amount and its **exact** time (not snapped).
- Both steps can be reached directly through the step marker as two tabs ("How much · When"). Edit isn't linear.
- **Save** is enabled only when something changed, and sends only the changed fields (the update op above).
- "Remove drink" sits at the bottom as a quiet text key. It removes with Undo, like the row's Remove.
- The notice reads "Changed: Vodka soda to 7:45 pm [Undo]", and Undo restores the old values.

---

## Other friction in add, edit and remove (ranked)

1. **The time is hidden on the add path** (`AddSheet.tsx:61-69, 196-201`). Recents and catalog `+` stamp "now". The size step's time control is below the fold behind the sticky Add key. The user's "add then edit" comes from this. *(Fixed by the two-step sheet.)*
2. **Undo after an edit deletes the drink** (`NightScreen.tsx:130, 139`; DevNight via its stale notice). A safety problem: the estimate silently loses a drink.
3. **Save moves a drink you didn't move** (`EditDrinkSheet.tsx:32, 89-94`; repro `save-unchanged.mjs`). It snaps to the ladder, uses a `now` up to 30 s stale, and pulls anything older than 12 h forward to 12 h.
4. **A just-added drink isn't counted for up to 30 s in production.** `describeNight` and the curve count only `finishedAt <= now` (`estimate-display.ts:145`, `TimelineCard.tsx:52`). `NightScreen`'s `now` ticks every 30 s and isn't bumped on add, so a drink stamped with `new Date()` is "in the future" until the next tick. The number doesn't move after Add, which breaks "know it worked". DevNight hides this because it calls `setNow` on add. Fix: bump the clock on add, edit and undo (`useMinuteClock` returns `[now, tick]`).
5. **The amount on Add doesn't match the row.** The catalog shows "Schooner · 1.6 std" but the key says "Add · 1.7 std" (`AddSheet.tsx:58-59`: per-unit ceil to 0.01, then ceil to 0.1; the row uses `formatStandards`, which rounds). The person sees one number and logs another. Pick one rule: ceil once, and show what will be logged.
6. **The amount can't be typed and stepping is slow.** In Edit, 1 → 3.5 std takes 13 taps. There's no slider and no input.
7. **The time slider** (above): 2.8 px per rung at 375 and 1.9 at 320, a kinked ladder, tap-to-jump, and the sheet stealing vertical-ish drags.
8. **An edit is a replace.** Each edit makes a new id, `source: "edited"`, and drops `confidence`/`rawText`. It's two network ops and churns the recents' order. *(Fixed by the update op.)*
9. **A stale refetch can resurrect a removed drink for a moment.** There's no `getNight.cancel()` before the optimistic `setData` (`useNight.ts:116, 131`).
10. **The time window disagrees with itself.** Your tab says "Last 24 hours" (`TonightList.tsx:29`), the night window is 48 h (`NIGHT_WINDOW_MS`), and the slider stops at 12 h. A drink logged 13–48 h ago is listed but can't be edited honestly.
11. **The docs have drifted.** DESIGN.md "Time of a drink" says chips Now/15/30/1 h and 5-minute steps; the code has Now/10/20/30/1 h and the 61-rung ladder.
12. **"How many" caps at 6** with no explanation (`AddSheet.tsx:26`). After that it's typing or two adds.
13. **Remove sits right beside each row's Edit target** (`TonightList.tsx:41-63`). It's 48 px and has Undo (2 min), which is fine, but at 320 px the row's tap target and Remove are close. In the new Edit sheet, Remove should live only there.
