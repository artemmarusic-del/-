import { api } from "./client";
import { BarcodeLookup } from "../types";

/**
 * Поиск продукта по штрихкоду.
 *
 * Сначала спрашиваем Open Food Facts напрямую с устройства пользователя —
 * это быстрее и не зависит от нашего сервера (на бесплатном тарифе он
 * медленный и запрос к внешней базе успевал отваливаться по таймауту).
 * Если прямой путь не сработал (нет сети до базы, блокировка) — пробуем
 * через наш сервер.
 */
const OFF_URL = (code: string) =>
  `https://world.openfoodfacts.org/api/v2/product/${code}.json` +
  `?fields=product_name,product_name_ru,brands,quantity,nutriments`;

function num(v: unknown): number {
  const parsed = typeof v === "number" ? v : Number(v);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 10) / 10 : 0;
}

/** Ошибка «продукт не найден» — её не нужно повторять через сервер. */
export class BarcodeNotFoundError extends Error {}

async function lookupDirect(code: string): Promise<BarcodeLookup> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(OFF_URL(code), {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = await res.json();
    if (payload?.status !== 1 || !payload.product) {
      throw new BarcodeNotFoundError("not found");
    }

    const p = payload.product;
    const n = p.nutriments ?? {};
    const name = [p.product_name_ru || p.product_name, p.brands?.split(",")[0]?.trim()]
      .filter(Boolean)
      .join(", ")
      .slice(0, 150);

    return {
      barcode: code,
      name: name || `Продукт ${code}`,
      quantity: p.quantity ?? null,
      kcal100: num(n["energy-kcal_100g"]),
      protein100: num(n["proteins_100g"]),
      fat100: num(n["fat_100g"]),
      carbs100: num(n["carbohydrates_100g"]),
      source: "Open Food Facts",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function lookupBarcode(code: string): Promise<BarcodeLookup> {
  const digits = code.replace(/\D/g, "");
  try {
    return await lookupDirect(digits);
  } catch (err) {
    if (err instanceof BarcodeNotFoundError) {
      throw new Error("Продукт с таким штрихкодом не найден. Введите данные вручную.");
    }
    // Прямой путь не удался — пробуем через наш сервер.
    return api.get<BarcodeLookup>(`/foods/barcode/${digits}`);
  }
}
