import React from "react";

interface SoberInfoProps {
  safeBAC: {
    currentBAC: number;
    timeToSober: number;
    timeToLegal: number;
    isRising: boolean;
  };
}

export function SoberInfo({ safeBAC }: SoberInfoProps) {
  return (
    <>
      {/* Sober time */}
      <div className="w-[90%] max-w-md rounded-md bg-black/40 backdrop-blur-sm border border-white/10 py-12 px-4 text-center text-lg font-medium text-white shadow md:mt-0 md:text-left">
        {safeBAC.timeToSober > 0
          ? `${safeBAC.timeToSober.toFixed(2)} hours till sober`
          : "You are sober"
        }
      </div>
      {/* How long till 0.05% */}
      <div className="mt-4 w-[90%] max-w-md rounded-md bg-black/40 backdrop-blur-sm border border-white/10 py-12 px-4 text-center text-lg font-medium text-white shadow md:text-left">
        {safeBAC.timeToLegal > 0
          ? `${safeBAC.timeToLegal.toFixed(2)} hours till 0.05%`
          : safeBAC.currentBAC <= 0.05
            ? "You are under 0.05%"
            : "You are over 0.05%"
        }
      </div>
    </>
  );
} 