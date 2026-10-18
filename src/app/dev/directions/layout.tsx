import { notFound } from "next/navigation";

// Design directions under review. Checked per request, so production never serves them.
export const dynamic = "force-dynamic";

export default function Layout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return children;
}
