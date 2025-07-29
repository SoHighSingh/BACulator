import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import type { Drink } from "~/types/bac";
import { generateAdvancedBACTimeline } from "~/lib/bac-graph";

interface BacTooltipProps {
  active?: boolean;
  payload?: { value: number; payload: { clockTime: string } }[];
  label?: string | number;
}

function CustomTooltip({ active, payload, label }: BacTooltipProps) {
  if (active && payload?.length) {
    // Use the clockTime from the data point if available, otherwise fall back to label
    const timeLabel = payload[0]?.payload?.clockTime ?? String(label ?? "");
    
    return (
      <div className="rounded-lg bg-[#232323] px-4 py-2 border border-[#444] text-[#e5e5e5] shadow">
        <div className="font-semibold">Time: {timeLabel}</div>
        <div>BAC: {((payload[0]?.value ?? 0)).toFixed(3)}</div>
      </div>
    );
  }
  return null;
}

interface BACGraphModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drinks: Drink[];
  userWeight: number | null;
  userSex: string | null;
}

export function BACGraphModal({ open, onOpenChange, drinks, userWeight, userSex }: BACGraphModalProps) {
  // Advanced BAC timeline for graph
  let advancedTimeline = null;
  const now = new Date();
  if (userWeight && userSex && drinks.length > 0) {
    advancedTimeline = generateAdvancedBACTimeline(
      drinks,
      userWeight,
      userSex,
      now,
      { intervalMinutes: 5, preStartMinutes: 15, postCurrentHours: 8 }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed left-1/2 top-1/2 z-[130] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-[#232323] p-0 shadow-lg border border-[#444] data-[state=open]:animate-fade-in data-[state=open]:animate-scale-in mx-auto">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-2xl font-bold mb-2 text-[#e5e5e5]">BAC Graph</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 px-6 pb-6">
          {/* Card Header */}
          <div>
            <div className="mb-2 text-[#e5e5e5]/80">BAC% vs Hours Since Drinking</div>
          </div>
          {/* Card Content (Chart) */}
          <div className="bg-[#272727] rounded-lg border border-[#444] h-96 p-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={advancedTimeline ? advancedTimeline.data : []} margin={{ left: -20, right: 20, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="bacGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="hour" 
                  ticks={advancedTimeline?.data.filter((_, index) => index % 12 === 0).map(point => point.hour) ?? [0,1,2,3,4,5,6,7,8,9,10]}
                  domain={[0, 'dataMax + 1']}
                  tickFormatter={(h) => {
                    // Find the data point with this hour value to get the clock time
                    const dataPoint = advancedTimeline?.data.find(point => Math.abs(point.hour - (h as number)) < 0.01);
                    return dataPoint?.clockTime ?? `${Math.floor(h as number).toString().padStart(2, '0')}:${Math.round(((h as number) - Math.floor(h as number)) * 60).toString().padStart(2, '0')}`;
                  }}
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  axisLine={{ stroke: '#374151', strokeWidth: 1 }}
                  tickLine={{ stroke: '#374151', strokeWidth: 1 }}
                />
                <YAxis 
                  domain={[0, 0.10]} 
                  tickFormatter={v => (v * 1).toFixed(2)} 
                  tick={{ fill: '#9CA3AF', fontSize: 11 }}
                  ticks={[0, 0.02, 0.04, 0.06, 0.08, 0.10]}
                  label={{position: 'insideLeft', style: { fill: '#e5e5e5' } }}
                  axisLine={{ stroke: '#374151', strokeWidth: 1 }}
                  tickLine={{ stroke: '#374151', strokeWidth: 1 }}
                />
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.3} />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="bac" 
                  stroke="#a6a6a6" 
                  strokeWidth={2}
                  fillOpacity={0.8} 
                  fill="url(#bacGradient)" 
                  name="Blood Alcohol Content"
                  connectNulls={false}
                />
                {/* Current time marker */}
                {(() => {
                  const currentHour: number | undefined = advancedTimeline?.currentTimeHour;
                  if (currentHour !== undefined) {
                    // Find the current time data point to get the actual clock time
                    const currentDataPoint = advancedTimeline?.data.find(point => 
                      Math.abs(point.hour - currentHour) < 0.1
                    );
                    const timeLabel = currentDataPoint?.clockTime ?? `${Math.floor(currentHour).toString().padStart(2, '0')}:${Math.round((currentHour - Math.floor(currentHour)) * 60).toString().padStart(2, '0')}`;
                    
                    return (
                      <ReferenceLine 
                        x={currentHour}
                        stroke="#FF8800"
                        strokeWidth={8}
                        strokeDasharray="10 5"
                        label={timeLabel}
                      />
                    );
                  }
                  return null;
                })()}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <Button
            className="w-full mt-2 bg-white text-black"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 