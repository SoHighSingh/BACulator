"use client";
import { useState } from "react";
import { UserInfoIcon } from "./UserInfoIcon";
import UserInfoSlideOut from "./UserInfoSlideOut";
import { useSession } from "next-auth/react";

export default function UserInfoSlideOutProvider({ children }: { children: React.ReactNode }) {
  const [isUserInfoOpen, setIsUserInfoOpen] = useState(false);
  const { data: session } = useSession();
  return (
    <div className="relative min-h-screen">
      {session && (
        <>
          <UserInfoIcon onClick={() => setIsUserInfoOpen(true)} />
          <UserInfoSlideOut isOpen={isUserInfoOpen} onClose={() => setIsUserInfoOpen(false)} userName={session.user?.name ?? undefined} />
        </>
      )}
      {children}
    </div>
  );
} 