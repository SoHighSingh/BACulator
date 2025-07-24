"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "next-auth/react";
import UserInfoSlideOut from "~/app/_components/UserInfoSlideOut"; // Adjust path as needed

export default function Home() {
  const { data: session } = useSession();
  const [isUserInfoOpen, setIsUserInfoOpen] = useState(false);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          BACulator <span className="text-[hsl(280,100%,70%)]">App</span>
        </h1>
        
        <p className="text-xl text-center max-w-2xl">
          Blood Alcohol Content Calculator - Calculate your BAC and make informed decisions about driving.
        </p>

        <div className="flex flex-col items-center justify-center gap-4">
          <p className="text-center text-2xl text-white">
            {session && <span>Welcome back, {session.user?.name}!</span>}
            {!session && <span>Sign in to save your calculations</span>}
          </p>
          <div className="flex gap-4">
            {!session && (
              <Link
                href="/api/auth/signin"
                className="rounded-full bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20"
              >
                Sign in with Google
              </Link>
            )}
          </div>
        </div>
        
        {/* Add your BAC calculator here later */}
        <div className="text-center">
          <p className="text-lg text-white/80">BAC Calculator coming soon...</p>
        </div>
      </div>

      {/* User Info Slide-out */}
      <UserInfoSlideOut
        isOpen={isUserInfoOpen}
        onClose={() => setIsUserInfoOpen(false)}
        userName={session?.user?.name ?? undefined}
        // TODO: Pass actual user weight and sex from database
        // initialWeight={session?.user?.weight}
        // initialSex={session?.user?.sex}
      />
    </main>
  );
}