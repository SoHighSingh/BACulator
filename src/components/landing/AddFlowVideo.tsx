"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * The add-flow clip. It plays once when it first scrolls into view and stops on its last frame;
 * nothing loops at rest. Under reduced motion it never starts on its own: the poster shows and the
 * Play key is the only way in.
 */
export function AddFlowVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<"idle" | "playing" | "paused" | "ended">("idle");

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          io.disconnect();
          void v.play().catch(() => setState("idle"));
        }
      },
      { threshold: 0.6 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  function toggle() {
    const v = ref.current;
    if (!v) return;
    if (state === "playing") v.pause();
    else {
      if (state === "ended") v.currentTime = 0;
      void v.play();
    }
  }

  const label = state === "playing" ? "Pause" : state === "ended" ? "Play again" : "Play";
  const Icon = state === "playing" ? Pause : state === "ended" ? RotateCcw : Play;

  return (
    <figure className="glass relative overflow-hidden rounded-panel p-2">
      <video
        ref={ref}
        className="block aspect-[4/5] w-full rounded-[calc(var(--radius-panel)-8px)] bg-surface object-cover sm:aspect-[3/4]"
        src="/media/add-flow-loop.mp4"
        poster="/media/add-flow-loop-poster.png"
        muted
        playsInline
        preload="metadata"
        onPlay={() => setState("playing")}
        onPause={(e) => setState(e.currentTarget.ended ? "ended" : "paused")}
        onEnded={() => setState("ended")}
        aria-label="The add flow: tap the microphone, say a drink, check it and add it; the estimate updates."
      />
      <figcaption className="flex min-h-14 items-center justify-between gap-4 px-3 pt-2 pb-1 text-lg">
        <span className="text-ink-2">The night screen, one drink added.</span>
        <button type="button" onClick={toggle} className="press flex min-h-12 shrink-0 items-center gap-2 rounded-key px-4 font-medium ctl-edge hover:bg-white/5">
          <Icon aria-hidden="true" className="size-5" strokeWidth={2.25} />
          {label}
        </button>
      </figcaption>
    </figure>
  );
}
