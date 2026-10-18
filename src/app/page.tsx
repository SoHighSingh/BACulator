"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { Landing } from "~/components/landing/Landing";
import { NightScreen } from "~/components/night/NightScreen";
import { TermsAndDisclaimerDialog } from "~/components/TermsAndDisclaimerDialog";
import { useUserInfo } from "~/components/UserInfoSlideOutProvider";
import { useUserInfoData } from "~/hooks/useUserInfoData";
import { needsConsent, parsePendingConsent, PENDING_CONSENT_KEY, TERMS_VERSION } from "~/lib/consent";
import { api } from "~/trpc/react";

function savePendingConsent() {
  try {
    window.localStorage.setItem(
      PENDING_CONSENT_KEY,
      JSON.stringify({ termsVersion: TERMS_VERSION, agreedAt: new Date().toISOString() }),
    );
  } catch {
    // Blocked storage: the consent step is shown again after sign-in instead.
  }
}

function takePendingConsent() {
  try {
    const pending = parsePendingConsent(window.localStorage.getItem(PENDING_CONSENT_KEY));
    window.localStorage.removeItem(PENDING_CONSENT_KEY);
    return pending;
  } catch {
    return null;
  }
}

export default function Home() {
  const { data: session, status } = useSession();
  const authenticated = status === "authenticated";
  const { openUserInfo } = useUserInfo();
  const { userWeight, userSex } = useUserInfoData(authenticated);
  const [isTermsDialogOpen, setIsTermsDialogOpen] = useState(false);

  const utils = api.useUtils();
  const consent = api.post.consentStatus.useQuery(undefined, { enabled: authenticated });
  const recordConsent = api.post.recordConsent.useMutation({
    onSuccess: () => utils.post.consentStatus.invalidate(),
  });
  const mustConsent = consent.isSuccess && needsConsent(consent.data.termsVersion);

  // Consent given on the landing page is saved to the account as soon as sign-in finishes.
  const [pendingChecked, setPendingChecked] = useState(false);
  const { mutate: saveConsent } = recordConsent;
  useEffect(() => {
    if (!mustConsent || pendingChecked) return;
    setPendingChecked(true);
    if (takePendingConsent()) saveConsent({ termsVersion: TERMS_VERSION, ageConfirmed: true });
  }, [mustConsent, pendingChecked, saveConsent]);

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
          onAgree={() => {
            savePendingConsent();
            setIsTermsDialogOpen(false);
            void signIn("google");
          }}
        />
      </main>
    );
  }

  // Signed in without agreeing to the current terms (new wording, or an account from before the
  // consent step): ask before showing the night screen. If the check itself fails (offline, server
  // down) the night screen still opens: nothing may stand between someone and their logged drinks.
  if (consent.isPending || (mustConsent && (!pendingChecked || recordConsent.isPending))) {
    return <main className="min-h-dvh bg-bg" aria-busy="true" />;
  }

  if (mustConsent) {
    return (
      <main className="min-h-dvh bg-bg">
        <TermsAndDisclaimerDialog
          isOpen
          agreeLabel="Continue"
          busy={recordConsent.isPending}
          error={recordConsent.isError ? "That didn't save. Check your signal and try again." : undefined}
          onClose={() => void signOut({ callbackUrl: "/" })}
          onAgree={() => recordConsent.mutate({ termsVersion: TERMS_VERSION, ageConfirmed: true })}
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
