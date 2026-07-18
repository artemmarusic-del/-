import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { getGlucoseSeries, getSummary, getXeSeries } from "../services/statsService";

const router = Router();
router.use(requireAuth);

function parseDays(req: import("express").Request): number {
  const raw = Number(req.query.days ?? 14);
  if (!Number.isFinite(raw) || raw <= 0) return 14;
  return Math.min(90, Math.round(raw));
}

router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    res.json(await getSummary(req.userId!, parseDays(req)));
  })
);

router.get(
  "/glucose",
  asyncHandler(async (req, res) => {
    res.json(await getGlucoseSeries(req.userId!, parseDays(req)));
  })
);

router.get(
  "/xe",
  asyncHandler(async (req, res) => {
    res.json(await getXeSeries(req.userId!, parseDays(req)));
  })
);

export default router;
