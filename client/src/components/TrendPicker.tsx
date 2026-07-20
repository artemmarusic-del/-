import { GlucoseTrend } from "../types";

/** Единый справочник стрелок — используется и в формах, и в таблице дневника. */
export const TREND_OPTIONS: { value: GlucoseTrend; arrow: string; label: string }[] = [
  { value: "UP", arrow: "↑", label: "вверх" },
  { value: "SLOW_UP", arrow: "↗", label: "медленно вверх" },
  { value: "FLAT", arrow: "→", label: "ровный" },
  { value: "SLOW_DOWN", arrow: "↘", label: "медленно вниз" },
  { value: "DOWN", arrow: "↓", label: "вниз" },
];

export const TREND_VIEW: Record<GlucoseTrend, { arrow: string; label: string; cls: string }> = {
  UP: { arrow: "↑", label: "вверх", cls: "text-accent-600 dark:text-accent-400" },
  SLOW_UP: { arrow: "↗", label: "медленно вверх", cls: "text-amber-600 dark:text-amber-400" },
  FLAT: { arrow: "→", label: "ровный", cls: "text-brand-600 dark:text-brand-400" },
  SLOW_DOWN: { arrow: "↘", label: "медленно вниз", cls: "text-amber-600 dark:text-amber-400" },
  DOWN: { arrow: "↓", label: "вниз", cls: "text-accent-600 dark:text-accent-400" },
};

export default function TrendPicker({
  value,
  onChange,
}: {
  value: GlucoseTrend | null;
  onChange: (t: GlucoseTrend | null) => void;
}) {
  return (
    <div>
      <label className="label">Тенденция (стрелка с прибора)</label>
      <div className="flex flex-wrap gap-1.5">
        {TREND_OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(active ? null : opt.value)}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                active
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-slate-200 text-slate-600 hover:border-brand-300 dark:border-slate-700 dark:text-slate-300"
              }`}
              title={opt.label}
            >
              <span className="text-base leading-none">{opt.arrow}</span>
              <span className="hidden sm:inline">{opt.label}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-xs text-slate-400">
        Не выбирать — приложение само рассчитает по соседним замерам. Нажмите на выбранную ещё раз,
        чтобы снять.
      </p>
    </div>
  );
}
