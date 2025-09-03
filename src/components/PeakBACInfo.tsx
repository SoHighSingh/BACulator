import React from "react";

interface PeakBACInfoProps {
  safeBAC: {
    currentBAC: number;
    peakBAC: number;
    timeToPeak: number;
    isRising: boolean;
  };
}

export function PeakBACInfo({ safeBAC }: PeakBACInfoProps) {
  // Don't show the card if there's no alcohol in the system
  if (safeBAC.peakBAC <= 0) {
    return null;
  }

  const formatPeakTime = (timeToPeak: number) => {
    if (timeToPeak > 0) {
      // Peak is in the future, show minutes until peak
      const minutes = Math.round(timeToPeak * 60);
      return `${minutes} min${minutes !== 1 ? 's' : ''}`;
    } else {
      // Peak is happening now, show current time
      const now = new Date();
      return now.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      });
    }
  };

  const getMessage = () => {
    if (safeBAC.timeToPeak > 0) {
      // Peak is in the future
      return `BAC expected to peak at ${safeBAC.peakBAC.toFixed(3)} in ${formatPeakTime(safeBAC.timeToPeak)}`;
    } else {
      // Peak is happening now (or has already passed and current is peak)
      return `Your BAC peaked at ${safeBAC.peakBAC.toFixed(3)} at ${formatPeakTime(safeBAC.timeToPeak)}`;
    }
  };

  return (
    <div className="w-[90%] max-w-md rounded-md bg-black/40 backdrop-blur-sm border border-white/10 px-4 py-3 text-white shadow 
                    animate-in slide-in-from-top-2 fade-in duration-500 ease-out
                    data-[state=closed]:animate-out data-[state=closed]:slide-out-to-top-2 data-[state=closed]:fade-out">
      <div className="text-center">
        <div className="text-sm font-medium text-white/90">
          {getMessage()}
        </div>
      </div>
    </div>
  );
}