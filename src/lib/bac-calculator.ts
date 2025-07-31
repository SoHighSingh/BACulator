/* eslint-disable @typescript-eslint/no-inferrable-types */
import type { Drink, BACResult, BACCalculationInputs } from "~/types/bac";

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
  
  // Constants for BAC calculation
  const gramsPerStandard: number = 14.0; // grams of alcohol per standard drink
  const distributionRatio: number = userSex === 'male' ? 0.68 : 0.55; // body water distribution
  const absorptionTimeMinutes: number = 30.0; // time to reach peak absorption
  
  // Calculate peak BAC for this drink using Widmark formula
  // Ensure decimal precision is maintained throughout
  const alcoholGrams: number = drink.standards * gramsPerStandard;
  const bodyWeightGrams: number = userWeight * 1000.0;
  const peakBAC: number = (alcoholGrams / (bodyWeightGrams * distributionRatio)) * 100.0;
  
  if (minutesSinceFinished < 0) {
    // Drink hasn't been consumed yet
    return 0.0;
  } else if (minutesSinceFinished <= absorptionTimeMinutes) {
    // Still absorbing - exponential absorption curve
    const absorptionProgress: number = minutesSinceFinished / absorptionTimeMinutes;
    const absorptionFactor: number = 1.0 - Math.exp(-3.0 * absorptionProgress);
    return peakBAC * absorptionFactor;
  } else {
    // Fully absorbed
    return peakBAC;
  }
}

/**
 * Calculate total elimination from the bloodstream by a specific time
 * Elimination starts when first alcohol enters bloodstream and continues at 0.015%/hour
 */
function calculateTotalElimination(
  drinks: Drink[],
  userWeight: number,
  userSex: string,
  targetTime: Date
): number {
  if (drinks.length === 0) return 0.0;
  
  const eliminationRate: number = 0.015; // 0.015% BAC per hour
  
  // Find when first alcohol enters bloodstream (first drink starts absorbing)
  const firstDrinkTime = drinks.reduce((earliest, drink) => {
    const drinkTime = new Date(drink.finishedAt);
    return drinkTime < earliest ? drinkTime : earliest;
  }, new Date(drinks[0]!.finishedAt));
  
  // Calculate hours since first alcohol entered bloodstream
  const hoursSinceFirstDrink: number = Math.max(0.0, (targetTime.getTime() - firstDrinkTime.getTime()) / (1000 * 60 * 60));
  
  // Total elimination = elimination rate × time elapsed
  return eliminationRate * hoursSinceFirstDrink;
}

/**
 * Calculate BAC at a specific time using proper elimination model
 * BAC = Total Absorbed - Total Eliminated
 */
export function calculateBACAtTime(
  drinks: Drink[],
  userWeight: number,
  userSex: string,
  targetTime: Date
): number {
  if (drinks.length === 0) return 0.0;
  
  // Calculate total absorbed BAC from all drinks
  const totalAbsorbed: number = drinks.reduce((total, drink) => {
    return total + calculateAbsorbedBAC(drink, userWeight, userSex, targetTime);
  }, 0.0);
  
  // Calculate total eliminated BAC
  const totalEliminated: number = calculateTotalElimination(drinks, userWeight, userSex, targetTime);
  
  // Current BAC = absorbed - eliminated
  const currentBAC = Math.max(0.0, totalAbsorbed - totalEliminated);
  
  // Round to 4 decimal places to maintain precision while avoiding floating point errors
  return roundToPrecision(currentBAC, 4);
}

/**
 * Check if BAC is currently rising (any drinks still absorbing)
 */
function isBACRising(
  drinks: Drink[],
  currentTime: Date
): boolean {
  const absorptionTimeMinutes: number = 30.0;
  
  return drinks.some(drink => {
    const finishedTime = new Date(drink.finishedAt);
    const minutesSinceFinished: number = (currentTime.getTime() - finishedTime.getTime()) / (1000 * 60);
    return minutesSinceFinished >= 0 && minutesSinceFinished <= absorptionTimeMinutes;
  });
}

/**
 * Find when BAC will drop to a target level
 */
