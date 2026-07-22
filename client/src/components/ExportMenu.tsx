import { useEffect, useRef, useState } from "react";

export type ExportFormat = "excel" | "word" | "pdf" | "txt";

const FORMATS: { id: ExportFormat; icon: string; title: string; hint: string }[] = [
  { id: "pdf", icon: "📕", title: "PDF", hint: "для печати и врача" },
  { id: "excel", icon: "📊", title: "Excel", hint: "таблица для расчётов" },
  { id: "word", icon: "📄", title: "Word", hint: "документ для правки" },
  { id: "txt", icon: "📝", title: "Текст", hint: "простой файл" },
];

/**
 * Кнопка «Сохранить как» с выпадающим списком форматов.
 * Раньше четыре кнопки лежали в строку и занимали много места —
 * теперь это одна кнопка, а форматы открываются подкладкой.
 */
export default function ExportMenu({
  onExport,
  disabled,
}: {
  onExport: (format: ExportFormat) => void | Promise<void>;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<ExportFormat | null>(null);
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

  async function handlePick(format: ExportFormat) {
    setBusy(format);
    try {
      await onExport(format);
      setOpen(false);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="btn-secondary"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        ⬇️ Сохранить как
        <span className="text-xs text-slate-400">▾</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1.5 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card dark:border-slate-700 dark:bg-slate-900"
        >
          {FORMATS.map((f) => (
            <button
              key={f.id}
              role="menuitem"
              type="button"
              disabled={busy !== null}
              onClick={() => handlePick(f.id)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-brand-50 disabled:opacity-60 dark:hover:bg-slate-800"
            >
              <span className="text-lg">{f.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">
                  {f.title}
                </span>
                <span className="block text-xs text-slate-400">{f.hint}</span>
              </span>
              {busy === f.id && <span className="text-xs text-brand-600">…</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
