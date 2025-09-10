import React, { useEffect, useState } from "react";

interface AnimatedCounterProps {
  value: number;
  startValue?: number;
  decimals?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function AnimatedCounter({ value, startValue, decimals = 3, className = "", style }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(startValue ?? value);

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
    <span 
      className={className}
      style={{ 
        ...style
      }}
    >
      {displayValue.toFixed(decimals)}
    </span>
  );
}