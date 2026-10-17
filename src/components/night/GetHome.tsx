import Link from "next/link";

import { useRegion } from "~/hooks/useRegion";

/** Always present, and usable by whoever is holding the phone. */
export function GetHome() {
  const { region } = useRegion();
  const call = `Call ${region.emergency}`;

  return (
    <section aria-labelledby="get-home-heading" className="rounded-[28px] bg-surface-2 p-5">
      <h2 id="get-home-heading" className="text-[22px] font-bold text-ink">
        Getting home
      </h2>
      <p className="mt-1 text-lg text-ink">Book a ride, or get a lift with someone who hasn&apos;t been drinking.</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <a
          href="sms:"
          className="flex min-h-14 items-center justify-center rounded-xl bg-surface-3 text-lg font-semibold text-ink active:bg-line"
        >
          Text a mate
        </a>
        <a
          href={`tel:${region.emergency}`}
          className="flex min-h-14 items-center justify-center rounded-xl bg-surface-3 text-lg font-semibold text-ink active:bg-line"
        >
          {call}
        </a>
      </div>
      <p className="mt-4 text-lg text-ink">
        {call} if someone can&apos;t be woken, is breathing slowly or is vomiting while drowsy.
      </p>
      <p className="mt-2 flex gap-6 text-base">
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
