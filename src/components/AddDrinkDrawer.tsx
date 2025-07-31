import React from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from "./ui/dialog";
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "./ui/drawer";
import { DrinksList } from "./DrinksList";
import type { api } from "~/trpc/react";

interface AddDrinkDrawerProps {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  newStandards: number;
  setNewStandards: (standards: number) => void;
  newTime: string;
  setNewTime: (time: string) => void;
  confirmStopOpen: boolean;
  setConfirmStopOpen: (open: boolean) => void;
  setEditDrawerOpen: (open: boolean) => void;
  drinksQuery: ReturnType<typeof api.post.getDrinks.useQuery>;
  currentTabQuery: ReturnType<typeof api.post.getCurrentTab.useQuery>;
  addDrink: ReturnType<typeof api.post.addDrink.useMutation>;
  stopTab: ReturnType<typeof api.post.stopTab.useMutation>;
  startTab: ReturnType<typeof api.post.startTab.useMutation>;
  userWeight: number | null;
  userSex: string | null;
  getCurrentTimeString: () => string;
  handleAddDrink: () => Promise<void>;
  onOpenUserInfo?: () => void;
}

export function AddDrinkDrawer({
  drawerOpen,
  setDrawerOpen,
  newStandards,
  setNewStandards,
  newTime,
  setNewTime,
  confirmStopOpen,
  setConfirmStopOpen,
  setEditDrawerOpen,
  drinksQuery,
  currentTabQuery,
  addDrink,
  stopTab,
  startTab,
  userWeight,
  userSex,
  getCurrentTimeString,
  handleAddDrink,
  onOpenUserInfo
}: AddDrinkDrawerProps) {
  return (
    <>
      {/* Fixed Bottom Bar */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <div className="fixed bottom-0 left-0 w-full bg-[#232323] p-4 z-50 border-t border-[#333] flex gap-4">
          {currentTabQuery.data ? (
            <>
              <DrawerTrigger asChild>
                <Button className="flex-[3] h-20"> Add Drink </Button>
              </DrawerTrigger>
              <Button 
                className="flex-[1] h-20"
                onClick={() => {
                  setDrawerOpen(false);
                  setEditDrawerOpen(true);
                }}
              >
                Edit
              </Button>
            </>
          ) : (
            <Button
              className="w-full h-20"
              onClick={async () => {
                if (!userWeight || !userSex) {
                  // Open user info slide out if user details are missing
                  onOpenUserInfo?.();
                  return;
                }
                
                try {
                  await startTab.mutateAsync();
                  await currentTabQuery.refetch();
                  setDrawerOpen(true);
                } catch (error) {
                  console.error('Error starting tab:', error);
                  alert('Failed to start drinking session. Please try again.');
                }
              }}
            >
              {!userWeight || !userSex ? 'Enter User Details' : 'Start Drinking'}
            </Button>
          )}
        </div>
          <DrawerContent className="bg-[#232323] flex flex-col items-center h-full">
           <div className="mx-auto w-full max-w-md flex flex-col min-h-0">
             <DrawerHeader className="flex-shrink-0">
               <DrawerTitle className="text-[#e5e5e5]">Add Drink</DrawerTitle>
               <DrawerDescription className="text-[#e5e5e5]/80">Log your drinks below.</DrawerDescription>
             </DrawerHeader>
             <div className="flex flex-col min-h-0 flex-1 overflow-y-auto p-4 custom-scrollbar">
                             <div className="flex-shrink-0 mb-4">
                 <DrinksList 
                   drinksQuery={drinksQuery}
                   userWeight={userWeight}
                   userSex={userSex}
                 />
               </div>
               <div className="flex flex-col gap-4 bg-[#444] rounded-xl p-4">
                 <div className="flex items-center gap-4 text-[#e5e5e5]">
                   <label className="w-40">Standards</label>
                   <input
                     type="number"
                     min="0.1"
                     max="20"
                     step="0.1"
                     value={newStandards || ""}
                     onChange={e => {
                       const value = e.target.value;
                       const numValue = value === "" ? 0 : Number(value);
                       if (!isNaN(numValue) && numValue >= 0.1) {
                         setNewStandards(numValue);
                       }
                     }}
                     className="rounded px-3 py-2 text-[#232323] bg-[#e5e5e5] w-20"
                     placeholder="1.0"
                   />
                 </div>
                 <div className="flex items-center gap-4 text-[#e5e5e5]">
                   <label className="w-40">Time Finished Drinking</label>
                   <input
                     type="datetime-local"
                     value={newTime}
                     onChange={e => setNewTime(e.target.value)}
                     max={getCurrentTimeString()}
                     className="rounded px-3 py-2 text-[#232323] bg-[#e5e5e5]"
                   />
                 </div>
               </div>
             </div>
             <DrawerFooter className="flex-shrink-0 bg-[#232323] flex flex-col gap-2 border-[#444] p-4">
               <Button onClick={handleAddDrink} disabled={addDrink.status === 'pending' || !currentTabQuery.data} className="w-full"> {addDrink.status === 'pending' ? 'Adding...' : 'Add Drink'} </Button>
               <div className="flex gap-2 w-full">
                 {/* Stop Drinking Confirmation Dialog */}
                 <Dialog open={confirmStopOpen} onOpenChange={setConfirmStopOpen}>
                   <DialogTrigger asChild>
                     <Button
                       variant="destructive"
                       disabled={!currentTabQuery.data || stopTab.status === 'pending'}
                       className="flex-1"
                     >
                       Stop Drinking
                     </Button>
                   </DialogTrigger>
                   <DialogContent className="bg-[#232323] border-[#444]">
                     <DialogHeader>
                       <DialogTitle className="text-[#e5e5e5]">Stop Drinking?</DialogTitle>
                       <DialogDescription className="text-[#e5e5e5]/50">
                         This will end your current tab and cannot be undone.
                       </DialogDescription>
                     </DialogHeader>
                     <DialogFooter>
                       <Button
                         variant="destructive"
                         onClick={async () => {
                           try {
                             await stopTab.mutateAsync();
                             setConfirmStopOpen(false);
                             setDrawerOpen(false);
                           } catch (error) {
                             console.error('Error stopping tab:', error);
                             alert('Failed to stop drinking session. Please try again.');
                           }
                         }}
                         disabled={!currentTabQuery.data || stopTab.status === 'pending'}
                       >
                         Yes, stop drinking
                       </Button>
                       <DialogClose asChild>
                         <Button variant="outline">Cancel</Button>
                       </DialogClose>
                     </DialogFooter>
                   </DialogContent>
                 </Dialog>
                 <DrawerClose asChild>
                   <Button variant="outline" className="flex-1">Cancel</Button>
                 </DrawerClose>
               </div>
             </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
} 