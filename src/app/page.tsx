"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "../components/ui/drawer";
import { Button } from "../components/ui/button";
import { api } from "~/trpc/react";
import React from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "../components/ui/dialog";
import { calculateBAC, calculateDrinkContribution } from "~/lib/bac-calculator";
import { generateAdvancedBACTimeline } from "~/lib/bac-graph";
import type { Drink } from "~/types/bac";

interface BacTooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string | number;
}

function CustomTooltip({ active, payload, label }: BacTooltipProps) {
  if (active && payload?.length) {
    let timeLabel = "";
    if (typeof label === "number") {
      // Convert hours to time format
      const hours = Math.floor(label);
      const minutes = Math.round((label - hours) * 60);
      timeLabel = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } else {
      timeLabel = String(label ?? "");
    }
    return (
      <div className="rounded-lg bg-[#232323] px-4 py-2 border border-[#444] text-[#e5e5e5] shadow">
        <div className="font-semibold">Time: {timeLabel}</div>
        <div>BAC%: {((payload[0]?.value ?? 0) * 100).toFixed(2)}%</div>
      </div>
    );
  }
  return null;
}



export default function Home() {
  const { data: session } = useSession();
  const userName = session?.user?.name ?? "";
  const [graphOpen, setGraphOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [newStandards, setNewStandards] = useState(1);
  const [newTime, setNewTime] = useState(() => {
    const now = new Date();
    // Convert to Australian Eastern Time (UTC+10)
    const australianTime = new Date(now.getTime() + (10 * 60 * 60 * 1000));
    return australianTime.toISOString().slice(0, 16);
  });
  const [confirmStopOpen, setConfirmStopOpen] = useState(false);
  const [editingDrink, setEditingDrink] = useState<Drink | null>(null);
  const [editStandards, setEditStandards] = useState(1);
  const [editTime, setEditTime] = useState("");
  const [selectedDrink, setSelectedDrink] = useState<Drink | null>(null);

  // tRPC hooks
  const currentTabQuery = api.post.getCurrentTab.useQuery(undefined, { refetchOnWindowFocus: false });
  const drinksQuery = api.post.getDrinks.useQuery(undefined, { enabled: !!currentTabQuery.data });
  const userInfoQuery = api.post.userInfo.useQuery();
  const addDrink = api.post.addDrink.useMutation();
  const updateDrink = api.post.updateDrink.useMutation();
  const deleteDrink = api.post.deleteDrink.useMutation();
  const startTab = api.post.startTab.useMutation({
    onSuccess: () => { void currentTabQuery.refetch(); },
  });
  const stopTab = api.post.stopTab.useMutation({
    onSuccess: () => {
      void currentTabQuery.refetch();
      void drinksQuery.refetch();
    },
  });

  // Get current BAC data
  function getCurrentBACData() {
    const drinks = drinksQuery.data ?? [];
    const userWeight = userInfoQuery.data?.weight ?? null;
    const userSex = userInfoQuery.data?.sex ?? null;
    
    return calculateBAC({
      drinks,
      userWeight,
      userSex,
      currentTime: new Date()
    });
  }

  // Get BAC data for display
  const bacData = getCurrentBACData();
  const safeBAC = bacData ?? {
    currentBAC: 0,
    timeToSober: 0,
    timeToLegal: 0,
    bacOverTime: [],
    isRising: false,
    peakBAC: 0,
    timeToPeak: 0
  };

  // For per-drink status
  const userWeight = userInfoQuery.data?.weight ?? null;
  const userSex = userInfoQuery.data?.sex ?? null;
  const now = new Date();

  // Advanced BAC timeline for graph
  let advancedTimeline = null;
  const drinksArr = drinksQuery.data ?? [];
  if (userWeight && userSex && drinksArr.length > 0) {
    advancedTimeline = generateAdvancedBACTimeline(
      drinksArr,
      userWeight,
      userSex,
      now,
      { intervalMinutes: 5, preStartMinutes: 15, postCurrentHours: 8 }
    );
  }

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
    const now = new Date();
    const australianTime = new Date(now.getTime() + (10 * 60 * 60 * 1000));
    setNewTime(australianTime.toISOString().slice(0, 16));
    void drinksQuery.refetch();
    setDrawerOpen(false);
  }

  async function handleEditDrink() {
    if (!editingDrink) return;
    await updateDrink.mutateAsync({ 
      drinkId: editingDrink.id, 
      standards: editStandards, 
      finishedAt: editTime 
    });
    setEditingDrink(null);
    setEditStandards(1);
    setEditTime("");
    void drinksQuery.refetch();
  }

  async function handleDeleteDrink() {
    if (!selectedDrink) return;
    await deleteDrink.mutateAsync({ drinkId: selectedDrink.id });
    setSelectedDrink(null);
    void drinksQuery.refetch();
  }

  function openEditDrink(drink: Drink) {
    setEditingDrink(drink);
    setEditStandards(drink.standards);
    setEditTime(new Date(drink.finishedAt).toISOString().slice(0, 16));
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
        <div className="rounded-md bg-[#444] px-4 py-2 text-sm font-medium min-w-[120px] text-center">
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
              <span className="text-8xl font-bold text-[#e5e5e5]">
                {safeBAC.currentBAC.toFixed(3)}
              </span>
              {safeBAC.isRising ? (
                <span className="text-red-500 text-lg font-semibold mt-2">Rising</span>
              ) : (
                <span className="text-green-500 text-lg font-semibold mt-2">Dropping</span>
              )}
              <Button
                className="mt-4"
                onClick={() => setGraphOpen(true)}
                disabled={drinksArr.length === 0}
              >
                View Graph
              </Button>
            </div>
            {/* Modal for Graph */}
            <Dialog open={graphOpen} onOpenChange={setGraphOpen}>
              <DialogContent className="fixed left-1/2 top-1/2 z-[130] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-[#232323] p-0 shadow-lg border border-[#444] data-[state=open]:animate-fade-in data-[state=open]:animate-scale-in mx-auto">
                <>
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold mb-1 text-[#e5e5e5] pl-5 pt-4">BAC Graph</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col gap-4 p-6">
                    {/* Card Header */}
                    <div>
                      <div className="mb-2 text-[#e5e5e5]/80">BAC% vs Hours Since Drinking</div>
                    </div>
                    {/* Card Content (Chart) */}
                    <div className="bg-[#272727] rounded-lg border border-[#444] h-90 p-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={advancedTimeline ? advancedTimeline.data : []} margin={{ left: 10, right: 10, top: 10, bottom: 20 }}>
                          <defs>
                            <linearGradient id="bacGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#F87171" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#F87171" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis 
                            dataKey="hour" 
                            ticks={[0,1,2,3,4,5,6,7,8,9,10]}
                            domain={[0, 'dataMax + 1']}
                            tickFormatter={h => {
                              const hours = Math.floor(h as number);
                              const minutes = Math.round(((h as number) - hours) * 60);
                              return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                            }}
                            tick={{ fill: '#9CA3AF', fontSize: 11 }}
                            axisLine={{ stroke: '#374151', strokeWidth: 1 }}
                            tickLine={{ stroke: '#374151', strokeWidth: 1 }}
                          />
                          <YAxis 
                            domain={[0, 0.10]} 
                            tickFormatter={v => (v * 100).toFixed(1)} 
                            tick={{ fill: '#9CA3AF', fontSize: 11 }}
                            ticks={[0, 0.02, 0.04, 0.06, 0.08, 0.10]}
                            label={{position: 'insideLeft', style: { fill: '#e5e5e5' } }}
                            axisLine={{ stroke: '#374151', strokeWidth: 1 }}
                            tickLine={{ stroke: '#374151', strokeWidth: 1 }}
                          />
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.3} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area 
                            type="monotone" 
                            dataKey="bac" 
                            stroke="#F87171" 
                            strokeWidth={2}
                            fillOpacity={0.8} 
                            fill="url(#bacGradient)" 
                            name="Blood Alcohol Content"
                            connectNulls={false}
                          />
                          {/* Current time marker */}
                          {(() => {
                            const currentHour: number | undefined = advancedTimeline?.currentTimeHour;
                            if (currentHour !== undefined) {
                              const hours = Math.floor(currentHour);
                              const minutes = Math.round((currentHour - hours) * 60);
                              const timeLabel = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                              
                              return (
                                <ReferenceLine 
                                  x={currentHour}
                                  stroke="#FF8800"
                                  strokeWidth={8}
                                  strokeDasharray="10 5"
                                  label={timeLabel}
                                />
                              );
                            }
                            return null;
                          })()}
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <Button
                      className="w-full mt-2 bg-white text-black"
                      onClick={() => setGraphOpen(false)}
                    >
                      Close
                    </Button>
                  </div>
                </>
              </DialogContent>
            </Dialog>
            
            {/* Edit Drink Dialog */}
            <Dialog open={!!editingDrink} onOpenChange={(open) => !open && setEditingDrink(null)}>
              <DialogContent className="fixed left-1/2 top-1/2 z-[130] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-[#232323] p-0 shadow-lg border border-[#444] data-[state=open]:animate-fade-in data-[state=open]:animate-scale-in mx-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold mb-1 text-[#e5e5e5]">Edit Drink</DialogTitle>
                  <DialogDescription className="text-[#e5e5e5]/80">Update drink details below.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 p-6">
                  <div className="flex flex-col gap-4 bg-[#444] rounded-xl p-4">
                    <div className="flex items-center gap-4">
                      <label className="w-40 text-[#e5e5e5]">Standards</label>
                      <select
                        value={editStandards}
                        onChange={e => setEditStandards(Number(e.target.value))}
                        className="rounded px-3 py-2 text-[#232323] bg-[#e5e5e5]"
                      >
                        {[1, 2, 3, 4, 5].map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="w-40 text-[#e5e5e5]">Time Finished Drinking</label>
                      <input
                        type="datetime-local"
                        value={editTime}
                        onChange={e => setEditTime(e.target.value)}
                        className="rounded px-3 py-2 text-[#232323] bg-[#e5e5e5]"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 w-full">
                    <Button 
                      onClick={handleEditDrink} 
                      disabled={updateDrink.status === 'pending'} 
                      className="flex-1"
                    >
                      {updateDrink.status === 'pending' ? 'Updating...' : 'Update Drink'}
                    </Button>
                    <DialogClose asChild>
                      <Button variant="outline" className="flex-1">Cancel</Button>
                    </DialogClose>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        {/* Info and controls (right on desktop) */}
        <div className="flex flex-col items-center justify-center flex-1 w-full">
          {/* Sober time */}
          <div className="mt-8 w-[90%] max-w-md rounded-xl bg-[#444] py-6 px-4 text-center text-lg font-medium text-[#e5e5e5] shadow md:mt-0 md:text-left">
            {safeBAC.timeToSober > 0 
              ? `${safeBAC.timeToSober.toFixed(2)} hours till sober`
              : "You are sober"
            }
          </div>
          {/* How long till 0.05% */}
          <div className="mt-4 w-[90%] max-w-md rounded-xl bg-[#444] py-6 px-4 text-center text-lg font-medium text-[#e5e5e5] shadow md:text-left">
            {safeBAC.timeToLegal > 0 
              ? `${safeBAC.timeToLegal.toFixed(2)} hours till 0.05%`
              : safeBAC.currentBAC <= 0.05 
                ? "You are under 0.05%"
                : "You are over 0.05%"
            }
          </div>
        </div>
      </div>

      {/* Fixed Bottom Bar */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <div className="fixed bottom-0 left-0 w-full bg-[#232323] p-4 z-50 border-t border-[#333] flex gap-4">
          {currentTabQuery.data ? (
            <>
              <DrawerTrigger asChild>
                <Button className="flex-[3] h-20"> Add Drink </Button>
              </DrawerTrigger>
              <Button 
                className="flex-[1] h-20"
                onClick={() => setEditDrawerOpen(true)}
              >
                Edit
              </Button>
            </>
          ) : (
            <Button
              className="w-full h-20"
              onClick={async () => {
                await startTab.mutateAsync();
                await currentTabQuery.refetch();
                setDrawerOpen(true);
              }}
            >
              Start Drinking
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
                  {(drinksQuery.data as Drink[] | undefined)?.map((drink, i: number) => {
                    let drinkStatus: null | boolean = null;
                    if (userWeight && userSex) {
                      const contrib = calculateDrinkContribution(drink, userWeight, userSex, now);
                      drinkStatus = contrib.isAbsorbing;
                    }
                    return (
                      <div 
                        key={drink.id} 
                        className="rounded-lg bg-[#444] px-4 py-2 flex items-center justify-between"
                      >
                        <span>Drink {i + 1}: {drink.standards} standard{drink.standards > 1 ? 's' : ''}</span>
                        <div className="flex items-center gap-2">
                          {drinkStatus !== null && (
                            drinkStatus ? (
                              <span className="text-red-500 text-xs font-semibold ml-2">Absorbing</span>
                            ) : (
                              <span className="text-green-500 text-xs font-semibold ml-2">Eliminating</span>
                            )
                          )}
                          <span className="text-xs text-[#e5e5e5]/70">{
                            new Date(drink.finishedAt).toLocaleTimeString('en-AU', { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              timeZone: 'Australia/Sydney'
                            })
                          }</span>
                          
                        </div>
                      </div>
                    );
                  })}
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
              <Button onClick={handleAddDrink} disabled={addDrink.status === 'pending' || !currentTabQuery.data} className="w-full"> {addDrink.status === 'pending' ? 'Adding...' : 'Add Drink'} </Button>
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

      {/* Edit Drinks Drawer */}
      <Drawer open={editDrawerOpen} onOpenChange={(open) => {
        setEditDrawerOpen(open);
        if (!open) {
          setSelectedDrink(null);
        }
      }}>
        <DrawerContent className="bg-[#232323] flex flex-col items-center">
          <div className="mx-auto w-full max-w-md flex flex-col h-[70vh]">
            <DrawerHeader>
              <DrawerTitle className="text-[#e5e5e5]">Edit Drinks</DrawerTitle>
              <DrawerDescription className="text-[#e5e5e5]/80">Select a drink to edit or delete.</DrawerDescription>
            </DrawerHeader>
            <div className="p-4 pb-0 flex flex-col flex-grow min-h-0">
              <div className="mb-4 flex flex-col min-h-0 flex-grow">
                <div className="font-semibold text-[#e5e5e5] mb-2">Current Drinks</div>
                <div className="flex flex-col gap-2 overflow-y-auto flex-grow min-h-0" style={{maxHeight: '30vh'}}>
                  {drinksQuery.isLoading && <div className="text-[#e5e5e5]/60">Loading...</div>}
                  {drinksQuery.data?.length === 0 && <div className="text-[#e5e5e5]/60">No drinks logged yet.</div>}
                  {(drinksQuery.data as Drink[] | undefined)?.map((drink, i: number) => (
                    <div 
                      key={drink.id} 
                      className={`rounded-lg px-4 py-2 flex items-center justify-between cursor-pointer transition ${
                        selectedDrink?.id === drink.id 
                          ? 'bg-[#666] border-2 border-[#e5e5e5]' 
                          : 'bg-[#444]'
                      }`}
                      onClick={() => {
                        setSelectedDrink(selectedDrink?.id === drink.id ? null : drink);
                      }}
                    >
                      <span>Drink {i + 1}: {drink.standards} standard{drink.standards > 1 ? 's' : ''}</span>
                      <span className="text-xs text-[#e5e5e5]/70">{
                        new Date(drink.finishedAt).toLocaleTimeString('en-AU', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          timeZone: 'Australia/Sydney'
                        })
                      }</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Edit/Delete Actions */}
              {selectedDrink && (
                <div className="mt-4 flex gap-3">
                                <Button 
                onClick={() => openEditDrink(selectedDrink)}
                className="flex-1"
              >
                Edit Drink
              </Button>
              <Button 
                onClick={handleDeleteDrink}
                disabled={deleteDrink.status === 'pending'}
                variant="destructive"
                className="flex-1"
              >
                {deleteDrink.status === 'pending' ? 'Deleting...' : 'Delete'}
              </Button>
                </div>
              )}
            </div>
            <DrawerFooter className="sticky bottom-0 bg-[#232323] z-10 flex flex-col gap-2 border-[#444]">
              <DrawerClose asChild>
                <Button variant="outline" className="w-full">Close</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </main>
  );
}