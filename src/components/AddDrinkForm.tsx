import React from "react";

interface AddDrinkFormProps {
  standards: number;
  setStandards: (standards: number) => void;
  selectedTime: string;
  convertTo24Hour: (time12h: string) => string;
  handleTimeChange: (timeString: string) => void;
  roundToOneDecimal: (num: number) => number;
}

export function AddDrinkForm({
  standards,
  setStandards,
  selectedTime,
  convertTo24Hour,
  handleTimeChange,
  roundToOneDecimal,
}: AddDrinkFormProps) {
  return (
    <div className="flex flex-col gap-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-md p-4 mb-4">
      <div className="flex items-center gap-4 text-[#e5e5e5]">
        <label className="w-56 text-sm">Standards</label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStandards(Math.max(0, standards - 0.5))}
            className="w-8 h-8 rounded-md bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold text-lg flex items-center justify-center transition-colors active:scale-95"
          >
            −
          </button>
          <input
            type="number"
            min="0.1"
            max="20"
            step="0.1"
            value={standards || ""}
            onChange={e => {
              const value = e.target.value;
              if (value === "") {
                setStandards(0);
                return;
              }
              const numValue = Number(value);
              if (!isNaN(numValue) && numValue >= 0) {
                setStandards(numValue);
              }
            }}
            onBlur={e => {
              // Round to clean decimal when user finishes typing
              const numValue = Number(e.target.value);
              if (!isNaN(numValue) && numValue >= 0) {
                setStandards(roundToOneDecimal(numValue));
              }
            }}
            className="rounded-md px-3 py-2 text-white bg-white/20 backdrop-blur-sm border border-white/30 w-20 text-center"
            placeholder="1.0"
          />
          <button
            onClick={() => setStandards(Math.min(20, Math.round((standards + 0.5) * 10) / 10))}
            className="w-8 h-8 rounded-md bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold text-lg flex items-center justify-center transition-colors active:scale-95"
          >
            +
          </button>
        </div>
      </div>
      <div className="flex items-center gap-4 text-[#e5e5e5]">
        <label className="w-56 text-sm">Time Finished Drinking</label>
        <input
          type="time"
          value={convertTo24Hour(selectedTime)}
          onChange={e => {
            if (e.target.value) {
              // Convert 24-hour time to 12-hour with AM/PM
              const [hours, minutes] = e.target.value.split(':');
              const hour12 = parseInt(hours ?? '0') % 12 || 12;
              const period = parseInt(hours ?? '0') >= 12 ? 'PM' : 'AM';
              const timeString = `${hour12}:${minutes} ${period}`;
              handleTimeChange(timeString);
            }
          }}
          className="rounded-md w-40 px-3 py-2 text-white bg-white/20 backdrop-blur-sm border border-white/30"
        />
      </div>
    </div>
  );
}