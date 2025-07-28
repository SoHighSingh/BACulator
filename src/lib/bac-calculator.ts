/* eslint-disable @typescript-eslint/no-inferrable-types */
import type { Drink, BACResult, BACCalculationInputs } from "~/types/bac";

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
  const gramsPerStandard = 14; // grams of alcohol per standard drink
  const distributionRatio = userSex === 'male' ? 0.68 : 0.55; // body water distribution
  const absorptionTimeMinutes = 30; // time to reach peak absorption
  
  // Calculate peak BAC for this drink using Widmark formula
  const alcoholGrams = drink.standards * gramsPerStandard;
  const bodyWeightGrams = userWeight * 1000;
  const peakBAC = (alcoholGrams / (bodyWeightGrams * distributionRatio)) * 100;
  
  if (minutesSinceFinished < 0) {
    // Drink hasn't been consumed yet
    return 0;
  } else if (minutesSinceFinished <= absorptionTimeMinutes) {
    // Still absorbing - exponential absorption curve
    const absorptionProgress = minutesSinceFinished / absorptionTimeMinutes;
    const absorptionFactor = 1 - Math.exp(-3 * absorptionProgress);
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
  if (drinks.length === 0) return 0;
  
  const eliminationRate = 0.015; // 0.015% BAC per hour
  
  // Find when first alcohol enters bloodstream (first drink starts absorbing)
  const firstDrinkTime = drinks.reduce((earliest, drink) => {
    const drinkTime = new Date(drink.finishedAt);
    return drinkTime < earliest ? drinkTime : earliest;
  }, new Date(drinks[0]!.finishedAt));
  
  // Calculate hours since first alcohol entered bloodstream
  const hoursSinceFirstDrink = Math.max(0, (targetTime.getTime() - firstDrinkTime.getTime()) / (1000 * 60 * 60));
  
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
  if (drinks.length === 0) return 0;
  
  // Calculate total absorbed BAC from all drinks
  const totalAbsorbed = drinks.reduce((total, drink) => {
    return total + calculateAbsorbedBAC(drink, userWeight, userSex, targetTime);
  }, 0);
  
  // Calculate total eliminated BAC
  const totalEliminated = calculateTotalElimination(drinks, userWeight, userSex, targetTime);
  
  // Current BAC = absorbed - eliminated
  return Math.max(0, totalAbsorbed - totalEliminated);
}

/**
 * Check if BAC is currently rising (any drinks still absorbing)
 */
