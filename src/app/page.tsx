"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import React, { useMemo } from "react";
import { api } from "~/trpc/react";
import { calculateBAC } from "~/lib/bac-calculator";
import { MainContent } from "../components/MainContent";
import { useAutoReload } from "../hooks/useAutoReload";
import { useUserInfo } from "./_components/UserInfoSlideOutProvider";

export default function Home() {
  const { data: session } = useSession();
  const userName = session?.user?.name ?? "";
  const { openUserInfo } = useUserInfo();
  
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

  // tRPC hooks
  const currentTabQuery = api.post.getCurrentTab.useQuery(undefined, { refetchOnWindowFocus: false });
  const drinksQuery = api.post.getDrinks.useQuery(undefined, { enabled: !!currentTabQuery.data });
  const userInfoQuery = api.post.userInfo.useQuery();
  const addDrink = api.post.addDrink.useMutation({
    onSuccess: () => {
      void drinksQuery.refetch();
    },
    onError: (error) => {
      console.error('Add drink error:', error);
      alert('Failed to add drink. Please try again.');
    },
  });
  const updateDrink = api.post.updateDrink.useMutation({
    onSuccess: () => {
      void drinksQuery.refetch();
    },
    onError: (error) => {
      console.error('Update drink error:', error);
      alert('Failed to update drink. Please try again.');
    },
  });
  const deleteDrink = api.post.deleteDrink.useMutation({
    onSuccess: () => {
      void drinksQuery.refetch();
    },
    onError: (error) => {
      console.error('Delete drink error:', error);
      alert('Failed to delete drink. Please try again.');
    },
  });
  const startTab = api.post.startTab.useMutation({
    onSuccess: () => { void currentTabQuery.refetch(); },
    onError: (error) => {
      console.error('Start tab error:', error);
      alert('Failed to start drinking session. Please try again.');
    },
  });
  const stopTab = api.post.stopTab.useMutation({
    onSuccess: () => {
      void currentTabQuery.refetch();
      void drinksQuery.refetch();
    },
    onError: (error) => {
      console.error('Stop tab error:', error);
      alert('Failed to stop drinking session. Please try again.');
    },
  });

  // Auto-refresh every minute when there's an active drinking session
  useAutoReload({
    intervalMinutes: 1,
    enabled: !!currentTabQuery.data, // Only refresh when there's an active session
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
    const drinks = drinksQuery.data ?? [];
    const userWeight = userInfoQuery.data?.weight ?? null;
    const userSex = userInfoQuery.data?.sex ?? null;
    
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
  }, [drinksQuery.data, userInfoQuery.data]);

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
          onOpenUserInfo={openUserInfo}
        />
    </main>
  );
}