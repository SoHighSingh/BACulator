import { CarFront, MessageSquare, Phone } from "lucide-react";
import Link from "next/link";

import { useRegion } from "~/hooks/useRegion";

const COME_GET_ME = "Hey, can you come and get me? I've been drinking and need a lift home.";

/** Move the pointer light on .lit elements. */
export function lightAt(e: React.PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
}

/**
 * Always present, and usable by whoever is holding the phone: the emergency instruction first,
 * then the ways home, each one tap.
 */
export function GetHome() {
  const { region } = useRegion();
  const call = `Call ${region.emergency}`;
  const row = "press lit flex min-h-14 items-center gap-3 px-5 text-lg font-medium hover:bg-white/[0.03]";
  return (
    <section aria-labelledby="get-home-heading" className="card overflow-hidden">
      <div className="p-5">
        <h2 id="get-home-heading" className="text-lg font-semibold">
          Getting home
        </h2>
        <p className="mt-2 text-lg">
          {call} if someone can&apos;t be woken, is breathing slowly, or is vomiting while drowsy. Stay with them.
        </p>
      </div>
      <div className="divide-y divide-edge border-t border-edge">
        <a href={`tel:${region.emergency}`} onPointerMove={lightAt} className={`${row} font-semibold text-alert`}>
          <Phone aria-hidden="true" className="size-5" strokeWidth={2} />
          {call}
        </a>
        <a href={`sms:?&body=${encodeURIComponent(COME_GET_ME)}`} onPointerMove={lightAt} className={row}>
          <MessageSquare aria-hidden="true" className="size-5" strokeWidth={2} />
          Text a mate
        </a>
        <a href="https://www.google.com/maps/search/taxi+near+me" target="_blank" rel="noopener noreferrer" onPointerMove={lightAt} className={row}>
          <CarFront aria-hidden="true" className="size-5" strokeWidth={2} />
          Find a ride
        </a>
      </div>
      <p className="border-t border-edge px-5 py-3 text-lg text-ink-2">Text a mate opens a message saying you need a lift. You pick who it goes to.</p>
      <p className="flex gap-6 border-t border-edge px-5 text-lg">
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
