"use client";

import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useState } from "react";

import { NightScreen } from "~/components/night/NightScreen";
import { TermsAndDisclaimerDialog } from "~/components/TermsAndDisclaimerDialog";
import { useUserInfo } from "~/components/UserInfoSlideOutProvider";
import { useUserInfoData } from "~/hooks/useUserInfoData";

export default function Home() {
  const { data: session, status } = useSession();
  const { openUserInfo } = useUserInfo();
  const { userWeight, userSex } = useUserInfoData(status === "authenticated");
  const [isTermsDialogOpen, setIsTermsDialogOpen] = useState(false);

  if (status === "loading") {
    return <main className="min-h-dvh bg-bg" aria-busy="true" />;
  }

  if (!session) {
    return (
      <main className="min-h-dvh bg-bg text-ink">
        <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col justify-center gap-6 px-4 py-10">
          <p className="text-lg font-semibold text-amber">BACulator</p>
          <h1 className="text-4xl leading-tight font-bold">Know roughly where you&apos;re at</h1>
          <p className="text-xl text-ink-2">
            Add beers, wine, spirits or cocktails in one tap and see an estimate of your blood alcohol and when it
            should be back to zero.
          </p>
          <p className="text-lg text-ink-2">An estimate only. It can&apos;t tell you whether you&apos;re fit to drive.</p>
          <button
            type="button"
            onClick={() => setIsTermsDialogOpen(true)}
            className="min-h-[72px] w-full rounded-2xl bg-amber px-5 text-xl font-semibold text-bg"
          >
            Sign in with Google
          </button>
          <p className="flex gap-6 text-base">
            <Link href="/terms" className="min-h-12 py-3 text-ink-2 underline underline-offset-4">
              Terms
            </Link>
            <Link href="/privacy" className="min-h-12 py-3 text-ink-2 underline underline-offset-4">
              Privacy
            </Link>
          </p>
          <TermsAndDisclaimerDialog
            isOpen={isTermsDialogOpen}
            onClose={() => setIsTermsDialogOpen(false)}
            onContinue={() => {
              setIsTermsDialogOpen(false);
              void signIn("google");
            }}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-bg text-ink">
      <NightScreen userWeight={userWeight} userSex={userSex} onOpenUserInfo={openUserInfo} />
    </main>
  );
}
