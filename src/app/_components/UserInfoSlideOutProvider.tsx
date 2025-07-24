"use client";
import { useState } from "react";
import { UserInfoIcon } from "./UserInfoIcon";
import UserInfoSlideOut from "./UserInfoSlideOut";

export default function UserInfoSlideOutProvider({ children }: { children: React.ReactNode }) {
  const [isUserInfoOpen, setIsUserInfoOpen] = useState(false);
  return (
    <div className="relative min-h-screen">
      <UserInfoIcon onClick={() => setIsUserInfoOpen(true)} />
      <UserInfoSlideOut isOpen={isUserInfoOpen} onClose={() => setIsUserInfoOpen(false)} />
      {children}
    </div>
  );
} 