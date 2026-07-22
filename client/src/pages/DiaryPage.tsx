import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { useAuthStore } from "../store/authStore";
import Modal from "../components/Modal";
import MealForm from "../components/MealForm";
import GlucoseForm from "../components/GlucoseForm";
import InsulinDoseForm from "../components/InsulinDoseForm";
import { GlucoseReading, GlucoseTrend, InsulinDose, MealEntry } from "../types";
import { TREND_VIEW } from "../components/TrendPicker";
import ExportMenu, { ExportFormat } from "../components/ExportMenu";
import RowActions, { RowAction } from "../components/RowActions";
import {
  ExportRow,
  exportToExcel,
  exportToPdf,
  exportToTxt,
  exportToWord,
} from "../utils/exportDiary";

type ActiveModal = "meal" | "glucose" | "insulin" | null;

/** Что именно правим: тип записи и сама запись. */
type Editing =
  | { kind: "meal"; meal: MealEntry }
  | { kind: "glucose"; reading: GlucoseReading }
  | { kind: "insulin"; dose: InsulinDose }
  | null;

const typeLabels: Record<string, string> = {
  BOLUS_MEAL: "на еду",
  BOLUS_CORRECTION: "коррекция",
  BASAL: "базальный",
};

const ranges = [
  { days: 1, label: "Сегодня" },
  { days: 7, label: "7 дней" },
  { days: 14, label: "14 дней" },
];

// Тенденцию пользователь может указать сам (стрелка с прибора). Если не указал —
// приложение считает её по скорости изменения между соседними замерами.
type Trend = GlucoseTrend | null;

const trendView = TREND_VIEW;

const MAX_TREND_GAP_HOURS = 4;

function computeTrends(readings: GlucoseReading[]): Map<string, Trend> {
  const sorted = [...readings].sort(
    (a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime()
  );
  const map = new Map<string, Trend>();
  for (let i = 0; i < sorted.length; i++) {
    // Указанная пользователем стрелка всегда важнее рассчитанной.
    if (sorted[i].trend) {
      map.set(sorted[i].id, sorted[i].trend);
      continue;
    }
    if (i === 0) {
      map.set(sorted[i].id, null);
      continue;
    }
    const prev = sorted[i - 1];
    const cur = sorted[i];
    const hours =
      (new Date(cur.measuredAt).getTime() - new Date(prev.measuredAt).getTime()) / (1000 * 60 * 60);
    if (hours <= 0 || hours > MAX_TREND_GAP_HOURS) {
      map.set(cur.id, null);
      continue;
    }
    const rate = (cur.value - prev.value) / hours;
    let trend: Trend;
    if (rate >= 2) trend = "UP";
    else if (rate >= 0.6) trend = "SLOW_UP";
    else if (rate > -0.6) trend = "FLAT";
    else if (rate > -2) trend = "SLOW_DOWN";
    else trend = "DOWN";
    map.set(cur.id, trend);
  }
  return map;
}

interface Row {
  key: string;
  time: Date;
  glucose?: GlucoseReading;
  insulin?: InsulinDose;
  meal?: MealEntry;
}

// Date window for a page: page 1 is the most recent `days` days,
// page 2 is the `days` days before that, and so on back in time.
function pageWindow(page: number, days: number): { from: Date; to: Date } {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  to.setDate(to.getDate() - (page - 1) * days);
  const from = new Date(to);
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - (days - 1));
  return { from, to };
}

