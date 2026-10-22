import { Keyboard, List, Mic, Plus, Sparkles, Square, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useRegion } from "~/hooks/useRegion";
import type { LoggedDrink } from "~/hooks/useNight";
import { useVoice } from "~/hooks/useVoice";
import { CATALOG } from "~/lib/drinks/catalog";
import { toDrinkDetails } from "~/lib/drinks/details";
import { buildIndex, parseWithCatalog } from "~/lib/drinks/parse";
import { SERVE_SIZES, servesForRegion } from "~/lib/drinks/serves";
import type { ParseResult } from "~/lib/drinks/types";
import { drinkLabel, timeAgo } from "~/lib/estimate-display";
import { formatClock } from "~/lib/format-clock";
import type { RegionId } from "~/lib/region";
import { Held, usePresence } from "~/hooks/usePresence";
import { api } from "~/trpc/react";
import type { Prefill } from "./AddSheet";
import { DrinkIcon, drinkKind } from "./DrinkIcon";

export interface QuickDrink {
  standards: number;
  name: string | null;
  volumeMl: number | null;
  abv: number | null;
  count: number | null;
}

export type Notice =
  | { kind: "added"; drink: LoggedDrink; at: number; count: number }
  | { kind: "removed"; drink: LoggedDrink; at: number; count: number }
  /** An edit: `drink` as it is now, `before` as it was, for Undo. */
  | { kind: "changed"; drink: LoggedDrink; before: LoggedDrink; at: number; count: number };

// Undo stays on screen this long after an add or remove (the skill's floor is 10 s).
/** What an edit changed, for the notice: "7:45 pm", "2.0 std", or both. */
function changeSummary(before: LoggedDrink, after: LoggedDrink, std: (stored: number) => string) {
  const parts: string[] = [];
  if (before.finishedAt.getTime() !== after.finishedAt.getTime()) parts.push(formatClock(after.finishedAt, { period: true }));
  if (before.standards !== after.standards) parts.push(`${std(after.standards)} std`);
  return parts.join(", ");
}

export const UNDO_WINDOW_MS = 2 * 60 * 1000;

interface AddDockProps {
  /** The latest drink (first among the composer's suggestions): the last one added, else the most recent. */
  repeat: QuickDrink | null;
  recents: QuickDrink[];
  lastDrink: LoggedDrink | null;
  notice: Notice | null;
  now: Date;
  unsynced: number;
  onAdd: (drink: QuickDrink) => void;
  /** A typed or spoken drink, read: opens the add sheet on When with its amount and name. */
  onUseParsed: (drink: Prefill) => void;
  onOpenAdd: () => void;
  onUndo: () => void;
}

// One index per region: US shots are 44 ml, not the Australian 30 ml nip.
const catalogIndexes: Partial<Record<RegionId, ReturnType<typeof buildIndex>>> = {};
const index = (region: RegionId) => (catalogIndexes[region] ??= buildIndex(CATALOG, servesForRegion(SERVE_SIZES, region)));

/** The catalog read of some text, as a ParseResult (null when it understood nothing). */
function readOnDevice(text: string, region: RegionId): ParseResult | null {
  const p = parseWithCatalog(text, index(region));
  const items = p.items.filter((i) => i.standards > 0);
  if (items.length === 0) return null;
  const total = Math.ceil(items.reduce((a, i) => a + i.standards, 0) * 10 - 1e-9) / 10;
  return { status: p.unparsed.length ? "partial" : "ok", items, totalStandards: total, unparsed: p.unparsed, layer: "catalog" };
}

type Mode = "idle" | "typing" | "listening";

/**
 * The dock, always under the thumb. Top to bottom: what just happened (with Undo / Add back), one
 * white **Add a drink** key that opens the add sheet with recents first (user decision, 18 Oct 2026
 * late: one add key; a repeat drink is now two taps), and a second way in for anything not on the
 * list: a composer that takes any drink typed or spoken, with recents as suggestions so recognising
 * a drink still beats remembering one. Text is read on the phone first; the bartender (server) is
 * only asked when the catalog can't read it.
 */
