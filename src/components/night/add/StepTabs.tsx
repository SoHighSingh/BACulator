"use client";

export type Step = "amount" | "when";

/**
 * "1 How much · 2 When" at the top of the add and change sheets. Both are tappable, so a change
 * can go straight to the time, and adding can go back to the amount.
 */
export function StepTabs({ step, onStep }: { step: Step; onStep: (s: Step) => void }) {
  const tabs: { id: Step; n: number; label: string }[] = [
    { id: "amount", n: 1, label: "How much" },
    { id: "when", n: 2, label: "When" },
  ];
  return (
    <nav aria-label="Steps" className="grid grid-cols-2 gap-2">
      {tabs.map((t) => {
        const on = t.id === step;
        return (
          <button
            key={t.id}
            type="button"
            aria-current={on ? "step" : undefined}
            aria-label={`Step ${t.n} of 2, ${t.label.toLowerCase()}`}
            onClick={() => onStep(t.id)}
            className={`press flex min-h-12 items-center justify-center gap-2 rounded-key text-lg ${
              on ? "bg-white/[0.12] font-semibold text-ink shadow-[inset_0_0_0_1px_rgb(255_255_255/0.16)]" : "text-ink-2 hover:bg-white/[0.06]"
            }`}
          >
            <span
              aria-hidden="true"
              className={`grid size-6 place-items-center rounded-circle text-sm font-semibold tabular-nums ${on ? "bg-ink text-bg" : "bg-white/10"}`}
            >
              {t.n}
            </span>
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
