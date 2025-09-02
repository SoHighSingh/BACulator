import React, { useEffect, useState } from "react";

interface SoberInfoProps {
  safeBAC: {
    currentBAC: number;
    timeToSober: number;
    timeToLegal: number;
    isRising: boolean;
  };
}

interface AnimatedTimeProps {
  targetTime: Date;
  className?: string;
}

function AnimatedTime({ targetTime, className = "" }: AnimatedTimeProps) {
  const [displayTime, setDisplayTime] = useState(targetTime);

  useEffect(() => {
    // Only animate if the target time actually changed significantly (more than 1 minute)
    if (Math.abs(displayTime.getTime() - targetTime.getTime()) < 60000) {
      setDisplayTime(targetTime);
      return;
    }

    const startTime = displayTime;
    const endTime = targetTime;
    const duration = 1000; // 1 second animation
    const startTimestamp = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      
      const currentTimeMs = startTime.getTime() + (endTime.getTime() - startTime.getTime()) * easeOutQuart;
      setDisplayTime(new Date(currentTimeMs));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayTime(endTime);
      }
    };

    requestAnimationFrame(animate);
  }, [targetTime]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <span className={className}>
      {formatTime(displayTime)}
    </span>
  );
}

export function SoberInfo({ safeBAC }: SoberInfoProps) {
  const currentTime = new Date();
  const soberTime = new Date(currentTime.getTime() + safeBAC.timeToSober * 60 * 60 * 1000);
  const legalTime = new Date(currentTime.getTime() + safeBAC.timeToLegal * 60 * 60 * 1000);

  return (
    <>
      {/* Time Till Sober Card */}
      <div className="mt-2 w-[90%] max-w-md rounded-md bg-black/40 backdrop-blur-sm border border-white/10 p-4 text-white shadow md:mt-0">
        <div className="text-sm font-medium text-white/80 mb-6 text-left pl-1">Time till Sober</div>
        <div className="text-center">
          {safeBAC.timeToSober > 0 ? (
            <AnimatedTime 
              targetTime={soberTime}
              className="text-6xl font-bold text-white"
            />
          ) : (
            <span className="text-6xl font-bold">- - : - -</span>
          )}
        </div>
      </div>
      
      {/* Time Till 0.05% Card */}
      <div className="mt-4 w-[90%] max-w-md rounded-md bg-black/40 backdrop-blur-sm border border-white/10 p-4 text-white shadow">
        <div className="text-sm font-medium text-white/80 mb-6 text-left pl-1">Time till 0.05%</div>
        <div className="text-center">
          {safeBAC.timeToLegal > 0 ? (
            <AnimatedTime 
              targetTime={legalTime}
              className="text-6xl font-bold text-white"
            />
          ) : safeBAC.currentBAC <= 0.05 ? (
            <span className="text-6xl font-bold">- - : - -</span>
          ) : (
            <span className="text-7xl font-bold">Over 0.05%</span>
          )}
        </div>
      </div>
    </>
  );
} 