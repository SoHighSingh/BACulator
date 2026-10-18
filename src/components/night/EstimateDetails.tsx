import { useRegion } from "~/hooks/useRegion";
import { aboutPoint, formatBand, type NightModel } from "~/lib/estimate-display";
import { formatClock } from "~/lib/format-clock";
import { Sheet } from "./Sheet";
import { WarningMark } from "./WarningMark";

interface EstimateDetailsProps {
  open: boolean;
  onClose: () => void;
  model: NightModel;
}

/** What tapping the number explains: why it says not safe to drive, and the numbers behind it. */
export function EstimateDetails({ open, onClose, model }: EstimateDetailsProps) {
  const { region } = useRegion();
  const bac = model.bac ?? 0;
  const [lo, hi] = formatBand(bac).split("–");
  const rows: [string, string][] = [];
  if (model.bac !== null) rows.push(["Now", `${aboutPoint(bac)[0] ? "about " : ""}${aboutPoint(bac)[1]}`]);
  if (bac > 0 && hi) rows.push(["Likely range", `${lo} to ${hi}`]);
  if (model.peak) rows.push(["Peak", `about ${aboutPoint(model.peak.bac)[1]} at ${formatClock(model.peak.at)}`]);
  if (model.estimate?.backToZero) rows.push(["Back to zero", model.estimate.backToZero.replace(/^between /, "").replace(" and ", " to ")]);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()} title="About this estimate" description="Why it says not safe to drive, and the numbers behind the estimate.">
      {model.notSafeToDrive && (
        <section className="rounded-row bg-[rgb(255_120_100/0.1)] p-4 shadow-[inset_0_0_0_1px_rgb(255_164_148/0.3)]">
          <p className="flex items-center gap-2 text-lg font-semibold text-alert">
            <WarningMark className="size-5" />
            Not safe to drive
          </p>
          <p className="mt-2 text-lg">
            Any alcohol slows your reactions, and this is only an estimate. BACulator never says when you&apos;re safe to drive.
            The screen stays red until the slowest likely time you&apos;d be back to zero.
          </p>
        </section>
      )}
      {rows.length > 0 && (
        <dl className="card mt-4 divide-y divide-edge overflow-hidden">
          {rows.map(([k, v]) => (
            <div key={k} className="flex min-h-14 items-center justify-between gap-4 px-4 text-lg">
              <dt className="text-ink-2">{k}</dt>
              <dd className="text-right font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="mt-4 text-lg text-ink-2">
        Bodies and pours vary, so the real number is likely anywhere in the range. If someone can&apos;t be woken or is breathing slowly,
        call {region.emergency}.
      </p>
    </Sheet>
  );
}
