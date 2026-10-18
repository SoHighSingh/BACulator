"use client";

import { useEffect, useState } from "react";

import { useRegion } from "~/hooks/useRegion";
import { kgToRegionWeight, REGION_IDS, REGIONS, regionWeightToKg } from "~/lib/region";
import { api } from "~/trpc/react";

interface DetailsFormProps {
  /** Called after a successful save. */
  onSaved?: () => void;
  submitLabel?: string;
}

const choice = (on: boolean) =>
  `press min-h-14 rounded-2xl px-4 text-lg ${on ? "bg-white/[0.14] font-medium shadow-[inset_0_0_0_2px_var(--color-ink)]" : "bg-white/[0.05] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]"}`;

/**
 * Weight, sex and units: what the estimate needs, asked once (ideally sober) and editable any time.
 * Used by the first-run setup and by the You sheet.
 */
export function DetailsForm({ onSaved, submitLabel = "Save" }: DetailsFormProps) {
  const { region, setRegion } = useRegion();
  const [weight, setWeight] = useState("");
  const [sex, setSex] = useState<"male" | "female" | "">("");
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const utils = api.useUtils();
  const info = api.post.userInfo.useQuery();
  const update = api.post.updateUserInfo.useMutation({ onSuccess: () => void utils.post.userInfo.invalidate() });

  useEffect(() => {
    const data = info.data;
    if (!data) return;
    if (data.weight != null) setWeightKg(data.weight);
    if (data.sex === "male" || data.sex === "female") setSex(data.sex);
  }, [info.data]);

  // The saved weight is kg; show it in whatever unit the region uses.
  useEffect(() => {
    if (weightKg != null) setWeight(String(kgToRegionWeight(weightKg, region)));
  }, [weightKg, region]);

  const kg = regionWeightToKg(Number(weight), region);
  const valid = weight !== "" && kg >= 30 && kg <= 300 && sex !== "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setError(null);
    try {
      await update.mutateAsync({ weight: kg, sex });
      setWeightKg(kg);
      setSaved(true);
      onSaved?.();
    } catch {
      setError("Couldn't save. Check your connection and try again.");
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-lg text-ink-2">Standard drinks and units</legend>
        <div className="grid gap-2">
          {REGION_IDS.map((id) => (
            <button key={id} type="button" aria-pressed={region.id === id} onClick={() => setRegion(id)} className={`${choice(region.id === id)} text-left`}>
              {REGIONS[id].label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="details-weight" className="text-lg text-ink-2">
          Weight ({region.weightUnit})
        </label>
        <input
          id="details-weight"
          type="number"
          inputMode="decimal"
          min={kgToRegionWeight(30, region)}
          max={kgToRegionWeight(300, region)}
          step="0.1"
          value={weight}
          onChange={(e) => {
            setWeight(e.target.value);
            setSaved(false);
          }}
          className="min-h-14 rounded-2xl bg-white/[0.05] px-4 text-xl text-ink shadow-[inset_0_0_0_1px_var(--color-line)] focus:shadow-[inset_0_0_0_2px_var(--color-signal)] focus:outline-none"
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-lg text-ink-2">Sex</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["female", "male"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={sex === option}
              onClick={() => {
                setSex(option);
                setSaved(false);
              }}
              className={`${choice(sex === option)} capitalize`}
            >
              {option}
            </button>
          ))}
        </div>
        <p className="text-lg text-ink-2">The formula uses average body water, which differs by sex.</p>
      </fieldset>

      <button type="submit" disabled={!valid || update.isPending} className="press key-glow min-h-16 rounded-full bg-ink text-xl font-medium text-bg disabled:opacity-50">
        {update.isPending ? "Saving…" : saved ? "Saved" : submitLabel}
      </button>
      {error && (
        <p role="alert" className="text-lg font-medium text-alert">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="text-lg">
          Saved. Your estimate now uses these details.
        </p>
      )}
    </form>
  );
}
