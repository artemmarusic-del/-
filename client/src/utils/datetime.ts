/**
 * Работа со временем для полей <input type="datetime-local">.
 *
 * Важно: такие поля работают в МЕСТНОМ времени пользователя, а
 * `new Date().toISOString()` возвращает время по Гринвичу. Если подставить
 * результат toISOString() напрямую, запись уедет на величину часового пояса
 * (например, на 3 часа в Москве). Поэтому оба преобразования — только здесь.
 */

/** Текущее местное время в формате, который понимает datetime-local. */
export function nowLocalInput(): string {
  return toLocalInput(new Date());
}

/** ISO-строка или Date -> местное время в формате datetime-local. */
export function toLocalInput(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

/**
 * Границы суток в часовом поясе пользователя.
 * Сервер живёт по UTC, поэтому «сегодня» он должен получать явно —
 * иначе ночные записи попадают не в тот день.
 */
export function localDayRange(date: Date = new Date()): { from: string; to: string } {
  const from = new Date(date);
  from.setHours(0, 0, 0, 0);
  const to = new Date(date);
  to.setHours(23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}
