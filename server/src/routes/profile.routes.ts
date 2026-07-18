import { Router } from "express";
import { z } from "zod";
import { DiabetesType } from "@prisma/client";
import { prisma } from "../db";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { HttpError } from "../middleware/errorHandler";

const router = Router();
router.use(requireAuth);

const profileSchema = z.object({
  diabetesType: z.nativeEnum(DiabetesType).default(DiabetesType.TYPE_1),
  weightKg: z.number().positive().max(400).nullable().optional(),
  birthYear: z.number().int().min(1900).max(new Date().getFullYear()).nullable().optional(),
  targetGlucoseMin: z.number().positive().max(20).default(4.4),
  targetGlucoseMax: z.number().positive().max(20).default(7.8),
  xeGramsPerUnit: z.number().min(8).max(15).default(10),
  doseStepUnits: z.union([z.literal(0.5), z.literal(1)]).default(1),
  insulinActionHours: z.number().min(2).max(8).default(4),
  unitsPerXeMorning: z.number().positive().max(10).default(1.5),
  unitsPerXeDay: z.number().positive().max(10).default(1.2),
  unitsPerXeEvening: z.number().positive().max(10).default(1.5),
  unitsPerXeNight: z.number().positive().max(10).default(1.2),
  correctionFactorMorning: z.number().positive().max(20).default(2.5),
  correctionFactorDay: z.number().positive().max(20).default(2.5),
  correctionFactorEvening: z.number().positive().max(20).default(2.5),
  correctionFactorNight: z.number().positive().max(20).default(3.0),
  basalDoseUnits: z.number().nonnegative().max(200).nullable().optional(),
  autoApplyAdaptation: z.boolean().default(false),
});

const updateSchema = profileSchema.partial();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const profile = await prisma.profile.findUnique({ where: { userId: req.userId! } });
    if (!profile) {
      throw new HttpError(404, "Профиль ещё не создан");
    }
    res.json(profile);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const existing = await prisma.profile.findUnique({ where: { userId: req.userId! } });
    if (existing) {
      throw new HttpError(409, "Профиль уже существует");
    }
    const data = profileSchema.parse(req.body);
    if (data.targetGlucoseMin >= data.targetGlucoseMax) {
      throw new HttpError(400, "Нижняя граница целевого диапазона должна быть меньше верхней");
    }
    const profile = await prisma.profile.create({
      data: { ...data, userId: req.userId! },
    });
    res.status(201).json(profile);
  })
);

router.put(
  "/",
  asyncHandler(async (req, res) => {
    const data = updateSchema.parse(req.body);
    const existing = await prisma.profile.findUnique({ where: { userId: req.userId! } });
    if (!existing) {
      throw new HttpError(404, "Профиль ещё не создан");
    }
    const min = data.targetGlucoseMin ?? existing.targetGlucoseMin;
    const max = data.targetGlucoseMax ?? existing.targetGlucoseMax;
    if (min >= max) {
      throw new HttpError(400, "Нижняя граница целевого диапазона должна быть меньше верхней");
    }
    const profile = await prisma.profile.update({
      where: { userId: req.userId! },
      data,
    });
    res.json(profile);
  })
);

export default router;
