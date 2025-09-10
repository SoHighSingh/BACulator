import React, { useState, useEffect, useRef } from "react";
import { analyseDrinkDetailed } from "~/lib/genai";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedCounter } from "./ui/AnimatedCounter";

interface AddDrinkFormProps {
  standards: number;
  setStandards: (standards: number) => void;
  selectedTime: string;
  convertTo24Hour: (time12h: string) => string;
  handleTimeChange: (timeString: string) => void;
  roundToOneDecimal: (num: number) => number;
}

export function AddDrinkForm({
  standards,
  setStandards,
  selectedTime,
  convertTo24Hour,
  handleTimeChange,
  roundToOneDecimal,
}: AddDrinkFormProps) {
  const [drinkText, setDrinkText] = useState("");
  const [isAnalysing, setisAnalysing] = useState(false);
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [isAiUpdated, setIsAiUpdated] = useState(false);
  const [previousStandards, setPreviousStandards] = useState(standards);

  const placeholders = [
    "3 vodka red bulls", "half bottle of soju", "2 iced coffees with baileys", "1 shot of pink whitney",
    "pregame with 2 196s", "2 aperol spritzes", "bottle of prosecco", "1 tequila soda", 
    "a jager bomb", "2 vodka lemonades", "glass of red wine", "gin and tonic",
    "one long island iced tea", "shot of fireball", "4 beers", "2 vodka cruisers",
    "3 mango margaritas", "half bottle of wine", "2 whiskey sours", "3 vodka shots", 
    "2 pina coladas", "a corona with lime", "double rum and coke", "2 cosmopolitans",
    "a white claw", "2 old fashioneds", "3 mimosas", "shot of patron",
    "2 dirty shirley temples", "4 seltzers", "3 vodka sodas", "2 negronis",
    "5 bud lights", "2 espresso martinis", "half bottle of champagne", "3 manhattans"
  ];

  const loadingMessagesRef = useRef([
    "Taking a sip...", "Sniffing the bouquet...", "Checking the proof...", "Consulting the bartender...",
    "Reading the label...", "Testing for hangover potential...", "Calculating liquid courage...", 
    "Measuring regret levels...", "Analysing poor decisions...", "Computing social lubricant..."
  ]);

  // Rotate placeholders every 7 seconds - randomly
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPlaceholder(Math.floor(Math.random() * placeholders.length));
    }, 7000);
    return () => clearInterval(interval);
  }, [placeholders.length]);

  // Pick a random loading message when analysis starts and type it out
  useEffect(() => {
    if (!isAnalysing) {
      setTypedText("");
      return;
    }

    // Pick a random message once when analysis starts
    const randomMessage = loadingMessagesRef.current[Math.floor(Math.random() * loadingMessagesRef.current.length)] ?? "Analysing...";
    console.log("Selected message:", randomMessage); // Debug log
    setTypedText("");
    
    // Delay before starting to type
    const startDelay = setTimeout(() => {
      let i = 0;
      const typingInterval = setInterval(() => {
        if (i <= randomMessage.length) {
          const newText = randomMessage.slice(0, i);
          setTypedText(newText);
          i++;
        } else {
          clearInterval(typingInterval);
        }
      }, 50); // 50ms per character
    }, 200); // 200ms delay before typing starts

    return () => clearTimeout(startDelay);
  }, [isAnalysing]); // Removed loadingMessages dependency

  // Reset AI update animation after 3 seconds
  useEffect(() => {
    if (isAiUpdated) {
      const timeout = setTimeout(() => {
        setIsAiUpdated(false);
      }, 2500); // Animation lasts 3 seconds
      
      return () => clearTimeout(timeout);
    }
  }, [isAiUpdated]);

  async function handleAnalyseDrink() {
    if (!drinkText.trim()) return;
    
    setisAnalysing(true);
    
    try {
      // Add a minimum delay to let the typing animation show
      const [analysis] = await Promise.all([
        analyseDrinkDetailed(drinkText.trim()),
        new Promise(resolve => setTimeout(resolve, 2000)) // 2 second minimum delay
      ]);
      
      console.log("AI Drink Analysis:", analysis);
      
      if (analysis.standardDrinks > 0) {
        setPreviousStandards(standards); // Store current value before changing
        const aiValue = roundToOneDecimal(analysis.standardDrinks);
        setStandards(aiValue);
        setDrinkText(""); // Clear input after successful analysis
        setIsAiUpdated(true); // Trigger blue gradient animation
      }
    } catch (error) {
      console.error("Error analyzing drink:", error);
    } finally {
      setisAnalysing(false);
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isAnalysing) {
      void handleAnalyseDrink();
    }
  };

  return (
    <div className="flex flex-col gap-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-md p-4">
      {/* AI Drink Input */}
      <div className="flex flex-col gap-2">
        <label className="text-[#e5e5e5] text-sm font-medium">Type your drink with AI</label>
        <div className="flex gap-2">
          <AnimatePresence mode="wait">
            {isAnalysing ? (
              <motion.div
                key="loading"
                initial={{ width: "calc(100% - 48px)", opacity: 0 }}
                animate={{ width: "100%", opacity: 1 }}
                exit={{ width: "calc(100% - 48px)", opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="h-[42px] rounded-md px-3 py-2 text-white bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-start italic"
              >
                <span className="text-left">
                  {typedText}
                  <span className="animate-pulse">|</span>
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="input"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex gap-2 w-full"
              >
                <input
                  type="text"
                  value={drinkText}
                  onChange={(e) => setDrinkText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={placeholders[currentPlaceholder]}
                  className="flex-1 min-w-0 rounded-md px-3 py-2 text-white bg-white/20 backdrop-blur-sm border border-white/30 placeholder:text-white/50 placeholder:italic"
                />
                <Button
                  onClick={handleAnalyseDrink}
                  disabled={!drinkText.trim()}
                  className="h-[42px] w-20 flex-shrink-0 rounded-md bg-black/60 hover:bg-white/15 backdrop-blur-sm border border-white/10 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  Analyse
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Soft divider */}
      <div className="w-full h-px bg-white/10"></div>

      {/* Standards Input */}
      <div className="flex items-center gap-4 text-[#e5e5e5]">
        <label className="w-56 text-sm">Standards</label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStandards(Math.max(0, standards - 0.5))}
            className="w-8 h-8 rounded-md bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold text-lg flex items-center justify-center transition-colors active:scale-95"
          >
            −
          </button>
          <motion.div
            className="relative w-18 h-10 rounded-md border backdrop-blur-sm"
            animate={{
              backgroundColor: isAiUpdated ? "rgba(64, 131, 255, 0.45)" : "rgba(255, 255, 255, 0.2)",
              borderColor: isAiUpdated ? "#82b7fc" : "rgba(255, 255, 255, 0.3)",
            }}
            transition={{
              duration: 0.5,
              ease: "easeInOut",
            }}
          >
            {/* Gradient overlay that sweeps across */}
            <motion.div
              className="absolute inset-0 rounded-md pointer-events-none"
              style={{
                background: "linear-gradient(90deg, transparent 0%, #479cfd 50%, #4079ff 100%)",
                opacity: 0,
              }}
              animate={{
                opacity: isAiUpdated ? [0, 1, 0] : 0,
                x: isAiUpdated ? ["-100%", "0%", "100%"] : "-100%",
              }}
              transition={{
                duration: isAiUpdated ? 2 : 0,
                ease: "easeOut",
                times: isAiUpdated ? [0, 0.5, 1] : [0, 1],
              }}
            />
            
            {/* Dark background overlay when transitioning back */}
            <motion.div
              className="absolute inset-0 rounded-md"
              animate={{
                backgroundColor: isAiUpdated ? "rgba(6, 0, 16, 0.8)" : "rgba(6, 0, 16, 0)",
              }}
              transition={{ duration: 0.5, delay: isAiUpdated ? 1.5 : 0 }}
              style={{ zIndex: 1 }}
            />
            
            {/* Input field */}
            <input
              type="number"
              min="0.1"
              max="20"
              step="0.1"
              value={standards ? standards.toFixed(1) : ""}
              onChange={e => {
                const value = e.target.value;
                if (value === "") {
                  setStandards(0);
                  setIsAiUpdated(false); // Clear animation if user manually changes
                  return;
                }
                const numValue = Number(value);
                if (!isNaN(numValue) && numValue >= 0) {
                  setStandards(numValue);
                  setIsAiUpdated(false); // Clear animation if user manually changes
                }
              }}
              onBlur={e => {
                const numValue = Number(e.target.value);
                if (!isNaN(numValue) && numValue >= 0) {
                  setStandards(roundToOneDecimal(numValue));
                }
              }}
              className={`relative z-10 w-full h-full bg-transparent border-none outline-none text-white text-center px-3 py-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isAiUpdated ? 'opacity-0' : 'opacity-100'}`}
              placeholder="1.0"
            />
            
            {/* Animated counter overlay when AI is updating */}
            {isAiUpdated && (
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <AnimatedCounter 
                  value={standards} 
                  startValue={previousStandards}
                  decimals={1}
                  className="text-white font-medium"
                />
              </div>
            )}
          </motion.div>
          <button
            onClick={() => setStandards(Math.min(20, Math.round((standards + 0.5) * 10) / 10))}
            className="w-8 h-8 rounded-md bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold text-lg flex items-center justify-center transition-colors active:scale-95"
          >
            +
          </button>
        </div>
      </div>

      {/* Time Input */}
      <div className="flex items-center gap-4 text-[#e5e5e5]">
        <label className="w-56 text-sm">Time Finished Drinking</label>
        <input
          type="time"
          value={convertTo24Hour(selectedTime)}
          onChange={e => {
            if (e.target.value) {
              const [hours, minutes] = e.target.value.split(':');
              const hour12 = parseInt(hours ?? '0') % 12 || 12;
              const period = parseInt(hours ?? '0') >= 12 ? 'PM' : 'AM';
              const timeString = `${hour12}:${minutes} ${period}`;
              handleTimeChange(timeString);
            }
          }}
          className="rounded-md w-40 px-3 py-2 text-white bg-white/20 backdrop-blur-sm border border-white/30"
        />
      </div>
    </div>
  );
}