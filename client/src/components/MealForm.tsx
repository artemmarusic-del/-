import { useEffect, useState } from "react";
import { api } from "../api/client";
import TrendPicker from "./TrendPicker";
import BarcodeScanner from "./BarcodeScanner";
import Modal from "./Modal";
import { BarcodeLookup, FoodItem, GlucoseTrend, InsulinCalcResult, MealEntry, Profile } from "../types";

interface DraftItem {
  key: string;
  foodItemId: string | null;
  name: string;
  grams: number;
  kcal100: number;
  protein100: number;
  fat100: number;
  carbs100: number;
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function MealForm({
  profile,
  onCreated,
  editing,
}: {
  profile: Profile;
  onCreated: (meal: MealEntry) => void;
  /** Если передан — правим существующий приём пищи вместо создания нового. */
  editing?: MealEntry;
}) {
  const [eatenAt, setEatenAt] = useState(() =>
    editing ? toLocalInput(editing.eatenAt) : new Date().toISOString().slice(0, 16)
  );
  const [note, setNote] = useState(editing?.note ?? "");
  const [glucose, setGlucose] = useState("");
  const [trend, setTrend] = useState<GlucoseTrend | null>(null);
  const [treatment, setTreatment] = useState("");
  const [units, setUnits] = useState("");
  const [calc, setCalc] = useState<InsulinCalcResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [saveToLibrary, setSaveToLibrary] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodItem[]>([]);
  const [items, setItems] = useState<DraftItem[]>(() =>
    // При правке подставляем состав приёма пищи: пересчитываем показатели
    // «на 100 г» обратно из сохранённых значений позиции.
    (editing?.items ?? []).map((i) => {
      const per100 = (v: number) => (i.grams > 0 ? (v * 100) / i.grams : 0);
      return {
        key: i.id,
        foodItemId: i.foodItemId,
        name: i.foodName,
        grams: i.grams,
        kcal100: per100(i.kcal),
        protein100: per100(i.protein),
        fat100: per100(i.fat),
        carbs100: per100(i.carbs),
      };
    })
  );
  const [customName, setCustomName] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [customMacros, setCustomMacros] = useState({ kcal100: "", protein100: "", fat100: "", carbs100: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const foods = await api.get<FoodItem[]>(`/foods?query=${encodeURIComponent(q)}`);
        setResults(foods.slice(0, 8));
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  function addFood(food: FoodItem) {
    setItems((prev) => [
      ...prev,
      {
        key: `${food.id}-${Date.now()}`,
        foodItemId: food.id,
        name: food.name,
        grams: 100,
        kcal100: food.kcal100,
        protein100: food.protein100,
        fat100: food.fat100,
        carbs100: food.carbs100,
      },
    ]);
    setQuery("");
    setResults([]);
  }

  async function addCustom() {
    if (!customName.trim()) return;
    const macros = {
      kcal100: Number(customMacros.kcal100) || 0,
      protein100: Number(customMacros.protein100) || 0,
      fat100: Number(customMacros.fat100) || 0,
      carbs100: Number(customMacros.carbs100) || 0,
    };

    // По умолчанию запоминаем продукт в личной библиотеке, чтобы в следующий
    // раз его можно было просто найти поиском. Библиотека приватная.
    let savedId: string | null = null;
    if (saveToLibrary) {
      try {
        const saved = await api.post<FoodItem>("/foods", {
          name: customName.trim(),
          category: "Мои продукты",
          ...macros,
        });
        savedId = saved.id;
      } catch {
        // Не удалось сохранить в библиотеку — продукт всё равно попадёт в приём пищи.
      }
    }

    setItems((prev) => [
      ...prev,
      {
        key: `custom-${Date.now()}`,
        foodItemId: savedId,
        name: customName.trim(),
        grams: 100,
        ...macros,
      },
    ]);
    setCustomName("");
    setCustomMacros({ kcal100: "", protein100: "", fat100: "", carbs100: "" });
    setShowCustom(false);
  }

  /** Продукт найден по штрихкоду — сразу подставляем в форму своего продукта. */
  async function handleBarcode(code: string) {
    setScanning(false);
    setError(null);
    try {
      const found = await api.get<BarcodeLookup>(`/foods/barcode/${code}`);
      setCustomName(found.name);
      setCustomMacros({
        kcal100: String(found.kcal100),
        protein100: String(found.protein100),
        fat100: String(found.fat100),
        carbs100: String(found.carbs100),
      });
      setShowCustom(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось найти продукт по штрихкоду");
    }
  }

  function updateGrams(key: string, grams: number) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, grams } : i)));
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  const isLowGlucose = glucose !== "" && Number(glucose) < profile.targetGlucoseMin;

