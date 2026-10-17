import Link from "next/link";

import { useRegion } from "~/hooks/useRegion";

const COME_GET_ME = "Hey, can you come and get me? I've been drinking and need a lift home.";

/**
 * Always present, and usable by whoever is holding the phone: the emergency line first, then the
 * ways home, each one tap.
 */
export function GetHome() {
  const { region } = useRegion();
  const call = `Call ${region.emergency}`;

  return (
    <section aria-labelledby="get-home-heading" className="rounded-[28px] bg-surface-2 p-5">
      <h2 id="get-home-heading" className="text-[22px] font-bold text-ink">
        Getting home
      </h2>
      <p className="mt-2 text-lg font-semibold text-ink">
        {call} if someone can&apos;t be woken, is breathing slowly, or is vomiting while drowsy. Stay with them.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <a
          href={`sms:?&body=${encodeURIComponent(COME_GET_ME)}`}
          className="press flex min-h-14 items-center justify-center rounded-xl bg-surface-3 px-2 text-center text-lg font-semibold text-ink active:bg-line"
        >
          Text a mate
        </a>
        <a
          href="https://www.google.com/maps/search/taxi+near+me"
          target="_blank"
          rel="noopener noreferrer"
          className="press flex min-h-14 items-center justify-center rounded-xl bg-surface-3 px-2 text-center text-lg font-semibold text-ink active:bg-line"
        >
          Find a ride
        </a>
        <a
          href={`tel:${region.emergency}`}
          className="press col-span-2 flex min-h-14 items-center justify-center rounded-xl bg-surface-3 text-lg font-bold text-alert active:bg-line"
        >
          {call}
        </a>
      </div>
      <p className="mt-3 text-base text-ink-2">
        Text a mate opens a message saying you need a lift. You pick who it goes to.
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
