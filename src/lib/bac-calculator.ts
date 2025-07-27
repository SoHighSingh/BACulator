/* eslint-disable @typescript-eslint/no-inferrable-types */
import type { Drink, BACResult, BACCalculationInputs } from "~/types/bac";

interface DrinkContribution {
  bac: number;
  isAbsorbing: boolean;
  peakBAC: number;
  timeToPeak: number; // minutes until this drink reaches peak
}

/**
 * Calculate the BAC contribution from a single drink at a specific time
 * Uses realistic absorption curve (30-min exponential rise) and linear elimination
 */
export function calculateDrinkContribution(
  drink: Drink,
  userWeight: number,
  userSex: string,
  currentTime: Date
): DrinkContribution {
  const finishedTime = new Date(drink.finishedAt);
  const minutesSinceFinished = (currentTime.getTime() - finishedTime.getTime()) / (1000 * 60);
  
  // Constants for BAC calculation
  const gramsPerStandard = 10; // grams of alcohol per standard drink
  const distributionRatio = userSex === 'male' ? 0.68 : 0.55; // body water distribution
  const eliminationRate = 0.015; // BAC decrease per hour (0.015% per hour)
  const absorptionTimeMinutes = 30; // time to reach peak BAC
  
  // Calculate peak BAC for this drink using Widmark formula
  const alcoholGrams = drink.standards * gramsPerStandard;
  const bodyWeightGrams = userWeight * 1000;
  const peakBAC = (alcoholGrams / (bodyWeightGrams * distributionRatio)) * 100;
  
  let currentContribution = 0;
  let isAbsorbing = false;
  let timeToPeak = 0;
  
  if (minutesSinceFinished < 0) {
    // Drink hasn't been finished yet - no contribution
    return { bac: 0, isAbsorbing: false, peakBAC, timeToPeak: Math.abs(minutesSinceFinished) + absorptionTimeMinutes };
  } else if (minutesSinceFinished <= absorptionTimeMinutes) {
    // Still absorbing - use exponential rise curve for realistic modeling
    // This creates a steeper initial rise that levels off, similar to real absorption
    const absorptionProgress = minutesSinceFinished / absorptionTimeMinutes;
    const absorptionFactor = 1 - Math.exp(-3 * absorptionProgress); // exponential curve
    currentContribution = peakBAC * absorptionFactor;
    isAbsorbing = true;
    timeToPeak = absorptionTimeMinutes - minutesSinceFinished;
  } else {
    // Past peak - eliminate at constant rate
    const hoursEliminating = (minutesSinceFinished - absorptionTimeMinutes) / 60;
    currentContribution = Math.max(0, peakBAC - (eliminationRate * hoursEliminating));
    isAbsorbing = false;
    timeToPeak = 0;
  }
  
  return { 
    bac: currentContribution, 
    isAbsorbing, 
    peakBAC, 
    timeToPeak 
  };
}

/**
 * Calculate total BAC at a specific time given all drinks
 */
export function calculateBACAtTime(
  drinks: Drink[],
  userWeight: number,
  userSex: string,
  targetTime: Date
): number {
  return drinks.reduce((totalBAC, drink) => {
    const contribution = calculateDrinkContribution(drink, userWeight, userSex, targetTime);
    return totalBAC + contribution.bac;
  }, 0);
}

/**
 * Find when BAC will drop to a target level (e.g., 0.05 for legal, 0.00 for sober)
 */
export function findTimeToTarget(
  drinks: Drink[],
  userWeight: number,
  userSex: string,
  currentTime: Date,
  targetBAC: number
): number {
  // Start checking from current time and look forward
  const minutesToCheck = 60 * 24; // Check up to 24 hours ahead
  const intervalMinutes = 5; // Check every 5 minutes for precision
  
  for (let minutes = 0; minutes <= minutesToCheck; minutes += intervalMinutes) {
    const checkTime = new Date(currentTime.getTime() + minutes * 60 * 1000);
    const bacAtTime = calculateBACAtTime(drinks, userWeight, userSex, checkTime);
    
    if (bacAtTime <= targetBAC) {
      // Interpolate for more precise timing
      if (minutes > 0) {
        const prevTime = new Date(currentTime.getTime() + (minutes - intervalMinutes) * 60 * 1000);
        const prevBAC = calculateBACAtTime(drinks, userWeight, userSex, prevTime);
        
        // Linear interpolation between the two points
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
 * Generate BAC over time data for basic plotting
 */
export function generateBACOverTime(
  drinks: Drink[],
  userWeight: number,
  userSex: string,
  currentTime: Date,
  hoursToShow: number = 12
): Array<{ hour: number; bac: number }> {
  const dataPoints: Array<{ hour: number; bac: number }> = [];
  const intervalMinutes = 15; // Data point every 15 minutes
  const totalMinutes = hoursToShow * 60;
  
  for (let minutes = 0; minutes <= totalMinutes; minutes += intervalMinutes) {
    const checkTime = new Date(currentTime.getTime() + minutes * 60 * 1000);
    const bac = calculateBACAtTime(drinks, userWeight, userSex, checkTime);
    dataPoints.push({ hour: minutes / 60, bac: Math.round(bac * 1000) / 1000 });
  }
  
  return dataPoints;
}

/**
 * Main BAC calculation function
 * Returns comprehensive BAC analysis including current level, predictions, and timing
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
  
  // Calculate current BAC and analyze each drink's contribution
  const drinkContributions = drinks.map(drink => 
    calculateDrinkContribution(drink, userWeight, userSex.toLowerCase(), currentTime)
  );
  
  const currentBAC = drinkContributions.reduce((total, contrib) => total + contrib.bac, 0);
  const isRising = drinkContributions.some(contrib => contrib.isAbsorbing);
  
  // Calculate peak BAC and time to peak
  let peakBAC = currentBAC;
  let timeToPeak = 0;
  
  if (isRising) {
    // Find the future time when BAC peaks
    for (let minutes = 0; minutes <= 120; minutes += 5) { // Check next 2 hours
      const futureTime = new Date(currentTime.getTime() + minutes * 60 * 1000);
      const futureBac = calculateBACAtTime(drinks, userWeight, userSex.toLowerCase(), futureTime);
      if (futureBac > peakBAC) {
        peakBAC = futureBac;
        timeToPeak = minutes / 60;
      }
    }
  }
  
  // Calculate time to reach target levels
  const timeToSober = findTimeToTarget(drinks, userWeight, userSex.toLowerCase(), currentTime, 0.0);
  const timeToLegal = findTimeToTarget(drinks, userWeight, userSex.toLowerCase(), currentTime, 0.05);
  
  // Generate BAC over time data
  const hoursToShow = Math.max(12, timeToSober * 1.2); // Show enough time to see full elimination
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