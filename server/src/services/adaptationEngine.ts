import {
  AdjustmentField,
  GlucoseReading,
  InsulinDose,
  InsulinType,
  MealEntry,
  Profile,
  SuggestionStatus,
  TimeSegment,
} from "@prisma/client";
import { prisma } from "../db";

// --- Tunable safety constants -------------------------------------------------
const LOOKBACK_DAYS = 14;
const MIN_SAMPLES = 5;
const MAX_STEP_FRACTION = 0.15; // never move a coefficient more than 15% in one go
const MIN_DAYS_BETWEEN_ADJUSTMENTS = 5; // per (segment, field), avoid oscillation
const POST_MEAL_MIN_HOURS = 1.5;
const POST_MEAL_MAX_HOURS = 3;
const HIGH_DEVIATION_THRESHOLD = 1.5; // mmol/L above target ceiling -> need more insulin/XE
const LOW_DEVIATION_THRESHOLD = 1.0; // mmol/L below target floor -> reduce insulin/XE (hypo risk first)
const CORRECTION_AFTER_WINDOW_HOURS = 1; // tolerance around insulinActionHours when pairing readings

const SEGMENTS = [TimeSegment.MORNING, TimeSegment.DAY, TimeSegment.EVENING, TimeSegment.NIGHT] as const;

function unitsPerXeField(segment: TimeSegment): keyof Profile {
  switch (segment) {
    case TimeSegment.MORNING:
      return "unitsPerXeMorning";
    case TimeSegment.DAY:
      return "unitsPerXeDay";
    case TimeSegment.EVENING:
      return "unitsPerXeEvening";
    case TimeSegment.NIGHT:
      return "unitsPerXeNight";
  }
}

function correctionFactorField(segment: TimeSegment): keyof Profile {
  switch (segment) {
    case TimeSegment.MORNING:
      return "correctionFactorMorning";
    case TimeSegment.DAY:
      return "correctionFactorDay";
    case TimeSegment.EVENING:
      return "correctionFactorEvening";
    case TimeSegment.NIGHT:
      return "correctionFactorNight";
  }
}

function closestReading(
  readings: GlucoseReading[],
  targetTime: number,
  windowStartMs: number,
  windowEndMs: number
): GlucoseReading | undefined {
  let best: GlucoseReading | undefined;
  let bestDist = Infinity;
  for (const r of readings) {
    const t = r.measuredAt.getTime();
    if (t < windowStartMs || t > windowEndMs) continue;
    const dist = Math.abs(t - targetTime);
    if (dist < bestDist) {
      bestDist = dist;
      best = r;
    }
  }
  return best;
}

interface ProposedChange {
  segment: TimeSegment;
  field: AdjustmentField;
  oldValue: number;
  newValue: number;
  reason: string;
  sampleSize: number;
}

