"use client";
import { createContext, useContext, useState } from "react";
import { UserInfoIcon } from "./UserInfoIcon";
import UserInfoSlideOut from "./UserInfoSlideOut";
import { useSession } from "next-auth/react";

interface UserInfoContextType {
  openUserInfo: () => void;
}

const UserInfoContext = createContext<UserInfoContextType | undefined>(undefined);

export const useUserInfo = () => {
  const context = useContext(UserInfoContext);
  if (context === undefined) {
    throw new Error('useUserInfo must be used within a UserInfoSlideOutProvider');
  }
  return context;
};

export default function UserInfoSlideOutProvider({ children }: { children: React.ReactNode }) {
  const [isUserInfoOpen, setIsUserInfoOpen] = useState(false);
  const { data: session } = useSession();

  const openUserInfo = () => {
    setIsUserInfoOpen(true);
  };

  return (
    <UserInfoContext.Provider value={{ openUserInfo }}>
      <div className="relative min-h-screen">
        {session && (
          <>
            <UserInfoIcon onClick={() => setIsUserInfoOpen(true)} />
            <UserInfoSlideOut isOpen={isUserInfoOpen} onClose={() => setIsUserInfoOpen(false)} userName={session.user?.name ?? undefined} />
          </>
        )}
        {children}
      </div>
    </UserInfoContext.Provider>
  );
} 