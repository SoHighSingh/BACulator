import { List, Mic, Plus, Sparkles, Square, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useRegion } from "~/hooks/useRegion";
import type { LoggedDrink, NewDrink } from "~/hooks/useNight";
import { CATALOG } from "~/lib/drinks/catalog";
import { toDrinkDetails } from "~/lib/drinks/details";
import { buildIndex, parseWithCatalog } from "~/lib/drinks/parse";
import { SERVE_SIZES, servesForRegion } from "~/lib/drinks/serves";
import type { ParseResult } from "~/lib/drinks/types";
import { drinkLabel, timeAgo } from "~/lib/estimate-display";
import type { RegionId } from "~/lib/region";
import { api } from "~/trpc/react";
import { DrinkIcon, drinkKind } from "./DrinkIcon";
import { TimeControl } from "./TimeControl";

export interface QuickDrink {
  standards: number;
  name: string | null;
  volumeMl: number | null;
  abv: number | null;
  count: number | null;
}

export type Notice =
  | { kind: "added"; drink: LoggedDrink; at: number; count: number }
  | { kind: "removed"; drink: LoggedDrink; at: number; count: number };

// Undo stays on screen this long after an add or remove (the skill's floor is 10 s).
export const UNDO_WINDOW_MS = 2 * 60 * 1000;

interface AddDockProps {
  /** The drink the white pill repeats: the last one added, else the most recent. */
  repeat: QuickDrink | null;
  recents: QuickDrink[];
  lastDrink: LoggedDrink | null;
  notice: Notice | null;
  now: Date;
  unsynced: number;
  onAdd: (drink: QuickDrink) => void;
  /** A typed or spoken drink; returns false if it was swallowed as a double tap. */
  onAddNew: (drink: NewDrink) => boolean;
  onOpenAdd: () => void;
  onUndo: () => void;
}

// Minimal typing for the Web Speech API (Chrome and Safari ship it prefixed).
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}
type RecognitionCtor = new () => Recognition;
const speechCtor = (): RecognitionCtor | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

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
 * The dock, always under the thumb. Top to bottom: what just happened (with Undo / Add back), the
 * white pill that repeats the last drink in one tap, and a composer that takes any drink typed or
 * spoken. Opening the composer hides the pill and shows recents as suggestions, so recognising a
 * drink still beats remembering one. Text is read on the phone first; the bartender (server) is
 * only asked when the catalog can't read it.
 */
