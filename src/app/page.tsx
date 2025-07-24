"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

const bacData = [
  { hour: 0, bac: 0.08 },
  { hour: 1, bac: 0.07 },
  { hour: 2, bac: 0.06 },
  { hour: 3, bac: 0.05 },
  { hour: 4, bac: 0.04 },
  { hour: 5, bac: 0.03 },
  { hour: 6, bac: 0.02 },
  { hour: 7, bac: 0.01 },
  { hour: 8, bac: 0.00 },
];

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg bg-[#232323] px-4 py-2 border border-[#444] text-[#e5e5e5] shadow">
        <div className="font-semibold">Hour: {label}</div>
        <div>BAC%: {payload[0].value.toFixed(3)}</div>
      </div>
    );
  }
  return null;
}

export default function Home() {
  const { data: session } = useSession();
  const userName = session?.user?.name ?? "";
  const [graphOpen, setGraphOpen] = useState(false);

  if (!session) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-[#232323] text-white">
        <h1 className="text-5xl font-extrabold tracking-tight mb-8">
          Welcome to the BACulator App
        </h1>
        <p className="text-xl text-center max-w-2xl mb-8">
          Blood Alcohol Content Calculator - Calculate your BAC and make informed decisions about driving.
        </p>
        <Link
          href="/api/auth/signin"
          className="rounded-full bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20 text-white text-2xl"
        >
          Sign in with Google
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col justify-between bg-[#232323] text-white pb-24">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="rounded-full bg-[#444] px-6 py-2 text-lg font-semibold min-w-[120px] text-center">
          {`Welcome back, ${userName}`}
        </div>
        {/* UserInfoIcon is rendered globally by the provider */}
      </div>

      {/* Main Content: Responsive layout */}
      <div className="flex-1 flex flex-col items-center justify-center w-full md:flex-row md:items-stretch md:justify-center md:gap-12">
        {/* BAC Indicator (left on desktop) */}
        <div className="flex flex-col items-center justify-center flex-1">
          <div className="relative flex items-center justify-center">
            {/* Circle background */}
            <svg width="400" height="400" viewBox="0 0 220 220">
              <circle
                cx="110"
                cy="110"
                r="95"
                stroke="#444"
                strokeWidth="20"
                fill="none"
              />
              {/* BAC arc (placeholder 60%) */}
              <circle
                cx="110"
                cy="110"
                r="95"
                stroke="#e5e5e5"
                strokeWidth="20"
                fill="none"
                strokeDasharray={2 * Math.PI * 95}
                strokeDashoffset={2 * Math.PI * 95 * 0.4}
                strokeLinecap="round"
                transform="rotate(180 110 110)"
              />
            </svg>
            {/* BAC number and View Graph button */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-8xl font-bold text-[#e5e5e5]">0.06</span>
              <button
                className="mt-4 rounded-full bg-[#444] px-5 py-2 text-[#e5e5e5] font-semibold shadow hover:bg-[#555] transition"
                onClick={() => setGraphOpen(true)}
              >
                View Graph
              </button>
            </div>
            {/* Modal for Graph */}
            <Dialog.Root open={graphOpen} onOpenChange={setGraphOpen}>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/70 z-[120]" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-[130] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-[#232323] p-0 shadow-lg border border-[#444] data-[state=open]:animate-fade-in data-[state=open]:animate-scale-in mx-auto">
                  <Dialog.Title className="text-2xl font-bold mb-1 text-[#e5e5e5]">BAC Graph</Dialog.Title>
                  <div className="flex flex-col gap-4 p-6">
                    {/* Card Header */}
                    <div>
                      <div className="mb-2 text-[#e5e5e5]/80">BAC% vs Hours Since Drinking</div>
                    </div>
                    {/* Card Content (Chart) */}
                    <div className="bg-[#444] rounded-xl h-64 flex items-center justify-center text-[#e5e5e5]/60 text-xl p-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={bacData} margin={{ left: 20, right: 20, top: 20, bottom: 20 }}>
                          <defs>
                            <linearGradient id="bacGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#e5e5e5" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#e5e5e5" stopOpacity={0.1} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="#333" vertical={false} />
                          <XAxis dataKey="hour" tick={{ fill: '#e5e5e5' }} label={{ value: 'Hours', position: 'insideBottom', fill: '#e5e5e5', dy: 10 }} />
                          <YAxis domain={[0, 0.1]} tick={{ fill: '#e5e5e5' }} label={{ value: 'BAC%', angle: -90, position: 'insideLeft', fill: '#e5e5e5', dx: -10 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="bac" stroke="#e5e5e5" fill="url(#bacGradient)" fillOpacity={0.7} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <button
                      className="rounded-full bg-[#444] px-6 py-2 text-[#e5e5e5] font-semibold shadow hover:bg-[#555] transition w-full mt-2"
                      onClick={() => setGraphOpen(false)}
                    >
                      Close
                    </button>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        </div>
        {/* Info and controls (right on desktop) */}
        <div className="flex flex-col items-center justify-center flex-1 w-full">
          {/* Sober time placeholder */}
          <div className="mt-8 w-[90%] max-w-md rounded-xl bg-[#444] py-6 px-4 text-center text-lg font-medium text-[#e5e5e5] shadow md:mt-0 md:text-left">
            How long till sober
          </div>
          {/* How long till 0.05% placeholder */}
          <div className="mt-4 w-[90%] max-w-md rounded-xl bg-[#444] py-6 px-4 text-center text-lg font-medium text-[#e5e5e5] shadow md:text-left">
            How long till 0.05%
          </div>
        </div>
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 w-full bg-[#232323] p-4 flex gap-4 z-50 border-t border-[#333]">
        <button className="flex-1 rounded-xl bg-[#444] py-4 text-3xl font-bold text-[#e5e5e5] shadow active:bg-[#555] transition">+</button>
        <button className="w-20 rounded-xl bg-[#444] py-4 text-2xl font-bold text-[#e5e5e5] shadow active:bg-[#555] transition">✎</button>
      </div>
    </main>
  );
}