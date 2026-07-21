import { Router } from "express";
import { z } from "zod";
import { GlucoseContext, GlucoseTrend, InsulinType } from "@prisma/client";
import { prisma } from "../db";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { resolveProfile } from "../middleware/activeProfile";
import { HttpError } from "../middleware/errorHandler";
import { getTimeSegment } from "../utils/timeSegment";

const router = Router();
router.use(requireAuth);
router.use(resolveProfile);

function parseRange(req: import("express").Request) {
  const from = req.query.from ? new Date(req.query.from as string) : new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const to = req.query.to ? new Date(req.query.to as string) : new Date();
  return { from, to };
}

// ---------- Meals ----------

const mealItemSchema = z.union([
  z.object({ foodItemId: z.string().uuid(), grams: z.number().positive().max(5000) }),
  z.object({
    foodName: z.string().min(1).max(150),
    grams: z.number().positive().max(5000),
    kcal100: z.number().min(0).max(2000),
    protein100: z.number().min(0).max(100),
    fat100: z.number().min(0).max(100),
    carbs100: z.number().min(0).max(100),
  }),
]);

const mealSchema = z.object({
  eatenAt: z.string().datetime(),
  note: z.string().max(500).optional(),
  items: z.array(mealItemSchema).min(1),
});

type MealItemInput = z.infer<typeof mealSchema>["items"];

/**
 * Разворачивает состав приёма пищи в позиции с посчитанными БЖУ и калориями
 * и возвращает итоги. Используется и при создании, и при правке — чтобы
 * цифры считались одинаково.
 */
async function buildMealItems(items: MealItemInput) {
  const foodIds = items
    .filter((i): i is { foodItemId: string; grams: number } => "foodItemId" in i)
    .map((i) => i.foodItemId);
  const foods = foodIds.length
    ? await prisma.foodItem.findMany({ where: { id: { in: foodIds } } })
    : [];
  const foodsById = new Map(foods.map((f) => [f.id, f]));

  const totals = { carbs: 0, kcal: 0, protein: 0, fat: 0 };

  const itemsToCreate = items.map((item) => {
    let base: { name: string; kcal100: number; protein100: number; fat100: number; carbs100: number; foodItemId: string | null };
    if ("foodItemId" in item) {
      const food = foodsById.get(item.foodItemId);
      if (!food) throw new HttpError(400, "Один из продуктов не найден");
      base = {
        name: food.name,
        kcal100: food.kcal100,
        protein100: food.protein100,
        fat100: food.fat100,
        carbs100: food.carbs100,
        foodItemId: food.id,
      };
    } else {
      base = {
        name: item.foodName,
        kcal100: item.kcal100,
        protein100: item.protein100,
        fat100: item.fat100,
        carbs100: item.carbs100,
        foodItemId: null,
      };
    }
    const factor = item.grams / 100;
    const carbs = base.carbs100 * factor;
    const protein = base.protein100 * factor;
    const fat = base.fat100 * factor;
    const kcal = base.kcal100 * factor;
    totals.carbs += carbs;
    totals.protein += protein;
    totals.fat += fat;
    totals.kcal += kcal;
    return {
      foodItemId: base.foodItemId,
      foodName: base.name,
      grams: item.grams,
      carbs,
      protein,
      fat,
      kcal,
    };
  });

  return { itemsToCreate, totals };
}

router.post(
  "/meals",
  asyncHandler(async (req, res) => {
    const data = mealSchema.parse(req.body);
    const eatenAt = new Date(data.eatenAt);
    const { itemsToCreate, totals } = await buildMealItems(data.items);

    const profile = await prisma.profile.findUnique({ where: { id: req.profileId! } });
    const xeGramsPerUnit = profile?.xeGramsPerUnit ?? 10;

    const meal = await prisma.mealEntry.create({
      data: {
        profileId: req.profileId!,
        eatenAt,
        timeSegment: getTimeSegment(eatenAt),
        note: data.note,
        totalCarbs: totals.carbs,
        totalXe: totals.carbs / xeGramsPerUnit,
        totalKcal: totals.kcal,
        totalProtein: totals.protein,
        totalFat: totals.fat,
        items: { create: itemsToCreate },
      },
      include: { items: true },
    });

    res.status(201).json(meal);
  })
);

router.get(
  "/meals",
  asyncHandler(async (req, res) => {
    const { from, to } = parseRange(req);
    const meals = await prisma.mealEntry.findMany({
      where: { profileId: req.profileId!, eatenAt: { gte: from, lte: to } },
      include: { items: true },
      orderBy: { eatenAt: "desc" },
    });
    res.json(meals);
  })
);

