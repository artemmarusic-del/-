import { ReactNode } from "react";

export default function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-slate-50 to-accent-50 px-4 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-xl font-bold text-white shadow-card">
            ХЕ
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
          </div>
        </div>
        <div className="card">{children}</div>
      </div>
    </div>
  );
}
