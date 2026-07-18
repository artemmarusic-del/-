import { ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";

// Файлы лежат в client/public/files/ — папка намеренно называется не так,
// как маршрут страницы /downloads, иначе статика перехватывает адрес.
// Ставим true, когда APK положен рядом с exe.
const APK_AVAILABLE = false;
const APK_URL = "/files/xe-dnevnik.apk";
const WINDOWS_URL = "/files/XE-Dnevnik-Windows.exe";

type Platform = "android" | "ios" | "windows" | "other";

function detectPlatform(): Platform {
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return "android";
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/windows/.test(ua)) return "windows";
  return "other";
}

/** Событие браузера, позволяющее показать свою кнопку «Установить». */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function DownloadsPage() {
  const [platform, setPlatform] = useState<Platform>("other");
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setInstallEvent(e as InstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  async function handleInstall() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setInstallEvent(null);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">
          ХЕ
        </div>
        <Link to="/" className="font-bold text-slate-800 hover:underline dark:text-slate-100">
          ХЕ.Дневник
        </Link>
      </div>

      <h1 className="mb-1 text-2xl font-bold text-slate-800 dark:text-slate-100">Установить приложение</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Приложение работает с общей облачной базой — данные и профили будут одинаковыми на всех
        устройствах, где вы войдёте под своим аккаунтом.
      </p>

      {installed && (
        <div className="mb-6 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:border-brand-900/50 dark:bg-brand-900/20 dark:text-brand-300">
          ✓ Приложение уже установлено на этом устройстве — вы открыли его как программу.
        </div>
      )}

      {installEvent && !installed && (
        <button onClick={handleInstall} className="btn-primary mb-6 w-full sm:w-auto">
          ⬇️ Установить на это устройство
        </button>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card
          icon="🤖"
          title="Android"
          highlight={platform === "android"}
        >
          <p className="mb-3">
            Откройте сайт в <strong>Chrome</strong> на телефоне, нажмите меню <strong>⋮</strong> →{" "}
            <strong>«Установить приложение»</strong> (или «Добавить на главный экран»).
          </p>
          <p className="mb-3 text-slate-400">
            Появится иконка на рабочем столе, приложение откроется без адресной строки — как обычное.
          </p>
          {APK_AVAILABLE ? (
            <a href={APK_URL} download className="btn-primary w-full">
              ⬇️ Скачать APK
            </a>
          ) : (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              Отдельный файл .apk готовится — пока используйте установку из Chrome, она даёт то же
              самое приложение.
            </p>
          )}
        </Card>

        <Card icon="🪟" title="Windows" highlight={platform === "windows"}>
          <p className="mb-3">
            Скачайте программу запуска — она откроет приложение в отдельном окне, как обычную
            программу.
          </p>
          <a href={WINDOWS_URL} download className="btn-primary mb-3 w-full">
            ⬇️ Скачать для Windows
          </a>
          <p className="text-xs text-slate-400">
            Windows может предупредить о неизвестном издателе — нажмите «Подробнее» →{" "}
            «Выполнить в любом случае». Либо установите приложение прямо из браузера: значок{" "}
            <strong>⊕</strong> в адресной строке Chrome или Edge.
          </p>
        </Card>

        <Card icon="🍎" title="iPhone / iPad" highlight={platform === "ios"}>
          <p>
            Откройте сайт в <strong>Safari</strong>, нажмите кнопку «Поделиться»{" "}
            <strong>⬆️</strong> → <strong>«На экран “Домой”»</strong>.
          </p>
        </Card>

        <Card icon="🌐" title="Любое устройство">
          <p>
            Приложение полностью работает и в браузере по адресу{" "}
            <span className="break-all font-medium text-brand-700 dark:text-brand-300">
              xe-dnevnik.onrender.com
            </span>{" "}
            — устанавливать необязательно.
          </p>
        </Card>
      </div>

      <p className="mt-6 text-xs text-slate-400">
        Приложению нужен интернет: все записи хранятся в облаке, чтобы синхронизироваться между
        вашими устройствами.
      </p>
    </div>
  );
}

function Card({
  icon,
  title,
  children,
  highlight,
}: {
  icon: string;
  title: string;
  children: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={`card ${highlight ? "ring-2 ring-brand-500/40" : ""}`}>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
        {highlight && <span className="badge-brand">ваше устройство</span>}
      </div>
      <div className="text-sm text-slate-600 dark:text-slate-300">{children}</div>
    </div>
  );
}
