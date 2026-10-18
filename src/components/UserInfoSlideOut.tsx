"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

import { countQueuedAdds } from "~/lib/outbox";
import { signOutHere } from "~/lib/sign-out";
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
  const { data: session } = useSession();
  // Drinks only on this phone, found when Sign out was tapped: asked once before going ahead.
  const [queued, setQueued] = useState(0);

  async function onSignOut() {
    const userId = session?.user?.id;
    if (queued === 0 && userId) {
      const count = await countQueuedAdds(userId).catch(() => 0);
      if (count > 0) {
        setQueued(count);
        return;
      }
    }
    await signOutHere(queryClient);
  }

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
        {queued > 0 && (
          <p role="alert" className="text-lg">
            {queued === 1 ? "1 drink hasn't" : `${queued} drinks haven't`} reached your account yet. If you sign out now{" "}
            {queued === 1 ? "it stays" : "they stay"} on this phone and {queued === 1 ? "syncs" : "sync"} when you sign in here
            again.
          </p>
        )}
        <button
          type="button"
          onClick={() => void onSignOut()}
          className="press min-h-14 rounded-key text-lg font-medium shadow-[inset_0_0_0_1px_var(--color-line)] hover:bg-white/5"
        >
          {queued > 0 ? "Sign out anyway" : "Sign out"}
        </button>
        <Link href="/account/delete" className="min-h-12 py-3 text-lg text-ink-2 underline underline-offset-4">
          Download or delete my data
        </Link>
      </section>
    </Sheet>
  );
}
