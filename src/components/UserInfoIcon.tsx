"use client";

interface UserInfoIconProps {
  onClick?: () => void;
}

export function UserInfoIcon({ onClick }: UserInfoIconProps) {
  return (
    <div className="fixed top-[max(0.75rem,env(safe-area-inset-top))] right-[max(1rem,calc((100vw-480px)/2+1rem))] z-40">
      <button
        type="button"
        onClick={onClick}
        className="press min-h-12 rounded-full bg-surface-2 px-4 text-lg font-semibold text-ink active:bg-surface-3"
      >
        Profile
      </button>
    </div>
  );
}
