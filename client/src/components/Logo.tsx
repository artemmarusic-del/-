/**
 * Логотип «ХЕ.Дневник»: капля крови над раскрытой книгой.
 * Книга — дневник самоконтроля, капля — измерение сахара.
 */
export default function Logo({
  size = 40,
  rounded = true,
  className = "",
}: {
  size?: number;
  /** Со скруглённой подложкой (иконка) или только рисунок. */
  rounded?: boolean;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="ХЕ.Дневник"
    >
      {rounded && <rect width="512" height="512" rx="115" fill="#1A7A5B" />}

      {/* Капля крови: остриё вверху + окружность внизу по касательным */}
      <path d="M256 108 L309.1 196 A62 62 0 1 1 202.9 196 Z" fill="#E23A3A" />
      <ellipse cx="237" cy="228" rx="13" ry="18" fill="#FFFFFF" opacity="0.35" />

      {/* Раскрытая книга: две страницы, сходящиеся к корешку */}
      <path d="M256 322 L150 296 L102 300 L102 398 L150 394 L256 422 Z" fill="#FFFFFF" />
      <path d="M256 322 L362 296 L410 300 L410 398 L362 394 L256 422 Z" fill="#FFFFFF" />

      {/* Строки на страницах */}
      <g stroke="#1A7A5B" strokeWidth="11" strokeLinecap="round" opacity="0.55">
        <path d="M140 340 L214 348" />
        <path d="M140 372 L214 380" />
        <path d="M298 348 L372 340" />
        <path d="M298 380 L372 372" />
      </g>
    </svg>
  );
}
