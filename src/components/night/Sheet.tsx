"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

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

/**
 * A glass bottom sheet on Radix Dialog: focus moves in and stays in, the page behind is inert,
 * Escape and the close key dismiss it, and focus returns to whatever opened it.
 */
export function Sheet({ open, onOpenChange, title, description, children, keyboardInset = 0 }: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/55" />
        <Dialog.Content
          className="glass glass-strong sheet app-shell fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full max-w-[520px] flex-col rounded-t-[32px] text-ink outline-none"
          style={{ paddingBottom: `max(${keyboardInset}px, env(safe-area-inset-bottom))` }}
        >
          <span aria-hidden="true" className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-white/25" />
          <header className="flex shrink-0 items-center justify-between gap-3 px-5 pt-3 pb-2">
            <Dialog.Title className="text-[22px] font-semibold tracking-[-0.02em]">{title}</Dialog.Title>
            <Dialog.Close aria-label="Close" className="press grid size-12 place-items-center rounded-full bg-white/10 hover:bg-white/15">
              <X aria-hidden="true" className="size-5" strokeWidth={2.25} />
            </Dialog.Close>
          </header>
          {description ? (
            <Dialog.Description className="sr-only">{description}</Dialog.Description>
          ) : (
            <Dialog.Description className="sr-only">{title}</Dialog.Description>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-1 pb-5">{children}</div>
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
