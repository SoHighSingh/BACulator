"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import React from "react";
import { api } from "~/trpc/react";
import { calculateBAC } from "~/lib/bac-calculator";
import { MainContent } from "../components/MainContent";





export default function Home() {
  const { data: session } = useSession();
  const userName = session?.user?.name ?? "";
  // Helper function to get current time in datetime-local format
  const getCurrentTimeString = () => {
    const now = new Date();
    // Convert to Australian Eastern Time (UTC+10)
    const australianTime = new Date(now.getTime() + (10 * 60 * 60 * 1000));
    return australianTime.toISOString().slice(0, 16);
  };

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

  // Get drinks array for the graph modal
  const drinksArr = drinksQuery.data ?? [];



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
        <MainContent
          safeBAC={safeBAC}
          drinksArr={drinksArr}
          userWeight={userWeight}
          userSex={userSex}
          currentTabQuery={currentTabQuery}
          drinksQuery={drinksQuery}
          addDrink={addDrink}
          updateDrink={updateDrink}
          deleteDrink={deleteDrink}
          startTab={startTab}
          stopTab={stopTab}
          getCurrentTimeString={getCurrentTimeString}
        />
    </main>
  );
}