"use client";

import { Mic, Plus, Search, Square, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { QuickDrink } from "~/components/night/AddDock";
import { DrinkIcon, drinkKind } from "~/components/night/DrinkIcon";
import { CATALOG } from "~/lib/drinks/catalog";
import { buildIndex, parseWithCatalog } from "~/lib/drinks/parse";
import { SERVE_SIZES } from "~/lib/drinks/serves";
import type { ParsedItem } from "~/lib/drinks/types";
import { drinkLabel, timeAgo } from "~/lib/estimate-display";
import { dockStatus, type SampleNight } from "../_kit/useSampleNight";

type Std = (n: number) => string;
type Mode = "idle" | "typing" | "listening";

// Minimal typing for the Web Speech API (Chrome and Safari ship it prefixed).
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}
type RecognitionCtor = new () => Recognition;
const speechCtor = (): RecognitionCtor | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

let index: ReturnType<typeof buildIndex> | null = null;
const catalogIndex = () => (index ??= buildIndex(CATALOG, SERVE_SIZES));

const WHEN = [
  { label: "Now", min: 0 },
  { label: "15 min ago", min: 15 },
  { label: "30 min ago", min: 30 },
  { label: "1 hour ago", min: 60 },
];

/**
 * The dock: one white pill repeats the last drink (one tap), and a composer below it takes any drink
 * typed or spoken. Recents become suggestions the moment the composer opens, so recognition still
 * beats recall. Parsing is the on-device catalog: no network, no AI.
 */
