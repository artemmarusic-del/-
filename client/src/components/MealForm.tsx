import { useEffect, useState } from "react";
import { api } from "../api/client";
import { FoodItem, MealEntry, Profile } from "../types";

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

export default function MealForm({
  profile,
  onCreated,
}: {
  profile: Profile;
  onCreated: (meal: MealEntry) => void;
}) {
  const [eatenAt, setEatenAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [note, setNote] = useState("");
  const [glucose, setGlucose] = useState("");
  const [treatment, setTreatment] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodItem[]>([]);
  const [items, setItems] = useState<DraftItem[]>([]);
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

  function addCustom() {
    if (!customName.trim()) return;
    setItems((prev) => [
      ...prev,
      {
        key: `custom-${Date.now()}`,
        foodItemId: null,
        name: customName.trim(),
        grams: 100,
        kcal100: Number(customMacros.kcal100) || 0,
        protein100: Number(customMacros.protein100) || 0,
        fat100: Number(customMacros.fat100) || 0,
        carbs100: Number(customMacros.carbs100) || 0,
      },
    ]);
    setCustomName("");
    setCustomMacros({ kcal100: "", protein100: "", fat100: "", carbs100: "" });
    setShowCustom(false);
  }

  function updateGrams(key: string, grams: number) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, grams } : i)));
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  const isLowGlucose = glucose !== "" && Number(glucose) < profile.targetGlucoseMin;

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
      const meal = await api.post<MealEntry>("/diary/meals", {
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
      });

      // Замер сахара сохраняем отдельной записью, но привязываем к этому
      // приёму пищи — в дневнике они покажутся одной строкой.
      if (glucose.trim()) {
        await api.post("/diary/glucose", {
          measuredAt: new Date(eatenAt).toISOString(),
          value: Number(glucose),
          context: "BEFORE_MEAL",
          treatment: isLowGlucose && treatment.trim() ? treatment.trim() : undefined,
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

      {isLowGlucose && (
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
        <button type="button" className="mt-1 text-xs font-medium text-brand-600" onClick={() => setShowCustom((v) => !v)}>
          {showCustom ? "Отменить" : "+ Свой продукт вручную"}
        </button>
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

      {error && <p className="text-sm text-accent-600">{error}</p>}

      <button type="button" className="btn-primary w-full" disabled={submitting} onClick={handleSubmit}>
        {submitting ? "Сохраняем…" : "Сохранить приём пищи"}
      </button>
    </div>
  );
}
