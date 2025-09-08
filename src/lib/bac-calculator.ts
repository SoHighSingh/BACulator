/* eslint-disable @typescript-eslint/no-inferrable-types */
import type { Drink, BACResult, BACCalculationInputs } from "~/types/bac";

const CONFIG = {
  GRAMS_PER_STANDARD: 10.0,  // 14g for US, 10g for AU/UK
  ABSORPTION_TIME_MINUTES: 30.0,
  ELIMINATION_RATE: 0.015,  // BAC per hour
  ABSORPTION_CURVE_FACTOR: 3.0,  // Controls absorption curve shape
};

/**
 * Round to specified decimal places to maintain precision
 */
function roundToPrecision(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Calculate how much of a single drink has been absorbed by a specific time
 * Returns the absorbed BAC contribution (before elimination)
 */
function calculateAbsorbedBAC(
  drink: Drink,
  userWeight: number,
  userSex: string,
  targetTime: Date
): number {
  const finishedTime = new Date(drink.finishedAt);
  const minutesSinceFinished = (targetTime.getTime() - finishedTime.getTime()) / (1000 * 60);
  
  // Body water distribution ratio
  const distributionRatio: number = userSex === 'male' ? 0.68 : 0.55;
  
  // Calculate peak BAC for this drink using Widmark formula
  const alcoholGrams: number = drink.standards * CONFIG.GRAMS_PER_STANDARD;
  const bodyWeightGrams: number = userWeight * 1000.0;
  const peakBAC: number = (alcoholGrams / (bodyWeightGrams * distributionRatio)) * 100.0;
  
  if (minutesSinceFinished < 0) {
    // Drink hasn't been consumed yet
    return 0.0;
  } else if (minutesSinceFinished <= CONFIG.ABSORPTION_TIME_MINUTES) {
    // Still absorbing - exponential absorption curve
    const absorptionProgress: number = minutesSinceFinished / CONFIG.ABSORPTION_TIME_MINUTES;
    const absorptionFactor: number = 1.0 - Math.exp(-CONFIG.ABSORPTION_CURVE_FACTOR * absorptionProgress);
    return peakBAC * absorptionFactor;
  } else {
    // Fully absorbed
    return peakBAC;
  }
}

/**
 * Track BAC over time to properly calculate elimination
 * This ensures elimination only occurs when alcohol is actually in the system
 */
export function calculateBACAtTime(
  drinks: Drink[],
  userWeight: number,
  userSex: string,
  targetTime: Date
): number {
  if (drinks.length === 0) return 0.0;
  
  // Constants for numerical stability
  const MIN_BAC_THRESHOLD = 1e-6; // Below this, consider BAC as zero
  
  // Sort drinks by time
  const sortedDrinks = [...drinks].sort((a, b) => 
    new Date(a.finishedAt).getTime() - new Date(b.finishedAt).getTime()
  );
  
  // Find when alcohol first enters the system
  const firstDrinkTime = new Date(sortedDrinks[0]!.finishedAt);
  
  // If target time is before first drink, BAC is 0
  if (targetTime.getTime() < firstDrinkTime.getTime()) {
    return 0.0;
  }
  
  // Calculate total absorbed alcohol at target time
  const totalAbsorbed = calculateTotalAbsorbedAtTime(drinks, userWeight, userSex, targetTime);
  
  // Calculate total elimination from when alcohol first entered system
  const totalEliminated = calculateTotalEliminationFromStart(
    drinks, 
    firstDrinkTime, 
    targetTime
  );
  
  // Final BAC with bounds checking
  const finalBAC = Math.max(0, totalAbsorbed - totalEliminated);
  
  // Apply minimum threshold to eliminate floating point artifacts
  return finalBAC < MIN_BAC_THRESHOLD ? 0.0 : finalBAC;
}

/**
 * Calculate total absorbed alcohol at a specific time
 * This is numerically stable as it calculates each drink independently
 */
function calculateTotalAbsorbedAtTime(
  drinks: Drink[],
  userWeight: number,
  userSex: string,
  targetTime: Date
): number {
  const distributionRatio: number = userSex === 'male' ? 0.68 : 0.55;
  const bodyWeightGrams: number = userWeight * 1000.0;
  
  return drinks.reduce((total, drink) => {
    const finishedTime = new Date(drink.finishedAt);
    const minutesSinceFinished = (targetTime.getTime() - finishedTime.getTime()) / (1000 * 60);
    
    // If drink hasn't been consumed yet
    if (minutesSinceFinished < 0) {
      return total;
    }
    
    // Calculate peak BAC for this drink
    const alcoholGrams: number = drink.standards * CONFIG.GRAMS_PER_STANDARD;
    const peakBAC: number = (alcoholGrams / (bodyWeightGrams * distributionRatio)) * 100.0;
    
    // Calculate absorption progress
    let absorptionFactor: number;
    
    if (minutesSinceFinished <= CONFIG.ABSORPTION_TIME_MINUTES) {
      // Still absorbing - exponential absorption curve
      const absorptionProgress: number = minutesSinceFinished / CONFIG.ABSORPTION_TIME_MINUTES;
      absorptionFactor = 1.0 - Math.exp(-CONFIG.ABSORPTION_CURVE_FACTOR * absorptionProgress);
    } else {
      // Fully absorbed
      absorptionFactor = 1.0;
    }
    
    return total + (peakBAC * absorptionFactor);
  }, 0.0);
}

/**
 * Calculate total elimination from when alcohol first entered the system
 * Uses a more sophisticated model that accounts for when elimination actually starts
 */
function calculateTotalEliminationFromStart(
  drinks: Drink[],
  firstDrinkTime: Date,
  targetTime: Date
): number {
  // Time elapsed since first alcohol entered system
  const totalTimeElapsed = (targetTime.getTime() - firstDrinkTime.getTime()) / (1000 * 60 * 60);
  
  if (totalTimeElapsed <= 0) {
    return 0.0;
  }
  
  // Find when significant absorption begins (when first drink starts absorbing)
  // Elimination doesn't really begin until alcohol is in the bloodstream
  const absorptionDelay = Math.min(CONFIG.ABSORPTION_TIME_MINUTES / 60, totalTimeElapsed);
  
  // Calculate effective elimination time (total time minus initial absorption delay)
  const effectiveEliminationTime = Math.max(0, totalTimeElapsed - (absorptionDelay * 0.5));
  
  // Apply elimination rate with a more realistic start curve
  // Elimination starts gradually as absorption begins
  const eliminationStartFactor = Math.min(1.0, totalTimeElapsed / (CONFIG.ABSORPTION_TIME_MINUTES / 60));
  
  return CONFIG.ELIMINATION_RATE * effectiveEliminationTime * eliminationStartFactor;
}

/**
 * Check if BAC is currently rising (any drinks still absorbing)
 */
function isBACRising(
  drinks: Drink[],
  currentTime: Date
): boolean {
  return drinks.some(drink => {
    const finishedTime = new Date(drink.finishedAt);
    const minutesSinceFinished = (currentTime.getTime() - finishedTime.getTime()) / (1000 * 60);
    return minutesSinceFinished >= 0 && minutesSinceFinished <= CONFIG.ABSORPTION_TIME_MINUTES;
  });
}

/**
 * Find when BAC will drop to a target level
 * Handles case where BAC is rising and will exceed target
 */
export function findTimeToTarget(
  drinks: Drink[],
  userWeight: number,
  userSex: string,
  currentTime: Date,
  targetBAC: number
): number {
  const currentBAC = calculateBACAtTime(drinks, userWeight, userSex, currentTime);
  
  // Check if we're currently below target
  if (currentBAC <= targetBAC) {
    // We're below target, but will we rise above it?
    // Check if BAC is rising
    const isRising = isBACRising(drinks, currentTime);
    
    if (!isRising) {
      // Not rising and already below target
      return 0.0;
    }
    
    // We're rising - check if we'll exceed the target
    const { peakBAC } = findPeakBAC(drinks, userWeight, userSex, currentTime);
    
    if (peakBAC <= targetBAC) {
      // Peak won't exceed target, we're safe
      return 0.0;
    }
    
    // We WILL exceed the target - find when we come back down
    // First, find when we exceed the target
    let crossAboveTime = 0;
    for (let minutes = 1; minutes <= 120; minutes++) {
      const checkTime = new Date(currentTime.getTime() + minutes * 60 * 1000);
      const bacAtTime = calculateBACAtTime(drinks, userWeight, userSex, checkTime);
      if (bacAtTime > targetBAC) {
        crossAboveTime = minutes;
        break;
      }
    }
    
    // Now find when we drop back below
    // Start search from when we crossed above
    let low = crossAboveTime;
    let high = 60 * 48; // 48 hours in minutes
    const tolerance = 1; // 1 minute precision
    
    while (high - low > tolerance) {
      const mid = Math.floor((low + high) / 2);
      const checkTime = new Date(currentTime.getTime() + mid * 60 * 1000);
      const bacAtTime = calculateBACAtTime(drinks, userWeight, userSex, checkTime);
      
      if (bacAtTime > targetBAC) {
        low = mid;
      } else {
        high = mid;
      }
    }
    
    const finalTime = new Date(currentTime.getTime() + high * 60 * 1000);
    const finalBAC = calculateBACAtTime(drinks, userWeight, userSex, finalTime);
    
    if (finalBAC <= targetBAC) {
      return roundToPrecision(high / 60.0, 2);
    }
    
    return -1; // Target not reached within 48 hours
  }
  
  // We're above target - find when we drop below
  // Binary search for efficiency
  let low = 0;
  let high = 60 * 48; // 48 hours in minutes
  const tolerance = 1; // 1 minute precision
  
  while (high - low > tolerance) {
    const mid = Math.floor((low + high) / 2);
    const checkTime = new Date(currentTime.getTime() + mid * 60 * 1000);
    const bacAtTime = calculateBACAtTime(drinks, userWeight, userSex, checkTime);
    
    if (bacAtTime > targetBAC) {
      low = mid;
    } else {
      high = mid;
    }
  }
  
  // Verify we found it
  const finalTime = new Date(currentTime.getTime() + high * 60 * 1000);
  const finalBAC = calculateBACAtTime(drinks, userWeight, userSex, finalTime);
  
  if (finalBAC <= targetBAC) {
    return roundToPrecision(high / 60.0, 2);
  }
  
  return -1; // Target not reached within 48 hours
}

/**
 * Find peak BAC and when it occurs
 */
export function findPeakBAC(
  drinks: Drink[],
  userWeight: number,
  userSex: string,
  currentTime: Date
): { peakBAC: number; timeToPeak: number } {
  if (drinks.length === 0) return { peakBAC: 0, timeToPeak: 0 };
  
  let peakBAC: number = 0.0;
  let peakTime: number = 0.0;
  
  // Sort drinks to find time range
  const sortedDrinks = [...drinks].sort((a, b) => 
    new Date(a.finishedAt).getTime() - new Date(b.finishedAt).getTime()
  );
  
  const firstDrinkTime = new Date(sortedDrinks[0]!.finishedAt);
  const lastDrinkTime = new Date(sortedDrinks[sortedDrinks.length - 1]!.finishedAt);
  
  // Search from first drink to estimated sober time
  const startMinutes = Math.floor((firstDrinkTime.getTime() - currentTime.getTime()) / (1000 * 60));
  
  // Estimate maximum duration based on total alcohol
  const totalStandards = drinks.reduce((sum, drink) => sum + drink.standards, 0);
  const estimatedPeakBAC = totalStandards * 0.025; // Rough estimate
  const estimatedHoursToSober = estimatedPeakBAC / CONFIG.ELIMINATION_RATE + 2; // Add buffer
  const endMinutes = Math.max(
    (lastDrinkTime.getTime() - currentTime.getTime()) / (1000 * 60) + 60,
    estimatedHoursToSober * 60
  );
  
  // Intelligent sampling: dense during absorption, sparse during elimination
  const samples: number[] = [];
  
  // Critical points: when each drink finishes and completes absorption
  sortedDrinks.forEach(drink => {
    const drinkMinutes = (new Date(drink.finishedAt).getTime() - currentTime.getTime()) / (1000 * 60);
    
    // Sample densely during absorption (every 2 minutes)
    for (let m = drinkMinutes; m <= drinkMinutes + CONFIG.ABSORPTION_TIME_MINUTES; m += 2) {
      if (m >= startMinutes && m <= endMinutes) {
        samples.push(m);
      }
    }
    
    // Add the exact peak time (30 minutes after consumption)
    samples.push(drinkMinutes + CONFIG.ABSORPTION_TIME_MINUTES);
  });
  
  // Add sparse samples during elimination (every 10 minutes)
  for (let m = startMinutes; m <= endMinutes; m += 10) {
    samples.push(m);
  }
  
  // Remove duplicates and sort
  const uniqueSamples = [...new Set(samples)].sort((a, b) => a - b);
  
  // Find peak
  uniqueSamples.forEach(minutes => {
    const checkTime = new Date(currentTime.getTime() + minutes * 60 * 1000);
    const bac = calculateBACAtTime(drinks, userWeight, userSex, checkTime);
    
    if (bac > peakBAC) {
      peakBAC = bac;
      peakTime = minutes / 60.0;
    }
  });
  
  return { 
    peakBAC: roundToPrecision(peakBAC, 4), 
    timeToPeak: roundToPrecision(peakTime, 2)
  };
}

/**
 * Get the status of a drink at the current time
 */
export function getDrinkStatus(
  drink: Drink,
  currentTime: Date
): { status: 'not_started' | 'absorbing' | 'absorbed'; minutesToPeak: number } {
  const finishedTime = new Date(drink.finishedAt);
  const minutesSinceFinished = (currentTime.getTime() - finishedTime.getTime()) / (1000 * 60);
  
  if (minutesSinceFinished < 0) {
    return { 
      status: 'not_started', 
      minutesToPeak: roundToPrecision(Math.abs(minutesSinceFinished) + CONFIG.ABSORPTION_TIME_MINUTES, 1) 
    };
  } else if (minutesSinceFinished <= CONFIG.ABSORPTION_TIME_MINUTES) {
    return { 
      status: 'absorbing', 
      minutesToPeak: roundToPrecision(CONFIG.ABSORPTION_TIME_MINUTES - minutesSinceFinished, 1) 
    };
  } else {
    return { status: 'absorbed', minutesToPeak: 0.0 };
  }
}

/**
 * Calculate the BAC contribution from a single drink
 * Maintained for backward compatibility
 */
export function calculateDrinkContribution(
  drink: Drink,
  userWeight: number,
  userSex: string,
  currentTime: Date
): { bac: number; isAbsorbing: boolean; peakBAC: number; timeToPeak: number } {
  const status = getDrinkStatus(drink, currentTime);
  const absorbedBAC = calculateAbsorbedBAC(drink, userWeight, userSex, currentTime);
  
  // Calculate peak BAC for this drink
  const distributionRatio: number = userSex === 'male' ? 0.68 : 0.55;
  const alcoholGrams: number = drink.standards * CONFIG.GRAMS_PER_STANDARD;
  const bodyWeightGrams: number = userWeight * 1000.0;
  const peakBAC: number = (alcoholGrams / (bodyWeightGrams * distributionRatio)) * 100.0;
  
  return {
    bac: roundToPrecision(absorbedBAC, 4),
    isAbsorbing: status.status === 'absorbing',
    peakBAC: roundToPrecision(peakBAC, 4),
    timeToPeak: status.minutesToPeak
  };
}

/**
 * Generate BAC over time data
 */
export function generateBACOverTime(
  drinks: Drink[],
  userWeight: number,
  userSex: string,
  currentTime: Date,
  hoursToShow: number = 12.0
): Array<{ hour: number; bac: number }> {
  const dataPoints: Array<{ hour: number; bac: number }> = [];
  
  // Determine sampling strategy based on time range
  let intervalMinutes: number;
  if (hoursToShow <= 6) {
    intervalMinutes = 5;  // Every 5 minutes for short range
  } else if (hoursToShow <= 24) {
    intervalMinutes = 15; // Every 15 minutes for medium range
  } else {
    intervalMinutes = 30; // Every 30 minutes for long range
  }
  
  const totalMinutes = hoursToShow * 60;
  
  // Add critical points for better curve accuracy
  const criticalPoints = new Set<number>();
  
  // Add regular intervals
  for (let minutes = 0; minutes <= totalMinutes; minutes += intervalMinutes) {
    criticalPoints.add(minutes);
  }
  
  // Add absorption completion points for each drink
  drinks.forEach(drink => {
    const drinkMinutes = (new Date(drink.finishedAt).getTime() - currentTime.getTime()) / (1000 * 60);
    if (drinkMinutes >= 0 && drinkMinutes <= totalMinutes) {
      // Add point when drink starts
      criticalPoints.add(Math.max(0, drinkMinutes));
      // Add point when absorption completes
      criticalPoints.add(Math.min(totalMinutes, drinkMinutes + CONFIG.ABSORPTION_TIME_MINUTES));
    }
  });
  
  // Convert to sorted array and calculate BAC at each point
  const sortedPoints = Array.from(criticalPoints).sort((a, b) => a - b);
  
  sortedPoints.forEach(minutes => {
    const checkTime = new Date(currentTime.getTime() + minutes * 60 * 1000);
    const bac = calculateBACAtTime(drinks, userWeight, userSex, checkTime);
    dataPoints.push({ 
      hour: roundToPrecision(minutes / 60.0, 2), 
      bac: roundToPrecision(bac, 4)
    });
  });
  
  return dataPoints;
}

/**
 * Main BAC calculation function
 */
export function calculateBAC(inputs: BACCalculationInputs): BACResult | null {
  const { drinks, userWeight, userSex, currentTime = new Date() } = inputs;
  
  // Input validation
  if (!userWeight || userWeight <= 0.0) {
    return null;
  }
  
  if (!userSex || !['male', 'female'].includes(userSex.toLowerCase())) {
    return null;
  }
  
  if (drinks?.some(drink => !drink.standards || drink.standards <= 0.0)) {
    return null;
  }
  
  if (!drinks || drinks.length === 0) {
    return {
      currentBAC: 0.0,
      timeToSober: 0.0,
      timeToLegal: 0.0,
      bacOverTime: [],
      isRising: false,
      peakBAC: 0.0,
      timeToPeak: 0.0
    };
  }
  
  // Calculate current BAC
  const currentBAC = calculateBACAtTime(drinks, userWeight, userSex.toLowerCase(), currentTime);
  const isRising = isBACRising(drinks, currentTime);
  
  // Find peak BAC
  const { peakBAC, timeToPeak } = findPeakBAC(
    drinks, 
    userWeight, 
    userSex.toLowerCase(), 
    currentTime
  );
  
  // Calculate time to reach target levels
  const timeToSober = findTimeToTarget(drinks, userWeight, userSex.toLowerCase(), currentTime, 0.0);
  const timeToLegal = findTimeToTarget(drinks, userWeight, userSex.toLowerCase(), currentTime, 0.05);
  
  // Generate BAC over time data
  const hoursToShow = Math.max(12.0, Math.min(48.0, (timeToSober === -1 ? 24.0 : timeToSober * 1.2)));
  const bacOverTime = generateBACOverTime(
    drinks, 
    userWeight, 
    userSex.toLowerCase(), 
    currentTime, 
    hoursToShow
  );
  
  return {
    currentBAC: roundToPrecision(Math.max(0.0, currentBAC), 4),
    timeToSober: timeToSober === -1 ? 48.0 : roundToPrecision(timeToSober, 2),
    timeToLegal: timeToLegal === -1 ? 48.0 : roundToPrecision(timeToLegal, 2),
    bacOverTime,
    isRising,
    peakBAC: roundToPrecision(Math.max(0.0, peakBAC), 4),
    timeToPeak: roundToPrecision(timeToPeak, 2)
  };
}