import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import AuthLayout from "../components/AuthLayout";
import { ApiError } from "../api/client";

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось войти");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Вход" subtitle="Рады видеть вас снова">
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
          />
        </div>
        <div>
          <label className="label">Пароль</label>
          <input
            className="input"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        {error && <p className="text-sm text-accent-600">{error}</p>}
        <button type="submit" className="btn-primary mt-2 w-full" disabled={loading}>
          {loading ? "Входим…" : "Войти"}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
        Нет аккаунта?{" "}
        <Link to="/register" className="font-semibold text-brand-600 hover:underline">
          Зарегистрироваться
        </Link>
      </p>
    </AuthLayout>
  );
}
