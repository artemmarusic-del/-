import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { resolveProfile } from "../middleware/activeProfile";
import { getGlucoseSeries, getSummary, getXeSeries } from "../services/statsService";

const router = Router();
router.use(requireAuth);
router.use(resolveProfile);

function parseDays(req: import("express").Request): number {
  const raw = Number(req.query.days ?? 14);
  if (!Number.isFinite(raw) || raw <= 0) return 14;
  return Math.min(90, Math.round(raw));
}

router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    res.json(await getSummary(req.profileId!, parseDays(req)));
  })
);

router.get(
  "/glucose",
  asyncHandler(async (req, res) => {
    res.json(await getGlucoseSeries(req.profileId!, parseDays(req)));
  })
);

router.get(
  "/xe",
  asyncHandler(async (req, res) => {
    res.json(await getXeSeries(req.profileId!, parseDays(req)));
  })
);

export default router;
