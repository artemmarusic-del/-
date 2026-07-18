export type DiabetesType = "TYPE_1" | "TYPE_2" | "GESTATIONAL" | "OTHER";
export type TimeSegment = "MORNING" | "DAY" | "EVENING" | "NIGHT";
export type GlucoseContext = "FASTING" | "BEFORE_MEAL" | "AFTER_MEAL" | "BEDTIME" | "NIGHT" | "RANDOM";
export type InsulinType = "BOLUS_MEAL" | "BOLUS_CORRECTION" | "BASAL";
export type AdjustmentField = "UNITS_PER_XE" | "CORRECTION_FACTOR";
export type SuggestionStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "AUTO_APPLIED";

export interface User {
  id: string;
  email: string;
  name: string;
  hasProfile?: boolean;
}

export interface Profile {
  id: string;
  userId: string;
  diabetesType: DiabetesType;
  weightKg: number | null;
  birthYear: number | null;
  targetGlucoseMin: number;
  targetGlucoseMax: number;
  xeGramsPerUnit: number;
  doseStepUnits: number;
  insulinActionHours: number;
  unitsPerXeMorning: number;
  unitsPerXeDay: number;
  unitsPerXeEvening: number;
  unitsPerXeNight: number;
  correctionFactorMorning: number;
  correctionFactorDay: number;
  correctionFactorEvening: number;
  correctionFactorNight: number;
  basalDoseUnits: number | null;
  autoApplyAdaptation: boolean;
}

export interface FoodItem {
  id: string;
  name: string;
  category: string;
  kcal100: number;
  protein100: number;
  fat100: number;
  carbs100: number;
  isCustom: boolean;
  createdByUserId: string | null;
}

export interface MealItem {
  id: string;
  foodItemId: string | null;
  foodName: string;
  grams: number;
  carbs: number;
  protein: number;
  fat: number;
  kcal: number;
}

export interface MealEntry {
  id: string;
  eatenAt: string;
  timeSegment: TimeSegment;
  note: string | null;
  totalCarbs: number;
  totalXe: number;
  totalKcal: number;
  totalProtein: number;
  totalFat: number;
  items: MealItem[];
}

export interface GlucoseReading {
  id: string;
  measuredAt: string;
  value: number;
  context: GlucoseContext;
  treatment: string | null;
  mealEntryId: string | null;
}

export interface InsulinDose {
  id: string;
  givenAt: string;
  type: InsulinType;
  units: number;
  calculatedUnits: number | null;
  overrideReason: string | null;
  mealEntryId: string | null;
}

export interface CoefficientAdjustment {
  id: string;
  timeSegment: TimeSegment;
  field: AdjustmentField;
  oldValue: number;
  newValue: number;
  reason: string;
  sampleSize: number;
  status: SuggestionStatus;
  createdAt: string;
  resolvedAt: string | null;
}

export interface InsulinCalcResult {
  xe: number;
  unitsPerXe: number;
  correctionFactor: number;
  mealDoseUnits: number;
  correctionDoseUnits: number;
  iobUnits: number;
  totalUnits: number;
  warnings: string[];
  timeSegment: TimeSegment;
}

export interface DaySummary {
  date: string;
  meals: MealEntry[];
  glucose: GlucoseReading[];
  insulin: InsulinDose[];
  totals: { carbs: number; xe: number; kcal: number; protein: number; fat: number };
}

export interface StatsSummary {
  days: number;
  totalReadings: number;
  averageGlucose: number | null;
  timeInRangePercent: number | null;
  belowRangePercent: number | null;
  aboveRangePercent: number | null;
  averageXePerDay: number;
  targetGlucoseMin: number;
  targetGlucoseMax: number;
}
