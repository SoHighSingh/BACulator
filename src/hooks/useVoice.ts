import { useCallback, useEffect, useRef, useState } from "react";

import { pickHeard, speechLang, voiceErrorMessage, voiceOffered } from "~/lib/voice";

// Minimal typing for the Web Speech API (Chrome and Safari ship it prefixed).
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}
type RecognitionCtor = new () => Recognition;
const speechCtor = (): RecognitionCtor | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export type VoiceState = { kind: "idle" } | { kind: "listening" } | { kind: "heard"; text: string } | { kind: "failed"; message: string };

/**
 * One spoken drink, final words only: no interim guesses reach the screen (they used to, and a
 * pause left "vodka" where "vodka red bull" was coming). The recogniser's alternatives are tried in
 * turn and the first that reads as a drink wins. Every outcome is said: listening, heard (the words,
 * which stay editable), heard nothing, or why it failed. Closing detaches the handlers before
 * aborting, so a late result can never land in a closed composer.
 */
export function useVoice({ regionId, readsAsDrink, onHeard }: { regionId: "metric" | "us"; readsAsDrink: (t: string) => boolean; onHeard: (text: string) => void }) {
  const [offered, setOffered] = useState(false);
  const [state, setState] = useState<VoiceState>({ kind: "idle" });
  const rec = useRef<Recognition | null>(null);
  const latest = useRef({ readsAsDrink, onHeard });
  latest.current = { readsAsDrink, onHeard };

  useEffect(() => {
    const standalone =
      (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia?.("(display-mode: standalone)").matches === true;
    setOffered(voiceOffered(!!speechCtor(), navigator.userAgent, standalone));
  }, []);

  const detach = useCallback(() => {
    const r = rec.current;
    rec.current = null;
    if (!r) return;
    r.onresult = null;
    r.onerror = null;
    r.onend = null;
    try {
      r.abort();
    } catch {
      // Already stopped.
    }
  }, []);

  useEffect(() => detach, [detach]);

  const stop = useCallback(() => rec.current?.stop(), []);

  const reset = useCallback(() => {
    detach();
    setState({ kind: "idle" });
  }, [detach]);

  const listen = useCallback(() => {
    const Ctor = speechCtor();
    if (!Ctor) return;
    detach();
    const r = new Ctor();
    r.lang = speechLang(regionId, navigator.language);
    r.interimResults = false;
    r.continuous = false;
    r.maxAlternatives = 3;
    let heard = false;
    let failed = false;
    r.onresult = (e) => {
      const result = e.results[e.resultIndex] ?? e.results[e.results.length - 1];
      if (!result?.isFinal) return;
      const text = pickHeard(Array.from(result, (a) => a.transcript), latest.current.readsAsDrink);
      if (!text) return;
      heard = true;
      setState({ kind: "heard", text });
      latest.current.onHeard(text);
    };
    r.onerror = (e) => {
      const message = voiceErrorMessage(e.error);
      if (!message) return;
      failed = true;
      setState({ kind: "failed", message });
    };
    r.onend = () => {
      if (rec.current === r) rec.current = null;
      if (!heard && !failed) setState({ kind: "failed", message: voiceErrorMessage("no-speech") });
    };
    rec.current = r;
    setState({ kind: "listening" });
    try {
      r.start();
    } catch {
      rec.current = null;
      setState({ kind: "failed", message: "The microphone didn't start. Type it instead." });
    }
  }, [regionId, detach]);

  return { offered, state, listen, stop, reset };
}
