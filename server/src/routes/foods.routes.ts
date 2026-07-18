import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { HttpError } from "../middleware/errorHandler";

const router = Router();
router.use(requireAuth);

const foodSchema = z.object({
  name: z.string().min(1).max(150),
  category: z.string().min(1).max(50).default("Другое"),
  kcal100: z.number().min(0).max(2000),
  protein100: z.number().min(0).max(100),
  fat100: z.number().min(0).max(100),
  carbs100: z.number().min(0).max(100),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = (req.query.query as string | undefined)?.trim();
    const foods = await prisma.foodItem.findMany({
      where: {
        AND: [
          query ? { name: { contains: query, mode: "insensitive" } } : {},
          { OR: [{ isCustom: false }, { createdByUserId: req.userId }] },
        ],
      },
      orderBy: { name: "asc" },
      take: 200,
    });
    res.json(foods);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = foodSchema.parse(req.body);
    const food = await prisma.foodItem.create({
      data: { ...data, isCustom: true, createdByUserId: req.userId },
    });
    res.status(201).json(food);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.foodItem.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.createdByUserId !== req.userId) {
      throw new HttpError(404, "Продукт не найден");
    }
    const data = foodSchema.partial().parse(req.body);
    const food = await prisma.foodItem.update({ where: { id: existing.id }, data });
    res.json(food);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.foodItem.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.createdByUserId !== req.userId) {
      throw new HttpError(404, "Продукт не найден");
    }
    await prisma.foodItem.delete({ where: { id: existing.id } });
    res.status(204).send();
  })
);

export default router;
