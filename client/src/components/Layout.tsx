import { NavLink, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

const navItems = [
  { to: "/", label: "Сегодня", icon: "🏠", end: true },
  { to: "/diary", label: "Дневник", icon: "📔" },
  { to: "/foods", label: "Продукты", icon: "🍎" },
  { to: "/stats", label: "Статистика", icon: "📊" },
  { to: "/settings", label: "Настройки", icon: "⚙️" },
];

export default function Layout() {
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50/60 to-slate-50 dark:from-slate-950 dark:to-slate-950">
      <div className="mx-auto flex max-w-6xl">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-100 bg-white/70 px-4 py-6 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 md:flex">
          <div className="mb-8 flex items-center gap-2 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
              ХЕ
            </div>
            <div>
              <div className="text-sm font-bold leading-tight text-slate-800 dark:text-slate-100">ХЕ.Дневник</div>
              <div className="text-xs text-slate-400">учёт диабета</div>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-brand-600 text-white shadow-soft"
                      : "text-slate-600 hover:bg-brand-50 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`
                }
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="mb-2 truncate px-2 text-xs text-slate-400">{user?.name}</div>
            <button onClick={() => logout()} className="btn-ghost w-full justify-start">
              Выйти
            </button>
          </div>
        </aside>

        <div className="flex min-h-screen w-full flex-col">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 md:hidden">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
                ХЕ
              </div>
              <span className="font-bold text-slate-800 dark:text-slate-100">ХЕ.Дневник</span>
            </div>
            <button onClick={() => logout()} className="btn-ghost px-2 py-1 text-xs">
              Выйти
            </button>
          </header>

          <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
            <Outlet />
          </main>

          <nav className="sticky bottom-0 z-10 flex justify-around border-t border-slate-100 bg-white/90 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 md:hidden">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 rounded-lg px-3 py-1 text-[11px] font-medium ${
                    isActive ? "text-brand-600" : "text-slate-400"
                  }`
                }
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
