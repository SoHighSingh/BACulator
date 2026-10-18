"use client";

import { useQueryClient } from "@tanstack/react-query";
import { signOut } from "next-auth/react";
import Link from "next/link";

import { clearOfflineCache } from "~/trpc/offline-cache";
import { DetailsForm } from "./DetailsForm";
import { Sheet } from "./night/Sheet";

interface UserInfoSlideOutProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
}

/** The You sheet: weight, sex and units for the estimate, then the account (sign out, delete). */
export default function UserInfoSlideOut({ isOpen, onClose, userName }: UserInfoSlideOutProps) {
  const queryClient = useQueryClient();
  return (
    <Sheet
      open={isOpen}
      onOpenChange={(o) => !o && onClose()}
      title={userName ? `${userName.split(" ")[0]}'s details` : "Your details"}
      description="Used only to work out your estimate. Change them any time."
    >
      <p className="mb-5 text-lg text-ink-2">Used only to work out your estimate. Change them any time.</p>
      <DetailsForm />

      <section aria-labelledby="account-heading" className="mt-10 flex flex-col gap-3 border-t border-edge pt-6">
        <h3 id="account-heading" className="text-lg text-ink-2">
          Account
        </h3>
        <button
          type="button"
          onClick={() => {
            // Nothing of tonight stays on the phone for whoever signs in next.
            queryClient.clear();
            clearOfflineCache();
            void signOut();
          }}
          className="press min-h-14 rounded-full text-lg font-medium shadow-[inset_0_0_0_1px_var(--color-line)] hover:bg-white/5"
        >
          Sign out
        </button>
        <Link href="/account/delete" className="min-h-12 py-3 text-lg text-ink-2 underline underline-offset-4">
          Download or delete my data
        </Link>
      </section>
    </Sheet>
  );
}
