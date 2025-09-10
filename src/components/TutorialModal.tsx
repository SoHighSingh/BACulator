import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Stepper, { Step } from "./Stepper";

interface TutorialCardProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TutorialCard({ isOpen, onClose }: TutorialCardProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsVisible(false);
    // Delay actual close to allow exit animation
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const handleTutorialComplete = () => {
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          onClick={handleClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div 
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <Stepper onFinalStepCompleted={handleTutorialComplete}>
              <Step>
                <div className="text-center space-y-4">
                  <h3 className="text-xl font-semibold text-white">Welcome to BACulator!</h3>
                  <p className="text-white/90">
                    BACulator helps you track your Blood Alcohol Content (BAC) and make informed decisions about driving.
                  </p>
                  <div className="bg-white/10 rounded-md p-4 border border-white/20">
                    <p className="text-sm text-white/80">
                      This app is for educational purposes only. Always use responsible judgment and never drive under the influence.
                    </p>
                  </div>
                </div>
              </Step>
              
              <Step>
                <div className="text-center space-y-4">
                  <h3 className="text-xl font-semibold text-white">Getting Started</h3>
                  <p className="text-white/90">
                    First, make sure to set your weight and sex in your user profile. These are crucial for accurate BAC calculations.
                  </p>
                  <div className="bg-purple-600/20 rounded-md p-4 border border-purple-500/30">
                    <p className="text-sm text-purple-200">
                      💡 Tip: Click the user icon at the top of the screen to access/edit your profile settings.
                    </p>
                  </div>
                </div>
              </Step>
              
              <Step>
                <div className="text-center space-y-4">
                  <h3 className="text-xl font-semibold text-white">Starting a Session</h3>
                  <p className="text-white/90">
                    When you&apos;re ready to start drinking, tap &quot;Start Drinking Session&quot; to begin tracking your BAC.
                  </p>
                  <div className="bg-blue-600/20 rounded-md p-4 border border-blue-500/30">
                    <p className="text-sm text-blue-200">
                      📱 The app will automatically refresh every minute to keep your BAC calculations current.
                    </p>
                  </div>
                </div>
              </Step>
              
              <Step>
                <div className="text-center space-y-4">
                  <h3 className="text-xl font-semibold text-white">Picking your Drinks</h3>
                  <p className="text-white/90">
                    Choose the number of standards and pick the time you finished drinking according to your drinks.
                  </p>
                  <div className="bg-green-600/20 rounded-md p-4 border border-green-500/30">
                    <p className="text-sm text-green-200">
                      🤖 Pro tip: Use the AI input box &quot;What are you having?&quot; to quickly calculate standards!
                    </p>
                  </div>
                </div>
              </Step>

              <Step>
                <div className="text-center space-y-4">
                  <h3 className="text-xl font-semibold text-white">Understanding Your BAC</h3>
                  <p className="text-white/90">
                    The large number shows your current BAC. The app also shows when you&apos;ll be sober and when you&apos;re expected to be under the legal driving limit (0.05%).
                  </p>
                  <div className="bg-yellow-600/20 rounded-md p-4 border border-yellow-500/30">
                    <p className="text-sm text-yellow-200">
                      ⚠️ Remember: Even small amounts of alcohol can impair your driving ability.
                    </p>
                  </div>
                </div>
              </Step>
              
              <Step>
                <div className="text-center space-y-4">
                  <h3 className="text-xl font-semibold text-white">Stay Safe!</h3>
                  <p className="text-white/90">
                    Remember that BAC calculations are estimates. Factors like food consumption, medications, and individual metabolism can affect accuracy.
                  </p>
                  <div className="bg-red-600/20 rounded-md p-4 border border-red-500/30">
                    <p className="text-sm text-red-200">
                      🚫 When in doubt, don&apos;t drive. Use alternative transportation or designate a driver.
                    </p>
                  </div>
                </div>
              </Step>
            </Stepper>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}