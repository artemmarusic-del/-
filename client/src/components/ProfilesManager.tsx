import { FormEvent, useState } from "react";
import { api, ApiError } from "../api/client";
import { useAuthStore } from "../store/authStore";
import { DiabetesType, Profile } from "../types";

const diabetesLabels: Record<DiabetesType, string> = {
  TYPE_1: "1 тип",
  TYPE_2: "2 тип",
  GESTATIONAL: "Гестационный",
  OTHER: "Другое",
};

export default function ProfilesManager() {
  const { profiles, profile, loadProfiles, switchProfile } = useAuthStore();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [diabetesType, setDiabetesType] = useState<DiabetesType>("TYPE_1");
  const [unitsPerXe, setUnitsPerXe] = useState("1.3");
  const [correctionFactor, setCorrectionFactor] = useState("2.5");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Укажите имя профиля");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const upx = Number(unitsPerXe);
      const cf = Number(correctionFactor);
      const created = await api.post<Profile>("/profiles", {
        name: name.trim(),
        diabetesType,
        unitsPerXeMorning: upx,
        unitsPerXeDay: upx,
        unitsPerXeEvening: upx,
        unitsPerXeNight: upx,
        correctionFactorMorning: cf,
        correctionFactorDay: cf,
        correctionFactorEvening: cf,
        correctionFactorNight: cf,
      });
      await loadProfiles();
      switchProfile(created.id);
      setName("");
      setAdding(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось создать профиль");
    } finally {
      setBusy(false);
    }
  }

  async function handleRename(id: string) {
    if (!renameValue.trim()) return;
    setBusy(true);
    try {
      await api.put<Profile>(`/profiles/${id}`, { name: renameValue.trim() });
      await loadProfiles();
      setRenamingId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось переименовать");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(p: Profile) {
    const ok = window.confirm(
      `Удалить профиль «${p.name}»?\n\nВместе с ним будут безвозвратно удалены все его записи: приёмы пищи, замеры сахара и дозы инсулина.`
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await api.delete(`/profiles/${p.id}`);
      await loadProfiles();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось удалить профиль");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2 className="mb-1 text-sm font-semibold text-slate-600 dark:text-slate-300">Профили</h2>
      <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
        В одном аккаунте можно вести дневники нескольких человек — например, свой и ребёнка. У каждого
        профиля свои коэффициенты, дневник и статистика. Переключаться между ними можно в меню слева.
      </p>

      <div className="mb-3 flex flex-col gap-2">
        {profiles.map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800"
          >
            {renamingId === p.id ? (
              <>
                <input
                  className="input flex-1"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  autoFocus
                />
                <button className="btn-primary !px-3 !py-1.5 text-xs" disabled={busy} onClick={() => handleRename(p.id)}>
                  Сохранить
                </button>
                <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => setRenamingId(null)}>
                  Отмена
                </button>
              </>
            ) : (
              <>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
                  {p.name.charAt(0).toUpperCase()}
                </span>
                <span className="flex-1 text-sm font-medium">
                  {p.name}
                  {p.id === profile?.id && <span className="ml-2 badge-brand">активный</span>}
                  <span className="ml-2 text-xs text-slate-400">{diabetesLabels[p.diabetesType]}</span>
                </span>
                {p.id !== profile?.id && (
                  <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => switchProfile(p.id)}>
                    Переключиться
                  </button>
                )}
                <button
                  className="btn-ghost !px-2 !py-1.5 text-xs"
                  onClick={() => {
                    setRenamingId(p.id);
                    setRenameValue(p.name);
                  }}
                >
                  Переименовать
                </button>
                {profiles.length > 1 && (
                  <button
                    className="!px-2 !py-1.5 text-xs text-accent-500 hover:underline"
                    disabled={busy}
                    onClick={() => handleDelete(p)}
                  >
                    Удалить
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {error && <p className="mb-2 text-sm text-accent-600">{error}</p>}

      {adding ? (
        <form onSubmit={handleAdd} className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <div>
            <label className="label">Имя профиля</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="например: Ваня"
              autoFocus
            />
          </div>
          <div>
            <label className="label">Тип диабета</label>
            <select className="input" value={diabetesType} onChange={(e) => setDiabetesType(e.target.value as DiabetesType)}>
              {Object.entries(diabetesLabels).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Ед. инсулина на 1 ХЕ</label>
              <input className="input" type="number" step="0.1" value={unitsPerXe} onChange={(e) => setUnitsPerXe(e.target.value)} />
            </div>
            <div>
              <label className="label">Фактор коррекции</label>
              <input
                className="input"
                type="number"
                step="0.1"
                value={correctionFactor}
                onChange={(e) => setCorrectionFactor(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Остальные параметры (целевой сахар, вес и т.д.) можно уточнить ниже после переключения на новый профиль.
          </p>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? "Создаём…" : "Создать профиль"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setAdding(false)}>
              Отмена
            </button>
          </div>
        </form>
      ) : (
        <button className="btn-secondary" onClick={() => setAdding(true)}>
          + Добавить профиль
        </button>
      )}
    </div>
  );
}
