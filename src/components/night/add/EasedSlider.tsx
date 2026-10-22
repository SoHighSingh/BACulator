"use client";

import { useRef, useState } from "react";

import type { EasedScale } from "~/lib/eased-scale";

interface EasedSliderProps {
  scale: EasedScale;
  /** The current (rounded) value. */
  value: number;
  /** Called with the rounded value while dragging and on every key step. */
  onChange: (value: number) => void;
  /** Called once a drag ends or a key step lands: the moment to announce the value. */
  onCommit?: (value: number) => void;
  /** Right to left: the time slider has "now" on the right, so its values run backwards. */
  reversed?: boolean;
  label: string;
  /** What a screen reader says for a value: "9:40 pm, 1 hour 20 minutes ago". */
  valueText: (value: number) => string;
  /** Bigger keyboard jumps (PageUp / PageDown). */
  pageStep: number;
}

const THUMB = 32;
/** The thumb answers a press this far either side of its centre (a 56 px zone). */
const GRAB = 28;

/**
 * A continuous, eased slider. The thumb follows the finger at sub-pixel resolution through the
 * scale's curve; the value is rounded while it moves, and the thumb settles on that value when
 * it's let go. Only the thumb drags: a stray touch on the track does nothing, and `touch-action:
 * none` keeps a slightly diagonal drag from turning into a scroll. The keys step one rounded value
 * (PageUp/PageDown further, Home/End to the ends); −/+ keys and typing live beside it, so dragging
 * is never the only way.
 */
export function EasedSlider({ scale, value, onChange, onCommit, reversed = false, label, valueText, pageStep }: EasedSliderProps) {
  const track = useRef<HTMLDivElement>(null);
  const grab = useRef<{ offset: number; pointerId: number } | null>(null);
  // The finger's own position while dragging, so the thumb doesn't hop between rounded values.
  const [dragT, setDragT] = useState<number | null>(null);

  const toPos = (t: number) => (reversed ? 1 - t : t);
  const pos = dragT ?? toPos(scale.toT(value));

  function geometry() {
    const r = track.current!.getBoundingClientRect();
    return { left: r.left + THUMB / 2, width: Math.max(1, r.width - THUMB) };
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const { left, width } = geometry();
    const thumbX = left + pos * width;
    if (Math.abs(e.clientX - thumbX) > GRAB) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    grab.current = { offset: e.clientX - thumbX, pointerId: e.pointerId };
    setDragT(pos);
    e.currentTarget.querySelector<HTMLElement>("[role=slider]")?.focus({ preventScroll: true });
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (grab.current?.pointerId !== e.pointerId) return;
    const g = grab.current;
    const { left, width } = geometry();
    const p = Math.min(1, Math.max(0, (e.clientX - g.offset - left) / width));
    setDragT(p);
    const next = scale.round(scale.fromT(toPos(p)));
    if (next !== value) onChange(next);
  }

  function release(e: React.PointerEvent<HTMLDivElement>) {
    if (grab.current?.pointerId !== e.pointerId) return;
    grab.current = null;
    setDragT(null);
    onCommit?.(value);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    // Right/up is always "more" on screen: for the reversed time slider that's later (fewer minutes ago).
    const up: 1 | -1 = reversed ? -1 : 1;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = scale.step(value, up);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = scale.step(value, up === 1 ? -1 : 1);
    else if (e.key === "PageUp") next = scale.round(value + up * pageStep);
    else if (e.key === "PageDown") next = scale.round(value - up * pageStep);
    else if (e.key === "Home") next = reversed ? scale.max : scale.min;
    else if (e.key === "End") next = reversed ? scale.min : scale.max;
    if (next === null) return;
    e.preventDefault();
    onChange(next);
    onCommit?.(next);
  }

  const dragging = dragT !== null;
  return (
    <div
      ref={track}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={release}
      onPointerCancel={release}
      className="relative h-14 w-full touch-none select-none"
    >
      {/* The track runs between the thumb's centres at the two ends. */}
      <div aria-hidden="true" className="absolute inset-x-4 top-1/2 h-1.5 -translate-y-1/2 rounded-circle bg-white/12">
        <div
          className={`absolute inset-y-0 rounded-circle bg-signal ${reversed ? "right-0" : "left-0"} ${dragging ? "" : "motion-safe:transition-[width] motion-safe:duration-150 motion-safe:ease-out"}`}
          style={{ width: `${(reversed ? 1 - pos : pos) * 100}%` }}
        />
      </div>
      <div
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={scale.min}
        aria-valuemax={scale.max}
        aria-valuenow={value}
        aria-valuetext={valueText(value)}
        aria-orientation="horizontal"
        onKeyDown={onKeyDown}
        className={`absolute top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 cursor-grab place-items-center rounded-circle outline-none focus-visible:ring-2 focus-visible:ring-ink/70 active:cursor-grabbing ${
          dragging ? "" : "motion-safe:transition-[left] motion-safe:duration-150 motion-safe:ease-out"
        }`}
        style={{ left: `calc(${THUMB / 2}px + ${pos} * (100% - ${THUMB}px))` }}
      >
        <span
          aria-hidden="true"
          className={`block size-8 rounded-circle bg-ink shadow-[0_2px_10px_rgb(0_0_0/0.5)] ${dragging ? "scale-110" : ""} motion-safe:transition-transform motion-safe:duration-150`}
        />
      </div>
    </div>
  );
}
