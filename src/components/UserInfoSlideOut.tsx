"use client";

import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";

import { api } from "~/trpc/react";

interface UserInfoSlideOutProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
}

/** Weight and sex, asked once (ideally sober), used only by the estimate. */
export default function UserInfoSlideOut({ isOpen, onClose, userName }: UserInfoSlideOutProps) {
  const [weight, setWeight] = useState("");
  const [sex, setSex] = useState<"male" | "female" | "">("");
  const [saved, setSaved] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const utils = api.useUtils();
  const updateUserInfo = api.post.updateUserInfo.useMutation({
    onSuccess: () => void utils.post.userInfo.invalidate(),
  });
  const userInfoQuery = api.post.userInfo.useQuery(undefined, { enabled: isOpen });

  useEffect(() => {
    if (!isOpen) return;
    setSaved(false);
    headingRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    const data = userInfoQuery.data;
    if (!data) return;
    if (data.weight != null) setWeight(String(data.weight));
    if (data.sex === "male" || data.sex === "female") setSex(data.sex);
  }, [userInfoQuery.data]);

  if (!isOpen) return null;

  const weightNumber = Number(weight);
  const valid = weight !== "" && weightNumber >= 30 && weightNumber <= 300 && sex !== "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sex === "" || !valid) return;
    await updateUserInfo.mutateAsync({ weight: weightNumber, sex });
    setSaved(true);
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="profile-heading" className="fixed inset-0 z-[60] overflow-y-auto bg-bg text-ink">
      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col gap-6 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
        <header className="flex items-center justify-between gap-4">
          <h2 id="profile-heading" ref={headingRef} tabIndex={-1} className="text-2xl font-semibold outline-none">
            {userName ? `${userName}'s details` : "Your details"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 min-w-20 rounded-xl border border-line px-4 text-lg font-medium"
          >
            Close
          </button>
        </header>

        <p className="text-lg text-ink-2">Used only to work out your estimate. Change them any time.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="weight" className="text-lg font-medium">
              Weight (kg)
            </label>
            <input
              id="weight"
              type="number"
              inputMode="decimal"
              min={30}
              max={300}
              step="0.1"
              value={weight}
              onChange={(e) => {
                setWeight(e.target.value);
                setSaved(false);
              }}
              className="min-h-14 rounded-xl border border-line bg-surface px-4 text-xl"
            />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-lg font-medium">Sex</legend>
            <div className="grid grid-cols-2 gap-3">
              {(["female", "male"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={sex === option}
                  onClick={() => {
                    setSex(option);
                    setSaved(false);
                  }}
                  className={`min-h-14 rounded-xl border bg-surface-2 text-lg font-semibold capitalize ${
                    sex === option ? "border-amber ring-2 ring-amber" : "border-line"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <p className="text-base text-ink-2">The formula uses average body water, which differs by sex.</p>
          </fieldset>

          <button
            type="submit"
            disabled={!valid || updateUserInfo.isPending}
            className="min-h-[72px] rounded-2xl bg-amber text-xl font-semibold text-bg disabled:opacity-60"
          >
            {updateUserInfo.isPending ? "Saving…" : saved ? "Saved" : "Save details"}
          </button>
          {saved && (
            <p role="status" className="text-lg font-medium">
              Saved. Your estimate now uses these details.
            </p>
          )}
        </form>

        <section aria-labelledby="account-heading" className="mt-10 flex flex-col gap-4 border-t border-line/40 pt-6">
          <h3 id="account-heading" className="text-lg font-medium text-ink-2">
            Account
          </h3>
          <button
            type="button"
            onClick={() => void signOut()}
            className="min-h-14 rounded-xl border border-line px-4 text-lg font-semibold"
          >
            Sign out
          </button>
          <Link href="/account/delete" className="min-h-12 py-3 text-base text-ink-2 underline underline-offset-4">
            Delete my account and data
          </Link>
        </section>
      </div>
    </div>
  );
}
