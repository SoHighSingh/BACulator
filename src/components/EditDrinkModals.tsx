import React from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "./ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "./ui/drawer";
import { EditDrinksTable } from "./EditDrinksTable";
import { AddDrinkForm } from "./AddDrinkForm";
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
  editSelectedTime: string;
  setEditSelectedTime: (time: string) => void;
  editResolvedDateTime: Date | null;
  setEditResolvedDateTime: (date: Date | null) => void;
  selectedDrink: Drink | null;
  setSelectedDrink: (drink: Drink | null) => void;
  drinksQuery: ReturnType<typeof api.post.getDrinks.useQuery>;
  updateDrink: ReturnType<typeof api.post.updateDrink.useMutation>;
  deleteDrink: ReturnType<typeof api.post.deleteDrink.useMutation>;
  getCurrentTimeString: () => string;
  handleEditDrink: () => Promise<void>;
  handleDeleteDrink: () => Promise<void>;
  openEditDrink: (drink: Drink) => void;
  handleEditTimeChange: (timeString: string) => void;
  convertTo24Hour: (time12h: string) => string;
  roundToOneDecimal: (num: number) => number;
}

export function EditDrinkModals({
  editDrawerOpen,
  setEditDrawerOpen,
  editingDrink,
  setEditingDrink,
  editStandards,
  setEditStandards,
  editTime: _editTime,
  setEditTime: _setEditTime,
  editSelectedTime,
  setEditSelectedTime: _setEditSelectedTime,
  editResolvedDateTime: _editResolvedDateTime,
  setEditResolvedDateTime: _setEditResolvedDateTime,
  selectedDrink,
  setSelectedDrink,
  drinksQuery,
  updateDrink,
  deleteDrink,
  getCurrentTimeString: _getCurrentTimeString,
  handleEditDrink,
  handleDeleteDrink,
  openEditDrink,
  handleEditTimeChange,
  convertTo24Hour,
  roundToOneDecimal
}: EditDrinkModalsProps) {
  return (
    <>
      {/* Edit Drink Dialog */}
      <Dialog open={!!editingDrink} onOpenChange={(open) => {
        if (!open) setEditingDrink(null);
        // Blur active element when dialog opens to prevent aria-hidden warning
        if (open && document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }}>
        <DialogContent className="flex flex-col w-[90vw] max-w-md rounded-md bg-black/40 backdrop-blur-sm shadow-lg border border-white/10 data-[state=open]:animate-fade-in data-[state=open]:animate-scale-in sm:w-full">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-2xl font-bold mb-2 text-white">Edit Drink</DialogTitle>
            <DialogDescription className="text-white/80">Update drink details below.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col pb-6">
            <AddDrinkForm
              standards={editStandards}
              setStandards={setEditStandards}
              selectedTime={editSelectedTime}
              convertTo24Hour={convertTo24Hour}
              handleTimeChange={handleEditTimeChange}
              roundToOneDecimal={roundToOneDecimal}
            />
            <div className="flex gap-2 w-full mt-2">
              <Button 
                onClick={handleEditDrink} 
                disabled={updateDrink.status === 'pending'} 
                className="flex-1 rounded-md bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/15"
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
        // Blur active element when drawer opens to prevent aria-hidden warning
        if (open && document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }}>
        <DrawerContent className="bg-black/40 backdrop-blur-sm border border-white/10 flex flex-col items-center">
          <div className="mx-auto w-full max-w-md flex flex-col h-[70vh]">
            <DrawerHeader>
              <DrawerTitle className="text-white">Edit Drinks</DrawerTitle>
              <DrawerDescription className="text-white/80">Select a drink to edit or delete.</DrawerDescription>
            </DrawerHeader>
            <div className="p-4 pb-0 flex flex-col flex-grow min-h-0">
              <EditDrinksTable 
                drinksQuery={drinksQuery}
                selectedDrink={selectedDrink}
                setSelectedDrink={setSelectedDrink}
              />
            </div>
            <DrawerFooter className="sticky bottom-0 bg-transparent z-10 flex flex-col gap-2 border-t border-white/10">
              {/* Edit/Delete Actions */}
              <div className={`flex gap-2 transition-all duration-300 ease-in-out overflow-hidden ${
                selectedDrink 
                  ? 'opacity-100 max-h-20 translate-y-0' 
                  : 'opacity-0 max-h-0 translate-y-2 pointer-events-none'
              }`}>
                <Button 
                  onClick={() => selectedDrink && openEditDrink(selectedDrink)}
                  className="flex-1 rounded-md bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/15"
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