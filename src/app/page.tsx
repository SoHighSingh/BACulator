"use client";

import { useSession, signIn } from "next-auth/react";
import React, { useMemo } from "react";
import { calculateBAC } from "~/lib/bac-calculator";
import { MainContent } from "../components/MainContent";
import DarkVeil from "../components/DarkVeil";
import { useAutoReload } from "../hooks/useAutoReload";
import { useDrinks } from "../hooks/useDrinks";
import { useTab } from "../hooks/useTab";
import { useUserInfoData } from "../hooks/useUserInfoData";
import { useUserInfo } from "./_components/UserInfoSlideOutProvider";

export default function Home() {
  const { data: session } = useSession();
  const userName = session?.user?.name ?? "";
  const { openUserInfo } = useUserInfo();
  
  // Custom hooks for data management
  const { currentTabQuery, startTab, stopTab, hasActiveTab } = useTab();
  const { drinksQuery, addDrink, updateDrink, deleteDrink, drinks } = useDrinks(hasActiveTab);
  const { userInfoQuery, userWeight, userSex } = useUserInfoData();
  
  // Helper function to get current time in datetime-local format
  const getCurrentTimeString = () => {
    const now = new Date();
    // Format as YYYY-MM-DDTHH:mm in local time
    const pad = (n: number) => n.toString().padStart(2, '0');
    const year = now.getFullYear();
    const month = pad(now.getMonth() + 1);
    const day = pad(now.getDate());
    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Auto-refresh every minute when there's an active drinking session
  useAutoReload({
    intervalMinutes: 1,
    enabled: hasActiveTab, // Only refresh when there's an active session
    showNotification: true,
    onRefresh: async () => {
      // Refresh all the queries to get updated data
      await Promise.all([
        currentTabQuery.refetch(),
        drinksQuery.refetch(),
        userInfoQuery.refetch()
      ]);
    }
  });

  // Get BAC data for display - reactive to drinks and user info changes
  const safeBAC = useMemo(() => {
    const bacData = calculateBAC({
      drinks,
      userWeight,
      userSex,
      currentTime: new Date()
    });
    
    return bacData ?? {
      currentBAC: 0,
      timeToSober: 0,
      timeToLegal: 0,
      bacOverTime: [],
      isRising: false,
      peakBAC: 0,
      timeToPeak: 0
    };
  }, [drinks, userWeight, userSex]);

  if (!session) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center relative text-white overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <DarkVeil 
            hueShift={240}
            noiseIntensity={0.05}
            scanlineIntensity={0.1}
            speed={0.3}
            warpAmount={0.2}
          />
        </div>
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center">
          <h1 className="text-5xl font-extrabold tracking-tight mb-8 text-shadow-lg">
            Welcome to the BACulator App
          </h1>
          <p className="text-xl text-center max-w-2xl mb-8 text-shadow">
            Blood Alcohol Content Calculator - Calculate your BAC and make informed decisions about driving.
          </p>
          <button
            onClick={() => signIn('google')}
            className="rounded-full bg-white/20 backdrop-blur-sm px-10 py-3 font-semibold no-underline transition hover:bg-white/30 text-white text-2xl shadow-lg cursor-pointer"
          >
            Sign in with Google
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col justify-between relative text-white overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <DarkVeil 
          hueShift={10}
          noiseIntensity={0.01}
          scanlineIntensity={0.05}
          speed={1}
          warpAmount={1}
        />
      </div>
      
      {/* Content Layer */}
      <div className="relative z-10 flex flex-col justify-between min-h-screen">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 pt-4 pb-6">
          <div className="rounded-md bg-black/40 backdrop-blur-sm border border-white/10 px-4 py-2 text-sm font-medium min-w-[120px] text-center">
            {`Welcome back, ${userName}`}
          </div>
          {/* UserInfoIcon is rendered globally by the provider */}
        </div>
        
        <MainContent
          safeBAC={safeBAC}
          drinksArr={drinks}
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
          onOpenUserInfo={openUserInfo}
        />
      </div>
    </main>
  );
}