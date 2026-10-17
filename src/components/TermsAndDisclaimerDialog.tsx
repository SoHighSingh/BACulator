"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";

import { useRegion } from "~/hooks/useRegion";
import { legalAgeFor } from "~/lib/consent";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";

interface TermsAndDisclaimerDialogProps {
  isOpen: boolean;
  /** "Not now". Before sign-in this just closes; after sign-in the page signs the user out. */
  onClose: () => void;
  /** Called only once the age box is ticked. */
  onAgree: () => void;
  /** Label for the main button: "Continue with Google" before sign-in, "Continue" after. */
  agreeLabel?: string;
  busy?: boolean;
  /** Shown above the buttons when saving the answer failed. */
  error?: string;
}

/**
 * The consent step: estimate only, never for driving decisions, legal drinking age, and what we store.
 * Kept short on purpose; the full wording lives on /terms and /privacy.
 */
export function TermsAndDisclaimerDialog({
  isOpen,
  onClose,
  onAgree,
  agreeLabel = "Continue with Google",
  busy = false,
  error,
}: TermsAndDisclaimerDialogProps) {
  const { region, setRegion } = useRegion();
  const age = legalAgeFor(region.id);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const checkboxId = useId();

  // The age changes with the region, so a tick for "18 or older" never carries over to "21 or older".
  useEffect(() => setAgeConfirmed(false), [age, isOpen]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
        // Blur active element when dialog opens to prevent aria-hidden warning
        if (open && document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }}
    >
      <DialogContent className="flex max-h-[85dvh] w-[92vw] max-w-md flex-col overflow-hidden rounded-2xl border border-line bg-surface">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-2xl font-semibold text-ink">Before you start</DialogTitle>
          <DialogDescription className="text-lg text-ink-2">Three things to know.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-1 text-lg text-ink">
          <ul className="space-y-4">
            <li>
              <strong className="font-semibold">It&apos;s only a guess.</strong> Your real blood alcohol can be much
              higher than we show.
            </li>
            <li>
              <strong className="font-semibold">Never use it to decide if you can drive.</strong> If you&apos;ve had a
              drink, don&apos;t drive.
            </li>
            <li>
              We store your drinks, weight and sex to estimate your blood alcohol.{" "}
              <Link href="/privacy" target="_blank" className="text-amber underline underline-offset-4">
                Privacy
              </Link>
            </li>
          </ul>

          <label
            htmlFor={checkboxId}
            className="flex min-h-14 cursor-pointer items-center gap-4 rounded-xl border border-line bg-surface-2 px-4 py-3"
          >
            <input
              id={checkboxId}
              type="checkbox"
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
              className="size-7 flex-shrink-0 cursor-pointer accent-amber"
            />
            <span className="font-semibold">I&apos;m {age} or older</span>
          </label>

          <p className="text-base text-ink-2">
            {region.id === "us" ? "Not in the US? " : "In the US? "}
            <button
              type="button"
              onClick={() => setRegion(region.id === "us" ? "metric" : "us")}
              className="min-h-12 cursor-pointer text-amber underline underline-offset-4"
            >
              {region.id === "us" ? "Switch to 18+" : "Switch to US (21+)"}
            </button>
          </p>

          <p className="text-base text-ink-2">
            By continuing you agree to the{" "}
            <Link href="/terms" target="_blank" className="text-amber underline underline-offset-4">
              Terms
            </Link>
            .
          </p>
          {error && (
            <p role="alert" className="text-base text-alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="flex flex-shrink-0 gap-3 border-t border-line/40 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="min-h-14 flex-1 rounded-xl border-line bg-surface-2 text-lg text-ink"
          >
            Not now
          </Button>
          <Button
            onClick={onAgree}
            disabled={!ageConfirmed || busy}
            className="min-h-14 flex-1 rounded-xl bg-amber text-lg font-semibold text-bg hover:bg-amber disabled:opacity-40"
          >
            {agreeLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
