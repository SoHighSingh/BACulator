import type { EstimateDisplay } from "~/lib/estimate-display";

interface EstimatePanelProps {
  estimate: EstimateDisplay | null;
  onAddDetails: () => void;
  onShowTimeline: () => void;
}

/** Warning triangle drawn at a 2.5px stroke so it survives a dim screen. Never the only signal. */
function WarningMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-7 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round">
      <path d="M12 3 2 21h20L12 3Z" />
      <path d="M12 10v5M12 18v.01" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The top of the screen, set straight on the page rather than in a card: the band is the largest
 * thing in the app. It keeps a fixed minimum height so the add buttons below never move.
 */
export function EstimatePanel({ estimate, onAddDetails, onShowTimeline }: EstimatePanelProps) {
  if (!estimate) {
    return (
      <section aria-labelledby="estimate-heading" className="flex min-h-[248px] flex-col justify-end gap-3">
        <h2 id="estimate-heading" className="text-[28px] leading-tight font-bold text-ink">
          Add your weight to see an estimate
        </h2>
        <p className="text-lg text-ink-2">Your drinks still get saved without it.</p>
        <button
          type="button"
          onClick={onAddDetails}
          className="min-h-14 w-full rounded-xl bg-surface-2 px-4 text-lg font-semibold text-ink"
        >
          Add details
        </button>
      </section>
    );
  }

  const counted = estimate.band !== "0.00";

  return (
    <section aria-labelledby="estimate-heading" className="flex min-h-[248px] flex-col justify-end">
      <h2 id="estimate-heading" className="text-lg font-medium text-ink-2">
        {counted ? "Estimated blood alcohol, roughly" : "Estimated blood alcohol"}
      </h2>
      <p
        className="text-[clamp(56px,17vw,76px)] leading-[0.95] font-bold tracking-[-0.03em] tabular-nums text-ink"
        aria-live="polite"
      >
        {estimate.band}
      </p>

      {estimate.status !== "none" && (
        <p className="mt-3 text-lg font-medium text-ink">
          {estimate.status === "rising" ? "↑ Still rising" : "↓ Falling"}
          {estimate.backToZero && <span className="text-ink-2"> · back to zero {estimate.backToZero}</span>}
        </p>
      )}

      {estimate.notSafeToDrive && (
        <p className="mt-3 flex items-center gap-2 text-[22px] font-semibold text-alert">
          <WarningMark />
          Not safe to drive
        </p>
      )}

      <p className="mt-2 flex flex-wrap items-center gap-x-4 text-base text-ink-2">
        <span>Estimate only. Bodies and pours vary.</span>
        <button
          type="button"
          onClick={onShowTimeline}
          className="min-h-12 text-lg font-medium text-ink underline underline-offset-4"
        >
          See the timeline
        </button>
      </p>
    </section>
  );
}
