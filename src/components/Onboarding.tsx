"use client";

import { BrandMark } from "./BrandMark";
import { DetailsForm } from "./DetailsForm";

export const ONBOARDING_SKIPPED_KEY = "baculator:onboarding-skipped";

interface OnboardingProps {
  onDone: () => void;
}

/**
 * First run, before the first night: the estimate needs weight and sex, so ask once, now, while
 * the person is sober, instead of during a night. Skipping is fine: drinks still save and count,
 * and the night screen offers "Add details" later.
 */
export function Onboarding({ onDone }: OnboardingProps) {
  function skip() {
    try {
      window.localStorage.setItem(ONBOARDING_SKIPPED_KEY, "1");
    } catch {
      // Blocked storage: the setup shows again next time, which is harmless.
    }
    onDone();
  }

  return (
    <main className="relative min-h-dvh overflow-x-clip bg-bg text-ink">
      <div className="glass-field" aria-hidden="true" />
      <div className="relative mx-auto flex w-full max-w-[480px] flex-col gap-6 px-4 pt-[max(24px,env(safe-area-inset-top))] pb-[max(32px,env(safe-area-inset-bottom))]">
        <BrandMark size={48} />
        <div>
          <h1 className="text-[34px] leading-tight font-semibold tracking-[-0.03em]">Before your first night</h1>
          <p className="mt-3 text-lg text-ink-2">
            Your estimate needs your weight and sex. Set them now, while it&apos;s easy. They&apos;re only used for the
            estimate, and you can change them any time under You.
          </p>
        </div>
        <section className="card p-5">
          <DetailsForm onSaved={onDone} submitLabel="Save and start" />
        </section>
        <button type="button" onClick={skip} className="press min-h-14 rounded-key text-lg text-ink-2 hover:bg-white/5">
          Skip for now
        </button>
      </div>
    </main>
  );
}

export function onboardingSkipped(): boolean {
  try {
    return window.localStorage.getItem(ONBOARDING_SKIPPED_KEY) === "1";
  } catch {
    return false;
  }
}
