import { calculateDrinkContribution, calculateBACAtTime } from './bac-calculator';
import type { Drink } from '~/types/bac';

export interface GraphDataPoint {
  hour: number; // Hours from start of timeline
  hoursFromCurrent: number; // Hours relative to current time (negative = past, positive = future)
  bac: number; // BAC level at this time
  time: string; // Formatted time display (e.g., "1h 30m")
  absoluteTime: Date; // Actual timestamp
  clockTime: string; // Actual clock time (e.g., "16:00", "17:00")
  isCurrentTime: boolean; // True if this point represents "now"
  isPast: boolean; // True if this point is in the past
  isFuture: boolean; // True if this point is in the future
}

export interface DrinkMarker {
  id: string;
  hour: number; // Position on timeline
  label: string; // Display label (e.g., "D1")
  standards: number;
  timeFromStart: string; // Formatted time from first drink
}

export interface GraphConfiguration {
  intervalMinutes: number; // Data point frequency (default: 5)
  preStartMinutes: number; // Minutes to show before first drink (default: 15)
  postCurrentHours: number; // Hours to show after current time (default: 8)
}

export interface TimelineResult {
  data: GraphDataPoint[];
  drinkMarkers: DrinkMarker[];
  currentTimeHour: number;
  timelineStartTime: Date;
  totalTimelineHours: number;
  hourlyTimeLabels: string[];
}

export function generateAdvancedBACTimeline(
  drinks: Drink[] = [],
  userWeight: number,
  userSex: string,
  currentTime: Date,
  config: Partial<GraphConfiguration> = {}
): TimelineResult {
  const {
    intervalMinutes = 5,
    postCurrentHours = 8
  } = config;

  if (!drinks || drinks.length === 0) {
    return {
      data: [],
      drinkMarkers: [],
      currentTimeHour: 0,
      timelineStartTime: currentTime,
      totalTimelineHours: 0,
      hourlyTimeLabels: []
    };
  }
  
  // Find the earliest drink time
  const earliestDrink = drinks.reduce((earliest, drink) => 
    new Date(drink.finishedAt) < earliest ? new Date(drink.finishedAt) : earliest, 
    new Date(drinks[0]?.finishedAt ?? currentTime)
  );
  
  // Round down to the nearest hour for timeline start
  const roundedStartTime = new Date(earliestDrink);
  roundedStartTime.setMinutes(0, 0, 0); // Set minutes, seconds, and milliseconds to 0
  
  // Start timeline from the rounded hour (no pre-start minutes needed since we're starting from hour boundary)
  const timelineStartTime = roundedStartTime;
  
  // End timeline after current time to show future predictions
  const timelineEndTime = new Date(currentTime.getTime() + postCurrentHours * 60 * 60 * 1000);
  
  // Generate data points
  const dataPoints: GraphDataPoint[] = [];
  const totalDurationMs = timelineEndTime.getTime() - timelineStartTime.getTime();
  const totalMinutes = totalDurationMs / (1000 * 60);
  const totalHours = totalMinutes / 60;
  
  for (let minutes = 0; minutes <= totalMinutes; minutes += intervalMinutes) {
    const checkTime = new Date(timelineStartTime.getTime() + minutes * 60 * 1000);
    const bac = calculateBACAtTime(drinks, userWeight, userSex, checkTime);
    
    // Calculate time relationships
    const hoursFromStart = minutes / 60;
    const hoursFromCurrent = (checkTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60);
    const isCurrentTime = Math.abs(hoursFromCurrent) < (intervalMinutes / 60 / 2); // Within half interval
    const isPast = hoursFromCurrent < -0.01;
    const isFuture = hoursFromCurrent > 0.01;
    
    dataPoints.push({
      hour: hoursFromStart,
      hoursFromCurrent,
      bac: Math.round(bac * 1000) / 1000, // Round to 3 decimal places
      time: formatTimeFromStart(hoursFromStart),
      absoluteTime: checkTime,
      clockTime: checkTime.toLocaleTimeString('en-AU', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false,
        timeZone: 'Australia/Sydney'
      }),
      isCurrentTime,
      isPast,
      isFuture
    });
  }
  
  // Generate drink markers
  const drinkMarkers: DrinkMarker[] = drinks.map((drink, index) => {
    const drinkTime = new Date(drink.finishedAt);
    const hoursFromStart = (drinkTime.getTime() - timelineStartTime.getTime()) / (1000 * 60 * 60);
    
    return {
      id: drink.id,
      hour: hoursFromStart,
      label: `D${index + 1}`,
      standards: drink.standards,
      timeFromStart: formatTimeFromStart(hoursFromStart)
    };
  });
  
  // Find current time position
  const currentTimeHour = (currentTime.getTime() - timelineStartTime.getTime()) / (1000 * 60 * 60);
  
  // Generate hourly time labels
  const hourlyTimeLabels = generateHourlyTimeLabels(timelineStartTime, totalHours);
  
  return {
    data: dataPoints,
    drinkMarkers,
    currentTimeHour,
    timelineStartTime,
    totalTimelineHours: totalHours,
    hourlyTimeLabels
  };
}

