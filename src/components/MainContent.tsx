import React, { useState } from "react";
import { BACIndicator } from "./BACIndicator";
import { EditDrinkModals } from "./EditDrinkModals";
import { AddDrinkDrawer } from "./AddDrinkDrawer";
import type { Drink } from "~/types/bac";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { api } from "~/trpc/react";
import { SoberInfo } from "./SoberInfo";
import { BACGraphModal } from "./BACGraphModal";

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
  onOpenUserInfo?: () => void;
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
  getCurrentTimeString,
  onOpenUserInfo
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

    const localDate = new Date(newTime);
    const utcISOString = localDate.toISOString();
    
    await addDrink.mutateAsync({ 
      standards: newStandards, 
      finishedAt: utcISOString  // Send as proper UTC ISO string instead of raw newTime
    });
    setNewStandards(1);
    setNewTime(getCurrentTimeString());
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
    
    const localDate = new Date(editTime);
    const utcISOString = localDate.toISOString();
    
    await updateDrink.mutateAsync({ 
      drinkId: editingDrink.id, 
      standards: editStandards, 
      finishedAt: utcISOString  // Send as proper UTC ISO string instead of raw editTime
    });
    setEditingDrink(null);
    setEditStandards(1);
    setEditTime("");
  }

  async function handleDeleteDrink() {
    if (!selectedDrink) return;
    try {
      console.log('Attempting to delete drink:', selectedDrink.id);
      console.log('Selected drink data:', selectedDrink);
      
      const result = await deleteDrink.mutateAsync({ drinkId: selectedDrink.id });
      console.log('Delete mutation result:', result);
      
      setSelectedDrink(null);
      console.log('Drink deleted successfully');
    } catch (error) {
      console.error('Detailed delete error:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        selectedDrink: selectedDrink
      });
      alert(`Failed to delete drink: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
        <BACIndicator
          safeBAC={safeBAC}
          drinksArr={drinksArr}
          _userWeight={userWeight}
          _userSex={userSex}
          _graphOpen={graphOpen}
          setGraphOpen={setGraphOpen}
        />
        {/* Info and controls (right on desktop) */}
        <div className="flex flex-col items-center justify-center flex-1 w-full">
          <SoberInfo safeBAC={safeBAC} />
        </div>
      </div>

      {/* BAC Graph Modal - rendered at top level to avoid aria-hidden issues */}
      <BACGraphModal
        open={graphOpen}
        onOpenChange={setGraphOpen}
        drinks={drinksArr}
        userWeight={userWeight}
        userSex={userSex}
      />

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
        setEditDrawerOpen={setEditDrawerOpen}
        drinksQuery={drinksQuery}
        currentTabQuery={currentTabQuery}
        addDrink={addDrink}
        stopTab={stopTab}
        startTab={startTab}
        userWeight={userWeight}
        userSex={userSex}
        getCurrentTimeString={getCurrentTimeString}
        handleAddDrink={handleAddDrink}
        onOpenUserInfo={onOpenUserInfo}
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