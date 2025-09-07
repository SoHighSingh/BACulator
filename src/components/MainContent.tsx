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
    peakBAC: number;
    timeToPeak: number;
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
  const [selectedTime, setSelectedTime] = useState('');
  const [resolvedDateTime, setResolvedDateTime] = useState<Date | null>(null);
  const [confirmStopOpen, setConfirmStopOpen] = useState(false);
  const [editingDrink, setEditingDrink] = useState<Drink | null>(null);
  const [editStandards, setEditStandards] = useState(1);
  const [editTime, setEditTime] = useState("");
  const [editSelectedTime, setEditSelectedTime] = useState('');
  const [editResolvedDateTime, setEditResolvedDateTime] = useState<Date | null>(null);
  const [selectedDrink, setSelectedDrink] = useState<Drink | null>(null);

  // Helper functions for time handling
  const resolveTimeToDateTime = (timeString: string): Date | null => {
    if (!timeString) return null;
    
    const now = new Date();
    const parts = timeString.split(' ');
    if (parts.length !== 2) return null;
    
    const [time, period] = parts;
    if (!time || !period) return null;
    
    const timeParts = time.split(':');
    if (timeParts.length !== 2) return null;
    
    const hours = parseInt(timeParts[0] ?? '0');
    const minutes = parseInt(timeParts[1] ?? '0');
    if (isNaN(hours) || isNaN(minutes)) return null;
    
    // Convert to 24-hour format
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) {
      hour24 += 12;
    } else if (period === 'AM' && hours === 12) {
      hour24 = 0;
    }
    
    // Create target time for today
    const targetTime = new Date();
    targetTime.setHours(hour24, minutes, 0, 0);
    
    // If target time is in the future, move it to yesterday
    if (targetTime > now) {
      targetTime.setDate(targetTime.getDate() - 1);
    }
    
    return targetTime;
  };

  const formatDateTime = (date: Date | null): string => {
    if (!date) return '';
    const dateObj = date;
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    return dateObj.toLocaleDateString('en-US', options);
  };

  const getCurrentTimeString12Hour = (): string => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const convertTo24Hour = (time12h: string): string => {
    if (!time12h) return '';
    const parts = time12h.split(' ');
    if (parts.length !== 2) return '';
    
    const [time, period] = parts;
    if (!time || !period) return '';
    
    const timeParts = time.split(':');
    if (timeParts.length !== 2) return '';
    
    const hours = parseInt(timeParts[0] ?? '0');
    const minutes = parseInt(timeParts[1] ?? '0');
    if (isNaN(hours) || isNaN(minutes)) return '';
    
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) {
      hour24 += 12;
    } else if (period === 'AM' && hours === 12) {
      hour24 = 0;
    }
    
    return `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const handleTimeChange = (timeString: string) => {
    setSelectedTime(timeString);
    const resolvedDate = resolveTimeToDateTime(timeString);
    setResolvedDateTime(resolvedDate);
  };

  const handleEditTimeChange = (timeString: string) => {
    setEditSelectedTime(timeString);
    const resolvedDate = resolveTimeToDateTime(timeString);
    setEditResolvedDateTime(resolvedDate);
  };

  const roundToOneDecimal = (num: number): number => {
    return Math.round(num * 10) / 10;
  };

  // Initialize time on component mount
  React.useEffect(() => {
    const currentTime = getCurrentTimeString12Hour();
    setSelectedTime(currentTime);
    const resolvedDate = resolveTimeToDateTime(currentTime);
    setResolvedDateTime(resolvedDate);
    
    // Initialize edit time as well
    setEditSelectedTime(currentTime);
    setEditResolvedDateTime(resolvedDate);
  }, []);

  async function handleAddDrink() {
    // Validate standards value
    if (!newStandards || newStandards < 0.1) {
      alert("Please enter a valid number of standard drinks (minimum 0.1).");
      return;
    }

    // Use resolved date time for validation and submission
    if (!resolvedDateTime) {
      alert("Please select a valid time.");
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

    const utcISOString = resolvedDateTime.toISOString();
    
    await addDrink.mutateAsync({ 
      standards: newStandards, 
      finishedAt: utcISOString  // Send as proper UTC ISO string instead of raw newTime
    });
    setNewStandards(1);
    const currentTime = getCurrentTimeString12Hour();
    setSelectedTime(currentTime);
    const resolvedDate = resolveTimeToDateTime(currentTime);
    setResolvedDateTime(resolvedDate);
    setDrawerOpen(false);
  }

  async function handleEditDrink() {
    if (!editingDrink) return;
    
    // Validate standards value
    if (!editStandards || editStandards < 0.1) {
      alert("Please enter a valid number of standard drinks (minimum 0.1).");
      return;
    }
    
    // Use resolved date time for validation and submission
    if (!editResolvedDateTime) {
      alert("Please select a valid time.");
      return;
    }
    
    const utcISOString = editResolvedDateTime.toISOString();
    
    await updateDrink.mutateAsync({ 
      drinkId: editingDrink.id, 
      standards: editStandards, 
      finishedAt: utcISOString
    });
    setEditingDrink(null);
    setEditStandards(1);
    const currentTime = getCurrentTimeString12Hour();
    setEditSelectedTime(currentTime);
    const resolvedDate = resolveTimeToDateTime(currentTime);
    setEditResolvedDateTime(resolvedDate);
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
    // Ensure standards is a valid number, default to 1 if it's too small or invalid
    const validStandards = drink.standards && drink.standards >= 0.1 ? drink.standards : 1;
    setEditStandards(validStandards);
    
    // Convert drink's finishedAt time to 12-hour format for editing
    const drinkTime = new Date(drink.finishedAt);
    const timeString = drinkTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    setEditSelectedTime(timeString);
    setEditResolvedDateTime(drinkTime);
  }

  return (
    <>
      {/* Main Content: Responsive layout */}
      <div className="flex-1 flex flex-col items-center justify-between w-full md:flex-row md:items-stretch md:justify-center md:gap-12 overflow-y-auto pb-32">
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
        <div className="flex flex-col items-center justify-center flex-1 w-full mt-8 md:mt-0">
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
        selectedTime={selectedTime}
        setSelectedTime={setSelectedTime}
        resolvedDateTime={resolvedDateTime}
        setResolvedDateTime={setResolvedDateTime}
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
        handleTimeChange={handleTimeChange}
        formatDateTime={formatDateTime}
        convertTo24Hour={convertTo24Hour}
        roundToOneDecimal={roundToOneDecimal}
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
        editSelectedTime={editSelectedTime}
        setEditSelectedTime={setEditSelectedTime}
        editResolvedDateTime={editResolvedDateTime}
        setEditResolvedDateTime={setEditResolvedDateTime}
        selectedDrink={selectedDrink}
        setSelectedDrink={setSelectedDrink}
        drinksQuery={drinksQuery}
        updateDrink={updateDrink}
        deleteDrink={deleteDrink}
        getCurrentTimeString={getCurrentTimeString}
        handleEditDrink={handleEditDrink}
        handleDeleteDrink={handleDeleteDrink}
        openEditDrink={openEditDrink}
        handleEditTimeChange={handleEditTimeChange}
        convertTo24Hour={convertTo24Hour}
        roundToOneDecimal={roundToOneDecimal}
      />
    </>
  );
} 