import { notFound } from "next/navigation";

import { RisingLab } from "./RisingLab";

// Dev only: variants of the rising / falling cue on the range bar.
export const dynamic = "force-dynamic";

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <RisingLab />;
}
