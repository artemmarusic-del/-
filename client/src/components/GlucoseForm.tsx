import { useState } from "react";
import { api } from "../api/client";
import { useAuthStore } from "../store/authStore";
import { GlucoseContext, GlucoseReading } from "../types";

const contextLabels: Record<GlucoseContext, string> = {
  FASTING: "Натощак",
  BEFORE_MEAL: "Перед едой",
  AFTER_MEAL: "После еды",
  BEDTIME: "Перед сном",
  NIGHT: "Ночью",
  RANDOM: "Случайное измерение",
};

export default function GlucoseForm({ onCreated, mealEntryId }: { onCreated: (r: GlucoseReading) => void; mealEntryId?: string }) {
  const profile = useAuthStore((s) => s.profile);
  const [measuredAt, setMeasuredAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [value, setValue] = useState("");
  const [context, setContext] = useState<GlucoseContext>(mealEntryId ? "AFTER_MEAL" : "RANDOM");
  const [treatment, setTreatment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lowThreshold = profile?.targetGlucoseMin ?? 4.4;
  const isLow = value !== "" && Number(value) < lowThreshold;

  async function handleSubmit() {
    if (!value) {
      setError("Введите значение глюкозы");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const reading = await api.post<GlucoseReading>("/diary/glucose", {
        measuredAt: new Date(measuredAt).toISOString(),
        value: Number(value),
        context,
        treatment: isLow && treatment.trim() ? treatment.trim() : undefined,
        mealEntryId,
      });
      onCreated(reading);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить измерение");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Время измерения</label>
          <input className="input" type="datetime-local" value={measuredAt} onChange={(e) => setMeasuredAt(e.target.value)} />
        </div>
        <div>
          <label className="label">Глюкоза, ммоль/л</label>
          <input className="input" type="number" step="0.1" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
        </div>
      </div>
      <div>
        <label className="label">Контекст измерения</label>
        <select className="input" value={context} onChange={(e) => setContext(e.target.value as GlucoseContext)}>
          {Object.entries(contextLabels).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {isLow && (
        <div className="rounded-lg border border-accent-200 bg-accent-50 p-3 dark:border-accent-900/50 dark:bg-accent-900/20">
          <p className="mb-2 text-sm font-medium text-accent-700 dark:text-accent-300">
            ⚠️ Сахар ниже целевого ({lowThreshold} ммоль/л) — купируйте гипогликемию быстрыми углеводами.
          </p>
          <label className="label">Подкормка — чем подняли сахар</label>
          <input
            className="input"
            value={treatment}
            onChange={(e) => setTreatment(e.target.value)}
            placeholder="например: сок 200 мл, 3 куска сахара, банан"
          />
        </div>
      )}

      {error && <p className="text-sm text-accent-600">{error}</p>}
      <button type="button" className="btn-primary w-full" disabled={submitting} onClick={handleSubmit}>
        {submitting ? "Сохраняем…" : "Сохранить измерение"}
      </button>
    </div>
  );
}
