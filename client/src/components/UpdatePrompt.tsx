import { useEffect, useState } from "react";

/**
 * Следит за выходом новой версии приложения.
 *
 * Установленные приложения (Android/Windows) держат в памяти закешированную
 * версию, поэтому правки могли не доезжать до пользователя. Здесь мы:
 *  - раз в 5 минут (и при возврате на вкладку) спрашиваем сервер, нет ли обновления;
 *  - когда новая версия готова, показываем баннер с кнопкой «Обновить»;
 *  - если пользователь ушёл с вкладки и вернулся — обновляем автоматически,
 *    чтобы не мешать вводу данных в момент работы.
 */
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

export default function UpdatePrompt() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let registration: ServiceWorkerRegistration | undefined;
    let reloading = false;

    // Перезагружаем страницу, когда новый worker взял управление.
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    function trackInstalling(worker: ServiceWorker) {
      worker.addEventListener("statechange", () => {
        // "installed" при уже активном контроллере = готова новая версия.
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          setWaiting(worker);
        }
      });
    }

    navigator.serviceWorker.ready.then((reg) => {
      registration = reg;
      if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
      reg.addEventListener("updatefound", () => {
        if (reg.installing) trackInstalling(reg.installing);
      });
      reg.update().catch(() => {});
    });

    const interval = setInterval(() => registration?.update().catch(() => {}), CHECK_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      registration?.update().catch(() => {});
      // Вернулись во вкладку и обновление уже готово — применяем молча.
      if (registration?.waiting) registration.waiting.postMessage({ type: "SKIP_WAITING" });
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  if (!waiting) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-20 md:pb-4">
      <div className="flex w-full max-w-md items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-card dark:bg-slate-800">
        <span className="flex-1">Вышла новая версия приложения</span>
        <button
          onClick={() => waiting.postMessage({ type: "SKIP_WAITING" })}
          className="shrink-0 rounded-lg bg-brand-500 px-3 py-1.5 font-semibold hover:bg-brand-600"
        >
          Обновить
        </button>
      </div>
    </div>
  );
}
