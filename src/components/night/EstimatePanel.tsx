import type { EstimateDisplay } from "~/lib/estimate-display";

interface EstimatePanelProps {
  estimate: EstimateDisplay | null;
  onAddDetails: () => void;
  onShowTimeline: () => void;
}

export function EstimatePanel({ estimate, onAddDetails, onShowTimeline }: EstimatePanelProps) {
  if (!estimate) {
    return (
      <section aria-labelledby="estimate-heading" className="rounded-2xl bg-surface p-5">
        <h2 id="estimate-heading" className="text-xl font-semibold text-ink">
          Add your weight to see an estimate
        </h2>
        <p className="mt-2 text-lg text-ink-2">Your drinks still get saved without it.</p>
        <button
          type="button"
          onClick={onAddDetails}
          className="mt-4 min-h-14 w-full rounded-xl border border-line bg-surface-2 px-4 text-lg font-semibold text-ink"
        >
          Add details
        </button>
      </section>
    );
  }

  return (
    <section aria-labelledby="estimate-heading" className="rounded-2xl bg-surface px-5 py-4">
      <h2 id="estimate-heading" className="text-lg font-medium text-ink-2">
        {estimate.band === "0.00" ? "Estimated blood alcohol" : "Estimated blood alcohol, roughly"}
      </h2>
      <p className="mt-1 text-[52px] leading-none font-bold tabular-nums text-ink" aria-live="polite">
        {estimate.band}
      </p>
      <p className="mt-2 text-base text-ink-2">Estimate only. Bodies and pours vary.</p>

      {estimate.status !== "none" && (
        <p className="mt-3 text-lg font-medium text-ink">
          {estimate.status === "rising" ? "↑ Still rising" : "↓ Falling"}
          {estimate.backToZero && <span className="block text-ink-2">Back to zero {estimate.backToZero}</span>}
        </p>
      )}

      {estimate.notSafeToDrive && (
        <p className="mt-3 text-xl font-semibold text-alert">Not safe to drive</p>
      )}

      <button
        type="button"
        onClick={onShowTimeline}
        className="mt-1 min-h-12 text-lg font-medium text-ink underline underline-offset-4"
      >
        See the timeline
      </button>
    </section>
  );
}
