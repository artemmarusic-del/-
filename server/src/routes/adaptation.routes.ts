import { Router } from "express";
import { SuggestionStatus } from "@prisma/client";
import { prisma } from "../db";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { HttpError } from "../middleware/errorHandler";
import { acceptAdjustment, analyzeAndProposeAdjustments, rejectAdjustment } from "../services/adaptationEngine";

const router = Router();
router.use(requireAuth);

router.post(
  "/run",
  asyncHandler(async (req, res) => {
    const proposals = await analyzeAndProposeAdjustments(req.userId!);
    res.json({ created: proposals.length });
  })
);

router.get(
  "/suggestions",
  asyncHandler(async (req, res) => {
    const status = (req.query.status as SuggestionStatus | undefined) ?? SuggestionStatus.PENDING;
    const suggestions = await prisma.coefficientAdjustment.findMany({
      where: { userId: req.userId!, status },
      orderBy: { createdAt: "desc" },
    });
    res.json(suggestions);
  })
);

router.get(
  "/history",
  asyncHandler(async (req, res) => {
    const history = await prisma.coefficientAdjustment.findMany({
      where: { userId: req.userId!, status: { not: SuggestionStatus.PENDING } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json(history);
  })
);

router.post(
  "/suggestions/:id/accept",
  asyncHandler(async (req, res) => {
    const result = await acceptAdjustment(req.userId!, req.params.id);
    if (!result) throw new HttpError(404, "Предложение не найдено или уже обработано");
    res.json(result);
  })
);

router.post(
  "/suggestions/:id/reject",
  asyncHandler(async (req, res) => {
    const result = await rejectAdjustment(req.userId!, req.params.id);
    if (!result) throw new HttpError(404, "Предложение не найдено или уже обработано");
    res.json(result);
  })
);

export default router;
