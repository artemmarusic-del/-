import { api } from "./client";
import { BarcodeLookup } from "../types";

/**
 * Поиск продукта по штрихкоду — два независимых пути.
 *
 * 1. Напрямую с устройства в Open Food Facts: быстро (1-2 сек), но может быть
 *    закрыт VPN/прокси или фильтрацией провайдера.
 * 2. Через наш сервер: работает даже когда прямой путь закрыт, но на бесплатном
 *    тарифе сервер «засыпает» и первый запрос после простоя идёт до минуты.
 *
 * Пробуем оба и рассказываем пользователю, что именно не получилось.
 */
const OFF_URL = (code: string) =>
  `https://world.openfoodfacts.org/api/v2/product/${code}.json` +
  `?fields=product_name,product_name_ru,brands,quantity,nutriments`;

const DIRECT_TIMEOUT_MS = 10000;

function num(v: unknown): number {
  const parsed = typeof v === "number" ? v : Number(v);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 10) / 10 : 0;
}

/** Продукта нет в базе — повторять через сервер бессмысленно. */
export class BarcodeNotFoundError extends Error {}

function mapProduct(code: string, p: any): BarcodeLookup {
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
}

async function lookupDirect(code: string): Promise<BarcodeLookup> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DIRECT_TIMEOUT_MS);
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
    return mapProduct(code, payload.product);
  } finally {
    clearTimeout(timeout);
  }
}

export interface LookupOptions {
  /** Сообщать о ходе поиска, чтобы пользователь понимал, чего ждать. */
  onProgress?: (message: string) => void;
}

export async function lookupBarcode(
  code: string,
  options: LookupOptions = {}
): Promise<BarcodeLookup> {
  const digits = code.replace(/\D/g, "");
  const { onProgress } = options;

  onProgress?.("Ищем продукт по штрихкоду…");
  try {
    return await lookupDirect(digits);
  } catch (err) {
    if (err instanceof BarcodeNotFoundError) {
      throw new Error(
        `Продукт со штрихкодом ${digits} не найден в базе. Введите данные с этикетки вручную — ` +
          `продукт сохранится в ваших продуктах.`
      );
    }

    // Прямой путь закрыт (VPN, прокси, фильтрация) — идём через наш сервер.
    onProgress?.("Прямой доступ закрыт, пробуем через сервер (до минуты, если он «просыпается»)…");
    try {
      return await api.get<BarcodeLookup>(`/foods/barcode/${digits}`);
    } catch (serverErr) {
      const serverMessage = serverErr instanceof Error ? serverErr.message : "";
      if (serverMessage.includes("не найден")) {
        throw new Error(
          `Продукт со штрихкодом ${digits} не найден в базе. Введите данные с этикетки вручную.`
        );
      }
      throw new Error(
        `Не удалось получить данные по штрихкоду ${digits}. ` +
          `Нажмите «Повторить» — сервер мог «просыпаться» после простоя. ` +
          `Если не помогает, введите данные с этикетки вручную.`
      );
    }
  }
}