function average(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

async function canAdjust(userId: string, segment: TimeSegment, field: AdjustmentField): Promise<boolean> {
  const last = await prisma.coefficientAdjustment.findFirst({
    where: {
      userId,
      timeSegment: segment,
      field,
      status: { in: [SuggestionStatus.ACCEPTED, SuggestionStatus.AUTO_APPLIED] },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!last) return true;
  const daysSince = (Date.now() - last.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince >= MIN_DAYS_BETWEEN_ADJUSTMENTS;
}

/**
 * Analyzes a user's recent diary (meals + glucose + corrections) per time-of-day
 * segment and proposes small, capped adjustments to their carb ratio and
 * correction factor when there is a consistent, repeated pattern of highs or
 * lows — this is what lets the app "self-tune" to each person's own insulin
 * sensitivity instead of using one fixed formula for everyone.
 */
export async function analyzeAndProposeAdjustments(userId: string): Promise<ProposedChange[]> {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) return [];

  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const [meals, glucoseReadings, corrections] = await Promise.all([
    prisma.mealEntry.findMany({ where: { userId, eatenAt: { gte: since } } }),
    prisma.glucoseReading.findMany({ where: { userId, measuredAt: { gte: since } } }),
    prisma.insulinDose.findMany({
      where: { userId, givenAt: { gte: since }, type: InsulinType.BOLUS_CORRECTION },
    }),
  ]);

  const proposals: ProposedChange[] = [];

  for (const segment of SEGMENTS) {
    // ---- 1. Carb ratio (units per XE) from post-meal glucose control ----
    const segmentMeals = meals.filter((m: MealEntry) => m.timeSegment === segment);
    const deviations: number[] = [];
    for (const meal of segmentMeals) {
      const eatenMs = meal.eatenAt.getTime();
      const reading = closestReading(
        glucoseReadings,
        eatenMs + (POST_MEAL_MIN_HOURS + POST_MEAL_MAX_HOURS) * 30 * 60 * 1000,
        eatenMs + POST_MEAL_MIN_HOURS * 60 * 60 * 1000,
        eatenMs + POST_MEAL_MAX_HOURS * 60 * 60 * 1000
      );
      if (!reading) continue;
      if (reading.value > profile.targetGlucoseMax) {
        deviations.push(reading.value - profile.targetGlucoseMax);
      } else if (reading.value < profile.targetGlucoseMin) {
        deviations.push(reading.value - profile.targetGlucoseMin);
      } else {
        deviations.push(0);
      }
    }

    if (deviations.length >= MIN_SAMPLES && (await canAdjust(userId, segment, AdjustmentField.UNITS_PER_XE))) {
      const avgDeviation = average(deviations);
      const field = unitsPerXeField(segment);
      const oldValue = profile[field] as number;
      let newValue: number | null = null;
      let reason = "";

      if (avgDeviation >= HIGH_DEVIATION_THRESHOLD) {
        newValue = oldValue * (1 + MAX_STEP_FRACTION);
        reason = `За последние ${LOOKBACK_DAYS} дн. в сегменте «${segmentLabel(segment)}» глюкоза после еды в среднем на ${avgDeviation.toFixed(
          1
        )} ммоль/л выше целевого диапазона (${deviations.length} наблюдений). Предложено увеличить дозу на 1 ХЕ.`;
      } else if (avgDeviation <= -LOW_DEVIATION_THRESHOLD) {
        newValue = oldValue * (1 - MAX_STEP_FRACTION);
        reason = `За последние ${LOOKBACK_DAYS} дн. в сегменте «${segmentLabel(segment)}» глюкоза после еды в среднем на ${Math.abs(
          avgDeviation
        ).toFixed(1)} ммоль/л ниже целевого диапазона (${deviations.length} наблюдений) — риск гипогликемии. Предложено уменьшить дозу на 1 ХЕ.`;
      }

      if (newValue !== null) {
        proposals.push({
          segment,
          field: AdjustmentField.UNITS_PER_XE,
          oldValue,
          newValue: Math.round(newValue * 100) / 100,
          reason,
          sampleSize: deviations.length,
        });
      }
    }

    // ---- 2. Correction factor (ISF) from actual drop achieved by corrections ----
    const segmentCorrections = corrections.filter((c: InsulinDose) => {
      const hour = c.givenAt.getHours();
      return getSegmentForHour(hour) === segment;
    });

    const actualFactors: number[] = [];
    for (const dose of segmentCorrections) {
      if (dose.units <= 0) continue;
      const doseMs = dose.givenAt.getTime();
      const before = closestReading(glucoseReadings, doseMs, doseMs - 45 * 60 * 1000, doseMs + 5 * 60 * 1000);
      const afterTarget = doseMs + profile.insulinActionHours * 60 * 60 * 1000;
      const after = closestReading(
        glucoseReadings,
        afterTarget,
        afterTarget - CORRECTION_AFTER_WINDOW_HOURS * 60 * 60 * 1000,
        afterTarget + CORRECTION_AFTER_WINDOW_HOURS * 60 * 60 * 1000
      );
      if (!before || !after) continue;
      // Skip if a meal happened in between - carbs would confound the measured drop.
      const mealBetween = meals.some(
        (m: MealEntry) => m.eatenAt.getTime() > doseMs && m.eatenAt.getTime() < after.measuredAt.getTime()
      );
      if (mealBetween) continue;

      const actualDrop = before.value - after.value;
      actualFactors.push(actualDrop / dose.units);
    }

    if (actualFactors.length >= MIN_SAMPLES && (await canAdjust(userId, segment, AdjustmentField.CORRECTION_FACTOR))) {
      const avgActualFactor = average(actualFactors);
      const field = correctionFactorField(segment);
      const oldValue = profile[field] as number;
      const relativeDiff = (avgActualFactor - oldValue) / oldValue;
      let newValue: number | null = null;
      let reason = "";

      if (relativeDiff <= -0.2) {
        // Real drop is notably smaller than assumed -> user needs a stronger (smaller) factor.
        newValue = oldValue * (1 - MAX_STEP_FRACTION);
        reason = `Корректирующие дозы в сегменте «${segmentLabel(
          segment
        )}» снижали глюкозу в среднем на ${avgActualFactor.toFixed(
          1
        )} ммоль/л на ед. вместо ожидаемых ${oldValue.toFixed(1)} (${actualFactors.length} наблюдений) — предложено усилить коэффициент чувствительности.`;
      } else if (relativeDiff >= 0.2) {
        newValue = oldValue * (1 + MAX_STEP_FRACTION);
        reason = `Корректирующие дозы в сегменте «${segmentLabel(
          segment
        )}» снижали глюкозу сильнее ожидаемого (в среднем ${avgActualFactor.toFixed(
          1
        )} ммоль/л на ед. вместо ${oldValue.toFixed(1)}, ${actualFactors.length} наблюдений) — риск гипогликемии, предложено ослабить коэффициент.`;
      }

      if (newValue !== null) {
        proposals.push({
          segment,
          field: AdjustmentField.CORRECTION_FACTOR,
          oldValue,
          newValue: Math.round(newValue * 100) / 100,
          reason,
          sampleSize: actualFactors.length,
        });
      }
    }
  }

  if (proposals.length === 0) return [];

  const created = await prisma.$transaction(
    proposals.map((p) =>
      prisma.coefficientAdjustment.create({
        data: {
          userId,
          timeSegment: p.segment,
          field: p.field,
          oldValue: p.oldValue,
          newValue: p.newValue,
          reason: p.reason,
          sampleSize: p.sampleSize,
          status: profile.autoApplyAdaptation ? SuggestionStatus.AUTO_APPLIED : SuggestionStatus.PENDING,
          resolvedAt: profile.autoApplyAdaptation ? new Date() : null,
        },
      })
    )
  );

  if (profile.autoApplyAdaptation) {
    await applyAdjustments(userId, created);
  }

  return proposals;
}

async function applyAdjustments(userId: string, adjustments: { field: AdjustmentField; timeSegment: TimeSegment; newValue: number }[]) {
  const data: Record<string, number> = {};
  for (const adj of adjustments) {
    const fieldName =
      adj.field === AdjustmentField.UNITS_PER_XE
        ? unitsPerXeField(adj.timeSegment)
        : correctionFactorField(adj.timeSegment);
    data[fieldName as string] = adj.newValue;
  }
  await prisma.profile.update({ where: { userId }, data });
}

export async function acceptAdjustment(userId: string, adjustmentId: string) {
  const adjustment = await prisma.coefficientAdjustment.findUnique({ where: { id: adjustmentId } });
  if (!adjustment || adjustment.userId !== userId || adjustment.status !== SuggestionStatus.PENDING) {
    return null;
  }
  await applyAdjustments(userId, [adjustment]);
  return prisma.coefficientAdjustment.update({
    where: { id: adjustmentId },
    data: { status: SuggestionStatus.ACCEPTED, resolvedAt: new Date() },
  });
}

export async function rejectAdjustment(userId: string, adjustmentId: string) {
  const adjustment = await prisma.coefficientAdjustment.findUnique({ where: { id: adjustmentId } });
  if (!adjustment || adjustment.userId !== userId || adjustment.status !== SuggestionStatus.PENDING) {
    return null;
  }
  return prisma.coefficientAdjustment.update({
    where: { id: adjustmentId },
    data: { status: SuggestionStatus.REJECTED, resolvedAt: new Date() },
  });
}

function getSegmentForHour(hour: number): TimeSegment {
  if (hour >= 6 && hour < 11) return TimeSegment.MORNING;
  if (hour >= 11 && hour < 17) return TimeSegment.DAY;
  if (hour >= 17 && hour < 23) return TimeSegment.EVENING;
  return TimeSegment.NIGHT;
}

function segmentLabel(segment: TimeSegment): string {
  switch (segment) {
    case TimeSegment.MORNING:
      return "утро";
    case TimeSegment.DAY:
      return "день";
    case TimeSegment.EVENING:
      return "вечер";
    case TimeSegment.NIGHT:
      return "ночь";
  }
}
