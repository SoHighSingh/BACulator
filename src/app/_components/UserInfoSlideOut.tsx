"use client";

import React, { useState } from "react";
import { signOut } from "next-auth/react";
import { api } from "~/trpc/react";

interface UserInfoSlideOutProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  initialWeight?: number;
  initialSex?: string;
}

export default function UserInfoSlideOut({ 
  isOpen, 
  onClose, 
  userName,
  initialWeight = undefined,
  initialSex = ""
}: UserInfoSlideOutProps) {
  const [weight, setWeight] = useState<string>(initialWeight !== undefined ? String(initialWeight) : "");
  const [sex, setSex] = useState<"male" | "female" | "">(initialSex as "male" | "female" | "");
  const [submitted, setSubmitted] = useState(false);

  const updateUserInfo = api.post.updateUserInfo.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Only submit if both fields are filled
    if (!weight || !sex) return;
    await updateUserInfo.mutateAsync({ weight: Number(weight), sex });
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 1500);
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={onClose}
        />
      )}
      
      {/* Slide-out panel */}
      <div className={`
        fixed top-0 right-0 h-full w-96 bg-gradient-to-b from-[#2e026d] to-[#15162c] 
        text-white z-50 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="p-6 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">
              {userName ? `Hi ${userName}!` : "User Details"}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
            </button>
          </div>

          {/* Content */}
          <div className="flex-1">
            <p className="text-lg mb-6 text-white/80">Your details:</p>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-white/90">
                  Weight (kg):
                </label>
                <input
                  type="number"
                  min={1}
                  max={300}
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  className="rounded-lg px-4 py-3 text-black bg-white border-2 border-transparent focus:border-purple-300 focus:outline-none transition-colors placeholder:text-gray-400 placeholder:opacity-70"
                  required
                  placeholder="Enter"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-white/90">
                  Sex at birth:
                </label>
                <select
                  value={sex}
                  onChange={e => setSex(e.target.value as "male" | "female" | "")}
                  className="rounded-lg px-4 py-3 text-black bg-white border-2 border-transparent focus:border-purple-300 focus:outline-none transition-colors"
                  required
                >
                  <option value="" disabled>Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={submitted}
                className="rounded-full bg-white/20 px-8 py-3 font-semibold transition hover:bg-white/30 text-white mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitted ? "Saved!" : "Save Details"}
              </button>
            </form>

            {submitted && (
              <div className="mt-4 p-4 bg-green-600/20 border border-green-400/30 rounded-lg">
                <p className="text-green-300 text-center">
                  ✓ Details saved successfully!
                </p>
              </div>
            )}
          </div>
          {/* Sign out button at the bottom */}
          <button
            onClick={() => signOut()}
            className="mt-8 rounded-full bg-red-600/80 px-8 py-3 font-semibold transition hover:bg-red-700 text-white w-full"
          >
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}