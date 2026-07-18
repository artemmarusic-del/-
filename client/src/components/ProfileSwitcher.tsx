import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

/** Colored initial badge so profiles are easy to tell apart at a glance. */
function Initial({ name, active }: { name: string; active?: boolean }) {
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
        active ? "bg-white/20 text-white" : "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300"
      }`}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

export default function ProfileSwitcher({ compact }: { compact?: boolean }) {
  const { profiles, profile, switchProfile } = useAuthStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (!profile) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-left transition hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900 ${
          compact ? "" : "shadow-soft"
        }`}
        title="Переключить профиль"
      >
        <Initial name={profile.name} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
            {profile.name}
          </span>
          {!compact && <span className="block text-[11px] text-slate-400">профиль</span>}
        </span>
        <span className="text-slate-400">▾</span>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full min-w-[200px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card dark:border-slate-700 dark:bg-slate-900">
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                switchProfile(p.id);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition ${
                p.id === profile.id
                  ? "bg-brand-600 text-white"
                  : "text-slate-700 hover:bg-brand-50 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              <Initial name={p.name} active={p.id === profile.id} />
              <span className="flex-1 truncate">{p.name}</span>
              {p.id === profile.id && <span className="text-xs">✓</span>}
            </button>
          ))}
          <button
            onClick={() => {
              setOpen(false);
              navigate("/settings");
            }}
            className="w-full border-t border-slate-100 px-3 py-2.5 text-left text-sm font-medium text-brand-600 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            + Добавить профиль
          </button>
        </div>
      )}
    </div>
  );
}
