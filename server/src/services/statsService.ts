import { prisma } from "../db";

export async function getSummary(userId: string, days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const profile = await prisma.profile.findUnique({ where: { userId } });
  const readings = await prisma.glucoseReading.findMany({
    where: { userId, measuredAt: { gte: since } },
    orderBy: { measuredAt: "asc" },
  });
  const meals = await prisma.mealEntry.findMany({
    where: { userId, eatenAt: { gte: since } },
  });

  const targetMin = profile?.targetGlucoseMin ?? 4.4;
  const targetMax = profile?.targetGlucoseMax ?? 7.8;

  const total = readings.length;
  let inRange = 0;
  let below = 0;
  let above = 0;
  let sum = 0;
  for (const r of readings) {
    sum += r.value;
    if (r.value < targetMin) below++;
    else if (r.value > targetMax) above++;
    else inRange++;
  }

  const dayCount = Math.max(1, days);
  const totalXe = meals.reduce((acc, m) => acc + m.totalXe, 0);

  return {
    days,
    totalReadings: total,
    averageGlucose: total ? Math.round((sum / total) * 10) / 10 : null,
    timeInRangePercent: total ? Math.round((inRange / total) * 1000) / 10 : null,
    belowRangePercent: total ? Math.round((below / total) * 1000) / 10 : null,
    aboveRangePercent: total ? Math.round((above / total) * 1000) / 10 : null,
    averageXePerDay: Math.round((totalXe / dayCount) * 10) / 10,
    targetGlucoseMin: targetMin,
    targetGlucoseMax: targetMax,
  };
}

export async function getGlucoseSeries(userId: string, days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return prisma.glucoseReading.findMany({
    where: { userId, measuredAt: { gte: since } },
    orderBy: { measuredAt: "asc" },
    select: { id: true, measuredAt: true, value: true, context: true },
  });
}

export async function getXeSeries(userId: string, days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const meals = await prisma.mealEntry.findMany({
    where: { userId, eatenAt: { gte: since } },
    select: { eatenAt: true, totalXe: true, totalCarbs: true },
    orderBy: { eatenAt: "asc" },
  });

  const byDay = new Map<string, { xe: number; carbs: number }>();
  for (const meal of meals) {
    const key = meal.eatenAt.toISOString().slice(0, 10);
    const entry = byDay.get(key) ?? { xe: 0, carbs: 0 };
    entry.xe += meal.totalXe;
    entry.carbs += meal.totalCarbs;
    byDay.set(key, entry);
  }

  return Array.from(byDay.entries())
    .map(([date, v]) => ({ date, xe: Math.round(v.xe * 10) / 10, carbs: Math.round(v.carbs) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