export function formatTimeFromStart(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function generateHourlyTimeLabels(timelineStartTime: Date, totalHours: number): string[] {
  const labels: string[] = [];
  
  // Round timeline start time to the nearest hour
  const roundedStartTime = new Date(timelineStartTime);
  roundedStartTime.setMinutes(0, 0, 0); // Set minutes, seconds, and milliseconds to 0
  
  for (let hour = 0; hour <= Math.ceil(totalHours); hour++) {
    const time = new Date(roundedStartTime.getTime() + hour * 60 * 60 * 1000);
    const timeString = time.toLocaleTimeString('en-AU', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false,
      timeZone: 'Australia/Sydney'
    });
    labels.push(timeString);
  }
  return labels;
}

export function formatTimeRelativeToCurrent(hoursFromCurrent: number): string {
  const totalMinutes = Math.abs(Math.round(hoursFromCurrent * 60));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  
  let timeStr = '';
  if (h === 0) timeStr = `${m} min`;
  else if (m === 0) timeStr = `${h}h`;
  else timeStr = `${h}h ${m}m`;
  
  if (hoursFromCurrent < 0) return `${timeStr} ago`;
  if (hoursFromCurrent > 0) return `in ${timeStr}`;
  return 'now';
}

export function generateDrinkTimeline(
  drinks: Drink[] = [],
  userWeight: number,
  userSex: string,
  currentTime: Date
): Array<{
  drink: Drink;
  index: number;
  minutesAgo: number;
  minutesFromStart: number;
  timeFromStart: string;
  timeRelativeToCurrent: string;
  isAbsorbing: boolean;
  bacContribution: number;
  status: 'not_started' | 'absorbing' | 'eliminating' | 'eliminated';
}> {
  if (!drinks || drinks.length === 0) return [];
  
  const earliestDrink = drinks.reduce((earliest, drink) => 
    new Date(drink.finishedAt) < earliest ? new Date(drink.finishedAt) : earliest, 
    new Date(drinks[0]?.finishedAt ?? currentTime)
  );
  
  return drinks.map((drink, index) => {
    const drinkTime = new Date(drink.finishedAt);
    const minutesAgo = Math.round((currentTime.getTime() - drinkTime.getTime()) / (1000 * 60));
    const minutesFromStart = Math.round((drinkTime.getTime() - earliestDrink.getTime()) / (1000 * 60));
    const contribution = calculateDrinkContribution(drink, userWeight, userSex, currentTime);
    
    // Determine status
    let status: 'not_started' | 'absorbing' | 'eliminating' | 'eliminated';
    if (minutesAgo < 0) status = 'not_started';
    else if (contribution.isAbsorbing) status = 'absorbing';
    else if (contribution.bac > 0.001) status = 'eliminating';
    else status = 'eliminated';
    
    return {
      drink,
      index,
      minutesAgo,
      minutesFromStart,
      timeFromStart: formatTimeFromStart(minutesFromStart / 60),
      timeRelativeToCurrent: formatTimeRelativeToCurrent(-minutesAgo / 60),
      isAbsorbing: contribution.isAbsorbing,
      bacContribution: contribution.bac,
      status
    };
  });
}

export function findTimelineEvents(
  data: GraphDataPoint[],
  currentTimeHour: number
): {
  peakBAC: { time: string; bac: number; hour: number } | null;
  legalCrossing: { time: string; hour: number } | null;
  soberTime: { time: string; hour: number } | null;
  currentBAC: { time: string; bac: number; hour: number } | null;
} {
  if (!data || data.length === 0) {
    return {
      peakBAC: null,
      legalCrossing: null,
      soberTime: null,
      currentBAC: null
    };
  }
  // Find current BAC at current time
  const closest = data.reduce((closest, point) => 
    Math.abs(point.hour - currentTimeHour) < Math.abs(closest.hour - currentTimeHour) 
      ? point : closest, data[0]!);
  
  // Find peak BAC
  const peakPoint = data.reduce((peak, point) => point.bac > peak.bac ? point : peak, data[0]!);
  
  // Find legal crossing (0.05%)
  const legalCrossing = data.find(point => point.bac <= 0.05 && point.hour > currentTimeHour);
  
  // Find sober time (0.00%)
  const soberTime = data.find(point => point.bac <= 0.001 && point.hour > currentTimeHour);
  
  return {
    peakBAC: peakPoint ? { time: peakPoint.time, bac: peakPoint.bac, hour: peakPoint.hour } : null,
    legalCrossing: legalCrossing ? { time: legalCrossing.time, hour: legalCrossing.hour } : null,
    soberTime: soberTime ? { time: soberTime.time, hour: soberTime.hour } : null,
    currentBAC: closest ? { time: closest.time, bac: closest.bac, hour: closest.hour } : null
  };
}

