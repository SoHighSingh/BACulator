"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn, useSession } from "next-auth/react";

import { clearOutbox } from "~/lib/outbox";
import { signOutHere } from "~/lib/sign-out";
import { api } from "~/trpc/react";

const CONFIRM_WORD = "DELETE";

function saveJson(data: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function DeleteAccountPage() {
  const { data: session, status } = useSession();
  const [confirmText, setConfirmText] = useState("");
  const utils = api.useUtils();
  const [exportState, setExportState] = useState<"idle" | "busy" | "error">("idle");
  const downloadMyData = async () => {
    setExportState("busy");
    try {
      const data = await utils.post.exportMyData.fetch(undefined, { staleTime: 0 });
      saveJson(data, `baculator-data-${data.exportedAt.slice(0, 10)}.json`);
      setExportState("idle");
    } catch {
      setExportState("error");
    }
  };
  const deleteAccount = api.post.deleteAccount.useMutation({
    onSuccess: async () => {
      // The account is gone; so is anything of it kept on this phone.
      if (session?.user?.id) await clearOutbox(session.user.id);
      await signOutHere(null, { callbackUrl: "/" });
    },
  });

  return (
    <main className="min-h-screen bg-black px-4 py-12 text-neutral-200">
      <div className="mx-auto max-w-md space-y-6">
        <h1 className="text-3xl font-bold text-white">Download or delete your data</h1>

        {status === "loading" && <p>Loading…</p>}

        {status === "unauthenticated" && (
          <>
            <p>Sign in with the Google account whose data you want to download or delete.</p>
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
            <section className="space-y-3 rounded-md border border-neutral-800 p-4">
              <h2 className="text-xl font-semibold text-white">Download my data</h2>
              <p>
                Get a copy of your details and every drink you&apos;ve logged, as a JSON file.
                Do this first if you want to keep a record.
              </p>
              <button
                onClick={() => void downloadMyData()}
                disabled={exportState === "busy"}
                className="min-h-12 w-full cursor-pointer rounded-md bg-white px-4 py-2 font-medium text-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                {exportState === "busy" ? "Preparing…" : "Download my data"}
              </button>
              {exportState === "error" && (
                <p role="alert" className="text-sm text-red-400">
                  That didn&apos;t download. Check your signal and try again.
                </p>
              )}
            </section>

            <h2 className="text-xl font-semibold text-white">Delete everything</h2>
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
