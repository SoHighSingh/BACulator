// BAC-related type definitions

export interface Drink {
  id: string;
  standards: number;
  finishedAt: string | Date;
  tabId?: string;
}

export interface UserInfo {
  weight: number | null;
  sex: string | null;
}

export interface BACResult {
  currentBAC: number;
  timeToSober: number; // hours
  timeToLegal: number; // hours to reach 0.05%
  bacOverTime: Array<{ hour: number; bac: number }>;
  isRising: boolean;
  peakBAC: number;
  timeToPeak: number;
}

export interface BACCalculationInputs {
  drinks: Drink[];
  userWeight: number | null;
  userSex: string | null;
  currentTime?: Date;
} 