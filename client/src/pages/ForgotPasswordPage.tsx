import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import AuthLayout from "../components/AuthLayout";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post<{ message: string }>("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось отправить письмо");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthLayout title="Проверьте почту">
        <div className="flex flex-col gap-4 text-sm text-slate-600 dark:text-slate-300">
          <p>
            Если аккаунт с адресом <strong>{email}</strong> существует, мы отправили на него письмо со
            ссылкой для сброса пароля. Ссылка действительна 1 час.
          </p>
          <p className="text-slate-400">
            Не приходит письмо? Проверьте папку «Спам». Можно запросить письмо ещё раз через минуту.
          </p>
          <Link to="/login" className="btn-primary w-full">
            Вернуться ко входу
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Восстановление пароля" subtitle="Введите email, указанный при регистрации">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoFocus
          />
        </div>
        {error && <p className="text-sm text-accent-600">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Отправляем…" : "Отправить ссылку для сброса"}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
        Вспомнили пароль?{" "}
        <Link to="/login" className="font-semibold text-brand-600 hover:underline">
          Войти
        </Link>
      </p>
    </AuthLayout>
  );
}
