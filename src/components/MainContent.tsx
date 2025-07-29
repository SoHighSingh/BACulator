import React, { useState } from "react";
import { BACCircleIndicator } from "./BACCircleIndicator";
import { EditDrinkModals } from "./EditDrinkModals";
import { AddDrinkDrawer } from "./AddDrinkDrawer";
import type { Drink } from "~/types/bac";
import { api } from "~/trpc/react";
import { SoberInfo } from "./SoberInfo";

interface MainContentProps {
  safeBAC: {
    currentBAC: number;
    timeToSober: number;
    timeToLegal: number;
    isRising: boolean;
  };
  drinksArr: Drink[];
  userWeight: number | null;
  userSex: string | null;
  currentTabQuery: ReturnType<typeof api.post.getCurrentTab.useQuery>;
  drinksQuery: ReturnType<typeof api.post.getDrinks.useQuery>;
  addDrink: ReturnType<typeof api.post.addDrink.useMutation>;
  updateDrink: ReturnType<typeof api.post.updateDrink.useMutation>;
  deleteDrink: ReturnType<typeof api.post.deleteDrink.useMutation>;
  startTab: ReturnType<typeof api.post.startTab.useMutation>;
  stopTab: ReturnType<typeof api.post.stopTab.useMutation>;
  getCurrentTimeString: () => string;
}

export function MainContent({
  safeBAC,
  drinksArr,
  userWeight,
  userSex,
  currentTabQuery,
  drinksQuery,
  addDrink,
  updateDrink,
  deleteDrink,
  startTab,
  stopTab,
  getCurrentTimeString
}: MainContentProps) {
  const [graphOpen, setGraphOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [newStandards, setNewStandards] = useState(1);
  const [newTime, setNewTime] = useState(getCurrentTimeString);
  const [confirmStopOpen, setConfirmStopOpen] = useState(false);
  const [editingDrink, setEditingDrink] = useState<Drink | null>(null);
  const [editStandards, setEditStandards] = useState(1);
  const [editTime, setEditTime] = useState("");
  const [selectedDrink, setSelectedDrink] = useState<Drink | null>(null);

  async function handleAddDrink() {
    // Validate that the drink time is not in the future
    const selectedTime = new Date(newTime);
    const currentTime = new Date();
    
    if (selectedTime > currentTime) {
      alert("Cannot add drinks from the future. Please select a time in the past or present.");
      return;
    }

    if (!currentTabQuery.data) {
      await startTab.mutateAsync();
      // Wait for currentTabQuery.data to be available
      let tries = 0;
      while (!currentTabQuery.data && tries < 10) {
        await currentTabQuery.refetch();
        await new Promise(res => setTimeout(res, 100));
        tries++;
      }
    }
    await addDrink.mutateAsync({ standards: newStandards, finishedAt: newTime });
    setNewStandards(1);
    setNewTime(getCurrentTimeString());
    void drinksQuery.refetch();
    setDrawerOpen(false);
  }

  async function handleEditDrink() {
    if (!editingDrink) return;
    
    // Validate that the drink time is not in the future
    const selectedTime = new Date(editTime);
    const currentTime = new Date();
    
    if (selectedTime > currentTime) {
      alert("Cannot edit drinks to a future time. Please select a time in the past or present.");
      return;
    }
    
    await updateDrink.mutateAsync({ 
      drinkId: editingDrink.id, 
      standards: editStandards, 
      finishedAt: editTime 
    });
    setEditingDrink(null);
    setEditStandards(1);
    setEditTime("");
    void drinksQuery.refetch();
  }

  async function handleDeleteDrink() {
    if (!selectedDrink) return;
    await deleteDrink.mutateAsync({ drinkId: selectedDrink.id });
    setSelectedDrink(null);
    void drinksQuery.refetch();
  }

  function openEditDrink(drink: Drink) {
    setEditingDrink(drink);
    setEditStandards(drink.standards);
    setEditTime(getCurrentTimeString());
  }

  return (
    <>
      {/* Main Content: Responsive layout */}
      <div className="flex-1 flex flex-col items-center justify-center w-full md:flex-row md:items-stretch md:justify-center md:gap-12">
        {/* BAC Indicator (left on desktop) */}
        <BACCircleIndicator
          safeBAC={safeBAC}
          drinksArr={drinksArr}
          userWeight={userWeight}
          userSex={userSex}
          graphOpen={graphOpen}
          setGraphOpen={setGraphOpen}
        />
        {/* Info and controls (right on desktop) */}
        <div className="flex flex-col items-center justify-center flex-1 w-full">
          <SoberInfo safeBAC={safeBAC} />
        </div>
      </div>



      {/* Add Drink Drawer */}
      <AddDrinkDrawer
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        newStandards={newStandards}
        setNewStandards={setNewStandards}
        newTime={newTime}
        setNewTime={setNewTime}
        confirmStopOpen={confirmStopOpen}
        setConfirmStopOpen={setConfirmStopOpen}
        drinksQuery={drinksQuery}
        currentTabQuery={currentTabQuery}
        addDrink={addDrink}
        stopTab={stopTab}
        startTab={startTab}
        userWeight={userWeight}
        userSex={userSex}
        getCurrentTimeString={getCurrentTimeString}
        handleAddDrink={handleAddDrink}
      />

      {/* Edit Drink Modals */}
      <EditDrinkModals
        editDrawerOpen={editDrawerOpen}
        setEditDrawerOpen={setEditDrawerOpen}
        editingDrink={editingDrink}
        setEditingDrink={setEditingDrink}
        editStandards={editStandards}
        setEditStandards={setEditStandards}
        editTime={editTime}
        setEditTime={setEditTime}
        selectedDrink={selectedDrink}
        setSelectedDrink={setSelectedDrink}
        drinksQuery={drinksQuery}
        updateDrink={updateDrink}
        deleteDrink={deleteDrink}
        getCurrentTimeString={getCurrentTimeString}
        handleEditDrink={handleEditDrink}
        handleDeleteDrink={handleDeleteDrink}
        openEditDrink={openEditDrink}
      />
    </>
  );
} 