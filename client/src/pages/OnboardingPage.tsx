import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { api, ApiError } from "../api/client";
import { DiabetesType, Profile } from "../types";
import AuthLayout from "../components/AuthLayout";

const diabetesLabels: Record<DiabetesType, string> = {
  TYPE_1: "1 тип",
  TYPE_2: "2 тип",
  GESTATIONAL: "Гестационный",
  OTHER: "Другое",
};

export default function OnboardingPage() {
  const setProfile = useAuthStore((s) => s.setProfile);
  const navigate = useNavigate();

  const [diabetesType, setDiabetesType] = useState<DiabetesType>("TYPE_1");
  const [weightKg, setWeightKg] = useState("");
  const [targetMin, setTargetMin] = useState("4.4");
  const [targetMax, setTargetMax] = useState("7.8");
  const [xeGrams, setXeGrams] = useState("10");
  const [unitsPerXe, setUnitsPerXe] = useState("1.3");
  const [correctionFactor, setCorrectionFactor] = useState("2.5");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const upx = Number(unitsPerXe);
      const cf = Number(correctionFactor);
      const profile = await api.post<Profile>("/profile", {
        diabetesType,
        weightKg: weightKg ? Number(weightKg) : null,
        targetGlucoseMin: Number(targetMin),
        targetGlucoseMax: Number(targetMax),
        xeGramsPerUnit: Number(xeGrams),
        unitsPerXeMorning: upx,
        unitsPerXeDay: upx,
        unitsPerXeEvening: upx,
        unitsPerXeNight: upx,
        correctionFactorMorning: cf,
        correctionFactorDay: cf,
        correctionFactorEvening: cf,
        correctionFactorNight: cf,
      });
      setProfile(profile);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сохранить профиль");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Настройка профиля" subtitle="Эти значения — только отправная точка, приложение будет подстраивать их само">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="label">Тип диабета</label>
          <select className="input" value={diabetesType} onChange={(e) => setDiabetesType(e.target.value as DiabetesType)}>
            {Object.entries(diabetesLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Вес, кг (необязательно)</label>
          <input className="input" type="number" step="0.1" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Целевая глюкоза, от</label>
            <input className="input" type="number" step="0.1" value={targetMin} onChange={(e) => setTargetMin(e.target.value)} />
          </div>
          <div>
            <label className="label">до, ммоль/л</label>
            <input className="input" type="number" step="0.1" value={targetMax} onChange={(e) => setTargetMax(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label">Грамм углеводов в 1 ХЕ</label>
          <input className="input" type="number" step="0.5" value={xeGrams} onChange={(e) => setXeGrams(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Ед. инсулина на 1 ХЕ</label>
            <input className="input" type="number" step="0.1" value={unitsPerXe} onChange={(e) => setUnitsPerXe(e.target.value)} />
          </div>
          <div>
            <label className="label">Фактор коррекции, ммоль/л на ед.</label>
            <input
              className="input"
              type="number"
              step="0.1"
              value={correctionFactor}
              onChange={(e) => setCorrectionFactor(e.target.value)}
            />
          </div>
        </div>

        <p className="text-xs text-slate-400">
          Если не уверены в значениях — используйте те, что назначил врач, или оставьте по умолчанию. Их можно
          детализировать по времени суток позже в настройках.
        </p>

        {error && <p className="text-sm text-accent-600">{error}</p>}
        <button type="submit" className="btn-primary mt-2 w-full" disabled={loading}>
          {loading ? "Сохраняем…" : "Начать пользоваться"}
        </button>
      </form>
    </AuthLayout>
  );
}
