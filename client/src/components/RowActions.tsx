import { useEffect, useRef, useState } from "react";

export interface RowAction {
  id: string;
  icon: string;
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

/**
 * Одна кнопка-шестерёнка на строку дневника.
 *
 * Раньше в строке было до четырёх иконок (еда, сахар, доза, удалить) — они
 * занимали место и путали. Теперь всё под одной кнопкой: нажал — выбрал,
 * что именно изменить.
 */
export default function RowActions({ actions }: { actions: RowAction[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  if (actions.length === 0) return null;

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Изменить или удалить запись"
        aria-label="Действия с записью"
        aria-haspopup="menu"
        aria-expanded={open}
        className={`rounded-lg p-1.5 text-lg leading-none transition ${
          open
            ? "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
            : "text-slate-400 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"
        }`}
      >
        ⚙️
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-card dark:border-slate-700 dark:bg-slate-900"
        >
          {actions.map((a) => (
            <button
              key={a.id}
              role="menuitem"
              type="button"
              onClick={() => {
                setOpen(false);
                a.onSelect();
              }}
              className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-sm transition ${
                a.danger
                  ? "text-accent-600 hover:bg-accent-50 dark:hover:bg-accent-900/20"
                  : "text-slate-700 hover:bg-brand-50 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              <span className="text-base">{a.icon}</span>
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
