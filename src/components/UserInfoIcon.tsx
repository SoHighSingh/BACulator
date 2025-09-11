"use client";
import { useState } from "react";
import Image from "next/image";

interface UserInfoIconProps {
  onClick?: () => void;
}

export function UserInfoIcon({ onClick }: UserInfoIconProps) {
  // Fallback: always show icon
  const [signedIn] = useState(true);
  // Uncomment and implement session detection if available
  // useEffect(() => {
  //   fetch("/api/auth/session").then(res => res.json()).then(data => setSignedIn(!!data?.user));
  // }, []);

  if (!signedIn) return null;
  return (
    <div className="absolute top-4 right-4 z-50">
      <button
        type="button"
        onClick={(e) => {
        // Blur the button before opening drawer
        if (e.currentTarget instanceof HTMLElement) {
          e.currentTarget.blur();
        }
        onClick?.();
      }}
        title="User Info"
        className="hover:opacity-80 rounded-md bg-black/40 backdrop-blur-sm border border-white/10 px-4 py-2 text-sm font-medium text-center"
      >
        <Image
          src="/UserIcon.png"
          alt="User Info"
          width={32}
          height={32}
          className="w-8 h-8 brightness-0 invert"
        />
      </button>
    </div>
  );
} 