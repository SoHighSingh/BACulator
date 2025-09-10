import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import type { Drink } from "~/types/bac";
import { generateAdvancedBACTimeline, type GraphDataPoint } from "~/lib/bac-graph";

interface BacTooltipProps {
  active?: boolean;
  payload?: { value: number; payload: { clockTime: string } }[];
  label?: string | number;
}

function CustomTooltip({ active, payload, label }: BacTooltipProps) {
  if (active && payload?.length) {
    const timeLabel = payload[0]?.payload?.clockTime ?? String(label ?? "");
    
    return (
      <div className="rounded-md bg-black/40 backdrop-blur-sm px-4 py-2 border border-white/10 text-white shadow">
        <div className="font-semibold">Time: {timeLabel}</div>
        <div>BAC: {((payload[0]?.value ?? 0)).toFixed(3)}</div>
      </div>
    );
  }
  return null;
}

// Helper function to calculate adaptive axis settings
function calculateAxisSettings(data: GraphDataPoint[]): {
  yDomain: [number, number];
  yTicks: number[];
  xDomain: [number, number];
  xTickInterval: number;
} {
  if (!data || data.length === 0) {
    return {
      yDomain: [0, 0.10],
      yTicks: [0, 0.02, 0.04, 0.06, 0.08, 0.10],
      xDomain: [0, 8],
      xTickInterval: 1
    };
  }

  // Calculate Y-axis (BAC) settings
  const maxBAC = Math.max(...data.map(d => d.bac ?? 0));
  
  // Round up to next nice increment (0.02, 0.04, 0.06, etc.)
  const yIncrement = 0.02;
  const yMax = Math.ceil(maxBAC / yIncrement) * yIncrement;
  const adjustedYMax = Math.max(yMax, 0.04); // Minimum of 0.04 for readability
  
  // Generate even ticks
  const yTicks = [];
  for (let i = 0; i <= adjustedYMax; i += yIncrement) {
    yTicks.push(Math.round(i * 100) / 100); // Round to avoid floating point issues
  }

  // Calculate X-axis (time) settings
  const minHour = Math.min(...data.map(d => d.hour ?? 0));
  const maxHour = Math.max(...data.map(d => d.hour ?? 0));
  const timeRange = maxHour - minHour;
  
  // Choose appropriate interval based on time range
  let xTickInterval: number;
  if (timeRange <= 2) {
    xTickInterval = 0.25; // 15-minute intervals
  } else if (timeRange <= 4) {
    xTickInterval = 0.5; // 30-minute intervals  
  } else if (timeRange <= 8) {
    xTickInterval = 1; // 1-hour intervals
  } else if (timeRange <= 16) {
    xTickInterval = 2; // 2-hour intervals
  } else {
    xTickInterval = 4; // 4-hour intervals
  }
  
  // Add some padding to the time range
  const padding = timeRange * 0.05; // 5% padding
  const xMin = Math.max(0, minHour - padding);
  const xMax = maxHour + padding;

  return {
    yDomain: [0, adjustedYMax],
    yTicks,
    xDomain: [xMin, xMax],
    xTickInterval
  };
}

// Helper function to generate x-axis ticks
function generateXTicks(xMin: number, xMax: number, interval: number, _data: GraphDataPoint[]) {
  const ticks = [];
  const start = Math.floor(xMin / interval) * interval;
  
  for (let tick = start; tick <= xMax; tick += interval) {
    if (tick >= xMin) {
      ticks.push(tick);
    }
  }
  
  return ticks;
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

  // Calculate adaptive axis settings
  const axisSettings = calculateAxisSettings(advancedTimeline?.data ?? []);
  const xTicks = generateXTicks(
    axisSettings.xDomain[0] ?? 0, 
    axisSettings.xDomain[1] ?? 8, 
    axisSettings.xTickInterval,
    advancedTimeline?.data ?? []
  );

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      onOpenChange(newOpen);
      // Blur active element when dialog opens to prevent aria-hidden warning
      if (newOpen && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }}>
      <DialogContent className="fixed left-1/2 top-1/2 z-[130] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-md bg-black/40 backdrop-blur-sm p-0 shadow-lg border border-white/10 data-[state=open]:animate-fade-in data-[state=open]:animate-scale-in mx-auto">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-2xl font-bold text-white">BAC Graph</DialogTitle>
          <DialogDescription className="text-white/80">
            View your blood alcohol content over time since you started drinking.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 px-6 pb-6">
          {/* Card Header */}
          <div>
            <div className="mb-2 text-white/80">BAC vs Time</div>
          </div>
          {/* Card Content (Chart) */}
          <div className="bg-black/40 backdrop-blur-sm rounded-md border border-white/10 h-96 p-1">
            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart 
                  data={advancedTimeline?.data ?? []} 
                  margin={{ left: -20, right: 20, top: 10, bottom: 0 }}
                >
                <defs>
                  <linearGradient id="bacGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="hour"
                  type="number"
                  scale="linear"
                  domain={axisSettings.xDomain}
                  ticks={xTicks}
                  tickFormatter={(h) => {
                    // Find the data point closest to this hour value to get the clock time
                    if (advancedTimeline?.data) {
                      const closest = advancedTimeline.data.reduce((prev, curr) => 
                        Math.abs(curr.hour - (h as number)) < Math.abs(prev.hour - (h as number)) ? curr : prev
                      );
                      return closest.clockTime;
                    }
                    // Fallback formatting
                    const hours = Math.floor(h as number);
                    const minutes = Math.round(((h as number) - hours) * 60);
                    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                  }}
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  axisLine={{ stroke: '#374151', strokeWidth: 1 }}
                  tickLine={{ stroke: '#374151', strokeWidth: 1 }}
                />
                <YAxis 
                  domain={axisSettings.yDomain}
                  ticks={axisSettings.yTicks}
                  tickFormatter={v => (v * 1).toFixed(2)} 
                  tick={{ fill: '#9CA3AF', fontSize: 11 }}
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
                  if (currentHour != undefined) {                    
                    return (
                      <ReferenceLine 
                        x={currentHour}
                        stroke="#a6a6a6"
                        strokeWidth={1}
                      />
                    );
                  }
                  return null;
                })()}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <Button
            className="w-full mt-2 rounded-md bg-black/40 backdrop-blur-sm border border-white/10 text-white hover:bg-black/50"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}