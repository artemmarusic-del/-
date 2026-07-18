import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import AuthLayout from "../components/AuthLayout";
import { ApiError } from "../api/client";

export default function RegisterPage() {
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(name, email, password);
      navigate("/onboarding");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось зарегистрироваться");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Регистрация" subtitle="Создайте аккаунт, чтобы начать вести дневник">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="label">Имя</label>
          <input className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Как вас зовут" />
        </div>
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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Не менее 8 символов"
          />
        </div>
        {error && <p className="text-sm text-accent-600">{error}</p>}
        <button type="submit" className="btn-primary mt-2 w-full" disabled={loading}>
          {loading ? "Создаём аккаунт…" : "Зарегистрироваться"}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
        Уже есть аккаунт?{" "}
        <Link to="/login" className="font-semibold text-brand-600 hover:underline">
          Войти
        </Link>
      </p>
    </AuthLayout>
  );
}
