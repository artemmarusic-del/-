import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuthStore } from "../store/authStore";
import DisclaimerBanner from "../components/DisclaimerBanner";
import GlucoseChart from "../components/GlucoseChart";
import Modal from "../components/Modal";
import MealForm from "../components/MealForm";
import GlucoseForm from "../components/GlucoseForm";
import InsulinDoseForm from "../components/InsulinDoseForm";
import { CoefficientAdjustment, DaySummary, StatsSummary } from "../types";

type ActiveModal = "meal" | "glucose" | "insulin" | null;

export default function DashboardPage() {
  const { user, profile } = useAuthStore();
  const [day, setDay] = useState<DaySummary | null>(null);
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [pending, setPending] = useState<CoefficientAdjustment[]>([]);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  async function refresh() {
    const [d, s, p] = await Promise.all([
      api.get<DaySummary>("/diary/day"),
      api.get<StatsSummary>("/stats/summary?days=7"),
      api.get<CoefficientAdjustment[]>("/adaptation/suggestions"),
    ]);
    setDay(d);
    setStats(s);
    setPending(p);
  }

  useEffect(() => {
    refresh();
  }, []);

  if (!profile) return null;

  const hour = new Date().getHours();
  const greeting = hour < 6 ? "Доброй ночи" : hour < 12 ? "Доброе утро" : hour < 18 ? "Добрый день" : "Добрый вечер";

  return (
    <div>
      <DisclaimerBanner />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {greeting}, {user?.name}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={() => setActiveModal("meal")}>
            🍽️ Приём пищи
          </button>
          <button className="btn-secondary" onClick={() => setActiveModal("glucose")}>
            🩸 Глюкоза
          </button>
          <button className="btn-secondary" onClick={() => setActiveModal("insulin")}>
            💉 Инсулин
          </button>
        </div>
      </div>

      {pending.length > 0 && (
        <Link
          to="/settings"
          className="mb-6 flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm dark:border-brand-900/50 dark:bg-brand-900/20"
        >
          <span className="text-brand-800 dark:text-brand-300">
            💡 Есть {pending.length} предложение по корректировке коэффициентов на основе вашего дневника
          </span>
          <span className="font-semibold text-brand-700 dark:text-brand-300">Посмотреть →</span>
        </Link>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="ХЕ сегодня" value={day ? day.totals.xe.toFixed(1) : "—"} />
        <StatCard label="Калории" value={day ? Math.round(day.totals.kcal).toString() : "—"} suffix="ккал" />
        <StatCard label="Среднее (7 дн.)" value={stats?.averageGlucose?.toString() ?? "—"} suffix="ммоль/л" />
        <StatCard label="В целевом диапазоне" value={stats?.timeInRangePercent?.toString() ?? "—"} suffix="%" accent />
      </div>

      <div className="card mb-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-300">Глюкоза сегодня</h2>
        <GlucoseChart readings={day?.glucose ?? []} targetMin={profile.targetGlucoseMin} targetMax={profile.targetGlucoseMax} />
      </div>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-300">События сегодня</h2>
        <Timeline day={day} />
      </div>

      {activeModal === "meal" && (
        <Modal title="Добавить приём пищи" onClose={() => setActiveModal(null)}>
          <MealForm
            profile={profile}
            onCreated={() => {
              setActiveModal(null);
              refresh();
            }}
          />
        </Modal>
      )}
      {activeModal === "glucose" && (
        <Modal title="Добавить измерение глюкозы" onClose={() => setActiveModal(null)}>
          <GlucoseForm
            onCreated={() => {
              setActiveModal(null);
              refresh();
            }}
          />
        </Modal>
      )}
      {activeModal === "insulin" && (
        <Modal title="Добавить дозу инсулина" onClose={() => setActiveModal(null)}>
          <InsulinDoseForm
            recentMeals={day?.meals ?? []}
            onCreated={() => {
              setActiveModal(null);
              refresh();
            }}
          />
        </Modal>
      )}
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

function Timeline({ day }: { day: DaySummary | null }) {
  if (!day || (day.meals.length === 0 && day.glucose.length === 0 && day.insulin.length === 0)) {
    return <p className="text-sm text-slate-400">Пока нет записей за сегодня. Добавьте первый приём пищи или измерение.</p>;
  }

  type Event = { time: string; node: JSX.Element };
  const events: Event[] = [
    ...day.meals.map((m) => ({
      time: m.eatenAt,
      node: (
        <span>
          🍽️ <strong>{m.totalXe.toFixed(1)} ХЕ</strong> — {m.items.map((i) => i.foodName).join(", ")}
        </span>
      ),
    })),
    ...day.glucose.map((g) => ({
      time: g.measuredAt,
      node: (
        <span>
          🩸 Глюкоза: <strong>{g.value}</strong> ммоль/л
        </span>
      ),
    })),
    ...day.insulin.map((d) => ({
      time: d.givenAt,
      node: (
        <span>
          💉 {d.units} ед. ({d.type === "BASAL" ? "базальный" : d.type === "BOLUS_CORRECTION" ? "коррекция" : "на еду"})
        </span>
      ),
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return (
    <ul className="flex flex-col gap-2 text-sm">
      {events.map((e, idx) => (
        <li key={idx} className="flex items-center gap-3 border-b border-slate-50 pb-2 last:border-0 dark:border-slate-800">
          <span className="w-14 shrink-0 text-xs text-slate-400">
            {new Date(e.time).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
          </span>
          {e.node}
        </li>
      ))}
    </ul>
  );
}