export function AddDock(props: AddDockProps) {
  const { repeat, recents, lastDrink, notice, now, unsynced } = props;
  const { std, region } = useRegion();
  const [mode, setMode] = useState<Mode>("idle");
  const [text, setText] = useState("");
  const [minutesAgo, setMinutesAgo] = useState(0);
  const [server, setServer] = useState<{ text: string; result: ParseResult } | null>(null);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [hasVoice, setHasVoice] = useState(false);
  // While the field has focus the keyboard is up: everything folds to one-line rows.
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const rec = useRef<Recognition | null>(null);
  const analyse = api.post.analyseDrink.useMutation();

  useEffect(() => setHasVoice(!!speechCtor()), []);

  const onDevice = useMemo(() => (text.trim().length >= 2 ? readOnDevice(text.trim(), region.id) : null), [text, region.id]);
  const result = onDevice ?? (server && server.text === text.trim() ? server.result : null);
  const live = notice && now.getTime() - notice.at < UNDO_WINDOW_MS ? notice : null;

  function close() {
    rec.current?.stop();
    setMode("idle");
    setText("");
    setServer(null);
    setMinutesAgo(0);
    setVoiceNote(null);
    inputRef.current?.blur();
  }

  function addResult(r: ParseResult) {
    const raw = text.trim();
    const standards = Math.ceil(r.totalStandards * 10 - 1e-9) / 10; // never round a drink down
    if (standards <= 0) return;
    const added = props.onAddNew({ standards, finishedAt: new Date(Date.now() - minutesAgo * 60_000), details: toDrinkDetails(r, raw) });
    if (added) close();
  }

  async function askBartender() {
    const asked = text.trim();
    if (!asked || analyse.isPending) return;
    try {
      const parsed = await analyse.mutateAsync({ drinkText: asked, region: region.id });
      setServer({ text: asked, result: parsed });
    } catch {
      setServer({ text: asked, result: { status: "unavailable", items: [], totalStandards: 0, unparsed: [asked], layer: null } });
    }
  }

  function listen() {
    const Ctor = speechCtor();
    if (!Ctor) return;
    if (mode === "listening") {
      rec.current?.stop();
      return;
    }
    const recognition = new Ctor();
    recognition.lang = navigator.language || "en-AU";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (e) => setText(Array.from(e.results, (res) => res[0]?.transcript ?? "").join(" "));
    recognition.onerror = (e) =>
      setVoiceNote(e.error === "not-allowed" || e.error === "service-not-allowed" ? "The microphone is off for this site. You can type it instead." : "Didn't catch that. Try again, or type it.");
    recognition.onend = () => setMode((m) => (m === "listening" ? "typing" : m));
    rec.current = recognition;
    setVoiceNote(null);
    setText("");
    setServer(null);
    setMode("listening");
    try {
      recognition.start();
    } catch {
      setMode("typing");
    }
  }

  const open = mode !== "idle";
  const suggestions = [repeat, ...recents].filter((d): d is QuickDrink => !!d).slice(0, 4);
  const unread = text.trim().length >= 2 && !result;

  let status: React.ReactNode;
  if (live) {
    status = (
      <>
        <span className="text-ink-2">{live.kind === "added" ? "Added: " : "Removed: "}</span>
        <span className="font-medium">{drinkLabel(live.drink, std)}</span>
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
    <div className="flex flex-col gap-2.5">
      {!open && (
        // At rest the line is for screen readers only (the white pill already names the drink and
        // Your tab lists it); it shows when a change lands, with its Undo / Add back.
        <div className={live ? "flex min-h-12 items-center gap-3 px-2" : "sr-only"}>
          {/* One persistent live region: screen readers announce text changes, not remounts. */}
          <p aria-live="polite" className="min-w-0 flex-1 truncate text-lg">
            <span key={live?.at ?? "idle"} className="snack inline">
              {status}
            </span>
          </p>
          {live && (
            <button type="button" onClick={props.onUndo} className="press min-h-12 shrink-0 rounded-key bg-white/10 px-4 text-lg font-medium hover:bg-white/15">
              {live.kind === "added" ? (live.count > 1 ? "Undo one" : "Undo") : "Add back"}
            </button>
          )}
        </div>
      )}
      {!open && unsynced > 0 && (
        <p className="px-2 text-lg text-ink-2">{unsynced === 1 ? "Saved on this phone, will sync" : `${unsynced} saved on this phone, will sync`}</p>
      )}

      {!open &&
        (repeat ? (
          <button
            type="button"
            onClick={() => props.onAdd(repeat)}
            className="press key-glow dock-pill flex min-h-[72px] items-center justify-center gap-2 rounded-primary bg-ink px-4 text-lg font-medium text-bg min-[360px]:gap-2.5 min-[360px]:px-6 min-[360px]:text-xl"
          >
            <Plus aria-hidden="true" className="size-6 shrink-0" strokeWidth={2.5} />
            <span className="truncate">{lastDrink ? "Add another" : "Add"} {drinkLabel(repeat, std).toLowerCase()}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={props.onOpenAdd}
            className="press key-glow dock-pill flex min-h-[72px] items-center justify-center gap-2 rounded-primary bg-ink px-4 text-lg font-medium text-bg min-[360px]:gap-2.5 min-[360px]:px-6 min-[360px]:text-xl"
          >
            <Plus aria-hidden="true" className="size-6" strokeWidth={2.5} />
            Add a drink
          </button>
        ))}

      {/* The second way in is unmistakably an add: a bordered pill that says so, with the mic as its
          own key. The type-or-say field only appears once one of them is tapped. */}
      {!open && (
        <div className="flex items-stretch gap-2">
          <button
            type="button"
            onClick={() => setMode("typing")}
            className="press flex min-h-14 min-w-0 flex-1 items-center justify-center gap-2 rounded-key bg-white/[0.05] px-4 text-lg font-medium shadow-[inset_0_0_0_1px_var(--color-line)] hover:bg-white/10"
          >
            <Plus aria-hidden="true" className="size-6 shrink-0" strokeWidth={2.5} />
            <span className="truncate">{repeat ? "Add a different drink" : "Type or say a drink"}</span>
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

      {open && (
        <div className="compose-in flex flex-col gap-2.5">
          <div className={`flex items-center justify-between px-2 ${focused ? "sr-only" : ""}`}>
            <p className="text-lg text-ink-2" aria-live="polite">
              {mode === "listening" ? "Listening…" : result?.items.length ? "Check it, then add" : "Tap one, or type it"}
            </p>
            <button type="button" onClick={close} aria-label="Close" className="press grid size-12 place-items-center rounded-key bg-white/10 hover:bg-white/15">
              <X aria-hidden="true" className="size-5" strokeWidth={2.25} />
            </button>
          </div>

          {result && result.items.length > 0 && focused ? (
            <div className="flex items-center gap-3 rounded-key bg-white/[0.06] py-1 pr-1 pl-4 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]">
              <DrinkIcon kind={drinkKind(result.items[0]!)} className="size-5 shrink-0 text-ink-2" />
              <span className="min-w-0 flex-1 truncate text-lg">
                <span className="font-medium">{result.items.map((i) => (i.count > 1 ? `${i.count} × ${i.name}` : i.name)).join(" + ")}</span>
                <span className="text-ink-2"> · {std(result.totalStandards)} std</span>
              </span>
              <button
                type="button"
                // Adds straight away at "now"; for an earlier time, press Done to drop the keyboard first.
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => addResult(result)}
                className="press flex min-h-12 shrink-0 items-center gap-1.5 rounded-key bg-ink px-4 text-lg font-medium text-bg"
              >
                <Plus aria-hidden="true" className="size-5" strokeWidth={2.5} />
                Add
              </button>
            </div>
          ) : result && result.items.length > 0 ? (
            <div className="rounded-row bg-white/[0.06] p-3 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]">
              <ul className="flex flex-col gap-1.5 px-1">
                {result.items.map((i, k) => (
                  <li key={k} className="flex items-center gap-3 text-lg">
                    <DrinkIcon kind={drinkKind(i)} className="size-5 text-ink-2" />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">
                        {i.count > 1 ? `${i.count} × ` : ""}
                        {i.name}
                      </span>
                      <span className="text-ink-2">
                        {" "}
                        · {i.volumeMl} ml · {i.abv}%
                      </span>
                    </span>
                    <span className="font-medium tabular-nums">{std(i.standards)} std</span>
                  </li>
                ))}
              </ul>
              {result.unparsed.length > 0 && <p className="mt-2 px-1 text-lg text-ink-2">Not counted: {result.unparsed.join(", ")}</p>}
              <div className="mt-3">
                <TimeControl minutesAgo={minutesAgo} onChange={setMinutesAgo} now={now} />
              </div>
              <button
                type="button"
                onClick={() => addResult(result)}
                className="press mt-3 flex min-h-16 w-full items-center justify-center gap-2 rounded-primary bg-ink text-xl font-medium text-bg"
              >
                <Plus aria-hidden="true" className="size-6" strokeWidth={2.5} />
                Add · {std(result.totalStandards)} std
              </button>
            </div>
          ) : unread ? (
            <div className="flex flex-col gap-2 px-1">
              <p className="text-lg text-ink-2">
                {server?.result.status === "unavailable" ? "The bartender is unavailable right now. Pick it from the list instead." : "Not in our drink list yet."}
              </p>
              <div className="flex flex-wrap gap-2">
                {server?.result.status !== "unavailable" && (
                  <button
                    type="button"
                    onClick={() => void askBartender()}
                    disabled={analyse.isPending}
                    className="press flex min-h-12 items-center gap-2 rounded-key bg-ink px-4 text-lg font-medium text-bg disabled:opacity-60"
                  >
                    <Sparkles aria-hidden="true" className="size-5" strokeWidth={2} />
                    {analyse.isPending ? "Reading it…" : "Ask the bartender"}
                  </button>
                )}
                <button type="button" onClick={props.onOpenAdd} className="press flex min-h-12 items-center gap-2 rounded-key px-4 text-lg shadow-[inset_0_0_0_1px_var(--color-line)]">
                  <List aria-hidden="true" className="size-5" strokeWidth={2} />
                  All drinks
                </button>
              </div>
            </div>
          ) : (
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
                  className="press flex min-h-12 shrink-0 items-center gap-2 rounded-key bg-white/[0.06] px-4 text-lg whitespace-nowrap shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)] hover:bg-white/10"
                >
                  <DrinkIcon kind={drinkKind(d)} className="size-5 text-ink-2" />
                  {drinkLabel(d, std)}
                  <span className="text-ink-2">{std(d.standards)} std</span>
                </button>
              ))}
              <button
                type="button"
                onClick={props.onOpenAdd}
                className="press flex min-h-12 shrink-0 items-center gap-2 rounded-key px-4 text-lg whitespace-nowrap shadow-[inset_0_0_0_1px_var(--color-line)] hover:bg-white/5"
              >
                <List aria-hidden="true" className="size-5" strokeWidth={2} />
                All drinks
              </button>
            </div>
          )}
          {voiceNote && <p className="px-2 text-lg text-alert">{voiceNote}</p>}
        </div>
      )}

      {open && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            // Done drops the keyboard so the full card (with its time control) has the screen.
            if (unread) void askBartender();
            inputRef.current?.blur();
          }}
          className={`compose-bar flex min-h-14 items-center gap-2 rounded-key bg-white/[0.06] py-1 pr-1 pl-5 shadow-[inset_0_0_0_1px_var(--color-line)] focus-within:shadow-[inset_0_0_0_2px_var(--color-signal)] ${mode === "listening" ? "listening" : ""}`}
        >
          <label className="sr-only" htmlFor="compose-drink">
            Type a drink
          </label>
          <input
            id="compose-drink"
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            // Mounted by the add key's tap, so focusing here still brings the keyboard up on iOS.
            // While listening the mic has the floor and the keyboard stays down.
            autoFocus={mode === "typing"}
            placeholder={mode === "listening" ? "Say it like you'd order it" : hasVoice ? "Type or say a drink" : "Type a drink"}
            autoComplete="off"
            enterKeyHint="done"
            maxLength={200}
            className="min-h-12 min-w-0 flex-1 bg-transparent text-lg text-ink placeholder:text-ink-2 focus:outline-none"
          />
          {hasVoice && (
            <button
              type="button"
              onClick={listen}
              aria-label={mode === "listening" ? "Stop listening" : "Say a drink"}
              aria-pressed={mode === "listening"}
              className={`press relative grid size-12 shrink-0 place-items-center rounded-key ${
                mode === "listening" ? "mic-live bg-ink text-bg" : "bg-white/10 hover:bg-white/15"
              }`}
            >
              {mode === "listening" ? <Square aria-hidden="true" className="size-4" fill="currentColor" /> : <Mic aria-hidden="true" className="size-5" strokeWidth={2.25} />}
            </button>
          )}
        </form>
      )}
    </div>
  );
}
