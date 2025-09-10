"use client";

import React, { useState } from "react";
import { signOut } from "next-auth/react";
import { api } from "~/trpc/react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose, DrawerFooter } from "./ui/drawer";
import { Button } from "./ui/button";
import TutorialCard from "./TutorialModal";

interface UserInfoSlideOutProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  initialWeight?: number;
  initialSex?: string;
}

export default function UserInfoSlideOut({ 
  isOpen, 
  onClose, 
  userName,
  initialWeight = undefined,
  initialSex = ""
}: UserInfoSlideOutProps) {
  const [weight, setWeight] = useState<string>(initialWeight !== undefined ? String(initialWeight) : "");
  const [sex, setSex] = useState<"male" | "female" | "">(initialSex as "male" | "female" | "");
  const [submitted, setSubmitted] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const utils = api.useUtils();
  const updateUserInfo = api.post.updateUserInfo.useMutation({
    onSuccess: () => {
      // Invalidate all userInfo queries to refresh the data everywhere
      void utils.post.userInfo.invalidate();
    },
  });
  const userInfoQuery = api.post.userInfo.useQuery(undefined, { enabled: isOpen });

  React.useEffect(() => {
    if (userInfoQuery.data) {
      if (userInfoQuery.data.weight !== null && userInfoQuery.data.weight !== undefined) {
        setWeight(String(userInfoQuery.data.weight));
      }
      if (userInfoQuery.data.sex) {
        setSex(userInfoQuery.data.sex as "male" | "female");
      }
    }
    // Only update when opening
  }, [userInfoQuery.data, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Only submit if both fields are filled
    if (!weight || !sex) return;
    await updateUserInfo.mutateAsync({ weight: Number(weight), sex });
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 1500);
  };

  return (
    <Drawer open={isOpen} onOpenChange={open => !open && onClose()} repositionInputs={false}>
      <DrawerContent className="bg-black/40 backdrop-blur-sm border border-white/10 flex flex-col items-center" style={{ height: '85vh', maxHeight: '85dvh' }}>
        <div className="mx-auto w-full max-w-md flex flex-col h-full">
          <DrawerHeader className="flex-shrink-0 relative">
            <div className="absolute top-2 right-4">
              <button 
                className="w-8 h-8 rounded-md bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-colors"
                onClick={() => {
                  setShowTutorial(true);
                  onClose(); // Close the user info slide out when tutorial opens
                }}
                aria-label="Help"
              >
                <span className="text-sm font-medium">?</span>
              </button>
            </div>
            <DrawerTitle className="text-white">{userName ? `Hi ${userName}!` : "User Details"}</DrawerTitle>
            <DrawerDescription className="text-white/80">Your details:</DrawerDescription>
          </DrawerHeader>
          
          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto px-4">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6 pb-4" id="userInfoForm">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-white">
                  Weight (kg):
                </label>
                <input
                  type="number"
                  min="0.1"
                  max="300"
                  step="0.1"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  className="rounded-md px-3 py-2 text-white bg-white/20 backdrop-blur-sm border border-white/30 focus:border-white/40 focus:outline-none transition-colors placeholder:text-white/50"
                  required
                  placeholder="Enter weight in kg"
                  inputMode="decimal"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-white">
                  Sex at birth:
                </label>
                <select
                  value={sex}
                  onChange={e => setSex(e.target.value as "male" | "female" | "")}
                  className="rounded-md px-3 py-2 text-white bg-white/20 backdrop-blur-sm border border-white/30 focus:border-white/40 focus:outline-none transition-colors [&>option]:bg-black [&>option]:text-white"
                  required
                >
                  <option value="" disabled>Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </form>
          </div>
          
          {/* Fixed footer with buttons */}
          <DrawerFooter className="flex-shrink-0 bg-black/40 backdrop-blur-sm flex flex-col gap-2 border-t border-white/10 p-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            {submitted && (
              <div className="mb-2 p-4 bg-green-600/20 border border-green-400/30 rounded-lg">
                <p className="text-green-300 text-center">
                  ✓ Details saved successfully!
                </p>
              </div>
            )}
            <Button
              type="submit"
              form="userInfoForm"
              disabled={submitted}
              className="rounded-md bg-white/10 backdrop-blur-sm border border-white/20 px-8 py-8 font-semibold transition hover:bg-white/15 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitted ? "Saved!" : "Save Details"}
            </Button>
            <Button
              onClick={() => signOut()}
              variant="destructive"
              className="w-full"
            >
              Sign out
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
      
      <TutorialCard 
        isOpen={showTutorial} 
        onClose={() => setShowTutorial(false)} 
      />
    </Drawer>
  );
}