import { Phone, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { useRegion } from "~/hooks/useRegion";
import { callPhrase } from "~/lib/emergency";
import { aboutPoint, formatBand, type NightModel } from "~/lib/estimate-display";
import { formatClock } from "~/lib/format-clock";
import { Sheet } from "./Sheet";

interface EstimateDetailsProps {
  open: boolean;
  onClose: () => void;
  model: NightModel;
}

/**
 * The one sheet about tonight's estimate, whichever way it is opened: the hazard key beside the mark
 * or the number itself (user decision, 18 Oct 2026 late: an estimation calculator and nothing else).
 * The numbers behind the estimate, two factual notes, exactly one disclaimer line, one emergency
 * line for whoever is holding the phone, and the legal links. No rides, no texts, no judgement, and
 * nothing that frames red or the key as a driving state.
 */
export function EstimateDetails({ open, onClose, model }: EstimateDetailsProps) {
  const { emergency } = useRegion();
  const bac = model.bac ?? 0;
  const [lo, hi] = formatBand(bac).split("–");
  const rows: [string, string][] = [];
  if (model.bac !== null) rows.push(["Now", `${aboutPoint(bac)[0] ? "about " : ""}${aboutPoint(bac)[1]}`]);
  if (bac > 0 && hi) rows.push(["Likely range", `${lo} to ${hi}`]);
  if (model.peak) rows.push(["Peak", `about ${aboutPoint(model.peak.bac)[1]} at ${formatClock(model.peak.at)}`]);
  if (model.estimate?.backToZero) rows.push(["Back to zero", model.estimate.backToZero.replace(/^between /, "").replace(" and ", " to ")]);

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="About tonight's estimate"
      description="The numbers behind tonight's estimate, and who to call if someone is in trouble."
    >
      {rows.length > 0 && (
        <dl className="card mt-1 divide-y divide-edge overflow-hidden">
          {rows.map(([k, v]) => (
            <div key={k} className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 px-4 py-2 text-lg">
              <dt className="text-ink-2 whitespace-nowrap">{k}</dt>
              <dd className="ml-auto text-right font-medium whitespace-nowrap">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      <ul className="mt-4 flex flex-col gap-2 px-1 text-lg text-ink-2">
        <li>Only time brings it down.</li>
        <li>The range is wide because bodies and pours vary.</li>
      </ul>

      {/* Exactly one disclaimer line (user decision, 18 Oct 2026 late). */}
      <p className="mt-4 flex items-start gap-3 px-1 text-lg font-medium">
        {model.hazard && <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-alert" strokeWidth={2.25} />}
        Estimate only. It can&apos;t tell you whether you&apos;re fit to drive.
      </p>

      {/* One line for whoever is holding the phone: the whole row is the call link. */}
      <a
        href={`tel:${emergency.dial}`}
        className="press mt-5 flex items-start gap-3 rounded-row bg-[rgb(255_120_100/0.1)] p-4 text-lg shadow-[inset_0_0_0_1px_rgb(255_164_148/0.3)]"
      >
        <Phone aria-hidden="true" className="mt-1 size-5 shrink-0 text-alert" strokeWidth={2.25} />
        <span>
          If someone can&apos;t be woken or is breathing slowly, <span className="font-semibold text-alert underline underline-offset-4">{callPhrase(emergency)}</span>.
        </span>
      </a>

      <p className="mt-4 flex gap-6 px-1 text-lg">
        <Link href="/terms" className="flex min-h-12 items-center text-ink-2 underline underline-offset-4">
          Terms
        </Link>
        <Link href="/privacy" className="flex min-h-12 items-center text-ink-2 underline underline-offset-4">
          Privacy
        </Link>
      </p>
    </Sheet>
  );
}
