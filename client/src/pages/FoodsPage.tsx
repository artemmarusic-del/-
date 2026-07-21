import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { lookupBarcode } from "../api/barcode";
import BarcodeScanner from "../components/BarcodeScanner";
import Modal from "../components/Modal";
import { BarcodeLookup, FoodItem } from "../types";

const emptyForm = { name: "", category: "Другое", kcal100: "", protein100: "", fat100: "", carbs100: "" };

export default function FoodsPage() {
  const [query, setQuery] = useState("");
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [fromBarcode, setFromBarcode] = useState<BarcodeLookup | null>(null);
  /** Последний код — чтобы можно было повторить поиск одной кнопкой. */
  const [lastCode, setLastCode] = useState<string | null>(null);

  /** Нашли продукт по коду — подставляем в форму, чтобы пользователь проверил. */
  async function handleBarcode(code: string) {
    setScanning(false);
    setLastCode(code);
    setError(null);
    try {
      const found = await lookupBarcode(code, { onProgress: setScanStatus });
      setForm({
        name: found.name,
        category: "По штрихкоду",
        kcal100: String(found.kcal100),
        protein100: String(found.protein100),
        fat100: String(found.fat100),
        carbs100: String(found.carbs100),
      });
      setFromBarcode(found);
      setShowForm(true);
      setScanStatus(null);
      setLastCode(null);
    } catch (err) {
      setScanStatus(null);
      setError(err instanceof Error ? err.message : "Не удалось найти продукт по штрихкоду");
    }
  }

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
      setFromBarcode(null);
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
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Продукты</h1>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => setScanning(true)}>
            📷 Сканировать штрихкод
          </button>
          <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Отменить" : "+ Свой продукт"}
          </button>
        </div>
      </div>

      <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
        Здесь общий справочник и <strong>ваши личные продукты</strong> — добавленные вами видны
        только вам.
      </p>

      {scanStatus && (
        <p className="mb-3 flex items-center gap-2 text-sm text-brand-600">
          <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-brand-500" />
          {scanStatus}
        </p>
      )}

      {/* Ошибка поиска по штрихкоду — с кнопкой повторить */}
      {error && !showForm && (
        <div className="mb-4 rounded-xl border border-accent-200 bg-accent-50 p-3 text-sm dark:border-accent-900/50 dark:bg-accent-900/20">
          <p className="text-accent-700 dark:text-accent-300">{error}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {lastCode && (
              <button
                className="btn-primary !px-3 !py-1.5 text-xs"
                onClick={() => handleBarcode(lastCode)}
              >
                🔄 Повторить
              </button>
            )}
            <button
              className="btn-secondary !px-3 !py-1.5 text-xs"
              onClick={() => {
                setError(null);
                setShowForm(true);
              }}
            >
              Ввести вручную
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="card mb-6 flex flex-col gap-3">
          {fromBarcode && (
            <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-xs dark:border-brand-900/50 dark:bg-brand-900/20">
              <p className="font-medium text-brand-800 dark:text-brand-300">
                Найдено по штрихкоду {fromBarcode.barcode}
                {fromBarcode.quantity ? ` · ${fromBarcode.quantity}` : ""}
              </p>
              <p className="mt-1 text-slate-600 dark:text-slate-300">
                Источник — открытая база {fromBarcode.source}, данные вносят пользователи.
                <strong> Обязательно сверьте БЖУ с этикеткой</strong> перед сохранением: от углеводов
                зависит расчёт дозы инсулина.
              </p>
            </div>
          )}
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

      {scanning && (
        <Modal title="Сканировать штрихкод" onClose={() => setScanning(false)}>
          <BarcodeScanner onDetected={handleBarcode} onClose={() => setScanning(false)} />
        </Modal>
      )}
    </div>
  );
}
