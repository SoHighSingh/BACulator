"use client";
import { useState } from "react";

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
    <div className="absolute top-4 right-6 z-50">
      <button
        type="button"
        onClick={onClick}
        title="User Info"
        className="focus:outline-none"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-8 h-8 text-white hover:text-[hsl(280,100%,70%)] transition"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a8.25 8.25 0 1115 0v.75a.75.75 0 01-.75.75h-13.5a.75.75 0 01-.75-.75v-.75z"
          />
        </svg>
      </button>
    </div>
  );
} 