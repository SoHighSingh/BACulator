import { useRegion } from "~/hooks/useRegion";
import { aboutPoint, type NightModel } from "~/lib/estimate-display";
import { formatClock } from "~/lib/format-clock";

interface NightNumbersProps {
  model: NightModel;
  drinkCount: number;
  totalStandards: number;
}

/** Back to zero, peak and what was counted, aligned like the rows of a results table. */
export function NightNumbers({ model, drinkCount, totalStandards }: NightNumbersProps) {
  const { std } = useRegion();
  const rows: [string, string][] = [];
  const zero = model.estimate?.backToZero;
  if (zero) rows.push(["Back to zero", zero.replace(/^between /, "").replace(" and ", " to ")]);
  if (model.peak) rows.push(["Peak", `about ${aboutPoint(model.peak.bac)[1]} at ${formatClock(model.peak.at)}`]);
  rows.push(["Counted", `${drinkCount} ${drinkCount === 1 ? "drink" : "drinks"} · ${std(totalStandards)} std`]);
  return (
    <section aria-label="Tonight's numbers" className="card overflow-hidden">
      <dl className="divide-y divide-edge">
        {rows.map(([k, v]) => (
          <div key={k} className="flex min-h-14 items-center justify-between gap-4 px-5 py-2 text-lg">
            <dt className="text-ink-2">{k}</dt>
            <dd className="text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-edge px-5 py-3.5 text-lg text-ink-2">Estimate only. Bodies and pours vary.</p>
    </section>
  );
}
