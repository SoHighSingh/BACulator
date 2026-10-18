"use client";

import { Onboarding } from "~/components/Onboarding";

export function DevOnboarding() {
  return <Onboarding onDone={() => window.location.assign("/dev/night")} />;
}
