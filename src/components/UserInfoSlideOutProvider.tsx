"use client";
import { createContext, useCallback, useContext, useState } from "react";
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
  // Stable, so the sheet's focus effect doesn't re-run (and reset "Saved") on every re-render.
  const closeUserInfo = useCallback(() => setIsUserInfoOpen(false), []);
  const { data: session } = useSession();

  // Radix moves focus into the sheet and back to the You button on close.
  const openUserInfo = useCallback(() => setIsUserInfoOpen(true), []);

  return (
    <UserInfoContext.Provider value={{ openUserInfo }}>
      <div className="relative min-h-screen">
        {session && (
          // Opened from the night screen's You button; there is no floating profile button any more.
          <UserInfoSlideOut isOpen={isUserInfoOpen} onClose={closeUserInfo} userName={session.user?.name ?? undefined} />
        )}
        {children}
      </div>
    </UserInfoContext.Provider>
  );
} 