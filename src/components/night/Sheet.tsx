"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Held, useHeld } from "~/hooks/usePresence";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Read by screen readers when the sheet opens. */
  description?: string;
  children: React.ReactNode;
  /** Bottom inset (the on-screen keyboard), so the last control is never hidden. */
  keyboardInset?: number;
}

/** A pull past this many px (or a quick flick) closes the sheet; anything less springs back. */
const DISMISS_PX = 110;
const FLICK_PX_PER_MS = 0.6;

/**
 * A glass bottom sheet on Radix Dialog: focus moves in and stays in, the page behind is inert,
 * Escape and the close key dismiss it, and focus returns to whatever opened it.
 *
 * It leaves the way it came: Radix keeps it mounted while `.sheet[data-state=closed]` plays
 * `sheet-down` (globals.css), and the scrim fades on the same clock. While it leaves it keeps
 * showing what it last showed (`useHeld`), so a sheet whose content depends on `open` never
 * blanks mid-slide. The handle and header can be pulled down to close, like a native sheet; the
 * Close key stays the one way that needs no gesture.
 */
export function Sheet({ open, onOpenChange, title, description, children, keyboardInset = 0 }: SheetProps) {
  const shownTitle = useHeld(open, title);
  const shownDescription = useHeld(open, description);
  const content = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; y: number; t: number; dy: number; v: number } | null>(null);

  function settle(el: HTMLElement) {
    delete el.dataset.dragging;
    el.style.translate = "";
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || (e.target as Element).closest("button, a, input")) return;
    drag.current = { id: e.pointerId, y: e.clientY, t: e.timeStamp, dy: 0, v: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
    if (content.current) content.current.dataset.dragging = "";
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    const el = content.current;
    if (d?.id !== e.pointerId || !el) return;
    const dy = Math.max(0, e.clientY - d.y);
    const dt = Math.max(1, e.timeStamp - d.t);
    d.v = (dy - d.dy) / dt;
    d.dy = dy;
    d.t = e.timeStamp;
    el.style.translate = `0 ${dy}px`;
  }

  function onPointerEnd(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    const el = content.current;
    if (d?.id !== e.pointerId || !el) return;
    drag.current = null;
    const dismiss = e.type === "pointerup" && (d.dy > DISMISS_PX || (d.dy > 24 && d.v > FLICK_PX_PER_MS));
    if (dismiss) {
      // Leave from where the finger let go: sheet-down carries on from this offset.
      delete el.dataset.dragging;
      onOpenChange(false);
      // If the owner kept it open after all, spring back rather than hang mid-pull.
      requestAnimationFrame(() => el.dataset.state === "open" && settle(el));
    } else {
      settle(el);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-scrim fixed inset-0 z-40 bg-black/55" />
        <Dialog.Content
          ref={content}
          className="glass glass-strong sheet app-shell fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full max-w-[520px] flex-col rounded-t-sheet text-ink outline-none"
          style={{ paddingBottom: `max(${keyboardInset}px, env(safe-area-inset-bottom))` }}
        >
          <div
            className="shrink-0 cursor-grab touch-none select-none active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
          >
            <span aria-hidden="true" className="mx-auto mt-2.5 block h-1.5 w-10 rounded-circle bg-white/25" />
            <header className="flex items-center justify-between gap-3 px-5 pt-3 pb-2">
              <Dialog.Title className="text-[22px] font-semibold tracking-[-0.02em]">{shownTitle}</Dialog.Title>
              <Dialog.Close aria-label="Close" className="press grid size-12 place-items-center rounded-key bg-white/10 hover:bg-white/15">
                <X aria-hidden="true" className="size-5" strokeWidth={2.25} />
              </Dialog.Close>
            </header>
          </div>
          <Dialog.Description className="sr-only">{shownDescription ?? shownTitle}</Dialog.Description>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-1 pb-5">
            <Held open={open}>{children}</Held>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}


/** Keeps the bottom of a fixed sheet above the on-screen keyboard (iOS and Android don't resize it). */
export function useKeyboardInset(active: boolean) {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!active || !vv) return;
    const update = () => setInset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [active]);
  return inset;
}
