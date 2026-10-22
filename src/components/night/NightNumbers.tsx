import type { NightModel } from "~/lib/estimate-display";

/**
 * The two forward-looking times, as table rows (user decision, 22 Oct 2026): Back to zero, and
 * Below 0.05, which is when the red field ends (the drawn number drops under 0.050). Both are the
 * model's own time with "about" (user decision, 23 Oct 2026). Peak lives on the bar, the count lives in Your tab, and the one
 * disclaimer lives in the details sheet.
 */
export function nightRows(model: NightModel): [string, string][] {
  const rows: [string, string][] = [];
  const zero = model.estimate?.backToZero;
  const below = model.estimate?.belowAlert;
  if (zero) rows.push(["Back to zero", zero]);
  if (below) rows.push(["Below 0.05", below]);
  return rows;
}

export function NightNumbers({ model }: { model: NightModel }) {
  const rows = nightRows(model);
  if (rows.length === 0) return null;
  return (
    <section aria-label="When it wears off" className="card overflow-hidden">
      <dl className="divide-y divide-edge">
        {rows.map(([k, v]) => (
          <div key={k} className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 px-5 py-2 text-lg leading-snug">
            <dt className="text-ink-2 whitespace-nowrap">{k}</dt>
            <dd className="ml-auto text-right font-medium whitespace-nowrap tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
