"use client";

import React, { useState } from "react";

export default function UserInfoPage() {
  const [weight, setWeight] = useState(70);
  const [sex, setSex] = useState("male");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container flex flex-col items-center justify-center gap-8 px-4 py-16">
        <h2 className="text-3xl font-bold mb-4">User Info</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-white/10 p-8 rounded-xl w-full max-w-md">
          <label className="flex flex-col gap-2">
            <span>Weight (kg):</span>
            <input
              type="number"
              min={1}
              value={weight}
              onChange={e => setWeight(Number(e.target.value))}
              className="rounded px-4 py-2 text-black"
              required
            />
          </label>
          <label className="flex flex-col gap-2">
            <span>Sex:</span>
            <select
              value={sex}
              onChange={e => setSex(e.target.value)}
              className="rounded px-4 py-2 text-black"
              required
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </label>
          <button
            type="submit"
            className="rounded-full bg-white/20 px-8 py-2 font-semibold transition hover:bg-white/30 text-white mt-4"
          >
            Save
          </button>
        </form>
        {submitted && (
          <div className="mt-4 text-lg text-green-300">
            Info saved! (not yet persisted)
          </div>
        )}
      </div>
    </main>
  );
} 