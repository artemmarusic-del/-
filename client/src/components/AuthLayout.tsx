import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import Logo from "./Logo";

export default function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-slate-50 to-accent-50 px-4 py-8 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Logo size={64} className="shadow-card rounded-2xl" />
          <div className="text-center">
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
          </div>
        </div>
        <div className="card">{children}</div>

        {/* Чтобы новый пользователь мог поставить приложение, не заходя в аккаунт */}
        {pathname !== "/downloads" && (
          <Link
            to="/downloads"
            className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-4 py-2.5 text-sm font-medium text-slate-600 backdrop-blur transition hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300"
          >
            📱 Установить приложение на телефон или компьютер
          </Link>
        )}
      </div>
    </div>
  );
}
