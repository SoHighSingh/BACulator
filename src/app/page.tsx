"use client";

import { useSession, signIn } from "next-auth/react";
import React, { useMemo, useState } from "react";
import { calculateBAC } from "~/lib/bac-calculator";
import { MainContent } from "../components/MainContent";
import DarkVeil from "../components/DarkVeil";
import { TermsAndDisclaimerDialog } from "../components/TermsAndDisclaimerDialog";
import { useAutoReload } from "../hooks/useAutoReload";
import { useDrinks } from "../hooks/useDrinks";
import { useTab } from "../hooks/useTab";
import { useUserInfoData } from "../hooks/useUserInfoData";
import { useUserInfo } from "../components/UserInfoSlideOutProvider";

export default function Home() {
  const { data: session } = useSession();
  const userName = session?.user?.name ?? "";
  const { openUserInfo } = useUserInfo();
  
  // State for terms and disclaimer dialog
  const [isTermsDialogOpen, setIsTermsDialogOpen] = useState(false);
  
  // Custom hooks for data management
  const { currentTabQuery, startTab, stopTab, hasActiveTab } = useTab();
  const { drinksQuery, addDrink, updateDrink, deleteDrink, drinks } = useDrinks(hasActiveTab);
  const { userInfoQuery, userWeight, userSex } = useUserInfoData();
  
  // State to trigger BAC recalculation on time refresh
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  
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

  // Check if we should continue refreshing based on alcohol presence
  const hasAlcoholInSystem = drinks?.length > 0;

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
  }, [drinks, userWeight, userSex, refreshTrigger]); // eslint-disable-line react-hooks/exhaustive-deps


  // Auto-refresh every minute when there's an active drinking session or alcohol in system
  useAutoReload({
    intervalMinutes: 1,
    enabled: hasActiveTab || hasAlcoholInSystem, // Refresh when active tab or drinks present
    showNotification: true,
    onRefresh: async () => {
      const wasActiveBeforeRefresh = hasActiveTab;
      
      // Refresh all the queries to get updated data
      await Promise.all([
        currentTabQuery.refetch(),
        drinksQuery.refetch(),
        userInfoQuery.refetch()
      ]);
      
      // Check if tab was auto-ended (was active, now isn't, and we have drinks indicating sobriety period)
      if (wasActiveBeforeRefresh && !currentTabQuery.data && drinks?.length > 0) {
        // Show notification that tab was auto-ended due to 12-hour sobriety
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('BACulator - Tab Automatically Ended', {
            body: 'Your drinking session has been automatically ended after 12 hours of sobriety.',
            icon: '/BACULATOR.png'
          });
        }
      }
      
      // Trigger BAC recalculation with updated time
      setRefreshTrigger(prev => prev + 1);
    }
  });


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
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-6 sm:mb-8 text-shadow-lg leading-tight">
            Welcome to the BACulator App
          </h1>
          <p className="text-lg sm:text-xl text-center max-w-2xl mb-6 sm:mb-8 text-shadow px-2">
            Blood Alcohol Content Calculator - Calculate your BAC and make informed decisions about driving.
          </p>
          <button
            onClick={() => setIsTermsDialogOpen(true)}
            className="rounded-md bg-black/40 backdrop-blur-sm border border-white/10 px-6 py-3 text-lg sm:text-xl font-medium min-w-[160px] text-center hover:bg-black/50 transition-colors"
          >
            Sign in with Google
          </button>
          
          <TermsAndDisclaimerDialog
            isOpen={isTermsDialogOpen}
            onClose={() => setIsTermsDialogOpen(false)}
            onContinue={() => {
              setIsTermsDialogOpen(false);
              void signIn('google');
            }}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col justify-between relative text-white">
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