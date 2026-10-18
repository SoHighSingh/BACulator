import { notFound } from "next/navigation";

import { Morph } from "./Morph";

// Dev only: a toggle for the calm ↔ not-safe morph on the real night screen (`?alert` starts red).
export const dynamic = "force-dynamic";

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Morph />;
}
