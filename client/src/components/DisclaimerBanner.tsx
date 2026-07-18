export default function DisclaimerBanner() {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
      <span className="text-base leading-none">⚠️</span>
      <p>
        Приложение помогает вести дневник и ориентировочно рассчитывать дозу, но не заменяет назначения врача.
        Любые изменения коэффициентов обсуждайте с эндокринологом, особенно при частых гипо- и гипергликемиях.
      </p>
    </div>
  );
}
