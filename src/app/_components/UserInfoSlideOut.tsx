"use client";

import React, { useState } from "react";
import { signOut } from "next-auth/react";
import { api } from "~/trpc/react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "../../components/ui/drawer";
import { Button } from "../../components/ui/button";

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
    <Drawer open={isOpen} onOpenChange={open => !open && onClose()}>
      <DrawerContent className="bg-[#232323]">
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader>
            <DrawerTitle className="text-[#e5e5e5]">{userName ? `Hi ${userName}!` : "User Details"}</DrawerTitle>
            <DrawerDescription className="text-[#e5e5e5]/80">Your details:</DrawerDescription>
          </DrawerHeader>
          <div className="p-4 pb-0">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[#e5e5e5]">
                  Weight (kg):
                </label>
                <input
                  type="number"
                  min={1}
                  max={300}
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  className="rounded-lg px-4 py-3 text-[#232323] bg-[#e5e5e5] border-2 border-transparent focus:border-[#888] focus:outline-none transition-colors placeholder:text-gray-400 placeholder:opacity-70"
                  required
                  placeholder="Enter"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[#e5e5e5]">
                  Sex at birth:
                </label>
                <select
                  value={sex}
                  onChange={e => setSex(e.target.value as "male" | "female" | "")}
                  className="rounded-lg px-4 py-3 text-[#232323] bg-[#e5e5e5] border-2 border-transparent focus:border-[#888] focus:outline-none transition-colors"
                  required
                >
                  <option value="" disabled className="text-white">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <Button
                type="submit"
                disabled={submitted}
                className="rounded-2px bg-[#444] px-8 py-3 font-semibold transition hover:bg-[#555] text-[#e5e5e5] mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitted ? "Saved!" : "Save Details"}
              </Button>
            </form>
            {submitted && (
              <div className="mt-4 p-4 bg-green-600/20 border border-green-400/30 rounded-lg">
                <p className="text-green-300 text-center">
                  ✓ Details saved successfully!
                </p>
              </div>
            )}
          </div>
          <DrawerFooter>
            <Button
              onClick={() => signOut()}
              className="rounded-2px bg-red-600/80 px-8 py-3 font-semibold transition hover:bg-red-700 text-white w-full"
            >
              Sign out
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}