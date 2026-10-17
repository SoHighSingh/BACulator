"use client";

import { signIn, useSession } from "next-auth/react";
import { useState } from "react";

import { Landing } from "~/components/landing/Landing";
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
      <main>
        <Landing onStart={() => setIsTermsDialogOpen(true)} />
        <TermsAndDisclaimerDialog
          isOpen={isTermsDialogOpen}
          onClose={() => setIsTermsDialogOpen(false)}
          onContinue={() => {
            setIsTermsDialogOpen(false);
            void signIn("google");
          }}
        />
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-bg text-ink">
      <NightScreen userWeight={userWeight} userSex={userSex} onOpenUserInfo={openUserInfo} />
    </main>
  );
}