export function generateChartData(timeline: TimelineResult) {
  return {
    // For Recharts
    recharts: {
      data: timeline.data.map(point => ({
        hour: point.hour,
        bac: point.bac * 100, // Convert to percentage
        bacDecimal: point.bac,
        time: point.time,
        isCurrentTime: point.isCurrentTime,
        isPast: point.isPast,
        isFuture: point.isFuture
      })),
      currentTimeHour: timeline.currentTimeHour,
      drinkMarkers: timeline.drinkMarkers
    },
    
    // For Chart.js
    chartjs: {
      labels: timeline.data.map(d => d.time),
      datasets: [{
        label: 'BAC (%)',
        data: timeline.data.map(d => d.bac * 100),
        borderColor: '#F87171',
        backgroundColor: 'rgba(248, 113, 113, 0.1)',
        tension: 0.2
      }],
      annotations: {
        currentTime: {
          type: 'line' as const,
          xMin: timeline.currentTimeHour,
          xMax: timeline.currentTimeHour,
          borderColor: '#10B981',
          label: { content: 'Current Time', enabled: true }
        },
        legalLimit: {
          type: 'line' as const,
          yMin: 0.08,
          yMax: 0.08,
          borderColor: '#EF4444',
          borderDash: [5, 5],
          label: { content: 'Legal Limit (0.08%)', enabled: true }
        }
      }
    },
    
    // For D3.js
    d3: {
      data: timeline.data,
      xScale: { domain: [0, timeline.totalTimelineHours], key: 'hour' },
      yScale: { domain: [0, Math.max(...timeline.data.map(d => d.bac))], key: 'bac' },
      currentTimeHour: timeline.currentTimeHour,
      drinkMarkers: timeline.drinkMarkers
    }
  };
}

export function calculateTimelineStats(
  drinks: Drink[],
  timeline: TimelineResult,
  currentTime: Date
): {
  totalDrinks: number;
  totalStandards: number;
  drinkingDuration: number; // hours between first and last drink
  currentBAC: number;
  peakBAC: number;
  isCurrentlyRising: boolean;
  hoursToSober: number;
  hoursToLegal: number;
} {
  if (!drinks || drinks.length === 0) {
    return {
      totalDrinks: 0,
      totalStandards: 0,
      drinkingDuration: 0,
      currentBAC: 0,
      peakBAC: 0,
      isCurrentlyRising: false,
      hoursToSober: 0,
      hoursToLegal: 0
    };
  }
  
  const events = findTimelineEvents(timeline.data, timeline.currentTimeHour);
  const totalStandards = drinks.reduce((sum, drink) => sum + drink.standards, 0);
  
  // Calculate drinking duration
  const drinkTimes = drinks.map(d => new Date(d.finishedAt).getTime());
  const drinkingDuration = (Math.max(...drinkTimes) - Math.min(...drinkTimes)) / (1000 * 60 * 60);
  
  // Check if currently rising (any recent drinks still absorbing)
  const recentDrinks = drinks.filter(drink => {
    const minutesAgo = (currentTime.getTime() - new Date(drink.finishedAt).getTime()) / (1000 * 60);
    return minutesAgo >= 0 && minutesAgo <= 30; // Within absorption window
  });
  const isCurrentlyRising = recentDrinks.length > 0;
  
  // Calculate hours to targets from current time
  const currentData = timeline.data.filter(d => d.hour >= timeline.currentTimeHour);
  const soberPoint = currentData.find(d => d.bac <= 0.001);
  const legalPoint = currentData.find(d => d.bac <= 0.05);
  
  return {
    totalDrinks: drinks.length,
    totalStandards,
    drinkingDuration,
    currentBAC: events.currentBAC?.bac ?? 0,
    peakBAC: events.peakBAC?.bac ?? 0,
    isCurrentlyRising,
    hoursToSober: soberPoint ? soberPoint.hoursFromCurrent : 24,
    hoursToLegal: legalPoint ? legalPoint.hoursFromCurrent : 24
  };
}

const bacGraphUtils = {
  generateAdvancedBACTimeline,
  formatTimeFromStart,
  formatTimeRelativeToCurrent,
  generateDrinkTimeline,
  findTimelineEvents,
  generateChartData,
  calculateTimelineStats
};
 
export default bacGraphUtils; 