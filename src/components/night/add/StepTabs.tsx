"use client";

export type Step = "amount" | "when";

const TABS: { id: Step; label: string }[] = [
  { id: "amount", label: "How much" },
  { id: "when", label: "When" },
];

/**
 * How much / When, as one two-part switch at the top of the add and change sheets. Both halves
 * are tappable, so a change can go straight to the time and adding can go back to the amount.
 */
export function StepTabs({ step, onStep }: { step: Step; onStep: (s: Step) => void }) {
  return (
    <nav aria-label="Steps" className="grid grid-cols-2 gap-1 rounded-key bg-white/[0.06] p-1">
      {TABS.map((t, i) => {
        const on = t.id === step;
        return (
          <button
            key={t.id}
            type="button"
            aria-current={on ? "step" : undefined}
            aria-label={`Step ${i + 1} of 2, ${t.label.toLowerCase()}`}
            onClick={() => onStep(t.id)}
            className={`press min-h-12 rounded-[10px] text-lg ${on ? "bg-white/[0.14] font-semibold text-ink" : "font-medium text-ink-2 hover:text-ink"}`}
          >
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
