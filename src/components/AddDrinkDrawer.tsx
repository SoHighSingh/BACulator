import React from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from "./ui/dialog";
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "./ui/drawer";
import { DrinksList } from "./DrinksList";
import { AddDrinkForm } from "./AddDrinkForm";
import type { api } from "~/trpc/react";

interface AddDrinkDrawerProps {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  newStandards: number;
  setNewStandards: (standards: number) => void;
  newTime: string;
  setNewTime: (time: string) => void;
  selectedTime: string;
  setSelectedTime: (time: string) => void;
  resolvedDateTime: Date | null;
  setResolvedDateTime: (date: Date | null) => void;
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
  handleTimeChange: (timeString: string) => void;
  formatDateTime: (date: Date | null) => string;
  convertTo24Hour: (time12h: string) => string;
  roundToOneDecimal: (num: number) => number;
}

export function AddDrinkDrawer({
  drawerOpen,
  setDrawerOpen,
  newStandards,
  setNewStandards,
  newTime: _newTime,
  setNewTime: _setNewTime,
  selectedTime,
  setSelectedTime: _setSelectedTime,
  resolvedDateTime: _resolvedDateTime,
  setResolvedDateTime: _setResolvedDateTime,
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
  getCurrentTimeString: _getCurrentTimeString,
  handleAddDrink,
  onOpenUserInfo,
  handleTimeChange,
  formatDateTime: _formatDateTime,
  convertTo24Hour,
  roundToOneDecimal
}: AddDrinkDrawerProps) {
  return (
    <>
      {/* Fixed Bottom Bar */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <div className="fixed bottom-0 left-0 w-full bg-black/40 backdrop-blur-sm border-t border-white/10 p-4 z-50 flex gap-4">
          {currentTabQuery.data ? (
            <>
              <DrawerTrigger asChild>
                <Button className="flex-[3] h-20 rounded-md bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/15"> Add Drink </Button>
              </DrawerTrigger>
              <Button 
                className="flex-[1] h-20 rounded-md bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/15"
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
              className="w-full h-20 rounded-md bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/15"
              onClick={async () => {
                if (!userWeight || !userSex) {
                  // Open user info slide out if user details are missing
                  onOpenUserInfo?.();
                  return;
                }
                
                try {
                  await startTab.mutateAsync();
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
          <DrawerContent className="bg-black/40 backdrop-blur-sm border border-white/10 flex flex-col items-center h-full">
           <div className="mx-auto w-full max-w-md flex flex-col min-h-0">
             <DrawerHeader className="flex-shrink-0">
               <DrawerTitle className="text-[#e5e5e5]">Add Drink</DrawerTitle>
               <DrawerDescription className="text-[#e5e5e5]/80">Log your drinks below.</DrawerDescription>
             </DrawerHeader>
             <div className="flex-1 p-4 pb-0">
               <div className="mb-4">
                 <DrinksList 
                   drinksQuery={drinksQuery}
                   userWeight={userWeight}
                   userSex={userSex}
                 />
               </div>
             </div>
             <DrawerFooter className="fixed max-w-md w-full flex-shrink-0 bg-transparent flex flex-col gap-2 border-t border-white/10 p-4 bottom-0">
               <AddDrinkForm
                 standards={newStandards}
                 setStandards={setNewStandards}
                 selectedTime={selectedTime}
                 convertTo24Hour={convertTo24Hour}
                 handleTimeChange={handleTimeChange}
                 roundToOneDecimal={roundToOneDecimal}
               />
               <Button onClick={handleAddDrink} disabled={addDrink.status === 'pending' || !currentTabQuery.data} className="w-full h-18 rounded-md bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/15"> {addDrink.status === 'pending' ? 'Adding...' : 'Add Drink'} </Button>
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
                   <DialogContent className="bg-black/40 backdrop-blur-sm border border-white/10">
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