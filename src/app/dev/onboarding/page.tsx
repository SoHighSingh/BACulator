import { notFound } from "next/navigation";

import { DevOnboarding } from "./DevOnboarding";

// Dev-only preview of the first-run setup (404 in production).
export const dynamic = "force-dynamic";

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DevOnboarding />;
}