/** Правка приёма пищи: состав пересчитывается заново (ХЕ, БЖУ, калории). */
router.put(
  "/meals/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.mealEntry.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.profileId !== req.profileId) {
      throw new HttpError(404, "Приём пищи не найден");
    }

    const data = mealSchema.parse(req.body);
    const eatenAt = new Date(data.eatenAt);
    const { itemsToCreate, totals } = await buildMealItems(data.items);

    const profile = await prisma.profile.findUnique({ where: { id: req.profileId! } });
    const xeGramsPerUnit = profile?.xeGramsPerUnit ?? 10;

    const meal = await prisma.$transaction(async (tx) => {
      await tx.mealItem.deleteMany({ where: { mealEntryId: existing.id } });
      return tx.mealEntry.update({
        where: { id: existing.id },
        data: {
          eatenAt,
          timeSegment: getTimeSegment(eatenAt),
          note: data.note ?? null,
          totalCarbs: totals.carbs,
          totalXe: totals.carbs / xeGramsPerUnit,
          totalKcal: totals.kcal,
          totalProtein: totals.protein,
          totalFat: totals.fat,
          items: { create: itemsToCreate },
        },
        include: { items: true },
      });
    });

    res.json(meal);
  })
);

router.delete(
  "/meals/:id",
  asyncHandler(async (req, res) => {
    const meal = await prisma.mealEntry.findUnique({ where: { id: req.params.id } });
    if (!meal || meal.profileId !== req.profileId) {
      throw new HttpError(404, "Приём пищи не найден");
    }
    await prisma.mealEntry.delete({ where: { id: meal.id } });
    res.status(204).send();
  })
);

// ---------- Glucose readings ----------

const glucoseSchema = z.object({
  measuredAt: z.string().datetime(),
  value: z.number().min(0).max(40),
  context: z.nativeEnum(GlucoseContext).default(GlucoseContext.RANDOM),
  trend: z.nativeEnum(GlucoseTrend).nullable().optional(),
  treatment: z.string().max(200).optional(),
  mealEntryId: z.string().uuid().optional(),
});

router.post(
  "/glucose",
  asyncHandler(async (req, res) => {
    const data = glucoseSchema.parse(req.body);
    const reading = await prisma.glucoseReading.create({
      data: {
        profileId: req.profileId!,
        measuredAt: new Date(data.measuredAt),
        value: data.value,
        context: data.context,
        trend: data.trend ?? null,
        treatment: data.treatment,
        mealEntryId: data.mealEntryId,
      },
    });
    res.status(201).json(reading);
  })
);

router.get(
  "/glucose",
  asyncHandler(async (req, res) => {
    const { from, to } = parseRange(req);
    const readings = await prisma.glucoseReading.findMany({
      where: { profileId: req.profileId!, measuredAt: { gte: from, lte: to } },
      orderBy: { measuredAt: "desc" },
    });
    res.json(readings);
  })
);

router.put(
  "/glucose/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.glucoseReading.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.profileId !== req.profileId) {
      throw new HttpError(404, "Запись не найдена");
    }
    const data = glucoseSchema.parse(req.body);
    const reading = await prisma.glucoseReading.update({
      where: { id: existing.id },
      data: {
        measuredAt: new Date(data.measuredAt),
        value: data.value,
        context: data.context,
        trend: data.trend ?? null,
        treatment: data.treatment ?? null,
      },
    });
    res.json(reading);
  })
);

router.delete(
  "/glucose/:id",
  asyncHandler(async (req, res) => {
    const reading = await prisma.glucoseReading.findUnique({ where: { id: req.params.id } });
    if (!reading || reading.profileId !== req.profileId) {
      throw new HttpError(404, "Запись не найдена");
    }
    await prisma.glucoseReading.delete({ where: { id: reading.id } });
    res.status(204).send();
  })
);

// ---------- Insulin doses ----------

const insulinSchema = z.object({
  givenAt: z.string().datetime(),
  type: z.nativeEnum(InsulinType),
  units: z.number().min(0).max(200),
  calculatedUnits: z.number().min(0).max(200).optional(),
  overrideReason: z.string().max(300).optional(),
  mealEntryId: z.string().uuid().optional(),
});

router.post(
  "/insulin",
  asyncHandler(async (req, res) => {
    const data = insulinSchema.parse(req.body);
    const dose = await prisma.insulinDose.create({
      data: {
        profileId: req.profileId!,
        givenAt: new Date(data.givenAt),
        type: data.type,
        units: data.units,
        calculatedUnits: data.calculatedUnits,
        overrideReason: data.overrideReason,
        mealEntryId: data.mealEntryId,
      },
    });
    res.status(201).json(dose);
  })
);

