import { useState } from "react";
import { api } from "../api/client";
import { InsulinCalcResult, InsulinDose, InsulinType, MealEntry } from "../types";

const typeLabels: Record<InsulinType, string> = {
  BOLUS_MEAL: "На еду",
  BOLUS_CORRECTION: "Коррекция (без еды)",
  BASAL: "Базальный (продлённый)",
};

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function InsulinDoseForm({
  recentMeals,
  onCreated,
  editing,
}: {
  recentMeals: MealEntry[];
  onCreated: (dose: InsulinDose) => void;
  /** Если передан — форма правит существующую дозу. */
  editing?: InsulinDose;
}) {
  const [type, setType] = useState<InsulinType>(editing?.type ?? "BOLUS_MEAL");
  const [givenAt, setGivenAt] = useState(() =>
    editing ? toLocalInput(editing.givenAt) : new Date().toISOString().slice(0, 16)
  );
  const [mealEntryId, setMealEntryId] = useState<string>(editing?.mealEntryId ?? "");
  const [carbsGrams, setCarbsGrams] = useState("");
  const [currentGlucose, setCurrentGlucose] = useState("");
  const [result, setResult] = useState<InsulinCalcResult | null>(null);
  const [units, setUnits] = useState(editing ? String(editing.units) : "");
  const [calculating, setCalculating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function selectMeal(id: string) {
    setMealEntryId(id);
    const meal = recentMeals.find((m) => m.id === id);
    if (meal) setCarbsGrams(String(Math.round(meal.totalCarbs)));
  }

  async function handleCalculate() {
    setCalculating(true);
    setError(null);
    try {
      const res = await api.post<InsulinCalcResult>("/insulin/calculate", {
        carbsGrams: type === "BOLUS_MEAL" && carbsGrams ? Number(carbsGrams) : undefined,
        currentGlucose: currentGlucose ? Number(currentGlucose) : undefined,
        at: new Date(givenAt).toISOString(),
      });
      setResult(res);
      setUnits(String(res.totalUnits));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось рассчитать дозу");
    } finally {
      setCalculating(false);
    }
  }

  async function handleSubmit() {
    if (!units) {
      setError("Укажите количество единиц");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const unitsNum = Number(units);
      const overrideReason =
        result && unitsNum !== result.totalUnits ? `Скорректировано пользователем (расчёт: ${result.totalUnits} ед.)` : undefined;
      const payload = {
        givenAt: new Date(givenAt).toISOString(),
        type,
        units: unitsNum,
        calculatedUnits: result?.totalUnits ?? editing?.calculatedUnits ?? undefined,
        overrideReason,
        mealEntryId: mealEntryId || undefined,
      };
      const dose = editing
        ? await api.put<InsulinDose>(`/diary/insulin/${editing.id}`, payload)
        : await api.post<InsulinDose>("/diary/insulin", payload);
      onCreated(dose);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить дозу");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="label">Тип дозы</label>
        <select className="input" value={type} onChange={(e) => setType(e.target.value as InsulinType)}>
          {Object.entries(typeLabels).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Время введения</label>
        <input className="input" type="datetime-local" value={givenAt} onChange={(e) => setGivenAt(e.target.value)} />
      </div>

      {type === "BOLUS_MEAL" && (
        <>
          {recentMeals.length > 0 && (
            <div>
              <label className="label">Связать с приёмом пищи (необязательно)</label>
              <select className="input" value={mealEntryId} onChange={(e) => selectMeal(e.target.value)}>
                <option value="">Не связывать</option>
                {recentMeals.map((m) => (
                  <option key={m.id} value={m.id}>
                    {new Date(m.eatenAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} —{" "}
                    {m.totalXe.toFixed(1)} ХЕ
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label">Углеводы, г</label>
            <input className="input" type="number" value={carbsGrams} onChange={(e) => setCarbsGrams(e.target.value)} />
          </div>
        </>
      )}

      {type !== "BASAL" && (
        <div>
          <label className="label">Текущая глюкоза, ммоль/л (необязательно)</label>
          <input className="input" type="number" step="0.1" value={currentGlucose} onChange={(e) => setCurrentGlucose(e.target.value)} />
        </div>
      )}

      {type !== "BASAL" && (
        <button type="button" className="btn-secondary" disabled={calculating} onClick={handleCalculate}>
          {calculating ? "Считаем…" : "🧮 Рассчитать дозу"}
        </button>
      )}

      {result && (
        <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm dark:border-brand-900/50 dark:bg-brand-900/20">
          <div className="flex justify-between">
            <span>ХЕ в приёме пищи</span>
            <span className="font-semibold">{result.xe}</span>
          </div>
          <div className="flex justify-between">
            <span>Доза на еду</span>
            <span className="font-semibold">{result.mealDoseUnits} ед.</span>
          </div>
          <div className="flex justify-between">
            <span>Коррекция</span>
            <span className="font-semibold">{result.correctionDoseUnits} ед.</span>
          </div>
          {result.iobUnits > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>Активный инсулин (учтён)</span>
              <span>{result.iobUnits} ед.</span>
            </div>
          )}
          <div className="mt-1 flex justify-between border-t border-brand-200 pt-1 text-base font-bold text-brand-700 dark:border-brand-800 dark:text-brand-300">
            <span>Итого предложено</span>
            <span>{result.totalUnits} ед.</span>
          </div>
          {result.warnings.map((w, idx) => (
            <p key={idx} className="mt-2 text-xs text-amber-700 dark:text-amber-400">
              ⚠️ {w}
            </p>
          ))}
        </div>
      )}

      <div>
        <label className="label">Единиц введено фактически</label>
        <input className="input" type="number" step="0.5" value={units} onChange={(e) => setUnits(e.target.value)} />
      </div>

      {error && <p className="text-sm text-accent-600">{error}</p>}

      <button type="button" className="btn-primary w-full" disabled={submitting} onClick={handleSubmit}>
        {submitting ? "Сохраняем…" : editing ? "Сохранить изменения" : "Сохранить введённую дозу"}
      </button>
    </div>
  );
}
