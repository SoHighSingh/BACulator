"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "../components/ui/drawer";
import { Button } from "../components/ui/button";
import { api } from "~/trpc/react";
import type { UseQueryResult } from '@tanstack/react-query';
import React from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "../components/ui/dialog";

interface BacTooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string | number;
}

function CustomTooltip({ active, payload, label }: BacTooltipProps) {
  if (active && payload?.length) {
    return (
      <div className="rounded-lg bg-[#232323] px-4 py-2 border border-[#444] text-[#e5e5e5] shadow">
        <div className="font-semibold">Hour: {label}</div>
        <div>BAC%: {payload[0]?.value?.toFixed(3)}</div>
      </div>
    );
  }
  return null;
}

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

// Type for drinks
type Drink = {
  id: string;
  standards: number;
  finishedAt: string | Date;
  tabId?: string;
};

export default function Home() {
  const { data: session } = useSession();
  const userName = session?.user?.name ?? "";
  const [graphOpen, setGraphOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newStandards, setNewStandards] = useState(1);
  const [newTime, setNewTime] = useState(() => {
    const now = new Date();
    now.setHours(now.getHours() + 10);
    return now.toISOString().slice(0, 16);
  });
  const [confirmStopOpen, setConfirmStopOpen] = useState(false);

  // tRPC hooks
  const currentTabQuery = api.post.getCurrentTab.useQuery(undefined, { refetchOnWindowFocus: false });
  const drinksQuery = api.post.getDrinks.useQuery(undefined, { enabled: !!currentTabQuery.data });
  const addDrink = api.post.addDrink.useMutation();
  const startTab = api.post.startTab.useMutation({
    onSuccess: () => { void currentTabQuery.refetch(); },
  });
  const stopTab = api.post.stopTab.useMutation({
    onSuccess: () => {
      void currentTabQuery.refetch();
      void drinksQuery.refetch();
    },
  });

  async function handleAddDrink() {
    if (!currentTabQuery.data) {
      await startTab.mutateAsync();
      // Wait for currentTabQuery.data to be available
      let tries = 0;
      while (!currentTabQuery.data && tries < 10) {
        await currentTabQuery.refetch();
        await new Promise(res => setTimeout(res, 100));
        tries++;
      }
    }
    await addDrink.mutateAsync({ standards: newStandards, finishedAt: newTime });
    setNewStandards(1);
    setNewTime(new Date().toISOString().slice(0, 16));
    void drinksQuery.refetch();
    setDrawerOpen(false);
  }

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
            <Dialog open={graphOpen} onOpenChange={setGraphOpen}>
              <DialogContent className="fixed left-1/2 top-1/2 z-[130] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-[#232323] p-0 shadow-lg border border-[#444] data-[state=open]:animate-fade-in data-[state=open]:animate-scale-in mx-auto">
                <>
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold mb-1 text-[#e5e5e5]">BAC Graph</DialogTitle>
                  </DialogHeader>
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
                </>
              </DialogContent>
            </Dialog>
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
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <div className="fixed bottom-0 left-0 w-full bg-[#232323] p-4 z-50 border-t border-[#333] flex gap-4">
          {currentTabQuery.data ? (
            <>
              <DrawerTrigger asChild>
                <Button className="flex-[4] rounded-xl bg-[#444] py-8 text-3xl font-bold text-[#e5e5e5] shadow active:bg-[#555] transition">+</Button>
              </DrawerTrigger>
              <Button className="flex-[1] rounded-xl bg-[#444] py-8 text-2xl font-bold text-[#e5e5e5] shadow active:bg-[#555] transition">✎</Button>
            </>
          ) : (
            <Button
              className="w-full rounded-xl bg-[#444] py-8 text-3xl font-bold text-[#e5e5e5] shadow active:bg-[#555] transition"
              onClick={async () => {
                await startTab.mutateAsync();
                await currentTabQuery.refetch();
                setDrawerOpen(true);
              }}
            >
              START DRINKING
            </Button>
          )}
        </div>
        <DrawerContent className="bg-[#232323] flex flex-col items-center">
          <div className="mx-auto w-full max-w-md flex flex-col h-[70vh]">
            <DrawerHeader>
              <DrawerTitle className="text-[#e5e5e5]">Add Drink</DrawerTitle>
              <DrawerDescription className="text-[#e5e5e5]/80">Log your drinks below.</DrawerDescription>
            </DrawerHeader>
            <div className="p-4 pb-0 flex flex-col flex-grow min-h-0">
              <div className="mb-4 flex flex-col min-h-0 flex-grow">
                <div className="font-semibold text-[#e5e5e5] mb-2">Current Drinks</div>
                <div className="flex flex-col gap-2 overflow-y-auto flex-grow min-h-0" style={{maxHeight: '30vh'}}>
                  {drinksQuery.isLoading && <div className="text-[#e5e5e5]/60">Loading...</div>}
                  {drinksQuery.data?.length === 0 && <div className="text-[#e5e5e5]/60">No drinks logged yet.</div>}
                  {(drinksQuery.data as Drink[] | undefined)?.map((drink, i: number) => (
                    <div key={drink.id} className="rounded-lg bg-[#444] px-4 py-2 flex items-center justify-between">
                      <span>Drink {i + 1}: {drink.standards} standard{drink.standards > 1 ? 's' : ''}</span>
                      <span className="text-xs text-[#e5e5e5]/70">{
                        new Date(new Date(drink.finishedAt).getTime() + 10 * 60 * 60 * 1000)
                          .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
                      } AEST</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="font-semibold text-[#e5e5e5] mt-6 mb-2">Add Drink</div>
              <div className="flex flex-col gap-4 bg-[#444] rounded-xl p-4">
                <div className="flex items-center gap-4">
                  <label className="w-40">Standards</label>
                  <select
                    value={newStandards}
                    onChange={e => setNewStandards(Number(e.target.value))}
                    className="rounded px-3 py-2 text-[#232323] bg-[#e5e5e5]"
                  >
                    {[1, 2, 3, 4, 5].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <label className="w-40">Time Finished Drinking</label>
                  <input
                    type="datetime-local"
                    value={newTime}
                    onChange={e => setNewTime(e.target.value)}
                    className="rounded px-3 py-2 text-[#232323] bg-[#e5e5e5]"
                  />
                </div>
              </div>
            </div>
            <DrawerFooter className="sticky bottom-0 bg-[#232323] z-10 flex flex-col gap-2 border-[#444]">
              <Button onClick={handleAddDrink} disabled={addDrink.status === 'pending' || !currentTabQuery.data} className="w-full rounded-xl bg-[#444] py-8 text-2xl font-bold text-[#e5e5e5] shadow active:bg-[#555] transition">Add Drink</Button>
              <div className="flex gap-2 w-full">
                {/* Stop Drinking Confirmation Dialog */}
                <Dialog open={confirmStopOpen} onOpenChange={setConfirmStopOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="destructive"
                      disabled={!currentTabQuery.data || stopTab.status === 'pending'}
                      className="flex-1"
                    >
                      Stop Drinking
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#232323] border-[#444]">
                    <DialogHeader>
                      <DialogTitle className="text-[#e5e5e5]">Are you sure you want to stop drinking?</DialogTitle>
                      <DialogDescription className="text-[#e5e5e5]/50">
                        This will end your current tab and cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          stopTab.mutate();
                          setConfirmStopOpen(false);
                        }}
                        disabled={!currentTabQuery.data || stopTab.status === 'pending'}
                      >
                        Yes, stop drinking
                      </Button>
                      <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <DrawerClose asChild>
                  <Button variant="outline" className="flex-1">Cancel</Button>
                </DrawerClose>
              </div>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </main>
  );
}