export function AddDock(props: AddDockProps) {
  const { repeat, recents, lastDrink, notice, now, unsynced } = props;
  const { std, region } = useRegion();
  const [mode, setMode] = useState<Mode>("idle");
  const [text, setText] = useState("");
  // What's read: typed text once it has settled for a moment, spoken text at once (never a guess
  // mid-sentence).
  const [settled, setSettled] = useState("");
  const [server, setServer] = useState<{ text: string; result: ParseResult } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const analyse = api.post.analyseDrink.useMutation();

  const voice = useVoice({
    regionId: region.id,
    readsAsDrink: (t) => !!readOnDevice(t, region.id),
    onHeard: (t) => {
      setText(t);
      setSettled(t);
      setMode("typing");
    },
  });

  useEffect(() => {
    const t = setTimeout(() => setSettled(text), 250);
    return () => clearTimeout(t);
  }, [text]);

  const read = settled.trim();
  const onDevice = useMemo(() => (read.length >= 2 ? readOnDevice(read, region.id) : null), [read, region.id]);
  const result = onDevice ?? (server?.text === read ? server.result : null);
  const live = notice && now.getTime() - notice.at < UNDO_WINDOW_MS ? notice : null;

  function close() {
    voice.reset();
    setMode("idle");
    setText("");
    setSettled("");
    setServer(null);
    inputRef.current?.blur();
  }

  /** On to When in the add sheet, with what was read. Nothing is added until Add there. */
  function goToWhen(r: ParseResult) {
    const standards = Math.ceil(r.totalStandards * 10 - 1e-9) / 10; // never round a drink down
    if (standards <= 0) return;
    props.onUseParsed({ standards, details: toDrinkDetails(r, read) ?? { source: "manual", rawText: read } });
    close();
  }

  async function askBartender(asked: string) {
    if (!asked || analyse.isPending) return;
    try {
      const parsed = await analyse.mutateAsync({ drinkText: asked, region: region.id });
      setServer({ text: asked, result: parsed });
    } catch {
      setServer({ text: asked, result: { status: "unavailable", items: [], totalStandards: 0, unparsed: [asked], layer: null } });
    }
  }

  function listen() {
    if (voice.state.kind === "listening") {
      voice.stop();
      return;
    }
    setText("");
    setSettled("");
    setServer(null);
    setMode("listening");
    voice.listen();
  }
  const listening = voice.state.kind === "listening";
  const hasVoice = voice.offered;

  const open = mode !== "idle";
  // The composer leaves the way it came (rise-out, 200ms) before the keys come back; the keys then
  // rise in, but only on their way back from the composer, never on first paint.
  const composer = usePresence(open, 200);
  const rest = !composer.mounted;
  const [composed, setComposed] = useState(false);
  if (open && !composed) setComposed(true);
  const keep = (node: React.ReactNode) => <Held open={open}>{node}</Held>;
  const suggestions = [repeat, ...recents].filter((d): d is QuickDrink => !!d).slice(0, 4);
  const unread = read.length >= 2 && read === text.trim() && !result;
  let heading = result?.items.length ? "Check it" : "Tap one, or type it";
  if (listening) heading = "Listening…";
  else if (voice.state.kind === "failed") heading = voice.state.message;
  else if (voice.state.kind === "heard" && voice.state.text === text) heading = `Heard “${voice.state.text}”`;

  let status: React.ReactNode;
  if (live) {
    status = (
      <>
        <span className="text-ink-2">{live.kind === "added" ? "Added: " : live.kind === "changed" ? "Changed: " : "Removed: "}</span>
        <span className="font-medium">{drinkLabel(live.drink, std)}</span>
        {live.kind === "changed" && <span className="text-ink-2"> · {changeSummary(live.before, live.drink, std)}</span>}
        {live.count > 1 && <span className="font-medium"> ×{live.count}</span>}
      </>
    );
  } else if (lastDrink) {
    status = (
      <>
        <span className="text-ink-2">Last: </span>
        <span className="font-medium">{drinkLabel(lastDrink, std)}</span>
        <span className="text-ink-2"> · {timeAgo(lastDrink.finishedAt, now)}</span>
      </>
    );
  } else {
    status = <span className="text-ink-2">Nothing added yet tonight</span>;
  }

  return (
    <div className="dock-stack flex flex-col gap-2.5" data-composed={composed || undefined} data-leaving={composer.state === "closed" && composer.mounted ? "" : undefined}>
      {rest && (
        // At rest the line is for screen readers only (the white pill already names the drink and
        // Your tab lists it); it shows when a change lands, with its Undo / Add back.
        <div className={live ? "flex min-h-12 items-center gap-3 px-2" : "sr-only"}>
          {/* One persistent live region: screen readers announce text changes, not remounts. */}
          <p aria-live="polite" className="line-clamp-2 min-w-0 flex-1 text-lg leading-snug">
            <span key={live?.at ?? "idle"} className="snack inline">
              {status}
            </span>
          </p>
          {live && (
            <button type="button" onClick={props.onUndo} className="press min-h-12 shrink-0 rounded-key bg-white/10 px-4 text-lg font-medium hover:bg-white/15">
              {live.kind === "removed" ? "Add back" : live.count > 1 ? "Undo one" : "Undo"}
            </button>
          )}
        </div>
      )}
      {rest && unsynced > 0 && (
        <p className="px-2 text-lg text-ink-2">{unsynced === 1 ? "Saved on this phone, will sync" : `${unsynced} saved on this phone, will sync`}</p>
      )}

      {/* One add key. It opens the add sheet, recents first, so the drink you just had is the top row. */}
      {rest && (
        <button
          type="button"
          onClick={props.onOpenAdd}
          className="press key-glow dock-pill flex min-h-[72px] items-center justify-center gap-2 rounded-primary bg-ink px-4 text-xl font-medium text-bg min-[360px]:gap-2.5 min-[360px]:px-6"
        >
          <Plus aria-hidden="true" className="size-6 shrink-0" strokeWidth={2.5} />
          Add a drink
        </button>
      )}

      {/* The second way in is the composer, for anything not on the list: type it, or say it with the
          mic as its own key. The field only appears once one of them is tapped. */}
      {rest && (
        <div className="flex items-stretch gap-2">
          <button
            type="button"
            onClick={() => setMode("typing")}
            className="press flex min-h-14 min-w-0 flex-1 items-center justify-center gap-2 rounded-key bg-white/[0.05] px-4 text-lg font-medium shadow-[inset_0_0_0_1px_var(--color-line)] hover:bg-white/10"
          >
            <Keyboard aria-hidden="true" className="size-6 shrink-0" strokeWidth={2} />
            <span className="truncate">{hasVoice ? "Type or say a drink" : "Type a drink"}</span>
          </button>
          {/* Under 360px the label needs the width; the mic is still inside the composer. */}
          {hasVoice && (
            <button
              type="button"
              onClick={listen}
              aria-label="Say a drink"
              className="press hidden size-14 shrink-0 place-items-center rounded-key bg-white/[0.05] shadow-[inset_0_0_0_1px_var(--color-line)] hover:bg-white/10 min-[360px]:grid"
            >
              <Mic aria-hidden="true" className="size-6" strokeWidth={2.25} />
            </button>
          )}
        </div>
      )}

      {/* While it leaves it keeps what it showed: close() clears the text as it starts to go. */}
      {composer.mounted && keep(
        <div className="compose-in flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3 px-2">
            <p className={`min-w-0 text-lg ${voice.state.kind === "failed" && !listening ? "text-alert" : "text-ink-2"}`} aria-live="polite">
              {heading}
            </p>
            <button type="button" onClick={close} aria-label="Close" className="press grid size-12 shrink-0 place-items-center rounded-key bg-white/10 hover:bg-white/15">
              <X aria-hidden="true" className="size-5" strokeWidth={2.25} />
            </button>
          </div>

          {result && result.items.length > 0 ? (
            <div className="flex flex-col gap-3 rounded-row bg-white/[0.06] p-3">
              <ul className="flex flex-col gap-1.5 px-1">
                {result.items.map((i, k) => (
                  <li key={k} className="flex items-center gap-3 text-lg">
                    <DrinkIcon kind={drinkKind(i)} className="size-5 shrink-0 text-ink-2" />
                    <span className="min-w-0 flex-1 font-medium">
                      {i.count > 1 ? `${i.count} × ` : ""}
                      {i.name}
                    </span>
                    <span className="shrink-0 text-ink-2 tabular-nums">{std(i.standards)} std</span>
                  </li>
                ))}
              </ul>
              {result.unparsed.length > 0 && <p className="px-1 text-lg text-ink-2">Not counted: {result.unparsed.join(", ")}</p>}
              <button
                type="button"
                // Keeps the keyboard's focus so the tap lands before the layout moves.
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => goToWhen(result)}
                className="press key-glow flex min-h-16 w-full items-center justify-center rounded-primary bg-ink text-xl font-medium text-bg"
              >
                Next: when · {std(Math.ceil(result.totalStandards * 10 - 1e-9) / 10)} std
              </button>
            </div>
          ) : unread ? (
            <div className="flex flex-col gap-2 px-1">
              <p className="text-lg text-ink-2">
                {server?.result.status === "unavailable" ? "The bartender is unavailable right now. Set it by hand instead." : "Not in our drink list yet."}
              </p>
              <div className="flex flex-wrap gap-2">
                {server?.result.status !== "unavailable" && (
                  <button
                    type="button"
                    onClick={() => void askBartender(read)}
                    disabled={analyse.isPending}
                    className="press flex min-h-12 items-center gap-2 rounded-key bg-ink px-4 text-lg font-medium text-bg disabled:opacity-60"
                  >
                    <Sparkles aria-hidden="true" className="size-5" strokeWidth={2} />
                    {analyse.isPending ? "Reading it…" : "Ask the bartender"}
                  </button>
                )}
                <button type="button" onClick={props.onOpenAdd} className="press flex min-h-12 items-center gap-2 rounded-key bg-white/[0.08] px-4 text-lg hover:bg-white/[0.12]">
                  <List aria-hidden="true" className="size-5" strokeWidth={2} />
                  Set it by hand
                </button>
              </div>
            </div>
          ) : listening ? null : (
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
              {suggestions.map((d) => (
                <button
                  key={`${d.name ?? ""}|${d.standards}`}
                  type="button"
                  onClick={() => {
                    props.onAdd(d);
                    close();
                  }}
                  onPointerDown={(e) => e.preventDefault()}
                  aria-label={`Add ${drinkLabel(d, std)} now`}
                  className="press flex min-h-12 shrink-0 items-center gap-2 rounded-key bg-white/[0.08] px-4 text-lg whitespace-nowrap hover:bg-white/[0.12]"
                >
                  <Plus aria-hidden="true" className="size-5 text-ink-2" strokeWidth={2.25} />
                  {drinkLabel(d, std)}
                  <span className="text-ink-2">{std(d.standards)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {composer.mounted && (
        <form
          inert={!open}
          onSubmit={(e) => {
            e.preventDefault();
            // Done reads it at once (no wait for the pause), and asks the bartender if the list can't.
            const typed = text.trim();
            setSettled(text);
            if (typed.length >= 2 && !readOnDevice(typed, region.id)) void askBartender(typed);
            inputRef.current?.blur();
          }}
          className={`compose-bar flex min-h-14 items-center gap-2 rounded-key bg-white/[0.06] py-1 pr-1 pl-5 shadow-[inset_0_0_0_1px_var(--color-line)] focus-within:shadow-[inset_0_0_0_2px_var(--color-signal)] ${listening ? "listening" : ""}`}
        >
          <label className="sr-only" htmlFor="compose-drink">
            Type a drink
          </label>
          <input
            id="compose-drink"
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            // Mounted by the add key's tap, so focusing here still brings the keyboard up on iOS.
            // While listening the mic has the floor and the keyboard stays down.
            autoFocus={mode === "typing"}
            placeholder={listening ? "Say it like you'd order it" : hasVoice ? "Type or say a drink" : "Type a drink"}
            autoComplete="off"
            enterKeyHint="done"
            maxLength={200}
            className="min-h-12 min-w-0 flex-1 bg-transparent text-lg text-ink placeholder:text-ink-2 focus:outline-none"
          />
          {hasVoice && (
            <button
              type="button"
              onClick={listen}
              aria-label={listening ? "Stop listening" : "Say a drink"}
              aria-pressed={listening}
              className={`press relative grid size-12 shrink-0 place-items-center rounded-key ${
                listening ? "mic-live bg-ink text-bg" : "bg-white/10 hover:bg-white/15"
              }`}
            >
              {listening ? <Square aria-hidden="true" className="size-4" fill="currentColor" /> : <Mic aria-hidden="true" className="size-5" strokeWidth={2.25} />}
            </button>
          )}
        </form>
      )}
    </div>
  );
}