export function findTimeToTarget(
  drinks: Drink[],
  userWeight: number,
  userSex: string,
  currentTime: Date,
  targetBAC: number
): number {
  const minutesToCheck: number = 60 * 24; // Check up to 24 hours ahead
  const intervalMinutes: number = 5; // Check every 5 minutes
  
  for (let minutes = 0; minutes <= minutesToCheck; minutes += intervalMinutes) {
    const checkTime = new Date(currentTime.getTime() + minutes * 60 * 1000);
    const bacAtTime: number = calculateBACAtTime(drinks, userWeight, userSex, checkTime);
    
    if (bacAtTime <= targetBAC) {
      // Linear interpolation for more precision
      if (minutes > 0) {
        const prevTime = new Date(currentTime.getTime() + (minutes - intervalMinutes) * 60 * 1000);
        const prevBAC: number = calculateBACAtTime(drinks, userWeight, userSex, prevTime);
        
        const bacDiff: number = prevBAC - bacAtTime;
        const targetDiff: number = prevBAC - targetBAC;
        const timeFraction: number = bacDiff > 0 ? targetDiff / bacDiff : 0.0;
        
        const timeToTarget = (minutes - intervalMinutes + timeFraction * intervalMinutes) / 60.0;
        return roundToPrecision(timeToTarget, 2);
      }
      return roundToPrecision(minutes / 60.0, 2);
    }
  }
  
  return -1; // Target not reached within 24 hours
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
  let peakBAC: number = 0.0;
  let peakTime: number = 0.0;
  
  // Check current BAC
  const currentBAC: number = calculateBACAtTime(drinks, userWeight, userSex, currentTime);
  peakBAC = currentBAC;
  
  // Check future BAC levels for next 2 hours (covers all absorption)
  for (let minutes = 5; minutes <= 120; minutes += 5) {
    const checkTime = new Date(currentTime.getTime() + minutes * 60 * 1000);
    const bac: number = calculateBACAtTime(drinks, userWeight, userSex, checkTime);
    
    if (bac > peakBAC) {
      peakBAC = bac;
      peakTime = minutes / 60.0;
    }
  }
  
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
  const minutesSinceFinished: number = (currentTime.getTime() - finishedTime.getTime()) / (1000 * 60);
  const absorptionTimeMinutes: number = 30.0;
  
  if (minutesSinceFinished < 0) {
    return { 
      status: 'not_started', 
      minutesToPeak: roundToPrecision(Math.abs(minutesSinceFinished) + absorptionTimeMinutes, 1) 
    };
  } else if (minutesSinceFinished <= absorptionTimeMinutes) {
    return { 
      status: 'absorbing', 
      minutesToPeak: roundToPrecision(absorptionTimeMinutes - minutesSinceFinished, 1) 
    };
  } else {
    return { status: 'absorbed', minutesToPeak: 0.0 };
  }
}

/**
 * Legacy function for backward compatibility
 * Calculate the BAC contribution from a single drink at a specific time
 */
export function calculateDrinkContribution(
  drink: Drink,
  userWeight: number,
  userSex: string,
  currentTime: Date
): { bac: number; isAbsorbing: boolean; peakBAC: number; timeToPeak: number } {
  const status = getDrinkStatus(drink, currentTime);
  const absorbedBAC: number = calculateAbsorbedBAC(drink, userWeight, userSex, currentTime);
  
  // Calculate peak BAC for this drink
  const gramsPerStandard: number = 14.0;
  const distributionRatio: number = userSex === 'male' ? 0.68 : 0.55;
  const alcoholGrams: number = drink.standards * gramsPerStandard;
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
  const intervalMinutes: number = 15;
  const totalMinutes: number = hoursToShow * 60;
  
  for (let minutes = 0; minutes <= totalMinutes; minutes += intervalMinutes) {
    const checkTime = new Date(currentTime.getTime() + minutes * 60 * 1000);
    const bac: number = calculateBACAtTime(drinks, userWeight, userSex, checkTime);
    dataPoints.push({ 
      hour: roundToPrecision(minutes / 60.0, 2), 
      bac: roundToPrecision(bac, 4) // Increased precision from 3 to 4 decimal places
    });
  }
  
  return dataPoints;
}

/**
 * Main BAC calculation function with corrected elimination model
 */
export function calculateBAC(inputs: BACCalculationInputs): BACResult | null {
  const { drinks, userWeight, userSex, currentTime = new Date() } = inputs;
  
  // Validate inputs - now supporting decimal weights and standards
  if (!userWeight || userWeight <= 0.0) {
    return null;
  }
  
  if (!userSex || !['male', 'female'].includes(userSex.toLowerCase())) {
    return null;
  }
  
  // Validate that all drinks have valid standards (supporting decimals)
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
  
  // Calculate current BAC using corrected model
  const currentBAC: number = calculateBACAtTime(drinks, userWeight, userSex.toLowerCase(), currentTime);
  const isRising: boolean = isBACRising(drinks, currentTime);
  
  // Find peak BAC and timing
  const { peakBAC, timeToPeak } = findPeakBAC(drinks, userWeight, userSex.toLowerCase(), currentTime);
  
  // Calculate time to reach target levels
  const timeToSober: number = findTimeToTarget(drinks, userWeight, userSex.toLowerCase(), currentTime, 0.0);
  const timeToLegal: number = findTimeToTarget(drinks, userWeight, userSex.toLowerCase(), currentTime, 0.05);
  
  // Generate BAC over time data
  const hoursToShow: number = Math.max(12.0, timeToSober * 1.2);
  const bacOverTime = generateBACOverTime(drinks, userWeight, userSex.toLowerCase(), currentTime, hoursToShow);
  
  return {
    currentBAC: roundToPrecision(Math.max(0.0, currentBAC), 4),
    timeToSober: timeToSober === -1 ? 24.0 : roundToPrecision(timeToSober, 2),
    timeToLegal: timeToLegal === -1 ? 24.0 : roundToPrecision(timeToLegal, 2),
    bacOverTime,
    isRising,
    peakBAC: roundToPrecision(Math.max(0.0, peakBAC), 4),
    timeToPeak: roundToPrecision(timeToPeak, 2)
  };
}