  async function handleCalculate() {
    setCalculating(true);
    setError(null);
    try {
      const res = await api.post<InsulinCalcResult>("/insulin/calculate", {
        carbsGrams: totalCarbs,
        currentGlucose: glucose.trim() ? Number(glucose) : undefined,
        at: new Date(eatenAt).toISOString(),
      });
      setCalc(res);
      setUnits(String(res.totalUnits));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось рассчитать дозу");
    } finally {
      setCalculating(false);
    }
  }

  const totalCarbs = items.reduce((sum, i) => sum + (i.carbs100 * i.grams) / 100, 0);
  const totalXe = totalCarbs / profile.xeGramsPerUnit;
  const totalKcal = items.reduce((sum, i) => sum + (i.kcal100 * i.grams) / 100, 0);

  async function handleSubmit() {
    if (items.length === 0) {
      setError("Добавьте хотя бы один продукт");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        eatenAt: new Date(eatenAt).toISOString(),
        note: note || undefined,
        items: items.map((i) =>
          i.foodItemId
            ? { foodItemId: i.foodItemId, grams: i.grams }
            : {
                foodName: i.name,
                grams: i.grams,
                kcal100: i.kcal100,
                protein100: i.protein100,
                fat100: i.fat100,
                carbs100: i.carbs100,
              }
        ),
      };
      const meal = editing
        ? await api.put<MealEntry>(`/diary/meals/${editing.id}`, payload)
        : await api.post<MealEntry>("/diary/meals", payload);

      // Замер сахара сохраняем отдельной записью, но привязываем к этому
      // приёму пищи — в дневнике они покажутся одной строкой.
      if (!editing && glucose.trim()) {
        await api.post("/diary/glucose", {
          measuredAt: new Date(eatenAt).toISOString(),
          value: Number(glucose),
          context: "BEFORE_MEAL",
          trend,
          treatment: isLowGlucose && treatment.trim() ? treatment.trim() : undefined,
          mealEntryId: meal.id,
        });
      }

      // Доза тоже привязывается к приёму пищи — попадёт в ту же строку дневника.
      if (!editing && units.trim()) {
        const unitsNum = Number(units);
        await api.post("/diary/insulin", {
          givenAt: new Date(eatenAt).toISOString(),
          type: "BOLUS_MEAL",
          units: unitsNum,
          calculatedUnits: calc?.totalUnits,
          overrideReason:
            calc && unitsNum !== calc.totalUnits
              ? `Скорректировано пользователем (расчёт: ${calc.totalUnits} ед.)`
              : undefined,
          mealEntryId: meal.id,
        });
      }

      onCreated(meal);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить приём пищи");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Время приёма пищи</label>
          <input className="input" type="datetime-local" value={eatenAt} onChange={(e) => setEatenAt(e.target.value)} />
        </div>
        <div>
          <label className="label">Заметка (необязательно)</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="например, обед" />
        </div>
      </div>

      {!editing && (
      <div>
        <label className="label">Сахар перед едой, ммоль/л (необязательно)</label>
        <input
          className="input"
          type="number"
          step="0.1"
          value={glucose}
          onChange={(e) => setGlucose(e.target.value)}
          placeholder="например, 6.7"
        />
        <p className="mt-1 text-xs text-slate-400">
          Замер сохранится вместе с этим приёмом пищи и покажется одной строкой в дневнике.
        </p>
      </div>
      )}

      {!editing && glucose.trim() !== "" && <TrendPicker value={trend} onChange={setTrend} />}

      {!editing && isLowGlucose && (
        <div className="rounded-lg border border-accent-200 bg-accent-50 p-3 dark:border-accent-900/50 dark:bg-accent-900/20">
          <p className="mb-2 text-sm font-medium text-accent-700 dark:text-accent-300">
            ⚠️ Сахар ниже целевого ({profile.targetGlucoseMin} ммоль/л) — сначала купируйте
            гипогликемию быстрыми углеводами.
          </p>
          <label className="label">Подкормка — чем подняли сахар</label>
          <input
            className="input"
            value={treatment}
            onChange={(e) => setTreatment(e.target.value)}
            placeholder="например: сок 200 мл"
          />
        </div>
      )}

      <div className="relative">
        <label className="label">Найти продукт</label>
        <input
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Начните вводить название…"
        />
        {results.length > 0 && (
          <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card dark:border-slate-700 dark:bg-slate-900">
            {results.map((food) => (
              <button
                key={food.id}
                type="button"
                onClick={() => addFood(food)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-brand-50 dark:hover:bg-slate-800"
              >
                <span>{food.name}</span>
                <span className="text-xs text-slate-400">{food.carbs100} г угл/100г</span>
              </button>
            ))}
          </div>
        )}
        <div className="mt-1 flex flex-wrap gap-3">
          <button type="button" className="text-xs font-medium text-brand-600" onClick={() => setShowCustom((v) => !v)}>
            {showCustom ? "Отменить" : "+ Свой продукт вручную"}
          </button>
          <button type="button" className="text-xs font-medium text-brand-600" onClick={() => setScanning(true)}>
            📷 Сканировать штрихкод
          </button>
        </div>
      </div>

      {showCustom && (
        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <input
            className="input mb-2"
            placeholder="Название продукта"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
          />
          <div className="grid grid-cols-4 gap-2">
            <input
              className="input"
              placeholder="Ккал/100г"
              type="number"
              value={customMacros.kcal100}
              onChange={(e) => setCustomMacros((m) => ({ ...m, kcal100: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Белки"
              type="number"
              value={customMacros.protein100}
              onChange={(e) => setCustomMacros((m) => ({ ...m, protein100: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Жиры"
              type="number"
              value={customMacros.fat100}
              onChange={(e) => setCustomMacros((m) => ({ ...m, fat100: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Углеводы"
              type="number"
              value={customMacros.carbs100}
              onChange={(e) => setCustomMacros((m) => ({ ...m, carbs100: e.target.value }))}
            />
          </div>
          <label className="mt-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={saveToLibrary}
              onChange={(e) => setSaveToLibrary(e.target.checked)}
            />
            Запомнить в моих продуктах (виден только вам)
          </label>
          <button type="button" className="btn-secondary mt-2 w-full" onClick={addCustom}>
            Добавить в приём пищи
          </button>
        </div>
      )}

      {items.length > 0 && (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div key={item.key} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
              <span className="flex-1 truncate text-sm">{item.name}</span>
              <input
                className="input w-20 py-1 text-right"
                type="number"
                value={item.grams}
                onChange={(e) => updateGrams(item.key, Number(e.target.value))}
              />
              <span className="text-xs text-slate-400">г</span>
              <button type="button" onClick={() => removeItem(item.key)} className="text-accent-500 hover:text-accent-600">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between rounded-lg bg-brand-50 px-4 py-3 text-sm dark:bg-brand-900/20">
        <span className="text-slate-600 dark:text-slate-300">Итого: {Math.round(totalCarbs)} г углеводов, {totalKcal.toFixed(0)} ккал</span>
        <span className="text-lg font-bold text-brand-700 dark:text-brand-300">{totalXe.toFixed(1)} ХЕ</span>
      </div>

      {!editing && (
      <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
        <label className="label">Доза инсулина, ед. (необязательно)</label>
        <div className="flex gap-2">
          <input
            className="input"
            type="number"
            step="0.5"
            value={units}
            onChange={(e) => setUnits(e.target.value)}
            placeholder="сколько подкололи"
          />
          <button
            type="button"
            className="btn-secondary shrink-0"
            disabled={calculating || items.length === 0}
            onClick={handleCalculate}
            title="Рассчитать по углеводам этого приёма пищи и сахару"
          >
            {calculating ? "…" : "🧮 Рассчитать"}
          </button>
        </div>

        {calc && (
          <div className="mt-2 rounded-lg bg-brand-50 p-2.5 text-xs dark:bg-brand-900/20">
            <div className="flex justify-between">
              <span>На еду ({calc.xe} ХЕ)</span>
              <span className="font-semibold">{calc.mealDoseUnits} ед.</span>
            </div>
            {calc.correctionDoseUnits > 0 && (
              <div className="flex justify-between">
                <span>Коррекция по сахару</span>
                <span className="font-semibold">{calc.correctionDoseUnits} ед.</span>
              </div>
            )}
            {calc.iobUnits > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Активный инсулин (учтён)</span>
                <span>{calc.iobUnits} ед.</span>
              </div>
            )}
            <div className="mt-1 flex justify-between border-t border-brand-200 pt-1 text-sm font-bold text-brand-700 dark:border-brand-800 dark:text-brand-300">
              <span>Предложено</span>
              <span>{calc.totalUnits} ед.</span>
            </div>
            {calc.warnings.map((w, i) => (
              <p key={i} className="mt-1.5 text-amber-700 dark:text-amber-400">
                ⚠️ {w}
              </p>
            ))}
          </div>
        )}
      </div>
      )}

      {error && <p className="text-sm text-accent-600">{error}</p>}

      <button type="button" className="btn-primary w-full" disabled={submitting} onClick={handleSubmit}>
        {submitting ? "Сохраняем…" : editing ? "Сохранить изменения" : "Сохранить приём пищи"}
      </button>

      {scanning && (
        <Modal title="Сканировать штрихкод" onClose={() => setScanning(false)}>
          <BarcodeScanner onDetected={handleBarcode} onClose={() => setScanning(false)} />
        </Modal>
      )}
    </div>
  );
}
