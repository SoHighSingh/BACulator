import React, { useState, useEffect, useRef } from "react";
import { analyseDrinkDetailed } from "~/lib/genai";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "framer-motion";

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
        setStandards(roundToOneDecimal(analysis.standardDrinks));
        setDrinkText(""); // Clear input after successful analysis
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
    <div className="flex flex-col gap-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-md p-4 mb-4">
      {/* AI Drink Input */}
      <div className="flex flex-col gap-2">
        <label className="text-[#e5e5e5] text-sm font-medium">Type your drink with AI</label>
        <div className="flex gap-2">
          <AnimatePresence mode="wait">
            {isAnalysing ? (
              <motion.div
                key="loading"
                initial={{ width: "calc(100% - 88px)", opacity: 0 }}
                animate={{ width: "100%", opacity: 1 }}
                exit={{ width: "calc(100% - 88px)", opacity: 0 }}
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
                  className="flex-1 rounded-md px-3 py-2 text-white bg-white/20 backdrop-blur-sm border border-white/30 placeholder:text-white/50 placeholder:italic"
                />
                <Button
                  onClick={handleAnalyseDrink}
                  disabled={!drinkText.trim()}
                  className="h-[42px] px-4 rounded-md bg-black/60 hover:bg-white/15 backdrop-blur-sm border border-white/10 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
          <input
            type="number"
            min="0.1"
            max="20"
            step="0.1"
            value={standards || ""}
            onChange={e => {
              const value = e.target.value;
              if (value === "") {
                setStandards(0);
                return;
              }
              const numValue = Number(value);
              if (!isNaN(numValue) && numValue >= 0) {
                setStandards(numValue);
              }
            }}
            onBlur={e => {
              const numValue = Number(e.target.value);
              if (!isNaN(numValue) && numValue >= 0) {
                setStandards(roundToOneDecimal(numValue));
              }
            }}
            className="rounded-md px-3 py-2 text-white bg-white/20 backdrop-blur-sm border border-white/30 w-18 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="1.0"
          />
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