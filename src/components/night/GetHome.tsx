import Link from "next/link";

/** Always present, and usable by whoever is holding the phone. */
export function GetHome() {
  return (
    <section aria-labelledby="get-home-heading" className="rounded-2xl bg-surface p-5">
      <h2 id="get-home-heading" className="text-xl font-semibold text-ink">
        Getting home
      </h2>
      <p className="mt-1 text-lg text-ink-2">Book a ride, or get a lift with someone who hasn&apos;t been drinking.</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <a
          href="sms:"
          className="flex min-h-14 items-center justify-center rounded-xl border border-line bg-surface-2 text-lg font-semibold text-ink"
        >
          Text a mate
        </a>
        <a
          href="tel:000"
          className="flex min-h-14 items-center justify-center rounded-xl border border-line bg-surface-2 text-lg font-semibold text-ink"
        >
          Call 000
        </a>
      </div>
      <p className="mt-4 text-base text-ink-2">
        Call 000 if someone can&apos;t be woken, is breathing slowly or is vomiting while drowsy.
      </p>
      <p className="mt-4 flex gap-6 text-base">
        <Link href="/terms" className="min-h-12 py-3 text-ink-2 underline underline-offset-4">
          Terms
        </Link>
        <Link href="/privacy" className="min-h-12 py-3 text-ink-2 underline underline-offset-4">
          Privacy
        </Link>
      </p>
    </section>
  );
}
