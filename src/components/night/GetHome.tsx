import { CarFront, ChevronDown, MessageSquare, Phone } from "lucide-react";
import Link from "next/link";

import { useRegion } from "~/hooks/useRegion";
import { callLabel } from "~/lib/emergency";

const COME_GET_ME = "Hey, can you come and get me? I've been drinking and need a lift home.";

/** Move the pointer light on .lit elements. */
export function lightAt(e: React.PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
}

/**
 * Always present, and usable by whoever is holding the phone. Its job is in the title row
 * ("Getting home · Call, text or ride"), the three ways home are equal tiles one tap each, and the
 * emergency instruction sits under a one-line disclosure so a sober friend finds it in one tap
 * without everyone else reading it every night.
 */
export function GetHome() {
  const { emergency } = useRegion();
  const call = callLabel(emergency);
  const tile =
    "press lit flex min-h-[68px] flex-col items-center justify-center gap-1.5 rounded-2xl px-1 py-2 text-center text-lg font-medium leading-tight";
  return (
    <section aria-labelledby="get-home-heading" className="card overflow-hidden">
      <div className="flex flex-wrap items-baseline gap-x-3 px-4 pt-4 pb-3">
        <h2 id="get-home-heading" className="text-lg font-semibold">
          Getting home
        </h2>
        <p className="text-lg text-ink-2">Call, text or ride</p>
      </div>

      {/* Three equal tiles, one tap each. Labels stay one word so the tiles are the same on every phone
          ("Text a mate" is 97px at 18px/500 and only fits a tile from ~405px wide); the full names go to
          screen readers. */}
      <div className="grid grid-cols-3 gap-2 px-4 pb-4">
        <a
          href={`tel:${emergency.dial}`}
          onPointerMove={lightAt}
          className={`${tile} bg-[rgb(255_120_100/0.1)] font-semibold text-alert shadow-[inset_0_0_0_1px_rgb(255_164_148/0.3)]`}
        >
          <Phone aria-hidden="true" className="size-6" strokeWidth={2} />
          <span className={emergency.number ? "whitespace-nowrap" : undefined}>{call}</span>
        </a>
        <a href={`sms:?&body=${encodeURIComponent(COME_GET_ME)}`} onPointerMove={lightAt} className={`${tile} bg-surface-2`}>
          <MessageSquare aria-hidden="true" className="size-6" strokeWidth={2} />
          <span>
            Text<span className="sr-only"> a mate: opens a message saying you need a lift. You pick who it goes to.</span>
          </span>
        </a>
        <a
          href="https://www.google.com/maps/search/taxi+near+me"
          target="_blank"
          rel="noopener noreferrer"
          onPointerMove={lightAt}
          className={`${tile} bg-surface-2`}
        >
          <CarFront aria-hidden="true" className="size-6" strokeWidth={2} />
          <span>
            <span className="sr-only">Find a </span>Ride
          </span>
        </a>
      </div>

      {/* Native disclosure: a button to screen readers, one tap for the sober friend, closed by default. */}
      <details className="group border-t border-edge">
        <summary className="press lit flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 text-lg font-medium [&::-webkit-details-marker]:hidden">
          <Phone aria-hidden="true" className="size-5 shrink-0 text-alert" strokeWidth={2} />
          <span className="grow">When to {emergency.number ? `call ${emergency.number}` : "call for help"}</span>
          <ChevronDown aria-hidden="true" className="size-5 shrink-0 text-ink-2 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" strokeWidth={2} />
        </summary>
        <p className="px-4 pt-1 pb-4 text-lg">
          {call} if someone can&apos;t be woken, is breathing slowly, or is vomiting while drowsy. Stay with them.
        </p>
      </details>

      <p className="flex gap-6 border-t border-edge px-4 text-lg">
        <Link href="/terms" className="flex min-h-12 items-center text-ink-2 underline underline-offset-4">
          Terms
        </Link>
        <Link href="/privacy" className="flex min-h-12 items-center text-ink-2 underline underline-offset-4">
          Privacy
        </Link>
      </p>
    </section>
  );
}
