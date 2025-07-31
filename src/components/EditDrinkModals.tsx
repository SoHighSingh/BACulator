import React from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "./ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "./ui/drawer";
import { EditDrinksTable } from "./EditDrinksTable";
import type { Drink } from "~/types/bac";
import type { api } from "~/trpc/react";

interface EditDrinkModalsProps {
  editDrawerOpen: boolean;
  setEditDrawerOpen: (open: boolean) => void;
  editingDrink: Drink | null;
  setEditingDrink: (drink: Drink | null) => void;
  editStandards: number;
  setEditStandards: (standards: number) => void;
  editTime: string;
  setEditTime: (time: string) => void;
  selectedDrink: Drink | null;
  setSelectedDrink: (drink: Drink | null) => void;
  drinksQuery: ReturnType<typeof api.post.getDrinks.useQuery>;
  updateDrink: ReturnType<typeof api.post.updateDrink.useMutation>;
  deleteDrink: ReturnType<typeof api.post.deleteDrink.useMutation>;
  getCurrentTimeString: () => string;
  handleEditDrink: () => Promise<void>;
  handleDeleteDrink: () => Promise<void>;
  openEditDrink: (drink: Drink) => void;
}

export function EditDrinkModals({
  editDrawerOpen,
  setEditDrawerOpen,
  editingDrink,
  setEditingDrink,
  editStandards,
  setEditStandards,
  editTime,
  setEditTime,
  selectedDrink,
  setSelectedDrink,
  drinksQuery,
  updateDrink,
  deleteDrink,
  getCurrentTimeString,
  handleEditDrink,
  handleDeleteDrink,
  openEditDrink
}: EditDrinkModalsProps) {
  return (
    <>
      {/* Edit Drink Dialog */}
      <Dialog open={!!editingDrink} onOpenChange={(open) => !open && setEditingDrink(null)}>
        <DialogContent className="fixed left-1/2 top-1/2 z-[130] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-[#232323] shadow-lg border border-[#444] data-[state=open]:animate-fade-in data-[state=open]:animate-scale-in mx-auto">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-2xl font-bold mb-2 text-[#e5e5e5]">Edit Drink</DialogTitle>
            <DialogDescription className="text-[#e5e5e5]/80">Update drink details below.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 px-6 pb-6">
            <div className="flex flex-col gap-4 bg-[#444] rounded-xl p-4">
              <div className="flex items-center gap-4">
                <label className="w-40 text-[#e5e5e5]">Standards</label>
                                 <input
                   type="number"
                   min="0.1"
                   max="20"
                   step="0.1"
                   value={editStandards || ""}
                   onChange={e => {
                     const value = e.target.value;
                     const numValue = value === "" ? 0 : Number(value);
                     if (!isNaN(numValue) && numValue >= 0.1) {
                       setEditStandards(numValue);
                     }
                   }}
                   className="rounded px-3 py-2 text-[#232323] bg-[#e5e5e5] w-20"
                   placeholder="1.0"
                 />
              </div>
              <div className="flex items-center gap-4">
                <label className="w-40 text-[#e5e5e5]">Time Finished Drinking</label>
                <input
                  type="datetime-local"
                  value={editTime}
                  onChange={e => setEditTime(e.target.value)}
                  max={getCurrentTimeString()}
                  className="rounded px-3 py-2 text-[#232323] bg-[#e5e5e5]"
                />
              </div>
            </div>
            <div className="flex gap-2 w-full">
              <Button 
                onClick={handleEditDrink} 
                disabled={updateDrink.status === 'pending'} 
                className="flex-1"
              >
                {updateDrink.status === 'pending' ? 'Updating...' : 'Update Drink'}
              </Button>
              <DialogClose asChild>
                <Button variant="outline" className="flex-1">Cancel</Button>
              </DialogClose>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Drinks Drawer */}
      <Drawer open={editDrawerOpen} onOpenChange={(open) => {
        setEditDrawerOpen(open);
        if (!open) {
          setSelectedDrink(null);
        }
      }}>
        <DrawerContent className="bg-[#232323] flex flex-col items-center">
          <div className="mx-auto w-full max-w-md flex flex-col h-[70vh]">
            <DrawerHeader>
              <DrawerTitle className="text-[#e5e5e5]">Edit Drinks</DrawerTitle>
              <DrawerDescription className="text-[#e5e5e5]/80">Select a drink to edit or delete.</DrawerDescription>
            </DrawerHeader>
            <div className="p-4 pb-0 flex flex-col flex-grow min-h-0">
              <EditDrinksTable 
                drinksQuery={drinksQuery}
                selectedDrink={selectedDrink}
                setSelectedDrink={setSelectedDrink}
              />
              
              {/* Edit/Delete Actions */}
              <div className={`mt-4 flex gap-3 transition-all duration-300 ease-in-out overflow-hidden ${
                selectedDrink 
                  ? 'opacity-100 max-h-20 translate-y-0' 
                  : 'opacity-0 max-h-0 translate-y-2 pointer-events-none'
              }`}>
                <Button 
                  onClick={() => selectedDrink && openEditDrink(selectedDrink)}
                  className="flex-1"
                  disabled={!selectedDrink}
                >
                  Edit Drink
                </Button>
                <Button 
                  onClick={handleDeleteDrink}
                  disabled={deleteDrink.status === 'pending' || !selectedDrink}
                  variant="destructive"
                  className="flex-1"
                >
                  {deleteDrink.status === 'pending' ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
            <DrawerFooter className="sticky bottom-0 bg-[#232323] z-10 flex flex-col gap-2 border-[#444]">
              <DrawerClose asChild>
                <Button variant="outline" className="w-full">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
} 