router.get(
  "/insulin",
  asyncHandler(async (req, res) => {
    const { from, to } = parseRange(req);
    const doses = await prisma.insulinDose.findMany({
      where: { profileId: req.profileId!, givenAt: { gte: from, lte: to } },
      orderBy: { givenAt: "desc" },
    });
    res.json(doses);
  })
);

router.put(
  "/insulin/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.insulinDose.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.profileId !== req.profileId) {
      throw new HttpError(404, "Запись не найдена");
    }
    const data = insulinSchema.parse(req.body);
    const dose = await prisma.insulinDose.update({
      where: { id: existing.id },
      data: {
        givenAt: new Date(data.givenAt),
        type: data.type,
        units: data.units,
        calculatedUnits: data.calculatedUnits ?? null,
        overrideReason: data.overrideReason ?? null,
      },
    });
    res.json(dose);
  })
);

router.delete(
  "/insulin/:id",
  asyncHandler(async (req, res) => {
    const dose = await prisma.insulinDose.findUnique({ where: { id: req.params.id } });
    if (!dose || dose.profileId !== req.profileId) {
      throw new HttpError(404, "Запись не найдена");
    }
    await prisma.insulinDose.delete({ where: { id: dose.id } });
    res.status(204).send();
  })
);

// ---------- Bounds (for pagination) ----------

router.get(
  "/bounds",
  asyncHandler(async (req, res) => {
    const [firstMeal, firstGlucose, firstInsulin] = await Promise.all([
      prisma.mealEntry.findFirst({
        where: { profileId: req.profileId! },
        orderBy: { eatenAt: "asc" },
        select: { eatenAt: true },
      }),
      prisma.glucoseReading.findFirst({
        where: { profileId: req.profileId! },
        orderBy: { measuredAt: "asc" },
        select: { measuredAt: true },
      }),
      prisma.insulinDose.findFirst({
        where: { profileId: req.profileId! },
        orderBy: { givenAt: "asc" },
        select: { givenAt: true },
      }),
    ]);
    const dates = [firstMeal?.eatenAt, firstGlucose?.measuredAt, firstInsulin?.givenAt].filter(
      (d): d is Date => !!d
    );
    const earliest = dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null;
    res.json({ earliest });
  })
);

// ---------- Day summary ----------

router.get(
  "/day",
  asyncHandler(async (req, res) => {
    // Границы суток считает клиент в своём часовом поясе и присылает явно:
    // сервер работает по UTC, и «сегодня» у него не совпадает с «сегодня»
    // пользователя (например, в Москве расхождение 3 часа).
    const fromParam = req.query.from as string | undefined;
    const toParam = req.query.to as string | undefined;

    let dayStart: Date;
    let dayEnd: Date;
    let dateParam: string;

    if (fromParam && toParam) {
      dayStart = new Date(fromParam);
      dayEnd = new Date(toParam);
      if (Number.isNaN(dayStart.getTime()) || Number.isNaN(dayEnd.getTime())) {
        throw new HttpError(400, "Некорректный диапазон дат");
      }
      dateParam = fromParam.slice(0, 10);
    } else {
      // Запасной вариант для старых версий приложения.
      dateParam = (req.query.date as string) ?? new Date().toISOString().slice(0, 10);
      dayStart = new Date(`${dateParam}T00:00:00.000Z`);
      dayEnd = new Date(`${dateParam}T23:59:59.999Z`);
    }

    const [meals, glucose, insulin] = await Promise.all([
      prisma.mealEntry.findMany({
        where: { profileId: req.profileId!, eatenAt: { gte: dayStart, lte: dayEnd } },
        include: { items: true },
        orderBy: { eatenAt: "asc" },
      }),
      prisma.glucoseReading.findMany({
        where: { profileId: req.profileId!, measuredAt: { gte: dayStart, lte: dayEnd } },
        orderBy: { measuredAt: "asc" },
      }),
      prisma.insulinDose.findMany({
        where: { profileId: req.profileId!, givenAt: { gte: dayStart, lte: dayEnd } },
        orderBy: { givenAt: "asc" },
      }),
    ]);

    const totals = meals.reduce(
      (acc, m) => {
        acc.carbs += m.totalCarbs;
        acc.xe += m.totalXe;
        acc.kcal += m.totalKcal;
        acc.protein += m.totalProtein;
        acc.fat += m.totalFat;
        return acc;
      },
      { carbs: 0, xe: 0, kcal: 0, protein: 0, fat: 0 }
    );

    res.json({ date: dateParam, meals, glucose, insulin, totals });
  })
);

export default router;
