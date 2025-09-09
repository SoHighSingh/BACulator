import React, { useEffect, useState } from "react";

interface PeakBACInfoProps {
  safeBAC: {
    currentBAC: number;
    peakBAC: number;
    timeToPeak: number;
    isRising: boolean;
  };
}

interface AnimatedCounterProps {
  value: number;
  decimals?: number;
  className?: string;
}

function AnimatedCounter({ value, decimals = 3, className = "" }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (Math.abs(displayValue - value) > 0.001) {
      const startValue = displayValue;
      const endValue = value;
      const duration = 1000; // 1 second animation
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        
        const currentValue = startValue + (endValue - startValue) * easeOutQuart;
        setDisplayValue(currentValue);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setDisplayValue(endValue);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [value, displayValue]);

  return (
    <span className={className}>
      {displayValue.toFixed(decimals)}
    </span>
  );
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

export function PeakBACInfo({ safeBAC }: PeakBACInfoProps) {
  // Don't show the card if there's no alcohol in the system
  if (safeBAC.peakBAC <= 0) {
    return null;
  }

  const getMessage = () => {
    const isAboveLimit = safeBAC.peakBAC > 0.05;
    const bacClass = isAboveLimit ? 'text-red-400' : 'text-white/90';
    const now = new Date();
    const peakTime = new Date(now.getTime() + safeBAC.timeToPeak * 60 * 60 * 1000);
    
    if (safeBAC.timeToPeak > 0) {
      // Peak is in the future
      return (
        <>
          BAC expected to peak at{' '}
          <AnimatedCounter 
            value={safeBAC.peakBAC} 
            decimals={3} 
            className={bacClass} 
          /> at{' '}
          <AnimatedTime 
            targetTime={peakTime} 
            className="text-white/90"
          />
        </>
      );
    } else {
      // Peak has already occurred or is happening now
      return (
        <>
          Your BAC peaked at{' '}
          <AnimatedCounter 
            value={safeBAC.peakBAC} 
            decimals={3} 
            className={bacClass} 
          /> at{' '}
          <AnimatedTime 
            targetTime={peakTime} 
            className="text-white/90"
          />
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