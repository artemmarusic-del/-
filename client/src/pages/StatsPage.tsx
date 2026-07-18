import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api/client";
import { useAuthStore } from "../store/authStore";
import GlucoseChart from "../components/GlucoseChart";
import { GlucoseReading, StatsSummary } from "../types";

interface XePoint {
  date: string;
  xe: number;
  carbs: number;
}

const ranges = [7, 14, 30];

export default function StatsPage() {
  const profile = useAuthStore((s) => s.profile);
  const [days, setDays] = useState(14);
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [glucose, setGlucose] = useState<GlucoseReading[]>([]);
  const [xe, setXe] = useState<XePoint[]>([]);

  useEffect(() => {
    Promise.all([
      api.get<StatsSummary>(`/stats/summary?days=${days}`),
      api.get<GlucoseReading[]>(`/stats/glucose?days=${days}`),
      api.get<XePoint[]>(`/stats/xe?days=${days}`),
    ]).then(([s, g, x]) => {
      setSummary(s);
      setGlucose(g);
      setXe(x);
    });
  }, [days]);

  if (!profile) return null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Статистика</h1>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => setDays(r)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                days === r ? "bg-white shadow-soft dark:bg-slate-700" : "text-slate-500"
              }`}
            >
              {r} дн.
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Среднее" value={summary?.averageGlucose?.toString() ?? "—"} suffix="ммоль/л" />
        <StatCard label="В диапазоне" value={summary?.timeInRangePercent?.toString() ?? "—"} suffix="%" accent />
        <StatCard label="Выше нормы" value={summary?.aboveRangePercent?.toString() ?? "—"} suffix="%" />
        <StatCard label="Ниже нормы" value={summary?.belowRangePercent?.toString() ?? "—"} suffix="%" />
      </div>

      <div className="card mb-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-300">Глюкоза</h2>
        <GlucoseChart readings={glucose} targetMin={profile.targetGlucoseMin} targetMax={profile.targetGlucoseMax} />
      </div>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-300">ХЕ по дням</h2>
        {xe.length === 0 ? (
          <p className="text-sm text-slate-400">Нет данных за этот период</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={xe} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={30} />
              <Tooltip formatter={(value: number) => [`${value} ХЕ`, "Хлебные единицы"]} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="xe" fill="#2b9c7c" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, suffix, accent }: { label: string; value: string; suffix?: string; accent?: boolean }) {
  return (
    <div className="card !p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${accent ? "text-brand-600" : "text-slate-800 dark:text-slate-100"}`}>
        {value}
        {suffix && <span className="ml-1 text-sm font-normal text-slate-400">{suffix}</span>}
      </div>
    </div>
  );
}
