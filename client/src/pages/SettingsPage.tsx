import { ReactNode, useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuthStore } from "../store/authStore";
import ProfilesManager from "../components/ProfilesManager";
import { CoefficientAdjustment, Profile } from "../types";

const segmentLabels: Record<string, string> = {
  MORNING: "Утро (06–11)",
  DAY: "День (11–17)",
  EVENING: "Вечер (17–23)",
  NIGHT: "Ночь (23–06)",
};

const fieldLabels: Record<string, string> = {
  UNITS_PER_XE: "Ед. инсулина на 1 ХЕ",
  CORRECTION_FACTOR: "Фактор коррекции",
};

export default function SettingsPage() {
  const { profile, setProfile, loadProfiles } = useAuthStore();
  const [form, setForm] = useState<Profile | null>(profile);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<CoefficientAdjustment[]>([]);
  const [history, setHistory] = useState<CoefficientAdjustment[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    setForm(profile);
  }, [profile]);

  async function loadSuggestions() {
    const [p, h] = await Promise.all([
      api.get<CoefficientAdjustment[]>("/adaptation/suggestions"),
      api.get<CoefficientAdjustment[]>("/adaptation/history"),
    ]);
    setPending(p);
    setHistory(h);
  }

  // Suggestions belong to the active profile — reload them when it changes.
  useEffect(() => {
    loadSuggestions();
  }, [profile?.id]);

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await api.put<Profile>(`/profiles/${form.id}`, form);
      setProfile(updated);
      setMessage("Сохранено");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  async function runAnalysis() {
    setAnalyzing(true);
    try {
      const res = await api.post<{ created: number }>("/adaptation/run");
      setMessage(res.created > 0 ? `Найдено новых предложений: ${res.created}` : "Пока недостаточно данных для новых предложений");
      await loadSuggestions();
    } finally {
      setAnalyzing(false);
    }
  }

  async function accept(id: string) {
    await api.post(`/adaptation/suggestions/${id}/accept`);
    await loadSuggestions();
    // The engine changed this profile's coefficients — refresh them.
    await loadProfiles();
  }

  async function reject(id: string) {
    await api.post(`/adaptation/suggestions/${id}/reject`);
    await loadSuggestions();
  }

  if (!form) return null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Настройки</h1>

      <ProfilesManager />

      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Самонастройка</h2>
        </div>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
          Приложение анализирует ваш дневник и предлагает скорректировать коэффициенты, если видит устойчивое отклонение
          глюкозы от целевого диапазона. По умолчанию изменения требуют вашего подтверждения.
        </p>
        <label className="mb-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.autoApplyAdaptation}
            onChange={(e) => update("autoApplyAdaptation", e.target.checked)}
          />
          Применять предложения автоматически, без подтверждения
        </label>
        <button className="btn-secondary" onClick={runAnalysis} disabled={analyzing}>
          {analyzing ? "Анализируем…" : "🔍 Проанализировать дневник сейчас"}
        </button>

        {pending.length > 0 && (
          <div className="mt-4 flex flex-col gap-3">
            {pending.map((s) => (
              <div key={s.id} className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm dark:border-brand-900/50 dark:bg-brand-900/20">
                <div className="font-medium text-brand-800 dark:text-brand-300">
                  {segmentLabels[s.timeSegment]} · {fieldLabels[s.field]}: {s.oldValue.toFixed(2)} → {s.newValue.toFixed(2)}
                </div>
                <p className="mt-1 text-slate-600 dark:text-slate-300">{s.reason}</p>
                <div className="mt-2 flex gap-2">
                  <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => accept(s.id)}>
                    Принять
                  </button>
                  <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => reject(s.id)}>
                    Отклонить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {history.length > 0 && (
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer font-medium text-slate-500">История изменений ({history.length})</summary>
            <div className="mt-2 flex flex-col gap-2">
              {history.map((h) => (
                <div key={h.id} className="border-b border-slate-50 pb-2 text-xs text-slate-500 last:border-0 dark:border-slate-800">
                  <span className="font-medium">{new Date(h.createdAt).toLocaleDateString("ru-RU")}</span> —{" "}
                  {segmentLabels[h.timeSegment]}, {fieldLabels[h.field]}: {h.oldValue.toFixed(2)} → {h.newValue.toFixed(2)} (
                  {h.status === "REJECTED" ? "отклонено" : "применено"})
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-300">Общие параметры</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Вес, кг">
            <input
              className="input"
              type="number"
              value={form.weightKg ?? ""}
              onChange={(e) => update("weightKg", e.target.value ? Number(e.target.value) : null)}
            />
          </Field>
          <Field label="Грамм углеводов в 1 ХЕ">
            <input className="input" type="number" step="0.5" value={form.xeGramsPerUnit} onChange={(e) => update("xeGramsPerUnit", Number(e.target.value))} />
          </Field>
          <Field label="Целевая глюкоза, от">
            <input className="input" type="number" step="0.1" value={form.targetGlucoseMin} onChange={(e) => update("targetGlucoseMin", Number(e.target.value))} />
          </Field>
          <Field label="до, ммоль/л">
            <input className="input" type="number" step="0.1" value={form.targetGlucoseMax} onChange={(e) => update("targetGlucoseMax", Number(e.target.value))} />
          </Field>
          <Field label="Шаг дозы шприц-ручки">
            <select className="input" value={form.doseStepUnits} onChange={(e) => update("doseStepUnits", Number(e.target.value))}>
              <option value={1}>1 единица</option>
              <option value={0.5}>0.5 единицы</option>
            </select>
          </Field>
          <Field label="Длительность действия инсулина, ч">
            <input
              className="input"
              type="number"
              step="0.5"
              value={form.insulinActionHours}
              onChange={(e) => update("insulinActionHours", Number(e.target.value))}
            />
          </Field>
          <Field label="Базальная доза, ед/сутки (справочно)">
            <input
              className="input"
              type="number"
              value={form.basalDoseUnits ?? ""}
              onChange={(e) => update("basalDoseUnits", e.target.value ? Number(e.target.value) : null)}
            />
          </Field>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-300">Единиц инсулина на 1 ХЕ, по времени суток</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Утро">
            <input className="input" type="number" step="0.1" value={form.unitsPerXeMorning} onChange={(e) => update("unitsPerXeMorning", Number(e.target.value))} />
          </Field>
          <Field label="День">
            <input className="input" type="number" step="0.1" value={form.unitsPerXeDay} onChange={(e) => update("unitsPerXeDay", Number(e.target.value))} />
          </Field>
          <Field label="Вечер">
            <input className="input" type="number" step="0.1" value={form.unitsPerXeEvening} onChange={(e) => update("unitsPerXeEvening", Number(e.target.value))} />
          </Field>
          <Field label="Ночь">
            <input className="input" type="number" step="0.1" value={form.unitsPerXeNight} onChange={(e) => update("unitsPerXeNight", Number(e.target.value))} />
          </Field>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-300">Фактор коррекции (ммоль/л на 1 ед.), по времени суток</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Утро">
            <input className="input" type="number" step="0.1" value={form.correctionFactorMorning} onChange={(e) => update("correctionFactorMorning", Number(e.target.value))} />
          </Field>
          <Field label="День">
            <input className="input" type="number" step="0.1" value={form.correctionFactorDay} onChange={(e) => update("correctionFactorDay", Number(e.target.value))} />
          </Field>
          <Field label="Вечер">
            <input className="input" type="number" step="0.1" value={form.correctionFactorEvening} onChange={(e) => update("correctionFactorEvening", Number(e.target.value))} />
          </Field>
          <Field label="Ночь">
            <input className="input" type="number" step="0.1" value={form.correctionFactorNight} onChange={(e) => update("correctionFactorNight", Number(e.target.value))} />
          </Field>
        </div>
      </div>

      {message && <p className="text-sm text-brand-600">{message}</p>}
      <button className="btn-primary self-start" onClick={handleSave} disabled={saving}>
        {saving ? "Сохраняем…" : "Сохранить настройки"}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
