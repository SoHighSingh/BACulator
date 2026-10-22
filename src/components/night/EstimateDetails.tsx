import { Phone } from "lucide-react";
import Link from "next/link";

import { useRegion } from "~/hooks/useRegion";
import { callPhrase } from "~/lib/emergency";
import { formatBand, type NightModel } from "~/lib/estimate-display";
import { nightRows } from "./NightNumbers";
import { Sheet } from "./Sheet";

interface EstimateDetailsProps {
  open: boolean;
  onClose: () => void;
  model: NightModel;
}

/**
 * The one sheet about tonight's estimate, whichever way it is opened: the hazard key beside the mark
 * or the number itself. Distilled (user decision, 22 Oct 2026: "reduce clutter like crazy"): the
 * likely range as the one big line (the thing the number can't say), the same two times as the
 * Numbers card, exactly one disclaimer, one emergency line for whoever is holding the phone, and
 * the legal links last and quietest. No Now (the number is behind the sheet), no Peak (it is on the
 * bar), no notes, no card inside the sheet, nothing framed as a driving state.
 */
export function EstimateDetails({ open, onClose, model }: EstimateDetailsProps) {
  const { emergency } = useRegion();
  const bac = model.bac;
  const [lo, hi] = bac !== null ? formatBand(bac).split("–") : [];
  const likely = bac === null ? null : bac > 0 && hi ? `${lo} to ${hi}` : bac > 0 ? "under 0.01" : null;
  const rows = nightRows(model);

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="About tonight's estimate"
      description="The likely range, when it wears off, and who to call if someone is in trouble."
    >
      {likely && (
        <p className="mt-2">
          <span className="block text-lg text-ink-2">Likely</span>
          <span className="block text-[34px] leading-tight font-medium tracking-[-0.03em] tabular-nums">{likely}</span>
        </p>
      )}

      {rows.length > 0 && (
        <dl className="mt-4 divide-y divide-edge">
          {rows.map(([k, v]) => (
            <div key={k} className="flex min-h-[52px] flex-wrap items-center justify-between gap-x-4 py-2 text-lg">
              <dt className="text-ink-2 whitespace-nowrap">{k}</dt>
              <dd className="ml-auto text-right font-medium whitespace-nowrap tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* Exactly one disclaimer line (user decisions, 18 and 22 Oct 2026). */}
      <p className="mt-5 text-lg text-ink-2">Estimate only. It can&apos;t tell you whether you&apos;re fit to drive.</p>

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

      <p className="mt-3 flex gap-6 text-lg">
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
