import React, { useEffect, useRef } from "react";
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
  _userWeight: number | null;
  _userSex: string | null;
  _graphOpen: boolean;
  setGraphOpen: (open: boolean) => void;
}

export function BACCircleIndicator({
  safeBAC,
  drinksArr,
  _userWeight,
  _userSex,
  _graphOpen,
  setGraphOpen
}: BACCircleIndicatorProps) {
  const wave1Ref = useRef<SVGPathElement>(null);
  const wave2Ref = useRef<SVGPathElement>(null);
  
  // Calculate water level based on BAC (0-0.15 BAC maps to 0-100% water level)
  const waterLevel = Math.min((safeBAC.currentBAC / 0.15) * 100, 100);
  
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
      
      // Calculate wave positions based on water level (0-100%)
      const baseWaveY = 300 - (waterLevel / 100) * 220; // Map 0-100% to 300-80px
      
      if (wave1Ref.current) {
        wave1Ref.current.setAttribute('d', createWavePath(15, 0.02, 0, baseWaveY));
      }
      
      if (wave2Ref.current) {
        wave2Ref.current.setAttribute('d', createWavePath(12, 0.018, Math.PI / 3, baseWaveY + 5));
      }
      
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [waterLevel]);
  
  return (
    <div className="flex flex-col items-center justify-center flex-1">
      <div className="relative flex items-center justify-center">
        {/* Water Level Rectangle */}
        <div className="w-96 h-64 bg-gradient-to-b from-black to-gray-900 relative overflow-hidden rounded-2xl shadow-2xl">
          {/* BAC Text - Inverted colors using mix-blend-mode */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
            <span 
              className="text-8xl font-bold text-white select-none"
              style={{ mixBlendMode: 'difference' }}
            >
              {safeBAC.currentBAC.toFixed(3)}
            </span>
            {safeBAC.currentBAC > 0.001 ? (
              safeBAC.isRising ? (
                <span 
                  className="text-red-400 text-xl font-semibold mt-4"
                  style={{ mixBlendMode: 'difference' }}
                >
                  Rising
                </span>
              ) : (
                <span 
                  className="text-green-400 text-xl font-semibold mt-4"
                  style={{ mixBlendMode: 'difference' }}
                >
                  Dropping
                </span>
              )
            ) : (
              <span 
                className="text-gray-400 text-xl font-semibold mt-4"
                style={{ mixBlendMode: 'difference' }}
              >
                Sober
              </span>
            )}
          </div>

          {/* Bubbles
          <div className="absolute inset-0 z-10 pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-black bg-opacity-60 rounded-full"
                style={{
                  left: `${15 + (i * 10) + Math.sin(i) * 20}%`,
                  animation: `bubbleRise ${3 + (i % 3)}s infinite linear`,
                  animationDelay: `${i * 0.5}s`
                }}
              />
            ))}
            {[...Array(6)].map((_, i) => (
              <div
                key={`small-${i}`}
                className="absolute w-1 h-1 bg-black bg-opacity-40 rounded-full"
                style={{
                  left: `${20 + (i * 12) + Math.cos(i) * 15}%`,
                  animation: `bubbleRise ${2.5 + (i % 2)}s infinite linear`,
                  animationDelay: `${i * 0.7 + 1}s`
                }}
              />
            ))}
          </div> */}

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

        {/* View Graph Button - Positioned below the water rectangle */}
        <div className="absolute -bottom-16">
          <Button
            onClick={() => setGraphOpen(true)}
            disabled={drinksArr.length === 0}
          >
            View Graph
          </Button>
        </div>
      </div>

      <style>{`
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