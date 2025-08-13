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
      <div className="mt-8 w-[90%] max-w-md rounded-xl bg-[#444] py-12 px-4 text-center text-lg font-medium text-[#e5e5e5] shadow md:mt-0 md:text-left">
        {safeBAC.timeToSober > 0
          ? `${safeBAC.timeToSober.toFixed(2)} hours till sober`
          : "You are sober"
        }
      </div>
      {/* How long till 0.05% */}
      <div className="mt-4 w-[90%] max-w-md rounded-xl bg-[#444] py-12 px-4 text-center text-lg font-medium text-[#e5e5e5] shadow md:text-left">
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