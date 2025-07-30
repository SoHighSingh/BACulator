import React from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from "./ui/dialog";
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "./ui/drawer";
import { calculateDrinkContribution } from "~/lib/bac-calculator";
import type { Drink } from "~/types/bac";
import { api } from "~/trpc/react";

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
  handleAddDrink
}: AddDrinkDrawerProps) {
  const now = new Date();

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
              disabled={!userWeight || !userSex}
              onClick={async () => {
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
        <DrawerContent className="bg-[#232323] flex flex-col items-center">
          <div className="mx-auto w-full max-w-md flex flex-col h-[70vh]">
            <DrawerHeader>
              <DrawerTitle className="text-[#e5e5e5]">Add Drink</DrawerTitle>
              <DrawerDescription className="text-[#e5e5e5]/80">Log your drinks below.</DrawerDescription>
            </DrawerHeader>
            <div className="p-4 pb-0 flex flex-col flex-grow min-h-0">
              <div className="mb-4 flex flex-col min-h-0 flex-grow">
                <div className="font-semibold text-[#e5e5e5] mb-2">Current Drinks</div>
                <div className="flex flex-col gap-2 overflow-y-auto flex-grow min-h-0" style={{maxHeight: '30vh'}}>
                  {drinksQuery.isLoading && <div className="text-[#e5e5e5]/60">Loading...</div>}
                  {Array.isArray(drinksQuery.data) && drinksQuery.data.length === 0 && <div className="text-[#e5e5e5]/60">No drinks logged yet.</div>}
                  {(drinksQuery.data as Drink[] | undefined)?.map((drink, i: number) => {
                    let drinkStatus: null | boolean = null;
                    let drinkBAC = 0;
                    if (userWeight && userSex) {
                      const contrib = calculateDrinkContribution(drink, userWeight, userSex, now);
                      drinkStatus = contrib.isAbsorbing;
                      drinkBAC = contrib.bac;
                    }
                    return (
                      <div 
                        key={drink.id} 
                        className="rounded-lg bg-[#444] px-4 py-2 flex items-center justify-between"
                      >
                        <span>Drink {i + 1}: {drink.standards} standard{drink.standards > 1 ? 's' : ''}</span>
                        <div className="flex items-center gap-2">
                          {drinkStatus !== null && (
                            drinkStatus ? (
                              <span className="text-red-500 text-xs font-semibold ml-2">Absorbing</span>
                            ) : drinkBAC > 0.001 ? (
                              <span className="text-green-500 text-xs font-semibold ml-2">Eliminating</span>
                            ) : (
                              <span className="text-gray-400 text-xs font-semibold ml-2">Eliminated</span>
                            )
                          )}
                          <span className="text-xs text-[#e5e5e5]/70">{
                            new Date(drink.finishedAt).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit',
                            })
                          }</span>
                          
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="font-semibold text-[#e5e5e5] mt-6 mb-2">Add Drink</div>
              <div className="flex flex-col gap-4 bg-[#444] rounded-xl p-4">
                <div className="flex items-center gap-4">
                  <label className="w-40">Standards</label>
                  <select
                    value={newStandards}
                    onChange={e => setNewStandards(Number(e.target.value))}
                    className="rounded px-3 py-2 text-[#232323] bg-[#e5e5e5]"
                  >
                    {[1, 2, 3, 4, 5].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-4">
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
            <DrawerFooter className="sticky bottom-0 bg-[#232323] z-10 flex flex-col gap-2 border-[#444]">
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