function isBACRising(
  drinks: Drink[],
  currentTime: Date
): boolean {
  const absorptionTimeMinutes = 30;
  
  return drinks.some(drink => {
    const finishedTime = new Date(drink.finishedAt);
    const minutesSinceFinished = (currentTime.getTime() - finishedTime.getTime()) / (1000 * 60);
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
  const minutesToCheck = 60 * 24; // Check up to 24 hours ahead
  const intervalMinutes = 5; // Check every 5 minutes
  
  for (let minutes = 0; minutes <= minutesToCheck; minutes += intervalMinutes) {
    const checkTime = new Date(currentTime.getTime() + minutes * 60 * 1000);
    const bacAtTime = calculateBACAtTime(drinks, userWeight, userSex, checkTime);
    
    if (bacAtTime <= targetBAC) {
      // Linear interpolation for more precision
      if (minutes > 0) {
        const prevTime = new Date(currentTime.getTime() + (minutes - intervalMinutes) * 60 * 1000);
        const prevBAC = calculateBACAtTime(drinks, userWeight, userSex, prevTime);
        
        const bacDiff = prevBAC - bacAtTime;
        const targetDiff = prevBAC - targetBAC;
        const timeFraction = bacDiff > 0 ? targetDiff / bacDiff : 0;
        
        return (minutes - intervalMinutes + timeFraction * intervalMinutes) / 60;
      }
      return minutes / 60;
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
  let peakBAC = 0;
  let peakTime = 0;
  
  // Check current BAC
  const currentBAC = calculateBACAtTime(drinks, userWeight, userSex, currentTime);
  peakBAC = currentBAC;
  
  // Check future BAC levels for next 2 hours (covers all absorption)
  for (let minutes = 5; minutes <= 120; minutes += 5) {
    const checkTime = new Date(currentTime.getTime() + minutes * 60 * 1000);
    const bac = calculateBACAtTime(drinks, userWeight, userSex, checkTime);
    
    if (bac > peakBAC) {
      peakBAC = bac;
      peakTime = minutes / 60;
    }
  }
  
  return { peakBAC, timeToPeak: peakTime };
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
  const absorptionTimeMinutes = 30;
  
  if (minutesSinceFinished < 0) {
    return { status: 'not_started', minutesToPeak: Math.abs(minutesSinceFinished) + absorptionTimeMinutes };
  } else if (minutesSinceFinished <= absorptionTimeMinutes) {
    return { status: 'absorbing', minutesToPeak: absorptionTimeMinutes - minutesSinceFinished };
  } else {
    return { status: 'absorbed', minutesToPeak: 0 };
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
  const absorbedBAC = calculateAbsorbedBAC(drink, userWeight, userSex, currentTime);
  
  // Calculate peak BAC for this drink
  const gramsPerStandard = 14;
  const distributionRatio = userSex === 'male' ? 0.68 : 0.55;
  const alcoholGrams = drink.standards * gramsPerStandard;
  const bodyWeightGrams = userWeight * 1000;
  const peakBAC = (alcoholGrams / (bodyWeightGrams * distributionRatio)) * 100;
  
  return {
    bac: absorbedBAC,
    isAbsorbing: status.status === 'absorbing',
    peakBAC,
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
  hoursToShow: number = 12
): Array<{ hour: number; bac: number }> {
  const dataPoints: Array<{ hour: number; bac: number }> = [];
  const intervalMinutes = 15;
  const totalMinutes = hoursToShow * 60;
  
  for (let minutes = 0; minutes <= totalMinutes; minutes += intervalMinutes) {
    const checkTime = new Date(currentTime.getTime() + minutes * 60 * 1000);
    const bac = calculateBACAtTime(drinks, userWeight, userSex, checkTime);
    dataPoints.push({ 
      hour: minutes / 60, 
      bac: Math.round(bac * 1000) / 1000 
    });
  }
  
  return dataPoints;
}

/**
 * Main BAC calculation function with corrected elimination model
 */
export function calculateBAC(inputs: BACCalculationInputs): BACResult | null {
  const { drinks, userWeight, userSex, currentTime = new Date() } = inputs;
  
  // Validate inputs
  if (!userWeight || userWeight <= 0) {
    return null;
  }
  
  if (!userSex || !['male', 'female'].includes(userSex.toLowerCase())) {
    return null;
  }
  
  if (!drinks || drinks.length === 0) {
    return {
      currentBAC: 0,
      timeToSober: 0,
      timeToLegal: 0,
      bacOverTime: [],
      isRising: false,
      peakBAC: 0,
      timeToPeak: 0
    };
  }
  
  // Calculate current BAC using corrected model
  const currentBAC = calculateBACAtTime(drinks, userWeight, userSex.toLowerCase(), currentTime);
  const isRising = isBACRising(drinks, currentTime);
  
  // Find peak BAC and timing
  const { peakBAC, timeToPeak } = findPeakBAC(drinks, userWeight, userSex.toLowerCase(), currentTime);
  
  // Calculate time to reach target levels
  const timeToSober = findTimeToTarget(drinks, userWeight, userSex.toLowerCase(), currentTime, 0.0);
  const timeToLegal = findTimeToTarget(drinks, userWeight, userSex.toLowerCase(), currentTime, 0.05);
  
  // Generate BAC over time data
  const hoursToShow = Math.max(12, timeToSober * 1.2);
  const bacOverTime = generateBACOverTime(drinks, userWeight, userSex.toLowerCase(), currentTime, hoursToShow);
  
  return {
    currentBAC: Math.max(0, currentBAC),
    timeToSober: timeToSober === -1 ? 24 : timeToSober,
    timeToLegal: timeToLegal === -1 ? 24 : timeToLegal,
    bacOverTime,
    isRising,
    peakBAC: Math.max(0, peakBAC),
    timeToPeak
  };
} 