export default function DiaryPage() {
  const profile = useAuthStore((s) => s.profile);
  const [days, setDays] = useState(7);
  const [page, setPage] = useState(1);
  const [earliest, setEarliest] = useState<Date | null>(null);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [glucose, setGlucose] = useState<GlucoseReading[]>([]);
  const [insulin, setInsulin] = useState<InsulinDose[]>([]);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      const { from, to } = pageWindow(page, days);
      const range = `?from=${from.toISOString()}&to=${to.toISOString()}`;
      const [m, g, i, bounds] = await Promise.all([
        api.get<MealEntry[]>(`/diary/meals${range}`),
        api.get<GlucoseReading[]>(`/diary/glucose${range}`),
        api.get<InsulinDose[]>(`/diary/insulin${range}`),
        api.get<{ earliest: string | null }>("/diary/bounds"),
      ]);
      setMeals(m);
      setGlucose(g);
      setInsulin(i);
      setEarliest(bounds.earliest ? new Date(bounds.earliest) : null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, page, profile?.id]);

  const totalPages = useMemo(() => {
    if (!earliest) return 1;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfEarliest = new Date(earliest);
    startOfEarliest.setHours(0, 0, 0, 0);
    const spanDays =
      Math.round((startOfToday.getTime() - startOfEarliest.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    return Math.max(1, Math.ceil(spanDays / days));
  }, [earliest, days]);

  // Condensed page list: 1 … around current … last
  const pageItems = useMemo<(number | "...")[]>(() => {
    if (totalPages <= 9) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const items: (number | "...")[] = [1];
    if (page > 3) items.push("...");
    for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) items.push(p);
    if (page < totalPages - 2) items.push("...");
    items.push(totalPages);
    return items;
  }, [page, totalPages]);

  const trends = useMemo(() => computeTrends(glucose), [glucose]);

  // Замер сахара и доза, привязанные к приёму пищи, показываются с ним ОДНОЙ
  // строкой — как в бумажном дневнике самоконтроля. Остальные записи идут
  // отдельными строками.
  const rows = useMemo<Row[]>(() => {
    const mealIds = new Set(meals.map((m) => m.id));
    const usedGlucose = new Set<string>();
    const usedInsulin = new Set<string>();

    const mealRows: Row[] = meals.map((meal) => {
      const linkedGlucose = glucose
        .filter((g) => g.mealEntryId === meal.id)
        .sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime());
      const linkedInsulin = insulin
        .filter((d) => d.mealEntryId === meal.id)
        .sort((a, b) => new Date(a.givenAt).getTime() - new Date(b.givenAt).getTime());

      // В строку берём первый замер и первую дозу; повторные покажем отдельно.
      const g = linkedGlucose[0];
      const d = linkedInsulin[0];
      if (g) usedGlucose.add(g.id);
      if (d) usedInsulin.add(d.id);

      return {
        key: `m-${meal.id}`,
        time: new Date(meal.eatenAt),
        meal,
        glucose: g,
        insulin: d,
      };
    });

    const standaloneGlucose: Row[] = glucose
      .filter((g) => !usedGlucose.has(g.id) && !(g.mealEntryId && mealIds.has(g.mealEntryId)))
      .map((g) => ({ key: `g-${g.id}`, time: new Date(g.measuredAt), glucose: g }));

    const standaloneInsulin: Row[] = insulin
      .filter((d) => !usedInsulin.has(d.id) && !(d.mealEntryId && mealIds.has(d.mealEntryId)))
      .map((d) => ({ key: `i-${d.id}`, time: new Date(d.givenAt), insulin: d }));

    return [...mealRows, ...standaloneGlucose, ...standaloneInsulin].sort(
      (a, b) => b.time.getTime() - a.time.getTime()
    );
  }, [glucose, insulin, meals]);

  // Full-text filter across everything visible in a row: foods, note, treatment,
  // insulin type, units, sugar value, date and time.
  const filteredRows = useMemo<Row[]>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const parts: string[] = [
        row.time.toLocaleDateString("ru-RU"),
        row.time.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      ];
      if (row.glucose) {
        parts.push(row.glucose.value.toFixed(1), String(row.glucose.value));
        if (row.glucose.treatment) parts.push("подкормка", row.glucose.treatment);
      }
      if (row.insulin) {
        parts.push(String(row.insulin.units), "ед", typeLabels[row.insulin.type]);
      }
      if (row.meal) {
        parts.push(row.meal.totalXe.toFixed(1), "хе");
        if (row.meal.note) parts.push(row.meal.note);
        for (const item of row.meal.items) parts.push(item.foodName);
      }
      return parts.join(" ").toLowerCase().includes(q);
    });
  }, [rows, search]);

  /** Общий обработчик для всех форматов выгрузки. */
  async function handleExport(format: ExportFormat) {
    const rowsToExport = buildExportRows();
    const { from, to } = pageWindow(page, days);
    const meta = {
      profileName: profile?.name,
      periodLabel: `${from.toLocaleDateString("ru-RU")} — ${to.toLocaleDateString("ru-RU")}`,
    };
    if (format === "excel") exportToExcel(rowsToExport);
    else if (format === "word") exportToWord(rowsToExport, meta);
    else if (format === "txt") exportToTxt(rowsToExport, meta);
    else if (format === "pdf") await exportToPdf(rowsToExport, meta);
  }

  function buildExportRows(): ExportRow[] {
    return filteredRows.map((row) => {
      const trend = row.glucose ? trends.get(row.glucose.id) ?? null : null;
      return {
        date: row.time.toLocaleDateString("ru-RU"),
        time: row.time.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
        sugar: row.glucose ? row.glucose.value.toFixed(1) : "",
        trend: trend ? `${trendView[trend].arrow} ${trendView[trend].label}` : "",
        insulin: row.insulin ? `${row.insulin.units} ед. (${typeLabels[row.insulin.type]})` : "",
        meal: row.meal
          ? `${row.meal.totalXe.toFixed(1)} ХЕ: ${row.meal.items.map((i) => `${i.foodName} (${i.grams} г)`).join(", ")}`
          : row.glucose?.treatment
            ? `Подкормка: ${row.glucose.treatment}`
            : "",
      };
    });
  }

  /** Что можно сделать со строкой — зависит от того, что в ней есть. */
  function buildRowActions(row: Row): RowAction[] {
    const actions: RowAction[] = [];
    if (row.meal) {
      actions.push({
        id: "meal",
        icon: "🍽️",
        label: "Изменить приём пищи",
        onSelect: () => setEditing({ kind: "meal", meal: row.meal! }),
      });
    }
    if (row.glucose) {
      actions.push({
        id: "glucose",
        icon: "🩸",
        label: "Изменить сахар",
        onSelect: () => setEditing({ kind: "glucose", reading: row.glucose! }),
      });
    }
    if (row.insulin) {
      actions.push({
        id: "insulin",
        icon: "💉",
        label: "Изменить дозу инсулина",
        onSelect: () => setEditing({ kind: "insulin", dose: row.insulin! }),
      });
    }
    actions.push({
      id: "delete",
      icon: "🗑️",
      label: "Удалить запись",
      danger: true,
      onSelect: () => deleteRow(row),
    });
    return actions;
  }

  async function deleteRow(row: Row) {
    if (row.meal) await api.delete(`/diary/meals/${row.meal.id}`);
    if (row.glucose) await api.delete(`/diary/glucose/${row.glucose.id}`);
    if (row.insulin) await api.delete(`/diary/insulin/${row.insulin.id}`);
    refresh();
  }

  if (!profile) return null;

  function glucoseColor(value: number): string {
    if (value < profile!.targetGlucoseMin) return "text-accent-600 dark:text-accent-400";
    if (value > profile!.targetGlucoseMax) return "text-amber-600 dark:text-amber-400";
    return "text-brand-700 dark:text-brand-300";
  }

  let lastDateKey = "";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Дневник</h1>
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            {ranges.map((r) => (
              <button
                key={r.days}
                onClick={() => {
                  setDays(r.days);
                  setPage(1);
                }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  days === r.days ? "bg-white shadow-soft dark:bg-slate-700" : "text-slate-500"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={() => setActiveModal("meal")}>
            🍽️ Приём пищи
          </button>
          <button className="btn-primary" onClick={() => setActiveModal("glucose")}>
            🩸 Глюкоза
          </button>
          <button className="btn-primary" onClick={() => setActiveModal("insulin")}>
            💉 Инсулин
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1 md:max-w-sm">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            className="input !pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск: продукт, подкормка, доза, сахар…"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title="Очистить поиск"
            >
              ✕
            </button>
          )}
        </div>
        <ExportMenu disabled={filteredRows.length === 0} onExport={handleExport} />
      </div>

      {search.trim() && !loading && (
        <p className="mb-2 text-xs text-slate-400">
          Найдено записей: {filteredRows.length}
        </p>
      )}

      <div className="card !p-0 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
              <th className="px-4 py-3 font-semibold">Дата</th>
              <th className="px-4 py-3 font-semibold">Время</th>
              <th className="px-4 py-3 font-semibold">Сахар</th>
              <th className="px-4 py-3 font-semibold">Тенденция</th>
              <th className="px-4 py-3 font-semibold">Инсулин</th>
              <th className="px-4 py-3 font-semibold">Приём пищи</th>
              <th className="px-2 py-3 text-right font-semibold">Действия</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  Загрузка…
                </td>
              </tr>
            )}
            {!loading && filteredRows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center">
                  {search.trim() ? (
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-3xl">🔍</span>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Ничего не найдено по запросу «{search.trim()}»
                      </p>
                      <button className="btn-ghost !py-1.5 text-xs" onClick={() => setSearch("")}>
                        Очистить поиск
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <span className="text-3xl">📔</span>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        За этот период записей пока нет
                      </p>
                      <button className="btn-primary" onClick={() => setActiveModal("meal")}>
                        🍽️ Добавить первую запись
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            )}
            {!loading &&
              filteredRows.map((row) => {
                const dateKey = row.time.toLocaleDateString("ru-RU", {
                  day: "2-digit",
                  month: "2-digit",
                });
                const showDate = dateKey !== lastDateKey;
                lastDateKey = dateKey;
                const trend = row.glucose ? trends.get(row.glucose.id) ?? null : null;
                return (
                  <tr
                    key={row.key}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">
                      {showDate ? dateKey : ""}
                    </td>
                    <td className="px-4 py-2.5 font-medium tabular-nums">
                      {row.time.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-2.5">
                      {row.glucose ? (
                        <span className={`text-base font-bold tabular-nums ${glucoseColor(row.glucose.value)}`}>
                          {row.glucose.value.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {trend ? (
                        <span className={`inline-flex items-center gap-1.5 font-medium ${trendView[trend].cls}`}>
                          <span className="text-lg leading-none">{trendView[trend].arrow}</span>
                          <span className="text-xs">{trendView[trend].label}</span>
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {row.insulin ? (
                        <span>
                          <span className="font-bold tabular-nums">{row.insulin.units}</span> ед.{" "}
                          <span className="text-xs text-slate-400">{typeLabels[row.insulin.type]}</span>
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">—</span>
                      )}
                    </td>
                    <td className="max-w-[260px] px-4 py-2.5">
                      {row.meal || row.glucose?.treatment ? (
                        <div className="flex flex-col gap-1">
                          {row.meal && (
                            <div>
                              <span className="badge-brand mr-1.5">{row.meal.totalXe.toFixed(1)} ХЕ</span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                {row.meal.items.map((i) => i.foodName).join(", ")}
                              </span>
                            </div>
                          )}
                          {row.glucose?.treatment && (
                            <span className="badge-danger w-fit" title="Подкормка при низком сахаре">
                              🍬 {row.glucose.treatment}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-right">
                      {/* Одна шестерёнка на строку: внутри — всё, что можно изменить */}
                      <RowActions actions={buildRowActions(row)} />
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex flex-col items-center gap-2">
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <button
              className="btn-ghost !px-2.5 !py-1.5 text-xs"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              title="Более новые записи"
            >
              ‹
            </button>
            {pageItems.map((item, idx) =>
              item === "..." ? (
                <span key={`dots-${idx}`} className="px-1 text-slate-400">
                  …
                </span>
              ) : (
                <button
                  key={item}
                  onClick={() => setPage(item)}
                  className={`min-w-[2.25rem] rounded-lg px-2.5 py-1.5 text-sm font-medium transition ${
                    page === item
                      ? "bg-brand-600 text-white shadow-soft"
                      : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {item}
                </button>
              )
            )}
            <button
              className="btn-ghost !px-2.5 !py-1.5 text-xs"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              title="Более старые записи"
            >
              ›
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Страница {page} из {totalPages}:{" "}
            {pageWindow(page, days).from.toLocaleDateString("ru-RU")} —{" "}
            {pageWindow(page, days).to.toLocaleDateString("ru-RU")}
          </p>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-400">
        Тенденцию можно указать самому при вводе сахара (стрелка с прибора). Если не указана, приложение
        рассчитывает её по скорости изменения между соседними замерами (если между ними не больше{" "}
        {MAX_TREND_GAP_HOURS} часов): ↑ быстрее +2 ммоль/л в час, ↗ от +0.6 до +2, → примерно ровно, ↘ от −0.6
        до −2, ↓ быстрее −2.
      </p>

      {editing?.kind === "meal" && (
        <Modal title="Изменить приём пищи" onClose={() => setEditing(null)}>
          <MealForm
            profile={profile}
            editing={editing.meal}
            onCreated={() => {
              setEditing(null);
              refresh();
            }}
          />
        </Modal>
      )}
      {editing?.kind === "glucose" && (
        <Modal title="Изменить замер сахара" onClose={() => setEditing(null)}>
          <GlucoseForm
            editing={editing.reading}
            onCreated={() => {
              setEditing(null);
              refresh();
            }}
          />
        </Modal>
      )}
      {editing?.kind === "insulin" && (
        <Modal title="Изменить дозу инсулина" onClose={() => setEditing(null)}>
          <InsulinDoseForm
            recentMeals={meals}
            editing={editing.dose}
            onCreated={() => {
              setEditing(null);
              refresh();
            }}
          />
        </Modal>
      )}

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
            recentMeals={meals}
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
