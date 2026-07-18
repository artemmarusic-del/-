import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import AuthLayout from "../components/AuthLayout";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <AuthLayout title="Ссылка недействительна">
        <div className="flex flex-col gap-4 text-sm text-slate-600 dark:text-slate-300">
          <p>Ссылка для сброса пароля неполная или устарела. Запросите новую.</p>
          <Link to="/forgot-password" className="btn-primary w-full">
            Запросить сброс пароля
          </Link>
        </div>
      </AuthLayout>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Пароли не совпадают");
      return;
    }
    setLoading(true);
    try {
      await api.post<{ message: string }>("/auth/reset-password", { token, password });
      setDone(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось изменить пароль");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <AuthLayout title="Пароль изменён">
        <div className="flex flex-col gap-4 text-sm text-slate-600 dark:text-slate-300">
          <p>Готово! Ваш пароль обновлён. Сейчас откроется страница входа…</p>
          <Link to="/login" className="btn-primary w-full">
            Войти сейчас
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Новый пароль" subtitle="Придумайте новый пароль для входа">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="label">Новый пароль</label>
          <input
            className="input"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Не менее 8 символов"
            autoFocus
          />
        </div>
        <div>
          <label className="label">Повторите пароль</label>
          <input
            className="input"
            type="password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Ещё раз тот же пароль"
          />
        </div>
        {error && <p className="text-sm text-accent-600">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Сохраняем…" : "Сохранить новый пароль"}
        </button>
      </form>
    </AuthLayout>
  );
}
