import { notFound } from "next/navigation";

import { GaugeLab } from "./GaugeLab";

export const dynamic = "force-dynamic";

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <GaugeLab />;
}
