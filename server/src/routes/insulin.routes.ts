import { Router } from "express";
import { z } from "zod";
import { InsulinType } from "@prisma/client";
import { prisma } from "../db";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { resolveProfile } from "../middleware/activeProfile";
import { HttpError } from "../middleware/errorHandler";
import { calculateInsulinDose } from "../services/insulinCalculator";
import { getTimeSegment } from "../utils/timeSegment";

const router = Router();
router.use(requireAuth);
router.use(resolveProfile);

const calcSchema = z.object({
  carbsGrams: z.number().min(0).max(2000).optional(),
  currentGlucose: z.number().min(0).max(40).optional(),
  at: z.string().datetime().optional(),
});

router.post(
  "/calculate",
  asyncHandler(async (req, res) => {
    const body = calcSchema.parse(req.body);
    const profile = await prisma.profile.findUnique({ where: { id: req.profileId! } });
    if (!profile) {
      throw new HttpError(404, "Сначала заполните профиль");
    }

    const at = body.at ? new Date(body.at) : new Date();
    const timeSegment = getTimeSegment(at);

    const actionWindowStart = new Date(at.getTime() - profile.insulinActionHours * 60 * 60 * 1000);
    const recentDoses = await prisma.insulinDose.findMany({
      where: {
        profileId: req.profileId!,
        givenAt: { gte: actionWindowStart, lte: at },
        type: { in: [InsulinType.BOLUS_MEAL, InsulinType.BOLUS_CORRECTION] },
      },
      select: { givenAt: true, units: true },
    });

    const result = calculateInsulinDose({
      profile,
      timeSegment,
      carbsGrams: body.carbsGrams,
      currentGlucose: body.currentGlucose,
      recentDoses,
      now: at,
    });

    res.json({ ...result, timeSegment });
  })
);

export default router;
