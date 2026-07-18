import { Profile, TimeSegment } from "@prisma/client";

export interface RecentDose {
  givenAt: Date;
  units: number;
}

export interface InsulinCalcInput {
  profile: Profile;
  timeSegment: TimeSegment;
  carbsGrams?: number;
  currentGlucose?: number;
  recentDoses?: RecentDose[];
  now?: Date;
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
}

function pickUnitsPerXe(profile: Profile, segment: TimeSegment): number {
  switch (segment) {
    case TimeSegment.MORNING:
      return profile.unitsPerXeMorning;
    case TimeSegment.DAY:
      return profile.unitsPerXeDay;
    case TimeSegment.EVENING:
      return profile.unitsPerXeEvening;
    case TimeSegment.NIGHT:
      return profile.unitsPerXeNight;
  }
}

function pickCorrectionFactor(profile: Profile, segment: TimeSegment): number {
  switch (segment) {
    case TimeSegment.MORNING:
      return profile.correctionFactorMorning;
    case TimeSegment.DAY:
      return profile.correctionFactorDay;
    case TimeSegment.EVENING:
      return profile.correctionFactorEvening;
    case TimeSegment.NIGHT:
      return profile.correctionFactorNight;
  }
}

function roundToStep(value: number, step: number): number {
  if (value <= 0) return 0;
  return Math.round(value / step) * step;
}

/** Linear decay approximation of insulin-on-board for rapid-acting insulin. */
function calculateIob(recentDoses: RecentDose[], actionHours: number, now: Date): number {
  let iob = 0;
  for (const dose of recentDoses) {
    const elapsedHours = (now.getTime() - dose.givenAt.getTime()) / (1000 * 60 * 60);
    if (elapsedHours < 0 || elapsedHours >= actionHours) continue;
    const remainingFraction = 1 - elapsedHours / actionHours;
    iob += dose.units * remainingFraction;
  }
  return iob;
}

export function calculateInsulinDose(input: InsulinCalcInput): InsulinCalcResult {
  const { profile, timeSegment } = input;
  const now = input.now ?? new Date();
  const warnings: string[] = [];

  const unitsPerXe = pickUnitsPerXe(profile, timeSegment);
  const correctionFactor = pickCorrectionFactor(profile, timeSegment);

  const carbsGrams = input.carbsGrams ?? 0;
  const xe = carbsGrams / profile.xeGramsPerUnit;
  const mealDoseUnits = xe * unitsPerXe;

  const iobUnits = calculateIob(input.recentDoses ?? [], profile.insulinActionHours, now);

  let correctionDoseUnits = 0;
  if (input.currentGlucose !== undefined) {
    const g = input.currentGlucose;
    if (g < profile.targetGlucoseMin) {
      warnings.push(
        "Уровень глюкозы ниже целевого диапазона — риск гипогликемии. Корректирующая доза не рассчитывается; сначала купируйте гипогликемию быстрыми углеводами."
      );
    } else if (g > profile.targetGlucoseMax) {
      const target = (profile.targetGlucoseMin + profile.targetGlucoseMax) / 2;
      correctionDoseUnits = (g - target) / correctionFactor;
    }
  }

  const netCorrection = Math.max(0, correctionDoseUnits - iobUnits);
  if (iobUnits > 0.05 && correctionDoseUnits > 0 && netCorrection < correctionDoseUnits) {
    warnings.push(
      `Учтён «активный» инсулин (~${iobUnits.toFixed(1)} ед.) от предыдущих доз — корректирующая доза уменьшена, чтобы избежать наложения доз.`
    );
  }

  const rawTotal = mealDoseUnits + netCorrection;
  const totalUnits = roundToStep(rawTotal, profile.doseStepUnits);

  if (profile.weightKg && totalUnits > profile.weightKg * 0.5) {
    warnings.push(
      "Расчётная доза необычно велика относительно веса — перепроверьте данные и при сомнении проконсультируйтесь с врачом перед введением."
    );
  }

  return {
    xe: Math.round(xe * 100) / 100,
    unitsPerXe,
    correctionFactor,
    mealDoseUnits: Math.round(mealDoseUnits * 100) / 100,
    correctionDoseUnits: Math.round(netCorrection * 100) / 100,
    iobUnits: Math.round(iobUnits * 100) / 100,
    totalUnits,
    warnings,
  };
}
