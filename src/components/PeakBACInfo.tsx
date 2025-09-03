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
    const now = new Date();
    
    // Calculate the actual peak time (past, present, or future)
    const peakTime = new Date(now.getTime() + timeToPeak * 60 * 60 * 1000);
    return peakTime.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    });
  };

  const getMessage = () => {
    const peakBACText = safeBAC.peakBAC.toFixed(3);
    const isAboveLimit = safeBAC.peakBAC > 0.05;
    const bacClass = isAboveLimit ? 'text-red-400' : 'text-white/90';
    
    if (safeBAC.timeToPeak > 0) {
      // Peak is in the future
      return (
        <>
          BAC expected to peak at <span className={bacClass}>{peakBACText}</span> at {formatPeakTime(safeBAC.timeToPeak)}
        </>
      );
    } else {
      // Peak has already occurred or is happening now
      return (
        <>
          Your BAC peaked at <span className={bacClass}>{peakBACText}</span> at {formatPeakTime(safeBAC.timeToPeak)}
        </>
      );
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