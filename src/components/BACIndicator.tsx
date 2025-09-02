import React, { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import type { Drink } from "~/types/bac";
// Framer Motion imports available for future use
// import { motion, useSpring, useTransform } from "framer-motion";

interface BACIndicatorProps {
  safeBAC: {
    currentBAC: number;
    timeToSober: number;
    timeToLegal: number;
    isRising: boolean;
  };
  drinksArr: Drink[];
  _userWeight: number | null;
  _userSex: string | null;
  _graphOpen: boolean;
  setGraphOpen: (open: boolean) => void;
}

interface TiltedCardProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
}

function TiltedCard({ children, className = "", intensity = 15 }: TiltedCardProps) {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isHovered) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;
    
    const rotateX = (mouseY / (rect.height / 2)) * -intensity;
    const rotateY = (mouseX / (rect.width / 2)) * intensity;
    
    setRotation({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotation({ x: 0, y: 0 });
  };

  return (
    <div
      className={`perspective-1000 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="transition-transform duration-300 ease-out"
        style={{
          transform: isHovered 
            ? `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale3d(1.05, 1.05, 1.05)`
            : 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
          transformStyle: 'preserve-3d'
        }}
      >
        {children}
      </div>
    </div>
  );
}

interface AnimatedCounterProps {
  value: number;
  decimals?: number;
  className?: string;
  style?: React.CSSProperties;
}

function AnimatedCounter({ value, decimals = 3, className = "", style }: AnimatedCounterProps) {
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

export function BACIndicator({
  safeBAC,
  drinksArr,
  _userWeight,
  _userSex,
  _graphOpen,
  setGraphOpen
}: BACIndicatorProps) {
  const wave1Ref = useRef<SVGPathElement>(null);
  const wave2Ref = useRef<SVGPathElement>(null);
  
  // Calculate target water level based on BAC (0-0.1 BAC maps to 0-100% water level)
  // Add minimum 15% water level so waves are visible at 0.000 BAC
  const baseWaterLevel = Math.min((safeBAC.currentBAC / 0.1) * 100, 100);
  const targetWaterLevel = Math.max(baseWaterLevel, 15);
  
  // Animated water level that starts at 0 and animates to target
  const [animatedWaterLevel, setAnimatedWaterLevel] = useState(0);
  const animatedWaterLevelRef = useRef(0);
  
  // Update ref whenever animatedWaterLevel changes
  useEffect(() => {
    animatedWaterLevelRef.current = animatedWaterLevel;
  }, [animatedWaterLevel]);
  
  // Animate water level when BAC changes
  useEffect(() => {
    const duration = 2000; // 2 seconds animation
    const startTime = Date.now();
    const startLevel = animatedWaterLevel;
    const endLevel = targetWaterLevel;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      
      const currentLevel = startLevel + (endLevel - startLevel) * easeOutQuart;
      setAnimatedWaterLevel(currentLevel);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setAnimatedWaterLevel(endLevel);
      }
    };
    
    requestAnimationFrame(animate);
  }, [targetWaterLevel, animatedWaterLevel]); // Added animatedWaterLevel dependency
  
  // Separate wave animation that runs continuously
  useEffect(() => {
    let animationId: number;
    let time = 0;
    
    const animate = () => {
      time += 0.02;
      
      const createWavePath = (amplitude: number, frequency: number, phase: number, yOffset: number) => {
        let path = `M 0 ${yOffset}`;
        
        for (let x = 0; x <= 400; x += 5) {
          const y = yOffset + Math.sin((x * frequency) + phase + time) * amplitude;
          path += ` L ${x} ${y}`;
        }
        
        path += ` L 400 300 L 0 300 Z`;
        return path;
      };
      
      // Calculate wave positions based on animated water level (15-100%)
      const baseWaveY = 300 - (animatedWaterLevelRef.current / 100) * 220; // Map 0-100% to 300-80px
      
      if (wave1Ref.current) {
        const path1 = createWavePath(15, 0.02, 0, baseWaveY);
        wave1Ref.current.setAttribute('d', path1);
      }
      
      if (wave2Ref.current) {
        const path2 = createWavePath(12, 0.018, Math.PI / 3, baseWaveY + 5);
        wave2Ref.current.setAttribute('d', path2);
      }
      
      animationId = requestAnimationFrame(animate);
    };
    
    console.log('Starting wave animation');
    animate();
    
    return () => {
      console.log('Cleaning up wave animation');
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []); // Empty dependency array - runs only once on mount
  
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4 md:gap-8">
      {/* Main BAC Card */}
      <TiltedCard intensity={20}>
        <div className="relative flex items-center justify-center">
                     {/* Water Level Rectangle */}
           <div className="w-95 h-64 bg-white/10 backdrop-blur-sm border border-white/20 relative overflow-hidden rounded-2xl shadow-2xl border border-black">
            {/* BAC Text - Inverted colors using mix-blend-mode */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
                             <AnimatedCounter 
                 value={safeBAC.currentBAC}
                 decimals={3}
                 className="text-8xl font-bold text-white select-none"
                 style={{ 
                   mixBlendMode: 'difference',
                   textShadow: '0 4px 8px rgba(0, 0, 0, 0.3)'
                 }}
               />
              {safeBAC.currentBAC > 0.000 ? (
                safeBAC.isRising ? (
                  <span 
                    className="text-red-400 text-xl font-semibold"
                    style={{ mixBlendMode: 'difference' }}
                  >
                    Rising
                  </span>
                ) : (
                  <span 
                    className="text-green-400 text-xl font-semibold"
                    style={{ mixBlendMode: 'difference' }}
                  >
                    Dropping
                  </span>
                )
              ) : (
                <span 
                  className="text-gray-400 text-xl font-semibold"
                  style={{ mixBlendMode: 'difference' }}
                >
                  Sober
                </span>
              )}
            </div>

            {/* Water Waves */}
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 400 300"
              className="absolute inset-0"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="waterGradient1" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f9fafb" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#d1d5db" stopOpacity="0.9" />
                </linearGradient>
                
                <linearGradient id="waterGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#f3f4f6" stopOpacity="0.7" />
                </linearGradient>
              </defs>

              {/* Back wave layer */}
              <path
                ref={wave2Ref}
                fill="url(#waterGradient1)"
                d="M 0 85 L 400 85 L 400 300 L 0 300 Z"
              />
              
              {/* Front wave layer */}
              <path
                ref={wave1Ref}
                fill="url(#waterGradient2)"
                d="M 0 80 L 400 80 L 400 300 L 0 300 Z"
              />
            </svg>
          </div>
        </div>
      </TiltedCard>

      {/* View Graph Button */}
      <div>
        <Button
          onClick={() => setGraphOpen(true)}
          disabled={drinksArr.length === 0}
          className="rounded-md bg-black/40 backdrop-blur-sm border border-white/10 px-4 py-2 text-sm font-medium min-w-[120px] text-center"
        >
          View Graph
        </Button>
      </div>

      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        
        @keyframes bubbleRise {
          0% {
            bottom: -10px;
            opacity: 0.8;
            transform: translateX(0px);
          }
          50% {
            opacity: 0.6;
            transform: translateX(10px);
          }
          100% {
            bottom: 100%;
            opacity: 0;
            transform: translateX(-5px);
          }
        }
      `}</style>
    </div>
  );
} 