export function ComposerDock({ night, std }: { night: SampleNight; std: Std }) {
  const [mode, setMode] = useState<Mode>("idle");
  const [text, setText] = useState("");
  const [when, setWhen] = useState(0);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [hasVoice, setHasVoice] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const rec = useRef<Recognition | null>(null);
  const r = night.repeat;
  const s = dockStatus(night, std);

  useEffect(() => {
    setHasVoice(!!speechCtor());
    // Dev only: ?compose=<text> or ?listen opens a state for screenshots.
    const q = new URLSearchParams(window.location.search);
    const preset = q.get("compose");
    if (preset !== null) {
      setMode(q.has("listen") ? "listening" : "typing");
      setText(preset);
    }
  }, []);

  const parsed = useMemo(() => {
    const t = text.trim();
    if (t.length < 2) return null;
    const p = parseWithCatalog(t, catalogIndex());
    const items = p.items.filter((i) => i.standards > 0);
    return { items, unparsed: p.unparsed, total: Math.ceil(items.reduce((a, i) => a + i.standards, 0) * 10 - 1e-9) / 10 };
  }, [text]);

  function close() {
    rec.current?.stop();
    setMode("idle");
    setText("");
    setWhen(0);
    setVoiceError(null);
    inputRef.current?.blur();
  }

  function addItems(items: ParsedItem[]) {
    for (const i of items) {
      night.add({ standards: i.standards, name: i.count > 1 ? `${i.count} × ${i.name}` : i.name, volumeMl: i.volumeMl, abv: i.abv, count: i.count });
    }
    close();
  }

  function addQuick(d: QuickDrink) {
    night.add(d);
    close();
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
    recognition.onresult = (e) => {
      setText(Array.from(e.results, (res) => res[0]?.transcript ?? "").join(" "));
    };
    recognition.onerror = (e) => setVoiceError(e.error === "not-allowed" ? "Microphone is off for this site. You can still type it." : "Didn't catch that. Try again or type it.");
    recognition.onend = () => setMode((m) => (m === "listening" ? "typing" : m));
    rec.current = recognition;
    setVoiceError(null);
    setText("");
    setMode("listening");
    recognition.start();
  }

  const open = mode !== "idle";
  const suggestions = [r, ...night.recents].filter((d): d is QuickDrink => !!d).slice(0, 4);

  return (
    <div className="flex flex-col gap-2.5">
      {!open && (
        <div className="flex min-h-12 items-center gap-3 px-2">
          <p aria-live="polite" className="min-w-0 flex-1 truncate text-lg">
            <span key={s.live?.at ?? "idle"} className="snack inline">
              {s.lead && <span className="text-[var(--g-ink-2)]">{s.lead}: </span>}
              <span className="font-medium">{s.label}</span>
              {!s.live && night.last && <span className="text-[var(--g-ink-2)]"> · {timeAgo(night.last.finishedAt, night.now)}</span>}
            </span>
          </p>
          {s.action && (
            <button type="button" onClick={night.undo} className="g-press min-h-12 shrink-0 rounded-full bg-white/10 px-4 text-lg font-medium hover:bg-white/15">
              {s.action}
            </button>
          )}
        </div>
      )}

      {!open && r && (
        <button
          type="button"
          onClick={() => night.add(r)}
          className="g-press flex min-h-[72px] items-center justify-center gap-2.5 rounded-full bg-[var(--g-ink)] px-6 text-xl font-medium text-[var(--g-bg)] shadow-[0_8px_30px_-8px_rgb(124_180_255/0.6)]"
        >
          <Plus aria-hidden="true" className="size-6 shrink-0" strokeWidth={2.5} />
          <span className="truncate">Add another {drinkLabel(r, std).toLowerCase()}</span>
        </button>
      )}

      {open && (
        <div className="g-compose-in flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-2">
            <p className="text-lg text-[var(--g-ink-2)]" aria-live="polite">
              {mode === "listening" ? "Listening…" : parsed?.items.length ? "Check it, then add" : "Pick one, or type it"}
            </p>
            <button type="button" onClick={close} aria-label="Close" className="g-press grid size-12 place-items-center rounded-full bg-white/10 hover:bg-white/15">
              <X aria-hidden="true" className="size-5" strokeWidth={2.25} />
            </button>
          </div>

          {parsed && parsed.items.length > 0 ? (
            <div className="rounded-[22px] bg-white/[0.06] p-3 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]">
              <ul className="flex flex-col gap-1.5 px-1">
                {parsed.items.map((i, k) => (
                  <li key={k} className="flex items-center gap-3 text-lg">
                    <DrinkIcon kind={drinkKind(i)} className="size-5 text-[var(--g-ink-2)]" />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">
                        {i.count > 1 ? `${i.count} × ` : ""}
                        {i.name}
                      </span>
                      <span className="text-[var(--g-ink-2)]">
                        {" "}
                        · {i.volumeMl} ml · {i.abv}%
                      </span>
                    </span>
                    <span className="font-medium">{std(i.standards)} std</span>
                  </li>
                ))}
              </ul>
              {parsed.unparsed.length > 0 && <p className="mt-2 px-1 text-lg text-[var(--g-ink-2)]">Not counted: {parsed.unparsed.join(", ")}</p>}
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {WHEN.map((w, k) => (
                  <button
                    key={w.label}
                    type="button"
                    onClick={() => setWhen(k)}
                    aria-pressed={when === k}
                    className={`g-press min-h-12 shrink-0 rounded-full px-4 text-lg ${when === k ? "bg-white/20 font-medium" : "bg-white/[0.05] text-[var(--g-ink-2)]"}`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => addItems(parsed.items)}
                className="g-press mt-3 flex min-h-16 w-full items-center justify-center gap-2 rounded-full bg-[var(--g-ink)] text-xl font-medium text-[var(--g-bg)]"
              >
                <Plus aria-hidden="true" className="size-6" strokeWidth={2.5} />
                Add · {std(parsed.total)} std
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((d) => (
                <button
                  key={`${d.name}|${d.standards}`}
                  type="button"
                  onClick={() => addQuick(d)}
                  className="g-press flex min-h-12 items-center gap-2 rounded-full bg-white/[0.06] px-4 text-lg shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)] hover:bg-white/10"
                >
                  <DrinkIcon kind={drinkKind(d)} className="size-5 text-[var(--g-ink-2)]" />
                  {drinkLabel(d, std)}
                  <span className="text-[var(--g-ink-2)]">{std(d.standards)} std</span>
                </button>
              ))}
            </div>
          )}
          {voiceError && <p className="px-2 text-lg text-[var(--g-alert)]">{voiceError}</p>}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (parsed?.items.length) addItems(parsed.items);
        }}
        className={`flex min-h-14 items-center gap-2 rounded-full bg-white/[0.06] py-1 pr-1 pl-4 shadow-[inset_0_0_0_1px_var(--g-edge-2)] ${mode === "listening" ? "g-listening" : ""}`}
      >
        <Search aria-hidden="true" className="size-5 shrink-0 text-[var(--g-ink-2)]" strokeWidth={2} />
        <label className="sr-only" htmlFor="g-compose">
          Type a drink
        </label>
        <input
          id="g-compose"
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => mode === "idle" && setMode("typing")}
          placeholder={mode === "listening" ? "Say it like you'd order it" : "Type or say a drink"}
          autoComplete="off"
          enterKeyHint="done"
          className="min-w-0 flex-1 bg-transparent text-lg text-[var(--g-ink)] placeholder:text-[var(--g-ink-2)] focus:outline-none"
        />
        {hasVoice && (
          <button
            type="button"
            onClick={listen}
            aria-label={mode === "listening" ? "Stop listening" : "Say a drink"}
            aria-pressed={mode === "listening"}
            className={`g-press relative grid size-12 shrink-0 place-items-center rounded-full ${
              mode === "listening" ? "g-mic-live bg-[var(--g-ink)] text-[var(--g-bg)]" : "bg-white/10 hover:bg-white/15"
            }`}
          >
            {mode === "listening" ? <Square aria-hidden="true" className="size-4" fill="currentColor" /> : <Mic aria-hidden="true" className="size-5" strokeWidth={2.25} />}
          </button>
        )}
      </form>
    </div>
  );
}
