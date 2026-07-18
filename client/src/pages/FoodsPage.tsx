import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { FoodItem } from "../types";

const emptyForm = { name: "", category: "Другое", kcal100: "", protein100: "", fat100: "", carbs100: "" };

export default function FoodsPage() {
  const [query, setQuery] = useState("");
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  async function search(q: string) {
    setLoading(true);
    try {
      const results = await api.get<FoodItem[]>(`/foods${q ? `?query=${encodeURIComponent(q)}` : ""}`);
      setFoods(results);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => search(query), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post<FoodItem>("/foods", {
        name: form.name,
        category: form.category || "Другое",
        kcal100: Number(form.kcal100) || 0,
        protein100: Number(form.protein100) || 0,
        fat100: Number(form.fat100) || 0,
        carbs100: Number(form.carbs100) || 0,
      });
      setForm(emptyForm);
      setShowForm(false);
      search(query);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось добавить продукт");
    }
  }

  async function handleDelete(id: string) {
    await api.delete(`/foods/${id}`);
    search(query);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Продукты</h1>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Отменить" : "+ Свой продукт"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="card mb-6 flex flex-col gap-3">
          <input
            className="input"
            placeholder="Название продукта"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Категория"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          />
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="label">Ккал/100г</label>
              <input
                className="input"
                type="number"
                value={form.kcal100}
                onChange={(e) => setForm((f) => ({ ...f, kcal100: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Белки</label>
              <input
                className="input"
                type="number"
                value={form.protein100}
                onChange={(e) => setForm((f) => ({ ...f, protein100: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Жиры</label>
              <input
                className="input"
                type="number"
                value={form.fat100}
                onChange={(e) => setForm((f) => ({ ...f, fat100: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Углеводы</label>
              <input
                className="input"
                type="number"
                value={form.carbs100}
                onChange={(e) => setForm((f) => ({ ...f, carbs100: e.target.value }))}
              />
            </div>
          </div>
          {error && <p className="text-sm text-accent-600">{error}</p>}
          <button type="submit" className="btn-primary">
            Сохранить продукт
          </button>
        </form>
      )}

      <input
        className="input mb-4"
        placeholder="Поиск продукта…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading && <p className="text-sm text-slate-400">Загрузка…</p>}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {foods.map((food) => (
          <div key={food.id} className="card !p-4 flex items-start justify-between">
            <div>
              <div className="font-medium text-slate-800 dark:text-slate-100">{food.name}</div>
              <div className="text-xs text-slate-400">{food.category}</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {food.kcal100} ккал · Б {food.protein100} · Ж {food.fat100} · У {food.carbs100} (на 100 г)
              </div>
            </div>
            {food.isCustom && (
              <button onClick={() => handleDelete(food.id)} className="text-xs text-accent-500 hover:underline">
                Удалить
              </button>
            )}
          </div>
        ))}
        {!loading && foods.length === 0 && <p className="text-sm text-slate-400">Ничего не найдено</p>}
      </div>
    </div>
  );
}
