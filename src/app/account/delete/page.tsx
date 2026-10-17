"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";

import { api } from "~/trpc/react";

const CONFIRM_WORD = "DELETE";

export default function DeleteAccountPage() {
  const { data: session, status } = useSession();
  const [confirmText, setConfirmText] = useState("");
  const deleteAccount = api.post.deleteAccount.useMutation({
    onSuccess: () => signOut({ callbackUrl: "/" }),
  });

  return (
    <main className="min-h-screen bg-black px-4 py-12 text-neutral-200">
      <div className="mx-auto max-w-md space-y-6">
        <h1 className="text-3xl font-bold text-white">Delete your account</h1>

        {status === "loading" && <p>Loading…</p>}

        {status === "unauthenticated" && (
          <>
            <p>Sign in with the Google account you want to delete.</p>
            <button
              onClick={() => signIn("google", { callbackUrl: "/account/delete" })}
              className="cursor-pointer rounded-md bg-white px-4 py-2 font-medium text-black"
            >
              Sign in with Google
            </button>
          </>
        )}

        {status === "authenticated" && (
          <>
            <p>
              This permanently deletes the BACulator account for{" "}
              <strong className="text-white">{session.user.email}</strong>: your weight,
              sex, every drink and session you&apos;ve logged, and your sign-in. It
              can&apos;t be undone.
            </p>
            <label className="block space-y-2">
              <span className="text-sm">
                Type <strong className="text-white">{CONFIRM_WORD}</strong> to confirm
              </span>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoComplete="off"
                className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
              />
            </label>
            <button
              disabled={confirmText !== CONFIRM_WORD || deleteAccount.isPending}
              onClick={() => deleteAccount.mutate()}
              className="w-full cursor-pointer rounded-md bg-red-600 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {deleteAccount.isPending ? "Deleting…" : "Delete my account"}
            </button>
            {deleteAccount.error && (
              <p className="text-sm text-red-400">
                Something went wrong: {deleteAccount.error.message}. Please try again.
              </p>
            )}
          </>
        )}

        <p className="text-sm text-neutral-400">
          <Link href="/" className="underline">
            Back to BACulator
          </Link>{" "}
          ·{" "}
          <Link href="/privacy" className="underline">
            Privacy
          </Link>
        </p>
      </div>
    </main>
  );
}
