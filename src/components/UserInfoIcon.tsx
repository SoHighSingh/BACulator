"use client";

interface UserInfoIconProps {
  onClick?: () => void;
}

export function UserInfoIcon({ onClick }: UserInfoIconProps) {
  return (
    <div className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 z-40">
      <button
        type="button"
        onClick={onClick}
        className="min-h-12 rounded-xl border border-line bg-surface-2 px-4 text-lg font-medium text-ink"
      >
        Profile
      </button>
    </div>
  );
}
