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

/**
 * Поиск продукта по штрихкоду с упаковки в открытой базе Open Food Facts.
 * Ничего не сохраняет — возвращает данные, чтобы пользователь их проверил
 * и при желании добавил в свою библиотеку.
 */
router.get(
  "/barcode/:code",
  asyncHandler(async (req, res) => {
    const code = req.params.code.replace(/\D/g, "");
    if (code.length < 8 || code.length > 14) {
      throw new HttpError(400, "Штрихкод должен содержать от 8 до 14 цифр");
    }

    const url =
      `https://world.openfoodfacts.org/api/v2/product/${code}.json` +
      `?fields=product_name,product_name_ru,brands,quantity,nutriments`;

    // Open Food Facts отвечает небыстро, а бесплатный сервер медленный —
    // даём запас по времени и одну повторную попытку.
    async function lookup(attempt: number): Promise<any> {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            // Open Food Facts просит представляться и оставлять контакт.
            "User-Agent": "XE-Dnevnik/1.0 (https://xe-dnevnik.onrender.com)",
            Accept: "application/json",
          },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        console.error(`[barcode] попытка ${attempt} для ${code} не удалась: ${reason}`);
        if (attempt < 2) return lookup(attempt + 1);
        throw new HttpError(
          503,
          "База продуктов сейчас недоступна. Попробуйте ещё раз или введите данные вручную."
        );
      } finally {
        clearTimeout(timeout);
      }
    }

    const payload = await lookup(1);

    if (payload?.status !== 1 || !payload.product) {
      throw new HttpError(404, "Продукт с таким штрихкодом не найден. Введите данные вручную.");
    }

    const p = payload.product;
    const n = p.nutriments ?? {};
    const num = (v: unknown) => {
      const parsed = typeof v === "number" ? v : Number(v);
      return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 10) / 10 : 0;
    };

    const name = [p.product_name_ru || p.product_name, p.brands?.split(",")[0]?.trim()]
      .filter(Boolean)
      .join(", ")
      .slice(0, 150);

    res.json({
      barcode: code,
      name: name || `Продукт ${code}`,
      quantity: p.quantity ?? null,
      kcal100: num(n["energy-kcal_100g"]),
      protein100: num(n["proteins_100g"]),
      fat100: num(n["fat_100g"]),
      carbs100: num(n["carbohydrates_100g"]),
      // Данные вносят сами пользователи Open Food Facts — их стоит перепроверить.
      source: "Open Food Facts",
    });
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
