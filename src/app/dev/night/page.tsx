import { notFound } from "next/navigation";

import { DevNight } from "./DevNight";

// Checked on the server per request, so production never serves the sample screen.
export const dynamic = "force-dynamic";

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DevNight />;
}
