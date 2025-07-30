import React from "react";
import { Button } from "./ui/button";
import type { Drink } from "~/types/bac";

interface BACCircleIndicatorProps {
  safeBAC: {
    currentBAC: number;
    timeToSober: number;
    timeToLegal: number;
    isRising: boolean;
  };
  drinksArr: Drink[];
  userWeight: number | null;
  userSex: string | null;
  graphOpen: boolean;
  setGraphOpen: (open: boolean) => void;
}

export function BACCircleIndicator({
  safeBAC,
  drinksArr,
  userWeight,
  userSex,
  graphOpen,
  setGraphOpen
}: BACCircleIndicatorProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1">
      <div className="relative flex items-center justify-center">
        {/* Circle background */}
        <svg width="400" height="400" viewBox="0 0 220 220">
          <circle
            cx="110"
            cy="110"
            r="95"
            stroke="#444"
            strokeWidth="20"
            fill="none"
            strokeDasharray={2 * Math.PI * 100}
            strokeDashoffset={2 * Math.PI * 95 * 0.3}
            strokeLinecap="round"
            transform="rotate(135 110 110)"
          />
          {/* BAC arc (placeholder 60%) */}
          <circle
            cx="110"
            cy="110"
            r="95"
            stroke={safeBAC.currentBAC >= 0.05 ? "#ff6b61" : "#e5e5e5"}
            strokeWidth="20"
            fill="none"
            strokeDasharray={2 * Math.PI * 100}
            strokeDashoffset={2 * Math.PI * 95 * (1 - (safeBAC.currentBAC / 0.15))}
            strokeLinecap="round"
            transform="rotate(135 110 110)"
            className="transition-all duration-300 shadow-lg"
          />
        </svg>
        {/* BAC number and View Graph button */}
        <div className="absolute flex flex-col items-center justify-center pt-20">
          <span className={`text-8xl font-bold ${safeBAC.currentBAC >= 0.05 ? "text-[#ff6b61]" : "text-[#e5e5e5]"}`}>
            {safeBAC.currentBAC.toFixed(3)}
          </span>
          {safeBAC.currentBAC > 0.001 ? (
            safeBAC.isRising ? (
              <span className="text-red-500 text-lg font-semibold">Rising</span>
            ) : (
              <span className="text-green-500 text-lg font-semibold">Dropping</span>
            )
          ) : (
            <span className="text-gray-400 text-lg font-semibold">Sober</span>
          )}
          <Button
            className="mt-12"
            onClick={() => setGraphOpen(true)}
            disabled={drinksArr.length === 0}
          >
            View Graph
          </Button>
        </div>
      </div>
    </div>
  );
} 