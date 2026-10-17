import Link from "next/link";

export default function LegalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="min-h-screen bg-black px-4 py-12 text-neutral-200">
      <article className="mx-auto max-w-2xl space-y-6 leading-relaxed [&_a]:underline [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-white [&_h2]:pt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc">
        {children}
        <nav className="flex gap-4 border-t border-neutral-800 pt-6 text-sm text-neutral-400">
          <Link href="/">BACulator</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
      </article>
    </main>
  );
}
